# Movement

[← Back to the README](../README.md)

## Moving

The abilities sit on the number row and the letters belong to movement: **WASD**
to run, **Shift** to sprint, **Alt** to drop to a walk, **Space** to jump, **C**
to sit. The **arrow keys**
(or **Q**/**E**) turn and tilt the view, so you can swing the camera around while
running without letting go of the mouse; right-drag still orbits.

Movement is expressed in the camera's frame and rotated into the world, so W is
"away from me" however the view has been turned — the only mapping that survives
a camera the player controls. That also means the camera's azimuth has to be
something *only the player* changes: `OrbitControls` re-derives its angle from
wherever the camera is each frame, so moving the follow-target without moving the
camera tilts the offset between them and the orbit slowly drifts. Left alone,
that quietly rotates what "forward" means and holding W curves you into a circle.
`CameraRig` carries the camera along with its target by the same delta, which
keeps the offset exactly invariant.

Aiming outranks running. With a cast armed the body faces the arrow and you
strafe around your target; with nothing armed it turns to face where it is going.

### Authored clips first

The class characters (KayKit models) carry their own motion clips, and the game plays them: idle,
walk and run blended by ground speed, and — because aiming turns the body toward the target, so you
often move sideways or away from where you face — the moving share split by direction:
**forward** plays walk or run, **backward** plays walking backwards, **sideways** plays the left or
right strafe, each sped up or slowed to match the ground. Jumping blends to the in-air pose
(`animation/LocomotionPlayback.js`, clips named in `platform/motion/datasets.js`). New players start
as the Mage for this reason.

The coded gait below is what the original caster (an FBX character with no walk or run clips) and
any model without clips falls back to.

### The coded gait

**There is no walk clip.** The character ships with an idle loop and three cast
throws, and that is the entire animation budget. So `animation/Locomotion.js`
does not play animation — it **poses bones on top of** whatever the mixer just
wrote. `CharacterController.update` runs `mixer.update(dt)` and then calls
`applyPose`, which composes a gait over the idle the mixer left behind. The idle
keeps breathing underneath, and blending the walk away is one number going to
zero rather than a clip crossfade.

The thing that makes it read as running rather than sliding is that **the foot's
position is what gets driven, and the joint angles are solved from it.** Through
stance a planted foot has to travel backward relative to the body at exactly the
body's speed, so that is what the leg is given — a linear sweep, which is what an
inverted pendulum does — and the hip angle comes out of a one-line inverse
kinematic solve (a two-segment leg with a knee angle κ behaves as a single strut
of length `L·cos(κ/2)` pointing along `hip + κ/2`, so the hip is one arcsine).

Driving the hip directly instead fails twice over, and both failures were
measured rather than guessed:

- A **sine-shaped hip** matches the body's speed at one instant per step. The
  foot was planted for 21% of the cycle and skating either side of it.
- Even a **linear hip sweep** skates once the knee moves, because a bending knee
  shortens the leg and drags the foot with it. A sprint measured the foot
  dragging backward at 7 m/s.

Three more things fall out of the same principle:

- **The phase advances by distance travelled, never by time.** Feet that cycle
  on a clock skate whenever the body is slowed, shoved or accelerating.
- **Cadence is the parameter and stride falls out of it**, not the other way
  round. People barely vary cadence — roughly two steps a second walking, four
  and a bit flat out — and cover ground by lengthening the step. Fixing the
  stride instead means a faster body just cycles the same short steps quicker;
  an earlier pass ran at 4 m/s on 4.2 steps a second where a real runner uses
  about 2.9, and it read exactly as you would expect: a scurry.
- **The body's vertical is not a bob, it is forced.** A straight leg is a chord:
  standing on a leg swung out to ±A puts the hips `L(1 − cos A)` lower than
  standing on a vertical one. So the height is read straight off whichever leg is
  carrying the weight, shortened by however much that knee has given. The walk's
  vault over a straight stance leg and the run's dip into a bent one both fall
  out of that for free, instead of being two curves to author and blend — and
  the feet can stay on the floor for the whole of stance, which is the other
  half of not skating.
- **A walk and a run are different gaits, not one gait at two speeds.** The
  `stanceWalk` / `stanceRun` duty cycle is what separates them: a walk keeps a
  foot down for 62% of the cycle (there is a moment with both down), a sprint for
  38% and spends the rest airborne, arcing over the gap. The three gears do not
  *set* a gait — they set a speed, and the gait is read off it, so accelerating
  out of a walk blends into a run rather than switching a state.

A run also does not reach symmetrically. `strideBias` lands the foot closer under
the body than it ends up behind, which is both what runners do and what stops the
hips having to sink to meet a far-forward contact; `ankleExtend` lengthens the leg
at push-off, because rising onto the ball of the foot is real reach; and `maxDrop`
caps the sink, because at the extremes of a long stride the chord model asks for
more than any runner gives. It is wrong there for a specific reason — the *contact
point* migrates, from heel to toe — so letting the foot ride a little high beats
pumping the whole body a third of a metre every step.

### The body is not a pogo stick

A rigid leg is a chord, so reaching out to ±A sinks the hips by `L(1 − cos A)` —
which for this rig's step length is **17 cm**. A person's head moves about five
walking. Seventeen centimetres a step is a pogo stick, and it is most of what
made an earlier pass read as a limp.

Nobody has to bounce like that because the leg does not stay one length: the
ankle plantarflexes at push-off, the knee finishes extending, the pelvis lists
and rotates, and the centre of mass is not the hip joint. Modelling each of those
is not worth it; modelling their *sum* is. `legExtend` drops the foot's contact
point below the ankle toward the ends of the stroke, and `dropWalk` / `dropRun`
cap what is left.

That term belongs to the body's **height** and not to the IK solve, which is a
distinction worth stating because getting it wrong looks equivalent and is not.
Adding it to `effective` before solving for the hip puts the *ankle* short of its
target — the thigh and shin cannot actually get any longer — and the foot skates.
Measured, that mistake cut the planted fraction of a walk from 47% to 24%.

### The upper body has to participate

Legs alone are a shuffle. Three things were missing and all three are worth more
than they cost:

- **The arms are placed, not nudged.** Same reason as the legs, but blunter: this
  idle is a *casting* stance with the arms up and forward, so adding a swing to it
  leaves the upper body visibly inert while the legs work. `_aimTo` is the
  two-axis version of `_aim` — it corrects sideways placement as well as swing,
  which matters because correcting only the fore-aft angle leaves the arms splayed
  like a scarecrow's. Elbows close toward a right angle as the pace picks up. The
  whole thing fades out while a cast clip is playing, because that clip is doing
  something deliberate with the arms and it outranks a gait.
- **The phase was wrong.** `u = 0` is the left heel strike, so the left leg is at
  its most *forward* there — everything that swings opposite it peaks at `u = 0`
  and wants a **cosine**. An earlier pass had the arms on `sin`, putting their
  extremes at u ≈ 0.31: a third of a cycle out of step with the legs, which is
  about as wrong as arm swing can be while still moving.
- **The pelvis travels sideways** over whichever foot is carrying the weight — a
  couple of centimetres at a run, twice that at a walk. It is the smallest number
  here and it does the most: without it the body runs on rails, and every other
  cue is arguing with a torso that never commits to a foot.

The two halves of the torso also have to disagree — the pelvis turns *with* the
forward leg, the shoulders turn *against* it and by more, and the chest
counter-pitches against the stride so the torso does not ride along as one block.

Nothing is symmetric, either, because bodies are not. The amplitudes come from
gait references rather than instinct, and they are smaller than instinct says: a
walking arm swings about 22° behind and only 8° in front (an earlier pass swung
±39° at a *walk* — twice what a strolling human does), while a sprinting arm
pumps nearly symmetrically, hand from hip to chin. The elbow *works* through the
stroke — closing toward 60–70° included at the top of the forward swing, opening
past 130° driving back — because an elbow held at one angle is a hinge, not a
joint. The knee folds hard just after toe-off rather than at mid-swing, is
straightening again well before the foot lands — and at a run it *never* fully
straightens: biomechanics puts 20–40° of flexion in it even at contact
(`kneeContact`), and a leg that snaps straight at heel strike is a walking leg
whatever the speed. And a running stance reaches further behind the body than in
front of it (`strideBias`), which is both what runners do and what stops the hips
having to sink to meet a far-forward contact.

### The lean comes from the ankles

Runners lean forward — about 8° at a jog, low twenties flat out, and the
coaching literature is emphatic about *where from*: the ankles, one straight
tilted line, ribs stacked over the pelvis. An earlier pass put the whole lean on
the spine, which is the classic "hunched" form fault — and because the pelvis
stayed vertical, the legs hid it entirely and the run read as an upright
speed-walk. Now half the lean goes on the **Hips** (the whole skeleton pitches,
and the legs — aimed at absolute angles afterwards — stay planted), with the
rest spread up the spine so the chest leads slightly.

The head is *partly* stabilized. A real head counter-rotates to keep the gaze
level, but cancelling the whole lean (an earlier pass took back 80% of it)
leaves the silhouette bolt upright. Half stays in, so the head visibly commits
to the run and the eyes still mostly find the horizon.

Lean also comes from *acceleration*, not just speed — tipped into a start, back
against a stop, banked a little into a turn (`accelLean`, one smoothed rule from
David Rosen's Overgrowth GDC talk: tilt toward the acceleration vector). It is
what makes starting and stopping look like they cost something.

### The hands had to stop casting

This rig has no finger bones — the spread, palm-open casting hand is baked into
the skin — and it was the single loudest tell left: every forward arm swing read
as a push, every neutral frame as presenting. The one joint that exists is the
wrist, so the wrist does all the acting (`handRoll`, `handCurl`): rolled about
the forearm's own axis so the palm turns in toward the body, flexed a little so
the fingers trail rather than present.

### The hands were spinning

The wrist styling above was, for a while, the single worst thing in the file —
and not because the angles were wrong.

Everything here is composed *over* whatever the mixer wrote, which quietly
relies on the mixer having written something. `mixer.update` restores an
animated bone to the clip's value every frame, so last frame's delta is gone
before this frame's is applied. **A bone no clip mentions is never restored**,
and a delta applied to it compounds instead. This rig's idle has 21 tracks and
not one of them is a hand:

```
drivenButNotAnimated: [ "LeftHand", "RightHand", "LeftToe_End", "RightToe_End" ]
```

So a constant wrist roll became a few thousand degrees a second of spin. Measured
across a cycle, the hand's roll had a spread of ~178° with a phase coherence of
0.02–0.48 — that is, no repeatable relationship to the gait at all; it was simply
tumbling. After resetting the hand to its rest pose before posing it, the same
measurement reads 9–26° at coherence **1.00**.

Two lessons worth keeping. Absolute posing — `_aim`, `_aimTo` — is immune,
because it measures where the limb actually is and corrects the difference; only
raw `_rotate` deltas can compound, which is why `setAnimatedBones` exists and
why it is asked once, at load, rather than assumed. And every hand angle tuned
before this was fitted to a tumbling bone: they were noise, and they were
re-derived from scratch afterwards.

### Three things the arms were doing that nobody wrote

- **A kink twice a cycle.** An arm drives further back than it reaches forward,
  and the obvious way to say so — scale the swing only where it is negative —
  puts a first-derivative discontinuity in the target the instant the arm passes
  vertical. The elbow reads the same number and kinks with it; nothing
  downstream smooths it. The same two extremes come out of an affine remap of
  the cosine (`phase·(1+r)/2 + (1−r)/2`), which has no kink anywhere.
- **The shoulder moved after the arm.** It was rotated *after* both arm aims,
  and it is the arm's parent — so it carried the arm off the absolute direction
  it had just been aimed at, every frame. The torso already obeyed this rule;
  the girdle did not.
- **The elbow barely worked.** Modulated by a quarter and bent through the whole
  stroke, it pinned the hand in front of the chest: the arm swung, but the hand
  never went near behind the body. Opening it at the back is what turns a swing
  into a drive — measured, the hand's fore-aft travel went from a
  forward-biased 0.61 m to 0.67 m biased *backward*.

### The phase was derived, not integrated

`_phase()` was `distance / strideLength`. That looks equivalent to integrating
and is not: stride length is a live function of speed, so changing gear silently
rescaled the entire accumulated odometer. The error grows with distance — after
40 m, breaking from a jog into a sprint teleported the legs 0.19 of a cycle in
one frame. The phase is now advanced by the fraction of *this* stride covered
this frame, so a change of stride only affects what happens next; the same
measurement now reads 0.021, which is just the normal per-frame advance.

One thing that is *not* worth its accuracy: the sideways weight shift is a
translation of the whole body, so it drags the planted foot with it. Kept to a
couple of centimetres — which is all a real centre of mass moves anyway.

Rotations are applied about a **world** axis — the body's own right and forward —
never about a bone's local axes. Mixamo bind poses are not axis aligned (the
shoulder in particular is rolled), and posing in local space gives you limbs that
swing diagonally through the torso.

### Absolute, not additive

Everything above composes *over* the idle, which is right for a lean or a spine
twist. The legs are the exception, and they have to be, because **this idle is a
bladed combat stance**: it holds the left foot 27 cm forward and the right 28 cm
back, and turns the pelvis 48° off square so the hip sockets themselves are
staggered by 14 cm.

Lay a symmetric swing over that and each leg oscillates about its own offset
centre. The left foot spends nearly the whole cycle in front of the right — they
barely pass — and the walk comes out as a shuffle where one leg leads and the
other is dragged after it. Measured, the left-minus-right foot offset ran from
−0.44 m to **+1.37 m**: a limp, not a walk.

So the legs are *aimed* rather than nudged. `_aim` measures where a segment
actually points — from its own position to its child's — and applies only the
difference from the target, which cancels whatever stance the idle was holding.
`_squarePelvis` does the same for the hips: it measures the angle of the line
between the sockets and turns the pelvis until it is square to the heading. Only
the sagittal component is corrected, so the rig keeps its own stance width and
toe-out.

That sign was worth checking by measurement rather than by argument. Backwards,
`_squarePelvis` did not merely fail to square the pelvis — `Hips` is the root of
the skeleton, so it swung the entire body 84° off its heading while it ran.

Measured on open floor, after:

| gear | speed | cadence | stride | duty | foot planted | slowest foot |
|---|---|---|---|---|---|---|
| walk (Alt) | 1.8 m/s | 2.35 /s | 1.57 m | 0.62 | 69% | 0.10 m/s |
| run | 4.0 m/s | 3.75 /s | 2.13 m | 0.42 | 41% | 0.20 m/s |
| sprint (Shift) | 7.2 m/s | 4.55 /s | 3.17 m | 0.31 | 34% | 0.22 m/s |

The planted fraction is the thing to read: it now matches each gear's duty cycle
almost exactly, which is what "the feet do not skate" means numerically. It was
not always so — the walk sat at 26% against a 62% duty, because `gait` fades the
overlay in *and* scales the step excursion, and against the jog's speed it only
ever reached 0.84. A walk is a whole gait, not a faint one; anything short of 1
means the feet do not travel as far as the body does, and they skid by exactly
the shortfall.

The legs are genuinely symmetric, too: the left-minus-right foot offset runs
−0.878 m to **+0.887 m** and the hip-socket bias sits at 0.002 m.

Cadence and the duty cycle are both driven by an exponential approach from
walking pace (`gaitDecay`) rather than by the posture blend, because neither is
linear in speed — a body covers extra ground by lengthening its step, not by
taking more of them. Hanging cadence off the posture blend instead put the jog
at 3.9 steps a second, where a real runner at that speed uses about three.

Sitting is a real decision rather than a pose: it heals several times faster and
starts sooner, and it costs you every bit of your mobility while a wave walks
toward you. Any movement key stands you up, and so does casting.

The body collides with the keep — walls, towers, columns, braziers and unbroken
props — by position, not by velocity: it cannot tunnel, it cannot accumulate
energy, and sliding along a wall falls out of it for free because only the
penetrating component is removed.
