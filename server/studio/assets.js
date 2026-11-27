/**
 * The Studio's free asset browser: only what anyone may use in a game they share, each with
 * its licence and credit (docs/game-studio.md, "Assets and licences").
 *
 *   character    our own character presets (plush, pixel, toon) — Gamory originals, CC0
 *   model        3D models from the downloaded library (library/catalog.json): CC0, CC BY 4.0
 *                (credit added automatically), MIT/Apache-2.0 — never "free to use but not to
 *                redistribute", share-alike, or anything without a stated free licence
 *   background   biome backdrops (ours) and ground textures (ambientCG, CC0)
 *   sfx          our synthesized sound effects (CC0)
 *   music        the platform's generated music (public/audio/bgm, ACE-Step 1.5, MIT)
 *
 * Ids: own:character/<preset> · own:backdrop/<biome> · lib:model/<id> · lib:texture/<id> ·
 * sfx:<sound> · bgm:<track>. Players' own saved characters (chr:) and store items (mkt:) are
 * resolved by server/studio/index.js, which knows who owns what.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ASSET_ID, BIOMES, SFX_EVENTS, biomeName, bodyColors } from '../../src/shared/studio/spec.js';
import { SOUND_INFO } from '../../src/shared/studio/sfx.js';

/** Licences we accept, and how a credit line names them. */
export const FREE_LICENCES = {
  'CC0-1.0': { label: 'CC0 (public domain)', credit: false },
  'CC-BY-4.0': { label: 'CC BY 4.0 (credit given)', credit: true },
  MIT: { label: 'MIT', credit: true },
  'Apache-2.0': { label: 'Apache 2.0', credit: true }
};
export const isFreeLicence = (licence) => Object.hasOwn(FREE_LICENCES, String(licence ?? ''));
const ID_RE = new RegExp(ASSET_ID.pattern);

export const CHARACTER_PRESETS = [
  { key: 'plush-bunny', name: 'Plush Bunny', base: 'plush', body: 'bunny', accessories: ['scarf'] },
  { key: 'plush-bear', name: 'Teddy', base: 'plush', body: 'bear', accessories: ['bow'] },
  { key: 'plush-penguin', name: 'Puffin Penguin', base: 'plush', body: 'penguin', accessories: ['hat'] },
  { key: 'plush-frog', name: 'Hoppy Frog', base: 'plush', body: 'frog', accessories: [] },
  { key: 'pixel-knight', name: 'Pixel Knight', base: 'pixel', body: 'knight', accessories: ['sword', 'shield'] },
  { key: 'pixel-mage', name: 'Pixel Mage', base: 'pixel', body: 'mage', accessories: ['staff'] },
  { key: 'pixel-slime', name: 'Pixel Slime', base: 'pixel', body: 'slime', accessories: [], role: 'enemy' },
  { key: 'pixel-ghost', name: 'Pixel Ghost', base: 'pixel', body: 'ghost', accessories: [], role: 'enemy' },
  { key: 'toon-fox', name: 'Toon Fox', base: 'toon', body: 'fox', accessories: ['backpack'] },
  { key: 'toon-robot', name: 'Toon Robot', base: 'toon', body: 'robot', accessories: [], role: 'enemy' },
  { key: 'toon-dino', name: 'Toon Dino', base: 'toon', body: 'dino', accessories: ['crown'], role: 'boss' },
  { key: 'toon-kid', name: 'Toon Kid', base: 'toon', body: 'kid', accessories: ['glasses'] }
];

const OWN = { licence: 'CC0 (Gamory original)', author: 'Gamory', url: null };

/**
 * @param {{ libraryRoot: string, publicDir: string }} options
 */
