import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry
} from 'three';
import { buildWeaponMesh } from '../entities/WeaponVisual.js';
import { buildGearMesh } from '../entities/GearVisual.js';
import { platform } from '../platform/index.js';
import { RARITIES, itemColor } from './Items.js';

const geo = {
  coin: new CylinderGeometry(0.16, 0.16, 0.05, 16),
  bottle: new SphereGeometry(0.17, 16, 12),
  neck: new CylinderGeometry(0.05, 0.06, 0.14, 10),
  book: new BoxGeometry(0.42, 0.1, 0.32),
  beam: new CylinderGeometry(0.05, 0.12, 1, 10, 1, true)
};
const mats = new Map();
const mat = (key, make) => {
  if (!mats.has(key)) mats.set(key, make());
  return mats.get(key);
};

/** The thing lying on the floor, by item type. */
function buildMesh(item) {
  const group = new Group();
  if (item.type === 'gold') {
    const gold = mat('gold', () => new MeshStandardMaterial({ color: '#ffcf3f', metalness: 0.9, roughness: 0.3, emissive: '#5a3a00' }));
    const n = Math.min(6, 1 + Math.floor(Math.log2(item.amount + 1)));
    for (let i = 0; i < n; i++) {
      const coin = new Mesh(geo.coin, gold);
      coin.position.set((Math.random() - 0.5) * 0.3, 0.03 + i * 0.045, (Math.random() - 0.5) * 0.3);
      coin.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * 3, (Math.random() - 0.5) * 0.4);
      group.add(coin);
    }
  } else if (item.type === 'potion') {
    const color = itemColor(item);
    const glass = mat(`potion-${color}`, () => new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.15, transparent: true, opacity: 0.9 }));
    const cork = mat('cork', () => new MeshStandardMaterial({ color: '#8a6a48', roughness: 0.9 }));
    const bottle = new Mesh(geo.bottle, glass);
    bottle.position.y = 0.17;
    const neck = new Mesh(geo.neck, cork);
    neck.position.y = 0.38;
    group.add(bottle, neck);
  } else if (item.type === 'book') {
    const cover = mat('book', () => new MeshStandardMaterial({ color: '#6b2fb3', emissive: '#3a1070', roughness: 0.6 }));
    const book = new Mesh(geo.book, cover);
    book.position.y = 0.05;
    book.rotation.y = Math.random() * Math.PI;
    group.add(book);
  } else if (item.type === 'gear') {
    const mesh = buildGearMesh(item);
    // Helmets, chests and boots stand up; flat things (shields, rings) lie down.
    const flat = item.kind === 'offhand' || item.kind === 'ring' || item.kind === 'neck' || item.kind === 'back';
    if (flat) mesh.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI * 2);
    else mesh.rotation.y = Math.random() * Math.PI * 2;
    mesh.position.y = item.kind === 'head' ? 0.2 : item.kind === 'chest' ? 0.18 : item.kind === 'back' ? 0.05 : 0.06;
    mesh.scale.setScalar(item.kind === 'ring' || item.kind === 'neck' ? 1.6 : 0.7);
    group.add(mesh);
  } else if (item.type === 'weapon') {
    const weapon = platform.weapons.get(item.weapon);
    const mesh = weapon ? buildWeaponMesh(weapon) : null;
    if (mesh) {
      // Lay it on the ground, a little raised so it reads from above.
      mesh.rotation.set(Math.PI / 2, 0, Math.random() * Math.PI * 2);
      mesh.position.y = 0.12;
      group.add(mesh);
    } else {
      group.add(new Mesh(geo.book, mat('weapon', () => new MeshStandardMaterial({ color: '#aaaaaa' }))));
    }
  }
  return group;
}

/**
 * Items on the ground: they burst out of whatever dropped them, land with a
 * light beam in their rarity colour and a floating name, and go into the bag
 * when the caster walks over them (or clicks the name from close by).
 */
export class LootSystem {
  constructor(scene, labels) {
    this.scene = scene;
    this.labels = labels;
    this.group = new Group();
    this.group.name = 'loot';
    scene.add(this.group);
    this.drops = [];
    /** @type {(item: object) => { ok: boolean, message: string }} */
    this.onPickup = null;
    this.player = null;
  }

