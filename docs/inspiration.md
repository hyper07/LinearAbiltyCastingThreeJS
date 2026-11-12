# Inspiration catalog

[← Back to the README](../README.md)

Well-known games and RPG / fantasy stories, each mapped onto our own ids — genres, class archetypes,
skill effects and game features — so the builder can make "a game like X" from a few tokens.
The data is in `src/catalog/inspiration/` (one JSON file per family), checked by
`node scripts/check-inspiration.mjs` and the unit tests; this page is written by
`node scripts/inspiration-report.mjs`.

The catalog records **facts about other works, in our own words, with links**. Images are links
only (cover art is the publisher's, never copied into the game). What we build from a work is our
own: a spec never carries its title, and each entry's **original take** names a game with our names.
Works marked *mature* are catalogued for their mechanics only, never as a theme for children's games.

**75 works.** In the Game builder, write an idea like *"a dungeon game like Solo Leveling"*:
the keyword builder starts from that work's nearest picks, and the AI gets a short note of its
systems and an original take (`src/ai/GameBuilder.js`).

## What we lack, by how many works use it

Features other works rely on that we do not have yet (`close` = a small step from what exists).

| Feature | Status | Works | For example |
| --- | --- | --- | --- |
| `guilds` | new | 20 | World of Warcraft, Final Fantasy XIV, MapleStory, Ragnarok Online |
| `crafting` | new | 19 | Diablo II: Resurrected, Diablo IV, Grim Dawn, World of Warcraft |
| `rank-system` — E→S style hunter or adventurer ranks | new | 11 | Genshin Impact, Solo Leveling, Tower of God, The Beginning After the End |
| `class-advancement` — a job change / rank-up at set levels | new | 10 | Path of Exile 2, Final Fantasy XIV, MapleStory, Ragnarok Online |
| `mounts` | new | 10 | Diablo IV, World of Warcraft, Guild Wars 2, Elden Ring |
| `summons` — friendly monsters are a small step from the monster manager | close | 10 | Path of Exile 2, Grim Dawn, Elden Ring, Final Fantasy VII Remake |
| `base-building` | new | 9 | StarCraft II, Warcraft III: Reforged, Age of Empires IV, Command & Conquer: Red Alert 3 |
| `raids` — co-op boss fights | close | 9 | Lost Ark, World of Warcraft, Final Fantasy XIV, Guild Wars 2 |
| `pets` | new | 8 | Torchlight II, MapleStory, Monster Hunter: World, Prodigy Math Game |
| `ranked-matchmaking` | new | 8 | StarCraft II, Warcraft III: Reforged, League of Legends, Heroes of the Storm |
| `difficulty-tiers` — harder replays after the story: tiers, new game plus, ascension | new | 7 | Diablo II: Resurrected, Torchlight II, Grim Dawn, Dragon Quest XI: Echoes of an Elusive Age |
| `elemental-reactions` — elements that combine, or weaknesses that break armour | new | 7 | Ragnarok Online, Genshin Impact, Honkai: Star Rail, Baldur's Gate 3 |
| `growing-weapon` — a bound weapon or item that grows with its owner | new | 7 | Vampire Survivors, Tower of God, Delicious in Dungeon, Is It Wrong to Try to Pick Up Girls in a Dungeon? |
| `resource-gathering` | new | 7 | Lost Ark, StarCraft II, Warcraft III: Reforged, Age of Empires IV |
| `stat-points` — free points to spend on strength, agility… | new | 7 | Ragnarok Online, Elden Ring, Dead Cells, Baldur's Gate 3 |
| `tower-climb` — a tower of floors, each its own test, climbed in order | new | 7 | Lost Ark, Solo Leveling: Arise, Tower of God, Second Life Ranker |
| `dodge-roll` | new | 6 | Path of Exile 2, Guild Wars 2, Elden Ring, Dark Souls III |
| `gear-upgrading` | new | 6 | Ragnarok Online, Clash Royale, Brawl Stars, Dragon Quest XI: Echoes of an Elusive Age |
| `in-match-leveling` — level 1 at the start of every match, upgrades picked during it | new | 6 | League of Legends, Dota 2, Heroes of the Storm, Pokémon Unite |
| `monster-taming` | new | 6 | Ragnarok Online, Monster Hunter: World, Pokémon Scarlet and Violet, Prodigy Math Game |
| `open-world` | new | 6 | Diablo IV, Elden Ring, Genshin Impact, Pokémon Scarlet and Violet |
| `permadeath` | new | 6 | Diablo II: Resurrected, Diablo IV, Grim Dawn, Slay the Spire |
| `procedural-dungeons` — maps are scattered from a plan at load | close | 6 | Diablo II: Resurrected, Diablo IV, Torchlight II, Minecraft Dungeons |
| `turn-based-combat` | new | 6 | Dragon Quest XI: Echoes of an Elusive Age, Honkai: Star Rail, Pokémon Scarlet and Violet, Slay the Spire |
| `ultimate-ability` — a big move unlocked by level or charged in combat | new | 6 | Final Fantasy XIV, League of Legends, Pokémon Unite, Overwatch 2 |
| `day-night` | new | 5 | Torchlight II, Monster Hunter: World, Warcraft III: Reforged, Dota 2 |
| `dungeon-portals` — portals exist; gates to instanced dungeons are next | close | 5 | Lost Ark, Genshin Impact, Solo Leveling, Solo Leveling: Arise |
| `fog-of-war` | new | 5 | StarCraft II, Warcraft III: Reforged, Age of Empires IV, League of Legends |
| `lanes` — MOBA lanes, towers and minion waves | new | 5 | League of Legends, Dota 2, Heroes of the Storm, Pokémon Unite |
| `neutral-camps` — neutral monster camps that respawn and give gold, experience or buffs | new | 5 | Warcraft III: Reforged, League of Legends, Dota 2, Heroes of the Storm |
| `respawn-rules` — what death costs: a timer, experience, a body to recover | close | 5 | League of Legends, Fortnite Battle Royale, KonoSuba: God's Blessing on This Wonderful World!, Delicious in Dungeon |
| `trading` | new | 5 | World of Warcraft, Guild Wars 2, MapleStory, Ragnarok Online |
| `asymmetric-factions` — factions that gather, build and fight differently | new | 4 | StarCraft II, Warcraft III: Reforged, Age of Empires IV, Command & Conquer: Red Alert 3 |
| `auto-battle` | new | 4 | League of Legends, Clash Royale, Honkai: Star Rail, Pokémon Scarlet and Violet |
| `combo-attacks` — close-range attack chains exist | close | 4 | Path of Exile 2, Lost Ark, MapleStory, Sword Art Online |
| `gacha` — paid random draws: not on a children's platform | avoid | 4 | Genshin Impact, Honkai: Star Rail, Solo Leveling: Arise, Tower of God |
| `gear-defines-build` — no fixed class: the weapon and gear are the build | new | 4 | Final Fantasy XIV, Monster Hunter: World, Minecraft Dungeons, Terraria |
| `hero-draft` — pick and ban heroes in turns | new | 4 | Dota 2, Heroes of the Storm, Overwatch 2, Clash Royale |
| `housing` | new | 4 | Lost Ark, Final Fantasy XIV, Stardew Valley, Terraria |
| `meta-progression` — a home hub and a currency that buys permanent unlocks between runs | new | 4 | Hades, Vampire Survivors, Slay the Spire, Dead Cells |

Skill effects with no ability of ours yet, by how many catalogued skills use them: `buff` 38, `heal` 33, `shield` 30, `summon` 25, `transform` 21, `damage-over-time` 18, `teleport` 14, `passive` 14, `build-structure` 13, `trap` 11, `stealth` 10, `pull` 5.

## Action RPGs and MMOs

| Work | Kind | Genres | Nearest build today | Links |
| --- | --- | --- | --- | --- |
| **Diablo II: Resurrected** (2021) *mature* | game | action-rpg, hack-and-slash, dungeon-crawler | dungeon-crawl · haunted-graveyard · any | [Wikipedia](https://en.wikipedia.org/wiki/Diablo_II:_Resurrected) · [Official](https://diablo2.blizzard.com/) · [Wiki](https://diablo2.wiki.fextralife.com/Classes) · [Image](https://en.wikipedia.org/wiki/File:Diablo_2_Resurrected_cover_art.jpg) |
| **Diablo IV** (2023) *mature* | game | action-rpg, hack-and-slash, open-world, dungeon-crawler | quest · frozen-north · any | [Wikipedia](https://en.wikipedia.org/wiki/Diablo_IV) · [Official](https://diablo4.blizzard.com/) · [Wiki](https://diablo4.wiki.fextralife.com/Classes) · [Image](https://en.wikipedia.org/wiki/File:Diablo_IV_cover_art.png) |
| **Path of Exile 2** (2024) *mature* | game | action-rpg, hack-and-slash, dungeon-crawler | dungeon-crawl · haunted-graveyard · any | [Wikipedia](https://en.wikipedia.org/wiki/Path_of_Exile_2) · [Official](https://pathofexile2.com/) · [Wiki](https://pathofexile2.wiki.fextralife.com/Classes) · [Image](https://en.wikipedia.org/wiki/File:Path_of_Exile_2_cover_art.jpg) |
| **Torchlight II** (2012) | game | action-rpg, dungeon-crawler, hack-and-slash | dungeon-crawl · desert-ruins · any | [Wikipedia](https://en.wikipedia.org/wiki/Torchlight_II) · [Official](https://store.steampowered.com/app/200710/Torchlight_II/) · [Image](https://en.wikipedia.org/wiki/File:TorchlightIICoverArt.jpg) |
| **Grim Dawn** (2016) *mature* | game | action-rpg, hack-and-slash | quest · haunted-graveyard · any | [Wikipedia](https://en.wikipedia.org/wiki/Grim_Dawn) · [Official](https://www.grimdawn.com/) · [Image](https://en.wikipedia.org/wiki/File:Grim_Dawn_logo.png) |
| **Lost Ark** (2019) | game | mmorpg, action-rpg, hack-and-slash | boss-hunt · ancient-temple · knight | [Wikipedia](https://en.wikipedia.org/wiki/Lost_Ark_(video_game)) · [Official](https://www.playlostark.com/) · [Wiki](https://lostark.wiki.fextralife.com/Lost+Ark+Wiki) · [Image](https://en.wikipedia.org/wiki/File:Lost_Ark_cover.jpg) |
| **World of Warcraft** (2004) | game | mmorpg, open-world | quest · storybook-village · any | [Wikipedia](https://en.wikipedia.org/wiki/World_of_Warcraft) · [Official](https://worldofwarcraft.blizzard.com/) · [Wiki](https://warcraft.wiki.gg/wiki/World_of_Warcraft) · [Image](https://en.wikipedia.org/wiki/File:World_of_Warcraft.png) |
| **Final Fantasy XIV** (2013) | game | mmorpg, story-adventure | boss-hunt · lava-wastes · any | [Wikipedia](https://en.wikipedia.org/wiki/Final_Fantasy_XIV) · [Wiki](https://ffxiv.consolegameswiki.com/wiki/Jobs) · [Image](https://en.wikipedia.org/wiki/File:Final_Fantasy_XIV,_A_Realm_Reborn_box_cover.jpg) |
| **Guild Wars 2** (2012) | game | mmorpg, open-world, action-rpg | quest · enchanted-forest · any | [Wikipedia](https://en.wikipedia.org/wiki/Guild_Wars_2) · [Official](https://www.guildwars2.com/) · [Wiki](https://wiki.guildwars2.com/wiki/Guild_Wars_2) · [Image](https://en.wikipedia.org/wiki/File:Gw2-boxfront.png) |
| **MapleStory** (2003) | game | mmorpg, platformer | quest · storybook-village · any | [Wikipedia](https://en.wikipedia.org/wiki/MapleStory) · [Official](https://www.nexon.com/maplestory/) · [Image (free)](https://commons.wikimedia.org/wiki/File:MapleStory.svg) |
| **Ragnarok Online** (2002) | game | mmorpg | monster-hunt · farm-fields · any | [Wikipedia](https://en.wikipedia.org/wiki/Ragnarok_Online) · [Official](https://renewal.playragnarok.com/) · [Image (free)](https://commons.wikimedia.org/wiki/File:RO_icon_file.png) |
| **Elden Ring** (2022) *mature* | game | action-rpg, soulslike, open-world | boss-hunt · ancient-temple · knight | [Wikipedia](https://en.wikipedia.org/wiki/Elden_Ring) · [Wiki](https://eldenring.wiki.fextralife.com/Elden+Ring+Wiki) · [Image](https://en.wikipedia.org/wiki/File:Elden_Ring_Box_art.jpg) |
| **Dark Souls III** (2016) *mature* | game | action-rpg, soulslike | boss-hunt · haunted-graveyard · knight | [Wikipedia](https://en.wikipedia.org/wiki/Dark_Souls_III) · [Wiki](https://darksouls3.wiki.fextralife.com/Dark+Souls+3+Wiki) · [Image](https://en.wikipedia.org/wiki/File:Dark_souls_3_cover_art.jpg) |
| **Monster Hunter: World** (2018) | game | action-rpg | monster-hunt · enchanted-forest · any | [Wikipedia](https://en.wikipedia.org/wiki/Monster_Hunter:_World) · [Wiki](https://monsterhunterworld.wiki.fextralife.com/Monster+Hunter+World+Wiki) · [Image](https://en.wikipedia.org/wiki/File:Monster_Hunter_World_cover_art.jpg) |

### Diablo II: Resurrected

A faithful remaster of the 2000 dark-fantasy action RPG: pick one of seven heroes and fight through five acts of randomly laid-out wilds and dungeons, chasing better loot. New 3D visuals can be toggled back to the original sprites, and a shared stash lets your own heroes pass items to each other.

**Systems:** `character-classes` ✓, `skill-tree` ✓, `loot-rarity` ✓, `runewords`, `item-sets`, `crafting`, `difficulty-tiers`, `permadeath`, `stash` ✓, `procedural-dungeons`, `story-chapters` ✓, `co-op-party` ✓ (✓ = we have it)

**Classes:** Amazon (archer), Sorceress (elementalist), Barbarian (berserker), Necromancer (necromancer), Paladin (paladin), Druid (druid), Assassin (assassin)

**Original take:** Ashfall Road: five chapters from a frontier camp to a burning underworld, where heroes press glowing glyph-stones into plain gear in the right order to wake a named relic, and each finished run unlocks harder Ember and Inferno replays.

### Diablo IV

An open-world dark-fantasy action RPG where a lone Wanderer crosses a demon-haunted land, building a hero from class skills, skill trees and ever-better loot. Random dungeons, shared world events, seasons and PvP zones keep the loot hunt going.

**Systems:** `open-world`, `procedural-dungeons`, `skill-tree` ✓, `loot-rarity` ✓, `class-unique-mechanic`, `world-events`, `pvp` ✓, `mounts`, `seasons`, `character-customization` ✓, `permadeath`, `crafting` (✓ = we have it)

**Classes:** Barbarian (berserker), Sorcerer (elementalist), Druid (shapeshifter), Rogue (rogue), Necromancer (necromancer)

**Original take:** Wildlands of the Thornmother: an open map of five linked biomes the party crosses without loading, where an Emberstorm hour makes one region dangerous and generous for a few minutes, and every class has one personal trick such as a weapon rack, a totem slot or a bone codex.

### Path of Exile 2

A dark-fantasy action RPG (early access since 2024) in which a reprieved convict chases a reborn god-beast across six acts. Builds come from socketing skill gems with support gems and allocating a huge passive tree, then are tested on a near-endless atlas of endgame maps.

**Systems:** `skill-modifiers`, `passive-board`, `class-advancement`, `dodge-roll`, `combo-attacks`, `summons`, `boss-fights` ✓, `endgame-atlas`, `story-chapters` ✓, `character-classes` ✓ (✓ = we have it)

**Classes:** Warrior (warrior), Ranger (archer), Sorceress (elementalist), Mercenary (gunner), Witch (necromancer), Huntress (spearman)

**Original take:** Glyphwright: heroes slot a coloured verb glyph into each skill and adverb glyphs beside it (split, echo, chain), set combos on purpose such as lighting a frost-gas cloud into a blast, then step onto a star map of short boss maps.

### Torchlight II

A bright, cartoon-styled action RPG where one of four heroes follows a corrupted alchemist across three acts of overland zones and random dungeons, with a pet at their side. It added co-op for up to six players and strong modding tools.

**Systems:** `pets`, `fishing`, `procedural-dungeons`, `day-night`, `co-op-party` ✓, `per-player-loot`, `level-editor` ✓, `difficulty-tiers`, `character-customization` ✓, `skill-tree` ✓, `pvp` ✓ (✓ = we have it)

**Classes:** Berserker (berserker), Embermage (elementalist), Engineer (engineer), Outlander (ranger)

**Original take:** Lantern & Hound: every player brings a pet that fights beside them and trots back to town to sell junk, and the friends fish in ponds for snacks that briefly change their pet into something bigger.

### Grim Dawn

A grim, Victorian-flavoured action RPG set in a world nearly wiped out by a war between two otherworldly races, built on the Titan Quest engine. Its depth comes from pairing two masteries into one class, a constellation map of extra powers, and factions that reward or hunt you.

**Systems:** `multiclassing`, `passive-board`, `faction-reputation`, `crafting`, `loot-rarity` ✓, `difficulty-tiers`, `permadeath`, `co-op-party` ✓, `pvp` ✓, `waves` ✓, `summons` (✓ = we have it)

**Classes:** Soldier (warrior), Demolitionist (gunner), Occultist (summoner), Nightblade (assassin), Arcanist (mage), Shaman (druid), Oathkeeper (paladin)

**Original take:** Twin Paths: at level 10 every hero adds a second discipline from another school (say Hearthguard plus Stormcaller), lights forgotten star-shrines to fill a sky map of bonus powers, and earns favour with rival camps whose enemies send named hunters after you.

### Lost Ark

A Korean isometric MMO with fast, combo-driven action combat across continents and islands linked by sailing. Characters pick a class family and then an advanced class, and the endgame centres on timed dungeons and multi-phase raids.

**Systems:** `character-classes` ✓, `combo-attacks`, `skill-modifiers`, `class-unique-mechanic`, `raids`, `dungeon-portals`, `sailing`, `housing`, `resource-gathering`, `pvp` ✓, `daily-quests`, `tower-climb` (✓ = we have it)

**Classes:** Berserker (berserker), Gunlancer (knight), Sorceress (elementalist), Bard (bard), Shadowhunter (shapeshifter)

**Original take:** Tidecall Isles: sail a small crewed boat between island hubs, clear a timed rift run where filling the bar opens the next floor, then gather eight friends for a three-phase colossus; every skill offers a pick-one-of-three tweak at ranks 4, 7 and 10.

### World of Warcraft

The long-running fantasy MMO of a world split between two factions, where players quest, learn professions, run group dungeons and raids, and battle each other. Eleven expansions since 2004 have added lands, classes and systems.

**Systems:** `factions`, `character-classes` ✓, `skill-tree` ✓, `quests` ✓, `crafting`, `guilds`, `raids`, `pvp` ✓, `trading`, `mounts`, `rested-xp`, `corpse-run` (✓ = we have it)

**Classes:** Warrior (warrior), Mage (mage), Hunter (ranger), Druid (druid)

**Original take:** Two Banners: players join the Dawn camp or the Dusk camp, level through quest chains that earn first a ride and later a flying ride, and gather each week for a four-wing raid against an ember-crowned giant.

### Final Fantasy XIV

Square Enix's story-heavy fantasy MMO, rebuilt in 2013 after a failed launch, where one character can learn every combat, crafting and gathering job just by changing weapons. Players clear dungeons, giant elemental 'primal' trials and raids as tank, healer or damage.

**Systems:** `gear-defines-build`, `class-advancement`, `crafting`, `world-events`, `raids`, `ai-party-members`, `ultimate-ability`, `guilds`, `housing`, `pvp` ✓, `story-chapters` ✓, `daily-quests` (✓ = we have it)

**Classes:** Paladin (paladin), Black Mage (elementalist), White Mage (cleric), Dragoon (spearman), Summoner (summoner), Ninja (assassin)

**Original take:** Toolbelt Hero: one hero becomes a lancer, a healer or a tinker just by picking up a different tool, each tool with its own level, and three friends fight giant elemental spirits while a shared team meter fills into one combined strike.

### Guild Wars 2

A fantasy MMO where open-world dynamic events replace most quest-giving and action combat with dodging and weapon-based skill bars needs no dedicated healer. It adds large server-versus-server warfare, account-wide masteries such as gliding and mounts, and level scaling that keeps every zone relevant.

**Systems:** `world-events`, `quests` ✓, `dodge-roll`, `downed-revive`, `weapon-skill-bar`, `no-required-healer`, `level-scaling`, `pvp` ✓, `crafting`, `mounts`, `raids`, `trading` (✓ = we have it)

**Classes:** Warrior (warrior), Guardian (paladin), Elementalist (elementalist), Necromancer (necromancer), Ranger (ranger), Thief (rogue), Engineer (engineer)

**Original take:** Ripple Meadows: there is no quest list, just things happening nearby (a burning mill, a sheep stampede, a giant toad) that anyone can pitch in on; picking up a different weapon swaps your first five moves, and a knocked-down hero keeps fighting from the ground until a friend lifts them.

### MapleStory

A free-to-play 2D side-scrolling MMO where cartoon heroes hop across platforms fighting monsters, advance through job tiers and team up for bosses. It is known for its huge roster of class branches and its player-run Free Market.

**Systems:** `class-advancement`, `character-classes` ✓, `side-scrolling`, `co-op-party` ✓, `guilds`, `trading`, `crafting`, `boss-fights` ✓, `minigames`, `pets`, `pvp` ✓, `combo-attacks` (✓ = we have it)

**Classes:** Magician (mage), Bowman (archer), Thief (assassin), Warrior (warrior), Evan (tamer), Mechanic (engineer)

**Original take:** Leaf Isles: every hero starts as a Sprout, picks one of five paths at level 10 and one of two or three specialities at level 30, and a town plaza lets players open little stalls to sell their finds to friends.

### Ragnarok Online

A Korean MMO based on a Norse-myth manhwa, with 2D sprite heroes in 3D maps and a branching job tree from Novice up to transcendent and third jobs. Players tame cute monster pets, slot monster cards into gear, run street stalls and besiege guild castles.

**Systems:** `class-advancement`, `rebirth`, `stat-points`, `monster-cards`, `gear-upgrading`, `monster-taming`, `trading`, `guilds`, `castle-siege`, `elemental-reactions`, `pvp` ✓, `quests` ✓ (✓ = we have it)

**Classes:** Swordman (warrior), Mage (mage), Archer (archer), Acolyte (cleric), Thief (rogue), Merchant (worker)

**Original take:** Jelly Fields: a Fledgling picks one of six trades at job level 10, cards dropped by jellies and goblins slot into gear forever, and every weekend clubs race to crack the crystal heart inside a hilltop keep.

### Elden Ring

FromSoftware's open-world take on its demanding soulslike formula, with worldbuilding by George R. R. Martin. An exiled Tarnished rides a spectral steed across the Lands Between, beating demigods to restore a shattered ring.

**Systems:** `open-world`, `mounts`, `checkpoint-rest`, `corpse-run`, `stat-points`, `skill-modifiers`, `summons`, `parry-block`, `dodge-roll`, `boss-fights` ✓, `co-op-party` ✓, `pvp` ✓ (✓ = we have it)

**Classes:** Astrologer (mage), Prophet (cleric), Confessor (paladin), Vagabond (knight), Samurai (warrior)

**Original take:** Gale Steed Wilds: ride a ghost-goat that double-jumps between ledges across six open biomes, rest at glowing lanterns to level up and refill flasks, call a bottle of spirit helpers at stone markers, and topple six crowned wardens in any order.

### Dark Souls III

The last Dark Souls, where an Unkindled warrior returns runaway Lords of Cinder to their thrones as the First Flame fades. Interconnected levels, bonfire checkpoints, stamina-based combat and punishing bosses define it.

**Systems:** `checkpoint-rest`, `corpse-run`, `stamina`, `dodge-roll`, `parry-block`, `mana-resource` ✓, `potions` ✓, `skill-modifiers`, `boss-fights` ✓, `co-op-party` ✓, `pvp` ✓, `shortcuts` (✓ = we have it)

**Classes:** Sorcerer (mage), Pyromancer (elementalist), Cleric (cleric), Assassin (assassin), Knight (knight), Herald (paladin)

**Original take:** Lantern Steps: a tight castle gauntlet where every lantern you light becomes your respawn point and opens a shortcut door back to it, dropped sparkles wait where you fell for one retry, and each warden boss shows a clear tell to roll through.

### Monster Hunter: World

Capcom's hunting action RPG: a hunter tracks giant monsters across seamless habitats, then slays or traps them and turns their parts into new weapons and armor. Up to four hunters play together, with cat companions filling out smaller parties.

**Systems:** `monster-tracking`, `crafting`, `gear-defines-build`, `gear-skills`, `monster-taming`, `boss-phases`, `pets`, `co-op-party` ✓, `stamina`, `environment-hazards`, `day-night`, `meal-buffs` (✓ = we have it)

**Classes:** Great Sword (berserker), Hunting Horn (bard), Insect Glaive (spearman), Bow (archer), Lance (knight)

**Original take:** Track & Tame Expedition: kids follow glowing fireflies to a giant beast's footprints, wear it down, then choose to net it for the sanctuary or defeat it, and stitch its scales into a matching armor set with set-bonus perks, with a cat-like sidekick for small parties.

## Strategy, MOBA and battle royale

| Work | Kind | Genres | Nearest build today | Links |
| --- | --- | --- | --- | --- |
| **StarCraft II** (2010) | game | rts | survival · sci-fi-outpost · any | [Wikipedia](https://en.wikipedia.org/wiki/StarCraft_II:_Wings_of_Liberty) · [Official](https://starcraft2.blizzard.com/) · [Wiki](https://starcraft.fandom.com/wiki/Co-op_Missions) · [Image](https://en.wikipedia.org/wiki/File:StarCraft_II_-_Box_Art.jpg) |
| **Warcraft III: Reforged** (2020) | game | rts | quest · enchanted-forest · templar | [Wikipedia](https://en.wikipedia.org/wiki/Warcraft_III:_Reforged) · [Official](https://playwarcraft3.com/) · [Wiki](https://warcraft.wiki.gg/wiki/Warcraft_III_heroes) · [Image](https://en.wikipedia.org/wiki/File:Warcraft_III_Reforged_Logo.png) |
| **Age of Empires IV** (2021) | game | rts | survival · farm-fields · knight | [Wikipedia](https://en.wikipedia.org/wiki/Age_of_Empires_IV) · [Official](https://www.ageofempires.com/games/aoeiv/) · [Wiki](https://ageofempires.fandom.com/wiki/Age_of_Empires_IV) · [Image](https://en.wikipedia.org/wiki/File:Age_of_Empires_IV_Cover_Art.png) |
| **Command & Conquer: Red Alert 3** (2008) | game | rts | survival · pirate-coast · any | [Wikipedia](https://en.wikipedia.org/wiki/Command_%26_Conquer:_Red_Alert_3) · [Image](https://en.wikipedia.org/wiki/File:Command_%26_Conquer_Red_Alert_3_Game_Cover.jpg) |
| **League of Legends** (2009) | game | moba | squad-royale · enchanted-forest · any | [Wikipedia](https://en.wikipedia.org/wiki/League_of_Legends) · [Official](https://www.leagueoflegends.com/) · [Wiki](https://leagueoflegends.fandom.com/) · [Image (free)](https://commons.wikimedia.org/wiki/File:League_of_Legends_2019_vector.svg) |
| **Dota 2** (2013) | game | moba | squad-royale · enchanted-forest · any | [Wikipedia](https://en.wikipedia.org/wiki/Dota_2) · [Official](https://www.dota2.com/) · [Wiki](https://dota2.fandom.com/) · [Image](https://en.wikipedia.org/wiki/File:Dota_2_Steam_artwork.jpg) |
| **Heroes of the Storm** (2015) | game | moba | squad-royale · haunted-graveyard · any | [Wikipedia](https://en.wikipedia.org/wiki/Heroes_of_the_Storm) · [Official](https://heroesofthestorm.blizzard.com/) · [Wiki](https://heroesofthestorm.fandom.com/wiki/Battleground) · [Image](https://en.wikipedia.org/wiki/File:Heroes_of_the_Storm_BlizzHeroes_2017_logo.png) |
| **Pokémon Unite** (2021) | game | moba | squad-royale · ancient-temple · wildwarden | [Wikipedia](https://en.wikipedia.org/wiki/Pok%C3%A9mon_Unite) · [Official](https://unite.pokemon.com/) · [Wiki](https://pokemonunite.fandom.com/wiki/Theia_Sky_Ruins) · [Image](https://en.wikipedia.org/wiki/File:Pokemon_Unite_logo.png) |
| **Fortnite Battle Royale** (2017) | game | battle-royale, sandbox | battle-royale · farm-fields · any | [Wikipedia](https://en.wikipedia.org/wiki/Fortnite_Battle_Royale) · [Official](https://www.fortnite.com/) · [Wiki](https://fortnite.fandom.com/wiki/Building) · [Image (free)](https://commons.wikimedia.org/wiki/File:FNBattleRoyale_Black_Text.svg) |
| **PUBG: Battlegrounds** (2017) | game | battle-royale | battle-royale · farm-fields · any | [Wikipedia](https://en.wikipedia.org/wiki/PUBG:_Battlegrounds) · [Official](https://pubg.com/) · [Image](https://en.wikipedia.org/wiki/File:Pubgbattlegrounds.png) |
| **Apex Legends** (2019) | game | battle-royale, hero-shooter | squad-royale · desert-ruins · any | [Wikipedia](https://en.wikipedia.org/wiki/Apex_Legends) · [Official](https://www.ea.com/games/apex-legends) · [Wiki](https://apexlegends.fandom.com/wiki/Map) · [Image](https://en.wikipedia.org/wiki/File:Apex_legends_cover.jpg) |
| **Overwatch 2** (2023) | game | hero-shooter | squad-royale · city-streets · any | [Wikipedia](https://en.wikipedia.org/wiki/Overwatch_(2023_video_game)) · [Official](https://overwatch.blizzard.com/) · [Wiki](https://overwatch.fandom.com/wiki/Maps) · [Image](https://en.wikipedia.org/wiki/File:Overwatch_2_Steam_artwork.jpg) |
| **Clash Royale** (2016) | game | rts, tower-defense, deckbuilder | survival · storybook-village · any | [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale) · [Official](https://clashroyale.com/) · [Wiki](https://clashroyale.fandom.com/wiki/Cards) · [Image](https://en.wikipedia.org/wiki/File:Clash_Royale_game_logo.png) |
| **Brawl Stars** (2018) | game | moba, hero-shooter, battle-royale | squad-royale · desert-ruins · any | [Wikipedia](https://en.wikipedia.org/wiki/Brawl_Stars) · [Official](https://supercell.com/en/games/brawlstars/) · [Wiki](https://brawlstars.fandom.com/wiki/Showdown) · [Image](https://en.wikipedia.org/wiki/File:Brawl_Stars_logo_2025.svg) |

### StarCraft II

A science-fiction real-time strategy trilogy in which three very different species (humans, an evolving swarm and a psionic race) mine resources, build bases and armies, and fight across campaigns, ladder matches and a two-player co-op mode. Its co-op mode, where each player picks a levelling commander with call-down powers, became its most-played way to play.

**Systems:** `resource-gathering`, `supply-cap`, `base-building`, `unit-production`, `tech-tree`, `fog-of-war`, `unit-command`, `asymmetric-factions`, `co-op-missions`, `commander-calldowns`, `hero-units`, `commander-progression`, `run-modifiers`, `campaign-armory`, `level-editor` ✓, `ranked-matchmaking` (✓ = we have it)

**Classes:** Terran (commander), Zerg (commander), Protoss (commander), Jim Raynor (commander), Sarah Kerrigan (commander), Artanis (commander), Abathur (summoner)

**Original take:** Comet Wardens: two friends each pick a Warden (a drill-boss who calls down mining drones and a rescue rocket, or a hive-mother who fights in person) and hold a frontier colony against night waves of rock-beetles, levelling their Warden between missions.

### Warcraft III: Reforged

A remaster of the 2002 fantasy RTS in which four factions (humans, orcs, undead and night elves) gather gold and lumber, build bases and lead armies under levelling hero units. It mixed RTS with RPG growth and, through its map editor, gave birth to the MOBA genre.

**Systems:** `resource-gathering`, `supply-cap`, `upkeep`, `hero-units`, `neutral-camps`, `day-night`, `fog-of-war`, `base-building`, `tech-tree`, `asymmetric-factions`, `story-chapters` ✓, `level-editor` ✓, `ranked-matchmaking` (✓ = we have it)

**Classes:** Human Alliance (commander), Orcish Horde (commander), Undead Scourge (commander), Night Elf Sentinels (commander), Paladin (paladin), Archmage (mage), Mountain King (warrior), Blademaster (assassin), Far Seer (elementalist), Death Knight (necromancer), Keeper of the Grove (druid), Demon Hunter (shapeshifter)

**Original take:** Lantern Lords: each player leads one levelling hero and a small village army, clears sleepy forest guardians at night for treasure, and races to light the rival's beacon, with four peoples who build in different ways (walking tree-houses, burrowing camps, chalk-circle towers, singing stone farms).

### Age of Empires IV

A historical RTS set from the early Middle Ages to the early Renaissance, where villagers gather food, wood, gold and stone while the player advances through four ages by building landmarks. Its many civilizations play very differently, from nomads who pack up their buildings to a variant led by a single levelling hero.

**Systems:** `resource-gathering`, `supply-cap`, `age-advancement`, `tech-tree`, `base-building`, `influence-zones`, `asymmetric-factions`, `hero-units`, `victory-conditions`, `capture-points`, `fog-of-war`, `story-chapters` ✓ (✓ = we have it)

**Classes:** English (commander), Mongols (commander), Chinese (commander), Rus (commander), Delhi Sultanate (commander), Jeanne d'Arc (commander)

**Original take:** Kingdom Lanterns: players grow a village by choosing one of two wonder-buildings to climb each of four eras, then win by toppling the rival's wonders or by holding three glowing shrines with their storytellers for a countdown.

### Command & Conquer: Red Alert 3

A tongue-in-cheek alternate-history RTS where three powers (Allies, Soviets and a psychic-tech Empire) harvest ore, build bases on land and sea, and race to superweapons. Every campaign mission is played with a partner, human or AI.

**Systems:** `co-op-missions`, `resource-gathering`, `base-building`, `tech-tree`, `superweapons`, `commander-calldowns`, `unit-secondary-abilities`, `naval-warfare`, `asymmetric-factions`, `unit-command`, `story-chapters` ✓ (✓ = we have it)

**Classes:** Allied Nations (commander), Soviet Union (commander), Empire of the Rising Sun (commander), Tanya (gunner)

**Original take:** Toybox Tides: two kids co-command a harbour of wind-up toys against a rival toy fleet, calling in balloon drops on a cooldown and racing to finish a giant bubble-dome or a teleporting toy-box before the other side does.

### League of Legends

A free-to-play 5v5 battle arena where each player controls one champion, levels up and buys items within a match, and the team pushes down three lanes to destroy the enemy Nexus. It is the template for the modern MOBA: lanes, turrets, minion waves, a jungle and team-wide objective monsters.

**Systems:** `lanes`, `in-match-leveling`, `shops` ✓, `neutral-camps`, `map-objectives`, `respawn-rules`, `ultimate-ability`, `hero-select` ✓, `ranked-matchmaking`, `fog-of-war`, `auto-battle` (✓ = we have it)

**Classes:** Garen (warrior), Ahri (mage), Jinx (gunner), Thresh (warrior), Soraka (cleric), Annie (summoner)

**Original take:** Lantern Lanes: two teams of five storybook heroes push waves of paper soldiers down three lanes toward the other side's great lantern, levelling up each match and teaming up to wake a river-turtle that marches with them.

### Dota 2

Valve's sequel to the Warcraft III mod that founded the MOBA: two teams of five heroes push three lanes to destroy the enemy Ancient. It is known for depth: a draft phase, last-hitting and denying, a day-night cycle, runes and a respawning boss.

**Systems:** `lanes`, `hero-draft`, `in-match-leveling`, `skill-tree` ✓, `mana-resource` ✓, `last-hitting`, `shops` ✓, `neutral-camps`, `boss-fights` ✓, `power-runes`, `day-night`, `fog-of-war`, `level-editor` ✓ (✓ = we have it)

**Classes:** Axe (berserker), Crystal Maiden (elementalist), Pudge (warrior), Juggernaut (berserker), Lion (mage), Sniper (gunner)

**Original take:** Moonwell Clash: two bands of five pick heroes in turns, then push gnome waves along three forest roads to topple the rival's moonwell, grabbing glowing pebbles for short power-ups and teaming up on a sleeping stone giant who drops a second-life charm.

### Heroes of the Storm

Blizzard's crossover MOBA in which 5v5 teams of heroes from its other games fight to destroy the enemy Core on many themed battlegrounds. It streamlines the genre with shared team experience, talents instead of item shops, and a map objective on every battleground.

**Systems:** `in-match-leveling`, `skill-tree` ✓, `map-objectives`, `lanes`, `neutral-camps`, `mounts`, `fast-travel`, `hero-draft`, `ranked-matchmaking`, `ai-opponents` ✓, `run-modifiers` (✓ = we have it)

**Classes:** Muradin (warrior), Jaina (elementalist), Li Li (healer), Abathur (summoner), Illidan (assassin), Valla (archer)

**Original take:** Storybook Stadium: teams of five level up together, pick one storybook perk every few levels instead of shopping, and race to fill a magic seed patch that grows a garden giant to march down a lane for them.

### Pokémon Unite

A family-friendly 5v5 MOBA with 10-minute matches where Pokémon defeat wild Pokémon for energy and dunk it into the other team's goal zones for points. Each player's Pokémon starts weak and evolves during the match, and a legendary boss near the end can swing the score.

**Systems:** `score-goals`, `class-advancement`, `in-match-leveling`, `ultimate-ability`, `neutral-camps`, `map-objectives`, `lanes`, `hidden-scoreboard`, `quick-mode`, `ranked-matchmaking` (✓ = we have it)

**Classes:** Pikachu (elementalist), Snorlax (warrior), Charizard (shapeshifter), Eldegoss (healer)

**Original take:** Sprout Score: two teams of critter-kids catch glow-bugs in the meadow and run them into the other team's flower baskets for points, their critter growing into a bigger form mid-match, with a thunder-owl in the last two minutes that makes baskets open wide.

### Fortnite Battle Royale

A free-to-play battle royale where up to 100 players skydive onto an island, loot weapons and race a shrinking storm, with a signature system for harvesting materials and building walls and ramps mid-fight. It is also a platform of seasons, live events and player-made islands.

**Systems:** `battle-royale-storm` ✓, `drop-in-start`, `building-in-combat`, `loot-rarity` ✓, `downed-revive`, `co-op-party` ✓, `ai-opponents` ✓, `level-editor` ✓, `no-build-mode`, `respawn-rules`, `seasons`, `ranked-matchmaking` (✓ = we have it)

**Original take:** Pillow Fort Royale: players parachute from a hot-air balloon onto a giant bedroom, gather blocks and cushions to snap up walls and ramps, and tag each other with foam blasters while a tide of sleepy-fog rolls in from the edges.

### PUBG: Battlegrounds

The game that made battle royale a genre: up to 100 players parachute onto a large map with nothing, scavenge weapons, armour and vehicles, and fight to be the last alive inside a shrinking blue wall. It plays as a grounded military shooter with long, tense rounds.

**Systems:** `battle-royale-storm` ✓, `drop-in-start`, `loot` ✓, `vehicles`, `supply-drops`, `bombardment-zones`, `co-op-party` ✓, `perspective-modes`, `event-modes` (✓ = we have it)

**Original take:** Paper Plane Drop: kids glide from a paper plane onto a huge model-railway countryside, hop in toy cars, chase supply kites that drop rare water balloons, and stay ahead of a rising tide of bath bubbles.

### Apex Legends

A free-to-play squad battle royale where trios each pick a different Legend with its own tactical, passive and ultimate ability. It added fluid movement, a smart ping system and a way to bring dead teammates back.

**Systems:** `hero-select` ✓, `character-classes` ✓, `battle-royale-storm` ✓, `drop-in-start`, `ping-system`, `downed-revive`, `traversal`, `in-match-leveling`, `shops` ✓, `co-op-party` ✓ (✓ = we have it)

**Classes:** Wraith (assassin), Bloodhound (ranger), Lifeline (healer), Gibraltar (knight), Pathfinder (engineer), Caustic (engineer)

**Original take:** Glider Guild: trios of gadget-kids (a portal-maker, a bubble-shield builder, a medic with a hover-bot) drop into a canyon on gliders, ping finds to each other, ride rope-lines and carry a fallen friend's badge to a beacon to bring them back.

### Overwatch 2

A free-to-play first-person hero shooter where two teams of five (one tank, two damage, two support) fight over objectives such as capture points and moving payloads. Every hero has a distinct kit of abilities and a charged ultimate; the game was renamed simply Overwatch in 2026.

**Systems:** `character-classes` ✓, `ultimate-ability`, `capture-points`, `escort-payload`, `in-match-leveling`, `upgrade-draft`, `ping-system`, `hero-draft`, `ranked-matchmaking`, `hero-select` ✓ (✓ = we have it)

**Classes:** Reinhardt (knight), Tracer (rogue), Mercy (cleric), Mei (elementalist), Torbjörn (engineer), Lúcio (bard)

**Original take:** Parade Push: two teams of five (one shield-carrier, two blasters, two helpers) take turns pushing a float down a carnival street while the other side tries to hold it back, each hero charging a big signature move.

### Clash Royale

A mobile duel of three-minute battles where each player spends regenerating elixir to drop troops, buildings and spells from an eight-card deck across two lanes. Destroy more of the other side's towers, or their king tower, to win.

**Systems:** `deck-building`, `elixir-deploy`, `lanes`, `placement-zones`, `pvp` ✓, `co-op-party` ✓, `gear-upgrading`, `guilds`, `hero-draft`, `auto-battle` (✓ = we have it)

**Classes:** Golden Knight (knight), Archer Queen (archer), Skeleton King (necromancer), Mighty Miner (worker)

**Original take:** Sandcastle Siege: each player holds eight shell-cards and spends rising tide-points to drop crabs, kites and splash spells over two bridges, aiming to topple the other side's sandcastle towers before the tide comes in.

### Brawl Stars

A top-down mobile shooter of short 3v3 matches and a 10-player battle royale, where each Brawler has one attack and a Super charged by landing hits. Many quick modes (gem grab, soccer, heists, king of the hill) share one roster of over 100 Brawlers.

**Systems:** `character-classes` ✓, `ultimate-ability`, `battle-royale-storm` ✓, `power-cubes`, `score-goals`, `capture-points`, `seasons`, `level-editor` ✓, `gear-upgrading`, `ranked-matchmaking`, `guilds` (✓ = we have it)

**Classes:** Shelly (gunner), Colt (gunner), El Primo (monk), Poco (bard), Jessie (engineer), Spike (elementalist)

**Original take:** Pocket Party Brawl: ten pocket-sized heroes with one trick and one charged super each race to grab glow-cubes in a shrinking sandbox, with quick team side modes like dodge-ball goals and jelly-bean grab.

## RPG, roguelike and family games

| Work | Kind | Genres | Nearest build today | Links |
| --- | --- | --- | --- | --- |
| **Dragon Quest XI: Echoes of an Elusive Age** (2017) | game | jrpg, story-adventure | quest · storybook-village · knight | [Wikipedia](https://en.wikipedia.org/wiki/Dragon_Quest_XI) · [Wiki](https://dragon-quest.org/wiki/Dragon_Quest_XI) · [Image](https://en.wikipedia.org/wiki/File:Dragon_Quest_XI_cover_art.jpg) |
| **Final Fantasy VII Remake** (2020) | game | action-rpg, jrpg, story-adventure | boss-hunt · city-streets · knight | [Wikipedia](https://en.wikipedia.org/wiki/Final_Fantasy_VII_Remake) · [Official](https://www.square-enix.com/ffvii/en-us/games/remake/) · [Image](https://en.wikipedia.org/wiki/File:FFVIIRemake.png) |
| **Genshin Impact** (2020) | game | action-rpg, open-world, gacha-rpg | quest · enchanted-forest · mage | [Wikipedia](https://en.wikipedia.org/wiki/Genshin_Impact) · [Official](https://genshin.hoyoverse.com/) · [Image (free)](https://en.wikipedia.org/wiki/File:Genshin_Impact_logo.svg) |
| **Honkai: Star Rail** (2023) | game | jrpg, gacha-rpg | boss-hunt · frozen-north · any | [Wikipedia](https://en.wikipedia.org/wiki/Honkai:_Star_Rail) · [Official](https://hsr.hoyoverse.com/) · [Image](https://en.wikipedia.org/wiki/File:Honkai_Star_Rail_logo.svg) |
| **Pokémon Scarlet and Violet** (2022) | game | monster-collecting, jrpg, open-world | monster-hunt · enchanted-forest · wildwarden | [Wikipedia](https://en.wikipedia.org/wiki/Pok%C3%A9mon_Scarlet_and_Violet) · [Official](https://scarletviolet.pokemon.com/) · [Image](https://en.wikipedia.org/wiki/File:Pok%C3%A9mon_Scarlet_and_Violet_banner.png) |
| **The Legend of Zelda: Tears of the Kingdom** (2023) | game | open-world, action-rpg, sandbox, puzzle | quest · enchanted-forest · knight | [Wikipedia](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Tears_of_the_Kingdom) · [Official](https://zelda.nintendo.com/tears-of-the-kingdom/) · [Image](https://en.wikipedia.org/wiki/File:The_Legend_of_Zelda_Tears_of_the_Kingdom_cover.jpg) |
| **Minecraft Dungeons** (2020) | game | dungeon-crawler, hack-and-slash, action-rpg | dungeon-crawl · enchanted-forest · any | [Wikipedia](https://en.wikipedia.org/wiki/Minecraft_Dungeons) · [Wiki](https://minecraft.wiki/w/Minecraft_Dungeons) · [Image](https://en.wikipedia.org/wiki/File:Minecraft_Dungeons_cover_art.jpg) |
| **Hades** (2020) | game | roguelike, action-rpg, hack-and-slash | dungeon-crawl · dragon-dungeon · any | [Wikipedia](https://en.wikipedia.org/wiki/Hades_(video_game)) · [Official](https://www.supergiantgames.com/games/hades/) · [Wiki](https://hades.wiki.gg/wiki/Infernal_Arms) · [Image](https://en.wikipedia.org/wiki/File:Hades_cover_art.jpg) |
| **Vampire Survivors** (2022) | game | survivors-like, roguelite | survival · haunted-graveyard · any | [Wikipedia](https://en.wikipedia.org/wiki/Vampire_Survivors) · [Official](https://poncle.games/) · [Image](https://en.wikipedia.org/wiki/File:Vampire_Survivors_key_art.jpg) |
| **Slay the Spire** (2019) | game | deckbuilder, roguelike | dungeon-crawl · ancient-temple · any | [Wikipedia](https://en.wikipedia.org/wiki/Slay_the_Spire) · [Official](https://www.megacrit.com/) · [Wiki](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_Wiki) · [Image](https://en.wikipedia.org/wiki/File:Slay_the_spire_cover.jpg) |
| **Dead Cells** (2018) | game | roguelite, platformer, action-rpg | dungeon-crawl · dragon-dungeon · shadowblade | [Wikipedia](https://en.wikipedia.org/wiki/Dead_Cells) · [Official](https://dead-cells.com/) · [Wiki](https://deadcells.wiki.gg/wiki/Bosses) · [Image](https://en.wikipedia.org/wiki/File:Dead_cells_cover_art.png) |
| **Stardew Valley** (2016) | game | life-sim, sandbox | calm-study · farm-fields · wildwarden | [Wikipedia](https://en.wikipedia.org/wiki/Stardew_Valley) · [Official](https://www.stardewvalley.net/) · [Image](https://en.wikipedia.org/wiki/File:Logo_of_Stardew_Valley.png) |
| **Terraria** (2011) | game | sandbox, survival-crafting, platformer, action-rpg | boss-hunt · enchanted-forest · any | [Wikipedia](https://en.wikipedia.org/wiki/Terraria) · [Official](https://terraria.org/) · [Wiki](https://terraria.wiki.gg/wiki/Bosses) · [Image](https://en.wikipedia.org/wiki/File:Terraria_Steam_artwork.jpg) |
| **Baldur's Gate 3** (2023) *mature* | game | tactical-rpg, story-adventure | quest · enchanted-forest · any | [Wikipedia](https://en.wikipedia.org/wiki/Baldur%27s_Gate_3) · [Official](https://baldursgate3.game/) · [Wiki](https://bg3.wiki/wiki/Classes) · [Image](https://en.wikipedia.org/wiki/File:Baldur%27s_Gate_3_cover_art.jpg) |
| **Ni no Kuni II: Revenant Kingdom** (2018) | game | action-rpg, jrpg, story-adventure | quest · storybook-village · knight | [Wikipedia](https://en.wikipedia.org/wiki/Ni_no_Kuni_II:_Revenant_Kingdom) · [Official](https://en.bandainamcoent.eu/ni-no-kuni/ni-no-kuni-ii-revenant-kingdom) · [Image](https://en.wikipedia.org/wiki/File:Ni_no_Kuni_II_Revenant_Kingdom_cover_art.jpg) |
| **Prodigy Math Game** (2014) | game | educational, mmorpg, jrpg | study · enchanted-forest · mage | [Wikipedia](https://en.wikipedia.org/wiki/Prodigy_Math_Game) · [Official](https://www.prodigygame.com/) · [Image](https://en.wikipedia.org/wiki/File:Prodigy_Math_Game_Loading_Screen.png) |

### Dragon Quest XI: Echoes of an Elusive Age

A classic turn-based JRPG in which a marked boy, hunted as a villain by the king, gathers a band of companions to restore a dying world tree. It is the traditional party-adventure template: towns, dungeons, roaming monsters and a long story told in acts.

**Systems:** `turn-based-combat`, `visible-field-monsters`, `leveling` ✓, `skill-tree` ✓, `gear-upgrading`, `mounts`, `story-chapters` ✓, `retro-style-toggle`, `difficulty-tiers`, `character-classes` ✓ (✓ = we have it)

**Characters:** The Luminary (knight), Erik (rogue), Veronica (mage), Serena (cleric), Sylvando (bard), Jade (monk), Rab (mage), Hendrik (knight)

**Original take:** A shepherd girl with a glowing birthmark is chased out of her own kingdom and recruits a pickpocket, a pair of feuding sister-witches and a juggling minstrel to rekindle the Lantern Oak; monsters wander the meadows and a tamed one can be ridden between towns.

### Final Fantasy VII Remake

A mercenary joins a resistance cell fighting a power company that drains the planet's life energy, in a real-time remake of the opening of a classic JRPG. Combat mixes action with a time gauge that lets the player pause and pick spells and abilities.

**Systems:** `real-time-combat` ✓, `atb-gauge-commands`, `party-switching`, `ultimate-ability`, `summons`, `loadout-strategy`, `character-classes` ✓, `boss-fights` ✓, `quests` ✓ (✓ = we have it)

**Characters:** Cloud Strife (warrior), Barret Wallace (gunner), Tifa Lockhart (monk), Aerith Gainsborough (mage), Yuffie Kisaragi (assassin), Sephiroth (warrior)

**Original take:** In a smog-wrapped tower city, a hired blade and three rebels sabotage the furnaces of a company that burns the earth's dreams for light; a pause-gauge lets kids stop time to pick a spell, then jump back into the fight.

### Genshin Impact

An anime-style open world where a traveller searching for a lost twin crosses seven elemental nations, switching between four heroes in real-time combat. Elements react with one another, and most heroes are drawn from paid random banners.

**Systems:** `open-world`, `party-switching`, `elemental-reactions`, `puzzles`, `dungeon-portals`, `regenerating-reward-energy`, `rank-system`, `co-op-party` ✓, `crafting`, `fast-travel`, `gacha`, `level-editor` ✓ (✓ = we have it)

**Classes:** Diluc (claymore, fire) (berserker), Venti (bow, wind) (archer), Zhongli (polearm, earth) (spearman), Bennett (sword, fire) (cleric), Klee (catalyst, fire) (mage), The Traveler (Aether or Lumine) (elementalist), Paimon (bard), Raiden Shogun (spearman)

**Original take:** A party of four weather-kids swap places with a tap: a rain-caller soaks the bog-goblins, a frost-skater freezes them solid, and every hero is earned through quests, never random paid draws.

### Honkai: Star Rail

An amnesiac with a world-ending artefact inside them rides a star-crossing train from planet to planet, fighting in four-hero turn-based battles. Heroes follow Paths that set their combat role, and break enemy toughness by hitting elemental weaknesses.

**Systems:** `turn-based-combat`, `character-classes` ✓, `elemental-reactions`, `field-techniques`, `auto-battle`, `gear-upgrading`, `puzzles`, `story-chapters` ✓, `gacha` (✓ = we have it)

**Classes:** Preservation (knight), Abundance (healer), Harmony (bard), Nihility (druid), Erudition (elementalist), The Hunt (ranger), The Trailblazer (warrior), March 7th (archer), Dan Heng (spearman), Kafka (assassin), Bronya (commander)

**Original take:** A lantern-tram stops at a new floating island each chapter; kids pick four heroes by role (shield, mender, cheer-leader, striker) and crack a crystal foe's armour by hitting its matching colour.

### Pokémon Scarlet and Violet

A student at a region's academy rides a legendary creature across the series' first fully open world, catching and training monsters for turn-based battles. Three story routes (gyms, giant titans, a bully gang) can be tackled in any order.

**Systems:** `monster-taming`, `turn-based-combat`, `open-world`, `mounts`, `auto-battle`, `nonlinear-story-routes`, `type-shift-transform`, `raids`, `co-op-party` ✓, `crafting`, `trading` (✓ = we have it)

**Characters:** Nemona (tamer), Arven (tamer), Penny (tamer), Geeta (tamer)

**Original take:** A summer camp on Puddlehop Isle sends kids out on a gliding beetle to befriend critters, hunt three giant 'grandbeasts' in any order, and share picnic snacks that power up the team.

### The Legend of Zelda: Tears of the Kingdom

A hero with a borrowed ancient arm explores a kingdom across three layers (floating sky islands, the surface and a dark underworld) to stop a returning demon king. Building powers let players glue objects into vehicles and fuse items onto weapons.

**Systems:** `open-world`, `physics-building`, `fuse-weapons`, `time-rewind`, `pass-through-ceilings`, `blueprint-autobuild`, `puzzles`, `collectible-upgrades`, `max-health-hazard`, `crafting`, `mounts`, `boss-fights` ✓ (✓ = we have it)

**Characters:** Link (warrior), Zelda (mage), Ganondorf (necromancer), Tulin (archer), Sidon (warrior), Yunobo (berserker), Riju (elementalist)

**Original take:** Kids explore Cloudhaven, an archipelago of floating meadows, with a tinker-glove that sticks planks, balloons and fans into rafts and gliders, and tape any pebble or pinecone onto their stick for silly new powers.

### Minecraft Dungeons

A family-friendly isometric dungeon crawler set in the block world, where up to four heroes free villages from an outcast villain corrupted by a magic orb. There are no classes: whatever weapon, armour and artifacts you pick up is your build.

**Systems:** `gear-defines-build`, `enchantment-points`, `artifact-slots`, `co-op-party` ✓, `procedural-dungeons`, `waves` ✓, `summons`, `shops` ✓, `secret-levels`, `roguelike-runs`, `story-chapters` ✓ (✓ = we have it)

**Original take:** Four cousins from Pebbleton crawl through the Mosslight Caverns, swapping found crossbows and frying pans freely, each with three trinket slots (a healing totem, a bee jar, a gust horn), to free the villages a lonely sulking wizard has locked away.

### Hades

The underworld prince tries again and again to fight his way out of his father's realm, room by room, helped by gifts from the gods. Every death sends him home, where the story moves on and permanent upgrades await.

**Systems:** `roguelike-runs`, `upgrade-draft`, `dodge-roll`, `meta-progression`, `npc-dialogue` ✓, `npc-affinity`, `difficulty-tiers`, `assist-mode`, `boss-fights` ✓, `extra-lives` (✓ = we have it)

**Classes:** Stygian Blade (warrior), Eternal Spear (spearman), Shield of Chaos (knight), Heart-Seeking Bow (archer), Twin Fists (monk), Adamant Rail (gunner), Zagreus (warrior), Hades (necromancer), Megaera (assassin), Nyx (mage)

**Original take:** A young gardener keeps trying to climb out of the Root Kingdom, choosing one of three blessings from the weather spirits after each room; every tumble back home unlocks a new chat with the household and a permanent seed upgrade.

### Vampire Survivors

A hero who attacks automatically walks an endless field while ever-larger swarms close in, picking new weapons and passives at each level-up. It launched the 'bullet heaven' genre of auto-attack survival games.

**Systems:** `auto-attack`, `waves` ✓, `upgrade-draft`, `growing-weapon`, `loot` ✓, `timed-survival-finale`, `meta-progression`, `achievements`, `run-modifiers`, `co-op-party` ✓, `character-classes` ✓ (✓ = we have it)

**Original take:** A lantern-keeper strolls through Mothmeadow at dusk while her charms (orbiting fireflies, a bouncing acorn, a bubble wand) fire on their own; each level-up offers three new charms, and pairing two of them grows a super charm before the dawn bell rings.

### Slay the Spire

One of four heroes climbs a randomly generated spire along a branching map, fighting turn-based card battles and growing a deck from rewards. It popularised the roguelike deck-builder.

**Systems:** `deck-building`, `turn-based-combat`, `enemy-intent`, `roguelike-runs`, `permadeath`, `relics`, `rest-site-choice`, `potions` ✓, `shops` ✓, `difficulty-tiers`, `run-modifiers`, `meta-progression` (✓ = we have it)

**Classes:** The Ironclad (warrior), The Silent (assassin), The Defect (engineer), The Watcher (monk)

**Original take:** A study deck-climber for Gamory: climb the Lighthouse of Riddles with a hand of spell cards, see what each sea-gremlin plans next turn, and answer a quick question at campfires to upgrade a card instead of resting.

### Dead Cells

A headless blob of cells possesses a prisoner's body and fights across a cursed island in a 2D side-scrolling 'roguevania', losing its gear at every death. Collected cells buy permanent unlocks that make the next run richer.

**Systems:** `roguelike-runs`, `permadeath`, `procedural-dungeons`, `dodge-roll`, `meta-progression`, `stat-points`, `upgrade-draft`, `traversal-runes`, `weapon-reforge`, `boss-fights` ✓ (✓ = we have it)

**Characters:** The Beheaded (the Prisoner) (rogue)

**Original take:** A slime sprite hops between straw scarecrow bodies to escape a sunken toy castle; glowing beads from beaten wind-up foes buy permanent backpack upgrades, and torn recipe cards found deep inside unlock new tools for the next try.

### Stardew Valley

A city worker inherits a grandfather's overgrown farm and restores it season by season while befriending a small town. Cosy and open-ended, with a monster-filled mine for players who want some adventure.

**Systems:** `seasonal-farming`, `resource-gathering`, `crafting`, `animal-husbandry`, `use-based-skills`, `npc-affinity`, `collection-bundles`, `daily-energy`, `day-night`, `descending-mine`, `fishing`, `co-op-party` ✓, `housing` (✓ = we have it)

**Original take:** A study farm: kids grow a pumpkin patch in Brambleby where each watering is a quick question, deliver basket sets to reopen the old greenhouse, and visit a friendly mole's tunnel for some gentle monster-shooing.

### Terraria

A 2D sandbox where players dig, build and fight across a procedurally generated world, crafting better gear to take on a long ladder of bosses. Beating a key boss flips the world into a harder second half.

**Systems:** `procedural-dungeons`, `resource-gathering`, `crafting`, `base-building`, `housing`, `shops` ✓, `gear-defines-build`, `boss-fights` ✓, `boss-gated-world`, `world-events`, `spreading-biome`, `co-op-party` ✓, `character-customization` ✓, `creative-mode` (✓ = we have it)

**Classes:** Melee (warrior), Ranged (gunner), Magic (mage), Summoner (summoner)

**Original take:** Kids dig into Burrowland, build cottages that attract a baker, a medic and a map-seller, and craft better shovels and slingshots to summon and beat a ladder of giant pests, from a jelly king to a moon moth.

### Baldur's Gate 3

A party infected with mind-controlling parasites seeks a cure across a fantasy realm, in a game built on the fifth-edition tabletop rules. Real-time exploration turns into turn-based tactical combat, and dice rolls decide fights, locks and conversations.

**Systems:** `turn-based-combat`, `dice-rolls`, `character-classes` ✓, `multiclassing`, `stat-points`, `dialogue-choices`, `elemental-reactions`, `checkpoint-rest`, `quests` ✓, `character-customization` ✓, `co-op-party` ✓, `respec` (✓ = we have it)

**Classes:** Barbarian (berserker), Fighter (warrior), Rogue (rogue), Wizard (mage), Cleric (cleric), Druid (druid), Paladin (paladin), Bard (bard)

**Original take:** Mechanics only (mature work): a gentle turn-based 'dice tactics' mode for Gamory where a party of four rolls a big friendly die for each swing or spell, and puddles of oil or water combine with fire and frost on the battlefield.

### Ni no Kuni II: Revenant Kingdom

A boy king driven from his castle sets out to found a new kingdom where everyone can be happy, uniting rival nations along the way. Storybook action RPG with tiny elemental helper sprites in battle and a town to build and manage.

**Systems:** `real-time-combat` ✓, `party-switching`, `summons`, `base-building`, `open-world`, `diorama-world-map`, `quests` ✓, `story-chapters` ✓, `shops` ✓ (✓ = we have it)

**Characters:** Evan Pettiwhisker Tildrum (knight), Roland Crane (warrior), Tani (spearman), Batu (berserker), Leander (mage), Bracken Meadows (engineer)

**Original take:** A kitten-eared prince builds the new town of Kindlewick between quests, giving each rescued villager a job at the bakery or forge, while a cloud of tiny weather sprites tags along in fights to cast puddle and gust spells.

### Prodigy Math Game

An online fantasy RPG where a young wizard recovers five stolen keystones by winning turn-based spell battles, and every spell is powered by answering a math question. Teachers use it to set work and track progress, and defeated monsters can be rescued as pets.

**Systems:** `study-questions` ✓, `turn-based-combat`, `monster-taming`, `pets`, `quests` ✓, `boss-fights` ✓, `elemental-reactions`, `teacher-dashboard`, `character-customization` ✓, `difficulty-tiers`, `co-op-party` ✓, `membership-tiers` (✓ = we have it)

**Characters:** The player wizard (mage), Noot (bard), Theo Addiwise (mage), The Puppet Master (summoner)

**Original take:** Young spell-scholars at the Inkwell School recharge their wands by solving quick sums, befriend the mischief-sprites they calm down, and relight five lighthouse lamps the Thimble Thief knocked out, with every unlock earned in play, not bought.

## Korean manhwa and web novels

| Work | Kind | Genres | Nearest build today | Links |
| --- | --- | --- | --- | --- |
| **Solo Leveling** (2018) | manhwa | action-rpg, dungeon-crawler, hack-and-slash | dungeon-crawl · dragon-dungeon · bonecaller | [Wikipedia](https://en.wikipedia.org/wiki/Solo_Leveling) · [Wiki](https://solo-leveling.fandom.com/) · [Image](https://en.wikipedia.org/wiki/File:Solo_Leveling_Volume_1_Cover.jpg) |
| **Solo Leveling: Arise** (2024) | game | action-rpg, gacha-rpg, hack-and-slash | dungeon-crawl · dragon-dungeon · bonecaller | [Wikipedia](https://en.wikipedia.org/wiki/Solo_Leveling) · [Official](https://apps.apple.com/app/id1662742277) · [Wiki](https://solo-leveling-arise.fandom.com/) |
| **Tower of God** (2010) | manhwa | story-adventure, action-rpg, tactical-rpg | quest · ancient-temple · mage | [Wikipedia](https://en.wikipedia.org/wiki/Tower_of_God) · [Official](https://www.webtoons.com/en/fantasy/tower-of-god/list?title_no=95) · [Wiki](https://towerofgod.fandom.com/) · [Image](https://en.wikipedia.org/wiki/File:Tower_of_God_Volume_1_Cover.jpg) |
| **The Beginning After the End** (2017) | web-novel | story-adventure, action-rpg | quest · enchanted-forest · mage | [Wikipedia](https://en.wikipedia.org/wiki/The_Beginning_After_the_End) · [Wiki](https://tbate.fandom.com/) · [Image](https://en.wikipedia.org/wiki/File:The_Beginning_After_the_End_webtoon_volume_1_cover.jpg) |
| **Omniscient Reader's Viewpoint** (2018) | web-novel | story-adventure, action-rpg | survival · city-streets · knight | [Wikipedia](https://en.wikipedia.org/wiki/Omniscient_Reader%27s_Viewpoint) · [Official](https://www.webtoons.com/en/action/omniscient-reader/list?title_no=2154) · [Image](https://en.wikipedia.org/wiki/File:Omniscient_Reader%27s_Viewpoint_Volume_1_Cover.jpg) |
| **Overgeared** (2014) | web-novel | mmorpg, action-rpg | quest · storybook-village · knight | [Wikipedia](https://en.wikipedia.org/wiki/Overgeared) · [Official](https://www.webtoons.com/en/action/overgeared/list?title_no=10941) |
| **The Greatest Estate Developer** (2021) | manhwa | story-adventure, life-sim | quest · farm-fields · knight | [Wikipedia](https://en.wikipedia.org/wiki/The_Greatest_Estate_Developer) · [Official](https://www.webtoons.com/en/fantasy/the-greatest-estate-developer/list?title_no=3596) · [Image](https://en.wikipedia.org/wiki/File:The_Greatest_Estate_Developer_Volume_1_Cover.jpg) |
| **Second Life Ranker** (2019) | manhwa | action-rpg, dungeon-crawler | dungeon-crawl · ancient-temple · shadowblade | [Official](https://myanimelist.net/manga/147324) · [Wiki](https://second-life-ranker.fandom.com/wiki/Second_Life_Ranker_Wiki) |
| **The Return of the Disaster-Class Hero** (2021) | manhwa | action-rpg, story-adventure | boss-hunt · city-streets · barbarian | [Official](https://tappytoon.com/book/the-return-of-the-disaster-class-hero) |
| **Leveling with the Gods** (2021) | manhwa | action-rpg, dungeon-crawler | dungeon-crawl · ancient-temple · knight | [Official](https://yenpress.com/series/level-up-with-the-gods) · [Wiki](https://leveling-with-the-gods.fandom.com/) |
| **The Gamer** (2013) | manhwa | action-rpg, story-adventure | monster-hunt · city-streets · mage | [Wikipedia](https://en.wikipedia.org/wiki/The_Gamer) · [Official](https://www.webtoons.com/en/fantasy/the-gamer/list?title_no=88) · [Wiki](https://the-gamer.fandom.com/) |
| **Noblesse** (2007) | manhwa | story-adventure, hack-and-slash | boss-hunt · city-streets · mage | [Wikipedia](https://en.wikipedia.org/wiki/Noblesse_(manhwa)) · [Official](https://www.webtoons.com/en/fantasy/noblesse/list?title_no=87) · [Image](https://en.wikipedia.org/wiki/File:Noblesse_(manhwa)_Cover.jpg) |
| **Hardcore Leveling Warrior** (2016) | manhwa | mmorpg, action-rpg | monster-hunt · enchanted-forest · knight | [Official](https://www.webtoons.com/en/action/hardcore-leveling-warrior/list?title_no=1221) · [Wiki](https://hardcorelevelingwarrior.fandom.com/) |
| **Eleceed** (2018) | manhwa | story-adventure, action-rpg | monster-hunt · city-streets · shadowblade | [Wikipedia](https://en.wikipedia.org/wiki/Eleceed) · [Official](https://www.webtoons.com/en/action/eleceed/list?title_no=1571) |
| **SSS-Class Revival Hunter** (2020) *mature* | manhwa | action-rpg, dungeon-crawler, roguelite | dungeon-crawl · ancient-temple · shadowblade | [Wikipedia](https://en.wikipedia.org/wiki/SSS-Class_Revival_Hunter) |

### Solo Leveling

In a world where gates open onto monster dungeons, the weakest E-rank hunter survives a deadly double dungeon and becomes the only player of a hidden game-like System that lets him level up. He grows from a nobody into the Shadow Monarch, commanding an army of the dead in a war between Monarchs and Rulers.

**Systems:** `dungeon-portals`, `rank-system`, `dungeon-break`, `daily-quests`, `penalty-zone`, `stat-points`, `class-advancement`, `shadow-army`, `instant-dungeon`, `guilds`, `raids`, `grid-inventory` ✓ (✓ = we have it)

**Characters:** Sung Jin-woo (necromancer), Cha Hae-in (warrior), Go Gun-hee (commander), Yoo Jin-ho (warrior), Thomas Andre (berserker), Igris (knight), Beru (berserker)

**Original take:** Rift Runner: a lowest-grade courier gets a glowing quest journal that sets daily chores, punishes skipped days with a sandstorm trial, and lets the courier bind defeated monsters as lantern-wraith companions that grow with every rift cleared.

### Solo Leveling: Arise

An action RPG of the Solo Leveling webtoon where you play Sung Jin-woo and recruited hunters through the story, clearing gates, raiding bosses and extracting shadows of defeated foes to fight beside you. A premium PC edition, Arise Overdrive, followed on Steam and Xbox PC in November 2025.

**Systems:** `real-time-combat` ✓, `character-classes` ✓, `shadow-army`, `stat-points`, `class-advancement`, `dungeon-portals`, `story-chapters` ✓, `boss-fights` ✓, `tower-climb`, `roster-restricted-modes`, `guilds`, `gear-upgrading`, `co-op-party` ✓, `gacha` (✓ = we have it)

**Characters:** Sung Jin-woo (necromancer), Cha Hae-in (warrior), Yoo Jin-ho (warrior), Sugimoto Reiji (assassin), Seorin (gunner)

**Original take:** Lanternfall Raids: a party of rift-wardens dives into coloured rifts (calm blue, sealed crimson, collapsing grey), and each defeated boss can be bound as a lantern-wraith whose leader bonus colours the whole team's attacks.

### Tower of God

Bam, who grew up beneath a vast Tower, opens its door to follow his friend Rachel and climbs it floor by floor, passing tests of strength, speed and wit. Climbers called Regulars form teams with set positions and fight with Shinsu, the Tower's magic-like water.

**Systems:** `tower-climb`, `character-classes` ✓, `mana-resource` ✓, `co-op-party` ✓, `rank-system`, `puzzles`, `growing-weapon`, `gacha` (✓ = we have it)

**Classes:** Fisherman (warrior), Spear Bearer (spearman), Light Bearer (bard), Scout (rogue), Wave Controller (elementalist), Twenty-Fifth Bam (mage), Khun Aguero Agnis (bard), Rak Wraithraiser (spearman), Yuri Ha Jahad (warrior), Urek Mazino (berserker), Shibisu (rogue)

**Original take:** Spire of Trials: a squad picks five roles (striker, lancer, lamplighter, pathfinder, tide-caller) and climbs a spire where every floor is a different test, some fights and some riddles, and the tide of magic gets thicker the higher you go.

### The Beginning After the End

King Grey is reborn as Arthur Leywin in Dicathen, a land of magic, races and mana beasts, and grows up with a bonded dragon while trying not to repeat his past life's mistakes. A war against the Vritra, a clan of banished deities, later forces him to lead.

**Systems:** `regression`, `rank-system`, `character-classes` ✓, `elemental-reactions`, `pets`, `beast-will`, `co-op-party` ✓, `story-chapters` ✓ (✓ = we have it)

**Characters:** Arthur Leywin (King Grey) (elementalist), Sylvie (shapeshifter), The Six Lances (knight), The Twin Horns (warrior)

**Original take:** Second Dawn: a reborn wizard-child raises a hatchling wyrm while a heart-crystal glows through colour bands as it grows, choosing at each band between a body-forging path or a spell-throwing path.

### Omniscient Reader's Viewpoint

Office worker Kim Dokja is the only person who finished a long web novel about surviving the apocalypse, and when its events come true he uses his knowledge of the plot to change the ending. Goblin-like dokkaebi run deadly scenarios while watching constellations sponsor the survivors.

**Systems:** `quests` ✓, `sponsor-constellations`, `audience-streaming`, `currency` ✓, `regression`, `foreknowledge`, `co-op-party` ✓ (✓ = we have it)

**Characters:** Kim Dokja (bard), Yoo Joonghyuk (warrior), Han Sooyoung (rogue), Jung Heewon (warrior)

**Original take:** Chapter Zero: the city becomes a storybook whose narrator-imps hand out timed chapters to survive, while sky-spirits in the audience gift stickers of power to the readers they like best.

### Overgeared

Down-on-his-luck Shin Young-woo plays the VR game Satisfy as Grid until an S-rank quest makes him Pagma's Successor, a legendary blacksmith class. Forging legendary gear turns him from a nobody into a power in the game.

**Systems:** `vr-game-world`, `crafting`, `class-advancement`, `loot-rarity` ✓, `character-classes` ✓, `quests` ✓, `guilds`, `npc-dialogue` ✓ (✓ = we have it)

**Characters:** Grid (Shin Young-woo) (engineer), Yura (mage), Euphemina (mage), Huroi (bard)

**Original take:** Anvilheart: a clumsy apprentice at a village forge discovers a hidden smith-hero calling, crafts gear that can be worn by any class, and outfits a party that grows from the village to the capital.

### The Greatest Estate Developer

A civil engineering student wakes up inside a fantasy novel as Lloyd Frontera, a lazy noble whose family is drowning in debt. He uses modern engineering, a knight, a giant hamster and magic to build his way out of a grim fate.

**Systems:** `base-building`, `transmigration`, `crafting`, `debt-economy`, `pets`, `npc-dialogue` ✓ (✓ = we have it)

**Characters:** Lloyd Frontera (engineer), Javier Asrahan (knight)

**Original take:** Bridgewright Manor: a young lord with a toolbelt rebuilds a debt-ridden valley one mill, road and bridge at a time, guarded by a stern squire and helped by a round, pocket-stuffing pet.

### Second Life Ranker

Cha Yeon-woo learns his twin brother was betrayed and killed while climbing the Tower of the Sun God, then finds the brother's hidden diary in a pocket watch. Climbing under the name Cain with the diary as his guide, he hunts his brother's killers.

**Systems:** `tower-climb`, `inherited-guidebook`, `leaderboards`, `guilds`, `summons`, `boss-fights` ✓, `dragon-form` (✓ = we have it)

**Characters:** Cha Yeon-woo (Cain) (warrior), Edora (warrior), Nayu, the Martial King (monk), Yvlke (commander), Leonte, the Fist God (monk)

**Original take:** Twin's Ledger: a hero climbs a spire using a sibling's scribbled map-book, whose notes reveal hidden shortcuts on each floor until the pages go blank and the hero must chart the rest alone.

### The Return of the Disaster-Class Hero

The zodiac gods awakened twelve saints to fight destructive creatures called calamities, but a thirteenth, unchosen man also awoke and became the strongest. Betrayed and locked in the Tower of Demons for twenty years, Lee Geon returns far stronger to settle the score with each saint.

**Systems:** `zodiac-champions`, `boss-rush-revenge`, `boss-fights` ✓, `pvp` ✓, `rank-system` (✓ = we have it)

**Characters:** Lee Geon (berserker), The twelve saints (warrior)

**Original take:** The Thirteenth Star: twelve star-sign champions guard the city, and a forgotten thirteenth returns from a sealed tower to challenge each champion's hall in turn, earning that sign's power with every win.

### Leveling with the Gods

After conquering the Tower alongside the Inner Gods, Kim Yuwon loses a final war against the Outer Gods, and the god Kronos sacrifices himself to send him back to the start. He climbs again from the tutorial, using what he knows to build a stronger path.

**Systems:** `tower-climb`, `regression`, `mythic-pantheons`, `co-op-party` ✓, `raids` (✓ = we have it)

**Characters:** Kim Yuwon (warrior), Vulcaro (engineer), Kronos (mage), Chryses (commander)

**Original take:** Rewound Ascent: a fallen champion is sent back to the bottom of a spire where each band of floors belongs to a different family of sky-spirits, and old memories reveal which spirits to befriend this time.

### The Gamer

High-schooler Han Ji-han suddenly sees his life as a video game, with levels, stats, skills and quests. He is drawn into the Abyss, a hidden world of ability users and rival clans, and has to grind his way stronger while keeping up with school.

**Systems:** `leveling` ✓, `stat-points`, `use-based-skills`, `quests` ✓, `instant-dungeon`, `world-hud`, `calm-mind-passive`, `guilds` (✓ = we have it)

**Characters:** Han Ji-han (mage), Shin Seon-il (warrior), Kim Yujin (mage)

**Original take:** Homework Hero: a student whose world shows health bars and quest pop-ups levels up chores, sports and spells by practice, and opens pocket training rooms full of monsters after school.

### Noblesse

Rai, a noble who slept for 820 years, wakes in modern South Korea and enrolls at a high school founded by his loyal servant Frankenstein. Their quiet school days are broken by the Union, a secret organisation that builds modified humans.

**Systems:** `school-hub`, `blood-contract`, `modified-humans`, `co-op-party` ✓, `boss-fights` ✓, `story-chapters` ✓ (✓ = we have it)

**Characters:** Cadis Etrama Di Raizel (Rai) (mage), Frankenstein (warrior), M-21 (berserker)

**Original take:** Night Prefect: an ancient sleeper wakes as the new student at a seaside academy and, with a fussy headmaster-butler, guards classmates from a lab that builds clockwork-enhanced bruisers.

### Hardcore Leveling Warrior

Ethan is the top player of Lucid Adventure, the world's biggest game, until a mysterious player kills him and resets his character to level 1. He fights to win back his place against old enemies, new allies and the game's hidden forces.

**Systems:** `vr-game-world`, `leveling` ✓, `leaderboards`, `pvp` ✓, `loot-rarity` ✓, `co-op-party` ✓ (✓ = we have it)

**Characters:** Ethan (Gong Won-ho), Hardcore Leveling Warrior (warrior)

**Original take:** Back to One: the champion of an arcade realm is ambushed and dropped to rank one, keeping only know-how, and rebuilds with a ragtag party while hunting the masked player who did it.

### Eleceed

Kind-hearted Seo Jiwoo, who has cat-like speed, rescues an injured talking cat that is really Kayden Break, a top Awakener hiding in a cat's body. Kayden trains him, and Jiwoo grows into an Awakener with electricity powers.

**Systems:** `awakening-powers`, `mentors`, `rank-system`, `guilds`, `pets`, `school-hub` (✓ = we have it)

**Characters:** Seo Jiwoo (elementalist), Kayden Break (shapeshifter), Yoo Jiyoung (elementalist), Kartein (cleric)

**Original take:** Sparkpaw: a speedy kid who rescues stray animals is trained by a grumpy legendary hero stuck as a fat housecat, learning to turn speed into crackling lightning dashes.

### SSS-Class Revival Hunter

A Tower full of monsters hands people skill cards, and Kim Gongja gets one that copies the skill of whoever kills him. Killed by the top hunter, he copies a power that sends him back 24 hours whenever he dies, and climbs the Tower by learning from every death.

**Systems:** `regression`, `copy-skill`, `skill-cards`, `tower-climb`, `rank-system`, `summons`, `boss-fights` ✓ (✓ = we have it)

**Characters:** Kim Gongja (rogue), Yoo Soo-ha, the Flame Emperor (elementalist), The Sword Emperor (warrior)

**Original take:** Echo Climber: when a mirror-mage is knocked out the day rewinds and they keep a copy of the move that beat them, so every floor of the spire becomes a puzzle of picking which foe to learn from.

## Japanese manga and light novels

| Work | Kind | Genres | Nearest build today | Links |
| --- | --- | --- | --- | --- |
| **Frieren: Beyond Journey's End** (2020) | manga | story-adventure, jrpg | quest · enchanted-forest · mage | [Wikipedia](https://en.wikipedia.org/wiki/Frieren) · [Image](https://en.wikipedia.org/wiki/File:Frieren_Beyond_Journey%27s_End.jpg) |
| **Sword Art Online** (2009) | light-novel | mmorpg, action-rpg, story-adventure | dungeon-crawl · dragon-dungeon · knight | [Wikipedia](https://en.wikipedia.org/wiki/Sword_Art_Online) · [Image](https://en.wikipedia.org/wiki/File:Sword_Art_Online_light_novel_volume_1_cover.jpg) |
| **That Time I Got Reincarnated as a Slime** (2014) | light-novel | action-rpg, sandbox, story-adventure | quest · enchanted-forest · wildwarden | [Wikipedia](https://en.wikipedia.org/wiki/That_Time_I_Got_Reincarnated_as_a_Slime) · [Image](https://en.wikipedia.org/wiki/File:That_Time_I_Got_Reincarnated_as_a_Slime_light_novel_volume_1_cover.jpg) |
| **Overlord** (2012) *mature* | light-novel | mmorpg, dungeon-crawler, story-adventure | dungeon-crawl · haunted-graveyard · bonecaller | [Wikipedia](https://en.wikipedia.org/wiki/Overlord_(novel_series)) · [Image](https://en.wikipedia.org/wiki/File:Overlord_novel.jpg) |
| **The Rising of the Shield Hero** (2013) *mature* | light-novel | action-rpg, story-adventure | survival · storybook-village · knight | [Wikipedia](https://en.wikipedia.org/wiki/The_Rising_of_the_Shield_Hero) · [Image](https://en.wikipedia.org/wiki/File:The_Rising_of_the_Shield_Hero_light_novel_vol_1.jpg) |
| **Mushoku Tensei: Jobless Reincarnation** (2014) *mature* | light-novel | story-adventure, jrpg | quest · enchanted-forest · mage | [Wikipedia](https://en.wikipedia.org/wiki/Mushoku_Tensei) · [Image](https://en.wikipedia.org/wiki/File:Mushoku_Tensei_1.png) |
| **KonoSuba: God's Blessing on This Wonderful World!** (2013) | light-novel | jrpg, story-adventure | boss-hunt · storybook-village · mage | [Wikipedia](https://en.wikipedia.org/wiki/KonoSuba) · [Image](https://en.wikipedia.org/wiki/File:Kono_Subarashii_Sekai_ni_Shukufuku_o%21_light_novel_volume_1_cover.jpg) |
| **Delicious in Dungeon** (2014) | manga | dungeon-crawler, survival-crafting, story-adventure | dungeon-crawl · dragon-dungeon · knight | [Wikipedia](https://en.wikipedia.org/wiki/Delicious_in_Dungeon) · [Image](https://en.wikipedia.org/wiki/File:Dungeon_Meshi_cover.jpeg) |
| **Shangri-La Frontier** (2017) | web-novel | mmorpg, action-rpg | boss-hunt · haunted-graveyard · shadowblade | [Wikipedia](https://en.wikipedia.org/wiki/Shangri-La_Frontier) · [Image](https://en.wikipedia.org/wiki/File:Shangri-La_Frontier_volume_1.png) |
| **Log Horizon** (2011) | light-novel | mmorpg, story-adventure, life-sim | quest · city-streets · knight | [Wikipedia](https://en.wikipedia.org/wiki/Log_Horizon) · [Image](https://en.wikipedia.org/wiki/File:Log_Horizon_Novel_Cover_Volume_1.png) |
| **Is It Wrong to Try to Pick Up Girls in a Dungeon?** (2013) | light-novel | dungeon-crawler, action-rpg, jrpg | dungeon-crawl · dragon-dungeon · shadowblade | [Wikipedia](https://en.wikipedia.org/wiki/Is_It_Wrong_to_Try_to_Pick_Up_Girls_in_a_Dungeon%3F) · [Image](https://en.wikipedia.org/wiki/File:DanMachi_light_novel_volume_1_cover.jpg) |
| **The Eminence in Shadow** (2018) | light-novel | action-rpg, story-adventure | quest · city-streets · shadowblade | [Wikipedia](https://en.wikipedia.org/wiki/The_Eminence_in_Shadow) · [Image](https://en.wikipedia.org/wiki/File:The_Eminence_in_Shadow_light_novel_volume_1_cover.jpg) |
| **Black Clover** (2015) | manga | action-rpg, story-adventure | quest · storybook-village · mage | [Wikipedia](https://en.wikipedia.org/wiki/Black_Clover) · [Image](https://en.wikipedia.org/wiki/File:Black_Clover%2C_volume_1.jpg) |
| **Fairy Tail** (2006) | manga | action-rpg, story-adventure | quest · storybook-village · mage | [Wikipedia](https://en.wikipedia.org/wiki/Fairy_Tail) · [Image](https://en.wikipedia.org/wiki/File:FairyTail-Volume_1_Cover.jpg) |
| **Magi: The Labyrinth of Magic** (2009) | manga | action-rpg, dungeon-crawler, story-adventure | dungeon-crawl · desert-ruins · mage | [Wikipedia](https://en.wikipedia.org/wiki/Magi:_The_Labyrinth_of_Magic) · [Image](https://en.wikipedia.org/wiki/File:MagiCover01.png) |
| **Berserk** (1989) *mature* | manga | hack-and-slash, action-rpg | boss-hunt · haunted-graveyard · barbarian | [Wikipedia](https://en.wikipedia.org/wiki/Berserk_(manga)) · [Image](https://en.wikipedia.org/wiki/File:Berserk_vol01.png) |

### Frieren: Beyond Journey's End

Years after her hero party beat the Demon King, an elf mage who barely notices decades passing walks north with a young apprentice and a timid warrior. It is an after-the-quest journey about magic as a lifelong craft and about remembering old companions.

**Systems:** `quests` ✓, `story-chapters` ✓, `co-op-party` ✓, `rank-system`, `mana-resource` ✓, `secret-identity`, `conditional-bosses`, `spell-research`, `boss-fights` ✓ (✓ = we have it)

**Characters:** Frieren (mage), Fern (mage), Stark (warrior), Himmel (knight), Heiter (cleric), Eisen (warrior), Sein (cleric)

**Original take:** Embertrail: an ageless lantern-witch and two young apprentices walk a frost road trading favours for forgotten spell scrolls; each boss has spent centuries perfecting a single trick, and players win by hiding their mana and reading the boss's tell.

### Sword Art Online

Ten thousand players are trapped in a full-dive virtual MMO where dying in the game means dying for real, and can only leave by clearing all 100 floors of a floating castle. Later arcs move the same players through other virtual worlds.

**Systems:** `permadeath`, `tower-climb`, `raids`, `guilds`, `pvp` ✓, `combo-attacks`, `monster-taming`, `crafting`, `shops` ✓, `linked-worlds` (✓ = we have it)

**Characters:** Kirito (warrior), Asuna (warrior), Sinon (gunner), Leafa (warrior), Silica (tamer), Lisbeth (worker), Klein (warrior), Heathcliff (knight)

**Original take:** Spire of Hundred Gates: a party climbs a floating tower floor by floor; every floor ends in a raid boss that needs one player drawing its attention while the others heal and strike, and a knocked-out player sits out the rest of the climb.

### That Time I Got Reincarnated as a Slime

An office worker is reborn as a slime that can devour anything and copy its skills, befriends a sealed dragon and gathers monsters into a nation of his own. Neighbouring kingdoms, heroes and demon lords then try to ally with it or destroy it.

**Systems:** `copy-skill`, `ally-evolution`, `class-advancement`, `base-building`, `crafting`, `skill-advisor`, `boss-fights` ✓, `co-op-party` ✓ (✓ = we have it)

**Characters:** Rimuru Tempest (shapeshifter), Benimaru (warrior), Shuna (cleric), Shion (berserker), Souei (assassin), Ranga (shapeshifter), Veldora Tempest (elementalist), Milim Nava (berserker)

**Original take:** Puddle King: you play a little gel creature that swallows foes to borrow their tricks; every creature you befriend and name grows into a stronger form and moves into your growing burrow-town.

### Overlord

When a VR MMO shuts down, its last loyal player is pulled into a new world as his undead overlord avatar, together with his guild's tomb and its now-living NPCs. Mechanics only: the story centres on a villain protagonist and brutal violence.

**Systems:** `dungeon-defense`, `living-npcs`, `guilds`, `tiered-magic`, `summons`, `secret-identity`, `world-items`, `base-building` (✓ = we have it)

**Characters:** Ainz Ooal Gown (necromancer), Albedo (warrior), Shalltear Bloodfallen (warrior), Demiurge (commander), Cocytus (warrior), Aura Bella Fiora (tamer), Sebas Tian (monk), Pandora's Actor (shapeshifter)

**Original take:** Crypt Keeper: you are the friendly keeper of a living crypt; place a guardian on each floor, then raise skeleton helpers between waves as adventurer parties try to reach your throne room.

### The Rising of the Shield Hero

Four young men are summoned as legendary heroes to fight waves of monsters, and the one given only a shield, unable to attack, is framed and shunned. He builds a party of his own and earns trust back. Mechanics only: slavery, abuse and a false-assault plot are central.

**Systems:** `character-classes` ✓, `defend-only-hero`, `waves` ✓, `class-advancement`, `leveling` ✓, `monster-taming`, `mounts`, `rage-form`, `currency` ✓ (✓ = we have it)

**Characters:** Naofumi Iwatani (knight), Raphtalia (warrior), Filo (shapeshifter), Ren Amaki (warrior), Motoyasu Kitamura (spearman), Itsuki Kawasumi (archer)

**Original take:** Bulwark Bearer: one player carries an unbreakable shield and cannot attack while the others do the damage; together they hold a village through timed rift-waves while a hatchling bird ally grows bigger each night.

### Mushoku Tensei: Jobless Reincarnation

A reclusive man is reborn as a baby in a world of swords and sorcery with his memories intact and resolves to live without regrets, following him from childhood magic lessons to old age. Mechanics only: it is criticised for sexualising underage characters.

**Systems:** `silent-casting`, `sword-schools`, `rank-system`, `mentors`, `scatter-event`, `story-chapters` ✓, `mana-resource` ✓, `dream-patron`, `boss-fights` ✓ (✓ = we have it)

**Characters:** Rudeus Greyrat (mage), Roxy Migurdia (mage), Eris Boreas Greyrat (warrior), Ruijerd Superdia (warrior), Sylphiette (mage), Orsted (warrior)

**Original take:** Second Spring: a young spell-student learns to cast without words before anyone else; after a rift scatters the valley's families, the player escorts two friends home across three regions, picking a sword school or spell tutor to train with at each stop.

### KonoSuba: God's Blessing on This Wonderful World!

A shut-in gamer is sent to a fantasy world with MMORPG rules and drags the goddess who mocked him along, then forms a party of brilliant but hopeless misfits. A comedy that turns RPG tropes upside down.

**Systems:** `character-classes` ✓, `classless-generalist`, `one-shot-nuke`, `luck-stat`, `flawed-heroes`, `boss-fights` ✓, `shops` ✓, `respawn-rules` (✓ = we have it)

**Characters:** Kazuma Satou (rogue), Aqua (cleric), Megumin (elementalist), Darkness (paladin), Wiz (mage), Yunyun (mage)

**Original take:** Blunder Squad: four misfit heroes, each with one huge power and one silly flaw (a blaster who can fire only once, a guard who never hits), take odd jobs from a frontier-town board to pay the rent, then face a headless knight.

### Delicious in Dungeon

After a red dragon swallows one of their own, a party with no supplies dives back into the dungeon to save her before she is digested, cooking and eating the monsters they fight along the way. It treats the dungeon as a living ecosystem.

**Systems:** `meal-buffs`, `living-off-the-land`, `dungeon-ecology`, `respawn-rules`, `trap-disarming`, `growing-weapon`, `co-op-party` ✓, `boss-fights` ✓ (✓ = we have it)

**Characters:** Laios Touden (warrior), Marcille Donato (mage), Chilchuck Tims (rogue), Senshi (warrior), Izutsumi (shapeshifter), Falin Touden (cleric), Kabru (warrior)

**Original take:** Stewpot Delve: a party descends a living cave where every beast you beat becomes an ingredient; cook meals between floors for buffs, and learn each creature's weak spot from its recipe card.

### Shangri-La Frontier

A teenager who loves beating broken, glitchy "trash games" finally tries the hit full-dive VR game everyone plays, and his bad-game reflexes carry him into its hidden bosses and secrets. The manga adaptation is the best-known form.

**Systems:** `skill-over-stats`, `conditional-bosses`, `boss-fights` ✓, `hidden-npc-town`, `pvp` ✓, `guilds`, `character-customization` ✓ (✓ = we have it)

**Characters:** Sunraku (rogue), Arthur Pencilgon (assassin), Oikatzo (monk), Animalia (druid)

**Original take:** Moonlit Grave: a hidden guardian wakes only under a full moon; players find a secret burrow-town for gear, then win by learning the guardian's patterns instead of out-levelling it.

### Log Horizon

Thirty thousand Japanese players are pulled into a long-running MMORPG during an expansion update and have to build a society inside it. It focuses on guild politics, economy and town-building more than on survival.

**Systems:** `character-classes` ✓, `multiclassing`, `crafting`, `respawn-rules`, `guilds`, `raids`, `team-buffs` ✓, `npc-society` (✓ = we have it)

**Classes:** Guardian (warrior), Samurai (warrior), Assassin (assassin), Enchanter (mage), Bard (bard), Kannagi (cleric), Summoner (summoner), Shiroe (mage), Naotsugu (warrior), Akatsuki (assassin), Nyanta (rogue), Tohya (warrior)

**Original take:** Hearthguild: players pick a fighting class plus a home trade (cook, mapmaker, merchant); trades change the town, so a cook's meals buff the party, and guild leaders vote on town rules between raids.

### Is It Wrong to Try to Pick Up Girls in a Dungeon?

In a city built over an endless dungeon, gods sponsor adventurers in household factions, and a rookie who is his goddess's only member grows unusually fast. Levels, ability scores and skills are part of the world itself.

**Systems:** `patron-gods`, `leveling` ✓, `growth-skill`, `growing-weapon`, `loot` ✓, `boss-fights` ✓, `porter-role`, `guilds`, `crafting`, `thinking-monsters` (✓ = we have it)

**Characters:** Bell Cranel (rogue), Hestia (cleric), Ais Wallenstein (warrior), Liliruca Arde (worker), Welf Crozzo (engineer), Ryū Lion (rogue)

**Original take:** Patron's Pact: each player is sworn to a small hearth-spirit that turns their deeds into new skills; dive the deepening cave under the town for glowing stones while a porter friend carries the haul, and duel rival lodges for their hall.

### The Eminence in Shadow

A boy obsessed with being the hidden mastermind is reborn in a fantasy world, invents a secret villain cult for his followers to fight, and then finds out the cult is real. A comedy of misunderstandings with a shadow-organization power fantasy.

**Systems:** `secret-identity`, `guilds`, `front-company`, `shape-suits`, `cure-recruits`, `character-customization` ✓ (✓ = we have it)

**Characters:** Cid Kagenou / Shadow (assassin), Alpha (commander), Beta (bard), Gamma (commander), Delta (berserker), Claire Kagenou (warrior)

**Original take:** Two Faces: by day you are the clumsy apprentice nobody notices; by night you lead a masked band in gel armour, and every villager you rescue can join your secret roster.

### Black Clover

In a kingdom where everyone uses magic, an orphan born with none receives a rare grimoire of anti-magic swords and joins the misfit squad of the Magic Knights. He and his wind-prodigy rival race to become the Wizard King.

**Systems:** `growing-weapon`, `elemental-reactions`, `anti-magic`, `guilds`, `rank-system`, `devil-pact`, `team-buffs` ✓ (✓ = we have it)

**Characters:** Asta (berserker), Yuno (elementalist), Noelle Silva (elementalist), Yami Sukehiro (warrior), Luck Voltia (berserker), Mimosa Vermillion (healer), Finral Roulacase (mage), Julius Novachrono (mage)

**Original take:** Leafbook Academy: each player draws a spellbook whose leaf count hints at its power; one player draws a blank book that cancels magic instead, and squads compete on missions for the captain's crest.

### Fairy Tail

A fire-breathing dragon slayer and a celestial wizard join a rowdy wizard guild that takes paid jobs across the kingdom. They fight dark guilds, demons and dragons, with friendship as the guild's core.

**Systems:** `guilds`, `quests` ✓, `rank-system`, `guild-tournament`, `instant-dungeon`, `quick-equip`, `eat-element`, `building-in-combat`, `pets` (✓ = we have it)

**Characters:** Natsu Dragneel (berserker), Lucy Heartfilia (summoner), Gray Fullbuster (elementalist), Erza Scarlet (knight), Wendy Marvell (healer), Happy (shapeshifter)

**Original take:** Lanternhall: a rowdy guild hall with a job board; a flame-eater, a key-caller who summons star creatures and an armour-swapper take paid jobs, lose reward gold for every building they wreck, then enter the yearly guild games.

### Magi: The Labyrinth of Magic

In a world drawn from the Arabian Nights, towering dungeons appear holding djinn and treasure, and a boy magi with a djinn in his flute helps a would-be king conquer them. Conquerors carry their djinn's power in personal items.

**Systems:** `dungeon-portals`, `growing-weapon`, `team-buffs` ✓, `mana-resource` ✓, `kingmaker-mage`, `corruption`, `summons`, `mounts` (✓ = we have it)

**Characters:** Aladdin (mage), Alibaba Saluja (warrior), Morgiana (monk), Sinbad (commander), Judar (elementalist), Hakuryuu Ren (warrior)

**Original take:** Sandspire Vaults: towers rise from the dunes overnight; clear one to bind its genie into a trinket you carry, then make lesser charms that share a slice of its power with your party.

### Berserk

A lone mercenary swordsman hunts the demons, once human, of a dark medieval-style world after the leader he once followed sacrifices their whole company. Mechanics only: extreme gore and sexual violence.

**Systems:** `oversized-weapon`, `cursed-power-armor`, `hunted-mark`, `boss-fights` ✓, `mercenary-warfare`, `co-op-party` ✓, `growing-weapon` (✓ = we have it)

**Characters:** Guts (berserker), Griffith (commander), Casca (warrior), Schierke (mage), Puck (healer), Serpico (rogue), Isidro (rogue)

**Original take:** Iron Vigil (teen-safe take): a lone guard with an oversized blade and a gadget arm escorts a hedge-witch, a sling-thrower and a glowing sprite healer through troll-haunted hills; a fury-armour gives big power, but the witch must calm the wearer before its meter tops out.
