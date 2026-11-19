/**
 * What each game wires in to be light on the GPU: its saved graphics choice,
 * the frame-capped loop (paused in a hidden tab, on demand behind a still
 * menu), GPU timing and the power governor, the shadow pacer, the Graphics
 * menu and the FPS readout. Browser only; the rules are in power.js.
 *
 *   this.power = new PowerKit('gloamreach', { renderer, profile: { quietFps: 45, urgentFps: 60 }, onChange: () => this.applyPower() });
 *   this.power.start((ms) => this.frame(Math.min(0.05, ms / 1000), ms));
 *   …in frame: power.gpuBegin(); render; power.gpuEnd(); const lvl = power.sample(ms);
 */
import { PowerLoop, GpuTimer, PowerGovernor, ShadowPacer, loadGraphics, saveGraphics, choices, graphicsState, DETAIL } from './power.js';
import { graphicsMenu, fpsBadge } from './graphicsMenu.js';

/** The GPU's name, where the browser tells it. */
function gpuName(renderer) {
  try {
    const gl = renderer?.getContext();
    const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
    return String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER) ?? '');
  } catch {
    return '';
  }
}

/** Frame rate for a menu that still moves a little behind (the start screen's slow camera). */
export const MENU_FPS = 30;

export class PowerKit {
  /**
   * @param {string} id  the game (where its choice is saved)
   * @param {object} o
   * @param {object} [o.renderer]  a THREE.WebGLRenderer, to time the GPU
   * @param {object} [o.profile]   { quietFps, urgentFps }: Quiet's frame rate, and the rate it rises to in a fight
   * @param {string} [o.detail]    the governor's starting detail level (null: no governor)
   * @param {string[]} [o.levels]  the detail levels (default low…ultra)
   * @param {object} [o.features]  which Graphics rows to show
   * @param {(kit: PowerKit, why: string) => void} [o.onChange]  apply the new choice now
   */
  constructor(id, { renderer = null, profile = {}, detail = null, levels = DETAIL, features = {}, onChange = () => {} } = {}) {
    this.id = id;
    this.profile = profile;
    this.features = features;
    this.onChange = onChange;
    this.state = loadGraphics(id);
    this.levels = levels;
    this.governor = detail ? new PowerGovernor(this.state.preset, { levels, start: detail }) : null;
    this.timer = renderer ? new GpuTimer(renderer.getContext()) : null;
    // Chrome on Apple GPUs (ANGLE over Metal) has the timer, but its readings
    // include the CPU's time between command buffers — measured here at 2–3×
    // the real GPU work. There the governor uses the frame time instead.
    this.timerTrusted = Boolean(this.timer?.available) && !/apple|metal/i.test(gpuName(renderer));
    this.pacer = new ShadowPacer();
    this.urgent = false;
    this.menuKind = 'none';
    this.loop = null;
    this.badge = null;
    this.menus = new Set();
    this.frameNo = 0;
  }

  get choices() {
    return choices(this.state, this.profile);
  }

  get preset() {
    return this.state.preset;
  }

  /** The detail level the governor has settled on (or `fallback` without one). */
  detail(fallback = 'high') {
    return this.governor?.level ?? fallback;
  }

  /** The frame cap now: the choice, raised in a fight under the Quiet preset, lowered behind a moving menu. */
  get cap() {
    let fps = this.choices.fps;
    if (this.urgent && !this.state.custom && this.state.preset === 'quiet' && this.profile.urgentFps) fps = Math.max(fps, this.profile.urgentFps);
    if (this.menuKind === 'live') fps = fps ? Math.min(fps, MENU_FPS) : MENU_FPS;
    return fps;
  }

  start(frame) {
    this.loop = new PowerLoop((ms, now) => {
      this.frameNo++;
      frame(ms, now);
    }, { fps: this.cap }).start();
    return this;
  }

  stop() {
    this.loop?.stop();
  }

