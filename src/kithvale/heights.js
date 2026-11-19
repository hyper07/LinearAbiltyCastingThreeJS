/**
 * The shape of the vale: rolling hills from a few broad noise octaves and
 * named rises (map.js HILLS), ridges that climb steeply round the edge and
 * close it in, the village terrace levelled flat, the road and trails eased
 * into the slopes along smoothed profiles, the Pebblerun carving its shallow
 * bed always downhill to Mirror Pond, and the pond's basin. Plus what the
 * game asks of the ground: water level, what is underfoot, the bridge deck,
 * the slope, where scenery may grow. Pure (no three.js), deterministic.
 */
import { simplex2, fbm, smoothstep, clamp } from '../gloamreach/noise.js';
import { EXTENT, VILLAGE, ROAD, ROAD_HALF, TRAILS, STREAM, POND, HILLS, BRIDGE, LANE, PLAZA, CROSS, GATE, CRAGS, FOREST, HOUSES, GARDEN } from './map.js';

const N1 = simplex2(101);
const N2 = simplex2(202);
const N3 = simplex2(303);
const N4 = simplex2(404);
const lerp = (a, b, t) => a + (b - a) * t;

/* ------------------------------------------------------------------ distance fields */

/**
 * Distance to a sampled line (capped at `cap`) and the arc length of the
 * nearest point, rasterised once on a 1 m grid over the map.
 */
function lineField(line, cap) {
  const W = EXTENT.x1 - EXTENT.x0 + 1;
  const H = EXTENT.z1 - EXTENT.z0 + 1;
  const d = new Float32Array(W * H).fill(cap);
  const s = new Float32Array(W * H);
  const P = line.pts;
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, az] = P[i];
    const [bx, bz] = P[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const L2 = dx * dx + dz * dz || 1e-9;
    const L = Math.sqrt(L2);
    const i0 = Math.max(0, Math.floor(Math.min(ax, bx) - cap - EXTENT.x0));
    const i1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + cap - EXTENT.x0));
    const j0 = Math.max(0, Math.floor(Math.min(az, bz) - cap - EXTENT.z0));
    const j1 = Math.min(H - 1, Math.ceil(Math.max(az, bz) + cap - EXTENT.z0));
    for (let j = j0; j <= j1; j++) {
      const z = EXTENT.z0 + j;
      for (let k = i0; k <= i1; k++) {
        const x = EXTENT.x0 + k;
        let t = ((x - ax) * dx + (z - az) * dz) / L2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const e = Math.hypot(x - ax - dx * t, z - az - dz * t);
        const idx = j * W + k;
        if (e < d[idx]) {
          d[idx] = e;
          s[idx] = line.s[i] + L * t;
        }
      }
    }
  }
  return { d, s, W, H, cap };
}

/** Bilinear distance and the nearest arc length from a field. */
function fieldAt(f, x, z) {
  const fx = x - EXTENT.x0;
  const fz = z - EXTENT.z0;
  if (fx < 0 || fz < 0 || fx >= f.W - 1 || fz >= f.H - 1) return { d: f.cap, s: 0 };
  const i = Math.floor(fx);
  const j = Math.floor(fz);
  const tx = fx - i;
  const tz = fz - j;
  const k = j * f.W + i;
  const a = f.d[k] + (f.d[k + 1] - f.d[k]) * tx;
  const b = f.d[k + f.W] + (f.d[k + f.W + 1] - f.d[k + f.W]) * tx;
  const n = tx < 0.5 ? (tz < 0.5 ? k : k + f.W) : tz < 0.5 ? k + 1 : k + f.W + 1;
  return { d: a + (b - a) * tz, s: f.s[n] };
}

let fields = null;
function F() {
  if (!fields) {
    fields = {
      road: lineField(ROAD, 26),
      trails: TRAILS.map((t) => lineField(t, 12)),
      stream: lineField(STREAM, 20)
    };
  }
  return fields;
}

/* ------------------------------------------------------------------ the land, layer by layer */

/** 1. Hills and ridges, before any road or water. */
function landAt(x, z) {
  let h = 3 + fbm(N1, x / 120, z / 120, 3) * 5.5 + fbm(N2, x / 42, z / 42, 2) * 1.3;
  for (const H of HILLS) {
    const d2 = ((x - H.x) ** 2 + (z - H.z) ** 2) / (H.r * H.r);
    if (d2 < 9) h += H.h * Math.exp(-d2 * 1.7);
  }
  // The crags' knoll is lumpy.
  const dc = Math.hypot(x - CRAGS.x, z - CRAGS.z) / (CRAGS.r * 1.4);
  if (dc < 1) h += (1 - dc) * Math.abs(N4(x / 13, z / 13)) * 2.2;
  // Ridges round the edge close the vale in (steep: you can't climb out).
  const e = Math.hypot(x / 186, (z - 20) / 232) + fbm(N3, x / 70, z / 70, 2) * 0.035;
  h += Math.pow(smoothstep(0.76, 1.08, e), 1.4) * 54;
  return h;
}

