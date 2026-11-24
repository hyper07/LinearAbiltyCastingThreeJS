/**
 * The snowboards (cosmetic only — every board rides the same): a shaped deck
 * with a printed topsheet (a canvas painted once per design, so one print
 * material per board), a coloured base and edges, bindings to match, and the
 * fun bits — a fish tail that wiggles, a rocket flame on boosts, a dragon's
 * blinking eyes at the nose, neon edges that pulse with speed.
 *
 *   const b = buildBoard('pizza', { trim: '#ff6fb4', art: 'stars' });
 *   rider.board.add(b.group);  …  b.update(dt, { speed, carve, boost, air });
 *
 * Board space: x along the board (nose +x), y up, z across.
 */
import * as THREE from 'three/webgpu';
import { uniform, vec3, float, sin, time } from 'three/tsl';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { cleanBoard, BOARD_IDS } from '../boardList.js';

export const LEN = 1.12, WID = 0.29, TH = 0.028;

const G = {};
const mats = new Map();
const cached = (key, make) => {
  if (!mats.has(key)) mats.set(key, make());
  return mats.get(key);
};
const vinyl = (c, rough = 0.3, extra = {}) => cached(`v${c}${rough}${JSON.stringify(extra)}`, () => new THREE.MeshPhysicalNodeMaterial({ color: c, roughness: rough, clearcoat: 0.8, clearcoatRoughness: 0.15, ...extra }));

/** The standard deck along x: rounded tips that turn up, a slight camber. Six face groups (top = 2). */
export function deckGeometry({ len = LEN, wid = WID, tip = 0.075, pinch = 1, bend = 0 } = {}) {
  const key = `deck${len}${wid}${tip}${pinch}${bend}`;
  if (G[key]) return G[key];
  const g = new THREE.BoxGeometry(len, TH, wid, 40, 1, 8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const u = Math.abs(x) / (len / 2);
    const end = Math.max(0, (u - 0.78) / 0.22);
    const pc = Math.sqrt(Math.max(0, 1 - end * end));
    let zz = z * (0.92 + 0.08 * pc) * (end > 0 ? 0.55 + 0.45 * pc : 1);
    if (pinch !== 1) zz *= 1 - (1 - pinch) * u * u; // pointy (surf)
    p.setZ(i, zz + bend * (u * u - 0.35)); // banana: curved along z
    p.setY(i, p.getY(i) + (u > 0.72 ? ((u - 0.72) / 0.28) ** 2 * tip : 0) + (1 - u * u) * 0.006);
  }
  g.computeVertexNormals();
  G[key] = g;
  return g;
}

/* ---------------------------------------------------------------- topsheet prints */

const W = 512, H = 132;
function canvas() {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  return cv;
}

const star = (g, x, y, r, n = 5, inner = 0.45) => {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * inner : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
};
const heart = (g, x, y, r) => {
  g.beginPath();
  g.moveTo(x, y + r * 0.9);
  g.bezierCurveTo(x - r * 1.4, y, x - r * 0.9, y - r * 1.1, x, y - r * 0.35);
  g.bezierCurveTo(x + r * 0.9, y - r * 1.1, x + r * 1.4, y, x, y + r * 0.9);
  g.fill();
};
const dot = (g, x, y, r) => {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
};

