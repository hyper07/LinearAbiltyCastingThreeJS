import { chromium } from 'playwright';

/**
 * Shared bits for the end-to-end runs: a browser with the GPU on, a page
 * booted to the main menu, and a page-error collector. The game exposes
 * itself as `window.app`, which is what the checks poke at.
 */

export const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173/';

export function launch() {
  const args = ['--enable-gpu', '--ignore-gpu-blocklist'];
  if (process.platform === 'darwin') args.push('--use-angle=metal');
  return chromium.launch({ args });
}

/** A fresh context (its own localStorage) at the main menu. */
export async function boot(browser, name = 'page') {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`${name}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/AssetLoader|favicon|net::ERR/.test(message.text())) errors.push(`${name} console: ${message.text()}`);
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.app && window.app.phase === 'menu', null, { timeout: 120000 });
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
