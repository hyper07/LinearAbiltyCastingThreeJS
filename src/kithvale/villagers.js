/**
 * The people of Lanternrest going about their dusk (cast.js): the
 * gatekeeper in a straw hat watching the road, the lantern keeper walking
 * her round with a lantern on a pole, a sweeper at the teahouse, two friends
 * talking by the well, the fruit seller, a child racing round the plaza,
 * the Kith Warden tending the garden, the elder on a bench, a grower in the
 * sunhead field, the shrine keeper at prayer, a fisher by the pond.
 *
 * Bodies are polyfork's (CC BY 4.0), dressed in Gloamreach's materials,
 * moved by their own and Mesh2Motion's clips. They turn to you when you come
 * close and greet you once; the game shows a name plate and their line.
 * Far ones are hidden and still; middling ones animate at half rate.
 */
import * as THREE from 'three';
import { loadTemplate, Actor, BORROWED } from '../gloamreach/actors.js';
import { VILLAGERS } from './cast.js';
import { groundAt } from './heights.js';
import { painterly } from './paint.js';

const wrap = (a) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};
const NEEDS = { idle: ['LookAround', 'Greet', 'FoldArms'], work: ['Greet'], chat: ['Talk', 'Listen', 'Nod', 'Greet'], sit: ['Greet'], round: ['Greet', 'Lantern'], play: ['Greet', 'Sprint'] };
Object.assign(BORROWED, { Lantern: 'idle-lantern', Pray: 'pray', SitFloor: 'sit-ground-idle', SitChair: 'sitting-idle', Harvest: 'farm-harvest', Water: 'farm-watering', Sweep: 'farm-harvest' });

/** Small things people hold: a broom, a lantern on a pole, a fishing rod. */
function prop(kind) {
  const g = new THREE.Group();
  const wood = painterly(new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.8 }));
  if (kind === 'broom') {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.3, 6), wood);
    stick.position.y = -0.35;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 10, 1, true), painterly(new THREE.MeshStandardMaterial({ color: 0xc8a860, roughness: 1, side: THREE.DoubleSide })));
    head.position.y = -1.05;
    g.add(stick, head);
  } else if (kind === 'lantern') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.5, 6), wood);
    pole.rotation.z = Math.PI / 2 - 0.5;
    pole.position.set(0, 0.25, 0.35);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), new THREE.MeshStandardMaterial({ color: 0xfff2dc, emissive: 0xffb860, emissiveIntensity: 1.4 }));
    lamp.scale.y = 1.25;
    lamp.position.set(0, 0.35, 0.95);
    g.add(pole, lamp);
    g.userData.lamp = lamp;
  } else if (kind === 'rod') {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.015, 2.4, 5), wood);
    rod.rotation.x = 1.0;
    rod.position.set(0, 0.6, 0.9);
    g.add(rod);
  }
  g.traverse((o) => (o.castShadow = true));
  return g;
}

export class Villagers {
  constructor({ scene, detail }) {
    this.scene = scene;
    this.detail = detail;
    this.list = [];
    this.greeted = new Set();
  }

