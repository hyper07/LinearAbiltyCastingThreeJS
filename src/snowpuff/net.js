/**
 * Racing with friends over the party relay (server/realtime.js, through
 * src/net/Session.js): a room of up to four by a five-letter code. The
 * host's browser is the race's authority — it runs the AI rivals for the
 * empty places, decides every snowball hit and the final order. Everyone
 * sends their own rider ~15 times a second; the others glide between those
 * states (netproto.js). If the server can't be reached, single player is
 * untouched: this only ever adds riders.
 */
import { Session } from '../net/Session.js';
import { MSG, SEND_HZ, packState, unpackState, packThrow, unpackThrow, cleanMember, assignSlots, InterpBuffer } from './netproto.js';
import { ALL_SPECIES } from './riders.js';
import { cleanName } from './names.js';
import { cleanGoggle } from './goggleList.js';
import { cleanBoard } from './boardList.js';
import { cleanMode } from './course.js';

export class OnlineRace {
  constructor({ name = 'Rider', species = 'fox', goggles = 'classic', board = 'classic', onChange = () => {}, onGo = () => {}, onMessage = () => {}, onClosed = () => {} } = {}) {
    this.session = new Session();
    this.name = name;
    this.species = species;
    this.goggles = cleanGoggle(goggles);
    this.board = cleanBoard(board);
    this.onChange = onChange;
    this.onGo = onGo;
    this.onMessage = onMessage;
    this.onClosed = onClosed;
    this.members = new Map(); // id → { id, name, species }
    this.mountain = 'marshmallow';
    this.mode = 'quick';
    this.error = '';
    this.busy = false;
    this.remote = new Map(); // slot → InterpBuffer
    this.sendT = 0;
    const s = this.session;
    s.on('message', (m) => this.receive(m));
    s.on('peer', (p) => {
      this.members.set(p.id, { id: p.id, name: cleanName(p.name), species: 'fox', goggles: 'classic', board: 'classic' });
      if (this.isHost) this.sendLobby();
      this.onChange();
    });
    s.on('left', (id) => {
      this.members.delete(id);
      if (this.isHost) this.sendLobby();
      this.onMessage({ t: 'left', id });
      this.onChange();
    });
    s.on('closed', () => {
      this.reset();
      this.error = 'The host left the room.';
      this.onClosed('host-left');
      this.onChange();
    });
    s.on('disconnected', () => {
      this.reset();
      this.error = 'Lost the connection to the room.';
      this.onClosed('disconnected');
      this.onChange();
    });
  }

  get room() {
    return this.session.room;
  }

  get isHost() {
    return this.session.isHost;
  }

  get you() {
    return this.session.id;
  }

  get active() {
    return Boolean(this.session.room);
  }

  state() {
    return { room: this.room, members: [...this.members.values()], host: this.session.host, you: this.you, isHost: this.isHost, mountain: this.mountain, mode: this.mode, error: this.error, busy: this.busy };
  }

  reset() {
    this.members.clear();
    this.remote.clear();
    this.slots = null;
  }

  async create() {
    this.busy = true;
    this.error = '';
    this.onChange();
    try {
      await this.session.create(this.name);
      this.members.set(this.you, { id: this.you, name: this.name, species: this.species, goggles: this.goggles, board: this.board });
    } catch (e) {
      this.error = friendly(e);
    }
    this.busy = false;
    this.onChange();
  }

  async join(code) {
    this.busy = true;
    this.error = '';
    this.onChange();
    try {
      const j = await this.session.join(String(code).toUpperCase().trim(), this.name);
      for (const p of j.peers ?? []) this.members.set(p.id, { id: p.id, name: cleanName(p.name), species: 'fox', goggles: 'classic', board: 'classic' });
      this.members.set(this.you, { id: this.you, name: this.name, species: this.species, goggles: this.goggles, board: this.board });
      this.session.sendTo(this.session.host, { t: MSG.hi, name: this.name, species: this.species, goggles: this.goggles, board: this.board });
    } catch (e) {
      this.error = friendly(e);
    }
    this.busy = false;
    this.onChange();
  }

