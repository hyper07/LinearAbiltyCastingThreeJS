#!/usr/bin/env node
/**
 * Make sure the 3D asset library is downloaded.
 *
 * Runs before `npm run build` (blocking) and from the Vite dev server (in the
 * background — see `assetLibrary()` in vite.config.js). A finished library is
 * a fast no-op; a missing or interrupted one is fetched, resuming where it
 * stopped. Set LIBRARY_AUTO_FETCH=0 to skip this entirely (CI, Docker builds,
 * small disks) and run `npm run library:fetch` yourself.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { EXTRAS_VERSION } from './sources.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const LIBRARY = path.join(ROOT, 'library');

const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/**
 * @returns {{ needed: boolean, reason: string, models: number }}
 */
export function libraryState() {
  if (process.env.LIBRARY_AUTO_FETCH === '0') return { needed: false, reason: 'LIBRARY_AUTO_FETCH=0', models: 0 };
  const status = readJson(path.join(LIBRARY, 'status.json'));
  const lockPid = Number(readJson(path.join(LIBRARY, '.fetch.lock')));
  if (lockPid && alive(lockPid)) return { needed: false, reason: 'a download is already running', models: status?.models ?? 0 };
  // A finished library from before the extras (named files games need) fetches just those.
  const extrasDone = Number(readJson(path.join(LIBRARY, 'extras', '.done')) ?? 0) >= EXTRAS_VERSION;
  const ready = (status?.state === 'done' && status.models > 0) || (!status && readJson(path.join(LIBRARY, 'catalog.json'))?.models?.length);
  if (ready && !extrasDone) return { needed: true, reason: 'new game assets to add', models: status?.models ?? 0, sources: ['extras'] };
  // Only the model count is needed; the catalog can be a few MB, so peek at the status first.
  if (status?.state === 'done' && status.models > 0) return { needed: false, reason: 'ready', models: status.models };
  if (status?.state === 'running') return { needed: true, reason: 'the last download was interrupted — resuming', models: status.models ?? 0 };
  const catalog = readJson(path.join(LIBRARY, 'catalog.json'));
  if (catalog?.models?.length && !status) return { needed: false, reason: 'ready', models: catalog.models.length };
  return { needed: true, reason: 'no asset library yet', models: 0 };
}

/** Start the fetcher. `background` pipes its log through `onLine` instead of the terminal. */
export function startFetch({ background = false, onLine, sources = null } = {}) {
  const child = spawn(process.execPath, [path.join(HERE, 'fetch.mjs'), ...(sources ? ['--sources', sources.join(',')] : [])], {
    cwd: ROOT,
    stdio: background ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    env: process.env
  });
  if (background) {
    let buffer = '';
    const feed = (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();
      for (const line of lines) if (line.trim()) onLine?.(line);
    };
    child.stdout.setEncoding('utf8').on('data', feed);
    child.stderr.setEncoding('utf8').on('data', feed);
  }
  return child;
}

// `node scripts/library/ensure.mjs` — the blocking form, used by `prebuild`.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const state = libraryState();
  if (!state.needed) {
    console.log(`[library] ${state.reason === 'ready' ? `ready — ${state.models} models` : state.reason}`);
  } else {
    console.log(`[library] ${state.reason}: downloading the open 3D asset library (~7 GB, resumable).`);
    console.log('[library] Set LIBRARY_AUTO_FETCH=0 to skip; the game then uses placeholder shapes.');
    const child = startFetch({ sources: state.sources });
    const code = await new Promise((resolve) => child.on('close', resolve));
    // A failed download must not fail the build: the game runs without the library.
    if (code) console.warn(`[library] download exited with code ${code}; continuing without a complete library.`);
  }
}
