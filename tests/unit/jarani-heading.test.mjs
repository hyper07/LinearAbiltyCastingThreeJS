import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RaceTraffic, laneAt } from '../../src/city/traffic.js';

/**
 * Kickrani's traffic never drives backwards: on a winding mountain road (hairpins whose points are a few
 * metres apart, as the map draws Bukak Skyway's), round its dead ends and onto the next road, at any frame
 * rate and any speed, a vehicle's nose points the way it is going — within 30° whenever it moves faster
 * than 1 m/s.
 */
function hairpins() {
  // a ridge road: straights joined by tight hairpins (points every 2–3 m round each bend, radius ~6 m)
  const pts = [];
  let x = 0;
  let z = 0;
  let h = 0; // heading, game yaw (0 is −z)
  const go = (len, step) => {
    for (let d = 0; d < len; d += step) {
      x += -Math.sin(h) * step;
      z += -Math.cos(h) * step;
      pts.push(x, z);
    }
  };
  const bend = (angle, r) => {
    const n = Math.max(3, Math.ceil(Math.abs(angle * r) / 2.5));
    const step = Math.abs(angle * r) / n;
    for (let k = 0; k < n; k++) {
      h += angle / n / 2;
      x += -Math.sin(h) * step;
      z += -Math.cos(h) * step;
      h += angle / n / 2;
      pts.push(x, z);
    }
  };
  pts.push(x, z);
  go(60, 10);
  bend(Math.PI * 0.9, 6);
  go(50, 10);
  bend(-Math.PI * 0.95, 5);
  go(40, 10);
  bend(Math.PI * 0.6, 8);
  go(50, 10);
  return { pts, cls: 4, width: 9, oneway: false };
}

function street(roads, fps) {
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 3000);
  cam.position.set(0, 500, 0);
  cam.lookAt(0, 500, -1000);
  cam.updateMatrixWorld();
  const scene = new THREE.Scene();
  const game = { scene, camera: cam, roadsNear: () => roads, surfaceAt: () => 0, pos: { x: 0, z: 0 } };
  const race = { course: null, racers: [], keepClear: () => false };
  const t = new RaceTraffic(game, race);
  t._make = (kind) => {
    const group = new THREE.Group();
    t.group.add(group);
    return { group, view: null, kind, size: kind === 'bus' ? [5.5, 1.2] : [2.25, 0.9], model: 'box' };
  };
  t._view();
  void fps;
  return t;
}

function drive(t, road, { at, lane, top, kind = 'car' }) {
  const made = t._make(kind);
  const q = laneAt(road.pts, at, lane);
  const v = { ...made, road, at, lane, lat: lane, top, speed: top, v: top, y: 0, box: { x: q.x, z: q.z, heading: q.heading, halfLength: made.size[0], halfWidth: made.size[1] }, missed: new Set(), stopFor: 0, waited: 0, roll: 0 };
  t._born(v);
  return v;
}

test('traffic: no vehicle drives backwards — its nose within 30° of the way it moves whenever faster than 1 m/s (hairpins, dead ends, 30–144 fps, slow and fast)', () => {
  const road = hairpins();
  const n = road.pts.length / 2 - 1;
  let worst = 0;
  let where = '';
  for (const fps of [30, 60, 120, 144]) {
    for (const top of [1.6, 2.5, 6, 11]) {
      for (const [dir, lane, kind] of [[1, 2.2, 'car'], [-1, 2.2, 'car'], [1, 3.4, 'bus'], [-1, 1.2, 'car']]) {
        const t = street([road], fps);
        const v = drive(t, road, { at: { i: dir > 0 ? 0 : n - 1, t: dir > 0 ? 0.05 : 0.95, dir }, lane, top, kind });
        const dt = 1 / fps;
        // one second at most of motion history: the velocity over the last frame's step
        for (let k = 0; k < fps * 90; k++) {
          const x0 = v.box.x;
          const z0 = v.box.z;
          t._drive(v, dt);
          const dx = v.box.x - x0;
          const dz = v.box.z - z0;
          const speed = Math.hypot(dx, dz) / dt;
          if (speed <= 1) continue;
          const off = Math.abs(Math.atan2(Math.sin(Math.atan2(-dx, -dz) - v.box.heading), Math.cos(Math.atan2(-dx, -dz) - v.box.heading)));
          if (off > worst) {
            worst = off;
            where = `${fps} fps, top ${top}, dir ${dir}, ${kind}, frame ${k}, speed ${speed.toFixed(1)}, ${v.turn ? 'turning' : `at ${v.at.i}+${v.at.t.toFixed(2)}`}`;
          }
        }
      }
    }
  }
  assert.ok(worst < Math.PI / 6, `nose ${((worst * 180) / Math.PI).toFixed(0)}° off its motion (${where})`);
});

test('traffic: a lane rounds each corner of the road — never a kink, never looping back on itself, in any lane either way', () => {
  const road = hairpins();
  const n = road.pts.length / 2 - 1;
  for (const dir of [1, -1]) {
    for (const side of [-3.4, -2.2, -1.2, 0, 1.2, 2.2, 3.4]) {
      let prev = null;
      let worstKink = 0;
      for (let i = 0; i < n; i++) {
        for (let s = 0; s < 40; s++) {
          const t = dir > 0 ? s / 40 : 1 - s / 40;
          const ii = dir > 0 ? i : n - 1 - i;
          const q = laneAt(road.pts, { i: ii, t, dir }, side);
          if (prev) {
            const dx = q.x - prev.x;
            const dz = q.z - prev.z;
            const step = Math.hypot(dx, dz);
            assert.ok(step < 1.2, `no jump (${step.toFixed(2)} m)`);
            if (step > 1e-4) {
              // the way it moves is the way the lane heads (never backwards along it)
              const off = Math.abs(Math.atan2(Math.sin(Math.atan2(-dx, -dz) - q.heading), Math.cos(Math.atan2(-dx, -dz) - q.heading)));
              assert.ok(off < Math.PI / 6, `dir ${dir} side ${side} at ${ii}+${t.toFixed(2)}: moving ${((off * 180) / Math.PI).toFixed(0)}° off the lane's heading`);
            }
            worstKink = Math.max(worstKink, Math.abs(Math.atan2(Math.sin(q.heading - prev.heading), Math.cos(q.heading - prev.heading))));
          }
          prev = q;
        }
      }
      assert.ok(worstKink < 0.4, `dir ${dir} side ${side}: the heading turns ${worstKink.toFixed(2)} rad in one step at most`);
    }
  }
});
