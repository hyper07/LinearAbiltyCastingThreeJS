/**
 * Circuit Lab: procedural 3D microcontroller boards in ohmlet's style —
 * real dimensions (1 unit = 0.1"), headers exactly on their pins, PBR
 * materials from shared.ts, silkscreen drawn to a canvas texture.
 *
 *  - Arduino Uno / Mega: teal PCB on the bench, female headers, USB-B,
 *    barrel jack, socketed ATmega, ON / L / TX / RX LEDs.
 *  - Arduino Nano: blue PCB straddling the channel, mini-USB, TQFP chip.
 *  - ESP32 DevKit V1: black PCB, WROOM-32 can + antenna, EN/BOOT, pins up.
 *  - Raspberry Pi Pico / Pico W / Pico 2: green PCB, castellated edges, RP2040
 *    or RP2350, BOOTSEL (Pico W: radio can + antenna).
 *  - Uno R4 Minima / WiFi and Leonardo: the Uno shape with a QFP chip, USB-C /
 *    micro-USB (R4 WiFi: ESP32-S3 module + LED matrix).
 *  - Pins-up bench boards (ESP32 DevKit, NodeMCU, ESP32-S3-DevKitC-1) share one
 *    builder; 0.6" stick boards (Micro, Nano ESP32, ESP32-C3 SuperMini, Blue
 *    Pill, XIAO, Teensy 4.0) share another, each with its own look table.
 *
 *  - Bench boards drawn from a look table in millimetres (buildBench): the
 *    Raspberry Pi 5 / 4 / 3B+ / Zero 2 W, the MSP430 and Tiva C LaunchPads,
 *    the Nucleo-F401RE (Arduino sockets + morpho pins) and the BeagleBone.
 *  - The micro:bit stands in an edge-connector breakout (microbitCard).
 *
 * The on-board LED follows the program (telemetry.mcu.led); a damaged pin
 * gets a red marker and the board a warning beacon.
 */
import * as THREE from 'three'
import type { ComponentInstance, ComponentTelemetry } from '../../model/types'
import type { CatalogEntry } from '../../model/catalog'
import { boardDef, ARDUINO_HEADER_Y, ESP32_PIN_Y, type BoardDef } from '../../model/boards'
import { holePosition, offboardGeometry } from '../../model/breadboard'
import { BuildResult, cachedGeometry, cachedMaterial, mergeStatic, metal, moldedEpoxy, plastic } from './shared'
import { UI_FONT } from '../../ui/fonts'
import { PIN_KIND_STYLE, pinKind, pinLabel, type PinKind } from '../../model/pin-labels'

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
  // markers (the USB socket's mouth) are not meshes: they go in as they are
  for (const o of parts) if (o.name === 'usb-port') group.add(o)
  parts = parts.filter((o) => o.name !== 'usb-port')
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
  const PX = 64 // sharp enough for the pin tags
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

/** a printed pin name on a header side or a PCB: its text and kind (colour) */
export interface PinTag {
  text: string
  kind: PinKind
}

/** text colour for a name printed straight on dark plastic */
function inkOnDark(kind: PinKind): string {
  return kind === 'gnd' ? '#c9ccd1' : kind === 'digital' ? '#f4f6f2' : kind === 'ctrl' ? '#b7c0ca' : PIN_KIND_STYLE[kind].fill
}

/**
 * female header strip with n square holes, centered at (x, z), along x. With
 * `tags` (one per hole, low x first; null = no label) each pin's name is
 * printed up both long sides of the strip in its kind's colour, so the hole
 * a wire goes into reads at a glance from any side.
 */
function femaleHeader(n: number, x: number, z: number, y0: number, top: number, alongZ = false, tags?: (PinTag | null)[]): THREE.Object3D[] {
  const h = top - y0
  const len = n
  const C = 64 // px per hole
  const tex = art(`fhdr2:${n}`, n * C, C, (ctx) => {
    ctx.fillStyle = '#1b1b1d'
    ctx.fillRect(0, 0, n * C, C)
    for (let i = 0; i < n; i++) {
      const x0 = i * C
      // moulded funnel around each opening, then the opening with its contact
      ctx.fillStyle = '#2c2c30'
      ctx.fillRect(x0 + 12, 12, C - 24, C - 24)
      const g = ctx.createLinearGradient(0, 18, 0, C - 18)
      g.addColorStop(0, '#000000')
      g.addColorStop(1, '#121214')
      ctx.fillStyle = g
      ctx.fillRect(x0 + 18, 18, C - 36, C - 36)
      ctx.fillStyle = '#b8954a' // the spring contact glinting inside
      ctx.fillRect(x0 + 22, C - 26, C - 44, 3)
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'
      ctx.lineWidth = 2
      ctx.strokeRect(x0 + 1, 1, C - 2, C - 2)
    }
  })
  const side = MAT.headerBlack()
  const topMat = tex ? cachedMaterial(`fhdrtop2:${n}`, () => new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.6 })) : side
  const g = cachedGeometry(`fhdrg:${n}:${h.toFixed(2)}`, () => new THREE.BoxGeometry(len, h, 1))
  const m = new THREE.Mesh(g, side)
  m.position.set(x, y0 + h / 2, z)
  if (alongZ) m.rotation.y = Math.PI / 2
  m.castShadow = true
  const out: THREE.Object3D[] = [m]
  if (topMat !== side) {
    const face = new THREE.Mesh(cachedGeometry(`fhdrtopg:${n}`, () => new THREE.PlaneGeometry(len, 1).rotateX(-Math.PI / 2)), topMat)
    face.position.set(x, top + 0.004, z)
    if (alongZ) face.rotation.y = Math.PI / 2
    out.push(face)
  }
  if (tags && typeof document !== 'undefined') {
    const H = Math.round(h * C)
    const key = tags.map((t) => (t ? `${t.text}/${t.kind}` : '-')).join(',')
    const sideTex = (reversed: boolean) =>
      art(`fhdrside:${key}:${H}:${reversed ? 'r' : 'f'}`, n * C, H, (ctx) => {
        ctx.fillStyle = '#18181a'
        ctx.fillRect(0, 0, n * C, H)
        tags.forEach((t, i) => {
          if (!t) return
          const cx = ((reversed ? n - 1 - i : i) + 0.5) * C
          ctx.save()
          ctx.translate(cx, 10)
          ctx.rotate(-Math.PI / 2)
          ctx.fillStyle = inkOnDark(t.kind)
          ctx.font = `700 ${t.text.length > 4 ? 34 : 40}px ${UI_FONT}`
          ctx.textAlign = 'right'
          ctx.textBaseline = 'middle'
          ctx.fillText(t.text, 0, 0)
          ctx.restore()
        })
      })
    for (const [dir, reversed] of [[1, false], [-1, true]] as const) {
      const t = sideTex(reversed)
      if (!t) continue
      const mat = cachedMaterial(`fhdrsidem:${key}:${H}:${reversed}`, () => new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }))
      const plane = new THREE.Mesh(cachedGeometry(`fhdrsideg:${n}:${h.toFixed(2)}`, () => new THREE.PlaneGeometry(len, h)), mat)
      if (alongZ) {
        // strip turned along z: cells run toward −z, long faces look along ±x
        plane.position.set(x + dir * 0.505, y0 + h / 2, z)
        plane.rotation.y = reversed ? -Math.PI / 2 : Math.PI / 2
      } else {
        plane.position.set(x, y0 + h / 2, z + dir * 0.505)
        if (reversed) plane.rotation.y = Math.PI
      }
      out.push(plane)
    }
  }
  return out
}

/**
 * Pin names across both long faces of a row of 1 × 1 spacer blocks (male
 * pin headers): one cell per pin from `x0` along +x, horizontal text fitted
 * to the cell, in the pin kind's colour.
 */
function spacerLabels(tags: PinTag[], x0: number, z: number, y: number): THREE.Object3D[] {
  const n = tags.length
  const C = 96
  const key = tags.map((t) => `${t.text}/${t.kind}`).join(',')
  const out: THREE.Object3D[] = []
  for (const [dir, reversed] of [[1, false], [-1, true]] as const) {
    const tex = art(`spacer:${key}:${reversed ? 'r' : 'f'}`, n * C, C, (ctx) => {
      ctx.fillStyle = '#161616'
      ctx.fillRect(0, 0, n * C, C)
      tags.forEach((t, i) => {
        const cx = ((reversed ? n - 1 - i : i) + 0.5) * C
        let size = 46
        ctx.font = `700 ${size}px ${UI_FONT}`
        while (ctx.measureText(t.text).width > C - 10 && size > 24) ctx.font = `700 ${--size}px ${UI_FONT}`
        ctx.fillStyle = inkOnDark(t.kind)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(t.text, cx, C / 2 + 2)
      })
    })
    if (!tex) continue
    const mat = cachedMaterial(`spacerm:${key}:${reversed}`, () => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }))
    const plane = new THREE.Mesh(cachedGeometry(`spacerg:${n}`, () => new THREE.PlaneGeometry(n, 1)), mat)
    plane.position.set(x0 + (n - 1) / 2, y, z + dir * 0.505)
    if (reversed) plane.rotation.y = Math.PI
    out.push(plane)
  }
  return out
}

/**
 * A colour-coded pin tag printed on a PCB: a rounded label in the pin kind's
 * colour, running from `gap` beside the pin toward the board's middle
 * (`toward` = +1 / −1 along z), text reading along the tag.
 */
function pcbTag(ctx: CanvasRenderingContext2D, px: number, t: PinTag, x: number, z: number, toward: 1 | -1, size = 0.5): void {
  const st = PIN_KIND_STYLE[t.kind]
  ctx.save()
  ctx.font = `700 ${size * px}px ${UI_FONT}`
  const len = ctx.measureText(t.text).width / px + 0.34
  const w = 0.8
  const z0 = toward > 0 ? z + 0.62 : z - 0.62 - len
  ctx.fillStyle = st.fill
  ctx.beginPath()
  ctx.roundRect((x - w / 2) * px, z0 * px, w * px, len * px, 0.18 * px)
  ctx.fill()
  if (t.kind === 'gnd') {
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth = 0.05 * px
    ctx.stroke()
  }
  ctx.translate(x * px, (z0 + len / 2) * px)
  ctx.rotate(-Math.PI / 2)
  ctx.fillStyle = st.ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(t.text, 0, 0.03 * px)
  ctx.restore()
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

/** where the USB cable plugs in: the socket's mouth (the cable leaves toward local −x) */
function usbMark(x: number, y: number, z: number, kind: 'c' | 'micro' | 'b'): THREE.Object3D {
  const m = new THREE.Object3D()
  m.name = 'usb-port'
  m.userData.kind = kind
  m.position.set(x, y, z)
  return m
}

/** USB-C receptacle (8.9 × 3.2 mm, 7.4 deep) lying on the PCB, mouth toward −x, centered at (x, z) */
function usbC(x: number, y: number, z: number): THREE.Object3D[] {
  return [box(2.9, 1.25, 3.5, MAT.steel(), x, y + 0.63, z), box(0.05, 0.75, 2.8, plastic(0x0c0c0c, 0.6), x - 1.46, y + 0.63, z), usbMark(x - 1.46, y + 0.63, z, 'c')]
}

/** micro-USB receptacle (7.5 × 2.6 mm, 5 deep), mouth toward −x */
function usbMicro(x: number, y: number, z: number): THREE.Object3D[] {
  return [box(2.0, 1.0, 3.0, MAT.steel(), x, y + 0.5, z), box(0.05, 0.5, 2.4, plastic(0x0c0c0c, 0.6), x - 1.01, y + 0.5, z), usbMark(x - 1.01, y + 0.5, z, 'micro')]
}

/** turn a chip's parts by `angle` about (cx, cz) — legs and body together */
function turned(parts: THREE.Object3D[], cx: number, cz: number, angle: number): THREE.Object3D[] {
  const up = new THREE.Vector3(0, 1, 0)
  for (const o of parts) {
    const p = o.position.clone().sub(new THREE.Vector3(cx, 0, cz)).applyAxisAngle(up, angle)
    o.position.set(cx + p.x, o.position.y, cz + p.z)
    o.rotation.y += angle
  }
  return parts
}

/** a printed PCB antenna (meander trace) as a textured plane, long side along z */
function antennaTrace(key: string, w: number, d: number, x: number, y: number, z: number, board = '#1d1d1d'): THREE.Mesh | null {
  const tex = art(`ant:${key}`, 128, Math.round((128 * d) / w), (ctx) => {
    const H = Math.round((128 * d) / w)
    ctx.fillStyle = board
    ctx.fillRect(0, 0, 128, H)
    ctx.strokeStyle = '#b8923a'
    ctx.lineWidth = 7
    ctx.beginPath()
    let yy = 16
    ctx.moveTo(20, yy)
    while (yy < H - 40) {
      ctx.lineTo(108, yy)
      yy += 20
      ctx.lineTo(108, yy)
      ctx.lineTo(20, yy)
      yy += 20
      ctx.lineTo(20, yy)
    }
    ctx.stroke()
  })
  if (!tex) return null
  const m = new THREE.Mesh(cachedGeometry(`plane:${w}:${d}`, () => new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2)), cachedMaterial(`antm:${key}`, () => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 })))
  m.position.set(x, y, z)
  return m
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

