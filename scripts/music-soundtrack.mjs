#!/usr/bin/env node
/**
 * Build the shared game soundtrack from scripts/music/soundtrack.json:
 * generate takes (several seeds per track) with ACE-Step 1.5 on this Mac,
 * judge them by the numbers, loop and master the best, and write
 * public/audio/bgm/<id>.ogg plus public/audio/bgm/manifest.json.
 *
 *   npm run music:soundtrack                       everything missing
 *   npm run music:soundtrack -- --only battle,boss just these
 *   npm run music:soundtrack -- --takes 4          more seeds per track
 *   npm run music:soundtrack -- --master-only      re-judge and re-master existing takes
 *
 * Raw takes, WAV masters, spectrograms and the full report stay in
 * library/music-masters/ (git-ignored). Only the Ogg files and the manifest
 * are meant to be committed.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { BGM, CREDIT, MASTERS, ROOT, py, ready, writeLibraryCredits } from './music/lib.mjs';

const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const ONLY = opt('--only', '')?.split(',').filter(Boolean) ?? [];
const TAKES = Number(opt('--takes', 3));
const MASTER_ONLY = argv.includes('--master-only');
const SPEC = JSON.parse(readFileSync(path.join(ROOT, 'scripts', 'music', 'soundtrack.json'), 'utf8'));

/** Stable seeds per track, so a re-run makes the same takes. */
function seedsFor(id, n) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return Array.from({ length: n }, (_, i) => ((h + i * 7919) % 900000) + 1000);
}

const rawDir = (id) => path.join(MASTERS, 'raw', id);
const takePath = (id, seed) => path.join(rawDir(id), `${id}-s${seed}.wav`);

function existingTakes(id) {
  if (!existsSync(rawDir(id))) return [];
  return readdirSync(rawDir(id))
    .map((f) => f.match(/-s(\d+)\.wav$/))
    .filter(Boolean)
    .map((m) => Number(m[1]));
}

