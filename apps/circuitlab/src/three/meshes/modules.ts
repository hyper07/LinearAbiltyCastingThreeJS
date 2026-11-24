/**
 * Circuit Lab: 3D models of the parts that need a board — SG90 servo, LCD
 * 16×2 with I²C backpack, 0.96" OLED, NeoPixel stick, HC-SR04, DHT22 — and
 * a handheld multimeter. Real proportions (1 unit = 0.1"), ohmlet's PBR
 * materials, displays drawn from the simulated controller state (the LCD's
 * DDRAM through a 5×8 dot matrix, the OLED's frame memory pixel for pixel).
 */
import * as THREE from 'three'
import type { ComponentInstance } from '../../model/types'
import type { CatalogEntry } from '../../model/catalog'
import { offboardGeometry } from '../../model/breadboard'
import { glyph } from '../../mcu/fast/font5x7'
import { BuildResult, cachedGeometry, cachedMaterial, mergeStatic, metal, moldedEpoxy, plastic } from './shared'
import { satinMetal } from './boards'
import { ui, drawReadout } from '../../ui/fonts'

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const g = cachedGeometry(`bx:${w.toFixed(3)}:${h.toFixed(3)}:${d.toFixed(3)}`, () => new THREE.BoxGeometry(w, h, d))
  const m = new THREE.Mesh(g, mat)
  m.position.set(x, y, z)
  return m
}
function cyl(r: number, h: number, mat: THREE.Material, x: number, y: number, z: number, seg = 24): THREE.Mesh {
  const g = cachedGeometry(`cy:${r.toFixed(3)}:${h.toFixed(3)}:${seg}`, () => new THREE.CylinderGeometry(r, r, h, seg))
  const m = new THREE.Mesh(g, mat)
  m.position.set(x, y, z)
  return m
}
function rounded(w: number, h: number, d: number, r: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const g = cachedGeometry(`rbx:${w}:${h}:${d}:${r}`, () => {
    const s = new THREE.Shape()
    const hw = w / 2
    const hd = d / 2
    s.moveTo(-hw + r, -hd)
    s.lineTo(hw - r, -hd)
    s.quadraticCurveTo(hw, -hd, hw, -hd + r)
    s.lineTo(hw, hd - r)
    s.quadraticCurveTo(hw, hd, hw - r, hd)
    s.lineTo(-hw + r, hd)
    s.quadraticCurveTo(-hw, hd, -hw, hd - r)
    s.lineTo(-hw, -hd + r)
    s.quadraticCurveTo(-hw, -hd, -hw + r, -hd)
    const geo = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: Math.min(0.15, h / 4), bevelSize: Math.min(0.15, r / 2), bevelSegments: 3, curveSegments: 6 })
    geo.rotateX(-Math.PI / 2)
    geo.translate(0, -h / 2, 0)
    return geo
  })
  const m = new THREE.Mesh(g, mat)
  m.position.set(x, y, z)
  return m
}

function canvasTex(w: number, h: number, nearest = false): { tex: THREE.CanvasTexture; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) return null
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  if (nearest) {
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.LinearFilter
  } else tex.anisotropy = 8
  return { tex, ctx }
}

function plane(w: number, d: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const g = cachedGeometry(`pl:${w}:${d}`, () => new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2))
  const m = new THREE.Mesh(g, mat)
  m.position.set(x, y, z)
  return m
}

function tube(points: THREE.Vector3[], r: number, mat: THREE.Material): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points)
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 24, r, 6, false), mat)
}

function anchorOf(type: string, pins: THREE.Vector3[]): THREE.Vector3 {
  const t = offboardGeometry(type)!.terminals[0]
  return new THREE.Vector3(pins[0].x - t.dx, 0, pins[0].z - t.dz)
}

function finish(group: THREE.Group, parts: THREE.Object3D[]): void {
  for (const m of mergeStatic(parts)) {
    m.castShadow = true
    m.receiveShadow = true
    group.add(m)
  }
}

const gold = () => satinMetal(0xc9a24e)

// ------------------------------------------------------------------ servo

