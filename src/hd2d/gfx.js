/**
 * Billboards for Lanternwood: pixel sprites standing upright in the 3D world
 * (turned to face the camera about the vertical axis only, feet on the
 * ground), pixel effects on planes, and the soft blob shadow under each.
 */
import * as THREE from 'three';
import { PXM } from './sprites.js';
import { voxelGeometry } from './voxel.js';

const EMPTY = new THREE.BufferGeometry();

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
 * A character: its pixel sprite made solid (voxel.js) — a 3D figure of
 * blocks that turns to face where it is going (`facing`, radians; unset, it
 * faces the camera), lit by the scene's lights and casting a shadow, with a
 * warm or cold cast from the light nearby, a hit flash and a blob shadow.
 * (The name stays: the game shows sprite frames on it as before.)
 */
export class SpriteActor {
  constructor({ shadow = 0.45, glow = 0, scale = 1 } = {}) {
    this.group = new THREE.Group();
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: false });
    // Its own colours stay readable in the dark (as the drawn sprites were), warmed or cooled by the
    // light nearby; the scene's lights add the 3D shading on top.
    this.self = { value: new THREE.Color(0.4, 0.4, 0.4) };
    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.uSelf = this.self;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uSelf;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uSelf;');
    };
    this.mesh = new THREE.Mesh(EMPTY, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
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
    /** Which way it faces (radians, as the game's headings: 0 toward +Z); null: toward the camera. */
    this.facing = null;
  }

  /** Show a sprite frame (made solid). `flip` turns a side-drawn figure round when no facing is set. */
  show(sprite, flip = false) {
    if (sprite !== this.sprite) this.mesh.geometry = voxelGeometry(sprite);
    this.sprite = sprite;
    this.flip = flip;
    const k = this.scale;
    this.mesh.scale.set(k * (1 - this.squash * 0.6), k * (1 + this.squash), k * (1 - this.squash * 0.6));
  }

  /** Per frame: turn, apply the light's cast and the flash. */
  update(dt, yaw, light) {
    // A side-drawn figure (the wolf) is drawn facing +X; the rest face +Z.
    const turn = this.sprite?.profile ? -Math.PI / 2 : 0;
    const facing = this.facing ?? (this.sprite?.profile ? yaw + (this.flip ? Math.PI : 0) + Math.PI / 2 : yaw);
    this.mesh.rotation.y = facing + turn;
    this.mesh.position.y = this.lift;
    if (this.flash > 0) {
      this.flash -= dt;
      this.material.color.setRGB(1, 1, 1);
      this.material.emissive.setRGB(1.2, 1.1, 1.0);
      this.self.value.setRGB(0, 0, 0);
    } else {
      // The scene's lights do the lighting; the light nearby (torches, the moon) adds its cast.
      this.material.color.copy(this.tint);
      this.material.emissive.setRGB(0, 0, 0);
      this.self.value.copy(light).multiplyScalar(0.55);
      if (this.glow) this.self.value.addScalar(this.glow * 0.8);
    }
    if (this.shadow) {
      const s = Math.max(0.35, 1 - this.lift * 0.35);
      this.shadow.material.opacity = s * 0.7;
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
