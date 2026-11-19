/**
 * Shader patches shared by Gloamreach's materials (three's standard
 * materials, extended through onBeforeCompile so they keep shadows, fog and
 * image-based light):
 *   wind      — sway by height and flex, gusts that travel, leaf flutter
 *   leaves    — light through the leaves when you look toward the sun
 *   rim       — a soft rim of the key light on characters, a warm wrap on skin
 * One `shared` set of uniforms (time, wind, the player's position for the
 * grass) drives all of them.
 */
import * as THREE from 'three';

export const shared = {
  uTime: { value: 0 },
  uWind: { value: new THREE.Vector4(0.8, 0.6, 1, 0) }, // dir.x, dir.z, strength, gust
  uPlayer: { value: new THREE.Vector3(0, -100, 0) },
  uRimColor: { value: new THREE.Color('#ffc890') },
  uGloam: { value: 0 }
};

const WIND_PARS = /* glsl */ `
uniform float uTime;
uniform vec4 uWind;
attribute vec2 aWind; // phase, flex
vec3 windWorld(vec3 base, float flex, float phase, float flutter) {
  vec2 d = normalize(uWind.xy);
  float t = uTime;
  // A slow sway, a travelling gust, a quick flutter.
  float gust = sin(dot(base.xz, d) * 0.045 - t * 1.3) * 0.5 + 0.5;
  gust = gust * gust * (0.6 + uWind.w);
  float sway = sin(t * 0.9 + phase) * 0.6 + sin(t * 1.7 + phase * 1.7) * 0.25;
  vec3 off = vec3(d.x, 0.0, d.y) * (sway * 0.35 + gust * 0.9) * flex * uWind.z;
  off.y -= length(off) * 0.25;
  off += vec3(sin(t * 7.3 + phase * 13.0), sin(t * 6.1 + phase * 7.0) * 0.6, cos(t * 8.1 + phase * 5.0)) * flutter * (0.5 + gust) * uWind.z;
  return off;
}
`;

/**
 * Patch a material (and optionally its depth material) with wind. `flutter`
 * is the leaf-card wobble in metres; geometry carries `aWind` (phase, flex).
 */
export function addWind(material, { flutter = 0 } = {}) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, r) => {
    prev?.call(material, shader, r);
    shader.uniforms.uTime = shared.uTime;
    shader.uniforms.uWind = shared.uWind;
    shader.vertexShader = WIND_PARS + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      {
        mat4 M4 = modelMatrix;
        #ifdef USE_INSTANCING
          M4 = modelMatrix * instanceMatrix;
        #endif
        mat3 M = mat3(M4);
        vec3 origin = (M4 * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float ph = aWind.x + origin.x * 0.13 + origin.z * 0.07;
        vec3 w = windWorld(origin, aWind.y, ph, ${flutter.toFixed(3)} * aWind.y);
        transformed += transpose(M) * w / max(dot(M[0], M[0]), 1e-4);
      }`
    );
  };
  const key = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () => `${key ? key() : ''}|wind${flutter}`;
  return material;
}

/** Leaves: light shining through when the viewer faces the light; a soft wrap on the shadowed side. */
export function addTranslucency(material, strength = 1, tint = new THREE.Color(1, 0.95, 0.7)) {
  const u = { uTrans: { value: strength }, uTransTint: { value: tint } };
  material.userData.trans = u;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, r) => {
    prev?.call(material, shader, r);
    Object.assign(shader.uniforms, u);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_physical_pars_fragment>',
      `#include <lights_physical_pars_fragment>
      uniform float uTrans;
      uniform vec3 uTransTint;
      void RE_Direct_Leaf( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
        RE_Direct_Physical( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
        float back = pow( saturate( dot( geometryViewDir, -directLight.direction ) ), 4.0 );
        float wrap = saturate( dot( -geometryNormal, directLight.direction ) * 0.6 + 0.2 );
        reflectedLight.directDiffuse += directLight.color * material.diffuseContribution * uTransTint * ( back * 2.2 + wrap * 0.55 ) * uTrans;
      }
      #undef RE_Direct
      #define RE_Direct RE_Direct_Leaf`
    );
  };
  const key = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () => `${key ? key() : ''}|trans`;
  return material;
}

/**
 * Characters: a rim of the key light round the silhouette, a little
 * subsurface warmth where the light grazes skin, and a gentle sheen.
 */
export function addRim(material, { skin = false, rim = 0.55 } = {}) {
  const u = { uRim: { value: rim }, uSkin: { value: skin ? 1 : 0 } };
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, r) => {
    prev?.call(material, shader, r);
    Object.assign(shader.uniforms, u, { uRimColor: shared.uRimColor });
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_physical_pars_fragment>',
      `#include <lights_physical_pars_fragment>
      uniform float uRim;
      uniform float uSkin;
      uniform vec3 uRimColor;
      void RE_Direct_Rim( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
        RE_Direct_Physical( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
        float ndl = dot( geometryNormal, directLight.direction );
        // Subsurface: light wraps past the terminator, reddened.
        float wrap = saturate( ( ndl + 0.45 ) / 1.45 ) - saturate( ndl );
        reflectedLight.directDiffuse += directLight.color * material.diffuseContribution * vec3( 1.0, 0.45, 0.3 ) * wrap * 0.6 * uSkin;
        // Rim: the silhouette catches the key light from behind.
        float fres = pow( 1.0 - saturate( dot( geometryNormal, geometryViewDir ) ), 3.0 );
        float behind = saturate( dot( geometryViewDir, -directLight.direction ) * 0.6 + 0.5 );
        reflectedLight.directSpecular += directLight.color * fres * behind * uRim * 0.5;
      }
      #undef RE_Direct
      #define RE_Direct RE_Direct_Rim`
    );
    // An ambient rim too, so silhouettes read in shade.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `{
        float fr = pow( 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) ), 4.0 );
        outgoingLight += uRimColor * fr * uRim * 0.12;
      }
      #include <opaque_fragment>`
    );
  };
  const key = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () => `${key ? key() : ''}|rim${skin ? 1 : 0}`;
  return material;
}

/**
 * Things that belong to the Gloamwood keep its colour even when seen from
 * the village: warm light falling on them is cooled toward violet until the
 * viewer is under the Gloamwood's own sky.
 */
export function addRegionTint(material, tint = new THREE.Color(0.62, 0.42, 1.1)) {
  const u = { uRegionTint: { value: tint } };
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, r) => {
    prev?.call(material, shader, r);
    Object.assign(shader.uniforms, u, { uGloam: shared.uGloam });
    shader.fragmentShader = 'uniform vec3 uRegionTint;\nuniform float uGloam;\n' + shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      'outgoingLight *= mix(uRegionTint, vec3(1.0), uGloam);\n#include <opaque_fragment>'
    );
  };
  const key = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () => `${key ? key() : ''}|region`;
  return material;
}

/** A depth material for shadows that moves with the same wind and cuts the same alpha. */
export function windDepthMaterial({ map = null, alphaTest = 0, flutter = 0 } = {}) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest });
  return addWind(m, { flutter });
}
