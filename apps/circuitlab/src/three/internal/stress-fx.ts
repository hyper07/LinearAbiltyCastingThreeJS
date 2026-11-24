/**
 * What an over-limit part looks like: it starts to glow dull red as it nears
 * its limit, brighter orange as it heats past it, with a heat shimmer of thin
 * smoke; when it burns out there is a flash and a puff of thick smoke, the
 * body turns scorched and dark, and a thin wisp keeps rising until the part is
 * replaced. All sprites (additive glow, soft smoke) — no lights, cheap.
 */
import * as THREE from 'three'

export interface StressFrame {
  heat: ReadonlyMap<string, number>
  ratio: ReadonlyMap<string, number>
  burned: ReadonlySet<string>
}

interface Puff {
  s: THREE.Sprite
  age: number
  life: number
  vx: number
  vz: number
  rise: number
  grow: number
  dark: boolean
}

interface PartFx {
  object: THREE.Object3D
  center: THREE.Vector3
  size: number
  /** smoke puff size: small parts and big boards both get a believable plume */
  smoke: number
  top: number
  glow: THREE.Sprite
  glowMat: THREE.SpriteMaterial
  puffs: Puff[]
  spawn: number
  burnedAt: number | null
  saved: Map<THREE.Mesh, THREE.Material | THREE.Material[]>
}

function radialTexture(stops: [number, string][]): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  for (const [o, col] of stops) grd.addColorStop(o, col)
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

