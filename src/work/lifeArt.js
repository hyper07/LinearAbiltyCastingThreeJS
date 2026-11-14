/**
 * The pictures for Work Life's "Life" side: a backdrop for each place and a
 * figure for each person, drawn as SVG and moved by CSS (work.css) — clouds
 * drift, lamps sway, steam rises, eyes blink. Our own drawings: no photos,
 * nothing traced.
 */

/** The sky by the part of the day: [top, bottom, sun or moon colour, how dark]. */
const SKY = [['#ffd9a8', '#ffeed6', '#fff3b0', 0], ['#8fd0ff', '#dff3ff', '#fff6c8', 0], ['#3a2f6b', '#c8658f', '#ffe7b0', 0.35], ['#141a3a', '#2a2f5e', '#e8ecff', 0.6]];

const windowView = (x, y, w, h, part, id) => `
  <clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/></clipPath>
  <g clip-path="url(#${id})" class="la-spot" data-spot="window"><g class="la-far">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#sky)"/>
    <circle cx="${x + w * 0.75}" cy="${y + h * 0.3}" r="${h * 0.13}" fill="${SKY[part][2]}"/>
    ${part >= 2 ? `<g fill="#fff" class="la-twinkle"><circle cx="${x + w * 0.2}" cy="${y + h * 0.2}" r="1.5"/><circle cx="${x + w * 0.45}" cy="${y + h * 0.35}" r="1.2"/><circle cx="${x + w * 0.6}" cy="${y + h * 0.15}" r="1.4"/></g>` : `<g fill="#fff" opacity=".9" class="la-drift"><ellipse cx="${x + w * 0.2}" cy="${y + h * 0.3}" rx="${w * 0.14}" ry="${h * 0.07}"/><ellipse cx="${x + w * 0.55}" cy="${y + h * 0.5}" rx="${w * 0.18}" ry="${h * 0.08}"/></g>`}
    <g fill="#5a6a8a" opacity=".55"><rect x="${x}" y="${y + h * 0.62}" width="${w * 0.2}" height="${h}"/><rect x="${x + w * 0.24}" y="${y + h * 0.5}" width="${w * 0.16}" height="${h}"/><rect x="${x + w * 0.46}" y="${y + h * 0.68}" width="${w * 0.22}" height="${h}"/><rect x="${x + w * 0.74}" y="${y + h * 0.56}" width="${w * 0.3}" height="${h}"/></g>
    <g class="la-bird"><path d="M0 0 q6 -7 12 0 q6 -7 12 0" fill="none" stroke="#2b1d4e" stroke-width="2.5" stroke-linecap="round" transform="translate(${x + 10} ${y + h * 0.3})"/></g>
  </g></g>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="none" stroke="#2b1d4e" stroke-width="4"/>
  <path d="M${x + w / 2} ${y} V${y + h} M${x} ${y + h / 2} H${x + w}" stroke="#2b1d4e" stroke-width="3"/>`;

