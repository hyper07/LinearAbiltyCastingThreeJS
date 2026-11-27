import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextWeather, WEATHERS, raceSky, TIME_PICKS } from '../../games/g_cv2yrhrpv2/weather.js';

test('a race sky: what was picked, or a random time of day and weather (no snow in summer)', () => {
  const night = raceSky('night', 'rain');
  assert.equal(night.weather, 'rain');
  assert.ok(night.hour >= TIME_PICKS.night.hours[0] && night.hour <= TIME_PICKS.night.hours[1]);
  let seed = 3;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const times = new Set();
  const kinds = new Set();
  for (let i = 0; i < 600; i++) {
    const s = raceSky('random', 'random', { month: 6, random });
    times.add(s.time);
    kinds.add(s.weather);
    assert.ok(WEATHERS[s.weather]);
  }
  assert.deepEqual([...times].sort(), ['day', 'dusk', 'golden', 'night']);
  assert.ok(!kinds.has('snow') && kinds.has('rain') && kinds.has('clear'));
  assert.ok(new Set(Array.from({ length: 300 }, () => raceSky('day', 'random', { month: 0, random }).weather)).has('snow'), 'snow in January');
});

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
