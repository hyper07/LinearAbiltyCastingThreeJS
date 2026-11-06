/**
 * Secondary motion — cloth, capes, hair, loose straps.
 *
 * Game engines treat this as a separate layer from locomotion clips:
 *
 *   1. **Primary skeleton** — idle / walk / run blend tree (+ optional foot IK).
 *   2. **Secondary bones** — short chains parented to spine, shoulders, or a
 *      dedicated cape root, updated after the primary pose is known.
 *   3. **Simulation** — Verlet particles, spring-dampers, or engine "physics
 *      bones" (Unity Cloth, Unreal Chaos, Godot SkeletonModifier3D).
 *
 * The locomotion clips never author cape or skirt angles; wind and inertia are
 * integrated each frame from the character's linear and angular velocity.
 *
 * This stub exists so gameplay code can call one hook later without coupling
 * locomotion to cloth. Implement when the rig ships secondary bones.
 */
export class SecondaryMotion {
  constructor() {
    /** @type {import('three').Object3D|null} */
    this.root = null;
  }

  /** @param {import('three').Object3D} model */
  bind(model) {
    this.root = model;
  }

  /**
   * @param {number} dt
   * @param {{ velocity: import('three').Vector3, facing: number }} _state
   */
  update(_dt, _state) {
    // No secondary bones on the current Mixamo export.
  }

  dispose() {
    this.root = null;
  }
}
