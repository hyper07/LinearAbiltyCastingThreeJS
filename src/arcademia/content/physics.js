/**
 * AI Arcademia: the Physics lab lessons, floor by floor.
 * Plain data in the format described in schema.js; every lesson passes
 * lessonProblems(). Floor 1 suits about age 6–7, floor 7 about age 12–13.
 */

export const PHYSICS_LESSONS = [
  // ───────────────────────────── Floor 1 (age 6–7) ─────────────────────────────
  {
    id: "p1-push-and-pull",
    subject: "physics",
    floor: 1,
    title: "Push and Pull",
    topic: "forces",
    topicName: "Pushes and pulls (forces)",
    blurb: "Pushes and pulls make things go, stop and turn.",
    reading: [
      { title: "Pushes and pulls", emoji: "🫸", text: "A push moves something away from you. A pull moves something toward you. Pushes and pulls are called forces." },
      { title: "Start and stop", emoji: "⚽", text: "A ball sits still until you kick it. A kick is a push! When you catch the ball, your hands push back, and it stops." },
      { title: "Faster and slower", emoji: "🛝", text: "Push a swing harder and it goes faster. A soft, fuzzy carpet rubs on a rolling toy car and slows it down." },
      { title: "Change the way", emoji: "↪️", text: "A push can change which way something goes. You do this when you kick a rolling ball over to a friend." }
    ],
    sim: {
      id: "ramp",
      setup: { surfaces: ["wood", "carpet"] },
      predict: {
        q: "The toy car rolls down the ramp. Will it stop sooner on the smooth wood or on the fuzzy carpet?",
        choices: ["On the smooth wood", "On the fuzzy carpet"],
        answer: 1,
        explain: "The fuzzy carpet rubs on the wheels and slows the car down, so it stops sooner. On the smooth wood it rolls much farther."
      }
    },
    quiz: [
      {
        q: "You open a drawer by moving it toward you. Is that a push or a pull?",
        choices: ["A push", "A pull"],
        answer: 1,
        hint: "Is the drawer coming toward you, or going away from you?",
        explain: "Moving something toward you is a pull."
      },
      {
        q: "A ball is sitting still on the grass. What can make it start to roll?",
        choices: ["Looking at it", "Saying its name", "A kick or a push"],
        answer: 2,
        hint: "Something has to touch the ball and move it.",
        explain: "Things stay still until a force, like a push or a kick, makes them move."
      },
      {
        q: "You push a toy car softly, then you push it hard. When does it go faster?",
        choices: ["When you push it hard", "When you push it softly", "It is the same both times"],
        answer: 0,
        hint: "Think about pushing a swing.",
        explain: "A bigger push makes a thing speed up more, so the car goes faster."
      },
      {
        q: "A friend rolls a ball to you. How can you stop it?",
        choices: ["Clap your hands", "Whistle at it", "Catch it with your hands"],
        answer: 2,
        hint: "To stop it, something has to push back on the ball.",
        explain: "Your hands push back on the ball. That push makes it stop."
      },
      {
        q: "Which of these is a pull?",
        choices: ["Kicking a ball", "Opening a door toward you", "Pressing a doorbell"],
        answer: 1,
        hint: "Which one brings something closer to you?",
        explain: "When you open a door toward you, you pull it. Kicking and pressing are pushes."
      }
    ]
  },
  {
    id: "p1-float-or-sink",
    subject: "physics",
    floor: 1,
    title: "Float or Sink?",
    topic: "floating",
    topicName: "Floating and sinking",
    blurb: "Splash things into the water tank. Which ones bob on top?",
    reading: [
      { title: "Float", emoji: "🦆", text: "Some things stay on top of the water. We say they float. Your rubber duck floats in the bath." },
      { title: "Sink", emoji: "🪨", text: "Some things drop down to the bottom. We say they sink. A stone sinks in a pond." },
      { title: "Big is not the answer", emoji: "🍎", text: "A big apple floats, but a tiny coin sinks! Being big does not make a thing sink. It depends on what it is made of, and its shape." },
      { title: "Boats", emoji: "⛵", text: "A huge ship is made of metal, but it floats! Its shape is like a giant bowl full of air, and that helps it float." }
    ],
    sim: {
      id: "float",
      setup: { items: ["apple", "stone", "rubber-duck", "key", "wooden-block", "coin"] },
      predict: {
        q: "Which one will float: the big apple or the small key?",
        choices: ["The big apple", "The small key"],
        answer: 0,
        explain: "The apple floats! Apples have lots of tiny pockets of air inside. The key is metal, so it sinks, even though it is small."
      }
    },
    quiz: [
      {
        q: "When something stays on top of the water, we say it…",
        choices: ["sinks", "floats", "melts"],
        answer: 1,
        hint: "Think of your rubber duck in the bath.",
        explain: "Things that stay on top of the water float."
      },
      {
        q: "What will a stone do in a pond?",
        choices: ["Sink", "Float"],
        answer: 0,
        hint: "Have you ever thrown a stone into water? Where did it go?",
        explain: "A stone sinks down to the bottom of the pond."
      },
      {
        q: "Which of these floats in the bath?",
        choices: ["A metal spoon", "A glass marble", "A rubber duck"],
        answer: 2,
        hint: "Which one is a bath toy?",
        explain: "A rubber duck floats. A metal spoon and a glass marble sink."
      },
      {
        q: "You drop an ice cube into your drink. What does it do?",
        choices: ["It floats", "It sinks to the bottom"],
        answer: 0,
        hint: "Look at a glass of juice with ice in it. Where is the ice?",
        explain: "Ice floats! That is why ice cubes bob at the top of your drink."
      },
      {
        q: "A big wooden log and a small coin go into a lake. Which one sinks?",
        choices: ["The big log", "The small coin", "They both sink"],
        answer: 1,
        hint: "Remember the apple: big does not mean it will sink.",
        explain: "The small metal coin sinks. The big wooden log floats, because wood floats."
      }
    ]
  },
  {
    id: "p1-light-and-shadow",
    subject: "physics",
    floor: 1,
    title: "Light and Shadows",
    topic: "light-shadows",
    topicName: "Light and shadows",
    blurb: "Shine a torch on a toy and make its shadow grow and shrink.",
    reading: [
      { title: "Light goes straight", emoji: "🔦", text: "Light from a torch goes out in straight lines. It cannot bend around things." },
      { title: "Making a shadow", emoji: "🧸", text: "When a toy is in the way, it blocks the light. The dark patch behind it, where the light cannot reach, is a shadow." },
      { title: "Big and small", emoji: "👐", text: "Move the torch close to your toy and its shadow grows big. Move the torch far away and the shadow gets smaller." },
      { title: "Your own shadow", emoji: "☀️", text: "On a sunny day you have a shadow too. It always points away from the sun. In the evening, when the sun is low, it gets long." }
    ],
    sim: {
      id: "shadow",
      predict: {
        q: "You move the torch closer to the teddy. What happens to its shadow?",
        choices: ["It gets bigger", "It gets smaller", "It goes away"],
        answer: 0,
        explain: "Close to the torch, the teddy blocks much more of the light, so a bigger patch is dark. Its shadow grows!"
      }
    },
    quiz: [
      {
        q: "What makes a shadow?",
        choices: ["Water on the floor", "Something blocking the light", "A loud noise"],
        answer: 1,
        hint: "A shadow is a place the light cannot reach.",
        explain: "When something is in the way of the light, it blocks it. The dark place behind it is the shadow."
      },
      {
        q: "Can you make a shadow in a room that is totally dark?",
        choices: ["Yes, a really big one", "No, you need light"],
        answer: 1,
        hint: "A shadow is made when light is blocked. Is there any light to block?",
        explain: "With no light at all, everything is dark, so there is no shadow. You need light to make one."
      },
      {
        q: "You want a really BIG shadow puppet on the wall. Where do you hold your hand?",
        choices: ["Close to the torch", "Far from the torch"],
        answer: 0,
        hint: "Remember what happened to the teddy's shadow in the lab.",
        explain: "Close to the torch, your hand blocks lots of light, so the shadow on the wall is big."
      },
      {
        q: "Which way does your shadow point on a sunny day?",
        choices: ["Toward the sun", "Straight up into the sky", "Away from the sun"],
        answer: 2,
        hint: "Your body blocks the sunlight. Where does the dark patch end up?",
        explain: "Your body blocks the sunlight, so your shadow falls on the side away from the sun."
      },
      {
        q: "Which of these makes a dark shadow?",
        choices: ["A wooden block", "A clear glass window", "The air"],
        answer: 0,
        hint: "Which one does not let any light through?",
        explain: "Wood blocks all the light, so its shadow is dark. Clear glass and air let light pass through."
      }
    ]
  },

  // ───────────────────────────── Floor 2 (age 7–8) ─────────────────────────────
  {
    id: "p2-magnets",
    subject: "physics",
    floor: 2,
    title: "Magnet Magic",
    topic: "magnets",
    topicName: "Magnets",
    blurb: "Which things will a magnet grab? Some metal ones will surprise you!",
    reading: [
      { title: "A magnet's pull", emoji: "🧲", text: "A magnet pulls on things made of iron or steel. It can even pull them without touching!" },
      { title: "Not every metal", emoji: "🥫", text: "An aluminium drink can is made of metal, but a magnet will not stick to it. Copper and gold do not stick either. Magnets pull iron and steel." },
      { title: "Two ends", emoji: "↔️", text: "Every magnet has two ends, called north and south. A north and a south pull together. Two ends that are the same push apart!" },
      { title: "Magnets at home", emoji: "🏠", text: "Magnets hold pictures on the fridge and keep some cupboard doors shut. A compass needle is a tiny magnet that points north." }
    ],
    sim: {
      id: "magnet",
      setup: { items: ["paper-clip", "iron-nail", "aluminium-can", "eraser", "wooden-block", "glass-marble"] },
      predict: {
        q: "The drink can is made of aluminium, which is a metal. Will the magnet pull it?",
        choices: ["Yes, magnets pull all metal", "No, it will not stick"],
        answer: 1,
        explain: "Aluminium is a metal, but it is not magnetic. Magnets pull iron and steel, like the paper clip and the nail."
      }
    },
    quiz: [
      {
        q: "Which one will a magnet pick up?",
        choices: ["A wooden block", "A steel paper clip", "An eraser"],
        answer: 1,
        hint: "Magnets pull iron and steel.",
        explain: "Paper clips are made of steel, so a magnet pulls them. Wood and erasers are not magnetic."
      },
      {
        q: "Which of these metals does a magnet pull?",
        choices: ["Iron", "Copper", "Aluminium"],
        answer: 0,
        hint: "Think of nails. What are they made of?",
        explain: "Magnets pull iron (and steel, which is mostly iron). Copper and aluminium are metals, but magnets do not pull them."
      },
      {
        q: "You push the north ends of two magnets toward each other. What happens?",
        choices: ["They snap together", "Nothing at all", "They push apart"],
        answer: 2,
        hint: "Are the two ends the same, or different?",
        explain: "Two ends that are the same push each other away. North and south pull together."
      },
      {
        q: "What does a compass needle do?",
        choices: ["Points north", "Points at the nearest tree", "Spins round and round forever"],
        answer: 0,
        hint: "Explorers use a compass to find their way.",
        explain: "A compass needle is a tiny magnet. The Earth acts like a giant magnet, so the needle turns to point north."
      },
      {
        q: "Can a magnet pull a paper clip through a sheet of paper?",
        choices: ["No, the paper stops it", "Yes, the pull goes through paper"],
        answer: 1,
        hint: "How do fridge magnets hold up your drawings?",
        explain: "A magnet's pull goes right through paper. That is how a fridge magnet holds up a drawing."
      }
    ]
  },
  {
    id: "p2-falling-things",
    subject: "physics",
    floor: 2,
    title: "Falling Down",
    topic: "gravity",
    topicName: "Gravity and falling",
    blurb: "Drop a ball and a feather. Who wins the race to the floor?",
    reading: [
      { title: "Gravity", emoji: "🌍", text: "When you let go of a ball, it falls down. The Earth pulls everything toward it. This pull is called gravity." },
      { title: "Always down", emoji: "🥤", text: "Gravity pulls things down, everywhere on Earth. That is why spilled juice goes down, not up, and why you land after a jump." },
      { title: "Air gets in the way", emoji: "🪶", text: "Air pushes back on falling things. A feather is light and fluffy, so the air slows it down a lot. A ball falls almost straight through." },
      { title: "A paper trick", emoji: "📄", text: "Drop a flat sheet of paper and it drifts down slowly. Scrunch the same sheet into a ball and it drops fast! The air has less to push on." }
    ],
    sim: {
      id: "drop",
      setup: { objects: ["ball", "feather"], air: "on" },
      predict: {
        q: "You drop a ball and a feather at the same time. Which one lands first?",
        choices: ["The feather", "The ball", "They land together"],
        answer: 1,
        explain: "The ball lands first. The air pushes on the wide, fluffy feather and slows it down a lot."
      }
    },
    quiz: [
      {
        q: "What do we call the pull that makes things fall down?",
        choices: ["Gravity", "Magnetism", "Wind"],
        answer: 0,
        hint: "It is the Earth's pull on everything.",
        explain: "Gravity is the Earth's pull. It makes things fall down."
      },
      {
        q: "Why does a feather fall so slowly?",
        choices: ["Feathers like to fly", "Gravity does not pull on feathers", "The air pushes back on it"],
        answer: 2,
        hint: "What was in the way in the lab?",
        explain: "Gravity pulls the feather down, but the air pushes back on it and slows it down a lot."
      },
      {
        q: "You drop a flat sheet of paper and a scrunched-up sheet at the same time. Which lands first?",
        choices: ["The flat sheet", "The scrunched-up ball"],
        answer: 1,
        hint: "Which one has less for the air to push on?",
        explain: "The scrunched-up ball lands first. It is the same paper, but the air has less to push on."
      },
      {
        q: "You jump up on a trampoline. What brings you back down?",
        choices: ["The air", "Gravity", "Your shoes"],
        answer: 1,
        hint: "It is the pull that makes everything fall.",
        explain: "Gravity pulls you back down to the trampoline after every jump."
      },
      {
        q: "You drop your spoon at lunch. Which way does it go?",
        choices: ["Down to the floor", "Up to the ceiling", "It stays in the air"],
        answer: 0,
        hint: "Which way does gravity pull?",
        explain: "Gravity pulls the spoon down, so it falls to the floor."
      }
    ]
  },
  {
    id: "p2-sounds",
    subject: "physics",
    floor: 2,
    title: "Sounds All Around",
    topic: "sound",
    topicName: "Sound",
    blurb: "Twang a ruler and make sounds go high, low, loud and soft.",
    reading: [
      { title: "Shake, shake, shake", emoji: "🥁", text: "Every sound is made by something shaking very fast. This shaking is called a vibration. Hum and touch your throat. Can you feel it buzz?" },
      { title: "Sound travels", emoji: "👂", text: "The shaking passes through the air to your ears. That is how you hear a friend call your name across the playground." },
      { title: "High and low", emoji: "🎵", text: "Fast shaking makes a high sound, like a little bird. Slow shaking makes a low sound, like a big drum. Short strings shake fast and sound high." },
      { title: "Loud and soft", emoji: "🔊", text: "Hit a drum hard and it shakes a lot, so it sounds loud. Tap it gently and it sounds soft." }
    ],
    sim: {
      id: "sound",
      predict: {
        q: "You make the part of the ruler that sticks out shorter, then pluck it. How will the note sound?",
        choices: ["Higher", "Lower", "Just the same"],
        answer: 0,
        explain: "A shorter ruler shakes faster, and faster shaking makes a higher note."
      }
    },
    quiz: [
      {
        q: "What makes every sound?",
        choices: ["Light shining", "Something shaking, called a vibration", "Things getting cold"],
        answer: 1,
        hint: "Remember humming with your hand on your throat.",
        explain: "Every sound starts with something shaking, or vibrating."
      },
      {
        q: "Which makes a higher note?",
        choices: ["A short string", "A long string"],
        answer: 0,
        hint: "Which one shakes faster?",
        explain: "A short string shakes faster, and faster shaking makes a higher note."
      },
      {
        q: "How do you make a drum sound louder?",
        choices: ["Tap it more gently", "Paint it red", "Hit it harder"],
        answer: 2,
        hint: "A loud sound needs a big shake.",
        explain: "Hitting harder makes the drum shake more, so the sound is louder."
      },
      {
        q: "A big lion roars and a tiny mouse squeaks. Which sound is lower?",
        choices: ["The lion's roar", "The mouse's squeak"],
        answer: 0,
        hint: "Big things often shake slowly.",
        explain: "The lion's roar is low. The mouse's squeak is high."
      },
      {
        q: "How does the sound of a bell get to your ears?",
        choices: ["Through a hidden wire", "The shaking travels through the air", "It does not travel at all"],
        answer: 1,
        hint: "What is all around you, between you and the bell?",
        explain: "The bell shakes the air, and the shaking travels through the air into your ears."
      }
    ]
  },

  // ───────────────────────────── Floor 3 (age 8–9) ─────────────────────────────
  {
    id: "p3-friction",
    subject: "physics",
    floor: 3,
    title: "Friction: The Grippy Force",
    topic: "friction",
    topicName: "Friction",
    blurb: "Why does a car zoom across ice but stop quickly on carpet?",
    reading: [
      { title: "What is friction?", emoji: "🧽", text: "Friction is a force that appears when two surfaces rub against each other. It always works against the movement, so it slows things down." },
      { title: "Rough and smooth", emoji: "🧊", text: "Rough, bumpy surfaces like carpet and sand make lots of friction. Smooth, slippery surfaces like ice make very little, so things slide a long way." },
      { title: "Friction makes heat", emoji: "🔥", text: "Rub your hands together fast. Can you feel them get warm? Friction turns some of the movement into heat." },
      { title: "Where you see this", emoji: "🚲", text: "Bike brakes squeeze the wheel to slow you down with friction. Shoe soles have grippy patterns so you don't slip, and people sprinkle grit on icy paths." }
    ],
    sim: {
      id: "ramp",
      setup: { surfaces: ["ice", "wood", "carpet"] },
      predict: {
        q: "The same car rolls down the same ramp onto ice, wood and carpet. On which floor will it roll the farthest?",
        choices: ["Carpet", "Wood", "Ice"],
        answer: 2,
        explain: "Ice is the smoothest, so it has the least friction to slow the car down. The car rolls farthest on ice and stops soonest on carpet."
      }
    },
    quiz: [
      {
        q: "Friction is a force that…",
        choices: ["lifts things up into the air", "slows down things that rub together", "makes things heavier"],
        answer: 1,
        hint: "What happened to the car on the carpet?",
        explain: "Friction acts between surfaces that rub, and it works against the movement."
      },
      {
        q: "Which surface has the least friction?",
        choices: ["Ice", "Sandpaper", "A doormat"],
        answer: 0,
        hint: "Which one is slippery?",
        explain: "Ice is very smooth and slippery, so it has the least friction."
      },
      {
        q: "Why do people rub their hands together on a cold day?",
        choices: ["It cleans them", "It cools the air", "Friction warms them up"],
        answer: 2,
        hint: "What does friction turn some movement into?",
        explain: "Rubbing makes friction, and friction turns some of the movement into heat."
      },
      {
        q: "How is friction useful when you ride a bike?",
        choices: ["It makes the bike lighter", "The brakes use it to slow you down", "It makes the bell ring"],
        answer: 1,
        hint: "Think about what happens when you squeeze the brake levers.",
        explain: "Brake pads rub on the wheel. That friction slows the wheel down so you can stop safely."
      }
    ]
  },
  {
    id: "p3-simple-circuits",
    subject: "physics",
    floor: 3,
    title: "Light It Up!",
    topic: "electric-circuits",
    topicName: "Electric circuits",
    blurb: "Close the loop to light a bulb. Which things let electricity through?",
    reading: [
      { title: "A complete loop", emoji: "🔋", text: "Electricity flows from a battery, through wires and a bulb, and back to the battery. This path must be a complete loop, called a circuit. Any gap and the bulb goes out." },
      { title: "Switches", emoji: "💡", text: "A switch is a gap you can open and close. When it is closed, the loop is complete and the light is on. When it is open, the electricity stops." },
      { title: "Conductors and insulators", emoji: "🧷", text: "Materials that let electricity flow are called conductors, like the metals copper, aluminium and iron. Materials that block it are insulators, like plastic, rubber, wood and paper." },
      { title: "Where you see this", emoji: "🔌", text: "A wire is copper inside a plastic coat: the copper carries the electricity and the plastic keeps fingers safe. Never poke anything into a wall socket; its electricity is strong enough to hurt you." }
    ],
    sim: {
      id: "circuit",
      setup: { items: ["copper-wire", "aluminium-foil", "paper-clip", "rubber-band", "plastic-straw", "wooden-stick"] },
      predict: {
        q: "Which of these will make the bulb light up when you use it to bridge the gap?",
        choices: ["A plastic straw", "A strip of aluminium foil", "A rubber band"],
        answer: 1,
        explain: "Aluminium foil is a metal, so it is a conductor: it completes the loop and the bulb lights. Plastic and rubber are insulators."
      }
    },
    quiz: [
      {
        q: "Why does the bulb go out when there is a gap in the circuit?",
        choices: ["The battery falls asleep", "The loop is broken, so the electricity stops flowing", "The bulb is too full of electricity"],
        answer: 1,
        hint: "Electricity needs a complete path all the way round.",
        explain: "Electricity can only flow around a complete loop. A gap breaks the loop, so the flow stops."
      },
      {
        q: "Which of these is a conductor?",
        choices: ["An iron nail", "A rubber band", "A wooden stick"],
        answer: 0,
        hint: "Conductors are usually metals.",
        explain: "Iron is a metal, so it conducts electricity. Rubber and wood are insulators."
      },
      {
        q: "Why are wires covered in plastic?",
        choices: ["Plastic makes electricity go faster", "Just to make them look nice", "Plastic is an insulator, so it keeps you safe"],
        answer: 2,
        hint: "Does plastic let electricity through?",
        explain: "Plastic is an insulator. It stops the electricity from reaching your fingers."
      },
      {
        q: "When you switch a light off, what does the switch do?",
        choices: ["Opens a gap in the loop", "Uses up the battery", "Cools the bulb down"],
        answer: 0,
        hint: "Think about what a gap does to a circuit.",
        explain: "Turning a switch off opens a gap, which breaks the circuit, so the electricity stops flowing."
      }
    ]
  },

  // ───────────────────────────── Floor 4 (age 9–10) ────────────────────────────
  {
    id: "p4-levers",
    subject: "physics",
    floor: 4,
    title: "Levers and Balance",
    topic: "levers",
    topicName: "Levers",
    blurb: "Balance the seesaw and find out why distance is a superpower.",
    reading: [
      { title: "What is a lever?", emoji: "⚖️", text: "A lever is a stiff bar that turns around a fixed point called the pivot, or fulcrum. A seesaw is a lever with its pivot in the middle." },
      { title: "Distance matters", emoji: "📏", text: "How much a weight turns a lever depends on how heavy it is AND how far it is from the pivot. A child sitting far out can balance a heavier adult sitting close in." },
      { title: "The balance rule", emoji: "🧮", text: "A seesaw balances when weight × distance is the same on both sides. A 2 kg bag 3 steps out balances a 3 kg bag 2 steps out, because 2 × 3 = 3 × 2." },
      { title: "Where you see this", emoji: "🔧", text: "Scissors, bottle openers, crowbars and wheelbarrows are all levers. Pushing far from the pivot lets a small push make a big force. The Greek thinker Archimedes is said to have boasted that a long enough lever could move the world!" }
    ],
    sim: {
      id: "lever",
      predict: {
        q: "A heavy weight sits close to the pivot on one side. Where should you put a lighter weight to balance it?",
        choices: ["Close to the pivot on the other side", "Far from the pivot on the other side", "On top of the heavy weight"],
        answer: 1,
        explain: "Distance makes up for weight. A lighter weight placed far from the pivot can balance a heavier one placed close to it."
      }
    },
    quiz: [
      {
        q: "What is the fixed point a lever turns around called?",
        choices: ["The handle", "The pivot (or fulcrum)", "The load"],
        answer: 1,
        hint: "On a seesaw, it is the part in the middle that does not move.",
        explain: "A lever turns around its pivot, also called the fulcrum."
      },
      {
        q: "A 4 kg weight sits 1 step from the pivot. Where must a 1 kg weight sit on the other side to balance it?",
        choices: ["4 steps out", "1 step out", "2 steps out"],
        answer: 0,
        hint: "Make weight × distance the same on both sides.",
        explain: "4 kg × 1 step = 4, and 1 kg × 4 steps = 4. Both sides match, so it balances."
      },
      {
        q: "You want to open a heavy door with the least effort. Where should you push?",
        choices: ["Right next to the hinges", "Far from the hinges, near the handle"],
        answer: 1,
        hint: "The hinges are the door's pivot.",
        explain: "Pushing far from the pivot gives a bigger turning effect, so the door opens more easily."
      },
      {
        q: "Which of these is a lever?",
        choices: ["A rubber ball", "A glass of water", "A bottle opener"],
        answer: 2,
        hint: "Look for a stiff bar that turns around a point.",
        explain: "A bottle opener is a bar that turns around a pivot resting on the cap, so a small push on its long handle lifts the cap off."
      }
    ]
  },
  {
    id: "p4-states-of-matter",
    subject: "physics",
    floor: 4,
    title: "Ice, Water, Steam",
    topic: "states-of-matter",
    topicName: "States of matter",
    blurb: "Turn ice into water and water into steam, and watch the thermometer.",
    reading: [
      { title: "Solid, liquid, gas", emoji: "🧊", text: "Matter comes in three main states. Solids keep their shape, like ice. Liquids flow and take the shape of their container, like water. Gases spread out to fill any space, like steam." },
      { title: "Melting and freezing", emoji: "🌡️", text: "Warm ice up and at 0 °C it melts into water. Cool water down to 0 °C and it freezes back into ice. Same stuff, different state." },
      { title: "Boiling", emoji: "♨️", text: "Keep heating and, at sea level, water boils at 100 °C, turning into an invisible gas called water vapour, or steam. The white cloud above a kettle is really tiny droplets that have cooled back into liquid." },
      { title: "Where you see this", emoji: "🏔️", text: "High up a mountain the air pressure is lower, so water boils at a lower temperature. On top of Mount Everest it boils at only about 70 °C, so cooking pasta takes much longer!" }
    ],
    sim: {
      id: "states",
      predict: {
        q: "You keep heating the water. At what temperature will it start to boil?",
        choices: ["50 °C", "100 °C", "0 °C"],
        answer: 1,
        explain: "At sea level, water boils at 100 °C and turns into steam. 0 °C is where ice melts."
      }
    },
    quiz: [
      {
        q: "At what temperature does ice melt?",
        choices: ["0 °C", "10 °C", "100 °C"],
        answer: 0,
        hint: "It is the same temperature at which water freezes.",
        explain: "Ice melts at 0 °C, the same temperature at which water freezes."
      },
      {
        q: "Which of these is a liquid?",
        choices: ["A wooden block", "Orange juice", "The air in a balloon"],
        answer: 1,
        hint: "Which one flows and takes the shape of its cup?",
        explain: "Orange juice is a liquid. Wood is a solid, and air is a gas."
      },
      {
        q: "What do we call it when a liquid turns into a solid?",
        choices: ["Melting", "Boiling", "Freezing"],
        answer: 2,
        hint: "Think of water in the freezer.",
        explain: "Freezing is when a liquid turns into a solid, like water becoming ice."
      },
      {
        q: "Why does water boil below 100 °C on top of a high mountain?",
        choices: ["It is colder up there", "The air pressure is lower", "Mountain water is dirtier"],
        answer: 1,
        hint: "Think about the air up high.",
        explain: "Up high there is less air pressing down on the water, so it can boil at a lower temperature."
      }
    ]
  },

  // ───────────────────────────── Floor 5 (age 10–11) ───────────────────────────
  {
    id: "p5-pendulums",
    subject: "physics",
    floor: 5,
    title: "The Steady Swing",
    topic: "pendulums",
    topicName: "Pendulums",
    blurb: "Change the string and the weight. What really sets a swing's rhythm?",
    reading: [
      { title: "A swinging weight", emoji: "🪀", text: "A pendulum is a weight hanging from a string or rod that swings back and forth. The time for one full swing, there and back, is called its period." },
      { title: "Length is the secret", emoji: "📏", text: "A longer string gives a slower swing with a longer period; a shorter string swings faster. Surprisingly, a heavier weight does NOT change the period, and a gentle swing takes about the same time as a wider one." },
      { title: "Galileo's discovery", emoji: "🔭", text: "Around the year 1600, the Italian scientist Galileo Galilei studied pendulums. He found that each swing takes the same time, and that the time depends on the length of the string." },
      { title: "Where you see this", emoji: "🕰️", text: "Their steady beat made pendulums the heart of clocks for centuries, starting with Christiaan Huygens's clock in 1656. A grandfather clock's pendulum is about 1 metre long, so each swing from side to side takes about one second." }
    ],
    sim: {
      id: "pendulum",
      predict: {
        q: "You swap the weight for one twice as heavy, keeping the same string. What happens to the time for one swing?",
        choices: ["It gets twice as long", "It stays the same", "It gets shorter"],
        answer: 1,
        explain: "The period depends on the string's length, not on how heavy the weight is. The heavier weight swings with exactly the same rhythm."
      }
    },
    quiz: [
      {
        q: "What changes how long a pendulum takes to swing?",
        choices: ["The length of the string", "The colour of the weight", "How heavy the weight is"],
        answer: 0,
        hint: "Remember what happened in the lab when you changed each thing.",
        explain: "Only the length changes the period. The weight and its colour make no difference."
      },
      {
        q: "You make the string shorter. The pendulum will swing…",
        choices: ["more slowly", "faster", "exactly the same"],
        answer: 1,
        hint: "Think of a short swing compared with a tall one at the park.",
        explain: "A shorter pendulum has a shorter period, so it swings back and forth faster."
      },
      {
        q: "What is the period of a pendulum?",
        choices: ["How heavy the weight is", "The length of the string", "The time for one full swing, there and back"],
        answer: 2,
        hint: "It is measured in seconds.",
        explain: "The period is the time for one complete swing, there and back again."
      },
      {
        q: "A pendulum clock is running too fast. How could you fix it?",
        choices: ["Make the pendulum a little longer", "Use a heavier weight", "Make the pendulum shorter"],
        answer: 0,
        hint: "Which change makes the swing slower?",
        explain: "A longer pendulum swings more slowly, so the clock ticks more slowly. A heavier weight would change nothing."
      }
    ]
  },
  {
    id: "p5-reflection",
    subject: "physics",
    floor: 5,
    title: "Mirror, Mirror",
    topic: "reflection",
    topicName: "Reflection of light",
    blurb: "Turn the mirror, aim the beam and hit the target.",
    reading: [
      { title: "Light bounces", emoji: "🪞", text: "When light hits a smooth, shiny surface like a mirror, it bounces off. This is called reflection. You see your face because light bounces from you, to the mirror, and into your eyes." },
      { title: "Angle in = angle out", emoji: "📐", text: "Imagine a line sticking straight out of the mirror, called the normal. The angle between the incoming beam and the normal (the angle of incidence) always equals the angle between the outgoing beam and the normal (the angle of reflection)." },
      { title: "Smooth and rough", emoji: "📄", text: "Paper reflects light too, but its surface is rough, so the light scatters in all directions. That's why you can see a page but not your face in it." },
      { title: "Where you see this", emoji: "🌕", text: "Car mirrors and periscopes use mirrors to see around corners. Apollo astronauts even left special mirrors on the Moon, and scientists still bounce lasers off them to measure how far away the Moon is." }
    ],
    sim: {
      id: "mirror",
      predict: {
        q: "A light beam hits the mirror at 30° from the normal. At what angle from the normal will it bounce off?",
        choices: ["60°", "30°", "90°"],
        answer: 1,
        explain: "The angle of reflection always equals the angle of incidence: 30° in, 30° out."
      }
    },
    quiz: [
      {
        q: "What do we call light bouncing off a surface?",
        choices: ["Refraction", "A shadow", "Reflection"],
        answer: 2,
        hint: "You see one of these when you look in a mirror.",
        explain: "Reflection is light bouncing off a surface. (Refraction is light bending as it passes into something like water or glass.)"
      },
      {
        q: "A beam hits a mirror at 50° from the normal. What is the angle of reflection?",
        choices: ["40°", "50°", "100°"],
        answer: 1,
        hint: "Angle in equals angle out.",
        explain: "The angle of reflection equals the angle of incidence, so it is 50°."
      },
      {
        q: "Why can't you see your face in a sheet of paper?",
        choices: ["Its rough surface scatters the light in every direction", "Paper lets all the light pass through", "Paper does not reflect any light at all"],
        answer: 0,
        hint: "You can see the paper, so some light must bounce off it.",
        explain: "Paper does reflect light, but its rough surface scatters it every which way, so no clear image forms."
      },
      {
        q: "Why does the Moon shine in the night sky?",
        choices: ["It makes its own light", "It reflects light from the Sun", "It is burning like a fire"],
        answer: 1,
        hint: "The Moon does not glow by itself.",
        explain: "The Moon makes no light of its own. We see sunlight bouncing off its surface."
      }
    ]
  },

  // ───────────────────────────── Floor 6 (age 11–12) ───────────────────────────
  {
    id: "p6-air-resistance",
    subject: "physics",
    floor: 6,
    title: "Hammer and Feather",
    topic: "air-resistance",
    topicName: "Gravity and air resistance",
    blurb: "A hammer and a feather race to the ground. What happens when you take the air away?",
    reading: [
      { title: "Gravity pulls on everything", emoji: "🌍", text: "Gravity pulls every object toward the centre of the Earth. With no air in the way, every falling object speeds up at the same rate, about 10 metres per second faster each second, whether it is a hammer or a feather." },
      { title: "Air resistance", emoji: "🪶", text: "A falling object has to push air out of the way, and the air pushes back. This force is called air resistance, or drag. It grows the faster you go, and it matters most for wide, light, fluffy things. That's why a feather drifts while a hammer drops." },
      { title: "Terminal velocity", emoji: "🪂", text: "As a skydiver speeds up, air resistance grows until it balances their weight. Then they stop speeding up and fall at a steady top speed, called terminal velocity. A parachute adds lots of drag, so that steady speed becomes slow and safe." },
      { title: "Where you see this", emoji: "🌕", text: "In 1971, Apollo 15 astronaut David Scott dropped a hammer and a falcon feather on the Moon, where there is gravity but no air. They hit the ground at the same moment, just as Galileo had predicted centuries before." }
    ],
    sim: {
      id: "drop",
      setup: { objects: ["hammer", "feather"], air: "toggle" },
      predict: {
        q: "The air is pumped out to make a vacuum. You drop the hammer and the feather together. What happens?",
        choices: ["The hammer lands first", "They land at the same time", "The feather floats in the air"],
        answer: 1,
        explain: "With no air there is no air resistance, so gravity speeds both up at the same rate and they land together. With the air back on, the feather is much slower."
      }
    },
    quiz: [
      {
        q: "In a vacuum (no air at all), a bowling ball and a feather are dropped together. Which lands first?",
        choices: ["The bowling ball", "The feather", "They land together"],
        answer: 2,
        hint: "Without air, what is left to slow the feather down?",
        explain: "Without air resistance, all objects fall with the same acceleration, so they land together, however heavy they are."
      },
      {
        q: "Why does a feather fall slowly on Earth?",
        choices: ["Gravity does not pull on very light things", "Air resistance is big compared with its tiny weight", "The ground pushes feathers away"],
        answer: 1,
        hint: "Gravity does pull on the feather. What else is acting on it?",
        explain: "Gravity pulls the feather down, but its wide, fluffy shape catches a lot of air resistance compared with its small weight."
      },
      {
        q: "Two identical sheets of paper, one flat and one crumpled, are dropped together in air. Which lands first?",
        choices: ["The crumpled sheet", "The flat sheet", "They land together because they weigh the same"],
        answer: 0,
        hint: "They weigh the same, so look at their shapes.",
        explain: "Same weight, but the crumpled sheet has a smaller area for the air to push on, so it has less air resistance and falls faster."
      },
      {
        q: "What does a parachute do?",
        choices: ["Makes the skydiver lighter", "Adds lots of air resistance, slowing the fall", "Switches off gravity"],
        answer: 1,
        hint: "A parachute is big and wide.",
        explain: "A parachute's huge canopy greatly increases air resistance, so the skydiver's terminal velocity becomes slow enough to land safely."
      },
      {
        q: "Is there gravity on the Moon?",
        choices: ["Yes, about one-sixth as strong as on Earth", "No, there is no gravity there", "Yes, just as strong as on Earth"],
        answer: 0,
        hint: "The hammer and feather did fall to the ground on the Moon.",
        explain: "The Moon has gravity, but it is only about one-sixth as strong as Earth's. That's why astronauts could bounce along."
      }
    ]
  },
  {
    id: "p6-speed",
    subject: "physics",
    floor: 6,
    title: "Ready, Set, Speed!",
    topic: "speed",
    topicName: "Speed, distance and time",
    blurb: "Race two carts and use speed = distance ÷ time to find the winner.",
    reading: [
      { title: "What is speed?", emoji: "🏎️", text: "Speed tells you how far something travels in a certain time: speed = distance ÷ time. If you walk 10 metres in 5 seconds, your speed is 10 ÷ 5 = 2 metres per second, written 2 m/s." },
      { title: "Turning the formula around", emoji: "🔄", text: "Distance = speed × time, so a cart moving at 3 m/s for 4 seconds goes 12 metres. Time = distance ÷ speed, so 12 metres at 3 m/s takes 4 seconds." },
      { title: "Units matter", emoji: "📐", text: "Scientists use metres per second (m/s). Road signs use kilometres per hour (km/h) or miles per hour. 1 m/s is 3.6 km/h. Always write the unit: a speed of '5' could be a snail or a rocket!" },
      { title: "Where you see this", emoji: "⚡", text: "In 2009, Usain Bolt ran 100 metres in 9.58 seconds, an average of about 10.4 m/s. Sound travels through air at about 340 m/s, and light at an amazing 300,000 kilometres every second!" }
    ],
    sim: {
      id: "race",
      predict: {
        q: "Cart A goes at 2 m/s and cart B goes at 4 m/s. Both race for 5 seconds. How far does cart B travel?",
        choices: ["10 metres", "20 metres", "9 metres"],
        answer: 1,
        explain: "Distance = speed × time = 4 m/s × 5 s = 20 metres. Cart A only goes 2 × 5 = 10 metres."
      }
    },
    quiz: [
      {
        q: "A bike travels 60 metres in 10 seconds. What is its speed?",
        choices: ["6 m/s", "50 m/s", "600 m/s"],
        answer: 0,
        hint: "Speed = distance ÷ time.",
        explain: "60 m ÷ 10 s = 6 m/s."
      },
      {
        q: "A cart moves at 5 m/s for 8 seconds. How far does it go?",
        choices: ["13 metres", "40 metres", "3 metres"],
        answer: 1,
        hint: "Distance = speed × time.",
        explain: "5 m/s × 8 s = 40 metres."
      },
      {
        q: "A runner covers 100 metres at a steady 5 m/s. How long does it take?",
        choices: ["500 seconds", "95 seconds", "20 seconds"],
        answer: 2,
        hint: "Time = distance ÷ speed.",
        explain: "100 m ÷ 5 m/s = 20 seconds."
      },
      {
        q: "Which is faster?",
        choices: ["A cyclist who rides 40 metres in 5 seconds", "A dog that runs 30 metres in 3 seconds", "They are equally fast"],
        answer: 1,
        hint: "Work out each speed in m/s, then compare.",
        explain: "The dog: 30 ÷ 3 = 10 m/s. The cyclist: 40 ÷ 5 = 8 m/s. The dog is faster, even though it went a shorter distance."
      }
    ]
  },

  // ───────────────────────────── Floor 7 (age 12–13) ───────────────────────────
  {
    id: "p7-orbits",
    subject: "physics",
    floor: 7,
    title: "Falling Around the World",
    topic: "orbits",
    topicName: "Gravity and orbits",
    blurb: "Launch a moon: too slow and it crashes, too fast and it escapes, just right and it orbits.",
    reading: [
      { title: "Gravity holds the Moon", emoji: "🌍", text: "Every object with mass pulls on every other object; that pull is gravity. Earth's gravity reaches all the way to the Moon, about 384,000 km away, and pulls on it all the time." },
      { title: "Newton's cannonball", emoji: "⛰️", text: "Isaac Newton imagined a cannon on a very tall mountain. Fire a ball faster and it lands farther away. Fire it fast enough and the Earth's surface curves away as fast as the ball falls, so it keeps falling but never lands. That's an orbit!" },
      { title: "Too slow, too fast", emoji: "🎯", text: "With too little sideways speed, gravity wins and the moon falls and crashes. At just the right speed it circles; a little faster stretches the path into an oval, called an ellipse. Fast enough, it escapes: from Earth's surface, that takes about 11 km every second." },
      { title: "Where you see this", emoji: "🛰️", text: "The International Space Station orbits about 400 km up at roughly 28,000 km/h, going round Earth about every 90 minutes. Astronauts float not because there is no gravity (up there it is still about 90% as strong) but because they and the station are falling around Earth together." }
    ],
    sim: {
      id: "orbit",
      predict: {
        q: "You launch the moon sideways much too slowly. What will happen?",
        choices: ["It falls and crashes into the planet", "It orbits in a perfect circle", "It flies off into space"],
        answer: 0,
        explain: "Without enough sideways speed, the moon can't 'miss' the planet as it falls, so gravity pulls it down until it crashes."
      }
    },
    quiz: [
      {
        q: "What keeps the Moon in orbit around the Earth?",
        choices: ["Magnetism between them", "Earth's gravity pulling it, combined with its sideways speed", "Nothing, because there is no gravity in space"],
        answer: 1,
        hint: "Two things work together: a pull, and a movement.",
        explain: "Gravity pulls the Moon toward Earth while its sideways speed carries it forward, so it keeps falling around Earth instead of into it."
      },
      {
        q: "Why do astronauts float inside the International Space Station?",
        choices: ["There is no gravity up there", "Their spacesuits are full of helium", "They and the station are falling around Earth together"],
        answer: 2,
        hint: "Gravity at the station is still about 90% as strong as on the ground.",
        explain: "Astronauts and the station fall together at the same rate, so nothing presses them against the floor and they float."
      },
      {
        q: "A space probe is launched faster than escape speed. What happens?",
        choices: ["It breaks free and travels away into space", "It falls back to the ground", "It circles Earth forever"],
        answer: 0,
        hint: "Remember what happened in the lab when you launched the moon very fast.",
        explain: "Above escape speed, gravity can slow the probe down but never pull it back, so it leaves Earth behind."
      },
      {
        q: "The space station is about 400 km up. How strong is Earth's gravity there, compared with on the ground?",
        choices: ["Zero", "About 90% as strong", "Twice as strong"],
        answer: 1,
        hint: "400 km is small compared with Earth's radius of about 6,400 km.",
        explain: "Gravity weakens with distance, but 400 km up is not very far, so it is still about 90% as strong. The station is in orbit, not out of gravity's reach."
      }
    ]
  },
  {
    id: "p7-energy",
    subject: "physics",
    floor: 7,
    title: "Energy on the Swing",
    topic: "energy",
    topicName: "Potential and kinetic energy",
    blurb: "Watch a pendulum swap stored energy for movement energy, and back again.",
    reading: [
      { title: "Stored and moving", emoji: "🔋", text: "Lift something up and it gains gravitational potential energy: energy stored because of its height. Let it go and that stored energy turns into kinetic energy, the energy of movement. Energy is measured in joules (J)." },
      { title: "The pendulum swap", emoji: "🪀", text: "At each end of its swing, a pendulum stops for an instant: all its energy is potential, none is kinetic. At the bottom it moves fastest, with the most kinetic energy. Then it climbs again, swapping kinetic back into potential." },
      { title: "Never lost, just spread out", emoji: "🔥", text: "Energy is never created or destroyed; it only changes form. A real pendulum slowly swings lower because air resistance and friction at the pivot turn a little of its energy into heat and sound on every swing." },
      { title: "Where you see this", emoji: "🎢", text: "A classic roller coaster is pulled up its first hill, storing potential energy, then rides on that energy alone. Because friction and air turn some into heat along the way, every later hill has to be lower than the first." }
    ],
    sim: {
      id: "pendulum",
      predict: {
        q: "Where in its swing will the pendulum be moving fastest?",
        choices: ["At the highest point", "At the very bottom", "Halfway up one side"],
        answer: 1,
        explain: "At the bottom, the most potential energy has turned into kinetic energy, so the weight is moving fastest there."
      }
    },
    quiz: [
      {
        q: "A ball held still, high above the ground, has mostly which type of energy?",
        choices: ["Gravitational potential energy", "Kinetic energy", "Sound energy"],
        answer: 0,
        hint: "It isn't moving yet, but it could fall.",
        explain: "The ball is not moving, so it has no kinetic energy, but its height gives it stored, gravitational potential energy."
      },
      {
        q: "At the very end of its swing, a pendulum's kinetic energy is…",
        choices: ["at its greatest", "zero, for an instant", "exactly the same as at the bottom"],
        answer: 1,
        hint: "Is the pendulum moving at that exact moment?",
        explain: "At the end of each swing the pendulum stops for an instant before turning back, so its kinetic energy is zero there."
      },
      {
        q: "Why does a real pendulum slowly stop swinging?",
        choices: ["Its energy is destroyed", "Gravity gets weaker over time", "Friction and air resistance turn some of its energy into heat"],
        answer: 2,
        hint: "Energy can't be destroyed. So where does it go?",
        explain: "The energy isn't destroyed. Friction and air resistance turn a little into heat (and sound) each swing, so less is left for swinging."
      },
      {
        q: "Why must a roller coaster's later hills be lower than its first one?",
        choices: ["So the train goes more slowly", "The train can't gain extra energy, and some is turned into heat", "Because tall hills cost too much"],
        answer: 1,
        hint: "Where does the train's energy come from, and where does some of it go?",
        explain: "All the train's energy comes from being lifted up the first hill. Some turns into heat through friction and air resistance, so it can never climb that high again."
      }
    ]
  }
];
