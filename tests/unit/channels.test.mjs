import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GamesStore } from '../../server/gamesStore.js';
import { ChannelStore, BADGES, badgesOf, DONE_SECONDS } from '../../server/channelStore.js';
import { compileGame } from '../../src/blueprints/index.js';
import { testDatabase } from './db.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
const levelFiles = {
  sameDir: false,
  index: async () => ({ campaign: JSON.parse(await readFile(join(ROOT, 'public/levels/index.json'), 'utf8')).campaign.map((e) => ({ ...e, official: true })) }),
  readText: async (id) => readFile(join(ROOT, 'public/levels', `${id}.json`), 'utf8').catch(() => null)
};

async function world() {
  const db = await testDatabase();
  const clock = { t: 1_800_000_000_000 };
  const games = new GamesStore(db, levelFiles);
  const store = new ChannelStore(db, games, { now: () => clock.t });
  const account = async (name) => {
    await db.run('INSERT INTO accounts (name, name_key, pass_hash, created) VALUES (?, ?, ?, ?)', [name, name.toLowerCase(), 'x', clock.t]);
    return { id: (await db.one('SELECT id FROM accounts WHERE name_key = ?', [name.toLowerCase()])).id, name };
  };
  const publish = async (who, title, status = 'shared') => {
    const { spec, levels } = compileGame({ genre: 'quest', world: 'pirate-coast', name: title, chapters: 1 });
    return games.publish({ title, levels, spec, status }, who);
  };
  return { db, clock, games, store, account, publish };
}

test('channels: made on first use with a free handle; renamed; handles are unique', async () => {
  const w = await world();
  try {
    const kim = await w.account('Kim Maker');
    const lee = await w.account('Kim-Maker');
    const a = await w.store.ensure(kim);
    const b = await w.store.ensure(lee);
    assert.equal(a.handle, 'kim-maker');
    assert.notEqual(b.handle, a.handle);
    assert.equal((await w.store.ensure(kim)).handle, 'kim-maker', 'the same one the second time');
    const c = await w.store.update(kim, { name: 'Kim’s Lab', about: 'Maths games', handle: '@kimlab', color: 'ember' });
    assert.deepEqual([c.name, c.handle, c.color, c.about], ['Kim’s Lab', 'kimlab', 'ember', 'Maths games']);
    await assert.rejects(w.store.update(lee, { handle: 'kimlab' }), /taken/);
    await assert.rejects(w.store.update(lee, { handle: 'me' }), /handle/);
    await assert.rejects(w.store.update(lee, { handle: 'a b' }), /handle/);
  } finally {
    await w.db.close();
  }
});

test('channels: private games and a private channel are for the owner and the private link only', async () => {
  const w = await world();
  try {
    const kim = await w.account('Kim');
    const guest = await w.account('Guest');
    const open = await w.publish(kim, 'Open Seas');
    const secret = await w.publish(kim, 'Secret Cove', 'draft');
    const mine = await w.store.view('kim', { account: kim }) ?? (await w.store.ensure(kim), await w.store.view('kim', { account: kim }));
    assert.deepEqual(mine.games.map((g) => [g.id, g.visibility]).sort(), [[open.id, 'public'], [secret.id, 'private']].sort());
    assert.ok(mine.owner && mine.key);
    const seen = await w.store.view('kim', { account: guest });
    assert.deepEqual(seen.games.map((g) => g.id), [open.id]);
    assert.equal(seen.key, undefined, 'the key is the owner’s alone');
    const invited = await w.store.view('kim', { key: mine.key });
    assert.equal(invited.games.length, 2);
    assert.equal(invited.invited, true);
    // Make the game public, the channel private.
    await w.store.setGameVisibility(kim, secret.id, 'public');
    await assert.rejects(w.store.setGameVisibility(guest, secret.id, 'private'), /Only the player/);
    await w.store.update(kim, { visibility: 'private' });
    assert.equal(await w.store.view('kim', { account: guest }), null);
    assert.equal((await w.store.view('kim', { key: mine.key })).games.length, 2);
    assert.equal((await w.store.list()).length, 0, 'a private channel is not listed');
    // A new key: the old link stops working.
    const next = await w.store.newKey(kim);
    assert.notEqual(next.key, mine.key);
    assert.equal(await w.store.view('kim', { key: mine.key }), null);
  } finally {
    await w.db.close();
  }
});

