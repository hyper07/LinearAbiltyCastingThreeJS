/**
 * The platform's API for game packages (api 1): the ONLY thing a game in games/<code>/
 * gets from the platform. Its entry module exports
 *
 *   export async function mount(container, platform) → { root, dispose(), view? }
 *
 * and the platform calls it with the object made here. Keep it small and stable: a
 * production release is built against it and must keep working for as long as it is
 * live, so fields are only ever added (bump GAME_API in server/gamePackages.js and in
 * here for a breaking change, and keep api 1 working for the releases built on it).
 *
 * @typedef {object} PlatformApi
 * @property {1} api                       the API version
 * @property {{ id: number, name: string, plan?: string } | null} account  the signed-in player, or null
 * @property {{ id: string, code: string, slug: string, title: string }} game  which game this is
 * @property {{ channel: 'production'|'draft', version: string|null }} release  what is running
 * @property {boolean} dev                 the platform's development server (Vite)
 * @property {() => void} exit             the game has closed its screen: the platform takes over
 * @property {(event: string, data?: object) => void} track  count something (plays are already counted)
 * @property {URLSearchParams} params      the page's query (scene params for a dev loop: ?course=…&laps=…)
 * @property {{ away: () => void, back: () => void }} music  the platform's own music steps aside / comes back
 */

export const GAME_API = 1;

/** @returns {PlatformApi} */
export function createPlatformApi({ account = null, game, release, dev = false, onExit = () => {}, onTrack = () => {}, music = {}, search = '' }) {
  let exited = false;
  return Object.freeze({
    api: GAME_API,
    account: account ? Object.freeze({ id: account.id, name: account.name, plan: account.plan }) : null,
    game: Object.freeze({ id: game.id, code: game.code, slug: game.slug, title: game.title }),
    release: Object.freeze({ channel: release?.channel ?? 'production', version: release?.version ?? null }),
    dev: Boolean(dev),
    params: new URLSearchParams(search),
    exit() {
      if (exited) return;
      exited = true;
      onExit();
    },
    track(event, data = {}) {
      try {
        onTrack(String(event).slice(0, 40), data);
      } catch {
        /* never the game's problem */
      }
    },
    music: Object.freeze({ away: () => music.away?.(), back: () => music.back?.() })
  });
}
