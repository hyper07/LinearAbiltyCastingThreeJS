import { releases } from '../platform/releasesClient.js';

/**
 * A game package's development view, for the platform admin (opened from the game's page):
 *
 *   Changes   every commit touching games/<code>/ that production does not have, newest
 *             first (hash, date, author, message, files, +/- lines), each with its diff file
 *             by file; tick the ones to ship, choose patch/minor/major, edit the notes
 *             (prefilled from the ticked messages) and deploy. All ticked = the draft as
 *             committed. A change that does not apply on top of the others stops the deploy,
 *             names the change and git's reason, and nothing changes for players.
 *   History   every release (what it added over the one before, its base and picked
 *             changes, who, when), which one is live, "Make this live" (instant: no rebuild),
 *             and the log of deploys and rollbacks.
 *
 * Talks to /api/releases (server/releases.js). Everything shown from git is set as text.
 */
const STYLE = `
.relp{position:fixed;inset:0;z-index:2000;background:rgba(8,10,18,.72);display:flex;align-items:center;justify-content:center;font:13px/1.45 system-ui,sans-serif;color:#e8ebf5}
.relp__box{width:min(1100px,96vw);height:min(820px,94vh);background:#161a26;border:1px solid #2c3346;border-radius:14px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.relp__head{display:flex;gap:12px;align-items:center;padding:12px 16px;border-bottom:1px solid #2c3346}
.relp__head h2{margin:0;font-size:16px;flex:1}
.relp__head small{color:#9aa3bb;font-weight:400;margin-left:8px}
.relp button{font:inherit;color:inherit;background:#252c3f;border:1px solid #3a4360;border-radius:8px;padding:5px 11px;cursor:pointer}
.relp button:hover{background:#2f3850}
.relp button[disabled]{opacity:.5;cursor:default}
.relp button.relp__go{background:#2f7d4f;border-color:#3d9b64}
.relp__tabs{display:flex;gap:4px;padding:8px 16px 0}
.relp__tabs button[aria-selected=true]{background:#3a4568}
.relp__body{flex:1;overflow:auto;padding:12px 16px}
.relp__list{list-style:none;margin:0;padding:0}
.relp__change{border:1px solid #2c3346;border-radius:10px;margin:0 0 8px;padding:8px 10px;background:#1b2030}
.relp__row{display:flex;gap:10px;align-items:baseline}
.relp__row label{display:flex;gap:8px;align-items:baseline;flex:1;cursor:pointer;min-width:0}
.relp__subject{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.relp__hash{font-family:ui-monospace,Menlo,monospace;color:#8fb7ff}
.relp__meta{color:#9aa3bb;font-size:12px;white-space:nowrap}
.relp__plus{color:#6fd08c}.relp__minus{color:#ff8a8a}
.relp__files{margin:6px 0 0 26px;color:#9aa3bb;font-size:12px}
.relp__diff{margin:8px 0 0}
.relp__diff details{margin:0 0 6px;border:1px solid #2c3346;border-radius:8px;background:#11141d}
.relp__diff summary{cursor:pointer;padding:5px 8px;font-family:ui-monospace,Menlo,monospace;font-size:12px}
.relp__diff pre{margin:0;padding:6px 8px;overflow:auto;max-height:420px;font:12px/1.4 ui-monospace,Menlo,monospace;white-space:pre}
.relp__diff .add{color:#7fe0a0;background:rgba(60,160,90,.12);display:block}
.relp__diff .del{color:#ff9d9d;background:rgba(200,60,60,.12);display:block}
.relp__diff .hunk{color:#8fb7ff;display:block}
.relp__deploy{border-top:1px solid #2c3346;padding:10px 16px;display:grid;grid-template-columns:1fr auto;gap:8px 14px;align-items:start}
.relp__deploy textarea{grid-column:1;width:100%;min-height:62px;box-sizing:border-box;background:#11141d;color:inherit;border:1px solid #3a4360;border-radius:8px;padding:6px 8px;font:12px/1.4 ui-monospace,Menlo,monospace}
.relp__side{display:flex;flex-direction:column;gap:8px;align-items:stretch;min-width:220px}
.relp__bump{display:flex;gap:10px}
.relp__msg{grid-column:1/-1;margin:0;font-size:12px}
.relp__msg.bad{color:#ff8a8a}.relp__msg.good{color:#6fd08c}
.relp__rel{border:1px solid #2c3346;border-radius:10px;padding:10px 12px;margin:0 0 10px;background:#1b2030}
.relp__rel h3{margin:0 0 4px;font-size:14px;display:flex;gap:10px;align-items:center}
.relp__live{background:#2f7d4f;border-radius:6px;padding:0 6px;font-size:11px}
.relp__notes{white-space:pre-wrap;margin:6px 0;color:#cfd5e6}
.relp__rel ul{margin:4px 0 0;padding-left:18px;color:#cfd5e6}
.relp__empty{color:#9aa3bb}
`;

