/**
 * The Warden's Gate: a carved stone gatehouse filling the cut through the
 * ridge, its tunnel a barrel vault ribbed every few metres, the walls
 * between the ribs carved with leaf-and-ring panels. Each face has a
 * stepped archivolt of wedge stones round the opening, a keystone with a
 * rune (lit violet on the Gloamwood side), pilasters, a corbelled cornice,
 * battlements and buttresses. Lanterns light the way through.
 */
import * as THREE from 'three';
import { Kit, tf } from './kit.js';
import { GATE } from './map.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** An arch-shaped hole (width w, crown h) as a path (counter-clockwise). */
function archPath(path, w, h, steps = 24) {
  const r = w / 2;
  const spring = h - r;
  path.moveTo(-r, -3);
  path.lineTo(r, -3);
  path.lineTo(r, spring);
  for (let i = 1; i <= steps; i++) {
    const a = (i / steps) * Math.PI;
    path.lineTo(Math.cos(a) * r, spring + Math.sin(a) * r);
  }
  path.lineTo(-r, -3);
  return path;
}

/** A band shaped like an arch (inner radius r0, outer r1), legs down to y0, extruded `depth`. */
function archBand(r0, r1, spring, y0, depth, steps = 28) {
  const s = new THREE.Shape();
  s.moveTo(r1, y0);
  s.lineTo(r1, spring);
  for (let i = 1; i <= steps; i++) {
    const a = (i / steps) * Math.PI;
    s.lineTo(Math.cos(a) * r1, spring + Math.sin(a) * r1);
  }
  s.lineTo(-r1, y0);
  s.lineTo(-r0, y0);
  s.lineTo(-r0, spring);
  for (let i = steps - 1; i >= 0; i--) {
    const a = (i / steps) * Math.PI;
    s.lineTo(Math.cos(a) * r0, spring + Math.sin(a) * r0);
  }
  s.lineTo(r0, y0);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 1, curveSegments: 4 });
}

/** One wedge stone of an arch, between angles a0 and a1. */
function voussoir(r0, r1, spring, a0, a1, depth) {
  const s = new THREE.Shape();
  const P = (r, a) => [Math.cos(a) * r, spring + Math.sin(a) * r];
  s.moveTo(...P(r0, a0));
  s.lineTo(...P(r1, a0));
  s.lineTo(...P(r1, a1));
  s.lineTo(...P(r0, a1));
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1 });
}

function scaleUv(geo, k) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k);
  return geo;
}

export async function gateMaterials(bank, base) {
  const [blocks, trim] = await Promise.all([bank.ambient('Bricks113A', { fallback: '#8a8490' }), bank.ambient('Rock030', { fallback: '#6a6870' })]);
  const relief = bank.relief(5);
  const std = (set, extra = {}) =>
    new THREE.MeshStandardMaterial({ map: set.map, normalMap: set.normalMap, roughnessMap: set.arm, aoMap: set.arm, vertexColors: true, roughness: 1, ...extra });
  return {
    gateStone: std(blocks, { normalScale: new THREE.Vector2(1.5, 1.5) }),
    gateTrim: std(trim, { normalScale: new THREE.Vector2(1.2, 1.2) }),
    relief: new THREE.MeshStandardMaterial({ map: trim.map, normalMap: relief.normalMap, normalScale: new THREE.Vector2(2.2, 2.2), aoMap: relief.occlusion, aoMapIntensity: 1, roughness: 0.9, vertexColors: true }),
    rune: new THREE.MeshStandardMaterial({ color: 0x241030, emissive: 0xb860ff, emissiveIntensity: 3.2, roughness: 0.6, vertexColors: true }),
    ...base
  };
}

