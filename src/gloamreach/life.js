/**
 * Life in Gloamreach: the people of cast.js going about their day — the
 * smith at the anvil, sellers at their stalls, two friends talking by the
 * well, an old storyteller on a bench, strollers, adventurers jogging
 * through on their way to the Gate, the Gloamwood's keepers — and the
 * animals: the village bear, deer and foxes (which keep their distance),
 * hens, a cat, a dog, rabbits, the Pale Stag, eagles over the cliffs.
 *
 * People turn to face the hero when they come close and greet them once;
 * the game shows their name and words. Far-off actors are hidden and not
 * animated; middling ones animate at half rate; only near ones cast shadows.
 */
import { animStride, ticksOn } from '../shared/power.js';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { PEOPLE, ANIMALS, ROUTES } from './cast.js';
import { loadTemplate, Actor, loadFile } from './actors.js';
import { rng } from './noise.js';
import { characterLoader } from '../library/characters.js';

const wrap = (a) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

/** Clips each kind of job needs (borrowed from Mesh2Motion). */
const NEEDS = {
  idle: ['LookAround', 'FoldArms', 'Greet'],
  work: ['Greet', 'Talk'],
  sit: ['Greet'],
  chat: ['Talk', 'Listen', 'Nod', 'Greet'],
  stroll: ['LookAround', 'Greet'],
  jog: ['Greet'],
  patrol: ['LookAround', 'Greet']
};

const HEIGHTS = { 'halfling-hunter-base': 1.32, 'mushroom-druid-base': 1.45, 'black-smith-base': 1.92, 'forest-witch-base': 1.62, 'dryad-priest-base': 1.86 };

export class Life {
  /** `keep(x, z)`: who belongs to the zone being built (shared/zones; everyone when absent). */
  constructor({ scene, world, bank, effects, keep = () => true }) {
    this.keep = keep;
    this.scene = scene;
    this.world = world;
    this.bank = bank;
    this.effects = effects;
    this.colliders = world.colliders;
    this.people = [];
    this.animals = [];
    this.birds = [];
    this.r = rng(1234);
    this.greeted = new Set();
    this.events = [];
  }

  /** Resolve a cast entry's place to { x, z, face }. */
  spot(at) {
    const s = this.world.spots;
    if (Array.isArray(at)) return { x: at[0], z: at[1], face: at[2] ?? 0 };
    const face = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
    if (at === 'innPorch') return { x: s.homes.inn.porch.x - 2, z: s.homes.inn.porch.z, face: 1.35 };
    if (at === 'smithy') return { x: s.homes.smithy.smithSpot.x, z: s.homes.smithy.smithSpot.z, face: face(s.homes.smithy.smithSpot, s.homes.smithy.anvil) };
    if (at.startsWith('stall')) {
      const st = s.stalls[Number(at.slice(5))];
      return { x: st.keeper.x, z: st.keeper.z, face: face(st.keeper, st.front) };
    }
    if (at.startsWith('bench')) {
      const b = s.benches[Number(at.slice(5))];
      return { x: b.seat.x, z: b.seat.z, face: b.face, seat: b.seat };
    }
    if (at.startsWith('root')) {
      const h = s.rootHouses[Number(at.slice(4))];
      return { x: h.steps.x, z: h.steps.z, face: face(h.steps, h.door) };
    }
    return { x: 0, z: 0, face: 0 };
  }

  /** Where a cast entry lives, or null when its place isn't built in this zone. */
  homeOf(c) {
    const s = this.world.spots;
    if (Array.isArray(c.at)) return { x: c.at[0], z: c.at[1] };
    if (typeof c.at === 'string') {
      if (c.at === 'innPorch' || c.at === 'smithy') return s.homes ? this.spot(c.at) : null;
      if (c.at.startsWith('stall')) return s.stalls?.[Number(c.at.slice(5))] ? this.spot(c.at) : null;
      if (c.at.startsWith('bench')) return s.benches?.[Number(c.at.slice(5))] ? this.spot(c.at) : null;
      if (c.at.startsWith('root')) return s.rootHouses?.[Number(c.at.slice(4))] ? this.spot(c.at) : null;
    }
    if (c.path) return { x: c.path[0][0], z: c.path[0][1] };
    if (c.route) return { x: ROUTES[c.route][0][0], z: ROUTES[c.route][0][1] };
    return null;
  }

