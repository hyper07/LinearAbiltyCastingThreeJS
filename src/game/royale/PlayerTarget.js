import { Vector3 } from 'three';
import { settings } from '../../config/settings.js';

const FAR = new Vector3(0, -1000, 0);
const NONE = { dealt: 0, killed: false, shattered: false, overkill: 0 };

/**
 * Another player, as something this player's attacks can hit (battle royale).
 *
 * It looks like a monster to Combat and WeaponFire — a position, a radius, a
 * centre, `applyDamage` — so every spell, swing and gun works on players with
 * no change. A hit is not applied here: it is sent to that player, whose own
 * game takes the damage (and says when they are out). The share a player
 * takes is `incomingScale` (settings.royale.pvpScale), so nobody is one-shot.
 */
export class PlayerTarget {
  /**
   * @param {import('../../net/RemotePlayer.js').RemotePlayer} remote
   * @param {(remoteId: string, amount: number) => void} onHit
   */
  constructor(remote, onHit) {
    this.remote = remote;
    this.onHit = onHit;
    this.kind = 'player';
    this.id = `p:${remote.id}`;
    this.config = { accent: '#ff6b6b' };
    this.root = { scale: { x: 1 } };
  }

  get incomingScale() {
    return settings.royale.pvpScale;
  }

  get position() {
    return this.remote.body?.position ?? FAR;
  }

  get isAlive() {
    return Boolean(this.remote.body) && !this.remote.downed;
  }

  get isTargetable() {
    return this.isAlive && this.remote.ready !== false;
  }

  get hitRadius() {
    return 0.5;
  }

  centre(out) {
    const p = this.position;
    return out.set(p.x, p.y + 1.1, p.z);
  }

  applyDamage(amount) {
    if (!this.isTargetable || !(amount > 0)) return NONE;
    this.onHit(this.remote.id, amount);
    return { dealt: amount, killed: false, shattered: false, overkill: 0 };
  }

  applyStatus() {}

  applyKnockback() {}
}
