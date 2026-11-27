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
import { readFileSync } from 'node:fs';
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
import { rigged } from './rigged.mjs';
import { streetfolk } from './streetfolk.mjs';
import { POLYFORK as SNOWPUFF_MODELS } from '../../src/snowpuff/assets.js';

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
export const EXTRAS_VERSION = 16;

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
  },
  {
    id: 'mina',
    name: 'Michelle (a woman in casual clothes)',
    url: 'https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/models/gltf/Michelle.glb',
    file: 'people/Michelle.glb',
    tags: ['character', 'human', 'woman', 'casual', 'rigged'],
    license: 'Mixamo (free for use in projects, not for redistribution as a standalone asset)',
    author: 'Adobe Mixamo, via the three.js examples',
    page: 'https://github.com/mrdoob/three.js/tree/r170/examples/models/gltf'
  },
  {
    id: 'jun',
    name: 'A Ready Player Me avatar (a man in casual clothes)',
    url: 'https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/models/gltf/readyplayer.me.glb',
    file: 'people/readyplayer.me.glb',
    tags: ['character', 'human', 'man', 'casual', 'rigged'],
    license: 'Ready Player Me avatar, as published in the three.js examples',
    author: 'Ready Player Me, via the three.js examples',
    page: 'https://github.com/mrdoob/three.js/tree/r170/examples/models/gltf'
  },
  {
    id: 'robot',
    name: 'Robot Expressive (an animated robot)',
    url: 'https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
    file: 'robot/RobotExpressive.glb',
    tags: ['character', 'robot', 'mech', 'rigged', 'animated'],
    license: 'CC0-1.0',
    author: 'Tomás Laulhé (Quaternius), modified by Don McCurdy, via the three.js examples',
    page: 'https://github.com/mrdoob/three.js/tree/r170/examples/models/gltf/RobotExpressive'
  },
  {
    id: 'car',
    name: 'Car Concept',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/glTF-Binary/CarConcept.glb',
    file: 'car/CarConcept.glb',
    tags: ['vehicle', 'car', 'sports car', 'concept'],
    // The licence excludes the Khronos logos: the game hides the steering-wheel emblem and draws its own number plate.
    license: 'CC-BY-4.0',
    author: 'Eric Chadwick, Darmstadt Graphics Group, for the Khronos Group',
    page: 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept'
  }
];
/**
 * Motion-capture clips as single files (BVH), for the motion study's retargeting
 * demo (motion-lab.html, src/shared/motion/). Kept out of the model catalogue.
 */
const EXTRA_MOTIONS = [
  {
    id: 'pirouette',
    url: 'https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/models/bvh/pirouette.bvh',
    file: 'motion/pirouette.bvh',
    // Carnegie Mellon University Graphics Lab Motion Capture Database (mocap.cs.cmu.edu): free for all
    // uses, including in commercial products, but the data may not be resold; BVH conversion for Daz
    // (cgspeed), shipped with the three.js BVHLoader example.
    license: 'CMU Graphics Lab Motion Capture Database terms (free for all uses; not for resale)',
    author: 'CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu), via the three.js examples'
  }
];
/** ambientCG materials by id: metal and concrete for Breachline's yards. */
const EXTRA_MATERIALS = ['CorrugatedSteel005', 'CorrugatedSteel007A', 'Metal027', 'PaintedMetal004', 'Concrete034', 'Concrete047A', 'MetalPlates006', 'Metal063', 'PavingStones128', 'Asphalt031', 'Ground078', 'Ground071', 'Ground103', 'Gravel043', 'Rock030',
  // Gloamreach's ground, stone, roofs and lava.
  'Grass004', 'PavingStones141', 'PavingStones142', 'Rock051', 'Rock035', 'Moss002', 'Bricks106A', 'Bricks112A', 'Bricks113A', 'RoofingTiles012B', 'RoofingTiles013A', 'RoofingTiles014B', 'WoodFloor041', 'WoodFloor043', 'Planks037A', 'Lava004',
  // Wyldhunt's jungle floor, mud, river pebbles, ruin flagstones and mossy rock.
  'Ground068', 'Ground106', 'Ground108', 'Bricks113A', 'Rock063',
  // Kickrani's red-brick villas close up.
  'Bricks105',
  // Kickrani's walls near the course: red villa brick, grey and beige granite panels, white tile, render.
  'Bricks101', 'Granite002A', 'Granite001A', 'Tiles107', 'Tiles133A', 'Plaster001',
  // Kickrani's pavements: brick paving blocks.
  'PavingStones152',
  // Kickrani's retaining walls where a hill road stands over the drop: mossy granite blocks.
  'PavingStones138',
  // Kickrani's street trees: a ginkgo's grey furrowed bark, a plane tree's peeling camouflage bark.
  'Bark004', 'Bark009',
  // The apartment kit's interiors (knowledge/apartment-study.md): light and mid oak, herringbone parquet,
  // bathroom tile, kitchen marble, a rug and painted plaster walls.
  'WoodFloor070', 'WoodFloor051', 'WoodFloor034', 'Tiles141', 'Marble012', 'Carpet016', 'PaintedPlaster017'];
