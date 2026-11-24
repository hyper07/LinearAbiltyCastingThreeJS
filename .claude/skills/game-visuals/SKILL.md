---
name: game-visuals
description: Use when designing or building how a game looks or feels on screen in this repo — HUD and skill-bar layout, skill/spell/hit effects, character select, dress-up and menu screens, maps, scene mood and palettes, rendering quality ("make it look like Unity/Unreal", AO, bloom, shadows, WebGPU), and cute doll / plush / toy characters for kids games (e.g. the plush bunny snowboarding idea). Draws on 295 studied reference screenshots in images/ and the render-quality guide.
---

# Game visuals: references, layouts, effects, rendering

The user collected 295 screenshots (`images/`, never committed) of HUDs, skill
effects, skill bars, menus, scenes and **concepts for games they want to
make**: above all fun games for kids with cute doll/plush characters (a pink
plush bunny snowboarding, plush animal friends in pyjamas). They want the
games to look as good as Unity or Unreal games, built with three.js.

## 1. Find the knowledge (cheap)

```bash
npm run kb -- skill wheel mobile          # rules + the best screenshots for it
npm run kb -- violet forest --kind visual-ref
npm run kb -- --show ref.img-0222         # one screenshot's full notes; `image` = local file
npm run kb -- render quality              # rendering techniques
```

Then read only the section a record names:
- `knowledge/visual-study.md` — what the screenshots teach. §2 concepts the user wants,
  §3 HUD layouts with measurements, §4 aligning skills, §5 effects, §6 select/dress-up
  menus, §7 maps, §8 scene palettes, §9 what each focus game takes, §10 best refs.
- `knowledge/render-quality.md` — engine-grade rendering. §1 WebGL2 vs WebGPU, §2 the ten
  things that matter, §3 WebGPU recipe, §4 WebGL2 upgrades for current games, §5 tiers and
  budgets, §6 cute doll/plush characters, §7 snow and board trails, §8 effect layer stack,
  §9 open-source picks, §10 what looks cheap.
- `images2/` (93 more, `ref.img2-*`): scene moods in `visual-study.md` §11; racing cars,
  RC cars and FPV drones in `knowledge/racing-study.md` (use the `racing-rc` skill).
- `knowledge/seoul-buildings.md` — real-looking city buildings and Korean shop-sign placement.
- `knowledge/visual-refs.json` — the full per-image catalogue (HUD element positions,
  effect layers, hex palettes, lighting, concept notes). Grep it; don't read it whole.

## 2. Look at the real image when layout or mood matters

The notes are good, but the picture is better for a layout you are about to copy the
*structure* of. Images are 2622 px phone screenshots; shrink before reading:

```bash
sips -s format jpeg -Z 1280 "images/IMG_0222.PNG" --out "$SCRATCH/ref-0222.jpg"
```

then Read the small copy. If `images/` is missing (fresh clone), work from the notes.

## 3. Rules to apply

- **Learn, don't copy.** Take layout, measurements, colour, timing. Never rebuild a
  specific game's screens, characters, names or art.
- **Focus games only:** Gloamreach, AI Arcademia, Lanternwood. A new game (e.g. the
  bunny snowboarder) goes on the build queue; ask before starting it.
- **HUD:** the centre stays clear; HUD in corners and the bottom edge. Every RPG keeps
  an always-on corner minimap. Touch: left 35 % is the joystick zone.
- **Keys:** numbers for skills and items; never Q/E for potions; H = How to play.
- **Skills:** keyboard → hotbar bottom-centre; touch → arc of round skills around a big
  attack button bottom-right; cooldown = radial sweep + big seconds; kids → 2–4 big
  picture buttons with a filling ring, no numbers.
- **Effects:** core → glow → body → particles → trail → ground decal → flash/shake/hit-stop
  → short light. One hue family per element; contrast the effect with the scene.
- **Rendering:** existing games stay on WebGL2 (82 GLSL files) and add GTAO, AgX,
  selective bloom, SMAA. New games start on `WebGPURenderer` + TSL (SSGI, TRAA,
  emissive-only bloom). Pin the three version.
- **Cute characters:** big head, minimal low face, touchable material (plush sheen + fur
  shells, felt, vinyl clearcoat), rim light, strong AO, squash and stretch.

## 4. Check the result

Run the game (`run` skill or the dev server), take a screenshot with Playwright, and
compare it side by side with the 1–3 references you used: HUD positions, effect
readability, contrast, palette. Fix what doesn't match before reporting. Then
`npm test` and `npm run build`.
