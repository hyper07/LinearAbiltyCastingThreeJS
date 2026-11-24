/**
 * Circuit Lab: compact 3D bench instruments (function generator, triple
 * supply, oscilloscope, DAQ, curve tracer) — a grey enclosure with a
 * front panel drawn to a canvas (name, live display, knobs), and binding
 * posts / BNC sockets exactly at their wire terminals — and the decade boxes.
 * Operated from the Bench panel; the 3D unit mirrors its display.
 */
import * as THREE from 'three'
import type { ComponentInstance, ComponentTelemetry } from '../../model/types'
import type { CatalogEntry } from '../../model/catalog'
import { offboardGeometry } from '../../model/breadboard'
import { BuildResult, cachedGeometry, mergeStatic, plastic } from './shared'
import { satinMetal } from './boards'

const TITLES: Record<string, string> = {
  signal_generator: 'FUNCTION GENERATOR',
  bench_supply: 'TRIPLE DC SUPPLY',
  oscilloscope: 'OSCILLOSCOPE',
  daq: 'DAQ · USB',
  curve_tracer: 'CURVE TRACER',
}
const POST_COLORS: Record<string, number> = { '+': 0xd23a2e, '5V': 0xd23a2e, out: 0xd23a2e, CH1: 0xe8c21f, CH2: 0x2fb7e0, C: 0xd23a2e, B: 0x2fb7e0 }

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const g = cachedGeometry(`bx:${w.toFixed(3)}:${h.toFixed(3)}:${d.toFixed(3)}`, () => new THREE.BoxGeometry(w, h, d))
  const m = new THREE.Mesh(g, mat)
  m.position.set(x, y, z)
  return m
}
function cyl(r: number, h: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const g = cachedGeometry(`cy:${r.toFixed(3)}:${h.toFixed(3)}:16`, () => new THREE.CylinderGeometry(r, r, h, 16))
  const m = new THREE.Mesh(g, mat)
  m.position.set(x, y, z)
  return m
}

function panelText(t: ComponentTelemetry | null, type: string): string[] {
  const x = t?.extra ?? {}
  const n = (k: string, d = 2) => (typeof x[k] === 'number' ? (x[k] as number).toFixed(d) : '—')
  switch (type) {
    case 'bench_supply':
      return [`CH1 ${n('v1')} V  ${(Number(x.i1 ?? 0) * 1000).toFixed(1)} mA ${x.cc1 ? 'CC' : 'CV'}`, `CH2 ${n('v2')} V  ${(Number(x.i2 ?? 0) * 1000).toFixed(1)} mA ${x.cc2 ? 'CC' : 'CV'}`, `5V  ${n('v3')} V`]
    case 'signal_generator':
      return [t?.reading ?? '', `offset ${n('offset')} V · ${x.load ?? ''}`, x.on === false ? 'OUTPUT OFF' : 'OUTPUT ON']
    case 'daq':
      return [`AO0 ${n('ao0')} V  AO1 ${n('ao1')} V`, `DIO ${x.dio ?? ''}`]
    default:
      return [t?.reading ?? '']
  }
}

