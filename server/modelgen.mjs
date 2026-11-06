/**
 * "My models": user uploads and AI-generated 3D models.
 *
 * Shared by the Vite dev server (vite.config.js) and the production bridge
 * (server/server.js), Node built-ins only. Files live in
 * `<library>/my-models/<id>/model.glb` with `<library>/my-models/index.json`
 * listing them; the game's catalog merges that list in, so a model can be
 * placed on maps, worn as a character or given to an NPC.
 *
 * Generation from a 2D image goes to a cloud API — the key never reaches the
 * browser:
 *   TRIPO_API_KEY  → Tripo3D  (image → model; humanoids rigged with Mixamo bone
 *                    names and given idle / walk / run, so they use the game's
 *                    own cast animations)
 *   MESHY_API_KEY  → Meshy    (image → model; humanoids rigged + idle/walk/run)
 *   MODELGEN_PROVIDER=mock → no network: copies a bundled character, for testing
 *
 * Results are downloaded immediately: Tripo's links expire after minutes,
 * Meshy's after three days.
 *
 *   GET    /api/models              → { models, provider }
 *   POST   /api/models/upload       { name, category, kind, glb (base64) }
 *   POST   /api/models/generate     { name, image (data URI), kind: 'object'|'character', category }
 *   GET    /api/models/jobs/<id>    → job status
 *   DELETE /api/models/<id>
 */
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const MAX_UPLOAD = 120 * 1024 * 1024;

/* ---------------------------------------------------------------------- */
/* GLB inspection — size, triangles, skeleton, animations                  */
/* ---------------------------------------------------------------------- */

function glbJson(buffer) {
  if (buffer.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB file');
  const length = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + length).toString('utf8'));
}

const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function multiply(a, b) {
  const out = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return out;
}
function nodeMatrix(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
  return [(1 - 2 * (yy + zz)) * sx, 2 * (xy + wz) * sx, 2 * (xz - wy) * sx, 0, 2 * (xy - wz) * sy, (1 - 2 * (xx + zz)) * sy, 2 * (yz + wx) * sy, 0, 2 * (xz + wy) * sz, 2 * (yz - wx) * sz, (1 - 2 * (xx + yy)) * sz, 0, tx, ty, tz, 1];
}

/** The facts the game needs, from the GLB's JSON chunk alone. */
export function inspectGlb(buffer) {
  const json = glbJson(buffer);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let triangles = 0;
  const visit = (index, parent) => {
    const node = json.nodes?.[index];
    if (!node) return;
    const world = multiply(parent, nodeMatrix(node));
    const mesh = node.mesh !== undefined ? json.meshes?.[node.mesh] : null;
    for (const prim of mesh?.primitives ?? []) {
      const pos = json.accessors?.[prim.attributes?.POSITION];
      if (!pos?.min || !pos?.max) continue;
      triangles += Math.floor((prim.indices !== undefined ? json.accessors?.[prim.indices]?.count ?? 0 : pos.count) / 3);
      const m = node.skin !== undefined ? identity() : world;
      for (let i = 0; i < 8; i++) {
        const c = [i & 1 ? pos.max[0] : pos.min[0], i & 2 ? pos.max[1] : pos.min[1], i & 4 ? pos.max[2] : pos.min[2]];
        const p = [m[0] * c[0] + m[4] * c[1] + m[8] * c[2] + m[12], m[1] * c[0] + m[5] * c[1] + m[9] * c[2] + m[13], m[2] * c[0] + m[6] * c[1] + m[10] * c[2] + m[14]];
        for (let k = 0; k < 3; k++) {
          min[k] = Math.min(min[k], p[k]);
          max[k] = Math.max(max[k], p[k]);
        }
      }
    }
    for (const child of node.children ?? []) visit(child, world);
  };
  for (const root of json.scenes?.[json.scene ?? 0]?.nodes ?? []) visit(root, identity());
  const valid = Number.isFinite(min[0]);
  // glTF loaders strip ':' from names ("mixamorig:Hips" → "mixamorigHips").
  const names = (json.nodes ?? []).map((n) => String(n.name ?? '').replace(/[:./[\]]/g, ''));
  const rigged = (json.skins?.length ?? 0) > 0;
  const hasHumanoidBones = ['Hips', 'Spine', 'LeftUpLeg', 'RightUpLeg', 'LeftArm', 'RightArm', 'Head'].every((bone) =>
    names.some((n) => n === bone || n === `mixamorig${bone}` || n.endsWith(bone))
  );
  return {
    size: valid ? max.map((v, i) => +(v - min[i]).toFixed(4)) : [1, 1, 1],
    min: valid ? min.map((v) => +v.toFixed(4)) : [0, 0, 0],
    triangles,
    rigged,
    // Mixamo-named humanoids can use the game's own idle / cast clips.
    rig: rigged && hasHumanoidBones ? 'mixamo' : rigged ? 'other' : 'none',
    animations: (json.animations ?? []).map((a, i) => a.name || `anim_${i}`).slice(0, 40)
  };
}

