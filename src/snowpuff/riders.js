/**
 * The riders of Snowpuff Peaks: original plush animals, one dominant colour
 * and one bold accent each, so the cast reads at a glance — even from
 * behind, at speed. Pure data; the sculpted models are render/riderModel.js.
 */

export const SPECIES = {
  fox: {
    name: 'Pip', animal: 'fox', color: '#ff8a3d', light: '#fff1dc', dark: '#5a3424', accent: '#2ec4d6', board: '#ffffff', boardTrim: '#2ec4d6',
    blurb: 'A round, fuzzy orange fox with a huge fluffy tail and sky-teal goggles. Loves big air.',
    accentName: 'Teal goggles', selectable: true
  },
  bear: {
    name: 'Toffee', animal: 'bear', color: '#a86d3f', light: '#f3dcb8', accent: '#3fd0b0', board: '#2f4a8a', boardTrim: '#ffd166',
    blurb: 'A caramel bear in a long mint scarf that flaps behind him. Steady and strong.',
    accentName: 'Mint scarf', selectable: true
  },
  cat: {
    name: 'Mochi', animal: 'cat', color: '#9aa6bf', light: '#eef1f8', accent: '#ffd23f', board: '#ff5a5f', boardTrim: '#ffffff',
    blurb: 'A blue-grey tabby in a sunny bobble hat. Quick on the turns.',
    accentName: 'Bobble hat', selectable: true
  },
  frog: {
    name: 'Pickle', animal: 'frog', color: '#6fcf4a', light: '#f6f3c4', accent: '#ff7a33', board: '#ffd23f', boardTrim: '#2a7a3a',
    blurb: 'A lime-green frog with a round orange backpack full of snowballs.',
    accentName: 'Snack backpack', selectable: true
  },
  pig: {
    name: 'Peaches', animal: 'pig', color: '#ffb0a0', light: '#ffe8e0', accent: '#3a86ff', board: '#3a86ff', boardTrim: '#ffffff',
    blurb: 'A peachy piglet in big blue goggles.', accentName: 'Blue goggles', selectable: false
  },
  penguin: {
    name: 'Pebble', animal: 'penguin', color: '#36477c', light: '#ffffff', accent: '#ff4b5c', board: '#ffffff', boardTrim: '#ff4b5c',
    blurb: 'A round penguin in a red bobble hat.', accentName: 'Red bobble hat', selectable: false
  }
};

export const SELECTABLE = Object.keys(SPECIES).filter((k) => SPECIES[k].selectable);
export const ALL_SPECIES = Object.keys(SPECIES);

/** A rider's face as a tiny SVG for the HUD (progress strip, standings, podium cards). */
export function faceSvg(species, size = 40) {
  const sp = SPECIES[species] ?? SPECIES.fox;
  const c = sp.color, l = sp.light, a = sp.accent;
  const ears = {
    fox: `<path d="M4 20 L7 1 L19 11Z M36 20 L33 1 L21 11Z" fill="${c}"/><path d="M6.4 9 L7 1 L11.5 5Z M33.6 9 L33 1 L28.5 5Z" fill="${sp.dark}"/><path d="M8 17 L9 7 L15 12Z M32 17 L31 7 L25 12Z" fill="${l}"/>`,
    bear: `<circle cx="9" cy="12" r="6" fill="${c}"/><circle cx="31" cy="12" r="6" fill="${c}"/><circle cx="9" cy="12" r="3" fill="${l}"/><circle cx="31" cy="12" r="3" fill="${l}"/>`,
    cat: `<path d="M5 18 L8 3 L17 12Z M35 18 L32 3 L23 12Z" fill="${c}"/>`,
    frog: `<circle cx="12" cy="13" r="7" fill="${c}"/><circle cx="28" cy="13" r="7" fill="${c}"/>`,
    pig: `<path d="M7 16 L9 6 L16 12Z M33 16 L31 6 L24 12Z" fill="${c}"/>`,
    penguin: ''
  }[sp.animal] ?? '';
  const hat = sp.animal === 'cat' || sp.animal === 'penguin' ? `<path d="M8 16 Q20 1 32 16Z" fill="${a}"/><circle cx="20" cy="5" r="4" fill="${a}" stroke="#fff" stroke-width="1"/>` : '';
  const goggles = sp.animal === 'fox' || sp.animal === 'pig' ? `<rect x="8" y="14" width="24" height="7" rx="3.5" fill="${a}"/><ellipse cx="15" cy="17.5" rx="4" ry="2.6" fill="#fff" opacity=".55"/><ellipse cx="25" cy="17.5" rx="4" ry="2.6" fill="#fff" opacity=".55"/>` : '';
  const scarf = sp.animal === 'bear' ? `<rect x="9" y="33" width="22" height="5" rx="2.5" fill="${a}"/>` : '';
  const snout = sp.animal === 'pig' ? `<ellipse cx="20" cy="28" rx="5" ry="3.6" fill="${l}"/><circle cx="18.3" cy="28" r="1" fill="#7a3a3a"/><circle cx="21.7" cy="28" r="1" fill="#7a3a3a"/>` : sp.animal === 'penguin' ? `<path d="M17 27 L23 27 L20 31Z" fill="#ff9f1c"/>` : sp.animal === 'fox' ? `<path d="M6 24 Q20 40 34 24 Q27 31 20 31 Q13 31 6 24Z" fill="${l}"/><ellipse cx="20" cy="28.5" rx="2.6" ry="1.9" fill="#2a1a14"/>` : `<ellipse cx="20" cy="28" rx="6" ry="4.2" fill="${l}"/>`;
  const eyesY = sp.animal === 'frog' ? 13 : 23;
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true">${ears}<circle cx="20" cy="24" r="14" fill="${c}"/>${sp.animal === 'penguin' ? `<ellipse cx="20" cy="27" rx="9" ry="9" fill="${l}"/>` : ''}${hat}${snout}<circle cx="${sp.animal === 'frog' ? 12 : 14.5}" cy="${eyesY}" r="2.1" fill="#21160f"/><circle cx="${sp.animal === 'frog' ? 28 : 25.5}" cy="${eyesY}" r="2.1" fill="#21160f"/><ellipse cx="11" cy="28" rx="2.6" ry="1.6" fill="#ff8fa8" opacity=".75"/><ellipse cx="29" cy="28" rx="2.6" ry="1.6" fill="#ff8fa8" opacity=".75"/>${goggles}${scarf}</svg>`;
}
