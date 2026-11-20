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

/**
 * `u`: the figure's uniforms (gfx.js figureUniforms), shared with its gear.
 * `gloss` 0–1 vinyl highlight; `fur` a softer, wider rim; `toon` false for
 * smooth Phong shading instead of bands.
 */
export function sculptMaterial(u, { gloss = 0.35, fur = 0, toon = true, palette = null, glows = null } = {}) {
  const m = toon
    ? new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() })
    : new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 30, specular: new THREE.Color(0.08, 0.08, 0.08) });
  const pal = Array.from({ length: 8 }, () => new THREE.Color(1, 1, 1));
  const glow = new Float32Array(8);
  // uSelfK: the vinyl's colours are brighter than the pixel ramps were, so they take less of the figure's self light.
  const own = { uPal: { value: pal }, uPalGlow: { value: glow }, uGloss: { value: gloss }, uFur: { value: fur }, uSelfK: { value: 0.45 } };
  m.userData.sculpt = own;
  if (palette) setPalette(m, palette, glows);
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u, own);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec4 aSlotA; attribute vec4 aSlotB; attribute vec2 aTone; attribute float aGlow;
varying vec4 vSlotA; varying vec4 vSlotB; varying vec2 vTone; varying float vGlow;`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSlotA = aSlotA; vSlotB = aSlotB; vTone = aTone; vGlow = aGlow;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec3 uSelf; uniform vec3 uRim; uniform float uFlash; uniform vec3 uFlashColor; uniform float uGlowK;
uniform vec3 uPal[8]; uniform float uPalGlow[8]; uniform float uGloss; uniform float uFur; uniform float uSelfK;
varying vec4 vSlotA; varying vec4 vSlotB; varying vec2 vTone; varying float vGlow;`)
      .replace('#include <color_fragment>', `
  float sW = dot(vSlotA, vec4(1.0)) + dot(vSlotB, vec4(1.0));
  vec3 sC = vSlotA.x * uPal[0] + vSlotA.y * uPal[1] + vSlotA.z * uPal[2] + vSlotA.w * uPal[3]
          + vSlotB.x * uPal[4] + vSlotB.y * uPal[5] + vSlotB.z * uPal[6] + vSlotB.w * uPal[7];
  float sG = vSlotA.x * uPalGlow[0] + vSlotA.y * uPalGlow[1] + vSlotA.z * uPalGlow[2] + vSlotA.w * uPalGlow[3]
           + vSlotB.x * uPalGlow[4] + vSlotB.y * uPalGlow[5] + vSlotB.z * uPalGlow[6] + vSlotB.w * uPalGlow[7];
  vec3 sBase = (sC + vColor.rgb * max(0.0, 1.0 - sW)) * vTone.x;
  float sLum = dot(sBase, vec3(0.299, 0.587, 0.114));
  diffuseColor.rgb *= max(mix(vec3(sLum), sBase, 1.12), 0.0);
  float sGlow = vGlow + sG;`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * (uSelf * uSelfK + vec3(sGlow * uGlowK * 1.6));')
      .replace('#include <opaque_fragment>', `{
  vec3 vdir = normalize(vViewPosition);
  vec3 nrm = normalize(normal);
  float facing = clamp(abs(dot(nrm, vdir)), 0.0, 1.0);
  float rim = pow(1.0 - facing, 3.0);
  // The scene's rim (cool in the dark, warm by a fire), widened and softened for fur; a thin vinyl edge.
  outgoingLight += uRim * mix(rim * 1.4, smoothstep(0.25, 0.85, rim) * 1.8, uFur);
  outgoingLight += vec3(1.0, 0.94, 0.86) * smoothstep(0.55, 0.9, rim) * 0.05 * (0.4 + diffuseColor.rgb);
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
  m.customProgramCacheKey = () => `lw-sculpt|${toon ? 1 : 0}`;
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
