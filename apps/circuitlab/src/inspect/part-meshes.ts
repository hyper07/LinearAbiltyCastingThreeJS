/**
 * Toy-like toon meshes for the on-board parts of the Inspect view, one builder per
 * `look` in knowledge/circuit-boards.json. Every part gets its own materials so it
 * can be dimmed, outlined and lit on its own. Units: 1 = 1 mm. Local frame: x along
 * the part's w, z along its d (board +y → −z), y up from the board surface.
 */
import * as THREE from 'three'
import type { BoardPart } from './boards'

export const PAPER = new THREE.Color('#f6efe1')
export const INK = new THREE.Color('#2b2433')

let grad: THREE.DataTexture | null = null
/** soft three-step toon ramp (the Illustrated view uses two steps; parts read better with three) */
export function toonRamp(): THREE.DataTexture {
  if (grad) return grad
  const data = new Uint8Array([150, 150, 150, 255, 210, 210, 210, 255, 255, 255, 255, 255])
  grad = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat)
  grad.minFilter = THREE.NearestFilter
  grad.magFilter = THREE.NearestFilter
  grad.needsUpdate = true
  return grad
}

export function toon(color: THREE.ColorRepresentation, extra: Partial<THREE.MeshToonMaterialParameters> = {}): THREE.MeshToonMaterial {
  const m = new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(), ...extra })
  m.userData.base = m.color.clone()
  m.userData.baseEmissive = m.emissive.clone()
  m.userData.outlineParameters = { thickness: 0.0045, color: INK.toArray(), alpha: 1, visible: true }
  return m
}

const C = {
  chip: '#2a2a31',
  chipLight: '#3a3a44',
  metal: '#c9ccd1',
  metalDark: '#9aa0a8',
  gold: '#d9b45a',
  tan: '#c8a26b',
  black: '#1d1d22',
  white: '#efece4',
  socket: '#34343c',
}

function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, 0.05), Math.max(h, 0.02), Math.max(d, 0.05)), mat)
  m.position.set(x, y + h / 2, z)
  return m
}

function cyl(r: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 28): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat)
  m.position.set(x, y + h / 2, z)
  return m
}

/** crisp marking text on a transparent plane over the top face */
export function markingPlane(lines: string[], w: number, d: number, y: number, color = '#d9d6cf', weight = '600'): THREE.Mesh | null {
  const text = lines.filter(Boolean)
  if (!text.length || w < 1.4 || d < 0.9) return null
  const px = 48 // texels per mm: stays sharp close up
  const cw = Math.min(2048, Math.ceil(w * px))
  const ch = Math.min(2048, Math.ceil(d * px))
  const c = document.createElement('canvas')
  c.width = cw
  c.height = ch
  const g = c.getContext('2d')!
  g.fillStyle = color
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const longest = Math.max(...text.map((t) => t.length))
  let size = Math.min((ch * 0.8) / text.length, (cw * 0.92) / (longest * 0.62))
  size = Math.max(6, size)
  g.font = `${weight} ${size}px "Chakra Petch", "JetBrains Mono", system-ui, sans-serif`
  text.forEach((t, i) => g.fillText(t, cw / 2, ch / 2 + (i - (text.length - 1) / 2) * size * 1.1))
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  mat.userData.outlineParameters = { visible: false }
  mat.userData.isLabel = true
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat)
  m.rotation.x = -Math.PI / 2
  m.position.y = y + 0.01
  return m
}

/** two metal end caps + a body: chip resistors, capacitors, ferrites, fuses */
function twoTerminal(p: BoardPart, body: string, cap = C.metal, bodyFrac = 0.66): THREE.Object3D[] {
  const capW = (p.w * (1 - bodyFrac)) / 2
  const out: THREE.Object3D[] = [box(p.w * bodyFrac + 0.02, p.h, p.d, toon(body))]
  const mc = toon(cap)
  out.push(box(capW, p.h * 1.02, p.d * 1.02, mc, -(p.w / 2 - capW / 2)), box(capW, p.h * 1.02, p.d * 1.02, mc, p.w / 2 - capW / 2))
  return out
}

function legsAlong(n: number, span: number, z: number, legW: number, legD: number, mat: THREE.Material, y = 0, h = 0.25): THREE.Object3D[] {
  const out: THREE.Object3D[] = []
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? 0 : -span / 2 + (span * i) / (n - 1)
    out.push(box(legW, h, legD, mat, x, y, z))
  }
  return out
}

