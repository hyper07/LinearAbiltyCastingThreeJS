import { Vector3 } from 'three';

import { settings } from '../config/settings.js';
import { getColor } from '../utils/color.js';
import { clamp, saturate } from '../utils/math.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import { DecalType } from '../effects/GroundDecals.js';

const _scratch = new Vector3();

export const RunState = Object.freeze({
  IDLE: 'idle',
  BREATHER: 'breather', // between waves
  FIGHTING: 'fighting',
  DOWNED: 'downed'
});

/**
 * The run: waves, score, the caster's health and the feel of a hit landing.
 *
 * Everything here is *pacing* rather than mechanics. `Combat` decides that a
 * meteor deals ninety damage; this decides that the ninetieth point of damage
 * is worth a sixty-millisecond freeze, a combo tick and a number on the screen,
 * and that the wave after this one arrives in six seconds with nine monsters in
 * it. Those are separate jobs and they change for completely different reasons.
 *
 * The one piece of real trickery is `hitStop`. A frame or two of near-frozen
 * time on a heavy impact is the cheapest weight a game can buy — it reads as
 * the blow *connecting* rather than passing through — and because the whole
 * simulation already runs on `settings.global.timeScale`, buying it costs one
 * multiplier that the app applies where it already scales its delta.
 *
 * Emits: `wave` (number, count), `waveCleared` (number), `score` (total, delta),
 * `combo` (count), `playerDamage` (amount, health), `downed`, `revived`.
 */
export class GameDirector extends EventEmitter {
  /**
   * @param {object} context { monsters, combat, ruins, character, shake, flash, decals, particles, numbers }
   */
  constructor(context) {
    super();
    this.ctx = context;

    this.state = RunState.IDLE;
    this.wave = 0;
    this.score = 0;
    this.kills = 0;
    this.combo = 0;
    this.bestCombo = 0;

    this.health = settings.combat.playerHealth;
    this.maxHealth = settings.combat.playerHealth;

    this._comboTimer = 0;
    this._spawnQueue = 0;
    this._spawnTimer = 0;
    this._breatherTimer = 0;
    this._sinceDamage = 99;
    this._downedTimer = 0;
    /** 0..1 — how frozen the world is right now. Read by the app each frame. */
    this._hitStop = 0;
    this.elapsed = 0;
    /**
     * Playing together: only the host's director runs the waves. A guest's
     * keeps the player's own health and revive, and shows what the host says.
     */
    this.authority = true;
    /** In a party, hits meant for someone else are not yours to take. */
    this.localPlayerId = null;
    /** How many are fighting — the waves grow with the party. */
    this.partySize = 1;

    this._bind();
  }

  _bind() {
    const { combat, monsters } = this.ctx;

    combat.on('hit', (monster, amount, info) => this._onHit(monster, amount, info));
    combat.on('kill', (monster, info) => this._onKill(monster, info));
    monsters.on('damage', (monster, amount, info) => {
      this._showNumber(monster, amount, info.kind === 'burn' ? 'burn' : 'normal');
      if (info.killed) this._onKill(monster, { element: info.element ?? 'burn', amount });
    });
    monsters.on('playerHit', (amount, source) => {
      if (source?.playerId && this.localPlayerId && source.playerId !== this.localPlayerId) return;
      this.damagePlayer(amount, source);
    });
  }

  /* ------------------------------------------------------------------ */
  /* the run                                                             */
  /* ------------------------------------------------------------------ */

  /** Start (or restart) a run from wave 1. */
  start() {
    this.wave = 0;
    this.score = 0;
    this.kills = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.health = this.maxHealth = settings.combat.playerHealth;
    this.ctx.monsters.despawnAll();
    if (this.authority) this._beginBreather(1.5);
    else this.state = RunState.FIGHTING; // the host's waves are already coming
    this.emit('score', this.score, 0);
    return this;
  }

  stop() {
    this.state = RunState.IDLE;
    this._spawnQueue = 0;
  }

  _beginBreather(duration = settings.waves.breather) {
    this.state = RunState.BREATHER;
    this._breatherTimer = duration;
    this.emit('breather', this.wave + 1, duration);
  }

  /**
   * Roll the next wave.
   *
   * The count grows geometrically and the health linearly, which is the shape
   * that keeps a wave-based fight interesting: more targets first (so the AoE
   * abilities start earning their cooldowns), tougher targets later.
   */
  nextWave() {
    if (!this.authority) return this.wave;
    const cfg = settings.waves;
    this.wave += 1;
    this.state = RunState.FIGHTING;

    // More of them for a party: each extra player adds just over half a wave.
    const party = 1 + 0.6 * (Math.max(1, this.partySize) - 1);
    const count = Math.round(cfg.baseCount * Math.pow(cfg.growth, this.wave - 1) * party);
    this._spawnQueue = clamp(count, 1, 60);
    this._spawnTimer = 0;
    // The dragon outranks the golem: a wave that qualifies for both gets the
    // dragon, and the golems go back in the pool as its escort.
    this._bossKind =
      cfg.dragonEvery > 0 && this.wave % cfg.dragonEvery === 0
        ? 'dragon'
        : cfg.bossEvery > 0 && this.wave % cfg.bossEvery === 0
          ? 'golem'
          : null;

    this.ctx.monsters.healthMultiplier = (1 + (this.wave - 1) * cfg.healthRamp) * (1 + 0.2 * (Math.max(1, this.partySize) - 1));
    this.emit('wave', this.wave, this._spawnQueue);
    return this.wave;
  }

