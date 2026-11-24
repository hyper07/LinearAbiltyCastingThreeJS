import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * An electric kick scooter of our own, the kind parked on every Seoul corner
 * for hire — "SSAENG 쌩쌩", a made-up brand — built from parts: a deck with
 * grip tape and the brand down its side, a rear fender over the back wheel
 * with the brake light in it, the folding stem with its hinge and latch, the
 * T-bar with rubber grips, a thumb throttle on the right and a brake lever on
 * the left, a bell, a little display between the grips (speed and battery,
 * redrawn as you ride), the LED headlight on the stem, small solid wheels
 * with alloy hubs, a fork, and a kickstand tucked up under the deck.
 *
 * In metres, sized for the plush riders; travel is −z, the deck centred over
 * the origin, the ground at y = 0.
 *
 *   const s = new Scooter({ body: '#2ec4d6', trim: '#ffffff' });
 *   s.update(dt, { roll, steer, braking, night, speed, battery, boost });
 */

export const DECK_TOP = 0.13;
const WHEEL_R = 0.095;
const FRONT_Z = -0.42;
const REAR_Z = 0.36;
const BAR_Y = 0.5;
const STEM_RAKE = 0.3; // the stem leans back toward the rider

const geo = {};
const G = (k, f) => (geo[k] ??= f());

