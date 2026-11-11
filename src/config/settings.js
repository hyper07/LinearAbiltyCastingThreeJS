/**
 * settings.js — the single source of truth for every tweakable value in the sandbox.
 *
 * Nothing in the renderer owns state that lives here: shaders, particle systems,
 * lights and post processing all *read* these objects every frame. That is what
 * makes the real-time editor work without rebuilding anything — mutating a field
 * is immediately visible on screen, including on an ice field that is already
 * standing, and including while the clock is paused (`P`), which is when the
 * shapes are actually worth tuning.
 *
 * The one rule that keeps that promise: a system may only ever *sample* these
 * values. It must never copy one into a record at spawn time and read it back
 * later — see `IceAbility`, whose spike records hold nothing but unitless dice
 * rolls, and resolve every metre, radian and second against this file each frame.
 *
 * Conventions
 *  - Colours are stored as `#rrggbb` strings so lil-gui can bind them directly.
 *    Use `utils/color.js#getColor()` to read them as a cached THREE.Color.
 *  - `global` holds multipliers that scale everything at once (1 = neutral).
 *  - The per-ability blocks (`ice`, `thunder`, `meteor`, `beam`) hold absolute values.
 *
 * Every ability block is keyed by its id in `ELEMENTS`, and the shared systems
 * that need to know about "the ability the player is currently holding" — the
 * aim controller, the cooldown, the HUD — look it up as `settings[element]`.
 * The four fields they rely on being present are `range`, `minRange`, `speed`
 * and `cooldown`; everything else in a block is that ability's own business.
 * A **far cast** (`CastShape.ZONE`, declared in `ELEMENT_META`) adds a fifth:
 * `zoneRadius`, the footprint the circle indicator measures out.
 */

/**
 * The cast animations shipped alongside the rig, in `public/models/<id>.fbx`.
 *
 * Every ability block carries a `castAnim` naming one of these, so each spell
 * can throw the body differently; `CharacterController` loads all of them once
 * at boot and keeps only their clips, and the editor turns this array straight
 * into the per-ability dropdown.
 */
export const CAST_ANIMATIONS = ['cast1', 'cast2', 'cast3'];

