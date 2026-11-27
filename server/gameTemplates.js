/**
 * Starters for `npm run game:create -- --title "…" [--template 3d|2d]`: a complete, working
 * game package that runs at once (`npm run game:dev -- <slug>`), built from the repo's own
 * shared modules rather than from nothing:
 *
 *   src/shared/helpPanel.js   How to play (H), from ONE controls table (controls.js)
 *   src/shared/music.js       the platform's music player (tracks in public/audio/bgm)
 *   src/shared/powerKit.js    (3d) capped frame loop, quality menu, GPU-aware detail — see Kickrani
 *   src/pixel/art.js          (2d) palettes and shaded sprites — knowledge/pixel-art-guide.md
 *
 * Every file is small and says what it is for; README.md is the file map.
 */

import { DATA_KEYS, STARTERS, fileText, normalizeStyle, starterData } from '../src/shared/studio/spec.js';

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

export const TEMPLATES = ['3d', '2d', 'studio'];

/** { relative path: file text } for a new package. `params` are the studio template's choices. */
export function templateFiles(m, kind = '3d', params = {}) {
  if (!TEMPLATES.includes(kind)) throw new Error(`No template "${kind}" (have: ${TEMPLATES.join(', ')})`);
  if (kind === 'studio') return studioFiles(m, params);
  const common = {
    'controls.js': CONTROLS(m),
    'hud.js': HUD(m),
    'credits.js': CREDITS(m),
    'tests/package.test.mjs': TEST(m),
    'README.md': README(m, kind)
  };
  return kind === '2d' ? { ...common, 'index.js': INDEX(m), 'game.js': GAME_2D(m) } : { ...common, 'index.js': INDEX(m), 'game.js': GAME_3D(m), 'world.js': WORLD_3D(m) };
}

const INDEX = (m) => `/**
 * ${m.title}: the package entry (game.json "entry") — the only thing the platform calls.
 * It gets a container and the platform API (src/platform/gameApi.js) and returns { root, dispose }.
 * Import three and the shared libraries (src/shared/…) freely; never src/core or src/ui
 * (the platform) and never another game's folder.
 */
import { Game } from './game.js';

export async function mount(container, platform) {
  const game = new Game(container, platform);
  await game.open();
  return { root: game.root, view: game, dispose: () => game.close(false) };
}
`;

const CONTROLS = (m) => `/**
 * ${m.title}'s ONE controls table: the key handler reads its codes, the hint line is built from
 * the rows marked \`hint\`, and How to play (H) lists all of it (src/shared/helpPanel.js).
 * Repo conventions: H = How to play, Esc = pause, numbers for skills/items, never Q/E for potions.
 */
export const CONTROLS = {
  title: 'How to play',
  goal: 'Collect the glowing orbs. (A starter: make it yours.)',
  groups: [
    {
      name: 'Move',
      rows: [
        { id: 'up', keys: ['W', '↑'], codes: ['KeyW', 'ArrowUp'], does: 'Forward', hint: true },
        { id: 'down', keys: ['S', '↓'], codes: ['KeyS', 'ArrowDown'], does: 'Back' },
        { id: 'left', keys: ['A', '←'], codes: ['KeyA', 'ArrowLeft'], does: 'Left' },
        { id: 'right', keys: ['D', '→'], codes: ['KeyD', 'ArrowRight'], does: 'Right' }
      ]
    },
    {
      name: 'Menus',
      rows: [
        { id: 'pause', keys: ['Esc'], codes: ['Escape'], does: 'Pause (and leave)', hint: true },
        { id: 'help', keys: ['H'], codes: ['KeyH'], does: 'How to play', hint: true }
      ]
    }
  ]
};

/** The codes of one row. */
export const codesOf = (id) => CONTROLS.groups.flatMap((g) => g.rows).find((r) => r.id === id)?.codes ?? [];
`;

