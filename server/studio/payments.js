/**
 * Payments for the Game Studio's store and plans — an INTERFACE, and the only provider that
 * exists today: a FAKE one. TEST MODE: nothing here charges anyone, no card is asked for, no
 * money moves. Every payment it records says `test: true`, and the Studio shows "Test mode".
 *
 *   const payments = createPayments(env)
 *   await payments.charge({ accountId, amount, description, key })      → { id, status, test, provider }
 *   await payments.subscribe({ accountId, plan, price, key })            → { id, status, test, provider }
 *   await payments.refund(id)                                            → { id, status }
 *
 * Amounts in a charge are store credits (integers); a subscription's price is the plan's
 * { krw, usd } (src/platform/plans.js). Going live (docs/game-studio.md, "Payments"): add a
 * provider here with the same four members for a real payment service, keyed by
 * PAYMENTS_PROVIDER, keep its secret key in .env only, verify its webhooks on the server, and
 * keep the parent/guardian check in front of every call.
 */
import { randomBytes } from 'node:crypto';

/** What one store credit is shown as (display only; test mode charges nothing). */
export const CREDIT_VALUE = { krw: 100, usd: 0.08 };

export function displayPrice(credits) {
  const n = Math.max(0, Math.round(Number(credits) || 0));
  return { credits: n, krw: n * CREDIT_VALUE.krw, usd: Math.round(n * CREDIT_VALUE.usd * 100) / 100 };
}

/** The fake provider: always succeeds (or always fails with PAYMENTS_FAKE_FAIL=1, for tests). */
export function fakeProvider({ fail = false } = {}) {
  const id = () => `test_${randomBytes(9).toString('base64url')}`;
  const seen = new Map();
  const once = (key, make) => {
    if (key && seen.has(key)) return seen.get(key);
    const out = make();
    if (key) seen.set(key, out);
    if (seen.size > 5000) seen.clear();
    return out;
  };
  return {
    name: 'fake',
    mode: 'test',
    async charge({ amount, key = null }) {
      if (!Number.isInteger(amount) || amount < 0) throw Object.assign(new Error('Bad amount'), { status: 400 });
      return once(key, () => ({ id: id(), status: fail ? 'failed' : 'succeeded', test: true, provider: 'fake' }));
    },
    async subscribe({ plan, key = null }) {
      if (!plan) throw Object.assign(new Error('Which plan?'), { status: 400 });
      return once(key, () => ({ id: id(), status: fail ? 'failed' : 'succeeded', test: true, provider: 'fake' }));
    },
    async refund(paymentId) {
      return { id: paymentId, status: 'refunded' };
    }
  };
}

/**
 * The payments the server uses. Only 'fake' exists; anything else is refused at start-up so a
 * misconfigured server can never look as if it takes real money.
 */
export function createPayments(env = process.env) {
  const name = String(env.PAYMENTS_PROVIDER ?? 'fake').toLowerCase();
  if (name !== 'fake') throw new Error(`PAYMENTS_PROVIDER "${name}" is not implemented — only the test-mode "fake" provider exists (docs/game-studio.md, "Payments")`);
  return fakeProvider({ fail: env.PAYMENTS_FAKE_FAIL === '1' });
}