export const settings = {
  /* ------------------------------------------------------------------ */
  /* Global multipliers                                                  */
  /* ------------------------------------------------------------------ */
  global: {
    timeScale: 1.0, // slow-mo / fast forward for the whole simulation
    speed: 1.0, // eruption travel speed multiplier
    lifetime: 1.0, // ability lifetime multiplier
    glow: 1.0, // emissive multiplier fed into bloom
    shaderIntensity: 1.0, // master strength of every procedural shader effect
    noiseStrength: 1.0,
    noiseFrequency: 1.0,
    noiseSpeed: 1.0,
    turbulence: 1.0,
    randomness: 1.0, // per-instance / per-particle jitter multiplier
    particleCount: 1.0,
    particleLifetime: 1.0,
    particleSpeed: 1.0,
    particleSize: 1.0,
    emissionRate: 1.0,
    lightIntensity: 1.0,
    lightRadius: 1.0,
    distortion: 1.0,
    fresnel: 1.0,
    opacity: 1.0,
    animationSpeed: 1.0, // character animation playback rate
    cameraShake: 1.0,
    explosionIntensity: 1.0
  },

  /* ------------------------------------------------------------------ */
  /* The aim indicator — the ground arrow drawn while the cast is armed  */
  /* ------------------------------------------------------------------ */
  /**
   * A League-style skillshot indicator: one ground quad with a signed-distance
   * arrow in its fragment shader, so every dimension below is in *metres* and
   * nothing is a texture. The quad is rebuilt from these numbers each frame,
   * which is why dragging `range` while aiming stretches the arrow live.
   */
  aim: {
    /* --- silhouette (metres) --- */
    shaftWidth: 0.42, // half-width of the shaft
    headLength: 2.6, // length of the arrowhead
    headWidth: 1.35, // half-width at the base of the head
    round: 0.12, // corner rounding of the whole silhouette
    startOffset: 0.9, // gap between the caster and the tail of the arrow

    /* --- rendering --- */
    edge: 0.09, // outline thickness, metres
    edgeGlow: 2.6, // how hard the outline blooms
    softness: 0.06, // feather on the outer edge
    fill: 0.3, // opacity of the interior wash
    fillFalloff: 1.1, // how fast the wash fades from the axis to the edge
    opacity: 1.0,

    /* --- energy running up the shaft --- */
    stripes: 0.55, // chevrons per metre
    stripeSharp: 0.62, // 0 = soft gradient, 1 = hard bars
    stripeDepth: 0.55, // how much they modulate the fill
    scrollSpeed: 2.4, // metres/second they travel toward the tip
    pulse: 0.28, // brightness breathing
    pulseSpeed: 2.2,

    /* --- frost break-up --- */
    noise: 0.45, // how much noise eats into the fill
    noiseScale: 1.6, // features per metre
    noiseSpeed: 0.35,
    crystals: 0.55, // voronoi frost plates over the interior
    crystalScale: 2.4,

    /* --- furniture --- */
    baseRing: 0.62, // radius of the ring at the caster's feet, metres
    baseRingWidth: 0.06,
    tipGlyph: 0.9, // strength of the crystal rosette at the impact point
    tipGlyphSize: 1.15, // radius of that rosette, metres
    tipSpin: 0.45, // revolutions/second
    rangeArc: 0.55, // brightness of the max-range cap
    reveal: 0.055, // seconds for the arrow to sweep out when armed

    /* --- colour --- */
    colorCore: '#ecfbff',
    colorEdge: '#3fb4ff',
    colorInvalid: '#ff6a5c', // shown when the target is inside `minRange`

    height: 0.035 // hover distance above the floor, metres
  },

  /* ------------------------------------------------------------------ */
  /* The far-cast indicator — the circle drawn at the target point       */
  /* ------------------------------------------------------------------ */
  /**
   * The other half of the targeting vocabulary. Where `aim` draws an arrow
   * along a line, this draws the **footprint**: a disc dropped at the cursor
   * with a deliberately thick boundary, because the one thing a ground-targeted
   * AoE has to answer before you click is *how much space is this going to
   * take*. The band is the answer, and the ability's own field is built to land
   * exactly on it.
   *
   * Two meshes, both parametric:
   *  - the **footprint**, a quad whose fragment shader is a signed-distance
   *    ring evaluated in metres from the target;
   *  - the **reach ring**, a ribbon strip bent into a circle at the caster's
   *    feet at `range` — a far cast needs to show where its arm ends.
   *
   * Shared by every far cast, so a new one inherits the whole indicator and
   * only brings its own `zoneRadius`.
   */
  zone: {
    /* --- the boundary (metres) --- */
    boundary: 0.34, // thickness of the band that *is* the footprint edge
    // Held under 2: the band is already the widest mark on the circle, and
    // pushing the gain past this clips it to flat white and throws away the
    // hue that says which ability you are holding.
    boundaryGlow: 1.8, // how hard it blooms
    boundaryBias: 0.35, // <0.5 grows the band inward, >0.5 outward
    liner: 0.05, // thin bright liner riding the inside of the band
    softness: 0.05, // feather on both lips

    /* --- the interior --- */
    fill: 0.22, // opacity of the wash inside the circle
    fillFalloff: 1.5, // >1 keeps the middle clear and crowds it to the rim
    rings: 2.0, // concentric contour rings across the radius
    ringWidth: 0.05,
    ringSpeed: 0.35, // how fast they travel outward, radii/second
    crawl: 0.75, // filaments crawling over the interior
    crawlScale: 1.3, // filaments per metre
    crawlSpeed: 0.45,
    noise: 0.4, // break-up eating into the wash
    noiseScale: 1.2,

    /* --- furniture --- */
    ticks: 24, // marks stepping around the boundary
    tickLength: 0.42, // how far they reach in, metres
    tickWidth: 0.2, // duty cycle, 0..1
    tickSpin: 0.06, // revolutions/second
    sweep: 0.55, // radar sweep brightness
    sweepSpeed: 0.4, // revolutions/second
    core: 0.85, // the mark at the exact target point
    coreSize: 0.4, // its radius, metres
    crosshair: 0.5, // four arms pointing out of the core
    crosshairLength: 1.1,
    pulse: 0.22, // brightness breathing
    pulseSpeed: 2.0,

    /* --- the reach ring at the caster --- */
    reach: 0.7, // brightness of the max-range circle, 0 hides it
    reachWidth: 0.05, // its half-width, metres
    reachDashes: 64, // dashes around it (0 = solid)
    reachDashGap: 0.42, // fraction of each dash that is gap
    reachSpin: 0.03, // revolutions/second the dashes creep
    reachLead: 0.9, // how much brighter the arc nearest the cursor is
    reachSegments: 192, // tessellation of that circle

    /* --- rendering --- */
    opacity: 1.0,
    reveal: 0.07, // seconds the circle takes to snap out when armed
    snap: 1.18, // how far past its radius it overshoots on the way out
    height: 0.035, // hover distance above the floor, metres

    /* --- colour --- */
    colorCore: '#eaf7ff',
    colorEdge: '#7c6bff',
    colorInvalid: '#ff6a5c' // shown when the target is inside `minRange`
  },

  /* ------------------------------------------------------------------ */
  /* Character                                                           */
  /* ------------------------------------------------------------------ */
  character: {
    /* --- blending the cast clip over the idle --- */
    // The idle loops forever; a cast clip is a one-shot laid over the top of it,
    // so these are the two edges of that overlap. In fast, out soft: the throw
    // has to land on the frame you clicked, the recovery does not.
    castBlendIn: 0.12, // seconds to cross-fade from the idle into the cast
    castBlendOut: 0.3, // seconds to fall back to the idle once it finishes

    /* --- how the body sells the cast --- */
    turnToAim: true, // face the cursor while playing (aim + movement share one heading)
    turnRate: 0.0002, // fraction of the heading gap left after 1s (lower = snappier)
    castLean: 0.34, // radians the torso pitches forward on release
    castRecoil: 0.16, // metres the body is shoved back
    castSettle: 2.6, // seconds⁻¹ the lunge decays at

    /* ------------------------------------------------------------------ */
    /* Getting around                                                      */
    /* ------------------------------------------------------------------ */
    /**
     * There is no walk clip in this project — the character ships with an idle
     * and three cast throws, and that is all. So the gait below is *generated*
     * and laid over the idle pose bone by bone (`animation/Locomotion.js`).
     *
     * Every angle here is in radians and every distance in metres, which means
     * they are all directly comparable to the numbers the rest of the sandbox
     * is tuned in — and every one of them is a live slider, so the walk can be
     * reshaped while it is running.
     */
    // Three gears. The gait is not told which one it is in — it reads the
    // *speed*, so accelerating between them blends the walk into the run
    // rather than switching a state.
    moveSpeed: 4.0, // metres/second at the default jog
    walkMultiplier: 0.46, // × moveSpeed while Alt is held
    sprintMultiplier: 1.8, // × moveSpeed while Shift is held
    acceleration: 16.0, // m/s² toward the desired velocity
    friction: 14.0, // m/s² bleeding it off when the stick is released
    airControl: 0.45, // fraction of that acceleration available off the ground
    moveTurnRate: 0.00002, // heading gap left after 1s while running (lower = snappier)
    radius: 0.42, // how close the body can get to a wall

    /* --- the jump --- */
    jumpHeight: 1.35, // apex, metres
    gravity: 22.0, // m/s² — deliberately far above 9.81; real gravity feels floaty
    coyoteTime: 0.12, // seconds after leaving the ground you can still jump
    jumpBufferTime: 0.15, // seconds before landing that a press is remembered

    /* --- the generated gait --- */
    // `strideLength` is the one that matters: it sets the cadence *and*, through
    // it, how far the thigh has to swing for the foot to stay planted. The
    // swing angle is derived from it and the measured leg length rather than
    // authored, so the feet do not skate at any speed — `legSwing` below is only
    // a multiplier on that derived angle, for exaggerating the gait by hand.
    // Cadence is the parameter people actually have an intuition for — steps a
    // second — and the stride length falls out of it. People barely vary
    // cadence; they cover ground by lengthening the step.
    // Cadence and the duty cycle both *saturate* with speed rather than ramping
    // — a body covers extra ground by lengthening its step, not by taking more
    // of them — so both are driven by an exponential approach from walking pace
    // (`gaitDecay`) rather than by the posture blend.
    cadenceWalk: 2.35, // steps/second
    cadenceRun: 5.15, // ...at a flat sprint
    gaitDecay: 2.7, // m/s over walking pace for the gait to be ~63% of the way to a run
    // How far *back* a running stance reaches compared to how far forward. 1 is
    // symmetric; lower lands the foot closer under the body, which is both what
    // runners do and what stops the hips having to sink to meet it.
    strideBias: 0.62,
    ankleExtend: 0.1, // metres the ankle adds to the leg at push-off
    // How far below the ankle the foot's contact point drops toward the ends of
    // the stroke — the foot rolling onto its heel or up onto its toe. Stands in
    // for the whole set of things a body does to keep its head still (ankle,
    // knee, pelvic list and rotation) without modelling each of them.
    //
    // A rigid leg is a chord, so reaching out to ±A sinks the hips by
    // `L(1 − cos A)` — 17 cm for this rig's step, three times what a person's
    // head actually moves. Nobody walks like that, and this is why nobody has
    // to.
    legExtend: 0.09,
    // And a hard ceiling on the sink, in metres.
    dropWalk: 0.085,
    dropRun: 0.17,
    // Fraction of the cycle each foot spends on the ground. A walk keeps one
    // down for more than half of it; a run keeps it down for a third and spends
    // the rest airborne. This is what makes them two gaits rather than one gait
    // at two speeds — and it is what the swing angle is derived from.
    stanceWalk: 0.62,
    stanceRun: 0.22,
    // How much of the stance travel the *contact point* covers by itself — the
    // foot rolling heel to toe — rather than the ankle. Small, and it has to be:
    // a planted ankle is genuinely stationary in world space, so anything
    // discounted here comes straight back as skating. An earlier pass used 0.32
    // to make a too-long walk stride fit, and the walk stopped planting at all.
    // The stride is the thing to fix; cadence fixes it.
    footRollWalk: 0.06,
    footRollRun: 0.0,
    legSwing: 1.0, // × the stride-derived foot excursion
    kneeBend: 1.62, // radians the swing knee folds — high-knee sprint drive
    // Exponent on the swing's easing. Above 1 the trailing leg hangs back with
    // the knee folded and then whips through, instead of travelling forward at
    // an even rate — the rear half of a run's silhouette, and free, because a
    // foot in the air cannot skate.
    swingLinger: 1.7,
    kneeContact: 0.4, // radians a *running* knee keeps even at heel strike
    stanceKnee: 0.45, // radians the *stance* knee gives at mid-stance, running only
    flightRise: 0, // metres between steps at a run — 0 keeps feet on the floor unless Space jumps
    // The arms are *placed*, not nudged — this rig's idle is a casting stance
    // with the arms up, and a gait laid over that leaves the upper body inert.
    // Bolt's pump is compact: ~90° elbows, rear hand at the hip, front hand
    // up by the cheek. The upper arm does not windmill.
    armSwing: 0.72, // radians the upper arm drives *back* at a flat sprint
    armForwardReach: 1.05, // × that coming forward — front hand to the cheek
    armCarry: 0.16, // radians the whole pump sits above a hang (sprinters don't dangle)
    armTuck: 0.26, // radians they are drawn in toward the ribs (tight corridor)
    elbowWalk: 0.28, // mean elbow flexion at a walk — arms nearly hang
    elbowRun: 1.45, // ~87° included; the angle is held, not opened on the drive
    // How hard the elbow opens and closes across the stroke, as a fraction of
    // that mean. Sprinters keep the right angle; a wide open back-arm is a
    // distance-runner's stroke and reads as a sloppy pump.
    elbowSwing: 0.18,
    // The wrist. This rig has no finger bones — the spread casting hand is
    // baked into the skin — so the wrist alone has to un-spellcast it: rolled
    // so the palm faces the ribs (thumbs up), not the outside of the wrist.
    // A quarter-turn; the sign lives in `_relaxHand` (the previous sign put
    // both palms on the *outside*).
    handRoll: 1.57, // radians about the forearm's own axis
    handRollCast: 0.0, // extra roll for the wand hand, if the two rest differently
    handCurl: 0.22, // radians of wrist flexion — a sprinter's wrist stays quiet
    // The pelvis travels sideways over the foot carrying the weight. A small
    // number that does more for the look than anything else here: without it
    // the body runs on rails. Kept small on purpose — this is a translation of
    // the whole body, so it drags the planted foot with it, and a person's
    // centre of mass only moves a couple of centimetres each way anyway.
    hipSwayWalk: 0.028, // metres
    hipSwayRun: 0.016,
    // × the *geometric* rise and fall the supporting leg forces on the body.
    // 1.0 is the physically correct amount and the only one at which the feet
    // stay on the floor; lower flattens the gait and reintroduces skating.
    bodyBob: 1.0,
    // The lean. Runners lean from the ankles — one straight tilted line — so
    // half of this goes on the hips and the rest is spread up the spine. ~5
    // degrees at a jog's effort, ~22 flat out, matching the biomechanics refs.
    runLean: 0.26, // radians — Bolt runs tall; a 30° hunch is a different gait
    // Radians of extra lean per m/s² of smoothed acceleration: tipped into a
    // start, back against a stop, banked into a turn. The Overgrowth trick.
    accelLean: 0.03,
    // The two halves of the torso disagree: the pelvis turns with the forward
    // leg, the shoulders turn against it, and by more. These are peak half-
    // amplitudes; `_poseTorso` scales them by gait and by how much of a run
    // the body is in, so a walk stays modest and a sprint actually winds up.
    pelvisTwist: 0.18,
    shoulderTwist: 0.34,
    chestBounce: 0.06, // radians the chest counter-pitches against the stride
    // Pelvis drop toward the swinging leg, and the S-curve the spine puts
    // through the ribcage to keep the head over the support foot. Kept
    // quieter than a walk's sway — a sprint is compact, not floppy.
    pelvisList: 0.09,
    spineBend: 0.08,
    // Fraction of a cycle the thorax lags the pelvis. Zero is a rigid twist;
    // a little delay is what makes the rotation travel *up* the body.
    spineLag: 0.05,
    // How hard a driving arm pulls its shoulder down and back, as a fraction
    // of that arm's swing. The girdle is not a fixed bar.
    shoulderDrop: 0.22,
    gaitBlend: 7.0, // seconds⁻¹ the whole overlay fades in and out at

    /* --- sitting --- */
    sitDrop: 0.66, // metres the hips come down
    sitBlend: 3.4, // seconds⁻¹ the pose blends at
    sitFold: 1.45, // radians the thighs fold up
    sitSplay: 0.62 // radians the knees open outward — cross-legged, not kneeling
  },

  /* ================================================================== */
  /* ICE — ability one                                                   */
  /* ================================================================== */
  /**
   * A glacial eruption: a fracture front races out along the aimed line and a
   * field of crystal spikes tears up out of the floor behind it, small and dense
   * at the caster, tall and violent at the far end.
   *
   * Everything is generated — the crystals are procedural geometry
   * (`assets/ProceduralGeometry.js`), their shading is a patched standard
   * material (`materials/IceMaterial.js`), the frost is a shader on a quad and
   * the mist, shards and glitter are GPU particles. There are no textures and no
   * meshes on disk.
   */
  ice: {
    /* --- the cast itself --- */
    range: 15.0, // maximum cast distance, metres
    minRange: 2.5, // closer than this and the cast is refused
    speed: 26.0, // how fast the fracture front travels, metres/second
    lifetime: 3.6, // seconds the field stands before it withdraws
    cooldown: 0.4, // seconds before the ability can be armed again
    castAnim: 'cast3', // which clip in `CAST_ANIMATIONS` the body throws

    /* --- the footprint the spikes fill --- */
    widthNear: 0.55, // half-width of the band at the caster, metres
    width: 2.5, // half-width at the far end, metres
    widthCurve: 0.75, // <1 flares early, >1 stays narrow then opens out
    spikeCount: 190, // instances spent on one cast (capped at 288)
    density: 1.0, // multiplier on that count
    clumping: 1.35, // >1 pulls spikes toward the centre line
    scatter: 0.55, // extra lateral jitter, fraction of the local half-width
    frontBias: 0.85, // <1 crowds spikes toward the impact point

    /* --- silhouette of the field --- */
    heightNear: 0.5, // spike height at the caster, metres
    height: 3.1, // spike height at the far end, metres
    heightCurve: 1.7, // how late the ramp climbs
    heightJitter: 0.55,
    crown: 0.55, // how much shorter the flank blades are than the spine, 0..1
    peak: 1.45, // extra height multiplier at the impact point
    peakWidth: 0.28, // how much of the line that swell covers, 0..1
    rubble: 0.42, // fraction of the spikes demoted to ankle-height shards
    rubbleScale: 0.3,

    /* --- an individual crystal --- */
    radius: 0.41, // base radius, metres
    radiusJitter: 0.93,
    taper: 0.69, // tip radius as a fraction of the base
    facets: 7, // sides of the prism (5–8 read best)
    roughness: 0.09, // how far the facets are pushed off a clean prism
    bend: 0.66, // sideways curve from base to tip
    lean: 0.42, // radians the spikes lean away from the caster
    leanJitter: 1.5,
    twist: 1.0, // random yaw, 0..1 of a full turn

    /* --- the eruption --- */
    riseTime: 0.17, // seconds from buried to full height
    riseOvershoot: 0.26, // how far past full height the punch carries
    riseStagger: 0.09, // seconds of random delay between neighbours
    settle: 0.55, // seconds the overshoot takes to damp out
    shatterDelay: 0.6, // seconds after `lifetime` before they start to go
    sinkTime: 1.0, // seconds to withdraw into the floor

    /* --- the ice material --- */
    colorDeep: '#3e737a', // the colour thick ice accumulates toward
    colorIce: '#8adaff', // body
    colorRim: '#f2feff', // fresnel edge
    colorCore: '#638797', // the light trapped inside a fresh crystal
    opacity: 0.92,
    depthTint: 1.15, // how fast the deep tint builds with thickness
    fresnel: 2.3,
    fresnelPower: 2.4,
    translucency: 1.5, // light bleeding through from behind
    envIntensity: 0.9, // how much of the HDR probe the facets catch
    facetSharp: 0.68, // crispness of the internal facet shading
    fracture: 0.62, // internal crack planes
    fractureScale: 6.5, // cracks per metre
    veins: 0.45, // milky feather-frost inside the crystal
    veinScale: 3.2,
    // Named `glint*` rather than `sparkle*` on purpose: these are the pinpoint
    // highlights on the crystal *surface*, and the `sparkle*` family further
    // down drives the glitter *particles*. Two different effects.
    glint: 1.1,
    glintScale: 34.0,
    glintSpeed: 0.7,
    frostLine: 0.5, // rime banding climbing the crystal
    glow: 0.85, // overall emissive gain
    edgeGlow: 1.1, // brightness of the silhouette rim
    birthGlow: 1.6, // extra glow on a crystal that has just erupted
    birthFade: 0.45, // seconds that birth flash lasts

    /* --- what the ground does --- */
    frostSpread: 1.35, // frost patch radius, × the local half-width
    frostRate: 3.6, // patches laid per metre of front travel
    frostLife: 7.0, // seconds a patch lingers
    frostIntensity: 0.85,
    frostCrystals: 1.5, // grain of the packed snow
    colorFrost: '#f0f9ff', // the lit face of the snow
    colorFrostEdge: '#79b6dd', // what it goes in its own shadow
    shockRadius: 5.5, // impact shockwave ring, metres
    colorShockA: '#5fd0ff', // body of the shockwave ring
    colorShockB: '#f2feff', // its crest

    /* --- mist, shards and glitter --- */
    /**
     * Every particle system is coloured by a four-stop gradient sampled over the
     * particle's own lifetime: `A` the instant it is born, `D` as it dies. They
     * are spelled out rather than derived from the crystal palette so the fog can
     * be warmed, or the glitter recoloured, without touching the ice itself.
     */
    mistRate: 260, // rolling ground fog, particles/second
    mistSize: 1.15,
    mistSpeed: 1.3,
    mistLifetime: 2.8,
    mistOpacity: 0.05,
    mistRise: 0.35, // how fast the fog lifts, metres/second
    colorMistA: '#f2feff',
    colorMistB: '#cdefff',
    colorMistC: '#a9e4ff',
    colorMistD: '#09304c',
    shardRate: 150, // ice chips thrown off the eruption
    shardSize: 0.075,
    shardSpeed: 7.0,
    shardLifetime: 1.7,
    shardGravity: -14.0,
    colorShardA: '#f2feff',
    colorShardB: '#a9e4ff',
    colorShardC: '#a9e4ff',
    colorShardD: '#12496f',
    sparkleRate: 130, // the rising glitter plume
    sparkleSize: 0.055,
    sparkleSpeed: 3.4,
    sparkleLifetime: 2.6,
    sparkleRise: 1.6, // upward drift, metres/second
    sparkleTurbulence: 0.55,
    colorSparkleA: '#f2feff',
    colorSparkleB: '#57c9ff',
    colorSparkleC: '#a9e4ff',
    colorSparkleD: '#041e32',

    /* --- dynamic light --- */
    lightIntensity: 9,
    lightRadius: 13,
    lightColor: '#7fd4ff',

    /* --- the impact at the far end --- */
    burstSize: 3.6,
    burstIntensity: 0.75,
    burstShards: 90, // extra chips thrown at the impact
    impactShake: 0.7,
    impactFlash: 0.12,
    shakeDuration: 0.9,
    rumble: 0.06, // continuous shake while the front travels
    // The frost shell mixes A→B across its billowing noise and lays C over the
    // crystallised plates and the fresnel rim, so C is the one that reads hot.
    colorBurstA: '#a9e4ff',
    colorBurstB: '#cdefff',
    colorBurstC: '#f2feff',
    colorFlash: '#f2feff' // the full-screen flash on impact
  },

  /* ================================================================== */
  /* THUNDER — ability two                                               */
  /* ================================================================== */
  /**
   * A bolt thrown from the caster's hand along the aimed line: a bundle of
   * lightning filaments that snap into existence, hold while they gutter, and
   * blow out. Reference for the look: `thundercast.jpg`.
   *
   * The bolt is **one mesh**. Every filament is an instance of the same ribbon
   * strip, and its entire shape — the sag of the axis, the fan of the bundle,
   * the kinks in an individual strand, the camera-facing width — is evaluated in
   * the vertex shader from the numbers below. Nothing about the path exists on
   * the CPU, which is why `strands`, `jitter` and `spread` reshape a bolt that
   * is already in the air, and do it with the clock paused.
   *
   * The one thing a cast *does* capture is `uSeed`, a single random number
   * rolled at spawn so two casts do not draw the identical bolt. That is an
   * event, not a dimension — the same rule `IceAbility` follows.
   */
  thunder: {
    /* --- the cast --- */
    range: 24.0, // maximum cast distance, metres
    minRange: 2.0, // closer than this and the cast is refused
    speed: 105.0, // how fast the strike front travels, metres/second
    lifetime: 0.45, // seconds the bolt holds after it lands
    fadeTime: 0.5, // seconds it takes to blow out
    cooldown: 0.5,
    castAnim: 'cast2', // which clip in `CAST_ANIMATIONS` the body throws

    /* --- where the bolt leaves the caster --- */
    // The beam starts at the hand, not at the feet, so these are measured from
    // the caster's origin in the cast's own frame.
    handHeight: 1.28, // metres above the floor
    handForward: 0.55, // metres in front of the caster
    handSide: 0.16, // metres to the side (+ follows `Ability#side`)
    endHeight: 0.35, // height of the bolt where it lands, metres
    sag: 0.22, // metres the mid-span bows upward (negative droops)

    /* --- the bundle of filaments --- */
    strands: 9, // separate filaments (capped at 24)
    spread: 0.75, // metres the bundle fans out at the far end
    spreadNear: 0.05, // ... and at the hand
    spreadCurve: 1.6, // >1 keeps the bundle tight then opens it late
    twist: 0.45, // turns the bundle makes around the axis over its length
    twistSpeed: 0.8, // turns/second it rolls on top of that
    branchDim: 0.72, // how much dimmer an outer filament is than the spine

    /* --- the shape of one filament --- */
    jitter: 0.34, // metres of kink at the coarsest octave
    jitterScale: 0.85, // kinks per metre
    octaves: 4, // 1–5; each one halves the amplitude and doubles the rate
    jitterFalloff: 0.55, // amplitude kept per octave
    crawl: 3.2, // how fast the kinks slide along the bolt
    pinch: 0.14, // fraction of the span the ends are pulled straight over
    converge: 0.8, // how hard the far end is pulled onto the target, 0..1

    /* --- the ribbon --- */
    width: 0.025, // half-width of a filament at the hand, metres
    widthTip: 0.43, // that width at the impact point, as a fraction
    widthCurve: 1.09, // how early the taper happens
    coreWidth: 1.31, // multiplier on the central spine
    coreSharp: 4.95, // how hard the hot core falls off across the ribbon
    glowWidth: 5.7, // the halo, × the core width
    glowFalloff: 2.4, // how fast the halo fades across its ribbon
    glowOpacity: 0.49,
    softFade: 0.78, // metres of soft fade where the bolt meets geometry

    /* --- flicker & restrike --- */
    restrike: 24, // times/second the filaments re-roll their shape
    flicker: 0.3, // depth of the whole-bolt brightness stutter
    flickerSpeed: 34, // stutters/second
    strandFlash: 0.5, // how much individual filaments blink out
    tipGlow: 2.0, // extra heat on the leading edge while it travels
    tipLength: 0.08, // length of that leading edge, fraction of the span

    /* --- colour --- */
    colorCore: '#ffffff', // the centre of a filament
    colorInner: '#c9ecff',
    colorOuter: '#3aa0ff', // the outside of a filament
    colorHalo: '#0b3fc8', // the wide glow around the bundle
    glow: 2.3, // overall emissive gain
    opacity: 1.0,

    /* --- what the ground does --- */
    arcRate: 0.9, // electric burns laid per metre of front travel
    arcRadius: 1.5, // radius of one burn, metres
    arcLife: 0.6, // seconds a burn lingers
    arcIntensity: 1.0,
    arcBranches: 0.6, // how finely the burn splits into filaments
    scorchRadius: 0.5, // dark burn mark under the bolt, metres
    scorchLife: 6.5,
    scorchIntensity: 0.45,
    colorArc: '#9fdcff',
    colorScorch: '#080b11',
    colorEmber: '#4aa8ff',
    shockRadius: 6.5, // impact shockwave ring, metres
    colorShockA: '#c9ecff', // body of the shockwave ring
    colorShockB: '#ffffff', // its crest

    /* --- sparks, motes, smoke and debris --- */
    /**
     * As in `ice`: each system is coloured by a four-stop gradient sampled over
     * the particle's own lifetime, `A` at birth through `D` as it dies. Spelled
     * out rather than derived from the bolt palette, so the sparks can be made
     * to cool to orange while the filaments stay blue.
     */
    sparkRate: 240, // sparks thrown off the bolt, particles/second
    sparkSize: 0.16,
    sparkSpeed: 9.0,
    sparkLifetime: 0.5,
    sparkGravity: -12.0,
    sparkStretch: 0.18, // how far a spark smears along its velocity
    colorSparkA: '#ffffff',
    colorSparkB: '#ffffff',
    colorSparkC: '#c9ecff',
    colorSparkD: '#1e5b95',
    moteRate: 90, // the slow ionised motes drifting off the bolt
    moteSize: 0.05,
    moteSpeed: 1.5,
    moteLifetime: 1.6,
    moteRise: 1.0, // upward drift, metres/second
    moteTurbulence: 0.7,
    colorMoteA: '#ffffff',
    colorMoteB: '#c9ecff',
    colorMoteC: '#3aa0ff',
    colorMoteD: '#02195f',
    smokeRate: 50, // thin haze off the scorched floor
    smokeSize: 1.0,
    smokeSpeed: 1.1,
    smokeLifetime: 2.2,
    smokeOpacity: 0.06,
    smokeRise: 0.55,
    colorSmokeA: '#3d546e',
    colorSmokeB: '#33475e',
    colorSmokeC: '#33475e',
    colorSmokeD: '#1c2938',
    debrisRate: 24, // chips kicked off the floor under the bolt
    debrisSize: 0.055,
    debrisSpeed: 5.0,
    debrisLifetime: 1.3,
    debrisGravity: -17.0,
    colorDebrisA: '#252c36',
    colorDebrisB: '#1c222a',
    colorDebrisC: '#1c222a',
    colorDebrisD: '#1c222a',

    /* --- dynamic light --- */
    lightIntensity: 26,
    lightRadius: 17,
    lightColor: '#63b8ff',
    lightFlicker: 0.4, // depth of the light's gutter, 0 = steady
    lightFlickerSpeed: 26,

    /* --- the muzzle and the impact --- */
    // Both shells are the same shader: A→B is mixed across the billowing noise
    // and stays nearly empty, and C is what the racing filaments and the fresnel
    // rim are drawn in — so C is the one carrying the read.
    muzzleSize: 0.55, // the flash at the hand, metres
    muzzleIntensity: 1.9,
    castFlash: 0.1, // screen flash on release
    colorMuzzleA: '#3aa0ff',
    colorMuzzleB: '#c9ecff',
    colorMuzzleC: '#ffffff',
    colorCastFlash: '#c9ecff',
    burstSize: 3.0, // the shell at the impact point, metres
    burstIntensity: 1.4,
    burstSparks: 170, // extra sparks thrown at the impact
    burstDebris: 45,
    impactShake: 0.8,
    shakeDuration: 0.55,
    impactFlash: 0.28,
    rumble: 0.03, // continuous shake while the front travels
    colorBurstA: '#3aa0ff',
    colorBurstB: '#c9ecff',
    colorBurstC: '#ffffff',
    colorFlash: '#c9ecff' // the full-screen flash on impact
  },

  /* ================================================================== */
  /* METEOR — ability three                                              */
  /* ================================================================== */
  /**
   * A burning rock lobbed along the aimed line, which detonates on arrival.
   *
   * The rock is real geometry — a cratered, faceted asteroid generated by
   * `assets/ProceduralGeometry.js` — shaded by a patched standard material so it
   * casts and receives the stage's shadows. Its signature is the **lava seams**:
   * the zero crossing of an fbm field sampled in the rock's own local space, so
   * the cracks are welded to it and tumble with it. `chargeCurve` decides how
   * fast they prise open on the way in.
   *
   * Behind it hangs the **fire trail**: a black-body volume raymarched inside a
   * camera-facing proxy hull laid along the arc. See the `trail*` block.
   *
   * As in `ice` and `thunder`, a cast captures nothing but dice and timestamps:
   * one seed, one tumble axis and a few unitless rolls per debris chunk. The
   * trajectory, the size of the rock, the width of its seams and the whole
   * ballistic flight of every chunk are resolved against this block each frame —
   * which is why dragging `arc` re-lofts a meteor already in the air, and
   * dragging `chunkSpeed` re-throws debris that has already landed.
   */
  meteor: {
    /* --- the cast --- */
    range: 20.0, // maximum cast distance, metres
    minRange: 3.0, // closer than this and the cast is refused
    speed: 21.0, // how fast the rock travels downrange, metres/second
    lifetime: 2.2, // seconds the crater burns after the impact
    fadeTime: 1.6, // seconds everything takes to clear
    cooldown: 0.9,
    castAnim: 'cast1', // which clip in `CAST_ANIMATIONS` the body throws

    /* --- the flight path --- */
    // The rock is thrown from a hand, so these are measured from the caster's
    // origin in the cast's own frame.
    handHeight: 1.35, // metres above the floor
    handForward: 0.6, // metres in front of the caster
    handSide: 0.2, // metres to the side (+ follows `Ability#side`)
    endHeight: 0.75, // height of the rock where it lands, metres
    arc: 2.6, // metres the mid-span lobs upward
    arcCurve: 0.85, // <1 flattens the top of the arc, >1 peaks it

    /* --- the rock --- */
    radius: 0.8, // metres
    facets: 3, // icosphere subdivisions, 0–3 (3 = 1280 triangles)
    lumpiness: 0.26, // low-frequency deformation, × the radius
    lumpScale: 1.5, // lumps per unit radius
    surfaceRoughness: 0.16, // high-frequency chipping
    cuts: 9, // planar fracture faces sliced off it
    cutDepth: 0.28, // how far in those planes bite, × the radius
    craters: 5, // impact bowls punched into it
    craterDepth: 0.18, // how deep those bowls go, × the radius
    craterSize: 0.5, // their angular radius, radians
    spin: 3.4, // tumble rate, radians/second

    /* --- the lava seams --- */
    chargeCurve: 1.6, // how late the rock heats up on its way in
    crackScale: 0.95, // seams per unit radius
    crackWidth: 0.045, // how wide a seam opens (doubled at full charge)
    crackBranches: 0.5, // strength of the finer seams splitting off
    crackGlow: 2.2,
    crackFlow: 0.7, // how much the magma brightness crawls
    crackFlowSpeed: 0.9,
    rockScale: 3.4, // mottling of the rock between the seams
    facetTint: 0.5, // per-facet value break-up — what makes it read as stone
    cavity: 0.25, // darkening down in the craters and the cut faces
    soot: 0.6, // charring either side of a seam
    rimHeat: 0.7, // heat sheath around the silhouette
    leadGlow: 0.9, // compression heat on the leading facets
    leadSharp: 2.6, // how tightly that hugs the nose
    glow: 0.75, // overall emissive gain
    envIntensity: 1.25, // how much of the HDR probe the rock catches
    colorRock: '#6e675f',
    colorChar: '#17130f',
    colorCrack: '#ff6a12',
    colorHot: '#fff3d0',

    /* --- the fire trail --- */
    /**
     * The burning wake, **raymarched as a black-body volume** — the firebending
     * stream from the freehand sandbox, re-aimed at the meteor's arc. The mesh
     * drawn is only a camera-facing proxy hull; the flame itself is integrated
     * inside it by `materials/VolumetricFireMaterial.js`, which is where the four
     * layers these controls drive (silhouette → vortex roll-up → turbulence →
     * shred) are explained.
     *
     * As with everything else here it is not a recorded history: the hull's
     * centre line is sampled straight off the trajectory, so these reshape fire
     * that is already in the air.
     *
     * The volume borrows the rock's palette — `colorHot`, `colorFlameMid`,
     * `colorFlameEdge`, `colorFlameSmoke` — but only reaches for it in
     * proportion to `trailPalette`; at 0 it is a pure Planckian radiator and the
     * colour comes out of `trailTempCore` / `trailTempEdge` instead.
     */
    trailSpan: 7.0, // metres of arc the fire covers behind the rock
    trailWidth: 0.66, // tube radius, metres
    trailHeadSize: 1.8, // fireball radius at the rock, × trailWidth
    trailPlume: 1.1, // upward stretch of the volume (buoyant elongation)
    trailWakeSpread: 0.22, // how far the spent gas behind the head has ballooned
    trailRise: 0.35, // how far the far end of the wake has floated upward, metres
    // Metre-scale lobes in the silhouette. Without these the outline stays a
    // capsule no matter how much fine turbulence is piled on top of it, and the
    // trail reads as a shaded tube.
    trailBulge: 0.18, // how far those lobes swell and pinch the local radius
    trailBulgeScale: 0.34, // lobes per metre — lower = bigger, slower shapes
    // Ring vortices shed off the head and travelling back down the wake. This is
    // what folds the field into curling, mushrooming billows; fbm alone can only
    // make clouds.
    trailVortex: 0.0, // roll-up strength
    trailRingFrequency: 0.0, // vortices per metre of stream
    trailRingSpeed: 4.0, // how fast they travel backwards
    // Kept low on purpose: rolling the noise frame hard around the axis wraps
    // the filaments circumferentially and the flame reads as concentric contour
    // lines rather than as tongues running along the flow.
    trailCurl: 0.0, // swirl of the density field around the axis
    trailTurbulence: 2.94, // noise amplitude eating into the volume
    trailWarp: 0.45, // domain warp — folds the noise into curling sheets
    trailTongue: 0.94, // < 1 stretches structures upward into licking tongues
    trailStreamStretch: 1.13, // < 1 draws them out along the flow
    // Radial shear: how far the fringe is dragged up and back relative to the
    // axis. This is what makes the edge structures read as licking tongues
    // rather than as blobs of the same shape at every radius.
    trailLick: 3.1,
    trailWisps: 0.81, // ridged filaments shredding the fringe into strands
    trailShred: 1.57, // how violently the fringe tears compared to the core
    trailOctaves: 5, // turbulence octaves (quality ↔ cost)
    trailSpeed: 4.62, // how fast the field streams backwards along the path
    trailBuoyancy: 3.5, // how fast it climbs inside the volume
    trailDetachment: 0.9, // how hard the tail tears into separate puffs
    trailNoiseStrength: 0.78,
    trailNoiseFrequency: 3.23,
    trailSoftness: 0.42, // 0 = hard tongues, 1 = a soft glow
    trailFlicker: 0.74,
    trailDensity: 2.09,
    trailSoot: 1.42, // absorption — how much the cool gas occludes
    trailCoreClarity: 0.54, // extinction left in the hottest gas (low = white blob)
    trailSteps: 35, // raymarch samples per pixel (quality ↔ cost)
    trailGlow: 3.06,
    trailOpacity: 0.96,
    trailTailFade: 0.71, // fraction of the trail that has already burnt out
    trailBurnout: 1.2, // seconds the trail takes to die after the impact
    // Temperature & radiance. The flame is shaded as a Planckian radiator: these
    // are the two ends of its temperature range in kelvin, and the exponent the
    // emitted power follows. 4 would be Stefan-Boltzmann; a little gentler keeps
    // the mid-tones off the floor at this exposure.
    trailTempCore: 1920,
    trailTempEdge: 1590,
    trailEmissionCurve: 4.79,
    trailHeatFocus: 1.54, // how fast the gas reaches full heat inside the surface
    trailHeatFalloff: 2.46, // how sharply it cools toward that surface
    // How far the turbulence is allowed to drag the temperature profile around.
    // Radiated power goes as a high power of T, so this number is amplified
    // several-fold on screen — past ~0.5 the noise's own contour lines start
    // showing through as agate banding.
    trailHeatFollow: 0.26,
    trailTailHeat: 0.36, // temperature of the spent gas at the far end of the wake
    trailPalette: 0.62, // 0 = pure black-body physics, 1 = the colour stops below
    trailScatter: 1.99, // firelight bouncing inside the sooty fringe
    trailScatterFalloff: 4.4, // how fast that bath dies away from the core
    colorFlameMid: '#ffb02e',
    colorFlameEdge: '#ff3d10',
    colorFlameSmoke: '#181616',

    /* --- the debris the rock breaks into --- */
    chunkCount: 18, // chunks thrown at the impact (capped at 28)
    chunkScale: 0.28, // their radius, × the meteor's
    chunkSpeed: 7.5, // metres/second they leave the crater at
    chunkForward: 0.55, // how far the spray is biased downrange
    chunkLoft: 1.0, // how steeply they are thrown
    chunkGravity: -17.0,
    chunkSpin: 6.0, // tumble rate, radians/second
    chunkCool: 2.6, // seconds a chunk's seams take to go out
    chunkLinger: 0.5, // seconds they lie there before sinking
    chunkSink: 1.0, // seconds to withdraw into the floor

    /* --- embers, sparks, smoke and grit --- */
    /**
     * As in `ice` and `thunder`: each system is coloured by a four-stop gradient
     * sampled over the particle's own lifetime, `A` at birth through `D` as it
     * dies. Spelled out rather than derived from the flame palette, so the
     * trail can be cooled to red while the rock itself stays white-hot.
     */
    emberRate: 180, // embers streaming off the rock, particles/second
    emberSize: 0.1,
    emberSpeed: 2.4,
    emberLifetime: 1.5,
    emberRise: 1.5, // buoyancy, metres/second
    emberGlow: 1.2,
    emberTurbulence: 0.5,
    colorEmberA: '#fff3d0',
    colorEmberB: '#ff9a2e',
    colorEmberC: '#ff3b0d',
    colorEmberD: '#2b0d05',
    sparkRate: 110, // sparks flung off it
    sparkSize: 0.14,
    sparkSpeed: 6.5,
    sparkLifetime: 0.8,
    sparkGravity: -11.0,
    sparkStretch: 0.16, // how far a spark smears along its velocity
    colorSparkA: '#fffdf2',
    colorSparkB: '#ffd27a',
    colorSparkC: '#ff6a12',
    colorSparkD: '#3d1103',
    smokeRate: 70, // the trail and the column off the crater
    smokeSize: 1.1,
    smokeSpeed: 1.2,
    smokeLifetime: 3.0,
    smokeOpacity: 0.12,
    smokeRise: 0.9,
    colorSmokeA: '#6b503f',
    colorSmokeB: '#3b2c25',
    colorSmokeC: '#241b17',
    colorSmokeD: '#141010',
    debrisSize: 0.06, // grit kicked off the floor
    debrisSpeed: 6.0,
    debrisLifetime: 1.5,
    debrisGravity: -18.0,
    colorDebrisA: '#3a322c',
    colorDebrisB: '#2a231e',
    colorDebrisC: '#1c1714',
    colorDebrisD: '#151110',

    /* --- the molten cracks torn through the floor --- */
    /**
     * Real geometry, not a decal: arms of crack that meander outward from the
     * impact, shed branches, glow from a white-hot core through a wide orange
     * underglow, and heave basalt up along their lips. See
     * `effects/GroundFissures.js` — the network is baked in a unit disc, so
     * `fissureRadius` re-scales cracks that are already on the ground.
     */
    fissureRadius: 5.2, // how far the cracks reach, metres
    fissureLife: 6.5, // seconds before they close up
    fissureArms: 6, // main cracks radiating from the impact
    fissureWander: 1.6, // how hard an arm veers, radians per unit walked
    fissureBranches: 0.75, // fraction of the generated branches kept, 0..1
    fissureBranchLength: 0.85, // how far along a branch runs before its point, 0..1
    fissureWidth: 0.14, // width of the open seam, metres
    fissureHeat: 1.5, // core temperature
    fissurePulse: 1.0, // speed of the heat waves travelling along them
    fissureGrowth: 9.0, // how fast the cracks race outward, metres/second
    fissureRockSize: 0.3, // basalt heaved up along the lips, metres

    /* --- what else the ground does --- */
    scorchRadius: 2.8, // burnt patch under it, metres
    scorchLife: 8.0,
    scorchIntensity: 0.95,
    shockRadius: 6.0, // impact shockwave ring, metres
    colorScorch: '#0d0907',
    colorShockA: '#ff9a2e', // body of the shockwave ring
    colorShockB: '#fff3d0', // its crest

    /* --- dynamic light --- */
    lightIntensity: 16,
    lightRadius: 14,
    lightColor: '#ff8a3c',
    lightFlicker: 0.25, // depth of the light's gutter, 0 = steady
    lightFlickerSpeed: 13,

    /* --- the launch and the detonation --- */
    muzzleSize: 0.0, // the flare at the hand as the rock leaves it — 0 = none
    muzzleIntensity: 1.6,
    castFlash: 0.08, // screen flash on release
    colorCastFlash: '#ff9a2e',
    burstSize: 3.6, // the fireball at the impact point, metres
    burstIntensity: 1.0,
    burstTurbulence: 2.0, // how hard the noise eats into the fireball's shell
    burstEmbers: 260, // extra embers thrown at the impact
    burstSparks: 180,
    burstDebris: 90,
    burstSmoke: 70,
    impactShake: 1.0,
    shakeDuration: 1.1,
    impactFlash: 0.3,
    rumble: 0.04, // continuous shake while the rock is in the air
    colorFlash: '#ff9a2e' // the full-screen flash on impact
  },

  /* ================================================================== */
  /* BEAM — ability four                                                 */
  /* ================================================================== */
  /**
   * A sustained super beam: the caster winds up a ball of light in both hands,
   * then lets a column of it out along the aimed line, where it *stays* —
   * burning into the floor for `lifetime` before it collapses back to a thread
   * and blinks out. Reference for the look: `superbeam.jpg`.
   *
   * This is the ability with a **fourth beat**. Ice, thunder and meteor all run
   * travel → impact → fade; the beam puts a `charge` in front of that, so the
   * shot is something you watch arrive *and* something that lands and holds.
   * Nothing in the base class needed changing for it — `BeamAbility` simply
   * refuses to let the front leave the hand until the orb is up to power.
   *
   * The column is **one tube** — see `assets/ProceduralGeometry.js` — drawn
   * three times at three radii by `materials/BeamMaterial.js`: a wide halo, a
   * hollow rim-weighted sheath and, inside it, a core weighted the *opposite*
   * way, brightest where the view ray runs down the barrel. That inversion is
   * what makes the middle read as a solid rod of light instead of as a lit
   * pipe. The coils spiralling around it and the shock discs racing down it are
   * two more instanced passes placed against the same radius profile, so all
   * five stay welded together when the shape is dragged.
   *
   * Deliberately *not* electric: no kinks anywhere. The bolt's noise is
   * piecewise-linear so it keeps its corners; every noise term here is smooth
   * and stretched hard along the flow, because a beam that kinks is a bolt.
   *
   * As in every other block, a cast captures nothing but one seed and a few
   * timestamps. The barrel, the flare, the coil pitch and the disc train are all
   * resolved against these numbers each frame — which is why dragging `radius`
   * re-bores a beam that is already burning, with the clock stopped.
   */
  beam: {
    /* --- the cast --- */
    range: 26.0, // maximum cast distance, metres
    minRange: 3.0, // closer than this and the cast is refused
    charge: 0.42, // seconds the orb winds up before the beam is let out
    speed: 150.0, // how fast the leading edge races downrange, metres/second
    lifetime: 1.15, // seconds it burns once it lands
    fadeTime: 0.4, // seconds it takes to collapse
    cooldown: 1.6,
    castAnim: 'cast1', // which clip in `CAST_ANIMATIONS` the body throws

    /* --- where it leaves the caster --- */
    // Both hands, so this one sits on the centre line rather than off a
    // shoulder like the bolt and the rock.
    handHeight: 1.3, // metres above the floor
    handForward: 0.72, // metres in front of the caster
    handSide: 0.0, // metres to the side (+ follows `Ability#side`)
    endHeight: 1.0, // height of the beam where it lands, metres

    /* --- the column --- */
    // A narrow throat that stays tight (`radiusCurve` above 1) and then opens
    // hard over the last tenth of the span: the beam reads as a jet with a bell
    // on the end rather than as a cone, which is what puts the weight at the
    // impact instead of spreading it down the whole line.
    radiusNear: 0.16, // half-width at the muzzle, metres
    radius: 0.77, // half-width at the target
    radiusCurve: 1.27, // <1 opens out early, >1 stays tight then flares late
    flare: 1.74, // extra swell where it lands
    flareWidth: 0.09, // how much of the span that swell covers, 0..1
    // Both wobbles ship at zero. The column reads cleaner with a hard, still
    // silhouette — the coils already give the eye something moving to follow —
    // but the rates below are tuned, so raising either one is a single drag.
    throb: 0.0, // pressure waves travelling out along it
    throbScale: 4.8, // waves over the length
    throbSpeed: 2.6, // waves/second
    wander: 0.0, // metres the axis drifts, pinned at both ends
    wanderScale: 0.9, // drift features per unit length
    wanderSpeed: 0.7,

    /* --- the three tube passes --- */
    // The core is deliberately narrow and not fully opaque. Widen it or push
    // `coreFill` up and the three layers stack into one white rod: the cyan
    // sheath and the gold coils are only readable because the middle leaves
    // them room.
    coreWidth: 0.2, // the hot rod, × the column radius
    coreSharp: 1.55, // how tightly the core hugs the axis
    coreFill: 0.6, // how solid it reads
    shellWidth: 1.0, // the sheath
    shellRim: 1.15, // brightness of its silhouette edges
    shellFill: 0.18, // how much body it has between them
    shellOpacity: 0.95,
    // Wide and faint: the halo is atmosphere, not a second beam. Pushing its
    // opacity up fogs the sheath's silhouette edges, which are the read.
    haloWidth: 2.75, // the outer bloom
    haloRim: 4.3, // how tightly that hugs the silhouette
    haloOpacity: 0.14,
    edgePower: 2.2, // rim exponent shared by the sheath

    /* --- the surface --- */
    ripple: 0.2, // how far the noise pushes the barrel off round
    rippleBands: 2.2, // ripple features around the barrel
    rippleScale: 4.25, // ... and along it
    rippleSpeed: 2.0, // how fast they crawl downrange
    streak: 1.1, // filaments streaming along the flow
    streakSharp: 0.45, // 0 = a wash, 1 = hard threads
    streakScale: 4.2, // threads per unit length
    streakBands: 1.8, // ... and around the barrel
    // Kept low: the threads carry heat into the *sheath*, and pushing this up
    // whitens it out until the beam is one colour from axis to rim.
    streakGlow: 0.55, // how hot a thread burns in the sheath
    flowSpeed: 7.0, // how fast the whole field streams downrange
    mouthGlow: 1.6, // heat where the column leaves the orb
    mouthLength: 0.1, // how far that reaches, fraction of the span
    // Kept below the muzzle's: the flare and the impact shell already carry the
    // far end, and stacking a hot cap on top of them blows it out to a disc.
    tipGlow: 0.6, // heat on the leading edge / the burning end
    tipLength: 0.09, // length of that edge, fraction of the span
    softFade: 0.62, // metres of soft fade where it meets geometry

    /* --- colour --- */
    colorCore: '#ffffff', // the axis
    colorInner: '#d3f4ff',
    colorOuter: '#3ec6ff', // the outside of the sheath
    colorHalo: '#0d3ce0', // the wide bloom around it
    // The column is deliberately held *back*. Three additive tube passes at full
    // strength clip to white and the beam becomes a flat plank; dropping the
    // gain and the opacity keeps it glassy and hands the read to the coils.
    glow: 0.74, // overall emissive gain
    opacity: 0.29,

    /* --- the coils --- */
    /**
     * Ribbons spiralling around the column, on the same strip the bolt is drawn
     * on. Warm on purpose: the reference frames a white-hot beam with gold
     * coils, and the colour split is what stops them dissolving into the sheath.
     */
    coils: 4, // ribbons (capped at 8)
    coilTurns: 1.45, // turns each one makes over the length
    // Negative, so the ribbons roll *against* the direction the charge pulse
    // runs. The two motions reading differently is what keeps a held beam from
    // looking like a single rotating screw.
    coilSpeed: -0.69, // turns/second they roll on top of that
    coilRadius: 1.88, // how far out they ride, × the column radius
    coilFlare: 0.57, // extra opening at the far end
    coilWidth: 0.1, // half-width at the muzzle, metres
    coilWidthTip: 1.9, // that width at the target, as a multiple
    coilSharp: 2.2, // how hard the ribbon falls off across its width
    coilPulse: 0.65, // depth of the charge running along it
    coilPulseFreq: 3.0, // pulses over the length
    coilPulseSpeed: 1.6, // pulses/second
    // Driven hard on purpose. With the column dialled back above, the ribbons
    // are what the eye actually follows down the beam.
    coilGlow: 8.0,
    coilOpacity: 2.0,
    colorCoil: '#ffdc8c',
    colorCoilEdge: '#ff6a12',

    /* --- the shock discs --- */
    rings: 10, // discs in flight (capped at 12)
    ringSpeed: 1.31, // trips down the beam per second
    // Both lips well clear of the sheath, and close together: the discs read as
    // thin hoops orbiting the column rather than as plates growing out of it.
    ringInner: 2.42, // inner lip, × the local column radius
    ringOuter: 2.73, // outer lip
    ringSwell: 0.55, // how much they open out as they travel
    ringFade: 0.18, // how much is left of one by the time it lands
    ringSharp: 1.6, // how thin the band reads
    ringGlow: 2.4,
    ringOpacity: 0.7,
    colorRing: '#9ceeff',

    /* --- the charge orb --- */
    orbSize: 0.39, // radius once it is up to power, metres
    orbThrob: 0.11, // how hard it pulses
    orbThrobSpeed: 6.9,
    orbTurbulence: 0.24, // how far the noise eats into its surface
    orbScale: 2.2, // features over the surface
    orbFlow: 0.9, // how fast they crawl
    orbBands: 5.0, // filament frequency
    orbRim: 1.8, // rim exponent
    orbGlow: 2.8,
    orbOpacity: 1.0,

    /* --- what the ground does --- */
    scorchRate: 1.1, // burns laid per metre of front travel
    scorchRadius: 0.7, // radius of one, metres
    scorchLife: 7.0, // seconds it lingers
    scorchIntensity: 0.55,
    colorScorch: '#0a0d14',
    colorEmber: '#4ad6ff',
    dustRate: 7.0, // dust rings thrown off the burning end, per second
    dustRadius: 2.4, // radius of one, metres
    dustLife: 0.9,
    colorDustA: '#3d5c74',
    colorDustB: '#9ceeff',
    shockRate: 3.5, // pressure rings snapped across the floor, per second
    shockRadius: 7.0, // radius of the one at the impact, metres
    colorShockA: '#3ec6ff', // body of the shockwave ring
    colorShockB: '#ffffff', // its crest

    /* --- sparks, motes, smoke and debris --- */
    /**
     * As in `ice`, `thunder` and `meteor`: each system is coloured by a four-stop
     * gradient sampled over the particle's own lifetime, `A` at birth through
     * `D` as it dies. The motes do double duty — they are the intake spiralling
     * *into* the orb while it charges, and the drift shed off the column once it
     * is firing.
     */
    sparkRate: 300, // sparks shed off the column, particles/second
    sparkSize: 0.15,
    sparkSpeed: 8.0,
    sparkLifetime: 0.55,
    sparkGravity: -9.0,
    sparkStretch: 0.22, // how far a spark smears along its velocity
    sparkForward: 0.9, // how hard the spray is dragged downrange
    colorSparkA: '#ffffff',
    colorSparkB: '#d3f4ff',
    colorSparkC: '#3ec6ff',
    colorSparkD: '#0b2f7a',
    moteRate: 120, // the drift hanging around the column
    moteSize: 0.06,
    moteSpeed: 1.6,
    moteLifetime: 1.5,
    moteRise: 0.9, // upward drift, metres/second
    moteTurbulence: 0.8,
    colorMoteA: '#ffffff',
    colorMoteB: '#9ceeff',
    colorMoteC: '#3ec6ff',
    colorMoteD: '#06205e',
    intakeRate: 260, // motes pulled into the orb while it charges
    intakeRadius: 2.6, // how far out they are drawn from, metres
    intakeSpeed: 7.5, // how fast they fall in
    smokeRate: 90, // steam scoured off the floor under the beam
    smokeSize: 1.1,
    smokeSpeed: 1.4,
    smokeLifetime: 2.4,
    smokeOpacity: 0.07,
    smokeRise: 0.7,
    colorSmokeA: '#41566d',
    colorSmokeB: '#35485e',
    colorSmokeC: '#2a3949',
    colorSmokeD: '#1a2430',
    debrisRate: 34, // chips torn off the floor along the burn line
    debrisSize: 0.06,
    debrisSpeed: 6.0,
    debrisLifetime: 1.4,
    debrisGravity: -18.0,
    colorDebrisA: '#2b323c',
    colorDebrisB: '#1f252d',
    colorDebrisC: '#1a1f26',
    colorDebrisD: '#1a1f26',

    /* --- dynamic light --- */
    // Two lights: one rides the beam, one sits in the caster's hands so the
    // charge actually lights the body that is holding it.
    lightIntensity: 30,
    lightRadius: 20,
    lightColor: '#7fdcff',
    lightPulse: 0.18, // depth of the hum, 0 = steady
    lightPulseSpeed: 5.0, // pulses/second
    muzzleLightIntensity: 16,
    muzzleLightRadius: 9,

    /* --- the wind-up, the release and the burn --- */
    chargeShake: 0.045, // rumble while the orb spools up
    castFlash: 0.22, // screen flash as it is released
    muzzleSize: 1.1, // the pressure shell thrown off the hands, metres
    muzzleIntensity: 2.0,
    colorCastFlash: '#d3f4ff',
    burstSize: 4.2, // the shell at the impact point, metres
    burstIntensity: 1.6,
    burstSparks: 220, // extra sparks thrown when it lands
    burstDebris: 70,
    pulseRate: 2.6, // pressure shells off the burning end, per second
    pulseSize: 2.2, // radius of one, metres
    pulseIntensity: 1.1,
    splashRate: 260, // sparks kicked back up the beam while it burns
    impactShake: 0.9,
    shakeDuration: 0.7,
    burnShake: 0.09, // continuous rumble while the beam is standing
    impactFlash: 0.3,
    rumble: 0.05, // rumble while the leading edge travels
    colorBurstA: '#3ec6ff',
    colorBurstB: '#d3f4ff',
    colorBurstC: '#ffffff',
    colorFlash: '#d3f4ff' // the full-screen flash on impact
  },

  /* ================================================================== */
  /* SNARE — ability five, and the first **far cast**                    */
  /* ================================================================== */
  /**
   * A trap planted at a point rather than a shot fired along a line: the caster
   * whips a leash of current out across the floor, and where it lands the ring
   * snaps open — a column of lightning tears up out of the middle, tendrils
   * crawl outward to the boundary and arcs run around the rim, all of it
   * holding, re-striking and dragging the air upward for `lifetime` before it
   * collapses. Reference for the look: `electricalboost.jpg`.
   *
   * This is the block that defines what a far cast *is* in this project. The
   * targeting is a circle (see the `zone` block) and `zoneRadius` is the promise
   * that circle makes: the boundary the indicator draws is the boundary the
   * field burns, the tendrils reach and the rim arcs run along, so dragging that
   * one number re-scales the indicator and a snare that is already standing
   * together.
   *
   * The whole cage is **one instanced strip** — see `materials/SnareMaterial.js`.
   * Every filament is the same ribbon, and a *role* decided from its instance
   * index (leash → column → tendril → rim) picks which parametric path the
   * vertex shader threads it along. Two draw calls for all four, however many
   * filaments are in the air.
   *
   * As in every other block, a cast captures nothing but a seed and a few
   * timestamps. Every metre, radian and second is resolved against these numbers
   * each frame — including a zero-length one, which is why the trap reshapes
   * under the sliders with the clock stopped.
   */
  snare: {
    /* --- the cast --- */
    range: 20.0, // maximum cast distance, metres
    minRange: 0.0, // a trap can legitimately be dropped on your own feet
    zoneRadius: 4.4, // the footprint — what the circle indicator measures out
    speed: 62.0, // how fast the leash races to the point, metres/second
    snapTime: 0.16, // seconds the ring takes to slam open once it lands
    lifetime: 2.6, // seconds the snare stands
    fadeTime: 0.75, // seconds it takes to collapse
    cooldown: 1.4,
    castAnim: 'cast2', // which clip in `CAST_ANIMATIONS` the body throws

    /* --- the leash that plants it --- */
    // Thrown from a hand, so these are measured from the caster's origin in the
    // cast's own frame, exactly as the bolt and the rock are.
    handHeight: 1.24, // metres above the floor
    handForward: 0.58, // metres in front of the caster
    handSide: 0.18, // metres to the side (+ follows `Ability#side`)
    leashStrands: 3, // filaments in the whip
    leashSag: -0.35, // metres the mid-span bows (negative drops it to the floor)
    leashSpread: 0.22, // how far the filaments separate, metres
    leashKink: 0.3, // kink amplitude on the whip, metres
    leashWidth: 1.0, // × the shared filament width
    leashCling: 0.12, // how far above the floor the tip runs, metres

    /* --- the column --- */
    strands: 15, // filaments in the pillar
    height: 9.2, // how high it reaches, metres
    heightCurve: 1.45, // <1 gets it up fast, >1 makes it climb late
    throat: 0.16, // radius where it leaves the floor, × zoneRadius
    columnSpread: 0.25, // radius at the top, × zoneRadius
    columnCurve: 2.88, // >1 keeps the throat tight then opens it late
    columnFlare: 0.585, // extra opening over the last quarter, × zoneRadius
    columnTwist: 0.22, // turns a filament makes over the climb
    columnSpin: 1.26, // turns/second the whole pillar rolls
    columnKink: 0.27, // kink amplitude, metres
    columnWidth: 1.86, // × the shared filament width
    columnTaper: 1.09, // how much thinner the top is than the base

    /* --- the tendrils crawling out to the boundary --- */
    tendrils: 20, // separate ground filaments (capped with the rest at 56)
    tendrilInner: 0.0, // where they leave the column, × zoneRadius
    tendrilReach: 1.07, // where they end, × zoneRadius (1 = exactly on the band)
    tendrilCurve: 1.18, // <1 throws them outward early
    tendrilWander: 1.41, // radians a tendril veers over its run
    tendrilArch: 1.16, // metres it hops off the floor mid-span
    tendrilHug: 0.005, // how far above the floor it runs, metres
    tendrilSpin: -0.225, // turns/second the whole fan rotates
    tendrilKink: 0.72, // kink amplitude, metres
    tendrilWidth: 0.75, // × the shared filament width
    tendrilDim: 0.8, // how much dimmer than the column

    /* --- the arcs running around the rim --- */
    rimArcs: 14, // arcs on the boundary at once
    rimSpan: 0.335, // fraction of the circle one arc covers
    rimSpeed: -1.84, // revolutions/second they travel
    // High enough to clear the burnt band underneath them: an arc that hops
    // 0.3 m over a band this bright is simply invisible.
    rimHeight: 0.98, // metres they hop at mid-span
    rimJitter: 0.23, // radial wobble, × zoneRadius
    rimKink: 0.15, // kink amplitude, metres
    rimWidth: 0.85, // × the shared filament width
    rimDim: 1.0,

    /* --- the shape every filament shares --- */
    // The same piecewise-linear value noise the bolt uses — linear on purpose,
    // because smoothstep rounds the corners off and the corners are the entire
    // reason it reads as lightning.
    jitter: 1.0, // master multiplier on the four per-role kink amplitudes
    jitterScale: 1.4, // kinks per metre
    octaves: 4, // 1–5; each halves the amplitude and doubles the rate
    jitterFalloff: 0.55, // amplitude kept per octave
    crawl: 2.4, // how fast the kinks slide along a filament
    pinch: 0.16, // fraction of the span the ends are pulled straight over
    restrike: 21, // times/second every filament re-rolls its shape
    flicker: 0.26, // depth of the whole-cage brightness stutter
    flickerSpeed: 30,
    strandFlash: 0.45, // how much individual filaments blink out

    /* --- the ribbon --- */
    width: 0.032, // half-width of a filament, metres
    coreSharp: 4.4, // how hard the hot core falls off across the ribbon
    glowWidth: 6.2, // the halo, × the core width
    glowFalloff: 2.3, // how fast the halo fades across its ribbon
    glowOpacity: 0.44,
    softFade: 0.7, // metres of soft fade where a filament meets geometry

    /* --- colour --- */
    // Violet rather than the Storm Lance's blue: two electric abilities on the
    // bar need to be told apart at a glance, and the hue split does it before
    // the silhouette does.
    colorCore: '#ffffff', // the centre of a filament
    colorInner: '#dcd0ff',
    colorOuter: '#8f6bff', // the outside of a filament
    colorHalo: '#2a0e8c', // the wide glow around the cage
    glow: 2.2, // overall emissive gain
    opacity: 1.0,

    /* --- the field burnt into the floor --- */
    /**
     * The indicator's promise, made real: the same circle, the same thick
     * boundary, now a live shader instead of a targeting aid. It is an
     * ability-owned mesh rather than a decal precisely because a decal captures
     * its radius when it spawns — this one has to re-scale under `zoneRadius`
     * while it is standing.
     */
    fieldBoundary: 0.02, // thickness of the burnt band, metres
    fieldBoundaryGlow: 2.9,
    fieldFill: 0.65, // the wash inside it
    fieldFalloff: 3.6, // how hard that wash crowds to the rim
    fieldVeins: 2.98, // filaments burnt across the disc
    fieldVeinScale: 2.0, // veins per metre
    fieldVeinSharp: 0.72, // 0 = a wash, 1 = hard threads
    fieldWarp: 0.55, // domain warp — what stops the veins reading as spokes
    fieldCrawl: 0.5, // how fast they writhe
    fieldRings: 2.4, // pressure rings travelling out from the middle
    fieldRingSpeed: 0.8, // rings/second
    fieldSpokes: 20, // ticks stepping around the boundary
    fieldSpokeLength: 0.5, // how far they reach in, metres
    fieldSpin: 0.05, // revolutions/second the ticks step around
    fieldCore: 1.3, // brightness of the pool the column stands in
    fieldCoreSize: 0.22, // its radius, × zoneRadius
    fieldPulse: 0.0, // brightness breathing
    fieldPulseSpeed: 3.95,
    fieldOpacity: 1.0,
    fieldHeight: 0.03, // hover distance above the floor, metres
    colorField: '#8f6bff', // the wash and the veins
    colorFieldEdge: '#ffffff', // the boundary band and the core pool

    /* --- what else the ground does --- */
    arcRate: 5.0, // branching burns laid around the rim, per second
    arcRadius: 1.2, // radius of one, metres
    arcLife: 0.75,
    arcIntensity: 0.9,
    arcBranches: 0.7, // how finely a burn splits into filaments
    trailRate: 1.1, // burns laid per metre while the leash races out
    scorchRadius: 1.6, // dark burn under the column, metres
    scorchLife: 7.5,
    scorchIntensity: 0.5,
    colorArc: '#c3b0ff',
    colorEmber: '#8f6bff',
    colorScorch: '#0b0813',
    shockRadius: 7.0, // the ring that snaps out when the trap opens, metres
    colorShockA: '#8f6bff', // body of the shockwave ring
    colorShockB: '#ffffff', // its crest

    /* --- sparks, updraft, smoke and debris --- */
    /**
     * As in every other block: a four-stop gradient sampled over the particle's
     * own lifetime, `A` at birth through `D` as it dies. The **updraft** is this
     * ability's signature system — motes drawn off the whole disc and hauled
     * inward and up into the column, which is the read that says the trap is
     * pulling on the air rather than just sitting in it.
     */
    sparkRate: 320, // sparks thrown off the cage, particles/second
    sparkSize: 0.15,
    sparkSpeed: 8.5,
    sparkLifetime: 0.55,
    sparkGravity: -13.0,
    sparkStretch: 0.2, // how far a spark smears along its velocity
    colorSparkA: '#ffffff',
    colorSparkB: '#dcd0ff',
    colorSparkC: '#8f6bff',
    colorSparkD: '#2a0e8c',
    updraftRate: 210, // motes hauled up the column, particles/second
    updraftSize: 0.07,
    updraftSpeed: 6.0, // how fast they are pulled in
    updraftLifetime: 1.4,
    updraftRise: 5.5, // upward acceleration once they are inside, m/s²
    updraftInset: 0.15, // how far inside the boundary they are picked up
    updraftTurbulence: 0.9,
    colorUpdraftA: '#8f6bff',
    colorUpdraftB: '#dcd0ff',
    colorUpdraftC: '#ffffff',
    colorUpdraftD: '#1b0a5e',
    smokeRate: 70, // haze scoured off the burnt floor
    smokeSize: 1.05,
    smokeSpeed: 1.2,
    smokeLifetime: 2.4,
    smokeOpacity: 0.06,
    smokeRise: 0.6,
    colorSmokeA: '#4a4368',
    colorSmokeB: '#3a3554',
    colorSmokeC: '#2b2740',
    colorSmokeD: '#191728',
    debrisRate: 30, // chips torn off the floor inside the ring
    debrisSize: 0.055,
    debrisSpeed: 5.5,
    debrisLifetime: 1.3,
    debrisGravity: -17.0,
    colorDebrisA: '#2a2733',
    colorDebrisB: '#201e28',
    colorDebrisC: '#1a1822',
    colorDebrisD: '#1a1822',

    /* --- dynamic light --- */
    lightIntensity: 24,
    lightRadius: 18,
    lightHeight: 0.38, // how far up the column the light sits, 0..1
    lightColor: '#a98bff',
    lightFlicker: 0.38, // depth of the light's gutter, 0 = steady
    lightFlickerSpeed: 24,

    /* --- the throw, the snap and the hold --- */
    muzzleSize: 0.5, // the flash at the hand as the leash leaves it
    muzzleIntensity: 1.7,
    castFlash: 0.09, // screen flash on release
    colorCastFlash: '#c3b0ff',
    burstSize: 2.8, // the shell thrown off when the ring opens, metres
    burstIntensity: 1.5,
    burstSparks: 200, // extra sparks at the snap
    burstDebris: 60,
    pulseRate: 1.5, // pressure shells shed off the column while it holds, /s
    pulseSize: 1.2, // radius of one, metres
    pulseIntensity: 0.5,
    ringRate: 1.4, // dust rings pushed across the floor while it holds, /s
    impactShake: 0.85,
    shakeDuration: 0.6,
    holdShake: 0.07, // continuous rumble while the snare stands
    impactFlash: 0.26,
    rumble: 0.025, // rumble while the leash races out
    colorBurstA: '#8f6bff',
    colorBurstB: '#dcd0ff',
    colorBurstC: '#ffffff',
    colorFlash: '#c3b0ff' // the full-screen flash when it snaps open
  },

  /* ================================================================== */
  /* GLACIER — ability six, and the far cast that comes out of the floor */
  /* ================================================================== */
  /**
   * A cold front races along the floor to the aimed point, the disc freezes out
   * to the boundary the circle drew, and a wall of crystal tears up out of the
   * ground around it: a ring of blades leaning outward with a skirt of wreckage
   * banked against their feet. It stands, glints, breathes cold off its rim —
   * and then breaks into plates and sinks back into the floor. Reference for the
   * look: `Hud7Xfg3LH.jpg`.
   *
   * The **middle stays open**: every shard is seated in a band about
   * `zoneRadius` and nothing is planted in the centre, because the read is a
   * wall you are looking into and filling the disc stops it being a ring. What
   * lives inside it is air and frozen ground.
   *
   * The second **far cast**, and the counterpart to the Voltaic Snare: same
   * circle, same promise, opposite answer. The snare fills the footprint with
   * current standing in the air; this one fills it with geometry standing on the
   * ground, so `zoneRadius` is again the one number that matters — it is where
   * the ring of blades is seated, where the sheet's boundary band burns, where
   * the curtain of cold air stands and where the rime creeps.
   *
   * Three things carry it, and each has its own group below:
   *
   *  - **the sweep.** The ring does not appear; it *closes*. The blade nearest
   *    the caster goes up first and the wave runs around both sides to meet
   *    behind the crown (`sweepTime`), with the skirt banking up behind the wave
   *    (`skirtDelay`, `skirtWave`).
   *  - **the freeze front.** Every shard crystallises upward along its own axis
   *    while it rises (`frontRough`, `frontWidth`, `frontGlow` — see
   *    `materials/GlacierMaterial.js`), so the ice *forms* rather than sliding
   *    out of a hole.
   *  - **the shatter.** It leaves the same way it arrived, in pieces: a
   *    per-shard ramp against a chunk id made of voronoi cells and flat facets,
   *    so plates and wedges come away one at a time (`shatterScale`,
   *    `shatterEdge`, `shatterGlow`).
   *
   * As in every other block, a cast captures nothing but a seed and a handful of
   * timestamps. Every metre, radian and second is resolved against these numbers
   * each frame — including a zero-length one, which is why the crown reshapes
   * under the sliders with the clock stopped.
   */
  glacier: {
    /* --- the cast --- */
    range: 18.0, // maximum cast distance, metres
    minRange: 0.0, // a wall of ice around your own feet is a legitimate play
    zoneRadius: 4.6, // the footprint — what the circle indicator measures out
    speed: 44.0, // how fast the front races to the point, metres/second
    snapTime: 0.22, // seconds the sheet takes to freeze out to the boundary
    lifetime: 4.2, // seconds the crown stands
    shatterDelay: 0.5, // seconds after `lifetime` before the ice starts to break
    shatterStagger: 0.45, // seconds of random delay between neighbours
    sinkTime: 1.15, // seconds one shard takes to crumble and withdraw
    cooldown: 1.6,
    castAnim: 'cast3', // which clip in `CAST_ANIMATIONS` the body throws

    /* --- where the front leaves the caster --- */
    // Thrown from a hand, so these are measured from the caster's origin in the
    // cast's own frame, exactly as the bolt, the rock and the leash are.
    handHeight: 1.22, // metres above the floor
    handForward: 0.6, // metres in front of the caster
    handSide: 0.18, // metres to the side (+ follows `Ability#side`)

    /* --- how the footprint is filled --- */
    /**
     * Everything is seated in a band about `zoneRadius`; the middle of the
     * circle is left empty on purpose, because the read of the ability is a wall
     * you are looking *into* and filling the disc stops it being a ring. The
     * spire in the middle is kept as a control and ships at zero.
     */
    spikeCount: 220, // instances spent on one cast (capped at 320)
    density: 1.0, // multiplier on that count
    ringShare: 0.6, // fraction of them spent on the wall at the boundary
    coreShare: 0.0, // ... on the spire in the middle (0 = the middle stays open)
    lateShare: 0.12, // ... held back to push up during the hold
    ringSeat: 0.94, // where the wall stands, × zoneRadius
    ringScatter: 0.16, // radial jitter of the wall, × zoneRadius
    skirtSeat: 0.74, // inner lip of the wreckage banked against it, × zoneRadius
    skirtBand: 0.42, // how wide that band is, × zoneRadius
    skirtBias: 0.9, // <1 pushes the skirt outward, >1 crowds it inward
    coreSpread: 0.16, // radius of the cluster in the middle, × zoneRadius

    /* --- the silhouette --- */
    /**
     * The reference is a *starburst*, not a fence: long needles thrown outward
     * from the rim at a steep angle, fanned off the radius so they cross, with
     * wildly uneven lengths. `ringLean` is the single control that decides
     * whether this reads as a crown or a picket line — at 0 it is a fence, and
     * the higher it goes the further the blades are thrown out over the floor.
     */
    ringHeight: 1.4, // length of a blade on the wall, metres
    ringWave: 0.61, // how uneven the crest of that wall is, 0..1
    skirtHeight: 1.7, // length of a shard in the skirt, metres
    coreHeight: 5.2, // length of the spire, metres
    heightJitter: 0.65,
    ringLean: 0.33, // radians the wall is thrown outward (≈19°)
    skirtLean: 0.3, // ... and the skirt
    coreLean: 0.2, // the spire stands nearly upright
    leanJitter: 1.3,
    fan: 1.16, // radians a blade is splayed off its own radius, ± — the crossing
    twist: 1.0, // random yaw, 0..1 of a full turn
    rubble: 0.53, // fraction of the skirt demoted to ankle-height wreckage
    rubbleScale: 0.34,

    /* --- an individual crystal --- */
    // Blunt wedges rather than needles: a thick base that only narrows to about
    // a third at the tip, so each facet stays wide enough to catch a flash.
    radius: 0.375, // base radius, metres
    radiusJitter: 0.94,
    taper: 0.36, // tip radius as a fraction of the base
    facets: 7, // sides of the prism — fewer, so each facet is a broad flash
    roughness: 0.0, // how far the facets are pushed off a clean prism
    bend: 0.0, // sideways curve from base to tip — nearly straight

    /* --- the bloom: when each shard goes up --- */
    riseTime: 0.2, // seconds from buried to full height
    riseOvershoot: 0.3, // how far past full height the punch carries
    settle: 0.5, // seconds the overshoot takes to damp out
    sweepTime: 0.42, // seconds the wave takes to run around the ring
    skirtDelay: 0.1, // seconds before the skirt starts
    skirtWave: 0.26, // ... and how long it takes to cross the band
    coreDelay: 0.2, // seconds before the spire comes up
    stagger: 0.07, // seconds of random delay on top of all of it
    bloomSpread: 0.7, // fraction of the hold the late shards are scattered over

    /* --- the ice: prismatic glass, not the Lance's quarried crystal --- */
    /**
     * Deliberately the *opposite* treatment to `ice`. Two frost abilities on one
     * bar have to be told apart before the silhouette does it, and a recolour is
     * not enough — so where the Frost Lance is milky, diffuse and tinted deeper
     * the thicker it gets, these blades are near-empty glass carried entirely by
     * their edges: a chromatically split fresnel (`dispersion`), light piped up
     * the body to an incandescent point (`pipe`, `tipBias`, `tipGlow`), flow
     * lines instead of feather frost (`stria`) and one real reflection of the
     * stage off every facet (`envIntensity`, `specular`).
     * See `materials/GlacierMaterial.js`.
     */
    colorGlass: '#0e4a66', // the little body it has
    colorEdge: '#ffffff', // the silhouette, the flow lines and the glint
    colorPrismA: '#57f0ff', // one end of the dispersion split
    colorPrismB: '#8f9bff', // ... and the other
    colorCore: '#a8f4ff', // the light piped up the blade
    colorTip: '#ffffff', // the incandescent point
    body: 1.37, // how much of a body it has at all, 0 = pure edges
    edgePower: 1.14, // how tightly the silhouette hugs the rim
    edgeGain: 0.81, // how hard it burns
    dispersion: 0.73, // how far the red, green and blue fresnels come apart
    pipe: 1.09, // light piped along the blade
    tipBias: 1.6, // how hard that light crowds toward the point
    bands: 1.4, // slow waves travelling up it
    pulseSpeed: 0.6,
    tipStart: 0.6, // where the incandescent tip begins, 0..1 up the blade
    tipGlow: 1.5,
    stria: 0.75, // flow lines running the blade's length
    striaScale: 6.0,
    envIntensity: 0.6, // how much of the HDR probe the facets catch
    specular: 2.0, // the tight sun lobe off them
    glow: 1.0, // overall emissive gain
    opacity: 1.0,
    birthGlow: 2.2, // extra glow on a shard that has just erupted
    birthFade: 0.5, // seconds that birth flash lasts

    /* --- the freeze front and the shatter --- */
    /**
     * The two things that make this ability's ice *arrive* and *leave* rather
     * than fade in and out. Both are per-instance ramps the ability drives; what
     * lives here is only their look.
     */
    frontRough: 0.35, // how ragged the crystallising edge is
    frontWidth: 0.12, // how much of the shard is lit behind that edge
    frontGlow: 2.4, // how hard it burns
    shatterScale: 7.0, // break-up cells per unit of the crystal
    shatterEdge: 0.08, // width of the lit rim on a fresh break
    shatterGlow: 3.0,

    /* --- the sheet of ice on the floor --- */
    /**
     * The indicator's promise, made real: the same circle and the same thick
     * boundary, now a frozen sheet instead of a targeting aid. An ability-owned
     * mesh rather than a decal precisely because a decal captures its radius
     * when it spawns — this one has to re-scale under `zoneRadius` while the
     * crown is standing, and to run its own front outward and back.
     */
    fieldBoundary: 0.4, // thickness of the band at the edge, metres
    fieldBoundaryGlow: 2.4,
    fieldFill: 0.26, // the wash inside it
    fieldFalloff: 1.4, // how hard that wash crowds to the rim
    fieldPlates: 1.0, // tonal break-up between plates
    fieldPlateScale: 2.2, // plates per metre
    fieldSeam: 0.8, // rime piled in the seams between them
    fieldFingers: 0.9, // frost fingers crawling over the sheet
    fieldFingerScale: 1.6, // fingers per metre
    fieldWarp: 0.5, // domain warp — what stops them reading as spokes
    fieldCrawl: 0.12, // how fast they writhe
    fieldRings: 2.6, // pressure rings travelling in toward the spire
    fieldRingSpeed: -0.5, // rings/second (negative travels inward)
    fieldSweep: 0.4, // slow cold sweep around the disc
    fieldSweepSpeed: 0.12, // revolutions/second
    fieldCore: 1.0, // brightness of the pool the spire stands in
    fieldCoreSize: 0.2, // its radius, × zoneRadius
    fieldPulse: 0.18, // brightness breathing
    fieldPulseSpeed: 1.6,
    fieldOpacity: 1.0,
    fieldHeight: 0.03, // hover distance above the floor, metres
    colorField: '#a7e6ff', // the wash, the plates and the fingers
    colorFieldEdge: '#ffffff', // the boundary band, the seams and the pool

    /* --- the curtain of cold air standing on the ring --- */
    /**
     * An open cylinder seated on the boundary, eroded by ridged noise stretched
     * hard vertically and scrolled downward. This is the piece that frames the
     * crown from the outside: without it the wall of blades ends at its own
     * silhouette, and a wall of ice that is not shedding cold reads as glass.
     * Set `veil` to 0 to take it off.
     */
    veil: 0.5, // master opacity of the curtain, 0 hides it
    veilHeight: 1.9, // how high it stands, metres
    veilRadius: 1.02, // where it stands, × zoneRadius
    veilFlare: 0.32, // how far it leans outward at the top
    veilBillow: 0.22, // metre-scale lobes pushing its silhouette off round
    veilScale: 1.4, // noise features per metre
    veilStretch: 0.5, // <1 draws the structures out into vertical falls
    veilFlow: 0.4, // how fast they pour downward
    veilErode: 0.55, // how much harder the top is eaten away than the base
    veilFalloff: 1.8, // how fast it thins with height
    veilSpin: 0.02, // revolutions/second the whole curtain turns
    veilSoftFade: 0.8, // metres of soft fade where it meets geometry
    colorVeil: '#8cd2ff',
    colorVeilCrest: '#ffffff',

    /* --- what the ground does --- */
    trailFrostRate: 2.2, // rime patches laid per metre of front travel
    trailFrostRadius: 1.0, // radius of one, metres
    frostSpread: 1.5, // the rime sheet under the crown, × zoneRadius
    frostLife: 7.5, // seconds a rime patch lingers
    frostIntensity: 0.85,
    frostCrystals: 1.5, // grain of the packed snow
    frostCollar: 2.6, // rime around the foot of a blade, × its own radius
    rimeRate: 3.0, // rime patches creeping around the boundary, per second
    rimeRadius: 1.0, // radius of one, metres
    colorFrost: '#f0f9ff', // the lit face of the snow
    colorFrostEdge: '#79b6dd', // what it goes in its own shadow
    shockRadius: 7.5, // the ring that snaps out when the crown blooms, metres
    ringRate: 0.9, // pressure rings pushed out while it stands, per second
    colorShockA: '#8ee8ff', // body of the shockwave ring
    colorShockB: '#ffffff', // its crest

    /* --- mist, chips, glitter and snow --- */
    /**
     * As in every other block: a four-stop gradient sampled over the particle's
     * own lifetime, `A` at birth through `D` as it dies. The **snow** is this
     * ability's signature system — ice dust spawned *above* the crown and left
     * to fall back down through it. Everything else in the project is thrown
     * upward, and a slow fall inside the ring is what says the air over it is
     * freezing rather than burning.
     */
    mistRate: 240, // cold air pouring off the rim, particles/second
    mistSize: 1.1,
    mistSpeed: 1.6,
    mistLifetime: 3.0,
    mistOpacity: 0.055,
    mistRise: -0.12, // negative: cold air is heavy, it falls and spreads
    mistTurbulence: 0.4,
    colorMistA: '#f2feff',
    colorMistB: '#cdefff',
    colorMistC: '#8ec9e8',
    colorMistD: '#0a2c42',
    shardSize: 0.07, // ice chips
    shardSpeed: 6.5,
    shardLifetime: 1.6,
    shardGravity: -15.0,
    breachShards: 3, // chips thrown as one shard breaks the surface
    shatterShards: 5, // ... and as it comes apart
    colorShardA: '#ffffff',
    colorShardB: '#cdefff',
    colorShardC: '#8ee8ff',
    colorShardD: '#0a3c55',
    glitterRate: 150, // the sparkle lifting off the sheet
    glitterSize: 0.05,
    glitterSpeed: 2.6,
    glitterLifetime: 2.4,
    glitterRise: 1.3, // upward drift, metres/second
    glitterTurbulence: 0.6,
    glitterGlow: 1.0,
    colorGlitterA: '#ffffff',
    colorGlitterB: '#6fe0ff',
    colorGlitterC: '#bdeeff',
    colorGlitterD: '#062434',
    snowRate: 110, // ice dust falling back through the crown
    snowSize: 0.045,
    snowSpeed: 0.9, // how hard it is pushed downward to start with
    snowLifetime: 3.2,
    snowFall: -1.1, // gravity on it, metres/second²
    snowTurbulence: 0.85, // what turns the fall into a drift
    snowGlow: 0.9,
    snowInset: 0.85, // how far inside the boundary it falls, × zoneRadius
    snowHeight: 1.35, // where it starts, × the height of the wall
    colorSnowA: '#ffffff',
    colorSnowB: '#e4f9ff',
    colorSnowC: '#a7e6ff',
    colorSnowD: '#0c3348',

    /* --- dynamic light --- */
    lightIntensity: 14,
    lightRadius: 16,
    lightHeight: 0.45, // how far up the crown the light sits, 0..1
    lightColor: '#8ee8ff',

    /* --- the throw, the bloom and the hold --- */
    muzzleSize: 0.55, // the puff at the hand as the front leaves it
    muzzleIntensity: 1.5,
    castFlash: 0.08, // screen flash on release
    colorCastFlash: '#cdefff',
    burstSize: 4.0, // the vapour shell thrown off at the bloom, metres
    burstIntensity: 1.1,
    burstShards: 120, // extra chips at the bloom
    burstMist: 70,
    burstGlitter: 140,
    vapourRate: 1.6, // vapour shells shed off the wall while it stands, /s
    vapourSize: 1.4, // radius of one, metres
    vapourIntensity: 0.7,
    impactShake: 0.85,
    shakeDuration: 0.85,
    holdShake: 0.05, // continuous rumble while the crown stands
    impactFlash: 0.2,
    rumble: 0.045, // rumble while the front races out
    colorBurstA: '#a7e6ff',
    colorBurstB: '#cdefff',
    colorBurstC: '#ffffff',
    colorFlash: '#cdefff' // the full-screen flash when it blooms
  },

  /* ------------------------------------------------------------------ */
  /* Camera rig                                                          */
  /* ------------------------------------------------------------------ */
  camera: {
    distance: 11.5,
    minDistance: 3.5,
    maxDistance: 30,
    zoomSpeed: 1.0,
    zoomDamping: 0.002,
    minPolar: 0.35,
    maxPolar: 1.32,
    fov: 46,
    targetHeight: 1.35,
    damping: 0.06,
    autoFrame: 0.35, // how strongly the rig drifts toward an active cast
    bossZoom: 1.65, // × distance while a boss is on the field
    keyOrbitSpeed: 2.4, // radians/second the arrow keys swing the view
    keyPitchSpeed: 1.3 // radians/second they tip it
  },

  /* ------------------------------------------------------------------ */
  /* Environment & lighting                                              */
  /* ------------------------------------------------------------------ */
  environment: {
    // A dark cinematic stage: one cool key, a colder rim from behind, and very
    // little fill, so the ice is the brightest thing on screen and the fog can
    // swallow the floor into the backdrop.
    sunIntensity: 2.6,
    sunColor: '#e8f3ff',
    sunAzimuth: 2.95,
    sunElevation: 0.6,
    ambientIntensity: 0.14,
    ambientColor: '#8ea8d8',
    hemiIntensity: 0.36,
    hemiSkyColor: '#bdd7ff',
    hemiGroundColor: '#3a4552',
    rimIntensity: 1.1,
    rimColor: '#9ec2ff',
    rimAzimuth: 5.45,
    rimElevation: 0.35,
    envIntensity: 0.32,
    backgroundColor: '#121820',
    // Open sky (world/SkyDome.js). Off on the classic dark stage; daytime maps
    // turn it on through their time-of-day preset.
    skyEnabled: false,
    skyZenith: '#2f7fe0',
    skyHorizon: '#cfe6ff',
    skyClouds: 0.5,
    skySunSize: 1,
    // Fog is pulled well back so it only dissolves the far edge of the floor into
    // the backdrop rather than sitting on top of the action. Toggle and range are
    // both live in the editor (Environment → Backdrop, fog & dust).
    fogEnabled: true,
    fogColor: '#121820',
    fogNear: 26,
    fogFar: 135,
    shadowBias: -0.0008,
    shadowRadius: 2.2,
    floorColor: '#191f27',
    floorTint: '#232b35',
    floorRoughness: 0.88,
    floorSheen: 0.34,
    floorPool: 0.8,
    // The stone tiling that dresses the floor: ambientCG Rock030 (CC0), a rough
    // natural rock, living in public/textures/cathedral. `floorTextureScale` is metres of floor
    // one tile covers; `floorTexTint` grades the grey stone toward `floorTint` so
    // it sits inside the cool stage palette instead of fighting it.
    floorTexture: false,
    floorTextureScale: 12.0,
    floorNormalScale: 0.85,
    floorTexTint: 0.4,
    dustAmount: 0.85,
    contactShadow: 0.55
  },

  /* ------------------------------------------------------------------ */
  /* Post processing                                                     */
  /* ------------------------------------------------------------------ */
  post: {
    enabled: true,
    exposure: 1.05,
    // Threshold sits above the ice body's lit value on purpose: only the rim,
    // the glints and the impact should bloom, not the whole crystal field.
    // Strength is deliberately near zero — the crystal silhouette carries the
    // read, and bloom was the thing eating it. Push it up if you want the halo.
    bloomStrength: 0.03,
    bloomRadius: 0.6,
    bloomThreshold: 0.88,
    vignette: 0.52,
    chromaticAberration: 0.4,
    contrast: 1.12,
    saturation: 1.08,
    temperature: -0.03, // + warm / - cool
    lift: -0.008,
    gain: 1.0,
    grain: 0.045,
    // Master gain on the screen-space warp written by LAYER.DISTORTION — the
    // last link in the heat-haze chain. Screen widths, so it stays put when the
    // window resizes.
    distortion: 0.045,
    flashStrength: 1.0
  },

  /* ------------------------------------------------------------------ */
  /* Spells 7–0: built from the shared effect systems (abilities/Spell*) */
  /* ------------------------------------------------------------------ */

  /** ARC CHAIN — a bolt that leaps from the first monster it hits to the next. */
  chain: {
    range: 18.0,
    minRange: 1.5,
    speed: 90.0, // how fast the first bolt seeks its target, metres/second
    cooldown: 0.9,
    castAnim: 'cast2',
    handHeight: 1.3,
    arcLife: 0.32, // seconds one leap stays lit
    arcJitter: 0.38, // metres the bolt kinks off a straight line
    arcDensity: 12, // glowing points per metre of bolt
    colorCore: '#fffbe6',
    colorGlow: '#ffd23f',
    lightColor: '#ffe27a',
    lightIntensity: 18,
    lightRadius: 12
  },

  /** VOID ORB — a slow orb that lashes out at everything it passes, then bursts. */
  orb: {
    range: 22.0,
    minRange: 2.0,
    speed: 7.5, // the orb's drift, metres/second
    cooldown: 2.4,
    castAnim: 'cast1',
    height: 1.25, // metres above the floor
    size: 0.5, // core radius, metres
    swirl: 1.6, // trail density
    colorCore: '#fbe9ff',
    colorGlow: '#b05cff',
    colorDeep: '#3a0f6e',
    lightColor: '#c27bff',
    lightIntensity: 16,
    lightRadius: 11
  },

  /** HAILSTORM — a cloud over the target that hammers the ground for a while. */
  hail: {
    range: 20.0,
    minRange: 2.0,
    speed: 55.0,
    cooldown: 6.0,
    castAnim: 'cast3',
    zoneRadius: 5.0,
    lasts: 4.0, // seconds the storm rages
    cloudHeight: 7.5,
    stones: 120, // hailstones per second
    colorCore: '#ffffff',
    colorGlow: '#9fdcff',
    colorCloud: '#8a98b4',
    lightColor: '#bfe8ff',
    lightIntensity: 10,
    lightRadius: 14
  },

  /** BLINK STRIKE — vanish, reappear down the line, and hit everything between. */
  blink: {
    range: 12.0,
    minRange: 2.0,
    speed: 80.0, // the strike front behind you, metres/second
    cooldown: 3.5,
    castAnim: 'cast1',
    colorCore: '#eafff6',
    colorGlow: '#3dffb0',
    lightColor: '#7dffc4',
    lightIntensity: 14,
    lightRadius: 10
  },

  /* ------------------------------------------------------------------ */
  /* Barbarian skills — physical, built from the shared effect systems   */
  /* ------------------------------------------------------------------ */

  /** Weapons (left click) — only the hit colour lives here; see platform/weapon/fire.js. */
  weapon: {
    lightColor: '#ffe0a8'
  },

  /** EARTHSPLITTER — the axe hits the floor and the floor splits along the line. */
  slam: {
    range: 11.0,
    minRange: 1.0,
    speed: 38.0, // how fast the split runs
    cooldown: 1.4,
    castAnim: 'slam',
    colorDust: '#b89a78',
    colorGlow: '#ffb060',
    lightColor: '#ffb060',
    lightIntensity: 10,
    lightRadius: 8
  },

  /** RAMPAGE — a charge down the line; the body really travels. */
  rampage: {
    range: 12.0,
    minRange: 2.0,
    speed: 30.0,
    cooldown: 5.0,
    castAnim: 'charge',
    colorDust: '#a88a6a',
    colorGlow: '#ff7040',
    lightColor: '#ff8a50',
    lightIntensity: 8,
    lightRadius: 7
  },

  /** BATTLE ROAR — a shout that stuns everything around and fires you up. */
  roar: {
    range: 0,
    minRange: 0,
    speed: 40, // a self cast goes off at once
    cooldown: 12.0,
    castAnim: 'cheer',
    zoneRadius: 6.5,
    buffDamage: 25, // % more damage from everything, while it lasts
    buffSeconds: 6,
    colorGlow: '#ff4d3d',
    colorCore: '#ffd0a0',
    lightColor: '#ff5a3a',
    lightIntensity: 16,
    lightRadius: 10
  },

  /** SKYBREAKER LEAP — jump to a point and crash down on it. */
  leap: {
    range: 14.0,
    minRange: 3.0,
    speed: 20.0, // horizontal metres per second through the air
    cooldown: 2.5,
    castAnim: 'leap',
    zoneRadius: 3.8,
    height: 3.4, // top of the arc, metres
    colorDust: '#b89a78',
    colorGlow: '#ffb347',
    lightColor: '#ffb060',
    lightIntensity: 18,
    lightRadius: 10
  },

  /** IRON TEMPEST — spin with the axe out; everything near you gets hit. */
  tempest: {
    range: 0,
    minRange: 0,
    speed: 40, // a self cast goes off at once
    cooldown: 1.0,
    castAnim: 'spin',
    zoneRadius: 3.2,
    lasts: 2.6,
    colorEdge: '#eef3ff',
    colorDust: '#a8987e',
    lightColor: '#dfe8ff',
    lightIntensity: 6,
    lightRadius: 6
  },

  /** WORLDBREAKER — a far cast: the ground at the point heaves and keeps shaking. */
  quake: {
    range: 16.0,
    minRange: 4.0,
    speed: 30.0,
    cooldown: 8.0,
    castAnim: 'slam',
    zoneRadius: 6.0,
    lasts: 1.8,
    colorDust: '#9a7e60',
    colorGlow: '#ff9a40',
    lightColor: '#ff9a40',
    lightIntensity: 14,
    lightRadius: 12
  },

  /* ------------------------------------------------------------------ */
  /* Combat — what a cast actually does to something standing in it      */
  /* ------------------------------------------------------------------ */
  /**
   * One profile per ability, keyed by the same id as its VFX block above.
   *
   * The point of keeping these *here* rather than inside the ability classes is
   * that the damage has to agree with the picture: `Combat` walks a strike front
   * downrange using the ability's own `speed`, so a monster is hit on the frame
   * the fracture reaches it, not when the cast was clicked. Change `speed` in
   * the ability block and the damage timing follows on its own.
   *
   *   width   — half-width of a line strike's damage corridor, metres
   *   splash  — extra radius applied once at the end of a line strike
   *   radius  — footprint of a far cast (defaults to its `zoneRadius`)
   *   status  — what it leaves behind: chill | shock | burn | root | freeze
   *   shatter — bonus multiplier against an already-frozen target
   */
  combat: {
    enabled: true,
    playerHealth: 140,
    playerRegen: 3.5, // health per second, after `regenDelay` without a hit
    regenDelay: 4.0,
    sitRegen: 4.0, // × playerRegen while sitting — meditation, and a real risk

    reviveDelay: 3.0, // seconds downed before the caster gets back up
    hitStop: 0.05, // seconds of near-freeze on a heavy impact — the "crunch"
    critChance: 0.15,
    critMultiplier: 1.8,
    damageScale: 1.0, // master dial for balancing without touching the profiles

    ice: { damage: 30, width: 1.5, splash: 2.4, knockback: 1.5, status: 'chill', duration: 3.0 },
    thunder: { damage: 42, width: 1.2, splash: 2.8, knockback: 2.0, status: 'shock', duration: 1.1 },
    meteor: { damage: 90, width: 1.6, splash: 5.0, knockback: 8.0, status: 'burn', duration: 4.0, shatter: 2.2 },
    beam: { damage: 64, width: 2.0, splash: 1.5, knockback: 3.0, status: 'shock', duration: 0.6 },
    snare: { damage: 22, radius: 0, knockback: 0, status: 'root', duration: 3.5 },
    glacier: { damage: 74, radius: 0, knockback: 2.5, status: 'freeze', duration: 3.0 },

    // `kind` picks a strike that is not a plain line or circle (see Combat.js).
    //   chain — hits the first body in the line, then leaps `jumps` times to the
    //           nearest one within `jumpRange`, each leap × `falloff`
    //   orb   — every `tick` s, lashes the `targets` nearest bodies within
    //           `reach` of the orb; bursts for `burst` over `splash` at the end
    //   storm — lands, then hits everything in the circle every `tick` s for `lasts` s
    chain: { kind: 'chain', damage: 34, width: 1.0, knockback: 0.8, status: 'shock', duration: 0.35, jumps: 4, jumpRange: 7.5, jumpDelay: 0.09, falloff: 0.85 },
    orb: { kind: 'orb', damage: 15, knockback: 0.3, status: 'chill', duration: 1.2, reach: 4.6, tick: 0.3, targets: 2, burst: 55, splash: 3.4 },
    hail: { kind: 'storm', damage: 13, radius: 0, knockback: 0, status: 'chill', duration: 1.6, tick: 0.45, lasts: 4.0 },
    blink: { damage: 38, width: 1.4, splash: 3.2, knockback: 5.0, status: 'shock', duration: 0.5 },
    // Barbarian skills — physical: no element, just weight.
    slam: { damage: 30, width: 1.7, knockback: 1.8, status: 'shock', duration: 0.25 },
    rampage: { damage: 26, width: 1.6, knockback: 4.5, status: 'shock', duration: 0.4 },
    roar: { damage: 12, radius: 6.5, knockback: 3.5, status: 'shock', duration: 1.4 },
    leap: { damage: 48, radius: 3.8, knockback: 3.0, status: 'shock', duration: 0.5 },
    tempest: { kind: 'storm', damage: 14, radius: 3.2, knockback: 1.2, tick: 0.33, lasts: 2.6, follow: true },
    quake: { kind: 'storm', damage: 30, radius: 6, knockback: 1.5, status: 'chill', duration: 1.5, tick: 0.45, lasts: 1.8 }
  },

  /* ------------------------------------------------------------------ */
  /* Monsters                                                            */
  /* ------------------------------------------------------------------ */
  /**
   * Every monster is built from primitives at boot (see `MonsterBuilder`) and
   * animated procedurally — there is exactly one rigged FBX in this project and
   * it is the player. The kinds below differ in silhouette, palette and numbers,
   * which is enough to read them apart at a glance in the middle of a fight.
   */
  monsters: {
    enabled: true,
    maxAlive: 22, // hard ceiling regardless of what the wave asks for
    spawnRadius: 20, // where they walk in from, metres from the arena centre
    spawnTelegraph: 0.9, // seconds of portal before the body appears
    healthBars: true,
    damageNumbers: true,
    corpseFade: 1.6, // seconds a dissolving body stays on screen

    /** Multipliers applied to every kind — the balance dial. */
    healthScale: 1.0,
    damageScale: 1.0,
    speedScale: 1.0,

    kinds: {
      grunt: {
        label: 'Skeleton Minion',
        health: 46,
        speed: 3.4,
        scale: 0.78,
        attackRange: 1.9,
        attackDamage: 8,
        attackWindup: 0.42,
        attackCooldown: 1.5,
        mass: 1.0, // divides knockback
        armour: 0.0, // fraction of incoming damage shrugged off
        body: '#4a4150',
        accent: '#ff7a34',
        eye: '#ffb347',
        weight: 5 // relative spawn frequency
      },
      wisp: {
        label: 'Skeleton Mage',
        health: 58,
        speed: 3.0,
        scale: 0.9,
        attackRange: 11.0, // it never closes — it shoots
        attackDamage: 7,
        attackWindup: 0.75,
        attackCooldown: 2.4,
        mass: 0.6,
        armour: 0.0,
        body: '#332e4d',
        accent: '#a98bff',
        eye: '#d9c7ff',
        weight: 3
      },
      brute: {
        label: 'Skeleton Warrior',
        health: 210,
        speed: 2.3,
        scale: 1.25,
        attackRange: 2.6,
        attackDamage: 20,
        attackWindup: 0.8,
        attackCooldown: 2.2,
        mass: 2.4,
        armour: 0.18,
        body: '#575b68',
        accent: '#ff4d3d',
        eye: '#ff6a52',
        weight: 2
      },
      /**
       * The boss.
       *
       * Never in the random pool (`weight: 0`) — it arrives because a wave
       * called for it, and `boss: true` lets it ignore the population cap, so a
       * field already full of imps can never stop it from turning up.
       *
       * Two phases, split at `flightThreshold`: on the ground it bites and
       * sweeps its tail, and once it is hurt it takes off and does nothing but
       * breathe, which the melee half of the kit cannot answer.
       */
      dragon: {
        label: 'Emberwyrm',
        health: 2600,
        speed: 3.0,
        scale: 1.15,
        attackRange: 4.8, // the bite
        attackDamage: 34,
        attackWindup: 0.85,
        attackCooldown: 2.8,
        mass: 12.0,
        armour: 0.32,
        weight: 0, // summoned, never rolled
        boss: true,
        scales: true, // the scale field in the fragment shader
        body: '#4e3138', // dark, so the seams and the throat are what glow
        accent: '#ff7a2a',
        eye: '#ffd166',
        membrane: '#7a3038',

        /* --- phase two --- */
        flightThreshold: 0.5, // health fraction below which it takes off

        /* --- the breath --- */
        breathRange: 15.0,
        breathSpread: 0.34, // half-angle of the cone, radians
        breathWindup: 1.25, // the throat glows for this long first
        breathDuration: 2.1,
        breathDamage: 13, // per 0.3 s tick inside the cone
        breathCooldown: 5.0,

        /* --- the tail sweep --- */
        sweepRadius: 6.0,
        sweepDamage: 28,
        sweepWindup: 0.7,
        sweepCooldown: 4.2
      },

      golem: {
        label: 'Bone Colossus',
        health: 520,
        speed: 1.6,
        scale: 1.7,
        attackRange: 3.4,
        attackDamage: 30,
        attackWindup: 1.15,
        attackSplash: 4.2, // it slams the floor rather than swinging
        attackCooldown: 3.2,
        mass: 5.0,
        armour: 0.3,
        body: '#646c7e',
        accent: '#6fe8ff',
        eye: '#b6f4ff',
        weight: 1
      },
      /**
       * A rival contestant in the battle royale: a fighter like the player,
       * who shoots from range, goes after whoever is nearest (other rivals
       * too) and keeps out of the storm. Never part of a normal wave.
       */
      rival: {
        label: 'Rival',
        human: true, // a person's body (MonsterBuilder): no horns or spikes, a blaster
        health: 130,
        speed: 3.6,
        scale: 1.0,
        attackRange: 9.5, // it shoots
        attackDamage: 9,
        attackWindup: 0.5,
        attackCooldown: 1.5,
        mass: 1.2,
        armour: 0.1,
        body: '#3d4a5c',
        accent: '#ffcf4a',
        eye: '#ffe9a8',
        weight: 0
      }
    }
  },

  /* ------------------------------------------------------------------ */
  /* Battle royale (game/royale)                                         */
  /* ------------------------------------------------------------------ */
  royale: {
    /** Damage one player's hit does to another, × what it does to a monster: no one-shots. */
    pvpScale: 0.35,
    /** Damage a rival's hit does to another rival, × its attack. */
    rivalScale: 1.0,
    /** The storm: from the whole arena down to a last circle, in phases. Seconds and metres. */
    startRadius: 24,
    phases: [
      { wait: 25, shrink: 18, radius: 16, damage: 3 },
      { wait: 20, shrink: 15, radius: 10, damage: 5 },
      { wait: 15, shrink: 12, radius: 5, damage: 8 },
      { wait: 12, shrink: 10, radius: 1.5, damage: 12 }
    ],
    /** Storm damage ticks this often, seconds. */
    tick: 0.5,
    /** Items lying around at the start. */
    loot: 14,
    stormColor: '#7b5cff'
  },

  /* ------------------------------------------------------------------ */
  /* Waves                                                               */
  /* ------------------------------------------------------------------ */
  waves: {
    enabled: true,
    autoStart: true,
    breather: 6.0, // seconds between waves
    baseCount: 4, // monsters in wave 1
    growth: 1.35, // count multiplier per wave
    spawnInterval: 0.7, // seconds between arrivals inside a wave
    healthRamp: 0.09, // extra health per wave, fraction
    bossEvery: 3, // a golem leads every Nth wave
    dragonEvery: 5 // ...and every Nth wave is the Emberwyrm's
  },

  /* ------------------------------------------------------------------ */
  /* The ruins — the arena the fight happens in                          */
  /* ------------------------------------------------------------------ */
  /**
   * A dead keep drawn with instanced stone: a broken curtain wall around the
   * arena, four corner towers, arcade pillars, rubble and lit braziers. It is
   * generated from `seed`, so the same number always gives the same ruin — the
   * layout is a *fact about the level*, not something that shuffles per reload.
   */
  ruins: {
    enabled: true,
    seed: 1337,
    /* The arena in four rings, from the caster outward. */
    innerRadius: 11.0, // clear stage — nothing is ever placed inside this
    arcadeRadius: 16.5, // the ring of columns
    wallRadius: 25.0, // the curtain wall and its towers
    outerRadius: 44.0, // how far the rubble field is scattered
    wallSegments: 30,
    towers: 4,
    pillars: 16,
    rubble: 90,
    props: 20, // barrels and crates — these break
    braziers: 8,
    brazierGlow: 1.5,
    bannerSway: 0.9,
    /**
     * How much of the floor's stone maps the keep borrows. Kept low: the blocks
     * are small and mostly distant, and a sharp normal map on sub-pixel geometry
     * turns into sparkling specular that the chromatic-aberration pass then
     * splits into coloured confetti.
     */
    stoneNormal: 0.35,
    stoneColor: '#6a6e78',
    accentColor: '#ff9a4a'
  },

  /* ------------------------------------------------------------------ */
  /* The AI commander                                                    */
  /* ------------------------------------------------------------------ */
  /**
   * Chat that casts. `AIDirector` hands the model a snapshot of the battlefield
   * and a strict JSON schema; whatever comes back is validated against the same
   * ability registry the keyboard uses, so the model can never invoke something
   * that is not a real skill.
   */
  ai: {
    enabled: true,
    autoTarget: true, // resolve a fuzzy target ("the big one") to a real monster
    maxActions: 4, // per turn — a long combo would outrun the cooldowns anyway
    actionDelay: 0.55, // seconds between the casts in one plan
    temperature: 0.3,
    ignoreCooldown: false, // let the commander queue past a cooling ability
    narrate: true // print the model's one-line callout in the chat log
  }
};

