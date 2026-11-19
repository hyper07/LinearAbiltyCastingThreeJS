/**
 * The creatures in the vale: the wild ones at home in their habitats (a
 * mind from brains.js, a body from creatures/body.js), your friends at your
 * heels or resting in the Kith Garden, and the treats you toss — which fly,
 * bounce, lie in the grass for a nose to find, and get eaten.
 *
 * The bodies are sculpted once per species and shared (the geometry), so
 * sixteen wild creatures and three friends cost one sculpt each kind. Far
 * creatures are hidden and their bodies not animated; their minds still run
 * (slower), so the vale is alive when you get there.
 */
import * as THREE from 'three';
import { CreatureBrain, FriendBrain } from './brains.js';
import { makeCreature, creatureGeometry } from './creatures/body.js';
import { HABITATS, GARDEN, EXTENT, VILLAGE } from './map.js';
import { SPECIES, SPECIES_ORDER } from './rules.js';
import { waterAt } from './heights.js';
import { grassPushers } from './grass.js';
import { painterly } from './paint.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/** A treat as a little object in the world. */
function treatMesh(kind) {
  const g = new THREE.Group();
  if (kind === 'berry') {
    const m = painterly(new THREE.MeshStandardMaterial({ color: 0xd8345a, roughness: 0.35, emissive: 0x300810 }), { rim: 0.6 });
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), m);
      b.position.set(Math.cos(i * 1.7) * 0.05, 0.05 + (i === 3 ? 0.05 : 0), Math.sin(i * 1.7) * 0.05);
      g.add(b);
    }
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4).scale(1.4, 0.3, 0.8), painterly(new THREE.MeshStandardMaterial({ color: 0x4a7a2a })));
    leaf.position.y = 0.13;
    g.add(leaf);
  } else if (kind === 'seed') {
    const pouch = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8).scale(1, 0.8, 1), painterly(new THREE.MeshStandardMaterial({ color: 0xc8a870, roughness: 0.9 })));
    pouch.position.y = 0.07;
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.06, 8), pouch.material);
    top.position.y = 0.16;
    g.add(pouch, top);
    const sm = painterly(new THREE.MeshStandardMaterial({ color: 0xf0c040 }));
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 4).scale(1, 0.6, 1.4), sm);
      s.position.set(Math.cos(i) * 0.12, 0.015, Math.sin(i) * 0.12);
      g.add(s);
    }
  } else {
    const m = new THREE.MeshStandardMaterial({ color: 0x9ae8ff, roughness: 0.15, emissive: 0x2a90b8, emissiveIntensity: 1.1 });
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), m);
      c.scale.set(0.6, 1.6, 0.6);
      c.position.set((i - 1) * 0.06, 0.09, (i % 2) * 0.04);
      c.rotation.z = (i - 1) * 0.35;
      g.add(c);
    }
  }
  g.traverse((o) => (o.castShadow = true));
  return g;
}

export class Fauna {
  /** `keep(x, z)`: only the wild ones whose homes are in the zone being built (shared/zones). */
  constructor({ scene, settings, ground, colliders, slope, vfx, keep = () => true }) {
    this.keep = keep;
    this.scene = scene;
    this.settings = settings;
    this.ground = ground;
    this.colliders = colliders;
    this.slope = slope;
    this.vfx = vfx;
    this.wild = [];
    this.friends = [];
    this.resting = [];
    this.treats = [];
    this.respawns = [];
    this.uid = 0;
    this.t = 0;
  }

  /** Sculpt every species (once) and set the wild ones at home. */
  async build(yieldFn = async () => {}) {
    for (const sp of SPECIES_ORDER) {
      creatureGeometry(sp, this.settings.sculpt);
      await yieldFn(sp);
    }
    let seed = 1;
    for (const [sp, h] of Object.entries(HABITATS)) for (const home of h.homes) if (this.keep(home[0], home[1])) this.spawn(sp, home, h.roam, seed++);
      else seed++;
  }

