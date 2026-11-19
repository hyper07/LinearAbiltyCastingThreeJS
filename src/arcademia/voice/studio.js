/**
 * The voice studio (voice-studio.html): where real people record AI
 * Arcademia's lines. Admin only. No synthesized or AI voices: what is kept
 * here is a person's own recording, cleaned up with plain signal processing.
 *
 *   choose    a voice actor (their credited name, characters, languages),
 *             then a character and a language; a new actor agrees to the
 *             consent text first
 *   record    a teleprompter with the line, its direction and context;
 *             Space (or the button) starts a 3-2-1 count-in, then records
 *             (getUserMedia + MediaRecorder) with a level meter; Space stops
 *   takes     several per line: play, keep (Enter) or retake (R); each take
 *             is decoded to PCM and processed (dsp.js: high-pass, trim,
 *             optional gate, −18 LUFS with peaks ≤ −1 dBFS, fades), with
 *             warnings for clipping, a quiet or noisy take
 *   save      the kept take is encoded again from the processed PCM by the
 *             browser's own MediaRecorder — Opus in WebM, plus AAC in MP4
 *             where the browser can record it (Safari) — and uploaded to
 *             /api/voice (server/voiceStore.js), which writes
 *             public/audio/voice/<lang>/<char>/<line>.<ext> and the manifest
 *   progress  done / total per character and language, filters for what is
 *             missing; ← → move between lines
 */
import { LOCALES, LOCALE_IDS } from '../i18n/index.js';
import { registerAllLocales } from './locales.js';
import { buildScript, voiceCharacters, VOICE_KINDS } from './script.js';
import { FORMATS, recordingFor, progressOf, setRecording, removeRecording } from './manifest.js';
import { DEFAULT_OPTIONS, WARNING_TEXT, db as toDb, processTake, toMono } from './dsp.js';
import './studio.css';

registerAllLocales();

/* ---------------------------------------------------------------- tiny DOM */

