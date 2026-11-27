#!/usr/bin/env node
/**
 * One short headless check of one game package — a minute, not the full e2e:
 *
 *   npm run game:smoke -- <game> [--release x.y.z] [--seconds 10] [--params "course=…&laps=1"]
 *
 * Opens BASE_URL (default http://127.0.0.1:5173/, the dev server must be up) at
 * `?play=<slug>&draft=<slug>` (or `&release=<version>` for a staged/old release), waits for
 * the platform to say the package mounted, lets it run `seconds`, and fails on any console
 * error or uncaught exception. One screenshot: .captures/smoke-<slug>.png. The manifest's
 * `smoke.params` are added to the address (Kickrani: straight into a race on autopilot).
 *
 * `game:deploy` runs the same check on the staged release before players get it (skip with --force).
 */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanPackages, resolvePackage, VERSION_RE } from '../server/gamePackages.js';

/** Console lines that are not the game's fault (the dev server's own chatter). */
const NOISE = [/\[vite\]/i, /Download the React DevTools/i, /favicon\.ico/i, /net::ERR_ABORTED.*\/library\//i, /Failed to load resource: the server responded with a status of 404/i];

/** The address the check opens. */
export function smokeUrl(baseUrl, pkg, { version = null, params = '' } = {}) {
  const u = new URL(baseUrl);
  u.searchParams.set('play', pkg.slug);
  if (version) u.searchParams.set('release', version);
  else u.searchParams.set('draft', pkg.slug);
  for (const [k, v] of new URLSearchParams(params || pkg.smoke?.params || '')) u.searchParams.set(k, v);
  return u.href;
}

/**
 * @returns {Promise<{ ok: boolean, problems: string[], shot: string|null, skipped?: string }>}
 */
export async function runSmoke({ baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173/', pkg, version = null, seconds = pkg.smoke?.seconds ?? 10, params = '', shotDir = '.captures', requireServer = true }) {
  try {
    const r = await fetch(new URL('api/releases', baseUrl), { signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error(String(r.status));
  } catch (error) {
    const why = `no platform server at ${baseUrl} (${error.message}) — start npm run dev or set BASE_URL`;
    return requireServer ? { ok: false, problems: [why], shot: null } : { ok: true, problems: [], shot: null, skipped: why };
  }
  // The e2e runs' own browser: GPU on (Metal on a Mac).
  const { launch } = await import('../tests/e2e/lib.mjs');
  const browser = await launch();
  const problems = [];
  let shot = null;
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const text = m.text();
      if (!NOISE.some((re) => re.test(text))) problems.push(`console: ${text.slice(0, 300)}`);
    });
    page.on('pageerror', (e) => problems.push(`exception: ${String(e.message ?? e).slice(0, 300)}`));
    let mounted = false;
    page.on('console', (m) => {
      if (m.type() === 'info' && m.text().startsWith(`[packages] ${pkg.title}:`)) mounted = true;
    });
    await page.goto(smokeUrl(baseUrl, pkg, { version, params }), { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const until = Date.now() + 60_000;
    while (!mounted && Date.now() < until && !problems.length) await page.waitForTimeout(250);
    if (!mounted) problems.push(`${pkg.title} did not mount within 60 s`);
    else await page.waitForTimeout(seconds * 1000);
    mkdirSync(shotDir, { recursive: true });
    shot = join(shotDir, `smoke-${pkg.slug}${version ? `-${version}` : ''}.png`);
    await page.screenshot({ path: shot }).catch(() => (shot = null));
  } finally {
    await browser.close();
  }
  return { ok: !problems.length, problems, shot };
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] ?? '')) {
  const args = process.argv.slice(2);
  const opt = (name) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : null;
  };
  try {
    const pkg = resolvePackage(scanPackages(resolve('games')), args[0]);
    const version = opt('release');
    if (version && !VERSION_RE.test(version)) throw new Error(`"${version}" is not a version`);
    const r = await runSmoke({ pkg, version, seconds: Number(opt('seconds')) || undefined, params: opt('params') ?? '' });
    for (const p of r.problems) console.error(`  ✗ ${p}`);
    console.log(`${r.ok ? 'ok' : 'FAILED'}: ${pkg.title} ${version ?? 'draft'}${r.shot ? ` — ${r.shot}` : ''}`);
    process.exitCode = r.ok ? 0 : 1;
  } catch (error) {
    console.error(`[smoke] ${error.message}`);
    process.exitCode = 1;
  }
}
