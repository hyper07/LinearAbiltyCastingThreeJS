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

test('creatures: on the space maps everyone wears a space suit — a helmet round the head, an oxygen pack, the body repainted', async () => {
  const { MAPS, mapById } = await import('../../src/arcademia/maps.js');
  assert.equal(mapById('moon').suit, 'moon');
  assert.equal(mapById('mars').suit, 'mars');
  for (const m of MAPS.filter((x) => !['moon', 'mars'].includes(x.id))) assert.ok(!m.suit, `${m.id}: no space suits off the space maps`);
  const find = (root, fn) => {
    let hit = null;
    root.traverse((o) => {
      if (!hit && fn(o)) hit = o;
    });
    return hit;
  };
  // Tall, wide, small, long-eared, four-legged and robot shapes; the buddies, a teacher, the Moon's and Mars's townsfolk.
  for (const species of ['fox', 'camel', 'hippo', 'jerboa', 'moonrabbit', 'tardigrade', 'robot', 'pika', 'capybara', 'koala', 'ibis']) {
    for (const suit of ['moon', 'mars']) {
      const plain = makeCreature({ species, lod: 'low', hat: 'bubble' });
      const c = makeCreature({ species, lod: 'low', suit, hat: 'bubble' });
      assert.equal(c.suit, suit);
      assert.equal(plain.suit, null);
      const helmets = [];
      c.group.traverse((o) => o.userData.helmet && helmets.push(o));
      assert.equal(helmets.length, 1, `${species}: one helmet (the suit's absorbs the bubble hat)`);
      assert.ok(!find(plain.group, (o) => o.userData.helmet && o.parent === plain.bones.head), 'no suit helmet off the space maps');
      assert.ok(find(c.group, (o) => o.parent === c.bones.chest && o.children.length >= 5), `${species}: an oxygen pack on the back`);
      // The helmet is big enough for the head: its radius covers the head's half-size.
      const head = c.bones.head;
      const h = helmets[0];
      assert.equal(h.parent, head, `${species}: the helmet rides on the head`);
      const g = c.group.children[0].children[0].children[0].geometry;
      const names = SPECIES[species]().bones.map((b) => b[0]);
      const P = g.attributes.position, SI = g.attributes.skinIndex, tint = g.attributes.tint;
      const box = { min: [9, 9, 9], max: [-9, -9, -9] };
      let suited = 0, chest = 0;
      for (let i = 0; i < P.count; i++) {
        const n = names[SI.getX(i)];
        if (n === 'head') [P.getX(i), P.getY(i), P.getZ(i)].forEach((v, k) => ((box.min[k] = Math.min(box.min[k], v)), (box.max[k] = Math.max(box.max[k], v))));
        if (n === 'chest') {
          chest++;
          if (tint.getX(i) === 0) suited++;
        }
      }
      const hx = (box.max[0] - box.min[0]) / 2, hy = (box.max[1] - box.min[1]) / 2;
      assert.ok(h.scale.x >= Math.max(hx, hy), `${species}: the helmet (${h.scale.x.toFixed(2)}) fits round the head (${Math.max(hx, hy).toFixed(2)})`);
      assert.ok(chest && suited === chest, `${species}: the body is in the suit`);
      assert.notEqual(g, plain.group.children[0].children[0].children[0].geometry, 'a suited mesh of its own');
      c.update(0.1, { speed: 1 });
    }
  }
  // A small hat stays on inside the helmet; a big one comes off.
  const crowned = makeCreature({ species: 'fox', lod: 'low', suit: 'moon', hat: 'crown' });
  const wizard = makeCreature({ species: 'fox', lod: 'low', suit: 'moon', hat: 'wizard' });
  const hats = (c) => c.bones.head.children.filter((o) => !o.isBone && !o.userData.helmet && o.children.length === 1).length;
  assert.ok(hats(crowned) >= hats(wizard), 'the crown fits under the glass, the wizard hat does not');
});
