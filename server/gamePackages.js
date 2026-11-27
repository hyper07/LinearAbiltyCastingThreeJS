/**
 * Game packages, draft and production (docs/platform-architecture.md).
 *
 *   games/<code>/              a game's live source: the DRAFT (developers and agents edit it)
 *     game.json                { code, id, slug, title, version, api, entry, description }
 *     index.js                 export async function mount(container, platform) → { root, dispose }
 *   releases/<code>/<version>/ a PRODUCTION release: the game built alone, bundled with
 *                              everything it imports, copied here once and never changed
 *     release.json             version, date, who, notes, base commit, picked commits,
 *                              what it added, entry, files with sha256
 *   releases/<code>/current.json   which version players get ({ version, updated, by, action })
 *   releases/<code>/log.json       every deploy and rollback, newest last
 *
 * `<code>` is a generated shortcode (`g_` + 10 base32 letters), assigned once and never
 * changed, so two games can never collide on a folder; the human name, slug and the
 * platform's game id live in game.json, and every command takes any of the three.
 *
 * A deploy builds from COMMITS, never from uncommitted edits: a temporary git worktree at
 * the release's base commit, the chosen changes applied in order (only their part under
 * games/<code>/), one Vite library build, files copied into a new version folder, then
 * current.json repointed. Rollback only repoints. Git always runs with fixed argument
 * lists (no shell), every hash, code and version is checked against a strict pattern
 * first, and the main working tree is never touched.
 *
 * Used by the CLI (scripts/game.mjs) and by the admin endpoints (server/releases.js).
 */
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { brotliCompressSync, gzipSync, constants as zlib } from 'node:zlib';
import { TEMPLATES, templateFiles } from './gameTemplates.js';

export const CODE_RE = /^g_[a-z2-7]{10}$/;
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
export const ID_RE = /^[a-z0-9]+:[a-z0-9][a-z0-9-]{0,47}$/;
export const VERSION_RE = /^(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,5})$/;
export const HASH_RE = /^[0-9a-f]{7,40}$/;
const ENTRY_RE = /^[a-zA-Z0-9_-]+\.js$/;
const B32 = 'abcdefghijklmnopqrstuvwxyz234567';
/** The platform API version games are written against (src/platform/gameApi.js). */
export const GAME_API = 1;

export class PackageError extends Error {
  constructor(message, status = 400, extra = {}) {
    super(message);
    this.status = status;
    Object.assign(this, extra);
  }
}

/* ------------------------------------------------------------ manifests */

/** A fresh shortcode no folder or manifest uses yet. */
export function newCode(taken = () => false, random = randomBytes) {
  for (let i = 0; i < 100; i++) {
    const bytes = random(10);
    let code = 'g_';
    for (const b of bytes) code += B32[b & 31];
    if (!taken(code)) return code;
  }
  throw new PackageError('Could not find a free shortcode', 500);
}

/** A manifest checked field by field; `folder` is the folder name it was read from. */
export function validateManifest(m, folder = m?.code) {
  const bad = (why) => new PackageError(`games/${folder}/game.json: ${why}`);
  if (!m || typeof m !== 'object') throw bad('not a JSON object');
  if (!CODE_RE.test(m.code ?? '')) throw bad(`"code" must look like g_xxxxxxxxxx (got ${JSON.stringify(m.code)})`);
  if (m.code !== folder) throw bad(`"code" ${m.code} does not match its folder`);
  if (!ID_RE.test(m.id ?? '')) throw bad(`"id" must look like official:name (got ${JSON.stringify(m.id)})`);
  if (!SLUG_RE.test(m.slug ?? '')) throw bad(`"slug" must be lowercase letters, digits and dashes (got ${JSON.stringify(m.slug)})`);
  if (typeof m.title !== 'string' || !m.title.trim()) throw bad('"title" is missing');
  if (!VERSION_RE.test(m.version ?? '')) throw bad(`"version" must be x.y.z (got ${JSON.stringify(m.version)})`);
  if (!ENTRY_RE.test(m.entry ?? '')) throw bad('"entry" must be a .js file in the package folder');
  if (m.api !== GAME_API) throw bad(`"api" must be ${GAME_API}`);
  return m;
}

