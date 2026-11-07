import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRealtime } from '../../server/realtime.js';

/** A server with the room relay on an ephemeral port. */
function serve(options = {}) {
  const realtime = createRealtime({ maxPlayers: 3, ...options });
  const server = http.createServer((req, res) => res.end('ok'));
  server.on('upgrade', (req, socket, head) => {
    if (!realtime.handleUpgrade(req, socket, head)) socket.destroy();
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        url: `ws://127.0.0.1:${port}/ws`,
        realtime,
        close: () =>
          new Promise((done) => {
            realtime.close();
            server.close(() => done());
          })
      });
    });
  });
}

/** A client that queues what it receives, with `next(type)` to wait for one message. */
function client(url) {
  const ws = new WebSocket(url);
  const queue = [];
  const waiting = [];
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    const i = waiting.findIndex((w) => !w.type || w.type === msg.t);
    if (i >= 0) waiting.splice(i, 1)[0].resolve(msg);
    else queue.push(msg);
  });
  const next = (type = null, ms = 2000) =>
    new Promise((resolve, reject) => {
      const i = queue.findIndex((m) => !type || m.t === type);
      if (i >= 0) return resolve(queue.splice(i, 1)[0]);
      const entry = { type, resolve };
      waiting.push(entry);
      setTimeout(() => {
        const at = waiting.indexOf(entry);
        if (at >= 0) {
          waiting.splice(at, 1);
          reject(new Error(`no ${type ?? 'message'} within ${ms} ms`));
        }
      }, ms);
    });
  const open = new Promise((resolve) => ws.addEventListener('open', resolve));
  return { ws, next, open, send: (msg) => ws.send(JSON.stringify(msg)), close: () => ws.close() };
}

test('a party: create, join, relay, leave, and the host leaving closes it', async () => {
  const s = await serve();
  try {
    const host = client(s.url);
    await host.open;
    assert.equal((await host.next('hello')).maxPlayers, 3);
    host.send({ t: 'create', name: 'Ada' });
    const joined = await host.next('joined');
    assert.match(joined.room, /^[A-Z2-9]{5}$/);
    assert.equal(joined.host, joined.you);
    assert.deepEqual(joined.peers.map((p) => p.name), ['Ada']);

    const guest = client(s.url);
    await guest.open;
    await guest.next('hello');
    guest.send({ t: 'join', code: joined.room.toLowerCase(), name: ' Bo <b> ' });
    const gj = await guest.next('joined');
    assert.equal(gj.host, joined.you);
    assert.deepEqual(gj.peers.map((p) => p.name).sort(), ['Ada', 'Bo <b>']);
    const peer = await host.next('peer');
    assert.equal(peer.peer.name, 'Bo <b>');

    // Relay: a broadcast reaches the other member, stamped with `from`.
    guest.send({ t: 'chat', text: 'hi' });
    const chat = await host.next('chat');
    assert.equal(chat.text, 'hi');
    assert.equal(chat.from, gj.you);
    // Targeted: only the named peer gets it.
    host.send({ t: 'hit', to: gj.you, a: 5 });
    assert.equal((await guest.next('hit')).a, 5);

    assert.deepEqual(s.realtime.stats(), { rooms: 1, players: 2, connections: 2 });

    // A third joins, a fourth is refused (cap 3).
    const third = client(s.url);
    await third.open;
    await third.next('hello');
    third.send({ t: 'join', code: joined.room, name: 'Cy' });
    await third.next('joined');
    const fourth = client(s.url);
    await fourth.open;
    await fourth.next('hello');
    fourth.send({ t: 'join', code: joined.room, name: 'Di' });
    assert.equal((await fourth.next('error')).code, 'full');
    fourth.send({ t: 'join', code: 'ZZZZZ', name: 'Di' });
    assert.equal((await fourth.next('error')).code, 'no-room');
    fourth.close();

    // A guest leaving is announced; the host leaving closes the room for everyone.
    third.send({ t: 'leave' });
    assert.equal((await host.next('left')).name, 'Cy');
    await guest.next('left');
    third.close();
    host.close();
    assert.equal((await guest.next('closed')).reason, 'host-left');
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(s.realtime.stats().rooms, 0);
    guest.close();
  } finally {
    await s.close();
  }
});

test('garbage and floods are dropped without taking the room down', async () => {
  const s = await serve();
  try {
    const a = client(s.url);
    await a.open;
    await a.next('hello');
    a.ws.send('not json');
    a.ws.send(JSON.stringify({ t: 42 }));
    a.ws.send(JSON.stringify({ t: 'chat' })); // not in a room
    assert.equal((await a.next('error')).code, 'no-party');
    a.send({ t: 'create', name: 'A' });
    await a.next('joined');
    for (let i = 0; i < 130; i++) a.send({ t: 'p', i });
    assert.equal((await a.next('error')).code, 'flood');
    await new Promise((resolve) => a.ws.addEventListener('close', resolve));
    // The server's own close handler runs a tick after the client's.
    for (let i = 0; i < 50 && s.realtime.stats().rooms; i++) await new Promise((r) => setTimeout(r, 10));
    assert.equal(s.realtime.stats().rooms, 0);
  } finally {
    await s.close();
  }
});