/** which Uno-shaped board: the classic, the Uno R4 Minima / WiFi (RA4M1, USB-C) or the Leonardo (32u4, micro-USB) */
type UnoVariant = 'uno' | 'mega' | 'r4min' | 'r4wifi' | 'leonardo' | 'redboard'
function unoVariant(def: BoardDef): UnoVariant {
  switch (def.type) {
    case 'arduino_mega':
      return 'mega'
    case 'arduino_uno_r4_minima':
      return 'r4min'
    case 'arduino_uno_r4_wifi':
      return 'r4wifi'
    case 'arduino_leonardo':
      return 'leonardo'
    case 'sparkfun_redboard':
      return 'redboard'
  }
  return 'uno'
}

function paintArduino(def: BoardDef, widthIn: number) {
  const isMega = def.type === 'arduino_mega'
  return (ctx: CanvasRenderingContext2D, px: number) => {
    const W = widthIn * 10
    const D = 21
    const red = unoVariant(def) === 'redboard'
    const g = ctx.createLinearGradient(0, 0, W * px, D * px)
    g.addColorStop(0, red ? '#c8262d' : '#0e8a93')
    g.addColorStop(1, red ? '#a81e24' : '#0a737b')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W * px, D * px)
    traces(ctx, W * px, D * px, red ? 'rgba(130,16,22,0.7)' : 'rgba(6,90,97,0.75)', isMega ? 7 : 3)
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
    const v = unoVariant(def)
    if (v === 'r4wifi') {
      text(ctx, px, 'UNO R4 WiFi', 15.6, 6.4, 1.6, { weight: '800 italic', font: UI_FONT })
      text(ctx, px, 'ARDUINO', 15.8, 13.4, 0.9, { weight: '700' })
    } else if (v === 'r4min') {
      text(ctx, px, 'UNO R4', 15, 8.6, 2.6, { weight: '800 italic', font: UI_FONT })
      text(ctx, px, 'MINIMA', 15, 10.6, 0.9, { weight: '800' })
      text(ctx, px, 'ARDUINO', 15, 6.4, 0.9, { weight: '700' })
    } else if (v === 'redboard') {
      text(ctx, px, 'RedBoard', 15.2, 9.4, 2.4, { weight: '800 italic', font: UI_FONT })
      text(ctx, px, 'SparkFun · Qwiic', 15.2, 12.0, 0.9, { weight: '700' })
    } else if (v === 'leonardo') {
      text(ctx, px, 'LEONARDO', 14.6, 9.0, 2.0, { weight: '800 italic', font: UI_FONT })
      text(ctx, px, 'ARDUINO', 14.6, 6.4, 1.0, { weight: '700' })
    } else {
      text(ctx, px, isMega ? 'MEGA 2560' : 'UNO', isMega ? 22 : 15, 9.6, isMega ? 2.2 : 3.0, { weight: '800 italic', font: UI_FONT })
      text(ctx, px, '∞  ARDUINO', isMega ? 22 : 15, isMega ? 12.4 : 12.8, 1.2, { weight: '700' })
    }
    text(ctx, px, 'DIGITAL (PWM~)', isMega ? 17 : 17, 3.2, 0.62, { weight: '700' })
    text(ctx, px, 'POWER', 15, 18.0, 0.6, { weight: '700' })
    text(ctx, px, 'ANALOG IN', isMega ? 26 : 22.5, 18.0, 0.6, { weight: '700' })
    // pin labels next to the headers
    const label = (name: string) => pinLabel(name, def)
    const color = (name: string) => inkOnDark(pinKind(name, def))
    const geo = offboardGeometry(def.type)
    if (geo) {
      def.pins.forEach((name, i) => {
        const t = geo.terminals[i]
        if (!t) return
        const c = color(name)
        if (t.exitDir.z < 0) text(ctx, px, label(name), t.dx, t.dz + 0.85, 0.5, { rotate: -Math.PI / 2, align: 'right', weight: '700', color: c })
        else if (t.exitDir.z > 0) text(ctx, px, label(name), t.dx, t.dz - 0.85, 0.5, { rotate: -Math.PI / 2, align: 'left', weight: '700', color: c })
        else text(ctx, px, label(name), t.dx + (t.dx < 38 ? -0.95 : 0.95), t.dz, 0.34, { weight: '700', color: c })
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
    const tags: (PinTag | null)[] = Array.from({ length: n }, (_, i) => {
      const name = names.find((nm) => Math.abs((termAt(nm)?.dx ?? -99) - (x0 + i)) < 0.01)
      return name ? { text: pinLabel(name, def), kind: pinKind(name, def) } : null
    })
    stat.push(...femaleHeader(n, (x0 + x1) / 2, ts[0].dz, top, ARDUINO_HEADER_Y, false, tags))
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
    const zc = (2.1 - 1.95) * 10 + 8.5
    for (const x of xs) {
      // cell i sits at z = zc + 8.5 − i (the turned strip runs toward −z)
      const tags: (PinTag | null)[] = Array.from({ length: 18 }, (_, i) => {
        const k = geo.terminals.findIndex((t) => Math.abs(t.dx - x) < 0.01 && Math.abs(t.dz - (zc + 8.5 - i)) < 0.01)
        return k >= 0 ? { text: pinLabel(def.pins[k], def), kind: pinKind(def.pins[k], def) } : null
      })
      stat.push(...femaleHeader(18, x, zc, top, ARDUINO_HEADER_Y, true, tags))
    }
  }
  const v = unoVariant(def)
  // USB (B on the classic boards, C on the R4, micro on the Leonardo) and barrel jack, overhanging the left edge
  if (v === 'r4min' || v === 'r4wifi') stat.push(...usbC(-0.4, top, 5.6))
  else if (v === 'leonardo' || v === 'redboard') stat.push(...usbMicro(0.2, top, 5.6))
  else {
    stat.push(box(6.4, 4.3, 4.7, MAT.steel(), 1.0, top + 2.15, 5.6))
    stat.push(box(0.3, 2.2, 3.0, plastic(0xe8e8e8, 0.5), -2.15, top + 2.0, 5.6))
    stat.push(usbMark(-2.3, top + 2.0, 5.6, 'b'))
  }
  stat.push(box(5.8, 4.2, 3.6, plastic(0x141414, 0.7), 1.9, top + 2.1, 16.2))
  stat.push(cyl(1.0, 0.4, MAT.steel(), -1.0, top + 2.4, 16.2, 16).rotateZ(Math.PI / 2))
  // ATmega in its socket (DIP-28) — or a square QFP (Mega 2560, RA4M1, 32u4)
  if (isMega) {
    const chip = smdChip(5.5, 5.5, 0.45, 24, top, 11, 25, true)
    chip.forEach((o) => (o.rotation.y = Math.PI / 4))
    stat.push(...chip)
  } else if (v === 'r4min' || v === 'r4wifi') {
    const [cx, cz] = v === 'r4wifi' ? [22.0, 14.4] : [19.6, 14.6]
    stat.push(...smdChip(3.9, 3.9, 0.4, cx, top, cz, 16, true))
  } else if (v === 'leonardo') {
    stat.push(...turned(smdChip(3.9, 3.9, 0.4, 19.6, top, 13.6, 11, true), 19.6, 13.6, Math.PI / 4))
  } else if (v === 'redboard') {
    stat.push(...turned(smdChip(3.2, 3.2, 0.4, 19.6, top, 14.4, 8, true), 19.6, 14.4, Math.PI / 4))
    stat.push(...smdChip(1.8, 1.4, 0.35, 7.6, top, 6.4, 5))
    stat.push(box(1.6, 1.0, 1.9, plastic(0x1b1b1b, 0.5), 25.2, top + 0.5, 4.4))
  } else {
    stat.push(box(14.2, 0.55, 4.0, MAT.socket(), 19.6, top + 0.28, 14.8))
    stat.push(box(13.9, 0.6, 2.9, MAT.chip(), 19.6, top + 0.86, 14.8))
    for (let i = 0; i < 14; i++) {
      stat.push(box(0.22, 0.5, 0.3, MAT.tin(), 13.1 + i, top + 0.55, 13.3))
      stat.push(box(0.22, 0.5, 0.3, MAT.tin(), 13.1 + i, top + 0.55, 16.3))
    }
  }
  if (v === 'r4wifi') {
    // ESP32-S3-MINI-1 radio module beside the USB-C, 12 × 8 LED matrix in the middle, Qwiic socket
    stat.push(box(6.0, 0.3, 6.1, plastic(0x1d1d1d, 0.5), 8.6, top + 0.15, 13.4))
    stat.push(box(5.6, 0.75, 4.6, satinMetal(0x8a9097), 8.6, top + 0.65, 14.1))
    stat.push(box(2.4, 1.4, 1.6, plastic(0xf2f0ea, 0.5), 24.0, top + 0.7, 4.6))
    const ledMat = cachedMaterial('r4matrix', () => new THREE.MeshPhysicalMaterial({ color: 0xf6e6d6, roughness: 0.4, emissive: new THREE.Color(0xff2a1a), emissiveIntensity: 0.05 }))
    for (let r = 0; r < 8; r++) for (let c = 0; c < 12; c++) stat.push(box(0.26, 0.16, 0.18, ledMat, 13.0 + c * 0.5, top + 0.08, 8.2 + r * 0.5))
  }
  // USB chip (the classic boards' 16U2), crystal, regulator, caps, reset, ICSP
  if (v === 'uno' || v === 'mega') stat.push(...smdChip(2.0, 2.0, 0.35, 8.0, top, 6.2, 8, true))
  if (v !== 'r4wifi') stat.push(box(1.6, 0.9, 0.7, MAT.steel(), 9.6, top + 0.45, 11.0), box(1.8, 0.7, 1.3, MAT.chip(), 6.0, top + 0.35, 13.2))
  stat.push(cyl(1.05, 2.2, plastic(0x1c1c1c, 0.4), 6.4, top + 1.1, 18.3, 18), cyl(1.05, 2.2, plastic(0x1c1c1c, 0.4), 8.9, top + 1.1, 18.3, 18))
  stat.push(...button(2.0, top, 2.6, 0xd03030, 1.25))
  const icspX = isMega ? 37.6 : 25.6
  stat.push(...malePins([0, 1, 2].flatMap((i) => [{ x: icspX - 0.5, z: 10.4 + i }, { x: icspX + 0.5, z: 10.4 + i }]), top, top, top + 2.5))
  addStatic(group, stat)
  group.add(pcb(def.type, W, D, thick, v === 'redboard' ? 0xa81e24 : 0x0b7a83, yPcb, 0, 0, paintArduino(def, widthIn)))
  const chipText =
    v === 'r4min' || v === 'r4wifi'
      ? chipLabel(['RA4M1', 'RENESAS'], 3.6, 3.6, v === 'r4wifi' ? 22.0 : 19.6, top + 0.41, v === 'r4wifi' ? 14.4 : 14.6)
      : v === 'leonardo'
        ? chipLabel(['ATMEGA32U4', 'AU'], 3.6, 3.6, 19.6, top + 0.41, 13.6, Math.PI / 4)
        : v === 'redboard'
          ? chipLabel(['ATMEGA328P', 'AU'], 3.0, 3.0, 19.6, top + 0.41, 14.4, Math.PI / 4)
        : chipLabel(isMega ? ['ATMEGA2560', '16AU'] : ['ATMEGA328P-PU', '1932'], isMega ? 4.6 : 12, isMega ? 4.6 : 2.6, isMega ? 24 : 19.6, top + (isMega ? 0.46 : 1.16), isMega ? 11 : 14.8, isMega ? Math.PI / 4 : 0)
  if (chipText) group.add(chipText)
  if (v === 'r4wifi') {
    const mod = chipLabel(['ESP32-S3', 'MINI-1'], 5.2, 4.2, 8.6, top + 1.03, 14.1)
    if (mod) group.add(mod)
  }

  // LEDs: ON (green, always lit on USB power), L (follows D13), TX/RX
  const on = smdLed(0x35ff5a, isMega ? 36.2 : 25.4, top, 7.4)
  const l = smdLed(0xffa21a, 11.9, top, 5.6)
  const tx = smdLed(0xffcf33, 11.9, top, 7.2)
  const rx = smdLed(0xffcf33, 11.9, top, 8.0)
  group.add(on.mesh, l.mesh, tx.mesh, rx.mesh)
  on.mat.emissiveIntensity = 2.2
  powerLed(on.mat)

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

/**
 * How a pins-up bench dev board looks (board units, x from the USB end, z
 * across): the RF module with its shield can and antenna, the USB ports,
 * the support chips, buttons and LEDs. The pins come from the bench geometry.
 */
interface PinsUpLook {
  w: number
  d: number
  pcb: number
  fill: string
  trace: string
  seed: number
  /** RF module PCB, shield can and the printed antenna beyond it */
  module: { x: number; w: number; d: number; canX: number; canW: number; canD: number; canH: number; label: string[]; antX: number; antW: number; antD: number; color?: number }
  usb: { kind: 'micro' | 'c'; x: number; z: number }[]
  chips: { w: number; d: number; x: number; z: number; legs: number }[]
  regulator: { x: number; z: number }
  buttons: { x: number; z: number; label: string; lz: number }[]
  led: { x: number; z: number; color: number; size?: number }
  pwr: { x: number; z: number }
  title: { text: string; x: number; z: number; size: number }
}

const PINS_UP_LOOKS: Record<string, PinsUpLook> = {
  // DOIT ESP32 DevKit V1: 51 × 28 mm, WROOM-32 at the far end
  esp32_devkit: {
    w: 20, d: 11, pcb: 0x141414, fill: '#161616', trace: 'rgba(40,40,40,0.9)', seed: 11,
    module: { x: 15.0, w: 10.0, d: 7.1, canX: 13.6, canW: 6.9, canD: 6.9, canH: 1.2, label: ['ESP32-WROOM-32', 'Wi-Fi + BT'], antX: 18.6, antW: 2.6, antD: 7 },
    usb: [{ kind: 'micro', x: 0.6, z: 5.5 }],
    chips: [{ w: 2.0, d: 2.0, x: 4.3, z: 5.5, legs: 7 }],
    regulator: { x: 7.0, z: 3.2 },
    buttons: [{ x: 2.4, z: 2.4, label: 'EN', lz: 3.55 }, { x: 2.4, z: 8.6, label: 'BOOT', lz: 7.4 }],
    led: { x: 5.6, z: 8.6, color: 0x2d7bff },
    pwr: { x: 5.6, z: 2.2 },
    title: { text: 'ESP32 DEVKIT V1', x: 7.2, z: 8.6, size: 0.5 },
  },
  // NodeMCU v1.0 (Amica): 49 × 26 mm, ESP-12E module with its own antenna at the far end
  esp8266_nodemcu: {
    w: 19.3, d: 10.2, pcb: 0x1a1d22, fill: '#1b1e24', trace: 'rgba(48,54,64,0.9)', seed: 13,
    module: { x: 14.6, w: 9.4, d: 6.3, canX: 13.3, canW: 5.9, canD: 4.8, canH: 0.95, label: ['ESP8266MOD', 'ESP-12E'], antX: 17.9, antW: 2.4, antD: 5.6, color: 0x1f2a6b },
    usb: [{ kind: 'micro', x: 0.6, z: 5.1 }],
    chips: [{ w: 1.9, d: 1.9, x: 4.4, z: 5.1, legs: 7 }],
    regulator: { x: 7.0, z: 2.6 },
    buttons: [{ x: 2.4, z: 2.2, label: 'RST', lz: 3.3 }, { x: 2.4, z: 8.0, label: 'FLASH', lz: 6.9 }],
    led: { x: 17.6, z: 2.6, color: 0x2d7bff },
    pwr: { x: 6.2, z: 7.4 },
    title: { text: 'NodeMCU V1.0', x: 7.6, z: 8.1, size: 0.5 },
  },
  // ESP32-S3-DevKitC-1: 62.7 × 25.4 mm, WROOM-1 at the far end, two USB-C, RGB LED
  esp32s3_devkitc: {
    w: 24.7, d: 10, pcb: 0x141414, fill: '#151515', trace: 'rgba(42,42,42,0.9)', seed: 17,
    module: { x: 19.7, w: 10.0, d: 7.1, canX: 18.3, canW: 7.1, canD: 6.9, canH: 1.25, label: ['ESP32-S3-WROOM-1', 'Wi-Fi + BLE 5'], antX: 23.4, antW: 2.4, antD: 7 },
    usb: [{ kind: 'c', x: 1.2, z: 2.6 }, { kind: 'c', x: 1.2, z: 7.4 }],
    chips: [{ w: 1.8, d: 1.8, x: 9.2, z: 3.0, legs: 6 }],
    regulator: { x: 9.4, z: 7.0 },
    buttons: [{ x: 4.6, z: 2.4, label: 'BOOT', lz: 3.6 }, { x: 4.6, z: 7.6, label: 'RST', lz: 6.4 }],
    led: { x: 7.0, z: 5.0, color: 0xffffff, size: 1.6 },
    pwr: { x: 7.0, z: 7.6 },
    title: { text: 'ESP32-S3-DevKitC-1', x: 11.6, z: 5.0, size: 0.5 },
  },
}

PINS_UP_LOOKS.wemos_d1_mini = {
  w: 13.5, d: 10.1, pcb: 0x1d3f8c, fill: '#1f45a0', trace: 'rgba(16,48,120,0.85)', seed: 51,
  module: { x: 8.9, w: 9.4, d: 6.3, canX: 8.2, canW: 5.9, canD: 4.8, canH: 0.95, label: ['ESP8266MOD', 'ESP-12F'], antX: 12.2, antW: 2.2, antD: 5.6 },
  usb: [{ kind: 'micro', x: 0.6, z: 5.05 }],
  chips: [{ w: 1.6, d: 1.6, x: 3.2, z: 3.0, legs: 6 }],
  regulator: { x: 3.4, z: 7.2 },
  buttons: [{ x: 1.4, z: 8.3, label: 'RST', lz: 7.2 }],
  led: { x: 11.9, z: 7.9, color: 0x2d7bff },
  pwr: { x: 3.4, z: 5.3 },
  title: { text: 'D1 mini', x: 3.6, z: 1.9, size: 0.5 },
}
PINS_UP_LOOKS.arduino_mkr_wifi1010 = {
  w: 24.2, d: 9.85, pcb: 0x0b7a83, fill: '#0f858e', trace: 'rgba(6,90,97,0.75)', seed: 53,
  module: { x: 21.4, w: 4.6, d: 6.4, canX: 21.0, canW: 3.6, canD: 5.6, canH: 0.8, label: ['NINA-W102'], antX: 23.4, antW: 0.9, antD: 5.6 },
  usb: [{ kind: 'micro', x: 0.6, z: 4.9 }],
  chips: [{ w: 2.8, d: 2.8, x: 10.2, z: 4.9, legs: 12 }, { w: 1.2, d: 1.2, x: 14.4, z: 3.2, legs: 4 }],
  regulator: { x: 6.2, z: 3.0 },
  buttons: [{ x: 3.4, z: 7.4, label: 'RESET', lz: 6.2 }],
  led: { x: 6.2, z: 7.4, color: 0xffa21a },
  pwr: { x: 6.2, z: 6.4 },
  title: { text: 'MKR WiFi 1010', x: 15.6, z: 6.6, size: 0.5 },
}

function buildPinsUp(def: BoardDef, pins: THREE.Vector3[]): BuildResult {
  const L = PINS_UP_LOOKS[def.type] ?? PINS_UP_LOOKS.esp32_devkit
  const geo = offboardGeometry(def.type)!
  const ax = pins[0].x - geo.terminals[0].dx
  const az = pins[0].z - geo.terminals[0].dz
  const { w: W, d: D } = L
  const yPcb = 0.32
  const thick = 0.63
  const top = yPcb + thick
  const mid = D / 2
  const group = new THREE.Group()
  group.position.set(ax, 0, az)
  const stat: THREE.Object3D[] = []
  // pins up, on plastic spacer strips
  const pinPts = geo.terminals.map((t) => ({ x: t.dx, z: t.dz }))
  stat.push(...malePins(pinPts, top, top, ESP32_PIN_Y, true))
  // each pin's name on both long faces of its black spacer strip
  for (const row of [...new Set(geo.terminals.map((t) => t.dz))]) {
    const ts = geo.terminals.map((t, i) => ({ t, i })).filter(({ t }) => t.dz === row).sort((a, b) => a.t.dx - b.t.dx)
    stat.push(...spacerLabels(ts.map(({ i }) => ({ text: pinLabel(def.pins[i], def), kind: pinKind(def.pins[i], def) })), ts[0].t.dx, row, top + 0.5))
  }
  // RF module: PCB + shield can (+ the antenna painted below)
  const M = L.module
  stat.push(box(M.w, 0.32, M.d, plastic(M.color ?? 0x1d1d1d, 0.5), M.x, top + 0.16, mid))
  stat.push(box(M.canW, M.canH, M.canD, satinMetal(0x7f858c), M.canX, top + 0.32 + M.canH / 2, mid))
  for (const u of L.usb) stat.push(...(u.kind === 'c' ? usbC(u.x, top, u.z) : usbMicro(u.x, top, u.z)))
  for (const c of L.chips) stat.push(...smdChip(c.w, c.d, 0.35, c.x, top, c.z, c.legs, true))
  stat.push(box(2.6, 0.7, 1.4, MAT.chip(), L.regulator.x, top + 0.35, L.regulator.z))
  for (const b of L.buttons) stat.push(...button(b.x, top, b.z, 0x262626, 1.1))
  addStatic(group, stat)
  group.add(
    pcb(def.type === 'esp32_devkit' ? 'esp32' : def.type, W, D, thick, L.pcb, yPcb, 0, 0, (ctx, px) => {
      ctx.fillStyle = L.fill
      ctx.fillRect(0, 0, W * px, D * px)
      traces(ctx, W * px, D * px, L.trace, L.seed)
      geo.terminals.forEach((t, i) => {
        ctx.fillStyle = '#d9b45a'
        ctx.beginPath()
        ctx.arc(t.dx * px, t.dz * px, 0.42 * px, 0, Math.PI * 2)
        ctx.fill()
        const name = def.pins[i]
        pcbTag(ctx, px, { text: pinLabel(name, def), kind: pinKind(name, def) }, t.dx, t.dz, t.dz < mid ? 1 : -1, 0.44)
      })
      for (const b of L.buttons) text(ctx, px, b.label, b.x, b.lz, 0.4)
      text(ctx, px, L.title.text, L.title.x, L.title.z, L.title.size, { weight: '700' })
    }),
  )
  const shield = chipLabel(M.label, M.canW - 0.3, M.canD - 0.3, M.canX, top + 0.32 + M.canH, mid)
  if (shield) group.add(shield)
  const ant = antennaTrace(def.type === 'esp32_devkit' ? 'esp32ant' : `${def.type}ant`, M.antW, M.antD, M.antX, top + 0.33, mid)
  if (ant) group.add(ant)
  const led = smdLed(L.led.color, L.led.x, top, L.led.z)
  if (L.led.size) led.mesh.scale.set(L.led.size / 0.42, 2, L.led.size / 0.28)
  const pwr = smdLed(0xff2a2a, L.pwr.x, top, L.pwr.z)
  pwr.mat.emissiveIntensity = 2
  powerLed(pwr.mat)
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
          const name = def.pins[nameIdx]
          pcbTag(ctx, px, { text: pinLabel(name, def).replace('RESET', 'RST'), kind: pinKind(name, def) }, i + 1.0, zz, zz < 3.55 ? 1 : -1, 0.4)
        }
      }
      text(ctx, px, 'ARDUINO NANO', 10.5, 3.55, 0.5, { weight: '800' })
    }),
  )
  const lbl = chipLabel(['ATMEGA328P'], 2.6, 2.6, 7.5, top + 0.42, rowGap / 2, Math.PI / 4)
  if (lbl) group.add(lbl)
  const l = smdLed(0xffa21a, 13.4, top, 1.7)
  const on = smdLed(0x35ff5a, 13.4, top, 4.3)
  on.mat.emissiveIntensity = 2.2
  powerLed(on.mat)
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
  stat.push(box(2.2, 1.1, 3.1, MAT.steel(), -0.2, top + 0.55, gap / 2), usbMark(-1.3, top + 0.55, gap / 2, 'micro'))
  stat.push(...smdChip(2.8, 2.8, 0.35, 9.5, top, gap / 2, 10, true))
  stat.push(...smdChip(2.0, 1.6, 0.35, 5.0, top, gap / 2 - 1.4, 4))
  stat.push(box(1.5, 0.75, 1.1, MAT.white(), 3.3, top + 0.38, gap / 2 + 1.7))
  stat.push(box(1.2, 0.45, 0.9, MAT.steel(), 12.9, top + 0.22, gap / 2 - 1.8))
  // Pico W: the CYW43439 radio under its shield can and the printed antenna at the far end
  const isW = def.type === 'rpi_pico_w' || def.type === 'rpi_pico2_w'
  const is2 = def.type === 'rpi_pico2' || def.type === 'rpi_pico2_w'
  if (isW) stat.push(box(3.3, 0.6, 2.4, satinMetal(0x8a9097), 15.4, top + 0.3, gap / 2))
  addStatic(group, stat)
  group.add(
    pcb(def.type === 'rpi_pico' ? 'pico' : def.type, 20, 8.3, thick, 0x1a7a3c, yPcb, -0.5, gap - 0.65, (ctx, px) => {
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
      // pin tags: row i (pins 1–20) along the canvas' far edge, row c (21–40) along the near one
      for (let i = 0; i < n; i++) {
        const a = def.pins[i]
        const b = def.pins[n + (n - 1 - i)]
        pcbTag(ctx, px, { text: pinLabel(a, def), kind: pinKind(a, def) }, i + 0.5, 7.65, -1, 0.4)
        pcbTag(ctx, px, { text: pinLabel(b, def), kind: pinKind(b, def) }, i + 0.5, 0.65, 1, 0.4)
      }
      if (isW) text(ctx, px, is2 ? 'Pico 2 W' : 'Pico W', 6.8, 4.5, 0.6, { weight: '700' })
      else text(ctx, px, is2 ? 'Raspberry Pi Pico 2' : 'Raspberry Pi Pico', 14.6, 4.15, 0.62, { weight: '700' })
      text(ctx, px, is2 ? '©2024' : isW ? '©2022' : '©2020', isW ? 6.8 : 14.6, isW ? 5.3 : 5.0, 0.36)
      text(ctx, px, 'BOOTSEL', 3.8, 1.6, 0.34)
      text(ctx, px, 'LED', 1.9, 1.6, 0.34)
    }),
  )
  const lbl = chipLabel(is2 ? ['RP2350', 'A2'] : ['RP2-B2', '20/21'], 2.6, 2.6, 9.5, top + 0.36, gap / 2)
  if (isW) {
    const can = chipLabel(['CYW43439'], 3.0, 2.1, 15.4, top + 0.61, gap / 2)
    if (can) group.add(can)
    const ant = antennaTrace('picow', 1.5, 5.2, 18.6, top + 0.01, gap / 2, '#1d8240')
    if (ant) group.add(ant)
  }
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

