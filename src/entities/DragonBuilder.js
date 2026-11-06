import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  SphereGeometry,
  Vector3
} from 'three';

import { collapseJoints, glowPart, joint, part, trim } from './RigKit.js';

/**
 * The dragon.
 *
 * Everything else on the field is a silhouette you read in a tenth of a second
 * — an imp is "small and quick", a golem is "immovable". A boss has to survive
 * being *looked at*, so this one is built the way an animal is: a spine that
 * runs from nose to tail tip in twenty-odd links, four limbs with real joint
 * chains, a jaw that hinges, wings with a finger skeleton and a membrane
 * stretched between the spars, and scales that come from a distance field in
 * the fragment shader rather than a tiling texture.
 *
 * Two ideas do most of the work here:
 *
 * **Everything is a chain.** The neck, the tail and the wing fingers are arrays
 * of joints, and the animator drives them with travelling waves rather than
 * with individual poses. A wave that starts at the shoulder and arrives at the
 * tail tip a beat later is what makes a long body look like it has mass; posing
 * the segments independently gives you a caterpillar.
 *
 * **Everything is built forward along +Z.** Each segment's joint sits at its
 * *start*, the geometry runs to +Z, and the next joint hangs at the far end.
 * Chaining is then one line, bending a chain is one rotation per link, and the
 * tail is the same code as the neck with its root turned around.
 *
 * As authored this is well over two hundred pieces. `collapseJoints` bakes
 * everything rigid within each joint down to one mesh per material, which lands
 * the finished boss at a few dozen draws — for the one entity on the field that
 * has earned them.
 */

/* ------------------------------------------------------------------ */
/* proportions                                                         */
/* ------------------------------------------------------------------ */

/**
 * Every measurement, in body units. `config.scale` multiplies the lot, so the
 * proportions here are the *shape* of the animal and the scale is its size.
 */
const D = {
  hipHeight: 1.62,

  /** Torso, front to back: chest, midriff, haunch. */
  torso: [
    { length: 0.78, r0: 0.5, r1: 0.66 }, // chest — widest at the shoulders
    { length: 0.72, r0: 0.66, r1: 0.62 },
    { length: 0.7, r0: 0.62, r1: 0.5 } // haunch
  ],

  /** Neck, from the shoulders forward. Tapers hard toward the skull. */
  neck: [
    { length: 0.58, r0: 0.42, r1: 0.37 },
    { length: 0.54, r0: 0.37, r1: 0.32 },
    { length: 0.5, r0: 0.32, r1: 0.28 },
    { length: 0.44, r0: 0.28, r1: 0.24 }
  ],

  /** Tail, from the haunch back. Six links to a point. */
  tail: [
    { length: 0.72, r0: 0.46, r1: 0.39 },
    { length: 0.72, r0: 0.39, r1: 0.32 },
    { length: 0.68, r0: 0.32, r1: 0.25 },
    { length: 0.64, r0: 0.25, r1: 0.18 },
    { length: 0.58, r0: 0.18, r1: 0.12 },
    { length: 0.52, r0: 0.12, r1: 0.05 }
  ],

  head: {
    cranium: [0.44, 0.38, 0.42], // width, height, length
    snout: [0.3, 0.24, 0.52],
    jaw: [0.27, 0.13, 0.5],
    horn: { radius: 0.08, length: 0.72 },
    brow: [0.1, 0.09, 0.3],
    teeth: 7
  },

  wing: {
    arm: { length: 1.42, r0: 0.17, r1: 0.13 },
    fore: { length: 1.62, r0: 0.13, r1: 0.1 },
    hand: { length: 0.5, r0: 0.1, r1: 0.08 },
    /** Finger spars: [length, sweep from the arm axis, droop]. */
    fingers: [
      [2.55, 0.22, 0.16],
      [2.42, 0.62, 0.08],
      [2.12, 1.02, 0.02],
      [1.68, 1.42, -0.05]
    ]
  },

  /** Fore and hind limbs: upper, lower, foot. */
  legs: {
    front: { upper: 0.66, lower: 0.62, foot: 0.34, radius: 0.15 },
    back: { upper: 0.88, lower: 0.82, foot: 0.42, radius: 0.19 }
  }
};

