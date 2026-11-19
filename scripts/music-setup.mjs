#!/usr/bin/env node
/**
 * Install or repair the free, local music generator: ACE-Step 1.5 (MIT code and
 * MIT weights, https://github.com/ace-step/ACE-Step-1.5) on Apple silicon.
 *
 *   npm run music:setup            install / repair (idempotent)
 *   npm run music:setup -- --check report what is there, change nothing
 *   npm run music:setup -- --lm4b  also fetch the 4B planner LM (8.4 GB, optional)
 *
 * Everything goes in library/tools/ace-step (git-ignored): the source at a
 * pinned commit, a Python 3.11 venv built by uv from the repo's own uv.lock
 * (plus librosa and pyloudnorm for judging and mastering), and the weights in
 * checkpoints/ from the official ACE-Step Hugging Face repos. Nothing goes into
 * the system Python and nothing needs sudo. About 29 GB on disk (38 with --lm4b).
 * Not gated: no Hugging Face login needed.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { arch, platform } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeLibraryCredits } from './music/lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const TOOL = path.join(ROOT, 'library', 'tools', 'ace-step');
const STATUS = path.join(TOOL, '.gamory-setup.json');
const PYTHON = path.join(TOOL, '.venv', 'bin', 'python');
const CHECK_ONLY = process.argv.includes('--check');
const LM4B = process.argv.includes('--lm4b');

/** Source, pinned to the commit this was tested with (Nov 2026). */
const REPO = { url: 'https://github.com/ace-step/ACE-Step-1.5.git', commit: 'ca1e85fe9430179831e6bc6be790c332190a3866' };
/** Extra packages for judging and mastering (pure pip, no ffmpeg). */
const EXTRAS = ['librosa==0.11.0', 'pyloudnorm==0.2.0'];

/** Model weights, official Hugging Face repos only (all MIT, none gated). */
const WEIGHTS = [
  // VAE, text encoder (Qwen3-Embedding-0.6B), 1.7B planner LM and the 2B turbo DiT.
  { key: 'main', repo: 'ACE-Step/Ace-Step1.5', dir: '.', revision: '19671f406d603126926c1b7e2adc169acbcade22', license: 'MIT' },
  // The 4B XL DiT, SFT variant: the best-sounding one, used for the soundtrack.
  { key: 'xlSft', repo: 'ACE-Step/acestep-v15-xl-sft', dir: 'acestep-v15-xl-sft', revision: 'd06de46b4622f781cf07f4a013a67d591ca52819', license: 'MIT' },
  ...(LM4B ? [{ key: 'lm4b', repo: 'ACE-Step/acestep-5Hz-lm-4B', dir: 'acestep-5Hz-lm-4B', license: 'MIT' }] : [])
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
    say(`  ACE-Step-1.5: ${REPO.commit.slice(0, 8)} ✓`);
    return true;
  }
  if (CHECK_ONLY) {
    say(`  ACE-Step-1.5: ${head ? `at ${head.slice(0, 8)}, want ${REPO.commit.slice(0, 8)}` : 'missing'}`);
    return false;
  }
  mkdirSync(TOOL, { recursive: true });
  if (!head) {
    git(['init', '-q']);
    git(['remote', 'add', 'origin', REPO.url], { allowFail: true });
  }
  say(`  ACE-Step-1.5: fetching ${REPO.commit.slice(0, 8)} from ${REPO.url}`);
  git(['fetch', '-q', '--depth', '1', 'origin', REPO.commit]);
  git(['checkout', '-q', '--force', REPO.commit]);
  return true;
}

const PY_CHECK = `
import json
out = {}
try:
    import torch, soundfile, librosa, pyloudnorm, acestep  # noqa
    out["torch"] = torch.__version__
    out["mps"] = bool(torch.backends.mps.is_available())
    out["vorbis"] = "VORBIS" in soundfile.available_subtypes("OGG")
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
            ok = any(f.endswith(".safetensors") for _, _, fs in os.walk(target) for f in fs)
            out[spec["key"]] = {"ok": ok}
            continue
        snapshot_download(spec["repo"], revision=spec.get("revision"), local_dir=target)
        out[spec["key"]] = {"ok": True}
    except Exception as e:
        out[spec["key"]] = {"ok": False, "error": (type(e).__name__ + ": " + str(e))[:200]}
print("@@" + json.dumps(out))
`;

function main() {
  if (platform() !== 'darwin' || arch() !== 'arm64') {
    say('The local music generator is set up for Macs with Apple silicon.');
    process.exit(1);
  }
  if (!has('git')) throw new Error('git is required');
  if (!has('uv')) throw new Error('uv is required (https://docs.astral.sh/uv/) — it builds the venv from the pinned uv.lock');
  say(`${CHECK_ONLY ? 'Checking' : 'Setting up'} ACE-Step 1.5 in ${path.relative(ROOT, TOOL)}`);

  say('Source:');
  const source = ensureRepo();

  if (!CHECK_ONLY && source) {
    say('Python venv (uv sync --frozen, from the repo lockfile):');
    const env = { UV_PROJECT_ENVIRONMENT: path.join(TOOL, '.venv') };
    // --inexact keeps the analysis extras installed below across re-runs.
    run('uv', ['sync', '--frozen', '--inexact', '--python', '3.11'], { env });
    run('uv', ['pip', 'install', '--python', PYTHON, ...EXTRAS], { env });
  }

  let python = {};
  if (existsSync(PYTHON)) {
    const r = run(PYTHON, ['-c', PY_CHECK], { quiet: true, allowFail: true });
    try {
      python = JSON.parse(r.stdout.trim().split('\n').at(-1));
    } catch {
      python = {};
    }
  }
  say(`  torch ${python.torch ?? 'missing'}, MPS ${python.mps ? '✓' : '✗'}, Ogg Vorbis ${python.vorbis ? '✓' : '✗'}${python.error ? ` (${python.error})` : ''}`);

  say('Model weights (Hugging Face, official ACE-Step repos):');
  let weights = {};
  if (existsSync(PYTHON)) {
    const r = run(PYTHON, ['-c', PY_WEIGHTS, CHECK_ONLY ? 'check' : 'download', JSON.stringify(WEIGHTS), path.join(TOOL, 'checkpoints')], {
      quiet: true,
      allowFail: true,
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

  const ready = Boolean(source && python.torch && python.mps && python.vorbis && WEIGHTS.every((w) => weights[w.key]?.ok));
  if (!CHECK_ONLY) {
    writeFileSync(
      STATUS,
      JSON.stringify({ ready, updatedAt: new Date().toISOString(), torch: python.torch ?? null, commit: REPO.commit, weights: Object.fromEntries(WEIGHTS.map((w) => [w.repo, w.revision ?? 'main'])) }, null, 1)
    );
  }
  if (!CHECK_ONLY && source) writeLibraryCredits(); // the generator's parts, in library/CREDITS.md
  say();
  if (ready) {
    say('Ready. Generate with: npm run music:gen -- --prompt "calm harp and flute" --seconds 120 --out library/music-masters/test.ogg');
    say('Rebuild the shared soundtrack with: npm run music:soundtrack');
  } else {
    say('Not ready yet: run npm run music:setup again and read the errors above.');
    process.exitCode = CHECK_ONLY ? 1 : 0;
  }
}

try {
  main();
} catch (error) {
  console.error(`music:setup failed: ${error.message}`);
  process.exit(1);
}