const el = (tag, className, text) => {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
};
const when = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

export class ReleasePanel {
  /** @param {HTMLElement} host @param {{ game: { id: string, title: string, package: string }, onPlayDraft?: () => void, onChanged?: () => void }} options */
  constructor(host, { game, onPlayDraft = () => {}, onChanged = () => {} }) {
    this.host = host;
    this.game = game;
    this.ref = game.package;
    this.onPlayDraft = onPlayDraft;
    this.onChanged = onChanged;
    this.selected = new Set();
    this.notesEdited = false;
    this.tab = 'changes';
    this.data = null;
  }

  open() {
    if (!document.getElementById('relp-style')) {
      const style = el('style');
      style.id = 'relp-style';
      style.textContent = STYLE;
      document.head.append(style);
    }
    this.root = el('div', 'relp');
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', `${this.game.title}: changes and releases`);
    const box = el('div', 'relp__box');
    const head = el('div', 'relp__head');
    this.titleEl = el('h2', null, this.game.title);
    const draft = el('button', null, '🧪 Play draft');
    draft.addEventListener('click', () => {
      this.close();
      this.onPlayDraft();
    });
    const refresh = el('button', null, '↻');
    refresh.title = 'Reload';
    refresh.addEventListener('click', () => this.load());
    const x = el('button', null, '✕');
    x.setAttribute('aria-label', 'Close');
    x.addEventListener('click', () => this.close());
    head.append(this.titleEl, draft, refresh, x);
    const tabs = el('div', 'relp__tabs');
    this.tabButtons = {};
    for (const [id, label] of [['changes', 'Changes'], ['history', 'History']]) {
      const b = el('button', null, label);
      b.setAttribute('role', 'tab');
      b.addEventListener('click', () => {
        this.tab = id;
        this.render();
      });
      this.tabButtons[id] = b;
      tabs.append(b);
    }
    this.body = el('div', 'relp__body');
    this.deployBar = this.buildDeployBar();
    box.append(head, tabs, this.body, this.deployBar);
    this.root.append(box);
    this.root.addEventListener('click', (e) => e.target === this.root && this.close());
    this._key = (e) => e.key === 'Escape' && this.close();
    window.addEventListener('keydown', this._key);
    this.host.append(this.root);
    this.load();
    return this;
  }

  close() {
    window.removeEventListener('keydown', this._key);
    this.root?.remove();
  }

  async load() {
    this.body.replaceChildren(el('p', 'relp__empty', 'Loading…'));
    try {
      this.data = await releases.history(this.ref);
    } catch (error) {
      this.data = null;
      this.body.replaceChildren(el('p', 'relp__msg bad', error.status === 401 ? 'The platform admin\'s id and password are needed.' : `Could not load: ${error.message}`));
      return;
    }
    const pending = new Set((this.data.pending ?? []).map((c) => c.hash));
    for (const h of [...this.selected]) if (!pending.has(h)) this.selected.delete(h);
    const live = this.data.current?.version;
    this.titleEl.replaceChildren(document.createTextNode(this.game.title), el('small', null, live ? `production ${live}` : 'no production release yet'));
    this.render();
  }

  render() {
    for (const [id, b] of Object.entries(this.tabButtons)) b.setAttribute('aria-selected', String(id === this.tab));
    this.deployBar.hidden = this.tab !== 'changes';
    if (!this.data) return;
    if (this.tab === 'changes') this.renderChanges();
    else this.renderHistory();
    this.syncDeployBar();
  }

  renderChanges() {
    const pending = this.data.pending;
    if (pending == null) {
      this.body.replaceChildren(el('p', 'relp__msg bad', `Changes need git on this server: ${this.data.gitError ?? 'unavailable'}. Use npm run game:changes on a checkout.`));
      return;
    }
    if (!pending.length) {
      this.body.replaceChildren(el('p', 'relp__empty', 'Nothing to deploy: production has every committed change to this game. (Uncommitted edits are never deployed.)'));
      return;
    }
    const top = el('div', 'relp__row');
    const allLabel = el('label');
    const all = el('input');
    all.type = 'checkbox';
    all.checked = this.selected.size === pending.length;
    all.addEventListener('change', () => {
      for (const c of pending) all.checked ? this.selected.add(c.hash) : this.selected.delete(c.hash);
      this.renderChanges();
      this.syncDeployBar();
    });
    allLabel.append(all, el('span', null, `${pending.length} change${pending.length === 1 ? '' : 's'} in the draft, not in production (newest first)`));
    top.append(allLabel);
    const list = el('ul', 'relp__list');
    for (const c of pending) list.append(this.changeItem(c));
    this.body.replaceChildren(top, list);
  }

