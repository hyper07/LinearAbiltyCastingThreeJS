/**
 * Builds knowledge/index.json: one short record for everything an agent (or
 * a person) can reuse on the platform — recipes and design knowledge, ready
 * 3D kits and rigs, pixel-art effects, shader and rig templates, techniques
 * noted from other open-source games, free models to fetch, and our own
 * reusable modules. `npm run kb -- <words>` searches it; nothing else needs
 * reading until a record is chosen.
 *
 *   node scripts/kb-build.mjs
 *
 * A record: { id, kind, title, summary, tags, path, from }.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'));
const walk = (dir, out = []) => {
  for (const name of readdirSync(path.join(ROOT, dir))) {
    const p = `${dir}/${name}`;
    if (statSync(path.join(ROOT, p)).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};
const records = [];
const add = (r) => records.push({ ...r, summary: String(r.summary ?? '').replace(/\s+/g, ' ').trim().slice(0, 300), tags: [...new Set((r.tags ?? []).map((t) => String(t).toLowerCase()))].slice(0, 16) });

// 1. 3dviz: recipes and knowledge records (MIT). Blueprints point at their kit module.
for (const file of walk('vendor/3dviz/recipes').concat(walk('vendor/3dviz/knowledge'))) {
  if (!file.endsWith('.json')) continue;
  const r = read(file);
  if (r.status && r.status !== 'active') continue;
  const kit = r.asset?.path ? `vendor/3dviz/${r.asset.path.replace(/^templates\//, '')}` : null;
  add({
    id: r.id,
    kind: r.knowledge_kind ?? 'recipe',
    title: r.title?.en ?? r.id,
    summary: r.summary,
    tags: [...(r.tags ?? []), ...(r.aliases?.en ?? []), ...(r.subject_terms ?? []), ...(r.direction_ids ?? [])],
    path: file,
    code: kit && existsSync(path.join(ROOT, kit)) ? kit : undefined,
    from: '3dviz'
  });
}

// 2. The first doc comment of a source file, as its summary.
const headOf = (file) => {
  const text = readFileSync(path.join(ROOT, file), 'utf8').slice(0, 4000);
  const block = text.match(/\/\*\*([\s\S]*?)\*\//)?.[1]?.replace(/^\s*\* ?/gm, ' ');
  const lines = text.split('\n').filter((l) => /^\s*\/\//.test(l)).slice(0, 4).map((l) => l.replace(/^\s*\/\/\s?/, '')).join(' ');
  return (block ?? lines ?? '').trim();
};
const exportsOf = (file) => [...readFileSync(path.join(ROOT, file), 'utf8').matchAll(/export\s+(?:async\s+)?(?:function|class|const)\s+([A-Za-z0-9_]+)/g)].map((m) => m[1]).slice(0, 14);
const code = (file, kind, from, extra = []) => {
  const name = path.basename(file).replace(/\.(m?js)$/, '');
  const ex = exportsOf(file);
  add({ id: `${from}.${file.split('/').slice(2).join('/').replace(/\.(m?js)$/, '')}`, kind, title: name.replace(/[-_]/g, ' '), summary: `${headOf(file)}${ex.length ? ` Exports: ${ex.join(', ')}.` : ''}`, tags: [name, ...name.split(/[-_]/), ...extra, ...ex], path: file, from });
};
// 3dviz kits that have no blueprint record (shared helpers, primitives, layout) and its rigs.
const known = new Set(records.map((r) => r.code).filter(Boolean));
for (const file of walk('vendor/3dviz/kits')) if (file.endsWith('.js') && !known.has(file)) code(file, 'kit-code', '3dviz', ['three', 'procedural', file.split('/')[3] ?? 'kit']);
for (const file of walk('vendor/3dviz/rigs')) if (file.endsWith('.js')) code(file, 'rig', '3dviz', ['three', 'camera', 'lighting', 'post']);
// diorama: shader passes, the cast, water and stage templates (MIT).
for (const file of walk('vendor/diorama')) {
  if (/\.(m?js)$/.test(file)) code(file, 'template', 'diorama', ['three', 'diorama', 'pixel', 'toon']);
  else if (file.includes('/references/') && file.endsWith('.md')) {
    const text = readFileSync(path.join(ROOT, file), 'utf8');
    add({ id: `diorama.ref.${path.basename(file, '.md')}`, kind: 'guide', title: text.match(/^#+\s*(.+)$/m)?.[1] ?? path.basename(file, '.md'), summary: text.replace(/^#.*$/gm, '').replace(/[>*_`]/g, '').slice(0, 300), tags: path.basename(file, '.md').split('-').concat(['diorama', 'guide']), path: file, from: 'diorama' });
  }
}

// 3. Pixel-art effects (pixelfx, MIT): play with src/pixel/fx.js.
for (const e of read('knowledge/pixelfx.json').effects) {
  add({ id: `fx.${e.id}`, kind: 'pixel-effect', title: e.name, summary: `${e.desc} ${e.loop ? 'Loop' : 'One-shot'} ${e.seconds}s, ${e.size.join('×')} px.`, tags: [...e.tags, e.id.split('/')[0], 'pixel', 'vfx'], path: `vendor/pixelfx/fx/${e.id}.js`, use: `playFx('${e.id}')`, from: 'pixelfx' });
}

// 4. Hand-written records: our own modules, the pixel-art rules, techniques noted from other games.
for (const file of ['knowledge/own.json', 'knowledge/techniques.json']) {
  if (!existsSync(path.join(ROOT, file))) continue;
  for (const r of read(file).records) add({ ...r, from: r.from ?? path.basename(file, '.json') });
}

// 5. Free low-poly models to fetch (polyfork, CC BY 4.0): searched with --models.
const poly = read('knowledge/polyfork.json');
for (const [id, title, type, kit, triangles] of poly.models) {
  add({ id: `model.${id}`, kind: 'model', title, summary: `${type}${kit ? ` · ${poly.kits[kit]?.title ?? kit}` : ''}${triangles ? ` · ${triangles} triangles` : ''}`, tags: [type, ...(kit ? (poly.kits[kit]?.title ?? '').split(/\s+/) : [])], path: `library/polyfork/${id}.glb`, fetch: `npm run library:polyfork -- ${id}`, from: 'polyfork' });
}

const seen = new Set();
const unique = records.filter((r) => r.id && !seen.has(r.id) && seen.add(r.id));
writeFileSync(path.join(ROOT, 'knowledge/index.json'), `${JSON.stringify(unique)}\n`);
const kinds = {};
for (const r of unique) kinds[r.kind] = (kinds[r.kind] ?? 0) + 1;
console.log(`${unique.length} records`, kinds);
