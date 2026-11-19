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
 * The material every solid figure shares (people, monsters, their gear):
 * lit by the scene, with its own colours kept readable in the dark (`self`,
 * warmed or cooled by the light nearby), blocks that glow from within (the
 * geometry's `aGlow`: eyes, cores, magma cracks), a soft rim light so the
 * figure stands out from the dark behind it, and a hit flash that fades.
 * `gloss` gives a wet or icy shine (a slime, a crystal); `metal` a metal
 * sheen — a highlight from the lights and a sky-and-ground reflection that
 * slides over the faces as the figure turns.
 *
 *   const u = figureUniforms();                       // one set per actor, shared by its materials
 *   const m = figureMaterial(u, { metal: 0.8 });
 *   u.uFlash.value = 1; u.uRim.value.set(…); u.uGlowK.value = 1.2;
 */
export function figureUniforms() {
  return {
    uSelf: { value: new THREE.Color(0.4, 0.4, 0.4) },
    uRim: { value: new THREE.Color(0.1, 0.12, 0.16) },
    uFlash: { value: 0 },
    uFlashColor: { value: new THREE.Color(1.8, 1.7, 1.55) },
    uGlowK: { value: 1 },
    uEnvHigh: { value: new THREE.Color(0.75, 0.8, 0.95) },
    uEnvLow: { value: new THREE.Color(0.06, 0.05, 0.06) }
  };
}

export function figureMaterial(u, { gloss = 0, metal = 0, side = THREE.FrontSide, emissive = null, strength = 0 } = {}) {
  const m = new THREE.MeshPhongMaterial({
    vertexColors: true,
    side,
    shininess: metal ? 60 : gloss ? 70 : 12,
    specular: new THREE.Color().setScalar(metal ? 0.55 : gloss ? 0.5 * gloss : 0.02)
  });
  if (emissive) {
    m.emissive.set(emissive);
    m.userData.base = strength;
  }
  m.userData.metal = metal;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u, { uMetal: { value: metal } });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aGlow;\nvarying float vGlow;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec3 uSelf; uniform vec3 uRim; uniform float uFlash; uniform vec3 uFlashColor; uniform float uGlowK;
uniform vec3 uEnvHigh; uniform vec3 uEnvLow; uniform float uMetal; varying float vGlow;`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * (uSelf + vec3(vGlow * uGlowK * 1.6));')
      .replace('#include <opaque_fragment>', `{
  vec3 vdir = normalize(vViewPosition);
  vec3 nrm = normalize(normal);
  float facing = clamp(abs(dot(nrm, vdir)), 0.0, 1.0);
  outgoingLight += uRim * pow(1.0 - facing, 3.0);
  if (uMetal > 0.0) {
    vec3 r = reflect(-vdir, nrm);
    vec3 env = mix(uEnvLow, uEnvHigh, smoothstep(-0.2, 0.7, r.y));
    float fres = 0.55 + 0.45 * pow(1.0 - facing, 3.0);
    outgoingLight = mix(outgoingLight, outgoingLight * 0.6 + env * diffuseColor.rgb * 0.75, uMetal * fres * 0.85);
  }
  outgoingLight = mix(outgoingLight, uFlashColor, clamp(uFlash, 0.0, 1.0));
}
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => `fig|${metal ? 1 : 0}`;
  return m;
}

/** Each frame: an actor's light (`self` from the light nearby, the rim, the flash fading). */
export function lightFigure(u, light, { glow = 0, glowColor = null, flash = 0, time = 0 } = {}) {
  u.uSelf.value.copy(light).multiplyScalar(0.5);
  if (glow) u.uSelf.value.addScalar(glow * 0.8);
  if (glowColor) {
    const g = 0.35 + 0.15 * Math.sin(time * 6);
    u.uSelf.value.r += glowColor.r * g;
    u.uSelf.value.g += glowColor.g * g;
    u.uSelf.value.b += glowColor.b * g;
  }
  // The rim: a cool edge in the dark, warmed by fire nearby; brighter for a figure that glows.
  const rim = u.uRim.value;
  rim.setRGB(0.08 + light.r * 0.12, 0.095 + light.g * 0.12, 0.13 + light.b * 0.12);
  if (glowColor) rim.setRGB(rim.r + glowColor.r * 0.35, rim.g + glowColor.g * 0.35, rim.b + glowColor.b * 0.35);
  u.uFlash.value = Math.max(0, Math.min(1, flash / 0.1)) * 0.85;
  u.uEnvHigh.value.setRGB(0.42 + light.r * 0.25, 0.46 + light.g * 0.25, 0.56 + light.b * 0.25);
}

/**
 * A plain solid figure from a sprite (herbs, crystals): its pixel sprite
 * made solid (voxel.js), turned to face where it is going (`facing`,
 * radians; unset, it faces the camera), lit like the figures, with a hit
 * flash and a blob shadow. Monsters use beasts.js, people rig.js.
 */
export class SpriteActor {
  constructor({ shadow = 0.45, glow = 0, scale = 1 } = {}) {
    this.group = new THREE.Group();
    this.u = figureUniforms();
    this.self = this.u.uSelf;
    this.material = figureMaterial(this.u, { side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(EMPTY, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.renderOrder = 2;
    this.group.add(this.mesh);
    this.shadow = shadow ? blobShadow(shadow) : null;
    if (this.shadow) this.group.add(this.shadow);
    this.glow = glow; // 0…: how much it lights itself (wisps, herbs)
    this.glowColor = null; // a coloured aura (hero monsters)
    this.scale = scale;
    this.sprite = null;
    this.flip = false;
    this.flash = 0;
    this.lift = 0; // metres off the ground (a hop, a float)
    this.tint = new THREE.Color(1, 1, 1);
    this.squash = 0; // + taller and thinner, − wider and flatter
    /** Which way it faces (radians, as the game's headings: 0 toward +Z); null: toward the camera. */
    this.facing = null;
    this.time = 0;
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
    this.time += dt;
    const turn = this.sprite?.profile ? -Math.PI / 2 : 0;
    const facing = this.facing ?? (this.sprite?.profile ? yaw + (this.flip ? Math.PI : 0) + Math.PI / 2 : yaw);
    this.mesh.rotation.y = facing + turn;
    this.mesh.position.y = this.lift;
    if (this.flash > 0) this.flash -= dt;
    this.material.color.copy(this.tint);
    lightFigure(this.u, light, { glow: this.glow, glowColor: this.glowColor, flash: this.flash, time: this.time });
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
