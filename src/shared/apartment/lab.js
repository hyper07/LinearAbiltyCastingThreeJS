/**
 * The apartment lab (dev only, /apartment-lab.html): a generated corridor building built as a
 * cut-away night scene, with a level switcher, unit pins, a unit card (areas in m² / 평 / ft²,
 * facing, rooms, rendered interior shots) and floor / rooftop / street views.
 * Notes: knowledge/apartment-study.md.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { corridorBuilding, facingName, formatArea, unitAreas } from './plan.js';
import { createApartmentView } from './build.js';

const params = new URLSearchParams(location.search);
const plan = corridorBuilding({ levels: Number(params.get('levels')) || 5, seed: Number(params.get('seed')) || 7 });
const CUT = 1.2;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0d1424');
scene.fog = new THREE.Fog('#0d1424', 90, 220);
const view = createApartmentView(plan, { cut: CUT });
scene.add(view.group);

// A long lens from high up reads like an isometric model but keeps depth.
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.05, 600);
const centre = view.bounds.getCenter(new THREE.Vector3());
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 6;
controls.maxDistance = 180;
controls.maxPolarAngle = 1.45;

/* ---------------------------------------------------------------- views */

const VIEWS = {
  floor: (lv) => ({ target: new THREE.Vector3(centre.x, lv.elevation, centre.z), offset: new THREE.Vector3(-22, 46, 40) }),
  rooftop: () => ({ target: new THREE.Vector3(centre.x, view.bounds.max.y, centre.z), offset: new THREE.Vector3(-34, 40, 46) }),
  street: () => ({ target: new THREE.Vector3(centre.x, 6, centre.z), offset: new THREE.Vector3(-14, -4.5, 46) })
};

let fly = null;
function flyTo(target, position, seconds = 0.9) {
  fly = { t: 0, seconds, fromT: controls.target.clone(), toT: target, fromP: camera.position.clone(), toP: position };
}

const levelOf = (id) => plan.levels.find((l) => l.id === id);
let viewMode = 'floor';
function showView(mode, levelId = view.active) {
  viewMode = mode;
  // From the street the camera looks up at the façade, below the horizon the other views keep to.
  controls.maxPolarAngle = mode === 'street' ? Math.PI * 0.56 : 1.45;
  view.setLevel(levelId, mode);
  const v = VIEWS[mode](levelOf(view.active));
  flyTo(v.target, v.target.clone().add(v.offset));
  for (const b of document.querySelectorAll('#views button')) b.classList.toggle('on', b.dataset.view === mode);
  for (const b of document.querySelectorAll('#levels button')) b.classList.toggle('on', mode === 'floor' && b.dataset.level === view.active);
  buildPins();
}

for (const b of document.querySelectorAll('#views button')) b.onclick = () => showView(b.dataset.view);
const levelsBox = document.getElementById('levels');
for (const lv of [...plan.levels].reverse()) {
  const b = document.createElement('button');
  b.textContent = `L${lv.index + 1}`;
  b.dataset.level = lv.id;
  b.onclick = () => {
    closeCard();
    showView('floor', lv.id);
  };
  levelsBox.append(b);
}

/* ---------------------------------------------------------------- area units */

const AREA_UNITS = ['m2', 'pyeong', 'ft2'];
const AREA_LABEL = { m2: 'm²', pyeong: '평', ft2: 'ft²' };
let areaUnit = 'm2';
const unitsBtn = document.getElementById('units');
unitsBtn.onclick = () => {
  areaUnit = AREA_UNITS[(AREA_UNITS.indexOf(areaUnit) + 1) % AREA_UNITS.length];
  unitsBtn.textContent = AREA_LABEL[areaUnit];
  if (selected) fillFacts(selected);
};

/* ---------------------------------------------------------------- pins */

const pinsBox = document.getElementById('pins');
let pins = [];
function buildPins() {
  pinsBox.textContent = '';
  pins = [];
  if (viewMode !== 'floor') return;
  for (const u of plan.units.filter((q) => q.level === view.active)) {
    const el = document.createElement('div');
    el.className = 'pin';
    el.innerHTML = `<span>${u.number}</span>`;
    el.onclick = () => select(u.id);
    pinsBox.append(el);
    pins.push({ el, unit: u });
  }
}

const tmp = new THREE.Vector3();
function placePins() {
  for (const p of pins) {
    view.unitAnchor(p.unit.id, tmp).project(camera);
    const hidden = tmp.z > 1 || Math.abs(tmp.x) > 1.1 || Math.abs(tmp.y) > 1.1;
    p.el.style.display = hidden ? 'none' : '';
    p.el.style.transform = `translate(${((tmp.x + 1) / 2) * innerWidth}px, ${((1 - tmp.y) / 2) * innerHeight}px) translate(-50%, -100%)`;
    p.el.classList.toggle('on', selected?.id === p.unit.id);
  }
}

/* ---------------------------------------------------------------- the unit card */

const card = document.getElementById('card');
let selected = null;
let shots = [];

function fillFacts(u) {
  const a = unitAreas(plan, u.id);
  const beds = plan.rooms.filter((r) => r.unit === u.id && r.kind === 'bedroom').length;
  const rows = [
    ['Exclusive · 전용', formatArea(a.exclusive, areaUnit)],
    ['Supply · 공급', formatArea(a.supply, areaUnit)],
    ['Faces', `${facingName(u.facing)} · ${facingName(u.facing, 'ko')}`],
    ['Bedrooms', beds ? String(beds) : 'Studio'],
    ['Balcony · 서비스', a.service ? formatArea(a.service, areaUnit) : '—'],
    ['Level', levelOf(u.level).name]
  ];
  document.getElementById('facts').innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
}

