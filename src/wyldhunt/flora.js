/**
 * Dressing the gorge: the jungle (kapok giants grown by Gloamreach's tree
 * code with a new species, palms, tree ferns, taro, wild bananas, ferns),
 * vines hanging off every ledge, roots arching across the path, mossy
 * boulders and photographed cliff faces lining the walls' feet, wet rocks in
 * the river, and the ground cover. Plants are instanced and only the ones
 * near the camera and in view are drawn.
 */
import * as THREE from 'three';
import { SPECIES, TreeField, giantTree } from '../gloamreach/trees.js';
import { PropLibrary } from '../gloamreach/props.js';
import { tf } from '../gloamreach/kit.js';
import { rng } from '../gloamreach/noise.js';
import { EXTENT, CANYON, PATH, RIVER, FALLS, scatterJungle, pointAt, halfWidthAt, floorAt } from './map.js';
import { heightAt, canyonAt, isClear, jungleGround, pathDistance, riverDistance, waterAt, stoneTops } from './heights.js';
import { Cover } from './cover.js';
import { keepProps, areaScale } from '../shared/zones/keep.js';
import { palm, treeFern, taro, banana, vineCards, tubeAlong, frondTexture, broadLeafTexture, palmBarkTexture, vineTexture, leafMaterial, woodMaterial } from './plants.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// A jungle species for Gloamreach's tree grower: tall, buttressed, a high spreading crown of glossy leaves.
SPECIES.kapok ??= {
  bark: { seed: 41, palette: ['#1a1810', '#4a4838', '#7e7a62', '#3a5a22'], mossy: 0.7, twist: 0.04 },
  leaves: ['#18320e', '#244a14', '#30601a', '#3e6e20', '#4e7e28'],
  leafShape: 'round',
  trunkFrac: 0.74, lobes: 7, lobeAmp: 0.95, limbs: 7, depth: 3, spread: 1.7, cardSize: 3.8, clusterR: 4.2, cards: 16, leafTint: [1, 1, 1]
};
SPECIES.fig ??= {
  bark: { seed: 42, palette: ['#22201a', '#585440', '#8a846a', '#46602a'], mossy: 0.65, twist: 0.35 },
  leaves: ['#1c3a10', '#2a5216', '#3a6a1e', '#527a26'],
  leafShape: 'round',
  trunkFrac: 0.5, lobes: 9, lobeAmp: 1.0, limbs: 5, depth: 3, spread: 1.2, cardSize: 3.2, clusterR: 3.4, cards: 14, twist: 0.3, leafTint: [1, 1, 1]
};

/** Mossy, wet stone: moss on whatever faces up, darker and glossy where it is damp (by the water, in the rain). */
export function mossWet(material, { splatB, extent, rain, moss = new THREE.Color('#4a6a26'), mossAmt = 1 }) {
  const u = { tDamp: { value: splatB }, uExt: { value: new THREE.Vector4(extent.x0, extent.z0, extent.x1 - extent.x0, extent.z1 - extent.z0) }, uRainW: rain, uMossC: { value: moss }, uMossK: { value: mossAmt } };
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (sh, r) => {
    prev?.call(material, sh, r);
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'varying vec3 vMW;\nvarying vec3 vMN;\n' + sh.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
      {
        mat4 M4 = modelMatrix;
        #ifdef USE_INSTANCING
          M4 = modelMatrix * instanceMatrix;
        #endif
        vMW = (M4 * vec4(transformed, 1.0)).xyz;
        vMN = normalize(mat3(M4) * objectNormal);
      }`
    );
    sh.fragmentShader = 'varying vec3 vMW;\nvarying vec3 vMN;\nuniform sampler2D tDamp;\nuniform vec4 uExt;\nuniform float uRainW;\nuniform vec3 uMossC;\nuniform float uMossK;\nfloat gWet;\n' + sh.fragmentShader
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          float damp = texture2D(tDamp, (vMW.xz - uExt.xy) / uExt.zw).a;
          float up = smoothstep(0.25, 0.85, normalize(vMN).y);
          float n = fract(sin(dot(floor(vMW.xz * 3.0), vec2(12.9898, 78.233))) * 43758.5453);
          float mossK = clamp(up * (0.55 + damp * 0.6) * uMossK + (n - 0.5) * 0.15 * up, 0.0, 1.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, uMossC * (0.7 + n * 0.5), mossK * 0.85);
          gWet = clamp(damp * 0.9 + uRainW * (0.4 + 0.5 * up), 0.0, 1.0);
          diffuseColor.rgb *= mix(1.0, 0.6, gWet * (1.0 - mossK * 0.5));
        }`
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, roughnessFactor * 0.3, gWet);');
  };
  const key = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () => `${key ? key() : ''}|mosswet`;
  return material;
}

