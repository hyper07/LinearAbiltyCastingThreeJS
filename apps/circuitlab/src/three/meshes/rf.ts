/**
 * Circuit Lab: procedural meshes for the measurement, filter and wireless
 * parts — bench instruments with live canvas front panels (counter, spectrum
 * analyzer, RMS voltmeter, LCR meter, VNA, power meter, noise source, the
 * USRP B210), antennas on little stands that tilt with their setting, the
 * radio modules (PCB, chips, header pins, trace antennas, wire whips) and the
 * filter parts (ferrite bead, common-mode toroid, π / LC modules).
 * Names are printed as plain text — no makers' logos.
 */
import * as THREE from 'three'
import type { ComponentInstance, ComponentTelemetry } from '../../model/types'
import type { CatalogEntry } from '../../model/catalog'
import { paramOf } from '../../model/catalog'
import { offboardGeometry } from '../../model/breadboard'
import { antennaModel, f0ToLength } from '../../model/rf-data'
import { BuildResult, cachedGeometry, mergeStatic, metal, plastic } from './shared'
import { satinMetal } from './boards'
import { drawReadout, mono, ui } from '../../ui/fonts'

// ------------------------------------------------------------------ helpers

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const g = cachedGeometry(`bx:${w.toFixed(3)}:${h.toFixed(3)}:${d.toFixed(3)}`, () => new THREE.BoxGeometry(w, h, d))
  const m = new THREE.Mesh(g, mat)
  m.position.set(x, y, z)
  return m
}
function cyl(r: number, h: number, mat: THREE.Material, x: number, y: number, z: number, seg = 16, r2 = r): THREE.Mesh {
  const g = cachedGeometry(`cy:${r.toFixed(3)}:${r2.toFixed(3)}:${h.toFixed(3)}:${seg}`, () => new THREE.CylinderGeometry(r2, r, h, seg))
  const m = new THREE.Mesh(g, mat)
  m.position.set(x, y, z)
  return m
}
function tube(points: THREE.Vector3[], r: number, mat: THREE.Material, seg = 24): THREE.Mesh {
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), seg, r, 6, false), mat)
}
function canvasTex(w: number, h: number): { tex: THREE.CanvasTexture; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) return null
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return { tex, ctx }
}
/** a textured plane facing +z (front face) or up */
function face(w: number, h: number, tex: THREE.Texture, x: number, y: number, z: number, up = false): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true }))
  if (up) m.rotation.x = -Math.PI / 2
  m.position.set(x, y, z)
  return m
}
function finish(group: THREE.Object3D, parts: THREE.Object3D[]): void {
  for (const m of mergeStatic(parts)) {
    m.castShadow = true
    m.receiveShadow = true
    group.add(m)
  }
}
function anchorOf(type: string, pins: THREE.Vector3[]): THREE.Vector3 {
  const t = offboardGeometry(type)!.terminals[0]
  return new THREE.Vector3(pins[0].x - t.dx, 0, pins[0].z - t.dz)
}
const gold = () => satinMetal(0xc9a24e)
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
const pget = (comp: ComponentInstance, entry: CatalogEntry) => (k: string) => paramOf(comp.params, entry, k) as number | string | boolean | undefined

/** an SMA jack sticking out of a face along dir (+z front by default) */
function sma(x: number, y: number, z: number, parts: THREE.Object3D[], axis: 'z' | 'x' = 'z', s = 1): void {
  const body = cyl(0.32 * s, 0.9 * s, gold(), x, y, z, 14)
  const nut = cyl(0.42 * s, 0.3 * s, gold(), x, y, z, 6)
  for (const m of [body, nut]) {
    if (axis === 'z') m.rotation.x = Math.PI / 2
    else m.rotation.z = Math.PI / 2
  }
  if (axis === 'z') nut.position.z -= 0.25 * s
  else nut.position.x += 0.25 * s
  parts.push(body, nut)
}

// --------------------------------------------------------- bench instruments

const TITLES: Record<string, string> = {
  freq_counter: 'FREQUENCY COUNTER',
  spectrum_analyzer: 'SPECTRUM ANALYZER',
  rms_voltmeter: 'TRUE RMS VOLTMETER',
  lcr_meter: 'LCR METER',
  vna: 'VECTOR NETWORK ANALYZER',
  rf_power_meter: 'RF POWER METER',
  noise_source: 'NOISE · HUM · RIPPLE',
  usrp_b210: 'USRP B210',
}
const SMA_PORTS = new Set(['spectrum_analyzer:IN', 'rf_power_meter:RF', 'vna:PORT1', 'vna:PORT2', 'usrp_b210:TX/RX A', 'usrp_b210:RX2 A', 'usrp_b210:TX/RX B', 'usrp_b210:RX2 B'])