// ------------------------------------------- 0.6" stick boards (in holes)

/**
 * How a 0.6"-row breadboard board looks, in its footprint frame: x along the
 * pin rows (pin 1 at x 0, USB end toward −x), z across (row c at 0, row h at
 * 6). Real outlines: Micro 48 × 18 mm, Nano ESP32 45 × 18, ESP32-C3
 * SuperMini 22.5 × 18, Blue Pill 53 × 23, XIAO 21 × 17.8, Teensy 4.0 35.6 × 17.8.
 */
interface DipLook {
  len: number
  wid: number
  x0: number
  pcb: number
  fill: string
  trace: string
  seed: number
  /** pins poke up through the PCB (soldered headers) or end in castellated pads */
  pins: 'through' | 'castellated'
  usb?: { kind: 'micro' | 'c'; x: number }
  chips: { w: number; d: number; x: number; z: number; legs: number; rot?: number; label?: string[]; h?: number }[]
  /** RF / EMI shield can with a printed name */
  can?: { w: number; d: number; h: number; x: number; z: number; label: string[] }
  /** ceramic chip antenna */
  ceramic?: { x: number; z: number }
  crystal?: { x: number; z: number; w: number; d: number }
  buttons: { x: number; z: number; cap: number; size: number }[]
  /** 2 × 3 jumper headers (Blue Pill BOOT0 / BOOT1) */
  jumpers?: { x: number; z: number }[]
  /** a pin header standing on the board (Blue Pill SWD), points along z */
  swd?: { x: number; z0: number; n: number }
  led?: { x: number; z: number; color: number }
  pwr?: { x: number; z: number; color: number }
  texts: { s: string; x: number; z: number; size: number; weight?: string }[]
  tag: number
  /** plain extra parts (battery socket, Qwiic, NeoPixel …) */
  boxes?: { x: number; z: number; w: number; d: number; h: number; mat: number | 'steel' | 'white' }[]
  /** a card standing in an edge connector on the board (micro:bit) */
  card?: 'microbit'
}

