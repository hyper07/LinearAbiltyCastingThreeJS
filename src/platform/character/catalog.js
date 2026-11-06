import { createCharacter } from './CharacterDefinition.js';
import { applyModelManifest } from './modelManifest.js';
import { CLASS_CHARACTERS } from './classes.js';

/** Default player — Mixamo caster with three throw clips. */
export const caster = applyModelManifest(
  createCharacter('caster', {
  label: 'Elemental Caster',
  series: 'Original',
  icon: '⚡',
  tagline: 'Sandbox default — six elemental abilities',
  rig: 'mixamo',
  model: {
    idle: './models/Idle.fbx',
    texture: './models/diffuse.png',
    scale: 0.01,
    targetHeight: 1.78
  },
  castClips: ['cast1', 'cast2', 'cast3'],
  motion: 'humanoid-sprint',
  motionDataset: 'caster-locomotion',
  defaultLoadout: 'caster-default',
  wandSide: 'Right',
  casting: {
    castBlendIn: 0.12,
    castBlendOut: 0.3,
    turnToAim: true,
    turnRate: 0.0002,
    castLean: 0.34,
    castRecoil: 0.16,
    castSettle: 2.6
  }
  })
);

export const DEFAULT_CHARACTERS = [caster, ...CLASS_CHARACTERS];
