/**
 * The mountains of Snowpuff Peaks, as data. One is loaded at a time; each is
 * its own course, built from this record by course.js (deterministic: the
 * same seed makes the same course on every player's machine). Adding a
 * mountain = adding a record here (and, if it wants new music, a track id).
 *
 * Units: metres and seconds. Slopes in degrees.
 */

export const MOUNTAINS = [
  {
    id: 'marshmallow',
    name: 'Marshmallow Hill',
    blurb: 'Wide, gentle runs in the sunshine, a resort village at the bottom — fences, flags and little jumps.',
    difficulty: 1,
    seed: 1307,
    length: 1320,
    width: [17, 21], // half-width of the groomed run: min, max
    slope: [12, 17], // degrees: easy
    curve: 0.6, // how much the run winds (0–1)
    turns: { radius: [105, 160], angle: [0.45, 0.85], straight: [45, 85], berm: 0.25 }, // wide sweeping curves
    rollers: 0.14,
    rivals: 3,
    time: 'noon',
    music: 'meadow',
    kickers: { count: 7, size: [0.9, 1.5] },
    obstacles: { per100: 2.2, kinds: { hay: 3, snowman: 3, fence: 2, log: 1, rock: 0.5 } },
    gates: 1, // slalom gate runs
    lifts: [
      { at: 0.18, kind: 'cross', angle: 0.35 },
      { at: 0.45, kind: 'along', side: 1, span: 0.22 },
      { at: 0.72, kind: 'cross', angle: -0.25 },
      { at: 0.92, kind: 'along', side: -1, span: 0.1 }
    ],
    ice: [],
    trees: { density: 0.55, near: 0.35 },
    lanterns: false,
    village: true,
    fence: { colour: '#2f7fe0', alt: '#f6a23a' },
    grade: { saturation: 1.08, warm: [1.02, 1.0, 0.97], cool: [0.95, 0.99, 1.06], vignette: 0.18, exposure: 0.92 },
    palette: { sky: ['#5aa2ff', '#a8d4ff', '#e8f4ff'], fog: '#cfe4fb', sun: '#fff4e2', sunI: 3.2, sunAlt: 52, sunAz: 35, hemi: ['#bcd8ff', '#ffffff'], envI: 0.9 }
  },
  {
    id: 'pinecone',
    name: 'Pinecone Ridge',
    blurb: 'A golden-hour slalom through the pines — chairlifts overhead, bigger jumps and a frozen creek with slippery ice.',
    difficulty: 2,
    seed: 2903,
    length: 1460,
    width: [13, 17],
    slope: [14, 21],
    curve: 0.85,
    turns: { radius: [68, 105], angle: [0.55, 1.0], straight: [30, 60], berm: 0.45 }, // S-bends through the pines
    rollers: 0.18,
    rivals: 4,
    time: 'sunset',
    music: 'lantern-valley',
    kickers: { count: 9, size: [1.2, 2.1] },
    obstacles: { per100: 2.8, kinds: { log: 3, rock: 2, snowman: 2, hay: 1, fence: 1 } },
    gates: 3,
    lifts: [
      { at: 0.12, kind: 'cross', angle: 0.2 },
      { at: 0.3, kind: 'along', side: 1, span: 0.18 },
      { at: 0.52, kind: 'cross', angle: -0.4 },
      { at: 0.68, kind: 'along', side: -1, span: 0.16 },
      { at: 0.86, kind: 'cross', angle: 0.3 }
    ],
    ice: [{ at: 0.58, span: 70 }],
    trees: { density: 1.0, near: 0.8 },
    lanterns: false,
    village: false,
    fence: { colour: '#e0503a', alt: '#ffd166' },
    grade: { saturation: 1.06, warm: [1.04, 1.0, 0.95], cool: [0.93, 0.97, 1.07], vignette: 0.22, exposure: 1.0 },
    palette: { sky: ['#5a6cb8', '#f4b48a', '#ffe0bc'], fog: '#efd2c0', sun: '#ffc690', sunI: 3.0, sunAlt: 16, sunAz: -38, hemi: ['#b4c0f0', '#ffe8d4'], envI: 0.75 }
  },
  {
    id: 'aurora',
    name: 'Aurora Peak',
    blurb: 'Night on the high peak: aurora overhead, warm lanterns down the run, steep drops, big kickers and narrow gaps.',
    difficulty: 3,
    seed: 4111,
    length: 1600,
    width: [10, 14],
    slope: [17, 25],
    curve: 0.75,
    turns: { radius: [46, 72], angle: [0.6, 1.15], straight: [26, 50], berm: 0.55 }, // tight and steep
    rollers: 0.2,
    rivals: 5,
    time: 'night',
    music: 'night-forest',
    kickers: { count: 11, size: [1.6, 2.6] },
    obstacles: { per100: 3.4, kinds: { rock: 3, fence: 2, snowman: 2, log: 2, hay: 1 } },
    gates: 2,
    lifts: [
      { at: 0.2, kind: 'along', side: -1, span: 0.2 },
      { at: 0.48, kind: 'cross', angle: 0.3 },
      { at: 0.78, kind: 'cross', angle: -0.2 }
    ],
    ice: [{ at: 0.35, span: 40 }, { at: 0.82, span: 45 }],
    trees: { density: 0.7, near: 0.5 },
    lanterns: true,
    village: false,
    fence: { colour: '#7a5cff', alt: '#ffb84a' },
    grade: { saturation: 1.1, warm: [1.03, 0.99, 0.94], cool: [0.9, 0.96, 1.12], vignette: 0.3, exposure: 1.1 },
    palette: { sky: ['#060b24', '#14245a', '#2a3f7a'], fog: '#1b2a5c', sun: '#b8c8ff', sunI: 0.9, sunAlt: 38, sunAz: 140, hemi: ['#4a62b8', '#1a2450'], envI: 0.55 }
  }
];

export const mountainById = (id) => MOUNTAINS.find((m) => m.id === id) ?? MOUNTAINS[0];
