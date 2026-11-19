import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeCreature, creatureGeometry, stats, BUDDIES, HATS } from '../../src/arcademia/world/figures.js';
import { SPECIES } from '../../src/arcademia/world/creatures/species.js';
import { makeHat, BUDDY_HATS } from '../../src/arcademia/world/creatures/hats.js';

test('creatures: every species sculpts into a clean, fully skinned mesh', () => {
  for (const species of Object.keys(SPECIES)) {
    const g = creatureGeometry(species, { lod: 'low' });
    const n = g.attributes.position.count;
    assert.ok(n > 800, `${species}: ${n} vertices`);
    assert.ok(g.index.count / 3 > n, `${species}: a closed surface`);
    const w = g.attributes.skinWeight;
    for (let i = 0; i < n; i += 37) {
      const s = w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i);
      assert.ok(Math.abs(s - 1) < 1e-4, `${species}: weights of vertex ${i} sum to ${s}`);
    }
    const p = g.attributes.position;
    for (let i = 0; i < n; i += 53) assert.ok(Number.isFinite(p.getX(i) + p.getY(i) + p.getZ(i)), `${species}: finite positions`);
    g.computeBoundingBox();
    assert.ok(g.boundingBox.min.y > -0.05 && g.boundingBox.max.y < 1.6, `${species}: stands on the ground, about a metre tall`);
  }
  assert.ok(stats.ms / stats.builds < 250, `low detail builds fast (${Math.round(stats.ms / stats.builds)} ms each)`);
});

test('creatures: buddies wear every hat, and every pose plays', () => {
  assert.deepEqual(HATS.map((h) => h.id).filter((h) => h !== 'none'), BUDDY_HATS);
  for (const b of BUDDIES) {
    for (const h of HATS) {
      const c = makeCreature({ species: b.id, hat: h.id, lod: 'low' });
      for (const pose of ['hop', 'cheer', 'sad', 'wave', 'talk', 'surprise', 'think', 'happy']) {
        c[pose]();
        for (let k = 0; k < 6; k++) c.update(0.05, { speed: k % 2 ? 2 : 0 });
      }
      c.group.updateMatrixWorld(true);
      c.group.traverse((o) => o.isBone && assert.ok(Number.isFinite(o.matrixWorld.elements[13]), `${b.id} ${h.id}: bone ${o.name}`));
    }
  }
  for (const id of ['mortarboard', 'goggles', 'nemes', 'knight', 'tophat']) assert.ok(makeHat(id), id);
});
