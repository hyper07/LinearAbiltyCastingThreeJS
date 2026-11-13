import { createHash, timingSafeEqual } from 'node:crypto';
import { RateLimiter, clientIp } from './http.js';

/**
 * The platform admin site's access to the games' admin APIs: HTTP Basic auth
 * with an id from ADMIN_ACCOUNTS and the password ADMIN_PASSWORD (checked in
 * constant time). Ten failed tries a minute per address, then 429.
 *
 *   const admin = adminAuth(env);
 *   const refused = admin.refuse(req, res, send); if (refused) return refused;
 */
export function adminAuth(env = process.env) {
  const ids = new Set(String(env.ADMIN_ACCOUNTS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
  const digest = (v) => createHash('sha256').update(String(v)).digest();
  const password = env.ADMIN_PASSWORD ? digest(env.ADMIN_PASSWORD) : null;
  const fails = new RateLimiter(10, { burst: 5 });
  const calls = new RateLimiter(120, { burst: 30 });

  /** The admin id a request carries, or null. */
  const idOf = (req) => {
    const header = String(req.headers.authorization ?? '');
    if (!password || !header.startsWith('Basic ')) return null;
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const at = decoded.indexOf(':');
    if (at < 1) return null;
    const id = decoded.slice(0, at).trim().toLowerCase();
    const ok = timingSafeEqual(digest(decoded.slice(at + 1)), password);
    return ok && ids.has(id) ? id : null;
  };

  return {
    on: Boolean(password && ids.size),
    idOf,
    /** Answers and returns true when the request is not the admin's (or too fast); false to go on. */
    refuse(req, res, send) {
      const ip = clientIp(req);
      if (!idOf(req)) {
        if (!fails.take(ip)) return send(429, { error: 'Too many tries — wait a minute' }), true;
        res.setHeader('WWW-Authenticate', 'Basic realm="Gamory admin", charset="UTF-8"');
        return send(401, { error: password ? 'Admin id and password required' : 'The admin API is off (set ADMIN_ACCOUNTS and ADMIN_PASSWORD)' }), true;
      }
      if (!calls.take(ip)) return send(429, { error: 'Slow down' }), true;
      return false;
    }
  };
}
