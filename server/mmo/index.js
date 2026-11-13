import { WebSocketServer } from 'ws';
import { RateLimiter, json, pathOf, queryOf, readJson } from '../api/http.js';
import { Instance } from './instance.js';
import { CLASSES, ITEMS, VENDOR, QUESTS, RECIPES, SLOTS, PARTY_MAX } from '../../src/mmo/data.js';
import { ZONES, NPCS } from '../../src/mmo/world.js';
import { NAME_RE, newCharacter, normalize, questsAt, questDone, give, take, countOf, freeSlots, addXp, statsOf } from '../../src/mmo/rules.js';

/**
 * Hearthvale's server. Characters live in the database (`mmo_characters`,
 * one JSON document each); the worlds live here, in memory: a copy of a
 * zone for each party (or each player alone), run ten times a second
 * (instance.js). Parties of up to eight, chat, guilds and trades go across
 * copies; NPCs, shops, the bank and crafting check that you're standing
 * by them.
 *
 *   GET  /api/mmo/characters          your characters
 *   POST /api/mmo/characters          { name, cls } — a new one (up to six)
 *   POST /api/mmo/characters/delete   { id }
 *   WS   /mmo?char=<id>               play: signed in, your own character
 */

const MAX_CHARS = 6;
const SAVE_EVERY = 5000;
const STEP_MS = 100;
const clean = (text, max) => String(text ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

export function createMmo({ db, authenticate, log = () => {}, path = '/mmo', manual = false }) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024, perMessageDeflate: false });
  const instances = new Map();
  const online = new Map(); // charId → client
  const byName = new Map(); // name key → client
  const parties = new Map();
  const guilds = new Map(); // id → { id, name }
  const trades = new Map(); // charId → trade
  let nextParty = 1;
  const limits = { create: new RateLimiter(10, 60_000) };

  /* -------------------------------------------------------------- HTTP */

  async function handler(req, res) {
    const p = pathOf(req);
    if (!p.startsWith('/api/mmo/')) return false;
    const send = (status, body) => json(res, status, body);
    try {
      const account = await authenticate(req);
      if (!account) return send(401, { error: 'Sign in to play Hearthvale: your characters are kept on your account.' }), true;
      if (req.method === 'GET' && p === '/api/mmo/characters') {
        const rows = await db.many('SELECT id, name, cls, level, data FROM mmo_characters WHERE account_id = ? ORDER BY id', [account.id]);
        return send(200, { characters: rows.map((r) => ({ id: r.id, name: r.name, cls: r.cls, level: r.level, zone: r.data?.zone ?? 'hearthvale', online: online.has(r.id) })) }), true;
      }
      if (req.method === 'POST' && p === '/api/mmo/characters') {
        if (!limits.create.take(`a${account.id}`)) return send(429, { error: 'Slow down' }), true;
        const body = await readJson(req, 4096);
        const name = clean(body.name, 16).replace(/\s+/g, ' ');
        const cls = String(body.cls ?? '');
        if (!NAME_RE.test(name)) return send(400, { error: 'A name of 2–16 letters (spaces, hyphens and apostrophes allowed), starting with a letter.' }), true;
        if (!CLASSES[cls]) return send(400, { error: 'Pick a class' }), true;
        const created = await db.serial(async () => {
          const count = await db.one('SELECT COUNT(*)::int AS n FROM mmo_characters WHERE account_id = ?', [account.id]);
          if ((count?.n ?? 0) >= MAX_CHARS) return { error: `Up to ${MAX_CHARS} characters` };
          const taken = await db.one('SELECT id FROM mmo_characters WHERE name_key = ?', [name.toLowerCase()]);
          if (taken) return { error: 'That name is taken' };
          const ch = newCharacter(name, cls);
          const now = Date.now();
          return db.one('INSERT INTO mmo_characters (account_id, name, name_key, cls, level, data, created, updated) VALUES (?, ?, ?, ?, 1, ?, ?, ?) RETURNING id, name, cls, level', [account.id, name, name.toLowerCase(), cls, JSON.stringify(ch), now, now]);
        });
        if (created.error) return send(409, created), true;
        return send(200, { character: created }), true;
      }
      if (req.method === 'POST' && p === '/api/mmo/characters/delete') {
        const body = await readJson(req, 1024);
        const id = Number(body.id);
        if (online.has(id)) return send(409, { error: 'That character is playing right now' }), true;
        await db.serial(() => db.run('DELETE FROM mmo_characters WHERE id = ? AND account_id = ?', [id, account.id]));
        return send(200, { ok: true }), true;
      }
      return send(404, { error: 'unknown route' }), true;
    } catch (error) {
      if (/bad JSON/.test(error.message)) return send(400, { error: 'Bad JSON' }), true;
      log(`[mmo] ${error.stack ?? error.message}`);
      return send(500, { error: 'Something went wrong' }), true;
    }
  }

  /* ------------------------------------------------------------ sockets */

  function handleUpgrade(req, socket, head) {
    if (pathOf(req) !== path) return false;
    Promise.resolve()
      .then(() => authenticate(req))
      .catch(() => null)
      .then(async (account) => {
        const charId = Number(queryOf(req).get('char'));
        const row = account ? await db.one('SELECT id, account_id, name, data, guild_id FROM mmo_characters WHERE id = ?', [charId]).catch(() => null) : null;
        if (!account || account.blockedUntil > Date.now() || !row || Number(row.account_id) !== Number(account.id)) {
          socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
          return socket.destroy();
        }
        wss.handleUpgrade(req, socket, head, (ws) => connect(ws, account, row));
      });
    return true;
  }

  function connect(ws, account, row) {
    // Only one place at a time: a second login replaces the first.
    online.get(row.id)?.ws.close(4000, 'Signed in elsewhere');
    const ch = normalize(row.data);
    const client = {
      ws, account, charId: row.id, ch, party: null, guild: row.guild_id ? Number(row.guild_id) : null, body: null, instance: null,
      changed: true, savedAt: 0, chatAt: 0, budget: { at: Date.now(), n: 0 },
      send: (msg) => ws.readyState === 1 && ws.send(JSON.stringify(msg)),
      dirty: () => {
        client.changed = true;
      }
    };
    online.set(row.id, client);
    byName.set(ch.name.toLowerCase(), client);
    // A dungeon or raid isn't kept between visits: start outside it.
    if (ZONES[ch.zone]?.kind === 'dungeon' || ZONES[ch.zone]?.kind === 'raid') {
      const out = ZONES[ch.zone].portals[0];
      ch.zone = out.to;
      [ch.x, ch.z] = out.arrive;
    }
    if (!ZONES[ch.zone]) ch.zone = 'hearthvale';
    enter(client, ch.zone, null);
    ensureGuild(client.guild).then(() => {
      client.send({ t: 'guild', guild: guildInfo(client) });
      if (client.guild) toGuild(client.guild, { t: 'chat', ch: 'guild', from: 'Guild', text: `${ch.name} is online.` }, client);
    });
    ws.on('message', (data) => {
      const b = client.budget;
      const now = Date.now();
      if (now - b.at > 1000) Object.assign(b, { at: now, n: 0 });
      if (++b.n > 60) return;
      let msg;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }
      if (!msg || typeof msg.t !== 'string') return;
      try {
        onMessage(client, msg);
      } catch (error) {
        log(`[mmo] ${error.stack ?? error.message}`);
      }
    });
    ws.on('close', () => disconnect(client));
  }

  async function disconnect(client) {
    if (online.get(client.charId) !== client) return;
    online.delete(client.charId);
    byName.delete(client.ch.name.toLowerCase());
    cancelTrade(client, 'They left.');
    leaveParty(client, true);
    client.instance?.removePlayer(client.charId);
    if (client.guild) toGuild(client.guild, { t: 'chat', ch: 'guild', from: 'Guild', text: `${client.ch.name} went offline.` });
    await save(client);
  }

  async function save(client) {
    if (client.body && client.instance) client.instance._keep(client.body);
    client.savedAt = Date.now();
    const ch = client.ch;
    await db.serial(() => db.run('UPDATE mmo_characters SET data = ?, level = ?, guild_id = ?, updated = ? WHERE id = ?', [JSON.stringify(ch), ch.level, client.guild, Date.now(), client.charId])).catch((e) => log(`[mmo] save: ${e.message}`));
  }

  /* -------------------------------------------------------- the worlds */

  function groupKey(client) {
    return client.party ? `p${client.party}` : `c${client.charId}`;
  }

  /** Put a player into a zone: their party's copy of it (made if needed). */
  function enter(client, zone, at) {
    client.instance?.removePlayer(client.charId);
    const key = `${zone}:${groupKey(client)}`;
    let inst = instances.get(key);
    if (!inst) {
      inst = new Instance({ key, zone, onEmpty: (i) => instances.delete(i.key) });
      instances.set(key, inst);
    }
    const body = inst.addPlayer(client, at);
    client.changed = true;
    client.send({ t: 'hello', you: body.id, zone, zoneName: ZONES[zone].name, ch: client.ch, party: partyInfo(client) });
  }

  /** One step of every world, then everyone's snapshot and private news. */
  function tick() {
    for (const inst of instances.values()) {
      inst.step();
      if (!inst.players.size) {
        inst.out = [];
        continue;
      }
      const snap = { t: 'snap', s: inst.snapshot(), ev: inst.out };
      inst.out = [];
      const text = JSON.stringify(snap);
      for (const p of inst.players.values()) if (p.client.ws.readyState === 1) p.client.ws.send(text);
    }
    const now = Date.now();
    for (const client of online.values()) {
      if (client.changed) {
        client.changed = false;
        client.send({ t: 'me', ch: client.ch, st: statsOf(client.ch) });
        if (client.party) broadcastParty(client.party);
      }
      if (now - client.savedAt > SAVE_EVERY) save(client);
    }
  }
  const loop = manual ? null : setInterval(tick, STEP_MS);
  loop?.unref?.();

  /* ---------------------------------------------------------- messages */

  function onMessage(client, msg) {
    const p = client.body;
    const inst = client.instance;
    if (!p || !inst) return;
    const ch = client.ch;
    const err = (text) => client.send({ t: 'error', text });
    switch (msg.t) {
      case 'move': case 'target': case 'attack': case 'skill': case 'stop': case 'gather': case 'use': case 'release':
        return inst.handle(p, msg);
      case 'talk': {
        const npc = NPCS[msg.npc];
        if (!npc || !inst.near(p, 'npc', msg.npc)) return err('Too far away');
        return client.send({ t: 'npc', npc: msg.npc, ...questsAt(ch, msg.npc), vendor: npc.vendor ? VENDOR : null, bank: Boolean(npc.bank), guild: Boolean(npc.guild) });
      }
      case 'quest-accept': {
        const q = QUESTS[msg.id];
        if (!q || !inst.near(p, 'npc', q.from) || !questsAt(ch, q.from).offer.includes(msg.id)) return err('You can\'t take that quest');
        if (Object.keys(ch.quests.active).length >= 12) return err('Your quest log is full');
        ch.quests.active[msg.id] = 0;
        client.dirty();
        return client.send({ t: 'ev', ev: [{ type: 'text', text: `Quest accepted: ${q.name}` }] });
      }
      case 'quest-turnin': {
        const q = QUESTS[msg.id];
        if (!q || !inst.near(p, 'npc', q.to) || !questDone(ch, msg.id)) return err('Not done yet');
        if (q.reward.item && !freeSlots(ch) && !countOf(ch, q.reward.item)) return err('Make room in your bag first');
        if (q.goal.gather) take(ch, q.goal.gather, q.goal.count);
        delete ch.quests.active[msg.id];
        ch.quests.done.push(msg.id);
        ch.gold += q.reward.gold ?? 0;
        if (q.reward.item) give(ch, q.reward.item, 1);
        if (q.reward.skill) ch.skills[q.reward.skill[0]] = Math.min(100, (ch.skills[q.reward.skill[0]] ?? 1) + q.reward.skill[1]);
        const up = addXp(ch, q.reward.xp);
        if (up) {
          inst.refresh(p);
          p.hp = p.st.maxHp;
          p.mana = p.st.maxMana;
          inst.out.push({ type: 'level', id: p.id, level: ch.level });
        }
        client.dirty();
        return client.send({ t: 'ev', ev: [{ type: 'quest-done', id: msg.id, xp: q.reward.xp, gold: q.reward.gold ?? 0, item: q.reward.item ?? null }] });
      }
      case 'quest-abandon':
        if (ch.quests.active[msg.id] == null) return;
        delete ch.quests.active[msg.id];
        return client.dirty();
      case 'buy': {
        const item = String(msg.item);
        const n = Math.max(1, Math.min(20, msg.n | 0 || 1));
        if (!VENDOR.includes(item) || !inst.near(p, 'npc', 'pell')) return err('Nobody sells that here');
        const price = ITEMS[item].value * 4 * n;
        if (ch.gold < price) return err('Not enough gold');
        const got = give(ch, item, n);
        if (!got) return err('Your bag is full');
        ch.gold -= ITEMS[item].value * 4 * got;
        return client.dirty();
      }
      case 'sell': {
        const s = ch.bag[msg.slot | 0];
        if (!s || !inst.near(p, 'npc', 'pell')) return err('Find a vendor to sell to');
        ch.gold += (ITEMS[s.item].value ?? 0) * s.n;
        ch.bag[msg.slot | 0] = null;
        return client.dirty();
      }
      case 'bank-put': case 'bank-take': {
        if (!inst.near(p, 'npc', 'tamsin')) return err('The bank is in Hearthvale');
        const from = msg.t === 'bank-put' ? 'bag' : 'bank';
        const to = msg.t === 'bank-put' ? 'bank' : 'bag';
        const s = ch[from][msg.slot | 0];
        if (!s) return;
        const moved = give(ch, s.item, s.n, to);
        if (!moved) return err(to === 'bank' ? 'The bank is full' : 'Your bag is full');
        s.n -= moved;
        if (!s.n) ch[from][msg.slot | 0] = null;
        return client.dirty();
      }
      case 'equip': {
        const s = ch.bag[msg.slot | 0];
        const it = s && ITEMS[s.item];
        if (!it?.slot) return err('That isn\'t something to wear');
        if ((it.level ?? 1) > ch.level) return err(`Needs level ${it.level}`);
        const old = ch.equip[it.slot];
        ch.equip[it.slot] = s.item;
        ch.bag[msg.slot | 0] = old ? { item: old, n: 1 } : null;
        inst.refresh(p);
        return client.dirty();
      }
      case 'unequip': {
        const slot = String(msg.slot);
        if (!SLOTS.includes(slot) || !ch.equip[slot]) return;
        if (!give(ch, ch.equip[slot], 1)) return err('Your bag is full');
        delete ch.equip[slot];
        inst.refresh(p);
        return client.dirty();
      }
      case 'destroy':
        if (ch.bag[msg.slot | 0]) {
          ch.bag[msg.slot | 0] = null;
          client.dirty();
        }
        return;
      case 'craft': {
        const r = RECIPES[msg.recipe];
        if (!r) return;
        if (!inst.near(p, 'station', r.station)) return err(`Use the ${r.station} in Hearthvale`);
        if ((ch.skills[r.skill] ?? 1) < r.need) return err(`Needs ${r.skill} ${r.need}`);
        if (!r.uses.every(([item, n]) => countOf(ch, item) >= n)) return err('Missing materials');
        if (!freeSlots(ch) && !countOf(ch, r.makes[0])) return err('Your bag is full');
        for (const [item, n] of r.uses) take(ch, item, n);
        give(ch, r.makes[0], r.makes[1]);
        const skill = ch.skills[r.skill] ?? 1;
        let up = false;
        if (skill < 100 && skill < r.need + 40 && Math.random() < Math.max(0.2, 1 - (skill - r.need) / 40)) {
          ch.skills[r.skill] = skill + 1;
          up = true;
        }
        client.dirty();
        return client.send({ t: 'ev', ev: [{ type: 'crafted', item: r.makes[0], n: r.makes[1], skill: r.skill, level: ch.skills[r.skill], up }] });
      }
      case 'portal': {
        const portal = inst.near(p, 'portal', String(msg.id));
        if (!portal) return err('Walk to the portal first');
        if (portal.level && ch.level < portal.level) return err(`You need to be level ${portal.level}`);
        const party = client.party ? parties.get(client.party) : null;
        if (portal.party && party && party.members.size > portal.party) return err(`At most ${portal.party} in a party there`);
        if (p.dead) return err('You are dead');
        return enter(client, portal.to, portal.arrive);
      }
      case 'chat':
        return chat(client, msg);
      case 'party-invite':
        return partyInvite(client, String(msg.name ?? ''));
      case 'party-accept':
        return partyAccept(client, Number(msg.party));
      case 'party-leave':
        return leaveParty(client, false);
      case 'party-join': {
        // Go to the party leader's copy of their zone.
        const party = parties.get(client.party);
        const leader = party && online.get(party.leader);
        if (!leader || leader === client || !leader.body) return err('Nobody to join');
        const z = leader.instance.zone;
        const def = ZONES[z];
        if (def.kind !== 'town' && def.kind !== 'open' && party.members.size > (def.party ?? 8)) return err('The party is too big for that place');
        return enter(client, z, [leader.body.x + 1.5, leader.body.z + 1.5]);
      }
      case 'guild-create':
        return guildCreate(client, msg);
      case 'guild-invite':
        return guildInvite(client, String(msg.name ?? ''));
      case 'guild-accept':
        return guildAccept(client, Number(msg.guild));
      case 'guild-leave':
        return guildLeave(client);
      case 'guild-roster':
        return guildRoster(client);
      case 'trade-ask':
        return tradeAsk(client, msg);
      case 'trade-accept':
        return tradeAccept(client, Number(msg.from));
      case 'trade-offer':
        return tradeOffer(client, msg);
      case 'trade-lock':
        return tradeLock(client);
      case 'trade-cancel':
        return cancelTrade(client, 'Trade cancelled.');
      default:
        return undefined;
    }
  }

  /* -------------------------------------------------------------- chat */

  function chat(client, msg) {
    const now = Date.now();
    if (now - client.chatAt < 700) return client.send({ t: 'error', text: 'Slow down' });
    client.chatAt = now;
    const text = clean(msg.text, 200);
    if (!text) return;
    const from = client.ch.name;
    const line = { t: 'chat', ch: msg.ch, from, text };
    switch (msg.ch) {
      case 'say':
        for (const p of client.instance.players.values()) if (Math.hypot(p.x - client.body.x, p.z - client.body.z) < 40) p.client.send(line);
        return;
      case 'party': {
        const party = parties.get(client.party);
        if (!party) return client.send({ t: 'error', text: 'You are not in a party' });
        for (const id of party.members) online.get(id)?.send(line);
        return;
      }
      case 'guild':
        if (!client.guild) return client.send({ t: 'error', text: 'You are not in a guild' });
        return toGuild(client.guild, line);
      case 'world':
        for (const c of online.values()) c.send(line);
        return;
      case 'whisper': {
        const to = byName.get(clean(msg.to, 16).toLowerCase());
        if (!to) return client.send({ t: 'error', text: 'Nobody by that name is online' });
        to.send({ ...line, to: to.ch.name });
        if (to !== client) client.send({ ...line, to: to.ch.name });
        return;
      }
      default:
        return undefined;
    }
  }

  /* ----------------------------------------------------------- parties */

  function partyInfo(client) {
    const party = parties.get(client.party);
    if (!party) return null;
    return {
      id: party.id,
      leader: online.get(party.leader)?.ch.name ?? null,
      members: [...party.members].map((id) => {
        const c = online.get(id);
        return c ? { name: c.ch.name, cls: c.ch.cls, level: c.ch.level, hp: Math.round(c.body?.hp ?? 0), mh: c.body?.st.maxHp ?? 1, zone: ZONES[c.instance?.zone]?.name ?? '', here: c.instance === client.instance, id: c.body?.id ?? null } : null;
      }).filter(Boolean)
    };
  }

  function broadcastParty(id) {
    const party = parties.get(id);
    if (!party) return;
    for (const m of party.members) {
      const c = online.get(m);
      c?.send({ t: 'party', party: partyInfo(c) });
    }
  }

  function partyInvite(client, name) {
    const to = byName.get(name.toLowerCase());
    if (!to || to === client) return client.send({ t: 'error', text: 'Nobody by that name is online' });
    if (to.party) return client.send({ t: 'error', text: `${to.ch.name} is already in a party` });
    let party = parties.get(client.party);
    if (!party) {
      party = { id: nextParty++, leader: client.charId, members: new Set([client.charId]) };
      parties.set(party.id, party);
      // Bring the leader's copy along: same place, now the party's.
      client.party = party.id;
      enter(client, client.instance.zone, [client.body.x, client.body.z]);
    }
    if (party.leader !== client.charId) return client.send({ t: 'error', text: 'Only the leader invites' });
    if (party.members.size >= PARTY_MAX) return client.send({ t: 'error', text: `A party is at most ${PARTY_MAX}` });
    party.invited = party.invited ?? new Set();
    party.invited.add(to.charId);
    to.send({ t: 'invite', kind: 'party', from: client.ch.name, party: party.id });
    client.send({ t: 'ev', ev: [{ type: 'text', text: `Invited ${to.ch.name} to your party.` }] });
    broadcastParty(party.id);
  }

  function partyAccept(client, id) {
    const party = parties.get(id);
    if (!party?.invited?.has(client.charId) || client.party) return;
    party.invited.delete(client.charId);
    if (party.members.size >= PARTY_MAX) return client.send({ t: 'error', text: 'The party is full' });
    party.members.add(client.charId);
    client.party = party.id;
    // Same zone as the leader: join their copy now; elsewhere, the party's copy of where you are.
    const leader = online.get(party.leader);
    if (leader?.instance?.zone === client.instance.zone) enter(client, client.instance.zone, [leader.body.x + 1.5, leader.body.z + 1.5]);
    else enter(client, client.instance.zone, [client.body.x, client.body.z]);
    broadcastParty(party.id);
  }

  function leaveParty(client, quitting) {
    const party = parties.get(client.party);
    if (!party) return;
    party.members.delete(client.charId);
    client.party = null;
    if (!quitting && client.body) enter(client, client.instance.zone, [client.body.x, client.body.z]);
    if (!quitting) client.send({ t: 'party', party: null });
    if (party.leader === client.charId) party.leader = [...party.members][0];
    if (party.members.size <= 1) {
      // A party of one is no party.
      const last = online.get([...party.members][0]);
      parties.delete(party.id);
      if (last) {
        last.party = null;
        last.send({ t: 'party', party: null });
      }
      return;
    }
    broadcastParty(party.id);
  }

  /* ------------------------------------------------------------ guilds */

  async function ensureGuild(id) {
    if (!id || guilds.has(id)) return;
    const row = await db.one('SELECT id, name, leader_id FROM mmo_guilds WHERE id = ?', [id]).catch(() => null);
    if (row) guilds.set(Number(row.id), { id: Number(row.id), name: row.name, leader: Number(row.leader_id) });
  }

  function guildInfo(client) {
    const g = guilds.get(client.guild);
    return g ? { id: g.id, name: g.name, leader: g.leader === client.charId } : null;
  }

  function toGuild(id, msg, except = null) {
    for (const c of online.values()) if (c.guild === id && c !== except) c.send(msg);
  }

  async function guildCreate(client, msg) {
    if (!client.instance.near(client.body, 'npc', 'fenwick')) return client.send({ t: 'error', text: 'Fenwick in Hearthvale registers guilds' });
    if (client.guild) return client.send({ t: 'error', text: 'Leave your guild first' });
    const name = clean(msg.name, 24);
    if (!/^[A-Za-z][A-Za-z0-9' -]{2,23}$/.test(name)) return client.send({ t: 'error', text: 'A guild name of 3–24 letters and numbers' });
    if (client.ch.gold < 10) return client.send({ t: 'error', text: 'A charter costs 10 gold' });
    const row = await db.serial(async () => {
      if (await db.one('SELECT id FROM mmo_guilds WHERE name_key = ?', [name.toLowerCase()])) return null;
      return db.one('INSERT INTO mmo_guilds (name, name_key, leader_id, created) VALUES (?, ?, ?, ?) RETURNING id', [name, name.toLowerCase(), client.charId, Date.now()]);
    });
    if (!row) return client.send({ t: 'error', text: 'That guild name is taken' });
    client.ch.gold -= 10;
    client.guild = Number(row.id);
    guilds.set(client.guild, { id: client.guild, name, leader: client.charId });
    client.dirty();
    await save(client);
    client.send({ t: 'guild', guild: guildInfo(client) });
  }

  function guildInvite(client, name) {
    if (!client.guild) return client.send({ t: 'error', text: 'You are not in a guild' });
    const to = byName.get(name.toLowerCase());
    if (!to || to === client) return client.send({ t: 'error', text: 'Nobody by that name is online' });
    if (to.guild) return client.send({ t: 'error', text: `${to.ch.name} is already in a guild` });
    to.guildInvite = client.guild;
    to.send({ t: 'invite', kind: 'guild', from: client.ch.name, guild: client.guild, name: guilds.get(client.guild)?.name });
  }

  async function guildAccept(client, id) {
    if (client.guildInvite !== id || client.guild) return;
    client.guild = id;
    client.guildInvite = null;
    await ensureGuild(id);
    await save(client);
    client.send({ t: 'guild', guild: guildInfo(client) });
    toGuild(id, { t: 'chat', ch: 'guild', from: 'Guild', text: `${client.ch.name} joined the guild.` });
  }

  async function guildLeave(client) {
    const id = client.guild;
    if (!id) return;
    client.guild = null;
    await save(client);
    client.send({ t: 'guild', guild: null });
    toGuild(id, { t: 'chat', ch: 'guild', from: 'Guild', text: `${client.ch.name} left the guild.` });
    const g = guilds.get(id);
    if (g?.leader === client.charId) {
      const next = await db.one('SELECT id FROM mmo_characters WHERE guild_id = ? ORDER BY level DESC LIMIT 1', [id]);
      if (next) {
        g.leader = Number(next.id);
        await db.serial(() => db.run('UPDATE mmo_guilds SET leader_id = ? WHERE id = ?', [g.leader, id]));
      }
    }
  }

  async function guildRoster(client) {
    if (!client.guild) return client.send({ t: 'roster', roster: [] });
    const rows = await db.many('SELECT id, name, cls, level FROM mmo_characters WHERE guild_id = ? ORDER BY level DESC, name LIMIT 200', [client.guild]);
    client.send({ t: 'roster', roster: rows.map((r) => ({ name: r.name, cls: r.cls, level: r.level, online: online.has(Number(r.id)), leader: guilds.get(client.guild)?.leader === Number(r.id) })) });
  }

  /* ------------------------------------------------------------ trading */

  function tradeAsk(client, msg) {
    const other = msg.name ? byName.get(String(msg.name).toLowerCase()) : [...online.values()].find((c) => c.body?.id === Number(msg.id) && c.instance === client.instance);
    if (!other || other === client || other.instance !== client.instance) return client.send({ t: 'error', text: 'Trade with someone beside you' });
    if (Math.hypot(other.body.x - client.body.x, other.body.z - client.body.z) > 10) return client.send({ t: 'error', text: 'Too far away to trade' });
    if (trades.has(client.charId) || trades.has(other.charId)) return client.send({ t: 'error', text: 'Already trading' });
    other.tradeAsk = client.charId;
    other.send({ t: 'invite', kind: 'trade', from: client.ch.name, fromId: client.charId });
  }

  function tradeAccept(client, fromId) {
    const other = online.get(fromId);
    if (client.tradeAsk !== fromId || !other || other.instance !== client.instance || trades.has(fromId) || trades.has(client.charId)) return;
    client.tradeAsk = null;
    const trade = { a: other.charId, b: client.charId, offer: { [other.charId]: { slots: [], gold: 0 }, [client.charId]: { slots: [], gold: 0 } }, locked: new Set() };
    trades.set(other.charId, trade);
    trades.set(client.charId, trade);
    tradeSend(trade);
  }

  function tradeView(trade, id) {
    const other = id === trade.a ? trade.b : trade.a;
    const side = (cid) => {
      const c = online.get(cid);
      const o = trade.offer[cid];
      return { name: c?.ch.name ?? '?', gold: o.gold, items: o.slots.map((s) => ({ slot: s, ...(c?.ch.bag[s] ?? {}) })), locked: trade.locked.has(cid) };
    };
    return { open: true, me: side(id), them: side(other) };
  }

  function tradeSend(trade) {
    for (const id of [trade.a, trade.b]) online.get(id)?.send({ t: 'trade', trade: tradeView(trade, id) });
  }

  function tradeOffer(client, msg) {
    const trade = trades.get(client.charId);
    if (!trade) return;
    const slots = [...new Set((Array.isArray(msg.slots) ? msg.slots : []).map((s) => s | 0))].filter((s) => s >= 0 && s < client.ch.bag.length && client.ch.bag[s]).slice(0, 6);
    const gold = Math.max(0, Math.min(client.ch.gold, Math.floor(Number(msg.gold) || 0)));
    trade.offer[client.charId] = { slots, gold };
    trade.locked.clear(); // any change unlocks both
    tradeSend(trade);
  }

  function tradeLock(client) {
    const trade = trades.get(client.charId);
    if (!trade) return;
    trade.locked.add(client.charId);
    if (trade.locked.size < 2) return tradeSend(trade);
    // Both agreed: check everything again, then swap in one go.
    const A = online.get(trade.a);
    const B = online.get(trade.b);
    if (!A || !B) return cancelTrade(client, 'The trade fell through.');
    const goods = (c) => trade.offer[c.charId].slots.map((s) => c.ch.bag[s]).filter(Boolean).map((s) => ({ ...s }));
    const ga = goods(A);
    const gb = goods(B);
    const oa = trade.offer[A.charId];
    const ob = trade.offer[B.charId];
    if (ga.length !== oa.slots.length || gb.length !== ob.slots.length || A.ch.gold < oa.gold || B.ch.gold < ob.gold) return cancelTrade(client, 'Something changed — the trade was cancelled.');
    if (freeSlots(A.ch) + oa.slots.length < gb.length || freeSlots(B.ch) + ob.slots.length < ga.length) return cancelTrade(client, 'Not enough room in a bag.');
    for (const s of oa.slots) A.ch.bag[s] = null;
    for (const s of ob.slots) B.ch.bag[s] = null;
    for (const s of gb) give(A.ch, s.item, s.n);
    for (const s of ga) give(B.ch, s.item, s.n);
    A.ch.gold += ob.gold - oa.gold;
    B.ch.gold += oa.gold - ob.gold;
    trades.delete(A.charId);
    trades.delete(B.charId);
    for (const c of [A, B]) {
      c.dirty();
      save(c);
      c.send({ t: 'trade', trade: null, done: true });
    }
  }

  function cancelTrade(client, text) {
    const trade = trades.get(client.charId);
    if (!trade) return;
    trades.delete(trade.a);
    trades.delete(trade.b);
    for (const id of [trade.a, trade.b]) online.get(id)?.send({ t: 'trade', trade: null, text });
  }

  return {
    handler,
    handleUpgrade,
    /** For tests and the admin: what's running. */
    stats: () => ({ online: online.size, instances: instances.size, parties: parties.size }),
    /** Tests: run the worlds by hand (with `manual: true`), and connect without a real socket. */
    step: tick,
    connect,
    online,
    close() {
      if (loop) clearInterval(loop);
      for (const c of online.values()) c.ws.close(1001, 'Server going down');
      return Promise.all([...online.values()].map((c) => save(c)));
    }
  };
}
