/**
 * Kickrani's controls: the one table the key handler reads, the bar's
 * line of hints is built from (by mode) and How to play lists
 * (shared/helpPanel.js). In a race Shift drifts, the bell is Space (B too;
 * H is How to play); items are on the number keys (the energy drink is the only boost — no boost key).
 */
export const CONTROLS = {
  title: 'How to play — Kickrani',
  goal: 'Snowpuff\'s plush friends race electric scooters through Seoul\'s real streets and alleys, open to traffic: throttle up to 70 km/h, lean through the corners, hold Shift to drift round the tight 90° corners, ring your bell (Space) and weave past cars, buses, scooters and people — hit one square and you\'re off for a moment; a glancing knock only scrapes. Item boxes give you an energy drink (a gulp and four seconds of boost to 85 km/h — the only boost there is), a call to the police (a patrol pulls the rider ahead of you over: stopped for five seconds), a gold helmet (worn for all to see: it takes your next fall), a branch to throw into the wheel of the rider right ahead of you, marbles to pour behind you — riders who cross them slip, and fall if they hit them fast or turning — an oil slick to spill behind you, which spins whoever rides into it right round, or smoke: a thick cloud dropped in the road behind you, and whoever rides into it can\'t see a thing for a moment. A square slides in on the left when a rival comes up behind you. Pick your course on a real map of Seoul. Race three bots or up to four friends. Outside a race: fly over the city, walk its streets, borrow a car, and visit all 25 districts.',
  groups: [
    { name: 'Fly', rows: [
      { id: 'move', keys: ['W', 'A', 'S', 'D'], codes: ['KeyW', 'KeyA', 'KeyS', 'KeyD'], does: 'Fly · walk · drive (W go, S brake and reverse, A D steer)', modes: { fly: 'fly', walk: 'walk', drive: 'drive' } },
      { id: 'updown', keys: ['Space', 'C'], codes: ['Space', 'KeyC', 'KeyQ'], does: 'Flying: up and down (Q also goes down)', modes: { fly: 'up and down' } },
      { id: 'fast', keys: ['Shift'], codes: ['ShiftLeft', 'ShiftRight'], does: 'Fly fast · run · handbrake (in a race: drift)', modes: { fly: 'fast', walk: 'run', drive: 'handbrake' } },
      { id: 'look', keys: ['Drag', 'Wheel'], codes: [], does: 'Hold the left button and drag to look around; the wheel zooms (flying: height)', modes: { fly: 'look', walk: 'look', drive: 'look' } }
    ] },
    { name: 'On the street', rows: [
      { id: 'flyWalk', keys: ['F'], codes: ['KeyF'], does: 'Fly ↔ walk', modes: { fly: 'walk', walk: 'fly', drive: 'fly' } },
      { id: 'use', keys: ['E'], codes: ['KeyE'], does: 'Get in a car · get out', modes: { walk: 'get in a car', drive: 'get out' } },
      { id: 'who', keys: ['V'], codes: ['KeyV'], does: 'Who you are on the street', modes: { walk: 'who you are' } },
      { id: 'horn', keys: ['B'], codes: ['KeyB'], does: 'Horn when driving · the bell in a race, like Space', modes: { drive: 'horn' } }
    ] },
    { name: 'Racing (scooter)', rows: [
      { id: 'pedal', context: 'race', keys: ['W', 'S'], codes: ['KeyW', 'KeyS'], modes: { race: 'throttle · brake' }, does: 'Throttle (70 km/h flat out, in about four seconds) · brake — gently on a wet road, or the back steps out' },
      { id: 'lean', context: 'race', keys: ['A', 'D'], codes: ['KeyA', 'KeyD'], modes: { race: 'lean' }, does: 'Lean left and right — a scooter turns by leaning, more gently the faster you go; brake before a sharp corner (the arrow at the top says how far). Walls and bins met at a slant only scrape you' },
      { id: 'drift', context: 'race', keys: ['Shift'], codes: ['ShiftLeft', 'ShiftRight'], modes: { race: 'drift' }, does: 'Hold while leaning to drift: the back steps out and you whip round a tight 90° corner at speed (a little speed scrubbed off — less than braking). Let go to straighten' },
      { id: 'bell', context: 'race', keys: ['Space'], codes: ['Space', 'KeyB'], modes: { race: 'bell' }, does: 'Ring your bell — ring-ring! People ahead step aside, slower riders and scooters give you room (B rings it too)' },
      { id: 'items', context: 'race', keys: ['1', '2', '3'], codes: ['Digit1', 'Digit2', 'Digit3'], modes: { race: 'items' }, does: 'Use the item in that slot (ride through the ? boxes to get them). A branch flies into the wheel of the rider right ahead of you (only them — if nobody\'s ahead, it\'s wasted); marbles pour out behind you (cross someone else\'s slowly and straight, or you fall); oil spills behind you (ride into someone else\'s and you spin right round, slowed nearly to a stop: steer round it); the energy drink boosts you at once, to about 85 km/h for four seconds (the only boost); calling the police stops the rider ahead of you for five seconds; smoke drops a cloud behind you that blinds whoever rides into it' },
      { id: 'respawn', context: 'race', keys: ['R'], codes: ['KeyR'], modes: { race: 'reset' }, does: 'Stuck in a wall or a building, or tumbled the wrong way? Back on the open road at once, where you had got to' },
      { id: 'quit', context: 'race', keys: ['Esc'], codes: ['Escape'], does: 'Leave the race' }
    ] },
    { name: 'Menus', rows: [
      { id: 'places', keys: ['M'], codes: ['KeyM'], does: 'Places: districts and tall buildings to go to', modes: { fly: 'places', walk: 'places' } },
      { id: 'graphics', keys: ['G'], codes: ['KeyG'], does: 'Graphics: Quiet keeps your laptop cool' },
      { id: 'help', keys: ['H', 'I'], codes: ['KeyH', 'KeyI'], does: 'How to play (this)', modes: { fly: 'help', walk: 'help', drive: 'help' } },
      { id: 'close', keys: ['Esc'], codes: ['Escape'], does: 'Close a panel · leave Kickrani' }
    ] }
  ]
};

/** The bar's one line of hints for a mode, from the same table. */
export function modeHint(mode) {
  const out = [];
  for (const g of CONTROLS.groups) for (const r of g.rows) if (r.modes?.[mode]) out.push(`${r.keys.join(' ')} ${r.modes[mode]}`);
  return out.join(' · ');
}