function legsAcross(n: number, span: number, x: number, legW: number, legD: number, mat: THREE.Material, y = 0, h = 0.25): THREE.Object3D[] {
  const out: THREE.Object3D[] = []
  for (let i = 0; i < n; i++) {
    const z = n === 1 ? 0 : -span / 2 + (span * i) / (n - 1)
    out.push(box(legW, h, legD, mat, x, y, z))
  }
  return out
}

export interface PartBuildCtx {
  /** board thickness (pins-down headers reach under the board) */
  t: number
  /** pins of this part in its local frame (headers) */
  pins: { x: number; z: number; name: string }[]
  /** local direction of the nearest board edge: connector mouths face out */
  outward?: { x: number; z: number }
}

/** a dark opening on the face of a connector that points to the board edge */
function mouth(p: BoardPart, o: { x: number; z: number }, round: boolean): THREE.Mesh {
  const alongX = Math.abs(o.x) >= Math.abs(o.z)
  const mat = toon(round ? '#0c0c10' : '#121216')
  if (round) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(p.d, p.w) * 0.22, Math.min(p.d, p.w) * 0.22, 0.3, 24), mat)
    if (alongX) m.rotation.z = Math.PI / 2
    else m.rotation.x = Math.PI / 2
    m.position.set(alongX ? Math.sign(o.x) * (p.w / 2 + 0.1) : 0, p.h * 0.55, alongX ? 0 : Math.sign(o.z) * (p.d / 2 + 0.1))
    return m
  }
  return alongX
    ? box(0.3, p.h * 0.62, p.d * 0.78, mat, Math.sign(o.x) * (p.w / 2 + 0.1), p.h * 0.18)
    : box(p.w * 0.78, p.h * 0.62, 0.3, mat, 0, p.h * 0.18, Math.sign(o.z) * (p.d / 2 + 0.1))
}

