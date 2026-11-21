import { existsSync, readFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { base, boot, tally, until } from './lib.mjs';

/**
 * AI Arcademia's voice studio, end to end, with Chromium's fake microphone:
 * a new actor agrees to the consent text, records a line (count-in, level
 * meter), keeps a take; the file and the manifest appear in the test
 * server's own VOICE_DIR (never the repo); then the game plays that line —
 * the speaker's mouth moves, the bubble lights up and the music ducks — and
 * the Credits panel lists the actor under Voices. The recording wins over
 * the character's generated voice; the generated voices (public/audio/voice-gen)
 * play in all five languages, with the mouth moving, where nobody recorded.
 * The studio shows which lines have a recording, a generated take or nothing.
 *
 * Only against the test server run.mjs starts (it sets E2E_VOICE_DIR): a dev
 * server would write into public/audio/voice. VOICE_SHOTS=<dir> saves screenshots.
 */
export async function run(_browser) {
  const t = tally();
  const voiceDir = process.env.E2E_VOICE_DIR;
  if (!voiceDir) {
    console.log('  – skipped: only against run.mjs’s own server (it points VOICE_DIR at a scratch folder)');
    return t;
  }
  const shots = process.env.VOICE_SHOTS || null;
  if (shots) await mkdir(shots, { recursive: true });
  const shot = (page, name) => shots && page.screenshot({ path: join(shots, `${name}.png`) });
  const args = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--ignore-gpu-blocklist'];
  if (process.platform === 'darwin') args.push('--use-angle=metal');
  const browser = await chromium.launch({ args });
  const errors = [];
  try {
    /* ---- the studio ---- */
    const studio = await browser.newContext({ viewport: { width: 1360, height: 860 }, httpCredentials: { username: 'siteadmin', password: 'test-admin-pass' } });
    await studio.grantPermissions(['microphone']);
    const page = await studio.newPage();
    page.on('pageerror', (e) => errors.push(`studio: ${e.message}`));
    page.on('dialog', (d) => d.accept());
    // Without the admin, the page itself is refused.
    const anon = await browser.newContext();
    const refused = await (await anon.newPage()).goto(`${base()}voice-studio.html`);
    t.check('studio: refused without the admin id and password', refused.status() === 401, `status ${refused.status()}`);
    await anon.close();
    await page.goto(`${base()}voice-studio.html`, { waitUntil: 'load' });
    // It opens in listening mode (no actor needed to hear the voices); adding an actor asks for consent first.
    t.check('studio: opens in listening mode', await until(page, () => document.querySelector('[data-actor]')?.value === '' || Boolean(document.querySelector('[data-listen-play]')) || Boolean(document.querySelector('[data-new-actor]')), null, 20000));
    await page.click('[data-new-actor]');
    t.check('studio: a new actor is asked for consent first', await until(page, () => Boolean(document.querySelector('[data-consent-panel]')), null, 20000));
    await page.fill('[data-actor-name]', 'Robin Test-Voice');
    for (const c of ['tock', 'buddy-fox']) await page.check(`[data-char-pick="${c}"]`);
    await page.check('[data-lang-pick="en"]');
    t.check('studio: Save stays off until they agree', await page.isDisabled('[data-save-actor]'));
    await page.check('[data-consent-box]');
    await shot(page, '1-consent');
    await page.click('[data-save-actor]');
    t.check('studio: the actor is added with their consent date', await until(page, () => Boolean(document.querySelector('[data-consent]')?.textContent.includes('Consent')), null, 10000));
    // Tock in English: the first line is the greeting (barks first).
    await page.selectOption('[data-char]', 'tock');
    await until(page, () => document.querySelector('[data-line]')?.dataset.line === 't.lesson.hello.history', null, 5000);
    t.check('studio: the teleprompter shows the line, its direction and context', await page.evaluate(() => {
      const p = document.querySelector('[data-prompter]');
      return p && p.querySelector('[data-line]').textContent.length > 10 && p.querySelector('.vs-direction').textContent.includes('Direction') && p.querySelector('.vs-context').textContent.length > 10;
    }));
    await shot(page, '2-teleprompter');
    // A line with only a generated take says so, and the take plays for reference; then back to the greeting.
    const tlStatus = await page.evaluate(() => document.querySelector('.vs-lines li [title^="t.lesson.tlSay"]')?.closest('li')?.dataset.status ?? null);
    await page.click('.vs-lines li [title^="t.lesson.tlSay"]');
    await until(page, () => document.querySelector('[data-line]')?.dataset.line === 't.lesson.tlSay', null, 5000);
    const genStatus = await page.evaluate(() => ({
      take: Boolean(document.querySelector('[data-generated-take] [data-play-generated]')),
      chip: Boolean(document.querySelector('[data-prompter] [data-generated]'))
    }));
    t.check('studio: a line with only a generated voice is marked, and its generated take can be played', tlStatus === 'generated' && genStatus.take && genStatus.chip, JSON.stringify({ tlStatus, ...genStatus }));
    await page.click('.vs-lines li [title^="t.lesson.hello.history"]');
    await until(page, () => document.querySelector('[data-line]')?.dataset.line === 't.lesson.hello.history', null, 5000);

    // Record: Space → 3-2-1 → recording with a live meter → Space stops.
    const record = async (seconds, name = null) => {
      await page.evaluate(() => (window.voiceStudio.meter = null));
      await page.keyboard.press('Space');
      const live = await until(page, () => window.voiceStudio.rec?.phase === 'recording', null, 6000);
      await page.waitForTimeout(700);
      // Catch the meter on a loud moment for the picture (the fake microphone beeps).
      if (name) await until(page, () => window.voiceStudio.meter?.peak > -20, null, 1500);
      const meter = await page.evaluate(() => ({ ...window.voiceStudio.meter, ctx: window.voiceStudio.ctx?.state, live: document.querySelector('.vs-meter').classList.contains('is-live') }));
      if (name) await shot(page, name);
      await page.waitForTimeout(seconds * 1000 - 700);
      await page.keyboard.press('Space');
      return { live, meter };
    };
    const first = await record(2.6, '3-recording-level-meter');
    t.check('studio: Space counts in 3-2-1, then records', first.live);
    t.check('studio: the level meter moves while recording', first.meter.live && first.meter.max > -60, JSON.stringify(first.meter));
    t.check('studio: the take is processed and listed', await until(page, () => document.querySelectorAll('[data-take]').length === 1, null, 10000));
    await page.keyboard.press('r');
    await until(page, () => window.voiceStudio.rec?.phase === 'recording', null, 6000);
    await page.waitForTimeout(2400);
    await page.keyboard.press('Space');
    t.check('studio: a retake adds a second take', await until(page, () => document.querySelectorAll('[data-take]').length === 2, null, 10000));
    const stats = await page.evaluate(() => {
      const list = [...window.voiceStudio.takes.values()][0].list;
      return list.map((x) => ({ lufs: x.stats.lufs, peak: x.stats.peakDb, d: x.stats.duration, w: x.warnings }));
    });
    // Chromium's fake microphone beeps (full-scale clicks that die away): the limiter holds the peaks and
    // the take says so ('limited') when that keeps it under −18 LUFS; a voice reaches the target.
    t.check('studio: takes are normalised toward −18 LUFS with peaks ≤ −1 dB (or say why not)', stats.every((s) => s.peak <= -0.95 && s.d > 0.3 && (Math.abs(s.lufs + 18) < 1 || s.w.includes('limited'))), JSON.stringify(stats));
    await shot(page, '4-takes');
    // Keep (Enter): encoded and uploaded; the file and the manifest appear in the scratch VOICE_DIR.
    await page.keyboard.press('Enter');
    const saved = await until(page, () => window.voiceStudio.uploads.length > 0 && window.voiceStudio.uploads.every((u) => u.state === 'done'), null, 30000);
    t.check('studio: Enter keeps the take and saves it', saved, await page.evaluate(() => JSON.stringify(window.voiceStudio.uploads.map((u) => [u.state, u.error]))));
    const file = join(voiceDir, 'en', 'tock', 't.lesson.hello.history.webm');
    t.check('studio: the recording is written as Opus in WebM, inside VOICE_DIR', existsSync(file) && readFileSync(file).subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])), file);
    let manifest = null;
    try {
      manifest = JSON.parse(readFileSync(join(voiceDir, 'manifest.json'), 'utf8'));
    } catch {
      /* checked below */
    }
    const entry = manifest?.lines?.en?.tock?.['t.lesson.hello.history'];
    t.check('studio: the manifest lists it (file, duration, actor, take date) and credits the actor', entry && entry.files.webm === 'en/tock/t.lesson.hello.history.webm' && entry.duration > 0.3 && manifest.actors[entry.actor]?.name === 'Robin Test-Voice' && Date.parse(entry.take) > 0, JSON.stringify(entry));
    t.check('studio: progress counts it', await page.evaluate(() => /\b1 \/ \d+/.test(document.querySelector('[data-progress]').textContent)));
    await page.selectOption('[data-show]', 'missing');
    t.check('studio: the "missing only" filter hides it', await page.evaluate(() => document.querySelector('[data-line]')?.dataset.line !== 't.lesson.hello.history'));
    await page.selectOption('[data-show]', 'all');
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, '5-progress');
    await studio.close();

    /* ---- the game plays it ---- */
    const game = await boot(browser, 'voice-game', { view: 'home' });
    const g = game.page;
    await g.route(/\/api\/games\/[^/]+\/play/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await g.click('.home [data-game="official:arcademia"]');
    await g.waitForSelector('.home [data-play]');
    await g.click('.home [data-play]');
    await until(g, () => window.arcademia?.mode === 'world', null, 240000);
    await until(g, () => Boolean(document.querySelector('.arc-start__play')), null, 30000);
    await g.click('.arc-start__play');
    const buddy = await g.waitForSelector('.arc-side--buddy .arc-btn--primary', { timeout: 15000 }).catch(() => null);
    if (buddy) await buddy.click();
    await g.waitForTimeout(800);
    t.check('game: English has recordings, so the voice is available', await until(g, () => window.arcademia.speech.available, null, 10000));
    await g.evaluate(() => window.arcademia.enter('history', 1));
    await until(g, () => Boolean(window.arcademia.lesson?.room?.tock), null, 20000);
    // The lobby greeting is the recorded line; say it again to watch it from the start.
    await g.waitForTimeout(600);
    const sampled = await g.evaluate(async () => {
      const a = window.arcademia, r = a.lesson;
      a.speech.stop();
      const playing = r.say(document.querySelector('.arc-say__text')?.textContent ?? '', { line: 't.lesson.hello.history' });
      void playing;
      const out = { mouths: new Set(), speaking: false, bubble: false, duck: 1, voiceDuck: 1, line: null, char: null, peak: 0 };
      const t0 = performance.now();
      while (performance.now() - t0 < 4000) {
        await new Promise((res) => requestAnimationFrame(res));
        const st = a.speech.state;
        if (st.speaking) {
          out.speaking = true;
          out.line = st.line;
          out.char = st.char;
          out.peak = Math.max(out.peak, st.peakLevel);
          out.mouths.add(r.room.tock.face.mouth);
          out.bubble ||= document.querySelector('.arc-say').classList.contains('is-speaking');
          const m = a.music.state;
          out.duck = Math.min(out.duck, m.duck ?? 1);
          out.voiceDuck = Math.min(out.voiceDuck, m.voiceDuck);
        } else if (out.speaking) break;
      }
      return { ...out, mouths: [...out.mouths], lipFrames: r.room.tock.state.lipFrames, voiceBtn: !r.voiceBtn.hidden, source: a.speech.state.source };
    });
    t.check('game: the recorded line plays for Tock, by its line id — the person’s take, not the generated one', sampled.speaking && sampled.line === 't.lesson.hello.history' && sampled.char === 'tock' && sampled.source === 'human', JSON.stringify(sampled));
    t.check('game: Tock’s mouth moves with the voice (lip-sync)', sampled.lipFrames > 0 && sampled.mouths.some((m) => m === 'open' || m === 'oh') && sampled.mouths.length >= 2, JSON.stringify(sampled.mouths));
    t.check('game: the speech bubble lights up while it plays', sampled.bubble);
    t.check('game: the music ducks under the voice', sampled.voiceDuck < 1 && (sampled.duck == null || sampled.duck < 0.95), `voiceDuck ${sampled.voiceDuck}, duck ${sampled.duck}`);
    t.check('game: "Voice on" shows now that there are recordings', sampled.voiceBtn);
    t.check('game: after the line the music comes back up', await until(g, () => window.arcademia.music.state.voiceDuck === 1, null, 6000));
    // A screenshot mid-line.
    await g.evaluate(() => window.arcademia.lesson.say(document.querySelector('.arc-say__text').textContent, { line: 't.lesson.hello.history' }));
    await until(g, () => window.arcademia.speech.state.speaking, null, 3000);
    await g.waitForTimeout(500);
    await game.page.screenshot({ path: shots ? join(shots, '6-game-playing-recorded-line.png') : undefined });
    // Generated voices: a bark nobody recorded plays in each of the five languages, Tock's mouth moving with it.
    const generated = await g.evaluate(async () => {
      const a = window.arcademia, r = a.lesson;
      const out = {};
      for (const lang of ['en', 'ko', 'es', 'ja', 'zh']) {
        a.speech.stop();
        const before = r.room.tock.state.lipFrames;
        const mouths = new Set();
        let source = null, speaking = false, peak = 0;
        const done = a.speech.say('t.lesson.tlSay', { char: 'tock', lang, face: r.room.tock });
        const t0 = performance.now();
        while (performance.now() - t0 < 8000) {
          await new Promise((res) => requestAnimationFrame(res));
          const st = a.speech.state;
          if (st.speaking) {
            speaking = true;
            source = st.source;
            peak = Math.max(peak, st.peakLevel);
            mouths.add(r.room.tock.face.mouth);
          } else if (speaking) break;
        }
        out[lang] = { played: await done, speaking, source, peak, mouths: [...mouths], lipFrames: r.room.tock.state.lipFrames - before };
      }
      return out;
    });
    for (const lang of ['en', 'ko', 'es', 'ja', 'zh']) {
      const x = generated[lang];
      t.check(`game: a generated bark plays in ${lang}, with Tock's mouth moving`, x.played && x.source === 'generated' && x.peak > 0.2 && x.lipFrames > 0 && x.mouths.some((m) => m === 'open' || m === 'oh') && x.mouths.length >= 2, JSON.stringify(x));
    }
    // With neither a recording nor a generated take: silence, nothing else.
    const silent = await g.evaluate(async () => {
      const a = window.arcademia;
      a.speech.stop();
      const other = await a.speech.say('t.lesson.hello.history', { char: 'hoot' });
      const german = await a.speech.say('t.lesson.hello.history', { char: 'tock', lang: 'de' });
      const unknown = await a.speech.say('t.no.such.line', { char: 'tock' });
      return [other, german, unknown];
    });
    t.check('game: another character’s line, a language with no voices and an unknown line stay silent', silent.every((x) => x === false), JSON.stringify(silent));
    // The Credits panel names the actor under Voices.
    await g.evaluate(() => window.arcademia.leaveLesson());
    await g.waitForTimeout(800);
    await g.click('.arc-chip--settings');
    await g.click('.arc-modal--settings >> text=📜 Credits');
    t.check('game: Credits lists the voice actor and the character they voiced', await until(g, () => {
      const v = document.querySelector('[data-voices]');
      return v && v.textContent.includes('Robin Test-Voice') && v.textContent.includes('Tock');
    }, null, 6000));
    t.check('game: Credits credits the generated voices: the model, its licence and link', await g.evaluate(() => {
      const li = document.querySelector('[data-voices-generated]');
      return Boolean(li && li.textContent.includes('Qwen3-TTS') && li.textContent.includes('Apache-2.0') && li.querySelector('a')?.href === 'https://github.com/QwenLM/Qwen3-TTS');
    }));
    await g.evaluate(() => {
      document.querySelector('.arc-modal--settings')?.remove();
      document.querySelector('[data-voices]').scrollIntoView();
    });
    await g.waitForTimeout(900);
    await shot(g, '7-credits-voices');
    errors.push(...game.errors);
    await game.context.close();
  } finally {
    await browser.close();
  }
  t.check('no page errors', !errors.length, errors.join(' | '));
  return t;
}
