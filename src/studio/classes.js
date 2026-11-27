/**
 * Classes for educators (docs/game-studio.md, "Educators and classes"): any account can run a
 * class, share its private games with it by a join code or link, approve and remove students,
 * end it, and see who played. Students see the class, its teacher's name and its games — never
 * the other students. Nothing here is ever on the home page, in search or in the store.
 */
import { studio } from './studioClient.js';
import { ago, button, el } from './ui.js';

export class ClassesView {
  constructor(page, { join = null, id = null } = {}) {
    this.page = page;
    this.joinCode = join;
    this.openId = id;
    this.root = el('div', { class: 'st-classes' });
  }

  async load() {
    let got;
    try {
      got = await studio.classes();
    } catch (error) {
      return this.page.fail(error);
    }
    if (this.openId) return this.openClass(this.openId);
    const code = el('input', { class: 'st-input', placeholder: 'ABCDE-FGHJK', maxlength: '11', value: this.joinCode ?? '', 'aria-label': 'Class code', autocomplete: 'off' });
    const join = button('Join', async () => {
      try {
        const out = await studio.joinClass(code.value);
        const j = out.joined;
        this.page.toast(j.membership === 'active' ? `You joined ${j.name}!` : j.membership === 'pending-parent' ? `Asked to join ${j.name}: a parent or guardian needs to agree (open the class).` : `Asked to join ${j.name}: your teacher will let you in.`);
        this.joinCode = null;
        this.load();
      } catch (error) {
        this.page.fail(error);
      }
    }, { kind: 'primary' });
    const name = el('input', { class: 'st-input', placeholder: 'Class name (e.g. 4B Science)', maxlength: '60', 'aria-label': 'Class name' });
    const approval = el('select', { class: 'st-input st-input--small', 'aria-label': 'Who lets students in' }, el('option', { value: 'teacher', text: 'I approve each student' }), el('option', { value: 'open', text: 'Anyone with the code joins' }));
    const make = button('Make a class', async () => {
      try {
        const out = await studio.createClass(name.value, approval.value);
        this.openClass(out.class.id);
      } catch (error) {
        this.page.fail(error);
      }
    }, { kind: 'primary' });
    const teaching = el('div', { class: 'st-list' });
    for (const c of got.teaching) {
      teaching.append(el('button', { type: 'button', class: 'st-item st-item--button', onclick: () => this.openClass(c.id) },
        el('b', { text: c.name }), el('span', { class: 'st-note', text: `${c.status === 'ended' ? 'Ended · ' : ''}${c.members} students${c.waiting ? ` · ${c.waiting} waiting` : ''}` })));
    }
    const joined = el('div', { class: 'st-list' });
    for (const c of got.joined) {
      joined.append(el('button', { type: 'button', class: 'st-item st-item--button', onclick: () => this.openClass(c.id) },
        el('b', { text: c.name }), el('span', { class: 'st-note', text: `${c.teacher}${c.membership !== 'active' ? ` · ${c.membership === 'pending-parent' ? 'waiting for a parent' : 'waiting for the teacher'}` : ''}${c.status === 'ended' ? ' · ended' : ''}` })));
    }
    this.root.replaceChildren(
      el('h2', { text: 'Classes' }),
      el('section', { class: 'st-section' }, el('h3', { text: 'Join a class' }), el('p', { class: 'st-note', text: 'Type the code your teacher gave you.' }), el('div', { class: 'st-row' }, code, join)),
      el('section', { class: 'st-section' }, el('h3', { text: 'My classes' }), got.joined.length ? joined : el('p', { class: 'st-note', text: 'None yet.' })),
      el('section', { class: 'st-section' },
        el('h3', { text: 'Teach' }),
        el('p', { class: 'st-note', text: 'Build a game (a simulator, a quiz world, a story) and share it with your class. Private and class games are unlimited on every plan; they never appear on the home page or in search.' }),
        el('div', { class: 'st-row' }, name, approval, make),
        got.teaching.length ? teaching : null));
    if (this.joinCode) code.focus();
  }

