import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Cars for Seoul: the Khronos "Car Concept" (CC BY 4.0, Eric Chadwick,
 * Darmstadt Graphics Group) from the asset library, in many paints. Its
 * licence leaves out the Khronos logos, so the steering-wheel emblem is
 * hidden and the number plate is our own. Its glass is made plain (glass
 * that bends light would draw the whole city twice), traffic leaves the
 * interior out, and far away a car is a light stand-in of a few boxes.
 */

const URL = './library/extras/car/CarConcept.glb';
/** Real paints, the way Seoul's cars are: mostly white, black, grey and silver; a few colours. */
export const PAINTS = ['#f4f4f2', '#f4f4f2', '#1b1c1f', '#8d9196', '#c4c7cb', '#2b3a55', '#7a1f24', '#3d4a3f', '#e6e1d4', '#f39a1e'];
const WHEELS = ['WheelFrontL', 'WheelFrontR', 'WheelRearL', 'WheelRearR'];
let loading = null;

/** A Seoul-style plate, our own: a made-up number on white. */
function plateTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 56;
  const g = c.getContext('2d');
  g.fillStyle = '#f7f7f4';
  g.fillRect(0, 0, 256, 56);
  g.strokeStyle = '#202020';
  g.lineWidth = 4;
  g.strokeRect(3, 3, 250, 50);
  g.fillStyle = '#151515';
  g.font = '700 34px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const n = Math.floor(1000 + Math.random() * 9000);
  g.fillText(`${12 + Math.floor(Math.random() * 80)}가 ${n}`, 128, 30);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function prepare(gltf) {
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  const at = (name) => scene.getObjectByName(name)?.getWorldPosition(new THREE.Vector3());
  const [fl, fr, rl] = [at('WheelFrontL'), at('WheelFrontR'), at('WheelRearL')];
  // Which way the car points in its file, and how big it is there.
  const forward = fl.clone().sub(rl).setY(0);
  const wheelbase = forward.length();
  const k = wheelbase > 10 ? 2.7 / wheelbase : 1; // centimetres, or metres
  const wheelBox = new THREE.Box3().setFromObject(scene.getObjectByName('WheelFrontL'));
  const radius = ((wheelBox.max.y - wheelBox.min.y) / 2) * k || 0.34;
  const wrap = new THREE.Group();
  const holder = new THREE.Group();
  holder.add(scene);
  wrap.add(holder);
  holder.rotation.y = Math.PI - Math.atan2(forward.x, forward.z); // its front to −z
  holder.scale.setScalar(k);
  wrap.updateMatrixWorld(true);
  // Centre between the axles, wheels on the ground.
  const box = new THREE.Box3().setFromObject(holder);
  // The middle of all four wheels (the left ones alone would put the car's middle on its left side).
  const rr = at('WheelRearR') ?? rl;
  const mid = fl.clone().add(rl).add(fr ?? fl).add(rr).multiplyScalar(0.25);
  scene.localToWorld(mid);
  holder.position.x -= mid.x;
  holder.position.z -= mid.z;
  holder.position.y -= box.min.y;
  wrap.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(holder).getSize(new THREE.Vector3());
  const plate = new THREE.MeshStandardMaterial({ map: plateTexture(), roughness: 0.4 });
  scene.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    if (/Emblem/i.test(o.name)) o.visible = false;
    if (/License/i.test(o.name)) o.material = plate;
    const m = o.material;
    if (m?.transmission > 0) {
      o.material = new THREE.MeshPhysicalMaterial({ color: '#1d2228', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55, clearcoat: 1, side: THREE.DoubleSide });
    }
  });
  // Each wheel's axle and up, in its own frame, so it can be spun and steered.
  const carInv = wrap.getWorldQuaternion(new THREE.Quaternion()).invert();
  const wheelInfo = {};
  for (const name of WHEELS) {
    const w = scene.getObjectByName(name);
    if (!w) continue;
    const toLocal = carInv.clone().multiply(w.getWorldQuaternion(new THREE.Quaternion())).invert();
    wheelInfo[name] = { base: w.quaternion.clone(), axle: new THREE.Vector3(1, 0, 0).applyQuaternion(toLocal).normalize(), up: new THREE.Vector3(0, 1, 0).applyQuaternion(toLocal).normalize() };
  }
  return { template: wrap, wheelInfo, length: size.z, width: size.x, height: size.y, wheelbase: wheelbase * k, radius };
}

export function loadCar() {
  return (loading ??= new GLTFLoader().loadAsync(URL).then(prepare).catch(() => null));
}

