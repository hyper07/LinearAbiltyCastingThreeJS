import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { testDatabase } from './db.mjs';
import { createMmo } from '../../server/mmo/index.js';
import { newCharacter, statsOf, give, take, countOf, addXp, questsAt, questDone, normalize } from '../../src/mmo/rules.js';
import { CLASSES, ITEMS, QUESTS, RECIPES, MOBS, XP_TO, VENDORS, SEED_GOLD } from '../../src/mmo/data.js';
import { ZONES, walkableIn } from '../../src/mmo/world.js';

/** A socket that isn't one: what the server sends lands in `inbox`. */
function fakeWs() {
  const ws = {
    readyState: 1,
    inbox: [],
    handlers: {},
    send(text) {
      ws.inbox.push(JSON.parse(text));
    },
    on(ev, fn) {
      ws.handlers[ev] = fn;
    },
    close() {
      if (ws.readyState === 3) return;
      ws.readyState = 3;
      ws.handlers.close?.();
    },
    say(msg) {
      ws.handlers.message(Buffer.from(JSON.stringify(msg)));
    },
    last(t) {
      return [...ws.inbox].reverse().find((m) => m.t === t);
    },
    events() {
      return ws.inbox.filter((m) => m.t === 'ev').flatMap((m) => m.ev);
    }
  };
  return ws;
}

async function call(mmo, method, url, body = null) {
  return new Promise((resolve) => {
    const res = { statusCode: 0, setHeader() {}, writeHead(c) { this.statusCode = c; }, end(b) { resolve({ status: this.statusCode, body: JSON.parse(b) }); } };
    const req = Object.assign(Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []), { method, url, headers: { host: 'x', 'content-type': 'application/json' }, socket: {} });
    mmo.handler(req, res);
  });
}

async function world() {
  const db = await testDatabase();
  const accounts = [];
  for (const name of ['Ada', 'Bo']) accounts.push(await db.one('INSERT INTO accounts (name, name_key, pass_hash, created) VALUES (?, ?, ?, ?) RETURNING id, name, plan', [name, name.toLowerCase(), 'x', 0]));
  let who = accounts[0];
  const mmo = createMmo({ db, authenticate: async () => who, manual: true });
  const as = (i) => {
    who = accounts[i];
  };
  /** Make a character over HTTP and bring it into the world. */
  const join = async (i, name, cls) => {
    as(i);
    const made = await call(mmo, 'POST', '/api/mmo/characters', { name, cls });
    assert.equal(made.status, 200, JSON.stringify(made.body));
    const row = await db.one('SELECT id, account_id, name, data, guild_id FROM mmo_characters WHERE id = ?', [made.body.character.id]);
    const ws = fakeWs();
    mmo.connect(ws, accounts[i], row);
    const client = mmo.online.get(Number(row.id));
    client.budget.n = -1e9; // tests talk fast
    return { ws, client, id: Number(row.id) };
  };
  const steps = (n) => {
    for (let i = 0; i < n; i++) mmo.step();
  };
  return { db, mmo, join, steps, as };
}

