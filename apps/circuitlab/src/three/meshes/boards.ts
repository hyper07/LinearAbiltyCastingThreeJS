/**
 * Circuit Lab: procedural 3D microcontroller boards in ohmlet's style —
 * real dimensions (1 unit = 0.1"), headers exactly on their pins, PBR
 * materials from shared.ts, silkscreen drawn to a canvas texture.
 *
 *  - Arduino Uno / Mega: teal PCB on the bench, female headers, USB-B,
 *    barrel jack, socketed ATmega, ON / L / TX / RX LEDs.
 *  - Arduino Nano: blue PCB straddling the channel, mini-USB, TQFP chip.
 *  - ESP32 DevKit V1: black PCB, WROOM-32 can + antenna, EN/BOOT, pins up.
 *  - Raspberry Pi Pico: green PCB, castellated edges, RP2040, BOOTSEL.
 *
 * The on-board LED follows the program (telemetry.mcu.led); a damaged pin
 * gets a red marker and the board a warning beacon.
 */
import * as THREE from 'three'
import type { ComponentInstance, ComponentTelemetry } from '../../model/types'
import type { CatalogEntry } from '../../model/catalog'
import { boardDef, ARDUINO_HEADER_Y, ESP32_PIN_Y, type BoardDef } from '../../model/boards'
import { offboardGeometry } from '../../model/breadboard'
import { BuildResult, cachedGeometry, cachedMaterial, mergeStatic, metal, moldedEpoxy, plastic } from './shared'
import { UI_FONT } from '../../ui/fonts'

// ------------------------------------------------------------- primitives

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const g = cachedGeometry(`bx:${w.toFixed(3)}:${h.toFixed(3)}:${d.toFixed(3)}`, () => new THREE.BoxGeometry(w, h, d))
  const m = new THREE.Mesh(g, mat)
  m.position.set(x, y, z)
  return m
}
function cyl(r: number, h: number, mat: THREE.Material, x: number, y: number, z: number, seg = 20): THREE.Mesh {
  const g = cachedGeometry(`cy:${r.toFixed(3)}:${h.toFixed(3)}:${seg}`, () => new THREE.CylinderGeometry(r, r, h, seg))
  const m = new THREE.Mesh(g, mat)
  m.position.set(x, y, z)
  return m
}

/** satin metal for large flat parts (USB shells, RF cans) */
export function satinMetal(color: number): THREE.MeshPhysicalMaterial {
  return cachedMaterial(`satin:${color}`, () => {
    const m = new THREE.MeshPhysicalMaterial({ color, metalness: 0.85, roughness: 0.5 })
    m.envMapIntensity = 0.7
    return m
  })
}

const MAT = {
  headerBlack: () => plastic(0x161616, 0.62),
  socket: () => plastic(0x1c1c1c, 0.5),
  chip: () => moldedEpoxy(0x1b1b1d, 0.45),
  // satin, not mirror: big flat cans must not bloom under the studio HDRI
  steel: () => satinMetal(0x9298a0),
  gold: () => satinMetal(0xc9a24e),
  tin: () => satinMetal(0xb9bdc2),
  white: () => plastic(0xf2f0ea, 0.45),
  smd: () => plastic(0x8a6a4a, 0.5),
  cap: () => plastic(0xc8a36a, 0.5),
}

/** merge the single-material static parts; multi-material meshes (textured tops) go in as they are */
function addStatic(group: THREE.Group, parts: THREE.Object3D[]): void {
  const multi = parts.filter((o) => Array.isArray((o as THREE.Mesh).material))
  for (const m of mergeStatic(parts.filter((o) => !multi.includes(o)))) {
    m.castShadow = true
    m.receiveShadow = true
    group.add(m)
  }
  for (const m of multi) {
    m.castShadow = true
    group.add(m)
  }
}

/** a canvas painted once per key (silkscreen artwork) */
const artCache = new Map<string, THREE.CanvasTexture | null>()
function art(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture | null {
  if (artCache.has(key)) return artCache.get(key) ?? null
  if (typeof document === 'undefined') {
    artCache.set(key, null)
    return null
  }
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) return null
  draw(ctx)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  artCache.set(key, tex)
  return tex
}

