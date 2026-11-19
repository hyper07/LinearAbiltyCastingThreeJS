/**
 * Building only what belongs to a zone. A game's builders place things from
 * lists made for the whole old map; `keepProps` makes a prop library drop
 * every instance outside the zone before it is uploaded, and `areaScale`
 * keeps a scatter's density the same when it samples a smaller area.
 * (The builders filter their own trees, meshes and colliders with `keep`.)
 */

/** Wrap a PropLibrary (gloamreach/props.js) so place() and scatter() only build instances where `keep(x, z)`. */
export function keepProps(props, keep) {
  if (!keep || props._kept) return props;
  for (const k of ['place', 'scatter']) {
    const f = props[k].bind(props);
    props[k] = (id, list, opts) => f(id, list.filter((m) => keep(m.elements[12], m.elements[14])), opts);
  }
  props._kept = true;
  return props;
}

/** How many of `n` samples to draw over `part` so the density matches `n` over `whole` (both {x0,x1,z0,z1}). */
export function areaScale(n, part, whole) {
  const a = (part.x1 - part.x0) * (part.z1 - part.z0);
  const b = (whole.x1 - whole.x0) * (whole.z1 - whole.z0);
  return Math.max(1, Math.round((n * a) / b));
}
