import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Match } from '../../src/fps/sim.js';
import { Mirror, pack } from '../../src/fps/net.js';
import { BOXES, EDGES, NODES, SITES, SPAWNS, clear, route, sees } from '../../src/fps/map.js';
import { MONEY, TIME, WEAPONS, WIN_ROUNDS } from '../../src/fps/rules.js';
import { createFps } from '../../server/fps/index.js';

const run = (m, seconds, input) => {
  const all = [];
  for (let i = 0; i < seconds * 30 && !m.over; i++) all.push(...m.step(1 / 30, typeof input === 'function' ? input(m) : input));
  return all;
};

/** A socket that isn't one: what the server sends lands in `inbox`. */
function fakeWs() {
  const ws = {
    readyState: 1,
    inbox: [],
    handlers: {},
    send: (text) => ws.inbox.push(JSON.parse(text)),
    on: (ev, fn) => (ws.handlers[ev] = fn),
    close() {
      if (ws.readyState === 3) return;
      ws.readyState = 3;
      ws.handlers.close?.();
    },
    say: (msg) => ws.handlers.message(Buffer.from(JSON.stringify(msg))),
    last: (t) => ws.inbox.filter((m) => m.t === t).at(-1)
  };
  return ws;
}

test('the map: every place to stand is clear, every path between two is walkable, and both sites can be reached', () => {
  for (const [name, [x, z]] of Object.entries(NODES)) assert.ok(clear(x, z), `node ${name} is inside something`);
  for (const side of ['atk', 'def']) for (const [x, z] of SPAWNS[side]) assert.ok(clear(x, z), `a ${side} spawn is blocked`);
  for (const [a, b] of EDGES) {
    const [ax, az] = NODES[a];
    const [bx, bz] = NODES[b];
    for (let k = 0; k <= 1; k += 0.02) assert.ok(clear(ax + (bx - ax) * k, az + (bz - az) * k, 0.38), `the way ${a}–${b} is blocked`);
  }
  for (const site of ['A', 'B']) assert.ok(route('T', site).length > 1, `no way to ${site}`);
  assert.ok(BOXES.length > 30);
  // Every solid thing is a known kind (that is how it is drawn), inside the yard, and no site is built over.
  const kinds = new Set(['wall', 'building', 'container', 'crates', 'barrels', 'tanks', 'bags']);
  for (const [x, z, w, d, h, kind] of BOXES) {
    assert.ok(kinds.has(kind), `unknown kind ${kind}`);
    assert.ok(x >= -1 && z >= -1 && x + w <= 145 && z + d <= 105 && h > 0, `a box outside the yard at ${x},${z}`);
  }
  for (const s of Object.values(SITES)) assert.ok(clear(s.x, s.z, 1.5), 'a site has room to set the charge');
  // A wall is a wall: across the map, nobody sees from one spawn to the other.
  assert.equal(sees(SPAWNS.atk[0][0], 1.6, SPAWNS.atk[0][1], SPAWNS.def[0][0], 1.6, SPAWNS.def[0][1]), false);
});

test('buying: only in the pause, only with the money, and a kit only for Wardens', () => {
  const m = new Match({ seed: 4, team: 'atk' });
  const me = m.me;
  assert.equal(me.money, MONEY.start);
  assert.equal(m.buy(me, 'vantage'), 'Not enough money');
  assert.equal(m.buy(me, 'ram'), null);
  assert.equal(me.secondary, 'ram');
  assert.equal(me.money, MONEY.start - WEAPONS.ram.price);
  assert.equal(m.buy(me, 'ram'), 'You have that');
  me.money = 5000;
  assert.equal(m.buy(me, 'kit'), 'Not for your side');
  assert.equal(m.buy(me, 'vantage'), null);
  assert.equal(m.weaponOf(me), 'vantage');
  assert.equal(m.buy(me, 'vest'), null);
  assert.equal(me.armor, 100);
  // With a vest on, the helmet is the difference.
  const before = me.money;
  assert.equal(m.buy(me, 'helmet'), null);
  assert.equal(before - me.money, 350);
  run(m, TIME.buy + 0.2, {});
  assert.equal(m.phase, 'live');
  assert.equal(m.buy(me, 'wasp'), 'The round has begun');
});

