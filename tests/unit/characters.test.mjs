import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENTRIES } from '../../src/catalog/inspiration/index.js';
import { CHARACTERS, charactersOf, findCharacters, forgeDesignOf, matchCharacter } from '../../src/catalog/inspiration/characters.js';
import { validateCharacters } from '../../src/catalog/inspiration/validate.js';
import { normalizeDesign } from '../../src/ai/ClassDesigner.js';

test('every character record uses the shared vocabulary', () => {
  assert.ok(CHARACTERS.length >= 300, `only ${CHARACTERS.length} characters`);
  assert.deepEqual(validateCharacters(CHARACTERS, ENTRIES), []);
});

test('most works have a cast', () => {
  const without = ENTRIES.filter((e) => !charactersOf(e.id).length).map((e) => e.id);
  assert.ok(without.length <= 5, `no characters: ${without.join(', ')}`);
});

test('every original class goes through the forge unchanged: six bases, its names, its look', () => {
  for (const c of CHARACTERS) {
    const design = normalizeDesign(forgeDesignOf(c.id));
    const bases = design.branches.flatMap((b) => b.skills.map((s) => s.base));
    assert.deepEqual(bases, c.forge.branches.flatMap((b) => b.skills.map((s) => s.base)), c.id);
    assert.equal(design.name, c.forge.name, c.id);
    assert.equal(design.look, c.forge.look, c.id);
    assert.equal(design.style, c.forge.style, c.id);
  }
});

test('characters are found by name, and "a class like X" names them', () => {
  const jinwoo = findCharacters('sung jin-woo')[0];
  assert.equal(jinwoo?.work, 'solo-leveling');
  assert.equal(matchCharacter('a class like Sung Jin-woo')?.id, jinwoo.id);
  assert.equal(matchCharacter('a fire mage who throws meteors'), null);
});
