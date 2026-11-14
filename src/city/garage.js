/**
 * Gangnam Drift's garage: five cars of our own to choose from. They share
 * the one licensed body (Car Concept, CC BY 4.0) but not much else — each
 * has its own stance and proportions, its own parts (a wing, a scoop, skirts,
 * bigger wheels) and above all its own handling: some fast, some quick off
 * the line, some planted, one that loves to slide.
 *
 * `spec` changes the race handling (drive.js RACE); `look` how it is built
 * (cars.js makeCar); `paints` the colours it comes in.
 */
export const GARAGE = {
  solenne: {
    name: 'Solenne GT',
    kind: 'Grand tourer',
    text: 'Fast and steady: the easy one to drive well.',
    spec: { top: 62, accel: 12, grip: 7.2, slideGrip: 1.2 },
    look: { scale: [1, 1, 1.04], spoiler: 'lip', wheels: 1 },
    paints: ['#f1ece2', '#c9a64a', '#1b2b4a', '#6b0f1a']
  },
  noctis: {
    name: 'Noctis R',
    kind: 'Drift build',
    text: 'Loose at the back, a big wing, boost fills fastest — made to slide.',
    spec: { top: 58, accel: 13, grip: 5.4, slideGrip: 0.85, steer: 0.68 },
    look: { scale: [1.06, 0.94, 0.98], spoiler: 'wing', skirts: true, wheels: 1.06 },
    drift: 1.5,
    paints: ['#141518', '#e0e0e0', '#ff3d6e', '#29e0c8']
  },
  hanbit: {
    name: 'Hanbit Speedster',
    kind: 'Top speed',
    text: 'The longest legs: slow to get going, then the fastest thing on the road.',
    spec: { top: 70, accel: 10.8, grip: 6.6, slideGrip: 1.1, boostTop: 16 },
    look: { scale: [0.98, 0.9, 1.12], spoiler: 'ducktail', wheels: 1 },
    paints: ['#e8e8e6', '#0f3d8a', '#d8a020', '#2a2d33']
  },
  arden: {
    name: 'Arden Coupe',
    kind: 'Nimble',
    text: 'Short and sharp: quickest off the line, turns on a coin.',
    spec: { top: 57, accel: 14.5, grip: 7, slideGrip: 1.1, steer: 0.72, wheelbase: 2.5 },
    look: { scale: [0.96, 1, 0.9], spoiler: 'lip', scoop: true, wheels: 0.96 },
    paints: ['#d4202a', '#f4f4f2', '#3a8a3e', '#1a1a1a']
  },
  volta: {
    name: 'Volta EV',
    kind: 'Electric',
    text: 'All its pull at once and planted: silent, heavy, hard to unsettle.',
    spec: { top: 60, accel: 16.5, grip: 7.8, slideGrip: 1.4, boostAccel: 8 },
    look: { scale: [1.02, 1.04, 1.02], spoiler: 'none', wheels: 1.02, glow: '#4ad8ff' },
    electric: true,
    paints: ['#eef2f5', '#5a6370', '#1e4a7a', '#7a5ab0']
  }
};
export const GARAGE_ORDER = ['solenne', 'noctis', 'hanbit', 'arden', 'volta'];

/** A car's numbers on a 0–1 scale, for the bars in the menu. */
export function ratings(id) {
  const s = GARAGE[id].spec;
  return {
    speed: (s.top - 54) / 18,
    pickup: (s.accel - 10) / 7,
    grip: (s.grip - 5) / 3,
    drift: (1.5 - (s.slideGrip ?? 1.1)) / 0.7
  };
}