const PLACES = {
  office: (part) => `
    <rect width="640" height="360" fill="#f3e9da"/>
    ${windowView(60, 40, 220, 150, part, 'w1')}
    <rect y="270" width="640" height="90" fill="#c9b79c"/>
    <g><rect x="330" y="205" width="250" height="14" rx="4" fill="#8a6a4a"/><rect x="345" y="219" width="10" height="70" fill="#6a4f38"/><rect x="555" y="219" width="10" height="70" fill="#6a4f38"/>
      <g class="la-spot" data-spot="screen"><rect x="400" y="135" width="110" height="66" rx="6" fill="#2b1d4e"/></g><rect x="406" y="141" width="98" height="54" rx="3" fill="#7fd6ff" class="la-screen"/><rect x="448" y="201" width="14" height="8" fill="#2b1d4e"/>
      <g class="la-type" fill="#2b1d4e"><rect x="412" y="150" width="50" height="4" rx="2"/><rect x="412" y="160" width="70" height="4" rx="2"/><rect x="412" y="170" width="38" height="4" rx="2"/></g>
      <g class="la-spot" data-spot="mug"><rect x="530" y="180" width="22" height="25" rx="4" fill="#fff"/><path d="M536 176 q4 -10 0 -18 M544 176 q4 -10 0 -18" stroke="#fff" stroke-width="3" fill="none" class="la-steam"/></g></g>
    <g class="la-sway la-spot" data-spot="plant" style="transform-origin: 70px 290px"><rect x="58" y="250" width="26" height="40" rx="5" fill="#b86a4a"/><circle class="la-flower" cx="70" cy="200" r="9" fill="#ff5da2"/><path d="M70 250 C40 215 50 190 70 210 C90 180 105 215 70 250Z" fill="#3f9a5a"/></g>`,
  meeting: (part) => `
    <rect width="640" height="360" fill="#eef0f6"/>
    ${windowView(430, 40, 170, 130, part, 'w2')}
    <g class="la-spot" data-spot="board"><rect x="50" y="46" width="320" height="150" rx="8" fill="#fff" stroke="#2b1d4e" stroke-width="4"/></g>
    <g fill="none" stroke-width="5" stroke-linecap="round"><path d="M80 150 L130 110 L175 128 L230 80 L290 96" stroke="#ff5da2" class="la-draw"/><path d="M80 170 H330" stroke="#c8ccd6"/></g>
    <circle cx="398" cy="70" r="18" fill="#fff" stroke="#2b1d4e" stroke-width="3"/><path d="M398 70 V58" stroke="#2b1d4e" stroke-width="3" class="la-tick" style="transform-origin: 398px 70px"/>
    <rect y="275" width="640" height="85" fill="#b9bdd0"/><ellipse cx="320" cy="290" rx="260" ry="34" fill="#8a6a4a"/><ellipse cx="320" cy="284" rx="260" ry="30" fill="#a98562"/>`,
  home: (part) => `
    <rect width="640" height="360" fill="${part >= 2 ? '#3d3558' : '#f6e6d2'}"/>
    ${windowView(380, 50, 190, 140, part, 'w3')}
    <rect y="275" width="640" height="85" fill="${part >= 2 ? '#2e2843' : '#d9c3a3'}"/>
    <g><rect x="70" y="200" width="250" height="80" rx="22" fill="#7a5cff"/><rect x="60" y="215" width="40" height="70" rx="16" fill="#6a4fe0"/><rect x="290" y="215" width="40" height="70" rx="16" fill="#6a4fe0"/><rect x="110" y="190" width="80" height="50" rx="14" fill="#ffc93c"/></g>
    <g class="la-spot" data-spot="lamp"><rect x="346" y="150" width="6" height="130" fill="#2b1d4e"/><path d="M322 150 h54 l-12 -44 h-30z" fill="#ffe28a"/><ellipse cx="349" cy="170" rx="80" ry="60" fill="#ffe28a" opacity="${part >= 2 ? 0.28 : 0.1}" class="la-glow"/></g>
    <g class="la-spot" data-spot="mug"><rect x="470" y="232" width="110" height="10" rx="4" fill="#8a6a4a"/><rect x="505" y="212" width="20" height="20" rx="4" fill="#fff"/><path d="M510 208 q4 -10 0 -18 M518 208 q4 -10 0 -18" stroke="#fff" stroke-width="3" fill="none" class="la-steam"/></g>`,
  cafe: (part) => `
    <rect width="640" height="360" fill="#f7dcc0"/>
    ${windowView(40, 50, 260, 160, part, 'w4')}
    <g class="la-walk" opacity=".5"><circle cx="0" cy="150" r="9" fill="#2b1d4e"/><rect x="-8" y="160" width="16" height="40" rx="6" fill="#2b1d4e"/></g>
    <rect y="275" width="640" height="85" fill="#b98a63"/>
    <rect x="340" y="190" width="300" height="90" fill="#8a5a3a"/><rect x="330" y="180" width="310" height="16" rx="5" fill="#6a4026"/>
    <g fill="#fff" class="la-spot" data-spot="mug"><rect x="380" y="150" width="22" height="30" rx="4"/><rect x="420" y="156" width="20" height="24" rx="4"/><rect x="540" y="140" width="60" height="40" rx="6" fill="#2b1d4e"/></g>
    <path d="M388 146 q4 -10 0 -18 M396 146 q4 -10 0 -18" stroke="#fff" stroke-width="3" fill="none" class="la-steam"/>
    <g class="la-swing la-spot" data-spot="lamp" style="transform-origin: 420px 0"><path d="M420 0 V60" stroke="#2b1d4e" stroke-width="3"/><path d="M398 60 h44 l-10 26 h-24z" fill="#ffc93c"/></g>
    <g class="la-swing la-swing--b" style="transform-origin: 540px 0"><path d="M540 0 V50" stroke="#2b1d4e" stroke-width="3"/><path d="M518 50 h44 l-10 26 h-24z" fill="#ff7a59"/></g>
    <g><ellipse cx="170" cy="282" rx="70" ry="14" fill="#6a4026"/><rect x="164" y="282" width="12" height="50" fill="#6a4026"/></g>`,
  park: (part) => `
    <rect width="640" height="360" fill="url(#sky)"/>
    <circle cx="520" cy="80" r="34" fill="${SKY[part][2]}" class="la-glow"/>
    ${part < 2 ? '<g fill="#fff" opacity=".9" class="la-drift"><ellipse cx="120" cy="70" rx="60" ry="18"/><ellipse cx="330" cy="110" rx="80" ry="20"/></g>' : '<g fill="#fff" class="la-twinkle"><circle cx="90" cy="60" r="2"/><circle cx="240" cy="40" r="1.6"/><circle cx="380" cy="90" r="1.8"/></g>'}
    <path d="M0 250 Q160 200 320 240 T640 220 V360 H0Z" fill="#6bbf6a"/><path d="M0 290 Q200 250 400 285 T640 270 V360 H0Z" fill="#4f9f55"/>
    <g class="la-sway la-spot" data-spot="tree" style="transform-origin: 110px 270px"><rect x="102" y="200" width="16" height="80" fill="#7a5a3a"/><circle cx="110" cy="170" r="52" fill="#3f8a4a"/><circle cx="80" cy="195" r="34" fill="#4a9a55"/></g>
    <g class="la-sway la-sway--b" style="transform-origin: 560px 260px"><rect x="553" y="205" width="14" height="70" fill="#7a5a3a"/><circle cx="560" cy="180" r="44" fill="#3f8a4a"/></g>
    <g><rect x="250" y="262" width="150" height="10" rx="4" fill="#8a6a4a"/><rect x="250" y="240" width="150" height="8" rx="4" fill="#8a6a4a"/><rect x="262" y="272" width="8" height="26" fill="#6a4f38"/><rect x="380" y="272" width="8" height="26" fill="#6a4f38"/></g>
    <g class="la-kite la-spot" data-spot="kite"><path d="M0 0 l14 -20 l14 20 l-14 26z" fill="#ff5da2" stroke="#2b1d4e" stroke-width="2"/><path d="M14 26 q-10 20 6 40" stroke="#2b1d4e" stroke-width="2" fill="none"/></g>`,
  street: (part, rain) => `
    <rect width="640" height="360" fill="url(#sky)"/>
    <g>${[[0, 110, 120, '#4a4f7a'], [130, 70, 110, '#5a5f8e'], [250, 130, 140, '#3f4470'], [400, 90, 110, '#565b8a'], [520, 120, 120, '#454a78']].map(([x, y, w, c], i) => `<rect x="${x}" y="${y}" width="${w}" height="${300 - y}" fill="${c}"/>${Array.from({ length: 12 }, (_, k) => `<rect x="${x + 12 + (k % 4) * (w - 24) / 4}" y="${y + 16 + Math.floor(k / 4) * 34}" width="14" height="18" fill="#ffd98a" opacity="${part >= 2 ? ((i * 7 + k * 5) % 3 ? 0.95 : 0.15) : 0.25}" class="${(i + k) % 5 === 0 ? 'la-twinkle' : ''}"/>`).join('')}`).join('')}</g>
    <rect y="290" width="640" height="70" fill="#3a3d55"/><path d="M0 325 H640" stroke="#ffd98a" stroke-width="4" stroke-dasharray="26 22" opacity=".7"/>
    <g class="la-spot" data-spot="lamp"><rect x="298" y="150" width="8" height="145" fill="#2b1d4e"/><path d="M302 150 q40 -6 46 18" stroke="#2b1d4e" stroke-width="6" fill="none"/><ellipse cx="348" cy="176" rx="12" ry="7" fill="#ffe28a"/><ellipse cx="348" cy="230" rx="70" ry="80" fill="#ffe28a" opacity="${part >= 2 ? 0.22 : 0.05}" class="la-glow"/></g>
    <g fill="#ff5da2" class="la-spot" data-spot="sign"><rect x="90" y="222" width="90" height="26" rx="6"/></g><text x="135" y="241" text-anchor="middle" font-size="15" font-weight="900" fill="#fff" font-family="system-ui">NOODLES</text>
    ${rain ? `<g stroke="#cfe6ff" stroke-width="2" opacity=".7" class="la-rain">${Array.from({ length: 46 }, (_, i) => `<path d="M${(i * 53) % 660} ${(i * 37) % 360} l-8 22"/>`).join('')}</g>` : ''}`
};

