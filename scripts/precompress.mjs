/**
 * After `vite build`: write a `.br` and a `.gz` beside every compressible
 * file in dist/, so the production server can hand a browser the small
 * version without compressing on every request. A game bundle is a few
 * megabytes of JavaScript; brotli makes it a fifth of that.
 *
 * Models, textures and audio are left alone — they are already compressed.
 */
import { readdir, stat, readFile, writeFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { brotliCompress, gzip, constants } from 'node:zlib';
import { promisify } from 'node:util';

const br = promisify(brotliCompress);
const gz = promisify(gzip);
const ROOT = resolve(process.argv[2] ?? 'dist');
const COMPRESSIBLE = new Set(['.js', '.mjs', '.css', '.html', '.json', '.svg', '.map', '.txt', '.wasm', '.xml', '.webmanifest']);
const MIN_BYTES = 1024;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(file);
    else yield file;
  }
}

let count = 0;
let before = 0;
let after = 0;
try {
  await stat(ROOT);
} catch {
  console.log(`[precompress] nothing to do: ${ROOT} is not there`);
  process.exit(0);
}
for await (const file of walk(ROOT)) {
  const ext = extname(file).toLowerCase();
  if (!COMPRESSIBLE.has(ext)) continue;
  const info = await stat(file);
  if (info.size < MIN_BYTES) continue;
  const data = await readFile(file);
  const [b, g] = await Promise.all([
    br(data, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT, [constants.BROTLI_PARAM_SIZE_HINT]: data.length } }),
    gz(data, { level: 9 })
  ]);
  await Promise.all([writeFile(`${file}.br`, b), writeFile(`${file}.gz`, g)]);
  count += 1;
  before += data.length;
  after += b.length;
}
const mb = (n) => (n / 1048576).toFixed(1);
console.log(`[precompress] ${count} files: ${mb(before)} MB → ${mb(after)} MB with brotli`);