/** 2. The village terrace, levelled (with a soft skirt). */
function villageW(x, z) {
  const dx = Math.max(VILLAGE.x0 - x, 0, x - VILLAGE.x1);
  const dz = Math.max(VILLAGE.z0 - z, 0, z - VILLAGE.z1);
  return 1 - smoothstep(0, 18, Math.hypot(dx, dz));
}
function terraceAt(x, z) {
  const w = villageW(x, z);
  const h = landAt(x, z);
  return w > 0 ? lerp(h, VILLAGE.level, w) : h;
}

/** Height along a line, from `fn`, averaged over ±`win` metres, at every sample. */
function profile(line, fn, win, passes = 3) {
  let v = line.pts.map(([x, z]) => fn(x, z));
  for (let p = 0; p < passes; p++) {
    const out = new Array(v.length);
    for (let i = 0; i < v.length; i++) {
      let s = 0;
      let n = 0;
      for (let j = i; j >= 0 && line.s[i] - line.s[j] <= win; j--) (s += v[j]), n++;
      for (let j = i + 1; j < v.length && line.s[j] - line.s[i] <= win; j++) (s += v[j]), n++;
      out[i] = s / n;
    }
    v = out;
  }
  return v;
}
function profileAt(line, prof, s) {
  const S = line.s;
  if (s <= 0) return prof[0];
  if (s >= line.len) return prof[prof.length - 1];
  let lo = 0;
  let hi = S.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (S[m] <= s) lo = m;
    else hi = m;
  }
  return lerp(prof[lo], prof[hi], (s - S[lo]) / Math.max(1e-9, S[hi] - S[lo]));
}

let P = null;
/** Arc length of the sample nearest (x, z). */
function nearestS(line, x, z) {
  let best = 0;
  let bd = Infinity;
  line.pts.forEach(([px, pz], i) => {
    const d = Math.hypot(px - x, pz - z);
    if (d < bd) {
      bd = d;
      best = line.s[i];
    }
  });
  return best;
}
/** The road's and trails' smoothed heights, the stream's water line (always downhill), the pond's level. */
function profiles() {
  if (P) return P;
  P = {};
  P.road = profile(ROAD, terraceAt, 9);
  // Inside the walls the lane is the terrace itself, and it stays level through the gate.
  ROAD.pts.forEach(([x, z], i) => {
    const k = 1 - smoothstep(GATE.z + 4, GATE.z + 22, z);
    P.road[i] = lerp(P.road[i], VILLAGE.level, k);
  });
  P.trails = TRAILS.map((t) => profile(t, (x, z) => roadedAt(x, z, true), 6));
  // The stream: the land along its line, sunk a little, never rising downstream, smoothed.
  let w = profile(STREAM, (x, z) => roadedAt(x, z) - 0.7, 6, 2);
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < w.length; i++) w[i] = Math.min(w[i], w[i - 1] - 0.012);
    const sm = w.slice();
    for (let i = 1; i < w.length - 1; i++) sm[i] = (w[i - 1] + w[i] * 2 + w[i + 1]) / 4;
    w = sm;
  }
  for (let i = 1; i < w.length; i++) w[i] = Math.min(w[i], w[i - 1] - 0.01);
  P.stream = w;
  P.pond = w[w.length - 1] - 0.05;
  // The road comes down toward the bridge so the deck sits low over the water.
  const cross = nearestS(ROAD, BRIDGE.x, BRIDGE.z);
  const sc = nearestS(STREAM, BRIDGE.x, BRIDGE.z);
  const want = profileAt(STREAM, w, sc) + 1.25;
  ROAD.pts.forEach((_, i) => {
    const k = 1 - smoothstep(6, 34, Math.abs(ROAD.s[i] - cross));
    if (k > 0) P.road[i] = lerp(P.road[i], Math.min(P.road[i], want), k);
  });
  return P;
}

/** 3. Road and trails eased into the land. */
function roadedAt(x, z, skipTrails = false) {
  let h = terraceAt(x, z);
  const f = F();
  const r = fieldAt(f.road, x, z);
  if (r.d < ROAD_HALF + 8) {
    const k = 1 - smoothstep(ROAD_HALF + 0.6, ROAD_HALF + 8, r.d);
    h = lerp(h, profileAt(ROAD, profiles().road, r.s), k);
  }
  if (!skipTrails) {
    TRAILS.forEach((t, i) => {
      const q = fieldAt(f.trails[i], x, z);
      if (q.d < 6) h = lerp(h, profileAt(t, P.trails[i], q.s), (1 - smoothstep(1.2, 6, q.d)) * 0.85);
    });
  }
  return h;
}