  changeItem(c) {
    const li = el('li', 'relp__change');
    const row = el('div', 'relp__row');
    const label = el('label');
    const box = el('input');
    box.type = 'checkbox';
    box.checked = this.selected.has(c.hash);
    box.addEventListener('change', () => {
      box.checked ? this.selected.add(c.hash) : this.selected.delete(c.hash);
      this.syncDeployBar();
    });
    label.append(box, el('span', 'relp__hash', c.short), el('span', 'relp__subject', c.subject));
    const meta = el('span', 'relp__meta');
    meta.append(el('span', null, `${c.author} · ${when(c.date)} · `), el('span', 'relp__plus', `+${c.added}`), document.createTextNode(' '), el('span', 'relp__minus', `−${c.removed}`));
    const diffBtn = el('button', null, 'Diff');
    const diff = el('div', 'relp__diff');
    diff.hidden = true;
    diffBtn.addEventListener('click', async () => {
      if (!diff.hidden) {
        diff.hidden = true;
        return;
      }
      diff.hidden = false;
      if (diff.dataset.loaded) return;
      diff.replaceChildren(el('p', 'relp__empty', 'Loading the diff…'));
      try {
        const d = await releases.diff(this.ref, c.hash);
        diff.dataset.loaded = '1';
        diff.replaceChildren(...(d.body ? [el('p', 'relp__notes', d.body)] : []), ...d.files.map((f, i) => this.fileDiff(f, i < 3)));
      } catch (error) {
        diff.replaceChildren(el('p', 'relp__msg bad', error.message));
      }
    });
    row.append(label, meta, diffBtn);
    const files = el('div', 'relp__files', c.files.map((f) => `${f.path.split('/').slice(2).join('/')} (+${f.added} −${f.removed})`).join(' · '));
    li.append(row, files, diff);
    return li;
  }

  fileDiff(f, open) {
    const d = el('details');
    d.open = open;
    d.append(el('summary', null, f.from && f.from !== f.path ? `${f.from} → ${f.path}` : f.path));
    const pre = el('pre');
    for (const line of f.diff.split('\n')) {
      const cls = line.startsWith('@@') ? 'hunk' : line.startsWith('+') && !line.startsWith('+++') ? 'add' : line.startsWith('-') && !line.startsWith('---') ? 'del' : null;
      if (cls) pre.append(el('span', cls, line));
      else pre.append(document.createTextNode(`${line}\n`));
    }
    d.append(pre);
    return d;
  }

  buildDeployBar() {
    const bar = el('div', 'relp__deploy');
    this.notes = el('textarea');
    this.notes.placeholder = 'Release notes (filled from the ticked changes; edit freely)';
    this.notes.addEventListener('input', () => (this.notesEdited = true));
    const side = el('div', 'relp__side');
    const bump = el('div', 'relp__bump');
    this.bump = 'patch';
    for (const kind of ['patch', 'minor', 'major']) {
      const l = el('label');
      const r = el('input');
      r.type = 'radio';
      r.name = 'relp-bump';
      r.value = kind;
      r.checked = kind === 'patch';
      r.addEventListener('change', () => {
        this.bump = kind;
        this.syncDeployBar();
      });
      l.append(r, document.createTextNode(` ${kind}`));
      bump.append(l);
    }
    this.goBtn = el('button', 'relp__go', 'Deploy to production');
    this.goBtn.addEventListener('click', () => this.deploy());
    side.append(bump, this.goBtn);
    this.msg = el('p', 'relp__msg');
    bar.append(this.notes, side, this.msg);
    return bar;
  }

  nextVersion() {
    const versions = (this.data?.releases ?? []).map((r) => r.version.split('.').map(Number));
    versions.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    const v = versions.at(-1);
    if (!v) return null;
    if (this.bump === 'major') return `${v[0] + 1}.0.0`;
    if (this.bump === 'minor') return `${v[0]}.${v[1] + 1}.0`;
    return `${v[0]}.${v[1]}.${v[2] + 1}`;
  }

