/**
 * The pieces of npm run voice:remote (scripts/voice-remote.mjs) that can be
 * tested without a second Mac: which files go to the remote, and the exact
 * ssh / rsync commands for each step. Nothing here runs a command.
 *
 * Only what the generator needs is synced: its scripts, the source files
 * they import (the voice script is built from the game's lessons and string
 * tables), the voice manifests and clips, and the designed reference voices.
 * Never .env, data/, the asset library or anything else in library/.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/** Where generation starts: everything it imports is found from these. */
export const ENTRIES = ['scripts/voice-gen.mjs', 'scripts/voice-setup.mjs'];
/** Not imported, but needed there. */
export const EXTRA_FILES = ['scripts/voice/worker.py'];
/** Folders synced whole (relative to the repo), when they exist. */
export const SYNC_DIRS = ['public/audio/voice-gen/', 'library/tools/qwen3-tts/refs/'];
/** Single data files synced when they exist (people's recordings are skipped by the generator). */
export const SYNC_DATA = ['public/audio/voice/manifest.json'];
/** Never sent, whatever a walk finds. */
export const NEVER = [/^\.env/, /^data\//, /^library\/(?!tools\/qwen3-tts\/refs\/)/, /(^|\/)node_modules\//, /^\.git\//];

const IMPORT_RE = /(?:^|[\s;])(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|(?:^|[\s;(])import\s*\(\s*['"]([^'"]+)['"]\s*\)|^\s*import\s*['"]([^'"]+)['"]/gm;

/** Relative imports of a source file (bare package names are reported apart). */
export function importsOf(source) {
  const rel = [], bare = [];
  // Comments may show imports as examples: leave them out.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const m of code.matchAll(IMPORT_RE)) {
    const spec = m[1] ?? m[2] ?? m[3];
    if (!spec) continue;
    if (spec.startsWith('.')) rel.push(spec);
    else if (!spec.startsWith('node:')) bare.push(spec);
  }
  return { rel, bare };
}

/**
 * Every repo file the generator needs, relative to `root`, sorted: the entries,
 * what they import (following relative imports), and EXTRA_FILES. Throws if
 * a file imports an npm package (the remote has no node_modules) or if the
 * walk reaches a path in NEVER.
 */
export function syncFiles(root, { entries = ENTRIES, extra = EXTRA_FILES } = {}) {
  const seen = new Set();
  const bare = new Map();
  const walk = (rel) => {
    if (seen.has(rel)) return;
    seen.add(rel);
    const src = readFileSync(path.join(root, rel), 'utf8');
    const found = importsOf(src);
    for (const b of found.bare) bare.set(b, rel);
    for (const spec of found.rel) {
      let next = path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec));
      if (!existsSync(path.join(root, next)) && existsSync(path.join(root, `${next}.js`))) next += '.js';
      if (/\.(css|svg|png|glsl)$/.test(next)) continue;
      walk(next);
    }
  };
  for (const e of entries) walk(e);
  if (bare.size) throw new Error(`the generator imports npm packages, which the remote does not have: ${[...bare].map(([b, f]) => `${b} (${f})`).join(', ')}`);
  const files = [...seen, ...extra.filter((f) => existsSync(path.join(root, f)))].sort();
  const bad = files.filter((f) => NEVER.some((re) => re.test(f)));
  if (bad.length) throw new Error(`refusing to sync ${bad.join(', ')}`);
  return files;
}

/** The data to send too (manifests, clips and reference voices), as paths relative to root. */
export function syncData(root) {
  return [...SYNC_DATA.filter((f) => existsSync(path.join(root, f))), ...SYNC_DIRS.filter((d) => existsSync(path.join(root, d)))];
}

