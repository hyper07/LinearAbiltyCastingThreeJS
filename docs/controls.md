# Controls

[← Back to the README](../README.md)

## Controls

| Input | Action |
| --- | --- |
| **W A S D** | Run — relative to the camera, so W is always "away from me" |
| **Shift** | Sprint |
| **Alt** | Walk |
| **Space** | Jump |
| **C** | Sit — meditate, and recover health several times faster |
| **← →** or **Q E** | Turn the view |
| **↑ ↓** | Tilt the view |
| **1 – 9** | Use what is on that key: arm a spell (press again to put it away; far casts aim with a circle) or drink a potion. Skills start on 1–5, the health and focus potions on 6 and 7 |
| **Action bar** | Click a key to use it · drag a key onto another to swap them · right-click a key (or click an empty one) to choose a skill or potion for it |
| **K** | Skill tree — read books, choose which skills are on keys 1–9 |
| **Tab** / **Bag** button | Bag — wear weapons and gear, take gear off, read skill books, drop items; drag items to arrange the bag, wear or take off gear, or drop them on the ground |
| **F** | Talk to the nearest NPC |
| **R** / **Z** | Drink a health / focus potion (also on keys 6 and 7). A potion can't be drunk again for 2 seconds. **Menu → Auto-drink** drinks a health potion for you below 30% health |
| **I** | Armory — any of the 108 weapons |
| **Move the mouse** | Swing the aim arrow, or move the far-cast circle |
| **Right click** | Cast along the arrow, or drop the circle where it is |
| **Left click** | Attack with your weapon — a melee weapon swings, a gun, bow or throwing weapon fires. **Hold** to keep an automatic firing |
| **X** | Reload the gun in hand |
| **V** (hold) | Look through the scope of a long-range weapon (sniper rifle, DMR, railgun, longbow…) |
| **Esc** | Cancel an armed cast |
| **Right mouse + drag** | Orbit the camera |
| **Scroll** | Zoom |
| **T** | Focus the commander — type an order in plain English |
| **Enter** | Party chat, when [playing together](multiplayer.md) (**Esc** closes it) |
| **N** | Send the next wave now |
| **M** | Summon one random monster |
| **B** | Show/hide the run HUD (wave, score, health) |
| **G** | Show/hide the VFX editor — starts hidden |
| **P** | Pause / resume — *the editor keeps applying*. Not while playing together: a party's fight runs on |
| **Backspace** | Clear all effects |
| **H** | Hide the controls panel |

**Esc** does double duty: it drops an armed cast, and it hands the keyboard back if the commander
has focus. Keys pressed while the chat input is focused never reach the game, so typing an order
cannot cast by accident.

`range` and `minRange` are per ability, so the indicator's reach changes with the slot you have
selected. Aiming closer than the selected ability's `minRange` tints it red and refuses the cast;
set `minRange` to 0 if you would rather cast at your own feet, which is what the Snare ships with —
a trap you cannot drop on yourself is missing half its uses. Cooldowns are per ability too, so
spending one slot never locks the other out.
