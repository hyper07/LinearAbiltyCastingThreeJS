/**
 * Plush, in TSL (WebGPURenderer node materials; no GLSL): the soft toy
 * material and shell fur for the riders (knowledge/render-quality.md §6).
 *
 *   plushMaterial({ color })        sheen-lit fuzzy cloth: high roughness,
 *                                   sheen a lighter tint of the base, a fibre
 *                                   noise in colour and normal, a soft rim.
 *   furShells(mesh, { count, length })
 *                                   one extra draw: the same skinned body
 *                                   drawn `count` times as instances, each
 *                                   pushed out along the normal; strands are
 *                                   cut by cell noise on the rest position so
 *                                   they stay put while the body moves, and
 *                                   thin toward the tips. Root shells darker
 *                                   (self-shadow), tips lighter; a wind/speed
 *                                   sweep combs them back.
 *
 * Geometry comes from the Arcademia sculptor (src/arcademia/world/creatures/
 * sculpt.js): it carries `color` (fixed colours) and `tint` (x: how much is
 * body colour, y: its brightness) per vertex. Fur grows where tint.x is high.
 */
import * as THREE from 'three/webgpu';
import {
  attribute, uniform, vec3, vec4, float, mix, positionLocal, normalLocal, normalView, positionViewDirection, instanceIndex,
  varying, Fn, mx_noise_float, mx_cell_noise_float, smoothstep, Discard, If, pow, abs, dot, max, mrt, clamp
} from 'three/tsl';

/** The body colour per vertex (body tint or the sculpt's fixed colours). */
function baseColour(bodyU) {
  const vColor = attribute('color', 'vec3');
  const tint = attribute('tint', 'vec2');
  return mix(vColor, bodyU.mul(tint.y), tint.x);
}

/** Emissive rims shouldn't bloom: a plush keeps its glow to itself. */
const NO_GLOW = () => mrt({ emissive: vec4(0, 0, 0, 1) });

export function plushMaterial({ color = '#ff6fb1', sheen = 1, rim = 0.22, roughness = 0.9, rimColor = '#ffffff' } = {}) {
  const body = uniform(new THREE.Color(color));
  const rimU = uniform(new THREE.Color(rimColor));
  const rimK = uniform(rim);
  const m = new THREE.MeshPhysicalNodeMaterial({ roughness, metalness: 0 });
  const rest = attribute('position', 'vec3');
  const fibre = mx_noise_float(rest.mul(55)).mul(0.5).add(mx_noise_float(rest.mul(160)).mul(0.35));
  const col = baseColour(body).mul(fibre.mul(0.07).add(1));
  m.colorNode = col;
  m.sheen = sheen;
  m.sheenNode = col.mul(0.6).add(0.32).mul(sheen);
  m.sheenRoughnessNode = float(0.55);
  m.roughnessNode = float(roughness).add(fibre.mul(0.05));
  // Fresnel rim: pastels separate from the pastel snow.
  const ndv = abs(dot(normalView, positionViewDirection));
  m.emissiveNode = rimU.mul(pow(float(1).sub(ndv), 3.0)).mul(rimK).mul(col.add(0.4));
  m.mrtNode = NO_GLOW();
  m.userData.body = body;
  m.userData.rim = rimK;
  return m;
}

/**
 * The shell pass for a (skinned) body mesh: returns a new mesh sharing the
 * geometry (and skeleton), drawn `count` times. Add it as a sibling of the body.
 */
export function furShells(body, { color, count = 12, length = 0.035, density = 260, wind } = {}) {
  const bodyU = uniform(new THREE.Color(color));
  const lenU = uniform(length);
  const windU = wind ?? uniform(new THREE.Vector3(0, 0, 0));
  const n = float(count);
  const layer = float(instanceIndex).add(1).div(n);
  const tint = attribute('tint', 'vec2');
  const furMask = smoothstep(0.55, 0.9, tint.x);
  const vLayer = varying(layer, 'vLayer');
  const vMask = varying(furMask, 'vFurMask');
  const m = new THREE.MeshPhysicalNodeMaterial({ roughness: 0.95, metalness: 0 });
  // Out along the normal, combed by the wind toward the tips.
  m.positionNode = positionLocal.add(normalLocal.mul(layer.mul(lenU).mul(furMask))).add(windU.mul(layer.mul(layer)).mul(furMask));
  const rest = attribute('position', 'vec3');
  const strand = mx_cell_noise_float(rest.mul(density));
  const clump = mx_noise_float(rest.mul(24)).mul(0.18);
  const col = baseColour(bodyU);
  m.colorNode = col.mul(mix(float(0.78), float(1.1), vLayer)).mul(clump.add(1));
  m.sheen = 1;
  m.sheenNode = col.mul(0.5).add(0.38);
  m.sheenRoughnessNode = float(0.6);
  // Cut the strands: fewer survive toward the tips; none where there's no fur.
  m.colorNode = Fnless(m.colorNode, strand, clump, vLayer, vMask);
  m.mrtNode = NO_GLOW();
  m.side = THREE.FrontSide;
  const shells = new (body.isSkinnedMesh ? THREE.SkinnedMesh : THREE.Mesh)(body.geometry, m);
  shells.count = count;
  shells.castShadow = false;
  shells.receiveShadow = true;
  shells.frustumCulled = false;
  if (body.isSkinnedMesh) shells.bind(body.skeleton, body.bindMatrix);
  shells.userData = { bodyU, lenU, windU, count };
  return shells;
}

/** Colour node that also discards the gaps between strands. */
function Fnless(colorNode, strand, clump, vLayer, vMask) {
  return Fn(() => {
    const keep = strand.add(clump.mul(0.5)).sub(vLayer.mul(vLayer).mul(1.05));
    If(keep.lessThan(0.04).or(vMask.lessThan(0.15)), () => {
      Discard();
    });
    return colorNode;
  })();
}

/** Glossy toy plastic / vinyl: goggles, boards, buttons (clearcoat). */
export function vinylMaterial(color, { roughness = 0.32, clearcoat = 1, metalness = 0, emissive = null, ei = 0 } = {}) {
  const m = new THREE.MeshPhysicalNodeMaterial({ color, roughness, metalness, clearcoat, clearcoatRoughness: 0.08 });
  if (emissive) {
    m.emissive = new THREE.Color(emissive);
    m.emissiveIntensity = ei;
  }
  return m;
}

/** Knitted wool (scarves, beanies): felt-rough, a little sheen, a rib pattern. */
export function knitMaterial(color) {
  const c = uniform(new THREE.Color(color));
  const m = new THREE.MeshPhysicalNodeMaterial({ roughness: 1, metalness: 0 });
  const p = positionLocal;
  const rib = mx_noise_float(p.mul(vec3(90, 30, 90))).mul(0.12).add(mx_noise_float(p.mul(260)).mul(0.06));
  m.colorNode = c.mul(rib.add(0.96));
  m.sheen = 0.7;
  m.sheenNode = c.mul(0.5).add(0.25);
  m.sheenRoughnessNode = float(0.7);
  m.mrtNode = NO_GLOW();
  return m;
}

export { clamp, max };
