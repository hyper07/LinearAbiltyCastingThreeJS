import * as THREE from 'three';

/**
 * A ribbon of light behind a scooter (the energy drink's boost): the last
 * second or so of where its back wheel went, a band standing up off the road
 * that is brightest at the wheel and fades to nothing behind, in added light.
 *
 *   const t = new GlowTrail(scene, '#9ef07a');
 *   t.update(dt, { x, y, z }, on);   // each frame; `on` false lets it shrink away
 */
const N = 28;

export class GlowTrail {
  constructor(scene, color = '#9ef07a') {
    this.scene = scene;
    this.pts = [];
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * 2 * 3);
    this.alpha = new Float32Array(N * 2);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    const idx = [];
    for (let i = 0; i < N - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geo.setIndex(idx);
    this.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: { uCol: { value: new THREE.Color(color) } },
      vertexShader: 'attribute float alpha; varying float vA; void main() { vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uCol; varying float vA; void main() { gl_FragColor = vec4(uCol * 1.6, vA); }',
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    scene.add(this.mesh);
    this.k = 0;
  }

  update(dt, at, on) {
    this.k += ((on ? 1 : 0) - this.k) * Math.min(1, dt * (on ? 8 : 3));
    if (on || this.pts.length) {
      this.pts.unshift({ x: at.x, y: at.y, z: at.z });
      if (this.pts.length > N || (!on && this.pts.length)) this.pts.length = Math.min(this.pts.length, on ? N : Math.max(0, this.pts.length - 2));
    }
    const n = this.pts.length;
    this.mesh.visible = n > 1 && this.k > 0.02;
    if (!this.mesh.visible) return;
    for (let i = 0; i < N; i++) {
      const p = this.pts[Math.min(i, n - 1)];
      const u = i / (N - 1);
      const f = (1 - u) * (1 - u) * this.k * (i < n ? 1 : 0);
      const h = 0.1 + 0.5 * (1 - u);
      this.pos.set([p.x, p.y + 0.12, p.z, p.x, p.y + 0.12 + h, p.z], i * 6);
      this.alpha[i * 2] = f * 0.85;
      this.alpha[i * 2 + 1] = 0;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.alpha.needsUpdate = true;
  }

  dispose() {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
