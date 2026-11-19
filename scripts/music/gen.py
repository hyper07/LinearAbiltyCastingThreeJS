"""
Generate instrumental music with ACE-Step 1.5 (MIT) on this Mac.

Run by scripts/music-gen.mjs and scripts/music-soundtrack.mjs with the venv in
library/tools/ace-step/.venv; not meant to be called by hand. Reads one JSON
job list on argv[1]:

  {"model": "acestep-v15-xl-sft", "lm": "acestep-5Hz-lm-1.7B" | null,
   "jobs": [{"prompt": "...", "seconds": 150, "bpm": 120, "key": "D minor",
             "timesig": "4", "seeds": [1, 2], "out": "/abs/path/name.wav",
             "steps": 50, "cfg": 7.0}]}

Each seed is written as <out stem>-s<seed>.wav (float WAV, 48 kHz stereo), and
a line "@@{json}" per take goes to stdout so the caller can follow along.
The model is loaded once for the whole list. Weights are read from
<tool>/checkpoints only (HF_HUB_OFFLINE), never downloaded here.
"""
import json
import os
import sys
import time

TOOL = os.environ["ACESTEP_TOOL_DIR"]
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("ACESTEP_PROJECT_ROOT", TOOL)
os.environ.setdefault("ACESTEP_CHECKPOINTS_DIR", os.path.join(TOOL, "checkpoints"))
os.chdir(TOOL)

import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402
import torch  # noqa: E402

from acestep.handler import AceStepHandler  # noqa: E402
from acestep.inference import GenerationConfig, GenerationParams, generate_music  # noqa: E402
from acestep.llm_inference import LLMHandler  # noqa: E402


def emit(obj):
    print("@@" + json.dumps(obj), flush=True)


def main():
    spec = json.load(open(sys.argv[1]))
    model = spec.get("model", "acestep-v15-xl-sft")
    lm_name = spec.get("lm", "acestep-5Hz-lm-1.7B")
    device = "mps" if torch.backends.mps.is_available() else "cpu"

    t0 = time.time()
    dit = AceStepHandler()
    msg, ok = dit.initialize_service(project_root=TOOL, config_path=model, device=device)
    if not ok:
        raise SystemExit(f"DiT init failed: {msg}")
    llm = LLMHandler()
    if lm_name:
        msg, ok = llm.initialize(
            checkpoint_dir=os.path.join(TOOL, "checkpoints"),
            lm_model_path=lm_name,
            backend="mlx" if device == "mps" else "pt",
            device=device,
        )
        if not ok:
            raise SystemExit(f"LM init failed: {msg}")
    emit({"event": "loaded", "seconds": round(time.time() - t0, 1), "device": device, "model": model, "lm": lm_name})

    turbo = "turbo" in model
    for job in spec["jobs"]:
        stem = job["out"][:-4] if job["out"].endswith(".wav") else job["out"]
        os.makedirs(os.path.dirname(stem), exist_ok=True)
        for seed in job.get("seeds", [42]):
            started = time.time()
            params = GenerationParams(
                task_type="text2music",
                caption=job["prompt"],
                lyrics="[Instrumental]",
                instrumental=True,
                vocal_language="unknown",
                bpm=job.get("bpm"),
                keyscale=job.get("key", ""),
                timesignature=str(job.get("timesig", "")),
                duration=float(job["seconds"]),
                inference_steps=int(job.get("steps", 8 if turbo else 50)),
                guidance_scale=float(job.get("cfg", 1.0 if turbo else 7.0)),
                shift=float(job.get("shift", 3.0)),
                use_adg=bool(job.get("adg", False)),
                seed=int(seed),
                thinking=bool(lm_name),
                use_cot_metas=False,
                use_cot_caption=False,
                use_cot_language=False,
                lm_temperature=float(job.get("lm_temperature", 0.85)),
            )
            config = GenerationConfig(batch_size=1, use_random_seed=False, seeds=[int(seed)], audio_format="wav")
            result = generate_music(dit, llm, params, config, save_dir=None)
            if not result.success or not result.audios:
                emit({"event": "error", "seed": seed, "out": stem, "error": str(result.error)[:400]})
                continue
            audio = result.audios[0]
            wav = audio["tensor"].float().cpu().numpy().T  # (samples, channels)
            path = f"{stem}-s{seed}.wav"
            sf.write(path, wav.astype(np.float32), int(audio.get("sample_rate", 48000)), subtype="FLOAT")
            emit({
                "event": "take",
                "seed": seed,
                "path": path,
                "seconds": round(len(wav) / int(audio.get("sample_rate", 48000)), 2),
                "took": round(time.time() - started, 1),
                "peak": float(np.abs(wav).max()),
            })


if __name__ == "__main__":
    main()
