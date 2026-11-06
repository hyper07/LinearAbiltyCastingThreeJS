# Classes and skill trees

[← Back to the README](../README.md)

## Classes

<p>
  <img src="screenshots/class-knight.jpg" width="49%" alt="Class picker: the Knight with its bonuses, longsword and plate" />
  <img src="screenshots/class-mage.jpg" width="49%" alt="The Mage class with its staff and bonuses" />
</p>
<p>
  <img src="screenshots/class-look-skeleton.jpg" width="49%" alt="Appearance tab: the Knight wearing the skeleton-warrior body" />
  <img src="screenshots/class-look-barbarian.jpg" width="49%" alt="Appearance tab: the Knight wearing the barbarian body" />
</p>

Pick a class in the main menu. Each class has its own skill tree of spells (next section); the class
also sets the body, the starting weapon, the close-range attacks and a set of bonuses that stack with
gear and skill books:

| Class | Starts with | Bonuses |
| --- | --- | --- |
| 🛡 **Knight** | Longsword | +50 health, 20% less damage taken, −5% speed, +15% Glacial Crown |
| ✦ **Mage** | Arcane staff | −25 health, +18% spell damage, −10% cooldowns |
| 🪓 **Barbarian** | War axe | +70 health, 10% less damage taken, +8% speed, +20% Cinder Fall |
| 🏹 **Amazon** | Longbow | +10% speed, +12% critical chance, +20% Storm Lance |
| 🗡 **Shadowblade** | Twin daggers | −10 health, +15% speed, +8% critical chance, +15% Voltaic Snare |
| ✚ **Templar** | War hammer | +30 health, 10% less damage taken, +25% Nova Beam |
| 💀 **Bonecaller** | Necromancer staff | −10 health, +10% spell damage, −6% cooldowns, +20% Voltaic Snare |
| 🌿 **Wildwarden** | Druid staff | +20 health, +20% Glacial Crown, +15% Frost Lance |
| ⚡ **Elemental Caster** | Arcane wand | The sandbox original — no bonuses, its own Mixamo body |

**Appearance → Look** dresses any class in any of the nine bodies (Knight, Mage, Barbarian, Rogue,
Hooded rogue, Skeleton warrior/mage/rogue/minion), the class's own picks listed first, and the colour
tints still apply on top. The choice is remembered per class. Classes are defined in
`src/platform/character/classes.js`.

## Skill trees and skill books

<p>
  <img src="screenshots/skill-tree.jpg" width="49%" alt="The K panel in a run: the Knight's five keys and three branches, with gold-lit spells that have a book ready" />
  <img src="screenshots/skill-tree-menu.jpg" width="49%" alt="The main menu's Skill Tree tab for the Mage: three spells on keys and the Frost branch" />
</p>

Every class has a **skill tree**: three branches, each a line of spells from tier 1 to tier 3. A class
starts knowing two tier-1 spells. The rest come from **skill books**:

- **Reading a book teaches its spell** (rank 1), and the spell goes onto a free key.
- **More copies of the same book raise its rank**, up to 10. Each rank after the first adds +10%
  damage and −3% cooldown to that spell.
- **Tiers gate the tree.** A tier-2 spell's book can only be read once the tier-1 spell above it is
  at rank 2; tier 3 needs its tier-2 parent at rank 3.
- **A book for a spell outside your class's tree can't be read** — sell it. Three dropped books in
  four are for your own class's tree; merchants always stock two.
- **Five keys.** Of everything learned, you choose which five sit on keys 1–5. Press **K** (or click
  an empty key on the bar), pick a key, then click a learned spell. Right-click a key to empty it.

| Class | Starts with | Branches (tier 1 → 2 → 3) |
| --- | --- | --- |
| 🛡 Knight | Frost Lance, Blink Strike | Bulwark: Frost Lance → Glacial Crown · Charge: Blink Strike → Nova Beam · Thunder: Storm Lance → Arc Chain |
| ✦ Mage | Frost Lance, Storm Lance | Frost: Frost Lance → Hailstorm → Glacial Crown · Storm: Storm Lance → Arc Chain → Voltaic Snare · Arcane: Void Orb → Nova Beam → Cinder Fall |
| 🪓 Barbarian | Blink Strike, Storm Lance | Fury: Blink Strike → Cinder Fall · Storm: Storm Lance → Arc Chain · Winter: Frost Lance → Hailstorm |
| 🏹 Amazon | Storm Lance, Frost Lance | Storm: Storm Lance → Arc Chain → Hailstorm · Hunt: Frost Lance → Voltaic Snare · Swift: Blink Strike → Nova Beam |
| 🗡 Shadowblade | Blink Strike, Void Orb | Shadow: Blink Strike → Voltaic Snare · Void: Void Orb → Arc Chain · Frost: Frost Lance → Hailstorm |
| ✚ Templar | Void Orb, Storm Lance | Light: Void Orb → Nova Beam → Cinder Fall · Storm: Storm Lance → Arc Chain · Oath: Frost Lance → Glacial Crown |
| 💀 Bonecaller | Void Orb, Frost Lance | Soul: Void Orb → Voltaic Snare · Grave: Frost Lance → Glacial Crown → Hailstorm · Storm: Storm Lance → Arc Chain |
| 🌿 Wildwarden | Frost Lance, Blink Strike | Winter: Frost Lance → Hailstorm → Glacial Crown · Thorn: Storm Lance → Voltaic Snare · Spirit: Blink Strike → Void Orb |
| ⚡ Elemental Caster | Every spell | The spell tester — all ten known from the start |

Spells, ranks and keys are saved **per class** in the browser; gold, potions and the bag are shared.
The trees live in `src/platform/skill/tree.js` — a new spell joins the game by being added to the
branches of the classes that should have it.