/** A crag: a lumpy, faceted lump of rock (a noise-displaced, flattened sphere), base at y = 0. */
export function cragGeometry(seed) {
  const r = rng(seed);
  const g = new THREE.IcosahedronGeometry(1, 3);
  const p = g.attributes.position;
  const ph = [r() * 10, r() * 10, r() * 10];
  for (let i = 0; i < p.count; i++) {
    const v = V(p.getX(i), p.getY(i), p.getZ(i));
    const n = Math.sin(v.x * 3.1 + ph[0]) * Math.sin(v.y * 2.7 + ph[1]) * Math.sin(v.z * 3.3 + ph[2]);
    const n2 = Math.sin(v.x * 7.3 + ph[1]) * Math.sin(v.y * 6.1 + ph[2]) * Math.sin(v.z * 8.7 + ph[0]);
    // Strata: flatten into ledges.
    const k = 1 + n * 0.28 + n2 * 0.08;
    v.multiplyScalar(k);
    v.y = Math.round(v.y * 4) / 4 * 0.6 + v.y * 0.4;
    p.setXYZ(i, v.x, v.y * 0.9 + 0.75, v.z * 0.8);
  }
  g.computeVertexNormals();
  const flat = g.index ? g.toNonIndexed() : g.clone();
  flat.computeVertexNormals();
  g.dispose();
  for (const k of Object.keys(flat.attributes)) if (!['position', 'normal'].includes(k)) flat.deleteAttribute(k);
  flat.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(flat.attributes.position.count * 2), 2));
  return flat;
}

/** Rock projected three ways in world space (bare on the faces, mossy on top), wet where it is damp. */
export function triplanarRock([rock, mossy], { splatB, rain }) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0 });
  const u = { tRC: { value: rock.map }, tRN: { value: rock.normalMap }, tRA: { value: rock.arm }, tMC: { value: mossy.map }, tMN: { value: mossy.normalMap }, tDamp: { value: splatB }, uExt: { value: new THREE.Vector4(EXTENT.x0, EXTENT.z0, EXTENT.x1 - EXTENT.x0, EXTENT.z1 - EXTENT.z0) }, uRainW: rain };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'varying vec3 vTW;\nvarying vec3 vTN;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      {
        mat4 M4 = modelMatrix;
        #ifdef USE_INSTANCING
          M4 = modelMatrix * instanceMatrix;
        #endif
        vTW = (M4 * vec4(transformed, 1.0)).xyz;
        vTN = normalize(mat3(M4) * objectNormal);
      }`);
    sh.fragmentShader = `varying vec3 vTW;\nvarying vec3 vTN;\nuniform sampler2D tRC; uniform sampler2D tRN; uniform sampler2D tRA; uniform sampler2D tMC; uniform sampler2D tMN; uniform sampler2D tDamp; uniform vec4 uExt; uniform float uRainW;\nvec3 tpN; float tpR; float tpAO;\n` + sh.fragmentShader
      .replace('#include <map_fragment>', `{
        vec3 Ng = normalize(vTN);
        vec3 bw = pow(abs(Ng), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
        vec3 P = vTW / 6.0;
        vec3 c = texture2D(tRC, P.zy).rgb * bw.x + texture2D(tRC, P.xz).rgb * bw.y + texture2D(tRC, P.xy).rgb * bw.z;
        vec3 a = texture2D(tRA, P.zy).rgb * bw.x + texture2D(tRA, P.xz).rgb * bw.y + texture2D(tRA, P.xy).rgb * bw.z;
        vec3 nx = texture2D(tRN, P.zy).xyz * 2.0 - 1.0; vec3 ny = texture2D(tRN, P.xz).xyz * 2.0 - 1.0; vec3 nz = texture2D(tRN, P.xy).xyz * 2.0 - 1.0;
        nx = vec3(nx.xy + Ng.zy, abs(nx.z) * Ng.x); ny = vec3(ny.xy + Ng.xz, abs(ny.z) * Ng.y); nz = vec3(nz.xy + Ng.xy, abs(nz.z) * Ng.z);
        vec3 n = normalize(nx.zyx * bw.x + ny.xzy * bw.y + nz.xyz * bw.z);
        float up = smoothstep(0.35, 0.8, Ng.y + (a.b - 0.5) * 0.5);
        if (up > 0.01) {
          vec3 Q = vTW / 5.0;
          vec3 mc = texture2D(tMC, Q.zy).rgb * bw.x + texture2D(tMC, Q.xz).rgb * bw.y + texture2D(tMC, Q.xy).rgb * bw.z;
          c = mix(c, mc * vec3(0.75, 0.88, 0.62), up);
        }
        c *= vec3(0.64, 0.68, 0.66) + up * 0.3;
        float damp = texture2D(tDamp, (vTW.xz - uExt.xy) / uExt.zw).a;
        float wetK = clamp(damp * 0.8 + uRainW * (0.4 + 0.5 * max(Ng.y, 0.0)), 0.0, 1.0);
        c *= mix(1.0, 0.6, wetK);
        diffuseColor.rgb *= c;
        tpN = n;
        tpR = mix(max(a.g, 0.55), max(a.g, 0.55) * 0.3, wetK);
        tpAO = a.r;
      }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = tpR;')
      .replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix * vec4(tpN, 0.0)).xyz);')
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= tpAO;');
  };
  m.customProgramCacheKey = () => 'wyld-crag';
  return m;
}

