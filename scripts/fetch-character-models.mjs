#!/usr/bin/env node
/**
 * Download CC0 KayKit character GLBs into public/models/characters/<id>/.
 *
 * Usage: npm run fetch-characters
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHARACTER_MODEL_SOURCES } from '../src/platform/character/modelManifest.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'models', 'characters');

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return buf.length;
}

async function main() {
  let ok = 0;
  let skip = 0;

  for (const [id, source] of Object.entries(CHARACTER_MODEL_SOURCES)) {
    if (!source.downloadUrl) {
      skip++;
      continue;
    }

    const dir = path.join(OUT, id);
    const dest = path.join(dir, 'model.glb');
    await mkdir(dir, { recursive: true });

    process.stdout.write(`↓ ${id} … `);
    try {
      const bytes = await download(source.downloadUrl, dest);
      console.log(`${(bytes / 1024).toFixed(0)} KB`);
      ok++;
    } catch (err) {
      console.log(`FAILED — ${err.message}`);
    }
  }

  console.log(`\nDone: ${ok} downloaded, ${skip} skipped (Mixamo caster uses public/models/Idle.fbx).`);
  console.log('Start the dev server and pick a class in the main menu to preview each mesh.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
