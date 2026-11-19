/**
 * Rigged and animated characters and creatures, plus a few studio and sky
 * HDRIs to light them. Every file comes from a public GitHub repository at a
 * pinned commit, from Poly Haven's API, or from a direct permanent link, so a
 * fresh clone fetches exactly what was reviewed.
 *
 *   npm run library:fetch -- --sources rigged
 *
 * What is here and why: knowledge/assets-guide.md. Each entry keeps its own
 * licence; the CC-BY ones need a credit line where they are shown.
 */
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { LIBRARY, download, getJson, log, pool, rel } from './lib.mjs';

/** Bump when the lists change, so a library that has the old set fetches the new files. */
export const RIGGED_VERSION = 1;

const SRC = 'rigged';
const raw = (repo, ref, file) => `https://raw.githubusercontent.com/${repo}/${ref}/${file.split('/').map(encodeURIComponent).join('/')}`;

/* ---------------------------------------------------------------------- */
/* Mesh2Motion — CC0 rigs with separate animation files (MIT app)          */
/* ---------------------------------------------------------------------- */

const M2M = { repo: 'Mesh2Motion/mesh2motion-app', ref: 'bcb014ea25e44f76b3add78463f72d1faec16418', page: 'https://github.com/Mesh2Motion/mesh2motion-app' };

/**
 * Who made each body and under what licence (from the app's src/lib/RigConfig.ts);
 * anything not listed is CC0 by Mesh2Motion. `skip` drops a duplicate.
 */
const M2M_VARIATIONS = {
  human: {
    base: { name: 'Male (base)', author: 'Quaternius, rigged by Mesh2Motion' },
    zombie: { name: 'Zombie', author: 'Kenney, rigged by Mesh2Motion' },
    sophia: { name: 'Sophia', author: 'Tysan Tan', license: 'CC-BY-SA-4.0' },
    jay: { name: 'Jay', author: 'Blender Studio', license: 'CC-BY-4.0' },
    sintel: { name: 'Sintel', author: 'Blender Studio', license: 'CC-BY-4.0' },
    bunny: { name: 'Bunny', author: 'Blender Studio', license: 'CC-BY-4.0' },
    '*psx': { author: 'elbolilloduro (Characters PSX), rigged by Mesh2Motion' }
  },
  fox: { base: { name: 'Fox' }, dog: { name: 'Dog' }, panda: { name: 'Panda' }, cat: { name: 'Carrot the cat', author: 'David Revoy', license: 'CC-BY-4.0' }, horse: { skip: true } },
  bird: { seagull: { name: 'Seagull' }, eagle: { name: 'Bald eagle' } },
  kaiju: { base: { name: 'Lizard kaiju' }, trex: { name: 'T-Rex' } },
  shark: { shark: { name: 'Shark' }, whale: { name: 'Whale' } }
};
const M2M_TAGS = {
  human: ['human', 'humanoid', 'person', 'character'],
  fox: ['quadruped', 'animal', 'pet', 'mammal'],
  bird: ['bird', 'flying', 'animal'],
  dragon: ['dragon', 'flying', 'beast', 'monster', 'boss'],
  horse: ['horse', 'mount', 'quadruped', 'animal'],
  kaiju: ['kaiju', 'dinosaur', 'lizard', 'beast', 'monster', 'boss'],
  shark: ['fish', 'sea', 'swimming', 'animal'],
  snake: ['snake', 'reptile', 'animal'],
  spider: ['spider', 'bug', 'monster']
};