const DIP_LOOKS: Record<string, DipLook> = {
  arduino_micro: {
    len: 18.9, wid: 7.1, x0: -1.45, pcb: 0x0b7a83, fill: '#0e8a93', trace: 'rgba(6,90,97,0.75)', seed: 21, pins: 'through',
    usb: { kind: 'micro', x: -0.6 },
    chips: [{ w: 2.4, d: 2.4, x: 8.6, z: 3, legs: 9, rot: Math.PI / 4, label: ['ATMEGA32U4'] }],
    crystal: { x: 11.6, z: 3, w: 1.0, d: 0.6 },
    buttons: [{ x: 13.6, z: 3, cap: 0xf0f0f0, size: 1.1 }],
    led: { x: 15.4, z: 2.4, color: 0xffa21a },
    pwr: { x: 15.4, z: 3.6, color: 0x35ff5a },
    texts: [{ s: 'ARDUINO MICRO', x: 3.6, z: 3, size: 0.46, weight: '800' }],
    tag: 0.4,
  },
  arduino_nano_esp32: {
    len: 17.7, wid: 7.1, x0: -1.35, pcb: 0x0b7a83, fill: '#0f858e', trace: 'rgba(6,90,97,0.75)', seed: 23, pins: 'through',
    usb: { kind: 'c', x: -0.5 },
    chips: [],
    can: { w: 5.6, d: 2.9, h: 0.75, x: 7.9, z: 3, label: ['NORA-W106', 'u-blox'] },
    buttons: [{ x: 13.8, z: 3, cap: 0xf0f0f0, size: 1.0 }],
    led: { x: 12.0, z: 2.3, color: 0xffa21a },
    pwr: { x: 12.0, z: 3.7, color: 0x35ff5a },
    texts: [{ s: 'NANO ESP32', x: 3.2, z: 3, size: 0.44, weight: '800' }],
    tag: 0.4,
  },
  esp32c3_supermini: {
    len: 8.86, wid: 7.1, x0: -0.93, pcb: 0x1c3f8c, fill: '#1e44a0', trace: 'rgba(16,48,120,0.85)', seed: 25, pins: 'castellated',
    usb: { kind: 'c', x: -0.55 },
    chips: [{ w: 2.0, d: 2.0, x: 3.9, z: 3, legs: 8, label: ['ESP32-C3'] }],
    crystal: { x: 5.7, z: 3.9, w: 0.8, d: 0.6 },
    ceramic: { x: 7.0, z: 3 },
    buttons: [{ x: 2.1, z: 2.3, cap: 0x2a2a2a, size: 0.8 }, { x: 2.1, z: 3.7, cap: 0x2a2a2a, size: 0.8 }],
    led: { x: 5.7, z: 2.2, color: 0x2d7bff },
    pwr: { x: 5.2, z: 4.4, color: 0xff2a2a },
    texts: [],
    tag: 0.38,
  },
  stm32_bluepill: {
    len: 20.9, wid: 9.0, x0: -0.95, pcb: 0x1d4aa0, fill: '#2052b0', trace: 'rgba(16,52,130,0.85)', seed: 27, pins: 'through',
    usb: { kind: 'micro', x: -0.4 },
    chips: [{ w: 2.8, d: 2.8, x: 9.6, z: 3, legs: 12, rot: Math.PI / 4, label: ['STM32', 'F103C8T6'] }],
    crystal: { x: 6.3, z: 3, w: 1.8, d: 0.8 },
    buttons: [{ x: 3.4, z: 3, cap: 0xf0f0f0, size: 1.1 }],
    jumpers: [{ x: 13.6, z: 2.4 }, { x: 13.6, z: 3.6 }],
    swd: { x: 19.5, z0: 1.5, n: 4 },
    led: { x: 16.4, z: 2.6, color: 0x35ff5a },
    pwr: { x: 16.4, z: 3.4, color: 0xff2a2a },
    texts: [{ s: 'BOOT0', x: 11.9, z: 2.4, size: 0.3 }, { s: 'BOOT1', x: 11.9, z: 3.6, size: 0.3 }, { s: 'RESET', x: 3.4, z: 4.0, size: 0.3 }],
    tag: 0.4,
  },
  xiao_samd21: {
    len: 8.27, wid: 7.0, x0: -1.13, pcb: 0x18191c, fill: '#1a1b1f', trace: 'rgba(40,42,48,0.9)', seed: 29, pins: 'castellated',
    usb: { kind: 'c', x: -1.25 },
    chips: [],
    can: { w: 4.0, d: 2.2, h: 0.5, x: 3.5, z: 3, label: ['XIAO', 'SAMD21'] },
    buttons: [],
    led: { x: 0.95, z: 2.4, color: 0xffb020 },
    pwr: { x: 0.95, z: 3.6, color: 0x35ff5a },
    texts: [],
    tag: 0.36,
  },
  arduino_nano_every: {
    len: 17.7, wid: 7.1, x0: -1.35, pcb: 0x0b7a83, fill: '#0f858e', trace: 'rgba(6,90,97,0.75)', seed: 33, pins: 'through',
    usb: { kind: 'micro', x: -0.6 },
    chips: [
      { w: 2.6, d: 2.6, x: 8.4, z: 3, legs: 10, rot: Math.PI / 4, label: ['ATMEGA4809'] },
      { w: 1.6, d: 1.6, x: 3.9, z: 3, legs: 6, label: ['SAMD11'] },
    ],
    buttons: [{ x: 13.6, z: 3, cap: 0xf0f0f0, size: 1.0 }],
    led: { x: 11.6, z: 2.3, color: 0xffa21a },
    pwr: { x: 11.6, z: 3.7, color: 0x35ff5a },
    texts: [{ s: 'NANO EVERY', x: 5.8, z: 1.3, size: 0.42, weight: '800' }],
    tag: 0.4,
  },
  arduino_nano_33_ble: {
    len: 17.7, wid: 7.1, x0: -1.35, pcb: 0x0b7a83, fill: '#0f858e', trace: 'rgba(6,90,97,0.75)', seed: 35, pins: 'through',
    usb: { kind: 'micro', x: -0.6 },
    chips: [{ w: 1.8, d: 1.8, x: 3.6, z: 3, legs: 6 }],
    can: { w: 4.0, d: 5.9, h: 0.75, x: 8.6, z: 3, label: ['NINA-B306', 'u-blox'] },
    buttons: [{ x: 13.8, z: 3, cap: 0xf0f0f0, size: 1.0 }],
    led: { x: 12.0, z: 2.3, color: 0xffa21a },
    pwr: { x: 12.0, z: 3.7, color: 0x35ff5a },
    texts: [{ s: 'NANO 33 BLE', x: 3.6, z: 4.7, size: 0.4, weight: '800' }],
    tag: 0.4,
  },
  feather_rp2040: {
    len: 20, wid: 9, x0: -2.5, pcb: 0x141414, fill: '#171717', trace: 'rgba(44,44,44,0.9)', seed: 37, pins: 'through',
    usb: { kind: 'c', x: -2.0 },
    chips: [
      { w: 2.8, d: 2.8, x: 7.4, z: -4, legs: 10, label: ['RP2040'] },
      { w: 2.0, d: 2.0, x: 11.2, z: -4, legs: 4, label: ['8MB'] },
    ],
    crystal: { x: 4.8, z: -2.8, w: 1.0, d: 0.8 },
    buttons: [{ x: 1.6, z: -5.6, cap: 0x2a2a2a, size: 1.0 }, { x: 1.6, z: -2.4, cap: 0x2a2a2a, size: 1.0 }],
    boxes: [{ x: 15.6, z: -4.0, w: 2.4, d: 3.0, h: 1.6, mat: 0xf2efe6 }, { x: 4.6, z: -5.6, w: 1.0, d: 1.0, h: 0.4, mat: 0xf4f4f4 }],
    led: { x: 13.3, z: -6.0, color: 0xff3020 },
    pwr: { x: 13.3, z: -2.0, color: 0x35ff5a },
    texts: [{ s: 'Feather RP2040', x: 9.2, z: -1.9, size: 0.5, weight: '800' }],
    tag: 0.38,
  },
  microbit_v2: {
    len: 21, wid: 7.1, x0: -1.0, pcb: 0x121212, fill: '#141414', trace: 'rgba(40,40,40,0.9)', seed: 39, pins: 'through',
    chips: [],
    buttons: [],
    texts: [{ s: 'edge-connector breakout', x: 9, z: 4.6, size: 0.42 }],
    tag: 0.38,
    card: 'microbit',
  },
  teensy40: {
    len: 14.0, wid: 7.0, x0: -0.5, pcb: 0x1d6b37, fill: '#1f7a3d', trace: 'rgba(14,90,40,0.8)', seed: 31, pins: 'through',
    usb: { kind: 'micro', x: 0.1 },
    chips: [
      { w: 3.9, d: 3.9, x: 7.0, z: 3, legs: 0, h: 0.5, label: ['MIMXRT1062', 'DVJ6A'] },
      { w: 1.6, d: 1.3, x: 10.6, z: 3, legs: 4 },
    ],
    buttons: [{ x: 12.3, z: 3, cap: 0xf0f0f0, size: 0.9 }],
    led: { x: 12.3, z: 4.3, color: 0xff8a1a },
    texts: [{ s: 'Teensy 4.0', x: 2.9, z: 3, size: 0.46, weight: '800' }],
    tag: 0.4,
  },
}

/** breadboard rows in plan units across the channel (rows e → f jump the 0.2" channel) */
const ROW_Z: Record<string, number> = { a: -2, b: -1, c: 0, d: 1, e: 2, f: 4, g: 5, h: 6, i: 7, j: 8 }

