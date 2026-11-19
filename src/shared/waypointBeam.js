/**
 * The waypoint in the world: a soft beam of light standing on the spot and
 * a ring on the ground, so the place set on the full map (shared/worldMap.js)
 * can be seen from afar. Additive, no depth writes, one draw each.
 */
import * as THREE from 'three';

function fadeTexture() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 128, 0, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class WaypointBeam {
  constructor(scene, { color = '#ff5ad9', height = 46, radius = 0.45, intensity = 1.4 } = {}) {
    this.group = new THREE.Group();
    this.group.visible = false;
    this.tex = fadeTexture();
    const col = new THREE.Color(color).multiplyScalar(intensity);
    this.beamMat = new THREE.MeshBasicMaterial({ color: col, map: this.tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.6, height, 16, 1, true).translate(0, height / 2, 0), this.beamMat);
    this.ringMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.45, 40).rotateX(-Math.PI / 2), this.ringMat);
    this.ring.position.y = 0.08;
    for (const m of [beam, this.ring]) {
      m.frustumCulled = false;
      m.renderOrder = 5;
      m.castShadow = false;
      m.receiveShadow = false;
    }
    this.group.add(beam, this.ring);
    scene.add(this.group);
  }

  /** `point` {x, z} or null; `y` the ground there; `t` seconds (the ring breathes). */
  update(point, y = 0, t = 0) {
    this.group.visible = Boolean(point);
    if (!point) return;
    this.group.position.set(point.x, y, point.z);
    const k = 1 + Math.sin(t * 2.4) * 0.12;
    this.ring.scale.set(k, 1, k);
    this.ringMat.opacity = 0.55 + Math.sin(t * 2.4) * 0.25;
  }

  dispose() {
    this.group.removeFromParent();
    this.group.traverse((o) => o.geometry?.dispose());
    this.beamMat.dispose();
    this.ringMat.dispose();
    this.tex.dispose();
  }
}
