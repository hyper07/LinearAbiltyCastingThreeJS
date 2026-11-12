import actionRpg from './action-rpg.json' with { type: 'json' };
import strategy from './strategy-competitive.json' with { type: 'json' };
import rpgFamily from './rpg-family.json' with { type: 'json' };
import manhwa from './manhwa.json' with { type: 'json' };
import manga from './manga.json' with { type: 'json' };

/** The character files, by family (the same families as the works). */
export default {
  'action-rpg': actionRpg,
  'strategy-competitive': strategy,
  'rpg-family': rpgFamily,
  manhwa,
  manga
};
