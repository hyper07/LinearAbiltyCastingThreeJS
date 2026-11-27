#!/usr/bin/env node
/**
 * The per-game dev loop: the platform's dev server, straight into one game's draft.
 *
 *   npm run game:dev -- <game> [--port 5180] [--<param> <value> …]
 *   npm run game:dev -- kickrani --race 1 --course <id> --laps 1 --time night --weather rain --autopilot 1
 *
 * It starts Vite (the same vite.config.js, so every API works) with GAME_DEV=<code>, which
 * stops it watching the other game packages, and prints the address that opens the game at
 * once: `?play=<slug>&draft=<slug>` plus any `--name value` given here as scene params (the
 * game reads them from `platform.params`; Kickrani's are in its README). Saving a file in
 * the game's folder reloads in a moment; no clicking through the home page.
 */
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { scanPackages, resolvePackage } from '../server/gamePackages.js';

const argv = process.argv.slice(2);
if (!argv[0] || argv[0].startsWith('--')) {
  console.log('Usage: npm run game:dev -- <game> [--port 5180] [--<scene param> <value> …]');
  process.exit(1);
}
let pkg;
try {
  pkg = resolvePackage(scanPackages(resolve('games')), argv[0]);
} catch (error) {
  console.error(`[game:dev] ${error.message}`);
  process.exit(1);
}
const params = new URLSearchParams({ play: pkg.slug, draft: pkg.slug });
let port = Number(process.env.PORT) || 5173;
for (let i = 1; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) continue;
  const key = a.slice(2);
  const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : '1';
  if (key === 'port') port = Number(value) || port;
  else if (/^[a-z][a-z0-9_-]{0,30}$/i.test(key)) params.set(key, value);
}
const url = `http://127.0.0.1:${port}/?${params}`;
console.log(`[game:dev] ${pkg.title} (games/${pkg.code}/), draft, live reload on its folder`);
console.log(`[game:dev] open ${url}`);
const child = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), '--port', String(port), '--strictPort'], {
  stdio: 'inherit',
  env: { ...process.env, GAME_DEV: pkg.code }
});
child.on('exit', (code) => process.exit(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
