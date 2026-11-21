#!/usr/bin/env node
/**
 * Generate AI Arcademia's character voices with the local Qwen3-TTS
 * (npm run voice:setup first). Resumable: a line whose take is already there
 * for the same text is skipped, so stopping and running again carries on.
 *
 *   npm run voice:gen                         everything, in priority order (barks → floors 1–2 → the rest)
 *   npm run voice:gen -- --lang ko            one language (repeat or comma-separate for more)
 *   npm run voice:gen -- --char hoot          one character
 *   npm run voice:gen -- --kind bark          barks only (or story, reading, quiz)
 *   npm run voice:gen -- --tier core          barks and floors 1–2 (committed); --tier extra for the rest (git-ignored)
 *   npm run voice:gen -- --floor 1-2          lesson floors (0 = barks heard everywhere)
 *   npm run voice:gen -- --missing            only lines with no generated take yet (the default)
 *   npm run voice:gen -- --force              regenerate even when a take is there
 *   npm run voice:gen -- --takes 2            takes per line to choose from (default 2; more retries on failures)
 *   npm run voice:gen -- --limit 20           stop after this many lines (a quick try)
 *   npm run voice:gen -- --refs-only          design the voices (reference clips) and stop
 *   npm run voice:gen -- --sample             generate one line per character per language (a quick listen)
 *   npm run voice:gen -- --samples <dir>      write a listening page from what is generated: one line per character per language
 *   npm run voice:gen -- --encode-only --bitrate 20000   re-encode every line from its kept master (no generation)
 *
 * Per line: several takes are generated, trimmed and levelled with the voice
 * studio's own chain (src/arcademia/voice/dsp.js: high-pass, trim, fades,
 * −18 LUFS, peaks ≤ −1 dBFS), transcribed with Whisper, and the best take
 * (fewest word or character errors, no clipping, no long silence, a
 * plausible length) is encoded as WebM/Opus into
 * public/audio/voice-gen/<lang>/<char>/<line>.webm. A line with a human
 * recording (public/audio/voice) is skipped: people always win.
 *
 * Core lines (barks and floors 1–2) go in manifest.json and are committed;
 * the rest go in manifest.local.json and are git-ignored (the folder's
 * .gitignore, written here, lists the core files to keep).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync, copyFileSync } from 'node:fs';
import path from 'node:path';

import { LOCALE_IDS } from '../src/arcademia/i18n/index.js';
import { registerAllLocales } from '../src/arcademia/voice/locales.js';
import { buildScript, voiceCharacters, VOICE_KINDS } from '../src/arcademia/voice/script.js';
import { recordingFor } from '../src/arcademia/voice/manifest.js';
import { encodeWav, processTake } from '../src/arcademia/voice/dsp.js';
import { speakable, errorRate, usesCer } from '../src/arcademia/voice/normalize.js';
import { GEN_CREDIT, REF_TEXT, castFor, emptyGenManifest, isCoreLine, paceVariant } from '../src/arcademia/voice/generated.js';
import { GEN_ROOT, REFS, ROOT, TOOL, readWav, ready, startWorker, writeGenGitignore } from './voice/lib.mjs';
import { cpus, totalmem } from 'node:os';

/* ---------------------------------------------------------------- options */

const args = process.argv.slice(2);
const opt = (name) => {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === `--${name}` && args[i + 1] && !args[i + 1].startsWith('--')) out.push(...args[++i].split(','));
    else if (args[i].startsWith(`--${name}=`)) out.push(...args[i].slice(name.length + 3).split(','));
  }
  return out.map((s) => s.trim()).filter(Boolean);
};
const flag = (name) => args.includes(`--${name}`);
if (flag('help') || flag('h')) {
  console.log('npm run voice:gen -- [--lang ko] [--char hoot] [--kind bark] [--tier core|extra] [--floor 1-2] [--missing] [--force] [--takes 2] [--limit n] [--refs-only] [--samples dir] [--verbose]');
  process.exit(0);
}
const LANGS = opt('lang').length ? opt('lang') : LOCALE_IDS;
for (const l of LANGS) if (!LOCALE_IDS.includes(l)) throw new Error(`Unknown language ${l} (${LOCALE_IDS.join(', ')})`);
const KINDS = opt('kind');
for (const k of KINDS) if (!VOICE_KINDS.includes(k)) throw new Error(`Unknown kind ${k} (${VOICE_KINDS.join(', ')})`);
const CHARS = opt('char');
const TIER = opt('tier')[0] ?? 'all';
const FLOORS = (() => {
  const f = opt('floor')[0];
  if (!f) return null;
  const [a, b = a] = f.split('-').map(Number);
  return { a, b };
})();
const FORCE = flag('force');
const TAKES = Math.max(1, Number(opt('takes')[0] ?? 2));
const RETRY_ROUNDS = Math.max(0, Number(opt('retries')[0] ?? 2));
const LIMIT = Number(opt('limit')[0] ?? Infinity);
/** Takes per batch: 48 on a newer Mac with 96 GB or more; 24 on M1 / M2 (measured faster there, and it leaves room) or with less memory. */
const OLD_CHIP = /\bM[12]\b/.test(cpus()[0]?.model ?? '');
const BATCH = Math.max(1, Number(opt('batch')[0] ?? (totalmem() >= 96e9 && !OLD_CHIP ? 48 : 24)));
/** Opus bit rate: 22 kb/s mono keeps the committed core (barks and floors 1–2, five languages) near 35 MB. */
const BITRATE = Number(opt('bitrate')[0] ?? 22000);
const VERBOSE = flag('verbose');
const REF_CANDIDATES = Math.max(1, Number(opt('ref-candidates')[0] ?? 4));
/** Design rounds: fresh candidates for a voice still off its pitch window. */
const DESIGN_ROUNDS = Math.max(1, Number(opt('design-rounds')[0] ?? 4));
/** Acceptable error rates: words for English and Spanish, characters for Korean and Chinese, kana (pronunciation) for Japanese. */
const THRESHOLD = { en: 0.15, es: 0.15, ko: 0.12, zh: 0.12, ja: 0.15 };

