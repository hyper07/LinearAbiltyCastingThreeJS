/**
 * The pixel-art pass for 3D scenes: the scene drawn small, gathered, inked at
 * its edges, dithered and snapped to a 64-colour palette (the pass itself is
 * vendor/diorama/post.js). Ours adds a general palette built from the kit's
 * ramps — the original's is a pool scene's, with no greens or reds — a
 * see-through background, and a `detail` setting.
 *
 *   const pass = pixelPass(renderer, { detail: 4 });
 *   pass.setSize(width, height);          // CSS pixels of the canvas
 *   pass.render(scene, camera);
 *
 * `detail` is how many times finer than the chunky look (1 = one drawn pixel
 * to four screen pixels each way, 4 = one to one). Give the canvas
 * `image-rendering: pixelated`.
 */
import * as THREE from 'three';
import { PixelPost } from '../../vendor/diorama/post.js';
import { RAMPS, INK } from './art.js';

/** 64 colours: the twelve ramps, plus white, ink, black and a mid grey. */
export const PIXEL_PALETTE = [...Object.values(RAMPS).flat(), '#ffffff', INK, '#000000', '#808088'].slice(0, 64);

export function pixelPass(renderer, { detail = 4, palette = PIXEL_PALETTE, transparent = true, paper = '#ffffff', maxDim = 2400 } = {}) {
  const pass = new PixelPost(renderer, maxDim, Math.max(0.1, Math.min(2, detail / 4)));
  const colours = Array.from({ length: 64 }, (_, i) => new THREE.Color(palette[i % palette.length]));
  // The pass compares in display (sRGB) values.
  pass.uniforms.uPalette.value = colours.map((c) => {
    const s = c.clone().convertLinearToSRGB();
    return new THREE.Vector3(s.r, s.g, s.b);
  });
  const p = new THREE.Color(paper).convertLinearToSRGB();
  const paperGlsl = `vec3(${p.r.toFixed(4)}, ${p.g.toFixed(4)}, ${p.b.toFixed(4)})`;
  let frag = pass.material.fragmentShader;
  // The background: the paper colour, or nothing at all.
  frag = frag.replace('c = mix(vec3(1.0), c, smoothstep(0.26, 0.72, cov));', `c = mix(${transparent ? 'c' : paperGlsl}, c, smoothstep(0.26, 0.72, cov));`);
  frag = frag.replace(/if \(rim > 0\.002 && cov < threshold\) \{\s*c = vec3\(1\.0\);\s*\}/, `float gone = 0.0;\n  if (rim > 0.002 && cov < threshold) { c = ${paperGlsl}; gone = 1.0; }`);
  frag = frag.replace('if (cov < 0.02) c = vec3(1.0);', `if (cov < 0.02) { c = ${paperGlsl}; gone = 1.0; }`);
  frag = frag.replace('fragColor = vec4(c, 1.0);', transparent ? 'float keep = 1.0 - gone;\n  fragColor = vec4(c * keep, keep);' : 'fragColor = vec4(c, 1.0);');
  pass.material.fragmentShader = frag;
  pass.material.needsUpdate = true;
  if (transparent) {
    // The pass clears to solid black before its last draw; ours clears to nothing.
    pass.render = function (scene, camera) {
      const r = this.renderer;
      r.setRenderTarget(this.rt);
      r.setClearColor(0x000000, 0);
      r.clear(true, true, true);
      r.render(scene, camera);
      r.setRenderTarget(null);
      r.clear(true, true, true);
      r.render(this.scene, this.camera);
    };
  }
  return pass;
}
