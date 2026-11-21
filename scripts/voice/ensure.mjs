#!/usr/bin/env node
/**
 * Before a build: check AI Arcademia's generated voices.
 *
 * The committed core (barks and floors 1–2, public/audio/voice-gen/manifest.json)
 * must have every file it lists; a missing one is reported (the player stays
 * silent for that line, it never breaks). The rest of the lines
 * (manifest.local.json, git-ignored) exist only where they were generated:
 *
 *   - with the generator installed (npm run voice:setup) and VOICE_AUTO_GEN=1,
 *     the missing lines are generated here, before the build (hours for all
 *     of them on an M-series Mac; it resumes where it stopped);
 *   - otherwise this only reports how many there are, and how to make them:
 *     npm run voice:gen -- --tier extra
 *
 * Never fails the build. VOICE_AUTO_GEN=0 (or LIBRARY_AUTO_FETCH=0, for CI
 * and Docker) skips the generation step but still checks.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateGenManifest } from '../../src/arcademia/voice/generated.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DIR = path.join(ROOT, 'public', 'audio', 'voice-gen');

const read = (f) => {
  try {
    return JSON.parse(readFileSync(path.join(DIR, f), 'utf8'));
  } catch {
    return null;
  }
};
const count = (m) => Object.values(m?.lines ?? {}).reduce((s, chars) => s + Object.values(chars).reduce((t, lines) => t + Object.keys(lines).length, 0), 0);

const core = read('manifest.json');
const local = read('manifest.local.json');
if (!core) {
  console.log('[voices] no generated voices (public/audio/voice-gen/manifest.json): the game plays recordings only. Make them with npm run voice:setup && npm run voice:gen');
  process.exit(0);
}
const problems = validateGenManifest(core, { exists: (p) => existsSync(path.join(DIR, p)) });
if (problems.length) console.warn(`[voices] the committed voice manifest has ${problems.length} problem(s), e.g. ${problems.slice(0, 3).join('; ')}`);
console.log(`[voices] generated: ${count(core)} core line(s) committed, ${count(local)} more generated here (git-ignored)`);

const auto = process.env.VOICE_AUTO_GEN === '1' && process.env.LIBRARY_AUTO_FETCH !== '0';
const installed = existsSync(path.join(ROOT, 'library', 'tools', 'qwen3-tts', '.gamory-setup.json'));
if (auto && installed) {
  console.log('[voices] VOICE_AUTO_GEN=1: generating the missing lines (npm run voice:gen -- --missing)…');
  spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'voice-gen.mjs'), '--missing'], { stdio: 'inherit', cwd: ROOT });
} else if (!local) {
  console.log(`[voices] the lines beyond floors 1–2 are not generated on this machine; ${installed ? 'run' : 'install with npm run voice:setup, then run'} npm run voice:gen -- --tier extra, or on another Mac: npm run voice:remote -- --host <ssh host> then --pull (or build with VOICE_AUTO_GEN=1)`);
}