async function main() {
  const status = ready();
  if (!status.ready && !MASTER_ONLY) throw new Error(status.reason);
  const tracks = SPEC.tracks.filter((t) => !ONLY.length || ONLY.includes(t.id));
  mkdirSync(BGM, { recursive: true });
  mkdirSync(path.join(MASTERS, 'report'), { recursive: true });

  // 1. Generate the missing takes in one model session.
  if (!MASTER_ONLY) {
    const jobs = [];
    for (const t of tracks) {
      // The first N of (seeds named in the spec, then stable per-track seeds), minus takes already on disk.
      const want = t.takes ?? TAKES;
      const have = new Set(existingTakes(t.id));
      const seeds = [...new Set([...(t.seeds ?? []), ...seedsFor(t.id, want)])].slice(0, Math.max(want, t.seeds?.length ?? 0)).filter((s) => !have.has(s));
      if (seeds.length) jobs.push({ prompt: t.prompt, seconds: t.seconds, bpm: t.bpm, key: t.key, timesig: t.timesig ?? '4', seeds, out: path.join(rawDir(t.id), `${t.id}.wav`), ...(t.steps ? { steps: t.steps } : {}) });
    }
    if (jobs.length) {
      const file = path.join(MASTERS, 'raw', 'jobs.json');
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, JSON.stringify({ model: SPEC.model, lm: SPEC.lm, jobs }, null, 1));
      const total = jobs.reduce((n, j) => n + j.seeds.length, 0);
      let done = 0;
      console.error(`Generating ${total} takes for ${jobs.length} tracks…`);
      await py('gen.py', [file], {
        onEvent: (ev) => {
          if (ev.event === 'loaded') console.error(`  model loaded in ${ev.seconds}s (${ev.device}, ${ev.model}, LM ${ev.lm})`);
          if (ev.event === 'take') console.error(`  [${++done}/${total}] ${path.basename(ev.path)}: ${ev.seconds}s in ${ev.took}s`);
          if (ev.event === 'error') console.error(`  [${++done}/${total}] seed ${ev.seed} failed: ${ev.error}`);
        }
      });
    }
  }

  // 2. Judge, pick, master.
  const reportFile = path.join(MASTERS, 'report', 'report.json');
  const report = existsSync(reportFile) ? JSON.parse(readFileSync(reportFile, 'utf8')) : {};
  for (const t of tracks) {
    const seeds = existingTakes(t.id);
    if (!seeds.length) {
      console.error(`${t.id}: no takes`);
      continue;
    }
    const judged = [];
    for (const seed of seeds) {
      const cache = takePath(t.id, seed).replace(/\.wav$/, '.analysis.json');
      let a;
      if (existsSync(cache) && statSync(cache).mtimeMs > statSync(takePath(t.id, seed)).mtimeMs) a = JSON.parse(readFileSync(cache, 'utf8'));
      else {
        [a] = await py('master.py', ['analyze', takePath(t.id, seed), '--bpm', String(t.bpm), '--key', t.key]);
        writeFileSync(cache, JSON.stringify(a));
      }
      judged.push({ ...a, seed });
    }
    judged.sort((a, b) => b.score - a.score);
    const chosen = (t.pick && judged.find((j) => j.seed === t.pick)) || judged[0];
    const args = [
      'master', chosen.path, '--id', t.id, '--kind', t.kind, '--bpm', String(t.bpm), '--key', t.key,
      '--beats-per-bar', String(t.beatsPerBar ?? 4),
      '--wav-out', path.join(MASTERS, `${t.id}.wav`), '--ogg', path.join(BGM, `${t.id}.ogg`), '--png', path.join(MASTERS, 'report', `${t.id}.png`),
      ...(t.kind === 'loop' ? ['--loop-min', String(t.loopMin ?? 80), '--loop-max', String(t.loopMax ?? Math.min(165, t.seconds - 6))] : []),
      ...(t.quality ? ['--quality', String(t.quality)] : [])
    ];
    const [m] = await py('master.py', args);
    report[t.id] = { picked: chosen.seed, pinned: Boolean(t.pick), takes: judged.map(({ st_lufs, ...rest }) => rest), master: m };
    console.error(
      `${t.id}: seed ${chosen.seed} (score ${chosen.score}; tempo ${chosen.tempo} vs ${t.bpm}, key ${chosen.key} vs ${t.key}) → ${m.duration}s, ${m.lufs} LUFS, TP ${m.true_peak_db} dB, ${m.kbps} kbps` +
        (m.seam ? `, loop ${m.loopStart.toFixed(2)}–${m.loopEnd.toFixed(2)} (${m.loop.bars} bars, seam flux z ${m.seam.flux_z}, step ${m.seam.rms_step_db} dB)` : '')
    );
    writeFileSync(reportFile, JSON.stringify(report, null, 1));
  }

  // 3. The manifest, for every track that has a master (not just this run's).
  const manifest = {
    version: 1,
    about: 'Shared background music. Loop points are in seconds of the decoded file; play [0, loopEnd) then loop [loopStart, loopEnd). See docs/music.md.',
    generator: { ...CREDIT },
    tracks: []
  };
  for (const t of SPEC.tracks) {
    const r = report[t.id];
    const file = path.join(BGM, `${t.id}.ogg`);
    if (!r || !existsSync(file)) continue;
    const m = r.master;
    const a = r.takes.find((x) => x.seed === r.picked) ?? {};
    manifest.tracks.push({
      id: t.id,
      title: t.title,
      file: `${t.id}.ogg`,
      kind: t.kind,
      tags: t.tags,
      mood: t.mood,
      bpm: t.bpm,
      key: t.key,
      measured: { tempo: a.tempo, key: a.key },
      duration: m.duration,
      ...(t.kind === 'loop' ? { loopStart: m.loopStart, loopEnd: m.loopEnd } : {}),
      ...(t.pair ? { pair: t.pair } : {}),
      lufs: m.lufs,
      bytes: statSync(file).size,
      style: t.prompt,
      seed: r.picked,
      generator: `${CREDIT.model} (${SPEC.model})`,
      licence: CREDIT.licence,
      credit: { model: CREDIT.model, url: CREDIT.modelUrl, licence: CREDIT.licence, licenceUrl: CREDIT.licenceUrl, attribution: CREDIT.attribution, text: CREDIT.line }
    });
  }
  writeFileSync(path.join(BGM, 'manifest.json'), `${JSON.stringify(manifest, null, 1)}\n`);
  writeLibraryCredits(manifest.tracks);
  const bytes = manifest.tracks.reduce((n, t) => n + t.bytes, 0);
  console.log(`manifest: ${manifest.tracks.length} tracks, ${(bytes / 1e6).toFixed(1)} MB in public/audio/bgm`);
}

main().catch((error) => {
  console.error(`music:soundtrack: ${error.message}`);
  process.exit(1);
});