/** PCB slab: textured top, plain sides */
function pcb(key: string, w: number, d: number, thick: number, color: number, y: number, x0: number, z0: number, paint: (ctx: CanvasRenderingContext2D, px: number) => void): THREE.Object3D {
  const PX = 48
  const tex = art(`pcb:${key}`, Math.round(w * PX), Math.round(d * PX), (ctx) => paint(ctx, PX))
  const side = cachedMaterial(`pcbside:${color}`, () => new THREE.MeshPhysicalMaterial({ color, roughness: 0.55 }))
  const top = tex
    ? cachedMaterial(`pcbtop:${key}`, () => {
        const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0 })
        m.envMapIntensity = 0.55
        return m
      })
    : side
  // single-material meshes only: the Studio path tracer mis-maps material arrays
  const g = cachedGeometry(`pcbg:${w}:${thick}:${d}`, () => new THREE.BoxGeometry(w, thick, d))
  const slab = new THREE.Mesh(g, side)
  slab.position.set(x0 + w / 2, y + thick / 2, z0 + d / 2)
  slab.castShadow = true
  slab.receiveShadow = true
  const group = new THREE.Group()
  group.add(slab)
  if (top !== side) {
    const face = new THREE.Mesh(cachedGeometry(`pcbtopg:${w}:${d}`, () => new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2)), top)
    face.position.set(x0 + w / 2, y + thick + 0.004, z0 + d / 2)
    face.receiveShadow = true
    group.add(face)
  }
  return group
}

/** draw centered text on a canvas in board units */
function text(ctx: CanvasRenderingContext2D, px: number, s: string, x: number, z: number, size: number, opts: { color?: string; weight?: string; align?: CanvasTextAlign; rotate?: number; font?: string } = {}): void {
  ctx.save()
  ctx.translate(x * px, z * px)
  if (opts.rotate) ctx.rotate(opts.rotate)
  ctx.fillStyle = opts.color ?? '#f4f6f2'
  ctx.font = `${opts.weight ?? '600'} ${size * px}px ${opts.font ?? UI_FONT}`
  ctx.textAlign = opts.align ?? 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(s, 0, 0)
  ctx.restore()
}

function traces(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, seed: number): void {
  let s = seed
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  for (let i = 0; i < 70; i++) {
    ctx.lineWidth = 1.5 + rnd() * 2.5
    let x = rnd() * w
    let y = rnd() * h
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let k = 0; k < 3; k++) {
      if (rnd() < 0.5) x += (rnd() - 0.5) * w * 0.4
      else y += (rnd() - 0.5) * h * 0.4
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(rnd() * w, rnd() * h, 3 + rnd() * 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** female header strip with n square holes, centered at (x, z), along x */
function femaleHeader(n: number, x: number, z: number, y0: number, top: number, alongZ = false): THREE.Object3D[] {
  const h = top - y0
  const len = n
  const tex = art(`fhdr:${n}`, n * 32, 32, (ctx) => {
    ctx.fillStyle = '#191919'
    ctx.fillRect(0, 0, n * 32, 32)
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = '#040404'
      ctx.fillRect(i * 32 + 10, 10, 12, 12)
      ctx.strokeStyle = '#2b2b2b'
      ctx.lineWidth = 2
      ctx.strokeRect(i * 32 + 8, 8, 16, 16)
    }
  })
  const side = MAT.headerBlack()
  const topMat = tex ? cachedMaterial(`fhdrtop:${n}`, () => new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.6 })) : side
  const g = cachedGeometry(`fhdrg:${n}:${h.toFixed(2)}`, () => new THREE.BoxGeometry(len, h, 1))
  const m = new THREE.Mesh(g, side)
  m.position.set(x, y0 + h / 2, z)
  if (alongZ) m.rotation.y = Math.PI / 2
  m.castShadow = true
  if (topMat === side) return [m]
  const face = new THREE.Mesh(cachedGeometry(`fhdrtopg:${n}`, () => new THREE.PlaneGeometry(len, 1).rotateX(-Math.PI / 2)), topMat)
  face.position.set(x, top + 0.004, z)
  if (alongZ) face.rotation.y = Math.PI / 2
  return [m, face]
}

/** male pin header: plastic spacer + square gold pins from yBottom to yTop */
function malePins(points: { x: number; z: number }[], spacerY: number, yBottom: number, yTop: number, spacer = true): THREE.Object3D[] {
  const out: THREE.Object3D[] = []
  const pinGeo = cachedGeometry(`mpin:${(yTop - yBottom).toFixed(2)}`, () => new THREE.BoxGeometry(0.25, yTop - yBottom, 0.25))
  for (const p of points) {
    const m = new THREE.Mesh(pinGeo, MAT.gold())
    m.position.set(p.x, (yTop + yBottom) / 2, p.z)
    out.push(m)
    if (spacer) out.push(box(1, 1, 1, MAT.headerBlack(), p.x, spacerY + 0.5, p.z))
  }
  return out
}