export function buildServo(_c: ComponentInstance, _e: CatalogEntry, pins: THREE.Vector3[]): BuildResult {
  const group = new THREE.Group()
  group.position.copy(anchorOf('servo', pins))
  const blue = cachedMaterial('servoblue', () => new THREE.MeshPhysicalMaterial({ color: 0x2f62c8, roughness: 0.35, clearcoat: 0.4 }))
  const stat: THREE.Object3D[] = []
  stat.push(rounded(9.0, 6.3, 4.8, 0.25, blue, 4.75, 3.15, 2.4))
  stat.push(rounded(12.7, 0.7, 4.8, 0.3, blue, 4.75, 6.65, 2.4))
  stat.push(rounded(9.0, 1.9, 4.8, 0.25, blue, 4.75, 7.95, 2.4))
  stat.push(cyl(2.2, 0.9, blue, 2.6, 9.3, 2.4), cyl(1.1, 0.7, blue, 5.0, 9.2, 2.4))
  stat.push(cyl(0.45, 1.2, plastic(0xf4f4f0, 0.4), 2.6, 10.1, 2.4, 16))
  // screw holes in the tabs
  for (const x of [-0.6, 10.1]) stat.push(cyl(0.35, 0.72, plastic(0x0d1a33, 0.8), x, 6.66, 2.4, 12))
  // connector + cable
  stat.push(box(3.0, 0.95, 1.6, plastic(0x151515, 0.6), 3.5, 0.48, 7.4))
  finish(group, stat)
  const colors = [0x6b3a1e, 0xd2342c, 0xf08a1c]
  colors.forEach((c, i) => {
    const off = (i - 1) * 0.32
    group.add(
      tube(
        [new THREE.Vector3(1.0 + off, 1.2, 4.8), new THREE.Vector3(1.1 + off, 0.5, 5.8), new THREE.Vector3(2.6 + off, 0.35, 6.6), new THREE.Vector3(2.5 + i, 0.45, 6.6)],
        0.16,
        plastic(c, 0.45),
      ),
    )
  })
  // the horn: a white arm on the shaft, turned by the simulated angle
  const horn = new THREE.Group()
  horn.position.set(2.6, 10.75, 2.4)
  const hornMat = plastic(0xf7f7f2, 0.4)
  const arm = rounded(6.4, 0.32, 1.25, 0.6, hornMat, 2.6, 0, 0)
  horn.add(arm, cyl(0.75, 0.4, hornMat, 0, 0, 0, 20))
  for (let i = 0; i < 5; i++) horn.add(cyl(0.12, 0.34, plastic(0xb8b8b0, 0.6), 1.2 + i * 1.0, 0.03, 0, 8))
  group.add(horn)
  const label = canvasTex(256, 64)
  if (label) {
    label.ctx.fillStyle = '#e8eefc'
    label.ctx.font = ui(700, 40)
    label.ctx.textAlign = 'center'
    label.ctx.fillText('SG90  9g', 128, 46)
    label.tex.needsUpdate = true
    const m = new THREE.Mesh(cachedGeometry('servolbl', () => new THREE.PlaneGeometry(6, 1.5)), new THREE.MeshBasicMaterial({ map: label.tex, transparent: true, depthWrite: false }))
    m.position.set(4.75, 3.6, 4.81)
    group.add(m)
  }
  let shown = 90
  return {
    object: group,
    pinWorld: pins.map((p) => p.clone()),
    update: (_comp, _entry, t) => {
      const target = t?.angle ?? 90
      shown += (target - shown) * 0.35
      // 0° points left along −x, 180° points right (+x)
      horn.rotation.y = Math.PI - (shown * Math.PI) / 180
    },
  }
}

// -------------------------------------------------------------------- LCD

