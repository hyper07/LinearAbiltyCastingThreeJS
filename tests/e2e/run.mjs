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
import { run as lanebreak } from './lanebreak.mjs';
import { run as hearthvale } from './hearthvale.mjs';
import { run as breachline } from './breachline.mjs';
import { run as bastion } from './bastion.mjs';
import { run as channels } from './channels.mjs';
import { run as graphics } from './graphics.mjs';
import { run as camera } from './camera.mjs';
import { run as map } from './map.mjs';
import { run as help } from './help.mjs';
import { run as zones } from './zones.mjs';
import { run as voice } from './voice.mjs';
import { run as camdrag } from './camdrag.mjs';
import { run as snowpuff } from './snowpuff.mjs';
import { run as circuitlab } from './circuitlab.mjs';
import { run as worlds } from './worlds.mjs';
import { run as jarani } from './jarani.mjs';
import { run as activities } from './activities.mjs';

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
    // VOICE_DIR: the voice studio's recordings go to this run's own folder, never public/audio/voice.
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, VOICE_DIR: join(dataDir, 'voice'), STATIC_ROOT: resolve('dist'), LLM_PLATFORM_BASE_URL: '', MARKET_PROVIDER: 'fixture', WORK_NEWS_PROVIDER: 'fixture', WORK_AI: 'off', WORK_SPEED: '1', ADMIN_ACCOUNTS: 'siteadmin', ADMIN_PASSWORD: 'test-admin-pass', ACCOUNTS_PER_ADDRESS_PER_DAY: '50' },
    stdio: ['ignore', 'pipe', 'inherit']
  });
  process.env.BASE_URL = `http://127.0.0.1:${port}/`;
  process.env.E2E_VOICE_DIR = join(dataDir, 'voice');
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
  for (const [name, fn] of [['solo', solo], ['coop', coop], ['accounts', accounts], ['bag', bag], ['editor', editor], ['hotbar', hotbar], ['builder', builder], ['home', home], ['royale', royale], ['market', market], ['work', work], ['rts', rts], ['lanebreak', lanebreak], ['hearthvale', hearthvale], ['breachline', breachline], ['bastion', bastion], ['channels', channels], ['graphics', graphics], ['camera', camera], ['map', map], ['help', help], ['zones', zones], ['voice', voice], ['camdrag', camdrag], ['snowpuff', snowpuff], ['circuitlab', circuitlab], ['worlds', worlds], ['jarani', jarani], ['activities', activities]]) {
    if (ONLY.length && !ONLY.includes(name)) continue;
    console.log(`\n${name}`);
    // (a suite that throws — a page gone, a selector never there — counts as one failure and the rest
    // still run: one broken game used to stop every suite after it)
    try {
      const t = await fn(browser);
      failed += t.failed.length;
    } catch (error) {
      console.log(`  ✗ ${name} stopped: ${String(error?.message ?? error).split('\n')[0]}`);
      failed++;
    }
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
