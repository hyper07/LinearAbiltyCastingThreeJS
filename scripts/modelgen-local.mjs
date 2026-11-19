#!/usr/bin/env node
/**
 * Make a 3D model from one picture, free, on this Mac (TRELLIS.2), and add it
 * to "My models" (library/my-models), the same as the in-game Model Studio.
 *
 *   npm run modelgen:local -- <image> [--name "Treasure chest"] [--kind object|character]
 *                                     [--category misc] [--seed 42] [--json]
 *
 * Quality knobs, as environment variables (defaults in brackets):
 *   MODELGEN_LOCAL_PIPELINE   512 | 1024 | 1024_cascade   [512]
 *   MODELGEN_LOCAL_TEXTURE    512 | 1024 | 2048           [1024]
 *   MODELGEN_LOCAL_FACES      triangle budget             [100000]
 *   MODELGEN_LOCAL_TIMEOUT_MIN                            [30]
 *   MODELGEN_LOCAL_KEEP_LOADED 1 | 0 (keep models on the GPU) [1 with 64 GB+ RAM]
 *
 * Install it first with `npm run modelgen:setup`. Pictures with a transparent
 * background are used as they are; others are cut out with BiRefNet (MIT).
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createModelStore } from '../server/modelgen.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const out = { image: null, name: null, kind: 'object', category: 'misc', seed: 42, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--name') out.name = argv[++i];
    else if (a === '--kind') out.kind = argv[++i];
    else if (a === '--category') out.category = argv[++i];
    else if (a === '--seed') out.seed = Number(argv[++i]);
    else if (a === '--json') out.json = true;
    else if (a === '-h' || a === '--help') out.help = true;
    else if (!a.startsWith('--') && !out.image) out.image = a;
    else throw new Error(`unknown argument: ${a}`);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.image) {
    console.log('usage: npm run modelgen:local -- <image.png|jpg|webp> [--name x] [--kind object|character] [--category misc] [--seed 42] [--json]');
    process.exit(args.help ? 0 : 1);
  }
  const image = path.resolve(args.image);
  if (!existsSync(image)) throw new Error(`no such image: ${image}`);
  if (!/\.(png|jpe?g|webp)$/i.test(image)) throw new Error('use a PNG, JPEG or WebP picture');

  const store = createModelStore({
    libraryRoot: path.join(ROOT, 'library'),
    env: { ...process.env, MODELGEN_PROVIDER: 'local' },
    log: (line) => process.stderr.write(`${line}\n`)
  });
  const status = store.localStatus();
  if (!status.ready) throw new Error(`the local generator is not ready: ${status.reason}`);

  const started = Date.now();
  const job = store.startJob({
    name: args.name ?? path.basename(image).replace(/\.[^.]+$/, ''),
    imagePath: image,
    kind: args.kind === 'character' ? 'character' : 'object',
    category: args.category,
    seed: Number.isFinite(args.seed) ? args.seed : 42
  });
  let last = '';
  const timer = setInterval(() => {
    const line = `${job.step} ${Math.round(job.progress * 100)}%`;
    if (line !== last && !args.json) process.stderr.write(`  ${line}\n`);
    last = line;
  }, 1000);
  await job.done;
  clearInterval(timer);
  if (job.state !== 'done') throw new Error(job.error ?? 'generation failed');

  const seconds = Math.round((Date.now() - started) / 1000);
  if (args.json) {
    console.log(JSON.stringify({ model: job.model, stats: job.stats ?? null, seconds, note: job.note }, null, 1));
  } else {
    const m = job.model;
    console.log(`Made "${m.name}" in ${seconds}s → library/${m.file}`);
    console.log(`  ${m.triangles.toLocaleString()} triangles, size ${m.size.join(' × ')}`);
    if (job.stats?.peakGpuBytes) console.log(`  peak GPU memory ${(job.stats.peakGpuBytes / 2 ** 30).toFixed(1)} GB`);
    console.log(`  credit: ${m.credit}`);
    if (job.note) console.log(`  note: ${job.note}`);
  }
}

main().catch((error) => {
  console.error(`modelgen:local: ${error.message}`);
  process.exit(1);
});
