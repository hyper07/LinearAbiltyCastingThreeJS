/**
 * The Game Studio's records (server/studio/store.js) on a real PostgreSQL (PGlite in memory):
 * the plans table and its limits, visibility, the store with test-mode payments, classes with
 * join codes and the family rules, who may play what, and the generation queue.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLANS, PLAN_IDS, PLAN_ORDER, studioLimits, withinLimit } from '../../src/platform/plans.js';
import { StudioError, StudioStore, JOIN_CODE_RE, newJoinCode, normalizeJoinCode, priceFor, sellerShare } from '../../server/studio/store.js';
import { createPayments, displayPrice, fakeProvider } from '../../server/studio/payments.js';
import { testDatabase } from './db.mjs';

async function setup({ fail = false } = {}) {
  const db = await testDatabase();
  const clock = { t: Date.UTC(2026, 10, 27, 9) };
  const store = new StudioStore(db, { now: () => clock.t, payments: fakeProvider({ fail }) });
  const make = async (name, plan = 'free') => {
    const row = await db.one('INSERT INTO accounts (name, name_key, pass_hash, created, plan) VALUES (?, ?, ?, ?, ?) RETURNING id', [name, name.toLowerCase(), 'x', clock.t, plan]);
    return { id: row.id, name, plan };
  };
  return { db, store, clock, make };
}

const CHAR = { name: 'Puff', role: 'npc', base: 'plush', body: 'bunny', colors: { main: '#ffccdd', second: '#ffffff', accent: '#ff7aa8' }, accessories: ['scarf'] };

/* --------------------------------------------------------------- plans */

test('the plans table: Free, Plus, Creator — private games unlimited on every plan; public, chat, generations, selling by plan', () => {
  assert.deepEqual(PLAN_IDS, ['free', 'plus', 'creator']);
  assert.deepEqual(PLAN_ORDER, ['free', 'plus', 'creator']);
  for (const id of PLAN_IDS) {
    const s = studioLimits(id);
    assert.equal(s.privateGames, null, `${id}: private and class games are unlimited (educators)`);
    for (const k of ['publicGames', 'chatEditsPerDay', 'generationsPerMonth', 'assetDiscount', 'revenueShare', 'storageMB', 'classes', 'classMembers']) assert.ok(k in s, `${id}.${k}`);
    // The AI bridge still reads every plan's model fields.
    assert.ok(PLANS[id].maxTokens && PLANS[id].features && PLANS[id].buildsPerDay > 0);
  }
  assert.equal(studioLimits('free').publicGames, 1);
  assert.equal(studioLimits('plus').publicGames, 5);
  assert.equal(studioLimits('creator').publicGames, null);
  assert.equal(studioLimits('free').sell, false);
  assert.equal(studioLimits('plus').sell, false);
  assert.equal(studioLimits('creator').sell, true);
  assert.ok(studioLimits('creator').revenueShare > 0 && studioLimits('creator').revenueShare < 100);
  assert.ok(studioLimits('free').chatEditsPerDay < studioLimits('plus').chatEditsPerDay);
  assert.ok(studioLimits('plus').assetDiscount < studioLimits('creator').assetDiscount);
  assert.equal(studioLimits('nonsense').publicGames, 1, 'unknown plans are Free');
  assert.equal(withinLimit(null, 1e9), true);
  assert.equal(withinLimit(1, 1), false);
  assert.equal(withinLimit(5, 4), true);
});

test('the accounts table accepts the creator plan (migration 012)', async () => {
  const { db, make } = await setup();
  try {
    const c = await make('Maker', 'creator');
    assert.equal((await db.one('SELECT plan FROM accounts WHERE id = ?', [c.id])).plan, 'creator');
    await assert.rejects(() => db.run("UPDATE accounts SET plan = 'gold' WHERE id = ?", [c.id]));
  } finally {
    await db.close();
  }
});

test('chat changes stop at the daily limit (and start again the next day)', async () => {
  const { db, store, clock, make } = await setup();
  try {
    const kid = await make('Kid');
    const limit = studioLimits('free').chatEditsPerDay;
    for (let i = 0; i < limit; i++) await store.spendChat(kid);
    await assert.rejects(() => store.spendChat(kid), (e) => e instanceof StudioError && e.status === 429 && e.upgrade === true);
    clock.t += 86400000;
    await store.spendChat(kid);
  } finally {
    await db.close();
  }
});