export function readManifest(gamesDir, code) {
  const file = join(gamesDir, code, 'game.json');
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new PackageError(`games/${code}/game.json: ${error.code === 'ENOENT' ? 'missing' : error.message}`);
  }
  return validateManifest(data, code);
}

/**
 * Every package under gamesDir, checked: one folder per code, and no two with the same
 * id or slug (that is refused, naming both folders). Folders not shaped like a code are
 * ignored (README, registry notes).
 */
export function scanPackages(gamesDir) {
  if (!existsSync(gamesDir)) return [];
  const out = [];
  const byId = new Map();
  const bySlug = new Map();
  for (const entry of readdirSync(gamesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !CODE_RE.test(entry.name)) continue;
    const m = readManifest(gamesDir, entry.name);
    if (byId.has(m.id)) throw new PackageError(`Two packages claim the game id ${m.id}: ${byId.get(m.id)} and ${m.code}`, 409);
    if (bySlug.has(m.slug)) throw new PackageError(`Two packages claim the slug ${m.slug}: ${bySlug.get(m.slug)} and ${m.code}`, 409);
    byId.set(m.id, m.code);
    bySlug.set(m.slug, m.code);
    out.push(m);
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

/** The package a reference names: its shortcode, its slug or its platform id. */
export function resolvePackage(packages, ref) {
  const r = String(ref ?? '').trim().toLowerCase();
  const found = packages.find((p) => p.code === r || p.slug === r || p.id === r);
  if (!found) throw new PackageError(`No game package "${ref}" (known: ${packages.map((p) => `${p.slug} (${p.code})`).join(', ') || 'none'})`, 404);
  return found;
}

export function slugify(title) {
  return String(title ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

/**
 * A new package folder from a starter (server/gameTemplates.js): a fresh shortcode, game.json
 * and a complete small game that runs at once. Refuses a slug or id another package has.
 * Draft only until its first deploy: players do not see it, the admin does.
 */
export function createPackage(gamesDir, { title, slug, id, description = '', template = '3d', genre = 'arcade' }, { random } = {}) {
  if (!title || !String(title).trim()) throw new PackageError('A title is needed: --title "My Game"');
  if (!TEMPLATES.includes(template)) throw new PackageError(`No template "${template}" (have: ${TEMPLATES.join(', ')})`);
  slug = slug ? String(slug).toLowerCase() : slugify(title);
  if (!SLUG_RE.test(slug)) throw new PackageError(`"${slug}" is not a usable slug: lowercase letters, digits and dashes`);
  id = id ? String(id).toLowerCase() : `official:${slug}`;
  if (!ID_RE.test(id)) throw new PackageError(`"${id}" is not a usable game id (like official:${slug})`);
  const packages = scanPackages(gamesDir);
  const clash = packages.find((p) => p.slug === slug || p.id === id);
  if (clash) throw new PackageError(`${clash.slug === slug ? `The slug ${slug}` : `The id ${id}`} is taken by ${clash.code} (${clash.title})`, 409);
  const code = newCode((c) => existsSync(join(gamesDir, c)) || packages.some((p) => p.code === c), random);
  const dir = join(gamesDir, code);
  const manifest = {
    code,
    id,
    slug,
    title: String(title).trim(),
    version: '0.1.0',
    api: GAME_API,
    entry: 'index.js',
    description,
    genre,
    template,
    smoke: { params: '', seconds: 10 }
  };
  mkdirSync(join(dir, 'tests'), { recursive: true });
  writeFileSync(join(dir, 'game.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  for (const [path, text] of Object.entries(templateFiles(manifest, template))) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return manifest;
}

/* ------------------------------------------------------------- versions */

export function parseVersion(v) {
  const m = VERSION_RE.exec(String(v ?? ''));
  if (!m) throw new PackageError(`"${v}" is not a version (x.y.z)`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function compareVersions(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
}

export function bumpVersion(v, kind = 'patch') {
  const [a, b, c] = parseVersion(v);
  if (kind === 'major') return `${a + 1}.0.0`;
  if (kind === 'minor') return `${a}.${b + 1}.0`;
  if (kind === 'patch') return `${a}.${b}.${c + 1}`;
  throw new PackageError(`Bump must be patch, minor or major (got ${kind})`);
}

/** The version a new release gets: the one asked for (above every release so far), or the latest bumped. */
export function nextVersion({ requested, bump = 'patch', releases = [], manifestVersion = '1.0.0' }) {
  const latest = releases.map((r) => r.version).sort(compareVersions).at(-1);
  if (requested) {
    parseVersion(requested);
    if (releases.some((r) => r.version === requested)) throw new PackageError(`Version ${requested} already exists: releases are never overwritten`, 409);
    if (latest && compareVersions(requested, latest) <= 0) throw new PackageError(`Version ${requested} must be above the latest release ${latest}`, 409);
    return requested;
  }
  return latest ? bumpVersion(latest, bump) : manifestVersion;
}

/* ------------------------------------------------------------- releases */

const readJsonFile = (file, fallback = null) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};
const writeJsonAtomic = (file, data) => {
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
  renameSync(tmp, file);
};

/** Every release of a package, oldest first (release.json of each version folder). */
export function listReleases(releasesDir, code) {
  if (!CODE_RE.test(code)) throw new PackageError('Bad package code');
  const dir = join(releasesDir, code);
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !VERSION_RE.test(entry.name)) continue;
    const r = readJsonFile(join(dir, entry.name, 'release.json'));
    if (r?.version === entry.name) out.push(r);
  }
  return out.sort((a, b) => compareVersions(a.version, b.version));
}

export function readCurrent(releasesDir, code) {
  if (!CODE_RE.test(code)) throw new PackageError('Bad package code');
  return readJsonFile(join(releasesDir, code, 'current.json'));
}

export function readLog(releasesDir, code) {
  return readJsonFile(join(releasesDir, code, 'log.json'), []);
}

function appendLog(releasesDir, code, event) {
  const log = readLog(releasesDir, code);
  log.push(event);
  writeJsonAtomic(join(releasesDir, code, 'log.json'), log);
}

function* walk(dir, base = dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(file, base);
    else if (entry.isFile()) yield relative(base, file).split(sep).join('/');
  }
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const COMPRESS = /\.(js|mjs|css|json|svg|map|txt|wasm)$/;

/**
 * Copy a finished build (`builtDir`) into releases/<code>/<version>/ with its release.json,
 * then point current.json at it. The version folder must not exist yet (releases are
 * immutable). `.br`/`.gz` copies are written beside the compressible files for the server
 * (git-ignored; the Docker build makes them again).
 */
export function writeRelease(releasesDir, manifest, { version, builtDir, meta = {}, now = new Date(), by = 'unknown', activate = true }) {
  const { code } = manifest;
  parseVersion(version);
  const dir = join(releasesDir, code, version);
  if (existsSync(dir)) throw new PackageError(`releases/${code}/${version} already exists: releases are never overwritten`, 409);
  const files = [...walk(builtDir)].filter((f) => f !== 'release.json').sort();
  if (!files.length) throw new PackageError('The build produced no files', 500);
  const entry = meta.entry ?? 'game.js';
  if (!files.includes(entry)) throw new PackageError(`The build has no ${entry}`, 500);
  mkdirSync(dirname(dir), { recursive: true });
  const staging = `${dir}.staging-${process.pid}`;
  rmSync(staging, { recursive: true, force: true });
  cpSync(builtDir, staging, { recursive: true });
  const list = files.map((path) => {
    const buf = readFileSync(join(staging, path));
    return { path, bytes: buf.length, sha256: sha256(buf) };
  });
  const previous = readCurrent(releasesDir, code)?.version ?? null;
  const release = {
    format: 1,
    code,
    id: manifest.id,
    slug: manifest.slug,
    title: manifest.title,
    version,
    api: manifest.api,
    date: now.toISOString(),
    deployedBy: by,
    notes: meta.notes ?? '',
    previous,
    source: meta.source ?? null,
    added: meta.added ?? [],
    entry,
    css: files.filter((f) => f.endsWith('.css')),
    files: list,
    builtWith: meta.builtWith ?? { node: process.version },
    checks: meta.checks ?? null
  };
  writeJsonAtomic(join(staging, 'release.json'), release);
  for (const f of files) {
    if (!COMPRESS.test(f)) continue;
    const buf = readFileSync(join(staging, f));
    if (buf.length < 1024) continue;
    writeFileSync(join(staging, `${f}.br`), brotliCompressSync(buf, { params: { [zlib.BROTLI_PARAM_QUALITY]: 11 } }));
    writeFileSync(join(staging, `${f}.gz`), gzipSync(buf, { level: 9 }));
  }
  renameSync(staging, dir);
  if (activate) setCurrent(releasesDir, code, version, { by, action: 'deploy', now });
  return release;
}

/** A written (staged) release goes live: current.json points at it. */
export function activateRelease(releasesDir, code, version, { by = 'unknown', now = new Date() } = {}) {
  if (!existsSync(join(releasesDir, code, version, 'release.json'))) throw new PackageError(`No release ${version} of ${code}`, 404);
  return setCurrent(releasesDir, code, version, { by, action: 'deploy', now });
}

/** A staged release that failed its checks is removed, so its version number is free again. Never the live one. */
export function discardRelease(releasesDir, code, version) {
  parseVersion(version);
  if (readCurrent(releasesDir, code)?.version === version) throw new PackageError(`${version} is live: roll back first`, 409);
  rmSync(join(releasesDir, code, version), { recursive: true, force: true });
}

function setCurrent(releasesDir, code, version, { by, action, now = new Date() }) {
  const from = readCurrent(releasesDir, code)?.version ?? null;
  const current = { version, updated: now.toISOString(), by, action };
  writeJsonAtomic(join(releasesDir, code, 'current.json'), current);
  appendLog(releasesDir, code, { at: current.updated, action, version, from, by });
  return current;
}

/** Point players back (or forward) at an existing release: no build, only current.json. */
export function rollback(releasesDir, code, version, { by = 'unknown', now = new Date() } = {}) {
  parseVersion(version);
  const releases = listReleases(releasesDir, code);
  if (!releases.some((r) => r.version === version)) throw new PackageError(`No release ${version} of ${code} (have: ${releases.map((r) => r.version).join(', ') || 'none'})`, 404);
  const files = readJsonFile(join(releasesDir, code, version, 'release.json'))?.files ?? [];
  for (const f of files) {
    if (!existsSync(join(releasesDir, code, version, f.path))) throw new PackageError(`Release ${version} is missing ${f.path}`, 409);
  }
  return setCurrent(releasesDir, code, version, { by, action: 'rollback', now });
}

/** Check a release's files against the hashes in its release.json. */
export function verifyRelease(releasesDir, code, version) {
  const dir = join(releasesDir, code, version);
  const r = readJsonFile(join(dir, 'release.json'));
  if (!r) return { ok: false, problems: ['no release.json'] };
  const problems = [];
  for (const f of r.files) {
    const file = join(dir, f.path);
    if (!existsSync(file)) problems.push(`${f.path}: missing`);
    else if (sha256(readFileSync(file)) !== f.sha256) problems.push(`${f.path}: changed`);
  }
  return { ok: !problems.length, problems };
}

/* ------------------------------------------------------------------ git */

/** Run git with a fixed argument list (never a shell). Throws with git's own message on failure. */
export function git(cwd, args, { input, allowFail = false, maxBuffer = 64 * 1024 * 1024 } = {}) {
  const r = spawnSync('git', args, { cwd, input, encoding: 'utf8', maxBuffer, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', LC_ALL: 'C' } });
  if (r.error) throw new PackageError(`git is not available here: ${r.error.message}`, 503);
  if (r.status !== 0 && !allowFail) throw new PackageError(`git ${args[0]} failed: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 6).join(' | ')}`, 500);
  return allowFail ? r : r.stdout;
}

/** A full commit hash for a checked short or long hash (or HEAD); refuses anything else. */
export function commitOf(repo, ref) {
  if (ref !== 'HEAD' && !HASH_RE.test(String(ref ?? ''))) throw new PackageError(`"${ref}" is not a commit hash`);
  const r = git(repo, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { allowFail: true });
  const out = r.stdout.trim();
  if (r.status !== 0 || !/^[0-9a-f]{40}$/.test(out)) throw new PackageError(`No commit ${ref} in this repository`, 404);
  return out;
}

const pathOfPkg = (code) => `games/${code}/`;
const SEP = '\x1e';
const FS = '\x1f';

/** Commits (newest first) on base..head that touch games/<code>/, each with its files and line counts there. */
export function commitsTouching(repo, code, base, head = 'HEAD') {
  if (!CODE_RE.test(code)) throw new PackageError('Bad package code');
  const range = base ? `${base}..${head}` : head;
  const out = git(repo, ['log', '--no-color', '--numstat', '--diff-merges=first-parent', `--format=${SEP}%H${FS}%an${FS}%aI${FS}%s`, range, '--', pathOfPkg(code)]);
  const commits = [];
  for (const chunk of out.split(SEP)) {
    if (!chunk.trim()) continue;
    const [head0, ...lines] = chunk.split('\n');
    const [hash, author, date, subject] = head0.split(FS);
    const files = [];
    for (const line of lines) {
      const m = /^(\d+|-)\t(\d+|-)\t(.+)$/.exec(line);
      if (!m) continue;
      files.push({ path: m[3], added: m[1] === '-' ? 0 : Number(m[1]), removed: m[2] === '-' ? 0 : Number(m[2]), binary: m[1] === '-' });
    }
    commits.push({ hash, short: hash.slice(0, 9), author, date, subject, files, added: files.reduce((s, f) => s + f.added, 0), removed: files.reduce((s, f) => s + f.removed, 0) });
  }
  return commits;
}

/**
 * What the draft has that production does not: commits touching the package after the
 * current release's base, minus the ones it picked. Newest first.
 */
export function pendingChanges(repo, code, release) {
  if (!release?.source?.base) return commitsTouching(repo, code, null);
  const base = commitOf(repo, release.source.base);
  const picked = new Set(release.source.picks ?? []);
  return commitsTouching(repo, code, base).filter((c) => !picked.has(c.hash));
}

/** One change's diff under games/<code>/, file by file (unified diff text, capped per file). */
export function commitDiff(repo, code, hash, { maxFileBytes = 200_000 } = {}) {
  if (!CODE_RE.test(code)) throw new PackageError('Bad package code');
  const full = commitOf(repo, hash);
  const meta = git(repo, ['show', '--no-color', '--no-patch', `--format=%H${FS}%an${FS}%aI${FS}%s${FS}%b`, full]);
  const [h, author, date, subject, body] = meta.split(FS);
  const text = git(repo, ['show', '--no-color', '--format=', '--diff-merges=first-parent', '--find-renames', full, '--', pathOfPkg(code)]);
  const files = [];
  for (const part of text.split(/^(?=diff --git )/m)) {
    if (!part.startsWith('diff --git ')) continue;
    const m = /^diff --git a\/(.+?) b\/(.+)$/m.exec(part);
    const truncated = part.length > maxFileBytes;
    files.push({ from: m?.[1] ?? '', path: m?.[2] ?? '', diff: truncated ? `${part.slice(0, maxFileBytes)}\n… (cut: ${part.length} bytes in all)` : part, truncated });
  }
  return { hash: h.trim(), author, date, subject, body: (body ?? '').trim(), files };
}

/**
 * A temporary worktree (outside the repo's working tree) at `base`, with each pick's change
 * under games/<code>/ applied in order. A pick that does not apply stops everything: the
 * worktree is removed and a PackageError (409) names the change, its files and git's reason.
 */
export function prepareSource(repo, { code, base, picks = [], scratch }) {
  const parent = scratch ?? join(tmpdir(), 'gamory-games');
  mkdirSync(parent, { recursive: true });
  const root = mkdtempSync(join(parent, 'src-'));
  const dir = join(root, 'tree');
  git(repo, ['worktree', 'add', '--detach', '--quiet', dir, base]);
  const cleanup = () => {
    git(repo, ['worktree', 'remove', '--force', dir], { allowFail: true });
    rmSync(root, { recursive: true, force: true });
    git(repo, ['worktree', 'prune'], { allowFail: true });
  };
  try {
    for (const hash of picks) {
      const patch = git(repo, ['show', '--no-color', '--binary', '--format=', '--diff-merges=first-parent', hash, '--', pathOfPkg(code)]);
      if (!patch.trim()) continue;
      const r = git(dir, ['apply', '--3way', '--index', '--whitespace=nowarn', '-'], { input: patch, allowFail: true });
      if (r.status !== 0) {
        const conflicted = git(dir, ['diff', '--name-only', '--diff-filter=U'], { allowFail: true }).stdout?.trim().split('\n').filter(Boolean) ?? [];
        const subject = git(repo, ['show', '--no-patch', '--format=%s', hash]).trim();
        throw new PackageError(`Change ${hash.slice(0, 9)} ("${subject}") does not apply on top of the others: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 4).join(' | ')}`, 409, {
          conflict: { hash, subject, files: conflicted, reason: (r.stderr || r.stdout).trim().slice(0, 2000) }
        });
      }
    }
  } catch (error) {
    cleanup();
    throw error;
  }
  return { dir, cleanup };
}

/* ---------------------------------------------------------------- build */

/**
 * Build one package alone: a Vite library build of games/<code>/<entry> (ES module, every
 * import bundled — three, src/shared, fonts — so later platform changes cannot reach it),
 * CSS in its own file. `srcRoot` is a checkout (the temporary worktree); node_modules come
 * from `modulesFrom` (the repo's).
 */
export async function buildPackage({ srcRoot, code, outDir, modulesFrom, log = () => {} }) {
  const manifest = readManifest(join(srcRoot, 'games'), code);
  if (modulesFrom && !existsSync(join(srcRoot, 'node_modules'))) symlinkSync(join(modulesFrom, 'node_modules'), join(srcRoot, 'node_modules'), 'dir');
  let vite;
  try {
    vite = await import('vite');
  } catch {
    throw new PackageError('Building a release needs the dev dependencies (vite): run it from a checkout with `npm ci`', 503);
  }
  rmSync(outDir, { recursive: true, force: true });
  await vite.build({
    configFile: false,
    root: srcRoot,
    base: './',
    publicDir: false,
    logLevel: 'warn',
    mode: 'production',
    define: { 'process.env.NODE_ENV': '"production"' },
    build: {
      outDir,
      emptyOutDir: true,
      target: 'es2022',
      sourcemap: false,
      minify: true,
      copyPublicDir: false,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 8000,
      lib: { entry: join(srcRoot, 'games', code, manifest.entry), formats: ['es'], fileName: () => 'game.js', cssFileName: 'game' }
    }
  });
  log(`[game] built ${manifest.slug} (${code}) into ${outDir}`);
  return { manifest, vite: vite.version };
}

/* --------------------------------------------------------------- checks */

/**
 * A game's unit tests under `root`: its own folder's tests/ and every tests/unit file that
 * imports games/<code>/ (so the many Kickrani tests count without moving them).
 */
export function gameTestFiles(root, code) {
  if (!CODE_RE.test(code)) throw new PackageError('Bad package code');
  const out = [];
  const own = join(root, 'games', code, 'tests');
  if (existsSync(own)) for (const f of walk(own)) if (f.endsWith('.test.mjs')) out.push(join('games', code, 'tests', f));
  const shared = join(root, 'tests', 'unit');
  if (existsSync(shared)) {
    for (const f of walk(shared)) {
      if (!f.endsWith('.test.mjs')) continue;
      const text = readFileSync(join(shared, f), 'utf8');
      if (new RegExp(`(?:from|import\\()\\s*['"][^'"]*games/${code}/`).test(text)) out.push(join('tests', 'unit', f));
    }
  }
  return out.sort();
}

/** Run a game's unit tests in `root` (node --test). @returns {{ ok, files, output }} */
export function runGameTests(root, code, { timeout = 10 * 60_000, stdio = 'pipe' } = {}) {
  const files = gameTestFiles(root, code);
  if (!files.length) return { ok: true, files, output: 'no tests' };
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=dot', ...files], { cwd: root, encoding: 'utf8', timeout, stdio, maxBuffer: 64 * 1024 * 1024 });
  return { ok: r.status === 0, files, output: `${r.stdout ?? ''}${r.stderr ?? ''}`.slice(-8000) };
}

/** Link what a temporary checkout needs from the repo: node_modules, and data/geo for tests that read the map. */
function linkNeeds(tree, repo) {
  const pairs = [['node_modules', 'node_modules'], [join('data', 'geo'), join('data', 'geo')]];
  for (const [from, to] of pairs) {
    const src = join(repo, from);
    const dst = join(tree, to);
    if (!existsSync(src) || existsSync(dst)) continue;
    mkdirSync(dirname(dst), { recursive: true });
    symlinkSync(src, dst, 'dir');
  }
}

/* --------------------------------------------------------------- deploy */

const shortList = (commits) => commits.map((c) => ({ hash: c.hash, subject: c.subject, author: c.author, date: c.date }));

/**
 * Deploy a package to production.
 *
 *   all: true        the draft as committed (base = HEAD, no picks)
 *   picks: [hash…]   the current release's base and picks, plus ONLY these changes, applied
 *                    oldest first (each must be a pending change of this package)
 *   base: hash       (first release only, or to rebuild from a chosen commit) start here
 *
 * Throws PackageError 409 with `.conflict` when a pick does not apply: nothing is written.
 */
export async function deploy({ repo, releasesDir, ref, all = false, picks = null, base = null, version = null, bump = 'patch', notes = '', by = 'unknown', scratch = null, log = () => {}, tests = true, smoke = null, force = false, build = buildPackage }) {
  repo = resolve(repo);
  const pkg = resolvePackage(scanPackages(join(repo, 'games')), ref);
  const { code } = pkg;
  const releases = listReleases(releasesDir, code);
  const current = readCurrent(releasesDir, code);
  const live = current ? releases.find((r) => r.version === current.version) : null;
  const head = commitOf(repo, 'HEAD');
  let source;
  let added;
  if (base) {
    // An explicit starting point (the first release, or a rebuild): that commit as it was, plus any picks.
    const b = commitOf(repo, base);
    const chosen = (picks ?? []).map((h) => commitOf(repo, h));
    source = { mode: chosen.length ? 'pick' : 'commit', base: b, picks: chosen, head };
    added = live ? shortList(commitsTouching(repo, code, live.source?.base ?? null, b)) : [];
  } else if (all) {
    const pending = live ? pendingChanges(repo, code, live) : [];
    source = { mode: 'all', base: head, picks: [], head };
    added = shortList(pending);
  } else {
    if (!picks?.length) throw new PackageError('Choose the changes to deploy (--pick <hash,…>) or --all');
    if (!live?.source?.base) throw new PackageError('There is no production release to pick onto yet: make the first with --all or --base <commit>', 409);
    const pending = pendingChanges(repo, code, live);
    const byHash = new Map(pending.map((c) => [c.hash, c]));
    const chosen = [];
    for (const h of picks) {
      const full = commitOf(repo, h);
      if (!byHash.has(full)) throw new PackageError(`${h} is not a pending change of ${pkg.slug} (it is already in production, or does not touch games/${code}/)`, 409);
      if (!chosen.includes(full)) chosen.push(full);
    }
    // Oldest first, as they were made: pending is newest first.
    const order = pending.map((c) => c.hash).reverse();
    chosen.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    source = { mode: 'pick', base: live.source.base, picks: [...(live.source.picks ?? []), ...chosen], head };
    added = shortList(chosen.map((h) => byHash.get(h)).reverse());
  }
  const next = nextVersion({ requested: version, bump, releases, manifestVersion: pkg.version });
  const scratchDir = scratch ?? join(tmpdir(), 'gamory-games');
  mkdirSync(scratchDir, { recursive: true });
  log(`[game] ${pkg.slug} ${next}: building from ${source.base.slice(0, 9)}${source.picks.length ? ` + ${source.picks.length} picked change(s)` : ''}`);
  const tree = prepareSource(repo, { code, base: source.base, picks: source.picks, scratch: scratchDir });
  const outDir = mkdtempSync(join(scratchDir, 'out-'));
  try {
    linkNeeds(tree.dir, repo);
    const built = await build({ srcRoot: tree.dir, code, outDir, modulesFrom: repo, log });
    if (built.manifest.code !== code) throw new PackageError('The package changed its code', 409);
    // The release's own source must pass its own unit tests before anything is written.
    const checks = { tests: null, smoke: null, forced: Boolean(force) };
    if (tests && !force) {
      const t = runGameTests(tree.dir, code);
      checks.tests = { ok: t.ok, files: t.files.length };
      log(`[game] ${pkg.slug}: ${t.files.length} test file(s) ${t.ok ? 'passed' : 'FAILED'}`);
      if (!t.ok) throw new PackageError(`Nothing deployed: ${pkg.slug}'s unit tests fail on this release.\n${t.output}`, 409, { tests: t });
    }
    const release = writeRelease(releasesDir, { ...pkg, ...built.manifest, code }, {
      version: next,
      builtDir: outDir,
      by,
      activate: false,
      meta: { notes: notes || added.map((c) => `- ${c.subject}`).join('\n'), source, added, entry: 'game.js', builtWith: { node: process.version, vite: built.vite }, checks }
    });
    // Then a short browser load of the staged release (the caller's smoke runner), before players get it.
    if (smoke && !force) {
      const s = await smoke(release);
      if (!s.ok) {
        discardRelease(releasesDir, code, next);
        throw new PackageError(`Nothing deployed: the smoke check failed on ${next}: ${s.problems.join('; ')}`, 409, { smoke: s });
      }
      log(`[game] ${pkg.slug} ${next}: smoke check passed${s.skipped ? ` (skipped: ${s.skipped})` : ''}`);
    }
    activateRelease(releasesDir, code, next, { by });
    return release;
  } finally {
    tree.cleanup();
    rmSync(outDir, { recursive: true, force: true });
  }
}

/**
 * The history view: every release (newest first) with what it added, which one is live,
 * the deploy/rollback log, and (when git is here) the draft's changes not in production.
 */
export function history({ repo, releasesDir, pkg, withPending = true }) {
  const releases = listReleases(releasesDir, pkg.code).reverse();
  const current = readCurrent(releasesDir, pkg.code);
  const live = releases.find((r) => r.version === current?.version) ?? null;
  let pending = null;
  let gitError = null;
  if (withPending && repo) {
    try {
      pending = pendingChanges(repo, pkg.code, live);
    } catch (error) {
      gitError = error.message;
    }
  }
  return {
    package: { code: pkg.code, id: pkg.id, slug: pkg.slug, title: pkg.title },
    current,
    releases: releases.map((r) => ({ version: r.version, date: r.date, deployedBy: r.deployedBy, notes: r.notes, previous: r.previous, source: r.source, added: r.added, files: r.files.length, bytes: r.files.reduce((s, f) => s + f.bytes, 0) })),
    log: readLog(releasesDir, pkg.code),
    pending,
    gitError
  };
}

/**
 * The home page's view of the packages (server/gamesStore.js): each manifest with its
 * production version (null = draft only). A broken manifest is logged, not fatal.
 */
export function packageGames({ gamesDir, releasesDir, log = (line) => console.warn(line) }) {
  return () => {
    try {
      return scanPackages(gamesDir).map((p) => ({ ...p, production: readCurrent(releasesDir, p.code)?.version ?? null }));
    } catch (error) {
      log(`[games] ${error.message}`);
      return [];
    }
  };
}

/** True when `dir` lies inside `root` (or is it). */
export function inside(root, dir) {
  const r = resolve(root);
  const d = resolve(dir);
  return d === r || d.startsWith(r + sep);
}

/** Bytes of a folder (for messages). */
export function folderBytes(dir) {
  let n = 0;
  for (const f of walk(dir)) n += statSync(join(dir, f)).size;
  return n;
}
