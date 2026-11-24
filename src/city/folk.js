import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { PEOPLE } from './streetAssets.js';

/**
 * Real people on the pavements near you: the Microsoft Rocketbox avatars
 * (MIT; fetched by scripts/library/streetfolk.mjs) — rigged, textured men
 * and women in everyday clothes, walking, standing about, texting, looking
 * round, cheering at the start — motion-captured clips on one shared biped
 * skeleton. StreetLife (life.js) keeps everyone's place and what they're
 * doing; this dresses the nearest of them as a real person each frame and
 * StreetLife draws only the far ones (as its light instanced figures).
 *
 *   const folk = new Folk(game);       // loads in the background
 *   folk.update(dt, people, camera);   // after StreetLife has moved everyone
 */

const ROOT = './library/rocketbox/';
/** How many real people at once, and how near (m): the rest are StreetLife's far figures. */
export const FOLK = { max: 32, near: 42, keep: 50 };
/** The walk clip's natural pace (m/s): the clip is sped up or slowed to match each walker's feet. */
const WALK_PACE = 1.3;

let shared = null;

/** Load the clips and every avatar once (in the background, one at a time). */
function loadShared() {
  if (shared) return shared;
  const state = { clips: null, avatars: [], ready: false, failed: false };
  shared = state;
  (async () => {
    try {
      const res = await fetch(`${ROOT}clips.json`);
      if (!res.ok) throw new Error('no clips');
      const json = await res.json();
      state.clips = Object.fromEntries(Object.entries(json).map(([k, c]) => [k, THREE.AnimationClip.parse({ ...c, tracks: c.tracks.filter((t) => t.name.startsWith('Bip01_') || t.name === 'Bip01.quaternion') })]));
    } catch {
      state.failed = true;
      return;
    }
    const tex = new THREE.TextureLoader();
    const loadTex = (url, srgb = true) =>
      new Promise((ok) => {
        tex.load(url, (t) => {
          if (srgb) t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 4;
          ok(t);
        }, undefined, () => ok(null));
      });
    for (const [id, , she, cards] of PEOPLE) {
      try {
        const res = await fetch(`${ROOT}${id}/${id}.fbx`);
        if (!res.ok) continue;
        const buf = await res.arrayBuffer();
        // (The FBX names TGA textures we don't fetch; FBXLoader stands in a blank one — replaced just below.)
        const warn = console.warn;
        console.warn = () => {};
        let model;
        try {
          model = new FBXLoader().parse(buf, '');
        } finally {
          console.warn = warn;
        }
        const [body, head, opacity] = await Promise.all([loadTex(`${ROOT}${id}/body.png`), loadTex(`${ROOT}${id}/head.png`), cards ? loadTex(`${ROOT}${id}/opacity.png`) : null]);
        // (FBXLoader turns the file's ambient colour into a light: none of that in the street)
        const extras = [];
        model.traverse((o) => (o.isLight || o.isCamera) && extras.push(o));
        for (const o of extras) o.removeFromParent();
        dress(model, { body, head, opacity });
        // To size (centimetres to metres), feet at 0, facing −z like everyone in the city.
        const box = new THREE.Box3().setFromObject(model);
        const h = box.max.y - box.min.y;
        const holder = new THREE.Group();
        model.scale.multiplyScalar(1 / 100);
        model.position.y = -box.min.y / 100;
        model.rotation.y = Math.PI;
        holder.add(model);
        if (!state.avatars.length) squareClips(state.clips, model.getObjectByName('Bip01'));
        state.avatars.push({ id, she, holder, height: h / 100 });
        await new Promise((ok) => setTimeout(ok, 0));
      } catch {
        /* one avatar that won't load: the rest still walk */
      }
    }
    state.ready = state.avatars.length > 0;
  })();
  return state;
}

/**
 * The clips were captured walking whichever way the studio faced: turn each
 * clip's root (Bip01) so it starts facing the way the avatar stands at rest,
 * keeping its sway and tilt. The root's travel (motion extraction) is dropped.
 */
