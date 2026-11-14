# Breachline

A tactical first-person shooter of our own: two squads of five, short rounds, a pause to buy
before each. The **Raiders** carry a charge to one of two sites and set it; the **Wardens** hold
the sites, or disarm the charge in time. First to seven rounds wins, and the squads change ends
after six. The teams, the map ("Foundry") and the weapons are invented for this game.

Three maps, each with a plan drawn on its card. Playing alone you choose one; in a room, the host
chooses and everyone sees it.

- **Foundry** — an old works yard, 144 by 104 metres: four brick warehouses split it into a north
  lane, a middle road and a south lane, with a gap across each side; a pump house in front of the
  Wardens' yard. Long sightlines down the middle road.
- **Harbor** — a container port, 136 by 96: a maze of containers on two quays, some stacked two
  high, and one long warehouse whose narrow corridor is the only way through the middle.
- **Old Town** — 120 by 104: three streets between blocks of houses, two alleys across them, a
  fountain house at the end of the main street, and market squares with crates for sites. Close
  fights, many corners.

Cover is what such places have: shipping containers (too tall to shoot over), stacks of crates
(some low enough to shoot over), barrels, gas bottles and pallets of cement. Beyond the walls
stand blocks of flats and workshops; the sky is a real one, a sunrise photographed as an HDR.

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
| 3 | the knife (you run a little faster with it out) |
| 4 / 5 | frag grenade / smoke grenade (click to throw; aim higher to throw further) |
| B | the shop — only in the pause before a round |
| E (hold) | set the charge in a site (Raiders) / disarm it (Wardens) |
| Space | jump |
| Tab (hold) | the scores |
| Enter | talk to your squad (`/all` first, for everyone) — rooms only |

A round, as it goes:

1. **Buy** (12 s). Everyone stands at their spawn, with $4,000 at the start of each half. Money
   comes from the last round: 3250 for a win, 1900 for a loss (more for each loss in a row, up to
   3400), 300 for setting or disarming the charge, and for each opponent dropped 300 — 600 with an
   SMG, 900 with a shotgun, 1500 with the knife, 100 with the Longwatch. What you carry, grenades
   included, is kept if you live.
2. **Live** (1:55). One Raider has the charge (a ◆ by their ammo, a yellow mark on the radar).
   Raiders win by setting it and keeping it safe for 35 s, or by dropping every Warden. Wardens
   win by dropping every Raider before it is set, by disarming it (6 s, or 3 s with a kit), or by
   running out the clock.
3. Whoever falls watches a teammate until the next round.

Moving and firing fast both open the crosshair: stand still and tap for long shots. A vest takes
half of each hit until it is used up; a helmet makes a head shot hurt less.

| Weapon | Price | What it is |
| --- | --- | --- |
| Knife | everyone has one | 40 a stab; from behind it drops anyone, through armour |
| P9 Sidearm | free | what everyone starts with |
| Viper Machine Pistol | 500 | an automatic pistol, for a round of saving |
| Ram .50 | 700 | a heavy sidearm |
| Badger SMG | 1050 | slow-firing, hard-hitting, cheap |
| Wasp SMG | 1200 | fast and cheap, for close quarters |
| Hornet PDW | 1500 | the steadiest SMG, 40 rounds |
| Gavel 12 | 1300 | a pump shotgun: eight pellets, short range |
| Ripsaw Auto 12 | 2000 | a self-loading shotgun |
| Sparrow Rifle | 2000 | the budget rifle |
| Vantage Rifle | 2700 | the all-round rifle |
| Kestrel Carbine | 2900 | steadier, a little lighter on damage |
| Bulwark Battle Rifle | 3100 | heavy rounds, 20 to a magazine |
| Marksman DMR | 3800 | semi-automatic through a scope |
| Longwatch | 4500 | one shot at a time, through a scope |
| Anvil LMG | 5200 | 100 rounds, slow to carry and slow to reload |
| Frag grenade | 300 | up to 98 damage within 7 m, bounces off walls |
| Smoke grenade | 300 | a cloud nearly 10 m wide for 16 s; nobody sees through it, bots included |

## The bots

Each bot has a part in its team — two riflers, an entry player with a shotgun or SMG, a scope, a
heavy — and buys for it; when the team is short of money they all save together and buy a better
pistol instead. In a fight they stop to shoot (moving spoils aim, theirs as yours) and sidestep
between bursts, rush in close with a shotgun or SMG, and fall back behind the nearest cover to
reload or when they are hurt and losing. They hear shots and turn to them, go after whoever drops
a teammate, grenade a group or a corner someone just ducked behind, and run with the knife out
when nothing is about.

As a team, the Raiders pick a plan each round: a **rush** straight at a site, an **execute** —
gather at the two ways into a site, then go in together behind smoke and grenades — or a **fake**,
gathering and making noise at one site before hitting the other. Wardens hold their posts, come
running when one calls a site, and when the charge is set they regroup and take the site back
together behind smoke.

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
| `src/fps/map.js` | the maps (`MAPS`): boxes, sites and spawns, the bots' paths and plan, and what blocks a walk or a shot |
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
