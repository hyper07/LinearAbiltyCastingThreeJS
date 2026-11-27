/**
 * A Game Studio game as DATA (docs/game-studio.md). The game's package folder holds six JSON
 * files under data/, and the shared runtime (src/shared/studio/runtime.js) plays them:
 *
 *   data/style.json   how it looks: render (2D, 3D, HD-2D, 3D on a painted backdrop), animation, look
 *   data/rules.json   genre, goal, lives, speeds, difficulty, time limit
 *   data/maps.json    the maps in order — the game grows map by map ("add a map" appends one)
 *   data/cast.json    the player and every other character (enemies, bosses, helpers)
 *   data/audio.json   the music and which sound plays for each event
 *   data/assets.json  every outside asset the game uses, with licence and credit (shown in game)
 *
 * The chat box never writes these directly: it produces a patch (patch.js), which is checked
 * against the schemas here before anything is written. Pure: no DOM, no three.js — the
 * server, the runtime and the tests import it.
 */
import { S, check } from './schema.js';

export const SPEC_VERSION = 1;

/* ---------------------------------------------------------------- choices */

/** How it is drawn. */
export const RENDERS = ['flat2d', 'full3d', 'hd2d', 'painted'];
/** How characters move. */
export const ANIMATIONS = ['pixel', 'skeletal', 'toon', 'plush'];
/** How surfaces are lit and shaded. */
export const LOOKS = ['realistic', 'stylized', 'cartoon'];
export const BIOMES = ['meadow', 'forest', 'snow', 'desert', 'beach', 'cave', 'castle', 'lava', 'city', 'space', 'swamp', 'candy'];
export const FEATURES = ['lake', 'frozen-lake', 'river', 'hills', 'trees', 'rocks', 'ruins', 'flowers', 'bridge', 'village', 'crystals', 'mushrooms', 'cactus', 'snowmen', 'lava-pools', 'towers'];
export const WEATHERS = ['clear', 'rain', 'snow', 'fog', 'leaves', 'embers'];
export const TIMES = ['day', 'dawn', 'sunset', 'night'];
export const SIZES = ['small', 'medium', 'large'];
export const GOALS = ['collect', 'defeat', 'boss', 'reach', 'survive', 'explore'];
export const DIFFICULTIES = ['easy', 'normal', 'hard'];
export const COLLECTIBLES = ['coin', 'gem', 'star', 'orb', 'flower', 'key', 'fish', 'snowflake'];
export const ROLES = ['enemy', 'boss', 'npc', 'ally'];
export const BEHAVIOURS = ['wander', 'chase', 'guard', 'patrol', 'flee', 'idle'];
/** A character's base kit: plush (soft toy), pixel (sprite), toon (3D cartoon); auto = follow the game's style. */
export const BASES = ['auto', 'plush', 'pixel', 'toon'];
export const BODIES = ['bunny', 'bear', 'cat', 'fox', 'penguin', 'frog', 'bird', 'dino', 'kid', 'knight', 'mage', 'robot', 'slime', 'ghost', 'blob'];
export const ACCESSORIES = ['hat', 'crown', 'scarf', 'cape', 'backpack', 'glasses', 'bow', 'horns', 'wings', 'sword', 'staff', 'shield'];
/** Events a game makes a sound for. */
export const SFX_EVENTS = ['coin', 'jump', 'attack', 'hit', 'hurt', 'win', 'lose', 'door', 'powerup', 'step', 'splash'];
/** Our own synthesized sounds (src/shared/studio/sfx.js plays them; Gamory original, CC0). */
export const SOUNDS = ['chime', 'coin-bright', 'blip', 'sparkle', 'pop', 'boing', 'swoosh', 'thud', 'zap', 'bell', 'fanfare', 'sad-horn', 'splash', 'crunch', 'click', 'whoosh', 'none'];
/** The default sound for each event. */
export const DEFAULT_SFX = { coin: 'coin-bright', jump: 'boing', attack: 'swoosh', hit: 'thud', hurt: 'crunch', win: 'fanfare', lose: 'sad-horn', door: 'bell', powerup: 'sparkle', step: 'none', splash: 'splash' };

/** Hard caps: what one game may hold. */
export const LIMITS = { maps: 30, characters: 40, spawnsPerMap: 8, countPerSpawn: 30, collectibles: 60, props: 12, assets: 200, features: 8, accessories: 3, nameLength: 40, textLength: 240, bytes: 512 * 1024 };

/* ---------------------------------------------------------------- schemas */