function drawLcd(ctx: CanvasRenderingContext2D, lines: string[], backlight: boolean, powered: boolean): void {
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  ctx.fillStyle = !powered ? '#0f1d33' : backlight ? '#2867d6' : '#14305e'
  ctx.fillRect(0, 0, W, H)
  if (!powered) return
  const cols = 16
  const cellW = W / (cols + 0.6)
  const cellH = H / 2.35
  const dot = Math.min(cellW / 6, cellH / 9)
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = lines[r]?.[c] ?? ' '
      const code = ch === '°' ? 0xdf : ch.charCodeAt(0)
      const g = ch === ' ' ? [0, 0, 0, 0, 0] : glyph(code)
      const x0 = cellW * 0.3 + c * cellW + (cellW - 5 * dot) / 2
      const y0 = cellH * 0.18 + r * cellH * 1.12 + (cellH - 8 * dot) / 2
      for (let col = 0; col < 5; col++) {
        for (let row = 0; row < 8; row++) {
          const on = (g[col] >> row) & 1
          ctx.fillStyle = on ? (backlight ? '#f2f8ff' : '#9fb8e0') : backlight ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)'
          ctx.fillRect(x0 + col * dot, y0 + row * dot, dot * 0.86, dot * 0.86)
        }
      }
    }
  }
}

export function buildLcd(_c: ComponentInstance, _e: CatalogEntry, pins: THREE.Vector3[]): BuildResult {
  const group = new THREE.Group()
  group.position.copy(anchorOf('lcd1602_i2c', pins))
  const stat: THREE.Object3D[] = []
  const yPcb = 1.9
  stat.push(box(31.5, 0.63, 14.2, plastic(0x1f6b3a, 0.5), 15.75, yPcb + 0.31, 7.1))
  // I²C backpack underneath, header pins out of the left edge
  stat.push(box(16.5, 0.63, 7.5, plastic(0x141414, 0.5), 8.6, 1.0, 7.1))
  stat.push(box(2.4, 1.1, 4.0, plastic(0x161616, 0.6), 0.4, 1.0, 7.1))
  pins.forEach((_, i) => stat.push(box(2.6, 0.25, 0.25, gold(), -0.6, 1.2, 5.6 + i)))
  stat.push(box(1.9, 1.0, 1.9, plastic(0x2850c8, 0.4), 3.4, 1.9, 10.4))
  stat.push(cyl(0.6, 1.5, metal(0xb8bec6, 0.35), 3.4, 2.55, 10.4, 12))
  // bezel and glass
  stat.push(box(28.4, 0.9, 9.9, satinMetal(0x3a3d42), 15.75, yPcb + 1.08, 7.1))
  for (const [x, z] of [[1.3, 1.3], [30.2, 1.3], [1.3, 12.9], [30.2, 12.9]]) stat.push(cyl(0.55, 0.66, metal(0xd9c38a, 0.35), x, yPcb + 0.32, z, 14))
  for (let i = 0; i < 16; i++) stat.push(box(0.5, 0.1, 0.5, gold(), 4.0 + i, yPcb + 0.66, 0.9))
  finish(group, stat)
  const lcd = canvasTex(1024, 256)
  let lastKey = ''
  if (lcd) {
    drawLcd(lcd.ctx, ['', ''], false, false)
    const m = plane(25.6, 6.2, new THREE.MeshBasicMaterial({ map: lcd.tex, toneMapped: false }), 15.75, yPcb + 1.55, 7.1)
    group.add(m)
  }
  return {
    object: group,
    pinWorld: pins.map((p) => p.clone()),
    update: (_comp, _entry, t) => {
      if (!lcd) return
      const lines = t?.lines ?? ['', '']
      const key = `${lines.join('\n')}|${t?.backlight}|${t?.unpowered}|${t ? 1 : 0}`
      if (key === lastKey) return
      lastKey = key
      drawLcd(lcd.ctx, lines, !!t?.backlight, !!t && !t.unpowered)
      lcd.tex.needsUpdate = true
    },
  }
}

// ------------------------------------------------------------------- OLED