export function buildPartMeshes(p: BoardPart, ctx: PartBuildCtx): THREE.Object3D[] {
  const out: THREE.Object3D[] = []
  const mark = (lines: string[], w = p.w, d = p.d, y = p.h, col?: string) => {
    const m = markingPlane(lines, w * 0.86, d * 0.8, y, col)
    if (m) out.push(m)
  }
  switch (p.look) {
    case 'cap':
      out.push(...twoTerminal(p, C.tan))
      break
    case 'res':
      out.push(...twoTerminal(p, C.black))
      if (p.w >= 1.6 && p.value) mark([resCode(p.value)], p.w * 0.6, p.d, p.h, '#e8e4da')
      break
    case 'ferrite':
      out.push(...twoTerminal(p, '#3a3a40', C.metal))
      break
    case 'fuse':
      out.push(...twoTerminal(p, '#b6a640', C.metal, 0.74))
      break
    case 'varistor':
      out.push(...twoTerminal(p, '#7d7a72'))
      break
    case 'resarray': {
      out.push(box(p.w, p.h, p.d * 0.8, toon(C.black)))
      const mc = toon(C.metal)
      out.push(...legsAlong(4, p.w * 0.75, -p.d / 2 + 0.12, 0.42, 0.3, mc, 0, p.h * 0.9), ...legsAlong(4, p.w * 0.75, p.d / 2 - 0.12, 0.42, 0.3, mc, 0, p.h * 0.9))
      break
    }
    case 'led': {
      out.push(box(p.w, p.h * 0.55, p.d, toon(C.white)))
      const col = LED_COLORS[p.color ?? 'yellow'] ?? '#ffd34d'
      out.push(box(p.w * 0.62, p.h * 0.45, p.d * 0.8, toon(col, { emissive: new THREE.Color(col), emissiveIntensity: 0.35 }), 0, p.h * 0.55))
      out.push(box(p.w * 0.12, p.h * 0.56, p.d * 1.01, toon(C.metal), -p.w / 2 + p.w * 0.06), box(p.w * 0.12, p.h * 0.56, p.d * 1.01, toon(C.metal), p.w / 2 - p.w * 0.06))
      break
    }
    case 'tantalum':
      out.push(box(p.w * 0.85, p.h, p.d, toon('#e0b330')), box(p.w * 0.12, p.h * 1.01, p.d * 1.01, toon('#8a5a1a'), -p.w * 0.36))
      break
    case 'diode': {
      out.push(box(p.w * 0.8, p.h, p.d, toon(C.black)))
      out.push(box(p.w * 0.12, p.h * 1.02, p.d * 1.02, toon('#bfbab0'), -p.w * 0.28))
      const mc = toon(C.metal)
      out.push(box(p.w * 0.14, p.h * 0.3, p.d * 0.5, mc, -p.w / 2 + p.w * 0.07), box(p.w * 0.14, p.h * 0.3, p.d * 0.5, mc, p.w / 2 - p.w * 0.07))
      if (p.marking && p.w >= 2.5) mark([p.marking.split(' ')[0]], p.w * 0.6, p.d, p.h)
      break
    }
    case 'melf': {
      const r = p.d / 2
      const g = new THREE.Mesh(new THREE.CylinderGeometry(r, r, p.w * 0.72, 20), toon('#d98f6a'))
      g.rotation.z = Math.PI / 2
      g.position.y = r
      out.push(g)
      for (const s of [-1, 1]) {
        const e = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, p.w * 0.14, 20), toon(C.metal))
        e.rotation.z = Math.PI / 2
        e.position.set((s * p.w * 0.43), r, 0)
        out.push(e)
      }
      const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.03, r * 1.03, p.w * 0.08, 20), toon(C.black))
      band.rotation.z = Math.PI / 2
      band.position.set(-p.w * 0.25, r, 0)
      out.push(band)
      break
    }
    case 'sot23': {
      const bw = p.w
      const bd = p.d * 0.55
      out.push(box(bw, p.h * 0.85, bd, toon(C.chip), 0, 0.1))
      const mc = toon(C.metal)
      out.push(...legsAlong(2, bw * 0.65, bd / 2 + 0.25, 0.4, 0.5, mc), ...legsAlong(1, 0, -bd / 2 - 0.25, 0.4, 0.5, mc))
      if (p.marking) mark([p.marking], bw, bd, p.h * 0.95)
      break
    }
    case 'sot223': {
      const bd = 3.5
      out.push(box(p.w, p.h, bd, toon(C.chip), 0, 0, 0.6))
      const mc = toon(C.metal)
      out.push(box(3.0, 0.3, 2.2, mc, 0, 0, -2.3))
      out.push(...legsAlong(3, 4.6, 2.9, 0.7, 1.4, mc))
      const lab = p.marking ? markingPlane(p.marking.split(' '), p.w * 0.86, bd * 0.8, p.h) : null
      if (lab) {
        lab.position.z = 0.6
        out.push(lab)
      }
      break
    }
    case 'soic': {
      const bd = p.d * 0.62
      out.push(box(p.w, p.h, bd, toon(C.chip)))
      const n = Math.max(2, Math.round((p.w / 0.65) * 0.9))
      const mc = toon(C.metal)
      out.push(...legsAlong(n, p.w * 0.86, bd / 2 + (p.d - bd) / 4, 0.3, (p.d - bd) / 2, mc), ...legsAlong(n, p.w * 0.86, -bd / 2 - (p.d - bd) / 4, 0.3, (p.d - bd) / 2, mc))
      pin1(out, p.w, bd, p.h)
      if (p.marking) mark([p.marking], p.w, bd, p.h)
      break
    }
    case 'qfn': {
      out.push(box(p.w, p.h, p.d, toon(C.chip)))
      const n = Math.max(2, Math.round((p.w / 0.5) * 0.7))
      const mc = toon(C.metal)
      const s = p.w * 0.78
      out.push(...legsAlong(n, s, p.d / 2 - 0.02, 0.22, 0.2, mc, 0, 0.12), ...legsAlong(n, s, -p.d / 2 + 0.02, 0.22, 0.2, mc, 0, 0.12))
      out.push(...legsAcross(n, s, p.w / 2 - 0.02, 0.2, 0.22, mc, 0, 0.12), ...legsAcross(n, s, -p.w / 2 + 0.02, 0.2, 0.22, mc, 0, 0.12))
      pin1(out, p.w, p.d, p.h)
      if (p.marking) mark(p.marking.split(' / ')[0].split(' '), p.w, p.d, p.h)
      break
    }
    case 'qfp': {
      const bw = p.w - 2
      const bd = p.d - 2
      out.push(box(bw, p.h, bd, toon(C.chip), 0, 0.1))
      const n = Math.max(4, Math.round((bw / 0.5) * 0.75))
      const mc = toon(C.metal)
      const s = bw * 0.88
      out.push(...legsAlong(n, s, bd / 2 + 0.5, 0.2, 1.0, mc), ...legsAlong(n, s, -bd / 2 - 0.5, 0.2, 1.0, mc))
      out.push(...legsAcross(n, s, bw / 2 + 0.5, 1.0, 0.2, mc), ...legsAcross(n, s, -bw / 2 - 0.5, 1.0, 0.2, mc))
      pin1(out, bw, bd, p.h + 0.1)
      if (p.marking) mark(p.marking.split(' '), bw, bd, p.h + 0.1)
      break
    }
    case 'dip': {
      out.push(box(p.w, 3.2, p.d, toon(C.socket)))
      out.push(box(p.w - 0.8, p.h - 3.2, p.d - 1.4, toon(C.chip), 0, 3.2))
      const mc = toon(C.metal)
      const n = Math.round(p.w / 2.54)
      out.push(...legsAlong(n, (n - 1) * 2.54, p.d / 2 - 0.4, 0.5, 0.7, mc, 2.8, 1.6), ...legsAlong(n, (n - 1) * 2.54, -p.d / 2 + 0.4, 0.5, 0.7, mc, 2.8, 1.6))
      const notch = cyl(0.8, 0.1, toon('#18181c'), -p.w / 2 + 1.2, p.h, 0, 18)
      out.push(notch)
      if (p.marking) mark([p.marking], p.w * 0.7, p.d - 1.4, p.h)
      break
    }
    case 'crystal':
      out.push(box(p.w, p.h * 0.25, p.d, toon(C.chipLight)), box(p.w * 0.92, p.h * 0.75, p.d * 0.86, toon(C.metal), 0, p.h * 0.25))
      if (p.marking) mark([p.marking], p.w * 0.9, p.d * 0.86, p.h, '#555a61')
      break
    case 'resonator':
      out.push(box(p.w, p.h, p.d, toon('#b88a52')))
      if (p.marking) mark([p.marking], p.w, p.d, p.h, '#3a2a14')
      break
    case 'inductor':
      out.push(box(p.w, p.h, p.d, toon('#3d3d44')))
      if (p.marking) mark([p.marking], p.w, p.d, p.h)
      break
    case 'electrolytic': {
      const r = Math.min(p.w, p.d) / 2
      out.push(box(p.w, 0.8, p.d, toon(C.black)))
      out.push(cyl(r * 0.96, p.h - 0.8, toon('#cfd3d8'), 0, 0.8))
      out.push(cyl(r * 0.97, 0.06, toon('#a8adb4'), 0, p.h - 0.05))
      // − stripe on the can's side
      const stripe = box(r * 0.5, p.h - 1.4, 0.12, toon('#25356e'), 0, 1.0, r * 0.95)
      out.push(stripe)
      const cross = markingPlane(['+'], r * 1.2, r * 1.2, p.h, '#8d939b', '800')
      if (cross) out.push(cross)
      break
    }
    case 'dcjack':
      out.push(box(p.w, p.h, p.d, toon(C.black)), mouth(p, ctx.outward ?? { x: -1, z: 0 }, true))
      break
    case 'usbb':
    case 'usbmicro':
    case 'usbmini':
      out.push(box(p.w, p.h, p.d, toon(C.metal)), mouth(p, ctx.outward ?? { x: -1, z: 0 }, false))
      break
    case 'button': {
      const white = /BOOTSEL/i.test(p.name)
      out.push(box(p.w, p.h * 0.5, p.d, toon(p.w >= 5 ? C.metal : C.black)))
      out.push(box(p.w * 0.94, p.h * 0.12, p.d * 0.94, toon(C.metalDark), 0, p.h * 0.5))
      out.push(cyl(Math.min(p.w, p.d) * 0.3, p.h * 0.38, toon(white ? C.white : '#26262c'), 0, p.h * 0.62, 0, 24))
      break
    }
    case 'header-f': {
      out.push(box(p.w, p.h, p.d, toon(C.black)))
      const holeMat = toon('#0a0a0d')
      for (const pin of ctx.pins) out.push(box(0.9, 0.06, 0.9, holeMat, pin.x, p.h, pin.z))
      break
    }
    case 'header-m': {
      out.push(box(p.w, p.h, p.d, toon(C.black)))
      const pm = toon(C.gold)
      for (const pin of ctx.pins) out.push(box(0.64, 6, 0.64, pm, pin.x, p.h, pin.z), box(0.4, 0.4, 0.4, pm, pin.x, p.h + 6, pin.z))
      break
    }
    case 'header-down': {
      const strip = box(p.w, p.h, p.d, toon(C.black), 0, -ctx.t - p.h)
      out.push(strip)
      const pm = toon(C.gold)
      for (const pin of ctx.pins) out.push(box(0.64, 6, 0.64, pm, pin.x, -ctx.t - p.h - 6, pin.z), box(1.4, 0.06, 1.4, pm, pin.x, 0, pin.z))
      break
    }
    case 'jumper': {
      const pm = toon(C.gold)
      out.push(box(p.w * 0.42, 0.05, p.d, pm, -p.w * 0.29), box(p.w * 0.42, 0.05, p.d, pm, p.w * 0.29), box(p.w * 0.25, 0.04, 0.25, pm))
      break
    }
    case 'pads': {
      const pm = toon(C.gold)
      for (let i = 0; i < 3; i++) out.push(box(1.6, 0.05, 1.6, pm, -p.w / 2 + 1.27 + i * 2.54))
      break
    }
    case 'module': {
      out.push(box(p.w, 0.8, p.d, toon('#23232b')))
      const canW = p.w - 7.2
      out.push(box(canW, p.h - 0.8, p.d - 1.2, toon(C.metal), -p.w / 2 + canW / 2 + 0.6, 0.8))
      const lab = markingPlane([p.marking ?? '', 'Wi-Fi · BT'], canW * 0.8, (p.d - 1.2) * 0.42, p.h, '#4a4f57', '700')
      if (lab) {
        lab.position.x = -p.w / 2 + canW / 2 + 0.6
        lab.rotation.z = 0
        out.push(lab)
      }
      break
    }
    case 'antenna': {
      const m = antennaPlane(p.w, p.d)
      out.push(m)
      break
    }
    case 'none':
      break
    default:
      out.push(box(p.w, p.h, p.d, toon(C.chip)))
  }
  return out
}

