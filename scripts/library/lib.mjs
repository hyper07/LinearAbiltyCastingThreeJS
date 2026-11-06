/**
 * Shared plumbing for the asset-library fetchers: paths, polite HTTP with
 * retries, resumable downloads, a disk budget and a tiny concurrency pool.
 *
 * Node built-ins only, so `npm run library:fetch` works on a fresh clone on
 * macOS, Linux and Windows without installing anything.
 */
import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat, writeFile, readFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..');
/** Everything downloaded lives here. Git-ignored: the library is fetched, not committed. */
export const LIBRARY = path.join(ROOT, 'library');
export const MANIFESTS = path.join(LIBRARY, 'sources');

/** Honest client name — no browser impersonation. */
const USER_AGENT = 'elemental-arena-asset-fetcher/1.0 (+https://github.com/hyper07/LinearAbiltyCastingThreeJS)';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function exists(file) {
  try {
    return await stat(file);
  } catch {
    return null;
  }
}

/** Library-relative POSIX path, which is also the URL path under /library/. */
export const rel = (file) => path.relative(LIBRARY, file).split(path.sep).join('/');

/** Keep a path segment safe on every OS (Windows is the strict one). */
export const safeName = (name) =>
  String(name)
    .replace(/[<>:"\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 120) || 'asset';

async function request(url, { retries = 4, accept } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, ...(accept ? { Accept: accept } : {}) },
        redirect: 'follow'
      });
      if (response.ok) return response;
      // 4xx other than rate limiting will not get better by retrying.
      if (response.status !== 429 && response.status < 500) {
        throw Object.assign(new Error(`HTTP ${response.status} for ${url}`), { fatal: true });
      }
      lastError = new Error(`HTTP ${response.status} for ${url}`);
      const retryAfter = Number(response.headers.get('retry-after'));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1500 * 2 ** attempt);
    } catch (error) {
      if (error.fatal) throw error;
      lastError = error;
      await sleep(1000 * 2 ** attempt);
    }
  }
  throw lastError;
}

export async function getJson(url) {
  const response = await request(url, { accept: 'application/json' });
  return response.json();
}

/**
 * Disk budget shared by every source in one run. `charge` is called before a
 * download with the expected size (when known) and after it with the real one.
 */
export class Budget {
  constructor(maxBytes) {
    this.maxBytes = maxBytes;
    this.used = 0;
    this.downloaded = 0;
    this.skipped = 0;
  }
  get exhausted() {
    return this.used >= this.maxBytes;
  }
  fits(bytes = 0) {
    return this.used + bytes <= this.maxBytes;
  }
}

/**
 * Download `url` to `dest` unless an identical-size copy is already there.
 * Writes to `<dest>.part` and renames, so an interrupted run never leaves a
 * truncated file that a later run would mistake for a finished one.
 *
 * @returns {Promise<number>} bytes now on disk for this file
 */
export async function download(url, dest, budget, expectedSize = 0) {
  const have = await exists(dest);
  if (have && (!expectedSize || have.size === expectedSize)) {
    budget.used += have.size;
    budget.skipped++;
    return have.size;
  }
  if (!budget.fits(expectedSize)) throw Object.assign(new Error('budget'), { budget: true });

  await mkdir(path.dirname(dest), { recursive: true });
  const part = `${dest}.part`;
  const response = await request(url);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(part));
  await rename(part, dest);
  const size = (await stat(dest)).size;
  budget.used += size;
  budget.downloaded += size;
  return size;
}

/** Run `worker` over `items` with at most `limit` in flight. */
export async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

/**
 * Extract a .zip with the system `tar` (bsdtar on macOS and Windows 10+,
 * libarchive-backed on most Linux; GNU tar users need `unzip`, tried second).
 */
export async function extractZip(zipFile, outDir) {
  await mkdir(outDir, { recursive: true });
  const run = (cmd, args) =>
    new Promise((resolve, reject) => {
      const child = spawn(cmd, args, { stdio: 'ignore' });
      child.on('error', reject);
      child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
    });
  try {
    await run('tar', ['-xf', zipFile, '-C', outDir]);
  } catch {
    await run('unzip', ['-q', '-o', zipFile, '-d', outDir]);
  }
}

export async function walk(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

export async function removeDir(dir) {
  await rm(dir, { recursive: true, force: true });
}

/** One manifest per source: what was fetched, from where, under what licence. */
export async function writeManifest(source, assets) {
  await mkdir(MANIFESTS, { recursive: true });
  const file = path.join(MANIFESTS, `${source}.json`);
  await writeFile(file, JSON.stringify({ source, fetchedAt: new Date().toISOString(), assets }, null, 1));
  return file;
}

export async function readManifest(source) {
  try {
    return JSON.parse(await readFile(path.join(MANIFESTS, `${source}.json`), 'utf8'));
  } catch {
    return null;
  }
}

export const formatBytes = (bytes) => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit ? 1 : 0)} ${units[unit]}`;
};

export function log(source, message) {
  console.log(`[${source}] ${message}`);
}