/** Grip tape: dark sandpaper grain, a band of the brand colour down the edges, a few scuffs. */
function gripTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#26272b';
  g.fillRect(0, 0, 128, 512);
  const img = g.getImageData(0, 0, 128, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 34;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(255,255,255,0.06)';
  for (let k = 0; k < 14; k++) {
    g.lineWidth = 1 + Math.random() * 3;
    g.beginPath();
    const y = Math.random() * 512;
    g.moveTo(Math.random() * 128, y);
    g.lineTo(Math.random() * 128, y + (Math.random() - 0.5) * 60);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** The brand down the deck's side: "SSAENG 쌩쌩" and a number, white on the body colour. */
function sideTexture(body, trim, number) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = body;
  g.fillRect(0, 0, 512, 64);
  g.fillStyle = trim;
  g.fillRect(0, 50, 512, 6);
  g.font = '900 34px system-ui, sans-serif';
  g.textBaseline = 'middle';
  g.fillText('SSAENG', 70, 28);
  g.font = '800 28px system-ui, sans-serif';
  g.fillText('쌩쌩', 230, 29);
  g.font = '700 20px ui-monospace, monospace';
  g.globalAlpha = 0.8;
  g.fillText(`No.${number}`, 360, 29);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export class Scooter {
  constructor({ body = '#2ec4d6', trim = '#ffffff', number = 1 + Math.floor(Math.random() * 899), screen = true } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'scooter';
    const paint = new THREE.MeshPhysicalMaterial({ color: body, roughness: 0.38, metalness: 0.15, clearcoat: 0.7, clearcoatRoughness: 0.18 });
    const trimM = new THREE.MeshPhysicalMaterial({ color: trim, roughness: 0.4, metalness: 0.05, clearcoat: 0.5 });
    const alu = new THREE.MeshStandardMaterial({ color: '#b9bec6', roughness: 0.32, metalness: 0.85 });
    const darkAlu = new THREE.MeshStandardMaterial({ color: '#2c2f35', roughness: 0.45, metalness: 0.6 });
    const rubber = new THREE.MeshStandardMaterial({ color: '#1b1c1f', roughness: 0.92, metalness: 0 });
    const plastic = new THREE.MeshStandardMaterial({ color: '#18191c', roughness: 0.55, metalness: 0.05 });
    this.mats = { paint, trimM, alu, darkAlu, rubber, plastic };
    const add = (mesh, parent = this.group) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // The deck: a rounded slab, the grip tape set into its top, the brand down both sides.
    const deckLen = 0.66;
    const deck = add(new THREE.Mesh(G('deck', () => new RoundedBoxGeometry(0.2, 0.05, deckLen, 3, 0.018)), paint));
    deck.position.set(0, DECK_TOP - 0.025, 0.0);
    const tape = add(new THREE.Mesh(G('tape', () => new THREE.PlaneGeometry(0.17, deckLen - 0.06).rotateX(-Math.PI / 2)), new THREE.MeshStandardMaterial({ map: gripTexture(), roughness: 0.98, metalness: 0 })));
    tape.position.set(0, DECK_TOP + 0.001, 0.0);
    tape.castShadow = false;
    const sideMat = new THREE.MeshPhysicalMaterial({ map: sideTexture(body, trim, number), roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.18 });
    for (const s of [-1, 1]) {
      const side = add(new THREE.Mesh(G('side', () => new THREE.PlaneGeometry(deckLen - 0.08, 0.034)), sideMat));
      side.position.set(s * 0.1005, DECK_TOP - 0.026, 0);
      side.rotation.y = s * Math.PI / 2;
      side.castShadow = false;
    }
    // The battery bulge under the deck, darker.
    const belly = add(new THREE.Mesh(G('belly', () => new RoundedBoxGeometry(0.15, 0.035, deckLen - 0.16, 2, 0.012)), darkAlu));
    belly.position.set(0, DECK_TOP - 0.06, 0.01);

    // The neck: from the deck's nose up to the stem's foot, in the body colour.
    const neck = add(new THREE.Mesh(G('neck', () => {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, DECK_TOP - 0.02, -deckLen / 2 + 0.03), new THREE.Vector3(0, DECK_TOP + 0.02, -deckLen / 2 - 0.04), new THREE.Vector3(0, 0.2, FRONT_Z + 0.04)]);
      return new THREE.TubeGeometry(curve, 10, 0.028, 10, false);
    }), paint));
    void neck;

    // The steering: a group turned by the bars, about the stem's axis (raked back).
    this.steerer = new THREE.Group();
    this.steerer.position.set(0, 0.2, FRONT_Z + 0.04);
    this.steerer.rotation.x = -STEM_RAKE;
    this.group.add(this.steerer);
    const stemLen = BAR_Y - 0.2;
    // hinge and latch where it folds
    const hinge = add(new THREE.Mesh(G('hinge', () => new THREE.CylinderGeometry(0.036, 0.036, 0.06, 14).rotateZ(Math.PI / 2)), darkAlu), this.steerer);
    hinge.position.y = 0.0;
    const latch = add(new THREE.Mesh(G('latch', () => new RoundedBoxGeometry(0.02, 0.07, 0.024, 2, 0.006)), trimM), this.steerer);
    latch.position.set(0.03, 0.04, 0.03);
    latch.rotation.x = 0.25;
    const stem = add(new THREE.Mesh(G('stem', () => new THREE.CylinderGeometry(0.019, 0.023, stemLen, 16).translate(0, stemLen / 2, 0)), paint), this.steerer);
    stem.position.y = 0.02;
    // a collar halfway, and the brand on the stem
    const collar = add(new THREE.Mesh(G('collar', () => new THREE.CylinderGeometry(0.026, 0.026, 0.03, 14)), darkAlu), this.steerer);
    collar.position.y = 0.3;
    // The headlight: an LED pod on the stem's front, and its lens.
    const pod = add(new THREE.Mesh(G('pod', () => new RoundedBoxGeometry(0.06, 0.035, 0.035, 2, 0.01)), plastic), this.steerer);
    pod.position.set(0, stemLen * 0.55, -0.03);
    this.headMat = new THREE.MeshStandardMaterial({ color: '#f4f7ff', emissive: '#e8f0ff', emissiveIntensity: 0.6, roughness: 0.2 });
    const lens = new THREE.Mesh(G('lens', () => new THREE.CircleGeometry(0.014, 16).rotateY(Math.PI)), this.headMat);
    lens.position.set(0, stemLen * 0.55, -0.048);
    this.steerer.add(lens);
    // The T-bar: the crossbar, rubber grips, a thumb throttle on the right, a brake lever on the left, a bell.
    const top = new THREE.Group();
    top.position.y = stemLen + 0.02;
    top.rotation.x = STEM_RAKE; // the bar level again
    this.steerer.add(top);
    this.bars = top;
    const bar = add(new THREE.Mesh(G('bar', () => new THREE.CylinderGeometry(0.012, 0.012, 0.5, 10).rotateZ(Math.PI / 2)), darkAlu), top);
    void bar;
    for (const s of [-1, 1]) {
      const grip = add(new THREE.Mesh(G('grip', () => new THREE.CapsuleGeometry(0.017, 0.09, 4, 10).rotateZ(Math.PI / 2)), rubber), top);
      grip.position.x = s * 0.2;
      const end = add(new THREE.Mesh(G('end', () => new THREE.CylinderGeometry(0.019, 0.019, 0.012, 12).rotateZ(Math.PI / 2)), trimM), top);
      end.position.x = s * 0.257;
    }
    // throttle: a thumb paddle inboard of the right grip
    const throttle = add(new THREE.Mesh(G('throttle', () => new RoundedBoxGeometry(0.03, 0.026, 0.012, 2, 0.004)), plastic), top);
    throttle.position.set(0.14, 0.004, -0.022);
    throttle.rotation.x = 0.4;
    this.throttle = throttle;
    // brake lever: a thin bar curving forward from the left
    const lever = new THREE.Group();
    lever.position.set(-0.14, 0.012, -0.012);
    top.add(lever);
    const lv = add(new THREE.Mesh(G('lever', () => new THREE.CapsuleGeometry(0.0045, 0.1, 3, 6).rotateZ(Math.PI / 2).translate(-0.06, 0, -0.03)), alu), lever);
    lv.rotation.y = 0.15;
    this.lever = lever;
    // bell
    const bell = add(new THREE.Mesh(G('bell', () => new THREE.SphereGeometry(0.018, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)), alu), top);
    bell.position.set(-0.09, 0.014, 0);
    // The display: a little rounded box between the grips, its screen redrawn as you ride.
    const disp = add(new THREE.Mesh(G('disp', () => new RoundedBoxGeometry(0.085, 0.022, 0.06, 2, 0.008)), plastic), top);
    disp.position.set(0, 0.02, 0.005);
    disp.rotation.x = -0.45;
    if (screen) {
      this.screenCanvas = document.createElement('canvas');
      this.screenCanvas.width = 128;
      this.screenCanvas.height = 80;
      this.screenTex = new THREE.CanvasTexture(this.screenCanvas);
      this.screenTex.colorSpace = THREE.SRGBColorSpace;
      const scr = new THREE.Mesh(G('screen', () => new THREE.PlaneGeometry(0.068, 0.044).rotateX(-Math.PI / 2)), new THREE.MeshBasicMaterial({ map: this.screenTex, toneMapped: false }));
      scr.position.set(0, 0.0116, 0);
      disp.add(scr);
      this._drawScreen(0, 1, false);
    }
    // The fork: two blades down to the front axle.
    const fork = new THREE.Group();
    fork.position.set(0, 0.2, FRONT_Z + 0.04);
    this.group.add(fork);
    this.fork = fork;
    for (const s of [-1, 1]) {
      const blade = add(new THREE.Mesh(G('blade', () => new THREE.BoxGeometry(0.014, 0.12, 0.03).translate(0, -0.06, 0)), darkAlu), fork);
      blade.position.set(s * 0.032, 0, 0);
      blade.rotation.x = -0.32;
    }
    // Wheels: a solid tyre, an alloy hub with spokes, a motor drum in the front one.
    this.wheels = [];
    for (const [z, motor] of [[FRONT_Z, true], [REAR_Z, false]]) {
      const w = new THREE.Group();
      w.position.set(0, WHEEL_R, z);
      const tyre = add(new THREE.Mesh(G('tyre', () => new THREE.TorusGeometry(WHEEL_R - 0.022, 0.024, 10, 28).rotateY(Math.PI / 2)), rubber), w);
      void tyre;
      const hub = add(new THREE.Mesh(G('hub', () => new THREE.CylinderGeometry(WHEEL_R - 0.03, WHEEL_R - 0.03, 0.03, 18).rotateZ(Math.PI / 2)), motor ? darkAlu : alu), w);
      void hub;
      for (let k = 0; k < 5; k++) {
        const sp = add(new THREE.Mesh(G('spoke', () => new THREE.BoxGeometry(0.036, 0.012, 0.03).translate(0, WHEEL_R * 0.32, 0)), alu), w);
        sp.rotation.x = (k / 5) * Math.PI * 2;
      }
      const cap = add(new THREE.Mesh(G('cap', () => new THREE.CylinderGeometry(0.018, 0.018, 0.042, 12).rotateZ(Math.PI / 2)), trimM), w);
      void cap;
      this.group.add(w);
      this.wheels.push(w);
    }
    // The rear fender (it's also the foot brake), the brake light set into its tail.
    const fender = add(new THREE.Mesh(G('fender', () => new THREE.CylinderGeometry(WHEEL_R + 0.016, WHEEL_R + 0.016, 0.06, 18, 1, true, 0, Math.PI * 0.95).rotateZ(Math.PI / 2).rotateX(-Math.PI * 0.03)), paint));
    fender.position.set(0, WHEEL_R, REAR_Z);
    fender.material = paint;
    fender.material.side = THREE.DoubleSide;
    this.brakeMat = new THREE.MeshStandardMaterial({ color: '#ff2a2a', emissive: '#ff1a1a', emissiveIntensity: 0.4, roughness: 0.3 });
    const tail = add(new THREE.Mesh(G('tail', () => new RoundedBoxGeometry(0.05, 0.016, 0.012, 2, 0.004)), this.brakeMat));
    tail.position.set(0, WHEEL_R + 0.07, REAR_Z + WHEEL_R + 0.012);
    tail.rotation.x = -0.6;
    // Front mudguard, small.
    const guard = add(new THREE.Mesh(G('guard', () => new THREE.CylinderGeometry(WHEEL_R + 0.014, WHEEL_R + 0.014, 0.05, 14, 1, true, Math.PI * 0.05, Math.PI * 0.6).rotateZ(Math.PI / 2)), paint), fork);
    guard.position.set(0, WHEEL_R - 0.2 + 0.012, -0.045);
    // The kickstand, folded up along the deck's left underside (down when parked).
    this.stand = new THREE.Group();
    this.stand.position.set(-0.085, DECK_TOP - 0.06, 0.12);
    const leg = add(new THREE.Mesh(G('stand', () => new THREE.CapsuleGeometry(0.007, 0.13, 3, 6).translate(0, -0.07, 0)), darkAlu), this.stand);
    void leg;
    this.group.add(this.stand);
    this.setStand(false);
    this._screenT = 0;
  }

  /** Kickstand down (parked) or up. */
  setStand(down) {
    this.stand.rotation.set(down ? 0.35 : 1.45, 0, down ? -0.35 : 0);
  }

  _drawScreen(kmh, battery, boost) {
    const g = this.screenCanvas.getContext('2d');
    g.fillStyle = '#0c1014';
    g.fillRect(0, 0, 128, 80);
    g.fillStyle = boost ? '#8fd8ff' : '#e9f6ff';
    g.font = '800 40px ui-monospace, monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(Math.round(kmh)).padStart(2, '0'), 54, 34);
    g.font = '700 12px system-ui, sans-serif';
    g.fillText('km/h', 104, 44);
    // battery: five bars
    for (let i = 0; i < 5; i++) {
      g.fillStyle = battery > i / 5 + 0.02 ? (battery < 0.25 ? '#ff6a4a' : '#7cf07a') : '#2a3138';
      g.fillRect(16 + i * 20, 64, 16, 8);
    }
    this.screenTex.needsUpdate = true;
  }

  /**
   * Each frame: `roll` the wheels' angle, `steer` the bars (−1…1, + left),
   * `braking`, `night` (0–1: lights on), and for the display `speed` (m/s), `battery` (0–1), `boost`.
   */
  update(dt, { roll = 0, steer = 0, braking = false, night = 0, speed = 0, battery = 1, boost = false } = {}) {
    for (const w of this.wheels) w.rotation.x = -roll;
    const a = steer * 0.35;
    this.steerer.rotation.y = a;
    this.fork.rotation.y = a;
    this.wheels[0].rotation.y = a;
    this.lever.rotation.y = braking ? 0.35 : 0;
    this.throttle.rotation.x = speed > 0.3 && !braking ? 0.15 : 0.4;
    this.headMat.emissiveIntensity = 0.5 + night * 5;
    this.brakeMat.emissiveIntensity = (braking ? 3.5 : 0.35) + night * (braking ? 2 : 1.2);
    if (this.screenTex) {
      this._screenT -= dt;
      if (this._screenT <= 0) {
        this._screenT = 0.25;
        this._drawScreen(speed * 3.6, battery, boost);
      }
    }
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.isMesh) {
        for (const m of [].concat(o.material)) {
          m.map?.dispose();
          m.dispose();
        }
      }
    });
    this.screenTex?.dispose();
  }
}

export const SCOOTER = { DECK_TOP, WHEEL_R, FRONT_Z, REAR_Z, BAR_Y, STEM_RAKE };
