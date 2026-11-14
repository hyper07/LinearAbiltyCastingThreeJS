import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import http from 'node:http';
import { History } from '../../server/game/db.js';
import { testDatabase } from './db.mjs';
import { Keys, hashPassword, verifyPassword } from '../../server/game/keys.js';
import { GameAuthority } from '../../server/game/authority.js';
import { Accounts } from '../../server/game/accounts.js';
import { Refusal, Violation } from '../../server/game/rules.js';
import { createGameServices } from '../../server/game/index.js';
import { normalizeLevel } from '../../src/levels/Level.js';
import { buyPrice, itemSize, itemValue } from '../../src/items/Items.js';
import { BAG_COLS } from '../../src/items/Profile.js';
import { treeFor } from '../../src/platform/skill/tree.js';

const ROOT = new URL('../../', import.meta.url).pathname;

/** A fresh game in a temp folder with a clock the test moves by hand. */
async function world({ party = () => true } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'gamory-game-'));
  const keys = new Keys(randomBytes(48));
  const db = await testDatabase();
  const history = new History(db, keys);
  const clock = { t: Date.UTC(2026, 10, 7, 12) };
  const authority = new GameAuthority({
    db,
    keys,
    history,
    now: () => clock.t,
    sameParty: party,
    loadLevel: async (id) => normalizeLevel(JSON.parse(await readFile(join(ROOT, 'public/levels', `${id}.json`), 'utf8')))
  });
  const accounts = new Accounts({ db, keys, history, authority, now: () => clock.t });
  return {
    dir, keys, db, history, authority, accounts, clock,
    later: (seconds) => (clock.t += seconds * 1000),
    close: async () => {
      await db.close();
      await rm(dir, { recursive: true, force: true });
    }
  };
}

/** Kill monsters until some loot falls; returns the drops. */
async function farm(w, accountId, runId, kind = 'grunt', { min = 1, start = 0 } = {}) {
  const drops = [];
  for (let i = start; drops.length < min && i < start + 400; i++) {
    w.later(0.5);
    drops.push(...(await w.authority.kill(accountId, { runId, monster: `m${i}`, kind, wave: 1 })).drops);
  }
  return drops;
}

const errorOf = async (fn) => {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  return null;
};

test('passwords: scrypt with a salt, checked in constant time', async () => {
  const a = await hashPassword('correct horse battery');
  const b = await hashPassword('correct horse battery');
  assert.match(a, /^scrypt\$16384\$8\$1\$/);
  assert.notEqual(a, b, 'a new salt every time');
  assert.equal(await verifyPassword('correct horse battery', a), true);
  assert.equal(await verifyPassword('correct horse batterY', a), false);
});

test('accounts: names, password rules, lockout, sessions stored only as hashes', async () => {
  const w = await world();
  try {
    const { token, account } = await w.accounts.register({ name: 'Ada', password: 'lovelace-1815', ip: '10.0.0.1' });
    assert.equal(account.name, 'Ada');
    await assert.rejects(w.accounts.register({ name: 'ada', password: 'whatever-123', ip: '10.0.0.2' }), /taken/);
    await assert.rejects(w.accounts.register({ name: 'x', password: 'whatever-123' }), /Names are/);
    await assert.rejects(w.accounts.register({ name: 'Bob', password: 'short' }), /8 to 128/);
    await assert.rejects(w.accounts.register({ name: 'Carla', password: 'carla-rocks!' }), /must not contain the name/);

    // The database keeps the token's hash, never the token, and the address only sealed.
    const s = (await w.db.one('SELECT token_hash, ip_tag, ip_enc FROM sessions'));
    assert.notEqual(s.token_hash, token);
    assert.ok(!s.ip_enc.includes('10.0.0.1'));
    assert.equal(w.keys.ipOpen(s.ip_enc), '10.0.0.1');
    assert.equal((await w.accounts.fromToken(token)).name, 'Ada');
    assert.equal(await w.accounts.fromToken('forged'), null);

    // Five wrong passwords lock the account, even against the right one.
    for (let i = 0; i < 5; i++) await assert.rejects(w.accounts.login({ name: 'Ada', password: 'nope-nope-nope' }), /Wrong name or password/);
    await assert.rejects(w.accounts.login({ name: 'Ada', password: 'lovelace-1815' }), /Too many wrong passwords/);
    w.later(16 * 60);
    assert.equal((await w.accounts.login({ name: 'ADA', password: 'lovelace-1815' })).account.name, 'Ada');
    await assert.rejects(w.accounts.login({ name: 'Nobody', password: 'lovelace-1815' }), /Wrong name or password/);

    // Five new accounts a day per address.
    for (let i = 0; i < 4; i++) await w.accounts.register({ name: `Alt${i}`, password: 'password-123', ip: '10.0.0.9' });
    await w.accounts.register({ name: 'Alt9', password: 'password-123', ip: '10.0.0.9' });
    await assert.rejects(w.accounts.register({ name: 'Alt10', password: 'password-123', ip: '10.0.0.9' }), /Too many new accounts/);

    await w.accounts.logout(token);
    assert.equal(await w.accounts.fromToken(token), null);
  } finally {
    await w.close();
  }
});