  async load(onProgress = () => {}) {
    const detail = this.bank.noise();
    const here = (c) => {
      const h = this.homeOf(c);
      return h && this.keep(h.x, h.z);
    };
    const all = [...PEOPLE.map((p) => ({ ...p, kind: 'person' })), ...ANIMALS.map((a) => ({ ...a, kind: 'animal' }))].filter(here);
    let done = 0;
    await Promise.all(
      all.map(async (c) => {
        const borrow = c.kind === 'person' ? [...new Set([...(NEEDS[c.does] ?? []), ...(c.clip ? [c.clip] : [])])] : [];
        const tpl = await loadTemplate(c.model, { detail, borrow });
        onProgress(++done / all.length);
        if (!tpl) return;
        const height = c.height ?? HEIGHTS[c.model] ?? 1.74 + (this.r() - 0.5) * 0.12;
        const actor = new Actor(tpl, { height, name: c.name ?? c.id });
        if (c.spirit) spiritLook(actor.model);
        this.scene.add(actor.object);
        const home = c.at ? this.spot(c.at) : c.path ? { x: c.path[0][0], z: c.path[0][1], face: 0 } : { x: 0, z: 0, face: 0 };
        const being = { c, actor, x: home.x, z: home.z, yaw: home.face, home, speed: 0, wantSpeed: 0, timer: this.r() * 4, state: 'start', leg: 0, dir: 1, target: null, faceHero: 0, lod: 0 };
        if (c.does === 'jog') {
          being.route = ROUTES[c.route];
          being.leg = 0;
          // Spread the joggers along the route.
          let d = c.offset;
          while (d > 0) {
            const a = being.route[being.leg];
            const b = being.route[(being.leg + 1) % being.route.length];
            const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
            if (d < l) {
              being.x = a[0] + ((b[0] - a[0]) * d) / l;
              being.z = a[1] + ((b[1] - a[1]) * d) / l;
              break;
            }
            d -= l;
            being.leg = (being.leg + 1) % being.route.length;
          }
        }
        (c.kind === 'person' ? this.people : this.animals).push(being);
        this.place(being, 0);
        this.begin(being);
      })
    );
    await this.loadBirds();
  }

