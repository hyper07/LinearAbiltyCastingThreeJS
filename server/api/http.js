/**
 * Small HTTP helpers shared by every API handler, so the dev server
 * (vite.config.js) and the production server (server/server.js) answer the
 * same routes with the same shapes.
 *
 * A handler here is `(req, res) => Promise<boolean>`: true when it answered,
 * false when the route is not its business and the next one should look.
 */

/** Send JSON with a status. */
export function json(res, status, body, headers = {}) {
  if (res.headersSent) return;
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(JSON.stringify(body));
}

/** The path of a request without its query string. */
export function pathOf(req) {
  return (req.url ?? '/').split('?')[0];
}

/** The query string of a request, parsed. */
export function queryOf(req) {
  const i = (req.url ?? '').indexOf('?');
  return new URLSearchParams(i >= 0 ? req.url.slice(i + 1) : '');
}

/**
 * Read a JSON body, refusing anything over `maxBytes`. Resolves `{}` for an
 * empty body; rejects on malformed JSON (the caller answers 400).
 */
export function readJson(req, maxBytes = 512 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('payload too large'));
        req.destroy();
      } else {
        chunks.push(chunk);
      }
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch (error) {
        reject(new Error(`bad JSON: ${error.message}`));
      }
    });
    req.on('error', reject);
  });
}

/**
 * The client's address, honouring `X-Forwarded-For` only when the deployment
 * says it sits behind a proxy (TRUST_PROXY=1) — otherwise anyone could spoof
 * their way past a rate limit.
 */
export function clientIp(req, trustProxy = process.env.TRUST_PROXY === '1') {
  if (trustProxy) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

/**
 * A token bucket per key: `perMinute` requests sustained, with a burst of
 * the same size. Keys that go quiet are forgotten, so the map stays small.
 */
export class RateLimiter {
  constructor(perMinute, { burst = perMinute } = {}) {
    this.rate = perMinute / 60_000; // tokens per ms
    this.burst = burst;
    this.buckets = new Map();
    this._sweep = 0;
  }

  /** @returns {boolean} whether the call may go ahead */
  take(key, cost = 1) {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: this.burst, at: now };
      this.buckets.set(key, bucket);
    }
    bucket.tokens = Math.min(this.burst, bucket.tokens + (now - bucket.at) * this.rate);
    bucket.at = now;
    if (now - this._sweep > 60_000) this._forget(now);
    if (bucket.tokens < cost) return false;
    bucket.tokens -= cost;
    return true;
  }

  _forget(now) {
    this._sweep = now;
    for (const [key, bucket] of this.buckets) if (now - bucket.at > 120_000) this.buckets.delete(key);
  }
}

/** Run handlers in order; the first that answers wins. */
export function chain(handlers) {
  return async (req, res) => {
    for (const handler of handlers) {
      if (await handler(req, res)) return true;
    }
    return false;
  };
}
