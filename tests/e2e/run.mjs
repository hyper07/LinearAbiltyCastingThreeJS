import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { launch } from './lib.mjs';
import { run as solo } from './solo.mjs';
import { run as coop } from './coop.mjs';
import { run as accounts } from './accounts.mjs';
import { run as bag } from './bag.mjs';
import { run as editor } from './editor.mjs';
import { run as hotbar } from './hotbar.mjs';
import { run as builder } from './builder.mjs';
import { run as home } from './home.mjs';
import { run as royale } from './royale.mjs';
import { run as market } from './market.mjs';
import { run as work } from './work.mjs';
import { run as rts } from './rts.mjs';

/**
 * The end-to-end runs, against the real production server.
 *
 *   npm run build && npm run test:e2e           builds, serves dist/, tests
 *   BASE_URL=http://127.0.0.1:5173/ npm run test:e2e   against a running dev server
 *
 * Needs Playwright's Chromium: `npx playwright install chromium` once.
 */

const ONLY = process.argv.slice(2);
let server = null;
let dataDir = null;

if (!process.env.BASE_URL) {
  const port = 8790 + Math.floor(Math.random() * 100);
  dataDir = await mkdtemp(join(tmpdir(), 'gamory-e2e-'));
  server = spawn(process.execPath, [resolve('server/server.js')], {
    // The stock game on made-up prices, with a test admin id and password, so the tests need no keys.
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, STATIC_ROOT: resolve('dist'), LLM_PLATFORM_BASE_URL: '', MARKET_PROVIDER: 'fixture', WORK_NEWS_PROVIDER: 'fixture', WORK_AI: 'off', ADMIN_ACCOUNTS: 'siteadmin', ADMIN_PASSWORD: 'test-admin-pass' },
    stdio: ['ignore', 'pipe', 'inherit']
  });
  process.env.BASE_URL = `http://127.0.0.1:${port}/`;
  await new Promise((ready, fail) => {
    server.stdout.on('data', (chunk) => {
      process.stdout.write(`  ${chunk}`);
      if (String(chunk).includes('listening')) ready();
    });
    server.on('exit', (code) => fail(new Error(`server exited (${code})`)));
    setTimeout(() => fail(new Error('server did not start')), 10000);
  });
}

const browser = await launch();
let failed = 0;
try {
  for (const [name, fn] of [['solo', solo], ['coop', coop], ['accounts', accounts], ['bag', bag], ['editor', editor], ['hotbar', hotbar], ['builder', builder], ['home', home], ['royale', royale], ['market', market], ['work', work], ['rts', rts]]) {
    if (ONLY.length && !ONLY.includes(name)) continue;
    console.log(`\n${name}`);
    const t = await fn(browser);
    failed += t.failed.length;
  }
} finally {
  await browser.close();
  if (server && server.exitCode === null) {
    // Let it close the database (PGlite writes on close) before its folder goes.
    const exited = new Promise((r) => server.once('exit', r));
    server.kill('SIGTERM');
    await Promise.race([exited, new Promise((r) => setTimeout(r, 8000))]);
  }
  if (dataDir) await rm(dataDir, { recursive: true, force: true, maxRetries: 3 });
}
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
