#!/usr/bin/env node
/**
 * Download the open 3D asset library into ./library and build its catalog.
 *
 *   npm run library:fetch                         # every source, 40 GB cap
 *   npm run library:fetch -- --sources polyhaven,kaykit
 *   npm run library:fetch -- --max-gb 10 --res 2k
 *   npm run library:fetch -- --materials 20       # more ambientCG terrain materials per query
 *
 * Safe to re-run: finished files are skipped, so an interrupted run resumes
 * where it stopped and a later run only picks up what is new upstream.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Budget, LIBRARY, formatBytes, log, readManifest, writeManifest } from './lib.mjs';
import { SOURCES } from './sources.mjs';
import { buildCatalog } from './index.mjs';

/** Smallest first, so a fresh library has usable models within a minute. */
const DEFAULT_ORDER = ['kaykit', 'polygonalmind', 'ambientcg', 'polyhaven', 'inbox'];
const STATUS = path.join(LIBRARY, 'status.json');
const LOCK = path.join(LIBRARY, '.fetch.lock');

function parseArgs(argv) {
  const args = {
    sources: DEFAULT_ORDER.filter((s) => SOURCES[s]),
    maxGb: Number(process.env.LIBRARY_MAX_GB) || 40,
    res: '1k',
    materials: 6
  };
  for (let i = 0; i < argv.length; i++) {
    const [key, inline] = argv[i].split('=');
    const value = inline ?? argv[i + 1];
    const take = () => (inline === undefined ? i++ : null);
    if (key === '--sources') (args.sources = value.split(',').map((s) => s.trim())), take();
    else if (key === '--max-gb') (args.maxGb = Number(value)), take();
    else if (key === '--res') (args.res = value), take();
    else if (key === '--materials') (args.materials = Number(value)), take();
    else if (key === '--help' || key === '-h') args.help = true;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log('Usage: npm run library:fetch -- [--sources a,b] [--max-gb 40] [--res 1k|2k|4k] [--materials 6]');
  console.log(`Sources: ${Object.keys(SOURCES).join(', ')}`);
  process.exit(0);
}

const unknown = args.sources.filter((s) => !SOURCES[s]);
if (unknown.length) {
  console.error(`Unknown source(s): ${unknown.join(', ')}. Known: ${Object.keys(SOURCES).join(', ')}`);
  process.exit(1);
}

/* One fetch at a time: `npm run dev` may start one while you run another. */
await mkdir(LIBRARY, { recursive: true });
try {
  const pid = Number(await readFile(LOCK, 'utf8'));
  if (pid && pid !== process.pid) {
    try {
      process.kill(pid, 0);
      console.log(`[library] another download is already running (pid ${pid}) — leaving it to finish.`);
      process.exit(0);
    } catch {
      /* stale lock from a crashed run */
    }
  }
} catch {
  /* no lock */
}
await writeFile(LOCK, String(process.pid));
const releaseLock = () => rm(LOCK, { force: true }).catch(() => {});
process.on('SIGINT', () => releaseLock().then(() => process.exit(130)));
process.on('SIGTERM', () => releaseLock().then(() => process.exit(143)));

const budget = new Budget(args.maxGb * 1024 ** 3);
const started = Date.now();
const status = {
  state: 'running',
  sources: args.sources,
  done: [],
  current: null,
  models: 0,
  materials: 0,
  bytes: 0,
  startedAt: new Date().toISOString(),
  updatedAt: null
};
const saveStatus = async () => {
  status.updatedAt = new Date().toISOString();
  status.bytes = budget.used;
  await writeFile(STATUS, JSON.stringify(status)).catch(() => {});
};
await saveStatus();
const ticker = setInterval(saveStatus, 3000);

for (const source of args.sources) {
  if (budget.exhausted) {
    log(source, 'skipped — disk budget reached (raise --max-gb)');
    continue;
  }
  status.current = source;
  await saveStatus();
  log(source, 'starting');
  try {
    const assets = await SOURCES[source]({
      budget,
      resolution: source === 'ambientcg' ? `${args.res.toUpperCase()}-JPG` : args.res,
      perQuery: args.materials
    });
    // A source that failed outright keeps its previous manifest rather than
    // wiping a perfectly good catalog entry list.
    if (assets.length || !(await readManifest(source))) await writeManifest(source, assets);
    log(source, `${assets.length} assets`);
  } catch (error) {
    log(source, `failed: ${error.message}`);
  }
  // Re-index after every source, so the game can use each pack as it lands.
  const partial = await buildCatalog();
  status.done.push(source);
  status.models = partial.models;
  status.materials = partial.materials;
  await saveStatus();
}
clearInterval(ticker);

console.log(
  `\nDownloaded ${formatBytes(budget.downloaded)}, library holds ${formatBytes(budget.used)} ` +
    `(${budget.skipped} files already present) in ${((Date.now() - started) / 60000).toFixed(1)} min.`
);

const summary = await buildCatalog();
status.state = 'done';
status.current = null;
status.models = summary.models;
status.materials = summary.materials;
await saveStatus();
await releaseLock();
console.log(`Catalog: ${summary.models} models, ${summary.materials} materials → library/catalog.json`);
console.log(summary.byCategory.map(([c, n]) => `  ${c.padEnd(12)} ${n}`).join('\n'));
