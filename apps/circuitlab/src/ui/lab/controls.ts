/**
 * Circuit Lab's one controls table (the platform convention, see
 * src/shared/helpPanel.js): the key handler in App.tsx reads its codes from
 * here and the How-to-play panel (H) lists all of it.
 */
export const CONTROLS = {
  title: 'Circuit Lab — how to use it',
  goal: 'Build a circuit on the breadboard, wire it up and press Run: every voltage and current comes from a real circuit solver. Add an Arduino, ESP32 or Pico, write its sketch in the Code panel and watch it drive your parts. Start with a lesson from the Lessons tab.',
  groups: [
    {
      name: 'Build',
      rows: [
        { id: 'place', keys: ['Click'], does: 'Pick a part in Parts, then click the holes for its legs', touch: 'Tap' },
        { id: 'wire', keys: ['W'], codes: ['KeyW'], does: 'Wire mode: click one hole or pin, then another', hint: true },
        { id: 'rotate', keys: ['R'], codes: ['KeyR'], does: 'Rotate the part you are placing, or the selected chip, board, servo, module or instrument (a quarter turn)' },
        { id: 'delete', keys: ['Delete'], codes: ['Delete', 'Backspace'], does: 'Remove the selection' },
        { id: 'board', keys: ['Click'], does: 'Click the bare holes of a breadboard to pick it (2+ boards), then Delete or Remove takes it off', touch: 'Tap' },
        { id: 'nudge', keys: ['←', '→', '↑', '↓'], codes: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'], does: 'Nudge the selected parts one hole (nothing selected: pan the view)' },
        { id: 'undo', keys: ['Ctrl', 'Z'], does: 'Undo (Ctrl+Shift+Z or Ctrl+Y redoes)' },
        { id: 'save', keys: ['Ctrl', 'S'], does: 'Save / Open: save the circuit under a name, open a saved one' },
        { id: 'cancel', keys: ['Esc'], codes: ['Escape'], does: 'Cancel placing / wiring, clear the selection' },
      ],
    },
    {
      name: 'Camera',
      rows: [
        { id: 'orbit', keys: ['Left-drag'], does: 'Rotate the view (drag on the background or the board; a short click still selects)', touch: 'One finger' },
        { id: 'pan', keys: ['Right-drag'], does: 'Move the view (also middle-drag, Shift + scroll, or hold Space and left-drag)', touch: 'Two-finger drag' },
        { id: 'trackpad', keys: ['Trackpad'], does: 'Two-finger scroll zooms, pinch zooms, swipe sideways to move' },
        { id: 'zoom', keys: ['Scroll'], does: 'Zoom in and out toward the cursor', touch: 'Pinch' },
        { id: 'pankeys', keys: ['Shift', 'W A S D'], codes: ['KeyW', 'KeyA', 'KeyS', 'KeyD'], does: 'Pan with the keyboard (arrow keys too when nothing is selected)' },
        { id: 'focus', keys: ['Double-click'], does: 'Focus a part (on empty space: fit everything; the ⤢ button too)', touch: 'Double-tap' },
        { id: 'view', keys: ['V'], codes: ['KeyV'], does: 'Switch the view: Photo / Illustrated / Schematic' },
        { id: 'turn', keys: ['Q', 'E'], codes: ['KeyQ', 'KeyE'], does: 'Turn the view left / right' },
      ],
    },
    {
      name: 'Run and code',
      rows: [
        { id: 'run', keys: ['Space'], codes: ['Space'], does: 'Run / pause the simulation', hint: true },
        { id: 'code', keys: ['C'], codes: ['KeyC'], does: 'Open the Code panel (sketch, upload, serial monitor)' },
        { id: 'lessons', keys: ['L'], codes: ['KeyL'], does: 'Open the lessons' },
      ],
    },
    {
      name: 'Inspect a board',
      rows: [
        { id: 'inspect', keys: ['I'], codes: ['KeyI'], does: 'Inspect board: every part on an ESP32, Arduino or Pico (also the Inspect board button)' },
        { id: 'inspect-pick', keys: ['Hover', 'Click'], does: 'Hover a part for its name, click it for what it does, its specs and what it connects to', touch: 'Tap' },
        { id: 'inspect-pull', keys: ['P'], does: 'Pull the selected part out of the board (again: put it back)' },
        { id: 'inspect-explode', keys: ['X'], does: 'Explode: lift every part off the board' },
        { id: 'inspect-flip', keys: ['F'], does: 'Flip the board to see the underside' },
        { id: 'inspect-close', keys: ['Esc'], does: 'Put back / deselect, then close Inspect' },
      ],
    },
    {
      name: 'Menus',
      rows: [
        { id: 'help', keys: ['H'], codes: ['KeyH'], does: 'This help', hint: true },
        { id: 'home', keys: ['Home button'], does: 'Back to the platform home page' },
      ],
    },
  ],
}
