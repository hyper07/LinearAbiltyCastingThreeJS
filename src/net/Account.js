import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * The player's account on the game server (server/game): sign up, sign in,
 * sign out, and the history of everything that happened to the character.
 * The session lives in an HttpOnly cookie the page cannot read, so nothing
 * here stores a password or a token.
 *
 * Emits `change` (account or null).
 */
export class Account extends EventEmitter {
  constructor() {
    super();
    /** { id, name, created } when signed in. */
    this.user = null;
    /** Is there a game server to sign in to? (Not on a static host.) */
    this.available = false;
  }

  get signedIn() {
    return Boolean(this.user);
  }

  async _call(path, body = null) {
    let response;
    try {
      response = await fetch(`./api/account/${path}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
    } catch {
      return { ok: false, error: 'The game server is not reachable', offline: true };
    }
    const data = await response.json().catch(() => ({}));
    return response.ok ? { ok: true, ...data } : { ok: false, status: response.status, ...data, error: data.error ?? `HTTP ${response.status}` };
  }

  /** Who is signed in (from the cookie), with their character. */
  async me() {
    const r = await this._call('me');
    this.available = r.ok || (r.status && r.status !== 404);
    this.user = r.ok ? r.account : null;
    this.emit('change', this.user);
    return r;
  }

  async register(name, password) {
    const r = await this._call('register', { name, password });
    if (r.ok) this._set(r.account);
    return r;
  }

  async login(name, password) {
    const r = await this._call('login', { name, password });
    if (r.ok) this._set(r.account);
    return r;
  }

  async logout() {
    await this._call('logout', {});
    this._set(null);
  }

  /** The character's history, newest first. */
  async history(before = null) {
    const r = await this._call(`history?limit=40${before ? `&before=${before}` : ''}`);
    return r.ok ? r.events : [];
  }

  _set(user) {
    this.user = user;
    this.emit('change', user);
  }
}
