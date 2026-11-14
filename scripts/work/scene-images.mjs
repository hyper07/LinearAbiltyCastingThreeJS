/**
 * Make realistic pictures for Work Life's scenes with an image-generating
 * AI, to be shown in place of the drawings (src/work/lifeArt.js).
 *
 *   IMAGE_API_KEY=… [IMAGE_API_BASE_URL=…] [IMAGE_MODEL=…] node scripts/work/scene-images.mjs [--people] [--force]
 *
 * With --free and no key it uses Pollinations' free public service instead
 * (one picture every 45 seconds an address, which this waits out; its
 * pictures carry its small mark, which is left on and credited in the game).
 *
 * It speaks the common "images/generations" protocol (OpenAI's, and the many
 * services compatible with it): POST { model, prompt, size } → an image as
 * base64 or a link. Set IMAGE_API_BASE_URL for a service other than
 * OpenAI's, and IMAGE_MODEL for its model's name.
 *
 * Out: public/work-scenes/<place>-<part>.jpg (six places × morning,
 * afternoon, evening, night), optionally person-<id>-<mood>.png, and an
 * index.json the game reads. Places are empty rooms and streets; the people
 * are invented ("a fictional person"), never anyone real. Pictures already
 * there are kept unless --force.
 *
 * Nothing here runs unless you run it, and nothing is sent but the prompts
 * below. Check your image service's terms for what you may do with its
 * output before publishing.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const OUT = resolve('public/work-scenes');
const KEY = process.env.IMAGE_API_KEY;
const BASE = (process.env.IMAGE_API_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
const MODEL = process.env.IMAGE_MODEL ?? 'gpt-image-1';
const force = process.argv.includes('--force');
const withPeople = process.argv.includes('--people');
const free = process.argv.includes('--free');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const STYLE = 'Photorealistic, cinematic wide shot, 16:9, natural light, shallow depth of field, no people, no text, no logos, no brand names.';
const LIGHT = ['early morning, warm low sun', 'bright afternoon daylight', 'dusk, golden and violet sky, lamps just on', 'night, lit only by lamps and the city outside'];
/** With the free service's pace, two lights a place are made (day and night) and stand for the four. */
const FREE_LIGHT = { 1: [0, 1], 3: [2, 3] };
export const PLACES = {
  office: 'A modern open-plan office: a desk with a monitor and a mug, a large window onto a city skyline, a potted plant.',
  meeting: 'A small glass-walled meeting room: an oval wooden table, a whiteboard with a hand-drawn chart, a wall clock, a window.',
  home: 'A small, lived-in city flat living room: a sofa with a cushion, a floor lamp, a window, a low table with a mug.',
  cafe: 'A cosy independent café interior: a wooden counter with cups, hanging lamps, a corner table by a big window onto the street.',
  park: 'A city park: a wooden bench on a lawn, old trees, a path, tall buildings beyond the tree line.',
  street: 'A city side street: apartment buildings with lit windows, a street lamp, a small noodle restaurant with a glowing sign.'
};
/** The people of the story (src/work/lifeStory.js), described for a portrait. Invented; no likeness of anyone real. */
export const PORTRAITS = {
  mina: 'a woman in her late twenties with a black bob haircut, in an orange jumper',
  dev: 'a man in his late thirties with short dark hair and a short beard, in a blue shirt',
  alvarez: 'a woman in her late forties with brown hair in a bun, in a violet blazer',
  jun: 'a person in their late twenties with messy dark-blue dyed hair, in a green hoodie',
  mum: 'a woman in her sixties with grey hair in a bun, in a yellow cardigan',
  sora: 'a person in their late twenties with long auburn hair, in a pink jacket',
  lang: 'a striking, poised woman in her early fifties, a chief executive, with a sleek silver-grey bob, in a tailored navy suit',
  hale: 'a handsome, well-groomed man in his mid forties, a senior executive, with short salt-and-pepper hair, in a charcoal suit and open-collared white shirt',
  becker: 'a good-looking man in his mid thirties, a team manager, with short sandy-brown hair and light stubble, in a dark green knit polo',
  ana: 'an attractive, bright young woman of twenty-one, an intern, with long dark-brown wavy hair, in a soft yellow blouse',
  leo: 'a good-looking young man of twenty-two, an intern, with tousled black hair, in a light blue button-down shirt',
  kai: 'a stylish nineteen-year-old young man with bleached curly hair and a small earring, in an oversized purple hoodie, behind a shop counter',
  okoye: 'a warm, dignified woman in her early sixties, a shopkeeper, with short greying natural hair, in a green cardigan, in a small corner shop'
};
const MOODS = { neutral: 'a calm, attentive expression', happy: 'a warm smile', worried: 'a worried, tense expression' };

