import { Vector3 } from 'three';
import { EventEmitter } from '../utils/EventEmitter.js';
import { Session } from './Session.js';
import { RemotePlayer } from './RemotePlayer.js';
import { platform } from '../platform/index.js';
import { fireProfileOf } from '../platform/weapon/fire.js';
import { treeSpells } from '../platform/skill/tree.js';
import { settings } from '../config/settings.js';

const SEND_HZ = 15;
const SNAPSHOT_HZ = 12;
const NAME_KEY = 'elemental-arena.player-name';
const CHAT_MAX = 200;
const _origin = new Vector3();
const _direction = new Vector3();
const _point = new Vector3();

/**
 * Playing together.
 *
 * One player **hosts**: their browser runs the fight — the monsters, their
 * attacks, the waves, the loot — exactly as it does alone. Everyone else is a
 * **guest** in that world: they see the host's monsters as puppets driven by
 * snapshots twelve times a second, and everything they do to a monster
 * (every spell, swing and shot resolves on their own screen, against the
 * puppet) is reported to the host, who applies it for real. Hits on a
 * guest are decided by the host and sent to them. Players see each other as
 * real bodies (RemotePlayer) steered by fifteen states a second.
 *
 * What goes over the wire, after the lobby:
 *   meta   who a player is: class, look, weapon, colours, gear
 *   p      a player's state (position, heading, velocity, health, flags)
 *   cast / attack / shot      what a player did, so the others see it
 *   s      host → guests: monster snapshot + the run's numbers
 *   h      guest → host: hits on monsters (damage, statuses, shoves)
 *   a / kill / hit / loot / taken / run    host → the room: what happened
 *   start / end / ready / exit / travel    who plays what, and when
 *   chat
 *
 * The server (server/realtime.js) only relays; nothing here is trusted
 * beyond a friends' co-op game, which is what it is for.
 */
export class Party extends EventEmitter {
  /** @param {import('../core/App.js').App} app */
  constructor(app) {
    super();
    this.app = app;
    this.session = new Session();
    /** id → RemotePlayer */
    this.remotes = new Map();
    /** Host: the start message of the current run, for guests who arrive late. */
    this.hostRun = null;
    /** Host: the server's id for this fight (signed in), so guests can join it there. */
    this.hostRunId = null;
    /** Guest: items taken, waiting for the host's word. */
    this._pending = new Map();
    this._sendAt = 0;
    this._snapAt = 0;
    this._jump = 0;
    this._lastMeta = '';
    this.chat = [];
    this._bind();
  }

  /* ------------------------------------------------------------------ */
  /* who and where                                                       */
  /* ------------------------------------------------------------------ */

  get inParty() {
    return this.session.room != null;
  }

  get isHost() {
    return this.inParty && this.session.isHost;
  }

  get isGuest() {
    return this.inParty && !this.session.isHost;
  }

  /** May this client put monsters on the field? (Alone, or the host.) */
  get canSpawn() {
    return !this.isGuest;
  }

  get id() {
    return this.session.id;
  }

  get code() {
    return this.session.room;
  }

  /** Signed in, you are your account (the server enforces it); else the name typed in the menu. */
  get name() {
    if (this.app.account?.user) return this.app.account.user.name;
    try {
      return localStorage.getItem(NAME_KEY) || '';
    } catch {
      return '';
    }
  }

  set name(value) {
    try {
      localStorage.setItem(NAME_KEY, String(value).trim().slice(0, 24));
    } catch {
      /* private mode */
    }
  }

  /** Everyone in the party, you first, with what is known about them. */
  members() {
    const me = {
      id: this.id,
      name: this.name || 'You',
      you: true,
      host: this.isHost,
      classId: platform.getActiveCharacter()?.id,
      hp: this.app.director.healthRatio,
      downed: this.app.director.isDowned,
      playing: this.app.phase === 'playing'
    };
    const others = [...this.session.peers.values()]
      .filter((p) => p.id !== this.id)
      .map((p) => {
        const r = this.remotes.get(p.id);
        return {
          id: p.id,
          name: r?.name ?? p.name,
          you: false,
          host: p.id === this.session.host,
          classId: r?.meta?.classId,
          hp: r ? r.hp / Math.max(1, r.maxHp) : 1,
          downed: r?.downed ?? false,
          playing: Boolean(r?.state)
        };
      });
    return [me, ...others];
  }