test('characters are stored encrypted and sealed; an edited row locks the account', async () => {
  const w = await world();
  try {
    const { account } = await w.accounts.register({ name: 'Ada', password: 'lovelace-1815' });
    const { runId } = await w.authority.startRun(account.id, {});
    const [drop] = await farm(w, account.id, runId);
    await w.authority.take(account.id, { runId, uid: drop.uid });
    const raw = (await w.db.one('SELECT state FROM characters WHERE account_id = ?', [account.id])).state;
    assert.match(raw, /^v1\./);
    assert.ok(!raw.includes('gold') && !raw.includes(drop.uid), 'nothing readable in the database');

    // Someone edits the row directly (or copies another account's in): it no longer opens.
    const parts = raw.split('.');
    parts[3] = parts[3].slice(0, -4) + (parts[3].endsWith('AAAA') ? 'BBBB' : 'AAAA');
    await w.db.run('UPDATE characters SET state = ? WHERE account_id = ?', [parts.join('.'), account.id]);
    w.authority.characters.clear();
    const error = await errorOf(() => w.authority.character(account.id));
    assert.ok(error instanceof Refusal && error.status === 423);
    await assert.rejects(w.authority.assertActive(account.id), /blocked/);
    assert.equal((await w.history.of(account.id))[0].type, 'tampered');
  } finally {
    await w.close();
  }
});

test('loot: an item can be taken once; two players racing for it cannot both get it', async () => {
  const w = await world();
  try {
    const a = (await w.accounts.register({ name: 'Ada', password: 'lovelace-1815' })).account.id;
    const b = (await w.accounts.register({ name: 'Bob', password: 'barbarian-99' })).account.id;
    const { runId } = await w.authority.startRun(a, {});
    await w.authority.joinRun(b, { runId });
    const drops = await farm(w, a, runId, 'brute', { min: 3 });
    const item = drops.find((d) => d.type !== 'gold' && d.type !== 'potion') ?? drops[0];

    assert.equal((await w.authority.take(b, { runId, uid: item.uid })).ok, true);
    const again = await errorOf(() => w.authority.take(a, { runId, uid: item.uid }));
    assert.ok(again instanceof Refusal, 'the second player is refused');
    const twice = await errorOf(() => w.authority.take(b, { runId, uid: item.uid }));
    assert.ok(twice instanceof Refusal, 'and nobody takes it twice');
    const row = (await w.db.one('SELECT owner, state FROM items WHERE uid = ?', [item.uid]));
    if (item.type === 'gold' || item.type === 'potion') assert.equal(row.state, 'used');
    else assert.deepEqual({ ...row }, { owner: b, state: 'held' });
  } finally {
    await w.close();
  }
});