test('plan changes go through the (test) payments provider; a failed payment changes nothing', async () => {
  const ok = await setup();
  try {
    const kid = await ok.make('Kid');
    const out = await ok.store.changePlan(kid, 'plus');
    assert.equal(out.test, true);
    assert.equal((await ok.db.one('SELECT plan FROM accounts WHERE id = ?', [kid.id])).plan, 'plus');
    assert.equal((await ok.db.one("SELECT COUNT(*) AS n FROM studio_payments WHERE account_id = ? AND kind = 'subscription' AND test = TRUE", [kid.id])).n, 1);
  } finally {
    await ok.db.close();
  }
  const bad = await setup({ fail: true });
  try {
    const kid = await bad.make('Kid');
    await assert.rejects(() => bad.store.changePlan(kid, 'creator'), /did not go through/);
    assert.equal((await bad.db.one('SELECT plan FROM accounts WHERE id = ?', [kid.id])).plan, 'free');
  } finally {
    await bad.db.close();
  }
});

test('only the test-mode provider exists: anything else refuses to start', () => {
  assert.equal(createPayments({}).mode, 'test');
  assert.throws(() => createPayments({ PAYMENTS_PROVIDER: 'stripe' }), /not implemented/);
  assert.deepEqual(displayPrice(120), { credits: 120, krw: 12000, usd: 9.6 });
});

/* ----------------------------------------------------------- visibility */

test('unlimited private games; public games count against the plan; class-only assets keep a game off the home page', async () => {
  const { db, store, make } = await setup();
  try {
    const kid = await make('Kid');
    for (let i = 0; i < 12; i++) await store.registerGame(kid, `g_aaaaaaaa${'abcdefghijkl'[i]}${'a'}`.slice(0, 12), `Game ${i}`);
    const games = await store.gamesOf(kid.id);
    assert.equal(games.length, 12, 'twelve private games on Free');
    const [a, b] = games;
    const first = await store.setVisibility(kid, a.code, 'public');
    assert.equal(first.visibility, 'public');
    assert.equal(first.public_status, 'pending', 'public waits for review');
    await assert.rejects(() => store.setVisibility(kid, b.code, 'public'), (e) => e.status === 403 && e.upgrade);
    await assert.rejects(() => store.setVisibility(kid, b.code, 'shared', {}).then(() => store.setVisibility({ ...kid, plan: 'plus' }, b.code, 'public', { assets: [{ id: 'mkt:mkt_abcdefg', name: 'Bought Bot', terms: 'class-only' }] })), (e) => e.status === 409);
    // Someone else's game is "not found", never "forbidden".
    const other = await make('Other');
    await assert.rejects(() => store.setVisibility(other, a.code, 'private'), (e) => e.status === 404);
    // The admin's answer.
    const rejected = await store.reviewPublic(a.code, false, 'Please add credits');
    assert.equal(rejected.visibility, 'private');
    assert.equal(rejected.public_status, 'rejected');
  } finally {
    await db.close();
  }
});

/* ---------------------------------------------------------------- store */

test('sharing for free is open to all; selling is Creator-only; everything waits for review', async () => {
  const { db, store, make } = await setup();
  try {
    const kid = await make('Kid');
    const free = await store.publish(kid, { character: CHAR, title: 'Puff', price: 0 });
    assert.equal(free.status, 'pending');
    assert.equal(free.terms, 'free-credit');
    await assert.rejects(() => store.publish(kid, { character: CHAR, title: 'Puff', price: 50 }), (e) => e.status === 403 && e.upgrade);
    const pro = await make('Pro', 'creator');
    const paid = await store.publish(pro, { character: CHAR, title: 'Puff Deluxe', price: 100, terms: 'standard' });
    assert.equal(paid.price, 100);
    assert.equal((await store.browse()).length, 0, 'nothing listed before the admin approves');
    await store.moderateListing(paid.id, 'listed');
    assert.equal((await store.browse()).length, 1);
    await assert.rejects(() => store.publish(pro, { character: { ...CHAR, body: 'dragon-king' }, price: 0 }), (e) => e.status === 422);
  } finally {
    await db.close();
  }
});

test('buying: the plan discount, one test payment, the seller\'s share, and never twice', async () => {
  const { db, store, make } = await setup();
  try {
    const pro = await make('Pro', 'creator');
    const listing = await store.publish(pro, { character: CHAR, title: 'Puff Deluxe', price: 100, terms: 'standard' });
    await store.moderateListing(listing.id, 'listed');
    const buyer = await make('Buyer', 'plus');
    const out = await store.buy(buyer, listing.id);
    assert.deepEqual({ price: out.purchase.price, paid: out.purchase.paid, discount: out.purchase.discount, test: out.purchase.test }, { price: 100, paid: 90, discount: 10, test: true });
    assert.equal(await store.owns(buyer.id, listing.id), true);
    await assert.rejects(() => store.buy(buyer, listing.id), (e) => e.status === 409);
    await assert.rejects(() => store.buy(pro, listing.id), (e) => e.status === 409, 'not your own');
    const sales = await store.sales(pro.id);
    assert.equal(sales.earned, sellerShare(90, 'creator'));
    assert.equal(sales.earned, 63);
    assert.equal(sales.listings[0].sales, 1);
    const mine = await store.purchases(buyer.id);
    assert.equal(mine[0].title, 'Puff Deluxe');
    // Free plan pays full price; rounding never makes a paid item free.
    assert.deepEqual(priceFor(100, 'free'), { price: 100, paid: 100, discount: 0 });
    assert.equal(priceFor(1, 'creator').paid, 1);
    assert.equal(priceFor(0, 'creator').paid, 0);
  } finally {
    await db.close();
  }
});

