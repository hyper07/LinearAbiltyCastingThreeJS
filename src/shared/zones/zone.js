/**
 * Zones: a game's world as medium-sized maps joined by portals and gateways,
 * each with a safe hub. This file is the data side — what a zone is, the
 * checks every zone list must pass, and the geometry the rules and the
 * builders share (bounds, portal shapes, the hub's ring). Pure: no three.js,
 * no DOM; tests/unit/zones.test.mjs builds a toy zone from data.
 *
 * A zone (see docs/zones.md, "How to add a zone"):
 *
 *   {
 *     id: 'gloamwood', name: 'The Gloamwood', sub: 'where the dusk never ends',
 *     theme: 'dusk',                       // the transition's colours and the hub's edge
 *     bounds: { x0, x1, z0, z1 },          // what is built (terrain, scatter); metres, x east, z south
 *     terrain: { source: 'gloamreach' },   // which height function / builder makes the ground
 *     look: { lighting: 'gloam', fog: 'violet' },
 *     music: { calm: 'night-forest' },     // or { rule: 'gloamreach' } for the game's area rules
 *     spawns: { gate: { x, z, yaw } },     // arrival points, named; `default` is used when none is asked for
 *     portals: [{ id, name, x, z, shape: { type: 'circle', r } | { type: 'box', hw, hd, face }, to, arrive, lock?, soon? }],
 *     monsters: [...], creatures: [...], npcs: [...],   // the game's own entries (ids, kinds, places)
 *     pois: [{ id, name, x, z, kind }],    // for the minimap, the full map and the found-so-far counters
 *     hub: { id, name, x, z, r, edge, services: { map: {x,z}, info, stash, stats, merchant, rest, waystone } },
 *     story: { hooks: [] }                 // quests and dialogue to come; see docs/zones.md
 *   }
 *
 * A stub zone (`stub: true`, a name and nothing else) is a door for later:
 * portals may point at it (they show "coming soon") but it can't be entered.
 */

export const SERVICES = ['map', 'info', 'stash', 'stats', 'merchant', 'rest', 'waystone'];
export const SERVICE_NAMES = { map: 'Map board', info: 'Guide', stash: 'Stash', stats: 'Hero', merchant: 'Merchant', rest: 'Rest', waystone: 'Waystone' };
export const THEMES = ['golden', 'dusk', 'ember', 'jungle', 'mist', 'lantern', 'meadow'];

const num = (v) => typeof v === 'number' && Number.isFinite(v);

/** The size of a zone's bounds in metres: { w, d, area }. */
export function sizeOf(bounds) {
  const w = bounds.x1 - bounds.x0;
  const d = bounds.z1 - bounds.z0;
  return { w, d, area: w * d };
}

/** Is (x, z) inside the bounds, `m` metres in from their edge (negative m: out past it)? */
export function inBounds(b, x, z, m = 0) {
  return x >= b.x0 + m && x <= b.x1 - m && z >= b.z0 + m && z <= b.z1 - m;
}

/** Signed distance from a portal's shape (negative inside). Circles by radius; boxes turned by `face` (0 = +z). */
export function shapeDistance(p, x, z) {
  const s = p.shape ?? { type: 'circle', r: 2 };
  const dx = x - p.x;
  const dz = z - p.z;
  if (s.type === 'box') {
    const c = Math.cos(s.face ?? 0);
    const sn = Math.sin(s.face ?? 0);
    const lx = dx * c - dz * sn;
    const lz = dx * sn + dz * c;
    const qx = Math.abs(lx) - s.hw;
    const qz = Math.abs(lz) - s.hd;
    return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0);
  }
  return Math.hypot(dx, dz) - (s.r ?? 2);
}

export const inShape = (p, x, z) => shapeDistance(p, x, z) <= 0;

/** Fill in defaults and freeze nothing: a zone ready for the manager and the checks. */
export function defineZone(d) {
  if (d.stub) return { id: d.id, name: d.name ?? 'Coming soon', sub: d.sub ?? '', stub: true, theme: d.theme ?? 'mist', world: d.world ?? null, portals: [], pois: [], spawns: {}, story: { hooks: [] } };
  const z = {
    theme: 'golden',
    terrain: {},
    look: {},
    music: {},
    spawns: {},
    portals: [],
    monsters: [],
    creatures: [],
    npcs: [],
    pois: [],
    hub: null,
    story: { hooks: [] },
    ...d
  };
  z.portals = z.portals.map((p) => ({ shape: { type: 'circle', r: 2 }, arrive: 'default', ...p }));
  if (z.hub) z.hub = { r: 18, edge: 'lanterns', services: {}, ...z.hub };
  z.story = { hooks: [], ...(z.story ?? {}) };
  return z;
}

