import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { MAP, CHAMPIONS, CAMPS, TEAM_COLORS, TOWERS } from './rules.js';
import { BASES, LANES, WALLS } from './map.js';

/**
 * Draws a Lanebreak match from snapshots (sim.js `snapshot()`, blended by
 * net.js's Mirror): the field, its lanes and river, walls of rock and trees,
 * towers and cores, every champion, minion and monster as an animated KayKit
 * character (CC0, Kay Lousberg), missiles and ability areas, and the fog of
 * war for the team being watched. It never changes the match.
 */

const KIT = {
  Knight: 'library/kaykit/KayKit-Character-Pack-Adventures-1.0/addons/kaykit_character_pack_adventures/Characters/gltf/Knight.glb',
  Barbarian: 'library/kaykit/KayKit-Character-Pack-Adventures-1.0/addons/kaykit_character_pack_adventures/Characters/gltf/Barbarian.glb',
  Mage: 'library/kaykit/KayKit-Character-Pack-Adventures-1.0/addons/kaykit_character_pack_adventures/Characters/gltf/Mage.glb',
  Rogue: 'library/kaykit/KayKit-Character-Pack-Adventures-1.0/addons/kaykit_character_pack_adventures/Characters/gltf/Rogue.glb',
  Rogue_Hooded: 'library/kaykit/KayKit-Character-Pack-Adventures-1.0/addons/kaykit_character_pack_adventures/Characters/gltf/Rogue_Hooded.glb',
  Skeleton_Mage: 'library/kaykit/KayKit-Character-Pack-Skeletons-1.0/addons/kaykit_character_pack_skeletons/Characters/gltf/Skeleton_Mage.glb',
  Skeleton_Minion: 'library/kaykit/KayKit-Character-Pack-Skeletons-1.0/addons/kaykit_character_pack_skeletons/Characters/gltf/Skeleton_Minion.glb',
  Skeleton_Warrior: 'library/kaykit/KayKit-Character-Pack-Skeletons-1.0/addons/kaykit_character_pack_skeletons/Characters/gltf/Skeleton_Warrior.glb',
  Skeleton_Rogue: 'library/kaykit/KayKit-Character-Pack-Skeletons-1.0/addons/kaykit_character_pack_skeletons/Characters/gltf/Skeleton_Rogue.glb'
};
/** Props the adventurers carry, hidden unless a champion shows them. */
const PROPS = /^(1H_|2H_|Badge_Shield|Rectangle_Shield|Round_Shield|Spike_Shield|Barbarian_Round_Shield|Mug|Spellbook|Knife|Throwable)/;
const MINION_BODY = { melee: 'Skeleton_Minion', caster: 'Skeleton_Mage', siege: 'Skeleton_Warrior' };
const MINION_TINT = { blue: '#9cc4ff', red: '#ffa0a0' };
const ABILITY_COLORS = {
  brakka: '#ffd27a', torva: '#ff7a3c', sela: '#ff8a3c', nyla: '#9fe2ff', kiro: '#ffe9a8', vex: '#b48cff', maru: '#9fffc8', rook: '#c8d0ff'
};

/** Darken what the watching team can't see now. */
function fogify(material, fow) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFow = fow;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vFowUv;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 fowW = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          fowW = instanceMatrix * fowW;
        #endif
        fowW = modelMatrix * fowW;
        vFowUv = fowW.xz / ${MAP.toFixed(1)};`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vFowUv;\nuniform sampler2D uFow;')
      .replace('#include <dithering_fragment>', `
        float fow = texture2D(uFow, vFowUv).r;
        gl_FragColor.rgb *= mix(0.42, 1.0, fow);
        #include <dithering_fragment>`);
  };
  material.customProgramCacheKey = () => 'lb-fow';
  return material;
}

