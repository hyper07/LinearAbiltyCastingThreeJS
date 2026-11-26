/**
 * The motion lab's "Podium crew" view (motion-lab.html?view=crew, dev only): Kickrani's seven
 * plush riders side by side, each dancing its signature (signatures.js) on one beat clock —
 * the podium's — with a place's flourish on top if you pick one.
 *
 * URL: ?view=crew&t=3.1&pause=1&place=1 — for screenshots; window.__crewLab.setTime(t) freezes at t s.
 */
import * as THREE from 'three';
import { PlushRider } from '../../city/plushRider.js';
import { CREW, CREW_ORDER, rider } from '../../city/crew.js';
import { SIGNATURES } from './signatures.js';

const BPM = 143.6;
const q = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const status = (html) => ($('now').innerHTML = html);
const state = { t: Number(q.get('t') ?? 0), paused: q.get('pause') === '1', place: Number(q.get('place') ?? 0) };

// the performers' bar: the clip picker and the combo button are the other view's
$('clip').closest('label').hidden = true;
$('combo').hidden = true;
$('bpm').value = BPM;
$('bpm').disabled = true;
$('crewView').href = '?';
$('crewView').textContent = 'Performers view';
const placeSel = document.createElement('select');
for (const [v, name] of [[0, 'signature only'], [1, '1st (slow V, a hop)'], [2, '2nd (one paw)'], [3, '3rd (small V)'], [4, 'off the podium (side-clap)']]) placeSel.append(new Option(name, v));
placeSel.value = String(state.place);
const placeLabel = document.createElement('label');
placeLabel.append('Place ', placeSel);
$('pause').before(placeLabel);

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
scene.fog = new THREE.Fog('#262a40', 14, 30);
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 100);
const SP = 1.25;
const XS = CREW_ORDER.map((_, i) => (i - (CREW_ORDER.length - 1) / 2) * SP);
const fit = () => {
  camera.aspect = innerWidth / innerHeight;
  const dist = Math.max(10, 10 * (2.1 / camera.aspect));
  camera.position.set(0, 1.9, dist);
  camera.lookAt(0, 0.62, 0);
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
const stage = new THREE.Mesh(new THREE.CircleGeometry(8, 64), new THREE.MeshStandardMaterial({ color: '#3b3656', roughness: 0.85 }));
stage.rotation.x = -Math.PI / 2;
stage.receiveShadow = true;
scene.add(stage);

const labels = [];
const crew = CREW_ORDER.map((id, i) => {
  const info = rider(id);
  const r = new PlushRider(id, { fur: 8, body: CREW[id].scooter, trim: CREW[id].trim });
  r.root.position.x = XS[i];
  r.standOff([0.45, 0, 0.6, 0.9]); // parked behind (the root is turned to the camera), out of the dance
  r.root.traverse((m) => m.isMesh && ((m.castShadow = true), (m.receiveShadow = true), (m.frustumCulled = false)));
  scene.add(r.root);
  const el = document.createElement('div');
  el.className = 'label';
  el.innerHTML = `<b>${info.name}</b>${CREW[id].nick}<br><span class="move"></span>`;
  document.body.append(el);
  labels.push({ el, at: new THREE.Vector3(XS[i], -0.05, 0.6), move: el.querySelector('.move') });
  return { id, r };
});
const v = new THREE.Vector3();
function placeLabels() {
  for (const { el, at } of labels) {
    v.copy(at).project(camera);
    el.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`;
    el.style.top = `${(-v.y * 0.5 + 0.5) * innerHeight + 8}px`;
  }
}

const dots = Array.from({ length: 8 }, (_, i) => {
  const s = document.createElement('span');
  s.textContent = String(i + 1);
  $('count').append(s);
  return s;
});
$('pause').onclick = () => {
  state.paused = !state.paused;
  $('pause').textContent = state.paused ? 'Play' : 'Pause';
};
$('pause').textContent = state.paused ? 'Play' : 'Pause';
placeSel.onchange = () => (state.place = Number(placeSel.value));
let audio = null;
$('music').onclick = async () => {
  if (audio) return audio.paused ? audio.play() : audio.pause();
  audio = new Audio('/audio/bgm/kick-podium.ogg');
  audio.loop = true;
  await audio.play();
};
status(CREW_ORDER.map((id) => `<b>${rider(id).name}</b>: ${SIGNATURES[id].dance}`).join('<br>'));

function frame(dt) {
  if (!state.paused) state.t += dt;
  const t = audio && !audio.paused ? audio.currentTime : state.t;
  const beats = (t * BPM) / 60;
  dots.forEach((d, i) => d.classList.toggle('on', i === Math.floor(beats) % 8));
  crew.forEach(({ r }, i) => {
    r.celebrate(Math.max(dt, 1e-4), { place: state.place, start: 0, bpm: BPM, heading: Math.PI, beats });
    r.root.position.x = XS[i];
    const step = r._dance.at(beats).step;
    labels[i].move.textContent = `${step.move}${step.mirror ? ' (mirrored)' : ''}`;
  });
  renderer.render(scene, camera);
  placeLabels();
}

let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  frame(dt);
});

window.__crewLab = {
  crew,
  ready: true,
  /** Freeze at `t` seconds (screenshots): a second of small steps first, so the springs settle. */
  setTime(t, place = state.place) {
    state.place = place;
    placeSel.value = String(place);
    state.paused = false;
    state.t = t - 1;
    for (let i = 0; i < 60; i++) frame(1 / 60);
    state.paused = true;
    state.t = t;
    frame(1 / 60);
  }
};
if (q.has('t')) window.__crewLab.setTime(state.t);