function select(unitId) {
  const u = plan.units.find((q) => q.id === unitId);
  selected = u;
  view.highlight(u.id);
  document.getElementById('kicker').textContent = `Unit ${u.number} · Level ${levelOf(u.level).index + 1}`;
  document.getElementById('name').textContent = u.name.en;
  document.getElementById('nameKo').textContent = u.name.ko;
  fillFacts(u);
  card.classList.add('open');
  // Frame the unit: keep the view direction, come close enough to fill about half the screen.
  const { center, size } = view.unitBounds(u.id);
  const dir = camera.position.clone().sub(controls.target).normalize();
  const dist = (Math.max(size.x, size.z) * 1.9) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  flyTo(center.clone(), center.clone().add(dir.multiplyScalar(Math.min(dist, 70))));
  renderShots(u);
}

function closeCard() {
  selected = null;
  card.classList.remove('open');
  view.highlight(null);
  if (inside) leaveInside();
}
document.getElementById('close').onclick = closeCard;

/**
 * Interior shots for the card: render the same scene from eye height with the level's walls at full
 * height and its ceiling on, copy the frame out at once (no preserveDrawingBuffer needed in the same
 * task), then draw the normal view again so nothing flashes.
 */
function renderShots(u) {
  const shotCam = new THREE.PerspectiveCamera(64, innerWidth / innerHeight, 0.05, 200);
  const out = document.createElement('canvas');
  out.width = 600;
  out.height = 400;
  const g = out.getContext('2d');
  const src = renderer.domElement;
  // The largest 3:2 rectangle in the middle of the canvas.
  const sw = Math.min(src.width, (src.height * 3) / 2);
  const sh = (sw * 2) / 3;
  const sx = (src.width - sw) / 2;
  const sy = (src.height - sh) / 2;
  view.highlight(null);
  shots = view.withFullHeight(() =>
    view.interiorShots(u.id).map((s) => {
      shotCam.position.copy(s.position);
      shotCam.lookAt(s.target);
      renderer.render(scene, shotCam);
      g.drawImage(src, sx, sy, sw, sh, 0, 0, out.width, out.height);
      return { ...s, url: out.toDataURL('image/jpeg', 0.86) };
    })
  );
  view.highlight(u.id);
  renderer.render(scene, camera);
  const thumbs = document.getElementById('thumbs');
  thumbs.textContent = '';
  shots.forEach((s, i) => {
    const img = document.createElement('img');
    img.src = s.url;
    img.title = s.title;
    img.onclick = () => showShot(i);
    thumbs.append(img);
  });
  showShot(0);
}

function showShot(i) {
  if (!shots[i]) return;
  document.getElementById('hero').src = shots[i].url;
  document.querySelectorAll('#thumbs img').forEach((img, k) => img.classList.toggle('on', k === i));
}

/* ---------------------------------------------------------------- step inside */

let inside = null;
document.getElementById('inside').onclick = () => (inside ? leaveInside() : enterInside());

function enterInside() {
  if (!selected) return;
  const s = view.interiorShots(selected.id)[0];
  if (!s) return;
  inside = { target: controls.target.clone(), position: camera.position.clone(), min: controls.minDistance };
  view.setCut(Infinity);
  controls.minDistance = 0.1;
  camera.fov = 62;
  camera.updateProjectionMatrix();
  // Orbit about a point just ahead of the eye, so dragging looks around.
  const ahead = s.target.clone().sub(s.position).setLength(0.6).add(s.position);
  flyTo(ahead, s.position.clone(), 1.1);
  document.getElementById('inside').textContent = 'Back to the floor';
  pinsBox.style.display = 'none';
}

function leaveInside() {
  view.setCut(CUT);
  controls.minDistance = inside.min;
  camera.fov = 30;
  camera.updateProjectionMatrix();
  flyTo(inside.target, inside.position, 0.9);
  inside = null;
  document.getElementById('inside').textContent = 'Step inside';
  pinsBox.style.display = '';
}

addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (inside) leaveInside();
    else closeCard();
  }
});

/* ---------------------------------------------------------------- click a floor to pick its unit */

// A click is a press and release within 5 px; anything more is an orbit drag.
const ray = new THREE.Raycaster();
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || e.button !== 0 || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5 || viewMode !== 'floor' || inside) return;
  const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const floors = [];
  view.group.traverse((o) => o.userData?.unit && o.visible && o.parent.visible && o.parent.parent.visible && floors.push(o));
  const hit = ray.intersectObjects(floors, false).find((h) => plan.units.some((u) => u.id === h.object.userData.unit && u.level === view.active));
  if (hit) select(hit.object.userData.unit);
});

/* ---------------------------------------------------------------- loop */

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clock = new THREE.Clock();
showView('floor', plan.levels[Math.min(3, plan.levels.length - 1)].id);
{
  const v = VIEWS.floor(levelOf(view.active));
  controls.target.copy(v.target);
  camera.position.copy(v.target).add(v.offset);
  fly = null;
}
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (fly) {
    fly.t = Math.min(1, fly.t + dt / fly.seconds);
    const k = ease(fly.t);
    controls.target.lerpVectors(fly.fromT, fly.toT, k);
    camera.position.lerpVectors(fly.fromP, fly.toP, k);
    if (fly.t >= 1) fly = null;
  }
  view.update(dt);
  controls.update();
  renderer.render(scene, camera);
  placePins();
});