const ID = S.str(48, { pattern: '^[a-z0-9][a-z0-9-]{0,47}$' });
const COLOR = S.str(7, { pattern: '^#[0-9a-fA-F]{6}$' });
/** A music track id from public/audio/bgm/manifest.json, or 'none'. */
const TRACK = S.str(40, { pattern: '^[a-z0-9][a-z0-9-]{0,39}$' });
/** An asset id: lib:<…> (the 3D library), mkt:<…> (a store listing), chr:<…> (a saved character), own:<…> (ours). */
export const ASSET_ID = S.str(220, { pattern: '^(lib|mkt|chr|own|bgm|sfx):[A-Za-z0-9 _./()\\[\\]+-]{1,212}$' });

export const STYLE_SCHEMA = S.obj({
  version: S.int(1, 1),
  render: S.oneOf(RENDERS),
  animation: S.oneOf(ANIMATIONS),
  look: S.oneOf(LOOKS),
  palette: S.oneOf(['bright', 'pastel', 'earthy', 'moody', 'neon'])
});

export const RULES_SCHEMA = S.obj({
  genre: S.str(32, { pattern: '^[a-z0-9-]{1,32}$' }),
  goal: S.oneOf(GOALS),
  lives: S.int(1, 9),
  timeLimit: S.int(0, 1800),
  playerSpeed: S.num(1, 14),
  jump: S.bool(),
  difficulty: S.oneOf(DIFFICULTIES),
  intro: S.str(LIMITS.textLength)
});

export const SPAWN_SCHEMA = S.obj({ cast: ID, count: S.int(1, LIMITS.countPerSpawn) });
export const PROP_SCHEMA = S.obj({ asset: ASSET_ID, count: S.int(1, 20) });

export const MAP_SCHEMA = S.obj({
  id: ID,
  name: S.str(LIMITS.nameLength),
  biome: S.oneOf(BIOMES),
  size: S.oneOf(SIZES),
  features: S.arr(S.oneOf(FEATURES), LIMITS.features),
  weather: S.oneOf(WEATHERS),
  time: S.oneOf(TIMES),
  collectible: S.oneOf(COLLECTIBLES),
  collectibles: S.int(0, LIMITS.collectibles),
  spawns: S.arr(SPAWN_SCHEMA, LIMITS.spawnsPerMap),
  props: S.arr(PROP_SCHEMA, LIMITS.props),
  music: S.orNull(TRACK),
  ground: S.orNull(ASSET_ID),
  story: S.str(LIMITS.textLength)
});

export const CHARACTER_SCHEMA = S.obj({
  id: ID,
  name: S.str(LIMITS.nameLength),
  role: S.oneOf(ROLES),
  base: S.oneOf(BASES),
  body: S.oneOf(BODIES),
  colors: S.obj({ main: COLOR, second: COLOR, accent: COLOR }),
  accessories: S.arr(S.oneOf(ACCESSORIES), LIMITS.accessories),
  size: S.num(0.4, 3),
  speed: S.num(0, 14),
  health: S.int(1, 200),
  damage: S.int(0, 5),
  behaviour: S.oneOf(BEHAVIOURS),
  line: S.str(160),
  model: S.orNull(ASSET_ID)
});

export const CAST_SCHEMA = S.obj({ player: CHARACTER_SCHEMA, characters: S.arr(CHARACTER_SCHEMA, LIMITS.characters) });
export const AUDIO_SCHEMA = S.obj({
  music: TRACK,
  sfx: S.obj(Object.fromEntries(SFX_EVENTS.map((e) => [e, S.oneOf(SOUNDS)])))
});

export const ASSET_REF_SCHEMA = S.obj({
  id: ASSET_ID,
  kind: S.oneOf(['model', 'character', 'texture', 'hdri', 'music', 'sfx', 'backdrop']),
  name: S.str(120),
  file: S.orNull(S.str(400)),
  licence: S.str(120),
  author: S.str(120),
  url: S.orNull(S.str(400)),
  /** A store listing's licence (mkt:): what the buyer may do with it. */
  terms: S.orNull(S.oneOf(['free-credit', 'standard', 'class-only']))
});
export const ASSETS_SCHEMA = S.obj({ used: S.arr(ASSET_REF_SCHEMA, LIMITS.assets) });

/** The data files, in the order they are written. File = `data/<key>.json`. */
export const DATA_FILES = { style: STYLE_SCHEMA, rules: RULES_SCHEMA, maps: S.obj({ maps: S.arr(MAP_SCHEMA, LIMITS.maps) }), cast: CAST_SCHEMA, audio: AUDIO_SCHEMA, assets: ASSETS_SCHEMA };
export const DATA_KEYS = Object.keys(DATA_FILES);

/* --------------------------------------------------------------- defaults */

