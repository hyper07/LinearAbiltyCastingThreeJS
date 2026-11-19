#!/usr/bin/env node
/**
 * Install or repair the free, local picture-to-3D generator:
 * TRELLIS.2 (Microsoft, MIT) on Apple silicon through trellis-mac (MIT).
 *
 *   npm run modelgen:setup            install / repair (idempotent)
 *   npm run modelgen:setup -- --check report what is there, change nothing
 *
 * Everything goes in library/tools/trellis-mac (git-ignored): the pinned
 * source checkouts, a Python 3.11 venv (uv, else python3 -m venv), and the model
 * weights in hf-cache/. Nothing is installed into the system Python and nothing
 * needs sudo. About 18 GB on disk. It is large, so dev and build never run it.
 *
 * Needs once, by hand, in a browser:
 *   - a Hugging Face login (`hf auth login`), and
 *   - access to the gated DINOv3 weights (Meta's DINOv3 License):
 *     https://huggingface.co/facebook/dinov3-vitl16-pretrain-lvd1689m
 * Without DINOv3 the rest installs and the generator reports what's missing.
 *
 * Background removal uses BiRefNet (MIT), not trellis-mac's default RMBG-2.0
 * (CC BY-NC), which is never downloaded.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { arch, platform } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { withToolCredits } from '../server/modelgen-local.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const TOOL = path.join(ROOT, 'library', 'tools', 'trellis-mac');
const STATUS = path.join(TOOL, '.gamory-setup.json');
const CONSTRAINTS = path.join(HERE, 'modelgen', 'constraints.txt');
const PYTHON = path.join(TOOL, '.venv', 'bin', 'python');
const CHECK_ONLY = process.argv.includes('--check');

/** Source checkouts, pinned to the commits this was tested with (Nov 2026). */
const REPOS = [
  { dir: '.', url: 'https://github.com/shivampkumar/trellis-mac.git', commit: 'd58628f4f5b9c3de8274cb110074154f4b31cef2' },
  { dir: 'TRELLIS.2', url: 'https://github.com/microsoft/TRELLIS.2.git', commit: '75fbf0183001ed9876c8dbb35de6b68552ee08bd' },
  { dir: 'deps/utils3d', url: 'https://github.com/EasternJournalist/utils3d.git', commit: '9a4eb15e4021b67b12c460c7057d642626897ec8' },
  { dir: 'deps/mtlbvh', url: 'https://github.com/pedronaugusto/mtlbvh.git', commit: '011896cadb12349d1f4e906af41ff96aa5b5fcb7' },
  { dir: 'deps/mtldiffrast', url: 'https://github.com/pedronaugusto/mtldiffrast.git', commit: 'db3186be168a495f43ea095f7311a18a4de0a74c' },
  { dir: 'deps/mtlmesh', url: 'https://github.com/pedronaugusto/mtlmesh.git', commit: '4a46faae8ab6def6f308c499e22a23020cdacd5b' },
  { dir: 'deps/mtlgemm', url: 'https://github.com/pedronaugusto/mtlgemm.git', commit: 'c2e5d3fa15152bc4aef65773cab1ded5a1855d38' },
  { dir: 'deps/trellis2-apple', url: 'https://github.com/pedronaugusto/trellis2-apple.git', commit: 'c873bde81ebe1e56535c6caddb4b21267364a923', submodules: ['o-voxel/third_party/eigen'] }
];