/* ---------------------------------------------------------------- files */

const TMP = path.join(TOOL, 'tmp');
/** The chosen takes, processed, as 16-bit WAV (git-ignored): re-encode with --encode-only, no need to generate again. */
const MASTERS = path.join(TOOL, 'masters');
const MANIFEST = { core: path.join(GEN_ROOT, 'manifest.json'), extra: path.join(GEN_ROOT, 'manifest.local.json') };
const readJson = (f, fallback) => {
  try {
    return JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    return fallback;
  }
};
const writeJson = (f, v) => {
  mkdirSync(path.dirname(f), { recursive: true });
  writeFileSync(`${f}.tmp`, `${JSON.stringify(v, null, 1)}\n`);
  renameSync(`${f}.tmp`, f);
};
const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 10);
const round = (x, n = 3) => Math.round(x * 10 ** n) / 10 ** n;
const human = readJson(path.join(ROOT, 'public', 'audio', 'voice', 'manifest.json'), { lines: {} });
const manifests = { core: readJson(MANIFEST.core, null) ?? emptyGenManifest(), extra: readJson(MANIFEST.extra, null) ?? emptyGenManifest() };
const tierOf = (l) => (isCoreLine(l) ? 'core' : 'extra');
const entryOf = (lang, char, id) => manifests.core.lines[lang]?.[char]?.[id] ?? manifests.extra.lines[lang]?.[char]?.[id] ?? null;

function saveManifests() {
  const now = new Date().toISOString();
  for (const tier of ['core', 'extra']) {
    const m = manifests[tier];
    m.updated = now;
    m.model = { name: GEN_CREDIT.model, weights: GEN_CREDIT.weights, design: GEN_CREDIT.design, licence: GEN_CREDIT.licence, url: GEN_CREDIT.url };
    m.credit = GEN_CREDIT.attribution;
    m.tier = tier;
    writeJson(MANIFEST[tier], m);
  }
  // Keep only the core files in git.
  writeGenGitignore(manifests.core);
}

/* ---------------------------------------------------------------- the work list */

registerAllLocales();
const charsEn = voiceCharacters('en');
const guideIndex = new Map(charsEn.filter((c) => c.group === 'guide').map((c, i) => [c.id, i]));
const voiceOf = (char, lang = 'en') => castFor(char, guideIndex.get(char) ?? null, lang);
for (const c of CHARS) if (!charsEn.some((x) => x.id === c)) throw new Error(`Unknown character ${c}`);

const PRIORITY = (l) => (l.kind === 'bark' ? 0 : l.floor <= 2 ? 1 : 2);
const jobs = [];
for (const lang of LANGS) {
  for (const l of buildScript(lang)) {
    if (CHARS.length && !CHARS.includes(l.char)) continue;
    if (KINDS.length && !KINDS.includes(l.kind)) continue;
    if (TIER !== 'all' && tierOf(l) !== TIER) continue;
    if (FLOORS && !((l.kind === 'bark' ? 0 : l.floor) >= FLOORS.a && (l.kind === 'bark' ? 0 : l.floor) <= FLOORS.b)) continue;
    if (recordingFor(human, lang, l.char, l.id)) continue; // a person recorded it: theirs plays
    const text = speakable(l.text, lang);
    if (!text) continue;
    const e = entryOf(lang, l.char, l.id);
    // Kept when the text and the voice are the ones it was made with (a redesigned voice speaks every line again).
    if (!FORCE && e && e.text === hash(text) && e.vkey === voiceSpec(l.char, lang, paceVariant(l)).key && Object.values(e.files).every((f) => existsSync(path.join(GEN_ROOT, f)))) continue;
    jobs.push({ ...l, lang, say: text, variant: paceVariant(l), tier: tierOf(l) });
  }
}
jobs.sort((a, b) => PRIORITY(a) - PRIORITY(b) || LANGS.indexOf(a.lang) - LANGS.indexOf(b.lang) || a.char.localeCompare(b.char) || a.variant.localeCompare(b.variant) || a.seconds - b.seconds);
/**
 * --sample: one line per character per language, to listen to the cast (a bark where the character
 * has barks; a history guide's hello otherwise). Tock's is the timeline bark the end-to-end test plays.
 */
