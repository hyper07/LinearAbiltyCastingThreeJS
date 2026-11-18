/**
 * Jointed 3D characters: a person's solid pixel figure (voxel.js) in parts —
 * head, body, arms, legs — on joints, posed every frame from what they are
 * doing: breathing, walking (arms and legs swinging), a three-strike sword
 * combo (a sweep from the right, a backhand from the left, an overhead
 * smash with a hop), a whirl, casting with both hands, a dodge roll, a flinch
 * when hit, falling when beaten, and talking with their hands.
 *
 * Same surface as SpriteActor (gfx.js), so the game drives either:
 *   actor.show(sprite); actor.update(dt, yaw, light); actor.facing, lift, flash, tint …
 * plus `actor.act` — what the body is doing this frame:
 *   { move: 0…1, swing: { stage: 1–3, t: 0…1 } | null, spin: 0…1 | null, cast: 0…1 | null,
 *     roll: 0…1 | null, hurt: 0…1, dead: bool, talk: bool }
 */
import * as THREE from 'three';
import { voxelParts } from './voxel.js';
import { blobShadow } from './gfx.js';

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const out = (t) => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;

/** A sword in blocks: a steel blade along +Z, a gold guard, a leather grip — held in the fist. */
function swordGeometry() {
  const parts = [
    [0.06, 0.03, 0.78, 0, 0, 0.47, '#d8e2ea'], // blade
    [0.02, 0.035, 0.7, 0, 0.0, 0.47, '#f4fbff'], // its edge catching the light
    [0.26, 0.06, 0.06, 0, 0, 0.06, '#d8a83a'], // guard
    [0.05, 0.05, 0.2, 0, 0, -0.06, '#5a3a24'], // grip
    [0.08, 0.08, 0.06, 0, 0, -0.18, '#d8a83a'] // pommel
  ];
  const pos = [];
  const nor = [];
  const col = [];
  const c = new THREE.Color();
  for (const [w, h, d, x, y, z, hex] of parts) {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed().translate(x, y, z);
    c.set(hex);
    pos.push(...g.attributes.position.array);
    nor.push(...g.attributes.normal.array);
    for (let i = 0; i < g.attributes.position.count; i++) col.push(c.r, c.g, c.b);
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
}
let SWORD = null;

export class RigActor {
  /** @param {{ shadow?: number, scale?: number, sword?: boolean }} options */
  constructor({ shadow = 0.45, scale = 1, sword = false, glow = 0 } = {}) {
    this.group = new THREE.Group();
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    this.self = { value: new THREE.Color(0.4, 0.4, 0.4) };
    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.uSelf = this.self;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uSelf;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uSelf;');
    };
    // body: turns and lifts; hips: the joint the whole upper body and the legs hang from.
    this.mesh = new THREE.Group(); // (named as SpriteActor's, for the game's lean and blink)
    this.body = new THREE.Group();
    this.mesh.add(this.body);
    this.group.add(this.mesh);
    this.shadow = shadow ? blobShadow(shadow) : null;
    if (this.shadow) this.group.add(this.shadow);
    this.scale = scale;
    this.withSword = sword;
    this.glow = glow;
    this.sprite = null;
    this.flash = 0;
    this.lift = 0;
    this.squash = 0;
    this.tint = new THREE.Color(1, 1, 1);
    this.facing = null;
    this.act = { move: 0 };
    this.walk = 0;
    this.time = Math.random() * 10;
    this.joints = null;
    this.tip = new THREE.Vector3();
    this.mid = new THREE.Vector3();
  }

  /** Dress the rig in a figure (once per look; walk frames are not needed — the rig walks). */
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
    this.joints = { hips, head, armNeg, armPos, legNeg, legPos, hipY: joints.torso[1], height: size.height, armLength: size.armLength };
    if (this.withSword) {
      SWORD ??= swordGeometry();
      const sword = new THREE.Mesh(SWORD, new THREE.MeshLambertMaterial({ vertexColors: true }));
      sword.castShadow = true;
      // In the fist at the end of the arm, the blade forward.
      sword.position.set(0, -size.armLength + 0.06, 0.04);
      sword.rotation.x = -0.35;
      armNeg.add(sword);
      this.sword = sword;
      this.swordTip = new THREE.Object3D();
      this.swordTip.position.set(0, 0, 0.86);
      this.swordMid = new THREE.Object3D();
      this.swordMid.position.set(0, 0, 0.25);
      sword.add(this.swordTip, this.swordMid);
    }
    this.body.scale.setScalar(this.scale);
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
    // Rest pose, then the walk on top.
    let hipsRx = move * 0.12, hipsRy = 0, hipsRz = 0, bodyRx = 0, bodyRy = 0, lift = this.lift + Math.abs(Math.cos(this.walk)) * 0.05 * move;
    let headRx = breathe * 0.02, headRy = 0;
    let aN = [s * 0.55 * move + breathe * 0.03, 0, -0.08];
    let aP = [-s * 0.55 * move - breathe * 0.03, 0, 0.08];
    let lN = [-s * 0.7 * move, 0, 0];
    let lP = [s * 0.7 * move, 0, 0];
    let squash = this.squash + breathe * 0.008;
    // Talking: a hand moves as they speak, the head nods.
    if (a.talk) {
      aP = [-0.6 - Math.abs(Math.sin(this.time * 3.1)) * 0.6, 0, 0.25 + Math.sin(this.time * 2.3) * 0.2];
      headRx += Math.sin(this.time * 4.2) * 0.06;
    }
    // The sword combo.
    if (a.swing) {
      const t = a.swing.t;
      const wind = Math.min(1, t / 0.28);
      const strike = ease(Math.max(0, Math.min(1, (t - 0.18) / 0.5)));
      if (a.swing.stage === 1) {
        // A sweep from the right: the sword arm out to the side and round in front, the body twisting with it.
        aN = [lerp(-0.4, -1.45, wind), lerp(-1.3, 1.5, strike), lerp(-1.2, -1.45, wind)];
        hipsRy = lerp(-0.45, 0.6, strike);
        aP = [0.3, 0, 0.35];
        lN = [-0.3, 0, 0];
        lP = [0.35, 0, 0];
      } else if (a.swing.stage === 2) {
        // A backhand from the left: across the body and out again.
        aN = [lerp(-1.3, -1.5, wind), lerp(1.6, -1.2, strike), lerp(-1.4, -1.1, wind)];
        hipsRy = lerp(0.7, -0.55, strike);
        aP = [0.2, 0, 0.45];
        lN = [0.35, 0, 0];
        lP = [-0.3, 0, 0];
      } else {
        // The smash: up overhead, a hop, and down hard in front.
        aN = [lerp(-0.6, -3.0, out(wind)) + strike * 3.6, 0, -0.15];
        aP = [lerp(-0.4, -2.6, out(wind)) + strike * 3.0, 0, 0.15];
        hipsRx = lerp(-0.25, 0.42, strike);
        lift += Math.sin(Math.min(1, t * 1.6) * Math.PI) * 0.32;
        lN = [lerp(-0.5, 0.3, strike), 0, 0];
        lP = [lerp(0.2, -0.5, strike), 0, 0];
        squash += strike > 0.95 ? -0.08 : 0;
      }
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
    // Somersaults and spins turn the body whole, straight away.
    this.body.rotation.order = 'YXZ';
    this.body.rotation.x = bodyRx;
    this.body.rotation.y = bodyRy;
    // A somersault turns about the middle of the body, not the feet.
    const mid = J.hipY * this.scale;
    this.body.position.set(0, lift + (bodyRx ? mid * (1 - Math.cos(bodyRx)) * 0 : 0), 0);
    if (bodyRx && !a.dead) {
      this.body.position.y = lift + mid - Math.cos(bodyRx) * mid;
      this.body.position.z = Math.sin(bodyRx) * mid;
    } else this.body.position.z = 0;
    this.body.scale.set(this.scale * (1 - squash * 0.6), this.scale * (1 + squash), this.scale * (1 - squash * 0.6));
    this.mesh.rotation.y = this.facing ?? yaw;
    // Light, flash.
    if (this.flash > 0) {
      this.flash -= dt;
      this.material.color.setRGB(1, 1, 1);
      this.material.emissive.setRGB(1.2, 1.1, 1.0);
      this.self.value.setRGB(0, 0, 0);
    } else {
      this.material.color.copy(this.tint);
      this.material.emissive.setRGB(0, 0, 0);
      this.self.value.copy(light).multiplyScalar(0.55);
      if (this.glow) this.self.value.addScalar(this.glow * 0.8);
    }
    if (this.shadow) this.shadow.material.opacity = Math.max(0.3, 1 - lift * 0.5) * 0.7;
    // Where the sword's tip and middle are (for its trail).
    if (this.swordTip) {
      this.group.updateMatrixWorld(true);
      this.swordTip.getWorldPosition(this.tip);
      this.swordMid.getWorldPosition(this.mid);
    }
  }

  dispose() {
    this.material.dispose();
    this.sword?.material.dispose();
    this.shadow?.material.dispose();
    this.group.removeFromParent();
  }
}

/**
 * A sword's trail: a ribbon between where the blade's middle and tip have
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
