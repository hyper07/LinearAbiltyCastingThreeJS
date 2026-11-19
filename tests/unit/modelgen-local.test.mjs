import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createModelStore, GENERATOR_CREDITS } from '../../server/modelgen.mjs';
import { createSerialQueue, localOptions, localPaths, localStatus, runLocal } from '../../server/modelgen-local.mjs';

/** The smallest GLB the store accepts: one triangle. */
function tinyGlb() {
  const positions = Buffer.from(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer);
  const json = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 0] }],
    bufferViews: [{ buffer: 0, byteLength: positions.length }],
    buffers: [{ byteLength: positions.length }]
  };
  let text = Buffer.from(JSON.stringify(json));
  text = Buffer.concat([text, Buffer.alloc((4 - (text.length % 4)) % 4, 0x20)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + text.length + 8 + positions.length, 8);
  const chunk = (type, data) => {
    const head = Buffer.alloc(8);
    head.writeUInt32LE(data.length, 0);
    head.writeUInt32LE(type, 4);
    return Buffer.concat([head, data]);
  };
  return Buffer.concat([header, chunk(0x4e4f534a, text), chunk(0x004e4942, positions)]);
}

const tempLibrary = () => mkdtemp(join(tmpdir(), 'gamory-modelgen-'));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((ok, fail) => ((resolve = ok), (reject = fail)));
  return { promise, resolve, reject };
};
const ready = { status: () => ({ ready: true }) };
const notReady = { status: () => ({ ready: false, reason: 'not installed — run npm run modelgen:setup' }) };

test('provider: cloud keys win, then the local install, and MODELGEN_PROVIDER forces a choice', async () => {
  const pick = (env, local) => createModelStore({ libraryRoot: '/nonexistent', env, log: () => {}, local }).provider();
  assert.equal(pick({}, notReady), null);
  assert.equal(pick({}, ready), 'local');
  assert.equal(pick({ TRIPO_API_KEY: 'k' }, ready), 'tripo');
  assert.equal(pick({ MESHY_API_KEY: 'k' }, ready), 'meshy');
  assert.equal(pick({ MODELGEN_PROVIDER: 'local', TRIPO_API_KEY: 'k' }, ready), 'local');
  assert.equal(pick({ MODELGEN_PROVIDER: 'local', TRIPO_API_KEY: 'k' }, notReady), null, 'forced local but not installed');
  assert.equal(pick({ MODELGEN_PROVIDER: 'none' }, ready), null, 'opt out of the local one');
  assert.equal(pick({ MODELGEN_PROVIDER: 'mock' }, notReady), 'mock');
  assert.equal(pick({ MODELGEN_PROVIDER: 'meshy', TRIPO_API_KEY: 'k', MESHY_API_KEY: 'k' }, ready), 'meshy');
});

test('startJob without any generator says how to set one up', async () => {
  const store = createModelStore({ libraryRoot: '/nonexistent', env: {}, log: () => {}, local: notReady });
  assert.throws(() => store.startJob({ name: 'x', image: 'data:image/png;base64,AA==' }), /modelgen:setup/);
});

