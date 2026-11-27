import * as THREE from 'three';

/**
 * Admiral Yi Sun-sin in bronze, as he stands on Gwanghwamun Square (6.5 m, facing south): feet together
 * on a dark bronze slab; his right hand holding his long sheathed sword upright at his side, its tip on
 * the slab, the round guard and the hilt at his shoulder, a cord hanging from it; his left hand on his
 * hip, the elbow out; a rounded helmet with a small trident finial and a long neck guard falling to the
 * shoulders; a long moustache and beard; layered shoulder guards, a breastplate with a round emblem, a
 * wide belt with a buckle plate, and the long armoured coat to his ankles in fish-scale lamellar with
 * banded edges, robe folds below. Dark greenish-brown bronze with a soft sheen.
 *
 * Sculpted from lathes, tubes and shells (every part smooth-shaded, the lamellar a texture with its own
 * bump), in his own metres: standing on y = 0, facing +z, his right side at −x. About 9k triangles; a far
 * copy of a few hundred (`admiralFar`) for the silhouette from down the square.
 */

/** The bronze: a dark greenish brown, metallic with a soft sheen, its high spots a little lighter. */
export function bronzeMaterial({ map = null, bump = null } = {}) {
  return new THREE.MeshPhysicalMaterial({ color: '#4c4633', metalness: 0.6, roughness: 0.45, clearcoat: 0.25, clearcoatRoughness: 0.5, sheen: 0.4, sheenColor: new THREE.Color('#8a8a62'), sheenRoughness: 0.6, map, bumpMap: bump, bumpScale: bump ? 1.4 : 1, emissive: '#6b5a3a', emissiveIntensity: 0 });
}

/** Fish-scale lamellar: rows of rounded scales, each row half a scale over; as colour and as bump. */
export function lamellarTextures() {
  const make = (bump) => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = bump ? '#303030' : '#423b2b';
    x.fillRect(0, 0, 128, 128);
    const R = 8;
    for (let row = -1; row < 128 / (R * 1.1) + 1; row++) {
      for (let k = -1; k < 128 / (R * 2) + 1; k++) {
        const cx = k * R * 2 + (row % 2 ? R : 0);
        const cy = row * R * 1.1;
        const g = x.createRadialGradient(cx, cy + R * 0.2, 1, cx, cy, R);
        if (bump) {
          g.addColorStop(0, '#f0f0f0');
          g.addColorStop(0.75, '#909090');
          g.addColorStop(1, '#202020');
        } else {
          g.addColorStop(0, '#5e5640');
          g.addColorStop(0.8, '#4a4331');
          g.addColorStop(1, '#3a3426');
        }
        x.fillStyle = g;
        x.beginPath();
        x.arc(cx, cy, R, 0, Math.PI);
        x.lineTo(cx - R, cy);
        x.fill();
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (!bump) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  return { map: make(false), bump: make(true) };
}

/** A smooth surface turned round the y axis from (radius, y) points, `seg` round; `scaleZ` flattens it front to back. */
function lathe(pts, { seg = 28, phi0 = 0, phi = Math.PI * 2, scaleZ = 1, uvRepeat = null } = {}) {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, phi0, phi);
  if (scaleZ !== 1) g.scale(1, 1, scaleZ);
  if (uvRepeat) {
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * uvRepeat[0], uv.getY(i) * uvRepeat[1]);
  }
  g.computeVertexNormals();
  return g;
}

