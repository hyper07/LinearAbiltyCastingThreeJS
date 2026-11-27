import * as THREE from 'three';

/**
 * Plush for the WebGL2 renderer: the soft-toy material and shell fur of
 * Snowpuff Peaks' riders (src/snowpuff/render/plush.js, written in TSL for
 * WebGPU), rebuilt as MeshPhysicalMaterial + GLSL (onBeforeCompile) so the
 * Seoul race keeps its WebGLRenderer.
 *
 *   plushMaterial({ color })   sheen-lit fuzzy cloth: high roughness, the sheen a
 *                              lighter tint of the base, fibre noise in colour and
 *                              roughness, a fine weave on the pale panels, the
 *                              baked contact shadow (attribute `ao`), a soft
 *                              fresnel rim (`rimK`, dimmed at night by the race).
 *   furShells(mesh, { count, length })
 *                              one extra draw: the same skinned body drawn `count`
 *                              times (an InstancedBufferGeometry, gl_InstanceID is
 *                              the shell), each pushed out along the skinned normal
 *                              and combed down and back; strands cut by cell noise
 *                              on the rest position so they stay put as the body
 *                              moves; roots dark, tips light, a fuzzy fringe at the
 *                              silhouette. `setFurLod(shells, n)` draws fewer.
 *
 * Geometry comes from the Arcademia sculptor: `color` (fixed colours), `tint`
 * (x: how much is body colour, y: its brightness), `ao`, `furry`.
 */

const NOISE = /* glsl */ `
float plHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float plNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(plHash(i), plHash(i + vec3(1, 0, 0)), f.x), mix(plHash(i + vec3(0, 1, 0)), plHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(plHash(i + vec3(0, 0, 1)), plHash(i + vec3(1, 0, 1)), f.x), mix(plHash(i + vec3(0, 1, 1)), plHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}`;

/** The body colour per vertex, the rest position and the contact shadow, for the fragment shader. */
const VARYINGS = 'varying vec2 vTint;\nvarying float vAo;\nvarying vec3 vRest;\nvarying float vFurry;';
const ATTRS = 'attribute vec2 tint;\nattribute float ao;\nattribute float furry;';

export function plushMaterial({ color = '#ff6fb1', rim = 0.34, roughness = 0.9, rimColor = '#fff6ec' } = {}) {
  const m = new THREE.MeshPhysicalMaterial({ roughness, metalness: 0, vertexColors: true, sheen: 1, sheenRoughness: 0.55, sheenColor: '#ffffff' });
  const u = {
    uBody: { value: new THREE.Color(color) },
    uRimColor: { value: new THREE.Color(rimColor) },
    uRimK: { value: rim },
    uFlash: { value: 0 }
  };
  m.userData.u = u;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${ATTRS}\n${VARYINGS}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = tint; vAo = ao; vRest = position; vFurry = furry;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${VARYINGS}\nuniform vec3 uBody;\nuniform vec3 uRimColor;\nuniform float uRimK;\nuniform float uFlash;\n${NOISE}`)
      .replace('#include <color_fragment>', `
        vec3 plBase = mix(vColor.rgb, uBody * vTint.y, vTint.x);
        float plFib = plNoise(vRest * 55.0) * 0.5 + plNoise(vRest * 160.0) * 0.35;
        // a fine woven fabric on the pale panels (belly, muzzle: where the body colour doesn't show)
        float plWeave = sin((vRest.x + vRest.z) * 760.0) * sin(vRest.y * 760.0) * 0.5 + 0.5;
        float plPanel = 1.0 - smoothstep(0.3, 0.8, vTint.x);
        float plAo = mix(0.5, 1.0, vAo);
        diffuseColor.rgb = plBase * (1.0 + (plFib - 0.42) * 0.14) * (1.0 + plWeave * 0.06 * plPanel - 0.03) * plAo;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + plFib * 0.05, 0.0, 1.0);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          float ndv = abs(dot(normal, normalize(vViewPosition)));
          float up = clamp(normal.y * 0.35 + 0.75, 0.4, 1.1);
          totalEmissiveRadiance += uRimColor * pow(1.0 - ndv, 2.6) * uRimK * up * (diffuseColor.rgb + 0.45);
          totalEmissiveRadiance += diffuseColor.rgb * uFlash;
        }`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
        #ifdef USE_SHEEN
          material.sheenColor = diffuseColor.rgb * 0.6 + 0.32;
          material.sheenRoughness = 0.55;
        #endif`);
  };
  m.customProgramCacheKey = () => 'city-plush';
  return m;
}

/**
 * The shell pass for a skinned body mesh: a new SkinnedMesh on the same
 * skeleton whose geometry is drawn `count` times (one instanced draw).
 */
