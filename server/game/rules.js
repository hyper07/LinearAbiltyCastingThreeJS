import { settings } from '../../src/config/settings.js';

/**
 * What a fair game looks like, in numbers the server can check — and what
 * happens to an account that keeps breaking them.
 *
 * Every rule break is a *strike* with a weight. Strikes count for a day;
 * when they add up to `STRIKES_TO_BLOCK`, the account is blocked, and each
 * block lasts longer than the last. Weights are set so a flaky connection or
 * an honest bug costs nothing (those requests are refused without a strike)
 * and only things a normal client never sends add up.
 */

export const LIMITS = {
  /** Kills one run may report in any 60 seconds (a full party wave, generously). */
  killsPerMinute: 150,
  /** Seconds a wave takes at the very least: the breather plus a few spawns. */
  secondsPerWave: 5,
  /** Seconds between two boss kills in one run. */
  bossGap: 45,
  /** Seconds a party member has to claim a kill made by the host. */
  partyKillWindow: 60,
  /** Study rewards: at most one per this many seconds, and so many per tutor per run. */
  studyGap: 1.5,
  studyPerNpc: 120,
  /** How long an item stays on a floor after its run ends. */
  floorMinutes: 30,
  /** A run with no word from it for this long is over. */
  runIdleMinutes: 120
};

export const STRIKES_TO_BLOCK = 3;
/** Block lengths, in hours: first, second, third and every later block. */
export const BLOCK_HOURS = [24, 24 * 7, 24 * 365 * 100];

/** Rule ids and their weight. */
export const RULES = {
  'wave-too-fast': { weight: 1, text: 'reported a wave earlier than waves can arrive' },
  'kind-not-in-run': { weight: 1, text: 'reported a monster that this level does not have' },
  'kill-rate': { weight: 1, text: 'reported kills faster than monsters can arrive' },
  'boss-rate': { weight: 1, text: 'reported bosses faster than they can arrive' },
  'foreign-take': { weight: 1, text: 'tried to take an item from another game' },
  'not-in-party': { weight: 0.5, text: "claimed a party's kill without being in the party" },
  'unknown-kill': { weight: 0.5, text: 'claimed a kill that never happened' },
  'not-owner': { weight: 1, text: 'acted on an item it does not own' },
  'state-mismatch': { weight: 1, text: 'a change left the character in a state the rules do not allow' },
  'study-rate': { weight: 0.5, text: 'answered study questions faster than they can be read' },
  'bad-request': { weight: 0.25, text: 'sent a request no game client sends' },
  'tampered-save': { weight: 0, text: "the saved character failed its seal (changed outside the server)" }
};

/** A rule break: the request is refused and the account takes a strike. */
export class Violation extends Error {
  constructor(rule, detail = '') {
    super(RULES[rule]?.text ?? rule);
    this.rule = rule;
    this.detail = detail;
    this.status = 409;
  }
}

/** A refusal that is nobody's fault (someone else took it first; the bag is full). */
export class Refusal extends Error {
  constructor(message, status = 409) {
    super(message);
    this.status = status;
  }
}

/** The wave and monster rules a run plays by: its level's, or the game's defaults. */
export function runRules(level) {
  const waves = settings.waves;
  const kinds = settings.monsters.kinds;
  const weights = Object.fromEntries(Object.entries(kinds).map(([k, c]) => [k, c.weight ?? 1]));
  const out = { bossEvery: waves.bossEvery, dragonEvery: waves.dragonEvery, weights, standing: new Set(), calm: false, goal: 'waves', count: 0 };
  if (!level) return out;
  const r = level.rules ?? {};
  out.bossEvery = r.bossEvery ?? out.bossEvery;
  out.dragonEvery = r.goal === 'boss' ? r.count : r.dragonEvery ?? out.dragonEvery;
  out.goal = r.goal;
  out.count = r.count;
  out.calm = Boolean(r.calm);
  for (const [k, w] of Object.entries(r.kinds ?? {})) if (!kinds[k]?.boss) out.weights[k] = w;
  if (!Object.entries(out.weights).some(([k, w]) => !kinds[k]?.boss && w > 0)) out.weights.grunt = 1;
  for (const m of level.monsters ?? []) out.standing.add(m.kind);
  // A battle royale's rivals are its whole field, whatever the weights say (game/royale).
  if (r.goal === 'royale') out.standing.add('rival');
  return out;
}

/** Could this run have produced a monster of this kind on this wave? */
export function kindAllowed(rules, kind, wave) {
  const config = settings.monsters.kinds[kind];
  if (!config) return false;
  if (rules.standing.has(kind)) return true;
  if (rules.calm) return false;
  if (kind === 'dragon') return rules.dragonEvery > 0 && wave >= rules.dragonEvery;
  if (kind === 'golem' && rules.bossEvery > 0 && wave >= rules.bossEvery) return true;
  return (rules.weights[kind] ?? 0) > 0;
}

/** The highest wave a run could have reached after `seconds`. */
export function maxWave(seconds) {
  return 1 + Math.floor(Math.max(0, seconds) / LIMITS.secondsPerWave);
}