  syncDeployBar() {
    if (!this.data || !this.goBtn) return;
    const pending = this.data.pending ?? [];
    const chosen = pending.filter((c) => this.selected.has(c.hash));
    const all = pending.length > 0 && chosen.length === pending.length;
    const first = !this.data.current;
    const next = this.nextVersion();
    this.goBtn.disabled = Boolean(this.data.busy) || (!first && !chosen.length);
    this.goBtn.textContent = first ? 'Make the first release (the draft as committed)' : all ? `Deploy the whole draft as ${next}` : `Deploy ${chosen.length} selected as ${next}`;
    if (!this.notesEdited) this.notes.value = chosen.slice().reverse().map((c) => `- ${c.subject}`).join('\n');
    if (this.data.busy) this.say(`Busy: ${this.data.busy}`, 'bad');
  }

  say(text, kind = '') {
    this.msg.className = `relp__msg ${kind}`;
    this.msg.textContent = text;
  }

  async deploy() {
    const pending = this.data.pending ?? [];
    const chosen = pending.filter((c) => this.selected.has(c.hash)).map((c) => c.hash);
    const all = !this.data.current || (pending.length > 0 && chosen.length === pending.length);
    const what = all ? 'the whole committed draft' : `${chosen.length} change(s)`;
    if (!confirm(`Deploy ${what} of ${this.game.title} to players?`)) return;
    this.goBtn.disabled = true;
    this.say('Building the release (the game alone; this takes a little while)…');
    try {
      const { release } = await releases.deploy(this.ref, { ...(all ? { all: true } : { picks: chosen }), bump: this.bump, notes: this.notes.value });
      this.say(`Players now get ${release.version} (${release.files.length} files).`, 'good');
      this.selected.clear();
      this.notesEdited = false;
      this.onChanged();
      await this.load();
    } catch (error) {
      const c = error.conflict;
      this.say(c ? `Nothing deployed: change ${c.hash.slice(0, 9)} ("${c.subject}") conflicts${c.files.length ? ` in ${c.files.join(', ')}` : ''}. ${c.reason}` : `Nothing deployed: ${error.message}`, 'bad');
      this.goBtn.disabled = false;
    }
  }

  renderHistory() {
    const { releases: list = [], current, log = [], pending } = this.data;
    const out = [];
    if (pending?.length) out.push(el('p', 'relp__empty', `${pending.length} change${pending.length === 1 ? ' is' : 's are'} in the draft and not in production (see Changes).`));
    if (!list.length) out.push(el('p', 'relp__empty', 'No releases yet.'));
    for (const r of list) {
      const card = el('div', 'relp__rel');
      const h = el('h3', null, r.version);
      if (r.version === current?.version) h.append(el('span', 'relp__live', 'LIVE'));
      else {
        const b = el('button', null, 'Make this live');
        b.title = 'Instant: players get this release again (no rebuild)';
        b.addEventListener('click', async () => {
          if (!confirm(`Players get ${this.game.title} ${r.version} from now on?`)) return;
          b.disabled = true;
          try {
            await releases.rollback(this.ref, r.version);
            this.onChanged();
            await this.load();
          } catch (error) {
            b.disabled = false;
            alert(error.message);
          }
        });
        h.append(b);
      }
      card.append(h);
      const src = r.source ?? {};
      card.append(el('div', 'relp__meta', `${when(r.date)} · by ${r.deployedBy} · ${src.mode ?? ''} from ${String(src.base ?? '').slice(0, 9)}${src.picks?.length ? ` + ${src.picks.length} picked` : ''} · ${r.files} files, ${(r.bytes / 1048576).toFixed(2)} MB${r.previous ? ` · after ${r.previous}` : ''}`));
      if (r.notes) card.append(el('div', 'relp__notes', r.notes));
      if (r.added?.length) {
        const ul = el('ul');
        for (const c of r.added) {
          const li = el('li');
          li.append(el('span', 'relp__hash', c.hash.slice(0, 9)), document.createTextNode(` ${c.subject}`));
          ul.append(li);
        }
        card.append(el('div', 'relp__meta', `Added over ${r.previous ?? 'nothing'}:`), ul);
      }
      out.push(card);
    }
    if (log.length) {
      const card = el('div', 'relp__rel');
      card.append(el('h3', null, 'Log'));
      const ul = el('ul');
      for (const e of log.slice().reverse().slice(0, 50)) ul.append(el('li', null, `${when(e.at)} · ${e.action} → ${e.version}${e.from ? ` (from ${e.from})` : ''} · ${e.by}`));
      card.append(ul);
      out.push(card);
    }
    this.body.replaceChildren(...out);
  }
}
