import { chromium } from 'playwright';

/**
 * Shared bits for the end-to-end runs: a browser with the GPU on, a page
 * booted to the main menu, and a page-error collector. The game exposes
 * itself as `window.app`, which is what the checks poke at.
 */

/** Read when used, not when imported: run.mjs sets it after starting its server. */
export const base = () => process.env.BASE_URL ?? 'http://127.0.0.1:5173/';

export function launch() {
  const args = ['--enable-gpu', '--ignore-gpu-blocklist'];
  if (process.platform === 'darwin') args.push('--use-angle=metal');
  return chromium.launch({ args });
}

/**
 * Requests that are meant to miss: the optional walk/run clips (the game
 * falls back to its own gait), "is this already in the library?" lookups,
 * and Shardfront's list of your own models (none, unless you add one).
 */
const EXPECTED_MISSES = [/^\/models\/(walk|run)\.fbx$/, /^\/api\/library\/[a-z]+(:|%3A)/i, /^\/library\/my-models\/shardfront\.json$/];

/**
 * A fresh context (its own localStorage), booted to the platform's home page
 * and then — unless `view: 'home'` — into the hero menu (class, weapon,
 * Start), where most checks begin.
 */
export async function boot(browser, name = 'page', { view = 'hero' } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`${name}: ${error.message}`));
  page.on('console', (message) => {
    // Failed requests are judged below, by their address; the browser's own line says nothing useful.
    if (message.type() === 'error' && !/AssetLoader|favicon|net::ERR|Failed to load resource/.test(message.text())) errors.push(`${name} console: ${message.text()}`);
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const path = new URL(response.url()).pathname;
    if (EXPECTED_MISSES.some((re) => re.test(path)) && response.status() === 404) return;
    errors.push(`${name} ${response.status()} ${response.request().method()} ${path}`);
  });
  await page.goto(base(), { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.app && window.app.phase === 'menu', null, { timeout: 120000 });
  // The loading veil fades out over the page: wait until a click would reach it, as a player's does.
  const clickable = (selector) =>
    page.waitForFunction((sel) => {
      const b = document.querySelector(sel)?.getBoundingClientRect();
      return b && b.width && document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)?.closest(sel);
    }, selector, { timeout: 30000 });
  await clickable('.home [data-hero]');
  if (view !== 'home') {
    await page.click('.home [data-hero]');
    await clickable('[data-start]');
  }
  return { context, page, errors, name };
}

/** `check(name, condition)` with a tally, so a run prints every failure, not the first. */
export function tally() {
  const results = [];
  return {
    results,
    check(name, ok, detail = '') {
      results.push({ name, ok: Boolean(ok), detail });
      console.log(`${ok ? '  ✓' : '  ✗'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
      return Boolean(ok);
    },
    get failed() {
      return results.filter((r) => !r.ok);
    }
  };
}

/** Wait until `fn` (evaluated in the page) is truthy, or fail the check. */
export async function until(page, fn, arg = null, ms = 8000) {
  try {
    await page.waitForFunction(fn, arg, { timeout: ms });
    return true;
  } catch {
    return false;
  }
}

/**
 * Answer "Choose your character" if a game asks (the first time a player
 * joins it). Returns whether it was asked.
 */
export async function pickHero(page, id, ms = 15000) {
  const asked = await until(page, () => window.app.rosterPicker?.isOpen, null, ms);
  if (asked) await page.click(`.roster [data-hero="${id}"]`);
  return asked;
}