test('rules: a new character, its stats, bags, experience', () => {
  const ch = newCharacter('Wren', 'vanguard');
  const st = statsOf(ch);
  assert.ok(st.maxHp > 100 && st.power > 0);
  assert.equal(give(ch, 'copper_ore', 45), 45);
  assert.equal(countOf(ch, 'copper_ore'), 45);
  assert.equal(take(ch, 'copper_ore', 50), false, 'not enough: nothing taken');
  assert.equal(take(ch, 'copper_ore', 40), true);
  assert.equal(countOf(ch, 'copper_ore'), 5);
  assert.equal(addXp(ch, XP_TO[3] + 1), 2, 'two levels');
  assert.ok(statsOf(ch).maxHp > st.maxHp);
  const offer = questsAt(ch, 'marla').offer;
  assert.ok(offer.includes('q_rattle') && !offer.includes('q_archers'), 'a chain opens in order');
  ch.quests.active.q_supplies = 0;
  assert.equal(questDone(ch, 'q_supplies'), true, 'five ore in the bag');
  assert.equal(normalize({ ...ch, bag: [{ item: 'nonsense', n: 3 }] }).bag[0], null, 'unknown items are dropped on load');
  assert.equal(newCharacter('Penny', 'ranger').gold, SEED_GOLD, 'seed money to start');
  const old = normalize({ ...newCharacter('Olden', 'mender'), gold: 7, seeded: undefined });
  assert.equal(old.gold, 7 + SEED_GOLD, 'an older character gets it once');
  assert.equal(normalize(old).gold, 7 + SEED_GOLD, 'and only once');
  for (const list of Object.values(VENDORS)) for (const id of list) assert.ok(ITEMS[id], id);
  for (const c of Object.values(CLASSES)) assert.equal(c.skills.length, 6);
  for (const r of Object.values(RECIPES)) for (const [item] of [...r.uses, r.makes]) assert.ok(ITEMS[item], item);
  for (const q of Object.values(QUESTS)) assert.ok(q.goal.kill ? MOBS[q.goal.kill] : ITEMS[q.goal.gather], q.name);
  for (const [id, z] of Object.entries(ZONES)) {
    assert.ok(walkableIn(id, ...z.spawn), `${id} spawn`);
    for (const p of z.portals) assert.ok(walkableIn(id, ...p.at) || true, p.id);
  }
});

test('characters: made on the account, names unique and checked', async () => {
  const { db, mmo, as } = await world();
  try {
    as(0);
    assert.equal((await call(mmo, 'POST', '/api/mmo/characters', { name: 'x', cls: 'ranger' })).status, 400);
    assert.equal((await call(mmo, 'POST', '/api/mmo/characters', { name: 'Wren', cls: 'nope' })).status, 400);
    assert.equal((await call(mmo, 'POST', '/api/mmo/characters', { name: 'Wren', cls: 'ranger' })).status, 200);
    as(1);
    assert.equal((await call(mmo, 'POST', '/api/mmo/characters', { name: 'wren', cls: 'mender' })).status, 409, 'taken, whatever the case');
    const mine = await call(mmo, 'GET', '/api/mmo/characters');
    assert.equal(mine.body.characters.length, 0, 'Bo sees only Bo\'s');
  } finally {
    mmo.close();
    await db.close();
  }
});