export function buildOled(_c: ComponentInstance, _e: CatalogEntry, pins: THREE.Vector3[]): BuildResult {
  const group = new THREE.Group()
  group.position.copy(anchorOf('oled_ssd1306', pins))
  const stat: THREE.Object3D[] = []
  stat.push(box(10.8, 0.63, 10.9, plastic(0x1a4fb0, 0.5), 5.4, 0.85, 5.45))
  for (const [x, z] of [[0.8, 0.8], [10.0, 0.8], [0.8, 10.1], [10.0, 10.1]]) stat.push(cyl(0.35, 0.68, metal(0xd9c38a, 0.35), x, 0.86, z, 12), cyl(0.45, 0.55, plastic(0x222222, 0.7), x, 0.27, z, 10))
  pins.forEach((_, i) => {
    stat.push(box(1, 0.8, 1, plastic(0x161616, 0.6), 3.9 + i, 1.56, 0.9))
    stat.push(box(0.25, 1.6, 0.25, gold(), 3.9 + i, 1.6, 0.9))
  })
  stat.push(box(10.4, 0.25, 7.6, moldedEpoxy(0x050505, 0.2), 5.4, 1.3, 6.0))
  stat.push(box(3.6, 0.1, 1.4, plastic(0xc78a2c, 0.5), 5.4, 1.2, 10.2))
  finish(group, stat)
  const screen = canvasTex(128, 64, true)
  let lastV = -1
  if (screen) {
    screen.ctx.fillStyle = '#000'
    screen.ctx.fillRect(0, 0, 128, 64)
    group.add(plane(8.7, 4.35, new THREE.MeshBasicMaterial({ map: screen.tex, toneMapped: false }), 5.4, 1.44, 5.8))
  }
  const img = screen ? screen.ctx.createImageData(128, 64) : null
  return {
    object: group,
    pinWorld: pins.map((p) => p.clone()),
    update: (_comp, _entry, t) => {
      if (!screen || !img) return
      const v = t?.frameVersion ?? -2
      if (v === lastV) return
      lastV = v
      const frame = t?.frame
      const on = !!t?.backlight && !!frame
      const inv = ((t?.frameVersion ?? 0) & 2) !== 0
      for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 128; x++) {
          let lit = on && frame ? ((frame[(y >> 3) * 128 + x] >> (y & 7)) & 1) === 1 : false
          if (on && inv) lit = !lit
          const i = (y * 128 + x) * 4
          img.data[i] = lit ? 190 : 4
          img.data[i + 1] = lit ? 235 : 6
          img.data[i + 2] = lit ? 255 : 10
          img.data[i + 3] = 255
        }
      }
      screen.ctx.putImageData(img, 0, 0)
      screen.tex.needsUpdate = true
    },
  }
}

// --------------------------------------------------------------- NeoPixel

export function buildNeopixel(comp: ComponentInstance, _e: CatalogEntry, pins: THREE.Vector3[]): BuildResult {
  const group = new THREE.Group()
  group.position.copy(anchorOf('neopixel_strip', pins))
  const stat: THREE.Object3D[] = []
  stat.push(box(21.3, 0.63, 4.0, plastic(0x111111, 0.45), 9.45, 0.6, 2.0))
  pins.forEach((_, i) => stat.push(box(0.25, 1.0, 0.25, gold(), -0.6, 0.9, 1 + i)))
  finish(group, stat)
  const n = Math.max(1, Math.min(8, Number(comp.params?.count ?? 8)))
  const mats: THREE.MeshPhysicalMaterial[] = []
  for (let i = 0; i < n; i++) {
    const x = 1.25 + i * 2.5
    group.add(box(2.0, 0.6, 2.0, plastic(0xf2f2ee, 0.35), x, 1.2, 2.0))
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xe8e8e8, roughness: 0.15, clearcoat: 0.6, emissive: new THREE.Color(0), emissiveIntensity: 2.6 })
    mats.push(mat)
    group.add(cyl(0.72, 0.12, mat, x, 1.55, 2.0, 20))
  }
  return {
    object: group,
    pinWorld: pins.map((p) => p.clone()),
    update: (_comp, _entry, t) => {
      const px = t?.pixels ?? []
      mats.forEach((m, i) => {
        const c = px[i] ?? 0
        m.emissive.setRGB(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255)
        m.color.setRGB(c ? 0.95 : 0.9, c ? 0.95 : 0.9, c ? 0.95 : 0.9)
      })
    },
  }
}

