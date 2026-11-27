/**
 * The platform's own sign-in window, over the home page: sign in, create an account, or (signed in)
 * see who you are and sign out. Games' own menus (the arena's loadout) are not involved — this is the
 * same account for every game on Gamory.
 *
 * actions: { account: () => { name }|null, signIn(name, password), signUp(name, password), signOut() }
 * — signIn/signUp resolve to { ok, account?, error? } (net/Account.js through App._signIn).
 */
export class AccountDialog {
  constructor(host, actions) {
    this.actions = actions;
    this.mode = 'signin';
    this.root = document.createElement('div');
    this.root.className = 'acct';
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="acct__backdrop" data-acct-close></div>
      <section class="acct__card" role="dialog" aria-modal="true" aria-labelledby="acct-title">
        <button type="button" class="acct__x" data-acct-close aria-label="Close">×</button>
        <div class="acct__brand">GAMORY</div>
        <div data-acct-out>
          <h2 class="acct__title" id="acct-title" data-acct-title>Welcome back</h2>
          <p class="acct__lead" data-acct-lead>Sign in to keep your games, characters and progress on any computer.</p>
          <div class="acct__tabs" role="tablist">
            <button type="button" role="tab" class="acct__tab" data-acct-tab="signin">Sign in</button>
            <button type="button" role="tab" class="acct__tab" data-acct-tab="signup">Create account</button>
          </div>
          <form class="acct__form" data-acct-form novalidate>
            <label class="acct__field"><span>Name</span>
              <input data-acct-name maxlength="20" autocomplete="username" spellcheck="false" required /></label>
            <label class="acct__field"><span>Password</span>
              <input data-acct-pass type="password" maxlength="128" autocomplete="current-password" required /></label>
            <label class="acct__field" data-acct-confirm-row hidden><span>Password again</span>
              <input data-acct-confirm type="password" maxlength="128" autocomplete="new-password" /></label>
            <p class="acct__msg" data-acct-msg role="status"></p>
            <button type="submit" class="acct__submit" data-acct-submit>Sign in</button>
          </form>
          <p class="acct__note" data-acct-note>Your name and password are the only way in — there is no email reset yet, so keep them safe.</p>
        </div>
        <div data-acct-in hidden>
          <div class="acct__who"><span class="acct__avatar" data-acct-avatar></span>
            <div><strong data-acct-who></strong><span class="acct__badge">✓ Signed in</span></div></div>
          <p class="acct__lead">Your games, characters and progress are kept on the server.</p>
          <button type="button" class="acct__submit acct__submit--quiet" data-acct-signout>Sign out</button>
        </div>
      </section>`;
    host.appendChild(this.root);
    const $ = (s) => this.root.querySelector(s);
    this.$ = $;
    this.root.querySelectorAll('[data-acct-close]').forEach((b) => b.addEventListener('click', () => this.close()));
    this.root.querySelectorAll('[data-acct-tab]').forEach((b) => b.addEventListener('click', () => this._mode(b.dataset.acctTab)));
    $('[data-acct-form]').addEventListener('submit', (e) => {
      e.preventDefault();
      this._submit();
    });
    $('[data-acct-signout]').addEventListener('click', async () => {
      await this.actions.signOut();
      this._render();
      this.onChange?.();
    });
    this._key = (e) => {
      if (e.key === 'Escape' && !this.root.hidden) {
        e.stopPropagation();
        this.close();
      }
    };
  }

  open(mode = 'signin') {
    this.mode = mode;
    this.root.hidden = false;
    document.addEventListener('keydown', this._key, true);
    this._render();
    (this.actions.account() ? this.$('[data-acct-signout]') : this.$('[data-acct-name]')).focus();
  }

  close() {
    this.root.hidden = true;
    document.removeEventListener('keydown', this._key, true);
    this.$('[data-acct-pass]').value = '';
    this.$('[data-acct-confirm]').value = '';
    this._msg('');
  }

  _render() {
    const who = this.actions.account();
    this.$('[data-acct-out]').hidden = Boolean(who);
    this.$('[data-acct-in]').hidden = !who;
    if (who) {
      this.$('[data-acct-who]').textContent = who.name;
      this.$('[data-acct-avatar]').textContent = (who.name?.[0] ?? '?').toUpperCase();
    } else this._mode(this.mode);
  }

  _mode(mode) {
    this.mode = mode;
    const up = mode === 'signup';
    this.root.querySelectorAll('[data-acct-tab]').forEach((b) => {
      const on = b.dataset.acctTab === mode;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', String(on));
    });
    this.$('[data-acct-title]').textContent = up ? 'Create your account' : 'Welcome back';
    this.$('[data-acct-lead]').textContent = up
      ? 'One account for every game on Gamory. Pick a name and a password of 8 or more characters.'
      : 'Sign in to keep your games, characters and progress on any computer.';
    this.$('[data-acct-submit]').textContent = up ? 'Create account' : 'Sign in';
    this.$('[data-acct-confirm-row]').hidden = !up;
    this.$('[data-acct-pass]').autocomplete = up ? 'new-password' : 'current-password';
    this._msg('');
  }

  _msg(text, bad = false) {
    const m = this.$('[data-acct-msg]');
    m.textContent = text;
    m.classList.toggle('is-bad', bad);
  }

  async _submit() {
    const name = this.$('[data-acct-name]').value.trim();
    const pass = this.$('[data-acct-pass]').value;
    const up = this.mode === 'signup';
    if (!name || !pass) return this._msg('Type your name and password.', true);
    if (up && pass.length < 8) return this._msg('The password needs 8 or more characters.', true);
    if (up && pass !== this.$('[data-acct-confirm]').value) return this._msg("The two passwords don't match.", true);
    const btn = this.$('[data-acct-submit]');
    btn.disabled = true;
    this._msg(up ? 'Creating your account…' : 'Signing in…');
    try {
      const r = await (up ? this.actions.signUp(name, pass) : this.actions.signIn(name, pass));
      if (!r?.ok) return this._msg(r?.error ?? 'That did not work. Try again.', true);
      this.$('[data-acct-pass]').value = '';
      this.$('[data-acct-confirm]').value = '';
      this.onChange?.();
      this.close();
    } finally {
      btn.disabled = false;
    }
  }
}
