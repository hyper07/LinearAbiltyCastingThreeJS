/**
 * Gamory Pop's little motions (the looks are in pop.css): cards that tilt
 * toward the pointer, a burst of confetti, and a "boing" on press. All of
 * them stand still for people who ask for less motion.
 */

const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const COLORS = ['#ff5da2', '#ffc93c', '#38b6ff', '#2fd3a0', '#8b5cf6', '#ff7a59'];

/** Tilt an element toward the pointer while it is over it (sets --rx, --ry, --mx, --my). */
export function tilt(node, { max = 9 } = {}) {
  if (calm()) return node;
  node.addEventListener('pointermove', (e) => {
    const r = node.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    node.style.setProperty('--ry', `${(x * max).toFixed(2)}deg`);
    node.style.setProperty('--rx', `${(-y * max).toFixed(2)}deg`);
    node.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
    node.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
  });
  node.addEventListener('pointerleave', () => {
    node.style.setProperty('--ry', '0deg');
    node.style.setProperty('--rx', '0deg');
  });
  return node;
}

let canvas = null;
let pieces = [];
let raf = 0;

/** A burst of confetti from a point on the page (or from an element's middle). */
export function confetti(from, count = 70) {
  if (calm()) return;
  let x = from?.x;
  let y = from?.y;
  if (from instanceof Element) {
    const r = from.getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.top + r.height / 2;
  }
  if (!Number.isFinite(x)) {
    x = window.innerWidth / 2;
    y = window.innerHeight / 3;
  }
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'pop-confetti';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.append(canvas);
  }
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 4 + Math.random() * 9;
    pieces.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5, r: 4 + Math.random() * 5, spin: Math.random() * 6, vs: (Math.random() - 0.5) * 0.5, color: COLORS[i % COLORS.length], life: 1, round: Math.random() < 0.3 });
  }
  if (!raf) raf = requestAnimationFrame(step);
}

function step() {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  pieces = pieces.filter((p) => p.life > 0 && p.y < canvas.height + 20);
  for (const p of pieces) {
    p.vy += 0.32;
    p.vx *= 0.985;
    p.x += p.vx;
    p.y += p.vy;
    p.spin += p.vs;
    p.life -= 0.011;
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.life * 2);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.spin);
    ctx.fillStyle = p.color;
    if (p.round) {
      ctx.beginPath();
      ctx.arc(0, 0, p.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else ctx.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.9);
    ctx.restore();
  }
  if (pieces.length) raf = requestAnimationFrame(step);
  else {
    raf = 0;
    canvas.remove();
    canvas = null;
  }
}

/** The pop colours, in order, for things that come in a row (chips, cards). */
export const popColor = (i) => COLORS[((i % COLORS.length) + COLORS.length) % COLORS.length];
