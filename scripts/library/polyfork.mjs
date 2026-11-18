/**
 * Fetch free low-poly models from polyfork.dev into library/polyfork/
 * (git-ignored, like the rest of the asset library), to use and to change.
 * The models' mesh files are CC BY 4.0: each keeps its credit line, written
 * to library/polyfork/CREDITS.md.
 *
 *   npm run library:polyfork -- medium-tank-65da6b            # by id (find ids: npm run kb -- tank --models)
 *   npm run library:polyfork -- --kit "space base"            # a whole kit, by words of its title
 *   npm run library:polyfork -- --type vehicle --limit 40     # by type
 *   npm run library:polyfork -- --all                         # everything (3,422 models)
 */
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'library', 'polyfork');
const index = JSON.parse(await readFile(path.join(ROOT, 'knowledge', 'polyfork.json'), 'utf8'));
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return null;
  const v = args[i + 1] && !args[i + 1].startsWith('--') ? args.splice(i + 1, 1)[0] : true;
  args.splice(i, 1);
  return v;
};
const [kit, type, all, limit] = [flag('kit'), flag('type'), flag('all'), Number(flag('limit')) || Infinity];
let want = index.models;
if (kit) {
  const words = String(kit).toLowerCase().split(/\s+/);
  const ids = Object.entries(index.kits).filter(([id, k]) => words.every((w) => `${id} ${k.title}`.toLowerCase().includes(w))).map(([id]) => id);
  want = want.filter((m) => ids.includes(m[3]));
} else if (type) want = want.filter((m) => m[2] === type);
else if (!all) want = want.filter((m) => args.includes(m[0]));
want = want.slice(0, limit);
if (!want.length) {
  console.log('Nothing matched. Kits:', Object.values(index.kits).map((k) => k.title).join(', '));
  process.exit(1);
}
await mkdir(OUT, { recursive: true });
let [got, had, failed, bytes] = [0, 0, 0, 0];
const queue = [...want];
const one = async ([id]) => {
  const dest = path.join(OUT, `${id}.glb`);
  if ((await stat(dest).catch(() => null))?.size > 100) return had++;
  try {
    const res = await fetch(`https://polyfork.dev/cdn/${id}.glb`, { headers: { 'User-Agent': 'asset-library-fetch' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    // A binary glTF starts with "glTF"; anything else is an error page.
    if (buf.subarray(0, 4).toString() !== 'glTF') throw new Error('not a GLB');
    await writeFile(dest, buf);
    got++;
    bytes += buf.length;
  } catch (e) {
    failed++;
    if (failed <= 5) console.log(`  skip ${id}: ${e.message}`);
  }
};
await Promise.all(Array.from({ length: 6 }, async () => {
  while (queue.length) await one(queue.shift());
}));
// The credits: every model fetched so far, with its page.
const { readdir } = await import('node:fs/promises');
const have = new Set((await readdir(OUT)).filter((f) => f.endsWith('.glb')).map((f) => f.slice(0, -4)));
const rows = index.models.filter((m) => have.has(m[0]));
await writeFile(path.join(OUT, 'CREDITS.md'), `# Polyfork models\n\nFree low-poly models from https://polyfork.dev — mesh files CC BY 4.0 (https://polyfork.dev/licensing). Each model's page gives its credit line.\n\n| Model | Type | Page |\n| --- | --- | --- |\n${rows.map((m) => `| ${m[1]} | ${m[2]} | https://polyfork.dev/asset/${m[0]} |`).join('\n')}\n`);
console.log(`${got} fetched (${(bytes / 1048576).toFixed(1)} MB), ${had} already here, ${failed} failed; ${rows.length} models in library/polyfork/`);
