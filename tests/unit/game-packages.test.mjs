/**
 * Game packages, draft and production (server/gamePackages.js, src/platform/packageLoader.js):
 * shortcodes, manifests and their registry, releases (deploy writes a version folder,
 * release.json and current.json; rollback repoints), picking changes onto production in a
 * temporary git worktree, the loader's choice of production vs draft, and that the
 * platform's own bundle cannot reach any game package's code.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CODE_RE, newCode, createPackage, scanPackages, resolvePackage, validateManifest, bumpVersion, nextVersion, compareVersions,
  writeRelease, listReleases, readCurrent, readLog, rollback, verifyRelease, discardRelease, activateRelease,
  pendingChanges, prepareSource, deploy, history, commitDiff, gameTestFiles, PackageError
} from '../../server/gamePackages.js';
import { chooseChannel, draftRequested, releaseRequested, resolveEntry } from '../../src/platform/packageLoader.js';
import { createPlatformApi } from '../../src/platform/gameApi.js';
import { GamesStore } from '../../server/gamesStore.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const tmp = (name) => mkdtempSync(join(tmpdir(), `gamory-pkg-${name}-`));
const git = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@x', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@x' } });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
/** A counter for random(): deterministic shortcodes. */
const seq = (start = 0) => {
  let n = start;
  return (k) => {
    const bytes = Buffer.from(Array.from({ length: k }, (_, i) => (n + i * 7) & 255));
    n++;
    return bytes;
  };
};

/* ------------------------------------------------------------ shortcodes */

test('a shortcode is g_ + 10 lowercase base32 letters, and never one already taken', () => {
  const code = newCode();
  assert.match(code, CODE_RE);
  const first = newCode(() => false, seq(3));
  const again = newCode((c) => c === first, seq(3));
  assert.notEqual(again, first);
  assert.match(again, CODE_RE);
  assert.throws(() => newCode(() => true), PackageError);
});

test('game:create allocates a fresh folder with a complete starter; a slug or id taken is refused', () => {
  const dir = tmp('create');
  const a = createPackage(dir, { title: 'Moon Hop' });
  assert.match(a.code, CODE_RE);
  assert.equal(a.slug, 'moon-hop');
  assert.equal(a.id, 'official:moon-hop');
  for (const f of ['game.json', 'index.js', 'game.js', 'world.js', 'controls.js', 'hud.js', 'credits.js', 'README.md', 'tests/package.test.mjs']) assert.ok(existsSync(join(dir, a.code, f)), f);
  assert.match(readFileSync(join(dir, a.code, 'index.js'), 'utf8'), /export async function mount\(container, platform\)/);
  const b = createPackage(dir, { title: 'Pixel Run', template: '2d' });
  assert.notEqual(a.code, b.code);
  assert.ok(!existsSync(join(dir, b.code, 'world.js')));
  assert.throws(() => createPackage(dir, { title: 'Moon Hop' }), /taken/);
  assert.throws(() => createPackage(dir, { title: 'Other', id: 'official:moon-hop' }), /taken/);
  assert.throws(() => createPackage(dir, { title: 'X', template: 'vr' }), /template/);
  assert.equal(scanPackages(dir).length, 2);
  rmSync(dir, { recursive: true, force: true });
});

test('packages resolve by shortcode, slug or platform id; two claiming one id or slug are refused', () => {
  const dir = tmp('scan');
  const a = createPackage(dir, { title: 'Alpha' });
  const list = scanPackages(dir);
  for (const ref of [a.code, 'alpha', 'official:alpha', 'ALPHA']) assert.equal(resolvePackage(list, ref).code, a.code);
  assert.throws(() => resolvePackage(list, 'beta'), /No game package/);
  // A copied folder with the same id under a new code: the registry refuses it.
  const copy = newCode((c) => c === a.code);
  mkdirSync(join(dir, copy));
  writeFileSync(join(dir, copy, 'game.json'), JSON.stringify({ ...a, code: copy, slug: 'alpha-two' }));
  assert.throws(() => scanPackages(dir), /Two packages claim the game id official:alpha/);
  // A manifest whose code is not its folder's.
  assert.throws(() => validateManifest({ ...a, code: copy }, a.code), /does not match its folder/);
  rmSync(dir, { recursive: true, force: true });
});