function squareClips(clips, bip) {
  if (!bip) return;
  const restInv = bip.quaternion.clone().invert();
  const q = new THREE.Quaternion();
  const fix = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (const clip of Object.values(clips)) {
    const tr = clip.tracks.find((t) => t.name === 'Bip01.quaternion');
    if (!tr) continue;
    q.fromArray(tr.values, 0);
    v.set(0, 0, 1).applyQuaternion(q.clone().multiply(restInv));
    fix.setFromAxisAngle(up, -Math.atan2(v.x, v.z));
    for (let i = 0; i < tr.values.length; i += 4) {
      q.fromArray(tr.values, i).premultiply(fix);
      q.toArray(tr.values, i);
    }
  }
}

/** Lit, textured materials in place of the FBX's Phong: skin and cloth, hair and lashes cut out. */
function dress(model, { body, head, opacity }) {
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    o.frustumCulled = false;
    const mats = [].concat(o.material).map((m) => {
      const name = m.name ?? '';
      if (/opacity/i.test(name)) {
        return new THREE.MeshStandardMaterial({ name, map: opacity, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.7, metalness: 0 });
      }
      const isHead = /head/i.test(name);
      return new THREE.MeshStandardMaterial({ name, map: isHead ? head : body, roughness: isHead ? 0.62 : 0.82, metalness: 0, envMapIntensity: 0.6 });
    });
    o.material = Array.isArray(o.material) ? mats : mats[0];
  });
}

export class Folk {
  /** @param {any} game the SeoulGame */
  constructor(game) {
    this.g = game;
    this.s = loadShared();
    this.group = new THREE.Group();
    this.group.name = 'folk';
    game.scene.add(this.group);
    this.pool = [];
    this.active = [];
  }

  get ready() {
    return this.s.ready;
  }

  /** A real person for someone: from the pool if one's free, else a new one (up to FOLK.max). */
  _take(m) {
    const she = Boolean(m.she ??= Math.random() < 0.5);
    // Never twins side by side: the looks already worn within a few metres are avoided.
    const near = new Set(this.active.filter((q) => q.she === she && Math.hypot(q.m.x - m.x, q.m.z - m.z) < 8).map((q) => q.avatarIndex));
    let i = m.avatar != null && !near.has(m.avatar) ? this.pool.findIndex((p) => p.she === she && p.avatarIndex === m.avatar) : -1;
    if (i < 0) i = this.pool.findIndex((p) => p.she === she && !near.has(p.avatarIndex));
    let p;
    if (i >= 0) p = this.pool.splice(i, 1)[0];
    else if (this.active.length + this.pool.length < FOLK.max) p = this._make(she, m.avatar != null && !near.has(m.avatar) ? m.avatar : this._freshLook(she, near));
    else if ((i = this.pool.findIndex((q) => q.she === she)) >= 0) p = this.pool.splice(i, 1)[0];
    else if (this.pool.length) p = this.pool.shift();
    if (!p) return null;
    m.avatar = p.avatarIndex;
    p.m = m;
    p.root.visible = true;
    p.state = null;
    p.root.scale.setScalar(m.scale ?? 1);
    this.active.push(p);
    m.real = p;
    return p;
  }

  /** The look (avatar index among this gender's) worn least just now, and not by anyone in `near`. */
  _freshLook(she, near) {
    const n = this.s.avatars.filter((a) => a.she === she).length || this.s.avatars.length;
    const worn = Array.from({ length: n }, () => 0);
    for (const q of [...this.active, ...this.pool]) if (q.she === she && q.avatarIndex < n) worn[q.avatarIndex]++;
    let best = Math.floor(Math.random() * n);
    for (let k = 0; k < n; k++) {
      const j = (best + k) % n;
      if (!near.has(j) && (near.has(best) || worn[j] < worn[best])) best = j;
    }
    return best;
  }

