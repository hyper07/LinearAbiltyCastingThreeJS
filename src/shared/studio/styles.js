/**
 * The Studio's style choices as the maker sees them: names, one-line blurbs, what each is good
 * for, and which pairings read best. Pure data (the Studio page and docs read it); the runtime
 * turns the ids into pixels (runtime.js, looks.js, animate.js).
 */
export const RENDER_OPTIONS = [
  { id: 'flat2d', name: 'Full 2D', icon: '🟦', blurb: 'Top-down sprites on a painted map — classic adventure games.', suggests: { animation: 'pixel', look: 'stylized' } },
  { id: 'full3d', name: 'Full 3D', icon: '🧊', blurb: '3D characters in a 3D world, with a follow camera you can turn (drag).', suggests: { animation: 'plush', look: 'cartoon' } },
  { id: 'hd2d', name: '2D characters, 3D world', icon: '🏮', blurb: 'HD-2D: sprite characters standing in a lit 3D diorama (like Lanternwood).', suggests: { animation: 'pixel', look: 'stylized' } },
  { id: 'painted', name: '3D characters, 2D backdrop', icon: '🎨', blurb: 'Side view: 3D characters in front of a painted, layered parallax background.', suggests: { animation: 'toon', look: 'cartoon' } }
];

export const ANIMATION_OPTIONS = [
  { id: 'pixel', name: 'Pixel, frame by frame', icon: '👾', blurb: 'A few hand-made poses flipped at 8 frames a second; crisp, no blending.' },
  { id: 'skeletal', name: 'Smooth', icon: '🦴', blurb: 'Limbs swing smoothly every frame, like a rigged character with blended clips.' },
  { id: 'toon', name: 'Toon', icon: '💥', blurb: 'Stepped at 12 frames a second with squash and stretch — snappy and springy.' },
  { id: 'plush', name: 'Plush bouncy', icon: '🧸', blurb: 'Soft toys that hop, wobble and squish (ears and tails on springs).' }
];

export const LOOK_OPTIONS = [
  { id: 'realistic', name: 'Realistic', icon: '📷', blurb: 'Physically based materials, ambient occlusion and soft shadows.' },
  { id: 'stylized', name: 'Stylized', icon: '🖌️', blurb: 'Clean shapes and rich colours, gentle light — a painterly middle ground.' },
  { id: 'cartoon', name: 'Cartoon / plush', icon: '🍭', blurb: 'Toon shading in bands with ink outlines; soft toy materials.' }
];

export const PALETTE_OPTIONS = ['bright', 'pastel', 'earthy', 'moody', 'neon'];

export const optionById = (list, id) => list.find((o) => o.id === id) ?? list[0];
