import { RANKS, BUILDINGS, GUARDIANS } from './rules.js';
import { STRUCTURES, GUARDS, BARRACKS, ARMORY, FORGE, PAD, EXCHANGE_AT, inBase, foeDef } from './map.js';
import { CAMP, BUNKER, COLORS } from './rules.js';

/** The camp's places, named on the ground with their keys. */
const PLACES = [
  [FORGE, 'THE FORGE', 'raise soldiers here · W send · F open', '#5cc8ff'],
  [PAD, 'THE CAMP HEALS', 'everyone in it, to full, every 5 s (for ore) · E come home', '#3ddc84'],
  [EXCHANGE_AT, 'EXCHANGE', 'points → ore while one of yours stands here · X send', '#ffb84d'],
  [BARRACKS, 'BARRACKS', 'R Recruit', '#e8e2d0'],
  [ARMORY, 'ARMOURY', 'U upgrades', '#e8e2d0']
];

/**
 * What both Grave Purge views (3D and 2D) draw and pick the same way, given
 * a view with `toScreen(x, y, z)`, `width`, `height`, `selected`, `popups`,
 * `siteHp` and `box`.
 */

/** What is under a screen point: one of mine (`troop`), or something of the dead's to attack. */
export function pickAt(view, state, px, py, kind = 'foe', mySlot = -1) {
  let best = null;
  let bestD = 30;
  for (const e of state.ents) {
    if (kind === 'troop' ? e.k !== 'troop' || e.o !== mySlot || e.in : e.k !== 'foe') continue;
    const h = e.k === 'foe' ? foeDef(e.kind).size * 0.55 : 1;
    const p = view.toScreen(e.x, h, e.z);
    const d = Math.hypot(p.x - px, p.y - py) - (e.k === 'foe' && GUARDIANS[e.kind] ? 24 : 0);
    if (d < bestD) {
      best = e;
      bestD = d;
    }
  }
  if (kind === 'foe') {
    // Sleeping guards and buildings too.
    const down = new Set(state.down);
    for (const g of GUARDS) {
      if (down.has(g.id)) continue;
      const p = view.toScreen(g.x, 1, g.z);
      const d = Math.hypot(p.x - px, p.y - py);
      if (d < bestD) {
        best = { i: g.id, k: 'foe', x: g.x, z: g.z };
        bestD = d;
      }
    }
    for (const s of STRUCTURES) {
      if (down.has(s.id)) continue;
      const p = view.toScreen(s.x, 1.5, s.z);
      const d = Math.hypot(p.x - px, p.y - py) - BUILDINGS[s.type].r * 9;
      if (d < bestD) {
        best = { i: s.id, k: 'bld', x: s.x, z: s.z };
        bestD = d;
      }
    }
  }
  return best;
}

/** My soldiers inside a screen rectangle. */
export function boxedIn(view, state, x0, y0, x1, y1, mySlot) {
  const [ax, bx] = [Math.min(x0, x1), Math.max(x0, x1)];
  const [ay, by] = [Math.min(y0, y1), Math.max(y0, y1)];
  return state.ents.filter((e) => {
    if (e.k !== 'troop' || e.o !== mySlot || e.in) return false;
    const p = view.toScreen(e.x, 0.8, e.z);
    return p.x >= ax && p.x <= bx && p.y >= ay && p.y <= by;
  }).map((e) => e.i);
}

