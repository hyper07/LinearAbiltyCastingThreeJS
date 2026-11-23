/**
 * Snowpuff's frame, on WebGPURenderer (three/webgpu; it drops to its own
 * WebGL2 backend by itself where WebGPU is missing). One scene pass writes
 * colour, view normals, velocity and emissive at once (MRT); then:
 *
 *   GTAO (depth + normals)  → contact darkness under riders, props, fences
 *   bloom (emissive only)   → lanterns, aurora, stars, sparkles glow; snow and faces don't
 *   TRAA / SMAA / FXAA      → by quality tier
 *   speed blur              → a soft radial streak at the screen edge, only near top speed
 *   tone map (Neutral) → grade → vignette, in display space
 *
 * Quality tiers follow knowledge/render-quality.md §5; the game picks one
 * from a frame-time probe (SnowpuffGame.probeTier) and can step down live.
 */
import * as THREE from 'three/webgpu';
import { pass, mrt, output, emissive, normalView, velocity, vec2, vec3, vec4, float, uniform, packNormalToRGB, unpackRGBToNormal, sample, screenUV, mix, renderOutput, convertToTexture, luminance, smoothstep, Fn, Loop, int, max } from 'three/tsl';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { traa } from 'three/addons/tsl/display/TRAANode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { smaa } from 'three/addons/tsl/display/SMAANode.js';
import { fxaa } from 'three/addons/tsl/display/FXAANode.js';

export const TIERS = {
  high: { name: 'high', dpr: 2, ao: 1, aoScale: 0.5, aa: 'traa', bloom: 1, shadow: 2048, fur: 12, rivalFur: 6, particles: 1, trails: 1 },
  medium: { name: 'medium', dpr: 1.5, ao: 1, aoScale: 0.5, aa: 'smaa', bloom: 1, shadow: 1024, fur: 8, rivalFur: 0, particles: 0.7, trails: 1 },
  low: { name: 'low', dpr: 1, ao: 0, aoScale: 0.5, aa: 'fxaa', bloom: 0.6, shadow: 1024, fur: 0, rivalFur: 0, particles: 0.45, trails: 0 }
};
export const TIER_ORDER = ['low', 'medium', 'high'];

/** The renderer, set up once for the whole game. */
export async function makeRenderer(canvasHost, { forceWebGL = false } = {}) {
  const renderer = new THREE.WebGPURenderer({ antialias: false, powerPreference: 'high-performance', forceWebGL });
  await renderer.init();
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'sp-view';
  canvasHost.prepend(renderer.domElement);
  return renderer;
}

export const backendName = (renderer) => (renderer.backend?.isWebGPUBackend ? 'WebGPU' : 'WebGL2');

/**
 * A post chain for one scene + camera.
 */
