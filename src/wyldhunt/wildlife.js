/**
 * The gorge's smaller life: herds of velvetbucks (polyfork's deer, CC BY 4.0,
 * re-coated in moss-grey with a pale throat) that graze — heads down, a slow
 * step now and then — and bolt together when a hunter comes too close; and
 * thornskitters (Mesh2Motion's spider, CC0, re-coated as teal chitin with
 * ember spots) that guard their nests, rear up in threat, scuttle at you and
 * bite. Both can be hunted; both come back after a while.
 */
import * as THREE from 'three';
import { loadTemplate, Actor, characterMaterial } from '../gloamreach/actors.js';
import { rng } from '../gloamreach/noise.js';
import { HERDS, NESTS } from './map.js';
import { Beast, coatMaterial, loadRig } from './beasts.js';
import { wrap } from './brains.js';
import { animStride, ticksOn } from '../shared/power.js';

const SKITTER_COAT = { back: ['#0a1416', '#1e4a50', '#5ab0a8'], belly: ['#140c08', '#6a3a1a', '#e88a3a'], stripe: '#e86a2a', stripeK: 0.6 };

export class Wildlife {
  /** `keep(x, z)`: only the herds and nests of the zone being built. */
  constructor({ scene, colliders, detail, vfx, keep = () => true }) {
    this.keep = keep;
    this.scene = scene;
    this.colliders = colliders;
    this.detail = detail;
    this.vfx = vfx;
    this.bucks = [];
    this.skitters = [];
    this.events = [];
    this.r = rng(77);
  }

  async load() {
    if (!HERDS.some((h) => this.keep(h.x, h.z)) && !NESTS.some((n) => this.keep(n.x, n.z))) return;
    const [tpl, spider] = await Promise.all([loadTemplate('deer-base', { detail: this.detail }), loadRig('spider')]);
    const r = this.r;
    if (tpl) {
      // One coat for all of them: the deer's own shading, tinted moss-grey.
      let coat = null;
      HERDS.forEach((h, hi) => {
        if (!this.keep(h.x, h.z)) return;
        for (let i = 0; i < h.n; i++) {
          const a = new Actor(tpl, { height: 1.85 + r() * 0.3, name: 'Velvetbuck' });
          a.model.traverse((o) => {
            if (!o.isSkinnedMesh) return;
            if (!coat) {
              coat = characterMaterial(o.material, { detail: this.detail, rim: 0.5, fx: true });
              coat.userData.char.uTintMul.value.set(0.95, 1.0, 0.82);
            }
            o.material = coat;
          });
          const ang = r() * Math.PI * 2;
          const d = r() * h.r;
          const b = { a, kind: 'buck', herd: hi, home: h, x: h.x + Math.cos(ang) * d, z: h.z + Math.sin(ang) * d, yaw: r() * 6.28, speed: 0, state: 'graze', t: r() * 5, hp: 70, alive: true, r: 0.9, fear: 0, goal: null };
          this.scene.add(a.object);
          this.bucks.push(b);
        }
      });
    }
    if (spider) {
      NESTS.forEach((n, ni) => {
        if (!this.keep(n.x, n.z)) return;
        for (let i = 0; i < n.n; i++) {
          const be = new Beast(spider, { height: 0.85, gaits: ['Walk'], speeds: { Idle: 0, Walk: 2.4 }, coat: (src) => coatMaterial(src, { ...SKITTER_COAT, rim: 0.7, rough: 0.35 }), name: 'Thornskitter' });
          const ang = (i / n.n) * Math.PI * 2;
          const s = { a: be, kind: 'skitter', nest: n, x: n.x + Math.cos(ang) * n.r * 0.6, z: n.z + Math.sin(ang) * n.r * 0.6, yaw: r() * 6.28, speed: 0, state: 'idle', t: r() * 4, hp: 150, alive: true, r: 1.1, cool: 0, id: ni * 10 + i };
          this.scene.add(be.object);
          this.skitters.push(s);
        }
      });
    }
  }

  /** Everything that can be hit. */
  get targets() {
    return [...this.bucks, ...this.skitters].filter((t) => t.alive);
  }

  takeEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }

  /** A blow lands on one of them. Returns true if it died. */
  damage(t, amount, from) {
    if (!t.alive) return false;
    t.hp -= amount;
    t.flash = 1;
    if (t.kind === 'buck') {
      t.fear = 8;
      t.state = 'flee';
      t.fleeFrom = from;
      for (const o of this.bucks) if (o.herd === t.herd && o.alive) {
        o.fear = 8;
        o.state = 'flee';
        o.fleeFrom = from;
      }
    } else {
      t.state = 'chase';
      if (t.a.play) t.a.play('Hit', { speed: 1.4, fade: 0.05 });
    }
    if (t.hp <= 0) {
      t.alive = false;
      t.deadT = 0;
      t.state = 'dead';
      if (t.kind === 'skitter') t.a.play('Death', { hold: true });
      this.events.push({ type: 'death', t });
      return true;
    }
    return false;
  }

  update(dt, { hunter, hunterAlive, mount, hurt }) {
    const r = this.r;
    // Far beasts animate less often, and past the draw distance not at all (power: animNear, drawFar).
    this._frame = (this._frame ?? 0) + 1;
    const lod = (t, d, i) => {
      const stride = animStride(d, { near: this.animNear ?? 45, far: this.drawFar ?? Infinity });
      t.a.object.visible = stride > 0;
      t.acc = (t.acc ?? 0) + dt;
      if (!ticksOn(this._frame, stride, i)) return 0;
      const step = t.acc;
      t.acc = 0;
      return step;
    };
    let idx = 0;
    const walk = (t, want, wantYaw, turn = 3) => {
      const d = wrap(wantYaw - t.yaw);
      t.yaw = wrap(t.yaw + Math.max(-turn * dt, Math.min(turn * dt, d)));
      t.speed += (want - t.speed) * Math.min(1, dt * 4);
      const [nx, nz] = this.colliders.move(t.x, t.z, Math.sin(t.yaw) * t.speed * dt, Math.cos(t.yaw) * t.speed * dt, t.r * 0.6, this.colliders.height(t.x, t.z));
      if (Math.hypot(nx - t.x, nz - t.z) < t.speed * dt * 0.3 && t.speed > 0.5) t.yaw += 0.6;
      t.x = nx;
      t.z = nz;
    };
    for (const b of this.bucks) {
      b.t += dt;
      b.flash = Math.max(0, (b.flash ?? 0) - dt * 4);
      if (!b.alive) {
        b.deadT += dt;
        b.a.object.rotation.z = Math.min(Math.PI / 2, b.deadT * 3);
        b.a.object.position.y = this.colliders.height(b.x, b.z) + Math.min(0.4, b.deadT * 0.8);
        b.a.move(0);
        b.a.update(dt);
        if (b.deadT > 90) this._respawnBuck(b);
        continue;
      }
      const dh = Math.hypot(hunter.x - b.x, hunter.z - b.z);
      const dm = mount ? Math.hypot(mount.x - b.x, mount.z - b.z) : 99;
      if ((dh < 11 || dm < 9) && b.state !== 'flee') {
        // The whole herd bolts.
        for (const o of this.bucks) if (o.herd === b.herd && o.alive) {
          o.state = 'flee';
          o.fear = 6 + r() * 2;
          o.fleeFrom = dh < dm ? { x: hunter.x, z: hunter.z } : { x: mount.x, z: mount.z };
        }
        this.events.push({ type: 'bolt', herd: b.herd });
      }
      if (b.state === 'flee') {
        b.fear -= dt;
        const away = Math.atan2(b.x - b.fleeFrom.x, b.z - b.fleeFrom.z);
        const home = Math.atan2(b.home.x - b.x, b.home.z - b.z);
        const far = Math.hypot(b.x - b.home.x, b.z - b.home.z) > b.home.r * 3;
        walk(b, 7.5, far ? home : away + Math.sin(b.t * 0.7 + b.herd) * 0.4, 4);
        if (b.fear <= 0) b.state = 'return';
      } else if (b.state === 'return') {
        const d = Math.hypot(b.home.x - b.x, b.home.z - b.z);
        walk(b, d > 3 ? 1.6 : 0, Math.atan2(b.home.x - b.x, b.home.z - b.z));
        if (d < b.home.r * 0.7) b.state = 'graze';
      } else {
        // Graze: stand head-down a while, then a few steps.
        if (!b.goal || b.t > b.next) {
          const a = r() * 6.28;
          const d = r() * b.home.r;
          b.goal = { x: b.home.x + Math.cos(a) * d, z: b.home.z + Math.sin(a) * d };
          b.next = b.t + 6 + r() * 10;
        }
        const d = Math.hypot(b.goal.x - b.x, b.goal.z - b.z);
        walk(b, d > 1 && b.next - b.t < 4 ? 1.1 : 0, Math.atan2(b.goal.x - b.x, b.goal.z - b.z), 1.5);
      }
      const o = b.a.object;
      o.position.set(b.x, this.colliders.height(b.x, b.z), b.z);
      o.rotation.y = b.yaw;
      b.graze = (b.graze ?? 0) + ((b.state === 'graze' && b.speed < 0.3 ? 1 : 0) - (b.graze ?? 0)) * Math.min(1, dt * 2);
      const step = lod(b, dh, idx++);
      if (step > 0) {
        b.a.move(b.speed);
        b.a.update(step);
        // Grazing: bend the neck down while standing (on top of the pose just set).
        const neck = b.a.bones.Neck ?? b.a.bones.neck ?? b.a.bones.Head;
        if (neck) neck.rotation.x += b.graze * (0.9 + Math.sin(b.t * 1.3) * 0.08);
      }
    }
    for (const s of this.skitters) {
      s.t += dt;
      s.cool = Math.max(0, s.cool - dt);
      const be = s.a;
      if (!s.alive) {
        s.deadT += dt;
        be.update(dt);
        if (s.deadT > 3) be.object.position.y -= dt * 0.3;
        if (s.deadT > 120) this._respawnSkitter(s);
        continue;
      }
      const dh = Math.hypot(hunter.x - s.x, hunter.z - s.z);
      const home = Math.hypot(s.nest.x - s.x, s.nest.z - s.z);
      if (s.state === 'idle') {
        walk(s, 0, s.yaw);
        if (dh < 13 && hunterAlive) {
          s.state = 'threat';
          s.t = 0;
          be.play('Threat', { speed: 1.6 });
          this.events.push({ type: 'skitter', s });
        }
      } else if (s.state === 'threat') {
        walk(s, 0, Math.atan2(hunter.x - s.x, hunter.z - s.z), 5);
        if (s.t > 1.0) s.state = 'chase';
      } else if (s.state === 'chase') {
        if (!hunterAlive || home > 26 || dh > 24) {
          s.state = 'home';
        } else if (dh < 2.0 && s.cool <= 0) {
          s.state = 'bite';
          s.t = 0;
          s.hit = false;
          be.play('Bite', { speed: 1.5, fade: 0.08 });
          this.vfx?.telegraph({ x: s.x + Math.sin(s.yaw) * 1.3, z: s.z + Math.cos(s.yaw) * 1.3, radius: 1.3, time: 0.4, color: '#ff6a3a' });
        } else walk(s, 4.4, Math.atan2(hunter.x - s.x, hunter.z - s.z), 5);
      } else if (s.state === 'bite') {
        walk(s, 0, Math.atan2(hunter.x - s.x, hunter.z - s.z), 2);
        if (s.t > 0.42 && !s.hit) {
          s.hit = true;
          const d = Math.hypot(hunter.x - s.x, hunter.z - s.z);
          if (d < 2.4) hurt?.(s, 14);
        }
        if (s.t > 0.85) {
          s.state = 'chase';
          s.cool = 1.4 + r() * 1.2;
          be.rest(0.15);
        }
      } else if (s.state === 'home') {
        walk(s, home > 2 ? 2.6 : 0, Math.atan2(s.nest.x - s.x, s.nest.z - s.z), 4);
        if (home < 3) {
          s.state = 'idle';
          s.hp = Math.min(150, s.hp + 30);
        }
      }
      be.object.position.set(s.x, this.colliders.height(s.x, s.z), s.z);
      be.object.rotation.y = s.yaw;
      be.move(s.speed);
      if (be.overlay && be.progress() >= 0.99 && !be.overlayHold && s.state !== 'threat') be.rest(0.2);
      // A chasing or biting skitter always animates; one idling far off, less often.
      let step;
      if (s.state === 'idle' || s.state === 'home') step = lod(s, dh, idx++);
      else {
        be.object.visible = true;
        step = dt + (s.acc ?? 0);
        s.acc = 0;
      }
      if (step > 0) be.update(step);
      const u = be.meshes[0]?.material.userData.coat;
      if (u) u.uFlash.value.setScalar((s.flash = Math.max(0, (s.flash ?? 0) - dt * 4)) * 0.4);
    }
  }

  _respawnBuck(b) {
    b.alive = true;
    b.hp = 70;
    b.state = 'graze';
    b.x = b.home.x;
    b.z = b.home.z;
    b.a.object.rotation.z = 0;
  }

  _respawnSkitter(s) {
    s.alive = true;
    s.hp = 150;
    s.state = 'idle';
    s.x = s.nest.x;
    s.z = s.nest.z;
    s.a.rest(0);
    s.a.actions.Death?.stop();
  }

  dispose() {
    for (const b of this.bucks) b.a.dispose();
    for (const s of this.skitters) s.a.dispose();
  }
}

export { THREE };
