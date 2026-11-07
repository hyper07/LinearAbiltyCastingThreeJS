import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);

/**
 * The server's keys and the few cryptographic jobs they do.
 *
 * One master secret (SERVER_SECRET, or a random one kept in
 * DATA_DIR/server.key) is split with HKDF into a key per job, so no key is
 * ever used for two things:
 *
 *   seal    AES-256-GCM: characters are stored encrypted *and* sealed — a
 *           saved row edited outside the server fails to open
 *   chain   HMAC-SHA-256: each history event is chained to the one before,
 *           so a deleted or edited event breaks the chain
 *   ip      HMAC-SHA-256: client addresses are kept only as a keyed hash (to
 *           match a blocked address) plus an encrypted copy (to read one, on
 *           purpose, during an investigation)
 *
 * Passwords are hashed with scrypt and a per-account salt; session tokens are
 * random 256-bit values of which only a SHA-256 is stored, so a copy of the
 * database lets nobody sign in as anyone.
 */

const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_FILE = 'server.key';

/** The master secret: SERVER_SECRET (base64, ≥ 32 bytes), else a random one saved next to the data. */
export function loadSecret(dataDir, env = process.env) {
  if (env.SERVER_SECRET) {
    const secret = Buffer.from(env.SERVER_SECRET, 'base64');
    if (secret.length < 32) throw new Error('SERVER_SECRET must be at least 32 bytes, base64-encoded');
    return { secret, source: 'env' };
  }
  mkdirSync(dataDir, { recursive: true });
  const file = join(dataDir, KEY_FILE);
  if (existsSync(file)) return { secret: Buffer.from(readFileSync(file, 'utf8').trim(), 'base64'), source: file };
  const secret = randomBytes(48);
  writeFileSync(file, secret.toString('base64') + '\n', { mode: 0o600 });
  try {
    chmodSync(file, 0o600);
  } catch {
    /* not on every filesystem */
  }
  return { secret, source: file, created: true };
}

export class Keys {
  /** @param {Buffer} secret */
  constructor(secret) {
    const derive = (info) => Buffer.from(hkdfSync('sha256', secret, Buffer.from('gamory'), Buffer.from(info), 32));
    this.sealKey = derive('character-seal-v1');
    this.chainKey = derive('history-chain-v1');
    this.ipKey = derive('client-address-v1');
    this.ipEncKey = derive('client-address-enc-v1');
  }

  /* ---- encrypt and seal data at rest (AES-256-GCM) ---- */

  /**
   * Encrypt `value` (JSON) so that it only opens with this key *and* the same
   * `context` (e.g. the account id) — a row moved to another account fails.
   * @returns {string} `v1.<iv>.<tag>.<ciphertext>` (base64url)
   */
  seal(value, context, key = this.sealKey) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(String(context)));
    const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), body.toString('base64url')].join('.');
  }

  /** Open a sealed value; throws if it was changed, or belongs to another context. */
  open(sealed, context, key = this.sealKey) {
    const [version, iv, tag, body] = String(sealed).split('.');
    if (version !== 'v1' || !iv || !tag || body == null) throw new Error('not a sealed value');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
    decipher.setAAD(Buffer.from(String(context)));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    const text = Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]).toString('utf8');
    return JSON.parse(text);
  }

  /* ---- the history chain ---- */

  chainHash(prevHash, fields) {
    return createHmac('sha256', this.chainKey).update(prevHash).update('\n').update(JSON.stringify(fields)).digest('hex');
  }

  /* ---- client addresses ---- */

  /** A keyed hash of an address: equal addresses match, the address itself is not stored. */
  ipTag(ip) {
    return createHmac('sha256', this.ipKey).update(String(ip ?? '')).digest('base64url').slice(0, 22);
  }

  ipSeal(ip) {
    return this.seal(String(ip ?? ''), 'ip', this.ipEncKey);
  }

  ipOpen(sealed) {
    return this.open(sealed, 'ip', this.ipEncKey);
  }
}

/* ---- passwords and tokens (no key needed) ---- */

/** scrypt with a random salt: `scrypt$N$r$p$salt$hash`. */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(String(password).normalize('NFKC'), salt, 32, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64url'), hash.toString('base64url')].join('$');
}

/** Constant-time check of a password against a stored hash. */
export async function verifyPassword(password, stored) {
  const [kind, N, r, p, salt, hash] = String(stored ?? '').split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = await scrypt(String(password).normalize('NFKC'), Buffer.from(salt, 'base64url'), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    maxmem: SCRYPT.maxmem
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** A hash to burn the same time on an unknown account name, so timing tells nothing. */
export const DUMMY_PASSWORD_HASH = 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

/** A new session token (what the browser holds) and its SHA-256 (what the database holds). */
export function newToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: tokenHash(token) };
}

export function tokenHash(token) {
  return createHash('sha256').update(String(token)).digest('base64url');
}

/** A random id for runs and server-made items. */
export function newId(prefix = '') {
  return `${prefix}${randomBytes(12).toString('base64url')}`;
}
