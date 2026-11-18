# The knowledge base

[← Back to the README](../README.md)

Everything reusable for building games, simulators and pages on the platform is
collected in one searchable index, so a person or an AI agent finds a ready
piece in a few lines instead of reading files or writing it again.

```bash
npm run kb -- night lantern lighting     # search (BM25 over title, tags and summary)
npm run kb -- tank --models              # search the 3D models
npm run kb -- shake --kind technique     # one kind only
npm run kb -- --kinds                    # what kinds there are
npm run kb -- --show own.pixel.art       # one full record
npm run kb:build                         # rebuild knowledge/index.json after adding things
```

A search prints the id, a one-line summary and the file to open. Nothing else
needs reading until a record is chosen.

## What is in it

| What | How many | Where | Use |
| --- | --- | --- | --- |
| Pixel-art effects (fire, ice, lightning, explosions, pickups, whole attack moves…) | 244 | `vendor/pixelfx/` | `playFx('fire/campfire')` from `src/pixel/fx.js` — a canvas to draw, or `.texture(THREE)` for a sprite in 3D |
| Pixel-art kit and rules | 14 rules | `src/pixel/art.js`, `knowledge/pixel-art-guide.md` | `shadeSprite(rows, ramps)` lights and outlines a letter-map sprite; `ramp()`, `dither()`, `pixelCanvas()`, `paintGround()` |
| Ready 3D kits (buildings, nature, props, vehicles) | 22 | `vendor/3dviz/kits/` | `create(params)` → `{ group, sockets, colliders, animate }` |
| Scene recipes and design knowledge (lighting, materials, motion, composition) | 223 + 440 | `vendor/3dviz/recipes/`, `vendor/3dviz/knowledge/` | Read the record; adapt the code it points to |
| Rigs | 5 | `vendor/3dviz/rigs/` | Skeleton and animation set-ups |
| Shader and character templates (pixel-art pass with a 64-colour palette, toon looks, water, procedural people) | 28 + 7 guides | `vendor/diorama/` | `new PixelPost(renderer, maxDim, renderScale)`; the rest is reference to adapt |
| Techniques from other games (flow fields, wave budgets, fog of war, formations, cloth, crowds, adaptive music…) | 41 | `knowledge/techniques.json`, some code in `vendor/last-stand/` | Each record says how it works; some point to reference code |
| Low-poly 3D models | 3,422 | fetched into `library/polyfork/` | `npm run library:polyfork -- <id>` or `--kit "words"` or `--all` (about 1 GB) |
| Our own modules | 10 | `knowledge/own.json` | Add a record when you write something reusable |

## The pixel lab

One screen that shows the pieces running together — eight effects, auto-shaded
sprites, dithered ground, and two 3D kits through the pixel-art pass. With the
game open, in the browser console:

```js
(await import('/src/pixel/lab.js')).openLab()
```

## Adding to it

- Something of ours: a record in `knowledge/own.json` (`id`, `kind`, `title`, `summary`, `tags`, `path`).
- A technique learned elsewhere: a record in `knowledge/techniques.json`.
- Code from another project: a folder under `vendor/` with its `LICENSE`, a credit in [Third-party services](third-party.md), and a section in `scripts/kb-build.mjs`.

Then `npm run kb:build`. The unit test `tests/unit/kb.test.mjs` checks that every record points at a real file and every vendored folder keeps its licence.
