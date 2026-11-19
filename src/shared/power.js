/**
 * Power: keep the 3D games light on the GPU, so a laptop stays cool and quiet.
 *
 *   - a frame cap (60 by default, not the display's 120), with true dt and no drift;
 *   - no rendering at all in a hidden tab, and only on demand behind a still menu;
 *   - a power mode the player picks — Quiet (battery) / Balanced / High / Ultra —
 *     saved per game, that bounds detail, shadows, post effects and draw distance;
 *   - a governor that aims at a GPU-time budget (the lowest power that still
 *     looks good) rather than "as much as fits in a frame";
 *   - GPU time from EXT_disjoint_timer_query_webgl2 where the browser has it,
 *     else the CPU's frame time;
 *   - distance helpers: detail bands, fades, how often far animation ticks,
 *     which chunks of a map are active.
 *
 * Resolution is not touched here: each game keeps its own pixel-ratio handling.
 * The pure parts (FrameLimiter, PowerGovernor, the helpers, storage) are tested
 * in tests/unit/power.test.mjs; PowerLoop and GpuTimer need a browser.
 */

export const MODES = ['quiet', 'balanced', 'high', 'ultra'];
export const DEFAULT_MODE = 'balanced';
export const MODE_LABELS = { quiet: 'Quiet (battery)', balanced: 'Balanced', high: 'High', ultra: 'Ultra' };
export const HINT = 'Quiet keeps your laptop cool.';
export const DETAIL = ['low', 'medium', 'high', 'ultra'];

/**
 * The player's choices: a preset is a set of these; changing any one by hand
 * makes it "Custom" (on top of the preset it came from).
 *   fps        frame cap (0: as fast as the display)
 *   distance   near / medium / far: where small props, people, creatures,
 *              particles and scattered trees stop being drawn (far: no limit)
 *   shadows    off / near (a tight box round you, redrawn every few frames) / full
 *   grass      low / medium / high density (and reach)
 *   ao, rays, bloom   the post effects
 */
export const PRESETS = {
  quiet: { fps: 45, distance: 'near', shadows: 'near', grass: 'low', ao: false, rays: false, bloom: true },
  balanced: { fps: 60, distance: 'medium', shadows: 'near', grass: 'medium', ao: true, rays: true, bloom: true },
  high: { fps: 60, distance: 'far', shadows: 'full', grass: 'high', ao: true, rays: true, bloom: true },
  ultra: { fps: 60, distance: 'far', shadows: 'full', grass: 'high', ao: true, rays: true, bloom: true }
};
export const OPTIONS = {
  fps: [30, 45, 60, 0],
  distance: ['near', 'medium', 'far'],
  shadows: ['off', 'near', 'full'],
  grass: ['low', 'medium', 'high']
};

/**
 * What a preset decides that isn't on the menu: the most detail the governor
 * may climb to (`ceiling`), the GPU ms per frame it aims under (`budget`;
 * null for Ultra, which keeps the old rule: the most that stays smooth), how
 * often near shadows are redrawn, and bloom from a half-size copy.
 */
export const HIDDEN = {
  quiet: { ceiling: 'medium', budget: 4, shadowEvery: 3, bloomHalf: true },
  balanced: { ceiling: 'high', budget: 7, shadowEvery: 2, bloomHalf: true },
  high: { ceiling: 'high', budget: 10, shadowEvery: 1, bloomHalf: false },
  ultra: { ceiling: 'ultra', budget: null, shadowEvery: 1, bloomHalf: false }
};

/** Draw distances (m): small things (`far`), scattered trees (`treeFar`), and how much thicker the haze gets to hide the edge. */
export const DISTANCE = {
  near: { far: 140, treeFar: 240, fog: 1.35, animNear: 20 },
  medium: { far: 200, treeFar: 340, fog: 1.15, animNear: 30 },
  far: { far: Infinity, treeFar: Infinity, fog: 1, animNear: 45 }
};
/** Shadows: on, the largest map, the box's reach (m). */
export const SHADOWS = {
  off: { on: false, max: 0, box: 0 },
  near: { on: true, max: 2048, box: 70 },
  full: { on: true, max: Infinity, box: Infinity }
};
/** Grass: × the level's density, × the ring's reach. */
export const GRASS = {
  low: { density: 0.55, reach: 0.75 },
  medium: { density: 0.8, reach: 0.9 },
  high: { density: 1, reach: 1 }
};