  async openClass(id) {
    this.openId = id;
    let c;
    try {
      c = await studio.classInfo(id);
    } catch (error) {
      this.openId = null;
      return this.page.fail(error);
    }
    const back = button('← Classes', () => {
      this.openId = null;
      this.load();
    }, { kind: 'small' });
    // (the teacher's view says teacher: true; a student's has the teacher's NAME there)
    if (c.teacher !== true) return this.studentView(c, back);
    const link = c.joinCode ? `${location.origin}${location.pathname}?join=${encodeURIComponent(c.joinCode)}` : '';
    const redo = () => this.openClass(id);
    const act = (fn) => async () => {
      try {
        await fn();
        redo();
      } catch (error) {
        this.page.fail(error);
      }
    };
    const head = el('div', { class: 'st-row st-row--between' }, el('h2', { text: c.name }), back);
    const code = c.status === 'active'
      ? el('div', { class: 'st-joincode' },
          c.joinCode ? el('div', {}, el('div', { class: 'st-joincode__code', text: c.joinCode }), el('div', { class: 'st-note', text: `Works until ${new Date(c.codeExpires).toLocaleDateString()} · ${c.approval === 'teacher' ? 'you approve each student' : 'anyone with the code joins'}` })) : el('p', { text: 'The code has run out — make a new one.' }),
          el('div', { class: 'st-row' },
            link ? button('Copy join link', async () => {
              try {
                await navigator.clipboard.writeText(link);
                this.page.toast('Link copied');
              } catch {
                this.page.toast(link, { ms: 9000 });
              }
            }, { kind: 'small' }) : null,
            button('New code', act(() => studio.rotateCode(id)), { kind: 'small', title: 'The old code stops working' }),
            button('End class', async () => {
              if (await this.page.confirm('End this class?', 'Students can no longer open its games. You can still see who played.', 'End class')) act(() => studio.endClass(id))();
            }, { kind: 'small' })))
      : el('p', { class: 'st-note', text: 'This class has ended.' });
    const members = el('table', { class: 'st-table' }, el('tr', {}, ['Student', 'Status', ''].map((h) => el('th', { text: h }))));
    for (const m of c.members) {
      members.append(el('tr', {}, el('td', { text: m.name }), el('td', { text: m.status === 'active' ? 'In the class' : m.status === 'pending-parent' ? 'Waiting for their parent' : 'Waiting for you' }),
        el('td', {}, m.status === 'pending-teacher' ? button('Let in', act(() => studio.member(id, m.id, 'approve')), { kind: 'small' }) : null, button('Remove', act(() => studio.member(id, m.id, 'remove')), { kind: 'small' }))));
    }
    let mine = [];
    try {
      mine = await studio.games();
    } catch {
      mine = [];
    }
    const pick = el('select', { class: 'st-input st-input--small', 'aria-label': 'Game' }, mine.map((g) => el('option', { value: g.code, text: g.title })));
    const version = el('select', { class: 'st-input st-input--small', 'aria-label': 'Version' }, el('option', { value: 'current', text: 'This version (pinned)' }), el('option', { value: 'draft', text: 'Always the newest' }));
    const games = el('div', { class: 'st-list' });
    for (const g of c.games) {
      games.append(el('div', { class: 'st-item' }, el('div', {}, el('b', { text: g.title }), el('div', { class: 'st-note', text: g.allowDraft ? 'Always the newest version' : `Pinned to ${String(g.pin).slice(0, 9)}` })),
        el('div', { class: 'st-row' }, button('Play', () => this.page.playFull(g.code), { kind: 'small' }), button('Stop sharing', act(() => studio.unassign(id, g.code)), { kind: 'small' }))));
    }
    const plays = el('table', { class: 'st-table' }, el('tr', {}, ['Student', 'Game', 'Plays', 'Last'].map((h) => el('th', { text: h }))));
    const titles = new Map(c.games.map((g) => [g.code, g.title]));
    for (const p of c.plays) plays.append(el('tr', {}, el('td', { text: p.name }), el('td', { text: titles.get(p.code) ?? p.code }), el('td', { text: String(p.plays) }), el('td', { text: ago(p.last) })));
    this.root.replaceChildren(head, code,
      el('section', { class: 'st-section' }, el('h3', { text: 'Games' }), c.status === 'active' && mine.length ? el('div', { class: 'st-row' }, pick, version, button('Share with the class', act(() => studio.assign(id, pick.value, version.value)), { kind: 'primary' })) : null, games),
      el('section', { class: 'st-section' }, el('h3', { text: `Students (${c.members.length})` }), c.members.length ? el('div', { class: 'st-scroll' }, members) : el('p', { class: 'st-note', text: 'Nobody yet: give them the code or the link.' })),
      el('section', { class: 'st-section' }, el('h3', { text: 'Who played' }), c.plays.length ? el('div', { class: 'st-scroll' }, plays) : el('p', { class: 'st-note', text: 'No plays yet.' })));
  }

  studentView(c, back) {
    const games = el('div', { class: 'st-cards st-cards--3' });
    for (const g of c.games) games.append(el('div', { class: 'st-card' }, el('span', { class: 'st-card__name', text: g.title }), button('▶ Play', () => this.page.playFull(g.code, { classId: c.id }), { kind: 'primary' })));
    const waiting = c.membership === 'pending-parent'
      ? el('div', { class: 'st-banner' }, el('p', { text: 'A parent or guardian needs to agree before you can join this class.' }), button('A grown-up is here', async () => {
          try {
            await this.page.guardian(() => studio.parentApprove(c.id));
            this.openClass(c.id);
          } catch (error) {
            this.page.fail(error);
          }
        }, { kind: 'primary' }))
      : c.membership === 'pending-teacher' ? el('div', { class: 'st-banner', text: 'Your teacher will let you in soon.' }) : null;
    this.root.replaceChildren(
      el('div', { class: 'st-row st-row--between' }, el('h2', { text: c.name }), back),
      el('p', { class: 'st-note', text: `Teacher: ${c.teacher}${c.status === 'ended' ? ' · this class has ended' : ''}` }),
      waiting,
      c.membership === 'active' ? (c.games.length ? games : el('p', { class: 'st-note', text: 'No games shared yet.' })) : null,
      button('Leave this class', async () => {
        if (!(await this.page.confirm('Leave the class?', 'You can join again with a code.', 'Leave'))) return;
        await studio.leaveClass(c.id).catch((e) => this.page.fail(e));
        this.openId = null;
        this.load();
      }, { kind: 'small' }));
  }

  dispose() {}
}
