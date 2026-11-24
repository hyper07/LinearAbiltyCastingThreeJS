/**
 * A small turntable of one part for its detail page: the same mesh the bench
 * uses, lit with the studio environment, slowly turning; drag to turn it,
 * scroll to zoom. One renderer per open page, freed on close.
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { buildComponentObject, disposeComponentObject } from './component-meshes'
import { getEntry, type CatalogEntry } from '../model/catalog'
import { componentPinHoles, holePosition, offboardTerminalPosition } from '../model/breadboard'
import type { ComponentInstance } from '../model/types'

const LEG_SPAN: Record<string, number> = { resistor: 4, diode: 4, diode_1n4007: 4, zener_1n4733: 4, inductor: 4, photoresistor: 3, buzzer: 3, capacitor: 2, led: 1 }

/** where a part's pins sit for the preview (bench layout, or holes on a big board) */
function previewPins(comp: ComponentInstance, entry: CatalogEntry): THREE.Vector3[] | null {
  if (entry.placement === 'offboard') {
    return entry.pins.map((_, i) => {
      const p = offboardTerminalPosition(0, i, { x: 0, z: 0 }, entry.type)
      return new THREE.Vector3(p.x, 0, p.z)
    })
  }
  const config = { size: 'labxl' as const, count: 1, rows: 1 }
  if (entry.placement === 'dip' || entry.placement === 'footprint') {
    for (const at of ['f20', 'i10', 'e20', 'j10', 'c10', 'a10']) {
      const holes = componentPinHoles({ ...comp, at }, entry, config)
      if (holes && holes.every(Boolean)) {
        comp.at = at
        return holes.map((h) => {
          const p = holePosition(h!)
          return new THREE.Vector3(p.x, 0, p.z)
        })
      }
    }
    return null
  }
  const n = entry.pins.length
  const span = n > 2 ? 1 : (LEG_SPAN[entry.type] ?? 3)
  comp.holes = Array.from({ length: n }, (_, i) => `a${20 + i * span}`)
  return Array.from({ length: n }, (_, i) => {
    const p = holePosition({ kind: 'strip', col: 20 + i * span, row: 'a' })
    return new THREE.Vector3(p.x, 0, p.z)
  })
}

export class PartPreview {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private object: THREE.Object3D | null = null
  private raf = 0
  private env: THREE.Texture | null = null
  private resize: ResizeObserver | null = null

  constructor(private canvas: HTMLCanvasElement, type: string) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
    this.scene.environment = this.env
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x404050, 0.8))
    const sun = new THREE.DirectionalLight(0xffffff, 1.6)
    sun.position.set(4, 8, 6)
    this.scene.add(sun)
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.05, 2000)
    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.enablePan = false
    this.controls.autoRotate = true
    this.controls.autoRotateSpeed = 1.6
    this.controls.zoomSpeed = 1.5
    this.controls.addEventListener('start', () => (this.controls.autoRotate = false))
    this.build(type)
    const fit = () => {
      const w = canvas.clientWidth || 300
      const h = canvas.clientHeight || 220
      this.renderer.setSize(w, h, false)
      this.camera.aspect = w / h
      this.camera.updateProjectionMatrix()
    }
    fit()
    this.resize = new ResizeObserver(fit)
    this.resize.observe(canvas)
    const loop = () => {
      this.raf = requestAnimationFrame(loop)
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
    }
    loop()
  }

  private build(type: string): void {
    const entry = getEntry(type)
    if (!entry) return
    const comp: ComponentInstance = { id: 'PREVIEW', type, params: { usb: false } } // no USB cable on the turntable
    const pins = previewPins(comp, entry)
    if (!pins) return
    let built
    try {
      built = buildComponentObject(comp, entry, pins)
    } catch {
      return
    }
    const obj = built.object
    obj.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(obj)
    const c = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const holder = new THREE.Group()
    obj.position.sub(new THREE.Vector3(c.x, box.min.y, c.z))
    holder.add(obj)
    this.scene.add(holder)
    this.object = holder
    const r = Math.max(size.x, size.y * 1.4, size.z, 2)
    this.controls.target.set(0, size.y * 0.4, 0)
    this.camera.position.set(r * 0.9, r * 0.85, r * 1.25)
    this.controls.minDistance = r * 0.5
    this.controls.maxDistance = r * 5
    this.controls.update()
  }

  dispose(): void {
    cancelAnimationFrame(this.raf)
    this.resize?.disconnect()
    this.controls.dispose()
    if (this.object) disposeComponentObject(this.object)
    this.env?.dispose()
    this.renderer.dispose()
  }
}
