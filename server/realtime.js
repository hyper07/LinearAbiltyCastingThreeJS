import { WebSocketServer } from 'ws';
import { pathOf } from './api/http.js';

/**
 * Playing together: rooms over one WebSocket endpoint (`/ws`).
 *
 * The server is deliberately *not* the game. It keeps rooms — a five-letter
 * join code, a host, up to `maxPlayers` members — and relays messages between
 * them. The player who made the room is the **host**: their browser runs the
 * monsters, the waves and the loot, and the others play in that world (see
 * src/net/Party.js). The server never has to understand a cast or a hit,
 * which is what keeps it a few hundred lines with no state to lose.
 *
 * Messages are JSON objects with a `t` (type). The server answers four of
 * them and relays every other one, stamped with `from`:
 *
 *   → { t:'create', name, cap? }    ← { t:'joined', room, you, host, peers[] }
 *   → { t:'join', code, name }      ← { t:'joined', … }  or  { t:'error', code }
 *                                     others: { t:'peer', peer:{ id, name } }
 *   → { t:'leave' }                   others: { t:'left', id }   (host: { t:'closed' } to all)
 *   → { t:<anything>, to?, … }       relayed to `to`, or to everyone else in the room
 *
 * Limits — a public endpoint has to be boring to abuse: a payload cap, a
 * per-connection message and byte budget, a cap on rooms, and a heartbeat
 * that drops silent sockets.
 */

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
const NAME_MAX = 24;

/**
 * @param {{ maxPlayers?: number, maxRooms?: number, path?: string, log?: (line: string) => void }} [options]
 */
export function createRealtime({ maxPlayers = 4, maxRooms = 500, path = '/ws', log = () => {} } = {}) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4 * 1024 * 1024, perMessageDeflate: false });
  /** code → room */
  const rooms = new Map();
  /** every connection */
  const clients = new Set();
  let nextId = 1;

  const send = (ws, msg) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  };
  const broadcast = (room, msg, exceptId = null) => {
    const text = JSON.stringify(msg);
    for (const member of room.players.values()) {
      if (member.id !== exceptId && member.ws.readyState === member.ws.OPEN) member.ws.send(text);
    }
  };
  const peerInfo = (c) => ({ id: c.id, name: c.name });
  const cleanName = (name) =>
    String(name ?? '')
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .trim()
      .slice(0, NAME_MAX) || 'Player';
  const newCode = () => {
    for (;;) {
      let code = '';
      for (let i = 0; i < 5; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
      if (!rooms.has(code)) return code;
    }
  };
  const joined = (room, client) => ({
    t: 'joined',
    room: room.code,
    you: client.id,
    host: room.host,
    cap: room.cap,
    peers: [...room.players.values()].map(peerInfo)
  });

  function leave(client, { silent = false } = {}) {
    const room = client.room;
    if (!room) return;
    room.players.delete(client.id);
    client.room = null;
    if (room.host === client.id) {
      // No host, no world: the room closes and everyone goes back to the menu.
      for (const member of room.players.values()) {
        member.room = null;
        send(member.ws, { t: 'closed', reason: 'host-left' });
      }
      room.players.clear();
      rooms.delete(room.code);
      log(`room ${room.code} closed (host left)`);
    } else {
      if (!silent) broadcast(room, { t: 'left', id: client.id, name: client.name });
      if (!room.players.size) rooms.delete(room.code);
    }
  }

  function handle(client, msg) {
    switch (msg.t) {
      case 'create': {
        if (client.room) leave(client);
        if (rooms.size >= maxRooms) return send(client.ws, { t: 'error', code: 'busy', message: 'The server is full right now — try again in a minute.' });
        const cap = Math.max(2, Math.min(maxPlayers, Number(msg.cap) || maxPlayers));
        const room = { code: newCode(), host: client.id, players: new Map([[client.id, client]]), created: Date.now(), cap };
        rooms.set(room.code, room);
        client.room = room;
        client.name = cleanName(msg.name);
        send(client.ws, joined(room, client));
        log(`room ${room.code} opened by ${client.name}`);
        return;
      }
      case 'join': {
        const code = String(msg.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
        const room = rooms.get(code);
        if (!room) return send(client.ws, { t: 'error', code: 'no-room', message: 'No party has that code.' });
        if (room.players.size >= room.cap) return send(client.ws, { t: 'error', code: 'full', message: 'That party is full.' });
        if (client.room) leave(client);
        client.name = cleanName(msg.name);
        room.players.set(client.id, client);
        client.room = room;
        send(client.ws, joined(room, client));
        broadcast(room, { t: 'peer', peer: peerInfo(client) }, client.id);
        return;
      }
      case 'leave':
        leave(client);
        send(client.ws, { t: 'left', id: client.id, you: true });
        return;
      default: {
        const room = client.room;
        if (!room) return send(client.ws, { t: 'error', code: 'no-party', message: 'Not in a party.' });
        const out = { ...msg, from: client.id };
        if (msg.to != null) {
          const target = room.players.get(String(msg.to));
          if (target) send(target.ws, out);
        } else {
          broadcast(room, out, client.id);
        }
      }
    }
  }

  wss.on('connection', (ws) => {
    const client = { id: String(nextId++), name: 'Player', ws, room: null, alive: true, budget: { at: Date.now(), msgs: 0, bytes: 0 } };
    clients.add(client);
    ws.on('pong', () => (client.alive = true));
    ws.on('message', (data, isBinary) => {
      if (isBinary) return;
      // The budget: 120 messages and 2 MB per second, which is more than a
      // host at 20 Hz needs and far less than a flood.
      const b = client.budget;
      const now = Date.now();
      if (now - b.at > 1000) Object.assign(b, { at: now, msgs: 0, bytes: 0 });
      b.msgs += 1;
      b.bytes += data.length;
      if (b.msgs > 120 || b.bytes > 2 * 1024 * 1024) {
        send(ws, { t: 'error', code: 'flood', message: 'Too many messages.' });
        return ws.close(1008, 'flood');
      }
      let msg;
      try {
        msg = JSON.parse(data.toString('utf8'));
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string' || msg.t.length > 32) return;
      handle(client, msg);
    });
    ws.on('close', () => {
      clients.delete(client);
      leave(client);
    });
    ws.on('error', () => {
      /* closed by the other side; 'close' follows */
    });
    send(ws, { t: 'hello', id: client.id, maxPlayers });
  });

  // Heartbeat: a socket that misses two pings is gone.
  const heartbeat = setInterval(() => {
    for (const client of clients) {
      if (!client.alive) {
        client.ws.terminate();
        continue;
      }
      client.alive = false;
      try {
        client.ws.ping();
      } catch {
        client.ws.terminate();
      }
    }
  }, 25_000);
  heartbeat.unref?.();

  return {
    /** Take the upgrade when it is ours; false lets the caller deal with it. */
    handleUpgrade(req, socket, head) {
      if (pathOf(req) !== path) return false;
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
      return true;
    },
    stats() {
      let players = 0;
      for (const room of rooms.values()) players += room.players.size;
      return { rooms: rooms.size, players, connections: clients.size };
    },
    /** For tests: the rooms by code. */
    rooms,
    close() {
      clearInterval(heartbeat);
      for (const client of clients) {
        try {
          client.ws.close(1001, 'server closing');
        } catch {
          /* already gone */
        }
      }
      wss.close();
    }
  };
}