function smdChip(w: number, d: number, h: number, x: number, y: number, z: number, legs: number, legsBothAxes = false): THREE.Object3D[] {
  const out: THREE.Object3D[] = [box(w, h, d, MAT.chip(), x, y + h / 2, z)]
  const leg = MAT.tin()
  for (let i = 0; i < legs; i++) {
    const t = (i + 0.5) / legs - 0.5
    out.push(box(0.12, 0.08, 0.3, leg, x + t * w * 0.9, y + 0.04, z - d / 2 - 0.12))
    out.push(box(0.12, 0.08, 0.3, leg, x + t * w * 0.9, y + 0.04, z + d / 2 + 0.12))
    if (legsBothAxes) {
      out.push(box(0.3, 0.08, 0.12, leg, x - w / 2 - 0.12, y + 0.04, z + t * d * 0.9))
      out.push(box(0.3, 0.08, 0.12, leg, x + w / 2 + 0.12, y + 0.04, z + t * d * 0.9))
    }
  }
  return out
}

function chipLabel(lines: string[], w: number, d: number, x: number, y: number, z: number, rotY = 0): THREE.Mesh | null {
  const tex = art(`chiplbl:${lines.join('|')}:${w}:${d}`, Math.round(w * 64), Math.round(d * 64), (ctx) => {
    ctx.clearRect(0, 0, w * 64, d * 64)
    lines.forEach((l, i) => text(ctx, 64, l, w / 2, d / 2 + (i - (lines.length - 1) / 2) * 0.55, i === 0 ? 0.42 : 0.3, { color: 'rgba(225,225,225,0.85)', weight: '600' }))
  })
  if (!tex) return null
  const mat = cachedMaterial(`chiplblm:${lines.join('|')}:${w}:${d}`, () => new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }))
  const g = cachedGeometry(`plane:${w}:${d}`, () => new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2))
  const m = new THREE.Mesh(g, mat)
  m.position.set(x, y + 0.002, z)
  m.rotation.y = rotY
  m.renderOrder = 2
  return m
}

/** small SMD LED with a glow material updated per frame */
function smdLed(color: number, x: number, y: number, z: number): { mesh: THREE.Mesh; mat: THREE.MeshPhysicalMaterial } {
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xf3efe2, roughness: 0.3, emissive: new THREE.Color(color), emissiveIntensity: 0 })
  const mesh = box(0.42, 0.22, 0.28, mat, x, y + 0.11, z)
  return { mesh, mat }
}

function button(x: number, y: number, z: number, cap = 0x2a2a2a, size = 1.2): THREE.Object3D[] {
  return [box(size, 0.35, size, MAT.steel(), x, y + 0.175, z), cyl(size * 0.28, 0.28, plastic(cap, 0.5), x, y + 0.49, z)]
}

// --------------------------------------------------------------- warning

function beacon(): { group: THREE.Group; set(on: boolean, t: number): void } {
  const group = new THREE.Group()
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.85, depthWrite: false })
  const ring = new THREE.Mesh(cachedGeometry('beaconring', () => new THREE.TorusGeometry(0.75, 0.12, 8, 32).rotateX(Math.PI / 2)), ringMat)
  const dot = new THREE.Mesh(cachedGeometry('beacondot', () => new THREE.SphereGeometry(0.32, 16, 12)), new THREE.MeshBasicMaterial({ color: 0xff453a }))
  group.add(ring, dot)
  group.visible = false
  return {
    group,
    set(on: boolean, t: number) {
      group.visible = on
      if (!on) return
      const k = 0.5 + 0.5 * Math.sin(t * 6)
      ring.scale.setScalar(1 + k * 0.6)
      ringMat.opacity = 0.9 - k * 0.5
    },
  }
}

// ------------------------------------------------------------- Arduinos

