/**
 * Generic id → definition registry.
 *
 * Every catalog in the platform (motions, characters, skills, weapons, loadouts)
 * uses this so adding content is one `register()` call rather than editing
 * half a dozen files.
 */
export class Registry {
  constructor(name = 'registry') {
    this.name = name;
    /** @type {Map<string, object>} */
    this._entries = new Map();
  }

  /**
   * @param {string} id
   * @param {object} definition
   */
  register(id, definition) {
    if (!id) throw new Error(`[${this.name}] register() requires an id`);
    if (this._entries.has(id)) {
      console.warn(`[${this.name}] overwriting "${id}"`);
    }
    this._entries.set(id, { id, ...definition });
    return this;
  }

  /** @param {string} id */
  get(id) {
    return this._entries.get(id) ?? null;
  }

  /** @param {string} id */
  has(id) {
    return this._entries.has(id);
  }

  /** @returns {string[]} */
  ids() {
    return [...this._entries.keys()];
  }

  /** @returns {object[]} */
  all() {
    return [...this._entries.values()];
  }

  /** @param {(def: object) => boolean} predicate */
  find(predicate) {
    for (const def of this._entries.values()) {
      if (predicate(def)) return def;
    }
    return null;
  }
}
