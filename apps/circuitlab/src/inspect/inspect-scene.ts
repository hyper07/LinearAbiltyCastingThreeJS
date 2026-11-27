/**
 * Inspect view: one board, every on-board part a pickable mesh. Own renderer and
 * camera (the lab's scene is untouched), the Illustrated look — toon ramp, ink
 * outlines via OutlineEffect (inverted hull), cream grid paper, a soft contact
 * shadow — and the teardown moves: hover outline, select + dim the rest, pull a
 * part out along its normal with a leader and footprint, explode all, flip the
 * board, peel layers (silkscreen, net links as copper, parts solid/ghost/hidden),
 * and pin-group rings. HTML overlays (cards, callouts) read `project()`.
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js'
import type { BoardData, BoardPart, BoardPin } from './boards'
import { fittedParts, netColor } from './boards'
import { buildPartMeshes, INK, PAPER, toon } from './part-meshes'

export type PartsLayer = 'solid' | 'ghost' | 'hidden'
export interface Layers {
  silk: boolean
  copper: boolean
  parts: PartsLayer
}

export interface InspectCallbacks {
  onHover: (ref: string | null, clientX: number, clientY: number) => void
  onPick: (ref: string | null) => void
  /** every rendered frame: reposition HTML overlays */
  onFrame: () => void
}

interface PartNode {
  part: BoardPart
  root: THREE.Group
  lift: THREE.Group
  mats: THREE.Material[]
  lifted: number
  target: number
  tilt: number
  leader: THREE.Line
  footprint: THREE.LineLoop
  shadow: THREE.Mesh
}

const ACCENT = new THREE.Color('#3b74d8')
const HOVER = new THREE.Color('#e0a21a')
const PX = 18 // canvas texels per mm for the board layers

function paperTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 1024
  const g = c.getContext('2d')!
  g.fillStyle = '#f6efe1'
  g.fillRect(0, 0, 1024, 1024)
  g.strokeStyle = '#e4d8c2'
  for (let i = 0; i <= 1024; i += 32) {
    g.globalAlpha = i % 128 === 0 ? 0.95 : 0.5
    g.lineWidth = i % 128 === 0 ? 1.5 : 1
    g.beginPath()
    g.moveTo(i + 0.5, 0)
    g.lineTo(i + 0.5, 1024)
    g.moveTo(0, i + 0.5)
    g.lineTo(1024, i + 0.5)
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  return t
}

function softShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const r = g.createRadialGradient(64, 64, 4, 64, 64, 64)
  r.addColorStop(0, 'rgba(60,45,30,0.55)')
  r.addColorStop(0.55, 'rgba(60,45,30,0.25)')
  r.addColorStop(1, 'rgba(60,45,30,0)')
  g.fillStyle = r
  g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function noOutline<T extends THREE.Material>(m: T): T {
  m.userData.outlineParameters = { visible: false }
  return m
}

export class InspectScene {
  readonly renderer: THREE.WebGLRenderer
  readonly camera: THREE.PerspectiveCamera
  readonly controls: OrbitControls
  private scene = new THREE.Scene()
  private outline: OutlineEffect
  private rig = new THREE.Group()
  private boardRoot = new THREE.Group()
  private nodes = new Map<string, PartNode>()
  private pickables: THREE.Object3D[] = []
  private pinRings = new Map<string, THREE.Mesh>()
  private board: BoardData | null = null
  private silkMat: THREE.MeshToonMaterial | null = null
  private silkTex: THREE.CanvasTexture | null = null
  private plainTex: THREE.CanvasTexture | null = null
  private copperMesh: THREE.Mesh | null = null
  private copperCanvas: HTMLCanvasElement | null = null
  private shadowTex = softShadowTexture()
  private raycaster = new THREE.Raycaster()
  private pointer: { x: number; y: number; cx: number; cy: number } | null = null
  private down: { x: number; y: number } | null = null
  private hovered: string | null = null
  private selected: string | null = null
  private highlightNet: string | null = null
  private layers: Layers = { silk: true, copper: false, parts: 'solid' }
  private flip = { cur: 0, target: 0 }
  private dirty = true
  private raf = 0
  private disposed = false
  private ro: ResizeObserver
  private size = { w: 1, h: 1 }

