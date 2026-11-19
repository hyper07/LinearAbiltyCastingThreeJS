/**
 * Stoneball's controls: the one table the key hints, the key handler and How
 * to play come from (shared/helpPanel.js).
 */
export const CONTROLS = {
  title: 'How to play — Stoneball',
  goal: 'Two cave tribes, one stone ball, a pitch in the valley. Run, pass and shoot to put the stone in their goal; slide and shove to take it back. Most goals at full time wins — a draw goes to golden goal.',
  groups: [
    { name: 'Move', rows: [
      { id: 'move', keys: ['W', 'A', 'S', 'D'], codes: ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'], does: 'Run (or the arrow keys)', short: 'run', hint: true, pad: 'Left stick' },
      { id: 'sprint', keys: ['Shift'], codes: ['ShiftLeft', 'ShiftRight'], does: 'Sprint', short: 'sprint', hint: true }
    ] },
    { name: 'Ball', rows: [
      { id: 'shoot', keys: ['Space'], codes: ['Space'], does: 'Shoot — hold to power up, release to kick', short: 'hold & release to shoot', hint: true, pad: 'A' },
      { id: 'pass', keys: ['E'], codes: ['KeyE'], does: 'Pass to the nearest team-mate', short: 'pass', hint: true, pad: 'X' },
      { id: 'slide', keys: ['C'], codes: ['KeyC'], does: 'Slide tackle', short: 'slide tackle', hint: true, pad: 'Y' },
      { id: 'shove', keys: ['F'], codes: ['KeyF'], does: 'Shove', short: 'shove', hint: true, pad: 'B' },
      { id: 'switch', keys: ['Q'], codes: ['KeyQ'], does: 'Switch to the player nearest the ball', short: 'switch', hint: true, pad: 'RB' }
    ] },
    { name: 'Menus', rows: [
      { id: 'sound', keys: ['M'], codes: ['KeyM'], does: 'Sound on / off' },
      { id: 'help', keys: ['H', 'I'], codes: ['KeyH', 'KeyI'], does: 'How to play (this)', short: 'help', hint: true },
      { id: 'pause', keys: ['Esc'], codes: ['Escape'], does: 'Pause: resume, restart, Graphics, leave', short: 'pause', hint: true, pad: 'Start' }
    ] }
  ]
};
