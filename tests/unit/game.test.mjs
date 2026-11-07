import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import http from 'node:http';
import { GameDB, History } from '../../server/game/db.js';
import { Keys, hashPassword, verifyPassword } from '../../server/game/keys.js';
import { GameAuthority } from '../../server/game/authority.js';
import { Accounts } from '../../server/game/accounts.js';
import { Refusal, Violation } from '../../server/game/rules.js';
import { createGameServices } from '../../server/game/index.js';
import { normalizeLevel } from '../../src/levels/Level.js';
import { buyPrice, itemValue } from '../../src/items/Items.js';

const ROOT = new URL('../../', import.meta.url).pathname;

/** A fresh game in a temp folder with a clock the test moves by hand. */
async function world({ party = () => true } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'gamory-game-'));
  const keys = new Keys(randomBytes(48));
  const db = await GameDB.open(join(dir, 'game.sqlite'));
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
      db.close();
      await rm(dir, { recursive: true, force: true });
    }
  };
}

/** Kill monsters until some loot falls; returns the drops. */
function farm(w, accountId, runId, kind = 'grunt', { min = 1, start = 0 } = {}) {
  const drops = [];
  for (let i = start; drops.length < min && i < start + 400; i++) {
    w.later(0.5);
    drops.push(...w.authority.kill(accountId, { runId, monster: `m${i}`, kind, wave: 1 }).drops);
  }
  return drops;
}

const errorOf = (fn) => {
  try {
    fn();
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
    const s = w.db.q('SELECT token_hash, ip_tag, ip_enc FROM sessions').get();
    assert.notEqual(s.token_hash, token);
    assert.ok(!s.ip_enc.includes('10.0.0.1'));
    assert.equal(w.keys.ipOpen(s.ip_enc), '10.0.0.1');
    assert.equal(w.accounts.fromToken(token).name, 'Ada');
    assert.equal(w.accounts.fromToken('forged'), null);

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

    w.accounts.logout(token);
    assert.equal(w.accounts.fromToken(token), null);
  } finally {
    await w.close();
  }
});