// ------------------------------------------------- standing breadboard modules

function rowFrame(pins: THREE.Vector3[]): THREE.Group {
  const g = new THREE.Group()
  const u = new THREE.Vector3().subVectors(pins[1], pins[0]).setY(0).normalize()
  g.position.set(pins[0].x, 0, pins[0].z)
  g.rotation.y = -Math.atan2(u.z, u.x)
  return g
}

function sprite(textOf: () => string, w = 6): { sprite: THREE.Sprite; set(s: string): void } {
  const c = canvasTex(512, 96)
  const mat = new THREE.SpriteMaterial({ map: c?.tex ?? null, transparent: true, depthWrite: false })
  const s = new THREE.Sprite(mat)
  s.scale.set(w, (w * 96) / 512, 1)
  let last = ''
  const set = (txt: string) => {
    if (!c || txt === last) return
    last = txt
    c.ctx.clearRect(0, 0, 512, 96)
    c.ctx.font = ui(600, 40)
    const tw = Math.min(496, c.ctx.measureText(txt).width + 56)
    c.ctx.fillStyle = 'rgba(255,255,255,0.92)'
    c.ctx.beginPath()
    c.ctx.roundRect(256 - tw / 2, 14, tw, 68, 34)
    c.ctx.fill()
    c.ctx.fillStyle = '#1c1c1e'
    c.ctx.font = ui(600, 40)
    c.ctx.textAlign = 'center'
    c.ctx.textBaseline = 'middle'
    c.ctx.fillText(txt, 256, 50)
    c.tex.needsUpdate = true
  }
  set(textOf())
  return { sprite: s, set }
}