/** A mode name, or the default for anything else. */
export function asMode(m) {
  return MODES.includes(m) ? m : DEFAULT_MODE;
}

/** A clean graphics state: { preset, custom: null | choices, showFps }. */
export function graphicsState(raw = {}) {
  const preset = asMode(raw?.preset);
  let custom = null;
  if (raw?.custom && typeof raw.custom === 'object') {
    const base = PRESETS[preset];
    const c = raw.custom;
    custom = {
      fps: OPTIONS.fps.includes(c.fps) ? c.fps : base.fps,
      distance: OPTIONS.distance.includes(c.distance) ? c.distance : base.distance,
      shadows: OPTIONS.shadows.includes(c.shadows) ? c.shadows : base.shadows,
      grass: OPTIONS.grass.includes(c.grass) ? c.grass : base.grass,
      ao: typeof c.ao === 'boolean' ? c.ao : base.ao,
      rays: typeof c.rays === 'boolean' ? c.rays : base.rays,
      bloom: typeof c.bloom === 'boolean' ? c.bloom : base.bloom
    };
  }
  return { preset, custom, showFps: Boolean(raw?.showFps) };
}

/**
 * The choices in force: the preset's (with this game's own Quiet frame rate,
 * `profile.quietFps`), or the custom ones.
 */
export function choices(state, profile = {}) {
  const st = graphicsState(state);
  if (st.custom) return { ...st.custom };
  const c = { ...PRESETS[st.preset] };
  if (st.preset === 'quiet' && profile.quietFps) c.fps = profile.quietFps;
  return c;
}

/** The label to show: the preset's name, or "Custom". */
export function presetLabel(state) {
  const st = graphicsState(state);
  return st.custom ? 'Custom' : MODE_LABELS[st.preset];
}

/** Change one choice by hand: the state becomes Custom (from the preset in force). */
export function setChoice(state, key, value, profile = {}) {
  const st = graphicsState(state);
  const custom = { ...choices(st, profile), [key]: value };
  return graphicsState({ ...st, custom });
}

/** Pick a preset: its own choices again. */
export function setPreset(state, preset) {
  return graphicsState({ ...graphicsState(state), preset, custom: null });
}

/**
 * Everything a game needs this moment: `table` is its SETTINGS by detail
 * level, `detail` the level the governor chose, `res` the level whose
 * resolution the game keeps (its existing pixel-ratio handling — power never
 * lowers it). Effects are on only where both the level and the player allow.
 */
export function powerSettings(table, { state, detail, res, profile = {} }) {
  const st = graphicsState(state);
  const c = choices(st, profile);
  const h = HIDDEN[st.preset];
  const d = table[detail] ?? table.high;
  const r = table[res] ?? d;
  const dist = DISTANCE[c.distance];
  const sh = SHADOWS[c.shadows];
  const gr = GRASS[c.grass];
  const s = { ...d, scale: r.scale, maxDpr: r.maxDpr, preset: st.preset, custom: Boolean(st.custom) };
  s.fps = c.fps;
  s.far = dist.far;
  s.treeFar = Math.min(dist.treeFar, d.treeFar ?? Infinity);
  s.fog = dist.fog;
  s.animNear = dist.animNear;
  s.shadowOn = sh.on;
  s.shadowEvery = c.shadows === 'near' ? Math.max(2, h.shadowEvery) : 1;
  if (d.shadow) s.shadow = Math.min(d.shadow, sh.max || d.shadow);
  if (d.shadowBox) s.shadowBox = Math.min(d.shadowBox, sh.box || d.shadowBox);
  s.ao = ('ao' in d ? d.ao : true) && c.ao;
  s.rays = ('rays' in d ? d.rays : true) && c.rays;
  s.bloom = ('bloom' in d ? d.bloom : true) && c.bloom;
  s.bloomHalf = h.bloomHalf;
  if ('grass' in d) s.grass = d.grass * gr.density;
  s.grassReach = gr.reach;
  s.budget = h.budget;
  return s;
}

