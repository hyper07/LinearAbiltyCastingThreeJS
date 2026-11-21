/**
 * npm run voice:remote, without a second Mac: the arguments, the exact ssh and
 * rsync commands, and the files that may go to the remote (never .env, data/
 * or the asset library).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { importsOf, parseArgs, plan, remotePackageJson, sshOptions, syncData, syncFiles } from '../../scripts/voice/remote.mjs';

test('voice:remote: arguments — our flags apart, the rest to voice:gen, resumable by default', () => {
  const o = parseArgs(['--host', 'me@studio.local', '--identity', '~/.ssh/id_ed25519', '--lang', 'es,ja', '--tier', 'core'], {}, '/Users/me');
  assert.equal(o.host, 'me@studio.local');
  assert.equal(o.identity, '/Users/me/.ssh/id_ed25519');
  assert.equal(o.dir, '~/gamory-voice');
  assert.equal(o.mode, 'run');
  assert.deepEqual(o.gen, ['--lang', 'es,ja', '--tier', 'core', '--missing']);
  assert.deepEqual(sshOptions(o), ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', '-i', '/Users/me/.ssh/id_ed25519', '-o', 'IdentitiesOnly=yes']);
  assert.deepEqual(parseArgs(['--host=studio', '--force']).gen, ['--force'], '--force replaces --missing');
  for (const [flag, mode] of [['--status', 'status'], ['--pull', 'pull'], ['--stop', 'stop'], ['--push', 'push'], ['--setup-only', 'setup']]) assert.equal(parseArgs(['--host', 'h', flag]).mode, mode);
  // From the environment.
  const e = parseArgs(['--status'], { VOICE_REMOTE_HOST: 'studio', VOICE_REMOTE_IDENTITY: '~/.ssh/k' }, '/home/u');
  assert.equal(e.host, 'studio');
  assert.equal(e.identity, '/home/u/.ssh/k');
  // Refused: no host, a host or folder that could smuggle shell, an odd key path.
  assert.throws(() => parseArgs(['--status']), /--host/);
  assert.throws(() => parseArgs(['--host', 'h; rm -rf ~']), /not a host/);
  assert.throws(() => parseArgs(['--host', 'h', '--dir', '../etc']), /plain folder/);
  assert.throws(() => parseArgs(['--host', 'h', '--dir', '~/a b']), /plain folder/);
  assert.throws(() => parseArgs(['--host', 'h', '--identity', '~/.ssh/k;x']), /key path/);
});

test('voice:remote: the commands — key only, login shell, detached and resumable', () => {
  const o = parseArgs(['--host', 'me@studio.local', '--identity', '/k/id', '--kind', 'bark']);
  const steps = plan(o, { files: ['scripts/voice-gen.mjs'], data: ['public/audio/voice-gen/'] });
  const all = steps.map((s) => s.cmd.join(' '));
  assert.deepEqual(steps.map((s) => s.cmd[0]), ['ssh', 'rsync', 'rsync', 'ssh', 'ssh', 'ssh']);
  for (const s of steps) {
    const c = s.cmd.join(' ');
    assert.ok(c.includes('BatchMode=yes') && c.includes('-i /k/id') && c.includes('IdentitiesOnly=yes'), `no password prompts, this key only: ${c}`);
    if (s.cmd[0] === 'ssh') assert.match(s.cmd.at(-1), /^zsh -lc '/, 'a login shell, for Homebrew on PATH');
  }
  assert.ok(steps[1].cmd.includes('--files-from=-') && steps[1].input.includes('scripts/voice-gen.mjs'));
  assert.ok(steps[2].cmd.includes('--ignore-existing'), 'a re-push never overwrites what the remote made');
  assert.equal(steps[1].cmd.at(-1), 'me@studio.local:gamory-voice/', 'rsync into the remote home folder');
  assert.match(all[4], /node scripts\/voice-setup\.mjs/);
  assert.match(all[5], /nohup caffeinate -i node scripts\/voice-gen\.mjs --kind bark --missing > voice-gen\.log/);
  assert.match(all[5], /voice-gen\.pid/);
  assert.match(all[5], /already running/, 'a second start does not start twice');
  // Status, stop, pull, push-only, setup-only.
  const p = (flag) => plan(parseArgs(['--host', 'h', flag]), { files: ['a'], data: [] });
  assert.match(p('--status')[0].cmd.at(-1), /clips: .*voice-gen\.log/s);
  assert.match(p('--stop')[0].cmd.at(-1), /kill -INT/);
  const pull = p('--pull');
  assert.deepEqual(pull.map((s) => s.cmd[0]), ['rsync', 'merge']);
  assert.equal(pull[0].cmd.at(-2), 'h:gamory-voice/public/audio/voice-gen/');
  assert.ok(!p('--push').some((s) => /voice-(gen|setup)\.mjs/.test(s.cmd.at(-1))), 'push only syncs');
  assert.ok(!p('--setup-only').some((s) => /nohup/.test(s.cmd.at(-1))), 'setup-only does not start');
  assert.ok(!plan(parseArgs(['--host', 'h', '--no-setup']), { files: [], data: [] }).some((s) => /voice-setup/.test(s.cmd.at(-1))));
  // The remote's package.json has no dependencies at all.
  const pkg = remotePackageJson({ engines: { node: '>=22.13' }, dependencies: { three: '1' } });
  assert.equal(pkg.type, 'module');
  assert.ok(!pkg.dependencies && !pkg.devDependencies);
  assert.equal(pkg.scripts['voice:gen'], 'node scripts/voice-gen.mjs');
});

test('voice:remote: what is synced — the generator and its imports, never secrets or the library', () => {
  const root = resolve('.');
  const files = syncFiles(root);
  for (const need of ['scripts/voice-gen.mjs', 'scripts/voice-setup.mjs', 'scripts/voice/lib.mjs', 'scripts/voice/worker.py', 'src/arcademia/voice/script.js', 'src/arcademia/voice/normalize.js', 'src/arcademia/voice/dsp.js', 'src/arcademia/content/index.js', 'src/arcademia/i18n/locales/ko/ui.js']) assert.ok(files.includes(need), need);
  for (const f of files) {
    assert.ok(/^(scripts|src)\//.test(f), `only code: ${f}`);
    assert.ok(!/\.env|^data\/|^library\/|node_modules/.test(f), f);
  }
  assert.ok(!files.some((f) => /^src\/(gloamreach|wyldhunt|kithvale|shared)\//.test(f)), 'nothing from the other games');
  for (const d of syncData(root)) assert.ok(['public/audio/voice/manifest.json', 'public/audio/voice-gen/', 'library/tools/qwen3-tts/refs/'].includes(d), d);
  // Imports in comments are not followed; npm packages stop the walk.
  assert.deepEqual(importsOf("/* import x from './a.js' */\n// import y from './b.js'\nimport z from './c.js';\nexport { w } from \"../d.js\";\nconst m = await import('./e.js');").rel, ['./c.js', '../d.js', './e.js']);
  const dir = mkdtempSync(join(tmpdir(), 'voice-remote-'));
  mkdirSync(join(dir, 'scripts'));
  writeFileSync(join(dir, 'scripts', 'a.mjs'), "import * as THREE from 'three';\nimport './b.mjs';\n");
  writeFileSync(join(dir, 'scripts', 'b.mjs'), "import { x } from '../.env.js';\n");
  writeFileSync(join(dir, '.env.js'), 'export const x = 1;\n');
  assert.throws(() => syncFiles(dir, { entries: ['scripts/a.mjs'], extra: [] }), /npm packages.*three/);
  writeFileSync(join(dir, 'scripts', 'a.mjs'), "import './b.mjs';\n");
  assert.throws(() => syncFiles(dir, { entries: ['scripts/a.mjs'], extra: [] }), /refusing to sync \.env\.js/);
});