  /** Eagles circling high over the cliffs and the square (Mesh2Motion bird, CC0). */
  async loadBirds() {
    const loader = characterLoader();
    const base = './library/rigged/mesh2motion/bird/';
    const [eagle, glide, flap] = await Promise.all([loadFile(`${base}variations/eagle.glb`), loader.loadAsync(`${base}animations/glide.glb`).catch(() => null), loader.loadAsync(`${base}animations/flap.glb`).catch(() => null)]);
    if (!eagle) return;
    const box = new THREE.Box3().setFromObject(eagle.scene);
    const span = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) || 1;
    const spots = [[110, 0, 46, 38], [20, -20, 58, 60], [-40, 30, 52, 48]].filter(([x, z]) => this.keep(x, z));
    if (!spots.length) return;
    for (const [cx, cz, alt, rad] of spots) {
      const o = SkeletonUtils.clone(eagle.scene);
      o.scale.setScalar(2.1 / span);
      o.traverse((m) => {
        if (m.isMesh) {
          m.frustumCulled = false;
          m.castShadow = false;
        }
      });
      const holder = new THREE.Group();
      holder.add(o);
      this.scene.add(holder);
      const mixer = new THREE.AnimationMixer(o);
      const a = glide?.animations[0] ? mixer.clipAction(glide.animations[0]).play() : null;
      const b = flap?.animations[0] ? mixer.clipAction(flap.animations[0]).play() : null;
      this.birds.push({ holder, mixer, a, b, cx, cz, alt, rad, ph: this.r() * 6, w: 0 });
    }
  }

  /** Start a being on its job. */
  begin(b) {
    const { c, actor } = b;
    if (c.kind === 'animal') {
      b.state = 'idle';
      return;
    }
    switch (c.does) {
      case 'work':
        if (c.clip === 'Hammer' || c.clip === 'Cast') actor.act(c.clip, { loop: true });
        break;
      case 'sit':
        actor.act(c.clip ?? 'SitChair', { loop: true, fade: 0 });
        break;
      case 'chat':
        actor.act(this.r() < 0.5 ? 'Talk' : 'Listen', { loop: true });
        break;
      default:
        break;
    }
    b.state = c.does;
  }

  /** Put a being's object where it is. */
  place(b, dt) {
    const y = this.colliders.height(b.x, b.z);
    b.y = b.y === undefined ? y : b.y + (y - b.y) * Math.min(1, dt * 12 || 1);
    const o = b.actor.object;
    let px = b.x;
    let pz = b.z;
    let py = b.y;
    if (b.state === 'sit' && b.home.seat) {
      // Settle back onto the bench: the sitting pose's hips sit about here.
      py = b.home.seat.y - 0.47;
      px = b.home.seat.x + Math.sin(b.yaw) * 0.12;
      pz = b.home.seat.z + Math.cos(b.yaw) * 0.12;
    }
    o.position.set(px, py, pz);
    o.rotation.y = b.yaw;
  }

  /** Turn toward a heading at `rate` rad/s. */
  turn(b, want, rate, dt) {
    const d = wrap(want - b.yaw);
    b.yaw = wrap(b.yaw + THREE.MathUtils.clamp(d, -rate * dt, rate * dt));
    return Math.abs(d);
  }

  /** Walk toward (tx, tz) at `speed`; true when there. */
  walkTo(b, tx, tz, speed, dt, near = 0.6) {
    const dx = tx - b.x;
    const dz = tz - b.z;
    const d = Math.hypot(dx, dz);
    if (d < near) {
      b.wantSpeed = 0;
      return true;
    }
    const off = this.turn(b, Math.atan2(dx, dz), 4.5, dt);
    b.wantSpeed = speed * (off > 1.2 ? 0.25 : 1);
    return false;
  }

  update(dt, t, camera, hero) {
    const hp = hero?.pos;
    this.events.length = 0;
    this._frame = (this._frame ?? 0) + 1;
    const { far: cull = 95, animNear = 40 } = this.limits ?? {};
    let k = 0;
    for (const b of [...this.people, ...this.animals]) {
      k++;
      const d = Math.hypot(b.x - camera.position.x, b.z - camera.position.z);
      const far = d > Math.min(95, cull);
      // Jogging and patrolling carry on out of sight (cheaply); everyone else waits.
      if (far && !['jog', 'patrol', 'stroll'].includes(b.c.does)) {
        b.actor.object.visible = false;
        continue;
      }
      this.think(b, dt, t, hp);
      b.speed += (b.wantSpeed - b.speed) * Math.min(1, dt * 5);
      if (b.speed > 0.05) {
        const [nx, nz] = this.colliders.move(b.x, b.z, Math.sin(b.yaw) * b.speed * dt, Math.cos(b.yaw) * b.speed * dt, 0.32, b.y ?? 0);
        const moved = Math.hypot(nx - b.x, nz - b.z);
        b.stuck = moved < b.speed * dt * 0.3 ? (b.stuck ?? 0) + dt : 0;
        b.x = nx;
        b.z = nz;
      }
      this.place(b, dt);
      b.actor.object.visible = !far;
      if (far) continue;
      b.actor.move(b.speed);
      // Animation thins with distance: every 2nd frame past animNear, every 4th past twice that.
      const stride = animStride(d, { near: Math.min(40, animNear), far: Infinity });
      b.lod = stride > 1 ? 1 : 0;
      b.acc = (b.acc ?? 0) + dt;
      if (ticksOn(this._frame, stride, k)) {
        b.actor.update(b.acc);
        b.acc = 0;
      }
      const shadow = d < 38;
      if (b.shadow !== shadow) {
        b.shadow = shadow;
        b.actor.model.traverse((o) => {
          if (o.isMesh) o.castShadow = shadow;
        });
      }
    }
    for (const bird of this.birds) {
      const k = t * 0.09 + bird.ph;
      const x = bird.cx + Math.cos(k) * bird.rad;
      const z = bird.cz + Math.sin(k) * bird.rad;
      const y = bird.alt + Math.sin(k * 3) * 4;
      bird.holder.position.set(x, y, z);
      bird.holder.rotation.set(0, -k, 0);
      bird.holder.rotation.z = 0.35;
      // Flap on the rise, glide otherwise.
      const flapping = Math.sin(k * 3) > 0.3 ? 1 : 0;
      bird.w += (flapping - bird.w) * Math.min(1, dt * 2);
      bird.a?.setEffectiveWeight(1 - bird.w);
      bird.b?.setEffectiveWeight(bird.w);
      bird.mixer.update(dt);
    }
  }

  /** What a being does this frame. */
  think(b, dt, t, hp) {
    const { c, actor } = b;
    b.timer -= dt;
    const heroD = hp ? Math.hypot(hp.x - b.x, hp.z - b.z) : 99;
    if (c.kind === 'animal') return this.animal(b, dt, heroD, hp);
    // Turn to the hero when they come near (not while jogging), and greet once.
    const engaged = heroD < 4.2 && c.does !== 'jog' && c.does !== 'sit';
    if (heroD < 5 && !this.greeted.has(c.id)) {
      this.greeted.add(c.id);
      this.events.push({ type: 'greet', who: b });
      if (c.does !== 'jog' && c.does !== 'sit' && c.clip !== 'Hammer') actor.act('Greet', { loop: false, fade: 0.25 });
    }
    if (heroD > 9) this.greeted.delete(c.id);
    if (engaged) {
      b.wantSpeed = 0;
      this.turn(b, Math.atan2(hp.x - b.x, hp.z - b.z), 3, dt);
      if (actor.overlay === 'Greet' && actor.done()) actor.act('Talk', { loop: true });
      return;
    }
    if (actor.overlay === 'Greet' && actor.done()) this.begin(b);
    if (actor.overlay === 'Talk' && c.does !== 'chat' && c.does !== 'work') this.begin(b);
    switch (c.does) {
      case 'idle':
        b.wantSpeed = 0;
        this.turn(b, b.home.face, 2, dt);
        if (b.timer < 0) {
          b.timer = 7 + this.r() * 8;
          if (actor.overlay) actor.rest(0.5);
          else actor.act(this.r() < 0.5 ? 'LookAround' : 'FoldArms', { loop: true, fade: 0.6 });
        }
        if (Math.hypot(b.x - b.home.x, b.z - b.home.z) > 1) this.walkTo(b, b.home.x, b.home.z, 1.3, dt);
        break;
      case 'work': {
        b.wantSpeed = 0;
        if (Math.hypot(b.x - b.home.x, b.z - b.home.z) > 0.8) {
          this.walkTo(b, b.home.x, b.home.z, 1.3, dt);
          break;
        }
        this.turn(b, b.home.face, 2, dt);
        if (c.clip === 'Hammer') {
          // Sparks when the hammer comes down.
          const a = actor.actions.Hammer;
          if (a) {
            const ph = (a.time / a.getClip().duration) % 1;
            if (b.lastPh !== undefined && b.lastPh < 0.42 && ph >= 0.42) this.events.push({ type: 'hammer', who: b, at: this.world.spots.homes.smithy.anvil });
            b.lastPh = ph;
          }
        } else if (c.clip !== 'Cast' && b.timer < 0) {
          b.timer = 4 + this.r() * 6;
          actor.act(c.clip ?? 'Interact', { loop: false, fade: 0.35 });
        } else if (actor.overlay && actor.done() && c.clip !== 'Cast') actor.rest(0.4);
        break;
      }
      case 'sit':
        b.wantSpeed = 0;
        b.x = b.home.x;
        b.z = b.home.z;
        b.yaw = b.home.face;
        if (actor.overlay !== c.clip && actor.overlay !== 'Greet') actor.act(c.clip, { loop: true });
        if (actor.overlay === 'Greet' && actor.done()) actor.act(c.clip, { loop: true });
        break;
      case 'chat': {
        b.wantSpeed = 0;
        const other = this.people.find((p) => p.c.id === c.with);
        if (other) this.turn(b, Math.atan2(other.x - b.x, other.z - b.z), 2, dt);
        if (b.timer < 0) {
          b.timer = 3 + this.r() * 4;
          const talking = actor.overlay === 'Talk';
          actor.act(talking ? (this.r() < 0.3 ? 'Nod' : 'Listen') : 'Talk', { loop: true, fade: 0.5 });
          if (other && !talking) other.timer = Math.min(other.timer, 0.4);
        }
        break;
      }
      case 'stroll':
      case 'patrol': {
        if (b.pause > 0) {
          b.pause -= dt;
          b.wantSpeed = 0;
          if (b.pause <= 0) actor.rest(0.4);
          break;
        }
        const path = c.path;
        const [tx, tz] = path[b.leg];
        if (this.walkTo(b, tx, tz, c.does === 'patrol' ? 1.35 : 1.25, dt, 0.9) || b.stuck > 2) {
          b.stuck = 0;
          if (c.does === 'patrol') {
            if (b.leg + b.dir >= path.length || b.leg + b.dir < 0) b.dir = -b.dir;
            b.leg += b.dir;
          } else b.leg = (b.leg + 1) % path.length;
          if (this.r() < 0.4) {
            b.pause = 2 + this.r() * 4;
            actor.act('LookAround', { loop: true, fade: 0.5 });
          }
        }
        break;
      }
      case 'jog': {
        const route = b.route;
        const [tx, tz] = route[(b.leg + 1) % route.length];
        if (this.walkTo(b, tx, tz, 4.4, dt, 1.4) || b.stuck > 1.5) {
          b.stuck = 0;
          b.leg = (b.leg + 1) % route.length;
        }
        break;
      }
      default:
        b.wantSpeed = 0;
    }
  }

  animal(b, dt, heroD, hp) {
    const c = b.c;
    if (c.shy && heroD < c.shy) {
      // Away from the hero.
      b.state = 'flee';
      const away = Math.atan2(b.x - hp.x, b.z - hp.z);
      this.turn(b, away, 5, dt);
      b.wantSpeed = (c.walk ?? 1) * 4;
      b.timer = 2.5;
      return;
    }
    if (b.state === 'flee') {
      if (b.timer > 0) return;
      b.state = 'idle';
      b.timer = 2;
    }
    if (c.id === 'bear' && heroD < 5 && !this.greeted.has(c.id)) {
      this.greeted.add(c.id);
      this.events.push({ type: 'greet', who: b });
    }
    if (c.id === 'bear' && heroD > 9) this.greeted.delete(c.id);
    if (b.state === 'idle') {
      b.wantSpeed = 0;
      if (b.timer < 0) {
        const a = this.r() * Math.PI * 2;
        const rad = this.r() * c.roam;
        b.target = [c.at[0] + Math.cos(a) * rad, c.at[1] + Math.sin(a) * rad];
        b.state = 'walk';
        b.timer = 12;
      }
    } else if (b.state === 'walk') {
      if (this.walkTo(b, b.target[0], b.target[1], c.walk ?? 1, dt, 0.5) || b.timer < 0 || b.stuck > 1.5) {
        b.stuck = 0;
        b.state = 'idle';
        b.timer = 3 + this.r() * 7;
      }
    }
  }

  /** Named people (and the bear, and the stag) within `range` of a point, nearest first. */
  near(p, range = 8) {
    return [...this.people, ...this.animals]
      .filter((b) => (b.c.name || b.c.greet) && b.actor.object.visible)
      .map((b) => ({ b, d: Math.hypot(b.x - p.x, b.z - p.z) }))
      .filter((x) => x.d < range)
      .sort((a, b) => a.d - b.d);
  }

  dispose() {
    for (const b of [...this.people, ...this.animals]) {
      b.actor.dispose();
      this.scene.remove(b.actor.object);
    }
    for (const bird of this.birds) {
      bird.mixer.stopAllAction();
      this.scene.remove(bird.holder);
    }
  }
}

/** The Pale Stag: translucent, moonlit, glowing at the edges. */
function spiritLook(model) {
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.material = new THREE.MeshStandardMaterial({ color: 0xd8f0ff, emissive: 0x6ad0ff, emissiveIntensity: 0.9, transparent: true, opacity: 0.55, roughness: 0.3, depthWrite: false });
    o.castShadow = false;
    o.material.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <opaque_fragment>',
        `{ float fr = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.0); outgoingLight += vec3(0.5, 0.85, 1.0) * fr * 2.5; diffuseColor.a = mix(0.25, 0.9, fr); }
        #include <opaque_fragment>`
      );
    };
  });
}