const SAMPLE_LINE = { hoot: 't.lesson.hello.math', tock: 't.lesson.tlSay', gizmo: 't.lesson.hello.physics', townsfolk: 't.npc.1' };
function sampleLine(char) {
  if (SAMPLE_LINE[char]) return SAMPLE_LINE[char];
  if (char.startsWith('buddy-')) return 't.voice.buddy.hello';
  if (char.startsWith('boss-')) return 't.puzzle.won';
  if (char.startsWith('guide-')) return `l.${char.slice('guide-'.length)}.dialogue.intro`;
  return null;
}
const work = (flag('sample') ? jobs.filter((j) => j.id === sampleLine(j.char)) : jobs).slice(0, LIMIT);

/* ---------------------------------------------------------------- run */

if (flag('encode-only')) {
  await encodeOnly();
  process.exit(0);
}
const SAMPLES = opt('samples')[0];
if (SAMPLES) {
  writeSamples(path.resolve(SAMPLES));
  process.exit(0);
}

const r = ready();
if (!r.ready) {
  console.error(`The voice generator is not installed: ${r.reason}`);
  process.exit(1);
}
const summary = work.reduce((s, j) => ((s[`${j.lang} ${['barks', 'floors 1-2', 'rest'][PRIORITY(j)]}`] = (s[`${j.lang} ${['barks', 'floors 1-2', 'rest'][PRIORITY(j)]}`] ?? 0) + 1), s), {});
console.log(`${work.length} line(s) to generate${jobs.length > work.length ? ` (of ${jobs.length})` : ''}: ${Object.entries(summary).map(([k, v]) => `${k} ${v}`).join(', ') || 'nothing to do'}`);
if (!work.length && !flag('refs-only')) process.exit(0);

mkdirSync(TMP, { recursive: true });
/**
 * The Python worker, recycled every few heavy batches: on MPS its memory
 * grows with every new tensor shape (the graph cache) and macOS kills it
 * (SIGKILL) at a few tens of GB. A fresh one reloads the models in seconds
 * and gets the voice prompts again.
 */
const RECYCLE = Math.max(1, Number(opt('recycle')[0] ?? 1));
const worker = {
  w: startWorker({ verbose: VERBOSE }),
  models: new Set(),
  voices: new Map(),
  heavy: 0,
  async call(cmd) {
    if (cmd.cmd === 'load') for (const m of cmd.models) this.models.add(m);
    if (cmd.cmd === 'voice') this.voices.set(cmd.key, cmd);
    const out = await this.w.call(cmd);
    if (cmd.cmd === 'speak' || cmd.cmd === 'design_batch') this.heavy++;
    if (VERBOSE && out.gpuGB != null && cmd.cmd !== 'encode') console.log(`  [worker] ${cmd.cmd}: ${out.gpuGB} GB on the GPU`);
    if (this.heavy >= RECYCLE || out.gpuGB > 30) await this.recycle();
    return out;
  },
  async recycle() {
    const old = this.w.child;
    const gone = new Promise((r) => old.once('close', r));
    this.w.close();
    await Promise.race([gone, new Promise((r) => setTimeout(r, 15000))]);
    if (old.exitCode === null) old.kill('SIGKILL');
    this.w = startWorker({ verbose: VERBOSE });
    this.heavy = 0;
    if (this.models.size) await this.w.call({ cmd: 'load', models: [...this.models] });
    for (const v of this.voices.values()) await this.w.call(v);
  },
  close() {
    this.w.close();
  }
};
const stats = { lines: 0, failed: [], audio: 0, genSeconds: 0, asrSeconds: 0, started: Date.now(), takes: 0, errs: {} };
let stopping = false;
let designLoaded = false;
process.on('SIGINT', () => {
  if (stopping) process.exit(130);
  stopping = true;
  console.log('\nStopping after this batch (Ctrl-C again to quit now)…');
});

