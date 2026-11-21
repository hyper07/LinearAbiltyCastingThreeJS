/**
 * Shared bits for npm run voice:setup and npm run voice:gen: where the local
 * voice generator lives, how to talk to its Python worker (one JSON object
 * per line both ways), and the voice section of library/CREDITS.md.
 */
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { GEN_CREDIT } from '../../src/arcademia/voice/generated.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..');
export const TOOL = path.join(ROOT, 'library', 'tools', 'qwen3-tts');
export const PYTHON = path.join(TOOL, '.venv', 'bin', 'python');
export const WEIGHTS = path.join(TOOL, 'weights');
export const GEN_ROOT = path.join(ROOT, 'public', 'audio', 'voice-gen');
/** Designed reference voices (one short clip per character), kept with the tool, never committed. */
export const REFS = path.join(TOOL, 'refs');

/** Whether the generator is installed (npm run voice:setup). */
export function ready() {
  const status = path.join(TOOL, '.gamory-setup.json');
  if (!existsSync(PYTHON)) return { ready: false, reason: 'no venv: run npm run voice:setup' };
  try {
    if (!JSON.parse(readFileSync(status, 'utf8')).ready) return { ready: false, reason: 'setup incomplete: run npm run voice:setup' };
  } catch {
    return { ready: false, reason: 'not set up: run npm run voice:setup' };
  }
  return { ready: true };
}

/**
 * Start the Python worker (scripts/voice/worker.py). `call(cmd)` sends one
 * request and resolves with its reply; replies come back in order.
 */
export function startWorker({ verbose = false, env = {} } = {}) {
  const child = spawn(PYTHON, ['-I', '-X', 'faulthandler', path.join(HERE, 'worker.py')], {
    cwd: TOOL,
    env: { ...process.env, VOICE_WEIGHTS: WEIGHTS, HF_HUB_OFFLINE: '1', HF_HUB_DISABLE_TELEMETRY: '1', PYTORCH_ENABLE_MPS_FALLBACK: '1', TOKENIZERS_PARALLELISM: 'false', ...env },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  const waiting = [];
  let buf = '';
  let err = '';
  let dead = null;
  child.stdout.setEncoding('utf8').on('data', (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      if (!line.startsWith('@@')) {
        if (verbose && line.trim()) process.stderr.write(`${line}\n`);
        continue;
      }
      const reply = JSON.parse(line.slice(2));
      const w = waiting.shift();
      if (!w) continue;
      if (reply.error) w.reject(new Error(reply.error));
      else w.resolve(reply);
    }
  });
  child.stderr.setEncoding('utf8').on('data', (d) => {
    err = (err + d).slice(-6000);
    if (verbose) process.stderr.write(d);
  });
  child.on('close', (code, signal) => {
    dead = new Error(`voice worker exited (${signal ?? code})\n${err.split('\n').slice(-15).join('\n')}`);
    while (waiting.length) waiting.shift().reject(dead);
  });
  return {
    child,
    call(cmd) {
      if (dead) return Promise.reject(dead);
      return new Promise((resolve, reject) => {
        waiting.push({ resolve, reject });
        child.stdin.write(`${JSON.stringify(cmd)}\n`);
      });
    },
    close() {
      try {
        child.stdin.end();
      } catch {
        /* gone */
      }
    }
  };
}

/* ---------------------------------------------------------------- WAV in and out (16-bit or float PCM, mono) */

export function readWav(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error('not a WAV file');
  let off = 12, fmt = null, data = null;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === 'fmt ') fmt = { format: buf.readUInt16LE(off + 8), channels: buf.readUInt16LE(off + 10), rate: buf.readUInt32LE(off + 12), bits: buf.readUInt16LE(off + 22) };
    else if (id === 'data') data = buf.subarray(off + 8, off + 8 + size);
    off += 8 + size + (size & 1);
  }
  if (!fmt || !data) throw new Error('WAV without fmt or data');
  const n = Math.floor(data.length / (fmt.bits / 8) / fmt.channels);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let c = 0; c < fmt.channels; c++) {
      const at = (i * fmt.channels + c) * (fmt.bits / 8);
      s += fmt.format === 3 ? data.readFloatLE(at) : fmt.bits === 16 ? data.readInt16LE(at) / 32768 : data.readInt32LE(at) / 2147483648;
    }
    out[i] = s / fmt.channels;
  }
  return { samples: out, rate: fmt.rate };
}

/* ---------------------------------------------------------------- credits */

export const VOICE_CREDITS_HEADING = '## Local voice generator (library/tools/qwen3-tts)';

