#!/usr/bin/env node
/**
 * Check inspiration-catalog files against the shared vocabulary.
 *
 *   node scripts/check-inspiration.mjs                 the catalog in src/catalog/inspiration/
 *   node scripts/check-inspiration.mjs a.json b.json   any files (a file of characters is told by its records' "work")
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { validateCharacters, validateEntries } from '../src/catalog/inspiration/validate.js';
import { ENTRIES } from '../src/catalog/inspiration/index.js';

const DIR = resolve('src/catalog/inspiration');
const listJson = async (dir) => (await readdir(dir).catch(() => [])).filter((f) => f.endsWith('.json')).map((f) => join(dir, f));
const files = process.argv.slice(2).length ? process.argv.slice(2) : [...(await listJson(DIR)), ...(await listJson(join(DIR, 'characters')))];

let bad = 0;
for (const file of files) {
  let entries;
  try {
    entries = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    console.log(`✗ ${file}: ${error.message}`);
    bad++;
    continue;
  }
  const characters = Array.isArray(entries) && entries.length > 0 && entries.every((e) => e && typeof e.work === 'string');
  const problems = characters ? validateCharacters(entries, ENTRIES) : validateEntries(entries);
  bad += problems.length;
  console.log(`${problems.length ? '✗' : '✓'} ${file}: ${entries.length} ${characters ? 'characters' : 'entries'}${problems.length ? `, ${problems.length} problems` : ''}`);
  for (const p of problems) console.log(`    ${p}`);
}
process.exit(bad ? 1 : 0);