function drawSpectrumThumb(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, peaks: number[]): void {
  g.strokeStyle = '#ffd84a'
  g.lineWidth = 2
  g.beginPath()
  for (let i = 0; i <= 160; i++) {
    const fx = i / 160
    let v = 0.12 + 0.05 * Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1)
    for (const p of peaks) v = Math.max(v, 0.85 * Math.exp(-(((fx - p) / 0.012) ** 2)))
    const px = x + fx * w
    const py = y + h - v * h
    if (i) g.lineTo(px, py)
    else g.moveTo(px, py)
  }
  g.stroke()
}

export function buildRfBench(comp: ComponentInstance, entry: CatalogEntry, pins: THREE.Vector3[]): BuildResult {
  const geo = offboardGeometry(comp.type)!
  const a = anchorOf(comp.type, pins)
  const W = geo.rect.x1
  const D = geo.rect.z1 - 0.8
  const H = geo.height
  const sdr = comp.type === 'usrp_b210'
  const group = new THREE.Group()
  group.position.copy(a)
  const parts: THREE.Object3D[] = []
  const dark = sdr || comp.type === 'spectrum_analyzer' || comp.type === 'vna'
  const shell = sdr ? satinMetal(0x2c2f34) : plastic(dark ? 0x353a41 : 0xc6c9ce, 0.55)
  parts.push(box(W, H, D, shell, W / 2, H / 2, D / 2))
  if (!sdr) parts.push(box(W - 0.6, 0.25, D - 0.6, plastic(0x2b2e33, 0.6), W / 2, H + 0.12, D / 2))
  else {
    // B210 case: ribbed top, a USB 3 socket at the back
    for (let i = 0; i < 9; i++) parts.push(box(W - 2, 0.12, 0.35, satinMetal(0x3a3e44), W / 2, H + 0.06, 2 + i * ((D - 4) / 8)))
    parts.push(box(2.2, 1.0, 0.6, satinMetal(0x9aa0a8), W - 6, 1.6, -0.25), box(1.6, 0.5, 0.2, plastic(0x2a6cf0, 0.4), W - 6, 1.6, -0.5))
  }
  for (const x of [0.8, W - 0.8]) for (const z of [0.8, D - 0.8]) parts.push(cyl(0.45, 0.3, plastic(0x1a1a1a, 0.9), x, 0.15, z))
  geo.terminals.forEach((t, i) => {
    const name = entry.pins[i]
    if (SMA_PORTS.has(`${comp.type}:${name}`)) sma(t.dx, t.y, D + 0.35, parts, 'z', sdr ? 1.1 : 1)
    else if (/GND|LO/.test(name)) {
      const post = cyl(0.34, 0.8, plastic(0x1d1d1d, 0.4), t.dx, t.y, D + 0.2)
      post.rotation.x = Math.PI / 2
      parts.push(post)
    } else {
      const sock = cyl(0.42, 0.9, satinMetal(0xb9bec4), t.dx, t.y, D + 0.1)
      sock.rotation.x = Math.PI / 2
      const ring = cyl(0.5, 0.12, plastic(name === 'OUT' ? 0xd23a2e : 0xe8c21f, 0.4), t.dx, t.y, D + 0.02)
      ring.rotation.x = Math.PI / 2
      parts.push(sock, ring)
    }
  })
  finish(group, parts)
  const PX = 48
  const panel = canvasTex(Math.round(W * PX), Math.round(H * PX))
  if (panel) group.add(face(W, H, panel.tex, W / 2, H / 2, D + 0.006))
  // B210: its name and port labels on the top as well
  let top: ReturnType<typeof canvasTex> = null
  if (sdr) {
    top = canvasTex(Math.round(W * 24), Math.round(D * 24))
    if (top) {
      const g = top.ctx
      g.fillStyle = 'rgba(0,0,0,0)'
      g.clearRect(0, 0, g.canvas.width, g.canvas.height)
      g.fillStyle = '#d9dde3'
      g.font = ui(700, 44)
      g.fillText('USRP B210', 40, 70)
      g.font = ui(500, 22)
      g.fillStyle = '#9aa3ad'
      g.fillText('70 MHz – 6 GHz · 2×2 MIMO · 56 MHz · USB 3', 40, 104)
      top.tex.needsUpdate = true
      group.add(face(W, D, top.tex, W / 2, H + 0.14, D / 2, true))
    }
  }
  let last = ''
  const draw = (t: ComponentTelemetry | null) => {
    if (!panel) return
    const x = t?.extra ?? {}
    const reading = t?.reading ?? ''
    const key = `${reading}|${JSON.stringify(x)}`
    if (key === last) return
    last = key
    const g = panel.ctx
    const cw = g.canvas.width
    const ch = g.canvas.height
    g.textAlign = 'left'
    g.textBaseline = 'alphabetic'
    g.fillStyle = sdr ? '#2c2f34' : dark ? '#353a41' : '#cfd2d6'
    g.fillRect(0, 0, cw, ch)
    const ink = sdr || dark ? '#e9edf2' : '#2a2d31'
    g.fillStyle = ink
    g.font = ui(700, sdr ? 26 : 20)
    g.fillText(TITLES[comp.type] ?? entry.label.toUpperCase(), 14, 26)
    const dw = sdr ? cw * 0.42 : comp.type === 'spectrum_analyzer' || comp.type === 'vna' ? cw * 0.58 : cw * 0.6
    const dh = Math.max(40, ch * (sdr ? 0.34 : 0.5))
    const dx = 14
    const dy = 38
    if (sdr) {
      // status LEDs and the port labels
      const leds: [string, boolean, string][] = [
        ['TX', !!x.txOn, '#ff453a'],
        ['RX A', Number.isFinite(Number(x.rxaDbm)) && x.rxaDbm !== null, '#30d158'],
        ['RX B', Number.isFinite(Number(x.rxbDbm)) && x.rxbDbm !== null, '#30d158'],
        ['OVLD', !!x.overload, '#ff9f0a'],
      ]
      leds.forEach(([name, on, col], i) => {
        g.fillStyle = on ? col : '#4a4f57'
        g.beginPath()
        g.arc(cw * 0.5 + i * 58, 40, 8, 0, Math.PI * 2)
        g.fill()
        g.fillStyle = '#9aa3ad'
        g.font = ui(600, 13)
        g.fillText(name, cw * 0.5 + i * 58 - 14, 64)
      })
      g.fillStyle = '#7fe0ff'
      g.font = mono(600, 18)
      g.fillText(reading, dx, 62)
    } else {
      g.fillStyle = comp.type === 'spectrum_analyzer' || comp.type === 'vna' ? '#0b1a12' : '#12202a'
      g.fillRect(dx, dy, dw, dh)
      if (comp.type === 'spectrum_analyzer') {
        g.strokeStyle = '#1f3a2a'
        g.lineWidth = 1
        for (let i = 1; i < 10; i++) {
          g.beginPath()
          g.moveTo(dx + (dw * i) / 10, dy)
          g.lineTo(dx + (dw * i) / 10, dy + dh)
          g.stroke()
        }
        drawSpectrumThumb(g, dx, dy, dw, dh, Number.isFinite(Number(x.inputDbm)) && Number(x.inputDbm) > -80 ? [0.3, 0.6] : [])
        g.fillStyle = '#9ad7ab'
        g.font = mono(500, 14)
        g.fillText(reading, dx + 6, dy + 16)
      } else if (comp.type === 'vna') {
        // a little Smith chart
        const r = dh * 0.42
        const cx = dx + dw * 0.3
        const cy = dy + dh / 2
        g.strokeStyle = '#3c6e52'
        g.lineWidth = 1.5
        g.beginPath()
        g.arc(cx, cy, r, 0, Math.PI * 2)
        g.stroke()
        for (const k of [0.33, 0.6]) {
          g.beginPath()
          g.arc(cx + r * k, cy, r * (1 - k), 0, Math.PI * 2)
          g.stroke()
        }
        g.beginPath()
        g.moveTo(cx - r, cy)
        g.lineTo(cx + r, cy)
        g.stroke()
        g.fillStyle = '#9ad7ab'
        g.font = mono(500, 14)
        g.fillText(reading.slice(0, 22), dx + dw * 0.58, cy + 5)
      } else if (comp.type === 'noise_source') {
        g.strokeStyle = '#ffd84a'
        g.lineWidth = 2
        g.beginPath()
        for (let i = 0; i <= 80; i++) {
          const px = dx + (dw * i) / 80
          const py = dy + dh / 2 + Math.sin(i * 0.4) * dh * 0.2 + (((i * 7919) % 13) / 13 - 0.5) * dh * 0.25
          if (i) g.lineTo(px, py)
          else g.moveTo(px, py)
        }
        g.stroke()
        g.fillStyle = '#7fe0ff'
        g.font = mono(600, 15)
        g.fillText(reading, dx + 6, dy + dh - 8)
      } else {
        g.fillStyle = comp.type === 'rf_power_meter' ? '#ffb340' : '#7fe0ff'
        g.textBaseline = 'middle'
        const txt = reading || '----'
        if (/^[-+0-9. ]+\s*[^\s]*$/.test(txt.replace(/^([-+]?[0-9.]+) /, '$1'))) {
          const t2 = txt.replace(/ /, '')
          drawReadout(g, t2, dx + dw - 10, dy + dh / 2 + 2, Math.min(40, dh * 0.55, (dw - 24) / (t2.length * 0.62)), 'right')
        }
        else {
          g.font = mono(600, Math.min(22, dh * 0.4))
          g.fillText(txt, dx + 8, dy + dh / 2)
        }
        g.textBaseline = 'alphabetic'
      }
    }
    // knobs
    if (!sdr) {
      g.fillStyle = dark ? '#1d2025' : '#25282c'
      const kx = dx + dw + 30
      for (let i = 0; i < 3; i++) {
        g.beginPath()
        g.arc(kx + (i % 2) * 48, 58 + Math.floor(i / 2) * 46, 16, 0, Math.PI * 2)
        g.fill()
      }
    }
    // terminal labels
    g.fillStyle = ink
    g.font = ui(600, sdr ? 15 : 14)
    g.textAlign = 'center'
    geo.terminals.forEach((tt, i) => g.fillText(entry.pins[i], tt.dx * PX, ch - (tt.y * PX + (sdr ? 30 : 24))))
    g.textAlign = 'left'
    panel.tex.needsUpdate = true
  }
  draw(null)
  return { object: group, pinWorld: pins.map((p) => p.clone()), update: (_c, _e, t) => draw(t) }
}