/** A tube along points (x, y, z), `r` thick (or tapering from r to r1). */
function tube(points, r, r1 = r, seg = 10) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const g = new THREE.TubeGeometry(curve, Math.max(8, points.length * 6), 1, seg, false);
  // taper: scale each ring about the curve
  const pos = g.attributes.position;
  const rings = g.parameters.tubularSegments + 1;
  const per = g.parameters.radialSegments + 1;
  for (let i = 0; i < rings; i++) {
    const t = i / (rings - 1);
    const c = curve.getPointAt(t);
    const rr = r + (r1 - r) * t;
    for (let j = 0; j < per; j++) {
      const k = i * per + j;
      pos.setXYZ(k, c.x + (pos.getX(k) - c.x) * rr, c.y + (pos.getY(k) - c.y) * rr, c.z + (pos.getZ(k) - c.z) * rr);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** The admiral (6.5 m from the soles of his feet to the tip of his finial), on his bronze slab. */
export function admiral({ bronze = bronzeMaterial(), scales = null } = {}) {
  const lam = scales ?? lamellarTextures();
  const coatMat = bronzeMaterial({ map: lam.map, bump: lam.bump });
  const g = new THREE.Group();
  const add = (geo, mat = bronze, at = [0, 0, 0], rot = [0, 0, 0]) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...at);
    m.rotation.set(...rot);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  // the bronze slab under his feet
  add(new THREE.BoxGeometry(2.7, 0.32, 2.3), bronze, [0, 0.16, 0.05]);
  const s = 0.32;
  // the boots' toes under the coat's hem
  add(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1.6), bronze, [-0.2, s, 0.62]);
  add(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1.6), bronze, [0.2, s, 0.62]);
  // the long coat: from the hem (flared, the robe's folds) to the waist, lamellar, open a little at the front
  const coat = [[0.95, s + 0.05], [1.02, s + 0.25], [0.96, s + 0.6], [0.86, s + 1.2], [0.76, s + 1.9], [0.68, s + 2.45], [0.62, s + 2.75]];
  add(lathe(coat, { seg: 36, phi0: Math.PI * 0.56, phi: Math.PI * 1.88, scaleZ: 0.78, uvRepeat: [3, 2.4] }), coatMat);
  // the robe showing in the coat's opening, and its folds at the hem
  add(lathe([[0.86, s + 0.02], [0.8, s + 0.9], [0.66, s + 2.4]], { seg: 16, phi0: Math.PI * 0.42, phi: Math.PI * 0.18, scaleZ: 0.8 }), bronze);
  // the coat's banded edges down the front and round the hem
  add(new THREE.TorusGeometry(1, 0.045, 6, 40, Math.PI * 1.88).rotateX(Math.PI / 2).rotateY(Math.PI * 0.06).scale(1.0, 1, 0.8), bronze, [0, s + 0.08, 0]);
  for (const sx of [-1, 1]) add(tube([[sx * 0.24, s + 0.1, 0.8], [sx * 0.22, s + 1.2, 0.68], [sx * 0.16, s + 2.7, 0.5]], 0.05), bronze);
  // the apron: two lamellar panels hanging from the belt over the thighs, a little proud of the coat, banded
  // round their edges (the coat's radius at a height, from its profile)
  const coatR = (y) => {
    for (let i = 1; i < coat.length; i++) {
      if (y <= coat[i][1]) {
        const t = (y - coat[i - 1][1]) / (coat[i][1] - coat[i - 1][1]);
        return coat[i - 1][0] + (coat[i][0] - coat[i - 1][0]) * t;
      }
    }
    return coat.at(-1)[0];
  };
  const top = s + 2.72;
  const bottom = s + 1.0;
  const apron = [];
  for (let k = 0; k <= 6; k++) {
    const y = bottom + ((top - bottom) * k) / 6;
    apron.push([coatR(y) + 0.06 + 0.05 * (1 - k / 6), y]);
  }
  for (const [p0, len] of [[0.07, 0.62], [Math.PI * 2 - 0.69, 0.62]]) {
    add(lathe(apron, { seg: 8, phi0: p0, phi: len, scaleZ: 0.8, uvRepeat: [0.8, 2] }), coatMat);
    // its banded edges: down both sides and along the bottom
    for (const a of [p0, p0 + len]) {
      const r0 = apron[0][0];
      const r1 = apron.at(-1)[0];
      add(tube([[Math.sin(a) * r0, bottom, Math.cos(a) * r0 * 0.8], [Math.sin(a) * r1, top, Math.cos(a) * r1 * 0.8]], 0.035, 0.035, 6), bronze);
    }
    const hem = [];
    for (let k = 0; k <= 8; k++) {
      const a = p0 + (len * k) / 8;
      hem.push([Math.sin(a) * apron[0][0], bottom, Math.cos(a) * apron[0][0] * 0.8]);
    }
    add(tube(hem, 0.04, 0.04, 6), bronze);
  }
  // the wide belt and its buckle plate
  const belt = s + 2.75;
  add(lathe([[0.66, belt - 0.12], [0.69, belt], [0.67, belt + 0.26], [0.63, belt + 0.36]], { seg: 32, scaleZ: 0.8 }), bronze);
  add(new THREE.BoxGeometry(0.62, 0.42, 0.12), bronze, [0, belt + 0.12, 0.55]);
  add(new THREE.TorusGeometry(0.13, 0.03, 6, 16), bronze, [0, belt + 0.12, 0.62]);
  // the body: the breastplate up to the shoulders, its round emblem
  add(lathe([[0.63, belt + 0.3], [0.68, belt + 0.7], [0.72, belt + 1.15], [0.66, belt + 1.45], [0.42, belt + 1.66], [0.2, belt + 1.75]], { seg: 32, scaleZ: 0.72, uvRepeat: [2.5, 1.3] }), coatMat);
  add(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 20).rotateX(Math.PI / 2), bronze, [0, belt + 1.1, 0.53]);
  add(new THREE.TorusGeometry(0.17, 0.025, 6, 20), bronze, [0, belt + 1.1, 0.56]);
  // the layered shoulder guards: three overlapping shells a side, down over the upper arm
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const sh = add(new THREE.SphereGeometry(0.42 - k * 0.04, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), coatMat, [sx * (0.66 + k * 0.08), belt + 1.55 - k * 0.2, 0], [0, 0, sx * (0.5 + k * 0.12)]);
      sh.scale.set(1, 0.75, 0.9);
    }
  }
  // the neck guard: a long cape of the helmet, over the back and sides to the shoulders, open in front
  const head = belt + 2.05;
  add(lathe([[0.32, head + 0.25], [0.44, head - 0.05], [0.62, head - 0.45], [0.74, head - 0.62]], { seg: 28, phi0: Math.PI * 0.72, phi: Math.PI * 1.56, scaleZ: 0.9 }), bronze);
  // the head: face, a long moustache and beard, the helmet (rounded, a brim, the trident finial)
  add(new THREE.SphereGeometry(0.27, 20, 16).scale(0.92, 1.12, 0.98), bronze, [0, head, 0.04]);
  add(new THREE.SphereGeometry(0.08, 10, 8).scale(0.7, 1, 1), bronze, [0, head - 0.01, 0.3]); // the nose
  add(new THREE.ConeGeometry(0.17, 0.42, 14).rotateX(Math.PI), bronze, [0, head - 0.33, 0.17], [0.32, 0, 0]); // the beard
  for (const sx of [-1, 1]) add(tube([[0, head - 0.1, 0.29], [sx * 0.09, head - 0.13, 0.28], [sx * 0.17, head - 0.25, 0.22]], 0.03, 0.012, 6), bronze);
  add(new THREE.SphereGeometry(0.33, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), bronze, [0, head + 0.08, 0]);
  add(new THREE.TorusGeometry(0.31, 0.035, 6, 24).rotateX(Math.PI / 2), bronze, [0, head + 0.06, 0]);
  add(new THREE.CylinderGeometry(0.035, 0.05, 0.32, 8), bronze, [0, head + 0.5, 0]);
  add(new THREE.SphereGeometry(0.06, 8, 6), bronze, [0, head + 0.68, 0]);
  add(new THREE.BoxGeometry(0.28, 0.035, 0.035), bronze, [0, head + 0.74, 0]);
  for (const sx of [-1, 0, 1]) add(new THREE.ConeGeometry(0.025, 0.16, 6), bronze, [sx * 0.13, head + 0.84 - Math.abs(sx) * 0.02, 0]);
  // the right arm (−x): down from the shoulder, the forearm forward and up to grip the sword at his side
  const shR = [-0.72, belt + 1.42, 0];
  add(tube([shR, [-0.92, belt + 0.95, 0.02], [-0.98, belt + 0.6, 0.12]], 0.2, 0.17), bronze);
  add(tube([[-0.98, belt + 0.6, 0.12], [-1.04, belt + 0.82, 0.38], [-1.08, belt + 1.0, 0.48]], 0.16, 0.13), bronze);
  add(new THREE.SphereGeometry(0.15, 12, 10).scale(1, 1.25, 1), bronze, [-1.1, belt + 1.08, 0.5]); // the fist on the hilt
  // the left arm (+x): out to the elbow, the hand back on the hip
  add(tube([[0.72, belt + 1.42, 0], [1.08, belt + 0.95, -0.05], [1.2, belt + 0.62, 0.0]], 0.2, 0.17), bronze);
  add(tube([[1.2, belt + 0.62, 0.0], [0.98, belt + 0.38, 0.12], [0.7, belt + 0.22, 0.2]], 0.16, 0.13), bronze);
  add(new THREE.SphereGeometry(0.14, 12, 10).scale(1.1, 0.9, 1), bronze, [0.66, belt + 0.2, 0.22]);
  // the sword: its scabbard from the slab to the hand, the round guard, the hilt up to his shoulder, a cord hanging
  const sw = [-1.12, 0, 0.5];
  add(tube([[sw[0] - 0.02, s + 0.05, sw[2] + 0.02], [sw[0], belt + 0.9, sw[2]]], 0.07, 0.085, 10), bronze);
  add(new THREE.CylinderGeometry(0.21, 0.21, 0.05, 20), bronze, [sw[0], belt + 1.25, sw[2]]);
  add(new THREE.CylinderGeometry(0.06, 0.065, 0.62, 10), bronze, [sw[0], belt + 1.58, sw[2]]);
  add(new THREE.SphereGeometry(0.075, 10, 8), bronze, [sw[0], belt + 1.92, sw[2]]);
  for (const k of [0, 1, 2]) add(new THREE.TorusGeometry(0.068, 0.012, 5, 12).rotateX(Math.PI / 2), bronze, [sw[0], belt + 1.38 + k * 0.17, sw[2]]);
  add(tube([[sw[0], belt + 1.22, sw[2] + 0.05], [sw[0] + 0.1, belt + 0.4, sw[2] + 0.18], [sw[0] + 0.02, belt - 0.4, sw[2] + 0.12], [sw[0] + 0.12, belt - 0.9, sw[2] + 0.2]], 0.018, 0.018, 5), bronze);
  // (sculpted at 6.04 m to the finial's tips: up to his real 6.5)
  g.scale.setScalar(6.5 / 6.04);
  return g;
}

