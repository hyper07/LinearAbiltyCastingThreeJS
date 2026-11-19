/**
 * The two hunters who come along — Yara with a bow, Doran with a spear —
 * on polyfork bodies (CC BY 4.0) in Gloamreach's armour, with Mesh2Motion's
 * clips. They keep a little behind and to either side, catch up if left
 * far behind, and help a little in a fight: Yara keeps her distance and
 * looses arrows, Doran closes in and jabs, and both roll clear when the
 * Gnarlhorn winds up at them. They talk (subtitled) at the hunt's moments.
 */
import * as THREE from 'three';
import { loadTemplate } from '../gloamreach/actors.js';
import { FighterActor } from '../gloamreach/fighter.js';
import { GearRig, learnFrames } from '../gloamreach/gearRig.js';
import { fixedItem, HUNTER_CLIPS } from './hunter.js';
import { COMPANIONS, BARKS } from './cast.js';
import { wrap } from './brains.js';

export class Companions {
  constructor({ scene, colliders, detail }) {
    this.scene = scene;
    this.colliders = colliders;
    this.detail = detail;
    this.list = [];
    this.said = new Map();
    this.sayCool = 0;
    this.events = [];
  }

  async load() {
    const tpls = await Promise.all(COMPANIONS.map((c) => loadTemplate(c.model, { detail: this.detail, borrow: HUNTER_CLIPS })));
    learnFrames(tpls.filter(Boolean));
    COMPANIONS.forEach((c, i) => {
      const tpl = tpls[i];
      if (!tpl) return;
      const actor = new FighterActor(tpl, { height: c.height, name: c.name });
      const rig = new GearRig(actor, tpl, { hero: c.weapon === 'bow' ? 'ranger' : 'knight', scene: this.scene });
      const eq = {};
      for (const [slot, base] of Object.entries(c.equip)) eq[slot] = fixedItem(base, { ...c.colors, seed: base.length * 13 + i });
      eq.mainhand = fixedItem(c.weapon === 'bow' ? 'bow' : 'spear', { metal: c.colors.metal, leather: c.colors.leather, seed: 3 + i });
      if (c.weapon === 'bow') eq.offhand = fixedItem('quiver', { leather: c.colors.leather });
      rig.dress(eq);
      this.scene.add(actor.object);
      this.list.push({ c, actor, rig, x: 0, z: 0, y: 0, yaw: 0, speed: 0, state: 'follow', cool: 1 + i, act: 0, roll: null, hp: 1 });
    });
  }

  place(x, z, yaw) {
    for (const m of this.list) {
      const [ox, oz] = m.c.offset;
      m.x = x + Math.cos(yaw) * ox + Math.sin(yaw) * oz;
      m.z = z - Math.sin(yaw) * ox + Math.cos(yaw) * oz;
      m.yaw = yaw;
    }
  }

  /** A line from one of them for this moment (not the same one twice running). */
  bark(moment, force = false) {
    const lines = BARKS[moment];
    if (!lines || (!force && this.sayCool > 0)) return null;
    const last = this.said.get(moment);
    const pick = lines.filter((l) => l !== last);
    const line = pick[Math.floor(Math.random() * pick.length)] ?? lines[0];
    this.said.set(moment, line);
    this.sayCool = 6;
    const who = this.list.find((m) => m.c.id === line[0]) ?? this.list[0];
    return { who: who?.c.name ?? 'Yara', text: line[1] };
  }

