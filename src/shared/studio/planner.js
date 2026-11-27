/**
 * The offline planner: a chat request turned into a patch (patch.js) from plain words, with no
 * model at all — what the Studio uses when no LM model is configured or it fails, and what
 * keeps the chat box working on a laptop with no network. Deterministic: the same words on the
 * same game give the same patch (tested).
 *
 *   planFromText('add a snowy forest map with a frozen lake', data)
 *     → { summary, ops: [addMap { biome: 'snow', features: ['trees', 'frozen-lake'], … }], understood: true }
 */
import { BODIES, COLLECTIBLES, DEFAULT_SFX, FEATURES, SOUNDS, biomeName } from './spec.js';
import { characterPatch, mapPatch, op, resolveCharacter, resolveMap, rulesPatch, stylePatch } from './patch.js';

const NUMBERS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, twenty: 20, couple: 2, few: 3, some: 3, several: 4, many: 6, lots: 8 };
const BIOME_WORDS = [
  ['snow', /\b(snow\w*|ic[ey]|frozen|winter\w*|frost\w*|arctic|glacier)\b/],
  ['lava', /\b(lava|volcan\w*|magma|fire|fiery|ember\w*)\b/],
  ['desert', /\b(desert|dunes?|sand[sy]?|canyon)\b/],
  ['beach', /\b(beach|seaside|ocean|sea|island|coast\w*|shore)\b/],
  ['cave', /\b(caves?|cavern\w*|underground|mines?|tunnels?)\b/],
  ['castle', /\b(castles?|dungeons?|fortress|keep|palace)\b/],
  ['city', /\b(city|town|street\w*|village)\b/],
  ['space', /\b(space|moon|mars|stars|planet\w*|galaxy|alien)\b/],
  ['swamp', /\b(swamp\w*|bog|marsh\w*)\b/],
  ['candy', /\b(candy|sweets?|sugar\w*|cake|chocolate)\b/],
  ['forest', /\b(forest\w*|woods?|woodland|jungle|grove)\b/],
  ['meadow', /\b(meadow|field|grass\w*|garden|farm|park)\b/]
];
const FEATURE_WORDS = [
  ['frozen-lake', /\b(frozen|icy|ice)\s+(lake|pond)\b|\bice\s*rink\b/],
  ['lake', /\b(lake|pond|pool|oasis)\b/],
  ['river', /\b(river|stream|creek)\b/],
  ['hills', /\b(hills?|mountains?|slopes?)\b/],
  ['trees', /\b(trees?|forest\w*|woods?|pines?)\b/],
  ['rocks', /\b(rocks?|boulders?|stones?)\b/],
  ['ruins', /\b(ruins?|temple|statues?|pillars?)\b/],
  ['flowers', /\b(flowers?|blossoms?|tulips?)\b/],
  ['bridge', /\b(bridges?)\b/],
  ['village', /\b(village|houses?|huts?|cottages?)\b/],
  ['crystals', /\b(crystals?|gems?\s+rocks?)\b/],
  ['mushrooms', /\b(mushrooms?|toadstools?)\b/],
  ['cactus', /\b(cact\w+)\b/],
  ['snowmen', /\b(snow\s?m[ae]n)\b/],
  ['lava-pools', /\b(lava\s+(pools?|pits?|lakes?))\b/],
  ['towers', /\b(towers?|spires?)\b/]
];
const WEATHER_WORDS = [['rain', /\b(rain\w*)\b/], ['snow', /\b(snowing|snowfall|snowstorm|blizzard)\b/], ['fog', /\b(fog\w*|mist\w*|haze)\b/], ['leaves', /\b(falling leaves|autumn|fall leaves|leaves)\b/], ['embers', /\b(embers|ash|sparks)\b/], ['clear', /\b(clear|sunny|no weather|stop (the )?(rain|snow))\b/]];
const TIME_WORDS = [['night', /\b(night\w*|dark|midnight|moonlit)\b/], ['sunset', /\b(sunset|evening|dusk)\b/], ['dawn', /\b(dawn|sunrise|morning)\b/], ['day', /\b(day\s?time|daylight|noon|bright day)\b/]];
const BODY_WORDS = Object.fromEntries(BODIES.map((b) => [b, new RegExp(`\\b${b}(s|es)?\\b`)]));
BODY_WORDS.bunny = /\b(bunn(y|ies)|rabbits?)\b/;
BODY_WORDS.kid = /\b(kids?|child|children|villagers?|person|people)\b/;
BODY_WORDS.dino = /\b(dinos?|dinosaurs?|dragons?)\b/;
BODY_WORDS.bird = /\b(birds?|owls?|chicks?|ducks?)\b/;
BODY_WORDS.knight = /\b(knights?|soldiers?|guards?)\b/;
BODY_WORDS.mage = /\b(mages?|wizards?|witch(es)?)\b/;
BODY_WORDS.ghost = /\b(ghosts?|spirits?|spooks?)\b/;
BODY_WORDS.blob = /\b(blobs?|jell(y|ies))\b/;
const SFX_WORDS = [
  ['coin', /\b(coins?|pick ?ups?|collect\w*|treasure|gems?|stars?)\b/], ['jump', /\b(jump\w*|hop\w*)\b/], ['attack', /\b(attack\w*|swing\w*|sword|punch\w*)\b/],
  ['hurt', /\b(hurt|ouch|damage[ds]?|getting hit)\b/], ['hit', /\b(hit\w*|bonk|smack)\b/], ['win', /\b(win\w*|victory|level complete)\b/], ['lose', /\b(lose|losing|game over|fail\w*)\b/],
  ['door', /\b(doors?|portals?|exit)\b/], ['powerup', /\b(power ?ups?|bonus)\b/], ['step', /\b(steps?|footsteps?|walking)\b/], ['splash', /\b(splash\w*|water)\b/]
];
const SOUND_WORDS = { 'coin-bright': /\bcoin\b.*\b(sound|chime)\b(?!.*\bfor\b)/, 'sad-horn': /\bsad\b/, chime: /\bchime\b/, blip: /\bblip\b/, sparkle: /\bsparkl\w*/, pop: /\bpop\b/, boing: /\bboing\b/, swoosh: /\bswoosh\b/, thud: /\bthud\b/, zap: /\bzap\b|\blaser\b/, bell: /\bbell\b/, fanfare: /\bfanfare\b|\btrumpet/, splash: /\bsplash\b/, crunch: /\bcrunch\b/, click: /\bclick\b/, whoosh: /\bwhoosh\b/ };
/** A second choice when "add a coin sound" asks for what is already there. */
const SFX_ALTERNATIVES = { coin: ['coin-bright', 'chime', 'sparkle', 'bell'], jump: ['boing', 'blip', 'whoosh'], attack: ['swoosh', 'whoosh', 'zap'], hit: ['thud', 'pop', 'crunch'], hurt: ['crunch', 'thud', 'blip'], win: ['fanfare', 'bell', 'sparkle'], lose: ['sad-horn', 'thud'], door: ['bell', 'chime', 'whoosh'], powerup: ['sparkle', 'zap', 'chime'], step: ['click', 'pop', 'none'], splash: ['splash', 'pop'] };
const MOOD_WORDS = [['boss', /\bboss\b/], ['battle', /\b(battle|fight\w*|action|epic|intense|fast)\b/], ['tense', /\b(spooky|scary|creepy|tense|dark|mysterious)\b/], ['kids', /\b(happy|playful|cute|fun|silly|cheerful)\b/], ['night', /\b(night|sleepy|dreamy)\b/], ['town', /\b(town|village|cozy|cosy)\b/], ['city', /\bcity\b/], ['menu', /\b(title|menu)\b/], ['calm', /\b(calm|peaceful|relax\w*|gentle|soft|quiet)\b/]];