  leave() {
    this.session.leave();
    this.reset();
    this.onChange();
  }

  close() {
    try {
      this.session.close();
    } catch {
      /* gone */
    }
  }

  /** Your nickname (already cleaned): used when you make or join a room. */
  setName(name) {
    this.name = name;
    const me = this.members.get(this.you);
    if (me) me.name = name;
  }

  setSpecies(sp) {
    this.species = sp;
    const me = this.members.get(this.you);
    if (me) me.species = sp;
    if (!this.active) return;
    if (this.isHost) this.sendLobby();
    else this.session.sendTo(this.session.host, { t: MSG.hi, name: this.name, species: sp, goggles: this.goggles, board: this.board });
  }

  /** Your goggles (any id; unknown ones become Classic). */
  setGoggles(id) {
    this.goggles = cleanGoggle(id);
    const me = this.members.get(this.you);
    if (me) me.goggles = this.goggles;
    if (!this.active) return;
    if (this.isHost) this.sendLobby();
    else this.session.sendTo(this.session.host, { t: MSG.hi, name: this.name, species: this.species, goggles: this.goggles, board: this.board });
  }

  /** Your board (cosmetic; unknown ids become Classic). */
  setBoard(id) {
    this.board = cleanBoard(id);
    const me = this.members.get(this.you);
    if (me) me.board = this.board;
    if (!this.active) return;
    if (this.isHost) this.sendLobby();
    else this.session.sendTo(this.session.host, { t: MSG.hi, name: this.name, species: this.species, goggles: this.goggles, board: this.board });
  }

  /** Host: the race length for everyone (Quick, Long trail, 3 Laps). */
  setMode(mode) {
    this.mode = cleanMode(mode);
    if (this.isHost) this.sendLobby();
    this.onChange();
  }

  setMountain(id) {
    this.mountain = id;
    if (this.isHost) this.sendLobby();
    this.onChange();
  }

  sendLobby() {
    this.session.send({ t: MSG.lobby, mountain: this.mountain, mode: this.mode, members: [...this.members.values()] });
  }

  /** Host: start the race for everyone; returns the slots. */
  start(total) {
    const members = [...this.members.values()].sort((a, b) => (a.id === this.you ? -1 : b.id === this.you ? 1 : Number(a.id) - Number(b.id)));
    const slots = assignSlots(members, Math.max(total, members.length), ALL_SPECIES);
    this.slots = slots;
    this.session.send({ t: MSG.go, mountain: this.mountain, mode: this.mode, slots });
    return slots;
  }

  /** My slot in the current race. */
  mySlot() {
    return this.slots?.find((s) => s.id === this.you)?.slot ?? 0;
  }

