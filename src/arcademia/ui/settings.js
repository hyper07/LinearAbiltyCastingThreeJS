/**
 * The start screen, the settings panel and the credits panel.
 *
 *   start screen  the title, a big Play button, the five languages, Credits
 *   settings      language, sound, day or night, big text, Parents, Credits
 *   credits       every free asset the game uses, with its website and licence
 *
 * Changing the language calls game.setLanguage(id), which loads it, saves it
 * and redraws what is on screen.
 */
import { cameraMenu } from '../../shared/cameraAssist.js';
import { musicMenu } from '../../shared/gameMusic.js';
import { el, button } from './dom.js';
import { LOCALES, locale, t } from '../i18n/index.js';
import { CREDITS, generatedVoiceCredit, voiceCreditRows } from '../credits.js';
import { speech } from '../sound.js';

/** A row of language buttons, each in its own language. */
export function languagePicker(game, { onPick = null } = {}) {
  const box = el('div', 'arc-langs', null, { role: 'radiogroup', 'aria-label': t('settings.language') });
  for (const l of LOCALES) {
    const on = l.id === locale();
    const b = button(`arc-lang${on ? ' is-on' : ''}`, l.name, async () => {
      if (l.id === locale()) return;
      for (const x of box.children) x.disabled = true;
      await game.setLanguage(l.id);
      onPick?.(l.id);
    }, { role: 'radio', 'aria-checked': String(on), lang: l.id });
    box.append(b);
  }
  return box;
}

/** The credits: what, who, the website and the licence. */
export function openCredits(game) {
  const box = el('div', 'arc-modal arc-modal--credits', null, { role: 'dialog', 'aria-modal': 'true', 'aria-label': t('credits.title') });
  const card = el('div', 'arc-modal__card arc-credits');
  const close = () => box.remove();
  card.append(button('arc-boss__x', '✕', close, { 'aria-label': t('settings.close') }), el('h2', null, t('credits.title')), el('p', 'arc-credits__lead', t('credits.lead')));
  const list = el('ul', 'arc-credits__list');
  for (const c of CREDITS) {
    const li = el('li');
    const a = el('a', null, c.name, { href: c.url, target: '_blank', rel: 'noopener noreferrer' });
    li.append(el('strong', null, null), el('span', 'arc-credits__what', t(c.what)), el('span', 'arc-credits__meta', `${c.by !== '—' ? `${c.by} · ` : ''}${c.license}`));
    li.firstChild.append(a);
    list.append(li);
  }
  card.append(list);
  // Voices: the generated character voices (the model, its licence and link), and the real
  // people who recorded lines, by the name each chose (from the recordings' manifest).
  const voices = el('section', 'arc-credits__voices', null, { 'data-voices': '' });
  const drawVoices = () => {
    const rows = voiceCreditRows(speech.manifest, locale());
    const gen = generatedVoiceCredit(speech.generated);
    voices.replaceChildren();
    if (!rows.length && !gen) return;
    voices.append(el('h3', null, `🎙️ ${t('credits.voices')}`));
    if (gen) {
      const ul = el('ul', 'arc-credits__list');
      const li = el('li', null, null, { 'data-voices-generated': '' });
      li.append(el('strong', null, null), el('span', 'arc-credits__what', t('credits.voicesGen', { model: gen.name, licence: gen.licence })), el('span', 'arc-credits__meta', `${gen.by} · ${gen.licence}`));
      li.firstChild.append(el('a', null, gen.name, { href: gen.url, target: '_blank', rel: 'noopener noreferrer' }));
      ul.append(li);
      voices.append(ul);
    }
    if (rows.length) {
      const ul = el('ul', 'arc-credits__list');
      for (const r of rows) {
        const li = el('li');
        li.append(el('strong', null, r.name), el('span', 'arc-credits__what', r.characters), el('span', 'arc-credits__meta', r.languages));
        ul.append(li);
      }
      voices.append(el('p', 'arc-credits__lead', t('credits.voicesLead')), ul);
    }
  };
  drawVoices();
  speech.load().then(() => box.isConnected && drawVoices());
  card.append(voices, el('p', 'arc-credits__note', t('credits.made')));
  box.append(card);
  box.addEventListener('click', (e) => e.target === box && close());
  box.addEventListener('keydown', (e) => e.key === 'Escape' && (e.stopPropagation(), close()));
  game.root.append(box);
  card.querySelector('button').focus();
  return box;
}