test("Kickrani's manifest is valid, keeps official:seoul, and its folder is its shortcode", () => {
  const list = scanPackages(join(ROOT, 'games'));
  const k = resolvePackage(list, 'kickrani');
  assert.equal(k.id, 'official:seoul');
  assert.equal(k.code, 'g_cv2yrhrpv2');
  assert.equal(resolvePackage(list, 'official:seoul').code, k.code);
});

/* -------------------------------------------------------------- versions */

test('versions bump and the next one is always above every release', () => {
  assert.equal(bumpVersion('1.2.3'), '1.2.4');
  assert.equal(bumpVersion('1.2.3', 'minor'), '1.3.0');
  assert.equal(bumpVersion('1.2.3', 'major'), '2.0.0');
  assert.ok(compareVersions('1.10.0', '1.9.9') > 0);
  assert.equal(nextVersion({ releases: [], manifestVersion: '1.0.0' }), '1.0.0');
  assert.equal(nextVersion({ releases: [{ version: '1.0.0' }, { version: '1.0.2' }], bump: 'patch' }), '1.0.3');
  assert.throws(() => nextVersion({ requested: '1.0.2', releases: [{ version: '1.0.2' }] }), /never overwritten/);
  assert.throws(() => nextVersion({ requested: '1.0.1', releases: [{ version: '1.0.2' }] }), /above/);
  assert.throws(() => bumpVersion('1.0'), PackageError);
});

/* -------------------------------------------------------------- releases */

function fakeBuild(dir, text = 'export async function mount(){return {root:null,dispose(){}}}') {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'game.js'), text);
  writeFileSync(join(dir, 'game.css'), '.x{color:red}');
  return dir;
}

test('a deploy writes releases/<code>/<version>/ with release.json (files and hashes) and points current.json at it; rollback repoints', () => {
  const games = tmp('rel-games');
  const releases = tmp('rel');
  const m = createPackage(games, { title: 'Rel Game' });
  const r1 = writeRelease(releases, m, { version: '1.0.0', builtDir: fakeBuild(join(tmp('b1'), 'out')), by: 'test', meta: { notes: 'first', source: { mode: 'all', base: 'a'.repeat(40), picks: [] } } });
  assert.ok(existsSync(join(releases, m.code, '1.0.0', 'game.js')));
  const onDisk = JSON.parse(readFileSync(join(releases, m.code, '1.0.0', 'release.json'), 'utf8'));
  assert.equal(onDisk.version, '1.0.0');
  assert.equal(onDisk.code, m.code);
  assert.equal(onDisk.id, m.id);
  assert.deepEqual(onDisk.css, ['game.css']);
  assert.equal(onDisk.files.length, 2);
  assert.match(onDisk.files[0].sha256, /^[0-9a-f]{64}$/);
  assert.equal(r1.previous, null);
  assert.equal(readCurrent(releases, m.code).version, '1.0.0');

  const r2 = writeRelease(releases, m, { version: '1.0.1', builtDir: fakeBuild(join(tmp('b2'), 'out'), 'export const v=2;export async function mount(){}'), by: 'test' });
  assert.equal(r2.previous, '1.0.0');
  assert.equal(readCurrent(releases, m.code).version, '1.0.1');
  assert.throws(() => writeRelease(releases, m, { version: '1.0.1', builtDir: fakeBuild(join(tmp('b3'), 'out')) }), /never overwritten/);
  assert.deepEqual(listReleases(releases, m.code).map((r) => r.version), ['1.0.0', '1.0.1']);

  const cur = rollback(releases, m.code, '1.0.0', { by: 'admin' });
  assert.equal(cur.version, '1.0.0');
  assert.equal(cur.action, 'rollback');
  assert.equal(readCurrent(releases, m.code).version, '1.0.0');
  assert.deepEqual(readLog(releases, m.code).map((e) => `${e.action}:${e.version}`), ['deploy:1.0.0', 'deploy:1.0.1', 'rollback:1.0.0']);
  assert.throws(() => rollback(releases, m.code, '9.9.9'), /No release/);

  assert.ok(verifyRelease(releases, m.code, '1.0.1').ok);
  writeFileSync(join(releases, m.code, '1.0.1', 'game.js'), 'tampered');
  assert.deepEqual(verifyRelease(releases, m.code, '1.0.1').problems, ['game.js: changed']);

  // Staged (not activated) releases do not move current; a failed one is discarded, never the live one.
  writeRelease(releases, m, { version: '1.0.2', builtDir: fakeBuild(join(tmp('b4'), 'out')), activate: false });
  assert.equal(readCurrent(releases, m.code).version, '1.0.0');
  discardRelease(releases, m.code, '1.0.2');
  assert.ok(!existsSync(join(releases, m.code, '1.0.2')));
  assert.throws(() => discardRelease(releases, m.code, '1.0.0'), /live/);
  activateRelease(releases, m.code, '1.0.1');
  assert.equal(readCurrent(releases, m.code).version, '1.0.1');
});