function paintArduino(def: BoardDef, widthIn: number) {
  const isMega = def.type === 'arduino_mega'
  return (ctx: CanvasRenderingContext2D, px: number) => {
    const W = widthIn * 10
    const D = 21
    const g = ctx.createLinearGradient(0, 0, W * px, D * px)
    g.addColorStop(0, '#0e8a93')
    g.addColorStop(1, '#0a737b')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W * px, D * px)
    traces(ctx, W * px, D * px, 'rgba(6,90,97,0.75)', isMega ? 7 : 3)
    // mounting holes
    for (const [x, z] of isMega ? [[1.4, 19.0], [15.2, 1.0], [26.6, 19.0], [38.9, 1.0]] : [[1.4, 19.0], [15.2, 1.0], [26.6, 19.0], [26.6, 3.4]]) {
      ctx.fillStyle = '#d8c58c'
      ctx.beginPath()
      ctx.arc(x * px, z * px, 0.75 * px, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#1b1b1b'
      ctx.beginPath()
      ctx.arc(x * px, z * px, 0.5 * px, 0, Math.PI * 2)
      ctx.fill()
    }
    // logo + name
    text(ctx, px, isMega ? 'MEGA 2560' : 'UNO', isMega ? 22 : 15, 9.6, isMega ? 2.2 : 3.0, { weight: '800 italic', font: UI_FONT })
    text(ctx, px, '∞  ARDUINO', isMega ? 22 : 15, isMega ? 12.4 : 12.8, 1.2, { weight: '700' })
    text(ctx, px, 'DIGITAL (PWM~)', isMega ? 17 : 17, 3.2, 0.62, { weight: '700' })
    text(ctx, px, 'POWER', 15, 18.0, 0.6, { weight: '700' })
    text(ctx, px, 'ANALOG IN', isMega ? 26 : 22.5, 18.0, 0.6, { weight: '700' })
    // pin labels next to the headers
    const label = (name: string) => {
      const pwm = Array.isArray(def.pwm) && def.pwm.includes(name)
      if (/^D\d+$/.test(name)) return `${pwm ? '~' : ''}${name.slice(1)}`
      if (name === 'GND2' || name === 'GND3' || name.startsWith('GND')) return 'GND'
      if (name === '3V3') return '3.3V'
      if (name === 'SDA1') return 'SDA'
      if (name === 'SCL1') return 'SCL'
      if (/^5V\d/.test(name)) return '5V'
      return name
    }
    const geo = offboardGeometry(def.type)
    if (geo) {
      def.pins.forEach((name, i) => {
        const t = geo.terminals[i]
        if (!t) return
        if (t.exitDir.z < 0) text(ctx, px, label(name), t.dx, t.dz + 1.25, 0.42, { rotate: -Math.PI / 2, align: 'right' })
        else if (t.exitDir.z > 0) text(ctx, px, label(name), t.dx, t.dz - 1.25, 0.42, { rotate: -Math.PI / 2, align: 'left' })
        else text(ctx, px, label(name), t.dx + (t.dx < 38 ? -0.95 : 0.95), t.dz, 0.3, {})
      })
    }
    text(ctx, px, 'ON', isMega ? 36.2 : 25.4, 8.3, 0.45)
    text(ctx, px, 'L', 10.8, 5.6, 0.45)
    text(ctx, px, 'TX', 10.8, 7.2, 0.4)
    text(ctx, px, 'RX', 10.8, 8.0, 0.4)
    text(ctx, px, 'RESET', 2.0, 4.0, 0.42)
    text(ctx, px, 'ICSP', isMega ? 37.6 : 25.6, 13.6, 0.42)
  }
}

