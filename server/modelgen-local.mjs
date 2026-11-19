/**
 * The free, local picture-to-3D generator: TRELLIS.2 (Microsoft, MIT) on
 * Apple silicon through the trellis-mac port (MIT).
 *
 * `npm run modelgen:setup` installs it in `<library>/tools/trellis-mac` with
 * its own Python venv and model cache; this module only finds that install and
 * runs one generation in a child process (scripts/modelgen/trellis_run.py),
 * reading JSON progress lines from its stdout. Node built-ins only.
 */
import { spawn as spawnChild } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, open, readFile, rm, writeFile } from 'node:fs/promises';
import { totalmem } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const RUNNER = resolve(HERE, '../scripts/modelgen/trellis_run.py');
export const TOOL_NAME = 'trellis-mac';

/** What a game shows in its credits for a model made here. */
export const LOCAL_CREDIT = {
  tool: 'TRELLIS.2',
  license: 'MIT',
  url: 'https://github.com/microsoft/TRELLIS.2',
  text:
    'Generated with TRELLIS.2 (MIT, https://github.com/microsoft/TRELLIS.2) via trellis-mac (MIT, https://github.com/shivampkumar/trellis-mac). ' +
    'Built with DINOv3 (DINOv3 License, https://ai.meta.com/resources/models-and-libraries/dinov3-license/). Background removal: BiRefNet (MIT, https://github.com/ZhengPeng7/BiRefNet).'
};

export const DINOV3_URL = 'https://huggingface.co/facebook/dinov3-vitl16-pretrain-lvd1689m';

/** Everything the local install is built from, for library/CREDITS.md. */
export const TOOL_CREDITS = [
  ['trellis-mac', 'Apple-silicon port of TRELLIS.2 (Shivam Kumar)', 'MIT', 'https://github.com/shivampkumar/trellis-mac'],
  ['TRELLIS.2 code and weights (TRELLIS.2-4B, TRELLIS-image-large decoder)', 'Image-to-3D model (Microsoft)', 'MIT', 'https://github.com/microsoft/TRELLIS.2'],
  ['DINOv3 ViT-L/16', 'Image features (Meta). Show "Built with DINOv3" in credits', 'DINOv3 License', 'https://huggingface.co/facebook/dinov3-vitl16-pretrain-lvd1689m'],
  ['BiRefNet', 'Background removal (Peng Zheng et al.), in place of the non-commercial RMBG-2.0', 'MIT', 'https://github.com/ZhengPeng7/BiRefNet'],
  ['mtlbvh, mtldiffrast, mtlmesh, mtlgemm, trellis2-apple (o-voxel)', 'Metal backends (Pedro Naugusto, from Jianfeng Xiang\'s CUDA code)', 'MIT', 'https://github.com/pedronaugusto'],
  ['utils3d', '3D utilities (EasternJournalist)', 'MIT', 'https://github.com/EasternJournalist/utils3d'],
  ['Eigen', 'C++ headers, used only to build o-voxel', 'MPL-2.0', 'https://gitlab.com/libeigen/eigen'],
  ['PyTorch, transformers, timm, trimesh, xatlas and the other venv packages', 'Python runtime', 'BSD / Apache-2.0 / MIT', 'scripts/modelgen/constraints.txt']
];

export const TOOL_CREDITS_HEADING = '## Local model generator (library/tools/trellis-mac)';

export function toolCreditsMarkdown() {
  return [
    TOOL_CREDITS_HEADING,
    '',
    'Installed by `npm run modelgen:setup`. Models it makes carry this line in `my-models/index.json` (`credit`):',
    '',
    `> ${LOCAL_CREDIT.text}`,
    '',
    '| Part | Role | Licence | Link |',
    '| --- | --- | --- | --- |',
    ...TOOL_CREDITS.map((row) => `| ${row.join(' | ')} |`),
    ''
  ].join('\n');
}

