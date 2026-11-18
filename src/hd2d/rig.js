/**
 * Jointed 3D characters: a person's solid pixel figure (voxel.js) in parts —
 * head, body, arms, legs — on joints, posed every frame from what they are
 * doing, wearing their gear (gear3d.js: weapon, shield or tome or bow, hat or
 * helmet, pauldrons, a cape that sways), each in its item's colour with a glint
 * for rare and better.
 *
 * Same surface as SpriteActor (gfx.js), so the game drives either:
 *   actor.show(sprite); actor.setGear(look); actor.update(dt, yaw, light); actor.facing, lift, flash, tint …
 * plus `actor.act` — what the body is doing this frame:
 *   { move: 0…1, swing: { pose, t: 0…1 } | null, pose: { id, t } | null, spin: 0…1 | null,
 *     cast: 0…1 | null, roll: 0…1 | null, guard: bool, hurt: 0…1, dead: bool, talk: bool }
 *
 * Swing poses follow the weapon: sweepR / sweepL / smash (sword), heavyR / heavyL
 * (axe, mace, long sword — bigger, slower arcs), jabR / jabL / stab (dagger),
 * thrust (spear), bolt / bolt3 (staff), shot / power (bow). Skill poses: lunge,
 * overhead, bash, guard, plant, slam, nova, raise, draw, skyshot.
 */
import * as THREE from 'three';
import { voxelParts } from './voxel.js';
import { blobShadow } from './gfx.js';
import { weaponGeometry, offhandGeometry, headGeometry, pauldronGeometry, capeGeometry } from './gear3d.js';

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const out = (t) => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.max(0, Math.min(1, t));

/** A Lambert material that keeps its own colours readable in the dark (lit by `self`), as the figures do. */
function selfLit(self, params = {}) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, ...params });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uSelf = self;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uSelf;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uSelf;');
  };
  return m;
}

export class RigActor {
  /** @param {{ shadow?: number, scale?: number, sword?: boolean, glow?: number }} options */
  constructor({ shadow = 0.45, scale = 1, sword = false, glow = 0 } = {}) {
    this.group = new THREE.Group();
    this.self = { value: new THREE.Color(0.4, 0.4, 0.4) };
    this.material = selfLit(this.self, { side: THREE.DoubleSide });
    this.gearMat = selfLit(this.self);
    // body: turns and lifts; hips: the joint the whole upper body and the legs hang from.
    this.mesh = new THREE.Group(); // (named as SpriteActor's, for the game's lean and blink)
    this.body = new THREE.Group();
    this.mesh.add(this.body);
    this.group.add(this.mesh);
    this.shadow = shadow ? blobShadow(shadow) : null;
    if (this.shadow) this.group.add(this.shadow);
    this.scale = scale;
    this.glow = glow;
    this.sprite = null;
    this.flash = 0;
    this.lift = 0;
    this.squash = 0;
    this.tint = new THREE.Color(1, 1, 1);
    this.facing = null;
    this.act = { move: 0 };
    this.walk = 0;
    this.speed = 0;
    this.time = Math.random() * 10;
    this.joints = null;
    this.tip = new THREE.Vector3();
    this.mid = new THREE.Vector3();
    this.look = sword ? { weapon: { shape: 'shortsword', type: 'shortsword', color: '#d8e2ea' } } : null;
    this.pieces = [];
    this.glowMats = [];
    this.glowColor = null;
  }

  /** Dress the rig in a figure (the rig walks it — walk frames are not needed). Gear is hung again. */
  show(sprite) {
    if (this.sprite === sprite) return;
    this.sprite = sprite;
    const { parts, joints, size } = voxelParts(sprite);
    this.body.clear();
    const mk = (name) => {
      const pivot = new THREE.Group();
      pivot.position.set(...joints[name]);
      const m = new THREE.Mesh(parts[name], this.material);
      m.castShadow = true;
      m.receiveShadow = true;
      pivot.add(m);
      return pivot;
    };
    const hips = mk('torso');
    const head = mk('head');
    // The head and the arms hang from the body (so a twist of the body takes them along).
    head.position.sub(hips.position);
    const armNeg = mk('armNeg');
    const armPos = mk('armPos');
    armNeg.position.sub(hips.position);
    armPos.position.sub(hips.position);
    hips.add(head, armNeg, armPos);
    const legNeg = mk('legNeg');
    const legPos = mk('legPos');
    this.body.add(hips, legNeg, legPos);
    this.joints = { hips, torso: hips, head, armNeg, armPos, legNeg, legPos, hipY: joints.torso[1], height: size.height, armLength: size.armLength, shoulderY: joints.armNeg[1] - joints.torso[1] };
    this.body.scale.setScalar(this.scale);
    this._hang();
  }