/** A spawn point by name (or the zone's default, or its hub's middle, or its bounds' middle). */
export function spawnPoint(zone, name = 'default') {
  if (typeof name === 'object' && name) return { yaw: 0, ...name };
  const s = zone.spawns?.[name] ?? zone.spawns?.default ?? (zone.hub ? { x: zone.hub.x, z: zone.hub.z, yaw: 0 } : null);
  if (s) return { yaw: 0, ...s };
  const b = zone.bounds;
  return { x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2, yaw: 0 };
}

/**
 * Everything wrong with a list of zones, as sentences (empty: all good):
 * unique ids, bounds that make sense, portals that lead to zones that exist
 * and arrive at spawn points inside their bounds, a hub inside each zone with
 * its services within its ring, spawns, portals and points of interest
 * inside bounds, and (optionally) nothing larger than `maxSize` metres.
 */
export function validateZones(zones, { maxSize = null } = {}) {
  const out = [];
  const byId = new Map();
  for (const z of zones) {
    if (!z?.id || typeof z.id !== 'string') out.push('a zone without an id');
    else if (byId.has(z.id)) out.push(`two zones called "${z.id}"`);
    else byId.set(z.id, z);
  }
  for (const z of zones) {
    if (!z?.id) continue;
    if (!z.name) out.push(`${z.id}: no name`);
    if (z.stub) continue;
    const b = z.bounds;
    if (!b || ![b.x0, b.x1, b.z0, b.z1].every(num) || b.x1 <= b.x0 || b.z1 <= b.z0) {
      out.push(`${z.id}: bad bounds`);
      continue;
    }
    if (maxSize) {
      const { w, d } = sizeOf(b);
      if (w > maxSize.w || d > maxSize.d) out.push(`${z.id}: ${w} × ${d} m is larger than ${maxSize.w} × ${maxSize.d}`);
    }
    for (const [name, s] of Object.entries(z.spawns ?? {})) {
      if (!num(s?.x) || !num(s?.z)) out.push(`${z.id}: spawn "${name}" has no place`);
      else if (!inBounds(b, s.x, s.z, 1)) out.push(`${z.id}: spawn "${name}" lies outside the zone`);
    }
    const ids = new Set();
    for (const p of z.portals ?? []) {
      if (!p.id) out.push(`${z.id}: a portal without an id`);
      if (ids.has(p.id)) out.push(`${z.id}: two portals called "${p.id}"`);
      ids.add(p.id);
      if (!num(p.x) || !num(p.z) || !inBounds(b, p.x, p.z)) out.push(`${z.id}: portal "${p.id}" lies outside the zone`);
      const to = byId.get(p.to);
      if (!to) {
        out.push(`${z.id}: portal "${p.id}" leads to "${p.to}", which isn't a zone`);
        continue;
      }
      if (to.stub) {
        if (!p.soon) out.push(`${z.id}: portal "${p.id}" leads to a stub zone but isn't marked soon`);
        continue;
      }
      if (typeof p.arrive === 'string') {
        const s = to.spawns?.[p.arrive] ?? (p.arrive === 'default' ? spawnPoint(to) : null);
        if (!s) out.push(`${z.id}: portal "${p.id}" arrives at "${p.arrive}", which ${p.to} doesn't have`);
        else if (!inBounds(to.bounds, s.x, s.z, 1)) out.push(`${z.id}: portal "${p.id}" arrives outside ${p.to}`);
        else {
          // Arriving inside the way back would bounce you straight home.
          for (const q of to.portals ?? []) if (inShape(q, s.x, s.z)) out.push(`${z.id}: portal "${p.id}" arrives inside ${p.to}'s portal "${q.id}"`);
        }
      } else if (p.arrive && (!num(p.arrive.x) || !inBounds(to.bounds, p.arrive.x, p.arrive.z, 1))) out.push(`${z.id}: portal "${p.id}" arrives outside ${p.to}`);
    }
    for (const poi of z.pois ?? []) if (!num(poi.x) || !inBounds(b, poi.x, poi.z)) out.push(`${z.id}: point "${poi.id ?? poi.name}" lies outside the zone`);
    const h = z.hub;
    if (!h) out.push(`${z.id}: no hub`);
    else {
      if (!inBounds(b, h.x, h.z, 1)) out.push(`${z.id}: the hub lies outside the zone`);
      if (!(h.r > 0)) out.push(`${z.id}: the hub has no size`);
      for (const [k, s] of Object.entries(h.services ?? {})) {
        if (!SERVICES.includes(k)) out.push(`${z.id}: unknown hub service "${k}"`);
        else if (!num(s?.x) || !num(s?.z) || Math.hypot(s.x - h.x, s.z - h.z) > h.r) out.push(`${z.id}: the hub's ${k} is outside its ring`);
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ portals */

/** The portal whose shape holds (x, z), or null. */
export function portalAt(zone, x, z) {
  for (const p of zone?.portals ?? []) if (inShape(p, x, z)) return p;
  return null;
}

/** The nearest portal within `reach` metres of its edge: { portal, d } or null (for prompts and preloading). */
export function portalNear(zone, x, z, reach = 30) {
  let best = null;
  for (const p of zone?.portals ?? []) {
    const d = shapeDistance(p, x, z);
    if (d <= reach && (!best || d < best.d)) best = { portal: p, d };
  }
  return best;
}

/** Can this portal be used now? `flags` is the save's set of flags; a lock names one it needs. */
export function portalOpen(portal, flags = {}) {
  if (portal.soon) return { open: false, why: portal.soonText ?? 'Coming soon' };
  if (portal.lock && !flags[portal.lock.flag]) return { open: false, why: portal.lock.text ?? 'Locked' };
  return { open: true, why: '' };
}

/* ------------------------------------------------------------------ hubs */

/** Is (x, z) inside the zone's hub (within `margin` metres of its ring counting as inside)? */
export function inHub(zone, x, z, margin = 0) {
  const h = zone?.hub;
  return Boolean(h && Math.hypot(x - h.x, z - h.z) <= h.r + margin);
}

/**
 * Keep a body of radius `r` out of the hub: its position pushed back to just
 * outside the ring (plus `margin`). Returns [x, z] (unchanged when outside).
 */
export function fenceOut(hub, x, z, r = 0, margin = 0.5) {
  if (!hub) return [x, z];
  const dx = x - hub.x;
  const dz = z - hub.z;
  const d = Math.hypot(dx, dz);
  const min = hub.r + r + margin;
  if (d >= min) return [x, z];
  if (d < 1e-6) return [hub.x + min, hub.z];
  return [hub.x + (dx / d) * min, hub.z + (dz / d) * min];
}

/** The hub service within `reach` metres of (x, z): { id, x, z, d } or null. */
export function serviceNear(zone, x, z, reach = 2.6) {
  let best = null;
  for (const [id, s] of Object.entries(zone?.hub?.services ?? {})) {
    const d = Math.hypot(s.x - x, s.z - z) - (s.r ?? 0);
    if (d <= reach && (!best || d < best.d)) best = { id, ...s, d };
  }
  return best;
}

/* ------------------------------------------------------------------ the world overview */

/**
 * The zones as a graph for the full map's World view: a node per zone and a
 * link per pair joined by a portal (one-way doors are drawn as such).
 */
export function zoneGraph(zones) {
  const nodes = zones.map((z, i) => ({ id: z.id, name: z.name, stub: Boolean(z.stub), hub: z.hub?.name ?? null, order: i, at: z.world ?? null }));
  const links = [];
  const seen = new Map();
  for (const z of zones) {
    for (const p of z.portals ?? []) {
      const key = [z.id, p.to].sort().join('|');
      const back = seen.get(key);
      if (back) {
        back.both = true;
        continue;
      }
      const l = { a: z.id, b: p.to, name: p.name ?? '', soon: Boolean(p.soon), locked: Boolean(p.lock), both: false };
      seen.set(key, l);
      links.push(l);
    }
  }
  return { nodes, links };
}
