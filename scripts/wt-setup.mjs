#!/usr/bin/env node
/**
 * A fresh git worktree (an agent's, under .claude/worktrees/) ready to run in one command:
 *
 *   npm run wt:setup
 *
 * Links from the main checkout what is never committed but needed to run:
 *   node_modules/                   the dependencies (and apps/circuitlab/node_modules)
 *   library/                        the downloaded 3D asset library (gigabytes)
 *   data/geo/                       Seoul's map tiles (Kickrani)
 * and NEVER data/postgres (the database: one opener at a time — a second one corrupts it),
 * nor .env (secrets; copy it yourself if this worktree needs the AI keys).
 *
 * The dev server already allows the linked folders (vite.config.js servedFolders), so no
 * temporary Vite config is needed for the fonts any more. Safe to run twice.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, symlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const here = resolve('.');
const common = spawnSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' }).stdout.trim();
if (!common) {
  console.error('[wt:setup] not in a git checkout');
  process.exit(1);
}
const main = dirname(common);
if (main === here) {
  console.log('[wt:setup] this is the main checkout: nothing to link.');
  process.exit(0);
}
const LINKS = ['node_modules', 'library', join('data', 'geo'), join('apps', 'circuitlab', 'node_modules')];
for (const rel of LINKS) {
  const src = join(main, rel);
  const dst = join(here, rel);
  let exists = false;
  try {
    lstatSync(dst);
    exists = true;
  } catch {
    /* not there */
  }
  if (exists) {
    console.log(`  = ${rel} (already there)`);
    continue;
  }
  if (!existsSync(src)) {
    console.log(`  - ${rel} (not in the main checkout: skipped)`);
    continue;
  }
  mkdirSync(dirname(dst), { recursive: true });
  symlinkSync(src, dst, 'dir');
  console.log(`  + ${rel} → ${src}`);
}
if (existsSync(join(here, 'data', 'postgres'))) console.warn('[wt:setup] warning: data/postgres exists in this worktree — never link the main database here.');
console.log('[wt:setup] ready: npm run dev (or npm run game:dev -- <game>).');
