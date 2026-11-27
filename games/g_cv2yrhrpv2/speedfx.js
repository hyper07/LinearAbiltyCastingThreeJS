import * as THREE from 'three';

/**
 * What sells 70 km/h on a scooter (racing-study §4, after Snowpuff's speed
 * kit): wind lines in the air round the rider — thin bright streaks hanging
 * in the street that rush past as you go, more and longer the faster you
 * are — and the wind's roar in your ears (a filtered noise that opens up
 * with speed). The FOV ramp and the shake are the race camera's.
 *
 *   const fx = new SpeedFx(scene);
 *   fx.update(dt, { x, y, z, heading, v, k, camera });  // k: 0 (slow) … 1 (flat out)
 */

const N = 70;

/** How strong the speed feel is at a speed (m/s): nothing below about 45 km/h, full at 70, a touch more on a boost. */
export function speedFeel(v, cruise = 19.45) {
  return Math.max(0, Math.min(1.25, (v - cruise * 0.62) / (cruise * 0.38)));
}

export class SpeedFx {
  constructor(scene) {
    this.scene = scene;
    this.pos = new Float32Array(N * 6);
    this.col = new Float32Array(N * 6);
    this.lines = Array.from({ length: N }, () => ({ x: 0, y: 0, z: 0, live: false, a: 0 }));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.mesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 9;
    scene.add(this.mesh);
  }

  update(dt, { x, y, z, heading, v, k }) {
    const fx = -Math.sin(heading);
    const fz = -Math.cos(heading);
    const rx = -fz;
    const rz = fx;
    const want = Math.round(N * Math.min(1, k));
    let live = 0;
    for (const l of this.lines) if (l.live) live++;
    const len = 0.6 + v * 0.11 * Math.min(1, k + 0.2);
    for (const [i, l] of this.lines.entries()) {
      // behind the rider or too far off: gone (and, if wanted, out ahead again)
      const dx = l.x - x;
      const dz = l.z - z;
      const along = dx * fx + dz * fz;
      if (l.live && (along < -6 || along > 60 || Math.abs(dx * rx + dz * rz) > 14)) {
        l.live = false;
        live--;
      }
      if (!l.live && live < want && Math.random() < 0.5) {
        // out ahead, round the rider's line: either side, from knee height to over the head, never right in front
        const side = (Math.random() < 0.5 ? -1 : 1) * (1.4 + Math.random() * 6);
        const ahead = 10 + Math.random() * 40;
        l.x = x + fx * ahead + rx * side;
        l.z = z + fz * ahead + rz * side;
        l.y = y + 0.3 + Math.random() * 2.6;
        l.a = 0;
        l.live = true;
        live++;
      }
      l.a = l.live ? Math.min(1, l.a + dt * 5) : 0;
      // a streak along the way you go, its back end trailing (it hangs still; you rush by it)
      const b = l.live ? Math.min(1, k) * l.a * 0.55 : 0;
      this.pos.set([l.x, l.y, l.z, l.x - fx * len, l.y, l.z - fz * len], i * 6);
      this.col.set([b, b, b * 1.05, 0, 0, 0], i * 6);
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.color.needsUpdate = true;
    this.mesh.visible = k > 0.01;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

/**
 * The wind in your ears: noise through a band-pass that opens and rises with speed (a hiss at 40, a roar at 85).
 * `audio` an AudioContext; returns { set(k) } — k 0…1.25 from speedFeel — and stop().
 */
export function windNoise(audio) {
  const buf = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
  const d = buf.getChannelData(0);
  // pink-ish: a little smoothing of white noise
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    last = last * 0.86 + (Math.random() * 2 - 1) * 0.14;
    d[i] = last * 3.2;
  }
  const src = audio.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const band = audio.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 0.6;
  band.frequency.value = 500;
  const gain = audio.createGain();
  gain.gain.value = 0;
  src.connect(band).connect(gain).connect(audio.destination);
  src.start();
  return {
    gain,
    set(k, gust = 0) {
      const t = audio.currentTime;
      band.frequency.setTargetAtTime(380 + k * 900 + gust * 400, t, 0.15);
      gain.gain.setTargetAtTime(Math.min(0.16, 0.11 * k * k + gust * 0.03), t, 0.2);
    },
    stop() {
      gain.gain.value = 0;
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
    }
  };
}
