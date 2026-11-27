/**
 * Straight into a scene from the address — the per-game dev loop (`npm run game:dev -- kickrani
 * --race 1 …`) and the smoke check, so nobody clicks through the lobby to see a change:
 *
 *   hour=<0-24>          the city clock          mode=fly|walk|drive   the camera / you
 *   course=<id>          a course (course.js)    laps=<1-9>
 *   time=<pick>          weather.js TIME_PICKS   weather=<kind|random> weather.js WEATHERS
 *   race=1               start a solo race once the city has loaded
 *   autopilot=1          the bot rides for you (as the e2e checks do)
 *
 * Read from `platform.params` (src/platform/gameApi.js). Anything unknown is ignored; nothing
 * here runs without params, so players never see it.
 */
import { BIKE_COURSES } from './course.js';
import { TIME_PICKS, WEATHERS } from './weather.js';

const MODES = new Set(['fly', 'walk', 'drive']);

/** The params this game understands, checked; the rest dropped. */
export function sceneParams(params) {
  const get = (k) => params?.get?.(k) ?? null;
  const out = {};
  const hour = Number(get('hour'));
  if (get('hour') !== null && Number.isFinite(hour) && hour >= 0 && hour <= 24) out.hour = hour;
  if (MODES.has(get('mode'))) out.mode = get('mode');
  if (BIKE_COURSES.some((c) => c.id === get('course'))) out.course = get('course');
  const laps = Number(get('laps'));
  if (Number.isInteger(laps) && laps >= 1 && laps <= 9) out.laps = laps;
  if (get('time') && Object.hasOwn(TIME_PICKS, get('time'))) out.time = get('time');
  if (get('weather') && (get('weather') === 'random' || Object.hasOwn(WEATHERS, get('weather')))) out.weather = get('weather');
  if (get('race') === '1') out.race = true;
  if (get('autopilot') === '1') out.autopilot = true;
  return out;
}

/** Apply them to an open SeoulGame: the clock and camera at once, the race when the map is in. */
export async function applyScene(view, params, { timeout = 60_000 } = {}) {
  const s = sceneParams(params);
  if (!Object.keys(s).length) return s;
  if (s.hour !== undefined) view.setHour(s.hour);
  const race = view.race;
  const setup = {};
  if (s.course) setup.course = s.course;
  if (s.laps) setup.laps = s.laps;
  if (s.time) setup.time = s.time;
  if (s.weather) setup.weather = s.weather;
  if (Object.keys(setup).length) race._setup(setup, false);
  if (s.autopilot) race.autopilot = true;
  const until = performance.now() + timeout;
  while (!view.ready && performance.now() < until && view.root?.isConnected) await new Promise((r) => setTimeout(r, 200));
  if (!view.ready) return s;
  if (s.mode) view.setMode(s.mode);
  if (s.race) race.startSolo();
  return s;
}
