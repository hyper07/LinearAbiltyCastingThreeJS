/**
 * The motion lab (motion-lab.html, dev only): the motion study's proof, five
 * performers on one stage, all on the same beat clock.
 *
 *   1. the source: Mesh2Motion's human playing a CC0 dance clip as made
 *      (or, for the CMU pirouette, the BVH skeleton);
 *   2. a big-head humanoid (100Avatars' Teddy, a VRM) — retargetClip() from
 *      src/library/characters.js, joint for joint;
 *   3. a Kickrani plush rider (bunny) — aimRetarget(): one-bone limbs aimed along
 *      the human's arm and leg chains, baked and compressed;
 *   4. a plush fox dancing an original combo, procedural, on the beat (dance.js),
 *      ears and tail on springs;
 *   5. a plush bear riding its scooter, waving: an upper-body layer (mask) over the ride.
 *
 * URL: ?clip=dance-body-roll&t=2.4&seed=3&pause=1 — for screenshots;
 * window.__motionLab.setTime(t) freezes the clock at t seconds.
 */
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { BVHLoader } from 'three/addons/loaders/BVHLoader.js';
import { characterLoader, retargetClip, BONE_MAPS } from '../../library/characters.js';
import { PlushRider } from '../../../games/g_cv2yrhrpv2/plushRider.js';
import { beatClock, routine, makeCombo, movePose, applyPlushPose, secondary, detectOnsets, fitBeatOffset, spring } from './dance.js';
import { aimRetarget, compressClip, PLUSH_FROM_UNREAL, PLUSH_FROM_CMU_DAZ, PLUSH_TIPS } from './retarget.js';

const LIB = '/library/';
const M2M = 'rigged/mesh2motion/human/';
const CLIPS = ['dance-body-roll', 'dance-charleston', 'dance-arm-pump', 'dance-reach-hip', 'dance-simple', 'moonwalk', 'dab', 'victory', 'clapping', 'greeting', 'jumping-jacks', 'cmu:pirouette'];
/** Teddy (Mixamo names) ← the CMU BVH's Daz names. */
const MIXAMO_FROM_DAZ = {
  'mixamorig:Hips': 'hip', 'mixamorig:Spine': 'abdomen', 'mixamorig:Spine2': 'chest', 'mixamorig:Neck': 'neck', 'mixamorig:Head': 'head',
  ...Object.fromEntries(['Left', 'Right'].flatMap((s) => {
    const d = s[0].toLowerCase();
    return [[`mixamorig:${s}Shoulder`, `${d}Collar`], [`mixamorig:${s}Arm`, `${d}Shldr`], [`mixamorig:${s}ForeArm`, `${d}ForeArm`], [`mixamorig:${s}Hand`, `${d}Hand`], [`mixamorig:${s}UpLeg`, `${d}Thigh`], [`mixamorig:${s}Leg`, `${d}Shin`], [`mixamorig:${s}Foot`, `${d}Foot`]];
  }))
};

/** The Mesh2Motion human (Unreal-mannequin names) ← the same Daz names. */
const M2M_FROM_DAZ = {
  pelvis: 'hip', spine_01: 'abdomen', spine_03: 'chest', neck_01: 'neck', head: 'head',
  ...Object.fromEntries(['l', 'r'].flatMap((d) => [[`clavicle_${d}`, `${d}Collar`], [`upperarm_${d}`, `${d}Shldr`], [`lowerarm_${d}`, `${d}ForeArm`], [`hand_${d}`, `${d}Hand`], [`thigh_${d}`, `${d}Thigh`], [`calf_${d}`, `${d}Shin`], [`foot_${d}`, `${d}Foot`]]))
};

const q = new URLSearchParams(location.search);
const SLOTS = [-3.4, -1.7, 0, 1.7, 3.4];
const $ = (id) => document.getElementById(id);
const status = (html) => ($('now').innerHTML = html);