export class MobaView {
  constructor(host, { team }) {
    this.team = team;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'lb__canvas';
    host.prepend(this.canvas);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0d1410');
    this.camera = new THREE.PerspectiveCamera(40, 1, 1, 600);
    this.target = new THREE.Vector3(BASES[team].spawn[0], 0, BASES[team].spawn[1]);
    this.zoom = 42;
    this.time = 0;
    this.models = new Map(); // id → { group, mixer, actions, clip, act, aa, kind }
    this.kit = new Map(); // body → gltf
    this.loading = new Map();
    this.fx = [];
    this.floaters = [];
    this.hover = null;
    this.selectedId = null;

    this.fowData = new Uint8Array(50 * 50);
    const tex = new THREE.DataTexture(this.fowData, 50, 50, THREE.RedFormat, THREE.UnsignedByteType);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    this.fow = { value: tex };

    this._lights();
    this._ground();
    this._walls();
    this._bases();
    this._effects();
  }

  /* ------------------------------------------------------------ the field */

  _lights() {
    this.scene.add(new THREE.HemisphereLight('#dff0ff', '#3a4428', 1.15));
    const sun = new THREE.DirectionalLight('#fff1d6', 2.3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 300 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.4;
    this.scene.add(sun, sun.target);
    this.sun = sun;
  }

  _ground() {
    // One painted picture of the field: grass, the lanes, the river, the two bases.
    const S = 1024;
    const k = S / MAP;
    const cvs = document.createElement('canvas');
    cvs.width = cvs.height = S;
    const g = cvs.getContext('2d');
    g.fillStyle = '#4f7a37';
    g.fillRect(0, 0, S, S);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(${30 + Math.random() * 40}, ${80 + Math.random() * 60}, ${20 + Math.random() * 30}, 0.18)`;
      const r = 4 + Math.random() * 18;
      g.beginPath();
      g.arc(Math.random() * S, Math.random() * S, r, 0, Math.PI * 2);
      g.fill();
    }
    // The river, corner to corner the other way.
    g.strokeStyle = '#3f8fb8';
    g.lineWidth = 12 * k;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(S, S);
    g.stroke();
    g.strokeStyle = 'rgba(180, 220, 240, 0.25)';
    g.lineWidth = 15 * k;
    g.stroke();
    for (const path of Object.values(LANES)) {
      for (const [w, c] of [[11, '#8a7350'], [8, '#a68a5f']]) {
        g.strokeStyle = c;
        g.lineWidth = w * k;
        g.lineJoin = 'round';
        g.beginPath();
        path.forEach(([x, z], i) => (i ? g.lineTo(x * k, z * k) : g.moveTo(x * k, z * k)));
        g.stroke();
      }
    }
    for (const team of ['blue', 'red']) {
      const [x, z] = BASES[team].core;
      g.fillStyle = '#8c8a84';
      g.beginPath();
      g.arc(x * k, z * k, 28 * k, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = TEAM_COLORS[team];
      g.lineWidth = 2 * k;
      g.stroke();
    }
    const tex = new THREE.CanvasTexture(cvs);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(MAP, MAP).rotateX(-Math.PI / 2).translate(MAP / 2, 0, MAP / 2), fogify(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }), this.fow));
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.ground = ground;
    this.groundPicture = cvs;
    const beyond = new THREE.Mesh(new THREE.PlaneGeometry(MAP * 4, MAP * 4).rotateX(-Math.PI / 2).translate(MAP / 2, -0.05, MAP / 2), new THREE.MeshBasicMaterial({ color: '#0a110c' }));
    this.scene.add(beyond);
  }

  _walls() {
    const rocks = [];
    const trees = [];
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const w of WALLS) {
      const count = Math.max(2, Math.round(w.r * w.r * 0.35));
      for (let i = 0; i < count; i++) {
        const a = rand() * Math.PI * 2;
        const d = Math.sqrt(rand()) * w.r;
        (w.kind === 'rock' ? rocks : trees).push([w.x + Math.cos(a) * d, w.z + Math.sin(a) * d, 0.7 + rand() * 0.7]);
      }
    }
    const o = new THREE.Object3D();
    const rockMesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1.6, 0), fogify(new THREE.MeshStandardMaterial({ color: '#7f7a70', roughness: 1, flatShading: true }), this.fow), rocks.length);
    rocks.forEach(([x, z, s], i) => {
      o.position.set(x, 0.5 * s, z);
      o.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      o.scale.set(s, s * 0.9, s);
      o.updateMatrix();
      rockMesh.setMatrixAt(i, o.matrix);
    });
    const crown = new THREE.InstancedMesh(new THREE.ConeGeometry(1.6, 4.2, 7).translate(0, 3.4, 0), fogify(new THREE.MeshStandardMaterial({ color: '#2f5f2c', roughness: 0.9, flatShading: true }), this.fow), trees.length);
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.35, 1.4, 6).translate(0, 0.7, 0), fogify(new THREE.MeshStandardMaterial({ color: '#5a3f2c' }), this.fow), trees.length);
    trees.forEach(([x, z, s], i) => {
      o.position.set(x, 0, z);
      o.rotation.set(0, rand() * 6, 0);
      o.scale.set(s, s * (0.9 + rand() * 0.4), s);
      o.updateMatrix();
      crown.setMatrixAt(i, o.matrix);
      trunk.setMatrixAt(i, o.matrix);
    });
    for (const m of [rockMesh, crown, trunk]) {
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
    }
  }

  _bases() {
    for (const team of ['blue', 'red']) {
      const [x, z] = BASES[team].fountain;
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(9, 10, 0.5, 32), new THREE.MeshStandardMaterial({ color: '#a6a39b', roughness: 0.8 }));
      pad.position.set(x, 0.25, z);
      pad.receiveShadow = true;
      const glow = new THREE.Mesh(new THREE.TorusGeometry(7, 0.25, 8, 48).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: TEAM_COLORS[team] }));
      glow.position.set(x, 0.6, z);
      this.scene.add(pad, glow);
    }
  }

  /** A tower or a core: stone and a crystal in the team's colour (our own shapes). */
  _tower(e) {
    const g = new THREE.Group();
    const stone = fogify(new THREE.MeshStandardMaterial({ color: '#9b978d', roughness: 0.85, flatShading: true }), this.fow);
    const gem = fogify(new THREE.MeshStandardMaterial({ color: TEAM_COLORS[e.tm], emissive: TEAM_COLORS[e.tm], emissiveIntensity: 0.6, roughness: 0.3, flatShading: true }), this.fow);
    if (e.tier === 'core') {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.5, 2, 8), stone);
      base.position.y = 1;
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(3, 0), gem);
      crystal.scale.set(1, 1.8, 1);
      crystal.position.y = 6.5;
      crystal.userData.spin = true;
      g.add(base, crystal);
    } else {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 1.2, 8), stone);
      base.position.y = 0.6;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 6, 8), stone);
      shaft.position.y = 4;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.3, 1, 8), stone);
      crown.position.y = 7.4;
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), gem);
      crystal.scale.set(1, 1.6, 1);
      crystal.position.y = 9.3;
      crystal.userData.spin = true;
      g.add(base, shaft, crown, crystal);
    }
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    g.position.set(e.x, 0, e.z);
    return g;
  }

  _effects() {
    const glow = new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    this.shotMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), glow, 400);
    this.shotMesh.frustumCulled = false;
    this.shotMesh.count = 0;
    this.fxMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), glow.clone(), 300);
    this.fxMesh.frustumCulled = false;
    this.fxMesh.count = 0;
    const disc = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.zoneMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), disc, 64);
    this.zoneMesh.frustumCulled = false;
    this.zoneMesh.count = 0;
    this.ringMesh = new THREE.InstancedMesh(new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }), 64);
    this.ringMesh.frustumCulled = false;
    this.ringMesh.count = 0;
    this.ringMesh.renderOrder = 2;
    this.scene.add(this.shotMesh, this.fxMesh, this.zoneMesh, this.ringMesh);
    this.ping = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.85, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#4ade80', transparent: true, depthWrite: false }));
    this.ping.visible = false;
    this.scene.add(this.ping);
    this.rangeRing = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false }));
    this.rangeRing.visible = false;
    this.scene.add(this.rangeRing);
  }

  /* --------------------------------------------------------- characters */

  _load(body) {
    if (this.kit.has(body)) return this.kit.get(body);
    if (!this.loading.has(body)) {
      this.loading.set(body, new GLTFLoader().loadAsync(`./${KIT[body]}`).then((gltf) => {
        this.kit.set(body, gltf);
        return gltf;
      }).catch(() => {
        this.kit.set(body, null);
        return null;
      }));
    }
    return undefined;
  }

  /** Start loading every body this match needs. */
  preload(snap) {
    const bodies = new Set(Object.values(MINION_BODY));
    for (const c of snap.champs) bodies.add(CHAMPIONS[c.champ].body);
    for (const k of Object.values(CAMPS)) bodies.add(k.body);
    return Promise.all([...bodies].map((b) => (this._load(b), this.loading.get(b))));
  }

  /** A character for an entity: its KayKit body (or a stand-in until it loads). */
  _character(e, champ) {
    let body;
    let show = [];
    let tint = '#ffffff';
    let height = 2.3;
    if (e.k === 'champ') {
      const def = CHAMPIONS[champ.champ];
      body = def.body;
      show = def.show;
      tint = def.tint;
    } else if (e.k === 'minion') {
      body = MINION_BODY[e.kind];
      tint = MINION_TINT[e.tm];
      height = e.kind === 'siege' ? 2.4 : 1.55;
    } else {
      const def = CAMPS[e.kind];
      body = def.body;
      tint = def.tint;
      height = 1.9 * def.scale;
    }
    const gltf = this._load(body);
    const group = new THREE.Group();
    if (!gltf) {
      // Loading (or no library): a simple marker until it's here.
      const stand = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, height - 1, 4, 8).translate(0, height / 2, 0), fogify(new THREE.MeshStandardMaterial({ color: e.tm === 'neutral' ? '#9a8' : TEAM_COLORS[e.tm] }), this.fow));
      stand.castShadow = true;
      group.add(stand);
      return { group, mixer: null, actions: {}, placeholder: gltf === undefined, body };
    }
    const model = SkeletonUtils.clone(gltf.scene);
    const color = new THREE.Color(tint);
    model.traverse((o) => {
      if (!o.isMesh) return;
      if (PROPS.test(o.name) && !show.includes(o.name)) {
        o.visible = false;
        return;
      }
      o.castShadow = e.k === 'champ' || e.k === 'camp';
      o.frustumCulled = false;
      o.material = fogify(o.material.clone(), this.fow);
      o.material.color.multiply(color);
    });
    const box = new THREE.Box3().setFromObject(model);
    const h = Math.max(0.1, box.max.y - box.min.y);
    model.scale.setScalar(height / h);
    group.add(model);
    const mixer = new THREE.AnimationMixer(model);
    const actions = {};
    for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
    return { group, mixer, actions, placeholder: false, body };
  }

  _clipFor(e, champ, act) {
    const def = e.k === 'champ' ? CHAMPIONS[champ.champ] : null;
    switch (act) {
      case 'run':
        return 'Running_A';
      case 'attack':
        if (def) return def.attack;
        return e.k === 'minion' ? (e.kind === 'caster' ? 'Spellcast_Shoot' : '1H_Melee_Attack_Chop') : '2H_Melee_Attack_Chop';
      case 'cast':
        return def?.cast ?? 'Spellcast_Shoot';
      case 'dash':
        return 'Dodge_Forward';
      case 'recall':
        return 'Spellcasting';
      case 'dead':
        return 'Death_A';
      default:
        return 'Idle';
    }
  }

  _animate(m, e, champ, dt) {
    if (!m.mixer) return;
    const act = e.dead ? 'dead' : e.act;
    const fresh = act !== m.act || ((act === 'attack' || act === 'cast') && e.aa !== m.aa);
    if (fresh) {
      const name = this._clipFor(e, champ, act);
      const next = m.actions[name] ?? m.actions.Idle;
      if (next) {
        const once = act === 'attack' || act === 'cast' || act === 'dead' || act === 'dash';
        next.reset();
        next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
        next.clampWhenFinished = act === 'dead';
        next.timeScale = act === 'attack' ? 1.4 : 1;
        next.play();
        if (m.current && m.current !== next) m.current.crossFadeTo(next, 0.12, false);
        m.current = next;
      }
      m.act = act;
      m.aa = e.aa;
    } else if (m.current && (act === 'attack' || act === 'cast') && !m.current.isRunning() && m.actions.Idle) {
      // Finished the swing: back to standing.
      const idle = m.actions.Idle;
      idle.reset().play();
      m.current.crossFadeTo(idle, 0.15, false);
      m.current = idle;
      m.act = 'idle-after';
    }
    m.mixer.update(dt);
  }

  /* ------------------------------------------------------------- camera */

  lookAt(x, z) {
    this.target.set(Math.max(0, Math.min(MAP, x)), 0, Math.max(0, Math.min(MAP, z)));
  }

  pan(dx, dz) {
    this.lookAt(this.target.x + dx, this.target.z + dz);
  }

  zoomBy(f) {
    this.zoom = Math.max(26, Math.min(70, this.zoom * f));
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.width = w;
    this.height = h;
  }

  _place() {
    const pitch = 1.0;
    this.camera.position.set(this.target.x, Math.sin(pitch) * this.zoom, this.target.z + Math.cos(pitch) * this.zoom);
    this.camera.lookAt(this.target.x, 0, this.target.z - 2);
    this.camera.updateMatrixWorld();
    this.sun.position.set(this.target.x + 40, 90, this.target.z + 30);
    this.sun.target.position.set(this.target.x, 0, this.target.z);
    this.sun.target.updateMatrixWorld();
  }

  /** The ground point under a screen position (the field is flat). */
  groundAt(px, py) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((px / this.width) * 2 - 1, -(py / this.height) * 2 + 1), this.camera);
    const { origin: o, direction: d } = ray.ray;
    if (d.y >= -1e-4) return null;
    const t = -o.y / d.y;
    return { x: o.x + d.x * t, z: o.z + d.z * t };
  }

  toScreen(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: ((v.x + 1) / 2) * this.width, y: ((1 - v.y) / 2) * this.height, front: v.z < 1 };
  }

  /** The entity under a screen point (what a right-click or a targeted ability means). */
  pick(state, px, py) {
    let best = null;
    let bestD = Infinity;
    for (const e of state.ents) {
      if (e.dead || !this.sees(state, e)) continue;
      const h = e.k === 'tower' ? 4 : e.k === 'champ' ? 1.2 : 0.8;
      const p = this.toScreen(e.x, h, e.z);
      const edge = this.toScreen(e.x + (e.k === 'tower' ? (e.tier === 'core' ? 4.5 : 2.2) : e.k === 'champ' ? 1.2 : 0.9), h, e.z);
      const r = Math.max(14, Math.abs(edge.x - p.x));
      const d = Math.hypot(p.x - px, p.y - py);
      if (d <= r && d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /** Whether the watching team can see an entity. */
  sees(state, e) {
    if (e.tm === this.team || e.k === 'tower') return true;
    const cx = Math.max(0, Math.min(49, Math.floor(e.x / 4)));
    const cz = Math.max(0, Math.min(49, Math.floor(e.z / 4)));
    return this.fowData[cz * 50 + cx] > 128;
  }

  /** The watching team's sight, from its own units (what a guest has too). */
  _updateFow(state) {
    const v = this.fowData;
    v.fill(0);
    const mark = (x, z, r) => {
      const cr = Math.ceil(r / 4);
      const cx = Math.floor(x / 4);
      const cz = Math.floor(z / 4);
      for (let dz = -cr; dz <= cr; dz++) {
        const zz = cz + dz;
        if (zz < 0 || zz >= 50) continue;
        const w = Math.floor(Math.sqrt(cr * cr - dz * dz));
        for (let xx = Math.max(0, cx - w); xx <= Math.min(49, cx + w); xx++) v[zz * 50 + xx] = 255;
      }
    };
    for (const e of state.ents) {
      if (e.tm !== this.team || e.dead) continue;
      mark(e.x, e.z, e.k === 'champ' ? 24 : e.k === 'tower' ? 22 : 12);
    }
    const [fx, fz] = BASES[this.team].fountain;
    mark(fx, fz, 30);
    this.fow.value.needsUpdate = true;
  }

  /* -------------------------------------------------------------- events */

  absorb(events, state, mySlot) {
    const me = state?.champs?.[mySlot];
    const byId = new Map((state?.ents ?? []).map((e) => [e.i, e]));
    for (const ev of events) {
      switch (ev.type) {
        case 'land':
          this._fx(ev.x, 0.3, ev.z, ev.radius * 0.6, ev.radius, 0.45, ABILITY_COLORS[ev.champ] ?? '#ffffff');
          break;
        case 'shot-hit':
          this._fx(ev.x, 1.2, ev.z, 0.3, 1.4, 0.3, ABILITY_COLORS[ev.champ] ?? '#ffffff');
          break;
        case 'blink':
          this._fx(ev.from[0], 1, ev.from[1], 0.3, 1.8, 0.35, '#c9a8ff');
          this._fx(ev.to[0], 1, ev.to[1], 0.3, 1.8, 0.35, '#c9a8ff');
          break;
        case 'death': {
          const big = ev.kind === 'tower' ? 6 : 1.4;
          this._fx(ev.x, 1, ev.z, big * 0.3, big, ev.kind === 'tower' ? 1 : 0.4, ev.kind === 'tower' ? '#ffb05c' : '#ff8a5c');
          break;
        }
        case 'level': {
          const c = state?.champs?.[ev.slot];
          const e = c && byId.get(c.i);
          if (e) this._fx(e.x, 0.3, e.z, 0.5, 2.5, 0.6, '#ffe28a');
          break;
        }
        case 'mend': {
          const e = byId.get(ev.id);
          if (e) this._fx(e.x, 1, e.z, 0.5, 2, 0.5, '#7dffa8');
          break;
        }
        case 'hit': {
          // Numbers for what you deal and what you take.
          if (!me) break;
          const e = byId.get(ev.id);
          if (!e) break;
          if (ev.by === me.i || ev.id === me.i) this.floaters.push({ x: e.x, z: e.z, t: 0, text: String(ev.amount), color: ev.id === me.i ? '#ff6b6b' : ev.kind === 'magic' ? '#c9a8ff' : '#ffe08a' });
          break;
        }
        case 'heal': {
          const e = byId.get(ev.id);
          if (e && me && (ev.id === me.i || ev.by === me.i) && ev.amount >= 5) this.floaters.push({ x: e.x, z: e.z, t: 0, text: `+${ev.amount}`, color: '#6bff9b' });
          break;
        }
        case 'gold':
          if (me && ev.slot === mySlot && ev.amount >= 10) this.floaters.push({ x: ev.x, z: ev.z, t: 0, text: `+${ev.amount}g`, color: '#ffd24a' });
          break;
        default:
          break;
      }
    }
  }

  _fx(x, y, z, r0, r1, dur, color) {
    if (this.fx.length > 280) this.fx.shift();
    this.fx.push({ x, y, z, r0, r1, t: 0, dur, color: new THREE.Color(color) });
  }

  pulse(x, z, color = '#4ade80') {
    this.ping.material.color.set(color);
    this.ping.position.set(x, 0.08, z);
    this.ping.userData.t = 0;
    this.ping.visible = true;
  }

  showRange(e, range) {
    if (!e || !range) {
      this.rangeRing.visible = false;
      return;
    }
    this.rangeRing.position.set(e.x, 0.06, e.z);
    this.rangeRing.scale.setScalar(range);
    this.rangeRing.visible = true;
  }

  /* --------------------------------------------------------------- frame */

  render(state, dt) {
    this.time += dt;
    this._place();
    if (!state) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this._updateFow(state);
    const champs = new Map(state.champs.map((c) => [c.i, c]));
    const alive = new Set();
    const o = new THREE.Object3D();
    const color = new THREE.Color();
    const view = this.target;
    for (const e of state.ents) {
      alive.add(e.i);
      let m = this.models.get(e.i);
      if (!m || (m.placeholder && this.kit.get(m.body))) {
        if (m) this.scene.remove(m.group);
        m = e.k === 'tower' ? { group: this._tower(e), tower: true } : this._character(e, champs.get(e.i));
        if (e.k !== 'tower') {
          // A ring under every unit in its side's colour.
          const ring = new THREE.Mesh(new THREE.RingGeometry(e.k === 'champ' ? 0.9 : 0.55, e.k === 'champ' ? 1.1 : 0.68, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: e.tm === 'neutral' ? '#c8b46a' : TEAM_COLORS[e.tm], transparent: true, opacity: 0.85, depthWrite: false }));
          ring.position.y = 0.05;
          m.group.add(ring);
        }
        this.scene.add(m.group);
        this.models.set(e.i, m);
      }
      const seen = this.sees(state, e);
      const near = Math.abs(e.x - view.x) < 70 && Math.abs(e.z - view.z) < 60;
      m.group.visible = seen && near && !(e.k === 'champ' && e.dead && this.time - (m.diedAt ?? this.time) > 4);
      if (e.k === 'champ' && e.dead && m.diedAt == null) m.diedAt = this.time;
      if (e.k === 'champ' && !e.dead) m.diedAt = null;
      if (!m.group.visible) continue;
      m.group.position.set(e.x, 0, e.z);
      if (!m.tower) {
        m.group.rotation.y = e.a;
        this._animate(m, e, champs.get(e.i), dt);
      } else {
        m.group.traverse((c) => c.userData.spin && (c.rotation.y += dt * 0.8));
      }
    }
    for (const [id, m] of this.models) {
      if (alive.has(id)) continue;
      this.scene.remove(m.group);
      this.models.delete(id);
    }

    // Missiles.
    let si = 0;
    for (const s of state.shots) {
      if (si >= 400) break;
      if (!this.sees(state, { tm: s.team, x: s.x, z: s.z, k: 'shot' }) && s.team !== this.team) continue;
      o.position.set(s.x, s.tower ? 5 : 1.3, s.z);
      o.rotation.set(0, 0, 0);
      o.scale.setScalar(s.k === 'skill' ? 0.55 : s.tower ? 0.5 : 0.22);
      o.updateMatrix();
      this.shotMesh.setMatrixAt(si, o.matrix);
      this.shotMesh.setColorAt(si, color.set(s.champ ? ABILITY_COLORS[s.champ] ?? '#fff' : s.tower ? TEAM_COLORS[s.team] : '#ffe9b0'));
      si++;
    }
    this.shotMesh.count = si;
    this.shotMesh.instanceMatrix.needsUpdate = true;
    if (this.shotMesh.instanceColor) this.shotMesh.instanceColor.needsUpdate = true;

    // Ability areas: a warning ring before they land, a glow while they linger.
    let zi = 0;
    let ri = 0;
    for (const z of state.zones) {
      const c = ABILITY_COLORS[z.champ] ?? '#ffffff';
      if (z.land > 0 && ri < 64) {
        o.position.set(z.x, 0.07, z.z);
        o.rotation.set(0, 0, 0);
        o.scale.setScalar(z.r);
        o.updateMatrix();
        this.ringMesh.setMatrixAt(ri, o.matrix);
        this.ringMesh.setColorAt(ri, color.set(z.team === this.team ? c : '#ff4d4d'));
        ri++;
      }
      if (zi < 64) {
        o.position.set(z.x, 0.06, z.z);
        o.rotation.set(0, 0, 0);
        o.scale.setScalar(z.r * (z.land > 0 ? 0.35 : 1));
        o.updateMatrix();
        this.zoneMesh.setMatrixAt(zi, o.matrix);
        this.zoneMesh.setColorAt(zi, color.set(c).multiplyScalar(z.land > 0 ? 0.25 : 0.4));
        zi++;
      }
    }
    this.zoneMesh.count = zi;
    this.ringMesh.count = ri;
    for (const m of [this.zoneMesh, this.ringMesh]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }

    let fi = 0;
    this.fx = this.fx.filter((f) => (f.t += dt) < f.dur);
    for (const f of this.fx) {
      const k = f.t / f.dur;
      o.position.set(f.x, f.y, f.z);
      o.rotation.set(0, 0, 0);
      o.scale.setScalar(f.r0 + (f.r1 - f.r0) * k);
      o.updateMatrix();
      this.fxMesh.setMatrixAt(fi, o.matrix);
      this.fxMesh.setColorAt(fi, color.copy(f.color).multiplyScalar(1 - k));
      fi++;
    }
    this.fxMesh.count = fi;
    this.fxMesh.instanceMatrix.needsUpdate = true;
    if (this.fxMesh.instanceColor) this.fxMesh.instanceColor.needsUpdate = true;

    if (this.ping.visible) {
      const t = (this.ping.userData.t += dt);
      this.ping.scale.setScalar(0.6 + t * 2.5);
      this.ping.material.opacity = Math.max(0, 1 - t / 0.45);
      if (t > 0.45) this.ping.visible = false;
    }
    this.floaters = this.floaters.filter((f) => (f.t += dt) < 1);
    this.renderer.render(this.scene, this.camera);
  }

  /** Bars and names over everyone, and the floating numbers. */
  drawOverlay(ctx, state, mySlot) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (!state) return;
    const dpr = ctx.canvas.width / Math.max(1, this.width);
    ctx.save();
    ctx.scale(dpr, dpr);
    const champs = new Map(state.champs.map((c) => [c.i, c]));
    for (const e of state.ents) {
      if (e.dead || !this.sees(state, e)) continue;
      const h = e.k === 'tower' ? (e.tier === 'core' ? 11 : 11.5) : e.k === 'champ' ? 3.1 : e.k === 'camp' ? 1.9 * CAMPS[e.kind].scale + 0.7 : 2.1;
      const p = this.toScreen(e.x, h, e.z);
      if (!p.front || p.x < -60 || p.y < -30 || p.x > this.width + 60 || p.y > this.height + 30) continue;
      const mine = e.tm === this.team;
      const k = Math.max(0, e.hp / Math.max(1, e.mh));
      if (e.k === 'champ') {
        const c = champs.get(e.i);
        const w = 74;
        const x = p.x - w / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(x - 16, p.y - 2, w + 18, 13);
        ctx.fillStyle = c?.s === mySlot ? '#4ade80' : mine ? '#3d8bff' : '#ef4f4f';
        ctx.fillRect(x, p.y, w * k, 6);
        if (e.sh) {
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.fillRect(x + w * k, p.y, Math.min(w * (1 - k), (w * e.sh) / Math.max(1, e.mh)), 6);
        }
        if (c) {
          ctx.fillStyle = '#5aa7ff';
          ctx.fillRect(x, p.y + 7, w * (c.mana / Math.max(1, c.mm)), 3);
          ctx.fillStyle = '#fff';
          ctx.font = '700 10px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(String(c.level), x - 8, p.y + 8);
          ctx.font = '600 11px system-ui, sans-serif';
          ctx.fillStyle = 'rgba(255,255,255,0.92)';
          ctx.fillText(c.name, p.x, p.y - 5);
        }
        if (e.st || e.rt) {
          ctx.fillStyle = '#ffd166';
          ctx.font = '700 10px system-ui, sans-serif';
          ctx.fillText(e.st ? 'STUNNED' : 'ROOTED', p.x, p.y + 22);
        }
      } else {
        const w = e.k === 'tower' ? 70 : e.k === 'camp' ? 46 : 26;
        if (e.k === 'minion' && k >= 1) continue;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(p.x - w / 2 - 1, p.y - 1, w + 2, e.k === 'tower' ? 8 : 5);
        ctx.fillStyle = e.tm === 'neutral' ? '#e2c46a' : mine ? '#3d8bff' : '#ef4f4f';
        ctx.fillRect(p.x - w / 2, p.y, w * k, e.k === 'tower' ? 6 : 3);
        if (e.k === 'tower' && e.inv) {
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.font = '600 10px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🔒', p.x + w / 2 + 9, p.y + 7);
        }
      }
    }
    ctx.textAlign = 'center';
    ctx.font = '800 14px system-ui, sans-serif';
    for (const f of this.floaters) {
      const p = this.toScreen(f.x, 3.4 + f.t * 2.2, f.z);
      if (!p.front) continue;
      ctx.globalAlpha = 1 - f.t;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(f.text, p.x + 1, p.y + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  dispose() {
    this.renderer.dispose();
    this.scene.traverse((o) => o.geometry?.dispose?.());
    this.canvas.remove();
  }
}

export { TOWERS };