const GLOW_TEX = radialTexture([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']])
const SMOKE_TEX = radialTexture([[0, 'rgba(255,255,255,0.9)'], [0.45, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']])
const COOL = new THREE.Color('#ff2a08')
const HOT = new THREE.Color('#ff8a1a')
const WHITE_HOT = new THREE.Color('#ffe0a0')
const SCORCH = new THREE.Color('#1c1510')
const MAX_PUFFS = 26

export class StressFx {
  private parts = new Map<string, PartFx>()
  private frame: StressFrame | null = null
  private flashes: { s: THREE.Sprite; age: number }[] = []

  constructor(private root: THREE.Object3D) {}

  setFrame(f: StressFrame): void {
    this.frame = f
  }

  /** per render frame: `objectOf(id)` gives a part's current 3D object (null = gone) */
  tick(dt: number, t: number, objectOf: (id: string) => THREE.Object3D | null): boolean {
    const f = this.frame
    let active = false
    const want = new Set<string>()
    if (f) {
      for (const id of f.burned) want.add(id)
      for (const [id, h] of f.heat) if (h > 0) want.add(id)
      for (const [id, r] of f.ratio) if (r >= 0.8) want.add(id)
    }
    // drop effects of parts that cooled, were replaced or removed (puffs finish first)
    for (const [id, p] of this.parts) {
      const obj = objectOf(id)
      const gone = !obj || obj !== p.object
      if (gone || !want.has(id)) {
        this.unscorch(p)
        p.glow.visible = false
        if (gone || p.puffs.length === 0) {
          this.dispose(p)
          this.parts.delete(id)
        }
      }
    }
    for (const id of want) {
      const obj = objectOf(id)
      if (!obj) continue
      let p = this.parts.get(id)
      if (!p || p.object !== obj) {
        if (p) this.dispose(p)
        p = this.make(obj)
        this.parts.set(id, p)
      }
      const burned = !!f?.burned.has(id)
      const heat = Math.min(1, f?.heat.get(id) ?? 0)
      const near = Math.max(0, ((f?.ratio.get(id) ?? 0) - 0.8) / 0.2) // 0 at 80 % of the limit, 1 at it
      // glow: dull red near the limit → orange as it heats → white-hot just before it goes
      const level = burned ? 0 : Math.min(1, 0.35 * Math.min(1, near) + 0.65 * heat)
      const flicker = 0.85 + 0.15 * Math.sin(t * 23 + p.center.x) * Math.sin(t * 7.3)
      if (level > 0.01) {
        const col = level < 0.6 ? COOL.clone().lerp(HOT, level / 0.6) : HOT.clone().lerp(WHITE_HOT, (level - 0.6) / 0.4)
        p.glowMat.color.copy(col)
        p.glowMat.opacity = (0.25 + 0.7 * level) * flicker
        const k = p.size * (1.3 + 0.9 * level)
        p.glow.scale.set(k, k, 1)
        p.glow.visible = true
        active = true
      } else p.glow.visible = false
      // burn-out: flash + scorch, once
      if (burned && p.burnedAt === null) {
        p.burnedAt = t
        this.scorch(p)
        this.flash(p)
      }
      // smoke: wisps while very hot, a thick puff for a few seconds after it burns, then a thin wisp
      const since = p.burnedAt === null ? -1 : t - p.burnedAt
      const rate = burned ? (since < 4 ? 14 : 1.6) : heat > 0.35 ? 3 + 8 * heat : 0
      p.spawn += dt * rate
      while (p.spawn >= 1 && p.puffs.length < MAX_PUFFS) {
        p.spawn -= 1
        this.puff(p, burned && since < 4)
      }
      if (p.spawn > 1) p.spawn = 1
    }
    // animate puffs
    for (const p of this.parts.values()) {
      for (let i = p.puffs.length - 1; i >= 0; i--) {
        const q = p.puffs[i]
        q.age += dt
        const u = q.age / q.life
        if (u >= 1) {
          this.root.remove(q.s)
          ;(q.s.material as THREE.Material).dispose()
          p.puffs.splice(i, 1)
          continue
        }
        q.s.position.x += q.vx * dt
        q.s.position.z += q.vz * dt
        q.s.position.y += q.rise * dt * (1 - 0.5 * u)
        const k = p.smoke * (0.35 + q.grow * u)
        q.s.scale.set(k, k, 1)
        ;(q.s.material as THREE.SpriteMaterial).opacity = (q.dark ? 0.55 : 0.28) * Math.sin(Math.PI * Math.min(1, u * 1.15))
        active = true
      }
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const fl = this.flashes[i]
      fl.age += dt
      const u = fl.age / 0.35
      if (u >= 1) {
        this.root.remove(fl.s)
        ;(fl.s.material as THREE.Material).dispose()
        this.flashes.splice(i, 1)
        continue
      }
      ;(fl.s.material as THREE.SpriteMaterial).opacity = 1 - u
      fl.s.scale.multiplyScalar(1 + dt * 4)
      active = true
    }
    return active
  }

  dispose(p: PartFx): void {
    this.unscorch(p)
    this.root.remove(p.glow)
    p.glowMat.dispose()
    for (const q of p.puffs) {
      this.root.remove(q.s)
      ;(q.s.material as THREE.Material).dispose()
    }
    p.puffs.length = 0
  }

  disposeAll(): void {
    for (const p of this.parts.values()) this.dispose(p)
    this.parts.clear()
  }

  private make(object: THREE.Object3D): PartFx {
    object.updateWorldMatrix(true, true)
    const box = new THREE.Box3().setFromObject(object)
    const center = box.getCenter(new THREE.Vector3())
    const sz = box.getSize(new THREE.Vector3())
    const size = Math.max(1.2, Math.min(8, Math.max(sz.x, sz.z) * 0.9))
    const glowMat = new THREE.SpriteMaterial({ map: GLOW_TEX, color: COOL, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false })
    const glow = new THREE.Sprite(glowMat)
    glow.position.copy(center)
    glow.renderOrder = 20
    glow.visible = false
    glow.raycast = () => {}
    this.root.add(glow)
    return { object, center, size, smoke: Math.min(2.6, Math.max(1.1, size * 0.6)), top: box.max.y, glow, glowMat, puffs: [], spawn: 0, burnedAt: null, saved: new Map() }
  }

  private puff(p: PartFx, dark: boolean): void {
    const mat = new THREE.SpriteMaterial({ map: SMOKE_TEX, color: dark ? 0x3a3734 : 0x9a9690, transparent: true, opacity: 0, depthWrite: false })
    const s = new THREE.Sprite(mat)
    s.raycast = () => {}
    const a = Math.random() * Math.PI * 2
    const r = Math.random() * p.smoke * 0.3
    s.position.set(p.center.x + Math.cos(a) * r, p.top + 0.2, p.center.z + Math.sin(a) * r)
    s.renderOrder = 19
    this.root.add(s)
    p.puffs.push({ s, age: 0, life: dark ? 2.6 + Math.random() : 1.8 + Math.random() * 0.8, vx: (Math.random() - 0.5) * 0.6, vz: (Math.random() - 0.5) * 0.6 - 0.25, rise: dark ? 3.2 + Math.random() : 2.2 + Math.random(), grow: dark ? 2.2 : 1.4, dark })
  }

  private flash(p: PartFx): void {
    const mat = new THREE.SpriteMaterial({ map: GLOW_TEX, color: WHITE_HOT, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false })
    const s = new THREE.Sprite(mat)
    s.position.copy(p.center)
    s.scale.set(p.size * 1.6, p.size * 1.6, 1)
    s.renderOrder = 21
    this.root.add(s)
    this.flashes.push({ s, age: 0 })
  }

  /** darken the part's own materials (cloned per part, restored on replace) */
  private scorch(p: PartFx): void {
    p.object.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh || p.saved.has(mesh)) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      const burnt = mats.map((m) => {
        const c = m.clone() as THREE.MeshStandardMaterial
        // textured faces too: darken hard, then brown it a little (soot)
        if (c.color) c.color.multiplyScalar(0.2).lerp(SCORCH, 0.35)
        if ('envMapIntensity' in c) c.envMapIntensity = 0.25
        if (c.emissive) c.emissive.setRGB(0, 0, 0)
        if ('roughness' in c) c.roughness = 1
        if ('metalness' in c) c.metalness = Math.min(c.metalness ?? 0, 0.2)
        return c
      })
      p.saved.set(mesh, mesh.material)
      mesh.material = Array.isArray(mesh.material) ? burnt : burnt[0]
    })
  }

  private unscorch(p: PartFx): void {
    if (p.saved.size === 0) return
    for (const [mesh, mat] of p.saved) {
      const now = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const m of now) m.dispose()
      mesh.material = mat
    }
    p.saved.clear()
    p.burnedAt = null
  }
}