/** A stand-in for a car far away: body, cabin, wheels. */
function standIn(color, kind) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: '#1f252c', roughness: 0.1 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(kind.width * 0.95, kind.height * 0.45, kind.length * 0.97), paint);
  body.position.y = kind.height * 0.36;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(kind.width * 0.8, kind.height * 0.35, kind.length * 0.45), glass);
  cabin.position.set(0, kind.height * 0.74, kind.length * 0.05);
  g.add(body, cabin);
  return g;
}

/**
 * The parts that make one of the garage's cars itself (garage.js): a wing,
 * a ducktail or a lip at the back, a scoop on the bonnet, skirts down the
 * sides, a glow underneath. Built to the body's own size; the front is −z.
 */
function bodyKit(kind, look, color) {
  const g = new THREE.Group();
  const carbon = new THREE.MeshStandardMaterial({ color: '#1a1b1e', roughness: 0.35, metalness: 0.3 });
  const paint = new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, metalness: 0.6, clearcoat: 1 });
  const L = kind.length;
  const W = kind.width * 0.74; // the body, without the mirrors
  const H = kind.height;
  const box = (w, h, d, mat, x, y, z, rx = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    m.castShadow = true;
    g.add(m);
    return m;
  };
  if (look.spoiler === 'wing') {
    for (const s of [-1, 1]) box(0.05, 0.32, 0.12, carbon, s * W * 0.32, H * 0.78, L * 0.42);
    box(W * 0.92, 0.04, 0.34, carbon, 0, H * 0.94, L * 0.44, -0.12);
    for (const s of [-1, 1]) box(0.03, 0.16, 0.36, carbon, s * W * 0.46, H * 0.96, L * 0.44);
  } else if (look.spoiler === 'ducktail') box(W * 0.8, 0.06, 0.22, paint, 0, H * 0.66, L * 0.47, -0.35);
  else if (look.spoiler === 'lip') box(W * 0.7, 0.03, 0.12, carbon, 0, H * 0.62, L * 0.48, -0.2);
  if (look.scoop) box(W * 0.28, 0.08, L * 0.16, carbon, 0, H * 0.6, -L * 0.22);
  if (look.skirts) for (const s of [-1, 1]) box(0.06, 0.08, L * 0.5, carbon, s * W * 0.49, 0.14, 0);
  if (look.glow) {
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.9, L * 0.8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: look.glow, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.y = 0.04;
    g.add(glow);
  }
  // The model is turned and scaled inside its holder; the kit is built in the car's own frame.
  g.userData.kit = true;
  return g;
}

/**
 * One car in a paint. `lite` (traffic) leaves the inside out. Returns
 * { group, wheels, steer(angle), spin(radians), near(on) }.
 */
export function makeCar(kind, color, { lite = false, look = null } = {}) {
  const group = new THREE.Group();
  const model = kind.template.clone(true);
  if (look?.scale) model.scale.set(...look.scale);
  model.traverse((o) => {
    if (!o.isMesh) return;
    if (lite && /^(Interior|Engine|Axles)/.test(o.name)) o.visible = false;
    if (/^Paint/.test(o.material?.name ?? '')) {
      o.material = o.material.clone();
      o.material.color.set(color);
      if ('clearcoat' in o.material) o.material.clearcoat = 1;
    }
    if (/Headlight|Brakelight/.test(o.material?.name ?? '')) {
      o.material = o.material.clone();
      o.userData.light = /Headlight/.test(o.material.name) ? 'head' : 'brake';
    }
  });
  const far = standIn(color, kind);
  far.visible = false;
  group.add(model, far);
  if (look) model.add(bodyKit(kind, look, color));
  const wheels = Object.entries(kind.wheelInfo).map(([name, info]) => ({ node: model.getObjectByName(name), front: /Front/.test(name), ...info }));
  if (look?.wheels && look.wheels !== 1) for (const w of wheels) w.node?.scale.multiplyScalar(look.wheels);
  const lights = [];
  model.traverse((o) => o.userData.light && lights.push(o));
  let spun = 0;
  const qs = new THREE.Quaternion();
  const qt = new THREE.Quaternion();
  return {
    group,
    color,
    /** Turn the front wheels and roll all four. */
    wheels(steer, roll) {
      spun += roll;
      for (const w of wheels) {
        if (!w.node) continue;
        qs.setFromAxisAngle(w.up, w.front ? steer : 0);
        qt.setFromAxisAngle(w.axle, -spun);
        w.node.quaternion.copy(w.base).multiply(qs).multiply(qt);
      }
    },
    /** The full model near, the stand-in far. */
    near(on) {
      model.visible = on;
      far.visible = !on;
    },
    /** Headlights at night, brake lights when braking. */
    lights(night, braking) {
      for (const o of lights) {
        const on = o.userData.light === 'head' ? night : braking || night * 0.3;
        o.material.emissiveIntensity = o.userData.light === 'head' ? 0.4 + on * 6 : 0.3 + on * 5;
      }
    }
  };
}
