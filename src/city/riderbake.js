import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { FRAMES, VIEWS, CELL, COLS, PPM, GROUND, TILT_CAM, CHARACTERS } from './toon.js';

/**
 * The riders, drawn as illustration from 3D: each is a real-proportioned
 * young adult (Quaternius' Ultimate Modular Men and Women, CC0) dressed in
 * their own colours, with what makes them them added on — a ponytail or twin
 * buns blowing back, a helmet, a cap, headphones, a shirt's hem fluttering —
 * posed on a bike of our own (legs reaching for the
 * pedals, hands for the grips, standing to sprint, tumbling off, both arms
 * up at the finish), and rendered for every view and moment the race needs.
 *
 * Each picture is then drawn over as an illustration: two or three hard
 * bands of tone per material with a cool, hue-shifted shadow and a warm sun
 * from the upper left, a cool rim on the far edge, ink lines found from the
 * picture's depth and normals (heavier on the outline, thin on the folds and
 * creases), the colours pushed a little richer, and a fine paper grain. The
 * frames go into one atlas with the same layout as toon.js's painted ones,
 * so ToonRider shows either. Without the models (they're in the library's
 * inbox, not fetched by itself) the race uses the painted riders instead.
 *
 *   const atlas = await bakeRacer('haru');   // null if it can't
 */

const PACK = {
  women: './library/inbox/Ultimate Modular Women - April 2022/Individual Characters/glTF/',
  men: './library/inbox/Ultimate Modular Men- Feb 2022/Individual Characters/glTF/'
};

/** Who wears what: the base model, its materials' new colours, and what is added. */
export const LOOKS = {
  haru: { pack: 'women', file: 'Casual', height: 1.66, recolor: { White: '#f4f2ec', Orange: '#2f4a7a', Grey: '#e8693a', Hair_Blond: '#3a2620', Hair_Brown: '#3a2620' }, hair: 'ponytail', billow: '#f4f2ec' },
  taeo: { pack: 'men', file: 'Casual_Hoodie', height: 1.78, recolor: { Purple: '#c8322b', LightBlue: '#2b2f3a', White: '#f2f0ea' }, headphones: '#f2f0ea', billow: '#c8322b' },
  sora: { pack: 'women', file: 'Worker', height: 1.63, recolor: { Worker_Vest: '#3aa6c9', Worker_Yellow: '#f2c230', White: '#f4f2ec', DarkBrown: '#2a3550', Brown: '#24201c', Brown_02: '#e9e4da', Brown2: '#c9c4ba' }, billow: '#3aa6c9' },
  rio: { pack: 'men', file: 'Casual_2', height: 1.82, recolor: { LightBrown: '#1d1f24', Red_Dark: '#e9d9a8', LightBlue: '#2a3550', White: '#c9ccd1' }, cap: '#1f3b6b' },
  dami: { pack: 'women', file: 'Suit', height: 1.64, recolor: { Black: '#5d6b3a', White: '#f2f0ea', Hair_Blond: '#5a3420', Hair_Brown: '#5a3420' }, byMesh: { Cube053: { Black: '#2b2f3a' }, Cube054: { Black: '#efe9df' } }, hair: 'buns', headphones: '#ff7aa8', billow: '#5d6b3a' },
  hajin: { pack: 'men', file: 'Beach', height: 1.76, recolor: { LightBrown: '#f2f0ea', Red_Dark: '#2f6fc0', Earrings: '#e8b53a' }, shoes: '#f2f0ea', billow: '#f2f0ea' }
};

/** Where the base models come from, for the credits. */
export const BAKE_CREDIT = 'Riders: Ultimate Modular Men & Women by Quaternius (CC0), drawn over in the game';

const smoothed = new Map();
/** A model's faceted geometry welded and smoothed (they have flat colours, no textures to keep). */
function smooth(geo) {
  if (!smoothed.has(geo)) {
    const g = geo.clone();
    g.deleteAttribute('normal');
    for (const name of Object.keys(g.attributes)) if (/^(uv|uv1|uv2|tangent|color)$/.test(name)) g.deleteAttribute(name);
    const welded = mergeVertices(g, 1e-4);
    welded.computeVertexNormals();
    smoothed.set(geo, welded);
  }
  return smoothed.get(geo);
}

const loader = new GLTFLoader();
const files = new Map();
const load = (url) => {
  if (!files.has(url)) files.set(url, loader.loadAsync(url).catch((e) => (console.info(`[riders] ${url}: ${e?.message ?? e}`), null)));
  return files.get(url);
};

/* ------------------------------------------------------------ materials */