test('a round by the charge: a Raider sets it in a site, it goes off, and the Raiders take the round', () => {
  const m = new Match({ seed: 9, team: 'atk' });
  const me = m.me;
  run(m, TIME.buy + 0.1, {});
  // Clear the board of the other squad's guns, put me in A with the charge.
  for (const p of m.players) {
    p.hasCharge = p === me;
    if (p.squad !== me.squad) Object.assign(p, { x: 4, z: 30 + p.id * 0.9, cool: 1e9 });
  }
  Object.assign(me, { x: SITES.A.x, z: SITES.A.z });
  const ev = run(m, TIME.plant + 0.2, () => {
    for (const p of m.players) if (p.squad !== me.squad) p.cool = 1e9; // they hold their fire
    return { use: true };
  });
  assert.ok(ev.some((e) => e.type === 'plant' && e.site === 'A' && e.id === me.id));
  assert.equal(m.phase, 'planted');
  assert.equal(m.charge.state, 'planted');
  assert.equal(me.money, MONEY.start + MONEY.plant);
  m.timer = 0.05;
  const after = run(m, 0.2, {});
  assert.ok(after.some((e) => e.type === 'boom'));
  const round = after.find((e) => e.type === 'round');
  assert.deepEqual([round.winner, round.reason], [me.squad, 'detonated']);
  assert.equal(m.score[me.squad], 1);
  assert.equal(me.alive, false, 'whoever stands by it goes with it');
});

test('a round by disarming: a Warden beside the set charge holds on, faster with a kit', () => {
  const m = new Match({ seed: 11, team: 'def' });
  const me = m.me;
  assert.equal(m.sideOf(me.squad), 'def');
  assert.equal(m.buy(me, 'kit'), null);
  run(m, TIME.buy + 0.1, {});
  for (const p of m.players) if (p.squad !== me.squad) Object.assign(p, { x: 4, z: 28 + p.id * 0.9, hasCharge: false });
  m.charge = { x: SITES.B.x, z: SITES.B.z, state: 'planted', site: 'B' };
  m.phase = 'planted';
  m.timer = TIME.fuse;
  Object.assign(me, { x: SITES.B.x + 0.8, z: SITES.B.z });
  const ev = run(m, TIME.defuseKit + 0.3, () => {
    for (const p of m.players) if (p.squad !== me.squad) p.cool = 1e9;
    return { use: true };
  });
  assert.ok(ev.some((e) => e.type === 'defused' && e.id === me.id));
  assert.deepEqual([ev.find((e) => e.type === 'round').winner, ev.find((e) => e.type === 'round').reason], [me.squad, 'defused']);
});

test('shooting: a hit takes health, armor takes half, a head is worth more, and a drop pays', () => {
  const m = new Match({ seed: 2, team: 'atk' });
  const me = m.me;
  run(m, TIME.buy + 0.1, {});
  const foe = m.players.find((p) => p.squad !== me.squad);
  for (const p of m.players) if (p !== me && p !== foe) Object.assign(p, { x: 4 + (p.id % 5), z: 56, cool: 1e9 });
  // Face to face in the open yard by the Raiders' spawn, ten metres apart.
  Object.assign(me, { x: 8, z: 30, yaw: -Math.PI / 2, pitch: 0 });
  Object.assign(foe, { x: 18, z: 30, armor: 0, hp: 100 });
  const hold = () => {
    for (const p of m.players) if (p !== me) Object.assign(p, { cool: 1e9, x: p === foe ? 18 : p.x, z: p === foe ? 30 : p.z });
  };
  assert.ok(sees(8, 1.6, 30, 18, 1.2, 30), 'the test needs an open line');
  hold();
  // Aim at the chest: a little below the eye line.
  let ev = m.step(1 / 30, { yaw: -Math.PI / 2, pitch: -0.04, shoot: true });
  const hurt = ev.find((e) => e.type === 'hurt');
  assert.ok(hurt, 'the shot landed');
  assert.equal(hurt.id, foe.id);
  assert.ok(hurt.amount > 15 && hurt.amount <= WEAPONS.sidearm.dmg, 'a body shot, a little less for the distance');
  assert.ok(Math.abs(foe.hp - (100 - hurt.amount)) < 1);
  const money = me.money;
  let dropped = false;
  for (let i = 0; i < 300 && !dropped; i++) {
    hold();
    ev = m.step(1 / 30, { yaw: -Math.PI / 2, pitch: -0.04, shoot: i % 8 === 0 });
    dropped = ev.some((e) => e.type === 'kill' && e.by === me.id && e.who === foe.id);
  }
  assert.ok(dropped);
  assert.equal(foe.alive, false);
  assert.equal(me.money, money + MONEY.kill);
  assert.equal(me.kills, 1);
});

