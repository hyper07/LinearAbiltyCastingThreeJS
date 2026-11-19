/**
 * The zone manager: one zone loaded at a time. It watches the player's feet
 * for portals (a step into one starts the trip; locked and coming-soon doors
 * say so instead), notices the hub (the Safe label, a first visit lighting its
 * waystone) and points of interest, preloads the next zone's data while you
 * walk toward a door, and runs a trip: the view swirls shut in the
 * destination's colours, the game lets go of every trace of the old zone and
 * builds the new one behind a card with its name, and the view opens again.
 *
 * It knows nothing of how a game draws; the game hands it an adapter:
 *
 *   const zones = new ZoneManager({
 *     game: 'gloamreach', zones: ZONES, save, host: this.root,
 *     adapter: {
 *       load: async (zone, at, progress) => { …build zone, put the hero at `at`… },
 *       unload: (zone) => { …dispose everything zone-scoped… },
 *       preload: (zone) => { …optional: warm caches (data, models)… },
 *       teleport: (at) => { …same zone, new spot… },
 *       persist: () => { …write the save… }
 *     },
 *     on: { leave(to, via), enter(zone, via, from), arrive(zone, via), hub(inside, zone), message(text, kind), poi(poi, zone) }
 *   });
 *   await zones.enter('brindlewick', 'default', { via: 'load', cover: false });
 *   …each frame: zones.update(dt, x, z);
 */
import { defineZone, portalAt, portalNear, portalOpen, inHub, spawnPoint, zoneGraph, validateZones } from './zone.js';
import { enterZone, reachHub, mark, restAt } from './state.js';
import { arrivalAt, hubById, respawnPoint, waystones, canTravel } from './hub.js';
import { ZoneTransition } from './transition.js';

const idle = (fn) => (globalThis.requestIdleCallback ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 60));

export class ZoneManager {
  constructor({ game, zones, save, host, adapter, on = {}, preloadReach = 40, poiReach = 14 }) {
    this.game = game;
    this.zones = zones.map(defineZone);
    const problems = validateZones(this.zones);
    if (problems.length) console.warn(`[zones] ${game}:\n  ${problems.join('\n  ')}`);
    this.byId = new Map(this.zones.map((z) => [z.id, z]));
    this.save = save;
    this.adapter = adapter;
    this.on = on;
    this.transition = new ZoneTransition(host);
    this.current = null;
    this.busy = false;
    this.armed = false;
    this.inHub = false;
    this.preloaded = new Set();
    this.preloadReach = preloadReach;
    this.poiReach = poiReach;
    this.lastDoor = null;
    this.trips = [];
  }

  zone(id) {
    return this.byId.get(id) ?? null;
  }

  get hub() {
    return this.current?.hub ?? null;
  }

  /** The World view's data: every zone, which you've been to, where you are, how the doors join them. */
  world() {
    const g = zoneGraph(this.zones);
    for (const n of g.nodes) {
      n.visited = this.save.visited.includes(n.id);
      n.current = n.id === this.current?.id;
      n.waystone = Boolean(this.zone(n.id)?.hub && this.save.hubs.includes(this.zone(n.id).hub.id));
    }
    return g;
  }

  /** The waystone network as menu rows. */
  waystones() {
    return waystones(this.zones, this.save, this.inHub ? this.hub?.id : null);
  }

  /** Is (x, z) in the current zone's hub? */
  safeAt(x, z) {
    return inHub(this.current, x, z);
  }

  /* ------------------------------------------------------------ the frame */

  /** Each frame in play, with the player's feet. */
  update(dt, x, z) {
    const zone = this.current;
    if (!zone || this.busy) return;
    // The hub: the Safe label, and a first visit lights its waystone.
    const safe = inHub(zone, x, z);
    if (safe !== this.inHub) {
      this.inHub = safe;
      if (safe && reachHub(this.save, zone.hub.id)) {
        this.on.message?.(`${zone.hub.name}: its waystone wakes.`, 'hub');
        this.adapter.persist?.();
      }
      this.on.hub?.(safe, zone);
    }
    // Places found.
    for (const p of zone.pois) {
      if (Math.hypot(p.x - x, p.z - z) < (p.r ?? this.poiReach) && mark(this.save, zone.id, 'pois', p.id)) this.on.poi?.(p, zone);
    }
    // Doors: preload what's beyond the near one; step in to go (once you've stepped out of the one you came by).
    const near = portalNear(zone, x, z, this.preloadReach);
    if (near && !near.portal.soon) this.prefetch(near.portal.to);
    const p = portalAt(zone, x, z);
    if (!p) {
      this.armed = true;
      this.lastDoor = null;
      return;
    }
    if (!this.armed) return;
    const gate = portalOpen(p, this.save.flags);
    if (!gate.open) {
      if (this.lastDoor !== p.id) this.on.message?.(`${p.name ?? 'This way'}: ${gate.why}.`, 'locked');
      this.lastDoor = p.id;
      return;
    }
    this.travel(p.to, p.arrive, { via: 'portal', portal: p });
  }