async function mesh2motion(budget) {
  const base = (file) => raw(M2M.repo, M2M.ref, `static/assets/${file}`);
  const manifest = await getJson(base('manifest.json'));
  const out = (file) => path.join(LIBRARY, SRC, 'mesh2motion', ...file.split('/'));
  const assets = [];
  for (const [rig, info] of Object.entries(manifest.rigs ?? {})) {
    // Clips are their own small GLBs on the rig's skeleton: fetch them all once per rig.
    const clips = [];
    await pool(info.animations ?? [], 6, async (anim) => {
      await download(base(anim.file), out(anim.file), budget);
      clips.push({ name: anim.name, file: rel(out(anim.file)), loop: anim.loop, seconds: anim.duration });
    });
    clips.sort((a, b) => a.name.localeCompare(b.name));
    const settings = M2M_VARIATIONS[rig] ?? {};
    const bodies = info.variations?.length ? info.variations : [{ name: rig, file: info.model.file }];
    for (const body of bodies) {
      const s = settings[body.name] ?? (body.name.startsWith('psx') ? { name: `PSX ${body.name.replace(/^psx-?/, '').replace(/-/g, ' ')}`, ...settings['*psx'] } : {});
      if (s.skip) continue;
      await download(base(body.file), out(body.file), budget);
      assets.push({
        id: `${SRC}/mesh2motion/${rig}/${body.name}`,
        name: s.name ?? body.name.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()),
        source: SRC,
        pack: 'Mesh2Motion',
        file: rel(out(body.file)),
        files: [rel(out(body.file))],
        clips,
        rig: `mesh2motion-${rig}`,
        tags: ['rigged', 'animated', 'mesh2motion', rig, body.name, ...(M2M_TAGS[rig] ?? [])],
        license: s.license ?? 'CC0-1.0',
        author: s.author ?? 'Mesh2Motion contributors',
        url: M2M.page
      });
    }
  }
  // Weapons and tools sized for the human rig's hand.
  for (const prop of PROPS) {
    const file = `props/${prop}.glb`;
    await download(base(file), out(file), budget);
    assets.push({ id: `${SRC}/mesh2motion/props/${prop}`, name: prop.replace(/_/g, ' '), source: SRC, pack: 'Mesh2Motion props', file: rel(out(file)), files: [rel(out(file))], tags: ['prop', 'weapon', 'mesh2motion', ...prop.toLowerCase().split('_')], license: 'CC0-1.0', author: 'Mesh2Motion contributors', url: M2M.page });
  }
  return assets;
}
const PROPS = ['arrow_A', 'axe_A', 'axe_B', 'bow_A_withString', 'bow_B_withString', 'dagger_A', 'halberd', 'hammer_A', 'hammer_B', 'shield_A', 'shield_B', 'shield_C', 'spear_A', 'staff_A', 'staff_B', 'sword_A', 'sword_B', 'sword_C', 'wand_A', 'Shovel', 'Sickle'];

/* ---------------------------------------------------------------------- */
/* Single files from GitHub at pinned commits                              */
/* ---------------------------------------------------------------------- */

const THREE = { repo: 'mrdoob/three.js', ref: 'r170', page: 'https://github.com/mrdoob/three.js/tree/r170/examples/models/gltf' };
const ROME = { license: 'Apache-2.0', author: 'mirada for ro.me (3 Dreams of Black), via the three.js examples' };
const MIXAMO = { license: 'Mixamo (free for use in projects, not for redistribution as a standalone asset)', author: 'Adobe Mixamo, via the three.js examples' };
const KENNEY = (repo, ref) => ({ repo: `KenneyNL/${repo}`, ref, license: 'CC0-1.0', author: 'Kenney', page: `https://github.com/KenneyNL/${repo}` });
const GOBKIT = { repo: 'Ariescar/gobkit-free-assets', ref: '4e73c68fa6e8ca9d948fcc0ce7215c830a022c3b', license: 'CC0-1.0', author: 'Gobkit', page: 'https://github.com/Ariescar/gobkit-free-assets' };
const KHRONOS = { repo: 'KhronosGroup/glTF-Sample-Assets', ref: 'f0920f5b32d172a30efe3f9257e965918831e6ea' };

/** Gobkit models carry one baked track; these are its frame ranges at 24 fps (from the repo README). */
const GOBKIT_SEGMENTS = { idle: [0, 29], attack: [30, 59], dead: [60, 89], walk: [90, 119] };

