#!/usr/bin/env node
/**
 * Listen to the shared soundtrack: a small dev-only Vite server for
 * music-preview.html (every track, loop-seam test, mood crossfades, stingers,
 * credits) without starting the full dev server and its services.
 *
 *   npm run music:preview            then open http://127.0.0.1:5200/music-preview.html
 *   npm run music:preview -- --port 5300
 *
 * It also serves the spectrograms from library/music-masters/report at
 * /__music-report/<id>.png when they are there.
 */
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPORT = path.join(ROOT, 'library', 'music-masters', 'report');
const i = process.argv.indexOf('--port');
const port = i >= 0 ? Number(process.argv[i + 1]) : 5200;

const reportFiles = {
  name: 'music-report',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const m = req.url?.match(/^\/__music-report\/([a-z0-9-]+\.(png|json))$/);
      if (!m) return next();
      const file = path.join(REPORT, m[1]);
      if (!existsSync(file)) {
        res.statusCode = 404;
        return res.end();
      }
      res.setHeader('Content-Type', m[2] === 'png' ? 'image/png' : 'application/json');
      createReadStream(file).pipe(res);
    });
  }
};

const server = await createServer({
  configFile: false,
  root: ROOT,
  cacheDir: path.join(ROOT, 'node_modules', '.vite-music-preview'),
  server: { port, host: '127.0.0.1', strictPort: true },
  plugins: [reportFiles],
  logLevel: 'info'
});
await server.listen();
console.log(`Music preview: http://127.0.0.1:${port}/music-preview.html`);
