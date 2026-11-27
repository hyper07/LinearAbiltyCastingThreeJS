/**
 * Where a road's paint goes: its lines stop where it runs into another road (a junction's
 * middle is plain asphalt, not two roads' lines crossing each other, nor drawn twice over one
 * another), and a street too narrow for them has none. Pure numbers, so the rules can be
 * checked without a city.
 *
 * The roads' surfaces are the SeoulGame `roadArea` stretches, [ax, az, bx, bz, half, id, bridge] (`id`
 * the road they belong to; a bridge crosses no road, it passes over it); `ends` lists them by each end's point (`endKey`), so a stretch's
 * end can tell a road that goes on through a junction (its next stretch, or the next road of
 * the same street, carries on from it) from one that stops there (a side road meeting it).
 *
 *   inJunction(segs, ends, x, z, ux, uz, id, half)   // is (x, z) on another road crossing ours (going ux, uz), or over it?
 *   paintRuns(line, half, id, near, ends)      // [[from, to, flags]…] along a road's line: JC centre, JL/JR its edge lines
 *   lineRules(width, oneway)                   // which lines a road this wide has
 */

/**
 * `edge`: how far in from its edge a road's edge line is (as the road shader draws it); `step`: metres
 * between the samples along a road; `along`: a road running within this (the cosine) of ours is the same
 * street (its other carriageway, its next stretch), not one crossing it; `inside`: how far into the other
 * road a point must be; `through`: how straight on (the cosine) a stretch must carry on from another's end
 * for the road to go on through there; `end`: within this of a stretch's end is level with it.
 */
export const PAINT = { edge: 0.35, step: 0.5, along: 0.85, inside: 0.1, through: 0.5, end: 0.05 };
/** The flags of a stretch of road (paintRuns): its centre line in a junction, its left edge line, its right. */
export const JC = 1;
export const JL = 2;
export const JR = 4;

/** A road end's point, to the decimetre (where stretches meet: the same key). */
export const endKey = (x, z) => `${Math.round(x * 10)}|${Math.round(z * 10)}`;

/**
 * Does another road `s` running alongside ours (`half` our half-width, `id` our road) keep its paint where
 * the two lie over each other — the wider one (of two as wide, the one listed first) — so ours yields?
 */
const outranks = (s, half, id) => s[4] > half + 0.01 || (Math.abs(s[4] - half) <= 0.01 && s[5] < id);

/**
 * Is (x, z) inside another road than `id` (ours, `half` m to each side, running ux, uz here) where our
 * paint must stop — one crossing ours: inside its carriageway, or past the end of one of its stretches
 * where that road goes on through (a junction's middle), but not past the end of a road that stops there
 * (the side road of a T: the road it meets runs on, its lines unbroken on the far side); or one lying
 * along over ours (a slip road, a road drawn twice), if it outranks ours?
 */
export function inJunction(segs, ends, x, z, ux, uz, id, half = 0) {
  for (const s of segs) {
    const [ax, az, bx, bz, sHalf, sid, bridge] = s;
    // (a bridge passes over the road it crosses: no junction)
    if (sid === id || bridge) continue;
    const ex = bx - ax;
    const ez = bz - az;
    const L = Math.hypot(ex, ez);
    if (L < 1e-6) continue;
    const alongside = Math.abs((ex * ux + ez * uz) / L) > PAINT.along;
    if (alongside && !outranks(s, half, id)) continue;
    const raw = ((x - ax) * ex + (z - az) * ez) / (L * L);
    const t = Math.max(0, Math.min(1, raw));
    if (Math.hypot(ax + ex * t - x, az + ez * t - z) >= sHalf - PAINT.inside) continue;
    // (along it — not level with one of its ends: a side road ending on our middle line is no junction there)
    if (raw * L > PAINT.end && (1 - raw) * L > PAINT.end) return true;
    // (one alongside only over its length: past its end it's the next stretch of the street, ours or its own)
    if (alongside) continue;
    // past (or level with) one of its ends: only where the road goes on from there (not ours)
    const end = raw < 0.5;
    const px = end ? ax : bx;
    const pz = end ? az : bz;
    const ox = (end ? -ex : ex) / L;
    const oz = (end ? -ez : ez) / L;
    const key = endKey(px, pz);
    for (const o of ends?.get(key) ?? []) {
      if (o === s || o[5] === id) continue;
      const from = endKey(o[0], o[1]) === key;
      const wx = from ? o[2] - o[0] : o[0] - o[2];
      const wz = from ? o[3] - o[1] : o[1] - o[3];
      const wl = Math.hypot(wx, wz) || 1;
      if ((wx * ox + wz * oz) / wl > PAINT.through) return true;
    }
  }
  return false;
}