export function furShells(body, { color, count = 10, length = 0.045, density = 400 } = {}) {
  const src = body.geometry;
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = src.index;
  for (const [k, a] of Object.entries(src.attributes)) geo.setAttribute(k, a);
  geo.instanceCount = count;
  geo.boundingSphere = src.boundingSphere;
  const u = {
    uBody: { value: new THREE.Color(color) },
    uLen: { value: length },
    uCount: { value: count },
    uWind: { value: new THREE.Vector3() },
    uDensity: { value: density },
    uRimK: { value: 1 },
    uFlash: { value: 0 }
  };
  const m = new THREE.MeshPhysicalMaterial({ roughness: 0.95, metalness: 0, vertexColors: true, sheen: 1, sheenRoughness: 0.5, sheenColor: '#ffffff' });
  m.userData.u = u;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${ATTRS}\n${VARYINGS}\nvarying float vLayer;\nuniform float uLen;\nuniform float uCount;\nuniform vec3 uWind;`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = tint; vAo = ao; vRest = position; vFurry = furry;')
      .replace('#include <skinning_vertex>', `#include <skinning_vertex>
        {
          float layer = (float(gl_InstanceID) + 1.0) / uCount;
          vLayer = layer;
          float mask = clamp(furry, 0.0, 1.0);
          vec3 nrm = normalize(objectNormal);
          // out along the normal, then combed down and back along the surface, the wind on top
          vec3 comb = vec3(0.0, -1.0, -0.45);
          vec3 along = normalize(comb - nrm * dot(comb, nrm) + vec3(0.0, 0.0, 0.0001));
          float h = layer * uLen * mask;
          transformed += nrm * h + along * h * layer * 0.55 + uWind * layer * layer * mask;
        }`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${VARYINGS}\nvarying float vLayer;\nuniform vec3 uBody;\nuniform float uDensity;\nuniform float uRimK;\nuniform float uFlash;\n${NOISE}`)
      .replace('#include <color_fragment>', `
        vec3 plBase = mix(vColor.rgb, uBody * vTint.y, vTint.x);
        vec3 plCell = floor(vRest * uDensity);
        float strand = plHash(plCell + 0.37);
        float gather = plNoise(vRest * uDensity * 0.11) * vLayer * 0.55;
        float clump = plNoise(vRest * 24.0) * 0.18;
        float ndvF = abs(dot(normalize(vNormal), normalize(vViewPosition)));
        float edge = smoothstep(0.35, 0.05, ndvF) * 0.18;
        float keep = strand + clump * 0.5 - vLayer * vLayer - gather + edge;
        if (keep < 0.04 || vFurry < 0.08 || vLayer > vFurry * 1.15 + 0.05) discard;
        float plAo = mix(0.45, 1.0, vAo);
        float lum = dot(plBase, vec3(0.2126, 0.7152, 0.0722));
        vec3 tip = mix(plBase, plBase + lum * 0.25, vLayer * vLayer);
        diffuseColor.rgb = tip * mix(0.62 * plAo, 1.12, vLayer) * (1.0 + clump);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += (plBase + 0.5) * pow(1.0 - ndvF, 3.0) * vLayer * 0.28 * uRimK;
        totalEmissiveRadiance += diffuseColor.rgb * uFlash;`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
        #ifdef USE_SHEEN
          material.sheenColor = (plBase * 0.5 + 0.42) * mix(0.5, 1.5, vLayer);
          material.sheenRoughness = 0.5;
        #endif`);
  };
  m.customProgramCacheKey = () => 'city-fur';
  const shells = new THREE.SkinnedMesh(geo, m);
  shells.bind(body.skeleton, body.bindMatrix);
  shells.castShadow = false;
  shells.receiveShadow = true;
  shells.frustumCulled = false;
  shells.userData = { u, count };
  return shells;
}

/** Draw only `n` of a fur pass's shells (0 hides it): the same fur length, fewer layers. */
export function setFurLod(shells, n) {
  const max = shells.userData.count;
  n = Math.max(0, Math.min(max, Math.round(n)));
  shells.visible = n > 0;
  if (!n || shells.geometry.instanceCount === n) return;
  shells.geometry.instanceCount = n;
  shells.userData.u.uCount.value = n;
}

/** Glossy toy plastic / vinyl: eyes, buttons, boots (clearcoat). */
export function vinylMaterial(color, { roughness = 0.32, clearcoat = 1, metalness = 0, emissive = null, ei = 0 } = {}) {
  const m = new THREE.MeshPhysicalMaterial({ color, roughness, metalness, clearcoat, clearcoatRoughness: 0.08 });
  if (emissive) {
    m.emissive = new THREE.Color(emissive);
    m.emissiveIntensity = ei;
  }
  return m;
}

/** Knitted wool (scarves, beanies): felt-rough, a little sheen, a rib pattern. */
export function knitMaterial(color) {
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: 1, metalness: 0, sheen: 0.7, sheenRoughness: 0.7, sheenColor: new THREE.Color(color).multiplyScalar(0.5).addScalar(0.25) });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vKnit;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvKnit = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vKnit;\n${NOISE}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= 0.96 + plNoise(vKnit * vec3(90.0, 30.0, 90.0)) * 0.12 + plNoise(vKnit * 260.0) * 0.06 - 0.09;');
  };
  m.customProgramCacheKey = () => 'city-knit';
  return m;
}