  /**
   * @param {object[]} items
   * @param {{x: number, z: number}} from where they burst out
   */
  /**
   * Where `count` items bursting out of `from` land, as `[x, z]` pairs. Rolled
   * once by whoever dropped them, so a party sees the same loot in the same
   * places.
   */
  static scatter(from, count) {
    const targets = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 0.8 + Math.random() * 1.6 + i * 0.25;
      let tx = from.x + Math.cos(angle) * distance;
      let tz = from.z + Math.sin(angle) * distance;
      // Keep loot inside the arena the caster can reach.
      const r = Math.hypot(tx, tz);
      if (r > 22) {
        tx *= 22 / r;
        tz *= 22 / r;
      }
      targets.push([Math.round(tx * 100) / 100, Math.round(tz * 100) / 100]);
    }
    return targets;
  }

  /** Is this item still on the ground? */
  has(uid) {
    return this.drops.some((drop) => drop.item.uid === uid);
  }

  /** Someone else took it. */
  removeByUid(uid) {
    const drop = this.drops.find((d) => d.item.uid === uid);
    if (drop) this._remove(drop);
    return Boolean(drop);
  }

  /**
   * @param {object[]} items
   * @param {{x: number, z: number}} from where they burst out
   * @param {(x: number, z: number) => number} [heightAt]
   * @param {{ targets?: [number, number][], byPlayer?: boolean }} [options] pre-rolled landing spots
   *   (see `scatter`); `byPlayer`: dropped from the bag, so it is not picked straight back up — it
   *   waits until the player has stepped away from it once
   */
  drop(items, from, heightAt = () => 0, { targets = null, byPlayer = false } = {}) {
    const spots = targets ?? LootSystem.scatter(from, items.length);
    items.forEach((item, i) => {
      const [tx, tz] = spots[i] ?? spots[0] ?? [from.x, from.z];
      const root = new Group();
      const mesh = buildMesh(item);
      root.add(mesh);
      const rarity = item.type === 'weapon' || item.type === 'gear' || item.type === 'book' ? item.rarity : null;
      let beam = null;
      if (rarity && rarity !== 'common') {
        const color = new Color(RARITIES[rarity].color);
        beam = new Mesh(
          geo.beam,
          mat(`beam-${rarity}`, () => new MeshBasicMaterial({ color, transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false, toneMapped: false }))
        );
        const height = { magic: 2.5, rare: 4, epic: 6, unique: 8 }[rarity] ?? 3;
        beam.scale.set(1, height, 1);
        beam.position.y = height / 2;
        beam.visible = false;
        root.add(beam);
      }
      root.position.set(from.x, heightAt(from.x, from.z) + 1, from.z);
      this.group.add(root);
      const drop = {
        item,
        root,
        mesh,
        beam,
        from: { x: from.x, z: from.z },
        to: { x: tx, z: tz, y: heightAt(tx, tz) },
        t: 0,
        landed: false,
        waitForLeave: byPlayer,
        label: null
      };
      drop.label = this.labels.add(root.position, item.name, {
        className: `world-label--loot world-label--${item.type}`,
        offset: 0.6,
        maxDistance: 45,
        color: itemColor(item),
        onClick: () => this._tryPick(drop, 4.5)
      });
      drop.label.setVisible(false);
      this.drops.push(drop);
    });
  }

  _tryPick(drop, reach) {
    if (!drop.landed || !this.player) return;
    const d = Math.hypot(this.player.x - drop.root.position.x, this.player.z - drop.root.position.z);
    if (d > reach) return;
    const result = this.onPickup?.(drop.item) ?? { ok: true };
    if (result.ok) this._remove(drop);
    else drop.blockedUntil = performance.now() + 2500;
  }

  _remove(drop) {
    drop.label?.remove();
    drop.root.removeFromParent();
    this.drops.splice(this.drops.indexOf(drop), 1);
  }

  clear() {
    for (const drop of [...this.drops]) this._remove(drop);
  }

  update(dt, time, player) {
    this.player = player;
    for (const drop of [...this.drops]) {
      if (!drop.landed) {
        // A short arc out of the body, then a bounce.
        drop.t = Math.min(1, drop.t + dt * 1.8);
        const t = drop.t;
        const x = drop.from.x + (drop.to.x - drop.from.x) * t;
        const z = drop.from.z + (drop.to.z - drop.from.z) * t;
        drop.root.position.set(x, drop.to.y + Math.sin(t * Math.PI) * 1.6 + (1 - t) * 0.4, z);
        drop.mesh.rotation.y += dt * 8;
        if (t >= 1) {
          drop.landed = true;
          drop.root.position.y = drop.to.y;
          if (drop.beam) drop.beam.visible = true;
          drop.label.setVisible(true);
        }
        continue;
      }
      if (drop.beam) drop.beam.material.opacity = 0.4 + Math.sin(time * 3 + drop.to.x) * 0.15;
      if (drop.item.type === 'gold' || drop.item.type === 'potion') drop.mesh.rotation.y += dt;
      if (player && !(drop.blockedUntil > performance.now())) {
        const d = Math.hypot(player.x - drop.root.position.x, player.z - drop.root.position.z);
        // Something you dropped stays down until you have walked off it once.
        if (drop.waitForLeave) {
          if (d > 2) drop.waitForLeave = false;
          continue;
        }
        if (d < 1.3) this._tryPick(drop, 1.3);
      }
    }
  }
}
