/**
 * Gloamreach's controls: the one table the key handler reads, the HUD hint
 * shows (rows marked `hint`) and the How to play panel lists (shared/helpPanel.js).
 * Skills on 1–4, potions on 5–6 (never Q or E), the camera on , . [ ] /, the map on O.
 */
export const CONTROLS = {
  title: 'How to play — Gloamreach',
  goal: 'Explore Brindlewick, the Warden\'s Gate and the violet Gloamwood. Fight what prowls there with your hero\'s skills, open chests, wear what you find (it shows), and trade at the armsmonger\'s stall. The drake waits on Emberfall Ledge.',
  groups: [
    { name: 'Move', rows: [
      { id: 'move', keys: ['W', 'A', 'S', 'D'], codes: ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'], does: 'Move (or the arrow keys)', short: 'move', hint: true },
      { id: 'sprint', keys: ['Shift'], codes: ['ShiftLeft', 'ShiftRight'], does: 'Sprint', short: 'sprint', hint: true },
      { id: 'walk', keys: ['Ctrl'], codes: ['ControlLeft', 'ControlRight'], does: 'Walk slowly' },
      { id: 'jump', keys: ['Space'], codes: ['Space'], does: 'Jump', short: 'jump', hint: true }
    ] },
    { name: 'Camera', rows: [
      { id: 'camTurn', keys: [',', '.'], codes: ['Comma', 'Period'], does: 'Turn the camera left / right (hold)', short: 'turn', hint: true, pad: 'Right stick' },
      { id: 'camTilt', keys: ['[', ']'], codes: ['BracketLeft', 'BracketRight'], does: 'Tilt the camera down / up (hold)', pad: 'Right stick' },
      { id: 'camBehind', keys: ['/'], codes: ['Slash'], does: 'Camera behind you now (it also eases back by itself after a quiet spell)', short: 'behind you', hint: true, pad: 'Right-stick click' },
      { id: 'camDrag', keys: ['Middle drag'], codes: [], does: 'Turn the camera with the mouse; wheel zooms' },
      { id: 'mouseLook', keys: ['V'], codes: ['KeyV'], does: 'Mouse-look (aim at the screen\'s centre)', short: 'mouse-look', hint: true }
    ] },
    { name: 'Skills', rows: [
      { id: 'basic', keys: ['LMB'], codes: [], does: 'Basic attack (aims at the pointer)', short: 'attack', hint: true },
      { id: 'second', keys: ['RMB'], codes: [], does: 'Second skill (block, aimed shot or ward, by hero)' },
      { id: 'skills', keys: ['1', '2', '3', '4'], codes: ['Digit1', 'Digit2', 'Digit3', 'Digit4'], does: 'Skills on the bar', short: 'skills', hint: true }
    ] },
    { name: 'Items', rows: [
      { id: 'hpPotion', keys: ['5'], codes: ['Digit5'], does: 'Drink a healing draught', short: 'heal', hint: true },
      { id: 'mpPotion', keys: ['6'], codes: ['Digit6'], does: 'Drink a mana tonic (mana, energy or stamina)', short: 'tonic', hint: true }
    ] },
    { name: 'Menus', rows: [
      { id: 'interact', keys: ['F'], codes: ['KeyF'], does: 'Open a chest · trade with the armsmonger', short: 'open · trade', hint: true },
      { id: 'bag', keys: ['I', 'B'], codes: ['KeyI', 'KeyB'], does: 'Bag and gear', short: 'bag', hint: true },
      { id: 'hero', keys: ['C'], codes: ['KeyC'], does: 'Your hero (stats and what you wear)', short: 'hero', hint: true },
      { id: 'help', keys: ['H'], codes: ['KeyH'], does: 'How to play (this)', short: 'help', hint: true },
      { id: 'pause', keys: ['Esc'], codes: ['Escape'], does: 'Pause: Graphics, Camera, Map, sound, leave', short: 'menu', hint: true }
    ] },
    { name: 'Map', rows: [
      { id: 'map', keys: ['O'], codes: ['KeyO'], does: 'Full map — click to set a waypoint (or the 🗺 on the minimap)', short: 'map', hint: true }
    ] }
  ]
};