function buildDip(def: BoardDef, pins: THREE.Vector3[]): BuildResult {
  const L = DIP_LOOKS[def.type]
  const group = footprintFrame(pins)
  const fp = def.footprint!
  // every pin in the frame: x along the rows from pin 1, z across (row of pin 1 = 0)
  const pos = fp.map((f) => ({ x: f.dCol - fp[0].dCol, z: ROW_Z[f.row] - ROW_Z[fp[0].row] }))
  const zs = [...new Set(pos.map((p) => p.z))]
  const mid = (Math.min(...zs) + Math.max(...zs)) / 2
  const yPcb = 1.0
  const thick = 0.63
  const top = yPcb + thick
  const z0 = mid - L.wid / 2
  const stat: THREE.Object3D[] = []
  // pins into the holes + black spacer bars between breadboard and PCB
  for (const p of pos) {
    stat.push(box(0.25, 2.4, 0.25, MAT.gold(), p.x, 0.4, p.z))
    if (L.pins === 'through') stat.push(box(0.25, 0.6, 0.25, MAT.gold(), p.x, top + 0.25, p.z))
    else stat.push(box(0.6, 0.05, 0.7, MAT.gold(), p.x, top + 0.03, p.z + (p.z < mid ? -0.1 : 0.1)))
  }
  for (const z of zs) {
    const xs = pos.filter((p) => p.z === z).map((p) => p.x)
    // one spacer per run of neighbouring pins
    const sorted = [...xs].sort((a, b) => a - b)
    let a = sorted[0]
    for (let k = 1; k <= sorted.length; k++) {
      if (k === sorted.length || sorted[k] !== sorted[k - 1] + 1) {
        const b = sorted[k - 1]
        stat.push(box(b - a + 1, 1, 1, MAT.headerBlack(), (a + b) / 2, 0.5, z))
        a = sorted[k]
      }
    }
  }
  if (L.usb) stat.push(...(L.usb.kind === 'c' ? usbC(L.usb.x, top, mid) : usbMicro(L.usb.x, top, mid)))
  for (const c of L.chips) {
    const parts = c.legs ? smdChip(c.w, c.d, c.h ?? 0.4, c.x, top, c.z, c.legs, true) : [box(c.w, c.h ?? 0.4, c.d, MAT.chip(), c.x, top + (c.h ?? 0.4) / 2, c.z)]
    stat.push(...(c.rot ? turned(parts, c.x, c.z, c.rot) : parts))
  }
  if (L.can) stat.push(box(L.can.w, L.can.h, L.can.d, satinMetal(0x8a9097), L.can.x, top + L.can.h / 2, L.can.z))
  if (L.crystal) stat.push(box(L.crystal.w, 0.5, L.crystal.d, MAT.steel(), L.crystal.x, top + 0.25, L.crystal.z))
  if (L.ceramic) stat.push(box(0.8, 0.45, 2.4, plastic(0xe9e4d8, 0.4), L.ceramic.x, top + 0.23, L.ceramic.z))
  for (const b of L.buttons) stat.push(...button(b.x, top, b.z, b.cap, b.size))
  for (const j of L.jumpers ?? []) {
    stat.push(...malePins([0, 1, 2].map((k) => ({ x: j.x - 1 + k, z: j.z })), top, top, top + 2.3))
    stat.push(box(0.9, 1.5, 1.0, plastic(0xf2c230, 0.5), j.x - 0.5, top + 1.75, j.z))
  }
  if (L.swd) stat.push(...malePins(Array.from({ length: L.swd.n }, (_, k) => ({ x: L.swd!.x, z: L.swd!.z0 + k })), top, top, top + 2.5))
  for (const b of L.boxes ?? []) stat.push(box(b.w, b.h, b.d, typeof b.mat === 'number' ? plastic(b.mat, 0.5) : b.mat === 'steel' ? MAT.steel() : MAT.white(), b.x, top + b.h / 2, b.z))
  addStatic(group, stat)
  group.add(
    pcb(def.type, L.len, L.wid, thick, L.pcb, yPcb, L.x0, z0, (ctx, px) => {
      ctx.fillStyle = L.fill
      ctx.fillRect(0, 0, L.len * px, L.wid * px)
      traces(ctx, L.len * px, L.wid * px, L.trace, L.seed)
      pos.forEach((p, i) => {
        const xx = p.x - L.x0
        const zz = p.z - z0
        ctx.fillStyle = '#e2c46a'
        if (L.pins === 'castellated') {
          ctx.fillRect((xx - 0.32) * px, (zz < L.wid / 2 ? 0 : zz - 0.45) * px, 0.64 * px, (zz < L.wid / 2 ? zz + 0.45 : L.wid - zz + 0.45) * px)
        } else ctx.fillRect((xx - 0.38) * px, (zz - 0.38) * px, 0.76 * px, 0.76 * px)
        const name = def.pins[i]
        pcbTag(ctx, px, { text: pinLabel(name, def), kind: pinKind(name, def) }, xx, zz, zz < L.wid / 2 ? 1 : -1, L.tag)
      })
      for (const t of L.texts) text(ctx, px, t.s, t.x - L.x0, t.z - z0, t.size, { weight: t.weight ?? '700' })
    }),
  )
  for (const c of L.chips) {
    if (!c.label) continue
    const lbl = chipLabel(c.label, c.w - 0.2, c.d - 0.2, c.x, top + (c.h ?? 0.4) + 0.02, c.z, c.rot ?? 0)
    if (lbl) group.add(lbl)
  }
  if (L.can) {
    const lbl = chipLabel(L.can.label, L.can.w - 0.3, L.can.d - 0.3, L.can.x, top + L.can.h + 0.01, L.can.z)
    if (lbl) group.add(lbl)
  }
  const led = L.led ? smdLed(L.led.color, L.led.x, top, L.led.z) : null
  if (led) group.add(led.mesh)
  if (L.pwr) {
    const pwr = smdLed(L.pwr.color, L.pwr.x, top, L.pwr.z)
    pwr.mat.emissiveIntensity = 2
  powerLed(pwr.mat)
    group.add(pwr.mesh)
  }
  const card = L.card === 'microbit' ? microbitCard(top, mid) : null
  if (card) group.add(card.group)
  const warn = beacon()
  warn.group.position.set(L.x0 + L.len / 2, top + (card ? 18 : 3), mid)
  group.add(warn.group)
  return {
    object: group,
    pinWorld: pins.map((p) => p.clone()),
    update: (_c, _e, t) => {
      if (led) led.mat.emissiveIntensity = t?.mcu?.led ? 3.2 : 0
      card?.set(!!t?.mcu?.led)
      warn.set(!!t?.mcu?.damage.length, performance.now() / 1000)
    },
  }
}

/**
 * The micro:bit v2 standing in the breakout's edge connector, front (LEDs,
 * buttons A / B, the 0 / 1 / 2 / 3V / GND rings) toward the viewer (+z).
 * 51.6 × 42 mm, 1.6 mm thick; the 5 × 5 display lights with the LED pin.
 */
function microbitCard(top: number, mid: number): { group: THREE.Group; set(on: boolean): void } {
  const g = new THREE.Group()
  const W = 51.6 / 2.54
  const H = 42 / 2.54
  const T = 0.63
  const x0 = -0.6
  const cx = x0 + W / 2
  const y0 = top + 0.5
  const stat: THREE.Object3D[] = [
    box(W + 0.6, 1.4, 1.6, plastic(0x111111, 0.6), cx, top + 0.7, mid),
    box(W, H, T, plastic(0x141414, 0.55), cx, y0 + H / 2, mid),
  ]
  // buttons A (left) and B (right) on the front, the round logo above the display
  for (const bx of [cx - 7.4, cx + 7.4]) {
    stat.push(box(2.4, 2.4, 0.5, MAT.steel(), bx, y0 + H * 0.56, mid + T / 2 + 0.25))
    const cap = cyl(0.75, 0.5, plastic(0x1b1b1b, 0.5), bx, y0 + H * 0.56, mid + T / 2 + 0.7)
    cap.rotation.x = Math.PI / 2
    stat.push(cap)
  }
  addStatic(g, stat)
  const tex = art('microbit-front', 640, 520, (ctx) => {
    const sx = 640 / W
    const sy = 520 / H
    ctx.fillStyle = '#151515'
    ctx.fillRect(0, 0, 640, 520)
    // gold rings and strips along the bottom edge
    ctx.fillStyle = '#d8b45a'
    const strip = (xMm: number, wMm: number) => ctx.fillRect((xMm / 2.54) * sx, 520 - 4.2 * sy, (wMm / 2.54) * sx, 4.2 * sy)
    for (let k = 0; k < 40; k++) strip(1.6 + k * 1.22, 0.7)
    const rings: [string, number][] = [['0', 5.8], ['1', 15.6], ['2', 25.8], ['3V', 36], ['GND', 45.8]]
    for (const [lbl, xMm] of rings) {
      ctx.fillStyle = '#d8b45a'
      ctx.fillRect(((xMm - 3.6) / 2.54) * sx, 520 - 6.6 * sy, (7.2 / 2.54) * sx, 6.6 * sy)
      ctx.fillStyle = '#151515'
      ctx.beginPath()
      ctx.arc((xMm / 2.54) * sx, 520 - 4.6 * sy, 0.8 * sx, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f2f2f2'
      ctx.font = `700 ${0.9 * sy}px ${UI_FONT}`
      ctx.textAlign = 'center'
      ctx.fillText(lbl, (xMm / 2.54) * sx, 520 - 7.2 * sy)
    }
    ctx.fillStyle = '#f2f2f2'
    ctx.font = `700 ${0.85 * sy}px ${UI_FONT}`
    ctx.textAlign = 'center'
    ctx.fillText('A', (W / 2 - 7.4) * sx, H * 0.3 * sy)
    ctx.fillText('B', (W / 2 + 7.4) * sx, H * 0.3 * sy)
    ctx.font = `700 ${0.7 * sy}px ${UI_FONT}`
    ctx.fillText('micro:bit', (W / 2) * sx, 1.5 * sy)
    ctx.strokeStyle = '#d8b45a'
    ctx.lineWidth = 0.18 * sx
    ctx.beginPath()
    ctx.ellipse((W / 2) * sx, 3.0 * sy, 1.1 * sx, 0.7 * sy, 0, 0, Math.PI * 2)
    ctx.stroke()
  })
  if (tex) {
    const face = new THREE.Mesh(cachedGeometry(`mbface:${W}:${H}`, () => new THREE.PlaneGeometry(W, H)), cachedMaterial('mbfacem', () => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 })))
    face.position.set(cx, y0 + H / 2, mid + T / 2 + 0.004)
    g.add(face)
  }
  // the 5 × 5 display
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xf0e6dc, roughness: 0.35, emissive: new THREE.Color(0xff2a14), emissiveIntensity: 0 })
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      g.add(box(0.36, 0.5, 0.2, mat, cx + (c - 2) * 1.6, y0 + H * 0.56 + (2 - r) * 1.6, mid + T / 2 + 0.1))
    }
  }
  return {
    group: g,
    set(on: boolean) {
      mat.emissiveIntensity = on ? 3 : 0
    },
  }
}

// ------------------------------------------- bench boards from a look table

/**
 * A bench board drawn from data (Raspberry Pi family, LaunchPads, Nucleo,
 * BeagleBone, nRF52840 DK, micro:bit breakout, ESP-01 …): PCB outline and
 * colour, the parts on it, printed text, LEDs. Everything is in MILLIMETRES
 * from the board's top-left corner (x right, z toward the front), as on the
 * makers' drawings; the headers come from the bench geometry (boards.ts).
 */
type BenchMat = 'steel' | 'black' | 'white' | 'chip' | 'gold' | 'blue' | 'yellow' | 'red' | 'grey' | number
interface BenchPart {
  /** box (default) or a cylinder standing up (cyl) / lying along x (barrel) */
  kind?: 'box' | 'cyl' | 'barrel'
  x: number
  z: number
  w: number
  d: number
  h: number
  /** bottom above the PCB top (negative: under the board) */
  y?: number
  mat: BenchMat
  /** printed on top (chips, shield cans) */
  label?: string[]
  /** turned about y (radians) */
  rot?: number
  /** a chip with gull-wing legs on all four sides */
  legs?: number
}
interface BenchLook {
  w: number
  d: number
  /** PCB colour (sides) and the painted top */
  pcb: number
  fill: string
  trace: string
  seed: number
  /** PCB underside above the bench and thickness (mm) */
  lift: number
  thick: number
  /** header pin tips (plan units) */
  pinY: number
  /** male headers sit on a plastic spacer this tall (mm); female sockets reach pinY */
  spacer: number
  holes?: [number, number][]
  parts: BenchPart[]
  /** the USB power socket's mouth (mm, height above the PCB) and which way the cable leaves */
  usbIn?: { x: number; z: number; y: number; exit: '-x' | '+x' | '-z' | '+z'; kind: 'c' | 'micro' }
  texts?: { s: string; x: number; z: number; size: number; weight?: string; rot?: number; color?: string }[]
  /** user LED (follows the program), power LED (lit), mm positions */
  led?: { x: number; z: number; color: number }
  power?: { x: number; z: number; color: number }[]
  /** colour pin tags printed on the PCB beside rows that have room */
  tags?: boolean
  tagSize?: number
  /** physical pin numbers printed at the ends of the header (Raspberry Pi J8) */
  pinNumbers?: boolean
  /** user LEDs driven by program pins (pin name → LED) */
  pinLeds?: { pin: string; x: number; z: number; color: number; activeLow?: boolean }[]
}

const STEEL = () => satinMetal(0x6f767e)
function benchMat(m: BenchMat): THREE.Material {
  if (typeof m === 'number') return plastic(m, 0.5)
  switch (m) {
    case 'steel': return STEEL()
    case 'black': return plastic(0x151515, 0.55)
    case 'white': return MAT.white()
    case 'chip': return MAT.chip()
    case 'gold': return MAT.gold()
    case 'blue': return plastic(0x1f5fd0, 0.45)
    case 'yellow': return plastic(0xf2c230, 0.5)
    case 'red': return plastic(0xc83a2e, 0.5)
    case 'grey': return plastic(0x9a9fa6, 0.5)
  }
}