export const slugId = (text, fallback = 'item') =>
  String(text ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '') || fallback;

/** An id not in `taken` (adds -2, -3…). */
export function uniqueId(base, taken) {
  const set = taken instanceof Set ? taken : new Set(taken);
  const root = slugId(base).slice(0, 44);
  if (!set.has(root)) return root;
  for (let i = 2; i < 1000; i++) if (!set.has(`${root}-${i}`)) return `${root}-${i}`;
  throw new Error('no free id');
}

const BIOME_NAMES = { meadow: 'Green Meadow', forest: 'Whisper Woods', snow: 'Snowy Hollow', desert: 'Sunny Dunes', beach: 'Shell Beach', cave: 'Glow Cave', castle: 'Old Castle', lava: 'Ember Peak', city: 'Toy Town', space: 'Star Base', swamp: 'Misty Bog', candy: 'Candy Hills' };
export const biomeName = (biome) => BIOME_NAMES[biome] ?? 'New Land';
/** Features that suit a biome when a map is added without any. */
export const BIOME_FEATURES = {
  meadow: ['flowers', 'trees', 'hills'], forest: ['trees', 'mushrooms', 'rocks'], snow: ['trees', 'snowmen', 'frozen-lake'], desert: ['cactus', 'rocks', 'ruins'],
  beach: ['lake', 'rocks', 'trees'], cave: ['crystals', 'rocks', 'mushrooms'], castle: ['towers', 'ruins', 'rocks'], lava: ['lava-pools', 'rocks', 'crystals'],
  city: ['village', 'trees', 'bridge'], space: ['crystals', 'rocks', 'towers'], swamp: ['lake', 'mushrooms', 'trees'], candy: ['flowers', 'hills', 'crystals']
};
const BIOME_COLLECTIBLE = { meadow: 'flower', forest: 'coin', snow: 'snowflake', desert: 'gem', beach: 'fish', cave: 'gem', castle: 'key', lava: 'orb', city: 'coin', space: 'star', swamp: 'orb', candy: 'star' };
export const biomeCollectible = (biome) => BIOME_COLLECTIBLE[biome] ?? 'coin';

export function defaultMap(over = {}, taken = []) {
  const biome = BIOMES.includes(over.biome) ? over.biome : 'meadow';
  const name = over.name || biomeName(biome);
  return {
    id: uniqueId(over.id || name, taken),
    name,
    biome,
    size: 'medium',
    features: BIOME_FEATURES[biome].slice(),
    weather: biome === 'snow' ? 'snow' : 'clear',
    time: 'day',
    collectible: biomeCollectible(biome),
    collectibles: 8,
    spawns: [],
    props: [],
    music: null,
    ground: null,
    story: '',
    ...Object.fromEntries(Object.entries(over).filter(([k, v]) => k !== 'id' && k !== 'name' && v != null))
  };
}

const BODY_COLORS = {
  bunny: ['#f7c6d9', '#ffffff', '#ff7aa8'], bear: ['#b07a4f', '#f0d2b0', '#5a3a22'], cat: ['#f2a65a', '#fff1dc', '#7a4a2a'], fox: ['#ef7f3a', '#ffffff', '#3a2a22'],
  penguin: ['#2c3448', '#ffffff', '#ffb347'], frog: ['#7cc86a', '#e8f7c8', '#2f6b3a'], bird: ['#6ab7ff', '#fff4c2', '#ff9f43'], dino: ['#8bd17c', '#f7e48a', '#3c7a4a'],
  kid: ['#ffd2b0', '#4a7dd8', '#e8483e'], knight: ['#9aa7b8', '#4a5d8a', '#f0c040'], mage: ['#7a5ad8', '#f2c09c', '#ffd84a'], robot: ['#b8c4d0', '#4ab0e8', '#ff6a5a'],
  slime: ['#6ad88a', '#c8ffd8', '#2a7a4a'], ghost: ['#e8ecff', '#b8c0f0', '#4a4a7a'], blob: ['#c87ae8', '#f0c8ff', '#5a2a7a']
};
export const bodyColors = (body) => {
  const [main, second, accent] = BODY_COLORS[body] ?? BODY_COLORS.bunny;
  return { main, second, accent };
};

const ROLE_STATS = {
  enemy: { speed: 2.6, health: 2, damage: 1, behaviour: 'wander', size: 0.9 },
  boss: { speed: 2.2, health: 12, damage: 2, behaviour: 'chase', size: 2 },
  npc: { speed: 1, health: 3, damage: 0, behaviour: 'idle', size: 1 },
  ally: { speed: 3, health: 5, damage: 0, behaviour: 'wander', size: 1 }
};

