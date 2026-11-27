import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * Electric kick scooters of our own — the made-up brand "SSAENG 쌩쌩" and six
 * models (scoot.js SCOOTERS has their handling) — built from parts: a deck
 * with grip tape and the brand down its side, a rear fender with the brake
 * light in it, the folding stem with its hinge and latch, the T-bar with
 * rubber grips, a thumb throttle on the right and a brake lever on the left,
 * a bell, a little display between the grips (the speed and a bar of it, glowing
 * lime through an energy drink's boost — redrawn as you ride), the LED headlight, wheels with hubs, a fork, and a kickstand.
 * Each model is its own shape (SCOOTER_LOOKS):
 *
 *   city     S1 Commuter: the hire scooter — solid wheels, a straight stem
 *   racer    R7 Comet: low and long, small hard wheels, a raked stem and
 *            narrow bars, a carbon deck with a stripe, a tail fin
 *   chunky   X4 Mudlark: fat knobbly air tyres, coil springs front and back,
 *            a tall deck, wide bars, chunky fenders
 *   kick     K2 Sparrow: a skinny light deck, a thin stem, white tyres
 *   cruiser  G9 Grand: wide and long, twin stem tubes, a big round lamp,
 *            chrome, foot plates
 *   retro    Mini Bubblegum: a rounded leg shield, whitewall tyres, a round
 *            chrome lamp, a basket on the front, cream grips
 *
 * In metres, sized for the plush riders; travel is −z, the deck centred over
 * the origin, the ground at y = 0.
 *
 *   const s = new Scooter({ model: 'racer', body: '#2ec4d6', trim: '#ffffff' });
 *   s.update(dt, { roll, steer, braking, night, speed, boost });
 */

/** Each model's shape: deck (top, length, width, thickness), wheels (radius, tyre, front and rear z), stem, bars, extras. */
export const SCOOTER_LOOKS = {
  city: { deckTop: 0.13, deckLen: 0.66, deckW: 0.2, deckT: 0.05, wheel: 0.095, tyre: 0.024, front: -0.42, rear: 0.36, bar: 0.5, rake: 0.3, barW: 0.5, stemR: 0.021 },
  racer: { deckTop: 0.1, deckLen: 0.76, deckW: 0.18, deckT: 0.04, wheel: 0.08, tyre: 0.017, front: -0.48, rear: 0.4, bar: 0.44, rake: 0.42, barW: 0.38, stemR: 0.02, carbon: true, fin: true, stripe: true },
  chunky: { deckTop: 0.19, deckLen: 0.62, deckW: 0.23, deckT: 0.06, wheel: 0.13, tyre: 0.048, front: -0.47, rear: 0.4, bar: 0.56, rake: 0.26, barW: 0.62, stemR: 0.026, springs: true, knobs: true, bigFenders: true },
  kick: { deckTop: 0.1, deckLen: 0.58, deckW: 0.14, deckT: 0.03, wheel: 0.09, tyre: 0.02, front: -0.38, rear: 0.33, bar: 0.5, rake: 0.24, barW: 0.42, stemR: 0.015, whiteTyres: true, light: true },
  cruiser: { deckTop: 0.15, deckLen: 0.78, deckW: 0.3, deckT: 0.06, wheel: 0.11, tyre: 0.038, front: -0.52, rear: 0.45, bar: 0.52, rake: 0.32, barW: 0.6, stemR: 0.02, twin: true, bigLamp: true, chrome: true, plates: true },
  retro: { deckTop: 0.13, deckLen: 0.6, deckW: 0.22, deckT: 0.05, wheel: 0.1, tyre: 0.03, front: -0.42, rear: 0.36, bar: 0.5, rake: 0.22, barW: 0.48, stemR: 0.022, shield: true, whitewall: true, basket: true, roundLamp: true, chrome: true, cream: true }
};
const look = (id) => SCOOTER_LOOKS[id] ?? SCOOTER_LOOKS.city;

export const DECK_TOP = SCOOTER_LOOKS.city.deckTop;
const WHEEL_R = SCOOTER_LOOKS.city.wheel;
const FRONT_Z = SCOOTER_LOOKS.city.front;
const REAR_Z = SCOOTER_LOOKS.city.rear;
const BAR_Y = SCOOTER_LOOKS.city.bar;
const STEM_RAKE = SCOOTER_LOOKS.city.rake;

const geo = {};
const G = (k, f) => (geo[k] ??= f());

/** Grip tape: dark sandpaper grain, a few scuffs (one texture shared by every scooter). */
let gripTex = null;
function gripTexture() {
  if (gripTex) return gripTex;
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
  gripTex = new THREE.CanvasTexture(c);
  gripTex.colorSpace = THREE.SRGBColorSpace;
  gripTex.anisotropy = 8;
  return gripTex;
}

/** The brand down the deck's side: "SSAENG 쌩쌩", the model and a number, on the body colour. */
function sideTexture(body, trim, number, name, carbon) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = carbon ? '#1c1d21' : body;
  g.fillRect(0, 0, 512, 64);
  if (carbon) {
    g.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = 0; x < 512; x += 8) g.fillRect(x, (x / 8) % 2 ? 0 : 32, 4, 32);
    g.fillStyle = body;
    g.fillRect(0, 44, 512, 10);
  }
  g.fillStyle = carbon ? body : trim;
  g.fillRect(0, 54, 512, 6);
  g.font = '900 32px system-ui, sans-serif';
  g.textBaseline = 'middle';
  g.fillStyle = carbon ? '#ffffff' : trim;
  g.fillText('SSAENG', 40, 26);
  g.font = '800 26px system-ui, sans-serif';
  g.fillText('쌩쌩', 190, 27);
  g.font = '800 22px system-ui, sans-serif';
  g.fillText(name, 280, 27);
  g.font = '700 16px ui-monospace, monospace';
  g.globalAlpha = 0.75;
  g.fillText(`No.${number}`, 430, 27);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** A pastel of a colour (the retro scooter's paint). */
function pastel(hex) {
  const c = new THREE.Color(hex);
  return '#' + c.lerp(new THREE.Color('#fff4ec'), 0.45).getHexString();
}

const MODEL_NAME = { city: 'S1', racer: 'R7 COMET', chunky: 'X4', kick: 'K2', cruiser: 'G9 GRAND', retro: 'MINI' };

export class Scooter {
  constructor({ model = 'city', body = '#2ec4d6', trim = '#ffffff', number = 1 + Math.floor(Math.random() * 899), screen = true } = {}) {
    const L = look(model);
    this.model = SCOOTER_LOOKS[model] ? model : 'city';
    this.look = L;
    this.deckTop = L.deckTop;
    this.wheelR = L.wheel;
    this.group = new THREE.Group();
    this.group.name = `scooter-${this.model}`;
    const key = (k) => `${this.model}:${k}`;
    const paintCol = L.cream ? pastel(body) : body;
    const paint = new THREE.MeshPhysicalMaterial({ color: paintCol, roughness: L.knobs ? 0.62 : 0.38, metalness: 0.15, clearcoat: L.knobs ? 0.2 : 0.7, clearcoatRoughness: 0.18 });
    const trimM = new THREE.MeshPhysicalMaterial({ color: L.cream ? '#fff1d6' : trim, roughness: 0.4, metalness: 0.05, clearcoat: 0.5 });
    const alu = new THREE.MeshStandardMaterial({ color: '#b9bec6', roughness: 0.32, metalness: 0.85 });
    const chrome = L.chrome ? new THREE.MeshStandardMaterial({ color: '#e8ecf2', roughness: 0.12, metalness: 1 }) : alu;
    const darkAlu = new THREE.MeshStandardMaterial({ color: '#2c2f35', roughness: 0.45, metalness: 0.6 });
    const carbon = new THREE.MeshPhysicalMaterial({ color: '#1b1c20', roughness: 0.3, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
    const rubber = new THREE.MeshStandardMaterial({ color: L.whiteTyres ? '#e9e6df' : '#1b1c1f', roughness: 0.92, metalness: 0 });
    const plastic = new THREE.MeshStandardMaterial({ color: '#18191c', roughness: 0.55, metalness: 0.05 });
    const spring = new THREE.MeshStandardMaterial({ color: trim === '#ffffff' ? '#ffcc33' : trim, roughness: 0.35, metalness: 0.6 });
    this.mats = { paint, trimM, alu, chrome, darkAlu, carbon, rubber, plastic, spring };
    const add = (mesh, parent = this.group) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const R = L.wheel;
    const top = L.deckTop;

    // The deck: a rounded slab, the grip tape set into its top, the brand down both sides.
    const deck = add(new THREE.Mesh(G(key('deck'), () => new RoundedBoxGeometry(L.deckW, L.deckT, L.deckLen, 3, Math.min(0.018, L.deckT * 0.4))), L.carbon ? carbon : paint));
    deck.position.set(0, top - L.deckT / 2, 0);
    const tape = add(new THREE.Mesh(G(key('tape'), () => new THREE.PlaneGeometry(L.deckW - 0.03, L.deckLen - 0.06).rotateX(-Math.PI / 2)), new THREE.MeshStandardMaterial({ map: gripTexture(), roughness: 0.98, metalness: 0 })));
    tape.position.set(0, top + 0.001, 0);
    tape.castShadow = false;
    if (L.stripe) {
      const stripe = add(new THREE.Mesh(G(key('stripe'), () => new THREE.PlaneGeometry(0.035, L.deckLen - 0.08).rotateX(-Math.PI / 2)), paint));
      stripe.position.set(0, top + 0.002, 0);
      stripe.castShadow = false;
    }
    const sideMat = new THREE.MeshPhysicalMaterial({ map: sideTexture(paintCol, trim, number, MODEL_NAME[this.model], L.carbon), roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.18 });
    for (const s of [-1, 1]) {
      const side = add(new THREE.Mesh(G(key('side'), () => new THREE.PlaneGeometry(L.deckLen - 0.08, L.deckT * 0.68)), sideMat));
      side.position.set(s * (L.deckW / 2 + 0.0005), top - L.deckT / 2, 0);
      side.rotation.y = s * Math.PI / 2;
      side.castShadow = false;
    }
    // The battery bulge under the deck, darker.
    const belly = add(new THREE.Mesh(G(key('belly'), () => new RoundedBoxGeometry(L.deckW * 0.75, 0.035, L.deckLen - 0.16, 2, 0.012)), darkAlu));
    belly.position.set(0, top - L.deckT - 0.012, 0.01);
    // Foot plates out each side (the cruiser) and a chrome rail round the deck's edge.
    if (L.plates) {
      for (const s of [-1, 1]) {
        const rail = add(new THREE.Mesh(G(key('rail'), () => new THREE.CapsuleGeometry(0.008, L.deckLen - 0.1, 3, 8).rotateX(Math.PI / 2)), chrome));
        rail.position.set(s * (L.deckW / 2 + 0.006), top - 0.006, 0);
      }
    }

    // The neck: from the deck's nose up to the stem's foot (a rounded leg shield on the retro one).
    const neckTop = Math.max(0.2, top + 0.07);
    add(new THREE.Mesh(G(key('neck'), () => {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, top - 0.02, -L.deckLen / 2 + 0.03), new THREE.Vector3(0, top + 0.02, -L.deckLen / 2 - 0.04), new THREE.Vector3(0, neckTop, L.front + 0.04)]);
      return new THREE.TubeGeometry(curve, 10, L.stemR + 0.007, 10, false);
    }), L.carbon ? carbon : paint));
    if (L.shield) {
      // a curved panel in front of the rider's legs, rising from the deck's nose (the scooter of the 60s)
      const shield = add(new THREE.Mesh(G(key('shield'), () => new THREE.CylinderGeometry(0.17, 0.12, 0.34, 20, 1, true, -Math.PI * 0.42, Math.PI * 0.84).translate(0, 0.17, 0).scale(1, 1, 0.55)), paint));
      shield.position.set(0, top, -L.deckLen / 2 + 0.02);
      shield.rotation.x = -0.18;
      shield.rotation.y = Math.PI;
      shield.material = paint;
      paint.side = THREE.DoubleSide;
      const piping = add(new THREE.Mesh(G(key('piping'), () => new THREE.TorusGeometry(0.15, 0.007, 6, 24, Math.PI * 0.84).rotateZ(Math.PI * 0.08)), chrome));
      piping.position.set(0, top + 0.34, -L.deckLen / 2 - 0.035);
      piping.rotation.x = Math.PI / 2 - 0.18;
      piping.scale.set(1, 0.55, 1);
    }

    // The steering: a group turned by the bars, about the stem's axis (raked back).
    this.steerer = new THREE.Group();
    this.steerer.position.set(0, neckTop, L.front + 0.04);
    this.steerer.rotation.x = -L.rake;
    this.group.add(this.steerer);
    const stemLen = L.bar - neckTop;
    add(new THREE.Mesh(G(key('hinge'), () => new THREE.CylinderGeometry(L.stemR + 0.015, L.stemR + 0.015, 0.06, 14).rotateZ(Math.PI / 2)), darkAlu), this.steerer);
    const latch = add(new THREE.Mesh(G('latch', () => new RoundedBoxGeometry(0.02, 0.07, 0.024, 2, 0.006)), trimM), this.steerer);
    latch.position.set(0.03, 0.04, 0.03);
    latch.rotation.x = 0.25;
    const stemMat = L.carbon ? carbon : L.chrome ? chrome : paint;
    for (const sx of L.twin ? [-0.03, 0.03] : [0]) {
      const stem = add(new THREE.Mesh(G(key('stem'), () => new THREE.CylinderGeometry(L.stemR * 0.9, L.stemR * 1.1, stemLen, 16).translate(0, stemLen / 2, 0)), stemMat), this.steerer);
      stem.position.set(sx, 0.02, 0);
    }
    const collar = add(new THREE.Mesh(G(key('collar'), () => new THREE.CylinderGeometry(L.stemR + 0.006, L.stemR + 0.006, 0.03, 14)), darkAlu), this.steerer);
    collar.position.y = stemLen * 0.33;
    if (L.twin) collar.scale.set(2.6, 1, 1.2);
    // The headlight: an LED pod (a big round lamp on the cruiser and the retro).
    this.headMat = new THREE.MeshStandardMaterial({ color: '#f4f7ff', emissive: '#e8f0ff', emissiveIntensity: 0.6, roughness: 0.2 });
    if (L.bigLamp || L.roundLamp) {
      const r = L.bigLamp ? 0.045 : 0.034;
      const bowl = add(new THREE.Mesh(G(key('bowl'), () => new THREE.SphereGeometry(r, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-Math.PI / 2)), chrome), this.steerer);
      bowl.position.set(0, stemLen * 0.78, -0.035);
      bowl.rotation.x = L.rake;
      const lens = new THREE.Mesh(G(key('lensR'), () => new THREE.CircleGeometry(r * 0.92, 20).rotateY(Math.PI)), this.headMat);
      lens.position.set(0, stemLen * 0.78, -0.036 - r * 0.02);
      lens.rotation.x = L.rake;
      this.steerer.add(lens);
    } else {
      const pod = add(new THREE.Mesh(G('pod', () => new RoundedBoxGeometry(0.06, 0.035, 0.035, 2, 0.01)), plastic), this.steerer);
      pod.position.set(0, stemLen * 0.55, -0.03);
      const lens = new THREE.Mesh(G('lens', () => new THREE.CircleGeometry(0.014, 16).rotateY(Math.PI)), this.headMat);
      lens.position.set(0, stemLen * 0.55, -0.048);
      this.steerer.add(lens);
    }
    // The bars: the crossbar, rubber grips, a thumb throttle on the right, a brake lever on the left, a bell.
    const barG = new THREE.Group();
    barG.position.y = stemLen + 0.02;
    barG.rotation.x = L.rake; // the bar level again
    this.steerer.add(barG);
    this.bars = barG;
    add(new THREE.Mesh(G(key('bar'), () => new THREE.CylinderGeometry(0.012, 0.012, L.barW, 10).rotateZ(Math.PI / 2)), L.chrome ? chrome : darkAlu), barG);
    const gripMat = L.cream ? new THREE.MeshStandardMaterial({ color: '#f3e6cc', roughness: 0.8 }) : rubber.color.getHex() === 0xe9e6df ? new THREE.MeshStandardMaterial({ color: '#1b1c1f', roughness: 0.92 }) : rubber;
    for (const s of [-1, 1]) {
      const grip = add(new THREE.Mesh(G('grip', () => new THREE.CapsuleGeometry(0.017, 0.09, 4, 10).rotateZ(Math.PI / 2)), gripMat), barG);
      grip.position.x = s * (L.barW / 2 - 0.05);
      const end = add(new THREE.Mesh(G('end', () => new THREE.CylinderGeometry(0.019, 0.019, 0.012, 12).rotateZ(Math.PI / 2)), trimM), barG);
      end.position.x = s * (L.barW / 2 + 0.007);
    }
    const throttle = add(new THREE.Mesh(G('throttle', () => new RoundedBoxGeometry(0.03, 0.026, 0.012, 2, 0.004)), plastic), barG);
    throttle.position.set(L.barW / 2 - 0.11, 0.004, -0.022);
    throttle.rotation.x = 0.4;
    this.throttle = throttle;
    const lever = new THREE.Group();
    lever.position.set(-(L.barW / 2 - 0.11), 0.012, -0.012);
    barG.add(lever);
    const lv = add(new THREE.Mesh(G('lever', () => new THREE.CapsuleGeometry(0.0045, 0.1, 3, 6).rotateZ(Math.PI / 2).translate(-0.06, 0, -0.03)), alu), lever);
    lv.rotation.y = 0.15;
    this.lever = lever;
    const bell = add(new THREE.Mesh(G('bell', () => new THREE.SphereGeometry(0.018, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)), chrome), barG);
    bell.position.set(-0.09, 0.014, 0);
    // The display: a little rounded box between the grips, its screen redrawn as you ride.
    const disp = add(new THREE.Mesh(G('disp', () => new RoundedBoxGeometry(0.085, 0.022, 0.06, 2, 0.008)), plastic), barG);
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
    // A wire basket on the front (the retro one).
    if (L.basket) {
      const basket = new THREE.Group();
      basket.position.set(0, stemLen * 0.62, -0.1);
      basket.rotation.x = L.rake;
      this.steerer.add(basket);
      const wire = new THREE.MeshStandardMaterial({ color: '#d9dde3', roughness: 0.3, metalness: 0.8 });
      const box = add(new THREE.Mesh(G(key('basket'), () => new THREE.BoxGeometry(0.16, 0.1, 0.1, 6, 3, 4)), new THREE.MeshStandardMaterial({ color: '#d9dde3', roughness: 0.3, metalness: 0.8, wireframe: true })), basket);
      void box;
      const rim = add(new THREE.Mesh(G(key('brim'), () => new THREE.TorusGeometry(0.075, 0.005, 6, 24).rotateX(Math.PI / 2).scale(1.07, 1, 0.68)), wire), basket);
      rim.position.y = 0.05;
      // a baguette and flowers poking out
      const bread = add(new THREE.Mesh(G('bread', () => new THREE.CapsuleGeometry(0.014, 0.12, 4, 8)), new THREE.MeshStandardMaterial({ color: '#d39a52', roughness: 0.8 })), basket);
      bread.position.set(0.03, 0.07, 0.01);
      bread.rotation.z = 0.5;
      const flower = add(new THREE.Mesh(G('flower', () => new THREE.SphereGeometry(0.018, 10, 8)), new THREE.MeshStandardMaterial({ color: '#ff6fa8', roughness: 0.6 })), basket);
      flower.position.set(-0.04, 0.07, 0);
    }

    // The fork down to the front axle: two blades, or two coil-over springs (the off-roader).
    const fork = new THREE.Group();
    fork.position.set(0, neckTop, L.front + 0.04);
    this.group.add(fork);
    this.fork = fork;
    const forkLen = neckTop - R + 0.01;
    for (const s of [-1, 1]) {
      const x = s * (L.tyre + 0.012);
      if (L.springs) {
        const leg = add(new THREE.Mesh(G(key('fleg'), () => new THREE.CylinderGeometry(0.009, 0.009, forkLen, 8).translate(0, -forkLen / 2, 0)), darkAlu), fork);
        leg.position.set(x, 0, 0);
        leg.rotation.x = -0.32;
        const coil = add(new THREE.Mesh(G(key('coil'), () => coilGeometry(0.018, forkLen * 0.55, 7)), spring), fork);
        coil.position.set(x, -forkLen * 0.15, -0.02);
        coil.rotation.x = -0.32;
        coil.rotation.z = Math.PI;
      } else {
        const blade = add(new THREE.Mesh(G(key('blade'), () => new THREE.BoxGeometry(0.014, forkLen, 0.03).translate(0, -forkLen / 2, 0)), L.chrome ? chrome : darkAlu), fork);
        blade.position.set(x, 0, 0);
        blade.rotation.x = -0.32;
      }
    }
    // Wheels: a tyre (solid, air, knobbly or whitewall), a hub with spokes, a motor drum in the front one.
    this.wheels = [];
    for (const [z, motor] of [[L.front, true], [L.rear, false]]) {
      const w = new THREE.Group();
      w.position.set(0, R, z);
      add(new THREE.Mesh(G(key('tyre'), () => new THREE.TorusGeometry(R - L.tyre, L.tyre, 12, 32).rotateY(Math.PI / 2).scale(L.tyre > 0.035 ? 1.5 : 1, 1, 1)), rubber), w);
      if (L.knobs) {
        const knobs = add(new THREE.Mesh(G(key('knobs'), () => knobGeometry(R, L.tyre)), rubber), w);
        void knobs;
      }
      if (L.whitewall) {
        const ww = add(new THREE.Mesh(G(key('ww'), () => new THREE.TorusGeometry(R - L.tyre * 1.25, L.tyre * 0.42, 8, 32).rotateY(Math.PI / 2).scale(1.45, 1, 1)), new THREE.MeshStandardMaterial({ color: '#f6f2ea', roughness: 0.7 })), w);
        void ww;
      }
      add(new THREE.Mesh(G(key('hub'), () => new THREE.CylinderGeometry(R - L.tyre * 1.4, R - L.tyre * 1.4, 0.03 + (L.tyre > 0.035 ? 0.02 : 0), 18).rotateZ(Math.PI / 2)), motor ? darkAlu : L.chrome ? chrome : alu), w);
      for (let k = 0; k < 5; k++) {
        const sp = add(new THREE.Mesh(G(key('spoke'), () => new THREE.BoxGeometry(0.036 + (L.tyre > 0.035 ? 0.02 : 0), 0.012, 0.03).translate(0, (R - L.tyre) * 0.4, 0)), L.chrome ? chrome : alu), w);
        sp.rotation.x = (k / 5) * Math.PI * 2;
      }
      add(new THREE.Mesh(G('cap', () => new THREE.CylinderGeometry(0.018, 0.018, 0.042, 12).rotateZ(Math.PI / 2)), trimM), w);
      this.group.add(w);
      this.wheels.push(w);
    }
    // Rear springs (the off-roader): a swing arm's shock from the deck's tail to the axle.
    if (L.springs) {
      for (const s of [-1, 1]) {
        const coil = add(new THREE.Mesh(G(key('rcoil'), () => coilGeometry(0.016, 0.12, 6)), spring));
        coil.position.set(s * (L.tyre + 0.016), R + 0.03, L.rear - 0.07);
        coil.rotation.x = 0.9;
      }
    }
    // The rear fender (it's also the foot brake), the brake light set into its tail.
    const fR = R + (L.bigFenders ? 0.03 : 0.016);
    const fender = add(new THREE.Mesh(G(key('fender'), () => new THREE.CylinderGeometry(fR, fR, L.bigFenders ? 0.11 : 0.06, 18, 1, true, 0, Math.PI * 0.95).rotateZ(Math.PI / 2).rotateX(-Math.PI * 0.03)), paint));
    fender.position.set(0, R, L.rear);
    paint.side = THREE.DoubleSide;
    this.brakeMat = new THREE.MeshStandardMaterial({ color: '#ff2a2a', emissive: '#ff1a1a', emissiveIntensity: 0.4, roughness: 0.3 });
    const tail = add(new THREE.Mesh(G('tail', () => new RoundedBoxGeometry(0.05, 0.016, 0.012, 2, 0.004)), this.brakeMat));
    tail.position.set(0, R + 0.07, L.rear + R + 0.012);
    tail.rotation.x = -0.6;
    // A fin off the tail (the racer).
    if (L.fin) {
      const fin = add(new THREE.Mesh(G(key('fin'), () => {
        const sh = new THREE.Shape();
        sh.moveTo(0, 0);
        sh.lineTo(0.14, 0);
        sh.lineTo(0.16, 0.07);
        sh.lineTo(0.1, 0.07);
        sh.closePath();
        return new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: false }).translate(0, 0, -0.003).rotateY(-Math.PI / 2);
      }), paint));
      fin.position.set(0, R + fR * 0.6, L.rear - 0.02);
    }
    // Front mudguard.
    const guard = add(new THREE.Mesh(G(key('guard'), () => new THREE.CylinderGeometry(R + 0.014 + (L.bigFenders ? 0.016 : 0), R + 0.014 + (L.bigFenders ? 0.016 : 0), L.bigFenders ? 0.1 : 0.05, 14, 1, true, Math.PI * 0.05, Math.PI * 0.6).rotateZ(Math.PI / 2)), paint), fork);
    guard.position.set(0, R - neckTop + 0.012, -0.045);
    guard.visible = !L.carbon;
    // The kickstand, folded up along the deck's left underside (down when parked).
    this.stand = new THREE.Group();
    this.stand.position.set(-L.deckW * 0.42, top - L.deckT - 0.01, 0.12);
    const legLen = Math.max(0.09, top + 0.0);
    add(new THREE.Mesh(G(key('stand'), () => new THREE.CapsuleGeometry(0.007, legLen, 3, 6).translate(0, -legLen / 2 - 0.005, 0)), darkAlu), this.stand);
    this.group.add(this.stand);
    this.setStand(false);
    this._screenT = 0;
  }

  /** Kickstand down (parked) or up. */
  setStand(down) {
    this.stand.rotation.set(down ? 0.35 : 1.45, 0, down ? -0.35 : 0);
  }

  /** The display: the speed, and under it a bar of it — lime and glowing through a drink's boost. */
  _drawScreen(kmh, boost) {
    const g = this.screenCanvas.getContext('2d');
    g.fillStyle = boost ? '#14200c' : '#0c1014';
    g.fillRect(0, 0, 128, 80);
    g.fillStyle = boost ? '#c8ff9a' : '#e9f6ff';
    g.font = '800 40px ui-monospace, monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(Math.round(kmh)).padStart(2, '0'), 54, 34);
    g.font = '700 12px system-ui, sans-serif';
    g.fillText('km/h', 104, 44);
    // the bar: the motor's 70 km/h most of the way along, the drink's boost the rest
    g.fillStyle = '#2a3138';
    g.fillRect(12, 62, 104, 10);
    g.fillStyle = boost ? '#c8ff9a' : '#7cd6ff';
    g.fillRect(12, 62, Math.round(104 * Math.max(0, Math.min(1, kmh / 85))), 10);
    if (boost) {
      // (round the edge, the drink's glow)
      g.strokeStyle = 'rgba(200, 255, 154, 0.85)';
      g.lineWidth = 4;
      g.strokeRect(2, 2, 124, 76);
    }
    this.screenTex.needsUpdate = true;
  }

  /**
   * Each frame: `roll` the wheels' angle, `steer` the bars (−1…1, + left),
   * `braking`, `night` (0–1: lights on), and for the display `speed` (m/s) and `boost` (a drink's).
   */
  update(dt, { roll = 0, steer = 0, braking = false, night = 0, speed = 0, boost = false } = {}) {
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
        this._drawScreen(speed * 3.6, boost);
      }
    }
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.isMesh) {
        for (const m of [].concat(o.material)) {
          if (m.map && m.map !== gripTex) m.map.dispose();
          m.dispose();
        }
      }
    });
    this.screenTex?.dispose();
  }
}

