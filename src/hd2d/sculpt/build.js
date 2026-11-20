/**
 * Building sculpted figures once and sharing them: a compiled model (the
 * distance field, for faces) and a geometry per detail for each shape key —
 * a hero's cut and clothes, a villager, a monster kind. Every figure with the
 * same key shares the mesh; colours are per figure (material.js).
 *
 * Two details, as the voxel figures had: 'near' (fine, close to the camera)
 * and 'far' (about a third of the triangles). A far mesh is built at once
 * when first needed (a few tens of ms); near meshes are built in the
 * background, a few at a time (prewarm), and a figure that comes close before
 * its near mesh is ready keeps its far one until it is.
 */
import { compile, sculpt } from './sdf.js';

/** Draw people and monsters as sculpted vinyl toys (false: the voxel figures, as before). */
export const SCULPTED_FIGURES = true;

/** Grid cells along a figure's longest side, per detail. */
export const RES = { near: 60, far: 30 };
const models = new Map();
const geos = new Map();
export const stats = { builds: 0, ms: 0, tris: 0 };

/** The compiled model for a key (`make` returns the recipe). */
export function modelFor(key, make) {
  let m = models.get(key);
  if (!m) {
    m = compile(make());
    models.set(key, m);
  }
  return m;
}

/** The skinned geometry for a key and detail; built now if missing. */
export function geometryFor(key, make, lod = 'near') {
  const k = `${key}#${lod}`;
  let g = geos.get(k);
  if (!g) {
    const model = modelFor(key, make);
    const t0 = performance.now();
    g = sculpt(model, { res: (model.recipe.res ?? 1) * (RES[lod] ?? RES.near) });
    stats.builds++;
    stats.ms += performance.now() - t0;
    stats.tris += g.index.count / 3;
    geos.set(k, g);
  }
  return g;
}

/** The geometry if it is built already (null if not). */
export const geometryReady = (key, lod) => geos.get(`${key}#${lod}`) ?? null;

/* ---------------------------------------------------------------- background builds */

const queue = [];
const queued = new Set();
let timer = null;
/** Ask for a geometry to be built in the background (one every ~30 ms, nothing if it exists). */
export function requestGeometry(key, make, lod = 'near') {
  const k = `${key}#${lod}`;
  if (geos.has(k) || queued.has(k)) return;
  queued.add(k);
  queue.push(() => {
    queued.delete(k);
    geometryFor(key, make, lod);
  });
  if (!timer) pump();
}
function pump() {
  timer = setTimeout(() => {
    timer = null;
    const job = queue.shift();
    if (job) job();
    if (queue.length) pump();
  }, 30);
}

/** Free every sculpted geometry (when the game closes). */
export function disposeSculpted() {
  for (const g of geos.values()) g.dispose();
  geos.clear();
  models.clear();
  queue.length = 0;
  queued.clear();
}