test('cheats are refused and add up to a block: foreign loot, fake waves, fake bosses, kill floods', async () => {
  const w = await world({ party: () => false });
  try {
    const a = (await w.accounts.register({ name: 'Ada', password: 'lovelace-1815' })).account.id;
    const m = (await w.accounts.register({ name: 'Mallory', password: 'trickster-666' })).account.id;
    const { runId } = await w.authority.startRun(a, {});
    const drops = await farm(w, a, runId);

    // Mallory is not in Ada's party: cannot join her game, cannot take from its floor.
    assert.ok(await errorOf(() => w.authority.joinRun(m, { runId })) instanceof Violation);
    const own = await w.authority.startRun(m, {});
    const foreign = await errorOf(() => w.authority.take(m, { runId: own.runId, uid: drops[0].uid }));
    assert.equal(foreign?.rule, 'foreign-take');
    // Nor can she act in a run that is not hers, or report kills for Ada.
    assert.ok(await errorOf(() => w.authority.kill(m, { runId, monster: 'x', kind: 'grunt', wave: 1 })) instanceof Violation);

    // A wave the clock says cannot have come yet; a dragon in free play's first wave.
    assert.equal((await errorOf(() => w.authority.kill(m, { runId: own.runId, monster: 'w', kind: 'grunt', wave: 40 })))?.rule, 'wave-too-fast');
    assert.equal((await errorOf(() => w.authority.kill(m, { runId: own.runId, monster: 'd', kind: 'dragon', wave: 1 })))?.rule, 'kind-not-in-run');
    // A kill flood: more than a minute's worth at once.
    let flood = null;
    for (let i = 0; i < 200 && !flood; i++) flood = await errorOf(() => w.authority.kill(m, { runId: own.runId, monster: `f${i}`, kind: 'grunt', wave: 1 }));
    assert.equal(flood?.rule, 'kill-rate');
    // The same monster twice is not a second kill (a retried request), and no strike.
    const first = await w.authority.kill(a, { runId, monster: 'm0', kind: 'grunt', wave: 1 });
    assert.equal(first.duplicate, true);

    // Strikes: three in a day block the account, and the history says why.
    let blocked = null;
    for (const rule of ['foreign-take', 'wave-too-fast', 'kind-not-in-run']) blocked = await w.authority.strike(m, rule, 'test');
    assert.ok(blocked && blocked.until > w.clock.t + 23 * 36e5);
    await assert.rejects(w.authority.assertActive(m), /blocked until/);
    assert.deepEqual((await w.history.of(m)).slice(0, 2).map((e) => e.type), ['blocked', 'strike']);
    // A second block lasts a week.
    w.later(25 * 3600);
    for (const rule of ['foreign-take', 'wave-too-fast', 'kind-not-in-run']) blocked = await w.authority.strike(m, rule, 'again');
    assert.ok(blocked.until - w.clock.t >= 7 * 864e5 - 1000);
    // An admin can lift it.
    await w.accounts.unblock(m, 'appeal');
    await assert.doesNotReject(w.authority.assertActive(m));
  } finally {
    await w.close();
  }
});

