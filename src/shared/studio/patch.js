/**
 * The chat box's patch: what the LM model (or the offline keyword planner, planner.js) answers
 * for "add a snowy forest map with a frozen lake". A list of small operations on the game's
 * data. Nothing is written until the patch passes `validatePatch` AND the data it produces
 * passes `validateData` (spec.js). See docs/game-studio.md, "The chat patch".
 *
 *   { summary: "Added Frost Woods…", ops: [ { op, target, map, character, rules, style, sound, track, asset }, … ] }
 *
 * Every op has every field (strict JSON schema); the ones an op does not use are null.
 * In map/character/rules/style objects a null field means "leave as it is" (or the default,
 * for something new).
 */
import { S, check, lmSchema } from './schema.js';
import {
  ACCESSORIES, ASSET_ID, BASES, BEHAVIOURS, BIOMES, BODIES, COLLECTIBLES, DIFFICULTIES, FEATURES, GOALS, LIMITS, LOOKS, ANIMATIONS, RENDERS, ROLES,
  SFX_EVENTS, SIZES, SOUNDS, TIMES, WEATHERS, defaultCharacter, defaultMap, validateData, bodyColors
} from './spec.js';

export const OPS = ['addMap', 'updateMap', 'removeMap', 'addCharacter', 'updateCharacter', 'removeCharacter', 'setPlayer', 'setRules', 'setStyle', 'setMusic', 'setSfx', 'addSpawn', 'useAsset'];
export const MAX_OPS = 12;

const n = S.orNull;
const COLOR = S.str(7, { pattern: '^#[0-9a-fA-F]{6}$' });
const MAP_PATCH = S.obj({
  name: n(S.str(LIMITS.nameLength)),
  biome: n(S.oneOf(BIOMES)),
  size: n(S.oneOf(SIZES)),
  features: n(S.arr(S.oneOf(FEATURES), LIMITS.features)),
  weather: n(S.oneOf(WEATHERS)),
  time: n(S.oneOf(TIMES)),
  collectible: n(S.oneOf(COLLECTIBLES)),
  collectibles: n(S.int(0, LIMITS.collectibles)),
  story: n(S.str(LIMITS.textLength))
});
const CHARACTER_PATCH = S.obj({
  name: n(S.str(LIMITS.nameLength)),
  role: n(S.oneOf(ROLES)),
  base: n(S.oneOf(BASES)),
  body: n(S.oneOf(BODIES)),
  main: n(COLOR),
  second: n(COLOR),
  accent: n(COLOR),
  accessories: n(S.arr(S.oneOf(ACCESSORIES), LIMITS.accessories)),
  size: n(S.num(0.4, 3)),
  speed: n(S.num(0, 14)),
  health: n(S.int(1, 200)),
  damage: n(S.int(0, 5)),
  behaviour: n(S.oneOf(BEHAVIOURS)),
  line: n(S.str(160)),
  count: n(S.int(1, LIMITS.countPerSpawn))
});
const RULES_PATCH = S.obj({
  goal: n(S.oneOf(GOALS)),
  lives: n(S.int(1, 9)),
  timeLimit: n(S.int(0, 1800)),
  playerSpeed: n(S.num(1, 14)),
  jump: n(S.bool()),
  difficulty: n(S.oneOf(DIFFICULTIES)),
  intro: n(S.str(LIMITS.textLength))
});
const STYLE_PATCH = S.obj({
  render: n(S.oneOf(RENDERS)),
  animation: n(S.oneOf(ANIMATIONS)),
  look: n(S.oneOf(LOOKS)),
  palette: n(S.oneOf(['bright', 'pastel', 'earthy', 'moody', 'neon']))
});