const FILES = [
  { id: 'threejs/xbot', name: 'X Bot (Mixamo mannequin)', ...THREE, ...MIXAMO, path: 'examples/models/gltf/Xbot.glb', tags: ['character', 'humanoid', 'robot', 'mannequin', 'mixamo', 'additive'] },
  { id: 'threejs/parrot', name: 'Parrot (flapping)', ...THREE, ...ROME, path: 'examples/models/gltf/Parrot.glb', tags: ['bird', 'parrot', 'flying', 'morph', 'animal'] },
  { id: 'threejs/flamingo', name: 'Flamingo (flapping)', ...THREE, ...ROME, path: 'examples/models/gltf/Flamingo.glb', tags: ['bird', 'flamingo', 'flying', 'morph', 'animal'] },
  { id: 'threejs/stork', name: 'Stork (flapping)', ...THREE, ...ROME, path: 'examples/models/gltf/Stork.glb', tags: ['bird', 'stork', 'flying', 'morph', 'animal'] },
  { id: 'threejs/horse', name: 'Horse (galloping)', ...THREE, ...ROME, path: 'examples/models/gltf/Horse.glb', tags: ['horse', 'gallop', 'morph', 'animal', 'mount'] },
  { id: 'khronos/fox', name: 'Fox (Survey, Walk, Run)', ...KHRONOS, license: 'CC0-1.0 model by PixelMannen; CC-BY-4.0 rig and animation by tomkranis', author: 'PixelMannen, tomkranis, Asobo Studio and scurest (Khronos glTF sample)', page: 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox', path: 'Models/Fox/glTF-Binary/Fox.glb', tags: ['fox', 'animal', 'quadruped', 'low poly'] },
  { id: 'kenney/platformer/character', name: 'Platformer character', ...KENNEY('Starter-Kit-3D-Platformer', '3fa8a04b1c01ab23db43123d4ce814a34c3fc7f0'), path: 'models/character.glb', textures: ['Textures/colormap.png'], tags: ['character', 'cartoon', 'platformer', 'hero', 'kenney'] },
  { id: 'kenney/arena/soldier', name: 'Mini arena soldier', ...KENNEY('Starter-Kit-Basic-Scene', 'a6927e66ff8dd8e173660ce4825abe773c65f683'), path: 'sample/Mini Arena/Models/GLB format/character-soldier.glb', textures: ['Textures/colormap.png'], tags: ['character', 'cartoon', 'soldier', 'knight', 'top-down', 'kenney'] },
  { id: 'kenney/fps/enemy-flying', name: 'Flying enemy drone', ...KENNEY('Starter-Kit-FPS', '185fd2326d74a5cf858cffc616f87cf9696f9cc0'), path: 'models/enemy-flying.glb', textures: ['Textures/colormap.png'], tags: ['enemy', 'drone', 'flying', 'robot', 'kenney'] },
  ...['Anglerfish', 'Bat', 'Corgi', 'Duck', 'Hippo', 'Jellyfish', 'Platypus', 'Red', 'Rhino', 'Shark'].map((n) => ({ id: `gobkit/${n.toLowerCase()}`, name: n === 'Red' ? 'Red panda' : n, ...GOBKIT, path: `animal/${n}.glb`, segments: GOBKIT_SEGMENTS, tags: ['animal', 'creature', 'cute', 'low poly', 'gobkit', n.toLowerCase()] })),
  ...['a01', 'a02', 'b01', 'b02', 'c01', 'c02', 'd01', 'd02'].map((n) => ({ id: `gobkit/minion-${n}`, name: `Minion ${n.toUpperCase()}`, ...GOBKIT, path: `minion/minion-${n}.glb`, segments: { idle: GOBKIT_SEGMENTS.idle, attack: GOBKIT_SEGMENTS.attack, dead: GOBKIT_SEGMENTS.dead }, tags: ['enemy', 'minion', 'monster', 'goblin', 'low poly', 'gobkit'] }))
];
async function githubFiles(budget) {
  const assets = [];
  await pool(FILES, 4, async (f) => {
    const dest = path.join(LIBRARY, SRC, ...f.id.split('/').slice(0, -1), path.basename(f.path));
    try {
      const head = await readFile(dest).then((b) => b.subarray(0, 4).toString('latin1')).catch(() => '');
      if (head && head !== 'glTF') await rm(dest, { force: true });
      await download(raw(f.repo, f.ref, f.path), dest, budget);
      if ((await readFile(dest)).subarray(0, 4).toString('latin1') !== 'glTF') throw new Error('not a binary glTF');
      // Textures the GLB points at by URI (Kenney's shared colour map) land beside it.
      for (const t of f.textures ?? []) await download(raw(f.repo, f.ref, `${path.posix.dirname(f.path)}/${t}`), path.join(path.dirname(dest), ...t.split('/')), budget);
      assets.push({ id: `${SRC}/${f.id}`, name: f.name, source: SRC, pack: f.id.split('/')[0], file: rel(dest), files: [rel(dest)], tags: ['rigged', ...f.tags], ...(f.segments ? { segments: f.segments } : {}), license: f.license, author: f.author, url: f.page });
    } catch (error) {
      if (!error.budget) log(SRC, `skip ${f.id}: ${error.message}`);
    }
  });
  return assets;
}

/* ---------------------------------------------------------------------- */
/* VRM avatars — 100Avatars R1 (CC0, Polygonal Mind), via Open Source Avatars */
/* ---------------------------------------------------------------------- */

const OSA = { repo: 'ToxSam/open-source-avatars', ref: '0f9a1b2fd99894736563d55b2c9dc9125700d081' };
/** Picked by eye from the registry's thumbnails: the friendliest, most readable bodies. */
const VRM_PICKS = {
  Teddy: 'bear teddy animal', Froggy: 'frog animal', Polybot: 'robot', Mushy: 'mushroom', Carrot: 'vegetable', Snowy: 'snowman winter',
  Muscary: 'mushroom girl', Cappy: 'boy kid', Astronaut: 'space kid', Witch: 'witch magic', Rabbit: 'rabbit woman', DinoKid: 'dinosaur costume kid', Avocado: 'fruit', Robert: 'man adult'
};

async function vrmAvatars(budget) {
  const list = await getJson(raw(OSA.repo, OSA.ref, 'data/avatars/100avatars-r1.json'));
  const assets = [];
  await pool(Object.entries(VRM_PICKS), 3, async ([name, words]) => {
    const a = list.find((x) => x.name === name);
    if (!a?.model_file_url) return log(SRC, `skip VRM ${name}: not in the registry`);
    const dest = path.join(LIBRARY, SRC, 'vrm', `${a.metadata?.number ?? '000'}_${name}.vrm`);
    try {
      await download(a.model_file_url, dest, budget);
      if ((await readFile(dest)).subarray(0, 4).toString('latin1') !== 'glTF') throw new Error('not a VRM');
      assets.push({ id: `${SRC}/vrm/${name.toLowerCase()}`, name: `${name} (VRM avatar)`, source: SRC, pack: '100Avatars R1', file: rel(dest), files: [rel(dest)], rig: 'vrm', tags: ['rigged', 'vrm', 'avatar', 'humanoid', 'character', 'mixamo bones', name.toLowerCase(), ...words.split(' ')], license: 'CC0-1.0', author: 'Polygonal Mind (100Avatars)', url: 'https://opensourceavatars.com' });
    } catch (error) {
      if (!error.budget) log(SRC, `skip VRM ${name}: ${error.message}`);
    }
  });
  return assets;
}

/* ---------------------------------------------------------------------- */
/* HDRIs from Poly Haven (CC0) — image-based light for characters           */
/* ---------------------------------------------------------------------- */

const HDRIS = ['studio_small_08', 'brown_photostudio_02', 'kloofendal_48d_partly_cloudy_puresky', 'meadow_2', 'spruit_sunrise', 'satara_night'];

async function hdris(budget) {
  const assets = [];
  for (const id of HDRIS) {
    try {
      const pick = (await getJson(`https://api.polyhaven.com/files/${id}`)).hdri?.['1k']?.hdr;
      if (!pick) continue;
      const dest = path.join(LIBRARY, SRC, 'hdri', path.basename(new URL(pick.url).pathname));
      await download(pick.url, dest, budget, pick.size);
      assets.push({ id: `${SRC}/hdri/${id}`, name: id.replace(/_/g, ' '), source: SRC, pack: 'Poly Haven HDRIs', kind: 'hdri', file: rel(dest), files: [rel(dest)], tags: ['hdri', 'environment', 'lighting', ...id.split('_')], license: 'CC0-1.0', author: 'Poly Haven', url: `https://polyhaven.com/a/${id}` });
    } catch (error) {
      if (!error.budget) log(SRC, `skip HDRI ${id}: ${error.message}`);
    }
  }
  return assets;
}

/** Each folder keeps its upstream licence file, plus a note where upstream states it in a README. */
const LICENSE_FILES = [
  ['mesh2motion/LICENSE-CC0.md', raw(M2M.repo, M2M.ref, 'LICENSE-CC0.MD')],
  ['mesh2motion/LICENSE-MIT.md', raw(M2M.repo, M2M.ref, 'LICENSE-MIT.MD')],
  ['gobkit/LICENSE', raw(GOBKIT.repo, GOBKIT.ref, 'LICENSE')],
  ['khronos/LICENSE.md', raw(KHRONOS.repo, KHRONOS.ref, 'Models/Fox/LICENSE.md')],
  ['kenney/platformer/LICENSE.md', raw('KenneyNL/Starter-Kit-3D-Platformer', '3fa8a04b1c01ab23db43123d4ce814a34c3fc7f0', 'LICENSE.md')],
  ['kenney/arena/License.txt', raw('KenneyNL/Starter-Kit-Basic-Scene', 'a6927e66ff8dd8e173660ce4825abe773c65f683', 'sample/Mini Arena/License.txt')],
  ['kenney/fps/LICENSE.md', raw('KenneyNL/Starter-Kit-FPS', '185fd2326d74a5cf858cffc616f87cf9696f9cc0', 'LICENSE.md')],
  ['vrm/LICENSE-registry', raw(OSA.repo, OSA.ref, 'LICENSE')]
];
const LICENSE_NOTES = {
  'threejs/LICENSE.txt': [
    'Fetched from the three.js examples (github.com/mrdoob/three.js, tag r170, examples/models/gltf).',
    'Parrot, Flamingo, Stork, Horse: by mirada for ro.me ("3 Dreams of Black"); the project source, models included, is published under the Apache License 2.0 (github.com/dataarts/3-dreams-of-black, README).',
    'Xbot: Adobe Mixamo character and animations. Mixamo terms allow use in games and projects; do not redistribute it as a standalone asset.'
  ],
  'vrm/LICENSE.txt': ['100Avatars R1 by Polygonal Mind: CC0 1.0 (licenseName "CC0" in each file\'s VRM meta; collection licence in github.com/ToxSam/open-source-avatars data/projects.json).'],
  'hdri/LICENSE.txt': ['HDRIs from Poly Haven (polyhaven.com): CC0 1.0.'],
  'kenney/LICENSE.txt': ['Kenney starter kits: code MIT, assets (models, textures) CC0 1.0, per each kit README.'],
  'mesh2motion/CREDITS.txt': [
    'Mesh2Motion (github.com/Mesh2Motion/mesh2motion-app): rigs, animations and most bodies CC0 1.0; app code MIT.',
    'Bodies with other licences (from the app\'s src/lib/RigConfig.ts): Sophia by Tysan Tan, CC BY-SA 4.0; Jay, Sintel and Bunny by Blender Studio, CC BY 4.0; Carrot the cat by David Revoy, CC BY 4.0.',
    'Human base body by Quaternius (CC0), zombie by Kenney (CC0), PSX bodies by elbolilloduro (CC0, elbolilloduro.itch.io/characters-psx).'
  ]
};

async function licences(budget) {
  for (const [file, url] of LICENSE_FILES) await download(url, path.join(LIBRARY, SRC, ...file.split('/')), budget).catch((e) => log(SRC, `licence ${file}: ${e.message}`));
  for (const [file, lines] of Object.entries(LICENSE_NOTES)) await writeFile(path.join(LIBRARY, SRC, ...file.split('/')), `${lines.join('\n\n')}\n`).catch(() => {});
  return [];
}

export async function rigged({ budget }) {
  const assets = [];
  for (const [label, step] of [['Mesh2Motion', mesh2motion], ['GitHub files', githubFiles], ['VRM avatars', vrmAvatars], ['HDRIs', hdris], ['licences', licences]]) {
    if (budget.exhausted) break;
    try {
      const got = await step(budget);
      assets.push(...got);
      log(SRC, `${label}: ${got.length}`);
    } catch (error) {
      if (error.budget) break;
      log(SRC, `skip ${label}: ${error.message}`);
    }
  }
  if (assets.length) await writeFile(path.join(LIBRARY, SRC, '.done'), String(RIGGED_VERSION));
  return assets;
}