try {
  await worker.call({ cmd: 'load', models: ['base', 'asr'] });
  for (const j of work) j.key = `${j.lang}|${j.char}|${j.variant}`;
  // Voices first (all of them, so a --refs-only run designs the whole cast).
  const needed = flag('refs-only') ? allVoiceKeys() : [...new Set(work.map((j) => j.key))].map((k) => k.split('|'));
  await designVoices(needed);
  if (!flag('refs-only')) {
    // Phases in priority order (barks, floors 1–2, the rest), one language at a time; within a
    // phase every character's lines share the batches (each take carries its own voice).
    const phases = new Map();
    for (const j of work) {
      const k = `${PRIORITY(j)}|${j.lang}`;
      if (!phases.has(k)) phases.set(k, []);
      phases.get(k).push(j);
    }
    const loaded = new Set();
    for (const [phase, list0] of phases) {
      if (stopping) break;
      const list = [];
      for (const j of list0) {
        const [lang, char, variant] = j.key.split('|');
        if (!voiceReady(voiceSpec(char, lang, variant))) continue;
        if (!loaded.has(j.key)) {
          await worker.call({ cmd: 'voice', key: j.key, wav: refPath(char, lang, variant), text: REF_TEXT[voiceOf(char, lang).ref][lang] });
          loaded.add(j.key);
        }
        list.push(j);
      }
      if (list.length < list0.length) console.log(`skipping ${list0.length - list.length} line(s) in ${phase}: no voice designed`);
      // Similar lengths together, so a batch is not held up by one long line.
      list.sort((a, b) => a.seconds - b.seconds);
      const lines = Math.max(1, Math.floor(BATCH / TAKES));
      for (let i = 0; i < list.length && !stopping; i += lines) await runBatch(list[0].lang, list.slice(i, i + lines));
    }
  }
} finally {
  worker.close();
  saveManifests();
  report();
}

/* ---------------------------------------------------------------- voices (reference clips) */

function refPath(char, lang, variant) {
  return path.join(REFS, char, `${lang}-${variant}.wav`);
}
function allVoiceKeys() {
  const out = [];
  for (const lang of LANGS) {
    const seen = new Set();
    for (const l of buildScript(lang)) {
      const k = `${l.char}|${paceVariant(l)}`;
      if (seen.has(k) || (CHARS.length && !CHARS.includes(l.char))) continue;
      seen.add(k);
      out.push([lang, l.char, paceVariant(l)]);
    }
  }
  return out;
}

/**
 * The characters' voices, designed from their written descriptions
 * (VoiceDesign) in each language, so the accent is native. A character's
 * English "normal" clip is its anchor (the clearest of a few candidates);
 * in the other languages, and for the slower floors 1–2 variant, a few
 * candidates are designed and the one whose speaker embedding is closest to
 * the anchor's is kept, so the character stays recognisably the same person.
 * Every candidate's words are checked with Whisper too. Batched: the whole
 * cast takes minutes, not hours.
 */
function voiceSpec(char, lang, variant) {
  const v = voiceOf(char, lang);
  const text = REF_TEXT[v.ref][lang];
  const instruct = variant === 'slow' ? `${v.design} Speaking a little slower than usual, relaxed and clear, as in an everyday chat with a young child.` : v.design;
  const out = refPath(char, lang, variant);
  // The anchor this clip must sound like: the English voice, or the language's own design.
  const anchorLang = v.own ? lang : 'en';
  const anchor = anchorLang === lang && variant === 'normal' ? null : [anchorLang, 'normal'];
  return { char, lang, variant, v, text, instruct, out, anchor, key: hash(`${instruct}|${text}|${v.seed}|${(v.f0 ?? []).join('-')}`) };
}
function voiceReady(spec) {
  return existsSync(spec.out) && readJson(`${spec.out}.json`, {}).key === spec.key;
}