export const OP_SCHEMA = S.obj({
  op: S.oneOf(OPS),
  /** A map id (map ops, addCharacter's map, addSpawn), a character id, or an sfx event. */
  target: n(S.str(48)),
  map: n(MAP_PATCH),
  character: n(CHARACTER_PATCH),
  rules: n(RULES_PATCH),
  style: n(STYLE_PATCH),
  sound: n(S.oneOf(SOUNDS)),
  track: n(S.str(40, { pattern: '^[a-z0-9][a-z0-9-]{0,39}$' })),
  asset: n(ASSET_ID)
});
export const PATCH_SCHEMA = S.obj({ summary: S.str(240), ops: S.arr(OP_SCHEMA, MAX_OPS) });
/** What the LM model is given (structure and enums; the validator keeps the limits). */
export const LM_PATCH_SCHEMA = lmSchema(PATCH_SCHEMA);

/** An op with every field present (the planner and tests write only what they need). */
export const op = (name, fields = {}) => ({ op: name, target: null, map: null, character: null, rules: null, style: null, sound: null, track: null, asset: null, ...fields });
/** A patch object field with every key present. */
export const fill = (schema, partial = {}) => Object.fromEntries(Object.keys(schema.properties).map((k) => [k, partial[k] ?? null]));
export const mapPatch = (partial) => fill(MAP_PATCH, partial);
export const characterPatch = (partial) => fill(CHARACTER_PATCH, partial);
export const rulesPatch = (partial) => fill(RULES_PATCH, partial);
export const stylePatch = (partial) => fill(STYLE_PATCH, partial);

/**
 * Check a raw patch (anything — the model's answer) against the schema and the game it is
 * for. `catalog` says which music tracks and assets exist ({ tracks: Set, asset(id) → ref|null }).
 * Returns { ok, patch, problems }.
 */
export function validatePatch(raw, data, catalog = {}) {
  const problems = check(PATCH_SCHEMA, raw, 'patch');
  if (problems.length) return { ok: false, patch: null, problems: problems.slice(0, 12) };
  const maps = data.maps.maps;
  const chars = data.cast.characters;
  const mapRef = (t) => resolveMap(maps, t);
  const charRef = (t) => resolveCharacter(chars, t);
  raw.ops.forEach((o, i) => {
    const at = `ops[${i}] ${o.op}`;
    const need = (field) => o[field] == null && problems.push(`${at}: needs ${field}`);
    switch (o.op) {
      case 'addMap':
        need('map');
        break;
      case 'updateMap':
        need('map');
        if (o.target != null && !mapRef(o.target)) problems.push(`${at}: no map "${o.target}"`);
        break;
      case 'removeMap':
        if (!mapRef(o.target)) problems.push(`${at}: no map "${o.target}"`);
        break;
      case 'addCharacter':
        need('character');
        if (o.target != null && !mapRef(o.target)) problems.push(`${at}: no map "${o.target}"`);
        break;
      case 'updateCharacter':
      case 'removeCharacter':
        if (!charRef(o.target)) problems.push(`${at}: no character "${o.target}"`);
        if (o.op === 'updateCharacter') need('character');
        break;
      case 'addSpawn':
        need('character');
        if (o.target != null && !mapRef(o.target)) problems.push(`${at}: no map "${o.target}"`);
        if (!charRef(o.character?.name ?? '')) problems.push(`${at}: character.name must name an existing character`);
        break;
      case 'setPlayer':
        need('character');
        break;
      case 'setRules':
        need('rules');
        break;
      case 'setStyle':
        need('style');
        break;
      case 'setMusic':
        need('track');
        if (o.track && o.track !== 'none' && catalog.tracks && !catalog.tracks.has(o.track)) problems.push(`${at}: no music "${o.track}"`);
        if (o.target != null && !mapRef(o.target)) problems.push(`${at}: no map "${o.target}"`);
        break;
      case 'setSfx':
        need('sound');
        if (!SFX_EVENTS.includes(o.target)) problems.push(`${at}: target must be one of ${SFX_EVENTS.join(', ')}`);
        break;
      case 'useAsset':
        need('asset');
        if (o.asset && catalog.asset && !catalog.asset(o.asset)) problems.push(`${at}: no free asset "${o.asset}" you may use`);
        // target: the map to put it in, or (a sound) the event it plays for.
        if (o.target != null && !mapRef(o.target) && !SFX_EVENTS.includes(o.target)) problems.push(`${at}: no map "${o.target}"`);
        break;
      default:
        problems.push(`${at}: unknown op`);
    }
  });
  return { ok: !problems.length, patch: problems.length ? null : raw, problems: problems.slice(0, 12) };
}

