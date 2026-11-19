/**
 * Monsters in parts: each kind's pixel drawing (sprites.js) is cut into
 * pieces by material and place on its letter map — a head, legs, arms,
 * wings, a tail, a shell of floating shards — and each piece hangs on its
 * own joint, so a wolf runs on four legs with its tail streaming, a bat
 * flaps, a golem swings its fists, a slime wobbles like jelly, a shardling's
 * shards circle it. People-shaped monsters (rimeguard, acolyte, matron) use
 * the full person rig instead (rig.js).
 *
 *   const a = new BeastActor('wolf', sprites.enemies.wolf[0], { scale, shadow });
 *   a.act = { move: 0…1, wind: 0…1, strike: bool, stun: bool, hurt: 0…1, air: metres };
 *   a.hitFrom(angle); a.update(dt, yaw, light);   // same surface as SpriteActor
 *
 * Parts by role: 'leg' (steps), 'arm' (swings, raised on a wind-up, slams),
 * 'wing' (flaps), 'head' (bobs, nods, looks), 'tail' (wags), 'spin' (turns
 * round the body), 'sway' (a hem or a flame that waves). Side-drawn beasts
 * (`profile`) are drawn facing +X; the far legs are the near ones again,
 * set back across the body.
 */
import * as THREE from 'three';
import { voxelPieces } from './voxel.js';
import { blobShadow, figureUniforms, figureMaterial, lightFigure } from './gfx.js';
import { springStep } from './rig.js';
import { PXM } from './sprites.js';

const TAU = Math.PI * 2;
const wrap = (a) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const clamp01 = (t) => Math.max(0, Math.min(1, t));

/* -------------------------------------------------------------- specs */

const fl = Math.floor;
/**
 * How each kind is cut: `partOf({ ch, c, r })` names the part a letter cell
 * belongs to (c, r: column and row on the letter map), `parts` each part's
 * role, joint and thickness. `pivot` is a side of the part's box, or a
 * letter-map point [c, r]. Only parts listed are cut; the rest is 'body'.
 */