  /* ------------------------------------------------------------------ */
  /* damage in both directions                                           */
  /* ------------------------------------------------------------------ */

  _onHit(monster, amount, info) {
    this._showNumber(monster, amount, info.shattered ? 'shatter' : info.crit ? 'crit' : 'normal');
    // Big hits and shatters buy a beat of frozen time; ordinary chip damage does
    // not, or the whole game would stutter.
    if (info.shattered || info.crit || amount > 60) {
      this.hitStop(settings.combat.hitStop * (info.shattered ? 1.6 : 1));
    }
  }

  _onKill(monster, info) {
    this.kills += 1;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    // Combos decay rather than reset on a timer tick, so a slow, deliberate
    // fight against a golem does not punish you for it.
    this._comboTimer = 3.2;

    const base = Math.round(monster.maxHealth * 0.6);
    // The multiplier is what makes chaining kills worth aiming for; capped so a
    // long streak cannot run away with the scoreboard.
    const multiplier = 1 + Math.min(this.combo - 1, 9) * 0.12;
    const gained = Math.round(base * multiplier);
    this.score += gained;

    this.hitStop(settings.combat.hitStop * 1.2);
    this.emit('score', this.score, gained);
    this.emit('combo', this.combo);
    this.emit('kill', monster, info);
  }

  _showNumber(monster, amount, kind) {
    if (!settings.monsters.damageNumbers || !this.ctx.numbers) return;
    monster.centre(_scratch);
    _scratch.y += 0.4;
    this.ctx.numbers.spawn(_scratch, Math.max(1, Math.round(amount)), {
      kind,
      color: kind === 'normal' ? getColor(monster.config.accent).getStyle() : undefined
    });
  }

  /**
   * The caster takes a hit.
   *
   * Deliberately loud: a shake, a red flash, a number over the player's head and
   * a scorch under their feet. Being hit in a game where you never move has to
   * be *unmistakable*, because the only way to answer it is to kill the thing
   * that did it, and you have to know which thing that was.
   */
  damagePlayer(amount, source = {}) {
    if (this.state === RunState.DOWNED || !settings.combat.enabled) return;

    // A shield (or anything else with block) can stop the hit outright.
    if (Math.random() < Math.min(0.6, Math.max(0, this.block ?? 0))) {
      const { character, numbers, shake } = this.ctx;
      if (numbers && character) {
        _scratch.copy(character.position);
        _scratch.y += character.height ?? 1.8;
        numbers.spawn(_scratch, 'BLOCK', { kind: 'heal' });
      }
      shake?.add(0.15 * settings.global.cameraShake, 2.4, 24);
      this.emit('playerBlock', amount, source);
      return;
    }

    // Armour from the player's class and gear: a share ignored.
    amount *= 1 - Math.min(0.75, Math.max(0, this.armor ?? 0));
    const dealt = Math.min(amount, this.health);
    this.health = Math.max(0, this.health - amount);
    this._sinceDamage = 0;

    const { shake, flash, character, numbers } = this.ctx;
    shake?.add(0.5 * settings.global.cameraShake, 2.4, 24);
    flash?.trigger(getColor('#ff3b30'), 0.22);

    if (numbers && character) {
      _scratch.copy(character.position);
      _scratch.y += character.height ?? 1.8;
      numbers.spawn(_scratch, `-${Math.round(dealt)}`, { kind: 'player' });
    }

    this.hitStop(0.04);
    this.emit('playerDamage', dealt, this.health / this.maxHealth);

    if (this.health <= 0) this._down();
  }

  _down() {
    this.state = RunState.DOWNED;
    this._downedTimer = settings.combat.reviveDelay;
    this.combo = 0;
    this.ctx.flash?.trigger(getColor('#ff3b30'), 0.5);
    this.ctx.shake?.add(1.2 * settings.global.cameraShake, 1.4, 14);
    this.emit('downed');
  }