/** A map by id, by exact or partial name, by number ("2", "map 2"), or "last"/"first". */
export function resolveMap(maps, target) {
  if (target == null) return null;
  const t = String(target).toLowerCase().trim();
  if (!t) return null;
  if (t === 'last' || t === 'latest') return maps.at(-1) ?? null;
  if (t === 'first') return maps[0] ?? null;
  const num = /^(?:map|level)?\s*#?(\d{1,2})$/.exec(t);
  if (num) return maps[Number(num[1]) - 1] ?? null;
  return maps.find((m) => m.id === t) ?? maps.find((m) => m.name.toLowerCase() === t) ?? maps.find((m) => m.name.toLowerCase().includes(t)) ?? null;
}

/** A character by id or name, or the first of a role ("boss"). */
export function resolveCharacter(chars, target) {
  if (target == null) return null;
  const t = String(target).toLowerCase().trim();
  if (!t) return null;
  return chars.find((c) => c.id === t) ?? chars.find((c) => c.name.toLowerCase() === t) ?? chars.find((c) => c.role === t) ?? chars.find((c) => c.name.toLowerCase().includes(t)) ?? null;
}

const clone = (v) => JSON.parse(JSON.stringify(v));
const set = (obj, partial) => {
  const changed = [];
  for (const [k, v] of Object.entries(partial ?? {})) {
    if (v == null || !Object.hasOwn(obj, k)) continue;
    if (JSON.stringify(obj[k]) === JSON.stringify(v)) continue;
    changed.push([k, obj[k], v]);
    obj[k] = Array.isArray(v) ? [...v] : v;
  }
  return changed;
};
const show = (v) => (Array.isArray(v) ? (v.length ? v.join(', ') : 'none') : typeof v === 'number' ? String(Math.round(v * 100) / 100) : String(v));
const describe = (changed) => changed.map(([k, a, b]) => `${k} ${show(a)} → ${show(b)}`).join('; ');

/**
 * Apply a VALIDATED patch to a copy of the data. Returns
 *   { data, files: [changed data file keys], changes: [human lines for the chat], problems }
 * `problems` non-empty = refuse (the result broke a rule validateData knows).
 * `catalog.asset(id)` gives a free asset's reference for useAsset.
 */
