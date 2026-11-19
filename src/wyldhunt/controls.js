/**
 * Wyldhunt's controls: the one table the key handler reads, the HUD hint
 * shows and the How to play panel lists (shared/helpPanel.js). Items on
 * 5–8 (numbers, never Q or E), the camera on , . [ ] /, the map on O.
 */
export const CONTROLS = {
  title: 'How to play — Wyldhunt',
  goal: 'Hunt the Gnarlhorn in Mistfall Gorge: read its tracks, gather herbs, ore and bugs, ride Burrow up the gorge with your companions, then break its parts and carve your trophies. Lantern Camp is home.',
  groups: [
    { name: 'Move', rows: [
      { id: 'move', keys: ['W', 'A', 'S', 'D'], codes: ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'], does: 'Move (riding: W faster, S slower, A D steer)', short: 'move', hint: true },
      { id: 'sprint', keys: ['Shift'], codes: ['ShiftLeft', 'ShiftRight'], does: 'Sprint (riding: gallop)', short: 'sprint' },
      { id: 'dodge', keys: ['Space'], codes: ['Space'], does: 'Dodge roll (riding: jump)', short: 'dodge', hint: true },
      { id: 'autorun', keys: ['R (hold)'], codes: ['KeyR'], does: 'Riding: let Burrow run the path' }
    ] },
    { name: 'Camera', rows: [
      { id: 'camTurn', keys: [',', '.'], codes: ['Comma', 'Period'], does: 'Turn the camera left / right (hold)', short: 'turn', hint: true, pad: 'Right stick' },
      { id: 'camTilt', keys: ['[', ']'], codes: ['BracketLeft', 'BracketRight'], does: 'Tilt the camera down / up (hold)', pad: 'Right stick' },
      { id: 'camBehind', keys: ['/'], codes: ['Slash'], does: 'Camera behind you now (it also eases back by itself after a quiet spell)', short: 'behind you', pad: 'Right-stick click' },
      { id: 'mouseLook', keys: ['V'], codes: ['KeyV'], does: 'Mouse-look; or drag with the middle button; wheel zooms' }
    ] },
    { name: 'Combat', rows: [
      { id: 'light', keys: ['LMB'], codes: [], does: 'Light attack (bow: shoot)', short: 'light', hint: true },
      { id: 'heavy', keys: ['RMB'], codes: [], does: 'Heavy attack — hold to charge (bow: aim)', short: 'heavy', hint: true },
      { id: 'weapon', keys: ['Tab'], codes: ['Tab'], does: 'Greatblade ↔ bow', short: 'weapon', hint: true },
      { id: 'sheathe', keys: ['F'], codes: ['KeyF'], does: 'Sheathe or draw' }
    ] },
    { name: 'Items', rows: [
      { id: 'items', keys: ['5', '6', '7', '8'], codes: ['Digit5', 'Digit6', 'Digit7', 'Digit8'], does: 'Use the items on the bar: draught, greater draught, whetstone, ration', short: 'items', hint: true },
      { id: 'bag', keys: ['I', 'B'], codes: ['KeyI', 'KeyB'], does: 'Field bag', short: 'bag' }
    ] },
    { name: 'Menus', rows: [
      { id: 'interact', keys: ['E'], codes: ['KeyE'], does: 'Gather · carve · mount and dismount', short: 'gather · mount', hint: true },
      { id: 'whistle', keys: ['X'], codes: ['KeyX'], does: 'Whistle for Burrow' },
      { id: 'help', keys: ['H'], codes: ['KeyH'], does: 'How to play (this)', short: 'help', hint: true },
      { id: 'pause', keys: ['Esc'], codes: ['Escape'], does: 'Pause: Graphics, Camera, Map, sound, leave', short: 'menu' }
    ] },
    { name: 'Map', rows: [
      { id: 'map', keys: ['O'], codes: ['KeyO'], does: 'Full map — the camp, nodes, your party, the beast when tracked; click for a waypoint', short: 'map', hint: true }
    ] }
  ]
};