export function voiceCreditsMarkdown() {
  return [
    VOICE_CREDITS_HEADING,
    '',
    'Installed by `npm run voice:setup`; AI Arcademia\'s generated character voices (`public/audio/voice-gen/`) are made by `npm run voice:gen`. Every generated line carries this credit in `public/audio/voice-gen/manifest.json`, and the game shows it in its Credits panel. Human recordings from the voice studio always play instead of a generated line.',
    '',
    `> ${GEN_CREDIT.attribution}`,
    '',
    '| Part | Role | Licence | Link |',
    '| --- | --- | --- | --- |',
    '| Qwen3-TTS code (qwen-tts 0.1.1) | Speech generation (Alibaba Qwen team) | Apache-2.0 | https://github.com/QwenLM/Qwen3-TTS |',
    '| Qwen3-TTS-12Hz-1.7B-VoiceDesign | Designs each character\'s voice from a written description (no real person\'s voice is cloned) | Apache-2.0 | https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign |',
    '| Qwen3-TTS-12Hz-1.7B-Base (with its 12 Hz speech tokenizer) | Speaks every line in the designed voice, in all five languages | Apache-2.0 | https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-Base |',
    '| Whisper large-v3-turbo | Listens to each take to check the words match the script | MIT | https://huggingface.co/openai/whisper-large-v3-turbo |',
    '| fugashi with unidic-lite (UniDic 2.1.2) | Japanese readings, to check takes on pronunciation | MIT (fugashi, unidic-lite); UniDic: BSD | https://github.com/polm/fugashi |',
    '| PyTorch, transformers, librosa, soundfile, PyAV (FFmpeg and libopus as shared libraries) and the other venv packages | Python runtime, checks and WebM/Opus encoding | BSD / Apache-2.0 / MIT / ISC / LGPL-2.1 (FFmpeg) / BSD-3 (libopus) | scripts/voice-setup.mjs |',
    '',
    ''
  ].join('\n');
}

/** Add or refresh the voice section of library/CREDITS.md, before the music section. */
export function writeVoiceCredits() {
  const file = path.join(ROOT, 'library', 'CREDITS.md');
  let text = existsSync(file) ? readFileSync(file, 'utf8') : '# Asset library credits\n';
  const at = text.indexOf(VOICE_CREDITS_HEADING);
  if (at >= 0) {
    const next = text.indexOf('\n## ', at + VOICE_CREDITS_HEADING.length);
    text = text.slice(0, at) + (next >= 0 ? text.slice(next + 1) : '');
  }
  const section = voiceCreditsMarkdown();
  const music = text.indexOf('## Local music generator');
  text = music >= 0 ? `${text.slice(0, music)}${section}${text.slice(music)}` : `${text.replace(/\s*$/, '\n\n')}${section}`;
  writeFileSync(file, text);
}

/* ---------------------------------------------------------------- the committed split */

/**
 * public/audio/voice-gen/.gitignore: everything in the language folders is ignored except the
 * core files (barks and floors 1–2, listed in manifest.json), so only those are committed.
 */
export function writeGenGitignore(core, dir = GEN_ROOT) {
  const keep = [];
  for (const [lang, chars] of Object.entries(core?.lines ?? {})) {
    for (const [char, lines] of Object.entries(chars)) for (const e of Object.values(lines)) for (const f of Object.values(e.files)) keep.push(`!/${lang}/${char}/${f.split('/').pop()}`);
  }
  keep.sort();
  writeFileSync(
    path.join(dir, '.gitignore'),
    `# Written by npm run voice:gen. Generated voices for barks and floors 1–2 (manifest.json) are committed;\n# the rest (manifest.local.json and its files) are made again with npm run voice:gen -- --tier extra.\nmanifest.local.json\n/*/*/*\n${keep.join('\n')}\n`
  );
}

/**
 * Merge generated voices fetched from another Mac (`from`, a voice-gen folder) into ours (`to`):
 * per line, the newer take wins; its file is copied. Returns the number of lines taken.
 */
export function mergeGenerated(from, to = GEN_ROOT) {
  const read = (f) => {
    try {
      return JSON.parse(readFileSync(f, 'utf8'));
    } catch {
      return null;
    }
  };
  let taken = 0;
  const out = {};
  for (const name of ['manifest.json', 'manifest.local.json']) {
    const theirs = read(path.join(from, name));
    const ours = read(path.join(to, name)) ?? theirs;
    if (!theirs || !ours) continue;
    ours.voices = { ...(theirs.voices ?? {}), ...(ours.voices ?? {}) };
    for (const [lang, chars] of Object.entries(theirs.lines ?? {})) {
      for (const [char, lines] of Object.entries(chars)) {
        for (const [id, e] of Object.entries(lines)) {
          const mine = ours.lines?.[lang]?.[char]?.[id];
          if (mine && Date.parse(mine.take) >= Date.parse(e.take)) continue;
          const files = Object.values(e.files);
          if (!files.every((f) => existsSync(path.join(from, f)))) continue;
          for (const f of files) {
            mkdirSync(path.dirname(path.join(to, f)), { recursive: true });
            copyFileSync(path.join(from, f), path.join(to, f));
          }
          (((ours.lines ??= {})[lang] ??= {})[char] ??= {})[id] = e;
          taken++;
        }
      }
    }
    ours.updated = new Date().toISOString();
    mkdirSync(to, { recursive: true });
    writeFileSync(path.join(to, name), `${JSON.stringify(ours, null, 1)}\n`);
    out[name] = ours;
  }
  if (out['manifest.json']) writeGenGitignore(out['manifest.json'], to);
  return taken;
}
