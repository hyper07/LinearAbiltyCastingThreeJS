#!/usr/bin/env node
/**
 * Make one piece of instrumental music, free, on this Mac (ACE-Step 1.5, MIT).
 *
 *   npm run music:gen -- --prompt "calm harp, flute and soft strings" --seconds 150 --out library/music-masters/try.ogg
 *     [--bpm 80] [--key "D major"] [--takes 3] [--seed 7] [--loop | --stinger] [--lm none] [--model acestep-v15-xl-sft]
 *
 * Several takes (seeds) are generated, measured (clipping, drop-outs, silences,
 * tempo and key against what you asked) and the best kept. With --out *.ogg the
 * best take is mastered: looped at bar boundaries with a crossfaded seam (or
 * trimmed as a stinger), normalised to about -16 LUFS, encoded as Ogg Vorbis,
 * with a spectrogram beside it (.png) and the numbers (.json). With --out *.wav
 * you get the raw best take. Describe styles and instruments; never name a
 * composer, artist or game. Install first: npm run music:setup.
 */
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { MASTERS, py, ready, CREDIT } from './music/lib.mjs';

function parseArgs(argv) {
  const out = { takes: 2, seconds: 120, model: 'acestep-v15-xl-sft', lm: 'acestep-5Hz-lm-1.7B' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--prompt') out.prompt = next();
    else if (a === '--seconds') out.seconds = Number(next());
    else if (a === '--out') out.out = next();
    else if (a === '--bpm') out.bpm = Number(next());
    else if (a === '--key') out.key = next();
    else if (a === '--takes') out.takes = Number(next());
    else if (a === '--seed') out.seed = Number(next());
    else if (a === '--model') out.model = next();
    else if (a === '--lm') out.lm = next() === 'none' ? null : argv[i];
    else if (a === '--loop') out.kind = 'loop';
    else if (a === '--stinger') out.kind = 'stinger';
    else if (a === '-h' || a === '--help') out.help = true;
    else throw new Error(`unknown argument: ${a}`);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.prompt || !args.out) {
    console.log('usage: npm run music:gen -- --prompt "…" --seconds N --out file.ogg|file.wav [--bpm N] [--key "D minor"] [--takes 2] [--seed N] [--loop|--stinger]');
    process.exit(args.help ? 0 : 1);
  }
  const status = ready();
  if (!status.ready) throw new Error(status.reason);
  const out = path.resolve(args.out);
  const name = path.basename(out).replace(/\.[^.]+$/, '');
  const rawDir = path.join(MASTERS, 'raw', name);
  mkdirSync(rawDir, { recursive: true });
  const seeds = args.seed != null ? [args.seed] : Array.from({ length: args.takes }, () => Math.floor(Math.random() * 1e6));
  const spec = path.join(rawDir, 'job.json');
  writeFileSync(spec, JSON.stringify({ model: args.model, lm: args.lm, jobs: [{ prompt: args.prompt, seconds: args.seconds, bpm: args.bpm, key: args.key ?? '', seeds, out: path.join(rawDir, `${name}.wav`) }] }));

  const started = Date.now();
  const takes = [];
  await py('gen.py', [spec], {
    onEvent: (ev) => {
      if (ev.event === 'loaded') console.error(`  model loaded in ${ev.seconds}s (${ev.device})`);
      if (ev.event === 'take') {
        takes.push(ev);
        console.error(`  take seed ${ev.seed}: ${ev.seconds}s of audio in ${ev.took}s`);
      }
      if (ev.event === 'error') console.error(`  take seed ${ev.seed} failed: ${ev.error}`);
    }
  });
  if (!takes.length) throw new Error('no takes were generated');

  const judged = [];
  for (const t of takes) {
    const [a] = await py('master.py', ['analyze', t.path, ...(args.bpm ? ['--bpm', String(args.bpm)] : []), ...(args.key ? ['--key', args.key] : [])]);
    judged.push({ ...a, seed: t.seed });
    console.error(`  seed ${t.seed}: score ${a.score}, tempo ${a.tempo}, key ${a.key}, ${a.lufs} LUFS, clipped ${a.clipped}, drop-outs ${a.dropouts}`);
  }
  judged.sort((a, b) => b.score - a.score);
  const best = judged[0];
  mkdirSync(path.dirname(out), { recursive: true });

  if (out.endsWith('.wav')) {
    copyFileSync(best.path, out);
  } else {
    const kind = args.kind ?? (args.seconds >= 60 ? 'loop' : 'stinger');
    const base = out.replace(/\.[^.]+$/, '');
    const [m] = await py('master.py', [
      'master', best.path, '--id', name, '--kind', kind,
      ...(args.bpm ? ['--bpm', String(args.bpm)] : []), ...(args.key ? ['--key', args.key] : []),
      '--loop-min', String(Math.min(70, args.seconds * 0.5)), '--loop-max', String(args.seconds),
      '--wav-out', `${base}.master.wav`, '--ogg', out, '--png', `${base}.png`
    ]);
    writeFileSync(`${base}.json`, JSON.stringify({ prompt: args.prompt, seed: best.seed, analysis: { ...best, st_lufs: undefined }, master: m, credit: CREDIT }, null, 1));
    console.error(`  mastered: ${m.duration}s, ${m.lufs} LUFS, true peak ${m.true_peak_db} dB${m.loopStart != null ? `, loop ${m.loopStart.toFixed(2)}–${m.loopEnd.toFixed(2)}s` : ''}`);
  }
  console.log(`Made ${path.relative(process.cwd(), out)} (best of ${takes.length}, seed ${best.seed}) in ${Math.round((Date.now() - started) / 1000)}s`);
  console.log(`  credit: ${CREDIT.line}`);
}

main().catch((error) => {
  console.error(`music:gen: ${error.message}`);
  process.exit(1);
});