  /**
   * Wear a gear look (items.js gearLook, or a plain { weapon, offhand, head,
   * chest, cape } for people and monsters): the meshes go on the joints.
   */
  setGear(look) {
    this.look = look;
    this._hang();
  }

  _glowMat(hex, strength = 0.7) {
    const m = selfLit(this.self);
    m.emissive.set(hex);
    m.userData.base = strength;
    this.glowMats.push(m);
    return m;
  }

  /** Hang the gear meshes on the joints (after show(), and whenever the gear changes). */
  _hang() {
    for (const p of this.pieces) p.removeFromParent();
    this.pieces = [];
    for (const m of this.glowMats) m.dispose();
    this.glowMats = [];
    this.sword = this.weapon = this.bow = this.shield = null;
    this.swordTip = this.swordMid = null;
    this.cape = null;
    const J = this.joints;
    const L = this.look;
    if (!J || !L) return;
    const mats = (glow, strength) => [this.gearMat, glow ? this._glowMat(glow, strength) : this.gearMat];
    const hand = J.armLength - 0.06;
    const piece = (geo, parent, glow, strength = 0.7) => {
      const m = new THREE.Mesh(geo, mats(glow, strength));
      m.castShadow = true;
      parent.add(m);
      this.pieces.push(m);
      return m;
    };
    const w = L.weapon;
    if (w) {
      const shape = w.shape ?? w.type;
      if (shape === 'bow') {
        const b = piece(weaponGeometry({ shape: 'bow', color: w.color, glow: w.glow }), J.armPos, w.glow);
        b.position.set(0.02, -hand, 0.06);
        this.bow = b;
      } else {
        const m = piece(weaponGeometry({ shape, color: w.color, glow: w.glow }), J.armNeg, w.glow ?? (shape === 'staff' ? '#7ad8ff' : null), shape === 'staff' && !w.glow ? 0.45 : 0.7);
        m.position.set(0, -hand, 0.04);
        m.rotation.x = -0.35;
        this.weapon = this.sword = m;
        const len = { longsword: 1.3, dagger: 0.48, axe: 0.82, mace: 0.72, hammer: 0.9, spear: 1.55, staff: 1.45 }[shape] ?? 0.86;
        this.swordTip = new THREE.Object3D();
        this.swordTip.position.set(0, 0, len);
        this.swordMid = new THREE.Object3D();
        this.swordMid.position.set(0, 0, len * 0.3);
        m.add(this.swordTip, this.swordMid);
      }
      this.weaponShape = shape;
      this.twoHanded = Boolean(w.twoHanded) || shape === 'spear';
    } else this.weaponShape = null;
    const o = L.offhand;
    if (o) {
      const geo = offhandGeometry({ shape: o.shape, color: o.color, glow: o.glow });
      if (o.shape === 'quiver') {
        const q = piece(geo, J.torso, o.glow);
        q.position.set(0.18, J.shoulderY - 0.1, -0.34);
        q.rotation.z = -0.35;
      } else {
        const s = piece(geo, J.armPos, o.glow);
        if (o.shape === 'tome') s.position.set(0.1, -hand + 0.05, 0.08);
        else {
          s.position.set(0.15, -hand * 0.62, 0.02);
          this.shield = s;
        }
      }
    }
    const h = L.head;
    if (h) {
      const m = piece(headGeometry({ shape: h.shape, color: h.color, glow: h.glow }), J.head, h.glow, 0.5);
      m.position.set(0, 0, 0.0);
    }
    const c = L.chest;
    if (c?.weight === 'heavy') {
      const pr = piece(pauldronGeometry(c, -1), J.armNeg, c.glow, 0.4);
      pr.position.set(-0.04, 0.0, 0);
      const pl = piece(pauldronGeometry(c, 1), J.armPos, c.glow, 0.4);
      pl.position.set(0.04, 0.0, 0);
    }
    if (L.cape) {
      // Three strips on hinges, from the shoulders down the back.
      let parent = J.torso;
      const strips = [];
      for (let i = 0; i < 3; i++) {
        const hinge = new THREE.Group();
        hinge.position.set(0, i === 0 ? J.shoulderY + 0.02 : -0.24, i === 0 ? -0.34 : 0);
        parent.add(hinge);
        if (i === 0) this.pieces.push(hinge);
        const m = new THREE.Mesh(capeGeometry(L.cape, i), [this.gearMat, L.cape.hem ? this._glowMat(L.cape.hem, 0.35) : this.gearMat]);
        m.castShadow = true;
        hinge.add(m);
        strips.push(hinge);
        parent = hinge;
      }
      this.cape = strips;
    }
  }

