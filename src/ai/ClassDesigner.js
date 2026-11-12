import { SKILL_BASES, STYLES } from '../forge/ClassForge.js';
import { LOOKS } from '../platform/character/classes.js';
import { slugify } from '../levels/Level.js';

const ENDPOINT = './api/ai';
const BASE_IDS = Object.keys(SKILL_BASES);
const PHYSICAL = new Set(['slam', 'rampage', 'roar', 'leap', 'tempest', 'quake']);
const BONUS_KEYS = ['health', 'armor', 'speed', 'damage', 'cooldown', 'crit'];
/** Bonus budget: what a built-in class gets, roughly. Health counts at a third. */
const BUDGET = 60;

/**
 * Designs a new class from one sentence ("a pirate captain who fights with
 * cannon fire and the sea") — with the local AI model when it is up, from
 * keywords when it is not. Either way the result goes through `normalize`, so
 * whatever comes back is a valid, balanced design the forge can build.
 *
 * The model is never asked to invent mechanics. It picks, for each of six
 * skills, which of the game's hand-made abilities it is built on (SKILL_BASES),
 * and supplies the name, the colour and the flavour. The structure is the one
 * MOBA and action-RPG kits share: three branches, each a quicker tier-1 skill
 * leading to a stronger tier-2 one — and a mix of shapes (lines, circles, a
 * self cast, a movement skill) so the class has answers for different fights.
 */

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'icon', 'tagline', 'look', 'style', 'color', 'resource', 'bonuses', 'branches'],
  properties: {
    name: { type: 'string' },
    icon: { type: 'string' },
    tagline: { type: 'string' },
    look: { type: 'string', enum: Object.keys(LOOKS) },
    style: { type: 'string', enum: STYLES },
    color: { type: 'string' },
    resource: { type: 'string', enum: ['none', 'rage'] },
    bonuses: {
      type: 'object',
      additionalProperties: false,
      required: BONUS_KEYS,
      properties: Object.fromEntries(BONUS_KEYS.map((k) => [k, { type: 'integer' }]))
    },
    branches: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'skills'],
        properties: {
          name: { type: 'string' },
          skills: {
            type: 'array',
            minItems: 2,
            maxItems: 2,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'base', 'color', 'description'],
              properties: {
                name: { type: 'string' },
                base: { type: 'string', enum: BASE_IDS },
                color: { type: 'string' },
                description: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
};

function systemPrompt() {
  return [
    'You design character classes for a fantasy action game. Answer with JSON only, matching the schema.',
    'A class has 3 skill branches; each branch has 2 skills: a quick tier-1 skill, then a stronger tier-2 skill.',
    'Every skill must be built on one of these existing abilities ("base") — pick the base whose shape fits the idea:',
    ...BASE_IDS.map((id) => `- ${id}: ${SKILL_BASES[id]}`),
    'Rules:',
    '- Give the class a mix: at least one far-cast circle, and at least one of: a movement skill (blink, rampage, leap) or a self cast (roar, tempest).',
    '- Use 6 different bases. Physical bases suit warriors; elemental ones suit casters; mixing is fine for hybrids.',
    '- resource "rage" only for a class mostly built on physical bases; otherwise "none".',
    '- Skill and class names must be ORIGINAL — never names of characters or abilities from existing games, films or books.',
    '- name: 1–3 words. tagline: one sentence of flavour.',
    '- description: one short sentence in the class\'s own theme, written fresh — e.g. for a pirate built on meteor: "Lobs a flaming cannonball that bursts where it lands." Never copy the base\'s wording above.',
    '- icon: a single emoji. color and every skill color: a hex colour like #ff8a3c that fits the theme; vary them per branch.',
    `- look: the body to wear (${Object.keys(LOOKS).join(', ')}). style: the built-in class whose weapon and moves fit best (${STYLES.join(', ')}).`,
    '- bonuses: small numbers. health -30..80, armor 0..25, speed -10..15, damage -10..20, cooldown 0..15, crit 0..15. Strengths need weaknesses.'
  ].join('\n');
}

async function ask(description) {
  const status = await fetch(`${ENDPOINT}/status`).then((r) => r.json()).catch(() => null);
  if (!status?.ok) throw new Error(status?.error ?? 'AI model offline');
  const response = await fetch(`${ENDPOINT}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: `Design this class: ${description} /no_think` }
      ],
      task: 'class',
      schema: SCHEMA,
      temperature: 0.85,
      maxTokens: 1400,
      timeoutMs: 150_000
    })
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
  let content = String(body?.choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '');
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('the model did not return JSON');
    return JSON.parse(match[0]);
  }
}

/* ---------------------------------------------------------------------- */
/* Keyword designer (offline)                                              */
/* ---------------------------------------------------------------------- */

/** Theme words → the bases, colours and look that fit them. */
const THEMES = [
  { words: /fire|flame|ember|lava|sun|burn|dragon|cannon|blast/, bases: ['meteor', 'beam', 'slam', 'quake'], colors: ['#ff6a2a', '#ffb347', '#ff3d2a'], icon: '🔥' },
  { words: /ice|frost|snow|winter|cold|glacier/, bases: ['ice', 'glacier', 'hail', 'snare'], colors: ['#5fd0ff', '#bfe8ff', '#8ee8ff'], icon: '❄️' },
  { words: /storm|lightning|thunder|electric|spark|sky|wind/, bases: ['thunder', 'chain', 'hail', 'blink'], colors: ['#ffd23f', '#7fb4ff', '#eaf6ff'], icon: '⚡' },
  { words: /sea|water|ocean|wave|tide|pirate|rain/, bases: ['orb', 'snare', 'hail', 'chain'], colors: ['#2ab0c8', '#7fe0d8', '#3a7fe0'], icon: '🌊' },
  { words: /shadow|night|void|dark|assassin|ninja|thief|death|ghost|necro/, bases: ['blink', 'orb', 'snare', 'chain'], colors: ['#8a5cff', '#c27bff', '#3dffb0'], icon: '🌑' },
  { words: /holy|light|sun|paladin|priest|angel|divine/, bases: ['beam', 'roar', 'glacier', 'blink'], colors: ['#ffe27a', '#fff2c4', '#ffd77a'], icon: '✨' },
  { words: /nature|forest|druid|beast|wild|plant|thorn|animal/, bases: ['snare', 'rampage', 'roar', 'hail'], colors: ['#7ccf8a', '#b8f06a', '#5aa96a'], icon: '🌿' },
  { words: /warrior|knight|berserk|giant|brute|fighter|gladiator|axe|hammer|stone|earth|mountain/, bases: ['slam', 'rampage', 'leap', 'tempest', 'roar', 'quake'], colors: ['#e0a060', '#ff7040', '#c88a4a'], icon: '⚔️' }
];

const STYLE_WORDS = [
  [/bow|archer|hunter|ranger|pirate/, 'amazon', 'rogue'],
  [/assassin|ninja|thief|shadow|rogue|dagger/, 'shadowblade', 'rogue-hooded'],
  [/necro|death|bone|ghost|skeleton/, 'bonecaller', 'skeleton-mage'],
  [/holy|paladin|priest|templar|light/, 'templar', 'knight'],
  [/druid|nature|beast|wild|forest/, 'wildwarden', 'mage'],
  [/warrior|berserk|giant|brute|axe|barbarian|gladiator/, 'barbarian', 'barbarian'],
  [/knight|guard|shield|soldier/, 'knight', 'knight'],
  [/mage|wizard|witch|sorcer|scholar|cast/, 'mage', 'mage']
];

const NAME_PARTS = {
  first: ['Ash', 'Storm', 'Tide', 'Ember', 'Thorn', 'Gloom', 'Iron', 'Star', 'Frost', 'Dawn', 'Hollow', 'Wild'],
  class: ['warden', 'caller', 'binder', 'walker', 'breaker', 'singer', 'blade', 'keeper', 'weaver', 'herald'],
  skillA: ['Lash', 'Burst', 'Surge', 'Spike', 'Rush', 'Snap', 'Wave', 'Fang'],
  skillB: ['Cataclysm', 'Tempest', 'Crown', 'Requiem', 'Maelstrom', 'Reckoning', 'Bloom', 'Verdict'],
  branch: ['Fury', 'Ward', 'Reach', 'Echo', 'Edge', 'Root', 'Tide', 'Spark']
};

/** A small seeded random, so the same sentence gives the same offline class. */
function rng(seedText) {
  let h = 2166136261;
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
}

function offline(description) {
  const text = description.toLowerCase();
  const r = rng(text);
  const pick = (list) => list[Math.floor(r() * list.length)];
  const themes = THEMES.filter((t) => t.words.test(text));
  if (!themes.length) themes.push(pick(THEMES), pick(THEMES));
  const pool = [...new Set(themes.flatMap((t) => t.bases))];
  // Top the pool up so there are always six different bases, with a circle and a mover.
  for (const extra of ['hail', 'blink', 'snare', 'roar', 'thunder', 'leap', 'orb', 'ice']) if (pool.length < 6 && !pool.includes(extra)) pool.push(extra);
  const bases = pool.sort(() => r() - 0.5).slice(0, 6);
  const colors = themes.flatMap((t) => t.colors);
  const [, style, look] = STYLE_WORDS.find(([re]) => re.test(text)) ?? [null, pick(STYLES), pick(Object.keys(LOOKS))];
  const physical = bases.filter((b) => PHYSICAL.has(b)).length >= 4;
  const name = `${pick(NAME_PARTS.first)}${pick(NAME_PARTS.class)}`;
  return {
    name,
    icon: themes[0].icon,
    tagline: `${description.trim().replace(/\.$/, '')} — a class forged from that idea.`,
    look,
    style,
    color: colors[0],
    resource: physical ? 'rage' : 'none',
    bonuses: { health: 20, armor: 5, speed: 5, damage: 8, cooldown: 4, crit: 4 },
    branches: [0, 1, 2].map((b) => ({
      name: pick(NAME_PARTS.branch),
      skills: [0, 1].map((t) => {
        const base = bases[b * 2 + t];
        return {
          name: `${pick(NAME_PARTS.first)} ${t === 0 ? pick(NAME_PARTS.skillA) : pick(NAME_PARTS.skillB)}`,
          base,
          color: colors[(b + t) % colors.length],
          description: SKILL_BASES[base].split(' — ')[1]
        };
      })
    }))
  };
}

/* ---------------------------------------------------------------------- */
/* Normalize                                                               */
/* ---------------------------------------------------------------------- */

const clean = (s, max) => String(s ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const hex = (s, fallback) => (/^#[0-9a-f]{6}$/i.test(String(s ?? '').trim()) ? String(s).trim().toLowerCase() : fallback);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));

/**
 * Any design (model output, an old file, a hand edit) → a valid one: six
 * different bases, sane names and colours, bonuses inside the budget.
 */
export function normalizeDesign(raw = {}, { description = '', id } = {}) {
  const name = clean(raw.name, 28) || 'Nameless';
  const color = hex(raw.color, '#7fd6ff');
  const used = new Set();
  const branches = [0, 1, 2].map((b) => {
    const branch = raw.branches?.[b] ?? {};
    return {
      name: clean(branch.name, 18) || ['First', 'Second', 'Third'][b],
      skills: [0, 1].map((t) => {
        const skill = branch.skills?.[t] ?? {};
        // A skill reused from the library keeps its own base (it may share one with another skill here).
        const ref = typeof skill.ref === 'string' && /^[a-z0-9][a-z0-9-]{0,60}$/.test(skill.ref) && BASE_IDS.includes(skill.base) ? skill.ref : null;
        let base = ref ? skill.base : BASE_IDS.includes(skill.base) && !used.has(skill.base) ? skill.base : BASE_IDS.find((x) => !used.has(x));
        used.add(base);
        return {
          ...(ref ? { ref, refStatus: clean(skill.refStatus, 12) || undefined } : {}),
          name: clean(skill.name, 26) || `${name} ${b * 2 + t + 1}`,
          base,
          color: hex(skill.color, color),
          description: clean(skill.description, 140) || SKILL_BASES[base].split(' — ')[1]
        };
      })
    };
  });
  const bonuses = Object.fromEntries(
    BONUS_KEYS.map((k) => [k, clamp(raw.bonuses?.[k], ...{ health: [-30, 80], armor: [0, 25], speed: [-10, 15], damage: [-10, 20], cooldown: [0, 15], crit: [0, 15] }[k])])
  );
  // Hold the total to the budget (health counts at a third): no free lunch.
  const cost = () => bonuses.health / 3 + bonuses.armor + bonuses.speed + bonuses.damage + bonuses.cooldown + bonuses.crit;
  for (let guard = 0; cost() > BUDGET && guard < 200; guard++) {
    const k = BONUS_KEYS.reduce((a, b) => (bonuses[b] / (b === 'health' ? 3 : 1) > bonuses[a] / (a === 'health' ? 3 : 1) ? b : a));
    bonuses[k] -= k === 'health' ? 3 : 1;
  }
  for (const k of BONUS_KEYS) if (!bonuses[k]) delete bonuses[k];
  const physicalCount = branches.flatMap((b) => b.skills).filter((s) => PHYSICAL.has(s.base)).length;
  return {
    version: 1,
    id: id ?? `forge-${slugify(name).slice(0, 36) || 'class'}`,
    name,
    icon: [...String(raw.icon ?? '')].slice(0, 2).join('') || '✦',
    tagline: clean(raw.tagline, 160) || 'A class from the forge.',
    look: LOOKS[raw.look] ? raw.look : 'mage',
    style: STYLES.includes(raw.style) ? raw.style : 'mage',
    color,
    resource: raw.resource === 'rage' && physicalCount >= 3 ? 'rage' : 'none',
    bonuses,
    prompt: clean(raw.prompt ?? description, 300),
    branches
  };
}

/** The character catalog, loaded the first time a design needs it. */
let characters = null;
async function catalogClass(description) {
  const catalog = await (characters ??= import('../catalog/inspiration/characters.js').catch(() => null));
  const c = catalog?.matchCharacter(description);
  if (!c) return null;
  return {
    design: normalizeDesign(catalog.forgeDesignOf(c.id, description), { description }),
    source: 'catalog',
    inspiredBy: { name: c.name, work: catalog.getWorkTitle(c.work) }
  };
}

/**
 * @param {string} description one sentence from the player
 * @returns {Promise<{ design: object, source: 'ai'|'keywords'|'catalog', note?: string, inspiredBy?: { name, work } }>}
 */
export async function designClass(description) {
  // "A class like <a catalogued character>": their ready-made original class, no AI and no tokens.
  const like = await catalogClass(description);
  if (like) return like;
  try {
    const raw = await ask(description);
    return { design: normalizeDesign(raw, { description }), source: 'ai' };
  } catch (error) {
    return { design: normalizeDesign(offline(description), { description }), source: 'keywords', note: error.message };
  }
}
