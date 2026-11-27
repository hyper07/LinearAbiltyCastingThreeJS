/**
 * The plush-toy kit, as a stable shared library for game packages (games/<code>/).
 *
 * A game package must not reach into another game's folder: what it borrows comes
 * through a shared module with a fixed set of exports. This is that module for the
 * plush riders (species, colours, the face drawing) and the sculpting toolkit
 * (signed-distance shapes meshed into soft bodies). The code itself still lives where
 * it was written (Snowpuff Peaks' riders, AI Arcademia's creature sculptor), so those
 * games are untouched; this file is the contract. A production release bundles the
 * version it was built with, so later edits here reach a game only with its next release.
 *
 *   import { SPECIES, faceSvg, compile, sculpt, trace, gradient } from '../../src/shared/plushKit.js';
 */
export { SPECIES, faceSvg } from '../snowpuff/riders.js';
export { compile, sculpt, trace, gradient } from '../arcademia/world/creatures/sculpt.js';
