import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  TRACK_TITLES, GAME_TRACKS, musicPack, gameMusicPack, MoodHold, Settle, band,
  gloamreachTrack, kithvaleTrack, lanternwoodTrack, seoulTrack, wyldhuntTrack, duskAt, KICKRANI_COURSE_TRACKS
} from '../../src/shared/gameMusic.js';
import { BIKE_COURSES } from '../../src/city/course.js';
import { MUSIC_CREDIT } from '../../src/shared/music.js';

const MANIFEST = path.resolve('public/audio/bgm/manifest.json');

/** Run `hold` for `secs` seconds of frames with the same input. */
const run = (h, secs, input, dt = 1 / 30) => {
  let m;
  for (let t = 0; t < secs - 1e-9; t += dt) m = h.update(dt, input);
  return m;
};

test('moods: into a fight at once, out of it only after the hold', () => {
  const h = new MoodHold({ hold: 5 });
  assert.equal(h.update(1 / 60, {}), 'calm');
  assert.equal(h.update(1 / 60, { fight: true }), 'battle', 'the first frame of a fight');
  assert.equal(run(h, 4.5, {}), 'battle', 'still fighting music 4.5 s after the last enemy broke off');
  assert.equal(run(h, 0.6, {}), 'calm', '…and calm after 5 s');
});

test('moods: a moment out of the fight does not flap the music', () => {
  const h = new MoodHold({ hold: 5 });
  h.update(0.1, { fight: true });
  for (let i = 0; i < 10; i++) {
    run(h, 3, {}); // breaks off for 3 s…
    assert.equal(h.update(0.1, { fight: true }), 'battle'); // …and comes back
  }
  assert.equal(run(h, 4.9, {}), 'battle');
  assert.equal(run(h, 0.2, {}), 'calm');
});

test('moods: the boss rises at once, and the fight steps down through battle', () => {
  const h = new MoodHold({ hold: 4 });
  h.update(0.1, { fight: true });
  assert.equal(h.update(0.1, { fight: true, boss: true }), 'boss');
  assert.equal(run(h, 3, { fight: true }), 'boss', 'the boss music holds when its bar drops for a moment');
  assert.equal(run(h, 1.1, { fight: true }), 'battle');
  assert.equal(h.update(0.1, { boss: true }), 'boss');
  assert.equal(h.force('calm'), 'calm');
  assert.equal(h.mood, 'calm');
});

test('places settle before their track plays', () => {
  const s = new Settle('village', { delay: 2 });
  assert.equal(s.update(1, 'meadow'), 'village');
  assert.equal(s.update(0.5, 'village'), 'village', 'stepped back: the clock resets');
  assert.equal(s.update(1.5, 'meadow'), 'village');
  assert.equal(s.update(0.4, 'meadow'), 'village');
  assert.equal(s.update(0.2, 'meadow'), 'meadow', 'held 2 s');
  assert.equal(s.set('title'), 'title');
  assert.equal(s.value, 'title');
});

test('a dead band holds a threshold', () => {
  assert.equal(band(0.6, false, 0.55, 0.45), true);
  assert.equal(band(0.5, true, 0.55, 0.45), true);
  assert.equal(band(0.5, false, 0.55, 0.45), false);
  assert.equal(band(0.4, true, 0.55, 0.45), false);
});

test('Gloamreach: hearth in the village, meadow in the fields, Violet Hollow in the wood, Rime Keep on the ledge', () => {
  assert.equal(gloamreachTrack({ area: 'village', x: 0, z: 10 }), 'village');
  assert.equal(gloamreachTrack({ area: 'village', x: -100, z: 60 }), 'meadow');
  assert.equal(gloamreachTrack({ area: 'overlook', x: 126, z: 0 }), 'meadow');
  assert.equal(gloamreachTrack({ area: 'gate', x: 0, z: -140, gloam: 0.3 }), 'meadow');
  assert.equal(gloamreachTrack({ area: 'gate', x: 0, z: -150, gloam: 0.8 }), 'night-forest');
  assert.equal(gloamreachTrack({ area: 'gloamwood', x: 0, z: -240 }), 'night-forest');
  assert.equal(gloamreachTrack({ area: 'ledge', x: 123, z: -45 }), 'frozen-fortress');
});

test('Wyldhunt, zone by zone: the hearth at camp, the falls down the gorge, the hunt once tracked up in the Heights', () => {
  assert.equal(wyldhuntTrack({ zone: 'base-camp' }), 'village');
  assert.equal(wyldhuntTrack({ zone: 'base-camp', hunting: true }), 'village');
  assert.equal(wyldhuntTrack({ zone: 'veilfall-reach' }), 'jungle');
  assert.equal(wyldhuntTrack({ zone: 'veilfall-reach', hunting: true }), 'jungle', 'no beast lives below the stair');
  assert.equal(wyldhuntTrack({ zone: 'hollow-heights' }), 'jungle');
  assert.equal(wyldhuntTrack({ zone: 'hollow-heights', hunting: true }), 'jungle-hunt');
  assert.equal(wyldhuntTrack({ zone: 'somewhere-new' }), 'jungle', 'a new zone plays the gorge');
});

