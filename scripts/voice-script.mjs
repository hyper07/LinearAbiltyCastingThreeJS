#!/usr/bin/env node
/**
 * AI Arcademia's voice script, for the people who record it: one file per
 * character and language, with each line's id, text, direction, context and
 * an estimated length. Barks first, then floor by floor (1–2 first).
 *
 *   npm run voice:script                          every character, every language → data/voice-script/
 *   npm run voice:script -- --lang ko             one language
 *   npm run voice:script -- --char hoot           one character (repeat or comma-separate for more)
 *   npm run voice:script -- --kind bark           only barks (or story, reading, quiz)
 *   npm run voice:script -- --format csv          csv, html (printable) or both (default)
 *   npm run voice:script -- --missing             only lines with no recording yet (public/audio/voice)
 *   npm run voice:script -- --out somewhere/      where to write
 *   npm run voice:script -- --stats               just print the counts
 *
 * The recordings themselves are made in the voice studio (voice-studio.html).
 * Real people only: the platform never uses synthesized or AI voices.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { LOCALE_IDS } from '../src/arcademia/i18n/index.js';
import { registerAllLocales } from '../src/arcademia/voice/locales.js';
import { buildScript, linesFor, scriptCsv, scriptHtml, scriptStats, voiceCharacters, VOICE_KINDS } from '../src/arcademia/voice/script.js';
import { recordingFor } from '../src/arcademia/voice/manifest.js';

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
  console.log(`npm run voice:script -- [--lang ko] [--char hoot] [--kind bark] [--format csv|html|both] [--missing] [--out dir] [--stats]`);
  process.exit(0);
}

registerAllLocales();
const langs = opt('lang').length ? opt('lang') : LOCALE_IDS;
for (const l of langs) if (!LOCALE_IDS.includes(l)) throw new Error(`Unknown language ${l} (${LOCALE_IDS.join(', ')})`);
const allChars = voiceCharacters('en').map((c) => c.id);
const wanted = opt('char');
for (const c of wanted) if (!allChars.includes(c)) throw new Error(`Unknown character ${c}. Characters: ${allChars.join(', ')}`);
const kinds = opt('kind');
for (const k of kinds) if (!VOICE_KINDS.includes(k)) throw new Error(`Unknown kind ${k} (${VOICE_KINDS.join(', ')})`);
const format = (opt('format')[0] ?? 'both').toLowerCase();
const out = resolve(opt('out')[0] ?? join('data', 'voice-script'));
let manifest = null;
if (flag('missing')) {
  try {
    manifest = JSON.parse(await readFile(resolve('public', 'audio', 'voice', 'manifest.json'), 'utf8'));
  } catch {
    manifest = { lines: {} };
  }
}

const rows = [];
let files = 0;
for (const lang of langs) {
  const script = buildScript(lang).filter((l) => (!kinds.length || kinds.includes(l.kind)) && (!manifest || !recordingFor(manifest, lang, l.char, l.id)));
  const stats = scriptStats(buildScript(lang));
  const chars = voiceCharacters(lang).filter((c) => !wanted.length || wanted.includes(c.id));
  for (const c of chars) {
    const lines = linesFor(script, c.id);
    rows.push({ lang, char: c.id, barks: stats[c.id]?.barks ?? 0, all: stats[c.id]?.total ?? 0, minutes: Math.round(((stats[c.id]?.seconds ?? 0) / 60) * 10) / 10, written: lines.length });
    if (flag('stats') || !lines.length) continue;
    const dir = join(out, lang);
    await mkdir(dir, { recursive: true });
    if (format === 'csv' || format === 'both') {
      await writeFile(join(dir, `${c.id}.csv`), scriptCsv(lines, lang));
      files++;
    }
    if (format === 'html' || format === 'both') {
      await writeFile(join(dir, `${c.id}.html`), scriptHtml(lines, { lang, character: c }));
      files++;
    }
  }
}

// The counts: barks and all lines per character and language.
const byChar = new Map();
for (const r of rows) {
  if (!byChar.has(r.char)) byChar.set(r.char, {});
  byChar.get(r.char)[r.lang] = r;
}
const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad('character', 34)}${langs.map((l) => pad(`${l} barks/all`, 16)).join('')}`);
for (const [char, per] of byChar) console.log(`${pad(char, 34)}${langs.map((l) => pad(per[l] ? `${per[l].barks}/${per[l].all}` : '—', 16)).join('')}`);
const tot = (l) => rows.filter((r) => r.lang === l).reduce((s, r) => ({ barks: s.barks + r.barks, all: s.all + r.all, min: s.min + r.minutes }), { barks: 0, all: 0, min: 0 });
console.log(`${pad('total', 34)}${langs.map((l) => pad(`${tot(l).barks}/${tot(l).all}`, 16)).join('')}`);
console.log(`about ${langs.map((l) => `${Math.round(tot(l).min)} min (${l})`).join(', ')} of speech`);
if (!flag('stats')) console.log(`\nwrote ${files} file(s) to ${out}${manifest ? ' (missing lines only)' : ''}`);
