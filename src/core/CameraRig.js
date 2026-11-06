import { PerspectiveCamera, Spherical, Vector3, MathUtils, MOUSE, TOUCH } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { settings } from '../config/settings.js';
import { clamp, damp } from '../utils/math.js';
import { LAYER } from './Layers.js';

const _dir = new Vector3();
const _desiredTarget = new Vector3();
const _spherical = new Spherical();
const _previousTarget = new Vector3();
const _targetShift = new Vector3();

/**
 * Third-person orbit rig.
 *
 * - Left mouse is reserved for direct attacks; orbiting is middle-drag.
 * - The distance always resolves back to `settings.camera.distance`, so framing
 *   stays consistent no matter where the orbit target drifts. The wheel zooms by
 *   writing that same setting, which means zoom keeps working while the rig is
 *   following an ability, and the editor slider stays the single source of truth.
 * - The rig gently drifts its look-at point toward whatever ability is casting.
 */
export class CameraRig {
  constructor(domElement) {
    this.camera = new PerspectiveCamera(
      settings.camera.fov,
      window.innerWidth / window.innerHeight,
      0.1,
      400
    );
    this.camera.position.set(-6.5, 6.0, 9.5);
    this.camera.layers.enable(LAYER.VFX);

    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.enablePan = false;
    this.controls.enableZoom = false; // the wheel drives `settings.camera.distance` instead
    this.controls.minPolarAngle = settings.camera.minPolar;
    this.controls.maxPolarAngle = settings.camera.maxPolar;
    this.controls.rotateSpeed = 0.65;

    // Left = direct attacks, right = spell casts, middle = orbit the camera.
    this.controls.mouseButtons = { LEFT: null, MIDDLE: MOUSE.ROTATE, RIGHT: null };
    this.controls.touches = { ONE: null, TWO: TOUCH.DOLLY_ROTATE };

    this.anchor = new Vector3(0, 0, 0); // the character
    this.focus = new Vector3(0, 0, 0); // point of interest (ability head)
    this.focusWeight = 0;
    this.shakeOffset = new Vector3();
    this.shakeRoll = 0;

    this.controls.target.set(0, settings.camera.targetHeight, 0);
    this.controls.update();

    // Actual distance, eased toward `settings.camera.distance` so a wheel flick
    // glides instead of snapping.
    this.distance = settings.camera.distance;

    /**
     * Multiplier on the target distance, owned by the app rather than by the
     * player. A boss on the field is thirty metres of animal that does not fit
     * in a framing built for a caster and a few imps — so the rig backs off,
     * without touching the zoom the player set.
     */
    this.distanceBias = 1;

    /** Orbit requested by the keyboard this frame, radians. Consumed by update. */
    this._orbitYaw = 0;
    this._orbitPitch = 0;

    this.domElement = domElement;
    this._onWheel = this._onWheel.bind(this);
    domElement.addEventListener('wheel', this._onWheel, { passive: false });
  }

  /** Wheel zoom. Multiplicative, so each notch feels the same at any distance. */
  _onWheel(event) {
    event.preventDefault();

    const cam = settings.camera;
    // Firefox reports lines (deltaMode 1) and pages (2) rather than pixels.
    const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1;
    const delta = (event.deltaY * scale) / 100;

    cam.distance = clamp(
      cam.distance * Math.exp(delta * 0.12 * cam.zoomSpeed),
      cam.minDistance,
      cam.maxDistance
    );
  }

  /**
   * Swing the view. Accumulated over the frame and applied once in `update`.
   *
   * Applied to the camera's *position* rather than to the controls' internal
   * spherical, because `OrbitControls.update` re-derives that spherical from
   * wherever the camera actually is on every frame. Moving the camera is
   * therefore the one way to steer it that the controls will agree with rather
   * than undo — and right-drag keeps working untouched.
   *
   * @param {number} yaw   radians, + is clockwise from above
   * @param {number} pitch radians, + tips the view down toward the floor
   */
  addOrbit(yaw, pitch) {
    this._orbitYaw += yaw;
    this._orbitPitch += pitch;
  }

  /**
   * Ease the framing bias. Separate from `update` so the app can drive it from
   * whatever it likes without the rig knowing what a boss is.
   */
  setDistanceBias(target, dt) {
    this.distanceBias = damp(this.distanceBias, target, 0.06, dt);
  }