/** Model weights, official Hugging Face repos only. */
const WEIGHTS = [
  { key: 'trellis2', repo: 'microsoft/TRELLIS.2-4B', license: 'MIT' },
  { key: 'trellisImageLarge', repo: 'microsoft/TRELLIS-image-large', license: 'MIT', allow: ['pipeline.json', 'ckpts/ss_dec_conv3d_16l8_fp16.*'] },
  { key: 'birefnet', repo: 'ZhengPeng7/BiRefNet', license: 'MIT' },
  { key: 'dinov3', repo: 'facebook/dinov3-vitl16-pretrain-lvd1689m', license: 'DINOv3 License (gated)' }
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
const git = (dir, args, opts = {}) => run('git', ['-C', dir, ...args], { quiet: true, ...opts });

function ensureRepo({ dir, url, commit, submodules = [] }) {
  const where = path.join(TOOL, dir);
  const head = existsSync(path.join(where, '.git')) ? git(where, ['rev-parse', 'HEAD'], { allowFail: true }).stdout?.trim() : null;
  if (head === commit) {
    say(`  ${dir === '.' ? 'trellis-mac' : dir}: ${commit.slice(0, 8)} ✓`);
  } else if (CHECK_ONLY) {
    say(`  ${dir === '.' ? 'trellis-mac' : dir}: ${head ? `at ${head.slice(0, 8)}, want ${commit.slice(0, 8)}` : 'missing'}`);
    return false;
  } else {
    mkdirSync(where, { recursive: true });
    if (!head) {
      git(where, ['init', '-q']);
      git(where, ['remote', 'add', 'origin', url], { allowFail: true });
    } else if (dir === 'TRELLIS.2') {
      // Patched in place by trellis-mac; drop the patches before moving.
      git(where, ['checkout', '--', '.']);
    }
    say(`  ${dir === '.' ? 'trellis-mac' : dir}: fetching ${commit.slice(0, 8)} from ${url}`);
    git(where, ['fetch', '-q', '--depth', '1', 'origin', commit]);
    git(where, ['checkout', '-q', '--force', commit]);
  }
  for (const sub of submodules) {
    if (existsSync(path.join(where, sub, '.git')) || existsSync(path.join(where, sub, 'CMakeLists.txt'))) continue;
    if (CHECK_ONLY) return false;
    say(`  ${dir}/${sub}: fetching submodule`);
    git(where, ['submodule', 'update', '--init', '--depth', '1', sub]);
  }
  return true;
}

function metalToolchain() {
  if (has('xcrun', ['-sdk', 'macosx', 'metal', '--version'])) return true;
  if (CHECK_ONLY) return false;
  say('  Metal toolchain missing — downloading it from Apple (xcodebuild -downloadComponent MetalToolchain, ~840 MB)…');
  run('xcodebuild', ['-downloadComponent', 'MetalToolchain'], { cwd: ROOT, allowFail: true });
  return has('xcrun', ['-sdk', 'macosx', 'metal', '--version']);
}

const PY_CHECK = `
import json, os
out = {}
try:
    import torch
    out["torch"] = torch.__version__
    out["mps"] = bool(torch.backends.mps.is_available())
except Exception as e:
    out["torch"] = None
try:
    import o_voxel.postprocess as p, flex_gemm, mtlbvh, mtldiffrast, cumesh  # noqa
    out["metal"] = p._BACKEND == "metal" and bool(p._HAS_DR)
except Exception:
    out["metal"] = False
print(json.dumps(out))
`;

const PY_WEIGHTS = `
import json, os, sys
from huggingface_hub import snapshot_download
from huggingface_hub.errors import GatedRepoError, RepositoryNotFoundError
check = sys.argv[1] == "check"
out = {}
for spec in json.loads(sys.argv[2]):
    try:
        path = snapshot_download(spec["repo"], allow_patterns=spec.get("allow"), local_files_only=check)
        # A gated repo still gives its README and LICENSE: count it only with weights.
        weights = any(f.endswith(".safetensors") for _, _, files in os.walk(path) for f in files)
        out[spec["key"]] = {"ok": True, "revision": os.path.basename(path)} if weights else {"ok": False, "gated": True, "error": "no weights"}
    except (GatedRepoError, RepositoryNotFoundError) as e:
        out[spec["key"]] = {"ok": False, "gated": True, "error": type(e).__name__}
    except Exception as e:
        out[spec["key"]] = {"ok": False, "error": (type(e).__name__ + ": " + str(e))[:200]}
print("@@" + json.dumps(out))
`;

function main() {
  if (platform() !== 'darwin' || arch() !== 'arm64') {
    say('The local generator needs a Mac with Apple silicon. Use a cloud key (TRIPO_API_KEY / MESHY_API_KEY) instead.');
    process.exit(1);
  }
  if (!has('git')) throw new Error('git is required');
  say(`${CHECK_ONLY ? 'Checking' : 'Setting up'} TRELLIS.2 (trellis-mac) in ${path.relative(ROOT, TOOL)}`);
  mkdirSync(TOOL, { recursive: true });

  say('Sources:');
  const sources = REPOS.map(ensureRepo).every(Boolean);

  say('Metal toolchain:');
  const metalTools = metalToolchain();
  say(`  ${metalTools ? 'xcrun metal ✓' : 'missing — texture baking falls back to the slower KDTree baker'}`);

  const uv = has('uv');
  if (!CHECK_ONLY && sources) {
    say('Python venv and packages:');
    if (!existsSync(PYTHON)) {
      if (uv) run('uv', ['venv', '.venv', '--python', '3.11']);
      else run('python3', ['-m', 'venv', '.venv']);
    }
    // Pinned torch first, so trellis-mac's unpinned "torch" is already satisfied.
    const env = { MACOSX_DEPLOYMENT_TARGET: '12.0', VIRTUAL_ENV: path.join(TOOL, '.venv'), UV_CONSTRAINT: CONSTRAINTS, PIP_CONSTRAINT: CONSTRAINTS, ...(metalTools ? {} : { SKIP_METAL: '1' }) };
    if (uv) run('uv', ['pip', 'install', '--python', PYTHON, 'torch', 'torchvision', 'torchaudio'], { env });
    else run(PYTHON, ['-m', 'pip', 'install', 'torch', 'torchvision', 'torchaudio'], { env });
    // trellis-mac's own script: deps, Metal extensions, MPS patches (all inside its folder).
    run('bash', ['setup.sh'], { env: { ...env, PATH: `${path.join(TOOL, '.venv', 'bin')}:${process.env.PATH}` } });
    // BiRefNet's model code (our MIT background remover) also needs einops.
    if (uv) run('uv', ['pip', 'install', '--python', PYTHON, 'einops'], { env });
    else run(PYTHON, ['-m', 'pip', 'install', 'einops'], { env });
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
  say(`  torch ${python.torch ?? 'missing'}, MPS ${python.mps ? '✓' : '✗'}, Metal baker ${python.metal ? '✓' : '✗ (KDTree fallback)'}`);

  say('Model weights (Hugging Face):');
  let weights = {};
  if (existsSync(PYTHON)) {
    const r = run(PYTHON, ['-c', PY_WEIGHTS, CHECK_ONLY ? 'check' : 'download', JSON.stringify(WEIGHTS)], {
      quiet: true,
      allowFail: true,
      env: { HF_HUB_CACHE: path.join(TOOL, 'hf-cache'), HF_HUB_DISABLE_TELEMETRY: '1' }
    });
    const line = (r.stdout ?? '').split('\n').find((l) => l.startsWith('@@'));
    weights = line ? JSON.parse(line.slice(2)) : {};
    if (!line) say(`  could not check: ${(r.stderr ?? '').trim().split('\n').at(-1)}`);
  }
  for (const w of WEIGHTS) {
    const got = weights[w.key];
    say(`  ${w.repo} (${w.license}): ${got?.ok ? `✓ ${got.revision.slice(0, 8)}` : got?.gated ? 'GATED — needs you (see below)' : `missing${got?.error ? ` (${got.error})` : ''}`}`);
  }

  const ready = Boolean(sources && python.torch && python.mps && WEIGHTS.every((w) => weights[w.key]?.ok));
  if (!CHECK_ONLY) {
    writeFileSync(
      STATUS,
      JSON.stringify(
        {
          ready,
          updatedAt: new Date().toISOString(),
          torch: python.torch ?? null,
          metal: Boolean(python.metal),
          repos: Object.fromEntries(REPOS.map((r) => [r.dir === '.' ? 'trellis-mac' : r.dir, r.commit])),
          weights: Object.fromEntries(WEIGHTS.map((w) => [w.key, weights[w.key]?.ok ? weights[w.key].revision : null]))
        },
        null,
        1
      )
    );
  }

  if (!CHECK_ONLY && sources) {
    // Credits for everything installed, kept in library/CREDITS.md (npm run library:index keeps it too).
    const creditsFile = path.join(ROOT, 'library', 'CREDITS.md');
    const current = existsSync(creditsFile) ? readFileSync(creditsFile, 'utf8') : '# Asset library credits\n';
    writeFileSync(creditsFile, withToolCredits(current));
  }

  say();
  if (ready) {
    say('Ready. Generate with: npm run modelgen:local -- <image.png> [--name "Treasure chest"]');
    say('The dev server picks it automatically when no cloud key is set (or set MODELGEN_PROVIDER=local).');
  } else {
    if (!weights.dinov3?.ok) {
      say('Needs you, once:');
      say('  1. Log in to Hugging Face:  hf auth login');
      say('  2. Accept the DINOv3 licence (Meta reviews it; usually quick):');
      say('     https://huggingface.co/facebook/dinov3-vitl16-pretrain-lvd1689m');
      say('  3. Run again:  npm run modelgen:setup');
    }
    if (!python.torch) say('Python packages are missing — run npm run modelgen:setup again and read the errors above.');
    process.exitCode = CHECK_ONLY ? 1 : 0;
  }
}

try {
  main();
} catch (error) {
  console.error(`modelgen:setup failed: ${error.message}`);
  process.exit(1);
}
