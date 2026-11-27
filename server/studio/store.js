/**
 * The Studio's records in PostgreSQL (migration 012-studio): who owns each Studio game and who
 * may see it, usage against the plan, saved characters, the store, educators' classes and
 * generation jobs. Every rule that protects someone lives here and is unit-tested
 * (tests/unit/studio-*.test.mjs): plan limits, ownership, membership, purchases.
 *
 * Errors are `StudioError(message, status, extra)`; the HTTP layer (index.js) sends them as-is.
 */
import { randomBytes, randomInt } from 'node:crypto';
import { PLANS, planById, withinLimit } from '../../src/platform/plans.js';
import { CHARACTER_SCHEMA, defaultCharacter } from '../../src/shared/studio/spec.js';
import { check } from '../../src/shared/studio/schema.js';

export class StudioError extends Error {
  constructor(message, status = 400, extra = {}) {
    super(message);
    this.status = status;
    Object.assign(this, extra);
  }
}

export const VISIBILITIES = ['private', 'shared', 'public'];
export const TERMS = ['free-credit', 'standard', 'class-only'];
/** Join codes: no 0/O, 1/I/L — easy to read out to a class. 10 letters ≈ 49 bits. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const JOIN_CODE_RE = /^[A-HJ-NP-Z2-9]{5}-?[A-HJ-NP-Z2-9]{5}$/;
export const JOIN_CODE_DAYS = 14;
const DAY = 86400000;

export const dayKey = (now) => new Date(now).toISOString().slice(0, 10);
export const monthKey = (now) => new Date(now).toISOString().slice(0, 7);
const newId = (prefix) => `${prefix}_${randomBytes(9).toString('base64url').replace(/[-_]/g, 'x').toLowerCase()}`;

export function newJoinCode(rand = randomInt) {
  let s = '';
  for (let i = 0; i < 10; i++) s += CODE_ALPHABET[rand(CODE_ALPHABET.length)];
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}
export const normalizeJoinCode = (code) => {
  const c = String(code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return c.length === 10 ? `${c.slice(0, 5)}-${c.slice(5)}` : null;
};

/** A character from anyone (a saved one, a store listing), cleaned to the schema. */
export function cleanCharacter(raw) {
  const c = defaultCharacter({
    name: String(raw?.name ?? 'Friend').replace(/[<>]/g, '').slice(0, 40) || 'Friend',
    role: raw?.role,
    base: raw?.base,
    body: raw?.body,
    accessories: Array.isArray(raw?.accessories) ? raw.accessories.slice(0, 3) : undefined,
    size: typeof raw?.size === 'number' ? raw.size : undefined,
    line: typeof raw?.line === 'string' ? raw.line.slice(0, 160) : undefined
  });
  if (raw?.colors && typeof raw.colors === 'object') for (const k of ['main', 'second', 'accent']) if (/^#[0-9a-fA-F]{6}$/.test(raw.colors[k] ?? '')) c.colors[k] = raw.colors[k];
  c.id = 'char';
  c.model = null;
  const problems = check(CHARACTER_SCHEMA, c, 'character');
  if (problems.length) throw new StudioError(`That character does not fit: ${problems[0]}`, 422);
  return c;
}

/** The price a buyer pays on their plan (percent off, rounded up so it is never free by rounding). */
export function priceFor(price, planId) {
  const off = planById(planId).studio.assetDiscount ?? 0;
  const paid = price > 0 ? Math.max(1, Math.ceil((price * (100 - off)) / 100)) : 0;
  return { price, paid, discount: price - paid };
}

/** What the seller earns of a sale: their plan's share (a Creator's), never more than paid. */
export function sellerShare(paid, sellerPlan) {
  const share = planById(sellerPlan).studio.revenueShare || PLANS.creator.studio.revenueShare;
  return Math.min(paid, Math.floor((paid * share) / 100));
}

export class StudioStore {
  /** @param {import('../db/database.js').Database} db */
  constructor(db, { now = () => Date.now(), payments = null } = {}) {
    this.db = db;
    this.now = now;
    this.payments = payments;
  }

  async account(id) {
    const row = await this.db.one('SELECT id, name, plan FROM accounts WHERE id = ?', [id]);
    if (!row) throw new StudioError('No such account', 404);
    return row;
  }

  /* ------------------------------------------------------------ usage */

  async used(accountId, kind, period) {
    return Number((await this.db.one('SELECT n FROM studio_usage WHERE account_id = ? AND kind = ? AND period = ?', [accountId, kind, period]))?.n ?? 0);
  }

  /** Count one use if the limit allows it (atomic); throws 429 with `upgrade` when it does not. */
  async spend(account, kind, limit, period, message) {
    if (limit === 0) throw new StudioError(message, 403, { upgrade: true });
    if (limit == null) {
      await this.db.run('INSERT INTO studio_usage (account_id, kind, period, n) VALUES (?, ?, ?, 1) ON CONFLICT (account_id, kind, period) DO UPDATE SET n = studio_usage.n + 1', [account.id, kind, period]);
      return;
    }
    await this.db.run('INSERT INTO studio_usage (account_id, kind, period, n) VALUES (?, ?, ?, 0) ON CONFLICT (account_id, kind, period) DO NOTHING', [account.id, kind, period]);
    const row = await this.db.one('UPDATE studio_usage SET n = n + 1 WHERE account_id = ? AND kind = ? AND period = ? AND n < ? RETURNING n', [account.id, kind, period, limit]);
    if (!row) throw new StudioError(message, 429, { upgrade: true });
  }

  async refund(account, kind, period) {
    await this.db.run('UPDATE studio_usage SET n = GREATEST(0, n - 1) WHERE account_id = ? AND kind = ? AND period = ?', [account.id, kind, period]);
  }

  async spendChat(account) {
    const limit = planById(account.plan).studio.chatEditsPerDay;
    await this.spend(account, 'chat', limit, dayKey(this.now()), `That's all ${limit} chat changes for today on the ${planById(account.plan).name} plan. Edits by hand still work.`);
  }

  async storageBytes(accountId) {
    const games = Number((await this.db.one('SELECT COALESCE(SUM(bytes), 0) AS n FROM studio_games WHERE owner_id = ?', [accountId]))?.n ?? 0);
    const chars = Number((await this.db.one('SELECT COALESCE(SUM(LENGTH(data::text)), 0) AS n FROM studio_characters WHERE owner_id = ?', [accountId]))?.n ?? 0);
    return games + chars;
  }

  async assertStorage(account, more = 0) {
    const mb = planById(account.plan).studio.storageMB;
    if (mb == null) return;
    if ((await this.storageBytes(account.id)) + more > mb * 1024 * 1024) throw new StudioError(`Your ${mb} MB of Studio space is full — remove something or upgrade`, 413, { upgrade: true });
  }

  /** The plan page: limits and how much of each is used. */
  async usage(account) {
    const now = this.now();
    const plan = planById(account.plan);
    const count = async (sql, args) => Number((await this.db.one(sql, args))?.n ?? 0);
    return {
      plan: plan.id,
      limits: plan.studio,
      used: {
        chatEditsToday: await this.used(account.id, 'chat', dayKey(now)),
        generationsThisMonth: await this.used(account.id, 'gen', monthKey(now)),
        publicGames: await count("SELECT COUNT(*) AS n FROM studio_games WHERE owner_id = ? AND visibility = 'public'", [account.id]),
        privateGames: await count("SELECT COUNT(*) AS n FROM studio_games WHERE owner_id = ? AND visibility != 'public'", [account.id]),
        classes: await count("SELECT COUNT(*) AS n FROM studio_classes WHERE owner_id = ? AND status = 'active'", [account.id]),
        storageBytes: await this.storageBytes(account.id)
      }
    };
  }

  /* ------------------------------------------------------------ games */

  async registerGame(account, code, title, bytes = 0) {
    const now = this.now();
    await this.db.run('INSERT INTO studio_games (code, owner_id, title, bytes, created, updated) VALUES (?, ?, ?, ?, ?, ?)', [code, account.id, String(title).slice(0, 80), bytes, now, now]);
  }

  async game(code) {
    return this.db.one('SELECT code, owner_id, title, visibility, public_status, public_note, bytes, created, updated FROM studio_games WHERE code = ?', [code]);
  }

  async gamesOf(accountId) {
    return this.db.many('SELECT code, title, visibility, public_status, bytes, created, updated FROM studio_games WHERE owner_id = ? ORDER BY updated DESC LIMIT 500', [accountId]);
  }

  /** The game, if this account owns it (or is the admin); else 404 — never "it exists but…". */
  async owned(account, code, { admin = false } = {}) {
    const g = await this.game(code);
    if (!g || (!admin && Number(g.owner_id) !== Number(account?.id))) throw new StudioError('No such game in your Studio', 404);
    return g;
  }

  async touchGame(code, bytes) {
    await this.db.run('UPDATE studio_games SET updated = ?, bytes = ? WHERE code = ?', [this.now(), bytes, code]);
  }

  /**
   * Change who may see a game. Public needs room in the plan's public allowance and licences
   * that allow it (`assets` = the game's assets.json entries); it then waits for the admin.
   * Returns the row after.
   */
  async setVisibility(account, code, visibility, { assets = [] } = {}) {
    if (!VISIBILITIES.includes(visibility)) throw new StudioError('Visibility is private, shared or public', 400);
    const g = await this.owned(account, code);
    if (visibility === 'public' && g.visibility !== 'public') {
      const limit = planById(account.plan).studio.publicGames;
      const n = Number((await this.db.one("SELECT COUNT(*) AS n FROM studio_games WHERE owner_id = ? AND visibility = 'public'", [account.id]))?.n ?? 0);
      if (!withinLimit(limit, n)) throw new StudioError(`The ${planById(account.plan).name} plan has ${limit} public game${limit === 1 ? '' : 's'}. Private and class games stay unlimited.`, 403, { upgrade: true });
      const blocked = assets.filter((a) => a.terms === 'class-only' || (a.id.startsWith('mkt:') && !['free-credit', 'standard'].includes(a.terms)));
      if (blocked.length) throw new StudioError(`These assets may only be used in private or class games: ${blocked.map((a) => a.name).join(', ')}`, 409, { blocked: blocked.map((a) => a.id) });
    }
    const status = visibility === 'public' ? (g.visibility === 'public' ? g.public_status : 'pending') : 'none';
    await this.db.run('UPDATE studio_games SET visibility = ?, public_status = ?, public_note = NULL, updated = ? WHERE code = ?', [visibility, status, this.now(), code]);
    return this.game(code);
  }

  /** The admin's answer to a public request. */
  async reviewPublic(code, approve, note = '') {
    const g = await this.game(code);
    if (!g || g.visibility !== 'public') throw new StudioError('No public request for that game', 404);
    await this.db.run('UPDATE studio_games SET public_status = ?, public_note = ?, visibility = ?, updated = ? WHERE code = ?', [approve ? 'approved' : 'rejected', String(note).slice(0, 300) || null, approve ? 'public' : 'private', this.now(), code]);
    return this.game(code);
  }

  /* ------------------------------------------------------- characters */

  async saveCharacter(account, raw, id = null) {
    const c = cleanCharacter(raw);
    await this.assertStorage(account, JSON.stringify(c).length);
    const now = this.now();
    if (id) {
      const r = await this.db.run('UPDATE studio_characters SET name = ?, data = ?, updated = ? WHERE id = ? AND owner_id = ?', [c.name, c, now, id, account.id]);
      if (!r.rowCount) throw new StudioError('No such character', 404);
      return { id, ...c };
    }
    const n = Number((await this.db.one('SELECT COUNT(*) AS n FROM studio_characters WHERE owner_id = ?', [account.id]))?.n ?? 0);
    if (n >= 500) throw new StudioError('500 saved characters is the most — remove some first', 409);
    const newIdValue = newId('chr');
    await this.db.run('INSERT INTO studio_characters (id, owner_id, name, data, created, updated) VALUES (?, ?, ?, ?, ?, ?)', [newIdValue, account.id, c.name, c, now, now]);
    return { id: newIdValue, ...c };
  }

  async characters(accountId) {
    return (await this.db.many('SELECT id, name, data, updated FROM studio_characters WHERE owner_id = ? ORDER BY updated DESC LIMIT 500', [accountId])).map((r) => ({ id: r.id, ...r.data, name: r.name, updated: r.updated }));
  }

  async character(accountId, id) {
    const r = await this.db.one('SELECT id, name, data FROM studio_characters WHERE id = ? AND owner_id = ?', [id, accountId]);
    return r ? { id: r.id, ...r.data, name: r.name } : null;
  }

  async deleteCharacter(account, id) {
    return (await this.db.run('DELETE FROM studio_characters WHERE id = ? AND owner_id = ?', [id, account.id])).rowCount > 0;
  }

  /* ------------------------------------------------------------ store */

  /**
   * Offer a character in the store. Free sharing: every plan. Selling (price > 0): plans with
   * `sell` (Creator). Everything waits for the admin (status 'pending') — kids use the store.
   */
  async publish(account, { characterId = null, character = null, title, summary = '', price = 0, terms = 'standard' }) {
    const source = characterId ? await this.character(account.id, characterId) : character;
    if (!source) throw new StudioError('Which character?', 400);
    const c = cleanCharacter(source);
    price = Math.round(Number(price) || 0);
    if (price < 0 || price > 100000) throw new StudioError('Prices are 0 to 100,000 credits', 400);
    if (!TERMS.includes(terms)) throw new StudioError(`Terms are ${TERMS.join(', ')}`, 400);
    if (price === 0 && terms === 'standard') terms = 'free-credit';
    if (price > 0 && !planById(account.plan).studio.sell) throw new StudioError('Selling is part of the Creator plan. Sharing for free is open to everyone.', 403, { upgrade: true });
    if (price > 0 && terms === 'free-credit') throw new StudioError('"Free with credit" is for free items', 400);
    const name = String(title ?? c.name).replace(/[<>]/g, '').trim().slice(0, 60) || c.name;
    const id = newId('mkt');
    const now = this.now();
    await this.db.run('INSERT INTO studio_listings (id, owner_id, creator, kind, title, summary, data, price, terms, status, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, account.id, String(account.name).slice(0, 40), 'character', name, String(summary ?? '').replace(/[<>]/g, '').slice(0, 400), c, price, terms, 'pending', now, now]);
    return this.listing(id);
  }

  _listing(r, viewer = null) {
    if (!r) return null;
    return { id: r.id, kind: r.kind, title: r.title, summary: r.summary, creator: r.creator, data: r.data, price: r.price, terms: r.terms, status: r.status, sales: r.sales, reports: viewer?.admin || Number(r.owner_id) === Number(viewer?.id) ? r.reports : undefined, mine: Number(r.owner_id) === Number(viewer?.id), created: r.created, updated: r.updated };
  }

  async listing(id, viewer = null) {
    return this._listing(await this.db.one('SELECT * FROM studio_listings WHERE id = ?', [id]), viewer);
  }

  /** The store's shelves: listed items only, searched and sorted. */
  async browse({ q = '', sort = 'new', free = null, limit = 60, offset = 0 } = {}, viewer = null) {
    const where = ["status = 'listed'"];
    const args = [];
    if (q) {
      const like = `%${String(q).slice(0, 60).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      where.push('(title ILIKE ? OR summary ILIKE ? OR creator ILIKE ?)');
      args.push(like, like, like);
    }
    if (free === true) where.push('price = 0');
    if (free === false) where.push('price > 0');
    const order = sort === 'popular' ? 'sales DESC, updated DESC' : sort === 'price' ? 'price ASC, updated DESC' : 'updated DESC';
    const rows = await this.db.many(`SELECT * FROM studio_listings WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ? OFFSET ?`, [...args, Math.max(1, Math.min(100, Number(limit) || 60)), Math.max(0, Number(offset) || 0)]);
    return rows.map((r) => this._listing(r, viewer));
  }

  async owns(accountId, listingId) {
    const r = await this.db.one('SELECT 1 AS ok FROM studio_purchases WHERE listing_id = ? AND buyer_id = ? UNION SELECT 1 AS ok FROM studio_listings WHERE id = ? AND owner_id = ?', [listingId, accountId, listingId, accountId]);
    return Boolean(r);
  }

  /**
   * Buy (or take a free) listing. Paid: the plan's discount, one charge through the payments
   * provider (TEST MODE), then the purchase and the seller's share — all or nothing.
   * The caller has already passed the guardian check for paid items.
   */
  async buy(account, listingId, { key = null } = {}) {
    const l = await this.db.one('SELECT * FROM studio_listings WHERE id = ?', [listingId]);
    if (!l || l.status !== 'listed') throw new StudioError('That item is not in the store', 404);
    if (Number(l.owner_id) === Number(account.id)) throw new StudioError('That one is yours already', 409);
    if (await this.owns(account.id, listingId)) throw new StudioError('You have it already', 409);
    const { price, paid, discount } = priceFor(l.price, account.plan);
    let payment = null;
    if (paid > 0) {
      if (!this.payments) throw new StudioError('Payments are off on this server', 503);
      payment = await this.payments.charge({ accountId: account.id, amount: paid, description: `Store: ${l.title}`, key: key ?? `buy:${account.id}:${listingId}` });
      if (payment.status !== 'succeeded') throw new StudioError('The (test) payment did not go through', 402);
    }
    const now = this.now();
    const seller = await this.db.one('SELECT plan FROM accounts WHERE id = ?', [l.owner_id]);
    const record = () => this.db.tx(async () => {
      if (payment) await this.db.run('INSERT INTO studio_payments (id, account_id, kind, amount, currency, provider, test, status, ref, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [payment.id, account.id, 'purchase', paid, 'credits', payment.provider, payment.test !== false, payment.status, listingId, now]);
      const p = await this.db.one('INSERT INTO studio_purchases (listing_id, buyer_id, price, paid, discount, payment_id, at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (listing_id, buyer_id) DO NOTHING RETURNING id', [listingId, account.id, price, paid, discount, payment?.id ?? null, now]);
      if (!p) throw new StudioError('You have it already', 409);
      await this.db.run('UPDATE studio_listings SET sales = sales + 1 WHERE id = ?', [listingId]);
      if (paid > 0) await this.db.run('INSERT INTO studio_sales (listing_id, seller_id, purchase_id, gross, earned, at) VALUES (?, ?, ?, ?, ?, ?)', [listingId, l.owner_id, p.id, paid, sellerShare(paid, seller?.plan ?? 'creator'), now]);
      return { purchase: { id: p.id, listing: listingId, price, paid, discount, test: payment ? payment.test !== false : null, payment: payment?.id ?? null } };
    });
    try {
      return await record();
    } catch (error) {
      // Nothing was recorded: give the (test) money back.
      if (payment) await this.payments.refund(payment.id).catch(() => {});
      throw error;
    }
  }

  async purchases(accountId) {
    return (await this.db.many('SELECT p.id, p.listing_id, p.price, p.paid, p.discount, p.at, l.title, l.creator, l.data, l.terms, l.status FROM studio_purchases p JOIN studio_listings l ON l.id = p.listing_id WHERE p.buyer_id = ? ORDER BY p.at DESC LIMIT 500', [accountId])).map((r) => ({ id: r.id, listing: r.listing_id, title: r.title, creator: r.creator, data: r.data, terms: r.terms, price: r.price, paid: r.paid, discount: r.discount, at: r.at, available: r.status !== 'hidden' }));
  }

  /** A creator's sales page: each listing with sales and earnings, and the latest sales (no buyer names). */
  async sales(accountId) {
    const listings = await this.db.many('SELECT l.id, l.title, l.price, l.terms, l.status, l.sales, l.reports, COALESCE(SUM(s.earned), 0) AS earned, COALESCE(SUM(s.gross), 0) AS gross FROM studio_listings l LEFT JOIN studio_sales s ON s.listing_id = l.id WHERE l.owner_id = ? GROUP BY l.id ORDER BY l.updated DESC', [accountId]);
    const recent = await this.db.many('SELECT s.listing_id, s.gross, s.earned, s.at, l.title FROM studio_sales s JOIN studio_listings l ON l.id = s.listing_id WHERE s.seller_id = ? ORDER BY s.at DESC LIMIT 50', [accountId]);
    const total = listings.reduce((n, l) => n + Number(l.earned), 0);
    return { listings: listings.map((l) => ({ ...l, earned: Number(l.earned), gross: Number(l.gross) })), recent, earned: total };
  }

  async withdraw(account, listingId) {
    const r = await this.db.run("UPDATE studio_listings SET status = 'withdrawn', updated = ? WHERE id = ? AND owner_id = ? AND status != 'withdrawn'", [this.now(), listingId, account.id]);
    if (!r.rowCount) throw new StudioError('No such listing of yours', 404);
  }

  /** A report: one per person per item; three open reports hide it until the admin looks. */
  async report(account, { listingId = null, gameCode = null, reason }) {
    const why = String(reason ?? '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!why) throw new StudioError('Say what is wrong', 400);
    if (listingId) {
      const l = await this.db.one('SELECT id FROM studio_listings WHERE id = ?', [listingId]);
      if (!l) throw new StudioError('No such item', 404);
      const r = await this.db.run('INSERT INTO studio_reports (listing_id, reporter_id, reason, at) VALUES (?, ?, ?, ?) ON CONFLICT (listing_id, reporter_id) DO NOTHING', [listingId, account.id, why, this.now()]);
      if (r.rowCount) {
        const row = await this.db.one('UPDATE studio_listings SET reports = reports + 1 WHERE id = ? RETURNING reports, status', [listingId]);
        if (row.reports >= 3 && row.status === 'listed') await this.db.run("UPDATE studio_listings SET status = 'hidden', updated = ? WHERE id = ?", [this.now(), listingId]);
      }
      return { reported: true };
    }
    if (!gameCode) throw new StudioError('Report what?', 400);
    await this.db.run('INSERT INTO studio_reports (game_code, reporter_id, reason, at) VALUES (?, ?, ?, ?)', [String(gameCode).slice(0, 20), account.id, why, this.now()]);
    return { reported: true };
  }

  /** The admin's moderation queue. */
  async queue() {
    return {
      listings: (await this.db.many("SELECT * FROM studio_listings WHERE status IN ('pending', 'hidden') ORDER BY updated ASC LIMIT 200")).map((r) => this._listing(r, { admin: true })),
      reports: await this.db.many("SELECT r.id, r.listing_id, r.game_code, r.reason, r.at, l.title FROM studio_reports r LEFT JOIN studio_listings l ON l.id = r.listing_id WHERE r.status = 'open' ORDER BY r.at ASC LIMIT 200"),
      publicGames: await this.db.many("SELECT g.code, g.title, g.updated, a.name AS owner FROM studio_games g JOIN accounts a ON a.id = g.owner_id WHERE g.visibility = 'public' AND g.public_status = 'pending' ORDER BY g.updated ASC LIMIT 200")
    };
  }

  async moderateListing(id, status) {
    if (!['listed', 'hidden', 'rejected'].includes(status)) throw new StudioError('Status is listed, hidden or rejected', 400);
    const r = await this.db.run('UPDATE studio_listings SET status = ?, updated = ? WHERE id = ?', [status, this.now(), id]);
    if (!r.rowCount) throw new StudioError('No such listing', 404);
    if (status !== 'hidden') await this.db.run("UPDATE studio_reports SET status = 'closed' WHERE listing_id = ?", [id]);
    if (status === 'listed') await this.db.run('UPDATE studio_listings SET reports = 0 WHERE id = ?', [id]);
    return this.listing(id, { admin: true });
  }

  async closeReport(id) {
    await this.db.run("UPDATE studio_reports SET status = 'closed' WHERE id = ?", [id]);
  }

  /* ------------------------------------------------------------ plans */

  /** A plan change through the payments provider (TEST MODE); the guardian check came first. */
  async changePlan(account, planId, { key = null } = {}) {
    const plan = PLANS[planId];
    if (!plan) throw new StudioError('No such plan', 400);
    if (plan.id === account.plan) return { plan: plan.id, changed: false };
    let payment = null;
    if (plan.price.krw > 0) {
      if (!this.payments) throw new StudioError('Payments are off on this server', 503);
      payment = await this.payments.subscribe({ accountId: account.id, plan: plan.id, price: plan.price, key: key ?? `plan:${account.id}:${plan.id}:${dayKey(this.now())}` });
      if (payment.status !== 'succeeded') throw new StudioError('The (test) payment did not go through', 402);
    }
    await this.db.tx(async () => {
      if (payment) await this.db.run('INSERT INTO studio_payments (id, account_id, kind, amount, currency, provider, test, status, ref, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING', [payment.id, account.id, 'subscription', plan.price.krw, 'KRW', payment.provider, payment.test !== false, payment.status, plan.id, this.now()]);
      await this.db.run('UPDATE accounts SET plan = ? WHERE id = ?', [plan.id, account.id]);
    });
    return { plan: plan.id, changed: true, test: payment ? payment.test !== false : null };
  }

  /* ---------------------------------------------------------- classes */

  async createClass(account, { name, approval = 'teacher' }) {
    const title = String(name ?? '').replace(/[<>]/g, '').trim().slice(0, 60);
    if (title.length < 2) throw new StudioError('Give the class a name', 400);
    if (!['open', 'teacher'].includes(approval)) throw new StudioError('Approval is open or teacher', 400);
    const limit = planById(account.plan).studio.classes;
    const n = Number((await this.db.one("SELECT COUNT(*) AS n FROM studio_classes WHERE owner_id = ? AND status = 'active'", [account.id]))?.n ?? 0);
    if (!withinLimit(limit, n)) throw new StudioError(`${limit} classes at once on the ${planById(account.plan).name} plan — end one first`, 403, { upgrade: true });
    const id = newId('cls');
    const now = this.now();
    for (let i = 0; i < 5; i++) {
      try {
        await this.db.run('INSERT INTO studio_classes (id, owner_id, name, join_code, code_expires, approval, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, account.id, title, newJoinCode(), now + JOIN_CODE_DAYS * DAY, approval, now, now]);
        return this.classForTeacher(account, id);
      } catch (error) {
        if (!/unique|duplicate/i.test(String(error.message))) throw error;
      }
    }
    throw new StudioError('Could not make a join code — try again', 500);
  }

  async _ownClass(account, id) {
    const c = await this.db.one('SELECT * FROM studio_classes WHERE id = ?', [id]);
    if (!c || Number(c.owner_id) !== Number(account.id)) throw new StudioError('No such class of yours', 404);
    return c;
  }

  /** A new join code (the old one stops working at once). */
  async rotateCode(account, id) {
    const c = await this._ownClass(account, id);
    if (c.status !== 'active') throw new StudioError('That class has ended', 409);
    const now = this.now();
    for (let i = 0; i < 5; i++) {
      try {
        await this.db.run('UPDATE studio_classes SET join_code = ?, code_expires = ?, updated = ? WHERE id = ?', [newJoinCode(), now + JOIN_CODE_DAYS * DAY, now, id]);
        return this.classForTeacher(account, id);
      } catch (error) {
        if (!/unique|duplicate/i.test(String(error.message))) throw error;
      }
    }
    throw new StudioError('Could not make a join code — try again', 500);
  }

  /** The teacher's view: members (names only), games, recent plays. */
  async classForTeacher(account, id) {
    const c = await this._ownClass(account, id);
    const members = await this.db.many('SELECT m.account_id AS id, a.name, m.status, m.joined FROM studio_class_members m JOIN accounts a ON a.id = m.account_id WHERE m.class_id = ? ORDER BY a.name', [id]);
    const games = await this.db.many('SELECT cg.code, g.title, cg.pin, cg.allow_draft, cg.added FROM studio_class_games cg JOIN studio_games g ON g.code = cg.code WHERE cg.class_id = ? ORDER BY cg.added', [id]);
    const plays = await this.db.many('SELECT a.name, p.code, COUNT(*) AS plays, MAX(p.at) AS last FROM studio_class_plays p JOIN accounts a ON a.id = p.account_id WHERE p.class_id = ? GROUP BY a.name, p.code ORDER BY last DESC LIMIT 300', [id]);
    const expired = c.code_expires < this.now();
    return {
      id: c.id, name: c.name, status: c.status, approval: c.approval, teacher: true,
      joinCode: c.status === 'active' && !expired ? c.join_code : null, codeExpires: c.code_expires, codeExpired: expired,
      members, games: games.map((g) => ({ code: g.code, title: g.title, pin: g.pin, allowDraft: g.allow_draft, added: g.added })),
      plays: plays.map((p) => ({ name: p.name, code: p.code, plays: Number(p.plays), last: Number(p.last) }))
    };
  }

  /** A student's view: the class, its teacher's name and its games — never the other students. */
  async classForStudent(account, id) {
    const row = await this.db.one('SELECT c.id, c.name, c.status, a.name AS teacher, m.status AS membership FROM studio_class_members m JOIN studio_classes c ON c.id = m.class_id JOIN accounts a ON a.id = c.owner_id WHERE m.class_id = ? AND m.account_id = ?', [id, account.id]);
    if (!row) throw new StudioError('No such class', 404);
    const games = row.membership === 'active' && row.status === 'active' ? await this.db.many("SELECT cg.code, g.title FROM studio_class_games cg JOIN studio_games g ON g.code = cg.code WHERE cg.class_id = ? AND g.visibility != 'private' ORDER BY cg.added", [id]) : [];
    return { id: row.id, name: row.name, teacher: row.teacher, status: row.status, membership: row.membership, games };
  }

  async classesOf(account) {
    const teaching = await this.db.many('SELECT c.id, c.name, c.status, (SELECT COUNT(*) FROM studio_class_members m WHERE m.class_id = c.id AND m.status = \'active\') AS members, (SELECT COUNT(*) FROM studio_class_members m WHERE m.class_id = c.id AND m.status != \'active\') AS waiting FROM studio_classes c WHERE c.owner_id = ? ORDER BY c.updated DESC', [account.id]);
    const joined = await this.db.many('SELECT c.id, c.name, c.status, a.name AS teacher, m.status AS membership FROM studio_class_members m JOIN studio_classes c ON c.id = m.class_id JOIN accounts a ON a.id = c.owner_id WHERE m.account_id = ? ORDER BY m.joined DESC', [account.id]);
    return { teaching: teaching.map((t) => ({ ...t, members: Number(t.members), waiting: Number(t.waiting) })), joined };
  }

  /**
   * Join with a code. Family rules first: an account with a parent PIN (AI Arcademia's family
   * controls) joins as 'pending-parent' unless a parent typed the PIN just now (`guardianOk`);
   * then the class's own rule: 'teacher' approval waits for the teacher.
   */
  async join(account, code, { guardianOk = false, hasPin = false } = {}) {
    const norm = normalizeJoinCode(code);
    if (!norm || !JOIN_CODE_RE.test(norm)) throw new StudioError('That code does not look right (10 letters and digits)', 400);
    const c = await this.db.one('SELECT * FROM studio_classes WHERE join_code = ?', [norm]);
    if (!c || c.status !== 'active' || c.code_expires < this.now()) throw new StudioError('No class with that code (it may have run out — ask for a new one)', 404, { badCode: true });
    if (Number(c.owner_id) === Number(account.id)) throw new StudioError('This is your own class', 409);
    const existing = await this.db.one('SELECT status FROM studio_class_members WHERE class_id = ? AND account_id = ?', [c.id, account.id]);
    if (existing) return { id: c.id, name: c.name, membership: existing.status };
    const teacher = await this.db.one('SELECT plan FROM accounts WHERE id = ?', [c.owner_id]);
    const cap = planById(teacher?.plan).studio.classMembers;
    const n = Number((await this.db.one('SELECT COUNT(*) AS n FROM studio_class_members WHERE class_id = ?', [c.id]))?.n ?? 0);
    if (!withinLimit(cap, n)) throw new StudioError('This class is full', 409);
    const status = hasPin && !guardianOk ? 'pending-parent' : c.approval === 'teacher' ? 'pending-teacher' : 'active';
    await this.db.run('INSERT INTO studio_class_members (class_id, account_id, status, joined) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING', [c.id, account.id, status, this.now()]);
    return { id: c.id, name: c.name, membership: status };
  }

  /** A parent (who typed the PIN) lets their child into a class they asked to join. */
  async parentApprove(account, classId) {
    const c = await this.db.one('SELECT approval FROM studio_classes WHERE id = ?', [classId]);
    if (!c) throw new StudioError('No such class', 404);
    const r = await this.db.run("UPDATE studio_class_members SET status = ? WHERE class_id = ? AND account_id = ? AND status = 'pending-parent'", [c.approval === 'teacher' ? 'pending-teacher' : 'active', classId, account.id]);
    if (!r.rowCount) throw new StudioError('Nothing waiting for a parent here', 404);
    return this.classForStudent(account, classId);
  }

  async member(account, classId, memberId, action) {
    await this._ownClass(account, classId);
    if (action === 'approve') {
      const r = await this.db.run("UPDATE studio_class_members SET status = 'active' WHERE class_id = ? AND account_id = ? AND status = 'pending-teacher'", [classId, memberId]);
      if (!r.rowCount) throw new StudioError('Nobody waiting with that id (a parent may still need to agree)', 404);
    } else if (action === 'remove') {
      await this.db.run('DELETE FROM studio_class_members WHERE class_id = ? AND account_id = ?', [classId, memberId]);
    } else throw new StudioError('approve or remove', 400);
    return this.classForTeacher(account, classId);
  }

  async leave(account, classId) {
    await this.db.run('DELETE FROM studio_class_members WHERE class_id = ? AND account_id = ?', [classId, account.id]);
  }

  async endClass(account, classId) {
    await this._ownClass(account, classId);
    await this.db.run("UPDATE studio_classes SET status = 'ended', join_code = NULL, updated = ? WHERE id = ?", [this.now(), classId]);
    return this.classForTeacher(account, classId);
  }

  /**
   * Share one of the teacher's games with the class, pinned to a version (`pin`, a commit the
   * caller checked) or following the draft (`allowDraft`). A private game becomes 'shared'.
   */
  async assign(account, classId, code, { pin = null, allowDraft = false } = {}) {
    const c = await this._ownClass(account, classId);
    if (c.status !== 'active') throw new StudioError('That class has ended', 409);
    const g = await this.owned(account, code);
    await this.db.run('INSERT INTO studio_class_games (class_id, code, pin, allow_draft, added) VALUES (?, ?, ?, ?, ?) ON CONFLICT (class_id, code) DO UPDATE SET pin = excluded.pin, allow_draft = excluded.allow_draft', [classId, code, pin, Boolean(allowDraft), this.now()]);
    if (g.visibility === 'private') await this.db.run("UPDATE studio_games SET visibility = 'shared', updated = ? WHERE code = ?", [this.now(), code]);
    return this.classForTeacher(account, classId);
  }

  async unassign(account, classId, code) {
    await this._ownClass(account, classId);
    await this.db.run('DELETE FROM studio_class_games WHERE class_id = ? AND code = ?', [classId, code]);
    return this.classForTeacher(account, classId);
  }

  /**
   * May this account play this game, and which version? The owner: the draft. A student: only
   * an active member of an active class the game is assigned to, while the game is not private —
   * the pinned version, or the draft when the teacher allows it. Else 404.
   * Returns { ref: commit|null (null = draft), owner, classId }.
   */
  async playAccess(account, code, classId = null) {
    const g = await this.game(code);
    if (!g) throw new StudioError('No such game', 404);
    if (account && Number(g.owner_id) === Number(account.id)) return { ref: null, owner: true, classId: null, title: g.title };
    if (!account || !classId || g.visibility === 'private') throw new StudioError('No such game', 404);
    const row = await this.db.one("SELECT cg.pin, cg.allow_draft FROM studio_class_games cg JOIN studio_classes c ON c.id = cg.class_id JOIN studio_class_members m ON m.class_id = c.id WHERE cg.class_id = ? AND cg.code = ? AND c.status = 'active' AND m.account_id = ? AND m.status = 'active'", [classId, code, account.id]);
    if (!row) throw new StudioError('No such game', 404);
    if (!row.pin && !row.allow_draft) throw new StudioError('Your teacher has not shared a version of this game yet', 409);
    return { ref: row.allow_draft ? null : row.pin, owner: false, classId, title: g.title };
  }

  async recordPlay(account, code, classId) {
    await this.playAccess(account, code, classId);
    const recent = await this.db.one('SELECT at FROM studio_class_plays WHERE class_id = ? AND code = ? AND account_id = ? ORDER BY at DESC LIMIT 1', [classId, code, account.id]);
    if (recent && this.now() - Number(recent.at) < 60000) return;
    await this.db.run('INSERT INTO studio_class_plays (class_id, code, account_id, at) VALUES (?, ?, ?, ?)', [classId, code, account.id, this.now()]);
  }

  /* ------------------------------------------------------------- jobs */

  /**
   * Queue a heavy generation job for the generation server (never run on this web server).
   * Counts against the plan's generations this month.
   */
  async queueJob(account, { kind, prompt }) {
    if (!['picture-to-3d', 'voice', 'music'].includes(kind)) throw new StudioError('Jobs are picture-to-3d, voice or music', 400);
    const text = String(prompt ?? '').replace(/\s+/g, ' ').trim().slice(0, 400);
    if (!text) throw new StudioError('Describe what to make', 400);
    const limit = planById(account.plan).studio.generationsPerMonth;
    await this.spend(account, 'gen', limit, monthKey(this.now()), `That's all ${limit} generations this month on the ${planById(account.plan).name} plan.`);
    const id = newId('job');
    const now = this.now();
    await this.db.run('INSERT INTO studio_jobs (id, account_id, kind, prompt, created, updated) VALUES (?, ?, ?, ?, ?, ?)', [id, account.id, kind, text, now, now]);
    return { id, kind, prompt: text, status: 'queued' };
  }

  async jobs(accountId) {
    return this.db.many('SELECT id, kind, prompt, status, result, created, updated FROM studio_jobs WHERE account_id = ? ORDER BY created DESC LIMIT 50', [accountId]);
  }

  /** The generation server takes the oldest queued job of the kinds it can make. */
  async claimJob(kinds) {
    const list = (Array.isArray(kinds) ? kinds : []).filter((k) => ['picture-to-3d', 'voice', 'music'].includes(k));
    if (!list.length) return null;
    return this.db.one(`UPDATE studio_jobs SET status = 'running', updated = ? WHERE id = (SELECT id FROM studio_jobs WHERE status = 'queued' AND kind IN (${list.map(() => '?').join(', ')}) ORDER BY created LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING id, kind, prompt`, [this.now(), ...list]);
  }

  async finishJob(id, { ok, result = null }) {
    const json = result == null ? null : JSON.parse(JSON.stringify(result));
    if (json && JSON.stringify(json).length > 8000) throw new StudioError('Result too large', 413);
    const r = await this.db.run("UPDATE studio_jobs SET status = ?, result = ?, updated = ? WHERE id = ? AND status = 'running'", [ok ? 'done' : 'failed', json, this.now(), id]);
    if (!r.rowCount) throw new StudioError('No such running job', 404);
  }
}
