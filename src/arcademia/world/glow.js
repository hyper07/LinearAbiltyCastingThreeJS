/**
 * The bioluminescent glow of the Great Tree's living things — vines, bulbs,
 * shelf fungus, the patterns on grown buildings: a soft glow by day that
 * brightens at night (World calls setGlow with the night amount, 0…1).
 */
import * as THREE from 'three';
import { toonRamp } from './kit.js';

const glow = (color, emissive) => new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(), emissive: new THREE.Color(emissive), emissiveIntensity: 0.25 });
export const glowMat = glow('#8ff7e0', '#3fe6c8');
export const glowPink = glow('#ffc2ec', '#ff7ad9');
export const glowGold = glow('#fff0a8', '#ffc83f');
export const glowBlue = glow('#a8d8ff', '#4fa8ff');

export function setGlow(k) {
  glowMat.emissiveIntensity = 0.25 + k * 2.2;
  glowPink.emissiveIntensity = 0.25 + k * 2.0;
  glowGold.emissiveIntensity = 0.35 + k * 1.8;
  glowBlue.emissiveIntensity = 0.25 + k * 2.2;
}
