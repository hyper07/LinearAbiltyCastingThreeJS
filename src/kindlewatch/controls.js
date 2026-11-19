/**
 * Kindlewatch's controls: the one table input.js reads, the HUD tags show
 * and How to play lists (shared/helpPanel.js). The summon is a skill (1), the
 * draught an item (5) — numbers, never Q or R.
 */
export const CONTROLS = {
  title: 'How to play — Kindlewatch',
  goal: 'Fight your way up the frozen keep: light the three beacons to raise the Rime Gate, and bring the fire back to the great brazier. Land blows to gather spark for your summon; braziers you light are where you rise again.',
  groups: [
    { name: 'Move', rows: [
      { id: 'move', keys: ['W', 'A', 'S', 'D'], codes: ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'], does: 'Move (or the arrow keys)', pad: 'Left stick', touch: 'Stick under your left thumb' },
      { id: 'aim', keys: ['Mouse'], codes: [], does: 'Aim: blows and throws go where you point', pad: 'Right stick', touch: 'Blows aim at the nearest foe' },
      { id: 'dash', keys: ['Space', 'Shift'], codes: ['Space', 'ShiftLeft'], does: 'Dash — untouchable for a moment', pad: 'A', touch: 'Dash' }
    ] },
    { name: 'Skills', rows: [
      { id: 'attack', keys: ['LMB', 'J'], codes: ['KeyJ'], does: 'Strike — tap three times for the full chain; hold for a charged blow', pad: 'X', touch: 'Strike' },
      { id: 'ranged', keys: ['RMB', 'K'], codes: ['KeyK'], does: 'Throw (ammo pips refill over time)', pad: 'RT', touch: 'Throw' },
      { id: 'summon', keys: ['1'], codes: ['Digit1'], does: 'Summon (needs spark: land blows to gather it)', pad: 'Y', touch: 'Summon' }
    ] },
    { name: 'Items', rows: [
      { id: 'potion', keys: ['5'], codes: ['Digit5'], does: 'Drink a hearth draught — no cooldown, ever', pad: 'LB', touch: 'Draught' }
    ] },
    { name: 'Menus', rows: [
      { id: 'interact', keys: ['E'], codes: ['KeyE'], does: 'Light or douse a brazier or torch', pad: 'B', touch: 'Light' },
      { id: 'help', keys: ['H', 'I'], codes: ['KeyH', 'KeyI'], does: 'How to play (this)' },
      { id: 'pause', keys: ['Esc', 'P'], codes: ['Escape', 'KeyP'], does: 'Pause, how to play, credits', pad: 'Start' }
    ] },
    { name: 'Map', rows: [
      { id: 'map', keys: ['O', 'M', 'Tab'], codes: ['KeyO', 'KeyM', 'Tab'], does: 'The keep\'s map' }
    ] }
  ]
};
