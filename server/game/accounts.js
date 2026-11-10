import { DUMMY_PASSWORD_HASH, hashPassword, newToken, tokenHash, verifyPassword } from './keys.js';
import { Refusal } from './rules.js';
import { PLAN_IDS } from '../../src/platform/plans.js';

const NAME = /^[\p{L}\p{N}][\p{L}\p{N} _.-]{1,18}[\p{L}\p{N}]$/u;
const SESSION_DAYS = 30;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

/**
 * Accounts and sessions.
 *
 * - A password is stored only as its scrypt hash with a per-account salt,
 *   and checked in constant time; an unknown name burns the same time as a
 *   wrong password, so neither tells an attacker which names exist.
 * - Five wrong passwords lock the account for fifteen minutes (and the
 *   history records it), on top of the per-address login rate limit.
 * - A session token is 256 random bits, given to the browser as an
 *   HttpOnly, SameSite=Strict cookie; the database keeps only its SHA-256.
 * - Addresses are kept as a keyed hash (to match an address block) and an
 *   encrypted copy, never in the clear.
 */
export class Accounts {
  /** @param {{ db, keys, history, authority, now?: () => number }} ctx */
  constructor({ db, keys, history, authority, now = () => Date.now(), accountsPerAddressPerDay = 5 }) {
    /** New accounts one address may make in a day (raise it for a LAN party behind one address). */
    this.accountsPerAddressPerDay = accountsPerAddressPerDay;
    this.db = db;
    this.keys = keys;
    this.history = history;
    this.authority = authority;
    this.now = now;
  }