test('local jobs run one at a time, in order, and save with a credit line', async () => {
  const libraryRoot = await tempLibrary();
  const gates = [deferred(), deferred(), deferred()];
  const started = [];
  let running = 0;
  let maxRunning = 0;
  const local = {
    ...ready,
    async run(job, input) {
      const n = started.length;
      started.push(input.imagePath);
      running++;
      maxRunning = Math.max(maxRunning, running);
      job.step = 'Sculpting the model';
      job.progress = 0.5;
      await gates[n].promise;
      running--;
      return tinyGlb();
    }
  };
  const store = createModelStore({ libraryRoot, env: {}, log: () => {}, local });
  const jobs = ['a', 'b', 'c'].map((name) => store.startJob({ name, imagePath: `/img/${name}.png`, kind: 'object' }));
  await new Promise((r) => setImmediate(r));
  assert.equal(jobs[0].state, 'running');
  assert.equal(jobs[1].state, 'queued');
  assert.equal(jobs[2].state, 'queued');
  assert.deepEqual(started, ['/img/a.png']);

  gates[0].resolve();
  await jobs[0].done;
  await new Promise((r) => setImmediate(r));
  assert.equal(jobs[0].state, 'done');
  assert.equal(jobs[1].state, 'running');
  assert.equal(jobs[2].state, 'queued');

  gates[1].resolve();
  gates[2].resolve();
  await Promise.all(jobs.map((j) => j.done));
  assert.deepEqual(started, ['/img/a.png', '/img/b.png', '/img/c.png']);
  assert.equal(maxRunning, 1);
  for (const job of jobs) assert.equal(job.state, 'done');

  const index = JSON.parse(await readFile(join(libraryRoot, 'my-models', 'index.json'), 'utf8'));
  assert.equal(index.models.length, 3);
  for (const m of index.models) {
    assert.equal(m.author, 'local');
    assert.equal(m.generator.tool, 'TRELLIS.2');
    assert.equal(m.generator.license, 'MIT');
    assert.match(m.credit, /^Generated with TRELLIS\.2 \(MIT, https:\/\/github\.com\/microsoft\/TRELLIS\.2\)/);
    assert.match(m.credit, /Built with DINOv3/);
  }
  assert.equal(GENERATOR_CREDITS.local.text, index.models[0].credit);
  await rm(libraryRoot, { recursive: true, force: true });
});

test('a failed local job does not block the queue', async () => {
  const libraryRoot = await tempLibrary();
  let calls = 0;
  const local = {
    ...ready,
    async run() {
      calls++;
      if (calls === 1) throw new Error('GPU watchdog');
      return tinyGlb();
    }
  };
  const store = createModelStore({ libraryRoot, env: {}, log: () => {}, local });
  const first = store.startJob({ name: 'bad', imagePath: '/x.png' });
  const second = store.startJob({ name: 'good', imagePath: '/y.png', kind: 'character' });
  await Promise.all([first.done, second.done]);
  assert.equal(first.state, 'failed');
  assert.equal(first.error, 'GPU watchdog');
  assert.equal(second.state, 'done');
  assert.equal(second.model.kind, 'object', 'no rig, so not a character');
  assert.match(second.note, /mesh2motion/i);
  await rm(libraryRoot, { recursive: true, force: true });
});

test('the jobs endpoint reports queued and running local jobs', async () => {
  const libraryRoot = await tempLibrary();
  const gate = deferred();
  const store = createModelStore({ libraryRoot, env: {}, log: () => {}, local: { ...ready, run: async () => (await gate.promise, tinyGlb()) } });
  const call = (method, url, body) =>
    new Promise((resolve) => {
      const req = new EventEmitter();
      Object.assign(req, { method, url });
      const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(text) { resolve({ status: this.statusCode, body: JSON.parse(text) }); } };
      store.handle(req, res);
      setImmediate(() => {
        if (body) req.emit('data', Buffer.from(JSON.stringify(body)));
        req.emit('end');
      });
    });
  const image = 'data:image/png;base64,iVBORw0KGgo=';
  const a = await call('POST', '/api/models/generate', { name: 'a', image });
  const b = await call('POST', '/api/models/generate', { name: 'b', image });
  assert.equal(a.status, 202);
  assert.equal(a.body.job.provider, 'local');
  assert.equal(b.body.job.state, 'queued');
  assert.equal(b.body.job.done, undefined, 'internal promise is not sent');
  const listed = await call('GET', '/api/models');
  assert.equal(listed.body.provider, 'local');
  assert.equal(listed.body.local.ready, true);
  gate.resolve();
  await store.jobs.get(b.body.job.id).done;
  const polled = await call('GET', `/api/models/jobs/${b.body.job.id}`);
  assert.equal(polled.body.job.state, 'done');
  assert.equal(polled.body.job.model.generator.tool, 'TRELLIS.2');
  await rm(libraryRoot, { recursive: true, force: true });
});