async function designVoices(keys) {
  const specs = [];
  const seen = new Set();
  for (const [lang, char, variant] of keys) {
    const anchor = voiceSpec(char, lang, variant).anchor;
    for (const [l, vr] of [...(anchor ? [anchor] : []), [lang, variant]]) {
      const k = `${char}|${l}|${vr}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const spec = voiceSpec(char, l, vr);
      if (!voiceReady(spec)) specs.push(spec);
    }
  }
  if (!specs.length) return;
  if (!designLoaded) {
    await worker.call({ cmd: 'load', models: ['design'] });
    designLoaded = true;
  }
  const anchors = specs.filter((s) => !s.anchor);
  const others = specs.filter((s) => s.anchor);
  console.log(`Designing ${specs.length} voice clip(s) (${anchors.length} anchor(s)), ${REF_CANDIDATES} candidates each…`);
  for (const phase of [anchors, others]) {
    // Rounds: a voice whose best candidate is still off its pitch window gets fresh candidates
    // (new seeds), and every candidate so far stays in the running; the last round keeps the best.
    for (let round_ = 0; round_ < DESIGN_ROUNDS; round_++) {
      const todo = phase.filter((s) => !s.saved);
      if (!todo.length) break;
      const last = round_ === DESIGN_ROUNDS - 1;
      const cands = [];
      for (const spec of todo) {
        for (let i = 0; i < REF_CANDIDATES; i++) cands.push({ spec, i, out: path.join(TMP, `ref-${spec.char}-${spec.lang}-${spec.variant}-${round_}-${i}.wav`) });
      }
      if (round_) console.log(`  round ${round_ + 1}: ${todo.length} voice(s) still off their pitch, ${cands.length} new candidates`);
      // One language per batch keeps the lengths alike.
      cands.sort((a, b) => a.spec.lang.localeCompare(b.spec.lang) || a.spec.text.length - b.spec.text.length);
      for (let i = 0; i < cands.length; i += BATCH) {
        const chunk = cands.slice(i, i + BATCH);
        const seed = 7000 + i + 50000 * round_;
        const items = chunk.map((c) => ({ text: c.spec.text, lang: c.spec.lang, instruct: c.spec.instruct, out: c.out }));
        const g = await retrying(() => worker.call({ cmd: 'design_batch', seed, items }), (n) => worker.call({ cmd: 'design_batch', seed: seed + 97 * n, items }));
        chunk.forEach((c, k) => {
          c.chk = g.items[k];
          c.seed = `${seed}#${k}`;
          c.clean = c.out.replace(/\.wav$/, '.clean.wav');
          c.p = dsp(c.out, c.clean);
        });
        for (const lang of new Set(chunk.map((c) => c.spec.lang))) {
          const mine = chunk.filter((c) => c.p && c.spec.lang === lang);
          if (!mine.length) continue;
          const heard = (await worker.call({ cmd: 'asr', items: mine.map((c) => ({ wav: c.clean, lang, maxTokens: 160 })) })).items;
          const errs = await errorRates(lang, mine.map((c, k) => [c.spec.text, heard[k].text]));
          mine.forEach((c, k) => {
            c.heard = heard[k].text;
            c.err = errs[k];
          });
        }
        for (const c of chunk) {
          if (!c.p || c.err == null) continue;
          c.sim = c.spec.anchor ? (await worker.call({ cmd: 'similarity', a: refPath(c.spec.char, ...c.spec.anchor), b: c.clean })).similarity : 1;
          c.f0 = (await worker.call({ cmd: 'pitch', wav: c.clean })).f0;
          (c.spec.pool ??= []).push(c);
        }
        console.log(`  designed ${Math.min(i + BATCH, cands.length)}/${cands.length} (${g.seconds.toFixed(0)} s)`);
        // Settle each voice as soon as all its candidates are in (a stopped run loses one batch at most).
        const upTo = i + chunk.length;
        for (const spec of todo) if (!spec.saved && !spec.tried && cands.every((c, k) => c.spec !== spec || k < upTo)) {
          spec.tried = true;
          pickVoice(spec, last);
        }
        saveManifests();
      }
      for (const spec of todo) {
        spec.tried = false;
        if (spec.saved) for (const c of spec.pool ?? []) for (const f of [c.out, c.clean]) if (f) rmSync(f, { force: true });
      }
    }
  }
  saveManifests();
}

/** Keep a voice's best candidate; false (try again) while the best is off its pitch window, unless `last`. */
function pickVoice(spec, last = true) {
  const mine = (spec.pool ?? []).filter((c) => c.p && c.err != null);
  // Clear words first, then the closest to the anchor; long pauses and clipping count against.
  // A voice outside its pitch window (squeaky or strained) counts against it heavily.
  const [lo, hi] = spec.v.f0 ?? [0, Infinity];
  const offPitch = (c) => (c.f0 == null ? 0 : c.f0 < lo ? (lo - c.f0) / lo : c.f0 > hi ? (c.f0 - hi) / hi : 0);
  const score = (c) => (1 - c.sim) * 2 + c.err * 3 + offPitch(c) * 8 + (c.chk.longestGap > 1.2 ? 0.5 : 0) + (c.chk.clipped > 0.001 ? 1 : 0) + (c.p.duration < 2 ? 1 : 0);
  mine.sort((a, b) => score(a) - score(b));
  for (const c of mine) if (VERBOSE) console.log(`  ref ${spec.char} ${spec.lang}-${spec.variant} ${c.seed}: f0 ${Math.round(c.f0 ?? 0)} Hz err ${c.err.toFixed(2)} sim ${c.sim.toFixed(3)} gap ${c.chk.longestGap.toFixed(2)} “${c.heard}”`);
  const best = mine[0];
  if (!best) {
    if (last) console.log(`  no usable voice for ${spec.char} ${spec.lang}-${spec.variant}; it will be tried again next run`);
    return false;
  }
  if (!last && (offPitch(best) > 0.04 || best.err > 0.15)) return false;
  spec.saved = true;
  mkdirSync(path.dirname(spec.out), { recursive: true });
  copyFileSync(best.clean, spec.out);
  writeJson(`${spec.out}.json`, { key: spec.key, char: spec.char, lang: spec.lang, variant: spec.variant, seed: best.seed, design: spec.instruct, text: spec.text, error: round(best.err), similarity: round(best.sim), f0: Math.round(best.f0 ?? 0), heard: best.heard });
  console.log(`voice ${spec.char} ${spec.lang}-${spec.variant}: ${Math.round(best.f0 ?? 0)} Hz (wants ${lo}–${hi}), words off ${(best.err * 100).toFixed(0)} %, same speaker ${best.sim.toFixed(2)}`);
  const vm = ((manifests.core.voices ??= {})[spec.char] ??= { design: spec.v.design, refs: {} });
  vm.design = voiceOf(spec.char, 'en').design;
  vm.refs[`${spec.lang}-${spec.variant}`] = { design: spec.v.design, f0: Math.round(best.f0 ?? 0), similarity: round(best.sim), error: round(best.err) };
}

