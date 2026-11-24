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
  varying, Fn, mx_noise_float, mx_cell_noise_float, mx_worley_noise_float, smoothstep, Discard, If, pow, abs, dot, max, mrt, clamp, sin, normalize, luminance
} from 'three/tsl';

/** The body colour per vertex (body tint or the sculpt's fixed colours). */
function baseColour(bodyU) {
  const vColor = attribute('color', 'vec3');
  const tint = attribute('tint', 'vec2');
  return mix(vColor, bodyU.mul(tint.y), tint.x);
}

/** Emissive rims shouldn't bloom: a plush keeps its glow to itself. */
const NO_GLOW = () => mrt({ emissive: vec4(0, 0, 0, 1) });

/**
 * Contact shadow baked per vertex (attribute `ao`, from the sculpt's distance
 * field: under the arms and chin, between the legs, at the feet): 1 = open.
 */
const contact = () => attribute('ao', 'float');

export function plushMaterial({ color = '#ff6fb1', sheen = 1, rim = 0.34, roughness = 0.9, rimColor = '#fff6ec' } = {}) {
  const body = uniform(new THREE.Color(color));
  const rimU = uniform(new THREE.Color(rimColor));
  const rimK = uniform(rim);
  const m = new THREE.MeshPhysicalNodeMaterial({ roughness, metalness: 0 });
  const rest = attribute('position', 'vec3');
  const fibre = mx_noise_float(rest.mul(55)).mul(0.5).add(mx_noise_float(rest.mul(160)).mul(0.35));
  // a fine woven fabric on the snowsuit panels (belly, pocket, muzzle patches: where the body colour doesn't show)
  const weave = sin(rest.x.add(rest.z).mul(760)).mul(sin(rest.y.mul(760))).mul(0.5).add(0.5);
  const panel = float(1).sub(smoothstep(0.3, 0.8, attribute('tint', 'vec2').x));
  const ao = mix(float(0.5), float(1), contact());
  const col = baseColour(body).mul(fibre.mul(0.07).add(1)).mul(weave.mul(0.06).mul(panel).add(1 - 0.03)).mul(ao);
  m.colorNode = col;
  m.sheen = sheen;
  m.sheenNode = col.mul(0.6).add(0.32).mul(sheen);
  m.sheenRoughnessNode = float(0.55);
  m.roughnessNode = float(roughness).add(fibre.mul(0.05));
  // Fresnel rim: pastels separate from the pastel snow (a warm, sunny edge; stronger up top, where the sky is)
  const ndv = abs(dot(normalView, positionViewDirection));
  const up = normalView.y.mul(0.35).add(0.75).clamp(0.4, 1.1);
  m.emissiveNode = rimU.mul(pow(float(1).sub(ndv), 2.6)).mul(rimK).mul(up).mul(col.add(0.45));
  m.mrtNode = NO_GLOW();
  m.userData.body = body;
  m.userData.rim = rimK;
  return m;
}

/**
 * The shell pass for a (skinned) body mesh: returns a new mesh sharing the
 * geometry (and skeleton), drawn `count` times. Add it as a sibling of the body.
 *
 * Long shaggy plush: strands gather into clumps toward the tips (a Worley
 * cell pulls them together), lie down along the body (combed down and back,
 * slid along the surface), tips lighter and catching the light, roots darker
 * (and darker still in the baked contact shadow), and more of them survive at
 * the silhouette so the outline is a soft fuzzy fringe. Where the face is,
 * the `furry` attribute keeps it short and velvety.
 *
 * LOD: `setFurLod(shells, n)` draws only n of the shells (≤ count), keeping
 * the same length — no new pipeline, just fewer instances.
 */