// ------------------------------------------------------------------ antennas

/** real length in plan units (0.1"), clamped so a 433 MHz part still fits the bench */
const unitsOfCm = (cm: number, max = 44) => Math.min(max, Math.max(3, cm / 0.254))

export function buildAntenna(comp: ComponentInstance, entry: CatalogEntry, pins: THREE.Vector3[]): BuildResult {
  const geo = offboardGeometry(comp.type)!
  const a = anchorOf(comp.type, pins)
  const group = new THREE.Group()
  group.position.copy(a)
  const p = pget(comp, entry)
  const model = antennaModel(comp.type, p)
  const lambdaCm = model ? (299792458 / model.f0) * 100 : 70
  const parts: THREE.Object3D[] = []
  const r = geo.rect
  const cx = (r.x0 + r.x1) / 2
  const cz = (r.z0 + r.z1) / 2
  // the SMA jack at the back, where the feed terminals are
  const base = plastic(0x24272c, 0.6)
  const copper = satinMetal(0xc27a3a)
  const steel = metal(0xcfd3d8, 0.35)
  const fr4 = plastic(0x2f6b3a, 0.6)
  const feedY = geo.terminals[0].y
  const tiltable = new THREE.Group()
  let pivotY = 6
  switch (comp.type) {
    case 'ant_dipole':
    case 'ant_monopole': {
      const lenCm = num(p('length'), comp.type === 'ant_dipole' ? 32.8 : 16.4)
      const L = unitsOfCm(lenCm, comp.type === 'ant_dipole' ? 44 : 30)
      parts.push(box(4, 1, 4, base, cx, 0.5, cz), cyl(0.35, 4, steel, cx, 3, cz))
      sma(0.1, feedY, 2, parts, 'x')
      if (comp.type === 'ant_dipole') {
        pivotY = 5 + L / 2
        parts.push(cyl(0.35, pivotY - 4, steel, cx, 4 + (pivotY - 4) / 2, cz))
        tiltable.add(cyl(0.14, L / 2 - 0.3, steel, 0, L / 4 + 0.3, 0), cyl(0.14, L / 2 - 0.3, steel, 0, -L / 4 - 0.3, 0), box(0.9, 0.6, 0.9, plastic(0x111111, 0.5), 0, 0, 0))
      } else {
        pivotY = 5
        tiltable.add(cyl(0.16, L, steel, 0, L / 2, 0))
        // four drooping radials
        for (let k = 0; k < 4; k++) {
          const ang = (k * Math.PI) / 2 + Math.PI / 4
          const r = Math.min(L * 0.75, 9)
          tiltable.add(tube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(ang) * r * 0.5, -0.6, Math.sin(ang) * r * 0.5), new THREE.Vector3(Math.cos(ang) * r, -Math.min(3.6, r * 0.55), Math.sin(ang) * r)], 0.09, steel, 8))
        }
      }
      break
    }
    case 'ant_rubber_duck':
    case 'ant_pcb_ifa': {
      parts.push(box(3, 1.4, 3, base, cx, 0.7, cz))
      sma(0.1, feedY, 2, parts, 'x')
      pivotY = 1.6
      if (comp.type === 'ant_rubber_duck') {
        const L = Math.min(22, Math.max(8, lambdaCm / 2 / 0.254 * 0.6))
        tiltable.add(cyl(0.45, 1.2, gold(), 0, 0.6, 0, 14), cyl(0.5, 1.2, plastic(0x151515, 0.5), 0, 1.8, 0, 14), cyl(0.42, L, plastic(0x161616, 0.45), 0, 2.4 + L / 2, 0, 14, 0.28))
      } else {
        const board = box(0.16, 5.6, 2.4, fr4, 0, 2.8, 0)
        tiltable.add(board, box(0.04, 0.3, 1.8, copper, 0.1, 5.1, 0), box(0.04, 1.4, 0.25, copper, 0.1, 4.3, -0.7), box(0.04, 1.4, 0.25, copper, 0.1, 4.3, -0.15), box(0.04, 2.6, 2.4, copper, 0.1, 1.3, 0))
      }
      break
    }
    case 'ant_patch': {
      parts.push(box(3, 1, 3, base, 1.5, 0.5, cz), cyl(0.3, 3, steel, 1.5, 2.5, cz))
      sma(0.1, feedY, 2, parts, 'x')
      pivotY = 4.5
      const s = Math.min(8, Math.max(3, (lambdaCm / 2 / 0.254) * 0.5))
      tiltable.add(box(0.2, s * 1.6, s * 1.6, fr4, 1.6, 0, 0), box(0.06, s * 0.9, s * 0.9, copper, 1.75, 0, 0), box(0.06, s * 0.35, 0.2, copper, 1.75, -s * 0.6, 0))
      break
    }
    case 'ant_yagi': {
      const n = Math.max(3, Math.min(12, Math.round(num(p('elements'), 3))))
      const boom = r.x1 - 1
      parts.push(box(3, 1, 3, base, 1.5, 0.5, cz), cyl(0.3, 5, steel, 1.5, 3, cz))
      sma(0.1, feedY, 2, parts, 'x')
      pivotY = 6
      const boomM = cyl(0.25, boom, plastic(0xd9dce0, 0.5), boom / 2 + 0.5, 0, 0)
      boomM.rotation.z = Math.PI / 2
      tiltable.add(boomM)
      const half = Math.min(10, unitsOfCm(lambdaCm / 2, 40) / 2)
      for (let k = 0; k < n; k++) {
        const x = 1 + (k * (boom - 1.5)) / (n - 1)
        const len = 2 * half * (k === 0 ? 1.05 : k === 1 ? 0.96 : 0.9 - 0.012 * k)
        tiltable.add(cyl(0.11, len, steel, x, 0, 0))
        if (k === 1) tiltable.add(box(0.6, 0.8, 0.6, plastic(0x111111, 0.5), x, 0, 0))
      }
      break
    }
    case 'ant_helical': {
      parts.push(box(3, 1, 3, base, 1.5, 0.5, cz), cyl(0.3, 3, steel, 1.5, 2.5, cz))
      sma(0.1, feedY, 2, parts, 'x')
      pivotY = 5
      const plate = cyl(4, 0.2, satinMetal(0xb8bcc2), 1.4, 0, 0, 28)
      plate.rotation.z = Math.PI / 2
      tiltable.add(plate)
      const turns = 10
      const len = r.x1 - 2
      const pts: THREE.Vector3[] = []
      for (let i = 0; i <= turns * 24; i++) {
        const th = (i / 24) * Math.PI * 2
        pts.push(new THREE.Vector3(1.6 + (i / (turns * 24)) * len, Math.cos(th) * 1.7, Math.sin(th) * 1.7))
      }
      tiltable.add(tube(pts, 0.12, copper, turns * 24))
      break
    }
    case 'ant_loop': {
      parts.push(box(3, 1, 3, base, 1.5, 0.5, cz), cyl(0.3, 2.5, steel, 1.5, 2.25, cz))
      sma(0.1, feedY, 2, parts, 'x')
      pivotY = 7
      const ring = new THREE.Mesh(cachedGeometry('loop-ring', () => new THREE.TorusGeometry(3.2, 0.22, 10, 40)), copper)
      // the loop lies in the plane of its front axis (x) and up (y)
      ring.position.set(1.5, 0, 0)
      tiltable.add(ring, box(0.8, 0.8, 0.6, plastic(0x2a5bd7, 0.4), 1.5, -3.2, 0))
      break
    }
    case 'ant_horn': {
      parts.push(box(3, 1, 4, base, 2, 0.5, cz), cyl(0.3, 2.5, steel, 2, 2.25, cz))
      sma(0.1, feedY, 2, parts, 'x')
      pivotY = 4.5
      const flare = new THREE.Mesh(
        cachedGeometry('horn-flare', () => {
          const g = new THREE.CylinderGeometry(4.2, 1.2, 7, 4, 1, true)
          g.rotateY(Math.PI / 4)
          g.rotateZ(-Math.PI / 2)
          return g
        }),
        new THREE.MeshPhysicalMaterial({ color: 0xc9ccd1, metalness: 0.85, roughness: 0.5, side: THREE.DoubleSide }),
      )
      flare.position.set(6.5, 0, 0)
      tiltable.add(box(3, 1.4, 1.8, satinMetal(0xc9ccd1), 1.6, 0, 0), flare)
      break
    }
  }
  finish(group, parts)
  tiltable.position.set(comp.type === 'ant_dipole' || comp.type === 'ant_monopole' ? cx : 0, pivotY, cz)
  tiltable.traverse((o) => {
    o.castShadow = true
  })
  group.add(tiltable)
  const apply = (c: ComponentInstance) => {
    const tilt = num(paramOf(c.params, entry, 'tilt'), 0)
    tiltable.rotation.x = (-tilt * Math.PI) / 180
  }
  apply(comp)
  return { object: group, pinWorld: pins.map((q) => q.clone()), update: (c) => apply(c) }
}

