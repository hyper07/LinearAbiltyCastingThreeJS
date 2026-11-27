/**
 * The Studio's HTTP routes end to end (server/studio/index.js) on a throwaway git repository
 * and an in-memory PostgreSQL, with no LM model (the offline planner answers): make a game,
 * chat a map into it, undo, add a free asset, ownership, same-origin, plan limits, the parent
 * gate, a class playing the shared version, and "coming soon" generation.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStudio } from '../../server/studio/index.js';
import { testDatabase } from './db.mjs';

async function server() {
  const dir = mkdtempSync(join(tmpdir(), 'studio-http-'));
  spawnSync('git', ['init', '-q'], { cwd: dir });
  const db = await testDatabase();
  const accounts = new Map();
  for (const [name, plan] of [['Teacher', 'free'], ['Kid', 'free'], ['Stranger', 'free']]) {
    const row = await db.one('INSERT INTO accounts (name, name_key, pass_hash, created, plan) VALUES (?, ?, ?, ?, ?) RETURNING id', [name, name.toLowerCase(), 'x', Date.now(), plan]);
    accounts.set(name, { id: row.id, name, plan });
  }
  const pins = new Set([accounts.get('Kid').id]);
  const studio = createStudio({
    getDb: async () => db,
    repo: dir,
    gamesDir: join(dir, 'games'),
    libraryRoot: join(dir, 'no-library'),
    publicDir: join(process.cwd(), 'public'),
    env: {},
    model: { available: false },
    // x-test-account stands in for the session cookie; the plan is read fresh from the database.
    authenticate: async (req) => {
      const a = accounts.get(String(req.headers['x-test-account'] ?? ''));
      if (!a) return null;
      const row = await db.one('SELECT plan FROM accounts WHERE id = ?', [a.id]);
      return { ...a, plan: row.plan };
    },
    parentGate: {
      hasPin: async (a) => pins.has(a.id),
      check: (a, key) => {
        if (key !== 'good-parent-key') throw new Error('Type the parent PIN first');
      }
    }
  });
  const srv = http.createServer((req, res) => studio.handler(req, res).then((done) => done || (res.writeHead(404), res.end())));
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}/api/studio`;
  const call = async (method, path, { as = null, body = undefined, headers = {} } = {}) => {
    const r = await fetch(`${base}${path}`, {
      method,
      headers: { ...(as ? { 'x-test-account': as } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };
  return {
    call,
    accounts,
    close: async () => {
      await new Promise((r) => srv.close(r));
      await db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  };
}

test('the Studio over HTTP: make, chat, undo, assets, ownership, limits, guardians, classes', async () => {
  const s = await server();
  const { call } = s;
  try {
    const meta = await call('GET', '/meta');
    assert.equal(meta.status, 200);
    assert.equal(meta.body.lm, false);
    assert.equal(meta.body.payments.mode, 'test');
    assert.equal(meta.body.renders.length, 4);
    assert.equal(meta.body.git, true);

    // Signed out: no games.
    assert.equal((await call('POST', '/games', { body: { title: 'X' } })).status, 401);

    // Make a game.
    const made = await call('POST', '/games', { as: 'Teacher', body: { title: 'Volcano Lab', render: 'hd2d', animation: 'pixel', look: 'stylized', genre: 'collect' } });
    assert.equal(made.status, 200, JSON.stringify(made.body));
    const code = made.body.game.code;
    assert.match(code, /^g_[a-z2-7]{10}$/);
    assert.equal(made.body.data.style.render, 'hd2d');
    assert.equal(made.body.game.visibility, 'private');

    // Chat a map in (the offline planner, no model).
    const chat = await call('POST', `/games/${code}/chat`, { as: 'Teacher', body: { message: 'add a snowy forest map with a frozen lake' } });
    assert.equal(chat.status, 200, JSON.stringify(chat.body));
    assert.equal(chat.body.source, 'keywords');
    assert.match(chat.body.commit, /^[0-9a-f]{40}$/);
    assert.equal(chat.body.data.maps.maps.length, 2);
    assert.ok(chat.body.changes.some((c) => /Snowy Forest/.test(c)));

    // Not understood: nothing written, the chat edit is given back.
    const noop = await call('POST', `/games/${code}/chat`, { as: 'Teacher', body: { message: 'banana telephone' } });
    assert.equal(noop.body.commit, null);

    // Someone else's game does not exist for them.
    assert.equal((await call('GET', `/games/${code}`, { as: 'Stranger' })).status, 404);
    assert.equal((await call('POST', `/games/${code}/chat`, { as: 'Stranger', body: { message: 'add a desert map' } })).status, 404);

    // Undo.
    const undo = await call('POST', `/games/${code}/undo`, { as: 'Teacher', body: { commit: chat.body.commit } });
    assert.equal(undo.status, 200, JSON.stringify(undo.body));
    assert.equal(undo.body.data.maps.maps.length, 1);

    // A free asset; something that is not one.
    const sfx = await call('POST', `/games/${code}/use-asset`, { as: 'Teacher', body: { asset: 'sfx:zap', event: 'attack' } });
    assert.equal(sfx.status, 200, JSON.stringify(sfx.body));
    assert.equal(sfx.body.data.audio.sfx.attack, 'zap');
    const preset = await call('POST', `/games/${code}/use-asset`, { as: 'Teacher', body: { asset: 'own:character/pixel-knight', role: 'npc' } });
    assert.equal(preset.status, 200, JSON.stringify(preset.body));
    assert.ok(preset.body.data.cast.characters.some((c) => c.name === 'Pixel Knight'));
    assert.equal((await call('POST', `/games/${code}/use-asset`, { as: 'Teacher', body: { asset: 'lib:model/../../../etc/passwd' } })).status, 403);
    assert.equal((await call('POST', `/games/${code}/use-asset`, { as: 'Teacher', body: { asset: 'mkt:mkt_notmine1' } })).status, 403);

    // Same-origin JSON only.
    assert.equal((await call('POST', `/games/${code}/chat`, { as: 'Teacher', body: { message: 'x' }, headers: { Origin: 'https://evil.example' } })).status, 403);

    // Public: one on Free, unlimited private.
    const second = await call('POST', '/games', { as: 'Teacher', body: { title: 'Second', genre: 'quest' } });
    assert.equal((await call('POST', `/games/${code}/visibility`, { as: 'Teacher', body: { visibility: 'public' } })).status, 200);
    const tooMany = await call('POST', `/games/${second.body.game.code}/visibility`, { as: 'Teacher', body: { visibility: 'public' } });
    assert.equal(tooMany.status, 403);
    assert.equal(tooMany.body.upgrade, true);
    await call('POST', `/games/${code}/visibility`, { as: 'Teacher', body: { visibility: 'private' } });

    // A paid plan on an account with a family PIN asks for a grown-up.
    const gated = await call('POST', '/plan/upgrade', { as: 'Kid', body: { plan: 'plus' } });
    assert.equal(gated.status, 403);
    assert.equal(gated.body.parentGate, true);
    const ok = await call('POST', '/plan/upgrade', { as: 'Kid', body: { plan: 'plus' }, headers: { 'x-parent-key': 'good-parent-key' } });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.plan, 'plus');
    assert.equal(ok.body.test, true);

    // A class plays the version the teacher shared; nobody else does.
    const cls = await call('POST', '/classes', { as: 'Teacher', body: { name: 'Earth Science', approval: 'open' } });
    assert.equal(cls.status, 200, JSON.stringify(cls.body));
    const joined = await call('POST', '/classes/join', { as: 'Kid', body: { code: cls.body.class.joinCode }, headers: { 'x-parent-key': 'good-parent-key' } });
    assert.equal(joined.body.joined.membership, 'active');
    const assigned = await call('POST', `/classes/${cls.body.class.id}/games`, { as: 'Teacher', body: { code, version: 'current' } });
    assert.equal(assigned.status, 200, JSON.stringify(assigned.body));
    const play = await call('GET', `/play/${code}?class=${cls.body.class.id}`, { as: 'Kid' });
    assert.equal(play.status, 200, JSON.stringify(play.body));
    assert.equal(play.body.draft, false);
    assert.equal(play.body.data.audio.sfx.attack, 'zap');
    assert.equal((await call('GET', `/play/${code}?class=${cls.body.class.id}`, { as: 'Stranger' })).status, 404);
    const studentView = await call('GET', `/classes/${cls.body.class.id}`, { as: 'Kid' });
    assert.equal(studentView.body.class.members, undefined);
    assert.equal(studentView.body.class.games[0].title, 'Volcano Lab');

    // Brute force: wrong codes lock joining for a while.
    let locked = false;
    for (let i = 0; i < 14 && !locked; i++) {
      const r = await call('POST', '/classes/join', { as: 'Stranger', body: { code: `ZZZZZ-ZZZ${'23456789ABCDEF'[i]}Z` } });
      locked = r.status === 429;
    }
    assert.equal(locked, true);

    // Heavy generation: coming soon on a server with no generation worker.
    const job = await call('POST', '/jobs', { as: 'Teacher', body: { kind: 'voice', prompt: 'a happy owl' } });
    assert.equal(job.status, 503);
    assert.equal(job.body.comingSoon, true);

    // Admin routes need the admin (none configured, not local-dev here).
    assert.equal((await call('GET', '/admin/queue', { as: 'Teacher' })).status, 401);
  } finally {
    await s.close();
  }
});
