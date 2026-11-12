import { settings, ELEMENT_META, CastShape } from '../config/settings.js';
import { ELEMENT_SIGILS } from './glyphs.js';
import { SKILL_BASES, STYLES, skillIds } from '../forge/ClassForge.js';
import { CLASS_SPECS, LOOKS, describeBonuses } from '../platform/character/classes.js';
import { classFingerprint, skillFingerprint } from '../library/fingerprints.js';

const EXAMPLES = [
  'A pirate captain who fights with cannon fire and the sea',
  'A moon priestess of ice and starlight',
  'A stone giant who shakes the earth',
  'A shadow assassin who blinks through enemies',
  'A storm ranger with a bow and lightning'
];

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

const STYLE_LABELS = { knight: 'Knight', mage: 'Mage', barbarian: 'Barbarian', amazon: 'Amazon', shadowblade: 'Shadowblade', templar: 'Templar', bonecaller: 'Bonecaller', wildwarden: 'Wildwarden' };

/**
 * The Class forge window (main menu → Create → Class forge).
 *
 * Left: describe a class in a sentence and press Generate (the AI designs it;
 * without the AI, a keyword designer does), plus the classes already made.
 * Right: the design, all of it editable — names, colours, the body, the
 * fighting style, and which hand-made effect each skill is built on — with
 * each skill's real numbers. Save makes it a class in the menu.
 */
