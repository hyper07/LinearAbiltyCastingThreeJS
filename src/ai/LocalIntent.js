import { ELEMENTS, ELEMENT_META } from '../config/settings.js';

/**
 * The offline half of the commander.
 *
 * A language model on a machine on the LAN is not a dependency the game can
 * *require* — the box is asleep, the build is static and has no bridge, the
 * model is busy. So every phrase the chat accepts is first run past this
 * parser, and the model is only consulted when the parser has nothing.
 *
 * That ordering is worth more than the fallback itself: "meteor the big one" is
 * answered in a fraction of a millisecond by a regex rather than in two seconds
 * by a 4B model, and the fast path is the one you use in a fight. The model
 * exists for the phrasings a keyword table cannot reach — "deal with the ones
 * on my left first", "save the beam, freeze it instead" — which is exactly
 * where a language model earns its latency.
 */

/**
 * Words that name an ability. Keyed by element, matched longest-first so
 * "frost lance" wins over a bare "frost".
 */
const SKILL_WORDS = {
  ice: ['frost lance', 'frost', 'ice', 'icicle', 'lance', 'chill'],
  thunder: ['storm lance', 'thunder', 'lightning', 'storm', 'bolt', 'shock', 'zap'],
  meteor: ['cinder fall', 'meteor', 'comet', 'fireball', 'fire', 'burn', 'rock', 'boulder'],
  beam: ['nova beam', 'beam', 'laser', 'nova', 'ray', 'lance beam'],
  snare: ['voltaic snare', 'snare', 'trap', 'root', 'hold', 'net', 'bind'],
  glacier: ['glacial crown', 'glacier', 'crown', 'freeze', 'ice wall', 'shatter'],
  chain: ['arc chain', 'chain lightning', 'chain', 'bounce', 'jump between'],
  orb: ['void orb', 'orb', 'sphere', 'ball'],
  hail: ['hailstorm', 'hail', 'blizzard', 'ice storm', 'rain ice'],
  blink: ['blink strike', 'blink', 'teleport', 'dash', 'warp'],
  slam: ['earthsplitter', 'ground slam', 'slam', 'split'],
  rampage: ['rampage', 'charge', 'rush'],
  roar: ['battle roar', 'roar', 'shout', 'war cry'],
  leap: ['skybreaker leap', 'leap', 'jump on'],
  tempest: ['iron tempest', 'tempest', 'spin', 'whirl'],
  quake: ['worldbreaker', 'earthquake', 'quake']
};

/** Words that name a target. Order matters — the first match wins. */
const TARGET_WORDS = [
  [/\b(everything|everyone|all of them|the horde|them all)\b/i, 'all'],
  [/\b(biggest|largest|strongest|toughest|boss|golem|tank)\b/i, 'strongest'],
  [/\b(weakest|smallest|hurt|wounded|almost dead|finish)\b/i, 'weakest'],
  [/\b(group|cluster|pack|crowd|bunched|clump|most of them)\b/i, 'cluster'],
  [/\b(furthest|farthest|far one|back line|ranged|wisp)\b/i, 'farthest'],
  [/\b(nearest|closest|on me|in my face|right here)\b/i, 'nearest'],
  [/\b(brute)\b/i, 'kind:brute'],
  [/\b(imp|grunt|little|small ones)\b/i, 'kind:grunt'],
  [/\b(left)\b/i, 'left'],
  [/\b(right)\b/i, 'right'],
  [/\b(behind|back)\b/i, 'behind'],
  [/\b(ahead|forward|front)\b/i, 'ahead'],
  [/\bm(\d+)\b/i, null] // handled specially below — a literal monster id
];

const KIND_WORDS = {
  grunt: ['imp', 'grunt', 'cinder imp', 'small'],
  wisp: ['wisp', 'gloom', 'floater', 'ghost'],
  brute: ['brute', 'iron brute', 'big one'],
  golem: ['golem', 'rift golem', 'boss', 'giant']
};

