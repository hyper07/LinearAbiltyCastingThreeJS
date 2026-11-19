/**
 * Shared bits for npm run music:gen and npm run music:soundtrack: where the
 * generator lives, and how to call its Python (generation and mastering) and
 * read the "@@{json}" lines it prints.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..');
export const TOOL = path.join(ROOT, 'library', 'tools', 'ace-step');
export const PYTHON = path.join(TOOL, '.venv', 'bin', 'python');
export const MASTERS = path.join(ROOT, 'library', 'music-masters');
export const BGM = path.join(ROOT, 'public', 'audio', 'bgm');

/** The credit every track carries (ACE-Step 1.5: MIT code and weights). */
export const CREDIT = {
  model: 'ACE-Step 1.5',
  modelUrl: 'https://github.com/ace-step/ACE-Step-1.5',
  weights: 'ACE-Step/acestep-v15-xl-sft',
  weightsUrl: 'https://huggingface.co/ACE-Step/acestep-v15-xl-sft',
  licence: 'MIT',
  licenceUrl: 'https://github.com/ace-step/ACE-Step-1.5/blob/main/LICENSE',
  // The MIT licence asks for its notice to travel with copies of the software, not
  // with what the software makes; we credit the model anyway, as the user asked.
  attribution: 'Music generated with ACE-Step 1.5 (MIT licence, https://github.com/ace-step/ACE-Step-1.5).',
  line: 'Music generated with ACE-Step 1.5 (MIT, https://github.com/ace-step/ACE-Step-1.5)'
};

export function ready() {
  const status = path.join(TOOL, '.gamory-setup.json');
  if (!existsSync(PYTHON)) return { ready: false, reason: 'no venv: run npm run music:setup' };
  if (existsSync(status)) {
    const s = JSON.parse(readFileSync(status, 'utf8'));
    if (!s.ready) return { ready: false, reason: 'setup incomplete: run npm run music:setup' };
  }
  return { ready: true };
}

/** Run one of our Python scripts in the venv; resolve with every "@@" JSON line. */
export function py(script, args, { onEvent = () => {}, verbose = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, ['-I', path.join(HERE, script), ...args], {
      cwd: TOOL,
      env: { ...process.env, ACESTEP_TOOL_DIR: TOOL, HF_HUB_OFFLINE: '1', HF_HUB_DISABLE_TELEMETRY: '1', PYTORCH_ENABLE_MPS_FALLBACK: '1' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const events = [];
    let buf = '';
    let err = '';
    child.stdout.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 1);
        if (line.startsWith('@@')) {
          const ev = JSON.parse(line.slice(2));
          events.push(ev);
          onEvent(ev);
        } else if (verbose) process.stderr.write(`${line}\n`);
      }
    });
    child.stderr.on('data', (d) => {
      err = (err + d).slice(-4000);
      if (verbose) process.stderr.write(d);
    });
    child.on('close', (code) => (code === 0 ? resolve(events) : reject(new Error(`${script} exited ${code}\n${err.split('\n').slice(-12).join('\n')}`))));
  });
}

export const MUSIC_CREDITS_HEADING = '## Local music generator (library/tools/ace-step)';

/** The music section of library/CREDITS.md: the generator, its parts, and the tracks made with it. */
export function musicCreditsMarkdown(tracks = []) {
  return [
    MUSIC_CREDITS_HEADING,
    '',
    'Installed by `npm run music:setup`; the shared soundtrack (`public/audio/bgm/`) is built by `npm run music:soundtrack`. Every track carries this credit in `public/audio/bgm/manifest.json`, and games show it (music toast and Credits panel):',
    '',
    `> ${CREDIT.attribution}`,
    '',
    '| Part | Role | Licence | Link |',
    '| --- | --- | --- | --- |',
    '| ACE-Step 1.5 code | Music generation pipeline (ACE Studio and StepFun) | MIT | https://github.com/ace-step/ACE-Step-1.5 |',
    '| acestep-v15-xl-sft | 4B diffusion transformer (DiT), the soundtrack model | MIT | https://huggingface.co/ACE-Step/acestep-v15-xl-sft |',
    '| Ace-Step1.5 (VAE, acestep-5Hz-lm-1.7B planner LM, Qwen3-Embedding-0.6B text encoder, 2B turbo DiT) | Audio codec, song planner, text encoder | MIT (Qwen3-Embedding: Apache-2.0) | https://huggingface.co/ACE-Step/Ace-Step1.5 |',
    '| PyTorch, MLX, transformers, librosa, pyloudnorm, soundfile (libsndfile, libvorbis) and the other venv packages | Python runtime, analysis, mastering and Ogg Vorbis encoding | BSD / MIT / Apache-2.0 / ISC / LGPL-2.1 (libsndfile, as a shared library) | library/tools/ace-step/uv.lock |',
    '',
    ...(tracks.length
      ? ['Tracks:', '', '| Track | File | Licence of the output |', '| --- | --- | --- |', ...tracks.map((t) => `| ${t.title} | public/audio/bgm/${t.file} | Ours; generated with ACE-Step 1.5 (MIT) |`), '']
      : []),
    ''
  ].join('\n');
}

/** Add or refresh the music section, kept before the TRELLIS section (which rewrites to the end). */
export function withMusicCredits(markdown, tracks = []) {
  let text = markdown;
  const at = text.indexOf(MUSIC_CREDITS_HEADING);
  if (at >= 0) {
    const next = text.indexOf('\n## ', at + MUSIC_CREDITS_HEADING.length);
    text = text.slice(0, at) + (next >= 0 ? text.slice(next + 1) : '');
  }
  const section = musicCreditsMarkdown(tracks);
  const trellis = text.indexOf('## Local model generator');
  if (trellis >= 0) return `${text.slice(0, trellis)}${section}\n${text.slice(trellis)}`;
  return `${text.replace(/\s*$/, '\n\n')}${section}`;
}

/** Write the music section into library/CREDITS.md (creating it if needed). */
export function writeLibraryCredits(tracks = []) {
  const file = path.join(ROOT, 'library', 'CREDITS.md');
  const current = existsSync(file) ? readFileSync(file, 'utf8') : '# Asset library credits\n';
  writeFileSync(file, withMusicCredits(current, tracks));
}

/** The tracks in public/audio/bgm/manifest.json ([] when there is none yet). */
export function musicTracks() {
  try {
    return JSON.parse(readFileSync(path.join(BGM, 'manifest.json'), 'utf8')).tracks ?? [];
  } catch {
    return [];
  }
}
