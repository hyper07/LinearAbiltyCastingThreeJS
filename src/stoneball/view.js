import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { create as treeRound } from '../../vendor/3dviz/kits/nature/tree-round.js';
import { create as treeConifer } from '../../vendor/3dviz/kits/nature/tree-conifer.js';
import { create as rockCluster } from '../../vendor/3dviz/kits/nature/rock-cluster.js';
import { playFx } from '../pixel/fx.js';
import { PITCH, BALL, LEATHERS } from './rules.js';
import { makeCaveman, hairGeometry } from './cavemen.js';

/**
 * Stoneball's 3D view: a prehistoric pitch in bright daylight (mown grass,
 * ash lines, a ring of boulders, standing-stone goals with a log crossbar
 * and a vine net, tall grass, trees, fire bowls, a mammoth-tusk arch and a
 * crowd of cavemen on the rocks), the six players, the stone, and a
 * broadcast camera that follows the play. It only draws: the match lives
 * in rules.js.
 *
 *   const view = new StoneballView(stage);           // a positioned element
 *   await view.setMatch(match);  view.snapshot(match); …step…; view.render(dt, match, alpha, { me, charge });
 */

const { hx, hz, goalHalf, bar, depth } = PITCH;
const R = BALL.r;
/** Broadcast view: from the near touchline, up and back. */
const CAM_OFFSET = new THREE.Vector3(0, 9.8, 14.8);

/** A seeded 0…1 stream (scenery placement stays put between visits). */
function seeded(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A welded icosahedron with every corner nudged: a rock. */
function rockGeometry(radius, detail, amount, random, squash = 1) {
  const g = new THREE.IcosahedronGeometry(radius, detail);
  const pos = g.attributes.position;
  const moves = new Map();
  for (let i = 0; i < pos.count; i++) {
    const k = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    if (!moves.has(k)) moves.set(k, 1 + (random() - 0.5) * 2 * amount);
    const m = moves.get(k);
    pos.setXYZ(i, pos.getX(i) * m, pos.getY(i) * m * squash, pos.getZ(i) * m);
  }
  g.computeVertexNormals();
  return g;
}

/** Points every `step` along a rounded rectangle (half-sizes ax, az, corner radius rc). */
function roundedRectPath(ax, az, rc, step) {
  const pts = [];
  const ix = ax - rc, iz = az - rc;
  const segs = [
    // straight edges and quarter arcs, counter-clockwise from the right edge
    { kind: 'line', a: [ax, -iz], b: [ax, iz], n: [1, 0] },
    { kind: 'arc', c: [ix, iz], a0: 0, a1: Math.PI / 2 },
    { kind: 'line', a: [ix, az], b: [-ix, az], n: [0, 1] },
    { kind: 'arc', c: [-ix, iz], a0: Math.PI / 2, a1: Math.PI },
    { kind: 'line', a: [-ax, iz], b: [-ax, -iz], n: [-1, 0] },
    { kind: 'arc', c: [-ix, -iz], a0: Math.PI, a1: Math.PI * 1.5 },
    { kind: 'line', a: [-ix, -az], b: [ix, -az], n: [0, -1] },
    { kind: 'arc', c: [ix, -iz], a0: Math.PI * 1.5, a1: Math.PI * 2 }
  ];
  for (const s of segs) {
    if (s.kind === 'line') {
      const L = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
      const n = Math.max(1, Math.round(L / step));
      for (let i = 0; i < n; i++) pts.push([s.a[0] + ((s.b[0] - s.a[0]) * i) / n, s.a[1] + ((s.b[1] - s.a[1]) * i) / n, s.n[0], s.n[1]]);
    } else {
      const L = rc * (s.a1 - s.a0);
      const n = Math.max(1, Math.round(L / step));
      for (let i = 0; i < n; i++) {
        const a = s.a0 + ((s.a1 - s.a0) * i) / n;
        pts.push([s.c[0] + Math.cos(a) * rc, s.c[1] + Math.sin(a) * rc, Math.cos(a), Math.sin(a)]);
      }
    }
  }
  return pts;
}

function canvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  return c;
}

export class StoneballView {
  constructor(stage) {
    this.stage = stage;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'sb-canvas';
    stage.append(this.canvas);
    this.labels = document.createElement('div');
    this.labels.className = 'sb-labels';
    stage.append(this.labels);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#a9d8ee');
    this.scene.fog = new THREE.Fog('#bfe3ee', 70, 150);
    this.camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 400);
    this.camPos = new THREE.Vector3(0, 16, 20);
    this.camLook = new THREE.Vector3(0, 0, 0);
    this.camOffset = CAM_OFFSET.clone();
    this.zoom = 1;
    this.shake = 0;
    this.goalCam = 0;
    this.time = 0;
    this.disposables = [];
    this.cavemen = [];
    this.tags = [];
    this.excite = 0;
    this._v = new THREE.Vector3();

