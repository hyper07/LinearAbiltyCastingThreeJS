import { WebSocketServer } from 'ws';
import { pathOf } from '../api/http.js';
import { Match } from '../../src/fps/sim.js';
import { pack } from '../../src/fps/net.js';
import { SKILL, WEAPONS, GEAR } from '../../src/fps/rules.js';

/**
 * Breachline together: rooms of up to four people over one WebSocket
 * endpoint (`/fps`), and the matches they play, run here.
 *
 * Someone makes a room and gets a five-letter code; the others join with
 * it. In the room each picks a squad (all four on one, or split), the host
 * picks how good the bots are and starts. From then the server is the game:
 * it steps the match thirty times a second, takes each person's keys and
 * aim, and sends everyone what the match looks like. Bots fill every seat a
 * person isn't in; someone who joins late takes a bot's place, and someone
 * who leaves hands theirs back.
 *
 *   → { t:'create', name, skill?, side? }   ← { t:'room', code, you, host, skill, side, playing, members[] }
 *   → { t:'join', code, name }              ← { t:'room', … }  or  { t:'error', text }
 *   → { t:'squad', squad }   { t:'skill', skill }   { t:'side', side }   (the last two: host)
 *   → { t:'start' }  (host)                 ← { t:'begin', you: <player id> }
 *   → { t:'in', f, s, yaw, pitch, fire, shoot, reload, use, jump, slot, scope }
 *   → { t:'buy', item }                     ← { t:'note', text } when it can't be bought
 *   → { t:'say', text, all? }               ← { t:'said', from, name, text, all } (to their squad, or to all)
 *                                           ← { t:'snap', s: <pack(match)>, ev: [events] }
 */

const CODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const RATE = 30;