/** Build the gatehouse into its own kit; returns { group, lights: [...] }. */
export function buildGate(materials, heightAt) {
  const kit = new Kit();
  const W = GATE.width;
  const H = GATE.height;
  const R = W / 2;
  const spring = H - R;
  const HW = GATE.outerHalfWidth;
  const TOP = GATE.top;
  const floor = heightAt(0, (GATE.z0 + GATE.z1) / 2);
  const depth = GATE.z1 - GATE.z0;
  const base = tf(GATE.x, floor, GATE.z0);
  const L = (x, y, z, rx = 0, ry = 0, rz = 0) => base.clone().multiply(tf(x, y, z, rx, ry, rz));
  const stone = '#e6dfe8';
  // The mass, with the tunnel through it.
  const outer = new THREE.Shape();
  outer.moveTo(-HW, -3);
  outer.lineTo(HW, -3);
  outer.lineTo(HW, TOP);
  outer.lineTo(-HW, TOP);
  outer.closePath();
  outer.holes.push(archPath(new THREE.Path(), W, H));
  const mass = new THREE.ExtrudeGeometry(outer, { depth, bevelEnabled: false, curveSegments: 6 });
  kit.add('gateStone', scaleUv(mass, 1 / 3.2), L(0, 0, 0), stone);
  // Ribs inside the tunnel, with pilasters under them.
  const ribs = Math.floor(depth / 4.2);
  for (let i = 1; i < ribs; i++) {
    const z = (i / ribs) * depth;
    kit.add('gateTrim', scaleUv(archBand(R - 0.5, R + 0.05, spring, -0.5, 0.8), 1 / 2.4), L(0, 0, z - 0.4), '#d8d0dc');
  }
  // Carved panels between the ribs, both walls.
  for (let i = 0; i < ribs; i++) {
    const z = ((i + 0.5) / ribs) * depth;
    for (const s of [-1, 1]) {
      const p = new THREE.PlaneGeometry(2.8, 2.8);
      kit.add('relief', p, L(s * (R - 0.52), 3.2, z, 0, -s * Math.PI / 2, 0), '#cfc6d6');
      kit.box('gateTrim', 3.4, 0.35, 0.5, L(s * (R - 0.25), 1.55, z, 0, Math.PI / 2, 0), '#d0c8d4', 1.5);
      kit.box('gateTrim', 3.4, 0.3, 0.5, L(s * (R - 0.25), 4.75, z, 0, Math.PI / 2, 0), '#d0c8d4', 1.5);
    }
  }
  // A plinth along the walls.
  for (const s of [-1, 1]) kit.box('gateTrim', 0.7, 1.0, depth, L(s * (R - 0.2), -0.5, depth / 2), '#c8c0cc', 1.5);

  // The two faces.
  const lights = [];
  for (const [zf, dir] of [[depth, 1], [0, -1]]) {
    const F = (x, y, dz, rx = 0, ry = 0, rz = 0) => L(x, y, zf + dir * dz, rx, ry + (dir < 0 ? Math.PI : 0), rz);
    // Stepped archivolt: three bands, each standing further out.
    const bands = [[R, R + 0.9, 0.35], [R + 0.9, R + 1.9, 0.75], [R + 1.9, R + 2.6, 1.05]];
    bands.forEach(([r0, r1, out], k) => {
      if (k === 1) {
        // The middle band as separate wedge stones.
        const n = 17;
        for (let j = 0; j < n; j++) {
          const a0 = (j / n) * Math.PI + 0.012;
          const a1 = ((j + 1) / n) * Math.PI - 0.012;
          const g = scaleUv(voussoir(r0, r1 + (j === (n - 1) / 2 ? 0.7 : 0), spring, a0, a1, out), 1 / 1.6);
          kit.add('gateTrim', g, F(0, 0, -0.02), j === (n - 1) / 2 ? '#f0e8f4' : '#dcd4e0');
        }
        for (const s of [-1, 1]) kit.box('gateTrim', r1 - r0, spring + 0.5, out, F(s * (r0 + r1) / 2, -0.5, out / 2), '#dcd4e0', 1.6);
      } else {
        kit.add('gateTrim', scaleUv(archBand(r0, r1, spring, -0.6, out), 1 / 1.8), F(0, 0, -0.02), '#e0d8e4');
      }
    });
    // Keystone with a rune.
    const ky = spring + R + 1.9;
    kit.box('gateTrim', 1.8, 2.3, 1.5, F(0, ky - 0.4, 0.7), '#f2eaf6', 1.2);
    const rune = new THREE.TorusGeometry(0.5, 0.07, 6, 24);
    kit.add(dir > 0 ? 'gateTrim' : 'rune', rune, F(0, ky + 0.75, 1.48), '#ffffff');
    kit.add(dir > 0 ? 'gateTrim' : 'rune', new THREE.BoxGeometry(0.1, 0.9, 0.08), F(0, ky + 0.75, 1.48), '#ffffff');
    // Pilasters either side, with bases and capitals.
    for (const s of [-1, 1]) {
      const px = s * (R + 4.6);
      kit.box('gateTrim', 2.2, 22, 1.1, F(px, -0.5, 0.55), '#ddd5e1', 1.8);
      kit.box('gateTrim', 2.8, 1.4, 1.6, F(px, -0.5, 0.8), '#cfc7d3', 1.5);
      kit.box('gateTrim', 2.9, 0.6, 1.7, F(px, 21.2, 0.85), '#e6dee8', 1.5);
      kit.box('gateTrim', 2.5, 0.5, 1.45, F(px, 20.75, 0.72), '#e6dee8', 1.5);
      // Carved panel on the pilaster.
      const p = new THREE.PlaneGeometry(1.8, 1.8);
      kit.add('relief', p, F(px, 9.5, 1.12), '#e0d8e4');
      kit.add('relief', new THREE.PlaneGeometry(1.8, 1.8), F(px, 14.5, 1.12), '#e0d8e4');
      // Big buttresses at the sides.
      const bx = s * (HW - 2.2);
      kit.box('gateStone', 4.4, 26, 3.4, F(bx, -1, 1.7), '#dcd4e0', 3);
      kit.box('gateStone', 3.8, 3, 2.6, F(bx, 25, 1.3, 0.35, 0, 0), '#dcd4e0', 3);
      // A lantern bracket beside the opening.
      kit.box('iron', 0.12, 0.12, 1.1, F(s * (R + 2.9), 5.6, 1.2), '#ffffff');
      lights.push(F(s * (R + 2.9), 5.0, 1.75).elements.slice(12, 15));
    }
    // Cornice with corbels, then battlements.
    kit.box('gateTrim', HW * 2 + 1, 1.0, 2.2, F(0, 24.2, 1.1), '#e8e0ea', 1.8);
    for (let x = -HW + 1; x <= HW - 1; x += 1.6) kit.box('gateTrim', 0.5, 0.9, 1.2, F(x, 23.3, 0.6), '#d6ced8', 1);
    kit.box('gateStone', HW * 2, 1.4, 1.2, F(0, 25.2, 0.6), '#e0d8e4', 2.5);
    for (let x = -HW + 1; x <= HW - 1; x += 2.4) kit.box('gateStone', 1.3, 1.6, 1.3, F(x, 26.6, 0.65), '#e0d8e4', 2.5);
    // A frieze of carved panels above the arch.
    for (let x = -12; x <= 12; x += 3.0) {
      if (Math.abs(x) < 2) continue;
      kit.add('relief', new THREE.PlaneGeometry(2.4, 2.4), F(x, 19.6, 0.15), '#d8d0dc');
    }
  }
  // Inner lanterns along the tunnel.
  for (const z of [depth * 0.3, depth * 0.7]) {
    for (const s of [-1, 1]) {
      kit.box('iron', 0.7, 0.1, 0.1, L(s * (R - 0.6), 5.6, z, 0, 0, 0), '#ffffff');
      lights.push(L(s * (R - 0.95), 5.2, z).elements.slice(12, 15));
    }
  }
  const group = kit.build(materials);
  return { group, lights: lights.map(([x, y, z]) => V(x, y, z)), floor };
}