export const BEAST_SPECS = {
  slime: { type: 'blob', gloss: 1, parts: { body: { role: 'body', round: 'dome' } } },
  wisp: {
    type: 'float',
    partOf: ({ r }) => (r < 5 ? 'flame' : null),
    parts: { body: { role: 'body' }, flame: { role: 'sway', pivot: 'bottom', cap: 0.14 } }
  },
  wolf: {
    type: 'quad', profile: true,
    partOf: ({ c, r }) => (r >= 9 ? (c < 9 ? 'legB' : 'legF') : fl(c) >= 14 && r < 7 ? 'head' : c < 3 && r <= 4.5 ? 'tail' : null),
    parts: { body: { role: 'body', cap: 0.2 }, head: { role: 'head', pivot: [14, 5], cap: 0.18 }, tail: { role: 'tail', pivot: [3, 3.5], cap: 0.08 }, legB: { role: 'leg', pivot: 'top', thin: 0.06 }, legF: { role: 'leg', pivot: 'top', thin: 0.06 } }
  },
  thornboar: {
    type: 'quad', profile: true,
    partOf: ({ c, r }) => (r >= 9 ? (c < 11.5 ? 'legB' : 'legF') : fl(c) >= 17 && r >= 3 ? 'head' : null),
    parts: { body: { role: 'body', cap: 0.32 }, head: { role: 'head', pivot: [17, 6], cap: 0.24 }, legB: { role: 'leg', pivot: 'top', thin: 0.08 }, legF: { role: 'leg', pivot: 'top', thin: 0.08 } }
  },
  salamander: {
    type: 'quad', profile: true, legsDrawn: 4,
    partOf: ({ c, r }) => (r >= 6 ? `leg${fl(c / 5)}` : fl(c) >= 17 ? 'head' : c < 6 && r < 4 ? 'tail' : null),
    parts: {
      body: { role: 'body', cap: 0.16 }, head: { role: 'head', pivot: [17, 3], cap: 0.15 }, tail: { role: 'tail', pivot: [6, 2.5], cap: 0.08 },
      leg0: { role: 'leg', pivot: 'top', thin: 0.05 }, leg1: { role: 'leg', pivot: 'top', thin: 0.05 }, leg2: { role: 'leg', pivot: 'top', thin: 0.05 }, leg3: { role: 'leg', pivot: 'top', thin: 0.05 }, leg4: { role: 'leg', pivot: 'top', thin: 0.05 }
    }
  },
  hornet: {
    type: 'flier', flap: 38, amp: 0.55,
    partOf: ({ ch, c }) => (ch === 'W' ? (c < 7 ? 'wingL' : 'wingR') : null),
    parts: { body: { role: 'body', cap: 0.18 }, wingL: { role: 'wing', pivot: 'inner', thin: 0.012 }, wingR: { role: 'wing', pivot: 'inner', thin: 0.012 } }
  },
  frostbat: {
    type: 'flier', flap: 13, amp: 0.75,
    partOf: ({ ch, c }) => (ch === 'W' ? (c < 8 ? 'wingL' : 'wingR') : null),
    parts: { body: { role: 'body', cap: 0.16 }, wingL: { role: 'wing', pivot: 'inner', thin: 0.02 }, wingR: { role: 'wing', pivot: 'inner', thin: 0.02 } }
  },
  thornling: {
    type: 'walker',
    partOf: ({ r, c }) => (r >= 10 ? `leg${c < 3.5 ? 0 : c < 7 ? 1 : 2}` : null),
    parts: { body: { role: 'body', cap: 0.26 }, leg0: { role: 'leg', pivot: 'top', cap: 0.06 }, leg1: { role: 'leg', pivot: 'top', cap: 0.06 }, leg2: { role: 'leg', pivot: 'top', cap: 0.06 } }
  },
  mossback: {
    type: 'walker',
    partOf: ({ r, c }) => (r >= 12 ? `leg${c < 3.5 ? 0 : c < 9 ? 1 : c < 16 ? 2 : 3}` : r < 4 ? 'shell' : null),
    parts: { body: { role: 'body', cap: 0.48, round: 'box' }, shell: { role: 'head', pivot: 'bottom', cap: 0.5 }, leg0: { role: 'leg', pivot: 'top', cap: 0.14 }, leg1: { role: 'leg', pivot: 'top', cap: 0.14 }, leg2: { role: 'leg', pivot: 'top', cap: 0.14 }, leg3: { role: 'leg', pivot: 'top', cap: 0.14 } }
  },
  burrowmole: {
    type: 'walker',
    partOf: ({ ch, r, c }) => (ch === 'C' ? (c < 7 ? 'armL' : 'armR') : r >= 10 ? (c < 7 ? 'legL' : 'legR') : null),
    parts: { body: { role: 'body', cap: 0.32 }, armL: { role: 'arm', pivot: 'top', cap: 0.08 }, armR: { role: 'arm', pivot: 'top', cap: 0.08 }, legL: { role: 'leg', pivot: 'top', cap: 0.1 }, legR: { role: 'leg', pivot: 'top', cap: 0.1 } }
  },
  shroomkin: {
    type: 'walker',
    partOf: ({ ch, r, c }) => (r < 6 ? 'head' : ch === 'G' ? (c < 7 ? 'armL' : 'armR') : r >= 13 ? (c < 7 ? 'legL' : 'legR') : null),
    parts: { body: { role: 'body', cap: 0.22 }, head: { role: 'head', pivot: 'bottom', cap: 0.3 }, armL: { role: 'arm', pivot: 'inner', cap: 0.06 }, armR: { role: 'arm', pivot: 'inner', cap: 0.06 }, legL: { role: 'leg', pivot: 'top', cap: 0.1 }, legR: { role: 'leg', pivot: 'top', cap: 0.1 } }
  },
  shardling: {
    type: 'float', gloss: 0.7,
    partOf: ({ r, c }) => (r >= 12 || (r >= 10 && (c < 2 || c >= 10)) ? 'shards' : null),
    parts: { body: { role: 'body', cap: 0.24 }, shards: { role: 'spin', pivot: 'center-x', cap: 0.08 } }
  },
  icefang: {
    type: 'quad', profile: true, gloss: 0.4,
    partOf: ({ c, r }) => (r >= 9 ? (c < 9 ? 'legB' : 'legF') : fl(c) >= 14 && r < 7 ? 'head' : c < 3 && r <= 4.5 ? 'tail' : null),
    parts: { body: { role: 'body', cap: 0.2 }, head: { role: 'head', pivot: [14, 5], cap: 0.18 }, tail: { role: 'tail', pivot: [3, 3.5], cap: 0.08 }, legB: { role: 'leg', pivot: 'top', thin: 0.06 }, legF: { role: 'leg', pivot: 'top', thin: 0.06 } }
  },
  cinderling: {
    type: 'walker',
    partOf: ({ r, c }) => (r >= 10 ? (c < 6 ? 'legL' : 'legR') : r >= 7.5 && (c < 2 || c >= 10) ? (c < 6 ? 'armL' : 'armR') : null),
    parts: { body: { role: 'body', cap: 0.26 }, armL: { role: 'arm', pivot: 'inner', cap: 0.07 }, armR: { role: 'arm', pivot: 'inner', cap: 0.07 }, legL: { role: 'leg', pivot: 'top', cap: 0.08 }, legR: { role: 'leg', pivot: 'top', cap: 0.08 } }
  },
  golem: {
    type: 'walker', heavy: true,
    partOf: ({ r, c }) => (r < 6 ? 'head' : r >= 15 ? (c < 12 ? 'legL' : 'legR') : c < 5 ? 'armL' : c >= 19 ? 'armR' : null),
    parts: { body: { role: 'body', cap: 0.46, round: 'box' }, head: { role: 'head', pivot: 'bottom', cap: 0.36 }, armL: { role: 'arm', pivot: 'top', cap: 0.2 }, armR: { role: 'arm', pivot: 'top', cap: 0.2 }, legL: { role: 'leg', pivot: 'top', cap: 0.24 }, legR: { role: 'leg', pivot: 'top', cap: 0.24 } }
  },
  lampwight: {
    type: 'float',
    partOf: ({ ch, r, c }) => (r < 11 && c >= 6 && c < 22 ? 'head' : ch === 'B' || ch === 'X' ? (c < 14 ? 'armL' : 'armR') : null),
    parts: { body: { role: 'body', cap: 0.34 }, head: { role: 'head', pivot: 'bottom', cap: 0.36 }, armL: { role: 'arm', pivot: 'top', cap: 0.06 }, armR: { role: 'arm', pivot: 'top', cap: 0.06 } }
  },
  gnarlroot: {
    type: 'walker', heavy: true,
    partOf: ({ r, c }) => (r < 6 ? 'head' : r >= 23 ? (c < 13 ? 'legL' : 'legR') : r >= 14 && r < 19 && c < 7 ? 'armL' : r >= 14 && r < 19 && c >= 19 ? 'armR' : null),
    parts: { body: { role: 'body', cap: 0.5, round: 'box' }, head: { role: 'head', pivot: 'bottom', cap: 0.6 }, armL: { role: 'arm', pivot: 'inner', cap: 0.14 }, armR: { role: 'arm', pivot: 'inner', cap: 0.14 }, legL: { role: 'leg', pivot: 'top', cap: 0.2 }, legR: { role: 'leg', pivot: 'top', cap: 0.2 } }
  },
  tyrant: {
    type: 'walker', heavy: true, flap: 4, amp: 0.3,
    partOf: ({ ch, r, c }) => (ch === 'W' || (ch === 'H' && (c < 6 || c >= 24)) ? (c < 15 ? 'wingL' : 'wingR') : r < 12 && c >= 9 && c < 21 ? 'head' : r >= 19 ? (c < 15 ? 'legL' : 'legR') : r >= 15 && c < 10 ? 'armL' : r >= 15 && c >= 20 ? 'armR' : null),
    parts: {
      body: { role: 'body', cap: 0.5 }, head: { role: 'head', pivot: 'bottom', cap: 0.4 }, wingL: { role: 'wing', pivot: 'inner', thin: 0.05 }, wingR: { role: 'wing', pivot: 'inner', thin: 0.05 },
      armL: { role: 'arm', pivot: 'inner', cap: 0.14 }, armR: { role: 'arm', pivot: 'inner', cap: 0.14 }, legL: { role: 'leg', pivot: 'top', cap: 0.2 }, legR: { role: 'leg', pivot: 'top', cap: 0.2 }
    }
  }
};
for (const [id, s] of Object.entries(BEAST_SPECS)) s.id = id;

