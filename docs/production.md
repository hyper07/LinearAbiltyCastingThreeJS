# Production: running the game for players

[← Back to the README](../README.md)

One Node process serves everything: the built game, the party server for
[playing together](multiplayer.md), the [shared library](library.md), saved levels and classes,
model uploads, and the bridge to the AI model (the key stays on the server). Accounts, characters,
their history and the library live in **PostgreSQL** (see [The database](#the-database)). Three
dependencies: `ws` (parties), `pg` (PostgreSQL) and PGlite (the same PostgreSQL inside the process,
for a server without one).

```
/                 the built client (dist/), brotli/gzip precompressed, cached
/ws               parties: rooms and relay (WebSocket)
/fps              Breachline: rooms and their matches (WebSocket)
/api/account/*    accounts and sessions
/api/game/*       characters, loot, shops, NPC rewards — the server decides
/api/ai/*         the AI bridge (LM Studio, Ollama, vLLM, any OpenAI-compatible server)
/api/library/*    the content library (PostgreSQL)
/api/games/*      the games on the home page: official (level files) and published (PostgreSQL)
/api/levels/*     levels players save → DATA_DIR/levels
/api/classes/*    classes from the Class forge → DATA_DIR/classes
/api/models/*     uploads and picture-to-3D (keys stay on the server)
/library/*        the downloaded 3D asset library (optional)
/healthz          { ok, version, uptime, rooms, players }
```

## Docker (recommended)

```bash
cp .env.example .env      # optional: the AI model, keys, MAX_PLAYERS
docker compose up --build # → http://localhost:8787
```

`docker-compose.yml` runs two containers: the game, and **PostgreSQL 18** (`db`), reachable only
from the game (no port is published) with its data in the `pgdata` volume. Set
`POSTGRES_PASSWORD` in `.env` before the first start. It mounts `./data` for the levels and classes
players save and the server key, and `./library` for the 3D asset library (download it on the host
with `npm run library:fetch`, or leave it out: maps then use simple shapes). The image is built in
two stages — the client is built, then only `server/`, `dist/` and the packages are copied — and
runs as a non-root user with a health check.

## Without Docker

```bash
npm ci
npm run build                   # also writes .br/.gz copies next to the bundle
node --env-file=.env server/server.js   # or: npm start
```

Requires **Node.js 22.13+**. Set `DATABASE_URL` to your PostgreSQL (14 or newer; tested on 18).
Without it the server runs PostgreSQL in-process (PGlite) in `DATA_DIR/postgres`, which is fine for
one box and a small group. Keep it running with `systemd`, `pm2`, or your host's process manager.

## The database

Everything that must never be wrong — accounts, sessions, plans, characters, the item registry,
the gold ledger, the hash-chained history, strikes and blocks — and the shared library are in one
PostgreSQL database. The tables are in `server/db/migrations.js`. They are created, and later
changed, on start-up: each migration runs once, in order, and several servers starting together
wait for one another.

| | `DATABASE_URL` set | `DATABASE_URL` unset |
| --- | --- | --- |
| What | Your PostgreSQL server (Docker's `db`, or a managed one: Neon, Supabase, AWS RDS, Google Cloud SQL, Azure) | PGlite: PostgreSQL 18 compiled to run inside the game's process |
| Where | That server | `DATA_DIR/postgres` |
| For | Production | `npm run dev`, the tests, one small box |
| Admin tool | Works while the game runs | Stop the game first (one process per folder) |

`?sslmode=require` in the URL turns on TLS (most managed hosts need it). `DATABASE_POOL` sets the
connection pool size (default 10).

**Coming from the SQLite version?** Nothing to do. On the first start on an empty database, the old
`DATA_DIR/game.sqlite` and `DATA_DIR/library.sqlite` are brought in once, in one transaction.
Every id is kept, so the sealed characters still open and the history chain still checks out, and
the import verifies the chain on the way in. The `.sqlite` files are left alone; delete them when
you are happy. `npm run db:import` does it by hand and says what happened. It never mixes into a
database that already has data.

**Backups.** Back up the database *and* the server key (`SERVER_SECRET`, or `DATA_DIR/server.key`):
characters are sealed with it, and a database without its key cannot be opened.

```bash
docker compose exec db pg_dump -U gamory -Fc gamory > gamory-$(date +%F).dump   # back up
docker compose exec -T db pg_restore -U gamory -d gamory --clean < gamory-2026-11-10.dump  # restore
```

## Settings

| Variable | Meaning | Default |
| --- | --- | --- |
| `PORT` / `HOST` | Where to listen | `8787` / `0.0.0.0` |
| `DATABASE_URL` | PostgreSQL, e.g. `postgres://gamory:secret@db:5432/gamory` (add `?sslmode=require` for TLS). Unset = PGlite in `DATA_DIR/postgres` | unset |
| `DATABASE_POOL` | Connections to PostgreSQL | `10` |
| `DATA_DIR` | Saved levels and classes, the server key, and (without `DATABASE_URL`) the database — **back this up** | `./data` |
| `SERVER_SECRET` | The key that seals characters and chains the history (base64, 32+ bytes: `openssl rand -base64 48`). Unset: one is made in `DATA_DIR/server.key`. **Never change it** on a server with players | made for you |
| `ACCOUNTS_PER_ADDRESS_PER_DAY` | New accounts one address may make in a day (raise it for a LAN party behind one address) | `5` |
| `STATIC_ROOT` | The built client | `./dist` |
| `LIBRARY_ROOT` | The 3D asset library, served at `/library/` | `./library` |
| `MAX_PLAYERS` | Players per party (2–8) | `4` |
| `MAX_ROOMS` | Parties at once | `500` |
| `TRUST_PROXY` | `1` behind a reverse proxy: rate limits then see the real client address from `X-Forwarded-For` | `0` |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowlist — only if the page is served from another origin | none |
| `LLM_PLATFORM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL1`, `LLM_TIMEOUT_MS` | The AI model, see [The AI commander](ai-commander.md#wiring-the-model). Unset = the AI is off and the game falls back to keywords | unset |
| `AI_RATE_PER_MIN`, `AI_RATE_BURST` | Model calls allowed per client address per minute, and how many may come at once | `30`, `10` |
| `LLM_PREMIUM_MODEL`, `LLM_PREMIUM_BASE_URL`, `LLM_PREMIUM_API_KEY` | The premium model for **Plus** accounts' AI builds (games, maps, classes). Any OpenAI-compatible API; base URL unset = the same box as `LLM_PLATFORM_BASE_URL`. Unset model = Plus uses the standard one. See [Game builder](game-builder.md#free-and-plus) | unset |
| `AI_DEFAULT_PLAN` | The plan for signed-out players (`free` or `plus`; `plus` is for trying Plus on a dev server) | `free` |
| `TRIPO_API_KEY` / `MESHY_API_KEY` / `MODELGEN_PROVIDER` | Picture-to-3D, see [Your own models](custom-models.md) | unset |

## Behind a reverse proxy (HTTPS)

Put nginx, Caddy, Traefik or your platform's load balancer in front for TLS. Two things matter:
forward WebSocket upgrades (`/ws`, `/mmo` and `/fps`), and set `TRUST_PROXY=1`. For nginx:

```nginx
location / {
  proxy_pass http://127.0.0.1:8787;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header Upgrade $http_upgrade;      # the party socket
  proxy_set_header Connection "upgrade";
  proxy_read_timeout 3600s;                     # keep idle parties alive
}
```

Caddy needs only `reverse_proxy 127.0.0.1:8787` — it forwards upgrades by itself.

The page is served with relative asset paths, so it also works under a sub-path
(`https://example.com/gamory/`), as long as the proxy forwards `/gamory/ws` too.

## What the server protects

- **Accounts and characters**: hashed passwords, hashed sessions, characters encrypted and sealed,
  every item registered once, every action checked, a hash-chained history, strikes and blocks for
  cheating. See **[Accounts and fair play](security.md)**.
- **Payload caps** on every route (prompts 512 KB, library assets 1 MB, levels 12 MB) and a 4 MB
  cap per party message; oversized bodies are refused before they are buffered.
- **Rate limits** per client address on the AI bridge and on library writes, and a per-connection
  message and byte budget on the party socket (a flood closes the socket).
- **Official content is read-only**: a level or class id that ships with the game cannot be saved
  over or deleted; official library assets cannot be changed. Players' content goes to `DATA_DIR`.
- Paths are resolved under their roots (no `..` escapes); unknown routes without an extension fall
  back to the page, everything else is a plain 404; `nosniff`, a referrer policy and
  `X-Frame-Options` on every response.
- A graceful shutdown on `SIGTERM`: parties are told, the socket closes, the database closes.

Players without an account still play on their browser's own save. The shared library and saved
levels are per server and public to everyone who can open it. The fight itself runs in the players'
browsers (the host's, in a party): the server checks that what they report is possible, not that
each kill was earned — see [the limits](security.md#limits--what-this-does-not-stop-yet).

## Scaling

One process holds every party in memory, which is fine for hundreds of parties — the server only
relays; the players' browsers run the game. The game's rules run their requests one at a time in
that process (they read a character, check it and write it back), which a few milliseconds per
request makes hundreds per second.

To go beyond one process, three things are needed, and the database is already ready for them:

- **Rooms:** the party server must be sticky per room (the same process for everyone in a party),
  which a load balancer with cookie or code-based affinity provides.
- **Characters:** the rules keep each character in play in memory. Several processes need each
  account pinned to one of them, or row locks (`SELECT … FOR UPDATE`) in place of the in-process queue.
- **Files:** saved levels and classes are on `DATA_DIR`. Put that on shared storage, or move them
  into the database (planned: games as records, see [Platform architecture](platform-architecture.md)).

The races that matter across processes are already decided in PostgreSQL: taking an item off the
floor is one conditional update, an item id can exist once (primary key), and two history events
cannot share an id.

## Checks

```bash
npm test                # the server: rooms, file stores, the database, the library, accounts and every cheat rule (node --test)
TEST_DATABASE_URL=postgres://user@localhost/postgres npm test   # the same, on a PostgreSQL server (a fresh database per test)
npm run build && npm run test:e2e   # the real server + Chromium: solo, co-op, accounts, the bag, the map editor and the action bar by mouse
```

`npm run test:e2e` needs Playwright's browser once: `npx playwright install chromium`.
`BASE_URL=http://127.0.0.1:5173/ npm run test:e2e` runs the same checks against the dev server.
`/healthz` is for your uptime monitor. `npm run admin -- audit` (in Docker: `docker compose exec game
node scripts/admin.mjs audit`) checks the history chain, every character's seal, the item registry
and the gold ledger; see [Accounts and fair play](security.md#for-the-people-running-the-server).
