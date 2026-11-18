/**
 * Billboards for Lanternwood: pixel sprites standing upright in the 3D world
 * (turned to face the camera about the vertical axis only, feet on the
 * ground), pixel effects on planes, and the soft blob shadow under each.
 */
import * as THREE from 'three';
import { PXM } from './sprites.js';

const textures = new WeakMap();
const owned = new Set();

/** A crisp (nearest-filtered) texture for a canvas, made once and reused. */
export function texFor(canvas) {
  let t = textures.get(canvas);
  if (!t) {
    t = new THREE.CanvasTexture(canvas);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    textures.set(canvas, t);
    owned.add(t);
  }
  return t;
}

/** Free every texture texFor made (on close). */
export function disposeTextures() {
  for (const t of owned) t.dispose();
  owned.clear();
}

/** A unit plane whose (0,0) is the bottom centre: scale it to the sprite's size in metres. */
const FEET_PLANE = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);

let blobTex = null;
function blobTexture() {
  if (blobTex) return blobTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,0,0,0.62)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.38)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  blobTex = new THREE.CanvasTexture(c);
  blobTex.colorSpace = THREE.SRGBColorSpace;
  owned.add(blobTex);
  return blobTex;
}
const BLOB_PLANE = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

/** A soft round shadow on the ground. */
export function blobShadow(radius = 0.5) {
  const m = new THREE.Mesh(BLOB_PLANE, new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, fog: true, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.scale.set(radius * 2, 1, radius * 1.5);
  m.position.y = 0.03;
  m.renderOrder = 1;
  return m;
}

/**
 * A character sprite: a plane with the current frame, lit by a tint the game
 * sets from the lights nearby (so firelight warms it and the moon cools it),
 * a hit flash (the sprite's white silhouette) and a blob shadow.
 */
export class SpriteActor {
  constructor({ shadow = 0.45, glow = 0, scale = 1 } = {}) {
    this.group = new THREE.Group();
    this.material = new THREE.MeshBasicMaterial({ alphaTest: 0.5, side: THREE.DoubleSide, fog: true });
    this.mesh = new THREE.Mesh(FEET_PLANE, this.material);
    this.mesh.renderOrder = 2;
    this.group.add(this.mesh);
    this.shadow = shadow ? blobShadow(shadow) : null;
    if (this.shadow) this.group.add(this.shadow);
    this.glow = glow; // 0…: how much it lights itself (wisps, herbs)
    this.scale = scale;
    this.sprite = null;
    this.flip = false;
    this.flash = 0;
    this.lift = 0; // metres off the ground (a hop, a float)
    this.tint = new THREE.Color(1, 1, 1);
    this.squash = 0; // + taller and thinner, − wider and flatter
  }

  /** Show a sprite frame, mirrored or not. */
  show(sprite, flip = false) {
    const white = this.flash > 0;
    const map = texFor(white ? sprite.white : sprite.canvas);
    if (this.material.map !== map) {
      if (!this.material.map) this.material.needsUpdate = true;
      this.material.map = map;
    }
    this.sprite = sprite;
    this.flip = flip;
    const k = this.scale / PXM;
    this.mesh.scale.set(sprite.width * k * (flip ? -1 : 1) * (1 - this.squash * 0.6), sprite.height * k * (1 + this.squash), 1);
  }

  /** Per frame: face the camera (yaw), apply light and flash. */
  update(dt, yaw, light) {
    this.mesh.rotation.y = yaw;
    this.mesh.position.y = this.lift;
    if (this.flash > 0) {
      this.flash -= dt;
      this.material.color.setRGB(1.6, 1.5, 1.4);
    } else {
      this.material.color.copy(light).multiply(this.tint);
      if (this.glow) this.material.color.addScalar(this.glow);
    }
    if (this.sprite) this.show(this.sprite, this.flip);
    if (this.shadow) {
      const s = Math.max(0.35, 1 - this.lift * 0.35);
      this.shadow.material.opacity = s;
    }
  }

  get height() {
    return this.sprite ? (this.sprite.height / PXM) * this.scale : 1.6;
  }

  dispose() {
    this.material.dispose();
    this.shadow?.material.dispose();
    this.group.removeFromParent();
  }
}

/**
 * A pixel effect (an FxPlayer from src/pixel/fx.js) on a camera-facing
 * plane, its origin pixel at the group's position. `pxm`: effect pixels a
 * metre. Additive for fire and light, normal for smoke and dust.
 */
export class FxBillboard {
  constructor(player, { pxm = 48, additive = false, color = 1, speed = 1, flip = false } = {}) {
    this.player = player;
    this.speed = speed;
    const [w, h] = player.size;
    const [ox, oy] = player.origin;
    this.geometry = new THREE.PlaneGeometry(1, 1).translate(0.5 - ox / w, oy / h - 0.5, 0);
    this.material = new THREE.MeshBasicMaterial({
      map: player.texture(THREE),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      fog: !additive
    });
    this.material.color.setScalar(color);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.scale.set((w / pxm) * (flip ? -1 : 1), h / pxm, 1);
    this.mesh.renderOrder = 5;
    this.owner = true; // this billboard advances its player (false when it shares one)
  }

  /** Returns true while it should stay (a one-shot that played out returns false). */
  update(dt, yaw) {
    if (this.owner) this.player.update(dt * this.speed);
    this.mesh.rotation.y = yaw;
    return this.player.loop || !this.player.done;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    if (this.owner) this.player._texture?.dispose();
    this.mesh.removeFromParent();
  }
}

/** A canvas filled by a painter function. */
export function canvasOf(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d'), w, h);
  return c;
}
