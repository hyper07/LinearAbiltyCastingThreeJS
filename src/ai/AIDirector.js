import { Vector3 } from 'three';

import { settings, ELEMENTS, ELEMENT_META } from '../config/settings.js';
import { clamp } from '../utils/math.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import { parseLocalIntent, describeTarget } from './LocalIntent.js';

const _target = new Vector3();

const ENDPOINT = './api/ai';

/** Every operation the commander is allowed to perform. */
const OPS = ['cast', 'summon', 'wave', 'clear', 'slowmo', 'none'];
const KINDS = ['grunt', 'wisp', 'brute', 'golem', 'none'];

/**
 * The JSON schema the model is constrained to.
 *
 * Flat and fully-required on purpose. A discriminated union would be tidier to
 * read, but strict schema modes compile to a grammar, and a grammar over a
 * union of variable-shaped objects is where small local models start producing
 * plausible-looking nonsense. One shape with every field present — unused ones
 * filled with `"none"` and `0` — is a grammar a 4B model cannot fall out of.
 *
 * The `skill` enum is built from `ELEMENTS`, so a model *cannot* name an
 * ability that does not exist: the constraint is the registry itself, not a
 * validation pass after the fact. Add a seventh ability and the commander can
 * use it with no further work.
 */
const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    say: { type: 'string' },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          op: { type: 'string', enum: OPS },
          skill: { type: 'string', enum: [...ELEMENTS, 'none'] },
          target: { type: 'string' },
          kind: { type: 'string', enum: KINDS },
          count: { type: 'integer' }
        },
        required: ['op', 'skill', 'target', 'kind', 'count'],
        additionalProperties: false
      }
    }
  },
  required: ['say', 'actions'],
  additionalProperties: false
};

/**
 * Chat that casts.
 *
 * You type a sentence; something on the field dies. The pipeline is:
 *
 *   1. `parseLocalIntent` gets first refusal — a keyword hit answers instantly.
 *   2. Otherwise the sentence goes to the model with a **snapshot** of the
 *      battlefield (what is alive, where, how hurt, what is off cooldown) and
 *      the schema above.
 *   3. Whatever comes back is re-validated against the real registry, its fuzzy
 *      targets are resolved to actual world positions, and the actions are
 *      queued and fired with a beat between them.
 *
 * Step 3 is the important one. The model is treated as an *untrusted planner*,
 * never as an executor: it proposes `{op, skill, target}` and this class decides
 * whether that ability exists, whether it is off cooldown, whether the target
 * resolves to anything and where the cast actually points. A hallucinated skill
 * name, a monster id that died two seconds ago and a request for a hundred
 * golems all fail the same way — quietly, with a line in the chat log.
 *
 * Emits: `message` (role, text), `busy` (bool), `status` (state, detail).
 */
export class AIDirector extends EventEmitter {
  /**
   * @param {object} host the small surface the commander is allowed to drive
   * @param {() => object} host.snapshot  battlefield state, as plain data
   * @param {() => Array}  host.monsters  live monsters `{id, kind, health, position}`
   * @param {() => Vector3} host.origin   the caster's feet
   * @param {() => number} host.facing    the caster's heading, radians
   * @param {(element: string, point: Vector3) => boolean} host.cast
   * @param {(kind: string, count: number) => number} host.summon
   * @param {() => void} host.wave
   * @param {() => void} host.clear
   * @param {(on: boolean) => void} host.slowmo
   */
  constructor(host) {
    super();
    this.host = host;

    this.online = false;
    this.model = null;
    this.busy = false;
    /** Actions waiting to fire, one every `settings.ai.actionDelay`. */
    this.queue = [];
    this._timer = 0;
    /** Rolling conversation, trimmed — the model only needs the recent turns. */
    this.history = [];
  }

  /* ------------------------------------------------------------------ */
  /* connection                                                          */
  /* ------------------------------------------------------------------ */

  /** Probe the bridge. Never throws — offline is a normal state here. */
  async connect() {
    try {
      const response = await fetch(`${ENDPOINT}/status`, { method: 'GET' });
      const body = await response.json();
      this.online = Boolean(body?.ok);
      this.model = body?.model ?? null;
      this.emit(
        'status',
        this.online ? 'online' : 'offline',
        this.online ? this.model : (body?.error ?? 'no bridge')
      );
    } catch (error) {
      this.online = false;
      this.emit('status', 'offline', 'no bridge');
    }
    return this.online;
  }

