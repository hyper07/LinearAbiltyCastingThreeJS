import { DIFFICULTY_IDS, FOES, GENRES, HELPERS, LAYOUTS, MAX_CHAPTERS, WORLDS, isStudyGenre, normalizeSpec } from '../blueprints/index.js';
import { describeGoal } from '../levels/Level.js';
import { STUDY_BONUSES, SUBJECTS, formatQuestions, parseQuestions } from '../npc/Study.js';

const EXAMPLES = [
  'A times-tables adventure for my 8 year old in an enchanted forest',
  'A pirate story quest in three chapters',
  'A snowy dungeon crawl with a knight and a dragon at the end',
  'A calm counting game on a farm, no monsters',
  'Haunted graveyard monster hunt, hard'
];

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

/**
 * The Game builder (main menu → Create → Game builder).
 *
 * Left: an idea in a sentence, and three ways to turn it into a spec —
 * Quick build (keywords, no AI), Build with AI (the AI picks from the menus),
 * and on Plus a Custom build (the premium model writes its own map, chapter
 * stories, helper lines and questions).
 * Right: the spec, every choice a menu — genre, world, layout, hero, foes,
 * chapters, difficulty, the study settings and a parent's reward — and the
 * chapters it compiles to. Play now (nothing saved), Save to the campaign,
 * or Open in the editor to place things by hand.
 */
