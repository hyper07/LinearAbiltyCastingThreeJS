import { Vector3 } from 'three';
import { settings } from '../../config/settings.js';
import { getColor } from '../../utils/color.js';
import { isRivalTarget } from '../GameDirector.js';
import { makeGear, makePotion, makeWeapon } from '../../items/Items.js';
import { circleAt, outside, stormPlan } from './storm.js';
import { StormZone } from './StormZone.js';
import { PlayerTarget } from './PlayerTarget.js';

const _v = new Vector3();

function rng(seed) {
  let s = seed >>> 0 || 7;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * A battle royale match: the last one (or the last squad) standing wins.
 *
 *   - **The storm** closes in phases (storm.js); outside it you lose health.
 *     The host's clock is the match clock: it sends it every two seconds.
 *   - **Rivals** (monster kind `rival`) fill the field up to the level's
 *     count. They go after the nearest contestant — players or each other —
 *     and head for the safe circle when the storm reaches them. The host (or a
 *     solo player) runs them, like every monster.
 *   - **Players** (mode `solo`) can hit each other: PlayerTarget sends the hit
 *     to that player, whose game takes it. Mode `squad`: the party is one team
 *     against the rivals.
 *   - **Down is out**: no revives. A player who is out sees where they placed.
 *   - **Loot** lies around at the start (not when signed in: the server makes
 *     every item a signed-in player holds, so theirs comes from the rivals).
 *
 * Messages over the party: `pvp` (a hit on you), `royale` (the clock),
 * `royale-out` (someone is out, and who did it).
 */
export class RoyaleMode {
  /** @param {import('../../core/App.js').App} app */
  constructor(app) {
    this.app = app;
    this.active = false;
    this.zone = null;
    this.proxies = new Map();
    this.rivals = new Map();
    app.monsters.on('playerHit', (amount, source) => this._rivalHit(amount, source));
    app.director.on('downed', () => this._downed());
    app.combat.on('kill', (monster) => {
      if (this.active && monster.kind === 'rival') this.eliminations += 1;
    });
  }

  /** The host, or a player alone: who runs the rivals and the clock. */
  get authority() {
    return !this.app.party.isGuest;
  }

  get squad() {
    return this.cfg?.mode === 'squad';
  }

  /** @param {object} level a level whose rules.goal is 'royale' */
  start(level) {
    const app = this.app;
    const party = app.party;
    this.stop();
    this.level = level;
    this.cfg = level.rules.royale ?? { rivals: 7, mode: 'solo', storm: 1 };
    this.active = true;
    this.out = false;
    this.ended = false;
    this.t = 0;
    this.eliminations = 0;
    this.lastAttacker = null;
    this._tick = 0;
    this._sync = 0;
    this._check = 0;
    const seed = (level.world.seed ^ 0x5eed) >>> 0;
    this.plan = stormPlan(seed, settings.royale, this.cfg.storm);
    this.circle = circleAt(this.plan, 0);
    this.zone ??= new StormZone(app.scene, settings.royale.stormColor);
    app.director.noRevive = true;
    app.director.wave = Math.max(1, app.director.wave);

    // Everyone starts spread around a ring, in party order, so nobody spawns on anybody.
    const random = rng(seed);
    const ids = party.inParty ? [party.id, ...party.remotes.keys()].sort() : ['me'];
    const turn = random() * Math.PI * 2;
    const slot = ids.indexOf(party.inParty ? party.id : 'me');
    const a = turn + (slot / ids.length) * Math.PI * 2;
    app._teleport(Math.cos(a) * 13, Math.sin(a) * 13);

    if (this.authority) {
      const humans = ids.length;
      const count = Math.max(0, this.cfg.rivals - (humans - 1));
      for (let i = 0; i < count; i++) {
        const r = 7 + random() * 14;
        const b = turn + Math.PI / ids.length + (i / Math.max(1, count)) * Math.PI * 2 + (random() - 0.5) * 0.4;
        app.monsters.spawn('rival', _v.set(Math.cos(b) * r, 0, Math.sin(b) * r));
      }
      if (!app.sync.active) this._scatterLoot(random);
      this.contestants = humans + count;
    } else {
      this.contestants = null; // learnt from the field
    }

    app.monsters.steer = (monster) => {
      if (!this.active || monster.kind !== 'rival') return null;
      return outside(this.circle, monster.position.x, monster.position.z, -1.2) ? _v.set(this.circle.x, 0, this.circle.z) : null;
    };
    app.gameHud.showBanner('Battle royale', this.squad ? 'Your party against the rest — last squad standing' : 'Last one standing wins. Watch the storm!', 3.2);
  }

  _scatterLoot(random) {
    const app = this.app;
    const height = (x, z) => app.world.heightAt?.(x, z) ?? 0;
    for (let i = 0; i < settings.royale.loot; i++) {
      const roll = random();
      const rarity = random() < 0.25 ? 'rare' : 'magic';
      const item = roll < 0.4 ? makeWeapon(rarity, random) : roll < 0.7 ? makePotion(random() < 0.75 ? 'health' : 'focus') : makeGear(rarity, random);
      const r = 3 + Math.sqrt(random()) * 18;
      const b = random() * Math.PI * 2;
      const at = { x: Math.round(Math.cos(b) * r * 100) / 100, z: Math.round(Math.sin(b) * r * 100) / 100 };
      // Loot targets are [x, z] pairs (items/Loot.js).
      const spot = [[at.x, at.z]];
      app.loot.drop([item], at, height, { targets: spot });
      app.party.announceLoot([item], at, spot);
    }
  }

  stop() {
    if (!this.active) return;
    const app = this.app;
    this.active = false;
    this.zone?.hide();
    app.monsters.extraTargets = [];
    app.monsters.steer = null;
    app.director.noRevive = false;
    app.monsters.players = app.party.isHost ? app.party._players() : null;
    this.proxies.clear();
    this.rivals.clear();
    document.body.classList.remove('is-in-storm');
  }

  /* ---- the frame ---- */

  update(dt) {
    if (!this.active) return;
    const app = this.app;
    this.t += dt;
    this.circle = circleAt(this.plan, this.t);
    this.zone.update(this.circle, app.elapsed);

    const p = app.character.position;
    const inStorm = !this.out && outside(this.circle, p.x, p.z);
    document.body.classList.toggle('is-in-storm', inStorm);

    this._tick += dt;
    if (this._tick >= settings.royale.tick) {
      const hurt = this.circle.damage * this._tick;
      this._tick = 0;
      if (inStorm && hurt > 0) app.director.damagePlayer(hurt, { position: p, playerId: app.party.inParty ? app.party.id : null, storm: true });
      if (this.authority && hurt > 0) {
        for (const m of app.monsters.active) {
          if (m.kind !== 'rival' || !m.isTargetable || !outside(this.circle, m.position.x, m.position.z)) continue;
          if (m.applyDamage(hurt, { ignoreArmour: true }).killed) this._announceDeath(m);
        }
      }
    }

    if (this.authority) this._updateTargets();
    if (!this.squad) this._updateProxies();

    if (app.party.isHost) {
      this._sync += dt;
      if (this._sync > 2) {
        this._sync = 0;
        app.party.send({ t: 'royale', tm: Math.round(this.t * 100) / 100 });
      }
    }

    this._check += dt;
    if (this._check > 0.4) {
      this._check = 0;
      this._checkEnd();
      app._updateGoalPill();
    }
  }

  /** Who the rivals may go after: the players, and every other rival. */
  _updateTargets() {
    const app = this.app;
    const humans = app.party.inParty
      ? app.party._players()
      : [{ id: null, position: app.character.position, get alive() { return !app.director.isDowned; } }];
    const seen = new Set();
    for (const m of app.monsters.active) {
      if (m.kind !== 'rival') continue;
      const id = `m:${m.id}`;
      seen.add(id);
      if (!this.rivals.has(id)) this.rivals.set(id, { id, monster: m, position: m.position, get alive() { return m.isTargetable; } });
    }
    for (const id of this.rivals.keys()) if (!seen.has(id)) this.rivals.delete(id);
    app.monsters.players = [...humans, ...this.rivals.values()];
  }

  /** Every other player, as something your attacks can hit. */
  _updateProxies() {
    const party = this.app.party;
    const live = new Set();
    for (const remote of party.remotes.values()) {
      live.add(remote.id);
      if (!this.proxies.has(remote.id)) {
        this.proxies.set(remote.id, new PlayerTarget(remote, (id, amount) => party.sendTo(id, { t: 'pvp', a: Math.round(amount * 10) / 10, x: this.app.character.position.x, z: this.app.character.position.z })));
      }
    }
    for (const id of this.proxies.keys()) if (!live.has(id)) this.proxies.delete(id);
    this.app.monsters.extraTargets = [...this.proxies.values()];
  }

  /* ---- hits and the fallen ---- */

  /** A rival's shot or swing landed on another rival (the host decides). */
  _rivalHit(amount, source) {
    if (!this.active || !this.authority || !isRivalTarget(source?.playerId)) return;
    const target = this.rivals.get(source.playerId)?.monster;
    if (!target?.isTargetable) return;
    if (target.applyDamage(amount * settings.royale.rivalScale).killed) this._announceDeath(target);
  }

  /** A rival fell to the storm or to another rival: the guests' copies fall too (and nobody earns it). */
  _announceDeath(monster) {
    if (this.app.party.isHost) this.app.party.send({ t: 'kill', id: monster.id, k: monster.kind, sh: 0, w: 1, nc: 1 });
  }

  /** Another player hit you. */
  onPvp(msg, remote) {
    if (!this.active || this.out || this.squad || this.app.phase !== 'playing') return;
    this.lastAttacker = remote ? { id: remote.id, name: remote.name } : null;
    _v.set(Number(msg.x) || 0, 0, Number(msg.z) || 0);
    this.app.director.damagePlayer(Math.max(0, Math.min(200, Number(msg.a) || 0)), { position: _v, playerId: this.app.party.id, pvp: true });
  }

  /** The host's match clock. */
  onSync(msg) {
    if (this.active && this.app.party.isGuest && Number.isFinite(msg.tm)) this.t = msg.tm;
  }

  /** Someone else is out. */
  onOut(msg, remote) {
    if (!this.active) return;
    if (msg.by && msg.by === this.app.party.id) {
      this.eliminations += 1;
      this.app.hud.showToast(`You knocked out ${remote?.name ?? 'a player'}!`, 2400);
    } else {
      this.app.hud.showToast(`${remote?.name ?? 'A player'} is out — #${msg.place}`, 2200);
    }
    this._checkEnd();
  }

  /** You went down: in a battle royale that is the end of your match. */
  _downed() {
    if (!this.active || this.out || this.ended) return;
    this.out = true;
    const place = this.aliveCount() + 1;
    if (this.app.party.inParty) this.app.party.send({ t: 'royale-out', place, by: this.lastAttacker?.id ?? null });
    document.body.classList.remove('is-in-storm');
    setTimeout(() => this._result({ won: false, place }), 1200);
  }

  /* ---- the score ---- */

  rivalsAlive() {
    let n = 0;
    for (const m of this.app.monsters.active) if (m.kind === 'rival' && m.isAlive) n++;
    return n;
  }

  playersAlive() {
    let n = this.out || this.app.director.isDowned ? 0 : 1;
    for (const remote of this.app.party.remotes.values()) if (remote.body && !remote.downed) n++;
    return n;
  }

  aliveCount() {
    return this.rivalsAlive() + this.playersAlive();
  }

  _checkEnd() {
    if (!this.active || this.ended) return;
    // Rivals still arriving are not gone yet.
    if (this.t < 3) return;
    const rivals = this.rivalsAlive();
    const players = this.playersAlive();
    if (this.squad) {
      if (rivals === 0 && players > 0) this._result({ won: true, squad: true });
      else if (players === 0 && !this.out) this._result({ won: false, place: 2 });
    } else if (!this.out && rivals + players === 1) {
      this._result({ won: true });
    }
  }

  async _result({ won, place = 1, squad = false }) {
    if (this.ended && won) return;
    if (won) this.ended = true;
    const app = this.app;
    if (won) {
      app.director.stop?.();
      app.flash.trigger?.(getColor('#ffe27a'), 0.4);
    }
    const total = this.contestants ?? null;
    const title = won ? (squad ? 'Your squad is the last one standing!' : 'Last one standing!') : `You placed #${place}${total ? ` of ${total}` : ''}`;
    const text = [
      won ? 'The storm settles. Nobody is left to challenge you.' : this.lastAttacker ? `Knocked out by ${this.lastAttacker.name}.` : 'The storm or a rival got you this time.',
      `Knock-outs: ${this.eliminations}.`
    ].join(' ');
    const host = !app.party.isGuest;
    const choice = await app.story.show({
      eyebrow: 'Battle royale',
      title,
      text,
      buttons: [
        { label: 'Back to games', value: 'menu' },
        ...(won ? [] : [{ label: 'Keep watching', value: 'watch' }]),
        ...(host ? [{ label: 'Play again', value: 'again', primary: true }] : [])
      ]
    });
    if (choice === 'party' || choice === 'watch') return;
    const level = this.level;
    this.stop();
    if (choice === 'again' && host) {
      app.exitToMenu({ fromParty: true });
      await app.playLevel(level);
      return;
    }
    app.exitToMenu();
  }

  /** The goal pill's text: who is left, and the storm. */
  statusText() {
    if (!this.active) return '';
    const c = this.circle;
    const secs = Math.ceil(c.untilChange);
    const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    const storm = c.phase >= this.plan.phases.length ? 'Final circle' : c.closing ? `Storm closing · ${clock}` : `Storm moves in ${clock}`;
    return `${this.aliveCount()} left · ${storm}${this.out ? ' · you are out' : ''}`;
  }
}
