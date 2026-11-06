import { AdditiveBlending, CanvasTexture, Color, Group, PointLight, Sprite, SpriteMaterial } from 'three';

/**
 * Light for the things on a map that ought to give it: torches, candles,
 * lanterns, lamps, fireplaces.
 *
 * Every one gets a soft additive glow at its flame, which costs almost
 * nothing. The few nearest the fighting circle also get a real point light
 * that flickers, so the walls and the floor around them are lit warm — that is
 * what makes a dungeon read as a dungeon at night. Real lights are capped
 * (`MAX_LIGHTS`): each one adds work to every lit pixel on screen.
 */

const MAX_LIGHTS = 8;

/** Model ids that hold a flame, and the colour of it. */
const SOURCES = [
  [/torch_lit|torch_mounted|brazier|campfire|fireplace/i, '#ff9a40', 1],
  [/candle.*lit|candle_triple|\/Candle$/i, '#ffb860', 0.45],
  [/lantern|\/Lamp$|Lamp01|Lights0\d/i, '#ffd08a', 0.8]
];

let glowTexture = null;
function glow() {
  if (glowTexture) return glowTexture;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowTexture = new CanvasTexture(canvas);
  return glowTexture;
}

export class PropLights {
  constructor() {
    this.group = new Group();
    this.group.name = 'prop-lights';
    this.flames = [];
  }

  /** @param {{ model: object, x: number, y: number, z: number, scale: number }[]} placements */
  build(placements) {
    this.clear();
    for (const p of placements) {
      const source = SOURCES.find(([re]) => re.test(p.model.id));
      if (!source) continue;
      const [, color, strength] = source;
      const height = (p.model.size?.[1] ?? 1) * p.scale;
      const flame = { x: p.x, y: p.y + height * 0.92, z: p.z, color: new Color(color), strength: strength * Math.max(0.6, Math.min(2.5, p.scale)), seed: Math.random() * 100 };
      const sprite = new Sprite(
        new SpriteMaterial({ map: glow(), color: flame.color, blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.9 })
      );
      sprite.position.set(flame.x, flame.y, flame.z);
      sprite.scale.setScalar(1.1 * flame.strength);
      flame.sprite = sprite;
      this.group.add(sprite);
      this.flames.push(flame);
    }
    // Real lights on the flames closest to where the fighting happens.
    const nearest = [...this.flames].sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z)).slice(0, MAX_LIGHTS);
    for (const flame of nearest) {
      const light = new PointLight(flame.color, 0, 16 * Math.min(1.5, flame.strength), 1.6);
      light.position.set(flame.x, flame.y + 0.1, flame.z);
      flame.light = light;
      this.group.add(light);
    }
    return this.flames.length;
  }

  update(time) {
    for (const f of this.flames) {
      // Two sines at odd rates: an uneven, living flicker, different per flame.
      const k = 0.82 + 0.1 * Math.sin(time * 9.1 + f.seed) + 0.08 * Math.sin(time * 23.7 + f.seed * 2.3);
      f.sprite.scale.setScalar(1.1 * f.strength * (0.9 + 0.1 * k));
      f.sprite.material.opacity = 0.75 * k;
      if (f.light) f.light.intensity = 26 * f.strength * k;
    }
  }

  clear() {
    for (const f of this.flames) f.sprite.material.dispose();
    this.group.clear();
    this.flames = [];
  }
}