/** A spec with its letter-map pivots turned into metres for this sprite. */
function specFor(kind, sprite) {
  const base = BEAST_SPECS[kind] ?? BEAST_SPECS.slime;
  const key = `${kind}|${sprite.width}x${sprite.height}`;
  specFor.cache ??= new Map();
  if (specFor.cache.has(key)) return specFor.cache.get(key);
  const px = (c) => (1 + c * 4 - sprite.width / 2) / PXM;
  const py = (r) => (sprite.height - 1 - r * 4) / PXM;
  const parts = {};
  for (const [n, p] of Object.entries(base.parts)) {
    let pivot = p.pivot;
    if (Array.isArray(pivot)) pivot = [px(pivot[0]), py(pivot[1])];
    parts[n] = { ...p, pivot: pivot === 'center-x' ? 'center' : pivot };
  }
  const spec = { ...base, id: kind, parts, partOf: base.partOf ?? (() => null), centerX: base.parts.shards?.pivot === 'center-x' };
  specFor.cache.set(key, spec);
  return spec;
}

/* -------------------------------------------------------------- actor */

export class BeastActor {
  constructor(kind, sprite, { shadow = 0.45, scale = 1, glow = 0, detail = 2 } = {}) {
    this.kind = kind;
    this.spec = specFor(kind, sprite);
    this.sprite = sprite;
    this.group = new THREE.Group();
    this.u = figureUniforms();
    this.self = this.u.uSelf;
    this.material = figureMaterial(this.u, { side: THREE.DoubleSide, gloss: this.spec.gloss ?? 0 });
    this.mesh = new THREE.Group(); // turns to face (the game leans it)
    this.tilt = new THREE.Group(); // flinches
    this.inner = new THREE.Group(); // squash and stretch
    this.mesh.add(this.tilt);
    this.tilt.add(this.inner);
    this.group.add(this.mesh);
    this.shadow = shadow ? blobShadow(shadow) : null;
    if (this.shadow) this.group.add(this.shadow);
    this.scale = scale;
    this.glow = glow;
    this.glowColor = null;
    this.flash = 0;
    this.lift = 0;
    this.squash = 0;
    this.tint = new THREE.Color(1, 1, 1);
    this.facing = null;
    this.detail = detail;
    this._detail = 0;
    this.act = { move: 0 };
    this.time = Math.random() * 10;
    this.walk = Math.random() * TAU;
    this.lookAt = null;
    this.onStep = null;
    this._stepPhase = 0;
    this._tx = { x: 0, v: 0 };
    this._tz = { x: 0, v: 0 };
    this._sq = { x: 0, v: 0 };
    this._lean = { x: 0, v: 0 };
    this._lastAir = 0;
    this._build();
  }

