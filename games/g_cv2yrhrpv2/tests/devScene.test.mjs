import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sceneParams } from '../devScene.js';
import { BIKE_COURSES } from '../course.js';

test('Kickrani scene params: the known ones checked, the rest dropped', () => {
  const id = BIKE_COURSES[0].id;
  const p = new URLSearchParams(`race=1&autopilot=1&course=${id}&laps=2&time=day&weather=rain&hour=21.5&mode=walk&play=kickrani`);
  assert.deepEqual(sceneParams(p), { hour: 21.5, mode: 'walk', course: id, laps: 2, time: 'day', weather: 'rain', race: true, autopilot: true });
  assert.deepEqual(sceneParams(new URLSearchParams('course=nowhere&laps=99&time=never&weather=lava&hour=30&mode=swim&race=yes')), {});
  assert.deepEqual(sceneParams(new URLSearchParams('')), {});
});