const LED_COLORS: Record<string, string> = { red: '#ff4a3d', green: '#3ddc6a', blue: '#3d8bff', yellow: '#ffd34d', amber: '#ffab2e' }

/** "10K" → "103", "1K" → "102", "22R" → "22R0"-style codes the way chip resistors print them */
export function resCode(v: string): string {
  const m = /^([\d.]+)\s*([RKMkm]?)(\d*)$/.exec(v.replace('Ω', ''))
  if (!m) return v
  let ohms = Number(m[1]) * ({ R: 1, K: 1e3, k: 1e3, M: 1e6, m: 1e6 } as Record<string, number>)[m[2] || 'R']
  if (m[3]) ohms += Number(`0.${m[3]}`) * ({ R: 1, K: 1e3, k: 1e3, M: 1e6, m: 1e6 } as Record<string, number>)[m[2] || 'R']
  if (ohms === 0) return '0'
  if (ohms < 10) return `${ohms}`.replace('.', 'R')
  const exp = Math.floor(Math.log10(ohms)) - 1
  const sig = Math.round(ohms / 10 ** exp)
  return `${sig}${exp}`
}

function pin1(out: THREE.Object3D[], w: number, d: number, h: number): void {
  const dot = cyl(Math.min(w, d) * 0.07, 0.03, toon('#55555e'), -w / 2 + Math.min(w, d) * 0.18, h, -d / 2 + Math.min(w, d) * 0.18, 16)
  out.push(dot)
}

function antennaPlane(w: number, d: number): THREE.Mesh {
  const px = 40
  const c = document.createElement('canvas')
  c.width = Math.ceil(w * px)
  c.height = Math.ceil(d * px)
  const g = c.getContext('2d')!
  g.strokeStyle = '#d9b45a'
  g.lineWidth = 0.55 * px
  g.lineJoin = 'miter'
  g.beginPath()
  // meander: down and up across the width, as on the WROOM's printed antenna
  const n = 5
  const x0 = 0.6 * px
  const x1 = c.width - 0.6 * px
  for (let i = 0; i <= n; i++) {
    const y = 0.8 * px + ((c.height - 1.6 * px) * i) / n
    if (i === 0) g.moveTo(x0, y)
    g.lineTo(i % 2 ? x0 : x1, y)
    if (i < n) g.lineTo(i % 2 ? x0 : x1, 0.8 * px + ((c.height - 1.6 * px) * (i + 1)) / n)
  }
  g.stroke()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  mat.userData.outlineParameters = { visible: false }
  mat.userData.isLabel = true
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat)
  m.rotation.x = -Math.PI / 2
  m.position.y = 0.06
  return m
}
