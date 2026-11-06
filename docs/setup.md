# Setup

[← Back to the README](../README.md)

## Quick start

Requires **Node.js 22.12+** (or 20.19+) and Git. See [requirements.txt](../requirements.txt) for the
full list. The JavaScript libraries are installed by npm, not pip.

```bash
npm install
```

```bash
npm run dev
```

Then open the URL Vite prints (default <http://127.0.0.1:5173>).

**The first `npm run dev` also downloads the 3D asset library** (about 7 GB of free CC0 models, see
[AI-built maps](ai-maps.md#ai-built-maps-and-the-3d-asset-library)) in the background. The game is playable
straight away and picks up each pack as it lands; later starts skip the download. `npm run build`
downloads it first if it is missing. Set `LIBRARY_AUTO_FETCH=0` in `.env` to turn this off.

```bash
npm run build
```

```bash
npm run preview
```

### Running on Windows

Everything runs natively on Windows 10/11. You don't need WSL. Use **PowerShell** or **Command
Prompt**. The commands below are PowerShell.

**1. Install Node.js and Git** (once). Either download the installers from
[nodejs.org](https://nodejs.org) (pick **22 LTS**) and [git-scm.com](https://git-scm.com), or:

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
```

Close and reopen the terminal afterwards so `node` and `git` are on the `PATH`, then check:

```powershell
node -v    # must print v22.12 or newer (v20.19+ also works)
npm -v
```

**2. Get the code and install the libraries.** `npm install` reads `package.json` and installs
three, lil-gui and Vite into `node_modules\`. There is nothing to `pip install`.

```powershell
git clone https://github.com/hyper07/LinearAbiltyCastingThreeJS.git
cd LinearAbiltyCastingThreeJS
npm install
```

**3. Run it.**

```powershell
npm run dev
```

Open <http://127.0.0.1:5173> in **Chrome** or **Edge**, pick a loadout and press **Start Game**.
Stop the server with `Ctrl+C`.

The first start also downloads the 3D asset library (~7 GB) in the background; lines starting
with `[library]` in the terminal show its progress. Make sure the drive has about 10 GB free. If
you stop the server midway, the next `npm run dev` resumes where it left off.

The class models ship with the game (see [Classes](classes-and-skills.md#classes)); `npm run fetch-characters`
re-downloads them if they are ever missing. It works the same on Windows.

**Optional: the AI chat commander.** Install [LM Studio](https://lmstudio.ai) for Windows,
download and load a model, and start its server. Then copy the settings template and edit it:

```powershell
Copy-Item .env.example .env
notepad .env
```

The full steps are in [Wiring the model](ai-commander.md#wiring-the-model). Restart `npm run dev` after editing
`.env`. Without a `.env` the game still runs. The chat panel just says "reflex only" and falls
back to keyword commands.

**Optional: production build without Docker.**

```powershell
npm run build
node --env-file=.env server/server.js   # or just: node server/server.js  (no .env)
```

Then open <http://localhost:8787>. The server listens on all interfaces, so Windows Firewall may
ask for permission the first time. *Private networks* is enough. With
[Docker Desktop](https://www.docker.com/products/docker-desktop/) installed,
`docker compose up --build` works exactly as described in [Production — Docker](ai-commander.md#production--docker).

#### Windows troubleshooting

| Symptom | Fix |
| --- | --- |
| `npm : File ...\npm.ps1 cannot be loaded because running scripts is disabled on this system` | PowerShell's execution policy. Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use Command Prompt (`cmd`) instead. |
| `'node' is not recognized as an internal or external command` | Node was installed after the terminal was opened. Close every terminal window (and VS Code) and open a new one. |
| `Cannot find module '@rolldown/binding-win32-x64-msvc'` or other native-binding errors | `node_modules` was copied from a Mac/Linux machine. Those binaries are per-OS. Delete it and reinstall: `Remove-Item -Recurse -Force node_modules; npm install`. Never copy `node_modules` between machines. |
| `npm install` or `npm run dev` complains about the Node version | Vite 8 needs Node 20.19+ or 22.12+. Upgrade with `winget upgrade OpenJS.NodeJS.LTS`. |
| Black canvas, or very low FPS on a laptop | The browser is on the integrated GPU or has hardware acceleration off. Turn on *Settings → System → Use graphics acceleration* in Chrome/Edge. Then in *Windows Settings → System → Display → Graphics*, set the browser to **High performance**. `chrome://gpu` should list WebGL as *Hardware accelerated*. |
| `Port 5173 is already in use` | Another dev server is running. Close it, or use `npm run dev -- --port 5174`. |
| Chat panel still says "reflex only" after creating `.env` | Restart `npm run dev`. Then check that LM Studio's server is **running** with a model **loaded**, and that <http://127.0.0.1:1234/v1/models> opens in the browser. `LLM_MODEL1` must match an id listed there, and the URL must end in `/v1`. If LM Studio is on another PC, enable **Serve on Local Network** there and allow LM Studio through that PC's Windows Firewall. |
| `[library] … failed` or `skip …: tar exited` in the terminal | The library downloader unpacks zips with Windows' built-in `tar` (Windows 10 1803 or newer). Update Windows, or install 7-Zip and run `npm run library:fetch` again. Failed packs are skipped; the rest still work. |
| Maps are made of plain grey boxes and cones | The asset library has not finished downloading (World tab shows progress), or was turned off with `LIBRARY_AUTO_FETCH=0`. Run `npm run library:fetch`. |
| Console shows `[AssetLoader] failed: ./models/walk.fbx` / `run.fbx` | Expected if you haven't added the Mixamo walk/run clips. The game falls back to a procedural gait (see below). |

### Assets

Six binary assets are served from `public/` and loaded automatically at boot:

| File | Purpose |
| --- | --- |
| `public/models/Idle.fbx` | Rigged character **and** its idle animation clip |
| `public/models/diffuse.png` | The character's colour map |
| `public/models/cast1.fbx` | Cast animation |
| `public/models/cast2.fbx` | Cast animation |
| `public/models/cast3.fbx` | Cast animation — the default for Frost Lance, Root Snare and Glacier Crown |
| `public/models/walk.fbx` | Walk cycle (Mixamo, **In Place**, same character as Idle) |
| `public/models/run.fbx` | Run cycle (Mixamo, **In Place**, same character as Idle) |
| `public/hdri/spruit_sunrise.hdr` | HDR probe used for image-based lighting and crystal reflections |

All FBX files are Mixamo exports of the same rig, each carrying a skinned mesh plus one
animation stack. The character comes from the idle file; cast and locomotion files are loaded
for their clip alone, and the duplicate rig that arrives with each one is released the moment its
`AnimationClip` has been taken. Clips bind to the skeleton by bone name, which is the whole reason
an animation authored in another file plays here without retargeting.

**Locomotion clips.** Download **Walking** and **Running** from [Mixamo](https://www.mixamo.com/)
for the same character as `Idle.fbx`. Export as FBX, check **In Place**, and save as
`walk.fbx` and `run.fbx` under `public/models/`. Without them the game falls back to the older
procedural gait layered on idle (ankles and arms will not match a proper walk/run). Each character
definition points at a **motion dataset** (`motionDataset` in the platform catalog) that lists
which clip ids to load and how to blend idle ↔ walk ↔ run by ground speed.

**How games handle natural movement.** The idle pose is never reused for walk or run — each gait
is its own authored clip. Runtime code runs a **1D blend tree** (speed → weights) and optionally
**foot IK** on top of the blended result so feet stay planted on slopes. **Cloth and capes** are
simulated on secondary bone chains *after* the skeleton pose (Verlet/spring or engine physics
bones); they are not part of locomotion joint data. See `LocomotionPlayback.js` and
`SecondaryMotion.js`.

**Class bodies.** The nine bodies the classes wear are committed in
`public/models/characters/<look>/model.glb` — Knight, Mage, Barbarian, Rogue, Hooded rogue and four
skeletons from the CC0 [KayKit Adventurers](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0)
and [Skeletons](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0) packs
(`npm run fetch-characters` downloads them again). They share one rig, so walk, run, idle and cast
clips embedded in each GLB work on every class. See [Classes](classes-and-skills.md#classes).

The rig ships no material, so `diffuse.png` is loaded beside it and assigned as the colour map when
the imported materials are converted to PBR — an FBX that *does* carry an embedded texture keeps its
own, since that map is authored against its own UVs.

Every ability picks the clip it throws — `castAnim` in its settings block, a dropdown under **The
cast** in its editor folder. Out of the box slots 1, 5 and 6 — Frost Lance, Root Snare and Glacier
Crown — throw `cast3`, and the other three throw `cast1`. The clip is a one-shot laid over
the looping idle, with `character.castBlendIn` / `castBlendOut` as the two edges of that overlap.

The HDR is loaded as image-based lighting and as the reflection source for the ice — it is never
shown as a visible sky. The stage keeps its flat dark backdrop.