/** Raspberry Pi parts shared by the 85 × 56 mm boards */
const PI_GREEN = { pcb: 0x1d6e35, fill: '#22793c', trace: 'rgba(14,92,42,0.85)' }
const PI_HOLES: [number, number][] = [[3.5, 3.5], [61.5, 3.5], [3.5, 52.5], [61.5, 52.5]]
const usbStack = (z: number, blue: boolean): BenchPart[] => [
  { x: 77.5, z, w: 17.5, d: 14.6, h: 15.6, mat: 'steel' },
  { x: 86.2, z: z - 3.4, w: 0.3, d: 12, h: 1.9, y: 10.6, mat: blue ? 'blue' : 'black' },
  { x: 86.2, z: z - 3.4, w: 0.3, d: 12, h: 1.9, y: 3.0, mat: blue ? 'blue' : 'black' },
]
const rj45 = (z: number): BenchPart[] => [
  { x: 75.5, z, w: 21.3, d: 16, h: 13.5, mat: 'steel' },
  { x: 86.2, z, w: 0.3, d: 11.5, h: 8, y: 2.4, mat: 'black' },
]
const PI_LOOKS: Record<string, BenchLook> = {
  rpi4: {
    w: 85, d: 56, ...PI_GREEN, seed: 41, lift: 1.2, thick: 1.4, pinY: 4.3, spacer: 2.5, holes: PI_HOLES, tags: true, pinNumbers: true,
    usbIn: { x: 11.2, z: 57.2, y: 1.65, exit: '+z', kind: 'c' },
    parts: [
      { x: 29, z: 32, w: 15.5, d: 15.5, h: 2.2, mat: 'steel', label: ['BCM2711'] },
      { x: 46, z: 32, w: 14, d: 10, h: 1.0, mat: 'chip', label: ['LPDDR4'] },
      { x: 13.5, z: 17, w: 11, d: 9.5, h: 1.4, mat: 'steel' },
      { x: 66, z: 33, w: 7, d: 7, h: 0.9, mat: 'chip', legs: 12, label: ['VL805'] },
      { x: 61, z: 46, w: 5, d: 5, h: 0.8, mat: 'chip', legs: 8 },
      ...usbStack(47, false), ...usbStack(29, true), ...rj45(10.25),
      { x: 11.2, z: 53.4, w: 9, d: 7.5, h: 3.3, mat: 'steel' },
      { x: 26, z: 53.4, w: 7.5, d: 7, h: 3.5, mat: 'steel' },
      { x: 39.5, z: 53.4, w: 7.5, d: 7, h: 3.5, mat: 'steel' },
      { x: 54, z: 50, w: 7, d: 12, h: 6, mat: 'black' },
      { kind: 'barrel', x: 54, z: 56.6, w: 6, d: 3, h: 6, y: 0, mat: 'black' },
      { x: 46.5, z: 47, w: 3, d: 22, h: 4.8, mat: 'white', rot: Math.PI / 2 },
      { x: 3.2, z: 28, w: 3, d: 22, h: 4.8, mat: 'white' },
      { x: 71, z: 3.5, w: 5.1, d: 5.1, h: 2.5, mat: 'black' },
      { x: 8, z: 28, w: 14, d: 15, h: 1.4, y: -2.6, mat: 'steel' },
      { x: -1.2, z: 28, w: 4, d: 11, h: 0.8, y: -2.2, mat: 'grey' },
    ],
    texts: [
      { s: 'Raspberry Pi 4 Model B', x: 40, z: 12.5, size: 2.6, weight: '700' },
      { s: '© Raspberry Pi 2019', x: 40, z: 16.2, size: 1.5 },
      { s: 'POWER', x: 11.2, z: 47.6, size: 1.2 },
      { s: 'HDMI0', x: 26, z: 47.4, size: 1.2 },
      { s: 'HDMI1', x: 39.5, z: 47.4, size: 1.2 },
      { s: 'CAMERA', x: 46.5, z: 43.4, size: 1.2 },
      { s: 'DISPLAY', x: 6.2, z: 28, size: 1.2, rot: -Math.PI / 2 },
      { s: 'J8', x: 5.3, z: 3.5, size: 1.6, weight: '700' },
    ],
    led: { x: 1.6, z: 49.6, color: 0x35ff5a },
    power: [{ x: 1.6, z: 52.4, color: 0xff2a1a }],
  },
  rpi5: {
    w: 85, d: 56, ...PI_GREEN, seed: 43, lift: 1.2, thick: 1.4, pinY: 4.3, spacer: 2.5, holes: PI_HOLES, tags: true, pinNumbers: true,
    usbIn: { x: 11.2, z: 57.2, y: 1.65, exit: '+z', kind: 'c' },
    parts: [
      { x: 30, z: 31, w: 15.5, d: 15.5, h: 2.2, mat: 'steel', label: ['BCM2712'] },
      { x: 46.5, z: 31, w: 13, d: 10, h: 1.0, mat: 'chip', label: ['LPDDR4X'] },
      { x: 62.5, z: 31, w: 7.5, d: 7.5, h: 0.9, mat: 'chip', legs: 12, label: ['RP1'] },
      { x: 13.5, z: 17, w: 11, d: 9.5, h: 1.4, mat: 'steel' },
      ...usbStack(9, false), ...usbStack(26.9, true), ...rj45(45.8),
      { x: 11.2, z: 53.4, w: 9, d: 7.5, h: 3.3, mat: 'steel' },
      { x: 25.8, z: 53.4, w: 7.5, d: 7, h: 3.5, mat: 'steel' },
      { x: 39.2, z: 53.4, w: 7.5, d: 7, h: 3.5, mat: 'steel' },
      { x: 50, z: 51, w: 13.5, d: 3.2, h: 1.6, mat: 'black' },
      { x: 61.5, z: 51, w: 13.5, d: 3.2, h: 1.6, mat: 'black' },
      { x: 2.4, z: 26, w: 3, d: 16, h: 1.6, mat: 'black' },
      { x: 66, z: 9.5, w: 5, d: 3.2, h: 3.5, mat: 'white' },
      { x: 3.0, z: 46, w: 3.6, d: 3.6, h: 1.4, mat: 'steel' },
      { kind: 'cyl', x: 3.0, z: 46, w: 2.2, d: 2.2, h: 0.6, y: 1.4, mat: 'black' },
      { x: 8, z: 28, w: 14, d: 15, h: 1.4, y: -2.6, mat: 'steel' },
      { x: -1.2, z: 28, w: 4, d: 11, h: 0.8, y: -2.2, mat: 'grey' },
    ],
    texts: [
      { s: 'Raspberry Pi 5', x: 40, z: 12.5, size: 2.8, weight: '700' },
      { s: '© Raspberry Pi Ltd 2023', x: 40, z: 16.2, size: 1.5 },
      { s: 'CAM/DISP 0', x: 50, z: 48, size: 1.1 },
      { s: 'CAM/DISP 1', x: 61.5, z: 48, size: 1.1 },
      { s: 'PCIe', x: 6, z: 26, size: 1.2, rot: -Math.PI / 2 },
      { s: 'FAN', x: 66, z: 13.4, size: 1.1 },
      { s: 'J8', x: 5.3, z: 3.5, size: 1.6, weight: '700' },
    ],
    led: { x: 1.4, z: 39.6, color: 0x35ff5a },
    power: [{ x: 1.4, z: 41.6, color: 0xff2a1a }],
  },
  rpi3bplus: {
    w: 85, d: 56, ...PI_GREEN, seed: 47, lift: 1.2, thick: 1.4, pinY: 4.3, spacer: 2.5, holes: PI_HOLES, tags: true, pinNumbers: true,
    usbIn: { x: 10.6, z: 56.5, y: 1.3, exit: '+z', kind: 'micro' },
    parts: [
      { x: 29, z: 32, w: 14, d: 14, h: 1.6, mat: 'steel', label: ['BCM2837B0'] },
      { x: 15, z: 16, w: 12, d: 11, h: 1.4, mat: 'steel' },
      { x: 64, z: 35, w: 9, d: 9, h: 0.9, mat: 'chip', legs: 14, label: ['LAN7515'] },
      ...usbStack(9, false), ...usbStack(27, false), ...rj45(45.75),
      { x: 10.6, z: 54, w: 7.5, d: 5, h: 2.6, mat: 'steel' },
      { x: 32, z: 51.5, w: 15, d: 11.5, h: 6, mat: 'steel' },
      { x: 53.5, z: 50, w: 7, d: 12, h: 6, mat: 'black' },
      { kind: 'barrel', x: 53.5, z: 56.6, w: 6, d: 3, h: 6, y: 0, mat: 'black' },
      { x: 45, z: 45.5, w: 3, d: 22, h: 4.8, mat: 'white', rot: Math.PI / 2 },
      { x: 3.2, z: 28, w: 3, d: 22, h: 4.8, mat: 'white' },
      { x: 70.5, z: 3.5, w: 5.1, d: 5.1, h: 2.5, mat: 'black' },
      { x: -1.2, z: 28, w: 4, d: 11, h: 0.8, y: -2.2, mat: 'grey' },
    ],
    texts: [
      { s: 'Raspberry Pi 3 Model B+', x: 42, z: 12.5, size: 2.6, weight: '700' },
      { s: '© Raspberry Pi 2017', x: 42, z: 16.2, size: 1.5 },
      { s: 'HDMI', x: 32, z: 44, size: 1.2 },
      { s: 'CAMERA', x: 45, z: 42, size: 1.2 },
      { s: 'DISPLAY', x: 6.2, z: 28, size: 1.2, rot: -Math.PI / 2 },
      { s: 'J8', x: 5.3, z: 3.5, size: 1.6, weight: '700' },
    ],
    led: { x: 1.6, z: 44, color: 0x35ff5a },
    power: [{ x: 1.6, z: 47, color: 0xff2a1a }],
  },
  rpi_zero2w: {
    w: 65, d: 30, ...PI_GREEN, seed: 49, lift: 1.2, thick: 1.0, pinY: 4.3, spacer: 2.5, holes: [[3.5, 3.5], [61.5, 3.5], [3.5, 26.5], [61.5, 26.5]], tags: true, pinNumbers: true,
    usbIn: { x: 54, z: 30, y: 1.3, exit: '+z', kind: 'micro' },
    parts: [
      { x: 35, z: 17, w: 14, d: 14, h: 1.6, mat: 'steel', label: ['RP3A0', '512MB'] },
      { x: 6.5, z: 16, w: 12, d: 12, h: 1.4, mat: 'steel' },
      { x: -1.5, z: 16, w: 4, d: 11, h: 0.8, y: 0.2, mat: 'grey' },
      { x: 12.4, z: 26.8, w: 11.2, d: 7.5, h: 3.2, mat: 'steel' },
      { x: 41.4, z: 27.5, w: 7.5, d: 5, h: 2.6, mat: 'steel' },
      { x: 54, z: 27.5, w: 7.5, d: 5, h: 2.6, mat: 'steel' },
      { x: 63, z: 15, w: 4, d: 17, h: 1.4, mat: 'black' },
      { x: 50, z: 12, w: 4, d: 4, h: 0.8, mat: 'chip', legs: 6 },
    ],
    texts: [
      { s: 'Raspberry Pi Zero 2 W', x: 24, z: 21.2, size: 1.5, weight: '700' },
      { s: 'mini HDMI', x: 12.4, z: 21.6, size: 1.1 },
      { s: 'USB', x: 41.4, z: 23.8, size: 1.1 },
      { s: 'PWR IN', x: 54, z: 23.8, size: 1.1 },
      { s: 'CAMERA', x: 59.6, z: 15, size: 1.1, rot: -Math.PI / 2 },
    ],
    led: { x: 58, z: 22.4, color: 0x35ff5a },
  },
}
/** TI LaunchPads (red PCBs), the Nucleo-64 (white) and the BeagleBone Black (black) */
const LP_RED = { pcb: 0x9e1218, fill: '#ad171e', trace: 'rgba(120,10,16,0.8)' }
const btn = (x: number, z: number, cap: number, label?: string[]): BenchPart[] => [
  { x, z, w: 6, d: 6, h: 1.8, mat: 'steel' },
  { kind: 'cyl', x, z, w: 3.4, d: 3.4, h: 1.4, y: 1.8, mat: cap, label },
]
const OTHER_LOOKS: Record<string, BenchLook> = {
  msp_exp430g2et: {
    w: 53.3, d: 66, ...LP_RED, seed: 61, lift: 1.6, thick: 1.6, pinY: 4.0, spacer: 2.5, tags: true,
    holes: [[3.5, 3.5], [49.8, 3.5], [3.5, 62.5], [49.8, 62.5]],
    parts: [
      { x: 26.6, z: 2.4, w: 7.5, d: 5.5, h: 2.6, mat: 'steel' },
      { x: 26.6, z: 10.5, w: 7, d: 7, h: 0.9, mat: 'chip', legs: 12, label: ['eZ-FET'] },
      { x: 26.6, z: 38, w: 9.6, d: 26, h: 1.4, mat: 'black' },
      { x: 26.6, z: 38, w: 6.4, d: 25, h: 1.6, y: 1.4, mat: 'chip', label: ['MSP430G2553'] },
      ...[0, 1, 2, 3, 4].map((i): BenchPart => ({ x: 18.6 + i * 4, z: 18.5, w: 2.4, d: 5, h: 5.5, mat: 'black' })),
      ...btn(9, 60, 0x2a2a2a), ...btn(44.3, 60, 0x2a2a2a),
      { x: 39, z: 52, w: 3.2, d: 3.2, h: 1.4, mat: 'white' },
    ],
    texts: [
      { s: 'MSP-EXP430G2ET', x: 26.6, z: 56.5, size: 2.4, weight: '800' },
      { s: 'LaunchPad', x: 26.6, z: 60.5, size: 2.0, weight: '700' },
      { s: 'EMULATION (eZ-FET)', x: 13.5, z: 6, size: 1.4 },
      { s: 'J1', x: 3.8, z: 21, size: 1.6, weight: '800' },
      { s: 'J2', x: 49.5, z: 21, size: 1.6, weight: '800' },
      { s: 'S1  P1.3', x: 9, z: 55.5, size: 1.3 },
      { s: 'RESET', x: 44.3, z: 55.5, size: 1.3 },
      { s: 'P1.0', x: 13, z: 50.2, size: 1.1 },
      { s: 'P1.6', x: 18, z: 50.2, size: 1.1 },
      { s: 'RGB', x: 39, z: 49, size: 1.1 },
    ],
    power: [{ x: 33, z: 3.5, color: 0x35ff5a }],
    pinLeds: [
      { pin: 'P1_0', x: 13, z: 52.5, color: 0x35ff5a },
      { pin: 'P1_6', x: 18, z: 52.5, color: 0xff2a1a },
    ],
  },
  ek_tm4c123gxl: {
    w: 50.8, d: 57.15, ...LP_RED, seed: 63, lift: 1.6, thick: 1.6, pinY: 4.0, spacer: 2.5, tags: true,
    holes: [[3.2, 3.2], [47.6, 3.2], [3.2, 18], [47.6, 18]],
    parts: [
      { x: 14, z: 2.6, w: 7.5, d: 5.5, h: 2.6, mat: 'steel' },
      { x: 37, z: 2.6, w: 7.5, d: 5.5, h: 2.6, mat: 'steel' },
      { x: 25.4, z: 3.2, w: 6, d: 3, h: 2.2, mat: 'white' },
      { x: 25.4, z: 13.5, w: 9.5, d: 9.5, h: 1.2, mat: 'chip', legs: 16, label: ['TM4C123G', 'ICDI'] },
      { x: 25.4, z: 40, w: 10, d: 10, h: 1.2, mat: 'chip', legs: 16, label: ['TM4C123GH6PM'] },
      { x: 17, z: 40, w: 4, d: 1.8, h: 1.2, mat: 'steel' },
      ...btn(10, 53.4, 0x2a2a2a), ...btn(40.8, 53.4, 0x2a2a2a), ...btn(44.5, 10.5, 0x2a2a2a),
    ],
    texts: [
      { s: 'Tiva C Series LaunchPad', x: 25.4, z: 24.5, size: 1.9, weight: '800' },
      { s: 'EK-TM4C123GXL', x: 25.4, z: 27.6, size: 1.6, weight: '700' },
      { s: 'DEBUG', x: 14, z: 7.2, size: 1.2 },
      { s: 'DEVICE', x: 37, z: 7.2, size: 1.2 },
      { s: 'SW1', x: 10, z: 49.2, size: 1.3 },
      { s: 'SW2', x: 40.8, z: 49.2, size: 1.3 },
      { s: 'RESET', x: 44.5, z: 15.4, size: 1.2 },
      { s: 'J1 J3', x: 4.0, z: 22.6, size: 1.3, weight: '800' },
      { s: 'J4 J2', x: 47.0, z: 22.6, size: 1.3, weight: '800' },
      { s: 'RGB', x: 33.5, z: 49.6, size: 1.1 },
    ],
    power: [{ x: 20, z: 7.5, color: 0x35ff5a }],
    pinLeds: [
      { pin: 'PF1', x: 32.2, z: 52, color: 0xff2a1a },
      { pin: 'PF2', x: 33.6, z: 52, color: 0x2d6bff },
      { pin: 'PF3', x: 35.0, z: 52, color: 0x35ff5a },
    ],
  },
  nucleo_f401re: {
    w: 70, d: 82.5, pcb: 0xe6e5df, fill: '#f0efe9', trace: 'rgba(196,196,186,0.55)', seed: 65, lift: 1.6, thick: 1.6, pinY: 4.4, spacer: 2.5, tags: false,
    holes: [[4, 4], [66, 4], [4, 78.5], [66, 78.5]],
    parts: [
      { x: 35, z: 2.8, w: 7.5, d: 6, h: 3.9, mat: 'steel' },
      { x: 35, z: 12, w: 7, d: 7, h: 0.9, mat: 'chip', legs: 8, label: ['STM32F103', 'ST-LINK'] },
      { x: 50, z: 7, w: 2.6, d: 5.2, h: 5.5, mat: 'black' },
      { x: 53, z: 7, w: 2.6, d: 5.2, h: 5.5, mat: 'black' },
      { x: 35, z: 49, w: 10, d: 10, h: 1.2, mat: 'chip', legs: 12, rot: Math.PI / 4, label: ['STM32F401RE'] },
      { x: 44, z: 57, w: 3.2, d: 1.4, h: 1, mat: 'steel' },
      ...btn(21, 27, 0x1e5fd0, ['B1']), ...btn(49, 27, 0x161616, ['B2']),
    ],
    texts: [
      { s: 'NUCLEO-F401RE', x: 35, z: 72, size: 2.8, weight: '800', color: '#1d2b44' },
      { s: 'ST-LINK/V2-1', x: 35, z: 18, size: 1.6, weight: '700', color: '#1d2b44' },
      { s: '— — — — — — — — — — — — — — — — — —', x: 35, z: 21, size: 1.2, color: '#7b8493' },
      { s: 'USER', x: 21, z: 32, size: 1.2, color: '#1d2b44' },
      { s: 'RESET', x: 49, z: 32, size: 1.2, color: '#1d2b44' },
      { s: 'CN7', x: 5.1, z: 19.5, size: 1.4, weight: '800', color: '#1d2b44' },
      { s: 'CN10', x: 64.9, z: 19.5, size: 1.4, weight: '800', color: '#1d2b44' },
      { s: 'ARDUINO', x: 15.5, z: 30, size: 1.2, weight: '700', color: '#1d2b44', rot: -Math.PI / 2 },
      { s: 'LD2', x: 41, z: 36.5, size: 1.1, color: '#1d2b44' },
    ],
    power: [{ x: 45, z: 39, color: 0xff2a1a }, { x: 25, z: 9, color: 0xff8a1a }],
    pinLeds: [{ pin: 'D13', x: 41, z: 39, color: 0x35ff5a }],
  },
  beaglebone_black: {
    w: 86.36, d: 53.34, pcb: 0x121212, fill: '#151515', trace: 'rgba(40,40,40,0.9)', seed: 67, lift: 1.6, thick: 1.6, pinY: 3.9, spacer: 0, tags: true,
    holes: [[14.6, 3.2], [80.7, 6.4], [14.6, 50.2], [80.7, 47]],
    parts: [
      { x: 8.6, z: 23, w: 21.3, d: 16, h: 13.5, mat: 'steel' },
      { x: -2.1, z: 23, w: 0.3, d: 11.5, h: 8, y: 2.4, mat: 'black' },
      { x: 6.5, z: 39.5, w: 14, d: 9, h: 11, mat: 'black' },
      { x: 80, z: 23, w: 14, d: 13.5, h: 7, mat: 'steel' },
      { x: 48, z: 26, w: 15, d: 15, h: 1.3, mat: 'chip', label: ['AM3358', 'Sitara'] },
      { x: 66, z: 26, w: 10, d: 13, h: 1.1, mat: 'chip', label: ['DDR3L'] },
      { x: 30, z: 33, w: 11.5, d: 13, h: 1.1, mat: 'chip', label: ['eMMC'] },
      { x: 30, z: 17, w: 6, d: 6, h: 0.9, mat: 'chip', legs: 12, label: ['PMIC'] },
      ...btn(80.5, 39, 0x2a2a2a), ...btn(4.5, 49.5, 0x2a2a2a), ...btn(26, 47.5, 0x2a2a2a),
    ],
    texts: [
      { s: 'BeagleBone Black', x: 57, z: 37, size: 2.2, weight: '800' },
      { s: 'P8', x: 19.6, z: 3.9, size: 1.8, weight: '800' },
      { s: 'P9', x: 19.6, z: 49.5, size: 1.8, weight: '800' },
      { s: 'USR0-3', x: 22.8, z: 9.6, size: 1.0 },
      { s: 'BOOT', x: 80.5, z: 34.5, size: 1.1 },
      { s: 'RESET', x: 26, z: 43.0, size: 1.1 },
    ],
    led: { x: 21, z: 11.8, color: 0x3a8bff },
    power: [{ x: 23, z: 11.8, color: 0x1f4fb0 }, { x: 25, z: 11.8, color: 0x1f4fb0 }, { x: 27, z: 11.8, color: 0x1f4fb0 }],
  },
}
const BENCH_LOOKS: Record<string, BenchLook> = { ...PI_LOOKS, ...OTHER_LOOKS }

