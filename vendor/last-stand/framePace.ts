// The game's step a frame, paced: the frames' mean interval, not each one's own. A browser's frame times can come on
// another screen's ticks than the one the window is shown on: Chrome on Windows on a 60 Hz monitor beside a 145 Hz
// one gave its frames 2 and 3 of the 145 Hz ticks in turn (13.8 and 20.7 ms) while the screen showed each for 16.7
// (traces T9NG-CZ79, GYKX-N2GP, 0HSJ-60QV). Stepped by those, the world moved a half more in one shown frame than in
// the next, every frame: a judder at an even 60 a second (#552, from play: "playing on a secondary monitor with lower
// refresh rate lags"). Paced, each frame steps by the mean, and the time the frames' own clock has and the game's
// hasn't is paid back a share a frame, so game time keeps the browser's within a frame. A frame far off the mean (a
// hitch, a refresh missed) steps by all that's owed at once; a run of them is a new rate, the mean taken to it.
// Uncapped frames (core/frameLoop.ts) are stepped as they come. `npm run lab -- pace` holds it.

/** a frame's interval this many times the mean or more (or its inverse or less) is off the steady pace */
const OFF_PACE = 1.5;
/** how far a steady frame's interval moves the mean */
const MEAN_SHARE = 0.05;
/** how far a run of frames off the pace moves it (the screen's rate changed: a window moved to another monitor) */
const NEW_RATE_SHARE = 0.5;
/** the share of what's owed each steady frame pays back */
const PAY_SHARE = 0.1;
/** this many frames in a row of the very same interval are a clock that needs no pacing (the lab's): stepped by it */
const EXACT_RUN = 3;

/** Paces a frame's step by the frames' mean interval (all in seconds). */
export class FramePace {
  /** the mean interval of the steady frames, or 0 before the first */
  private mean = 0;
  /** the time the frames' clock has passed and the steps haven't (negative where the steps are ahead) */
  private owed = 0;
  /** whether the last frame was off the pace */
  private wasOff = false;
  /** the last frame's interval, and how many frames in a row have had it */
  private last = -1;
  private run = 0;

  /** The step for a frame `interval` after the last. */
  next(interval: number): number {
    this.owed += interval;
    this.run = interval === this.last ? this.run + 1 : 0;
    this.last = interval;
    // (a clock as even as that is stepped by exactly its interval from here: what's owed paid now, the mean its own)
    if (this.mean <= 0 || this.run === EXACT_RUN) return this.payAll(interval);
    const off = interval >= this.mean * OFF_PACE || interval <= this.mean / OFF_PACE;
    if (off) {
      if (this.wasOff) this.mean += (interval - this.mean) * NEW_RATE_SHARE;
      this.wasOff = true;
      return this.payAll(this.mean);
    }
    this.wasOff = false;
    this.mean += (interval - this.mean) * MEAN_SHARE;
    // (what's owed past the mean, a share of it: the frames' clock's quantization paid back over some 10 frames)
    const step = this.mean + (this.owed - this.mean) * PAY_SHARE;
    // (never more than a frame behind or ahead: a drift that large is paid at once)
    if (Math.abs(this.owed - step) > this.mean) return this.payAll(this.mean);
    this.owed -= step;
    return step;
  }

  /** Starts again from the next frame (the frames' pace changed: uncapped, or back to the browser's). */
  reset(): void {
    this.mean = 0;
    this.owed = 0;
    this.wasOff = false;
    this.last = -1;
    this.run = 0;
  }

  /** A step of all that's owed, the mean set to `mean`. */
  private payAll(mean: number): number {
    this.mean = mean;
    const step = Math.max(0, this.owed);
    this.owed -= step;
    return step;
  }
}

/** the game's frames' pace (main.ts) */
const pace = new FramePace();
/** whether frames are stepped as they come (a harness's canary, or uncapped frames) */
let held = false;
let wasPaced = false;

/** Steps as they come while `on` (the lab's canary: the judder must be found). */
export function holdFramePace(on: boolean): void {
  held = on;
}

// (a dev build hands the hold to a harness on the page as `__holdFramePace`: the lab's page loads a module of its own
// by another address than the game's, and a hold set on that copy held nothing; production has none)
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  (window as unknown as { __holdFramePace: typeof holdFramePace }).__holdFramePace = holdFramePace;
}

/** The game's step for a frame `interval` (s) after the last, paced where `paced` (frames synced to the browser's). */
export function pacedStep(interval: number, paced: boolean): number {
  const now = paced && !held;
  if (now !== wasPaced) pace.reset();
  wasPaced = now;
  return now ? pace.next(interval) : interval;
}