  /** Point the rig should orbit around (character position). */
  setAnchor(x, y, z) {
    this.anchor.set(x, y, z);
  }

  /**
   * Which way "forward" is for the player, radians about +Y.
   *
   * The heading from the camera toward what it is looking at — i.e. away from
   * the viewer, into the screen. Movement input is expressed in this frame, so
   * W always means "away from me" however the rig has been orbited. Taken from
   * the *live* camera rather than from the orbit controls' azimuth so it stays
   * correct while the rig is still easing toward a new target.
   */
  get yaw() {
    _dir.copy(this.controls.target).sub(this.camera.position);
    _dir.y = 0;
    // Looking straight down is degenerate; keep the last good heading.
    if (_dir.lengthSq() < 1e-6) return this._yaw ?? 0;
    this._yaw = Math.atan2(_dir.x, _dir.z);
    return this._yaw;
  }

  /** Nudge the look-at point toward an ability. `weight` 0..1, decays on its own. */
  lookAt(point, weight = 1) {
    this.focus.copy(point);
    this.focusWeight = Math.max(this.focusWeight, weight);
  }

  update(dt) {
    const cam = settings.camera;

    if (this.camera.fov !== cam.fov) {
      this.camera.fov = cam.fov;
      this.camera.updateProjectionMatrix();
    }
    this.controls.minPolarAngle = cam.minPolar;
    this.controls.maxPolarAngle = cam.maxPolar;

    // Blend the orbit target between the character and any active ability.
    const blend = MathUtils.clamp(this.focusWeight * cam.autoFrame, 0, 0.85);
    _desiredTarget.copy(this.anchor);
    _desiredTarget.y += cam.targetHeight;
    _desiredTarget.lerp(this.focus, blend);

    _previousTarget.copy(this.controls.target);
    this.controls.target.set(
      damp(this.controls.target.x, _desiredTarget.x, cam.damping, dt),
      damp(this.controls.target.y, _desiredTarget.y, cam.damping, dt),
      damp(this.controls.target.z, _desiredTarget.z, cam.damping, dt)
    );

    // Carry the camera along with the target.
    //
    // `OrbitControls` re-derives its azimuth from wherever the camera actually
    // is, every frame. Move the target without moving the camera and the offset
    // vector between them tilts — so the orbit angle *drifts* whenever the
    // character walks sideways. That is not a cosmetic wobble: movement is
    // expressed in the camera's frame, so a drifting camera keeps rotating what
    // "forward" means, and holding W curves you into a slow circle. Translating
    // the camera by the same delta keeps the offset exactly invariant, which
    // makes the azimuth something only the player changes.
    _targetShift.subVectors(this.controls.target, _previousTarget);
    this.camera.position.add(_targetShift);

    this.focusWeight = damp(this.focusWeight, 0, 0.08, dt);

    this.controls.update();

    if (this._orbitYaw !== 0 || this._orbitPitch !== 0) {
      _dir.copy(this.camera.position).sub(this.controls.target);
      _spherical.setFromVector3(_dir);
      _spherical.theta -= this._orbitYaw;
      // Clamped to the same limits the mouse obeys, so the keyboard cannot put
      // the camera anywhere a drag could not.
      _spherical.phi = clamp(_spherical.phi + this._orbitPitch, cam.minPolar, cam.maxPolar);
      _dir.setFromSpherical(_spherical);
      this.camera.position.copy(this.controls.target).add(_dir);
      this._orbitYaw = 0;
      this._orbitPitch = 0;
    }

    // Enforce the orbit distance (zoom and the editor slider both land here).
    this.distance = damp(this.distance, cam.distance * this.distanceBias, cam.zoomDamping, dt);
    _dir.copy(this.camera.position).sub(this.controls.target);
    const len = _dir.length() || 1;
    _dir.multiplyScalar(1 / len);
    this.camera.position.copy(this.controls.target).addScaledVector(_dir, this.distance);

    // Camera shake is additive and applied after the controls have settled.
    if (this.shakeOffset.lengthSq() > 0) {
      this.camera.position.add(this.shakeOffset);
      this.camera.rotateZ(this.shakeRoll);
    }
  }

  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.domElement.removeEventListener('wheel', this._onWheel);
    this.controls.dispose();
  }
}
