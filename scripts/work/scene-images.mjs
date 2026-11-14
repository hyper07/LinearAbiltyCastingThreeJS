/**
 * Make realistic pictures for Work Life's scenes with an image-generating
 * AI, to be shown in place of the drawings (src/work/lifeArt.js).
 *
 *   IMAGE_API_KEY=… [IMAGE_API_BASE_URL=…] [IMAGE_MODEL=…] node scripts/work/scene-images.mjs [--people] [--force]
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

const STYLE = 'Photorealistic, cinematic wide shot, 16:9, natural light, shallow depth of field, no people, no text, no logos, no brand names.';
const LIGHT = ['early morning, warm low sun', 'bright afternoon daylight', 'dusk, golden and violet sky, lamps just on', 'night, lit only by lamps and the city outside'];
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
  sora: 'a person in their late twenties with long auburn hair, in a pink jacket'
};
const MOODS = { neutral: 'a calm, attentive expression', happy: 'a warm smile', worried: 'a worried, tense expression' };

async function generate(prompt, size) {
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

if (!KEY) {
  console.error('Set IMAGE_API_KEY (and IMAGE_API_BASE_URL / IMAGE_MODEL for a service other than OpenAI\'s) to make the pictures. Without them the game uses its own drawings.');
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });
const indexFile = join(OUT, 'index.json');
const index = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, 'utf8')) : {};
const jobs = [];
for (const [place, what] of Object.entries(PLACES)) LIGHT.forEach((light, part) => jobs.push({ key: `${place}-${part}`, file: `${place}-${part}.jpg`, size: '1536x1024', prompt: `${what} ${light}. ${STYLE}` }));
if (withPeople) {
  for (const [id, who] of Object.entries(PORTRAITS)) {
    for (const [mood, face] of Object.entries(MOODS)) jobs.push({ key: `person-${id}-${mood}`, file: `person-${id}-${mood}.png`, size: '1024x1024', prompt: `Photorealistic head-and-shoulders portrait of a fictional person: ${who}, ${face}, looking at the camera, soft even light, plain light background, no text.` });
  }
}
let made = 0;
for (const job of jobs) {
  if (!force && index[job.key] && existsSync(join(OUT, index[job.key]))) continue;
  try {
    process.stdout.write(`[scenes] ${job.key}… `);
    writeFileSync(join(OUT, job.file), await generate(job.prompt, job.size));
    index[job.key] = job.file;
    writeFileSync(indexFile, JSON.stringify(index, null, 2));
    made++;
    console.log('done');
  } catch (error) {
    console.log(`failed: ${error.message}`);
  }
}
console.log(`[scenes] ${made} made, ${Object.keys(index).length} in all → ${OUT}. Reload the game to see them.`);
