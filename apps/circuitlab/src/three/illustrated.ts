/**
 * Illustrated view: our own flat "technical illustration" look for the bench —
 * a near-orthographic isometric lens (orbit snaps to 45° steps), cel-shaded
 * toon materials with a soft two-tone ramp, dark ink outlines (inverted-hull
 * OutlineEffect) and a warm grid-paper background. No path tracing: the
 * view draws its own frame. Photo view is restored exactly on exit.
 */
import * as THREE from 'three'
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export interface ViewHandle {
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  scene: THREE.Scene
  renderer: THREE.WebGLRenderer
  ground: THREE.Object3D
}

const ISO_POLAR = Math.acos(1 / Math.sqrt(3)) // 54.7° from vertical: true isometric
const TELE_FOV = 7 // a long lens reads as orthographic but keeps picking and framing intact
const INK = new THREE.Color('#2b2433')
const PAPER = '#f6efe1'
const GRID = '#e7dcc8'

function gradientMap(): THREE.DataTexture {
  // soft two-tone: shadow side 62 %, lit side 100 %
  const data = new Uint8Array([158, 158, 158, 255, 255, 255, 255, 255])
  const t = new THREE.DataTexture(data, 2, 1, THREE.RGBAFormat)
  t.minFilter = THREE.NearestFilter
  t.magFilter = THREE.NearestFilter
  t.needsUpdate = true
  return t
}

function paperTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 1536
  c.height = 1536
  const g = c.getContext('2d')!
  g.fillStyle = PAPER
  g.fillRect(0, 0, c.width, c.height)
  g.strokeStyle = GRID
  g.lineWidth = 1
  for (let i = 0; i <= c.width; i += 32) {
    g.globalAlpha = i % 160 === 0 ? 0.9 : 0.45
    g.beginPath()
    g.moveTo(i + 0.5, 0)
    g.lineTo(i + 0.5, c.height)
    g.moveTo(0, i + 0.5)
    g.lineTo(c.width, i + 0.5)
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

type Lit = THREE.MeshStandardMaterial & THREE.MeshPhongMaterial

/** copy the live look (colour, glow, texture, transparency) from the photo material */
function sync(src: THREE.Material, dst: THREE.MeshToonMaterial): void {
  const s = src as Partial<Lit>
  if (s.color) {
    const hsl = { h: 0, s: 0, l: 0 }
    s.color.getHSL(hsl)
    dst.color.setHSL(hsl.h, Math.min(1, hsl.s * 1.18), Math.min(0.92, hsl.l * 0.94 + 0.05))
  }
  if (s.emissive) dst.emissive.copy(s.emissive)
  dst.emissiveIntensity = s.emissiveIntensity ?? 1
  if (dst.map !== (s.map ?? null)) {
    dst.map = s.map ?? null
    dst.needsUpdate = true
  }
  if (dst.emissiveMap !== (s.emissiveMap ?? null)) {
    dst.emissiveMap = s.emissiveMap ?? null
    dst.needsUpdate = true
  }
  dst.opacity = src.opacity
  dst.transparent = src.transparent
  dst.visible = src.visible
}

export class IllustratedView {
  active = false
  private saved = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>()
  private toon = new Map<string, { src: THREE.Material; dst: THREE.MeshToonMaterial }>()
  private grad = gradientMap()
  private paper: THREE.Texture | null = null
  private outline: OutlineEffect | null = null
  private hemi: THREE.HemisphereLight | null = null
  private prev: {
    fov: number
    near: number
    far: number
    minD: number
    maxD: number
    minP: number
    maxP: number
    background: THREE.Scene['background']
    tone: THREE.ToneMapping
    groundVisible: boolean
    dist: number
  } | null = null
  private frame = 0
  private dragging = false
  private h: ViewHandle | null = null
  private onStart = () => (this.dragging = true)
  private onEnd = () => (this.dragging = false)

  enable(h: ViewHandle): void {
    if (this.active) return
    this.active = true
    this.h = h
    const { camera, controls, scene, renderer, ground } = h
    const dist = camera.position.distanceTo(controls.target)
    this.prev = {
      fov: camera.fov,
      near: camera.near,
      far: camera.far,
      minD: controls.minDistance,
      maxD: controls.maxDistance,
      minP: controls.minPolarAngle,
      maxP: controls.maxPolarAngle,
      background: scene.background,
      tone: renderer.toneMapping,
      groundVisible: ground.visible,
      dist,
    }
    const k = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.tan(THREE.MathUtils.degToRad(TELE_FOV / 2))
    controls.minDistance *= k
    controls.maxDistance *= k
    camera.fov = TELE_FOV
    camera.near = 2
    camera.far = 20000
    camera.updateProjectionMatrix()
    const off = camera.position.clone().sub(controls.target)
    const sph = new THREE.Spherical().setFromVector3(off)
    sph.radius = dist * k
    sph.phi = ISO_POLAR
    sph.theta = Math.round((sph.theta - Math.PI / 4) / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 4
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sph))
    controls.minPolarAngle = ISO_POLAR
    controls.maxPolarAngle = ISO_POLAR
    controls.update()
    controls.addEventListener('start', this.onStart)
    controls.addEventListener('end', this.onEnd)

    this.paper ??= paperTexture()
    scene.background = this.paper
    ground.visible = false
    renderer.toneMapping = THREE.NoToneMapping
    this.hemi = new THREE.HemisphereLight('#fff7ea', '#cdbfa8', 1.35)
    scene.add(this.hemi)
    this.outline = new OutlineEffect(renderer, { defaultThickness: 0.0042, defaultColor: [INK.r, INK.g, INK.b], defaultAlpha: 1 })
    this.frame = 0
    this.convert(scene)
  }

  disable(): void {
    const h = this.h
    if (!this.active || !h || !this.prev) return
    this.active = false
    const { camera, controls, scene, renderer, ground } = h
    for (const [mesh, mat] of this.saved) mesh.material = mat
    this.saved.clear()
    for (const { dst } of this.toon.values()) dst.dispose()
    this.toon.clear()
    if (this.hemi) scene.remove(this.hemi)
    this.hemi = null
    scene.background = this.prev.background
    ground.visible = this.prev.groundVisible
    renderer.toneMapping = this.prev.tone
    const off = camera.position.clone().sub(controls.target)
    const k = Math.tan(THREE.MathUtils.degToRad(TELE_FOV / 2)) / Math.tan(THREE.MathUtils.degToRad(this.prev.fov / 2))
    camera.fov = this.prev.fov
    camera.near = this.prev.near
    camera.far = this.prev.far
    camera.updateProjectionMatrix()
    controls.minDistance = this.prev.minD
    controls.maxDistance = this.prev.maxD
    controls.minPolarAngle = this.prev.minP
    controls.maxPolarAngle = this.prev.maxP
    camera.position.copy(controls.target).add(off.multiplyScalar(k))
    controls.update()
    controls.removeEventListener('start', this.onStart)
    controls.removeEventListener('end', this.onEnd)
    this.outline = null
    this.prev = null
  }

  /** swap new meshes to toon, keep glow/colour live, snap the orbit to 45° */
  tick(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    if (!this.active || !this.h) return
    if (this.frame++ % 12 === 0) this.convert(scene)
    for (const { src, dst } of this.toon.values()) sync(src, dst)
    const c = this.h.controls
    if (!this.dragging) {
      const off = camera.position.clone().sub(c.target)
      const sph = new THREE.Spherical().setFromVector3(off)
      const d = Math.round(sph.theta / (Math.PI / 4)) * (Math.PI / 4) - sph.theta
      if (Math.abs(d) > 1e-4) {
        sph.theta += Math.abs(d) < 0.002 ? d : d * 0.2
        camera.position.copy(c.target).add(new THREE.Vector3().setFromSpherical(sph))
        camera.lookAt(c.target)
      }
    }
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): boolean {
    if (!this.active || !this.outline) return false
    this.outline.render(scene, camera)
    return true
  }

  private convert(scene: THREE.Scene): void {
    const ground = this.h?.ground
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh || this.saved.has(mesh)) return
      for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p === ground) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      if (!mats.every((m) => m && ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial || (m as THREE.MeshPhongMaterial).isMeshPhongMaterial || (m as THREE.MeshLambertMaterial).isMeshLambertMaterial))) return
      const instanced = (mesh as THREE.InstancedMesh).isInstancedMesh === true
      const out = mats.map((m) => this.toonFor(m, instanced))
      this.saved.set(mesh, mesh.material)
      mesh.material = Array.isArray(mesh.material) ? out : out[0]
    })
    // forget meshes that left the scene
    for (const mesh of this.saved.keys()) {
      let p: THREE.Object3D | null = mesh
      while (p && p !== scene) p = p.parent
      if (!p) this.saved.delete(mesh)
    }
  }

  private toonFor(src: THREE.Material, instanced: boolean): THREE.MeshToonMaterial {
    const key = `${src.uuid}${instanced ? 'i' : ''}`
    const hit = this.toon.get(key)
    if (hit) return hit.dst
    const s = src as Partial<Lit>
    const dst = new THREE.MeshToonMaterial({
      gradientMap: this.grad,
      side: src.side,
      alphaTest: src.alphaTest,
      vertexColors: src.vertexColors,
      depthWrite: src.depthWrite,
      polygonOffset: src.polygonOffset,
      polygonOffsetFactor: src.polygonOffsetFactor,
      polygonOffsetUnits: src.polygonOffsetUnits,
    })
    dst.normalMap = null
    sync(src, dst)
    // ink lines on solid bodies; skip instanced (holes) and see-through parts
    dst.userData.outlineParameters = {
      thickness: 0.0042,
      color: [INK.r, INK.g, INK.b],
      alpha: 1,
      visible: !instanced && !(src.transparent && src.opacity < 0.9),
    }
    this.toon.set(key, { src, dst })
    return dst
  }
}
