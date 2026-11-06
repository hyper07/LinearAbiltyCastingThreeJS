/**
 * Master weapon list — melee, magic, firearms, bows, heavy, throwing and
 * exotic weapons. How each one attacks is in `fire.js`.
 *
 * Names and descriptions are generic — no characters, brands or titles from
 * other games. Each row becomes a registered weapon via
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
  { id: 'grimoire', label: 'Grimoire', category: C.MAGIC, visual: 'tome', weight: 'magic', description: 'Spellbook — the conjurer’s classic.' },
  { id: 'spell-tome', label: 'Spell Tome', category: C.MAGIC, visual: 'tome-large', weight: 'medium', description: 'Heavy codex — slower footwork, big wind-up.' },

  /* ================================================================ */
  /* Swords — action RPG, soulslike, hack-and-slash                   */
  /* ================================================================ */
  { id: 'shortsword', label: 'Shortsword', category: C.SWORD, visual: 'sword-short', weight: 'light', description: 'Dungeon crawler sidearm — quick and light.' },
  { id: 'longsword', label: 'Longsword', category: C.SWORD, visual: 'sword-long', weight: 'medium', description: 'Fantasy default — versatile blade that leaves a hand free for a shield.' },
  { id: 'broadsword', label: 'Broadsword', category: C.SWORD, visual: 'sword-broad', weight: 'heavy', description: 'Wide blade — the crusading knight’s weapon.' },
  { id: 'greatsword', label: 'Greatsword', category: C.SWORD, visual: 'sword-great', weight: 'heavy', description: 'Huge greatsword — slow, massive swings.' },
  { id: 'zweihander', label: 'Zweihander', category: C.SWORD, visual: 'sword-great', weight: 'heavy', description: 'Dark fantasy slab blade — heaviest sword class.' },
  { id: 'katana', label: 'Katana', category: C.SWORD, visual: 'sword-katana', weight: 'light', description: 'Samurai blade — fast draw, anime action staple.' },
  { id: 'rapier', label: 'Rapier', category: C.SWORD, visual: 'sword-rapier', weight: 'light', description: 'Fencer thrust sword — nimble footwork.' },
  { id: 'scimitar', label: 'Scimitar', category: C.SWORD, visual: 'sword-curve', weight: 'light', description: 'Curved desert blade — rogue / ranger sidearm.' },
  { id: 'cutlass', label: 'Cutlass', category: C.SWORD, visual: 'sword-curve', weight: 'medium', description: 'Pirate saber — short, curved and quick.' },
  { id: 'claymore', label: 'Claymore', category: C.SWORD, visual: 'sword-long', weight: 'heavy', description: 'Scottish two-hander — heavy swings.' },
  { id: 'falchion', label: 'Falchion', category: C.SWORD, visual: 'sword-broad', weight: 'medium', description: 'Single-edged cleaver sword — medieval brawler.' },
  { id: 'energy-blade', label: 'Energy Blade', category: C.SWORD, visual: 'scifi-saber', weight: 'light', description: 'Sci-fi sword — glowing plasma edge.' },

  /* ================================================================ */
  /* Axes & blunt — Viking, RPG, survival                             */
  /* ================================================================ */
  { id: 'hand-axe', label: 'Hand Axe', category: C.AXE, visual: 'axe-hand', weight: 'medium', description: 'Survival starter — one-hand chopper.' },
  { id: 'battle-axe', label: 'Battle Axe', category: C.AXE, visual: 'axe-battle', weight: 'heavy', description: 'Viking raider — wide arc, heavy gait.' },
  { id: 'war-axe', label: 'War Axe', category: C.AXE, visual: 'axe-battle', weight: 'heavy', description: 'Barbarian two-hand — slow, devastating.' },
  { id: 'throwing-axe', label: 'Throwing Axe', category: C.THROWING, visual: 'axe-hand', weight: 'light', description: 'A spinning axe thrown in an arc — hits hard.' },
  { id: 'pickaxe', label: 'Pickaxe', category: C.AXE, visual: 'axe-pick', weight: 'medium', description: 'Mining tool turned weapon — sandbox survival trope.' },
  { id: 'mace', label: 'Mace', category: C.AXE, visual: 'blunt-mace', weight: 'heavy', description: 'Holy order blunt — plate-crushing head.' },
  { id: 'war-hammer', label: 'War Hammer', category: C.AXE, visual: 'blunt-hammer', weight: 'heavy', description: 'Paladin two-hand — slow, crushing blows.' },
  { id: 'maul', label: 'Maul', category: C.AXE, visual: 'blunt-hammer', weight: 'heavy', description: 'Oversized hammer — slowest blunt class.' },
  { id: 'flail', label: 'Flail', category: C.AXE, visual: 'blunt-flail', weight: 'medium', description: 'Chain head — medieval fighter oddball.' },
  { id: 'club', label: 'Spiked Club', category: C.AXE, visual: 'blunt-mace', weight: 'medium', description: 'Caveman to orc — simplest blunt weapon.' },

  /* ================================================================ */
  /* Polearms — spears, halberds, scythes                              */
  /* ================================================================ */
  { id: 'spear', label: 'Spear', category: C.POLEARM, visual: 'pole-spear', weight: 'medium', description: 'Phalanx poke — a reach weapon.' },
  { id: 'pike', label: 'Pike', category: C.POLEARM, visual: 'pole-spear', weight: 'heavy', description: 'Long infantry spear — slower advance.' },
  { id: 'halberd', label: 'Halberd', category: C.POLEARM, visual: 'pole-halberd', weight: 'heavy', description: 'Axe-spear hybrid — guard polearm.' },
  { id: 'glaive', label: 'Glaive', category: C.POLEARM, visual: 'pole-glaive', weight: 'medium', description: 'Sliding blade on staff — wuxia / RPG polearm.' },
  { id: 'naginata', label: 'Naginata', category: C.POLEARM, visual: 'pole-glaive', weight: 'medium', description: 'Japanese pole blade — samurai support weapon.' },
  { id: 'trident', label: 'Trident', category: C.POLEARM, visual: 'pole-trident', weight: 'medium', description: 'Poseidon / aquatic boss fork.' },
  { id: 'scythe', label: 'Scythe', category: C.POLEARM, visual: 'pole-scythe', weight: 'heavy', description: 'Grim reaper’s curved polearm — wide, slow sweeps.' },
  { id: 'lance', label: 'Lance', category: C.POLEARM, visual: 'pole-lance', weight: 'heavy', description: 'Mounted knight lance — long and narrow.' },

  /* ================================================================ */
  /* Knives & daggers — stealth, CS, action                           */
  /* ================================================================ */
  { id: 'combat-knife', label: 'Combat Knife', category: C.KNIFE, visual: 'knife-combat', weight: 'light', description: 'Military sidearm blade — quick and reliable.' },
  { id: 'tanto', label: 'Tanto', category: C.KNIFE, visual: 'knife-tanto', weight: 'light', description: 'Japanese dagger — stealth finishers.' },
  { id: 'stiletto', label: 'Stiletto', category: C.KNIFE, visual: 'knife-stiletto', weight: 'light', description: 'Assassin needle — minimal wind-up.' },
  { id: 'kukri', label: 'Kukri', category: C.KNIFE, visual: 'knife-kukri', weight: 'light', description: 'Gurkha curve — FPS melee classic.' },
  { id: 'bowie-knife', label: 'Bowie Knife', category: C.KNIFE, visual: 'knife-combat', weight: 'medium', description: 'Western survival blade.' },
  { id: 'switchblade', label: 'Switchblade', category: C.KNIFE, visual: 'knife-stiletto', weight: 'light', description: 'Street fighter auto-knife — fastest class.' },
  { id: 'cleaver', label: 'Cleaver', category: C.KNIFE, visual: 'knife-cleaver', weight: 'medium', description: 'Butcher blade — horror / brawler.' },
  { id: 'twin-daggers', label: 'Twin Daggers', category: C.KNIFE, visual: 'knife-dual', attachSecondary: 'handL', weight: 'light', description: 'Dual wield — the rogue’s favourite.' },
  { id: 'dual-katanas', label: 'Dual Wakizashi', category: C.KNIFE, visual: 'sword-katana', attachSecondary: 'handL', weight: 'light', description: 'Two short blades — action game dual wield.' },

  /* ================================================================ */
  /* Pistols & SMGs — FPS staples                                     */
  /* ================================================================ */
  { id: 'pistol', label: 'Sidearm', category: C.PISTOL, visual: 'pistol-service', weight: 'gun', description: 'Semi-auto sidearm — quick, accurate, twelve rounds.' },
  { id: 'revolver', label: 'Revolver', category: C.PISTOL, visual: 'pistol-revolver', weight: 'gun', description: 'Six heavy rounds, slow and hard-hitting.' },
  { id: 'hand-cannon', label: 'Hand Cannon', category: C.PISTOL, visual: 'pistol-heavy', weight: 'heavy', description: 'Oversized pistol — big damage, big kick.' },
  { id: 'smg', label: 'SMG', category: C.PISTOL, visual: 'pistol-smg', weight: 'gun', description: 'Compact automatic — hold to spray at close range.' },
  { id: 'machine-pistol', label: 'Machine Pistol', category: C.PISTOL, visual: 'pistol-smg', weight: 'light', description: 'Tiny automatic — the fastest fire rate, least accurate.' },
  { id: 'dual-pistols', label: 'Dual Pistols', category: C.PISTOL, visual: 'pistol-service', attachSecondary: 'handL', weight: 'gun', description: 'A pistol in each hand — rapid alternating fire.' },
  { id: 'plasma-pistol', label: 'Plasma Pistol', category: C.PISTOL, visual: 'scifi-pistol', weight: 'gun', description: 'Fires glowing plasma bolts that jolt what they hit. Never needs reloading.' },

  /* ================================================================ */
  /* Rifles & shotguns — military FPS                                 */
  /* ================================================================ */
  { id: 'assault-rifle', label: 'Assault Rifle', category: C.RIFLE, visual: 'rifle-assault', weight: 'gun', description: 'Automatic rifle — hold to fire, thirty rounds.' },
  { id: 'carbine', label: 'Carbine', category: C.RIFLE, visual: 'rifle-carbine', weight: 'gun', description: 'Short automatic rifle — a little stronger per shot.' },
  { id: 'burst-rifle', label: 'Burst Rifle', category: C.RIFLE, visual: 'rifle-assault', weight: 'gun', description: 'Three rounds per pull — tight and deliberate.' },
  { id: 'dmr', label: 'DMR', category: C.RIFLE, visual: 'rifle-sniper', weight: 'gun', description: 'Precise semi-auto rifle — each round goes through one target.' },
  { id: 'sniper-rifle', label: 'Sniper Rifle', category: C.RIFLE, visual: 'rifle-sniper', weight: 'heavy', description: 'One slow, devastating shot that pierces three enemies.' },
  { id: 'shotgun', label: 'Shotgun', category: C.RIFLE, visual: 'rifle-shotgun', weight: 'gun', description: 'Pump action — seven pellets in a wide spread. Close range.' },
  { id: 'combat-shotgun', label: 'Combat Shotgun', category: C.RIFLE, visual: 'rifle-shotgun', weight: 'heavy', description: 'Automatic shotgun — hold to clear a room.' },
  { id: 'lmg', label: 'LMG', category: C.RIFLE, visual: 'rifle-lmg', weight: 'heavy', description: 'Heavy machine gun — eighty rounds, long reload.' },
  { id: 'plasma-rifle', label: 'Plasma Rifle', category: C.RIFLE, visual: 'scifi-rifle', weight: 'gun', description: 'Rapid plasma bolts — automatic, travels fast.' },
  { id: 'laser-rifle', label: 'Laser Rifle', category: C.RIFLE, visual: 'scifi-rifle', weight: 'gun', description: 'An instant beam that cuts through two enemies.' },
  { id: 'pulse-carbine', label: 'Pulse Carbine', category: C.RIFLE, visual: 'scifi-rifle', weight: 'light', description: 'Three-bolt energy bursts.' },

  /* ================================================================ */
  /* Bows — survival, RPG, battle royale                              */
  /* ================================================================ */
  { id: 'shortbow', label: 'Shortbow', category: C.BOW, visual: 'bow-short', weight: 'bow', description: 'Quick arrows — light damage, fast draw.' },
  { id: 'longbow', label: 'Longbow', category: C.BOW, visual: 'bow-long', weight: 'bow', description: 'Long range — slow draw, arrows pierce one enemy.' },
  { id: 'recurve-bow', label: 'Recurve Bow', category: C.BOW, visual: 'bow-short', weight: 'bow', description: 'Balanced bow — a good all-rounder.' },
  { id: 'compound-bow', label: 'Compound Bow', category: C.BOW, visual: 'bow-compound', weight: 'medium', description: 'Fast, flat arrows that pierce one enemy.' },
  { id: 'crossbow', label: 'Crossbow', category: C.BOW, visual: 'bow-cross', weight: 'medium', description: 'Heavy bolts — slow to reload, hits hard.' },
  { id: 'heavy-crossbow', label: 'Heavy Crossbow', category: C.BOW, visual: 'bow-cross', weight: 'heavy', description: 'Massive bolts that pierce two enemies and knock them back.' },

  /* ================================================================ */
  /* Heavy — launchers, miniguns, railguns                            */
  /* ================================================================ */
  { id: 'rocket-launcher', label: 'Rocket Launcher', category: C.HEAVY, visual: 'heavy-rocket', weight: 'heavy', description: 'Rockets that explode on impact. One shot, then reload.' },
  { id: 'grenade-launcher', label: 'Grenade Launcher', category: C.HEAVY, visual: 'heavy-grenade', weight: 'heavy', description: 'Lobs bouncing-arc grenades that burst on landing.' },
  { id: 'minigun', label: 'Minigun', category: C.HEAVY, visual: 'heavy-minigun', weight: 'heavy', description: 'Spins up a storm of bullets — two hundred rounds.' },
  { id: 'railgun', label: 'Railgun', category: C.HEAVY, visual: 'heavy-rail', weight: 'heavy', description: 'An instant slug that pierces everything in its line.' },
  { id: 'flamethrower', label: 'Flamethrower', category: C.HEAVY, visual: 'heavy-flame', weight: 'heavy', description: 'A cone of fire — hold to burn everything in front of you.' },
  { id: 'ion-cannon', label: 'Ion Cannon', category: C.HEAVY, visual: 'heavy-rail', weight: 'heavy', description: 'A charged beam through everything — the slowest, strongest shot.' },
  /* ================================================================ */
  /* Throwing                                                          */
  /* ================================================================ */
  { id: 'throwing-knives', label: 'Throwing Knives', category: C.THROWING, visual: 'throw-knives', weight: 'light', description: 'A fan of balanced blades — quick, light throws.' },
  { id: 'shuriken', label: 'Shuriken', category: C.THROWING, visual: 'throw-shuriken', weight: 'light', description: 'Three spinning stars per throw, in a spread.' },
  { id: 'javelin', label: 'Javelin', category: C.THROWING, visual: 'throw-javelin', weight: 'medium', description: 'A long arcing throw that pierces two enemies.' },
  { id: 'boomerang', label: 'Boomerang', category: C.THROWING, visual: 'throw-boomerang', weight: 'light', description: 'Flies out and comes back — hits everything both ways.' },
  { id: 'chakram', label: 'Chakram', category: C.THROWING, visual: 'throw-chakram', weight: 'light', description: 'A bladed ring that cuts through a crowd and returns to your hand.' },
  { id: 'bomb', label: 'Bomb', category: C.THROWING, visual: 'throw-bomb', weight: 'medium', description: 'Lit fuse, lobbed in an arc — a big blast where it lands.' },
  { id: 'smoke-bomb', label: 'Frost Smoke Bomb', category: C.THROWING, visual: 'throw-smoke', weight: 'light', description: 'A wide cold cloud that slows everything in it.' },

  /* ================================================================ */
  /* More firearms                                                     */
  /* ================================================================ */
  { id: 'flintlock', label: 'Flintlock Pistol', category: C.PISTOL, visual: 'pistol-flintlock', weight: 'gun', description: 'One powerful ball, then a long reload.' },
  { id: 'musket', label: 'Musket', category: C.RIFLE, visual: 'rifle-musket', weight: 'heavy', description: 'A single heavy ball that pierces one enemy. Slow to reload.' },
  { id: 'lever-rifle', label: 'Lever Rifle', category: C.RIFLE, visual: 'rifle-lever', weight: 'gun', description: 'Eight accurate rounds — steady frontier rifle.' },
  { id: 'blunderbuss', label: 'Blunderbuss', category: C.RIFLE, visual: 'rifle-blunderbuss', weight: 'heavy', description: 'A flared barrel of shot — enormous spread, huge knockback.' },
  { id: 'harpoon-gun', label: 'Harpoon Gun', category: C.RIFLE, visual: 'rifle-harpoon', weight: 'heavy', description: 'A harpoon that pierces two enemies and pins them in place.' },
  { id: 'blowgun', label: 'Blowgun', category: C.RIFLE, visual: 'rifle-blowgun', weight: 'light', description: 'Silent poison darts — small hits, then they burn.' },
  { id: 'hand-crossbow', label: 'Hand Crossbow', category: C.BOW, visual: 'bow-hand-cross', weight: 'light', description: 'One-handed crossbow — five quick bolts.' },
  { id: 'sling', label: 'Sling', category: C.BOW, visual: 'bow-sling', weight: 'light', description: 'Whirls a stone in a high arc — a dizzying knock.' },

  /* ================================================================ */
  /* Exotic melee                                                      */
  /* ================================================================ */
  { id: 'whip', label: 'Whip', category: C.EXOTIC, visual: 'exotic-whip', weight: 'light', description: 'A long leather lash — the reach of a spear, the speed of a knife.' },
  { id: 'nunchaku', label: 'Nunchaku', category: C.EXOTIC, visual: 'exotic-nunchaku', weight: 'light', description: 'Two sticks on a chain — a blur of quick strikes.' },
  { id: 'war-fan', label: 'War Fan', category: C.EXOTIC, visual: 'exotic-fan', weight: 'light', description: 'A steel-ribbed fan — elegant, sharp-edged.' },
  { id: 'sai', label: 'Sai', category: C.EXOTIC, visual: 'exotic-sai', attachSecondary: 'handL', weight: 'light', description: 'A pair of pronged daggers — catch, then strike.' },
  { id: 'chain-sickle', label: 'Chain Sickle', category: C.EXOTIC, visual: 'exotic-sickle', weight: 'medium', description: 'A hooked blade on a weighted chain.' }
];