/** Add or refresh the generator section of library/CREDITS.md. */
export function withToolCredits(markdown) {
  const start = markdown.indexOf(TOOL_CREDITS_HEADING);
  const before = (start < 0 ? markdown : markdown.slice(0, start)).replace(/\s*$/, '\n\n');
  return before + toolCreditsMarkdown();
}

export function localPaths(libraryRoot) {
  const tool = resolve(libraryRoot, 'tools', TOOL_NAME);
  return {
    tool,
    python: join(tool, '.venv', 'bin', 'python'),
    status: join(tool, '.gamory-setup.json'),
    lock: join(tool, '.generate.lock'),
    cache: join(tool, 'hf-cache')
  };
}

/**
 * Whether the local generator can run: the venv exists and setup recorded
 * every model as downloaded (DINOv3 is gated, so it can lag behind the rest).
 */
export function localStatus(libraryRoot) {
  const paths = localPaths(libraryRoot);
  if (!existsSync(paths.python) || !existsSync(RUNNER)) return { installed: false, ready: false, reason: 'not installed — run npm run modelgen:setup' };
  let status = {};
  try {
    status = JSON.parse(readFileSync(paths.status, 'utf8'));
  } catch {
    return { installed: true, ready: false, reason: 'setup did not finish — run npm run modelgen:setup' };
  }
  if (!status.weights?.dinov3) return { installed: true, ready: false, reason: `DINOv3 is gated: accept its licence at ${DINOV3_URL}, then run npm run modelgen:setup` };
  return { installed: true, ready: Boolean(status.ready), reason: status.ready ? null : 'setup did not finish — run npm run modelgen:setup', status };
}

/**
 * Defaults tuned for a game asset: 512 pipeline, 1024² textures, 100k triangles.
 * Models stay on the GPU between stages (faster) on Macs with 64 GB or more.
 */
export function localOptions(env = process.env, memory = totalmem()) {
  const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
  return {
    pipelineType: ['512', '1024', '1024_cascade'].includes(env.MODELGEN_LOCAL_PIPELINE) ? env.MODELGEN_LOCAL_PIPELINE : '512',
    textureSize: [512, 1024, 2048].includes(Number(env.MODELGEN_LOCAL_TEXTURE)) ? Number(env.MODELGEN_LOCAL_TEXTURE) : 1024,
    faces: num(env.MODELGEN_LOCAL_FACES, 100000),
    timeoutMs: num(env.MODELGEN_LOCAL_TIMEOUT_MIN, 30) * 60 * 1000,
    keepLoaded: env.MODELGEN_LOCAL_KEEP_LOADED ? env.MODELGEN_LOCAL_KEEP_LOADED !== '0' : memory >= 64 * 2 ** 30
  };
}

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
};

/**
 * One generation per Mac, across processes (dev server, preview, CLI): a lock
 * file holding the owner's pid. A dead owner's lock is taken over.
 */