/* ------------------------------------------------------------------ */
/* geometry                                                            */
/* ------------------------------------------------------------------ */

/**
 * Build every piece of geometry the dragon is made of.
 *
 * @param {object} config settings.monsters.kinds.dragon
 * @param {(geometry: import('three').BufferGeometry) => import('three').BufferGeometry} own
 *   hands ownership to `MonsterAssets` so it all gets disposed with the app
 */
export function buildDragonGeometry(config, own) {
  /** A tapered tube whose axis runs along +Z, starting at the origin. */
  const tube = (r0, r1, length, sides = 9) => {
    const geometry = new CylinderGeometry(r1, r0, length, sides, 1, false);
    geometry.rotateX(Math.PI / 2); // +Y becomes +Z
    geometry.translate(0, 0, length * 0.5);
    return own(geometry);
  };

  /** A flat triangular fin, pointing +Y, lying in the YZ plane. */
  const fin = (height, base, thickness = 0.05) => {
    const geometry = new ConeGeometry(base * 0.5, height, 3, 1);
    geometry.rotateY(Math.PI / 2);
    geometry.scale(thickness / (base * 0.5), 1, 1.35);
    geometry.translate(0, height * 0.5, 0);
    return own(geometry);
  };

  /** A claw / tooth: a cone pointing -Y from the origin. */
  const spike = (radius, length, sides = 5) => {
    const geometry = new ConeGeometry(radius, length, sides, 1);
    geometry.translate(0, -length * 0.5, 0);
    return own(geometry);
  };

  /** A horn: a cone pointing +Y, gently curved back along -Z. */
  const horn = (radius, length, curve = 0.35) => {
    const geometry = new ConeGeometry(radius, length, 6, 6);
    geometry.translate(0, length * 0.5, 0);
    // Bend it by displacing along its own length — a straight cone reads as a
    // spike, and a dragon's horns sweep.
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const y = position.getY(i);
      const t = Math.max(0, y / length);
      position.setZ(i, position.getZ(i) - t * t * length * curve);
      position.setY(i, y - t * t * length * 0.12);
    }
    geometry.computeVertexNormals();
    return own(geometry);
  };

  const segments = {
    torso: D.torso.map((s) => tube(s.r0, s.r1, s.length, 11)),
    neck: D.neck.map((s) => tube(s.r0, s.r1, s.length, 9)),
    tail: D.tail.map((s) => tube(s.r0, s.r1, s.length, 8))
  };

  const wing = {
    arm: tube(D.wing.arm.r0, D.wing.arm.r1, D.wing.arm.length, 7),
    fore: tube(D.wing.fore.r0, D.wing.fore.r1, D.wing.fore.length, 7),
    hand: tube(D.wing.hand.r0, D.wing.hand.r1, D.wing.hand.length, 6),
    fingers: D.wing.fingers.map((f) => tube(0.075, 0.02, f[0], 5)),
    claw: spike(0.05, 0.24, 4)
  };

  const legs = {
    frontUpper: tube(D.legs.front.radius, D.legs.front.radius * 0.85, D.legs.front.upper, 7),
    frontLower: tube(D.legs.front.radius * 0.85, D.legs.front.radius * 0.6, D.legs.front.lower, 7),
    frontFoot: own(new BoxGeometry(D.legs.front.radius * 2.1, 0.12, D.legs.front.foot)),
    backUpper: tube(D.legs.back.radius * 1.35, D.legs.back.radius * 0.9, D.legs.back.upper, 8),
    backLower: tube(D.legs.back.radius * 0.9, D.legs.back.radius * 0.62, D.legs.back.lower, 8),
    backFoot: own(new BoxGeometry(D.legs.back.radius * 2.3, 0.14, D.legs.back.foot)),
    claw: spike(0.06, 0.3, 4)
  };

  return {
    shape: 'dragon',
    dims: D,
    segments,
    wing,
    legs,

    /* --- the head --- */
    cranium: own(new BoxGeometry(...D.head.cranium)),
    snout: own(new BoxGeometry(...D.head.snout)),
    brow: own(new BoxGeometry(...D.head.brow)),
    jaw: own(new BoxGeometry(...D.head.jaw)),
    cheek: spike(0.07, 0.3, 4),
    horn: horn(D.head.horn.radius, D.head.horn.length),
    hornSmall: horn(0.05, 0.34, 0.5),
    tooth: spike(0.035, 0.13, 4),
    eye: own(new SphereGeometry(0.075, 8, 6)),
    nostril: own(new SphereGeometry(0.035, 6, 5)),
    throat: own(new SphereGeometry(0.15, 10, 8)),

    /* --- plates and fins --- */
    platetorso: fin(0.2, 0.2),
    plateNeck: fin(0.14, 0.15),
    plateTail: fin(0.16, 0.16),
    tailBlade: fin(0.6, 0.42, 0.05),
    crest: fin(0.26, 0.19, 0.04),
    bellyPlate: own(new BoxGeometry(0.44, 0.06, 0.2)),
    rib: own(new IcosahedronGeometry(0.09, 0)),

    /* --- the membranes, built to fit the spars they hang from --- */
    membraneMain: own(buildMainMembrane()),
    membraneInner: own(buildInnerMembrane())
  };
}

