/**
 * One fetcher per open asset source. Each returns a list of manifest entries:
 *
 *   { id, name, source, pack, file, files[], tags[], license, author, url }
 *
 * `file` is the model to load (library-relative), `files` everything that came
 * with it. Only sources that offer an official API or plain GitHub downloads
 * are fetched here. Sites that block scripts (Kenney, Quaternius, itch.io) go
 * through the inbox instead — see `inbox` below and the README.
 */
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  LIBRARY,
  download,
  extractZip,
  getJson,
  log,
  pool,
  rel,
  removeDir,
  safeName,
  walk,
  exists
} from './lib.mjs';

const MODEL_EXT = /\.(glb|gltf)$/i;
const KEEP_EXT = /\.(glb|gltf|bin|png|jpe?g|webp|ktx2)$/i;

/* ------------------------------------------------------------------------ */
/* Poly Haven — ~500 CC0 photoscanned models, official public API            */
/* ------------------------------------------------------------------------ */

export async function polyhaven({ budget, resolution = '1k', concurrency = 4 }) {
  const SRC = 'polyhaven';
  const index = await getJson('https://api.polyhaven.com/assets?t=models');
  const ids = Object.keys(index).sort();
  log(SRC, `${ids.length} models listed, fetching ${resolution} glTF`);

  const assets = [];
  let done = 0;
  await pool(ids, concurrency, async (id) => {
    if (budget.exhausted) return;
    const info = index[id];
    try {
      const files = await getJson(`https://api.polyhaven.com/files/${id}`);
      const res = files.gltf?.[resolution] ?? files.gltf?.['1k'] ?? Object.values(files.gltf ?? {})[0];
      const gltf = res?.gltf;
      if (!gltf) return;
      const dir = path.join(LIBRARY, SRC, safeName(id));
      const main = path.join(dir, path.basename(new URL(gltf.url).pathname));
      const written = [];
      await download(gltf.url, main, budget, gltf.size);
      written.push(rel(main));
      for (const [relative, part] of Object.entries(gltf.include ?? {})) {
        const dest = path.join(dir, ...relative.split('/'));
        await download(part.url, dest, budget, part.size);
        written.push(rel(dest));
      }
      assets.push({
        id: `${SRC}/${id}`,
        name: info.name ?? id,
        source: SRC,
        pack: 'Poly Haven',
        file: rel(main),
        files: written,
        tags: [...(info.categories ?? []), ...(info.tags ?? [])],
        license: 'CC0-1.0',
        author: Object.keys(info.authors ?? {}).join(', '),
        url: `https://polyhaven.com/a/${id}`,
        // Poly Haven reports real-world size in millimetres.
        dimensionsMm: info.dimensions ?? null
      });
    } catch (error) {
      if (error.budget) return;
      log(SRC, `skip ${id}: ${error.message}`);
    } finally {
      if (++done % 25 === 0) log(SRC, `${done}/${ids.length}`);
    }
  });
  return assets;
}

/* ------------------------------------------------------------------------ */
/* KayKit — stylised CC0 packs on GitHub (characters, dungeon, city, hex…)   */
/* ------------------------------------------------------------------------ */

export async function kaykit({ budget }) {
  const SRC = 'kaykit';
  const repos = await getJson('https://api.github.com/users/KayKit-Game-Assets/repos?per_page=100');
  log(SRC, `${repos.length} packs`);
  const assets = [];

  for (const repo of repos) {
    if (budget.exhausted) break;
    const pack = repo.name;
    const zip = path.join(LIBRARY, '.cache', `${pack}.zip`);
    const tmp = path.join(LIBRARY, '.cache', pack);
    const out = path.join(LIBRARY, SRC, safeName(pack));
    try {
      await download(`https://codeload.github.com/KayKit-Game-Assets/${pack}/zip/refs/heads/${repo.default_branch}`, zip, budget);
      await removeDir(tmp);
      await extractZip(zip, tmp);
      const all = await walk(tmp);
      // Packs ship the same model as FBX, OBJ and glTF. Keep the glTF set only.
      const hasGltf = all.some((f) => MODEL_EXT.test(f));
      const keep = all.filter((f) => KEEP_EXT.test(f) && (hasGltf || !/\.(fbx|obj)$/i.test(f)));
      for (const file of keep) {
        const relative = path.relative(tmp, file);
        const dest = path.join(out, relative.split(path.sep).slice(1).join(path.sep) || path.basename(file));
        await mkdir(path.dirname(dest), { recursive: true });
        await copyFile(file, dest);
        budget.used += (await exists(dest))?.size ?? 0;
        if (MODEL_EXT.test(file)) {
          const name = path.basename(file).replace(MODEL_EXT, '');
          const folders = path.relative(out, path.dirname(dest)).split(path.sep).filter(Boolean);
          assets.push({
            id: `${SRC}/${pack}/${folders.concat(name).join('/')}`,
            name,
            source: SRC,
            pack: pack.replace(/^KayKit-|-1\.0$/g, '').replace(/-/g, ' '),
            file: rel(dest),
            files: [rel(dest)],
            tags: [...folders, ...pack.toLowerCase().split('-')].map((t) => t.toLowerCase()),
            license: 'CC0-1.0',
            author: 'Kay Lousberg',
            url: repo.html_url
          });
        }
      }
      await removeDir(tmp);
      log(SRC, `${pack}: ${keep.filter((f) => MODEL_EXT.test(f)).length} models`);
    } catch (error) {
      if (error.budget) break;
      log(SRC, `skip ${pack}: ${error.message}`);
    }
  }
  return assets;
}

