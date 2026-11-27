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
 * in-fight commander), 'tutor' (AI Arcademia's Professor Hoot — Plus only), 'other'.
 *
 *   price          what the plan costs a month (shown; payments are TEST MODE only —
 *                  server/studio/payments.js, docs/game-studio.md)
 *   studio         the Game Studio's limits (docs/game-studio.md, "Plans"):
 *     privateGames         games kept private or shared with a class — null = no limit (every plan:
 *                          an educator builds as many class simulators as they like, with free assets)
 *     publicGames          games listed on the home page for everyone (null = no limit)
 *     chatEditsPerDay      chat-box changes accepted per UTC day
 *     generationsPerMonth  heavy AI generation jobs (picture-to-3D, voices, music) per calendar month (UTC)
 *     paidAssets           'buy' (full price) | 'discount' (assetDiscount % off each paid asset)
 *     assetDiscount        % off paid assets in the store
 *     sell                 may sell assets in the store (sharing for free is open to every plan)
 *     revenueShare         % of each sale the seller earns (the rest keeps the platform running)
 *     storageMB            the game data and saved characters an account may keep
 *     classes              classes an educator may run at once; classMembers students in each
 */
export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    model: 'standard',
    buildsPerDay: 20,
    maxTokens: { game: 400, 'game-custom': 0, map: 900, class: 1500, npc: 300, command: 600, tutor: 0, other: 600 },
    features: {
      quickBuild: true, // build from the menus, no AI needed
      aiBuild: true, // describe a game; the AI picks from the menus
      customBuild: false, // the AI writes its own map, chapter stories, helper lines and questions
      premiumModel: false,
      tutor: false // AI Arcademia's AI tutor; free players get the prebuilt hints and worked answers
    },
    price: { krw: 0, usd: 0 },
    studio: {
      privateGames: null,
      publicGames: 1,
      chatEditsPerDay: 30,
      generationsPerMonth: 3,
      paidAssets: 'buy',
      assetDiscount: 0,
      sell: false,
      revenueShare: 0,
      storageMB: 50,
      classes: 5,
      classMembers: 40
    }
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    model: 'premium',
    buildsPerDay: 300,
    maxTokens: { game: 600, 'game-custom': 3500, map: 1500, class: 2500, npc: 600, command: 600, tutor: 350, other: 1000 },
    features: {
      quickBuild: true,
      aiBuild: true,
      customBuild: true,
      premiumModel: true,
      tutor: true
    },
    price: { krw: 5900, usd: 4.99 },
    studio: {
      privateGames: null,
      publicGames: 5,
      chatEditsPerDay: 200,
      generationsPerMonth: 30,
      paidAssets: 'discount',
      assetDiscount: 10,
      sell: false,
      revenueShare: 0,
      storageMB: 500,
      classes: 20,
      classMembers: 60
    }
  },
  creator: {
    id: 'creator',
    name: 'Creator',
    model: 'premium',
    buildsPerDay: 600,
    maxTokens: { game: 600, 'game-custom': 4000, map: 1800, class: 2500, npc: 600, command: 600, tutor: 350, other: 1200 },
    features: {
      quickBuild: true,
      aiBuild: true,
      customBuild: true,
      premiumModel: true,
      tutor: true
    },
    price: { krw: 14900, usd: 11.99 },
    studio: {
      privateGames: null,
      publicGames: null,
      chatEditsPerDay: 1000,
      generationsPerMonth: 200,
      paidAssets: 'discount',
      assetDiscount: 20,
      sell: true,
      revenueShare: 70,
      storageMB: 5000,
      classes: 50,
      classMembers: 200
    }
  }
};

export const PLAN_IDS = Object.keys(PLANS);
export const TASKS = ['game', 'game-custom', 'map', 'class', 'npc', 'command', 'tutor', 'other'];
/** Tasks that count against `buildsPerDay`, and that use the plan's model. */
export const CREATION_TASKS = new Set(['game', 'game-custom', 'map', 'class']);

export const planById = (id) => PLANS[id] ?? PLANS.free;
export const taskOf = (task) => (TASKS.includes(task) ? task : 'other');

/** The Studio's limits for a plan (one table above; null = no limit). */
export const studioLimits = (id) => planById(id).studio;
/** True when `used` more would stay inside `limit` (null = no limit). */
export const withinLimit = (limit, used, more = 1) => limit == null || used + more <= limit;
/** The order plans go up in (the upgrade page). */
export const PLAN_ORDER = ['free', 'plus', 'creator'];
