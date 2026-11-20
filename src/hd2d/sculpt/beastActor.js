/**
 * A sculpted monster: one skinned vinyl-toy mesh per kind (sculpt/beasts.js
 * recipes, built once and shared), animated in code the way beasts.js
 * animated the voxel monsters — legs step (four-legged ones trot), arms rise
 * on the wind-up and come down in the strike, wings flap, heads nod and look
 * at their target, tails wag, shards circle — with AI Arcademia's squash and
 * stretch, and a face that snarls on the wind-up, roars in the strike, winces
 * when hit and goes dizzy when stunned.
 *
 * The same surface as BeastActor (beasts.js), so foes.js, coop.js and the
 * game drive it unchanged:
 *   a.act = { move, wind, strike, stun, hurt, air }; a.hitFrom(angle); a.update(dt, yaw, light)
 *   a.flash, a.tint, a.glow, a.glowColor (an elite's: its accents take the colour), a.lift, a.squash,
 *   a.facing, a.detail (1 near, 2 far), a.lookAt, a.onStep, a.palette(), a.height, a.material
 */
import * as THREE from 'three';
import { blobShadow, figureUniforms, lightFigure } from '../gfx.js';
import { springStep } from '../rig.js';
import { BEAST_RECIPES } from './beasts.js';
import { modelFor, geometryFor, geometryReady, requestGeometry } from './build.js';
import { sculptMaterial, setPalette, outlineMaterial, inkFor } from './material.js';
import { buildFace } from './face.js';
import { beastExpression } from './mapping.js';

const TAU = Math.PI * 2;
const wrap = (a) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const SEEDS = {};
const recipeOf = (kind) => BEAST_RECIPES[kind]((SEEDS[kind] ??= kind.length * 7 + 3));

/** Build a kind's near mesh ahead of time, in the background (so the first one close does not stall). */
export function prewarmSculptedBeast(kind) {
  if (!BEAST_RECIPES[kind]) return;
  const make = () => recipeOf(kind);
  geometryFor(`beast|${kind}`, make, 'far');
  requestGeometry(`beast|${kind}`, make, 'near');
}

