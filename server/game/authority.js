import { AsyncLocalStorage } from 'node:async_hooks';
import { platform, classArmor, classBonuses } from '../../src/platform/index.js';
import { Profile } from '../../src/items/Profile.js';
import { XP_FOR, buyPrice, itemValue, makeBagRowOffer, makeBook, makeGear, makeGold, makePotion, makeWeapon, merchantStock, rollLoot } from '../../src/items/Items.js';
import { treeSpells } from '../../src/platform/skill/tree.js';
import { settings } from '../../src/config/settings.js';
import { newId } from './keys.js';
import { LIMITS, Refusal, RULES, STRIKES_TO_BLOCK, BLOCK_HOURS, Violation, kindAllowed, maxWave, runRules } from './rules.js';

platform.bootstrap();

/** The game a request is about (see GameAuthority#inGame). */
const scope = new AsyncLocalStorage();
/**
 * Where a character lives: the open arena, or a game (a builder draft, an
 * official level, a published game) and a class in it — `<game>#<class>`.
 * Each class is its own character in each game: a new one starts at level 1.
 */
export const GAME_SCOPE = /^(arena|(draft|official:[a-z0-9_-]{1,64}|g-[a-z0-9-]{1,60})(#[a-z][a-z0-9-]{1,63})?)$/;
/** The game part of a scope (`official:thistledown#mage` → `official:thistledown`). */
export const gameOfScope = (scope) => String(scope).split('#')[0];

/**
 * The authority: the only place a character changes.
 *
 * A browser never sends an item. It refers to things the server made — a
 * drop on the floor (by id), a shop offer, a monster it reports dead — and
 * asks for something to happen; the server checks, does it with the very
 * same rules the game uses (src/items/Profile.js), and stores the result.
 * The browser runs the same rules at the same time so the game feels
 * instant, and takes the server's copy whenever the two differ.
 *
 * A player has one character **per game**: what is earned in one game stays in
 * it. Each request runs `inGame(game, …)`, and every character, item and gold
 * change below belongs to that game. Fight actions take the game from their
 * run (the server's, never the browser's); the rest from the request, checked.
 *
 * Every method here is async (PostgreSQL), and the game server calls them one
 * request at a time (Database#serial), so a character is never read by one
 * request while another is half-way through changing it.
 *
 * Every change runs inside one database transaction together with its
 * bookkeeping — the item registry, the gold ledger, the history — and is
 * checked afterwards: the set of items a character holds may only change in
 * the ways that action allows (a pickup adds exactly the item picked up, a
 * sale removes exactly the item sold, moving things around changes nothing
 * but places), and gold, potions and experience likewise. Anything else
 * rolls the whole transaction back.
 *
 * Runs (one fight in one level) live in memory: who is in it, what was
 * killed, what was given, what the merchants offer.
 */
export class GameAuthority {
  /**
   * @param {{ db: import('../db/database.js').Database, keys: import('./keys.js').Keys, history: import('./db.js').History,
   *           loadLevel?: (id: string) => Promise<object|null>, sameParty?: (a: number, b: number) => boolean,
   *           now?: () => number, log?: (line: string) => void }} ctx
   */
  constructor({ db, keys, history, loadLevel = async () => null, sameParty = () => false, now = () => Date.now(), log = () => {} }) {
    this.db = db;
    this.keys = keys;
    this.history = history;
    this.loadLevel = loadLevel;
    this.sameParty = sameParty;
    this.now = now;
    this.log = log;
    /** `${accountId}|${game}` → Profile (the live copy of each character in play) */
    this.characters = new Map();
    /** runId → run */
    this.runs = new Map();
    this._sweepAt = 0;
  }

  /* ------------------------------------------------------------------ */
  /* characters                                                          */
  /* ------------------------------------------------------------------ */

  /** The game this request is about ('arena' outside any). */
  get game() {
    return scope.getStore() ?? 'arena';
  }

  /** Run `fn` for one game: every character, item and coin it touches is that game's. */
  inGame(game, fn) {
    return scope.run(GAME_SCOPE.test(String(game ?? '')) ? String(game) : 'arena', fn);
  }

  _key(accountId) {
    return `${accountId}|${this.game}`;
  }

  /** What a saved character is sealed to: its account, and (outside the arena) its game. */
  _seal(accountId) {
    return this.game === 'arena' ? `character:${accountId}` : `character:${accountId}:${this.game}`;
  }

  /** This account's characters in a game, one per class: what the lobby shows. */
  async charactersIn(accountId, game) {
    const like = `${String(game).replace(/[\\%_]/g, (c) => `\\${c}`)}#%`;
    const rows = await this.db.many('SELECT game, state, updated FROM characters WHERE account_id = ? AND game LIKE ?', [accountId, like]);
    const out = [];
    for (const row of rows) {
      try {
        const data = this.keys.open(row.state, `character:${accountId}:${row.game}`);
        out.push({ classId: row.game.split('#')[1], level: data.level ?? 1, gold: data.gold ?? 0, updated: row.updated });
      } catch {
        /* a row that does not open is the audit's business */
      }
    }
    return out;
  }

  /** A blank character — every player starts each game with one. */
  async createCharacter(accountId) {
    const profile = new Profile({ storage: null, data: null });
    profile.setClass('caster', classBonuses('caster'), classArmor('caster'));
    await this._store(accountId, profile, 1);
    this.characters.set(this._key(accountId), profile);
    return profile;
  }

  /** The live character in this game, opened from the database the first time. */
  async character(accountId) {
    let profile = this.characters.get(this._key(accountId));
    if (profile) return profile;
    const row = await this.db.one('SELECT state, version FROM characters WHERE account_id = ? AND game = ?', [accountId, this.game]);
    if (!row) return this.createCharacter(accountId);
    let data;
    try {
      data = this.keys.open(row.state, this._seal(accountId));
    } catch {
      // The row was edited, copied from another account, or corrupted outside
      // the server. It is never trusted: the account is frozen for a person to look at.
      await this._tampered(accountId);
      throw new Refusal('Your saved character failed its integrity check. It has been locked for review.', 423);
    }
    profile = new Profile({ storage: null, data });
    profile.version = row.version;
    profile.setClass('caster', classBonuses('caster'), classArmor('caster'));
    this.characters.set(this._key(accountId), profile);
    if (this.characters.size > 5000) this.characters.delete(this.characters.keys().next().value);
    return profile;
  }

  async _store(accountId, profile, version) {
    const sealed = this.keys.seal(profile.serialize(), this._seal(accountId));
    const now = this.now();
    await this.db.run(
      `INSERT INTO characters (account_id, game, state, version, updated) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (account_id, game) DO UPDATE SET state = excluded.state, version = excluded.version, updated = excluded.updated`,
      [accountId, this.game, sealed, version, now]
    );
    profile.version = version;
  }

  async _tampered(accountId) {
    try {
      await this.db.tx(async () => {
        await this.db.run("UPDATE accounts SET blocked_until = ?, block_reason = 'saved character failed its integrity check — under review' WHERE id = ?", [this.now() + 100 * 365 * 864e5, accountId]);
        await this.history.add(accountId, 'tampered', { what: 'character seal' }, this.now());
      });
    } catch {
      /* already recorded */
    }
    this.log(`[game] account ${accountId}: character failed its seal — blocked for review`);
  }

  /** What the browser gets: the character and its fingerprint. */
  async view(accountId) {
    const profile = await this.character(accountId);
    return { state: profile.serialize(), version: profile.version, digest: profile.digest() };
  }

  /**
   * Change a character: `fn(profile, tx)` inside one transaction, then the
   * checks, then the save. `allow` says what this change may do:
   *   added:   item ids it may add      removed: { uid: 'sold'|'used'|'floor'|'destroyed' }
   *   gold:    exact gold change         potions: exact change per kind
   *   xp:      whether XP may change
   * The registry, ledger and history are written by `fn` through `tx`.
   */
  async _mutate(accountId, allow, fn) {
    const profile = await this.character(accountId);
    const before = snapshot(profile);
    let result;
    try {
      result = await this.db.tx(async () => {
        const out = await fn(profile);
        const after = snapshot(profile);
        const problem = checkChange(before, after, allow);
        if (problem) throw new Violation('state-mismatch', problem);
        await this._registry(accountId, before, after, allow);
        if (after.gold !== before.gold) await this._ledger(accountId, after.gold - before.gold, after.gold, allow.reason ?? 'change', allow.ref);
        if (after.level > before.level) await this.history.add(accountId, 'level', { level: after.level }, this.now());
        await this._store(accountId, profile, (profile.version ?? 0) + 1);
        return out;
      });
    } catch (error) {
      // The live copy may be half-changed: forget it, the database still has the truth.
      this.characters.delete(this._key(accountId));
      throw error;
    }
    return { result, digest: profile.digest(), version: profile.version };
  }

  /** Bring the item registry in line with what the change did. */
  async _registry(accountId, before, after, allow) {
    const now = this.now();
    for (const uid of after.uids) {
      if (before.uids.has(uid)) continue;
      // Added: it must already be this account's (taken from the floor, made
      // for it in this transaction) — never an id the registry gives to someone else.
      const row = await this.db.one('SELECT owner, state, game FROM items WHERE uid = ?', [uid]);
      if (!row || row.owner !== accountId || row.state !== 'held' || row.game !== this.game) throw new Violation('state-mismatch', `item ${uid} appeared without being given`);
    }
    for (const uid of before.uids) {
      if (after.uids.has(uid)) continue;
      const to = allow.removed?.[uid];
      const changed = (
        await this.db.run(`UPDATE items SET state = ?, owner = CASE WHEN ?::text = 'floor' THEN NULL ELSE owner END, run = ?, updated = ? WHERE uid = ? AND owner = ? AND state = 'held' AND game = ?`, [
          to ?? null, to ?? null, to === 'floor' ? allow.run ?? null : null, now, uid, accountId, this.game
        ])
      ).rowCount;
      if (!changed) throw new Violation('not-owner', `item ${uid} is not held by this account`);
    }
  }

  async _ledger(accountId, delta, balance, reason, ref = null) {
    await this.db.run('INSERT INTO ledger (account_id, game, delta, balance, reason, ref, at) VALUES (?, ?, ?, ?, ?, ?, ?)', [accountId, this.game, delta, balance, reason, ref, this.now()]);
  }

  /** Make an item and register it: held by an account, or lying on a run's floor. */
  async _create(item, { owner = null, run = null, source }) {
    item.uid = newId('i');
    item.srv = 1;
    const now = this.now();
    await this.db.run('INSERT INTO items (uid, owner, state, run, source, data, created, updated, game) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [item.uid, owner, owner ? 'held' : 'floor', run, source, item, now, now, this.game]);
    return item;
  }

  /* ------------------------------------------------------------------ */
  /* accounts in trouble                                                 */
  /* ------------------------------------------------------------------ */

  /** Throw if the account may not play right now. */
  async assertActive(accountId) {
    const row = await this.db.one('SELECT blocked_until, block_reason FROM accounts WHERE id = ?', [accountId]);
    if (!row) throw new Refusal('No such account', 401);
    if (row.blocked_until > this.now()) {
      const error = new Refusal(`This account is blocked until ${new Date(row.blocked_until).toISOString().slice(0, 16).replace('T', ' ')} UTC: ${row.block_reason ?? 'rule breaks'}`, 403);
      error.blocked = { until: row.blocked_until, reason: row.block_reason };
      throw error;
    }
  }

  /**
   * Record a rule break; enough of them in a day block the account, each
   * block longer than the last. Returns the block, if one started.
   */
  async strike(accountId, rule, detail = '') {
    const weight = RULES[rule]?.weight ?? 1;
    const now = this.now();
    let blocked = null;
    await this.db.tx(async () => {
      await this.db.run('INSERT INTO strikes (account_id, rule, weight, detail, at) VALUES (?, ?, ?, ?, ?)', [accountId, rule, weight, String(detail).slice(0, 300), now]);
      await this.history.add(accountId, 'strike', { rule, detail: String(detail).slice(0, 200) }, now);
      const total = (await this.db.one('SELECT COALESCE(SUM(weight), 0) AS w FROM strikes WHERE account_id = ? AND at > ?', [accountId, now - 864e5])).w;
      if (total >= STRIKES_TO_BLOCK) {
        const account = await this.db.one('SELECT blocks, blocked_until FROM accounts WHERE id = ?', [accountId]);
        if (account.blocked_until <= now) {
          const hours = BLOCK_HOURS[Math.min(account.blocks, BLOCK_HOURS.length - 1)];
          const until = now + hours * 36e5;
          const reason = `repeated rule breaks (last: ${RULES[rule]?.text ?? rule})`;
          await this.db.run('UPDATE accounts SET blocked_until = ?, block_reason = ?, blocks = blocks + 1 WHERE id = ?', [until, reason, accountId]);
          await this.db.run('DELETE FROM sessions WHERE account_id = ?', [accountId]);
          await this.history.add(accountId, 'blocked', { until, reason, hours }, now);
          blocked = { until, reason };
        }
      }
    });
    this.log(`[game] strike: account ${accountId} ${rule}${detail ? ` (${detail})` : ''}${blocked ? ' → BLOCKED' : ''}`);
    return blocked;
  }

  /* ------------------------------------------------------------------ */
  /* runs                                                                */
  /* ------------------------------------------------------------------ */

  _run(runId, accountId, { owner = false } = {}) {
    const run = this.runs.get(String(runId ?? ''));
    if (!run || run.ended) throw new Refusal('That game is over', 410);
    if (owner && run.owner !== accountId) throw new Violation('bad-request', 'only the host reports kills');
    if (!run.members.has(accountId)) throw new Violation('not-in-party', `run ${run.id}`);
    run.seen = this.now();
    return run;
  }

  /** Start a run: the host (or a solo player) is fighting in `levelId` (null: free play). */
  async startRun(accountId, { level: levelId = null, classId = 'caster' } = {}) {
    await this.assertActive(accountId);
    const level = levelId ? await this.loadLevel(String(levelId)) : null;
    if (levelId && !level) throw new Refusal('No such level', 404);
    await this._sweep();
    for (const run of this.runs.values()) if (run.owner === accountId && !run.ended) await this._endRun(run);
    const run = {
      id: newId('r'),
      owner: accountId,
      /** Whose characters this fight changes: the game it is part of. */
      game: this.game,
      level,
      rules: runRules(level),
      started: this.now(),
      seen: this.now(),
      members: new Map([[accountId, { classId: String(classId), joined: this.now() }]]),
      kills: new Map(),
      /** monster id → { at, accounts } : party claims that arrived before the host's report */
      early: new Map(),
      killTimes: [],
      lastBoss: -Infinity,
      claims: new Set(),
      shops: new Map(),
      study: new Map(),
      ended: false
    };
    this.runs.set(run.id, run);
    return { runId: run.id, level: level?.id ?? null, game: run.game };
  }

  /** A party member joins the host's run. They must be in the host's party. */
  async joinRun(accountId, { runId, classId = 'caster' } = {}) {
    await this.assertActive(accountId);
    const run = this.runs.get(String(runId ?? ''));
    if (!run || run.ended) throw new Refusal('That game is over', 410);
    if (run.owner !== accountId && !this.sameParty(accountId, run.owner)) throw new Violation('not-in-party', `run ${run.id}`);
    run.members.set(accountId, { classId: String(classId), joined: this.now() });
    run.seen = this.now();
    return { runId: run.id };
  }

  async endRun(accountId, { runId } = {}) {
    const run = this.runs.get(String(runId ?? ''));
    if (!run) return { ok: true };
    if (run.owner === accountId) await this._endRun(run);
    else run.members.delete(accountId);
    return { ok: true };
  }

  async _endRun(run) {
    run.ended = true;
    const kills = run.kills.size;
    try {
      await this.history.add(run.owner, 'run', { game: run.game, level: run.level?.id ?? null, kills, minutes: Math.round((this.now() - run.started) / 6e4), party: run.members.size }, this.now());
    } catch {
      /* best effort */
    }
  }

  /** Forget idle runs, and clear floors nobody will come back to. */
  async _sweep() {
    const now = this.now();
    if (now - this._sweepAt < 60_000) return;
    this._sweepAt = now;
    for (const [id, run] of this.runs) {
      if (!run.ended && now - run.seen > LIMITS.runIdleMinutes * 6e4) await this._endRun(run);
      if (run.ended && now - run.seen > LIMITS.floorMinutes * 6e4) this.runs.delete(id);
    }
    const live = [...this.runs.values()].filter((r) => !r.ended).map((r) => r.id);
    const stale = now - LIMITS.floorMinutes * 6e4;
    await this.db.run(`UPDATE items SET state = 'destroyed', updated = ? WHERE state = 'floor' AND updated < ? AND run NOT IN (SELECT jsonb_array_elements_text(?::jsonb))`, [now, stale, JSON.stringify(live)]);
  }

  /** The skill books a run drops: from every member's skill tree. */
  _bookPool(run) {
    const pool = new Set();
    for (const m of run.members.values()) for (const id of treeSpells(m.classId)) pool.add(id);
    return pool.size ? [...pool] : null;
  }

  /* ------------------------------------------------------------------ */
  /* kills, loot, the floor                                              */
  /* ------------------------------------------------------------------ */

  /**
   * The host reports a monster dead. Checked against what the run could
   * have produced, then the loot is rolled here, put on the run's floor, and
   * the host earns the experience.
   */
  async kill(accountId, { runId, monster, kind, wave } = {}) {
    await this.assertActive(accountId);
    const run = this._run(runId, accountId, { owner: true });
    monster = String(monster ?? '');
    wave = Math.floor(Number(wave) || 1);
    if (!monster || monster.length > 40 || !settings.monsters.kinds[kind] || wave < 1 || wave > 999) throw new Violation('bad-request', 'malformed kill');
    const previous = run.kills.get(monster);
    if (previous) return { duplicate: true, drops: [], xp: 0, ...(await this.view(accountId)) };

    const now = this.now();
    const seconds = (now - run.started) / 1000;
    if (wave > maxWave(seconds)) throw new Violation('wave-too-fast', `wave ${wave} after ${Math.round(seconds)} s`);
    if (!kindAllowed(run.rules, kind, wave)) throw new Violation('kind-not-in-run', `${kind} on wave ${wave}`);
    run.killTimes = run.killTimes.filter((t) => now - t < 60_000);
    if (run.killTimes.length >= LIMITS.killsPerMinute) throw new Violation('kill-rate', `${run.killTimes.length + 1} in a minute`);
    const boss = settings.monsters.kinds[kind].boss;
    if (boss && now - run.lastBoss < LIMITS.bossGap * 1000) throw new Violation('boss-rate', `${kind} ${Math.round((now - run.lastBoss) / 1000)} s after the last`);

    run.killTimes.push(now);
    if (boss) run.lastBoss = now;
    const record = { kind, wave, at: now, claimed: new Set([accountId]) };
    run.kills.set(monster, record);

    const profile = await this.character(accountId);
    const xp = Math.round((XP_FOR[kind] ?? 6) * (1 + (wave - 1) * 0.05));
    const items = rollLoot(kind, { wave, goldFind: profile.stats.gold, bookPool: this._bookPool(run) });
    const { digest, version } = await this._mutate(accountId, { xp: true, reason: 'kill' }, async (p) => {
      for (const item of items) await this._create(item, { run: run.id, source: `kill:${kind}` });
      p.addXp(xp);
    });
    // Party members whose claim arrived before this report get their share now.
    const early = run.early.get(monster);
    if (early) {
      run.early.delete(monster);
      for (const member of early.accounts) {
        if (!run.members.has(member) || record.claimed.has(member)) continue;
        record.claimed.add(member);
        try {
          await this._grantPartyXp(member, record);
        } catch (error) {
          this.log(`[game] could not pay an early claim: ${error.message}`);
        }
      }
    }
    return { drops: items, xp, digest, version };
  }

  async _grantPartyXp(accountId, kill) {
    const xp = Math.round((XP_FOR[kill.kind] ?? 6) * (1 + (kill.wave - 1) * 0.05));
    return { xp, ...(await this._mutate(accountId, { xp: true, reason: 'party-kill' }, (p) => p.addXp(xp))) };
  }

  /**
   * A party member earns the experience for the host's kill. The party hears
   * of a kill over its socket and the server from the host's request, so a
   * claim can arrive first: it is held (no strike) and paid when the host's
   * report comes, or forgotten after the window if it never does.
   */
  async partyKill(accountId, { runId, monster } = {}) {
    await this.assertActive(accountId);
    const run = this._run(runId, accountId);
    monster = String(monster ?? '');
    if (!monster || monster.length > 40) throw new Violation('bad-request', 'malformed party kill');
    const now = this.now();
    const kill = run.kills.get(monster);
    if (!kill) {
      for (const [id, e] of run.early) if (now - e.at > LIMITS.partyKillWindow * 1000) run.early.delete(id);
      if (run.early.size > 2000) throw new Refusal('Too many claims waiting', 429);
      const e = run.early.get(monster) ?? { at: now, accounts: new Set() };
      e.accounts.add(accountId);
      run.early.set(monster, e);
      return { pending: true, xp: 0 };
    }
    if (now - kill.at > LIMITS.partyKillWindow * 1000) throw new Violation('unknown-kill', `${monster.slice(0, 40)}, too late`);
    if (kill.claimed.has(accountId)) return { duplicate: true, xp: 0, ...(await this.view(accountId)) };
    kill.claimed.add(accountId);
    const { xp, digest, version } = await this._grantPartyXp(accountId, kill);
    return { xp, digest, version };
  }

  /**
   * Take an item off the floor. One row update decides who gets it: two
   * players reaching for the same item at once — on one server or many —
   * cannot both succeed.
   */
  async take(accountId, { runId, uid } = {}) {
    await this.assertActive(accountId);
    const run = this._run(runId, accountId);
    uid = String(uid ?? '');
    const row = await this.db.one('SELECT owner, state, run, data FROM items WHERE uid = ?', [uid]);
    if (!row) throw new Violation('bad-request', `no item ${uid.slice(0, 30)}`);
    if (row.state === 'floor' && row.run !== run.id) throw new Violation('foreign-take', `item from run ${row.run}`);
    if (row.state !== 'floor') throw new Refusal('Someone else got there first');
    const item = row.data;
    const profile = await this.character(accountId);
    const can = profile.canPickUp(item);
    if (!can.ok) throw new Refusal(can.message);
    const consumed = item.type === 'gold' || item.type === 'potion';
    const allow = {
      added: consumed ? [] : [uid],
      gold: item.type === 'gold' ? item.amount : 0,
      potions: item.type === 'potion' ? { [item.potion]: 1 } : {},
      reason: 'loot',
      ref: uid
    };
    const out = await this._mutate(accountId, allow, async (p) => {
      const changed = (
        await this.db.run(`UPDATE items SET owner = ?, state = ?, run = NULL, game = ?, updated = ? WHERE uid = ? AND state = 'floor' AND run = ?`, [accountId, consumed ? 'used' : 'held', this.game, this.now(), uid, run.id])
      ).rowCount;
      if (!changed) throw new Refusal('Someone else got there first');
      const r = p.pickUp(item);
      if (!r.ok) throw new Refusal(r.message);
      if (item.type !== 'gold' && item.type !== 'potion') await this.history.add(accountId, 'take', { uid, name: item.name, rarity: item.rarity }, this.now());
      return r;
    });
    return { ok: true, message: out.result.message, digest: out.digest, version: out.version };
  }

  /** Put an item down: on the floor of the run, or gone (from the menu). */
  async drop(accountId, { runId = null, uid } = {}) {
    await this.assertActive(accountId);
    const run = runId ? this._run(runId, accountId) : null;
    uid = String(uid ?? '');
    const to = run ? 'floor' : 'destroyed';
    const out = await this._mutate(accountId, { removed: { [uid]: to }, run: run?.id, reason: 'drop' }, async (p) => {
      const item = p.remove(uid, { worn: true });
      if (!item) throw new Refusal('You do not have that item');
      await this.history.add(accountId, 'drop', { uid, name: item.name, to }, this.now());
      return item;
    });
    return { ok: true, digest: out.digest, version: out.version };
  }

  /* ------------------------------------------------------------------ */
  /* the inventory rules: moving, wearing, reading, drinking, selling    */
  /* ------------------------------------------------------------------ */

  /**
   * Apply a batch of the player's own actions, in order, with the same
   * rules the browser ran. Each is checked on its own: a move changes
   * nothing but places; reading uses up exactly the book read; selling
   * removes exactly the item sold and pays exactly its value.
   */
  async ops(accountId, { ops } = {}) {
    await this.assertActive(accountId);
    if (!Array.isArray(ops) || ops.length > 50) throw new Violation('bad-request', 'ops must be a list of at most 50');
    const results = [];
    let last = null;
    for (const { op, args = [] } of ops) {
      if (!Array.isArray(args) || args.length > 4) throw new Violation('bad-request', `bad args for ${op}`);
      last = await this._op(accountId, String(op), args);
      results.push(last.result);
    }
    const character = await this.character(accountId);
    const view = last ?? { digest: character.digest(), version: character.version };
    return { results, digest: view.digest, version: view.version };
  }

  async _op(accountId, op, args) {
    const str = (v) => (typeof v === 'string' && v.length <= 80 ? v : null);
    const int = (v) => (Number.isInteger(v) && v >= 0 && v < 64 ? v : null);
    const cell = (v) => v == null || int(v) != null;
    const classOf = (v) => (str(v) && platform.characters.get(v) ? v : 'caster');
    const p = await this.character(accountId);
    const find = (uid) => [...p.bag, ...p.stash].find((it) => it.uid === uid);
    switch (op) {
      case 'move': {
        const [uid, to, x, y] = args;
        if (!str(uid) || !['bag', 'stash'].includes(to) || (x != null && int(x) == null) || (y != null && int(y) == null)) throw new Violation('bad-request', 'move');
        return this._mutate(accountId, {}, (q) => q.move(uid, to, x ?? null, y ?? null));
      }
      case 'equip':
        if (!str(args[0]) || (args[1] != null && !str(args[1]))) throw new Violation('bad-request', 'equip');
        return this._mutate(accountId, {}, (q) => Boolean(q.equip(args[0], args[1] ?? null)));
      case 'unequipGear': {
        const [slotId, x = null, y = null] = args;
        if (!str(slotId) || !cell(x) || !cell(y)) throw new Violation('bad-request', 'unequipGear');
        return this._mutate(accountId, {}, (q) => q.unequipGear(slotId, x, y));
      }
      case 'unequip': {
        const [x = null, y = null] = args;
        if (!cell(x) || !cell(y)) throw new Violation('bad-request', 'unequip');
        return this._mutate(accountId, {}, (q) => q.unequip(x, y));
      }
      case 'read': {
        const [uid, classId] = args;
        const book = str(uid) && find(uid);
        return this._mutate(accountId, { removed: book ? { [uid]: 'used' } : {}, reason: 'read' }, (q) => q.read(uid, classOf(classId)));
      }
      case 'useBagUpgrade': {
        const bag = str(args[0]) && find(args[0]);
        return this._mutate(accountId, { removed: bag ? { [args[0]]: 'used' } : {}, reason: 'bag' }, (q) => q.useBagUpgrade(args[0]));
      }
      case 'usePotion': {
        const kind = args[0];
        if (!['health', 'focus'].includes(kind)) throw new Violation('bad-request', 'usePotion');
        return this._mutate(accountId, { potions: p.potions[kind] > 0 ? { [kind]: -1 } : {} }, (q) => q.usePotion(kind));
      }
      case 'setSlot': {
        const [index, element, classId] = args;
        if (int(index) == null || !str(element)) throw new Violation('bad-request', 'setSlot');
        return this._mutate(accountId, {}, (q) => q.setSlot(index, element, classOf(classId)));
      }
      case 'clearSlot': {
        const [index, classId] = args;
        if (int(index) == null) throw new Violation('bad-request', 'clearSlot');
        return this._mutate(accountId, {}, (q) => q.clearSlot(index, classOf(classId)) ?? true);
      }
      case 'sell': {
        const item = str(args[0]) && find(args[0]);
        if (!item) throw new Refusal('Not in your bag or stash');
        const price = itemValue(item);
        return this._mutate(accountId, { removed: { [item.uid]: 'sold' }, gold: price, reason: 'sell', ref: item.uid }, async (q) => {
          const got = q.sell(item.uid);
          await this.history.add(accountId, 'sell', { uid: item.uid, name: item.name, gold: got }, this.now());
          return got;
        });
      }
      default:
        throw new Violation('bad-request', `unknown op ${op.slice(0, 20)}`);
    }
  }

  /* ------------------------------------------------------------------ */
  /* NPCs: gifts, quests, study rewards, shops                           */
  /* ------------------------------------------------------------------ */

  _npc(run, npcId) {
    const npc = run.level?.npcs?.find((n) => n.id === String(npcId ?? ''));
    if (!npc) throw new Refusal('Nobody by that name here', 404);
    return npc;
  }

  /** Give a made item to a character, or onto the floor when the bag is full. */
  async _give(accountId, run, item, source) {
    const p = await this.character(accountId);
    if (item.type === 'gold' || item.type === 'potion' || p.hasRoomFor(item)) {
      const owned = item.type !== 'gold' && item.type !== 'potion';
      if (owned) await this._create(item, { owner: accountId, source });
      else item.uid = newId('i');
      const r = p.pickUp(item);
      if (!r.ok) throw new Refusal(r.message);
      return { item, dropped: false };
    }
    await this._create(item, { run: run.id, source });
    return { item, dropped: true };
  }

  /** What `_give` will do to gold and potions, for the checks. */
  _expect(item) {
    return {
      gold: item.type === 'gold' ? item.amount : 0,
      potions: item.type === 'potion' ? { [item.potion]: 1 } : {}
    };
  }

  /** Talk to an NPC: `gift` (first meeting), `quest` (turn in), `study` (a right answer). */
  async npc(accountId, { runId, npc: npcId, action, classId = 'caster' } = {}) {
    await this.assertActive(accountId);
    const run = this._run(runId, accountId);
    const npc = this._npc(run, npcId);
    const key = `${accountId}:${npc.id}:${action}`;
    const p = await this.character(accountId);

    if (action === 'gift') {
      const g = npc.gift;
      if (!g || g.type === 'none' || run.claims.has(key)) return { given: null, ...(await this.view(accountId)) };
      run.claims.add(key);
      const item =
        g.type === 'gold' ? makeGold(g.amount)
        : g.type === 'health' || g.type === 'focus' ? makePotion(g.type)
        : g.type === 'book' ? makeBook(null, Math.random, treeSpells(classId))
        : g.type === 'gear' ? makeGear(g.rarity === 'none' ? 'magic' : g.rarity)
        : makeWeapon(g.rarity === 'none' ? 'magic' : g.rarity);
      let given;
      const out = await this._mutate(accountId, { ...this._expect(item), added: [], reason: 'gift', ref: npc.id, anyAdded: true }, async () => {
        given = await this._give(accountId, run, item, `gift:${npc.id}`);
        await this.history.add(accountId, 'gift', { npc: npc.name, item: item.name, dropped: given.dropped }, this.now());
      });
      return { given, digest: out.digest, version: out.version, state: p.serialize() };
    }

    if (action === 'quest') {
      const q = npc.quest;
      if (!q) throw new Refusal('No quest here', 404);
      if (run.claims.has(key)) throw new Refusal('Already rewarded');
      let killed = 0;
      for (const k of run.kills.values()) if (q.target === 'any' || k.kind === q.target) killed++;
      if (killed < q.count) throw new Refusal(`Not done yet: ${killed}/${q.count}`);
      run.claims.add(key);
      const reward = q.rarity === 'none' ? null : Math.random() < 0.5 ? makeWeapon(q.rarity) : makeGear(q.rarity);
      let given = null;
      const out = await this._mutate(accountId, { gold: q.gold, xp: true, anyAdded: true, reason: 'quest', ref: npc.id }, async (pp) => {
        pp.gold += q.gold;
        pp.addXp(40 + q.count * 6);
        if (reward) given = await this._give(accountId, run, reward, `quest:${npc.id}`);
        await this.history.add(accountId, 'quest', { npc: npc.name, title: q.title, gold: q.gold, item: reward?.name ?? null }, this.now());
      });
      return { gold: q.gold, given, digest: out.digest, version: out.version, state: p.serialize() };
    }

    if (action === 'study') {
      const st = npc.study;
      if (!st) throw new Refusal('Not a tutor', 404);
      const s = run.study.get(key) ?? { count: 0, at: 0 };
      const now = this.now();
      if (now - s.at < LIMITS.studyGap * 1000) throw new Violation('study-rate', `${now - s.at} ms`);
      if (s.count >= LIMITS.studyPerNpc) throw new Refusal('That is enough lessons for today');
      s.count += 1;
      s.at = now;
      run.study.set(key, s);
      const bonus = st.bonusEvery > 0 && s.count % st.bonusEvery === 0 ? (st.bonus === 'book' ? makeBook(null, Math.random, treeSpells(classId)) : makePotion(st.bonus)) : null;
      let given = null;
      const expect = bonus ? this._expect(bonus) : { gold: 0, potions: {} };
      const out = await this._mutate(accountId, { gold: st.gold + expect.gold, potions: expect.potions, anyAdded: true, reason: 'study', ref: npc.id }, async (pp) => {
        pp.gold += st.gold;
        if (bonus) given = await this._give(accountId, run, bonus, `study:${npc.id}`);
        await this.history.add(accountId, 'study', { npc: npc.name, gold: st.gold, bonus: bonus?.name ?? null }, this.now());
      });
      return { gold: st.gold, given, count: s.count, digest: out.digest, version: out.version, state: p.serialize() };
    }

    throw new Violation('bad-request', `npc action ${String(action).slice(0, 20)}`);
  }

  /** A merchant's or healer's goods: made here once per run, the prices are the server's. */
  async shop(accountId, { runId, npc: npcId, classId = 'caster', wave = 1 } = {}) {
    await this.assertActive(accountId);
    const run = this._run(runId, accountId);
    const npc = this._npc(run, npcId);
    if (npc.role !== 'merchant' && npc.role !== 'healer') throw new Refusal('Not a shop', 404);
    const key = `${accountId}:${npc.id}`;
    if (!run.shops.has(key)) {
      const w = Math.max(1, Math.min(maxWave((this.now() - run.started) / 1000), Math.floor(Number(wave) || 1)));
      const stock = npc.role === 'healer' ? [makePotion('health'), makePotion('focus')] : merchantStock(Math.random, w, treeSpells(classId));
      for (const item of stock) {
        item.uid = newId('o');
        item.srv = 1;
      }
      run.shops.set(key, stock);
    }
    const p = await this.character(accountId);
    const stock = run.shops.get(key);
    return { stock: npc.role === 'merchant' ? [...stock, makeBagRowOffer(p.rowsBought)] : stock };
  }

  async buy(accountId, { runId, npc: npcId, offer } = {}) {
    await this.assertActive(accountId);
    const run = this._run(runId, accountId);
    const npc = this._npc(run, npcId);
    const p = await this.character(accountId);
    const stock = run.shops.get(`${accountId}:${npc.id}`) ?? [];
    let item = stock.find((it) => it.uid === offer);
    if (!item && npc.role === 'merchant' && String(offer ?? '').startsWith('bag-row-')) item = makeBagRowOffer(p.rowsBought);
    if (!item) throw new Refusal('That is not for sale here');
    const price = buyPrice(item);
    if (p.gold < price) throw new Refusal(`Not enough gold (${price} needed)`);
    const service = item.type === 'service';
    const potion = item.type === 'potion';
    const out = await this._mutate(accountId, { gold: -price, potions: potion ? { [item.potion]: 1 } : {}, anyAdded: !service && !potion, reason: 'buy', ref: item.uid }, async (pp) => {
      let uid;
      if (!service && !potion) {
        const copy = await this._create({ ...item }, { owner: accountId, source: `shop:${npc.id}` });
        uid = copy.uid;
      }
      const r = pp.buy(item, { uid });
      if (!r.ok) throw new Refusal(r.message);
      await this.history.add(accountId, 'buy', { npc: npc.name, item: item.name, gold: price }, this.now());
      return r;
    });
    return { ok: true, message: out.result.message, digest: out.digest, version: out.version, state: p.serialize() };
  }
}

/* ---------------------------------------------------------------------- */
/* the checks                                                               */
/* ---------------------------------------------------------------------- */

/** What a change may move: every item id held, gold, potions, experience. */
function snapshot(p) {
  const uids = new Set();
  for (const it of p.bag) uids.add(it.uid);
  for (const it of p.stash) uids.add(it.uid);
  if (p.equipped) uids.add(p.equipped.uid);
  for (const it of Object.values(p.gear)) if (it) uids.add(it.uid);
  return { uids, gold: p.gold, potions: { ...p.potions }, xp: p.xp, level: p.level, size: uids.size };
}

/** The first way `after` differs from what `allow` permits, or null. */
function checkChange(before, after, allow) {
  const added = [...after.uids].filter((u) => !before.uids.has(u));
  const removed = [...before.uids].filter((u) => !after.uids.has(u));
  const mayAdd = new Set(allow.added ?? []);
  for (const u of added) if (!mayAdd.has(u) && !allow.anyAdded) return `item ${u} was added`;
  for (const u of removed) if (!allow.removed?.[u]) return `item ${u} was removed`;
  if (after.gold !== before.gold + (allow.gold ?? 0)) {
    // A pickup that fails leaves gold as it was; that is fine only if nothing happened.
    if (!(after.gold === before.gold && !added.length && !removed.length)) return `gold went from ${before.gold} to ${after.gold}, expected ${before.gold + (allow.gold ?? 0)}`;
  }
  for (const kind of new Set([...Object.keys(before.potions), ...Object.keys(after.potions)])) {
    const want = (before.potions[kind] ?? 0) + (allow.potions?.[kind] ?? 0);
    if ((after.potions[kind] ?? 0) !== want && (after.potions[kind] ?? 0) !== (before.potions[kind] ?? 0)) return `${kind} potions changed by the wrong amount`;
  }
  if (!allow.xp && (after.xp !== before.xp || after.level !== before.level)) return 'experience changed';
  return null;
}
