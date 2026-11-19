/**
 * For grown-ups: a 4-digit PIN gate (set on first use; stored hashed — on
 * the server with scrypt when signed in, on this device otherwise), then
 * the weekly report and, for a signed-in child, a read-only share link a
 * parent can open on their own phone (a random token; a new one replaces
 * the old; it can be turned off).
 */
import { el, button } from './dom.js';
import { t, locale } from '../i18n/index.js';
import { renderReport } from './report.js';

/** Server and device messages, in the current language (the English text is the key). */
const ERRORS = {
  'The PIN is 4 digits': 'parents.err.digits',
  'That PIN is not right': 'parents.err.wrong',
  'Too many tries — wait 15 minutes': 'parents.err.locked',
  'That password is not right': 'parents.err.password',
  'Type the parent PIN first': 'parents.err.pinFirst',
  'Sign in first': 'parents.err.signIn',
  'Slow down': 'parents.err.slow'
};
const errText = (e) => t(ERRORS[e?.message] ?? 'parents.err.other');

export class ParentsView {
  constructor(host, { progress, account, onClose }) {
    this.progress = progress;
    this.account = account;
    this.onClose = onClose;
    this.root = el('div', 'arc-modal arc-parents', null, { role: 'dialog', 'aria-modal': 'true', 'aria-label': t('parents.aria') });
    this.card = el('div', 'arc-modal__card arc-parents__card');
    this.root.append(this.card);
    this.root.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') this.close();
      if (this.pinOn && /^\d$/.test(e.key)) this.digit(e.key);
      if (this.pinOn && e.key === 'Backspace') this.digit('⌫');
    });
    host.append(this.root);
    this.gate();
  }

  close() {
    this.root.remove();
    this.onClose?.();
  }

  head(title) {
    const row = el('div', 'arc-parents__head');
    row.append(el('h2', null, title), button('arc-boss__x', '✕', () => this.close(), { 'aria-label': t('parents.close') }));
    return row;
  }

  async gate() {
    this.card.replaceChildren(this.head(t('parents.title')), el('p', null, t('parents.checking')));
    let has = false;
    try {
      has = await this.progress.hasPin();
    } catch (error) {
      this.card.replaceChildren(this.head(t('parents.title')), el('p', null, errText(error)));
      return;
    }
    this.setting = !has;
    this.first = null;
    this.entry = '';
    this.pinOn = true;
    this.card.replaceChildren(this.head(t('parents.title')));
    this.msg = el('p', 'arc-parents__msg', t(has ? 'parents.enterPin' : 'parents.choosePin'));
    this.dots = el('div', 'arc-pin__dots', null, { 'aria-live': 'polite', 'aria-label': t('parents.digits', { n: 0 }) });
    const pad = el('div', 'arc-pin__pad');
    for (const d of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']) {
      if (!d) pad.append(el('span'));
      else pad.append(button('arc-pin__key', d, () => this.digit(d), { 'aria-label': d === '⌫' ? t('parents.delete') : d }));
    }
    this.card.append(this.msg, this.dots, pad, el('p', 'arc-parents__note', t(this.account ? 'parents.pinServer' : 'parents.pinDevice')));
    const forgot = button('arc-btn arc-btn--ghost', t('parents.forgot'), () => this.forgot());
    if (has) this.card.append(forgot);
    this.drawDots();
    pad.querySelector('button').focus();
  }

  drawDots() {
    this.dots.replaceChildren(...[0, 1, 2, 3].map((i) => el('i', i < this.entry.length ? 'is-on' : '')));
    this.dots.setAttribute('aria-label', t('parents.digits', { n: this.entry.length }));
  }

  async digit(d) {
    if (d === '⌫') this.entry = this.entry.slice(0, -1);
    else if (this.entry.length < 4) this.entry += d;
    this.drawDots();
    if (this.entry.length < 4) return;
    const pin = this.entry;
    this.entry = '';
    if (this.setting && !this.first) {
      this.first = pin;
      this.msg.textContent = t('parents.again');
      return this.drawDots();
    }
    if (this.setting && this.first !== pin) {
      this.first = null;
      this.msg.textContent = t('parents.mismatch');
      this.dots.classList.add('is-shake');
      setTimeout(() => this.dots.classList.remove('is-shake'), 500);
      return this.drawDots();
    }
    try {
      await this.progress.unlock(pin);
      this.pinOn = false;
      await this.showReport();
    } catch (error) {
      if (!ERRORS[error?.message]) console.error(error);
      this.msg.textContent = errText(error);
      this.dots.classList.add('is-shake');
      setTimeout(() => this.dots.classList.remove('is-shake'), 500);
      this.drawDots();
    }
  }

  forgot() {
    this.pinOn = false;
    this.card.replaceChildren(this.head(t('parents.forgot')));
    if (!this.account) {
      this.card.append(el('p', null, t('parents.clearDevice')));
      this.card.append(button('arc-btn arc-btn--primary', t('parents.clear'), async () => {
        await this.progress.resetPin();
        this.gate();
      }));
      return;
    }
    const form = el('form', 'arc-parents__form');
    const input = el('input', 'arc-tutor__input', null, { type: 'password', autocomplete: 'current-password', 'aria-label': t('parents.password'), placeholder: t('parents.password') });
    const msg = el('p', 'arc-parents__msg', t('parents.typePassword'));
    form.append(msg, input, el('button', 'arc-btn arc-btn--primary', t('parents.clear'), { type: 'submit' }));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await this.progress.resetPin(input.value);
        this.gate();
      } catch (error) {
        msg.textContent = errText(error);
      }
    });
    this.card.append(form);
    input.focus();
  }

  async showReport() {
    this.card.classList.add('is-wide');
    this.card.replaceChildren(this.head(t('parents.report')), el('p', null, t('parents.loading')));
    let data;
    try {
      data = await this.progress.report();
    } catch (error) {
      this.card.replaceChildren(this.head(t('parents.report')), el('p', null, errText(error)));
      return;
    }
    this.card.replaceChildren(this.head(t('parents.report')));
    const share = this.shareBox(data);
    renderReport(this.card, data.report, { title: t('parents.reportTitle'), share });
  }

  shareBox(data) {
    const box = el('section', 'rep-card rep-share');
    box.append(el('h3', 'rep-card__title', t('parents.share')));
    if (!data.canShare) {
      box.append(el('p', 'rep-empty', t('parents.shareSignIn')));
      return box;
    }
    const draw = (token) => {
      box.replaceChildren(el('h3', 'rep-card__title', t('parents.share')));
      if (!token) {
        box.append(el('p', 'rep-empty', t('parents.shareWhat')));
        box.append(button('arc-btn arc-btn--primary', t('parents.makeLink'), async () => draw(await this.progress.share(true))));
        return;
      }
      const url = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}parent-report.html#t=${token}&lang=${locale()}`;
      const input = el('input', null, null, { type: 'text', readonly: '', value: url, 'aria-label': t('parents.link') });
      const row = el('div', 'rep-share__row');
      row.append(
        button('', t('parents.copy'), async (e) => {
          input.select();
          try {
            await navigator.clipboard.writeText(url);
            e.currentTarget.textContent = t('parents.copied');
          } catch {
            document.execCommand?.('copy');
          }
        }),
        button('', t('parents.newLink'), async () => draw(await this.progress.share(true))),
        button('', t('parents.off'), async () => draw(await this.progress.share(false)))
      );
      box.append(el('p', 'rep-empty', t('parents.openPhone')), input, row);
    };
    draw(data.share);
    return box;
  }
}
