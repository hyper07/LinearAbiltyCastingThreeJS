/**
 * Kithvale's controls: the one table the key handler reads, the HUD hint
 * shows and the How to play panel lists (shared/helpPanel.js). Treats on
 * 5–7 (numbers for items), the camera on , . [ ] /, the map on O.
 */
export const CONTROLS = {
  title: 'How to play — Kithvale',
  goal: 'Befriend the creatures of the vale. Creep close, toss them the treat they like, then breathe with them until they trust you — and they\'ll follow you (three at a time) and lend you their gifts. Light the stone lanterns and find what\'s buried. Lanternrest and the shrine on the hill are hubs: map board, notices, a stash for treats and keepsakes, the journal, the shop, rest and a waystone; the big gate joins the village to the vale.',
  groups: [
    { name: 'Move', rows: [
      { id: 'move', keys: ['W', 'A', 'S', 'D'], codes: ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'], does: 'Move (or the arrow keys)', short: 'move', hint: true, touch: 'Left stick' },
      { id: 'run', keys: ['Shift'], codes: ['ShiftLeft', 'ShiftRight'], does: 'Run faster', short: 'run' },
      { id: 'jump', keys: ['Space'], codes: ['Space'], does: 'Jump', short: 'jump', touch: '⤒' },
      { id: 'sneak', keys: ['Ctrl', 'C'], codes: ['ControlLeft', 'ControlRight', 'KeyC'], does: 'Creep quietly (hold Ctrl, or C to toggle)', short: 'creep', hint: true, touch: '🐾' }
    ] },
    { name: 'Camera', rows: [
      { id: 'camTurn', keys: [',', '.'], codes: ['Comma', 'Period'], does: 'Turn the camera left / right (hold)', short: 'turn', hint: true, pad: 'Right stick', touch: 'Drag' },
      { id: 'camTilt', keys: ['[', ']'], codes: ['BracketLeft', 'BracketRight'], does: 'Tilt the camera down / up (hold)', pad: 'Right stick' },
      { id: 'camBehind', keys: ['/'], codes: ['Slash'], does: 'Camera behind you now (it also eases back by itself after a quiet spell)', short: 'behind you', pad: 'Right-stick click', touch: '⟲' },
      { id: 'mouseLook', keys: ['V'], codes: ['KeyV'], does: 'Mouse-look; or drag; wheel zooms' }
    ] },
    { name: 'Treats', rows: [
      { id: 'treats', keys: ['5', '6', '7'], codes: ['Digit5', 'Digit6', 'Digit7'], does: 'Pick a treat: berries, seeds, crystals', short: 'treats', hint: true, touch: 'Tap a treat' },
      { id: 'toss', keys: ['Q'], codes: ['KeyQ'], does: 'Toss the treat (or right-click)', short: 'toss', hint: true, touch: '➶' }
    ] },
    { name: 'Menus', rows: [
      { id: 'interact', keys: ['E'], codes: ['KeyE'], does: 'Talk · gather · breathe with a creature · in a hub: map, notices, stash, journal, shop, rest, waystone', short: 'talk · befriend', hint: true, touch: '✋' },
      { id: 'journal', keys: ['J'], codes: ['KeyJ'], does: 'Journal: your friends and who follows', short: 'journal', touch: '📖' },
      { id: 'help', keys: ['H', 'I'], codes: ['KeyH', 'KeyI'], does: 'How to play (this)', short: 'help', hint: true },
      { id: 'pause', keys: ['Esc'], codes: ['Escape'], does: 'Pause: Graphics, Camera, Map, day cycle, sound', short: 'menu', hint: true, touch: '☰' }
    ] },
    { name: 'Map', rows: [
      { id: 'map', keys: ['O'], codes: ['KeyO'], does: 'Full map — places, friends, creatures; click for a waypoint', short: 'map', hint: true, touch: '🗺' }
    ] }
  ]
};
