/**
 * The sculpting worker: builds figure and gear meshes off the main thread
 * (build.js sends it a recipe and a resolution; it sends back the arrays).
 * The game never waits on it: a figure keeps its coarse mesh, or the gear it
 * wore, until the new one arrives.
 */
import { compile, sculptArrays } from './sdf.js';

self.onmessage = (e) => {
  const { id, recipe, res } = e.data;
  try {
    const t0 = performance.now();
    const a = sculptArrays(compile(recipe), { res });
    const ms = performance.now() - t0;
    const transfer = Object.values(a).map((v) => v.buffer);
    self.postMessage({ id, a, ms }, transfer);
  } catch (err) {
    self.postMessage({ id, error: String(err?.message ?? err) });
  }
};
