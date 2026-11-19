/**
 * A little 3D stage for the buddy picker: the buddy stands on a round
 * pedestal and turns slowly; drag to spin it, tap it and it reacts. It also
 * renders the picture cards (each buddy, each hat) as small images.
 *
 *   const tt = new Turntable(host);
 *   tt.set({ species, color, hat })      rebuilds only what changed, with a reaction
 *   tt.react('cheer' | 'hop' | 'wave' | 'surprise' | 'happy')
 *   await tt.snapshot(object3d)          → a data: URL (transparent PNG)
 *   tt.dispose()
 */
import * as THREE from 'three';
import { makeCreature } from '../world/figures.js';
import { makeHat } from '../world/creatures/hats.js';

export class Turntable {
  constructor(host, { reducedMotion = false } = {}) {
    this.host = host;
    this.reducedMotion = reducedMotion;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'arc-turntable__canvas';
    host.append(this.canvas);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#c7b39a', 1.35));
    const key = new THREE.DirectionalLight('#fff3e0', 2.1);
    key.position.set(2.2, 4, 3.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 4;
    Object.assign(key.shadow.camera, { left: -1.5, right: 1.5, top: 2, bottom: -0.5, near: 0.5, far: 10 });
    this.scene.add(key);
    const rim = new THREE.DirectionalLight('#bfe3ff', 1.1);
    rim.position.set(-2.5, 2, -3);
    this.scene.add(rim);
    // The pedestal.
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.8, 0.14, 48), new THREE.MeshToonMaterial({ color: '#ffe9f4' }));
    ped.position.y = -0.07;
    ped.receiveShadow = true;
    const rimRing = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.03, 8, 64), new THREE.MeshToonMaterial({ color: '#ff9ed2' }));
    rimRing.rotation.x = Math.PI / 2;
    rimRing.position.y = 0;
    this.scene.add(ped, rimRing);
    this.spin = new THREE.Group();
    this.scene.add(this.spin);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    this.camera.position.set(0, 1.05, 4.1);
    this.camera.lookAt(0, 0.56, 0);
    this.angle = 0.5;
    this.vel = 0;
    this.current = null;
    this._drag();
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(host);
    this.resize();
    let last = performance.now();
    const loop = (now) => {
      this._raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      this.frame(dt);
    };
    this._raf = requestAnimationFrame(loop);
  }

  resize() {
    const w = this.host.clientWidth || 300, h = this.host.clientHeight || 240;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // keep the whole buddy (hat included) in view on narrow stages
    this.camera.position.z = 4.1 * Math.max(1, 1.1 / this.camera.aspect);
    this.camera.updateProjectionMatrix();
  }

  _drag() {
    let down = null, moved = 0;
    this.canvas.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, a: this.angle, t: performance.now() };
      moved = 0;
      this.canvas.setPointerCapture?.(e.pointerId);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      moved = Math.max(moved, Math.abs(dx));
      this.angle = down.a + dx * 0.012;
      this.vel = 0;
    });
    const up = (e) => {
      if (!down) return;
      if (moved < 6) this.onTap?.(e);
      else this.vel = 0;
      down = null;
    };
    this.canvas.addEventListener('pointerup', up);
    this.canvas.addEventListener('pointercancel', () => (down = null));
  }

  /** Show this buddy; react to what changed. */
  set({ species, color, hat }) {
    const prev = this.current;
    const same = prev && prev.species === species && prev.color === color && prev.hat === hat;
    if (same) return;
    if (this.fig) this.spin.remove(this.fig.group);
    this.fig = makeCreature({ species, color, hat, lod: 'ultra', seed: 3 });
    this.fig.group.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    this.spin.add(this.fig.group);
    this.current = { species, color, hat };
    if (!prev) this.react('wave');
    else if (prev.species !== species) this.react('hop');
    else if (prev.hat !== hat) this.react(hat === 'none' ? 'surprise' : 'cheer');
    else this.react('happy');
  }

  react(kind) {
    const f = this.fig;
    if (!f) return;
    if (kind === 'cheer') f.cheer(1.4);
    else if (kind === 'hop') {
      f.hop();
      f.happy(1.2);
    } else if (kind === 'wave') f.wave(1.6);
    else if (kind === 'surprise') f.surprise(0.9);
    else if (kind === 'happy') {
      f.happy(1.2);
      f.hop();
    } else if (kind === 'think') f.think(1.5);
  }

  /** A random happy reaction (when tapped). */
  tickle() {
    const all = ['cheer', 'hop', 'wave', 'surprise', 'happy'];
    this._last = all.filter((k) => k !== this._last)[Math.floor(Math.random() * (all.length - 1))];
    this.react(this._last);
  }

  frame(dt) {
    if (!this.reducedMotion) this.angle += dt * 0.45;
    this.spin.rotation.y = this.angle;
    this.fig?.update(dt, {});
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * A transparent picture of an object (a creature or a hat), framed to fit.
   * `fit` = { center: [x,y,z], size } in the object's units.
   */
  snapshot(obj, { size = 160, yaw = 0.5, center = null, radius = null, pitch = 0.18 } = {}) {
    const rt = new THREE.WebGLRenderTarget(size, size, { samples: 4, colorSpace: THREE.SRGBColorSpace });
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#ffffff', '#c7b39a', 1.4));
    const key = new THREE.DirectionalLight('#fff3e0', 2.1);
    key.position.set(2.2, 4, 3.2);
    scene.add(key);
    const holder = new THREE.Group();
    holder.add(obj);
    holder.rotation.y = yaw;
    scene.add(holder);
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(holder);
    const c = center ? new THREE.Vector3(...center) : box.getCenter(new THREE.Vector3());
    const r = radius ?? box.getSize(new THREE.Vector3()).length() * 0.5;
    const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
    const d = r / Math.sin(THREE.MathUtils.degToRad(15)) * 0.92;
    cam.position.set(c.x, c.y + Math.sin(pitch) * d, c.z + Math.cos(pitch) * d);
    cam.lookAt(c);
    const r0 = this.renderer;
    const prevTarget = r0.getRenderTarget();
    r0.setRenderTarget(rt);
    r0.setClearColor(0x000000, 0);
    r0.clear();
    r0.render(scene, cam);
    const px = new Uint8Array(size * size * 4);
    r0.readRenderTargetPixels(rt, 0, 0, size, size, px);
    r0.setRenderTarget(prevTarget);
    rt.dispose();
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) img.data.set(px.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
    ctx.putImageData(img, 0, 0);
    return cv.toDataURL('image/png');
  }

  /** A buddy's card picture. */
  buddyPicture(species, color) {
    const fig = makeCreature({ species, color, lod: 'high', seed: 5 });
    fig.happy(5);
    for (let i = 0; i < 10; i++) fig.update(0.05, {});
    return this.snapshot(fig.group, { center: [0, 0.55, 0], radius: 0.62, yaw: 0.35 });
  }

  /** A hat's card picture. */
  hatPicture(id) {
    const hat = makeHat(id);
    if (!hat) return null;
    hat.userData.spin?.rotation.set(0, 0.6, 0);
    return this.snapshot(hat, { yaw: 0.4, pitch: 0.3 });
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    this._ro.disconnect();
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
    this.canvas.remove();
  }
}
