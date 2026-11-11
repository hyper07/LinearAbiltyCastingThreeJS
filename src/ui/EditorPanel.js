import { CATEGORIES } from '../library/categories.js';
import { platform } from '../platform/index.js';
import { GIFT_TYPES, GOALS, WAVE_MONSTER_KINDS as MONSTER_KINDS, NPC_ROLE_NAMES, PORTAL_COLOR_NAMES, REWARD_RARITIES, describeGoal, normalizeStudy, slugify } from '../levels/Level.js';
import { DIFFICULTIES, STUDY_BONUSES, SUBJECTS, formatQuestions, parseQuestions } from '../npc/Study.js';
import { NPC_ROLES, npcModels } from '../npc/Npcs.js';
import { PORTAL_FRAMES } from '../world/Portals.js';
import { RELIEF_OPTIONS, SURFACE_OPTIONS, TIME_OPTIONS } from '../world/MapPlan.js';

const TOOLS = [
  ['select', 'Select', 'Click an object, then drag the handles. 1 move · 2 rotate · 3 scale · Del delete · Ctrl+D duplicate'],
  ['place', 'Place', 'Pick a model on the right, click the ground to drop it. Q / E turn it first.'],
  ['scatter', 'Scatter', 'Paint many objects at once from your scatter set (or the picked model).'],
  ['erase', 'Erase', 'Drag over objects to remove them.'],
  ['sculpt', 'Sculpt', 'Raise, lower, smooth or flatten the land around the arena. The fighting circle stays flat.'],
  ['paint', 'Paint', 'Paint ground surfaces — anywhere, including the arena floor.'],
  ['spawns', 'Spawns', 'Click to add a point monsters walk in from, drag one to move it, click one to choose which monsters and waves use it. Del removes it.'],
  ['monsters', 'Monsters', 'Click to place a monster that is waiting when the level starts, drag one to move it, click one to change or remove it. Del removes it.'],
  ['portals', 'Portals', 'Click to place a portal, click one to select it, drag to move. Link it to another portal or another level on the right.'],
  ['npcs', 'NPCs', 'Click to place a helper, click one to edit, drag to move. Guides talk (AI or scripted), merchants and healers trade, quest-givers set tasks, tutors ask study questions.']
];

const MONSTER_LABELS = { grunt: 'Cinder Imp', wisp: 'Gloom Wisp', brute: 'Iron Brute', golem: 'Rift Golem', dragon: 'Emberwyrm', rival: 'Rival' };

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * The editor's DOM: top bar, tool strip, and a sidebar whose tabs edit the
 * current tool, the map, the rules and the story. All state lives in the
 * `LevelEditor`; this only reads it and calls its methods.
 */