test('a failed (test) payment records no purchase', async () => {
  const { db, store, make } = await setup({ fail: true });
  try {
    const pro = await make('Pro', 'creator');
    const listing = await store.publish(pro, { character: CHAR, title: 'Puff', price: 10 });
    await store.moderateListing(listing.id, 'listed');
    const buyer = await make('Buyer');
    await assert.rejects(() => store.buy(buyer, listing.id), (e) => e.status === 402);
    assert.equal(await store.owns(buyer.id, listing.id), false);
  } finally {
    await db.close();
  }
});

test('three reports hide an item until the admin looks; one report per person', async () => {
  const { db, store, make } = await setup();
  try {
    const kid = await make('Kid');
    const l = await store.publish(kid, { character: CHAR, title: 'Puff' });
    await store.moderateListing(l.id, 'listed');
    const a = await make('A');
    await store.report(a, { listingId: l.id, reason: 'mean' });
    await store.report(a, { listingId: l.id, reason: 'mean again' });
    assert.equal((await store.listing(l.id, { admin: true })).reports, 1, 'one per person');
    await store.report(await make('B'), { listingId: l.id, reason: 'x' });
    await store.report(await make('C'), { listingId: l.id, reason: 'x' });
    assert.equal((await store.listing(l.id)).status, 'hidden');
    const q = await store.queue();
    assert.ok(q.listings.some((x) => x.id === l.id));
    assert.equal(q.reports.length, 3);
  } finally {
    await db.close();
  }
});

/* -------------------------------------------------------------- classes */

test('join codes are long, readable, and normalised', () => {
  for (let i = 0; i < 50; i++) assert.match(newJoinCode(), JOIN_CODE_RE);
  assert.equal(normalizeJoinCode('abcde fghjk'), 'ABCDE-FGHJK');
  assert.equal(normalizeJoinCode('short'), null);
});

test('a class: join by code, the teacher lets students in, students never see each other', async () => {
  const { db, store, make } = await setup();
  try {
    const teacher = await make('Ms Park');
    const c = await store.createClass(teacher, { name: '4B Science', approval: 'teacher' });
    assert.match(c.joinCode, JOIN_CODE_RE);
    const ana = await make('Ana');
    const ben = await make('Ben');
    const joined = await store.join(ana, c.joinCode.toLowerCase().replace('-', ''));
    assert.equal(joined.membership, 'pending-teacher');
    await store.join(ben, c.joinCode);
    await store.member(teacher, c.id, ana.id, 'approve');
    await store.member(teacher, c.id, ben.id, 'approve');
    const view = await store.classForStudent(ana, c.id);
    assert.equal(view.teacher, 'Ms Park');
    assert.equal(view.members, undefined, 'no list of other students');
    assert.equal(JSON.stringify(view).includes('Ben'), false);
    const teacherView = await store.classForTeacher(teacher, c.id);
    assert.deepEqual(teacherView.members.map((m) => m.name).sort(), ['Ana', 'Ben']);
    await assert.rejects(() => store.classForTeacher(ana, c.id), (e) => e.status === 404, 'students cannot open the teacher view');
    await assert.rejects(async () => store.join(await make('Cy'), 'ZZZZZ-ZZZZZ'), (e) => e.badCode === true);
    // A new code: the old one stops working.
    const rotated = await store.rotateCode(teacher, c.id);
    assert.notEqual(rotated.joinCode, c.joinCode);
    await assert.rejects(async () => store.join(await make('Dee'), c.joinCode), (e) => e.status === 404);
  } finally {
    await db.close();
  }
});