/* ---------------------------------------------------------------- lines */

/** The studio's chain on a take: returns the processed file's stats, or null for an empty take. */
/**
 * Error rates for a batch of (script, heard) pairs in one language. Japanese is compared on its
 * pronunciation in kana (the worker's fugashi), since Whisper writes 座って where the script has すわって.
 */
async function errorRates(lang, pairs) {
  if (lang !== 'ja' || !pairs.length) return pairs.map(([a, b]) => errorRate(a, b, lang));
  const texts = pairs.flatMap(([a, b]) => [speakable(a, 'ja'), speakable(b, 'ja')]);
  const kana = (await worker.call({ cmd: 'kana', texts })).texts;
  return pairs.map((_, i) => errorRate(kana[2 * i], kana[2 * i + 1], 'ja'));
}

function dsp(inFile, outFile) {
  const { samples, rate } = readWav(readFileSync(inFile));
  const p = processTake(samples, rate);
  if (!p.samples.length) return null;
  writeFileSync(outFile, encodeWav(p.samples, rate));
  return { ...p.stats, warnings: p.warnings, rate };
}


async function runBatch(lang, list) {
  const thr = THRESHOLD[lang];
  const idOf = (j) => `${j.char}/${j.id}`;
  const pending = new Map(list.map((j) => [idOf(j), { job: j, takes: [] }]));
  for (let round_ = 0; round_ <= RETRY_ROUNDS && pending.size; round_++) {
    const todo = [...pending.values()].filter((p) => !p.done);
    if (!todo.length) break;
    const takes = round_ === 0 ? TAKES : Math.max(2, TAKES);
    const items = [];
    for (const p of todo) {
      for (let t = 0; t < takes; t++) {
        const n = p.takes.length + t;
        items.push({ key: p.job.key, text: p.job.say, lang, seconds: p.job.seconds, seed: 1000 * round_ + n + 1, out: path.join(TMP, `${lang}-${p.job.char}-${p.job.id}-${n}.wav`), job: p.job });
      }
    }
    // Similar lengths together: a batch runs as long as its longest line.
    items.sort((a, b) => a.seconds - b.seconds);
    for (let i = 0; i < items.length; i += BATCH) {
      const chunk = items.slice(i, i + BATCH);
      const g = await speakChunk(chunk);
      stats.genSeconds += g.seconds;
      stats.audio += g.audio;
      stats.takes += chunk.length;
      const asrItems = [];
      chunk.forEach((it, k) => {
        const chk = g.items[k];
        if (!chk) return;
        const clean = it.out.replace(/\.wav$/, '.clean.wav');
        const p = dsp(it.out, clean);
        const take = { file: clean, chk, p, job: it.job };
        pending.get(idOf(it.job)).takes.push(take);
        if (p) asrItems.push({ wav: clean, lang, maxTokens: Math.ceil(it.job.say.length * (usesCer(lang) ? 1.6 : 0.6)) + 16, take });
      });
      const t = Date.now();
      const heard = asrItems.length ? (await worker.call({ cmd: 'asr', items: asrItems.map(({ take, ...a }) => a) })).items : [];
      stats.asrSeconds += (Date.now() - t) / 1000;
      const errs = await errorRates(lang, heard.map((h, k) => [asrItems[k].take.job.say, h.text]));
      heard.forEach((h, k) => {
        const take = asrItems[k].take;
        take.heard = h.text;
        take.err = errs[k];
        take.score = scoreTake(take);
      });
    }
    for (const p of todo) {
      const ok = p.takes.filter((t) => t.p && t.score != null).sort((a, b) => a.score - b.score);
      if (ok.length && (ok[0].err <= allowed(p.job, thr) && ok[0].faults === 0)) p.done = ok[0];
    }
    for (const [id, p] of pending) {
      if (!p.done) continue;
      await finishLine(p.job, p.done, true);
      pending.delete(id);
    }
    if (VERBOSE && pending.size) console.log(`  ${pending.size} line(s) to retry: ${[...pending.keys()].slice(0, 5).join(', ')}`);
  }
  // Out of retries: keep the best take anyway (marked rough), or nothing.
  for (const p of pending.values()) {
    const best = p.takes.filter((t) => t.p && t.score != null).sort((a, b) => a.score - b.score)[0];
    if (best && best.err < 0.6 && best.faults < 2) await finishLine(p.job, best, false);
    else stats.failed.push({ lang, char: p.job.char, id: p.job.id, text: p.job.say, heard: best?.heard ?? null, err: best?.err ?? null });
  }
  // The takes that were not chosen.
  for (const j of list) for (let n = 0; n < 12; n++) for (const ext of ['wav', 'clean.wav']) rmSync(path.join(TMP, `${lang}-${j.char}-${j.id}-${n}.${ext}`), { force: true });
  saveManifests();
  const el = (Date.now() - stats.started) / 1000;
  const chars = [...new Set(list.map((j) => j.char))];
  console.log(`${lang} ${chars.length > 3 ? `${chars.length} characters` : chars.join(', ')}: ${list.length} line(s) · total ${stats.lines} done, ${stats.failed.length} failed · ${(stats.audio / Math.max(1, stats.genSeconds)).toFixed(2)}× real time generating · ${Math.round(el / 60)} min`);
}

