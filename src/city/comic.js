import * as THREE from 'three';

const _p = new THREE.Vector3();

/**
 * The race's comic beats, in the riders' ink-and-flat-colour style: word
 * bursts that slam in and squash ("BONK!", "WHOOSH!", "DING!"), puffs of
 * dust, a ring for the air horn, wind streaks on a tailwind. Sprites in the
 * 3D street, each one short-lived; the words' pictures are made once.
 *
 *   const fx = new ComicFx(scene);
 *   fx.pop('BONK!', { x, y, z }, { color: '#ff5a3c', size: 1.2 });
 *   fx.update(dt, camera);
 */

const INK = '#2a2030';
const words = new Map();

/** A word in a jagged burst: an inked star, halftone dots, the letters fat and outlined. */
function burst(word, color) {
  const key = `${word}|${color}`;
  if (words.has(key)) return words.get(key);
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  const cx = 256;
  const cy = 128;
  // The star: long and short spikes in turn, a little uneven.
  const p = new Path2D();
  const n = 14;
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 ? 0.62 : 0.92 + ((i * 37) % 7) / 50;
    const x = cx + Math.cos(a) * 230 * r;
    const y = cy + Math.sin(a) * 112 * r;
    if (i) p.lineTo(x, y);
    else p.moveTo(x, y);
  }
  p.closePath();
  g.fillStyle = '#fff7d6';
  g.fill(p);
  g.save();
  g.clip(p);
  // Halftone on the shaded side.
  g.fillStyle = 'rgba(255, 190, 80, 0.55)';
  for (let y = 0; y < 256; y += 9) for (let x = 0; x < 512; x += 9) {
    const k = (x - 120 + y * 0.8) / 520;
    if (k < 0.45) continue;
    g.beginPath();
    g.arc(x + (y % 18 ? 4 : 0), y, 1.2 + k * 2.4, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 7;
  g.lineJoin = 'round';
  g.stroke(p);
  // The letters.
  const size = word.length > 6 ? 70 : 88;
  g.font = `900 ${size}px "Arial Black", Impact, system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.save();
  g.translate(cx, cy + 4);
  g.rotate(-0.08);
  g.lineWidth = 16;
  g.strokeStyle = INK;
  g.strokeText(word, 0, 0);
  const grad = g.createLinearGradient(0, -size / 2, 0, size / 2);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.35, color);
  grad.addColorStop(1, color);
  g.fillStyle = grad;
  g.fillText(word, 0, 0);
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  words.set(key, t);
  return t;
}

let puffTex = null;
/** A soft cartoon puff: a lumpy cloud with a darker underside. */
function puff() {
  if (puffTex) return puffTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  for (const [x, y, r] of [[32, 34, 18], [20, 38, 12], [44, 38, 12], [30, 24, 12], [40, 28, 10]]) {
    g.fillStyle = '#e9e2d4';
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  // (the underside shaded on the cloud only — not a grey box round it)
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(150,140,130,0.35)';
  g.fillRect(0, 40, 64, 24);
  g.globalCompositeOperation = 'source-over';
  puffTex = new THREE.CanvasTexture(c);
  puffTex.colorSpace = THREE.SRGBColorSpace;
  return puffTex;
}

let ringTex = null;
function ringTexture() {
  if (ringTex) return ringTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.strokeStyle = '#ffffff';
  g.lineWidth = 8;
  g.setLineDash([16, 10]);
  g.beginPath();
  g.arc(64, 64, 54, 0, Math.PI * 2);
  g.stroke();
  ringTex = new THREE.CanvasTexture(c);
  return ringTex;
}

let streakTex = null;
function streakTexture() {
  if (streakTex) return streakTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 16;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 128, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.7, 'rgba(220,245,255,0.9)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 6, 128, 4);
  streakTex = new THREE.CanvasTexture(c);
  return streakTex;
}

export class ComicFx {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.live = [];
  }

  _sprite(tex, opts = {}) {
    // (alphaTest: whatever is clear in the picture is never drawn at all — not as a dark card round a
    // puff or a word in a pass that ignores blending)
    const m = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.02, depthWrite: false, depthTest: opts.depthTest ?? true, color: opts.color ?? '#ffffff' });
    const s = new THREE.Sprite(m);
    s.renderOrder = 10;
    this.group.add(s);
    return s;
  }

  /** A word bursting in over a place: slams in past full size, wobbles, rises, snaps away. */
  pop(word, at, { color = '#ffd23a', size = 1 } = {}) {
    const s = this._sprite(burst(word, color), { depthTest: false });
    // (`at.ride`: something moving — a racer — that the word rides along with, so it isn't left behind at 70 km/h)
    this.live.push({ s, kind: 'pop', t: 0, life: 1.0, at: { x: at.x, y: at.y, z: at.z }, ride: at.ride ?? null, r0: at.ride ? { x: at.ride.x, z: at.ride.z } : null, size: size * 1.4 });
  }

  /** Puffs of dust where something hit the ground. */
  dust(at, n = 6) {
    for (let k = 0; k < n; k++) {
      const s = this._sprite(puff());
      const a = Math.random() * Math.PI * 2;
      const sp = 0.8 + Math.random() * 1.6;
      this.live.push({ s, kind: 'dust', t: 0, life: 0.6 + Math.random() * 0.4, at: { x: at.x, y: at.y + 0.2, z: at.z }, v: { x: Math.cos(a) * sp, y: 0.6 + Math.random(), z: Math.sin(a) * sp }, size: 0.4 + Math.random() * 0.35 });
    }
  }

  /** A ring going out (the air horn's blast). */
  ring(at, color) {
    const s = this._sprite(ringTexture(), { color });
    this.live.push({ s, kind: 'ring', t: 0, life: 0.6, at: { ...at } });
  }

  /** A streak of wind going by (a tailwind). */
  streak(at, heading) {
    const s = this._sprite(streakTexture());
    this.live.push({ s, kind: 'streak', t: 0, life: 0.35, at: { ...at }, v: { x: Math.sin(heading) * 14, y: 0, z: Math.cos(heading) * 14 }, size: 1.6 });
  }

  update(dt, camera = null) {
    for (const f of [...this.live]) {
      f.t += dt;
      const k = f.t / f.life;
      const s = f.s;
      if (k >= 1) {
        this.group.remove(s);
        s.material.dispose();
        this.live.splice(this.live.indexOf(f), 1);
        continue;
      }
      if (f.kind === 'pop') {
        // In: overshoot and settle (squash and stretch); out: squeeze away.
        const inK = Math.min(1, f.t / 0.08);
        const wob = f.t < 0.6 ? 1 + 0.2 * Math.exp(-(f.t - 0.08) * 10) * Math.cos((f.t - 0.08) * 34) : 1 - Math.min(1, (f.t - 0.6) / 0.4) ** 2;
        // (never bigger on screen than one about 7 m off: a pop right by the camera would fill it)
        const near = camera ? Math.min(1, camera.position.distanceTo(_p.set(f.at.x + (f.ride ? f.ride.x - f.r0.x : 0), f.at.y, f.at.z + (f.ride ? f.ride.z - f.r0.z : 0))) / 7) : 1;
        const sc = f.size * near * (f.t < 0.08 ? 0.3 + 0.9 * inK : wob);
        s.scale.set(sc * 2 * (1 + (1 - inK) * 0.3), sc * (1 - (1 - inK) * 0.2), 1);
        const ox = f.ride ? f.ride.x - f.r0.x : 0;
        const oz = f.ride ? f.ride.z - f.r0.z : 0;
        s.position.set(f.at.x + ox, f.at.y + f.t * 0.9, f.at.z + oz);
        s.material.opacity = 1;
      } else if (f.kind === 'dust') {
        f.at.x += f.v.x * dt;
        f.at.y += f.v.y * dt;
        f.at.z += f.v.z * dt;
        f.v.y -= 1.5 * dt;
        s.position.set(f.at.x, f.at.y, f.at.z);
        s.scale.setScalar(f.size * (1 + k * 1.6));
        s.material.opacity = 1 - k;
      } else if (f.kind === 'ring') {
        s.position.set(f.at.x, f.at.y - 0.8, f.at.z);
        s.scale.setScalar(1 + k * 14);
        s.material.opacity = 1 - k;
      } else if (f.kind === 'streak') {
        f.at.x += f.v.x * dt;
        f.at.z += f.v.z * dt;
        s.position.set(f.at.x, f.at.y, f.at.z);
        s.scale.set(f.size, 0.12, 1);
        s.material.opacity = 1 - k;
      }
    }
  }

  dispose() {
    for (const f of this.live) f.s.material.dispose();
    this.live = [];
    this.scene.remove(this.group);
  }
}
