# Breachline

A tactical first-person shooter of our own: two squads of five, short rounds, a pause to buy
before each. The **Raiders** carry a charge to one of two sites and set it; the **Wardens** hold
the sites, or disarm the charge in time. First to seven rounds wins, and the squads change ends
after six. The teams, the map ("Foundry") and the weapons are invented for this game.

Foundry is an old works yard, 144 by 104 metres: four brick warehouses split the yard into a
north lane, a middle road and a south lane, with a pump house in front of the Wardens' yard. Cover
is what such a yard has: shipping containers (too tall to shoot over), stacks of crates (some
low enough to shoot over), barrels, gas bottles and pallets of cement. Beyond the wall stand
blocks of flats and workshops; the sky is a real one, a sunrise photographed as an HDR.

Play it alone with nine bots, or with **up to four people** in a room — bots fill every seat a
person isn't in.

## Playing

| Key | Does |
| --- | --- |
| W A S D | walk |
| Mouse | look (click the game to take aim; Esc lets the mouse go) |
| Left button | fire (hold, for automatic weapons) |
| Right button | look down a scope (Longwatch) |
| R | reload |
| 1 / 2 | main weapon / sidearm |
| B | the shop — only in the pause before a round |
| E (hold) | set the charge in a site (Raiders) / disarm it (Wardens) |
| Space | jump |
| Tab (hold) | the scores |
| Enter | talk to your squad (`/all` first, for everyone) — rooms only |

A round, as it goes:

1. **Buy** (12 s). Everyone stands at their spawn. Money comes from the last round: 3000 for a
   win, 1400 for a loss (more for each loss in a row, up to 3400), 300 for each opponent dropped,
   300 for setting or disarming the charge. What you carry is kept if you live.
2. **Live** (1:55). One Raider has the charge (a ◆ by their ammo, a yellow mark on the radar).
   Raiders win by setting it and keeping it safe for 35 s, or by dropping every Warden. Wardens
   win by dropping every Raider before it is set, by disarming it (6 s, or 3 s with a kit), or by
   running out the clock.
3. Whoever falls watches a teammate until the next round.

Moving and firing fast both open the crosshair: stand still and tap for long shots. A vest takes
half of each hit until it is used up; a helmet makes a head shot hurt less.

| Weapon | Price | What it is |
| --- | --- | --- |
| P9 Sidearm | free | what everyone starts with |
| Ram .50 | 700 | a heavy sidearm |
| Wasp SMG | 1200 | fast and cheap, for close quarters |
| Gavel 12 | 1300 | a shotgun: eight pellets, short range |
| Vantage Rifle | 2700 | the all-round rifle |
| Kestrel Carbine | 2900 | steadier, a little lighter on damage |
| Longwatch | 4500 | one shot at a time, through a scope |

## With friends

In the game's menu: one person presses **Make a room** and gets a five-letter code; up to three
others type it and press **Join**. In the room each picks a squad — all on one side against the
bots, or split — and the host picks how good the bots are and starts. Someone who joins while a
match is on takes a bot's seat; someone who leaves hands theirs back to a bot. When a match ends
everyone is back in the room, and the host can start another.

## How it is built

| File | What it holds |
| --- | --- |
| `src/fps/rules.js` | the numbers: weapons, prices, money, timings, bot skill |
| `src/fps/map.js` | the map as boxes, the sites and spawns, the bots' paths, and what blocks a walk or a shot |
| `src/fps/sim.js` | `Match`: movement, shots, rounds, money, the charge, and the bots — no drawing, no browser |
| `src/fps/net.js` | `pack(match)` (what the server sends) and `Mirror` (what a browser keeps of it) |
| `src/fps/view.js` | the 3D picture: the yard, players, the weapon in hand, shots |
| `src/fps/assets.js` | surfaces (ambientCG) and props (Poly Haven) from the asset library, drawn instanced |
| `src/fps/soldier.js` | the animated soldier: team tint and arm bands, a two-bone reach that puts both hands on the weapon |
| `src/fps/guns.js` | the seven weapons, built from parts and merged to a few meshes each |
| `src/fps/FpsGame.js` | the screen: menu, room, controls, HUD, shop, radar, scores, chat |
| `server/fps/index.js` | rooms and their matches, over the WebSocket endpoint `/fps` |

What it is drawn with comes from the downloaded asset library (`npm run dev` and `npm run build`
fetch it; see [third-party](third-party.md)): photoscanned props from Poly Haven, surfaces from
ambientCG, and an animated soldier from the three.js examples (made with Mixamo). A library from
before Breachline fetches just these new files the next time the dev server or a build starts
(`extras` in `scripts/library/sources.mjs`). Without the library the game still plays: textured
boxes stay plain and players are simple figures.

Alone, the match runs in the browser. In a room it runs **on the server**, thirty steps a second:
browsers send their keys and where they look, the server sends back the whole match, and each
browser moves its own player at once on its own keys (the same walking rules) while being drawn
gently to where the server has it. Shots are decided by the server.

The endpoint needs no account (a signed-in player's name is their account's). Each connection has
a message budget and a 4 KB payload cap, rooms are capped at four people, and a room disappears
when its last member leaves. Behind a proxy, `/fps` must be allowed to upgrade to a WebSocket, as
`/ws` and `/mmo` are.

Tests: `tests/unit/fps.test.mjs` (the map's paths, buying, rounds won by the charge and by
disarming, shooting, a whole match of bots, several people in one match, the mirror, rooms) and
`tests/e2e/breachline.mjs` (alone, then two browsers in one room).
