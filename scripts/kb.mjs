/**
 * Search the platform's knowledge base (knowledge/index.json) and print a
 * few one-line matches — so finding what to reuse costs a few hundred
 * tokens, not a read through the folders.
 *
 *   npm run kb -- pixel explosion                 # best 8 matches
 *   npm run kb -- "night lighting" --kind lighting-profile --limit 5
 *   npm run kb -- tank --models                   # free models to fetch (left out otherwise)
 *   npm run kb -- --show fx.fire/campfire         # one record in full (and where its code is)
 *   npm run kb -- --kinds                         # what kinds there are, with counts
 *
 * Ranking is BM25 over title (×3), tags (×2) and summary; no dependencies.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
/** Words that mean the same here, so a search finds either. */
const ALIASES = {
  explosion: ['blast', 'burst', 'boom'], fire: ['flame', 'burn', 'ember'], pixel: ['pixelated', 'retro', 'sprite'], glow: ['bloom', 'emissive', 'light'],
  tree: ['forest', 'conifer', 'broadleaf'], house: ['cottage', 'home', 'building'], walk: ['gait', 'locomotion'], outline: ['ink', 'stroke'],
  ice: ['frost', 'freeze', 'snow'], lightning: ['bolt', 'thunder', 'electric'], heal: ['holy', 'restore'], coin: ['pickup', 'gold', 'loot'],
  enemy: ['creature', 'monster'], camera: ['orbit', 'follow'], water: ['river', 'sea', 'splash'], sound: ['audio', 'music'], smoke: ['dust', 'fog', 'mist']
};
const words = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9가-힣]+/g, ' ').split(' ').filter((w) => w.length > 1).map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w));

export function loadIndex() {
  return JSON.parse(readFileSync(path.join(ROOT, 'knowledge/index.json'), 'utf8'));
}

/** The best `limit` records for a query. Models only when asked for (there are thousands). */
export function search(index, query, { kind = null, limit = 8, models = false, from = null } = {}) {
  const pool = index.filter((r) => (kind ? r.kind === kind : models ? r.kind === 'model' : r.kind !== 'model') && (!from || r.from === from));
  const docs = pool.map((r) => {
    const tf = new Map();
    const put = (text, weight) => {
      for (const w of words(text)) tf.set(w, (tf.get(w) ?? 0) + weight);
    };
    put(r.title, 3);
    put(r.id, 2);
    put((r.tags ?? []).join(' '), 2);
    put(r.summary, 1);
    let len = 0;
    for (const v of tf.values()) len += v;
    return { r, tf, len };
  });
  const avg = docs.reduce((s, d) => s + d.len, 0) / Math.max(1, docs.length);
  const df = new Map();
  for (const d of docs) for (const w of d.tf.keys()) df.set(w, (df.get(w) ?? 0) + 1);
  const terms = [];
  for (const w of words(query)) {
    terms.push([w, 1]);
    for (const [key, list] of Object.entries(ALIASES)) {
      if (key === w) for (const a of list) terms.push([a, 0.4]);
      else if (list.includes(w)) terms.push([key, 0.4]);
    }
  }
  const [k1, b] = [1.2, 0.75];
  return docs
    .map((d) => {
      let score = 0;
      for (const [w, weight] of terms) {
        const f = d.tf.get(w);
        if (!f) continue;
        const idf = Math.log(1 + (docs.length - df.get(w) + 0.5) / (df.get(w) + 0.5));
        score += weight * idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.len) / avg)));
      }
      // Downloaded, rigged and animated models first: they are ready to play, the rest are props to fetch.
      return { r: d.r, score: d.r.from === 'library' ? score * 1.8 : score };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(`--${name}`);
    if (i < 0) return null;
    const v = args[i + 1] && !args[i + 1].startsWith('--') ? args.splice(i + 1, 1)[0] : true;
    args.splice(i, 1);
    return v;
  };
  const index = loadIndex();
  const show = flag('show');
  if (flag('kinds')) {
    const kinds = {};
    for (const r of index) kinds[r.kind] = (kinds[r.kind] ?? 0) + 1;
    console.log(Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · '));
  } else if (show) {
    const r = index.find((x) => x.id === show);
    if (!r) console.log(`No record "${show}"`);
    else {
      console.log(JSON.stringify(r, null, 1));
      // A vendored knowledge record: its guidance in full (principles, how, checks), without the bookkeeping.
      if (r.path?.endsWith('.json') && existsSync(path.join(ROOT, r.path))) {
        const full = JSON.parse(readFileSync(path.join(ROOT, r.path), 'utf8'));
        const keep = {};
        for (const k of ['objective', 'entities', 'content', 'defaults', 'creative_affordances', 'motion_guidance', 'invariants', 'known_limits', 'related_ids', 'params', 'sockets', 'poly_budget']) if (full[k] != null) keep[k] = full[k];
        console.log(JSON.stringify(keep, null, 1));
      }
    }
  } else {
    const [kind, limit, models, from] = [flag('kind'), Number(flag('limit')) || 8, Boolean(flag('models')), flag('from')];
    const hits = search(index, args.join(' '), { kind: kind === true ? null : kind, limit, models, from: from === true ? null : from });
    if (!hits.length) console.log('No match. Try other words, --models for 3D models, or --kinds.');
    for (const { r } of hits) console.log(`${r.id} [${r.kind}] ${r.title} — ${r.summary.slice(0, 150)}${r.summary.length > 150 ? '…' : ''}\n    ${r.code ?? r.path}${r.use ? `  ·  ${r.use}` : ''}${r.fetch ? `  ·  ${r.fetch}` : ''}`);
  }
}