test('Kithvale, Lanternwood and Kickrani', () => {
  assert.equal(duskAt(17.8), true, 'the vale\'s own golden hour is dusk');
  assert.equal(duskAt(12), false);
  assert.equal(duskAt(17.3, true), true, 'held in the dead band');
  assert.equal(duskAt(17.3, false), false);
  assert.equal(duskAt(2), true);
  assert.equal(kithvaleTrack({ village: true }), 'lantern-valley');
  assert.equal(kithvaleTrack({ village: false, dusk: true }), 'lantern-valley');
  assert.equal(kithvaleTrack({ village: false, dusk: false }), 'meadow');
  assert.equal(lanternwoodTrack({ realm: 'lanternwood', area: 'camp' }), 'village');
  assert.equal(lanternwoodTrack({ realm: 'lanternwood', area: 'glade' }), 'night-forest');
  assert.equal(lanternwoodTrack({ realm: 'sunmeadow' }), 'meadow');
  assert.equal(lanternwoodTrack({ realm: 'frostpeak' }), 'frozen-fortress');
  assert.equal(lanternwoodTrack({ realm: 'emberfall' }), 'frozen-fortress');
  assert.equal(seoulTrack({ mode: 'race' }), 'city-night', 'a course with no track of its own');
  assert.equal(seoulTrack({ mode: 'race', racing: true, course: 'gwanghwamun' }), 'kick-palace');
  assert.equal(seoulTrack({ mode: 'race', racing: true, course: 'jamsilpark' }), 'kick-fair');
  assert.equal(seoulTrack({ mode: 'race', racing: true, course: 'namsandown' }), 'kick-downhill');
  assert.equal(seoulTrack({ mode: 'race', racing: true, course: 'inwangsan' }), 'kick-downhill');
  assert.equal(seoulTrack({ mode: 'race', menu: true, course: 'mullae' }), 'kick-lobby');
  assert.equal(seoulTrack({ mode: 'race', racing: true, podium: true, course: 'mullae' }), 'kick-podium');
  assert.equal(seoulTrack({ mode: 'drive', night: true }), 'city-night');
  assert.equal(seoulTrack({ mode: 'drive', night: false }), null);
  assert.equal(seoulTrack({ mode: 'fly', night: true }), null);
});

test('every game\'s tracks exist and every mapping lands on one of them', () => {
  for (const [game, ids] of Object.entries(GAME_TRACKS)) for (const id of ids) assert.ok(TRACK_TITLES[id], `${game}: ${id}`);
  const has = (game, id) => assert.ok(GAME_TRACKS[game].includes(id), `${game} lists ${id}`);
  for (const area of ['village', 'gate', 'gloamwood', 'overlook', 'ledge']) for (const g of [0, 1]) has('gloamreach', gloamreachTrack({ area, x: 0, z: 0, gloam: g }));
  for (const realm of ['lanternwood', 'sunmeadow', 'frostpeak', 'emberfall']) has('lanternwood', lanternwoodTrack({ realm, area: 'camp' }));
  for (const v of [true, false]) for (const d of [true, false]) has('kithvale', kithvaleTrack({ village: v, dusk: d }));
  has('seoul', seoulTrack({ mode: 'race' }));
  for (const [course, id] of Object.entries(KICKRANI_COURSE_TRACKS)) {
    assert.equal(seoulTrack({ mode: 'race', racing: true, course }), id);
    has('seoul', id);
  }
  // every Kickrani course has a track of its own
  for (const id of BIKE_COURSES.map((c) => c.id)) assert.ok(KICKRANI_COURSE_TRACKS[id], `a track for ${id}`);
  has('seoul', seoulTrack({ menu: true }));
  has('seoul', seoulTrack({ podium: true }));
  for (const zone of ['base-camp', 'veilfall-reach', 'hollow-heights']) for (const hunting of [true, false]) has('wyldhunt', wyldhuntTrack({ zone, hunting }));
});

test('credits: ACE-Step 1.5, MIT, the link, and the titles a game uses', () => {
  const p = gameMusicPack('wyldhunt');
  assert.equal(p.name, 'ACE-Step 1.5');
  assert.equal(p.licence, 'MIT');
  assert.equal(p.site, MUSIC_CREDIT.url);
  assert.equal(p.licenceUrl, MUSIC_CREDIT.licenceUrl);
  assert.match(p.what, /Over the Falls, The Gorge Hunt, The Warm Hearth, Crown of Cinders/);
  assert.ok(!('items' in p), 'no item list (the Credits panels link items by url)');
  assert.deepEqual(musicPack(['title']).titles, ['First Light']);
});

test('the titles match the shipped manifest', { skip: !existsSync(MANIFEST) }, () => {
  const m = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  assert.equal(m.tracks.length, Object.keys(TRACK_TITLES).length);
  for (const t of m.tracks) assert.equal(TRACK_TITLES[t.id], t.title, t.id);
  // The pairs the games lean on.
  const pair = (a) => m.tracks.find((t) => t.id === a).pair;
  assert.equal(pair('meadow'), 'battle');
  assert.equal(pair('jungle'), 'jungle-hunt');
  assert.equal(pair('frozen-fortress'), 'boss');
});

test('each game\'s Credits data carries the music entry', async () => {
  for (const g of ['gloamreach', 'wyldhunt', 'kithvale', 'kindlewatch', 'snowpuff']) {
    const { PACKS } = await import(`../../src/${g}/credits.js`);
    const e = PACKS.find((p) => p.name === 'ACE-Step 1.5');
    assert.ok(e, g);
    assert.equal(e.licence, 'MIT');
  }
  const { CREDITS } = await import('../../src/arcademia/credits.js');
  assert.ok(CREDITS.some((c) => c.name === 'ACE-Step 1.5' && c.license === 'MIT' && c.what === 'credits.music'));
});