// ------------------------------------------------------------- radio modules

const MODULE_LOOK: Record<string, { pcb: number; label: string; chip: string }> = {
  nrf24l01: { pcb: 0x1b5e3a, label: 'nRF24L01+', chip: 'nRF24L01+' },
  hc05: { pcb: 0x1d4fa3, label: 'HC-05', chip: 'BT' },
  rfm95: { pcb: 0x1d1f24, label: 'RFM95W LoRa', chip: 'SX1276' },
  tx433: { pcb: 0x2b7a3d, label: 'FS1000A', chip: '433' },
  rx433: { pcb: 0x2b7a3d, label: 'XY-MK-5V', chip: 'RX' },
}

export function buildRadioModule(comp: ComponentInstance, entry: CatalogEntry, pins: THREE.Vector3[]): BuildResult {
  const geo = offboardGeometry(comp.type)!
  const a = anchorOf(comp.type, pins)
  const group = new THREE.Group()
  group.position.copy(a)
  const look = MODULE_LOOK[comp.type]
  const p = pget(comp, entry)
  const r = geo.rect
  const W = r.x1 - r.x0
  const D = r.z1 - r.z0
  const cx = (r.x0 + r.x1) / 2
  const cz = (r.z0 + r.z1) / 2
  const parts: THREE.Object3D[] = []
  const pcbY = 0.7
  parts.push(box(W, 0.16, D, plastic(look.pcb, 0.6), cx, pcbY, cz))
  // standoffs so it sits level on the bench
  for (const x of [r.x0 + 0.5, r.x1 - 0.5]) for (const z of [r.z0 + 0.5, r.z1 - 0.5]) parts.push(cyl(0.3, pcbY - 0.08, plastic(0x111111, 0.8), x, (pcbY - 0.08) / 2, z))
  const copper = satinMetal(0xc9a24e)
  // header pins at the terminals (male pins pointing up)
  geo.terminals.forEach((t, i) => {
    if (entry.pins[i] === 'ANT') {
      parts.push(box(0.8, 0.05, 0.8, copper, t.dx - 0.3 * t.exitDir.x, pcbY + 0.1, t.dz - 0.3 * t.exitDir.z))
      return
    }
    parts.push(box(0.25, 0.25, 0.25, plastic(0x161616, 0.6), t.dx, pcbY + 0.2, t.dz), box(0.07, 1.1, 0.07, copper, t.dx, pcbY + 0.6, t.dz))
  })
  const chipMat = plastic(0x18181b, 0.45)
  switch (comp.type) {
    case 'nrf24l01': {
      parts.push(box(1.6, 0.25, 1.6, chipMat, 4.2, pcbY + 0.2, 3), box(1.1, 0.35, 0.5, satinMetal(0xc8ccd2), 6.2, pcbY + 0.25, 1.4))
      // meander trace antenna at the far end
      for (let k = 0; k < 5; k++) parts.push(box(0.12, 0.03, 4.6, copper, 8 + k * 0.6, pcbY + 0.1, 3))
      break
    }
    case 'hc05': {
      parts.push(box(8, 0.16, 5, plastic(0x2f7d3a, 0.55), 8.6, pcbY + 0.17, cz), box(2, 0.3, 2, chipMat, 6.5, pcbY + 0.4, cz), box(1.3, 0.3, 1.3, chipMat, 9.2, pcbY + 0.4, cz - 0.6))
      for (let k = 0; k < 4; k++) parts.push(box(0.12, 0.03, 3.6, copper, 11.2 + k * 0.6, pcbY + 0.27, cz))
      parts.push(box(1.2, 0.5, 0.8, plastic(0x30343a, 0.5), 2.2, pcbY + 0.3, cz), box(0.5, 0.2, 0.5, plastic(0xd23a2e, 0.4), 3.2, pcbY + 0.2, 1.2))
      break
    }
    case 'rfm95': {
      parts.push(box(6.3, 0.35, 6.3, satinMetal(0x7d848c), 5, pcbY + 0.26, cz), box(0.8, 0.12, 0.3, copper, 9.4, pcbY + 0.14, 4.5))
      break
    }
    case 'tx433': {
      parts.push(box(1.3, 0.6, 1.3, satinMetal(0xb6bcc4), 3.8, pcbY + 0.4, 3.2), box(0.8, 0.4, 0.8, chipMat, 5.6, pcbY + 0.3, 5.2))
      break
    }
    case 'rx433': {
      parts.push(box(1.2, 0.35, 0.8, chipMat, 4.5, pcbY + 0.25, 3.2), cyl(0.6, 0.7, plastic(0x3557b8, 0.5), 7.5, pcbY + 0.4, 3), cyl(0.5, 1.2, plastic(0x1a1a1a, 0.5), 9.5, pcbY + 0.65, 3.4))
      for (let k = 0; k < 6; k++) parts.push(cyl(0.35, 0.1, copper, 2 + k * 1.3, pcbY + 0.12, 1.2))
      break
    }
  }
  finish(group, parts)
  // the λ/4 whip soldered to ANT (tilts with its setting)
  const whip = new THREE.Group()
  const antSel = String(p('antenna') ?? '')
  if (antSel.startsWith('λ/4')) {
    const ti = entry.pins.indexOf('ANT')
    const t = geo.terminals[ti]
    const lenCm = comp.type === 'rfm95' ? f0ToLength(String(p('band')) === '868 MHz' ? 868.1e6 : 915e6, 4) : 17.3
    const L = unitsOfCm(lenCm, 30)
    whip.position.set(t.dx - 0.3 * t.exitDir.x, pcbY + 0.1, t.dz - 0.3 * t.exitDir.z)
    whip.add(cyl(0.07, L, satinMetal(0xd08a4a), 0, L / 2, 0, 6))
    group.add(whip)
  }
  // silkscreen name + a status LED
  const silk = canvasTex(256, 64)
  if (silk) {
    silk.ctx.clearRect(0, 0, 256, 64)
    silk.ctx.fillStyle = '#f2f2f2'
    silk.ctx.font = ui(700, 30)
    silk.ctx.fillText(look.label, 8, 42)
    silk.tex.needsUpdate = true
    const lw = Math.min(W * 0.55, 6)
    const m = face(lw, lw / 4, silk.tex, comp.type === 'hc05' ? 2.6 : cx, pcbY + 0.1, comp.type === 'tx433' || comp.type === 'rx433' ? r.z1 - 1.6 : r.z0 + 0.9, true)
    group.add(m)
  }
  const led = new THREE.Mesh(cachedGeometry('rf-led', () => new THREE.BoxGeometry(0.45, 0.2, 0.3)), new THREE.MeshStandardMaterial({ color: 0x401010, emissive: 0x000000 }))
  led.position.set(comp.type === 'hc05' ? 3.2 : r.x1 - 1.2, pcbY + 0.18, comp.type === 'hc05' ? 1.2 : r.z1 - 0.8)
  group.add(led)
  const update = (c: ComponentInstance, _e: CatalogEntry, t: ComponentTelemetry | null) => {
    const tilt = num(paramOf(c.params, entry, 'tilt'), 0)
    whip.rotation.x = (-tilt * Math.PI) / 180
    const x = t?.extra ?? {}
    const on = !!x.txOn || !!x.link
    const mat = led.material as THREE.MeshStandardMaterial
    const col = x.txOn ? 0xff3b30 : 0x30d158
    mat.emissive.setHex(on ? col : 0x000000)
    mat.emissiveIntensity = on ? 2 : 0
  }
  update(comp, entry, null)
  return { object: group, pinWorld: pins.map((q) => q.clone()), update }
}

