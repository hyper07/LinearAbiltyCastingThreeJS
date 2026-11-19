/**
 * Gangnam Drift's controls: the one table the key handler reads, the bar's
 * line of hints is built from (by mode) and How to play lists
 * (shared/helpPanel.js). The horn is B (H is How to play).
 */
export const CONTROLS = {
  title: 'How to play — Gangnam Drift',
  goal: 'Seoul, from its real building register: fly over the city, walk its streets, borrow a car and drive — or race on real roads, alone against bots or with up to four friends. Visit all 25 districts to fill your stamps.',
  groups: [
    { name: 'Fly', rows: [
      { id: 'move', keys: ['W', 'A', 'S', 'D'], codes: ['KeyW', 'KeyA', 'KeyS', 'KeyD'], does: 'Fly · walk · drive (W go, S brake and reverse, A D steer)', modes: { fly: 'fly', walk: 'walk', drive: 'drive' } },
      { id: 'updown', keys: ['Space', 'C'], codes: ['Space', 'KeyC', 'KeyQ'], does: 'Flying: up and down (Q also goes down)', modes: { fly: 'up and down' } },
      { id: 'fast', keys: ['Shift'], codes: ['ShiftLeft', 'ShiftRight'], does: 'Fly fast · run · handbrake (drift)', modes: { fly: 'fast', walk: 'run', drive: 'handbrake' } },
      { id: 'look', keys: ['Drag', 'Wheel'], codes: [], does: 'Look around; the wheel zooms (flying: height)', modes: { fly: 'look', walk: 'look', drive: 'look' } }
    ] },
    { name: 'On the street', rows: [
      { id: 'flyWalk', keys: ['F'], codes: ['KeyF'], does: 'Fly ↔ walk', modes: { fly: 'walk', walk: 'fly', drive: 'fly' } },
      { id: 'use', keys: ['E'], codes: ['KeyE'], does: 'Get in a car · get out', modes: { walk: 'get in a car', drive: 'get out' } },
      { id: 'who', keys: ['V'], codes: ['KeyV'], does: 'Who you are on the street', modes: { walk: 'who you are' } },
      { id: 'horn', keys: ['B'], codes: ['KeyB'], does: 'Horn (driving and racing)', modes: { drive: 'horn' } }
    ] },
    { name: 'Racing', rows: [
      { id: 'turbo', context: 'race', keys: ['Space'], codes: ['Space'], does: 'Turbo, once the gauge is full (drift with Shift to fill it faster)' },
      { id: 'respawn', context: 'race', keys: ['R'], codes: ['KeyR'], does: 'Back on the road' },
      { id: 'quit', context: 'race', keys: ['Esc'], codes: ['Escape'], does: 'Leave the race' }
    ] },
    { name: 'Menus', rows: [
      { id: 'places', keys: ['M'], codes: ['KeyM'], does: 'Places: districts and tall buildings to go to', modes: { fly: 'places', walk: 'places' } },
      { id: 'graphics', keys: ['G'], codes: ['KeyG'], does: 'Graphics: Quiet keeps your laptop cool' },
      { id: 'help', keys: ['H', 'I'], codes: ['KeyH', 'KeyI'], does: 'How to play (this)', modes: { fly: 'help', walk: 'help', drive: 'help' } },
      { id: 'close', keys: ['Esc'], codes: ['Escape'], does: 'Close a panel · leave Gangnam Drift' }
    ] }
  ]
};

/** The bar's one line of hints for a mode, from the same table. */
export function modeHint(mode) {
  const out = [];
  for (const g of CONTROLS.groups) for (const r of g.rows) if (r.modes?.[mode]) out.push(`${r.keys.join(' ')} ${r.modes[mode]}`);
  return out.join(' · ');
}
