/**
 * Plans: what each kind of account gets from the AI. One table, read by the
 * server (which enforces it, server/api/ai.js) and the browser (which only
 * shows it). Change a number here and both follow.
 *
 *   model          which model the server uses for creation tasks:
 *                  'standard' = LLM_MODEL1, 'premium' = LLM_PREMIUM_MODEL (falls back to standard)
 *   buildsPerDay   AI creations (games, maps, classes) per account (or address) per UTC day
 *   maxTokens      the most output tokens one request of each task may ask for
 *   features       what the builder and editors offer
 *
 * Tasks: 'game' (a game spec from the menus), 'game-custom' (a Plus build that
 * goes past the menus), 'map', 'class', 'npc' (helper talk), 'command' (the
 * in-fight commander), 'other'.
 */
export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    model: 'standard',
    buildsPerDay: 20,
    maxTokens: { game: 400, 'game-custom': 0, map: 900, class: 1500, npc: 300, command: 600, other: 600 },
    features: {
      quickBuild: true, // build from the menus, no AI needed
      aiBuild: true, // describe a game; the AI picks from the menus
      customBuild: false, // the AI writes its own map, chapter stories, helper lines and questions
      premiumModel: false
    }
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    model: 'premium',
    buildsPerDay: 300,
    maxTokens: { game: 600, 'game-custom': 3500, map: 1500, class: 2500, npc: 600, command: 600, other: 1000 },
    features: {
      quickBuild: true,
      aiBuild: true,
      customBuild: true,
      premiumModel: true
    }
  }
};

export const PLAN_IDS = Object.keys(PLANS);
export const TASKS = ['game', 'game-custom', 'map', 'class', 'npc', 'command', 'other'];
/** Tasks that count against `buildsPerDay`, and that use the plan's model. */
export const CREATION_TASKS = new Set(['game', 'game-custom', 'map', 'class']);

export const planById = (id) => PLANS[id] ?? PLANS.free;
export const taskOf = (task) => (TASKS.includes(task) ? task : 'other');