  /* ------------------------------------------------------------------ */
  /* the lobby                                                           */
  /* ------------------------------------------------------------------ */

  async create(name) {
    if (name) this.name = name;
    await this.session.create(this.name || 'Player');
    return this.code;
  }

  async join(code, name) {
    if (name) this.name = name;
    await this.session.join(code, this.name || 'Player');
    return this.code;
  }

  leave() {
    const wasHost = this.isHost;
    if (wasHost && this.app.phase === 'playing') this.send({ t: 'end' });
    this.session.leave();
    this._cleanup();
    this.emit('change');
    return wasHost;
  }

  _cleanup() {
    for (const remote of this.remotes.values()) remote.dispose();
    this.remotes.clear();
    this._pending.clear();
    this.hostRun = null;
    this.app.monsters.setPuppet(false);
    this.app.monsters.players = null;
    this.app.director.authority = true;
    this.app.director.localPlayerId = null;
    this.app.gameHud.setParty(null);
  }

  _bind() {
    const s = this.session;
    s.on('joined', () => {
      for (const peer of s.peers.values()) if (peer.id !== this.id) this._remote(peer.id, peer.name);
      this.send({ t: 'meta', meta: this.meta() });
      this.app.director.localPlayerId = this.id;
      this.emit('change');
    });
    s.on('peer', (peer) => {
      this._remote(peer.id, peer.name);
      this.app.hud.showToast(`${peer.name} joined the party`, 2400);
      this.emit('change');
    });
    s.on('left', (id, name) => {
      this.remotes.get(id)?.dispose();
      this.remotes.delete(id);
      this.app.hud.showToast(`${name ?? 'A player'} left the party`, 2400);
      this.emit('change');
    });
    s.on('closed', () => this._ended('The host left — the party is over'));
    s.on('disconnected', () => this._ended('Lost the connection to the party'));
    s.on('error', (msg) => this.app.hud.showToast(msg.message ?? 'Party error', 2600));
    s.on('message', (msg) => this._onMessage(msg));
  }

  _remote(id, name) {
    let remote = this.remotes.get(id);
    if (!remote) {
      remote = new RemotePlayer(this.app, id, name);
      this.remotes.set(id, remote);
    }
    return remote;
  }

  _ended(reason) {
    this._cleanup();
    this.app.hud.showToast(reason, 3200);
    if (this.app.phase === 'playing') this.app.exitToMenu({ fromParty: true });
    this.emit('change');
  }

  /** What the others need to draw you. */
  meta() {
    const app = this.app;
    const classId = platform.getActiveCharacter()?.id ?? 'caster';
    const character = platform.characters.get(classId);
    const gear = {};
    const idle = [];
    for (const [slot, item] of Object.entries(app.profile.gear)) {
      if (!item) continue;
      gear[slot] = item;
      if (!app.profile.isActive(item)) idle.push(item.uid);
    }
    return {
      name: this.name || 'Player',
      classId,
      look: character?.look ?? null,
      weaponId: platform.getActiveWeaponId(),
      appearance: platform.getAppearance(classId),
      gear,
      idle
    };
  }

  /** Tell the party when the look, class, weapon or gear changed. */
  sendMeta() {
    if (!this.inParty) return;
    const meta = this.meta();
    const key = JSON.stringify(meta);
    if (key === this._lastMeta) return;
    this._lastMeta = key;
    this.send({ t: 'meta', meta, reply: false });
  }

  send(msg) {
    return this.session.send(msg);
  }

  sendTo(id, msg) {
    return this.session.sendTo(id, msg);
  }

  /* ------------------------------------------------------------------ */
  /* starting and stopping                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Host: the run everyone plays. `level` is the full level (so levels made
   * here work for guests too), or null for the classic keep.
   */
  broadcastStart({ level = null, campaign = null, index = -1 } = {}) {
    if (!this.isHost) return;
    this.hostRun = { t: 'start', level, campaign, index, at: Date.now() };
    this.send(this.hostRun);
    this.app.monsters.players = this._players();
    this.app.director.authority = true;
    this.app.monsters.setPuppet(false);
  }

  /** Host, signed in: the server opened this fight; guests join it there to share its loot. */
  setRunId(runId) {
    this.hostRunId = runId;
    if (this.isHost && runId) this.send({ t: 'runid', id: runId });
  }

  /** Host: the run ended (back to the menu). */
  broadcastEnd() {
    if (!this.isHost) return;
    this.hostRun = null;
    this.hostRunId = null;
    this.send({ t: 'end' });
    this.app.monsters.players = null;
  }

