import { MathUtils, Vector3 } from 'three';
import { CharacterController } from '../animation/CharacterController.js';
import { platform } from '../platform/index.js';
import { CUSTOM_LOOKS, LOOKS, lookModel, lookRig } from '../platform/character/classes.js';
import { settings } from '../config/settings.js';

const _v = new Vector3();

/**
 * Another player's body in your world.
 *
 * It is a real `CharacterController` — the same rig, clips, weapon and gear
 * visuals as your own — steered by the states its owner sends fifteen times
 * a second rather than by keys. Between two states it glides toward the
 * latest one (plus a little of the velocity it reported), which is what
 * keeps a 15 Hz stream looking like continuous movement.
 */
export class RemotePlayer {
  /**
   * @param {import('../core/App.js').App} app
   * @param {string} id
   * @param {string} name
   */
  constructor(app, id, name) {
    this.app = app;
    this.id = id;
    this.name = name;
    this.meta = null;
    this.body = null;
    this.label = null;
    /** The latest state its owner sent. */
    this.state = null;
    this.hp = 1;
    this.maxHp = 1;
    this.downed = false;
    this._loading = null;
    this._lastJump = 0;
  }

  get position() {
    return this.body?.position ?? null;
  }

  get ready() {
    return Boolean(this.body?.model);
  }

  /** The look its owner chose, as a character definition this body can load. */
  _definition(meta) {
    const base = platform.characters.get(meta.classId) ?? platform.characters.get('caster');
    if (!base) return null;
    const def = { ...base };
    if (meta.look && base.classSpec && (LOOKS[meta.look] || CUSTOM_LOOKS[meta.look])) {
      def.look = meta.look;
      def.model = lookModel(meta.look, base.model?.tint);
      Object.assign(def, lookRig(meta.look));
    }
    return def;
  }

  /**
   * Class, look, weapon, colours and worn gear. A change of body reloads the
   * model; anything else is applied in place.
   */
  setMeta(meta) {
    const previous = this.meta;
    this.meta = meta;
    if (meta.name) this.name = meta.name;
    const reload = !previous || previous.classId !== meta.classId || previous.look !== meta.look;
    this._loading = (this._loading ?? Promise.resolve()).then(() => (reload ? this._load(meta) : this._dress(meta))).catch((error) => {
      console.warn('[party] could not dress a player', error);
    });
    return this._loading;
  }

  async _load(meta) {
    const def = this._definition(meta);
    if (!def || !this.app._assets) return;
    const keep = this.body ? this.body.position.clone() : null;
    if (!this.body) {
      this.body = new CharacterController(this.app.environment, def);
      this.body.root.name = `Player:${this.id}`;
      // No walls for a body that is told where it is; the owner already collided.
      this.body.locomotion.obstacles = [];
      this.body.locomotion.props = [];
      this.body.locomotion.bounds = Infinity;
      this.body.locomotion.onFootstep = (position, speed) => this.app._footstep?.(position, speed);
      this.app.scene.add(this.body.root);
      await this.body.load(this.app._assets);
    } else {
      await this.body.reload(this.app._assets, def);
    }
    if (keep) this.body.position.copy(keep);
    else if (this.state) this.body.position.set(this.state.x, this.state.y ?? 0, this.state.z);
    this._dress(meta);
    this.label ??= this.app.labels.add(this.body.position, this.name, { className: 'world-label--player', offset: 2.15, maxDistance: 60 });
    this.label.setText(this.name);
  }

  _dress(meta) {
    if (!this.body?.model) return;
    if (meta.appearance) this.body.applyAppearance(meta.appearance);
    if (meta.weaponId) this.body.equipWeapon(meta.weaponId, { activate: false });
    this.body.wearGear(meta.gear ?? {}, (item) => !meta.idle?.includes(item?.uid));
  }

  /** A state from its owner: position, heading, velocity, flags. */
  push(s) {
    this.state = { ...s, at: performance.now() / 1000 };
    this.hp = s.hp ?? this.hp;
    this.maxHp = s.mhp ?? this.maxHp;
    this.downed = Boolean(s.dn);
    if (!this.body) return;
    const locomotion = this.body.locomotion;
    if (s.jp && s.jp !== this._lastJump) {
      this._lastJump = s.jp;
      locomotion.jump();
    }
    if (Boolean(s.sit) !== locomotion.sitting) locomotion.toggleSit(Boolean(s.sit));
    locomotion.sprinting = Boolean(s.sp);
    // First word from a body that is still at the origin: snap, don't glide.
    if (!this._placed) {
      this._placed = true;
      this.body.position.set(s.x, s.y ?? 0, s.z);
      this.body.setFacing(s.yaw ?? 0);
    }
  }

  playCast(anim, { lunge = false, facing = null } = {}) {
    if (!this.body?.model) return;
    if (facing != null) this.body.setFacing(facing);
    this.body.locomotion.toggleSit(false);
    this.body.playCast(anim);
    if (lunge) this.body.castLunge();
  }

  update(dt) {
    const body = this.body;
    const s = this.state;
    if (!body?.model) return;
    // Only in the fight: a body standing in the keep behind the menu is noise.
    const shown = this.app.phase === 'playing' && Boolean(s);
    body.root.visible = shown;
    this.label?.setVisible(shown);
    if (!s) return;
    const locomotion = body.locomotion;
    // Where the owner is by now: the last state carried forward by its
    // velocity, but never more than a few frames — a stale state must not
    // run a body off into the distance.
    const lead = Math.min(0.2, performance.now() / 1000 - s.at);
    const tx = s.x + (s.vx ?? 0) * lead;
    const tz = s.z + (s.vz ?? 0) * lead;
    const dx = tx - body.position.x;
    const dz = tz - body.position.z;
    const gap = Math.hypot(dx, dz);
    if (gap > 6) {
      // Teleported (a blink, a portal): go there.
      body.position.x = tx;
      body.position.z = tz;
      locomotion.velocity.set(0, 0, 0);
      locomotion.intent.set(0, 0, 0);
    } else if (dt > 0) {
      // Close the gap in about a tenth of a second, and tell the locomotion
      // that is the speed, so the gait and the lean come from the movement.
      const top = Math.max(0.1, settings.character.moveSpeed * locomotion.gearMultiplier);
      const rate = Math.min(top * 1.3, gap / 0.1);
      _v.set(dx, 0, dz);
      if (gap > 0.02) _v.multiplyScalar(rate / gap);
      else _v.set(0, 0, 0);
      locomotion.velocity.copy(_v);
      locomotion.intent.set(_v.x / top, 0, _v.z / top);
      if (locomotion.intent.lengthSq() > 1) locomotion.intent.normalize();
    }
    if (s.yaw != null) {
      const delta = MathUtils.euclideanModulo(s.yaw - body.facing + Math.PI, Math.PI * 2) - Math.PI;
      body.setFacing(body.facing + delta * Math.min(1, dt * 14));
    }
    body.update(dt);
  }

  dispose() {
    this.label?.remove();
    this.label = null;
    if (this.body) {
      this.app.scene.remove(this.body.root);
      this.body.dispose();
      this.body = null;
    }
  }
}