/** Painters: (ctx, opts) → draws the print over the whole canvas (u along the board, v across). */
const PRINTS = {
  classic(g, { trim = '#ff6fb4', art = 'stars', deck = '#ffffff' }) {
    g.fillStyle = deck;
    g.fillRect(0, 0, W, H);
    g.fillStyle = trim;
    g.fillRect(0, H * 0.42, W, H * 0.16);
    // doodles: little stars, hearts, swirls and the rider's own picture
    const cols = [trim, '#3a86ff', '#ffd23f', '#3fd0b0', '#ff8a3d'];
    for (let i = 0; i < 26; i++) {
      const x = 30 + ((i * 97) % (W - 60)), y = 14 + ((i * 53) % (H - 28));
      g.fillStyle = cols[i % cols.length];
      if (i % 4 === 0) star(g, x, y, 9);
      else if (i % 4 === 1) heart(g, x, y, 8);
      else if (i % 4 === 2) dot(g, x, y, 5);
      else {
        g.strokeStyle = cols[i % cols.length];
        g.lineWidth = 3;
        g.beginPath();
        g.arc(x, y, 7, 0, Math.PI * 1.5);
        g.stroke();
      }
    }
    g.fillStyle = '#2a2f4a';
    g.font = '900 30px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText({ stars: '★', hearts: '♥', paws: '✿', fish: '~', dots: '●', flakes: '✻' }[art] ?? '★', W / 2, H / 2);
  },
  rainbow(g) {
    ['#ff4b5c', '#ffa52e', '#ffe14d', '#3fd06a', '#3a86ff', '#8a5cff'].forEach((c, i) => {
      g.fillStyle = c;
      g.fillRect(0, (i * H) / 6, W, H / 6 + 1);
    });
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 6; i++) dot(g, 60 + i * 80, H / 2 + Math.sin(i) * 20, 14);
  },
  pizza(g) {
    g.fillStyle = '#ffcf5a';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#f2a93b';
    for (let i = 0; i < 40; i++) dot(g, (i * 71) % W, (i * 37) % H, 6 + (i % 3) * 3);
    g.fillStyle = '#d9432f';
    for (let i = 0; i < 9; i++) dot(g, 40 + ((i * 113) % (W - 80)), 24 + ((i * 61) % (H - 48)), 15);
    g.fillStyle = '#4c8a2e';
    for (let i = 0; i < 8; i++) g.fillRect((i * 151) % W, (i * 43) % H, 10, 5);
    g.fillStyle = '#c47a2c';
    g.fillRect(0, 0, 26, H); // the crust at the tail
  },
  surf(g) {
    g.fillStyle = '#3fd0b0';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#ff8a3d';
    g.fillRect(0, H * 0.45, W, H * 0.1);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) {
      // hibiscus-ish flowers
      const x = 50 + i * 100, y = i % 2 ? 30 : H - 30;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        dot(g, x + Math.cos(a) * 11, y + Math.sin(a) * 11, 8);
      }
      g.fillStyle = '#ffd23f';
      dot(g, x, y, 6);
      g.fillStyle = '#ffffff';
    }
  },
  banana(g) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#fff07a');
    gr.addColorStop(1, '#ffd21f');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(120,90,20,0.35)';
    for (let i = 0; i < 12; i++) dot(g, (i * 89) % W, 20 + ((i * 47) % (H - 40)), 3 + (i % 3));
    g.fillStyle = '#6b4a1e';
    g.fillRect(W - 18, 0, 18, H);
    g.fillRect(0, 0, 10, H);
  },
  fish(g) {
    g.fillStyle = '#ff9a3d';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffd08a';
    g.fillRect(0, H * 0.55, W, H * 0.45);
    g.strokeStyle = '#e0702a';
    g.lineWidth = 3;
    for (let x = 30; x < W - 60; x += 26) for (let y = 10; y < H; y += 26) {
      g.beginPath();
      g.arc(x + (y % 52 ? 13 : 0), y, 12, 0.2, Math.PI - 0.2);
      g.stroke();
    }
    g.fillStyle = '#ffffff';
    dot(g, W - 60, H * 0.38, 16);
    g.fillStyle = '#16131f';
    dot(g, W - 56, H * 0.38, 8);
  },
  rocket(g) {
    g.fillStyle = '#e8edf5';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#ff4b2b';
    g.fillRect(W - 90, 0, 90, H);
    g.fillRect(0, H * 0.44, W, H * 0.12);
    g.fillStyle = '#3a86ff';
    dot(g, W - 150, H / 2, 24);
    g.fillStyle = '#bfe6ff';
    dot(g, W - 154, H / 2 - 5, 14);
    g.fillStyle = '#9aa6bf';
    for (let x = 30; x < W - 100; x += 40) {
      dot(g, x, 12, 3);
      dot(g, x, H - 12, 3);
    }
  },
  box(g) {
    g.fillStyle = '#c99a62';
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(0,0,0,0.06)';
    for (let x = 0; x < W; x += 8) g.fillRect(x, 0, 3, H);
    g.fillStyle = 'rgba(230,220,190,0.85)';
    g.fillRect(W * 0.46, 0, 40, H);
    g.fillStyle = '#5a3a1e';
    g.font = '800 22px "Comic Sans MS", system-ui, sans-serif';
    g.fillText('THIS SIDE UP', 40, 44);
    g.font = '700 18px system-ui, sans-serif';
    g.fillText('↑ ↑  FRAGILE?  nah', 300, 100);
  },
  cookie(g) {
    g.fillStyle = '#b8733a';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 6;
    g.beginPath();
    for (let x = 20; x < W - 20; x += 24) g.lineTo(x, 18 + (x % 48 ? 10 : 0));
    g.stroke();
    g.beginPath();
    for (let x = 20; x < W - 20; x += 24) g.lineTo(x, H - 18 - (x % 48 ? 10 : 0));
    g.stroke();
    const cols = ['#ff4b8b', '#3fd0b0', '#ffd23f', '#3a86ff'];
    for (let i = 0; i < 30; i++) {
      g.fillStyle = cols[i % 4];
      g.save();
      g.translate((i * 67) % W, 36 + ((i * 29) % (H - 72)));
      g.rotate(i);
      g.fillRect(-6, -2, 12, 4);
      g.restore();
    }
    g.fillStyle = '#ffffff';
    dot(g, W / 2 - 20, H / 2, 7);
    dot(g, W / 2 + 20, H / 2, 7);
  },
  cloud(g) {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#dbe9ff';
    for (let i = 0; i < 14; i++) dot(g, (i * 79) % W, (i * 41) % H, 18 + (i % 3) * 8);
  },
  neon(g) {
    g.fillStyle = '#16131f';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#ff3fd0';
    g.lineWidth = 5;
    g.beginPath();
    for (let x = 30; x < W - 30; x += 40) g.lineTo(x, x % 80 ? 40 : H - 40);
    g.stroke();
    g.strokeStyle = '#3cf2ff';
    g.lineWidth = 4;
    g.strokeRect(10, 10, W - 20, H - 20);
  },
  dragon(g) {
    g.fillStyle = '#3fae5a';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#2a7a3a';
    for (let x = 0; x < W; x += 22) for (let y = 0; y < H; y += 20) {
      g.beginPath();
      g.arc(x + (y % 40 ? 11 : 0), y, 11, 0, Math.PI);
      g.fill();
    }
    g.fillStyle = '#ffd23f';
    g.fillRect(0, H * 0.46, W, H * 0.08);
  },
  melon(g) {
    g.fillStyle = '#ff5a6e';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff3c8';
    g.fillRect(0, 0, W, 10);
    g.fillRect(0, H - 10, W, 10);
    g.fillStyle = '#2e9b4a';
    g.fillRect(0, 0, W, 5);
    g.fillRect(0, H - 5, W, 5);
    g.fillStyle = '#1a1414';
    for (let i = 0; i < 22; i++) {
      g.save();
      g.translate(24 + ((i * 89) % (W - 48)), 26 + ((i * 37) % (H - 52)));
      g.rotate(0.4);
      g.beginPath();
      g.ellipse(0, 0, 4, 7, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  },
  sled(g) {
    g.fillStyle = '#c98a4a';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#7a4a22';
    for (let y = 0; y < H; y += H / 4) g.fillRect(0, y, W, 3);
    g.strokeStyle = 'rgba(90,50,20,0.35)';
    g.lineWidth = 2;
    for (let i = 0; i < 20; i++) {
      g.beginPath();
      g.moveTo((i * 53) % W, (i * 29) % H);
      g.bezierCurveTo(((i * 53) % W) + 40, ((i * 29) % H) + 6, ((i * 53) % W) + 80, ((i * 29) % H) - 6, ((i * 53) % W) + 120, (i * 29) % H);
      g.stroke();
    }
  }
};

/** Per board: base colour, edge colour, bindings, and its shape. */
const STYLE = {
  classic: { base: '#2b2f3a', edge: '#c8ced8', bind: '#2b2f3a' },
  rainbow: { base: '#ffffff', edge: '#8a5cff', bind: '#ffffff' },
  pizza: { base: '#c47a2c', edge: '#b5651d', bind: '#d9432f', shape: 'pizza' },
  surf: { base: '#ffffff', edge: '#ff8a3d', bind: '#ff8a3d', shape: 'surf' },
  banana: { base: '#ffe14d', edge: '#6b4a1e', bind: '#6b4a1e', shape: 'banana' },
  fish: { base: '#ffd08a', edge: '#e0702a', bind: '#2a86ff', shape: 'fish' },
  rocket: { base: '#9aa6bf', edge: '#ff4b2b', bind: '#ff4b2b', shape: 'rocket' },
  box: { base: '#b88a52', edge: '#8a6236', bind: '#8a6236' },
  cookie: { base: '#9a5a28', edge: '#ffffff', bind: '#ff4b8b' },
  cloud: { base: '#dbe9ff', edge: '#ffffff', bind: '#9cc3ff', shape: 'cloud' },
  neon: { base: '#16131f', edge: '#3cf2ff', bind: '#16131f', neon: true },
  dragon: { base: '#2a7a3a', edge: '#ffd23f', bind: '#2a7a3a', shape: 'dragon' },
  melon: { base: '#2e9b4a', edge: '#fff3c8', bind: '#2e9b4a' },
  sled: { base: '#7a4a22', edge: '#c98a4a', bind: '#7a4a22', shape: 'sled' }
};

function printMaterial(id, opts) {
  const key = id === 'classic' ? `print-classic-${opts.trim}-${opts.art}-${opts.deck}` : `print-${id}`;
  return cached(key, () => {
    const m = new THREE.MeshPhysicalNodeMaterial({ roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.12 });
    const cv = canvas();
    if (cv) {
      PRINTS[id](cv.getContext('2d'), opts);
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      m.map = tex;
    } else m.color.set(STYLE[id].edge);
    return m;
  });
}

/** BoxGeometry's top face is group 2: put the print there and base/edge elsewhere. */
function deckMesh(geo, id, opts) {
  const st = STYLE[id];
  const edge = vinyl(st.edge, 0.35);
  const base = vinyl(st.base, 0.4);
  // [ +x, −x, +y (top), −y (base), +z, −z ]
  return new THREE.Mesh(geo, [edge, edge, printMaterial(id, opts), base, edge, edge]);
}

const merge = (list) => mergeGeometries(list.map((g) => {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
  return n;
}));

/**
 * Build a board. Returns { id, group, update(dt, state), trick(), land(clean) }.
 * opts: { trim, art } (the Classic board's colours and picture: the rider's own).
 */
export function buildBoard(id, opts = {}) {
  id = cleanBoard(id);
  const st = STYLE[id];
  const group = new THREE.Group();
  const fx = {};
  const shape = st.shape;
  let deck;
  if (shape === 'pizza') {
    // a slice: wide crust at the tail, a point at the nose
    const s = new THREE.Shape();
    s.moveTo(-LEN / 2, -WID * 0.62);
    s.quadraticCurveTo(-LEN / 2 - 0.05, 0, -LEN / 2, WID * 0.62);
    s.lineTo(LEN / 2, 0.02);
    s.lineTo(LEN / 2, -0.02);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: TH, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.008, bevelSegments: 1 });
    geo.rotateX(Math.PI / 2);
    geo.translate(0, TH / 2, 0);
    // uv from x/z for the print on top
    const p = geo.attributes.position, uvA = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uvA.setXY(i, p.getX(i) / LEN + 0.5, p.getZ(i) / (WID * 1.3) + 0.5);
    deck = new THREE.Mesh(geo, printMaterial(id, opts));
    // cheese drips over the edges
    const drips = [];
    for (let i = 0; i < 6; i++) {
      const x = -0.4 + i * 0.13, w = WID * 0.62 * (1 - (x + LEN / 2) / LEN) + 0.01;
      for (const sd of [-1, 1]) drips.push(new THREE.CapsuleGeometry(0.012, 0.03 + (i % 3) * 0.015, 3, 6).translate(x, -0.005, sd * w));
    }
    group.add(new THREE.Mesh(merge(drips), vinyl('#ffd84a', 0.3)));
  } else if (shape === 'cloud') {
    const puffs = [];
    for (let i = 0; i < 9; i++) {
      const x = -0.48 + i * 0.12;
      puffs.push(new THREE.SphereGeometry(0.1 + (i % 3) * 0.02, 14, 10).scale(1.2, 0.45, 1.25).translate(x, 0.005, Math.sin(i * 2.1) * 0.03));
    }
    deck = new THREE.Mesh(merge(puffs), vinyl('#ffffff', 0.85, { sheen: 1, sheenColor: new THREE.Color('#dbe9ff') }));
  } else if (shape === 'sled') {
    const slats = [];
    for (let k = -1; k <= 1; k++) slats.push(new THREE.BoxGeometry(LEN * 0.96, TH * 0.9, WID * 0.3).translate(0, 0, k * WID * 0.34));
    deck = new THREE.Mesh(merge(slats), printMaterial(id, opts));
    // a curled front and a rope
    const curl = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 6, 16, Math.PI), vinyl('#7a4a22', 0.6));
    curl.position.set(LEN / 2 - 0.02, 0.05, 0);
    curl.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
    const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(LEN / 2 - 0.02, 0.09, -WID * 0.4), new THREE.Vector3(LEN / 2 + 0.06, 0.16, 0), new THREE.Vector3(LEN / 2 - 0.02, 0.09, WID * 0.4)]), 16, 0.008, 5), vinyl('#e4d1a6', 0.8));
    group.add(curl, rope);
  } else {
    const geo = deckGeometry({
      pinch: shape === 'surf' || shape === 'rocket' ? 0.5 : shape === 'fish' ? 0.75 : 1,
      tip: shape === 'banana' ? 0.11 : 0.075,
      bend: shape === 'banana' ? 0.12 : 0
    });
    deck = deckMesh(geo, id, opts);
  }
  deck.castShadow = true;
  deck.receiveShadow = true;
  group.add(deck);
  // extras
  if (shape === 'surf') {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 3).rotateX(Math.PI).scale(1.4, 1, 0.25), vinyl('#ff8a3d', 0.3));
    fin.position.set(-0.4, -0.05, 0);
    group.add(fin);
  } else if (shape === 'fish') {
    const tail = new THREE.Group();
    tail.position.set(-LEN / 2 + 0.03, 0.01, 0);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.2, 3).rotateZ(Math.PI / 2).scale(1, 0.18, 1), vinyl('#2a86ff', 0.35));
    fin.position.x = -0.08;
    tail.add(fin);
    group.add(tail);
    fx.tail = tail;
  } else if (shape === 'rocket') {
    const fins = [];
    for (const sd of [-1, 1]) fins.push(new THREE.ConeGeometry(0.06, 0.16, 3).rotateZ(Math.PI / 2).scale(1, 0.25, 1).translate(-0.48, 0.02, sd * 0.13));
    group.add(new THREE.Mesh(merge(fins), vinyl('#ff4b2b', 0.3)));
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.26, 10).rotateZ(Math.PI / 2), cached('flame', () => {
      const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
      m.colorNode = vec3(1, 0.55, 0.15).mul(float(2.2).add(sin(time.mul(40)).mul(0.5)));
      return m;
    }));
    flame.position.set(-LEN / 2 - 0.12, 0.03, 0);
    flame.scale.setScalar(0.001);
    group.add(flame);
    fx.flame = flame;
  } else if (shape === 'dragon') {
    const head = new THREE.Group();
    head.position.set(LEN / 2 - 0.02, 0.06, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10).scale(1.4, 0.8, 1), vinyl('#3fae5a', 0.4));
    const horns = new THREE.Mesh(merge([-1, 1].map((sd) => new THREE.ConeGeometry(0.015, 0.06, 6).rotateZ(-0.6).translate(-0.03, 0.06, sd * 0.04))), vinyl('#ffd23f', 0.4));
    const eyes = new THREE.Group();
    for (const sd of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), vinyl('#ffffff', 0.2));
      e.position.set(0.03, 0.03, sd * 0.045);
      const pu = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), vinyl('#16131f', 0.2));
      pu.position.set(0.012, 0, 0);
      e.add(pu);
      eyes.add(e);
    }
    head.add(skull, horns, eyes);
    group.add(head);
    fx.eyes = eyes;
    fx.blink = 1 + Math.random() * 3;
  }
  if (st.neon) {
    const glow = uniform(0.6);
    const m = new THREE.MeshBasicNodeMaterial({ color: '#3cf2ff' });
    m.colorNode = vec3(0.24, 0.95, 1).mul(glow);
    const rim = new THREE.Mesh(deckGeometry(), m);
    rim.scale.set(1.012, 0.35, 1.06);
    rim.position.y = -0.006;
    group.add(rim);
    fx.glow = glow;
  }
  // bindings matched to the board
  const bindM = vinyl(st.bind, 0.45);
  const binds = [];
  for (const sx of [-0.2, 0.2]) {
    binds.push(new THREE.SphereGeometry(1, 16, 10).scale(0.09, 0.035, 0.14).translate(sx, 0.035, 0));
    binds.push(new THREE.BoxGeometry(0.04, 0.09, 0.2).translate(sx - 0.075, 0.075, 0)); // the high-back
  }
  const bm = new THREE.Mesh(merge(binds), bindM);
  bm.castShadow = true;
  group.add(bm);
  group.traverse((o) => {
    if (o.isMesh && o !== deck) o.castShadow = o.castShadow || false;
  });
  let t = Math.random() * 10, flash = 0;
  return {
    id,
    group,
    trail: id,
    /** state: { speed, carve (−1…1), boost (bool), air } */
    update(dt, s = {}) {
      t += dt;
      if (fx.tail) fx.tail.rotation.y = Math.sin(t * (6 + Math.abs(s.carve ?? 0) * 10)) * (0.15 + Math.abs(s.carve ?? 0) * 0.5) + (s.carve ?? 0) * 0.3;
      if (fx.flame) {
        const k = s.boost ? 1 : 0;
        const cur = fx.flame.scale.x;
        const v = cur + (k - cur) * Math.min(1, dt * 10);
        fx.flame.scale.setScalar(Math.max(0.001, v * (0.85 + Math.sin(t * 50) * 0.15)));
      }
      if (fx.eyes) {
        fx.blink -= dt;
        const shut = fx.blink < 0.12 && fx.blink > 0;
        if (fx.blink < 0) fx.blink = 1.5 + Math.random() * 3;
        fx.eyes.scale.y = shut ? 0.1 : 1;
      }
      if (fx.glow) {
        flash = Math.max(0, flash - dt * 2.5);
        fx.glow.value = 0.6 + Math.min(1, (s.speed ?? 0) / 25) * 1.6 + flash * 3 + Math.sin(t * 6) * 0.15;
      }
    },
    /** A trick landed clean: the fish wiggles, the dragon winks, the neon flashes. */
    trick() {
      flash = 1;
      if (fx.eyes) fx.blink = 0.11;
      t += 1.3;
    }
  };
}

/** Every board in a row (drawn once behind the loading card). */
export function boardRack(ids = BOARD_IDS) {
  const g = new THREE.Group();
  ids.forEach((id, i) => {
    const b = buildBoard(id);
    b.group.position.z = (i - (ids.length - 1) / 2) * 0.35;
    g.add(b.group);
  });
  g.scale.setScalar(0.4);
  g.traverse((o) => {
    if (o.isMesh) o.frustumCulled = false;
  });
  return g;
}
