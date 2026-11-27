# Platform architecture — many genres, one platform

[← Back to the README](../README.md)

Gamory is heading from one game to a platform of many. An action RPG needs classes, skill trees,
items and an inventory. A puzzle game needs boards, moves and stars. A story game needs chapters,
choices and endings. This page describes how the platform holds all of them, how each player's
progress is saved per game, and which database fits. Part of it is built (the blueprints and
modules); the rest is the plan.

## Status

| Piece | Status |
| --- | --- |
| Genres, worlds, layouts, casts as data, and the Game builder | **Built**: [Game builder](game-builder.md) |
| Modules: the feature list each genre declares, and what each saves | **Built** as data ([`modules.js`](../src/blueprints/modules.js)), checked by the tests |
| Plans (Free, Plus) enforced by the server | **Built** |
| Engines other than the action RPG | **Built**: the stock market game (engine `market` — [Stock Market Challenge](stock-market.md)) and the work game (engine `work` — [Work Life](work-life.md)), 2D screens sharing a wallet; the strategy game (engine `rts` — [Shardfront](shardfront.md)) and the battle arena (engine `moba` — [Lanebreak](lanebreak.md)), each with its own 3D view; Lanebreak plays in party rooms with the host's browser running the match; the online RPG (engine `mmo` — [Hearthvale](hearthvale.md)) is the first game the server runs itself (`server/mmo`), with characters in PostgreSQL. Puzzle and story: planned |
| Classes and skills players make, offered to the builder and the AI as heroes | **Built** |
| Battle royale on the action RPG engine: storm, AI rivals, players against players, solo and squads | **Built**: see [Battle royale](battle-royale.md) |
| Game packages: each game in its own folder, draft vs versioned production releases, pick-and-deploy, rollback | **Built** (Kickrani first; the other games move one at a time): see [Game packages, draft and production](#game-packages-draft-and-production) |
| The Game Studio: style templates with live previews, a chat box that grows a game as data (one commit per change, in Changes & deploy), free assets, characters, a store, Free / Plus / Creator, classes | **Built** (payments and generation are test-mode / queued interfaces): see [Game Studio](game-studio.md) |
| Games as records, on a home page | **Built**: published games are rows in PostgreSQL with their levels; the home page lists them with the official ones. See [Games on the home page](#games-on-the-home-page) |
| Characters per player, per game, per class | **Built**: a character for each class in each game, in the browser and on the server (sealed to account, game and class); a game's lobby to choose and customize, and to start together |
| NPCs, worlds, monsters and question sets players make, offered by the builder | Planned |
| PostgreSQL | **Built** (chosen 2026-11-10): accounts, characters, items, ledger, history and the library. See [The database](production.md#the-database) |

## The layers

```mermaid
flowchart TB
  subgraph Shell["Platform shell — every game"]
    A["Accounts, plans, families"] --- L["Library: share and reuse"]
    L --- B["Game builder and AI"] --- P["Party: private rooms"]
  end
  subgraph Shared["Shared modules"]
    S1["levels"] --- S2["story"] --- S3["dialogue"] --- S4["study"] --- S5["rewards"]
  end
  subgraph Engines["Engines — one per kind of play"]
    E1["Action RPG (built)<br/>combat · waves · classes · skills<br/>items · inventory · quests"]
    E2["Puzzle (planned)<br/>boards · hints"]
    E3["Story (planned)<br/>choices"]
  end
  Shell --> Shared --> Engines
```

1. **The shell** is the same for every game: accounts and plans, the shared library, the builder and
   its AI, private party rooms, a parent's controls.
2. **Shared modules** work in any engine: levels and campaigns, story scenes, helpers who talk,
   study questions, a parent's rewards.
3. **Engines** play a kind of game. Each engine owns its modules. The 3D action RPG in `src/core`
   is the first. A puzzle engine could be a 2D canvas, and a story engine could be mostly text and
   pictures. They plug in beside it rather than inside it.

A **genre** is a recipe: one engine plus the list of modules it switches on
([`genres.js`](../src/blueprints/genres.js)). A study adventure is the action RPG with `study` and
`rewards` added. Calm learning is the same engine without `combat` or `waves`. A future "picture
puzzle" genre would be the puzzle engine with `boards`, `hints`, `study` and `rewards`. The builder
only offers what the genre's modules use, so a puzzle game never shows a skill tree.

### A module's contract

Each module declares, in one place:

- **its engine**: `shared`, or the engine that provides it;
- **what it saves** for a player in one game, for example `skills` → `ranks`, `slots`, `points` and
  `boards` → `solved`, `stars`, `moves`;
- *(planned)* **its rules on the server**: what a client may change, checked the way the action RPG's
  loot and gold already are;
- *(planned)* **its editor panel and its part of the spec**, so the builder and the AI learn it with
  no other change.

Adding a genre is then data. Adding a module is code in one place. Adding an engine is the only big job.

## Content players make: characters, skills and more

The Barbarian is one example. Players and parents make their own characters and skills, and new
games must be able to use them. The rule is **make once, store once, reference everywhere**.

**Today (built):**

- A class made in the [Class forge](class-forge.md) is saved as one design file in the class store
  (`DATA_DIR/classes` on a server, so every player on it can use it). It is also published to the
  [shared library](library.md) as `class:<id>`, and each of its skills as `skill:<id>`, with a
  fingerprint for finding similar ones and a count of how often it is used.
- A skill is a *design*, not code: a name, a colour, numbers, and the hand-made effect it is built on
  (its `base`). So any skill a player makes inherits that base's behaviour. One built on Battle Roar
  is a team buff with an aura, in its own colour, with no extra work.
- **The Game builder uses them.** The Hero menu lists every class players made beside the built-in
  ones. Naming one in an idea (*"a pirate quest with the Stormbound Corsair"*) picks it with no AI.
  The AI is shown each one in a single line (name, story line, skills: about 40 tokens), and its
  id joins the hero list the AI must choose from, so it can pick them but never invent one. Those
  lines come **after** the fixed menus, so the part of the prompt a hosted model caches stays the same.
- A game **references** the class by id (`level.character`); it never copies it. Improve the class
  and every game that uses it gets the improvement.

**Next (planned):** every kind of thing a player makes becomes a library asset the builder can
offer the same way:

| Kind | Engine | Offered by the builder as |
| --- | --- | --- |
| `class`, `skill` (built) | action RPG | Hero menu; skills inside a class |
| `item`, `weapon` (in the library, not in the builder yet) | action RPG | A merchant's stock, quest rewards, starting gear |
| `npc` (a helper with a name, body, personality and lines) | shared | Helpers in a game, instead of the archetypes |
| `world` (a saved map plan or a hand-made level map) | shared | The World menu |
| `monster` (a monster kind's look and numbers, built on a base) | action RPG | The Monsters menu |
| `question-set` (a parent's questions for a subject and age) | shared | A tutor's lessons |
| `game` (a whole built game) | any | Remix: start from someone's game |
| `puzzle-set`, `story` | puzzle, story | When those engines exist |

Every asset has the same envelope: `id`, `kind`, `engine`, `owner`, `status` (official, shared,
draft, hidden), `version`, `data` (the design), `fingerprint` and `uses`. A game's spec lists the ids
it uses, which pins a version. Deleting an asset that games still use hides it instead.

For the AI, the builder sends only what fits the idea: the player's own assets first, then the most
used shared ones of the kinds the genre needs, capped (30 heroes today). The prompt then stays small
however large the library grows.

## Games on the home page

The platform opens on its games, not on one game's menu
([`ui/PlatformHome.js`](../src/ui/PlatformHome.js)). Each card is a game:

- **Official games** are the levels that ship with the game, read from the level files. Only their
  play counts are stored (`game_plays`).
- **Published games** are rows in `games`, each level in `game_levels` with its id renumbered to
  `<game id>-<n>`, so no game can overwrite another's level or a built-in one. The server's rules
  load these levels by id, so tutor and quest rewards in a published game are checked like any other.
- A game's **card** (genre, world, chapters, goal, study, cover look) is worked out once, when it is
  published ([`platform/gameCards.js`](../src/platform/gameCards.js)), so listing hundreds of games
  never opens a level. The **cover** is drawn from the card: sky by time of day, ground, and a
  skyline for the world ([`ui/gameCover.js`](../src/ui/gameCover.js)).
- Search covers title, summary and maker. Filters are by genre, or kids and study. Sorting is by
  plays or by newest. Only the account that published a game can remove it.

| Route | Does |
| --- | --- |
| `GET /api/games?q=&genre=&sort=popular\|new&limit=` | Cards, official and published |
| `GET /api/games/<id>` | One game, with its levels |
| `POST /api/games` | Publish `{ title, summary, levels[], spec?, author? }` (signed in: the account is the maker) |
| `POST /api/games/<id>/play` | Count a play |
| `DELETE /api/games/<id>` | Remove (its maker only) |

Not yet: private games for a family, a maker's own page, likes, and comments.

## Game packages, draft and production

The platform and its core stay put; each game lives in **its own folder** and ships on its own.
Someone building or testing a game changes only that folder, and players keep the last
**production release** until an admin deploys a new one. Kickrani is the first game moved;
every other game is still built into the platform (the "legacy" path in `App.openLobby`) until it
is moved the same way, one at a time (steps below).

```
games/<code>/                 the DRAFT: the game's live source (developers and agents edit it)
  game.json                   { code, id, slug, title, version, api, entry, description, genre?, card?, smoke? }
  index.js                    export async function mount(container, platform) → { root, dispose, view? }
  README.md                   the file map: what each module does, where the tuning numbers live
  tests/                      the game's own unit tests
releases/<code>/<version>/    a PRODUCTION release: built alone, every import bundled, never changed
  game.js, game.css, …        the files (ES module + stylesheet)
  release.json                version, date, deployedBy, notes, source { mode, base, picks, head },
                              added (the changes it brought over the previous one), checks,
                              entry, css, files [{ path, bytes, sha256 }], builtWith
releases/<code>/current.json  { version, updated, by, action } — what players get
releases/<code>/log.json      every deploy and rollback
```

- **The folder is a shortcode** (`g_` + 10 random base32 letters, e.g. `g_cv2yrhrpv2` for
  Kickrani), assigned once by `npm run game:create` and never renamed, so two games can never
  collide. The human name, the slug (`kickrani`) and the platform game id (`official:seoul`, kept
  so saves and links do not break) are in `game.json`. Every command takes any of the three; the
  registry is the manifests themselves (`scanPackages` in
  [`server/gamePackages.js`](../server/gamePackages.js)), and two packages claiming one id or
  slug are refused by name.
- **The contract** ([`src/platform/gameApi.js`](../src/platform/gameApi.js), api 1): the platform
  calls `mount(container, platform)` and nothing else. `platform` is `{ api, account, game,
  release: { channel, version }, dev, params, exit(), track(), music: { away, back } }`, frozen.
  It only ever grows; a breaking change is a new api number, with the old one kept for the
  releases built on it. A game imports `three`, npm packages and the stable shared libraries
  (`src/shared/…`, `src/net/Session.js`, `src/pixel/…`); never `src/core`, `src/ui` or another
  game's folder. What Kickrani borrows from Snowpuff Peaks and AI Arcademia comes through
  [`src/shared/plushKit.js`](../src/shared/plushKit.js), a facade whose exports are the contract.
- **The platform never imports a game.** [`src/platform/packageLoader.js`](../src/platform/packageLoader.js)
  loads by URL at run time: production reads `releases/<code>/current.json`, then
  `release.json`, adds its stylesheets and `import()`s its `game.js`; the draft is
  `/games/<code>/<entry>` through Vite on the dev server (live), or for an admin on a production
  server a build of the committed draft (`POST /api/releases/<code>/draft`). A unit test walks
  every module the platform's pages can reach and fails if one is in `games/`.
- **Production by default** (`chooseChannel`): players always get production. The draft only
  when asked for (`?draft=<game>`, or the admin's "Play draft") **and** allowed (the dev server,
  or the platform admin). A game with no release yet is a draft only the admin sees (DRAFT badge;
  `GET /api/games?drafts=1` is honoured only for the admin). `?release=x.y.z` loads one particular
  release (the deploy's smoke check, comparisons), for the same people.
- **The home page** lists a package's game like any other (`GamesStore.official()` merges the
  manifests through `packageGames()`), and the game's page shows its production version, small.
  For the platform admin it adds **🧪 Play draft** and **🛠 Changes & deploy**. Who is the admin:
  the platform admin of [production](production.md) (`ADMIN_ACCOUNTS` + `ADMIN_PASSWORD`, HTTP
  Basic, `server/api/adminAuth.js`). A signed-in account named in `ADMIN_ACCOUNTS` only gets the
  buttons; every action asks for the password. On the dev server with no admin configured, this
  machine is the admin.

### Releases: where, and why there

Releases are **committed** under `releases/` at the repository root and served by the platform
server from `RELEASES_DIR` (default `./releases`) at `/releases/…` — the same handler
([`server/releases.js`](../server/releases.js)) on the dev server, `vite preview` and
`server/server.js`. Committed, because a release is part of what the platform ships: a clone or a
Docker image always has the exact bytes players got, a rollback is a pointer change with no
rebuild, and git history shows every release. They are small (a game's minified JS and CSS,
fonts inlined, no source maps); the `.br`/`.gz` copies the server sends are made on deploy and in
the Docker build and are git-ignored. Big assets (models, textures, map tiles) are never in a
release: the game fetches them at run time from `/library/…`, `/geo/…` and `public/`, exactly as
before, so data stays out of git.

### The development view: changes, picking, history

Like publishing a data app: the draft has a history of changes, and you choose which reach players.

- **Changes** (the admin's panel on the game's page, [`src/ui/ReleasePanel.js`](../src/ui/ReleasePanel.js);
  `npm run game:changes -- <game>`): every commit touching `games/<code>/` that production does
  not have — commits after the live release's **base** that it did not **pick** — newest first,
  with hash, date, author, message, files and +/− lines, and a file-by-file unified diff for each
  (`npm run game:diff -- <game> <hash>`).
- **Pick, then deploy**: tick changes, choose patch/minor/major, edit the notes (prefilled from
  the ticked messages), deploy. The release is built from the live release's base, its picks, and
  ONLY the ticked commits, applied oldest first — each commit's part under `games/<code>/` only,
  `git apply --3way` in a temporary worktree. If one does not apply, the deploy stops and names
  the change, its files and git's reason; nothing changes for players. Ticking all = **deploy the
  draft**: the base moves to the current commit and the picks reset — that is also how changes to
  the shared libraries reach a game (a pick keeps the base's `src/shared`).
- **Gates**: the release's own source must pass the game's unit tests (`game:test`, run in the
  temporary worktree) before anything is written; the CLI then writes the release *staged*, loads
  it once in a browser (`game:smoke --release`) on the running platform when one is up, and only
  then points `current.json` at it. A failed smoke removes the staged folder. `--force` skips both.
  The admin panel's deploy runs the unit-test gate (no browser on the server).
- **History** (`npm run game:history -- <game>`): every release with what it added over the one
  before, its base and picks, who and when, which one is live, the changes not yet in production,
  and **Make this live** (`npm run game:rollback -- <game> <version>`): instant, only
  `current.json` changes.
- **Deploys are from commits only.** Uncommitted edits are never deployed. Git always runs with
  fixed argument lists (no shell); hashes, codes and versions are checked against strict
  patterns; temporary worktrees live under the OS temp dir (`GAMES_SCRATCH`) and are removed
  afterwards; the main working tree is never touched. See [production](production.md#deploying-one-game).

### The fast loop for one game

| Command | Does |
| --- | --- |
| `npm run game:create -- --title "…" [--template 3d\|2d]` | A new shortcode folder with a complete starter: manifest, `mount()`, a three.js scene (renderer, camera, lights, resize, dispose) or a pixel canvas, input, pause and exit, HUD, How to play (`src/shared/helpPanel.js`), music (`src/shared/music.js`), credits, a unit test, README with the file map. A draft until its first deploy |
| `npm run game:dev -- <game> [--race 1 --laps 1 …]` | The dev server opened straight into the game's draft (`?play=<slug>&draft=<slug>` plus scene params, read by the game as `platform.params`); it stops watching the other packages |
| `npm run game:test -- <game>` | Only that game's unit tests: `games/<code>/tests/` and every `tests/unit` file importing its folder |
| `npm run game:smoke -- <game> [--release x.y.z]` | One headless load (~10 s, on the running dev server): fails on console errors, saves `.captures/smoke-<slug>.png` |
| `npm run game:deploy -- <game> --all \| --pick <h,…>` | Builds that game alone (one Vite library build), gates, release |
| `npm run wt:setup` | A fresh git worktree ready to run: links `node_modules`, `library/`, `data/geo` (never `data/postgres`) |

The platform build (`npm run build`) never builds a package, and a package's build never builds
the platform. `vite.config.js` lets the dev server serve the real folders behind a worktree's
links (`server.fs.allow`), so the font 403 that made every agent write a temporary config is gone.

### Studio games

Games made in the [Game Studio](game-studio.md) are packages too (`"template": "studio"`): their
folder holds data files played by the shared runtime (`src/shared/studio/`), each chat change is
one commit authored by its maker, and the manifest's `studio: { owner, listed }` keeps a private
or class game off the home page, the public package list and `/releases/` (`isUnlistedStudio`)
until its owner asks for it to be public and the admin approves and deploys it.

### Moving another game into a package (one at a time)

1. Allocate its shortcode: `npm run game:create -- --title "<Title>" --slug <slug> --id official:<id>`
   (keep the game's existing id), then delete the starter files except `game.json`.
2. **Move it in its own commit** — a pure `git mv src/<folder>/* games/<code>/`, no edits — so
   rename detection carries its history and other branches' changes across.
3. Next commit: fix the imports (`../shared/` → `../../src/shared/` …); route anything borrowed
   from another game through a facade in `src/shared/` (like `plushKit.js`); update the tests,
   scripts and docs that named the old path.
4. Write `index.js`: `mount(container, platform)` builds the game's screen with what
   `App.open<Game>` passed it (`platform.account`; `platform.exit` as its `onClose`) and returns
   `{ root, dispose }`.
5. In `App.js`, delete `open<Game>` and its `if (game.engine === …)` line: `game.package` routes it
   to `openPackage`. Keep its `ENGINE_GAMES` entry (title, card); `packageGames()` adds the package.
6. Add `README.md` (the file map) and `tests/`; the "platform bundle" unit test must still pass.
7. First release from a known-good commit: `npm run game:deploy -- <slug> --base <commit> --version 1.0.0`,
   then commit `releases/<code>/`.

## Saving progress per player, per game

**Built:** a character lives in a *scope*, `<game>#<class>` (`official:thistledown#mage`,
`g-moon-garden-1a2b3c4d#knight`), or `arena` for the open arena (and every save from before games).
Each is its own character: level, experience, gold, bag, stash, gear and skill ranks. In the browser
it is its own saved copy. On the server, characters, items and the gold ledger carry the scope, the
rules work on the request's scope (a fight's is its run's, which the browser cannot change), a saved
character is sealed to its account and scope, so one copied into another game does not open, and the
audit checks each scope's gold against its own ledger. A game's lobby shows your characters there
(`GET /api/game/characters?game=`). Customization (body, colours) is kept per scope too.

The rest of this section is the original plan; the parts not done yet are marked.

- A **game** becomes a record of its own: owner, title, engine, genre, modules, the spec, its levels,
  its **roster** (the characters players may choose, chosen when it is made; a class from the forge
  is copied in), and whether it is private, shared with family or public. *(Built, except private and
  family visibility.)*
- A player's progress lives in **one save per player, per game, per module**. Each save is a small
  document in the shape its module declares, with a schema version so it can be migrated.
- **Progress scope** is the game's choice. `game` keeps everything inside that game, which suits a
  parent's study game or a puzzle pack. `engine` shares a character across every game on the same
  engine, so an RPG hero keeps their gear from one RPG to the next, like seasons in action RPGs.
  Today's single character becomes the `engine` scope of the action RPG.
- **Money and items stay strict.** Gold, items and anything a player could duplicate or trade stay
  in ledger-style tables with server-side rules. That is what the anti-cheat
  ([Accounts and fair play](security.md)) is built on.

## Which database

**Chosen: PostgreSQL, using JSONB columns for the parts that differ by genre.** It is in place: a
PostgreSQL server in production (`DATABASE_URL`), and the same PostgreSQL in-process (PGlite) for
`npm run dev` and the tests, so there is one SQL dialect and nothing to install. Redis and object
storage come when traffic needs them. The comparison that decided it:

The data is two kinds at once, and the choice depends on handling both well:

| Data | Shape | Needs |
| --- | --- | --- |
| Accounts, plans, payments, families | Fixed, relational | Constraints, joins, never wrong |
| Gold ledger, item registry (anti-duplication) | Fixed, relational | Transactions across rows, unique rules, sums that must add up |
| Game specs, levels, saves per module | Different per genre, nested | Flexible documents, versioned |
| Rooms, presence, leaderboards | Short-lived, hot | Speed, not durability |
| 3D models, pictures, big level files | Files | A CDN |

| | PostgreSQL + JSONB | MongoDB |
| --- | --- | --- |
| Accounts, payments, ledger, items | Its strength: transactions, foreign keys, unique and check constraints | Possible (multi-document transactions exist), but you hand-build what constraints give for free |
| Saves that differ per genre | JSONB documents, indexed (GIN), queried with SQL | Its strength |
| Both in one database | Yes | Documents yes; the money side needs more care |
| What the code already did | The SQLite schema (ledger, item registry, hash-chained history) moved over almost as-is | A rewrite of the anti-cheat storage |
| Hosting | Managed almost everywhere (Neon, Supabase, AWS RDS/Aurora, Google Cloud SQL, Azure) | MongoDB Atlas, or self-hosted |
| In game backends | Common. The open-source Nakama game server runs on PostgreSQL or CockroachDB | Common for content and saves, often next to a SQL database |

MongoDB would work well for game content and saves. The reason not to choose it is the other half:
this platform has real money (Plus), items that must not be duplicated, and parents' rewards.
Those need the guarantees a relational database gives by default. PostgreSQL with JSONB covers
the document side well enough that one database serves both. With MongoDB you would likely end up
running a SQL database next to it anyway.

The choice is also reversible. The game only talks to stores through a small interface
(`GameDB`, `LibraryStore`, the level and class file stores). Moving means re-implementing those,
not touching the game.

### Sketch of the tables

```sql
accounts   (id, name, plan, family_id, …)             -- as today, plus families for private play
assets     (id, kind, engine, owner_id, status, version, data jsonb, fingerprint jsonb,
            uses, created, updated)                    -- classes, skills, items, NPCs, worlds… players made
games      (id, owner_id, title, engine, genre, modules text[], spec jsonb,
            visibility, version, created, updated)     -- a built game
game_assets(game_id, asset_id, asset_version)          -- what a game uses, by reference
game_levels(game_id, level_id, ord, data jsonb)        -- its chapters (a plan, a few KB each)
saves      (account_id, game_id, module, data jsonb, schema_version, updated,
            PRIMARY KEY (account_id, game_id, module)) -- progress, per player, per game, per module
items      (uid, owner, game_id, state, data jsonb, …) -- as today, scoped to a game or an engine
ledger     (id, account_id, game_id, delta, balance, reason, ref, at)
reward_rules (game_id, rule jsonb)                     -- a parent's "30 gold per right answer"
events     (id, account_id, type, data jsonb, prev_hash, hash)  -- the history chain, as today
```

## How to get there

1. **PostgreSQL** — *done.* The stores run on PostgreSQL (a server, or PGlite in-process), with
   migrations and a one-time import of the old SQLite data that keeps every id and checks the history chain.
2. **Games as records** — *done.* `games` and `game_levels` with `/api/games`; the builder publishes
   a game; the home page lists them. Still to move: the campaign's own levels and classes, from files into the database.
3. **Saves per module**: split today's character into `saves` rows (`classes`, `skills`,
   `inventory`, `rewards` …) under the action RPG's `engine` scope. Every existing character is
   migrated once, and nothing changes for players.
4. **A second engine**: a small puzzle or story engine, to prove modules plug in. The builder then
   offers its genres.
5. **Scale-out** when needed: Redis for rooms, presence and leaderboards across servers, and object
   storage with a CDN for the asset library.

Step 3 is next: it brings the most value, and needs nothing beyond the database now in place.