  constructor(private host: HTMLElement, private cb: InspectCallbacks) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.setClearColor(PAPER)
    host.appendChild(this.renderer.domElement)
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.style.touchAction = 'none'
    this.outline = new OutlineEffect(this.renderer, { defaultThickness: 0.0045, defaultColor: INK.toArray(), defaultAlpha: 1 })

    this.camera = new THREE.PerspectiveCamera(16, 1, 5, 6000)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.12
    this.controls.zoomToCursor = true
    this.controls.maxPolarAngle = THREE.MathUtils.degToRad(84)
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
    this.controls.addEventListener('change', () => (this.dirty = true))

    this.scene.background = PAPER.clone()
    const paper = paperTexture()
    paper.repeat.set(14, 14)
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), noOutline(new THREE.MeshBasicMaterial({ map: paper })))
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -14
    this.scene.add(ground)
    this.scene.add(new THREE.HemisphereLight(0xfffaf0, 0xb9a98f, 1.6))
    const sun = new THREE.DirectionalLight(0xffffff, 1.7)
    sun.position.set(-60, 140, 90)
    this.scene.add(sun)
    this.rig.add(this.boardRoot)
    this.scene.add(this.rig)

    const el = this.renderer.domElement
    el.addEventListener('pointermove', this.onMove)
    el.addEventListener('pointerdown', this.onDown)
    el.addEventListener('pointerup', this.onUp)
    el.addEventListener('pointerleave', this.onLeave)
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(host)
    this.resize()
    this.loop()
  }

  // ------------------------------------------------------------------ board

  setBoard(board: BoardData): void {
    this.clearBoard()
    this.board = board
    const { w: W, h: H, t } = board.size
    this.flip = { cur: 0, target: 0 }
    this.rig.rotation.x = 0
    // PCB: top face carries the silkscreen canvas, the rest is solder-mask colour
    this.plainTex = this.drawSilk(board, false)
    this.silkTex = this.drawSilk(board, true)
    const edge = toon(board.pcb.color)
    this.silkMat = toon('#ffffff', { map: this.layers.silk ? this.silkTex : this.plainTex })
    const bottomTex = this.drawBottom(board)
    const bottom = toon('#ffffff', { map: bottomTex })
    const pcb = new THREE.Mesh(new THREE.BoxGeometry(W, t, H), [edge, edge, this.silkMat, bottom, edge, edge])
    pcb.userData.pcb = true
    this.boardRoot.add(pcb)
    // soft contact shadow on the paper
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.5, H * 1.7), noOutline(new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false })))
    sh.rotation.x = -Math.PI / 2
    sh.position.y = -13.9
    this.scene.add(sh)
    sh.userData.boardShadow = true
    // copper / net-link layer
    this.copperCanvas = document.createElement('canvas')
    this.copperCanvas.width = Math.ceil(W * PX)
    this.copperCanvas.height = Math.ceil(H * PX)
    const ctex = new THREE.CanvasTexture(this.copperCanvas)
    ctex.colorSpace = THREE.SRGBColorSpace
    ctex.anisotropy = 8
    this.copperMesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H), noOutline(new THREE.MeshBasicMaterial({ map: ctex, transparent: true, depthWrite: false })))
    this.copperMesh.rotation.x = -Math.PI / 2
    this.copperMesh.position.y = t / 2 + 0.03
    this.copperMesh.visible = this.layers.copper
    this.boardRoot.add(this.copperMesh)
    this.drawCopper()

    for (const part of fittedParts(board)) this.addPart(board, part)
    for (const pin of board.pins) this.addPinRing(board, pin)
    this.applyLayers()
    this.frameCamera()
    this.dirty = true
    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (this.board !== board || this.disposed) return
        this.redrawSilk()
      })
    }
  }

  /** board mm (x right, y up) → rig-local position on the top or bottom face */
  private toLocal(x: number, y: number): THREE.Vector3 {
    const b = this.board!
    return new THREE.Vector3(x - b.size.w / 2, 0, -(y - b.size.h / 2))
  }

  private addPart(board: BoardData, part: BoardPart): void {
    const t = board.size.t
    const root = new THREE.Group()
    const pos = this.toLocal(part.x, part.y)
    const bottom = part.side === 'bottom'
    root.position.set(pos.x, bottom ? -t / 2 : t / 2 + (part.z ?? 0), pos.z)
    if (bottom) root.rotation.x = Math.PI
    const yaw = THREE.MathUtils.degToRad(part.rot || 0) * (bottom ? -1 : 1)
    const spin = new THREE.Group()
    spin.rotation.y = yaw
    root.add(spin)
    const lift = new THREE.Group()
    spin.add(lift)
    // header pins in the part's local frame
    const cos = Math.cos(-THREE.MathUtils.degToRad(part.rot || 0))
    const sin = Math.sin(-THREE.MathUtils.degToRad(part.rot || 0))
    const pins = board.pins
      .filter((p) => p.part === part.ref)
      .map((p) => {
        const dx = p.x - part.x
        const dy = p.y - part.y
        const lx = dx * cos - dy * sin
        const ly = dx * sin + dy * cos
        return { x: lx * (bottom ? -1 : 1), z: -ly, name: p.name }
      })
    // nearest board edge, in the part's frame: connector mouths face out of the board
    const edges: [number, number, number][] = [
      [part.x, -1, 0],
      [board.size.w - part.x, 1, 0],
      [part.y, 0, -1],
      [board.size.h - part.y, 0, 1],
    ]
    const [, nx, ny] = edges.sort((a, b) => a[0] - b[0])[0]
    const outward = { x: (nx * cos - ny * sin) * (bottom ? -1 : 1), z: -(nx * sin + ny * cos) }
    const meshes = buildPartMeshes(part, { t, pins, outward })
    const mats: THREE.Material[] = []
    for (const m of meshes) {
      lift.add(m)
      m.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        mesh.userData.ref = part.ref
        this.pickables.push(mesh)
        const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.push(...list)
      })
    }
    // pull-out helpers: dashed leader, footprint outline, shadow on the board
    const lineMat = noOutline(new THREE.LineDashedMaterial({ color: ACCENT, dashSize: 1.2, gapSize: 0.9 }))
    const leader = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)]), lineMat)
    leader.computeLineDistances()
    leader.visible = false
    spin.add(leader)
    const fw = part.w / 2 + 0.4
    const fd = part.d / 2 + 0.4
    const footprint = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-fw, 0.04, -fd), new THREE.Vector3(fw, 0.04, -fd), new THREE.Vector3(fw, 0.04, fd), new THREE.Vector3(-fw, 0.04, fd)]),
      noOutline(new THREE.LineBasicMaterial({ color: ACCENT })),
    )
    footprint.visible = false
    spin.add(footprint)
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(part.w * 1.6 + 1, part.d * 1.6 + 1), noOutline(new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false, opacity: 0 })))
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = 0.05
    spin.add(shadow)
    this.boardRoot.add(root)
    this.nodes.set(part.ref, { part, root, lift, mats, lifted: 0, target: 0, tilt: 0, leader, footprint, shadow })
  }

  private addPinRing(board: BoardData, pin: BoardPin): void {
    const t = board.size.t
    const y = board.pinRows === 'pins-up' ? t / 2 + 2.5 + 6.6 : board.pinRows === 'female' ? t / 2 + 8.6 : t / 2 + 0.08
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.45, 28), noOutline(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthTest: false })))
    ring.rotation.x = -Math.PI / 2
    const p = this.toLocal(pin.x, pin.y)
    ring.position.set(p.x, y, p.z)
    ring.visible = false
    ring.renderOrder = 10
    this.boardRoot.add(ring)
    this.pinRings.set(pin.id, ring)
  }

  // ------------------------------------------------------------- canvases

  private drawSilk(board: BoardData, silk: boolean): THREE.CanvasTexture {
    const { w: W, h: H } = board.size
    const c = document.createElement('canvas')
    c.width = Math.ceil(W * PX)
    c.height = Math.ceil(H * PX)
    const g = c.getContext('2d')!
    const X = (x: number) => x * PX
    const Y = (y: number) => (H - y) * PX
    g.fillStyle = board.pcb.color
    g.fillRect(0, 0, c.width, c.height)
    // faint decorative copper under the mask: the PCB reads as a PCB even with layers off
    g.strokeStyle = shade(board.pcb.color, 0.06)
    g.lineWidth = 0.35 * PX
    for (const n of board.nets) {
      if (n.kind === 'local') continue
      const pts = this.netPoints(board, n.name, 'top')
      for (let i = 1; i < pts.length; i++) {
        g.beginPath()
        g.moveTo(X(pts[i - 1].x), Y(pts[i - 1].y))
        g.lineTo(X(pts[i].x), Y(pts[i - 1].y))
        g.lineTo(X(pts[i].x), Y(pts[i].y))
        g.stroke()
      }
    }
    // pads under every header pin (gold rings / castellations)
    for (const p of board.pins) {
      g.fillStyle = board.pcb.copper
      g.beginPath()
      g.arc(X(p.x), Y(p.y), 0.85 * PX, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = shade(board.pcb.color, -0.4)
      g.beginPath()
      g.arc(X(p.x), Y(p.y), 0.45 * PX, 0, Math.PI * 2)
      g.fill()
      if (board.pinRows === 'castellated') {
        // half-hole pads running off the edge
        g.fillStyle = board.pcb.copper
        const edgeY = nearestEdge(p.x, p.y, W, H) === 'top' ? H : 0
        g.fillRect(X(p.x) - 0.8 * PX, Y(edgeY) - (edgeY ? 0 : 1.2 * PX), 1.6 * PX, 1.2 * PX)
      }
    }
    if (silk) {
      g.fillStyle = board.pcb.silk
      g.strokeStyle = board.pcb.silk
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      // pin names, rotated, just inside each row
      g.font = `700 ${1.05 * PX}px "Chakra Petch", system-ui, sans-serif`
      for (const p of board.pins) {
        const off = board.pinRows === 'female' ? 2.9 : 2.6
        const edge = nearestEdge(p.x, p.y, W, H)
        if (edge === 'top' || edge === 'bottom') {
          // rows along the long edges: names run across the board, read from the side
          const inward = edge === 'top' ? -1 : 1
          g.save()
          g.translate(X(p.x), Y(p.y + inward * off))
          g.rotate(-Math.PI / 2)
          g.textAlign = inward < 0 ? 'left' : 'right'
          g.fillText(p.name, inward < 0 ? -0.9 * PX : 0.9 * PX, 0)
          g.restore()
        } else {
          // rows along the short edges (Nano): names sit level beside each pin
          const inward = edge === 'left' ? 1 : -1
          g.textAlign = inward > 0 ? 'left' : 'right'
          g.fillText(p.name, X(p.x + inward * (off - 0.9)), Y(p.y))
          g.textAlign = 'center'
        }
      }
      // part outlines and designators for top-side parts
      g.lineWidth = 0.16 * PX
      g.font = `600 ${0.85 * PX}px "JetBrains Mono", monospace`
      for (const part of fittedParts(board)) {
        if (part.side === 'bottom' || part.partOf || /^header|^jumper|^pads|^none/.test(part.look)) continue
        g.save()
        g.translate(X(part.x), Y(part.y))
        g.rotate(-THREE.MathUtils.degToRad(part.rot || 0))
        g.strokeRect((-part.w / 2 - 0.3) * PX, (-part.d / 2 - 0.3) * PX, (part.w + 0.6) * PX, (part.d + 0.6) * PX)
        g.restore()
        if (part.w * part.d > 2) g.fillText(part.ref, X(part.x), Y(part.y - part.d / 2 - 1.0))
      }
      // the board's name, plain text (no logos)
      const title = board.name.replace(/\s*\(.*\)$/, '').toUpperCase()
      const tall = H > W
      const long = tall ? H : W
      const size = Math.min(2.2, (long * 0.55) / (title.length * 0.62))
      g.font = `800 ${size * PX}px "Chakra Petch", system-ui, sans-serif`
      g.globalAlpha = 0.9
      g.save()
      g.translate(X(W * (tall ? 0.5 : 0.36)), Y(H * (tall ? 0.62 : 0.5)))
      if (tall) g.rotate(-Math.PI / 2)
      g.fillText(title, 0, 0)
      g.restore()
      g.globalAlpha = 1
    }
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    return tex
  }

  private drawBottom(board: BoardData): THREE.CanvasTexture {
    const { w: W, h: H } = board.size
    const c = document.createElement('canvas')
    c.width = Math.ceil(W * 8)
    c.height = Math.ceil(H * 8)
    const g = c.getContext('2d')!
    g.fillStyle = shade(board.pcb.color, -0.05)
    g.fillRect(0, 0, c.width, c.height)
    g.fillStyle = board.pcb.copper
    // BoxGeometry's bottom face keeps u along +x and (flipY off) v from board y = H down,
    // so seen from below the pads appear mirrored, as on a real board
    for (const p of board.pins) {
      g.beginPath()
      g.arc(p.x * 8, (H - p.y) * 8, 0.85 * 8, 0, Math.PI * 2)
      g.fill()
    }
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.flipY = false
    return tex
  }

  /** anchor points of a net: centres of its parts on one side, and its header pins */
  private netPoints(board: BoardData, net: string, side: 'top' | 'all'): { x: number; y: number }[] {
    const pts: { x: number; y: number }[] = []
    for (const p of fittedParts(board)) {
      if (p.partOf || (side === 'top' && p.side === 'bottom')) continue
      if (/^header/.test(p.look)) continue
      if (Object.values(p.nets ?? {}).includes(net)) pts.push({ x: p.x, y: p.y })
    }
    for (const pin of board.pins) if (pin.net === net) pts.push({ x: pin.x, y: pin.y })
    // order as a nearest-neighbour chain so the links look routed, not like a star
    if (pts.length < 3) return pts
    const out = [pts.shift()!]
    while (pts.length) {
      const last = out[out.length - 1]
      let bi = 0
      let bd = Infinity
      pts.forEach((q, i) => {
        const d = Math.abs(q.x - last.x) + Math.abs(q.y - last.y)
        if (d < bd) [bd, bi] = [d, i]
      })
      out.push(pts.splice(bi, 1)[0])
    }
    return out
  }

  private drawCopper(): void {
    const b = this.board
    const c = this.copperCanvas
    if (!b || !c) return
    const g = c.getContext('2d')!
    const H = b.size.h
    g.clearRect(0, 0, c.width, c.height)
    const X = (x: number) => x * PX
    const Y = (y: number) => (H - y) * PX
    const hl = this.highlightNet
    const ordered = [...b.nets].sort((a, c2) => (a.name === hl ? 1 : 0) - (c2.name === hl ? 1 : 0))
    for (const n of ordered) {
      const pts = this.netPoints(b, n.name, 'all')
      if (pts.length < 2) continue
      const on = n.name === hl
      const col = on ? netColor(n.name, n.kind) : b.pcb.copper
      g.globalAlpha = hl && !on ? 0.22 : n.kind === 'ground' ? 0.5 : 0.9
      g.strokeStyle = col
      g.lineCap = 'round'
      g.lineJoin = 'round'
      g.lineWidth = (on ? 0.7 : n.kind === 'power' || n.kind === 'ground' ? 0.5 : 0.28) * PX
      for (let i = 1; i < pts.length; i++) {
        g.beginPath()
        g.moveTo(X(pts[i - 1].x), Y(pts[i - 1].y))
        g.lineTo(X(pts[i].x), Y(pts[i - 1].y))
        g.lineTo(X(pts[i].x), Y(pts[i].y))
        g.stroke()
      }
      g.fillStyle = col
      for (const q of pts) {
        g.beginPath()
        g.arc(X(q.x), Y(q.y), (on ? 0.7 : 0.4) * PX, 0, Math.PI * 2)
        g.fill()
      }
    }
    g.globalAlpha = 1
    const tex = (this.copperMesh?.material as THREE.MeshBasicMaterial | undefined)?.map
    if (tex) tex.needsUpdate = true
    this.dirty = true
  }

  private redrawSilk(): void {
    if (!this.board || !this.silkMat) return
    this.silkTex?.dispose()
    this.plainTex?.dispose()
    this.silkTex = this.drawSilk(this.board, true)
    this.plainTex = this.drawSilk(this.board, false)
    this.silkMat.map = this.layers.silk ? this.silkTex : this.plainTex
    this.silkMat.needsUpdate = true
    this.dirty = true
  }

  // ------------------------------------------------------------ state

  setSelected(ref: string | null): void {
    this.selected = ref
    this.applyTints()
  }

  setHover(ref: string | null): void {
    if (this.hovered === ref) return
    this.hovered = ref
    this.applyTints()
  }

  setHighlightNet(net: string | null): void {
    this.highlightNet = net
    // a highlighted net is easiest to follow on the copper layer, so it shows while one is lit
    if (this.copperMesh) this.copperMesh.visible = this.layers.copper || net != null
    this.drawCopper()
    this.applyTints()
  }

  setLayers(l: Layers): void {
    this.layers = { ...l }
    this.applyLayers()
  }

  /** ring the pins of a group in its colour (empty list clears) */
  setPinHighlight(pinIds: string[], color: string | null): void {
    const on = new Set(pinIds)
    for (const [id, ring] of this.pinRings) {
      ring.visible = on.has(id)
      if (color) (ring.material as THREE.MeshBasicMaterial).color.set(color)
    }
    this.dirty = true
  }

  /** lift one part out along its normal (null puts everything back unless exploded) */
  pullOut(ref: string | null, exploded: boolean): void {
    for (const [r, n] of this.nodes) {
      const base = exploded ? explodeLift(n.part) : 0
      n.target = r === ref ? Math.max(base, 10 + n.part.h * 1.5) : base
      n.tilt = r === ref ? 0.18 : 0
    }
    this.dirty = true
  }

  setFlipped(on: boolean): void {
    this.flip.target = on ? Math.PI : 0
    this.dirty = true
  }

  /** turn the view left/right (Q / E) */
  orbit(rad: number): void {
    const off = this.camera.position.clone().sub(this.controls.target)
    off.applyAxisAngle(new THREE.Vector3(0, 1, 0), rad)
    this.camera.position.copy(this.controls.target).add(off)
    this.controls.update()
    this.dirty = true
  }

  /** draw again on the next frame (overlays changed) */
  invalidate(): void {
    this.dirty = true
  }

  resetView(): void {
    this.frameCamera()
  }

  /** world position of a part (lifted) or a pin → CSS px in the host; null when behind the camera */
  projectPart(ref: string): { x: number; y: number } | null {
    const n = this.nodes.get(ref)
    if (!n) return null
    const v = new THREE.Vector3(0, n.part.h + 0.2, 0)
    n.lift.localToWorld(v)
    return this.toScreen(v)
  }

  projectBoardPoint(x: number, y: number, up = 0): { x: number; y: number } | null {
    const b = this.board
    if (!b) return null
    const p = this.toLocal(x, y)
    const top = b.pinRows === 'pins-up' ? 9 : b.pinRows === 'female' ? 8.6 : 0.2
    const v = new THREE.Vector3(p.x, b.size.t / 2 + top + up, p.z)
    this.boardRoot.localToWorld(v)
    return this.toScreen(v)
  }

  /** screen-space centre of the board (callouts push away from it) */
  boardCentre(): { x: number; y: number } | null {
    const v = new THREE.Vector3()
    this.boardRoot.localToWorld(v)
    return this.toScreen(v)
  }

  private toScreen(v: THREE.Vector3): { x: number; y: number } | null {
    const p = v.clone().project(this.camera)
    if (p.z > 1) return null
    return { x: ((p.x + 1) / 2) * this.size.w, y: ((1 - p.y) / 2) * this.size.h }
  }

  // ------------------------------------------------------------ tints

  private applyTints(): void {
    const sel = this.selected
    const hl = this.highlightNet
    for (const [ref, n] of this.nodes) {
      const onNet = hl ? Object.values(n.part.nets ?? {}).includes(hl) : false
      const isSel = ref === sel || (sel != null && n.part.partOf === sel)
      const isHover = ref === this.hovered
      const dim = (sel != null && !isSel) || (hl != null && !onNet && !isSel)
      for (const m of n.mats) {
        const mm = m as THREE.MeshToonMaterial & THREE.MeshBasicMaterial
        const op = m.userData.outlineParameters as { thickness?: number; color?: number[]; visible?: boolean } | undefined
        if (m.userData.isLabel) {
          mm.opacity = (dim ? 0.35 : 1) * (this.layers.parts === 'ghost' ? 0.25 : 1)
          continue
        }
        const base = m.userData.base as THREE.Color | undefined
        if (!base) continue
        mm.color.copy(base)
        if (dim) mm.color.lerp(PAPER, 0.62)
        else if (isHover && !isSel) mm.color.lerp(new THREE.Color('#ffffff'), 0.14)
        const be = m.userData.baseEmissive as THREE.Color | undefined
        if (be && mm.emissive) {
          mm.emissive.copy(be)
          if (isSel) mm.emissive.lerp(ACCENT, 0.18)
          if (onNet && !isSel) mm.emissive.lerp(new THREE.Color(netColor(hl!, 'signal')), 0.25)
        }
        if (op && op.visible !== false) {
          op.thickness = isSel ? 0.009 : isHover ? 0.007 : dim ? 0.003 : 0.0045
          op.color = (isSel ? ACCENT : isHover ? HOVER : dim ? new THREE.Color('#b9ad99') : INK).toArray()
        }
      }
    }
    this.dirty = true
  }

  private applyLayers(): void {
    if (this.silkMat) {
      this.silkMat.map = this.layers.silk ? this.silkTex : this.plainTex
      this.silkMat.needsUpdate = true
    }
    if (this.copperMesh) this.copperMesh.visible = this.layers.copper || this.highlightNet != null
    for (const n of this.nodes.values()) {
      n.root.visible = this.layers.parts !== 'hidden'
      const ghost = this.layers.parts === 'ghost'
      for (const m of n.mats) {
        m.transparent = ghost || !!m.userData.isLabel
        m.opacity = ghost ? (m.userData.isLabel ? 0.25 : 0.28) : 1
        m.depthWrite = !ghost && !m.userData.isLabel
        const op = m.userData.outlineParameters as { visible?: boolean; alpha?: number } | undefined
        if (op && !m.userData.isLabel) op.alpha = ghost ? 0.25 : 1
        m.needsUpdate = true
      }
    }
    this.applyTints()
  }

  // ------------------------------------------------------------ camera / input

  private frameCamera(): void {
    const b = this.board
    if (!b) return
    const span = Math.max(b.size.w, b.size.h * 1.6) * 1.35
    const dist = span / 2 / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))
    const sph = new THREE.Spherical(dist, THREE.MathUtils.degToRad(48), THREE.MathUtils.degToRad(-28))
    this.controls.target.set(0, 2, 0)
    this.camera.position.setFromSpherical(sph).add(this.controls.target)
    this.controls.minDistance = dist * 0.22
    this.controls.maxDistance = dist * 2.6
    this.controls.update()
    this.dirty = true
  }

  private resize(): void {
    const r = this.host.getBoundingClientRect()
    this.size = { w: Math.max(1, r.width), h: Math.max(1, r.height) }
    this.renderer.setSize(this.size.w, this.size.h, false)
    this.renderer.domElement.style.width = `${this.size.w}px`
    this.renderer.domElement.style.height = `${this.size.h}px`
    this.camera.aspect = this.size.w / this.size.h
    this.camera.updateProjectionMatrix()
    this.dirty = true
  }

  private onMove = (e: PointerEvent): void => {
    const r = this.renderer.domElement.getBoundingClientRect()
    this.pointer = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1, cx: e.clientX, cy: e.clientY }
  }

  private onDown = (e: PointerEvent): void => {
    this.down = { x: e.clientX, y: e.clientY }
  }

  private onUp = (e: PointerEvent): void => {
    const d = this.down
    this.down = null
    if (!d || e.button !== 0) return
    // click-vs-drag threshold: a drag orbits, a short click picks
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return
    this.onMove(e)
    this.cb.onPick(this.pick())
  }

  private onLeave = (): void => {
    this.pointer = null
    if (this.hovered) {
      this.setHover(null)
      this.cb.onHover(null, 0, 0)
    }
  }

  private pick(): string | null {
    if (!this.pointer || this.layers.parts === 'hidden') return null
    this.raycaster.setFromCamera(new THREE.Vector2(this.pointer.x, this.pointer.y), this.camera)
    const hits = this.raycaster.intersectObjects(this.pickables, false)
    for (const h of hits) {
      if (!h.object.visible) continue
      const ref = h.object.userData.ref as string | undefined
      if (ref) return ref
    }
    return null
  }

  // ------------------------------------------------------------ loop

  private loop = (): void => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    if (this.controls.update()) this.dirty = true
    let moving = false
    for (const n of this.nodes.values()) {
      const dl = n.target - n.lifted
      if (Math.abs(dl) > 0.01) {
        n.lifted += dl * 0.16
        moving = true
      } else n.lifted = n.target
      n.lift.position.y = n.lifted
      n.lift.rotation.x += (n.tilt - n.lift.rotation.x) * 0.16
      const up = n.lifted > 0.3
      n.leader.visible = up && n.part.ref === this.selected
      n.footprint.visible = up && n.part.ref === this.selected
      if (up) {
        n.leader.scale.y = Math.max(0.01, n.lifted)
        n.leader.computeLineDistances()
      }
      ;(n.shadow.material as THREE.MeshBasicMaterial).opacity = up ? Math.max(0.15, 0.75 - n.lifted / 40) : 0
    }
    const df = this.flip.target - this.flip.cur
    if (Math.abs(df) > 0.002) {
      this.flip.cur += df * 0.12
      moving = true
    } else this.flip.cur = this.flip.target
    this.rig.rotation.x = this.flip.cur
    if (moving) this.dirty = true
    // hover pick once per frame, only when the pointer moved or the scene changed
    if (this.pointer && !this.down) {
      const ref = this.pick()
      if (ref !== this.hovered) {
        this.setHover(ref)
        this.cb.onHover(ref, this.pointer.cx, this.pointer.cy)
      } else if (ref) this.cb.onHover(ref, this.pointer.cx, this.pointer.cy)
    }
    if (!this.dirty) return
    this.dirty = false
    this.outline.render(this.scene, this.camera)
    this.cb.onFrame()
  }

  // ------------------------------------------------------------ teardown

  private clearBoard(): void {
    for (const o of [...this.boardRoot.children]) {
      this.boardRoot.remove(o)
      disposeTree(o)
    }
    for (const o of [...this.scene.children]) {
      if (o.userData.boardShadow) {
        this.scene.remove(o)
        disposeTree(o)
      }
    }
    this.nodes.clear()
    this.pickables = []
    this.pinRings.clear()
    this.silkTex?.dispose()
    this.plainTex?.dispose()
    this.silkTex = this.plainTex = null
    this.board = null
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    const el = this.renderer.domElement
    el.removeEventListener('pointermove', this.onMove)
    el.removeEventListener('pointerdown', this.onDown)
    el.removeEventListener('pointerup', this.onUp)
    el.removeEventListener('pointerleave', this.onLeave)
    this.clearBoard()
    disposeTree(this.scene)
    this.shadowTex.dispose()
    this.controls.dispose()
    this.renderer.dispose()
    el.remove()
  }
}