/** The stream's half-width at arc length s: a rill at the spring, wider near the pond. */
export function streamHalf(s) {
  return 1.3 + Math.min(1.6, s / 180) + Math.sin(s * 0.07) * 0.35 + N4(s * 0.05, 3.3) * 0.25;
}

/** The pond's edge radius toward (x, z) (a soft, irregular round). */
function pondR(x, z) {
  const a = Math.atan2(z - POND.z, x - POND.x);
  return POND.r * (1 + Math.sin(a * 3 + 0.6) * 0.1 + Math.sin(a * 5 - 1.2) * 0.06);
}

/** The ground height at (x, z). */
export function heightAt(x, z) {
  let h = roadedAt(x, z);
  const pr = profiles();
  // The Pebblerun: a shallow bed, gentle banks.
  const st = fieldAt(F().stream, x, z);
  if (st.d < 14) {
    const W = profileAt(STREAM, pr.stream, st.s);
    const half = streamHalf(st.s);
    const bed = st.d < half ? W - 0.55 * (1 - (st.d / half) ** 2) - 0.08 : W + 0.12 + (st.d - half) * 0.32;
    const k = smoothstep(half + 1, half + 10, st.d);
    h = Math.min(h, lerp(bed, h, k));
  }
  // Mirror Pond.
  const dp = Math.hypot(x - POND.x, z - POND.z);
  if (dp < POND.r * 2) {
    const r = pondR(x, z);
    const q = dp / r;
    const bed = q < 1 ? pr.pond - 1.7 * Math.pow(1 - q * q, 0.6) - 0.1 : pr.pond + 0.1 + (q - 1) * r * 0.22;
    h = Math.min(h, lerp(bed, h, smoothstep(1, 1.55, q)));
  }
  return h;
}

/* ------------------------------------------------------------------ water, bridge, ground */

/** The stream's water level at arc length s. */
export function streamLevel(s) {
  return profileAt(STREAM, profiles().stream, s);
}
export function pondLevel() {
  return profiles().pond;
}

/** Distance to the road, the stream and the trails (and arc lengths), from the fields. */
export const roadDistance = (x, z) => fieldAt(F().road, x, z);
export const streamDistance = (x, z) => fieldAt(F().stream, x, z);
export const trailDistance = (x, z) => Math.min(...F().trails.map((f) => fieldAt(f, x, z).d));
export const roadHeight = (s) => profileAt(ROAD, profiles().road, s);

/** The water surface at (x, z), or −Infinity where there is none. */
export function waterAt(x, z) {
  let w = -Infinity;
  const st = fieldAt(F().stream, x, z);
  if (st.d < streamHalf(st.s) + 1.2) w = streamLevel(st.s);
  const dp = Math.hypot(x - POND.x, z - POND.z);
  if (dp < pondR(x, z) * 1.12) w = Math.max(w, pondLevel());
  return w;
}

/** The bridge over the Pebblerun: its frame (centre, the way the road runs, deck height). */
let bridge = null;
export function bridgeFrame() {
  if (bridge) return bridge;
  const r = roadDistance(BRIDGE.x, BRIDGE.z);
  const yaw = (() => {
    // The road's direction at the crossing.
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < ROAD.pts.length - 1; i++) {
      const d = Math.hypot(ROAD.pts[i][0] - BRIDGE.x, ROAD.pts[i][1] - BRIDGE.z);
      if (d < bd) {
        bd = d;
        best = Math.atan2(ROAD.pts[i + 1][0] - ROAD.pts[i][0], ROAD.pts[i + 1][1] - ROAD.pts[i][1]);
      }
    }
    return best;
  })();
  const half = BRIDGE.length / 2;
  const end = (k) => heightAt(BRIDGE.x + Math.sin(yaw) * half * k, BRIDGE.z + Math.cos(yaw) * half * k);
  const a = end(-1) + 0.08;
  const b = end(1) + 0.08;
  const water = streamLevel(streamDistance(BRIDGE.x, BRIDGE.z).s);
  const deck = Math.max(water + 1.15, (a + b) / 2 + 0.25);
  void r;
  bridge = { x: BRIDGE.x, z: BRIDGE.z, yaw, deck, a, b, half, w: BRIDGE.width / 2 };
  return bridge;
}