test('characters are stored encrypted and sealed; an edited row locks the account', async () => {
  const w = await world();
  try {
    const { account } = await w.accounts.register({ name: 'Ada', password: 'lovelace-1815' });
    const { runId } = await w.authority.startRun(account.id, {});
    const [drop] = farm(w, account.id, runId);
    w.authority.take(account.id, { runId, uid: drop.uid });
    const raw = w.db.q('SELECT state FROM characters WHERE account_id = ?').get(account.id).state;
    assert.match(raw, /^v1\./);
    assert.ok(!raw.includes('gold') && !raw.includes(drop.uid), 'nothing readable in the database');

    // Someone edits the row directly (or copies another account's in): it no longer opens.
    const parts = raw.split('.');
    parts[3] = parts[3].slice(0, -4) + (parts[3].endsWith('AAAA') ? 'BBBB' : 'AAAA');
    w.db.q('UPDATE characters SET state = ? WHERE account_id = ?').run(parts.join('.'), account.id);
    w.authority.characters.clear();
    const error = errorOf(() => w.authority.character(account.id));
    assert.ok(error instanceof Refusal && error.status === 423);
    assert.throws(() => w.authority.assertActive(account.id), /blocked/);
    assert.equal(w.history.of(account.id)[0].type, 'tampered');
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
    w.authority.joinRun(b, { runId });
    const drops = farm(w, a, runId, 'brute', { min: 3 });
    const item = drops.find((d) => d.type !== 'gold' && d.type !== 'potion') ?? drops[0];

    assert.equal(w.authority.take(b, { runId, uid: item.uid }).ok, true);
    const again = errorOf(() => w.authority.take(a, { runId, uid: item.uid }));
    assert.ok(again instanceof Refusal, 'the second player is refused');
    const twice = errorOf(() => w.authority.take(b, { runId, uid: item.uid }));
    assert.ok(twice instanceof Refusal, 'and nobody takes it twice');
    const row = w.db.q('SELECT owner, state FROM items WHERE uid = ?').get(item.uid);
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
    const drops = farm(w, a, runId);

    // Mallory is not in Ada's party: cannot join her game, cannot take from its floor.
    assert.ok(errorOf(() => w.authority.joinRun(m, { runId })) instanceof Violation);
    const own = await w.authority.startRun(m, {});
    const foreign = errorOf(() => w.authority.take(m, { runId: own.runId, uid: drops[0].uid }));
    assert.equal(foreign?.rule, 'foreign-take');
    // Nor can she act in a run that is not hers, or report kills for Ada.
    assert.ok(errorOf(() => w.authority.kill(m, { runId, monster: 'x', kind: 'grunt', wave: 1 })) instanceof Violation);

    // A wave the clock says cannot have come yet; a dragon in free play's first wave.
    assert.equal(errorOf(() => w.authority.kill(m, { runId: own.runId, monster: 'w', kind: 'grunt', wave: 40 }))?.rule, 'wave-too-fast');
    assert.equal(errorOf(() => w.authority.kill(m, { runId: own.runId, monster: 'd', kind: 'dragon', wave: 1 }))?.rule, 'kind-not-in-run');
    // A kill flood: more than a minute's worth at once.
    let flood = null;
    for (let i = 0; i < 200 && !flood; i++) flood = errorOf(() => w.authority.kill(m, { runId: own.runId, monster: `f${i}`, kind: 'grunt', wave: 1 }));
    assert.equal(flood?.rule, 'kill-rate');
    // The same monster twice is not a second kill (a retried request), and no strike.
    const first = w.authority.kill(a, { runId, monster: 'm0', kind: 'grunt', wave: 1 });
    assert.equal(first.duplicate, true);

    // Strikes: three in a day block the account, and the history says why.
    let blocked = null;
    for (const rule of ['foreign-take', 'wave-too-fast', 'kind-not-in-run']) blocked = w.authority.strike(m, rule, 'test');
    assert.ok(blocked && blocked.until > w.clock.t + 23 * 36e5);
    assert.throws(() => w.authority.assertActive(m), /blocked until/);
    assert.deepEqual(w.history.of(m).slice(0, 2).map((e) => e.type), ['blocked', 'strike']);
    // A second block lasts a week.
    w.later(25 * 3600);
    for (const rule of ['foreign-take', 'wave-too-fast', 'kind-not-in-run']) blocked = w.authority.strike(m, rule, 'again');
    assert.ok(blocked.until - w.clock.t >= 7 * 864e5 - 1000);
    // An admin can lift it.
    w.accounts.unblock(m, 'appeal');
    assert.doesNotThrow(() => w.authority.assertActive(m));
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
      for (const d of farm(w, a, runId, 'brute', { min: 6, start })) {
        if (d.type === 'gold' || d.type === 'potion') {
          w.authority.take(a, { runId, uid: d.uid });
        } else if (!item && (d.type === 'weapon' || d.type === 'gear')) {
          w.authority.take(a, { runId, uid: d.uid });
          item = d;
        }
      }
      w.later(61); // keep under the kill-rate limit
    }
    assert.ok(item, 'some gear dropped');
    const p = w.authority.character(a);
    assert.ok(p.bag.some((it) => it.uid === item.uid));

    // A move changes nothing but places.
    const move = w.authority.ops(a, { ops: [{ op: 'move', args: [item.uid, 'stash'] }] });
    assert.equal(move.results[0].ok, true);
    assert.ok(p.stash.some((it) => it.uid === item.uid));
    w.authority.ops(a, { ops: [{ op: 'move', args: [item.uid, 'bag'] }, { op: 'equip', args: [item.uid] }] });
    assert.ok(p.equipped?.uid === item.uid || Object.values(p.gear).some((g) => g?.uid === item.uid));

    // Selling pays exactly the item's value, recorded in the ledger.
    const unwear = item.type === 'weapon' ? { op: 'unequip', args: [] } : { op: 'unequipGear', args: [Object.entries(p.gear).find(([, g]) => g?.uid === item.uid)[0]] };
    w.authority.ops(a, { ops: [unwear] });
    const goldBefore = p.gold;
    w.authority.ops(a, { ops: [{ op: 'sell', args: [item.uid] }] });
    assert.equal(p.gold, goldBefore + itemValue(item));
    assert.equal(w.db.q('SELECT state FROM items WHERE uid = ?').get(item.uid).state, 'sold');
    const ledger = w.db.q('SELECT SUM(delta) AS s, MAX(id) AS last FROM ledger WHERE account_id = ?').get(a);
    assert.equal(ledger.s, p.gold, 'gold equals the sum of its ledger');

    // A sold item cannot be sold again, nor anything the account never had.
    assert.ok(errorOf(() => w.authority.ops(a, { ops: [{ op: 'sell', args: [item.uid] }] })) instanceof Refusal);
    assert.ok(errorOf(() => w.authority.ops(a, { ops: [{ op: 'hack', args: [] }] })) instanceof Violation);
    assert.ok(errorOf(() => w.authority.ops(a, { ops: [{ op: 'move', args: [item.uid, 'nowhere'] }] })) instanceof Violation);
  } finally {
    await w.close();
  }
});