/** consecutive header pins (pitch 1, same row) as runs, for spacers and labels */
function headerRuns(geo: { terminals: { dx: number; dz: number }[] }, idx: number[]): { axis: 'x' | 'z'; pins: number[] }[] {
  const runs: { axis: 'x' | 'z'; pins: number[] }[] = []
  const left = new Set(idx)
  const t = geo.terminals
  for (const axis of ['x', 'z'] as const) {
    const along = (i: number) => (axis === 'x' ? t[i].dx : t[i].dz)
    const across = (i: number) => (axis === 'x' ? t[i].dz : t[i].dx)
    const byLine = new Map<string, number[]>()
    for (const i of left) {
      const k = across(i).toFixed(3)
      byLine.set(k, [...(byLine.get(k) ?? []), i])
    }
    for (const list of byLine.values()) {
      list.sort((a, b) => along(a) - along(b))
      let cur: number[] = []
      for (const i of list) {
        if (cur.length && Math.abs(along(i) - along(cur[cur.length - 1]) - 1) > 0.02) {
          if (cur.length > 1 || axis === 'z') runs.push({ axis, pins: cur })
          cur = []
        }
        cur.push(i)
      }
      if (cur.length > 1 || axis === 'z') runs.push({ axis, pins: cur })
    }
    for (const r of runs) for (const i of r.pins) left.delete(i)
  }
  return runs
}

/** a colour tag on the PCB running from a pin along +/−x or +/−z (text along the tag) */
function benchTag(ctx: CanvasRenderingContext2D, px: number, t: PinTag, x: number, z: number, dir: { x: number; z: number }, size: number): void {
  const st = PIN_KIND_STYLE[t.kind]
  ctx.save()
  ctx.font = `700 ${size * px}px ${UI_FONT}`
  const len = ctx.measureText(t.text).width / px + 0.34
  const w = 0.8
  ctx.translate(x * px, z * px)
  ctx.rotate(Math.atan2(dir.z, dir.x))
  // tag along +x in this frame, starting 0.62 from the pin
  ctx.fillStyle = st.fill
  ctx.beginPath()
  ctx.roundRect(0.62 * px, (-w / 2) * px, len * px, w * px, 0.18 * px)
  ctx.fill()
  if (t.kind === 'gnd') {
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth = 0.05 * px
    ctx.stroke()
  }
  ctx.translate((0.62 + len / 2) * px, 0)
  if (dir.x < -0.5 || dir.z < -0.5) ctx.rotate(Math.PI)
  ctx.fillStyle = st.ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(t.text, 0, 0.03 * px)
  ctx.restore()
}