/** The deck's height under (x, z) (arched a little), or null off the bridge. */
export function bridgeAt(x, z) {
  const b = bridgeFrame();
  const dx = x - b.x;
  const dz = z - b.z;
  const along = dx * Math.sin(b.yaw) + dz * Math.cos(b.yaw);
  const across = dx * Math.cos(b.yaw) - dz * Math.sin(b.yaw);
  if (Math.abs(along) > b.half || Math.abs(across) > b.w) return null;
  return deckHeight(along);
}

/** The deck's height `along` metres from the bridge's middle: an arch from bank to bank. */
export function deckHeight(along) {
  const b = bridgeFrame();
  const u = Math.max(-1, Math.min(1, along / b.half));
  const ends = lerp(b.a, b.b, (u + 1) / 2);
  return ends + (b.deck - (b.a + b.b) / 2) * (1 - u * u);
}

/** What you stand on: the land, or the bridge where it crosses. */
export function groundAt(x, z) {
  const h = heightAt(x, z);
  const d = bridgeAt(x, z);
  return d != null ? Math.max(h, d) : h;
}

export function slopeAt(x, z, e = 0.5) {
  const dx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e);
  const dz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
  return Math.hypot(dx, dz);
}

/** Inside the village walls? */
export const inVillage = (x, z) => x > VILLAGE.x0 && x < VILLAGE.x1 && z > VILLAGE.z0 && z < VILLAGE.z1;

/** Paved: the lane, the plaza and the cross street inside the walls. */
export function pavedAt(x, z) {
  if (!inVillage(x, z)) return false;
  if (Math.abs(x - LANE.x) < LANE.half && z > LANE.z0 - 3 && z < LANE.z1 - 13) return true;
  if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r) return true;
  return Math.abs(z - CROSS.z) < CROSS.half && x > CROSS.x0 && x < CROSS.x1;
}

/** What is underfoot (for footsteps, splashes and dust). */
export function surfaceAt(x, z) {
  if (bridgeAt(x, z) != null) return 'wood';
  const h = heightAt(x, z);
  const w = waterAt(x, z);
  if (w > h + 0.04) return w - h > 0.45 ? 'water' : 'shallow';
  if (inVillage(x, z)) return pavedAt(x, z) ? 'cobble' : 'dirt';
  if (roadDistance(x, z).d < ROAD_HALF + 0.3 || trailDistance(x, z) < 1.2) return 'dirt';
  if (Math.hypot(x - CRAGS.x, z - CRAGS.z) < CRAGS.r && slopeAt(x, z) > 0.35) return 'rock';
  if (((x - FOREST.x) / FOREST.rx) ** 2 + ((z - FOREST.z) / FOREST.rz) ** 2 < 1) return 'moss';
  return 'grass';
}

/** How deep the water is at (x, z) (0 when dry). */
export function depthAt(x, z) {
  return Math.max(0, waterAt(x, z) - heightAt(x, z));
}

/**
 * May scenery grow here? Not in the village, on the road, the trails, the
 * banks or the water, nor where the ground is a cliff.
 */
export function isClear(x, z, margin = 0) {
  if (x < EXTENT.x0 + 2 || x > EXTENT.x1 - 2 || z < EXTENT.z0 + 2 || z > EXTENT.z1 - 2) return false;
  if (x > VILLAGE.x0 - 4 - margin && x < VILLAGE.x1 + 4 + margin && z > VILLAGE.z0 - 4 - margin && z < VILLAGE.z1 + 4 + margin) return false;
  if (roadDistance(x, z).d < ROAD_HALF + 2 + margin) return false;
  if (trailDistance(x, z) < 2 + margin) return false;
  const st = streamDistance(x, z);
  if (st.d < streamHalf(st.s) + 2 + margin) return false;
  if (Math.hypot(x - POND.x, z - POND.z) < pondR(x, z) + 3 + margin) return false;
  return true;
}

/** How far into the ridges a point is (0 inside the vale, 1 on the steep rim). */
export function rimAt(x, z) {
  const e = Math.hypot(x / 186, (z - 20) / 232);
  return smoothstep(0.8, 1.0, e);
}

/** For tests: the village terrace's level and a house's footprint test. */
export function inHouse(x, z, pad = 0) {
  for (const h of HOUSES) {
    const dx = x - h.x;
    const dz = z - h.z;
    const lx = dx * Math.cos(h.face) - dz * Math.sin(h.face);
    const lz = dx * Math.sin(h.face) + dz * Math.cos(h.face);
    if (Math.abs(lx) < h.w / 2 + pad && Math.abs(lz) < h.d / 2 + pad) return h;
  }
  return null;
}

export const inGarden = (x, z) => Math.hypot(x - GARDEN.x, z - GARDEN.z) < GARDEN.r;
export { clamp };