/** A surface for the painted look: soft, matt, with a cool rim on the far edge. */
function toon(color) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0 });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      {
        float rim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.5);
        totalEmissiveRadiance += vec3(0.62, 0.78, 1.0) * rim * 0.28 * (0.35 + diffuseColor.rgb);
      }`
    );
  };
  return m;
}

/* ------------------------------------------------------------- the bike */

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const R = 0.34;
const BIKE = { rear: V3(0, R, 0.52), front: V3(0, R, -0.53), bb: V3(0, 0.29, 0.05), seat: V3(0, 0.97, 0.24), headTop: V3(0, 0.9, -0.37), headLow: V3(0, 0.72, -0.41) };

function tube(a, b, r, mat, seg = 8) {
  const d = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), seg), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize());
  return m;
}

/** A plain bike in a colour, in the style of the riders (toon materials); the crank turned to `crank`. */
function bikeModel(kind, color) {
  const g = new THREE.Group();
  const paint = toon(color);
  const dark = toon('#26272c');
  const metal = toon('#b9bdc4');
  const tyre = toon('#2a2a30');
  const B = BIKE;
  const step = kind === 'city';
  const drop = kind === 'road';
  const fat = kind === 'trail';
  const seatTop = V3(0, step ? 0.78 : 0.84, 0.2);
  g.add(tube(B.bb, B.headLow, 0.022, paint), tube(B.bb, seatTop, 0.019, paint), tube(B.headLow, B.headTop, 0.024, paint));
  g.add(step ? tube(V3(0, 0.42, 0.08), V3(0, 0.64, -0.4), 0.019, paint) : tube(V3(0, seatTop.y - 0.03, seatTop.z), V3(0, B.headTop.y - 0.04, B.headTop.z), 0.018, paint));
  for (const s of [-1, 1]) {
    g.add(tube(V3(s * 0.03, B.bb.y, B.bb.z), V3(s * 0.06, R, B.rear.z), 0.011, paint), tube(V3(s * 0.02, seatTop.y - 0.04, seatTop.z), V3(s * 0.06, R, B.rear.z), 0.01, paint));
    g.add(tube(V3(s * 0.05, B.headLow.y, B.headLow.z), V3(s * 0.05, R, B.front.z), fat ? 0.018 : 0.012, fat ? dark : paint));
  }
  g.add(tube(seatTop, V3(0, B.seat.y - 0.05, B.seat.z), 0.012, metal));
  const saddle = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.18, 4, 10).rotateX(Math.PI / 2).scale(step ? 1.5 : 1, 0.55, 1), dark);
  saddle.position.set(0, B.seat.y - 0.02, B.seat.z - 0.02);
  g.add(saddle);
  // Wheels: tyre, rim, a few spokes.
  for (const at of [B.rear, B.front]) {
    const w = new THREE.Group();
    w.add(new THREE.Mesh(new THREE.TorusGeometry(R - (fat ? 0.03 : 0.018), fat ? 0.034 : 0.019, 8, 40).rotateY(Math.PI / 2), tyre));
    w.add(new THREE.Mesh(new THREE.TorusGeometry(R - 0.045, kind === 'messenger' ? 0.022 : 0.008, 6, 40).rotateY(Math.PI / 2), kind === 'messenger' ? paint : metal));
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      w.add(tube(V3(0, 0, 0), V3(0, Math.sin(a) * (R - 0.05), Math.cos(a) * (R - 0.05)), 0.0025, metal, 3));
    }
    w.position.copy(at);
    g.add(w);
  }
  // Bars and stem.
  const bar = drop ? V3(0, 0.9, -0.48) : step ? V3(0, 0.98, -0.4) : V3(0, 0.94, -0.46);
  g.add(tube(B.headTop, bar, 0.014, metal));
  const gw = step ? 0.25 : drop ? 0.2 : 0.3;
  if (drop) {
    g.add(tube(V3(-0.2, bar.y, bar.z), V3(0.2, bar.y, bar.z), 0.013, dark));
    for (const s of [-1, 1]) g.add(tube(V3(s * 0.2, bar.y, bar.z), V3(s * 0.2, bar.y - 0.03, bar.z - 0.08), 0.013, dark), tube(V3(s * 0.2, bar.y - 0.03, bar.z - 0.08), V3(s * 0.2, bar.y - 0.15, bar.z - 0.06), 0.013, dark));
  } else g.add(tube(V3(-gw, bar.y + 0.02, bar.z + (step ? 0.1 : 0)), V3(gw, bar.y + 0.02, bar.z + (step ? 0.1 : 0)), 0.013, step ? metal : dark));
  if (kind === 'city') {
    const basket = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.22, 0.26, 2, 0.03), toon('#c99a5e'));
    basket.position.set(0, 0.86, -0.6);
    g.add(basket);
    for (const s of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.TorusGeometry(R + 0.04, 0.012, 4, 20, 1.8).rotateY(Math.PI / 2), paint);
      f.position.copy(s > 0 ? B.rear : B.front);
      f.rotation.x = s > 0 ? -0.3 : 1.2;
      g.add(f);
    }
  }
  const cranks = new THREE.Group();
  cranks.position.copy(B.bb);
  cranks.add(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 4, 24).rotateY(Math.PI / 2).translate(0.06, 0, 0), metal));
  for (const s of [1, -1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.03, 0.19).translate(0, 0, s * 0.085), metal);
    arm.position.x = s * 0.08;
    const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.07), dark);
    pedal.position.set(s * 0.12, 0, s * 0.17);
    pedal.userData.level = true;
    cranks.add(arm, pedal);
  }
  g.add(cranks);
  g.userData = { cranks, grips: [V3(-gw, bar.y + (drop ? -0.03 : 0.02), bar.z + (step ? 0.1 : drop ? -0.06 : 0)), V3(gw, bar.y + (drop ? -0.03 : 0.02), bar.z + (step ? 0.1 : drop ? -0.06 : 0))] };
  g.traverse((o) => o.isMesh && (o.frustumCulled = false));
  return g;
}

/* ------------------------------------------------------------- a rider */

const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _v = new THREE.Vector3();

/** Turn a bone so its length (local +y) points along a world direction. */
function aimY(bone, dir) {
  bone.updateWorldMatrix(true, false);
  const world = bone.getWorldQuaternion(new THREE.Quaternion());
  const cur = V3(0, 1, 0).applyQuaternion(world).normalize();
  _q.setFromUnitVectors(cur, dir.clone().normalize());
  world.premultiply(_q);
  const parent = bone.parent.getWorldQuaternion(_q2).invert();
  bone.quaternion.copy(parent.multiply(world));
  bone.updateWorldMatrix(false, true);
}

/** Two bones from A reaching T, the middle bending towards `pole` (world). */
function twoBone(upper, lower, T, l1, l2, pole) {
  const A = upper.getWorldPosition(new THREE.Vector3());
  const d = T.clone().sub(A);
  const dist = Math.max(0.01, Math.min(l1 + l2 - 1e-3, d.length()));
  const u = d.normalize();
  const along = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const p = pole.clone().addScaledVector(u, -pole.dot(u)).normalize();
  const knee = A.clone().addScaledVector(u, along).addScaledVector(p, h);
  aimY(upper, knee.clone().sub(A));
  aimY(lower, A.clone().addScaledVector(u, dist).sub(knee));
  return knee;
}

class Model {
  constructor(gltf, look) {
    this.look = look;
    this.root = new THREE.Group();
    this.body = SkeletonUtils.clone(gltf.scene);
    this.root.add(this.body);
    // Facing −z, to height.
    this.body.rotation.y = Math.PI;
    const box = new THREE.Box3().setFromObject(this.body);
    this.body.scale.multiplyScalar(look.height / (box.max.y - box.min.y));
    this.root.updateMatrixWorld(true);
    this.body.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      const name = o.material?.name ?? '';
      // Some colours by the part they're on (trousers and a jacket can share one material in the file).
      const part = Object.entries(look.byMesh ?? {}).find(([m]) => o.name.startsWith(m) || o.parent?.name.startsWith(m))?.[1];
      const hex = part?.[name] ?? look.recolor?.[name] ?? (name === 'Skin' ? '#f0c8a8' : name === 'Skin_Darker' ? '#e0b28f' : null);
      const col = hex ? new THREE.Color(hex) : o.material.color.clone();
      if (look.shoes && /Brown|Grey/.test(name) && o.name.includes('Feet')) col.set(look.shoes);
      o.material = toon(col);
      o.geometry = smooth(o.geometry);
    });
    const bone = (n) => this.body.getObjectByName(n);
    this.b = {
      root: bone('Root'), body: bone('Body'), hips: bone('Hips'), abdomen: bone('Abdomen'), torso: bone('Torso'), chest: bone('Chest'), neck: bone('Neck'), head: bone('Head'),
      upperL: bone('UpperLegL'), lowerL: bone('LowerLegL'), footL: bone('FootL'), upperR: bone('UpperLegR'), lowerR: bone('LowerLegR'), footR: bone('FootR'),
      armL: bone('UpperArmL'), foreL: bone('LowerArmL'), wristL: bone('WristL'), armR: bone('UpperArmR'), foreR: bone('LowerArmR'), wristR: bone('WristR')
    };
    this.ok = Object.values(this.b).every(Boolean);
    if (!this.ok) return;
    this.rest = [];
    this.body.traverse((o) => o.isBone && this.rest.push([o, o.position.clone(), o.quaternion.clone()]));
    const W = (o) => o.getWorldPosition(new THREE.Vector3());
    this.len = {
      thigh: W(this.b.upperL).distanceTo(W(this.b.lowerL)),
      shin: W(this.b.lowerL).distanceTo(W(this.b.footL)),
      upper: W(this.b.armL).distanceTo(W(this.b.foreL)),
      fore: W(this.b.foreL).distanceTo(W(this.b.wristL))
    };
    this.hipY = W(this.b.body).y;
    this.extras = this._extras();
  }

  /** What's added: hair, helmet or cap, headphones, a shirt's hem fluttering. */
  _extras() {
    const L = this.look;
    const head = this.b.head;
    const chest = this.b.chest;
    const s = 1 / head.getWorldScale(_v).x; // undo the rig's scale: extras are built in metres
    const out = { head: new THREE.Group(), chest: new THREE.Group(), hair: [], cloth: [] };
    out.head.scale.setScalar(s);
    out.chest.scale.setScalar(1 / chest.getWorldScale(_v).x);
    head.add(out.head);
    chest.add(out.chest);
    // The head bone's frame, in metres: up is +y, the face is +z (the rig faces +z).
    const hair = toon(L.recolor?.Hair_Brown ?? L.recolor?.Hair_Blond ?? '#2a1d16');
    if (L.hair === 'ponytail') {
      // A tie at the back of the head and a tail of five pieces, blown back.
      let parent = out.head;
      const tie = new THREE.Group();
      tie.position.set(0, 0.14, -0.1);
      out.head.add(tie);
      parent = tie;
      for (let k = 0; k < 5; k++) {
        const seg = new THREE.Group();
        const r = 0.045 - k * 0.006;
        const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, 0.07, 4, 8).translate(0, -0.055, 0), hair);
        seg.add(m);
        seg.position.y = k ? -0.1 : 0;
        parent.add(seg);
        out.hair.push(seg);
        parent = seg;
      }
    } else if (L.hair === 'buns') {
      for (const x of [-0.08, 0.08]) {
        const bun = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), hair);
        bun.position.set(x, 0.2, -0.02);
        out.head.add(bun);
      }
    }
    if (L.helmet) {
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.135, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(1, 0.9, 1.15), toon(L.helmet));
      shell.position.set(0, 0.11, -0.01);
      out.head.add(shell);
      for (const x of [-0.05, 0.05]) {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.16), toon('#2a2a30'));
        vent.position.set(x, 0.225, -0.01);
        out.head.add(vent);
      }
    }
    if (L.cap) {
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.118, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), toon(L.cap));
      crown.position.set(0, 0.12, 0);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.012, 16, 1, false, 0, Math.PI).scale(1, 1, 1.4), toon(L.cap));
      brim.position.set(0, 0.125, -0.1); // worn backwards
      brim.rotation.y = Math.PI / 2;
      out.head.add(crown, brim);
    }
    if (L.headphones) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.012, 6, 20, Math.PI), toon(L.headphones));
      band.position.set(0, 0.1, 0);
      const cupG = new THREE.CylinderGeometry(0.045, 0.045, 0.035, 14).rotateZ(Math.PI / 2);
      out.head.add(band);
      for (const x of [-0.125, 0.125]) {
        const cup = new THREE.Mesh(cupG, toon(L.headphones));
        cup.position.set(x, 0.1, 0);
        out.head.add(cup);
      }
    }
    // The chest bone's frame: up +y, back is −z.
    if (L.billow) {
      // The loose shirt's back, blowing out behind: a cloth of three hinged strips.
      let parent = out.chest;
      const mat = toon(L.billow);
      mat.side = THREE.DoubleSide;
      for (let k = 0; k < 2; k++) {
        const seg = new THREE.Group();
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.3 - k * 0.03, 0.09).translate(0, -0.045, 0), mat);
        seg.add(cloth);
        seg.position.set(0, k ? -0.09 : -0.3, k ? 0 : -0.1);
        parent.add(seg);
        out.cloth.push(seg);
        parent = seg;
      }
    }
    return out;
  }

  reset() {
    for (const [o, p, q] of this.rest) {
      o.position.copy(p);
      o.quaternion.copy(q);
    }
    this.root.updateMatrixWorld(true);
  }

  /** The wind on hair and cloth: blown back (world +z, the bike's back) by `gust`, beating with `phase`. */
  wind(gust, phase) {
    const back = V3(0, -0.35 + gust * 0.25, 1).normalize();
    this.extras.hair.forEach((seg, k) => {
      const wave = Math.sin(phase * Math.PI * 2 + k * 1.1) * 0.25 * gust;
      const dir = V3(wave * 0.4, -1 + gust * 0.75, gust * 1.2 + 0.2).normalize();
      aimY(seg, dir.negate().negate().multiplyScalar(-1));
      void back;
    });
    this.extras.cloth.forEach((seg, k) => {
      const flap = Math.sin(phase * Math.PI * 2 + k * 1.4) * 0.3 * gust;
      const dir = V3(0, -1 + gust * 0.35 + flap * 0.3, 0.15 + gust * 0.7);
      aimY(seg, dir.normalize().multiplyScalar(-1));
    });
  }

  /** Set where a bone of the root chain goes, in the world (the hips: Body under Root). */
  _placeBody(world) {
    const local = this.b.body.parent.worldToLocal(world.clone());
    this.b.body.position.copy(local);
    this.root.updateMatrixWorld(true);
  }

  _foot(foot, at, pitch = 0) {
    const local = foot.parent.worldToLocal(at.clone());
    foot.position.copy(local);
    foot.rotateX(pitch);
    foot.updateWorldMatrix(false, true);
  }

  /** On the bike: hips on the saddle (up and forward standing), feet on the pedals, hands on the grips. */
  ride(bike, { crank = 0, stand = 0, brake = false, tilt = 0.5 } = {}) {
    this.reset();
    const L = this.len;
    const CR = 0.17;
    const pedals = [BIKE.bb.clone().add(V3(-0.11, -Math.sin(crank) * CR, -Math.cos(crank) * CR)), BIKE.bb.clone().add(V3(0.11, Math.sin(crank) * CR, Math.cos(crank) * CR))];
    const reach = L.thigh + L.shin;
    const hip = BIKE.seat.clone().add(V3(Math.sin(crank) * 0.04 * stand, 0.05 + (reach - 0.88) * 0.55 + 0.14 * stand, -0.2 * stand));
    this._placeBody(hip);
    const t = tilt + stand * 0.3 - (brake ? 0.2 : 0);
    const up = V3(0, Math.cos(t), -Math.sin(t));
    for (const b of [this.b.abdomen, this.b.torso, this.b.chest]) aimY(b, up);
    aimY(this.b.neck, V3(0, 1, -Math.max(0, t - 0.6) * 0.3));
    aimY(this.b.head, V3(0, 1, Math.max(0, t - 0.4) * 0.6));
    // Legs: the foot bone sits at the pedal, knees forward.
    for (const [i, side] of [[0, 'L'], [1, 'R']]) {
      const s = side === 'L' ? -1 : 1;
      const ankle = pedals[side === 'L' ? 0 : 1].clone().add(V3(0, 0.07, 0.03));
      twoBone(this.b[`upper${side}`], this.b[`lower${side}`], ankle, L.thigh, L.shin, V3(s * 0.15, 0.3, -1));
      this._foot(this.b[`foot${side}`], ankle);
      void i;
    }
    // Arms: to the grips, elbows out and a little bent.
    const grips = bike.userData.grips;
    for (const side of ['L', 'R']) {
      const s = side === 'L' ? -1 : 1;
      const g = grips[side === 'L' ? 0 : 1];
      twoBone(this.b[`arm${side}`], this.b[`fore${side}`], g, L.upper, L.fore, V3(s * 0.8, -0.4, 0.5));
    }
  }

  /** Off the bike, joints set by hand: a hip, the body's lean, where the hands and feet go. */
  pose({ hip, up, hands, feet, head = V3(0, 1, 0), knees = V3(0, 0.2, -1) }) {
    this.reset();
    this._placeBody(hip);
    for (const b of [this.b.abdomen, this.b.torso, this.b.chest]) aimY(b, up);
    aimY(this.b.neck, up);
    aimY(this.b.head, head);
    const L = this.len;
    for (const side of ['L', 'R']) {
      const i = side === 'L' ? 0 : 1;
      const s = side === 'L' ? -1 : 1;
      twoBone(this.b[`upper${side}`], this.b[`lower${side}`], feet[i], L.thigh, L.shin, knees.clone().add(V3(s * 0.2, 0, 0)));
      this._foot(this.b[`foot${side}`], feet[i]);
      twoBone(this.b[`arm${side}`], this.b[`fore${side}`], hands[i], L.upper, L.fore, V3(s * 0.8, -0.3, 0.3));
    }
  }
}

/* ------------------------------------------------------------ drawing */

const DRAW_FRAG = /* glsl */ `
  uniform sampler2D tColor;
  uniform vec2 uTexel;
  uniform float uSeed;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
  vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  void main() {
    // A Kuwahara filter: of the four quarters round each pixel, the colour of the calmest one —
    // flat strokes of paint that keep the edges between them.
    const int R = 5;
    vec3 m[4];
    vec3 s2[4];
    float aSum[4];
    for (int k = 0; k < 4; k++) { m[k] = vec3(0.0); s2[k] = vec3(0.0); aSum[k] = 0.0; }
    for (int j = -R; j <= R; j++) {
      for (int i = -R; i <= R; i++) {
        vec4 c = texture2D(tColor, vUv + vec2(float(i), float(j)) * uTexel);
        vec3 v = toSRGB(c.rgb) * c.a;
        float w = c.a;
        if (i <= 0 && j <= 0) { m[0] += v; s2[0] += v * v; aSum[0] += w; }
        if (i >= 0 && j <= 0) { m[1] += v; s2[1] += v * v; aSum[1] += w; }
        if (i <= 0 && j >= 0) { m[2] += v; s2[2] += v * v; aSum[2] += w; }
        if (i >= 0 && j >= 0) { m[3] += v; s2[3] += v * v; aSum[3] += w; }
      }
    }
    float best = 1e9;
    vec3 col = vec3(0.0);
    float n = float((R + 1) * (R + 1));
    for (int k = 0; k < 4; k++) {
      if (aSum[k] < 0.5) continue;
      vec3 mean = m[k] / aSum[k];
      vec3 var = abs(s2[k] / aSum[k] - mean * mean);
      float sv = var.r + var.g + var.b;
      if (sv < best) { best = sv; col = mean; }
    }
    float a = texture2D(tColor, vUv).a;
    // Soft painted edges: the outline feathered a little.
    float soft = 0.0;
    for (int i = 0; i < 8; i++) {
      float ang = float(i) * 0.785;
      soft += texture2D(tColor, vUv + vec2(cos(ang), sin(ang)) * uTexel * 1.5).a;
    }
    a = clamp(mix(a, soft / 8.0, 0.5) * 1.15, 0.0, 1.0);
    // Rich daylight colour, gently simplified, and a little brush grain.
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(l), col, 1.22);
    col = floor(col * 24.0 + 0.5) / 24.0;
    col += (hash(floor(vUv * 256.0)) - 0.5) * 0.025;
    gl_FragColor = vec4(col, a);
  }`;

class Painter {
  constructor() {
    this.size = 512;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(this.size, this.size, false);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    const rt = (depth) => {
      const t = new THREE.WebGLRenderTarget(this.size, this.size, { type: THREE.HalfFloatType, samples: 4 });
      if (depth) t.depthTexture = new THREE.DepthTexture(this.size, this.size);
      return t;
    };
    this.colorRT = rt(false);
    this.outRT = new THREE.WebGLRenderTarget(this.size, this.size);
    this.scene = new THREE.Scene();
    this.hemi = new THREE.HemisphereLight('#fff6e6', '#8a90c8', 1.6);
    this.sun = new THREE.DirectionalLight('#fff0d2', 2.1);
    this.scene.add(this.hemi, this.sun, this.sun.target);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 40);
    this.draw = new THREE.ShaderMaterial({
      uniforms: { tColor: { value: null }, uTexel: { value: new THREE.Vector2(1 / this.size, 1 / this.size) }, uSeed: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: DRAW_FRAG,
      depthTest: false,
      depthWrite: false,
      transparent: false,
      blending: THREE.NoBlending
    });
    this.quadScene = new THREE.Scene();
    this.quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.draw));
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.pixels = new Uint8Array(this.size * this.size * 4);
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = this.size;
    this.ctx = this.canvas.getContext('2d');
  }

  /** Frame the camera like the painted cells: `theta` round from behind, looking down a little; the ground on the cell's ground line. */
  aim(theta, { y = 0.95, width = CELL / PPM, ground = true } = {}) {
    const W = width;
    const c = this.camera;
    const dir = V3(Math.sin(theta) * Math.cos(TILT_CAM), Math.sin(TILT_CAM), Math.cos(theta) * Math.cos(TILT_CAM));
    c.position.copy(dir).multiplyScalar(12).add(V3(0, y, 0));
    c.up.set(0, 1, 0);
    c.lookAt(0, y, 0);
    // Where the ground under the bike lands: so many metres below the middle.
    const bottomPx = (CELL - GROUND) / PPM;
    const yGround = -y * Math.cos(TILT_CAM);
    c.left = -W / 2;
    c.right = W / 2;
    c.bottom = ground ? yGround - bottomPx : -W / 2;
    c.top = c.bottom + W;
    c.updateProjectionMatrix();
    // The sun from the upper left of the picture, a little in front.
    const right = V3(Math.cos(theta), 0, -Math.sin(theta));
    this.sun.position.copy(dir).multiplyScalar(4).addScaledVector(right, -5).add(V3(0, 8, 0));
  }

  /** Draw what is in `root` as an illustration, into a canvas (512 px). */
  shoot(root, seed = 0) {
    const r = this.renderer;
    this.scene.add(root);
    r.setRenderTarget(this.colorRT);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(this.scene, this.camera);
    this.scene.remove(root);
    this.draw.uniforms.tColor.value = this.colorRT.texture;
    this.draw.uniforms.uSeed.value = seed;
    r.setRenderTarget(this.outRT);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(this.quadScene, this.quadCam);
    r.readRenderTargetPixels(this.outRT, 0, 0, this.size, this.size, this.pixels);
    r.setRenderTarget(null);
    // Rows come bottom first.
    const img = this.ctx.createImageData(this.size, this.size);
    const row = this.size * 4;
    for (let y = 0; y < this.size; y++) img.data.set(this.pixels.subarray((this.size - 1 - y) * row, (this.size - y) * row), y * row);
    this.ctx.putImageData(img, 0, 0);
    return this.canvas;
  }
}

let painter = null;

/** The bike leant over on the ground (a crash): the bike's group turned onto its side. */
function lying(bike, side = 1) {
  bike.rotation.set(0, 0.3 * side, side * 1.45);
  bike.position.set(side * 0.35, 0.05, 0.1);
}

/**
 * Bake a rider's frames (FRAMES, toon.js) into an atlas canvas: { canvas, rows } — or null
 * when the models aren't there.
 */
export async function bakeRacer(id, { alt = null } = {}) {
  const look = LOOKS[id];
  const ch = CHARACTERS[id];
  if (!look || !ch) return null;
  const gltf = await load(`${PACK[look.pack]}${look.file}.gltf`);
  if (!gltf) return null;
  const model = new Model(gltf, alt ? { ...look, ...alt } : look);
  if (!model.ok) {
    console.info(`[riders] ${id}: the rig is missing ${Object.entries(model.b).filter(([, v]) => !v).map(([k]) => k).join(', ')}`);
    return null;
  }
  painter ??= new Painter();
  const bike = bikeModel(ch.bikeKind, alt?.bike ?? ch.bike);
  const tilt = { city: 0.3, road: 0.85, messenger: 0.62, trail: 0.5 }[ch.bikeKind] ?? 0.5;
  const stage = new THREE.Group();
  stage.add(bike, model.root);
  const rows = Math.ceil(FRAMES.length / COLS);
  const canvas = document.createElement('canvas');
  canvas.width = CELL * COLS;
  canvas.height = CELL * rows;
  const g = canvas.getContext('2d');
  g.imageSmoothingQuality = 'high';
  let n = 0;
  for (const [i, name] of FRAMES.entries()) {
    const m = /^(ride|stand|coast|brake)(\d)(?:_(\d))?$/.exec(name);
    bike.position.set(0, 0, 0);
    bike.rotation.set(0, 0, 0);
    model.root.position.set(0, 0, 0);
    model.root.rotation.set(0, 0, 0);
    let theta = Math.PI * 0.12;
    if (m) {
      theta = VIEWS[Number(m[2])];
      const f = Number(m[3] ?? 0);
      const crank = m[1] === 'coast' || m[1] === 'brake' ? Math.PI / 2 : (f / 4) * Math.PI * 2;
      bike.userData.cranks.rotation.x = -crank;
      for (const p of bike.userData.cranks.children) if (p.userData.level) p.rotation.x = crank;
      model.ride(bike, { crank, stand: m[1] === 'stand' ? 1 : 0, brake: m[1] === 'brake', tilt });
      model.wind(m[1] === 'stand' ? 1 : m[1] === 'ride' ? 0.7 : 0.45, f / 4);
    } else if (name.startsWith('tumble')) {
      // Thrown: the rider in the air, curled, arms out; the bike on its side.
      const k = Number(name.at(-1));
      theta = Math.PI * 0.6;
      lying(bike, 1);
      model.pose({ hip: V3(-0.2, 1.0, -0.2), up: V3(0.3, 0.6, -0.8), hands: [V3(-0.65, 1.6 + k * 0.1, -0.5), V3(0.45, 1.75 - k * 0.1, -0.7)], feet: [V3(-0.35, 0.65, 0.25), V3(0.1, 0.9, 0.35)], head: V3(0.2, 0.7, -0.7) });
      model.root.rotation.z = k ? 0.6 : -0.3;
      model.root.position.y = 0.2;
      model.wind(1, k * 0.5);
    } else if (name.startsWith('dizzy')) {
      const k = Number(name.at(-1));
      theta = Math.PI * 0.62;
      lying(bike, 1);
      bike.position.x = 0.75;
      model.pose({ hip: V3(-0.25, 0.14, 0), up: V3(0.04 * Math.sin(k * 3), 1, 0.2), hands: [V3(-0.5, 0.15, 0.15), V3(0.0, 1.35, -0.12)], feet: [V3(-0.38, 0.06, -0.6), V3(-0.12, 0.12, -0.55)], head: V3(0.15 * (k ? 1 : -1), 1, 0.1), knees: V3(0, 1, -0.4) });
      model.wind(0.1, k * 0.5);
    } else if (name === 'getup') {
      theta = Math.PI * 0.62;
      bike.rotation.z = 0.25;
      model.pose({ hip: V3(-0.35, 0.7, 0.05), up: V3(0, 0.85, -0.5), hands: [V3(-0.25, 0.95, -0.35), V3(-0.3, 1.45, -0.1)], feet: [V3(-0.5, 0.08, -0.15), V3(-0.25, 0.08, 0.25)], knees: V3(0, 0.4, -1) });
      model.wind(0.2, 0);
    } else if (name.startsWith('win')) {
      // Standing astride the bike, both arms up, from behind — the shirt and hair in the wind.
      const k = Number(name.at(-1));
      theta = Math.PI * 0.1;
      const hipY = model.len.thigh + model.len.shin + 0.05;
      model.pose({ hip: V3(0, hipY, 0.15), up: V3(0, 1, 0.05), hands: [V3(-0.45 - k * 0.05, hipY + 1.15, 0.05), V3(0.45 + k * 0.05, hipY + 1.2, 0)], feet: [V3(-0.28, 0.08, 0.1), V3(0.28, 0.08, 0.15)], head: V3(0, 1, -0.25) });
      model.wind(0.9, k * 0.5);
    }
    stage.updateMatrixWorld(true);
    painter.aim(theta);
    const pic = painter.shoot(stage, i * 0.37);
    g.drawImage(pic, (i % COLS) * CELL, Math.floor(i / COLS) * CELL, CELL, CELL);
    // Stars round a dazed head (drawn on top: the picture's own pops).
    if (name.startsWith('dizzy') || name.startsWith('tumble')) stars(g, (i % COLS) * CELL + CELL * 0.42, Math.floor(i / COLS) * CELL + CELL * (name.startsWith('dizzy') ? 0.42 : 0.3), Number(name.at(-1)));
    // Let the page breathe every few frames.
    if (++n % 6 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  return { canvas, rows, ch, baked: true };
}

/** A portrait for the menu: the rider from the front quarter, head and shoulders, drawn the same way. */
export async function bakePortrait(id, size = 132) {
  const look = LOOKS[id];
  const ch = CHARACTERS[id];
  const gltf = look && (await load(`${PACK[look.pack]}${look.file}.gltf`));
  if (!gltf) return null;
  const model = new Model(gltf, look);
  if (!model.ok) return null;
  painter ??= new Painter();
  const bike = bikeModel(ch.bikeKind, ch.bike);
  model.ride(bike, { crank: Math.PI / 2, tilt: 0.35 });
  model.wind(0.5, 0.25);
  const stage = new THREE.Group();
  stage.add(bike, model.root);
  stage.updateMatrixWorld(true);
  // Head and shoulders, close.
  const head = model.b.head.getWorldPosition(new THREE.Vector3());
  stage.position.set(-head.x, 0, -head.z);
  stage.updateMatrixWorld(true);
  painter.aim(Math.PI * 0.82, { y: head.y - 0.12, width: 0.95, ground: false });
  const pic = painter.shoot(stage, 1);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  c.getContext('2d').drawImage(pic, 0, 0, pic.width, pic.width, 0, 0, size, size);
  return c.toDataURL();
}

function stars(g, x, y, k) {
  for (let i = 0; i < 3; i++) {
    const a = k * 2.1 + (i / 3) * Math.PI * 2;
    const sx = x + Math.cos(a) * 30;
    const sy = y + Math.sin(a) * 8;
    const p = new Path2D();
    for (let j = 0; j < 10; j++) {
      const b = -Math.PI / 2 + (j * Math.PI) / 5;
      const r = j % 2 ? 3 : 7;
      if (j) p.lineTo(sx + Math.cos(b) * r, sy + Math.sin(b) * r);
      else p.moveTo(sx + Math.cos(b) * r, sy + Math.sin(b) * r);
    }
    p.closePath();
    g.fillStyle = ['#ffd23a', '#ff7aa8', '#8fd8ff'][i];
    g.fill(p);
    g.strokeStyle = '#2a2030';
    g.lineWidth = 1.4;
    g.stroke(p);
  }
}
