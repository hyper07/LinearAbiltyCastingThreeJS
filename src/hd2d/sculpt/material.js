/**
 * The skin of Lanternwood's sculpted figures: AI Arcademia's soft-vinyl look
 * (toon bands, a body colour applied in the shader, a thin bright edge, a
 * glossy highlight — src/arcademia/world/creatures/materials.js) made to sit
 * in Lanternwood's lit night: it takes the same per-figure uniforms as the
 * voxel figures (gfx.js figureUniforms — `self` light so a figure stays
 * readable in the dark, warmed by the fire nearby; the rim; the hit flash;
 * the glow pulse), and the scene's lights, shadows and fog.
 *
 * Colours come from the geometry's slots (sdf.js): `palette` is up to eight
 * colours (skin, hair, cloth … or body, belly, dark …), `glows` how much each
 * slot lights itself. Set them per figure with setPalette().
 *
 *   const u = figureUniforms();
 *   const m = sculptMaterial(u, { gloss: 0.4 });
 *   setPalette(m, ['#f6d4b4', '#7a3424', …]);
 */
import * as THREE from 'three';

let ramp = null;
/** Three soft bands (shadow, mid, lit), as AI Arcademia's creatures. */
export function toonRamp() {
  if (ramp) return ramp;
  ramp = new THREE.DataTexture(new Uint8Array([120, 120, 120, 255, 200, 200, 200, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.generateMipmaps = false;
  ramp.needsUpdate = true;
  return ramp;
}

/* Fine surface detail, in the figure's rest frame (so it stays put as the joints move): a weave on
 * cloth (or scales on a beast), grain on leather, wood and bark, strands in hair and fur, stitches
 * on seams. Each gives a height (bumped into the normal) and a small change of colour, and fades out
 * as it gets smaller than a pixel or two, so it never shimmers at the game's camera distance. */
const DETAIL_GLSL = `
float lwHash(vec3 p) { p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float lwNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(lwHash(i), lwHash(i + vec3(1.0, 0.0, 0.0)), f.x), mix(lwHash(i + vec3(0.0, 1.0, 0.0)), lwHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(lwHash(i + vec3(0.0, 0.0, 1.0)), lwHash(i + vec3(1.0, 0.0, 1.0)), f.x), mix(lwHash(i + vec3(0.0, 1.0, 1.0)), lwHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}
float lwFade(float px, float period) { return 1.0 - smoothstep(0.16, 0.42, px / period); }
vec3 lwPerturb(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
  vec3 sx = dFdx(surfPos); vec3 sy = dFdy(surfPos);
  vec3 r1 = cross(sy, surfNorm); vec3 r2 = cross(surfNorm, sx);
  float det = dot(sx, r1) * faceDir;
  vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
  return normalize(abs(det) * surfNorm - grad);
}`;

/**
 * `u`: the figure's uniforms (gfx.js figureUniforms), shared with its gear.
 * `gloss` 0–1 vinyl highlight; `fur` a softer, wider rim; `toon` false for
 * smooth Phong shading instead of bands. Surface detail: `scales` (a beast:
 * its weave channel draws scales), `fabScale` (bigger patterns on a big
 * monster: < 1), `hairC` (where hair and fur strands radiate from, in the
 * rest frame), `detail` (0 turns the patterns off), `rimK` (how strongly the
 * scene's rim light shows: less on dark, rough bodies), `selfK` (how much
 * of the figure's own light it takes: less for one that should read as solid
 * stone).
 */
export function sculptMaterial(u, { gloss = 0.35, fur = 0, toon = true, palette = null, glows = null, scales = false, fabScale = 1, hairC = [0, 1.17, -0.02], detail = 1, rimK = 1, selfK = 0.45 } = {}) {
  const m = toon
    ? new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() })
    : new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 30, specular: new THREE.Color(0.08, 0.08, 0.08) });
  const pal = Array.from({ length: 8 }, () => new THREE.Color(1, 1, 1));
  const glow = new Float32Array(8);
  // uSelfK: the vinyl's colours are brighter than the pixel ramps were, so they take less of the figure's self light.
  const own = {
    uPal: { value: pal }, uPalGlow: { value: glow }, uGloss: { value: gloss }, uFur: { value: fur }, uSelfK: { value: selfK },
    uFabK: { value: detail }, uScales: { value: scales ? 1 : 0 }, uFabScale: { value: fabScale }, uHairC: { value: new THREE.Vector3(...hairC) }, uRimK: { value: rimK }
  };
  m.userData.sculpt = own;
  if (palette) setPalette(m, palette, glows);
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u, own);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec4 aSlotA; attribute vec4 aSlotB; attribute vec2 aTone; attribute float aGlow; attribute vec4 aFab;
varying vec4 vSlotA; varying vec4 vSlotB; varying vec2 vTone; varying float vGlow; varying vec4 vFab; varying vec3 vRest;`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSlotA = aSlotA; vSlotB = aSlotB; vTone = aTone; vGlow = aGlow; vFab = aFab; vRest = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec3 uSelf; uniform vec3 uRim; uniform float uFlash; uniform vec3 uFlashColor; uniform float uGlowK; uniform vec3 uEnvHigh; uniform vec3 uEnvLow;
uniform vec3 uPal[8]; uniform float uPalGlow[8]; uniform float uGloss; uniform float uFur; uniform float uSelfK;
uniform float uFabK; uniform float uScales; uniform float uFabScale; uniform vec3 uHairC; uniform float uRimK;
varying vec4 vSlotA; varying vec4 vSlotB; varying vec2 vTone; varying float vGlow; varying vec4 vFab; varying vec3 vRest;
${DETAIL_GLSL}`)
      .replace('#include <color_fragment>', `
  float sW = dot(vSlotA, vec4(1.0)) + dot(vSlotB, vec4(1.0));
  vec3 sC = vSlotA.x * uPal[0] + vSlotA.y * uPal[1] + vSlotA.z * uPal[2] + vSlotA.w * uPal[3]
          + vSlotB.x * uPal[4] + vSlotB.y * uPal[5] + vSlotB.z * uPal[6] + vSlotB.w * uPal[7];
  float sG = vSlotA.x * uPalGlow[0] + vSlotA.y * uPalGlow[1] + vSlotA.z * uPalGlow[2] + vSlotA.w * uPalGlow[3]
           + vSlotB.x * uPalGlow[4] + vSlotB.y * uPalGlow[5] + vSlotB.z * uPalGlow[6] + vSlotB.w * uPalGlow[7];
  vec3 sBase = (sC + vColor.rgb * max(0.0, 1.0 - sW)) * vTone.x;
  float sLum = dot(sBase, vec3(0.299, 0.587, 0.114));
  diffuseColor.rgb *= max(mix(vec3(sLum), sBase, 1.12), 0.0);
  float sGlow = vGlow + sG;
  // Surface detail: a height (metres) for the bump, a shift of the colour.
  float lwH = 0.0, lwA = 0.0;
  if (uFabK > 0.0 && dot(vFab, vec4(1.0)) > 0.02) {
    vec3 rp = vRest * uFabScale;
    float px = length(fwidth(rp));
    // Each pattern only where it is still bigger than a pixel or two (far figures skip them all).
    if (vFab.x > 0.02) {
      if (uScales > 0.5) {
        // Scales: rounded plates with thin dark seams between (a tilted lattice, so no axis shows).
        float k = vFab.x * lwFade(px, 0.09);
        if (k > 0.0) {
          vec3 q = mat3(0.86, 0.3, -0.4, -0.2, 0.92, 0.33, 0.47, -0.24, 0.85) * rp * 34.0;
          float plate = pow(abs(sin(q.x) * sin(q.y + 0.5 * sin(q.x)) * sin(q.z)), 0.3);
          lwH += k * plate * 0.004; lwA += k * (plate - 0.75) * 0.5;
        }
      } else {
        // A plain weave (threads one way and the other), and soft creases bigger than the threads.
        float k = vFab.x * lwFade(px, 0.015);
        if (k > 0.0) {
          float w = sin((rp.x + rp.z) * 420.0) * sin(rp.y * 420.0);
          lwH += k * (0.5 + 0.5 * w) * 0.0012; lwA += k * w * 0.06;
        }
        float kf = vFab.x * lwFade(px, 0.08);
        if (kf > 0.0) {
          float fold = lwNoise(rp * vec3(9.0, 3.5, 9.0)) - 0.5;
          lwH += kf * fold * 0.004; lwA += kf * fold * 0.08;
        }
      }
    }
    if (vFab.y > 0.02) {
      // Grain: pebbled leather, stretched lengthwise for wood and bark.
      float k = vFab.y * lwFade(px, 0.02);
      if (k > 0.0) {
        float n = lwNoise(rp * 70.0) * 0.6 + lwNoise(rp * 170.0) * 0.4;
        float lines = lwNoise(vec3(rp.x * 90.0, rp.y * 8.0, rp.z * 90.0));
        lwH += k * (n * 0.0016 + lines * 0.001); lwA += k * ((n - 0.5) * 0.18 + (lines - 0.5) * 0.12);
      }
    }
    if (vFab.z > 0.02) {
      // Strands, radiating from the crown (fur: from the middle of the body) and wavering a little.
      float k = vFab.z * lwFade(px, 0.018);
      if (k > 0.0) {
        vec3 d = vRest - uHairC;
        float s = sin(atan(d.x, d.z) * 52.0 + lwNoise(rp * 11.0) * 6.0 + d.y * 9.0);
        lwH += k * (0.5 + 0.5 * s) * 0.0018; lwA += k * s * 0.07;
      }
    }
    if (vFab.w > 0.05) {
      // Stitches: short dashes along the seam (round the body for a hem, down it for a placket).
      float k = smoothstep(0.35, 0.75, vFab.w) * lwFade(px, 0.012);
      if (k > 0.0) {
        float f = fract((atan(vRest.x, vRest.z) * 0.26 + vRest.y) * 160.0 / 6.2831853);
        float dash = smoothstep(0.12, 0.24, f) * (1.0 - smoothstep(0.52, 0.64, f));
        lwH += k * dash * 0.0012; lwA += k * (dash * 0.22 - 0.1);
      }
    }
    lwH *= uFabK; lwA *= uFabK;
    diffuseColor.rgb *= 1.0 + clamp(lwA, -0.3, 0.2);
  }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  if (lwH != 0.0) normal = lwPerturb(-vViewPosition, normal, vec2(dFdx(lwH), dFdy(lwH)), faceDirection);`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * (uSelf * uSelfK + vec3(sGlow * uGlowK * 1.6));')
      .replace('#include <opaque_fragment>', `{
  vec3 vdir = normalize(vViewPosition);
  vec3 nrm = normal;
  float facing = clamp(abs(dot(nrm, vdir)), 0.0, 1.0);
  float rim = pow(1.0 - facing, 3.0);
  // The scene's rim (cool in the dark, warm by a fire), widened and softened for fur; a thin vinyl edge.
  outgoingLight += uRim * uRimK * mix(rim * 1.4, smoothstep(0.25, 0.85, rim) * 1.8, uFur);
  outgoingLight += vec3(1.0, 0.94, 0.86) * smoothstep(0.55, 0.9, rim) * 0.05 * uRimK * (0.4 + diffuseColor.rgb);
  // Metal: a soft reflection of the sky and ground, and bright edges where the bevels turn.
  float metal = smoothstep(0.45, 0.85, vTone.y);
  if (metal > 0.0) {
    vec3 upV = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
    float upness = dot(nrm, upV) * 0.5 + 0.5;
    outgoingLight += mix(uEnvLow, uEnvHigh, smoothstep(0.25, 0.85, upness)) * diffuseColor.rgb * metal * 0.35;
    float curv = length(fwidth(nrm)) / max(length(fwidth(vViewPosition)), 1e-4);
    outgoingLight += (uEnvHigh * 0.5 + vec3(0.12)) * smoothstep(14.0, 55.0, curv) * metal * 0.45 * (0.35 + facing);
  }
  #if NUM_DIR_LIGHTS > 0
    vec3 hv = normalize(directionalLights[0].direction + vdir);
    float sp = pow(max(dot(nrm, hv), 0.0), 64.0);
    outgoingLight += (directionalLights[0].color * 0.5 + vec3(0.12)) * smoothstep(0.42, 0.62, sp) * (uGloss + vTone.y) * 0.6;
  #endif
  // Keep a lit figure under the bloom threshold (only its glowing bits should bloom).
  outgoingLight = min(outgoingLight, vec3(0.92 + sGlow * 2.0));
  outgoingLight = mix(outgoingLight, uFlashColor, clamp(uFlash, 0.0, 1.0));
}
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => `lw-sculpt2|${toon ? 1 : 0}`;
  return m;
}

/** Set a sculpted material's slot colours ('#hex' or Color) and how much each slot glows. */
export function setPalette(m, palette, glows = null) {
  const own = m.userData.sculpt;
  palette.forEach((c, i) => {
    if (i < 8 && c != null) own.uPal.value[i].set(c);
  });
  own.uPalGlow.value.fill(0);
  if (glows) glows.forEach((g, i) => i < 8 && (own.uPalGlow.value[i] = g ?? 0));
}

const outlines = new Map();
/**
 * AI Arcademia's outline: the mesh again, pushed out along its normals, back
 * faces only, in a dark ink of the figure's colour. Works skinned (it shares
 * the figure's skeleton) and takes the scene's fog.
 */
export function outlineMaterial(color = '#2a1a16', width = 0.014) {
  const key = `${color}|${width}`;
  if (outlines.has(key)) return outlines.get(key);
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uOutline = { value: width };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uOutline;')
      .replace('#include <begin_vertex>', 'vec3 transformed = vec3( position ) + normalize( normal ) * uOutline;');
  };
  m.customProgramCacheKey = () => `lw-outline-${width}`;
  outlines.set(key, m);
  return m;
}

/** A darker, warmer ink of a colour, for its outline. */
export function inkFor(color) {
  const c = new THREE.Color(color);
  const hsl = {};
  c.getHSL(hsl);
  return new THREE.Color().setHSL(hsl.h, Math.min(0.6, hsl.s * 0.8 + 0.1), 0.11).getStyle();
}