export function defaultCharacter(over = {}, taken = []) {
  const role = ROLES.includes(over.role) ? over.role : 'enemy';
  const body = BODIES.includes(over.body) ? over.body : role === 'boss' ? 'dino' : role === 'npc' ? 'kid' : 'slime';
  const name = over.name || `${body[0].toUpperCase()}${body.slice(1)}`;
  const stats = ROLE_STATS[role];
  return {
    id: uniqueId(over.id || name, taken),
    name,
    role,
    base: 'auto',
    body,
    colors: bodyColors(body),
    accessories: role === 'boss' ? ['crown'] : [],
    size: stats.size,
    speed: stats.speed,
    health: stats.health,
    damage: stats.damage,
    behaviour: stats.behaviour,
    line: role === 'npc' ? 'Hello! Find everything shiny and the way on opens.' : '',
    model: null,
    ...Object.fromEntries(Object.entries(over).filter(([k, v]) => k !== 'id' && k !== 'name' && v != null))
  };
}

/** What each starter (the Game builder's genres, plus a collect-a-thon) begins with. */
export const STARTERS = {
  collect: { name: 'Collect-a-thon', goal: 'collect', biome: 'meadow', enemies: 0 },
  survival: { name: 'Wave survival', goal: 'survive', biome: 'castle', enemies: 2, timeLimit: 90 },
  'boss-hunt': { name: 'Boss hunt', goal: 'boss', biome: 'lava', enemies: 1, boss: true },
  'monster-hunt': { name: 'Monster hunt', goal: 'defeat', biome: 'forest', enemies: 2 },
  quest: { name: 'Story quest', goal: 'reach', biome: 'meadow', enemies: 1, npc: true },
  'dungeon-crawl': { name: 'Dungeon crawl', goal: 'defeat', biome: 'cave', enemies: 2 },
  'battle-royale': { name: 'Battle royale', goal: 'defeat', biome: 'desert', enemies: 3 },
  'squad-royale': { name: 'Squad royale', goal: 'defeat', biome: 'city', enemies: 3 },
  study: { name: 'Study adventure', goal: 'explore', biome: 'forest', enemies: 0, npc: true },
  'calm-study': { name: 'Calm learning', goal: 'collect', biome: 'beach', enemies: 0, npc: true }
};
export const STARTER_IDS = Object.keys(STARTERS);

/** The style a starter gets when the maker picked nothing. */
export const DEFAULT_STYLE = { version: 1, render: 'full3d', animation: 'plush', look: 'cartoon', palette: 'bright' };

/** Style choices, cleaned (unknown values fall back to the defaults). */
export function normalizeStyle(style = {}) {
  return {
    version: 1,
    render: RENDERS.includes(style.render) ? style.render : DEFAULT_STYLE.render,
    animation: ANIMATIONS.includes(style.animation) ? style.animation : DEFAULT_STYLE.animation,
    look: LOOKS.includes(style.look) ? style.look : DEFAULT_STYLE.look,
    palette: ['bright', 'pastel', 'earthy', 'moody', 'neon'].includes(style.palette) ? style.palette : 'bright'
  };
}

/**
 * A complete new game's data from the Studio's choices — the template's parameters
 * (server/gameTemplates.js): 4 renders × 4 animations × 3 looks × the starters, as values.
 */
export function starterData({ title = 'My Game', render, animation, look, palette, genre = 'collect', player = null } = {}) {
  const starter = STARTERS[genre] ?? STARTERS.collect;
  const style = normalizeStyle({ render, animation, look, palette });
  const playerChar = defaultCharacter({ id: 'player', name: 'Hero', role: 'ally', body: 'bunny', behaviour: 'idle', speed: 6, health: 5, line: '', ...(player ?? {}) });
  playerChar.id = 'player';
  const characters = [];
  const taken = new Set(['player']);
  const add = (over) => {
    const c = defaultCharacter(over, taken);
    taken.add(c.id);
    characters.push(c);
    return c;
  };
  const foe = starter.enemies ? add({ role: 'enemy', body: starter.goal === 'defeat' ? 'ghost' : 'slime' }) : null;
  const boss = starter.boss ? add({ role: 'boss', name: 'Grumble King', body: 'dino' }) : null;
  const npc = starter.npc ? add({ role: 'npc', name: 'Guide', body: 'bear', line: 'Welcome! Explore and find the glowing door.' }) : null;
  const first = defaultMap({ biome: starter.biome });
  first.spawns = [
    ...(foe ? [{ cast: foe.id, count: 2 + starter.enemies }] : []),
    ...(boss ? [{ cast: boss.id, count: 1 }] : []),
    ...(npc ? [{ cast: npc.id, count: 1 }] : [])
  ];
  if (starter.goal === 'boss' || starter.goal === 'defeat') first.collectibles = 4;
  return {
    style,
    rules: {
      genre: STARTERS[genre] ? genre : 'collect',
      goal: starter.goal,
      lives: 3,
      timeLimit: starter.timeLimit ?? 0,
      playerSpeed: 6,
      jump: style.render === 'painted' || style.render === 'full3d',
      difficulty: 'normal',
      intro: `${String(title).slice(0, 60)}: ${goalText(starter.goal)}`
    },
    maps: { maps: [first] },
    cast: { player: playerChar, characters },
    audio: { music: starter.goal === 'boss' ? 'boss' : starter.goal === 'survive' ? 'battle' : 'meadow', sfx: { ...DEFAULT_SFX } },
    assets: { used: [] }
  };
}