const numberIn = (text, fallback = null) => {
  const m = /\b(\d{1,3})\b/.exec(text);
  if (m) return Number(m[1]);
  for (const [word, value] of Object.entries(NUMBERS)) if (new RegExp(`\\b${word}\\b`).test(text) && word !== 'a' && word !== 'an') return value;
  return fallback;
};
const title = (words) => words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const STOP = new Set(['add', 'a', 'an', 'new', 'another', 'map', 'level', 'area', 'zone', 'world', 'stage', 'land', 'please', 'the', 'make', 'create', 'build', 'me', 'us', 'with', 'and', 'of', 'one', 'more', 'next', 'big', 'small', 'large', 'huge', 'tiny', 'little', 'that', 'has', 'have', 'called', 'named', 'some', 'can', 'you', 'i', 'want', 'to']);

/** The map a clause talks about ("on map 2", "in the Frost Woods"), or the one being looked at. */
function targetMap(text, data, focusMap) {
  const maps = data.maps.maps;
  const num = /\b(?:map|level|stage)\s*#?(\d{1,2})\b/.exec(text) ?? /\b(first|last|second|third)\s+(?:map|level)\b/.exec(text);
  if (num) {
    const k = { first: 1, second: 2, third: 3 }[num[1]] ?? (num[1] === 'last' ? maps.length : Number(num[1]));
    return maps[k - 1]?.id ?? null;
  }
  for (const m of maps) if (text.includes(m.name.toLowerCase())) return m.id;
  return focusMap && resolveMap(maps, focusMap) ? resolveMap(maps, focusMap).id : maps.at(-1)?.id ?? null;
}