test('playlists: ordered, official and own games together; private ones hidden from visitors', async () => {
  const w = await world();
  try {
    const kim = await w.account('Kim');
    const g1 = await w.publish(kim, 'Chapter One');
    const g2 = await w.publish(kim, 'Chapter Two', 'draft');
    const id = await w.store.savePlaylist(kim, { title: 'Pirate course', summary: 'Start here', items: [g1.id, 'official:study-grove', g2.id, 'g-nope-00000000', 'bad id', g1.id] });
    await w.store.savePlaylist(kim, { title: 'Hidden list', visibility: 'private', items: [g1.id] });
    const mine = await w.store.view('kim', { account: kim });
    assert.equal(mine.playlists.length, 2);
    assert.deepEqual(mine.playlists[0].games.map((g) => g.id), [g1.id, 'official:study-grove', g2.id], 'in order, no doubles, nothing unknown');
    const seen = await w.store.view('kim', {});
    assert.equal(seen.playlists.length, 1);
    assert.deepEqual(seen.playlists[0].games.map((g) => g.id), [g1.id, 'official:study-grove'], 'the private game is left out');
    await w.store.savePlaylist(kim, { title: 'Pirate course, part 1', items: ['official:study-grove', g1.id] }, id);
    const again = await w.store.view('kim', { account: kim });
    assert.equal(again.playlists[0].title, 'Pirate course, part 1');
    assert.deepEqual(again.playlists[0].games.map((g) => g.id), ['official:study-grove', g1.id]);
    const other = await w.account('Other');
    await assert.rejects(w.store.savePlaylist(other, { title: 'x' }, id), /No such playlist/);
    assert.equal(await w.store.removePlaylist(other, id), false);
    assert.equal(await w.store.removePlaylist(kim, id), true);
  } finally {
    await w.db.close();
  }
});

test('progress: time adds up but never faster than the clock; done by mark or by time; badges follow', async () => {
  const w = await world();
  try {
    const kim = await w.account('Kim');
    await w.store.ensure(kim);
    const g = 'official:study-grove';
    let p = await w.store.addProgress(kim, { game: g, seconds: 60, start: true });
    assert.equal(p.seconds, 5, 'the first beat cannot claim a minute');
    p = await w.store.addProgress(kim, { game: g, seconds: 60 });
    assert.equal(p.seconds, 10, 'no time has gone by');
    for (let i = 0; i < 5; i++) {
      w.clock.t += 60_000;
      p = await w.store.addProgress(kim, { game: g, seconds: 60 });
    }
    assert.equal(p.seconds, 310);
    assert.equal(p.done, true, `done after ${DONE_SECONDS} s`);
    w.clock.t += 600_000;
    p = await w.store.addProgress(kim, { game: g, seconds: 9999 });
    assert.equal(p.seconds, 400, 'at most 90 s a beat');
    await w.store.setDone(kim, 'official:lanebreak', true);
    await assert.rejects(w.store.addProgress(kim, { game: 'nope', seconds: 5 }), /No such game/);
    const stats = await w.store.stats(kim.id);
    assert.deepEqual([stats.seconds, stats.games, stats.done], [400, 2, 2]);
    // A playlist of those two: finished.
    await w.store.savePlaylist(kim, { title: 'Both', items: [g, 'official:lanebreak', 'official:shardfront'].slice(0, 2) });
    const badges = badgesOf(await w.store.stats(kim.id));
    assert.equal(badges.length, BADGES.length);
    const earned = badges.filter((b) => b.earned).map((b) => b.id);
    assert.deepEqual(earned.sort(), ['first-play', 'graduate'].sort());
    assert.equal(badges.find((b) => b.id === 'hour').have, 400);
  } finally {
    await w.db.close();
  }
});

test('mistakes found: reported by players, answered by the maker, counted for the finder', async () => {
  const w = await world();
  try {
    const kim = await w.account('Kim');
    const eye = await w.account('Eye');
    const game = await w.publish(kim, 'Quiz Bay');
    await assert.rejects(w.store.report(eye, { game: game.id, note: 'bad' }), /Say what is wrong/);
    await assert.rejects(w.store.report(kim, { game: game.id, note: 'The answer to question 2 is wrong' }), /your own game/);
    await w.store.report(eye, { game: game.id, note: 'Question 2 says 7 × 8 = 54; it is 56.', place: 'Chapter 1' });
    await assert.rejects(w.store.report(eye, { game: game.id, note: 'Question 2 says 7 × 8 = 54; it is 56.' }), /already/);
    await w.store.report(eye, { game: game.id, note: 'The map says north but the arrow points south.' });
    await w.store.report(eye, { game: 'official:study-grove', note: 'A sign has a spelling mistake: "wich".' });
    const inbox = (await w.store.reports(kim)).inbox;
    assert.equal(inbox.length, 2);
    assert.equal(inbox[0].by, 'Eye');
    await assert.rejects(w.store.review(eye, inbox[0].id, 'confirmed'), /Only the maker/);
    await w.store.review(kim, inbox[0].id, 'confirmed');
    await w.store.review(kim, inbox[1].id, 'dismissed');
    const stats = await w.store.stats(eye.id);
    assert.deepEqual([stats.found, stats.confirmed], [2, 1], 'dismissed ones do not count');
    assert.ok(badgesOf(stats).find((b) => b.id === 'sharp-eye').earned);
    assert.equal((await w.store.reports(eye)).mine.length, 3);
  } finally {
    await w.db.close();
  }
});