function buildBench(def: BoardDef, pins: THREE.Vector3[]): BuildResult {
  const L = BENCH_LOOKS[def.type]
  const geo = offboardGeometry(def.type)!
  const u = (mm: number) => mm / 2.54
  const ax = pins[0].x - geo.terminals[0].dx
  const az = pins[0].z - geo.terminals[0].dz
  const W = u(L.w)
  const D = u(L.d)
  const yPcb = u(L.lift)
  const thick = u(L.thick)
  const top = yPcb + thick
  const group = new THREE.Group()
  group.position.set(ax, 0, az)
  const stat: THREE.Object3D[] = []
  // feet under the mounting holes (or the corners)
  for (const [x, z] of L.holes ?? [[3, 3], [L.w - 3, 3], [3, L.d - 3], [L.w - 3, L.d - 3]]) stat.push(cyl(u(2.6), yPcb, plastic(0x202020, 0.9), u(x), yPcb / 2, u(z), 14))

  // headers: male pins on spacers, female sockets for femalePins
  const tagOf = (i: number): PinTag => ({ text: pinLabel(def.pins[i], def), kind: pinKind(def.pins[i], def) })
  const female = new Set(def.femalePins ?? (def.header === 'female' ? def.pins : []))
  const maleIdx = def.pins.map((_, i) => i).filter((i) => !female.has(def.pins[i]))
  const femaleIdx = def.pins.map((_, i) => i).filter((i) => female.has(def.pins[i]))
  const spacerTop = top + u(L.spacer)
  if (maleIdx.length) stat.push(...malePins(maleIdx.map((i) => ({ x: geo.terminals[i].dx, z: geo.terminals[i].dz })), top, top - 0.2, L.pinY, false))
  for (const run of headerRuns(geo, maleIdx)) {
    const n = run.pins.length
    const t0 = geo.terminals[run.pins[0]]
    const h = spacerTop - top
    const bar = new THREE.Mesh(cachedGeometry(`spacer:${n}:${h.toFixed(3)}`, () => new THREE.BoxGeometry(n, h, 1)), MAT.headerBlack())
    const labels = new THREE.Group()
    labels.add(bar)
    bar.position.set((n - 1) / 2, top + h / 2, 0)
    for (const p of spacerLabels(run.pins.map(tagOf), 0, 0, top + h / 2)) {
      p.scale.y = h
      labels.add(p)
    }
    labels.position.set(t0.dx, 0, t0.dz)
    if (run.axis === 'z') labels.rotation.y = -Math.PI / 2
    labels.updateMatrixWorld(true)
    for (const c of [...labels.children]) {
      labels.remove(c)
      c.applyMatrix4(labels.matrix)
      stat.push(c)
    }
  }
  for (const run of headerRuns(geo, femaleIdx)) {
    const n = run.pins.length
    const t0 = geo.terminals[run.pins[0]]
    const tags = run.pins.map(tagOf)
    if (run.axis === 'x') stat.push(...femaleHeader(n, t0.dx + (n - 1) / 2, t0.dz, top, L.pinY, false, tags))
    else stat.push(...femaleHeader(n, t0.dx, t0.dz + (n - 1) / 2, top, L.pinY, true, [...tags].reverse()))
  }

  // parts
  for (const p of L.parts) {
    const mat = benchMat(p.mat)
    const y0 = top + u(p.y ?? 0)
    let parts: THREE.Object3D[]
    if (p.kind === 'cyl') parts = [cyl(u(p.w) / 2, u(p.h), mat, u(p.x), y0 + u(p.h) / 2, u(p.z), 20)]
    else if (p.kind === 'barrel') {
      const c = cyl(u(p.w) / 2, u(p.d), mat, u(p.x), y0 + u(p.h) / 2, u(p.z), 20)
      c.rotation.x = Math.PI / 2
      parts = [c]
    } else if (p.legs) parts = smdChip(u(p.w), u(p.d), u(p.h), u(p.x), y0, u(p.z), p.legs, true)
    else parts = [box(u(p.w), u(p.h), u(p.d), mat, u(p.x), y0 + u(p.h) / 2, u(p.z))]
    stat.push(...(p.rot ? turned(parts, u(p.x), u(p.z), p.rot) : parts))
  }
  if (L.usbIn) {
    const m = usbMark(u(L.usbIn.x), top + u(L.usbIn.y), u(L.usbIn.z), L.usbIn.kind)
    // the marker's −x is the way out: turn it to face the exit edge
    m.rotation.y = { '-x': 0, '+x': Math.PI, '+z': Math.PI / 2, '-z': -Math.PI / 2 }[L.usbIn.exit]
    stat.push(m)
  }
  addStatic(group, stat)

  const tagSize = L.tagSize ?? 0.42
  group.add(
    pcb(def.type, W, D, thick, L.pcb, yPcb, 0, 0, (ctx, px) => {
      ctx.fillStyle = L.fill
      ctx.fillRect(0, 0, W * px, D * px)
      traces(ctx, W * px, D * px, L.trace, L.seed)
      for (const [x, z] of L.holes ?? []) {
        ctx.fillStyle = '#d8c58c'
        ctx.beginPath()
        ctx.arc(u(x) * px, u(z) * px, u(3.1) * px, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#1b1b1b'
        ctx.beginPath()
        ctx.arc(u(x) * px, u(z) * px, u(1.4) * px, 0, Math.PI * 2)
        ctx.fill()
      }
      // pads under every pin, square for pin 1
      geo.terminals.forEach((t, i) => {
        ctx.fillStyle = '#d9b45a'
        if (i === 0) ctx.fillRect((t.dx - 0.42) * px, (t.dz - 0.42) * px, 0.84 * px, 0.84 * px)
        else {
          ctx.beginPath()
          ctx.arc(t.dx * px, t.dz * px, 0.42 * px, 0, Math.PI * 2)
          ctx.fill()
        }
      })
      if (L.tags) {
        // a tag beside each pin whose way toward the board's middle is free of other pins
        const at = new Set(geo.terminals.map((t) => `${Math.round(t.dx * 10)},${Math.round(t.dz * 10)}`))
        geo.terminals.forEach((t, i) => {
          const cands = [
            { x: 0, z: t.dz < D / 2 ? 1 : -1 },
            { x: t.dx < W / 2 ? 1 : -1, z: 0 },
          ].sort((a, b) => (Math.abs(a.z) ? Math.min(t.dz, D - t.dz) : Math.min(t.dx, W - t.dx)) - (Math.abs(b.z) ? Math.min(t.dz, D - t.dz) : Math.min(t.dx, W - t.dx)))
          for (const dir of cands) {
            const nx = Math.round((t.dx + dir.x) * 10)
            const nz = Math.round((t.dz + dir.z) * 10)
            if (at.has(`${nx},${nz}`)) continue
            // the run must be across this direction (tags of neighbours side by side)
            const side = `${Math.round((t.dx + dir.z) * 10)},${Math.round((t.dz + dir.x) * 10)}`
            const side2 = `${Math.round((t.dx - dir.z) * 10)},${Math.round((t.dz - dir.x) * 10)}`
            if (!at.has(side) && !at.has(side2) && geo.terminals.length > 2) continue
            benchTag(ctx, px, tagOf(i), t.dx, t.dz, dir, tagSize)
            break
          }
        })
      }
      if (L.pinNumbers && def.pinNumbers) {
        // J8 style: 1 / 2 at the left end, 39 / 40 at the right end
        for (const [name, n] of Object.entries(def.pinNumbers)) {
          if (n > 2 && n < 39) continue
          const t = geo.terminals[def.pins.indexOf(name)]
          text(ctx, px, String(n), t.dx + (n <= 2 ? -0.95 : 0.95), t.dz, 0.42, { weight: '700' })
        }
      }
      for (const t of L.texts ?? []) text(ctx, px, t.s, u(t.x), u(t.z), u(t.size), { weight: t.weight ?? '600', rotate: t.rot, color: t.color })
    }),
  )
  for (const p of L.parts) {
    if (!p.label) continue
    const lbl = chipLabel(p.label, u(p.w) - 0.3, u(p.d) - 0.3, u(p.x), top + u((p.y ?? 0) + p.h) + 0.01, u(p.z), p.rot ?? 0)
    if (lbl) group.add(lbl)
  }
  const led = L.led ? smdLed(L.led.color, u(L.led.x), top, u(L.led.z)) : null
  if (led) group.add(led.mesh)
  for (const p of L.power ?? []) {
    const m = smdLed(p.color, u(p.x), top, u(p.z))
    m.mat.emissiveIntensity = 2
    powerLed(m.mat)
    group.add(m.mesh)
  }
  const pinLeds = (L.pinLeds ?? []).map((p) => {
    const m = smdLed(p.color, u(p.x), top, u(p.z))
    group.add(m.mesh)
    return { ...p, m }
  })
  const warn = beacon()
  warn.group.position.set(W / 2, L.pinY + 2.5, D / 2)
  group.add(warn.group)
  const pinMark = damageMarks(def, pins, group, L.pinY)
  return {
    object: group,
    pinWorld: pins.map((p) => new THREE.Vector3(p.x, L.pinY, p.z)),
    update: (_c, _e, t) => {
      const mcu = t?.mcu
      if (led) led.mat.emissiveIntensity = mcu?.led ? 3.2 : 0
      for (const p of pinLeds) {
        const s = mcu?.pins[p.pin]
        const on = p.activeLow ? s === 'L' : s === 'H' || s === 'PWM'
        p.m.mat.emissiveIntensity = on ? 3 : 0
      }
      warn.set(!!mcu?.damage.length, performance.now() / 1000)
      pinMark(mcu?.damage ?? [])
    },
  }
}

/** power LEDs of the board being built (lit only while it has power) */
const POWER_LEDS: THREE.MeshPhysicalMaterial[] = []
function powerLed(m: THREE.MeshPhysicalMaterial): void {
  m.userData.on = m.emissiveIntensity
  POWER_LEDS.push(m)
}

/** the desk the bench stands on (the scene's laminate plane) */
const DESK_Y = -1.3

/**
 * The USB cable a board runs from: a moulded plug in its socket, a cable that
 * clears the breadboard and drops to the desk, and a 5 V USB charger at the
 * end. Built in world space, then parented to the board so it turns with it.
 */
function usbCable(group: THREE.Object3D, def: BoardDef, pins: THREE.Vector3[]): THREE.Object3D {
  group.updateMatrixWorld(true)
  const mark = group.getObjectByName('usb-port')
  const mouth = new THREE.Vector3()
  const dir = new THREE.Vector3(-1, 0, 0)
  let kind: 'c' | 'micro' | 'b' = 'c'
  if (mark) {
    mark.getWorldPosition(mouth)
    dir.applyQuaternion(mark.getWorldQuaternion(new THREE.Quaternion())).setY(0).normalize()
    kind = mark.userData.kind
  } else {
    // boards without a drawn socket: the cable goes into the middle of the left edge
    const box = new THREE.Box3().setFromObject(group)
    mouth.set(box.min.x, Math.min(box.max.y, box.min.y + 2.2), (box.min.z + box.max.z) / 2)
  }
  const side = new THREE.Vector3(-dir.z, 0, dir.x)
  // on the breadboard: stay above it until past its edge
  let clear = 1
  if (def.placement === 'footprint') {
    const x1 = holePosition({ kind: 'strip', col: 1, row: 'a' }).x - 1.6
    const xs = pins.map((p) => p.x)
    const zs = pins.map((p) => p.z)
    const x2 = Math.max(...xs) + 4
    if (Math.abs(dir.x) >= Math.abs(dir.z)) clear = dir.x < 0 ? mouth.x - x1 : x2 - mouth.x
    else clear = dir.z < 0 ? mouth.z - Math.min(-0.8, Math.min(...zs) - 2) : Math.max(16.8, Math.max(...zs) + 2) - mouth.z
    clear = Math.max(1.5, Math.min(40, clear))
  }
  const at = (d: number, y: number, s = 0) => mouth.clone().addScaledVector(dir, d).addScaledVector(side, s).setY(y)
  const root = new THREE.Group()
  root.name = 'usb-cable'
  // inverse of the board frame: children are placed in world coordinates
  group.matrixWorld.clone().invert().decompose(root.position, root.quaternion, root.scale)
  const yaw = -Math.atan2(dir.z, dir.x)
  const rubber = cachedMaterial('usb:rubber', () => new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.78, metalness: 0 }))
  // the moulded plug, sticking out of the socket
  const plugLen = kind === 'b' ? 2.8 : 2.2
  const ph = kind === 'b' ? 2.0 : 1.05
  const pw = kind === 'b' ? 2.4 : 1.6
  const plug = new THREE.Mesh(cachedGeometry(`usb:plug:${kind}`, () => new THREE.BoxGeometry(plugLen, ph, pw)), rubber)
  plug.position.copy(at(plugLen / 2, mouth.y))
  plug.rotation.y = yaw
  plug.castShadow = true
  root.add(plug)
  const boot = new THREE.Mesh(cachedGeometry('usb:boot', () => new THREE.CylinderGeometry(0.32, 0.5, 1.2, 8).rotateZ(Math.PI / 2)), rubber)
  boot.position.copy(at(plugLen + 0.55, mouth.y))
  boot.rotation.y = yaw
  root.add(boot)
  // the cable: level over the board, then down to the desk and along it to the charger
  const hi = Math.max(mouth.y - 0.1, 0.45)
  const run = Math.max(clear, plugLen + 2)
  const pts = [
    at(plugLen + 1.1, mouth.y),
    at(plugLen + 2.2, (mouth.y + hi) / 2),
    at(run, hi),
    at(run + 1.6, (hi + DESK_Y) / 2 + 0.2, 0.3),
    at(run + 3.2, DESK_Y + 0.25, 0.9),
    at(run + 6.5, DESK_Y + 0.25, 1.8),
    at(run + 8.6, DESK_Y + 0.6, 1.8),
  ]
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 40, 0.24, 6, false), rubber)
  tube.castShadow = true
  root.add(tube)
  // the 5 V USB charger at the end
  const brickMat = cachedMaterial('usb:brick', () => new THREE.MeshPhysicalMaterial({ color: 0xf1f0ec, roughness: 0.42, clearcoat: 0.4 }))
  const brick = new THREE.Mesh(cachedGeometry('usb:brickg', () => new THREE.BoxGeometry(4.2, 2.6, 3.6)), brickMat)
  brick.position.copy(at(run + 10.6, DESK_Y + 1.3, 1.8))
  brick.rotation.y = yaw
  brick.castShadow = true
  brick.receiveShadow = true
  root.add(brick)
  const tex = art('usb:label', 256, 220, (ctx) => {
    ctx.fillStyle = '#f1f0ec'
    ctx.fillRect(0, 0, 256, 220)
    ctx.fillStyle = '#2a2c31'
    ctx.textAlign = 'center'
    ctx.font = `700 64px ${UI_FONT}`
    ctx.fillText('USB', 128, 92)
    ctx.font = `600 46px ${UI_FONT}`
    ctx.fillText('5 V ⎓ 2 A', 128, 160)
  })
  if (tex) {
    const label = new THREE.Mesh(
      cachedGeometry('usb:labelg', () => new THREE.PlaneGeometry(3.4, 2.9).rotateX(-Math.PI / 2)),
      cachedMaterial('usb:labelm', () => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 })),
    )
    label.position.copy(at(run + 10.6, DESK_Y + 2.61, 1.8))
    label.rotation.y = yaw - Math.PI / 2
    root.add(label)
  }
  return root
}

export function buildBoard(comp: ComponentInstance, entry: CatalogEntry, pins: THREE.Vector3[]): BuildResult {
  const def = boardDef(comp.type)
  if (!def) throw new Error('unknown board')
  POWER_LEDS.length = 0
  const res = buildBoardBody(def, comp, entry, pins)
  const leds = POWER_LEDS.splice(0)
  if (comp.params?.usb !== false) res.object.add(usbCable(res.object, def, pins))
  const inner = res.update
  // power LEDs light only while the board has power (USB, or a supply on VIN / 5V)
  res.update = (c, e, t) => {
    inner?.(c, e, t)
    const on = t?.mcu?.powered !== false
    for (const m of leds) m.emissiveIntensity = on ? (m.userData.on as number) : 0
  }
  return res
}

function buildBoardBody(def: BoardDef, _comp: ComponentInstance, _entry: CatalogEntry, pins: THREE.Vector3[]): BuildResult {
  switch (def.type) {
    case 'arduino_uno':
    case 'arduino_mega':
    case 'arduino_uno_r4_minima':
    case 'arduino_uno_r4_wifi':
    case 'arduino_leonardo':
    case 'sparkfun_redboard':
      return buildArduino(def, pins)
    case 'esp32_devkit':
    case 'esp8266_nodemcu':
    case 'esp32s3_devkitc':
    case 'wemos_d1_mini':
    case 'arduino_mkr_wifi1010':
      return buildPinsUp(def, pins)
    case 'arduino_nano':
      return buildNano(def, pins)
    case 'rpi_pico':
    case 'rpi_pico_w':
    case 'rpi_pico2':
    case 'rpi_pico2_w':
      return buildPico(def, pins)
  }
  if (DIP_LOOKS[def.type]) return buildDip(def, pins)
  if (BENCH_LOOKS[def.type]) return buildBench(def, pins)
  throw new Error('unknown board')
}

export type { ComponentTelemetry }
