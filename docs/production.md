# Production: running the game for players

[← Back to the README](../README.md)

One Node process serves everything: the built game, the party server for
[playing together](multiplayer.md), the [shared library](library.md), saved levels and classes,
model uploads, and the bridge to the AI model (the key stays on the server). It has one dependency
(`ws`) and uses Node's built-ins for the rest.

```
/                 the built client (dist/), brotli/gzip precompressed, cached
/ws               parties: rooms and relay (WebSocket)
/api/ai/*         the AI bridge (LM Studio, Ollama, vLLM, any OpenAI-compatible server)
/api/library/*    the content library — SQLite in DATA_DIR/library.sqlite
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

`docker-compose.yml` mounts `./data` for everything players make and `./library` for the 3D asset
library (download it on the host with `npm run library:fetch`, or leave it out: maps then use
simple shapes). The image is built in two stages — the client is built, then only `server/`,
`dist/` and the one package are copied — and runs as a non-root user with a health check.

## Without Docker

```bash
npm ci
npm run build                   # also writes .br/.gz copies next to the bundle
node --env-file=.env server/server.js   # or: npm start
```

Requires **Node.js 22.13+** (the library uses Node's built-in SQLite). Keep it running with
`systemd`, `pm2`, or your host's process manager.

## Settings

| Variable | Meaning | Default |
| --- | --- | --- |
| `PORT` / `HOST` | Where to listen | `8787` / `0.0.0.0` |
| `DATA_DIR` | Saved levels, classes and the library database — **back this up** | `./data` |
| `STATIC_ROOT` | The built client | `./dist` |
| `LIBRARY_ROOT` | The 3D asset library, served at `/library/` | `./library` |
| `MAX_PLAYERS` | Players per party (2–8) | `4` |
| `MAX_ROOMS` | Parties at once | `500` |
| `TRUST_PROXY` | `1` behind a reverse proxy: rate limits then see the real client address from `X-Forwarded-For` | `0` |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowlist — only if the page is served from another origin | none |
| `LLM_PLATFORM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL1`, `LLM_TIMEOUT_MS` | The AI model, see [The AI commander](ai-commander.md#wiring-the-model). Unset = the AI is off and the game falls back to keywords | unset |
| `AI_RATE_PER_MIN` | Model calls allowed per client address per minute | `30` |
| `TRIPO_API_KEY` / `MESHY_API_KEY` / `MODELGEN_PROVIDER` | Picture-to-3D, see [Your own models](custom-models.md) | unset |

## Behind a reverse proxy (HTTPS)

Put nginx, Caddy, Traefik or your platform's load balancer in front for TLS. Two things matter:
forward WebSocket upgrades on `/ws`, and set `TRUST_PROXY=1`. For nginx:

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

Not provided: accounts. A player's character (bag, levels, gold) lives in their browser's storage,
as it does when playing alone; the shared library and saved levels are per server and public to
everyone who can open it. The party protocol trusts the players — it is for friends, see
[Playing together](multiplayer.md#how-it-works).

## Scaling

One process holds every party in memory, which is fine for hundreds of parties — the server only
relays; the players' browsers run the game. To go beyond one process, the party server needs to be
sticky per room (the same process for everyone in a party), which a load balancer with cookie or
code-based affinity provides; the library and the saved files are on `DATA_DIR`, so put that on
shared storage or move `LibraryStore` to a hosted database (its methods and routes are the contract,
see [The shared library](library.md#where-it-is-stored)).

## Checks

```bash
npm test                # the server: rooms, file stores, the library (node --test)
npm run build && npm run test:e2e   # the real server + two Chromium browsers: a solo run and a co-op run
```

`npm run test:e2e` needs Playwright's browser once: `npx playwright install chromium`.
`BASE_URL=http://127.0.0.1:5173/ npm run test:e2e` runs the same checks against the dev server.
`/healthz` is for your uptime monitor.