export function buildBenchUnit(comp: ComponentInstance, entry: CatalogEntry, pins: THREE.Vector3[]): BuildResult {
  const geo = offboardGeometry(comp.type)!
  const ax = pins[0].x - geo.terminals[0].dx
  const az = pins[0].z - geo.terminals[0].dz
  const W = geo.rect.x1
  const D = geo.rect.z1 - 0.8
  const H = geo.height
  const group = new THREE.Group()
  group.position.set(ax, 0, az)
  const parts: THREE.Object3D[] = []
  const shell = plastic(comp.type === 'oscilloscope' ? 0x3b4048 : 0xc9ccd1, 0.55)
  parts.push(box(W, H, D, shell, W / 2, H / 2, D / 2))
  parts.push(box(W - 0.6, 0.25, D - 0.6, plastic(0x2b2e33, 0.6), W / 2, H + 0.12, D / 2))
  for (const x of [0.8, W - 0.8]) for (const z of [0.8, D - 0.8]) parts.push(cyl(0.45, 0.3, plastic(0x1a1a1a, 0.9), x, 0.15, z))
  // posts / BNC sockets at the terminals
  geo.terminals.forEach((t, i) => {
    const name = entry.pins[i]
    const col = POST_COLORS[name] ?? 0x1d1d1d
    const isBnc = comp.type === 'oscilloscope' || (comp.type === 'signal_generator' && name === 'out')
    if (isBnc) {
      const sock = cyl(0.42, 0.9, satinMetal(0xb9bec4), t.dx, t.y, D + 0.1)
      sock.rotation.x = Math.PI / 2
      parts.push(sock)
      const ring = cyl(0.5, 0.12, plastic(col, 0.4), t.dx, t.y, D + 0.02)
      ring.rotation.x = Math.PI / 2
      parts.push(ring)
    } else {
      const post = cyl(0.34, 0.8, plastic(col, 0.4), t.dx, t.y, D + 0.2)
      post.rotation.x = Math.PI / 2
      parts.push(post)
    }
  })
  for (const m of mergeStatic(parts)) {
    m.castShadow = true
    m.receiveShadow = true
    group.add(m)
  }
  // front panel: canvas texture on the front face
  let ctx: CanvasRenderingContext2D | null = null
  let tex: THREE.CanvasTexture | null = null
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas')
    c.width = Math.round(W * 48)
    c.height = Math.round(H * 48)
    ctx = c.getContext('2d')
    tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    const face = new THREE.Mesh(cachedGeometry(`benchface:${W}:${H}`, () => new THREE.PlaneGeometry(W, H)), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }))
    face.position.set(W / 2, H / 2, D + 0.005)
    group.add(face)
  }
  let last = ''
  const draw = (t: ComponentTelemetry | null) => {
    if (!ctx || !tex) return
    const lines = panelText(t, comp.type)
    const key = lines.join('|')
    if (key === last) return
    last = key
    const cw = ctx.canvas.width
    const ch = ctx.canvas.height
    ctx.fillStyle = comp.type === 'oscilloscope' ? '#3b4048' : '#cfd2d6'
    ctx.fillRect(0, 0, cw, ch)
    ctx.fillStyle = comp.type === 'oscilloscope' ? '#e9edf2' : '#2a2d31'
    ctx.font = 'bold 22px "Helvetica Neue", Arial'
    ctx.fillText(TITLES[comp.type] ?? entry.label.toUpperCase(), 14, 28)
    // display window
    const dw = comp.type === 'oscilloscope' ? cw * 0.55 : cw * 0.62
    const dh = ch * 0.5
    ctx.fillStyle = comp.type === 'oscilloscope' ? '#0b1a12' : '#12202a'
    ctx.fillRect(14, 40, dw, dh)
    ctx.fillStyle = comp.type === 'oscilloscope' ? '#7dff9a' : '#7fe0ff'
    ctx.font = '600 20px "SF Mono", Menlo, monospace'
    if (comp.type === 'oscilloscope') {
      ctx.strokeStyle = '#2a4a36'
      ctx.lineWidth = 1
      for (let i = 1; i < 10; i++) {
        ctx.beginPath()
        ctx.moveTo(14 + (dw * i) / 10, 40)
        ctx.lineTo(14 + (dw * i) / 10, 40 + dh)
        ctx.stroke()
      }
      ctx.strokeStyle = '#ffd84a'
      ctx.lineWidth = 3
      ctx.beginPath()
      for (let i = 0; i <= 100; i++) {
        const x = 14 + (dw * i) / 100
        const y = 40 + dh / 2 - Math.sin(i / 8) * dh * 0.3
        if (i) ctx.lineTo(x, y)
        else ctx.moveTo(x, y)
      }
      ctx.stroke()
    } else {
      lines.forEach((l, i) => ctx!.fillText(l, 24, 70 + i * 28))
    }
    // knobs
    ctx.fillStyle = '#25282c'
    const kx = 14 + dw + 30
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.arc(kx + (i % 2) * 54, 64 + Math.floor(i / 2) * 54, 18, 0, Math.PI * 2)
      ctx.fill()
    }
    // terminal labels
    ctx.fillStyle = comp.type === 'oscilloscope' ? '#e9edf2' : '#2a2d31'
    ctx.font = '600 16px "Helvetica Neue", Arial'
    geo.terminals.forEach((t, i) => {
      ctx!.textAlign = 'center'
      ctx!.fillText(entry.pins[i], t.dx * 48, ch - (t.y * 48 + 26))
    })
    ctx.textAlign = 'left'
    tex.needsUpdate = true
  }
  draw(null)
  return {
    object: group,
    pinWorld: pins.map((p) => p.clone()),
    update: (_c, _e, t) => draw(t),
  }
}

/** decade box: a little grey case on the bench in front of its two holes, with seven dials and two leads */
export function buildDecade(comp: ComponentInstance, _entry: CatalogEntry, pins: THREE.Vector3[]): BuildResult {
  const group = new THREE.Group()
  const [a, b] = pins
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5)
  const at = new THREE.Vector3(mid.x, 0, Math.max(a.z, b.z, 18) + 6)
  const parts: THREE.Object3D[] = []
  parts.push(box(12, 2.6, 5, plastic(0x8b9097, 0.55), at.x, 1.3, at.z))
  for (let i = 0; i < 7; i++) parts.push(cyl(0.55, 0.4, plastic(0x1c1c1c, 0.5), at.x - 4.8 + i * 1.6, 2.8, at.z - 0.6))
  parts.push(cyl(0.35, 0.8, plastic(0xd23a2e, 0.4), at.x - 1.2, 2.9, at.z + 1.6), cyl(0.35, 0.8, plastic(0x1d1d1d, 0.4), at.x + 1.2, 2.9, at.z + 1.6))
  for (const m of mergeStatic(parts)) {
    m.castShadow = true
    group.add(m)
  }
  const lead = (from: THREE.Vector3, to: THREE.Vector3, color: number) => {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(from.x, 3.2, from.z), new THREE.Vector3(from.x, 4, from.z - 3), new THREE.Vector3(to.x, 2.5, to.z + 1.2), new THREE.Vector3(to.x, 0.6, to.z), new THREE.Vector3(to.x, -0.15, to.z)])
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.13, 6, false), plastic(color, 0.5)))
  }
  lead(new THREE.Vector3(at.x - 1.2, 0, at.z + 1.6), a, 0xd23a2e)
  lead(new THREE.Vector3(at.x + 1.2, 0, at.z + 1.6), b, 0x1d1d1d)
  void comp
  return { object: group, pinWorld: pins.map((p) => p.clone()) }
}