/**
 * Retry a model call that failed (on the GPU the sampler now and then meets a NaN: "probability
 * tensor contains either inf, nan or element < 0"). A fresh worker and another seed nearly always
 * clear it.
 */
async function retrying(first, again, tries = 3) {
  for (let n = 0; ; n++) {
    try {
      return await (n === 0 ? first() : again(n));
    } catch (err) {
      if (n + 1 >= tries || !/nan|inf|probability|MPS|out of memory/i.test(String(err?.message))) throw err;
      console.log(`  model error (${String(err.message).slice(0, 80)}); a fresh worker and another seed…`);
      await worker.recycle();
    }
  }
}

/** One batch of takes; a batch that keeps failing is spoken one take at a time, and a take that still fails is left out. */
async function speakChunk(chunk) {
  const call = (items, bump = 0) => worker.call({ cmd: 'speak', items: items.map(({ job, ...it }) => ({ ...it, seed: it.seed + bump })) });
  try {
    return await retrying(() => call(chunk), (n) => call(chunk, 7919 * n), 2);
  } catch (err) {
    console.log(`  batch failed twice (${String(err.message).slice(0, 80)}); one take at a time`);
    const out = { items: [], seconds: 0, audio: 0 };
    for (const it of chunk) {
      try {
        const g = await retrying(() => call([it], 31), (n) => call([it], 31 + 7919 * n), 3);
        out.items.push(g.items[0]);
        out.seconds += g.seconds;
        out.audio += g.audio;
      } catch {
        out.items.push(null);
      }
    }
    return out;
  }
}

/** Short lines may be off by one word or character (Whisper mishears "Hoo-ray!" more than the model misspeaks it). */
function allowed(job, thr) {
  const units = usesCer(job.lang) ? [...job.say.replace(/[\s\p{P}]/gu, '')].length : job.say.split(/\s+/).length;
  return Math.max(thr, units <= 6 ? 1 / units + 0.01 : thr);
}

function scoreTake(t) {
  const { chk, p, job } = t;
  let faults = 0;
  if (chk.clipped > 0.0005 || p.warnings.includes('clipping')) faults++;
  if (chk.longestGap > 1.4) faults++;
  // Speech length against the script's estimate (which assumes a child-friendly pace).
  const ratio = p.duration / Math.max(0.6, job.seconds);
  if (ratio < 0.3 || ratio > 2.4) faults++;
  t.faults = faults;
  t.ratio = ratio;
  return t.err + faults * 0.5 + Math.max(0, chk.longestGap - 0.9) * 0.2;
}

function finishLine(job, take, good) {
  const rel = `${job.lang}/${job.char}/${job.id}.webm`;
  const out = path.join(GEN_ROOT, rel);
  mkdirSync(path.dirname(out), { recursive: true });
  return worker.call({ cmd: 'encode', wav: take.file, out, bitrate: BITRATE }).then(() => {
    const m = manifests[job.tier];
    const other = manifests[job.tier === 'core' ? 'extra' : 'core'];
    delete other.lines[job.lang]?.[job.char]?.[job.id];
    ((m.lines[job.lang] ??= {})[job.char] ??= {})[job.id] = {
      files: { webm: rel },
      duration: round(take.p.duration, 2),
      take: new Date().toISOString(),
      text: hash(job.say),
      voice: `${job.char}/${job.lang}-${job.variant}`,
      vkey: voiceSpec(job.char, job.lang, job.variant).key,
      err: round(take.err),
      ...(good ? {} : { rough: true }),
      lufs: round(take.p.lufs, 1),
      peak: round(take.p.peakDb, 1)
    };
    stats.lines++;
    (stats.errs[job.lang] ??= []).push(take.err);
    const master = path.join(MASTERS, job.lang, job.char, `${job.id}.wav`);
    mkdirSync(path.dirname(master), { recursive: true });
    copyFileSync(take.file, master);
    for (const f of [take.file, take.file.replace(/\.clean\.wav$/, '.wav')]) rmSync(f, { force: true });
    return true;
  });
}