export function applyPatch(data, patch, catalog = {}) {
  const next = clone(data);
  const files = new Set();
  const changes = [];
  const maps = next.maps.maps;
  const chars = next.cast.characters;
  const mapFor = (t) => (t == null ? maps.at(-1) : resolveMap(maps, t));
  const ensureAsset = (ref) => {
    if (next.assets.used.some((a) => a.id === ref.id)) return;
    const cut = (v, n) => (v == null ? null : String(v).slice(0, n));
    next.assets.used.push({ id: ref.id, kind: ref.kind === 'backdrop' ? 'backdrop' : ref.kind, name: cut(ref.name, 120), file: cut(ref.file, 400), licence: cut(ref.licence, 120), author: cut(ref.author, 120), url: cut(ref.url, 400), terms: ref.terms ?? null });
    files.add('assets');
    changes.push(`Credited ${ref.name} (${ref.licence}, ${ref.author})`);
  };
  const characterFields = (c) => {
    const out = { ...c };
    delete out.count;
    const colors = { main: c.main, second: c.second, accent: c.accent };
    delete out.main;
    delete out.second;
    delete out.accent;
    return { fields: out, colors };
  };

  for (const o of patch.ops) {
    switch (o.op) {
      case 'addMap': {
        if (maps.length >= LIMITS.maps) {
          changes.push(`Skipped: a game holds at most ${LIMITS.maps} maps`);
          break;
        }
        const m = defaultMap({ ...Object.fromEntries(Object.entries(o.map).filter(([, v]) => v != null)) }, maps.map((x) => x.id));
        maps.push(m);
        files.add('maps');
        changes.push(`Added map ${maps.length}: "${m.name}" (${m.biome}${m.features.length ? `, ${m.features.join(', ')}` : ''}${m.weather !== 'clear' ? `, ${m.weather}` : ''}${m.time !== 'day' ? `, ${m.time}` : ''})`);
        break;
      }
      case 'updateMap': {
        const m = mapFor(o.target);
        const changed = set(m, o.map);
        if (changed.length) {
          files.add('maps');
          changes.push(`Map "${m.name}": ${describe(changed)}`);
        }
        break;
      }
      case 'removeMap': {
        const m = resolveMap(maps, o.target);
        if (maps.length <= 1) {
          changes.push('Kept the last map: a game needs one');
          break;
        }
        maps.splice(maps.indexOf(m), 1);
        files.add('maps');
        changes.push(`Removed map "${m.name}"`);
        break;
      }
      case 'addCharacter': {
        if (chars.length >= LIMITS.characters) {
          changes.push(`Skipped: a game holds at most ${LIMITS.characters} characters`);
          break;
        }
        const { fields, colors } = characterFields(o.character);
        const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null));
        const c = defaultCharacter(clean, ['player', ...chars.map((x) => x.id)]);
        if (colors.main || colors.second || colors.accent) c.colors = { ...bodyColors(c.body), ...Object.fromEntries(Object.entries(colors).filter(([, v]) => v)) };
        chars.push(c);
        files.add('cast');
        let where = '';
        if (c.role !== 'ally' || o.target != null) {
          const m = mapFor(o.target);
          const count = o.character.count ?? (c.role === 'boss' || c.role === 'npc' ? 1 : 3);
          if (m && m.spawns.length < LIMITS.spawnsPerMap) {
            m.spawns.push({ cast: c.id, count });
            files.add('maps');
            where = ` — ${count} in "${m.name}"`;
          }
        }
        changes.push(`Added ${c.role} "${c.name}" (${c.body}, speed ${c.speed}, health ${c.health})${where}`);
        break;
      }
      case 'addSpawn': {
        const c = resolveCharacter(chars, o.character.name);
        const m = mapFor(o.target);
        const count = o.character.count ?? 1;
        const existing = m.spawns.find((s) => s.cast === c.id);
        if (existing) existing.count = Math.min(LIMITS.countPerSpawn, existing.count + count);
        else if (m.spawns.length < LIMITS.spawnsPerMap) m.spawns.push({ cast: c.id, count });
        else break;
        files.add('maps');
        changes.push(`${count} more "${c.name}" in "${m.name}"`);
        break;
      }
      case 'updateCharacter': {
        const c = resolveCharacter(chars, o.target);
        const { fields, colors } = characterFields(o.character);
        const changed = set(c, fields);
        const colorChanged = set(c.colors, colors);
        if (changed.length || colorChanged.length) {
          files.add('cast');
          changes.push(`${c.role[0].toUpperCase()}${c.role.slice(1)} "${c.name}": ${describe([...changed, ...colorChanged])}`);
        }
        if (o.character.count != null) {
          for (const m of maps) for (const s of m.spawns) if (s.cast === c.id && s.count !== o.character.count) {
            s.count = o.character.count;
            files.add('maps');
          }
        }
        break;
      }
      case 'removeCharacter': {
        const c = resolveCharacter(chars, o.target);
        chars.splice(chars.indexOf(c), 1);
        for (const m of maps) m.spawns = m.spawns.filter((s) => s.cast !== c.id);
        files.add('cast');
        files.add('maps');
        changes.push(`Removed "${c.name}"`);
        break;
      }
      case 'setPlayer': {
        const { fields, colors } = characterFields(o.character);
        delete fields.role;
        const changed = [...set(next.cast.player, fields), ...set(next.cast.player.colors, colors)];
        if (changed.length) {
          files.add('cast');
          changes.push(`Player: ${describe(changed)}`);
        }
        break;
      }
      case 'setRules': {
        const changed = set(next.rules, o.rules);
        if (changed.length) {
          files.add('rules');
          changes.push(`Rules: ${describe(changed)}`);
        }
        break;
      }
      case 'setStyle': {
        const changed = set(next.style, o.style);
        if (changed.length) {
          files.add('style');
          changes.push(`Style: ${describe(changed)}`);
        }
        break;
      }
      case 'setMusic': {
        if (o.target != null) {
          const m = resolveMap(maps, o.target);
          if (m.music !== o.track) {
            changes.push(`Music in "${m.name}": ${m.music ?? 'game music'} → ${o.track}`);
            m.music = o.track;
            files.add('maps');
          }
        } else if (next.audio.music !== o.track) {
          changes.push(`Music: ${next.audio.music} → ${o.track}`);
          next.audio.music = o.track;
          files.add('audio');
        }
        break;
      }
      case 'setSfx': {
        if (next.audio.sfx[o.target] !== o.sound) {
          changes.push(`Sound for ${o.target}: ${next.audio.sfx[o.target]} → ${o.sound}`);
          next.audio.sfx[o.target] = o.sound;
          files.add('audio');
        }
        break;
      }
      case 'useAsset': {
        const ref = catalog.asset?.(o.asset);
        if (!ref) break;
        if (ref.kind === 'music') {
          const track = ref.id.slice('bgm:'.length);
          if (o.target != null && resolveMap(maps, o.target)) {
            const m = resolveMap(maps, o.target);
            m.music = track;
            files.add('maps');
            changes.push(`Music in "${m.name}": ${ref.name}`);
          } else {
            next.audio.music = track;
            files.add('audio');
            changes.push(`Music: ${ref.name}`);
          }
          break;
        }
        if (ref.kind === 'sfx') {
          const sound = ref.id.slice('sfx:'.length);
          const event = SFX_EVENTS.includes(o.target ?? '') ? o.target : ref.event ?? 'coin';
          next.audio.sfx[event] = sound;
          files.add('audio');
          changes.push(`Sound for ${event}: ${ref.name}`);
          break;
        }
        if (ref.kind === 'character') {
          if (chars.length >= LIMITS.characters) {
            changes.push(`Skipped: a game holds at most ${LIMITS.characters} characters`);
            break;
          }
          ensureAsset(ref);
          const base = ref.character ?? { name: ref.name, role: 'npc', body: 'kid' };
          const c = defaultCharacter({ ...base, name: String(base.name ?? ref.name).slice(0, LIMITS.nameLength), role: o.character?.role ?? base.role ?? 'npc' }, ['player', ...chars.map((x) => x.id)]);
          if (ref.file) c.model = ref.id;
          chars.push(c);
          files.add('cast');
          const m = mapFor(o.target);
          if (m && m.spawns.length < LIMITS.spawnsPerMap) {
            m.spawns.push({ cast: c.id, count: o.character?.count ?? 1 });
            files.add('maps');
            changes.push(`Added "${c.name}" to "${m.name}"`);
          } else changes.push(`Added "${c.name}" to the cast`);
          break;
        }
        const m = mapFor(o.target);
        if (ref.kind === 'backdrop') {
          if (ref.biome && m.biome !== ref.biome) {
            m.biome = ref.biome;
            files.add('maps');
            changes.push(`Map "${m.name}" is now ${ref.name}`);
          }
          break;
        }
        ensureAsset(ref);
        if (ref.kind === 'texture') {
          m.ground = ref.id;
          files.add('maps');
          changes.push(`Map "${m.name}" uses the ground ${ref.name}`);
        } else {
          const existing = m.props.find((p) => p.asset === ref.id);
          if (existing) existing.count = Math.min(20, existing.count + 3);
          else if (m.props.length < LIMITS.props) m.props.push({ asset: ref.id, count: 4 });
          files.add('maps');
          changes.push(`Placed ${ref.name} in "${m.name}"`);
        }
        break;
      }
      default:
        break;
    }
  }
  // Characters nobody spawns stay in the cast (the maker may add them to a map later).
  const problems = files.size ? validateData(next) : [];
  return { data: next, files: [...files], changes, problems };
}

/** One-line summary for a commit message. */
export function commitLine(summary, changes) {
  const text = String(summary || changes[0] || 'Studio change').replace(/\s+/g, ' ').trim();
  return text.length > 72 ? `${text.slice(0, 69)}…` : text;
}
