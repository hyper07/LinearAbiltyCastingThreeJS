/**
 * Gangnam Jarani's controls: the one table the key handler reads, the bar's
 * line of hints is built from (by mode) and How to play lists
 * (shared/helpPanel.js). The horn — a bike's bell in a race — is B (H is How
 * to play); items are on the number keys.
 */
export const CONTROLS = {
  title: 'How to play — Gangnam Jarani',
  goal: 'Snowpuff\'s plush friends race electric scooters through Seoul\'s real streets and alleys, open to traffic: throttle up to 25 km/h, lean through the corners, boost while your battery gauge lasts, hop kerbs at an angle, and weave past cars, buses, scooters and people — hit one and you\'re off for a moment. Close calls charge your boost; item boxes give you a battery pack, an air horn, a gold helmet or a tailwind. Race three bots or up to four friends. Outside a race: fly over the city, walk its streets, borrow a car, and visit all 25 districts.',
  groups: [
    { name: 'Fly', rows: [
      { id: 'move', keys: ['W', 'A', 'S', 'D'], codes: ['KeyW', 'KeyA', 'KeyS', 'KeyD'], does: 'Fly · walk · drive (W go, S brake and reverse, A D steer)', modes: { fly: 'fly', walk: 'walk', drive: 'drive' } },
      { id: 'updown', keys: ['Space', 'C'], codes: ['Space', 'KeyC', 'KeyQ'], does: 'Flying: up and down (Q also goes down)', modes: { fly: 'up and down' } },
      { id: 'fast', keys: ['Shift'], codes: ['ShiftLeft', 'ShiftRight'], does: 'Fly fast · run · handbrake', modes: { fly: 'fast', walk: 'run', drive: 'handbrake' } },
      { id: 'look', keys: ['Drag', 'Wheel'], codes: [], does: 'Hold the left button and drag to look around; the wheel zooms (flying: height)', modes: { fly: 'look', walk: 'look', drive: 'look' } }
    ] },
    { name: 'On the street', rows: [
      { id: 'flyWalk', keys: ['F'], codes: ['KeyF'], does: 'Fly ↔ walk', modes: { fly: 'walk', walk: 'fly', drive: 'fly' } },
      { id: 'use', keys: ['E'], codes: ['KeyE'], does: 'Get in a car · get out', modes: { walk: 'get in a car', drive: 'get out' } },
      { id: 'who', keys: ['V'], codes: ['KeyV'], does: 'Who you are on the street', modes: { walk: 'who you are' } },
      { id: 'horn', keys: ['B'], codes: ['KeyB'], does: 'Horn when driving · the scooter\'s bell in a race (people just ahead step aside)', modes: { drive: 'horn' } }
    ] },
    { name: 'Racing (scooter)', rows: [
      { id: 'pedal', context: 'race', keys: ['W', 'S'], codes: ['KeyW', 'KeyS'], does: 'Throttle (the motor tops out at 25 km/h) · brake — gently on a wet road, or the back steps out' },
      { id: 'lean', context: 'race', keys: ['A', 'D'], codes: ['KeyA', 'KeyD'], does: 'Lean left and right — a scooter turns by leaning; slow down for a tight alley corner. Meet a kerb at an angle and you hop it; glancing, you scrape' },
      { id: 'sprint', context: 'race', keys: ['Space'], codes: ['Space'], does: 'Boost to about 32 km/h, crouched low, while the battery gauge lasts (it charges riding, faster in a slipstream or after a close call)' },
      { id: 'items', context: 'race', keys: ['1', '2', '3'], codes: ['Digit1', 'Digit2', 'Digit3'], does: 'Use the item in that slot (ride through the ? boxes to get them)' },
      { id: 'respawn', context: 'race', keys: ['R'], codes: ['KeyR'], does: 'Back on the course' },
      { id: 'quit', context: 'race', keys: ['Esc'], codes: ['Escape'], does: 'Leave the race' }
    ] },
    { name: 'Menus', rows: [
      { id: 'places', keys: ['M'], codes: ['KeyM'], does: 'Places: districts and tall buildings to go to', modes: { fly: 'places', walk: 'places' } },
      { id: 'graphics', keys: ['G'], codes: ['KeyG'], does: 'Graphics: Quiet keeps your laptop cool' },
      { id: 'help', keys: ['H', 'I'], codes: ['KeyH', 'KeyI'], does: 'How to play (this)', modes: { fly: 'help', walk: 'help', drive: 'help' } },
      { id: 'close', keys: ['Esc'], codes: ['Escape'], does: 'Close a panel · leave Gangnam Jarani' }
    ] }
  ]
};

/** The bar's one line of hints for a mode, from the same table. */
export function modeHint(mode) {
  const out = [];
  for (const g of CONTROLS.groups) for (const r of g.rows) if (r.modes?.[mode]) out.push(`${r.keys.join(' ')} ${r.modes[mode]}`);
  return out.join(' · ');
}