  _revive() {
    this.health = this.maxHealth;
    this._sinceDamage = 99;
    this.state = RunState.FIGHTING;

    // Coming back has to buy space or the revive is instantly undone: everything
    // nearby is thrown off and stunned for a beat.
    const { monsters, character, bursts, decals } = this.ctx;
    const centre = character?.position ?? _scratch.set(0, 0, 0);
    decals?.spawn(DecalType.SHOCKWAVE, centre, {
      radius: 7,
      life: 0.7,
      colorA: getColor('#9fe8ff'),
      colorB: getColor('#ffffff'),
      intensity: 2,
      width: 0.12,
      growth: 1.8
    });
    for (const monster of monsters.active) {
      if (!monster.isTargetable) continue;
      const dx = monster.position.x - centre.x;
      const dz = monster.position.z - centre.z;
      const distance = Math.max(0.1, Math.hypot(dx, dz));
      if (distance > 9) continue;
      monster.applyKnockback(dx / distance, dz / distance, 14);
      monster.applyStatus('shock', 1.2);
    }

    this.ctx.shake?.add(0.8 * settings.global.cameraShake, 2, 18);
    this.emit('revived');
  }

  /** Freeze the world for `seconds`. Repeats take the longest, never stack. */
  hitStop(seconds) {
    if (seconds <= 0) return;
    this._hitStop = Math.max(this._hitStop, seconds);
  }

  /**
   * The time multiplier the app should apply this frame.
   *
   * Not zero at its peak — a hard stop reads as a dropped frame, a heavy
   * slow-down reads as impact.
   */
  get timeScale() {
    if (this._hitStop > 0) return 0.08;
    if (this.state === RunState.DOWNED) return 0.45; // downed = the world slows
    return 1;
  }

  get isDowned() {
    return this.state === RunState.DOWNED;
  }

  /* ------------------------------------------------------------------ */

  /**
   * @param {number} dt real seconds — the run's clock is deliberately *not* the
   *   scaled simulation delta, so a hit-stop cannot slow the wave timer down.
   */
  update(dt, elapsed) {
    this.elapsed = elapsed;
    this._hitStop = Math.max(0, this._hitStop - dt);

    if (this._comboTimer > 0) {
      this._comboTimer -= dt;
      if (this._comboTimer <= 0 && this.combo > 0) {
        this.combo = 0;
        this.emit('combo', 0);
      }
    }

    // Sitting is a real decision rather than a pose: it heals several times
    // faster and comes out of cover sooner, and it costs you every bit of your
    // mobility while a wave is walking toward you.
    const meditating = this.ctx.character?.locomotion?.isSitting ?? false;
    const cfg = settings.combat;
    const delay = meditating ? cfg.regenDelay * 0.35 : cfg.regenDelay;
    const rate = cfg.playerRegen * (meditating ? cfg.sitRegen : 1);

    this._sinceDamage += dt;
    if (
      this.state !== RunState.DOWNED &&
      this.health < this.maxHealth &&
      this._sinceDamage > delay
    ) {
      this.health = Math.min(this.maxHealth, this.health + rate * dt);
    }
    // Gear regeneration works always, in a fight too (`regen` health per second).
    if (this.state !== RunState.DOWNED && this.regen > 0 && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + this.regen * dt);
    }

    switch (this.state) {
      case RunState.DOWNED:
        this._downedTimer -= dt;
        if (this._downedTimer <= 0) this._revive();
        break;

      case RunState.BREATHER:
        if (!this.authority) break;
        this._breatherTimer -= dt;
        if (this._breatherTimer <= 0) this.nextWave();
        break;

      case RunState.FIGHTING:
        if (!this.authority) break;
        this._updateWave(dt);
        break;

      default:
        break;
    }
  }

  _updateWave(dt) {
    const cfg = settings.waves;
    const monsters = this.ctx.monsters;

    if (this._spawnQueue > 0) {
      this._spawnTimer -= dt;
      if (this._spawnTimer <= 0) {
        this._spawnTimer = cfg.spawnInterval;
        // The boss of the wave comes in first, so it is walking toward you the
        // whole time you are clearing its escort.
        const kind = this._bossKind ?? monsters.randomKind();
        const boss = this._bossKind;
        this._bossKind = null;
        const spawned = monsters.spawn(kind, null, { wave: this.wave });
        if (spawned) {
          this._spawnQueue -= 1;
          if (boss) this.emit('boss', spawned);
        }
      }
      return;
    }

    if (monsters.aliveCount === 0) {
      this.emit('waveCleared', this.wave);
      // Clearing a wave is worth something on its own, and it scales — the
      // reason to push one wave further.
      const bonus = 100 * this.wave;
      this.score += bonus;
      this.emit('score', this.score, bonus);
      if (settings.waves.enabled && settings.waves.autoStart) this._beginBreather();
      else this.state = RunState.IDLE;
    }
  }

  /* ------------------------------------------------------------------ */

  /** Seconds left on the revive timer, or 0 when not downed. */
  get downedRemaining() {
    return this.state === RunState.DOWNED ? Math.max(0, this._downedTimer) : 0;
  }

  /** Seconds until the next wave, or 0 when one is already running. */
  get breatherRemaining() {
    return this.state === RunState.BREATHER ? Math.max(0, this._breatherTimer) : 0;
  }

  get healthRatio() {
    return saturate(this.health / Math.max(1, this.maxHealth));
  }

  dispose() {
    this.stop();
    super.clear();
  }
}