/**
 * How an ability is aimed.
 *
 * `LINE` is the skillshot the sandbox started with: an arrow swung about the
 * caster, cast along its length. `ZONE` is the **far cast** — a circle with a
 * thick boundary dropped at the cursor, which answers the only question a
 * ground-targeted AoE has to answer before you commit: how much space is this
 * going to take. Both resolve to the same `cast(origin, direction, distance)`
 * event, so an ability never has to care which one aimed it; a zone ability
 * simply reads its target as `pointAt(1)` and works outward from there.
 */
export const CastShape = Object.freeze({
  LINE: 'line',
  ZONE: 'zone',
  // Goes off around the caster the moment the key is pressed — no aiming.
  SELF: 'self'
});

/**
 * Ability ids, in slot order.
 *
 * `AbilityManager`, the HUD, the aim controller and the editor all key off this
 * array, and the index is the slot the keyboard binds to — adding a third
 * ability is a new file, an entry here and a settings block above.
 */
export const ELEMENTS = ['ice', 'thunder', 'meteor', 'beam', 'snare', 'glacier', 'chain', 'orb', 'hail', 'blink', 'slam', 'rampage', 'roar', 'leap', 'tempest', 'quake'];

/**
 * Registry metadata: how an ability is presented, and how it is aimed.
 *
 * `key` must match `InputManager`. The slots are the number row: the letters
 * they used to sit on belong to movement now, and a game you walk around in
 * cannot spend WASD-adjacent keys on spells.
 *
 * `cast` is read by `AimController` to pick between the arrow and the circle;
 * omit it and the ability is a line cast.
 */