/** how high a part floats in the exploded view: tall and important parts go higher */
export function explodeLift(p: BoardPart): number {
  const tier = /^(mcu|rf-module)$/.test(p.kind) ? 3 : /^(usb-uart|ldo|buck-boost|flash|opamp)$/.test(p.kind) ? 2.4 : /^header|connector|dc-jack/.test(p.kind) ? 1.2 : 1.8
  return 6 + tier * 4 + p.h * 0.6
}

function nearestEdge(x: number, y: number, W: number, H: number): 'left' | 'right' | 'bottom' | 'top' {
  const d: ['left' | 'right' | 'bottom' | 'top', number][] = [['left', x], ['right', W - x], ['bottom', y], ['top', H - y]]
  return d.sort((a, b) => a[1] - b[1])[0][0]
}

function shade(hex: string, k: number): string {
  const c = new THREE.Color(hex)
  if (k >= 0) c.lerp(new THREE.Color('#ffffff'), k)
  else c.lerp(new THREE.Color('#000000'), -k)
  return `#${c.getHexString()}`
}

function disposeTree(o: THREE.Object3D): void {
  o.traverse((c) => {
    const m = c as THREE.Mesh
    if (m.geometry) m.geometry.dispose()
    const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : []
    for (const mat of mats) {
      const mm = mat as THREE.MeshBasicMaterial
      if (mm.map && !(mm.map as THREE.Texture & { isDataTexture?: boolean }).isDataTexture) mm.map.dispose()
      mat.dispose()
    }
  })
}
