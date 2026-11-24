/**
 * Snowpuff's controls: the one table the key handler reads, the hint line
 * shows and How to play lists (shared/helpPanel.js). Items are numbers
 * (1 snowball, 2 shield) — never Q or E. H is How to play.
 */
export const CONTROLS = {
  title: 'How to play — Snowpuff Peaks',
  goal: 'Race your plush friends down the mountain! Open gift boxes for snowballs, a giant snowball, a shield, a rocket sled or an ice patch. Bonk the riders ahead, shove the one beside you by carving harder, ride close behind someone to draft, burst the snowmen, jump through the bell arches, and land tricks cleanly for a speed boost. A snowball makes a rider face-plant into the snow, a rolling giant snowball squashes them flat for a second, and ice spins you round. Bumping into things never ends your run — you just tumble and pop back up.',
  groups: [
    { name: 'Ride', rows: [
      { id: 'steer', keys: ['A', 'D'], codes: ['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight'], does: 'Steer (or ← →). Hold longer to carve harder: sharper, more spray, a bit slower', pad: 'Left stick', touch: 'Drag on the left side of the screen', hint: true, short: 'steer' },
      { id: 'tuck', keys: ['S', 'Shift'], codes: ['KeyS', 'ArrowDown', 'ShiftLeft', 'ShiftRight'], does: 'Tuck for speed (or ↓)', pad: 'RT', touch: 'Tuck button', hint: true, short: 'tuck' },
      { id: 'jump', keys: ['Space'], codes: ['Space'], does: 'Jumps the moment you press it (on a ramp too) — hold for a little more height', pad: 'A', touch: 'Jump button (hold)', hint: true, short: 'jump' }
    ] },
    { name: 'Tricks', rows: [
      { id: 'spin', keys: ['A', 'D'], codes: [], does: 'In the air: spin (or ← →)', pad: 'Left stick', touch: 'Drag left or right while in the air' },
      { id: 'flip', keys: ['W', 'S'], codes: ['KeyW', 'ArrowUp'], does: 'In the air: flip forward or back (or ↑ ↓). Land straight for a boost!', pad: 'Left stick up/down', touch: 'Drag up or down while in the air' }
    ] },
    { name: 'Items', rows: [
      { id: 'item1', keys: ['1', 'LMB'], codes: ['Digit1', 'Numpad1'], does: 'Use item 1 — snowballs fly at the rider just ahead by themselves (or at whoever bonked you last)', pad: 'X', touch: 'Left item button', hint: true, short: 'item 1' },
      { id: 'item2', keys: ['2'], codes: ['Digit2', 'Numpad2'], does: 'Use item 2 (you can hold two): giant snowball, snow shield, rocket sled or an ice patch dropped behind you', pad: 'Y', touch: 'Right item button', hint: true, short: 'item 2' }
    ] },
    { name: 'Menus', rows: [
      { id: 'help', keys: ['H'], codes: ['KeyH'], does: 'How to play (this)', hint: true, short: 'help' },
      { id: 'pause', keys: ['Esc', 'P'], codes: ['Escape', 'KeyP'], does: 'Pause, sound, quality and credits', pad: 'Start' }
    ] }
  ]
};