function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'text') e.textContent = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c instanceof Node ? c : String(c));
  return e;
}
const fmtDb = (v) => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(1)}` : '−∞');
const store = {
  get(k, d = null) {
    try {
      const v = localStorage.getItem(`voiceStudio.${k}`);
      return v == null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(`voiceStudio.${k}`, JSON.stringify(v));
    } catch {
      /* private mode */
    }
  }
};

/* ---------------------------------------------------------------- state */

const S = {
  auth: (() => {
    try {
      return sessionStorage.getItem('voiceStudio.auth');
    } catch {
      return null;
    }
  })(),
  data: null,
  actor: store.get('actor'),
  char: store.get('char'),
  lang: store.get('lang', 'en'),
  show: store.get('show', 'all'),
  kind: store.get('kind', 'all'),
  floor: store.get('floor', 'all'),
  opts: { ...DEFAULT_OPTIONS, ...store.get('opts', {}) },
  beep: store.get('beep', true),
  i: 0,
  takes: new Map(), // lang/char/line → { list: [take], chosen: index }
  scripts: new Map(),
  rec: null, // { phase: 'count' | 'recording', recorder, chunks, started, timer }
  uploads: [],
  busy: false
};
/** For the end-to-end checks and the console. */
window.voiceStudio = S;

const root = document.getElementById('studio');
const script = (lang) => {
  if (!S.scripts.has(lang)) S.scripts.set(lang, buildScript(lang));
  return S.scripts.get(lang);
};
const chars = (lang = S.lang) => voiceCharacters(lang);
const charOf = (id, lang = S.lang) => chars(lang).find((c) => c.id === id);
const langName = (id) => LOCALES.find((l) => l.id === id)?.name ?? id;
const actor = () => S.data?.actors.find((a) => a.id === S.actor && !a.removedAt) ?? null;
const keyOf = (line) => `${S.lang}/${S.char}/${line.id}`;

/* ---------------------------------------------------------------- the server */

async function api(path, { method = 'GET', json, body, headers = {} } = {}) {
  const h2 = { ...headers };
  if (S.auth) h2.Authorization = `Basic ${S.auth}`;
  if (json !== undefined) {
    h2['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }
  const r = await fetch(`./api/voice${path}`, { method, headers: h2, body, credentials: 'same-origin' });
  const out = await r.json().catch(() => ({}));
  if (r.status === 401) {
    signIn(out.error);
    throw Object.assign(new Error(out.error ?? 'Sign in'), { status: 401 });
  }
  if (!r.ok) throw Object.assign(new Error(out.error ?? `HTTP ${r.status}`), { status: r.status });
  return out;
}

async function load() {
  S.data = await api('');
  const a = actor();
  if (!a) S.actor = S.data.actors.find((x) => !x.removedAt)?.id ?? null;
  fixChoice();
  draw();
  if (!S.data.actors.some((x) => !x.removedAt)) openActor(null);
}

/** Keep the character and language within what the actor voices. */
function fixChoice() {
  const a = actor();
  if (!a) return;
  if (!a.characters.includes(S.char)) S.char = a.characters[0];
  if (!a.languages.includes(S.lang)) S.lang = a.languages[0];
  store.set('actor', S.actor);
  store.set('char', S.char);
  store.set('lang', S.lang);
}

/* ---------------------------------------------------------------- sign in */

function signIn(why) {
  root.replaceChildren();
  const id = h('input', { name: 'id', autocomplete: 'username', required: true, 'aria-label': 'Admin id' });
  const pw = h('input', { name: 'pw', type: 'password', autocomplete: 'current-password', required: true, 'aria-label': 'Password' });
  const form = h('form', { class: 'vs-card vs-signin', onsubmit: (e) => {
    e.preventDefault();
    S.auth = btoa(unescape(encodeURIComponent(`${id.value.trim()}:${pw.value}`)));
    try {
      sessionStorage.setItem('voiceStudio.auth', S.auth);
    } catch {
      /* private mode */
    }
    load().catch((err) => err.status !== 401 && fail(err));
  } },
  h('h1', {}, '🎙️ Voice studio'),
  h('p', { class: 'vs-muted' }, why || 'For the site’s admins: sign in to record AI Arcademia’s voices.'),
  h('label', {}, 'Admin id', id), h('label', {}, 'Password', pw),
  h('button', { class: 'vs-btn vs-btn--primary', type: 'submit' }, 'Sign in'));
  root.append(form);
  id.focus();
}

function fail(err) {
  console.error(err);
  toast(`⚠️ ${err.message ?? err}`, 'bad');
}

let toastTimer = 0;
function toast(text, kind = '') {
  let t = document.querySelector('.vs-toast');
  if (!t) document.body.append((t = h('div', { class: 'vs-toast', role: 'status', 'aria-live': 'polite' })));
  t.className = `vs-toast is-on ${kind ? `is-${kind}` : ''}`;
  t.textContent = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 4000);
}

/* ---------------------------------------------------------------- the lines */

/** The current character's lines in this language, filtered. */
function lines() {
  const m = S.data?.manifest;
  return script(S.lang).filter((l) => {
    if (l.char !== S.char) return false;
    if (S.kind !== 'all' && l.kind !== S.kind) return false;
    if (S.floor !== 'all' && String(l.floor) !== String(S.floor)) return false;
    const done = Boolean(recordingFor(m, S.lang, S.char, l.id));
    if (S.show === 'missing' && done) return false;
    if (S.show === 'done' && !done) return false;
    return true;
  });
}

/* ---------------------------------------------------------------- the page */

let els = {};
function draw() {
  const a = actor();
  const list = lines();
  S.i = Math.max(0, Math.min(S.i, list.length - 1));
  root.replaceChildren();
  // Header.
  const head = h('header', { class: 'vs-head' },
    h('h1', {}, '🎙️ AI Arcademia · Voice studio'),
    h('span', { class: 'vs-muted' }, 'Real people’s voices only — no synthesized or AI voices.'),
    h('span', { class: 'vs-spacer' }),
    h('span', { class: 'vs-chip', title: 'Signed in as' }, `👤 ${S.data.admin}`),
    S.auth ? h('button', { class: 'vs-btn vs-btn--ghost', onclick: () => {
      try {
        sessionStorage.removeItem('voiceStudio.auth');
      } catch {
        /* private mode */
      }
      S.auth = null;
      signIn();
    } }, 'Sign out') : null);
  // Side: actor, character, language, filters, processing, progress, line list.
  const side = h('aside', { class: 'vs-side' });
  const actorSel = h('select', { 'aria-label': 'Voice actor', 'data-actor': '', onchange: (e) => {
    S.actor = e.target.value;
    S.i = 0;
    fixChoice();
    draw();
  } }, S.data.actors.filter((x) => !x.removedAt).map((x) => h('option', { value: x.id, selected: x.id === S.actor }, x.name)));
  side.append(h('section', { class: 'vs-card' },
    h('h2', {}, 'Voice actor'),
    a ? actorSel : h('p', { class: 'vs-muted' }, 'No voice actor yet.'),
    h('div', { class: 'vs-row' },
      h('button', { class: 'vs-btn', 'data-new-actor': '', onclick: () => openActor(null) }, '＋ New actor'),
      a ? h('button', { class: 'vs-btn', onclick: () => openActor(a) }, 'Edit') : null),
    a ? h('p', { class: 'vs-muted vs-small', 'data-consent': '' }, `Consent ${new Date(a.consent.at).toLocaleDateString()} (v${a.consent.version}, taken by ${a.consent.by}). Credited as “${a.name}”.`) : null,
    a ? h('button', { class: 'vs-btn vs-btn--danger vs-small', 'data-remove-actor': '', onclick: () => removeAll(a) }, 'Remove all my recordings') : null));
  if (!a) {
    root.append(head, h('main', { class: 'vs-main' }, side, h('section', { class: 'vs-card vs-empty' }, h('h2', {}, 'Add a voice actor to start'), h('p', {}, 'Each person who records agrees to the consent text first and chooses the name they are credited by.'))));
    return;
  }
  const charSel = h('select', { 'aria-label': 'Character', 'data-char': '', onchange: (e) => {
    S.char = e.target.value;
    S.i = 0;
    store.set('char', S.char);
    stopRecording(true);
    draw();
  } }, a.characters.map((id) => {
    const c = charOf(id);
    return h('option', { value: id, selected: id === S.char }, `${c?.emoji ?? ''} ${c?.name ?? id}`);
  }));
  const langSel = h('select', { 'aria-label': 'Language', 'data-lang': '', onchange: (e) => {
    S.lang = e.target.value;
    S.i = 0;
    store.set('lang', S.lang);
    stopRecording(true);
    draw();
  } }, a.languages.map((id) => h('option', { value: id, selected: id === S.lang }, langName(id))));
  const pick = (key, values, label) => h('select', { 'aria-label': label, [`data-${key}`]: '', onchange: (e) => {
    S[key] = e.target.value;
    store.set(key, S[key]);
    S.i = 0;
    draw();
  } }, values.map(([v, t]) => h('option', { value: v, selected: String(S[key]) === String(v) }, t)));
  const floors = [...new Set(script(S.lang).filter((l) => l.char === S.char).map((l) => l.floor))].sort((x, y) => x - y);
  const opt = (key, label, hint) => h('label', { class: 'vs-check', title: hint }, h('input', { type: 'checkbox', checked: S.opts[key], onchange: (e) => {
    S.opts[key] = e.target.checked;
    store.set('opts', S.opts);
    reprocess();
  } }), label);
  const all = script(S.lang);
  const prog = progressOf(S.data.manifest, all, S.lang, S.char);
  side.append(
    h('section', { class: 'vs-card' }, h('h2', {}, 'Character and language'), charSel, langSel,
      h('p', { class: 'vs-direction vs-small' }, charOf(S.char)?.direction ?? '')),
    h('section', { class: 'vs-card', 'data-progress': '' },
      h('h2', {}, 'Progress'),
      h('div', { class: 'vs-progress' }, h('i', { style: `--k:${prog.total ? prog.done / prog.total : 0}` })),
      h('p', {}, h('strong', {}, `${prog.done} / ${prog.total}`), ` lines · barks ${prog.barks.done} / ${prog.barks.total}`),
      progressTable(a)),
    h('section', { class: 'vs-card' }, h('h2', {}, 'Show'),
      pick('show', [['all', 'All lines'], ['missing', 'Missing only'], ['done', 'Recorded only']], 'Which lines'),
      pick('kind', [['all', 'Every kind'], ...VOICE_KINDS.map((k) => [k, k === 'bark' ? 'Barks' : k[0].toUpperCase() + k.slice(1)])], 'Kind'),
      pick('floor', [['all', 'Every floor'], ...floors.map((f) => [f, f ? `Floor ${f}` : 'Every floor (barks)'])], 'Floor')),
    h('section', { class: 'vs-card' }, h('h2', {}, 'Processing'),
      opt('highpass', 'High-pass 80 Hz', 'Takes out rumble and desk bumps'),
      opt('gate', 'Gentle noise gate', 'Turns the room down 12 dB between words'),
      h('label', { class: 'vs-check' }, h('input', { type: 'checkbox', checked: S.beep, onchange: (e) => store.set('beep', (S.beep = e.target.checked)) }), 'Beep on the count-in'),
      h('p', { class: 'vs-muted vs-small' }, 'Every take: silence trimmed, faded, −18 LUFS, peaks ≤ −1 dBFS.')));
  const listEl = h('ol', { class: 'vs-lines', 'aria-label': 'Lines' }, list.map((l, k) => {
    const done = recordingFor(S.data.manifest, S.lang, S.char, l.id);
    const takes = S.takes.get(`${S.lang}/${S.char}/${l.id}`)?.list.length ?? 0;
    return h('li', { class: `${k === S.i ? 'is-now' : ''} ${done ? 'is-done' : ''}` }, h('button', { onclick: () => go(k), title: l.id }, h('span', { class: 'vs-dot', 'aria-label': done ? 'recorded' : 'missing' }), h('span', { class: 'vs-lines__t' }, l.text), takes ? h('span', { class: 'vs-chip' }, `${takes}`) : null));
  }));
  side.append(h('section', { class: 'vs-card vs-card--list' }, h('h2', {}, `Lines (${list.length})`), listEl));
  // Main: the teleprompter, the meter, the takes.
  const main = h('section', { class: 'vs-prompter-wrap' });
  const line = list[S.i];
  if (!line) {
    main.append(h('section', { class: 'vs-card vs-empty' }, h('h2', {}, S.show === 'missing' ? '🎉 Every line here is recorded!' : 'No lines match these filters.')));
  } else {
    const recorded = recordingFor(S.data.manifest, S.lang, S.char, line.id);
    const c = charOf(S.char);
    els.meter = h('div', { class: 'vs-meter', role: 'meter', 'aria-label': 'Input level', 'aria-valuemin': '-60', 'aria-valuemax': '0' }, h('i', { class: 'vs-meter__rms' }), h('i', { class: 'vs-meter__peak' }), h('i', { class: 'vs-meter__clip' }), h('span', { class: 'vs-meter__db' }, '—'));
    els.count = h('div', { class: 'vs-count', 'aria-live': 'assertive' });
    els.timer = h('span', { class: 'vs-timer' }, '');
    els.rec = h('button', { class: 'vs-btn vs-btn--rec', 'data-record': '', onclick: () => toggleRecord() }, S.rec ? '■ Stop (Space)' : '● Record (Space)');
    main.append(h('article', { class: 'vs-prompter', 'data-prompter': '' },
      h('div', { class: 'vs-prompter__top' },
        h('span', { class: 'vs-chip' }, `${S.i + 1} / ${list.length}`),
        h('span', { class: `vs-chip vs-kind--${line.kind}` }, line.kind === 'bark' ? 'bark' : line.kind),
        h('span', { class: 'vs-chip' }, line.floor ? `floor ${line.floor}` : 'every floor'),
        h('span', { class: 'vs-chip' }, `≈ ${line.seconds} s`),
        h('span', { class: 'vs-chip' }, `${c?.emoji ?? ''} ${c?.name ?? S.char} · ${langName(S.lang)}`),
        recorded ? h('span', { class: 'vs-chip vs-chip--ok', 'data-saved': '' }, '✓ saved') : null,
        h('span', { class: 'vs-spacer' }),
        h('code', { class: 'vs-id' }, line.id)),
      h('p', { class: 'vs-line', lang: S.lang, 'data-line': line.id }, line.text),
      h('p', { class: 'vs-direction' }, h('strong', {}, 'Direction: '), line.direction),
      h('p', { class: 'vs-context' }, h('strong', {}, 'Where: '), line.context),
      els.count,
      h('div', { class: 'vs-controls' },
        h('button', { class: 'vs-btn', onclick: () => go(S.i - 1), disabled: S.i === 0, 'aria-label': 'Previous line' }, '◀'),
        els.rec, els.meter, els.timer,
        h('button', { class: 'vs-btn', onclick: () => go(S.i + 1), disabled: S.i >= list.length - 1, 'aria-label': 'Next line' }, '▶')),
      h('p', { class: 'vs-keys vs-muted vs-small' }, 'Space record / stop · Enter keep · R retake · P play · ← → previous / next · Esc cancel')));
    main.append(takesCard(line, recorded));
  }
  root.append(head, h('main', { class: 'vs-main' }, side, main), uploadsBar());
  // Keep the current line in view inside the list (never scroll the page away from the teleprompter).
  const now = listEl.querySelector('.is-now');
  if (now) {
    const top = now.offsetTop - listEl.offsetTop;
    if (top < listEl.scrollTop || top + now.offsetHeight > listEl.scrollTop + listEl.clientHeight) listEl.scrollTop = Math.max(0, top - listEl.clientHeight / 3);
  }
  if (S.mic) meterLoop();
}

function progressTable(a) {
  const rows = [];
  for (const char of a.characters) for (const lang of a.languages) {
    const p = progressOf(S.data.manifest, script(lang), lang, char);
    rows.push(h('tr', { class: char === S.char && lang === S.lang ? 'is-now' : '' }, h('td', {}, `${charOf(char, lang)?.emoji ?? ''} ${charOf(char, lang)?.name ?? char}`), h('td', {}, lang), h('td', {}, `${p.done}/${p.total}`), h('td', {}, `${p.barks.done}/${p.barks.total}`)));
  }
  return h('table', { class: 'vs-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Character'), h('th', {}, 'Lang'), h('th', {}, 'Done'), h('th', {}, 'Barks'))), h('tbody', {}, rows));
}

function takesCard(line, recorded) {
  const t = S.takes.get(keyOf(line));
  const card = h('section', { class: 'vs-card vs-takes', 'data-takes': '' }, h('h2', {}, 'Takes'));
  if (recorded) {
    const url = `./audio/voice/${Object.values(recorded.files)[0]}?t=${encodeURIComponent(recorded.take)}`;
    const who = S.data.manifest.actors?.[recorded.actor]?.name ?? recorded.actor;
    card.append(h('div', { class: 'vs-take vs-take--saved' },
      h('strong', {}, '✓ Saved'),
      h('span', {}, `${recorded.duration.toFixed(2)} s · ${fmtDb(recorded.lufs)} LUFS · peak ${fmtDb(recorded.peak)} dB · ${Object.keys(recorded.files).join(' + ')} · ${who} · ${new Date(recorded.take).toLocaleString()}`),
      h('button', { class: 'vs-btn', onclick: () => new Audio(url).play() }, '▶ Play'),
      h('button', { class: 'vs-btn vs-btn--ghost', onclick: () => deleteSaved(line) }, '🗑 Remove')));
  }
  if (!t?.list.length) {
    card.append(h('p', { class: 'vs-muted' }, recorded ? 'Record again to replace it.' : 'No takes yet — press Space to record.'));
    return card;
  }
  t.list.forEach((take, k) => {
    const s = take.stats;
    card.append(h('div', { class: `vs-take ${k === t.chosen ? 'is-chosen' : ''} ${take.warnings.length ? 'has-warn' : ''}`, 'data-take': String(k) },
      h('strong', {}, `Take ${k + 1}`),
      h('span', {}, `${s.duration.toFixed(2)} s · ${fmtDb(s.lufs)} LUFS · peak ${fmtDb(s.peakDb)} dB · gain ${fmtDb(s.gainDb)} dB`),
      h('button', { class: 'vs-btn', onclick: () => play(take) }, '▶ Play'),
      h('button', { class: 'vs-btn', onclick: () => {
        t.chosen = k;
        draw();
      } }, k === t.chosen ? '★ Chosen' : '☆ Choose'),
      h('button', { class: 'vs-btn vs-btn--primary', 'data-keep': '', disabled: !take.samples.length, onclick: () => keep(line, k) }, take.saved ? '✓ Kept' : 'Keep (Enter)'),
      take.warnings.length ? h('ul', { class: 'vs-warn' }, take.warnings.map((w) => h('li', {}, `⚠️ ${WARNING_TEXT[w] ?? w}`))) : null));
  });
  return card;
}

function uploadsBar() {
  const pending = S.uploads.filter((u) => u.state === 'pending').length;
  const failed = S.uploads.filter((u) => u.state === 'failed');
  return h('footer', { class: 'vs-foot vs-muted vs-small' },
    h('span', { 'data-uploads': String(pending) }, pending ? `⏫ Saving ${pending}…` : '✓ All kept takes are saved'),
    failed.length ? h('button', { class: 'vs-btn vs-btn--ghost', onclick: retryUploads }, `⚠️ ${failed.length} failed — retry`) : null,
    h('span', { class: 'vs-spacer' }),
    h('span', {}, `Saved as ${encodeFormats().map(([ext]) => (ext === 'webm' ? 'Opus in WebM' : 'AAC in MP4')).join(' + ') || '(this browser cannot encode audio)'} · ${S.data.limits?.maxSeconds ?? 60} s max a line`));
}

function go(k) {
  const list = lines();
  if (!list.length) return;
  stopRecording(true);
  S.i = Math.max(0, Math.min(list.length - 1, k));
  draw();
}

/* ---------------------------------------------------------------- actors and consent */

function openActor(a) {
  const isNew = !a;
  const modal = h('div', { class: 'vs-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': isNew ? 'New voice actor' : 'Edit voice actor' });
  const name = h('input', { value: a?.name ?? '', maxlength: '60', required: true, 'data-actor-name': '', 'aria-label': 'Credited name' });
  const groups = { teacher: 'Teachers', guide: 'History guides', boss: 'Floor bosses', townsfolk: 'Townsfolk', buddy: 'Buddies (friends)' };
  const cbox = (id, label, on) => h('label', { class: 'vs-check' }, h('input', { type: 'checkbox', value: id, checked: on, 'data-char-pick': id }), label);
  const charBox = h('div', { class: 'vs-picks' }, Object.entries(groups).map(([g, title]) => h('fieldset', {}, h('legend', {}, title), chars('en').filter((c) => c.group === g).map((c) => cbox(c.id, `${c.emoji} ${c.name}${c.lesson ? ` (${c.lesson})` : ''}`, a?.characters.includes(c.id))))));
  const langBox = h('div', { class: 'vs-row' }, LOCALE_IDS.map((id) => h('label', { class: 'vs-check' }, h('input', { type: 'checkbox', value: id, checked: a ? a.languages.includes(id) : false, 'data-lang-pick': id }), langName(id))));
  const consent = h('input', { type: 'checkbox', 'data-consent-box': '' });
  const save = h('button', { class: 'vs-btn vs-btn--primary', type: 'submit', disabled: isNew, 'data-save-actor': '' }, isNew ? 'Agree and add' : 'Save');
  consent.addEventListener('change', () => (save.disabled = !consent.checked));
  const close = () => modal.remove();
  const form = h('form', { class: 'vs-card vs-modal__card', onsubmit: async (e) => {
    e.preventDefault();
    const body = { name: name.value, characters: [...charBox.querySelectorAll('input:checked')].map((x) => x.value), languages: [...langBox.querySelectorAll('input:checked')].map((x) => x.value) };
    try {
      save.disabled = true;
      const out = isNew ? await api('/actors', { method: 'POST', json: { ...body, consent: consent.checked, consentVersion: S.data.consent.version } }) : await api(`/actors/${a.id}`, { method: 'PATCH', json: body });
      S.actor = out.actor.id;
      close();
      await load();
      toast(isNew ? `Welcome, ${out.actor.name}! Consent recorded.` : 'Saved.', 'good');
    } catch (err) {
      save.disabled = isNew && !consent.checked;
      if (err.status !== 401) toast(`⚠️ ${err.message}`, 'bad');
    }
  } },
  h('h2', {}, isNew ? 'New voice actor' : `Edit ${a.name}`),
  h('label', {}, 'Name in the credits (their choice)', name),
  h('h3', {}, 'Characters they voice'), charBox,
  h('h3', {}, 'Languages'), langBox,
  isNew ? h('div', { class: 'vs-consent', 'data-consent-panel': '' },
    h('h3', {}, 'Consent'),
    h('p', {}, S.data.consent.text),
    h('label', { class: 'vs-check' }, consent, 'They have read this and agree (we store this with today’s date).')) : null,
  h('div', { class: 'vs-row' }, h('button', { class: 'vs-btn vs-btn--ghost', type: 'button', onclick: close }, 'Cancel'), save));
  modal.append(form);
  modal.addEventListener('keydown', (e) => e.key === 'Escape' && close());
  document.body.append(modal);
  name.focus();
}

async function removeAll(a) {
  if (!confirm(`Remove all of ${a.name}’s recordings? Their files and their credit are deleted; the consent record keeps the date of this removal. This cannot be undone.`)) return;
  try {
    const out = await api(`/actors/${a.id}/remove`, { method: 'POST', json: { confirm: true } });
    toast(`Removed ${out.removed} file(s) of ${a.name}’s.`, 'good');
    S.actor = null;
    await load();
  } catch (err) {
    if (err.status !== 401) fail(err);
  }
}

async function deleteSaved(line) {
  if (!confirm('Remove the saved recording of this line?')) return;
  try {
    await api(`/lines/${S.lang}/${S.char}/${encodeURIComponent(line.id)}`, { method: 'DELETE' });
    removeRecording(S.data.manifest, S.lang, S.char, line.id);
    draw();
  } catch (err) {
    if (err.status !== 401) fail(err);
  }
}

/* ---------------------------------------------------------------- audio: mic, meter, recording */

let ctx = null;
function audio() {
  ctx ??= S.ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  return ctx;
}

async function ensureMic() {
  if (S.mic) return S.mic;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 } });
  const c = audio();
  const src = c.createMediaStreamSource(stream);
  const analyser = c.createAnalyser();
  analyser.fftSize = 2048;
  src.connect(analyser);
  S.mic = { stream, analyser, data: new Float32Array(analyser.fftSize), peakHold: -120, peakAt: 0, clipAt: 0 };
  meterLoop();
  return S.mic;
}

let meterRaf = 0;
function meterLoop() {
  cancelAnimationFrame(meterRaf);
  const tick = () => {
    const m = S.mic;
    const el = els.meter;
    if (!m || !el?.isConnected) return;
    m.analyser.getFloatTimeDomainData(m.data);
    let pk = 0, sum = 0;
    for (const v of m.data) {
      const a = Math.abs(v);
      if (a > pk) pk = a;
      sum += v * v;
    }
    const rms = toDb(Math.sqrt(sum / m.data.length)), p = toDb(pk);
    const now = performance.now();
    if (p > m.peakHold || now - m.peakAt > 1200) {
      m.peakHold = p;
      m.peakAt = now;
    }
    if (pk >= 0.99) m.clipAt = now;
    const k = (d) => Math.max(0, Math.min(1, (d + 60) / 60));
    el.style.setProperty('--rms', String(k(rms)));
    el.style.setProperty('--peak', String(k(m.peakHold)));
    el.classList.toggle('is-clip', now - m.clipAt < 1500);
    el.classList.toggle('is-live', Boolean(S.rec));
    el.setAttribute('aria-valuenow', String(Math.round(Math.max(-60, p))));
    el.querySelector('.vs-meter__db').textContent = `${Number.isFinite(p) ? p.toFixed(0) : '−∞'} dB`;
    S.meter = { rms, peak: p, hold: m.peakHold, max: Math.max(S.meter?.max ?? -120, Number.isFinite(p) ? p : -120) };
    if (S.rec?.phase === 'recording' && els.timer) els.timer.textContent = `${((now - S.rec.started) / 1000).toFixed(1)} s`;
    meterRaf = requestAnimationFrame(tick);
  };
  meterRaf = requestAnimationFrame(tick);
}

function beep(freq = 880) {
  if (!S.beep) return;
  const c = audio();
  const o = c.createOscillator(), g = c.createGain();
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.15, c.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.12);
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + 0.15);
}

/** The best format to capture in: Opus in WebM, else AAC in MP4 (Safari), else the browser's default. */
function captureType() {
  for (const t of ['audio/webm;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm']) if (window.MediaRecorder?.isTypeSupported?.(t)) return t;
  return '';
}

async function toggleRecord() {
  if (S.rec?.phase === 'recording') return stopRecording();
  if (S.rec) return stopRecording(true);
  const list = lines();
  const line = list[S.i];
  if (!line) return;
  let mic;
  try {
    mic = await ensureMic();
  } catch (err) {
    return toast(`⚠️ The microphone is not available: ${err.message}`, 'bad');
  }
  const rec = (S.rec = { phase: 'count', line, key: keyOf(line) });
  els.rec.textContent = '■ Cancel (Esc)';
  for (const n of [3, 2, 1]) {
    if (S.rec !== rec) return;
    els.count.textContent = String(n);
    els.count.classList.add('is-on');
    beep(n === 1 ? 1320 : 880);
    await new Promise((r) => setTimeout(r, 650));
  }
  if (S.rec !== rec) return;
  els.count.textContent = '● REC';
  els.count.classList.add('is-rec');
  els.count.closest('.vs-prompter')?.classList.add('is-recording');
  const type = captureType();
  const recorder = new MediaRecorder(mic.stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 256000 });
  rec.recorder = recorder;
  rec.chunks = [];
  rec.phase = 'recording';
  rec.started = performance.now();
  recorder.ondataavailable = (e) => e.data.size && rec.chunks.push(e.data);
  recorder.onstop = () => finishTake(rec);
  recorder.start();
  els.rec.textContent = '■ Stop (Space)';
  els.rec.classList.add('is-recording');
  rec.limit = setTimeout(() => stopRecording(), (S.data.limits?.maxSeconds ?? 60) * 1000 - 500);
}

function stopRecording(cancel = false) {
  const rec = S.rec;
  if (!rec) return;
  clearTimeout(rec.limit);
  S.rec = null;
  rec.cancelled = cancel;
  if (els.count) {
    els.count.textContent = '';
    els.count.classList.remove('is-on', 'is-rec');
    els.count.closest('.vs-prompter')?.classList.remove('is-recording');
  }
  if (els.rec) {
    els.rec.textContent = '● Record (Space)';
    els.rec.classList.remove('is-recording');
  }
  if (rec.recorder?.state === 'recording') rec.recorder.stop();
}

async function finishTake(rec) {
  if (rec.cancelled || !rec.chunks.length) return;
  try {
    const blob = new Blob(rec.chunks, { type: rec.recorder.mimeType });
    const c = audio();
    const decoded = await c.decodeAudioData(await blob.arrayBuffer());
    const chans = Array.from({ length: decoded.numberOfChannels }, (_, i) => decoded.getChannelData(i));
    const raw = toMono(chans);
    const take = { ...processed(raw, decoded.sampleRate), raw, at: new Date().toISOString(), saved: false };
    const t = S.takes.get(rec.key) ?? { list: [], chosen: 0 };
    t.list.push(take);
    t.chosen = t.list.length - 1;
    S.takes.set(rec.key, t);
    draw();
    if (take.warnings.length) toast(`⚠️ ${take.warnings.map((w) => WARNING_TEXT[w]).join(' ')}`, 'warn');
  } catch (err) {
    fail(err);
  }
}

/** A take processed with the current options, and an AudioBuffer to play it. */
function processed(raw, sampleRate) {
  const out = processTake(raw, sampleRate, S.opts);
  const buffer = out.samples.length ? audio().createBuffer(1, out.samples.length, out.sampleRate) : null;
  buffer?.copyToChannel(out.samples, 0);
  return { ...out, buffer };
}
/** The processing options changed: the current line's unsaved takes are processed again from their raw audio. */
function reprocess() {
  const line = lines()[S.i];
  const t = line && S.takes.get(keyOf(line));
  if (!t) return;
  t.list = t.list.map((take) => (take.saved || !take.raw ? take : { ...take, ...processed(take.raw, take.sampleRate) }));
  draw();
}

let playing = null;
function play(take) {
  if (!take?.buffer) return;
  try {
    playing?.stop();
  } catch {
    /* ended */
  }
  const c = audio();
  const s = c.createBufferSource();
  s.buffer = take.buffer;
  s.connect(c.destination);
  s.start();
  playing = s;
}

/* ---------------------------------------------------------------- encode and save */

/** What this browser's MediaRecorder can write: [[ext, mimeType, bitrate]]. Opus/WebM first; AAC/MP4 too when possible. */
function encodeFormats() {
  const out = [];
  const can = (t) => window.MediaRecorder?.isTypeSupported?.(t);
  if (can('audio/webm;codecs=opus')) out.push(['webm', 'audio/webm;codecs=opus', 64000]);
  const mp4 = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4'].find(can);
  if (mp4) out.push(['m4a', mp4, 96000]);
  return out;
}

/**
 * Encode the processed samples: play them (silently) into MediaRecorders,
 * one per format, at the same time. Real time, so a 3 s line takes 3 s.
 */
async function encode(take) {
  const formats = encodeFormats();
  if (!formats.length) throw new Error('This browser cannot encode audio (MediaRecorder)');
  const c = audio();
  const dest = c.createMediaStreamDestination();
  dest.channelCount = 1;
  const src = c.createBufferSource();
  src.buffer = take.buffer;
  src.connect(dest);
  const recs = formats.map(([ext, type, bits]) => {
    const r = new MediaRecorder(dest.stream, { mimeType: type, audioBitsPerSecond: bits });
    const chunks = [];
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise((res) => (r.onstop = () => res({ ext, blob: new Blob(chunks, { type: FORMATS[ext].mime }) })));
    return { r, done };
  });
  for (const x of recs) x.r.start();
  await new Promise((r) => setTimeout(r, 60));
  await new Promise((res) => {
    src.onended = res;
    src.start();
  });
  await new Promise((r) => setTimeout(r, 140));
  for (const x of recs) x.r.stop();
  const out = await Promise.all(recs.map((x) => x.done));
  src.disconnect();
  return out;
}

function keep(line, k) {
  const key = keyOf(line);
  const t = S.takes.get(key);
  const take = t?.list[k ?? t.chosen];
  if (!take?.samples.length) return;
  t.chosen = k ?? t.chosen;
  const job = { key, lang: S.lang, char: S.char, line, take, actor: S.actor, state: 'pending' };
  S.uploads.push(job);
  queue = queue.then(() => upload(job));
  // On to the next line straight away; the save carries on behind.
  const list = lines();
  if (S.i < list.length - 1 && S.show !== 'missing') S.i++;
  draw();
}

let queue = Promise.resolve();
async function upload(job) {
  try {
    const files = await encode(job.take);
    const q = new URLSearchParams({ actor: job.actor, take: job.take.at, duration: job.take.stats.duration.toFixed(3), lufs: job.take.stats.lufs.toFixed(2), peak: job.take.stats.peakDb.toFixed(2) });
    let entry = null;
    for (const f of files) {
      const out = await api(`/lines/${job.lang}/${job.char}/${encodeURIComponent(job.line.id)}.${f.ext}?${q}`, { method: 'PUT', body: f.blob, headers: { 'Content-Type': FORMATS[f.ext].mime } });
      entry = out.entry;
    }
    setRecording(S.data.manifest, job.lang, job.char, job.line.id, entry);
    const a = S.data.actors.find((x) => x.id === job.actor);
    if (a) S.data.manifest.actors[a.id] = { name: a.name, characters: a.characters, languages: a.languages };
    job.state = 'done';
    job.take.saved = true;
    toast(`✓ Saved “${job.line.text.slice(0, 40)}${job.line.text.length > 40 ? '…' : ''}”`, 'good');
  } catch (err) {
    job.state = 'failed';
    job.error = err.message;
    if (err.status !== 401) toast(`⚠️ Not saved: ${err.message}`, 'bad');
  }
  if (!S.rec) draw();
}

function retryUploads() {
  for (const job of S.uploads.filter((u) => u.state === 'failed')) {
    job.state = 'pending';
    queue = queue.then(() => upload(job));
  }
  draw();
}

/* ---------------------------------------------------------------- keys */

document.addEventListener('keydown', (e) => {
  if (!S.data || document.querySelector('.vs-modal')) return;
  if (e.target.closest?.('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
  const list = lines();
  const line = list[S.i];
  if (e.code === 'Space') {
    e.preventDefault();
    toggleRecord();
  } else if (e.key === 'Escape') stopRecording(true);
  else if (e.key === 'Enter' && line && !S.rec) {
    e.preventDefault();
    const t = S.takes.get(keyOf(line));
    if (t?.list.length) keep(line, t.chosen);
  } else if ((e.key === 'r' || e.key === 'R') && !S.rec) toggleRecord();
  else if ((e.key === 'p' || e.key === 'P') && line) {
    const t = S.takes.get(keyOf(line));
    play(t?.list[t.chosen]);
  } else if ((e.key === 'ArrowRight' || e.key === 'ArrowDown') && !S.rec) {
    e.preventDefault();
    go(S.i + 1);
  } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') && !S.rec) {
    e.preventDefault();
    go(S.i - 1);
  }
});
window.addEventListener('beforeunload', (e) => {
  if (S.uploads.some((u) => u.state === 'pending')) e.preventDefault();
});

load().catch((err) => {
  if (err.status !== 401) {
    root.replaceChildren(h('p', { class: 'vs-card' }, `⚠️ ${err.message}`));
  }
});