/* ------------------------------------------------------------------------ */
/* Polygonal Mind via the Open Source 3D Assets registry — CC0 GLBs          */
/* ------------------------------------------------------------------------ */

export async function polygonalmind({ budget, concurrency = 4 }) {
  const SRC = 'polygonalmind';
  const BASE = 'https://raw.githubusercontent.com/ToxSam/open-source-3d-assets/main/data/';
  const projects = await getJson(`${BASE}projects.json`);
  const assets = [];

  for (const project of projects) {
    if (budget.exhausted) break;
    if (!project.asset_data_file) continue;
    let list;
    try {
      list = await getJson(BASE + project.asset_data_file);
    } catch (error) {
      log(SRC, `skip ${project.id}: ${error.message}`);
      continue;
    }
    const license = /cc0/i.test(project.license ?? '') ? 'CC0-1.0' : project.license ?? 'unknown';
    await pool(list, concurrency, async (item) => {
      if (budget.exhausted || !item.model_file_url || !/glb|gltf/i.test(item.format ?? 'glb')) return;
      const filename = safeName(path.basename(new URL(item.model_file_url).pathname));
      const dest = path.join(LIBRARY, SRC, safeName(project.name), filename);
      try {
        await download(item.model_file_url, dest, budget, item.metadata?.file_size ?? 0);
        const traits = (item.metadata?.attributes ?? []).map((a) => String(a.value).toLowerCase());
        assets.push({
          id: `${SRC}/${project.name}/${filename.replace(MODEL_EXT, '')}`,
          name: item.name ?? filename,
          source: SRC,
          pack: project.name,
          file: rel(dest),
          files: [rel(dest)],
          tags: [project.name.toLowerCase(), ...traits, ...(project.description ?? '').toLowerCase().split(/\W+/)],
          license,
          author: project.creator_id ?? 'Polygonal Mind',
          url: project.github_url ?? item.model_file_url
        });
      } catch (error) {
        if (!error.budget) log(SRC, `skip ${item.name}: ${error.message}`);
      }
    });
    log(SRC, `${project.name}: ${list.length} listed`);
  }
  return assets;
}

/* ------------------------------------------------------------------------ */
/* ambientCG — CC0 PBR materials for terrain (ground, rock, snow, sand…)     */
/* ------------------------------------------------------------------------ */

const TERRAIN_QUERIES = [
  'grass', 'ground', 'rock', 'cliff', 'gravel', 'snow', 'sand', 'moss', 'mud', 'dirt',
  'ice', 'lava', 'asphalt', 'paving stones', 'cobblestone', 'bricks', 'roofing tiles', 'planks', 'forest floor'
];

export async function ambientcg({ budget, perQuery = 6, resolution = '1K-JPG' }) {
  const SRC = 'ambientcg';
  const seen = new Set();
  const assets = [];
  for (const query of TERRAIN_QUERIES) {
    if (budget.exhausted) break;
    const url =
      `https://ambientcg.com/api/v2/full_json?type=Material&sort=Popular&limit=${perQuery}` +
      `&q=${encodeURIComponent(query)}&include=downloadData,tagData`;
    let found;
    try {
      found = (await getJson(url)).foundAssets ?? [];
    } catch (error) {
      log(SRC, `skip "${query}": ${error.message}`);
      continue;
    }
    for (const asset of found) {
      if (seen.has(asset.assetId) || budget.exhausted) continue;
      seen.add(asset.assetId);
      try {
        const entry = await ambientMaterial(asset, query, budget, resolution);
        if (entry) assets.push(entry);
      } catch (error) {
        if (error.budget) break;
        log(SRC, `skip ${asset.assetId}: ${error.message}`);
      }
    }
    log(SRC, `"${query}": ${found.length}`);
  }
  return assets;
}