const HUD = (m) => `/**
 * ${m.title}'s HUD: a score, a hint line, and the pause card (Resume / Leave). Plain DOM over
 * the canvas; style it in the CSS string below (game-visuals skill for the look).
 */
import { hintItems } from '../../src/shared/helpPanel.js';
import { CONTROLS } from './controls.js';

const CSS = \`
.gx-hud{position:absolute;inset:0;pointer-events:none;font:600 16px/1.3 system-ui,sans-serif;color:#fff;text-shadow:0 1px 2px #000}
.gx-hud__score{position:absolute;top:14px;left:56px}
.gx-hud__hint{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);opacity:.8;font-size:13px}
.gx-hud__x{position:absolute;top:12px;right:12px;pointer-events:auto;font:inherit;background:rgba(0,0,0,.45);color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:8px;padding:4px 10px;cursor:pointer}
.gx-pause{position:absolute;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.55);pointer-events:auto}
.gx-pause__card{background:#1d2030;border-radius:14px;padding:18px 24px;display:flex;flex-direction:column;gap:10px;min-width:220px;text-align:center}
.gx-pause button{font:inherit;padding:8px 14px;border-radius:9px;border:1px solid #556;background:#2b3046;color:#fff;cursor:pointer}
\`;

export class Hud {
  constructor(root, { onResume, onLeave }) {
    if (!document.getElementById('gx-hud-css')) {
      const s = document.createElement('style');
      s.id = 'gx-hud-css';
      s.textContent = CSS;
      document.head.append(s);
    }
    this.el = document.createElement('div');
    this.el.className = 'gx-hud';
    this.el.innerHTML = '<div class="gx-hud__score" data-score></div><div class="gx-hud__hint" data-hint></div><button type="button" class="gx-hud__x" data-x aria-label="Leave">✕</button>';
    this.el.querySelector('[data-hint]').textContent = hintItems(CONTROLS).map((r) => \`\${r.keys.join('/')} \${r.does}\`).join(' · ');
    this.el.querySelector('[data-x]').addEventListener('click', onLeave);
    this.onResume = onResume;
    this.onLeave = onLeave;
    root.append(this.el);
  }

  score(n) {
    this.el.querySelector('[data-score]').textContent = \`Score \${n}\`;
  }

  pause(on) {
    this.el.querySelector('.gx-pause')?.remove();
    if (!on) return;
    const card = document.createElement('div');
    card.className = 'gx-pause';
    card.innerHTML = '<div class="gx-pause__card"><b>Paused</b><button type="button" data-resume>Resume</button><button type="button" data-leave>Leave</button></div>';
    card.querySelector('[data-resume]').addEventListener('click', this.onResume);
    card.querySelector('[data-leave]').addEventListener('click', this.onLeave);
    this.el.append(card);
  }
}
`;

const CREDITS = (m) => `/**
 * Who made what in ${m.title}: every asset with its website and licence, shown in the game
 * (repo rule: free assets, visibly credited — docs/third-party.md). Add a row per asset.
 */
export const CREDITS = [
  { what: 'Engine', who: 'three.js', site: 'https://threejs.org', licence: 'MIT' }
];
`;

