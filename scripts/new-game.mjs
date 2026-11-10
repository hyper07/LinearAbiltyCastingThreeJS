#!/usr/bin/env node
/**
 * Make a game from the blueprints, from the command line — for people and for
 * AI coding tools alike. No browser, no model, no tokens.
 *
 *   npm run game:new -- --idea "a pirate story quest in three chapters"
 *   npm run game:new -- --genre boss-hunt --world frozen-north --hero knight --name "Ice Crown"
 *   npm run game:new -- --spec my-game.json          a spec file (src/blueprints/spec.js)
 *   npm run game:new -- --menus                       list every id you can use
 *   add --dry-run to print the levels instead of writing them
 *
 * Writes each chapter to public/levels/<id>.json and adds it to the campaign
 * (public/levels/index.json), like saving in the editor under `npm run dev`.
 * The levels carry their map plan; the game scatters the scenery on load.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { FOES, GENRES, HEROES, LAYOUTS, WORLDS, compileGame, keywordSpec } from '../src/blueprints/index.js';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const levelDir = resolve(value('dir') ?? 'public/levels');

if (flag('menus') || !args.length) {
  for (const [title, registry] of [['genre', GENRES], ['world', WORLDS], ['layout', LAYOUTS], ['hero', HEROES], ['foes', FOES]]) {
    console.log(`\n--${title}`);
    for (const [id, entry] of Object.entries(registry)) console.log(`  ${id.padEnd(20)} ${entry.blurb}`);
  }
  console.log('\nalso: --name "…" --chapters 1-5 --difficulty easy|normal|hard --subject add|subtract|times|mixed --age 4-16 --seed N --dry-run');
  process.exit(0);
}

let spec = value('spec') ? JSON.parse(await readFile(value('spec'), 'utf8')) : value('idea') ? keywordSpec(value('idea')) : {};
for (const key of ['name', 'genre', 'world', 'layout', 'hero', 'foes', 'difficulty', 'subject']) if (value(key)) spec[key] = value(key);
for (const key of ['chapters', 'age']) if (value(key)) spec[key] = Number(value(key));

const indexFile = resolve(levelDir, 'index.json');
const index = JSON.parse(await readFile(indexFile, 'utf8').catch(() => '{"campaign":[]}'));
const taken = new Set(index.campaign.map((e) => e.id));
const { spec: final, levels } = compileGame(spec, { seed: Number(value('seed')) || (Math.random() * 1e9) | 0, taken });

console.log(`${final.name}: ${GENRES[final.genre].name} in ${WORLDS[final.world].name}, ${levels.length} chapter${levels.length === 1 ? '' : 's'}`);
for (const level of levels) console.log(`  ${level.id.padEnd(32)} ${level.rules.goal} ${level.rules.count} · ${level.blueprint.layout} · ${level.npcs.map((n) => n.name).join(', ') || 'no helpers'}`);

if (flag('dry-run')) {
  console.log(JSON.stringify(levels, null, 2));
  process.exit(0);
}
for (const level of levels) {
  await writeFile(resolve(levelDir, `${level.id}.json`), JSON.stringify(level, null, 2) + '\n');
  index.campaign.push({ id: level.id, name: level.name });
}
await writeFile(indexFile, JSON.stringify(index, null, 2) + '\n');
console.log(`wrote ${levels.length} level${levels.length === 1 ? '' : 's'} to ${levelDir} and the campaign`);