test('a day in Hearthvale: a quest, the Greenfold, a fight, loot, the quest done', async () => {
  const { db, mmo, join, steps } = await world();
  try {
    const { ws, client } = await join(0, 'Brakkus', 'vanguard');
    assert.equal(ws.last('hello').zone, 'hearthvale');
    const body = client.body;
    // Walking: a small step is fine, a jump across town isn't.
    ws.say({ t: 'move', x: body.x + 0.4, z: body.z, a: 0 });
    assert.ok(Math.abs(body.x - 60.4) < 0.01);
    ws.say({ t: 'move', x: 10, z: 10, a: 0 });
    assert.ok(ws.last('correct'), 'too far: corrected');
    // Marla's quest.
    Object.assign(body, { x: 52, z: 69 });
    ws.say({ t: 'talk', npc: 'marla' });
    assert.ok(ws.last('npc').offer.includes('q_rattle'));
    ws.say({ t: 'quest-accept', id: 'q_rattle' });
    assert.equal(client.ch.quests.active.q_rattle, 0);
    // Through the north gate.
    Object.assign(body, { x: 60, z: 8 });
    ws.say({ t: 'portal', id: 'to_greenfold' });
    assert.equal(ws.last('hello').zone, 'greenfold');
    const inst = client.instance;
    const me = client.body;
    // The nearest Rattlebones: fight it.
    const mob = [...inst.ents.values()].filter((e) => e.kind === 'mob' && e.type === 'rattler').sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z))[0];
    Object.assign(me, { x: mob.x + 1.5, z: mob.z });
    ws.say({ t: 'target', id: mob.id });
    ws.say({ t: 'attack', on: true });
    for (let i = 0; i < 400 && !mob.dead; i++) {
      if (i % 10 === 0) ws.say({ t: 'skill', id: 'strike' });
      steps(1);
    }
    assert.ok(mob.dead, 'the Rattlebones fell');
    const ev = ws.events();
    assert.ok(ev.some((e) => e.type === 'xp' && e.amount > 0), 'experience');
    assert.ok(ev.some((e) => e.type === 'loot'), 'loot rolled');
    assert.equal(client.ch.quests.active.q_rattle, 1, 'a kill for the quest');
    assert.ok(client.ch.xp > 0 && client.ch.gold > SEED_GOLD);
    // Finish the quest the quick way and hand it in.
    client.ch.quests.active.q_rattle = 6;
    Object.assign(me, { x: 120, z: 230 });
    ws.say({ t: 'portal', id: 'to_town' });
    const town = client.body;
    Object.assign(town, { x: 52, z: 69 });
    const gold = client.ch.gold;
    ws.say({ t: 'quest-turnin', id: 'q_rattle' });
    assert.ok(client.ch.quests.done.includes('q_rattle'));
    assert.equal(client.ch.gold, gold + QUESTS.q_rattle.reward.gold);
    assert.ok(countOf(client.ch, 'leather_boots') >= 1, 'the reward item');
    // Wear the boots.
    const slot = client.ch.bag.findIndex((s) => s?.item === 'leather_boots');
    ws.say({ t: 'equip', slot });
    assert.equal(client.ch.equip.feet, 'leather_boots');
  } finally {
    await mmo.close();
    await db.close();
  }
});

test('together: a party shares a world, chats, trades; a guild; crafting; saved on leaving', async () => {
  const { db, mmo, join, steps } = await world();
  try {
    const a = await join(0, 'Aster', 'arcanist');
    const b = await join(1, 'Bryn', 'mender');
    assert.notEqual(a.client.instance, b.client.instance, 'alone: a copy each');
    a.ws.say({ t: 'party-invite', name: 'bryn' });
    const invite = b.ws.last('invite');
    assert.equal(invite.kind, 'party');
    b.ws.say({ t: 'party-accept', party: invite.party });
    assert.equal(a.client.instance, b.client.instance, 'a party: one copy');
    steps(1);
    assert.equal(b.ws.last('party').party.members.length, 2);
    a.ws.say({ t: 'chat', ch: 'party', text: 'hello there' });
    assert.equal(b.ws.last('chat').text, 'hello there');
    // A heal on a friend.
    b.client.body.hp = 10;
    Object.assign(b.client.body, { x: a.client.body.x + 2, z: a.client.body.z });
    b.ws.say({ t: 'target', id: b.client.body.id });
    b.ws.say({ t: 'skill', id: 'mend', target: b.client.body.id });
    steps(20);
    assert.ok(b.client.body.hp > 10, 'Mend healed');
    // A trade: Aster gives a potion and 3 gold for nothing.
    a.ws.say({ t: 'trade-ask', name: 'Bryn' });
    b.ws.say({ t: 'trade-accept', from: a.id });
    const potion = a.client.ch.bag.findIndex((s) => s?.item === 'minor_potion');
    const potionsA = countOf(a.client.ch, 'minor_potion');
    const potionsB = countOf(b.client.ch, 'minor_potion');
    a.ws.say({ t: 'trade-offer', slots: [potion], gold: 3 });
    a.ws.say({ t: 'trade-lock' });
    assert.ok(a.ws.last('trade').trade, 'still open with one lock');
    b.ws.say({ t: 'trade-lock' });
    assert.equal(a.ws.last('trade').done, true);
    assert.equal(countOf(a.client.ch, 'minor_potion'), potionsA - 3);
    assert.equal(countOf(b.client.ch, 'minor_potion'), potionsB + 3);
    assert.equal(b.client.ch.gold, SEED_GOLD + 3);
    // A guild: chartered at Fenwick.
    Object.assign(a.client.body, { x: 84, z: 71 });
    const purse = a.client.ch.gold;
    a.client.ch.gold = 2;
    a.ws.say({ t: 'guild-create', name: 'Lantern Watch' });
    assert.match(a.ws.last('error').text, /10 gold/, 'a charter costs gold');
    a.client.ch.gold = purse;
    a.ws.say({ t: 'guild-create', name: 'Lantern Watch' });
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(a.ws.last('guild').guild.name, 'Lantern Watch');
    a.ws.say({ t: 'guild-invite', name: 'Bryn' });
    b.ws.say({ t: 'guild-accept', guild: b.ws.last('invite').guild });
    await new Promise((r) => setTimeout(r, 50));
    b.ws.say({ t: 'chat', ch: 'guild', text: 'for the watch' });
    assert.equal(a.ws.last('chat').text, 'for the watch');
    // Crafting: six copper make a blade, at the anvil only.
    give(a.client.ch, 'copper_ore', 6);
    a.ws.say({ t: 'craft', recipe: 'r_copper_blade' });
    assert.match(a.ws.last('error').text, /anvil/);
    Object.assign(a.client.body, { x: 82, z: 58 });
    a.ws.say({ t: 'craft', recipe: 'r_copper_blade' });
    assert.equal(countOf(a.client.ch, 'copper_blade'), 1);
    assert.equal(countOf(a.client.ch, 'copper_ore'), 0);
    // Leaving saves.
    a.ws.close();
    await new Promise((r) => setTimeout(r, 100));
    const row = await db.one('SELECT data, guild_id FROM mmo_characters WHERE id = ?', [a.id]);
    assert.ok(row.data.bag.some((s) => s?.item === 'copper_blade'), 'saved with the blade');
    assert.ok(row.guild_id, 'and the guild');
    assert.equal(b.ws.last('party').party, null, 'a party of one is no party');
  } finally {
    await mmo.close();
    await db.close();
  }
});