  async load() {
    const models = [...new Set(VILLAGERS.map((v) => v.model))];
    const templates = {};
    await Promise.all(models.map(async (id) => {
      const needs = new Set();
      for (const v of VILLAGERS.filter((x) => x.model === id)) {
        for (const n of NEEDS[v.does] ?? []) needs.add(n);
        if (v.clip) needs.add(v.clip);
      }
      templates[id] = await loadTemplate(id, { detail: this.detail, borrow: [...needs], rim: 0.7 });
    }));
    for (const v of VILLAGERS) {
      const tpl = templates[v.model];
      if (!tpl) continue;
      const actor = new Actor(tpl, { height: v.height, name: v.name });
      const start = v.at ?? [...v.path[0], 0];
      const p = { v, actor, x: start[0], z: start[1], yaw: start[2] ?? 0, face: start[2] ?? 0, leg: 0, stopT: 0, t: Math.random() * 5, greetT: 0, talkT: Math.random() * 3 };
      actor.object.position.set(p.x, groundAt(p.x, p.z), p.z);
      actor.object.rotation.y = p.yaw;
      if (v.prop) {
        const hand = actor.bones.RightHand;
        if (hand) {
          const pr = prop(v.prop);
          pr.scale.setScalar(1 / (actor.scaleK || 1));
          hand.add(pr);
          p.prop = pr;
        }
      }
      if (v.does === 'sit' && v.clip === 'SitChair') {
        // A bench to sit on.
        const bench = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.45), painterly(new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.8 })));
        bench.position.set(p.x - Math.sin(p.face) * 0.15, groundAt(p.x, p.z) + 0.44, p.z - Math.cos(p.face) * 0.15);
        bench.rotation.y = p.face;
        bench.castShadow = bench.receiveShadow = true;
        const legs = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.42, 0.06), bench.material);
        legs.position.set(0, -0.22, 0);
        bench.add(legs);
        this.scene.add(bench);
        p.bench = bench;
      }
      this.scene.add(actor.object);
      this.list.push(p);
      this.startJob(p);
    }
  }

  startJob(p) {
    const v = p.v;
    const a = p.actor;
    if (v.does === 'work' && v.clip) a.act(v.clip, { loop: true, fade: 0.4 });
    else if (v.does === 'sit') a.act(v.clip, { loop: true, fade: 0.4 });
    else if (v.does === 'chat') a.act(Math.random() < 0.5 ? 'Talk' : 'Listen', { loop: true, fade: 0.4 });
    else a.rest(0.4);
  }

  /** Each frame: routines, turning to greet you; returns who is near enough to show a name plate. */
  update(dt, { player, camera, active = true }) {
    const near = [];
    for (const p of this.list) {
      const v = p.v;
      const a = p.actor;
      const dx = player.x - p.x;
      const dz = player.z - p.z;
      const d = Math.hypot(dx, dz);
      const cam = Math.hypot(camera.position.x - p.x, camera.position.z - p.z);
      a.object.visible = cam < 90;
      if (!a.object.visible) continue;
      p.t += dt;
      // Close by: stop, turn, greet once.
      const greeting = active && d < 3.4 && v.does !== 'sit' && v.does !== 'play';
      if (active && d < 4.2) near.push({ p, d });
      if (greeting && !this.greeted.has(v.id)) {
        this.greeted.add(v.id);
        p.greetT = 2.2;
        a.act('Greet', { loop: false, fade: 0.2 });
        p.justGreeted = true;
      }
      p.greetT = Math.max(0, p.greetT - dt);
      let speed = 0;
      let wantYaw = p.face;
      if (greeting) {
        wantYaw = Math.atan2(dx, dz);
        if (p.greetT <= 0 && a.overlay === 'Greet' && a.done()) this.startJob(p);
      } else if (v.does === 'round' || v.does === 'play') {
        const path = v.path;
        const tgt = path[(p.leg + 1) % path.length];
        const tx = tgt[0] - p.x;
        const tz = tgt[1] - p.z;
        const td = Math.hypot(tx, tz);
        if (p.stopT > 0) {
          p.stopT -= dt;
          wantYaw = tgt[2] ?? p.yaw;
          if (p.stopT <= 0) a.rest(0.4);
        } else if (td < 0.3) {
          p.leg = (p.leg + 1) % path.length;
          if (v.does === 'round') {
            p.stopT = 4 + Math.random() * 2;
            a.act(v.clip ?? 'LookAround', { loop: true, fade: 0.4 });
          }
        } else {
          speed = v.does === 'play' ? 3.2 : 1.1;
          wantYaw = Math.atan2(tx, tz);
          p.x += (tx / td) * Math.min(td, speed * dt);
          p.z += (tz / td) * Math.min(td, speed * dt);
        }
      } else if (v.does === 'chat') {
        if ((p.talkT -= dt) < 0) {
          p.talkT = 2.5 + Math.random() * 3;
          a.act(['Talk', 'Listen', 'Nod', 'Talk'][Math.floor(Math.random() * 4)], { loop: true, fade: 0.4 });
        }
      } else if (v.does === 'idle' && a.overlay == null && Math.random() < dt * 0.06) a.act('LookAround', { loop: false, fade: 0.4 });
      else if (v.does === 'idle' && a.overlay === 'LookAround' && a.done()) a.rest(0.4);
      p.yaw = wrap(p.yaw + Math.max(-dt * 5, Math.min(dt * 5, wrap(wantYaw - p.yaw))));
      a.object.rotation.y = p.yaw;
      a.object.position.set(p.x, groundAt(p.x, p.z), p.z);
      a.move(speed);
      // Middling distance: animate every other frame.
      if (cam < 30 || (p.skip = !p.skip)) a.update(cam < 30 ? dt : dt * 2);
      if (p.prop?.userData.lamp) p.prop.userData.lamp.material.emissiveIntensity = 1.2 + Math.sin(p.t * 3) * 0.15;
    }
    near.sort((a, b) => a.d - b.d);
    return near;
  }

  dispose() {
    for (const p of this.list) {
      p.actor.object.removeFromParent();
      p.bench?.removeFromParent();
      p.actor.dispose();
    }
  }
}
