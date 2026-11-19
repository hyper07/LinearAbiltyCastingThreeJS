/**
 * Lanternwood's controls: the one table the key hints along the bottom, the
 * pause window and How to play are built from (shared/helpPanel.js). Skills
 * 1–4, potions and food 5–7 — the pattern the other games follow.
 */
export const CONTROLS = {
  title: 'How to play — Lanternwood',
  goal: 'Keep the lanterns of Lanternwood burning: talk to the people of the camp, take on their tasks, fight what comes out of the dark with your class\'s skills, open the chests, and travel the realms beyond by the waystones — alone or with friends.',
  groups: [
    { name: 'Move', rows: [
      { id: 'move', keys: ['W', 'A', 'S', 'D'], codes: ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'], does: 'Move (or the arrow keys)' },
      { id: 'roll', keys: ['Shift'], codes: ['ShiftLeft', 'ShiftRight'], does: 'Roll', short: 'Roll', hint: true }
    ] },
    { name: 'Camera', rows: [
      { id: 'camTurn', keys: ['Q', 'E', ',', '.'], codes: ['KeyQ', 'KeyE', 'Comma', 'Period'], does: 'Turn the camera left / right (hold); or drag', short: 'Turn', hint: true, pad: 'Right stick' },
      { id: 'camBehind', keys: ['/'], codes: ['Slash'], does: 'Camera behind you now (it also eases back by itself after a quiet spell)', short: 'Behind you', hint: true, pad: 'Right-stick click' }
    ] },
    { name: 'Skills', rows: [
      { id: 'basic', keys: ['Space', 'LMB'], codes: ['Space'], does: 'Attack (click aims at the pointer)', short: 'Attack', hint: true },
      { id: 'skills', keys: ['1', '2', '3', '4'], codes: ['Digit1', 'Digit2', 'Digit3', 'Digit4'], does: 'Your class\'s skills', short: 'Skills', hint: true }
    ] },
    { name: 'Items', rows: [
      { id: 'hpPotion', keys: ['5'], codes: ['Digit5'], does: 'Healing potion' },
      { id: 'mpPotion', keys: ['6'], codes: ['Digit6'], does: 'Mana potion' },
      { id: 'eat', keys: ['7'], codes: ['Digit7'], does: 'Eat (heals over time)' },
      { id: 'bag', keys: ['I', 'B'], codes: ['KeyI', 'KeyB'], does: 'Bag and equipment', short: 'Bag', hint: true }
    ] },
    { name: 'Menus', rows: [
      { id: 'talk', keys: ['F'], codes: ['KeyF'], does: 'Talk · open · use', short: 'Talk', hint: true },
      { id: 'hero', keys: ['C'], codes: ['KeyC'], does: 'Your hero', short: 'Hero', hint: true },
      { id: 'journal', keys: ['J'], codes: ['KeyJ'], does: 'Journal: tasks', short: 'Journal', hint: true },
      { id: 'party', keys: ['P'], codes: ['KeyP'], does: 'Party: play with friends', short: 'Party', hint: true },
      { id: 'help', keys: ['H'], codes: ['KeyH'], does: 'How to play (this)', short: 'Help', hint: true },
      { id: 'pause', keys: ['Esc'], codes: ['Escape'], does: 'Pause: Graphics, Camera, Map, save, leave', short: 'Pause', hint: true }
    ] },
    { name: 'Map', rows: [
      { id: 'map', keys: ['O', 'M'], codes: ['KeyO', 'KeyM'], does: 'The realm map and the waystones', short: 'Map', hint: true }
    ] }
  ]
};