/* ---------------------------------------------------------------------- */
/* Storage                                                                 */
/* ---------------------------------------------------------------------- */

export function createModelStore({ libraryRoot, env = process.env, log = console.log }) {
  const dir = resolve(libraryRoot, 'my-models');
  const indexFile = join(dir, 'index.json');
  const jobs = new Map();

  const readIndex = async () => {
    try {
      const data = JSON.parse(await readFile(indexFile, 'utf8'));
      return Array.isArray(data.models) ? data : { models: [] };
    } catch {
      return { models: [] };
    }
  };
  const writeIndex = async (index) => {
    await mkdir(dir, { recursive: true });
    await writeFile(`${indexFile}.tmp`, JSON.stringify(index, null, 1));
    await rename(`${indexFile}.tmp`, indexFile);
  };
  const slug = (name) =>
    `${String(name || 'model').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'model'}-${Date.now().toString(36)}`;

  /** Save a GLB and list it in the index. */
  async function saveModel(buffer, { name, category, kind, source, prompt = null }) {
    const facts = inspectGlb(buffer);
    const id = slug(name);
    await mkdir(join(dir, id), { recursive: true });
    await writeFile(join(dir, id, 'model.glb'), buffer);
    const isCharacter = kind === 'character' && facts.rigged;
    const entry = {
      id: `my/${id}`,
      slug: id,
      name: String(name || 'My model').slice(0, 60),
      category: isCharacter ? 'character' : category || 'misc',
      themes: ['custom'],
      tags: ['custom', 'my models', String(name || '').toLowerCase()],
      file: `my-models/${id}/model.glb`,
      size: facts.size,
      min: facts.min,
      triangles: facts.triangles,
      rigged: facts.rigged,
      rig: facts.rig,
      animations: facts.animations,
      textured: true,
      source: 'custom',
      pack: 'My models',
      license: 'yours',
      author: source,
      kind: isCharacter ? 'character' : 'object',
      prompt,
      createdAt: new Date().toISOString()
    };
    const index = await readIndex();
    index.models.push(entry);
    await writeIndex(index);
    log(`[models] saved ${entry.name} (${entry.kind}, ${facts.rig} rig, ${facts.animations.length} clips)`);
    return entry;
  }

  async function removeModel(id) {
    if (!ID.test(id)) throw new Error('bad id');
    const index = await readIndex();
    index.models = index.models.filter((m) => m.slug !== id);
    await writeIndex(index);
    await rm(join(dir, id), { recursive: true, force: true });
  }

  /* -------------------------------------------------------------------- */
  /* Providers                                                             */
  /* -------------------------------------------------------------------- */

  const provider = () => {
    const forced = env.MODELGEN_PROVIDER;
    if (forced === 'mock') return 'mock';
    if (forced === 'tripo' && env.TRIPO_API_KEY) return 'tripo';
    if (forced === 'meshy' && env.MESHY_API_KEY) return 'meshy';
    if (env.TRIPO_API_KEY) return 'tripo';
    if (env.MESHY_API_KEY) return 'meshy';
    return null;
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function http(url, init = {}, retries = 3) {
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(url, init);
      if (response.status === 429 && attempt < retries) {
        await sleep((Number(response.headers.get('retry-after')) || 2 ** attempt) * 1000);
        continue;
      }
      const text = await response.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }
      if (!response.ok) throw new Error(body?.message ?? body?.error ?? `HTTP ${response.status}`);
      return body;
    }
  }
  async function download(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`download failed: HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  /* Tripo3D — https://developers.tripo3d.ai */
  const tripo = {
    base: 'https://openapi.tripo3d.ai/v3',
    headers: () => ({ Authorization: `Bearer ${env.TRIPO_API_KEY}` }),
    async upload(job, image) {
      const [, mime, b64] = image.match(/^data:(image\/[a-z+]+);base64,(.+)$/) ?? [];
      if (!b64) throw new Error('send the image as a data URI');
      const form = new FormData();
      form.append('file', new Blob([Buffer.from(b64, 'base64')], { type: mime }), `upload.${mime.split('/')[1]}`);
      const body = await http(`${this.base}/files`, { method: 'POST', headers: this.headers(), body: form });
      return body.data.file_token;
    },
    async task(path, payload) {
      const body = await http(`${this.base}${path}`, { method: 'POST', headers: { ...this.headers(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      return body.data.task_id;
    },
    async wait(job, taskId, step, span) {
      for (;;) {
        await sleep(2000);
        const { data } = await http(`${this.base}/tasks/${taskId}`, { headers: this.headers() });
        job.progress = span[0] + ((data.progress ?? 0) / 100) * (span[1] - span[0]);
        job.step = step;
        if (data.status === 'success') return data;
        if (['failed', 'cancelled', 'banned', 'expired'].includes(data.status)) throw new Error(`${step} ${data.status}${data.error_message ? `: ${data.error_message}` : ''}`);
      }
    },
    async run(job, { image, kind }) {
      const token = await this.upload(job, image);
      const model = await this.task('/generation/image-to-model', { input: token, model: 'v3.1-20260211', texture: true, pbr: true });
      const made = await this.wait(job, model, 'Sculpting the model', [0.05, kind === 'character' ? 0.55 : 0.95]);
      if (kind !== 'character') return download(made.output.model_url);
      job.step = 'Checking the body for a skeleton';
      const check = await this.wait(job, await this.task('/animations/rig-check', { input: model }), 'Checking the body', [0.55, 0.6]);
      if (!check.output?.riggable || check.output.rig_type !== 'biped') {
        job.note = 'Not a humanoid body, so it was kept as a static model.';
        return download(made.output.model_url);
      }
      // Mixamo bone names, so the game's own idle / cast clips drive it too.
      const rig = await this.task('/animations/rig', { input: model, model: 'v3.0-20260909', rig_type: 'biped', spec: 'mixamo', out_format: 'glb' });
      await this.wait(job, rig, 'Rigging the skeleton', [0.6, 0.8]);
      const anim = await this.task('/animations/retarget', { input: rig, animations: ['preset:idle', 'preset:walk', 'preset:run'], out_format: 'glb', export_with_geometry: true, animate_in_place: true });
      const animated = await this.wait(job, anim, 'Teaching it to walk', [0.8, 0.97]);
      return download(animated.output.model_url);
    }
  };

  /* Meshy — https://docs.meshy.ai */
  const meshy = {
    base: 'https://api.meshy.ai/openapi/v1',
    headers: () => ({ Authorization: `Bearer ${env.MESHY_API_KEY}`, 'Content-Type': 'application/json' }),
    async create(path, payload) {
      return (await http(`${this.base}${path}`, { method: 'POST', headers: this.headers(), body: JSON.stringify(payload) })).result;
    },
    async wait(job, path, id, step, span) {
      for (;;) {
        await sleep(2500);
        const task = await http(`${this.base}${path}/${id}`, { headers: this.headers() });
        job.progress = span[0] + ((task.progress ?? 0) / 100) * (span[1] - span[0]);
        job.step = step;
        if (task.status === 'SUCCEEDED') return task;
        if (task.status === 'FAILED' || task.status === 'CANCELED') throw new Error(`${step} failed${task.task_error?.message ? `: ${task.task_error.message}` : ''}`);
      }
    },
    async action(search) {
      const list = await http(`${this.base}/animations/library?search=${encodeURIComponent(search)}`, { headers: this.headers() });
      const items = Array.isArray(list) ? list : list.result ?? list.data ?? [];
      return items[0]?.action_id ?? null;
    },
    async run(job, { image, kind }) {
      // Characters come back in an A-pose and under the rigger's triangle limit.
      const payload = { image_url: image, should_texture: true, enable_pbr: true, target_formats: ['glb'] };
      if (kind === 'character') Object.assign(payload, { pose_mode: 'a-pose', should_remesh: true, target_polycount: 60000 });
      const id = await this.create('/image-to-3d', payload);
      const made = await this.wait(job, '/image-to-3d', id, 'Sculpting the model', [0.05, kind === 'character' ? 0.55 : 0.95]);
      if (kind !== 'character') return download(made.model_urls.glb);
      let rigTask;
      try {
        const rigId = await this.create('/rigging', { input_task_id: id, height_meters: 1.8 });
        rigTask = await this.wait(job, '/rigging', rigId, 'Rigging the skeleton', [0.55, 0.8]);
        // One file with idle, walk and run clips, if the library has them.
        const actions = (await Promise.all(['idle', 'walk', 'run'].map((s) => this.action(s)))).filter((a) => a !== null);
        if (actions.length) {
          const animId = await this.create('/animations', { rig_task_id: rigId, action_ids: [...new Set(actions)] });
          const anim = await this.wait(job, '/animations', animId, 'Teaching it to walk', [0.8, 0.97]);
          return download(anim.result.animation_glb_url);
        }
        return download(rigTask.result.rigged_character_glb_url);
      } catch (error) {
        job.note = `Rigging failed (${error.message}); kept as a static model.`;
        return download(made.model_urls.glb);
      }
    }
  };

  /* No network: copy a bundled rigged character, for testing the pipeline. */
  const mock = {
    async run(job, { kind }) {
      for (const [step, p] of [['Sculpting the model', 0.3], ['Rigging the skeleton', 0.6], ['Teaching it to walk', 0.9]]) {
        job.step = step;
        job.progress = p;
        await sleep(700);
      }
      const sample = kind === 'character' ? 'public/models/characters/knight/model.glb' : 'public/models/characters/barbarian/model.glb';
      return readFile(resolve(sample));
    }
  };

  const PROVIDERS = { tripo, meshy, mock };

  function startJob({ name, image, kind = 'object', category = 'misc' }) {
    const which = provider();
    if (!which) throw new Error('No 3D generator configured — add TRIPO_API_KEY or MESHY_API_KEY to .env and restart.');
    const id = `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const job = { id, provider: which, state: 'running', step: 'Starting', progress: 0, note: null, error: null, model: null };
    jobs.set(id, job);
    (async () => {
      try {
        const buffer = await PROVIDERS[which].run(job, { image, kind });
        job.step = 'Saving';
        job.model = await saveModel(buffer, { name, category, kind, source: which, prompt: 'image' });
        if (kind === 'character' && !job.model.rigged) job.note ??= 'It came back without a skeleton, so it is a map object rather than a character.';
        job.progress = 1;
        job.state = 'done';
      } catch (error) {
        job.state = 'failed';
        job.error = String(error?.message ?? error);
        log(`[models] job ${id} failed: ${job.error}`);
      }
    })();
    return job;
  }

  /* -------------------------------------------------------------------- */
  /* HTTP                                                                  */
  /* -------------------------------------------------------------------- */

  const send = (res, status, body) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  };
  const readBody = (req) =>
    new Promise((ok, fail) => {
      const chunks = [];
      let size = 0;
      req.on('data', (c) => {
        size += c.length;
        if (size > MAX_UPLOAD) fail(new Error('file too large (max 120 MB)'));
        else chunks.push(c);
      });
      req.on('end', () => {
        try {
          ok(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
        } catch (error) {
          fail(error);
        }
      });
      req.on('error', fail);
    });

  /** @returns {Promise<boolean>} whether it handled the request */
  async function handle(req, res) {
    const url = (req.url ?? '').split('?')[0];
    if (!url.startsWith('/api/models')) return false;
    try {
      if (url === '/api/models' && req.method === 'GET') return send(res, 200, { ...(await readIndex()), provider: provider() }), true;
      if (url === '/api/models/upload' && req.method === 'POST') {
        const body = await readBody(req);
        if (!body.glb) return send(res, 400, { error: 'no model in the request' }), true;
        const entry = await saveModel(Buffer.from(body.glb, 'base64'), { name: body.name, category: body.category, kind: body.kind, source: 'upload' });
        return send(res, 200, { model: entry }), true;
      }
      if (url === '/api/models/generate' && req.method === 'POST') {
        const body = await readBody(req);
        if (!/^data:image\/(png|jpe?g|webp);base64,/.test(body.image ?? '')) return send(res, 400, { error: 'send a PNG, JPEG or WebP image' }), true;
        const job = startJob(body);
        return send(res, 202, { job }), true;
      }
      const jobMatch = url.match(/^\/api\/models\/jobs\/([\w-]+)$/);
      if (jobMatch && req.method === 'GET') {
        const job = jobs.get(jobMatch[1]);
        return send(res, job ? 200 : 404, job ? { job } : { error: 'no such job' }), true;
      }
      const delMatch = url.match(/^\/api\/models\/([a-z0-9-]+)$/);
      if (delMatch && req.method === 'DELETE') {
        await removeModel(delMatch[1]);
        return send(res, 200, { ok: true }), true;
      }
      return send(res, 404, { error: 'unknown route' }), true;
    } catch (error) {
      return send(res, 400, { error: String(error?.message ?? error) }), true;
    }
  }

  return { handle, saveModel, readIndex, provider, startJob, jobs };
}