// -------------------------------------------------------------------- filters

/** ferrite bead on a wire between its two holes */
export function buildFerrite(_comp: ComponentInstance, _entry: CatalogEntry, pins: THREE.Vector3[]): BuildResult {
  const group = new THREE.Group()
  const [a, b] = pins
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5)
  const len = Math.max(0.6, a.distanceTo(b))
  const ang = Math.atan2(b.z - a.z, b.x - a.x)
  const h = 0.75
  const parts: THREE.Object3D[] = []
  const wire = metal(0xcfd3d8, 0.35)
  const frame = new THREE.Group()
  frame.position.set(mid.x, 0, mid.z)
  frame.rotation.y = -ang
  const L = Math.min(1.6, len - 0.4)
  const bead = cyl(0.4, L, plastic(0x3b3d42, 0.35, 0.3), 0, h, 0, 18)
  bead.rotation.z = Math.PI / 2
  frame.add(bead)
  const lead = (s: number) => {
    const x0 = (s * L) / 2
    const x1 = (s * len) / 2
    frame.add(tube([new THREE.Vector3(x0, h, 0), new THREE.Vector3((x0 + x1) / 2, h, 0), new THREE.Vector3(x1, h * 0.7, 0), new THREE.Vector3(x1, 0.2, 0), new THREE.Vector3(x1, -0.18, 0)], 0.05, wire, 12))
  }
  lead(-1)
  lead(1)
  parts.push(frame)
  finish(group, parts)
  return { object: group, pinWorld: pins.map((p) => p.clone()) }
}