  get height() {
    return (this.joints?.height ?? 1.6) * this.scale;
  }

  /** Per frame: pose from `act`, turn, light. */
  update(dt, yaw, light) {
    this.time += dt;
    const J = this.joints;
    if (!J) return;
    const a = this.act ?? {};
    const move = a.move ?? 0;
    if (move > 0.05) this.walk += dt * (6.5 + move * 5);
    const s = Math.sin(this.walk);
    const breathe = Math.sin(this.time * 2.2);
    const shape = this.weaponShape;
    // Rest pose, holding whatever is held, then the walk on top.
    let hipsRx = move * 0.12, hipsRy = 0, hipsRz = 0, bodyRx = 0, bodyRy = 0, lift = this.lift + Math.abs(Math.cos(this.walk)) * 0.05 * move;
    let headRx = breathe * 0.02, headRy = 0;
    let aN = [s * 0.55 * move + breathe * 0.03, 0, -0.08];
    let aP = [-s * 0.55 * move - breathe * 0.03, 0, 0.08];
    let lN = [-s * 0.7 * move, 0, 0];
    let lP = [s * 0.7 * move, 0, 0];
    let grip = -0.35;
    let squash = this.squash + breathe * 0.008;
    if (shape === 'bow') aP = [-0.35 - s * 0.2 * move, 0, 0.12];
    else if (shape === 'staff') {
      aN = [-0.3 + s * 0.15 * move, 0, -0.12];
      grip = -1.15;
    } else if (shape === 'spear') {
      aN = [-0.45 + s * 0.15 * move, 0, -0.1];
      aP = [-0.6 - s * 0.15 * move, -0.4, 0.2];
      grip = 0.2;
    } else if (shape === 'longsword') {
      aN = [-0.75 + s * 0.08 * move, 0.35, 0.25];
      aP = [-0.75 + s * 0.08 * move, -0.35, -0.25];
      grip = -0.55;
    }
    if (this.shield && !a.guard) aP = [aP[0] - 0.15, -0.5, 0.1];
    // Talking: a hand moves as they speak, the head nods.
    if (a.talk) {
      aP = [-0.6 - Math.abs(Math.sin(this.time * 3.1)) * 0.6, 0, 0.25 + Math.sin(this.time * 2.3) * 0.2];
      headRx += Math.sin(this.time * 4.2) * 0.06;
    }
    // The basic attack, by weapon.
    if (a.swing) {
      const t = a.swing.t;
      const wind = Math.min(1, t / 0.28);
      const strike = ease(clamp01((t - 0.18) / 0.5));
      const two = shape === 'longsword';
      switch (a.swing.pose ?? 'sweepR') {
        case 'sweepR':
        case 'heavyR': {
          const big = a.swing.pose === 'heavyR' ? 1.25 : 1;
          aN = [lerp(-0.4, -1.45, wind), lerp(-1.3 * big, 1.5 * big, strike), lerp(-1.2, -1.45, wind)];
          hipsRy = lerp(-0.45 * big, 0.6 * big, strike);
          aP = two ? [aN[0], aN[1], -aN[2]] : [0.3, 0, 0.35];
          lN = [-0.3, 0, 0];
          lP = [0.35, 0, 0];
          break;
        }
        case 'sweepL':
        case 'heavyL': {
          const big = a.swing.pose === 'heavyL' ? 1.25 : 1;
          aN = [lerp(-1.3, -1.5, wind), lerp(1.6 * big, -1.2 * big, strike), lerp(-1.4, -1.1, wind)];
          hipsRy = lerp(0.7 * big, -0.55 * big, strike);
          aP = two ? [aN[0], aN[1], -aN[2]] : [0.2, 0, 0.45];
          lN = [0.35, 0, 0];
          lP = [-0.3, 0, 0];
          break;
        }
        case 'smash':
          aN = [lerp(-0.6, -3.0, out(wind)) + strike * 3.6, 0, -0.15];
          aP = [lerp(-0.4, -2.6, out(wind)) + strike * 3.0, 0, 0.15];
          if (two || shape === 'axe' || shape === 'mace') aP = [aN[0], 0, 0.3];
          hipsRx = lerp(-0.25, 0.42, strike);
          lift += Math.sin(Math.min(1, t * 1.6) * Math.PI) * 0.32;
          lN = [lerp(-0.5, 0.3, strike), 0, 0];
          lP = [lerp(0.2, -0.5, strike), 0, 0];
          squash += strike > 0.95 ? -0.08 : 0;
          break;
        case 'jabR':
        case 'jabL': {
          const k = Math.sin(clamp01(t) * Math.PI);
          const side = a.swing.pose === 'jabR' ? 1 : -1;
          aN = [lerp(-0.5, -1.6, k), side * 0.35 * (1 - k), lerp(-0.1, 0.3, k)];
          grip = lerp(2.4, 1.6, k);
          hipsRy = side * lerp(-0.35, 0.25, k);
          hipsRx = 0.12 * k;
          lN = [-0.35 * k, 0, 0];
          lP = [0.3 * k, 0, 0];
          break;
        }
        case 'stab':
        case 'thrust': {
          const k = out(clamp01((t - 0.15) / 0.45)) * (1 - clamp01((t - 0.75) / 0.25) * 0.6);
          aN = [lerp(-0.6, -1.55, k), lerp(0.25, 0.05, k), lerp(0.1, 0.25, k)];
          aP = shape === 'spear' ? [lerp(-0.7, -1.3, k), lerp(-0.6, -0.3, k), -0.2] : [0.25, 0, 0.3];
          grip = -aN[0] + (shape === 'spear' ? -0.05 : a.swing.pose === 'stab' ? 0.9 : 0);
          hipsRx = lerp(-0.1, 0.3, k);
          hipsRy = lerp(-0.25, 0.1, k);
          lN = [lerp(0, -0.7, k), 0, 0];
          lP = [lerp(0, 0.5, k), 0, 0];
          break;
        }
        case 'bolt':
        case 'bolt3': {
          const k = Math.sin(clamp01(t) * Math.PI);
          aN = [lerp(-0.4, -1.5, k), 0, -0.1];
          grip = lerp(-1.15, 0.85, k);
          aP = a.swing.pose === 'bolt3' ? [lerp(0, -1.4, k), 0, lerp(0.1, -0.5, k)] : [0.2 * k, 0, 0.3 + 0.2 * k];
          hipsRx = -0.12 * k;
          hipsRy = 0.2 * k;
          break;
        }
        case 'shot':
        case 'power': {
          const draw = a.swing.pose === 'power' ? clamp01(t / 0.7) : clamp01(t / 0.55);
          const loose = a.swing.pose === 'power' ? t > 0.7 : t > 0.55;
          aP = [-1.5, 0.15, -0.05];
          aN = loose ? [-1.45, 0, 0.1] : [lerp(-1.45, -1.25, draw), 0, lerp(0.15, 0.85, draw)];
          hipsRy = -0.35;
          headRy = 0.3;
          hipsRx = a.swing.pose === 'power' && !loose ? -0.12 * draw : 0;
          lN = [0.25, 0, 0];
          lP = [-0.3, 0, 0];
          break;
        }
        default:
      }
    }
    // Skills.
    const p = a.pose;
    if (p) {
      const t = clamp01(p.t);
      const k = Math.sin(t * Math.PI);
      switch (p.id) {
        case 'lunge':
          hipsRx = 0.45 * k;
          aN = [-1.5, 0, 0.1];
          grip = 1.5;
          aP = [0.6 * k, 0, 0.5];
          lN = [-1.0 * k, 0, 0];
          lP = [0.7 * k, 0, 0];
          lift += 0.1 * k;
          break;
        case 'overhead': {
          const wind = Math.min(1, t / 0.35);
          const strike = ease(clamp01((t - 0.3) / 0.4));
          aN = [lerp(-0.6, -3.2, out(wind)) + strike * 3.8, 0, -0.1];
          aP = [aN[0], 0, 0.2];
          hipsRx = lerp(-0.35, 0.5, strike);
          lift += Math.sin(Math.min(1, t * 1.5) * Math.PI) * 0.45;
          lN = [lerp(-0.6, 0.4, strike), 0, 0];
          lP = [lerp(0.3, -0.6, strike), 0, 0];
          break;
        }
        case 'bash':
          aP = [lerp(-0.6, -1.25, k), -1.35, lerp(0, -0.45, k)];
          hipsRy = lerp(0, 0.5, k);
          hipsRx = 0.25 * k;
          aN = [0.4 * k, 0, -0.3];
          lN = [-0.6 * k, 0, 0];
          lP = [0.5 * k, 0, 0];
          break;
        case 'plant':
          lift -= 0.18 * k;
          hipsRx = 0.35 * k;
          lN = [-1.3 * k, 0, 0];
          lP = [0.5 * k, 0, 0];
          aN = [lerp(-0.2, -0.9, k), 0, 0.2];
          aP = [lerp(-0.2, -0.7, k), 0, -0.2];
          break;
        case 'slam': {
          const up = Math.min(1, t / 0.45);
          const down = ease(clamp01((t - 0.45) / 0.3));
          aN = [lerp(-0.4, -3.0, up) + down * 3.3, 0, -0.2];
          aP = [lerp(-0.4, -3.0, up) + down * 3.3, 0, 0.2];
          lift += Math.sin(Math.min(1, t / 0.75) * Math.PI) * 0.6;
          hipsRx = lerp(-0.3, 0.5, down);
          squash += down > 0.95 ? -0.12 : 0;
          break;
        }
        case 'nova':
          aN = [-0.2, 0, lerp(-0.2, -1.6, out(t))];
          aP = [-0.2, 0, lerp(0.2, 1.6, out(t))];
          headRx = -0.25 * k;
          lift += 0.2 * k;
          lN = [0, 0, -0.25 * k];
          lP = [0, 0, 0.25 * k];
          break;
        case 'raise':
          aN = [lerp(-0.4, -2.9, out(t)), 0, 0.1];
          grip = lerp(-1.15, 1.35, out(t));
          aP = [-0.4, 0, lerp(0.2, 1.1, k)];
          headRx = -0.35 * k;
          break;
        case 'draw':
          aP = [-1.5, 0.4 * k, -0.05];
          aN = [-1.25, 0, lerp(0.1, 0.95, k)];
          hipsRy = -0.45;
          headRy = 0.35;
          lN = [0.3, 0, 0];
          lP = [-0.35, 0, 0];
          break;
        case 'skyshot':
          aP = [-2.4, 0.1, -0.05];
          aN = [-2.0, 0, lerp(0.15, 0.9, k)];
          headRx = -0.5;
          hipsRx = -0.2;
          break;
        case 'cast':
          aN = [-1.5 * k, 0, -0.2];
          aP = [-1.5 * k, 0, 0.2];
          hipsRx = -0.15 * k;
          break;
        default:
      }
    }
    // Guard: the shield up in front, a low stance.
    if (a.guard) {
      aP = [-0.65, -1.35, -0.4];
      aN = [0.2, 0, -0.35];
      lN = [-0.35, 0, -0.1];
      lP = [0.35, 0, 0.1];
      squash -= 0.04;
      hipsRx = Math.max(hipsRx, 0.12);
    }
    // The whirl: arms out, a full turn.
    if (a.spin != null) {
      bodyRy = ease(a.spin) * Math.PI * 2;
      aN = [-1.45, 0, -1.4];
      aP = [0, 0, 1.4];
      lift += Math.sin(a.spin * Math.PI) * 0.15;
    }
    // Casting: both hands thrust forward.
    if (a.cast != null) {
      const k = Math.sin(Math.min(1, a.cast) * Math.PI);
      aN = [-1.5 * k + aN[0] * (1 - k), 0, -0.2];
      aP = [-1.5 * k + aP[0] * (1 - k), 0, 0.2];
      if (shape === 'staff') grip = lerp(grip, 0.9, k);
      hipsRx = -0.15 * k;
    }
    // The roll: tucked, a somersault forward.
    if (a.roll != null) {
      bodyRx = a.roll * Math.PI * 2;
      aN = [-1.2, 0, -0.3];
      aP = [-1.2, 0, 0.3];
      lN = [-1.4, 0, 0];
      lP = [-1.4, 0, 0];
      lift += 0.35 * Math.sin(a.roll * Math.PI);
    }
    // Hit: a flinch back.
    if (a.hurt > 0) {
      hipsRx -= a.hurt * 0.5;
      headRx -= a.hurt * 0.3;
    }
    // Beaten: down on the back.
    if (a.dead) {
      this._deadT = Math.min(1, (this._deadT ?? 0) + dt * 2.5);
      bodyRx = -out(this._deadT) * Math.PI / 2;
      lift = out(this._deadT) * 0.15;
    } else this._deadT = 0;

    // Apply, eased a little so poses blend.
    const k = Math.min(1, dt * 22);
    const set = (o, [x, y, z]) => {
      o.rotation.x += (x - o.rotation.x) * k;
      o.rotation.y += (y - o.rotation.y) * k;
      o.rotation.z += (z - o.rotation.z) * k;
    };
    set(J.armNeg, aN);
    set(J.armPos, aP);
    set(J.legNeg, lN);
    set(J.legPos, lP);
    set(J.hips, [hipsRx, hipsRy, hipsRz]);
    set(J.head, [headRx, headRy, 0]);
    if (this.weapon) this.weapon.rotation.x += (grip - this.weapon.rotation.x) * k;
    // A bow stays upright in the hand (tipped back to shoot at the sky).
    if (this.bow) this.bow.rotation.x = -J.armPos.rotation.x + (p?.id === 'skyshot' ? -0.9 : 0);
    // The cape trails behind: more when moving, a ripple always.
    if (this.cape) {
      this.speed += ((move > 0.05 ? 1 : 0) - this.speed) * Math.min(1, dt * 4);
      this.cape.forEach((hinge, i) => {
        const want = -(0.12 + this.speed * 0.35 + (a.roll != null ? 0.6 : 0)) * (i === 0 ? 1 : 0.35) + Math.sin(this.time * 3.1 + i * 0.9) * 0.05 * (1 + this.speed) - (i === 0 ? hipsRx * 0.8 : 0);
        hinge.rotation.x += (Math.min(0.2, want) * -1 - hinge.rotation.x) * Math.min(1, dt * 8);
      });
    }
    // Somersaults and spins turn the body whole, straight away.
    this.body.rotation.order = 'YXZ';
    this.body.rotation.x = bodyRx;
    this.body.rotation.y = bodyRy;
    // A somersault turns about the middle of the body, not the feet.
    const mid = J.hipY * this.scale;
    this.body.position.set(0, lift, 0);
    if (bodyRx && !a.dead) {
      this.body.position.y = lift + mid - Math.cos(bodyRx) * mid;
      this.body.position.z = Math.sin(bodyRx) * mid;
    } else this.body.position.z = 0;
    this.body.scale.set(this.scale * (1 - squash * 0.6), this.scale * (1 + squash), this.scale * (1 - squash * 0.6));
    this.mesh.rotation.y = this.facing ?? yaw;
    // Light, flash, the gear's glint.
    const mats = [this.material, this.gearMat, ...this.glowMats];
    if (this.flash > 0) {
      this.flash -= dt;
      for (const m of mats) {
        m.color.setRGB(1, 1, 1);
        if (!m.userData.base) m.emissive.setRGB(1.2, 1.1, 1.0);
      }
      this.self.value.setRGB(0, 0, 0);
    } else {
      this.material.color.copy(this.tint);
      this.gearMat.color.copy(this.tint);
      this.material.emissive.setRGB(0, 0, 0);
      this.gearMat.emissive.setRGB(0, 0, 0);
      this.self.value.copy(light).multiplyScalar(0.55);
      if (this.glow) this.self.value.addScalar(this.glow * 0.8);
      if (this.glowColor) {
        const g = 0.45 + 0.2 * Math.sin(this.time * 6);
        this.self.value.r += this.glowColor.r * g;
        this.self.value.g += this.glowColor.g * g;
        this.self.value.b += this.glowColor.b * g;
      }
    }
    for (const m of this.glowMats) m.emissiveIntensity = m.userData.base * (0.75 + 0.35 * Math.sin(this.time * 4 + m.id));
    if (this.shadow) this.shadow.material.opacity = Math.max(0.3, 1 - lift * 0.5) * 0.7;
    // Where the weapon's tip and middle are (for its trail).
    if (this.swordTip) {
      this.group.updateMatrixWorld(true);
      this.swordTip.getWorldPosition(this.tip);
      this.swordMid.getWorldPosition(this.mid);
    } else if (this.bow) {
      this.group.updateMatrixWorld(true);
      this.bow.getWorldPosition(this.tip);
      this.mid.copy(this.tip);
    }
  }