const GAME_3D = (m) => `/**
 * ${m.title}: the game — renderer, camera, lights, resize, the frame loop, input, pause and
 * exit, How to play, music. The world itself (what is in the scene and how it moves) is in
 * world.js. Tuning numbers live at the top of world.js.
 */
import * as THREE from 'three';
import { HelpPanel } from '../../src/shared/helpPanel.js';
import { music } from '../../src/shared/music.js';
import { CONTROLS, codesOf } from './controls.js';
import { Hud } from './hud.js';
import { World } from './world.js';

export class Game {
  constructor(host, platform) {
    this.host = host;
    this.platform = platform;
    this.keys = new Set();
    this.paused = false;
  }

  async open() {
    this.root = document.createElement('div');
    this.root.style.cssText = 'position:fixed;inset:0;z-index:50;background:#0d1020';
    this.root.tabIndex = -1;
    this.host.append(this.root);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.root.append(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
    this.camera.position.set(0, 9, 12);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x2a2233, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(8, 14, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    this.scene.add(sun);

    this.world = new World(this.scene, { onScore: (n) => this.hud.score(n) });
    this.hud = new Hud(this.root, { onResume: () => this.setPaused(false), onLeave: () => this.close() });
    this.hud.score(0);
    this.help = new HelpPanel({ host: this.root, id: '${esc(m.slug)}', table: CONTROLS, onOpen: () => this.setPaused(true, false), onClose: () => this.setPaused(false) });

    this._resize = () => {
      const w = this.root.clientWidth || innerWidth;
      const h = this.root.clientHeight || innerHeight;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    };
    addEventListener('resize', this._resize);
    this._resize();
    this._down = (e) => this.key(e, true);
    this._up = (e) => this.key(e, false);
    addEventListener('keydown', this._down);
    addEventListener('keyup', this._up);

    // Music: a track from the platform's library by tag (public/audio/bgm/manifest.json), if music is on.
    music.play('calm').catch(() => {});
    this.help.openFirstTime();
    this._last = performance.now();
    this.renderer.setAnimationLoop((t) => this.frame(t));
    this.root.focus();
  }

  key(e, down) {
    if (down && codesOf('help').includes(e.code)) return this.help.toggle();
    if (down && codesOf('pause').includes(e.code)) return this.setPaused(!this.paused);
    if (down) this.keys.add(e.code);
    else this.keys.delete(e.code);
  }

  setPaused(on, card = true) {
    this.paused = on;
    this.keys.clear();
    this.hud.pause(on && card);
  }

  input() {
    const any = (id) => codesOf(id).some((c) => this.keys.has(c));
    return { x: (any('right') ? 1 : 0) - (any('left') ? 1 : 0), z: (any('down') ? 1 : 0) - (any('up') ? 1 : 0) };
  }

  frame(t) {
    const dt = Math.min(0.05, (t - this._last) / 1000);
    this._last = t;
    if (!this.paused) this.world.update(dt, this.input());
    this.renderer.render(this.scene, this.camera);
  }

  /** Leave: \`notify\` false when the platform itself is taking the screen back. */
  close(notify = true) {
    if (this.closed) return;
    this.closed = true;
    this.renderer.setAnimationLoop(null);
    removeEventListener('resize', this._resize);
    removeEventListener('keydown', this._down);
    removeEventListener('keyup', this._up);
    music.stop?.();
    this.world.dispose();
    this.renderer.dispose();
    this.root.remove();
    if (notify) this.platform.exit();
  }
}
`;

const WORLD_3D = (m) => `/**
 * ${m.title}'s world: the ground, the player and the orbs, and how they move. Tuning first.
 * Before building something new here, search the repo's kits: \`npm run kb -- <what>\`
 * (effects, scene recipes, 3,422 low-poly models with --models).
 */
import * as THREE from 'three';

export const TUNING = {
  speed: 6, // m/s
  arena: 9, // half-width of the play area (m)
  orbs: 6
};

export class World {
  constructor(scene, { onScore = () => {} } = {}) {
    this.scene = scene;
    this.onScore = onScore;
    this.score = 0;
    this.group = new THREE.Group();
    scene.add(this.group);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(TUNING.arena * 2 + 4, TUNING.arena * 2 + 4), new THREE.MeshStandardMaterial({ color: 0x3b4a6b, roughness: 0.9 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);
    this.player = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.6, 6, 12), new THREE.MeshStandardMaterial({ color: 0xffb3c7, roughness: 0.5 }));
    this.player.position.y = 0.7;
    this.player.castShadow = true;
    this.group.add(this.player);
    this.orbMat = new THREE.MeshStandardMaterial({ color: 0xffe27a, emissive: 0xffc23a, emissiveIntensity: 1.2 });
    this.orbGeo = new THREE.SphereGeometry(0.3, 16, 12);
    this.orbs = [];
    for (let i = 0; i < TUNING.orbs; i++) this.spawn();
  }

  spawn() {
    const orb = new THREE.Mesh(this.orbGeo, this.orbMat);
    orb.position.set((Math.random() * 2 - 1) * TUNING.arena, 0.6, (Math.random() * 2 - 1) * TUNING.arena);
    this.group.add(orb);
    this.orbs.push(orb);
  }

  update(dt, input) {
    const p = this.player.position;
    p.x = THREE.MathUtils.clamp(p.x + input.x * TUNING.speed * dt, -TUNING.arena, TUNING.arena);
    p.z = THREE.MathUtils.clamp(p.z + input.z * TUNING.speed * dt, -TUNING.arena, TUNING.arena);
    for (const orb of [...this.orbs]) {
      orb.rotation.y += dt * 2;
      if (orb.position.distanceTo(p) < 0.8) {
        this.group.remove(orb);
        this.orbs.splice(this.orbs.indexOf(orb), 1);
        this.onScore(++this.score);
        this.spawn();
      }
    }
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.geometry && o.geometry !== this.orbGeo) o.geometry.dispose();
      if (o.material && o.material !== this.orbMat) o.material.dispose();
    });
    this.orbGeo.dispose();
    this.orbMat.dispose();
    this.scene.remove(this.group);
  }
}
`;