/**
 * The membrane between the finger spars.
 *
 * Built to the same numbers the spars are, so the skin actually meets the bones
 * — and with a scallop between each pair, which is the single detail that reads
 * as "wing" rather than "kite". Lives in the *hand* joint's space, because the
 * fingers are rigid relative to the hand: fold the wrist and the whole fan
 * folds with it, exactly as it should.
 */
function buildMainMembrane() {
  const spars = D.wing.fingers.map((f) => sparTip(f));
  const root = new Vector3(0, 0, 0);

  const positions = [];
  const normals = [];
  const uvs = [];

  const push = (a, b, c) => {
    for (const v of [a, b, c]) {
      positions.push(v.x, v.y, v.z);
      normals.push(0, 1, 0);
    }
    uvs.push(0, 0, 1, 0, 0.5, 1);
  };

  for (let i = 0; i < spars.length - 1; i++) {
    const a = spars[i];
    const b = spars[i + 1];
    // Scallop: the trailing edge dips between every pair of fingers rather than
    // running straight from tip to tip.
    const sag = new Vector3()
      .addVectors(a, b)
      .multiplyScalar(0.5)
      .multiplyScalar(0.82)
      .add(new Vector3(0, -0.12, 0));

    push(root, a, sag);
    push(root, sag, b);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * The panel from the body to the leading edge — the bit of skin between the
 * forearm and the first finger. Lives in the forearm's joint, so it stretches
 * when the elbow opens.
 */
function buildInnerMembrane() {
  const length = D.wing.fore.length;
  const tip = sparTip(D.wing.fingers[0]).multiplyScalar(0.55);

  const positions = [
    0, 0, 0,
    0, 0, length,
    tip.x * 0.4, tip.y * 0.4 - 0.25, length * 0.5,

    0, 0, length,
    tip.x, tip.y, tip.z,
    tip.x * 0.4, tip.y * 0.4 - 0.25, length * 0.5
  ];
  const uvs = [0, 0, 1, 0, 0.5, 1, 0, 0, 1, 0, 0.5, 1];

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.computeVertexNormals();
  return geometry;
}

/** Where one finger spar ends, in the hand joint's space. */
function sparTip([length, sweep, droop]) {
  return new Vector3(
    Math.sin(sweep) * length,
    droop * length,
    Math.cos(sweep) * length
  );
}

/* ------------------------------------------------------------------ */
/* assembly                                                            */
/* ------------------------------------------------------------------ */

/**
 * Put the animal together.
 *
 * Returns a template in the same shape every other creature does, plus `chains`
 * — the neck, tail and per-wing finger groups, handed back to the animator as
 * arrays so a travelling wave is one loop rather than eleven named fields.
 */
export function assembleDragon(assets, config) {
  const root = joint('root');
  const body = joint('body');
  body.position.y = D.hipHeight;
  root.add(body);

  /* ---- torso: haunch at the body origin, chest forward ---- */
  const torsoNames = [];
  let cursor = body;
  let torsoLength = 0;
  for (let i = D.torso.length - 1; i >= 0; i--) {
    const name = `torso${i}`;
    const link = joint(name);
    link.position.z = i === D.torso.length - 1 ? 0 : D.torso[i + 1].length;
    cursor.add(link);
    link.add(part(assets.segments.torso[i], 'body'));
    torsoNames.unshift(name);
    cursor = link;
    torsoLength += D.torso[i].length;
  }
  const chest = cursor;
  const haunch = body.children[0];

  /* ---- dorsal plates down the back ---- */
  for (let i = 0; i < D.torso.length; i++) {
    const link = body.getObjectByName(`j:torso${i}`);
    const count = 3;
    for (let p = 0; p < count; p++) {
      const plate = trim(
        part(assets.platetorso, 'accent', 0, D.torso[i].r1 * 0.92, (p + 0.5) * (D.torso[i].length / count))
      );
      plate.rotation.x = -0.22;
      plate.scale.setScalar(1 - i * 0.12);
      link.add(plate);
    }
    // Ribs pressing through the hide, and the pale belly plates underneath.
    for (const side of [-1, 1]) {
      for (let r = 0; r < 3; r++) {
        const rib = trim(
          part(
            assets.rib,
            'body',
            side * D.torso[i].r1 * 0.86,
            0.1,
            (r + 0.5) * (D.torso[i].length / 3)
          )
        );
        rib.scale.set(0.6, 1.5, 1.2);
        link.add(rib);
      }
    }
    for (let b = 0; b < 3; b++) {
      const belly = trim(
        part(assets.bellyPlate, 'accent', 0, -D.torso[i].r1 * 0.94, (b + 0.5) * (D.torso[i].length / 3))
      );
      belly.scale.set(D.torso[i].r1 * 1.6, 1, 1);
      link.add(belly);
    }
  }

  /* ---- neck ---- */
  const neckNames = [];
  cursor = chest;
  for (let i = 0; i < D.neck.length; i++) {
    const name = `neck${i}`;
    const link = joint(name);
    link.position.z = i === 0 ? D.torso[0].length : D.neck[i - 1].length;
    // The neck lifts as it goes, so the head rides above the shoulders.
    link.rotation.x = i === 0 ? -0.55 : -0.16;
    cursor.add(link);
    link.add(part(assets.segments.neck[i], 'body'));

    for (let p = 0; p < 2; p++) {
      const plate = trim(
        part(assets.plateNeck, 'accent', 0, D.neck[i].r1 * 0.95, (p + 0.5) * (D.neck[i].length / 2))
      );
      plate.rotation.x = -0.2;
      plate.scale.setScalar(0.95 - i * 0.1);
      link.add(plate);
    }

    neckNames.push(name);
    cursor = link;
  }

  /* ---- head ---- */
  const head = joint('head');
  head.position.z = D.neck[D.neck.length - 1].length;
  head.rotation.x = 0.45; // level the skull off after the neck's climb
  cursor.add(head);
  buildHead(head, assets);

  /* ---- tail ---- */
  const tailNames = [];
  const tailRoot = joint('tailRoot');
  tailRoot.rotation.y = Math.PI; // turn the chain around; everything else is shared
  haunch.add(tailRoot);
  cursor = tailRoot;
  for (let i = 0; i < D.tail.length; i++) {
    const name = `tail${i}`;
    const link = joint(name);
    link.position.z = i === 0 ? 0 : D.tail[i - 1].length;
    link.rotation.x = i < 2 ? 0.12 : 0.05; // droops, then levels out
    cursor.add(link);
    link.add(part(assets.segments.tail[i], 'body'));

    if (i < 5) {
      const plate = trim(part(assets.plateTail, 'accent', 0, D.tail[i].r1 * 0.9, D.tail[i].length * 0.5));
      plate.rotation.x = -0.15;
      plate.scale.setScalar(0.9 - i * 0.12);
      link.add(plate);
    }
    tailNames.push(name);
    cursor = link;
  }
  // The blade on the end: two fins crossed, so it reads from every angle.
  const blade = part(assets.tailBlade, 'accent', 0, 0, D.tail[D.tail.length - 1].length * 0.6);
  blade.rotation.x = -0.15;
  cursor.add(blade);
  const bladeFlat = trim(part(assets.tailBlade, 'accent', 0, 0, D.tail[D.tail.length - 1].length * 0.6));
  bladeFlat.rotation.set(-0.15, 0, Math.PI / 2);
  bladeFlat.scale.setScalar(0.7);
  cursor.add(bladeFlat);

  /* ---- wings ---- */
  const wingChains = {};
  for (const side of [-1, 1]) {
    const tag = side < 0 ? 'L' : 'R';
    const shoulder = joint(`wing${tag}Arm`);
    shoulder.position.set(side * D.torso[0].r1 * 0.82, D.torso[0].r1 * 0.55, D.torso[0].length * 0.35);
    chest.add(shoulder);
    buildWing(shoulder, assets, side, tag, wingChains);
  }

  /* ---- legs ---- */
  const legNames = [];
  for (const side of [-1, 1]) {
    const tag = side < 0 ? 'L' : 'R';
    legNames.push(
      buildLeg(chest, assets, side, `front${tag}`, D.legs.front, {
        x: side * D.torso[0].r1 * 0.78,
        y: -D.torso[0].r1 * 0.55,
        z: D.torso[0].length * 0.55,
        splay: 0.2
      })
    );
    legNames.push(
      buildLeg(haunch, assets, side, `back${tag}`, D.legs.back, {
        x: side * D.torso[2].r0 * 0.8,
        y: -D.torso[2].r0 * 0.45,
        z: D.torso[2].length * 0.3,
        splay: 0.3
      })
    );
  }

  const jointNames = [
    'root',
    'body',
    'head',
    'jaw',
    'throat',
    'tailRoot',
    ...torsoNames,
    ...neckNames,
    ...tailNames,
    ...legNames.flat(),
    ...Object.values(wingChains).flat()
  ];

  const wingspan =
    2 * (D.wing.arm.length + D.wing.fore.length + D.wing.hand.length + D.wing.fingers[0][0] * 0.7);

  return {
    root: collapseJoints(root),
    jointNames,
    chains: {
      neck: neckNames,
      tail: tailNames,
      torso: torsoNames,
      ...wingChains
    },
    /** Roughly the middle of the ribcage — what abilities hit. */
    centreHeight: D.hipHeight,
    barHeight: D.hipHeight + 1.5,
    footHeight: 0,
    wingspan,
    bodyLength: torsoLength
  };
}

/* ------------------------------------------------------------------ */

/** Skull, jaw, horns, teeth, eyes — the part that has to survive a close-up. */
function buildHead(head, assets) {
  const h = D.head;

  head.add(part(assets.cranium, 'body', 0, 0, h.cranium[2] * 0.5));
  const snout = part(assets.snout, 'body', 0, -0.04, h.cranium[2] + h.snout[2] * 0.42);
  snout.rotation.x = 0.06;
  head.add(snout);

  // Brow ridges: two wedges over the eyes. They do more for the face than the
  // eyes themselves, because they are what makes it *scowl*.
  for (const side of [-1, 1]) {
    const brow = trim(part(assets.brow, 'accent', side * 0.16, h.cranium[1] * 0.42, h.cranium[2] * 0.72));
    brow.rotation.set(-0.18, side * 0.12, side * 0.22);
    head.add(brow);

    head.add(glowPart(assets.eye, side * 0.19, h.cranium[1] * 0.16, h.cranium[2] * 0.85));

    // Nostrils, at the very end of the snout.
    const nostril = trim(
      part(assets.nostril, 'body', side * 0.08, 0.04, h.cranium[2] + h.snout[2] * 0.85)
    );
    head.add(nostril);

    // The big swept horns, and a smaller pair behind them.
    const bigHorn = part(assets.horn, 'accent', side * 0.2, h.cranium[1] * 0.45, h.cranium[2] * 0.1);
    bigHorn.rotation.set(-0.5, 0, side * -0.42);
    head.add(bigHorn);

    const smallHorn = trim(
      part(assets.hornSmall, 'accent', side * 0.24, h.cranium[1] * 0.3, -h.cranium[2] * 0.12)
    );
    smallHorn.rotation.set(-0.75, 0, side * -0.72);
    head.add(smallHorn);

    // Cheek spikes, angled back along the jawline.
    const cheek = trim(part(assets.cheek, 'accent', side * 0.24, -0.06, h.cranium[2] * 0.35));
    cheek.rotation.set(2.5, 0, side * -1.1);
    head.add(cheek);

    // Upper teeth, hanging from the snout.
    for (let t = 0; t < h.teeth; t++) {
      const along = h.cranium[2] * 0.75 + (t / h.teeth) * h.snout[2] * 1.05;
      const tooth = trim(
        part(assets.tooth, 'accent', side * (h.snout[0] * 0.44), -h.snout[1] * 0.52, along)
      );
      tooth.scale.setScalar(1.15 - t * 0.1);
      head.add(tooth);
    }
  }

  // A crest of fins running back off the skull.
  for (let i = 0; i < 5; i++) {
    const t = (i / 4 - 0.5) * 2;
    const crest = trim(part(assets.crest, 'accent', t * 0.15, h.cranium[1] * 0.4, -h.cranium[2] * 0.28));
    crest.rotation.set(-1.05, 0, t * 0.55);
    crest.scale.setScalar(1 - Math.abs(t) * 0.4);
    head.add(crest);
  }

  /* ---- the jaw, and the fire behind it ---- */
  const jaw = joint('jaw');
  jaw.position.set(0, -h.cranium[1] * 0.42, h.cranium[2] * 0.5);
  head.add(jaw);

  jaw.add(part(assets.jaw, 'body', 0, -h.jaw[1] * 0.5, h.jaw[2] * 0.42));
  for (const side of [-1, 1]) {
    for (let t = 0; t < h.teeth - 1; t++) {
      const tooth = trim(
        part(assets.tooth, 'accent', side * (h.jaw[0] * 0.44), -h.jaw[1] * 0.1, 0.1 + (t / h.teeth) * h.jaw[2])
      );
      tooth.rotation.x = Math.PI; // point up
      tooth.scale.setScalar(0.95 - t * 0.08);
      jaw.add(tooth);
    }
  }

  // The furnace. Scaled by the charge, so a wind-up is visible *inside* the
  // mouth before a single particle leaves it.
  const throat = joint('throat');
  throat.position.set(0, -h.cranium[1] * 0.2, h.cranium[2] * 0.75);
  throat.scale.setScalar(0.001);
  head.add(throat);
  throat.add(glowPart(assets.throat));
}

/** One wing: three bones, four finger spars and the skin between them. */
function buildWing(shoulder, assets, side, tag, chains) {
  const w = D.wing;

  shoulder.add(part(assets.wing.arm, 'body'));
  // The inner panel of skin, from the body out to the leading edge.
  const innerSkin = trim(part(assets.membraneInner, 'membrane'));
  innerSkin.scale.x = side;
  shoulder.add(innerSkin);

  // Rest pose is the wing *spread*: the chain runs along +Z, so a quarter turn
  // about Y aims it out to the side. Order ZYX matters — the flap is a roll in
  // the *parent's* frame applied after the sweep, and with the default XYZ it
  // would be applied before, tilting the wing in the wrong plane entirely.
  shoulder.rotation.order = 'ZYX';
  shoulder.rotation.y = side * Math.PI * 0.5;

  const fore = joint(`wing${tag}Fore`);
  fore.rotation.order = 'ZYX';
  fore.position.z = w.arm.length;
  shoulder.add(fore);
  fore.add(part(assets.wing.fore, 'body'));

  const hand = joint(`wing${tag}Hand`);
  hand.rotation.order = 'ZYX';
  hand.position.z = w.fore.length;
  fore.add(hand);
  hand.add(part(assets.wing.hand, 'body'));

  // The finger fan. Rigid relative to the hand, so it merges into one mesh and
  // folds as a unit when the wrist closes.
  for (let f = 0; f < w.fingers.length; f++) {
    const [length, sweep, droop] = w.fingers[f];
    const finger = trim(part(assets.wing.fingers[f], 'body', 0, 0, w.hand.length));
    finger.rotation.y = side * -sweep;
    finger.rotation.x = -droop;
    hand.add(finger);
  }

  // The main membrane, built to those same spar tips.
  const skin = part(assets.membraneMain, 'membrane', 0, 0, w.hand.length);
  skin.scale.x = side;
  // It *does* cast: without it the wing's shadow is four spars and nothing
  // between them, which reads as a broken umbrella rather than a wing.
  hand.add(skin);

  // The thumb claw at the wrist — the hook a dragon walks on.
  const claw = trim(part(assets.wing.claw, 'accent', 0, 0, w.hand.length * 0.4));
  claw.rotation.set(-2.4, 0, side * 0.4);
  hand.add(claw);

  chains[`wing${tag}`] = [`wing${tag}Arm`, `wing${tag}Fore`, `wing${tag}Hand`];
}

/** One limb: upper, lower, foot, claws. Returns its joint names. */
function buildLeg(parent, assets, side, name, dims, placement) {
  const upperGeometry = name.startsWith('front') ? assets.legs.frontUpper : assets.legs.backUpper;
  const lowerGeometry = name.startsWith('front') ? assets.legs.frontLower : assets.legs.backLower;
  const footGeometry = name.startsWith('front') ? assets.legs.frontFoot : assets.legs.backFoot;

  const hip = joint(`${name}Hip`);
  hip.position.set(placement.x, placement.y, placement.z);
  // Chains run along +Z, so a leg is that chain turned to point at the floor.
  // Order ZYX again: X aims it down, then Z splays it outward. Under the
  // default order the splay would be applied while the limb still pointed
  // forward, and would come out as a twist about its own length instead.
  hip.rotation.order = 'ZYX';
  hip.rotation.set(Math.PI / 2, 0, side * placement.splay);
  parent.add(hip);
  hip.add(part(upperGeometry, 'body'));

  const knee = joint(`${name}Knee`);
  knee.position.z = dims.upper;
  // Digitigrade: the hock kicks back, which is what makes the stance look like
  // an animal's rather than a person in a costume.
  knee.rotation.x = name.startsWith('back') ? -0.85 : -0.35;
  hip.add(knee);
  knee.add(part(lowerGeometry, 'body'));

  const ankle = joint(`${name}Foot`);
  ankle.position.z = dims.lower;
  ankle.rotation.x = name.startsWith('back') ? 0.85 : 0.35;
  knee.add(ankle);

  const foot = part(footGeometry, 'body', 0, 0, dims.foot * 0.4);
  foot.rotation.x = -Math.PI / 2;
  ankle.add(foot);

  for (let c = -1; c <= 1; c++) {
    const claw = trim(part(assets.legs.claw, 'accent', c * dims.radius * 0.75, 0, dims.foot * 0.85));
    claw.rotation.set(-1.9, c * 0.24, 0);
    ankle.add(claw);
  }

  return [`${name}Hip`, `${name}Knee`, `${name}Foot`];
}