/** The admiral from afar: a few hundred triangles with his silhouette — helmet, cape, arms, the sword. */
export function admiralFar(bronze = bronzeMaterial()) {
  const g = new THREE.Group();
  const add = (geo, at) => {
    const m = new THREE.Mesh(geo, bronze);
    m.position.set(...at);
    g.add(m);
  };
  add(new THREE.CylinderGeometry(0.7, 1.0, 2.8, 10), [0, 1.75, 0]);
  add(new THREE.CylinderGeometry(0.75, 0.65, 1.8, 10), [0, 4, 0]);
  add(new THREE.SphereGeometry(0.33, 8, 6), [0, 5.2, 0]);
  add(new THREE.ConeGeometry(0.75, 0.9, 10), [0, 4.85, -0.05]);
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 4), [0, 5.75, 0]);
  add(new THREE.CylinderGeometry(0.09, 0.09, 4.9, 6), [-1.12, 2.7, 0.5]);
  add(new THREE.BoxGeometry(0.5, 1.2, 0.3), [1.05, 3.6, 0]);
  add(new THREE.BoxGeometry(0.35, 1.2, 0.3), [-0.9, 3.7, 0.2]);
  add(new THREE.BoxGeometry(2.7, 0.32, 2.3), [0, 0.16, 0.05]);
  g.scale.setScalar(6.5 / 6.04);
  return g;
}

