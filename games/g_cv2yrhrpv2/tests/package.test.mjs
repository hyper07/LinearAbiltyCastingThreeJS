/**
 * Kickrani as a game package: its manifest, its one entry, and that it borrows from other
 * games only through shared libraries (src/shared/plushKit.js), never their folders.
 * (Kickrani's many rule tests live in tests/unit and import games/g_cv2yrhrpv2/; `npm run
 * game:test -- kickrani` runs those and this.)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('game.json', dir), 'utf8'));
const sources = readdirSync(dir).filter((f) => f.endsWith('.js'));

test('Kickrani: the manifest keeps the platform id official:seoul and names this folder', () => {
  assert.equal(manifest.code, 'g_cv2yrhrpv2');
  assert.equal(manifest.id, 'official:seoul');
  assert.equal(manifest.slug, 'kickrani');
  assert.equal(manifest.api, 1);
  assert.ok(sources.includes(manifest.entry));
});

test('Kickrani: the entry exports mount(container, platform)', () => {
  assert.match(readFileSync(new URL(manifest.entry, dir), 'utf8'), /export async function mount\(container, platform\)/);
});

test('Kickrani: imports stay inside its folder, three, npm packages or src/shared and src/net — never another game or the platform', () => {
  const bad = [];
  for (const f of sources) {
    // Code only: a JSDoc type like import('../../src/platform/gameApi.js') is not an import.
    const text = readFileSync(new URL(f, dir), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const m of text.matchAll(/(?:from|import\()\s*['"]([^'"]+)['"]/g)) {
      const spec = m[1];
      if (!spec.startsWith('.')) continue;
      if (spec.startsWith('./')) continue;
      if (/^\.\.\/\.\.\/src\/(shared|net|ui\/pop\.js)/.test(spec)) continue;
      bad.push(`${f}: ${spec}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("Kickrani's README file map names every module", () => {
  const readme = readFileSync(new URL('README.md', dir), 'utf8');
  const missing = sources.filter((f) => !readme.includes(`\`${f}\``));
  assert.deepEqual(missing, []);
});
