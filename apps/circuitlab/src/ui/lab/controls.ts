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
        { id: 'board', keys: ['Click'], does: 'Click the bare holes of a breadboard to pick it (2+ boards), then Delete or Remove takes it off', touch: 'Tap' },
        { id: 'nudge', keys: ['←', '→', '↑', '↓'], codes: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'], does: 'Nudge the selected parts one hole (nothing selected: pan the view)' },
        { id: 'undo', keys: ['Ctrl', 'Z'], does: 'Undo (Ctrl+Shift+Z or Ctrl+Y redoes)' },
        { id: 'cancel', keys: ['Esc'], codes: ['Escape'], does: 'Cancel placing / wiring, clear the selection' },
      ],
    },
    {
      name: 'Camera',
      rows: [
        { id: 'orbit', keys: ['Left-drag'], does: 'Orbit around the bench in every view, Illustrated too (drag on the background or the board; a short click still selects)', touch: 'One finger' },
        { id: 'pan', keys: ['Right-drag'], does: 'Pan (also middle-drag, or hold Space and left-drag)', touch: 'Two-finger drag' },
        { id: 'trackpad', keys: ['Two-finger scroll'], does: 'Trackpad: pan; pinch zooms' },
        { id: 'zoom', keys: ['Wheel'], does: 'Zoom toward the cursor', touch: 'Pinch' },
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
      name: 'Menus',
      rows: [
        { id: 'help', keys: ['H'], codes: ['KeyH'], does: 'This help', hint: true },
        { id: 'home', keys: ['Home button'], does: 'Back to the platform home page' },
      ],
    },
  ],
}