  /** Guest: ask to join the host's fight (now, or as a drop-in). */
  requestStart() {
    if (!this.isGuest) return;
    this.sendTo(this.session.host, { t: 'ready' });
    this.app.hud.showToast('Asking the host…', 1800);
  }

  async _applyStart(msg) {
    const app = this.app;
    app.story.dismiss?.('party');
    app.director.authority = false;
    app.director.localPlayerId = this.id;
    app.monsters.setPuppet(true);
    app.monsters.players = null;
    if (app.phase === 'playing') {
      app.director.stop();
      app.clearEffects();
      app._endRun();
    }
    if (msg.free) {
      // Free play: the classic keep, or the map the host generated.
      if (msg.level) {
        await app.catalog.ready;
        app.clearEffects();
        await app.composed.buildLevel(msg.level);
        app._useWorld(app.composed);
      } else {
        app.useClassicWorld();
      }
      await app.enterGame({ fromParty: true });
      return;
    }
    if (msg.level) {
      await app.playLevel(msg.level, { fromParty: true, campaign: msg.campaign, index: msg.index ?? -1 });
    } else {
      app.useClassicWorld();
      await app.enterGame({ fromParty: true });
    }
  }

  /** The monsters' list of people to go after (host). */
  _players() {
    const app = this.app;
    const list = [{ id: this.id, position: app.character.position, get alive() { return !app.director.isDowned; } }];
    for (const remote of this.remotes.values()) {
      if (!remote.body || !remote.state) continue;
      list.push({ id: remote.id, position: remote.body.position, get alive() { return !remote.downed; } });
    }
    return list;
  }

  /* ------------------------------------------------------------------ */
  /* what you did                                                        */
  /* ------------------------------------------------------------------ */

  sendCast(element, origin, direction, distance, facing, anim) {
    if (!this.inParty) return;
    this.send({ t: 'cast', e: element, ox: r2(origin.x), oz: r2(origin.z), dx: r3(direction.x), dz: r3(direction.z), d: r2(distance), f: r3(facing), an: anim });
  }

  sendAttack(yaw, anim) {
    if (!this.inParty) return;
    this.send({ t: 'attack', f: r3(yaw), an: anim });
  }

  sendShot(muzzle, direction, weaponId, distance, steady) {
    if (!this.inParty) return;
    this.send({ t: 'shot', mx: r2(muzzle.x), my: r2(muzzle.y), mz: r2(muzzle.z), dx: r3(direction.x), dz: r3(direction.z), w: weaponId, d: r2(distance), st: steady ? 1 : 0 });
  }

  jumped() {
    this._jump += 1;
  }

  /** Host: a monster died by anyone's hand. */
  onLocalKill(monster) {
    if (!this.isHost) return;
    this.send({ t: 'kill', id: monster.id, k: monster.kind, sh: monster.shattered ? 1 : 0, w: this.app.director.wave || 1 });
  }

  /** Host: loot fell. */
  announceLoot(items, from, targets) {
    if (!this.isHost) return;
    this.send({ t: 'loot', items, from: { x: r2(from.x), z: r2(from.z) }, targets });
  }

  /** Host: you took an item yourself. */
  announceTaken(uid) {
    if (!this.isHost) return;
    this.send({ t: 'taken', uid, by: this.id });
  }

  /** Guest: ask the host for an item on the ground. */
  requestTake(item) {
    if (!this.isGuest) return;
    this._pending.set(item.uid, item);
    this.sendTo(this.session.host, { t: 'take', uid: item.uid });
  }

  /** Host: a run event the guests' HUDs should show. */
  announceRun(ev, data = {}) {
    if (!this.isHost) return;
    this.send({ t: 'run', ev, ...data });
  }

  say(text) {
    const clean = String(text ?? '').trim().slice(0, CHAT_MAX);
    if (!clean || !this.inParty) return;
    this.send({ t: 'chat', text: clean });
    this._chat(this.name || 'You', clean, true);
  }

  _chat(name, text, you = false) {
    this.chat.push({ name, text, you, at: Date.now() });
    if (this.chat.length > 60) this.chat.shift();
    this.app.gameHud.addChat(name, text, you);
    this.emit('chat');
  }

  /** The skill books the party can read: everyone's trees, not just the host's. */
  bookPool() {
    const pool = new Set(treeSpells(this.app.profile.classId));
    for (const remote of this.remotes.values()) {
      if (remote.meta?.classId) for (const id of treeSpells(remote.meta.classId)) pool.add(id);
    }
    return [...pool];
  }

