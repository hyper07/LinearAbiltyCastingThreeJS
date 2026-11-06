# The AI commander

[← Back to the README](../README.md)

## The commander — chat that casts

Press **T** (or **Enter**) and type an order. Something on the field dies.

```
> meteor the group
Cmd  Cinder Fall — the thickest of them.

> the heavy one is closing on me, lock it down first and keep the little ones off my back
Cmd  Locking down the golem, keeping the grunts at bay.
     → Glacial Crown freezes the golem, Voltaic Snare roots the two imps
```

It is not a scripting console. The commander presses exactly the buttons you press: it resolves an
order to an element and a point on the floor, and `App.castAt` fires it through the same `_fire`
that a mouse click goes through — same cooldowns, same range clamp, same cast animation, same
`Combat.open`. There is no second code path and no way to reach anything a player could not.

**Two tiers, and the fast one goes first.**

1. **The reflex parser** (`src/ai/LocalIntent.js`) gets first refusal. It is a keyword table:
   "meteor the group", "snare whatever is closest", "summon two brutes", "next wave", "slow motion".
   A hit answers in a fraction of a millisecond, marked with a ⚡ in the log. This is the tier you
   actually use mid-fight.
2. **The model** (`src/ai/AIDirector.js`) handles everything the table cannot reach — "save the beam,
   freeze it instead", "deal with the ones on my left first". It gets a compact snapshot of the
   battlefield (ids, kinds, health as a percentage, distance in metres, bearing as a word, live
   statuses, what is off cooldown) and is constrained to a strict JSON schema whose `skill` enum is
   **built from `ELEMENTS`** — so it cannot name an ability that does not exist. Round trip against
   a local `qwen3-4b` is about 3–5 seconds.

The model is treated as an untrusted *planner*, never as an executor. It proposes
`{op, skill, target}`; `AIDirector` decides whether the ability exists, whether it is off cooldown,
whether the target still resolves to a live body, and where the cast actually points. A hallucinated
skill, a monster that died two seconds ago and a request for a hundred golems all fail the same
quiet way — one line in the log.

Fuzzy targets are resolved to real positions in `resolveTarget`: `nearest`, `farthest`, `strongest`,
`weakest`, `cluster`, `all`, `left`/`right`/`ahead`/`behind` (relative to *your* facing), a kind name,
or a literal monster id. `cluster` is the interesting one — it scores every monster as a candidate
centre by how many others fall inside the ability's own footprint, which is a much better answer than
the centroid (in a ring of enemies, the centroid points at empty floor).

### Wiring the model

The commander talks to any OpenAI-compatible server. The simplest is
[LM Studio](https://lmstudio.ai), running on your own computer:

1. **Get a model.** In LM Studio, search for and download a small instruct model. **Qwen3 4B**
   (`qwen/qwen3-4b`) is what this was tuned on; Qwen3 1.7B is lighter if your machine struggles.
2. **Start the server.** Open the **Developer** tab, load the model, and switch the server on
   (default `http://127.0.0.1:1234`). If LM Studio runs on a *different* computer, also enable
   **Serve on Local Network** and use that machine's IP address in step 3.
3. **Create `.env`.** Copy the template in the project root and edit it:

   ```bash
   cp .env.example .env              # macOS / Linux
   ```

   ```powershell
   Copy-Item .env.example .env       # Windows PowerShell
   notepad .env
   ```

   ```bash
   LLM_PLATFORM_BASE_URL=http://127.0.0.1:1234/v1   # keep the /v1
   LLM_API_KEY=                                      # blank unless LM Studio auth is on
   LLM_MODEL1=qwen/qwen3-4b                          # the planner: the id LM Studio shows
   LLM_MODEL2=qwen/qwen3-1.7b                        # spare
   ```

   `LLM_MODEL1` must match the model id exactly as LM Studio lists it. Open
   <http://127.0.0.1:1234/v1/models> in a browser to see it.
4. **Restart `npm run dev`.** Vite only reads `.env` at startup. The dot on the chat panel turns
   green and shows the model name when the game reaches it.

`.env` is git-ignored. Only `.env.example` is committed, so real addresses and keys stay local.

The browser never sees the key. In development, a small Vite plugin (`llmBridge` in
`vite.config.js`) serves `/api/ai/status` and `/api/ai/command` from the dev server and attaches the
credentials server-side — which also sidesteps CORS with a box on the LAN. Qwen3's visible
reasoning is switched off at the bridge (`enable_thinking: false`); the game needs one JSON turn,
not a scratchpad.

**If the bridge is unreachable, nothing breaks.** The status dot goes grey, the panel says
"reflex only", and every keyword order still works. `connect()` is fired in the background during
boot and never blocks it.

### Production — Docker

A static build has nowhere to hide a key, so the bridge ships as a standalone service:
`server/server.js`, ~200 lines of Node built-ins, zero dependencies. It serves `dist/` and proxies
`/api/ai/*` with the same contract as the dev middleware, so the client cannot tell them apart.

```bash
docker compose up --build     # → http://localhost:8787
```

Compose reads the same `.env`. The model is *not* in the container — it lives wherever
`LLM_PLATFORM_BASE_URL` points. For a model on the Docker host rather than the LAN, use
`http://host.docker.internal:1234/v1`; the mapping is already in `docker-compose.yml`.

| Variable | Meaning |
| --- | --- |
| `PORT` | Listen port (default `8787`) |
| `STATIC_ROOT` | Built client to serve (default `./dist`) |
| `LLM_PLATFORM_BASE_URL` | OpenAI-compatible base URL |
| `LLM_API_KEY` | Sent as `Authorization: Bearer`, never to the browser |
| `LLM_MODEL1` | Default planning model |
| `LLM_TIMEOUT_MS` | Upstream timeout for chat orders (default `45000`); map design asks for up to 150 s |
| `LIBRARY_ROOT` | The downloaded asset library, served at `/library/` (default `./library`; in Docker, the `./library` folder mounted read-only by `docker-compose.yml`) |
| `TRIPO_API_KEY` / `MESHY_API_KEY` | Picture-to-3D generation (see [Your own models](custom-models.md#your-own-models--upload-or-make-3d-from-a-picture)); `MODELGEN_PROVIDER` picks one |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowlist. Only needed if the page is served from a different origin; same-origin needs none |
