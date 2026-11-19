"""
One image -> one textured GLB with TRELLIS.2 on Apple silicon.

Run by server/modelgen-local.mjs with the venv that `npm run modelgen:setup`
builds in library/tools/trellis-mac (the trellis-mac port, MIT). Prints one
JSON object per line on stdout ({"event": "progress" | "done" | "error", ...});
everything else goes to stderr.

Differences from trellis-mac's own generate.py (which this follows, MIT):
  * Background removal uses BiRefNet (ZhengPeng7/BiRefNet, MIT) instead of
    RMBG-2.0 (CC BY-NC). Images that already have a transparent background
    skip it.
  * Progress is reported as JSON, and the mesh is simplified to --faces.
  * Weights come only from the local cache (HF_HUB_OFFLINE=1): setup downloads
    them, a generation never touches the network.

    python trellis_run.py --tool <trellis-mac dir> --image in.png --out out.glb
"""

import argparse
import json
import os
import sys
import threading
import time

BIREFNET = "ZhengPeng7/BiRefNet"  # MIT
DINOV3 = "facebook/dinov3-vitl16-pretrain-lvd1689m"  # DINOv3 License, gated on Hugging Face


def emit(event, **fields):
    sys.stdout.write(json.dumps({"event": event, **fields}) + "\n")
    sys.stdout.flush()


def parse(argv):
    p = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    p.add_argument("--tool", required=True, help="the trellis-mac folder")
    p.add_argument("--image", required=True)
    p.add_argument("--out", required=True, help="output .glb path")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--pipeline-type", default="512", choices=["512", "1024", "1024_cascade"])
    p.add_argument("--texture-size", type=int, default=1024, choices=[512, 1024, 2048])
    p.add_argument("--faces", type=int, default=100000, help="triangle budget of the saved mesh")
    p.add_argument("--steps", type=int, default=None, help="sampler steps for every phase (default 12)")
    p.add_argument("--keep-loaded", action="store_true", help="keep every model on the GPU (faster, more memory)")
    return p.parse_args(argv)


class Progress:
    """Maps the pipeline's phases onto 0..1 and reports them."""

    # (tqdm description prefix, start, end) — the sampler phases in run order.
    PHASES = [
        ("Sampling sparse structure", 0.12, 0.25),
        ("Sampling shape SLat", 0.25, 0.55),
        ("Sampling texture SLat", 0.55, 0.75),
    ]

    def __init__(self):
        self.value = 0.0

    def step(self, step, value):
        self.value = max(self.value, value)
        emit("progress", step=step, progress=round(self.value, 4))

    def wrap_tqdm(self, real_tqdm):
        progress = self

        def tqdm(iterable, desc="", **kwargs):
            items = list(iterable)
            span = next(((a, b) for name, a, b in Progress.PHASES if desc.startswith(name)), None)
            label = {"Sampling sparse structure": "Finding the shape", "Sampling shape SLat": "Sculpting the model", "Sampling texture SLat": "Painting the model"}.get(desc, desc)
            for i, item in enumerate(real_tqdm(items, desc=desc, file=sys.stderr, **kwargs)):
                if span and items:
                    progress.step(label, span[0] + (span[1] - span[0]) * i / len(items))
                yield item

        return tqdm


class PeakMemory:
    """Samples the Metal driver's allocation, the number that matters on MPS."""

    def __init__(self, torch):
        self.torch = torch
        self.peak = 0
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def _run(self):
        while not self._stop.is_set():
            try:
                self.peak = max(self.peak, int(self.torch.mps.driver_allocated_memory()))
            except Exception:
                pass
            self._stop.wait(0.25)

    def stop(self):
        self._stop.set()
        self._thread.join(timeout=1)
        return self.peak