test('bots alone play a whole match: someone reaches seven, the ends change at the half, and money stays in bounds', () => {
  const m = new Match({ seed: 21, human: false, skill: 'hard' });
  let half = false;
  let steps = 0;
  while (!m.over && steps++ < 400000) {
    for (const e of m.step(1 / 30)) if (e.type === 'half') half = true;
    for (const p of m.players) assert.ok(p.money >= 0 && p.money <= MONEY.max);
  }
  assert.ok(m.over, 'the match ended');
  assert.equal(Math.max(...m.over.score), WIN_ROUNDS);
  assert.ok(half || m.round <= 6);
});

test('several people in one match: each takes a bot\'s seat, moves on their own keys, and a leaver is a bot again', () => {
  const m = new Match({ seed: 5, human: false });
  const a = m.seat(0, 'Ada');
  const b = m.seat(1, 'Ben');
  const c = m.seat(0, 'Cy');
  assert.deepEqual([a.squad, b.squad, c.squad], [0, 1, 0]);
  assert.equal(m.players.filter((p) => !p.bot).length, 3);
  run(m, TIME.buy + 0.1, new Map());
  const at = { ax: a.x, bx: b.x, cx: c.x, cz: c.z };
  run(m, 1, new Map([[a.id, { f: 1, yaw: a.yaw }], [b.id, { f: 1, yaw: b.yaw }]]));
  assert.ok(a.x > at.ax + 2, 'Ada walked east');
  assert.ok(b.x < at.bx - 2, 'Ben walked west');
  assert.deepEqual([c.x, c.z], [at.cx, at.cz], 'Cy, with no keys down, stood still');
  m.unseat(c);
  assert.equal(c.bot, true);
  assert.notEqual(c.name, 'Cy');
});

test('the mirror: what the server packs is what a browser shows, eased between words', () => {
  const m = new Match({ seed: 6 });
  run(m, TIME.buy + 1, { f: 1, yaw: -Math.PI / 2 });
  const mirror = new Mirror();
  mirror.apply(JSON.parse(JSON.stringify(pack(m))), 0);
  assert.equal(mirror.players.length, 10);
  assert.equal(mirror.phase, 'live');
  assert.equal(mirror.sideOf(0), m.sideOf(0));
  assert.equal(mirror.weaponOf(mirror.players[0]), 'sidearm');
  assert.ok(Math.abs(mirror.players[0].x - m.me.x) < 0.01);
  assert.equal(mirror.players[0].ammo.sidearm, 12);
  // The next word from the server: others glide to it, they don't jump.
  const other = m.players[3];
  other.x += 1;
  mirror.apply(JSON.parse(JSON.stringify(pack(m))), 0);
  const before = mirror.players[3].x;
  mirror.frame(1 / 60, 0, { f: 0, s: 0, yaw: 0, pitch: 0 });
  assert.ok(mirror.players[3].x > before && mirror.players[3].x < other.x);
});