const GAME_2D = (m) => `/**
 * ${m.title}: a 2D game on one pixel-perfect canvas — the loop, input, pause and exit, How
 * to play, music. Pixel art rules: knowledge/pixel-art-guide.md; ramps, shaded sprites and
 * dithering in src/pixel/art.js; effects with playFx in src/pixel/fx.js.
 */
import { HelpPanel } from '../../src/shared/helpPanel.js';
import { music } from '../../src/shared/music.js';
import { CONTROLS, codesOf } from './controls.js';
import { Hud } from './hud.js';

export const TUNING = { width: 320, height: 180, speed: 70, orbs: 5 };

export class Game {
  constructor(host, platform) {
    this.host = host;
    this.platform = platform;
    this.keys = new Set();
    this.paused = false;
    this.score = 0;
  }

  async open() {
    this.root = document.createElement('div');
    this.root.style.cssText = 'position:fixed;inset:0;z-index:50;background:#111;display:grid;place-items:center';
    this.host.append(this.root);
    this.canvas = document.createElement('canvas');
    this.canvas.width = TUNING.width;
    this.canvas.height = TUNING.height;
    this.canvas.style.cssText = 'image-rendering:pixelated;width:min(100vw,177.7vh);height:auto';
    this.root.append(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.player = { x: TUNING.width / 2, y: TUNING.height / 2 };
    this.orbs = Array.from({ length: TUNING.orbs }, () => this.spot());
    this.hud = new Hud(this.root, { onResume: () => this.setPaused(false), onLeave: () => this.close() });
    this.hud.score(0);
    this.help = new HelpPanel({ host: this.root, id: '${esc(m.slug)}', table: CONTROLS, onOpen: () => this.setPaused(true, false), onClose: () => this.setPaused(false) });
    this._down = (e) => this.key(e, true);
    this._up = (e) => this.key(e, false);
    addEventListener('keydown', this._down);
    addEventListener('keyup', this._up);
    music.play('calm').catch(() => {});
    this.help.openFirstTime();
    this._last = performance.now();
    const tick = (t) => {
      if (this.closed) return;
      this.frame(t);
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  spot() {
    return { x: 8 + Math.random() * (TUNING.width - 16), y: 8 + Math.random() * (TUNING.height - 16) };
  }

  key(e, down) {
    if (down && codesOf('help').includes(e.code)) return this.help.toggle();
    if (down && codesOf('pause').includes(e.code)) return this.setPaused(!this.paused);
    if (down) this.keys.add(e.code);
    else this.keys.delete(e.code);
  }

  setPaused(on, card = true) {
    this.paused = on;
    this.keys.clear();
    this.hud.pause(on && card);
  }

  frame(t) {
    const dt = Math.min(0.05, (t - this._last) / 1000);
    this._last = t;
    const any = (id) => codesOf(id).some((c) => this.keys.has(c));
    if (!this.paused) {
      this.player.x = Math.max(4, Math.min(TUNING.width - 4, this.player.x + ((any('right') ? 1 : 0) - (any('left') ? 1 : 0)) * TUNING.speed * dt));
      this.player.y = Math.max(4, Math.min(TUNING.height - 4, this.player.y + ((any('down') ? 1 : 0) - (any('up') ? 1 : 0)) * TUNING.speed * dt));
      for (const o of this.orbs) {
        if (Math.hypot(o.x - this.player.x, o.y - this.player.y) < 7) {
          Object.assign(o, this.spot());
          this.hud.score(++this.score);
        }
      }
    }
    const c = this.ctx;
    c.fillStyle = '#1d2b53';
    c.fillRect(0, 0, TUNING.width, TUNING.height);
    c.fillStyle = '#ffec27';
    for (const o of this.orbs) c.fillRect(Math.round(o.x) - 2, Math.round(o.y) - 2, 4, 4);
    c.fillStyle = '#ff77a8';
    c.fillRect(Math.round(this.player.x) - 3, Math.round(this.player.y) - 3, 6, 6);
  }

  close(notify = true) {
    if (this.closed) return;
    this.closed = true;
    cancelAnimationFrame(this._raf);
    removeEventListener('keydown', this._down);
    removeEventListener('keyup', this._up);
    music.stop?.();
    this.root.remove();
    if (notify) this.platform.exit();
  }
}
`;

