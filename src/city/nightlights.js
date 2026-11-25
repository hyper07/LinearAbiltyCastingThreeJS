import * as THREE from 'three';

/**
 * The city's lights after dark (knowledge/racing-study.md §6): moody but
 * readable. Every street lamp and alley lamp is registered here (by tile, or
 * by stretch of alley); each frame the nearest few become real point lights
 * (they light riders, cars, trees and walls), the next dozen a light field
 * the road and pavement shaders add up themselves (a pool under each lamp,
 * for a handful of instructions a pixel), and the race smears them down a
 * wet road. Your scooter carries a real headlight, and a faint fill near the
 * camera keeps your own rider readable. The lights are in the scene from the
 * start (dark by day), so night never recompiles a shader.
 *
 *   const lights = new NightLights(scene);
 *   const id = lights.add([{ x, y, z, ground }]);   // lamp heads (and the ground under them)
 *   lights.update(camera, { night, wet, rider: { x, y, z, heading } | null });
 *   roadShader.uniforms.uLamps = lights.field;   // vec4[FIELD]: position, strength
 */

export const FIELD = 12;
export const REAL = 3;
/** A street lamp's light (cd) as a real light, and its colour: warm white (Seoul's newer LED lamps run warm). */
export const LAMP = { power: 150, color: '#ffcf96', reach: 36 };
export const HEADLIGHT = { power: 42, angle: 0.46, reach: 40 };

export class NightLights {
  constructor(scene) {
    this.scene = scene;
    this.sets = new Map();
    this.nextId = 1;
    this.field = { value: Array.from({ length: FIELD }, () => new THREE.Vector4()) };
    this.points = Array.from({ length: REAL }, () => {
      const l = new THREE.PointLight(LAMP.color, 0, LAMP.reach, 2);
      scene.add(l);
      return l;
    });
    this.head = new THREE.SpotLight('#eef3ff', 0, HEADLIGHT.reach, HEADLIGHT.angle, 0.6, 1.6);
    this.head.name = 'headlight';
    this.fill = new THREE.PointLight('#c8d4ff', 0, 10, 2);
    scene.add(this.head, this.head.target, this.fill);
    /** The lamps nearest the camera this frame, nearest first (for the wet road's streaks). */
    this.near = [];
    this._list = [];
    this._fwd = new THREE.Vector3();
  }

  /** Lamp heads [{ x, y, z }]; returns an id to take them away by. */
  add(list) {
    const id = this.nextId++;
    this.sets.set(id, list.map((l) => ({ x: l.x, y: l.y, z: l.z, ground: l.ground ?? null })));
    return id;
  }

  remove(id) {
    this.sets.delete(id);
  }

  /** Each frame: which lamps are lit for real, the field, the headlight and the fill. */
  update(camera, { night = 0, wet = 0, rider = null } = {}) {
    const on = Math.max(0, Math.min(1, (night - 0.25) / 0.5));
    const p = camera.position;
    const fwd = camera.getWorldDirection(this._fwd);
    const list = this._list;
    list.length = 0;
    if (on > 0) {
      for (const set of this.sets.values()) {
        for (const l of set) {
          const dx = l.x - p.x;
          const dz = l.z - p.z;
          const d2 = dx * dx + dz * dz;
          if (d2 > 160 * 160) continue;
          // lamps ahead count as nearer than lamps behind (they light what you see)
          const ahead = (dx * fwd.x + dz * fwd.z) / Math.sqrt(d2 + 1);
          l.score = d2 * (ahead > 0 ? 1 - ahead * 0.55 : 1.4);
          list.push(l);
        }
      }
      list.sort((a, b) => a.score - b.score);
    }
    this.near = list.slice(0, 16);
    this.points.forEach((pl, i) => {
      const l = list[i];
      pl.intensity = l ? LAMP.power * on : 0;
      if (l) pl.position.set(l.x, l.y - 0.25, l.z);
    });
    const F = this.field.value;
    for (let i = 0; i < FIELD; i++) {
      const l = list[REAL + i];
      if (l) F[i].set(l.x, l.y, l.z, on);
      else F[i].w = 0;
    }
    // The headlight: from the handlebar, down the road ahead (on at night and in the rain).
    const beam = Math.max(on, Math.min(1, wet) * 0.35);
    if (rider && beam > 0) {
      const fx = -Math.sin(rider.heading);
      const fz = -Math.cos(rider.heading);
      this.head.intensity = HEADLIGHT.power * beam;
      this.head.position.set(rider.x + fx * 0.45, rider.y + 0.95, rider.z + fz * 0.45);
      this.head.target.position.set(rider.x + fx * 14, rider.y, rider.z + fz * 14);
      this.head.target.updateMatrixWorld();
      // A faint fill from over the camera's shoulder: your own rider never a silhouette.
      this.fill.intensity = 9 * on;
      this.fill.position.set(p.x * 0.6 + rider.x * 0.4, p.y + 0.6, p.z * 0.6 + rider.z * 0.4);
    } else {
      this.head.intensity = 0;
      this.fill.intensity = 0;
    }
  }

  dispose() {
    for (const l of [...this.points, this.head, this.head.target, this.fill]) this.scene.remove(l);
    this.sets.clear();
  }
}

/** GLSL: the light field's pools on a flat surface at `pos` (world), its warm colour times strength. */
export const LAMP_FIELD_GLSL = /* glsl */ `
  uniform vec4 uLamps[${FIELD}];
  vec3 lampField(vec3 pos) {
    float acc = 0.0;
    for (int i = 0; i < ${FIELD}; i++) {
      vec4 L = uLamps[i];
      if (L.w <= 0.0) continue;
      vec3 d = L.xyz - pos;
      float h = max(d.y, 1.0);
      float r2 = dot(d.xz, d.xz) + h * h;
      // the pool under a lamp: cosine over distance squared, softened
      acc += L.w * h * 150.0 / (r2 * sqrt(r2));
    }
    return vec3(1.0, 0.8, 0.58) * acc;
  }`;