def main(argv=None):
    args = parse(argv if argv is not None else sys.argv[1:])
    tool = os.path.abspath(args.tool)
    os.environ.setdefault("HF_HUB_CACHE", os.path.join(tool, "hf-cache"))
    os.environ.setdefault("HF_HUB_OFFLINE", "1")
    os.environ.setdefault("HF_MODULES_CACHE", os.path.join(tool, "hf-modules"))  # BiRefNet's model code
    os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
    snapshots = os.path.join(os.environ["HF_HUB_CACHE"], "models--" + DINOV3.replace("/", "--"), "snapshots")
    have_dinov3 = os.path.isdir(snapshots) and any(
        os.path.exists(os.path.join(snapshots, rev, "model.safetensors")) for rev in os.listdir(snapshots)
    )
    if os.environ["HF_HUB_OFFLINE"] == "1" and not have_dinov3:
        raise RuntimeError(
            f"DINOv3 is not downloaded yet: accept its licence at https://huggingface.co/{DINOV3}, then run npm run modelgen:setup"
        )
    started = time.time()
    progress = Progress()
    progress.step("Loading the generator", 0.01)

    # trellis-mac's generate.py sets the MPS backends and sys.path on import.
    sys.path.insert(0, tool)
    import generate  # noqa: F401  (side effects: env + paths)
    import torch
    from PIL import Image

    from trellis2.pipelines import rembg, samplers
    from trellis2.pipelines.samplers import flow_euler
    from trellis2.pipelines.trellis2_image_to_3d import Trellis2ImageTo3DPipeline

    class PermissiveBiRefNet(rembg.BiRefNet):
        """BiRefNet weights under MIT, whatever pipeline.json names."""

        def __init__(self, model_name=None, **kwargs):
            super().__init__(model_name=BIREFNET)
            self.model.float()  # its weights are fp16; the pipeline feeds fp32

    rembg.BiRefNet = PermissiveBiRefNet
    flow_euler.tqdm = progress.wrap_tqdm(flow_euler.tqdm)
    for name, step, value in (("decode_shape_slat", "Building the mesh", 0.76), ("decode_tex_slat", "Colouring the mesh", 0.78)):
        original = getattr(Trellis2ImageTo3DPipeline, name)

        def hooked(self, *a, _original=original, _step=step, _value=value, **k):
            progress.step(_step, _value)
            return _original(self, *a, **k)

        setattr(Trellis2ImageTo3DPipeline, name, hooked)

    memory = PeakMemory(torch)
    pipeline = Trellis2ImageTo3DPipeline.from_pretrained("microsoft/TRELLIS.2-4B")
    if args.keep_loaded:
        pipeline.low_vram = False
    pipeline.to(torch.device("mps"))
    loaded = time.time()
    progress.step("Reading the picture", 0.1)

    image = Image.open(args.image)
    image.load()
    overrides = {"steps": args.steps} if args.steps else {}
    try:
        outputs = pipeline.run(
            image,
            seed=args.seed,
            pipeline_type=args.pipeline_type,
            sparse_structure_sampler_params=overrides,
            shape_slat_sampler_params=overrides,
            tex_slat_sampler_params=overrides,
        )
    except (IndexError, AssertionError) as error:
        raise RuntimeError(
            "the decoder produced an empty mesh — usually the macOS GPU watchdog stopping a long Metal kernel; "
            "retry with fewer windows open or another seed"
        ) from error
    mesh = outputs[0] if isinstance(outputs, list) else outputs
    if mesh.vertices.shape[0] == 0 or mesh.faces.shape[0] == 0:
        raise RuntimeError("the decoder produced an empty mesh (GPU watchdog?) — retry")
    generated = time.time()
    progress.step("Baking the textures", 0.82)

    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    baker = bake(mesh, out, args, torch)
    finished = time.time()
    peak = memory.stop()
    try:
        import resource

        rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss  # bytes on macOS
    except Exception:
        rss = 0
    emit(
        "done",
        glb=out,
        baker=baker,
        seconds={"load": round(loaded - started, 1), "generate": round(generated - loaded, 1), "bake": round(finished - generated, 1), "total": round(finished - started, 1)},
        peakGpuBytes=peak,
        peakRssBytes=rss,
        rawTriangles=int(mesh.faces.shape[0]),
    )


def bake(mesh, out, args, torch):
    """PBR textures through the Metal baker when built, else trellis-mac's KDTree baker."""
    import fast_simplification

    verts = mesh.vertices.cpu().numpy()
    faces = mesh.faces.cpu().numpy()
    target = min(args.faces, len(faces))

    try:
        import o_voxel.postprocess as post

        metal = getattr(post, "_BACKEND", None) == "metal" and getattr(post, "_HAS_DR", False)
    except (ImportError, AttributeError):
        metal = False

    if metal:
        try:
            # Simplify first: the Metal BVH crashes on very large meshes.
            pre = min(max(target * 2, 200000), len(faces))
            if len(faces) > pre:
                v, f = fast_simplification.simplify(verts, faces, 1.0 - pre / len(faces))
                vt, ft = torch.from_numpy(v).float(), torch.from_numpy(f.astype("int32"))
            else:
                vt, ft = mesh.vertices.cpu(), mesh.faces.cpu()
            glb = post.to_glb(
                vertices=vt,
                faces=ft,
                attr_volume=mesh.attrs.cpu(),
                coords=mesh.coords.cpu(),
                attr_layout=mesh.layout,
                voxel_size=mesh.voxel_size,
                aabb=[[-0.5, -0.5, -0.5], [0.5, 0.5, 0.5]],
                decimation_target=target,
                texture_size=args.texture_size,
                verbose=False,
            )
            glb.export(out)
            return "metal"
        except RuntimeError as error:
            sys.stderr.write(f"Metal bake failed ({error}); using the KDTree baker\n")

    from backends.texture_baker import bake_texture, export_glb_with_texture, uv_unwrap

    if len(faces) > target:
        verts, faces = fast_simplification.simplify(verts, faces, 1.0 - target / len(faces))
    new_verts, new_faces, uvs, _ = uv_unwrap(verts, faces)
    base_color, metallic_roughness, _ = bake_texture(
        new_verts, new_faces, uvs,
        mesh.coords.cpu().float().numpy(), mesh.attrs.cpu().float().numpy(),
        mesh.origin.cpu().float().numpy(), mesh.voxel_size,
        texture_size=args.texture_size,
    )
    export_glb_with_texture(new_verts, new_faces, uvs, base_color, metallic_roughness, out)
    return "kdtree"


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # report, then fail
        import traceback

        traceback.print_exc(file=sys.stderr)
        emit("error", message=(str(error) or type(error).__name__)[:500])
        sys.exit(1)