    this.lights();
    this.ground();
    this.pitchLines();
    this.walls();
    this.goals();
    this.scenery();
    this.crowd = this.makeCrowd();
    this.ball = this.makeBall();
    this.marker = this.makeMarker();
    this.fx = this.makeEffects();
    this.fires = [];
    this._fireReady = this.fireBowls();
    this.resize();
  }

  track(...things) {
    this.disposables.push(...things);
    return things[0];
  }

  /* ============================================================ the world */

  lights() {
    const hemi = new THREE.HemisphereLight('#fff8e6', '#6f8f4a', 1.25);
    const sun = new THREE.DirectionalLight('#fff3dc', 2.5);
    sun.position.set(-14, 30, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 24, bottom: -24, near: 1, far: 90 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 3;
    this.sun = sun;
    this.scene.add(hemi, sun, sun.target);
    const fill = new THREE.DirectionalLight('#dfe9ff', 0.45);
    fill.position.set(12, 10, -14);
    this.scene.add(fill);
  }

  ground() {
    // The meadow round about: a big plane, a tiled grass-noise texture.
    const tile = canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#7aa94a';
      g.fillRect(0, 0, w, h);
      const rnd = seeded(5);
      for (let i = 0; i < 2600; i++) {
        const v = rnd();
        g.fillStyle = v < 0.5 ? 'rgba(60,100,40,0.18)' : 'rgba(170,210,110,0.16)';
        g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 3, 2 + rnd() * 3);
      }
    });
    const tex = this.track(new THREE.CanvasTexture(tile));
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(40, 40);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const geo = this.track(new THREE.PlaneGeometry(320, 320).rotateX(-Math.PI / 2));
    const mat = this.track(new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
    const meadow = new THREE.Mesh(geo, mat);
    meadow.receiveShadow = true;
    meadow.position.y = -0.02;
    this.scene.add(meadow);
  }

  /** The pitch: mown stripes and ash-white lines drawn on one canvas. */
  pitchLines() {
    const W = 2 * (hx + 3), H = 2 * (hz + 3);
    const ppu = 52;
    const cv = canvas(Math.round(W * ppu), Math.round(H * ppu), (g, w, h) => {
      const X = (x) => (x + W / 2) * ppu;
      const Z = (z) => (z + H / 2) * ppu;
      g.fillStyle = '#7aa94a';
      g.fillRect(0, 0, w, h);
      // The playing area, rounded like its wall, in mown stripes.
      g.save();
      const rr = (ax, az, rc) => {
        g.beginPath();
        g.roundRect(X(-ax), Z(-az), ax * 2 * ppu, az * 2 * ppu, rc * ppu);
      };
      rr(hx + 0.2, hz + 0.2, PITCH.corner + 0.2);
      g.clip();
      const stripe = 3;
      for (let i = 0; i * stripe < W; i++) {
        g.fillStyle = i % 2 ? '#86c255' : '#79b74a';
        g.fillRect(i * stripe * ppu, 0, stripe * ppu + 1, h);
      }
      const rnd = seeded(9);
      for (let i = 0; i < 26000; i++) {
        const v = rnd();
        g.fillStyle = v < 0.5 ? 'rgba(50,95,30,0.13)' : 'rgba(200,235,140,0.12)';
        g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 4, 2 + rnd() * 2);
      }
      // A worn patch in each goalmouth and the centre.
      for (const [x, r] of [[-hx + 1.6, 2.2], [hx - 1.6, 2.2], [0, 1.4]]) {
        const grad = g.createRadialGradient(X(x), Z(0), 0, X(x), Z(0), r * ppu);
        grad.addColorStop(0, 'rgba(150,130,80,0.45)');
        grad.addColorStop(1, 'rgba(150,130,80,0)');
        g.fillStyle = grad;
        g.fillRect(X(x - r), Z(-r), r * 2 * ppu, r * 2 * ppu);
      }
      g.restore();
      // Ash lines, laid on by hand: a few passes with a little wobble.
      const lineW = 0.13 * ppu;
      const pass = (draw) => {
        for (let k = 0; k < 3; k++) {
          g.save();
          g.translate((rnd() - 0.5) * 2, (rnd() - 0.5) * 2);
          g.strokeStyle = `rgba(255,252,238,${k === 0 ? 0.85 : 0.3})`;
          g.lineWidth = lineW * (k === 0 ? 1 : 1.5);
          g.lineCap = 'round';
          g.beginPath();
          draw();
          g.stroke();
          g.restore();
        }
      };
      const ix = hx - 0.45, iz = hz - 0.45;
      pass(() => g.roundRect(X(-ix), Z(-iz), ix * 2 * ppu, iz * 2 * ppu, (PITCH.corner - 0.45) * ppu));
      pass(() => {
        g.moveTo(X(0), Z(-iz));
        g.lineTo(X(0), Z(iz));
      });
      pass(() => g.arc(X(0), Z(0), PITCH.circle * ppu, 0, Math.PI * 2));
      for (const s of [-1, 1]) {
        const gx = s * ix;
        const bx = s * (ix - PITCH.boxDepth + 0.45);
        pass(() => {
          g.moveTo(X(gx), Z(-PITCH.boxHalf));
          g.lineTo(X(bx), Z(-PITCH.boxHalf));
          g.lineTo(X(bx), Z(PITCH.boxHalf));
          g.lineTo(X(gx), Z(PITCH.boxHalf));
        });
        const sx = s * (ix - 2);
        pass(() => {
          g.moveTo(X(gx), Z(-goalHalf - 1));
          g.lineTo(X(sx), Z(-goalHalf - 1));
          g.lineTo(X(sx), Z(goalHalf + 1));
          g.lineTo(X(gx), Z(goalHalf + 1));
        });
        pass(() => g.arc(X(s * (ix - PITCH.boxDepth + 0.45)), Z(0), 2.2 * ppu, s > 0 ? Math.PI * 0.5 : -Math.PI * 0.5, s > 0 ? Math.PI * 1.5 : Math.PI * 0.5));
      }
      g.fillStyle = 'rgba(255,252,238,0.9)';
      g.beginPath();
      g.arc(X(0), Z(0), 0.22 * ppu, 0, Math.PI * 2);
      g.fill();
    });
    const tex = this.track(new THREE.CanvasTexture(cv));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const geo = this.track(new THREE.PlaneGeometry(W, H).rotateX(-Math.PI / 2));
    const mat = this.track(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    const pitch = new THREE.Mesh(geo, mat);
    pitch.receiveShadow = true;
    pitch.position.y = 0.005;
    this.scene.add(pitch);
  }

  /** A ring of boulders, with a second ragged row and tall grass beyond. */
  walls() {
    const random = seeded(17);
    const shapes = [rockGeometry(1, 0, 0.22, random, 0.8), rockGeometry(1, 1, 0.18, random, 0.75), rockGeometry(1, 0, 0.3, random, 0.7)];
    shapes.forEach((g) => this.track(g));
    const mat = this.track(new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.92 }));
    const placed = [[], [], []];
    const stone = (x, z, s, h) => {
      const k = Math.floor(random() * 3);
      placed[k].push({ x, z, s, h, rot: random() * Math.PI * 2, tint: random() });
    };
    for (const [x, z] of roundedRectPath(hx + 0.62, hz + 0.62, PITCH.corner + 0.62, 0.78)) {
      if (Math.abs(x) > hx && Math.abs(z) < goalHalf + 0.8) continue; // the goal mouths
      stone(x, z, 0.52 + random() * 0.3, 0.42 + random() * 0.32);
    }
    for (const [x, z, nx, nz] of roundedRectPath(hx + 1.9, hz + 1.9, PITCH.corner + 1.9, 1.6)) {
      if (Math.abs(x) > hx && Math.abs(z) < goalHalf + 1.5) continue;
      stone(x + nx * (random() - 0.5) * 0.6, z + nz * (random() - 0.5) * 0.6, 0.75 + random() * 0.6, 0.6 + random() * 0.6);
    }
    // Close round the back of each goal.
    for (const s of [-1, 1]) {
      for (let z = -goalHalf - 1; z <= goalHalf + 1.01; z += 0.85) stone(s * (hx + depth + 0.75), z, 0.55 + random() * 0.3, 0.5 + random() * 0.4);
      for (const zs of [-1, 1]) for (let x = hx + 0.3; x < hx + depth + 0.5; x += 0.8) stone(s * x, zs * (goalHalf + 0.95), 0.5 + random() * 0.25, 0.45 + random() * 0.3);
    }
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
    placed.forEach((list, k) => {
      const inst = new THREE.InstancedMesh(shapes[k], mat, list.length);
      list.forEach((b, i) => {
        q.setFromEuler(e.set(0, b.rot, 0));
        m.compose(new THREE.Vector3(b.x, b.h * 0.35, b.z), q, new THREE.Vector3(b.s, b.h, b.s * (0.85 + b.tint * 0.3)));
        inst.setMatrixAt(i, m);
        const base = b.tint < 0.2 ? '#8f9a7c' : b.tint < 0.6 ? '#a19d94' : '#8e8a83';
        inst.setColorAt(i, c.set(base).multiplyScalar(0.9 + b.tint * 0.2));
      });
      inst.castShadow = true;
      inst.receiveShadow = true;
      this.scene.add(inst);
    });

    // Tall low-poly grass beyond the wall (it sways a little).
    const blade = (h, lean, a) => {
      const g = new THREE.BufferGeometry();
      const w = 0.07;
      const ca = Math.cos(a), sa = Math.sin(a);
      const p = [-w * ca, 0, -w * sa, w * ca, 0, w * sa, lean * sa, h, -lean * ca];
      g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute([0.32, 0.5, 0.2, 0.32, 0.5, 0.2, 0.72, 0.88, 0.42], 3));
      return g;
    };
    const blades = [];
    for (let i = 0; i < 7; i++) blades.push(blade(0.55 + random() * 0.6, (random() - 0.5) * 0.35, (i / 7) * Math.PI + random() * 0.3).translate((random() - 0.5) * 0.25, 0, (random() - 0.5) * 0.25));
    const tuft = this.track(mergeGeometries(blades));
    blades.forEach((b) => b.dispose());
    tuft.computeVertexNormals();
    const grassMat = this.track(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 }));
    const uTime = { value: 0 };
    this.grassTime = uTime;
    grassMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTime;
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float sway = sin(uTime * 1.6 + instanceMatrix[3].x * 0.45 + instanceMatrix[3].z * 0.3);
          transformed.x += sway * 0.09 * position.y;
          transformed.z += sway * 0.04 * position.y;
        #endif`
      );
    };
    const spots = [];
    for (let i = 0; i < 1500; i++) {
      // Around the pitch, thicker near the wall, thinning out into the meadow.
      const a = random() * Math.PI * 2;
      const out = 2.4 + Math.pow(random(), 1.6) * 16;
      const x = Math.cos(a) * (hx + out) * 1.02, z = Math.sin(a) * (hz + out) * 1.05;
      if (Math.abs(x) < hx + 2.4 && Math.abs(z) < hz + 2.4) continue;
      spots.push([x, z]);
    }
    const grass = new THREE.InstancedMesh(tuft, grassMat, spots.length);
    spots.forEach(([x, z], i) => {
      const s = 0.8 + random() * 0.9;
      m.compose(new THREE.Vector3(x, 0, z), q.setFromEuler(e.set(0, random() * Math.PI * 2, 0)), new THREE.Vector3(s, s * (0.8 + random() * 0.6), s));
      grass.setMatrixAt(i, m);
    });
    grass.receiveShadow = true;
    this.scene.add(grass);
  }

  /** Two standing stones, a log across, a net of vines. */
  goals() {
    const random = seeded(31);
    const stoneMat = this.track(new THREE.MeshStandardMaterial({ color: '#9b978f', flatShading: true, roughness: 0.9 }));
    const bark = this.track(new THREE.MeshStandardMaterial({ color: '#6b4a2e', flatShading: true, roughness: 0.95 }));
    const wood = this.track(new THREE.MeshStandardMaterial({ color: '#d2ae7c', flatShading: true, roughness: 0.9 }));
    const netTex = this.track(new THREE.CanvasTexture(canvas(128, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = '#6e5a34';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(w, h);
      g.moveTo(w, 0);
      g.lineTo(0, h);
      g.stroke();
      g.strokeStyle = '#8d7646';
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = '#5a4526';
      for (const [x, y] of [[w / 2, h / 2], [0, 0], [w, 0], [0, h], [w, h]]) {
        g.beginPath();
        g.arc(x, y, 6, 0, Math.PI * 2);
        g.fill();
      }
    })));
    netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping;
    netTex.colorSpace = THREE.SRGBColorSpace;
    const netMat = (rx, ry) => {
      const t = netTex.clone();
      t.repeat.set(rx, ry);
      t.needsUpdate = true;
      this.track(t);
      return this.track(new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 1 }));
    };
    const cell = 0.42;
    for (const s of [-1, 1]) {
      const goal = new THREE.Group();
      for (const zs of [-1, 1]) {
        const g = this.track(new THREE.BoxGeometry(0.62, 2.6, 0.66, 1, 4, 1));
        const pos = g.attributes.position;
        for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) * (0.85 + random() * 0.3), pos.getY(i), pos.getZ(i) * (0.85 + random() * 0.3));
        g.computeVertexNormals();
        const stone = new THREE.Mesh(g, stoneMat);
        stone.position.set(s * hx, 1.05, zs * goalHalf);
        stone.rotation.set((random() - 0.5) * 0.06, random(), (random() - 0.5) * 0.06);
        stone.castShadow = stone.receiveShadow = true;
        goal.add(stone);
      }
      // The crossbar: a log, bark on, cut ends pale.
      const logGeo = this.track(new THREE.CylinderGeometry(0.19, 0.21, goalHalf * 2 + 1.1, 8, 3).rotateX(Math.PI / 2));
      const log = new THREE.Mesh(logGeo, [bark, wood, wood]);
      log.position.set(s * hx, bar + 0.22, 0);
      log.rotation.y = (random() - 0.5) * 0.08;
      log.castShadow = true;
      goal.add(log);
      // A stub of a branch.
      const stubGeo = this.track(new THREE.CylinderGeometry(0.05, 0.07, 0.4, 5));
      const stub = new THREE.Mesh(stubGeo, bark);
      stub.position.set(s * hx, bar + 0.42, 0.8);
      stub.rotation.set(0.6, 0, s * 0.4);
      goal.add(stub);
      // The net: back, roof and sides, sloping back from the bar.
      const back = new THREE.Mesh(this.track(new THREE.PlaneGeometry(goalHalf * 2, bar + 0.2)), netMat((goalHalf * 2) / cell, (bar + 0.2) / cell));
      back.position.set(s * (hx + depth), (bar + 0.2) / 2, 0);
      back.rotation.y = Math.PI / 2;
      const roof = new THREE.Mesh(this.track(new THREE.PlaneGeometry(depth, goalHalf * 2)), netMat(depth / cell, (goalHalf * 2) / cell));
      roof.rotation.x = -Math.PI / 2;
      roof.position.set(s * (hx + depth / 2), bar + 0.2, 0);
      goal.add(back, roof);
      for (const zs of [-1, 1]) {
        const side = new THREE.Mesh(this.track(new THREE.PlaneGeometry(depth, bar + 0.2)), netMat(depth / cell, (bar + 0.2) / cell));
        side.position.set(s * (hx + depth / 2), (bar + 0.2) / 2, zs * goalHalf);
        goal.add(side);
        // A stake at each back corner.
        const stake = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.06, 0.08, bar + 0.4, 5)), bark);
        stake.position.set(s * (hx + depth), (bar + 0.4) / 2, zs * goalHalf);
        stake.castShadow = true;
        goal.add(stake);
      }
      const rail = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.07, 0.07, goalHalf * 2 + 0.2, 5).rotateX(Math.PI / 2)), bark);
      rail.position.set(s * (hx + depth), bar + 0.2, 0);
      goal.add(rail);
      this.scene.add(goal);
    }
  }

  scenery() {
    const random = seeded(77);
    const trees = [
      [-30, -27, 'round', 2.1], [-19, -31, 'conifer', 2.2], [-8, -33, 'round', 2.4], [9, -32, 'conifer', 2.3], [21, -29, 'round', 2.2], [32, -24, 'conifer', 2.1],
      [-34, -8, 'conifer', 2], [-33, 9, 'round', 2.1], [34, 6, 'round', 2], [35, -10, 'conifer', 2.2], [-26, 24, 'round', 2], [27, 25, 'conifer', 2.1],
      [-39, -20, 'round', 2.3], [40, -19, 'round', 2.3], [0, -38, 'conifer', 2.6]
    ];
    this.kitObjects = [];
    trees.forEach(([x, z, kind, s], i) => {
      const { group } = kind === 'round'
        ? treeRound({ seed: 3 + i, height: 3.4 + random() * 1.2, leaf: random() < 0.5 ? '#6a9a48' : '#7aa852' })
        : treeConifer({ seed: 5 + i, height: 4 + random() * 1.4, needle: '#4f7a4e' });
      group.position.set(x, 0, z);
      group.scale.setScalar(s);
      group.rotation.y = random() * Math.PI * 2;
      group.traverse((o) => {
        if (o.isMesh) o.castShadow = o.receiveShadow = true;
      });
      this.scene.add(group);
      this.kitObjects.push(group);
    });
    for (const [x, z, n] of [[-24, -20, 7], [26, -19, 6], [-28, 14, 5], [29, 15, 6], [14, -26, 5]]) {
      const { group } = rockCluster({ count: n, seed: Math.abs(x * 7 + z), spread: 1.4, rock: '#9a968e' });
      group.position.set(x, 0, z);
      group.scale.setScalar(2.2);
      group.traverse((o) => {
        if (o.isMesh) o.castShadow = o.receiveShadow = true;
      });
      this.scene.add(group);
      this.kitObjects.push(group);
    }
    // Terraces of flat rocks for the crowd along the far side, and behind each goal.
    const slabMat = this.track(new THREE.MeshStandardMaterial({ color: '#a29d93', flatShading: true, roughness: 0.92 }));
    this.terraces = [];
    const slab = (x, z, w, d, h) => {
      const g = this.track(rockGeometry(1, 1, 0.12, random, 1));
      const o = new THREE.Mesh(g, slabMat);
      o.scale.set(w / 2, h, d / 2);
      o.position.set(x, 0, z);
      o.castShadow = o.receiveShadow = true;
      this.scene.add(o);
      this.terraces.push({ x, z, w, d, top: h * 0.92 });
    };
    for (let x = -15; x <= 15; x += 3.4) {
      if (Math.abs(x) < 2.2) continue;
      slab(x + (random() - 0.5) * 0.4, -hz - 3.4, 3.2, 1.9, 0.45 + random() * 0.15);
      slab(x + 1.5 + (random() - 0.5) * 0.4, -hz - 5.3, 3.2, 2.1, 0.95 + random() * 0.2);
    }
    for (const s of [-1, 1]) {
      slab(s * (hx + 4.4), -4.2, 2.1, 3, 0.55);
      slab(s * (hx + 4.4), 4.2, 2.1, 3, 0.55);
    }
    // The mammoth-tusk arch behind the far side, in the middle.
    const ivory = this.track(new THREE.MeshStandardMaterial({ color: '#efe5cb', flatShading: true, roughness: 0.6 }));
    for (const s of [-1, 1]) {
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(s * 2.6, 0, 0), new THREE.Vector3(s * 3.1, 4.6, 0.3), new THREE.Vector3(-s * 0.15, 5.1, 0));
      const tube = this.track(new THREE.TubeGeometry(curve, 16, 0.42, 7, false));
      // Taper the tusk from its root to the tip.
      const pos = tube.attributes.position;
      const ring = 8;
      for (let i = 0; i < pos.count; i++) {
        const seg = Math.floor(i / ring);
        const t = seg / 16;
        const c = curve.getPointAt(t);
        const k = 1 - t * 0.78;
        pos.setXYZ(i, c.x + (pos.getX(i) - c.x) * k, c.y + (pos.getY(i) - c.y) * k, c.z + (pos.getZ(i) - c.z) * k);
      }
      tube.computeVertexNormals();
      const tusk = new THREE.Mesh(tube, ivory);
      tusk.position.set(0, 0, -hz - 6.8);
      tusk.castShadow = true;
      this.scene.add(tusk);
    }
    // A skull-ish boulder at each tusk's root.
    for (const s of [-1, 1]) {
      const g = this.track(rockGeometry(0.9, 0, 0.2, random, 0.8));
      const o = new THREE.Mesh(g, slabMat);
      o.position.set(s * 2.6, 0.35, -hz - 6.8);
      o.castShadow = true;
      this.scene.add(o);
    }
  }

  /** Stone fire bowls at the corners and by the arch, each with a pixel-art flame. */
  async fireBowls() {
    const random = seeded(55);
    const stoneMat = this.track(new THREE.MeshStandardMaterial({ color: '#8f8a82', flatShading: true, roughness: 0.9 }));
    const coal = this.track(new THREE.MeshStandardMaterial({ color: '#3a2216', emissive: '#ff5a1a', emissiveIntensity: 0.9, flatShading: true }));
    const prof = [[0.05, 0], [0.55, 0], [0.42, 0.25], [0.4, 0.6], [0.7, 0.85], [0.78, 1.15], [0.66, 1.18], [0.5, 1.0], [0.05, 1.0]].map(([x, y]) => new THREE.Vector2(x, y));
    const bowlGeo = this.track(new THREE.LatheGeometry(prof, 9));
    const coalGeo = this.track(new THREE.IcosahedronGeometry(0.5, 0).scale(1, 0.4, 1));
    const spots = [[-hx - 2.2, -hz - 2.2], [hx + 2.2, -hz - 2.2], [-hx - 2.2, hz + 2.2], [hx + 2.2, hz + 2.2], [-4.3, -hz - 7], [4.3, -hz - 7]];
    const bowls = spots.map(([x, z]) => {
      const bowl = new THREE.Mesh(bowlGeo, stoneMat);
      bowl.position.set(x, 0, z);
      bowl.rotation.y = random() * 6;
      bowl.castShadow = true;
      const c = new THREE.Mesh(coalGeo, coal);
      c.position.set(x, 1.05, z);
      this.scene.add(bowl, c);
      return [x, z];
    });
    const fire = await playFx('fire/brazier').catch(() => null);
    if (!fire || this.disposed) return;
    this.fireFx = fire;
    const tex = fire.texture(THREE);
    const mat = this.track(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    const aspect = fire.size[0] / fire.size[1];
    const oy = 1 - fire.origin[1] / fire.size[1];
    for (const [x, z] of bowls) {
      const sp = new THREE.Sprite(mat);
      const h = 2.1;
      sp.scale.set(h * aspect, h, 1);
      sp.center.set(fire.origin[0] / fire.size[0], oy);
      sp.position.set(x, 1.1, z);
      this.scene.add(sp);
      this.fires.push(sp);
    }
  }

  /* ============================================================ crowd */

  makeCrowd() {
    const random = seeded(123);
    const seats = [];
    for (const t of this.terraces) {
      const n = Math.max(1, Math.round(t.w / 1.05));
      for (let i = 0; i < n; i++) seats.push({ x: t.x - t.w / 2 + (i + 0.5) * (t.w / n) + (random() - 0.5) * 0.3, y: t.top, z: t.z + (random() - 0.5) * 0.4 });
    }
    const n = seats.length;
    const G = {
      torso: this.track(new THREE.IcosahedronGeometry(0.3, 1).scale(1, 1.1, 0.85).translate(0, 0.45, 0)),
      head: this.track(new THREE.IcosahedronGeometry(0.36, 1).translate(0, 1.05, 0)),
      hair: this.track(hairGeometry({ c: new THREE.Vector3(0, 1.05, -0.02), r: new THREE.Vector3(0.38, 0.36, 0.36), hair: '#ffffff', shag: 0.5, beard: false, face: 0.7 }, seeded(4))),
      arm: this.track(new THREE.CapsuleGeometry(0.08, 0.32, 2, 5).translate(0, -0.2, 0)),
      eyes: this.track(mergeGeometries([-1, 1].map((s) => new THREE.SphereGeometry(0.05, 6, 4).translate(s * 0.13, 1.08, 0.31))))
    };
    const flat = (o) => this.track(new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9, ...o }));
    const meshes = {
      torso: new THREE.InstancedMesh(G.torso, flat({ color: '#ffffff' }), n),
      head: new THREE.InstancedMesh(G.head, flat({ color: '#ffffff' }), n),
      hair: new THREE.InstancedMesh(G.hair, flat({ color: '#ffffff', vertexColors: true }), n),
      arm: new THREE.InstancedMesh(G.arm, flat({ color: '#ffffff' }), n * 2),
      eyes: new THREE.InstancedMesh(G.eyes, flat({ color: '#1d1510' }), n)
    };
    const SKINS = ['#e9b48c', '#d79c72', '#b97a52', '#8e5a3a'];
    const HAIRS = ['#2a1d14', '#3b2516', '#141110', '#6b3518', '#4a2f1d'];
    const people = seats.map((s, i) => ({ ...s, phase: random() * 10, jump: 0, side: s.x < 0 ? 0 : 1, scale: 0.85 + random() * 0.25, skin: SKINS[i % 4], hair: HAIRS[Math.floor(random() * 5)], mix: random() }));
    const c = new THREE.Color();
    people.forEach((p, i) => {
      meshes.head.setColorAt(i, c.set(p.skin));
      meshes.hair.setColorAt(i, c.set(p.hair));
      meshes.arm.setColorAt(i * 2, c.set(p.skin));
      meshes.arm.setColorAt(i * 2 + 1, c.set(p.skin));
    });
    for (const m of Object.values(meshes)) {
      m.castShadow = true;
      m.frustumCulled = false;
      this.scene.add(m);
    }
    return { people, meshes };
  }

  /** Crowd colours: each half of the stand wears one tribe's leather (a few turncoats in the middle). */
  paintCrowd(teams) {
    const { people, meshes } = this.crowd;
    const c = new THREE.Color();
    people.forEach((p, i) => {
      const side = Math.abs(p.x) < 4 ? (p.mix < 0.5 ? 0 : 1) : p.side;
      p.team = side;
      meshes.torso.setColorAt(i, c.set(teams[side].colour).multiplyScalar(0.85 + p.mix * 0.3));
    });
    meshes.torso.instanceColor.needsUpdate = true;
  }

  updateCrowd(dt) {
    const { people, meshes } = this.crowd;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
    this.excite = Math.max(0, this.excite - dt * 0.35);
    people.forEach((p, i) => {
      const fan = this.cheerTeam == null || this.cheerTeam === p.team;
      const ex = fan ? this.excite : this.excite * 0.15;
      const t = this.time * (3 + ex * 7) + p.phase;
      const hop = Math.max(0, Math.sin(t)) * (0.04 + ex * 0.45);
      // Face the play: turn a little toward the stone.
      const yaw = Math.atan2((this.ballX ?? 0) - p.x, 10) * 0.5;
      q.setFromEuler(e.set(0, yaw, 0));
      s.setScalar(p.scale);
      m.compose(v.set(p.x, p.y + hop, p.z), q, s);
      meshes.torso.setMatrixAt(i, m);
      meshes.head.setMatrixAt(i, m);
      meshes.hair.setMatrixAt(i, m);
      meshes.eyes.setMatrixAt(i, m);
      for (const side of [-1, 1]) {
        const up = ex > 0.2 ? Math.PI * (0.75 + 0.2 * Math.sin(t * 1.3 + side)) : 0.25 + Math.sin(t * 0.5) * 0.08;
        const arm = new THREE.Matrix4().compose(v.set(side * 0.3, 0.72, 0), new THREE.Quaternion().setFromEuler(e.set(0, 0, side * up)), new THREE.Vector3(1, 1, 1));
        meshes.arm.setMatrixAt(i * 2 + (side > 0 ? 1 : 0), m.clone().multiply(arm));
      }
    });
    for (const x of Object.values(meshes)) x.instanceMatrix.needsUpdate = true;
  }

  /* ============================================================ ball, marker, effects */

  makeBall() {
    const random = seeded(2024);
    const g = this.track(rockGeometry(R, 1, 0.13, random, 1));
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i += 3) {
      const v = random();
      c.set(v < 0.12 ? '#6d6a65' : v < 0.3 ? '#a8a49b' : '#8f8b84').multiplyScalar(0.9 + random() * 0.2);
      for (let j = 0; j < 3; j++) colors.set([c.r, c.g, c.b], (i + j) * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = this.track(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92 }));
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.ballSpin = new THREE.Vector3();
    return mesh;
  }

  makeMarker() {
    const group = new THREE.Group();
    const ring = new THREE.Mesh(this.track(new THREE.RingGeometry(0.58, 0.74, 36).rotateX(-Math.PI / 2)), this.track(new THREE.MeshBasicMaterial({ color: '#ffe680', transparent: true, opacity: 0.95, depthWrite: false })));
    const tri = new THREE.Shape();
    tri.moveTo(-0.2, 0.8);
    tri.lineTo(0.2, 0.8);
    tri.lineTo(0, 1.08);
    const arrow = new THREE.Mesh(this.track(new THREE.ShapeGeometry(tri).rotateX(Math.PI / 2)), ring.material);
    group.add(ring, arrow);
    group.position.y = 0.03;
    group.renderOrder = 2;
    this.scene.add(group);
    return group;
  }

  makeEffects() {
    const puff = this.track(new THREE.CanvasTexture(canvas(64, 64, (g) => {
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,0.9)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.45)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
    })));
    const dust = [];
    for (let i = 0; i < 48; i++) {
      const mat = this.track(new THREE.SpriteMaterial({ map: puff, color: '#e8dcc0', transparent: true, depthWrite: false, opacity: 0 }));
      const sp = new THREE.Sprite(mat);
      sp.visible = false;
      this.scene.add(sp);
      dust.push({ sp, life: 0, max: 1, vx: 0, vy: 0, vz: 0, size: 1 });
    }
    // Goal confetti: little leaves and flakes in the scorer's colour.
    const N = 160;
    const leaf = this.track(new THREE.PlaneGeometry(0.16, 0.24));
    const leafMat = this.track(new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide }));
    const confetti = new THREE.InstancedMesh(leaf, leafMat, N);
    confetti.frustumCulled = false;
    confetti.count = 0;
    this.scene.add(confetti);
    return { dust, next: 0, confetti, bits: [] };
  }

  puff(x, y, z, size = 1, n = 5, color = '#e8dcc0') {
    const { dust } = this.fx;
    for (let i = 0; i < n; i++) {
      const d = dust[this.fx.next++ % dust.length];
      const a = Math.random() * Math.PI * 2;
      const sp = (0.6 + Math.random() * 1.4) * size;
      Object.assign(d, { life: 0, max: 0.55 + Math.random() * 0.45, vx: Math.cos(a) * sp, vy: 0.4 + Math.random() * 0.8, vz: Math.sin(a) * sp, size: (0.5 + Math.random() * 0.5) * size });
      d.sp.position.set(x, y, z);
      d.sp.material.color.set(color);
      d.sp.visible = true;
    }
  }

  burst(x, z, colours) {
    const bits = this.fx.bits;
    bits.length = 0;
    for (let i = 0; i < this.fx.confetti.instanceMatrix.count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 6;
      bits.push({ x, y: 0.6 + Math.random(), z, vx: Math.cos(a) * sp * 0.6 - Math.sign(x) * 3, vy: 6 + Math.random() * 7, vz: Math.sin(a) * sp, rx: Math.random() * 6, ry: Math.random() * 6, spin: 4 + Math.random() * 8, life: 3 + Math.random() * 1.5 });
      this.fx.confetti.setColorAt(i, new THREE.Color(colours[i % colours.length]));
    }
    this.fx.confetti.instanceColor.needsUpdate = true;
    this.fx.confetti.count = bits.length;
  }

  updateEffects(dt) {
    for (const d of this.fx.dust) {
      if (!d.sp.visible) continue;
      d.life += dt;
      const t = d.life / d.max;
      if (t >= 1) {
        d.sp.visible = false;
        continue;
      }
      d.sp.position.x += d.vx * dt;
      d.sp.position.y += d.vy * dt;
      d.sp.position.z += d.vz * dt;
      d.vx *= 0.92;
      d.vz *= 0.92;
      const s = d.size * (0.6 + t * 1.4);
      d.sp.scale.set(s, s, s);
      d.sp.material.opacity = 0.75 * (1 - t);
    }
    const { bits, confetti } = this.fx;
    if (bits.length) {
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
      let alive = 0;
      bits.forEach((b, i) => {
        b.life -= dt;
        b.vy -= 9 * dt;
        b.vx *= 0.985;
        b.vz *= 0.985;
        if (b.vy < -2.2) b.vy = -2.2; // flutter down
        b.x += b.vx * dt;
        b.y = Math.max(0.02, b.y + b.vy * dt);
        b.z += b.vz * dt;
        b.rx += b.spin * dt;
        b.ry += b.spin * 0.7 * dt;
        if (b.life > 0) alive++;
        m.compose(v.set(b.x, b.y, b.z), q.setFromEuler(e.set(b.rx, b.ry, 0)), b.life > 0 ? one : v.clone().set(0, 0, 0));
        confetti.setMatrixAt(i, m);
      });
      confetti.instanceMatrix.needsUpdate = true;
      if (!alive) {
        bits.length = 0;
        confetti.count = 0;
      }
    }
  }

  /* ============================================================ the players */

  /** Dress the six for a match (each tribe in its leather). */
  async setMatch(match) {
    const token = (this._token = (this._token ?? 0) + 1);
    const made = await Promise.all(match.players.map((p) => {
      const L = LEATHERS.find((l) => l.id === match.teams[p.team].leather) ?? LEATHERS[p.team];
      return makeCaveman({ look: p.look, leather: L.colour, dark: L.dark });
    }));
    if (token !== this._token || this.disposed) {
      for (const c of made) c.dispose();
      return;
    }
    this.clearPlayers();
    this.cavemen = made;
    for (const c of made) this.scene.add(c.model);
    // A disc of team colour under each caveman: from up here the hair hides the tunic.
    this.discGeo ??= this.track(new THREE.CircleGeometry(0.6, 28).rotateX(-Math.PI / 2));
    this.rimGeo ??= this.track(new THREE.RingGeometry(0.56, 0.66, 28).rotateX(-Math.PI / 2));
    this.discs = match.players.map((p) => {
      const t = match.teams[p.team];
      const g = new THREE.Group();
      const fill = new THREE.Mesh(this.discGeo, new THREE.MeshBasicMaterial({ color: t.colour, transparent: true, opacity: 0.5, depthWrite: false }));
      const rim = new THREE.Mesh(this.rimGeo, new THREE.MeshBasicMaterial({ color: t.dark, transparent: true, opacity: 0.75, depthWrite: false }));
      g.add(fill, rim);
      g.position.y = 0.02;
      g.renderOrder = 1;
      this.scene.add(g);
      return g;
    });
    this.tags = match.players.map((p) => {
      const tag = document.createElement('div');
      tag.className = `sb-tag sb-tag--t${p.team}`;
      const pip = document.createElement('span');
      pip.className = 'sb-tag__pip';
      pip.style.background = match.teams[p.team].colour;
      tag.append(pip, document.createTextNode(p.name));
      this.labels.append(tag);
      return tag;
    });
    this.paintCrowd(match.teams);
    this.prev = null;
    this.snapshot(match);
    this.snapCamera(match);
  }

  clearPlayers() {
    for (const d of this.discs ?? []) {
      this.scene.remove(d);
      for (const m of d.children) m.material.dispose();
    }
    this.discs = [];
    for (const c of this.cavemen) {
      this.scene.remove(c.model);
      c.dispose();
    }
    this.cavemen = [];
    for (const t of this.tags) t.remove();
    this.tags = [];
  }

  /** Remember where things were before a tick, to draw between ticks. */
  snapshot(match) {
    const b = match.ball;
    this.prev = { players: match.players.map((p) => [p.x, p.z, p.face]), ball: [b.x, b.y, b.z] };
  }

  /** React to what happened in a tick: dust, confetti, the camera. */
  event(e, match) {
    const b = match.ball;
    switch (e.type) {
      case 'shot':
        this.zoomT = 1.1;
        this.puff(b.x, 0.1, b.z, 0.9, 6);
        break;
      case 'kick':
      case 'pass':
      case 'throw':
        this.puff(b.x, 0.1, b.z, 0.5, 3);
        break;
      case 'tackle':
        this.puff(e.x, 0.2, e.z, 1.2, 8);
        this.shake = Math.max(this.shake, 0.25);
        break;
      case 'lunge':
        this.puff(e.x, 0.1, e.z, 0.6, 3);
        break;
      case 'hit':
        this.puff(e.x, 0.6, e.z, 1, 6);
        this.shake = Math.max(this.shake, 0.3);
        break;
      case 'wall':
      case 'post':
        this.puff(e.x, 0.4, e.z, 0.7, 5, '#c9c4b8');
        if (e.power > 8) this.shake = Math.max(this.shake, 0.12);
        break;
      case 'thud':
        this.puff(e.x, 0.05, e.z, 0.7, 4);
        break;
      case 'save':
        this.excite = Math.max(this.excite, 0.6);
        this.cheerTeam = e.team;
        this.puff(e.x, 0.4, e.z, 1, 7);
        break;
      case 'goal': {
        const t = match.teams[e.team];
        this.burst(Math.sign(e.x) * (hx + 0.5), 0, [t.colour, t.dark, '#ffe27a', '#ffffff', '#8fcf5a']);
        this.excite = 1.4;
        this.cheerTeam = e.team;
        this.goalCam = 0.001;
        this.goalSide = Math.sign(e.x);
        this.shake = 0.35;
        break;
      }
      case 'end':
        this.excite = 1.2;
        this.cheerTeam = e.winner >= 0 ? e.winner : null;
        break;
    }
  }

  snapCamera(match) {
    const b = match.ball;
    this.camLook.set(b.x * 0.85, 0.4, b.z * 0.4 - 0.6);
    this.camOffset.copy(CAM_OFFSET);
    this.camPos.copy(this.camLook).add(CAM_OFFSET);
  }

  /**
   * Draw. `alpha` is how far between the last two ticks we are (0…1);
   * `ui.me` the human's caveman id; `ui.demo` turns the camera slowly (the title screen).
   */
  render(dt, match, alpha = 1, ui = {}) {
    this.time += dt;
    if (this.grassTime) this.grassTime.value = this.time;
    if (this.fireFx) this.fireFx.update(dt);
    const lerp = (a, b) => a + (b - a) * alpha;
    const lerpAng = (a, b) => {
      let d = b - a;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return a + d * alpha;
    };
    const prev = this.prev;
    // Players.
    match.players.forEach((p, i) => {
      const c = this.cavemen[i];
      if (!c) return;
      const [px, pz, pf] = prev?.players[i] ?? [p.x, p.z, p.face];
      c.model.position.set(lerp(px, p.x), 0, lerp(pz, p.z));
      c.model.rotation.y = lerpAng(pf, p.face);
      const speed = Math.hypot(p.vx, p.vz);
      c.update(dt, p, match.phase === 'kickoff' ? 0 : speed);
      this.discs[i]?.position.set(c.model.position.x, 0.02, c.model.position.z);
    });
    // The stone: rolls by how far it went, spins on in the air.
    const b = match.ball;
    const [bx, by, bz] = prev?.ball ?? [b.x, b.y, b.z];
    const old = this.ball.position.clone();
    this.ball.position.set(lerp(bx, b.x), lerp(by, b.y), lerp(bz, b.z));
    const mx = this.ball.position.x - old.x, mz = this.ball.position.z - old.z;
    const moved = Math.hypot(mx, mz);
    if (b.y <= R + 0.02 && moved > 1e-5 && moved < 2) {
      this.ballSpin.set(mz, 0, -mx).normalize().multiplyScalar(moved / R / Math.max(dt, 1e-3));
    } else this.ballSpin.multiplyScalar(Math.exp(-0.4 * dt));
    const w = this.ballSpin.length();
    if (w > 1e-4) this.ball.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(this._v.copy(this.ballSpin).divideScalar(w), w * dt));
    this.ballX = b.x;

    // The marker under the human's caveman.
    const me = ui.me != null ? this.cavemen[ui.me] : null;
    this.marker.visible = Boolean(me) && match.phase !== 'end';
    if (me) {
      this.marker.position.x = me.model.position.x;
      this.marker.position.z = me.model.position.z;
      this.marker.rotation.y = me.model.rotation.y;
      const pulse = 1 + Math.sin(this.time * 6) * 0.05 + (ui.charge ?? 0) * 0.25;
      this.marker.scale.set(pulse, 1, pulse);
    }

    this.updateCrowd(dt);
    this.updateEffects(dt);
    this.updateCamera(dt, match, ui);
    this.renderer.render(this.scene, this.camera);
    this.updateTags(match, ui);
  }

  updateCamera(dt, match, ui) {
    const b = match.ball;
    const k = 1 - Math.exp(-3.2 * dt);
    this.zoomT = Math.max(0, (this.zoomT ?? 0) - dt);
    let target, offset;
    if (match.phase === 'goal' && this.goalCam > 0) {
      // Swing round to the goal: closer, lower, turning.
      this.goalCam = Math.min(1, this.goalCam + dt * 0.45);
      const s = this.goalSide || 1;
      const t = this.goalCam * this.goalCam * (3 - 2 * this.goalCam);
      target = new THREE.Vector3(s * (hx - 3), 0.8, 0);
      const ang = -s * t * 0.75;
      const base = new THREE.Vector3(0, 7.5 - t * 2, 12 - t * 2);
      offset = base.applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
    } else {
      this.goalCam = 0;
      const clampX = hx - 6;
      target = new THREE.Vector3(Math.max(-clampX, Math.min(clampX, b.x * 0.9)), 0.4, b.z * 0.4 - 0.6);
      const zoom = this.zoomT > 0 ? 0.86 : 1;
      this.zoom += (zoom - this.zoom) * (1 - Math.exp(-2.5 * dt));
      offset = CAM_OFFSET.clone().multiplyScalar(this.zoom);
      if (ui.demo) offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.sin(this.time * 0.12) * 0.35);
    }
    // The look point chases the play; the camera rides along with it (no lag, so no sideways swing when panning).
    this.camLook.lerp(target, k);
    this.camOffset.lerp(offset, 1 - Math.exp(-2.2 * dt));
    this.camPos.copy(this.camLook).add(this.camOffset);
    this.camera.position.copy(this.camPos);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      const s = this.shake * 0.35;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
    }
    this.camera.lookAt(this.camLook);
    // Keep the sun's shadow box on the play.
    this.sun.target.position.set(this.camLook.x, 0, this.camLook.z * 0.5);
    this.sun.position.set(this.camLook.x - 14, 30, this.camLook.z * 0.5 + 16);
  }

  updateTags(match, ui) {
    const w = this.size?.w ?? 1, h = this.size?.h ?? 1;
    match.players.forEach((p, i) => {
      const tag = this.tags[i];
      const c = this.cavemen[i];
      if (!tag || !c) return;
      c.head.getWorldPosition(this._v);
      this._v.project(this.camera);
      const visible = this._v.z < 1 && Math.abs(this._v.x) < 1.1 && Math.abs(this._v.y) < 1.1;
      tag.style.display = visible ? '' : 'none';
      if (!visible) return;
      tag.style.transform = `translate(${((this._v.x + 1) / 2) * w}px, ${((1 - this._v.y) / 2) * h}px) translate(-50%, -100%)`;
      tag.classList.toggle('sb-tag--me', i === ui.me);
      tag.classList.toggle('sb-tag--ball', match.ball.owner === i);
    });
  }

  resize() {
    const w = this.stage.clientWidth || window.innerWidth;
    const h = this.stage.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // A narrow screen sees less pitch: widen the view a little.
    this.camera.fov = w / h < 1.3 ? 50 : 38;
    this.camera.updateProjectionMatrix();
    this.size = { w, h };
  }

  dispose() {
    this.disposed = true;
    this.clearPlayers();
    for (const d of this.disposables) d.dispose?.();
    for (const g of this.kitObjects ?? []) g.traverse((o) => o.isMesh && o.geometry?.dispose());
    for (const m of Object.values(this.crowd?.meshes ?? {})) m.dispose();
    this.fx?.confetti.dispose();
    this.fireFx?._texture?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
    this.canvas.remove();
    this.labels.remove();
  }
}