  _make(she, want) {
    const list = this.s.avatars.filter((a) => a.she === she);
    const all = list.length ? list : this.s.avatars;
    const a = all[want != null && all[want] ? want : Math.floor(Math.random() * all.length)];
    const root = cloneSkinned(a.holder);
    this.group.add(root);
    const mixer = new THREE.AnimationMixer(root);
    const C = this.s.clips;
    const sx = she ? 'F' : 'M';
    const act = (name) => {
      const clip = C[`${name}${sx}`] ?? C[`${name}F`];
      if (!clip) return null;
      const x = mixer.clipAction(clip);
      x.play();
      x.setEffectiveWeight(0);
      return x;
    };
    const actions = { walk: act('walk'), idle: act('idle'), phone: act('phone'), look: act('look'), cheer: act('cheer') };
    // everyone a little out of step with everyone else
    for (const x of Object.values(actions)) if (x) x.time = Math.random() * x.getClip().duration;
    return { root, mixer, actions, she, avatarIndex: all.indexOf(a), state: null, m: null };
  }

  _release(p) {
    p.m.real = null;
    p.m = null;
    p.root.visible = false;
    this.active.splice(this.active.indexOf(p), 1);
    this.pool.push(p);
  }

  /**
   * Each frame, after StreetLife has moved everyone: the nearest people on foot
   * (and a race's fans) get a real body, posed by what they're doing.
   */
  update(dt, people, camera) {
    if (!this.s.ready) return;
    const cam = camera.position;
    // Let go of those gone far (or gone).
    for (const p of [...this.active]) {
      const m = p.m;
      if (!m || m.gone || Math.hypot(m.x - cam.x, m.z - cam.z) > FOLK.keep) this._release(p);
    }
    // The nearest without one, nearest first: a free body if there is one, else the body of whoever
    // has one furthest off (when they're well further off than this one).
    const want = [];
    for (const m of people) {
      if (m.real || !m.onFoot) continue;
      const d = Math.hypot(m.x - cam.x, m.z - cam.z);
      if (d < FOLK.near) want.push([d, m]);
    }
    want.sort((a, b) => a[0] - b[0]);
    for (const [d, m] of want) {
      if (this.active.length >= FOLK.max) {
        let far = null;
        let fd = 0;
        for (const p of this.active) {
          const pd = Math.hypot(p.m.x - cam.x, p.m.z - cam.z);
          if (pd > fd) {
            fd = pd;
            far = p;
          }
        }
        if (!far || fd < d + 6) break;
        this._release(far);
      }
      if (!this._take(m)) break;
    }
    for (const p of this.active) this._pose(p, dt);
  }

  _pose(p, dt) {
    const m = p.m;
    p.root.position.set(m.x, m.y + (m.footY ?? 0), m.z);
    p.root.rotation.y = m.heading;
    const stride = m.stride ?? 0;
    // What they're doing: walking, texting, cheering at a race, looking about, or just standing.
    let state = 'idle';
    if (m.kind === 'fan') state = (m.cheer ?? 0) > 0.5 ? 'cheer' : m.phone ? 'phone' : 'idle';
    else if (stride > 0.35) state = 'walk';
    else if (m.phone) state = 'phone';
    else if (m.waiting > 0 || m.look) state = 'look';
    const A = p.actions;
    if (!A[state]) state = A.idle ? 'idle' : 'walk';
    if (state !== p.state) {
      for (const [k, x] of Object.entries(A)) if (x) x.fadeTarget = k === state ? 1 : 0;
      p.state = state;
    }
    for (const x of Object.values(A)) {
      if (!x) continue;
      const w = x.getEffectiveWeight();
      const goal = x.fadeTarget ?? 0;
      x.setEffectiveWeight(w + (goal - w) * Math.min(1, dt * 5));
    }
    if (A.walk) A.walk.setEffectiveTimeScale(state === 'walk' ? Math.max(0.4, ((m.speed ?? 1.2) * Math.max(0.3, stride)) / WALK_PACE) : 1);
    p.mixer.update(dt);
  }

  dispose() {
    this.g.scene.remove(this.group);
    for (const p of [...this.active]) this._release(p);
  }
}