export const ELEMENT_META = {
  ice: { label: 'Frost Lance', accent: '#5fd0ff', key: '1', hint: 'Frost Lance' },
  thunder: { label: 'Storm Lance', accent: '#7fb4ff', key: '2', hint: 'Storm Lance' },
  meteor: { label: 'Cinder Fall', accent: '#ff8a3c', key: '3', hint: 'Cinder Fall' },
  beam: { label: 'Nova Beam', accent: '#7ff0ff', key: '4', hint: 'Nova Beam' },
  snare: {
    label: 'Voltaic Snare',
    accent: '#a98bff',
    key: '5',
    hint: 'Voltaic Snare',
    cast: CastShape.ZONE
  },
  glacier: {
    label: 'Glacial Crown',
    accent: '#8ee8ff',
    key: '6',
    hint: 'Glacial Crown',
    cast: CastShape.ZONE
  },
  chain: { label: 'Arc Chain', accent: '#ffd23f', key: '7', hint: 'Arc Chain' },
  orb: { label: 'Void Orb', accent: '#c27bff', key: '8', hint: 'Void Orb' },
  hail: { label: 'Hailstorm', accent: '#bfe8ff', key: '9', hint: 'Hailstorm', cast: CastShape.ZONE },
  blink: { label: 'Blink Strike', accent: '#3dffb0', key: '0', hint: 'Blink Strike' },
  // Physical skills: `physical` marks them (skill books, not tomes; Rage, not
  // cooldown alone). `rage` > 0 builds Rage per monster hit, < 0 costs it to
  // cast; `rageOnCast` is a flat gain for casting at all.
  slam: { label: 'Earthsplitter', accent: '#e0a060', hint: 'Earthsplitter', physical: true, rage: 8 },
  rampage: { label: 'Rampage', accent: '#ff7040', hint: 'Rampage', physical: true, rage: 6 },
  roar: { label: 'Battle Roar', accent: '#ff4d3d', hint: 'Battle Roar', physical: true, cast: CastShape.SELF, rageOnCast: 30 },
  leap: { label: 'Skybreaker Leap', accent: '#ffb347', hint: 'Skybreaker Leap', physical: true, cast: CastShape.ZONE, rage: -30 },
  tempest: { label: 'Iron Tempest', accent: '#d8dde6', hint: 'Iron Tempest', physical: true, cast: CastShape.SELF, rage: -40 },
  quake: { label: 'Worldbreaker', accent: '#c88a4a', hint: 'Worldbreaker', physical: true, cast: CastShape.ZONE, rage: -60 }
};

