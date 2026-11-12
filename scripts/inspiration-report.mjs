#!/usr/bin/env node
/**
 * Write docs/inspiration.md from the inspiration catalog: every work with its
 * links, the nearest build we make today, and the features we lack, ranked.
 *
 *   node scripts/inspiration-report.mjs
 */
import { writeFile } from 'node:fs/promises';
import { ENTRIES, effectGaps, featureGaps } from '../src/catalog/inspiration/index.js';
import { FEATURES } from '../src/catalog/inspiration/vocabulary.js';

const GROUPS = [
  ['Action RPGs and MMOs', 'action-rpg'],
  ['Strategy, MOBA and battle royale', 'strategy-competitive'],
  ['RPG, roguelike and family games', 'rpg-family'],
  ['Korean manhwa and web novels', 'manhwa'],
  ['Japanese manga and light novels', 'manga']
];

const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ');
const linksOf = (e) =>
  [
    e.links?.wikipedia && `[Wikipedia](${e.links.wikipedia})`,
    e.links?.official && `[Official](${e.links.official})`,
    e.links?.fandom && `[Wiki](${e.links.fandom})`,
    e.image && `[Image${e.image.license === 'free' ? ' (free)' : ''}](${e.image.page ?? e.image.url})`
  ]
    .filter(Boolean)
    .join(' · ');

const { default: files } = await import('../src/catalog/inspiration/files.js');

const out = [];
out.push('# Inspiration catalog', '', '[← Back to the README](../README.md)', '');
out.push(
  'Well-known games and RPG / fantasy stories, each mapped onto our own ids — genres, class archetypes,',
  'skill effects and game features — so the builder can make "a game like X" from a few tokens.',
  'The data is in `src/catalog/inspiration/` (one JSON file per family), checked by',
  '`node scripts/check-inspiration.mjs` and the unit tests; this page is written by',
  '`node scripts/inspiration-report.mjs`.',
  '',
  'The catalog records **facts about other works, in our own words, with links**. Images are links',
  'only (cover art is the publisher\'s, never copied into the game). What we build from a work is our',
  'own: a spec never carries its title, and each entry\'s **original take** names a game with our names.',
  'Works marked *mature* are catalogued for their mechanics only, never as a theme for children\'s games.',
  '',
  `**${ENTRIES.length} works.** In the Game builder, write an idea like *"a dungeon game like Solo Leveling"*:`,
  'the keyword builder starts from that work\'s nearest picks, and the AI gets a short note of its',
  'systems and an original take (`src/ai/GameBuilder.js`).',
  ''
);

out.push('## What we lack, by how many works use it', '');
out.push('Features other works rely on that we do not have yet (`close` = a small step from what exists).', '');
out.push('| Feature | Status | Works | For example |', '| --- | --- | --- | --- |');
for (const g of featureGaps().filter((g) => g.works >= 2).slice(0, 40)) {
  out.push(`| \`${g.id}\`${g.note ? ` — ${cell(g.note)}` : ''} | ${g.status} | ${g.works} | ${cell(g.examples.join(', '))} |`);
}
const effects = effectGaps().slice(0, 12);
if (effects.length) {
  out.push('', 'Skill effects with no ability of ours yet, by how many catalogued skills use them: ' + effects.map((e) => `\`${e.id}\` ${e.uses}`).join(', ') + '.');
}
out.push('');

for (const [heading, file] of GROUPS) {
  const entries = files[file] ?? [];
  out.push(`## ${heading}`, '');
  out.push('| Work | Kind | Genres | Nearest build today | Links |', '| --- | --- | --- | --- | --- |');
  for (const e of entries) {
    const b = e.blueprint;
    out.push(
      `| **${cell(e.title)}** (${e.year ?? '—'})${e.audience === 'mature' ? ' *mature*' : ''} | ${e.kind} | ${cell(e.genres.join(', '))} | ${b.genre} · ${b.world} · ${b.hero} | ${linksOf(e)} |`
    );
  }
  out.push('');
  for (const e of entries) {
    out.push(`### ${e.title}`, '');
    out.push(`${cell(e.summary)}`, '');
    const feats = e.features.map((f) => {
      const status = FEATURES[f.id]?.status ?? 'new';
      return `\`${f.id.replace(/^new:/, '')}\`${status === 'have' ? ' ✓' : ''}`;
    });
    out.push(`**Systems:** ${feats.join(', ')} (✓ = we have it)`, '');
    const people = [...(e.classes ?? []), ...(e.characters ?? [])];
    if (people.length) out.push(`**${e.classes?.length ? 'Classes' : 'Characters'}:** ${people.map((c) => `${cell(c.name)} (${c.archetype})`).join(', ')}`, '');
    out.push(`**Original take:** ${cell(e.makeItOurs)}`, '');
  }
}

await writeFile('docs/inspiration.md', out.join('\n'));
console.log(`docs/inspiration.md: ${ENTRIES.length} works`);