  /** (Kept for the SpriteActor surface: monsters are built once from their first frame.) */
  show() {}

  _build() {
    const step = this.detail;
    this._detail = step;
    const P = voxelPieces(this.sprite, this.spec, step);
    this.inner.clear();
    this.parts = [];
    const profile = this.spec.profile;
    // Side-drawn beasts face +X in their drawing: turn the drawing so its front is the actor's +Z.
    const frame = new THREE.Group();
    if (profile) frame.rotation.y = -Math.PI / 2;
    this.inner.add(frame);
    this.frame = frame;
    const legs = Object.keys(P.parts).filter((n) => this.spec.parts[n]?.role === 'leg').sort((a, b) => P.parts[a].pivot[0] - P.parts[b].pivot[0]);
    const depth = (this.spec.parts.body?.cap ?? this.sprite.depth ?? 0.25) * 0.62;
    for (const [name, piece] of Object.entries(P.parts)) {
      const def = this.spec.parts[name] ?? { role: 'body' };
      const copies = profile && def.role === 'leg' ? (this.spec.legsDrawn === 4 ? [legs.indexOf(name) % 2 ? -1 : 1] : [1, -1]) : [0];
      for (const side of copies) {
        const pivot = new THREE.Group();
        pivot.position.set(piece.pivot[0], piece.pivot[1], side * depth);
        const m = new THREE.Mesh(piece.geometry, this.material);
        m.castShadow = true;
        m.receiveShadow = true;
        pivot.add(m);
        frame.add(pivot);
        const legIndex = legs.indexOf(name);
        this.parts.push({
          name, role: def.role, pivot, mesh: m, side, x: piece.pivot[0], y: piece.pivot[1],
          // Gait: front-drawn legs alternate; four-legged ones trot (diagonal pairs move together).
          phase: def.role === 'leg' ? (profile ? (legIndex % 2) * Math.PI + (side < 0 ? Math.PI : 0) : (legIndex % 2) * Math.PI) : 0,
          s: [{ x: 0, v: 0 }, { x: 0, v: 0 }, { x: 0, v: 0 }]
        });
      }
    }
    this.size = P.size;
    this.inner.scale.setScalar(this.scale);
  }