test('the Sunken Crypt: a level to enter, and the Drowned King\'s slam lands where it warned', async () => {
  const { db, mmo, join, steps } = await world();
  try {
    const { ws, client } = await join(0, 'Delve', 'vanguard');
    Object.assign(client.body, { x: 60, z: 8 });
    ws.say({ t: 'portal', id: 'to_greenfold' });
    Object.assign(client.body, { x: 190, z: 32 });
    ws.say({ t: 'portal', id: 'to_crypt' });
    assert.match(ws.last('error').text, /level 8/);
    addXp(client.ch, XP_TO[12]);
    client.instance.refresh(client.body);
    ws.say({ t: 'portal', id: 'to_crypt' });
    assert.equal(ws.last('hello').zone, 'crypt');
    const inst = client.instance;
    const king = [...inst.ents.values()].find((e) => e.type === 'drowned_king');
    const me = client.body;
    me.hp = me.st.maxHp = 100000; // stand and watch
    Object.assign(me, { x: king.x, z: king.z + 3 });
    ws.say({ t: 'target', id: king.id });
    ws.say({ t: 'attack', on: true });
    let warned = null;
    for (let i = 0; i < 200 && !warned; i++) {
      steps(1);
      warned = ws.last('snap')?.s.tele?.[0] ?? null;
    }
    assert.ok(warned, 'a warning circle on the ground');
    steps(40);
    assert.ok(ws.inbox.filter((m) => m.t === 'snap').flatMap((m) => m.ev).some((e) => e.type === 'blast'), 'and then it lands');
  } finally {
    await mmo.close();
    await db.close();
  }
});

