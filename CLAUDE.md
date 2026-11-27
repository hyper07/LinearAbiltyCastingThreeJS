# Working in this repo

## Look before you build

A lot is already here to reuse: 244 pixel effects, 22 ready 3D kits, 223 scene
recipes, shader and rig templates, 41 techniques from other games, our own
modules, and 3,422 low-poly models to fetch. **Search first — it costs a few
lines, not a file read:**

```bash
npm run kb -- pixel explosion          # anything (not models)
npm run kb -- tank --models            # 3D models
npm run kb -- fog --kind technique     # one kind (npm run kb -- --kinds lists them)
npm run kb -- --show tech.flowfield    # the full record, with its file path
```

Open only the file the chosen record points to. Details: [docs/knowledge-base.md](docs/knowledge-base.md).

- How a game looks (HUD, skill bars, effects, menus, scene mood, render quality, cute kids' characters): the `game-visuals` skill — `knowledge/visual-study.md` (295 studied screenshots in `images/`, never committed) and `knowledge/render-quality.md`.
- Character movement (dances, celebrations, emotes, idles, retargeting onto plush/chibi bodies, beat-synced routines): the `character-motion` skill — `knowledge/motion-study.md`, `src/shared/motion/`.
- Electronics (3D components, circuit simulation, breadboard builder, EE lessons): the `circuit-lab` skill — `knowledge/circuit-lab.md` and 125 parts in `knowledge/circuit-components.json`.
- Pixel art: `src/pixel/art.js` (ramps, `shadeSprite` — use `scale: 4` for quality, dither, pixel-perfect canvas), `src/pixel/fx.js` (`playFx(id)`), `src/pixel/post.js` (`pixelPass` for 3D scenes), rules in `knowledge/pixel-art-guide.md`.
- `vendor/` is other people's code with its licence beside it: read and adapt it, keep the LICENSE files, credit in `docs/third-party.md`.
- `library/` (downloaded models), `data/`, `source/` and `.env` are never committed.

## Checks

`npm test` (unit), `npm run build`, `BASE_URL=http://127.0.0.1:5173/ npm run test:e2e` with the dev server up.

Game packages (`games/<shortcode>/`, Kickrani = `g_cv2yrhrpv2`; each has a README file map — read it
first): work on one game with `npm run game:dev -- <game>` (straight into its draft),
`npm run game:test -- <game>` (its unit tests only) and `npm run game:smoke -- <game>` (one short
headless load). New game: `npm run game:create -- --title "…"`. Players get the production release
until an admin deploys (`npm run game:changes` / `game:deploy` / `game:rollback`;
docs/platform-architecture.md "Game packages, draft and production"). The platform never imports a
game. A fresh worktree: `npm run wt:setup` (links node_modules, library/, data/geo — never data/postgres).