  receive(m) {
    switch (m.t) {
      case MSG.hi: {
        if (!this.isHost) return;
        const mem = cleanMember({ id: m.from, name: m.name, species: m.species, goggles: m.goggles, board: m.board }, ALL_SPECIES);
        this.members.set(m.from, { ...mem, name: cleanName(this.session.peers.get(m.from)?.name ?? mem.name) });
        this.sendLobby();
        this.onChange();
        return;
      }
      case MSG.lobby: {
        if (m.from !== this.session.host) return;
        this.mountain = String(m.mountain ?? 'marshmallow');
        this.mode = cleanMode(m.mode);
        this.members.clear();
        for (const x of m.members ?? []) this.members.set(String(x.id), cleanMember(x, ALL_SPECIES));
        const me = this.members.get(this.you);
        if (me) {
          me.species = this.species;
          me.goggles = this.goggles;
          me.board = this.board;
        }
        this.onChange();
        return;
      }
      case MSG.go: {
        if (m.from !== this.session.host) return;
        this.slots = (m.slots ?? []).map((s) => ({ slot: s.slot | 0, id: String(s.id), name: s.name == null ? null : cleanName(s.name), species: ALL_SPECIES.includes(s.species) ? s.species : 'fox', goggles: cleanGoggle(s.goggles), board: cleanBoard(s.board), human: Boolean(s.human), kind: s.kind ?? null }));
        this.mountain = String(m.mountain);
        this.mode = cleanMode(m.mode);
        this.remote.clear();
        this.onGo({ mountain: this.mountain, mode: this.mode, slots: this.slots });
        return;
      }
      case MSG.state: {
        const st = unpackState(m.k);
        if (st) this.buffer(st.slot).push(performance.now() / 1000, st);
        return;
      }
      case MSG.ai: {
        if (m.from !== this.session.host) return;
        const now = performance.now() / 1000;
        for (const k of m.k ?? []) {
          const st = unpackState(k);
          if (st) this.buffer(st.slot).push(now, st);
        }
        return;
      }
      case MSG.throw: {
        const p = unpackThrow(m.p);
        if (p) this.onMessage({ t: 'throw', p, from: m.from });
        return;
      }
      case MSG.hit:
        if (m.from !== this.session.host) return;
        this.onMessage({ t: 'hit', p: String(m.p), target: m.target | 0, ok: Boolean(m.ok), kind: m.kind === 'giant' ? 'giant' : 'snowball' });
        return;
      case MSG.item: {
        const it = m.it ?? {};
        // a gift box someone opened: gone for everyone on that lap
        if (it.k === 'gift') {
          const id = it.id | 0, lap = Math.max(1, Math.min(9, it.lap | 0));
          if (id > 0) this.onMessage({ t: 'item', it: { k: 'gift', id, lap, from: it.from | 0 } });
          return;
        }
        if (!['giant', 'ice', 'boost'].includes(it.k)) return;
        this.onMessage({ t: 'item', it: { k: it.k, id: String(it.id ?? ''), from: it.from | 0, s: +it.s || 0, lat: +it.lat || 0, v: +it.v || 18, vl: Math.max(-12, Math.min(12, +it.vl || 0)), until: +it.until || 0 } });
        return;
      }
      case MSG.fin:
        this.onMessage({ t: 'fin', slot: m.slot | 0, time: +m.time });
        return;
      case MSG.result:
        if (m.from !== this.session.host) return;
        this.onMessage({ t: 'result', order: (m.order ?? []).map((o) => ({ slot: o.slot | 0, time: +o.time })) });
        return;
      default:
    }
  }

  buffer(slot) {
    if (!this.remote.has(slot)) this.remote.set(slot, new InterpBuffer());
    return this.remote.get(slot);
  }

  /** Where a remote racer is now (interpolated), or null. */
  sample(slot) {
    return this.remote.get(slot)?.sample(performance.now() / 1000) ?? null;
  }

  /** Send my rider (and, as host, the AI riders) at SEND_HZ. */
  tick(dt, me, ais) {
    if (!this.active) return;
    this.sendT += dt;
    if (this.sendT < 1 / SEND_HZ) return;
    this.sendT = 0;
    this.session.send({ t: MSG.state, k: packState(me) });
    if (this.isHost && ais.length) this.session.send({ t: MSG.ai, k: ais.map(packState) });
  }

  sendThrow(p) {
    this.session.send({ t: MSG.throw, p: packThrow(p) });
  }

  sendHit(pid, target, ok, kind = 'snowball') {
    this.session.send({ t: MSG.hit, p: pid, target, ok, kind });
  }

  sendItem(it) {
    this.session.send({ t: MSG.item, it });
  }

  sendFinish(slot, time) {
    if (this.isHost) return;
    this.session.sendTo(this.session.host, { t: MSG.fin, slot, time });
  }

  sendResult(order) {
    this.session.send({ t: MSG.result, order });
  }
}

function friendly(e) {
  const m = String(e?.message ?? e);
  if (/reach|answer|closed|WebSocket/i.test(m)) return "Can't reach the race server right now — racing alone still works!";
  return m;
}