/** A child process stand-in that speaks the runner's JSON protocol. */
function fakeSpawn(script) {
  const calls = [];
  const spawn = (cmd, args, options) => {
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.killed = null;
    child.kill = (signal) => {
      child.killed = signal;
      setImmediate(() => child.emit('close', null, signal));
    };
    calls.push({ cmd, args, options, child });
    setImmediate(() => script(child, args));
    return child;
  };
  return { spawn, calls };
}
const argOf = (args, flag) => args[args.indexOf(flag) + 1];

test('runLocal: spawns the venv python, maps progress lines, returns the GLB and cleans up', async () => {
  const libraryRoot = await tempLibrary();
  const { spawn, calls } = fakeSpawn(async (child, args) => {
    child.stdout.emit('data', '{"event":"progress","step":"Sculpting the model","progress":0.4}\nnot json\n');
    child.stderr.emit('data', 'Sampling: 50%|#####\r');
    await writeFile(argOf(args, '--out'), tinyGlb());
    child.stdout.emit('data', `{"event":"done","glb":${JSON.stringify(argOf(args, '--out'))},"seconds":{"total":12},"peakGpuBytes":123,"baker":"metal"}\n`);
    child.emit('close', 0);
  });
  const job = { id: 'job-test1', progress: 0, step: '' };
  const seen = [];
  const watcher = setInterval(() => seen.push(job.progress), 1);
  const buffer = await runLocal(job, { image: `data:image/png;base64,${Buffer.from('png').toString('base64')}`, seed: 7 }, { libraryRoot, env: { MODELGEN_LOCAL_FACES: '50000' }, spawn });
  clearInterval(watcher);
  assert.equal(buffer.readUInt32LE(0), 0x46546c67);
  const { cmd, args, options } = calls[0];
  assert.equal(cmd, localPaths(libraryRoot).python);
  assert.match(args[0], /trellis_run\.py$/);
  assert.equal(argOf(args, '--seed'), '7');
  assert.equal(argOf(args, '--faces'), '50000');
  assert.equal(argOf(args, '--pipeline-type'), '512');
  assert.equal(options.env.HF_HUB_OFFLINE, '1');
  assert.equal(options.env.HF_HUB_CACHE, localPaths(libraryRoot).cache);
  assert.equal(job.step, 'Sculpting the model');
  assert.equal(job.progress, 0.4);
  assert.deepEqual(job.stats, { seconds: { total: 12 }, peakGpuBytes: 123, peakRssBytes: undefined, baker: 'metal' });
  await assert.rejects(readFile(argOf(args, '--image')), 'the job folder is removed');
  await rm(libraryRoot, { recursive: true, force: true });
});

test('runLocal: an error line becomes the job error; a hung child is killed at the timeout', async () => {
  const libraryRoot = await tempLibrary();
  const failing = fakeSpawn((child) => {
    child.stdout.emit('data', '{"event":"error","message":"DINOv3 is not downloaded yet"}\n');
    child.emit('close', 1);
  });
  await assert.rejects(runLocal({ id: 'job-fail' }, { imagePath: '/x.png' }, { libraryRoot, env: {}, spawn: failing.spawn }), /DINOv3 is not downloaded/);

  const hung = fakeSpawn(() => {});
  const env = { MODELGEN_LOCAL_TIMEOUT_MIN: String(30 / 60000) }; // 30 ms
  await assert.rejects(runLocal({ id: 'job-hang' }, { imagePath: '/x.png' }, { libraryRoot, env, spawn: hung.spawn }), /timed out/);
  assert.equal(hung.calls[0].child.killed, 'SIGTERM');
  await rm(libraryRoot, { recursive: true, force: true });
});

