/**
 * The pixel lab: one screen that proves the collected pieces run in our stack —
 * pixel effects (vendor/pixelfx), auto-shaded sprites (art.js), a 3D kit object
 * (vendor/3dviz/kits) and the pixel-art pass (vendor/diorama/post.js).
 *
 *   const lab = await openLab(document.body);   // lab.close()
 *
 * Open it from the console: (await import('/src/pixel/lab.js')).openLab()
 */
import * as THREE from 'three';
import * as art from './art.js';
import { playFx, fxIds } from './fx.js';

const SAMPLE_FX = ['fire', 'explosions', 'ice', 'lightning', 'holy', 'pickups', 'arcane', 'scifi'];

const HERO = ['....HHHH....', '...HHHHHH...', '..BBBBBBBB..', '..RFFFFFFR..', '..RFEWFEWR..', '..RFFFFFFR..', '...FFFFFF...', '..CCCCCCCC..', '.CCCTTTTCCC.', '.CCCCCCCCCC.', '..CC....CC..', '..SS....SS..'];

export async function openLab(parent = document.body, { fx = SAMPLE_FX, kits = ['buildings/timber-cottage', 'nature/tree-round'] } = {}) {
  const host = document.createElement('div');
  host.className = 'pixel-lab';
  host.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#1a1420;overflow:hidden;';
  parent.append(host);
  const c = document.createElement('canvas');
  c.width = 1280;
  c.height = 360;
  c.style.cssText = 'position:absolute;left:0;top:0;image-rendering:pixelated;';
  host.append(c);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;

  // Effects: the first of each family asked for.
  const all = fxIds();
  const players = [];
  for (const want of fx) {
    const id = all.includes(want) ? want : all.find((x) => x.startsWith(`${want}/`));
    if (id) players.push(await playFx(id));
  }

  // Sprites.
  const R = art.RAMPS;
  const ramps = { H: R.violet ?? R.stone, B: R.gold ?? R.stone, R: R.ember ?? R.stone, F: R.skin ?? R.stone, C: R.ice ?? R.stone, T: R.wood ?? R.stone, S: R.stone };
  const flat = { E: '#1a1026', W: '#ffffff' };
  const s1 = art.shadeSprite(HERO, ramps, { flat });
  const s2 = art.shadeSprite(HERO, ramps, { flat, scale: 2 });
  const ground = document.createElement('canvas');
  ground.width = 120;
  ground.height = 30;
  art.paintGround(ground.getContext('2d'), 120, 30);

  const draw2d = () => {
    g.clearRect(0, 0, c.width, c.height);
    // One 156-px cell each, the effect fitted and centred in it.
    players.forEach((p, i) => {
      const z = Math.min(150 / p.size[0], 170 / p.size[1]);
      const k = z >= 1 ? Math.floor(z) : z;
      g.drawImage(p.canvas, 8 + i * 158 + (150 - p.size[0] * k) / 2, 10 + (170 - p.size[1] * k) / 2, p.size[0] * k, p.size[1] * k);
    });
    g.drawImage(s1.canvas, 20, 200, s1.width * 10, s1.height * 10);
    g.drawImage(s2.canvas, 200, 200, s2.width * 5, s2.height * 5);
    g.drawImage(s2.white, 380, 200, s2.width * 5, s2.height * 5);
    g.drawImage(ground, 560, 200, 600, 150);
  };

  // A 3D kit scene through the pixel pass.
  const c3 = document.createElement('canvas');
  c3.style.cssText = 'position:absolute;left:0;top:360px;width:640px;height:360px;image-rendering:pixelated;';
  host.append(c3);
  const renderer = new THREE.WebGLRenderer({ canvas: c3, antialias: false, alpha: true });
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#dfe8ff', '#6a5a48', 1.4));
  const sun = new THREE.DirectionalLight('#fff0d8', 2.6);
  sun.position.set(-6, 10, 6);
  scene.add(sun);
  const mods = import.meta.glob('../../vendor/3dviz/kits/*/*.js');
  const built = [];
  let at = 0;
  for (const id of kits) {
    const load = mods[`../../vendor/3dviz/kits/${id}.js`];
    if (!load) continue;
    const made = (await load()).create({});
    made.group.position.x = at;
    at += 6;
    scene.add(made.group);
    built.push(made);
  }
  const cam = new THREE.PerspectiveCamera(30, 640 / 360, 0.1, 200);
  cam.position.set(16, 11, 16);
  cam.lookAt(2, 2, 0);
  let post = 'plain';
  let pass = null;
  try {
    const { PixelPost } = await import('../../vendor/diorama/post.js');
    pass = new PixelPost(renderer, 1600, 0.4);
    pass.setSize(640, 360);
    post = 'pixel';
  } catch (e) {
    post = `plain (${String(e.message).slice(0, 80)})`;
    renderer.setSize(640, 360, false);
  }

  let raf = 0;
  let last = performance.now();
  let time = 0;
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    for (const p of players) p.update(dt);
    for (const b of built) b.animate?.(time, dt);
    draw2d();
    if (pass) pass.render(scene, cam);
    else renderer.render(scene, cam);
    raf = requestAnimationFrame(frame);
  };
  frame(last);

  return {
    host,
    effects: all.length,
    played: players.length,
    kits: built.length,
    post,
    close() {
      cancelAnimationFrame(raf);
      renderer.dispose();
      host.remove();
    }
  };
}