/** A package.json for the remote: just the module type and the voice commands (no dependencies). */
export function remotePackageJson(pkg) {
  return {
    name: 'gamory-voice',
    private: true,
    type: 'module',
    description: 'AI Arcademia voice generation (synced by npm run voice:remote)',
    scripts: { 'voice:setup': 'node scripts/voice-setup.mjs', 'voice:gen': 'node scripts/voice-gen.mjs' },
    engines: pkg?.engines ?? { node: '>=22.13' }
  };
}

/* ---------------------------------------------------------------- commands */

/** Never prompt for a password; fail fast when the host is away. */
const SSH_BASE = ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15'];
/** The ssh options for a run: the base, then `-i <key> -o IdentitiesOnly=yes` when a key is given. */
export const sshOptions = (o) => [...SSH_BASE, ...(o.identity ? ['-i', o.identity, '-o', 'IdentitiesOnly=yes'] : []), ...o.sshOptions.flatMap((x) => ['-o', x])];
/** Remote commands run in a login shell, so Homebrew's node and uv are on PATH. */
export const login = (script) => `zsh -lc ${q(script)}`;
/** Quote one argument for the remote shell. */
export const q = (s) => (/^[\w@%+=:,./~-]+$/.test(String(s)) ? String(s) : `'${String(s).replace(/'/g, `'\\''`)}'`);
/** A remote dir as the remote shell should see it (a leading ~ stays unquoted so it expands). */
const rdir = (dir) => (dir.startsWith('~/') ? `~/${q(dir.slice(2))}` : q(dir));

/**
 * Options from argv: our own flags, and everything else passed on to voice:gen. The host and key
 * can come from VOICE_REMOTE_HOST and VOICE_REMOTE_IDENTITY instead (`home` expands a leading ~).
 */
export function parseArgs(argv, env = {}, home = '~') {
  const o = { host: env.VOICE_REMOTE_HOST || null, identity: env.VOICE_REMOTE_IDENTITY || null, sshOptions: [], dir: env.VOICE_REMOTE_DIR || '~/gamory-voice', mode: 'run', dryRun: false, setup: true, gen: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => {
      if (a.includes('=')) return a.slice(a.indexOf('=') + 1);
      if (argv[i + 1] == null) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    if (a === '--host' || a.startsWith('--host=')) o.host = val();
    else if (a === '--dir' || a.startsWith('--dir=')) o.dir = val();
    else if (a === '--identity' || a.startsWith('--identity=') || a === '-i') o.identity = val();
    else if (a === '--ssh-option' || a.startsWith('--ssh-option=')) o.sshOptions.push(val());
    else if (a === '--pull') o.mode = 'pull';
    else if (a === '--status') o.mode = 'status';
    else if (a === '--stop') o.mode = 'stop';
    else if (a === '--push') o.mode = 'push';
    else if (a === '--setup-only') o.mode = 'setup';
    else if (a === '--no-setup') o.setup = false;
    else if (a === '--dry-run') o.dryRun = true;
    else o.gen.push(a);
  }
  if (!o.host) throw new Error('--host <ssh host> is required (a Host from ~/.ssh/config, or user@name.local)');
  if (!/^[\w.@-]+$/.test(o.host)) throw new Error(`not a host name: ${o.host}`);
  if (o.identity) o.identity = o.identity.replace(/^~(?=\/)/, home);
  if (o.identity && !/^[\w./~-]+$/.test(o.identity)) throw new Error(`not a plain key path: ${o.identity}`);
  for (const x of o.sshOptions) if (!/^[\w=.-]+$/.test(x)) throw new Error(`not a plain ssh option: ${x}`);
  if (o.dir.includes('..') || !/^(~\/)?[\w./-]+$/.test(o.dir)) throw new Error(`not a plain folder: ${o.dir}`);
  if (!o.gen.some((a) => a === '--missing' || a === '--force')) o.gen.push('--missing');
  return o;
}

/**
 * The commands for one invocation, in order: [{ what, cmd: [program, ...args], input? }].
 * `files` and `data` come from syncFiles / syncData; `staging` is where --pull lands first.
 */
export function plan(o, { files = [], data = [], staging = '.voice-remote' } = {}) {
  const SSH_OPTS = sshOptions(o);
  const ssh = (script, what) => ({ what, cmd: ['ssh', ...SSH_OPTS, o.host, login(script)] });
  const D = rdir(o.dir);
  // rsync paths: relative to the remote home (ssh starts there), so no ~ to expand.
  const rpath = o.dir.replace(/^~\//, '').replace(/\/?$/, '/');
  const remote = `${o.host}:${rpath}`;
  const rsync = ['rsync', '-az', '-e', `ssh ${SSH_OPTS.join(' ')}`];
  const steps = [];
  const check = ssh(`mkdir -p ${D} && cd ${D} && command -v node >/dev/null && node -e 'process.exit(+process.versions.node.split(".")[0] >= 22 ? 0 : 1)' && echo ok || { echo 'needs Node 22 or later on the remote (brew install node)'; exit 1; }`, 'check the remote: reachable with a key, Node 22+');
  const push = [
    { what: 'send the generator and the line data it reads', cmd: [...rsync, '--relative', '--files-from=-', './', remote], input: `${files.join('\n')}\n` },
    // --ignore-existing: what the remote already made (and its manifests) is never overwritten; --pull merges back.
    { what: 'send the voice manifests, clips and designed voices it does not have yet', cmd: [...rsync, '--relative', '--ignore-existing', ...data.map((d) => `./${d}`), remote] },
    { what: 'write a dependency-free package.json there', cmd: ['ssh', ...SSH_OPTS, o.host, login(`cat > ${D}/package.json`)], input: 'package.json' }
  ];
  const log = `${D}/voice-gen.log`;
  if (o.mode === 'status') {
    steps.push(ssh(`cd ${D} 2>/dev/null || { echo 'nothing there yet'; exit 0; }; if [ -f voice-gen.pid ] && kill -0 $(cat voice-gen.pid) 2>/dev/null; then echo "running (pid $(cat voice-gen.pid))"; else echo 'not running'; fi; echo "clips: $(find public/audio/voice-gen -name '*.webm' 2>/dev/null | wc -l | tr -d ' ')"; tail -n 8 voice-gen.log 2>/dev/null`, 'show progress'));
  } else if (o.mode === 'stop') {
    steps.push(ssh(`cd ${D} && [ -f voice-gen.pid ] && kill -INT $(cat voice-gen.pid) && echo 'stopping after the current batch' || echo 'not running'`, 'stop after the current batch'));
  } else if (o.mode === 'pull') {
    steps.push({ what: 'fetch the finished clips and manifests', cmd: [...rsync, '--delete', `${remote}public/audio/voice-gen/`, `${staging}/voice-gen/`] });
    steps.push({ what: 'merge them into public/audio/voice-gen (newer takes win)', cmd: ['merge', `${staging}/voice-gen/`, 'public/audio/voice-gen/'] });
  } else {
    steps.push(check, ...push);
    if (o.mode !== 'push' && o.setup) steps.push(ssh(`cd ${D} && node scripts/voice-setup.mjs`, 'install or check Qwen3-TTS and Whisper there (npm run voice:setup)'));
    if (o.mode === 'run') {
      const args = o.gen.map(q).join(' ');
      // Detached: survives the ssh session; caffeinate keeps the Mac awake while it runs.
      steps.push(ssh(`cd ${D} && if [ -f voice-gen.pid ] && kill -0 $(cat voice-gen.pid) 2>/dev/null; then echo "already running (pid $(cat voice-gen.pid))"; exit 0; fi; nohup caffeinate -i node scripts/voice-gen.mjs ${args} > voice-gen.log 2>&1 < /dev/null & echo $! > voice-gen.pid; echo "started (pid $(cat voice-gen.pid)), log: ${log}"`, 'start generating, detached (resumable: --missing)'));
    }
  }
  return steps;
}