export function buildUltrasonic(_c: ComponentInstance, _e: CatalogEntry, pins: THREE.Vector3[]): BuildResult {
  const group = rowFrame(pins)
  const cx = 1.5
  const stat: THREE.Object3D[] = []
  const yB = 1.1
  const H = 7.9
  stat.push(box(17.7, H, 0.63, plastic(0x1d5fb4, 0.5), cx, yB + H / 2, 0))
  pins.forEach((_, i) => {
    stat.push(box(0.25, 1.4, 0.25, gold(), i, 0.5, 0))
    stat.push(box(1, 0.8, 1, plastic(0x151515, 0.6), i, yB + 0.4, 0.8))
  })
  const can = satinMetal(0xc3c8ce)
  for (const sx of [-5.1, 5.1]) {
    const c = cyl(3.15, 4.7, can, cx + sx, yB + H / 2, -2.65, 32)
    c.rotation.x = Math.PI / 2
    stat.push(c)
    const face = cyl(2.6, 0.06, plastic(0x2a2a2a, 0.9), cx + sx, yB + H / 2, -5.02, 32)
    face.rotation.x = Math.PI / 2
    stat.push(face)
  }
  stat.push(box(2.6, 1.0, 0.9, metal(0xc8cdd3, 0.3), cx, yB + H - 1.0, 0.7))
  stat.push(box(2.0, 1.4, 0.5, moldedEpoxy(), cx - 3.0, yB + 2.0, 0.55), box(2.0, 1.4, 0.5, moldedEpoxy(), cx + 3.0, yB + 2.0, 0.55))
  finish(group, stat)
  const lbl = canvasTex(512, 230)
  if (lbl) {
    const g = lbl.ctx
    g.fillStyle = '#f2f4f2'
    g.font = ui(700, 54)
    g.textAlign = 'center'
    g.fillText('HC-SR04', 256, 120)
    g.font = ui(600, 30)
    ;['Gnd', 'Echo', 'Trig', 'Vcc'].forEach((s, i) => g.fillText(s, 256 + (i - 1.5) * 29 * 2.0, 205))
    lbl.tex.needsUpdate = true
    const m = new THREE.Mesh(cachedGeometry('srlbl', () => new THREE.PlaneGeometry(8.8, 3.95)), new THREE.MeshBasicMaterial({ map: lbl.tex, transparent: true, depthWrite: false }))
    m.position.set(cx, yB + 2.3, 0.33)
    group.add(m)
  }
  // the target the sound bounces off (outside the circuit; drawn at half scale: 1 cm → 0.12 units)
  const target = new THREE.Group()
  const wall = box(18, 9, 0.5, new THREE.MeshPhysicalMaterial({ color: 0xffb340, roughness: 0.6, transparent: true, opacity: 0.55 }), cx, yB + H / 2, 0)
  target.add(wall)
  const tag = sprite(() => '25 cm', 9)
  tag.sprite.position.set(cx, yB + H + 2.2, 0)
  target.add(tag.sprite)
  group.add(target)
  const beam = new THREE.Mesh(
    cachedGeometry('srbeam', () => new THREE.CylinderGeometry(1.2, 3.6, 1, 24, 1, true).rotateX(Math.PI / 2).translate(0, 0, -0.5)),
    new THREE.MeshBasicMaterial({ color: 0x7fd1ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
  )
  beam.position.set(cx, yB + H / 2, -5.0)
  group.add(beam)
  return {
    object: group,
    pinWorld: pins.map((p) => p.clone()),
    update: (_comp, _entry, t) => {
      const cm = t?.distance ?? 25
      const d = 5.0 + Math.min(cm, 200) * 0.12
      target.position.z = -d
      beam.scale.z = Math.max(0.01, d - 5.0)
      tag.set(`${cm.toFixed(0)} cm`)
      ;(beam.material as THREE.MeshBasicMaterial).opacity = t && !t.unpowered ? 0.12 + 0.06 * Math.sin(performance.now() / 120) : 0.0
    },
  }
}

export function buildDht(_c: ComponentInstance, _e: CatalogEntry, pins: THREE.Vector3[]): BuildResult {
  const group = rowFrame(pins)
  const stat: THREE.Object3D[] = []
  const yB = 1.1
  stat.push(box(5.6, 3.0, 0.63, plastic(0x1d5fb4, 0.5), 1, yB + 1.5, 0))
  pins.forEach((_, i) => {
    stat.push(box(0.25, 1.4, 0.25, gold(), i, 0.5, 0))
    stat.push(box(1, 0.8, 1, plastic(0x151515, 0.6), i, yB + 0.4, -0.8))
  })
  const white = plastic(0xf3f1ea, 0.55)
  stat.push(rounded(6.0, 3.0, 9.8, 0.4, white, 1, 0, 0).rotateX(Math.PI / 2))
  stat[stat.length - 1].position.set(1, yB + 1.0 + 4.9, 1.8)
  finish(group, stat)
  const grille = canvasTex(240, 300)
  if (grille) {
    const g = grille.ctx
    g.fillStyle = '#f3f1ea'
    g.fillRect(0, 0, 240, 300)
    g.fillStyle = '#3a3a38'
    for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) g.fillRect(28 + c * 50, 24 + r * 30, 34, 14)
    g.font = ui(700, 26)
    g.textAlign = 'center'
    g.fillText('DHT22', 120, 270)
    grille.tex.needsUpdate = true
    const m = new THREE.Mesh(cachedGeometry('dhtface', () => new THREE.PlaneGeometry(5.2, 6.5)), new THREE.MeshStandardMaterial({ map: grille.tex, roughness: 0.6 }))
    m.position.set(1, yB + 1.0 + 4.9 + 0.6, 3.32)
    group.add(m)
  }
  const tag = sprite(() => '22.5 °C · 45 %', 11)
  tag.sprite.position.set(1, yB + 13.5, 1.5)
  group.add(tag.sprite)
  return {
    object: group,
    pinWorld: pins.map((p) => p.clone()),
    update: (_comp, _entry, t) => {
      if (t?.temperature !== undefined) tag.set(`${t.temperature.toFixed(1)} °C · ${Math.round(t.humidity ?? 0)} %`)
      tag.sprite.visible = !!t
    },
  }
}

// -------------------------------------------------------------- multimeter

export function buildMultimeter(_c: ComponentInstance, _e: CatalogEntry, pins: THREE.Vector3[]): BuildResult {
  const group = new THREE.Group()
  const [pv, pc] = pins
  const mid = new THREE.Vector3().addVectors(pv, pc).multiplyScalar(0.5)
  const meterAt = new THREE.Vector3(mid.x, 0, Math.max(pv.z, pc.z, 18) + 9)
  const stat: THREE.Object3D[] = []
  // probes
  const probe = (p: THREE.Vector3, color: number, lean: number) => {
    const tip = box(0.12, 1.6, 0.12, metal(0xdadee3, 0.25), p.x, 0.62, p.z)
    const handle = cyl(0.3, 3.6, plastic(color, 0.4), p.x + lean * 0.5, 3.2, p.z + 0.4, 16)
    handle.rotation.z = -lean * 0.12
    handle.rotation.x = 0.12
    const guard = cyl(0.45, 0.25, plastic(color, 0.4), p.x + lean * 0.25, 1.5, p.z + 0.2, 16)
    stat.push(tip, handle, guard)
    return new THREE.Vector3(p.x + lean * 0.75, 5.0, p.z + 0.65)
  }
  const topV = probe(pv, 0xd0322b, -1)
  const topC = probe(pc, 0x1a1a1a, 1)
  // the meter: yellow holster, grey face
  stat.push(rounded(8.2, 1.7, 13.6, 1.0, plastic(0xf2b51b, 0.6), meterAt.x, 0.85, meterAt.z))
  stat.push(rounded(6.8, 0.3, 12.0, 0.6, plastic(0x2f3236, 0.5), meterAt.x, 1.78, meterAt.z))
  stat.push(cyl(2.0, 0.35, plastic(0x18191b, 0.5), meterAt.x, 1.95, meterAt.z + 1.6, 28))
  stat.push(box(0.5, 0.2, 1.8, plastic(0xe9e9e9, 0.5), meterAt.x, 2.2, meterAt.z + 1.0))
  const jackV = new THREE.Vector3(meterAt.x - 1.6, 2.0, meterAt.z + 5.0)
  const jackC = new THREE.Vector3(meterAt.x + 1.6, 2.0, meterAt.z + 5.0)
  stat.push(cyl(0.45, 0.3, plastic(0xd0322b, 0.4), jackV.x, 1.95, jackV.z, 14), cyl(0.45, 0.3, plastic(0x111111, 0.4), jackC.x, 1.95, jackC.z, 14))
  finish(group, stat)
  const lead = (from: THREE.Vector3, to: THREE.Vector3, color: number) =>
    group.add(
      tube(
        [from, new THREE.Vector3(from.x, from.y + 1.2, from.z + 2), new THREE.Vector3((from.x + to.x) / 2, 1.2, (from.z + to.z) / 2 + 2), new THREE.Vector3(to.x, 0.6, to.z + 2.5), to],
        0.14,
        plastic(color, 0.5),
      ),
    )
  lead(topV, jackV, 0xd0322b)
  lead(topC, jackC, 0x1a1a1a)
  const lcd = canvasTex(512, 200)
  let last = ''
  // above the face slab and its bevel (top ≈ 2.005), or the screen hides inside it
  if (lcd) group.add(plane(5.6, 2.2, new THREE.MeshBasicMaterial({ map: lcd.tex, toneMapped: false }), meterAt.x, 2.03, meterAt.z - 3.4))
  return {
    object: group,
    pinWorld: pins.map((p) => p.clone()),
    update: (_comp, _entry, t) => {
      if (!lcd) return
      const s = t?.reading ?? '-- --'
      if (s === last) return
      last = s
      const g = lcd.ctx
      g.fillStyle = '#b9c7a3'
      g.fillRect(0, 0, 512, 200)
      g.fillStyle = '#1b2116'
      g.textBaseline = 'middle'
      drawReadout(g, s, 490, 104, 92, 'right')
      lcd.tex.needsUpdate = true
    },
  }
}