  _swapDetail() {
    if (this._detail === this.detail) return;
    this._detail = this.detail;
    const P = voxelPieces(this.sprite, this.spec, this.detail);
    for (const p of this.parts) if (P.parts[p.name]) p.mesh.geometry = P.parts[p.name].geometry;
  }

  get height() {
    return (this.sprite.height / PXM) * this.scale;
  }

  /** A blow came from this direction (world heading): the whole beast jolts away from it. */
  hitFrom(angle, strength = 1) {
    const rel = wrap(angle - this.mesh.rotation.y);
    this._tx.v -= Math.cos(rel) * 10 * strength;
    this._tz.v += Math.sin(rel) * 8 * strength;
    this._sq.v -= 4 * strength;
  }

  /** Colours of its blocks (linear RGB), for the pieces it breaks into. */
  palette(n = 24) {
    if (this._palette) return this._palette;
    const out = [];
    const geos = this.parts.map((p) => p.mesh.geometry);
    for (let i = 0; i < n; i++) {
      const g = geos[i % geos.length];
      const c = g.attributes.color;
      const k = Math.floor(Math.random() * c.count);
      out.push(new THREE.Color(c.getX(k) * 1.15, c.getY(k) * 1.15, c.getZ(k) * 1.15));
    }
    return (this._palette = out);
  }