export class GameBuilderPanel {
  /**
   * @param {HTMLElement} host
   * @param {{
   *   status: () => Promise<{ ok: boolean, plan: object|null }>,
   *   quick: (text: string) => { spec: object, source: string },
   *   build: (text: string, options: { custom: boolean }) => Promise<{ spec: object, source: string, note?: string, upgrade?: boolean }>,
   *   heroes: () => Promise<{ id: string, name: string }[]>,
   *   compile: (spec: object, seed: number) => Promise<{ levels: object[] }>,
   *   play: (levels: object[]) => Promise<void>,
   *   save: (levels: object[]) => Promise<void>,
   *   edit: (levels: object[]) => Promise<void>
   * }} actions
   */
  constructor(host, actions) {
    this.actions = actions;
    this.spec = null;
    this.seed = 1;
    this.heroes = [];
    this.plan = null;
    this.root = el('div', 'forge builder');
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="forge__card">
        <header class="forge__head">
          <h2>Game builder</h2>
          <span>Pick from the menus, or describe a game and let the AI pick. Every choice stays editable.</span>
          <em class="builder__plan" data-plan></em>
          <button type="button" data-close>Close</button>
        </header>
        <aside class="forge__side">
          <label class="forge__label" for="builder-idea">Your idea</label>
          <textarea id="builder-idea" data-prompt rows="4" maxlength="400" placeholder="A times-tables adventure for my 8 year old in an enchanted forest"></textarea>
          <div class="forge__examples" data-examples></div>
          <button type="button" class="forge__primary" data-build>✦ Build with AI</button>
          <button type="button" data-quick title="Reads the words in your idea. Instant, and needs no AI">Quick build (no AI)</button>
          <label class="builder__custom" data-custom-label title="The premium model writes its own map, chapter stories, helper lines and questions">
            <input type="checkbox" data-custom /> Custom build <small>Plus</small>
          </label>
          <div class="forge__status" data-status></div>
        </aside>
        <section class="forge__preview" data-preview>
          <p class="forge__empty">Describe a game on the left and press Build, or Quick build.<br />Then change any choice before you play.</p>
        </section>
        <footer class="forge__foot" data-foot hidden>
          <button type="button" data-reroll title="Same choices, a new scattering of scenery">New map layout</button>
          <span class="forge__spacer"></span>
          <button type="button" data-edit>Open in editor</button>
          <button type="button" data-save>Save to campaign</button>
          <button type="button" class="forge__primary" data-play>Play now</button>
        </footer>
      </div>`;
    host.appendChild(this.root);
    this.$ = (s) => this.root.querySelector(s);

    const examples = this.$('[data-examples]');
    for (const text of EXAMPLES) {
      const chip = el('button', 'forge__chip', text);
      chip.type = 'button';
      chip.addEventListener('click', () => {
        this.$('[data-prompt]').value = text;
      });
      examples.appendChild(chip);
    }
    this.$('[data-close]').addEventListener('click', () => this.toggle(false));
    this.$('[data-build]').addEventListener('click', () => this.build());
    this.$('[data-quick]').addEventListener('click', () => this.quick());
    this.$('[data-reroll]').addEventListener('click', () => {
      this.seed = (Math.random() * 1e9) | 0;
      this._status('A new scattering of scenery — press Play to see it.');
    });
    this.$('[data-play]').addEventListener('click', () => this._run('play'));
    this.$('[data-save]').addEventListener('click', () => this._run('save'));
    this.$('[data-edit]').addEventListener('click', () => this._run('edit'));
    // Typing here must never reach the game.
    this.root.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') this.toggle(false);
    });
  }

  get isOpen() {
    return !this.root.hidden;
  }

  async toggle(force) {
    this.root.hidden = force === undefined ? !this.root.hidden : !force;
    if (!this.isOpen) return;
    this.heroes = await this.actions.heroes().catch(() => []);
    const { plan } = await this.actions.status();
    this._setPlan(plan);
  }

  _setPlan(plan) {
    this.plan = plan;
    const custom = Boolean(plan?.features?.customBuild);
    const box = this.$('[data-custom]');
    box.disabled = !custom;
    if (!custom) box.checked = false;
    this.$('[data-custom-label]').classList.toggle('is-locked', !custom);
    this.$('[data-plan]').textContent = plan
      ? `${plan.name} · ${plan.buildsLeft} of ${plan.buildsPerDay} AI builds left today${plan.premium ? ' · premium model' : ''}`
      : 'AI offline · menus and Quick build still work';
  }

  _status(text, kind = '') {
    const status = this.$('[data-status]');
    status.textContent = text;
    status.className = `forge__status${kind ? ` is-${kind === 'warn' ? 'error' : kind}` : ''}`;
  }

  _busy(on) {
    for (const button of this.root.querySelectorAll('button')) if (!button.matches('[data-close]')) button.disabled = on;
  }

  quick() {
    const { spec } = this.actions.quick(this.$('[data-prompt]').value);
    this._show(spec);
    this._status('Built from the words in your idea — no AI used. Change anything on the right.', 'ok');
  }

  async build() {
    const custom = this.$('[data-custom]').checked;
    this._busy(true);
    this._status(custom ? 'The premium model is writing your game… (up to a minute or two)' : 'The AI is picking from the menus…', 'busy');
    try {
      const result = await this.actions.build(this.$('[data-prompt]').value, { custom });
      this._show(result.spec);
      if (result.source === 'keywords') {
        this._status(`${result.note ? `AI unavailable (${result.note}). ` : ''}Built from the words in your idea instead.${result.upgrade ? ' Plus adds more AI builds and custom builds.' : ''}`, 'warn');
      } else {
        this._status(result.source === 'ai-custom' ? 'Custom build ready: its own map, stories and lines.' : 'Built by the AI from the menus. Change anything on the right.', 'ok');
      }
    } finally {
      this._busy(false);
      this.actions.status().then(({ plan }) => this._setPlan(plan));
    }
  }

  /* ---- the spec form ---- */

  _show(spec) {
    this.spec = normalizeSpec(spec, { heroes: this.heroes.map((h) => h.id) });
    this.seed = (Math.random() * 1e9) | 0;
    this.$('[data-foot]').hidden = false;
    this._render();
  }

  _set(patch) {
    this.spec = normalizeSpec({ ...this.spec, ...patch }, { heroes: this.heroes.map((h) => h.id) });
    this._render();
  }

  _select(label, value, options, onChange, key) {
    const field = el('label', 'forge__field');
    field.append(el('span', null, label));
    const select = el('select');
    if (key) select.dataset.field = key;
    for (const [id, text] of options) {
      const option = el('option', null, text);
      option.value = id;
      option.selected = id === value;
      select.appendChild(option);
    }
    select.addEventListener('change', () => onChange(select.value));
    field.append(select);
    return field;
  }

  _number(label, value, min, max, onChange, key) {
    const field = el('label', 'forge__field');
    field.append(el('span', null, label));
    const input = el('input');
    input.type = 'number';
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);
    if (key) input.dataset.field = key;
    input.addEventListener('change', () => onChange(+input.value));
    field.append(input);
    return field;
  }

  _text(label, value, placeholder, onChange, { rows = 0, key } = {}) {
    const field = el('label', 'forge__field builder__wide');
    field.append(el('span', null, label));
    const input = rows ? el('textarea') : el('input');
    if (rows) input.rows = rows;
    input.value = value;
    input.placeholder = placeholder;
    if (key) input.dataset.field = key;
    input.addEventListener('change', () => onChange(input.value));
    field.append(input);
    return field;
  }

  _render() {
    const spec = this.spec;
    const preview = this.$('[data-preview]');
    preview.replaceChildren();
    const study = isStudyGenre(spec.genre);
    const menu = (registry) => Object.entries(registry).map(([id, e]) => [id, `${e.name} — ${e.blurb}`]);

    preview.append(this._text('Name', spec.name, 'My game', (name) => this._set({ name }), { key: 'name' }));

    const choices = el('div', 'forge__options builder__grid');
    choices.append(
      this._select('Genre', spec.genre, menu(GENRES), (genre) => this._set({ genre, layout: GENRES[genre].layout, chapters: GENRES[genre].chapters, foes: undefined }), 'genre'),
      this._select('World', spec.world, menu(WORLDS), (world) => this._set({ world, foes: GENRES[spec.genre].calm ? 'none' : WORLDS[world].foes }), 'world'),
      this._select('Map layout', spec.layout, menu(LAYOUTS), (layout) => this._set({ layout }), 'layout'),
      this._select('Hero', spec.hero, [['any', 'Player\'s choice'], ...this.heroes.map((h) => [h.id, h.name])], (hero) => this._set({ hero }), 'hero'),
      this._select('Monsters', spec.foes, menu(FOES), (foes) => this._set({ foes }), 'foes'),
      this._select('Difficulty', spec.difficulty, DIFFICULTY_IDS.map((d) => [d, d[0].toUpperCase() + d.slice(1)]), (difficulty) => this._set({ difficulty }), 'difficulty'),
      this._number('Chapters', spec.chapters, 1, MAX_CHAPTERS, (chapters) => this._set({ chapters }), 'chapters')
    );
    preview.append(choices);

    if (study) {
      preview.append(el('h3', 'builder__heading', 'Study and rewards'));
      const studyRow = el('div', 'forge__options builder__grid');
      studyRow.append(
        this._select('Subject', spec.subject, Object.entries(SUBJECTS), (subject) => this._set({ subject }), 'subject'),
        this._number('Age', spec.age, 4, 16, (age) => this._set({ age }), 'age'),
        this._number('Gold per right answer', spec.reward.gold, 0, 500, (gold) => this._set({ reward: { ...spec.reward, gold } }), 'gold'),
        this._number('Bonus every N right', spec.reward.every, 0, 50, (every) => this._set({ reward: { ...spec.reward, every } }), 'every'),
        this._select('Bonus', spec.reward.bonus, Object.entries(STUDY_BONUSES), (bonus) => this._set({ reward: { ...spec.reward, bonus } }), 'bonus')
      );
      preview.append(studyRow);
      preview.append(
        this._text(
          'Your own questions (one per line: question | answer | wrong, wrong | hint)',
          formatQuestions(spec.questions),
          'How many legs does a spider have? | 8 | 6, 10 | More than an insect!',
          (value) => {
            const questions = parseQuestions(value);
            this._set({ questions, subject: questions.length ? 'custom' : spec.subject === 'custom' ? 'mixed' : spec.subject });
          },
          { rows: 4, key: 'questions' }
        )
      );
    }

    preview.append(el('h3', 'builder__heading', 'Story'));
    const genre = GENRES[spec.genre];
    preview.append(
      this._text('Opening', spec.story.intro, `Empty = “${genre.story.intro}”`, (intro) => this._set({ story: { ...spec.story, intro } }), { rows: 2, key: 'intro' }),
      this._text('Ending', spec.story.outro, `Empty = “${genre.story.outro}”`, (outro) => this._set({ story: { ...spec.story, outro } }), { rows: 2, key: 'outro' })
    );

    if (spec.custom) {
      const parts = [
        spec.custom.plan && 'its own map',
        spec.custom.chapters.length && `${spec.custom.chapters.length} chapter stories`,
        spec.custom.npcs.length && `${spec.custom.npcs.length} helpers' lines`,
        spec.questions.length && `${spec.questions.length} questions`
      ].filter(Boolean);
      const note = el('p', 'builder__custom-note', `Custom build: ${parts.join(', ') || 'nothing extra'}.`);
      const drop = el('button', null, 'Use the menus only');
      drop.type = 'button';
      drop.addEventListener('click', () => this._set({ custom: null }));
      note.append(' ', drop);
      preview.append(note);
    }

    this._renderChapters(preview);
  }

  async _renderChapters(preview) {
    const list = el('ol', 'builder__chapters');
    list.dataset.chapters = '';
    preview.append(el('h3', 'builder__heading', 'What gets built'), list);
    const { levels } = await this.actions.compile(this.spec, this.seed);
    // An empty story box shows the text the game will use instead.
    const intro = preview.querySelector('[data-field="intro"]');
    const outro = preview.querySelector('[data-field="outro"]');
    if (intro) intro.placeholder = `Empty = “${levels[0].story.intro.text}”`;
    if (outro) outro.placeholder = `Empty = “${levels.at(-1).story.outro.text}”`;
    for (const level of levels) {
      const helpers = level.npcs.map((n) => `${n.name} (${HELPERS[Object.keys(HELPERS).find((h) => HELPERS[h].role === n.role)]?.title ?? n.role})`);
      const item = el('li');
      item.append(el('strong', null, level.name));
      item.append(el('span', null, ` — ${describeGoal(level.rules)} · ${LAYOUTS[level.blueprint.layout]?.name ?? ''}${level.rules.calm ? ' · no monsters' : ''}`));
      if (helpers.length) item.append(el('small', null, `Helpers: ${helpers.join(', ')}`));
      list.append(item);
    }
  }

  async _run(what) {
    if (!this.spec) return;
    this._busy(true);
    try {
      const { levels } = await this.actions.compile(this.spec, this.seed);
      if (what === 'save') {
        await this.actions.save(levels);
        this._status(`Saved ${levels.length === 1 ? `“${levels[0].name}”` : `${levels.length} chapters`} to the campaign.`, 'ok');
        return;
      }
      this.toggle(false);
      await this.actions[what](levels);
    } catch (error) {
      this.toggle(true);
      this._status(error.message, 'warn');
    } finally {
      this._busy(false);
    }
  }
}
