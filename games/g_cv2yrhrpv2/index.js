/**
 * Kickrani's package entry (game.json "entry"): the only thing the platform calls.
 *
 *   const { root, dispose } = await mount(container, platform);
 *
 * `platform` is the stable game API (src/platform/gameApi.js, api 1): the signed-in
 * account, `exit()` to hand the screen back, and which release is running.
 */
import { SeoulGame } from './SeoulGame.js';
import { applyScene } from './devScene.js';

/**
 * @param {HTMLElement} container
 * @param {import('../../src/platform/gameApi.js').PlatformApi} platform
 */
export async function mount(container, platform) {
  let closed = false;
  const view = new SeoulGame(container, {
    account: platform.account ?? null,
    onClose: () => {
      if (closed) return;
      closed = true;
      platform.exit();
    }
  });
  await view.open();
  // ?race=1&course=…&laps=…&autopilot=1 (npm run game:dev, the smoke check): straight into a scene.
  applyScene(view, platform.params).catch((error) => console.warn('[kickrani] scene params:', error));
  return {
    root: view.root,
    view,
    /** The platform takes the screen back (the game's own ✕ calls platform.exit() instead). */
    dispose() {
      if (closed) return;
      closed = true;
      view.close();
    }
  };
}