/** A coil spring along +y (`turns` loops of radius r over a height h). */
function coilGeometry(r, h, turns) {
  const pts = [];
  for (let i = 0; i <= turns * 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, (i / (turns * 16)) * h, Math.sin(a) * r));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 16, 0.0035, 5, false);
}

/** The knobs round a knobbly tyre: little blocks set round its tread. */
function knobGeometry(R, tyre) {
  const parts = [];
  const n = 22;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    for (const x of [-0.6, 0.6]) {
      const b = new THREE.BoxGeometry(tyre * 0.9, 0.012, 0.018);
      b.translate(x * tyre * (k % 2 ? 0.6 : 1), R + 0.002, 0);
      b.rotateX(a);
      parts.push(b);
    }
  }
  const merged = mergeBoxes(parts);
  for (const p of parts) p.dispose();
  return merged;
}

function mergeBoxes(list) {
  let count = 0;
  let icount = 0;
  for (const g of list) {
    count += g.attributes.position.count;
    icount += g.index.count;
  }
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const idx = new Uint32Array(icount);
  let o = 0;
  let io = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.array[i] + o;
    o += g.attributes.position.count;
    io += g.index.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

export const SCOOTER = { DECK_TOP, WHEEL_R, FRONT_Z, REAR_Z, BAR_Y, STEM_RAKE };