async function acquireLock(file, job, { pollMs = 2000 } = {}) {
  await mkdir(dirname(file), { recursive: true });
  for (;;) {
    try {
      const handle = await open(file, 'wx');
      await handle.writeFile(String(process.pid));
      await handle.close();
      return async () => rm(file, { force: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
    const owner = Number(await readFile(file, 'utf8').catch(() => ''));
    if (!owner || !alive(owner)) {
      await rm(file, { force: true });
      continue;
    }
    job.step = 'Waiting for another generation on this computer';
    await new Promise((r) => setTimeout(r, pollMs));
  }
}

/**
 * Run one generation. `job` gets `step` / `progress` as the child reports
 * them; resolves to the GLB bytes. `spawn` is injectable for tests.
 */
export async function runLocal(job, { image, imagePath, seed = 42 }, { libraryRoot, env = process.env, spawn = spawnChild, log = () => {} } = {}) {
  const paths = localPaths(libraryRoot);
  const options = localOptions(env);
  const work = resolve(libraryRoot, 'my-models', '.jobs', job.id);
  await mkdir(work, { recursive: true });
  const unlock = await acquireLock(paths.lock, job, { pollMs: Number(env.MODELGEN_LOCAL_LOCK_POLL_MS) || 2000 });
  try {
    let input = imagePath;
    if (!input) {
      const [, ext, b64] = String(image ?? '').match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/) ?? [];
      if (!b64) throw new Error('send the image as a PNG, JPEG or WebP data URI');
      input = join(work, `input.${ext === 'jpeg' ? 'jpg' : ext}`);
      await writeFile(input, Buffer.from(b64, 'base64'));
    }
    const out = join(work, 'model.glb');
    const args = [
      RUNNER,
      '--tool', paths.tool,
      '--image', resolve(input),
      '--out', out,
      '--seed', String(seed),
      '--pipeline-type', options.pipelineType,
      '--texture-size', String(options.textureSize),
      '--faces', String(options.faces)
    ];
    if (options.keepLoaded) args.push('--keep-loaded');
    const result = await new Promise((ok, fail) => {
      const child = spawn(paths.python, args, {
        cwd: work,
        env: { ...env, HF_HUB_CACHE: paths.cache, HF_HUB_OFFLINE: '1', PYTHONUNBUFFERED: '1', PYTORCH_ENABLE_MPS_FALLBACK: '1' },
        stdio: ['ignore', 'pipe', 'pipe']
      });
      let done = null;
      let failure = null;
      let buffered = '';
      const tail = [];
      const timer = setTimeout(() => {
        failure = `timed out after ${Math.round(options.timeoutMs / 60000)} min`;
        child.kill('SIGTERM');
        setTimeout(() => child.kill('SIGKILL'), 5000).unref?.();
      }, options.timeoutMs);
      child.stdout.on('data', (chunk) => {
        buffered += chunk;
        let nl;
        while ((nl = buffered.indexOf('\n')) >= 0) {
          const line = buffered.slice(0, nl).trim();
          buffered = buffered.slice(nl + 1);
          if (!line.startsWith('{')) continue;
          let msg;
          try {
            msg = JSON.parse(line);
          } catch {
            continue;
          }
          if (msg.event === 'progress') {
            job.step = msg.step;
            job.progress = Math.max(job.progress ?? 0, Math.min(0.99, Number(msg.progress) || 0));
          } else if (msg.event === 'done') done = msg;
          else if (msg.event === 'error') failure ??= msg.message;
        }
      });
      child.stderr.on('data', (chunk) => {
        for (const line of String(chunk).split(/\r|\n/)) if (line.trim()) tail.push(line.trim());
        tail.splice(0, Math.max(0, tail.length - 20));
      });
      child.on('error', (error) => {
        clearTimeout(timer);
        fail(error);
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0 && done && !failure) return ok(done);
        log(`[models] local generator exited ${code}: ${tail.slice(-5).join(' | ')}`);
        fail(new Error(failure ?? `local generator exited with code ${code}${tail.length ? `: ${tail.at(-1)}` : ''}`));
      });
    });
    job.stats = { seconds: result.seconds, peakGpuBytes: result.peakGpuBytes, peakRssBytes: result.peakRssBytes, baker: result.baker };
    return await readFile(result.glb ?? out);
  } finally {
    await unlock();
    await rm(work, { recursive: true, force: true });
  }
}

/**
 * Runs async tasks one at a time, in order. `position(token)` is how many
 * tasks are ahead (0 = running).
 */
export function createSerialQueue() {
  const waiting = [];
  let running = null;
  const pump = () => {
    if (running || !waiting.length) return;
    running = waiting.shift();
    const { task, ok, fail, token } = running;
    token.onStart?.();
    Promise.resolve()
      .then(task)
      .then(ok, fail)
      .finally(() => {
        running = null;
        pump();
      });
  };
  return {
    push(task, token = {}) {
      return new Promise((ok, fail) => {
        waiting.push({ task, ok, fail, token });
        pump();
      });
    },
    position(token) {
      if (running?.token === token) return 0;
      const i = waiting.findIndex((w) => w.token === token);
      return i < 0 ? -1 : i + 1;
    },
    get size() {
      return waiting.length + (running ? 1 : 0);
    }
  };
}