/**
 * Along a road's line ([[x, z]…], `half` its half-width, `id` its road): the stretches where its paint
 * runs and where it stops, as [[from, to, flags]…] in metres along the line, end to end — `flags` JC
 * where its middle is inside another road, JL / JR where its left / right edge line is (left: the side
 * of (−uz, ux) going ux, uz, as SeoulGame `_roadMesh` lays its `left` edge). `near(x, z)` gives the
 * roadArea stretches round a point.
 */
export function paintRuns(line, half, id, near, ends) {
  const runs = [];
  let cur = null;
  const push = (a, b, f) => {
    if (b - a < 1e-6) return;
    if (cur && cur[2] === f) cur[1] = b;
    else runs.push((cur = [a, b, f]));
  };
  const off = Math.max(0, half - PAINT.edge);
  let acc = 0;
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1];
    const [bx, bz] = line[i];
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 1e-6) continue;
    const ux = (bx - ax) / len;
    const uz = (bz - az) / len;
    // the other roads' stretches that could reach this one (most of a road meets none)
    const reach = half + 1;
    const x0 = Math.min(ax, bx) - reach;
    const x1 = Math.max(ax, bx) + reach;
    const z0 = Math.min(az, bz) - reach;
    const z1 = Math.max(az, bz) + reach;
    const cands = (near((ax + bx) / 2, (az + bz) / 2) ?? []).filter((s) => {
      if (s[5] === id || s[6]) return false;
      const ex = s[2] - s[0];
      const ez = s[3] - s[1];
      const L = Math.hypot(ex, ez);
      if (L < 1e-6 || (Math.abs((ex * ux + ez * uz) / L) > PAINT.along && !outranks(s, half, id))) return false;
      const h = s[4];
      return Math.min(s[0], s[2]) - h < x1 && Math.max(s[0], s[2]) + h > x0 && Math.min(s[1], s[3]) - h < z1 && Math.max(s[1], s[3]) + h > z0;
    });
    if (!cands.length) {
      push(acc, acc + len, 0);
      acc += len;
      continue;
    }
    const probe = (t) => {
      const x = ax + ux * t;
      const z = az + uz * t;
      let f = 0;
      if (inJunction(cands, ends, x, z, ux, uz, id, half)) f |= JC;
      if (inJunction(cands, ends, x - uz * off, z + ux * off, ux, uz, id, half)) f |= JL;
      if (inJunction(cands, ends, x + uz * off, z - ux * off, ux, uz, id, half)) f |= JR;
      return f;
    };
    const n = Math.max(1, Math.ceil(len / PAINT.step));
    let from = 0;
    let was = probe(0);
    let lo = 0;
    for (let q = 1; q <= n; q++) {
      const t = (q / n) * len;
      const f = probe(t);
      if (f !== was) {
        // (where it changes, to a few centimetres)
        let a = lo;
        let b = t;
        for (let k = 0; k < 5; k++) {
          const m = (a + b) / 2;
          if (probe(m) === was) a = m;
          else b = m;
        }
        const at = (a + b) / 2;
        push(acc + from, acc + at, was);
        from = at;
        was = f;
      }
      lo = t;
    }
    push(acc + from, acc + len, was);
    acc += len;
  }
  return runs;
}

/**
 * The lines a road `width` m wide has (as the road shader draws them): a street under `bare` m none at
 * all; a two-way one under `centre` m no line down its middle (one lane, shared); a two-way one over
 * `yellow` m a double yellow down its middle (else a dashed white); a one-way one the yellow on its
 * median side.
 */
export const LINES = { bare: 4, centre: 5.5, yellow: 9 };

export function lineRules(width, oneway) {
  if (width < LINES.bare) return { edges: false, centre: false, yellow: false };
  if (oneway) return { edges: true, centre: false, yellow: true };
  return { edges: true, centre: width >= LINES.centre, yellow: width > LINES.yellow };
}