const TEST = (m) => `/**
 * ${m.title}'s own unit tests: \`npm run game:test -- ${m.slug}\` runs this folder's tests/ (and any
 * test in tests/unit that imports games/${m.code}/). Test the rules, not the pixels.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CONTROLS } from '../controls.js';

const manifest = JSON.parse(readFileSync(new URL('../game.json', import.meta.url), 'utf8'));

test('${esc(m.title)}: the manifest names this folder', () => {
  assert.equal(manifest.code, '${m.code}');
  assert.equal(manifest.api, 1);
});

test('${esc(m.title)}: H is How to play and no key does two things', () => {
  const codes = CONTROLS.groups.flatMap((g) => g.rows).flatMap((r) => r.codes);
  assert.ok(codes.includes('KeyH'));
  assert.equal(new Set(codes).size, codes.length);
});
`;

const README = (m, kind) => `# ${m.title}

A game package (docs/platform-architecture.md, "Game packages, draft and production").
Folder \`games/${m.code}/\` — the shortcode never changes; the slug \`${m.slug}\` and id
\`${m.id}\` are in \`game.json\`. Template: ${kind}.

## Run it

    npm run game:dev -- ${m.slug}        # the platform shell straight into this game's draft
    npm run game:test -- ${m.slug}       # its unit tests only
    npm run game:smoke -- ${m.slug}      # one short headless load (needs the dev server)
    npm run game:changes -- ${m.slug}    # what is not in production yet
    npm run game:deploy -- ${m.slug} --all

Players do not see it until its first deploy (the admin sees it with a DRAFT badge).

## File map

| File | What it does |
|---|---|
| \`game.json\` | the manifest: code, id, slug, title, version, entry, card (genre/cover), smoke params |
| \`index.js\` | \`mount(container, platform)\` — the only entry the platform calls |
| \`game.js\` | ${kind === '2d' ? 'canvas, loop, input, pause/exit, How to play, music; TUNING at the top' : 'renderer, camera, lights, resize, loop, input, pause/exit, How to play, music'} |
${kind === '2d' ? '' : '| `world.js` | what is in the scene and how it moves; TUNING at the top |\n'}| \`controls.js\` | the ONE controls table (keys, hints, How to play) |
| \`hud.js\` | score, hint line, pause card |
| \`credits.js\` | every asset with site and licence (shown in game) |
| \`tests/\` | this game's unit tests |

## Rules

- Talk to the platform only through \`platform\` (src/platform/gameApi.js): \`account\`, \`exit()\`,
  \`params\`, \`release\`, \`music\`, \`track()\`.
- Import three and shared modules (\`src/shared/…\`, \`src/pixel/…\`); never \`src/core\`, \`src/ui\` or
  another game's folder. Search first: \`npm run kb -- <what>\`.
- Data paths (\`./library/…\`, \`./audio/…\`) are relative to the page, not this folder.
`;

/* ------------------------------------------------------------------ studio */