test('runLocal: waits for a lock held by a live process, takes over a dead one', async () => {
  const libraryRoot = await tempLibrary();
  const { lock } = localPaths(libraryRoot);
  await mkdir(join(lock, '..'), { recursive: true });
  const ok = fakeSpawn(async (child, args) => {
    await writeFile(argOf(args, '--out'), tinyGlb());
    child.stdout.emit('data', '{"event":"done"}\n');
    child.emit('close', 0);
  });
  // A dead owner (pid far above any real one): taken over at once.
  await writeFile(lock, '999999999');
  await runLocal({ id: 'job-dead' }, { imagePath: '/x.png' }, { libraryRoot, env: {}, spawn: ok.spawn });
  assert.equal(ok.calls.length, 1);
  await assert.rejects(readFile(lock), 'released after the run');

  // A live owner (this test's parent process): waits until it is released.
  await writeFile(lock, String(process.ppid));
  const job = { id: 'job-wait' };
  const run = runLocal(job, { imagePath: '/x.png' }, { libraryRoot, env: { MODELGEN_LOCAL_LOCK_POLL_MS: '5' }, spawn: ok.spawn });
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(ok.calls.length, 1, 'not started while locked');
  assert.match(job.step, /Waiting for another generation/);
  await rm(lock);
  await run;
  assert.equal(ok.calls.length, 2);
  await rm(libraryRoot, { recursive: true, force: true });
});

test('localStatus: missing install, gated DINOv3, ready', async () => {
  const libraryRoot = await tempLibrary();
  assert.equal(localStatus(libraryRoot).installed, false);
  const paths = localPaths(libraryRoot);
  await mkdir(join(paths.tool, '.venv', 'bin'), { recursive: true });
  await writeFile(paths.python, '');
  assert.match(localStatus(libraryRoot).reason, /setup did not finish/);
  await writeFile(paths.status, JSON.stringify({ ready: false, weights: { trellis2: 'abc', dinov3: null } }));
  assert.match(localStatus(libraryRoot).reason, /huggingface\.co\/facebook\/dinov3/);
  await writeFile(paths.status, JSON.stringify({ ready: true, weights: { trellis2: 'abc', dinov3: 'def' } }));
  assert.equal(localStatus(libraryRoot).ready, true);
  await rm(libraryRoot, { recursive: true, force: true });
});

test('localOptions: safe defaults and validated overrides', () => {
  const GB = 2 ** 30;
  assert.deepEqual(localOptions({}, 128 * GB), { pipelineType: '512', textureSize: 1024, faces: 100000, timeoutMs: 30 * 60 * 1000, keepLoaded: true });
  assert.equal(localOptions({}, 24 * GB).keepLoaded, false, 'smaller Macs move models on and off the GPU');
  assert.equal(localOptions({ MODELGEN_LOCAL_KEEP_LOADED: '1' }, 24 * GB).keepLoaded, true);
  const o = localOptions({ MODELGEN_LOCAL_PIPELINE: '1024_cascade', MODELGEN_LOCAL_TEXTURE: '2048', MODELGEN_LOCAL_FACES: 'lots', MODELGEN_LOCAL_KEEP_LOADED: '0' });
  assert.equal(o.pipelineType, '1024_cascade');
  assert.equal(o.textureSize, 2048);
  assert.equal(o.faces, 100000);
  assert.equal(o.keepLoaded, false);
  assert.equal(localOptions({ MODELGEN_LOCAL_PIPELINE: 'rm -rf' }).pipelineType, '512');
});

test('createSerialQueue: positions and order', async () => {
  const queue = createSerialQueue();
  const order = [];
  const tokens = [{}, {}, {}];
  const gate = deferred();
  const p = tokens.map((t, i) => queue.push(async () => (i === 0 && (await gate.promise), order.push(i), i), t));
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(tokens.map((t) => queue.position(t)), [0, 1, 2]);
  assert.equal(queue.size, 3);
  gate.resolve();
  assert.deepEqual(await Promise.all(p), [0, 1, 2]);
  assert.deepEqual(order, [0, 1, 2]);
  assert.equal(queue.position(tokens[0]), -1);
});
