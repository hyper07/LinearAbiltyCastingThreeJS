# Game Studio

[← Back to the README](../README.md) · [Platform architecture](platform-architecture.md) · [Game packages](platform-architecture.md#game-packages-draft-and-production)

The Game Studio is where anyone makes a game on Gamory and keeps growing it. You pick how it
looks from live previews, give it a name, and then build it in a chat box beside a playable
preview: "add a snowy forest map with a frozen lake", "make the boss slower", "add a coin
sound". There is also a browser of free assets, a character maker, a store for sharing
characters (free, or for sale on the Creator plan), plans with usage meters, and classes for
educators. Open it with **🎨 Studio** on the home page, or from **Make: a game in the Studio**.

| Piece | Where |
| --- | --- |
| The page (tabs, previews, editor, chat, assets, characters, store, classes, plan, review) | [`src/studio/`](../src/studio/) |
| The game data, the chat patch, the offline planner, the runtime | [`src/shared/studio/`](../src/shared/studio/) |
| The server: `/api/studio/*` | [`server/studio/`](../server/studio/) |
| The style template | [`server/gameTemplates.js`](../server/gameTemplates.js) (`studio`) |
| The plans table | [`src/platform/plans.js`](../src/platform/plans.js) |
| Tables | migration `012-studio` in [`server/db/migrations.js`](../server/db/migrations.js) |
| Tests | `tests/unit/studio-*.test.mjs` |

## The flow

1. **Pick a style.** Four cards with small live scenes (they run only while you hover or tap
   them, and only one at a time, so a school laptop copes):
   - **Full 2D**: top-down sprites on a painted map.
   - **Full 3D**: 3D characters in a 3D world, with a follow camera you turn by dragging.
   - **2D characters, 3D world** (HD-2D, like Lanternwood): sprites standing in a lit 3D diorama.
   - **3D characters, 2D backdrop**: a side view with 3D characters in front of a painted,
     layered parallax background.
2. **Pick how characters move**, each shown on the same sample character: **pixel**
   (a few poses at 8 frames a second), **smooth** (skeletal swings every frame), **toon**
   (stepped at 12 fps with squash and stretch) or **plush** (hops, squishes, springy ears).
3. **Pick a look**, shown on the same scene: **realistic** (physical materials, ambient
   occlusion, soft shadows), **stylized**, or **cartoon/plush** (toon bands and ink outlines).
4. **Pick a starter and a name.** The starters are the Game builder's genres plus a
   collect-a-thon; each sets the first map, the cast and the goal. **Create** makes a new game
   package: a shortcode folder `games/<code>/`, private to you.
5. **Build it by chatting.** The editor shows the game running on the left (click it, then
   WASD), the chat on the right. Each accepted change is saved as its own version with an
   **Undo**. Maps are data, so the game grows map by map: "add a map" appends a level built
   from its recipe (biome, features, weather, time of day, what to collect, who lives there).
6. **Share it.** Private (just you), shared with your classes, or public (after a review).

### How a Studio game is made

A Studio game is **data played by a shared runtime**, not code. Its package folder is:

```
games/<code>/
  game.json          the manifest; "template": "studio", "studio": { owner, listed }
  index.js           mount(container, platform) → the runtime with the data below
  data/style.json    render, animation, look, palette
  data/rules.json    genre, goal, lives, time limit, player speed, jumping, difficulty, intro
  data/maps.json     { maps: [ … ] } — biome, size, features, weather, time, collectibles, spawns, props, music, story
  data/cast.json     { player, characters: [ … ] } — role, body, colours, accessories, size, speed, health, damage, behaviour, line
  data/audio.json    the music and the sound for each event
  data/assets.json   every outside asset used, with licence and credit
  tests/             checks the data against the schema (the deploy gate runs it)
  README.md
```

The schema is [`src/shared/studio/spec.js`](../src/shared/studio/spec.js); the runtime is
[`src/shared/studio/runtime.js`](../src/shared/studio/runtime.js) with its world builder,
looks, animation styles, procedural characters and synthesized sounds beside it. The template
is **one template with parameters** (4 render styles × 4 animation styles × 3 looks × the
starters, as values in the data), not a copy per combination — a unit test builds every
combination and validates it. `npm run game:create -- --title "…" --template studio` makes one
from the command line too (the defaults: full 3D, plush, cartoon, collect).

Because the code is shared, a game made today gets the runtime's improvements with its next
release, and the chat can never break code: it can only change data, and only within the schema.

## The chat patch

The chat sends the request and the game's data to the server (`POST /api/studio/games/<code>/chat`).

1. **With an LM model configured** (`LLM_PLATFORM_BASE_URL` …, the same settings as the Game
   builder), the server sends the LM model a system prompt (the ops, every allowed value, the
   speed and health ranges, "keep it right for children"), a compact view of the game, the map
   being looked at, and the request — and asks for JSON in the patch schema below
   (`response_format: json_schema`, strict). The answer is **not trusted**: it is checked field
   by field against the schema and against the game (ids that exist, limits, music that exists,
   assets that are free), and its free text is cleaned (no contact details, no links, no bad
   words).
2. **Without a model**, or when it is slow, or when its answer does not fit, the **offline
   keyword planner** ([`planner.js`](../src/shared/studio/planner.js)) turns the words into the
   same kind of patch. It is deterministic and tested; it understands maps ("add a snowy forest
   map with a frozen lake", "remove the last map", "make it rain on map 2", "more coins"),
   characters ("add 3 slime enemies", "make the boss slower", "a friendly guide who says …"),
   sounds and music, rules (lives, time limit, jumping, easier/harder) and style ("make it
   pixel art in HD-2D").
3. The patch is applied to a copy of the data, the whole result is validated again
   (`validateData`), and only then are the changed files written and committed.

```jsonc
{
  "summary": "Added the map Snowy Forest.",          // one friendly sentence
  "ops": [                                            // at most 12
    {
      "op": "addMap",        // addMap | updateMap | removeMap | addCharacter | addSpawn | updateCharacter |
                             // removeCharacter | setPlayer | setRules | setStyle | setMusic | setSfx | useAsset
      "target": null,        // a map id/name/number, a character id, or an sfx event — by op
      "map": { "name": "Snowy Forest", "biome": "snow", "size": null, "features": ["trees", "frozen-lake"],
               "weather": null, "time": null, "collectible": null, "collectibles": null, "story": null },
      "character": null,     // { name, role, base, body, main, second, accent, accessories, size, speed, health,
                             //   damage, behaviour, line, count } — null fields = leave as it is
      "rules": null,         // { goal, lives, timeLimit, playerSpeed, jump, difficulty, intro }
      "style": null,         // { render, animation, look, palette }
      "sound": null,         // setSfx: one of our sounds
      "track": null,         // setMusic: a track id from public/audio/bgm, or "none"
      "asset": null          // useAsset: a free asset id (below)
    }
  ]
}
```

Every op has every field (strict JSON schema); unused ones are `null`. The allowed values:
biomes `meadow forest snow desert beach cave castle lava city space swamp candy`; features
`lake frozen-lake river hills trees rocks ruins flowers bridge village crystals mushrooms cactus
snowmen lava-pools towers`; weather `clear rain snow fog leaves embers`; time `day dawn sunset
night`; goals `collect defeat boss reach survive explore`; roles `enemy boss npc ally`;
behaviours `wander chase guard patrol flee idle`; bodies, accessories, sounds and events in
`spec.js`. Limits: 30 maps, 40 characters, 8 spawns and 60 collectibles per map, 512 KB of data.

**Where changes go.** Each accepted change is **one git commit** on the current branch that
touches only `games/<code>/data/`, with the maker as its author
(`Name <account-<id>@studio.gamory.invalid>`) and the request in the message. That is the
game's **draft**: it shows in the admin's **Changes & deploy** like any other package change,
and **production never changes from the Studio** — only a deploy does. The chat shows a diff
summary of each change and an **Undo**, which commits the reverse of that one change (refused,
cleanly, if later changes edited the same lines). The Changes tab lists every version.

## Assets and licences

The asset browser offers only what anyone may use in a game they share, each with its
licence and who made it. **Use in my game** writes a reference into the game's data and adds
the credit to `data/assets.json`, which the game shows under **Esc → Credits**.

| Tab | What | Licence |
| --- | --- | --- |
| Characters | Our character presets (plush, pixel, toon) | CC0, Gamory originals |
| Characters | Rigged/creature models from the downloaded library | CC0 or CC BY 4.0 (credited) |
| 3D models | Props, trees, buildings… from `library/catalog.json` | CC0, CC BY 4.0, MIT, Apache-2.0 |
| Backgrounds | Biome backdrops (ours); ground textures (ambientCG) | CC0 |
| Sound effects | 16 synthesized sounds (`src/shared/studio/sfx.js`) | CC0, Gamory originals |
| Music | The platform's tracks (`public/audio/bgm`) | MIT, generated with ACE-Step 1.5 |

Never offered: anything "free to use but not to redistribute" (e.g. Mixamo), share-alike
licences, avatars under a vendor's terms, or anything without a stated free licence. The
library itself is downloaded (`npm run library:fetch`, never committed); on a server without it
the model and texture tabs are empty and the rest works. Players' own characters (`chr:`) and
store items they own (`mkt:`) can be used too; a store item carries its terms.

Asset ids: `own:character/<preset>`, `own:backdrop/<biome>`, `lib:model/<id>`,
`lib:texture/<id>`, `sfx:<sound>`, `bgm:<track>`, `chr:<id>`, `mkt:<listing>`.

## Characters

The **character maker** builds a character instantly from our own kits: a base (plush, pixel
or 3D toon), a body (bunny, bear, cat, fox, penguin, frog, bird, dino, kid, knight, mage,
robot, slime, ghost, blob), three colours, up to three accessories, a size and a line to say.
The 3D bodies follow the "premium toy" rules of the render-quality guide (big heads, low wide
eyes, soft shapes, sheen for plush); pixel ones are shaded with the pixel kit at 4× detail. In
2D styles, smooth, toon and plush characters are pre-rendered from the 3D model into sprite
frames when a map loads.

**Heavy AI generation** (picture-to-3D, voices, music) runs on our **generation server** (the
Mac Studio), never on the web server. The interface is a queue: `POST /api/studio/jobs`
`{ kind: 'picture-to-3d' | 'voice' | 'music', prompt }` counts against the plan's generations
this month and stores the job; the generation server takes the oldest one it can make with
`GET /api/studio/worker/next?kinds=…` and reports with `POST /api/studio/worker/<id>`
`{ ok, result }`, both with `Authorization: Bearer $STUDIO_GEN_TOKEN`. Until a worker is set
up (no `STUDIO_GEN_TOKEN`), the Studio says **coming soon** and charges nothing.

## The store

Anyone can **share** a character for free ("free, credit the creator"). Selling is part of the
**Creator** plan. Each listing has a creator, a preview, a price in **credits** (shown with
its KRW and USD value: 1 credit ≈ ₩100 ≈ $0.08) and a licence for buyers:

| Terms | Buyers may |
| --- | --- |
| `free-credit` | use it anywhere, crediting the creator (free items) |
| `standard` | use it in any of their own games, private, class or public; not resell it |
| `class-only` | use it in private and class games only — a public request with it is refused |

Because children use the store, **every listing waits for the admin** (status `pending`) before
it appears; three reports from different people hide it until the admin looks; the admin's
**🛡️ Review** tab approves, hides or rejects listings, closes reports and answers public-game
requests. Buyers keep what they bought if a listing is later withdrawn. Purchases are recorded
per account; creators see their sales and earnings (never who bought).

Buying a paid item: the plan's discount, one charge through the payments interface, the
purchase, and the seller's share (the Creator plan's revenue share) — all or nothing; a failed
or refunded payment records nothing.

## Plans

One table in [`src/platform/plans.js`](../src/platform/plans.js) (`PLANS[id].studio`), read by
the server (which enforces it) and the page (which shows it). Change a number there.

| | Free | Plus | Creator |
| --- | --- | --- | --- |
| Price (shown; test mode) | free | ₩5,900 · $4.99 / month | ₩14,900 · $11.99 / month |
| Private and class games | **unlimited** | **unlimited** | **unlimited** |
| Public games | 1 | 5 | unlimited |
| Chat changes per day | 30 | 200 | 1,000 |
| AI generations per month | 3 | 30 | 200 |
| Paid store items | full price | 10 % off | 20 % off |
| Selling in the store | share for free | share for free | yes, keep 70 % |
| Studio space | 50 MB | 500 MB | 5 GB |
| Classes at once (students each) | 5 (40) | 20 (60) | 50 (200) |

Private games are unlimited on every plan **with free assets**, so an educator can build as
many simulators for a class as they need at no cost; the limits apply to making games public,
chat changes, generation, the store and space. The **⭐ Plan** tab shows the plan, a meter for
each limit and the upgrade page. The AI fields of each plan (models, tokens, builds a day) are
unchanged; Creator gets Plus's and a little more.

## Educators and classes

Any account can run a class (**🏫 Classes → Teach**):

- **Make a class** with a name and a rule: *I approve each student* or *anyone with the code
  joins*. It gets a **join code** (`ABCDE-FGHJK`: 10 characters without look-alikes, ≈ 49 bits)
  and a **join link** (`…/?join=ABCDE-FGHJK`, which opens the Studio's join box). Codes last
  14 days; **New code** replaces it at once (the old one stops working).
- **Students join** with the code. Family rules first: an account with a **family PIN** (AI
  Arcademia's parent PIN) joins as *waiting for a parent* unless a grown-up types the PIN, and a
  grown-up can agree later from the class page. Then the class's rule: *waiting for the
  teacher* until let in.
- **Share games**: any of the teacher's games, **pinned** to the version shown now (students
  play exactly that, whatever the teacher changes next) or **always the newest**. Sharing a
  private game makes it *shared*; making it private again stops students opening it.
- The teacher **lets students in, removes them, ends the class**, and sees **who played what**
  (names, counts, when). Students see the class, the teacher's name and its games — **never the
  other students**.
- A game used in class can contain paid store items the teacher owns (the class plays under the
  teacher's licence); it can be made **public** only if every item's licence allows it.

**Nothing shared with a class is public**: class games never appear on the home page, in
search, in the public package list or in the store, and their release files are not served to
anyone but the admin. Students reach a class game only through `GET /api/studio/play/<code>?class=<id>`,
which checks on every call that they are an active member of an active class the game is
shared with, and that the game is not private.

## Security

- **Server-side checks everywhere**: signed in; same-origin JSON for every write; rate limits
  per account and address; ownership (someone else's game is *not found*, never *forbidden*);
  plan limits counted atomically in the database; membership and visibility on every play;
  admin for review (`ADMIN_ACCOUNTS` + `ADMIN_PASSWORD`; on the dev server with no admin set,
  this machine).
- **The chat never writes outside the game's data folder**: fixed file names
  (`data/<style|rules|maps|cast|audio|assets>.json`), the code checked against `g_` + 10
  letters, linked folders refused, and nothing written until the whole result passes the schema.
- **LM output is data, not instructions**: strict schema, every value checked, text cleaned.
- **git with fixed argument lists** (no shell), hooks and signing off, one write at a time,
  commits touching only `games/<code>/`.
- **Join codes**: long, expiring, rotatable; joins are rate-limited and ten wrong codes in an
  hour lock joining for that account and address.
- **Unlisted Studio games** (private or class) are filtered out of the home page and the public
  `/api/releases` list, and `/releases/<code>/…` answers 404 for them except to the admin.
- **No secrets in the page**: the model key, the generation token and any payment keys stay in
  the server's environment.
- **Kids**: everything public (store items, public games) is reviewed first; reports hide;
  paid actions (plans, buying, selling) ask for the family PIN where the family has one.

## Payments: test mode, and going live

**Everything that looks like money is TEST MODE.** [`server/studio/payments.js`](../server/studio/payments.js)
is an interface — `charge`, `subscribe`, `refund` — with one provider, **fake**, which approves
(or, with `PAYMENTS_FAKE_FAIL=1`, declines) without touching any money or card. Every payment
row says `test: true`; the page shows **TEST MODE** in its bar, on the store and on the plan
page. Any other `PAYMENTS_PROVIDER` refuses to start, so a misconfigured server can never look
as if it takes real money.

To go live, the remaining work is:

1. A real provider in `payments.js` with the same four members, for a payment service that
   supports KRW and USD (cards and local methods), its secret key only in the server's `.env`.
2. Webhooks verified on the server (signature, idempotency keys) to confirm charges and
   renewals, cancel and downgrade subscriptions, and handle refunds and chargebacks.
3. Real credit top-ups or per-item charges; creator **payouts** (identity checks, tax forms,
   a payout schedule) — earnings are recorded now but nothing is paid out.
4. Terms of sale, refund policy, receipts, VAT/GST, and the store's licence texts reviewed by
   a lawyer; age rules for selling (creators under 18 need a guardian's account).
5. Keep the parent/guardian check in front of every paid action, and add spending limits
   parents can set.

## Settings

| Variable | What | Default |
| --- | --- | --- |
| `STUDIO_REPO` | The git checkout Studio games are committed to (`GAMES_DIR` must be inside it) | the working directory |
| `STUDIO_GEN_TOKEN` | The generation server's token; unset = generation "coming soon" | unset |
| `PAYMENTS_PROVIDER` | Only `fake` (test mode) exists | `fake` |
| `PAYMENTS_FAKE_FAIL` | `1` makes the fake provider decline (for testing) | unset |
| `LLM_*` | The LM model for the chat (as the Game builder); unset = the offline planner | unset |

A server that is not a git checkout (a plain Docker image) can still serve the Studio's pages,
assets, store and classes, but cannot save game changes: making and editing games answers 503
with a note. Run the Studio's writer where the repository is, or mount it.

## API

`/api/studio/…` — `meta`, `plan`, `plan/upgrade`, `games`, `games/<code>` (`chat`, `undo`,
`use-asset`, `visibility`), `assets`, `characters`, `store` (`<id>`, `buy`, `withdraw`,
`report`), `purchases`, `sales`, `classes` (`join`, `<id>`, `code`, `end`, `leave`,
`parent-approve`, `members/<id>`, `games`), `play/<code>` (`played`), `jobs`,
`worker/next`, `worker/<id>`, `admin/queue`, `admin/listings/<id>`, `admin/reports/<id>/close`,
`admin/games/<code>/public`. The full list with bodies is at the top of
[`server/studio/index.js`](../server/studio/index.js).

## What is not done yet

- The runtime is one engine with four views; deeper genre rules (questions for study games,
  waves for survival beyond a timer, dialogue trees) are next, as data fields.
- Library character models are placed as static models (no retargeted animation yet).
- The editor has no map painter: maps come from recipes (biome, features, counts).
- Payments, payouts and generation are interfaces only (above).