/**
 * The Game Studio's template (docs/game-studio.md): ONE template whose choices are parameters —
 * render (flat2d | full3d | hd2d | painted) × animation (pixel | skeletal | toon | plush) ×
 * look (realistic | stylized | cartoon) × starter (the Game builder's genres + collect) — not a
 * copy per combination. The game is data (data/*.json, src/shared/studio/spec.js) played by the
 * shared runtime (src/shared/studio/runtime.js); the chat box changes the data, never the code.
 *
 *   params: { render, animation, look, palette, genre, player? }  (unknown values → defaults)
 */
export function studioParams(params = {}) {
  const style = normalizeStyle(params);
  return { ...style, genre: STARTERS[params.genre] ? params.genre : 'collect' };
}

function studioFiles(m, params) {
  const p = studioParams(params);
  const data = starterData({ title: m.title, ...p, player: params.player ?? null });
  const files = {
    'index.js': STUDIO_INDEX(m),
    'README.md': STUDIO_README(m, p),
    'tests/package.test.mjs': STUDIO_TEST(m)
  };
  for (const key of DATA_KEYS) files[`data/${key}.json`] = fileText(data[key]);
  return files;
}

const STUDIO_INDEX = (m) => `/**
 * ${m.title}: a Game Studio game (docs/game-studio.md). Everything that makes it this game is
 * data in ./data/*.json; the shared runtime plays it. Edit it in the Studio's chat box, or edit
 * the JSON by hand (src/shared/studio/spec.js says what each field may be).
 */
import { mountStudioGame } from '../../src/shared/studio/runtime.js';
import style from './data/style.json';
import rules from './data/rules.json';
import maps from './data/maps.json';
import cast from './data/cast.json';
import audio from './data/audio.json';
import assets from './data/assets.json';

export async function mount(container, platform) {
  platform.music.away();
  const game = await mountStudioGame(container, { style, rules, maps, cast, audio, assets }, {
    mode: 'play',
    title: '${esc(m.title)}',
    onExit: () => {
      platform.music.back();
      platform.exit();
    },
    onEvent: (event, data) => platform.track(event, data)
  });
  return { root: game.root, view: game, dispose: () => game.close(false) };
}
`;

const STUDIO_README = (m, p) => `# ${m.title}

A Game Studio game (docs/game-studio.md): render \`${p.render}\`, animation \`${p.animation}\`,
look \`${p.look}\`, starter \`${p.genre}\`. Folder \`games/${m.code}/\` (the shortcode never changes).

The game is DATA, played by the shared runtime (\`src/shared/studio/runtime.js\`):

| File | What it holds |
|---|---|
| \`data/style.json\` | render, animation, look, palette |
| \`data/rules.json\` | genre, goal, lives, speeds, difficulty, time limit, intro |
| \`data/maps.json\` | the maps in order — "add a map" appends one |
| \`data/cast.json\` | the player and every other character |
| \`data/audio.json\` | the music and the sound for each event |
| \`data/assets.json\` | outside assets used, with licence and credit (shown in game) |
| \`index.js\` | \`mount(container, platform)\`: hands the data to the runtime |
| \`tests/\` | checks the data against the schema |

Every change from the Studio's chat box is one commit here, authored by its maker; the admin
picks and deploys them (Changes & deploy). Private until its owner asks for it to be public and
the admin approves and deploys it.
`;

const STUDIO_TEST = (m) => `/**
 * ${m.title}: the data must fit the Studio's schema (src/shared/studio/spec.js), or the game
 * would not load. \`npm run game:test -- ${m.slug}\`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DATA_KEYS, validateData } from '../../../src/shared/studio/spec.js';

const read = (name) => JSON.parse(readFileSync(new URL(\`../\${name}\`, import.meta.url), 'utf8'));

test('${esc(m.title)}: the manifest names this folder', () => {
  const manifest = read('game.json');
  assert.equal(manifest.code, '${m.code}');
  assert.equal(manifest.template, 'studio');
});

test('${esc(m.title)}: the data fits the schema', () => {
  const data = Object.fromEntries(DATA_KEYS.map((key) => [key, read(\`data/\${key}.json\`)]));
  assert.deepEqual(validateData(data), []);
});
`;