export function goalText(goal) {
  return {
    collect: 'collect everything shiny, then step through the glowing door',
    defeat: 'clear every monster to open the glowing door',
    boss: 'defeat the boss to open the glowing door',
    reach: 'find the glowing door at the far side',
    survive: 'stay safe until the timer runs out',
    explore: 'visit every glowing marker to open the door'
  }[goal] ?? 'reach the glowing door';
}

/* ------------------------------------------------------------- validation */

/** Problems with one data file (empty = fine). */
export function checkFile(key, value) {
  const schema = DATA_FILES[key];
  if (!schema) return [`${key}: not a data file`];
  return check(schema, value, key);
}

/**
 * Problems with a whole game's data: each file's schema, then the cross-checks a schema
 * cannot say — unique ids, spawns that name a real character, a size cap.
 */
export function validateData(data) {
  const problems = [];
  for (const key of DATA_KEYS) {
    if (!data || !Object.hasOwn(data, key)) problems.push(`${key}: missing`);
    else problems.push(...checkFile(key, data[key]));
  }
  if (problems.length) return problems;
  const castIds = new Set(data.cast.characters.map((c) => c.id));
  if (castIds.size !== data.cast.characters.length) problems.push('cast: two characters share an id');
  if (castIds.has('player')) problems.push('cast: "player" is the player\'s id');
  if (data.cast.player.id !== 'player') problems.push('cast.player.id: must be "player"');
  const mapIds = new Set(data.maps.maps.map((m) => m.id));
  if (mapIds.size !== data.maps.maps.length) problems.push('maps: two maps share an id');
  if (!data.maps.maps.length) problems.push('maps: a game needs at least one map');
  data.maps.maps.forEach((m, i) => {
    for (const s of m.spawns) if (!castIds.has(s.cast)) problems.push(`maps[${i}].spawns: no character "${s.cast}"`);
  });
  const assetIds = new Set(data.assets.used.map((a) => a.id));
  data.maps.maps.forEach((m, i) => {
    for (const p of m.props) if (!assetIds.has(p.asset)) problems.push(`maps[${i}].props: asset "${p.asset}" is not in assets.json`);
    if (m.ground && !assetIds.has(m.ground)) problems.push(`maps[${i}].ground: asset "${m.ground}" is not in assets.json`);
  });
  for (const c of [data.cast.player, ...data.cast.characters]) {
    if (c.model && !assetIds.has(c.model)) problems.push(`cast ${c.id}.model: asset "${c.model}" is not in assets.json`);
  }
  if (bytesOf(data) > LIMITS.bytes) problems.push(`the game data is larger than ${LIMITS.bytes / 1024} KB`);
  return problems;
}

export const bytesOf = (data) => DATA_KEYS.reduce((n, key) => n + JSON.stringify(data?.[key] ?? null, null, 2).length + 1, 0);

/** The file text the Studio writes (stable: two-space JSON and a newline). */
export const fileText = (value) => `${JSON.stringify(value, null, 2)}\n`;

/** Credits for the game's Credits panel: the engine and every asset it uses. */
export function creditsOf(data) {
  const rows = [
    { what: 'Engine', who: 'three.js', site: 'https://threejs.org', licence: 'MIT' },
    { what: 'Sound effects', who: 'Gamory (synthesized)', site: '', licence: 'CC0' }
  ];
  if (data?.audio?.music && data.audio.music !== 'none') rows.push({ what: 'Music', who: 'Generated with ACE-Step 1.5', site: 'https://github.com/ace-step/ACE-Step-1.5', licence: 'MIT' });
  for (const a of data?.assets?.used ?? []) rows.push({ what: `${a.name} (${a.kind})`, who: a.author, site: a.url ?? '', licence: a.licence });
  return rows;
}