/* ---------------------------------------------------------------- scene */

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#262a40');
scene.fog = new THREE.Fog('#262a40', 12, 26);
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 100);
const fit = () => {
  const aspect = innerWidth / innerHeight;
  camera.aspect = aspect;
  // keep the five performers in frame on narrow screens
  const dist = Math.max(9.5, 9.5 * (1.7 / aspect));
  const focus = q.has('focus') ? SLOTS[Number(q.get('focus'))] : null;
  if (focus != null) {
    // close on one performer (and its neighbour): ?focus=2
    camera.position.set(focus + 0.85, 1.15, 4.2);
    camera.lookAt(focus + 0.85, 0.62, 0);
  } else {
    camera.position.set(0, 2.2, dist);
    camera.lookAt(0, 0.75, 0);
  }
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
};
fit();
addEventListener('resize', fit);

scene.add(new THREE.HemisphereLight('#dfe6ff', '#4a3550', 1.35));
const sun = new THREE.DirectionalLight('#fff1dc', 2.4);
sun.position.set(3, 7, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 4, bottom: -2, near: 1, far: 20 });
sun.shadow.bias = -0.0005;
scene.add(sun);
const rim = new THREE.DirectionalLight('#9fb6ff', 1.1);
rim.position.set(-4, 3, -5);
scene.add(rim);
const stage = new THREE.Mesh(new THREE.CircleGeometry(7, 64), new THREE.MeshStandardMaterial({ color: '#3b3656', roughness: 0.85 }));
stage.rotation.x = -Math.PI / 2;
stage.receiveShadow = true;
scene.add(stage);
// spotlight pools on the stage, one per performer
const pool = new THREE.MeshBasicMaterial({ color: '#ffd9a0', transparent: true, opacity: 0.08, depthWrite: false });
for (const x of SLOTS) {
  const d = new THREE.Mesh(new THREE.CircleGeometry(0.72, 48), pool);
  d.rotation.x = -Math.PI / 2;
  d.position.set(x, 0.004, 0);
  scene.add(d);
}

const shadows = (o) => o.traverse((m) => m.isMesh && ((m.castShadow = true), (m.receiveShadow = true), (m.frustumCulled = false)));
const heightOf = (o) => new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()).y;

/* ---------------------------------------------------------------- labels */

