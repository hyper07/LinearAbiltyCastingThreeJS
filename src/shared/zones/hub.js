/**
 * A hub's rules, the same in every game: inside its ring nothing hurts you
 * and you can't fight; monsters won't follow you in (they give up at the
 * edge and go home) and can't step over it; its waystone joins a network
 * of every hub you've reached, for fast travel; resting there heals you and
 * makes it where you wake after falling. Pure: tests/unit/zones.test.mjs.
 */
import { inHub, fenceOut, spawnPoint } from './zone.js';

/** No blows land here, and none are struck. */
export const safeAt = (zone, x, z) => inHub(zone, x, z);

/**
 * What a monster may do about a hero at (hx, hz): chase only while the hero
 * is out of the hub (a margin beyond the ring, so it doesn't stand pressed
 * against it), and never stand inside. `body` is its radius.
 */
export function monsterRule(zone, hx, hz) {
  const safe = inHub(zone, hx, hz, 1.5);
  return { chase: !safe, hurt: !safe };
}

/** Where a monster may stand: pushed out of the hub's ring. */
export const keepOut = (zone, x, z, body = 0.5) => fenceOut(zone?.hub ?? null, x, z, body, 0.6);

/** A blow aimed at the hero: let through (its amount) or stopped by the hub (0). */
export function blowAt(zone, hx, hz, amount) {
  return safeAt(zone, hx, hz) ? 0 : amount;
}

/**
 * The waystone network: every hub reached, by zone, in the zones' order.
 * `here` marks the hub you're standing at.
 */
export function waystones(zones, save, hereHub = null) {
  const out = [];
  for (const z of zones) {
    if (z.stub || !z.hub) continue;
    out.push({ hub: z.hub.id, zone: z.id, name: z.hub.name, zoneName: z.name, reached: save.hubs.includes(z.hub.id), here: z.hub.id === hereHub });
  }
  return out;
}

/** Can you travel from `fromHub` to `toHub`? Only between hubs you've reached, not to where you stand. */
export function canTravel(save, fromHub, toHub) {
  return save.hubs.includes(toHub) && save.hubs.includes(fromHub) && fromHub !== toHub;
}

/** The hub with this id, and its zone. */
export function hubById(zones, id) {
  for (const z of zones) if (z.hub?.id === id) return { zone: z, hub: z.hub };
  return null;
}

/** Where a waystone puts you: beside the stone, facing into the hub. */
export function arrivalAt(zone) {
  const h = zone.hub;
  const w = h.services?.waystone ?? h;
  const dx = h.x - w.x;
  const dz = h.z - w.z;
  const d = Math.hypot(dx, dz);
  const yaw = d > 0.5 ? Math.atan2(dx, dz) : 0;
  const k = d > 0.5 ? 2.4 / d : 0;
  return { x: w.x + dx * k + (d > 0.5 ? 0 : 2.4), z: w.z + dz * k, yaw };
}

/** Where you wake after falling: the last hub you rested at (or the first zone's), beside its rest spot. */
export function respawnPoint(zones, save) {
  const found = hubById(zones, save.lastHub) ?? hubById(zones, save.hubs[0]) ?? (zones[0]?.hub ? { zone: zones[0], hub: zones[0].hub } : null);
  if (!found) return { zone: zones[0]?.id, ...spawnPoint(zones[0]) };
  const { zone, hub } = found;
  const r = hub.services?.rest ?? hub;
  const yaw = Math.atan2(hub.x - r.x, hub.z - r.z) || 0;
  return { zone: zone.id, hub: hub.id, x: r.x + Math.sin(yaw) * 1.8, z: r.z + Math.cos(yaw) * 1.8, yaw };
}