/** Download one ambientCG material (an asset from their API) and describe it for the catalog. */
async function ambientMaterial(asset, query, budget, resolution = '1K-JPG') {
  const SRC = 'ambientcg';
  const downloads = Object.values(asset.downloadFolders?.default?.downloadFiletypeCategories ?? {}).flatMap((c) => c.downloads ?? []);
  const pick = downloads.find((d) => d.attribute === resolution) ?? downloads.find((d) => /1K/.test(d.attribute));
  if (!pick) return null;
  const dir = path.join(LIBRARY, SRC, safeName(asset.assetId));
  const zip = path.join(LIBRARY, '.cache', `${asset.assetId}_${pick.attribute}.zip`);
  if (!(await exists(path.join(dir, '.done')))) {
    await download(pick.downloadLink, zip, budget, pick.size);
    await extractZip(zip, dir);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, '.done'), '');
  }
  const files = (await walk(dir)).filter((f) => /\.(jpe?g|png)$/i.test(f));
  const map = (re) => files.find((f) => re.test(path.basename(f)));
  return {
    id: `${SRC}/${asset.assetId}`,
    name: asset.displayName ?? asset.assetId,
    source: SRC,
    pack: 'ambientCG',
    kind: 'material',
    maps: {
      color: map(/_Color\./i) && rel(map(/_Color\./i)),
      normal: map(/_NormalGL\./i) && rel(map(/_NormalGL\./i)),
      roughness: map(/_Roughness\./i) && rel(map(/_Roughness\./i)),
      ao: map(/_AmbientOcclusion\./i) && rel(map(/_AmbientOcclusion\./i)),
      metalness: map(/_Metalness\./i) && rel(map(/_Metalness\./i))
    },
    files: files.map(rel),
    tags: [query, ...(asset.tags ?? []), asset.displayCategory ?? ''].map((t) => String(t).toLowerCase()),
    license: 'CC0-1.0',
    author: 'ambientCG',
    url: `https://ambientcg.com/view?id=${asset.assetId}`
  };
}

/* ------------------------------------------------------------------------ */
/* Extras — named files a game needs, from GitHub and ambientCG by id        */
/* ------------------------------------------------------------------------ */

/** Bump when the list changes, so libraries that have the old list fetch the new files. */
export const EXTRAS_VERSION = 2;

/** Models fetched as single files from a GitHub repository at a fixed tag. */
const EXTRA_MODELS = [
  {
    id: 'soldier',
    name: 'Soldier',
    url: 'https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/models/gltf/Soldier.glb',
    file: 'soldier/Soldier.glb',
    tags: ['character', 'soldier', 'human', 'military', 'rigged', 'animated'],
    // The character and its animations come from Adobe Mixamo, whose terms allow use in games;
    // it is fetched from the three.js examples, not redistributed in this repository.
    license: 'Mixamo (free for use in projects, not for redistribution as a standalone asset)',
    author: 'Adobe Mixamo, via the three.js examples',
    page: 'https://github.com/mrdoob/three.js/tree/r170/examples/models/gltf'
  }
];
/** ambientCG materials by id: metal and concrete for Breachline's yards. */
const EXTRA_MATERIALS = ['CorrugatedSteel005', 'CorrugatedSteel007A', 'Metal027', 'PaintedMetal004', 'Concrete034', 'Concrete047A', 'MetalPlates006', 'Metal063'];