  /* ------------------------------------------------------------------ */
  /* the turn                                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Handle one line of chat.
   * @param {string} input
   */
  async send(input) {
    const text = input.trim();
    if (!text) return;

    this.emit('message', 'player', text);

    // The fast path. A recognised phrase never waits on a model.
    const local = parseLocalIntent(text);
    if (local) {
      this._enqueue(local.actions, local.say, 'reflex');
      return;
    }

    if (!settings.ai.enabled) {
      this.emit('message', 'system', 'The commander is switched off (settings → AI).');
      return;
    }

    if (!this.online) {
      this.emit(
        'message',
        'system',
        "I don't recognise that, and the model isn't reachable. Try naming an ability — \"meteor the big one\"."
      );
      return;
    }

    this._setBusy(true);
    try {
      const plan = await this._ask(text);
      if (!plan) return;
      this._enqueue(plan.actions, plan.say, 'model');
    } catch (error) {
      this.emit('message', 'system', `The model didn't answer: ${error.message}`);
    } finally {
      this._setBusy(false);
    }
  }

  _setBusy(busy) {
    this.busy = busy;
    this.emit('busy', busy);
  }

  /** One constrained completion. */
  async _ask(text) {
    const snapshot = this.host.snapshot();
    const messages = [
      { role: 'system', content: this._systemPrompt() },
      ...this.history.slice(-4),
      { role: 'user', content: `${this._describeField(snapshot)}\n\nOrder: ${text}` }
    ];

    const response = await fetch(`${ENDPOINT}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        schema: PLAN_SCHEMA,
        temperature: settings.ai.temperature,
        maxTokens: 500
      })
    });

    const body = await response.json();
    if (!response.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);

    const content = body?.choices?.[0]?.message?.content ?? '';
    let plan;
    try {
      plan = JSON.parse(content);
    } catch {
      // Schema mode should make this impossible, but a model that ignores it
      // usually still emits a JSON object somewhere in its prose.
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('unparseable answer');
      plan = JSON.parse(match[0]);
    }

    this.history.push({ role: 'user', content: text });
    this.history.push({ role: 'assistant', content });
    if (this.history.length > 8) this.history.splice(0, this.history.length - 8);

    return plan;
  }

  /**
   * The system prompt.
   *
   * Built from the registry rather than written out, so it can never drift from
   * what the game actually has. Every ability's real range, cooldown, shape and
   * status is stated, because those are the facts a good order depends on —
   * telling the model "snare is a 20 m circle that roots for 3.5 s" is what
   * makes it choose the snare when you say "hold them off me".
   */
  _systemPrompt() {
    const abilities = ELEMENTS.map((element) => {
      const ability = settings[element];
      const combat = settings.combat[element] ?? {};
      const meta = ELEMENT_META[element];
      const shape = meta.cast === 'zone' ? `circle r=${ability.zoneRadius}m` : 'line';
      const status = combat.status ? `, applies ${combat.status} ${combat.duration}s` : '';
      return `- ${element} ("${meta.label}"): ${shape}, range ${ability.range}m, ${combat.damage} damage, ${ability.cooldown}s cooldown${status}`;
    }).join('\n');

    return [
      'You are the battle commander for a lone battle mage standing in a ruined keep.',
      'The player types an order; you turn it into ability casts.',
      '',
      'Abilities:',
      abilities,
      '',
      'Statuses: chill slows, shock stuns briefly, burn ticks damage, root holds in place,',
      'freeze locks a monster solid — and a frozen monster hit by meteor SHATTERS for double damage.',
      'Chaining glacier then meteor onto the same target is the strongest play in the game.',
      '',
      'Answer with JSON only, matching the schema.',
      'For a cast: op="cast", skill=the ability id, target=one of the monster ids from the field report,',
      'or one of: nearest, farthest, strongest, weakest, cluster, all, left, right, ahead, behind.',
      'Other ops: "summon" (kind + count), "wave" (send the next wave), "clear", "slowmo" (count 1 on, 0 off).',
      `Give at most ${settings.ai.maxActions} actions. Unused fields must be "none" or 0.`,
      '"say" is one short line of radio chatter back to the player — under 12 words.'
    ].join('\n');
  }

  /** The battlefield, as a few lines of plain text the model can reason over. */
  _describeField(snapshot) {
    if (!snapshot.monsters.length) {
      return `Field: clear. Wave ${snapshot.wave}. Your health ${snapshot.health}%. Ready: ${snapshot.ready.join(', ') || 'none'}.`;
    }

    const rows = snapshot.monsters
      .slice(0, 12)
      .map((monster) => {
        const status = monster.statuses.length ? ` [${monster.statuses.join(',')}]` : '';
        return `  ${monster.id} ${monster.kind} ${monster.health}%hp ${monster.distance}m ${monster.bearing}${status}`;
      })
      .join('\n');

    return [
      `Field report — wave ${snapshot.wave}, your health ${snapshot.health}%.`,
      `${snapshot.monsters.length} hostiles:`,
      rows,
      `Off cooldown: ${snapshot.ready.join(', ') || 'none'}.`
    ].join('\n');
  }

  /* ------------------------------------------------------------------ */
  /* execution                                                           */
  /* ------------------------------------------------------------------ */

  _enqueue(actions, say, source) {
    if (say && settings.ai.narrate) this.emit('message', 'ai', say, { source });

    const accepted = (actions ?? [])
      .filter((action) => action && OPS.includes(action.op ?? 'cast') && action.op !== 'none')
      .slice(0, Math.max(1, settings.ai.maxActions));

    if (!accepted.length) {
      this.emit('message', 'system', 'Nothing actionable in that.');
      return;
    }

    for (const action of accepted) this.queue.push(action);
    // Fire the first one on the next frame rather than instantly, so the chat
    // line lands before the screen erupts.
    this._timer = Math.min(this._timer, 0.05);
  }

  /** @param {number} dt real seconds */
  update(dt) {
    if (!this.queue.length) return;
    this._timer -= dt;
    if (this._timer > 0) return;

    const action = this.queue.shift();
    this._timer = Math.max(0.05, settings.ai.actionDelay);
    this._execute(action);
  }

  _execute(action) {
    switch (action.op ?? 'cast') {
      case 'cast':
        this._executeCast(action);
        break;

      case 'summon': {
        const kind = KINDS.includes(action.kind) && action.kind !== 'none' ? action.kind : 'grunt';
        const count = clamp(Math.round(action.count || 1), 1, 8);
        const spawned = this.host.summon(kind, count);
        this.emit(
          'message',
          'system',
          spawned > 0
            ? `Summoned ${spawned} × ${kind}.`
            : "The field is full — nothing else can get in."
        );
        break;
      }

      case 'wave':
        this.host.wave();
        break;

      case 'clear':
        this.host.clear();
        this.emit('message', 'system', 'Field cleared.');
        break;

      case 'slowmo':
        this.host.slowmo(Math.round(action.count ?? 1) !== 0);
        break;

      default:
        break;
    }
  }

  _executeCast(action) {
    const element = ELEMENTS.includes(action.skill) ? action.skill : null;
    if (!element) {
      this.emit('message', 'system', `No such ability: "${action.skill}".`);
      return;
    }

    const point = this.resolveTarget(action.target, element);
    if (!point) {
      this.emit('message', 'system', `Nothing to hit ${describeTarget(action.target)}.`);
      return;
    }

    const fired = this.host.cast(element, point);
    if (!fired) {
      this.emit('message', 'system', `${ELEMENT_META[element].label} is still cooling down.`);
    }
  }

  /* ------------------------------------------------------------------ */
  /* targeting                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Turn a fuzzy target word into a point on the floor.
   *
   * This is where the model's vagueness is made concrete, and it is why the
   * commander can be given orders in the language people actually use. "The
   * thickest of them" is not a position — but it is a well-defined *query*, and
   * answering it well (the point that covers the most bodies within the
   * ability's own footprint) is what makes an AoE order land the way the player
   * pictured it.
   *
   * @param {string} token
   * @param {string} element which ability is being aimed — bounds the answer
   * @returns {Vector3|null}
   */
  resolveTarget(token, element) {
    const monsters = this.host.monsters();
    const origin = this.host.origin();
    const ability = settings[element];
    const word = String(token ?? '').trim().toLowerCase();

    /* explicit id */
    const byId = monsters.find((monster) => monster.id === word);
    if (byId) return _target.copy(byId.position);

    /* a kind name, e.g. "kind:golem" or just "golem" */
    const kindMatch = word.startsWith('kind:') ? word.slice(5) : word;
    const ofKind = monsters.filter((monster) => monster.kind === kindMatch);
    if (ofKind.length) return _target.copy(this._nearestOf(ofKind, origin).position);

    switch (word) {
      case '':
      case 'nearest':
      case 'closest':
        return monsters.length ? _target.copy(this._nearestOf(monsters, origin).position) : null;

      case 'farthest':
      case 'furthest': {
        if (!monsters.length) return null;
        let best = monsters[0];
        let bestDistance = -1;
        for (const monster of monsters) {
          const distance = monster.position.distanceToSquared(origin);
          if (distance > bestDistance) {
            bestDistance = distance;
            best = monster;
          }
        }
        return _target.copy(best.position);
      }

      case 'strongest':
      case 'biggest':
      case 'boss':
        if (!monsters.length) return null;
        return _target.copy(
          monsters.reduce((a, b) => (b.health > a.health ? b : a)).position
        );

      case 'weakest':
      case 'lowest':
        if (!monsters.length) return null;
        return _target.copy(
          monsters.reduce((a, b) => (b.health < a.health ? b : a)).position
        );

      case 'all':
      case 'everything':
      case 'cluster':
      case 'group':
        return this._bestCluster(monsters, element);

      case 'self':
      case 'me':
      case 'here':
        return _target.copy(origin);

      case 'left':
      case 'right':
      case 'ahead':
      case 'forward':
      case 'behind':
      case 'back':
        return this._byBearing(word, origin, ability);

      default:
        // An unrecognised word is treated as "whatever is closest" rather than
        // as a failure: the player said *something*, and doing the obvious
        // thing beats an error message mid-fight.
        return monsters.length ? _target.copy(this._nearestOf(monsters, origin).position) : null;
    }
  }

  _nearestOf(monsters, origin) {
    let best = monsters[0];
    let bestDistance = Infinity;
    for (const monster of monsters) {
      const distance = monster.position.distanceToSquared(origin);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = monster;
      }
    }
    return best;
  }

  /**
   * The point that catches the most bodies.
   *
   * Every monster is tried as a centre and scored by how many others fall inside
   * the ability's own footprint — O(n²) over at most a couple of dozen bodies,
   * which is nothing, and it gives a genuinely good answer rather than the
   * centroid (which in a ring of enemies points at empty floor between them).
   */
  _bestCluster(monsters, element) {
    if (!monsters.length) return null;
    const radius = Math.max(2.5, settings[element].zoneRadius ?? settings.combat[element]?.splash ?? 3);

    let best = monsters[0];
    let bestScore = -1;
    for (const candidate of monsters) {
      let score = 0;
      for (const other of monsters) {
        if (other.position.distanceTo(candidate.position) <= radius) score += 1;
      }
      // Ties break toward the wounded, so a repeat order finishes what it began.
      const tiebreak = 1 - healthFraction(candidate);
      if (score + tiebreak > bestScore) {
        bestScore = score + tiebreak;
        best = candidate;
      }
    }
    return _target.copy(best.position);
  }

  /** A point out along a bearing relative to where the caster is facing. */
  _byBearing(word, origin, ability) {
    const facing = this.host.facing();
    const offset = { left: -Math.PI / 2, right: Math.PI / 2, behind: Math.PI, back: Math.PI }[word] ?? 0;
    const yaw = facing + offset;
    const distance = clamp(ability.range * 0.6, ability.minRange + 1, ability.range);
    return _target.set(
      origin.x + Math.sin(yaw) * distance,
      0,
      origin.z + Math.cos(yaw) * distance
    );
  }

  dispose() {
    this.queue.length = 0;
    this.history.length = 0;
    super.clear();
  }
}

/** Health as a 0..1 fraction. Used only to break cluster-score ties. */
function healthFraction(monster) {
  return clamp((monster.health ?? monster.maxHealth ?? 1) / Math.max(1, monster.maxHealth ?? 1), 0, 1);
}
