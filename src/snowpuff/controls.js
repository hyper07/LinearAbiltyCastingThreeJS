/**
 * Snowpuff's controls: the one table the key handler reads, the hint line
 * shows and How to play lists (shared/helpPanel.js). Items are numbers
 * (1 snowball, 2 shield) — never Q or E. H is How to play.
 */
export const CONTROLS = {
  title: 'How to play — Snowpuff Peaks',
  goal: 'Race your plush friends down the mountain! Steer round the snowmen and hay bales, jump the kickers and spin in the air, grab stars, scoop up snowballs and bonk the rider ahead. Land a trick cleanly for a speed boost. Bumping into things never ends your run — you just tumble and pop back up.',
  groups: [
    { name: 'Ride', rows: [
      { id: 'steer', keys: ['A', 'D'], codes: ['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight'], does: 'Steer (or ← →). Hold longer to carve harder: sharper, more spray, a bit slower', pad: 'Left stick', touch: 'Drag on the left side of the screen', hint: true, short: 'steer' },
      { id: 'tuck', keys: ['S', 'Shift'], codes: ['KeyS', 'ArrowDown', 'ShiftLeft', 'ShiftRight'], does: 'Tuck for speed (or ↓)', pad: 'RT', touch: 'Tuck button', hint: true, short: 'tuck' },
      { id: 'jump', keys: ['Space'], codes: ['Space'], does: 'Hold to crouch, let go to pop — longer hold, higher jump', pad: 'A', touch: 'Jump button (hold)', hint: true, short: 'jump' }
    ] },
    { name: 'Tricks', rows: [
      { id: 'spin', keys: ['A', 'D'], codes: [], does: 'In the air: spin (or ← →)', pad: 'Left stick', touch: 'Drag left or right while in the air' },
      { id: 'flip', keys: ['W', 'S'], codes: ['KeyW', 'ArrowUp'], does: 'In the air: flip forward or back (or ↑ ↓). Land straight for a boost!', pad: 'Left stick up/down', touch: 'Drag up or down while in the air' }
    ] },
    { name: 'Items', rows: [
      { id: 'throw', keys: ['1', 'LMB'], codes: ['Digit1', 'Numpad1'], does: 'Throw a snowball at the rider just ahead (it aims itself). Carry up to 3', pad: 'X', touch: 'Snowball button', hint: true, short: 'snowball' },
      { id: 'shield', keys: ['2'], codes: ['Digit2', 'Numpad2'], does: 'Snow shield: snowballs bounce off for a few seconds (from the blue bubbles)', pad: 'Y', touch: 'Shield button' }
    ] },
    { name: 'Menus', rows: [
      { id: 'help', keys: ['H'], codes: ['KeyH'], does: 'How to play (this)', hint: true, short: 'help' },
      { id: 'pause', keys: ['Esc', 'P'], codes: ['Escape', 'KeyP'], does: 'Pause, sound, quality and credits', pad: 'Start' }
    ] }
  ]
};