/* ------------------------------------------------------------------ saved choice */

const key = (game) => `gamory.graphics.${game}`;

/** The saved graphics state for `game` (`?power=<preset>` in the address wins). Storage may throw: then the default. */
export function loadGraphics(game, { storage = globalThis.localStorage, search = globalThis.location?.search ?? '' } = {}) {
  let saved = {};
  try {
    saved = JSON.parse(storage?.getItem(key(game)) ?? 'null') ?? {};
  } catch {
    saved = {};
  }
  try {
    const q = new URLSearchParams(search).get('power');
    if (MODES.includes(q)) saved = { ...saved, preset: q, custom: null };
  } catch {
    /* no address */
  }
  return graphicsState(saved);
}

/** Keep the state for `game`. Returns whether it was stored. */
export function saveGraphics(game, state, { storage = globalThis.localStorage } = {}) {
  try {
    storage.setItem(key(game), JSON.stringify(graphicsState(state)));
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ frame cap */

/**
 * Skips animation-frame ticks to hold a frame rate. Feed it each rAF
 * timestamp (ms); it answers the milliseconds since the last frame it let
 * through, or null to skip this one. The schedule advances by whole intervals
 * (so 60 on a 120 Hz display is exactly every other tick, and there's no
 * drift), with a little slack for timestamp jitter, and resyncs rather than
 * bursting after a stall.
 */
export class FrameLimiter {
  constructor(fps = 60) {
    this.setFps(fps);
    this.reset();
  }

  setFps(fps) {
    this.fps = fps > 0 ? fps : 0;
    this.interval = this.fps ? 1000 / this.fps : 0;
    this.slack = Math.min(2, this.interval * 0.12);
  }

  /** Forget the schedule (after a pause or a hidden tab), so the next tick renders with a normal dt. */
  reset() {
    this.last = null;
    this.next = null;
  }

  tick(now) {
    if (this.next !== null && now < this.next - this.slack) return null;
    const ms = this.last === null ? this.interval || 1000 / 60 : now - this.last;
    this.last = now;
    if (this.next === null || now - this.next > this.interval) this.next = now + this.interval;
    else this.next += this.interval;
    return ms;
  }
}

/**
 * The game loop: requestAnimationFrame through a FrameLimiter, stopped in a
 * hidden tab, and — while `demand` is on (a still menu) — drawing only when
 * asked with `invalidate()`. Calls `frame(ms)` with the real time since the
 * last drawn frame. `fps` is what it actually drew per second.
 */
export class PowerLoop {
  constructor(frame, { fps = 60, doc = globalThis.document, raf = globalThis.requestAnimationFrame?.bind(globalThis), caf = globalThis.cancelAnimationFrame?.bind(globalThis) } = {}) {
    this.frame = frame;
    this.limiter = new FrameLimiter(fps);
    this.doc = doc;
    this.raf = raf;
    this.caf = caf;
    this.demand = false;
    this.dirty = true;
    this.running = false;
    this.fps = 0;
    this._n = 0;
    this._t0 = null;
    this._tick = (now) => this.tick(now);
    this._vis = () => (this.doc?.hidden ? this._halt() : this._go());
  }

  start() {
    if (this.running) return this;
    this.running = true;
    this.doc?.addEventListener?.('visibilitychange', this._vis);
    this._go();
    return this;
  }

  stop() {
    this.running = false;
    this.doc?.removeEventListener?.('visibilitychange', this._vis);
    this._halt();
  }

  setFps(fps) {
    if (fps !== this.limiter.fps) this.limiter.setFps(fps);
  }

  /** On: draw only when invalidated (a menu over a still scene). Off: draw every allowed frame. */
  setDemand(on) {
    if (this.demand === on) return;
    this.demand = on;
    this.dirty = true;
    if (!on) this.limiter.reset();
  }

  /** Ask for one frame (on demand: something changed). */
  invalidate() {
    this.dirty = true;
  }

  _go() {
    if (!this.running || this._raf != null || this.doc?.hidden) return;
    this.limiter.reset();
    this._raf = this.raf(this._tick);
  }

  _halt() {
    if (this._raf != null) this.caf?.(this._raf);
    this._raf = null;
  }

  tick(now) {
    this._raf = null;
    if (!this.running) return;
    if (this.doc?.hidden) return;
    this._raf = this.raf(this._tick);
    if (this.demand && !this.dirty) {
      this.limiter.reset();
      return;
    }
    const ms = this.limiter.tick(now);
    if (ms === null) return;
    this.dirty = false;
    // What was drawn per second, over half-second windows.
    if (this._t0 === null) this._t0 = now;
    this._n++;
    if (now - this._t0 >= 500) {
      this.fps = Math.round((this._n * 1000) / (now - this._t0));
      this._n = 0;
      this._t0 = now;
    }
    this.frame(ms, now);
  }
}

/* ------------------------------------------------------------------ GPU time */

/**
 * GPU milliseconds per frame from EXT_disjoint_timer_query_webgl2 (results
 * arrive a few frames late; disjoint ones are dropped). `available` is false
 * where the browser hides it — then callers use the CPU's frame time.
 */
export class GpuTimer {
  constructor(gl) {
    this.gl = gl;
    let ext = null;
    try {
      ext = gl?.getExtension?.('EXT_disjoint_timer_query_webgl2') ?? null;
    } catch {
      ext = null;
    }
    this.ext = ext;
    this.available = Boolean(ext);
    this.free = [];
    this.pending = [];
    this.active = null;
    this.ms = null;
    this.last = null;
  }

  begin() {
    if (!this.ext || this.active || this.pending.length > 5) return;
    const q = this.free.pop() ?? this.gl.createQuery();
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q);
    this.active = q;
  }

  end() {
    if (!this.active) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending.push(this.active);
    this.active = null;
  }

  /** Collect finished results; returns the smoothed GPU ms (or null before the first). */
  poll() {
    if (!this.ext) return null;
    const gl = this.gl;
    const disjoint = gl.getParameter(this.ext.GPU_DISJOINT_EXT);
    while (this.pending.length) {
      const q = this.pending[0];
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      const ns = gl.getQueryParameter(q, gl.QUERY_RESULT);
      this.pending.shift();
      this.free.push(q);
      if (disjoint) continue;
      const ms = ns / 1e6;
      this.last = ms;
      this.ms = this.ms === null ? ms : this.ms + (ms - this.ms) * 0.1;
    }
    return this.ms;
  }

  dispose() {
    if (!this.ext) return;
    if (this.active) this.end();
    for (const q of [...this.free, ...this.pending]) this.gl.deleteQuery(q);
    this.free = [];
    this.pending = [];
  }
}

/* ------------------------------------------------------------------ the governor */

/**
 * Picks the detail level for a mode: the lowest power that still looks good.
 * Feed it GPU ms per frame (or CPU frame ms where there's no timer). It
 * steps down after ~2 s over budget and back up after ~8 s comfortably under
 * it, never above the mode's ceiling, and never back to a level it had to
 * leave twice. With no budget (Ultra) it holds the ceiling.
 */
export class PowerGovernor {
  constructor(mode = DEFAULT_MODE, { levels = DETAIL, start, floor = levels[0] } = {}) {
    this.levels = levels;
    this.floor = levels.indexOf(floor);
    this.setMode(mode, start);
  }

  setMode(mode, start) {
    this.mode = asMode(mode);
    const p = HIDDEN[this.mode];
    this.budget = p.budget;
    this.max = this.levels.indexOf(p.ceiling);
    const want = start != null ? Math.min(this.levels.indexOf(start), this.max) : this.max;
    this.level = this.levels[Math.max(this.floor, want)];
    this.avg = null;
    this.over = 0;
    this.under = 0;
    this.strikes = {};
  }

  /**
   * One frame: `ms` of GPU work, `dt` ms of wall time since the last.
   * `budget` overrides the preset's (the CPU fallback measures frame time
   * against the frame cap instead). Returns the new level if it changed, else null.
   */
  sample(ms, dt = 16.7, budget = this.budget) {
    if (this.budget == null || budget == null || !(ms >= 0) || ms > 500) return null;
    this.avg = this.avg === null ? ms : this.avg + (ms - this.avg) * 0.05;
    const i = this.levels.indexOf(this.level);
    if (this.avg > budget * 1.15) {
      this.over += dt;
      this.under = 0;
    } else if (this.avg < budget * 0.6) {
      this.under += dt;
      this.over = 0;
    } else {
      this.over = Math.max(0, this.over - dt * 0.5);
      this.under = Math.max(0, this.under - dt * 0.5);
    }
    if (this.over > 2000 && i > this.floor) {
      this.strikes[this.level] = (this.strikes[this.level] ?? 0) + 1;
      return this._set(this.levels[i - 1]);
    }
    if (this.under > 8000 && i < this.max && (this.strikes[this.levels[i + 1]] ?? 0) < 2) return this._set(this.levels[i + 1]);
    return null;
  }

  _set(level) {
    this.level = level;
    this.over = 0;
    this.under = 0;
    this.avg = null;
    return level;
  }
}

/* ------------------------------------------------------------------ distance */

/**
 * Which detail band `dist` falls in: 0 for under bands[0], 1 under bands[1],
 * …, bands.length past the last (not drawn).
 */
export function bandAt(dist, bands) {
  for (let i = 0; i < bands.length; i++) if (dist < bands[i]) return i;
  return bands.length;
}

/** 1 up to `start`, easing to 0 at `end` (a fade-out with distance). */
export function fadeOut(dist, start, end) {
  if (dist <= start) return 1;
  if (dist >= end) return 0;
  const t = (dist - start) / (end - start);
  return 1 - t * t * (3 - 2 * t);
}

/**
 * How often a character at `dist` animates: every frame near, every 2nd
 * beyond `near`, every 4th beyond 2×`near`, never (frozen, 0) beyond `far`.
 */
export function animStride(dist, { near = 30, far = 200 } = {}) {
  if (dist > far) return 0;
  if (dist > near * 2) return 4;
  if (dist > near) return 2;
  return 1;
}

/** Whether a stride-`n` thing animates on frame `frame` (spread by `seed`, so they don't all tick at once). */
export function ticksOn(frame, n, seed = 0) {
  return n > 0 && (frame + seed) % n === 0;
}

/**
 * The chunks of a `size`-metre grid that touch a circle of `radius` round
 * (x, z): the active ring. Returns keys "i,j".
 */
export function activeChunks(x, z, size, radius) {
  const out = [];
  const i0 = Math.floor((x - radius) / size);
  const i1 = Math.floor((x + radius) / size);
  const j0 = Math.floor((z - radius) / size);
  const j1 = Math.floor((z + radius) / size);
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      // Nearest point of the chunk to the centre.
      const nx = Math.max(i * size, Math.min(x, (i + 1) * size));
      const nz = Math.max(j * size, Math.min(z, (j + 1) * size));
      if ((nx - x) ** 2 + (nz - z) ** 2 <= radius * radius) out.push(`${i},${j}`);
    }
  }
  return out;
}

/**
 * Redraw the sun's shadow map only every `every` frames, or at once when the
 * view moved more than `move` metres or turned more than `turn` radians since
 * the last redraw. Returns whether to redraw this frame.
 */
export class ShadowPacer {
  constructor() {
    this.n = 0;
    this.at = null;
    this.yaw = 0;
  }

  due(every, x, z, yaw = 0, { move = 1.5, turn = 0.2 } = {}) {
    this.n++;
    let go = every <= 1 || this.at === null || this.n >= every;
    if (!go && (Math.hypot(x - this.at[0], z - this.at[1]) > move || Math.abs(Math.atan2(Math.sin(yaw - this.yaw), Math.cos(yaw - this.yaw))) > turn)) go = true;
    if (go) {
      this.n = 0;
      this.at = [x, z];
      this.yaw = yaw;
    }
    return go;
  }
}
