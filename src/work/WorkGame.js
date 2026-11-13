import { money } from '../market/marketClient.js';
import '../market/market.css';
import './work.css';

/** The work game's server calls (server/work/index.js). */
async function call(path, body) {
  const response = await fetch(`./api/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error ?? `HTTP ${response.status}`), { status: response.status });
  return data;
}

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};
const button = (label, className, onClick) => {
  const b = el('button', className, label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
};
const KIND_LABEL = {
  layoffs: 'Layoffs', 'earnings-miss': 'Weak results', 'earnings-beat': 'Strong results', earnings: 'Results', recall: 'Problem', legal: 'Legal',
  leadership: 'Leadership', acquisition: 'Deal', product: 'Launch', partnership: 'Partner', 'analyst-up': 'Upgrade', 'analyst-down': 'Downgrade',
  capital: 'Dividend', expansion: 'Growth', other: 'News'
};
const EVENT_TEXT = {
  hired: (d) => `Hired at ${d.company} as ${d.title} — ${money(d.salary)} a year.`,
  paid: (d) => `Paid ${money(d.amount)} for ${d.day}.`,
  bonus: (d) => `Bonus ${money(d.amount)}: "${d.headline}".`,
  'check-in': (d) => `Quarter ${d.quarter} check-in: performance ${d.performance} (${d.rating}).`,
  review: (d) => `Year ${d.year} review: ${d.label} (${d.performance}). ${d.promoted ? `Promoted to ${d.title}! ` : ''}${d.raise ? `Raise ${Math.round(d.raise * 100)}%. ` : ''}${d.bonus ? `Bonus ${money(d.bonus)}. ` : ''}${d.letGo ? 'Let go after two warnings.' : d.warning ? 'Warning: improve next year.' : ''}`,
  'kept-job': (d) => `Layoffs at the company ("${d.headline}") — you kept your job.`,
  'laid-off': (d) => `Laid off ("${d.headline}"). Severance ${money(d.severance)}.`,
  quit: (d) => `You left ${d.company}.`
};
const ago = (t) => {
  const h = (Date.now() - t) / 3_600_000;
  return h < 1 ? 'just now' : h < 24 ? `${Math.floor(h)} h ago` : `${Math.floor(h / 24)} d ago`;
};

/**
 * Work Life: a job at a real company, in real time. Today (your missions from
 * the company's news, a mini-game, your job), Job search (companies, a role,
 * the interview) and Career (what happened, your wallet).
 */
export class WorkGame {
  constructor(host, { onClose, account }) {
    this.onClose = onClose;
    this.account = account;
    this.tab = 'today';
    this.root = el('div', 'mk wk');
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Work Life');
    this.root.innerHTML = `
      <header class="mk__head">
        <div class="mk__title"><span aria-hidden="true">💼</span> Work Life</div>
        <div class="mk__clock" data-clock></div>
        <div class="mk__stats" data-stats></div>
        <button type="button" class="mk__close" data-close aria-label="Back to the games">✕</button>
      </header>
      <nav class="mk__tabs" role="tablist" data-tabs></nav>
      <main class="mk__body" data-body></main>
      <p class="mk__status" data-status role="status" aria-live="polite"></p>`;
    host.append(this.root);
    this.$ = (s) => this.root.querySelector(s);
    this.$('[data-close]').addEventListener('click', () => this.close());
    this.root.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape' && !this.root.querySelector('.wk-modal')) this.close();
    });
  }

  async open() {
    await this.reload();
  }

  close() {
    this.root.remove();
    this.onClose?.();
  }

  say(text, kind = '') {
    const s = this.$('[data-status]');
    s.textContent = text;
    s.className = `mk__status ${kind}`;
  }

  async reload() {
    if (!this.account) {
      this.renderHead(null);
      this.$('[data-body]').replaceChildren(this.notice('Sign in to work', 'Open Your hero → Account to sign in. Your job, pay and career are saved to your account.'));
      return;
    }
    try {
      this.state = await call('work/today');
    } catch (error) {
      this.say(error.message, 'is-error');
      return;
    }
    if (!this.state.job && this.tab === 'today') this.tab = 'jobs';
    this.renderHead(this.state);
    this.renderTabs();
    await this.renderBody();
  }

  renderHead(s) {
    const clock = this.$('[data-clock]');
    const stats = this.$('[data-stats]');
    stats.replaceChildren();
    clock.textContent = s?.job ? `${s.job.title} · ${s.job.company}` : s ? 'Looking for a job' : '';
    if (!s) return;
    const stat = (label, value) => {
      const box = el('div', 'mk__stat');
      box.append(el('small', null, label), el('strong', null, value));
      stats.append(box);
    };
    stat('Wallet', money(s.wallet));
    if (s.job) {
      stat('Salary', `${money(s.job.salary)}/yr`);
      stat('Review in', `${Math.max(0, Math.ceil((s.job.reviewDue - Date.now()) / 86_400_000))} days`);
    }
  }

  renderTabs() {
    const tabs = this.$('[data-tabs]');
    tabs.replaceChildren();
    for (const [id, label] of [['today', 'Today'], ['jobs', 'Job search'], ['career', 'Career']]) {
      const b = button(label, `mk__tab${this.tab === id ? ' is-active' : ''}`, async () => {
        this.tab = id;
        this.renderTabs();
        await this.renderBody();
      });
      b.dataset.tab = id;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(this.tab === id));
      tabs.append(b);
    }
  }

  async renderBody() {
    const body = this.$('[data-body]');
    body.replaceChildren();
    if (this.tab === 'jobs') return this.renderJobs(body);
    if (this.tab === 'career') return this.renderCareer(body);
    return this.renderToday(body);
  }

  notice(title, text) {
    const box = el('div', 'mk__notice');
    box.append(el('h2', null, title), el('p', null, text));
    return box;
  }

  /* ---- Today ---- */

  renderToday(body) {
    const s = this.state;
    if (!s.job) {
      const last = s.last;
      const box = this.notice(
        last ? (last.status === 'laid_off' ? 'You were laid off' : last.status === 'let_go' ? 'You were let go' : 'Between jobs') : 'Find your first job',
        last ? `Your last job: ${last.title} at ${last.company}. Find a new one in Job search.` : 'Pick a real company, a role, and pass the interview. Then real news about your company becomes your daily work.'
      );
      box.append(button('Find a job', 'mk__btn mk__btn--primary mk__btn--big', () => {
        this.tab = 'jobs';
        this.renderTabs();
        this.renderBody();
      }));
      body.append(box);
      return;
    }
    const j = s.job;
    const card = el('section', 'wk-job');
    const perf = j.performance;
    card.append(
      el('h2', null, `${j.title}`),
      el('p', 'mk__muted', `${j.company} (${j.symbol}) · ${j.industry} · year ${j.year}${j.lastRating ? ` · last review: ${j.lastRating}` : ''}${j.warnings ? ` · ⚠ ${j.warnings} warning` : ''}`)
    );
    const meter = el('div', 'wk-meter');
    const fill = el('span', 'wk-meter__fill');
    fill.style.width = `${perf.performance}%`;
    meter.append(fill);
    const words = { exceeds: 'exceeds expectations', meets: 'meets expectations', below: 'needs improvement', unsatisfactory: 'unsatisfactory' }[perf.rating];
    card.append(
      el('p', null, perf.total ? `Performance this year: ${perf.performance} — ${words} (${perf.done} of ${perf.total} tasks done)` : 'Performance this year: no finished tasks yet. Every task counts toward your yearly review.'),
      meter
    );
    if (!perf.total) fill.style.width = '0%';
    card.append(el('p', 'mk__muted', j.paidToday ? `Paid today: ${money(j.dayPay)}.` : `Finish a task today to be paid ${money(j.dayPay)}.`));
    body.append(card);

    const open = s.missions.filter((m) => m.status === 'open');
    body.append(el('h3', 'mk__h', open.length ? `Today's tasks (${open.length} to do)` : 'All done for today — come back tomorrow'));
    const list = el('div', 'wk-missions');
    for (const m of s.missions) list.append(this.missionCard(m));
    body.append(list);

    if (s.news?.length) {
      body.append(el('h3', 'mk__h', `${j.company} in the news`));
      const ul = el('ul', 'wk-news');
      for (const n of s.news) {
        const li = el('li');
        li.append(el('span', 'wk-tag', KIND_LABEL[n.kind] ?? 'News'));
        if (n.url) {
          const a = el('a', null, n.headline);
          a.href = n.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          li.append(a);
        } else li.append(el('span', null, n.headline));
        li.append(el('small', 'mk__muted', ` · ${n.source ?? ''} · ${ago(n.created)}`));
        ul.append(li);
      }
      body.append(ul);
    } else if (!s.newsReady) {
      body.append(el('p', 'mk__muted', 'Company news is not set up on this server yet, so today is routine work.'));
    }
  }

  missionCard(m) {
    const card = el('article', `wk-mission is-${m.status}`);
    card.dataset.mission = String(m.id);
    card.dataset.kind = m.kind;
    const head = el('div', 'wk-mission__head');
    head.append(el('strong', null, m.title), el('span', 'wk-tag', m.kind === 'choice' ? 'Decision' : m.kind === 'minigame' ? 'Mini-game' : 'Writing'));
    card.append(head);
    const news = m.public.news;
    if (news) {
      const p = el('p', 'wk-mission__news');
      p.append('📰 ');
      if (news.url) {
        const a = el('a', null, news.headline);
        a.href = news.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        p.append(a);
      } else p.append(news.headline);
      card.append(p);
    }
    if (m.status !== 'open') {
      card.append(el('p', 'wk-mission__result', m.status === 'missed' ? 'Missed — the deadline passed.' : `Score ${m.score}. ${m.feedback ?? ''}`));
      return card;
    }
    const submit = async (answer, buttons = []) => {
      for (const b of buttons) b.disabled = true;
      this.say(m.kind === 'written' ? 'Grading…' : '');
      try {
        const r = await call('work/mission', { id: m.id, answer });
        this.say(`Score ${r.score}.${r.paid ? ` Paid ${money(r.paid)} for today.` : ''}`, 'is-ok');
        await this.reload();
      } catch (error) {
        for (const b of buttons) b.disabled = false;
        this.say(error.message, 'is-error');
      }
    };

    if (m.kind === 'choice') {
      card.append(el('p', null, m.public.situation));
      const opts = el('div', 'wk-options');
      const buttons = m.public.options.map((text, i) => button(text, 'wk-option', () => submit({ option: i }, buttons)));
      buttons.forEach((b, i) => (b.dataset.option = String(i)));
      opts.append(...buttons);
      card.append(opts);
    } else if (m.kind === 'written') {
      card.append(el('p', null, m.public.prompt));
      const area = el('textarea', 'wk-text');
      area.rows = 5;
      area.maxLength = 1200;
      area.setAttribute('aria-label', 'Your note');
      const count = el('small', 'mk__muted', '0 words');
      area.addEventListener('input', () => (count.textContent = `${area.value.split(/\s+/).filter(Boolean).length} words`));
      const send = button('Hand it in', 'mk__btn mk__btn--primary', () => submit({ text: area.value }, [send]));
      card.append(area, count, send);
    } else {
      card.append(el('p', 'mk__muted', m.public.how));
      card.append(this.minigame(m, submit));
    }
    return card;
  }

  minigame(m, submit) {
    const box = el('div', 'wk-game');
    const g = m.public;
    if (g.kind === 'triage') {
      const order = g.items.map((t) => t.id);
      const list = el('ol', 'wk-triage');
      const draw = () => {
        list.replaceChildren();
        order.forEach((id, i) => {
          const t = g.items.find((x) => x.id === id);
          const li = el('li');
          li.dataset.item = id;
          li.append(el('span', null, `${t.label} — ${t.people} people, ${t.hours} h left`));
          const up = button('↑', 'mk__chip', () => {
            if (i > 0) [order[i - 1], order[i]] = [order[i], order[i - 1]];
            draw();
          });
          const down = button('↓', 'mk__chip', () => {
            if (i < order.length - 1) [order[i + 1], order[i]] = [order[i], order[i + 1]];
            draw();
          });
          up.setAttribute('aria-label', `Move ${t.label} up`);
          down.setAttribute('aria-label', `Move ${t.label} down`);
          li.append(up, down);
          list.append(li);
        });
      };
      draw();
      const go = button('Submit order', 'mk__btn mk__btn--primary', () => submit({ order: [...order] }, [go]));
      box.append(list, go);
    } else if (g.kind === 'spot-error') {
      const table = el('table', 'mk__table');
      const head = el('tr');
      for (const h of ['Wrong?', '', 'A', 'B', 'Total']) head.append(el('th', null, h));
      table.append(head);
      const picked = new Set();
      for (const r of g.rows) {
        const tr = el('tr');
        const cb = el('input');
        cb.type = 'checkbox';
        cb.dataset.row = r.id;
        cb.setAttribute('aria-label', `${r.label} is wrong`);
        cb.addEventListener('change', () => (cb.checked ? picked.add(r.id) : picked.delete(r.id)));
        const c = el('td');
        c.append(cb);
        tr.append(c, el('td', null, r.label), el('td', 'mk__num', String(r.a)), el('td', 'mk__num', String(r.b)), el('td', 'mk__num', String(r.total)));
        table.append(tr);
      }
      const go = button('Submit', 'mk__btn mk__btn--primary', () => submit({ rows: [...picked] }, [go]));
      box.append(table, go);
    } else {
      box.append(el('p', null, g.question));
      const input = el('input', 'mk__qty');
      input.type = 'number';
      input.setAttribute('aria-label', `Your answer (${g.unit})`);
      input.dataset.estimate = '';
      const go = button('Submit', 'mk__btn mk__btn--primary', () => submit({ value: Number(input.value) }, [go]));
      box.append(input, el('span', 'mk__muted', ` ${g.unit} `), go);
    }
    return box;
  }

  /* ---- Job search ---- */

  async renderJobs(body) {
    if (this.state.job) {
      body.append(el('p', 'mk__muted', `You work at ${this.state.job.company}. To apply somewhere else, quit first (Career).`));
    }
    const bar = el('div', 'mk__add');
    const q = el('input', 'mk__search');
    q.type = 'search';
    q.placeholder = 'Search 500 companies…';
    q.setAttribute('aria-label', 'Search companies');
    const sector = el('select', 'mk__search');
    sector.setAttribute('aria-label', 'Sector');
    bar.append(q, sector);
    const list = el('div', 'wk-companies');
    body.append(bar, list);
    let data;
    try {
      data = this.companies ??= await call('work/companies');
    } catch (error) {
      list.append(el('p', 'mk__warn', error.message));
      return;
    }
    sector.append(new Option('All sectors', ''), ...data.sectors.map((s) => new Option(s, s)));
    const draw = () => {
      const needle = q.value.toLowerCase();
      const rows = data.companies.filter((c) => (!sector.value || c.sector === sector.value) && (!needle || `${c.symbol} ${c.name} ${c.industry}`.toLowerCase().includes(needle))).slice(0, 60);
      list.replaceChildren();
      for (const c of rows) {
        const card = button('', 'wk-company', () => this.pickRole(c, data));
        card.dataset.company = c.symbol;
        card.append(el('strong', null, c.name), el('small', 'mk__muted', `${c.symbol} · ${c.industry} · ${c.hq}`));
        if (c.hiringFrom) card.append(el('span', 'wk-tag wk-tag--warn', `Not hiring until ${new Date(c.hiringFrom).toISOString().slice(0, 10)}`));
        if (c.players) card.append(el('span', 'wk-tag', `${c.players} player${c.players === 1 ? '' : 's'} work here`));
        list.append(card);
      }
      if (!rows.length) list.append(el('p', 'mk__muted', 'No companies match.'));
    };
    q.addEventListener('input', draw);
    sector.addEventListener('change', draw);
    draw();
  }

  pickRole(company, data) {
    if (this.state.job) return this.say('Quit your job first (Career) to apply somewhere else.', 'is-error');
    const modal = this.modal(`Apply to ${company.name}`);
    modal.body.append(el('p', 'mk__muted', 'Pick the job you want. Everyone starts as an Intern, Junior or Associate depending on the interview.'));
    const grid = el('div', 'wk-roles');
    for (const r of data.roles) {
      const b = button('', 'wk-role', async () => {
        for (const x of grid.querySelectorAll('button')) x.disabled = true;
        try {
          const app = await call('work/apply', { symbol: company.symbol, role: r.id });
          this.interview(modal, app);
        } catch (error) {
          for (const x of grid.querySelectorAll('button')) x.disabled = false;
          modal.say(error.message);
        }
      });
      b.dataset.role = r.id;
      b.append(el('span', 'wk-role__icon', r.icon), el('strong', null, r.name), el('small', 'mk__muted', `From ${money(r.startSalary)} a year`));
      grid.append(b);
    }
    modal.body.append(grid);
  }

  interview(modal, app) {
    modal.title.textContent = `Interview: ${app.role} at ${app.company}`;
    modal.body.replaceChildren(el('p', 'mk__muted', 'Three questions. Pick the answer you think is best.'));
    const answers = [];
    app.questions.forEach((q, i) => {
      const box = el('fieldset', 'wk-question');
      box.append(el('legend', null, `${i + 1}. ${q.q}`));
      q.options.forEach((text, k) => {
        const label = el('label', 'wk-answer');
        const radio = el('input');
        radio.type = 'radio';
        radio.name = `q${i}`;
        radio.value = String(k);
        radio.addEventListener('change', () => (answers[i] = k));
        label.append(radio, ` ${text}`);
        box.append(label);
      });
      modal.body.append(box);
    });
    const go = button('Finish the interview', 'mk__btn mk__btn--primary', async () => {
      if (answers.filter((a) => a != null).length < app.questions.length) return modal.say('Answer every question.');
      go.disabled = true;
      try {
        const r = await call('work/interview', { application: app.application, answers });
        modal.body.replaceChildren(
          this.notice(r.hired ? `You're hired! ${r.title}` : 'Not this time', r.hired ? `${r.company} offers ${money(r.salary)} a year (interview score ${r.score}). Your tasks start today.` : r.message)
        );
        const done = button(r.hired ? 'Start working' : 'Back to the list', 'mk__btn mk__btn--primary', async () => {
          modal.close();
          this.companies = null;
          this.tab = r.hired ? 'today' : 'jobs';
          await this.reload();
        });
        done.dataset.done = '';
        modal.body.append(done);
      } catch (error) {
        go.disabled = false;
        modal.say(error.message);
      }
    });
    go.dataset.finish = '';
    modal.body.append(go);
  }

  modal(titleText) {
    const back = el('div', 'wk-modal');
    const card = el('div', 'wk-modal__card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    const title = el('h2', null, titleText);
    const close = button('✕', 'mk__close', () => back.remove());
    close.setAttribute('aria-label', 'Close');
    const body = el('div', 'wk-modal__body');
    const status = el('p', 'mk__warn');
    card.append(close, title, body, status);
    back.append(card);
    this.root.append(back);
    return { body, title, close: () => back.remove(), say: (t) => (status.textContent = t) };
  }

  /* ---- Career ---- */

  async renderCareer(body) {
    const s = this.state;
    if (s.job) {
      const quit = button('Quit this job', 'mk__btn mk__btn--sell', async () => {
        if (!confirm(`Leave ${s.job.company}? You lose your title and salary there.`)) return;
        try {
          await call('work/quit', {});
          this.say('You quit.', 'is-ok');
          await this.reload();
        } catch (error) {
          this.say(error.message, 'is-error');
        }
      });
      body.append(quit);
    }
    body.append(el('h3', 'mk__h', 'What happened'));
    const ul = el('ul', 'mk__trades');
    for (const e of s.events) ul.append(el('li', null, `${new Date(e.at).toLocaleDateString()} · ${(EVENT_TEXT[e.kind] ?? (() => e.kind))(e.data)}`));
    if (!s.events.length) ul.append(el('li', 'mk__muted', 'Nothing yet.'));
    body.append(ul);
    const { balance, ledger } = await call('wallet').catch(() => ({ balance: 0, ledger: [] }));
    body.append(el('h3', 'mk__h', `Wallet: ${money(balance)}`), el('p', 'mk__muted', 'Your game money. Invest it in the Stock Market Challenge (Portfolio → Add from wallet).'));
    const led = el('ul', 'mk__trades');
    for (const l of ledger) led.append(el('li', null, `${new Date(l.at).toLocaleDateString()} · ${l.delta >= 0 ? '+' : '−'}${money(Math.abs(l.delta))} ${l.reason} → ${money(l.balance)}`));
    if (!ledger.length) led.append(el('li', 'mk__muted', 'No money yet: finish a task to get paid.'));
    body.append(led);
  }
}
