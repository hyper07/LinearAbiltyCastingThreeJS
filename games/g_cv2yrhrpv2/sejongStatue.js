import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * King Sejong on Gwanghwamun Square: a photo scan of the real monument — the king seated on his throne,
 * a book open in his hand, on the granite pedestal carved 세종대왕 — "세종대왕" by totalitystudio.io
 * (sketchfab.com/3d-models/7878f0aa89e44057869457cced5391f6), CC BY 4.0, credited in the game's credits.
 * Shrunk from 1,000,154 triangles to about 45,000 and cleaned of the scanned ground, a neighbouring
 * structure and stray sky (scripts/models/glb-simplify.mjs, then glb-crop.mjs); its own photo texture.
 *
 * Feet on y = 0, facing +z (south, down the square), true size: about 10.2 m from the pavement to the
 * crown, the pedestal about 11 m across. After dark it glows softly from below (its emissive, `under`).
 */
const URL = './models/landmarks/king-sejong.glb';

/** The scan's photo, lit by the scene (its texture for the glow after dark too). */
export function sejongMaterial() {
  return new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, metalness: 0, emissive: '#6e6250', emissiveIntensity: 0 });
}

let loading = null;
const geometry = () =>
  (loading ??= new GLTFLoader()
    .loadAsync(URL)
    .then((gltf) => {
      let mesh = null;
      gltf.scene.traverse((o) => o.isMesh && !mesh && (mesh = o));
      if (!mesh) return null;
      mesh.geometry.computeVertexNormals();
      return { geometry: mesh.geometry, map: mesh.material.map };
    })
    .catch(() => null));

/** The monument: a group at once, the scan in it as soon as it has come. */
export function sejongStatue(material = sejongMaterial()) {
  const g = new THREE.Group();
  g.name = 'King Sejong';
  geometry().then((got) => {
    if (!got) return;
    material.map = got.map;
    material.emissiveMap = got.map;
    material.needsUpdate = true;
    const m = new THREE.Mesh(got.geometry, material);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  });
  return g;
}