export class Pipeline {
  constructor(renderer, scene, camera, tier) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.tier = tier;
    this.u = {
      saturation: uniform(1.06),
      warm: uniform(new THREE.Vector3(1.03, 1, 0.97)),
      cool: uniform(new THREE.Vector3(0.96, 0.99, 1.05)),
      vignette: uniform(0.2),
      speed: uniform(0),
      flash: uniform(0),
      flashColor: uniform(new THREE.Color('#ffffff')),
      aoStrength: uniform(0.85),
      exposure: uniform(1)
    };
    this.build();
  }

  build() {
    const { renderer, scene, camera, tier, u } = this;
    this.pipeline?.dispose?.();
    const pipeline = new THREE.RenderPipeline(renderer);
    pipeline.outputColorTransform = false;

    const scenePass = pass(scene, camera);
    const mrtNode = mrt({
      output,
      normal: vec4(packNormalToRGB(normalView), 1),
      velocity: vec4(velocity.xy, 0, 1),
      emissive: vec4(emissive, output.a)
    });
    // Blend every target, so see-through things (snow puffs, bubbles) that write alpha 0 to the
    // normal and velocity targets leave what's behind them alone.
    for (const k of ['emissive', 'normal', 'velocity']) mrtNode.setBlendMode(k, new THREE.BlendMode(THREE.NormalBlending));
    scenePass.setMRT(mrtNode);
    scenePass.getTexture('normal').type = THREE.UnsignedByteType;
    scenePass.getTexture('emissive').type = THREE.HalfFloatType;
    const color = scenePass.getTextureNode('output');
    const depth = scenePass.getTextureNode('depth');
    const vel = scenePass.getTextureNode('velocity');
    const normal = sample((uv) => unpackRGBToNormal(scenePass.getTextureNode('normal').sample(uv)));

    let lit = color;
    this.aoPass = null;
    if (tier.ao) {
      const aoPass = ao(depth, normal, camera);
      aoPass.resolutionScale = tier.aoScale;
      aoPass.useTemporalFiltering = tier.aa === 'traa';
      aoPass.radius.value = 0.6;
      aoPass.distanceExponent.value = 1.4;
      aoPass.thickness.value = 1.2;
      aoPass.scale.value = 1.1;
      this.aoPass = aoPass;
      // AO only up close: far away depth is too coarse for it (and fog covers it anyway).
      const viewZ = scenePass.getViewZNode().negate();
      const near = float(1).sub(smoothstep(16, 36, viewZ));
      const occ = mix(float(1), aoPass.getTextureNode().sample(screenUV).r, u.aoStrength.mul(near));
      lit = vec4(color.rgb.mul(occ), color.a);
    }

    let aa;
    if (tier.aa === 'traa') {
      const t = traa(lit, depth, vel, camera);
      t.useSubpixelCorrection = false;
      aa = t.getTextureNode();
      this.traaPass = t;
    } else if (tier.aa === 'smaa') {
      aa = smaa(lit).getTextureNode();
    } else {
      aa = convertToTexture(lit);
    }

    // Glow from what is lit from inside only.
    const glow = bloom(scenePass.getTextureNode('emissive'), 0.9 * tier.bloom, 0.55, 0);
    this.bloomPass = glow;

    // A soft radial streak toward the edges, only near top speed.
    const blurred = Fn(() => {
      const uv0 = screenUV;
      const d = uv0.sub(0.5);
      const k = u.speed.mul(smoothstep(0.12, 0.62, d.length())).mul(0.06);
      const acc = vec4(0).toVar();
      Loop({ start: int(0), end: int(6), type: 'int', condition: '<' }, ({ i }) => {
        const f = float(i).div(5);
        acc.addAssign(aa.sample(uv0.sub(d.mul(k.mul(f)))));
      });
      return acc.div(6);
    })();
    const hdr = blurred.add(glow);

    // Tone map, then grade in display space.
    const graded = Fn(() => {
      const mapped = renderOutput(vec4(hdr.rgb.mul(u.exposure), 1));
      const c = mapped.rgb.toVar();
      const l = luminance(c);
      c.assign(mix(vec3(l), c, u.saturation));
      const t = smoothstep(0.15, 0.85, l);
      c.assign(c.mul(mix(u.cool, u.warm, t)));
      const dv = screenUV.sub(0.5).mul(vec2(1.0, 0.85)).length();
      c.assign(c.mul(float(1).sub(u.vignette.mul(smoothstep(0.32, 0.86, dv)))));
      c.assign(mix(c, vec3(u.flashColor), u.flash));
      return vec4(max(c, vec3(0)), 1);
    })();
    pipeline.outputNode = graded;
    this.pipeline = pipeline;
    this.scenePass = scenePass;
  }

  setTier(tier) {
    this.tier = tier;
    this.build();
  }

  /** Per-mountain colour grade (mountains.js `grade`). */
  setGrade(g) {
    if (!g) return;
    this.u.saturation.value = g.saturation ?? 1.06;
    this.u.warm.value.set(...(g.warm ?? [1.03, 1, 0.97]));
    this.u.cool.value.set(...(g.cool ?? [0.96, 0.99, 1.05]));
    this.u.vignette.value = g.vignette ?? 0.2;
    this.u.exposure.value = g.exposure ?? 1;
  }

  render() {
    this.pipeline.render();
  }

  dispose() {
    this.pipeline?.dispose?.();
  }
}