test('rooms: made with a code, joined by it, four at most; the host starts, keys reach the match, a leaver hands back to a bot', () => {
  const fps = createFps({ manual: true });
  const people = ['Ada', 'Ben', 'Cy', 'Di', 'Eve'].map((name) => {
    const ws = fakeWs();
    fps.connect(ws);
    return { name, ws };
  });
  const [ada, ben, cy, di, eve] = people;
  ada.ws.say({ t: 'create', name: 'Ada', skill: 'easy', side: 'def' });
  const code = ada.ws.last('room').code;
  assert.match(code, /^[A-Z2-9]{5}$/);
  eve.ws.say({ t: 'join', code: 'ZZZZZ', name: 'Eve' });
  assert.match(eve.ws.last('error').text, /No room/);
  for (const p of [ben, cy, di]) p.ws.say({ t: 'join', code: code.toLowerCase(), name: p.name });
  eve.ws.say({ t: 'join', code, name: 'Eve' });
  assert.match(eve.ws.last('error').text, /full/);
  let room = ada.ws.last('room');
  assert.equal(room.members.length, 4);
  assert.deepEqual(room.members.map((m) => m.squad), [0, 1, 0, 1], 'a room splits evenly as it fills');
  assert.deepEqual([room.skill, room.side], ['easy', 'def']);
  // Only the host starts, or changes the bots.
  ben.ws.say({ t: 'start' });
  ben.ws.say({ t: 'skill', skill: 'hard' });
  assert.equal(fps.rooms.get(code).match, null);
  assert.equal(ada.ws.last('room').skill, 'easy');
  // Cy would rather play beside Ben; then the host starts.
  cy.ws.say({ t: 'squad', squad: 1 });
  ada.ws.say({ t: 'start' });
  const match = fps.rooms.get(code).match;
  assert.ok(match);
  const seat = (p) => match.players[p.ws.last('begin').you];
  assert.deepEqual([ada, ben, cy, di].map((p) => seat(p).squad), [0, 1, 1, 1]);
  assert.deepEqual([ada, ben, cy, di].map((p) => seat(p).name), ['Ada', 'Ben', 'Cy', 'Di']);
  assert.equal(match.players.filter((p) => p.bot).length, 6);
  assert.equal(match.sideOf(0), 'def');
  // Buying goes through the server, and a refusal comes back as a note.
  ada.ws.say({ t: 'buy', item: 'ram' });
  ada.ws.say({ t: 'buy', item: 'longwatch' });
  assert.equal(seat(ada).secondary, 'ram');
  assert.match(ada.ws.last('note').text, /money/);
  fps.step();
  assert.ok(ben.ws.last('snap').ev.some((e) => e.type === 'buy' && e.item === 'ram'));
  // Keys: Ada walks once the round is live; a press (jump) lasts until a step has seen it.
  for (let i = 0; i < (TIME.buy + 0.2) * 30; i++) fps.step();
  const x = seat(ada).x;
  ada.ws.say({ t: 'in', f: 1, s: 0, yaw: seat(ada).yaw, pitch: 0, jump: true });
  ada.ws.say({ t: 'in', f: 1, s: 0, yaw: seat(ada).yaw, pitch: 0 });
  fps.step();
  assert.ok(seat(ada).y > 0 || seat(ada).vy > 0, 'the jump was not lost between two messages');
  for (let i = 0; i < 20; i++) fps.step();
  assert.ok(Math.abs(seat(ada).x - x) > 1);
  const snap = di.ws.last('snap');
  assert.equal(snap.s.players.length, 10);
  // Squad talk stays in the squad; /all reaches the room.
  ben.ws.say({ t: 'say', text: 'B, together' });
  assert.equal(cy.ws.last('said').text, 'B, together');
  assert.equal(ada.ws.last('said'), undefined);
  ben.ws.say({ t: 'say', text: 'good luck', all: true });
  assert.equal(ada.ws.last('said').text, 'good luck');
  // Di leaves: a bot plays on in that seat. The host leaves: the next in line hosts.
  const diSeat = seat(di);
  di.ws.close();
  assert.equal(diSeat.bot, true);
  ada.ws.close();
  assert.equal(ben.ws.last('room').host, ben.ws.last('room').you);
  // Eve can come in now, mid-match, and takes a bot's seat.
  eve.ws.say({ t: 'join', code, name: 'Eve' });
  assert.equal(match.players[eve.ws.last('begin').you].name, 'Eve');
  for (const p of [ben, cy, eve]) p.ws.close();
  assert.equal(fps.rooms.size, 0, 'an empty room is gone');
  fps.close();
});