  /** Something needs the full rate (a fight): Quiet stops slowing down. */
  setUrgent(on) {
    if (this.urgent === on) return;
    this.urgent = on;
    this.loop?.setFps(this.cap);
  }

  /**
   * What's on screen: 'none' (playing), 'live' (a menu over a slowly moving
   * scene: at most MENU_FPS), 'still' (a menu over a frozen scene: draw only
   * when invalidated).
   */
  setMenu(kind) {
    this.menuKind = kind;
    this.loop?.setDemand(kind === 'still');
    this.loop?.setFps(this.cap);
    this.loop?.invalidate();
  }

  /** Draw one frame while on demand (a resize, a menu change). */
  invalidate() {
    this.loop?.invalidate();
  }

  /** Take a new graphics state (from the menu): save it, retarget, and let the game apply it now. */
  set(state, why = 'menu') {
    const prev = this.state;
    this.state = graphicsState(state);
    saveGraphics(this.id, this.state);
    if (this.governor && prev.preset !== this.state.preset) this.governor.setMode(this.state.preset);
    this.loop?.setFps(this.cap);
    this.loop?.invalidate();
    if (!this.state.showFps) this.badge?.remove();
    for (const m of this.menus) if (m.isConnected) m.refresh(this.state);
    this.onChange(this, why);
  }

  /** The Graphics section for a pause or settings menu. */
  menu(text) {
    const el = graphicsMenu({ state: this.state, profile: this.profile, features: this.features, text, onChange: (s) => this.set(s) });
    this.menus.add(el);
    for (const m of this.menus) if (!m.isConnected && m !== el) this.menus.delete(m);
    return el;
  }

  gpuBegin() {
    this.timer?.begin();
  }

  gpuEnd() {
    this.timer?.end();
  }

  /** GPU ms per frame (smoothed) where the browser can time it, else null. */
  get gpuMs() {
    return this.timer?.ms ?? null;
  }

  /**
   * After a frame: feed the governor (GPU time, or the CPU's frame time
   * without a timer). Returns a new detail level if it changed.
   */
  sample(frameMs) {
    const g = this.timer?.poll();
    if (!this.governor) return null;
    if (this.timerTrusted) return g == null ? null : this.governor.sample(g, frameMs);
    // The fallback: frame time against the cap — step down only when frames can't keep it.
    const cap = this.cap || 60;
    return this.governor.sample(frameMs, frameMs, 1000 / cap);
  }

  /** Whether the sun's shadow should be redrawn this frame (near shadows are redrawn every few frames, or when the view moves). */
  shadowDue(every, x, z, yaw) {
    return this.pacer.due(every, x, z, yaw);
  }

  /** Show FPS: keep the readout in `host` up to date (call each frame; it redraws twice a second). */
  showFps(host, extra = '') {
    if (!this.state.showFps) return;
    if (!this.badge) this.badge = fpsBadge();
    if (!this.badge.isConnected) host.append(this.badge);
    const now = performance.now();
    if (now - (this._badgeT ?? 0) < 500) return;
    this._badgeT = now;
    const gpu = this.gpuMs;
    this.badge.textContent = `${this.loop?.fps ?? 0} fps${gpu != null ? `  gpu ${gpu.toFixed(1)} ms` : ''}${extra ? `  ${extra}` : ''}`;
  }

  /** One line for ?debug stats: preset, cap, drawn fps, GPU ms. */
  debugLine() {
    const gpu = this.gpuMs;
    return `power ${this.state.custom ? 'custom' : this.state.preset}  cap ${this.cap || '∞'}  drawn ${this.loop?.fps ?? 0} fps  gpu ${gpu != null ? gpu.toFixed(2) + ' ms' + (this.timerTrusted ? '' : ' (timer not trusted here: frame time governs)') : 'n/a'}${this.governor ? `  detail ${this.governor.level}` : ''}`;
  }

  dispose() {
    this.stop();
    this.timer?.dispose();
    this.badge?.remove();
  }
}
