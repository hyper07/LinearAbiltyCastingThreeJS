/**
 * Writes knowledge/pixelfx.json: one small record per vendored pixel
 * effect (id, name, what it shows, tags, size, loop or one-shot, option
 * names), so an agent finds an effect without opening 244 files.
 *   node scripts/kb-pixelfx.mjs
 */
import { writeFileSync } from 'node:fs';
import { effects, categories } from '../vendor/pixelfx/fx/index.js';

const records = Object.entries(effects).map(([id, mod]) => {
  const m = mod.meta;
  return {
    id,
    name: m.name,
    desc: m.desc,
    tags: m.tags,
    size: m.size,
    origin: m.origin,
    loop: Boolean(m.loop),
    seconds: m.duration,
    bg: m.bg,
    actor: m.actor ? true : undefined,
    options: Object.keys(m.options ?? {}).filter((k) => k !== 'seed'),
    palette: m.options?.palette
  };
});
writeFileSync(new URL('../knowledge/pixelfx.json', import.meta.url), `${JSON.stringify({ source: 'vendor/pixelfx (MIT)', use: "import { playFx } from 'src/pixel/fx.js'", categories, effects: records })}\n`);
console.log(`${records.length} effects in ${categories.length} categories`);
