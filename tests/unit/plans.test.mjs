import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { aiBridge } from '../../server/api/ai.js';
import { createGameServices } from '../../server/game/index.js';
import { PLANS } from '../../src/platform/plans.js';

/** A stand-in for an OpenAI-compatible model box: records what it was asked. */
async function fakeModel(label) {
  const calls = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      if (req.url.endsWith('/models')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ data: [{ id: label }] }));
      }
      const payload = JSON.parse(body || '{}');
      calls.push({ ...payload, auth: req.headers.authorization ?? null });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: '{}' } }] }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}/v1`, calls, close: () => new Promise((r) => server.close(r)) };
}

/** The bridge on its own port, with `who(req)` deciding the caller. */
async function bridge(env, who) {
  const handler = aiBridge(env, { identify: async (req) => who(req) });
  const server = http.createServer((req, res) => handler(req, res).then((done) => done || (res.writeHead(404), res.end())));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const ask = (body, headers = {}) =>
    fetch(`${base}/api/ai/command`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, body: await r.json() }));
  const status = (headers = {}) => fetch(`${base}/api/ai/status`, { headers }).then((r) => r.json());
  return { ask, status, close: () => new Promise((r) => server.close(r)) };
}

test('the server picks the model by plan; the page cannot choose one', async () => {
  const local = await fakeModel('small');
  const hosted = await fakeModel('big');
  const env = { LLM_PLATFORM_BASE_URL: local.url, LLM_API_KEY: 'local-key', LLM_MODEL1: 'small-4b', LLM_PREMIUM_BASE_URL: hosted.url, LLM_PREMIUM_API_KEY: 'hosted-key', LLM_PREMIUM_MODEL: 'big-model' };
  // x-plan stands in for the signed-in account.
  const b = await bridge(env, (req) => (req.headers['x-plan'] ? { id: req.headers['x-plan'], plan: req.headers['x-plan'] } : null));
  try {
    await b.ask({ task: 'game', model: 'big-model', maxTokens: 9999, messages: [] });
    assert.equal(local.calls.at(-1).model, 'small-4b', 'free: the standard model, whatever the page asked for');
    assert.equal(local.calls.at(-1).max_tokens, PLANS.free.maxTokens.game, 'capped to the plan');
    assert.equal(local.calls.at(-1).auth, 'Bearer local-key');

    await b.ask({ task: 'game', messages: [] }, { 'x-plan': 'plus' });
    assert.equal(hosted.calls.at(-1).model, 'big-model', 'plus: the premium model for creations');
    assert.equal(hosted.calls.at(-1).auth, 'Bearer hosted-key', 'with the premium provider\'s own key');
    assert.equal(hosted.calls.at(-1).chat_template_kwargs, undefined, 'only standard fields to a hosted API');

    const before = hosted.calls.length;
    await b.ask({ task: 'command', messages: [] }, { 'x-plan': 'plus' });
    assert.equal(hosted.calls.length, before, 'the in-fight commander stays on the fast standard model');
    assert.equal(local.calls.at(-1).model, 'small-4b');

    const refused = await b.ask({ task: 'game-custom', messages: [] });
    assert.equal(refused.status, 403);
    assert.equal(refused.body.upgrade, true);
    const custom = await b.ask({ task: 'game-custom', maxTokens: 3000, messages: [] }, { 'x-plan': 'plus' });
    assert.equal(custom.status, 200);
    assert.equal(hosted.calls.at(-1).max_tokens, 3000);

    const free = await b.status();
    assert.equal(free.plan.id, 'free');
    assert.equal(free.plan.features.customBuild, false);
    const plus = await b.status({ 'x-plan': 'plus' });
    assert.equal(plus.plan.premium, true);
  } finally {
    await b.close();
    await local.close();
    await hosted.close();
  }
});

test('AI creations are counted per day; talk and fights are not', async () => {
  const local = await fakeModel('small');
  const b = await bridge({ LLM_PLATFORM_BASE_URL: local.url, LLM_MODEL1: 'small', AI_RATE_PER_MIN: '10000', AI_RATE_BURST: '1000' }, () => ({ id: 1, plan: 'free' }));
  try {
    for (let i = 0; i < PLANS.free.buildsPerDay; i++) assert.equal((await b.ask({ task: i % 2 ? 'map' : 'game', messages: [] })).status, 200);
    const over = await b.ask({ task: 'class', messages: [] });
    assert.equal(over.status, 429);
    assert.match(over.body.error, /AI builds for today/);
    assert.equal((await b.ask({ task: 'npc', messages: [] })).status, 200, 'helper talk is not a build');
    assert.equal((await b.status()).plan.buildsLeft, 0);
  } finally {
    await b.close();
    await local.close();
  }
});

test('accounts carry a plan; old databases get the column', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gamory-plans-'));
  const game = await createGameServices({ dataDir: dir, env: { SERVER_SECRET: 'x'.repeat(64) } });
  try {
    const { token, account } = await game.accounts.register({ name: 'Parent', password: 'family-game-1', ip: '10.1.1.1' });
    assert.equal(account.plan, 'free');
    game.accounts.setPlan(account.id, 'plus');
    assert.equal(game.accounts.fromToken(token).plan, 'plus');
    assert.throws(() => game.accounts.setPlan(account.id, 'gold'), /Plans are/);
    assert.ok(game.history.of(account.id, 10).some((e) => e.type === 'plan'));
  } finally {
    game.close();
    await rm(dir, { recursive: true, force: true });
  }
});