export class SculptBeastActor {
  constructor(kind, _sprite = null, { shadow = 0.45, scale = 1, glow = 0, detail = 2 } = {}) {
    this.kind = kind;
    this.key = `beast|${kind}`;
    this._make = () => recipeOf(kind);
    this.model = modelFor(this.key, this._make);
    const R = (this.recipe = this.model.recipe);
    this.spec = { type: R.type, heavy: R.heavy };
    this.group = new THREE.Group();
    this.u = figureUniforms();
    this.self = this.u.uSelf;
    this.material = sculptMaterial(this.u, { gloss: R.gloss ?? 0.3, fur: R.fur ?? 0 });
    setPalette(this.material, R.palette, R.glows);
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
    this._accent = null;
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

  /** (The SpriteActor surface: a monster is built once.) */
  show() {}

  _build() {
    const R = this.recipe;
    // The skeleton: a group per bone at its rest offset; the roots hang from `inner`.
    const byName = {};
    for (const [name, , x, y, z] of R.bones) {
      const o = new THREE.Group();
      o.name = name;
      o.userData.rest = new THREE.Vector3(x, y, z);
      byName[name] = o;
    }
    for (const [name, parent] of R.bones) {
      const o = byName[name];
      if (parent) {
        byName[parent].add(o);
        o.position.copy(o.userData.rest).sub(byName[parent].userData.rest);
      } else {
        this.inner.add(o);
        o.position.copy(o.userData.rest);
      }
    }
    this.bones = byName;
    const list = R.bones.map(([n]) => byName[n]);
    this.skeleton = new THREE.Skeleton(list, R.bones.map(([, , x, y, z]) => new THREE.Matrix4().makeTranslation(-x, -y, -z)));
    this.parts = R.bones
      .filter(([n]) => R.roles?.[n])
      .map(([n, , x, y, z]) => ({ name: n, ...R.roles[n], pivot: byName[n], x, y, z, s: [{ x: 0, v: 0 }, { x: 0, v: 0 }, { x: 0, v: 0 }] }));
    this.headBone = byName.head ?? byName[R.bones[0][0]];
    this.headPos = this.headBone.userData.rest.clone();
    this.inner.scale.setScalar(this.scale);
    this._lod = null;
    this._swapDetail(true);
  }

  /** The mesh at this detail (the far one while the near one builds) and its face. */
  _swapDetail(first = false) {
    if (!first && this._detail === this.detail) return;
    const want = this.detail === 1 ? 'near' : 'far';
    let lod = want;
    let geo = geometryReady(this.key, want);
    if (!geo) {
      if (want === 'near') {
        requestGeometry(this.key, this._make, 'near');
        geo = geometryFor(this.key, this._make, 'far');
        lod = 'far';
      } else geo = geometryFor(this.key, this._make, 'far');
    }
    this._detail = lod === want ? this.detail : -1;
    if (this._lod === lod) return;
    this._lod = lod;
    if (!this.skin) {
      this.skin = new THREE.SkinnedMesh(geo, this.material);
      this.skin.bind(this.skeleton, new THREE.Matrix4());
      this.skin.castShadow = true;
      this.skin.receiveShadow = true;
      this.hull = new THREE.SkinnedMesh(geo, this._outline());
      this.hull.bind(this.skeleton, new THREE.Matrix4());
      this.hull.raycast = () => {};
      this.inner.add(this.skin, this.hull);
    } else {
      this.skin.geometry = geo;
      this.hull.geometry = geo;
    }
    this.skin.boundingSphere = this.hull.boundingSphere = geo.boundingSphere.clone();
    this.skin.boundingSphere.radius *= 1.4;
    this.face?.dispose();
    this.face = buildFace({ sdf: this.model.sdf, f: this.recipe.face, headBone: this.headBone, headPos: this.headPos, lidMaterial: this.material, lidSlot: 0, key: this.key, low: lod === 'far' });
  }

  /** The outline: a dark ink of the body; a boss's (and a hero monster's) in its colour, a little thicker. */
  _outline() {
    const w = 0.016 * (this.recipe.height > 2 ? 1.6 : 1);
    if (this.glowColor) return outlineMaterial(`#${this.glowColor.clone().multiplyScalar(1.2).getHexString()}`, w * 1.5);
    if (this.recipe.outline) return outlineMaterial(this.recipe.outline, w * 1.3);
    return outlineMaterial(inkFor(this.recipe.palette[0]), w);
  }

  get height() {
    return this.recipe.height * this.scale;
  }

  /** A blow came from this direction (world heading): the whole beast jolts away from it. */
  hitFrom(angle, strength = 1) {
    const rel = wrap(angle - this.mesh.rotation.y);
    this._tx.v -= Math.cos(rel) * 10 * strength;
    this._tz.v += Math.sin(rel) * 8 * strength;
    this._sq.v -= 4 * strength;
  }

  /** Colours of its body (linear RGB), for the pieces it breaks into. */
  palette(n = 24) {
    if (this._palette) return this._palette;
    const P = this.material.userData.sculpt.uPal.value;
    const weights = [6, 3, 2, 2, 1, 1, 1, 0];
    const pool = [];
    weights.forEach((w, i) => {
      for (let k = 0; k < w; k++) pool.push(P[i]);
    });
    const out = [];
    for (let i = 0; i < n; i++) out.push(pool[i % pool.length].clone().multiplyScalar(1.15));
    return (this._palette = out);
  }

  update(dt, yaw, light) {
    this.time += dt;
    this._swapDetail();
    // An elite's accents (ridges, cracks, crystals) take its colour and glow.
    if (this.glowColor && this._accent !== this.glowColor) {
      this._accent = this.glowColor;
      const pal = [...this.recipe.palette];
      const glows = [...this.recipe.glows];
      pal[3] = `#${this.glowColor.clone().multiplyScalar(1.25).getHexString()}`;
      glows[3] = Math.max(glows[3] ?? 0, 0.8);
      setPalette(this.material, pal, glows);
      this._palette = null;
      if (this.hull) this.hull.material = this._outline();
    }
    const a = this.act ?? {};
    const type = this.spec.type;
    const heavy = this.spec.heavy;
    const move = a.move ?? 0;
    const wind = a.wind ?? 0;
    const t = this.time;
    if (move > 0.05) this.walk += dt * (heavy ? 5 : type === 'quad' ? 11 + move * 4 : 8.5) * (a.strike ? 1.6 : 1);
    const w = this.walk;
    const phase = Math.floor(this.walk / Math.PI + 0.5);
    if (move > 0.05 && phase !== this._stepPhase && (type === 'walker' || type === 'quad')) this.onStep?.(heavy);
    this._stepPhase = phase;
    // The body: a squash-and-stretch bounce as it goes, crouched on a wind-up, stretched in a strike, a slow float.
    let bob = 0, lean = 0, squashT = this.squash;
    if (type === 'float') bob = Math.sin(t * 2.2) * 0.06;
    else if (type === 'flier') bob = Math.sin(t * (this.recipe.flap ?? 10) * 0.5) * 0.05;
    else if (move > 0.05) {
      const b = Math.abs(Math.sin(w));
      bob = b * (heavy ? 0.05 : type === 'quad' ? 0.07 : 0.06) * move;
      squashT += (b - 0.45) * (heavy ? 0.04 : 0.09) * move;
    } else squashT += Math.sin(t * 2.3) * 0.015;
    if (wind) {
      lean = type === 'quad' ? -0.18 * wind : -0.12 * wind;
      squashT -= (type === 'blob' ? 0.28 : 0.12) * wind;
    }
    if (a.strike) {
      lean = type === 'quad' ? 0.22 : 0.18;
      squashT += type === 'blob' ? 0.22 : 0.08;
    }
    if (type === 'blob') {
      const air = a.air ?? 0;
      if (this._lastAir > 0.15 && air < 0.05) this._sq.v -= 6;
      this._lastAir = air;
      squashT += Math.sin(t * 3.1) * 0.03 + (air > 0.1 ? 0.15 : 0);
    }
    if (a.stun) lean += Math.sin(t * 18) * 0.08;
    const sq = springStep(this._sq, squashT, dt, type === 'blob' ? 11 : 18, type === 'blob' ? 0.22 : 0.5);
    const ln = springStep(this._lean, lean, dt, 14, 0.6);
    const tx = springStep(this._tx, 0, dt, 16, 0.45);
    const tz = springStep(this._tz, 0, dt, 16, 0.45);
    this.tilt.rotation.x = tx + ln;
    this.tilt.rotation.z = tz;
    const k = this.scale;
    this.inner.scale.set(k * (1 - sq * 0.55), k * (1 + sq), k * (1 - sq * 0.55));
    this.inner.position.y = bob;
    // Each bone's pose by its role.
    const flapK = this.recipe.flap ?? 10;
    const amp = this.recipe.amp ?? 0.5;
    for (const p of this.parts) {
      let rx = 0, ry = 0, rz = 0;
      const sideX = p.x > 0 ? 1 : p.x < 0 ? -1 : 0;
      switch (p.role) {
        case 'leg': {
          rx = Math.sin(w + (p.phase ?? 0)) * (heavy ? 0.4 : type === 'quad' ? 0.75 : 0.6) * Math.max(move, a.strike ? 1 : 0);
          // A four-legged one crouches on its hind legs to spring, and stretches out in the strike.
          if (type === 'quad') rx += wind * (p.z > 0 ? -0.35 : 0.45) + (a.strike ? (p.z > 0 ? -0.6 : 0.6) : 0);
          else rx -= wind * 0.1;
          break;
        }
        case 'arm': {
          rx = -Math.sin(w) * 0.4 * move * sideX;
          rx += -wind * (heavy ? 2.4 : 1.6) + (a.strike ? 0.9 : 0);
          rz = -sideX * (0.12 * wind + Math.sin(t * 2 + p.x) * 0.04);
          break;
        }
        case 'wing': {
          const f = Math.sin(t * flapK * (a.strike ? 1.4 : 1)) * amp + (heavy ? -0.1 + wind * 0.5 : 0.1);
          rz = -sideX * f;
          ry = sideX * 0.15;
          break;
        }
        case 'head': {
          rx = -(Math.sin(w * 2) * 0.06 * move + Math.sin(t * 1.7) * 0.025 - wind * 0.15 + (a.strike ? 0.15 : 0)) + (a.stun ? Math.sin(t * 9) * 0.1 : 0);
          if (this.lookAt) {
            const wx = this.lookAt.x - this.group.position.x, wz = this.lookAt.z - this.group.position.z;
            ry = Math.max(-0.6, Math.min(0.6, wrap(Math.atan2(wx, wz) - this.mesh.rotation.y)));
          }
          if (a.stun) rz = Math.sin(t * 6) * 0.2;
          break;
        }
        case 'tail':
          ry = Math.sin(t * (move > 0.05 ? 13 : 5)) * (move > 0.05 ? 0.45 : 0.25);
          rx = -0.2 * move + 0.15 * wind;
          break;
        case 'spin':
          ry = t * (1.2 + wind * 6);
          break;
        case 'sway':
          rz = Math.sin(t * 3 + p.y * 5) * 0.1;
          rx = Math.sin(t * 2.3) * 0.08 - wind * 0.15;
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
    if (this.face) {
      this.face.set(beastExpression(a));
      this.face.update(dt);
    }
    this.mesh.rotation.y = this.facing ?? yaw;
    this.mesh.position.y = this.lift;
    if (this.flash > 0) this.flash -= dt;
    this.material.color.copy(this.tint);
    lightFigure(this.u, light, { glow: this.glow, glowColor: this.glowColor, flash: this.flash, time: this.time });
    this.u.uGlowK.value = 0.85 + 0.25 * Math.sin(t * 3.3) + wind * 0.8;
    if (this.shadow) this.shadow.material.opacity = Math.max(0.35, 1 - this.lift * 0.35) * 0.7;
  }

  dispose() {
    this.material.dispose();
    this.skeleton.dispose(); // its bone texture
    this.face?.dispose();
    this.shadow?.material.dispose();
    this.group.removeFromParent();
  }
}