const labels = [];
function label(anchor, title, sub) {
  const el = document.createElement('div');
  el.className = 'label';
  el.innerHTML = `<b>${title}</b>${sub}`;
  document.body.append(el);
  labels.push({ el, anchor });
  return el;
}
const v = new THREE.Vector3();
function placeLabels() {
  for (const { el, anchor } of labels) {
    v.copy(anchor).project(camera);
    el.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`;
    el.style.top = `${(-v.y * 0.5 + 0.5) * innerHeight + 8}px`;
  }
}

/* ---------------------------------------------------------------- performers */

const loader = characterLoader();
const load = (file) => loader.loadAsync(LIB + file);

const state = { t: Number(q.get('t') ?? 0), paused: q.get('pause') === '1', bpm: 143.6, offset: 0, seed: Number(q.get('seed') ?? 7), clip: q.get('clip') ?? 'dance-body-roll' };
let clock = beatClock(state.bpm, { offset: state.offset });
let show = routine(makeCombo(state.seed, { bars: 8 }));

const human = await load(`${M2M}variations/base.glb`);
const restHuman = SkeletonUtils.clone(human.scene); // stays in rest pose: the retargeting source
restHuman.updateMatrixWorld(true);
const humanHolder = new THREE.Group();
humanHolder.add(human.scene);
humanHolder.position.x = SLOTS[0];
humanHolder.scale.setScalar(1.45 / heightOf(human.scene));
shadows(human.scene);
scene.add(humanHolder);
const humanMixer = new THREE.AnimationMixer(human.scene);

const teddy = await load('rigged/vrm/011_Teddy.vrm');
const teddyHolder = new THREE.Group(); // VRM 0.x faces −z: bake and show it turned round
teddyHolder.rotation.y = Math.PI;
teddyHolder.add(teddy.scene);
teddy.scene.updateMatrixWorld(true);
const teddyBox = heightOf(teddy.scene);
const teddyShow = new THREE.Group();
teddyShow.add(teddyHolder);
teddyShow.position.x = SLOTS[1];
teddyShow.scale.setScalar(1.3 / teddyBox);
shadows(teddy.scene);
scene.add(teddyShow);
const teddyMixer = new THREE.AnimationMixer(teddy.scene);

function plush(species, x, o = {}) {
  const r = new PlushRider(species, { fur: 8, ...o });
  r.root.position.x = x;
  r.root.rotation.y = Math.PI; // the sculpt faces +z, the body turns it to −z (travel): face the camera
  scene.add(r.root);
  return r;
}
function standOnStage(r) {
  r.standOff([0.78, 0, -0.42, 0.95]); // parked beside and behind, out of the dance
  r.scooter.update(0, { roll: 0, steer: 0, braking: false, night: 0, speed: 0, battery: 1, boost: false });
  r.rider.position.set(0, 0.005, 0);
  r.rider.rotation.set(0, 0, 0);
  r.lean.rotation.set(0, 0, 0);
  r.jolt.position.set(0, 0, 0);
  r.jolt.rotation.set(0, 0, 0);
  r.body.rotation.y = Math.PI;
  r.blob.visible = true;
}
const bunny = plush('bunny', SLOTS[2]);
standOnStage(bunny);
const bunnyMixer = new THREE.AnimationMixer(bunny.rider); // rooted at the rider: the scooter has its own "head"
const fox = plush('fox', SLOTS[3]);
standOnStage(fox);
const foxRig = { bones: fox.bones, squash: fox.squash, tilt: fox.tilt, turn: fox.body, turnRest: Math.PI };
const bear = plush('bear', SLOTS[4]);
for (const r of [bunny, fox, bear]) shadows(r.root);

const top = new THREE.Vector3();
const anchor = (x) => new THREE.Vector3(x, -0.02, 0.9);
const clipLabel = label(anchor(SLOTS[0]), 'Source', 'Mesh2Motion human, CC0');
label(anchor(SLOTS[1]), 'Big-head humanoid', 'Teddy (VRM) · retargetClip');
label(anchor(SLOTS[2]), 'Plush rider', 'one-bone limbs · aimRetarget');
const foxLabel = label(anchor(SLOTS[3]), 'Procedural combo', 'dance.js on the beat');
label(anchor(SLOTS[4]), 'Upper-body layer', 'riding + a wave (mask)');
void top;

/* ---------------------------------------------------------------- clips */

let active = null; // { duration, info }
async function loadClip(name) {
  status(`Loading <b>${name}</b>…`);
  const t0 = performance.now();
  let source, clip, teddyClip, humanClip, plushMap = PLUSH_FROM_UNREAL;
  const bvh = name.startsWith('cmu:');
  if (bvh) {
    const res = await new BVHLoader().loadAsync(`${LIB}extras/motion/${name.slice(4)}.bvh`);
    clip = res.clip;
    const rootBone = res.skeleton.bones[0];
    // BVH gotcha: the rest skeleton has its root at the origin, the frames carry the absolute hip
    // position (85 cm up here). Rest the root where the first frame has it, or every retarget
    // reads the hip height as motion and the body floats.
    const hipTrack = clip.tracks.find((t) => t.name === `${rootBone.name}.position`);
    if (hipTrack) rootBone.position.fromArray(hipTrack.values, 0);
    source = new THREE.Group();
    source.add(rootBone);
    // retargetClip measures leg length from meshes: a bone-only skeleton gets two foot markers
    for (const f of ['lFoot', 'rFoot']) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), new THREE.MeshBasicMaterial({ visible: false }));
      source.getObjectByName(f)?.add(m);
    }
    source.updateMatrixWorld(true);
    plushMap = PLUSH_FROM_CMU_DAZ;
    teddyClip = retargetClip(teddy.scene, source, clip, MIXAMO_FROM_DAZ, { fps: 30 });
    // the source slot: the CMU dancer on the Mesh2Motion human (CMU → Unreal-mannequin names)
    humanClip = retargetClip(restHuman, source, clip, M2M_FROM_DAZ, { fps: 30 });
  } else {
    const gltf = await load(`${M2M}animations/${name}.glb`);
    clip = humanClip = gltf.animations[0];
    source = restHuman;
    teddyClip = retargetClip(teddy.scene, source, clip, BONE_MAPS.mixamo, { fps: 30 });
  }
  const t1 = performance.now();
  const forward = bunny.body.getWorldDirection(new THREE.Vector3());
  const raw = aimRetarget(bunny.rider, source, clip, plushMap, { tips: PLUSH_TIPS, targetForward: forward, fps: 30 });
  const { clip: plushClip, before, after } = compressClip(raw);
  const t2 = performance.now();
  humanMixer.stopAllAction();
  humanMixer.uncacheRoot(human.scene);
  humanMixer.clipAction(humanClip).play();
  teddyMixer.stopAllAction();
  teddyMixer.uncacheRoot(teddy.scene);
  teddyMixer.clipAction(teddyClip).play();
  bunnyMixer.stopAllAction();
  bunnyMixer.uncacheRoot(bunny.rider);
  bunnyMixer.clipAction(plushClip).play();
  active = { name, duration: clip.duration, before, after, ms: [t1 - t0, t2 - t1] };
  clipLabel.innerHTML = bvh ? '<b>Source</b>CMU mocap (BVH) on the M2M human' : '<b>Source</b>Mesh2Motion human, CC0';
  window.__motionLab.info = active;
  report();
}

function report() {
  if (!active) return;
  const steps = show.steps.map((s) => `${s.move}${s.mirror ? '′' : ''}`).join(' · ');
  status(
    `<b>${active.name}</b> ${active.duration.toFixed(2)} s · plush clip ${active.before} → ${active.after} keys after reduction · ` +
      `load+Teddy ${active.ms[0].toFixed(0)} ms, plush bake ${active.ms[1].toFixed(0)} ms<br>` +
      `Fox combo (seed ${state.seed}, ${show.counts} counts at ${state.bpm} BPM): ${steps}`
  );
}

/* ---------------------------------------------------------------- UI */

for (const c of CLIPS) $('clip').append(new Option(c.replace('cmu:', 'CMU · '), c));
$('clip').value = state.clip;
$('clip').onchange = () => loadClip($('clip').value);
$('bpm').value = state.bpm;
$('bpm').onchange = () => {
  state.bpm = Number($('bpm').value) || 120;
  clock = beatClock(state.bpm, { offset: state.offset });
  report();
};
$('combo').onclick = () => {
  state.seed = Math.floor(Math.random() * 1e6);
  show = routine(makeCombo(state.seed, { bars: 8 }));
  report();
};
$('pause').onclick = () => {
  state.paused = !state.paused;
  $('pause').textContent = state.paused ? 'Play' : 'Pause';
};
const dots = Array.from({ length: 8 }, (_, i) => {
  const s = document.createElement('span');
  s.textContent = String(i + 1);
  $('count').append(s);
  return s;
});

// Music: the podium track (BPM measured 143.6 by librosa; the asked 140 drifts a beat in ~17 s).
// Its downbeat is found from the first seconds' low-band onsets (fitBeatOffset).
let audio = null, analyser = null, energy = [], hop = 0;
$('music').onclick = async () => {
  if (audio) {
    audio.paused ? audio.play() : audio.pause();
    return;
  }
  audio = new Audio('/audio/bgm/kick-podium.ogg');
  audio.loop = true;
  const ctx = new AudioContext();
  const src = ctx.createMediaElementSource(audio);
  analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  src.connect(analyser).connect(ctx.destination);
  await audio.play();
  state.bpm = 143.6;
  $('bpm').value = state.bpm;
};
const bins = new Uint8Array(512);
function listen(dt) {
  if (!analyser || audio.paused || energy === null) return;
  analyser.getByteFrequencyData(bins);
  let e = 0;
  for (let i = 1; i < 12; i++) e += bins[i]; // ≈ 40–500 Hz: kick and bass
  energy.push(e / 11 / 255);
  hop = hop ? hop * 0.95 + dt * 0.05 : dt;
  if (audio.currentTime > 8) {
    const onsets = detectOnsets(energy, hop).map((t) => t + (audio.currentTime - energy.length * hop));
    state.offset = fitBeatOffset(onsets, state.bpm);
    clock = beatClock(state.bpm, { offset: state.offset });
    energy = null; // locked
    status(`${$('now').innerHTML}<br>Locked to the music: ${onsets.length} onsets, downbeat offset ${state.offset.toFixed(3)} s`);
  }
}

/* ---------------------------------------------------------------- loop */

const sec = {};
const wave = { x: 0, v: 0 };
function frame(dt) {
  if (!state.paused) state.t += dt;
  const t = audio && !audio.paused ? audio.currentTime : state.t;
  const c = clock(t);
  dots.forEach((d, i) => d.classList.toggle('on', i === c.count));

  // 1–3: clips on the shared clock (looped)
  if (active) {
    const ct = t % active.duration;
    humanMixer.setTime(ct);
    teddyMixer.setTime(ct);
    bunnyMixer.setTime(ct);
  }

  // 4: the procedural combo, ears and tail on springs
  const pose = show.sample(c);
  applyPlushPose(foxRig, pose);
  const s2 = secondary(sec, pose, dt || 1 / 60);
  fox.bones.get('earL')?.rotation.set(s2.ear[0], 0, -0.08 - s2.ear[1]);
  fox.bones.get('earR')?.rotation.set(s2.ear[0] * 0.92, 0, 0.08 + s2.ear[1]);
  fox.bones.get('tail')?.rotation.set(s2.tail[0], s2.tail[1], 0);
  fox.bones.get('tail2')?.rotation.set(s2.tail[0] * 0.7, s2.tail[1] * 1.3, 0);
  const step = show.at(c.beat).step;
  foxLabel.innerHTML = `<b>Procedural combo</b>${step.move}${step.mirror ? ' (mirrored)' : ''} · count ${c.count + 1}`;

  // 5: riding, with a wave layered on the upper body for 2.5 s in every 5
  bear.pose(Math.max(dt, 1e-4), { heading: Math.PI, speed: 5, mode: 'ride', roll: t * 12, battery: 1 });
  const w = spring(wave, t % 5 < 2.5 ? 1 : 0, 60, 14, Math.max(dt, 1e-4));
  applyPlushPose({ bones: bear.bones }, movePose('hello', c), { mask: ['armR', 'head'], weight: Math.min(1, Math.max(0, w)) });

  renderer.render(scene, camera);
  placeLabels();
}

let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  listen(dt);
  frame(dt);
});

window.__motionLab = {
  performers: { bunny, fox, bear },
  ready: false,
  info: null,
  /** Freeze at `t` seconds (screenshots): settles the springs with a second of small steps first. */
  setTime(t) {
    state.paused = false;
    state.t = t - 1;
    for (let i = 0; i < 60; i++) frame(1 / 60);
    state.paused = true;
    state.t = t;
    frame(0);
  }
};
await loadClip(state.clip);
window.__motionLab.ready = true;
if (q.has('t')) window.__motionLab.setTime(state.t);