export function createFps({ authenticate = () => null, log = () => {}, path = '/fps', maxPlayers = 4, maxRooms = 200, manual = false } = {}) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4 * 1024, perMessageDeflate: false });
  /** code → room */
  const rooms = new Map();
  let nextId = 1;

  const clean = (text, max) => String(text ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
  const num = (v, lo, hi) => (Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Number(v))) : 0);
  const send = (c, msg) => {
    if (c.ws.readyState === 1) c.ws.send(JSON.stringify(msg));
  };
  const all = (room, msg) => {
    const text = JSON.stringify(msg);
    for (const c of room.members.values()) if (c.ws.readyState === 1) c.ws.send(text);
  };
  const roomMsg = (room, c) => ({ t: 'room', code: room.code, you: c.id, host: room.host, skill: room.skill, side: room.side, playing: Boolean(room.match && !room.match.over), members: [...room.members.values()].map((m) => ({ id: m.id, name: m.name, squad: m.squad })) });
  const tell = (room) => {
    for (const c of room.members.values()) send(c, roomMsg(room, c));
  };

  /** Give someone their seat: the player they are in the match. */
  function seat(room, c, p = room.match.seat(c.squad, c.name)) {
    c.player = p;
    if (p) {
      c.squad = p.squad;
      room.inputs.set(p.id, {});
    }
    send(c, { t: 'begin', you: p?.id ?? null });
  }

  function start(room) {
    const members = [...room.members.values()];
    room.done = false;
    // Seated from the start, so each person begins with a full purse (a bot spends its own before the first round).
    room.match = new Match({ seed: (Math.random() * 2 ** 31) | 0, team: room.side, skill: room.skill, humans: members.map((c) => ({ name: c.name, squad: c.squad })) });
    room.inputs = new Map();
    room.pending = [];
    members.forEach((c, i) => seat(room, c, room.match.seated[i]));
    tell(room);
    log(`[breachline] ${room.code}: a match begins with ${room.members.size}`);
  }

  function leave(c) {
    const room = c.room;
    if (!room) return;
    c.room = null;
    room.members.delete(c.id);
    if (c.player) {
      room.match?.unseat(c.player);
      room.inputs?.delete(c.player.id);
      c.player = null;
    }
    if (!room.members.size) {
      rooms.delete(room.code);
      return;
    }
    if (room.host === c.id) room.host = room.members.keys().next().value;
    tell(room);
  }

  function join(c, room, name) {
    leave(c);
    c.name = c.account?.name ?? (clean(name, 24) || 'Player');
    // The emptier squad, so a room splits evenly unless people choose otherwise.
    const count = [0, 1].map((s) => [...room.members.values()].filter((m) => m.squad === s).length);
    c.squad = room.members.size && count[0] > count[1] ? 1 : 0;
    c.room = room;
    room.members.set(c.id, c);
    tell(room);
    if (room.match && !room.match.over) seat(room, c);
  }

  const handlers = {
    create(c, msg) {
      if (rooms.size >= maxRooms) return send(c, { t: 'error', text: 'The server is full — try again in a little while' });
      let code = '';
      do {
        code = Array.from({ length: 5 }, () => CODE[Math.floor(Math.random() * CODE.length)]).join('');
      } while (rooms.has(code));
      const room = { code, host: c.id, members: new Map(), skill: SKILL[msg.skill] ? msg.skill : 'normal', side: msg.side === 'def' ? 'def' : 'atk', match: null, inputs: new Map(), pending: [] };
      rooms.set(code, room);
      join(c, room, msg.name);
    },
    join(c, msg) {
      const room = rooms.get(clean(msg.code, 8).toUpperCase());
      if (!room) return send(c, { t: 'error', text: 'No room with that code' });
      if (room.members.size >= maxPlayers && !room.members.has(c.id)) return send(c, { t: 'error', text: `That room is full (${maxPlayers} people)` });
      join(c, room, msg.name);
    },
    leave(c) {
      leave(c);
    },
    squad(c, msg) {
      const room = c.room;
      if (!room || (room.match && !room.match.over)) return;
      c.squad = msg.squad === 1 ? 1 : 0;
      tell(room);
    },
    skill(c, msg) {
      if (c.room?.host !== c.id || !SKILL[msg.skill]) return;
      c.room.skill = msg.skill;
      tell(c.room);
    },
    side(c, msg) {
      if (c.room?.host !== c.id) return;
      c.room.side = msg.side === 'def' ? 'def' : 'atk';
      tell(c.room);
    },
    start(c) {
      const room = c.room;
      if (!room || room.host !== c.id || (room.match && !room.match.over)) return;
      start(room);
    },
    in(c, msg) {
      const room = c.room;
      if (!room?.match || !c.player) return;
      const was = room.inputs.get(c.player.id) ?? {};
      room.inputs.set(c.player.id, {
        f: num(msg.f, -1, 1),
        s: num(msg.s, -1, 1),
        yaw: num(msg.yaw, -1e4, 1e4),
        pitch: num(msg.pitch, -1.5, 1.5),
        fire: Boolean(msg.fire),
        use: Boolean(msg.use),
        scope: Boolean(msg.scope),
        slot: msg.slot === 1 || msg.slot === 2 ? msg.slot : undefined,
        // Presses last until the match has stepped once with them.
        shoot: Boolean(msg.shoot) || was.shoot,
        jump: Boolean(msg.jump) || was.jump,
        reload: Boolean(msg.reload) || was.reload
      });
    },
    buy(c, msg) {
      const room = c.room;
      if (!room?.match || !c.player) return;
      const item = String(msg.item ?? '');
      if (!WEAPONS[item] && !GEAR[item]) return;
      const no = room.match.buy(c.player, item);
      if (no) send(c, { t: 'note', text: no });
      else room.pending.push({ type: 'buy', id: c.player.id, item });
    },
    say(c, msg) {
      const room = c.room;
      const text = clean(msg.text, 160);
      if (!room || !text) return;
      const toAll = Boolean(msg.all) || !room.match;
      for (const m of room.members.values()) if (toAll || m.squad === c.squad) send(m, { t: 'said', from: c.id, name: c.name, text, all: toAll });
    }
  };

  function connect(ws, account = null) {
    const c = { id: nextId++, ws, account, name: account?.name ?? 'Player', room: null, player: null, squad: 0, budget: 0, since: Date.now() };
    ws.on('message', (data) => {
      // A budget: far more than play needs, far less than a flood.
      const now = Date.now();
      if (now - c.since > 1000) Object.assign(c, { since: now, budget: 0 });
      if (++c.budget > 150) return ws.close(4008, 'Too many messages');
      let msg;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }
      if (msg && typeof msg === 'object' && Object.hasOwn(handlers, msg.t)) handlers[msg.t](c, msg);
    });
    ws.on('close', () => leave(c));
    ws.on('error', () => {});
    return c;
  }

  /** Move every match on, and tell its room. */
  function tick(dt = 1 / RATE) {
    for (const room of rooms.values()) {
      const match = room.match;
      if (!match || room.done) continue;
      const events = match.step(dt, room.inputs);
      for (const input of room.inputs.values()) Object.assign(input, { shoot: false, jump: false, reload: false });
      const ev = room.pending.concat(events.filter((e) => e.type !== 'buy'));
      room.pending = [];
      all(room, { t: 'snap', s: pack(match), ev });
      if (match.over) {
        room.done = true;
        for (const c of room.members.values()) c.player = null;
        tell(room);
      }
    }
  }
  const loop = manual ? null : setInterval(() => tick(), 1000 / RATE);
  loop?.unref?.();

  function handleUpgrade(req, socket, head) {
    if (pathOf(req) !== path) return false;
    Promise.resolve()
      .then(() => authenticate(req))
      .catch(() => null)
      .then((account) => {
        if (account?.blockedUntil > Date.now()) {
          socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
          return socket.destroy();
        }
        wss.handleUpgrade(req, socket, head, (ws) => connect(ws, account));
      });
    return true;
  }

  return {
    handleUpgrade,
    connect,
    step: tick,
    rooms,
    stats: () => ({ rooms: rooms.size, people: [...rooms.values()].reduce((n, r) => n + r.members.size, 0) }),
    close() {
      if (loop) clearInterval(loop);
      for (const room of rooms.values()) for (const c of room.members.values()) c.ws.close(1001, 'Server going down');
    }
  };
}