  static nameKey(name) {
    return String(name).normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  _assertAddress(ip) {
    const row = this.db.q('SELECT until, reason FROM ip_blocks WHERE ip_tag = ?').get(this.keys.ipTag(ip));
    if (row && row.until > this.now()) throw new Refusal(`Blocked: ${row.reason ?? 'abuse from this address'}`, 403);
  }

  async register({ name, password, ip = '', agent = '' }) {
    name = String(name ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
    password = String(password ?? '');
    if (!NAME.test(name)) throw new Refusal('Names are 3–20 letters or digits (spaces, _ . - inside)', 400);
    if (password.length < 8 || password.length > 128) throw new Refusal('Passwords are 8 to 128 characters', 400);
    if (password.toLowerCase().includes(Accounts.nameKey(name))) throw new Refusal('The password must not contain the name', 400);
    this._assertAddress(ip);
    const tag = this.keys.ipTag(ip);
    const recent = this.db.q('SELECT COUNT(*) AS n FROM accounts WHERE created_ip_tag = ? AND created > ?').get(tag, this.now() - 864e5).n;
    if (recent >= this.accountsPerAddressPerDay) throw new Refusal('Too many new accounts from this address today', 429);
    const passHash = await hashPassword(password);
    const key = Accounts.nameKey(name);
    let id;
    try {
      id = this.db.tx(() => {
        const now = this.now();
        const r = this.db.q('INSERT INTO accounts (name, name_key, pass_hash, created, created_ip_tag, created_ip_enc) VALUES (?, ?, ?, ?, ?, ?)').run(name, key, passHash, now, tag, this.keys.ipSeal(ip));
        const accountId = Number(r.lastInsertRowid);
        this.history.add(accountId, 'register', { name }, now);
        this.authority.createCharacter(accountId);
        return accountId;
      });
    } catch (error) {
      this.authority.characters.clear();
      if (/UNIQUE/.test(error.message)) throw new Refusal('That name is taken', 409);
      throw error;
    }
    return this._session(id, ip, agent);
  }

  async login({ name, password, ip = '', agent = '' }) {
    this._assertAddress(ip);
    const row = this.db.q('SELECT id, pass_hash, failed_logins, locked_until, blocked_until, block_reason FROM accounts WHERE name_key = ?').get(Accounts.nameKey(name ?? ''));
    const ok = await verifyPassword(String(password ?? ''), row?.pass_hash ?? DUMMY_PASSWORD_HASH);
    const now = this.now();
    if (!row) throw new Refusal('Wrong name or password', 401);
    // Locked: refused even with the right password, so guessing on gains nothing.
    if (row.locked_until > now) throw new Refusal(`Too many wrong passwords — try again in ${Math.ceil((row.locked_until - now) / 6e4)} minutes`, 429);
    if (!ok) {
      const failed = row.failed_logins + 1;
      this.db.tx(() => {
        this.db.q('UPDATE accounts SET failed_logins = ?, locked_until = ? WHERE id = ?').run(failed >= MAX_FAILED ? 0 : failed, failed >= MAX_FAILED ? now + LOCK_MINUTES * 6e4 : 0, row.id);
        this.history.add(row.id, failed >= MAX_FAILED ? 'login-locked' : 'login-failed', { ip: this.keys.ipTag(ip) }, now);
      });
      throw new Refusal('Wrong name or password', 401);
    }
    if (row.blocked_until > now) throw new Refusal(`This account is blocked until ${new Date(row.blocked_until).toISOString().slice(0, 16).replace('T', ' ')} UTC: ${row.block_reason ?? 'rule breaks'}`, 403);
    this.db.q('UPDATE accounts SET failed_logins = 0, locked_until = 0, last_login = ? WHERE id = ?').run(now, row.id);
    return this._session(row.id, ip, agent);
  }

  _session(accountId, ip, agent) {
    const { token, hash } = newToken();
    const now = this.now();
    this.db.tx(() => {
      this.db.q('INSERT INTO sessions (token_hash, account_id, created, expires, ip_tag, ip_enc, agent) VALUES (?, ?, ?, ?, ?, ?, ?)').run(hash, accountId, now, now + SESSION_DAYS * 864e5, this.keys.ipTag(ip), this.keys.ipSeal(ip), String(agent).slice(0, 200));
      this.history.add(accountId, 'login', { ip: this.keys.ipTag(ip) }, now);
      // Old sessions expire; more than ten at once is not a person.
      this.db.q('DELETE FROM sessions WHERE account_id = ? AND (expires < ? OR token_hash NOT IN (SELECT token_hash FROM sessions WHERE account_id = ? ORDER BY created DESC LIMIT 10))').run(accountId, now, accountId);
    });
    return { token, account: this.public(accountId), maxAge: SESSION_DAYS * 86400 };
  }

  /** The account a session token belongs to, or null. */
  fromToken(token) {
    if (!token || token.length > 100) return null;
    const row = this.db.q('SELECT a.id, a.name, a.plan, a.blocked_until, a.block_reason, s.expires FROM sessions s JOIN accounts a ON a.id = s.account_id WHERE s.token_hash = ?').get(tokenHash(token));
    if (!row || row.expires < this.now()) return null;
    return { id: row.id, name: row.name, plan: row.plan, blockedUntil: row.blocked_until, blockReason: row.block_reason };
  }

  logout(token) {
    const account = this.fromToken(token);
    this.db.q('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token ?? ''));
    if (account) this.history.add(account.id, 'logout', {}, this.now());
  }

  public(accountId) {
    const row = this.db.q('SELECT id, name, plan, created, last_login, blocked_until, block_reason FROM accounts WHERE id = ?').get(accountId);
    if (!row) return null;
    return { id: row.id, name: row.name, plan: row.plan, created: row.created, blocked: row.blocked_until > this.now() ? { until: row.blocked_until, reason: row.block_reason } : null };
  }

  /* ---- for the people running the server (scripts/admin.mjs) ---- */

  byName(name) {
    return this.db.q('SELECT id, name FROM accounts WHERE name_key = ?').get(Accounts.nameKey(name)) ?? null;
  }

  block(accountId, hours, reason) {
    const until = this.now() + hours * 36e5;
    this.db.tx(() => {
      this.db.q('UPDATE accounts SET blocked_until = ?, block_reason = ?, blocks = blocks + 1 WHERE id = ?').run(until, reason, accountId);
      this.db.q('DELETE FROM sessions WHERE account_id = ?').run(accountId);
      this.history.add(accountId, 'blocked', { until, reason, by: 'admin' }, this.now());
    });
    return until;
  }

  unblock(accountId, note = '') {
    this.db.tx(() => {
      this.db.q('UPDATE accounts SET blocked_until = 0, block_reason = NULL WHERE id = ?').run(accountId);
      this.db.q('DELETE FROM strikes WHERE account_id = ?').run(accountId);
      this.history.add(accountId, 'unblocked', { note, by: 'admin' }, this.now());
    });
  }

  /** Set what an account pays for. The payment itself is not handled here: whatever takes it calls this. */
  setPlan(accountId, plan) {
    if (!PLAN_IDS.includes(plan)) throw new Refusal(`Plans are ${PLAN_IDS.join(', ')}`, 400);
    this.db.tx(() => {
      this.db.q('UPDATE accounts SET plan = ? WHERE id = ?').run(plan, accountId);
      this.history.add(accountId, 'plan', { plan, by: 'admin' }, this.now());
    });
  }

  blockAddress(ip, hours, reason) {
    this.db.q('INSERT INTO ip_blocks (ip_tag, until, reason) VALUES (?, ?, ?) ON CONFLICT(ip_tag) DO UPDATE SET until = excluded.until, reason = excluded.reason').run(this.keys.ipTag(ip), this.now() + hours * 36e5, reason);
  }
}