/** common-mode choke: a toroid standing over the channel with two windings and four legs */
export function buildCmChoke(_comp: ComponentInstance, _entry: CatalogEntry, pins: THREE.Vector3[]): BuildResult {
  const group = new THREE.Group()
  const c = pins.reduce((acc, p) => acc.add(p), new THREE.Vector3()).multiplyScalar(1 / pins.length)
  const parts: THREE.Object3D[] = []
  const R = 1.35
  const core = new THREE.Mesh(cachedGeometry('cmc-core', () => new THREE.TorusGeometry(R, 0.55, 14, 36)), plastic(0x2b2c30, 0.4, 0.1))
  core.position.set(c.x, R + 0.9, c.z)
  parts.push(core)
  parts.push(box(3.6, 0.5, 2.2, plastic(0x1a1a1a, 0.7), c.x, 0.25, c.z))
  const cu = satinMetal(0xc27a3a)
  // two windings on opposite halves of the ring
  for (const side of [0, 1]) {
    for (let k = 0; k < 9; k++) {
      const th = (side ? Math.PI : 0) + Math.PI * 0.12 + (k / 8) * Math.PI * 0.76
      const turn = new THREE.Mesh(cachedGeometry('cmc-turn', () => new THREE.TorusGeometry(0.6, 0.07, 4, 10)), cu)
      turn.position.set(c.x + Math.cos(th) * R, R + 0.9 + Math.sin(th) * R, c.z)
      // each turn wraps the core: its axis along the ring's tangent
      turn.rotation.set(Math.PI / 2, 0, 0)
      const holder = new THREE.Object3D()
      holder.position.copy(turn.position)
      turn.position.set(0, 0, 0)
      holder.rotation.z = th
      holder.add(turn)
      parts.push(holder)
    }
  }
  for (const p of pins) parts.push(tube([new THREE.Vector3(p.x, -0.18, p.z), new THREE.Vector3(p.x, 0.5, p.z), new THREE.Vector3((p.x + c.x) / 2, 1.2, (p.z + c.z) / 2)], 0.06, cu, 8))
  finish(group, parts)
  return { object: group, pinWorld: pins.map((p) => p.clone()) }
}

