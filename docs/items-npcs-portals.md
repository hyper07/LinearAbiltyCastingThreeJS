# Loot, NPCs and portals

[← Back to the README](../README.md)

## Portals, loot and NPCs

<p>
  <img src="screenshots/npc-dialogue.jpg" width="49%" alt="Talking to the Old Warden: a gift, an AI-written answer about fighting the Rift Golem, and an accepted quest" />
  <img src="screenshots/npc-merchant.jpg" width="49%" alt="Trading with Mira the merchant: potions, weapons by rarity and a skill book for sale" />
</p>
<p>
  <img src="screenshots/loot.jpg" width="49%" alt="A Knight in plate beside a boss's loot: light beams in rarity colours and floating item names" />
  <img src="screenshots/inventory.jpg" width="49%" alt="The bag: a paper doll of worn gear, the plate set bonus, 30 slots and the totals" />
</p>
<p>
  <img src="screenshots/portal-exit.jpg" width="49%" alt="Goal reached: the gold exit portal beside the violet East Gate" />
  <img src="screenshots/editor-npcs.jpg" width="49%" alt="Placing NPCs and linked portals in the level editor" />
</p>

### Loot

Monsters drop **gold**, **potions**, **weapons**, **gear** and **skill books**. Items burst out of the body,
land with a light beam in their rarity colour — **Common**, **Magic** (blue), **Rare** (yellow),
**Epic** (purple), **Unique** (orange) — and a floating name; walk over them to pick them up (or click
the name from close by). Bigger monsters drop more and better: a Rift Golem always drops a Rare or
better (a weapon or a piece of gear, and half the time a skill book), the Emberwyrm an Epic or
better plus two skill books.

| Item | What it does |
| --- | --- |
| Weapon | Any of the armory's weapons, with 1–3 bonus stats by rarity: spell damage, weapon damage, one spell's damage, cooldowns, max health, move speed, critical chance, gold found. Uniques are named (*Glacierheart*, *Ashen Requiem*, *Tempest Sceptre*, *Dawnspire*, *The Hollow Crown*, *Wardenblade*) with fixed, stronger bonuses. |
| Gear | Helmets, body armor, gloves, belts, leg armor, boots, cloaks, shields, foci, quivers, amulets and rings. Each has its item class's base properties (cloth, leather, mail, plate, shield…) plus bonuses by rarity, and ten named Uniques. See **[Armor and gear](gear.md)**. |
| Skill book | Teaches one spell, or raises it a rank (max 10): +10% damage and −3% cooldown per rank after the first. Only classes with that spell in their [skill tree](classes-and-skills.md#skill-trees-and-skill-books) can read it. Barbarian skills come in *skill manuals*. |
| Health potion | **R** — heals 45%. |
| Focus potion | **Z** — every spell ready again. |
| Gold | Spent at merchants; weapons sell back for a quarter. |

**Tab** opens the bag: a paper doll of everything you wear (click a piece to take it off), your
armor proficiency and set bonuses, 30 slots, what everything adds up to, and your class's skill
ranks. Click a weapon or piece of gear to wear it, a book to read it, right-click to drop. Hovering
over gear compares it with what you wear. Books your class can't read are greyed out. The bag, worn
gear, gold, potions and ranks are saved in the browser and carry between levels.

### NPCs

Place them in the editor with the **NPCs** tool. They never fight and monsters ignore them; walk up
and press **F** to talk (the fight pauses while you do).

| Role | Does |
| --- | --- |
| Guide | Talks: a greeting and scripted lines — story, hints, rumours. |
| Merchant | Sells potions, weapons, gear and two skill books (mostly for your class); buys anything from your bag. |
| Healer | Heals you to full and sells potions. |
| Quest giver | Sets a task — *defeat N monsters* (any, or one kind) — tracked under the wave counter; hand it in for gold and an item of a chosen rarity. |
| Tutor | Asks study questions — generated math, or the parent's own — and pays gold for right answers, with a bonus every few. Marked ✎. See [Study games for kids](for-parents.md). |

Any NPC can give a **gift** the first time you talk (potion, gold, weapon, skill book) and can carry a
quest. Tick **Talks with the AI model** and give it a personality: the NPC then answers anything you
type, in character, through your LM Studio model — it knows the level's story and goal, your health,
gold, potions, weapon and spell ranks, and what the spells actually do, so its advice fits the moment.
With the model offline it falls back to its scripted lines.

### Portals

<p>
  <img src="screenshots/portal-arch.jpg" width="49%" alt="A stone-arch portal: rough masonry blocks with blue runes around a swirling vortex" />
  <img src="screenshots/portal-gateway.jpg" width="49%" alt="A stone-gateway portal: two pillars and a lintel with violet runes" />
</p>

Each portal stands in a **stone arch** (rough-hewn blocks, a keystone, a dais) or a **stone gateway**
(two standing-stone pillars and a lintel) — or a plain **glowing ring** — with runes that glow in the
portal's colour. Place them with the **Portals** tool, pick the frame and colour, and choose what each leads to: **another portal in the level**
(two linked portals make a two-way shortcut), **another level** (a waypoint into the campaign), or
nothing. When a level's goal is met, a **gold exit portal** opens in front of you; stepping in shows
the ending and leads on to the next level.

Keys: **F** talk · **R** health potion · **Z** focus potion · **Tab** bag · **K** skill tree.