/** The spells (everything that is not a physical skill). */
export const SPELL_IDS = ELEMENTS.filter((id) => !ELEMENT_META[id]?.physical);

/** How the given ability is aimed. Line unless its metadata says otherwise. */
export function castShapeOf(element) {
  return ELEMENT_META[element]?.cast ?? CastShape.LINE;
}

/** The footprint a far cast will cover, metres. 0 for a line cast. */
export function zoneRadiusOf(element) {
  const shape = castShapeOf(element);
  return shape === CastShape.ZONE || shape === CastShape.SELF ? (settings[element]?.zoneRadius ?? 0) : 0;
}

/** Immutable snapshot used by "Reset to defaults" and the preset system. */
export const DEFAULT_SETTINGS = structuredClone(settings);

/**
 * Deep-merge a plain object into `settings` in place.
 * Existing object identity is preserved so every live binding keeps working.
 */
export function applySettings(patch, target = settings) {
  for (const key of Object.keys(patch)) {
    const value = patch[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (target[key] && typeof target[key] === 'object') applySettings(value, target[key]);
    } else if (key in target) {
      target[key] = value;
    }
  }
  return target;
}

/** Restore every value to the shipped defaults (in place). */
export function resetSettings() {
  applySettings(structuredClone(DEFAULT_SETTINGS));
}

/** Serialisable clone of the current state. */
export function snapshotSettings() {
  return structuredClone(settings);
}