/** π / LC filter module: a little PCB standing on its three pins */
export function buildLcFilter(comp: ComponentInstance, _entry: CatalogEntry, pins: THREE.Vector3[]): BuildResult {
  const group = new THREE.Group()
  const [pa, , pc] = pins
  const mid = pins.reduce((acc, p) => acc.add(p), new THREE.Vector3()).multiplyScalar(1 / pins.length)
  const ang = Math.atan2(pc.z - pa.z, pc.x - pa.x)
  const span = Math.max(2.4, pa.distanceTo(pc) + 1.2)
  const frame = new THREE.Group()
  frame.position.set(mid.x, 0, mid.z)
  frame.rotation.y = -ang
  const parts: THREE.Object3D[] = []
  const pi = comp.type === 'pi_filter'
  const W = Math.max(span, pi ? 4.2 : 3.4)
  frame.add(box(W, 3.8, 0.16, plastic(0x1f4fae, 0.55), 0, 2.7, 0))
  const cap = plastic(0xc9a46a, 0.5)
  const ind = plastic(0x1c1c1e, 0.4)
  if (pi) frame.add(box(0.7, 0.5, 0.5, cap, -W / 2 + 0.8, 1.7, 0.33))
  frame.add(cyl(0.7, 0.6, ind, pi ? 0 : -0.5, 1.8, 0.38, 18))
  frame.children[frame.children.length - 1].rotation.x = Math.PI / 2
  frame.add(box(0.7, 0.5, 0.5, cap, W / 2 - 0.8, 1.7, 0.33))
  parts.push(frame)
  const leg = metal(0xcfd3d8, 0.35)
  for (const p of pins) parts.push(tube([new THREE.Vector3(p.x, -0.18, p.z), new THREE.Vector3(p.x, 0.5, p.z), new THREE.Vector3(p.x, 0.9, p.z)], 0.06, leg, 6))
  finish(group, parts)
  const silk = canvasTex(256, 96)
  if (silk) {
    silk.ctx.clearRect(0, 0, 256, 96)
    silk.ctx.fillStyle = '#f4f4f4'
    silk.ctx.font = ui(700, 34)
    silk.ctx.fillText(pi ? 'π FILTER' : 'LC LPF', 14, 40)
    silk.ctx.font = ui(600, 22)
    silk.ctx.fillText('IN   GND   OUT', 14, 80)
    silk.tex.needsUpdate = true
    const lbl = face(Math.min(W * 0.9, 3.2), Math.min(W * 0.9, 3.2) * 0.375, silk.tex, 0, 3.75, 0.1)
    frame.updateMatrixWorld()
    const holder = new THREE.Group()
    holder.position.copy(frame.position)
    holder.rotation.copy(frame.rotation)
    holder.add(lbl)
    group.add(holder)
  }
  return { object: group, pinWorld: pins.map((p) => p.clone()) }
}

/** dispatch for component-meshes.ts */
export function buildRfPart(shape: string, comp: ComponentInstance, entry: CatalogEntry, pins: THREE.Vector3[]): BuildResult | null {
  switch (shape) {
    case 'rf_bench':
      return buildRfBench(comp, entry, pins)
    case 'rf_antenna':
      return buildAntenna(comp, entry, pins)
    case 'rf_module':
      return buildRadioModule(comp, entry, pins)
    case 'ferrite':
      return pins.length >= 2 ? buildFerrite(comp, entry, pins) : null
    case 'cmchoke':
      return pins.length >= 4 ? buildCmChoke(comp, entry, pins) : null
    case 'lcfilter':
      return pins.length >= 3 ? buildLcFilter(comp, entry, pins) : null
  }
  return null
}
