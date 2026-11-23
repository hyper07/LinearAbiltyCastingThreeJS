/**
 * Circuit Lab (apps/circuitlab) is its own React + TypeScript app with its own
 * package.json and its own pinned three.js (the path tracer needs it). This
 * script keeps it in step with the platform:
 *
 *   node scripts/circuitlab.mjs ensure   install its dependencies if missing or stale
 *   node scripts/circuitlab.mjs build    ensure, then build it into dist/circuitlab
 *   node scripts/circuitlab.mjs test     ensure, then run its vitest suite
 *
 * `npm run build` runs `build` after the platform's own vite build, and
 * `npm test` runs `test` after the platform's unit tests. `npm run dev` serves
 * it at /circuitlab/ through vite.config.js (a nested Vite dev server).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const APP = resolve('apps/circuitlab');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

export function needsInstall(app = APP) {
  const lock = resolve(app, 'package-lock.json');
  const marker = resolve(app, 'node_modules/.package-lock.json');
  if (!existsSync(marker)) return true;
  try {
    return statSync(lock).mtimeMs > statSync(marker).mtimeMs + 1000;
  } catch {
    return true;
  }
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: APP, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

export function ensure() {
  if (!needsInstall()) return;
  console.log('[circuitlab] installing its dependencies (apps/circuitlab)…');
  run(npm, ['ci', '--no-audit', '--no-fund']);
}

const main = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
const command = main ? process.argv[2] : null;
if (command === 'ensure') ensure();
else if (command === 'build') {
  ensure();
  run(npm, ['run', 'build', '--', '--outDir', resolve('dist/circuitlab'), '--emptyOutDir']);
} else if (command === 'test') {
  ensure();
  run(npm, ['test']);
} else if (command) {
  console.error(`unknown command: ${command} (ensure | build | test)`);
  process.exit(2);
}