export function createAssetCatalog({ libraryRoot, publicDir }) {
  let library = null;
  let libraryStamp = 0;
  let bgm = null;
  const loadLibrary = () => {
    const file = join(libraryRoot, 'catalog.json');
    try {
      const stamp = statSync(file).mtimeMs;
      if (library && stamp === libraryStamp) return library;
      const c = JSON.parse(readFileSync(file, 'utf8'));
      libraryStamp = stamp;
      const models = (c.models ?? [])
        .filter((m) => isFreeLicence(m.license) && m.file && /\.(glb|gltf)$/i.test(m.file) && ID_RE.test(`lib:model/${m.id}`))
        .map((m) => ({
          id: `lib:model/${m.id}`,
          kind: ['character', 'creature'].includes(m.category) ? 'character' : 'model',
          name: String(m.name ?? m.id).replace(/[-_]+/g, ' ').slice(0, 80),
          category: m.category,
          tags: [...(m.tags ?? []), ...(m.themes ?? []), m.category].filter(Boolean).slice(0, 14),
          file: m.file,
          licence: m.license,
          author: m.author ?? m.source ?? 'unknown',
          url: m.url ?? null,
          animated: Boolean(m.animations?.length),
          triangles: m.triangles ?? 0
        }));
      const textures = (c.materials ?? [])
        .filter((t) => isFreeLicence(t.license) && t.maps?.color && ID_RE.test(`lib:texture/${t.id}`))
        .map((t) => ({ id: `lib:texture/${t.id}`, kind: 'texture', name: t.name, tags: t.tags ?? [], file: t.maps.color, licence: t.license, author: t.source === 'ambientcg' ? 'ambientCG' : t.source ?? 'unknown', url: t.source === 'ambientcg' ? 'https://ambientcg.com' : null }));
      library = { models, textures };
    } catch {
      library = { models: [], textures: [] };
    }
    return library;
  };
  const loadBgm = () => {
    if (bgm) return bgm;
    try {
      const m = JSON.parse(readFileSync(join(publicDir, 'audio', 'bgm', 'manifest.json'), 'utf8'));
      bgm = (m.tracks ?? []).filter((t) => /^[a-z0-9][a-z0-9-]{0,39}$/.test(t.id)).map((t) => ({ id: t.id, title: t.title, mood: t.mood, tags: t.tags ?? [], kind: t.kind, file: t.file, duration: t.duration }));
    } catch {
      bgm = [];
    }
    return bgm;
  };

  const characters = () =>
    CHARACTER_PRESETS.map((p) => ({
      id: `own:character/${p.key}`,
      kind: 'character',
      name: p.name,
      tags: [p.base, p.body, ...(p.role ? [p.role] : [])],
      file: null,
      ...OWN,
      character: { name: p.name, role: p.role ?? 'npc', base: p.base, body: p.body, colors: bodyColors(p.body), accessories: p.accessories }
    }));
  const backdrops = () => BIOMES.map((b) => ({ id: `own:backdrop/${b}`, kind: 'backdrop', name: `${biomeName(b)} (${b})`, tags: [b, 'biome'], file: null, biome: b, ...OWN }));
  const sounds = () =>
    Object.entries(SOUND_INFO)
      .filter(([id]) => id !== 'none')
      .map(([id, s]) => ({ id: `sfx:${id}`, kind: 'sfx', name: s.name, tags: [s.event ?? 'sound'], file: null, event: SFX_EVENTS.includes(s.event) ? s.event : 'coin', licence: 'CC0 (Gamory original, synthesized)', author: 'Gamory', url: null }));
  const music = () =>
    loadBgm().map((t) => ({ id: `bgm:${t.id}`, kind: 'music', name: t.title ?? t.id, tags: [t.mood, ...t.tags].filter(Boolean), file: `audio/bgm/${t.file}`, licence: 'MIT', author: 'Generated with ACE-Step 1.5', url: 'https://github.com/ace-step/ACE-Step-1.5', loop: t.kind !== 'stinger' }));

  /** Everything of one browser tab. */
  const ofKind = (kind) => {
    switch (kind) {
      case 'character': return [...characters(), ...loadLibrary().models.filter((m) => m.kind === 'character')];
      case 'model': return loadLibrary().models.filter((m) => m.kind === 'model');
      case 'background': return [...backdrops(), ...loadLibrary().textures];
      case 'sfx': return sounds();
      case 'music': return music();
      default: return [];
    }
  };

  return {
    KINDS: ['character', 'model', 'background', 'sfx', 'music'],
    libraryInstalled: () => existsSync(join(libraryRoot, 'catalog.json')),
    tracks: () => loadBgm(),
    /** One tab, searched and paged: { items, total }. */
    list({ kind = 'character', q = '', tag = '', offset = 0, limit = 48 } = {}) {
      const words = String(q ?? '').toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
      const t = String(tag ?? '').toLowerCase();
      const all = ofKind(kind).filter((a) => {
        const hay = `${a.name} ${(a.tags ?? []).join(' ')} ${a.author}`.toLowerCase();
        return words.every((w) => hay.includes(w)) && (!t || (a.tags ?? []).some((x) => String(x).toLowerCase() === t));
      });
      const start = Math.max(0, Number(offset) || 0);
      const n = Math.max(1, Math.min(96, Number(limit) || 48));
      return { items: all.slice(start, start + n).map((a) => ({ ...a, licenceLabel: FREE_LICENCES[a.licence]?.label ?? a.licence })), total: all.length };
    },
    /** A free asset's reference by id (what goes into assets.json), or null. */
    get(id) {
      const s = String(id ?? '');
      if (!ID_RE.test(s)) return null;
      if (s.startsWith('own:character/')) return characters().find((a) => a.id === s) ?? null;
      if (s.startsWith('own:backdrop/')) return backdrops().find((a) => a.id === s) ?? null;
      if (s.startsWith('sfx:')) return sounds().find((a) => a.id === s) ?? null;
      if (s.startsWith('bgm:')) return music().find((a) => a.id === s) ?? null;
      if (s.startsWith('lib:model/')) return loadLibrary().models.find((a) => a.id === s) ?? null;
      if (s.startsWith('lib:texture/')) return loadLibrary().textures.find((a) => a.id === s) ?? null;
      return null;
    }
  };
}