test('NPCs: gifts once, quests only when the run really killed enough, study rewards rate-limited', async () => {
  const w = await world();
  try {
    const a = (await w.accounts.register({ name: 'Ada', password: 'lovelace-1815' })).account.id;
    const { runId } = await w.authority.startRun(a, { level: 'thistledown' });
    const gift = w.authority.npc(a, { runId, npc: 'thistle', action: 'gift' });
    assert.ok(gift.given);
    assert.equal(w.authority.npc(a, { runId, npc: 'thistle', action: 'gift' }).given, null, 'once');

    const early = errorOf(() => w.authority.npc(a, { runId, npc: 'pell', action: 'quest' }));
    assert.match(early?.message ?? '', /Not done yet: 0\/8/);
    for (let i = 0; i < 8; i++) {
      w.later(1);
      w.authority.kill(a, { runId, monster: `g${i}`, kind: 'grunt', wave: 1 });
    }
    const done = w.authority.npc(a, { runId, npc: 'pell', action: 'quest' });
    assert.ok(done.gold > 0);
    assert.ok(errorOf(() => w.authority.npc(a, { runId, npc: 'pell', action: 'quest' })) instanceof Refusal, 'rewarded once');

    // The shop's prices are the server's; gold must cover them.
    const shop = w.authority.shop(a, { runId, npc: 'juniper' });
    assert.ok(shop.stock.length > 1 && shop.stock.every((s) => s.uid));
    const p = w.authority.character(a);
    const goods = shop.stock.filter((s) => s.type !== 'service' && s.type !== 'potion');
    const affordable = goods.filter((s) => buyPrice(s) <= p.gold).sort((x, y) => buyPrice(x) - buyPrice(y))[0];
    if (affordable) {
      const gold = p.gold;
      const bought = w.authority.buy(a, { runId, npc: 'juniper', offer: affordable.uid });
      assert.equal(bought.ok, true);
      assert.equal(p.gold, gold - buyPrice(affordable), 'the server charges its own price');
      const copy = [...p.bag, ...p.stash].find((it) => it.name === affordable.name && it.uid !== affordable.uid && it.srv);
      assert.ok(copy, 'the bought copy has a new, server-made id');
      assert.equal(w.db.q('SELECT owner, state FROM items WHERE uid = ?').get(copy.uid).state, 'held');
    }
    const pricey = goods.find((s) => buyPrice(s) > p.gold);
    if (pricey) assert.match(errorOf(() => w.authority.buy(a, { runId, npc: 'juniper', offer: pricey.uid }))?.message ?? '', /Not enough gold/);
    assert.ok(errorOf(() => w.authority.buy(a, { runId, npc: 'juniper', offer: 'made-up' })) instanceof Refusal);

    // A new game ends the last one: its shop and floor are closed.
    const study = await w.authority.startRun(a, { level: 'study-grove' });
    assert.equal(errorOf(() => w.authority.shop(a, { runId, npc: 'juniper' }))?.status, 410);
    const one = w.authority.npc(a, { runId: study.runId, npc: 'pip', action: 'study' });
    assert.equal(one.gold, 10);
    assert.equal(errorOf(() => w.authority.npc(a, { runId: study.runId, npc: 'pip', action: 'study' }))?.rule, 'study-rate');

  } finally {
    await w.close();
  }
});

test('the history is a hash chain: editing or deleting an event breaks it', async () => {
  const w = await world();
  try {
    const a = (await w.accounts.register({ name: 'Ada', password: 'lovelace-1815' })).account.id;
    const { runId } = await w.authority.startRun(a, {});
    for (const d of farm(w, a, runId, 'brute', { min: 4 })) {
      try {
        w.authority.take(a, { runId, uid: d.uid });
      } catch {
        /* bag full */
      }
    }
    const ok = w.history.verify();
    assert.equal(ok.ok, true);
    assert.ok(ok.count >= 3);
    w.db.q("UPDATE events SET data = '{\"name\":\"Sword of Lies\"}' WHERE id = 2").run();
    assert.deepEqual(w.history.verify(), { ok: false, count: 1, brokenAt: 2 });
  } finally {
    await w.close();
  }
});

test('HTTP: sign up, cookie flags, same-origin JSON only, a character on the server', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gamory-api-'));
  const game = await createGameServices({ dataDir: dir, env: { SERVER_SECRET: randomBytes(48).toString('base64') } });
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
    game.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("a party member's claim that arrives before the host's report is held, not punished", async () => {
  const w = await world();
  try {
    const host = (await w.accounts.register({ name: 'Hostess', password: 'leading-the-way-1' })).account.id;
    const guest = (await w.accounts.register({ name: 'Visitor', password: 'just-dropping-in-1' })).account.id;
    const { runId } = await w.authority.startRun(host, {});
    w.authority.joinRun(guest, { runId });
    w.later(2);
    // The guest heard of the kill over the party socket first.
    assert.deepEqual(w.authority.partyKill(guest, { runId, monster: 'm1' }), { pending: true, xp: 0 });
    const before = w.authority.character(guest).xp + w.authority.character(guest).level * 1e6;
    w.authority.kill(host, { runId, monster: 'm1', kind: 'brute', wave: 1 });
    const after = w.authority.character(guest).xp + w.authority.character(guest).level * 1e6;
    assert.ok(after > before, 'paid when the report landed');
    assert.equal(w.db.q('SELECT COUNT(*) AS n FROM strikes WHERE account_id = ?').get(guest).n, 0, 'no strike');
    assert.equal(w.authority.partyKill(guest, { runId, monster: 'm1' }).duplicate, true, 'and paid once');
    // A claim for a monster that never dies is just forgotten.
    w.authority.partyKill(guest, { runId, monster: 'never' });
    w.later(120);
    assert.equal(w.authority.character(guest).xp + w.authority.character(guest).level * 1e6, after);
  } finally {
    await w.close();
  }
});
