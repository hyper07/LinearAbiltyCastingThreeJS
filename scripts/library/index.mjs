#!/usr/bin/env node
/**
 * Build library/catalog.json from the source manifests.
 *
 *   npm run library:index
 *
 * Opens every glTF/GLB once (JSON only — no geometry is decoded) to measure
 * its real bounding box, triangle count, whether it is rigged and which
 * animations it carries, then files it under one category plus theme tags.
 * The catalog is what the game and the AI map planner choose from, so a model
 * that is not in it does not exist as far as they are concerned.
 */
import { open, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIBRARY, MANIFESTS, walk } from './lib.mjs';
import { SOURCES_LIST, categorize, normalizeWords, themesFor, surfaceFor } from '../../src/library/categories.js';

/* ---------------------------------------------------------------------- */
/* glTF inspection                                                         */
/* ---------------------------------------------------------------------- */

async function readGltfJson(file) {
  if (/\.gltf$/i.test(file)) return JSON.parse(await readFile(file, 'utf8'));
  const handle = await open(file, 'r');
  try {
    const header = Buffer.alloc(20);
    await handle.read(header, 0, 20, 0);
    if (header.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB');
    const jsonLength = header.readUInt32LE(12);
    const json = Buffer.alloc(jsonLength);
    await handle.read(json, 0, jsonLength, 20);
    return JSON.parse(json.toString('utf8'));
  } finally {
    await handle.close();
  }
}

const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function multiply(a, b) {
  const out = new Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] =
        a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return out;
}

function nodeMatrix(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
  return [
    (1 - 2 * (yy + zz)) * sx, 2 * (xy + wz) * sx, 2 * (xz - wy) * sx, 0,
    2 * (xy - wz) * sy, (1 - 2 * (xx + zz)) * sy, 2 * (yz + wx) * sy, 0,
    2 * (xz + wy) * sz, 2 * (yz - wx) * sz, (1 - 2 * (xx + yy)) * sz, 0,
    tx, ty, tz, 1
  ];
}

const apply = (m, [x, y, z]) => [
  m[0] * x + m[4] * y + m[8] * z + m[12],
  m[1] * x + m[5] * y + m[9] * z + m[13],
  m[2] * x + m[6] * y + m[10] * z + m[14]
];

/** World-space bounds, triangle count and rig facts, from the JSON alone. */
export function inspectGltf(json) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let triangles = 0;
  let meshes = 0;
  const visit = (index, parent) => {
    const node = json.nodes?.[index];
    if (!node) return;
    const world = multiply(parent, nodeMatrix(node));
    const mesh = node.mesh !== undefined ? json.meshes?.[node.mesh] : null;
    if (mesh) {
      meshes++;
      for (const prim of mesh.primitives ?? []) {
        const pos = json.accessors?.[prim.attributes?.POSITION];
        if (!pos?.min || !pos?.max) continue;
        const count = prim.indices !== undefined ? json.accessors?.[prim.indices]?.count ?? 0 : pos.count;
        if ((prim.mode ?? 4) === 4) triangles += Math.floor(count / 3);
        // Skinned meshes are drawn in bind space; their node transform is ignored by three.js.
        const m = node.skin !== undefined ? identity() : world;
        for (let i = 0; i < 8; i++) {
          const corner = [i & 1 ? pos.max[0] : pos.min[0], i & 2 ? pos.max[1] : pos.min[1], i & 4 ? pos.max[2] : pos.min[2]];
          const p = apply(m, corner);
          for (let k = 0; k < 3; k++) {
            if (p[k] < min[k]) min[k] = p[k];
            if (p[k] > max[k]) max[k] = p[k];
          }
        }
      }
    }
    for (const child of node.children ?? []) visit(child, world);
  };
  const scene = json.scenes?.[json.scene ?? 0];
  for (const root of scene?.nodes ?? []) visit(root, identity());
  const valid = Number.isFinite(min[0]);
  return {
    size: valid ? max.map((v, i) => +(v - min[i]).toFixed(4)) : null,
    min: valid ? min.map((v) => +v.toFixed(4)) : null,
    triangles,
    meshes,
    rigged: (json.skins?.length ?? 0) > 0,
    animations: (json.animations ?? []).map((a, i) => a.name || `anim_${i}`).slice(0, 40),
    textured: (json.images?.length ?? 0) > 0
  };
}

/* ---------------------------------------------------------------------- */
/* Catalog                                                                 */
/* ---------------------------------------------------------------------- */