// (Kithvale's painted ground uses Grass004, Ground068, Ground106, PavingStones141, Rock051 and Moss002, all above.)

/** polyfork models a game needs (CC BY 4.0, credited in the game), fetched by id from polyfork's CDN. */
const EXTRA_POLYFORK = [
  // Gloamreach: heroes, villagers, the Gloamwood's folk, animals.
  'human-knight-base', 'elf-hunter-base', 'elf-mage-base', 'tradesman-1707b9', 'black-smith-base', 'merchant-6f606b', 'halfling-hunter-base', 'farmer-base',
  'village-guard-5f0f6f', 'human-priest-base', 'forest-witch-base', 'villager-40255c', 'dryad-hunter-base', 'shopper-base', 'crossbowman-base', 'human-assassin-base',
  'human-warrior-base', 'slim-knight-base', 'dryad-priest-base', 'mushroom-druid-base', 'elf-assassin-base', 'hooded-staff-acolyte-base',
  'bear-base', 'deer-base', 'fox-base', 'cat-base', 'dog-base', 'chicken-base', 'spectral-stag-base', 'rabbit-base',
  // Gloamreach's armsmonger and monsters.
  'dwarf-knight-base', 'wolf-base', 'thorn-boar-base', 'tarantula-base', 'iridescent-treegolem-base', 'fungus-host-base', 'root-colossus-base', 'ashen-troll-base', 'red-fire-dragon-base',
  // Wyldhunt's hunters (the rest are Gloamreach's above).
  'orc-hunter-base',
  // Kithvale: your three looks and the people of Lanternrest.
  'kite-kid-base', 'village-child-bef09e', 'waving-child-dfada0', 'ashigaru-foot-soldier-806707', 'porter-e4e566', 'farmer-363820', 'townswoman-5ca8b5',
  'buddhist-monk-39f498', 'village-gardener-9f7af6', 'shopkeeper-be5547', 'crossing-keeper-e13207', 'daimyo-lord-78364a',
  // Kickrani: the delivery scooters in its bike race's traffic (games/g_cv2yrhrpv2/traffic.js).
  'delivery-moped-1aa2ce',
  // Snowpuff Peaks: the props on its mountains (src/snowpuff/assets.js).
  ...Object.values(SNOWPUFF_MODELS).map(([id]) => id),
  // The apartment kit: polyfork's "Open Plan" home-interior kit (63 parts: sofa, beds, kitchen runs, bath,
  // lamps, rugs, doors), listed from knowledge/polyfork.json (knowledge/apartment-study.md §9).
  ...polyforkKit('open-plan-b2ebd3')
];

