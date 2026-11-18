import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextWeather, WEATHERS } from '../../src/city/weather.js';

test('the weather changes by itself: never the same twice running, mostly clear, snow only when it is cold', () => {
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const count = {};
  let now = 'clear';
  for (let i = 0; i < 4000; i++) {
    const next = nextWeather(now, 6, random);
    assert.notEqual(next, now);
    assert.ok(WEATHERS[next], next);
    count[next] = (count[next] ?? 0) + 1;
    now = next;
  }
  assert.equal(count.snow ?? 0, 0, 'no snow in July');
  assert.ok(count.clear > count.rain && count.rain > count.storm, JSON.stringify(count));
  const winter = new Set(Array.from({ length: 400 }, () => nextWeather('clear', 0, random)));
  assert.ok(winter.has('snow'), 'snow in January');
});