test('the inventory rules run on the server: moves, wearing, selling — gold only from the ledger', async () => {
  const w = await world();
  try {
    const a = (await w.accounts.register({ name: 'Ada', password: 'lovelace-1815' })).account.id;
    const { runId } = await w.authority.startRun(a, {});
    let item = null;
    for (let start = 0; !item && start < 4000; start += 400) {
      for (const d of await farm(w, a, runId, 'brute', { min: 6, start })) {
        if (d.type === 'gold' || d.type === 'potion') {
          await w.authority.take(a, { runId, uid: d.uid });
        } else if (!item && (d.type === 'weapon' || d.type === 'gear')) {
          await w.authority.take(a, { runId, uid: d.uid });
          item = d;
        }
      }
      w.later(61); // keep under the kill-rate limit
    }
    assert.ok(item, 'some gear dropped');
    const p = await w.authority.character(a);
    assert.ok(p.bag.some((it) => it.uid === item.uid));

    // A move changes nothing but places.
    const move = await w.authority.ops(a, { ops: [{ op: 'move', args: [item.uid, 'stash'] }] });
    assert.equal(move.results[0].ok, true);
    assert.ok(p.stash.some((it) => it.uid === item.uid));
    await w.authority.ops(a, { ops: [{ op: 'move', args: [item.uid, 'bag'] }, { op: 'equip', args: [item.uid] }] });
    assert.ok(p.equipped?.uid === item.uid || Object.values(p.gear).some((g) => g?.uid === item.uid));

    // Selling pays exactly the item's value, recorded in the ledger.
    const unwear = item.type === 'weapon' ? { op: 'unequip', args: [] } : { op: 'unequipGear', args: [Object.entries(p.gear).find(([, g]) => g?.uid === item.uid)[0]] };
    await w.authority.ops(a, { ops: [unwear] });
    const goldBefore = p.gold;
    await w.authority.ops(a, { ops: [{ op: 'sell', args: [item.uid] }] });
    assert.equal(p.gold, goldBefore + itemValue(item));
    assert.equal((await w.db.one('SELECT state FROM items WHERE uid = ?', [item.uid])).state, 'sold');
    const ledger = (await w.db.one('SELECT SUM(delta) AS s, MAX(id) AS last FROM ledger WHERE account_id = ?', [a]));
    assert.equal(ledger.s, p.gold, 'gold equals the sum of its ledger');

    // A sold item cannot be sold again, nor anything the account never had.
    assert.ok(await errorOf(() => w.authority.ops(a, { ops: [{ op: 'sell', args: [item.uid] }] })) instanceof Refusal);
    assert.ok(await errorOf(() => w.authority.ops(a, { ops: [{ op: 'hack', args: [] }] })) instanceof Violation);
    assert.ok(await errorOf(() => w.authority.ops(a, { ops: [{ op: 'move', args: [item.uid, 'nowhere'] }] })) instanceof Violation);
  } finally {
    await w.close();
  }
});

test('dragging runs on the server too: take off into a cell, swap, drop what you wear on the floor', async () => {
  const w = await world();
  try {
    const a = (await w.accounts.register({ name: 'Ada', password: 'lovelace-1815' })).account.id;
    const { runId } = await w.authority.startRun(a, {});
    let item = null;
    for (let start = 0; !item && start < 4000; start += 400) {
      for (const d of await farm(w, a, runId, 'brute', { min: 6, start })) {
        if (!item && d.type === 'gear') {
          await w.authority.take(a, { runId, uid: d.uid });
          item = d;
        }
      }
      w.later(61);
    }
    assert.ok(item, 'some gear dropped');
    const p = await w.authority.character(a);
    await w.authority.ops(a, { ops: [{ op: 'equip', args: [item.uid] }] });
    const slotId = Object.entries(p.gear).find(([, g]) => g?.uid === item.uid)[0];

    // Off into the bottom-right corner of the bag.
    const [iw, ih] = itemSize(item);
    const x = BAG_COLS - iw;
    const y = p.bagRowCount - ih;
    await w.authority.ops(a, { ops: [{ op: 'unequipGear', args: [slotId, x, y] }] });
    assert.deepEqual(p.bag.find((it) => it.uid === item.uid).at, [x, y]);
    assert.ok(await errorOf(() => w.authority.ops(a, { ops: [{ op: 'unequipGear', args: [slotId, -1, 'x'] }] })) instanceof Violation);
    assert.ok(await errorOf(() => w.authority.ops(a, { ops: [{ op: 'equip', args: [item.uid, 42] }] })) instanceof Violation);

    // Worn, then dropped: it leaves the character and lies on this run's floor.
    await w.authority.ops(a, { ops: [{ op: 'equip', args: [item.uid, slotId] }] });
    assert.equal(p.gear[slotId]?.uid, item.uid);
    await w.authority.drop(a, { runId, uid: item.uid });
    assert.equal(p.gear[slotId], null);
    const row = (await w.db.one('SELECT state, run FROM items WHERE uid = ?', [item.uid]));
    assert.equal(row.state, 'floor');
    assert.equal(row.run, runId);
    assert.ok(await errorOf(() => w.authority.drop(a, { runId, uid: item.uid })) instanceof Refusal, 'it cannot be dropped twice');
  } finally {
    await w.close();
  }
});