/**
 * A place's backdrop.
 * @param {string} place office, meeting, home, cafe, park or street
 * @param {number} part 0 morning, 1 afternoon, 2 evening, 3 night
 * @param {{ rain?: boolean }} [opts]
 */
export function backdrop(place, part = 0, { rain = false } = {}) {
  const p = Math.max(0, Math.min(3, part));
  const draw = PLACES[place] ?? PLACES.home;
  return `<svg class="la-scene" viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SKY[p][0]}"/><stop offset="1" stop-color="${SKY[p][1]}"/></linearGradient></defs>
    ${draw(p, rain)}
    <rect width="640" height="360" fill="#141a3a" opacity="${place === 'park' || place === 'street' ? 0 : SKY[p][3] * 0.45}"/>
  </svg>`;
}

const HAIR = {
  bob: (c) => `<path d="M22 46 C18 10 82 10 78 46 L78 62 C70 40 30 40 22 62Z" fill="${c}"/>`,
  short: (c) => `<path d="M24 40 C22 12 78 12 76 40 C66 26 34 26 24 40Z" fill="${c}"/>`,
  bun: (c) => `<circle cx="50" cy="12" r="11" fill="${c}"/><path d="M24 42 C20 14 80 14 76 42 C66 28 34 28 24 42Z" fill="${c}"/>`,
  messy: (c) => `<path d="M22 42 C14 14 40 4 50 14 C60 2 88 16 78 42 C70 26 60 30 50 24 C40 30 30 26 22 42Z" fill="${c}"/>`,
  long: (c) => `<path d="M20 44 C16 8 84 8 80 44 L84 92 C74 84 74 54 72 44 C62 30 38 30 28 44 C26 54 26 84 16 92Z" fill="${c}"/>`
};
const MOUTH = { happy: '<path d="M40 58 Q50 68 60 58" fill="none"/>', neutral: '<path d="M42 61 H58"/>', worried: '<path d="M41 64 Q50 56 59 64" fill="none"/>' };