/* ------------------------------------------------- changes, picks, history */

/** A small repo with one package and a few commits touching it (and one that does not). */
function makeRepo() {
  const repo = tmp('repo');
  git(repo, 'init', '-q', '-b', 'main');
  const m = createPackage(join(repo, 'games'), { title: 'Picky' });
  const file = (name, text) => writeFileSync(join(repo, 'games', m.code, name), text);
  file('rules.js', 'export const speed = 1;\nexport const lives = 3;\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'Picky: start');
  const base = git(repo, 'rev-parse', 'HEAD');
  file('a.js', 'export const a = 1;\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'Picky: add a');
  const ca = git(repo, 'rev-parse', 'HEAD');
  writeFileSync(join(repo, 'outside.txt'), 'not the game\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'Platform: something else');
  file('rules.js', 'export const speed = 2;\nexport const lives = 3;\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'Picky: faster');
  const cb = git(repo, 'rev-parse', 'HEAD');
  file('rules.js', 'export const speed = 3;\nexport const lives = 3;\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'Picky: even faster');
  const cc = git(repo, 'rev-parse', 'HEAD');
  return { repo, m, base, ca, cb, cc };
}

/** A build that only copies the package's sources (no Vite): what was picked is what ships. */
const copyBuild = async ({ srcRoot, code, outDir }) => {
  mkdirSync(outDir, { recursive: true });
  const dir = join(srcRoot, 'games', code);
  const parts = readdirSync(dir).filter((f) => f.endsWith('.js')).sort().map((f) => `// ${f}\n${readFileSync(join(dir, f), 'utf8')}`);
  writeFileSync(join(outDir, 'game.js'), parts.join('\n'));
  return { manifest: JSON.parse(readFileSync(join(dir, 'game.json'), 'utf8')), vite: 'test' };
};

test('pending changes are the commits touching the package after production, minus the ones it picked; diffs are per file', async () => {
  const { repo, m, base, ca, cb, cc } = makeRepo();
  const releases = join(repo, 'releases');
  const first = await deploy({ repo, releasesDir: releases, ref: 'picky', base, version: '1.0.0', tests: false, build: copyBuild, by: 't' });
  assert.equal(first.source.base, base);
  const live = listReleases(releases, m.code)[0];
  const pending = pendingChanges(repo, m.code, live);
  assert.deepEqual(pending.map((c) => c.hash), [cc, cb, ca], 'newest first, and not the commit outside the package');
  assert.equal(pending[0].subject, 'Picky: even faster');
  assert.deepEqual(pending[1].files.map((f) => f.path), [`games/${m.code}/rules.js`]);
  assert.equal(pending[1].added, 1);
  assert.equal(pending[1].removed, 1);
  const d = commitDiff(repo, m.code, cb.slice(0, 9));
  assert.equal(d.hash, cb);
  assert.equal(d.files.length, 1);
  assert.match(d.files[0].diff, /^-export const speed = 1;$/m);
  assert.match(d.files[0].diff, /^\+export const speed = 2;$/m);
  assert.throws(() => commitDiff(repo, m.code, 'HEAD; rm -rf /'), /not a commit hash/);
});

test('deploying picked changes builds production + only those, in order; the rest stay pending; a conflicting pick deploys nothing', async () => {
  const { repo, m, base, ca, cb, cc } = makeRepo();
  const releases = join(repo, 'releases');
  await deploy({ repo, releasesDir: releases, ref: m.code, base, version: '1.0.0', tests: false, build: copyBuild });
  // Pick only "add a": production gets a.js but not the speed changes.
  const r = await deploy({ repo, releasesDir: releases, ref: 'official:picky', picks: [ca.slice(0, 10)], tests: false, build: copyBuild, notes: '' });
  assert.equal(r.version, '1.0.1');
  assert.equal(r.source.mode, 'pick');
  assert.equal(r.source.base, base);
  assert.deepEqual(r.source.picks, [ca]);
  assert.deepEqual(r.added.map((c) => c.hash), [ca]);
  assert.equal(r.notes, '- Picky: add a', 'notes prefilled from the picked messages');
  const shipped = readFileSync(join(releases, m.code, '1.0.1', 'game.js'), 'utf8');
  assert.match(shipped, /export const a = 1/);
  assert.match(shipped, /speed = 1/);
  let h = history({ repo, releasesDir: releases, pkg: m });
  assert.deepEqual(h.pending.map((c) => c.hash), [cc, cb]);
  assert.equal(h.current.version, '1.0.1');
  assert.equal(h.releases[0].version, '1.0.1');

  // "even faster" alone does not apply without "faster": nothing is deployed, the change is named.
  await assert.rejects(
    deploy({ repo, releasesDir: releases, ref: m.code, picks: [cc], tests: false, build: copyBuild }),
    (e) => e.status === 409 && e.conflict?.hash === cc && /does not apply/.test(e.message)
  );
  assert.equal(readCurrent(releases, m.code).version, '1.0.1');
  assert.deepEqual(listReleases(releases, m.code).map((x) => x.version), ['1.0.0', '1.0.1']);
  assert.equal(git(repo, 'worktree', 'list').split('\n').length, 1, 'temporary worktrees are cleaned up');

  // Both, picked out of order: applied oldest first.
  const r3 = await deploy({ repo, releasesDir: releases, ref: m.code, picks: [cc, cb], bump: 'minor', tests: false, build: copyBuild });
  assert.equal(r3.version, '1.1.0');
  assert.deepEqual(r3.source.picks, [ca, cb, cc]);
  assert.match(readFileSync(join(releases, m.code, '1.1.0', 'game.js'), 'utf8'), /speed = 3/);
  h = history({ repo, releasesDir: releases, pkg: m });
  assert.deepEqual(h.pending, []);

  // A change already in production cannot be picked again; --all moves the base to the draft.
  await assert.rejects(deploy({ repo, releasesDir: releases, ref: m.code, picks: [ca], tests: false, build: copyBuild }), /not a pending change/);
  const all = await deploy({ repo, releasesDir: releases, ref: m.code, all: true, tests: false, build: copyBuild });
  assert.equal(all.source.mode, 'all');
  assert.equal(all.source.base, git(repo, 'rev-parse', 'HEAD'));
  assert.deepEqual(all.source.picks, []);

  // Rollback is instant and the pending list follows the live release.
  rollback(releases, m.code, '1.0.1');
  assert.deepEqual(history({ repo, releasesDir: releases, pkg: m }).pending.map((c) => c.hash), [cc, cb]);
});

test('a failed check stops the deploy: unit tests before anything is written, the smoke check discards the staged release', async () => {
  const { repo, m, base } = makeRepo();
  const releases = join(repo, 'releases');
  // The starter's own test reads game.json and controls.js: it passes on the release source.
  const ok = await deploy({ repo, releasesDir: releases, ref: m.code, base, version: '1.0.0', build: copyBuild });
  assert.equal(ok.checks.tests.ok, true);
  assert.ok(ok.checks.tests.files >= 1);
  await assert.rejects(
    deploy({ repo, releasesDir: releases, ref: m.code, all: true, tests: false, build: copyBuild, smoke: async () => ({ ok: false, problems: ['console: boom'] }) }),
    /smoke check failed.*boom/
  );
  assert.equal(readCurrent(releases, m.code).version, '1.0.0');
  assert.ok(!existsSync(join(releases, m.code, '1.0.1')), 'the staged release is removed');
  const forced = await deploy({ repo, releasesDir: releases, ref: m.code, all: true, force: true, build: copyBuild, smoke: async () => ({ ok: false, problems: ['x'] }) });
  assert.equal(forced.version, '1.0.1');
});

test('prepareSource never touches the main working tree', () => {
  const { repo, m, base, ca } = makeRepo();
  const before = git(repo, 'status', '--porcelain');
  const tree = prepareSource(repo, { code: m.code, base, picks: [ca] });
  assert.ok(existsSync(join(tree.dir, 'games', m.code, 'a.js')));
  tree.cleanup();
  assert.ok(!existsSync(tree.dir));
  assert.equal(git(repo, 'status', '--porcelain'), before);
});

test("a game's tests: its own tests/ folder and every tests/unit file importing its folder", () => {
  const files = gameTestFiles(ROOT, 'g_cv2yrhrpv2');
  assert.ok(files.includes('tests/unit/city.test.mjs'));
  assert.ok(files.some((f) => f.startsWith('games/g_cv2yrhrpv2/tests/')));
  assert.ok(!files.includes('tests/unit/game-packages.test.mjs'));
});

/* ---------------------------------------------------------------- loader */

test('the loader picks production by default, the draft only when asked for and allowed', () => {
  assert.equal(chooseChannel({}), 'production');
  assert.equal(chooseChannel({ requested: 'draft' }), 'production', 'a player asking for the draft gets production');
  assert.equal(chooseChannel({ requested: 'draft', dev: true }), 'draft');
  assert.equal(chooseChannel({ requested: 'draft', admin: true }), 'draft');
  assert.equal(chooseChannel({ hasRelease: false }), null, 'a draft-only game is not playable for players');
  assert.equal(chooseChannel({ hasRelease: false, dev: true }), 'draft');
  const pkg = { code: 'g_cv2yrhrpv2', slug: 'kickrani', id: 'official:seoul' };
  for (const q of ['?draft=kickrani', '?draft=g_cv2yrhrpv2', '?draft=official:seoul', '?draft=1']) assert.ok(draftRequested(q, pkg), q);
  assert.ok(!draftRequested('?draft=snowpuff', pkg));
  assert.ok(!draftRequested('', pkg));
  assert.equal(releaseRequested('?release=1.0.2'), '1.0.2');
  assert.equal(releaseRequested('?release=../x'), null);
});

test('production loads releases/<code>/<current version>/ by URL; the dev draft is the source folder', async () => {
  const calls = [];
  const fetchJson = async (url) => {
    calls.push(url);
    if (url.endsWith('current.json')) return { version: '1.0.3' };
    if (url.endsWith('release.json')) return { entry: 'game.js', css: ['game.css', '../evil.css'] };
    throw new Error(url);
  };
  const pkg = { code: 'g_cv2yrhrpv2', entry: 'index.js' };
  const prod = await resolveEntry(pkg, { channel: 'production', fetchJson });
  assert.equal(prod.url, 'releases/g_cv2yrhrpv2/1.0.3/game.js');
  assert.deepEqual(prod.css, ['releases/g_cv2yrhrpv2/1.0.3/game.css']);
  assert.equal(prod.version, '1.0.3');
  const pinned = await resolveEntry(pkg, { channel: 'production', fetchJson, version: '1.0.1' });
  assert.equal(pinned.url, 'releases/g_cv2yrhrpv2/1.0.1/game.js');
  const draft = await resolveEntry(pkg, { channel: 'draft', dev: true, fetchJson });
  assert.equal(draft.url, '/games/g_cv2yrhrpv2/index.js');
  await assert.rejects(resolveEntry({ code: '../x' }, { channel: 'production', fetchJson }), /Not a game package/);
});

test('the platform API is small and frozen; exit() runs once', () => {
  let exits = 0;
  const api = createPlatformApi({ account: { id: 1, name: 'kim', secret: 'x' }, game: { id: 'official:seoul', code: 'g_cv2yrhrpv2', slug: 'kickrani', title: 'Kickrani' }, release: { channel: 'production', version: '1.0.0' }, onExit: () => exits++, search: '?laps=1' });
  assert.equal(api.api, 1);
  assert.equal(api.account.secret, undefined);
  assert.equal(api.params.get('laps'), '1');
  api.exit();
  api.exit();
  assert.equal(exits, 1);
  assert.ok(Object.isFrozen(api));
});

/* ------------------------------------------------------------- home page */

test('the home page lists a package with its production version; a draft-only package only for the admin', async () => {
  const db = { many: async () => [], one: async () => null };
  const levels = { index: async () => ({ campaign: [] }), readText: async () => null };
  const pkgs = [
    { code: 'g_cv2yrhrpv2', id: 'official:seoul', slug: 'kickrani', title: 'Kickrani', entry: 'index.js', production: '1.0.0' },
    { code: 'g_aaaaaaaaaa', id: 'official:moon-hop', slug: 'moon-hop', title: 'Moon Hop', entry: 'index.js', production: null }
  ];
  const store = new GamesStore(db, levels, { packages: () => pkgs });
  const all = await store.official();
  const seoul = all.find((g) => g.id === 'official:seoul');
  assert.equal(seoul.package, 'g_cv2yrhrpv2');
  assert.equal(seoul.version, '1.0.0');
  assert.equal(seoul.engine, 'city', 'Kickrani keeps its id and card');
  assert.ok(!all.some((g) => g.id === 'official:moon-hop'), 'players do not see a draft-only game');
  const admin = await store.official({ drafts: true });
  const moon = admin.find((g) => g.id === 'official:moon-hop');
  assert.equal(moon.draft, true);
  assert.equal(moon.engine, 'package');
  assert.ok(await store.get('official:moon-hop'));
});

/* --------------------------------------------- the platform's own bundle */

/** Every module the platform's entry pages can reach by static or literal dynamic import. */
function reachable(entries) {
  const seen = new Set();
  const stack = [...entries];
  const IMPORT = /(?:import|export)\s[^'"`]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    if (!/\.(m?js)$/.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(IMPORT)) {
      const spec = m[1] ?? m[2] ?? m[3];
      if (!spec.startsWith('.')) continue;
      stack.push(resolve(dirname(file), spec));
    }
  }
  return seen;
}

test("the platform's bundle cannot reach any game package's code (games load by URL only)", () => {
  const html = ['index.html', 'parent-report.html', 'voice-studio.html'];
  const entries = [];
  for (const page of html) {
    const text = readFileSync(join(ROOT, page), 'utf8');
    for (const m of text.matchAll(/<script[^>]+src="([^"]+)"/g)) entries.push(resolve(ROOT, m[1].replace(/^\.?\//, '')));
  }
  assert.ok(entries.some((e) => e.endsWith(join('src', 'main.js'))));
  const files = reachable(entries);
  assert.ok(files.size > 100, `walked ${files.size} modules`);
  const games = [...files].filter((f) => f.startsWith(join(ROOT, 'games') + '/'));
  assert.deepEqual(games, [], 'no platform module imports games/');
});