export async function buildCatalog() {
  const manifests = [];
  for (const file of await walk(MANIFESTS)) {
    if (!file.endsWith('.json')) continue;
    try {
      manifests.push(JSON.parse(await readFile(file, 'utf8')));
    } catch {
      /* a half-written manifest from an aborted run — skip it */
    }
  }

  const models = [];
  const materials = [];
  const failures = [];

  for (const manifest of manifests) {
    for (const asset of manifest.assets ?? []) {
      if (asset.kind === 'material') {
        if (!asset.maps?.color) continue;
        materials.push({
          id: asset.id,
          name: asset.name,
          surface: surfaceFor(asset.tags),
          tags: [...new Set(asset.tags)].slice(0, 12),
          maps: asset.maps,
          license: asset.license,
          source: asset.source
        });
        continue;
      }
      let facts;
      try {
        facts = inspectGltf(await readGltfJson(path.join(LIBRARY, ...asset.file.split('/'))));
      } catch (error) {
        failures.push(`${asset.id}: ${error.message}`);
        continue;
      }
      if (!facts.size || facts.triangles === 0) continue;
      const words = normalizeWords([asset.name, asset.pack, ...(asset.tags ?? []), asset.file].join(' '));
      const category = categorize(words, { ...facts, realScale: asset.source === 'polyhaven' }, asset.name);
      models.push({
        id: asset.id,
        name: String(asset.name).replace(/\.(gltf|glb)$/i, ''),
        category,
        themes: themesFor(words),
        tags: [...new Set((asset.tags ?? []).map((t) => String(t).toLowerCase()).filter((t) => t && t.length < 24))].slice(0, 16),
        file: asset.file,
        size: facts.size,
        min: facts.min,
        triangles: facts.triangles,
        rigged: facts.rigged,
        animations: facts.animations,
        textured: facts.textured,
        source: asset.source,
        pack: asset.pack,
        license: asset.license,
        author: asset.author,
        url: asset.url
      });
    }
  }

  models.sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
  const counts = {};
  for (const m of models) counts[m.category] = (counts[m.category] ?? 0) + 1;
  const themeCounts = {};
  for (const m of models) for (const t of m.themes) themeCounts[t] = (themeCounts[t] ?? 0) + 1;

  const catalog = {
    version: 1,
    generatedAt: new Date().toISOString(),
    counts,
    themes: themeCounts,
    sources: SOURCES_LIST.filter((s) => models.some((m) => m.source === s) || materials.some((m) => m.source === s)),
    models,
    materials
  };
  await writeFile(path.join(LIBRARY, 'catalog.json'), JSON.stringify(catalog));
  await writeFile(path.join(LIBRARY, 'CREDITS.md'), credits(models, materials));
  // A library indexed by hand (no fetch run) still reports itself as ready.
  const statusFile = path.join(LIBRARY, 'status.json');
  try {
    await readFile(statusFile);
  } catch {
    await writeFile(statusFile, JSON.stringify({ state: 'done', models: models.length, materials: materials.length, updatedAt: new Date().toISOString() }));
  }
  if (failures.length) {
    await writeFile(path.join(LIBRARY, 'index-errors.log'), failures.join('\n'));
    console.log(`${failures.length} models could not be read — see library/index-errors.log`);
  }

  return {
    models: models.length,
    materials: materials.length,
    byCategory: Object.entries(counts).sort((a, b) => b[1] - a[1])
  };
}

function credits(models, materials) {
  const packs = new Map();
  for (const item of [...models, ...materials]) {
    const key = `${item.source}|${item.pack ?? item.source}`;
    if (!packs.has(key)) packs.set(key, { ...item, count: 0, authors: new Set() });
    const entry = packs.get(key);
    entry.count++;
    if (item.author) entry.authors.add(item.author);
  }
  const lines = ['# Asset library credits', '', 'Generated by `npm run library:index`.', ''];
  lines.push('| Pack | Source | Licence | Authors | Items | Link |', '| --- | --- | --- | --- | --- | --- |');
  for (const p of [...packs.values()].sort((a, b) => a.source.localeCompare(b.source))) {
    const authors = [...p.authors].slice(0, 6).join(', ') + (p.authors.size > 6 ? ', …' : '');
    lines.push(`| ${p.pack ?? p.source} | ${p.source} | ${p.license} | ${authors} | ${p.count} | ${p.url ?? ''} |`);
  }
  return lines.join('\n') + '\n';
}

// Run directly: `node scripts/library/index.mjs`
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const summary = await buildCatalog();
  console.log(`Catalog: ${summary.models} models, ${summary.materials} materials → library/catalog.json`);
  console.log(summary.byCategory.map(([c, n]) => `  ${c.padEnd(12)} ${n}`).join('\n'));
}