  makeBody(species, seed) {
    const c = makeCreature(species, { res: this.settings.sculpt, fur: this.settings.fur, seed });
    this.scene.add(c.group);
    return c;
  }

  spawn(species, home, roam, seed) {
    const brain = new CreatureBrain({ species, home, roam, seed, id: `${species}-${seed}-${this.uid++}` });
    const body = this.makeBody(species, seed);
    const w = { species, brain, body, home, roam, seed };
    this.place(w);
    this.wild.push(w);
    return w;
  }

  place(w, y = null) {
    const b = w.brain;
    w.body.group.position.set(b.x, y ?? this.ground(b.x, b.z), b.z);
    w.body.group.rotation.y = b.yaw;
  }

  /** Can a creature step here? Firm, not steep, not deep water, not into a wall; wild ones stay near home and out of the village. */
  walkable(x, z, brain, from) {
    if (x < EXTENT.x0 + 8 || x > EXTENT.x1 - 8 || z < EXTENT.z0 + 8 || z > EXTENT.z1 - 8) return false;
    if (this.slope(x, z) > 0.85) return false;
    const deep = waterAt(x, z) - this.ground(x, z);
    if (deep > (brain.species === 'pebbleroll' ? 0.5 : 0.3)) return false;
    if (brain instanceof CreatureBrain) {
      if (brain.garden) return Math.hypot(x - GARDEN.x, z - GARDEN.z) < GARDEN.r - 0.8;
      if (x > VILLAGE.x0 - 2 && x < VILLAGE.x1 + 2 && z > VILLAGE.z0 - 2 && z < VILLAGE.z1 + 2) return false;
      if (Math.hypot(x - brain.home.x, z - brain.home.z) > brain.roam * 3.2 && Math.hypot(x - brain.home.x, z - brain.home.z) > Math.hypot((from?.x ?? brain.x) - brain.home.x, (from?.z ?? brain.z) - brain.home.z)) return false;
    }
    const [px, pz] = this.colliders.pushOut(x, z, 0.3, this.ground(x, z), 1);
    return Math.hypot(px - x, pz - z) < 0.05;
  }

  /* ------------------------------------------------------------ treats */

  /** Toss a treat from `from` (Vector3) with velocity `vel` (Vector3). */
  toss(kind, from, vel) {
    const mesh = treatMesh(kind);
    mesh.position.copy(from);
    this.scene.add(mesh);
    const t = { id: `t${this.uid++}`, kind, mesh, v: vel.clone(), flying: true, x: from.x, z: from.z, life: 70, bounced: false, spin: V(Math.random() * 8, Math.random() * 8, 0) };
    this.treats.push(t);
    return t;
  }

  removeTreat(t) {
    t.mesh.removeFromParent();
    this.treats = this.treats.filter((x) => x !== t);
  }

  /* ------------------------------------------------------------ friends */

  /** A wild creature becomes a friend (it keeps its body). A new wild one will turn up at its home later. */
  befriend(w, { uid, name, follow = true }) {
    this.wild = this.wild.filter((x) => x !== w);
    this.respawns.push({ species: w.species, home: w.home, roam: w.roam, seed: w.seed + 100, t: 90 });
    return this.adopt(w.species, { uid, name, follow, body: w.body, x: w.brain.x, z: w.brain.z });
  }

  /** Bring a friend into the world (from a save, or just befriended). */
  adopt(species, { uid, name, follow = true, body = null, x = GARDEN.x, z = GARDEN.z }) {
    const b = body ?? this.makeBody(species, this.uid++ + 7);
    const f = { species, uid, name, body: b, follow };
    if (follow) {
      f.brain = new FriendBrain({ species, slot: this.friends.length, x, z, uid });
      this.friends.push(f);
    } else {
      f.brain = this.gardenBrain(species, uid);
      this.resting.push(f);
    }
    this.place(f);
    return f;
  }

  gardenBrain(species, uid) {
    const a = Math.random() * Math.PI * 2;
    const brain = new CreatureBrain({ species, home: [GARDEN.x + Math.cos(a) * 3, GARDEN.z + Math.sin(a) * 3], roam: 4, seed: uid.length * 13 });
    brain.garden = true;
    brain.trust = 999;
    return brain;
  }