function buildArduino(def: BoardDef, pins: THREE.Vector3[]): BuildResult {
  const isMega = def.type === 'arduino_mega'
  const geo = offboardGeometry(def.type)!
  const ax = pins[0].x - geo.terminals[0].dx
  const az = pins[0].z - geo.terminals[0].dz
  const widthIn = isMega ? 4.0 : 2.7
  const W = widthIn * 10
  const D = 21
  const yPcb = 0.42
  const thick = 0.63
  const top = yPcb + thick
  const group = new THREE.Group()
  group.position.set(ax, 0, az)

  const stat: THREE.Object3D[] = []
  // rubber feet
  for (const [x, z] of [[1.4, 1.4], [W - 1.4, 1.4], [1.4, D - 1.4], [W - 1.4, D - 1.4]]) stat.push(cyl(0.7, yPcb, plastic(0x202020, 0.9), x, yPcb / 2, z, 14))
  // headers grouped as on the real board
  const termAt = (name: string) => {
    const i = def.pins.indexOf(name)
    return geo.terminals[i]
  }
  const run = (names: string[], extraLeft = 0) => {
    const ts = names.map(termAt).filter(Boolean)
    if (!ts.length) return
    const x0 = Math.min(...ts.map((t) => t.dx)) - extraLeft
    const x1 = Math.max(...ts.map((t) => t.dx))
    const n = Math.round(x1 - x0) + 1
    stat.push(...femaleHeader(n, (x0 + x1) / 2, ts[0].dz, top, ARDUINO_HEADER_Y))
  }
  run([isMega ? 'SCL1' : 'SCL', isMega ? 'SDA1' : 'SDA', 'AREF', 'GND2', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8'])
  run(['D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0'])
  run(['IOREF', 'RESET', '3V3', '5V', 'GND', 'GND3', 'VIN'], 1)
  run(['A0', 'A1', 'A2', 'A3', 'A4', 'A5'])
  if (isMega) {
    run(['D14', 'D15', 'D16', 'D17', 'D18', 'D19', 'D20', 'D21'])
    run(['A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15'])
    // the double row at the end
    const xs = [3.75, 3.85].map((v) => v * 10)
    for (const x of xs) {
      const g = femaleHeader(18, x, 0, top, ARDUINO_HEADER_Y, true)[0]
      g.position.set(x, g.position.y, (2.1 - 1.95) * 10 + 8.5)
      stat.push(g)
    }
  }
  // USB-B and barrel jack (overhang the left edge)
  stat.push(box(6.4, 4.3, 4.7, MAT.steel(), 1.0, top + 2.15, 5.6))
  stat.push(box(0.3, 2.2, 3.0, plastic(0xe8e8e8, 0.5), -2.15, top + 2.0, 5.6))
  stat.push(box(5.8, 4.2, 3.6, plastic(0x141414, 0.7), 1.9, top + 2.1, 16.2))
  stat.push(cyl(1.0, 0.4, MAT.steel(), -1.0, top + 2.4, 16.2, 16).rotateZ(Math.PI / 2))
  // ATmega in its socket (DIP-28) — or the Mega's square TQFP
  if (isMega) {
    const chip = smdChip(5.5, 5.5, 0.45, 24, top, 11, 25, true)
    chip.forEach((o) => (o.rotation.y = Math.PI / 4))
    stat.push(...chip)
  } else {
    stat.push(box(14.2, 0.55, 4.0, MAT.socket(), 19.6, top + 0.28, 14.8))
    stat.push(box(13.9, 0.6, 2.9, MAT.chip(), 19.6, top + 0.86, 14.8))
    for (let i = 0; i < 14; i++) {
      stat.push(box(0.22, 0.5, 0.3, MAT.tin(), 13.1 + i, top + 0.55, 13.3))
      stat.push(box(0.22, 0.5, 0.3, MAT.tin(), 13.1 + i, top + 0.55, 16.3))
    }
  }
  // USB chip, crystal, regulator, caps, reset, ICSP
  stat.push(...smdChip(2.0, 2.0, 0.35, 8.0, top, 6.2, 8, true))
  stat.push(box(1.6, 0.9, 0.7, MAT.steel(), 9.6, top + 0.45, 11.0))
  stat.push(box(1.8, 0.7, 1.3, MAT.chip(), 6.0, top + 0.35, 13.2))
  stat.push(cyl(1.05, 2.2, plastic(0x1c1c1c, 0.4), 6.4, top + 1.1, 18.3, 18), cyl(1.05, 2.2, plastic(0x1c1c1c, 0.4), 8.9, top + 1.1, 18.3, 18))
  stat.push(...button(2.0, top, 2.6, 0xd03030, 1.25))
  const icspX = isMega ? 37.6 : 25.6
  stat.push(...malePins([0, 1, 2].flatMap((i) => [{ x: icspX - 0.5, z: 10.4 + i }, { x: icspX + 0.5, z: 10.4 + i }]), top, top, top + 2.5))
  addStatic(group, stat)
  group.add(pcb(def.type, W, D, thick, 0x0b7a83, yPcb, 0, 0, paintArduino(def, widthIn)))
  const chipText = chipLabel(isMega ? ['ATMEGA2560', '16AU'] : ['ATMEGA328P-PU', '1932'], isMega ? 4.6 : 12, isMega ? 4.6 : 2.6, isMega ? 24 : 19.6, top + (isMega ? 0.46 : 1.16), isMega ? 11 : 14.8, isMega ? Math.PI / 4 : 0)
  if (chipText) group.add(chipText)

  // LEDs: ON (green, always lit on USB power), L (follows D13), TX/RX
  const on = smdLed(0x35ff5a, isMega ? 36.2 : 25.4, top, 7.4)
  const l = smdLed(0xffa21a, 11.9, top, 5.6)
  const tx = smdLed(0xffcf33, 11.9, top, 7.2)
  const rx = smdLed(0xffcf33, 11.9, top, 8.0)
  group.add(on.mesh, l.mesh, tx.mesh, rx.mesh)
  on.mat.emissiveIntensity = 2.2

  const warn = beacon()
  group.add(warn.group)
  warn.group.position.set(W / 2, ARDUINO_HEADER_Y + 2.5, D / 2)
  const pinMark = damageMarks(def, pins, group)

  return {
    object: group,
    pinWorld: pins.map((p) => new THREE.Vector3(p.x, ARDUINO_HEADER_Y, p.z)),
    update: (_c, _e, t) => {
      const mcu = t?.mcu
      l.mat.emissiveIntensity = mcu?.led ? 3.2 : 0
      const now = performance.now() / 1000
      const busy = mcu?.state === 'running'
      tx.mat.emissiveIntensity = busy && Math.sin(now * 23) > 0.6 ? 1.6 : 0
      rx.mat.emissiveIntensity = 0
      on.mat.emissiveIntensity = mcu?.state === 'error' && mcu.damage.some((d) => d.pin === 'board') ? 0 : 2.2
      warn.set(!!mcu?.damage.length, now)
      pinMark(mcu?.damage ?? [])
    },
  }
}

/** red rings on damaged header pins (positions in group-local space) */
function damageMarks(def: BoardDef, pins: THREE.Vector3[], group: THREE.Group, y = ARDUINO_HEADER_Y): (dmg: { pin: string }[]) => void {
  const marks = new Map<string, THREE.Mesh>()
  const mat = cachedMaterial('dmgmark', () => new THREE.MeshBasicMaterial({ color: 0xff2d20, transparent: true, opacity: 0.9, depthWrite: false }))
  const geo = cachedGeometry('dmgmarkg', () => new THREE.TorusGeometry(0.42, 0.09, 8, 20).rotateX(Math.PI / 2))
  return (dmg) => {
    for (const d of dmg) {
      if (marks.has(d.pin)) continue
      const i = def.pins.indexOf(d.pin)
      if (i < 0) continue
      const m = new THREE.Mesh(geo, mat)
      const local = group.worldToLocal(new THREE.Vector3(pins[i].x, y + 0.05, pins[i].z))
      m.position.copy(local)
      m.renderOrder = 3
      group.add(m)
      marks.set(d.pin, m)
    }
  }
}

// ----------------------------------------------------------------- ESP32

function buildEsp32(def: BoardDef, pins: THREE.Vector3[]): BuildResult {
  const geo = offboardGeometry(def.type)!
  const ax = pins[0].x - geo.terminals[0].dx
  const az = pins[0].z - geo.terminals[0].dz
  const W = 20
  const D = 11
  const yPcb = 0.32
  const thick = 0.63
  const top = yPcb + thick
  const group = new THREE.Group()
  group.position.set(ax, 0, az)
  const stat: THREE.Object3D[] = []
  // pins up, on plastic spacer strips
  const pinPts = geo.terminals.map((t) => ({ x: t.dx, z: t.dz }))
  stat.push(...malePins(pinPts, top, top, ESP32_PIN_Y, true))
  // WROOM-32 module: PCB + shield can + antenna area
  stat.push(box(10.0, 0.32, 7.1, plastic(0x1d1d1d, 0.5), 15.0, top + 0.16, 5.5))
  stat.push(box(6.9, 1.2, 6.9, satinMetal(0x7f858c), 13.6, top + 0.92, 5.5))
  // micro-USB, CP2102, regulator, buttons
  stat.push(box(2.3, 1.1, 3.1, MAT.steel(), 0.6, top + 0.55, 5.5))
  stat.push(...smdChip(2.0, 2.0, 0.35, 4.3, top, 5.5, 7, true))
  stat.push(box(2.6, 0.7, 1.4, MAT.chip(), 7.0, top + 0.35, 3.2))
  stat.push(...button(2.4, top, 2.4, 0x262626, 1.1), ...button(2.4, top, 8.6, 0x262626, 1.1))
  addStatic(group, stat)
  group.add(
    pcb('esp32', W, D, thick, 0x141414, yPcb, 0, 0, (ctx, px) => {
      ctx.fillStyle = '#161616'
      ctx.fillRect(0, 0, W * px, D * px)
      traces(ctx, W * px, D * px, 'rgba(40,40,40,0.9)', 11)
      geo.terminals.forEach((t, i) => {
        ctx.fillStyle = '#d9b45a'
        ctx.beginPath()
        ctx.arc(t.dx * px, t.dz * px, 0.42 * px, 0, Math.PI * 2)
        ctx.fill()
        const name = def.pins[i].replace(/^D(\d+)$/, '$1').replace('GND2', 'GND')
        text(ctx, px, name, t.dx, t.dz + (t.dz < 5 ? 1.15 : -1.15), 0.36, { rotate: -Math.PI / 2 })
      })
      text(ctx, px, 'EN', 2.4, 3.55, 0.4)
      text(ctx, px, 'BOOT', 2.4, 7.4, 0.4)
      text(ctx, px, 'ESP32 DEVKIT V1', 7.2, 8.6, 0.5, { weight: '700' })
    }),
  )
  // shield marking + antenna trace
  const shield = chipLabel(['ESP32-WROOM-32', 'Wi-Fi + BT'], 6.6, 6.6, 13.6, top + 1.52, 5.5)
  if (shield) group.add(shield)
  const ant = art('esp32ant', 128, 300, (ctx) => {
    ctx.fillStyle = '#1d1d1d'
    ctx.fillRect(0, 0, 128, 300)
    ctx.strokeStyle = '#b8923a'
    ctx.lineWidth = 7
    ctx.beginPath()
    let y = 20
    ctx.moveTo(20, y)
    for (let i = 0; i < 6; i++) {
      ctx.lineTo(108, y)
      y += 22
      ctx.lineTo(108, y)
      ctx.lineTo(20, y)
      y += 22
      ctx.lineTo(20, y)
    }
    ctx.stroke()
  })
  if (ant) {
    const m = new THREE.Mesh(cachedGeometry('plane:2.6:7', () => new THREE.PlaneGeometry(2.6, 7).rotateX(-Math.PI / 2)), cachedMaterial('esp32antm', () => new THREE.MeshStandardMaterial({ map: ant, roughness: 0.5 })))
    m.position.set(18.6, top + 0.33, 5.5)
    group.add(m)
  }
  const led = smdLed(0x2d7bff, 5.6, top, 8.6)
  const pwr = smdLed(0xff2a2a, 5.6, top, 2.2)
  pwr.mat.emissiveIntensity = 2
  group.add(led.mesh, pwr.mesh)
  const warn = beacon()
  warn.group.position.set(W / 2, ESP32_PIN_Y + 2.5, D / 2)
  group.add(warn.group)
  const pinMark = damageMarks(def, pins, group, ESP32_PIN_Y)
  return {
    object: group,
    pinWorld: pins.map((p) => new THREE.Vector3(p.x, ESP32_PIN_Y, p.z)),
    update: (_c, _e, t) => {
      const mcu = t?.mcu
      led.mat.emissiveIntensity = mcu?.led ? 3.4 : 0
      warn.set(!!mcu?.damage.length, performance.now() / 1000)
      pinMark(mcu?.damage ?? [])
    },
  }
}

// --------------------------------------------------- Nano + Pico (in holes)

/** group frame for a footprint board: origin at pin 1, x along its pin row, z toward the far row */
function footprintFrame(pins: THREE.Vector3[]): THREE.Group {
  const g = new THREE.Group()
  const u = new THREE.Vector3().subVectors(pins[1], pins[0]).setY(0).normalize()
  g.position.set(pins[0].x, 0, pins[0].z)
  g.rotation.y = -Math.atan2(u.z, u.x)
  return g
}

function buildNano(def: BoardDef, pins: THREE.Vector3[]): BuildResult {
  const group = footprintFrame(pins)
  const half = def.pins.length / 2
  const stat: THREE.Object3D[] = []
  const rowGap = 6
  const yPcb = 1.0
  const thick = 0.63
  const top = yPcb + thick
  // pins into the holes + black spacer bars
  for (let i = 0; i < half; i++) {
    for (const z of [0, rowGap]) {
      stat.push(box(0.25, 2.4, 0.25, MAT.gold(), i, 0.4 + 0.0, z))
      stat.push(box(0.25, 0.6, 0.25, MAT.gold(), i, top + 0.25, z))
    }
  }
  stat.push(box(half, 1, 1, MAT.headerBlack(), (half - 1) / 2, 0.5, 0), box(half, 1, 1, MAT.headerBlack(), (half - 1) / 2, 0.5, rowGap))
  stat.push(box(2.9, 1.5, 3.0, MAT.steel(), -1.0, top + 0.75, rowGap / 2))
  const mcu = smdChip(2.8, 2.8, 0.4, 7.5, top, rowGap / 2, 8, true)
  mcu.forEach((o) => {
    const p = o.position.clone().sub(new THREE.Vector3(7.5, 0, rowGap / 2))
    p.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4)
    o.position.set(7.5 + p.x, o.position.y, rowGap / 2 + p.z)
    o.rotation.y = Math.PI / 4
  })
  stat.push(...mcu)
  stat.push(...button(11.8, top, rowGap / 2, 0xf0f0f0, 1.1))
  stat.push(box(1.4, 0.6, 0.6, MAT.steel(), 4.0, top + 0.3, 1.6))
  addStatic(group, stat)
  group.add(
    pcb('nano', 17, 7.1, thick, 0x1b5fa8, yPcb, -1.0, rowGap / 2 - 3.55, (ctx, px) => {
      ctx.fillStyle = '#1d63ad'
      ctx.fillRect(0, 0, 17 * px, 7.1 * px)
      traces(ctx, 17 * px, 7.1 * px, 'rgba(20,70,140,0.8)', 5)
      for (let i = 0; i < half; i++) {
        for (const [zz, nameIdx] of [[3.55 - rowGap / 2, i], [3.55 + rowGap / 2, i + half]] as [number, number][]) {
          ctx.fillStyle = '#e2c46a'
          ctx.fillRect((i + 1.0 - 0.38) * px, (zz - 0.38) * px, 0.76 * px, 0.76 * px)
          const n = def.pins[nameIdx].replace(/^D(\d+)$/, '$1').replace(/^(GND|RESET)2$/, '$1').replace('RESET', 'RST')
          text(ctx, px, n, i + 1.0, zz + (zz < 3.55 ? 0.95 : -0.95), 0.34, { rotate: -Math.PI / 2 })
        }
      }
      text(ctx, px, 'ARDUINO NANO', 10.5, 3.55, 0.62, { weight: '800' })
    }),
  )
  const lbl = chipLabel(['ATMEGA328P'], 2.6, 2.6, 7.5, top + 0.42, rowGap / 2, Math.PI / 4)
  if (lbl) group.add(lbl)
  const l = smdLed(0xffa21a, 13.4, top, 1.7)
  const on = smdLed(0x35ff5a, 13.4, top, 4.3)
  on.mat.emissiveIntensity = 2.2
  group.add(l.mesh, on.mesh)
  const warn = beacon()
  warn.group.position.set(7, top + 3, rowGap / 2)
  group.add(warn.group)
  return {
    object: group,
    pinWorld: pins.map((p) => p.clone()),
    update: (_c, _e, t) => {
      l.mat.emissiveIntensity = t?.mcu?.led ? 3.2 : 0
      warn.set(!!t?.mcu?.damage.length, performance.now() / 1000)
    },
  }
}

function buildPico(def: BoardDef, pins: THREE.Vector3[]): BuildResult {
  const group = footprintFrame(pins)
  const n = def.pins.length / 2
  const gap = -7 // the far row (row c) is toward −z from pin 1 (row i)
  const yPcb = 1.0
  const thick = 0.63
  const top = yPcb + thick
  const stat: THREE.Object3D[] = []
  for (let i = 0; i < n; i++) {
    for (const z of [0, gap]) {
      stat.push(box(0.25, 2.4, 0.25, MAT.gold(), i, 0.4, z))
      stat.push(box(0.5, 0.06, 0.5, MAT.gold(), i, top + 0.03, z))
    }
  }
  stat.push(box(n, 1, 1, MAT.headerBlack(), (n - 1) / 2, 0.5, 0), box(n, 1, 1, MAT.headerBlack(), (n - 1) / 2, 0.5, gap))
  // micro-USB at the pin-1 end, RP2040, flash, BOOTSEL, crystal
  stat.push(box(2.2, 1.1, 3.1, MAT.steel(), -0.2, top + 0.55, gap / 2))
  stat.push(...smdChip(2.8, 2.8, 0.35, 9.5, top, gap / 2, 10, true))
  stat.push(...smdChip(2.0, 1.6, 0.35, 5.0, top, gap / 2 - 1.4, 4))
  stat.push(box(1.5, 0.75, 1.1, MAT.white(), 3.3, top + 0.38, gap / 2 + 1.7))
  stat.push(box(1.2, 0.45, 0.9, MAT.steel(), 12.9, top + 0.22, gap / 2 - 1.8))
  addStatic(group, stat)
  group.add(
    pcb('pico', 20, 8.3, thick, 0x1a7a3c, yPcb, -0.5, gap - 0.65, (ctx, px) => {
      ctx.fillStyle = '#1d8240'
      ctx.fillRect(0, 0, 20 * px, 8.3 * px)
      traces(ctx, 20 * px, 8.3 * px, 'rgba(14,100,48,0.8)', 9)
      // castellated pads along both long edges
      for (let i = 0; i < n; i++) {
        for (const zz of [0.65, 7.65]) {
          ctx.fillStyle = '#e3c66c'
          ctx.fillRect((i + 0.5 - 0.35) * px, (zz - 0.55) * px, 0.7 * px, 1.1 * px)
          ctx.fillStyle = '#0d3b1d'
          ctx.beginPath()
          ctx.arc((i + 0.5) * px, (zz < 4 ? 0 : 8.3) * px, 0.28 * px, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      text(ctx, px, 'Raspberry Pi Pico', 14.6, 4.15, 0.62, { weight: '700' })
      text(ctx, px, '©2020', 14.6, 5.0, 0.36)
      text(ctx, px, 'BOOTSEL', 3.8, 1.6, 0.34)
      text(ctx, px, 'LED', 1.9, 1.6, 0.34)
    }),
  )
  const lbl = chipLabel(['RP2-B2', '20/21'], 2.6, 2.6, 9.5, top + 0.36, gap / 2)
  if (lbl) group.add(lbl)
  const led = smdLed(0x3dff6a, 1.9, top, gap / 2 + 2.2)
  group.add(led.mesh)
  const warn = beacon()
  warn.group.position.set(9.5, top + 3, gap / 2)
  group.add(warn.group)
  return {
    object: group,
    pinWorld: pins.map((p) => p.clone()),
    update: (_c, _e, t) => {
      led.mat.emissiveIntensity = t?.mcu?.led ? 3.4 : 0
      warn.set(!!t?.mcu?.damage.length, performance.now() / 1000)
    },
  }
}

export function buildBoard(comp: ComponentInstance, _entry: CatalogEntry, pins: THREE.Vector3[]): BuildResult {
  const def = boardDef(comp.type)
  if (!def) throw new Error('unknown board')
  switch (def.type) {
    case 'arduino_uno':
    case 'arduino_mega':
      return buildArduino(def, pins)
    case 'esp32_devkit':
      return buildEsp32(def, pins)
    case 'arduino_nano':
      return buildNano(def, pins)
    case 'rpi_pico':
      return buildPico(def, pins)
  }
  throw new Error('unknown board')
}

export type { ComponentTelemetry }