export function furShells(body, { color, count = 12, length = 0.035, density = 400, wind } = {}) {
  const bodyU = uniform(new THREE.Color(color));
  const lenU = uniform(length);
  const nU = uniform(count);
  const windU = wind ?? uniform(new THREE.Vector3(0, 0, 0));
  const layer = float(instanceIndex).add(1).div(nU);
  const furry = attribute('furry', 'float');
  const furMask = furry.clamp(0, 1);
  const vLayer = varying(layer, 'vLayer');
  const vMask = varying(furMask, 'vFurMask');
  const m = new THREE.MeshPhysicalNodeMaterial({ roughness: 0.95, metalness: 0 });
  // Out along the normal, then combed down and back along the surface (the fur's lie), the wind on top.
  const nrm = normalLocal;
  const comb = vec3(0, -1, -0.45);
  const along = normalize(comb.sub(nrm.mul(dot(comb, nrm))).add(vec3(0, 0, 0.0001)));
  const h = layer.mul(lenU).mul(furMask);
  m.positionNode = positionLocal.add(nrm.mul(h)).add(along.mul(h.mul(layer).mul(0.55))).add(windU.mul(layer.mul(layer)).mul(furMask));
  const rest = attribute('position', 'vec3');
  // strands, and the clumps they gather into (fewer, thinner strands toward the tips, all near a clump's heart)
  const strand = mx_cell_noise_float(rest.mul(density));
  const cell = mx_worley_noise_float(rest.mul(density * 0.11));
  const clump = mx_noise_float(rest.mul(24)).mul(0.18);
  const col = baseColour(bodyU);
  const ao = mix(float(0.45), float(1), attribute('ao', 'float'));
  // roots dark (self-shadow + contact), tips lighter and a little paler, as plush catches the light
  const tipLight = mix(col, col.add(vec3(luminance(col).mul(0.25))), vLayer.mul(vLayer));
  const shade = mix(float(0.62).mul(ao), float(1.12), vLayer);
  m.colorNode = tipLight.mul(shade).mul(clump.add(1));
  m.sheen = 1;
  m.sheenNode = col.mul(0.5).add(0.42).mul(mix(float(0.5), float(1.5), vLayer));
  m.sheenRoughnessNode = float(0.5);
  // the sun catching the fuzzy outline
  const ndv = abs(dot(normalView, positionViewDirection));
  m.emissiveNode = col.add(0.5).mul(pow(float(1).sub(ndv), 3)).mul(vLayer).mul(0.28);
  // Cut the strands: fewer survive toward the tips; none where there's no fur.
  m.colorNode = Fnless(m.colorNode, strand, clump, cell, vLayer, vMask, ndv);
  m.mrtNode = NO_GLOW();
  m.side = THREE.FrontSide;
  const shells = new (body.isSkinnedMesh ? THREE.SkinnedMesh : THREE.Mesh)(body.geometry, m);
  shells.count = count;
  shells.castShadow = false;
  shells.receiveShadow = true;
  shells.frustumCulled = false;
  if (body.isSkinnedMesh) shells.bind(body.skeleton, body.bindMatrix);
  shells.userData = { bodyU, lenU, windU, count, nU };
  return shells;
}

/** Draw only `n` of a fur pass's shells (0 hides it): same fur length, fewer layers. */
export function setFurLod(shells, n) {
  const max = shells.userData.count;
  n = Math.max(0, Math.min(max, Math.round(n)));
  shells.visible = n > 0;
  if (!n || shells.count === n) return;
  shells.count = n;
  shells.userData.nU.value = n;
}

/** Colour node that also discards the gaps between strands. */
function Fnless(colorNode, strand, clump, cell, vLayer, vMask, ndv) {
  return Fn(() => {
    // tips only survive near a clump's heart; at the silhouette more stay, for a fuzzy fringe
    const gather = cell.mul(vLayer).mul(0.55);
    const edge = smoothstep(0.35, 0.05, ndv).mul(0.18);
    const keep = strand.add(clump.mul(0.5)).sub(vLayer.mul(vLayer).mul(1.0)).sub(gather).add(edge);
    If(keep.lessThan(0.04).or(vMask.lessThan(0.08)).or(vLayer.greaterThan(vMask.mul(1.15).add(0.05))), () => {
      Discard();
    });
    return colorNode;
  })();
}

/** Woven cotton (Mallow's pocket, patches): a fine weave, soft sheen, no glow. */
export function fabricMaterial(color) {
  const c = uniform(new THREE.Color(color));
  const m = new THREE.MeshPhysicalNodeMaterial({ roughness: 0.95, metalness: 0 });
  const p = positionLocal;
  const weave = sin(p.x.mul(1400)).mul(sin(p.y.mul(1400))).mul(0.5).add(0.5);
  m.colorNode = c.mul(weave.mul(0.08).add(0.95)).mul(mx_noise_float(p.mul(300)).mul(0.04).add(1));
  m.sheen = 0.8;
  m.sheenNode = c.mul(0.45).add(0.3);
  m.sheenRoughnessNode = float(0.6);
  m.mrtNode = NO_GLOW();
  return m;
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