  /** How many are fighting — the waves scale with it. */
  get size() {
    return this.inParty ? Math.max(1, this.session.peers.size) : 1;
  }

  /* ------------------------------------------------------------------ */
  /* what arrived                                                        */
  /* ------------------------------------------------------------------ */

  _onMessage(msg) {
    const app = this.app;
    const from = msg.from;
    const remote = from ? this._remote(from, this.session.peers.get(from)?.name ?? 'Player') : null;
    switch (msg.t) {
      case 'meta':
        if (!remote || !msg.meta) return;
        remote.setMeta(msg.meta).then(() => this.emit('change'));
        if (msg.reply !== false) this.sendTo(from, { t: 'meta', meta: this.meta(), reply: false });
        this.emit('change');
        return;
      case 'p':
        remote?.push(msg);
        return;
      case 'cast': {
        _origin.set(msg.ox, 0, msg.oz);
        _direction.set(msg.dx, 0, msg.dz).normalize();
        if (app.phase === 'playing') app.abilities.cast(_origin, _direction, msg.d, msg.e);
        remote?.playCast(msg.an ?? platform.getCastAnim(msg.e), { lunge: true, facing: msg.f });
        return;
      }
      case 'attack':
        remote?.playCast(msg.an ?? 'cast2', { lunge: true, facing: msg.f });
        return;
      case 'shot': {
        const fire = fireProfileOf(platform.weapons.get(msg.w));
        if (!fire || app.phase !== 'playing') return;
        _origin.set(msg.mx, msg.my, msg.mz);
        _direction.set(msg.dx, 0, msg.dz).normalize();
        // Their shot, drawn here: the bullets fly and the flash lights up, but
        // the damage was theirs to resolve, so nothing here hurts a monster.
        app.weaponFire.fireVisual(_origin, _direction, msg.st ? { ...fire, spread: 0 } : fire, msg.d, remote?.body?.position ?? null);
        remote?.playCast(fire.anim ?? 'shoot2', { facing: Math.atan2(msg.dx, msg.dz) });
        return;
      }
      case 's':
        if (!this.isGuest || app.phase !== 'playing') return;
        app.monsters.applySnapshot(msg.m ?? []);
        if (msg.run) app._applyPartyRun(msg.run);
        return;
      case 'h': {
        if (!this.isHost) return;
        const results = app.monsters.applyRemoteHits(msg.hits ?? [], from);
        for (const { monster, element, result } of results) {
          app.combat._dressHit(monster, settings[element]?.lightColor ? element : 'beam', result);
        }
        return;
      }
      case 'a':
        if (this.isGuest) app.monsters.dressRemoteAttack(msg);
        return;
      case 'kill': {
        if (!this.isGuest) return;
        const monster = app.monsters.byId.get(msg.id);
        if (monster?.isAlive) monster._die(Boolean(msg.sh));
        app._onPartyKill(msg);
        return;
      }
      case 'hit':
        if (app.phase !== 'playing' || !this.isGuest) return;
        _point.set(msg.x ?? app.character.position.x, 0, msg.z ?? app.character.position.z);
        // As if the puppet had landed it here: the director, rage and thorns all listen.
        app.monsters.emit('playerHit', Math.max(0, Number(msg.a) || 0), { position: _point, ranged: Boolean(msg.r), burning: Boolean(msg.b), playerId: this.id, monster: app.monsters.byId.get(msg.m) ?? null });
        return;
      case 'loot':
        if (!this.isGuest || app.phase !== 'playing') return;
        app.loot.drop(msg.items ?? [], msg.from, (x, z) => app.world.heightAt?.(x, z) ?? 0, { targets: msg.targets });
        return;
      case 'take': {
        if (!this.isHost) return;
        const taken = app.loot.has(msg.uid);
        if (taken) app.loot.removeByUid(msg.uid);
        this.send({ t: 'taken', uid: msg.uid, by: taken ? from : null });
        return;
      }
      case 'taken': {
        const item = this._pending.get(msg.uid);
        this._pending.delete(msg.uid);
        app.loot.removeByUid(msg.uid);
        if (item && msg.by === this.id) {
          const result = app.profile.pickUp(item);
          if (result.message) app.hud.showToast(result.message);
        } else if (item) {
          app.hud.showToast('Someone else got there first', 1800);
        }
        return;
      }
      case 'start':
        if (this.isGuest) this._applyStart(msg).catch((error) => console.error('[party] could not start', error));
        return;
      case 'end':
        if (!this.isGuest) return;
        app.hud.showToast('The host ended the game', 2600);
        // An outro still open closes as "main menu"; otherwise straight out.
        if (app.story.isOpen) app.story.dismiss('menu');
        else if (app.phase === 'playing') app.exitToMenu({ fromParty: true });
        return;
      case 'ready':
        if (!this.isHost) return;
        if (this.hostRun && app.phase === 'playing') {
          this.sendTo(from, this.hostRun);
          if (this.hostRunId) this.sendTo(from, { t: 'runid', id: this.hostRunId });
        } else this.sendTo(from, { t: 'wait' });
        return;
      case 'wait':
        app.hud.showToast('The host has not started yet', 2200);
        return;
      case 'runid':
        // The host's fight on the server: join it, so its loot and kills count for us too.
        if (!this.isGuest) return;
        this.guestRunId = msg.id;
        if (app.sync?.active) app.sync.joinRun(msg.id);
        return;
      case 'exit':
        if (this.isHost && app.run?.done) app._finishLevel();
        return;
      case 'travel':
        if (this.isHost) app._travelTo(msg.level);
        return;
      case 'run':
        if (this.isGuest) app._onPartyRun(msg);
        return;
      case 'chat':
        this._chat(remote?.name ?? 'Player', String(msg.text ?? '').slice(0, CHAT_MAX));
        return;
      default:
        return;
    }
  }

