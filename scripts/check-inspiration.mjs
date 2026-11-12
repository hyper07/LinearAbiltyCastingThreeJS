#!/usr/bin/env node
/**
 * Check inspiration-catalog files against the shared vocabulary.
 *
 *   node scripts/check-inspiration.mjs                 the catalog in src/catalog/inspiration/
 *   node scripts/check-inspiration.mjs a.json b.json   any files
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { validateEntries } from '../src/catalog/inspiration/validate.js';

const DIR = resolve('src/catalog/inspiration');
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : (await readdir(DIR)).filter((f) => f.endsWith('.json')).map((f) => join(DIR, f));

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
  const problems = validateEntries(entries);
  bad += problems.length;
  console.log(`${problems.length ? '✗' : '✓'} ${file}: ${entries.length} entries${problems.length ? `, ${problems.length} problems` : ''}`);
  for (const p of problems) console.log(`    ${p}`);
}
process.exit(bad ? 1 : 0);