export async function extras({ budget }) {
  const SRC = 'extras';
  const assets = [];
  for (const m of EXTRA_MODELS) {
    const dest = path.join(LIBRARY, SRC, ...m.file.split('/'));
    try {
      // A binary glTF starts with "glTF"; anything else (an error page) is fetched again.
      const head = await readFile(dest).then((b) => b.subarray(0, 4).toString('latin1')).catch(() => '');
      if (head !== 'glTF') await rm(dest, { force: true });
      await download(m.url, dest, budget);
      if ((await readFile(dest)).subarray(0, 4).toString('latin1') !== 'glTF') throw new Error('not a binary glTF');
      assets.push({ id: `${SRC}/${m.id}`, name: m.name, source: SRC, pack: 'Extras', file: rel(dest), files: [rel(dest)], tags: m.tags, license: m.license, author: m.author, url: m.page });
    } catch (error) {
      if (error.budget) break;
      log(SRC, `skip ${m.id}: ${error.message}`);
    }
  }
  for (const id of EXTRA_MATERIALS) {
    try {
      const found = (await getJson(`https://ambientcg.com/api/v2/full_json?id=${encodeURIComponent(id)}&include=downloadData,tagData`)).foundAssets ?? [];
      const entry = found[0] && (await ambientMaterial(found[0], 'extras', budget));
      if (entry) assets.push(entry);
    } catch (error) {
      if (error.budget) break;
      log(SRC, `skip ${id}: ${error.message}`);
    }
  }
  if (assets.length) await writeFile(path.join(LIBRARY, SRC, '.done'), String(EXTRAS_VERSION));
  return assets;
}

/* ------------------------------------------------------------------------ */
/* Inbox — packs you download by hand (Kenney, Quaternius, Sketchfab, …)     */
/* ------------------------------------------------------------------------ */

/** Pack-name hints for licences of well-known hand-downloaded packs. */
const KNOWN_LICENSES = [
  [/kenney/i, 'CC0-1.0', 'Kenney'],
  [/quaternius/i, 'CC0-1.0', 'Quaternius'],
  [/kaykit/i, 'CC0-1.0', 'Kay Lousberg'],
  [/poly ?pizza/i, 'see pack', 'Poly Pizza'],
  [/sketchfab/i, 'see pack', 'Sketchfab']
];

/**
 * Unzip everything dropped into `library/inbox/` and register every glTF/GLB.
 * Each zip (or folder) becomes a pack. A `LICENSE*` or `License*.txt` inside
 * the pack is recorded; well-known CC0 publishers are recognised by name.
 * FBX/OBJ-only packs are listed in the summary so they can be converted.
 */
export async function inbox({ budget }) {
  const SRC = 'inbox';
  const INBOX = path.join(LIBRARY, 'inbox');
  const OUT = path.join(LIBRARY, SRC);
  await mkdir(INBOX, { recursive: true });
  const assets = [];
  const skippedFormats = new Map();

  const top = await readdir(INBOX, { withFileTypes: true });
  for (const entry of top) {
    const isZip = entry.isFile() && /\.zip$/i.test(entry.name);
    if (!isZip && !entry.isDirectory()) continue;
    const pack = entry.name.replace(/\.zip$/i, '');
    const dest = path.join(OUT, safeName(pack));
    if (isZip && !(await exists(path.join(dest, '.done')))) {
      await extractZip(path.join(INBOX, entry.name), dest);
      await writeFile(path.join(dest, '.done'), '');
    }
    const root = isZip ? dest : path.join(INBOX, entry.name);
    const files = await walk(root);
    const hint = KNOWN_LICENSES.find(([re]) => re.test(pack));
    const licenseFile = files.find((f) => /^licen[cs]e/i.test(path.basename(f)));
    let models = files.filter((f) => MODEL_EXT.test(f));
    if (!models.length) {
      const other = files.filter((f) => /\.(fbx|obj|dae|blend)$/i.test(f)).length;
      if (other) skippedFormats.set(pack, other);
      continue;
    }
    for (const file of models) {
      const name = path.basename(file).replace(MODEL_EXT, '');
      const folders = path.relative(root, path.dirname(file)).split(path.sep).filter(Boolean);
      assets.push({
        id: `${SRC}/${safeName(pack)}/${folders.concat(name).join('/')}`,
        name,
        source: SRC,
        pack,
        file: rel(file),
        files: [rel(file)],
        tags: [...pack.toLowerCase().split(/[\W_]+/), ...folders.map((f) => f.toLowerCase())],
        license: hint?.[1] ?? (licenseFile ? `see ${rel(licenseFile)}` : 'unknown — check before sharing'),
        author: hint?.[2] ?? pack,
        url: ''
      });
    }
    log(SRC, `${pack}: ${models.length} models`);
  }
  for (const [pack, count] of skippedFormats) {
    log(SRC, `${pack}: ${count} FBX/OBJ files but no glTF/GLB — export the glTF version of the pack`);
  }
  void budget;
  return assets;
}

export const SOURCES = { polyhaven, kaykit, polygonalmind, ambientcg, extras, inbox };
