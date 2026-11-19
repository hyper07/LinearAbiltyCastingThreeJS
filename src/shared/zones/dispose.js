/**
 * Letting go of a zone completely: every geometry, material, texture (in a
 * material's slots or its uniforms), skeleton, light shadow and render target
 * under a scene, and the scene's own environment and background. A module's
 * own dispose() may miss something; this walk doesn't.
 *
 * Disposing frees the GPU's copy; three.js uploads a texture again if a later
 * zone uses the same object (a shared, cached one), so shared things are safe
 * to pass through here. Things that live on (the hero, their gear) are taken
 * out of the scene first, or listed in `keep`.
 */

const isTexture = (v) => v && v.isTexture;

function texturesOf(material, out) {
  for (const v of Object.values(material)) {
    if (isTexture(v)) out.add(v);
    else if (Array.isArray(v)) for (const x of v) if (isTexture(x)) out.add(x);
  }
  const uniforms = material.uniforms ?? material.userData?.uniforms;
  for (const u of Object.values(uniforms ?? {})) {
    const v = u?.value;
    if (isTexture(v)) out.add(v);
    else if (Array.isArray(v)) for (const x of v) if (isTexture(x)) out.add(x);
  }
  for (const u of Object.values(material.userData ?? {})) {
    if (u && typeof u === 'object') for (const w of Object.values(u)) if (isTexture(w?.value)) out.add(w.value);
  }
}

/**
 * Dispose everything under `root` (an Object3D or Scene). `keep` is a Set of
 * objects whose subtrees are left alone. Returns counts, for logs and tests.
 */
export function disposeTree(root, { keep = new Set(), detach = true } = {}) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const skeletons = new Set();
  const lights = [];
  const others = [];
  const walk = (o) => {
    if (keep.has(o)) return;
    if (o.geometry) geometries.add(o.geometry);
    const m = o.material;
    if (Array.isArray(m)) m.forEach((x) => x && materials.add(x));
    else if (m) materials.add(m);
    if (o.customDepthMaterial) materials.add(o.customDepthMaterial);
    if (o.customDistanceMaterial) materials.add(o.customDistanceMaterial);
    if (o.skeleton) skeletons.add(o.skeleton);
    if (o.isLight) lights.push(o);
    if (o.isInstancedMesh || o.isBatchedMesh) others.push(o);
    for (const c of [...o.children]) walk(c);
  };
  walk(root);
  if (root.isScene) {
    if (isTexture(root.environment)) textures.add(root.environment);
    if (isTexture(root.background)) textures.add(root.background);
  }
  for (const m of materials) texturesOf(m, textures);
  for (const g of geometries) g.dispose();
  for (const m of materials) m.dispose();
  for (const t of textures) t.dispose();
  for (const s of skeletons) s.dispose?.();
  for (const l of lights) l.dispose?.();
  for (const o of others) o.dispose?.();
  if (detach) {
    for (const c of [...root.children]) if (!keep.has(c)) root.remove(c);
    if (root.isScene) {
      root.environment = null;
      root.background = null;
    }
  }
  return { geometries: geometries.size, materials: materials.size, textures: textures.size };
}

/**
 * Compile a new zone's shaders and wait (a little) for the GPU to finish them:
 * no stutter at the first look round, and nothing still compiling when a
 * quick trip on lets the programs go.
 */
export async function compileReady(renderer, scene, camera, ms = 2000) {
  if (!renderer.compileAsync) return renderer.compile(scene, camera);
  await Promise.race([renderer.compileAsync(scene, camera).catch(() => {}), new Promise((r) => setTimeout(r, ms))]);
}