  /* ------------------------------------------------------------------ */
  /* every frame                                                         */
  /* ------------------------------------------------------------------ */

  update(dt) {
    if (!this.inParty) return;
    const app = this.app;
    for (const remote of this.remotes.values()) remote.update(dt);
    if (app.phase !== 'playing') return;
    const now = performance.now() / 1000;

    if (now - this._sendAt >= 1 / SEND_HZ) {
      this._sendAt = now;
      const p = app.character.position;
      const v = app.character.locomotion.velocity;
      this.send({
        t: 'p',
        x: r2(p.x), y: r2(p.y), z: r2(p.z), yaw: r3(app.character.facing),
        vx: r2(v.x), vz: r2(v.z),
        sit: app.character.locomotion.sitting ? 1 : 0,
        sp: app.character.locomotion.sprinting ? 1 : 0,
        jp: this._jump,
        hp: Math.round(app.director.health), mhp: Math.round(app.director.maxHealth),
        dn: app.director.isDowned ? 1 : 0
      });
    }

    if (this.isHost) {
      app.monsters.players = this._players();
      app.director.partySize = this.size;
      app.monsters.extraAlive = 6 * (this.size - 1);
      if (now - this._snapAt >= 1 / SNAPSHOT_HZ) {
        this._snapAt = now;
        const d = app.director;
        this.send({ t: 's', m: app.monsters.snapshot(), run: { w: d.wave, k: d.kills, sc: d.score, al: app.monsters.aliveCount, st: d.state } });
      }
    } else if (app.monsters.outbox.length) {
      this.sendTo(this.session.host, { t: 'h', hits: app.monsters.outbox.splice(0) });
    }

    app.gameHud.setParty(this.members(), this.code);
  }

  /** Entering the fight: the host tells the party what is being played. */
  onEnterGame({ fromParty = false, keepRun = false, level = null } = {}) {
    if (!this.inParty) return;
    if (this.isHost) {
      if (!fromParty && !keepRun) this.broadcastStart({ level, free: true });
      this.app.monsters.setPuppet(false);
      this.app.director.authority = true;
      this.app.monsters.players = this._players();
    }
    this.app.gameHud.setParty(this.members(), this.code);
  }

  /** Leaving the fight: the host ends it for everyone; a guest just steps out. */
  onExitGame({ fromParty = false } = {}) {
    this.app.gameHud.setParty(null);
    if (!this.inParty) return;
    if (this.isHost && !fromParty) this.broadcastEnd();
    this.app.monsters.players = null;
    if (this.isGuest) {
      this.app.monsters.setPuppet(false);
      this.app.director.authority = true;
    }
  }

  dispose() {
    this.session.close();
    this._cleanup();
  }
}

const r2 = (n) => Math.round(n * 100) / 100;
const r3 = (n) => Math.round(n * 1000) / 1000;