export class EditorPanel {
  /** @param {import('../editor/LevelEditor.js').LevelEditor} editor */
  constructor(host, editor) {
    this.editor = editor;
    this.tab = 'tool';
    this.category = 'tree';
    this.query = '';
    this.root = document.createElement('div');
    this.root.className = 'editor';
    this.root.hidden = true;
    this.root.innerHTML = `
      <header class="editor__bar">
        <input class="editor__name" data-name maxlength="80" spellcheck="false" aria-label="Level name" />
        <span class="editor__id" data-id></span>
        <span class="editor__status" data-status></span>
        <div class="editor__bar-actions">
          <button type="button" data-act="undo" title="Undo (Ctrl+Z)">Undo</button>
          <button type="button" data-act="redo" title="Redo (Ctrl+Shift+Z)">Redo</button>
          <button type="button" data-act="levels">Levels…</button>
          <button type="button" data-act="new">New</button>
          <button type="button" data-act="import">Import</button>
          <button type="button" data-act="export">Export</button>
          <button type="button" class="is-primary" data-act="save" title="Save (Ctrl+S)">Save</button>
          <button type="button" class="is-primary" data-act="play">Play test</button>
          <button type="button" data-act="exit">Exit</button>
        </div>
      </header>
      <nav class="editor__tools" data-tools></nav>
      <aside class="editor__side">
        <nav class="editor__tabs" data-tabs>
          <button type="button" data-tab="tool">Tool</button>
          <button type="button" data-tab="map">Map</button>
          <button type="button" data-tab="rules">Rules</button>
          <button type="button" data-tab="story">Story</button>
        </nav>
        <div class="editor__pane" data-pane></div>
      </aside>
      <div class="editor__help" data-help></div>
      <div class="editor__modal" data-modal hidden></div>
    `;
    host.appendChild(this.root);
    this.$ = (sel) => this.root.querySelector(sel);

    this.$('[data-tools]').innerHTML = TOOLS.map(
      ([id, label]) => `<button type="button" data-tool="${id}">${label}</button>`
    ).join('');
    this.$('[data-tools]').addEventListener('click', (e) => {
      const id = e.target.closest('[data-tool]')?.dataset.tool;
      if (id) {
        this.tab = 'tool';
        editor.setTool(id);
      }
    });
    this.$('[data-tabs]').addEventListener('click', (e) => {
      const tab = e.target.closest('[data-tab]')?.dataset.tab;
      if (tab) {
        this.tab = tab;
        this.renderPane();
      }
    });
    this.$('[data-name]').addEventListener('change', (e) => {
      const name = e.target.value.trim() || 'Untitled level';
      editor.level.name = name;
      // A level that has never been saved follows its name; a saved one keeps its file.
      if (!this._savedIds?.has(editor.level.id)) editor.level.id = slugify(name);
      editor._commit('rename');
      this.refreshStatus();
    });
    this.root.querySelector('.editor__bar-actions').addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act) this._action(act);
    });
    // Keys typed into the panel never reach the editor or the game.
    this.root.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, select')) e.stopPropagation();
    });
  }

  show() {
    this.root.hidden = false;
    this._refreshSavedIds();
  }

  hide() {
    this.root.hidden = true;
    this.closeModal();
  }

  async _refreshSavedIds() {
    this._campaign = await this.editor.store.list();
    this._savedIds = new Set(this._campaign.map((e) => e.id));
    this.refreshStatus();
  }

  /* -------------------------------------------------------------------- */

  refresh() {
    this.$('[data-name]').value = this.editor.level.name;
    this.refreshTool();
    this.refreshStatus();
  }

  refreshStatus() {
    const e = this.editor;
    this.$('[data-id]').textContent = `levels/${e.level.id}.json`;
    this.$('[data-status]').textContent =
      `${e.level.objects.length} objects · ${e.level.spawns.length} spawns · ${e.level.monsters.length} monsters` +
      (e.dirty ? ' · unsaved changes' : ' · saved');
    this.$('[data-act="undo"]').disabled = e._undo.length < 2;
    this.$('[data-act="redo"]').disabled = !e._redo.length;
  }

  refreshTool() {
    const e = this.editor;
    for (const btn of this.root.querySelectorAll('[data-tool]')) btn.classList.toggle('is-active', btn.dataset.tool === e.tool);
    const tool = TOOLS.find(([id]) => id === e.tool);
    this.$('[data-help]').textContent =
      `${tool?.[2] ?? ''}  —  Right-drag orbit · wheel zoom · WASD pan (Shift faster) · [ ] brush size`;
    this.renderPane();
  }

  refreshSelection() {
    if (this.tab === 'tool' && (this.editor.tool === 'select' || this.editor.tool === 'place')) this.renderPane();
  }

  renderPane() {
    for (const btn of this.root.querySelectorAll('[data-tab]')) btn.classList.toggle('is-active', btn.dataset.tab === this.tab);
    const pane = this.$('[data-pane]');
    const render = { tool: () => this._toolPane(), map: () => this._mapPane(), rules: () => this._rulesPane(), story: () => this._storyPane() }[this.tab];
    pane.replaceChildren();
    render?.(pane);
  }

  /* -------------------------------------------------------------------- */
  /* Panes                                                                 */
  /* -------------------------------------------------------------------- */

  _toolPane() {
    const e = this.editor;
    const pane = this.$('[data-pane]');
    const t = e.tool;
    if (t === 'select') return this._selectionPane(pane);
    if (t === 'place' || t === 'scatter') {
      if (t === 'scatter') pane.append(this._scatterControls());
      return pane.append(this._browser());
    }
    if (t === 'erase') return pane.append(this._slider('Brush radius', 1, 40, 0.5, e.scatter.radius, (v) => e.setBrush({ radius: v }), 'm'));
    if (t === 'sculpt') {
      pane.append(
        this._segmented(['raise', 'lower', 'smooth', 'flatten'], e.brush.mode, (mode) => e.setBrush({ mode })),
        this._slider('Brush radius', 1, 40, 0.5, e.brush.radius, (v) => e.setBrush({ radius: v }), 'm'),
        this._slider('Strength', 0.05, 2, 0.05, e.brush.strength, (v) => e.setBrush({ strength: v })),
        this._note('Hold the left button and drag. Flatten levels the ground to the height where the stroke started. The 25 m fighting circle stays flat for movement and spells.')
      );
      return;
    }
    if (t === 'paint') {
      pane.append(
        this._segmented(SURFACE_OPTIONS, e.brush.surface, (surface) => e.setBrush({ surface })),
        this._slider('Brush radius', 1, 40, 0.5, e.brush.radius, (v) => e.setBrush({ radius: v }), 'm')
      );
      return;
    }
    if (t === 'spawns') return this._spawnPane(pane);
    if (t === 'portals') return this._portalPane(pane);
    if (t === 'npcs') return this._npcPane(pane);
    if (t === 'monsters') {
      pane.append(
        this._segmented(MONSTER_KINDS, e.monsterKind, (kind) => {
          e.monsterKind = kind;
          // A selected monster becomes the kind picked.
          if (e.selectedMarker?.kind === 'monster') e.updateMarker({ kind });
          this.renderPane();
        }, MONSTER_LABELS),
        this._note('These monsters are already on the field when the level starts, before the first wave. Click the ground to place the kind picked above; drag one to move it.')
      );
      const m = e.selectedMarker?.kind === 'monster' ? e.selectedMarker.data : null;
      if (m) {
        pane.append(
          this._label(`Selected: ${MONSTER_LABELS[m.kind] ?? m.kind}`),
          this._note('Pick a kind above to change it.'),
          this._button('Remove this monster (Del)', () => e.removeMarker(), 'is-danger')
        );
      }
      pane.append(
        this._button('Remove all monsters', () => {
          e.level.monsters = [];
          e.selectedMarker = null;
          e._syncMarkers();
          e._commit('monsters');
          this.renderPane();
        })
      );
    }
  }

  /** Spawn points: the selected one's monsters and waves. */
  _spawnPane(pane) {
    const e = this.editor;
    const m = e.selectedMarker?.kind === 'spawn' ? e.selectedMarker.data : null;
    pane.append(
      this._note(
        `${e.level.spawns.length} spawn point(s). Gold rings are where waves walk in from: each monster picks one of the points open to it, at random. With none, monsters arrive from all around. Put them near the gold band (18–22 m) so they have room to walk in.`
      )
    );
    if (!m) pane.append(this._note('Click the ground to add a point, or click one to choose which monsters and waves use it.'));
    else {
      const any = !m.kinds.length;
      pane.append(this._label('Selected spawn point'), this._check('Any monster', any, (on) => {
        e.updateMarker({ kinds: on ? [] : [...MONSTER_KINDS] });
        this.renderPane();
      }));
      if (!any) {
        for (const kind of MONSTER_KINDS) {
          pane.append(
            this._check(MONSTER_LABELS[kind], m.kinds.includes(kind), (on) => {
              const kinds = on ? [...m.kinds, kind] : m.kinds.filter((k) => k !== kind);
              // Unticking the last one means any monster again.
              e.updateMarker({ kinds: MONSTER_KINDS.filter((k) => kinds.includes(k)) });
              this.renderPane();
            })
          );
        }
      }
      const wave = (label, value, min, onChange) => {
        const wrap = document.createElement('label');
        wrap.className = 'editor__field editor__field--inline';
        const input = document.createElement('input');
        Object.assign(input, { type: 'number', min, max: 999, step: 1, value });
        input.addEventListener('change', () => {
          const v = Math.round(+input.value);
          if (Number.isFinite(v)) onChange(Math.max(min, Math.min(999, v)));
        });
        wrap.append(document.createTextNode(label), input);
        return wrap;
      };
      pane.append(
        wave('Open from wave', m.from, 1, (from) => {
          e.updateMarker({ from, to: m.to && m.to < from ? from : m.to });
          this.renderPane();
        }),
        wave('Until wave (0 = no end)', m.to, 0, (to) => {
          e.updateMarker({ to: to && to < m.from ? m.from : to });
          this.renderPane();
        }),
        this._note('A monster named here comes only through points that name it. Others use the points open to any monster; if none is open, any point, so nothing gets stuck.'),
        this._button('Remove this spawn point (Del)', () => e.removeMarker(), 'is-danger')
      );
    }
    pane.append(
      this._button('Remove all spawn points', () => {
        e.level.spawns = [];
        e.selectedMarker = null;
        e._syncMarkers();
        e._commit('spawns');
        this.renderPane();
      })
    );
  }

  _portalPane(pane) {
    const e = this.editor;
    const m = e.selectedMarker?.kind === 'portal' ? e.selectedMarker.data : null;
    pane.append(this._note(`${e.level.portals.length} portal(s). Players step in to travel. When the level's goal is met, a gold exit portal also opens on its own.`));
    if (!m) {
      pane.append(this._note('Click the ground to add a portal, or click one to edit it.'));
      return;
    }
    const others = e.level.portals.filter((p) => p !== m);
    const campaign = this._campaign ?? [];
    const options = ['none', ...others.map((p) => `portal:${p.id}`), ...campaign.filter((c) => c.id !== e.level.id).map((c) => `level:${c.id}`)];
    const labels = {
      none: 'Leads nowhere (decoration)',
      ...Object.fromEntries(others.map((p) => [`portal:${p.id}`, `→ ${p.label || p.id} (this level)`])),
      ...Object.fromEntries(campaign.map((c) => [`level:${c.id}`, `→ level: ${c.name}`]))
    };
    const t = m.target ?? { type: 'none' };
    const current = t.type === 'portal' ? `portal:${t.portal}` : t.type === 'level' ? `level:${t.level}` : 'none';
    const text = (label, value, onChange) => {
      const wrap = document.createElement('label');
      wrap.className = 'editor__field';
      const input = document.createElement('input');
      input.value = value;
      input.addEventListener('change', () => onChange(input.value));
      wrap.append(document.createTextNode(label), input);
      return wrap;
    };
    pane.append(
      this._label('Selected portal'),
      text('Name shown above it', m.label, (v) => e.updateMarker({ label: v })),
      this._select('Colour', PORTAL_COLOR_NAMES, m.color, (v) => e.updateMarker({ color: v })),
      this._select('Frame', Object.keys(PORTAL_FRAMES), m.frame ?? 'arch', (v) => e.updateMarker({ frame: v }), PORTAL_FRAMES),
      this._select('Leads to', options, current, (v) => {
        const [type, id] = v.split(':');
        e.updateMarker({ target: type === 'portal' ? { type, portal: id } : type === 'level' ? { type, level: id } : { type: 'none' } });
        this.renderPane();
      }, labels),
      this._slider('Facing (degrees)', -180, 180, 5, Math.round((m.yaw * 180) / Math.PI), (v) => e.updateMarker({ yaw: (v * Math.PI) / 180 })),
      this._note('Tip: two portals linked to each other make a two-way shortcut. Linking to a level works in the campaign (play test shows where it leads).'),
      this._button('Delete portal', () => e.removeMarker(), 'is-danger')
    );
  }

  _npcPane(pane) {
    const e = this.editor;
    const m = e.selectedMarker?.kind === 'npc' ? e.selectedMarker.data : null;
    pane.append(this._note(`${e.level.npcs.length} NPC(s). They never fight and monsters ignore them. Players walk up and press F to talk.`));
    if (!m) {
      pane.append(this._note('Click the ground to add an NPC, or click one to edit it.'));
      return;
    }
    const field = (label, value, onChange, multiline = false, placeholder = '') => {
      const wrap = document.createElement('label');
      wrap.className = 'editor__field';
      const input = document.createElement(multiline ? 'textarea' : 'input');
      if (multiline) input.rows = 4;
      input.placeholder = placeholder;
      input.value = value ?? '';
      input.addEventListener('change', () => onChange(input.value));
      wrap.append(document.createTextNode(label), input);
      return wrap;
    };
    const models = npcModels(e.app.catalog);
    const check = (label, value, onChange) => {
      const wrap = document.createElement('label');
      wrap.className = 'editor__field editor__field--inline';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = value;
      input.style.width = 'auto';
      input.addEventListener('change', () => onChange(input.checked));
      wrap.append(document.createTextNode(label), input);
      return wrap;
    };
    pane.append(
      this._label('Selected NPC'),
      field('Name', m.name, (v) => e.updateMarker({ name: v || 'Stranger' })),
      this._select('Role', NPC_ROLE_NAMES, m.role, (v) => {
        e.updateMarker(v === 'tutor' && !m.study ? { role: v, study: normalizeStudy({}) } : { role: v });
        this.renderPane();
      }, Object.fromEntries(NPC_ROLE_NAMES.map((r) => [r, NPC_ROLES[r].label]))),
      this._select('Look', ['', ...models.map((x) => x.id)], m.model ?? '', (v) => e.updateMarker({ model: v || null }), {
        '': models.length ? `Default (${models[0].name})` : 'Simple figure (no library yet)',
        ...Object.fromEntries(models.map((x) => [x.id, x.name.replace(/_/g, ' ')]))
      }),
      this._slider('Facing (degrees)', -180, 180, 5, Math.round((m.yaw * 180) / Math.PI), (v) => e.updateMarker({ yaw: (v * Math.PI) / 180 })),
      field('Greeting', m.greeting, (v) => e.updateMarker({ greeting: v }), false, 'Well met, caster.'),
      field('Lines (one per line — story, hints, rumours)', (m.lines ?? []).join('\n'), (v) => e.updateMarker({ lines: v.split('\n').map((l) => l.trim()).filter(Boolean) }), true),
      check('Talks with the AI model (free conversation)', m.ai, (v) => {
        e.updateMarker({ ai: v });
        this.renderPane();
      })
    );
    if (m.ai) {
      pane.append(
        m.role === 'tutor'
          ? field('About the child and their lessons (for the AI)', m.persona, (v) => e.updateMarker({ persona: v }), true, 'Sam is 7 and just started times tables. Likes dinosaurs. Gets frustrated with big numbers — go slowly.')
          : field('Personality for the AI', m.persona, (v) => e.updateMarker({ persona: v }), true, 'A gruff old soldier who lost his company at the pass; kind underneath; speaks in short sentences.')
      );
    }
    if (m.role === 'tutor') this._studyControls(pane, m, field);
    pane.append(
      this._label('Gift (given the first time you talk)'),
      this._select('Gift', GIFT_TYPES, m.gift.type, (v) => {
        e.updateMarker({ gift: { ...m.gift, type: v } });
        this.renderPane();
      }, { none: 'No gift', health: 'Health potion', focus: 'Focus potion', gold: 'Gold', weapon: 'Weapon', book: 'Skill book' })
    );
    if (m.gift.type === 'weapon' || m.gift.type === 'gear') pane.append(this._select(m.gift.type === 'gear' ? 'Gear rarity' : 'Weapon rarity', REWARD_RARITIES.filter((r) => r !== 'none'), m.gift.rarity, (v) => e.updateMarker({ gift: { ...m.gift, rarity: v } })));
    if (m.gift.type === 'gold') pane.append(this._slider('Gold amount', 5, 500, 5, m.gift.amount, (v) => e.updateMarker({ gift: { ...m.gift, amount: v } })));

    pane.append(this._label('Quest'), check('Gives a quest', Boolean(m.quest), (v) => {
      e.updateMarker({ quest: v ? { title: 'Clear the way', target: 'any', count: 10, gold: 100, rarity: 'rare' } : null });
      this.renderPane();
    }));
    if (m.quest) {
      const q = m.quest;
      const setQ = (changes) => e.updateMarker({ quest: { ...q, ...changes } });
      pane.append(
        field('Quest title', q.title, (v) => setQ({ title: v || 'A favour' })),
        this._select('Defeat', ['any', ...MONSTER_KINDS], q.target, (v) => setQ({ target: v }), { any: 'Any monsters', grunt: 'Cinder Imps', wisp: 'Gloom Wisps', brute: 'Iron Brutes', golem: 'Rift Golems', dragon: 'The Emberwyrm' }),
        this._slider('How many', 1, 100, 1, q.count, (v) => setQ({ count: v })),
        this._slider('Reward gold', 0, 1000, 10, q.gold, (v) => setQ({ gold: v })),
        this._select('Reward item', REWARD_RARITIES, q.rarity, (v) => setQ({ rarity: v }), { none: 'No item', magic: 'Magic weapon', rare: 'Rare weapon', epic: 'Epic weapon', unique: 'Unique weapon' })
      );
    }
    pane.append(this._button('Delete NPC', () => e.removeMarker(), 'is-danger'));
  }

  /** A tutor's lessons: subject, level, the parent's own questions, rewards. */
  _studyControls(pane, m, field) {
    const e = this.editor;
    const st = m.study ?? normalizeStudy({});
    const setS = (changes, redraw = false) => {
      e.updateMarker({ study: { ...st, ...changes } });
      if (redraw) this.renderPane();
    };
    pane.append(
      this._label('Lessons (tutor)'),
      this._select('Subject', Object.keys(SUBJECTS), st.subject, (v) => setS({ subject: v }, true), SUBJECTS)
    );
    if (st.subject === 'custom') {
      const count = st.questions.length;
      pane.append(
        field(
          `Questions — one per line (${count} now)`,
          formatQuestions(st.questions),
          (v) => setS({ questions: parseQuestions(v) }, true),
          true,
          'What is the capital of France? | Paris | London, Rome | It is famous for the Eiffel Tower\nHow many legs does a spider have? | 8 | 6, 10\nSpell the colour of the sky | blue'
        ),
        this._note('Format: Question | Answer | wrong answers, comma-separated | hint. Only the first two are needed. With wrong answers the child picks a button; without, they type. Accept several answers with a slash: colour/color.')
      );
    } else {
      pane.append(
        this._select('Difficulty', Object.keys(DIFFICULTIES), st.difficulty, (v) => setS({ difficulty: v }), {
          easy: 'Easy — within 10, tables to 5',
          medium: 'Medium — within 20, tables to 10',
          hard: 'Hard — within 100, tables to 12'
        }),
        this._note('Math questions are made up fresh each time, so they never run out. The child picks from four answers.')
      );
    }
    pane.append(
      this._slider("Child's age (for the AI's words)", 4, 16, 1, st.age, (v) => setS({ age: v })),
      this._slider('Gold per right answer', 0, 100, 5, st.gold, (v) => setS({ gold: v })),
      this._select('Bonus', Object.keys(STUDY_BONUSES), st.bonus, (v) => setS({ bonus: v }), STUDY_BONUSES),
      this._slider('Bonus every N right answers', 1, 20, 1, st.bonusEvery || 5, (v) => setS({ bonusEvery: v })),
      this._note('Tip: Rules → Goal "Answer questions" makes the level a study level, and Calm mode takes the monsters away.')
    );
  }

  _selectionPane(pane) {
    const e = this.editor;
    const o = e.selected;
    if (!o) {
      pane.append(this._note('Click an object in the scene to select it. Tip: use Place or Scatter to add objects.'));
      return;
    }
    const model = e.app.composed.resolveModel(o);
    const title = document.createElement('div');
    title.className = 'editor__selected';
    title.innerHTML = `<strong>${esc(model.name)}</strong><span>${esc(model.category)} · ${esc(model.pack ?? '')}</span>`;
    pane.append(
      title,
      this._segmented(['translate', 'rotate', 'scale'], e.gizmo.mode, (mode) => e.setGizmoMode(mode), { translate: 'Move (1)', rotate: 'Rotate (2)', scale: 'Scale (3)' }),
      this._number('X', o.x, (v) => e.updateSelected({ x: v })),
      this._number('Z', o.z, (v) => e.updateSelected({ z: v })),
      this._number('Height above ground', o.yOffset, (v) => e.updateSelected({ yOffset: v })),
      this._number('Turn (degrees)', (o.yaw * 180) / Math.PI, (v) => e.updateSelected({ yaw: (v * Math.PI) / 180 })),
      this._number('Scale', o.scale, (v) => e.updateSelected({ scale: Math.max(0.01, v) })),
      this._row(this._button('Duplicate (Ctrl+D)', () => e.duplicateSelected()), this._button('Delete (Del)', () => e.removeObject(o), 'is-danger'))
    );
  }

  _scatterControls() {
    const e = this.editor;
    const box = document.createElement('div');
    box.className = 'editor__group';
    const set = document.createElement('div');
    set.className = 'editor__chips';
    if (e.scatterSet.length) {
      for (const model of e.scatterSet) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'editor__chip';
        chip.textContent = `${model.name} ✕`;
        chip.addEventListener('click', () => {
          e.scatterSet = e.scatterSet.filter((m) => m !== model);
          this.renderPane();
        });
        set.append(chip);
      }
    } else set.textContent = 'Scatter set is empty — add models with “+” below, or the picked model is used.';
    box.append(
      this._label('Scatter set'),
      set,
      this._slider('Brush radius', 1, 40, 0.5, e.scatter.radius, (v) => e.setBrush({ radius: v }), 'm'),
      this._slider('Objects per dab', 1, 20, 1, e.scatter.density, (v) => e.setBrush({ density: v })),
      this._slider('Minimum spacing', 0.2, 10, 0.1, e.scatter.spacing, (v) => e.setBrush({ spacing: v }), 'm'),
      this._slider('Size variation', 0, 0.8, 0.05, e.scatter.variance, (v) => e.setBrush({ variance: v }))
    );
    return box;
  }

  _browser() {
    const e = this.editor;
    const catalog = e.app.catalog;
    const box = document.createElement('div');
    box.className = 'editor__group editor__browser';
    const categories = Object.keys(CATEGORIES);
    const select = document.createElement('select');
    select.innerHTML =
      `<option value="all">All categories</option>` +
      categories.map((c) => `<option value="${c}">${esc(CATEGORIES[c].label)} (${catalog.counts[c] ?? 0})</option>`).join('');
    select.value = this.category;
    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = `Search ${catalog.size.toLocaleString()} models…`;
    search.value = this.query;
    const list = document.createElement('div');
    list.className = 'editor__list';

    const draw = () => {
      const words = this.query.toLowerCase().split(/\s+/).filter(Boolean);
      let models = this.category === 'all' ? catalog.models : catalog.models.filter((m) => m.category === this.category);
      if (words.length) models = models.filter((m) => words.every((w) => m._words.includes(w)));
      list.replaceChildren();
      if (!catalog.size) {
        list.append(this._note('No asset library yet. It downloads on the first `npm run dev` — or run `npm run library:fetch`. Placeholder shapes:'));
        models = categories.map((c) => e.app.composed._fallbackModel(c));
      }
      for (const model of models.slice(0, 200)) {
        const row = document.createElement('div');
        row.className = 'editor__item';
        row.classList.toggle('is-picked', e.currentModel?.id === model.id);
        const inSet = e.scatterSet.includes(model);
        const size = model.size ? `${model.size.map((v) => v.toFixed(1)).join(' × ')}` : '';
        row.innerHTML = `<div><strong>${esc(model.name)}</strong><span>${esc(model.pack ?? '')} · ${esc(model.category)} · ${size}</span></div>
          <button type="button" class="editor__add" title="Add to scatter set">${inSet ? '✓' : '+'}</button>`;
        row.addEventListener('click', (event) => {
          if (event.target.closest('.editor__add')) {
            e.scatterSet = inSet ? e.scatterSet.filter((m) => m !== model) : [...e.scatterSet, model];
            if (e.tool !== 'scatter') e.setTool('scatter');
            else this.renderPane();
            return;
          }
          e.currentModel = model;
          if (e.tool !== 'place' && e.tool !== 'scatter') e.setTool('place');
          else draw();
        });
        list.append(row);
      }
      if (models.length > 200) list.append(this._note(`${models.length - 200} more — narrow the search.`));
    };
    select.addEventListener('change', () => {
      this.category = select.value;
      draw();
    });
    search.addEventListener('input', () => {
      this.query = search.value;
      draw();
    });
    box.append(this._label(e.currentModel ? `Picked: ${e.currentModel.name}` : 'Pick a model'), select, search, list);
    draw();
    return box;
  }

  _mapPane() {
    const e = this.editor;
    const pane = this.$('[data-pane]');
    const w = e.level.world;
    pane.append(
      this._select('Ground', SURFACE_OPTIONS, w.ground, (v) => e.setWorld({ ground: v })),
      this._select('Landscape', RELIEF_OPTIONS, w.relief, (v) => e.setWorld({ relief: v })),
      this._select('Time of day', TIME_OPTIONS, w.timeOfDay, (v) => e.setWorld({ timeOfDay: v })),
      this._slider('Fog', 0, 1, 0.05, w.fog, (v) => e.setWorld({ fog: v })),
      this._row(
        this._button('New landscape shape', () => e.setWorld({ seed: (Math.random() * 1e9) | 0 })),
        this._button('Reset sculpt & paint', async () => {
          e.terrain.clearEdits();
          e.terrain.refresh();
          e._restickObjects();
          e._commit('reset terrain');
        })
      ),
      this._button('Remove all objects', () => {
        if (confirm(`Remove all ${e.level.objects.length} objects?`)) e.clearObjects();
      }, 'is-danger')
    );

    // Optional AI fill: everything above works without it.
    const ai = document.createElement('div');
    ai.className = 'editor__group';
    const prompt = document.createElement('textarea');
    prompt.rows = 3;
    prompt.placeholder = 'Optional: describe a map and let the AI lay out a starting point — e.g. “a ruined castle on a snowy hill”';
    const out = document.createElement('div');
    out.className = 'editor__note';
    const go = this._button('AI fill (replaces objects and landscape)', async () => {
      go.disabled = true;
      out.textContent = 'Designing…';
      try {
        const { plan, source, note } = await e.aiFill(prompt.value);
        out.textContent = `${plan.name} — ${source === 'ai' ? 'designed by the AI model' : `keyword planner${note ? ` (${note})` : ''}`}. Undo to go back.`;
      } catch (error) {
        out.textContent = `Failed: ${error.message}`;
      } finally {
        go.disabled = false;
      }
    }, 'is-primary');
    ai.append(this._label('AI fill (optional)'), prompt, go, out);
    pane.append(ai);
  }

  _rulesPane() {
    const e = this.editor;
    const pane = this.$('[data-pane]');
    const r = e.level.rules;
    const characters = platform.characters.all();
    const commit = () => {
      e._commit('rules');
      this.renderPane();
    };
    pane.append(
      this._select(
        'Character',
        ['', ...characters.map((c) => c.id)],
        e.level.character ?? '',
        (v) => {
          e.level.character = v || null;
          commit();
        },
        { '': "Player's choice", ...Object.fromEntries(characters.map((c) => [c.id, c.label])) }
      ),
      this._select('Goal', GOALS, r.goal, (v) => {
        r.goal = v;
        commit();
      }, { waves: 'Survive waves', boss: 'Defeat the boss', kills: 'Defeat monsters', study: 'Answer questions (tutors)', royale: 'Battle royale (last one standing)' }),
      this._slider(
        r.goal === 'boss' ? 'Boss arrives on wave' : r.goal === 'kills' ? 'Monsters to defeat' : r.goal === 'study' ? 'Right answers needed' : 'Waves to survive',
        1,
        r.goal === 'kills' || r.goal === 'study' ? 99 : 20,
        1,
        r.count,
        (v) => {
          r.count = v;
          e._commit('rules');
        }
      ),
      this._note(
        `Goal: ${describeGoal(r)}${r.goal === 'boss' ? ' — the Emberwyrm arrives on that wave.' : r.goal === 'study' ? ' — add at least one Tutor NPC (NPCs tool).' : '.'}`
      ),
      this._check('Calm mode — no monsters at all (good for young children)', r.calm, (v) => {
        r.calm = v;
        commit();
      }),
      ...(r.calm && r.goal !== 'study' ? [this._note('With no monsters, only the "Answer questions" goal can be reached.')] : []),
      this._label('Monsters in the waves (0 = never)')
    );
    for (const kind of MONSTER_KINDS) {
      if (kind === 'dragon') continue;
      pane.append(this._slider(MONSTER_LABELS[kind], 0, 10, 1, r.kinds[kind], (v) => {
        r.kinds[kind] = v;
        e._commit('rules');
      }));
    }
    pane.append(
      this._slider('Monsters in wave 1', 1, 30, 1, r.baseCount, (v) => {
        r.baseCount = v;
        e._commit('rules');
      }),
      this._slider('Growth per wave', 1, 2, 0.05, r.growth, (v) => {
        r.growth = v;
        e._commit('rules');
      }),
      this._slider('Rift Golem leads every Nth wave (0 = never)', 0, 20, 1, r.bossEvery, (v) => {
        r.bossEvery = v;
        e._commit('rules');
      }),
      this._slider('Emberwyrm every Nth wave (0 = never)', 0, 20, 1, r.dragonEvery, (v) => {
        r.dragonEvery = v;
        e._commit('rules');
      })
    );
  }

  _storyPane() {
    const e = this.editor;
    const pane = this.$('[data-pane]');
    for (const [key, label] of [
      ['intro', 'Intro — shown before the level'],
      ['outro', 'Ending — shown when the goal is reached']
    ]) {
      const scene = e.level.story[key];
      const group = document.createElement('div');
      group.className = 'editor__group';
      const field = (name, placeholder, multiline = false) => {
        const input = document.createElement(multiline ? 'textarea' : 'input');
        if (multiline) input.rows = 6;
        input.placeholder = placeholder;
        input.value = scene[name];
        input.addEventListener('change', () => {
          scene[name] = input.value;
          e._commit('story');
        });
        return input;
      };
      group.append(
        this._label(label),
        field('title', 'Title, e.g. “The Frozen Pass”'),
        field('speaker', 'Speaker (optional), e.g. “Old Warden”'),
        field('text', 'What happens… Blank lines start new paragraphs.', true)
      );
      pane.append(group);
    }
  }

  /* -------------------------------------------------------------------- */
  /* Top-bar actions                                                       */
  /* -------------------------------------------------------------------- */

  async _action(act) {
    const e = this.editor;
    try {
      if (act === 'undo') return e.undo();
      if (act === 'redo') return e.redo();
      if (act === 'save') return this.saveFromKeyboard();
      if (act === 'export') return e.store.exportFile(e.currentLevel());
      if (act === 'import') {
        const level = await e.store.importFile();
        await e.setLevel(level);
        this.toast(`Imported “${level.name}”. Save to add it to the campaign.`);
        e.dirty = true;
        return this.refreshStatus();
      }
      if (act === 'new') {
        if (e.dirty && !confirm('Discard unsaved changes and start a new level?')) return;
        return e.newLevel();
      }
      if (act === 'levels') return this.openLevels();
      if (act === 'play') return e.app.playLevel(e.currentLevel(), { fromEditor: true });
      if (act === 'exit') {
        if (e.dirty && !confirm('Leave the editor? Unsaved changes will be lost.')) return;
        return e.exit();
      }
    } catch (error) {
      this.toast(error.message, true);
    }
  }

  async saveFromKeyboard() {
    try {
      const campaign = await this.editor.save();
      this._campaign = campaign;
      this._savedIds = new Set(campaign.map((c) => c.id));
      this.toast(`Saved public/levels/${this.editor.level.id}.json`);
    } catch (error) {
      this.toast(error.message, true);
    }
  }

  async openLevels() {
    const e = this.editor;
    await this._refreshSavedIds();
    const modal = this.$('[data-modal]');
    modal.hidden = false;
    const draw = () => {
      const rows = (this._campaign ?? [])
        .map(
          (c, i) => `<div class="editor__level" data-id="${esc(c.id)}">
            <span class="editor__level-n">${i + 1}</span>
            <div><strong>${esc(c.name)}</strong><span>levels/${esc(c.id)}.json</span></div>
            <button type="button" data-do="up" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" data-do="down" ${i === this._campaign.length - 1 ? 'disabled' : ''}>↓</button>
            <button type="button" data-do="open" class="is-primary">Open</button>
            <button type="button" data-do="delete" class="is-danger">Delete</button>
          </div>`
        )
        .join('');
      modal.innerHTML = `<div class="editor__dialog">
        <h2>Campaign levels</h2>
        <p class="editor__note">The campaign plays these in order. Saved in public/levels/ — commit them to share.</p>
        ${rows || '<p class="editor__note">No saved levels yet. Build one and press Save.</p>'}
        <div class="editor__row"><button type="button" data-do="close">Close</button></div>
      </div>`;
    };
    draw();
    modal.onclick = async (event) => {
      const action = event.target.closest('[data-do]')?.dataset.do;
      if (!action) return;
      if (action === 'close') return this.closeModal();
      const id = event.target.closest('[data-id]')?.dataset.id;
      const ids = this._campaign.map((c) => c.id);
      const i = ids.indexOf(id);
      try {
        if (action === 'open') {
          if (e.dirty && !confirm('Discard unsaved changes?')) return;
          this.closeModal();
          await e.open(id);
          return;
        }
        if (action === 'delete') {
          if (!confirm(`Delete levels/${id}.json?`)) return;
          this._campaign = await e.store.remove(id);
        }
        if (action === 'up' || action === 'down') {
          const j = action === 'up' ? i - 1 : i + 1;
          [ids[i], ids[j]] = [ids[j], ids[i]];
          this._campaign = await e.store.reorder(ids);
        }
        this._savedIds = new Set(this._campaign.map((c) => c.id));
        draw();
      } catch (error) {
        this.toast(error.message, true);
      }
    };
  }

  closeModal() {
    const modal = this.$('[data-modal]');
    modal.hidden = true;
    modal.replaceChildren();
  }

  toast(message, error = false) {
    const status = this.$('[data-status]');
    status.textContent = message;
    status.classList.toggle('is-error', error);
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      status.classList.remove('is-error');
      this.refreshStatus();
    }, 4000);
  }

  /* -------------------------------------------------------------------- */
  /* Little form builders                                                  */
  /* -------------------------------------------------------------------- */

  _label(text) {
    const el = document.createElement('div');
    el.className = 'editor__label';
    el.textContent = text;
    return el;
  }

  _check(label, value, onChange) {
    const wrap = document.createElement('label');
    wrap.className = 'editor__field editor__field--inline';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(value);
    input.style.width = 'auto';
    input.addEventListener('change', () => onChange(input.checked));
    wrap.append(document.createTextNode(label), input);
    return wrap;
  }

  _note(text) {
    const el = document.createElement('p');
    el.className = 'editor__note';
    el.textContent = text;
    return el;
  }

  _row(...children) {
    const el = document.createElement('div');
    el.className = 'editor__row';
    el.append(...children);
    return el;
  }

  _button(text, onClick, cls = '') {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    if (cls) b.className = cls;
    b.addEventListener('click', onClick);
    return b;
  }

  _slider(label, min, max, step, value, onChange, unit = '') {
    const wrap = document.createElement('label');
    wrap.className = 'editor__field';
    const out = document.createElement('span');
    const fmt = (v) => `${+(+v).toFixed(2)}${unit ? ` ${unit}` : ''}`;
    out.textContent = fmt(value);
    const input = document.createElement('input');
    Object.assign(input, { type: 'range', min, max, step, value });
    input.addEventListener('input', () => (out.textContent = fmt(input.value)));
    input.addEventListener('change', () => onChange(+input.value));
    const head = document.createElement('div');
    head.className = 'editor__field-head';
    head.append(document.createTextNode(label), out);
    wrap.append(head, input);
    return wrap;
  }

  _number(label, value, onChange) {
    const wrap = document.createElement('label');
    wrap.className = 'editor__field editor__field--inline';
    const input = document.createElement('input');
    Object.assign(input, { type: 'number', step: 0.1, value: (+value).toFixed(2) });
    input.addEventListener('change', () => Number.isFinite(+input.value) && onChange(+input.value));
    wrap.append(document.createTextNode(label), input);
    return wrap;
  }

  _select(label, options, value, onChange, labels = {}) {
    const wrap = document.createElement('label');
    wrap.className = 'editor__field';
    const select = document.createElement('select');
    select.innerHTML = options.map((o) => `<option value="${esc(o)}">${esc(labels[o] ?? o)}</option>`).join('');
    select.value = value;
    select.addEventListener('change', () => onChange(select.value));
    wrap.append(document.createTextNode(label), select);
    return wrap;
  }

  _segmented(options, value, onChange, labels = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'editor__segmented';
    for (const option of options) {
      const b = this._button(labels[option] ?? option, () => onChange(option));
      b.classList.toggle('is-active', option === value);
      wrap.append(b);
    }
    return wrap;
  }
}
