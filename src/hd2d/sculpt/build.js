/**
 * Building sculpted figures once and sharing them: a compiled model (the
 * distance field, for faces) and a geometry per detail for each shape key —
 * a hero's cut and clothes, a villager, a monster kind. Every figure with the
 * same key shares the mesh; colours are per figure (material.js).
 *
 * Two details: 'near' (fine, only close to the camera) and 'far' (about a
 * fifth of the triangles; also the outline and the shadow of a near figure,
 * which do not need the fine one).
 *
 * Meshes are built in a worker (worker.js), one job at a time, so sculpting
 * never stalls a frame: a figure asks for what it needs (requestGeometry),
 * shows what is ready meanwhile, and swaps when the new mesh arrives. Jobs a
 * figure on screen is waiting for go to the front of the queue; pre-warming
 * (a realm's people and monsters, the hero's gear) waits behind them. Without
 * a worker (tests, an old browser) jobs run on the main thread, one every
 * ~30 ms. `geometryFor` still builds at once, for the few places that cannot
 * wait (the hero's own figure on the title screen).
 */
import { compile, sculpt, sculptArrays, toGeometry } from './sdf.js';

/** Draw people and monsters as sculpted vinyl toys (false: the voxel figures, as before). */
export const SCULPTED_FIGURES = true;

/** Grid cells along a figure's longest side, per detail. */
export const RES = { near: 72, far: 30 };
const models = new Map();
const geos = new Map();
export const stats = { builds: 0, ms: 0, tris: 0, worker: 0 };

/** The compiled model for a key (`make` returns the recipe). */
export function modelFor(key, make) {
  let m = models.get(key);
  if (!m) {
    m = compile(make());
    models.set(key, m);
  }
  return m;
}

const resFor = (recipe, lod) => Math.round((recipe.res ?? 1) * (RES[lod] ?? RES.near));
const note = (g, ms, worker = false) => {
  stats.builds++;
  stats.ms += ms;
  stats.tris += g.index.count / 3;
  if (worker) stats.worker++;
};

/** The skinned geometry for a key and detail; built now (on this thread) if missing. */
export function geometryFor(key, make, lod = 'near') {
  const k = `${key}#${lod}`;
  let g = geos.get(k);
  if (!g) {
    const model = modelFor(key, make);
    const t0 = performance.now();
    g = sculpt(model, { res: resFor(model.recipe, lod) });
    note(g, performance.now() - t0);
    geos.set(k, g);
    cancel(k);
  }
  return g;
}

/** The geometry if it is built already (null if not). */
export const geometryReady = (key, lod) => geos.get(`${key}#${lod}`) ?? null;

/**
 * Ask for a geometry to be built in the background (nothing if it exists or
 * is on its way). `urgent`: a figure on screen is waiting for it.
 */
export function requestGeometry(key, make, lod = 'near', { urgent = false } = {}) {
  const k = `${key}#${lod}`;
  if (geos.has(k)) return;
  enqueue(k, () => {
    const model = modelFor(key, make);
    return { recipe: model.recipe, res: resFor(model.recipe, lod) };
  }, (g) => (geos.has(k) ? g.dispose() : geos.set(k, g)), { urgent });
}

/* ---------------------------------------------------------------- the job queue */

const queue = [];
const queued = new Map();
let busy = null;
let worker;
let nextId = 1;
let timer = null;

function getWorker() {
  if (worker !== undefined) return worker;
  worker = null;
  if (typeof Worker === 'undefined' || typeof window === 'undefined') return worker;
  try {
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => finish(e.data);
    worker.onerror = () => {
      // The worker could not start: build on the main thread from now on.
      worker?.terminate();
      worker = null;
      if (busy) {
        queue.unshift(busy);
        busy = null;
      }
      pump();
    };
  } catch {
    worker = null;
  }
  return worker;
}

/**
 * Queue a build: `spec()` gives { recipe, res, rigid } when the job starts;
 * `done(geometry)` gets the result. One job per key `k` at a time.
 */
export function enqueue(k, spec, done, { urgent = false, rigid = false } = {}) {
  const old = queued.get(k);
  if (old) {
    if (urgent && !old.urgent && queue.includes(old)) {
      old.urgent = true;
      queue.splice(queue.indexOf(old), 1);
      queue.unshift(old);
    }
    return;
  }
  const job = { k, spec, done, urgent, rigid };
  queued.set(k, job);
  if (urgent) {
    // Behind the other urgent jobs, ahead of the pre-warming.
    const i = queue.findIndex((j) => !j.urgent);
    queue.splice(i < 0 ? queue.length : i, 0, job);
  } else queue.push(job);
  pump();
}

/** Drop a queued job (its result was built some other way). */
function cancel(k) {
  const job = queued.get(k);
  if (!job || job === busy) return;
  queued.delete(k);
  const i = queue.indexOf(job);
  if (i >= 0) queue.splice(i, 1);
}

function pump() {
  if (busy || !queue.length) return;
  const w = getWorker();
  if (w) {
    const job = queue.shift();
    busy = job;
    let s;
    try {
      s = job.spec();
      job.id = nextId++;
      w.postMessage({ id: job.id, recipe: s.recipe, res: s.res });
    } catch {
      // A recipe the worker cannot take (it should not happen): build it here.
      busy = null;
      runHere(job);
      pump();
    }
    return;
  }
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    const job = queue.shift();
    if (job) runHere(job);
    pump();
  }, 30);
}

function runHere(job) {
  queued.delete(job.k);
  const s = job.spec();
  const t0 = performance.now();
  const g = toGeometry(sculptArrays(compile(s.recipe), { res: s.res }), { rigid: job.rigid });
  note(g, performance.now() - t0);
  job.done(g);
}

function finish(msg) {
  const job = busy;
  busy = null;
  if (job && msg.id === job.id) {
    queued.delete(job.k);
    if (msg.error) runHere(job);
    else {
      const g = toGeometry(msg.a, { rigid: job.rigid });
      note(g, msg.ms, true);
      job.done(g);
    }
  }
  pump();
}

/** True while background builds are waiting or running. */
export const building = () => Boolean(busy || queue.length);

/** Free every sculpted geometry (when the game closes). */
export function disposeSculpted() {
  for (const g of geos.values()) g.dispose();
  geos.clear();
  models.clear();
  queue.length = 0;
  queued.clear();
}
