/**
 * The creatures' look: soft toon bands, the body colour applied in the shader
 * (so one sculpted mesh serves every colour), a warm rim of light for fur, a
 * crisp highlight for glossy paint, and an inverted-hull outline.
 */
import * as THREE from 'three';

let ramp = null;
/** Three soft bands: shadow, mid, lit. */
export function creatureRamp() {
  if (ramp) return ramp;
  ramp = new THREE.DataTexture(new Uint8Array([118, 118, 118, 255, 196, 196, 196, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.generateMipmaps = false;
  ramp.needsUpdate = true;
  return ramp;
}

const bodyMats = new Map();
/**
 * The skin of a sculpted creature. `body` is the body colour; vertex colours
 * hold the fixed markings and the `tint` attribute says where the body colour
 * shows (and how light or dark).
 */
export function creatureMaterial(body, { fur = 0, gloss = 0.25, emissive = null } = {}) {
  const key = `${body}|${fur}|${gloss}|${emissive}`;
  if (bodyMats.has(key)) return bodyMats.get(key);
  const m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: creatureRamp() });
  if (emissive) {
    m.emissive = new THREE.Color(emissive);
    m.emissiveIntensity = 0.35;
  }
  const uniforms = { uBody: { value: new THREE.Color(body) }, uFur: { value: fur }, uGloss: { value: gloss } };
  m.userData.uniforms = uniforms;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 tint;\nvarying vec2 vTint;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = tint;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uBody;\nuniform float uFur;\nuniform float uGloss;\nvarying vec2 vTint;')
      .replace('#include <color_fragment>', '#ifdef USE_COLOR\n vec3 cBody = mix(vColor.rgb, uBody * vTint.y, vTint.x);\n float cLum = dot(cBody, vec3(0.299, 0.587, 0.114));\n diffuseColor.rgb *= max(mix(vec3(cLum), cBody, 1.18), 0.0);\n#endif')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        vec3 nV = normalize(vViewPosition);
        float ndv = clamp(dot(normal, nV), 0.0, 1.0);
        float rim = pow(1.0 - ndv, 3.0);
        // fur: a soft warm rim; vinyl: a thin bright edge
        gl_FragColor.rgb += mix(vec3(1.0, 0.95, 0.85) * smoothstep(0.4, 0.75, rim) * 0.14, vec3(1.0, 0.9, 0.78) * smoothstep(0.3, 0.8, rim) * 0.22, uFur) * (0.35 + 0.65 * diffuseColor.rgb);
        #if NUM_DIR_LIGHTS > 0
          vec3 L = directionalLights[0].direction;
          vec3 H = normalize(L + nV);
          float sp = pow(max(dot(normal, H), 0.0), 70.0);
          gl_FragColor.rgb += vec3(1.0) * smoothstep(0.45, 0.6, sp) * 0.55 * uGloss;
        #endif`);
  };
  m.customProgramCacheKey = () => 'arc-creature';
  bodyMats.set(key, m);
  return m;
}

const outlines = new Map();
/** The inverted hull: the mesh again, pushed out along its normals, back faces only. Works skinned or not. */
export function outlineMaterial(color = '#3b2218', width = 0.011) {
  const key = `${color}|${width}`;
  if (outlines.has(key)) return outlines.get(key);
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uOutline = { value: width };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uOutline;')
      .replace('#include <begin_vertex>', 'vec3 transformed = vec3( position ) + normalize( normal ) * uOutline;');
  };
  m.customProgramCacheKey = () => `arc-outline-${width}`;
  outlines.set(key, m);
  return m;
}

/** A darker, warmer version of a colour for its outline. */
export function inkFor(color) {
  const c = new THREE.Color(color);
  const hsl = {};
  c.getHSL(hsl);
  return new THREE.Color().setHSL(hsl.h, Math.min(0.6, hsl.s * 0.8 + 0.1), 0.13).getStyle();
}

const plain = new Map();
/** Toon material for props (hats, eyes' surroundings): flat colour, same ramp, a little gloss. */
export function propMaterial(color, { gloss = 0.3, emissive = null, ei = 0.6, opacity = 1, metal = 0 } = {}) {
  const key = `${color}|${gloss}|${emissive}|${ei}|${opacity}|${metal}`;
  if (plain.has(key)) return plain.get(key);
  const m = new THREE.MeshToonMaterial({ color, gradientMap: creatureRamp() });
  if (emissive) {
    m.emissive = new THREE.Color(emissive);
    m.emissiveIntensity = ei;
  } else if (metal) {
    m.emissive = new THREE.Color(color).multiplyScalar(0.25 * metal);
  }
  if (opacity < 1) {
    m.transparent = true;
    m.opacity = opacity;
    m.depthWrite = false;
  }
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uGloss = { value: gloss + metal * 0.6 };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uGloss;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        vec3 nV = normalize(vViewPosition);
        float rim = pow(1.0 - clamp(dot(normal, nV), 0.0, 1.0), 3.0);
        gl_FragColor.rgb += vec3(1.0, 0.93, 0.82) * smoothstep(0.3, 0.8, rim) * 0.25;
        #if NUM_DIR_LIGHTS > 0
          vec3 H = normalize(directionalLights[0].direction + nV);
          gl_FragColor.rgb += vec3(1.0) * smoothstep(0.45, 0.6, pow(max(dot(normal, H), 0.0), 60.0)) * 0.6 * uGloss;
        #endif`);
  };
  m.customProgramCacheKey = () => 'arc-prop';
  plain.set(key, m);
  return m;
}
