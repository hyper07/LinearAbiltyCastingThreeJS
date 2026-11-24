/**
 * Gangnam Jarani's realistic street: people from the Microsoft Rocketbox
 * Avatar Library (MIT, GitHub) and everyday vehicles from Sketchfab (CC BY
 * 4.0) through the Objaverse dataset's public mirror — the lists are in
 * src/city/streetAssets.js. Fetched with the rest of the library (`extras`),
 * resumable, never committed.
 *
 *   library/rocketbox/<Avatar>/<Avatar>.fbx      the rigged mesh (FBX, as published)
 *   library/rocketbox/<Avatar>/{body,head,opacity}.png
 *                                                its colour textures, shrunk from 2048² TGA to 512² PNG here
 *   library/rocketbox/clips.json                  walk, idle, phone, look-about and cheer clips (three.js
 *                                                AnimationClip JSON, read from the FBX here and trimmed)
 *   library/rocketbox/LICENSE.md                  Microsoft's MIT licence, kept beside them
 *   library/objaverse/<id>.glb                    the vehicles
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { LIBRARY, download, exists, log, rel } from './lib.mjs';
import { readTga, shrink, encodePng } from './imagepack.mjs';
import { ROCKETBOX, PEOPLE, CLIPS, VEHICLES, OBJAVERSE, sketchfabPage } from '../../src/city/streetAssets.js';

const SRC = 'extras';

/** One Rocketbox avatar: the FBX, and three colour textures as small PNGs (the TGAs are deleted after). */
async function person([id, prefix, , cards], budget) {
  const dir = path.join(LIBRARY, 'rocketbox', id);
  const fbx = path.join(dir, `${id}.fbx`);
  await download(`${ROCKETBOX.base}Avatars/Adults/${id}/Export/${id}.fbx`, fbx, budget);
  const head = (await readFile(fbx)).subarray(0, 18).toString('latin1');
  if (!head.startsWith('Kaydara FBX Binary')) throw new Error('not a binary FBX');
  const parts = cards ? ['body', 'head', 'opacity'] : ['body', 'head'];
  for (const part of parts) {
    const png = path.join(dir, `${part}.png`);
    if (await exists(png)) continue;
    const tga = path.join(dir, `${part}.tga`);
    await download(`${ROCKETBOX.base}Avatars/Adults/${id}/Textures/${prefix}_${part}_color.tga`, tga, budget);
    const img = shrink(readTga(await readFile(tga)), 512);
    await writeFile(png, encodePng(img));
    await rm(tga, { force: true });
  }
  return { id: `rocketbox/${id}`, name: `Rocketbox ${id.replace(/_/g, ' ')}`, source: SRC, pack: 'Rocketbox', file: rel(fbx), files: [rel(fbx), ...parts.map((p) => rel(path.join(dir, `${p}.png`)))], tags: ['character', 'human', 'realistic', 'rigged', id.startsWith('F') ? 'woman' : 'man'], license: ROCKETBOX.license, author: ROCKETBOX.author, url: ROCKETBOX.page };
}

/**
 * The clips, read from their FBX files with three's own FBXLoader (headless:
 * animation-only files need no textures) and kept as AnimationClip JSON: the
 * bones' turns, the pelvis's position (its bob), nothing else; numbers rounded.
 */
async function clips(budget) {
  const out = path.join(LIBRARY, 'rocketbox', 'clips.json');
  const have = await readFile(out, 'utf8').then((t) => JSON.parse(t)).catch(() => null);
  if (have && CLIPS.every(([name]) => have[name])) return out;
  globalThis.self ??= globalThis;
  const THREE = await import('three');
  const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
  const loader = new FBXLoader();
  const json = have ?? {};
  const tmp = path.join(LIBRARY, 'rocketbox', '.clips');
  for (const [name, file] of CLIPS) {
    if (json[name]) continue;
    const fbx = path.join(tmp, path.basename(file));
    await download(`${ROCKETBOX.base}Animations/${file}`, fbx, budget);
    const buf = await readFile(fbx);
    const scene = loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
    const clip = scene.animations[0];
    if (!clip) throw new Error(`no animation in ${file}`);
    clip.tracks = clip.tracks.filter((t) => t.name.startsWith('Bip01') && (t.name.endsWith('.quaternion') || t.name === 'Bip01_Pelvis.position' || t.name === 'Bip01.position'));
    clip.name = name;
    json[name] = slim(THREE, clip, name.startsWith('walk') ? { fps: 30, max: 4 } : { fps: 12, max: 7 });
    await rm(fbx, { force: true });
  }
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(json));
  await rm(tmp, { recursive: true, force: true });
  return out;
}

