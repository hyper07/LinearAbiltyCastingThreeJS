/**
 * Loading a game package (games/<code>/) — the platform's generic loader. It never imports
 * a game statically: production is a URL read from releases/<code>/current.json at run
 * time, the draft a URL into the game's source folder (dev) or an admin's draft build.
 *
 *   production  releases/<code>/<version>/game.js (+ game.css): what players always get
 *   draft       games/<code>/<entry> through Vite (npm run dev), live; for an admin on a
 *               production server, the committed draft built on demand (POST /api/releases/<code>/draft)
 *
 * The draft is used only when asked for (`?draft=<code|slug|id>` or the admin's "Play draft")
 * AND allowed (the dev server, or the platform admin) — or when a game has no release yet
 * and the caller may see drafts. Everything else gets production.
 */

/** Which build to run. Returns null when this caller may not play it at all (a draft-only game). */
export function chooseChannel({ requested = null, dev = false, admin = false, hasRelease = true } = {}) {
  const draftAllowed = Boolean(dev || admin);
  if (requested === 'draft' && draftAllowed) return 'draft';
  if (hasRelease) return 'production';
  return draftAllowed ? 'draft' : null;
}

/** Whether the page's query asks for this package's draft: ?draft=<code|slug|id> (or ?draft=1 for any). */
export function draftRequested(search, pkg) {
  const want = new URLSearchParams(search ?? '').get('draft');
  if (!want) return false;
  const w = want.toLowerCase();
  return w === '1' || w === 'true' || w === pkg.code || w === pkg.slug || w === String(pkg.id).toLowerCase();
}

/**
 * A specific release asked for by address (?release=x.y.z): a staged or older release, for the
 * deploy's smoke check and the admin's comparisons. Honoured only for the dev server or admin.
 */
export function releaseRequested(search) {
  const v = new URLSearchParams(search ?? '').get('release');
  return v && /^\d{1,4}\.\d{1,5}\.\d{1,6}$/.test(v) ? v : null;
}

const CODE_RE = /^g_[a-z2-7]{10}$/;
const VERSION_RE = /^\d{1,4}\.\d{1,5}\.\d{1,6}$/;
const FILE_RE = /^[a-zA-Z0-9_./-]+$/;

/**
 * Where a package's entry module and stylesheets are, for a channel.
 * @param {{ code: string, entry?: string }} pkg
 * @param {{ channel: 'production'|'draft', dev?: boolean, fetchJson: (url: string, init?: object) => Promise<any>, base?: string }} options
 * @returns {Promise<{ url: string, css: string[], version: string|null, channel: string }>}
 */
export async function resolveEntry(pkg, { channel, dev = false, fetchJson, base = '', version = null }) {
  if (!CODE_RE.test(pkg.code ?? '')) throw new Error(`Not a game package: ${pkg.code}`);
  if (channel === 'draft') {
    if (dev) {
      const entry = pkg.entry && FILE_RE.test(pkg.entry) && !pkg.entry.includes('..') ? pkg.entry : 'index.js';
      return { url: `/games/${pkg.code}/${entry}`, css: [], version: null, channel };
    }
    const built = await fetchJson(`${base}api/releases/${pkg.code}/draft`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    return { url: `${base}${built.entry}`, css: (built.css ?? []).map((c) => `${base}${c}`), version: null, channel };
  }
  const current = version ? { version } : await fetchJson(`${base}releases/${pkg.code}/current.json`, { cache: 'no-cache' });
  if (!current || !VERSION_RE.test(current.version ?? '')) throw new Error(`${pkg.title ?? pkg.code} has no production release yet`);
  const dir = `${base}releases/${pkg.code}/${current.version}/`;
  const release = await fetchJson(`${dir}release.json`, { cache: 'no-cache' });
  const entry = FILE_RE.test(release.entry ?? '') && !release.entry.includes('..') ? release.entry : 'game.js';
  const css = (release.css ?? []).filter((c) => FILE_RE.test(c) && !c.includes('..')).map((c) => `${dir}${c}`);
  return { url: `${dir}${entry}`, css, version: current.version, channel };
}

async function defaultFetchJson(url, init) {
  const r = await fetch(url, { credentials: 'same-origin', ...init });
  if (!r.ok) {
    let why = `${r.status}`;
    try {
      why = (await r.json()).error ?? why;
    } catch {
      /* not JSON */
    }
    throw new Error(why);
  }
  return r.json();
}

/** Put a release's stylesheets on the page once (they stay: a stylesheet costs nothing idle). */
function addStyles(urls) {
  for (const href of urls) {
    const abs = new URL(href, document.baseURI).href;
    if ([...document.querySelectorAll('link[data-game-package]')].some((l) => l.href === abs)) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = abs;
    link.dataset.gamePackage = '1';
    document.head.append(link);
  }
}

/**
 * Load a package's module for a channel. @returns {{ module, channel, version, url }}
 */
export async function loadPackage(pkg, { channel, dev = false, fetchJson = defaultFetchJson, base = '', version = null }) {
  const where = await resolveEntry(pkg, { channel, dev, fetchJson, base, version });
  addStyles(where.css);
  const url = new URL(where.url, document.baseURI).href;
  const module = await import(/* @vite-ignore */ url);
  if (typeof module.mount !== 'function') throw new Error(`${pkg.title ?? pkg.code}: its entry has no mount()`);
  return { module, channel: where.channel, version: where.version, url };
}
