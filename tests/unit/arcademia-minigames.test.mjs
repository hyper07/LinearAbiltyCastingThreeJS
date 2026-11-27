import { test } from 'node:test';
import assert from 'node:assert/strict';

test('basket throw: every basket can be reached (full power once fell short of all of them)', async () => {
  const { LAUNCH, launchLands } = await import('../../src/arcademia/lesson/minigames.js');
  const reach = (x) => [30, 45, 60].some((a) => Array.from({ length: 81 }, (_, k) => 20 + k).some((p) => Math.abs(launchLands(a, p) - x) < 34));
  for (let x = LAUNCH.targetMin; x <= LAUNCH.targetMax; x += 20) assert.ok(reach(x), `a basket at ${x} px can't be reached`);
  // …and not by any throw at all: the nearest basket still needs some power.
  assert.ok(launchLands(45, 20) < LAUNCH.targetMin - 34, 'the weakest throw should fall short of the nearest basket');
});