test('NPCs: gifts once, quests only when the run really killed enough, study rewards rate-limited', async () => {
  const w = await world();
  try {
    const a = (await w.accounts.register({ name: 'Ada', password: 'lovelace-1815' })).account.id;
    const { runId } = await w.authority.startRun(a, { level: 'thistledown' });
    const gift = await w.authority.npc(a, { runId, npc: 'thistle', action: 'gift' });
    assert.ok(gift.given);
    assert.equal((await w.authority.npc(a, { runId, npc: 'thistle', action: 'gift' })).given, null, 'once');

    const early = await errorOf(() => w.authority.npc(a, { runId, npc: 'pell', action: 'quest' }));
    assert.match(early?.message ?? '', /Not done yet: 0\/8/);
    for (let i = 0; i < 8; i++) {
      w.later(1);
      await w.authority.kill(a, { runId, monster: `g${i}`, kind: 'grunt', wave: 1 });
    }
    const done = await w.authority.npc(a, { runId, npc: 'pell', action: 'quest' });
    assert.ok(done.gold > 0);
    assert.ok(await errorOf(() => w.authority.npc(a, { runId, npc: 'pell', action: 'quest' })) instanceof Refusal, 'rewarded once');

    // The shop's prices are the server's; gold must cover them.
    const shop = await w.authority.shop(a, { runId, npc: 'juniper' });
    assert.ok(shop.stock.length > 1 && shop.stock.every((s) => s.uid));
    const p = await w.authority.character(a);
    const goods = shop.stock.filter((s) => s.type !== 'service' && s.type !== 'potion');
    const affordable = goods.filter((s) => buyPrice(s) <= p.gold).sort((x, y) => buyPrice(x) - buyPrice(y))[0];
    if (affordable) {
      const gold = p.gold;
      const bought = await w.authority.buy(a, { runId, npc: 'juniper', offer: affordable.uid });
      assert.equal(bought.ok, true);
      assert.equal(p.gold, gold - buyPrice(affordable), 'the server charges its own price');
      const copy = [...p.bag, ...p.stash].find((it) => it.name === affordable.name && it.uid !== affordable.uid && it.srv);
      assert.ok(copy, 'the bought copy has a new, server-made id');
      assert.equal((await w.db.one('SELECT owner, state FROM items WHERE uid = ?', [copy.uid])).state, 'held');
    }
    const pricey = goods.find((s) => buyPrice(s) > p.gold);
    if (pricey) assert.match((await errorOf(() => w.authority.buy(a, { runId, npc: 'juniper', offer: pricey.uid })))?.message ?? '', /Not enough gold/);
    assert.ok(await errorOf(() => w.authority.buy(a, { runId, npc: 'juniper', offer: 'made-up' })) instanceof Refusal);

    // A new game ends the last one: its shop and floor are closed.
    const study = await w.authority.startRun(a, { level: 'study-grove' });
    assert.equal((await errorOf(() => w.authority.shop(a, { runId, npc: 'juniper' })))?.status, 410);
    const one = await w.authority.npc(a, { runId: study.runId, npc: 'pip', action: 'study' });
    assert.equal(one.gold, 10);
    assert.equal((await errorOf(() => w.authority.npc(a, { runId: study.runId, npc: 'pip', action: 'study' })))?.rule, 'study-rate');

  } finally {
    await w.close();
  }
});

