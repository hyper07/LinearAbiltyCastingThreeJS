/**
 * For grown-ups: a 4-digit PIN gate (set on first use; stored hashed — on
 * the server with scrypt when signed in, on this device otherwise), then
 * the weekly report and, for a signed-in child, a read-only share link a
 * parent can open on their own phone (a random token; a new one replaces
 * the old; it can be turned off).
 */
import { el, button } from './dom.js';
import { renderReport } from './report.js';

export class ParentsView {
  constructor(host, { progress, account, onClose }) {
    this.progress = progress;
    this.account = account;
    this.onClose = onClose;
    this.root = el('div', 'arc-modal arc-parents', null, { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'For parents' });
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
    row.append(el('h2', null, title), button('arc-boss__x', '✕', () => this.close(), { 'aria-label': 'Close' }));
    return row;
  }

  async gate() {
    this.card.replaceChildren(this.head('👪 For parents'), el('p', null, 'Checking…'));
    let has = false;
    try {
      has = await this.progress.hasPin();
    } catch (error) {
      this.card.replaceChildren(this.head('👪 For parents'), el('p', null, error.message));
      return;
    }
    this.setting = !has;
    this.first = null;
    this.entry = '';
    this.pinOn = true;
    this.card.replaceChildren(this.head('👪 For parents'));
    this.msg = el('p', 'arc-parents__msg', has ? 'Enter your 4-digit parent PIN.' : 'Choose a 4-digit parent PIN. You will need it to see the report.');
    this.dots = el('div', 'arc-pin__dots', null, { 'aria-live': 'polite', 'aria-label': 'PIN digits entered: 0' });
    const pad = el('div', 'arc-pin__pad');
    for (const d of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']) {
      if (!d) pad.append(el('span'));
      else pad.append(button('arc-pin__key', d, () => this.digit(d), { 'aria-label': d === '⌫' ? 'Delete' : d }));
    }
    this.card.append(this.msg, this.dots, pad, el('p', 'arc-parents__note', this.account ? 'The PIN is stored safely on the server (hashed), never as the digits.' : 'Playing without an account: the PIN and the report stay on this device.'));
    const forgot = button('arc-btn arc-btn--ghost', 'Forgot the PIN?', () => this.forgot());
    if (has) this.card.append(forgot);
    this.drawDots();
    pad.querySelector('button').focus();
  }

  drawDots() {
    this.dots.replaceChildren(...[0, 1, 2, 3].map((i) => el('i', i < this.entry.length ? 'is-on' : '')));
    this.dots.setAttribute('aria-label', `PIN digits entered: ${this.entry.length}`);
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
      this.msg.textContent = 'Type it once more to be sure.';
      return this.drawDots();
    }
    if (this.setting && this.first !== pin) {
      this.first = null;
      this.msg.textContent = 'Those two didn’t match — choose a PIN again.';
      this.dots.classList.add('is-shake');
      setTimeout(() => this.dots.classList.remove('is-shake'), 500);
      return this.drawDots();
    }
    try {
      await this.progress.unlock(pin);
      this.pinOn = false;
      await this.showReport();
    } catch (error) {
      this.msg.textContent = error.message;
      this.dots.classList.add('is-shake');
      setTimeout(() => this.dots.classList.remove('is-shake'), 500);
      this.drawDots();
    }
  }

  forgot() {
    this.pinOn = false;
    this.card.replaceChildren(this.head('Forgot the PIN?'));
    if (!this.account) {
      this.card.append(el('p', null, 'Without an account the PIN only lives on this device. You can clear it and choose a new one.'));
      this.card.append(button('arc-btn arc-btn--primary', 'Clear the PIN', async () => {
        await this.progress.resetPin();
        this.gate();
      }));
      return;
    }
    const form = el('form', 'arc-parents__form');
    const input = el('input', 'arc-tutor__input', null, { type: 'password', autocomplete: 'current-password', 'aria-label': 'Account password', placeholder: 'Account password' });
    const msg = el('p', 'arc-parents__msg', 'Type the account’s password to clear the PIN.');
    form.append(msg, input, el('button', 'arc-btn arc-btn--primary', 'Clear the PIN', { type: 'submit' }));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await this.progress.resetPin(input.value);
        this.gate();
      } catch (error) {
        msg.textContent = error.message;
      }
    });
    this.card.append(form);
    input.focus();
  }

  async showReport() {
    this.card.classList.add('is-wide');
    this.card.replaceChildren(this.head('👪 Weekly report'), el('p', null, 'Loading…'));
    let data;
    try {
      data = await this.progress.report();
    } catch (error) {
      this.card.replaceChildren(this.head('👪 Weekly report'), el('p', null, error.message));
      return;
    }
    this.card.replaceChildren(this.head('👪 Weekly report'));
    const share = this.shareBox(data);
    renderReport(this.card, data.report, { title: 'This week on the mountain', share });
  }

  shareBox(data) {
    const box = el('section', 'rep-card rep-share');
    box.append(el('h3', 'rep-card__title', '🔗 Share a read-only link'));
    if (!data.canShare) {
      box.append(el('p', 'rep-empty', 'Sign in to make a link you can open on your own phone. Without an account the report stays on this device.'));
      return box;
    }
    const draw = (token) => {
      box.replaceChildren(el('h3', 'rep-card__title', '🔗 Share a read-only link'));
      if (!token) {
        box.append(el('p', 'rep-empty', 'Make a private link to this report. Anyone with it can see the report (nothing else), until you turn it off.'));
        box.append(button('arc-btn arc-btn--primary', 'Make a link', async () => draw(await this.progress.share(true))));
        return;
      }
      const url = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}parent-report.html#t=${token}`;
      const input = el('input', null, null, { type: 'text', readonly: '', value: url, 'aria-label': 'Share link' });
      const row = el('div', 'rep-share__row');
      row.append(
        button('', '📋 Copy', async (e) => {
          input.select();
          try {
            await navigator.clipboard.writeText(url);
            e.currentTarget.textContent = '✔ Copied';
          } catch {
            document.execCommand?.('copy');
          }
        }),
        button('', '🔄 New link', async () => draw(await this.progress.share(true))),
        button('', '⛔ Turn off', async () => draw(await this.progress.share(false)))
      );
      box.append(el('p', 'rep-empty', 'Open this on your phone. A new link stops the old one working.'), input, row);
    };
    draw(data.share);
    return box;
  }
}
