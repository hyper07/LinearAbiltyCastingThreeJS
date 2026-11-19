/**
 * The painted light every surface in Kithvale shares, patched into three's
 * standard material (so shadows, fog and image light still work):
 *
 *  - a soft terminator: light wraps a little past the edge of a form, so a
 *    shape turns from lit to shade in one gentle stroke instead of a hard line;
 *  - a warm rim: edges facing away from the low sun catch a little of it,
 *    which is what makes figures and roofs stand out against the dusk;
 *  - a cool, violet lift in the shade (the shadows are coloured, never black).
 *
 * `painterly(material, { wrap, rim, shade })` returns the material.
 */
import * as THREE from 'three';

export const paintShared = {
  uShade: { value: new THREE.Color('#7f8cab') },
  uRimTint: { value: new THREE.Color('#ffc890') },
  uRimK: { value: 1 }
};

const PARS = /* glsl */ `
uniform vec3 uShade;
uniform vec3 uRimTint;
uniform float uRimK;
uniform float uWrap;
uniform float uRimAmt;
uniform float uShadeAmt;
uniform float uTrans;
void RE_Direct_Paint( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
  RE_Direct_Physical( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
  float ndl = dot( geometryNormal, directLight.direction );
  float soft = smoothstep( -uWrap, 1.0, ndl );
  float extra = max( soft * ( 1.0 - uWrap * 0.25 ) - saturate( ndl ), 0.0 );
  reflectedLight.directDiffuse += directLight.color * BRDF_Lambert( material.diffuseContribution ) * extra;
  float fres = pow( 1.0 - saturate( dot( geometryNormal, geometryViewDir ) ), 3.0 );
  float behind = saturate( dot( geometryViewDir, -directLight.direction ) * 0.6 + 0.4 );
  reflectedLight.directSpecular += directLight.color * uRimTint * fres * behind * uRimAmt * uRimK * 0.5;
  // Light through thin things (leaves, blades, petals, paper) when you look toward the sun.
  if ( uTrans > 0.0 ) {
    float back = pow( saturate( dot( geometryViewDir, -directLight.direction ) ), 4.0 );
    float through = saturate( dot( -geometryNormal, directLight.direction ) * 0.6 + 0.2 );
    reflectedLight.directDiffuse += directLight.color * material.diffuseContribution * vec3( 1.0, 0.88, 0.55 ) * ( back * 2.0 + through * 0.5 ) * uTrans;
  }
}
`;

/** Patch a standard material with the painted light. Keeps any earlier onBeforeCompile. */
export function painterly(material, { wrap = 0.5, rim = 0.35, shade = 0.12, trans = 0 } = {}) {
  const prev = material.onBeforeCompile;
  const u = { uWrap: { value: wrap }, uRimAmt: { value: rim }, uShadeAmt: { value: shade }, uTrans: { value: trans } };
  material.userData.paint = u;
  material.onBeforeCompile = (sh, r) => {
    prev?.call(material, sh, r);
    Object.assign(sh.uniforms, u, paintShared);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>\n${PARS}\n#undef RE_Direct\n#define RE_Direct RE_Direct_Paint`)
      .replace(
        '#include <aomap_fragment>',
        `#include <aomap_fragment>
        // Coloured shade: the ambient light leans violet where the sun doesn't reach.
        reflectedLight.indirectDiffuse = mix( reflectedLight.indirectDiffuse, reflectedLight.indirectDiffuse * ( uShade * 1.6 ), uShadeAmt );`
      );
  };
  const key = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () => `${key ? key() : ''}|paint`;
  return material;
}

/** A plain painted material in one colour (props, wood, plaster). */
export function paintMat(color, { rough = 0.85, metal = 0, map = null, vertexColors = false, side = THREE.FrontSide, wrap, rim, emissive = null, ei = 1 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, map, vertexColors, side });
  if (emissive) {
    m.emissive = new THREE.Color(emissive);
    m.emissiveIntensity = ei;
  }
  return painterly(m, { wrap, rim });
}