  /** Warm the next zone's caches in idle time (once per zone). */
  prefetch(id) {
    if (this.preloaded.has(id) || !this.adapter.preload) return;
    const z = this.zone(id);
    if (!z || z.stub) return;
    this.preloaded.add(id);
    idle(() => {
      try {
        Promise.resolve(this.adapter.preload(z)).catch(() => this.preloaded.delete(id));
      } catch {
        this.preloaded.delete(id);
      }
    });
  }

  /* ------------------------------------------------------------ trips */

  /** The first zone, at load (no swirl unless asked). */
  async enter(id, arrive = 'default', { via = 'load', cover = false } = {}) {
    return this.travel(id, arrive, { via, cover });
  }

  /**
   * Go to zone `id`, arriving at spawn `arrive` (a name or { x, z, yaw }).
   * Resolves with { ms } once the new zone shows. A trip already under way wins.
   */
  async travel(id, arrive = 'default', { via = 'portal', cover = true, portal = null } = {}) {
    const zone = this.zone(id);
    if (!zone || zone.stub || this.busy) return null;
    this.busy = true;
    const t0 = performance.now();
    const from = this.current;
    this.on.leave?.(zone, via);
    try {
      if (cover) await this.transition.cover({ name: zone.name, sub: zone.sub ?? '', theme: zone.theme, via });
      const tCovered = performance.now();
      if (from) await this.adapter.unload(from, zone);
      this.current = null;
      const at = spawnPoint(zone, arrive);
      await this.adapter.load(zone, at, (label, k) => this.transition.progress(label, k), { from, via, portal });
      this.current = zone;
      enterZone(this.save, zone.id);
      this.inHub = inHub(zone, at.x, at.z);
      if (this.inHub) reachHub(this.save, zone.hub.id);
      this.armed = !zone.portals.some((p) => Math.hypot(p.x - at.x, p.z - at.z) < 30);
      this.lastDoor = null;
      this.preloaded.delete(zone.id);
      this.adapter.persist?.();
      this.on.enter?.(zone, via, from);
      this.on.hub?.(this.inHub, zone);
      const tBuilt = performance.now();
      if (cover) await this.transition.reveal();
      this.on.arrive?.(zone, via);
      const trip = { from: from?.id ?? null, to: zone.id, via, ms: Math.round(performance.now() - t0), coverMs: Math.round(tCovered - t0), buildMs: Math.round(tBuilt - tCovered) };
      this.trips.push(trip);
      if (this.trips.length > 20) this.trips.shift();
      return trip;
    } catch (err) {
      console.error('[zones] trip failed', err);
      this.transition.dispose();
      this.on.arrive?.(this.current ?? zone, via);
      throw err;
    } finally {
      this.busy = false;
    }
  }

  /** Fast travel to a hub you've reached, from the one you stand at. */
  async fastTravel(hubId) {
    const here = this.inHub ? this.hub?.id : null;
    if (!canTravel(this.save, here, hubId)) return null;
    const found = hubById(this.zones, hubId);
    if (!found) return null;
    const at = arrivalAt(found.zone);
    if (found.zone === this.current) {
      // Same zone: a short swirl, no rebuild.
      this.busy = true;
      this.on.leave?.(found.zone, 'waystone');
      try {
        await this.transition.cover({ name: found.hub.name, sub: found.zone.name, theme: found.zone.theme, via: 'waystone' });
        this.adapter.teleport(at);
        this.inHub = inHub(this.current, at.x, at.z);
        await this.transition.reveal();
        this.on.arrive?.(found.zone, 'waystone');
      } finally {
        this.busy = false;
      }
      return { ms: 0, to: found.zone.id };
    }
    return this.travel(found.zone.id, at, { via: 'waystone' });
  }

  /** Rested at the hub here: healed (the game's part), and it's where you'll wake. */
  rest() {
    if (!this.hub) return;
    restAt(this.save, this.hub.id);
    this.adapter.persist?.();
  }

  /** Fallen: wake at the last hub rested at (another zone if need be). */
  async respawn() {
    const r = respawnPoint(this.zones, this.save);
    if (r.zone === this.current?.id) {
      this.adapter.teleport(r);
      this.inHub = inHub(this.current, r.x, r.z);
      this.on.hub?.(this.inHub, this.current);
      return { zone: r.zone, same: true };
    }
    await this.travel(r.zone, r, { via: 'respawn' });
    return { zone: r.zone, same: false };
  }

  dispose() {
    this.transition.dispose();
  }
}