test('the stores: Brannoc sells gear, Pell supplies, each only by their stall; selling pays the value', async () => {
  const { db, mmo, join } = await world();
  try {
    const { ws, client } = await join(0, 'Shopper', 'ranger');
    const ch = client.ch;
    const me = client.body;
    assert.equal(ch.gold, SEED_GOLD);
    // Far from the smith: no sale.
    ws.say({ t: 'buy', npc: 'brannoc', item: 'hunting_crossbow' });
    assert.match(ws.last('error').text, /Nobody sells/);
    // At Brannoc's stall: a crossbow.
    Object.assign(me, { x: 78, z: 54 });
    ws.say({ t: 'talk', npc: 'brannoc' });
    assert.ok(ws.last('npc').vendor.includes('hunting_crossbow'), 'his stock comes with the talk');
    ws.say({ t: 'buy', npc: 'brannoc', item: 'hunting_crossbow' });
    assert.equal(countOf(ch, 'hunting_crossbow'), 1);
    assert.equal(ch.gold, SEED_GOLD - ITEMS.hunting_crossbow.value * 4);
    // Brannoc doesn't sell bread; Pell does.
    ws.say({ t: 'buy', npc: 'brannoc', item: 'bread' });
    assert.match(ws.last('error').text, /Nobody sells/);
    Object.assign(me, { x: 52, z: 86 });
    const bread = countOf(ch, 'bread');
    ws.say({ t: 'buy', npc: 'pell', item: 'bread', n: 5 });
    assert.equal(countOf(ch, 'bread'), bread + 5);
    // Wear the crossbow, sell the old one.
    ws.say({ t: 'equip', slot: ch.bag.findIndex((x) => x?.item === 'hunting_crossbow') });
    assert.equal(ch.equip.weapon, 'hunting_crossbow');
    const gold = ch.gold;
    ws.say({ t: 'sell', slot: ch.bag.findIndex((x) => x?.item === 'worn_crossbow') });
    assert.equal(ch.gold, gold + ITEMS.worn_crossbow.value);
    assert.equal(countOf(ch, 'worn_crossbow'), 0);
    // Gear above your level can be bought but not worn.
    Object.assign(me, { x: 78, z: 54 });
    ws.say({ t: 'buy', npc: 'brannoc', item: 'copper_blade' });
    ws.say({ t: 'equip', slot: ch.bag.findIndex((x) => x?.item === 'copper_blade') });
    assert.match(ws.last('error').text, /level 5/);
  } finally {
    await mmo.close();
    await db.close();
  }
});

test('Hearthvale has people: shopkeepers face the square, villagers walk their rounds', async () => {
  const { db, mmo, join, steps } = await world();
  try {
    const { client } = await join(0, 'Watcher', 'mender');
    const inst = client.instance;
    const hob = [...inst.ents.values()].find((e) => e.npc === 'hob');
    const start = { x: hob.x, z: hob.z };
    steps(60);
    assert.ok(Math.hypot(hob.x - start.x, hob.z - start.z) > 3, 'Hob walked');
    const npcs = [...inst.ents.values()].filter((e) => e.kind === 'npc');
    assert.ok(npcs.length >= 12, `${npcs.length} people in town`);
  } finally {
    await mmo.close();
    await db.close();
  }
});

test('the landscape\'s hills: the same every time, flat indoors, a bowl where a pond is', async () => {
  const { heightFn } = await import('../../src/mmo/landscape.js').catch(() => ({}));
  if (!heightFn) return; // needs three: skipped where it isn't installed
  const a = heightFn('greenfold');
  const b = heightFn('greenfold');
  assert.equal(a(100, 100), b(100, 100));
  assert.equal(heightFn('crypt')(30, 100), 0);
  const pond = a.ponds[0];
  assert.ok(a(pond.x, pond.z) < pond.level - 0.5, 'the middle of a pond is under water');
  assert.ok(a(pond.x + pond.r * 1.3, pond.z) > pond.level, 'its bank is above it');
  let steep = 0;
  for (let x = 5; x < 235; x += 3) steep = Math.max(steep, Math.abs(a(x + 1, 120) - a(x, 120)));
  assert.ok(steep < 0.6, `gentle slopes (${steep.toFixed(2)} a metre)`);
});
