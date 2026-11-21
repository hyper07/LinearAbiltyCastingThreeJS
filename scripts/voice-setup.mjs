#!/usr/bin/env node
/**
 * Install or repair AI Arcademia's local voice generator: Qwen3-TTS
 * (Apache-2.0 code and weights, https://github.com/QwenLM/Qwen3-TTS) for the
 * characters' voices and Whisper large-v3-turbo (MIT,
 * https://huggingface.co/openai/whisper-large-v3-turbo) to check each take,
 * on Apple silicon.
 *
 *   npm run voice:setup            install / repair (idempotent)
 *   npm run voice:setup -- --check report what is there, change nothing
 *
 * Everything goes in library/tools/qwen3-tts (git-ignored): the source at a
 * pinned commit, a Python 3.12 venv built by uv with pinned packages, and the
 * weights in weights/ from the official Hugging Face repos at pinned
 * revisions. Nothing goes into the system Python and nothing needs sudo.
 * About 12 GB on disk. Not gated: no Hugging Face login needed.
 *
 * Then: npm run voice:gen (scripts/voice-gen.mjs).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { arch, platform } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeVoiceCredits } from './voice/lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
export const TOOL = path.join(ROOT, 'library', 'tools', 'qwen3-tts');
const STATUS = path.join(TOOL, '.gamory-setup.json');
const PYTHON = path.join(TOOL, '.venv', 'bin', 'python');
const CHECK_ONLY = process.argv.includes('--check');

/** Source, pinned to the commit this was tested with (Nov 2026; package qwen-tts 0.1.1). */
const REPO = { url: 'https://github.com/QwenLM/Qwen3-TTS.git', commit: '022e286b98fbec7e1e916cb940cdf532cd9f488e' };
/**
 * The venv: qwen-tts's own dependencies at the versions it pins (transformers,
 * accelerate), minus its web demo (gradio). PyAV encodes WebM/Opus with no
 * ffmpeg on the system (its wheel carries the libraries).
 */
const PACKAGES = [
  'torch==2.9.1',
  'torchaudio==2.9.1',
  'transformers==4.57.3',
  'accelerate==1.12.0',
  'librosa==0.11.0',
  'soundfile==0.13.1',
  'onnxruntime==1.23.2',
  'einops==0.8.1',
  'sox==1.5.0',
  'av==16.0.1',
  // Japanese readings, to check takes on pronunciation rather than spelling (MIT; UniDic 2.1.2 under its BSD licence).
  'fugashi==1.5.2',
  'unidic-lite==1.0.8',
  'huggingface_hub[hf_xet]'
];

/** Model weights, official Hugging Face repos only (none gated). */
const WEIGHTS = [
  { key: 'design', repo: 'Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign', dir: 'Qwen3-TTS-12Hz-1.7B-VoiceDesign', revision: '5ecdb67327fd37bb2e042aab12ff7391903235d3', license: 'Apache-2.0' },
  { key: 'base', repo: 'Qwen/Qwen3-TTS-12Hz-1.7B-Base', dir: 'Qwen3-TTS-12Hz-1.7B-Base', revision: 'fd4b254389122332181a7c3db7f27e918eec64e3', license: 'Apache-2.0' },
  { key: 'asr', repo: 'openai/whisper-large-v3-turbo', dir: 'whisper-large-v3-turbo', revision: '41f01f3fe87f28c78e2fbf8b568835947dd65ed9', license: 'MIT', allow: ['*.json', '*.txt', 'model.safetensors'] }
];

const say = (line = '') => console.log(line);
function run(cmd, args, { cwd = TOOL, env = {}, quiet = false, allowFail = false } = {}) {
  const result = spawnSync(cmd, args, { cwd, env: { ...process.env, ...env }, stdio: quiet ? 'pipe' : 'inherit', encoding: 'utf8' });
  if (result.status !== 0 && !allowFail) {
    throw new Error(`${cmd} ${args.join(' ')} failed (${result.status ?? result.error?.message})${quiet ? `\n${result.stderr ?? ''}` : ''}`);
  }
  return result;
}
const has = (cmd, args = ['--version']) => spawnSync(cmd, args, { stdio: 'ignore' }).status === 0;
const git = (args, opts = {}) => run('git', ['-C', TOOL, ...args], { quiet: true, ...opts });

function ensureRepo() {
  const head = existsSync(path.join(TOOL, '.git')) ? git(['rev-parse', 'HEAD'], { allowFail: true }).stdout?.trim() : null;
  if (head === REPO.commit) {
    say(`  Qwen3-TTS: ${REPO.commit.slice(0, 8)} ✓`);
    return true;
  }
  if (CHECK_ONLY) {
    say(`  Qwen3-TTS: ${head ? `at ${head.slice(0, 8)}, want ${REPO.commit.slice(0, 8)}` : 'missing'}`);
    return false;
  }
  mkdirSync(TOOL, { recursive: true });
  if (!head) {
    git(['init', '-q']);
    git(['remote', 'add', 'origin', REPO.url], { allowFail: true });
  }
  say(`  Qwen3-TTS: fetching ${REPO.commit.slice(0, 8)} from ${REPO.url}`);
  git(['fetch', '-q', '--depth', '1', 'origin', REPO.commit]);
  git(['checkout', '-q', '--force', REPO.commit]);
  return true;
}