export class ClassForgePanel {
  /**
   * @param {HTMLElement} host
   * @param {{
   *   design: (text: string) => Promise<{ design: object, source: string, note?: string }>,
   *   normalize: (design: object) => object,
   *   save: (design: object) => Promise<void>,
   *   list: () => Promise<{ id: string, name: string }[]>,
   *   load: (id: string) => Promise<object>,
   *   remove: (id: string) => Promise<void>,
   *   select: (id: string) => Promise<void>
   * }} actions
   */
  constructor(host, actions) {
    this.actions = actions;
    this.design = null;
    this.root = el('div', 'forge');
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="forge__card">
        <header class="forge__head">
          <h2>Class forge</h2>
          <span>Describe a class — the AI designs its skills, built on the game's own effects.</span>
          <button type="button" data-close>Close</button>
        </header>
        <aside class="forge__side">
          <label class="forge__label">Your idea</label>
          <textarea data-prompt rows="4" maxlength="300" placeholder="A pirate captain who fights with cannon fire and the sea"></textarea>
          <div class="forge__examples" data-examples></div>
          <button type="button" class="forge__primary" data-generate>✦ Generate class</button>
          <div class="forge__status" data-status></div>
          <label class="forge__label">Your classes</label>
          <div class="forge__list" data-list></div>
        </aside>
        <section class="forge__preview" data-preview>
          <p class="forge__empty">Describe a class on the left and press Generate.<br />You can edit everything before saving.</p>
        </section>
        <footer class="forge__foot" data-foot hidden>
          <button type="button" data-regenerate>Generate again</button>
          <span class="forge__spacer"></span>
          <label class="forge__share" title="Shared classes and their skills go into the library, where others can play them and reuse the skills"><input type="checkbox" data-share checked /> Share in the library</label>
          <button type="button" data-save>Save</button>
          <button type="button" class="forge__primary" data-save-play>Save and choose</button>
        </footer>
      </div>`;
    host.appendChild(this.root);
    this.$ = (s) => this.root.querySelector(s);

    for (const text of EXAMPLES) {
      const chip = el('button', 'forge__chip', text);
      chip.type = 'button';
      chip.addEventListener('click', () => {
        this.$('[data-prompt]').value = text;
      });
      this.$('[data-examples]').append(chip);
    }
    this.$('[data-close]').addEventListener('click', () => this.toggle(false));
    this.$('[data-generate]').addEventListener('click', () => this.generate());
    this.$('[data-regenerate]').addEventListener('click', () => this.generate());
    this.$('[data-save]').addEventListener('click', () => this.save(false));
    this.$('[data-save-play]').addEventListener('click', () => this.save(true));
    // Typing here must never reach the game.
    this.root.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') this.toggle(false);
    });
  }

  get isOpen() {
    return !this.root.hidden;
  }

  toggle(force) {
    this.root.hidden = force === undefined ? !this.root.hidden : !force;
    if (this.isOpen) this.refreshList();
  }

  _status(text, kind = '') {
    const s = this.$('[data-status]');
    s.textContent = text;
    s.className = `forge__status ${kind}`.trim();
  }

  async generate() {
    const text = this.$('[data-prompt]').value.trim() || this.design?.prompt || '';
    if (!text) return this._status('Describe the class first — one sentence is enough.', 'is-error');
    this.$('[data-prompt]').value = text;
    const buttons = [this.$('[data-generate]'), this.$('[data-regenerate]')];
    buttons.forEach((b) => (b.disabled = true));
    this._status('Designing… (the AI can take up to a minute)', 'is-busy');
    try {
      const { design, source, note, inspiredBy } = await this.actions.design(text);
      this.design = design;
      this._status(
        source === 'catalog'
          ? `Our own class, inspired by how ${inspiredBy.name}${inspiredBy.work ? ` (${inspiredBy.work})` : ''} plays — no AI needed. Edit anything, then Save.`
          : source === 'ai'
            ? 'Designed by the AI. Edit anything, then Save.'
            : `AI unavailable (${note}) — designed from keywords instead. Edit anything, then Save.`,
        source === 'ai' || source === 'catalog' ? 'is-ok' : ''
      );
      this.render();
    } catch (error) {
      this._status(`Could not design it: ${error.message}`, 'is-error');
    } finally {
      buttons.forEach((b) => (b.disabled = false));
    }
  }

  async save(choose) {
    if (!this.design) return;
    this.design = this.actions.normalize(this.design);
    try {
      const share = this.$('[data-share]').checked;
      const published = await this.actions.save(this.design, { share });
      const near = (published?.similar ?? []).filter((a) => a.kind === 'class');
      const where = published?.error ? ' (the library is offline — saved locally only)' : share ? ' and shared in the library' : ' (a draft in the library — only you see it)';
      this._status(
        `Saved “${this.design.name}”${where}. It is in the class list under Created.${near.length ? ` Close to: ${near.map((a) => `${a.name} (${Math.round(a.score * 100)}%)`).join(', ')}.` : ''}`,
        'is-ok'
      );
      await this.refreshList();
      if (choose) {
        await this.actions.select(this.design.id);
        this.toggle(false);
      }
    } catch (error) {
      this._status(`Could not save: ${error.message}`, 'is-error');
    }
  }

  async refreshList() {
    const list = this.$('[data-list]');
    const classes = await this.actions.list();
    list.replaceChildren();
    if (!classes.length) list.append(el('p', 'forge__muted', 'None yet.'));
    for (const entry of classes) {
      const row = el('div', 'forge__item');
      row.append(el('strong', null, entry.name));
      const edit = el('button', null, 'Edit');
      edit.type = 'button';
      edit.addEventListener('click', async () => {
        this.design = await this.actions.load(entry.id);
        this.$('[data-prompt]').value = this.design.prompt ?? '';
        this._status(`Editing “${this.design.name}”.`);
        this.render();
      });
      const choose = el('button', null, 'Choose');
      choose.type = 'button';
      choose.addEventListener('click', async () => {
        await this.actions.select(entry.id);
        this.toggle(false);
      });
      const remove = el('button', 'is-danger', '✕');
      remove.type = 'button';
      remove.title = 'Delete';
      remove.addEventListener('click', async () => {
        if (!confirm(`Delete the class “${entry.name}”?`)) return;
        await this.actions.remove(entry.id);
        if (this.design?.id === entry.id) this.design = null;
        this.render();
        this.refreshList();
      });
      row.append(edit, choose, remove);
      list.append(row);
    }
  }

  /* -------------------------------------------------------------------- */

  render() {
    const preview = this.$('[data-preview]');
    this.$('[data-foot]').hidden = !this.design;
    preview.replaceChildren();
    const d = this.design;
    if (!d) {
      preview.append(el('p', 'forge__empty', 'Describe a class on the left and press Generate.'));
      return;
    }

    /* --- who it is --- */
    const top = el('div', 'forge__identity');
    const icon = el('input', 'forge__icon');
    icon.value = d.icon;
    icon.maxLength = 2;
    icon.addEventListener('change', () => (d.icon = icon.value || '✦'));
    const names = el('div', 'forge__names');
    const name = el('input', 'forge__name');
    name.value = d.name;
    name.maxLength = 28;
    name.addEventListener('change', () => (d.name = name.value.trim() || d.name));
    const tagline = el('input', 'forge__tagline');
    tagline.value = d.tagline;
    tagline.maxLength = 160;
    tagline.addEventListener('change', () => (d.tagline = tagline.value));
    names.append(name, tagline);
    const color = el('input');
    color.type = 'color';
    color.value = d.color;
    color.title = 'Class colour';
    color.addEventListener('input', () => (d.color = color.value));
    top.append(icon, names, color);

    const options = el('div', 'forge__options');
    options.append(
      this._select('Body', Object.keys(LOOKS), d.look, (v) => (d.look = v), Object.fromEntries(Object.entries(LOOKS).map(([k, v]) => [k, v.label]))),
      this._select('Fights like', STYLES, d.style, (v) => (d.style = v), STYLE_LABELS),
      this._select('Resource', ['none', 'rage'], d.resource, (v) => {
        d.resource = v;
        this.render();
      }, { none: 'Cooldowns only', rage: 'Rage (physical)' })
    );
    const bonuses = el('p', 'forge__bonuses', describeBonuses(d.bonuses).join(' · ') || 'No bonuses');

    /* --- the tree --- */
    const tree = el('div', 'forge__tree');
    d.branches.forEach((branch, b) => {
      const col = el('section', 'forge__branch');
      col.style.setProperty('--accent', branch.skills[0].color);
      const bname = el('input', 'forge__branch-name');
      bname.value = branch.name;
      bname.maxLength = 18;
      bname.addEventListener('change', () => (branch.name = bname.value || branch.name));
      col.append(bname);
      branch.skills.forEach((skill, t) => {
        if (t === 1) col.append(el('div', 'forge__link', 'needs rank 2'));
        col.append(this._skillCard(skill, t + 1, b === 0 || b === 1 ? t === 0 : false));
      });
      tree.append(col);
    });

    const banner = el('div', 'forge__similar');
    banner.hidden = true;
    preview.append(top, banner, options, bonuses, tree);
    this._suggestClasses(banner);
  }

  /* -------------------------------------------------------------------- */
  /* Reuse: what already exists                                            */
  /* -------------------------------------------------------------------- */

  /** Cached library lookups, keyed by what was asked. */
  async _similar(kind, fp, options) {
    this._cache ??= new Map();
    const key = `${kind}:${JSON.stringify(fp)}:${JSON.stringify(options)}`;
    if (!this._cache.has(key)) this._cache.set(key, this.actions.similar?.(kind, fp, options) ?? Promise.resolve([]));
    return this._cache.get(key);
  }

  /** Classes like this one that already exist — play one instead? */
  async _suggestClasses(banner) {
    const d = this.design;
    const spec = { id: d.id, label: d.name, tagline: d.tagline, style: d.style, resource: d.resource, armorClass: CLASS_SPECS.find((c) => c.id === d.style)?.armorClass, bonuses: d.bonuses };
    const near = await this._similar('class', classFingerprint(spec, d.branches.flatMap((b) => b.skills)), { exclude: [`class:${d.id}`], min: 0.5, limit: 3 });
    if (this.design !== d || !near.length) return;
    banner.hidden = false;
    banner.append(el('strong', null, 'Already in the library:'));
    for (const a of near) {
      const chip = el('button', `forge__match is-${a.status}`);
      chip.type = 'button';
      chip.append(el('span', null, a.name), el('small', null, `${a.status} · ${Math.round(a.score * 100)}% alike${a.uses ? ` · used ${a.uses}×` : ''}`));
      chip.title = `Choose ${a.name} instead of making a new class`;
      chip.addEventListener('click', async () => {
        const id = a.id.replace(/^class:/, '');
        await this.actions.select(id);
        this.toggle(false);
      });
      banner.append(chip);
    }
  }

  /** Skills like this one that already exist — reuse one instead of making a near-copy. */
  async _suggestSkills(skill, box) {
    if (skill.ref) return;
    const own = skillIds(this.design).map((id) => `skill:${id}`);
    const near = await this._similar('skill', skillFingerprint(null, skill), { exclude: own, min: 0.55, limit: 2 });
    if (!box.isConnected || skill.ref || !near.length) return;
    box.hidden = false;
    box.append(el('small', null, 'Similar skill already exists:'));
    for (const a of near) {
      const use = el('button', `forge__match is-${a.status}`);
      use.type = 'button';
      use.append(el('span', null, a.name), el('small', null, `${a.status} · ${Math.round(a.score * 100)}%${a.uses ? ` · used ${a.uses}×` : ''} — use it`));
      use.title = `Use ${a.name} here instead of a new skill. It stays one skill everywhere, so its upgrades and fixes reach every class that uses it.`;
      use.addEventListener('click', async () => {
        const r = await this.actions.getAsset(a.id);
        const data = r.asset?.data;
        if (!data) return;
        Object.assign(skill, { ref: data.id, refStatus: a.status, name: data.name, base: data.base, color: data.color ?? skill.color, description: data.description ?? skill.description });
        this.render();
      });
      box.append(use);
    }
  }

  _skillCard(skill, tier, starts) {
    const meta = ELEMENT_META[skill.base] ?? {};
    const card = el('article', 'forge__skill');
    card.style.setProperty('--accent', skill.color);

    const head = el('div', 'forge__skill-head');
    const glyph = el('span', 'forge__glyph');
    glyph.innerHTML = ELEMENT_SIGILS[skill.base] ?? '';
    const name = el('input', 'forge__skill-name');
    name.value = skill.name;
    name.maxLength = 26;
    name.addEventListener('change', () => (skill.name = name.value.trim() || skill.name));
    const color = el('input');
    color.type = 'color';
    color.value = skill.color;
    color.addEventListener('input', () => {
      skill.color = color.value;
      card.style.setProperty('--accent', skill.color);
    });
    head.append(glyph, name, color);

    const tags = el('div', 'forge__tags');
    const shape = meta.cast === CastShape.ZONE ? 'far cast' : meta.cast === CastShape.SELF ? 'around you' : 'line';
    tags.append(el('span', null, `Tier ${tier}`), el('span', null, shape), ...(meta.physical ? [el('span', null, 'physical')] : []), ...(starts ? [el('span', 'is-start', 'starting skill')] : []));

    const desc = el('textarea', 'forge__desc');
    desc.rows = 2;
    desc.maxLength = 140;
    desc.value = skill.description;
    desc.addEventListener('change', () => (skill.description = desc.value));

    const base = el('select', 'forge__base');
    for (const id of Object.keys(SKILL_BASES)) {
      const o = el('option', null, `Built on ${ELEMENT_META[id].label} — ${SKILL_BASES[id].split(' — ')[0]}`);
      o.value = id;
      base.append(o);
    }
    base.value = skill.base;
    base.addEventListener('change', () => {
      skill.base = base.value;
      this.render();
    });

    const combat = settings.combat[skill.base] ?? {};
    const ability = settings[skill.base] ?? {};
    const stats = el('p', 'forge__stats', `${combat.damage ?? 0} dmg · ${ability.cooldown ?? 0}s cooldown · ${meta.cast === CastShape.SELF ? `${ability.zoneRadius ?? 0} m around` : `${ability.range ?? 0} m`}`);

    const suggest = el('div', 'forge__suggest');
    suggest.hidden = true;
    if (skill.ref) {
      card.classList.add('is-reused');
      for (const input of [name, color, desc, base]) input.disabled = true;
      tags.prepend(el('span', 'is-reused', `reused · ${skill.refStatus ?? 'library'}`));
      const unlink = el('button', 'forge__unlink', 'Make my own instead');
      unlink.type = 'button';
      unlink.title = 'Stop reusing it: this class gets its own copy you can rename and recolour';
      unlink.addEventListener('click', () => {
        delete skill.ref;
        delete skill.refStatus;
        this.render();
      });
      card.append(head, tags, desc, base, stats, unlink);
      return card;
    }
    card.append(head, tags, desc, base, stats, suggest);
    this._suggestSkills(skill, suggest);
    return card;
  }

  _select(label, values, value, onChange, labels = {}) {
    const wrap = el('label', 'forge__field');
    wrap.append(el('span', null, label));
    const select = el('select');
    for (const v of values) {
      const o = el('option', null, labels[v] ?? v);
      o.value = v;
      select.append(o);
    }
    select.value = value;
    select.addEventListener('change', () => onChange(select.value));
    wrap.append(select);
    return wrap;
  }
}