/** Find every skill mentioned, in the order they appear in the sentence. */
function findSkills(text) {
  const found = [];
  for (const element of ELEMENTS) {
    for (const word of SKILL_WORDS[element] ?? []) {
      const index = text.indexOf(word);
      if (index >= 0) {
        found.push({ element, index, length: word.length });
        break;
      }
    }
  }
  // A word inside a longer match is not its own order: "hailstorm" is not
  // also a Storm Lance, "ice storm" is not also a Frost Lance.
  const kept = found.filter(
    (f) => !found.some((g) => g !== f && g.length > f.length && f.index >= g.index && f.index + f.length <= g.index + g.length)
  );
  // Sorted by position so "freeze it then meteor it" fires in that order.
  return kept.sort((a, b) => a.index - b.index);
}

function findTarget(text) {
  const id = text.match(/\bm(\d+)\b/i);
  if (id) return `m${id[1]}`;
  for (const [pattern, name] of TARGET_WORDS) {
    if (name && pattern.test(text)) return name;
  }
  return 'nearest';
}

function findKind(text) {
  for (const [kind, words] of Object.entries(KIND_WORDS)) {
    for (const word of words) if (text.includes(word)) return kind;
  }
  return null;
}

/**
 * Parse a line of chat into actions without asking the model.
 *
 * @param {string} input
 * @returns {{actions: Array, say: string}|null} null when nothing was recognised
 */
export function parseLocalIntent(input) {
  const text = ` ${input.toLowerCase().trim()} `;
  if (!text.trim()) return null;

  /* --- director commands ------------------------------------------- */

  if (/\b(next wave|start (the )?wave|send (the )?wave|bring it on|more enemies)\b/.test(text)) {
    return { actions: [{ op: 'wave' }], say: 'Opening the gate.' };
  }

  if (/\b(clear|reset|wipe|clean up|calm down|stop everything)\b/.test(text)) {
    return { actions: [{ op: 'clear' }], say: 'Field cleared.' };
  }

  if (/\b(slow ?mo|slow motion|slow down time|bullet time)\b/.test(text)) {
    return { actions: [{ op: 'slowmo', count: 1 }], say: 'Slowing it down.' };
  }
  if (/\b(normal speed|speed up|full speed|back to normal)\b/.test(text)) {
    return { actions: [{ op: 'slowmo', count: 0 }], say: 'Back to full speed.' };
  }

  const summon = text.match(/\b(?:summon|spawn|send|add|bring)\s+(?:(a|an|one|two|three|four|five|\d+)\s+)?/);
  if (summon) {
    const kind = findKind(text);
    if (kind) {
      const words = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5 };
      const raw = summon[1] ?? '1';
      const count = words[raw] ?? Math.max(1, Math.min(12, parseInt(raw, 10) || 1));
      return {
        actions: [{ op: 'summon', kind, count }],
        say: `Summoning ${count} ${kind}${count > 1 ? 's' : ''}.`
      };
    }
  }

  /* --- casts -------------------------------------------------------- */

  const skills = findSkills(text);
  if (!skills.length) return null;

  const target = findTarget(text);
  const actions = skills.slice(0, 4).map((skill) => ({
    op: 'cast',
    skill: skill.element,
    target
  }));

  const names = skills.map((skill) => ELEMENT_META[skill.element].label);
  return {
    actions,
    say: `${names.join(', then ')} — ${describeTarget(target)}.`
  };
}

/** Human-readable version of a resolved target token, for the chat log. */
export function describeTarget(target) {
  if (target?.startsWith?.('kind:')) return `the ${target.slice(5)}s`;
  if (/^m\d+$/.test(target ?? '')) return target;
  return (
    {
      all: 'everything',
      strongest: 'the biggest one',
      weakest: 'the weakest one',
      cluster: 'the thickest of them',
      farthest: 'the one furthest out',
      nearest: 'whatever is closest',
      left: 'to my left',
      right: 'to my right',
      behind: 'behind me',
      ahead: 'straight ahead'
    }[target] ?? 'whatever is closest'
  );
}