  update(dt, yaw, light) {
    this.time += dt;
    this._swapDetail();
    const a = this.act ?? {};
    const type = this.spec.type;
    const move = a.move ?? 0;
    const wind = a.wind ?? 0;
    const t = this.time;
    const heavy = this.spec.heavy;
    if (move > 0.05) this.walk += dt * (heavy ? 5 : type === 'quad' ? 11 + move * 4 : 8.5) * (a.strike ? 1.6 : 1);
    const w = this.walk;
    const phase = Math.floor(this.walk / Math.PI + 0.5);
    if (move > 0.05 && phase !== this._stepPhase && (type === 'walker' || type === 'quad')) this.onStep?.(heavy);
    this._stepPhase = phase;
    // The body: a bob as it goes, crouched on a wind-up, stretched in a strike, a slow float.
    let bob = 0, lean = 0, squashT = this.squash;
    if (type === 'float') bob = Math.sin(t * 2.2) * 0.06;
    else if (type === 'flier') bob = Math.sin(t * (this.spec.flap ?? 10) * 0.5) * 0.05;
    else if (move > 0.05) bob = Math.abs(Math.sin(w)) * (heavy ? 0.05 : type === 'quad' ? 0.06 : 0.04) * move;
    if (wind) {
      lean = type === 'quad' ? -0.18 * wind : -0.12 * wind;
      squashT -= (type === 'blob' ? 0.28 : 0.1) * wind;
    }
    if (a.strike) {
      lean = type === 'quad' ? 0.22 : 0.18;
      squashT += type === 'blob' ? 0.22 : 0.06;
    }
    if (type === 'blob') {
      // Jelly: landing squashes it flat, then it wobbles back; it breathes.
      const air = a.air ?? 0;
      if (this._lastAir > 0.15 && air < 0.05) this._sq.v -= 6;
      this._lastAir = air;
      squashT += Math.sin(t * 3.1) * 0.03 + (air > 0.1 ? 0.15 : 0);
    }
    if (a.stun) lean += Math.sin(t * 18) * 0.08;
    const sq = springStep(this._sq, squashT, dt, type === 'blob' ? 11 : 18, type === 'blob' ? 0.22 : 0.5);
    const ln = springStep(this._lean, lean, dt, 14, 0.6);
    // Flinch springs back.
    const tx = springStep(this._tx, 0, dt, 16, 0.45);
    const tz = springStep(this._tz, 0, dt, 16, 0.45);
    this.tilt.rotation.x = tx + ln;
    this.tilt.rotation.z = tz;
    const k = this.scale;
    this.inner.scale.set(k * (1 - sq * 0.55), k * (1 + sq), k * (1 - sq * 0.55));
    this.inner.position.y = bob;
    // Each part's pose.
    const profile = this.spec.profile;
    const flapK = this.spec.flap ?? 10;
    const amp = this.spec.amp ?? 0.5;
    for (const p of this.parts) {
      let rx = 0, ry = 0, rz = 0;
      switch (p.role) {
        case 'leg': {
          const swing = Math.sin(w + p.phase) * (heavy ? 0.4 : type === 'quad' ? 0.75 : 0.6) * Math.max(move, a.strike ? 1 : 0);
          const crouch = type === 'quad' ? wind * (p.x > 0 ? -0.35 : 0.45) : 0;
          if (profile) rz = swing + crouch + (a.strike ? (p.x > 0 ? 0.6 : -0.6) : 0);
          else rx = swing - wind * 0.1;
          break;
        }
        case 'arm': {
          const sideX = p.x > 0 ? 1 : -1;
          rx = -Math.sin(w) * 0.4 * move * sideX;
          // Raised on the wind-up, brought down hard in the strike.
          rx += -wind * (heavy ? 2.4 : 1.6) + (a.strike ? 0.9 : 0);
          rz = sideX * (0.12 * wind + Math.sin(t * 2 + p.x) * 0.04);
          break;
        }
        case 'wing': {
          const sideX = p.x > 0 ? 1 : -1;
          const f = Math.sin(t * flapK * (a.strike ? 1.4 : 1) + (heavy ? 0 : 0)) * amp + (heavy ? -0.1 + wind * 0.5 : 0.1);
          rz = sideX * f;
          ry = sideX * -0.15;
          break;
        }
        case 'head': {
          const nod = Math.sin(w * 2) * 0.06 * move + Math.sin(t * 1.7) * 0.025 - wind * 0.15 + (a.strike ? 0.15 : 0);
          if (profile) rz = -nod + wind * 0.25;
          else rx = nod;
          // Look toward its target.
          if (this.lookAt && !profile) {
            const wx = this.lookAt.x - this.group.position.x, wz = this.lookAt.z - this.group.position.z;
            ry = Math.max(-0.6, Math.min(0.6, wrap(Math.atan2(wx, wz) - this.mesh.rotation.y)));
          }
          break;
        }
        case 'tail': {
          ry = Math.sin(t * (move > 0.05 ? 13 : 5)) * (move > 0.05 ? 0.45 : 0.25);
          rz = 0.2 * move - 0.15 * wind;
          break;
        }
        case 'spin':
          ry = t * (1.2 + wind * 6);
          break;
        case 'sway':
          rz = Math.sin(t * 3 + p.y * 5) * 0.08;
          rx = Math.sin(t * 2.3) * 0.06;
          break;
        default:
      }
      const stiff = p.role === 'wing' || p.role === 'spin' ? 0 : p.role === 'tail' ? 10 : 24;
      if (!stiff) p.pivot.rotation.set(rx, ry, rz);
      else {
        p.pivot.rotation.x = springStep(p.s[0], rx, dt, stiff, 0.55);
        p.pivot.rotation.y = springStep(p.s[1], ry, dt, stiff, 0.55);
        p.pivot.rotation.z = springStep(p.s[2], rz, dt, stiff, 0.55);
      }
    }
    const turn = this.facing ?? yaw;
    this.mesh.rotation.y = turn;
    this.mesh.position.y = this.lift;
    if (this.flash > 0) this.flash -= dt;
    this.material.color.copy(this.tint);
    lightFigure(this.u, light, { glow: this.glow, glowColor: this.glowColor, flash: this.flash, time: this.time });
    this.u.uGlowK.value = 0.85 + 0.25 * Math.sin(t * 3.3) + wind * 0.8;
    if (this.shadow) this.shadow.material.opacity = Math.max(0.35, 1 - this.lift * 0.35) * 0.7;
  }

  dispose() {
    this.material.dispose();
    this.shadow?.material.dispose();
    this.group.removeFromParent();
  }
}

/** True for kinds this module builds (the rest are people-shaped, on the rig). */
export const isBeast = (kind) => Boolean(BEAST_SPECS[kind]);
void clamp01;

/** Build a kind's fine (near) figure ahead of time, so the first one to come close does not stall a frame. */
export function prewarmBeast(kind, sprite) {
  if (BEAST_SPECS[kind] && sprite) voxelPieces(sprite, specFor(kind, sprite), 1);
}