/** Settings: language, sound, day/night, big text, Parents, Credits. */
export function openSettings(game) {
  game.root.querySelector('.arc-modal--settings')?.remove();
  const box = el('div', 'arc-modal arc-modal--settings', null, { role: 'dialog', 'aria-modal': 'true', 'aria-label': t('settings.title') });
  const card = el('div', 'arc-modal__card arc-settings');
  const close = () => box.remove();
  const draw = () => {
    card.replaceChildren();
    card.append(button('arc-boss__x', '✕', close, { 'aria-label': t('settings.close') }), el('h2', null, `⚙️ ${t('settings.title')}`));
    const sec = (title) => {
      const s = el('section', 'arc-settings__sec');
      s.append(el('h3', null, title));
      card.append(s);
      return s;
    };
    sec(`🌐 ${t('settings.language')}`).append(languagePicker(game, { onPick: draw }));
    const toggles = el('div', 'arc-settings__toggles');
    const tog = (label, on, fn) => {
      const b = button(`arc-toggle${on ? ' is-on' : ''}`, label, () => {
        fn();
        draw();
      }, { 'aria-pressed': String(on) });
      toggles.append(b);
    };
    tog(t(game.prefs.sound ? 'settings.soundOn' : 'settings.soundOff'), game.prefs.sound, () => game.setSound(!game.prefs.sound));
    tog(t(game.prefs.night ? 'hud.night' : 'hud.day'), game.prefs.night, () => game.setNight(!game.prefs.night));
    tog(t('settings.bigText'), game.prefs.bigText, () => game.setBigText(!game.prefs.bigText));
    sec(`🎛️ ${t('settings.play')}`).append(toggles);
    // Graphics: presets (Quiet keeps a laptop cool), and an Advanced fold — frame cap, shadows, the night glow.
    if (game.power) {
      const text = {};
      for (const k of ['title', 'quiet', 'balanced', 'high', 'ultra', 'custom', 'hint', 'advanced', 'fps', 'unlimited', 'shadows', 'effects', 'bloom', 'showFps', 'off', 'near', 'full']) text[k] = t(`gfx.${k}`);
      card.append(game.power.menu(text));
      // Music: on/off, its volume, the song-name toast (shared/gameMusic.js), saved for every game.
      card.append(musicMenu({ text: { title: t('music.title'), on: t('music.on'), off: t('music.off'), volume: t('music.volume'), names: t('music.names') } }));
      // Camera: Auto camera, its delay, the turning speed (shared/cameraAssist.js).
      if (game.world?.camAssist) {
        const ct = {};
        for (const k of ['title', 'auto', 'on', 'off', 'delay', 'seconds', 'speed', 'keys']) ct[k] = t(`cam.${k}`);
        card.append(cameraMenu(game.world.camAssist, { text: ct }));
      }
    }
    const more = el('div', 'arc-row arc-settings__more');
    more.append(
      button('arc-btn', t('hud.parents'), () => {
        close();
        game.openParents();
      }),
      button('arc-btn', `❔ ${t('help.title')}`, () => {
        close();
        game.openHelp();
      }),
      button('arc-btn', t('credits.button'), () => openCredits(game))
    );
    card.append(more);
    card.querySelector('.arc-lang.is-on, button')?.focus();
  };
  draw();
  box.addEventListener('click', (e) => e.target === box && close());
  box.addEventListener('keydown', (e) => e.key === 'Escape' && (e.stopPropagation(), close()));
  box.append(card);
  game.root.append(box);
  return box;
}

/** The start screen. Resolves when Play is pressed. */
export function startScreen(game) {
  return new Promise((resolve) => {
    const box = el('div', 'arc-start', null, { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'AI Arcademia' });
    const card = el('div', 'arc-start__card');
    const draw = () => {
      card.replaceChildren();
      const h = el('h1', 'arc-start__title');
      h.append(el('span', 'arc-brand__ai', 'AI '), document.createTextNode('ARCADEMIA'));
      card.append(el('div', 'arc-start__owl', '🦉', { 'aria-hidden': 'true' }), h, el('p', 'arc-start__tag', t('start.tagline')));
      const play = button('arc-btn arc-btn--primary arc-btn--big arc-start__play', t('start.play'), () => {
        box.classList.add('is-out');
        setTimeout(() => box.remove(), 350);
        game.sound.wake();
        game.sound.tap();
        resolve();
      });
      card.append(play);
      card.append(el('p', 'arc-start__label', `🌐 ${t('settings.language')}`), languagePicker(game, { onPick: draw }));
      card.append(button('arc-btn arc-btn--ghost arc-start__credits', t('credits.button'), () => openCredits(game)));
      play.focus();
    };
    draw();
    box.append(card);
    game.root.append(box);
  });
}