/** Health bars, names, the ore you just earned. */
export function drawOverlay(view, ctx, state) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const dpr = ctx.canvas.width / view.width;
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.textAlign = 'center';
  const bar = (x, y, z, k, w, color, big = false) => {
    const p = view.toScreen(x, y, z);
    if (!p.front || p.x < -60 || p.y < -20 || p.x > view.width + 60 || p.y > view.height + 20) return null;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(p.x - w / 2 - 1, p.y - 1, w + 2, big ? 7 : 5);
    ctx.fillStyle = color;
    ctx.fillRect(p.x - w / 2, p.y, w * Math.max(0, k), big ? 5 : 3);
    return p;
  };
  for (const e of state.ents) {
    if (e.k === 'bunker') {
      // A bunker: whose, how full, and (if it can be broken) how hurt or how far built.
      const p = view.toScreen(e.x, 3.6, e.z);
      if (p.x < -80 || p.y < -30 || p.x > view.width + 80 || p.y > view.height + 30) continue;
      ctx.font = '800 11px system-ui, sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      const owner = e.o === view.mySlot ? 'YOUR' : `${(state.players[e.o]?.name ?? '').toUpperCase()}'S`;
      const label = `${owner} BUNKER${e.built < 1 ? ` · BUILDING ${Math.round(e.built * 100)}%` : ''} · ${e.n}/${BUNKER.seats}`;
      ctx.strokeText(label, p.x, p.y - 8);
      ctx.fillStyle = COLORS[e.o] ?? '#ffffff';
      ctx.fillText(label, p.x, p.y - 8);
      // A dot in the owner's colour, like their soldiers' rings.
      ctx.beginPath();
      ctx.arc(p.x - ctx.measureText(label).width / 2 - 9, p.y - 12, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (!e.base) bar(e.x, 3.2, e.z, e.hp / e.max, 46, '#ffb84d');
      continue;
    }
    if (e.k === 'troop') {
      if (e.in) continue;
      if (e.hp >= e.max && !view.selected.has(e.i)) continue;
      const k = e.hp / e.max;
      bar(e.x, 2.3 * RANKS[e.rank].scale, e.z, k, 26 + RANKS[e.rank].tier * 6, k > 0.5 ? '#4ade80' : k > 0.25 ? '#facc15' : '#ef4444');
    } else if (e.k === 'foe') {
      const guardian = GUARDIANS[e.kind];
      if (e.hp >= e.max && !guardian) continue;
      const p = bar(e.x, foeDef(e.kind).size + 0.5 + (foeDef(e.kind).flying ? 2.4 : 0), e.z, e.hp / e.max, guardian ? 80 : 26, guardian ? '#ff9020' : '#e0483c', Boolean(guardian));
      if (p && guardian) {
        ctx.font = '700 12px system-ui, sans-serif';
        ctx.strokeStyle = 'rgba(0,0,0,0.75)';
        ctx.lineWidth = 3;
        ctx.strokeText(guardian.name, p.x, p.y - 6);
        ctx.fillStyle = '#ffd08a';
        ctx.fillText(guardian.name, p.x, p.y - 6);
      }
    } else if (e.k === 'gun' && e.hp < e.max) bar(e.x, 3, e.z, e.hp / e.max, 40, '#f5c518');
  }
  for (const [id, h] of view.siteHp ?? []) {
    const s = STRUCTURES.find((b) => b.id === id);
    if (!s) continue;
    const big = BUILDINGS[s.type].key || BUILDINGS[s.type].heart;
    const p = bar(s.x, s.type === 'heart' ? 9 : 5, s.z, h.hp / h.max, big ? 100 : 50, '#c060ff', big);
    if (p && big) {
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.lineWidth = 3;
      ctx.strokeText(BUILDINGS[s.type].name, p.x, p.y - 6);
      ctx.fillStyle = '#e8c8ff';
      ctx.fillText(BUILDINGS[s.type].name, p.x, p.y - 6);
    }
  }
  // The camp's places, when the camera is near them.
  for (const [at, name, hint, color] of PLACES) {
    const p = view.toScreen(at.x, 0, at.z + 3.5);
    if (p.x < -120 || p.y < -40 || p.x > view.width + 120 || p.y > view.height + 40) continue;
    ctx.font = '900 13px system-ui, sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(name, p.x, p.y);
    ctx.fillStyle = color;
    ctx.fillText(name, p.x, p.y);
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.strokeText(hint, p.x, p.y + 14);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(hint, p.x, p.y + 14);
  }
  // Soldiers healing in the camp: green crosses rising (faster on the pad).
  for (const e of state.ents) {
    if (e.k !== 'troop' || e.in || e.hp >= e.max || !inBase(e.x, e.z)) continue;
    const fast = true;
    const rise = ((view.time ?? 0) * (fast ? 1.6 : 0.8) + e.i * 0.37) % 1;
    const p = view.toScreen(e.x + 0.3, 1.8 + rise * 1.2, e.z);
    ctx.globalAlpha = 1 - rise;
    ctx.font = `900 ${fast ? 15 : 12}px system-ui, sans-serif`;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    ctx.strokeText('+', p.x, p.y);
    ctx.fillStyle = '#4ade80';
    ctx.fillText('+', p.x, p.y);
    ctx.globalAlpha = 1;
  }
  ctx.font = '800 14px system-ui, sans-serif';
  for (const p of view.popups) {
    const s = view.toScreen(p.x, 2.5 + p.t * 2, p.z);
    if (!s.front) continue;
    ctx.globalAlpha = Math.max(0, 1 - p.t / 1.4);
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 3;
    ctx.strokeText(p.text, s.x, s.y);
    ctx.fillStyle = '#ffd34d';
    ctx.fillText(p.text, s.x, s.y);
  }
  ctx.globalAlpha = 1;
  // The selection box being dragged.
  if (view.box) {
    ctx.strokeStyle = '#7dffb0';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(125,255,176,0.08)';
    const { x0, y0, x1, y1 } = view.box;
    ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
    ctx.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
  }
  ctx.restore();
}