test('family rules: a child with a parent PIN waits for a parent, unless a parent typed it just now', async () => {
  const { db, store, make } = await setup();
  try {
    const teacher = await make('Mr Kim');
    const c = await store.createClass(teacher, { name: 'Coding Club', approval: 'open' });
    const kid = await make('Kid');
    assert.equal((await store.join(kid, c.joinCode, { hasPin: true, guardianOk: false })).membership, 'pending-parent');
    const back = await store.parentApprove(kid, c.id);
    assert.equal(back.membership, 'active', 'an open class: in once the parent agrees');
    const other = await make('Other');
    assert.equal((await store.join(other, c.joinCode, { hasPin: true, guardianOk: true })).membership, 'active');
  } finally {
    await db.close();
  }
});

test('codes run out after two weeks; ended classes take no one', async () => {
  const { db, store, clock, make } = await setup();
  try {
    const teacher = await make('T');
    const c = await store.createClass(teacher, { name: 'Art' });
    clock.t += 15 * 86400000;
    await assert.rejects(async () => store.join(await make('Late'), c.joinCode), (e) => e.status === 404);
    const d = await store.createClass(teacher, { name: 'Music' });
    await store.endClass(teacher, d.id);
    await assert.rejects(async () => store.join(await make('X'), d.joinCode ?? 'AAAAA-AAAAA'), (e) => e.status === 404);
  } finally {
    await db.close();
  }
});

test('who may play: the owner the draft; an active member the pinned version; nobody else; never a private game', async () => {
  const { db, store, make } = await setup();
  try {
    const teacher = await make('T');
    await store.registerGame(teacher, 'g_abcdefghij', 'Volcano Simulator');
    const c = await store.createClass(teacher, { name: 'Earth Science', approval: 'open' });
    const kid = await make('Kid');
    await store.join(kid, c.joinCode);
    const stranger = await make('Stranger');
    assert.deepEqual(await store.playAccess(teacher, 'g_abcdefghij'), { ref: null, owner: true, classId: null, title: 'Volcano Simulator' });
    await assert.rejects(() => store.playAccess(kid, 'g_abcdefghij', c.id), (e) => e.status === 404, 'not shared yet');
    await store.assign(teacher, c.id, 'g_abcdefghij', { pin: 'abc1234def', allowDraft: false });
    assert.equal((await store.game('g_abcdefghij')).visibility, 'shared', 'sharing with a class makes it shared');
    assert.equal((await store.playAccess(kid, 'g_abcdefghij', c.id)).ref, 'abc1234def');
    await assert.rejects(() => store.playAccess(stranger, 'g_abcdefghij', c.id), (e) => e.status === 404);
    await assert.rejects(() => store.playAccess(kid, 'g_abcdefghij'), (e) => e.status === 404, 'a class is needed');
    await store.setVisibility(teacher, 'g_abcdefghij', 'private');
    await assert.rejects(() => store.playAccess(kid, 'g_abcdefghij', c.id), (e) => e.status === 404, 'private again: nobody else');
    await store.setVisibility(teacher, 'g_abcdefghij', 'shared');
    await store.recordPlay(kid, 'g_abcdefghij', c.id);
    const view = await store.classForTeacher(teacher, c.id);
    assert.equal(view.plays[0].name, 'Kid');
    await store.member(teacher, c.id, kid.id, 'remove');
    await assert.rejects(() => store.playAccess(kid, 'g_abcdefghij', c.id), (e) => e.status === 404, 'removed: no more');
  } finally {
    await db.close();
  }
});

test('class limits come from the plan', async () => {
  const { db, store, make } = await setup();
  try {
    const t = await make('T');
    for (let i = 0; i < studioLimits('free').classes; i++) await store.createClass(t, { name: `Class ${i}` });
    await assert.rejects(() => store.createClass(t, { name: 'One more' }), (e) => e.status === 403 && e.upgrade);
  } finally {
    await db.close();
  }
});

/* ----------------------------------------------------------------- jobs */

test('generation jobs: plan-limited per month, claimed by the generation server, finished once', async () => {
  const { db, store, make } = await setup();
  try {
    const kid = await make('Kid');
    const limit = studioLimits('free').generationsPerMonth;
    for (let i = 0; i < limit; i++) await store.queueJob(kid, { kind: 'voice', prompt: `a friendly owl ${i}` });
    await assert.rejects(() => store.queueJob(kid, { kind: 'voice', prompt: 'one more' }), (e) => e.status === 429);
    await assert.rejects(() => store.queueJob(kid, { kind: 'hack', prompt: 'x' }), (e) => e.status === 400);
    const job = await store.claimJob(['voice']);
    assert.equal(job.kind, 'voice');
    assert.equal(await store.claimJob(['music']), null);
    await store.finishJob(job.id, { ok: true, result: { url: 'https://gen.example/owl.ogg' } });
    await assert.rejects(() => store.finishJob(job.id, { ok: true }), (e) => e.status === 404, 'only once');
  } finally {
    await db.close();
  }
});
