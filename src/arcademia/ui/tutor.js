/**
 * Professor Hoot, the AI tutor — a Plus feature, enforced by the server
 * (server/api/ai.js, POST /api/ai/tutor). Free players see the owl with a
 * little "Plus" badge and get the lesson's own hint and worked answer
 * instead; with the AI model switched off, Hoot is "resting" and the same
 * prebuilt help shows. Nothing personal is sent: the lesson id, the
 * question on screen, and what the child typed (capped, scrubbed server-side).
 */
import { el, button } from './dom.js';
import { speech } from '../sound.js';
import { t, locale } from '../i18n/index.js';
import { TEACHERS } from '../world/figures.js';

let status = null;
export async function tutorStatus() {
  if (status) return status;
  try {
    const r = await fetch('./api/ai/tutor', { cache: 'no-store' });
    status = r.ok ? await r.json() : { allowed: false, available: false, plan: 'free' };
  } catch {
    status = { allowed: false, available: false, plan: 'free' };
  }
  return status;
}
export const resetTutorStatus = () => (status = null);

export class TutorPanel {
  /**
   * @param {HTMLElement} host
   * @param {{ lessonId: () => string, context: () => { step: string, hint?: string, worked?: string }, voice: () => boolean }} opts
   */
  constructor(host, opts) {
    this.opts = opts;
    this.root = el('aside', 'arc-tutor', null, { 'aria-label': TEACHERS.math.name, hidden: true });
    host.append(this.root);
    this.history = [];
  }

  async open() {
    this.root.hidden = false;
    this.root.classList.add('is-open');
    const st = await tutorStatus();
    this.render(st);
  }
  close() {
    this.root.classList.remove('is-open');
    this.root.hidden = true;
    speech.stop();
  }

  render(st) {
    this.root.replaceChildren();
    const head = el('div', 'arc-tutor__head');
    head.append(el('span', 'arc-tutor__owl', '🦉', { 'aria-hidden': 'true' }), el('strong', null, TEACHERS.math.name), el('span', 'arc-plus', 'Plus'));
    head.append(button('arc-tutor__x', '✕', () => this.close(), { 'aria-label': t('tutor.close', { name: TEACHERS.math.name }) }));
    this.root.append(head);
    const ctx = this.opts.context();
    if (!st.allowed) {
      const card = el('div', 'arc-tutor__locked');
      card.append(el('p', 'arc-tutor__bubble', t('tutor.locked')));
      this.root.append(card, ...this._prebuilt(ctx));
      return;
    }
    this.log = el('div', 'arc-tutor__log', null, { 'aria-live': 'polite' });
    this.log.append(el('p', 'arc-tutor__bubble', t('tutor.hello')));
    for (const m of this.history) this.log.append(el('p', m.role === 'tutor' ? 'arc-tutor__bubble' : 'arc-tutor__me', m.text));
    const form = el('form', 'arc-tutor__form');
    const input = el('input', 'arc-tutor__input', null, { type: 'text', maxlength: '300', placeholder: t('tutor.placeholder'), 'aria-label': t('tutor.inputAria', { name: TEACHERS.math.name }), autocomplete: 'off' });
    const send = el('button', 'arc-btn arc-btn--primary', t('tutor.ask'), { type: 'submit' });
    const quick = el('div', 'arc-tutor__quick');
    for (const k of ['hint', 'why', 'another']) {
      const q = t(`tutor.quick.${k}`);
      quick.append(button('arc-chipbtn', q, () => this.ask(q)));
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (q) this.ask(q);
      input.value = '';
    });
    form.append(input, send);
    this.root.append(this.log, quick, form);
    input.focus();
  }

  _prebuilt(ctx) {
    const out = [];
    if (ctx.hint) {
      const h = el('details', 'arc-tutor__help');
      h.append(el('summary', null, t('tutor.showHint')), el('p', null, ctx.hint));
      out.push(h);
    }
    if (ctx.worked) {
      const w = el('details', 'arc-tutor__help');
      w.append(el('summary', null, t('tutor.showHow')), el('p', null, ctx.worked));
      out.push(w);
    }
    if (!out.length) out.push(el('p', 'arc-tutor__note', t('tutor.readAgain')));
    return out;
  }

  async ask(question) {
    const ctx = this.opts.context();
    this.history.push({ role: 'me', text: question });
    this.log.append(el('p', 'arc-tutor__me', question));
    const thinking = el('p', 'arc-tutor__bubble is-thinking', t('tutor.thinking'));
    this.log.append(thinking);
    this.log.scrollTop = this.log.scrollHeight;
    try {
      const r = await fetch('./api/ai/tutor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId: this.opts.lessonId(), question, step: ctx.step, history: this.history.slice(-5, -1), locale: locale() }) });
      const body = await r.json().catch(() => ({}));
      thinking.remove();
      if (r.status === 403) {
        resetTutorStatus();
        return this.render({ allowed: false });
      }
      if (!r.ok) {
        const rest = el('div', 'arc-tutor__resting');
        rest.append(el('p', 'arc-tutor__bubble', `😴 ${t(body.code === 'busy' ? 'tutor.busy' : body.code === 'ask' ? 'tutor.ask.q' : 'tutor.resting', { name: TEACHERS.math.name })}`), ...this._prebuilt(ctx));
        this.log.append(rest);
        return;
      }
      const answer = String(body.answer).replace(/\*\*|__|^#+\s*/gm, '').replace(/\s+/g, ' ').trim();
      this.history.push({ role: 'tutor', text: answer });
      this.log.append(el('p', 'arc-tutor__bubble', answer));
      // Only a recorded line (the same words as a lesson's hint, say) can be heard; an AI answer is text.
      if (this.opts.voice()) speech.say(answer, { char: 'hoot' });
    } catch {
      thinking.remove();
      this.log.append(el('p', 'arc-tutor__bubble', `😴 ${t('tutor.resting', { name: TEACHERS.math.name })}`), ...this._prebuilt(ctx));
    }
    this.log.scrollTop = this.log.scrollHeight;
  }

  dispose() {
    this.root.remove();
  }
}