/**
 * A clip made small enough to ship: cut to `max` seconds (the last half second
 * eased back to the first pose so it loops without a pop), sampled at `fps`,
 * bones that never move kept as one key, numbers rounded. A 30 s idle goes
 * from 2.7 MB to well under 200 KB.
 */
function slim(THREE, clip, { fps, max }) {
  const dur = Math.min(max, clip.duration);
  const n = Math.max(2, Math.round(dur * fps) + 1);
  const ease = Math.min(0.5, dur * 0.2);
  const tracks = [];
  for (const tr of clip.tracks) {
    const size = tr.getValueSize();
    const it = tr.createInterpolant();
    const first = Array.from(it.evaluate(0));
    const times = [];
    const values = [];
    let moves = false;
    for (let k = 0; k < n; k++) {
      const t = (k / (n - 1)) * dur;
      const v = Array.from(it.evaluate(t));
      // ease into the first pose at the end, so the loop closes
      const w = t > dur - ease ? (t - (dur - ease)) / ease : 0;
      if (w > 0) {
        // (quaternions: the shorter way round, then renormalised)
        const flip = size === 4 && v[0] * first[0] + v[1] * first[1] + v[2] * first[2] + v[3] * first[3] < 0 ? -1 : 1;
        for (let i = 0; i < size; i++) v[i] = v[i] * (1 - w) + first[i] * flip * w;
        if (size === 4) {
          const l = Math.hypot(v[0], v[1], v[2], v[3]) || 1;
          for (let i = 0; i < 4; i++) v[i] /= l;
        }
      }
      for (let i = 0; i < size; i++) if (Math.abs(v[i] - first[i]) > 2e-3) moves = true;
      times.push(Math.round(t * 1000) / 1000);
      for (const x of v) values.push(Math.round(x * 1000) / 1000);
    }
    const Track = tr.constructor;
    tracks.push(moves ? new Track(tr.name, times, values) : new Track(tr.name, [0], first.map((x) => Math.round(x * 1000) / 1000)));
  }
  return THREE.AnimationClip.toJSON(new THREE.AnimationClip(clip.name, dur, tracks));
}

/** The vehicles: one GLB each from the Objaverse mirror (a binary glTF, or fetched again). */
async function vehicle(v, budget) {
  const dest = path.join(LIBRARY, 'objaverse', `${v.id}.glb`);
  const head = await readFile(dest).then((b) => b.subarray(0, 4).toString('latin1')).catch(() => '');
  if (head !== 'glTF') {
    await rm(dest, { force: true });
    await download(OBJAVERSE + v.glb, dest, budget);
    if ((await readFile(dest)).subarray(0, 4).toString('latin1') !== 'glTF') throw new Error('not a binary glTF');
  }
  return { id: `objaverse/${v.id}`, name: v.title, source: SRC, pack: 'Gangnam Jarani traffic', file: rel(dest), files: [rel(dest)], tags: ['vehicle', v.id], license: 'CC-BY-4.0', author: v.author, url: sketchfabPage(v.uid) };
}

/** Everything above; each piece on its own, so one that fails doesn't stop the rest. */
export async function streetfolk({ budget }) {
  const assets = [];
  await mkdir(path.join(LIBRARY, 'rocketbox'), { recursive: true });
  const lic = path.join(LIBRARY, 'rocketbox', 'LICENSE.md');
  if (!(await exists(lic))) await download('https://raw.githubusercontent.com/microsoft/Microsoft-Rocketbox/master/LICENSE.md', lic, budget).catch(() => {});
  for (const p of PEOPLE) {
    try {
      assets.push(await person(p, budget));
    } catch (error) {
      if (error.budget) throw error;
      log(SRC, `skip rocketbox ${p[0]}: ${error.message}`);
    }
  }
  try {
    await clips(budget);
  } catch (error) {
    if (error.budget) throw error;
    log(SRC, `skip rocketbox clips: ${error.message}`);
  }
  for (const v of VEHICLES) {
    try {
      assets.push(await vehicle(v, budget));
    } catch (error) {
      if (error.budget) throw error;
      log(SRC, `skip vehicle ${v.id}: ${error.message}`);
    }
  }
  return assets;
}
