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
| **1 – 5** | Arm the spell on that key — press again to put it away. Far casts aim with a circle |
| **K** | Skill tree — read books, choose which spells are on keys 1–5 |
| **Tab** | Bag — wear weapons and gear, take gear off, read skill books, drop items |
| **F** | Talk to the nearest NPC |
| **R** / **Z** | Drink a health / focus potion |
| **I** | Armory — any of the 108 weapons |
| **Move the mouse** | Swing the aim arrow, or move the far-cast circle |
| **Right click** | Cast along the arrow, or drop the circle where it is |
| **Left click** | Attack with your weapon — a melee weapon swings, a gun, bow or throwing weapon fires. **Hold** to keep an automatic firing |
| **X** | Reload the gun in hand |
| **V** (hold) | Look through the scope of a long-range weapon (sniper rifle, DMR, railgun, longbow…) |
| **Esc** | Cancel an armed cast |
| **Right mouse + drag** | Orbit the camera |
| **Scroll** | Zoom |
| **T** / **Enter** | Focus the commander — type an order in plain English |
| **N** | Send the next wave now |
| **M** | Summon one random monster |
| **B** | Show/hide the run HUD (wave, score, health) |
| **G** | Show/hide the VFX editor — starts hidden |
| **P** | Pause / resume — *the editor keeps applying* |
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