  /** Move a friend between your heels and the garden. */
  setFollow(uid, follow) {
    const all = [...this.friends, ...this.resting];
    const f = all.find((x) => x.uid === uid);
    if (!f || f.follow === follow) return;
    f.follow = follow;
    this.friends = this.friends.filter((x) => x !== f);
    this.resting = this.resting.filter((x) => x !== f);
    if (follow) {
      f.brain = new FriendBrain({ species: f.species, slot: this.friends.length, x: f.brain.x, z: f.brain.z, uid });
      this.friends.push(f);
    } else {
      f.brain = this.gardenBrain(f.species, uid);
      this.resting.push(f);
      this.place(f);
    }
    this.friends.forEach((x, i) => (x.brain.slot = i));
  }

  /* ------------------------------------------------------------ each frame */

  /**
   * `ctx`: { player: { x, y, z, yaw, speed, noise, sneaking }, hour, calm, camera, look (Vector3: your head) }.
   * Returns events [{ type, w (the creature), … }].
   */
  update(dt, ctx) {
    this.t += dt;
    const out = [];
    const cam = ctx.camera.position;
    // Treats in flight: an arc, a bounce, then they lie still.
    for (const t of this.treats) {
      if (t.flying) {
        t.v.y -= 16 * dt;
        t.mesh.position.addScaledVector(t.v, dt);
        t.mesh.rotation.x += t.spin.x * dt;
        t.mesh.rotation.y += t.spin.y * dt;
        const g = this.ground(t.mesh.position.x, t.mesh.position.z);
        const w = waterAt(t.mesh.position.x, t.mesh.position.z);
        if (t.mesh.position.y <= Math.max(g, w)) {
          if (w > g + 0.1) {
            out.push({ type: 'splash', t });
            t.life = 0;
          } else if (!t.bounced && t.v.y < -3) {
            t.bounced = true;
            t.mesh.position.y = g;
            t.v.multiplyScalar(0.35);
            t.v.y = Math.abs(t.v.y) * 0.9 + 1;
            out.push({ type: 'land', t });
          } else {
            t.flying = false;
            t.mesh.position.y = g;
            t.mesh.rotation.set(0, t.mesh.rotation.y, 0);
            t.x = t.mesh.position.x;
            t.z = t.mesh.position.z;
            out.push({ type: 'land', t });
          }
        }
      } else if ((t.life -= dt) < 0 && !t.taken) {
        out.push({ type: 'spoil', t });
      }
    }
    for (const e of out) if (e.type === 'splash' || e.type === 'spoil') this.removeTreat(e.t);
    const lying = this.treats.filter((t) => !t.flying);
    // The wild ones.
    const walkable = (x, z, b) => this.walkable(x, z, b);
    for (const w of this.wild) {
      const b = w.brain;
      const d = Math.hypot(b.x - cam.x, b.z - cam.z);
      const far = d > 85;
      // Far minds think at a quarter of the rate.
      if (far && (w.skip = (w.skip ?? 0) + 1) % 4) continue;
      const step = far ? dt * 4 : dt;
      const from = { x: b.x, z: b.z };
      const ev = b.update(step, { player: ctx.player, treats: lying, calm: ctx.calm, hour: ctx.hour, walkable: (x, z, br) => this.walkable(x, z, br, from), others: this.wild.map((o) => o.brain) });
      for (const e of ev) out.push({ ...e, w });
      const vis = b.present && d < Math.min(120, this.drawFar ?? Infinity);
      w.body.group.visible = vis;
      if (!vis || far) continue;
      this.place(w);
      w.body.update(dt, { speed: b.speed, state: b.state, look: ctx.look, breath: ctx.breath, breathLen: ctx.breathLen });
    }
    // Your friends.
    for (const f of this.friends) {
      const ev = f.brain.update(dt, { player: ctx.player, friends: this.friends.map((x) => x.brain), walkable });
      for (const e of ev) out.push({ ...e, f });
      this.place(f);
      // Never fill the screen with a friend the camera has backed into.
      f.body.group.visible = f.body.group.position.distanceTo(cam) > 0.9 + f.body.height * 0.6;
      const st = f.brain.state === 'play' ? 'play' : f.brain.state === 'idle' ? 'friend' : 'follow';
      f.body.update(dt, { speed: f.brain.speed, state: st, look: f.brain.state === 'idle' ? ctx.look : null, float: f.species === 'puffwool' && ctx.player.floating });
    }
    // Friends resting in the garden.
    for (const f of this.resting) {
      const b = f.brain;
      const d = Math.hypot(b.x - cam.x, b.z - cam.z);
      f.body.group.visible = d < 90;
      if (d > 90) continue;
      b.update(dt, { player: null, hour: 12, walkable });
      this.place(f);
      f.body.update(dt, { speed: b.speed, state: b.state === 'play' ? 'play' : 'idle' });
    }
    // New wild ones turn up where friends were found (out of sight).
    for (const r of this.respawns) r.t -= dt;
    const due = this.respawns.filter((r) => r.t <= 0 && Math.hypot(r.home[0] - ctx.player.x, r.home[1] - ctx.player.z) > 50);
    for (const r of due) {
      this.spawn(r.species, r.home, r.roam, r.seed);
      this.respawns = this.respawns.filter((x) => x !== r);
    }
    // Ember sparks from the salamanders' tails, motes from the moths.
    if (this.vfx && (this._fxT = (this._fxT ?? 0) - dt) < 0) {
      this._fxT = 0.07;
      for (const c of [...this.wild, ...this.friends]) {
        if (!c.body.group.visible) continue;
        const d = c.body.group.position.distanceTo(cam);
        if (d > 40) continue;
        if (c.species === 'emberkit' && c.body.flame?.visible) {
          const p = c.body.flame.getWorldPosition(V());
          this.vfx.fire(p.add(V(0, 0.06, 0)), 1, { size: 0.09, speed: 0.4, life: 0.45 });
          if (Math.random() < 0.3) this.vfx.burst(p, 1, [3, 1.3, 0.3], { speed: 0.8, life: 0.9, size: 0.03, gravity: -1.2, up: 1.5 });
        }
        if (c.species === 'lumoth' && Math.random() < 0.35) this.vfx.burst(c.body.headWorld(V()).add(V(0, -0.2, 0)), 1, [2.4, 1.8, 0.8], { speed: 0.25, life: 1.6, size: 0.045, gravity: 0.15, up: 0.2 });
      }
    }
    // The grass bends round the nearest four.
    const near = [...this.friends, ...this.wild].filter((c) => c.body.group.visible && c.species !== 'lumoth').map((c) => [c, c.body.group.position.distanceToSquared(cam)]).sort((a, b) => a[1] - b[1]).slice(0, 4);
    grassPushers.value.forEach((v, i) => {
      const c = near[i]?.[0];
      if (c) v.set(c.body.group.position.x, c.body.group.position.y, c.body.group.position.z, 0.5 + SPECIES[c.species].size * 0.6);
      else v.set(0, -100, 0, 0);
    });
    return out;
  }

  setFur(n) {
    for (const c of [...this.wild, ...this.friends, ...this.resting]) c.body.setFur(n);
  }

  /** The wild creature nearest (x, z) within `max`, optionally filtered. */
  nearest(x, z, max = 4, ok = () => true) {
    let best = null;
    let bd = max;
    for (const w of this.wild) {
      if (!w.brain.present || !ok(w)) continue;
      const d = Math.hypot(w.brain.x - x, w.brain.z - z);
      if (d < bd) {
        bd = d;
        best = w;
      }
    }
    return best;
  }

  dispose() {
    for (const c of [...this.wild, ...this.friends, ...this.resting]) {
      c.body.group.removeFromParent();
      c.body.dispose();
    }
    for (const t of this.treats) t.mesh.removeFromParent();
  }
}