function biomeOf(text) {
  for (const [biome, re] of BIOME_WORDS) if (re.test(text)) return biome;
  return null;
}

function featuresOf(text, biome) {
  const out = [];
  for (const [f, re] of FEATURE_WORDS) {
    if (!re.test(text)) continue;
    if (f === 'lake' && out.includes('frozen-lake')) continue;
    if (f === 'trees' && biome === 'forest' && !/\btrees?\b/.test(text)) continue;
    if (f === 'village' && biome === 'city' && !/\b(houses?|village)\b/.test(text)) continue;
    out.push(f === 'lake' && biome === 'snow' && /\b(frozen|ice|icy)\b/.test(text) ? 'frozen-lake' : f);
  }
  return [...new Set(out)].filter((f) => FEATURES.includes(f)).slice(0, 8);
}

/** "add a snowy map", "make me a new level" — but not "add rain to map 2" or "make it night on the first map". */
export function wantsNewMap(clause) {
  const m = /\b(map|level|area|zone|world|stage|land)\b/.exec(clause);
  if (!m) return false;
  const before = clause.slice(0, m.index);
  if (/\b(to|on|in|for|of|from|into)\s+(the\s+)?(\w+\s+)?$/.test(before)) return false;
  if (/^\s*#?\d/.test(clause.slice(m.index + m[0].length))) return false;
  return /\b(add|create|build|new|another)\b|\bmake\s+(me\s+|us\s+)?(a|an|another|new|one more)\b/.test(before);
}

function addMapOp(clause) {
  const [head, ...tail] = clause.split(/\bwith\b|\bthat has\b|\bwhere\b/);
  const rest = tail.join(' ');
  const biome = biomeOf(head) ?? biomeOf(rest) ?? 'meadow';
  const features = [...new Set([...featuresOf(head.replace(BIOME_WORDS.find(([b]) => b === biome)?.[1] ?? /$^/, ''), biome), ...featuresOf(rest, biome)])];
  const named = /\b(?:called|named)\s+["“']?([^"”',.!?]{2,40})/.exec(clause);
  const words = head.replace(/[^a-z\s-]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w));
  const name = named ? title(named[1].trim().split(/\s+/)) : words.length ? title(words.slice(0, 3)) : biomeName(biome);
  let weather = null;
  for (const [w, re] of WEATHER_WORDS) if (w !== 'clear' && re.test(clause)) weather = w;
  let time = null;
  for (const [t, re] of TIME_WORDS) if (re.test(clause)) time = time ?? t;
  const size = /\b(huge|big|large|giant|wide)\b/.test(head) ? 'large' : /\b(small|tiny|little)\b/.test(head) ? 'small' : null;
  const collectible = COLLECTIBLES.find((c) => new RegExp(`\\b${c}e?s?\\b`).test(rest)) ?? null;
  return op('addMap', { map: mapPatch({ name, biome, features: features.length ? features : null, weather, time, size, collectible }) });
}

function speedWord(text) {
  const much = /\b(much|way|really|super|lot)\b/.test(text);
  const bit = /\b(bit|little|slightly|tad)\b/.test(text);
  if (/\bslow(er)?\b/.test(text)) return much ? 0.5 : bit ? 0.85 : 0.7;
  if (/\b(fast(er)?|quick(er)?|speedy)\b/.test(text)) return much ? 1.7 : bit ? 1.15 : 1.35;
  return null;
}
const round1 = (v) => Math.round(v * 10) / 10;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Who a clause is about: 'player', a character, or null. */
function whoIn(text, data) {
  if (/\b(me|my (hero|character|player)|the (player|hero)|player|hero|myself)\b/.test(text)) return 'player';
  const chars = data.cast.characters;
  for (const c of chars) if (text.includes(c.name.toLowerCase())) return c;
  if (/\bboss\b/.test(text)) return chars.find((c) => c.role === 'boss') ?? null;
  for (const [body, re] of Object.entries(BODY_WORDS)) if (re.test(text)) {
    const c = chars.find((x) => x.body === body);
    if (c) return c;
  }
  if (/\b(enem(y|ies)|monsters?)\b/.test(text)) return chars.find((c) => c.role === 'enemy') ?? null;
  if (/\b(npc|guide|friend|helper|villager)\b/.test(text)) return chars.find((c) => c.role === 'npc') ?? null;
  return null;
}

function changeCharacter(clause, data) {
  const who = whoIn(clause, data);
  if (!who) return [];
  const speed = speedWord(clause);
  const base = who === 'player' ? data.cast.player : who;
  const patch = {};
  if (speed) patch.speed = round1(clamp(base.speed * speed, who === 'player' ? 1 : 0.2, 14));
  // "Harder"/"easier" about a monster change it; about the player they mean the game's difficulty (rules).
  const strong = who === 'player' ? /\b(strong(er)?|tough(er)?|more health)\b/ : /\b(strong(er)?|tough(er)?|harder|hard to beat|more health)\b/;
  const weak = who === 'player' ? /\b(weak(er)?|less health)\b/ : /\b(weak(er)?|easier|easy to beat|less health)\b/;
  if (strong.test(clause)) {
    patch.health = clamp(Math.ceil(base.health * 1.5), 1, 200);
    patch.damage = clamp(base.damage + (who === 'player' ? 0 : 1), 0, 5);
  }
  if (weak.test(clause)) {
    patch.health = clamp(Math.floor(base.health * 0.6), 1, 200);
    patch.damage = clamp(base.damage - 1, 0, 5);
  }
  if (/\b(big(ger)?|larger|huge|giant)\b/.test(clause)) patch.size = round1(clamp(base.size * 1.3, 0.4, 3));
  if (/\b(small(er)?|tiny|little)\b/.test(clause)) patch.size = round1(clamp(base.size * 0.75, 0.4, 3));
  const color = colorIn(clause);
  if (color) patch.main = color;
  for (const b of ['chase', 'guard', 'patrol', 'flee', 'wander', 'idle']) if (new RegExp(`\\b${b}\\w*`).test(clause) && who !== 'player') patch.behaviour = b;
  const says = /\b(?:say|says|line)\s*[:"“]\s*["“]?([^"”]{1,160})/.exec(clause);
  if (says && who !== 'player') patch.line = says[1].trim();
  if (!Object.keys(patch).length) return [];
  if (who === 'player') {
    const ops = [op('setPlayer', { character: characterPatch(patch) })];
    if (patch.speed) ops.push(op('setRules', { rules: rulesPatch({ playerSpeed: patch.speed }) }));
    return ops;
  }
  return [op('updateCharacter', { target: who.id, character: characterPatch(patch) })];
}

const COLORS = { red: '#e8483e', orange: '#f0883a', yellow: '#f6d04a', green: '#6ac86a', blue: '#4a8ce8', purple: '#9a6ad8', pink: '#f59ac0', white: '#f4f4f4', black: '#2a2a33', brown: '#9a6a44', grey: '#9aa0aa', gray: '#9aa0aa', gold: '#f0c040', teal: '#3ab8b0' };
function colorIn(text) {
  for (const [name, hex] of Object.entries(COLORS)) if (new RegExp(`\\b${name}\\b`).test(text)) return hex;
  return null;
}

function addCharacterOps(clause, data, focusMap) {
  const role = /\bboss\b/.test(clause) ? 'boss' : /\b(npc|friend|villager|guide|helper|shopkeeper|teacher|talking)\b/.test(clause) ? 'npc' : /\b(ally|pet|buddy|companion)\b/.test(clause) ? 'ally' : 'enemy';
  let body = null;
  for (const [b, re] of Object.entries(BODY_WORDS)) if (re.test(clause)) {
    body = b;
    break;
  }
  const count = numberIn(clause.replace(/\bmap\s*\d+|level\s*\d+/g, ''), role === 'boss' || role === 'npc' ? 1 : 3);
  const map = targetMap(clause, data, focusMap);
  const existing = data.cast.characters.find((c) => (body ? c.body === body : true) && c.role === role);
  if (/\bmore\b/.test(clause) && existing) return [op('addSpawn', { target: map, character: characterPatch({ name: existing.id, count: clamp(count, 1, 30) }) })];
  const named = /\b(?:called|named)\s+["“']?([^"”',.!?]{2,40})/.exec(clause);
  const name = named ? title(named[1].trim().split(/\s+/)) : null;
  const speed = speedWord(clause);
  const color = colorIn(clause);
  const fields = { role, body, name, count: clamp(count, 1, 30), main: color };
  if (speed) fields.speed = round1(clamp((role === 'boss' ? 2.2 : 2.6) * speed, 0.2, 14));
  if (role === 'boss' && /\b(fire|dragon|lava)\b/.test(clause) && !body) fields.body = 'dino';
  return [op('addCharacter', { target: map, character: characterPatch(fields) })];
}

function soundOps(clause, data) {
  let event = null;
  for (const [e, re] of SFX_WORDS) if (re.test(clause)) {
    event = e;
    break;
  }
  if (!event) return [];
  let sound = null;
  if (/\b(no|mute|silent|without|remove)\b/.test(clause)) sound = 'none';
  for (const [s, re] of Object.entries(SOUND_WORDS)) if (!sound && s !== 'coin-bright' && re.test(clause)) sound = s;
  if (!sound) {
    const options = SFX_ALTERNATIVES[event];
    const now = data.audio.sfx[event];
    sound = now === 'none' || !now ? DEFAULT_SFX[event] : options[(options.indexOf(now) + 1) % options.length];
    if (sound === 'none') sound = options[0];
  }
  return SOUNDS.includes(sound) ? [op('setSfx', { target: event, sound })] : [];
}

function musicOps(clause, data, focusMap, tracks) {
  if (/\b(no|stop|without|mute|silence)\b.*\bmusic\b|\bmusic\b.*\b(off|none)\b/.test(clause)) return [op('setMusic', { track: 'none' })];
  let track = tracks.find((t) => clause.includes(t.id) || clause.includes(String(t.title ?? '').toLowerCase()));
  if (!track) {
    for (const [mood, re] of MOOD_WORDS) {
      if (!re.test(clause)) continue;
      track = tracks.find((t) => !/^kick-/.test(t.id) && (t.tags ?? []).includes(mood)) ?? tracks.find((t) => t.mood === mood);
      if (track) break;
    }
  }
  if (!track) {
    const biome = resolveMap(data.maps.maps, targetMap(clause, data, focusMap))?.biome;
    const byBiome = { snow: 'frozen-fortress', forest: 'night-forest', meadow: 'meadow', city: 'city-night', castle: 'frozen-fortress', lava: 'boss', cave: 'frozen-fortress', beach: 'lantern-valley', candy: 'playful', swamp: 'jungle', desert: 'jungle-hunt', space: 'discovery' }[biome];
    track = tracks.find((t) => t.id === byBiome) ?? tracks.find((t) => t.id !== data.audio.music && t.kind !== 'stinger');
  }
  if (!track) return [];
  const perMap = /\b(on|in|for)\s+(the\s+)?(map|level|this map|first|last|second)\b|\bmap\s*\d/.test(clause);
  return [op('setMusic', { track: track.id, target: perMap ? targetMap(clause, data, focusMap) : null })];
}

function styleOps(clause) {
  const s = {};
  if (/\bhd-?2d\b|\b2\.5d\b|\bsprites? in (a )?3d\b/.test(clause)) s.render = 'hd2d';
  else if (/\b(painted|parallax|storybook)\b.*\b(background|backdrop)\b|\b3d characters?\b.*\b2d\b/.test(clause)) s.render = 'painted';
  else if (/\b(full |all )?2d\b/.test(clause)) s.render = 'flat2d';
  else if (/\b(full |all )?3d\b/.test(clause)) s.render = 'full3d';
  if (/\bpixel\w*/.test(clause)) s.animation = 'pixel';
  else if (/\bplush\w*|\bcuddly|\bsoft toy/.test(clause)) s.animation = 'plush';
  else if (/\b(smooth|skeletal)\b/.test(clause)) s.animation = 'skeletal';
  else if (/\b(toon|squash|stretchy)\b.*\banimat/.test(clause)) s.animation = 'toon';
  if (/\b(realistic|photo\w*|pbr|lifelike)\b/.test(clause)) s.look = 'realistic';
  else if (/\b(cartoon\w*|cel|toon)\b/.test(clause)) s.look = 'cartoon';
  else if (/\bstyli[sz]ed\b/.test(clause)) s.look = 'stylized';
  for (const p of ['pastel', 'neon', 'moody', 'earthy', 'bright']) if (new RegExp(`\\b${p}\\b`).test(clause)) s.palette = p;
  return Object.keys(s).length ? [op('setStyle', { style: stylePatch(s) })] : [];
}

function rulesOps(clause) {
  const r = {};
  if (/\b(harder|more difficult|challenging|hard mode)\b/.test(clause) && !/\b(boss|enem|monster|slime|ghost)\w*\b.*\bharder\b/.test(clause)) r.difficulty = 'hard';
  if (/\b(easier|less difficult|easy mode|too hard)\b/.test(clause)) r.difficulty = 'easy';
  const lives = /\b(\d)\s+(lives|hearts)\b/.exec(clause);
  if (lives) r.lives = clamp(Number(lives[1]), 1, 9);
  if (/\bno (time ?limit|timer)\b/.test(clause)) r.timeLimit = 0;
  else {
    const t = /\b(\d{1,4})\s*(seconds?|secs?|minutes?|mins?)\b/.exec(clause);
    if (t && /\b(time|timer|limit|clock|countdown|survive)\b/.test(clause)) r.timeLimit = clamp(Number(t[1]) * (/^m/.test(t[2]) ? 60 : 1), 0, 1800);
  }
  if (/\b(let (me|players?) jump|add jump\w*|jumping on|can jump)\b/.test(clause)) r.jump = true;
  if (/\b(no jump\w*|without jump\w*|jumping off)\b/.test(clause)) r.jump = false;
  const goal = /\bgoal\b.*\b(collect|defeat|boss|reach|survive|explore)\b/.exec(clause);
  if (goal) r.goal = goal[1];
  const intro = /\b(?:intro|story)\s*[:=]\s*(.{3,240})$/.exec(clause);
  if (intro && !/\bmap\b/.test(clause.slice(0, intro.index))) r.intro = intro[1].trim();
  return Object.keys(r).length ? [op('setRules', { rules: rulesPatch(r) })] : [];
}

function mapChangeOps(clause, data, focusMap) {
  const target = targetMap(clause, data, focusMap);
  if (!target) return [];
  const map = resolveMap(data.maps.maps, target);
  const m = {};
  for (const [w, re] of WEATHER_WORDS) if (re.test(clause)) m.weather = m.weather ?? w;
  for (const [t, re] of TIME_WORDS) if (re.test(clause)) m.time = m.time ?? t;
  const more = /\b(more|extra)\b/.test(clause);
  const fewer = /\b(fewer|less)\b/.test(clause);
  const kind = COLLECTIBLES.find((c) => new RegExp(`\\b${c}e?s?\\b`).test(clause)) ?? (/\b(collectibles|treasures?|shinies)\b/.test(clause) ? map.collectible : null);
  if (kind) {
    const k = numberIn(clause.replace(/\b(map|level)\s*\d+/g, ''), null);
    if (more) m.collectibles = clamp(map.collectibles + (k ?? 5), 0, 60);
    else if (fewer) m.collectibles = clamp(map.collectibles - (k ?? 3), 0, 60);
    else if (k != null) m.collectibles = clamp(k, 0, 60);
    if (kind !== map.collectible && !more && !fewer) m.collectible = kind;
  }
  const rename = /\brename\b.*?\bto\s+["“']?([^"”']{2,40})/.exec(clause);
  if (rename) m.name = title(rename[1].trim().split(/\s+/));
  const story = /\b(?:story|intro)\b[^:]*:\s*(.{3,240})$/.exec(clause);
  if (story && /\bmap\b/.test(clause.slice(0, story.index))) m.story = story[1].trim();
  const biome = /\b(turn|change|make)\b.*\binto\b/.test(clause) ? biomeOf(clause.split(/\binto\b/)[1] ?? '') : null;
  if (biome) m.biome = biome;
  const addFeature = /\b(add|put|place)\b/.test(clause) ? featuresOf(clause, map.biome).filter((f) => !map.features.includes(f)) : [];
  if (addFeature.length) m.features = [...map.features, ...addFeature].slice(0, 8);
  if (/\b(bigger|larger|huge)\b/.test(clause) && /\b(map|level|world|area)\b/.test(clause)) m.size = map.size === 'small' ? 'medium' : 'large';
  if (/\b(smaller|tiny)\b/.test(clause) && /\b(map|level|world|area)\b/.test(clause)) m.size = map.size === 'large' ? 'medium' : 'small';
  return Object.keys(m).length ? [op('updateMap', { target, map: mapPatch(m) })] : [];
}

function moreEnemiesOps(clause, data, focusMap) {
  const target = targetMap(clause, data, focusMap);
  const map = resolveMap(data.maps.maps, target);
  const foes = data.cast.characters.filter((c) => c.role === 'enemy');
  if (!foes.length || !map) return [];
  if (/\b(more)\b/.test(clause)) {
    const spawned = map.spawns.map((s) => foes.find((f) => f.id === s.cast)).filter(Boolean);
    return (spawned.length ? spawned : foes.slice(0, 1)).map((f) => op('addSpawn', { target, character: characterPatch({ name: f.id, count: 2 }) }));
  }
  return foes
    .filter((f) => map.spawns.some((s) => s.cast === f.id))
    .map((f) => op('updateCharacter', { target: f.id, character: characterPatch({ count: Math.max(1, (map.spawns.find((s) => s.cast === f.id)?.count ?? 2) - 2) }) }));
}

/**
 * The patch for a chat request, from words alone.
 * @param {string} text           what the maker typed
 * @param {object} data           the game's data (spec.js)
 * @param {{ focusMap?: string|null, tracks?: {id:string,title?:string,mood?:string,tags?:string[],kind?:string}[] }} [options]
 * @returns {{ summary: string, ops: object[], understood: boolean }}
 */
export function planFromText(text, data, { focusMap = null, tracks = [] } = {}) {
  const lower = String(text ?? '').toLowerCase().replace(/[’']/g, "'").slice(0, 600);
  const clauses = lower.split(/[.;!?\n]+|,?\s+(?:and )?then\s+|,\s*and\s+(?=(?:add|make|remove|delete|change|set|give|put|turn|rename|play|use)\b)|\s+also\s+/).map((c) => c.trim()).filter(Boolean);
  const ops = [];
  for (const clause of clauses) {
    let got = [];
    if (/\b(remove|delete|drop)\b.*\b(map|level|stage)\b/.test(clause)) {
      const target = targetMap(clause, data, null);
      got = target ? [op('removeMap', { target })] : [];
    } else if (wantsNewMap(clause)) {
      got = [addMapOp(clause)];
    } else if (/\b(remove|delete|get rid of)\b/.test(clause) && whoIn(clause, data) && whoIn(clause, data) !== 'player') {
      got = [op('removeCharacter', { target: whoIn(clause, data).id })];
    } else if (/\b(sound|sfx|noise|beep)\b/.test(clause)) {
      got = soundOps(clause, data);
    } else if (/\b(music|song|soundtrack|tune|bgm)\b/.test(clause)) {
      got = musicOps(clause, data, focusMap, tracks);
    } else if (/\b(more|fewer|less)\s+(enem(y|ies)|monsters?|foes|baddies)\b/.test(clause)) {
      got = moreEnemiesOps(clause, data, focusMap);
    } else if (/\b(add|put|spawn|place|more)\b/.test(clause) && /\b(enem(y|ies)|monsters?|boss|npc|friend|villagers?|guide|helper|creatures?|ally|pet|buddy)\b|\b(slimes?|ghosts?|robots?|dinos?|dragons?|knights?|wizards?|bunn(y|ies)|bears?|cats?|fox(es)?|penguins?|frogs?|birds?|blobs?)\b/.test(clause) && !/\b(sound|music)\b/.test(clause)) {
      got = addCharacterOps(clause, data, focusMap);
    }
    if (!got.length) got = [...styleOps(clause)];
    if (!got.length) {
      got = changeCharacter(clause, data);
      if (got.length) got.push(...rulesOps(clause));
    }
    if (!got.length) got = [...rulesOps(clause), ...mapChangeOps(clause, data, focusMap)];
    ops.push(...got);
  }
  const trimmed = ops.slice(0, 12);
  return {
    summary: trimmed.length ? describeOps(trimmed, data) : 'I could not turn that into a change. Try "add a snowy forest map with a frozen lake", "make the boss slower" or "add a coin sound".',
    ops: trimmed,
    understood: trimmed.length > 0
  };
}

function describeOps(ops, data) {
  const parts = ops.map((o) => {
    switch (o.op) {
      case 'addMap': return `added the map "${o.map.name}"`;
      case 'removeMap': return `removed ${resolveMap(data.maps.maps, o.target)?.name ?? 'a map'}`;
      case 'updateMap': return `changed "${resolveMap(data.maps.maps, o.target)?.name ?? 'the map'}"`;
      case 'addCharacter': return `added ${o.character.count > 1 ? `${o.character.count} ` : 'a '}${o.character.name ?? o.character.body ?? o.character.role}`;
      case 'addSpawn': return `added more ${resolveCharacter(data.cast.characters, o.character.name)?.name ?? 'monsters'}`;
      case 'updateCharacter': return `changed ${resolveCharacter(data.cast.characters, o.target)?.name ?? 'a character'}`;
      case 'removeCharacter': return `removed ${resolveCharacter(data.cast.characters, o.target)?.name ?? 'a character'}`;
      case 'setPlayer': return 'changed your hero';
      case 'setRules': return 'changed the rules';
      case 'setStyle': return 'changed the style';
      case 'setMusic': return `set the music to ${o.track}`;
      case 'setSfx': return `set the ${o.target} sound to ${o.sound}`;
      default: return o.op;
    }
  });
  const text = parts.join(', ');
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`.slice(0, 240);
}