/** Every model id of one polyfork kit, from the knowledge base's copy of polyfork's catalogue. */
function polyforkKit(kit) {
  try {
    const catalog = JSON.parse(readFileSync(new URL('../../knowledge/polyfork.json', import.meta.url), 'utf8'));
    const col = catalog.columns.indexOf('kit');
    return catalog.models.filter((m) => m[col] === kit).map((m) => m[0]);
  } catch {
    return [];
  }
}

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
  for (const m of EXTRA_MOTIONS) {
    const dest = path.join(LIBRARY, SRC, ...m.file.split('/'));
    try {
      const head = await readFile(dest).then((b) => b.subarray(0, 9).toString('latin1')).catch(() => '');
      if (head !== 'HIERARCHY') {
        await rm(dest, { force: true });
        await download(m.url, dest, budget);
        if ((await readFile(dest)).subarray(0, 9).toString('latin1') !== 'HIERARCHY') throw new Error('not a BVH file');
      }
    } catch (error) {
      if (error.budget) break;
      log(SRC, `skip motion ${m.id}: ${error.message}`);
    }
  }
  for (const id of EXTRA_POLYFORK) {
    const dest = path.join(LIBRARY, 'polyfork', `${id}.glb`);
    try {
      const head = await readFile(dest).then((b) => b.subarray(0, 4).toString('latin1')).catch(() => '');
      if (head !== 'glTF') {
        await rm(dest, { force: true });
        await download(`https://polyfork.dev/cdn/${id}.glb`, dest, budget);
        if ((await readFile(dest)).subarray(0, 4).toString('latin1') !== 'glTF') throw new Error('not a binary glTF');
      }
      assets.push({ id: `polyfork/${id}`, name: id, source: 'polyfork', pack: 'polyfork', file: rel(dest), files: [rel(dest)], tags: ['character', 'rigged', 'animated'], license: 'CC-BY-4.0', author: 'polyfork.dev', url: `https://polyfork.dev/asset/${id}` });
    } catch (error) {
      if (error.budget) break;
      log(SRC, `skip polyfork ${id}: ${error.message}`);
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
  // Kickrani's realistic people (Rocketbox, MIT) and vehicles (Sketchfab CC BY 4.0, via Objaverse).
  try {
    assets.push(...(await streetfolk({ budget })));
  } catch (error) {
    if (!error.budget) log(SRC, `skip streetfolk: ${error.message}`);
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
  [/quaternius/i, 'CC0-1.0', 'Quaternius', 'https://quaternius.com'],
  // Quaternius packs keep their own names when unzipped (no "quaternius" in them).
  [/universal (base characters|animation library)|modular character outfits|ultimate modular (men|women)/i, 'CC0-1.0', 'Quaternius', 'https://quaternius.com'],
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
        url: hint?.[3] ?? ''
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

/* ------------------------------------------------------------------------ */
/* Swiss Dwellings — 45,176 real apartments as plan geometry (opt-in, 0.9 GB) */
/* ------------------------------------------------------------------------ */

/**
 * Real apartment layouts for the apartment kit (knowledge/apartment-study.md §2, §8): rooms, walls,
 * doors, windows, railings and fixtures as WKT polygons in metres, per site / building / floor / unit
 * (geometries.csv), with daylight, view and noise simulations. CC BY 4.0, Archilyse AG / Zenodo.
 * Not in the default order (too big for every machine): `npm run library:fetch -- --sources dwellings`.
 */
export async function dwellings({ budget }) {
  const SRC = 'dwellings';
  const dir = path.join(LIBRARY, 'datasets', 'swiss-dwellings');
  const zip = path.join(LIBRARY, 'datasets', 'swiss-dwellings-v3.0.0.zip');
  const csv = path.join(dir, 'swiss-dwellings-v3.0.0', 'geometries.csv');
  if (await exists(csv)) {
    log(SRC, 'already extracted');
    return [];
  }
  await download('https://zenodo.org/records/7788422/files/swiss-dwellings-v3.0.0.zip?download=1', zip, budget, 931868205);
  await extractZip(zip, dir);
  await writeFile(
    path.join(dir, 'CREDITS.md'),
    '# Swiss Dwellings v3.0.0\n\nArchilyse AG and contributors, https://zenodo.org/records/7788422 (DOI 10.5281/zenodo.7788422).\n' +
      'Licence: CC BY 4.0 — credit "Swiss Dwellings (Archilyse AG), CC BY 4.0" wherever a layout from it is shown.\n'
  );
  await rm(zip, { force: true });
  log(SRC, `extracted into ${rel(dir)}`);
  return [];
}

export const SOURCES = { polyhaven, kaykit, polygonalmind, ambientcg, extras, rigged, inbox, dwellings };