test('the history is a hash chain: editing or deleting an event breaks it', async () => {
  const w = await world();
  try {
    const a = (await w.accounts.register({ name: 'Ada', password: 'lovelace-1815' })).account.id;
    const { runId } = await w.authority.startRun(a, {});
    // Loot until a real item is taken: gold and potions write no history event,
    // and a few unlucky drops can all be those.
    let taken = 0;
    for (let start = 0; !taken && start < 4000; start += 400) {
      for (const d of await farm(w, a, runId, 'brute', { min: 4, start })) {
        try {
          await w.authority.take(a, { runId, uid: d.uid });
          if (d.type !== 'gold' && d.type !== 'potion') taken++;
        } catch {
          /* bag full */
        }
      }
      w.later(61); // keep under the kill-rate limit
    }
    assert.ok(taken, 'an item was taken');
    const ok = await w.history.verify();
    assert.equal(ok.ok, true);
    assert.ok(ok.count >= 3);
    await w.db.run(`UPDATE events SET data = '{"name":"Sword of Lies"}' WHERE id = 2`);
    assert.deepEqual(await w.history.verify(), { ok: false, count: 1, brokenAt: 2 });
  } finally {
    await w.close();
  }
});

test('HTTP: sign up, cookie flags, same-origin JSON only, a character on the server', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gamory-api-'));
  const game = await createGameServices({ dataDir: dir, db: await testDatabase(), env: { SERVER_SECRET: randomBytes(48).toString('base64') } });
  const server = http.createServer((req, res) => game.handler(req, res).then((h) => h || res.end('static')));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, headers = {}) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  try {
    const res = await post('/api/account/register', { name: 'Ada', password: 'lovelace-1815' });
    assert.equal(res.status, 200);
    const cookie = res.headers.get('set-cookie');
    assert.match(cookie, /gamory_session=[^;]+; Path=\/; HttpOnly; SameSite=Strict; Max-Age=2592000/);
    const session = cookie.split(';')[0];
    const me = await (await fetch(base + '/api/account/me', { headers: { cookie: session } })).json();
    assert.equal(me.account.name, 'Ada');
    assert.ok(me.character.digest);

    // Another site's page cannot act for the player; a form post (not JSON) neither.
    assert.equal((await post('/api/game/run/start', {}, { cookie: session, origin: 'https://evil.example' })).status, 403);
    const form = await fetch(base + '/api/game/run/start', { method: 'POST', headers: { cookie: session, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'a=1' });
    assert.equal(form.status, 415);
    assert.equal((await post('/api/game/run/start', {})).status, 401, 'no session, no game');

    const run = await (await post('/api/game/run/start', { classId: 'mage' }, { cookie: session })).json();
    assert.ok(run.runId);
    const cheat = await post('/api/game/kill', { runId: run.runId, monster: 'm1', kind: 'dragon', wave: 1, classId: 'mage' }, { cookie: session });
    assert.equal(cheat.status, 409);
    const body = await cheat.json();
    assert.equal(body.rule, 'kind-not-in-run');
    assert.equal(body.resync, true);
    const history = await (await fetch(base + '/api/account/history', { headers: { cookie: session } })).json();
    assert.deepEqual(history.events.slice(0, 1).map((e) => e.type), ['strike']);
  } finally {
    server.close();
    await game.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("a party member's claim that arrives before the host's report is held, not punished", async () => {
  const w = await world();
  try {
    const host = (await w.accounts.register({ name: 'Hostess', password: 'leading-the-way-1' })).account.id;
    const guest = (await w.accounts.register({ name: 'Visitor', password: 'just-dropping-in-1' })).account.id;
    const { runId } = await w.authority.startRun(host, {});
    await w.authority.joinRun(guest, { runId });
    w.later(2);
    // The guest heard of the kill over the party socket first.
    assert.deepEqual(await w.authority.partyKill(guest, { runId, monster: 'm1' }), { pending: true, xp: 0 });
    const before = (await w.authority.character(guest)).xp + (await w.authority.character(guest)).level * 1e6;
    await w.authority.kill(host, { runId, monster: 'm1', kind: 'brute', wave: 1 });
    const after = (await w.authority.character(guest)).xp + (await w.authority.character(guest)).level * 1e6;
    assert.ok(after > before, 'paid when the report landed');
    assert.equal((await w.db.one('SELECT COUNT(*) AS n FROM strikes WHERE account_id = ?', [guest])).n, 0, 'no strike');
    assert.equal((await w.authority.partyKill(guest, { runId, monster: 'm1' })).duplicate, true, 'and paid once');
    // A claim for a monster that never dies is just forgotten.
    await w.authority.partyKill(guest, { runId, monster: 'never' });
    w.later(120);
    assert.equal((await w.authority.character(guest)).xp + (await w.authority.character(guest)).level * 1e6, after);
  } finally {
    await w.close();
  }
});

test('the action bar runs on the server too: a potion on any key, keys swapped', async () => {
  const w = await world();
  try {
    const a = (await w.accounts.register({ name: 'Bea', password: 'potions-on-keys' })).account.id;
    const p = await w.authority.character(a);
    await w.authority.ops(a, { ops: [{ op: 'setSlot', args: [0, 'potion:health', 'mage'] }] });
    const slots = p.slotsOf('mage');
    assert.equal(slots.length, 9);
    assert.equal(slots[0], 'potion:health');
    assert.equal(slots[5], treeFor('mage').start[0], 'the skill that was on key 1 went where the potion was');
    // A potion that does not exist changes nothing.
    await w.authority.ops(a, { ops: [{ op: 'setSlot', args: [1, 'potion:gold', 'mage'] }] });
    assert.notEqual(p.slotsOf('mage')[1], 'potion:gold');
  } finally {
    await w.close();
  }
});

test('a battle royale run accepts rival kills; other levels refuse them', async () => {
  const { runRules, kindAllowed } = await import('../../server/game/rules.js');
  const royale = normalizeLevel({ name: 'Storm', rules: { goal: 'royale' } });
  assert.equal(royale.rules.royale.rivals, 7);
  assert.equal(royale.rules.kinds.rival, 0, 'even with no weight set');
  assert.equal(kindAllowed(runRules(royale), 'rival', 1), true);
  assert.equal(kindAllowed(runRules(normalizeLevel({ name: 'Waves' })), 'rival', 1), false, 'never in a normal level');
});

test('a character per game: what is earned in one game stays in it', async () => {
  const w = await world();
  try {
    const a = (await w.accounts.register({ name: 'Ada', password: 'lovelace-1815' })).account.id;
    const A = 'official:thistledown';
    const B = 'official:frost-hollow';
    // Loot in game A.
    let held = null;
    await w.authority.inGame(A, async () => {
      const { runId, game } = await w.authority.startRun(a, { level: 'thistledown' });
      assert.equal(game, A, 'the run belongs to its game');
      for (let start = 0; !held && start < 4000; start += 400) {
        for (const d of await farm(w, a, runId, 'brute', { min: 6, start })) {
          if (held || (d.type !== 'gear' && d.type !== 'weapon')) continue;
          await w.authority.take(a, { runId, uid: d.uid });
          held = d;
        }
        w.later(61);
      }
    });
    assert.ok(held, 'something to keep');
    const inA = await w.authority.inGame(A, () => w.authority.character(a));
    const inB = await w.authority.inGame(B, () => w.authority.character(a));
    const arena = await w.authority.inGame('arena', () => w.authority.character(a));
    assert.ok([...inA.bag, ...inA.stash].some((i) => i.uid === held.uid), 'game A has it');
    assert.ok(![...inB.bag, ...inB.stash].some((i) => i.uid === held.uid), 'game B does not');
    assert.ok(inA.xp + inA.level * 1e6 > inB.xp + inB.level * 1e6, 'experience stays in game A');
    assert.equal(arena.bag.length, 0, 'the arena character is untouched');
    // An item of game A cannot be sold from game B.
    const sold = await w.authority.inGame(B, () => errorOf(() => w.authority.ops(a, { ops: [{ op: 'sell', args: [held.uid] }] })));
    assert.ok(sold instanceof Refusal, 'not in your bag there');
    assert.equal((await w.db.one('SELECT game FROM items WHERE uid = ?', [held.uid])).game, A);
    // Each game's gold is its own ledger.
    const rows = await w.db.many('SELECT game, COALESCE(SUM(delta), 0) AS s FROM ledger WHERE account_id = ? GROUP BY game', [a]);
    for (const r of rows) {
      const p = await w.authority.inGame(r.game, () => w.authority.character(a));
      assert.equal(r.s, p.gold, `${r.game}: gold equals its ledger`);
    }
    // Saved, each sealed to its own game: a row copied into another game does not open.
    const rowA = await w.db.one('SELECT state FROM characters WHERE account_id = ? AND game = ?', [a, A]);
    await w.db.run('UPDATE characters SET state = ? WHERE account_id = ? AND game = ?', [rowA.state, a, B]);
    w.authority.characters.clear();
    const copied = await w.authority.inGame(B, () => errorOf(() => w.authority.character(a)));
    assert.equal(copied?.status, 423, 'a character moved between games is caught');
  } finally {
    await w.close();
  }
});

test('HTTP: a request names its game, and unknown games are refused', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gamory-api-'));
  const readLevel = async (id) => (id === 'thistledown' ? readFile(join(ROOT, 'public/levels/thistledown.json'), 'utf8') : null);
  const game = await createGameServices({ dataDir: dir, db: await testDatabase(), readLevel, env: { SERVER_SECRET: randomBytes(48).toString('base64') } });
  const server = http.createServer((req, res) => game.handler(req, res).then((h) => h || res.end('static')));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const res = await fetch(base + '/api/account/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Ada', password: 'lovelace-1815' }) });
    const cookie = res.headers.get('set-cookie').split(';')[0];
    const state = (g) => fetch(`${base}/api/game/state?game=${encodeURIComponent(g)}`, { headers: { cookie } });
    assert.equal((await state('official:thistledown')).status, 200);
    assert.equal((await state('official:nowhere')).status, 404, 'a level that does not exist');
    assert.equal((await state('g-made-up-00000000')).status, 404, 'a game nobody published');
    assert.equal((await state('../etc')).status, 404);
    const run = await (await fetch(base + '/api/game/run/start', { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ level: 'thistledown', game: 'official:thistledown' }) })).json();
    assert.equal(run.game, 'official:thistledown');
  } finally {
    server.close();
    await game.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('"My heroes": every character an account has, by game and class', async () => {
  const w = await world();
  try {
    const a = (await w.accounts.register({ name: 'Heroa', password: 'many-heroes-1' })).account.id;
    const b = (await w.accounts.register({ name: 'Other', password: 'many-heroes-2' })).account.id;
    await w.authority.inGame('arena', () => w.authority.character(a));
    await w.authority.inGame('official:thistledown#caster', () => w.authority.character(a));
    await w.authority.inGame('official:thistledown#knight', () => w.authority.character(a));
    await w.authority.inGame('official:frost-hollow#caster', () => w.authority.character(a));
    await w.authority.inGame('official:frost-hollow#caster', () => w.authority.character(b));
    const mine = await w.authority.allCharacters(a);
    assert.deepEqual(mine.map((h) => `${h.game}#${h.classId}`).sort(), ['official:frost-hollow#caster', 'official:thistledown#caster', 'official:thistledown#knight']);
    assert.ok(mine.every((h) => h.level === 1 && Array.isArray(h.worn) && typeof h.gold === 'number'), 'level, gold and what is worn');
    assert.equal((await w.authority.allCharacters(b)).length, 1, 'only your own');
  } finally {
    await w.close?.();
  }
});
