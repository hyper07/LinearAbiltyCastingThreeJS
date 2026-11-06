/**
 * Master weapon list — archetypes from FPS, RPG, action, and sci-fi games.
 *
 * Names are generic (no trademarks). Each row becomes a registered weapon via
 * `catalog.js`. Add a row here and it appears in the armory automatically.
 */

import { WEAPON_CATEGORIES as C } from './WeaponDefinition.js';

/** @typedef {import('./WeaponDefinition.js').WeaponDefinition & { weight?: string }} ArsenalEntry */

/** @type {Partial<ArsenalEntry>[]} */
export const WEAPON_ARSENAL = [
  /* ================================================================ */
  /* Unarmed                                                           */
  /* ================================================================ */
  {
    id: 'unarmed',
    label: 'Unarmed',
    category: C.UNARMED,
    visual: 'unarmed',
    weight: 'light',
    description: 'Empty hands — fastest casts, zero encumbrance.'
  },
  {
    id: 'iron-fists',
    label: 'Iron Fists',
    category: C.UNARMED,
    visual: 'fist-gauntlet',
    weight: 'light',
    description: 'Armored knuckles — brawler archetype from fighting games.'
  },
  {
    id: 'combat-gauntlets',
    label: 'Combat Gauntlets',
    category: C.UNARMED,
    visual: 'fist-gauntlet',
    weight: 'medium',
    description: 'Heavy plated gloves — slower swings, harder impact accent.'
  },
  {
    id: 'wolverine-claws',
    label: 'Retractable Claws',
    category: C.UNARMED,
    visual: 'fist-claw',
    attachPoint: 'handR',
    attachSecondary: 'handL',
    weight: 'light',
    description: 'Dual claw racks — fast sprint, aggressive melee posture.'
  },

  /* ================================================================ */
  /* Magic — wands, staves, orbs, tomes (RPG / MOBA / wizard games)   */
  /* ================================================================ */
  { id: 'arcane-wand', label: 'Arcane Wand', category: C.MAGIC, visual: 'wand-arcane', weight: 'magic', description: 'Classic wizard focus — balanced elemental casting.' },
  { id: 'crystal-wand', label: 'Crystal Wand', category: C.MAGIC, visual: 'wand-crystal', weight: 'magic', description: 'Mage tower staple — extended forward lunge on cast.' },
  { id: 'ember-wand', label: 'Ember Wand', category: C.MAGIC, visual: 'wand-ember', weight: 'magic', description: 'Fire-mage starter — sharp, hot release.' },
  { id: 'frost-wand', label: 'Frost Wand', category: C.MAGIC, visual: 'wand-frost', weight: 'magic', description: 'Ice spec — smooth recovery between spells.' },
  { id: 'shadow-wand', label: 'Shadow Wand', category: C.MAGIC, visual: 'wand-shadow', weight: 'magic', description: 'Warlock focus — low profile, quick blend-in.' },
  { id: 'holy-wand', label: 'Holy Wand', category: C.MAGIC, visual: 'wand-holy', weight: 'magic', description: 'Cleric channel — upright cast posture.' },
  { id: 'arcane-staff', label: 'Arcane Staff', category: C.MAGIC, visual: 'staff-arcane', weight: 'magic', description: 'Two-hand staff — MMORPG classic.' },
  { id: 'druid-staff', label: 'Druid Staff', category: C.MAGIC, visual: 'staff-nature', weight: 'magic', description: 'Nature caster — gnarled wood, slower stride.' },
  { id: 'necro-staff', label: 'Necromancer Staff', category: C.MAGIC, visual: 'staff-dark', weight: 'heavy', description: 'Death mage — heavy skull topper, deep lunge.' },
  { id: 'battle-staff', label: 'Battle Staff', category: C.MAGIC, visual: 'staff-battle', weight: 'medium', description: 'Monk quarterstaff — martial magic hybrid.' },
  { id: 'scepter', label: 'Royal Scepter', category: C.MAGIC, visual: 'scepter', weight: 'magic', description: 'Paladin / support — regal one-hand focus.' },
  { id: 'crystal-orb', label: 'Crystal Orb', category: C.MAGIC, visual: 'orb-crystal', weight: 'magic', description: 'Fortune-teller orb — off-hand caster style.' },
  { id: 'void-orb', label: 'Void Orb', category: C.MAGIC, visual: 'orb-void', weight: 'magic', description: 'Warlock soul shard — compact, fast casts.' },
  { id: 'grimoire', label: 'Grimoire', category: C.MAGIC, visual: 'tome', weight: 'magic', description: 'Spellbook — Diablo / Skyrim conjurer trope.' },
  { id: 'spell-tome', label: 'Spell Tome', category: C.MAGIC, visual: 'tome-large', weight: 'medium', description: 'Heavy codex — slower footwork, big wind-up.' },

  /* ================================================================ */
  /* Swords — action RPG, soulslike, hack-and-slash                   */
  /* ================================================================ */
  { id: 'shortsword', label: 'Shortsword', category: C.SWORD, visual: 'sword-short', weight: 'light', description: 'Dungeon crawler sidearm — quick and light.' },
  { id: 'longsword', label: 'Longsword', category: C.SWORD, visual: 'sword-long', weight: 'medium', description: 'Fantasy default — versatile two-hand blade.' },
  { id: 'broadsword', label: 'Broadsword', category: C.SWORD, visual: 'sword-broad', weight: 'heavy', description: 'Wide blade — Crusader / RPG knight weapon.' },
  { id: 'greatsword', label: 'Greatsword', category: C.SWORD, visual: 'sword-great', weight: 'heavy', description: 'Ultra greatsword — slow, massive cast lean.' },
  { id: 'zweihander', label: 'Zweihander', category: C.SWORD, visual: 'sword-great', weight: 'heavy', description: 'Dark fantasy slab blade — heaviest sword class.' },
  { id: 'katana', label: 'Katana', category: C.SWORD, visual: 'sword-katana', weight: 'light', description: 'Samurai blade — fast draw, anime action staple.' },
  { id: 'rapier', label: 'Rapier', category: C.SWORD, visual: 'sword-rapier', weight: 'light', description: 'Fencer thrust sword — nimble footwork.' },
  { id: 'scimitar', label: 'Scimitar', category: C.SWORD, visual: 'sword-curve', weight: 'light', description: 'Curved desert blade — rogue / ranger sidearm.' },
  { id: 'cutlass', label: 'Cutlass', category: C.SWORD, visual: 'sword-curve', weight: 'medium', description: 'Pirate saber — Sea of Thieves archetype.' },
  { id: 'claymore', label: 'Claymore', category: C.SWORD, visual: 'sword-long', weight: 'heavy', description: 'Scottish two-hander — heavy swings.' },
  { id: 'falchion', label: 'Falchion', category: C.SWORD, visual: 'sword-broad', weight: 'medium', description: 'Single-edged cleaver sword — medieval brawler.' },
  { id: 'energy-blade', label: 'Energy Blade', category: C.SWORD, visual: 'scifi-saber', weight: 'light', description: 'Sci-fi sword — glowing plasma edge.' },

  /* ================================================================ */
  /* Axes & blunt — Viking, RPG, survival                             */
  /* ================================================================ */
  { id: 'hand-axe', label: 'Hand Axe', category: C.AXE, visual: 'axe-hand', weight: 'medium', description: 'Skyrim / survival starter — one-hand chopper.' },
  { id: 'battle-axe', label: 'Battle Axe', category: C.AXE, visual: 'axe-battle', weight: 'heavy', description: 'Viking raider — wide arc, heavy gait.' },
  { id: 'war-axe', label: 'War Axe', category: C.AXE, visual: 'axe-battle', weight: 'heavy', description: 'Barbarian two-hand — slow, devastating.' },
  { id: 'throwing-axe', label: 'Throwing Axe', category: C.AXE, visual: 'axe-hand', weight: 'light', description: 'Hunter ranged-melee — lighter head.' },
  { id: 'pickaxe', label: 'Pickaxe', category: C.AXE, visual: 'axe-pick', weight: 'medium', description: 'Mining tool turned weapon — sandbox survival trope.' },
  { id: 'mace', label: 'Mace', category: C.AXE, visual: 'blunt-mace', weight: 'heavy', description: 'Holy order blunt — plate-crushing head.' },
  { id: 'war-hammer', label: 'War Hammer', category: C.AXE, visual: 'blunt-hammer', weight: 'heavy', description: 'Paladin two-hand — Monster Hunter hammer vibe.' },
  { id: 'maul', label: 'Maul', category: C.AXE, visual: 'blunt-hammer', weight: 'heavy', description: 'Oversized hammer — slowest blunt class.' },
  { id: 'flail', label: 'Flail', category: C.AXE, visual: 'blunt-flail', weight: 'medium', description: 'Chain head — medieval fighter oddball.' },
  { id: 'club', label: 'Spiked Club', category: C.AXE, visual: 'blunt-mace', weight: 'medium', description: 'Caveman to orc — simplest blunt weapon.' },

  /* ================================================================ */
  /* Polearms — spears, halberds, scythes                              */
  /* ================================================================ */
  { id: 'spear', label: 'Spear', category: C.POLEARM, visual: 'pole-spear', weight: 'medium', description: 'Phalanx / soulslike poke — reach weapon.' },
  { id: 'pike', label: 'Pike', category: C.POLEARM, visual: 'pole-spear', weight: 'heavy', description: 'Long infantry spear — slower advance.' },
  { id: 'halberd', label: 'Halberd', category: C.POLEARM, visual: 'pole-halberd', weight: 'heavy', description: 'Axe-spear hybrid — guard polearm.' },
  { id: 'glaive', label: 'Glaive', category: C.POLEARM, visual: 'pole-glaive', weight: 'medium', description: 'Sliding blade on staff — wuxia / RPG polearm.' },
  { id: 'naginata', label: 'Naginata', category: C.POLEARM, visual: 'pole-glaive', weight: 'medium', description: 'Japanese pole blade — samurai support weapon.' },
  { id: 'trident', label: 'Trident', category: C.POLEARM, visual: 'pole-trident', weight: 'medium', description: 'Poseidon / aquatic boss fork.' },
  { id: 'scythe', label: 'Scythe', category: C.POLEARM, visual: 'pole-scythe', weight: 'heavy', description: 'Grim reaper — Dark Souls curved polearm.' },
  { id: 'lance', label: 'Lance', category: C.POLEARM, visual: 'pole-lance', weight: 'heavy', description: 'Mounted knight lance — long and narrow.' },

  /* ================================================================ */
  /* Knives & daggers — stealth, CS, action                           */
  /* ================================================================ */
  { id: 'combat-knife', label: 'Combat Knife', category: C.KNIFE, visual: 'knife-combat', weight: 'light', description: 'Military sidearm — Call of Duty melee.' },
  { id: 'tanto', label: 'Tanto', category: C.KNIFE, visual: 'knife-tanto', weight: 'light', description: 'Japanese dagger — stealth finishers.' },
  { id: 'stiletto', label: 'Stiletto', category: C.KNIFE, visual: 'knife-stiletto', weight: 'light', description: 'Assassin needle — minimal wind-up.' },
  { id: 'kukri', label: 'Kukri', category: C.KNIFE, visual: 'knife-kukri', weight: 'light', description: 'Gurkha curve — FPS melee classic.' },
  { id: 'bowie-knife', label: 'Bowie Knife', category: C.KNIFE, visual: 'knife-combat', weight: 'medium', description: 'Western survival blade.' },
  { id: 'switchblade', label: 'Switchblade', category: C.KNIFE, visual: 'knife-stiletto', weight: 'light', description: 'Street fighter auto-knife — fastest class.' },
  { id: 'cleaver', label: 'Cleaver', category: C.KNIFE, visual: 'knife-cleaver', weight: 'medium', description: 'Butcher blade — horror / brawler.' },
  { id: 'twin-daggers', label: 'Twin Daggers', category: C.KNIFE, visual: 'knife-dual', attachSecondary: 'handL', weight: 'light', description: 'Dual wield — Diablo rogue / AC syndicate.' },
  { id: 'dual-katanas', label: 'Dual Wakizashi', category: C.KNIFE, visual: 'sword-katana', attachSecondary: 'handL', weight: 'light', description: 'Two short blades — action game dual wield.' },

  /* ================================================================ */
  /* Pistols & SMGs — FPS staples                                     */
  /* ================================================================ */
  { id: 'pistol', label: 'Sidearm', category: C.PISTOL, visual: 'pistol-service', weight: 'gun', description: 'Universal backup gun — Halo / COD sidearm.' },
  { id: 'revolver', label: 'Revolver', category: C.PISTOL, visual: 'pistol-revolver', weight: 'gun', description: 'Western six-shooter — heavy hand cannon feel.' },
  { id: 'hand-cannon', label: 'Hand Cannon', category: C.PISTOL, visual: 'pistol-heavy', weight: 'heavy', description: 'Desert eagle archetype — big kick.' },
  { id: 'smg', label: 'SMG', category: C.PISTOL, visual: 'pistol-smg', weight: 'gun', description: 'Compact automatic — run-and-gun FPS.' },
  { id: 'machine-pistol', label: 'Machine Pistol', category: C.PISTOL, visual: 'pistol-smg', weight: 'light', description: 'Glock auto — fastest gun class.' },
  { id: 'dual-pistols', label: 'Dual Pistols', category: C.PISTOL, visual: 'pistol-service', attachSecondary: 'handL', weight: 'gun', description: 'John Woo / Tomb Raider akimbo.' },
  { id: 'plasma-pistol', label: 'Plasma Pistol', category: C.PISTOL, visual: 'scifi-pistol', weight: 'gun', description: 'Doom / Halo energy sidearm.' },

  /* ================================================================ */
  /* Rifles & shotguns — military FPS                                 */
  /* ================================================================ */
  { id: 'assault-rifle', label: 'Assault Rifle', category: C.RIFLE, visual: 'rifle-assault', weight: 'gun', description: 'AK / M4 archetype — default FPS rifle.' },
  { id: 'carbine', label: 'Carbine', category: C.RIFLE, visual: 'rifle-carbine', weight: 'gun', description: 'Short rifle — CQB military.' },
  { id: 'burst-rifle', label: 'Burst Rifle', category: C.RIFLE, visual: 'rifle-assault', weight: 'gun', description: 'Three-round burst — tactical shooter.' },
  { id: 'dmr', label: 'DMR', category: C.RIFLE, visual: 'rifle-sniper', weight: 'gun', description: 'Designated marksman — semi-auto precision.' },
  { id: 'sniper-rifle', label: 'Sniper Rifle', category: C.RIFLE, visual: 'rifle-sniper', weight: 'heavy', description: 'AWP / intervention — slow, heavy kick.' },
  { id: 'shotgun', label: 'Shotgun', category: C.RIFLE, visual: 'rifle-shotgun', weight: 'gun', description: 'Pump shotgun — close-range FPS king.' },
  { id: 'combat-shotgun', label: 'Combat Shotgun', category: C.RIFLE, visual: 'rifle-shotgun', weight: 'heavy', description: 'Auto shotgun — room clearer.' },
  { id: 'lmg', label: 'LMG', category: C.RIFLE, visual: 'rifle-lmg', weight: 'heavy', description: 'Squad machine gun — suppressed movement.' },
  { id: 'plasma-rifle', label: 'Plasma Rifle', category: C.RIFLE, visual: 'scifi-rifle', weight: 'gun', description: 'Alien shooter energy rifle.' },
  { id: 'laser-rifle', label: 'Laser Rifle', category: C.RIFLE, visual: 'scifi-rifle', weight: 'gun', description: 'Clean beam rifle — sci-fi standard.' },
  { id: 'pulse-carbine', label: 'Pulse Carbine', category: C.RIFLE, visual: 'scifi-rifle', weight: 'light', description: 'Compact energy carbine — fast sci-fi.' },

  /* ================================================================ */
  /* Bows — survival, RPG, battle royale                              */
  /* ================================================================ */
  { id: 'shortbow', label: 'Shortbow', category: C.BOW, visual: 'bow-short', weight: 'bow', description: 'Roguelike starter bow — quick nock.' },
  { id: 'longbow', label: 'Longbow', category: C.BOW, visual: 'bow-long', weight: 'bow', description: 'Medieval English longbow — Skyrim archer.' },
  { id: 'recurve-bow', label: 'Recurve Bow', category: C.BOW, visual: 'bow-short', weight: 'bow', description: 'Modern archery — balanced draw.' },
  { id: 'compound-bow', label: 'Compound Bow', category: C.BOW, visual: 'bow-compound', weight: 'medium', description: 'Hunting compound — tactical pulleys.' },
  { id: 'crossbow', label: 'Crossbow', category: C.BOW, visual: 'bow-cross', weight: 'medium', description: 'Medieval siege — slow, heavy draw.' },
  { id: 'heavy-crossbow', label: 'Heavy Crossbow', category: C.BOW, visual: 'bow-cross', weight: 'heavy', description: 'Ballista hand crossbow — max punch.' },

  /* ================================================================ */
  /* Heavy — launchers, miniguns, railguns                            */
  /* ================================================================ */
  { id: 'rocket-launcher', label: 'Rocket Launcher', category: C.HEAVY, visual: 'heavy-rocket', weight: 'heavy', description: 'Bazooka / RPG — max recoil accent.' },
  { id: 'grenade-launcher', label: 'Grenade Launcher', category: C.HEAVY, visual: 'heavy-grenade', weight: 'heavy', description: 'Underslung GL — arcing heavy shot.' },
  { id: 'minigun', label: 'Minigun', category: C.HEAVY, visual: 'heavy-minigun', weight: 'heavy', description: 'Predator / FPS finale gun — slow walk.' },
  { id: 'railgun', label: 'Railgun', category: C.HEAVY, visual: 'heavy-rail', weight: 'heavy', description: 'Quake / Apex charge rifle — charged release.' },
  { id: 'flamethrower', label: 'Flamethrower', category: C.HEAVY, visual: 'heavy-flame', weight: 'heavy', description: 'Pyro class — forward-heavy cast lean.' },
  { id: 'ion-cannon', label: 'Ion Cannon', category: C.HEAVY, visual: 'heavy-rail', weight: 'heavy', description: 'Mech assault cannon — sci-fi heavy.' }
];
