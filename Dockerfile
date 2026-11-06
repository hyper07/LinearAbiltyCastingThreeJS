# ---- build the client -------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Dependencies first: this layer only rebuilds when the lockfile moves.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# The 3D asset library is gigabytes: it is mounted at run time (docker-compose.yml),
# never downloaded into or baked into the image.
ENV LIBRARY_AUTO_FETCH=0
# The bundle is static and carries no credentials — the API key never leaves
# the runtime stage below.
RUN npm run build

# ---- run --------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787
ENV STATIC_ROOT=/app/dist
ENV LIBRARY_ROOT=/app/library

# The bridge has no dependencies at all — Node built-ins only — so nothing is
# installed here. Copy the server and the built client, and that is the image.
COPY --from=build /app/dist ./dist
COPY server ./server

# Don't run as root.
USER node

EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/server.js"]