  /**
   * One step. `h` the hunter { x, z, yaw, speed, riding }; `fight` the
   * monster (or null) { x, z, alive, engaged, centre() }; `shoot(from, to, m)`
   * and `jab(m)` do their damage; `threat` the current telegraph { x, z, r } or null.
   */
  update(dt, { h, fight, shoot, jab, threat, camera }) {
    this.sayCool -= dt;
    for (const m of this.list) {
      m.cool -= dt;
      m.act = Math.max(0, m.act - dt);
      let want = 0;
      let wantYaw = m.yaw;
      const a = m.actor;
      const engaged = fight && fight.alive && fight.engaged && Math.hypot(fight.x - h.x, fight.z - h.z) < 45;
      // Roll clear of a blow coming at them.
      if (threat && !m.roll && Math.hypot(threat.x - m.x, threat.z - m.z) < threat.r + 1 && Math.random() < 0.9) {
        const away = Math.atan2(m.x - threat.x, m.z - threat.z);
        m.roll = { t: 0.55, vx: Math.sin(away) * 6, vz: Math.cos(away) * 6 };
        m.yaw = away;
        a.act('Roll', { loop: false, fade: 0.08, speed: 1.3 });
      }
      if (m.roll) {
        m.roll.t -= dt;
        m.x += m.roll.vx * dt;
        m.z += m.roll.vz * dt;
        if (m.roll.t <= 0) {
          m.roll = null;
          a.rest(0.2);
        }
      } else if (engaged && !h.riding) {
        const d = Math.hypot(fight.x - m.x, fight.z - m.z);
        const toM = Math.atan2(fight.x - m.x, fight.z - m.z);
        if (m.c.weapon === 'bow') {
          // Keep 14–22 m off, circling, and shoot.
          if (d < 14) {
            want = 3.6;
            wantYaw = toM + Math.PI;
          } else if (d > 24) {
            want = 4.2;
            wantYaw = toM;
          } else {
            want = 1.2;
            wantYaw = toM + Math.PI / 2;
          }
          if (m.cool <= 0 && d < 30 && m.act <= 0) {
            m.cool = 2.4 + Math.random();
            m.act = 0.7;
            m.yaw = toM;
            a.act('Shoot', { loop: false, upper: true, speed: 1.4, fade: 0.1 });
            setTimeout(() => shoot?.(m), 330);
          }
        } else {
          if (d > 6) {
            want = 4.4;
            wantYaw = toM;
          } else if (d < 4) {
            want = 2;
            wantYaw = toM + Math.PI;
          } else wantYaw = toM;
          if (m.cool <= 0 && d < 7 && m.act <= 0) {
            m.cool = 2.8 + Math.random() * 1.2;
            m.act = 0.9;
            m.yaw = toM;
            a.act(Math.random() < 0.5 ? 'Slash1' : 'Slash2', { loop: false, speed: 1.1, fade: 0.08 });
            setTimeout(() => jab?.(m), 420);
          }
        }
        if (m.act > 0) want = 0;
      } else {
        // Follow: a little behind and to the side.
        const [ox, oz] = m.c.offset;
        const tx = h.x + Math.cos(h.yaw) * ox + Math.sin(h.yaw) * oz;
        const tz = h.z - Math.sin(h.yaw) * ox + Math.cos(h.yaw) * oz;
        const d = Math.hypot(tx - m.x, tz - m.z);
        // Left far behind (you rode off): they catch up out of sight.
        if (d > 50) {
          const v = new THREE.Vector3(tx, this.colliders.height(tx, tz) + 1, tz).project(camera);
          if (Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1 || v.z > 1 || d > 90) {
            m.x = tx - Math.sin(h.yaw) * 6;
            m.z = tz - Math.cos(h.yaw) * 6;
          }
        }
        if (d > 1.2) {
          want = Math.min(d > 8 ? 7 : d > 3 ? 4.6 : 1.6, Math.max(1.4, h.speed * 1.15 + (d > 4 ? 1.5 : 0)));
          wantYaw = Math.atan2(tx - m.x, tz - m.z);
        } else wantYaw = h.yaw;
      }
      if (!m.roll) {
        const dy = wrap(wantYaw - m.yaw);
        m.yaw = wrap(m.yaw + Math.max(-8 * dt, Math.min(8 * dt, dy)));
        m.speed += (want - m.speed) * Math.min(1, dt * 6);
        const [nx, nz] = this.colliders.move(m.x, m.z, Math.sin(m.yaw) * m.speed * dt, Math.cos(m.yaw) * m.speed * dt, 0.38, m.y);
        m.x = nx;
        m.z = nz;
      }
      m.y = this.colliders.height(m.x, m.z);
      a.object.position.set(m.x, m.y, m.z);
      a.object.rotation.y = m.yaw;
      a.move(m.roll ? 0 : m.speed);
      if (a.overlay && a.done()) a.rest(0.2);
      a.update(dt);
      m.rig.update(dt, a.object);
    }
  }

  dispose() {
    for (const m of this.list) {
      m.rig.dispose();
      m.actor.dispose();
    }
  }
}