const PY_CHECK = `
import json
out = {}
try:
    import torch, soundfile, av, transformers, qwen_tts  # noqa
    out["torch"] = torch.__version__
    out["mps"] = bool(torch.backends.mps.is_available())
    out["opus"] = "libopus" in av.codecs_available
    out["transformers"] = transformers.__version__
except Exception as e:
    out["error"] = type(e).__name__ + ": " + str(e)[:200]
print(json.dumps(out))
`;

const PY_WEIGHTS = `
import json, os, sys
from huggingface_hub import snapshot_download
check = sys.argv[1] == "check"
root = sys.argv[3]
out = {}
for spec in json.loads(sys.argv[2]):
    target = os.path.join(root, spec["dir"])
    try:
        if check:
            ok = any(f.endswith(".safetensors") for _, _, fs in os.walk(target) for f in fs) and not any(f.endswith(".incomplete") for _, _, fs in os.walk(target) for f in fs)
            out[spec["key"]] = {"ok": ok}
            continue
        snapshot_download(spec["repo"], revision=spec.get("revision"), local_dir=target, allow_patterns=spec.get("allow"))
        out[spec["key"]] = {"ok": True}
    except Exception as e:
        out[spec["key"]] = {"ok": False, "error": (type(e).__name__ + ": " + str(e))[:200]}
print("@@" + json.dumps(out))
`;

function main() {
  if (platform() !== 'darwin' || arch() !== 'arm64') {
    say('The local voice generator is set up for Macs with Apple silicon.');
    process.exit(1);
  }
  if (!has('git')) throw new Error('git is required');
  if (!has('uv')) throw new Error('uv is required (https://docs.astral.sh/uv/) — it builds the venv');
  say(`${CHECK_ONLY ? 'Checking' : 'Setting up'} Qwen3-TTS + Whisper in ${path.relative(ROOT, TOOL)}`);

  say('Source:');
  const source = ensureRepo();

  if (!CHECK_ONLY && source) {
    say('Python venv (uv, Python 3.12, pinned packages):');
    if (!existsSync(PYTHON)) run('uv', ['venv', '-q', '--python', '3.12', '.venv']);
    run('uv', ['pip', 'install', '-q', '--python', PYTHON, ...PACKAGES]);
    // The package itself from the pinned checkout; its dependencies are the list above (no gradio demo).
    run('uv', ['pip', 'install', '-q', '--python', PYTHON, '--no-deps', '--reinstall-package', 'qwen-tts', '.']);
  }

  let python = {};
  if (existsSync(PYTHON)) {
    const r = run(PYTHON, ['-c', PY_CHECK], { quiet: true, allowFail: true, cwd: ROOT });
    try {
      python = JSON.parse(r.stdout.trim().split('\n').at(-1));
    } catch {
      python = {};
    }
  }
  say(`  torch ${python.torch ?? 'missing'}, transformers ${python.transformers ?? '?'}, MPS ${python.mps ? '✓' : '✗'}, Opus encoder ${python.opus ? '✓' : '✗'}${python.error ? ` (${python.error})` : ''}`);

  say('Model weights (Hugging Face, official repos, pinned revisions):');
  let weights = {};
  if (existsSync(PYTHON)) {
    const r = run(PYTHON, ['-c', PY_WEIGHTS, CHECK_ONLY ? 'check' : 'download', JSON.stringify(WEIGHTS), path.join(TOOL, 'weights')], {
      quiet: true,
      allowFail: true,
      cwd: ROOT,
      env: { HF_HUB_DISABLE_TELEMETRY: '1' }
    });
    const line = (r.stdout ?? '').split('\n').find((l) => l.startsWith('@@'));
    weights = line ? JSON.parse(line.slice(2)) : {};
    if (!line) say(`  could not check: ${(r.stderr ?? '').trim().split('\n').at(-1)}`);
  }
  for (const w of WEIGHTS) {
    const got = weights[w.key];
    say(`  ${w.repo} (${w.license}): ${got?.ok ? '✓' : `missing${got?.error ? ` (${got.error})` : ''}`}`);
  }

  const ready = Boolean(source && python.torch && python.mps && python.opus && WEIGHTS.every((w) => weights[w.key]?.ok));
  if (!CHECK_ONLY) {
    writeFileSync(
      STATUS,
      JSON.stringify({ ready, updatedAt: new Date().toISOString(), torch: python.torch ?? null, commit: REPO.commit, weights: Object.fromEntries(WEIGHTS.map((w) => [w.repo, w.revision])) }, null, 1)
    );
    writeVoiceCredits();
  }
  say();
  if (ready) {
    say('Ready. Generate with: npm run voice:gen -- --kind bark   (then --floor 1-2, then --missing for the rest)');
  } else {
    say('Not ready yet: run npm run voice:setup again and read the errors above.');
    process.exitCode = CHECK_ONLY ? 1 : 0;
  }
}

try {
  main();
} catch (error) {
  console.error(`voice:setup failed: ${error.message}`);
  process.exit(1);
}
