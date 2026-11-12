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

**75 works, 685 characters.** Each character has an element, weapon, stats, look,
signature skills mapped onto our effects, and an original class for the Class forge — write
*"a class like <a character>"* in the forge and it is ready at once, with no AI and our own names.

In the Game builder, write an idea like *"a dungeon game like Solo Leveling"*:
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

<details><summary><b>Characters</b> (10) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Amazon** [img](https://diablo2.blizzard.com/en-us/) | class | archer, ranged-dps | physical · bow | Multiple Shot, Freezing Arrow, Lightning Fury, Valkyrie | 🏹 **Skyspear Huntress** — Volley / Javelin / Grace |
| **Sorceress** [img](https://diablo2.blizzard.com/en-us/) | class | elementalist, caster | ice · staff | Frozen Orb, Blizzard, Meteor, Chain Lightning | 🔮 **Prism Savant** — Rime / Cinder / Tempest |
| **Barbarian** [img](https://diablo2.blizzard.com/en-us/) | class | berserker, melee-dps | physical · axe | Whirlwind, Leap Attack, War Cry, Battle Orders | 🪓 **Highland Ravager** — Steel / Charge / Clan |
| **Necromancer** [img](https://diablo2.blizzard.com/en-us/) | class | necromancer, summoner | dark · wand | Raise Skeleton, Corpse Explosion, Bone Spear, Bone Prison | 💀 **Ossuary Warden** — Ossein / Rot / Hex |
| **Paladin** [img](https://diablo2.blizzard.com/en-us/) | class | paladin, tank | light · sword | Blessed Hammer, Holy Shield, Charge, Fist of the Heavens | 🔨 **Dawnhammer Vowkeeper** — Hallow / Zeal / Aura |
| **Druid** [img](https://diablo2.blizzard.com/en-us/) | class | druid, caster | nature · staff | Werewolf, Tornado, Fissure, Armageddon | 🐺 **Thornwild Caller** — Firmament / Gale / Pack |
| **Assassin** [img](https://diablo2.blizzard.com/en-us/) | class | assassin, melee-dps | lightning · claws | Lightning Sentry, Dragon Claw, Blade Fury, Burst of Speed | 🗡️ **Veilclaw Sentinel** — Snares / Talons / Mind |
| **Warlock** [img](https://diablo2.blizzard.com/en-us/) | class | summoner, summoner | dark · none | Summon Goatman, Bind Demon, Miasma Bolt, Blade Warp | 😈 **Hexbound Pactlord** — Chaos / Eldritch / Pact |
| **Diablo** | boss | elementalist, caster | fire · claws | Fire Nova, Red Lightning Hose, Fire Wall, Bone Prison | 🔥 **Cinderhorn Tyrant** — Inferno / Dread / Fury |
| **Baal** | boss | mage, controller | dark · claws | Hoarfrost, Incineration Nova, Festering Appendage, Vile Effigy | 🦑 **Thronebreaker Wraith** — Ruin / Grasp / Rift |

</details>

### Diablo IV

An open-world dark-fantasy action RPG where a lone Wanderer crosses a demon-haunted land, building a hero from class skills, skill trees and ever-better loot. Random dungeons, shared world events, seasons and PvP zones keep the loot hunt going.

**Systems:** `open-world`, `procedural-dungeons`, `skill-tree` ✓, `loot-rarity` ✓, `class-unique-mechanic`, `world-events`, `pvp` ✓, `mounts`, `seasons`, `character-customization` ✓, `permadeath`, `crafting` (✓ = we have it)

**Classes:** Barbarian (berserker), Sorcerer (elementalist), Druid (shapeshifter), Rogue (rogue), Necromancer (necromancer)

**Original take:** Wildlands of the Thornmother: an open map of five linked biomes the party crosses without loading, where an Emberstorm hour makes one region dangerous and generous for a few minutes, and every class has one personal trick such as a weapon rack, a totem slot or a bone codex.

<details><summary><b>Characters</b> (9) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Barbarian** | class | berserker, melee-dps | physical · axe | Whirlwind, Hammer of the Ancients, Leap, Upheaval | ⚔️ **Ironclan Ravager** — Arsenal / Brawl / Ancestry |
| **Sorcerer** | class | elementalist, caster | ice · staff | Fireball, Frozen Orb, Chain Lightning, Teleport | ❄️ **Stormglass Adept** — Frost / Spark / Pyre |
| **Druid** | class | shapeshifter, melee-dps | earth · mace | Pulverize, Shred, Tornado, Landslide | 🐻 **Barkhide Stormkin** — Earth / Fang / Storm |
| **Rogue** | class | rogue, ranged-dps | physical · bow | Rapid Fire, Penetrating Shot, Twisting Blades, Shadow Step | 🏹 **Duskquiver Stalker** — Marksman / Shadow / Imbue |
| **Necromancer** | class | necromancer, summoner | dark · scythe | Bone Spear, Corpse Explosion, Blood Surge, Bone Prison | ☠️ **Marrowscythe Keeper** — Bone / Blood / Reaping |
| **Spiritborn** | class | monk, melee-dps | nature · polearm | Quill Volley, Crushing Hand, Rake, Soar | 🪶 **Totemhide Vanguard** — Jaguar / Eagle / Gorilla |
| **Paladin** | class | paladin, tank | light · sword | Blessed Shield, Zeal, Falling Star, Aegis | 🛡️ **Haloed Bulwark** — Judgment / Valor / Devotion |
| **Warlock** | class | summoner, summoner | fire · none | Command Fallen, Hell Fracture, Umbral Chains, Nether Step | 🔥 **Brimstone Pactbinder** — Occult / Ritual / Nether |
| **Lilith** | boss | shapeshifter, melee-dps | blood · claws | Wing Combo, Demonic Wave, Minion Summon, Ground Destroyer | 🦇 **Crimson Wingmother** — Wings / Rift / Ascent |

</details>

### Path of Exile 2

A dark-fantasy action RPG (early access since 2024) in which a reprieved convict chases a reborn god-beast across six acts. Builds come from socketing skill gems with support gems and allocating a huge passive tree, then are tested on a near-endless atlas of endgame maps.

**Systems:** `skill-modifiers`, `passive-board`, `class-advancement`, `dodge-roll`, `combo-attacks`, `summons`, `boss-fights` ✓, `endgame-atlas`, `story-chapters` ✓, `character-classes` ✓ (✓ = we have it)

**Classes:** Warrior (warrior), Ranger (archer), Sorceress (elementalist), Mercenary (gunner), Witch (necromancer), Huntress (spearman)

**Original take:** Glyphwright: heroes slot a coloured verb glyph into each skill and adverb glyphs beside it (split, echo, chain), set combos on purpose such as lighting a frost-gas cloud into a blast, then step onto a star map of short boss maps.

<details><summary><b>Characters</b> (9) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Warrior** | class | warrior, melee-dps | physical · hammer | Rolling Slam, Earthquake, Leap Slam, Shield Charge | 🔨 **Anvilborn Bruiser** — Slams / Momentum / Ancestors |
| **Ranger** | class | archer, ranged-dps | lightning · bow | Lightning Arrow, Ice Shot, Rain of Arrows, Escape Shot | 🏹 **Galeshot Strider** — Storm Arrows / Rime / Footwork |
| **Huntress** | class | spearman, melee-dps | physical · spear | Whirling Slash, Explosive Spear, Fangs of Frost, Rake | 🔱 **Azure Lancer** — Spear / Dance / Elements |
| **Sorceress** | class | elementalist, caster | fire · staff | Fireball, Flame Wall, Frostbolt, Ice Nova | ☄️ **Emberfrost Oracle** — Flame / Frost / Storm |
| **Mercenary** | class | gunner, ranged-dps | physical · crossbow | Fragmentation Rounds, Permafrost Bolts, Galvanic Shards, High Velocity Rounds | 🎯 **Boltcaster Sellsword** — Ammunition / Ordnance / Tactics |
| **Monk** | class | monk, melee-dps | lightning · staff | Falling Thunder, Ice Strike, Tempest Flurry, Tempest Bell | 🔔 **Bellstrike Ascetic** — Thunder / Frost / Resonance |
| **Druid** | class | shapeshifter, melee-dps | nature · staff | Volcano, Thunderstorm, Entangle, Maul | 🐉 **Wyrmbear Shifter** — Wilds / Sky / Beast |
| **Witch** | class | necromancer, summoner | dark · wand | Skeletal Warrior, Contagion, Essence Drain, Bone Cage | 🦴 **Gravecloth Hexer** — Plague / Osteomancy / Graves |
| **Count Geonor** | boss | shapeshifter, melee-dps | physical · sword | 3 Sword Slash, Sword Blast, Running Sword Thrust, Shapeshift | 🌕 **Moonfang Duelist** — Blade / Dance / Beast |

</details>

### Torchlight II

A bright, cartoon-styled action RPG where one of four heroes follows a corrupted alchemist across three acts of overland zones and random dungeons, with a pet at their side. It added co-op for up to six players and strong modding tools.

**Systems:** `pets`, `fishing`, `procedural-dungeons`, `day-night`, `co-op-party` ✓, `per-player-loot`, `level-editor` ✓, `difficulty-tiers`, `character-customization` ✓, `skill-tree` ✓, `pvp` ✓ (✓ = we have it)

**Classes:** Berserker (berserker), Embermage (elementalist), Engineer (engineer), Outlander (ranger)

**Original take:** Lantern & Hound: every player brings a pet that fights beside them and trots back to town to sell junk, and the friends fish in ponds for snacks that briefly change their pet into something bigger.

<details><summary><b>Characters</b> (4) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Berserker** | class | berserker, melee-dps | physical · claws | Eviscerate, Frost Breath, Shadow Burst, Stormclaw | 🐺 **Packfang Howler** — Hunter / Tundra / Shadow |
| **Embermage** | class | elementalist, caster | fire · staff | Magma Spear, Prismatic Bolt, Shocking Burst, Thunder Locus | 🔥 **Six-Ember Conjurer** — Inferno / Storm / Frost |
| **Engineer** | class | engineer, builder | fire · hammer | Flame Hammer, Healing Bot, Blast Cannon, Spider Mines | 🔧 **Gearwright Smasher** — Blitz / Construction / Artillery |
| **Outlander** | class | ranger, ranged-dps | poison · gun | Glaive Throw, Rapid Fire, Blade Pact, Tangling Shot | 🌀 **Glaive Nomad** — Warfare / Lore / Sigil |

</details>

### Grim Dawn

A grim, Victorian-flavoured action RPG set in a world nearly wiped out by a war between two otherworldly races, built on the Titan Quest engine. Its depth comes from pairing two masteries into one class, a constellation map of extra powers, and factions that reward or hunt you.

**Systems:** `multiclassing`, `passive-board`, `faction-reputation`, `crafting`, `loot-rarity` ✓, `difficulty-tiers`, `permadeath`, `co-op-party` ✓, `pvp` ✓, `waves` ✓, `summons` (✓ = we have it)

**Classes:** Soldier (warrior), Demolitionist (gunner), Occultist (summoner), Nightblade (assassin), Arcanist (mage), Shaman (druid), Oathkeeper (paladin)

**Original take:** Twin Paths: at level 10 every hero adds a second discipline from another school (say Hearthguard plus Stormcaller), lights forgotten star-shrines to fill a sky map of bonus powers, and earns favour with rival camps whose enemies send named hunters after you.

<details><summary><b>Characters</b> (10) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Soldier** [img](https://www.grimdawn.com/guide/masteries/soldier/) | class | warrior, tank | physical · sword | Cadence, Forcewave, Menhir's Will, Field Command | 🛡️ **Bastion Linebreaker** — Arms / Command / Endurance |
| **Demolitionist** [img](https://www.grimdawn.com/guide/masteries/demolitionist/) | class | gunner, ranged-dps | fire · gun | Stun Jacks, Blackwater Cocktail, Canister Bomb, Thermite Mine | 💣 **Powderkeg Sapper** — Explosives / Traps / Firearms |
| **Occultist** [img](https://www.grimdawn.com/guide/masteries/occultist/) | class | summoner, summoner | poison · none | Dreeg's Evil Eye, Summon Familiar, Bloody Pox, Possession | 👁️ **Witchcoven Seer** — Curses / Familiars / Rites |
| **Nightblade** [img](https://www.grimdawn.com/guide/masteries/nightblade/) | class | assassin, melee-dps | dark · dual-blades | Phantasmal Blades, Veil of Shadow, Pneumatic Burst, Blade Barrier | 🗡️ **Umbral Edgewalker** — Shadow / Blades / Breath |
| **Arcanist** [img](https://www.grimdawn.com/guide/masteries/arcanist/) | class | mage, caster | arcane · staff | Panetti's Replicating Missile, Olexra's Flash Freeze, Albrecht's Aether Ray, Devastation | ✨ **Aetherfold Scholar** — Missiles / Ray / Cataclysm |
| **Shaman** [img](https://www.grimdawn.com/guide/masteries/shaman/) | class | druid, melee-dps | lightning · hammer | Primal Strike, Wind Devil, Wendigo Totem, Summon Briarthorn | ⚡ **Thundergrove Totemist** — Storm / Wilds / Ritual |
| **Inquisitor** [img](https://www.grimdawn.com/guide/masteries/inquisitor/) | class | gunner, ranged-dps | fire · gun | Flames of Ignaffar, Word of Renewal, Rune of Hagarrad, Storm Spread | 🔥 **Runewarden Marksman** — Relics / Runes / Firearms |
| **Necromancer** [img](https://www.grimdawn.com/guide/masteries/necromancer/) | class | necromancer, summoner | dark · none | Raise Skeletons, Ravenous Earth, Siphon Souls, Reap Spirit | 💀 **Gravebloom Reaver** — Earth / Soul / Bone |
| **Oathkeeper** [img](https://www.grimdawn.com/guide/masteries/oathkeeper/) | class | paladin, tank | light · shield | Aegis of Menhir, Eye of Reckoning, Smite, Summon Guardian of Empyrion | 🛡️ **Sunshield Zealot** — Shield / Reckoning / Vow |
| **Berserker** [img](https://www.grimdawn.com/guide/masteries/berserker/) | class | shapeshifter, melee-dps | ice · dual-blades | Bloodfangs, Onslaught, Wereraven, Winds of Asterkarn | 🦅 **Frostpelt Marauder** — Fangs / Wings / Winds |

</details>

### Lost Ark

A Korean isometric MMO with fast, combo-driven action combat across continents and islands linked by sailing. Characters pick a class family and then an advanced class, and the endgame centres on timed dungeons and multi-phase raids.

**Systems:** `character-classes` ✓, `combo-attacks`, `skill-modifiers`, `class-unique-mechanic`, `raids`, `dungeon-portals`, `sailing`, `housing`, `resource-gathering`, `pvp` ✓, `daily-quests`, `tower-climb` (✓ = we have it)

**Classes:** Berserker (berserker), Gunlancer (knight), Sorceress (elementalist), Bard (bard), Shadowhunter (shapeshifter)

**Original take:** Tidecall Isles: sail a small crewed boat between island hubs, clear a timed rift run where filling the bar opens the next floor, then gather eight friends for a three-phase colossus; every skill offers a pick-one-of-three tweak at ranks 4, 7 and 10.

<details><summary><b>Characters</b> (11) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Berserker** [img](https://www.playlostark.com/en-us/game/classes/berserker) | class | berserker, melee-dps | physical · greatsword | Whirlwind, Shoulder Charge, Red Dust, Mountain Crash | ⚔️ **Ruinblade Colossus** — Cleave / Advance / Fury |
| **Gunlancer** [img](https://www.playlostark.com/en-us/game/classes/gunlancer) | class | knight, tank | physical · spear | Shout of Hatred, Guardian's Thunderbolt, Hook Chain, Counter Gunlance | 🛡️ **Bulwark Lancebearer** — Bastion / Lance / Thunder |
| **Paladin** [img](https://www.playlostark.com/en-us/game/classes/paladin) | class | paladin, support | light · sword | Holy Explosion, Sword of Justice, Godsent Law, Holy Protection | ✝️ **Lumenvow Herald** — Scripture / Judgment / Blessing |
| **Wardancer** [img](https://www.playlostark.com/en-us/game/classes/wardancer) | class | monk, melee-dps | wind · fists | Triple Fist, Moon Flash Kick, Wind's Whisper, Esoteric Skill: Call of the Wind God | 🌪️ **Galefist Dancer** — Fists / Esoteric / Harmony |
| **Sorceress** [img](https://www.playlostark.com/en-us/game/classes/sorceress) | class | elementalist, caster | fire · staff | Blaze, Explosion, Lightning Bolt, Punishing Strike | ☄️ **Starfall Pyromancer** — Fire / Lightning / Arcana |
| **Summoner** [img](https://www.playlostark.com/en-us/game/classes/summoner) | class | summoner, summoner | nature · staff | Ancient Spear, Water Elemental, Bagron's Wrath, Pauru | 🌊 **Spiritbond Invoker** — Ancients / Currents / Kin |
| **Bard** [img](https://www.playlostark.com/en-us/game/classes/bard) | class | bard, support | light · instrument | Sound Shock, Heavenly Tune, Sonic Vibration, Stigma | 🎵 **Harpsong Warder** — Melody / Harmony / Crescendo |
| **Deathblade** [img](https://www.playlostark.com/en-us/game/classes/deathblade) | class | assassin, melee-dps | physical · dual-blades | Surprise Attack, Blade Dance, Wind Cut, Maelstrom | 🗡️ **Tri-Edge Phantom** — Edges / Gale / Verdict |
| **Shadowhunter** [img](https://www.playlostark.com/en-us/game/classes/shadowhunter) | class | shapeshifter, melee-dps | dark · dual-blades | Demonic form, Cruel Cutter, Howl, Leaping Blow | 👹 **Fiendclaw Ravager** — Blades / Demon / Blood |
| **Sharpshooter** [img](https://www.playlostark.com/en-us/game/classes/sharpshooter) | class | archer, ranged-dps | physical · bow | Arrow Shower, Atomic Arrow, Charged Shot, Claymore Mine | 🦅 **Hawkeye Strider** — Arrows / Devices / Hawk |
| **Valtan** | boss | berserker, melee-dps | dark · axe | Charge, Triple Axe Swing, Jump and Spin, Stage Break | 🪓 **Patchwork Warbeast** — Axe / Brute / Ruin |

</details>

### World of Warcraft

The long-running fantasy MMO of a world split between two factions, where players quest, learn professions, run group dungeons and raids, and battle each other. Eleven expansions since 2004 have added lands, classes and systems.

**Systems:** `factions`, `character-classes` ✓, `skill-tree` ✓, `quests` ✓, `crafting`, `guilds`, `raids`, `pvp` ✓, `trading`, `mounts`, `rested-xp`, `corpse-run` (✓ = we have it)

**Classes:** Warrior (warrior), Mage (mage), Hunter (ranger), Druid (druid)

**Original take:** Two Banners: players join the Dawn camp or the Dusk camp, level through quest chains that earn first a ride and later a flying ride, and gather each week for a four-wing raid against an ember-crowned giant.

<details><summary><b>Characters</b> (11) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Warrior** [img](https://worldofwarcraft.blizzard.com/en-us/game/classes/warrior) | class | warrior, tank | physical · sword | Charge, Heroic Strike, Thunder Clap, Whirlwind | ⚔️ **Ironvanguard Champion** — Arms / Protection / Fury |
| **Paladin** [img](https://worldofwarcraft.blizzard.com/en-us/game/classes/paladin) | class | paladin, tank | light · mace | Holy Light, Consecration, Hammer of Justice, Hammer of Wrath | 🔨 **Sanctified Gavel** — Holy / Justice / Devotion |
| **Hunter** [img](https://worldofwarcraft.blizzard.com/en-us/game/classes/hunter) | class | ranger, ranged-dps | physical · bow | Tame Beast, Multi-Shot, Aimed Shot, Freezing Trap | 🏹 **Wildbond Tracker** — Marksmanship / Survival / Beast Bond |
| **Rogue** [img](https://worldofwarcraft.blizzard.com/en-us/game/classes/rogue) | class | rogue, melee-dps | poison · dagger | Stealth, Sinister Strike, Eviscerate, Kidney Shot | 🗡️ **Hushstep Knave** — Subtlety / Assassination / Outlaw |
| **Priest** [img](https://worldofwarcraft.blizzard.com/en-us/game/classes/priest) | class | cleric, healer | light · staff | Power Word: Shield, Renew, Prayer of Healing, Shadow Word: Pain | 🕯️ **Dawnchant Confessor** — Holy / Shadow / Discipline |
| **Shaman** [img](https://worldofwarcraft.blizzard.com/en-us/game/classes/shaman) | class | elementalist, caster | lightning · mace | Lightning Bolt, Chain Lightning, Earth Shock, Searing Totem | ⚡ **Totemspark Seer** — Elemental / Totems / Earth |
| **Mage** [img](https://worldofwarcraft.blizzard.com/en-us/game/classes/mage) | class | mage, ranged-dps | ice · staff | Frostbolt, Fireball, Blizzard, Frost Nova | 🔮 **Spellwright Magister** — Frost / Fire / Arcane |
| **Warlock** [img](https://worldofwarcraft.blizzard.com/en-us/game/classes/warlock) | class | summoner, caster | dark · staff | Shadow Bolt, Corruption, Summon Imp, Rain of Fire | 😈 **Felpact Cabalist** — Affliction / Destruction / Demonology |
| **Druid** [img](https://worldofwarcraft.blizzard.com/en-us/game/classes/druid) | class | druid, healer | nature · staff | Bear Form, Cat Form, Entangling Roots, Moonfire | 🌿 **Grovekeeper Shifter** — Balance / Feral / Restoration |
| **Death Knight** [img](https://worldofwarcraft.blizzard.com/en-us/game/classes/death-knight) | class | knight, tank | dark · greatsword | Frost Presence, Blood Presence, Unholy Presence, Ghoul | 🗡️ **Runeblade Revenant** — Frost / Blood / Unholy |
| **Arthas Menethil** [img](https://en.wikipedia.org/wiki/File:Arthas_Menethil.png) | boss | necromancer, commander | ice · greatsword | Necrotic Plague, Summon Val'kyr, Defile, Remorseless Winter | 👑 **Frostcrown Tyrant** — Winter / Plague / Throne |

</details>

### Final Fantasy XIV

Square Enix's story-heavy fantasy MMO, rebuilt in 2013 after a failed launch, where one character can learn every combat, crafting and gathering job just by changing weapons. Players clear dungeons, giant elemental 'primal' trials and raids as tank, healer or damage.

**Systems:** `gear-defines-build`, `class-advancement`, `crafting`, `world-events`, `raids`, `ai-party-members`, `ultimate-ability`, `guilds`, `housing`, `pvp` ✓, `story-chapters` ✓, `daily-quests` (✓ = we have it)

**Classes:** Paladin (paladin), Black Mage (elementalist), White Mage (cleric), Dragoon (spearman), Summoner (summoner), Ninja (assassin)

**Original take:** Toolbelt Hero: one hero becomes a lancer, a healer or a tinker just by picking up a different tool, each tool with its own level, and three friends fight giant elemental spirits while a shared team meter fills into one combined strike.

<details><summary><b>Characters</b> (12) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Paladin** [img](https://na.finalfantasyxiv.com/jobguide/paladin/) | class | paladin, tank | light · sword | Fast Blade, Intervene, Holy Spirit, Divine Veil | 🛡️ **Bastion Vowkeeper** — Shieldwork / Vanguard / Radiance |
| **Warrior** [img](https://na.finalfantasyxiv.com/jobguide/warrior/) | class | berserker, tank | physical · axe | Heavy Swing, Onslaught, Fell Cleave, Decimate | 🪓 **Stormhide Reaver** — Onrush / Cleave / Fury |
| **White Mage** [img](https://na.finalfantasyxiv.com/jobguide/whitemage/) | class | cleric, healer | light · staff | Stone, Aero, Cure, Medica | 🌼 **Lilyward Chanter** — Judgement / Garden / Sanctum |
| **Astrologian** [img](https://na.finalfantasyxiv.com/jobguide/astrologian/) | class | cleric, healer | arcane · orb | Malefic, Combust, Benefic, Astral Draw | 🔮 **Orrery Seer** — Constellation / Fortune / Horizon |
| **Dragoon** [img](https://na.finalfantasyxiv.com/jobguide/dragoon/) | class | spearman, melee-dps | physical · polearm | True Thrust, Jump, Dragonfire Dive, Geirskogul | 🐉 **Skyfall Lancer** — Ascent / Spearline / Heart |
| **Monk** [img](https://na.finalfantasyxiv.com/jobguide/monk/) | class | monk, melee-dps | physical · fists | Bootshine, Thunderclap, Arm of the Destroyer, Riddle of Fire | 👊 **Ember Palm Ascetic** — Forms / Breath / Step |
| **Ninja** [img](https://na.finalfantasyxiv.com/jobguide/ninja/) | class | assassin, melee-dps | physical · dual-blades | Spinning Edge, Hide, Shukuchi, Katon | 🗡️ **Sigilknife Shade** — Signs / Earthwork / Shadow |
| **Bard** [img](https://na.finalfantasyxiv.com/jobguide/bard/) | class | bard, ranged-dps | physical · bow | Heavy Shot, Venomous Bite, Rain of Death, Mage's Ballad | 🎵 **Lyric Fletcher** — Volley / Songs / Draw |
| **Black Mage** [img](https://na.finalfantasyxiv.com/jobguide/blackmage/) | class | elementalist, caster | fire · staff | Fire, Blizzard, Thunder, Flare | 🔥 **Ashglass Sorcerer** — Pyre / Rime / Skyfire |
| **Summoner** [img](https://na.finalfantasyxiv.com/jobguide/summoner/) | class | summoner, summoner | arcane · tome | Ruin, Summon Carbuncle, Summon Ifrit, Summon Garuda | 💎 **Gemcaller Conjurer** — Ruby / Topaz / Emerald |
| **Ifrit** | boss | berserker, melee-dps | fire · claws | Incinerate, Vulcan Burst, Eruption, Infernal Nail | 🔥 **Cinder Horn Tyrant** — Blaze / Crater / Wrath |
| **Titan** | boss | warrior, tank | earth · fists | Stomp, Leap and crash, Landslide, Rock tomb | 🪨 **Bedrock Colossus** — Tremor / Fault / Prison |

</details>

### Guild Wars 2

A fantasy MMO where open-world dynamic events replace most quest-giving and action combat with dodging and weapon-based skill bars needs no dedicated healer. It adds large server-versus-server warfare, account-wide masteries such as gliding and mounts, and level scaling that keeps every zone relevant.

**Systems:** `world-events`, `quests` ✓, `dodge-roll`, `downed-revive`, `weapon-skill-bar`, `no-required-healer`, `level-scaling`, `pvp` ✓, `crafting`, `mounts`, `raids`, `trading` (✓ = we have it)

**Classes:** Warrior (warrior), Guardian (paladin), Elementalist (elementalist), Necromancer (necromancer), Ranger (ranger), Thief (rogue), Engineer (engineer)

**Original take:** Ripple Meadows: there is no quest list, just things happening nearby (a burning mill, a sheep stampede, a giant toad) that anyone can pitch in on; picking up a different weapon swaps your first five moves, and a knocked-down hero keeps fighting from the ground until a friend lifts them.

<details><summary><b>Characters</b> (9) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Warrior** [img](https://www.guildwars2.com/en/the-game/professions/warrior/) | class | warrior, melee-dps | physical · greatsword | Hundred Blades, Whirlwind Attack, Bull's Charge, Eviscerate | ⚔️ **Adrenal Bladesman** — Greatblade / Burst / Grit |
| **Guardian** [img](https://www.guildwars2.com/en/the-game/professions/guardian/) | class | paladin, support | light · greatsword | Whirling Wrath, Leap of Faith, Binding Blade, Wall of Reflection | 🛡️ **Aegis Warden** — Zeal / Valor / Radiance |
| **Revenant** | class | warrior, melee-dps | arcane · sword | Unrelenting Assault, Phase Traversal, Surge of the Mists, Project Tranquility | 🌫️ **Mistbound Channeler** — Echo of Blades / Echo of Stone / Echo of Shadow |
| **Engineer** [img](https://www.guildwars2.com/en/the-game/professions/engineer/) | class | engineer, builder | tech · rifle | Blunderbuss, Net Shot, Overcharged Shot, Jump Shot | 🔧 **Gearwright Tinker** — Rifle / Kits / Turrets |
| **Ranger** [img](https://www.guildwars2.com/en/the-game/professions/ranger/) | class | ranger, ranged-dps | nature · bow | Rapid Fire, Barrage, Point-Blank Shot, Healing Spring | 🏹 **Wildbond Stalker** — Longbow / Wilds / Companion |
| **Thief** [img](https://www.guildwars2.com/en/the-game/professions/thief/) | class | rogue, melee-dps | dark · dagger | Backstab, Heartseeker, Death Blossom, Cloak and Dagger | 🗡️ **Duskpurse Cutthroat** — Daggerwork / Shadows / Venom |
| **Elementalist** [img](https://www.guildwars2.com/en/the-game/professions/elementalist/) | class | elementalist, caster | arcane · staff | Attunement, Fire Grab, Lava Font, Churning Earth | 🌪️ **Fourfold Attuner** — Flame / Stone & Tide / Gale |
| **Mesmer** [img](https://www.guildwars2.com/en/the-game/professions/mesmer/) | class | mage, controller | arcane · greatsword | Mirror Blade, Phantasmal Berserker, Mind Wrack, Blink | 🪞 **Prism Deceiver** — Mirrors / Shatter / Time |
| **Necromancer** [img](https://www.guildwars2.com/en/the-game/professions/necromancer/) | class | necromancer, summoner | dark · staff | Life Blast, Mark of Blood, Well of Suffering, Summon Flesh Golem | 💀 **Gravebloom Reaper** — Shroud / Marks / Path |

</details>

### MapleStory

A free-to-play 2D side-scrolling MMO where cartoon heroes hop across platforms fighting monsters, advance through job tiers and team up for bosses. It is known for its huge roster of class branches and its player-run Free Market.

**Systems:** `class-advancement`, `character-classes` ✓, `side-scrolling`, `co-op-party` ✓, `guilds`, `trading`, `crafting`, `boss-fights` ✓, `minigames`, `pets`, `pvp` ✓, `combo-attacks` (✓ = we have it)

**Classes:** Magician (mage), Bowman (archer), Thief (assassin), Warrior (warrior), Evan (tamer), Mechanic (engineer)

**Original take:** Leaf Isles: every hero starts as a Sprout, picks one of five paths at level 10 and one of two or three specialities at level 30, and a town plaza lets players open little stalls to sell their finds to friends.

<details><summary><b>Characters</b> (11) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Crusader** | class | warrior, melee-dps | physical · sword | Power Strike, Slash Blast, Rush, Rage | ⚔️ **Tally Blade Vanguard** — Momentum / Combo / Battlecry |
| **White Knight** | class | paladin, tank | lightning · hammer | Threaten, Power Guard, Lightning Charge, Fire Charge | ⚡ **Tempered Bulwark** — Charges / Frost / Shield |
| **Dragon Knight** | class | spearman, melee-dps | physical · spear | Piercing Crusher, Dragon Fury, Dragon Roar, Hyper Body | 🐲 **Wyrmblood Pikeman** — Pike / Blood / Reach |
| **Fire/Poison Mage** | class | elementalist, caster | fire · wand | Fire Arrow, Poison Breath, Poison Mist, Explosion | ☠️ **Venom Ember Arcanist** — Flame / Toxin / Arcana |
| **Ice/Lightning Mage** | class | elementalist, caster | ice · wand | Cold Beam, Thunder Bolt, Ice Strike, Thunder Spear | ❄️ **Rimebolt Arcanist** — Frost / Volt / Arcana |
| **Priest** | class | cleric, healer | light · wand | Holy Arrow, Heal, Bless, Shining Ray | ✨ **Halo Mender** — Radiance / Blessing / Summons |
| **Ranger** | class | archer, ranged-dps | physical · bow | Arrow Blow, Arrow Bomb, Arrow Rain, Inferno | 🏹 **Hawkeye Fletcher** — Volley / Payload / Wilds |
| **Sniper** | class | archer, ranged-dps | physical · crossbow | Iron Arrow, Arrow Eruption, Blizzard, Golden Eagle | 🎯 **Boltline Sharpshot** — Pierce / Ground / Eyrie |
| **Hermit** | class | assassin, ranged-dps | dark · thrown | Lucky Seven, Avenger, Shadow Web, Shadow Partner | ✴️ **Starthrow Nightshade** — Stars / Shadow / Echo |
| **Chief Bandit** | class | rogue, melee-dps | physical · dagger | Double Stab, Savage Blow, Steal, Assaulter | 💰 **Coinburst Cutpurse** — Daggers / Coin / Gang |
| **Zakum** | boss | summoner, summoner | fire · none | Arm Smash Down, Platform Summon, Platform Summon Handclap, Summons Mobs | 🗿 **Eightfold Idol** — Many Arms / Idol / Cavern |

</details>

### Ragnarok Online

A Korean MMO based on a Norse-myth manhwa, with 2D sprite heroes in 3D maps and a branching job tree from Novice up to transcendent and third jobs. Players tame cute monster pets, slot monster cards into gear, run street stalls and besiege guild castles.

**Systems:** `class-advancement`, `rebirth`, `stat-points`, `monster-cards`, `gear-upgrading`, `monster-taming`, `trading`, `guilds`, `castle-siege`, `elemental-reactions`, `pvp` ✓, `quests` ✓ (✓ = we have it)

**Classes:** Swordman (warrior), Mage (mage), Archer (archer), Acolyte (cleric), Thief (rogue), Merchant (worker)

**Original take:** Jelly Fields: a Fledgling picks one of six trades at job level 10, cards dropped by jellies and goblins slot into gear forever, and every weekend clubs race to crack the crystal heart inside a hilltop keep.

<details><summary><b>Characters</b> (12) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Knight** | class | knight, melee-dps | physical · spear | Bash, Bowling Bash, Pierce, Brandish Spear | 🐎 **Mounted Lancebearer** — Lance / Cavalry / Reach |
| **Crusader** | class | paladin, tank | light · sword | Holy Cross, Grand Cross, Shield Boomerang, Smite | ✝️ **Sunsworn Shieldbearer** — Cross / Shield / Devotion |
| **Wizard** | class | elementalist, caster | arcane · staff | Fire Bolt, Jupitel Thunder, Storm Gust, Heaven's Drive | 🌩️ **Tempest Archon** — Sky / Rime & Ember / Earth |
| **Sage** | class | mage, support | arcane · tome | Earth Spike, Hindsight, Endow Blaze, Volcano | 📖 **Lorekeeper Enchanter** — Endowments / Lands / Study |
| **Hunter** | class | ranger, ranged-dps | physical · bow | Double Strafe, Arrow Shower, Blitz Beat, Ankle Snare | 🦅 **Falconer Trapwright** — Bowcraft / Traps / Falcon |
| **Bard** | class | bard, support | none · instrument | Melody Strike, Impressive Riff, Song of Lutie, Magic Strings | 🎻 **Lute Troubadour** — Strings / Songs / Encore |
| **Priest** | class | cleric, healer | light · mace | Holy Light, Heal, Kyrie Eleison, Sanctuary | 🙏 **Sanctum Vicar** — Exorcism / Sanctuary / Litany |
| **Monk** | class | monk, melee-dps | physical · fists | Raging Trifecta Blow, Throw Spirit Sphere, Snap, Root | 🥋 **Fivefold Orb Pugilist** — Combo / Spheres / Discipline |
| **Assassin** | class | assassin, melee-dps | poison · claws | Envenom, Sonic Blow, Grimtooth, Cloaking | 🗡️ **Katar Nightstalker** — Blades / Venom / Shadow |
| **Blacksmith** | class | worker, melee-dps | physical · axe | Mammonite, Cart Revolution, Adrenaline Rush, Power Thrust | ⚒️ **Anvil Coinbreaker** — Forge / Cart / Fervor |
| **Baphomet** | boss | berserker, melee-dps | dark · scythe | Brandish Spear, Earthquake, Lord of Vermilion, Dark Breath | 😈 **Horned Reaper Tyrant** — Scythe / Calamity / Abyss |
| **Osiris** | boss | necromancer, summoner | dark · none | Summon Slave, Stone Curse, Quagmire, Venom Dust | ⚱️ **Tomb Sovereign** — Curses / Tomb / Dynasty |

</details>

### Elden Ring

FromSoftware's open-world take on its demanding soulslike formula, with worldbuilding by George R. R. Martin. An exiled Tarnished rides a spectral steed across the Lands Between, beating demigods to restore a shattered ring.

**Systems:** `open-world`, `mounts`, `checkpoint-rest`, `corpse-run`, `stat-points`, `skill-modifiers`, `summons`, `parry-block`, `dodge-roll`, `boss-fights` ✓, `co-op-party` ✓, `pvp` ✓ (✓ = we have it)

**Classes:** Astrologer (mage), Prophet (cleric), Confessor (paladin), Vagabond (knight), Samurai (warrior)

**Original take:** Gale Steed Wilds: ride a ghost-goat that double-jumps between ledges across six open biomes, rest at glowing lanterns to level up and refill flasks, call a bottle of spirit helpers at stone markers, and topple six crowned wardens in any order.

<details><summary><b>Characters</b> (11) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Vagabond** | class | knight, tank | physical · sword | Square Off, Charge Forth, Parry | 🛡️ **Wayfarer Halberdier** — Longblade / Polearm / Grit |
| **Warrior** | class | berserker, melee-dps | physical · dual-blades | Spinning Slash, Parry | 🌙 **Twin Crescent Dancer** — Spin / Footwork / Spirit |
| **Hero** | class | berserker, melee-dps | physical · axe | Wild Strikes, Parry | 🪓 **Axebound Champion** — Frenzy / Might / Pride |
| **Bandit** | class | rogue, melee-dps | physical · dagger | Quickstep, Barrage, Buckler Parry | 🗡️ **Backstreet Skulker** — Knife / Bow / Dirty Tricks |
| **Astrologer** | class | mage, caster | arcane · staff | Glintstone Pebble, Glintstone Arc | ✨ **Glint Scholar** — Glint / Stars / Sigil |
| **Prophet** | class | cleric, healer | fire · spear | Heal, Catch Flame, Impaling Thrust | 🔥 **Omen Kindler** — Prophecy / Mercy / Spear |
| **Samurai** | class | warrior, melee-dps | physical · katana | Unsheathe, Mighty Shot | ⚔️ **Reedland Blademaster** — Draw / Bow / Spirit |
| **Prisoner** | class | mage, melee-dps | arcane · sword | Impaling Thrust, Magic Glintblade | 🎭 **Ironmask Spellsword** — Thrust / Sigils / Chains |
| **Confessor** | class | paladin, melee-dps | light · sword | Urgent Heal, Assassin's Approach, Square Off | 🕯️ **Hushed Penitent** — Hush / Rite / Sword |
| **Margit, the Fell Omen** | boss | warrior, melee-dps | light · staff | Staff Swing, Dagger Throw, Leaping Stab, Hammer Slam | 🔨 **Bridge Gatewarden** — Cane / Spectral / Dread |
| **Malenia, Blade of Miquella** | boss | warrior, melee-dps | poison · katana | Healing strikes, Rapid Prosthesis Slices, Lunging Grab, Waterfowl Dance | 🌺 **Rotbloom Duelist** — Dance / Bloom / Prosthesis |

</details>

### Dark Souls III

The last Dark Souls, where an Unkindled warrior returns runaway Lords of Cinder to their thrones as the First Flame fades. Interconnected levels, bonfire checkpoints, stamina-based combat and punishing bosses define it.

**Systems:** `checkpoint-rest`, `corpse-run`, `stamina`, `dodge-roll`, `parry-block`, `mana-resource` ✓, `potions` ✓, `skill-modifiers`, `boss-fights` ✓, `co-op-party` ✓, `pvp` ✓, `shortcuts` (✓ = we have it)

**Classes:** Sorcerer (mage), Pyromancer (elementalist), Cleric (cleric), Assassin (assassin), Knight (knight), Herald (paladin)

**Original take:** Lantern Steps: a tight castle gauntlet where every lantern you light becomes your respawn point and opens a shortcut door back to it, dropped sparkles wait where you fell for one retry, and each warden boss shows a clear tell to roll through.

<details><summary><b>Characters</b> (11) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Knight** | class | knight, tank | physical · sword | Stance, Parry | 🛡️ **Cindersworn Guard** — Blade / Shield / Ember |
| **Mercenary** | class | berserker, melee-dps | physical · dual-blades | Spin Slash, Parry | ⚔️ **Paired Edge Sellsword** — Twin / Contract / Grit |
| **Warrior** | class | berserker, melee-dps | physical · axe | Warcry, Parry | 🪓 **Northhelm Axeman** — Axe / Spirit / Charge |
| **Herald** | class | paladin, tank | light · spear | Shield Splitter, Heal Aid, Parry | ✝️ **Kiteshield Evangel** — Spear / Shield / Miracle |
| **Thief** | class | rogue, melee-dps | blood · dagger | Quickstep, Rapid Fire | 🗡️ **Bleedknife Prowler** — Knife / Bow / Lowlife |
| **Assassin** | class | assassin, melee-dps | physical · sword | Spook, Parry | 🤫 **Hushstep Lancer** — Point / Hush / Trick |
| **Sorcerer** | class | mage, caster | arcane · staff | Soul Arrow, Heavy Soul Arrow, Shield Splitter | 💠 **Soulbolt Savant** — Arrows / Mass / Ward |
| **Pyromancer** | class | elementalist, caster | fire · axe | Fire Ball, Warcry, Parry | 🔥 **Swampflame Hatchet** — Flame / Swamp / Hatchet |
| **Cleric** | class | cleric, healer | light · mace | Heal, Force, Perseverance | 🔔 **Chimebearer Mender** — Miracles / Mace / Litany |
| **Deprived** | class | berserker, melee-dps | physical · mace | Warcry, Shield Bash | 🪵 **Plank & Club Drifter** — Club / Plank / Nothing Left |
| **Soul of Cinder** | boss | knight, melee-dps | fire · greatsword | 5-Hit Combo, Soul Stream, Leaping Slash, Command Grab | 🔥 **Ashen Amalgam** — Lordsword / Stances / Sun |

</details>

### Monster Hunter: World

Capcom's hunting action RPG: a hunter tracks giant monsters across seamless habitats, then slays or traps them and turns their parts into new weapons and armor. Up to four hunters play together, with cat companions filling out smaller parties.

**Systems:** `monster-tracking`, `crafting`, `gear-defines-build`, `gear-skills`, `monster-taming`, `boss-phases`, `pets`, `co-op-party` ✓, `stamina`, `environment-hazards`, `day-night`, `meal-buffs` (✓ = we have it)

**Classes:** Great Sword (berserker), Hunting Horn (bard), Insect Glaive (spearman), Bow (archer), Lance (knight)

**Original take:** Track & Tame Expedition: kids follow glowing fireflies to a giant beast's footprints, wear it down, then choose to net it for the sanctuary or defeat it, and stitch its scales into a matching armor set with set-bonus perks, with a cat-like sidekick for small parties.

<details><summary><b>Characters</b> (12) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Great Sword** | class | berserker, melee-dps | physical · greatsword | Charged Slash, Tackle, Guard, True Charged Slash | 🗡️ **Slabsteel Breaker** — Charge / Grit / Sweep |
| **Long Sword** | class | warrior, melee-dps | physical · katana | Spirit Blade, Foresight Slash, Spirit Gauge, Spirit Helmbreaker | 🗡️ **Ascending Edge** — Spirit / Counter / Focus |
| **Sword and Shield** | class | warrior, melee-dps | physical · sword | Advancing Slash, Shield Combo, Guard, Falling Bash | 🛡️ **Buckler Skirmisher** — Blade / Buckler / Kit |
| **Dual Blades** | class | berserker, melee-dps | physical · dual-blades | Lunging Strike, Demon Mode, Archdemon Mode, Blade Dance | 🌀 **Twinfang Dervish** — Demon / Dance / Flow |
| **Hammer** | class | warrior, melee-dps | physical · hammer | Overhead Smash, Power Charge, Spinning Bludgeon, Big Bang | 🔨 **Skullringer Maul** — Smash / Spin / Impact |
| **Hunting Horn** | class | bard, support | physical · instrument | Note attacks, Performance, Health Recovery, Echo Attack | 📯 **Warhorn Herald** — Melody / Echo / Swing |
| **Lance** | class | knight, tank | physical · spear | Mid Thrust, Guard, Counter-thrust, Power Guard | 🛡️ **Towerwall Spearguard** — Guard / Thrust / Reach |
| **Gunlance** | class | gunner, tank | fire · cannon | Shelling, Burst Fire, Wyrmstake Cannon, Guard | 💥 **Shellfire Bastion** — Shells / Stake / Shield |
| **Insect Glaive** | class | spearman, melee-dps | physical · polearm | Vault, Kinsect, Harvest Extract, Descending Thrust | 🦗 **Skyvault Glaivedancer** — Aerial / Kinsect / Staffwork |
| **Bow** | class | archer, ranged-dps | physical · bow | Charged Shot, Arc Shot, Coatings, Dragon Piercer | 🏹 **Coated Quiver Ranger** — Draw / Sky / Coatings |
| **Rathalos** | boss | berserker, ranged-dps | fire · claws | Fiery breath, Venomous claws, Aerial descent | 🐉 **Crimson Sky Wyvern** — Breath / Talons / Sky |
| **Nergigante** | boss | berserker, melee-dps | physical · claws | Regrowing spikes, Head slam, Foreleg slam, Dive bomb | 🦔 **Spinegrowth Ravager** — Spikes / Slam / Ravage |

</details>

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

<details><summary><b>Characters</b> (12) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Jim Raynor** [img](https://en.wikipedia.org/wiki/File:Jim_Raynor_(StarCraft).png) | hero | commander, commander | tech · rifle | Hyperion, Yamato Cannon, Banshee Airstrike, Orbital Drop Pods | 🎖️ **Frontier Marshal** — Orbital Drops / Air Cover / Rifle Line |
| **Sarah Kerrigan** [img](https://en.wikipedia.org/wiki/File:Sarah_Kerrigan_(StarCraft)_in_Zerg_form.png) | hero | assassin, melee-dps | arcane · claws | Leaping Strike, Psionic Shift, Immobilization Wave, Chain Reaction | 🦂 **Brood Sovereign** — Pounce / Psychic Wave / Crushing Will |
| **Artanis** | hero | commander, commander | light · none | Orbital Strike, Solar Bombardment, Shield Overcharge, Guardian Shell | 🛰️ **Skyforge Exarch** — Orbital Lances / Sky Barrage / Warp Field |
| **Marine** | unit | gunner, ranged-dps | physical · rifle | Rifle fire, Stimpack, Combat Shield | 🔫 **Ironline Trooper** — Volley Fire / Adrenal Rush / Hold the Line |
| **Siege Tank** | unit | gunner, ranged-dps | tech · cannon | Tank-mode cannon, Siege Mode, Siege-mode cannon | 💣 **Bastion Artillerist** — Long Barrel / Bombard / Close Guard |
| **Thor** | unit | warrior, tank | tech · cannon | Twin ground cannons, Anti-air missiles, 250mm Cannons | 🤖 **Walking Fortress** — Heavy Cannons / Missile Pods / Stompwork |
| **Zergling** | unit | berserker, melee-dps | physical · claws | Claws, Metabolic Boost, Raptor strain | 🐾 **Scuttle Pack** — Rush / Encircle / Pounce |
| **Roach** | unit | warrior, tank | poison · none | Basic attack, Burrow, Burrowed regeneration | 🪲 **Tunnel Spitter** — Acid Glands / Underground / Shellback |
| **Ultralisk** | unit | berserker, tank | physical · claws | Cleave, Burrow Charge, Torrasque strain | 🦣 **Tusk Juggernaut** — Cleave / Tunnel Charge / Bulwark Hide |
| **Zealot** | unit | warrior, melee-dps | arcane · dual-blades | Twin blade strikes, Charge, Whirlwind | ⚔️ **Vowblade Vanguard** — Onrush / Spinning Edge / Vow of Light |
| **Stalker** | unit | ranger, ranged-dps | arcane · none | Basic attack, Blink | 🌀 **Phase Strider** — Phase Step / Particle Bolts / Skyguard |
| **Colossus** | unit | gunner, ranged-dps | fire · none | Lance sweep, Range upgrade, Cliff walking | 🔥 **Stiltwalker Lancer** — Twin Lances / Sweep / Tall Stride |

</details>

### Warcraft III: Reforged

A remaster of the 2002 fantasy RTS in which four factions (humans, orcs, undead and night elves) gather gold and lumber, build bases and lead armies under levelling hero units. It mixed RTS with RPG growth and, through its map editor, gave birth to the MOBA genre.

**Systems:** `resource-gathering`, `supply-cap`, `upkeep`, `hero-units`, `neutral-camps`, `day-night`, `fog-of-war`, `base-building`, `tech-tree`, `asymmetric-factions`, `story-chapters` ✓, `level-editor` ✓, `ranked-matchmaking` (✓ = we have it)

**Classes:** Human Alliance (commander), Orcish Horde (commander), Undead Scourge (commander), Night Elf Sentinels (commander), Paladin (paladin), Archmage (mage), Mountain King (warrior), Blademaster (assassin), Far Seer (elementalist), Death Knight (necromancer), Keeper of the Grove (druid), Demon Hunter (shapeshifter)

**Original take:** Lantern Lords: each player leads one levelling hero and a small village army, clears sleepy forest guardians at night for treasure, and races to light the rival's beacon, with four peoples who build in different ways (walking tree-houses, burrowing camps, chalk-circle towers, singing stone farms).

<details><summary><b>Characters</b> (12) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Paladin** | hero | paladin, tank | light · hammer | Holy Light, Divine Shield, Devotion Aura, Resurrection | 🛡️ **Dawnward Vanguard** — Radiance / Bulwark / Vigil |
| **Archmage** | hero | mage, caster | ice · staff | Blizzard, Summon Water Elemental, Brilliance Aura, Mass Teleport | ❄️ **Rimecaller** — Winterfall / Tidebound / Ley Paths |
| **Footman** | unit | warrior, tank | physical · sword | Sword attack, Defend, Plating upgrades | ⚔️ **Shieldwall Recruit** — Formation / Steel Drill / Advance |
| **Blademaster** | hero | assassin, melee-dps | physical · sword | Wind Walk, Mirror Image, Critical Strike, Bladestorm | 🗡️ **Vanishing Duelist** — Unseen / Cyclone / Duel |
| **Far Seer** | hero | elementalist, caster | lightning · none | Chain Lightning, Far Sight, Feral Spirit, Earthquake | ⚡ **Thunderhide Shaman** — Skyfire / Packbond / Tremor |
| **Grunt** | unit | berserker, melee-dps | physical · axe | Battle axe, Pillage, Berserker Strength | 🪓 **Ironhide Raider** — Cleave / Plunder / Fury |
| **Death Knight** | hero | necromancer, support | dark · sword | Death Coil, Death Pact, Unholy Aura, Animate Dead | 💀 **Gravecharger** — Grave Rites / Pale Steed / Dread Banner |
| **Lich** | hero | mage, caster | ice · none | Frost Nova, Frost Armor, Dark Ritual, Death and Decay | 🧊 **Rimebone Sorcerer** — Winter Grip / Rot / Pact |
| **Ghoul** | unit | berserker, melee-dps | physical · claws | Claws, Gather, Cannibalize, Ghoul Frenzy | 🦴 **Ravenous Scrapper** — Pack Hunger / Scavenge / Howl |
| **Demon Hunter** | hero | shapeshifter, melee-dps | dark · dual-blades | Mana Burn, Immolation, Evasion, Metamorphosis | 🔥 **Blindfold Reaver** — Siphon / Cinders / Ruin Form |
| **Keeper of the Grove** | hero | druid, controller | nature · none | Entangling Roots, Force of Nature, Thorns Aura, Tranquility | 🌿 **Bramble Steward** — Rootwork / Saplings / Briars |
| **Huntress** | unit | ranger, ranged-dps | physical · thrown | Glaive throw, Moon Glaive, Sentinel, Shadowmeld | 🌙 **Moonrider Skirmisher** — Glint / Night Cat / Moonlit |

</details>

### Age of Empires IV

A historical RTS set from the early Middle Ages to the early Renaissance, where villagers gather food, wood, gold and stone while the player advances through four ages by building landmarks. Its many civilizations play very differently, from nomads who pack up their buildings to a variant led by a single levelling hero.

**Systems:** `resource-gathering`, `supply-cap`, `age-advancement`, `tech-tree`, `base-building`, `influence-zones`, `asymmetric-factions`, `hero-units`, `victory-conditions`, `capture-points`, `fog-of-war`, `story-chapters` ✓ (✓ = we have it)

**Classes:** English (commander), Mongols (commander), Chinese (commander), Rus (commander), Delhi Sultanate (commander), Jeanne d'Arc (commander)

**Original take:** Kingdom Lanterns: players grow a village by choosing one of two wonder-buildings to climb each of four eras, then win by toppling the rival's wonders or by holding three glowing shrines with their storytellers for a countdown.

<details><summary><b>Characters</b> (12) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Jeanne d'Arc** | hero | paladin, commander | light · sword | Journey of a Hero, Holy Wrath, Divine Arrow, Divine Restoration | 🛡️ **Dawnbanner Maiden** — Blessed Steel / Pilgrim's Bow / Rallied Host |
| **Khan** | hero | commander, commander | physical · bow | Maneuver Arrow, Attack Speed Arrow, Defense Arrow, Scouting Falcon | 🏹 **Steppe Signal Rider** — Whistling Shafts / Open Plains / Battle Signals |
| **King** | hero | paladin, commander | physical · greatsword | Healing aura, Great Sword, Lance, Crowned at the Abbey of Kings | 👑 **Crowned Charger** — Lance and Steed / Two-Hand Steel / Royal Court |
| **Spearman** | unit | spearman, melee-dps | physical · spear | Spear, Torch, Anti-cavalry specialist | 🔱 **Pikewall Levy** — Bristling Line / Long Reach / Village Levy |
| **Horseman** | unit | rogue, melee-dps | physical · spear | Spear, Torch, High movement speed | 🐎 **Dustrunner Raider** — Flanking Ride / Back-Line Hunt / Burning Raid |
| **Archer** | unit | archer, ranged-dps | physical · bow | Bow, High rate of fire | 🎯 **Fletchling Skirmisher** — Quick Loose / Massed Volley / Skirmish |
| **Man-at-Arms** | unit | warrior, tank | physical · sword | Sword, High armor, Torch | ⚔️ **Mailclad Footguard** — Steel Wall / Close Quarters / Hold Fast |
| **Crossbowman** | unit | archer, ranged-dps | physical · crossbow | Crossbow, Anti-heavy specialist | 🎯 **Platebreaker Marksman** — Heavy Draw / Bolt Rack / Pavise Craft |
| **Knight** | unit | knight, melee-dps | physical · sword | Sword, Heavy armor, Torch | 🐴 **Destrier Vanguard** — Shock Charge / Mounted Steel / Hoofbeat |
| **Longbowman** | unit | archer, ranged-dps | physical · bow | Longbow, Place Palings, Arrow Volley | 🏹 **Greatbow Picket** — Clothyard Shafts / Darkened Sky / Staked Ground |
| **Mangudai** | unit | ranger, ranged-dps | physical · bow | Bow, Fire on the move | 🐎 **Whirlwind Saddlebow** — Hit and Run / Steppe Volleys / Wind Riders |
| **Tower Elephant** | unit | ranger, ranged-dps | physical · bow | Bow and Crossbow riders, Tusks, High health | 🐘 **Howdah Colossus** — Howdah Crew / Living Ram / Earthshaker |

</details>

### Command & Conquer: Red Alert 3

A tongue-in-cheek alternate-history RTS where three powers (Allies, Soviets and a psychic-tech Empire) harvest ore, build bases on land and sea, and race to superweapons. Every campaign mission is played with a partner, human or AI.

**Systems:** `co-op-missions`, `resource-gathering`, `base-building`, `tech-tree`, `superweapons`, `commander-calldowns`, `unit-secondary-abilities`, `naval-warfare`, `asymmetric-factions`, `unit-command`, `story-chapters` ✓ (✓ = we have it)

**Classes:** Allied Nations (commander), Soviet Union (commander), Empire of the Rising Sun (commander), Tanya (gunner)

**Original take:** Toybox Tides: two kids co-command a harbour of wind-up toys against a rival toy fleet, calling in balloon drops on a cooldown and racing to finish a giant bubble-dome or a teleporting toy-box before the other side does.

<details><summary><b>Characters</b> (12) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Tanya** | hero | gunner, ranged-dps | physical · gun | Primary fire, C4 charge, Time Belt, Swimmer | ⏱️ **Rewind Raider** — Gunplay / Demolition / Rewind |
| **Natasha** | hero | gunner, ranged-dps | physical · rifle | Sniper rifle, Pilot Snipe | 🎯 **Longsight Huntress** — Scope / Disable / Called Fire |
| **Yuriko Omega** | hero | mage, controller | arcane · none | Telekinesis, Psychokinetic Burst | 🌀 **Mindstorm Prodigy** — Lift / Shatter / Drift |
| **Peacekeeper** | unit | warrior, tank | physical · gun | Shotgun, Riot Shield | 🛡️ **Riot Warden** — Front Line / Close Quarters / Crowd Control |
| **Mirage Tank** | unit | rogue, support | tech · cannon | Tree disguise, Gap Generator | 🌳 **Grove Phantom** — Ambush / Shroud / Canopy |
| **Cryocopter** | unit | elementalist, controller | ice · none | Freeze ray, Shrink Beam | 🧊 **Rime Rotor** — Chill / Shrink / Flight |
| **Tesla Trooper** | unit | elementalist, ranged-dps | lightning · gun | Tesla weapon, EM Disruption, Coil charger | ⚡ **Coilguard Volt** — Discharge / Pulse / Overload |
| **Apocalypse Tank** | unit | warrior, tank | physical · cannon | Twin cannons, Magnetic Harpoon | 🛞 **Siegeplate Juggernaut** — Bombard / Crush / Hookline |
| **Kirov Airship** | unit | berserker, melee-dps | fire · thrown | Bombs, Gastroburners | 🎈 **Skyhulk Bombardier** — Payload / Descent / Burners |
| **King Oni** | unit | berserker, tank | tech · none | Eyeblasters, Bull Rush | 👹 **Horned Colossus** — Glare / Charge / Wrath |
| **Tsunami Tank** | unit | warrior, ranged-dps | water · cannon | Amphibious, Kagami Armor | 🌊 **Tidal Bulwark** — Shoreline / Landing / Plating |
| **Mecha Tengu** | unit | shapeshifter, ranged-dps | tech · gun | Anti-infantry fire, Transform | 🛩️ **Wingshift Strider** — Ground Mode / Air Mode / Shift |

</details>

### League of Legends

A free-to-play 5v5 battle arena where each player controls one champion, levels up and buys items within a match, and the team pushes down three lanes to destroy the enemy Nexus. It is the template for the modern MOBA: lanes, turrets, minion waves, a jungle and team-wide objective monsters.

**Systems:** `lanes`, `in-match-leveling`, `shops` ✓, `neutral-camps`, `map-objectives`, `respawn-rules`, `ultimate-ability`, `hero-select` ✓, `ranked-matchmaking`, `fog-of-war`, `auto-battle` (✓ = we have it)

**Classes:** Garen (warrior), Ahri (mage), Jinx (gunner), Thresh (warrior), Soraka (cleric), Annie (summoner)

**Original take:** Lantern Lanes: two teams of five storybook heroes push waves of paper soldiers down three lanes toward the other side's great lantern, levelling up each match and teaming up to wake a river-turtle that marches with them.

<details><summary><b>Characters</b> (10) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Garen** [img](https://www.leagueoflegends.com/en-us/champions/garen/) | hero | warrior, tank | physical · greatsword | Perseverance, Decisive Strike, Courage, Judgment | 🛡️ **Oathsteel Sentinel** — Spinning Steel / Unbroken / Final Verdict |
| **Ahri** [img](https://www.leagueoflegends.com/en-us/champions/ahri/) | hero | mage, caster | arcane · orb | Essence Theft, Orb of Deception, Fox-Fire, Charm | 🦊 **Wisptail Enchantress** — Returning Light / Wisps / Allure |
| **Jinx** [img](https://en.wikipedia.org/wiki/File:Jinx-artwork-lol.png) | hero | gunner, ranged-dps | tech · gun | Get Excited!, Switcheroo!, Zap!, Flame Chompers! | 🚀 **Fizzbang Rioter** — Big Booms / Gadgets / Hype |
| **Thresh** [img](https://www.leagueoflegends.com/en-us/champions/thresh/) | hero | warrior, controller | dark · scythe | Damnation, Death Sentence, Dark Passage, Flay | 🏮 **Lanternbound Warden** — Hook and Haul / Lamplight / Soul Cage |
| **Soraka** [img](https://www.leagueoflegends.com/en-us/champions/soraka/) | hero | cleric, healer | light · staff | Salvation, Starcall, Astral Infusion, Equinox | ⭐ **Starfall Mender** — Falling Stars / Stillness / Hope |
| **Annie** [img](https://www.leagueoflegends.com/en-us/champions/annie/) | hero | summoner, caster | fire · none | Pyromania, Disintegrate, Incinerate, Molten Shield | 🧸 **Cinderchild Caller** — Little Flames / Plush Fury / Hot Temper |
| **Malphite** [img](https://www.leagueoflegends.com/en-us/champions/malphite/) | hero | warrior, tank | earth · fists | Granite Shield, Seismic Shard, Thunderclap, Ground Slam | 🪨 **Boulderheart Colossus** — Bedrock / Avalanche / Stone Will |
| **Zed** [img](https://www.leagueoflegends.com/en-us/champions/zed/) | hero | assassin, melee-dps | dark · dual-blades | Contempt for the Weak, Razor Shuriken, Living Shadow, Shadow Slash | 🥷 **Umbral Twinstep** — Throwing Steel / Echo Self / Doom Mark |
| **Ashe** [img](https://www.leagueoflegends.com/en-us/champions/ashe/) | hero | archer, ranged-dps | ice · bow | Frost Shot, Ranger's Focus, Volley, Enchanted Crystal Arrow | 🏹 **Rimeshot Chieftain** — Cold Arrows / Volleys / Great Arrow |
| **Lux** [img](https://www.leagueoflegends.com/en-us/champions/lux/) | hero | mage, caster | light · wand | Illumination, Light Binding, Prismatic Barrier, Lucent Singularity | ✨ **Prism Lancer** — Radiance / Binding / Prism |

</details>

### Dota 2

Valve's sequel to the Warcraft III mod that founded the MOBA: two teams of five heroes push three lanes to destroy the enemy Ancient. It is known for depth: a draft phase, last-hitting and denying, a day-night cycle, runes and a respawning boss.

**Systems:** `lanes`, `hero-draft`, `in-match-leveling`, `skill-tree` ✓, `mana-resource` ✓, `last-hitting`, `shops` ✓, `neutral-camps`, `boss-fights` ✓, `power-runes`, `day-night`, `fog-of-war`, `level-editor` ✓ (✓ = we have it)

**Classes:** Axe (berserker), Crystal Maiden (elementalist), Pudge (warrior), Juggernaut (berserker), Lion (mage), Sniper (gunner)

**Original take:** Moonwell Clash: two bands of five pick heroes in turns, then push gnome waves along three forest roads to topple the rival's moonwell, grabbing glowing pebbles for short power-ups and teaming up on a sleeping stone giant who drops a second-life charm.

<details><summary><b>Characters</b> (10) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Axe** [img](https://www.dota2.com/hero/axe) | hero | berserker, tank | physical · axe | Berserker's Call, Battle Hunger, Counter Helix, Culling Blade | 🪓 **Taunting Cleaver** — Challenge / Spin / Execution |
| **Crystal Maiden** [img](https://www.dota2.com/hero/crystalmaiden) | hero | elementalist, support | ice · staff | Crystal Nova, Frostbite, Arcane Aura, Crystal Clone | ❄️ **Rimeveil Sorceress** — Winter Burst / Hold Fast / White Storm |
| **Pudge** [img](https://www.dota2.com/hero/pudge) | hero | warrior, tank | blood · axe | Meat Hook, Rot, Meat Shield, Flesh Heap | 🪝 **Hookhand Brute** — Long Hook / Stench / Heap |
| **Juggernaut** [img](https://www.dota2.com/hero/juggernaut) | hero | berserker, melee-dps | physical · sword | Blade Fury, Healing Ward, Blade Dance, Bladeform | 🗡️ **Masked Bladedancer** — Bladestorm / Many Cuts / Mask's Calm |
| **Lion** [img](https://www.dota2.com/hero/lion) | hero | mage, controller | dark · staff | Earth Spike, Hex, Mana Drain, To Hell and Back | 🖐️ **Hexhand Warlock** — Spikes / Curses / Ruin |
| **Sniper** [img](https://www.dota2.com/hero/sniper) | hero | gunner, ranged-dps | physical · rifle | Shrapnel, Headshot, Take Aim, Concussive Grenade | 🎯 **Longbarrel Marksman** — Long Shot / Scatter / Fieldcraft |
| **Drow Ranger** [img](https://www.dota2.com/hero/drowranger) | hero | archer, ranged-dps | ice · bow | Frost Arrows, Gust, Multishot, Glacier | 🏹 **Frostfletch Stalker** — Cold Quiver / Volley / High Ground |
| **Phantom Assassin** [img](https://www.dota2.com/hero/phantomassassin) | hero | assassin, melee-dps | physical · dagger | Stifling Dagger, Phantom Strike, Blur, Fan of Knives | 🌫️ **Misted Duelist** — Thrown Steel / Vanish / Killing Edge |
| **Earthshaker** [img](https://www.dota2.com/hero/earthshaker) | hero | warrior, controller | earth · mace | Fissure, Enchant Totem, Aftershock, Echo Slam | 🌋 **Faultline Totemist** — Fault / Totem / Echoes |
| **Dazzle** [img](https://www.dota2.com/hero/dazzle) | hero | cleric, healer | dark · staff | Poison Touch, Shallow Grave, Shadow Wave, Weave | 🪶 **Nightrite Priest** — Wave / Toxins / Grave Ward |

</details>

### Heroes of the Storm

Blizzard's crossover MOBA in which 5v5 teams of heroes from its other games fight to destroy the enemy Core on many themed battlegrounds. It streamlines the genre with shared team experience, talents instead of item shops, and a map objective on every battleground.

**Systems:** `in-match-leveling`, `skill-tree` ✓, `map-objectives`, `lanes`, `neutral-camps`, `mounts`, `fast-travel`, `hero-draft`, `ranked-matchmaking`, `ai-opponents` ✓, `run-modifiers` (✓ = we have it)

**Classes:** Muradin (warrior), Jaina (elementalist), Li Li (healer), Abathur (summoner), Illidan (assassin), Valla (archer)

**Original take:** Storybook Stadium: teams of five level up together, pick one storybook perk every few levels instead of shopping, and race to fill a magic seed patch that grows a garden giant to march down a lane for them.

<details><summary><b>Characters</b> (10) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Muradin** [img](https://heroes-site-production-eks-prod-use1-01.heroesofthestorm.blizzard.com/en-us/heroes/muradin) | hero | warrior, tank | physical · hammer | Storm Bolt, Thunder Clap, Dwarf Toss, Second Wind | 🔨 **Anvilhelm Bulwark** — Thrown Steel / Clap and Hurl / Giant Form |
| **Sonya** [img](https://heroes-site-production-eks-prod-use1-01.heroesofthestorm.blizzard.com/en-us/heroes/sonya) | hero | berserker, melee-dps | physical · dual-blades | Fury, Ancient Spear, Seismic Slam, Whirlwind | 🪓 **Frostland Ravager** — Hooked Charge / Red Gyre / Skyfall |
| **Uther** [img](https://heroes-site-production-eks-prod-use1-01.heroesofthestorm.blizzard.com/en-us/heroes/uther) | hero | paladin, healer | light · hammer | Holy Light, Holy Radiance, Hammer of Justice, Devotion | ✨ **Dawnward Oathkeeper** — Radiance / Judgement / Vigil |
| **Li Li** [img](https://heroes-site-production-eks-prod-use1-01.heroesofthestorm.blizzard.com/en-us/heroes/lili) | hero | healer, healer | wind · none | Fast Feet, Healing Brew, Cloud Serpent, Blinding Wind | 🍵 **Gale Teacup Sprite** — Kettle Arts / Tide / Quickstep |
| **Jaina** [img](https://heroes-site-production-eks-prod-use1-01.heroesofthestorm.blizzard.com/en-us/heroes/jaina) | hero | elementalist, caster | ice · staff | Frostbite, Frostbolt, Blizzard, Cone of Cold | ❄️ **Rimecaller Sage** — Chill / Whiteout / Deep Winter |
| **Valla** [img](https://heroes-site-production-eks-prod-use1-01.heroesofthestorm.blizzard.com/en-us/heroes/valla) | hero | archer, ranged-dps | physical · crossbow | Hatred, Hungering Arrow, Multishot, Vault | 🏹 **Duskbolt Stalker** — Seeking Shots / Volley / Footwork |
| **Tassadar** [img](https://heroes-site-production-eks-prod-use1-01.heroesofthestorm.blizzard.com/en-us/heroes/tassadar) | hero | mage, caster | arcane · none | Resonance Beam, Shock Ray, Psionic Storm, Force Wall | 🔮 **Mindflare Seer** — Focus / Tempest of Mind / Gravity |
| **Illidan** [img](https://heroes-site-production-eks-prod-use1-01.heroesofthestorm.blizzard.com/en-us/heroes/illidan) | hero | assassin, melee-dps | dark · dual-blades | Betrayer's Thirst, Dive, Sweeping Strike, Evasion | 🗡️ **Twinfang Outcast** — Slipstep / Hunger / Unbound |
| **Zeratul** [img](https://heroes-site-production-eks-prod-use1-01.heroesofthestorm.blizzard.com/en-us/heroes/zeratul) | hero | assassin, melee-dps | dark · sword | Permanent Cloak, Cleave, Singularity Spike, Blink | 🌌 **Gloomstep Phantom** — Veilwalk / Edge / Stillness |
| **Abathur** [img](https://heroes-site-production-eks-prod-use1-01.heroesofthestorm.blizzard.com/en-us/heroes/abathur) | hero | summoner, support | poison · claws | Locust Strain, Symbiote, Stab, Spike Burst | 🐛 **Brood Tinkerer** — Grafts / Nests / Swarm |

</details>

### Pokémon Unite

A family-friendly 5v5 MOBA with 10-minute matches where Pokémon defeat wild Pokémon for energy and dunk it into the other team's goal zones for points. Each player's Pokémon starts weak and evolves during the match, and a legendary boss near the end can swing the score.

**Systems:** `score-goals`, `class-advancement`, `in-match-leveling`, `ultimate-ability`, `neutral-camps`, `map-objectives`, `lanes`, `hidden-scoreboard`, `quick-mode`, `ranked-matchmaking` (✓ = we have it)

**Classes:** Pikachu (elementalist), Snorlax (warrior), Charizard (shapeshifter), Eldegoss (healer)

**Original take:** Sprout Score: two teams of critter-kids catch glow-bugs in the meadow and run them into the other team's flower baskets for points, their critter growing into a bigger form mid-match, with a thunder-owl in the last two minutes that makes baskets open wide.

<details><summary><b>Characters</b> (9) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Pikachu** [img](https://en.wikipedia.org/wiki/File:Pok%C3%A9mon_Pikachu_art.png) | hero | elementalist, ranged-dps | lightning · none | Static, Electro Ball, Thunder, Electroweb | ⚡ **Sparkcheek Zapper** — Live Current / Storm / Quickness |
| **Snorlax** [img](https://en.wikipedia.org/wiki/File:Pok%C3%A9mon_Snorlax_art.png) | hero | warrior, tank | physical · fists | Gluttony, Tackle, Heavy Slam, Rest | 😴 **Slumbering Bulwark** — Belly Bump / Big Yawn / Rolling Nap |
| **Charizard** [img](https://en.wikipedia.org/wiki/File:Pok%C3%A9mon_Charizard_art.png) | hero | shapeshifter, melee-dps | fire · claws | Blaze, Flame Burst, Flamethrower, Fire Blast | 🐉 **Blazewing Brawler** — Flame Breath / Wings / Inferno |
| **Eldegoss** [img](https://unite.pokemon.com/en-us/pokemon/eldegoss/) | hero | healer, healer | nature · none | Cotton Down, Pollen Puff, Leaf Tornado, Cotton Guard | 🌼 **Fluffseed Mender** — Pollen / Breeze / Cloudfall |
| **Gengar** [img](https://en.wikipedia.org/wiki/File:Pok%C3%A9mon_Gengar_art.png) | hero | assassin, melee-dps | dark · none | Levitate, Shadow Ball, Sludge Bomb, Dream Eater | 👻 **Grinning Haunt** — Spooky Shots / Vanishing / Nightmare |
| **Lucario** [img](https://en.wikipedia.org/wiki/File:Pok%C3%A9mon_Lucario_art.png) | hero | monk, melee-dps | physical · fists | Steadfast, Extreme Speed, Power-Up Punch, Bone Rush | 🥋 **Auraflow Duelist** — Swift Fists / Bone Staff / Inner Power |
| **Blissey** [img](https://unite.pokemon.com/en-us/pokemon/blissey/) | hero | cleric, healer | none · none | Natural Cure, Egg Bomb, Helping Hand, Soft-Boiled | 🥚 **Eggshell Guardian** — Egg Toss / Comfort / Guard Dash |
| **Greninja** [img](https://unite.pokemon.com/en-us/pokemon/greninja/) | hero | assassin, ranged-dps | water · thrown | Torrent, Water Shuriken, Surf, Double Team | 🐸 **Tidestar Ninja** — Water Stars / Waves / Decoys |
| **Venusaur** [img](https://unite.pokemon.com/en-us/pokemon/venusaur/) | hero | druid, caster | nature · none | Overgrow, Seed Bomb, Sludge Bomb, Giga Drain | 🌺 **Bloomback Bombardier** — Seeds / Sunlight / Blossom |

</details>

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

<details><summary><b>Characters</b> (9) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Wraith** [img](https://www.ea.com/games/apex-legends/apex-legends/characters-hub/wraith) | hero | rogue, ranged-dps | arcane · gun | Into the Void, Voices from the Void, Dimensional Rift | 🌌 **Voidstep Drifter** — Phase / Portals / Whispers |
| **Bloodhound** [img](https://www.ea.com/games/apex-legends/apex-legends/characters-hub/bloodhound) | hero | ranger, support | tech · gun | Eye of the Allfather, Tracker, Allfather's Cloak | 🐦‍⬛ **Ravenmark Tracker** — Sight / The Chase / Old Ways |
| **Lifeline** [img](https://www.ea.com/games/apex-legends/apex-legends/characters-hub/lifeline) | hero | healer, healer | tech · gun | D.O.C. Heal Drone, Combat Glide, D.O.C. Halo | 🩺 **Dronecare Medic** — Drone / Halo / Glide |
| **Gibraltar** [img](https://www.ea.com/games/apex-legends/apex-legends/characters-hub/gibraltar) | hero | knight, tank | tech · gun | Dome of Protection, Gun Shield, Momentum Boost, Defensive Bombardment | ⛑️ **Domekeeper Guardian** — Dome / Shield Arm / Mortars |
| **Pathfinder** [img](https://www.ea.com/games/apex-legends/apex-legends/characters-hub/pathfinder) | hero | engineer, support | tech · gun | Grappling Hook, Insider Knowledge, Zipline Gun | 🤖 **Grapplebot Scout** — Grapple / Zipline / Survey |
| **Caustic** [img](https://www.ea.com/games/apex-legends/apex-legends/characters-hub/caustic) | hero | engineer, controller | poison · gun | Nox Gas Trap, Field Research, Nox Gas Grenade | 🧪 **Fumecask Chemist** — Canisters / Clouds / Grenades |
| **Bangalore** [img](https://www.ea.com/games/apex-legends/apex-legends/characters-hub/bangalore) | hero | gunner, ranged-dps | tech · rifle | Smoke Launcher, Double Time, Rolling Thunder | 💨 **Smokescreen Sergeant** — Artillery / Smoke / Double Step |
| **Wattson** [img](https://www.ea.com/games/apex-legends/apex-legends/characters-hub/wattson) | hero | engineer, controller | lightning · gun | Perimeter Security, Spark of Genius, Interception Pylon | 🔌 **Fencewire Engineer** — Fences / Pylon / Spark |
| **Octane** [img](https://www.ea.com/games/apex-legends/apex-legends/characters-hub/octane) | hero | berserker, ranged-dps | tech · gun | Stim, Swift Mend, Launch Pad | 🏎️ **Adrenal Daredevil** — Stim / Pad / Stunt |

</details>

### Overwatch 2

A free-to-play first-person hero shooter where two teams of five (one tank, two damage, two support) fight over objectives such as capture points and moving payloads. Every hero has a distinct kit of abilities and a charged ultimate; the game was renamed simply Overwatch in 2026.

**Systems:** `character-classes` ✓, `ultimate-ability`, `capture-points`, `escort-payload`, `in-match-leveling`, `upgrade-draft`, `ping-system`, `hero-draft`, `ranked-matchmaking`, `hero-select` ✓ (✓ = we have it)

**Classes:** Reinhardt (knight), Tracer (rogue), Mercy (cleric), Mei (elementalist), Torbjörn (engineer), Lúcio (bard)

**Original take:** Parade Push: two teams of five (one shield-carrier, two blasters, two helpers) take turns pushing a float down a carnival street while the other side tries to hold it back, each hero charging a big signature move.

<details><summary><b>Characters</b> (10) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Reinhardt** [img](https://en.wikipedia.org/wiki/File:Overwatch-Reinhardt.png) | hero | knight, tank | physical · hammer | Rocket Hammer, Barrier Field, Charge, Fire Strike | 🔨 **Hammerheart Paladin** — Hammer / Advance / Flame |
| **Winston** [img](https://en.wikipedia.org/wiki/File:Winston_Overwatch.png) | hero | warrior, tank | lightning · gun | Tesla Cannon, Jump Pack, Barrier Projector, Primal Rage | 🦍 **Moonborn Brawler** — Arc Gun / Bounding / Fury |
| **Tracer** [img](https://en.wikipedia.org/wiki/File:Tracer_Overwatch_2_portrait.png) | hero | gunner, ranged-dps | tech · gun | Pulse Pistols, Blink, Recall, Pulse Bomb | ⏱️ **Timeskip Courier** — Zip / Twin Guns / Rewind |
| **Genji** [img](https://en.wikipedia.org/wiki/File:Genji_(Overwatch).png) | hero | assassin, melee-dps | physical · katana | Shuriken, Deflect, Swift Strike, Cyber-Agility | 🌀 **Cyberblade Wanderer** — Star Throw / Swift Cuts / Spirit Edge |
| **Mei** [img](https://en.wikipedia.org/wiki/File:Mei_Overwatch.png) | hero | elementalist, controller | ice · gun | Endothermic Blaster, Cryo-Freeze, Ice Wall, Blizzard | 🧊 **Permafrost Researcher** — Cold Spray / Walls / Weather Drone |
| **Torbjörn** [img](https://en.wikipedia.org/wiki/File:Overwatch-Torbjorn.png) | hero | engineer, builder | fire · tools | Rivet Gun, Forge Hammer, Deploy Turret, Overload | ⚙️ **Rivetforge Tinker** — Workshop / Slag / Overdrive |
| **Widowmaker** [img](https://en.wikipedia.org/wiki/File:Widowmaker_Overwatch.png) | hero | gunner, ranged-dps | physical · rifle | Widow's Kiss, Grappling Hook, Venom Mine, Infra-Sight | 🕷️ **Ridgeline Huntress** — Scope / Venom / Rooftops |
| **Mercy** [img](https://en.wikipedia.org/wiki/File:Mercy_Overwatch.png) | hero | cleric, healer | light · staff | Caduceus Staff, Caduceus Blaster, Guardian Angel, Resurrect | 🪽 **Haloflight Medic** — Lifebeam / Wings / Halo |
| **Ana** [img](https://en.wikipedia.org/wiki/File:Ana-overwatch.png) | hero | healer, healer | light · rifle | Biotic Rifle, Sleep Dart, Biotic Grenade, Nano Boost | 💉 **Eagle-Eye Matron** — Rifle / Darts / Grenades |
| **Lúcio** [img](https://en.wikipedia.org/wiki/File:LucioOverwatch.png) | hero | bard, support | wind · instrument | Sonic Amplifier, Crossfade, Amp It Up, Soundwave | 🎧 **Beatdrop Skater** — Bass / Rhythm / Skates |

</details>

### Clash Royale

A mobile duel of three-minute battles where each player spends regenerating elixir to drop troops, buildings and spells from an eight-card deck across two lanes. Destroy more of the other side's towers, or their king tower, to win.

**Systems:** `deck-building`, `elixir-deploy`, `lanes`, `placement-zones`, `pvp` ✓, `co-op-party` ✓, `gear-upgrading`, `guilds`, `hero-draft`, `auto-battle` (✓ = we have it)

**Classes:** Golden Knight (knight), Archer Queen (archer), Skeleton King (necromancer), Mighty Miner (worker)

**Original take:** Sandcastle Siege: each player holds eight shell-cards and spends rising tide-points to drop crabs, kites and splash spells over two bridges, aiming to topple the other side's sandcastle towers before the tide comes in.

<details><summary><b>Characters</b> (10) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Golden Knight** | hero | knight, melee-dps | physical · greatsword | Sword attack, Dashing Dash, Swarm sweep | ⚔️ **Gilded Duelist** — Relay Lunge / Showman / Bulwark |
| **Archer Queen** | hero | archer, ranged-dps | physical · crossbow | Crossbow bolts, Cloaking Cape | 🏹 **Veiled Markswoman** — Crossfire / Cloak / Royal Aim |
| **Skeleton King** | hero | necromancer, summoner | dark · mace | Club smash, Soul collector, Soul Summoning | 💀 **Ossuary Sovereign** — Grave Weight / Soul Harvest / Undying Court |
| **Mighty Miner** | hero | worker, melee-dps | earth · tools | Drill attack, Explosive Escape, Left-behind bomb | ⛏️ **Tunnel Sapper** — Bore / Undermine / Demolition Pack |
| **Monk** | hero | monk, melee-dps | physical · fists | Three-hit combo, Pensive Protection | 🧘 **Still Water Adept** — Palm Forms / Inner Calm / Temple Voice |
| **Knight** | unit | knight, tank | physical · sword | Sword swing, Elbow Reflection | 🛡️ **Steadfast Squire** — Shieldwall / Advance / Old Guard |
| **P.E.K.K.A** | unit | knight, tank | physical · greatsword | Heavy blade, Butter-Heal | 🗡️ **Ironclad Juggernaut** — Cleaver / March / Wings of Mending |
| **Musketeer** | unit | gunner, ranged-dps | physical · gun | Musket shot, Sniper Shot | 🎯 **Palace Sharpshooter** — Long Barrel / Powder / Sentry |
| **Valkyrie** | unit | berserker, melee-dps | physical · axe | Axe spin, Whirlwind Axe | 🪓 **Cyclone Axewoman** — Spin / Onslaught / Battle Cry |
| **Hog Rider** | unit | berserker, melee-dps | physical · hammer | Building rush, River jump | 🐗 **Boar Charger** — Stampede / Siege Hammer / Battle Squeal |

</details>

### Brawl Stars

A top-down mobile shooter of short 3v3 matches and a 10-player battle royale, where each Brawler has one attack and a Super charged by landing hits. Many quick modes (gem grab, soccer, heists, king of the hill) share one roster of over 100 Brawlers.

**Systems:** `character-classes` ✓, `ultimate-ability`, `battle-royale-storm` ✓, `power-cubes`, `score-goals`, `capture-points`, `seasons`, `level-editor` ✓, `gear-upgrading`, `ranked-matchmaking`, `guilds` (✓ = we have it)

**Classes:** Shelly (gunner), Colt (gunner), El Primo (monk), Poco (bard), Jessie (engineer), Spike (elementalist)

**Original take:** Pocket Party Brawl: ten pocket-sized heroes with one trick and one charged super each race to grab glow-cubes in a shrinking sandbox, with quick team side modes like dodge-ball goals and jelly-bean grab.

<details><summary><b>Characters</b> (9) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Shelly** | hero | gunner, ranged-dps | physical · gun | Buckshot, Super Shell, Fast Forward, Clay Pigeons | 💥 **Scattergun Ranger** — Pellet Spread / Ranch Moves / Close Quarters |
| **Colt** | hero | gunner, ranged-dps | physical · gun | Six-Shooters, Bullet Storm, Speedloader, Silver Bullet | 🔫 **Twin-Iron Showman** — Trick Shots / Showtime / Footwork |
| **El Primo** | hero | monk, tank | physical · fists | Fists of Fury, Flying Elbow Drop, Suplex Supplement, Asteroid Belt | 🤼 **Ring Champion** — Top Rope / Grapple / Crowd Pleaser |
| **Poco** | hero | bard, healer | none · instrument | Power Chord, Encore, Tuning Fork, Protective Tunes | 🎸 **Serenade Healer** — Chords / Crescendo / Quiet Verse |
| **Jessie** | hero | engineer, builder | tech · gun | Shock Rifle, Scrappy!, Spark Plug, Recoil Spring | 🔧 **Scrapyard Tinker** — Bounce Current / Workbench / Overclock |
| **Spike** | hero | elementalist, controller | nature · thrown | Needle Grenade, Stick Around!, Popping Pincushion, Life Plant | 🌵 **Desert Thornling** — Needles / Thicket / Sun Bloom |
| **Mortis** | hero | assassin, melee-dps | dark · tools | Shovel Swing, Life Blood, Survival Shovel, Friendship Is Great | 🦇 **Gravedigger Duelist** — Spade Work / Bat Swarm / Midnight Show |
| **Piper** | hero | ranger, ranged-dps | physical · rifle | Gunbrella, Poppin', Auto Aimer, Homemade Recipe | ☂️ **Parasol Sniper** — Long Range / Exit Stage / Tea Party |
| **Dynamike** | hero | elementalist, caster | fire · thrown | Short Fuse, Big Barrel o' Boom, Fidget Spinner, Satchel Charge | 🧨 **Fuse-Happy Prospector** — Lob / Blasting / Old Timer |

</details>

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

<details><summary><b>Characters</b> (8) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **The Luminary** | character | knight, melee-dps | lightning · sword | Zap, Flame Slash, Frizz, Heal | ✨ **Mark of the Chosen** — Sky Spells / Swordplay / Pep |
| **Erik** | character | rogue, melee-dps | physical · dagger | Divide, Critical Claim, Rubblerouser, Sleeper Hit | 🗝️ **Quicksilver Pilferer** — Guile / Knives / Rangs |
| **Veronica** | character | mage, caster | fire · staff | Frizz, Sizz, Crack, Kaboom | 🔥 **Pocket Pyromancer** — Fire / Ice / Burst |
| **Serena** | character | cleric, healer | light · wand | Heal, Multiheal, Kabuff, Kazing | 🎵 **Harpsong Mender** — Mending / Wind / Light |
| **Sylvando** | character | bard, support | wind · whip | Hustle Dance, Oomph, Re-Heal, Pink Pirouette | 🎭 **Showtime Cavalier** — Showmanship / Litheness / Chivalry |
| **Jade** | character | monk, melee-dps | physical · spear | Multithrust, Thunder Thrust, Multifeet, Vacuum Smash | 🥋 **Princess of Thrusts** — Spear / Fisticuffs / Allure |
| **Rab** | character | mage, caster | dark · staff | Zam, Multiheal, Zing Stick, Kasnooze | 🧙 **Wandering Sage King** — Shadow / Slumber / Gates |
| **Hendrik** | character | knight, tank | physical · shield | Forbearance, Kabuff, Gyrfalcon Slash, Parallax | 🛡️ **Oathbound Bulwark** — Shield / Heroism / Fraternity |

</details>

### Final Fantasy VII Remake

A mercenary joins a resistance cell fighting a power company that drains the planet's life energy, in a real-time remake of the opening of a classic JRPG. Combat mixes action with a time gauge that lets the player pause and pick spells and abilities.

**Systems:** `real-time-combat` ✓, `atb-gauge-commands`, `party-switching`, `ultimate-ability`, `summons`, `loadout-strategy`, `character-classes` ✓, `boss-fights` ✓, `quests` ✓ (✓ = we have it)

**Characters:** Cloud Strife (warrior), Barret Wallace (gunner), Tifa Lockhart (monk), Aerith Gainsborough (mage), Yuffie Kisaragi (assassin), Sephiroth (warrior)

**Original take:** In a smog-wrapped tower city, a hired blade and three rebels sabotage the furnaces of a company that burns the earth's dreams for light; a pause-gauge lets kids stop time to pick a spell, then jump back into the fight.

<details><summary><b>Characters</b> (6) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Cloud Strife** [img](https://en.wikipedia.org/wiki/File:Cloud_Strife.png) | character | warrior, melee-dps | physical · greatsword | Braver, Focused Thrust, Triple Slash, Punisher Mode | 🗡️ **Hired Edge** — Operator / Punisher / Limit |
| **Barret Wallace** [img](https://en.wikipedia.org/wiki/File:Ff7-barret.png) | character | gunner, ranged-dps | physical · gun | Steelskin, Lifesaver, Focused Shot, Maximum Fury | 🔫 **Ironarm Gunner** — Fury / Bulwark / Overcharge |
| **Tifa Lockhart** [img](https://en.wikipedia.org/wiki/File:Tifa_Lockhart_art.png) | character | monk, melee-dps | physical · fists | Unbridled Strength, Divekick, Starshower, Chi Trap | 👊 **Rising Fist Adept** — Ki / Kicks / Flow |
| **Aerith Gainsborough** [img](https://en.wikipedia.org/wiki/File:Aerith_Gainsborough.png) | character | mage, caster | light · staff | Arcane Ward, Lustrous Shield, Ray of Judgment, Fleeting Familiar | 🌸 **Bloom Warder** — Ward / Judgment / Planet |
| **Yuffie Kisaragi** [img](https://en.wikipedia.org/wiki/File:Yuffie_Kisaragi.png) | character | assassin, melee-dps | wind · thrown | Throw, Ninjutsu, Windstorm, Brumal Form | 🌀 **Starthrow Shinobi** — Star / Ninjutsu / Covert |
| **Sephiroth** [img](https://en.wikipedia.org/wiki/File:Sephiroth.png) | boss | warrior, melee-dps | dark · katana | Scintilla, Telluric Fury, Aeolian Onslaught, Firaga | ⚔️ **Longblade Duelist** — Long Blade / Wrath / Spells |

</details>

### Genshin Impact

An anime-style open world where a traveller searching for a lost twin crosses seven elemental nations, switching between four heroes in real-time combat. Elements react with one another, and most heroes are drawn from paid random banners.

**Systems:** `open-world`, `party-switching`, `elemental-reactions`, `puzzles`, `dungeon-portals`, `regenerating-reward-energy`, `rank-system`, `co-op-party` ✓, `crafting`, `fast-travel`, `gacha`, `level-editor` ✓ (✓ = we have it)

**Classes:** Diluc (claymore, fire) (berserker), Venti (bow, wind) (archer), Zhongli (polearm, earth) (spearman), Bennett (sword, fire) (cleric), Klee (catalyst, fire) (mage), The Traveler (Aether or Lumine) (elementalist), Paimon (bard), Raiden Shogun (spearman)

**Original take:** A party of four weather-kids swap places with a tap: a rain-caller soaks the bog-goblins, a frost-skater freezes them solid, and every hero is earned through quests, never random paid draws.

<details><summary><b>Characters</b> (10) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **The Traveler** | hero | elementalist, melee-dps | wind · sword | Foreign Ironwind, Palm Vortex, Gust Surge, Slitting Wind | 🌬️ **Drifting Zephyr** — Edge / Palm / Current |
| **Diluc** | hero | berserker, melee-dps | fire · greatsword | Tempered Sword, Searing Onslaught, Dawn, Relentless | 🔥 **Cinder Vigilante** — Onslaught / Firebird / Night Patrol |
| **Venti** [img](https://en.wikipedia.org/wiki/File:Venti_Genshin.png) | hero | archer, controller | wind · bow | Divine Marksmanship, Skyward Sonnet, Wind's Grand Ode, Windrider | 🪶 **Skyborne Minstrel** — Arrows / Lift / Storm Eye |
| **Zhongli** [img](https://en.wikipedia.org/wiki/File:Zhongli_(Genshin_Impact).png) | hero | spearman, tank | earth · spear | Rain of Stone, Dominus Lapidis, Planet Befall, Dominance of Earth | 🪨 **Jade Covenant** — Stele / Heavens / Contract |
| **Bennett** | hero | cleric, healer | fire · sword | Strike of Fortune, Passion Overload, Fantastic Voyage, Fearnaught | 🧭 **Ember Pathfinder** — Overload / Voyage / Bad Luck |
| **Klee** | hero | mage, caster | fire · tome | Kaboom!, Jumpy Dumpty, Sparks 'n' Splash, Pounding Surprise | 💣 **Fizzbang Imp** — Bombs / Fireworks / Mischief |
| **Raiden Shogun** [img](https://en.wikipedia.org/wiki/File:Raiden-shogun-arm.png) | hero | spearman, melee-dps | lightning · spear | Origin, Transcendence: Baleful Omen, Secret Art: Musou Shinsetsu, Chakra Desiderata | ⚡ **Eternal Edict** — Omen / Musou / Resolve |
| **Fischl** | hero | summoner, summoner | lightning · bow | Bolts of Downfall, Nightrider, Midnight Phantasmagoria, Stellar Predator | 🐦‍⬛ **Raven Princess** — Raven / Bolts / Phantasm |
| **Ganyu** | hero | archer, ranged-dps | ice · bow | Liutian Archery, Trail of the Qilin, Celestial Shower, Undivided Heart | ❄️ **Frostbloom Archer** — Frostflake / Lotus / Pearl |
| **Noelle** | hero | knight, tank | earth · greatsword | Favonius Bladework - Maid, Breastplate, Sweeping Time, Devotion | 🛡️ **Stonecloak Steward** — Armour / Sweep / Bedrock |

</details>

### Honkai: Star Rail

An amnesiac with a world-ending artefact inside them rides a star-crossing train from planet to planet, fighting in four-hero turn-based battles. Heroes follow Paths that set their combat role, and break enemy toughness by hitting elemental weaknesses.

**Systems:** `turn-based-combat`, `character-classes` ✓, `elemental-reactions`, `field-techniques`, `auto-battle`, `gear-upgrading`, `puzzles`, `story-chapters` ✓, `gacha` (✓ = we have it)

**Classes:** Preservation (knight), Abundance (healer), Harmony (bard), Nihility (druid), Erudition (elementalist), The Hunt (ranger), The Trailblazer (warrior), March 7th (archer), Dan Heng (spearman), Kafka (assassin), Bronya (commander)

**Original take:** A lantern-tram stops at a new floating island each chapter; kids pick four heroes by role (shield, mender, cheer-leader, striker) and crack a crystal foe's armour by hitting its matching colour.

<details><summary><b>Characters</b> (10) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **The Trailblazer** [img](https://en.wikipedia.org/wiki/File:Honkai_Star_Rail_Trailblazers.png) | hero | warrior, melee-dps | physical · mace | Farewell Hit, RIP Home Run, Stardust Ace, Perfect Pickoff | ⚾ **Wayfinder Slugger** — Swing / Grand Slam / Cosmic Core |
| **March 7th** | hero | archer, support | ice · bow | Frigid Cold Arrow, The Power of Cuteness, Glacial Cascade, Girl Power | 📸 **Frostlit Snapshot** — Arrows / Cascade / Guard |
| **Dan Heng** | hero | spearman, melee-dps | wind · spear | Knight Spear Technique: North Wind, Knight Spear Technique: Torrent, Ethereal Dream, Superiority of Reach | 🐉 **Tidewind Lancer** — Spear / Slow / Dream |
| **Himeko** | hero | elementalist, caster | fire · cannon | Sawblade Tuning, Molten Detonation, Heavenly Flare, Victory Rush | ☄️ **Solar Navigator** — Detonation / Flare / Navigator |
| **Welt** | hero | druid, controller | arcane · staff | Gravity Suppression, Edge of the Void, Synthetic Black Hole, Time Distortion | 🕳️ **Gravewell Sage** — Void / Edge / Time |
| **Kafka** [img](https://en.wikipedia.org/wiki/File:Kafka_in_Honkai_Star_Rail.png) | hero | assassin, controller | lightning · gun | Midnight Tumult, Caressing Moonlight, Twilight Trill, Gentle but Cruel | 🎻 **Velvet Conductor** — Shock / Encore / Script |
| **Bronya** | hero | commander, support | wind · rifle | Windrider Bullet, Combat Redeployment, The Belobog March, Leading the Way | 🎖️ **Frostfront Marshal** — Orders / Rifle / March |
| **Seele** | hero | assassin, melee-dps | dark · scythe | Thwack, Sheathed Blade, Butterfly Flurry, Resurgence | 🦋 **Moth Reaper** — Blade / Butterfly / Resurgence |
| **Natasha** | hero | healer, healer | physical · gun | Behind the Kindness, Love, Heal, and Choose, Gift of Rebirth, Innervation | 🩺 **Underworld Medic** — Care / Kindness / Rebirth |
| **Gepard** | hero | knight, tank | ice · fists | Fist of Conviction, Daunting Smite, Enduring Bulwark, Unyielding Will | 🛡️ **Glacier Warden** — Smite / Bulwark / Will |

</details>

### Pokémon Scarlet and Violet

A student at a region's academy rides a legendary creature across the series' first fully open world, catching and training monsters for turn-based battles. Three story routes (gyms, giant titans, a bully gang) can be tackled in any order.

**Systems:** `monster-taming`, `turn-based-combat`, `open-world`, `mounts`, `auto-battle`, `nonlinear-story-routes`, `type-shift-transform`, `raids`, `co-op-party` ✓, `crafting`, `trading` (✓ = we have it)

**Characters:** Nemona (tamer), Arven (tamer), Penny (tamer), Geeta (tamer)

**Original take:** A summer camp on Puddlehop Isle sends kids out on a gliding beetle to befriend critters, hunt three giant 'grandbeasts' in any order, and share picnic snacks that power up the team.

<details><summary><b>Characters</b> (9) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Nemona** [img](https://en.wikipedia.org/wiki/File:Nemona.png) | character | tamer, summoner | lightning · none | Terastallize, Spark (Pawmot), Thunder Wave (Pawmot), Rock Slide (Lycanroc) | ⚡ **Spark Captain** — Partner / Rivalry / Crystal |
| **Arven** | character | tamer, summoner | dark · none | Crunch (Mabosstiff), Earthquake (Garganacl), Stealth Rock (Garganacl), Icicle Spear (Cloyster) | 🦴 **Herbal Hound Keeper** — Hound / Salt Giant / Picnic |
| **Penny** | character | tamer, summoner | light · none | Moonblast (Sylveon), Hydro Pump (Vaporeon), Thunder (Jolteon), Quick Attack | 🎀 **Ribbon Hacker** — Partners / Water and Storm / Undercover |
| **Geeta** | boss | tamer, commander | earth · none | Terastallize (Glimmora), Sludge Wave (Glimmora), Kowtow Cleave (Kingambit), Earthquake (Avalugg) | 👑 **Grand Arbiter** — Ace / Generals / League |
| **Koraidon** [img](https://www.pokemon.com/us/pokedex/koraidon) | companion | shapeshifter, melee-dps | physical · claws | Collision Course, Orichalcum Pulse, Flamethrower, Drain Punch | 🦖 **Sunscale Charger** — Ancient Power / Sun / Claws |
| **Miraidon** [img](https://www.pokemon.com/us/pokedex/miraidon) | companion | shapeshifter, caster | lightning · none | Electro Drift, Hadron Engine, Parabolic Charge, Discharge | 🛸 **Voltwheel Glider** — Drift / Field / Pulse |
| **Sprigatito** [img](https://en.wikipedia.org/wiki/File:Sprigatito,_Floragato,_and_Meowscarada.png) | companion | rogue, melee-dps | nature · claws | Leafage, Magical Leaf, U-turn, Seed Bomb | 🌿 **Petal Prowler** — Leaves / Cat / Magic Show |
| **Fuecoco** [img](https://en.wikipedia.org/wiki/File:Fuecoco.png) | companion | mage, caster | fire · none | Ember, Flamethrower, Fire Blast, Yawn | 🎤 **Ember Crooner** — Flames / Song / Ember |
| **Quaxly** [img](https://www.pokemon.com/us/pokedex/quaxly) | companion | monk, melee-dps | water · none | Water Gun, Aqua Jet, Aqua Cutter, Liquidation | 💧 **Tidal Dancer** — Steps / Water / Pride |

</details>

### The Legend of Zelda: Tears of the Kingdom

A hero with a borrowed ancient arm explores a kingdom across three layers (floating sky islands, the surface and a dark underworld) to stop a returning demon king. Building powers let players glue objects into vehicles and fuse items onto weapons.

**Systems:** `open-world`, `physics-building`, `fuse-weapons`, `time-rewind`, `pass-through-ceilings`, `blueprint-autobuild`, `puzzles`, `collectible-upgrades`, `max-health-hazard`, `crafting`, `mounts`, `boss-fights` ✓ (✓ = we have it)

**Characters:** Link (warrior), Zelda (mage), Ganondorf (necromancer), Tulin (archer), Sidon (warrior), Yunobo (berserker), Riju (elementalist)

**Original take:** Kids explore Cloudhaven, an archipelago of floating meadows, with a tinker-glove that sticks planks, balloons and fans into rafts and gliders, and tape any pebble or pinecone onto their stick for silly new powers.

<details><summary><b>Characters</b> (8) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Link** [img](https://en.wikipedia.org/wiki/File:Link_(Hyrule_Historia).png) | character | warrior, melee-dps | physical · sword | Ultrahand, Fuse, Ascend, Recall | 🧩 **Glue-Arm Tinkerer** — Build / Rewind / Fuse |
| **Zelda** [img](https://en.wikipedia.org/wiki/File:Link_to_the_Past_Zelda.png) | character | mage, support | light · none | Recall, Draconification | 🌟 **Timeworn Seer** — Time / Light / Ascension |
| **Ganondorf** [img](https://zeldawiki.wiki/wiki/Demon_King_Ganondorf) | boss | necromancer, caster | dark · sword | Gloom Weapons, Gloom Wave, Demon King's Bow, Perfect Dodge | 👹 **Gloom Warlord** — Malice / Warlord / Ascendant |
| **Tulin** [img](https://zeldawiki.wiki/wiki/Tulin) | character | archer, ranged-dps | wind · bow | Power of Wind, Great Bow | 🪶 **Gale Fledgling** — Gust / Bow / Storm |
| **Sidon** [img](https://zeldawiki.wiki/wiki/Sidon) | character | warrior, tank | water · spear | Power of Water, Water Wave | 🌊 **Tidecrest Champion** — Bubble / Wave / Royal |
| **Yunobo** [img](https://zeldawiki.wiki/wiki/Yunobo) | character | berserker, tank | fire · none | Power of Fire, Wall Roll | 🪨 **Boulder Roller** — Roll / Mine / Fire |
| **Riju** [img](https://zeldawiki.wiki/wiki/Riju) | character | elementalist, caster | lightning · none | Lightning Field, Power of Lightning | 🌩️ **Sandstorm Chieftess** — Field / Strike / Desert |
| **Mineru** [img](https://zeldawiki.wiki/wiki/Mineru) | companion | summoner, tank | tech · fists | Construct Body, Fused Arms, Gloom Walker | 🤖 **Ancient Golem Pilot** — Arms / Frame / Spirit |

</details>

### Minecraft Dungeons

A family-friendly isometric dungeon crawler set in the block world, where up to four heroes free villages from an outcast villain corrupted by a magic orb. There are no classes: whatever weapon, armour and artifacts you pick up is your build.

**Systems:** `gear-defines-build`, `enchantment-points`, `artifact-slots`, `co-op-party` ✓, `procedural-dungeons`, `waves` ✓, `summons`, `shops` ✓, `secret-levels`, `roguelike-runs`, `story-chapters` ✓ (✓ = we have it)

**Original take:** Four cousins from Pebbleton crawl through the Mosslight Caverns, swapping found crossbows and frying pans freely, each with three trinket slots (a healing totem, a bee jar, a gust horn), to free the villages a lonely sulking wizard has locked away.

<details><summary><b>Characters</b> (9) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **The Hero** | character | warrior, melee-dps | physical · sword | Melee Weapon, Ranged Weapon, Artifacts, Enchantments | ⚔️ **Gearforged Champion** — Steel / Bowstring / Adventure |
| **Arch-Illager** | boss | summoner, summoner | arcane · staff | Energy Blasts, Push Back, Teleport, Enhance | 👑 **Exiled Sapphire Tyrant** — Sorcery / Command / Trickery |
| **Redstone Monstrosity** | boss | berserker, tank | fire · fists | Monstrous Slam, Fireball Volley, Redstone Fissures, Lava-Proof | 🌋 **Embercore Colossus** — Shockwave / Furnace / Colossus |
| **Blacksmith** | npc | worker, builder | none · hammer | Upgrades, Gear Sets | ⚒️ **Emberforge Tinsmith** — Anvil / Workshop / Delivery |
| **Luxury Merchant** | npc | worker, support | none · none | High-End Stock, Discounts, More Stalls | 💎 **Gilded Peddler** — Fine Goods / Haggling / Showroom |
| **Enchantsmith** | npc | mage, support | arcane · none | Reroll Enchantment, Points Back | 📘 **Runeweave Reroller** — Runes / Reroll / Library |
| **Iron Golem** | companion | knight, tank | physical · fists | Arm Swing, Double Slam, Iron Hide | 🛡️ **Bulwark Sentinel** — Fists / Guard / Weight |
| **Wolf** | companion | tamer, melee-dps | physical · claws | Bite, Loyal Follower, Called Again | 🐺 **Packfang Runner** — Fangs / Pack / Hunt |
| **Llama** | companion | tamer, ranged-dps | physical · none | Spit, Woolly Hide, Follower | 🦙 **Woolly Spitter** — Spit / Carpet / Stubborn |

</details>

### Hades

The underworld prince tries again and again to fight his way out of his father's realm, room by room, helped by gifts from the gods. Every death sends him home, where the story moves on and permanent upgrades await.

**Systems:** `roguelike-runs`, `upgrade-draft`, `dodge-roll`, `meta-progression`, `npc-dialogue` ✓, `npc-affinity`, `difficulty-tiers`, `assist-mode`, `boss-fights` ✓, `extra-lives` (✓ = we have it)

**Classes:** Stygian Blade (warrior), Eternal Spear (spearman), Shield of Chaos (knight), Heart-Seeking Bow (archer), Twin Fists (monk), Adamant Rail (gunner), Zagreus (warrior), Hades (necromancer), Megaera (assassin), Nyx (mage)

**Original take:** A young gardener keeps trying to climb out of the Root Kingdom, choosing one of three blessings from the weather spirits after each room; every tumble back home unlocks a new chat with the household and a permanent seed upgrade.

<details><summary><b>Characters</b> (12) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Zagreus** | character | warrior, melee-dps | physical · sword | Attack, Special, Dash, Cast | 🔥 **Runaway Ember Prince** — Escape Arms / Borrowed Favors / Restless Feet |
| **Hades** | boss | necromancer, controller | dark · spear | Sweep and Spin, Seeking Skull, Unseen Step, Call the Dead | 💀 **Warden of the Last Gate** — Sentence / Curses / Dominion |
| **Nyx** | npc | mage, support | dark · none | Mirror of Night, Keeper of the House | 🌙 **Mother of Midnight** — Starless Sky / Hushed Veil / Night Paths |
| **Achilles** | npc | spearman, tank | physical · spear | Codex of the Underworld, Martial Counsel | 🛡️ **Gatewatch Veteran** — Phalanx / Old Glory / Drills |
| **Zeus** | npc | elementalist, caster | lightning · none | Lightning Strike, Thunder Flourish, Electric Shot, Thunder Dash | ⚡ **Highpeak Thundercaller** — Bolts / Tempest Court / Majesty |
| **Poseidon** | npc | elementalist, controller | water · spear | Tempest Strike, Flood Shot, Tidal Dash, Poseidon's Aid | 🌊 **Tidebreaker Sovereign** — Undertow / Deep Fury / Brine |
| **Athena** | npc | paladin, support | light · spear | Deflect, Divine Dash, Phalanx Shot | 🦉 **Aegis of the Grey Eye** — Bulwark / Stratagem / Judgement |
| **Ares** | npc | berserker, melee-dps | blood · sword | Curse of Agony, Curse of Pain, Blade Rifts, Battle Rage | 🗡️ **Bloodrift Warlord** — Rifts / Doom / Bloodlust |
| **Artemis** | npc | archer, ranged-dps | nature · bow | Deadly Strike, Critical Hits, True Shot, Artemis' Aid | 🏹 **Moonlit Huntress** — Marksman / Stalker / Wild Moon |
| **Aphrodite** | npc | bard, controller | light · none | Weak, Charmed, Heartbreak Strike, Survival | 🌹 **Rosebloom Enchantress** — Allure / Heartache / Grace |
| **Demeter** | npc | elementalist, controller | ice · none | Chill, Frost Strike, Crystal Beam, Mistral Dash | ❄️ **Harvest-Frost Matron** — Winterfall / Blizzard / Old Earth |
| **Dionysus** | npc | bard, controller | poison · none | Drunken Strike, Drunken Flourish, Trippy Shot, Drunken Dash | 🍇 **Vineyard Reveler** — Festival / Vines / Merriment |

</details>

### Vampire Survivors

A hero who attacks automatically walks an endless field while ever-larger swarms close in, picking new weapons and passives at each level-up. It launched the 'bullet heaven' genre of auto-attack survival games.

**Systems:** `auto-attack`, `waves` ✓, `upgrade-draft`, `growing-weapon`, `loot` ✓, `timed-survival-finale`, `meta-progression`, `achievements`, `run-modifiers`, `co-op-party` ✓, `character-classes` ✓ (✓ = we have it)

**Original take:** A lantern-keeper strolls through Mothmeadow at dusk while her charms (orbiting fireflies, a bouncing acorn, a bubble wand) fire on their own; each level-up offers three new charms, and pairing two of them grows a super charm before the dawn bell rings.

<details><summary><b>Characters</b> (10) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Antonio Belpaese** | hero | warrior, melee-dps | physical · whip | Whip, Bloody Tear, Growing Might | 🪢 **Nightlash Brawler** — Lash / Grit / Pursuit |
| **Imelda Belpaese** | hero | mage, caster | arcane · wand | Magic Wand, Holy Wand, Quick Learner | ✨ **Sparkwright Scholar** — Seeking Sparks / Bright Studies / Swift Hands |
| **Gennaro Belpaese** | hero | rogue, ranged-dps | physical · thrown | Knife, Thousand Edge, Extra Projectile | 🔪 **Hundredfold Thrower** — Volley / Quickdraw / Footwork |
| **Arca Ladonna** | hero | elementalist, caster | fire · wand | Fire Wand, Hellfire, Quickening | 🔥 **Cinderwand Sorcerer** — Blaze / Embers / Smoke |
| **Porta Ladonna** | hero | elementalist, caster | lightning · none | Lightning Ring, Thunder Loop, Wide Reach | ⚡ **Stormcircle Adept** — Skyfall / Current / Wide Sky |
| **Poe Ratcho** | hero | druid, controller | poison · none | Garlic, Soul Eater, Long Reach Pickup | 🧄 **Pungent Wanderer** — Aura / Lingering / Old Bones |
| **Suor Clerici** | hero | cleric, healer | water · thrown | Santa Water, La Borra, Blessed Health, Wide Blessing | 💧 **Holyflask Sister** — Blessed Pools / Devotion / Faith |
| **Dommario** | hero | cleric, controller | light · tome | King Bible, Unholy Vespers, Long Sermons | 📖 **Orbiting Scripture Priest** — Circling Pages / Long Rites / Pulpit |
| **Mortaccio** | hero | necromancer, ranged-dps | dark · thrown | Bone, Bone Pile, Anima of Mortaccio | 🦴 **Rattlebone Pitcher** — Bouncing Throws / Ossuary / Grave Dance |
| **The Reaper** | boss | assassin, melee-dps | dark · scythe | Time's Up, Final Rush, Untouchable | ⌛ **Final-Minute Harvester** — Last Breath / Harvest / Stopped Clock |

</details>

### Slay the Spire

One of four heroes climbs a randomly generated spire along a branching map, fighting turn-based card battles and growing a deck from rewards. It popularised the roguelike deck-builder.

**Systems:** `deck-building`, `turn-based-combat`, `enemy-intent`, `roguelike-runs`, `permadeath`, `relics`, `rest-site-choice`, `potions` ✓, `shops` ✓, `difficulty-tiers`, `run-modifiers`, `meta-progression` (✓ = we have it)

**Classes:** The Ironclad (warrior), The Silent (assassin), The Defect (engineer), The Watcher (monk)

**Original take:** A study deck-climber for Gamory: climb the Lighthouse of Riddles with a hand of spell cards, see what each sea-gremlin plans next turn, and answer a quick question at campfires to upgrade a card instead of resting.

<details><summary><b>Characters</b> (6) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **The Ironclad** | class | warrior, melee-dps | fire · sword | Bash, Burning Blood, Whirlwind, Limit Break | 🛡️ **Hellbound Bulwark** — Brute Force / Infernal Pact / Iron Will |
| **The Silent** | class | assassin, melee-dps | poison · dagger | Neutralize, Ring of the Snake, Blade Dance, Deadly Poison | 🗡️ **Fogland Venomstalker** — Venom / Shivs / Fog |
| **The Defect** | class | engineer, caster | tech · none | Zap, Cracked Core, Dualcast, Glacier | 🤖 **Awakened Orb-Engine** — Channel / Coolant / Evoke |
| **The Watcher** | class | monk, melee-dps | light · staff | Eruption, Vigilance, Stances, Prostrate | 👁️ **Blindfold Ascetic** — Wrath / Calm / Divinity |
| **Corrupt Heart** | boss | mage, controller | blood · none | Beat of Death, Invincible, Blood Shots, Echo | 🫀 **Pulsing Throne Core** — Pulse / Torment / Dominion |
| **Neow** | npc | cleric, support | arcane · none | Blessings, Neow's Lament, Boss Swap, Resurrection | 🐋 **Abyssal Whale Oracle** — Gifts / Deep Water / Lament |

</details>

### Dead Cells

A headless blob of cells possesses a prisoner's body and fights across a cursed island in a 2D side-scrolling 'roguevania', losing its gear at every death. Collected cells buy permanent unlocks that make the next run richer.

**Systems:** `roguelike-runs`, `permadeath`, `procedural-dungeons`, `dodge-roll`, `meta-progression`, `stat-points`, `upgrade-draft`, `traversal-runes`, `weapon-reforge`, `boss-fights` ✓ (✓ = we have it)

**Characters:** The Beheaded (the Prisoner) (rogue)

**Original take:** A slime sprite hops between straw scarecrow bodies to escape a sunken toy castle; glowing beads from beaten wind-up foes buy permanent backpack upgrades, and torn recipe cards found deep inside unlock new tools for the next try.

<details><summary><b>Characters</b> (6) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **The Beheaded** | character | rogue, melee-dps | physical · sword | Rusty Sword, Beginner's Bow, Old Wooden Shield, Powerful Grenade | 🔥 **Headless Revenant** — Brutality / Tactics / Survival |
| **The Concierge** | boss | berserker, tank | fire · fists | Stab, Fire Strike, Leap, Shout | 🔥 **Bridgewarden Brute** — Lockdown / Pounce / Red Aura |
| **Conjunctivius** | boss | mage, ranged-dps | dark · none | Magic Bolts, Body Slam, Aura of Laceration, Rain of Bolts | 👁️ **Chained Eye Horror** — Gaze / Tendrils / Rage |
| **The Time Keeper** | boss | assassin, melee-dps | physical · sword | Sword Slash, Shuriken, Hook and Slash, Lightspeed | ⏳ **Hourglass Duelist** — Lightspeed / Stars / Stopped Moment |
| **The Hand of the King** | boss | knight, tank | physical · spear | Lance Sweep, Bomb Flurry, Call the Guard, Charge | 🏰 **Royal Lancer Guardian** — Lance / Shock / Siege |
| **The Collector** | boss | mage, caster | arcane · none | Syringe Lunge, Syringe Spin, Bomb Smash, Energy Orbs | 💉 **Mad Alchemist of Stars** — Needle / Concoctions / Observatory |

</details>

### Stardew Valley

A city worker inherits a grandfather's overgrown farm and restores it season by season while befriending a small town. Cosy and open-ended, with a monster-filled mine for players who want some adventure.

**Systems:** `seasonal-farming`, `resource-gathering`, `crafting`, `animal-husbandry`, `use-based-skills`, `npc-affinity`, `collection-bundles`, `daily-energy`, `day-night`, `descending-mine`, `fishing`, `co-op-party` ✓, `housing` (✓ = we have it)

**Original take:** A study farm: kids grow a pumpkin patch in Brambleby where each watering is a quick question, deliver basket sets to reopen the old greenhouse, and visit a friendly mole's tunnel for some gentle monster-shooing.

<details><summary><b>Characters</b> (11) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **The Farmer** | character | worker, builder | nature · tools | Farming, Pickaxe, Sword, Fishing | 🌾 **Homestead Harvester** — Fields / Harvest / Cave Days |
| **Lewis** | npc | commander, commander | none · none | Town Festivals, Community Affairs, The Missing Shorts | 🎩 **Townhall Steward** — Announcements / Order / Celebration |
| **Pierre** | npc | worker, support | nature · none | General Store, Bigger Backpack | 🌱 **Seedmonger Sentinel** — Seed Stock / Store Shelves / Seasons |
| **Robin** | npc | engineer, builder | nature · tools | Farm Buildings, House Upgrades, Furniture | 🔨 **Timberframe Raiser** — Framing / Lumber / Workshop |
| **Clint** | npc | engineer, builder | fire · hammer | Tool Upgrades, Geode Cracking, Furnace | ⚒️ **Anvilheart Smith** — Forge / Geodes / Temper |
| **Marnie** | npc | tamer, support | nature · none | Ranch Shop, Hay and Feed | 🐄 **Pasture Beastcaller** — Herd / Pasture / Feed |
| **Willy** | npc | ranger, support | water · tools | Fish Shop, Boat Repair | 🎣 **Harborline Angler** — Line / Sea Spray / Old Salt |
| **The Wizard** | npc | mage, caster | arcane · staff | Obelisks, Spirit Hut, Shrine of Illusions | 🔮 **Woodland Tower Arcanist** — Arcana / Warp / Elements |
| **Marlon** | npc | warrior, melee-dps | physical · sword | Monster Eradication Goals, Guild Shop, Veteran's Advice | ⚔️ **Guildhall Veteran** — Veteran's Blade / Monster Hunt / Old Scars |
| **Krobus** | npc | rogue, support | dark · none | Sewer Shop, Roommate | 🌑 **Gloomtunnel Trader** — Shade / Undercity / Night Market |
| **Junimos** | companion | summoner, builder | nature · none | Crop Gathering, Hut Dwellers | 🌟 **Forest Sprite Helpers** — Gathering / Forest Song / Hop Along |

</details>

### Terraria

A 2D sandbox where players dig, build and fight across a procedurally generated world, crafting better gear to take on a long ladder of bosses. Beating a key boss flips the world into a harder second half.

**Systems:** `procedural-dungeons`, `resource-gathering`, `crafting`, `base-building`, `housing`, `shops` ✓, `gear-defines-build`, `boss-fights` ✓, `boss-gated-world`, `world-events`, `spreading-biome`, `co-op-party` ✓, `character-customization` ✓, `creative-mode` (✓ = we have it)

**Classes:** Melee (warrior), Ranged (gunner), Magic (mage), Summoner (summoner)

**Original take:** Kids dig into Burrowland, build cottages that attract a baker, a medic and a map-seller, and craft better shovels and slingshots to summon and beat a ladder of giant pests, from a jelly king to a moon moth.

<details><summary><b>Characters</b> (11) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Melee** | class | warrior, melee-dps | physical · sword | Swords and Spears, Boomerangs, Yoyos, Warrior Emblem | 🗡️ **Bladestorm Vanguard** — Blades / Charge / Solar Fury |
| **Ranged** | class | gunner, ranged-dps | physical · gun | Bows and Repeaters, Guns, Launchers, Quivers and Scopes | 🎯 **Deadeye Fusilier** — Shots / Heavy Ordnance / Scout |
| **Magic** | class | mage, caster | arcane · staff | Wands and Staves, Magic Guns, Spell Books, Mana | 🔮 **Starlit Sorcerer** — Nebula / Tomes / Cosmos |
| **Summoner** | class | summoner, summoner | arcane · whip | Whips, Minions, Sentries, Minion Slots | 🐉 **Beastbond Caller** — Pack / Sentries / Whip |
| **Eye of Cthulhu** | boss | berserker, melee-dps | dark · none | Servants, Triple Charge, Second Form | 👁️ **Gazing Night Sentinel** — Ram / Brood / Unveiled Maw |
| **Moon Lord** | boss | mage, caster | arcane · none | Phantasmal Bolt, Phantasmal Sphere, Phantasmal Eye, Phantasmal Deathray | 🌌 **Celestial Eye Titan** — Deathray / Phantasms / Cosmic Dread |
| **The Guide** | npc | ranger, support | none · bow | Tips, Crafting Lookup | 🧭 **Trailwise Pathfinder** — Pointers / Trailcraft / Know-How |
| **The Nurse** | npc | cleric, healer | light · none | Healing, Cure | 🩹 **Fieldward Medic** — Remedy / Triage / Bedside |
| **The Dryad** | npc | druid, support | nature · none | Nature Shop, World Report | 🌿 **Grovebinder Warden** — Roots / Bloom / Purity |
| **The Arms Dealer** | npc | gunner, support | physical · gun | Gun Shop, Ammunition | 🔫 **Bulletforge Quartermaster** — Stockpile / Heavy Goods / Specials |
| **The Goblin Tinkerer** | npc | engineer, builder | tech · tools | Reforging, Tinkerer's Workshop | 🔧 **Gearwrench Reworker** — Gadgets / Rework / Tinker |

</details>

### Baldur's Gate 3

A party infected with mind-controlling parasites seeks a cure across a fantasy realm, in a game built on the fifth-edition tabletop rules. Real-time exploration turns into turn-based tactical combat, and dice rolls decide fights, locks and conversations.

**Systems:** `turn-based-combat`, `dice-rolls`, `character-classes` ✓, `multiclassing`, `stat-points`, `dialogue-choices`, `elemental-reactions`, `checkpoint-rest`, `quests` ✓, `character-customization` ✓, `co-op-party` ✓, `respec` (✓ = we have it)

**Classes:** Barbarian (berserker), Fighter (warrior), Rogue (rogue), Wizard (mage), Cleric (cleric), Druid (druid), Paladin (paladin), Bard (bard)

**Original take:** Mechanics only (mature work): a gentle turn-based 'dice tactics' mode for Gamory where a party of four rolls a big friendly die for each swing or spell, and puddles of oil or water combine with fire and frost on the battlefield.

<details><summary><b>Characters</b> (18) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Barbarian** [img](https://bg3.wiki/wiki/Barbarian) | class | berserker, melee-dps | physical · axe | Rage, Reckless Attack, Unarmoured Defence, Extra Attack | 🪓 **Feral Ravager** — Fury / Axe / Primal |
| **Bard** [img](https://bg3.wiki/wiki/Bard) | class | bard, support | arcane · instrument | Bardic Inspiration, Vicious Mockery, Healing Word, Song of Rest | 🎻 **Lutecaster Troubadour** — Song / Words / Stage |
| **Cleric** [img](https://bg3.wiki/wiki/Cleric) | class | cleric, healer | light · mace | Guiding Bolt, Spirit Guardians, Healing Word, Bless | ✝️ **Sanctum Herald** — Radiance / Guardians / Faith |
| **Druid** [img](https://bg3.wiki/wiki/Druid) | class | druid, caster | nature · staff | Wild Shape, Thorn Whip, Entangle, Moonbeam | 🌿 **Grovebound Shifter** — Vines / Moon / Beast |
| **Fighter** [img](https://bg3.wiki/wiki/Fighter) | class | warrior, tank | physical · sword | Second Wind, Action Surge, Fighting Style, Extra Attack | ⚔️ **Veteran Blademaster** — Surge / Style / Battlefield |
| **Monk** [img](https://bg3.wiki/wiki/Monk) | class | monk, melee-dps | physical · fists | Flurry of Blows, Patient Defence, Step of the Wind, Stunning Strike | 🥋 **Open Palm Ascetic** — Ki / Wind / Stillness |
| **Paladin** [img](https://bg3.wiki/wiki/Paladin) | class | paladin, tank | light · hammer | Divine Smite, Lay on Hands, Divine Sense, Aura of Protection | 🛡️ **Oathsworn Vanguard** — Smite / Oath / Aura |
| **Ranger** [img](https://bg3.wiki/wiki/Ranger) | class | ranger, ranged-dps | nature · bow | Hunter's Mark, Ensnaring Strike, Hail of Thorns, Favoured Enemy | 🏹 **Thornwild Tracker** — Mark / Thorns / Wilds |
| **Rogue** [img](https://bg3.wiki/wiki/Rogue) | class | rogue, melee-dps | physical · sword | Sneak Attack, Cunning Action: Hide, Cunning Action: Dash, Uncanny Dodge | 🗡️ **Duskstep Cutpurse** — Shadows / Knives / Tricks |
| **Sorcerer** [img](https://bg3.wiki/wiki/Sorcerer) | class | elementalist, caster | arcane · staff | Chromatic Orb, Fire Bolt, Fireball, Metamagic | 🔮 **Bloodspark Channeler** — Elements / Shaping / Wellspring |
| **Warlock** [img](https://bg3.wiki/wiki/Warlock) | class | mage, caster | arcane · dagger | Eldritch Blast, Hex, Armour of Agathys, Pact Magic | 🕯️ **Pactbound Hexer** — Blast / Curse / Patron |
| **Wizard** [img](https://bg3.wiki/wiki/Wizard) | class | mage, caster | arcane · staff | Magic Missile, Fireball, Arcane Recovery, Transcribing Scrolls | 📖 **Spellbook Scholar** — Evocation / Study / Wards |
| **Astarion** [img](https://en.wikipedia.org/wiki/File:Astarion_Ancun%C3%ADn_Render.png) | character | rogue, melee-dps | dark · dagger | Sneak Attack, Cunning Action: Hide, Vampire Bite, Arcane Trickster | 🦇 **Pale Nightstalker** — Night / Fangs / Trickster |
| **Gale** [img](https://bg3.wiki/wiki/Gale) | character | mage, caster | arcane · staff | Magic Missile, Evocation School, Arcane Recovery, Arcane Hunger | ⭐ **Starweave Savant** — Evocation / Hunger / Study |
| **Karlach** [img](https://bg3.wiki/wiki/Karlach) | character | berserker, melee-dps | fire · axe | Rage, Reckless Attack, Infernal Fury, Heart of Iron | 🔥 **Furnace Heart** — Engine / Axe / War |
| **Lae'zel** [img](https://bg3.wiki/wiki/Lae'zel) | character | warrior, melee-dps | physical · greatsword | Second Wind, Action Surge, Battle Master, Great Weapon Fighting | 🗡️ **Astral Duelist** — Manoeuvres / Greatsword / Raider |
| **Shadowheart** [img](https://en.wikipedia.org/wiki/File:ShadowheartBG3.png) | character | cleric, healer | dark · mace | Blessing of the Trickster, Bless, Healing Word, Fear of Wolves | 🌑 **Veiled Acolyte** — Trickery / Moonlit / Faith |
| **Wyll** [img](https://bg3.wiki/wiki/Wyll) | character | mage, caster | fire · sword | Eldritch Blast, Hex, The Fiend, Rapier Training | 🗡️ **Frontier Pactblade** — Pact / Duellist / Curse |

</details>

### Ni no Kuni II: Revenant Kingdom

A boy king driven from his castle sets out to found a new kingdom where everyone can be happy, uniting rival nations along the way. Storybook action RPG with tiny elemental helper sprites in battle and a town to build and manage.

**Systems:** `real-time-combat` ✓, `party-switching`, `summons`, `base-building`, `open-world`, `diorama-world-map`, `quests` ✓, `story-chapters` ✓, `shops` ✓ (✓ = we have it)

**Characters:** Evan Pettiwhisker Tildrum (knight), Roland Crane (warrior), Tani (spearman), Batu (berserker), Leander (mage), Bracken Meadows (engineer)

**Original take:** A kitten-eared prince builds the new town of Kindlewick between quests, giving each rescued villager a job at the bakery or forge, while a cloud of tiny weather sprites tags along in fights to cast puddle and gust spells.

<details><summary><b>Characters</b> (7) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Evan Pettiwhisker Tildrum** | character | knight, melee-dps | fire · sword | Flurry, Fireball, Water Balloon, Pyre Pillar | 👑 **Young Crown Founder** — Blade / Wand / Crown |
| **Roland Crane** | character | warrior, melee-dps | physical · gun | Flatliner, Circular Sword, Heavy Ammo, Swathe Cutter | 🎩 **Twice-Born Envoy** — Sword / Pistol / Statesman |
| **Tani** | character | spearman, ranged-dps | wind · spear | Hail of Arrows, Bird's-Eye Bolt, Windwhirl, Spark Spike | 🏹 **Cloudcliff Raider** — Arrows / Spear / Wind |
| **Batu** | character | berserker, tank | earth · hammer | Stone Slinger, Strongman Stance, Cannon Shot, In a Spin | 🔨 **Canyon Chieftain** — Hammer / Stance / Artillery |
| **Leander** | character | mage, caster | water · spear | Water Balloon, Spark Spike, Stone Slinger, Titan's Javelin | 🔱 **Tideward Archon** — Sea / Storm / Titan |
| **Bracken Meadows** | character | engineer, builder | tech · hammer | Health Hub, Static Wall, Reflector Drone, Infinite Ammo | 🔧 **Gearwright Inventor** — Gadgets / Workshop / Arsenal |
| **Higgledies** | companion | summoner, support | arcane · none | Elemental Spells, Power Up | 🧚 **Sprite Shepherd** — Fire Sprites / Water Sprites / Earth Sprites |

</details>

### Prodigy Math Game

An online fantasy RPG where a young wizard recovers five stolen keystones by winning turn-based spell battles, and every spell is powered by answering a math question. Teachers use it to set work and track progress, and defeated monsters can be rescued as pets.

**Systems:** `study-questions` ✓, `turn-based-combat`, `monster-taming`, `pets`, `quests` ✓, `boss-fights` ✓, `elemental-reactions`, `teacher-dashboard`, `character-customization` ✓, `difficulty-tiers`, `co-op-party` ✓, `membership-tiers` (✓ = we have it)

**Characters:** The player wizard (mage), Noot (bard), Theo Addiwise (mage), The Puppet Master (summoner)

**Original take:** Young spell-scholars at the Inkwell School recharge their wands by solving quick sums, befriend the mischief-sprites they calm down, and relight five lighthouse lamps the Thimble Thief knocked out, with every unlock earned in play, not bought.

<details><summary><b>Characters</b> (5) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **The Student Wizard** | character | mage, caster | arcane · wand | Answer to Cast, Elemental Spells, Rescue a Pet, Pet Team | 🪄 **Academy Spellstudent** — Fire and Ice / Earth and Storm / Water and Wonder |
| **Noot** | npc | bard, support | light · none | Guidance, First Lesson | 🧚 **Pixie Pathlight** — Glow / Flutter / Lessons |
| **Theo Addiwise** | npc | mage, caster | arcane · wand | Lend a Wand, Practice Duel | 📚 **Borrowed-Wand Tutor** — Classroom / Study Hall / Recess |
| **The Puppet Master** | boss | summoner, controller | dark · none | Scatter the Keystones, Puppet Spell, Shadow Bosses, Escape | 🎭 **Stringbound Shade Lord** — Strings / Shades / Stagecraft |
| **Pets** | companion | tamer, summoner | none · none | Element, Pet Spells, Grows Stronger | 🐾 **Elemental Beast Pal** — Fire and Ice / Earth and Storm / Wild Heart |

</details>

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

<details><summary><b>Characters</b> (20) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Sung Jin-woo (early hunter)** [img](https://en.wikipedia.org/wiki/Sung_Jin-woo) | character | assassin, melee-dps | physical · dagger | Kandiaru's Blessing, Dagger Rush, Mutilation, Stealth | 🗡️ **Nightfang Duelist** — Knifework / Dread / Veil |
| **Sung Jin-woo (Shadow Monarch)** [img](https://en.wikipedia.org/wiki/Sung_Jin-woo) | character | necromancer, summoner | dark · dual-blades | Shadow Extraction, Shadow Exchange, Shadow Preservation, Monarch's Domain | 👑 **Umbral Sovereign** — Legion / Sovereignty / Umbra |
| **Cha Hae-in** | character | warrior, melee-dps | light · sword | Swordsmanship (the Dancer), Sword of Light, Mana sense | ⚔️ **Gleamstep Fencer** — Radiant Edge / Waltz / Keen Sense |
| **Thomas Andre** | character | berserker, tank | physical · fists | Power Smash, Capture, Ruler's Authority, Spiritual Body Manifestation | 👊 **Colossus Brawler** — Iron Fist / Gold Hide / Earthbreaker |
| **Liu Zhigang** | character | warrior, melee-dps | physical · sword | Mana-charged sword, Ruler's Authority | 🌠 **Skyrender Swordsman** — Wave Edge / Swift Form / Unseen Hand |
| **Baek Yoon-ho** | character | shapeshifter, melee-dps | physical · claws | Beast Transformation (partial), Beast Transformation (full), Tiger claws | 🐅 **Frostmane Prowler** — Pounce / Fang and Claw / Pride |
| **Choi Jong-in** | character | elementalist, caster | fire · none | Flame Spear, Flame Dragon, Guided fireballs | 🔥 **Ember Lancer Magus** — Pyre / Kindling / Ringfire |
| **Go Gun-hee** | character | commander, commander | light · fists | Ruler's Authority, Fragment of Brilliant Light | 🏮 **Lantern Patriarch** — Old Guard / Golden Light / Last Stand |
| **Igris** | companion | knight, melee-dps | dark · sword | Swordsmanship, Commander's Touch, Shadow regeneration | 🛡️ **Scarlet Oath Blade** — Oathsteel / Duel / Banner |
| **Beru** | companion | berserker, melee-dps | dark · claws | Claw frenzy, Healing Magic, Gluttony, Size Manipulation | 🐜 **Chitin Reaver** — Hunger / Venom / Royal Will |
| **The Ant King** | boss | berserker, melee-dps | poison · claws | Silent kill, Paralysis Poison, Gluttony, Regeneration | 🦂 **Hive Tyrant** — Predator / Toxin / Gorge |
| **Tusk** | companion | mage, caster | arcane · staff | Gravitation Magic, Hymns, Shadow regeneration | 🪨 **Gravity Chanter** — Weight / War Hymn / Ritual |
| **Iron** | companion | warrior, tank | dark · shield | Shout of Provocation, Shadow regeneration | 📣 **Bulwark Bellower** — Taunt / Bastion / Grit |
| **Tank** | companion | berserker, tank | ice · claws | Bulldozer charge, Crushing blow, Shadow regeneration | 🐻 **Glacier Bruin** — Plow / Frost Hide / Avalanche |
| **Bellion** | companion | knight, melee-dps | dark · whip | Extendable blade, Flight, Shadow regeneration | 🪽 **Lash Marshal** — Reach / Wings / Command |
| **The Statue of God** | boss | warrior, tank | arcane · none | Eye lasers, Stomp, The Commandments, Temple statues | 🗿 **Idol of the Throne** — Gaze / Weight / Rite |
| **The Architect** | boss | summoner, summoner | arcane · none | Statue puppets, Ten-minute trial, Trance | 🏛️ **Marble Puppeteer** — Workshop / Clockwork / Design |
| **Baran** | boss | elementalist, caster | lightning · none | Lightning Breath, White Flames, Hell's Army | ⚡ **Pale Storm Overlord** — Thunderhead / Bolt Form / Infernal Host |
| **Antares** | boss | elementalist, caster | fire · none | Breath of Destruction, Dragon's Fear, Army of dragons, Spiritual Body Manifestation | 🐉 **Cataclysm Wyrmlord** — Ruin / Terror / True Form |
| **Kamish** | boss | berserker, melee-dps | fire · claws | Destructive firepower, Immense strength, Dragon's Fear | 🔥 **Crimson Wyrm** — Inferno / Scale and Claw / Sky Terror |

</details>

### Solo Leveling: Arise

An action RPG of the Solo Leveling webtoon where you play Sung Jin-woo and recruited hunters through the story, clearing gates, raiding bosses and extracting shadows of defeated foes to fight beside you. A premium PC edition, Arise Overdrive, followed on Steam and Xbox PC in November 2025.

**Systems:** `real-time-combat` ✓, `character-classes` ✓, `shadow-army`, `stat-points`, `class-advancement`, `dungeon-portals`, `story-chapters` ✓, `boss-fights` ✓, `tower-climb`, `roster-restricted-modes`, `guilds`, `gear-upgrading`, `co-op-party` ✓, `gacha` (✓ = we have it)

**Characters:** Sung Jin-woo (necromancer), Cha Hae-in (warrior), Yoo Jin-ho (warrior), Sugimoto Reiji (assassin), Seorin (gunner)

**Original take:** Lanternfall Raids: a party of rift-wardens dives into coloured rifts (calm blue, sealed crimson, collapsing grey), and each defeated boss can be bound as a lantern-wraith whose leader bonus colours the whole team's attacks.

<details><summary><b>Characters</b> (10) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Sung Jinwoo** | hero | necromancer, summoner | dark · dual-blades | Multistrike, Armor Break, Death's Dance, Crushing Blow | 💀 **Rune-Fist Reaper** — Knuckles / Dance / Dominion |
| **Cha Hae-In** | hero | warrior, melee-dps | light · sword | Swift Sword, Sword Dance, The Dancer, Sword of Light | ✨ **Brandmark Fencer** — Swift Steel / Mark / Finale |
| **Thomas Andre** | hero | berserker, tank | light · fists | Cold-blooded Pummel, Gigantic Hammer Slam, Colossal Crush, Return of the King | 🥊 **Bastion Pugilist** — Pummel / Wolfburst / Plated |
| **Choi Jong-In** | hero | elementalist, caster | fire · none | Spark, Blast, Rain of Flames, Flame Spear | ☄️ **Skyspear Pyromancer** — Spears / Bullets / Wyrm |
| **Go Gunhee** | hero | monk, tank | light · fists | Chairman's Will, Abdominal Crush, Fighting Spirit, Power of Brilliant Light | 🌟 **Radiant Elder Fist** — Iron Will / Shockwave / Nova |
| **Baek Yoonho** | hero | shapeshifter, tank | light · fists | White Flame Strike, White Flame Pummel, Ferocious Spirit, White Flame Gale Kick | 🦶 **Pale Flame Striker** — Fist and Foot / Storm / Beast Heart |
| **Goto Ryuji** | hero | warrior, tank | wind · katana | Shiver Storm, Death Gale, Phantom's Heavenly Hurricane, Reverse Tempest | 🌀 **Gale Iaido Warden** — Draw / Whirlwind / Unbroken |
| **Lim Tae-Gyu** | hero | archer, ranged-dps | dark · bow | Dark Shot, Volley Fire, Shoot and Maneuver, Typhoon Fire | 🏹 **Duskbow Sniper** — Volley / Heavy Shot / Footwork |
| **Min Byung-Gu** | hero | cleric, healer | light · mace | Judgment of Light, Holy Mace, Light's Glimmer, Conviction of Light | ✚ **Halo Mender** — Rite / Radiance / Mace |
| **Yoo Jinho** | hero | knight, tank | light · sword | Sword and Shield, X-Slash!, My Turn!, Trust Me! | 🛡️ **Gilded Squire** — Charge / Courage / Guard |

</details>

### Tower of God

Bam, who grew up beneath a vast Tower, opens its door to follow his friend Rachel and climbs it floor by floor, passing tests of strength, speed and wit. Climbers called Regulars form teams with set positions and fight with Shinsu, the Tower's magic-like water.

**Systems:** `tower-climb`, `character-classes` ✓, `mana-resource` ✓, `co-op-party` ✓, `rank-system`, `puzzles`, `growing-weapon`, `gacha` (✓ = we have it)

**Classes:** Fisherman (warrior), Spear Bearer (spearman), Light Bearer (bard), Scout (rogue), Wave Controller (elementalist), Twenty-Fifth Bam (mage), Khun Aguero Agnis (bard), Rak Wraithraiser (spearman), Yuri Ha Jahad (warrior), Urek Mazino (berserker), Shibisu (rogue)

**Original take:** Spire of Trials: a squad picks five roles (striker, lancer, lamplighter, pathfinder, tide-caller) and climbs a spire where every floor is a different test, some fights and some riddles, and the tide of magic gets thicker the higher you go.

<details><summary><b>Characters</b> (12) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Twenty-Fifth Bam** | character | mage, caster | water · none | Shinsu orbs, Flow control, Technique copying, High Shinsu resistance | 🌊 **Tidewalker Prodigy** — Orbs / Current / Mimic |
| **Khun Aguero Agnis** | character | bard, support | ice · spear | Lighthouses, Ice spear, White Heavenly Mirror, Manbarondenna | 🔦 **Beacon Tactician** — Beacons / Frost Lance / Gambit |
| **Rak Wraithraiser** | character | spearman, ranged-dps | earth · spear | Spear mastery, Compression Lisensor, Stone shield, High Shinsu resistance | 🦎 **Boulder Lancer** — Hunt / Stone / Bravado |
| **Rachel** | character | bard, support | light · none | Lighthouse control, Betrayal | 🌟 **Starward Schemer** — Lamplight / Push / Nightfall |
| **Yuri Ha Jahad** | character | warrior, melee-dps | nature · whip | Green April, Black March, Nuclear Punch, Rose Shower | 🌹 **Briar Princess** — Vinewood / Petals / Temper |
| **Endorsi Jahad** | character | assassin, melee-dps | physical · thrown | Needle, Lapen pins, Agility | 📍 **Pinwheel Duchess** — Needlework / Footwork / Pinwheel |
| **King Jahad** | boss | warrior, melee-dps | water · fists | Contract with the Guardians, Front-line mastery, Shinsu mastery | ♔ **Untouchable Sovereign** — Crown / Conquest / Divine Water |
| **Fisherman** | class | warrior, melee-dps | water · none | Frontline assault, Shinsu reinforcement, Ray Barracuda (Urek Mazino's style) | 🎣 **Riptide Vanguard** — Hook / Reel / Flash |
| **Spear Bearer** | class | spearman, ranged-dps | water · spear | Spear support, Spear throw | 🔱 **Longreach Lancer** — Throw / Pin / Rebound |
| **Light Bearer** | class | bard, support | light · none | Lighthouse scouting, Lighthouse barrier | 💡 **Lamplighter** — Lamps / Relay / Barrier |
| **Scout** | class | rogue, support | physical · dagger | Ground reconnaissance, Swift skirmish | 🧭 **Trailfinder** — Pathfinding / Skirmish / Signal |
| **Wave Controller** | class | elementalist, controller | water · none | Flow control, Reverse flow control, Shinsu shaping | 💧 **Tidecaller** — Flow / Counterflow / Shaping |

</details>

### The Beginning After the End

King Grey is reborn as Arthur Leywin in Dicathen, a land of magic, races and mana beasts, and grows up with a bonded dragon while trying not to repeat his past life's mistakes. A war against the Vritra, a clan of banished deities, later forces him to lead.

**Systems:** `regression`, `rank-system`, `character-classes` ✓, `elemental-reactions`, `pets`, `beast-will`, `co-op-party` ✓, `story-chapters` ✓ (✓ = we have it)

**Characters:** Arthur Leywin (King Grey) (elementalist), Sylvie (shapeshifter), The Six Lances (knight), The Twin Horns (warrior)

**Original take:** Second Dawn: a reborn wizard-child raises a hatchling wyrm while a heart-crystal glows through colour bands as it grows, choosing at each band between a body-forging path or a spell-throwing path.

<details><summary><b>Characters</b> (10) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Arthur Leywin** | character | elementalist, melee-dps | lightning · sword | Swordsmanship, Thunderclap Impulse, Absolute Zero, Burst Step | ⚡ **Twicecrowned Duelist** — Quadra Arts / Swordplay / Stilled Hour |
| **Sylvie** | companion | shapeshifter, support | arcane · claws | Dragon forms, Dragon fire, Bond link, Life aether art | 🐉 **Scaleborn Guardian** — Wingborne / Breath / Kinship |
| **Regis** | companion | summoner, melee-dps | dark · claws | Shadow wolf, Gauntlet Form, Destruction fire, Aether battery | 🐺 **Umbral Hound** — Fang / Ruin Flame / Bound Spirit |
| **Tessia Eralith** | character | druid, caster | nature · sword | Wind spells, Root bind, Swordplay, Elderwood Guardian will | 🌿 **Thornwind Princess** — Gale / Grove / Leafblade |
| **Jasmine Flamesworth** | character | assassin, melee-dps | wind · dual-blades | Twin daggers, Wind augmentation, Wind-thrown blade | 🗡️ **Galestep Duelist** — Paired Edges / Tailwind / Fieldcraft |
| **Virion Eralith** | character | tamer, commander | wind · sword | Wind blade, Shadow panther will, Beast-will lore, Command | 🐆 **Panther Elder** — Sky Edge / Prowler / Old King |
| **Lucas Wykes** | character | elementalist, caster | fire · staff | Fire conjuring, Enhanced fire | 🔥 **Gilded Pyromancer** — Blaze / Wildfire / Pride |
| **Nico Sever** | boss | elementalist, caster | earth · staff | Dark metal spikes, Fire and mana arts, Artificing | 🗡️ **Ironthorn Scythe** — Spikes / Forge-Fire / Artifice |
| **Cecilia (the Legacy)** | boss | elementalist, caster | arcane · none | Mana absorption, Elemental storms, Mana denial, Flight | 🌀 **Manawell Sovereign** — Drain / Tempest / Frost Crown |
| **Agrona Vritra** | boss | mage, controller | dark · none | Memory tampering, Bond-channel takeover, Decay arts, Pocket dimension | 👑 **Hornlord Schemer** — Rot / Puppetry / Folded Realm |

</details>

### Omniscient Reader's Viewpoint

Office worker Kim Dokja is the only person who finished a long web novel about surviving the apocalypse, and when its events come true he uses his knowledge of the plot to change the ending. Goblin-like dokkaebi run deadly scenarios while watching constellations sponsor the survivors.

**Systems:** `quests` ✓, `sponsor-constellations`, `audience-streaming`, `currency` ✓, `regression`, `foreknowledge`, `co-op-party` ✓ (✓ = we have it)

**Characters:** Kim Dokja (bard), Yoo Joonghyuk (warrior), Han Sooyoung (rogue), Jung Heewon (warrior)

**Original take:** Chapter Zero: the city becomes a storybook whose narrator-imps hand out timed chapters to survive, while sky-spirits in the audience gift stickers of power to the readers they like best.

<details><summary><b>Characters</b> (10) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Kim Dokja** | character | bard, support | arcane · sword | Omniscient Reader's Viewpoint, Fourth Wall, Bookmark, Way of the Wind | 📖 **Margin Scribe** — Annotated / Borrowed Pages / Ink Wall |
| **Yoo Joonghyuk** | character | warrior, melee-dps | physical · sword | Breaking the Sky Swordsmanship, Sage's Eye, Giant Body Transformation, Red Phoenix Shunpo | ⚔️ **Hundredfold Blade** — Sky-Splitter / Phoenix Step / Old Rounds |
| **Han Sooyoung** | character | rogue, support | fire · dagger | Avatar, Black Flame, Advent of Half-God, Lie Detection | 🖋️ **Ghostwriter Flame** — Drafts / Black Fire / Half-God |
| **Jung Heewon** | character | paladin, melee-dps | fire · sword | Swordsmanship, Hour of Judgment, Hellfire, Demon Slaying | ⚖️ **Verdict Blade** — Judgment / Sacred Fire / Swordswoman |
| **Lee Hyunsung** | character | knight, tank | earth · shield | Steel Transformation, Last Steel, Sword and Shield | 🛡️ **Ironwall Sentinel** — Steelskin / Bulwark / Partner Guard |
| **Shin Yoosung** | character | tamer, summoner | nature · none | Taming, Diverse Communication, Hybridization, Agile Feet | 🐾 **Beastspeaker** — Pack / Wild Blood / Chimera |
| **Lee Jihye** | character | commander, summoner | water · katana | Kendo, Instant Kill, Ghost Fleet, Demon Slaying | ⚓ **Phantom Admiral** — Deck Blade / Fleet / Fog |
| **Yoo Sangah** | character | bard, controller | arcane · none | Interpreter, Binding Thread, Hermes Walking Method, Hour of Mandala | 🪷 **Lotus Weaver** — Threads / Winged Step / Mandala |
| **Abyssal Black Flame Dragon** | companion | summoner, caster | fire · none | Black Flame, Breath, Dark Shadow Phoenix, Meteor Strike | 🐲 **Midnight Wyrm** — Nightfire / Shadow Wing / Edgelord |
| **Nirvana Moebius** | boss | mage, controller | light · none | Thought Infection, Eternal Nightmare, Thousand Hands, Reincarnation | 🙏 **Hundredhand Prophet** — Doctrine / Mandala Hands / Halo |

</details>

### Overgeared

Down-on-his-luck Shin Young-woo plays the VR game Satisfy as Grid until an S-rank quest makes him Pagma's Successor, a legendary blacksmith class. Forging legendary gear turns him from a nobody into a power in the game.

**Systems:** `vr-game-world`, `crafting`, `class-advancement`, `loot-rarity` ✓, `character-classes` ✓, `quests` ✓, `guilds`, `npc-dialogue` ✓ (✓ = we have it)

**Characters:** Grid (Shin Young-woo) (engineer), Yura (mage), Euphemina (mage), Huroi (bard)

**Original take:** Anvilheart: a clumsy apprentice at a village forge discovers a hidden smith-hero calling, crafts gear that can be worn by any class, and outfits a party that grows from the village to the capital.

<details><summary><b>Characters</b> (8) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Grid** | character | engineer, melee-dps | physical · greatsword | Legendary Blacksmith's Creation, Restraint, Link, Wave | ⚒️ **Anvil Paladin** — Forge / Sword Dance / Overkill |
| **Jishuka** | character | archer, ranged-dps | fire · bow | Hawk Eyes, Phoenix Arrow, Breaking Evil Arrow, Fly Up | 🏹 **Emberfeather Sniper** — Far Sight / Firebird / Hunter |
| **Yura** | character | gunner, ranged-dps | light · gun | Dark Storm, Magic bullets, Hell Leap, Hell Summoning | 🔫 **Hellgate Gunslinger** — Bullets / Underworld / Dark Arts |
| **Euphemina** | character | mage, caster | arcane · staff | Duplicator, Copied spell barrage, Stardust, Barriers | 🪄 **Mimic Archmage** — Copies / Starfall / Wardwork |
| **Huroi** | character | bard, support | light · sword | Morale Boost, Provocation, Unbreakable Justice, Sacrifice for Justice | 📣 **Herald of Vows** — Oratory / Vow / Partner |
| **Braham** | character | mage, caster | arcane · staff | Enhanced magic, Magic Contemplation, Mana Drain, Punishment | 📜 **Sage of Unmaking** — Rewrite / Elements / Arcane Step |
| **Kraugel** | character | warrior, melee-dps | physical · sword | Sword Saint, Super Sensitivity, Space Sword, Heart Sword | 🗡️ **Edgeborn Saint** — Severance / Pale Steps / Storm Swords |
| **Agnus** | boss | necromancer, summoner | dark · staff | Raise the dead, Corpse Explosion, Body Shield, Absolute Domination | 💀 **Gravecall Warlock** — Legion / Detonate / Death Pact |

</details>

### The Greatest Estate Developer

A civil engineering student wakes up inside a fantasy novel as Lloyd Frontera, a lazy noble whose family is drowning in debt. He uses modern engineering, a knight, a giant hamster and magic to build his way out of a grim fate.

**Systems:** `base-building`, `transmigration`, `crafting`, `debt-economy`, `pets`, `npc-dialogue` ✓ (✓ = we have it)

**Characters:** Lloyd Frontera (engineer), Javier Asrahan (knight)

**Original take:** Bridgewright Manor: a young lord with a toolbelt rebuilds a debt-ridden valley one mill, road and bridge at a time, guarded by a stern squire and helped by a round, pocket-stuffing pet.

<details><summary><b>Characters</b> (5) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Lloyd Frontera** | character | engineer, builder | earth · tools | Engineering know-how, Summoned helpers, Commissioned works | 📐 **Blueprint Baron** — Earthworks / Crew / Projects |
| **Javier Asrahan** | character | knight, tank | physical · sword | Swordsmanship, Bodyguard | 🛡️ **Ironvow Guard** — Oath / Blade / Grandmaster |
| **Ppodong** | companion | shapeshifter, builder | nature · claws | Giant growth, Heavy hauling | 🐹 **Seedfed Colossus** — Big Paws / Burrow / Snack Break |
| **Bangul** | companion | shapeshifter, builder | earth · none | Giant growth, Earth processing | 🐍 **Slagcoil Serpent** — Coils / Ash / Steelmaker |
| **Hamang** | companion | shapeshifter, tank | water · none | Giant growth, Heavy body | 🦛 **Floodbelly Titan** — Bulk / Waterlogged / Bellow |

</details>

### Second Life Ranker

Cha Yeon-woo learns his twin brother was betrayed and killed while climbing the Tower of the Sun God, then finds the brother's hidden diary in a pocket watch. Climbing under the name Cain with the diary as his guide, he hunts his brother's killers.

**Systems:** `tower-climb`, `inherited-guidebook`, `leaderboards`, `guilds`, `summons`, `boss-fights` ✓, `dragon-form` (✓ = we have it)

**Characters:** Cha Yeon-woo (Cain) (warrior), Edora (warrior), Nayu, the Martial King (monk), Yvlke (commander), Leonte, the Fist God (monk)

**Original take:** Twin's Ledger: a hero climbs a spire using a sibling's scribbled map-book, whose notes reveal hidden shortcuts on each floor until the pages go blank and the hero must chart the rest alone.

<details><summary><b>Characters</b> (7) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Cha Yeon-woo** | character | assassin, melee-dps | dark · dagger | Paired daggers, Draconic Eyes, Sword Thunder, Sky Wings | 🗝️ **Masked Wyrmblade** — Twin Fangs / Thunder Arts / Dead Legion |
| **Edora** | character | warrior, melee-dps | light · sword | Insight, Yang Sword, One-horned swordsmanship, Spirit Contact | 🔆 **Dawnhorn Seer** — Clear Sight / Horn Sword / Spirit |
| **Nayu, the Martial King** | character | monk, melee-dps | physical · fists | Eight Extreme Fists, Walking Archive, Condensed air blows, Space collapse | 👊 **Eightfold Fist King** — Eight Ways / Sky Breaker / King's Spirit |
| **Phante** | character | monk, melee-dps | lightning · fists | Thunder Regime, Thunderbolt punch, Blood Lightning, Myriad Lightning | ⚡ **Stormfist Heir** — Thunder Fists / Red Storm / Brawler |
| **Shanon** | companion | knight, tank | dark · greatsword | Sword Breaker, Aura thorns, Death Knight, Conquest | 💀 **Bluefire Revenant** — Breaker / Bluefire / Conquest |
| **Leonte** | boss | elementalist, caster | lightning · spear | Storm Bringer, Borrowed barriers, Gungnir | 🌩️ **Thiefstorm Magus** — Tempest / Stolen Core / Spear |
| **The Summer Queen** | boss | elementalist, caster | fire · none | Breath, Hell Fire, Meteor Strike, Dragon Fear | 🐉 **Crimson Wyrm Empress** — Breath / Dominion / Bone Wings |

</details>

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

<details><summary><b>Characters</b> (1) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Kim Yuwon** | character | warrior, melee-dps | arcane · sword | Mana Sword, Mana Bomb, Gigantification | ⏳ **Rewound Climber** — Mana Edge / Blast / Titan |

</details>

### The Gamer

High-schooler Han Ji-han suddenly sees his life as a video game, with levels, stats, skills and quests. He is drawn into the Abyss, a hidden world of ability users and rival clans, and has to grind his way stronger while keeping up with school.

**Systems:** `leveling` ✓, `stat-points`, `use-based-skills`, `quests` ✓, `instant-dungeon`, `world-hud`, `calm-mind-passive`, `guilds` (✓ = we have it)

**Characters:** Han Ji-han (mage), Shin Seon-il (warrior), Kim Yujin (mage)

**Original take:** Homework Hero: a student whose world shows health bars and quest pop-ups levels up chores, sports and spells by practice, and opens pocket training rooms full of monsters after school.

<details><summary><b>Characters</b> (5) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Han Jihan** | character | mage, caster | arcane · staff | Gamer's Mind, Mana arrows, Earth spirit summon, Mana shield | 🎮 **Respawn Scholar** — Hotbar / Summons / Mind Grip |
| **Kwon Si-yeon** | character | monk, melee-dps | fire · fists | Soul-burning fist, Soul burn | 🔥 **Emberheart Brawler** — Fist / Burn / Embers |
| **Hwan Seong-gon** | boss | summoner, summoner | dark · none | Black summoning, Absorption | 🕯️ **Soulgather Warden** — Black Host / Devour / Dark Pact |
| **Lolikiano Mistream** | character | summoner, caster | dark · staff | Life reaping, Devil summoning | 🧙 **Grimharvest Witch** — Harvest / Pact / Hex |
| **Horutipia Aholting** | character | druid, tank | nature · fists | Oak hymn, Druid warrior | 🌳 **Oakroot Bulwark** — Grove Song / Brawl / Old Growth |

</details>

### Noblesse

Rai, a noble who slept for 820 years, wakes in modern South Korea and enrolls at a high school founded by his loyal servant Frankenstein. Their quiet school days are broken by the Union, a secret organisation that builds modified humans.

**Systems:** `school-hub`, `blood-contract`, `modified-humans`, `co-op-party` ✓, `boss-fights` ✓, `story-chapters` ✓ (✓ = we have it)

**Characters:** Cadis Etrama Di Raizel (Rai) (mage), Frankenstein (warrior), M-21 (berserker)

**Original take:** Night Prefect: an ancient sleeper wakes as the new student at a seaside academy and, with a fussy headmaster-butler, guards classmates from a lab that builds clockwork-enhanced bruisers.

<details><summary><b>Characters</b> (10) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Cadis Etrama Di Raizel** [img](https://noblesse-anime.com/character/index.php) | character | mage, caster | blood · none | Blood Field, Mind control, Overwhelming presence, Life-force cost | 🩸 **Crimson Sleeper** — Red Domain / Will / Ancient Grace |
| **Frankenstein** [img](https://noblesse-anime.com/character/index02.php) | character | warrior, melee-dps | dark · spear | Dark Spear, Sealed power, Modification genius | 🖤 **Soulspear Butler** — Hungry Spear / Unsealed / Lab Coat |
| **M-21** [img](https://noblesse-anime.com/character/index03.php) | character | shapeshifter, melee-dps | physical · claws | Werewolf heart, Body transformation, Claw strikes, Mind resistance | 🐺 **Silverfang Guard** — Fang / Wild Heart / Experiment |
| **Regis K. Landegre** [img](https://noblesse-anime.com/character/index04.php) | character | spearman, melee-dps | blood · spear | Noble strength, Soul weapon lance, Close combat | 🎩 **Etiquette Lancer** — Heirloom / Pride / Grace |
| **Seira J. Loyard** [img](https://noblesse-anime.com/character/index05.php) | character | assassin, melee-dps | dark · scythe | Death Scythe, Noble strength, Mind link | 🌙 **Silent Harvester** — Reaper / Moonlit / Pale Rite |
| **Tao** [img](https://noblesse-anime.com/character/index06.php) | character | engineer, support | tech · none | Hacking and tracking, Disruption, D drug boost | 💻 **Glitchwire Rogue** — Hack / Code / Boost |
| **Takeo** [img](https://noblesse-anime.com/character/index07.php) | character | gunner, ranged-dps | tech · rifle | Long-range sniping, Close-range strikes, D drug boost | 🎯 **Farshot Warden** — Scope / Overwatch / Close Guard |
| **Rajak Kertia** | character | assassin, melee-dps | blood · dual-blades | Kartas, Hidden aura, Copies, Assassin's speed | 🗡️ **Twinfang Phantom** — Paired Fangs / Many Selves / Unseen |
| **Krantz** [img](https://noblesse-anime.com/character/index10.php) | boss | berserker, melee-dps | physical · fists | Bare-handed fighting, Absorb a comrade, D drug boost | 🦾 **Squadeater Brute** — Fists / Absorb / Overdose |
| **Dr. Crombel** | boss | engineer, commander | tech · none | Hidden strength, Modified agents | 🧪 **Vatwork Overseer** — Specimens / Lab / Hidden Power |

</details>

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

<details><summary><b>Characters</b> (8) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Seo Jiwoo** | character | elementalist, melee-dps | lightning · fists | Super speed, Electric strike, Cat-like reflexes | ⚡ **Sparkpaw Sprinter** — Speed / Voltage / Whiskers |
| **Kayden Break** | character | shapeshifter, melee-dps | lightning · fists | Electricity, Cat form, Force control, One-man army | 🐈 **Thunderwhisker Master** — Storm Paw / Nine Lives / Overwhelm |
| **Yoo Jiyoung** | character | elementalist, caster | wind · none | Wind mastery, Gale burst | 🌪️ **Galecourt Chair** — Gale / Authority / Swift Air |
| **Yoo Jisuk** | character | elementalist, melee-dps | wind · fists | Aerokinesis, Battle experience | 💨 **Gustbrawl Kid** — Wind Fists / Street / Updraft |
| **Wooin** | character | mage, controller | arcane · none | Telekinesis, Telekinetic hold | 🌀 **Stillhand Adept** — Grip / Throw / Focus |
| **Lee Subin** | character | elementalist, caster | ice · none | Cryokinesis, Freezing field | ❄️ **Rimecrest Prodigy** — Frost / Blizzard / Glacier |
| **Kartein** | character | cleric, healer | light · none | Impenetrable defense, Healing | 🩺 **Bastion Physician** — Wards / Treatment / Discipline |
| **Kang Su-pil** | boss | commander, commander | earth · none | Gravity Hole, Baekdu command | 🕳️ **Gravewell Tyrant** — Gravity / Tyranny / Collapse |

</details>

### SSS-Class Revival Hunter

A Tower full of monsters hands people skill cards, and Kim Gongja gets one that copies the skill of whoever kills him. Killed by the top hunter, he copies a power that sends him back 24 hours whenever he dies, and climbs the Tower by learning from every death.

**Systems:** `regression`, `copy-skill`, `skill-cards`, `tower-climb`, `rank-system`, `summons`, `boss-fights` ✓ (✓ = we have it)

**Characters:** Kim Gongja (rogue), Yoo Soo-ha, the Flame Emperor (elementalist), The Sword Emperor (warrior)

**Original take:** Echo Climber: when a mirror-mage is knocked out the day rewinds and they keep a copy of the move that beat them, so every floor of the spire becomes a puzzle of picking which foe to learn from.

<details><summary><b>Characters</b> (5) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Kim Gong-ja** | character | rogue, melee-dps | dark · sword | I Want to Become Just Like You, Returner's Clockwork Watch, Infernal Heavens Demonic Art, Hundred Ghosts Reincarnation | ⏱️ **Rewind Duelist** — Second Try / Grief Sword / Ghost Host |
| **Sword Emperor (Bae Hu-ryeong)** | companion | warrior, melee-dps | physical · greatsword | Aura mastery, Dawn Circle Sword, Heart sword, Climber's eye | ☀️ **Sunblade Phantom** — Dawn Edge / Sovereign / Mentor |
| **Yoo Soo-ha** | boss | elementalist, caster | fire · none | Flame power, Returner's Clockwork Watch | 🔥 **Ashcrown Regent** — Blaze / Inferno / Arrogance |
| **Anastasia Zelenska** | character | mage, support | arcane · orb | Instant Transfer, Mirrors | 🪞 **Glasswalk Witch** — Mirrors / Transfer / Reflection |
| **So Baek-hyang** | character | monk, melee-dps | dark · sword | Infernal Heavens Demonic Art, Sword of Freezing, True chi | 🖌️ **Inkwell Sovereign** — Nine Sorrows / Frozen Form / Chi |

</details>

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

<details><summary><b>Characters</b> (9) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Frieren** [img](https://en.wikipedia.org/wiki/File:Frierencharacter.png) | character | mage, caster | arcane · staff | Zoltraak, Defensive magic, Mana suppression, Field of flowers | 📜 **Thousand-Year Archivist** — Killing Line / Patience / Old Battles |
| **Fern** [img](https://en.wikipedia.org/wiki/File:Ferninfobox.png) | character | mage, ranged-dps | arcane · staff | Zoltraak, Rapid casting, Out-of-range shot, Full-power Zoltraak | ⚡ **Quickdraw Adept** — Rapid Fire / Long Sight / Discipline |
| **Stark** [img](https://en.wikipedia.org/wiki/File:StarkFriereninfobox.png) | character | warrior, tank | physical · axe | One-blow strike, Front line, Hold it down, Take the hit | 🪓 **Trembling Vanguard** — Cleaving / Courage / Front Line |
| **Himmel** | character | knight, melee-dps | physical · sword | Hero's swordplay, Barrier-breaking cut, Unbroken will | 🌠 **Starlit Champion** — Duelist / Promise / Long Road |
| **Sein** | character | cleric, healer | light · none | Healing spells, Curse resistance | ⛪ **Wayside Chaplain** — Mending / Warding / Wanderer |
| **Übel** | character | mage, melee-dps | arcane · none | Cleaving magic, Copy by empathy, Borrowed binding | ✂️ **Whimsy Shearer** — Edges / Mimicry / Appetite |
| **Denken** | character | mage, caster | arcane · staff | High-level spell barrage, Curse-reflecting ward, Old soldier's grit, Zoltraak | 🎖️ **Grizzled Magister** — Barrage / Endurance / Finisher |
| **Aura** | boss | summoner, summoner | dark · none | Scales of Obedience, Puppet army | ⚖️ **Puppet Arbiter** — Balance / Marionettes / Pride |
| **Macht** | boss | mage, controller | earth · none | Diagolze, Mage-breaker | 🪙 **Gilt Warden** — Alchemy / Dominion / Curiosity |

</details>

### Sword Art Online

Ten thousand players are trapped in a full-dive virtual MMO where dying in the game means dying for real, and can only leave by clearing all 100 floors of a floating castle. Later arcs move the same players through other virtual worlds.

**Systems:** `permadeath`, `tower-climb`, `raids`, `guilds`, `pvp` ✓, `combo-attacks`, `monster-taming`, `crafting`, `shops` ✓, `linked-worlds` (✓ = we have it)

**Characters:** Kirito (warrior), Asuna (warrior), Sinon (gunner), Leafa (warrior), Silica (tamer), Lisbeth (worker), Klein (warrior), Heathcliff (knight)

**Original take:** Spire of Hundred Gates: a party climbs a floating tower floor by floor; every floor ends in a raid boss that needs one player drawing its attention while the others heal and strike, and a knocked-out player sits out the rest of the climb.

<details><summary><b>Characters</b> (11) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Kirito** [img](https://en.wikipedia.org/wiki/File:Kirito_Sword_Art_Online.png) | character | warrior, melee-dps | physical · dual-blades | Sword skills, Dual Blades, Bullet deflection, Twin-blade release | ⚔️ **Midnight Duelist** — Twin Steel / Solo Play / Night Release |
| **Asuna** [img](https://en.wikipedia.org/wiki/File:Asuna_Sword_Art_Online.png) | character | warrior, melee-dps | physical · sword | Rapier speed, Healing magic, Mother's Rosario, Cooking | 🤺 **Comet Fencer** — Lunge / Elevenfold / Mending Tide |
| **Sinon** | character | gunner, ranged-dps | physical · rifle | Hécate II snipe, Counter-snipe, Grenade, Bow shot | 🎯 **Far Ridge Marksman** — Long Barrel / Overwatch / Demolition |
| **Leafa** | character | warrior, melee-dps | wind · sword | Kendo swordplay, Fairy flight, Protective magic | 🍃 **Glade Skyrunner** — Dojo Forms / Wingbeat / Breeze |
| **Silica** | character | tamer, summoner | physical · dagger | Beast tamer, Pina, Pneuma Flower | 🐉 **Pocket Wyrmkeeper** — Little Wings / Companion / Revival |
| **Lisbeth** | character | worker, builder | physical · hammer | Blacksmithing, Gear upgrades | 🔨 **Anvil Maiden** — Forge / Temper / Ore Hunt |
| **Klein** | character | warrior, melee-dps | physical · katana | Katana, Guild leader | 🗡️ **Bandana Ronin** — Iai / Comrades / Stubborn |
| **Yuuki** | character | warrior, melee-dps | physical · sword | Undefeated duelist, Mother's Rosario | 🌀 **Unbeaten Challenger** — Eleven Strikes / Duel Isle / Guildmates |
| **Eugeo** | character | warrior, melee-dps | ice · sword | Learned sword skills, Blue Rose Sword release, Ice life-drain | 🌹 **Frostbloom Woodsman** — Thorn Ice / Woodcutter / Bloom Drain |
| **Alice** | character | knight, melee-dps | light · sword | Knight's swordplay, Gathered sacred arts, Dragon rider | ☀️ **Sunlit Sentinel** — Gathered Light / Wyrm Rider / Integrity |
| **Heathcliff** | boss | knight, tank | physical · shield | Sword-and-board skill, Perfect parry, Immortal object | 🛡️ **Aegis Architect** — Bulwark / Creator's Rule / Counter |

</details>

### That Time I Got Reincarnated as a Slime

An office worker is reborn as a slime that can devour anything and copy its skills, befriends a sealed dragon and gathers monsters into a nation of his own. Neighbouring kingdoms, heroes and demon lords then try to ally with it or destroy it.

**Systems:** `copy-skill`, `ally-evolution`, `class-advancement`, `base-building`, `crafting`, `skill-advisor`, `boss-fights` ✓, `co-op-party` ✓ (✓ = we have it)

**Characters:** Rimuru Tempest (shapeshifter), Benimaru (warrior), Shuna (cleric), Shion (berserker), Souei (assassin), Ranga (shapeshifter), Veldora Tempest (elementalist), Milim Nava (berserker)

**Original take:** Puddle King: you play a little gel creature that swallows foes to borrow their tricks; every creature you befriend and name grows into a stronger form and moves into your growing burrow-town.

<details><summary><b>Characters</b> (11) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Rimuru Tempest** | character | shapeshifter, caster | arcane · none | Predator, Great Sage, Human mimicry, Revival | 💧 **Azure Devourer** — Devour / Analysis / Federation |
| **Veldora Tempest** | character | elementalist, caster | wind · none | Catastrophe aura, Dragon form, True Dragon rebirth | 🌪️ **Sealed Wyrmlord** — Gale Breath / Aura / Ancient |
| **Benimaru** | character | warrior, commander | fire · katana | Black Flame, Hell Flare, Born Leader | 🔥 **Ember Shogun** — Black Fire / Field Command / Blade Art |
| **Shion** | character | berserker, melee-dps | physical · greatsword | Brute strength, Dreadful cooking, Wicked Oni | 💜 **Fierce Attendant** — Overkill / Kitchen Peril / Bodyguard |
| **Shuna** | character | cleric, healer | light · none | Holy magic, Purification, Barrier, Clothcraft | 🌸 **Shrine Weaver** — Sanctity / Barrier / Loom |
| **Diablo** | character | commander, commander | dark · none | Forcefield, Healing, True nature, Black Numbers | 🎩 **Ebon Steward** — Primordial / Loyalty / Schemes |
| **Ranga** | companion | shapeshifter, melee-dps | wind · claws | Death Storm, Pack leader, Rider fusion | 🐺 **Howling Packlord** — Squall Fang / Pack Hunt / Rider Bond |
| **Milim Nava** | character | berserker, melee-dps | physical · fists | Catastrophe-level power, Stampede, Monster-slaying blow | 💥 **Tiny Calamity** — Havoc / Romp / Friendship |
| **Hinata Sakaguchi** | character | paladin, melee-dps | light · sword | Swordswoman, Skill theft, Anti-magic barrier | ✝️ **Pale Crusader** — Purge / Null Field / Discipline |
| **Clayman** | boss | commander, controller | dark · none | Bound servants, Puppet summoning, Control necklace | 🎭 **String Puller** — Strings / Puppets / Plots |
| **Orc Lord** | boss | berserker, melee-dps | poison · none | Starved, Devour and evolve, Adaptation | 🍖 **Famished Warlord** — Hunger / Horde / Adapt |

</details>

### Overlord

When a VR MMO shuts down, its last loyal player is pulled into a new world as his undead overlord avatar, together with his guild's tomb and its now-living NPCs. Mechanics only: the story centres on a villain protagonist and brutal violence.

**Systems:** `dungeon-defense`, `living-npcs`, `guilds`, `tiered-magic`, `summons`, `secret-identity`, `world-items`, `base-building` (✓ = we have it)

**Characters:** Ainz Ooal Gown (necromancer), Albedo (warrior), Shalltear Bloodfallen (warrior), Demiurge (commander), Cocytus (warrior), Aura Bella Fiora (tamer), Sebas Tian (monk), Pandora's Actor (shapeshifter)

**Original take:** Crypt Keeper: you are the friendly keeper of a living crypt; place a guardian on each floor, then raise skeleton helpers between waves as adventurer parties try to reach your throne room.

<details><summary><b>Characters</b> (12) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Ainz Ooal Gown** | character | necromancer, summoner | dark · staff | Instant-death spells, Create undead, Super-Tier magic, Time stop | 💀 **Tomb Sovereign** — Death Tier / Legion / Stillness |
| **Albedo** | character | knight, tank | dark · polearm | Hermes Trismegistus, Bardiche, Ginnungagap | 🖤 **Raven Warden** — Bastion / Void Relic / Devotion |
| **Shalltear Bloodfallen** | character | warrior, melee-dps | blood · none | Melee and magic, Blood Frenzy, Last stand | 🦇 **Crimson Countess** — Thirst / Night Arts / Undying |
| **Aura Bella Fiora** | character | tamer, summoner | nature · whip | Beast summoning, Whip, Bow | 🐾 **Menagerie Ranger** — Beast Calls / Lash / Archery |
| **Mare Bello Fiore** | character | druid, caster | earth · staff | Druid magic, Earth shaping | 🌍 **Timid Earthshaper** — Rift / Grove / Hidden Burrow |
| **Demiurge** | character | commander, commander | fire · none | Hellfire Wall, Grand strategy, Demon-emperor guise | 🕴️ **Spectacled Strategist** — Inferno / Grand Plan / Masquerade |
| **Cocytus** | character | warrior, melee-dps | ice · dual-blades | Many weapons, Cryokinesis, Warrior's respect | 🧊 **Fourfold Frost Duelist** — Glacial / Many Arms / Honour |
| **Sebas Tian** | character | monk, melee-dps | physical · fists | Unarmed combat, Drop kick, Iron body | 🥋 **Gentleman Brawler** — Fists / Composure / Justice |
| **Gazef Stronoff** | character | warrior, melee-dps | physical · sword | Razor Edge, Kingdom's treasures, Warrior Captain | 🎖️ **Commoner Captain** — Edge / Endurance / Last Duel |
| **Death Knight** | companion | knight, tank | dark · sword | Raised from the fallen, Undead enforcer | ⚰️ **Grave Sentinel** — Bulwark / March / Grave |
| **Clementine** | boss | assassin, melee-dps | physical · dagger | Triple daggers, Rogue warrior | 🗡️ **Medal-Clad Stiletto** — Stab / Hunt / Trophy |
| **Khajiit Dale Badantel** | boss | necromancer, summoner | dark · none | Skeletal dragons, Undead city rite | 🦴 **Ossuary Cultist** — Bone Wyrms / Ritual / Cult |

</details>

### The Rising of the Shield Hero

Four young men are summoned as legendary heroes to fight waves of monsters, and the one given only a shield, unable to attack, is framed and shunned. He builds a party of his own and earns trust back. Mechanics only: slavery, abuse and a false-assault plot are central.

**Systems:** `character-classes` ✓, `defend-only-hero`, `waves` ✓, `class-advancement`, `leveling` ✓, `monster-taming`, `mounts`, `rage-form`, `currency` ✓ (✓ = we have it)

**Characters:** Naofumi Iwatani (knight), Raphtalia (warrior), Filo (shapeshifter), Ren Amaki (warrior), Motoyasu Kitamura (spearman), Itsuki Kawasumi (archer)

**Original take:** Bulwark Bearer: one player carries an unbreakable shield and cannot attack while the others do the damage; together they hold a village through timed rift-waves while a hatchling bird ally grows bigger each night.

<details><summary><b>Characters</b> (11) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Naofumi Iwatani** [img](https://en.wikipedia.org/wiki/File:NaofumiIwatani.png) | character | knight, tank | physical · shield | Air Strike Shield, Shield of Wrath, Iron Maiden, Portal shield | 🟩 **Wrathful Bulwark** — Barrier / Wrath / Escort |
| **Raphtalia** | character | warrior, melee-dps | light · katana | Vassal Katana, Illusion magic, Eight Trigrams Blade of Destiny, Hengen Muso | 🦝 **Mirage Ronin** — Illusion / Edge / Balance |
| **Filo** | companion | shapeshifter, melee-dps | wind · claws | Filolial Queen, Human form, Wind magic | 🪶 **Plume Courier** — Talon Kicks / Gusts / Queen |
| **Motoyasu Kitamura** | character | spearman, melee-dps | fire · spear | Chaos Spear, Air Strike Javelin, Liberation Fireheal, Portal Spear | 🔱 **Lovestruck Lancer** — Point / Blaze / Charge |
| **Ren Amaki** | character | warrior, melee-dps | physical · sword | Hundred Swords, Comet Sword, Transport Sword | ☄️ **Lone Raider** — Starfall / Solo / Guild Master |
| **Itsuki Kawasumi** | character | archer, ranged-dps | lightning · bow | Thunder Shoot, Shining Arrow, Transfer Bow, Accuracy | 🏹 **Righteous Marksman** — Bolt / Volley / Justice |
| **Rishia Ivyred** | character | ranger, ranged-dps | physical · thrown | Seven Star Projectile, Life force, Hidden strength | ⭐ **Late-Blooming Thrower** — Projectiles / Inner Force / Late Bloomer |
| **Glass** | character | monk, melee-dps | arcane · none | Fan martial arts, Soul Power | 🪭 **Silken Fan Dancer** — Dance / Spirit / Honour |
| **Raph-chan** | companion | summoner, support | light · none | Borrowed illusions, Homing familiar | 🍂 **Tanuki Familiar** — Mischief / Illusion / Homing |
| **Malty S. Melromarc** | boss | mage, caster | fire · none | Fire magic, Manipulation | 🔥 **Scheming Pyromancer** — Cinders / Deceit / Flames |
| **Kyo Ethnina** | boss | summoner, summoner | dark · tome | Spirit Tortoise control, Familiar army, Vassal Book | 📕 **Tome Tyrant** — Research / Beast Rig / Soul Harvest |

</details>

### Mushoku Tensei: Jobless Reincarnation

A reclusive man is reborn as a baby in a world of swords and sorcery with his memories intact and resolves to live without regrets, following him from childhood magic lessons to old age. Mechanics only: it is criticised for sexualising underage characters.

**Systems:** `silent-casting`, `sword-schools`, `rank-system`, `mentors`, `scatter-event`, `story-chapters` ✓, `mana-resource` ✓, `dream-patron`, `boss-fights` ✓ (✓ = we have it)

**Characters:** Rudeus Greyrat (mage), Roxy Migurdia (mage), Eris Boreas Greyrat (warrior), Ruijerd Superdia (warrior), Sylphiette (mage), Orsted (warrior)

**Original take:** Second Spring: a young spell-student learns to cast without words before anyone else; after a rift scatters the valley's families, the player escorts two friends home across three regions, picking a sword school or spell tutor to train with at each stop.

<details><summary><b>Characters</b> (8) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Rudeus Greyrat** [img](https://en.wikipedia.org/wiki/File:RudeusMushoku.png) | character | mage, caster | earth · staff | Chantless casting, Earth magic, Quagmire, Huge mana pool | 🪨 **Silent Geomancer** — Bedrock / Mire / No Words |
| **Eris Boreas Greyrat** | character | warrior, melee-dps | physical · sword | Sword-God style, Hot-blooded guard | ⚔️ **Scarlet Vanguard** — First Strike / Temper / Sanctuary |
| **Sylphiette** | character | mage, caster | arcane · none | Chantless casting, Rain spell, Royal bodyguard | 🌧️ **Silver Warden** — Weather / Guard Duty / Swift |
| **Ruijerd Superdia** | character | warrior, melee-dps | physical · spear | Superd spear, Escort | 🔱 **Exiled Spearwarden** — Spear / Guardian / Hunter |
| **Paul Greyrat** | character | warrior, melee-dps | physical · dual-blades | Three sword styles, Twin swords, Berserk fury | 🗡️ **Threefold Swordsman** — Offence / Flow / Father |
| **Ghislaine Dedoldia** | character | warrior, melee-dps | physical · sword | Sword King, Enhancement spells | 🐾 **Feral Bladeking** — Mastery / Beast / Tutor |
| **Orsted** | boss | warrior, melee-dps | physical · none | Dragon God, Aura of dread, Overwhelming force | 🐲 **Dreadborne Wyrmlord** — Dominance / Dread / Ancient Arts |
| **Manatite Hydra** | boss | warrior, tank | arcane · none | Mana absorption, Head regrowth | 🐍 **Crystal Coil** — Heads / Crystal / Lair |

</details>

### KonoSuba: God's Blessing on This Wonderful World!

A shut-in gamer is sent to a fantasy world with MMORPG rules and drags the goddess who mocked him along, then forms a party of brilliant but hopeless misfits. A comedy that turns RPG tropes upside down.

**Systems:** `character-classes` ✓, `classless-generalist`, `one-shot-nuke`, `luck-stat`, `flawed-heroes`, `boss-fights` ✓, `shops` ✓, `respawn-rules` (✓ = we have it)

**Characters:** Kazuma Satou (rogue), Aqua (cleric), Megumin (elementalist), Darkness (paladin), Wiz (mage), Yunyun (mage)

**Original take:** Blunder Squad: four misfit heroes, each with one huge power and one silly flaw (a blaster who can fire only once, a guard who never hits), take odd jobs from a frontier-town board to pay the rent, then face a headless knight.

<details><summary><b>Characters</b> (10) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Kazuma Satou** [img](https://en.wikipedia.org/wiki/File:Kazuma_Sato.png) | character | rogue, support | physical · sword | Steal, Drain Touch, Freeze and Create Water, Snipe | 🍀 **Lucky Opportunist** — Swipe / Cheap Tricks / Long Shot |
| **Aqua** | character | cleric, healer | water · none | Turn Undead, Resurrection, Purification, Curse removal | 💦 **Tidal Archpriestess** — Purify / Revival / Party Tricks |
| **Megumin** | character | elementalist, caster | fire · staff | Explosion, Single-spell devotion | 💥 **One-Shot Blastcaster** — Grand Blast / Chant / Collapse |
| **Darkness** | character | paladin, tank | physical · sword | Iron defence, Living shield, Wild swings | 🛡️ **Unflinching Crusader** — Hold / Wild Swings / Noble Duty |
| **Wiz** | character | mage, caster | dark · none | Drain Touch, Teleport, Explosion, Spirit guide | 🕯️ **Gentle Lich Shopkeeper** — Undeath / Arcana / Shopkeeping |
| **Yunyun** | character | mage, caster | arcane · staff | Combat spells, Rival duels | 🎀 **Lonely Spellblade** — Duel / Clan Arts / Friendship |
| **Chris** | character | rogue, melee-dps | physical · dagger | Steal, Bind, Gentleman thief | 🌙 **Moonlit Burglar** — Light Fingers / Rooftops / Divine Secret |
| **Verdia** | boss | knight, tank | dark · sword | Death curse, Undead army, Weak to water | 🪦 **Headless Warlord** — Curse / Legion / Knightly Duel |
| **Vanir** | boss | commander, controller | dark · none | Foresight, Mask possession, Spare body, Explosive dolls | 🎭 **Masked Prophet** — Mockery / Masks / Dolls |
| **Hans** | boss | shapeshifter, controller | poison · none | Devour and mimic, Deadly poison | 🫧 **Toxic Glutton** — Engulf / Venom / Mimic |

</details>

### Delicious in Dungeon

After a red dragon swallows one of their own, a party with no supplies dives back into the dungeon to save her before she is digested, cooking and eating the monsters they fight along the way. It treats the dungeon as a living ecosystem.

**Systems:** `meal-buffs`, `living-off-the-land`, `dungeon-ecology`, `respawn-rules`, `trap-disarming`, `growing-weapon`, `co-op-party` ✓, `boss-fights` ✓ (✓ = we have it)

**Characters:** Laios Touden (warrior), Marcille Donato (mage), Chilchuck Tims (rogue), Senshi (warrior), Izutsumi (shapeshifter), Falin Touden (cleric), Kabru (warrior)

**Original take:** Stewpot Delve: a party descends a living cave where every beast you beat becomes an ingredient; cook meals between floors for buffs, and learn each creature's weak spot from its recipe card.

<details><summary><b>Characters</b> (10) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Laios Touden** | character | warrior, melee-dps | physical · sword | Swordplay, Monster lore, First healing spell | 🍳 **Beastlore Gourmand** — Field Notes / Frontline / Hunt |
| **Marcille Donato** | character | mage, caster | arcane · staff | Fast big spells, Healing, Ancient magic | 🔮 **Ancient Arts Scholar** — Spellcraft / Forbidden Lore / Mending |
| **Chilchuck Tims** | character | rogue, support | physical · bow | Trap work, Pathfinding, Bow, Keen senses | 🗝️ **Tinker Pathfinder** — Traps / Picks / Short Bow |
| **Senshi** | character | warrior, support | physical · axe | Dungeon cooking, Pot shield, Magic-proof beard, Golem gardens | 🍲 **Hearty Field Cook** — Cleaver / Kitchen / Garden |
| **Izutsumi** | character | shapeshifter, melee-dps | physical · claws | Great-cat agility, Claws, Spirit sense | 🐈‍⬛ **Feral Prowler** — Claws / Prowl / Instinct |
| **Falin Touden** | character | cleric, support | light · none | Party teleport, Ghost speech, Chimera form | 🕊️ **Ghostspeaker Cleric** — Spirits / Sanctuary / Chimera |
| **Kabru** | character | warrior, melee-dps | physical · sword | Fighting people, Reading people | 🎴 **Silver-Tongued Duelist** — Duel / Insight / Leader |
| **Mithrun** | character | mage, controller | arcane · none | Teleportation magic, Squad captain | 🌀 **Hollow-Eyed Warpcaptain** — Warp / Orders / Detachment |
| **Red Dragon** | boss | berserker, tank | fire · claws | Fire breath, Swallow whole, Roaming hunter | 🐉 **Crimson Hoardwyrm** — Breath / Bulk / Apex |
| **Thistle** | boss | mage, controller | arcane · none | Dungeon master, Ancient transformation | 🌿 **Labyrinth Warden** — Maze / Thorns / Old Magic |

</details>

### Shangri-La Frontier

A teenager who loves beating broken, glitchy "trash games" finally tries the hit full-dive VR game everyone plays, and his bad-game reflexes carry him into its hidden bosses and secrets. The manga adaptation is the best-known form.

**Systems:** `skill-over-stats`, `conditional-bosses`, `boss-fights` ✓, `hidden-npc-town`, `pvp` ✓, `guilds`, `character-customization` ✓ (✓ = we have it)

**Characters:** Sunraku (rogue), Arthur Pencilgon (assassin), Oikatzo (monk), Animalia (druid)

**Original take:** Moonlit Grave: a hidden guardian wakes only under a full moon; players find a secret burrow-town for gear, then win by learning the guardian's patterns instead of out-levelling it.

<details><summary><b>Characters</b> (7) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Sunraku** [img](https://anime.shangrilafrontier.com/character/) | character | rogue, melee-dps | physical · dual-blades | Reflex dodging, Weak-point exploitation, Lycagon's Mark | 🐦 **Glasswing Duelist** — Frame Skips / Bare Skin / Speedrun |
| **Psyger-0** [img](https://anime.shangrilafrontier.com/character/) | character | warrior, melee-dps | physical · greatsword | Maximum Firepower, Heavy-gear assault | 💥 **Cinder Colossus** — Overkill / Bulwark Rush / Peak Output |
| **Arthur Pencilgon** [img](https://anime.shangrilafrontier.com/character/) | character | assassin, controller | physical · polearm | Player-killer ambush, Information warfare, Giant Killer | 🗡️ **Ledger Viper** — Dossier / Sting / Siege Plan |
| **Oikatzo** [img](https://anime.shangrilafrontier.com/character/) | character | monk, melee-dps | physical · fists | Brawler combos, Pattern reading | 🥊 **Combo Breaker** — Footsies / Combo Route / Hype |
| **Emul** [img](https://anime.shangrilafrontier.com/character/) | companion | mage, support | arcane · tome | Teleportation, Support magic, Attack magic | 🐇 **Hopscotch Sage** — Burrow Paths / Spellbook / Meadow Weather |
| **Wethermon the Tombguard** | boss | warrior, melee-dps | physical · sword | Full-moon guardian, Sword techniques, Wide-reach techniques | 🌕 **Moonward Sentinel** — Lunar Edge / Grave Ward / Night Watch |
| **Lycagon the Nightslayer** | boss | assassin, melee-dps | dark · claws | Night raid, Lycagon's Mark, Shadow clone | 🐺 **Moonless Howler** — Hunt / Brand / Phantom Pack |

</details>

### Log Horizon

Thirty thousand Japanese players are pulled into a long-running MMORPG during an expansion update and have to build a society inside it. It focuses on guild politics, economy and town-building more than on survival.

**Systems:** `character-classes` ✓, `multiclassing`, `crafting`, `respawn-rules`, `guilds`, `raids`, `team-buffs` ✓, `npc-society` (✓ = we have it)

**Classes:** Guardian (warrior), Samurai (warrior), Assassin (assassin), Enchanter (mage), Bard (bard), Kannagi (cleric), Summoner (summoner), Shiroe (mage), Naotsugu (warrior), Akatsuki (assassin), Nyanta (rogue), Tohya (warrior)

**Original take:** Hearthguild: players pick a fighting class plus a home trade (cook, mapmaker, merchant); trades change the town, so a cook's meals buff the party, and guild leaders vote on town rules between raids.

<details><summary><b>Characters</b> (11) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Shiroe** | character | mage, support | arcane · staff | Enchanter support spells, Scribe mapping, Raid strategy | 📜 **Quill Tactician** — Cartography / Enchantments / Grand Plan |
| **Naotsugu** | character | warrior, tank | physical · shield | Anchor Howl, Defence spells, Trap spells | 🛡️ **Bulwark Warden** — Taunts / Fortress / Tripwires |
| **Akatsuki** | character | assassin, melee-dps | physical · katana | Assassin strikes, Tracker stealth, Tracker detection | 🌑 **Veil Talon** — Vanish / Pursuit / Execution |
| **Nyanta** | character | rogue, melee-dps | physical · dual-blades | Swashbuckler swordplay, Chef cooking | 🐈 **Galley Duelist** — Fencing / Kitchen / Pounce |
| **Minori** | character | cleric, healer | light · staff | Damage barriers, Ailment wards | ⛩️ **Charm Warden** — Wards / Purify / Rites |
| **Tohya** | character | warrior, tank | physical · katana | Power stances, Attention-drawing techniques, Accountant bartering | ⚔️ **Vanguard Ronin** — Stances / Front Line / Flash |
| **Isuzu** | character | bard, support | none · instrument | Songs, Group debuffs | 🎵 **Road Minstrel** — Ballads / Dirges / Encore |
| **Rundelhaus Code** | character | mage, caster | arcane · staff | Offensive sorcery, Adventurer contract | ✨ **Gilded Evoker** — Pride / Barrage / Grandstand |
| **Crusty** | character | warrior, tank | physical · axe | Guardian defence, Guild command | 🪓 **Tower Marshal** — Bulwark / Fury / Command |
| **Taliktan** | boss | summoner, summoner | arcane · none | Moth swarms, Health-phase forms, Magic-point harvest | 🦋 **Mothcaller Sage** — Swarm / Moonlight / Metamorph |
| **Bagris** | boss | mage, controller | arcane · none | Measure twisting, False appraisal | ⚖️ **Crooked Ruler** — Mismeasure / Tampered Scales / Rigged Odds |

</details>

### Is It Wrong to Try to Pick Up Girls in a Dungeon?

In a city built over an endless dungeon, gods sponsor adventurers in household factions, and a rookie who is his goddess's only member grows unusually fast. Levels, ability scores and skills are part of the world itself.

**Systems:** `patron-gods`, `leveling` ✓, `growth-skill`, `growing-weapon`, `loot` ✓, `boss-fights` ✓, `porter-role`, `guilds`, `crafting`, `thinking-monsters` (✓ = we have it)

**Characters:** Bell Cranel (rogue), Hestia (cleric), Ais Wallenstein (warrior), Liliruca Arde (worker), Welf Crozzo (engineer), Ryū Lion (rogue)

**Original take:** Patron's Pact: each player is sworn to a small hearth-spirit that turns their deeds into new skills; dive the deepening cave under the town for glowing stones while a porter friend carries the haul, and duel rival lodges for their hall.

<details><summary><b>Characters</b> (10) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Bell Cranel** | character | rogue, melee-dps | fire · dual-blades | Firebolt, Liaris Freese, Argonaut, Hestia Knife | ⚡ **Hare-Step Vanguard** — Quickcast / Twin Fangs / Hero Charge |
| **Ais Wallenstein** | character | warrior, melee-dps | wind · sword | Wind magic, Aerial strikes, Swordplay | 🌬️ **Zephyr Duelist** — Updraft / Airblade / Swiftness |
| **Ryū Lion** | character | rogue, melee-dps | wind · sword | Wind magic, Swordplay, Traps and ambushes | 🍃 **Leafstorm Avenger** — Ambush / Squall / Swordwork |
| **Liliruca Arde** | character | worker, support | none · crossbow | Supporter pack, Disguise, Swindle | 🎒 **Satchel Trickster** — Packed Bag / Sleight / Support Kit |
| **Welf Crozzo** | character | engineer, builder | fire · greatsword | Magic swords, Smithing | 🔨 **Anvil Breaker** — Forge / Hammerwork / Bladesmith |
| **Hestia** | npc | cleric, support | none · none | Patron goddess, Keeper of secrets, Side jobs | 🔥 **Hearth Patron** — Blessing / Hearthfire / Home Guard |
| **Freya** | boss | commander, controller | arcane · none | City-wide charm, Strongest household, Waitress disguise | 👑 **Silver Muse** — Allure / Court / Radiance |
| **Ottar** | boss | warrior, melee-dps | physical · greatsword | Level 7, Monster trainer | 🐗 **Boarhide Champion** — Summit / Charge / Presence |
| **Juggernaut** | boss | berserker, melee-dps | physical · claws | Razor claws, Spell-reflecting armour, Dungeon defender, Devour | 🦂 **Wallborn Ravager** — Frenzy / Ambush / Bulwark Hide |
| **Asterius** | boss | berserker, melee-dps | physical · greatsword | Greatsword, Toughened hide, Rival memory | 🐂 **Horned Duelist** — Horn and Hoof / Great Blade / Rematch |

</details>

### The Eminence in Shadow

A boy obsessed with being the hidden mastermind is reborn in a fantasy world, invents a secret villain cult for his followers to fight, and then finds out the cult is real. A comedy of misunderstandings with a shadow-organization power fantasy.

**Systems:** `secret-identity`, `guilds`, `front-company`, `shape-suits`, `cure-recruits`, `character-customization` ✓ (✓ = we have it)

**Characters:** Cid Kagenou / Shadow (assassin), Alpha (commander), Beta (bard), Gamma (commander), Delta (berserker), Claire Kagenou (warrior)

**Original take:** Two Faces: by day you are the clumsy apprentice nobody notices; by night you lead a masked band in gel armour, and every villager you rescue can join your secret roster.

<details><summary><b>Characters</b> (9) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Cid Kagenou** | character | assassin, melee-dps | dark · sword | Slime bodysuit, Swordsmanship, I Am Atomic, Two personas | 🕶️ **Nightfall Mastermind** — Ooze Arsenal / Mob Mask / Finale |
| **Alpha** | character | commander, commander | dark · sword | Commands the organization, Swift subdual | 🌹 **Gilded Regent** — Directive / Elfin Grace / Inner Circle |
| **Beta** | character | bard, support | dark · tome | War chronicles, Mission logistics | ✒️ **Inkblade Chronicler** — Manuscript / Logistics / Bestseller |
| **Gamma** | character | commander, support | none · none | Finance and administration, Front company | 💰 **Ledger Magnate** — Capital / Contracts / Expansion |
| **Delta** | character | berserker, melee-dps | physical · claws | Glass Cannon, Beast senses, Savage assault | 🐕 **Pack Hound Brawler** — Hunt / Savage / Smash |
| **Epsilon** | character | mage, controller | dark · none | Precise slime control, Pianist cover | 🎹 **Sonata Sculptor** — Recital / Sculpted Gel / Encore |
| **Claire Kagenou** | character | warrior, melee-dps | physical · sword | Spellsword, Double bloodline | 🗡️ **Guardian Spellsword** — Academy Form / Big Sister / Bloodline |
| **Iris Midgar** | character | knight, commander | physical · sword | Order command, Knightly swordplay | ⚜️ **Vermilion Marshal** — Order / Royal Blade / Vengeance |
| **Aurora** | boss | mage, caster | dark · none | Legend of calamity, Borrowed vessel | 🩸 **Ruinous Sorceress** — Old Ruin / Borrowed Vessel / Sanctum |

</details>

### Black Clover

In a kingdom where everyone uses magic, an orphan born with none receives a rare grimoire of anti-magic swords and joins the misfit squad of the Magic Knights. He and his wind-prodigy rival race to become the Wizard King.

**Systems:** `growing-weapon`, `elemental-reactions`, `anti-magic`, `guilds`, `rank-system`, `devil-pact`, `team-buffs` ✓ (✓ = we have it)

**Characters:** Asta (berserker), Yuno (elementalist), Noelle Silva (elementalist), Yami Sukehiro (warrior), Luck Voltia (berserker), Mimosa Vermillion (healer), Finral Roulacase (mage), Julius Novachrono (mage)

**Original take:** Leafbook Academy: each player draws a spellbook whose leaf count hints at its power; one player draws a blank book that cancels magic instead, and squads compete on missions for the captain's crest.

<details><summary><b>Characters</b> (12) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Asta** [img](https://en.wikipedia.org/wiki/File:AstaWSJIssue362015.png) | character | berserker, melee-dps | physical · greatsword | Demon-Slayer Sword, Demon-Dweller Sword, Demon-Destroyer Sword, Black Asta | ⚔️ **Nullblade Brawler** — Null Steel / Grit / Dark Form |
| **Yuno** | character | elementalist, caster | wind · tome | Wind Magic, Sylph, Star Magic | 🌪️ **Skyborne Prodigy** — Gusts / Spirit Pact / Night Sky |
| **Noelle Silva** | character | elementalist, caster | water · tome | Water Magic, Water armour, Sea God pact, Wild mana | 🌊 **Tidal Regalia** — Royal Tide / Tidal Armor / Sea Pact |
| **Yami Sukehiro** | character | warrior, melee-dps | dark · katana | Dark Magic, Ki sensing, Light Magic pact | 🌑 **Duskcleaver Captain** — Dusk Edge / Ki Sense / Limit Break |
| **Luck Voltia** | character | berserker, melee-dps | lightning · fists | Lightning Magic, Ultimate Lightning Magic | ⚡ **Sparkstep Brawler** — Volt Boots / Volt Gloves / Battle Grin |
| **Mimosa Vermillion** | character | healer, healer | nature · tome | Plant Magic, Ultimate Plant Magic | 🌸 **Bloomwarden Medic** — Bloom / Thorns / Garden |
| **Finral Roulacase** | character | mage, support | arcane · tome | Spatial Magic, Squad transport | 🌀 **Portal Courier** — Doorways / Fold / Courier |
| **Magna Swing** | character | elementalist, ranged-dps | fire · tome | Fireballs, Crazy Cyclone, Equalizing rune | 🧹 **Broomrider Firebrand** — Fireballs / Broom Ride / Delinquent |
| **Julius Novachrono** | character | mage, caster | arcane · tome | Time Magic, Stored time, Restoring time | ⏳ **Hourglass Sovereign** — Stasis / Tick Tock / Grand Clock |
| **Liebe** | companion | shapeshifter, support | dark · none | Anti-magic source, Devil Union | 😈 **Nullhorn Imp** — Underworld Escape / Union / Grudge |
| **Lucius Zogratis** | boss | mage, caster | arcane · none | Soul Magic, Time Magic, Gravity Magic, Paladins | 👼 **Perfect World Architect** — Soulcraft / Gravity Well / Holy Army |
| **Zagred** | boss | mage, caster | dark · none | Word Soul Magic, Reincarnation Magic | 🗣️ **Silver-Tongue Fiend** — Utterance / Rebirth / Doom |

</details>

### Fairy Tail

A fire-breathing dragon slayer and a celestial wizard join a rowdy wizard guild that takes paid jobs across the kingdom. They fight dark guilds, demons and dragons, with friendship as the guild's core.

**Systems:** `guilds`, `quests` ✓, `rank-system`, `guild-tournament`, `instant-dungeon`, `quick-equip`, `eat-element`, `building-in-combat`, `pets` (✓ = we have it)

**Characters:** Natsu Dragneel (berserker), Lucy Heartfilia (summoner), Gray Fullbuster (elementalist), Erza Scarlet (knight), Wendy Marvell (healer), Happy (shapeshifter)

**Original take:** Lanternhall: a rowdy guild hall with a job board; a flame-eater, a key-caller who summons star creatures and an armour-swapper take paid jobs, lose reward gold for every building they wreck, then enter the yearly guild games.

<details><summary><b>Characters</b> (11) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Natsu Dragneel** [img](https://en.wikipedia.org/wiki/File:NatsuDragneelFairyTail.jpg) | character | berserker, melee-dps | fire · fists | Fire Dragon Slayer Magic, Dragon Force, Thunder-Fire Dragon Mode, Fire Dragon King Mode | 🔥 **Blazemaw Brawler** — Flame Fists / Wyrm Breath / Wyrm Fury |
| **Lucy Heartfilia** [img](https://en.wikipedia.org/wiki/File:LucyHeartfiliaFairyTail.jpg) | character | summoner, summoner | arcane · whip | Celestial gatekeys, Urano Metoria, Star Dress, Fleuve d'étoiles | 🔑 **Zodiac Keybearer** — Gatekeys / Star Whip / Night Sky |
| **Gray Fullbuster** | character | elementalist, caster | ice · none | Ice Make, Ice Demon Slayer Magic, Cold tolerance | ❄️ **Rime Sculptor** — Shaping / Frost Domain / Purge |
| **Erza Scarlet** | character | knight, melee-dps | physical · sword | The Knight, Swordsmanship, S-Class wizard | 🛡️ **Quickchange Paragon** — Armory / Swordplay / Discipline |
| **Wendy Marvell** | character | healer, healer | wind · none | Sky Dragon Slayer Magic, Enchantment, Wind attacks, Travel cure | 🌬️ **Skybreath Medic** — Clean Air / Enchant / Gale |
| **Gajeel Redfox** | character | berserker, melee-dps | physical · fists | Iron limbs, Iron scales, Shrapnel breath, Iron eating | ⛓️ **Scrapjaw Bruiser** — Ironclad / Shrapnel / Forge Roar |
| **Laxus Dreyar** | character | elementalist, caster | lightning · fists | Lightning magic, Lightning body, Lightning Dragon Slayer Magic | ⚡ **Thunderhead Heir** — Bolt Form / Storm / Heir |
| **Happy** | companion | shapeshifter, support | wind · none | Aera, Airlift | 🐱 **Skywhisker Courier** — Wings / Fish Stash / Mischief |
| **Loke** | companion | monk, melee-dps | light · fists | Regulus, Magic rings, Self-summon | 🦁 **Maned Starguard** — Ringlight / Pride / Star Gate |
| **Zeref Dragneel** | boss | necromancer, caster | dark · none | Curse of Ankhselam, Demon creator, Neo Eclipse | 📕 **Deathless Emperor** — Curse / Demon Book / Empire |
| **Acnologia** | boss | berserker, melee-dps | none · claws | Dragonification, Magic immunity, Time-rift feast | 🐉 **Ashen Wyrm Tyrant** — Wyrmform / Tyranny / Cataclysm |

</details>

### Magi: The Labyrinth of Magic

In a world drawn from the Arabian Nights, towering dungeons appear holding djinn and treasure, and a boy magi with a djinn in his flute helps a would-be king conquer them. Conquerors carry their djinn's power in personal items.

**Systems:** `dungeon-portals`, `growing-weapon`, `team-buffs` ✓, `mana-resource` ✓, `kingmaker-mage`, `corruption`, `summons`, `mounts` (✓ = we have it)

**Characters:** Aladdin (mage), Alibaba Saluja (warrior), Morgiana (monk), Sinbad (commander), Judar (elementalist), Hakuryuu Ren (warrior)

**Original take:** Sandspire Vaults: towers rise from the dunes overnight; clear one to bind its genie into a trinket you carry, then make lesser charms that share a slice of its power with your party.

<details><summary><b>Characters</b> (9) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Aladdin** | character | mage, caster | arcane · instrument | Ugo, Rukh wellspring, Flying turban, Wisdom of Solomon | 🪈 **Flutecall Sage** — Flute Call / Carpet Ride / Bird Flock |
| **Alibaba Saluja** | character | warrior, melee-dps | fire · sword | Amon's blade, Djinn Equip, Swordplay | 🔥 **Emberblade Prince** — Flame Blade / Footwork / Equip |
| **Morgiana** | character | monk, melee-dps | physical · whip | Fanalis body, Amol Selseira, Fanalis combat | ⛓️ **Chainbreaker Huntress** — Tribe Legs / Chains / Fury |
| **Sinbad** | character | commander, commander | lightning · sword | Baal, Valefor, Zepar, Focalor | ⛵ **Seven-Seal Sovereign** — Storm Vessels / Sea Vessels / Kingship |
| **Hakuryuu Ren** | character | spearman, melee-dps | nature · spear | Zagan, Monster army, Belial | 🌿 **Thornspear Usurper** — Living Earth / Illusion / Spearwork |
| **Kouen Ren** | character | commander, commander | fire · sword | Astaroth, Phenex, Monster commanders, Three djinn | 🔥 **Pyre Conqueror** — Undying Flame / Mercy Feather / Generalship |
| **Judar** | character | elementalist, caster | ice · wand | Ice magic, Fallen Magi, Absorbed knowledge | 🧊 **Frostfall Oracle** — Rime / Dark Tide / Oracle |
| **Ugo** | companion | monk, melee-dps | fire · fists | Giant body, Heat palms, Hand-to-hand | 🗿 **Bottled Titan** — Giant Fists / Heat Palms / Guardian |
| **Arba** | boss | mage, caster | dark · none | Body possession, Ill Ilah, Ancient Magi | 🐍 **Veiled Matriarch** — Possession / False God / Dynasty |

</details>

### Berserk

A lone mercenary swordsman hunts the demons, once human, of a dark medieval-style world after the leader he once followed sacrifices their whole company. Mechanics only: extreme gore and sexual violence.

**Systems:** `oversized-weapon`, `cursed-power-armor`, `hunted-mark`, `boss-fights` ✓, `mercenary-warfare`, `co-op-party` ✓, `growing-weapon` (✓ = we have it)

**Characters:** Guts (berserker), Griffith (commander), Casca (warrior), Schierke (mage), Puck (healer), Serpico (rogue), Isidro (rogue)

**Original take:** Iron Vigil (teen-safe take): a lone guard with an oversized blade and a gadget arm escorts a hedge-witch, a sling-thrower and a glowing sprite healer through troll-haunted hills; a fury-armour gives big power, but the witch must calm the wearer before its meter tops out.

<details><summary><b>Characters</b> (10) — and the original class we make from each</summary>

| Name | Kind | Plays as | Element · weapon | Signature skills | Our class (Class forge) |
| --- | --- | --- | --- | --- | --- |
| **Guts** [img](https://en.wikipedia.org/wiki/File:GutsBerserk.PNG) | character | berserker, melee-dps | physical · greatsword | Dragon Slayer, Prosthetic arm, Repeating crossbow, Berserker Armor | 🗡️ **Greatslab Reaver** — Slab / Fury Armor / Arsenal |
| **Griffith** [img](https://en.wikipedia.org/wiki/File:GriffithBerserk.png) | boss | commander, commander | dark · sword | Band leadership, Swordsmanship, Causality manipulation, Spatial manipulation | 🦅 **Pale Falcon Regent** — Sabre / Command / Ascension |
| **Casca** | character | warrior, commander | physical · sword | Field command, Swordplay | ⚔️ **Ember Lieutenant** — Lead / Blade / Drive |
| **Serpico** | character | rogue, melee-dps | wind · sword | Wind rapier, Vortex cloak, Fox-like cunning | 🦊 **Galefoil Duelist** — Foil / Cloak / Cunning |
| **Schierke** | character | mage, support | arcane · staff | Hypnosis, Sensory magic, Mind anchor | 🧙 **Spiritwood Witchling** — Trance / Spirit Call / Sight |
| **Puck** | companion | healer, healer | light · thrown | Healing powder, Blinding flash, Bloody Needle | 🧚 **Thistledown Sprite** — Glimmer / Pocket Arsenal / Flutter |
| **Isidro** | character | rogue, ranged-dps | fire · thrown | Sharp aim, Salamander Dagger | 🪨 **Slingshot Scrapper** — Aim / Fire Fang / Scrappy |
| **Farnese de Vandimion** | character | mage, support | nature · sword | Rose-vine ring, Basic witchcraft | 🌹 **Thornvine Novice** — Vines / Lessons / Silver Mail |
| **Zodd** | boss | berserker, melee-dps | physical · greatsword | Apostle form, Huge sword, Winged assault, Three centuries of war | 🦇 **Horned Warbeast** — Beast Form / Old Warrior / Challenge |
| **Skull Knight** | character | knight, melee-dps | dark · sword | Rift sword, Apostle hunter, Spectral steed | 💀 **Riftrider Revenant** — Rift / Spectral Charge / Old Pact |

</details>