  /** Where the main hand's weapon tip is in the world (a staff's crystal, a bow's grip). */
  tipWorld(out = new THREE.Vector3()) {
    return out.copy(this.tip);
  }

  dispose() {
    this.material.dispose();
    this.gearMat.dispose();
    for (const m of this.glowMats) m.dispose();
    this.shadow?.material.dispose();
    this.group.removeFromParent();
  }
}

/**
 * A weapon's trail: a ribbon between where the blade's middle and tip have
 * been over the last moments, bright at the blade, fading behind it, in the
 * strike's colour.
 */
export class SwordTrail {
  constructor(scene, length = 14) {
    this.n = length;
    this.points = [];
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(length * 2 * 3);
    this.alpha = new Float32Array(length * 2);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    const idx = [];
    for (let i = 0; i < length - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    geo.setIndex(idx);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    this.color = { value: new THREE.Color(2.2, 1.9, 1.3) };
    this.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: { uColor: this.color },
      vertexShader: 'attribute float aAlpha; varying float vA; void main() { vA = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uColor; varying float vA; void main() { if (vA < 0.01) discard; gl_FragColor = vec4(uColor * vA, vA); }',
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 7;
    scene.add(this.mesh);
  }

  /** Each frame: `on` while the blade is swinging; the colour of this strike. */
  update(tip, mid, on, color = null) {
    if (color) this.color.value.copy(color);
    if (on) this.points.unshift([tip.clone(), mid.clone()]);
    else this.points.splice(Math.max(0, this.points.length - 2));
    if (this.points.length > this.n) this.points.length = this.n;
    for (let i = 0; i < this.n; i++) {
      const p = this.points[i] ?? this.points[this.points.length - 1];
      const fade = p && i < this.points.length ? (1 - i / this.n) ** 1.4 : 0;
      for (let k = 0; k < 2; k++) {
        if (p) this.pos.set(p[k].toArray(), (i * 2 + k) * 3);
        this.alpha[i * 2 + k] = fade * (k === 0 ? 1 : 0.35);
      }
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.aAlpha.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.removeFromParent();
  }
}