/** Register a hand-made model with the prop library, so it is instanced and culled like a photographed one. */
function register(props, id, parts) {
  const box = new THREE.Box3();
  for (const p of parts) {
    p.geo.computeBoundingBox();
    box.union(p.geo.boundingBox);
  }
  props.cache.set(`${id}|false`, Promise.resolve([{ parts, box }]));
}

/** Give every mesh of a field the shadow material its own material carries (alpha cut, wind). */
function depthFor(field) {
  if (!field) return;
  for (const set of field.sets) for (const m of set.meshes) if (m.material.userData.depth) m.customDepthMaterial = m.material.userData.depth;
}

/** The part of the canyon's floor (where plants grow) that `keep` holds, 0–1. */
function floorShare(keep) {
  let all = 0;
  let mine = 0;
  for (let z = EXTENT.z0; z < EXTENT.z1; z += 8) {
    for (let x = EXTENT.x0; x < EXTENT.x1; x += 8) {
      if (canyonAt(x, z).e > 6) continue;
      all++;
      if (keep(x, z)) mine++;
    }
  }
  return all ? mine / all : 1;
}

export async function buildFlora(world, { bank, settings }) {
  const scene = world.scene;
  const keep = world.keep ?? (() => true);
  const EXT = world.extent ?? EXTENT;
  const props = keepProps(new PropLibrary(), keep);
  world.props = props;
  scene.add(props.group);
  const msaa = (settings.msaa ?? 0) > 0;
  const density = settings.plants ?? 1;
  const r = rng(2024);
  const H = heightAt;
  const rainU = (world.rainU = world.rainU ?? { value: 0 });
  const moss = (m, k = 1) => mossWet(m, { splatB: world.splat.b, extent: EXT, rain: rainU, mossAmt: k });

  /* -------------------------------------------------------------- trees */
  const scattered = scatterJungle((x, z, gap) => isClear(x, z, gap * 0.4), jungleGround, 11).filter((t) => keep(t.x, t.z));
  world.trees = scattered;
  const kapoks = scattered.filter((t) => t.kind === 'kapok').map((t) => ({ ...t, kind: t.seed % 3 === 0 ? 'fig' : 'kapok', s: t.s * (jungleGround(t.x, t.z) === 'rim' ? 1.5 : 1.9) }));
  const field = new TreeField(bank, kapoks, H, { lod: settings.treeLod, msaa });
  scene.add(field.group);
  world.treeField = field;
  for (const t of kapoks) world.colliders.circle(t.x, t.z, 0.55 * t.s + 0.3, -50, 60);
  // A few giants by the path: each its own mesh, the scenery's heroes.
  const giants = [];
  for (let s = 40; s < PATH.len - 30; s += 70) {
    const p = pointAt(PATH, s + r() * 20);
    for (let k = 0; k < 6; k++) {
      const side = r() < 0.5 ? -1 : 1;
      const off = 11 + r() * 10;
      const x = p.x + Math.cos(p.yaw) * side * off;
      const z = p.z - Math.sin(p.yaw) * side * off;
      if (isClear(x, z, 3) && jungleGround(x, z) === 'floor' && keep(x, z)) {
        giants.push({ x, z, r: 1.3 + r() * 0.5, h: 34 + r() * 14, seed: 700 + giants.length * 13 });
        break;
      }
    }
  }
  for (const spec of giants) {
    const g = giantTree(bank, 'kapok', spec, H, { msaa, detail: 0.9 });
    scene.add(g.group);
    world.colliders.circle(spec.x, spec.z, spec.r * 1.3, -50, 60);
  }
  world.giants = giants;

  /* -------------------------------------------------------------- palms and tree ferns */
  const frondTex = frondTexture('palm', 3);
  const fernTex = frondTexture('fern', 5);
  const deadTex = frondTexture('palm', 9);
  const barkMap = palmBarkTexture();
  const palmLeaf = leafMaterial(frondTex, { msaa, color: 0xe8f0d8, flutter: 0.03 });
  const deadLeaf = leafMaterial(deadTex, { msaa, color: 0x9a7a4a, flutter: 0.01, trans: 0.4 });
  const fernLeaf = leafMaterial(fernTex, { msaa, color: 0xd8e8c8, flutter: 0.02 });
  const palmWood = moss(woodMaterial(barkMap, { color: 0x8a8070 }), 0.6);
  palmWood.userData.depth = woodMaterial(barkMap).userData.depth;
  const fernBark = bank.bark(45, ['#1a140e', '#3a2c1e', '#5a4632', '#3a5a22'], { mossy: 0.5 });
  const fernWood = woodMaterial(fernBark.map, { normalMap: fernBark.normalMap });
  const jobs = [];
  const palms = scattered.filter((t) => t.kind === 'palm');
  const ferns = scattered.filter((t) => t.kind === 'treefern');
  for (let v = 0; v < 3; v++) {
    const p = palm(300 + v * 17, { height: 8 + v * 2.5 });
    register(props, `palm${v}`, [{ geo: p.trunk, material: palmWood }, { geo: p.crown, material: palmLeaf }, { geo: p.dead, material: deadLeaf }]);
    const list = palms.filter((_, i) => i % 3 === v).map((t) => tf(t.x, H(t.x, t.z) - 0.2, t.z, 0, (t.seed % 628) / 100, 0, t.s, t.s, t.s));
    jobs.push(props.scatter(`palm${v}`, list, { dist: 260 }).then(depthFor));
    const f = treeFern(400 + v * 23, { height: 2.4 + v * 0.9 });
    register(props, `tfern${v}`, [{ geo: f.trunk, material: fernWood }, { geo: f.crown, material: fernLeaf }]);
    const fl = ferns.filter((_, i) => i % 3 === v).map((t) => tf(t.x, H(t.x, t.z) - 0.1, t.z, 0, (t.seed % 628) / 100, 0, t.s, t.s, t.s));
    jobs.push(props.scatter(`tfern${v}`, fl, { dist: 140 }).then(depthFor));
  }
  for (const t of [...palms, ...ferns]) world.colliders.circle(t.x, t.z, 0.25 * t.s + 0.1, -50, 20);

  /* -------------------------------------------------------------- undergrowth */
  const taroTex = broadLeafTexture('taro', 4);
  const banTex = broadLeafTexture('banana', 6);
  const taroLeaf = leafMaterial(taroTex, { msaa, flutter: 0.015, rough: 0.7, color: 0x8aa880 });
  const banLeaf = leafMaterial(banTex, { msaa, flutter: 0.02, rough: 0.7, color: 0xa0b890 });
  const stemMat = woodMaterial(null, { color: 0x5a7a2a, rough: 0.7 });
  const banStem = woodMaterial(null, { color: 0x6a7a3a, rough: 0.8 });
  const spots = { taro: [], banana: [], fern: [], shrub: [], groundFern: [] };
  const N = areaScale(Math.round(17000 * density), EXT, EXTENT);
  for (let k = 0; k < N; k++) {
    const x = EXT.x0 + r() * (EXT.x1 - EXT.x0);
    const z = EXT.z0 + r() * (EXT.z1 - EXT.z0);
    if (!keep(x, z)) continue;
    const c = canyonAt(x, z);
    if (c.e > 6) continue;
    const pd = pathDistance(x, z);
    if (pd < 2.3) continue;
    if (pd > 9 && r() < 0.35) continue;
    const rv = riverDistance(x, z);
    if (rv.d < rv.w + 0.6) continue;
    if (!isClear(x, z, -3.2) && pd > 4.5) continue;
    if (Math.hypot(x - 4, z - 352) < 14) continue;
    // Thicker by the walls, by the water and at the path's edge; thinner in the meadow.
    const nearWall = c.e > -14;
    const edge = pd < 7;
    const wetSide = rv.d < rv.w + 8;
    const p = r();
    if (c.e > 0) {
      if (p < 0.5) spots.fern.push([x, z]);
      else if (p < 0.7) spots.groundFern.push([x, z]);
      continue;
    }
    if (p < 0.2 * (edge || wetSide ? 1.6 : 1)) spots.taro.push([x, z]);
    else if (p < 0.3) spots.banana.push([x, z]);
    else if (p < 0.62 || nearWall || edge) spots.fern.push([x, z]);
    else if (p < 0.75) spots.shrub.push([x, z]);
    else spots.groundFern.push([x, z]);
  }
  // The path's edges: a corridor through thick green — ferns, taro, the odd banana — as close as the path allows.
  const edge = { fern: [], taro: [], rock: [] };
  for (let s = 2; s < PATH.len; s += 1.1 / density) {
    const p = pointAt(PATH, s);
    for (const side of [-1, 1]) {
      if (r() < 0.25) continue;
      const off = 2.7 + Math.pow(r(), 1.6) * 7;
      const x = p.x + Math.cos(p.yaw) * side * off + (r() - 0.5) * 0.8;
      const z = p.z - Math.sin(p.yaw) * side * off + (r() - 0.5) * 0.8;
      const rv = riverDistance(x, z);
      if (rv.d < rv.w + 0.8 || canyonAt(x, z).e > 4 || pathDistance(x, z) < 2.4) continue;
      if (Math.hypot(x - 4, z - 352) < 13 || !keep(x, z)) continue;
      const q = r();
      if (q < 0.62) edge.fern.push([x, z]);
      else if (q < 0.9) edge.taro.push([x, z]);
      else edge.rock.push([x, z]);
    }
  }
  spots.fern.push(...edge.fern);
  spots.taro.push(...edge.taro);
  const mats = (list, scale = 1, jitter = 0.35, sink = 0.05) =>
    list.map(([x, z]) => tf(x, H(x, z) - sink, z, (r() - 0.5) * 0.12, r() * 6.28, (r() - 0.5) * 0.12, scale * (1 - jitter / 2 + r() * jitter), scale * (1 - jitter / 2 + r() * jitter), scale * (1 - jitter / 2 + r() * jitter)));
  for (let v = 0; v < 3; v++) {
    const t = taro(500 + v * 7, { size: 1 + v * 0.35 });
    register(props, `taro${v}`, [{ geo: t.stems, material: stemMat }, { geo: t.leaves, material: taroLeaf }]);
    jobs.push(props.scatter(`taro${v}`, mats(spots.taro.filter((_, i) => i % 3 === v), 1.1), { dist: 70, shadows: true }).then(depthFor));
    const b = banana(600 + v * 9, { size: 1 + v * 0.3 });
    register(props, `banana${v}`, [{ geo: b.stem, material: banStem }, { geo: b.leaves, material: banLeaf }]);
    jobs.push(props.scatter(`banana${v}`, mats(spots.banana.filter((_, i) => i % 3 === v), 1.15), { dist: 110, shadows: true }).then(depthFor));
  }
  // Photographed ferns and shrubs (Poly Haven), swaying.
  const windy = (m) => {
    m.side = THREE.DoubleSide;
    m.alphaTest = Math.max(m.alphaTest, 0.4);
  };
  const prep = async (id, list, opts) => {
    const variants = await props.load(id, true);
    if (!variants) return null;
    const { addWind, addTranslucency } = await import('../gloamreach/materials.js');
    for (const v of variants) {
      for (const p of v.parts) {
        if (p.geo.attributes.aWind) continue;
        p.geo.computeBoundingBox();
        const h = Math.max(0.1, p.geo.boundingBox.max.y - p.geo.boundingBox.min.y);
        const pos = p.geo.attributes.position;
        const w = new Float32Array(pos.count * 2);
        for (let i = 0; i < pos.count; i++) {
          w[i * 2] = (pos.getX(i) + pos.getZ(i)) * 0.5;
          w[i * 2 + 1] = Math.pow(Math.max(0, pos.getY(i) - p.geo.boundingBox.min.y) / h, 1.5) * 0.25;
        }
        p.geo.setAttribute('aWind', new THREE.BufferAttribute(w, 2));
      }
    }
    return props.scatter(id, list, {
      split: true,
      onMaterial: (m) => {
        windy(m);
        addWind(m, { flutter: 0.012 });
        addTranslucency(m, 0.8);
        if (opts.tintC) m.color.multiply(opts.tintC);
      },
      ...opts
    });
  };
  // The caps were for the whole gorge: a zone takes its share of the canyon's floor, so it isn't planted thicker than before.
  const share = floorShare(keep);
  const cap = (list, n) => list.slice(0, Math.round(n * density * share));
  jobs.push(prep('fern_02', mats(cap(spots.fern, 6500), 2.8, 0.5), { shadows: false, dist: 75, tintC: new THREE.Color(0.8, 1.0, 0.75) }));
  jobs.push(prep('fern_02', mats(cap(spots.groundFern, 2400), 1.8, 0.4), { shadows: false, dist: 50, tintC: new THREE.Color(0.7, 0.9, 0.6) }));
  jobs.push(prep('shrub_03', mats(cap(spots.shrub, 500), 2.2), { shadows: true, dist: 70, tintC: new THREE.Color(0.75, 0.95, 0.7) }));

  /* -------------------------------------------------------------- rocks and the walls' feet */
  const rocks = [];
  const faces = [];
  const cliffs = [];
  const riverRocks = [];
  for (let s = 6; s < CANYON.len - 6; s += 7) {
    const p = pointAt(CANYON, s);
    const W = halfWidthAt(s);
    for (const side of [-1, 1]) {
      const nx = Math.cos(p.yaw) * side;
      const nz = -Math.sin(p.yaw) * side;
      // March out to the wall's foot.
      let foot = null;
      const fl = floorAt(s);
      for (let k = W - 30; k < W + 40; k += 1) {
        const x = p.x + nx * k;
        const z = p.z + nz * k;
        if (H(x, z) > fl + 6) {
          foot = { x, z, k };
          break;
        }
      }
      if (!foot) continue;
      const yaw = Math.atan2(nx, nz);
      // Big photographed cliff bands along the foot, half sunk.
      if ((s / 7) % 4 === Math.round(side + 1) % 4 || r() < 0.18) cliffs.push(tf(foot.x + nx * 2, fl - 3 - r() * 4, foot.z + nz * 2, 0, yaw + Math.PI / 2 + (r() - 0.5) * 0.3, 0, 1.3 + r() * 0.6, 1.6 + r() * 1.4, 1.3 + r() * 0.5));
      // Faces up the wall.
      for (let k = 0; k < 2; k++) {
        const up = 6 + r() * 40;
        let a = foot.k;
        for (let i = 0; i < 40 && H(p.x + nx * a, p.z + nz * a) < fl + up; i++) a += 1;
        const fx = p.x + nx * (a - 1.5);
        const fz = p.z + nz * (a - 1.5);
        // Only against rock: never hanging in the air (the bays push the wall back).
        if (H(p.x + nx * (a + 2), p.z + nz * (a + 2)) < fl + up - 4 || H(fx, fz) < fl + up - 12) continue;
        faces.push(tf(fx, fl + up - 3, fz, (r() - 0.5) * 0.4, yaw + (r() - 0.5) * 1.2, (r() - 0.5) * 0.4, 3 + r() * 4, 3 + r() * 5, 3 + r() * 4));
      }
      // Boulders tumbled at the foot.
      for (let k = 0; k < 2; k++) {
        const back = 2 + r() * 10;
        const x = foot.x - nx * back + (r() - 0.5) * 6;
        const z = foot.z - nz * back + (r() - 0.5) * 6;
        if (pathDistance(x, z) < 3.5) continue;
        rocks.push(tf(x, H(x, z) - 0.3, z, 0, r() * 6, 0, 1.4 + r() * 2.4, 1.2 + r() * 2, 1.4 + r() * 2.4));
      }
    }
  }
  for (const [x, z] of edge.rock) rocks.push(tf(x, H(x, z) - 0.25, z, 0, r() * 6, 0, 0.8 + r() * 1.2, 0.6 + r() * 0.9, 0.8 + r() * 1.2));
  // Wet rocks in the river and on its banks.
  for (let s = 4; s < RIVER.len; s += 5) {
    const p = pointAt(RIVER, s);
    const rv = riverDistance(p.x, p.z);
    for (let k = 0; k < 2; k++) {
      const side = r() < 0.5 ? -1 : 1;
      const off = rv.w * (0.3 + r() * 1.0) * side;
      const x = p.x + Math.cos(p.yaw) * off;
      const z = p.z - Math.sin(p.yaw) * off;
      if (pathDistance(x, z) < 2.5) continue;
      riverRocks.push(tf(x, H(x, z) - 0.2, z, 0, r() * 6, 0, 0.6 + r() * 1.3, 0.5 + r() * 1.0, 0.6 + r() * 1.3));
    }
  }
  // Round the pools, big ones.
  for (const fl of FALLS) {
    for (let k = 0; k < 14; k++) {
      const a = r() * Math.PI * 2;
      const d = fl.pool.r * (0.9 + r() * 0.5);
      const x = fl.pool.x + Math.sin(a) * d;
      const z = fl.pool.z + Math.cos(a) * d;
      riverRocks.push(tf(x, H(x, z) - 0.4, z, 0, r() * 6, 0, 1.5 + r() * 2.5, 1.2 + r() * 2, 1.5 + r() * 2.5));
    }
  }
  const stoneM = (m) => moss(m, 1);
  const wetOnly = (m) => moss(m, 0.35);
  jobs.push(props.scatter('rock_moss_set_01', rocks.filter((_, i) => i % 2), { split: true, dist: 180, onMaterial: stoneM }));
  jobs.push(props.scatter('rock_moss_set_02', rocks.filter((_, i) => !(i % 2)), { split: true, dist: 180, onMaterial: stoneM }));
  jobs.push(props.scatter('rock_moss_set_02', riverRocks, { split: true, dist: 140, onMaterial: wetOnly }));
  // Crags (grown here, cheap) all along the walls; the photographed faces only near the path.
  const rockSets = await Promise.all([bank.ambient('Rock051', { fallback: '#6a6a66' }), bank.ambient('Rock063', { fallback: '#5a6a3a' })]);
  const cragMat = triplanarRock(rockSets, { splatB: world.splat.b, rain: rainU });
  for (let v = 0; v < 4; v++) register(props, `crag${v}`, [{ geo: cragGeometry(900 + v * 7), material: cragMat }]);
  for (let v = 0; v < 4; v++) jobs.push(props.scatter(`crag${v}`, [...faces, ...cliffs].filter((_, i) => i % 4 === v), { dist: 520 }));
  const nearPath = (m) => pathDistance(m.elements[12], m.elements[14]) < 40;
  jobs.push(props.scatter('rock_face_01', faces.filter((m, i) => i % 5 === 0 && nearPath(m)), { dist: 110, onMaterial: stoneM }));
  jobs.push(props.scatter('rock_face_02', faces.filter((m, i) => i % 5 === 1 && nearPath(m)), { dist: 110, onMaterial: stoneM }));
  for (const m of [...rocks, ...riverRocks]) {
    const e = m.elements;
    world.colliders.circle(e[12], e[14], 0.8 * Math.hypot(e[0], e[2]), -50, H(e[12], e[14]) + 1.4 * Math.hypot(e[4], e[5], e[6]));
  }
  // The ford's stepping stones.
  const stones = stoneTops().map(([x, z, rad, top]) => tf(x, top - 0.7, z, 0, x * 3, 0, rad * 1.1, 0.75, rad * 1.1));
  jobs.push(props.scatter('boulder_01', stones, { dist: 160, onMaterial: wetOnly }));

  /* -------------------------------------------------------------- vines off the ledges and roots over the path */
  const vineTex = vineTexture();
  const vineMat = leafMaterial(vineTex, { msaa, flutter: 0.01, trans: 0.7 });
  const VINE_LENS = [5, 10, 18, 30];
  VINE_LENS.forEach((L, i) => register(props, `vine${i}`, [{ geo: vineCards(L, 0.9, i * 0.7), material: vineMat }]));
  const vines = [];
  for (let s = 8; s < CANYON.len - 8; s += 3.2) {
    const p = pointAt(CANYON, s);
    const W = halfWidthAt(s);
    const fl = floorAt(s);
    for (const side of [-1, 1]) {
      if (r() < 0.25) continue;
      const nx = Math.cos(p.yaw) * side;
      const nz = -Math.sin(p.yaw) * side;
      // A ledge some way up: the first place outward where the rock stops rising for a step.
      const want = 10 + r() * 60;
      let a = W - 10;
      for (let i = 0; i < 80 && H(p.x + nx * a, p.z + nz * a) < fl + want; i++) a += 0.7;
      const x = p.x + nx * (a - 0.8) + (r() - 0.5) * 2;
      const z = p.z + nz * (a - 0.8) + (r() - 0.5) * 2;
      const top = H(p.x + nx * a, p.z + nz * a);
      const len = Math.min(top - fl - 1, 6 + r() * 26);
      if (len < 3) continue;
      vines.push({ x, y: top, z, len });
    }
  }
  // From the giants' limbs too.
  for (const g of giants) for (let k = 0; k < 10; k++) {
    const a = r() * 6.28;
    const d = 3 + r() * 8;
    const x = g.x + Math.cos(a) * d;
    const z = g.z + Math.sin(a) * d;
    const top = H(g.x, g.z) + g.h * (0.55 + r() * 0.15);
    const len = 6 + r() * (top - H(x, z) - 8);
    vines.push({ x, y: top, z, len: Math.max(4, len) });
  }
  VINE_LENS.forEach((L, i) => {
    const mine = vines.filter((v) => VINE_LENS.reduce((b, l, j) => (Math.abs(l - v.len) < Math.abs(VINE_LENS[b] - v.len) ? j : b), 0) === i);
    jobs.push(props.scatter(`vine${i}`, mine.map((v) => tf(v.x, v.y, v.z, 0, r() * 6, 0, 0.8 + r() * 0.5, (v.len / L) * 0.9 + 0.1, 0.8 + r() * 0.5)), { dist: 200, shadows: false }));
  });

  // Roots: arching across the path, knee-high, from one bank to the other.
  const bark = bank.bark(41, SPECIES.kapok.bark.palette, { mossy: 0.7, twist: 0.04 });
  const rootMat = moss(new THREE.MeshStandardMaterial({ map: bark.map, normalMap: bark.normalMap, normalScale: new THREE.Vector2(1.5, 1.5), roughness: 0.9, color: 0xb8a890 }), 0.25);
  const rootGeos = [];
  const roots = [];
  for (let s = 30; s < PATH.len - 10; s += 9 + r() * 14) {
    const p = pointAt(PATH, s);
    const n = 1 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const side = r() < 0.5 ? -1 : 1;
      const yaw = p.yaw + Math.PI / 2 + (r() - 0.5) * 0.9;
      const half = 3 + r() * 3;
      const sx = p.x - Math.sin(yaw) * half * side + (r() - 0.5) * 2;
      const sz = p.z - Math.cos(yaw) * half * side + (r() - 0.5) * 2;
      const ex = p.x + Math.sin(yaw) * half * side;
      const ez = p.z + Math.cos(yaw) * half * side;
      const pts = [];
      const rad = [];
      const R0 = 0.16 + r() * 0.26;
      const steps = 12;
      const arch = 0.25 + r() * 0.45;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = sx + (ex - sx) * t + Math.sin(t * 9 + k) * 0.25;
        const z = sz + (ez - sz) * t + Math.cos(t * 7 + k) * 0.25;
        const y = H(x, z) + Math.sin(t * Math.PI) * arch - 0.15 + (t < 0.1 || t > 0.9 ? -0.25 : 0);
        pts.push(V(x, y, z));
        rad.push(R0 * (1 - t * 0.55) + 0.03);
      }
      if (!keep(p.x, p.z)) continue;
      rootGeos.push(tubeAlong(pts, rad, 7, { vWorld: 1.2, uRep: 1 }));
      roots.push({ x: p.x, z: p.z, r: half });
    }
  }
  if (rootGeos.length) {
    const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
    const m = new THREE.Mesh(mergeGeometries(rootGeos, false), rootMat);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    for (const g of rootGeos) g.dispose();
  }
  // Photographed root clusters at the giants' feet and the walls'.
  const rootSpots = [];
  for (const g of giants) for (let k = 0; k < 3; k++) {
    const a = r() * 6.28;
    const x = g.x + Math.cos(a) * (g.r * 2 + 1);
    const z = g.z + Math.sin(a) * (g.r * 2 + 1);
    rootSpots.push(tf(x, H(x, z) - 0.1, z, 0, a, 0, 2, 2, 2));
  }
  jobs.push(props.scatter('root_cluster_01', rootSpots, { dist: 45, shadows: false, onMaterial: (m) => moss(m, 0.5) }));
  const cover = new Cover({ heightTex: world.heightTex, splat: world.splat, noise: world.noise, settings, heightAt: world.grid?.at ?? H });
  scene.add(cover.group);
  world.cover = cover;
  await Promise.all(jobs);
  world.updaters.push((dt, t, camera, focus) => {
    cover.update(camera);
    // Draw distances from the power settings (WyldhuntGame.applyPower).
    const lim = world.limits ?? {};
    props.update(camera, focus, lim.far ?? Infinity);
    field.update(camera, focus, { nearDist: 90, farDist: Math.min(600, lim.treeFar ?? Infinity), shadowDist: 80 });
  });
  world.disposers.push(() => {
    props.dispose();
    field.dispose();
    cover.dispose();
  });
  void waterAt;
}
