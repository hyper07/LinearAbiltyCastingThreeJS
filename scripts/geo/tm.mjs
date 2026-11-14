/**
 * EPSG:5186 (Korea 2000 / Central Belt 2010) ↔ longitude and latitude on
 * GRS80: a transverse Mercator with its origin at 127°E 38°N, scale 1,
 * false easting 200,000 m and false northing 600,000 m. Series to the usual
 * terms; good to well under a metre across Seoul.
 */
const a = 6378137;
const f = 1 / 298.257222101;
const e2 = f * (2 - f);
const ep2 = e2 / (1 - e2);
const LON0 = (127 * Math.PI) / 180;
const LAT0 = (38 * Math.PI) / 180;
const FE = 200000;
const FN = 600000;
const meridian = (lat) => a * ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * lat - ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * lat) + ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * lat) - ((35 * e2 ** 3) / 3072) * Math.sin(6 * lat));
const M0 = meridian(LAT0);

/** Grid metres (east, north) → [longitude, latitude] in degrees. */
export function toLonLat(x, y) {
  const M = M0 + (y - FN);
  const mu = M / (a * (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const lat1 = mu + ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) + ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) + ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) + ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
  const s = Math.sin(lat1);
  const c = Math.cos(lat1);
  const t = Math.tan(lat1);
  const C1 = ep2 * c * c;
  const T1 = t * t;
  const N1 = a / Math.sqrt(1 - e2 * s * s);
  const R1 = (a * (1 - e2)) / (1 - e2 * s * s) ** 1.5;
  const D = (x - FE) / N1;
  const lat = lat1 - ((N1 * t) / R1) * (D ** 2 / 2 - ((5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * ep2) * D ** 4) / 24 + ((61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * ep2 - 3 * C1 ** 2) * D ** 6) / 720);
  const lon = LON0 + (D - ((1 + 2 * T1 + C1) * D ** 3) / 6 + ((5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * ep2 + 24 * T1 ** 2) * D ** 5) / 120) / c;
  return [(lon * 180) / Math.PI, (lat * 180) / Math.PI];
}

/** [longitude, latitude] in degrees → grid metres [east, north]. */
export function toGrid(lon, lat) {
  const p = (lat * Math.PI) / 180;
  const l = (lon * Math.PI) / 180;
  const s = Math.sin(p);
  const c = Math.cos(p);
  const t = Math.tan(p);
  const N = a / Math.sqrt(1 - e2 * s * s);
  const T = t * t;
  const C = ep2 * c * c;
  const A = (l - LON0) * c;
  const M = meridian(p);
  const x = FE + N * (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5) / 120);
  const y = FN + (M - M0 + N * t * (A ** 2 / 2 + ((5 - T + 9 * C + 4 * C ** 2) * A ** 4) / 24 + ((61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6) / 720));
  return [x, y];
}