/** The free service: a picture for a prompt at an address. One every 45 seconds; a refusal says how long to wait. */
async function generateFree(prompt, size, seed) {
  const [w, h] = size.split('x').map((n) => Math.round(Number(n) * (Number(size.split('x')[0]) > 1100 ? 0.84 : 0.75)));
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}`, { headers: { 'User-Agent': 'scene-images/1.0' } });
    if (r.ok && String(r.headers.get('content-type')).startsWith('image/')) {
      await wait(47_000);
      return Buffer.from(await r.arrayBuffer());
    }
    const body = await r.text();
    const retry = Number(/Retry after (\d+)s/.exec(body)?.[1] ?? 45);
    if (r.status !== 402 && r.status !== 429 && r.status < 500) throw new Error(`${r.status} ${body.slice(0, 160)}`);
    await wait((retry + 3) * 1000);
  }
  throw new Error('The free service kept saying to wait');
}

async function generate(prompt, size, seed = 1) {
  if (free && !KEY) return generateFree(prompt, size, seed);
  const r = await fetch(`${BASE}/images/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, prompt, size, n: 1 })
  });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
  const item = (await r.json()).data?.[0];
  if (item?.b64_json) return Buffer.from(item.b64_json, 'base64');
  if (item?.url) return Buffer.from(await (await fetch(item.url)).arrayBuffer());
  throw new Error('The service returned no image');
}

if (!KEY && !free) {
  console.error('Set IMAGE_API_KEY (and IMAGE_API_BASE_URL / IMAGE_MODEL for a service other than OpenAI\'s) to make the pictures. Without them the game uses its own drawings.');
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });
const indexFile = join(OUT, 'index.json');
const index = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, 'utf8')) : {};
const jobs = [];
// A face for everyone first (their calm one stands for the others until those are made), then the places, then the other moods.
const portrait = [];
if (withPeople) {
  Object.entries(PORTRAITS).forEach(([id, who], n) => {
    // The same seed for each of a person's moods, so it stays the same person.
    for (const [mood, face] of Object.entries(MOODS)) portrait.push({ mood, key: `person-${id}-${mood}`, file: `person-${id}-${mood}.jpg`, size: '1024x1280', seed: 4100 + n * 17, prompt: `Photorealistic head-and-shoulders portrait photograph of a fictional person: ${who}, ${face}, looking at the camera, soft natural daylight, softly blurred indoor background, 85mm lens, sharp focus on the eyes.` });
  });
}
jobs.push(...portrait.filter((j) => j.mood === 'neutral'));
Object.entries(PLACES).forEach(([place, what], n) => {
  if (free && !KEY) for (const [part, stands] of Object.entries(FREE_LIGHT)) jobs.push({ key: `${place}-${part}`, also: stands.map((p) => `${place}-${p}`), file: `${place}-${part}.jpg`, size: '1536x864', seed: 900 + n * 13 + Number(part), prompt: `${what} ${LIGHT[part]}. ${STYLE}` });
  else LIGHT.forEach((light, part) => jobs.push({ key: `${place}-${part}`, file: `${place}-${part}.jpg`, size: '1536x1024', seed: 900 + n * 13 + part, prompt: `${what} ${light}. ${STYLE}` }));
});
jobs.push(...portrait.filter((j) => j.mood !== 'neutral'));
let made = 0;
for (const job of jobs) {
  if (!force && index[job.key] && existsSync(join(OUT, index[job.key]))) {
    if (job.mood === 'neutral') index[job.key.replace(/-neutral$/, '')] = index[job.key];
    continue;
  }
  try {
    process.stdout.write(`[scenes] ${job.key}… `);
    writeFileSync(join(OUT, job.file), await generate(job.prompt, job.size, job.seed));
    for (const key of job.also ?? [job.key]) index[key] = job.file;
    // Someone's calm face stands for them in any mood not made yet.
    if (job.mood === 'neutral') index[job.key.replace(/-neutral$/, '')] = job.file;
    index.credit = free && !KEY ? 'Pictures made with an image-generating AI (pollinations.ai). The people and places are invented.' : index.credit ?? 'Pictures made with an image-generating AI. The people and places are invented.';
    writeFileSync(indexFile, JSON.stringify(index, null, 2));
    made++;
    console.log('done');
  } catch (error) {
    console.log(`failed: ${error.message}`);
  }
}
console.log(`[scenes] ${made} made, ${Object.keys(index).length} in all → ${OUT}. Reload the game to see them.`);