function report() {
  const el = (Date.now() - stats.started) / 1000;
  console.log('');
  console.log(`Generated ${stats.lines} line(s) in ${Math.round(el / 60)} min: ${round(stats.audio, 0)} s of takes in ${round(stats.genSeconds, 0)} s of generation (${(stats.audio / Math.max(1, stats.genSeconds)).toFixed(2)}× real time), ${stats.takes} takes, ASR ${round(stats.asrSeconds, 0)} s.`);
  for (const [lang, errs] of Object.entries(stats.errs)) {
    const s = [...errs].sort((a, b) => a - b);
    console.log(`  ${lang}: ${s.length} lines, ${usesCer(lang) ? 'CER' : 'WER'} mean ${(s.reduce((a, b) => a + b, 0) / s.length * 100).toFixed(1)} %, median ${(s[Math.floor(s.length / 2)] * 100).toFixed(1)} %, worst ${(s.at(-1) * 100).toFixed(1)} %`);
  }
  if (stats.failed.length) {
    console.log(`  ${stats.failed.length} line(s) failed every take (left silent; run again to retry):`);
    for (const f of stats.failed.slice(0, 20)) console.log(`    ${f.lang}/${f.char}/${f.id}: “${f.text}” heard “${f.heard ?? '—'}”`);
  }
  writeJson(path.join(TOOL, 'last-run.json'), { ...stats, finished: new Date().toISOString() });
}

/** Re-encode the generated lines from their masters (a different bit rate, say), keeping their entries. */
async function encodeOnly() {
  const w = startWorker({ verbose: VERBOSE });
  let n = 0;
  try {
    for (const tier of ['core', 'extra']) {
      for (const [lang, chars] of Object.entries(manifests[tier].lines)) {
        if (!LANGS.includes(lang)) continue;
        for (const [char, lines] of Object.entries(chars)) {
          if (CHARS.length && !CHARS.includes(char)) continue;
          for (const [id, e] of Object.entries(lines)) {
            const master = path.join(MASTERS, lang, char, `${id}.wav`);
            if (!existsSync(master)) continue;
            await w.call({ cmd: 'encode', wav: master, out: path.join(GEN_ROOT, e.files.webm), bitrate: BITRATE });
            // A new file: a new date, so --pull takes it and browsers fetch it again (?t=).
            e.take = new Date().toISOString();
            n++;
          }
        }
      }
    }
  } finally {
    w.close();
  }
  saveManifests();
  console.log(`Re-encoded ${n} line(s) at ${BITRATE / 1000} kb/s.`);
}

/* ---------------------------------------------------------------- listening samples */

function writeSamples(dir) {
  mkdirSync(dir, { recursive: true });
  const rows = [];
  const pick = ['t.lesson.hello.math', 't.lesson.hello.history', 't.lesson.hello.physics', 't.voice.buddy.hello', 't.npc.1', 't.puzzle.won'];
  const merged = { core: manifests.core, extra: manifests.extra };
  for (const c of charsEn) {
    for (const lang of LOCALE_IDS) {
      const lines = { ...(merged.core.lines[lang]?.[c.id] ?? {}), ...(merged.extra.lines[lang]?.[c.id] ?? {}) };
      const id = pick.find((p) => lines[p]) ?? Object.keys(lines)[0];
      if (!id) continue;
      const src = path.join(GEN_ROOT, lines[id].files.webm);
      if (!existsSync(src)) continue;
      const name = `${c.id}-${lang}.webm`;
      copyFileSync(src, path.join(dir, name));
      const text = buildScript(lang).find((l) => l.id === id && l.char === c.id)?.text ?? '';
      rows.push({ char: c.id, name: c.name, lang, file: name, text, err: lines[id].err, size: statSync(src).size });
    }
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  const byChar = new Map();
  for (const r of rows) byChar.set(r.char, [...(byChar.get(r.char) ?? []), r]);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>AI Arcademia voices</title>
<style>body{font:15px/1.4 system-ui,sans-serif;margin:24px;max-width:1100px}h2{margin:22px 0 6px;font-size:17px}table{border-collapse:collapse;width:100%}td{padding:4px 8px;border-top:1px solid #ddd;vertical-align:middle}td.l{width:40px;font-weight:600}audio{height:32px}small{color:#777}</style></head><body>
<h1>AI Arcademia: generated character voices</h1><p>${esc(GEN_CREDIT.attribution)} One line per character per language.</p>
${[...byChar].map(([char, rs]) => `<h2>${esc(rs[0].name)} <small>${esc(char)} — ${esc(voiceOf(char)?.design ?? '')}</small></h2><table>${rs.map((r) => `<tr><td class="l">${r.lang}</td><td><audio controls preload="none" src="${esc(r.file)}"></audio></td><td lang="${r.lang}">${esc(r.text)}</td><td><small>${(r.err * 100).toFixed(0)} % off</small></td></tr>`).join('')}</table>`).join('\n')}
</body></html>`;
  writeFileSync(path.join(dir, 'index.html'), html);
  console.log(`Wrote ${rows.length} samples and ${path.join(dir, 'index.html')}`);
}
