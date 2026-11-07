# ---- build the client -------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Dependencies first: this layer only rebuilds when the lockfile moves.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
# The 3D asset library is gigabytes: it is mounted at run time (docker-compose.yml),
# never downloaded into or baked into the image.
ENV LIBRARY_AUTO_FETCH=0
# The bundle is static and carries no credentials — the API key never leaves
# the runtime stage below. `postbuild` writes the .br/.gz copies the server serves.
RUN npm run build

# ---- run --------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787
ENV STATIC_ROOT=/app/dist
ENV LIBRARY_ROOT=/app/library
ENV DATA_DIR=/app/data

# The server needs one package (`ws`, for playing together); nothing else.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY server ./server
COPY scripts/admin.mjs ./scripts/admin.mjs
# The server runs the game's own rules (inventory, loot, levels) from src/ — the same
# code the browser runs, so both sides agree on every action.
COPY src ./src

# Everything players make — accounts, characters, the history, levels, classes,
# the library — goes to /app/data, and so does the server key unless SERVER_SECRET
# is set. Mount it and back it up. Don't run as root.
RUN mkdir -p /app/data /app/library && chown -R node:node /app/data /app/library
USER node

EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--disable-warning=ExperimentalWarning", "server/server.js"]
