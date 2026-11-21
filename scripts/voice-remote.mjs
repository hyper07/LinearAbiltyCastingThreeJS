#!/usr/bin/env node
/**
 * Generate AI Arcademia's voices on another Mac (a Mac Studio, say) over SSH,
 * so this one stays cool and quiet. Uses only your own ssh config and keys
 * (BatchMode: it never asks for or stores a password).
 *
 *   npm run voice:remote -- --host studio                      sync, set up, start (detached, --missing)
 *   npm run voice:remote -- --host studio --tier core          …with any voice:gen arguments
 *   npm run voice:remote -- --host studio --lang es,ja,zh      split the work by language
 *   npm run voice:remote -- --host studio --status             progress: running or not, clips, the log
 *   npm run voice:remote -- --host studio --pull               fetch finished clips and merge them in
 *   npm run voice:remote -- --host studio --stop               stop after the current batch
 *   npm run voice:remote -- --host studio --setup-only         sync and install, don't start
 *   npm run voice:remote -- --host studio --push               only sync (code, manifests, designed voices)
 *   npm run voice:remote -- --host studio --dry-run …          print the commands, run nothing
 *   --dir ~/gamory-voice                                       where it lives there (default)
 *   --identity ~/.ssh/id_ed25519                               use this key only (adds -o IdentitiesOnly=yes)
 *   VOICE_REMOTE_HOST / VOICE_REMOTE_IDENTITY / VOICE_REMOTE_DIR   the same, from the environment
 *
 * What goes there: the generator's scripts, the source files they import (the
 * lessons and string tables the lines come from; see scripts/voice/remote.mjs),
 * a dependency-free package.json, the voice manifests and clips, and the
 * designed reference voices (library/tools/qwen3-tts/refs, so every machine
 * speaks with the same voices). Never .env, data/ or the rest of library/.
 * There, `voice:setup` installs Qwen3-TTS and Whisper into its own
 * library/tools/qwen3-tts (about 11 GB), and generation runs under nohup and
 * caffeinate, so it survives the ssh session ending and the Mac idling; run
 * the same command again to resume (--missing skips finished lines).
 *
 * Needs on the remote Mac: Remote Login on (System Settings → General →
 * Sharing), your public key in its ~/.ssh/authorized_keys, Node 22+, git, and
 * uv (https://docs.astral.sh/uv/).
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseArgs, plan, remotePackageJson, syncData, syncFiles } from './voice/remote.mjs';
import { mergeGenerated } from './voice/lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STAGING = path.join(ROOT, 'library', 'tools', 'voice-remote');

let o;
try {
  o = parseArgs(process.argv.slice(2), process.env, homedir());
} catch (e) {
  console.error(`voice:remote: ${e.message}\nnpm run voice:remote -- --host <ssh host> [--dir ~/gamory-voice] [--status | --pull | --stop | --push | --setup-only] [--dry-run] [voice:gen arguments…]`);
  process.exit(2);
}

const files = syncFiles(ROOT);
const data = syncData(ROOT);
const pkg = `${JSON.stringify(remotePackageJson(JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'))), null, 1)}\n`;
const steps = plan(o, { files, data, staging: path.relative(ROOT, STAGING) });

const show = (cmd) => cmd.map((a) => (/^[\w@%+=:,./~-]+$/.test(a) ? a : `'${a.replace(/'/g, `'\\''`)}'`)).join(' ');
for (const step of steps) {
  console.log(`→ ${step.what}`);
  if (o.dryRun) {
    console.log(`  ${show(step.cmd)}${step.input ? (step.input === 'package.json' ? '  < package.json (generated)' : `  < ${files.length} file names`) : ''}`);
    continue;
  }
  if (step.cmd[0] === 'merge') {
    const n = mergeGenerated(path.join(ROOT, step.cmd[1]), path.join(ROOT, step.cmd[2]));
    console.log(`  merged ${n} line(s) into public/audio/voice-gen`);
    continue;
  }
  if (step.cmd[0] === 'rsync' && step.cmd.at(-1).startsWith(path.relative(ROOT, STAGING))) mkdirSync(STAGING, { recursive: true });
  const input = step.input === 'package.json' ? pkg : step.input;
  const r = spawnSync(step.cmd[0], step.cmd.slice(1), { cwd: ROOT, stdio: [input ? 'pipe' : 'inherit', 'inherit', 'inherit'], input, encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(`voice:remote: “${step.what}” failed (${r.status ?? r.error?.message}).`);
    if (step.cmd[0] === 'ssh' || step.cmd[0] === 'rsync') console.error(`Check: ssh ${o.identity ? `-i ${o.identity} -o IdentitiesOnly=yes ` : ''}${o.host} works without a password (Remote Login on, your key in its ~/.ssh/authorized_keys).`);
    process.exit(1);
  }
}
if (o.dryRun) console.log(`\n(dry run: nothing was run. The ${files.length} files sent:)\n  ${files.join('\n  ')}\n  …and ${data.join(', ')}`);
