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
        { id: 'rotate', keys: ['R'], codes: ['KeyR'], does: 'Rotate the part you are placing (or the selected chip)' },
        { id: 'delete', keys: ['Delete'], codes: ['Delete', 'Backspace'], does: 'Remove the selection' },
        { id: 'nudge', keys: ['←', '→', '↑', '↓'], codes: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'], does: 'Nudge the selected parts one hole' },
        { id: 'undo', keys: ['Ctrl', 'Z'], does: 'Undo (Ctrl+Shift+Z or Ctrl+Y redoes)' },
        { id: 'cancel', keys: ['Esc'], codes: ['Escape'], does: 'Cancel placing / wiring, clear the selection' },
      ],
    },
    {
      name: 'Camera',
      rows: [
        { id: 'orbit', keys: ['Left-drag'], does: 'Orbit around the bench (drag on empty space; a short click still selects)', touch: 'One finger' },
        { id: 'pan', keys: ['Right-drag'], does: 'Pan', touch: 'Two fingers' },
        { id: 'zoom', keys: ['Scroll'], does: 'Zoom', touch: 'Pinch' },
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
      name: 'Menus',
      rows: [
        { id: 'help', keys: ['H'], codes: ['KeyH'], does: 'This help', hint: true },
        { id: 'home', keys: ['Home button'], does: 'Back to the platform home page' },
      ],
    },
  ],
}