/** What each kind of thing you can click in a room has to say for itself (one of these, in turn). */
export const SPOTS = {
  window: ['The city is getting on with its day.', 'A bird goes past, in no hurry at all.', 'Somewhere out there, somebody else is also looking out of a window.'],
  plant: ['It has grown a new leaf. Somebody is watering it; nobody admits to it.', 'You say hello to the plant. It keeps its own counsel.'],
  screen: ['Forty-one unread. One of them matters.', 'The cursor blinks at you, patiently.'],
  mug: ['Still warm. A small mercy.', 'You take a sip. The world gets one notch easier.'],
  board: ['Someone has drawn a line going up. Optimism, in marker pen.', 'Under the plan, half rubbed out: "do NOT erase".'],
  lamp: ['Click. Light.', 'Click. Less light.'],
  kite: ['It dips, thinks about the tree, and thinks better of it.'],
  tree: ['Older than the buildings. Unbothered by all of them.'],
  sign: ['The smell of broth reaches you before the door does.']
};

/**
 * A person: head, body and arms, their own hair, skin and top. The face
 * shows how they feel; with `talking` the mouth moves, and a wave or a small
 * mark over the head (a note, a drop of worry) can be added by class.
 */
export function figure(look, mood = 'neutral') {
  const m = MOUTH[mood] ?? MOUTH.neutral;
  const emote = mood === 'happy' ? '♪' : mood === 'worried' ? '💧' : '';
  return `<svg class="la-figure la-figure--${mood}" viewBox="0 0 120 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g class="la-body">
      <path class="la-arm la-arm--l" d="M26 108 C10 122 8 146 16 162" fill="none" stroke="${look.top}" stroke-width="15" stroke-linecap="round"/>
      <path class="la-arm la-arm--r" d="M94 108 C110 122 112 146 104 162" fill="none" stroke="${look.top}" stroke-width="15" stroke-linecap="round"/>
      <path d="M18 170 C18 112 38 96 60 96 C82 96 102 112 102 170Z" fill="${look.top}" stroke="#2b1d4e" stroke-width="3"/>
      <path d="M48 98 L60 116 L72 98" fill="none" stroke="#2b1d4e" stroke-width="2.5" opacity=".5"/>
      <g class="la-head">
        <rect x="52" y="78" width="16" height="22" rx="6" fill="${look.skin}" stroke="#2b1d4e" stroke-width="3"/>
        <ellipse cx="60" cy="52" rx="28" ry="31" fill="${look.skin}" stroke="#2b1d4e" stroke-width="3"/>
        <g transform="translate(10 6)">${(HAIR[look.style] ?? HAIR.short)(look.hair)}</g>
        <g class="la-blink" fill="#2b1d4e"><ellipse cx="50" cy="52" rx="3.2" ry="4.2"/><ellipse cx="70" cy="52" rx="3.2" ry="4.2"/></g>
        ${mood === 'worried' ? '<path d="M44 43 l10 -3 M76 43 l-10 -3" stroke="#2b1d4e" stroke-width="2.5" stroke-linecap="round"/>' : ''}
        ${mood === 'happy' ? '<g fill="#ff8fa8" opacity=".6"><ellipse cx="44" cy="62" rx="5" ry="3"/><ellipse cx="76" cy="62" rx="5" ry="3"/></g>' : ''}
        <g class="la-mouth" transform="translate(10 6)" stroke="#2b1d4e" stroke-width="3" stroke-linecap="round">${m}</g>
        <ellipse class="la-talk" cx="60" cy="68" rx="5" ry="4" fill="#7a2a3a" stroke="#2b1d4e" stroke-width="2"/>
      </g>
    </g>
    ${emote ? `<text class="la-emote" x="96" y="26" font-size="22" text-anchor="middle">${emote}</text>` : ''}
  </svg>`;
}
