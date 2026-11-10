/**
 * The cast: who plays, who fights, who helps.
 *
 *   HEROES   the player's class — the built-in classes (platform/character/classes.js),
 *            or 'any' to let the player choose. A forged class id is accepted too.
 *   FOES     monster rosters: weights for the level's monster kinds (Level.js MONSTER_KINDS)
 *   HELPERS  NPC archetypes: a role (Level.js NPC_ROLE_NAMES), a body and their lines
 *
 * Text templates fill in {place}, {foes} and {goal} (FOES[].story is the {foes} text).
 */
export const HEROES = {
  any: { name: 'Player\'s choice', blurb: 'the player picks their own class', words: /any class|my class|player choose/ },
  knight: { name: 'Knight', blurb: 'sword and shield, tough', words: /knight|paladin|sword|shield|soldier/ },
  mage: { name: 'Mage', blurb: 'elemental spells at range', words: /mage|wizard|sorcer|witch|\bspells?\b|magician/ },
  barbarian: { name: 'Barbarian', blurb: 'big axe, rage, up close', words: /barbarian|viking|axe|warrior|berserk/ },
  amazon: { name: 'Amazon', blurb: 'fast archer with storm arrows', words: /amazon|archer|bow|hunter|ranger/ },
  shadowblade: { name: 'Shadowblade', blurb: 'quick, blinks and traps', words: /ninja|assassin|rogue|thief|shadow|stealth/ },
  templar: { name: 'Templar', blurb: 'holy knight of light', words: /templar|holy|priest|cleric/ },
  bonecaller: { name: 'Bonecaller', blurb: 'dark magic and lightning', words: /necromanc|bone|skeleton|dark mage|undead/ },
  wildwarden: { name: 'Wildwarden', blurb: 'frost and thorn nature magic', words: /druid|nature|warden|thorn|plant|beast master/ }
};
export const HERO_IDS = Object.keys(HEROES);

export const FOES = {
  imps: { name: 'Cinder Imps', story: 'Cinder Imps', blurb: 'lots of small fast imps', words: /imp|goblin|swarm|small|fire|little monster/, kinds: { grunt: 8, wisp: 2, brute: 1 } },
  spirits: { name: 'Gloom Wisps', story: 'Gloom Wisps', blurb: 'floating spirits that shoot', words: /ghost|spirit|wisp|phantom|shadow/, kinds: { wisp: 7, grunt: 2 } },
  brutes: { name: 'Iron Brutes', story: 'Iron Brutes', blurb: 'big slow heavy hitters', words: /brute|ogre|troll|giant|orc|big monster/, kinds: { brute: 6, grunt: 3, wisp: 1 } },
  golems: { name: 'Rift Golems', story: 'Rift Golems', blurb: 'stone golems with brute escorts', words: /golem|stone|rock|robot|construct|statue/, kinds: { golem: 2, brute: 4, grunt: 3 } },
  mixed: { name: 'Monster horde', story: 'monsters of every kind', blurb: 'a bit of everything', words: /horde|army|mixed|monsters|all kinds/, kinds: { grunt: 5, wisp: 3, brute: 3 } },
  none: { name: 'No monsters', story: 'no monsters at all', blurb: 'nothing to fight (calm)', words: /no monsters|peaceful|calm/, kinds: {} }
};
export const FOE_IDS = Object.keys(FOES);
/** The kind that stands guard when a layout has sentries. */
export const mainKind = (foes) => Object.entries(FOES[foes]?.kinds ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

const KAYKIT = 'kaykit/KayKit-Character-Pack-Adventures-1.0/addons/kaykit_character_pack_adventures/Characters/gltf/';

export const HELPERS = {
  guide: {
    role: 'guide',
    title: 'Guide',
    model: `${KAYKIT}Knight`,
    greeting: 'Welcome to {place}! I\'ll tell you what\'s going on.',
    lines: ['Our trouble: {foes}. Your task: {goal}.', 'Use the keys 1 to 9 for skills and potions.', 'Good luck — {place} believes in you!']
  },
  merchant: {
    role: 'merchant',
    title: 'Merchant',
    model: `${KAYKIT}Rogue`,
    greeting: 'Gold for gear, friend. Have a look before the next wave.',
    lines: ['Potions and gear, fair prices.', 'Come back when your bag is heavier.']
  },
  healer: {
    role: 'healer',
    title: 'Healer',
    model: `${KAYKIT}Mage`,
    greeting: 'Hurt? Come close and I\'ll patch you up.',
    lines: ['Rest a moment.', 'Keep your health potions on a key you can reach.']
  },
  quest: {
    role: 'quest',
    title: 'Quest-giver',
    model: `${KAYKIT}Barbarian`,
    greeting: 'You look strong. Will you help {place}?',
    lines: ['Bring down the monsters and come back to me.', 'There\'s a reward in it for you.']
  },
  tutor: {
    role: 'tutor',
    title: 'Tutor',
    model: `${KAYKIT}Rogue_Hooded`,
    greeting: 'Hello, clever one! Ready for a question?',
    lines: ['Take your time and think it through.']
  },
  stash: {
    role: 'stash',
    title: 'Stash keeper',
    model: `${KAYKIT}Knight`,
    greeting: 'Your stash is safe with me.',
    lines: ['Leave what you don\'t need here.']
  }
};
export const HELPER_IDS = Object.keys(HELPERS);

/** Study subjects a tutor can teach (npc/Study.js SUBJECTS); 'none' outside study genres. */
export const SUBJECT_IDS = ['none', 'add', 'subtract', 'times', 'mixed', 'custom'];
export const SUBJECT_WORDS = {
  times: /times|multipl|tables/,
  subtract: /subtract|minus|take away/,
  add: /addition|adding|\bplus\b|sums/,
  mixed: /math|arithmetic|numbers|\bcount(ing)?\b/
};
