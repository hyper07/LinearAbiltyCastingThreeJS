# Pixel art on the platform: the rules

From "How to make Emberleaf". The functions are in `src/pixel/art.js`; ready effects in
`src/pixel/fx.js` (244 of them — `npm run kb -- <words>`).

Quality comes from four habits, not one trick: every pixel on a strict grid, every colour from a
hand-picked ramp, light always from the same direction, and every action answered with feedback.

## Rendering

- Paint the world on a **low-resolution canvas** and copy it to the screen at a **whole-number zoom**
  with smoothing off (`pixelCanvas`). Never 2.5×: some pixels come out wider than others.
- World units for logic; `K = 2` detail pixels a unit on the low canvas; the screen shows about 280
  units on its short side (170 on phones).
- Round every draw position to a whole pixel, and the camera too (after screen shake), or sprites shimmer.
- Shapes row by row with `fillRect` (`pixelEllipse`), never `arc` (anti-aliased). Line art drawn soft:
  snap its alpha to on/off (`hardAlpha`).
- Text, damage numbers and the HUD at full resolution on top — never in the pixel layer.

## Art

1. **Ramps with hue shifting** — 5 shades a material; shadows towards blue-violet, highlights towards
   yellow (`ramp`, `RAMPS`). 24–40 colours in all.
2. **One light, top-left** — lighter top and left edges, darker bottom and right; the lower part of a
   shape a shade darker.
3. **Selective outlines** — the darkest shade of what the pixel touches, mixed towards ink; lighter
   along the top (a rim light). Never pure black.
4. **Dither** (4×4 Bayer) on big shapes only — grass, shadows; never on small sprites.
5. **Silhouette first** — block it in one colour; big heads, hats, eyes; a white glint in each eye.

`shadeSprite(rows, ramps)` does 1–3 for a sprite written as a letter map (one letter a material);
`scale: 2` doubles the detail with rounded corners and a dithered second band.

Workflow: resolution → palette → silhouette → shading and 2–4 animation frames → into the game early,
judged at real size and speed → effects and sound last (they multiply quality that is already there).

## World

- Paint the ground **once** into a big offscreen canvas: layered sines + Bayer choose the shade
  (`paintGround`), then paths, decoration passes (pebbles, tufts, flowers from small templates), contact
  shadows under trees and sun patches. Copy from it each frame.
- **Y-sort** everything that stands by its feet each frame; all shadows in a pass before any sprite.
- Generate several of each tree so no two match.

## Effects and feel

- One particle system (position, velocity, life, size, colour, gravity; capped), plus screen tricks.
- **Additive** blending for fire, glow, flashes; normal for smoke and debris. Fire colour by age.
- A hit: sound, white flash (a pure-white copy of the sprite, 0.1 s), damage number, knockback. Big
  actions: screen shake (decays fast) and particles. Small ones: neither.
- Cast time sells power: a wind-up with a growing circle, the caster slowed. Ground areas are ellipses.
- Last: a warm soft-light grade, a breathing sunbeam, a vignette.
- For an effect itself: lines and light, not fills; hard colour steps; fast in, slow out, a 1–2 frame
  white hero frame; vary every particle; seamless loops; seeded, never `Math.random`.

## Polish, in order of impact

Hit feedback · shake and particles on big actions · brief invulnerability and flicker when hurt · an
idle bob and a 2-frame walk · shadows under everything · dust at the feet · ambient life (petals,
motes, wind) · pause when hidden · touch controls · best score saved.
