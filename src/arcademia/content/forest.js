/**
 * The Great Tree's lessons (the forest realm, maps.js): seven rings of the tree, each with its
 * own three subjects (content/subjects.js REALM_SUBJECTS.forest), taught in the same three
 * buildings as before:
 *
 *   slot 1  Logic & Patterns  (logic)    Nutmeg the squirrel, the Seed Pod (Pattern Pod) School
 *   slot 2  Earth & Weather   (earth)    Grandpa Bramble the bear, the (Weather) Root Hall
 *   slot 3  Biology           (biology)  Dr. Ribbit the frog, the Nature Lab
 *
 * Every lesson has realm: 'forest'; its floor is its ring (1–7, ages 6–7 … 12–13), and its stars
 * open the tree's rings, never the mountain's floors or another world's. Logic is the tree's woven
 * math — sorting, patterns, data, chance, symmetry and reasoning, not arithmetic drills — so its
 * checks are written questions. The Great Tree's signature game is `sort` (content/games.js);
 * the lessons mix in maps, digs, guides to chat with, timelines, treasures and experiments.
 * The forest teaches these once LIVE.forest is on (content/subjects.js).
 */

/*
 * Rings: 1 Root Hollow 🍄, 2 Fern Boughs 🌿, 3 Lantern Branches 🏮,
 * 4 Blossom Canopy 🌸, 5 Nest Heights 🪺, 6 Sunflower Rings 🌼, 7 Starlight Crown ✨.
 */

/** One forest lesson: its subject is its id's first word ('logic3-forest-venn' → logic). */
const lesson = (id, floor, title, topic, topicName, blurb, activities, rest) => ({
  id, subject: /^[a-z]+/.exec(id)[0], floor, realm: 'forest', title, topic, topicName, blurb,
  activities: ['story', 'learn', ...activities, 'challenge'], ...rest
});
const card = (title, emoji, text) => ({ title, emoji, text });

/* ------------------------------------------------------------ Logic & Patterns (Nutmeg) */

const FOREST_LOGIC = [
  // ───────────── Ring 1: Root Hollow (about age 6–7) ─────────────
  lesson('logic1-forest-secret-rule', 1, "Nutmeg's Secret Sorting Rule", 'sorting-attributes', 'Sorting by colour, shape and kind', "Nutmeg sorted her forest finds into baskets. Can you guess her rule?", ['sort'], {
    reading: [
      card("Same and different", '🔍', "Things can be the same in one way and different in another. A red ladybird and a red toadstool are the same colour, but one is a beetle and one is a fungus."),
      card("Sorting means grouping", '🧺', "When we sort, we put things that are the same in some way into one group. Every autumn Nutmeg sorts her finds into baskets."),
      card("A sorting rule", '🗝️', "A sorting rule says how things were grouped: by colour, by shape, by size or by what they are. Look at the groups, and you can guess the rule!")
    ],
    sort: {
      q: "Nutmeg sorted some forest finds into baskets. Can you guess her secret rule?",
      groups: [{ id: 'red', label: "Red things", emoji: '🔴' }, { id: 'yellow', label: "Yellow things", emoji: '🟡' }, { id: 'green', label: "Green things", emoji: '🟢' }],
      items: [
        { label: "Toadstool", emoji: '🍄', group: 'red', given: true },
        { label: "Sunflower", emoji: '🌻', group: 'yellow', given: true },
        { label: "Frog", emoji: '🐸', group: 'green', given: true },
        { label: "Ladybird", emoji: '🐞', group: 'red' },
        { label: "Wild strawberry", emoji: '🍓', group: 'red' },
        { label: "Red maple leaf", emoji: '🍁', group: 'red', hint: "In autumn, maple leaves turn bright red." },
        { label: "Yellow chick", emoji: '🐤', group: 'yellow' },
        { label: "Buttercup", emoji: '🌼', group: 'yellow' },
        { label: "Lemon", emoji: '🍋', group: 'yellow' },
        { label: "Caterpillar", emoji: '🐛', group: 'green', hint: "Look at its colour, not at what it is." },
        { label: "Fern", emoji: '🌿', group: 'green' },
        { label: "Pear", emoji: '🍐', group: 'green' }
      ],
      rule: { q: "How did Nutmeg sort her finds?", choices: ["By size", "By colour", "Animals and plants"], answer: 1, hint: "Look at the toadstool, the sunflower and the frog. What is different about them?", explain: "The toadstool is red, the sunflower is yellow and the frog is green: Nutmeg sorted by colour." }
    },
    quiz: [
      { q: "Nutmeg sorts by shape. Where does a round pebble go?", choices: ["With the long things", "With the round things", "With the red things"], answer: 1, hint: "The rule is about shape.", explain: "Sorting by shape, a round pebble goes with the other round things." },
      { q: "A red ladybird and a red berry are the same in one way. Which way?", choices: ["They are the same colour", "They are both animals", "They can both fly"], answer: 0, hint: "Look, don't think about what they are.", explain: "They are both red. The ladybird is an animal and the berry is not, but the colour is the same." },
      { q: "Pip put 🐦 🦋 🐝 in one group and 🐌 🐛 🐜 in another. What is the rule?", choices: ["Big and small", "Red and blue", "Can fly and can't fly"], answer: 2, hint: "What can the bird, the butterfly and the bee all do?", explain: "The bird, the butterfly and the bee can fly. The snail, the caterpillar and the ant cannot." },
      { q: "How many ways can you sort the same things?", choices: ["Only one way", "Many ways"], answer: 1, hint: "Think of colour, size, shape…", explain: "You can sort the same things in many ways: by colour, by size, by shape, by where they live…" },
      { q: "Nutmeg has 🍎 🍓 🍄 🐞. Which rule puts all four together?", choices: ["They are all animals", "They are all fruit", "They are all red"], answer: 2, hint: "The toadstool is not a fruit, and the apple is not an animal.", explain: "They are all red! Only a colour rule fits all four." }
    ]
  }),
  lesson('logic1-forest-leaf-patterns', 1, "Leaf Patterns: What Comes Next?", 'repeating-patterns', 'Repeating patterns', "Spot the part that repeats, and you'll know what comes next.", ['sort'], {
    reading: [
      card("A pattern repeats", '🔁', "In a repeating pattern, the same part comes again and again: acorn, leaf, acorn, leaf, acorn, leaf…"),
      card("Find the part that repeats", '🧩', "In 🍂🍂🌰🍂🍂🌰 the part that repeats is 🍂🍂🌰. Find that part, and you can say what comes next."),
      card("Patterns all around", '🐝', "Patterns are everywhere in the forest: the stripes on a bee, and the cuckoo's call, cuck-oo, cuck-oo, cuck-oo.")
    ],
    sort: {
      q: "Some of Nutmeg's lines are patterns, and some are just jumbled. Sort them!",
      groups: [{ id: 'pattern', label: "Repeating pattern", emoji: '🔁' }, { id: 'jumble', label: "Jumbled: no pattern", emoji: '🌀' }],
      items: [
        { label: "🍂🌰🍂🌰🍂🌰", emoji: '🍂', group: 'pattern' },
        { label: "🍄🍄🌿🍄🍄🌿", emoji: '🍄', group: 'pattern' },
        { label: "🐞🐌🐜🐞🐌🐜", emoji: '🐞', group: 'pattern' },
        { label: "🌲🌳🌲🌳🌲🌳", emoji: '🌲', group: 'pattern' },
        { label: "⭐🌙⭐⭐🌙⭐", emoji: '⭐', group: 'pattern', hint: "Look at three at a time: ⭐🌙⭐, then ⭐🌙⭐ again!" },
        { label: "🌸🌼🌸🌸🌼🌼", emoji: '🌸', group: 'jumble', hint: "🌸🌼 and then 🌸🌸: the part does not come back the same way." },
        { label: "🐿️🐿️🦔🐿️🦔🦔", emoji: '🦔', group: 'jumble' },
        { label: "🐦🐛🐛🐦🐦🐛", emoji: '🐦', group: 'jumble' }
      ]
    },
    quiz: [
      { q: "What comes next? 🍂🌰🍂🌰🍂 …", choices: ["🍂", "🌰", "🍄"], answer: 1, hint: "Leaf, acorn, leaf, acorn…", explain: "The part 🍂🌰 repeats, so after 🍂 comes 🌰." },
      { q: "What comes next? 🐞🐞🐜🐞🐞🐜🐞 …", choices: ["🐜", "🐌", "🐞"], answer: 2, hint: "The part that repeats is 🐞🐞🐜.", explain: "🐞🐞🐜, 🐞🐞🐜, then 🐞🐞… so the next one is 🐞." },
      { q: "Which part repeats in 🌸🌿🌿🌸🌿🌿?", choices: ["🌸🌿", "🌸🌿🌿", "🌿🌿"], answer: 1, hint: "Where does 🌸 come again?", explain: "🌸🌿🌿 comes once, then again: that is the part that repeats." },
      { q: "Which line is a repeating pattern?", choices: ["🦔🦔🐿️🦔🐿️🐿️", "🐿️🦔🦔🐿️🐿️🦔", "🦔🐿️🦔🐿️🦔🐿️"], answer: 2, hint: "Look for the same part coming back.", explain: "🦔🐿️ comes again and again: hedgehog, squirrel, hedgehog, squirrel." },
      { q: "A bird sings: tweet, tweet, chirp, tweet, tweet, chirp, tweet, tweet… What comes next?", choices: ["Chirp", "Tweet", "Hoot"], answer: 0, hint: "Two tweets, then…", explain: "The song goes tweet, tweet, chirp, again and again. After two tweets comes chirp." }
    ]
  }),

  // ───────────── Ring 2: Fern Boughs (about age 7–8) ─────────────
  lesson('logic2-forest-bird-count', 2, "Bird Count Day: Tallies and Pictographs", 'tally-pictograph', 'Tally charts and pictographs', "Count the birds that visit, then make a picture chart.", ['sort'], {
    reading: [
      card("Tally marks", '✏️', "To count birds as they fly past, draw one line for each bird. The fifth line goes across the other four, like a little gate. Then you can count the gates in fives."),
      card("A pictograph", '🐦', "A pictograph shows numbers with pictures. Each row is one kind of bird, with one picture for each bird seen. The longest row is the bird seen most."),
      card("Ask the chart", '🤔', "A chart helps us answer questions: Which bird came most? Which came least? How many more robins than owls? We can see it without counting again.")
    ],
    sort: {
      q: "The Fern Boughs children spotted these birds. Put each one in its row to make a pictograph!",
      groups: [{ id: 'robin', label: "Robins", emoji: '🐦' }, { id: 'owl', label: "Owls", emoji: '🦉' }, { id: 'duck', label: "Ducks", emoji: '🦆' }],
      items: [
        { label: "Robin on the gate", emoji: '🐦', group: 'robin' },
        { label: "Robin in the holly", emoji: '🐦', group: 'robin' },
        { label: "Robin by the bird bath", emoji: '🐦', group: 'robin' },
        { label: "Robin on a spade", emoji: '🐦', group: 'robin' },
        { label: "Robin in the hedge", emoji: '🐦', group: 'robin' },
        { label: "Owl in the oak", emoji: '🦉', group: 'owl' },
        { label: "Owl on the barn roof", emoji: '🦉', group: 'owl' },
        { label: "Duck on the pond", emoji: '🦆', group: 'duck' },
        { label: "Duck in the reeds", emoji: '🦆', group: 'duck' },
        { label: "Duck by the stream", emoji: '🦆', group: 'duck' }
      ]
    },
    quiz: [
      { q: "In your pictograph, which bird was seen most?", choices: ["Owls", "Ducks", "Robins"], answer: 2, hint: "Which row is the longest?", explain: "The robins' row is the longest: 5 robins." },
      { q: "5 robins and 2 owls were seen. How many more robins than owls?", choices: ["3", "7", "2"], answer: 0, hint: "Line the rows up. How many robins have no owl next to them?", explain: "5 − 2 = 3. Three more robins than owls." },
      { q: "A tally shows one gate of five and two more lines. How many birds is that?", choices: ["2", "7", "5"], answer: 1, hint: "A gate is 5. Then count on.", explain: "5, then 6, 7. The tally shows 7 birds." },
      { q: "In a pictograph, what does the longest row tell you?", choices: ["Which thing there is most of", "Which thing is the biggest", "Which thing is the oldest"], answer: 0, hint: "One picture for each one counted.", explain: "More pictures means more counted, so the longest row is the thing there is most of." },
      { q: "Why do counters draw tally marks in gates of five?", choices: ["Because birds come in fives", "So they are quick to count in fives", "To make them look pretty"], answer: 1, hint: "5, 10, 15, 20…", explain: "Gates of five can be counted quickly: 5, 10, 15, 20, and then the lines left over." }
    ]
  }),
  lesson('logic2-forest-odd-one-out', 2, "Odd One Out", 'odd-one-out', 'Odd one out', "All but one share something. Find the odd one out, and say why!", ['dig'], {
    reading: [
      card("Which one doesn't belong?", '🤔', "In an odd-one-out puzzle, all the things but one share something. Find what they share, and the odd one out jumps out!"),
      card("Look in different ways", '👀', "Check colour, shape and size, what a thing is, where it lives and how it moves. 🦆🐟🐸🐄: three live in or by water. The cow does not."),
      card("Say why", '💬', "Sometimes more than one answer can be right, if you can explain your reason. Good puzzle-solvers always say why.")
    ],
    dig: {
      q: "Brush away the fallen leaves to find Nutmeg's puzzle pebbles!",
      w: 5, h: 4,
      finds: [
        { at: [0, 1], emoji: '🪨', label: "A puzzle pebble", text: "Nutmeg painted a puzzle on this pebble.", question: { q: "Odd one out: 🍎 🍐 🍌 🥕", choices: ["🍌 the banana", "🥕 the carrot", "🍐 the pear"], answer: 1, hint: "Three of them are fruits.", explain: "The apple, the pear and the banana are fruits. The carrot is a root!" } },
        { at: [3, 0], emoji: '🌰', label: "An acorn-cap note", text: "A tiny note is tucked under an acorn cap.", question: { q: "Odd one out: 🐟 🐬 🐙 🐿️", choices: ["🐿️ the squirrel", "🐙 the octopus", "🐬 the dolphin"], answer: 0, hint: "Where do they live?", explain: "The fish, the dolphin and the octopus live in the sea. The squirrel lives in the trees." } },
        { at: [2, 3], emoji: '🍂', label: "A leaf card", text: "Numbers are scratched on this leaf.", question: { q: "Odd one out: 2, 4, 6, 7, 8", choices: ["2", "8", "7"], answer: 2, hint: "Which number can't be split into two equal piles?", explain: "2, 4, 6 and 8 are even. 7 is the only odd number, so it really is the odd one out!" } },
        { at: [4, 2], emoji: '🐚', label: "A shell with shapes", text: "Coloured shapes are painted inside this shell.", question: { q: "Odd one out: 🔴 🟢 🔵 🟥", choices: ["🔴 the red circle", "🟥 the red square", "🔵 the blue circle"], answer: 1, hint: "Look at shape, not colour.", explain: "Three are circles. The red square is the odd one out, even though one circle is red too!" } }
      ]
    },
    quiz: [
      { q: "Odd one out: 🌲 🌳 🌴 🍄", choices: ["🌲", "🍄", "🌴"], answer: 1, hint: "Three of them are trees.", explain: "The pine, the oak and the palm are trees. The toadstool is a fungus." },
      { q: "Odd one out: 🐝 🦋 🐞 🕷️. Why is the spider odd?", choices: ["It is the only red one", "It is the smallest", "It has eight legs, not six"], answer: 2, hint: "Count their legs.", explain: "Bees, butterflies and ladybirds are insects with six legs. A spider has eight legs." },
      { q: "Odd one out: snow ❄️, rain 🌧️, sunshine ☀️, hail 🧊", choices: ["Sunshine", "Hail", "Snow"], answer: 0, hint: "Three of them fall from the clouds.", explain: "Snow, rain and hail are water falling from clouds. Sunshine is light from the Sun." },
      { q: "Odd one out: 🐶 🐱 🐰 🐔. Which reason fits the hen?", choices: ["It is the biggest", "It has feathers; the others have fur", "It cannot walk"], answer: 1, hint: "Look at their coats.", explain: "The dog, the cat and the rabbit have fur. The hen has feathers." },
      { q: "Can an odd-one-out puzzle have more than one good answer?", choices: ["No, never", "Yes, if you can explain why"], answer: 1, hint: "What do good puzzle-solvers always do?", explain: "If you can give a good reason, more than one answer can be right." }
    ]
  }),

  // ───────────── Ring 3: Lantern Branches (about age 8–9) ─────────────
  lesson('logic3-forest-venn', 3, "Venn Diagrams: Where Circles Overlap", 'venn-diagrams', 'Venn diagrams', "Two circles, a middle part and an outside: sort the animals into a Venn diagram.", ['sort'], {
    reading: [
      card("Two circles", '⭕', "A Venn diagram is two circles that overlap. Each circle holds things with one feature, like 'has fur' or 'lives in water'."),
      card("The middle part", '🎯', "Where the circles overlap is for things with both features. An otter has fur and it lives in rivers, so it goes in the middle!"),
      card("Outside the circles", '🔲', "Things with neither feature go outside both circles. An owl has no fur and doesn't live in water."),
      card("Named after John Venn", '✏️', "These diagrams are named after John Venn, an English teacher of logic, who wrote about them in 1880.")
    ],
    sort: {
      q: "Circles: 'Has fur' and 'Lives in water'. Where does each animal go?",
      groups: [{ id: 'fur', label: "Fur only", emoji: '🧶' }, { id: 'water', label: "Water only", emoji: '🌊' }, { id: 'both', label: "Both: the middle", emoji: '🎯' }, { id: 'neither', label: "Neither: outside", emoji: '🔲' }],
      items: [
        { label: "Fox", emoji: '🦊', group: 'fur' },
        { label: "Rabbit", emoji: '🐰', group: 'fur' },
        { label: "Squirrel", emoji: '🐿️', group: 'fur' },
        { label: "Fish", emoji: '🐟', group: 'water' },
        { label: "Octopus", emoji: '🐙', group: 'water' },
        { label: "Crab", emoji: '🦀', group: 'water' },
        { label: "Otter", emoji: '🦦', group: 'both' },
        { label: "Beaver", emoji: '🦫', group: 'both', hint: "Beavers have thick, waterproof fur and live in ponds and rivers." },
        { label: "Seal", emoji: '🦭', group: 'both', hint: "Seals have short fur and spend lots of time in the sea." },
        { label: "Owl", emoji: '🦉', group: 'neither', hint: "Owls have feathers, not fur, and live in trees." },
        { label: "Snail", emoji: '🐌', group: 'neither' },
        { label: "Ladybird", emoji: '🐞', group: 'neither' }
      ]
    },
    quiz: [
      { q: "Circles: 'Red' and 'Round'. Where does a red apple go?", choices: ["Outside both circles", "Only in 'Round'", "In the middle, in both circles"], answer: 2, hint: "Is it red? Is it round?", explain: "A red apple is red and round, so it goes in the middle, where the circles overlap." },
      { q: "Same circles. Where does a yellow banana go?", choices: ["Outside both circles", "In the middle", "Only in 'Red'"], answer: 0, hint: "Is it red? Is it round?", explain: "A banana is neither red nor round, so it goes outside both circles." },
      { q: "What goes in the part where the circles overlap?", choices: ["Things with neither feature", "Things with both features", "Only the biggest things"], answer: 1, hint: "It is inside both circles at once.", explain: "The overlap is inside both circles, so it holds things with both features." },
      { q: "Who are Venn diagrams named after?", choices: ["John Venn, a teacher of logic", "A town called Venn", "A squirrel called Venn"], answer: 0, hint: "He wrote about them in 1880.", explain: "John Venn, an English teacher of logic, wrote about these diagrams in 1880." },
      { q: "Circles: 'Has fur' and 'Lives in water'. Where does a goldfish go?", choices: ["Fur only", "Water only", "Both"], answer: 1, hint: "Does a goldfish have fur?", explain: "A goldfish lives in water but has no fur, so it goes in 'Water only'." }
    ]
  }),
  lesson('logic3-forest-chance-words', 3, "Certain, Likely, Unlikely, Impossible", 'chance-words', 'Chance words', "Will it happen? Use chance words to say how likely it is.", ['sort'], {
    reading: [
      card("Will it happen?", '🎲', "Some things are certain to happen, like night coming after day. Some can never happen, like a squirrel turning into a teapot. Most things are somewhere in between."),
      card("Likely and unlikely", '⚖️', "Likely means it will probably happen, like rain in a rainforest. Unlikely means it probably won't, but it could, like finding a four-leaf clover."),
      card("An even chance", '🪙', "Some things have an even chance: as likely to happen as not, like a coin landing heads up. Over many flips, about half are heads.")
    ],
    sort: {
      q: "How likely is it? Sort Nutmeg's forest guesses!",
      groups: [{ id: 'certain', label: "Certain", emoji: '✅' }, { id: 'likely', label: "Likely", emoji: '👍' }, { id: 'unlikely', label: "Unlikely", emoji: '🤏' }, { id: 'impossible', label: "Impossible", emoji: '🚫' }],
      items: [
        { label: "A dropped acorn falls down", emoji: '🌰', group: 'certain' },
        { label: "Next week has seven days", emoji: '📅', group: 'certain' },
        { label: "It rains sometime this month", emoji: '🌧️', group: 'likely' },
        { label: "You see a squirrel in a big park", emoji: '🐿️', group: 'likely' },
        { label: "You find a four-leaf clover", emoji: '🍀', group: 'unlikely', hint: "Most clovers have three leaves. A four-leaf one is rare, but people do find them!" },
        { label: "A bird lands on your head", emoji: '🐦', group: 'unlikely' },
        { label: "A frog grows feathers", emoji: '🐸', group: 'impossible' },
        { label: "An acorn grows into a pine tree", emoji: '🌲', group: 'impossible', hint: "What kind of tree do acorns grow into?" }
      ]
    },
    quiz: [
      { q: "Which word fits: 'A cat will lay an egg'?", choices: ["Likely", "Impossible", "Certain"], answer: 1, hint: "Do cats lay eggs?", explain: "Cats never lay eggs, so it is impossible." },
      { q: "You flip a coin. What chance is there that it lands heads up?", choices: ["Certain", "Impossible", "An even chance"], answer: 2, hint: "There are two sides.", explain: "Heads and tails are equally likely, so it is an even chance." },
      { q: "A bag has 9 brown acorns and 1 green acorn. You pick one without looking. Getting a brown one is…", choices: ["Likely", "Unlikely", "Impossible"], answer: 0, hint: "Most of them are brown.", explain: "9 of the 10 acorns are brown, so brown is likely." },
      { q: "Same bag. Getting a red acorn is…", choices: ["Unlikely", "Likely", "Impossible"], answer: 2, hint: "Are there any red acorns in the bag?", explain: "There are no red acorns in the bag, so it is impossible." },
      { q: "Which is unlikely, but could happen?", choices: ["Tomorrow coming after today", "Finding a four-leaf clover", "A fish riding a bike"], answer: 1, hint: "One is certain, one is impossible.", explain: "Four-leaf clovers are rare, but people do find them: unlikely, not impossible." }
    ]
  }),

  // ───────────── Ring 4: Blossom Canopy (about age 9–10) ─────────────
  lesson('logic4-forest-growing-patterns', 4, "Growing Patterns", 'growing-patterns', 'Growing patterns and sequences', "Patterns that grow, double or shrink: find each one's rule.", ['sort', 'dig'], {
    reading: [
      card("Patterns that grow", '🌱', "A growing pattern changes by a rule at each step. A sapling has 1 leaf, then 3, then 5, then 7: it grows 2 leaves each week."),
      card("Find the rule", '🔎', "Look at how much it changes from one step to the next. 4, 7, 10, 13: each step adds 3. So the next is 16."),
      card("Doubling", '✖️', "Some patterns double: 1, 2, 4, 8, 16. A doubling pattern grows faster and faster, like one tiny cell splitting into 2, then 4, then 8."),
      card("Shrinking too", '🍂', "Patterns can shrink: 20, 17, 14, 11. Here the rule is 'take away 3' each step.")
    ],
    sort: {
      q: "What is each number trail's rule? Sort them!",
      groups: [{ id: 'add2', label: "+2 each step", emoji: '🌱' }, { id: 'add3', label: "+3 each step", emoji: '🪜' }, { id: 'double', label: "Doubles each step", emoji: '✖️' }, { id: 'sub3', label: "−3 each step", emoji: '🍂' }],
      items: [
        { label: "1, 3, 5, 7", emoji: '🌿', group: 'add2' },
        { label: "10, 12, 14, 16", emoji: '🍃', group: 'add2' },
        { label: "2, 5, 8, 11", emoji: '🐌', group: 'add3' },
        { label: "4, 7, 10, 13", emoji: '🐞', group: 'add3' },
        { label: "2, 4, 8, 16", emoji: '🦠', group: 'double', hint: "2 to 4 is +2, but 4 to 8 is +4. What happens each time?" },
        { label: "3, 6, 12, 24", emoji: '🐇', group: 'double', hint: "3 to 6 is +3, but 6 to 12 is +6. Each number is twice the one before." },
        { label: "5, 10, 20, 40", emoji: '🌸', group: 'double' },
        { label: "20, 17, 14, 11", emoji: '🍁', group: 'sub3' },
        { label: "30, 27, 24, 21", emoji: '❄️', group: 'sub3' }
      ]
    },
    dig: {
      q: "Dig in the leaf litter for Nutmeg's pattern stones!",
      w: 5, h: 4,
      finds: [
        { at: [1, 0], emoji: '🪨', label: "A pattern stone", text: "Scratched on it: 🌱 2 leaves, then 4, then 6…", question: { q: "If the sprout keeps growing the same way, how many leaves come next?", choices: ["7", "12", "8"], answer: 2, hint: "How many leaves does it gain each time?", explain: "It gains 2 leaves each time: 2, 4, 6, 8." } },
        { at: [3, 2], emoji: '🪵', label: "A log pile", text: "The squirrels stack logs: 1 on top, 2 under it, 3 under that…", question: { q: "How many logs are in the next row down?", choices: ["4", "6", "5"], answer: 0, hint: "Each row has one more log.", explain: "1, 2, 3, then 4. Each row down has one more log." } },
        { at: [0, 3], emoji: '🍄', label: "A mushroom ring", text: "A ring of mushrooms: 3, then 6, then 12…", question: { q: "If it keeps doubling, how many mushrooms come next?", choices: ["15", "24", "18"], answer: 1, hint: "Double 12.", explain: "3, 6, 12, 24: each number is double the one before." } }
      ]
    },
    quiz: [
      { q: "What comes next? 5, 9, 13, 17, …", choices: ["20", "18", "21"], answer: 2, hint: "How much does it go up each step?", explain: "It goes up by 4 each step: 17 + 4 = 21." },
      { q: "What is the rule? 2, 4, 8, 16, 32", choices: ["Add 2 each time", "Double each time", "Add 4 each time"], answer: 1, hint: "Look at the jumps: they get bigger.", explain: "Each number is double the one before: 2, 4, 8, 16, 32." },
      { q: "A frog jumps 3 lily pads, then 6, then 9. If the pattern grows the same way, how far next?", choices: ["12", "10", "18"], answer: 0, hint: "How many more each time?", explain: "It adds 3 each time: 3, 6, 9, 12." },
      { q: "Which pattern is shrinking?", choices: ["5, 10, 15, 20", "40, 35, 30, 25", "1, 2, 4, 8"], answer: 1, hint: "Which numbers get smaller?", explain: "40, 35, 30, 25 takes away 5 each step: it shrinks." },
      { q: "Step 1 has 1 leaf, step 2 has 4, step 3 has 7. How many leaves in step 5?", choices: ["10", "13", "15"], answer: 1, hint: "Find the rule, then keep going to step 5.", explain: "It adds 3 each step: 1, 4, 7, 10, 13. Step 5 has 13 leaves." }
    ]
  }),
  lesson('logic4-forest-bar-charts', 4, "Bar Charts: The Great Tree Survey", 'bar-charts', 'Reading bar charts', "The rangers counted the trees. What does their bar chart tell us?", ['sort'], {
    reading: [
      card("Bars for numbers", '📊', "A bar chart shows numbers as bars. The taller the bar, the bigger the number. Each bar has a label to say what it shows."),
      card("Read the scale", '📏', "The scale up the side tells you what each line is worth. On some charts each line counts 1; on others 2, 5 or 10. Always read the scale first!"),
      card("Between the lines", '🔍', "If a bar stops halfway between 10 and 20, on a scale counting in tens, it shows 15."),
      card("Ask the chart", '💡', "Bar charts make it quick to compare: which is most, which is least, and how many more one is than another.")
    ],
    sort: {
      q: "The survey's bars: Oak 12 · Birch 6 · Pine 15 · Maple 9. True or false?",
      groups: [{ id: 'true', label: "True", emoji: '✅' }, { id: 'false', label: "False", emoji: '❌' }],
      items: [
        { label: "Pine has the tallest bar", emoji: '🌲', group: 'true' },
        { label: "There are twice as many oaks as birches", emoji: '🌳', group: 'true', hint: "Double 6. Is it 12?" },
        { label: "There are 3 more pines than oaks", emoji: '➕', group: 'true' },
        { label: "Maple's bar is shorter than oak's", emoji: '🍁', group: 'true' },
        { label: "Birch has the tallest bar", emoji: '🪵', group: 'false' },
        { label: "There are 20 pines", emoji: '🔢', group: 'false' },
        { label: "Maple and birch have the same height", emoji: '📏', group: 'false', hint: "Maple is 9 and birch is 6." },
        { label: "Oak's bar is the shortest", emoji: '📉', group: 'false' }
      ]
    },
    quiz: [
      { q: "A chart's scale counts in 5s. A bar stops at the 4th line. What number does it show?", choices: ["4", "9", "20"], answer: 2, hint: "Count 5, 10, 15…", explain: "5, 10, 15, 20: the 4th line is 20." },
      { q: "On a scale counting in tens, a bar stops halfway between 10 and 20. What does it show?", choices: ["15", "12", "20"], answer: 0, hint: "What is halfway between 10 and 20?", explain: "Halfway between 10 and 20 is 15." },
      { q: "The birds' bar shows 8 and the bats' bar shows 3. How many more birds than bats?", choices: ["11", "5", "3"], answer: 1, hint: "Compare the two bars.", explain: "8 − 3 = 5. There were 5 more birds than bats." },
      { q: "What should you read first on a bar chart?", choices: ["The colour of the bars", "The last bar", "The scale and the labels"], answer: 2, hint: "What tells you what the bars mean?", explain: "The scale says what each line is worth, and the labels say what each bar shows." },
      { q: "What is a bar chart best for?", choices: ["Comparing amounts", "Telling a story", "Spelling a word"], answer: 0, hint: "Tall bars, short bars…", explain: "Bar charts let us compare amounts at a glance." }
    ]
  }),

  // ───────────── Ring 5: Nest Heights (about age 10–11) ─────────────
  lesson('logic5-forest-if-then', 5, "If… Then…: Think Like a Detective", 'if-then', 'If–then reasoning', "What must be true, what can't be, and what can't we tell?", ['sort'], {
    reading: [
      card("An if–then rule", '🔗', "An if–then rule links two things: IF it rains, THEN the snails come out. Whenever the 'if' part happens, the 'then' part happens too."),
      card("Don't flip it!", '🔄', "The rule doesn't work backwards. If you see snails, it didn't have to rain: snails also come out on damp nights. 'If A then B' doesn't mean 'if B then A'."),
      card("The detective's trick", '🕵️', "But if the rule is true and there are no snails, you can be sure it didn't rain: if it had, the snails would be out."),
      card("Must, can't, or can't tell", '🎯', "With a rule, a sentence can be 'must be true', 'can't be true', or 'can't tell'. Careful thinkers sort which is which.")
    ],
    sort: {
      q: "Rule: IF it rains, THEN Nutmeg takes her leaf umbrella. Sort each sentence!",
      groups: [{ id: 'must', label: "Must be true", emoji: '✅' }, { id: 'cant', label: "Can't be true", emoji: '🚫' }, { id: 'tell', label: "Can't tell", emoji: '🤷' }],
      items: [
        { label: "It's raining, so Nutmeg has her umbrella", emoji: '☔', group: 'must' },
        { label: "Nutmeg has no umbrella, so it isn't raining", emoji: '🐿️', group: 'must', hint: "If it were raining, she would have her umbrella." },
        { label: "It's raining, and Nutmeg has no umbrella", emoji: '🌧️', group: 'cant', hint: "That breaks the rule." },
        { label: "Nutmeg has her umbrella, so it's raining", emoji: '🍃', group: 'tell', hint: "She might take it on a dry day too. The rule doesn't say she can't." },
        { label: "It's sunny, so Nutmeg has no umbrella", emoji: '☀️', group: 'tell', hint: "The rule only tells us about rainy days." },
        { label: "It's raining, so Nutmeg has a hat", emoji: '🎩', group: 'tell', hint: "The rule is about her umbrella, not hats!" }
      ]
    },
    quiz: [
      { q: "Rule: if an animal is a bird, then it has feathers. A robin is a bird. So…", choices: ["We can't tell", "A robin has feathers", "A robin can swim"], answer: 1, hint: "The 'if' part is true for the robin.", explain: "The robin is a bird, so by the rule it has feathers." },
      { q: "Same rule. A bat has no feathers. So…", choices: ["A bat is not a bird", "A bat is a bird", "A bat is a fish"], answer: 0, hint: "Use the detective's trick.", explain: "Every bird has feathers. The bat has none, so it can't be a bird. (It's a mammal!)" },
      { q: "Rule: if it is winter, the pond freezes. The pond is frozen. So…", choices: ["It must be winter", "It can't be winter", "It might be winter, but we can't be sure"], answer: 2, hint: "Does the rule work backwards?", explain: "The rule doesn't say the pond only freezes in winter, so we can't be sure." },
      { q: "'If A, then B.' Which is also always true?", choices: ["If B, then A", "If not A, then not B", "If not B, then not A"], answer: 2, hint: "Remember the snails: no snails means…", explain: "If B didn't happen, A can't have happened: if not B, then not A." },
      { q: "Rule: if you water the seed, it sprouts. The seed did not sprout. What do we know?", choices: ["It was not watered", "It was watered", "It is a pebble"], answer: 0, hint: "If it had been watered, what would have happened?", explain: "If it had been watered, it would have sprouted. It didn't, so it wasn't watered." }
    ]
  }),
  lesson('logic5-forest-logic-grid', 5, "Logic Grids: Who Lives Where?", 'logic-grids', 'Logic grid puzzles', "Use the clues, cross out what can't be, and find every animal's home.", ['maphunt'], {
    reading: [
      card("A grid of clues", '🔢', "A logic grid puzzle gives you clues, and you work out who goes where. Draw a grid: the animals down the side, the homes across the top."),
      card("Cross out what can't be", '❌', "Each clue lets you cross out boxes. 'The owl doesn't live in the pine': put a ✗ in the owl–pine box."),
      card("Only one left", '✔️', "When a row has only one empty box left, that must be the answer! Tick it, and cross out that home for everyone else."),
      card("Check every clue", '🔁', "At the end, read every clue again to make sure your answer fits them all.")
    ],
    maphunt: {
      q: "Five friends live round the pond. Read each clue, think, and tap the right home!",
      map: { regions: [
        { id: 'wood', label: "The wood", kind: 'land', points: [[0, 0], [100, 0], [100, 60], [0, 60]], at: [76, 54] },
        { id: 'pond', label: "The pond", kind: 'water', points: [[38, 22], [62, 22], [65, 30], [60, 38], [40, 38], [35, 30]], at: [50, 30], emoji: '💧' },
        { id: 'pine', label: "The pine", kind: 'land', points: [[39, 3], [61, 3], [61, 18], [39, 18]], emoji: '🌲' },
        { id: 'oak', label: "The oak", kind: 'land', points: [[14, 21], [32, 21], [32, 39], [14, 39]], emoji: '🌳' },
        { id: 'stump', label: "The old stump", kind: 'land', points: [[39, 42], [61, 42], [61, 56], [39, 56]], emoji: '🪵' },
        { id: 'maple', label: "The maple", kind: 'land', points: [[80, 18], [97, 18], [97, 40], [80, 40]], emoji: '🍁' },
        { id: 'toadstool', label: "The toadstool house", kind: 'land', points: [[2, 44], [14, 44], [14, 57], [2, 57]], emoji: '🍄' }
      ] },
      clues: [
        { q: "The owl sleeps in a tree that keeps its needles all winter. Where does she live?", region: 'pine', hint: "Which tree has needles, not leaves?" },
        { q: "The hedgehog's home is not a tree, and it is right next to the pond. Where?", region: 'stump', hint: "Two homes are not trees. Only one of them touches the pond's side." },
        { q: "The squirrel lives in a tree that is not next to the pond and is not the owl's. Where?", region: 'maple', hint: "Cross out the trees beside the pond, and the pine." },
        { q: "The frog is visiting a friend today! It is in the last home left that isn't a tree or the pond. Where?", region: 'toadstool', hint: "The hedgehog has the stump. What else isn't a tree?" },
        { q: "The wren lives in the only tree left. Where?", region: 'oak', hint: "The owl has the pine and the squirrel has the maple." }
      ]
    },
    quiz: [
      { q: "Bo is not in the oak, and not in the pine. There are three trees: oak, pine and birch. Where is Bo?", choices: ["The oak", "The birch", "The pine"], answer: 1, hint: "Cross out the two trees Bo isn't in.", explain: "Only the birch is left, so Bo must be in the birch." },
      { q: "In a logic grid, what do you do when a clue says 'not'?", choices: ["Put a tick in that box", "Skip the clue", "Put a cross in that box"], answer: 2, hint: "'Not' rules a box out.", explain: "A 'not' clue rules a box out, so you put a cross in it." },
      { q: "A row has crosses in every box but one. What does the empty box mean?", choices: ["It must be the answer", "It must be wrong", "Start again"], answer: 0, hint: "Every other choice is ruled out.", explain: "If everything else is crossed out, the last empty box must be the answer." },
      { q: "Fern, Moss and Ivy have a red, a blue and a green hat. Fern's hat is not red or blue. Moss's hat is not red. What colour is Ivy's hat?", choices: ["Blue", "Green", "Red"], answer: 2, hint: "Find Fern's hat first, then Moss's.", explain: "Fern's hat must be green. Moss's isn't red, so it's blue. That leaves red for Ivy." },
      { q: "Why should you check every clue at the end?", choices: ["To make the puzzle longer", "To make sure your answer fits them all", "Because the first clue is always wrong"], answer: 1, hint: "A good answer agrees with every clue.", explain: "Checking every clue makes sure your answer fits them all." }
    ]
  }),

  // ───────────── Ring 6: Sunflower Rings (about age 11–12) ─────────────
  lesson('logic6-forest-symmetry', 6, "Symmetry in Nature", 'symmetry', 'Symmetry', "Mirror lines and turning symmetry: why so much of nature matches.", ['sort'], {
    reading: [
      card("Mirror symmetry", '🦋', "A shape has mirror symmetry if a line splits it into two halves that match like reflections. A butterfly's wings match on both sides of its body."),
      card("Many mirror lines", '❄️', "Some shapes have many mirror lines. A perfect snowflake has six arms and six mirror lines. A starfish with five arms has five."),
      card("Turning symmetry", '🌼', "A shape has turning (rotational) symmetry if it looks the same after part of a turn. Turn a five-petal flower a fifth of the way round, and it looks just the same."),
      card("Why nature likes it", '🐞', "Most animals that move forward have matching left and right sides, which helps them walk, swim or fly straight. Many flowers that face the sky are round, with turning symmetry.")
    ],
    sort: {
      q: "What kind of symmetry does each one have? Sort Nutmeg's nature cards!",
      groups: [{ id: 'one', label: "One mirror line (left matches right)", emoji: '🦋' }, { id: 'many', label: "Many mirror lines, and turning", emoji: '❄️' }, { id: 'none', label: "No mirror line", emoji: '🌀' }],
      items: [
        { label: "Butterfly", emoji: '🦋', group: 'one' },
        { label: "Ladybird", emoji: '🐞', group: 'one' },
        { label: "Owl's face", emoji: '🦉', group: 'one' },
        { label: "Fox's face", emoji: '🦊', group: 'one' },
        { label: "Snowflake", emoji: '❄️', group: 'many' },
        { label: "Starfish", emoji: '⭐', group: 'many' },
        { label: "Daisy", emoji: '🌼', group: 'many' },
        { label: "Apple cut across the middle", emoji: '🍎', group: 'many', hint: "Cut an apple across its middle: the seeds make a five-pointed star!" },
        { label: "Snail shell", emoji: '🐌', group: 'none', hint: "A spiral winds one way: no line splits it into matching halves." },
        { label: "Fiddler crab", emoji: '🦀', group: 'none', hint: "A male fiddler crab has one giant claw and one small one." },
        { label: "Flounder", emoji: '🐟', group: 'none', hint: "A grown-up flounder has both eyes on one side of its head!" }
      ]
    },
    quiz: [
      { q: "A perfect six-armed snowflake has how many mirror lines?", choices: ["2", "1", "6"], answer: 2, hint: "One through each arm…", explain: "A six-armed snowflake has six mirror lines." },
      { q: "Which has turning symmetry?", choices: ["A five-petal flower", "A snail shell", "A fiddler crab"], answer: 0, hint: "Which looks the same after part of a turn?", explain: "Turn a five-petal flower a fifth of the way round, and it looks the same." },
      { q: "Why do many animals that move forward have matching left and right sides?", choices: ["It keeps them dry", "It helps them move straight", "It makes them taste nicer"], answer: 1, hint: "Think of walking, swimming and flying.", explain: "Matching sides help an animal walk, swim or fly straight." },
      { q: "You turn a starfish with five equal arms. How many times does it look the same in one full turn?", choices: ["1", "10", "5"], answer: 2, hint: "Count the arms.", explain: "It looks the same 5 times in a full turn: once for each arm." },
      { q: "A fiddler crab has one giant claw and one small one. Does its body have mirror symmetry?", choices: ["No: its sides don't match", "Yes, perfectly"], answer: 0, hint: "Would the two halves match in a mirror?", explain: "One claw is much bigger, so the two sides don't match." }
    ]
  }),
  lesson('logic6-forest-chances', 6, "Chances in Numbers", 'probability', 'Probability', "Count the ways, and give a chance as a number: 1 in 4, 1 in 2, 0 or 1.", ['sort', 'dig'], {
    reading: [
      card("Chance as a number", '🔢', "We can give a chance as a number. '1 in 4' means 1 winning way out of 4 equally likely ways. Impossible is 0, certain is 1, and an even chance is 1 in 2, or a half."),
      card("Count the ways", '🧮', "A spinner with 4 equal parts — red, blue, green and yellow — lands on green 1 way out of 4. So the chance is 1 in 4, or ¼."),
      card("More of one kind", '🌰', "A bag holds 3 brown acorns and 1 green one. Picking brown happens 3 ways out of 4: a chance of 3 in 4, or ¾."),
      card("Over many tries", '📈', "A chance doesn't promise what happens next time. Flip a coin 4 times, and you might get 3 heads. But over 1,000 flips, close to half will be heads.")
    ],
    sort: {
      q: "What is the chance? Sort each pick, spin and roll!",
      groups: [{ id: 'zero', label: "0: impossible", emoji: '🚫' }, { id: 'quarter', label: "1 in 4", emoji: '🍀' }, { id: 'half', label: "1 in 2", emoji: '🪙' }, { id: 'one', label: "1: certain", emoji: '✅' }],
      items: [
        { label: "A coin lands heads up", emoji: '🪙', group: 'half' },
        { label: "A spinner half red, half blue lands on red", emoji: '🔴', group: 'half' },
        { label: "A dice lands on an even number", emoji: '🎲', group: 'half', hint: "Even numbers on a dice: 2, 4 and 6. That's 3 out of 6." },
        { label: "A spinner with 4 equal colours lands on green", emoji: '🟢', group: 'quarter' },
        { label: "You pick the 1 golden acorn from 4 acorns", emoji: '✨', group: 'quarter' },
        { label: "You pick card A from cards A, B, C and D", emoji: '🃏', group: 'quarter' },
        { label: "You pick brown from a bag of 4 brown acorns", emoji: '🌰', group: 'one' },
        { label: "A dice lands on a number less than 7", emoji: '🔢', group: 'one' },
        { label: "You pick blue from a bag of 4 brown acorns", emoji: '🔵', group: 'zero' },
        { label: "A dice lands on 8", emoji: '🎱', group: 'zero' }
      ]
    },
    dig: {
      q: "Brush the soil off Nutmeg's old game pieces, and solve their chance puzzles!",
      w: 5, h: 4,
      finds: [
        { at: [1, 1], emoji: '🪙', label: "Two old coins", text: "Two coins, both flipped at once.", question: { q: "Which is more likely: two heads, or one head and one tail?", choices: ["They are equally likely", "Two heads", "One head and one tail"], answer: 2, hint: "List all the ways: HH, HT, TH, TT.", explain: "There are 4 equally likely ways: HH, HT, TH and TT. One of each happens 2 ways out of 4; two heads only 1 way." } },
        { at: [3, 2], emoji: '🎲', label: "A wooden dice", text: "A fair dice: six sides, numbered 1 to 6.", question: { q: "You roll it 600 times. About how many sixes would you expect?", choices: ["About 100", "Exactly 6", "About 300"], answer: 0, hint: "The chance of a six is 1 in 6.", explain: "1 in 6 of 600 rolls is about 100 sixes. It won't be exactly 100 every time!" } },
        { at: [4, 0], emoji: '🎡', label: "A spinner", text: "4 equal parts: 3 red and 1 blue.", question: { q: "What is the chance of landing on red?", choices: ["1 in 3", "3 in 4", "1 in 4"], answer: 1, hint: "How many of the 4 parts are red?", explain: "3 of the 4 equal parts are red, so the chance is 3 in 4." } }
      ]
    },
    quiz: [
      { q: "A bag has 2 red and 2 blue marbles. What is the chance of picking red?", choices: ["1 in 4", "Certain", "1 in 2"], answer: 2, hint: "How many of the 4 are red?", explain: "2 of the 4 marbles are red: 2 in 4, which is 1 in 2." },
      { q: "Which number means impossible?", choices: ["0", "1", "½"], answer: 0, hint: "No chance at all…", explain: "Impossible is 0, certain is 1." },
      { q: "You flip a fair coin and get heads 3 times in a row. What is the chance of heads next time?", choices: ["Less than 1 in 2", "Still 1 in 2", "Certain"], answer: 1, hint: "Does the coin remember?", explain: "A coin has no memory: each flip is still 1 in 2." },
      { q: "A spinner has 8 equal parts, and 2 are yellow. What is the chance of yellow?", choices: ["1 in 8", "1 in 2", "2 in 8, which is 1 in 4"], answer: 2, hint: "2 out of 8…", explain: "2 in 8 is the same as 1 in 4." },
      { q: "Rolling a fair dice, which is more likely?", choices: ["They are equally likely", "An odd number", "A six"], answer: 1, hint: "Count the odd numbers on a dice.", explain: "Odd numbers (1, 3, 5) come 3 ways out of 6. A six comes only 1 way." }
    ]
  }),

  // ───────────── Ring 7: Starlight Crown (about age 12–13) ─────────────
  lesson('logic7-forest-line-graphs', 7, "Line Graphs and Trends", 'line-graphs', 'Line graphs and trends', "Read a line graph, spot the trend, and know what the data can't tell you.", ['sort'], {
    reading: [
      card("Change over time", '📈', "A line graph joins points to show how something changes over time: the height of a sapling each year, or the temperature each month."),
      card("Read the axes", '↔️', "Time usually goes along the bottom (the x-axis). The amount goes up the side (the y-axis). Each point sits above its time, at its amount."),
      card("Spot the trend", '🧭', "A trend is the general direction: rising, falling or level. A steep line means fast change; a gentle slope means slow change."),
      card("Careful with claims", '⚠️', "A trend isn't a promise: a line rising for five years might level off. And two lines rising together don't prove one causes the other. Ice-cream sales and sunburns both rise in summer, because of the sunshine.")
    ],
    sort: {
      q: "The oak sapling, measured each spring: 20 cm, 35 cm, 55 cm, 80 cm, 110 cm. True, false, or can't tell?",
      groups: [{ id: 'true', label: "True", emoji: '✅' }, { id: 'false', label: "False", emoji: '❌' }, { id: 'tell', label: "Can't tell from the data", emoji: '🤷' }],
      items: [
        { label: "It grew every year", emoji: '🌱', group: 'true' },
        { label: "It grew faster each year", emoji: '📈', group: 'true', hint: "Work out each year's growth: 15, 20, 25, 30." },
        { label: "It grew 90 cm from the first to the last measurement", emoji: '📏', group: 'true' },
        { label: "It shrank one year", emoji: '📉', group: 'false' },
        { label: "It grew 50 cm in the last year", emoji: '🔢', group: 'false', hint: "From 80 cm to 110 cm is how much?" },
        { label: "Next spring it will be exactly 145 cm", emoji: '🔮', group: 'tell', hint: "A trend is not a promise." },
        { label: "It grew because the springs were rainy", emoji: '🌧️', group: 'tell', hint: "Is there any rain in the data?" },
        { label: "It is the tallest sapling in the forest", emoji: '🌳', group: 'tell' }
      ]
    },
    quiz: [
      { q: "Temperatures from January to May: 2, 5, 9, 14, 18 °C. What is the trend?", choices: ["Falling", "Rising", "Level"], answer: 1, hint: "Are the numbers getting bigger or smaller?", explain: "Each month is warmer than the one before: the trend is rising." },
      { q: "On a line graph, a steep part of the line means…", choices: ["No change", "A mistake", "Fast change"], answer: 2, hint: "A big jump in a short time…", explain: "A steep line means the amount changed a lot in a short time." },
      { q: "Hot-chocolate sales and scarf sales both rise in winter. Does buying scarves make people buy hot chocolate?", choices: ["Yes, always", "Not necessarily: cold weather may cause both", "No, scarves stop it"], answer: 1, hint: "What else changes in winter?", explain: "Both rise because of the cold. Rising together doesn't prove one causes the other." },
      { q: "A line stays flat from March to June. What happened?", choices: ["The amount stayed the same", "The amount doubled", "The graph is broken"], answer: 0, hint: "Flat means no change.", explain: "A flat line means the amount stayed the same." },
      { q: "Where does time usually go on a line graph?", choices: ["In the title", "Up the side, the y-axis", "Along the bottom, the x-axis"], answer: 2, hint: "We read time from left to right.", explain: "Time usually runs along the bottom, on the x-axis." }
    ]
  }),
  lesson('logic7-forest-branching-keys', 7, "Branching Keys: Name That Tree", 'branching-keys', 'Branching keys and yes-or-no questions', "Follow a key of yes-or-no questions, like a naturalist naming a tree.", ['sort'], {
    reading: [
      card("Yes-or-no questions", '❓', "A branching key (an identification key) is a chain of yes-or-no questions. Each answer sends you down one branch, until only one name is left."),
      card("Nutmeg's tree key", '🌲', "1. Does it have needles? YES → go to 2. NO → go to 3. 2. Do the needles drop in autumn? YES: larch. NO: pine. 3. Do the leaves have rounded lobes, like wavy fingers? YES: oak. NO: birch."),
      card("Good questions", '🎯', "A good key question splits the group, and anyone can check it. 'Are the leaves needles?' is good. 'Is it pretty?' is not, because people disagree."),
      card("Keys everywhere", '🔬', "Naturalists use keys to name trees, mushrooms, insects and birds. The same yes-or-no thinking runs computer programs, too.")
    ],
    sort: {
      q: "Use Nutmeg's tree key on each sample: larch, pine, oak or birch?",
      groups: [{ id: 'larch', label: "Larch", emoji: '🟡' }, { id: 'pine', label: "Pine", emoji: '🌲' }, { id: 'oak', label: "Oak", emoji: '🌳' }, { id: 'birch', label: "Birch", emoji: '🤍' }],
      items: [
        { label: "Needles that turn gold and drop in autumn", emoji: '🍂', group: 'larch', hint: "Needles? Yes. Do they drop in autumn? Yes." },
        { label: "Soft needles in tufts; bare all winter", emoji: '❄️', group: 'larch' },
        { label: "Long needles in pairs, green all winter", emoji: '🌲', group: 'pine' },
        { label: "Needles that stay all year, and woody cones", emoji: '🌰', group: 'pine' },
        { label: "Leaves with wavy, rounded lobes", emoji: '🌳', group: 'oak' },
        { label: "Lobed leaves near a pile of acorns", emoji: '🍃', group: 'oak' },
        { label: "Small toothed leaves with no lobes", emoji: '🌿', group: 'birch', hint: "No needles, and no lobes…" },
        { label: "Triangle-shaped leaves and papery white bark", emoji: '📜', group: 'birch' }
      ]
    },
    quiz: [
      { q: "What kind of questions does a branching key use?", choices: ["Riddles with no answer", "Yes-or-no questions about features you can check", "Questions about your favourite colour"], answer: 1, hint: "Each answer sends you down one branch.", explain: "A key uses yes-or-no questions about features anyone can check." },
      { q: "Which is a good key question?", choices: ["Does it have six legs?", "Is it cute?", "Is it my favourite?"], answer: 0, hint: "Could everyone agree on the answer?", explain: "Anyone can count legs, so everyone gets the same answer." },
      { q: "Using the key: a tree has needles that stay green all winter. What is it?", choices: ["Larch", "Birch", "Pine"], answer: 2, hint: "Needles: yes. Drop in autumn: no.", explain: "Needles that don't drop in autumn: a pine." },
      { q: "Which conifer loses its needles in autumn?", choices: ["The larch", "The pine", "The spruce"], answer: 0, hint: "It's in Nutmeg's key.", explain: "The larch is a conifer that drops its needles every autumn." },
      { q: "Each yes-or-no question splits a group exactly in half. How many questions do you need to tell 8 things apart?", choices: ["8", "4", "3"], answer: 2, hint: "8 → 4 → 2 → 1.", explain: "8 halves to 4, then 2, then 1: three questions." }
    ]
  })
];

/* ------------------------------------------------------------ Earth & Weather (Grandpa Bramble) */

/** A guide to chat with in the Root Hall (every Earth & Weather lesson has one). */
const guide = (name, role, look, intro, topics, challenge, farewell, portrayal = 'generic') => ({ npc: { name, role, look, portrayal }, intro, topics: topics.map(([ask, answer]) => ({ ask, answer })), challenge, farewell });

const FOREST_EARTH = [
  // ───────────── Ring 1: Root Hollow (about age 6–7) ─────────────
  lesson('earth1-forest-seasons', 1, "Four Seasons on the Great Tree", 'seasons', 'The seasons', "Spring, summer, autumn and winter: watch the forest change all year.", ['chat', 'sort'], {
    reading: [
      card("Four seasons", '🗓️', "Many places have four seasons: spring, summer, autumn and winter. Each one has its own weather, and the forest changes with it."),
      card("Spring and summer", '🌸', "In spring, the days grow longer and warmer, buds open and birds build nests. Summer is the warmest season, with the longest days."),
      card("Autumn and winter", '🍂', "In autumn, many trees drop their leaves and squirrels hide nuts. Winter is the coldest season, with the shortest days. Some animals sleep right through it."),
      card("Why seasons happen", '🌍', "The Earth is tilted. For part of the year, our half of the Earth leans toward the Sun and gets more sunshine: that's summer. When it leans away, it's winter.")
    ],
    dialogue: guide("Willow, a forest ranger", "a forest ranger", 'ranger',
      "Hello there! I'm Willow. I look after these woods all year round, so I see every season come and go. Ask me anything!",
      [
        ["What happens in spring?", "Everything wakes up! Buds burst open, frogs lay their eggs in the pond and birds sing to find a partner. The days get longer, too."],
        ["What do you like about summer?", "Long, warm days! The trees are full of green leaves, and baby birds learn to fly. I take my water bottle on every walk."],
        ["Why do leaves fall in autumn?", "The days get shorter and colder, so many trees drop their leaves and rest for the winter. First the leaves turn yellow, orange and red. Crunch, crunch!"],
        ["Where do the animals go in winter?", "Some sleep through it, like hedgehogs and dormice. Some birds fly away to warmer places. And squirrels dig up the nuts they hid in autumn."]
      ],
      { q: "In which season do many trees drop their leaves?", choices: ["Spring", "Autumn", "Summer"], answer: 1, explain: "In autumn the days get shorter and colder, and many trees drop their leaves." },
      "Come back next season — the woods will look different!"),
    sort: {
      q: "Help Willow sort these into the season they belong to!",
      groups: [{ id: 'spring', label: "Spring", emoji: '🌸' }, { id: 'summer', label: "Summer", emoji: '☀️' }, { id: 'autumn', label: "Autumn", emoji: '🍂' }, { id: 'winter', label: "Winter", emoji: '❄️' }],
      items: [
        { label: "Buds burst open", emoji: '🌱', group: 'spring' },
        { label: "Frogspawn in the pond", emoji: '🐸', group: 'spring' },
        { label: "Baby birds hatch", emoji: '🐣', group: 'spring' },
        { label: "Long, hot days", emoji: '😎', group: 'summer' },
        { label: "Ripe wild strawberries", emoji: '🍓', group: 'summer' },
        { label: "Swimming in the lake", emoji: '🏊', group: 'summer' },
        { label: "Leaves turn red and gold", emoji: '🍁', group: 'autumn' },
        { label: "Squirrels bury nuts", emoji: '🐿️', group: 'autumn' },
        { label: "Mushrooms pop up", emoji: '🍄', group: 'autumn' },
        { label: "Snow on the branches", emoji: '⛄', group: 'winter' },
        { label: "Hedgehogs fast asleep", emoji: '🦔', group: 'winter', hint: "Hedgehogs sleep through the coldest season." },
        { label: "The shortest days", emoji: '🌙', group: 'winter' }
      ]
    },
    quiz: [
      { q: "Which is the warmest season?", choices: ["Winter", "Summer", "Autumn"], answer: 1, hint: "Think of long, hot days.", explain: "Summer is the warmest season, with the longest days." },
      { q: "In which season do buds open and frogs lay their eggs?", choices: ["Spring", "Autumn", "Winter"], answer: 0, hint: "Everything wakes up…", explain: "In spring the forest wakes up: buds open and frogs lay their eggs." },
      { q: "What do hedgehogs do in winter?", choices: ["Fly south", "Build snowmen", "Sleep through it"], answer: 2, hint: "Willow told you.", explain: "Hedgehogs sleep through the winter. This long winter sleep is called hibernation." },
      { q: "Which season has the shortest days?", choices: ["Summer", "Winter", "Spring"], answer: 1, hint: "It's the coldest season too.", explain: "Winter has the shortest days and the longest nights." },
      { q: "Which season comes after autumn?", choices: ["Winter", "Spring", "Summer"], answer: 0, hint: "Spring, summer, autumn, …", explain: "Spring, summer, autumn, winter, and then spring again." }
    ]
  }),
  lesson('earth1-forest-weather', 1, "What's the Weather Today?", 'weather-types', 'Kinds of weather', "Sunny, rainy, windy or snowy? Read the sky, and dress for it.", ['chat', 'sort', 'treasure'], {
    reading: [
      card("Weather", '🌦️', "Weather is what the air outside is like right now: sunny or cloudy, warm or cold, wet or dry, still or windy."),
      card("Weather words", '☀️', "Sunny, cloudy, rainy, windy, snowy, foggy, stormy. Weather reports use little pictures for each one: a sun, a cloud, raindrops, a snowflake."),
      card("Dress for it", '🧥', "Check the weather before you go out! Wellies and a raincoat for rain, a sun hat for sunshine, a warm coat and mittens for snow."),
      card("Nature's clues", '🌲', "Some plants show the weather. A pine cone opens its scales when the air is dry, and closes them when the air is damp.")
    ],
    dialogue: guide("Rowan, a young weather watcher", "a boy who keeps a weather diary", 'guide',
      "Hi! I'm Rowan. Every morning I look out of my treehouse window and draw the weather in my diary. Want to see?",
      [
        ["What did you draw today?", "A sun peeking out from behind a cloud! That means sunny spells: sometimes sunny, sometimes cloudy."],
        ["How do you know if it's windy?", "I look at the trees. If the leaves are dancing and the branches sway, it's windy! Kites love windy days."],
        ["What's your favourite weather?", "Snow! Everything goes quiet and white. But I like rainy days too, for jumping in puddles in my wellies."],
        ["Can a pine cone tell the weather?", "Sort of! When the air is dry, its scales open up. When the air is damp, they close. It shows how much water is in the air."]
      ],
      { q: "Rowan sees the branches swaying and the leaves dancing. What is the weather like?", choices: ["Foggy", "Snowy", "Windy"], answer: 2, explain: "Swaying branches and dancing leaves mean it's windy." },
      "Thanks for visiting! Don't forget to look at the sky tomorrow."),
    sort: {
      q: "What should Rowan take outside? Sort the things by the weather they're for!",
      groups: [{ id: 'rain', label: "Rainy day", emoji: '🌧️' }, { id: 'sun', label: "Sunny day", emoji: '☀️' }, { id: 'snow', label: "Snowy day", emoji: '❄️' }],
      items: [
        { label: "Wellies", emoji: '👢', group: 'rain' },
        { label: "Umbrella", emoji: '☂️', group: 'rain' },
        { label: "Raincoat", emoji: '🧥', group: 'rain' },
        { label: "Sun hat", emoji: '👒', group: 'sun' },
        { label: "Sunglasses", emoji: '🕶️', group: 'sun' },
        { label: "Sun cream", emoji: '🧴', group: 'sun' },
        { label: "Mittens", emoji: '🧤', group: 'snow' },
        { label: "Woolly scarf", emoji: '🧣', group: 'snow' },
        { label: "Sledge", emoji: '🛷', group: 'snow' }
      ]
    },
    artifact: { model: 'pinecone', name: "A weather pine cone", text: "A pine cone's scales protect its seeds. In dry weather the scales open, so the seeds can fall out and fly away on the wind. In damp weather they close up tight. People have hung pine cones outside as a simple weather sign for a very long time." },
    quiz: [
      { q: "What is weather?", choices: ["What the air outside is like right now", "A kind of tree", "The name of a cloud"], answer: 0, hint: "Sunny, rainy, windy…", explain: "Weather is what the air outside is like right now." },
      { q: "What should you wear on a rainy day?", choices: ["A sun hat", "Wellies and a raincoat", "Nothing special"], answer: 1, hint: "Stay dry!", explain: "Wellies and a raincoat keep you dry in the rain." },
      { q: "What does a pine cone do when the air is dry?", choices: ["It closes its scales", "It turns blue", "It opens its scales"], answer: 2, hint: "Dry weather is good for seeds to fly.", explain: "In dry air the scales open, so the seeds can fall out and blow away." },
      { q: "Which picture would a weather report use for snow?", choices: ["❄️", "☀️", "🌈"], answer: 0, hint: "Think of something cold and white.", explain: "A snowflake means snow." },
      { q: "Swaying trees tell us it is…", choices: ["Foggy", "Windy", "Snowy"], answer: 1, hint: "Something is pushing the branches.", explain: "Moving air, the wind, makes the trees sway." }
    ]
  }),

  // ───────────── Ring 2: Fern Boughs (about age 7–8) ─────────────
  lesson('earth2-forest-water-cycle', 2, "Where Does Rain Come From?", 'water-cycle', 'The water cycle', "Follow a raindrop up into the sky and back down again.", ['chat', 'sort', 'experiment'], {
    reading: [
      card("Round and round", '🔄', "The water on Earth is used again and again. It goes up into the sky, comes back down, and goes up again. This journey is called the water cycle."),
      card("Up: evaporation", '☀️', "The Sun warms puddles, lakes and the sea. Some water turns into an invisible gas called water vapour and rises into the air. Leaves give out water vapour too."),
      card("Clouds: condensation", '☁️', "High up, the air is cooler. The vapour cools and turns into tiny droplets of water. Millions of droplets together make a cloud."),
      card("Down: precipitation", '🌧️', "When the droplets join up and get too heavy, they fall as rain, or as snow or hail when it's cold. Then the water flows into rivers and back to the sea.")
    ],
    dialogue: guide("Brook, a water scientist", "a scientist who studies rain and rivers", 'explorer',
      "Hello! I'm Brook. I study where water goes: from the clouds, through the forest, into the rivers and out to the sea.",
      [
        ["Is rain new water?", "No! The water in your raindrop has been round the water cycle many, many times. Some of it may once have been in a puddle, a river, or even a dinosaur's drink!"],
        ["Why do puddles disappear?", "The Sun and the wind help the water evaporate. It turns into water vapour and rises into the air, where you can't see it."],
        ["What's the difference between rain, snow and hail?", "They are all water falling from clouds. Rain is liquid water. Snow is ice crystals that grew in cold clouds. Hail is balls of ice that grow inside big thunderclouds."],
        ["How do trees help the water cycle?", "Trees drink water through their roots and let water vapour out through tiny holes in their leaves. A big forest puts lots of water back into the air."]
      ],
      { q: "What do we call it when water vapour cools and turns into tiny droplets?", choices: ["Evaporation", "Condensation", "Melting"], answer: 1, explain: "Condensation: the vapour cools and turns into droplets, and the droplets make clouds." },
      "Next time it rains, think of the long journey your raindrops have made!"),
    sort: {
      q: "Where is the water in its journey? Sort Brook's cards!",
      groups: [{ id: 'up', label: "Going up (evaporation)", emoji: '⬆️' }, { id: 'cloud', label: "Making clouds (condensation)", emoji: '☁️' }, { id: 'down', label: "Falling (precipitation)", emoji: '⬇️' }, { id: 'flow', label: "Flowing back (collection)", emoji: '🏞️' }],
      items: [
        { label: "A puddle drying in the sun", emoji: '☀️', group: 'up' },
        { label: "Leaves giving out water vapour", emoji: '🌿', group: 'up' },
        { label: "Sea water warmed by the Sun", emoji: '🌊', group: 'up' },
        { label: "Tiny droplets gathering high up", emoji: '💧', group: 'cloud' },
        { label: "Mist on a cold window", emoji: '🪟', group: 'cloud', hint: "Water vapour in the air cools on the cold glass and turns into droplets." },
        { label: "A fluffy white cloud", emoji: '⛅', group: 'cloud' },
        { label: "Raindrops", emoji: '🌧️', group: 'down' },
        { label: "Snowflakes", emoji: '❄️', group: 'down' },
        { label: "Hailstones", emoji: '🧊', group: 'down' },
        { label: "A stream running downhill", emoji: '🏞️', group: 'flow' },
        { label: "A river reaching the sea", emoji: '🐟', group: 'flow' },
        { label: "Rain soaking into the soil", emoji: '🪱', group: 'flow' }
      ]
    },
    sim: {
      id: 'states',
      predict: { q: "Brook heats a pan of water. What rises from it?", choices: ["Smoke", "Water vapour, which forms steam as it cools", "Nothing at all"], answer: 1, explain: "Heat turns water into water vapour. Just above the pan it cools and forms tiny droplets: the steam you see is a little cloud!" }
    },
    quiz: [
      { q: "What do we call it when the Sun turns water into water vapour?", choices: ["Evaporation", "Condensation", "Precipitation"], answer: 0, hint: "The water goes up…", explain: "Evaporation turns liquid water into water vapour, which rises into the air." },
      { q: "What is a cloud made of?", choices: ["Cotton wool", "Smoke", "Tiny droplets of water or bits of ice"], answer: 2, hint: "Think about condensation.", explain: "Clouds are made of millions of tiny water droplets or ice crystals." },
      { q: "Rain, snow and hail are all kinds of…", choices: ["Evaporation", "Precipitation", "Wind"], answer: 1, hint: "Water falling from clouds.", explain: "Water falling from clouds is called precipitation." },
      { q: "Where do most rivers carry their water in the end?", choices: ["Back to the sea", "To the Moon", "Into the clouds forever"], answer: 0, hint: "Follow a river downhill.", explain: "Rivers flow downhill to the sea, and the cycle starts again." },
      { q: "Is the water in today's rain brand new?", choices: ["Yes, clouds make new water", "No, it has gone round the cycle many times"], answer: 1, hint: "Brook told you about the dinosaurs.", explain: "The same water goes round and round the water cycle, again and again." }
    ]
  }),
  lesson('earth2-forest-clouds', 2, "Reading the Clouds", 'cloud-types', 'Kinds of clouds', "Meet Luke Howard, who named the clouds, and find each kind in the sky.", ['chat', 'maphunt'], {
    reading: [
      card("Clouds have names", '☁️', "In 1802, Luke Howard, a young chemist in London who loved watching the sky, gave the clouds Latin names. We still use his names today."),
      card("Cumulus and stratus", '🐑', "Cumulus clouds are puffy heaps, like cotton wool or sheep, and often mean fair weather. Stratus clouds are flat grey sheets that cover the sky and can bring drizzle."),
      card("Cirrus", '🪶', "Cirrus clouds are thin, wispy streaks very high in the sky, made of ice crystals. They can be a sign that the weather will change."),
      card("Cumulonimbus", '⛈️', "A cumulonimbus is a giant tower of cloud. It brings heavy rain, thunder and lightning, and sometimes hail. Time to go indoors!")
    ],
    dialogue: guide("Luke Howard, who named the clouds", "a chemist and cloud watcher (1772–1864)", 'scientist',
      "Good day! I'm Luke Howard. Ever since I was a boy, I have loved watching the clouds drift over London. One day I decided they deserved proper names!",
      [
        ["Why did you name the clouds?", "Clouds change shape all the time, so people thought they were too messy to sort. But I saw that they come in a few main kinds. Once things have names, scientists can talk about them clearly."],
        ["Why Latin names?", "In my time, scientists all over the world could read Latin. So a scientist in France or Germany could use the very same names as me."],
        ["What does 'cumulus' mean?", "It means 'heap' or 'pile'. Stratus means 'layer', cirrus means 'curl of hair', and nimbus means 'rain cloud'."],
        ["Did people like your names?", "Very much! After my talk in 1802, artists began painting my clouds and poets wrote about them. Even the great writer Goethe wrote a poem for me."]
      ],
      { q: "What does 'cumulus' mean?", choices: ["Rain", "Ice", "Heap"], answer: 2, explain: "Cumulus means 'heap': a cumulus cloud is a puffy heap." },
      "Look up whenever you can — the sky is the best show there is!", 'portrayal'),
    maphunt: {
      q: "Help Luke Howard find where each kind of cloud lives in the sky!",
      map: { regions: [
        { id: 'high', label: "High up, where it's icy", kind: 'water', points: [[0, 0], [100, 0], [100, 16], [0, 16]], at: [34, 8], emoji: '❄️' },
        { id: 'middle', label: "The middle of the sky", kind: 'water', points: [[0, 16], [100, 16], [100, 32], [0, 32]], at: [34, 24], emoji: '🐑' },
        { id: 'low', label: "Low, over the hills", kind: 'water', points: [[0, 32], [100, 32], [100, 47], [0, 47]], at: [34, 40], emoji: '🌥️' },
        { id: 'ground', label: "Down on the ground", kind: 'land', points: [[0, 47], [100, 47], [100, 60], [0, 60]], at: [34, 54], emoji: '🌾' },
        { id: 'tower', label: "The thunder tower", kind: 'water', points: [[70, 46], [73, 30], [71, 14], [66, 6], [78, 3], [92, 3], [98, 7], [88, 14], [86, 30], [90, 46]], at: [80, 22], emoji: '⛈️' }
      ] },
      clues: [
        { q: "Wispy cirrus clouds float very high, where it's cold enough for ice. Tap where they are!", region: 'high', hint: "Go right up to the top of the sky." },
        { q: "Flat grey stratus clouds hang low over the hills. Where?", region: 'low', hint: "Low means near the hills, but not on the ground." },
        { q: "Fog is a cloud that touches the ground! Where is it?", region: 'ground', hint: "Look at the very bottom." },
        { q: "Rows of small puffy clouds, like fish scales or a flock of sheep, sit in the middle of the sky. Tap there!", region: 'middle', hint: "Not the top, not the bottom…" },
        { q: "A cumulonimbus grows into a giant tower, from low down to very high. Find it!", region: 'tower', hint: "Look for the tall cloud that crosses every layer." }
      ]
    },
    quiz: [
      { q: "Who gave clouds the names we still use?", choices: ["Galileo", "Luke Howard", "Charles Darwin"], answer: 1, hint: "He loved watching the sky over London.", explain: "Luke Howard named the clouds in 1802." },
      { q: "Which cloud brings thunder and lightning?", choices: ["Cumulonimbus", "Cirrus", "Fair-weather cumulus"], answer: 0, hint: "The giant tower…", explain: "A cumulonimbus, the giant thunder tower, brings thunder, lightning and heavy rain." },
      { q: "What are cirrus clouds made of?", choices: ["Smoke", "Cotton", "Ice crystals"], answer: 2, hint: "They are very high, where it's freezing.", explain: "Cirrus clouds are so high that they're made of ice crystals." },
      { q: "What is fog?", choices: ["Smoke from a fire", "A cloud touching the ground", "Very fine snow"], answer: 1, hint: "You found it at the bottom of the sky map.", explain: "Fog is a cloud that forms right down at the ground." },
      { q: "Puffy white heaps of cloud on a sunny day are…", choices: ["Cumulus", "Stratus", "Cumulonimbus"], answer: 0, hint: "Cumulus means 'heap'.", explain: "Puffy heaps are cumulus clouds, often a sign of fair weather." }
    ]
  }),

  // ───────────── Ring 3: Lantern Branches (about age 8–9) ─────────────
  lesson('earth3-forest-soil', 3, "What Is Soil Made Of?", 'soil', 'Soil and its layers', "Dig a soil pit and find out what's in each layer.", ['chat', 'dig'], {
    reading: [
      card("More than dirt", '🟫', "Soil is a mix of tiny bits of broken rock, rotting leaves and twigs (called humus), water and air. And it's full of living things!"),
      card("Layers", '🍰', "Dig a deep hole and you'll see layers. On top lie fallen leaves. Then comes dark topsoil, full of humus and roots. Then paler subsoil with stones. At the bottom is solid rock: bedrock."),
      card("Soil is slow to make", '🐢', "Rain, frost and roots crack rock into tiny pieces, and worms and fungi mix in rotting plants. It can take hundreds of years to make a layer of soil as thick as your finger."),
      card("Worms are helpers", '🪱', "Earthworms tunnel through the soil, letting in air and water, and pull leaves down to eat. Their droppings make the soil richer.")
    ],
    dialogue: guide("Dr. Clay, a soil scientist", "a soil scientist", 'botanist',
      "Hello, explorer! I'm Dr. Clay. Most people walk on soil without thinking about it, but I think it's one of the most amazing things on Earth!",
      [
        ["What's soil made of?", "Broken-up rock, rotting plant bits called humus, water and air. And living things! One spoonful of healthy soil can hold billions of tiny living things, far too small to see."],
        ["Why is topsoil dark?", "Because it's full of humus: old leaves, roots and creatures that have rotted away. Humus is like food for plants."],
        ["What's the difference between sand and clay?", "Sand grains are big enough to see and feel gritty, and water drains through them fast. Clay bits are super tiny and sticky, and they hold on to water."],
        ["How can I help the soil?", "Let fallen leaves rot where they lie, add compost, and don't trample bare soil too much. And say thank you to the worms!"]
      ],
      { q: "What is humus?", choices: ["A kind of rock", "Rotted plant and animal bits in the soil", "A bug that eats soil"], answer: 1, explain: "Humus is what old leaves, roots and creatures become when they rot. It makes topsoil dark and rich." },
      "Happy digging — gently!"),
    dig: {
      q: "Dig a soil pit with Dr. Clay, and find out what's in each layer!",
      w: 5, h: 4,
      finds: [
        { at: [2, 0], emoji: '🍂', label: "Leaf litter", text: "The top layer is fallen leaves and twigs, slowly rotting.", question: { q: "What will these old leaves become?", choices: ["Plastic", "Humus, food for the soil", "New rocks"], answer: 1, hint: "They rot away slowly…", explain: "Worms, fungi and tiny living things break the leaves down into humus." } },
        { at: [1, 1], emoji: '🪱', label: "An earthworm", text: "Earthworms live in the dark topsoil.", question: { q: "How do earthworms help the soil?", choices: ["They make tunnels for air and water", "They make the soil freeze", "They eat the rocks"], answer: 0, hint: "Think about their tunnels.", explain: "Worm tunnels let air and water into the soil, and worm droppings make it richer." } },
        { at: [3, 2], emoji: '🪨', label: "Stones in the subsoil", text: "Deeper down, the soil is paler, with more stones and less humus.", question: { q: "Why is the subsoil paler than the topsoil?", choices: ["It is painted", "It is made of snow", "It has less humus"], answer: 2, hint: "What makes topsoil dark?", explain: "Humus makes topsoil dark. The subsoil has much less of it, so it's paler." } },
        { at: [2, 3], emoji: '⛰️', label: "Bedrock", text: "At the bottom is solid rock: bedrock. Soil forms when rock like this slowly breaks into tiny pieces.", question: { q: "What turns rock into tiny soil pieces, very slowly?", choices: ["Rain, frost and roots", "One sunny day", "Birdsong"], answer: 0, hint: "Think of water freezing in cracks, and roots pushing.", explain: "Rain, frost and growing roots crack rock into smaller and smaller pieces over many years." } }
      ]
    },
    quiz: [
      { q: "Which of these is NOT a natural part of soil?", choices: ["Tiny bits of rock", "Plastic toys", "Humus"], answer: 1, hint: "Soil is made by nature.", explain: "Soil is made of rock bits, humus, water, air and living things. Plastic doesn't belong there." },
      { q: "Which is the deepest layer?", choices: ["Topsoil", "Leaf litter", "Bedrock"], answer: 2, hint: "It's solid rock.", explain: "Bedrock is the solid rock at the bottom." },
      { q: "Which soil holds on to water best?", choices: ["Clay", "Sand", "Gravel"], answer: 0, hint: "Its bits are tiny and sticky.", explain: "Clay's tiny, sticky bits hold on to water. Water drains quickly through sand and gravel." },
      { q: "Why is topsoil dark?", choices: ["It is wet paint", "It is full of humus", "It is always in the shade"], answer: 1, hint: "Dr. Clay told you.", explain: "Topsoil is dark because it's full of humus, rotted leaves and roots." },
      { q: "How long can it take to make a layer of soil as thick as your finger?", choices: ["One day", "One week", "Hundreds of years"], answer: 2, hint: "Soil is very slow to make.", explain: "It can take hundreds of years, so soil is precious!" }
    ]
  }),
  lesson('earth3-forest-fossils', 3, "Fossils: Stories in Stone", 'fossils', 'Fossils and rock layers', "How do shells, bones and footprints turn to stone? Read the rock layers like a timeline.", ['chat', 'timeline'], {
    reading: [
      card("What is a fossil?", '🦴', "A fossil is the remains or trace of a living thing from long, long ago, kept in rock. Shells, bones, teeth, leaves and even footprints can become fossils."),
      card("How fossils form", '⏳', "A plant or animal is buried quickly in mud or sand. Over millions of years the mud turns to rock, and minerals slowly fill the shape. It turns to stone!"),
      card("Trace fossils", '👣', "Some fossils aren't body parts at all: footprints, burrows, nests and even dinosaur poo! They show what living things did."),
      card("Rock layers are a timeline", '📚', "Rock forms in layers, one on top of another. Usually, the deeper layers are older. Fossils in the deep layers lived earlier than fossils near the top.")
    ],
    dialogue: guide("Pebble, a young fossil hunter", "a girl who hunts for fossils", 'explorer',
      "Hi! I'm Pebble. I search cliffs and riverbanks for fossils. Yesterday I found a curly shell that's millions of years old!",
      [
        ["What did you find?", "An ammonite! It was a sea creature with a curly shell, a bit like a snail's, that lived when the dinosaurs did. Ammonites died out about 66 million years ago."],
        ["Can anything become a fossil?", "Most living things just rot away. To become a fossil, they usually need to be buried quickly in mud or sand, where they can't rot so easily. That's why fossils are rare treasures!"],
        ["Where should I look for fossils?", "In rocks made from layers of mud and sand, like some cliffs and quarries. Always go with a grown-up, keep away from falling rocks, and check the tide on beaches."],
        ["How do we know how old a fossil is?", "The rock layers help: deeper layers are usually older. Scientists can also measure tiny changes inside some rocks that work like a very slow clock."]
      ],
      { q: "Which of these is a trace fossil?", choices: ["A dinosaur bone", "A dinosaur footprint", "A shark's tooth"], answer: 1, explain: "A footprint shows what an animal did, not part of its body: that makes it a trace fossil." },
      "Keep your eyes open — the next stone you pick up might hold a secret!"),
    timeline: {
      title: "Life written in the rocks",
      events: [
        { label: "The first fish swim in the sea", year: -520000000, when: "about 520 million years ago" },
        { label: "The first trees grow, and forests spread", year: -385000000, when: "about 385 million years ago" },
        { label: "The first dinosaurs appear", year: -230000000, when: "about 230 million years ago" },
        { label: "The ammonites and the big dinosaurs die out", year: -66000000, when: "about 66 million years ago" },
        { label: "Our own species, humans, appears", year: -300000, when: "about 300,000 years ago" }
      ]
    },
    quiz: [
      { q: "What is a fossil?", choices: ["A shiny new pebble", "The remains or trace of a living thing from long ago, kept in rock", "A kind of plant"], answer: 1, hint: "Stories in stone…", explain: "A fossil is what's left in rock of a living thing, or of what it did, long ago." },
      { q: "Which rock layer is usually the oldest?", choices: ["The deepest one", "The top one", "They are all the same age"], answer: 0, hint: "New layers settle on top of old ones.", explain: "Layers pile up on top of each other, so the deepest are usually the oldest." },
      { q: "Why do most living things never become fossils?", choices: ["They are too heavy", "They fly away", "They rot away before they're buried"], answer: 2, hint: "Fossils need a quick burial.", explain: "Most living things rot away. Only ones buried quickly have a chance to become fossils." },
      { q: "When did the ammonites and the big dinosaurs die out?", choices: ["About 66 million years ago", "Last year", "About 100 years ago"], answer: 0, hint: "Look at your timeline.", explain: "They died out about 66 million years ago, long before the first humans." },
      { q: "What should you always do when fossil hunting on a beach?", choices: ["Climb the cliffs alone", "Go with a grown-up and check the tide", "Dig under the cliff"], answer: 1, hint: "Safety first!", explain: "Always go with a grown-up, keep away from falling rocks, and check the tide." }
    ]
  }),

  // ───────────── Ring 4: Blossom Canopy (about age 9–10) ─────────────
  lesson('earth4-forest-rivers', 4, "How Rivers Shape the Land", 'rivers', 'Rivers and erosion', "From a tiny spring to the sea: how rivers carve valleys, loops and new land.", ['chat', 'maphunt'], {
    reading: [
      card("From source to sea", '🏞️', "A river starts at its source, often a spring or melting snow high in the hills. It flows downhill, joined by smaller streams, until it reaches its mouth at the sea or a lake."),
      card("Wearing the land away", '🪨', "Fast water carries stones and sand that scrape the riverbed. This wearing away is called erosion. Over thousands of years, a river can carve a deep valley."),
      card("Bends and loops", '〰️', "On flatter land, a river slows down and swings in big bends called meanders. The water flows fastest on the outside of a bend, wearing the bank away, and drops sand on the inside."),
      card("Dropping its load", '🦆', "Where a river slows down at the sea, it drops the mud and sand it was carrying. Over time, this can build new land called a delta.")
    ],
    dialogue: guide("Fen, a river guide", "a river guide who paddles a canoe", 'sailor',
      "Ahoy from the riverbank! I'm Fen. I've paddled this river from the hills all the way to the sea. Hop in my canoe, and I'll show you how it shapes the land!",
      [
        ["Where does the river begin?", "Up in the hills, as a little spring bubbling out of the ground. It's so small there that you could step right over it!"],
        ["Why is the water so fast in the hills?", "The land is steep, so the water rushes downhill. Fast water can roll stones along and carve a steep, V-shaped valley."],
        ["How does a waterfall form?", "Where a river flows over hard rock onto softer rock, the soft rock wears away faster. A step forms, and the water tumbles over it."],
        ["Why does the river wiggle so much near the sea?", "The land is flat, so the river slows down and swings into big bends called meanders. Sometimes a loop gets cut off and becomes a curved lake: an oxbow lake!"]
      ],
      { q: "What do we call the wearing away of land by moving water?", choices: ["Evaporation", "Hibernation", "Erosion"], answer: 2, explain: "Erosion is the wearing away of land by moving water, wind or ice." },
      "Paddle safe! And remember: rivers are always busy, even when they look calm."),
    maphunt: {
      q: "Paddle down the river with Fen, from the spring to the sea!",
      map: { regions: [
        { id: 'plain', label: "The flat plain", kind: 'land', points: [[0, 22], [20, 20], [34, 14], [40, 0], [100, 0], [100, 26], [86, 30], [80, 34], [70, 36], [68, 44], [74, 50], [70, 60], [0, 60]], at: [20, 50] },
        { id: 'hills', label: "The hills", kind: 'land', points: [[0, 0], [40, 0], [34, 14], [20, 20], [0, 22]], at: [6, 16], emoji: '⛰️' },
        { id: 'river', label: "The river", kind: 'water', points: [[12, 10], [25, 14], [31, 22], [36, 27], [66, 33], [73, 38], [80, 40], [80, 44], [72, 42], [64, 37], [33, 31], [28, 25], [23, 17], [11, 12]], at: [36, 29] },
        { id: 'source', label: "The spring (the source)", kind: 'water', points: [[9, 5], [17, 5], [17, 11], [9, 11]], emoji: '💧' },
        { id: 'waterfall', label: "The waterfall", kind: 'water', points: [[24, 13], [31, 13], [31, 22], [24, 22]], emoji: '💦' },
        { id: 'meanders', label: "The big bends (meanders)", kind: 'water', points: [[32, 26], [44, 23], [50, 31], [58, 27], [67, 33], [64, 38], [56, 33], [48, 38], [42, 30], [34, 32]], at: [50, 26], emoji: '〰️' },
        { id: 'oxbow', label: "The oxbow lake", kind: 'water', points: [[42, 42], [49, 40], [55, 43], [51, 49], [43, 48]], emoji: '🦢' },
        { id: 'delta', label: "The delta", kind: 'land', points: [[70, 36], [80, 34], [88, 40], [86, 50], [74, 50], [68, 44]], emoji: '🦆' },
        { id: 'sea', label: "The sea", kind: 'water', points: [[86, 30], [100, 26], [100, 60], [70, 60], [86, 50], [88, 40]], at: [92, 52], emoji: '🌊' }
      ] },
      clues: [
        { q: "Every river starts somewhere. Tap the river's source, high in the hills.", region: 'source', hint: "Look for a little spring at the top left." },
        { q: "Here the river drops over a step of hard rock. Where?", region: 'waterfall', hint: "Where the hills meet the plain." },
        { q: "On the flat land the river swings in big loops. Find the meanders!", region: 'meanders', hint: "Look for the wiggly part in the middle." },
        { q: "One loop got cut off and became a curved lake. Tap it!", region: 'oxbow', hint: "It's below the wiggles, all on its own." },
        { q: "The river slows down and drops its mud, building new land. Where?", region: 'delta', hint: "Just before the river meets the sea." },
        { q: "Where does the river end its journey?", region: 'sea', hint: "Go as far east as you can." }
      ]
    },
    quiz: [
      { q: "Where does a river begin?", choices: ["At its mouth", "At its source", "At the delta"], answer: 1, hint: "Often a spring high in the hills.", explain: "A river begins at its source, often a spring or melting snow." },
      { q: "What is a meander?", choices: ["A big bend in a river", "A kind of fish", "A waterfall"], answer: 0, hint: "Fen's river wiggled near the sea.", explain: "A meander is a big, looping bend in a river." },
      { q: "On a river bend, where is the water fastest?", choices: ["On the inside of the bend", "It is the same everywhere", "On the outside of the bend"], answer: 2, hint: "Which bank gets worn away?", explain: "Water flows fastest on the outside of a bend, so that bank wears away." },
      { q: "What is a delta made of?", choices: ["Ice", "Mud and sand the river dropped", "Tree roots"], answer: 1, hint: "The river slows down at the sea…", explain: "A delta is new land built from mud and sand that the river dropped." },
      { q: "How does a waterfall form?", choices: ["Softer rock below wears away faster than hard rock above", "Someone builds a wall", "The river freezes"], answer: 0, hint: "Hard rock and soft rock…", explain: "The soft rock below wears away faster, leaving a step of hard rock for the water to tumble over." }
    ]
  }),
  lesson('earth4-forest-wind', 4, "Wind: Air on the Move", 'wind', 'Wind', "What makes the wind blow, which way it comes from, and how strong it is.", ['chat', 'sort'], {
    reading: [
      card("What is wind?", '🌬️', "Wind is air moving from one place to another. We can't see air, but we can see what it does: leaves dance, clouds drift and kites fly."),
      card("Why air moves", '☀️', "The Sun warms some places more than others. Warm air rises, and cooler air rushes in to take its place. That rushing air is wind."),
      card("Which way?", '🧭', "A wind is named after where it comes FROM: a west wind blows from the west toward the east. A wind vane's arrow points into the wind, toward where it's coming from."),
      card("How strong?", '🌳', "In 1805, Francis Beaufort, an officer in the navy, made a scale from 0 to 12 that describes wind by what you can see: from smoke rising straight up (0) to a hurricane (12).")
    ],
    dialogue: guide("Gale, a kite maker", "a kite maker who reads the wind", 'guide',
      "Whoosh! Hello! I'm Gale. I make kites, so I have to be an expert on wind. Shall we find out which way it's blowing today?",
      [
        ["Why does the wind blow?", "Because the Sun heats the ground unevenly. Warm air rises, and cool air flows in underneath. At the seaside on a sunny day, you can feel a cool breeze blowing in from the sea."],
        ["How do you know where the wind comes from?", "I look at my wind vane: its arrow points into the wind. Or I hold up a wet finger: the side that feels coldest is facing the wind!"],
        ["What's the best wind for kites?", "A steady breeze, when leaves and small twigs keep moving. Too little wind and the kite flops; too much and it pulls too hard!"],
        ["How does the wind help plants?", "It carries their seeds and pollen far away. Dandelion seeds and sycamore 'helicopters' ride the wind to new places."]
      ],
      { q: "A west wind blows…", choices: ["Toward the west", "From the west", "Straight up"], answer: 1, explain: "Winds are named after where they come from, so a west wind blows from the west." },
      "May the wind be just right for your kite!"),
    sort: {
      q: "How strong is the wind? Sort what Gale saw, using Beaufort's scale!",
      groups: [{ id: 'calm', label: "Calm (0)", emoji: '😶' }, { id: 'breeze', label: "Breeze (2–4)", emoji: '🪁' }, { id: 'strong', label: "Strong wind (6–8)", emoji: '💨' }, { id: 'storm', label: "Storm (9 and up)", emoji: '🌀' }],
      items: [
        { label: "Campfire smoke rises straight up", emoji: '🔥', group: 'calm' },
        { label: "The pond is flat, like a mirror", emoji: '🪞', group: 'calm' },
        { label: "Leaves rustle; you feel it on your face", emoji: '🍃', group: 'breeze' },
        { label: "Small twigs keep moving; flags flutter", emoji: '🚩', group: 'breeze' },
        { label: "Loose paper blows along", emoji: '📄', group: 'breeze' },
        { label: "It's hard to hold an umbrella", emoji: '☂️', group: 'strong' },
        { label: "Whole trees sway", emoji: '🌲', group: 'strong' },
        { label: "Twigs snap off the trees", emoji: '🪵', group: 'strong' },
        { label: "Roof tiles blow off", emoji: '🏠', group: 'storm' },
        { label: "Trees blown over, roots and all", emoji: '🌳', group: 'storm' }
      ]
    },
    quiz: [
      { q: "What is wind?", choices: ["Moving air", "Water in the sky", "Light from the Sun"], answer: 0, hint: "We can't see it, but we can feel it.", explain: "Wind is air moving from one place to another." },
      { q: "Which way does a wind vane's arrow point?", choices: ["Always north", "Into the wind, toward where it comes from", "Toward the ground"], answer: 1, hint: "Winds are named after where they come from.", explain: "A wind vane's arrow points into the wind, toward where it is coming from." },
      { q: "Who made a wind scale from 0 to 12 in 1805?", choices: ["Luke Howard", "Isaac Newton", "Francis Beaufort"], answer: 2, hint: "He was an officer in the navy.", explain: "Francis Beaufort made his wind scale in 1805, and sailors still use it." },
      { q: "On a sunny day at the beach, the cool breeze usually blows…", choices: ["From the sea toward the land", "From the land toward the sea", "Straight down"], answer: 0, hint: "The land warms up faster, and warm air rises.", explain: "Warm air rises over the land, and cooler air flows in from the sea: a sea breeze." },
      { q: "On Beaufort's scale, what does 0 mean?", choices: ["A hurricane", "A gentle breeze", "Calm: smoke rises straight up"], answer: 2, hint: "The smallest number…", explain: "0 means calm: the air is still, and smoke rises straight up." }
    ]
  }),

  // ───────────── Ring 5: Nest Heights (about age 10–11) ─────────────
  lesson('earth5-forest-weather-station', 5, "The Weather Station", 'weather-measuring', 'Measuring the weather', "Thermometers, rain gauges, wind vanes and anemometers: measure the weather like a scientist.", ['chat', 'sort', 'timeline'], {
    reading: [
      card("Measuring, not guessing", '📏', "Weather scientists measure the weather with instruments, at the same times every day. Then they can fairly compare days, places and years."),
      card("Temperature and rain", '🌡️', "A thermometer measures how hot or cold the air is, in degrees Celsius (°C). A rain gauge catches rain, and we measure how deep the water is, in millimetres."),
      card("Wind", '🧭', "A wind vane shows the wind's direction. An anemometer, with little cups that spin, measures its speed: the faster the cups spin, the stronger the wind."),
      card("Fair readings", '🏕️', "A thermometer goes in the shade, well above the ground, so sunshine doesn't fool it. A rain gauge stands in the open, away from trees and roofs.")
    ],
    dialogue: guide("Hana, a meteorologist", "a weather scientist at the forest weather station", 'scientist',
      "Welcome to my weather station! I'm Hana. Every morning at nine o'clock, I read all my instruments and write down the numbers. Want to help?",
      [
        ["Why measure at the same time every day?", "So the numbers are fair to compare. The air at noon is warmer than at dawn, so if I measured at different times, I'd be fooling myself!"],
        ["Why is the thermometer in a white box?", "The box keeps sunshine off it but lets the air flow through its slatted sides. The white paint reflects sunlight. That way I measure the air, not the sunshine."],
        ["Who measured rain first?", "People have measured rain for more than 2,000 years. In 1441 in Korea, King Sejong's court sent rain gauges of the same size all over the kingdom, so the rain in every village could be compared fairly."],
        ["What's an anemometer?", "A wind-speed meter! Its cups catch the wind and spin round. A counter turns the spins into a speed, like 15 kilometres an hour."]
      ],
      { q: "Which instrument measures how much rain fell?", choices: ["A thermometer", "A wind vane", "A rain gauge"], answer: 2, explain: "A rain gauge catches the rain, and we measure how deep the water is." },
      "Thanks, weather helper! Write your numbers neatly — scientists of the future may read them."),
    sort: {
      q: "Which instrument gave each reading? Sort Hana's notebook!",
      groups: [{ id: 'thermometer', label: "Thermometer", emoji: '🌡️' }, { id: 'gauge', label: "Rain gauge", emoji: '🪣' }, { id: 'vane', label: "Wind vane", emoji: '🧭' }, { id: 'anemometer', label: "Anemometer", emoji: '🌀' }],
      items: [
        { label: "18 °C in the shade", emoji: '🌤️', group: 'thermometer' },
        { label: "−3 °C on a frosty morning", emoji: '🥶', group: 'thermometer' },
        { label: "12 mm of rain since yesterday", emoji: '💧', group: 'gauge' },
        { label: "0 mm: a dry day", emoji: '🏜️', group: 'gauge' },
        { label: "Wind from the north-west", emoji: '🚩', group: 'vane' },
        { label: "Wind from the south", emoji: '🏳️', group: 'vane' },
        { label: "Wind speed: 25 km/h", emoji: '💨', group: 'anemometer' },
        { label: "Wind speed: 0 km/h, calm", emoji: '😶', group: 'anemometer', hint: "A speed is measured by the spinning cups." }
      ]
    },
    timeline: {
      title: "Learning to measure the weather",
      events: [
        { label: "Rain gauges of the same size are sent all over Korea", year: 1441, when: "1441" },
        { label: "Daniel Fahrenheit makes a mercury thermometer", year: 1714, when: "1714" },
        { label: "Anders Celsius suggests his temperature scale", year: 1742, when: "1742" },
        { label: "Francis Beaufort writes his wind scale", year: 1805, when: "1805" },
        { label: "Robert FitzRoy's first weather forecasts appear in a newspaper", year: 1861, when: "1861" }
      ]
    },
    quiz: [
      { q: "What does a thermometer measure?", choices: ["Temperature", "Rain", "Wind speed"], answer: 0, hint: "Hot or cold…", explain: "A thermometer measures temperature, in degrees Celsius." },
      { q: "Why is a thermometer kept in the shade?", choices: ["So it doesn't get lonely", "So sunshine doesn't fool it", "To keep it wet"], answer: 1, hint: "We want the air's temperature.", explain: "In the sunshine a thermometer heats up more than the air, so it would read too high." },
      { q: "What does an anemometer measure?", choices: ["Wind direction", "Rain", "Wind speed"], answer: 2, hint: "Its cups spin.", explain: "An anemometer measures wind speed: the faster its cups spin, the stronger the wind." },
      { q: "Where should a rain gauge stand?", choices: ["In the open, away from trees and roofs", "Under a tree", "Indoors"], answer: 0, hint: "Nothing should block the rain.", explain: "In the open, nothing stops the rain from falling in, or drips extra rain into it." },
      { q: "In 1441, what did the Korean royal court send across the kingdom?", choices: ["Thermometers", "Rain gauges of the same size", "Weather balloons"], answer: 1, hint: "Look at your timeline.", explain: "Rain gauges of the same size, so the rain in every village could be compared fairly." }
    ]
  }),
  lesson('earth5-forest-rock-cycle', 5, "Rocks and the Rock Cycle", 'rock-cycle', 'Rock types and the rock cycle', "Igneous, sedimentary and metamorphic: learn to read a rock's story.", ['chat', 'treasure', 'sort'], {
    reading: [
      card("Three families of rock", '🪨', "Geologists sort rocks into three families by how they formed: igneous, sedimentary and metamorphic."),
      card("Igneous: born from fire", '🌋', "Igneous rock forms when hot, melted rock cools and hardens. Granite cooled slowly deep underground; basalt cooled fast at the surface."),
      card("Sedimentary: layer on layer", '🏖️', "Sand, mud and shells settle in layers. Over a very long time, the layers are pressed and cemented into rocks like sandstone and limestone. This is where fossils are found."),
      card("Metamorphic: changed", '🔥', "Heat and pressure deep underground can change a rock without melting it: limestone becomes marble, and mudstone becomes slate. Rocks keep changing from one family to another in the rock cycle.")
    ],
    dialogue: guide("Ines, a geologist", "a geologist with a rock hammer", 'explorer',
      "Hello! I'm Ines, and I'm a geologist: I study rocks. Every rock has a story, and I'll teach you how to read it!",
      [
        ["How can I spot an igneous rock?", "Look for crystals locked together like a jigsaw: that's granite. Or a dark rock, sometimes with tiny holes left by gas bubbles: that's often basalt."],
        ["Why do sedimentary rocks have stripes?", "Each stripe is a layer that settled at a different time: maybe a flood of sand, then quiet mud. The layers can hold fossils, too."],
        ["Is marble really made from limestone?", "Yes! Deep underground, heat and pressure squeeze limestone until its tiny bits grow into shiny crystals. Many statues and palaces are made of marble."],
        ["Do rocks really change?", "Very, very slowly. A mountain wears down into sand, the sand becomes sandstone, deep heat changes it into new rock, and one day it may be lifted up again. That never-ending loop is the rock cycle."]
      ],
      { q: "Which rock family forms when melted rock cools down?", choices: ["Sedimentary", "Igneous", "Metamorphic"], answer: 1, explain: "Igneous rocks form when melted rock cools and hardens." },
      "Next time you pick up a pebble, ask it where it's been!"),
    artifact: { model: 'magnifier', name: "A geologist's hand lens", text: "Geologists carry a small magnifying lens, often on a string around their neck. Held close to a rock, it shows the rock's grains and crystals: rounded grains glued together mean a sedimentary rock, and sharp crystals locked like a jigsaw often mean an igneous one." },
    sort: {
      q: "Help Ines sort her rock collection into the three families!",
      groups: [{ id: 'igneous', label: "Igneous", emoji: '🌋' }, { id: 'sedimentary', label: "Sedimentary", emoji: '🏖️' }, { id: 'metamorphic', label: "Metamorphic", emoji: '🔥' }],
      items: [
        { label: "Granite: speckled crystals", emoji: '🪨', group: 'igneous' },
        { label: "Basalt: dark, from lava", emoji: '⬛', group: 'igneous' },
        { label: "Pumice: so light it floats!", emoji: '🫧', group: 'igneous', hint: "Pumice is lava full of gas bubbles that cooled very fast." },
        { label: "Sandstone: gritty grains", emoji: '🟫', group: 'sedimentary' },
        { label: "Limestone with tiny shells", emoji: '🐚', group: 'sedimentary' },
        { label: "Chalk: skeletons of tiny sea life", emoji: '⬜', group: 'sedimentary' },
        { label: "Marble, made from limestone", emoji: '🏛️', group: 'metamorphic' },
        { label: "Slate: splits into thin sheets", emoji: '🏠', group: 'metamorphic', hint: "Slate was mudstone, changed by heat and pressure." },
        { label: "Quartzite, made from sandstone", emoji: '💎', group: 'metamorphic' }
      ]
    },
    quiz: [
      { q: "Which rock family forms in layers of sand and mud?", choices: ["Igneous", "Metamorphic", "Sedimentary"], answer: 2, hint: "Layer on layer…", explain: "Sedimentary rocks form from layers of sand, mud and shells." },
      { q: "What does limestone become under heat and pressure?", choices: ["Marble", "Granite", "Sand"], answer: 0, hint: "Many statues are made of it.", explain: "Heat and pressure turn limestone into marble, a metamorphic rock." },
      { q: "Which rock can float on water?", choices: ["Granite", "Pumice", "Marble"], answer: 1, hint: "It's full of bubbles.", explain: "Pumice is so full of gas bubbles that it floats." },
      { q: "In which rock family do we usually find fossils?", choices: ["Sedimentary", "Igneous", "None of them"], answer: 0, hint: "Fossils are buried in mud and sand.", explain: "Fossils are found in sedimentary rocks, made from mud and sand that buried living things." },
      { q: "What is the rock cycle?", choices: ["A bike made of stone", "Rocks rolling downhill once", "Rocks slowly changing from one family to another, again and again"], answer: 2, hint: "A never-ending loop…", explain: "In the rock cycle, rocks slowly change from one family to another, over and over." }
    ]
  }),

  // ───────────── Ring 6: Sunflower Rings (about age 11–12) ─────────────
  lesson('earth6-forest-inside-earth', 6, "Inside the Earth: Layers and Moving Plates", 'earth-layers-plates', "The Earth's layers and plates", "Crust, mantle and core, and the giant plates that slowly move under our feet.", ['chat', 'sort', 'timeline'], {
    reading: [
      card("Like a peach", '🍑', "The Earth has layers. The thin outer crust is like a peach's skin. Under it is the mantle, hot rock that flows very slowly. In the middle is the core, made mostly of iron and nickel."),
      card("Two cores", '🎯', "The outer core is liquid metal. In 1936, the Danish scientist Inge Lehmann studied earthquake waves and showed that there is a solid inner core inside it."),
      card("Moving plates", '🧩', "The crust is broken into giant pieces called tectonic plates. They move a few centimetres a year, about as fast as your fingernails grow."),
      card("Where plates meet", '🏔️', "Where plates push together, mountains like the Himalayas slowly rise. Where they grind past each other or pull apart, earthquakes shake the ground.")
    ],
    dialogue: guide("Inge Lehmann, who found the inner core", "a Danish earthquake scientist (1888–1993)", 'scientist',
      "Hello! My name is Inge Lehmann. Nobody can dig to the middle of the Earth, so I found a cleverer way to look inside: I studied earthquakes.",
      [
        ["How can earthquakes show what's inside the Earth?", "An earthquake sends waves through the whole planet. They bend and bounce when they pass from one layer into another. By timing when they arrive at stations far away, we can work out what they travelled through."],
        ["What did you discover?", "Some waves arrived where they shouldn't have, if the whole core were liquid. In 1936 I explained it: there must be a solid inner core inside the liquid outer core."],
        ["Did people believe you?", "Other scientists checked my idea against more earthquakes, and the evidence grew. Today every textbook shows the inner core."],
        ["Is the middle of the Earth hot?", "Very! The inner core is about as hot as the surface of the Sun. It stays solid only because the pressure there is enormous."]
      ],
      { q: "How did Inge Lehmann discover the inner core?", choices: ["By digging a very deep hole", "By studying earthquake waves", "By looking through a telescope"], answer: 1, explain: "She timed earthquake waves at stations far away and worked out what they had passed through." },
      "Keep asking how we know what we know — that is what scientists do!", 'portrayal'),
    sort: {
      q: "Which layer of the Earth is each card about?",
      groups: [{ id: 'crust', label: "Crust", emoji: '🌍' }, { id: 'mantle', label: "Mantle", emoji: '🟠' }, { id: 'outer', label: "Outer core", emoji: '🔴' }, { id: 'inner', label: "Inner core", emoji: '⚪' }],
      items: [
        { label: "Where we live", emoji: '🏡', group: 'crust' },
        { label: "The thinnest layer, broken into plates", emoji: '🧩', group: 'crust' },
        { label: "Hot rock that flows very slowly", emoji: '🐌', group: 'mantle' },
        { label: "The thickest layer", emoji: '📏', group: 'mantle', hint: "It is nearly 3,000 km thick." },
        { label: "Liquid iron and nickel", emoji: '🫗', group: 'outer' },
        { label: "Swirls to make the Earth's magnetic field", emoji: '🧲', group: 'outer', hint: "Moving liquid metal makes the magnetic field that turns a compass needle." },
        { label: "A solid metal ball at the very centre", emoji: '⚙️', group: 'inner' },
        { label: "Found by Inge Lehmann in 1936", emoji: '🔎', group: 'inner' }
      ]
    },
    timeline: {
      title: "Discovering what's beneath our feet",
      events: [
        { label: "Alfred Wegener suggests that the continents drift", year: 1912, when: "1912" },
        { label: "Charles Richter makes his earthquake scale", year: 1935, when: "1935" },
        { label: "Inge Lehmann shows that the Earth has a solid inner core", year: 1936, when: "1936" },
        { label: "Scientists agree that the crust is made of moving plates", year: 1968, when: "the late 1960s" },
        { label: "The deepest hole ever drilled reaches about 12 km", year: 1989, when: "1989" }
      ]
    },
    quiz: [
      { q: "What is the thin outer layer of the Earth called?", choices: ["The core", "The crust", "The mantle"], answer: 1, hint: "Like a peach's skin…", explain: "The crust is the thin outer layer, where we live." },
      { q: "What is the outer core like?", choices: ["Liquid metal", "Solid ice", "Empty space"], answer: 0, hint: "Iron and nickel, very hot…", explain: "The outer core is liquid iron and nickel." },
      { q: "About how fast do tectonic plates move?", choices: ["A few metres a day", "They never move", "A few centimetres a year"], answer: 2, hint: "About as fast as your fingernails grow.", explain: "Plates move a few centimetres a year." },
      { q: "What can happen where two plates push together?", choices: ["Mountains slowly rise", "The sea boils", "The Moon moves closer"], answer: 0, hint: "Think of the Himalayas.", explain: "Where plates push together, the crust crumples up into mountains, very slowly." },
      { q: "Which clue made Alfred Wegener think the continents had moved?", choices: ["He saw them moving", "The coasts of South America and Africa fit together like jigsaw pieces", "A map in a cave"], answer: 1, hint: "Look at a globe.", explain: "The coasts of South America and Africa fit together, and matching fossils and rocks are found on both sides." }
    ]
  }),
  lesson('earth6-forest-forecast', 6, "Weather Maps and Forecasts", 'forecasting', 'Weather maps and forecasting', "Highs, lows and fronts: read a weather map like a forecaster.", ['chat', 'maphunt'], {
    reading: [
      card("Highs and lows", '🗺️', "Weather maps show areas of high and low air pressure. A high usually brings calm, dry, settled weather. A low usually brings clouds, wind and rain."),
      card("Fronts", '〽️', "A front is the edge between a mass of warm air and a mass of cold air. On weather maps, a cold front is drawn with blue triangles, and a warm front with red half-circles."),
      card("Cold front, warm front", '🌧️', "A cold front pushes under warm air and shoves it up fast: heavy showers, maybe thunder, then cooler, clearer air. A warm front slides slowly up over cold air, bringing long, steady rain."),
      card("How forecasts are made", '💻', "Forecasters collect millions of measurements from weather stations, balloons, ships and satellites. Supercomputers use them to work out what the air will do next.")
    ],
    dialogue: guide("Sunny Park, a weather forecaster", "a TV weather forecaster", 'guide',
      "Good evening, and here's the weather! Ha ha, hello! I'm Sunny, and I tell everyone what the weather will do tomorrow. Let me show you my map.",
      [
        ["What do the H and the L mean?", "H is for high pressure: the air is slowly sinking, so clouds find it hard to form. Expect calm, dry weather. L is for low pressure: the air rises, cools and makes clouds, wind and rain."],
        ["What are the lines with triangles?", "That's a cold front! The blue triangles point the way it's moving. When it passes, expect a burst of heavy rain, and then a cooler, brighter day."],
        ["Is a forecast always right?", "Not always! Tomorrow's forecast is usually very good, but a forecast for ten days ahead is much harder, because tiny changes in the air can grow into big ones."],
        ["What are the curvy lines on your map?", "Isobars! They join places with the same air pressure. When they're squeezed close together, it will be very windy."]
      ],
      { q: "On a weather map, what does a high (H) usually bring?", choices: ["Thunderstorms", "Snow every time", "Calm, dry weather"], answer: 2, explain: "In a high, the air sinks and clouds find it hard to form, so the weather is usually calm and dry." },
      "That's all from me. Have a lovely day — and take an umbrella if you see an L coming!"),
    maphunt: {
      q: "Read Sunny's weather map for tomorrow, and answer each question by tapping a place!",
      map: { regions: [
        { id: 'sea', label: "The sea", kind: 'water', points: [[0, 0], [100, 0], [100, 60], [0, 60]], at: [92, 6] },
        { id: 'north', label: "The northern hills", kind: 'land', points: [[25, 4], [75, 4], [80, 20], [50, 24], [20, 20]], at: [50, 14], emoji: '☀️' },
        { id: 'west', label: "The west coast", kind: 'land', points: [[10, 22], [20, 20], [50, 24], [45, 40], [30, 48], [12, 40]], at: [28, 32], emoji: '🌧️' },
        { id: 'east', label: "The eastern plains", kind: 'land', points: [[50, 24], [80, 20], [90, 32], [82, 46], [60, 44], [45, 40]], at: [68, 33], emoji: '⛈️' },
        { id: 'south', label: "The southern beaches", kind: 'land', points: [[30, 48], [45, 40], [60, 44], [82, 46], [70, 56], [40, 56]], at: [56, 52], emoji: '🌤️' }
      ] },
      clues: [
        { q: "A high is sitting here: calm, dry and sunny. Where?", region: 'north', hint: "Look for the clear sun." },
        { q: "A warm front is bringing long, steady rain. Where?", region: 'west', hint: "Steady rain, not a thunderstorm." },
        { q: "A cold front is passing: thunder and heavy showers! Where?", region: 'east', hint: "Look for the storm cloud." },
        { q: "The cold front has already passed here: cooler and brighter now. Where should the picnic go?", region: 'south', hint: "Sun peeping out after the rain…" }
      ]
    },
    quiz: [
      { q: "What does an L on a weather map usually bring?", choices: ["Clear blue skies", "Clouds, wind and rain", "An earthquake"], answer: 1, hint: "The air rises and cools…", explain: "In a low, rising air cools and makes clouds, wind and rain." },
      { q: "How is a cold front drawn?", choices: ["A line with blue triangles", "A line with red half-circles", "A green zigzag"], answer: 0, hint: "Cold is blue…", explain: "A cold front is a line with blue triangles pointing the way it moves." },
      { q: "When the isobars are squeezed close together, it will be…", choices: ["Very calm", "Very foggy", "Very windy"], answer: 2, hint: "Sunny told you.", explain: "Close isobars mean the pressure changes quickly over a short distance, which makes strong winds." },
      { q: "Why are 10-day forecasts less reliable than tomorrow's?", choices: ["Computers get tired", "Small changes in the air grow over time", "The Sun moves faster"], answer: 1, hint: "Tiny changes…", explain: "Tiny changes in the air can grow into big ones, so far-off forecasts are harder." },
      { q: "A warm front usually brings…", choices: ["Long, steady rain", "A sudden hailstorm, then sunshine", "Nothing at all"], answer: 0, hint: "It slides slowly up over the cold air.", explain: "A warm front rises slowly over cold air, bringing long, steady rain." }
    ]
  }),

  // ───────────── Ring 7: Starlight Crown (about age 12–13) ─────────────
  lesson('earth7-forest-climate-zones', 7, "Climate Zones of the World", 'climate-zones', 'Climate and climate zones', "Weather is today; climate is the pattern over years. Explore the world's zones and their forests.", ['chat', 'maphunt', 'sort'], {
    reading: [
      card("Weather or climate?", '📅', "Weather is what the air is doing today. Climate is the usual weather of a place over many years, about 30. 'It's raining today' is weather. 'Summers here are hot and dry' is climate."),
      card("Sunlight and latitude", '🌍', "Near the equator the Sun is high in the sky all year, so it's hot. Toward the poles, sunlight arrives at a low slant and is spread over more ground, so it's colder."),
      card("The main zones", '🗺️', "Tropical zones are hot all year, and often wet. Dry zones get very little rain. Temperate zones have four seasons. Polar zones are cold all year."),
      card("Every climate has its forest", '🌳', "Rainforests grow in the hot, wet tropics. Broadleaf forests of oak and beech grow in temperate lands. The taiga, a belt of conifers, circles the cold north. Where it's too cold or too dry, trees can't grow at all.")
    ],
    dialogue: guide("Dr. Amara Osei, a climate scientist", "a scientist who studies climate", 'explorer',
      "Hello! I'm Amara, and I study climate: the patterns of weather over many years. I've worked in rainforests, in deserts and at the edge of the Arctic!",
      [
        ["What's the difference between weather and climate?", "Weather is your mood today; climate is your personality! One rainy day doesn't change a desert's climate. We need about 30 years of weather to know a place's climate."],
        ["Why is it hot at the equator?", "Sunlight hits the equator almost straight on, so its energy is packed into a small area. Near the poles, the same sunlight hits at a slant and spreads out, like a torch beam tipped sideways."],
        ["What's the taiga?", "The biggest forest belt on land! Pines, spruces and larches stretch across Russia, Scandinavia, Canada and Alaska, with long, freezing winters and short summers."],
        ["Why are rainforests so wet?", "Strong sunshine near the equator makes warm, moist air rise almost every day. It cools, builds towering clouds and pours down as rain, often in the afternoon."]
      ],
      { q: "What is climate?", choices: ["The weather this afternoon", "The usual weather of a place over many years", "How fast the wind is right now"], answer: 1, explain: "Climate is the pattern of weather over many years, usually about 30." },
      "Wherever you live, look around: your climate shapes your plants, your animals and even your houses!"),
    maphunt: {
      q: "Find the world's great climate zones with Amara!",
      map: 'world',
      clues: [
        { q: "The Amazon, the biggest tropical rainforest, is on this continent.", region: 'south-america', hint: "It sits right on the equator, in the Americas." },
        { q: "The Sahara, the largest hot desert, covers much of the north of this continent.", region: 'africa', hint: "Just south of Europe." },
        { q: "This ice-covered land at the South Pole has a polar climate all year.", region: 'antarctica', hint: "Look at the very bottom." },
        { q: "Most of the taiga stretches across this continent, from Russia to the Pacific.", region: 'asia', hint: "The biggest continent of all." },
        { q: "Its north has temperate forests of oak and beech, and its south has hot, dry Mediterranean summers.", region: 'europe', hint: "North of Africa, west of Asia." }
      ]
    },
    sort: {
      q: "Which forest or land does each card describe? Sort Amara's cards!",
      groups: [{ id: 'rainforest', label: "Tropical rainforest", emoji: '🌴' }, { id: 'temperate', label: "Temperate forest", emoji: '🌳' }, { id: 'taiga', label: "Taiga", emoji: '🌲' }, { id: 'tundra', label: "Tundra", emoji: '🧊' }],
      items: [
        { label: "Hot and rainy all year", emoji: '🌧️', group: 'rainforest' },
        { label: "Sloths and toucans", emoji: '🦥', group: 'rainforest' },
        { label: "Jaguars hunting by rivers", emoji: '🐆', group: 'rainforest' },
        { label: "Four clear seasons", emoji: '🍂', group: 'temperate' },
        { label: "Oaks, maples and beeches", emoji: '🍁', group: 'temperate' },
        { label: "Hedgehogs and badgers", emoji: '🦔', group: 'temperate' },
        { label: "Long, freezing winters and short summers", emoji: '❄️', group: 'taiga' },
        { label: "Pines, spruces and larches", emoji: '🌲', group: 'taiga' },
        { label: "Moose and lynx", emoji: '🦌', group: 'taiga' },
        { label: "Too cold for trees; frozen ground", emoji: '🥶', group: 'tundra' },
        { label: "Mosses, lichens and tiny shrubs", emoji: '🌿', group: 'tundra' },
        { label: "Arctic foxes and caribou", emoji: '🦊', group: 'tundra', hint: "Arctic foxes live where it's too cold for forests." }
      ]
    },
    quiz: [
      { q: "Why are places near the equator hot?", choices: ["They are closer to the Moon", "The ground is made of fire", "Sunlight hits them almost straight on"], answer: 2, hint: "Think of a torch beam.", explain: "Near the equator, sunlight arrives almost straight on, packing its energy into a small area." },
      { q: "How many years of weather do scientists usually use to describe a climate?", choices: ["About 30", "1", "About 1,000"], answer: 0, hint: "Amara told you.", explain: "Climate is usually worked out from about 30 years of weather." },
      { q: "Which is the biggest forest belt on land?", choices: ["A temperate oak forest", "The taiga", "A city park"], answer: 1, hint: "Conifers across the cold north…", explain: "The taiga, the cold northern forest of conifers, is the biggest forest belt on land." },
      { q: "In which climate zone are there four clear seasons?", choices: ["Tropical", "Polar", "Temperate"], answer: 2, hint: "Like the Great Tree's.", explain: "Temperate zones have spring, summer, autumn and winter." },
      { q: "A desert has one very rainy week. What does that tell us?", choices: ["The weather was rainy, but the climate is still dry", "The desert now has a rainforest climate", "Climate and weather are the same thing"], answer: 0, hint: "Weather is today; climate is many years.", explain: "One rainy week is weather. The desert's climate, its usual weather over many years, is still dry." }
    ]
  }),
  lesson('earth7-forest-forests-climate', 7, "How Forests Cool the Planet", 'forests-and-climate', 'Forests and the climate', "The greenhouse effect, the carbon trees store, and the rain they help to make.", ['chat', 'timeline', 'treasure'], {
    reading: [
      card("The greenhouse effect", '🌍', "Some gases in the air, like carbon dioxide (CO₂) and water vapour, trap heat near the Earth like a blanket. Without them, the Earth would be frozen. With too much, it gets too warm."),
      card("Trees store carbon", '🌳', "Trees take in CO₂ from the air to build their wood, leaves and roots. A big old tree holds tonnes of carbon. Burning or clearing forests lets much of it back into the air."),
      card("Trees make rain", '💧', "A big tree can pull hundreds of litres of water from the soil in a day and give it out through its leaves. Over the Amazon, this water forms 'flying rivers' of moist air that bring rain to places far away."),
      card("Shade and cooling", '🌡️', "Evaporating water cools the air, the way sweat cools your skin. On a hot day, streets with trees can be several degrees cooler than streets without them.")
    ],
    dialogue: guide("Eunice Foote, who tested the warming gases", "an American scientist and inventor (1819–1888)", 'inventor',
      "Good day! I'm Eunice Foote. In 1856, I did an experiment with glass cylinders and sunshine, and found something that matters very much today.",
      [
        ["What was your experiment?", "I filled glass cylinders with different gases, put a thermometer in each, and set them in the sunshine. The one filled with carbon dioxide grew the hottest, and stayed hot the longest when I took it out of the sun."],
        ["What did you think it meant?", "I wrote that if the air had more of that gas, the Earth would be warmer. Today we know I was right: it's part of the greenhouse effect."],
        ["Why test different gases?", "A good scientist changes only one thing at a time. Same cylinders, same sunshine, same thermometers: only the gas was different. So the gas must explain the difference!"],
        ["Did people listen?", "My paper was read out at a big science meeting in 1856, by a man, Joseph Henry, as was usual then. For a long time my work was forgotten, but people rediscovered it in the 2010s."]
      ],
      { q: "In Eunice Foote's experiment, which cylinder got hottest in the sunshine?", choices: ["The one in the shade", "The one with carbon dioxide", "The one with ordinary air"], answer: 1, explain: "The cylinder filled with carbon dioxide grew the hottest and stayed hot the longest." },
      "Keep testing your ideas carefully, one change at a time!", 'portrayal'),
    timeline: {
      title: "Learning how the climate works",
      events: [
        { label: "Eunice Foote shows that carbon dioxide traps the Sun's heat", year: 1856, when: "1856" },
        { label: "Svante Arrhenius works out how much warmer the Earth would be with more CO₂", year: 1896, when: "1896" },
        { label: "Charles Keeling starts measuring the air's CO₂ on a Hawaiian volcano", year: 1958, when: "1958" },
        { label: "Wangari Maathai starts the Green Belt Movement, planting trees in Kenya", year: 1977, when: "1977" },
        { label: "Almost every country agrees to the Paris Agreement to limit warming", year: 2015, when: "2015" }
      ]
    },
    artifact: { model: 'tree-ring', name: "A slice of a tree trunk", text: "Each ring is one year of growth. Wide rings mean good growing years, often warm and wet; narrow rings mean hard years, like droughts. By studying the rings of very old trees and old wood, scientists can read the climate of hundreds, even thousands, of years ago. And all that wood is carbon, taken out of the air." },
    quiz: [
      { q: "What does the greenhouse effect do?", choices: ["Traps heat near the Earth", "Makes plants grow in glasshouses only", "Cools the Sun"], answer: 0, hint: "Like a blanket…", explain: "Gases like CO₂ and water vapour trap heat near the Earth, like a blanket." },
      { q: "Where does a tree get the carbon to build its wood?", choices: ["From rocks", "From the CO₂ in the air", "From rainwater"], answer: 1, hint: "It breathes it in through its leaves.", explain: "Trees take CO₂ from the air and use its carbon to build wood, leaves and roots." },
      { q: "What are the Amazon's 'flying rivers'?", choices: ["Rivers that jump", "Flocks of birds", "Moist air from the trees that brings rain far away"], answer: 2, hint: "Trees give out water through their leaves.", explain: "Water from millions of trees rises as moist air and travels far, falling as rain somewhere else." },
      { q: "Why did Eunice Foote change only the gas in her experiment?", choices: ["So the gas was the only thing that could explain the difference", "Because she had only one thermometer", "To make it faster"], answer: 0, hint: "A fair test…", explain: "Changing one thing at a time makes it a fair test: only the gas could explain the difference." },
      { q: "What does a narrow tree ring usually show?", choices: ["A very good year", "A hard year, like a drought", "That the tree was asleep"], answer: 1, hint: "Wide rings are good years…", explain: "Narrow rings mean the tree grew little that year, often because of drought or cold." }
    ]
  })
];

/* ------------------------------------------------------------ Biology, the Nature Lab (Dr. Ribbit) */

const FOREST_BIOLOGY = [
  // ───────────── Ring 1: Root Hollow (about age 6–7) ─────────────
  lesson('biology1-forest-plant-parts', 1, "Roots, Stems, Leaves and Flowers", 'plant-parts', 'Parts of a plant', "What each part of a plant does, and which parts we eat!", ['sort'], {
    reading: [
      card("Roots", '🥕', "Roots hold a plant in the ground and drink up water from the soil. Some plants keep food in thick roots, like carrots."),
      card("Stems", '🌿', "The stem holds the plant up. It carries water from the roots up to the leaves, like a drinking straw."),
      card("Leaves", '🍃', "Leaves catch sunlight and use it to make food for the plant."),
      card("Flowers and seeds", '🌸', "Flowers make seeds, and seeds can grow into new plants.")
    ],
    sort: {
      q: "We eat lots of plant parts! Help Ribbit sort the food by which part of the plant it is.",
      groups: [{ id: 'root', label: "Roots", emoji: '🟫' }, { id: 'leaf', label: "Leaves", emoji: '🍃' }, { id: 'flower', label: "Flowers", emoji: '🌸' }, { id: 'seed', label: "Seeds", emoji: '🌱' }],
      items: [
        { label: "Carrot", emoji: '🥕', group: 'root' },
        { label: "Sweet potato", emoji: '🍠', group: 'root' },
        { label: "Lettuce", emoji: '🥬', group: 'leaf' },
        { label: "Spinach", emoji: '🌿', group: 'leaf' },
        { label: "Broccoli", emoji: '🥦', group: 'flower', hint: "Those tiny green bumps are flower buds!" },
        { label: "Artichoke", emoji: '🌼', group: 'flower', hint: "An artichoke is a big flower bud, picked before it opens." },
        { label: "Corn", emoji: '🌽', group: 'seed' },
        { label: "Beans", emoji: '🫘', group: 'seed' },
        { label: "Rice", emoji: '🍚', group: 'seed' }
      ]
    },
    quiz: [
      { q: "Which part of a plant drinks water from the soil?", choices: ["The flowers", "The roots", "The leaves"], answer: 1, hint: "It's under the ground.", explain: "The roots drink up water from the soil." },
      { q: "What does the stem do?", choices: ["Makes seeds", "Catches insects", "Holds the plant up and carries water"], answer: 2, hint: "Like a drinking straw…", explain: "The stem holds the plant up and carries water from the roots to the leaves." },
      { q: "Which part makes seeds?", choices: ["The flower", "The root", "The stem"], answer: 0, hint: "It's often bright and pretty.", explain: "Flowers make seeds." },
      { q: "Which part of the plant is a carrot?", choices: ["A leaf", "A flower", "A root"], answer: 2, hint: "It grows under the ground.", explain: "A carrot is a thick root, full of stored food." },
      { q: "What do leaves catch to make food?", choices: ["Sunlight", "Rain clouds", "Worms"], answer: 0, hint: "It comes from the sky on a bright day.", explain: "Leaves catch sunlight to make food for the plant." }
    ]
  }),
  lesson('biology1-forest-living', 1, "Living or Not Living?", 'living-things', 'Living and non-living things', "Alive, once alive, or never alive? Ribbit has a puzzle for you.", ['sort'], {
    reading: [
      card("Living things", '🐸', "Living things grow, need food and water, breathe, and make new living things like themselves. Plants, animals and mushrooms are all alive!"),
      card("Never alive", '🪨', "A rock, a raindrop and a metal key have never been alive. They don't eat, grow or have babies."),
      card("Once alive", '🍂', "Some things were alive once: a fallen leaf, a feather, a wooden chair. They came from living things, but they are not alive now."),
      card("Seeds are tricky", '🌰', "A seed looks like a little pebble, but it's alive! It is resting. Give it water and warmth, and it wakes up and grows.")
    ],
    sort: {
      q: "Ribbit made three piles. Can you guess why?",
      groups: [{ id: 'living', label: "Living", emoji: '💚' }, { id: 'once', label: "Once alive", emoji: '🍂' }, { id: 'never', label: "Never alive", emoji: '🪨' }],
      items: [
        { label: "Frog", emoji: '🐸', group: 'living', given: true },
        { label: "Feather", emoji: '🪶', group: 'once', given: true },
        { label: "Pebble", emoji: '🪨', group: 'never', given: true },
        { label: "Oak tree", emoji: '🌳', group: 'living' },
        { label: "Mushroom", emoji: '🍄', group: 'living', hint: "A mushroom is part of a living fungus." },
        { label: "Acorn", emoji: '🌰', group: 'living', hint: "A seed is alive, just resting!" },
        { label: "Fallen leaf", emoji: '🍂', group: 'once' },
        { label: "Wooden chair", emoji: '🪑', group: 'once', hint: "Wood comes from trees." },
        { label: "Empty snail shell", emoji: '🐚', group: 'once' },
        { label: "Raindrop", emoji: '💧', group: 'never' },
        { label: "Glass marble", emoji: '🔮', group: 'never' },
        { label: "Metal key", emoji: '🔑', group: 'never' }
      ],
      rule: { q: "How did Ribbit sort the frog, the feather and the pebble?", choices: ["By colour", "Living, once alive, never alive", "Big, medium and small"], answer: 1, hint: "The frog hops about. The feather came from a bird. The pebble…?", explain: "The frog is alive, the feather came from a living bird, and the pebble was never alive." }
    },
    quiz: [
      { q: "Which of these is alive?", choices: ["A pebble", "A raindrop", "A mushroom"], answer: 2, hint: "Which one grows?", explain: "A mushroom is part of a living fungus." },
      { q: "A wooden chair was made from a tree. It is…", choices: ["Once alive", "Alive", "Never alive"], answer: 0, hint: "Was the tree alive? Is the chair growing?", explain: "The wood came from a living tree, but the chair isn't alive now: it was once alive." },
      { q: "Which is something all living things do?", choices: ["Fly", "Grow", "Swim"], answer: 1, hint: "A tree, a frog and you all do it.", explain: "All living things grow. Not all of them fly or swim." },
      { q: "Is a seed alive?", choices: ["No, it is a tiny stone", "Yes, it is resting until it can grow"], answer: 1, hint: "What happens when you water it?", explain: "A seed is alive. With water and warmth, it wakes up and grows." },
      { q: "Which has never been alive?", choices: ["A metal key", "A feather", "An oak leaf"], answer: 0, hint: "Which one didn't come from a living thing?", explain: "A metal key was never alive. Feathers and leaves came from living things." }
    ]
  }),

  // ───────────── Ring 2: Fern Boughs (about age 7–8) ─────────────
  lesson('biology2-forest-animal-groups', 2, "Fur, Feathers, Scales and Slime", 'vertebrate-groups', 'Animal groups', "Mammals, birds, reptiles and amphibians: sort the forest animals into their groups.", ['sort'], {
    reading: [
      card("Animals with backbones", '🦴', "Animals with a backbone are called vertebrates. Scientists sort them into groups: mammals, birds, reptiles, amphibians and fish."),
      card("Mammals and birds", '🐻', "Mammals have hair or fur and feed their babies milk. Birds have feathers and lay eggs with hard shells. All birds have feathers, even ones that can't fly."),
      card("Reptiles", '🦎', "Reptiles have dry, scaly skin. Most lay eggs with soft, leathery shells on land. Snakes, lizards, turtles and crocodiles are reptiles."),
      card("Amphibians", '🐸', "Amphibians, like frogs, toads and newts, have smooth, damp skin. Most start life in water as tadpoles, and later live on land too.")
    ],
    sort: {
      q: "Help Ribbit sort the animals into their groups!",
      groups: [{ id: 'mammal', label: "Mammals", emoji: '🐾' }, { id: 'bird', label: "Birds", emoji: '🪶' }, { id: 'reptile', label: "Reptiles", emoji: '🐊' }, { id: 'amphibian', label: "Amphibians", emoji: '💧' }],
      items: [
        { label: "Bat", emoji: '🦇', group: 'mammal', hint: "Bats fly, but they have fur and feed their babies milk." },
        { label: "Badger", emoji: '🦡', group: 'mammal' },
        { label: "Deer", emoji: '🦌', group: 'mammal' },
        { label: "Owl", emoji: '🦉', group: 'bird' },
        { label: "Duck", emoji: '🦆', group: 'bird' },
        { label: "Robin", emoji: '🐦', group: 'bird' },
        { label: "Snake", emoji: '🐍', group: 'reptile' },
        { label: "Lizard", emoji: '🦎', group: 'reptile' },
        { label: "Turtle", emoji: '🐢', group: 'reptile' },
        { label: "Toad", emoji: '🐸', group: 'amphibian' },
        { label: "Newt", emoji: '🦎', group: 'amphibian', hint: "A newt looks like a lizard, but its skin is smooth and damp, and it starts life in a pond." }
      ]
    },
    quiz: [
      { q: "A bat can fly. Which group is it in?", choices: ["Birds", "Mammals", "Reptiles"], answer: 1, hint: "It has fur and feeds its babies milk.", explain: "Bats are mammals: they have fur and feed their babies milk." },
      { q: "What do all birds have?", choices: ["Fur", "Damp skin", "Feathers"], answer: 2, hint: "Even birds that can't fly have them.", explain: "Every bird has feathers." },
      { q: "Which animal has dry, scaly skin?", choices: ["A snake", "A frog", "A rabbit"], answer: 0, hint: "It's a reptile.", explain: "Snakes are reptiles, with dry, scaly skin." },
      { q: "Where do most amphibians start their lives?", choices: ["In a nest of twigs", "In water", "In an egg on dry sand"], answer: 1, hint: "Think of tadpoles.", explain: "Most amphibians start life in water, as tadpoles." },
      { q: "Which group feeds its babies milk?", choices: ["Amphibians", "Fish", "Mammals"], answer: 2, hint: "Bears, badgers and bats…", explain: "Mammals feed their babies milk." }
    ]
  }),
  lesson('biology2-forest-life-cycles', 2, "Frog and Butterfly Life Cycles", 'life-cycles', 'Animal life cycles', "From frogspawn to frog, from egg to butterfly: two amazing changes.", ['sort'], {
    reading: [
      card("A life cycle", '🔄', "A life cycle is the set of changes a living thing goes through, from the start of its life until it has young of its own. Then the cycle begins again."),
      card("A frog's life", '🐸', "A frog lays jelly-covered eggs called frogspawn. Tadpoles hatch and swim with their tails. They grow legs, lose their tails and become froglets, then grown-up frogs."),
      card("A butterfly's life", '🦋', "A butterfly lays tiny eggs on a leaf. A caterpillar hatches and eats and eats! Then it makes a chrysalis, and inside, its body changes completely. Out comes a butterfly!"),
      card("A big change", '✨', "A big change in body shape like this is called metamorphosis. Frogs and butterflies both do it, in different ways.")
    ],
    sort: {
      q: "Two life cycles got mixed up on Ribbit's desk. Can you guess how they were sorted?",
      groups: [{ id: 'frog', label: "Frog life cycle", emoji: '🐸' }, { id: 'butterfly', label: "Butterfly life cycle", emoji: '🦋' }],
      items: [
        { label: "Frogspawn: jelly eggs", emoji: '🫧', group: 'frog', given: true },
        { label: "Hungry caterpillar", emoji: '🐛', group: 'butterfly', given: true },
        { label: "Tadpole with a tail", emoji: '⚫', group: 'frog' },
        { label: "Back legs grow first", emoji: '🦵', group: 'frog', hint: "Tadpoles grow their back legs before their front legs." },
        { label: "Froglet with a little tail", emoji: '🐸', group: 'frog' },
        { label: "Tiny egg on a leaf", emoji: '🍃', group: 'butterfly' },
        { label: "Chrysalis hanging still", emoji: '🎁', group: 'butterfly', hint: "Inside, the caterpillar's body is changing completely." },
        { label: "Wings drying in the sun", emoji: '☀️', group: 'butterfly' }
      ],
      rule: { q: "How were these cards sorted?", choices: ["Things that fly and things that swim", "By colour", "By which animal's life cycle they belong to"], answer: 2, hint: "Frogspawn… and a caterpillar. What do they grow into?", explain: "Frogspawn grows into a frog, and a caterpillar into a butterfly: the cards belong to two life cycles." }
    },
    quiz: [
      { q: "What hatches from frogspawn?", choices: ["Tadpoles", "Caterpillars", "Chicks"], answer: 0, hint: "They swim with their tails.", explain: "Tadpoles hatch from frogspawn." },
      { q: "What does this caterpillar become inside its chrysalis?", choices: ["A frog", "A butterfly", "A bee"], answer: 1, hint: "It comes out with wings.", explain: "Inside the chrysalis, the caterpillar changes into a butterfly." },
      { q: "Which legs does a tadpole grow first?", choices: ["Its front legs", "Wings", "Its back legs"], answer: 2, hint: "Ribbit's cards told you.", explain: "Tadpoles grow their back legs first, then their front legs." },
      { q: "What is the big change in body shape called?", choices: ["Metamorphosis", "Hibernation", "Evaporation"], answer: 0, hint: "A long word beginning with 'meta'…", explain: "The big change from tadpole to frog, or caterpillar to butterfly, is metamorphosis." },
      { q: "A butterfly's life goes: egg, caterpillar, ___, butterfly.", choices: ["Tadpole", "Chrysalis", "Seed"], answer: 1, hint: "It hangs very still.", explain: "Egg, caterpillar, chrysalis, butterfly." }
    ]
  }),

  // ───────────── Ring 3: Lantern Branches (about age 8–9) ─────────────
  lesson('biology3-forest-food-chains', 3, "Who Eats Whom? Food Chains", 'food-chains', 'Food chains', "Producers and consumers, predators and prey: follow the energy through the forest.", ['sort'], {
    reading: [
      card("Food is energy", '⚡', "Every living thing needs energy. Plants make their own food using sunlight. Animals get energy by eating plants or other animals."),
      card("A food chain", '🔗', "A food chain shows who eats whom: grass → rabbit → fox. The arrows mean 'is eaten by', and they show which way the energy goes."),
      card("Producers and consumers", '🌿', "Plants are producers: they make food. Animals are consumers: they eat food. Herbivores eat plants, carnivores eat animals, and omnivores eat both."),
      card("Predator and prey", '🦊', "A predator hunts other animals for food, and the animals it hunts are its prey. A robin is a predator to a worm, but prey to a hawk.")
    ],
    sort: {
      q: "Maker, plant-eater, meat-eater, or both? Sort the forest's living things!",
      groups: [{ id: 'producer', label: "Producers (make food)", emoji: '🌿' }, { id: 'herbivore', label: "Herbivores (eat plants)", emoji: '🥬' }, { id: 'carnivore', label: "Carnivores (eat animals)", emoji: '🦴' }, { id: 'omnivore', label: "Omnivores (eat both)", emoji: '🍽️' }],
      items: [
        { label: "Oak tree", emoji: '🌳', group: 'producer' },
        { label: "Grass", emoji: '🌾', group: 'producer' },
        { label: "Blackberry bush", emoji: '🫐', group: 'producer' },
        { label: "Rabbit", emoji: '🐰', group: 'herbivore' },
        { label: "Deer", emoji: '🦌', group: 'herbivore' },
        { label: "Caterpillar", emoji: '🐛', group: 'herbivore' },
        { label: "Owl", emoji: '🦉', group: 'carnivore' },
        { label: "Spider", emoji: '🕷️', group: 'carnivore' },
        { label: "Hawk", emoji: '🦅', group: 'carnivore' },
        { label: "Fox", emoji: '🦊', group: 'omnivore', hint: "Foxes eat mice and beetles, but also berries and fruit!" },
        { label: "Badger", emoji: '🦡', group: 'omnivore', hint: "Badgers love earthworms, and they eat fruit and bulbs too." },
        { label: "Brown bear", emoji: '🐻', group: 'omnivore' }
      ]
    },
    quiz: [
      { q: "In 'grass → rabbit → fox', what does the arrow mean?", choices: ["Is bigger than", "Is eaten by", "Lives with"], answer: 1, hint: "It shows which way the energy goes.", explain: "The arrow means 'is eaten by': the grass is eaten by the rabbit, and the rabbit by the fox." },
      { q: "What do we call a living thing that makes its own food from sunlight?", choices: ["A predator", "A consumer", "A producer"], answer: 2, hint: "It produces food.", explain: "Plants are producers: they make their own food from sunlight." },
      { q: "An owl hunts mice. The mouse is the owl's…", choices: ["Prey", "Predator", "Producer"], answer: 0, hint: "The hunted animal…", explain: "The mouse is the owl's prey; the owl is the mouse's predator." },
      { q: "Which word means an animal that eats both plants and animals?", choices: ["Herbivore", "Omnivore", "Carnivore"], answer: 1, hint: "'Omni' means 'all'.", explain: "An omnivore eats both plants and animals, like a fox or a badger." },
      { q: "What is at the start of almost every food chain?", choices: ["A hawk", "A fox", "A plant"], answer: 2, hint: "Something that makes its own food.", explain: "Almost every food chain starts with a plant, a producer." }
    ]
  }),
  lesson('biology3-forest-habitats', 3, "Habitats: A Home for Everyone", 'habitats', 'Habitats', "The pond, the log, the treetops: find the right home for each forest creature.", ['maphunt'], {
    reading: [
      card("What is a habitat?", '🏡', "A habitat is the natural home of a plant or animal. It gives them food, water, shelter and a safe place to raise their young."),
      card("Many homes in one forest", '🌳', "A forest has many habitats: the treetops, the forest floor, a rotting log, a pond, a stream and a sunny meadow. Each one suits different living things."),
      card("Tiny habitats", '🪵', "Even a single log is a tiny habitat. Lift it gently, and you might find woodlice, beetles and centipedes that love the dark and the damp."),
      card("Be a good visitor", '🤲', "When you look in a habitat, be gentle. Put logs and stones back the way you found them, so the creatures' homes stay safe.")
    ],
    maphunt: {
      q: "Help Ribbit find the right home for each forest creature!",
      map: { regions: [
        { id: 'floor', label: "The forest floor", kind: 'land', points: [[0, 0], [100, 0], [100, 60], [0, 60]], at: [44, 54], emoji: '🍂' },
        { id: 'treetops', label: "The treetops", kind: 'land', points: [[4, 4], [34, 4], [38, 14], [30, 24], [8, 24], [2, 14]], at: [20, 14], emoji: '🌳' },
        { id: 'meadow', label: "The sunny meadow", kind: 'land', points: [[64, 4], [96, 4], [96, 22], [66, 22]], at: [80, 13], emoji: '🌼' },
        { id: 'pond', label: "The pond", kind: 'water', points: [[40, 29], [56, 27], [62, 35], [54, 43], [40, 41], [36, 35]], at: [49, 35], emoji: '💧' },
        { id: 'stream', label: "The stream", kind: 'water', points: [[70, 26], [78, 26], [75, 40], [81, 57], [73, 57], [67, 40]], at: [74, 42], emoji: '🐟' },
        { id: 'log', label: "The rotting log", kind: 'land', points: [[9, 35], [30, 33], [31, 40], [10, 42]], at: [20, 38], emoji: '🪵' }
      ] },
      clues: [
        { q: "A tadpole needs still water to grow up in. Where does it live?", region: 'pond', hint: "Still water, not running water." },
        { q: "Woodlice love dark, damp places full of rotting wood. Tap their home!", region: 'log', hint: "Look for the old piece of wood." },
        { q: "Bees and butterflies want lots of flowers and sunshine. Where?", region: 'meadow', hint: "Where the flowers grow in the open." },
        { q: "A squirrel builds its nest, called a drey, high up in the branches. Where?", region: 'treetops', hint: "Up in the trees!" },
        { q: "Trout need cool, flowing water with lots of oxygen. Where?", region: 'stream', hint: "The water here keeps moving." },
        { q: "Hedgehogs snuffle for beetles among the fallen leaves. Where?", region: 'floor', hint: "The ground under the trees." }
      ]
    },
    quiz: [
      { q: "What does a habitat give a living thing?", choices: ["Toys and books", "Food, water and shelter", "Only sunshine"], answer: 1, hint: "Everything it needs to live.", explain: "A habitat gives food, water, shelter and a safe place to raise young." },
      { q: "Where would you look for woodlice?", choices: ["Under a damp, rotting log", "On a sunny rock in the desert", "In the clouds"], answer: 0, hint: "They love the dark and the damp.", explain: "Woodlice live in dark, damp places, like under a rotting log." },
      { q: "What is a squirrel's nest called?", choices: ["A burrow", "A hive", "A drey"], answer: 2, hint: "You found it in the treetops.", explain: "A squirrel's nest is called a drey." },
      { q: "Why should you put a log back after looking under it?", choices: ["So the creatures' home stays safe", "So nobody knows you looked", "To make it roll"], answer: 0, hint: "Someone lives there!", explain: "Putting it back keeps the creatures' home dark, damp and safe." },
      { q: "Which habitat suits a trout?", choices: ["A dry meadow", "A treetop", "A cool, flowing stream"], answer: 2, hint: "Fish need water with lots of oxygen.", explain: "Trout need cool, flowing water, like a stream." }
    ]
  }),

  // ───────────── Ring 4: Blossom Canopy (about age 9–10) ─────────────
  lesson('biology4-forest-decomposers', 4, "Decomposers: The Forest's Recyclers", 'decomposers', 'Decomposers and fungi', "Where do all the fallen leaves go? Meet the worms, woodlice and fungi that recycle the forest.", ['dig', 'sort'], {
    reading: [
      card("Where do the leaves go?", '🍂', "Every autumn, a forest drops millions of leaves, yet the forest floor doesn't fill up to the treetops. Something breaks them down!"),
      card("The clean-up crew", '🪱', "Earthworms, woodlice, millipedes and slugs eat dead leaves and wood. Then fungi and bacteria, far too small to see, finish the job."),
      card("Fungi", '🍄', "A mushroom is only the fruit of a fungus, like an apple on a tree. The main part is a web of thin threads called mycelium, hidden in the soil or the wood, which digests dead leaves and logs."),
      card("Nothing is wasted", '♻️', "Decomposers turn dead things back into nutrients in the soil, and new plants use them to grow. That's nature's recycling!")
    ],
    dig: {
      q: "Gently scrape back the leaf litter, and find the forest's recyclers!",
      w: 6, h: 4,
      finds: [
        { at: [1, 1], emoji: '🪱', label: "An earthworm", text: "Earthworms pull dead leaves down into the soil to eat.", question: { q: "What do earthworms eat?", choices: ["Living birds", "Dead leaves and rotting plants", "Stones"], answer: 1, hint: "Look at what's lying on the forest floor.", explain: "Earthworms eat dead leaves and rotting plants, and their droppings make the soil richer." } },
        { at: [4, 0], emoji: '🍄', label: "Mushrooms on a log", text: "These mushrooms are the fruits of a fungus. Its threads run all through the log.", question: { q: "What is the hidden main part of a fungus called?", choices: ["Its roots", "Its petals", "Its mycelium"], answer: 2, hint: "A web of thin threads…", explain: "The mycelium, a web of thin threads, is the main part of a fungus. Fungi have no true roots." } },
        { at: [2, 3], emoji: '🦐', label: "A woodlouse", text: "Woodlice aren't insects: they're crustaceans that live on land.", question: { q: "Woodlice are cousins of…", choices: ["Crabs and shrimps", "Beetles and bees", "Spiders"], answer: 0, hint: "They're crustaceans, with 14 legs.", explain: "Woodlice are crustaceans, like crabs and shrimps. That's why they need damp places." } },
        { at: [5, 3], emoji: '🦠', label: "A crumb of dark soil", text: "This crumb is full of bacteria, far too small to see.", question: { q: "What do decomposers turn dead leaves into?", choices: ["Plastic", "Nutrients for new plants", "Rocks"], answer: 1, hint: "Nature's recycling…", explain: "Decomposers turn dead things into nutrients that new plants use to grow." } }
      ]
    },
    sort: {
      q: "Who's who in the forest? Sort them into makers, eaters and recyclers!",
      groups: [{ id: 'producer', label: "Producers (make food)", emoji: '🌿' }, { id: 'consumer', label: "Consumers (eat living things)", emoji: '🦊' }, { id: 'decomposer', label: "Decomposers (recycle dead things)", emoji: '♻️' }],
      items: [
        { label: "Fern", emoji: '🌿', group: 'producer' },
        { label: "Oak", emoji: '🌳', group: 'producer' },
        { label: "Deer", emoji: '🦌', group: 'consumer' },
        { label: "Owl", emoji: '🦉', group: 'consumer' },
        { label: "Fox", emoji: '🦊', group: 'consumer' },
        { label: "Bracket fungus", emoji: '🍄', group: 'decomposer', hint: "Fungi can't make food from sunlight: they digest dead wood." },
        { label: "Earthworm", emoji: '🪱', group: 'decomposer' },
        { label: "Woodlouse", emoji: '🦐', group: 'decomposer' },
        { label: "Bacteria", emoji: '🦠', group: 'decomposer' }
      ]
    },
    quiz: [
      { q: "What is a mushroom?", choices: ["The fruit of a fungus", "A tiny tree", "A kind of animal"], answer: 0, hint: "Like an apple on a tree…", explain: "A mushroom is the fruit of a fungus. The main part, the mycelium, is hidden." },
      { q: "Why doesn't the forest floor fill up with leaves?", choices: ["The wind blows them all away", "People sweep them up", "Decomposers break them down"], answer: 2, hint: "Remember the clean-up crew.", explain: "Worms, woodlice, fungi and bacteria break the leaves down." },
      { q: "Which of these is a decomposer?", choices: ["A fox", "A fungus", "A fern"], answer: 1, hint: "It digests dead wood.", explain: "Fungi are decomposers: they digest dead leaves and wood." },
      { q: "What do decomposers give back to the soil?", choices: ["Nutrients", "Plastic", "Snow"], answer: 0, hint: "Food for new plants…", explain: "Decomposers give nutrients back to the soil for new plants." },
      { q: "How many legs does a woodlouse have?", choices: ["6", "8", "14"], answer: 2, hint: "More than an insect or a spider!", explain: "A woodlouse has 14 legs: seven pairs." }
    ]
  }),
  lesson('biology4-forest-adaptations', 4, "Adaptations: Built for Their Home", 'adaptations', 'Adaptations', "Camouflage, thick fur, special beaks: how living things fit their homes.", ['sort'], {
    reading: [
      card("Made to fit", '🧩', "An adaptation is a feature that helps a living thing survive in its habitat. It can be a body part, like a beak, or a behaviour, like hibernating."),
      card("Hiding", '🦉', "Camouflage helps animals hide. A tawny owl's speckled brown feathers look like tree bark. A stick insect looks just like a twig."),
      card("Keeping warm or cool", '❄️', "Arctic foxes have thick fur and small ears that keep heat in. Fennec foxes in the desert have huge ears that let heat out."),
      card("Getting food", '🐦', "Beaks are tools! A woodpecker's strong beak chisels wood to find insects. A duck's flat beak sifts food from the water. A hawk's hooked beak tears meat.")
    ],
    sort: {
      q: "What does each adaptation help with? Sort Ribbit's cards!",
      groups: [{ id: 'hide', label: "Hiding", emoji: '🫥' }, { id: 'warm', label: "Keeping warm", emoji: '🧣' }, { id: 'food', label: "Getting food", emoji: '🍽️' }, { id: 'move', label: "Moving about", emoji: '🏃' }],
      items: [
        { label: "A stick insect shaped like a twig", emoji: '🪵', group: 'hide' },
        { label: "An owl's bark-coloured feathers", emoji: '🦉', group: 'hide' },
        { label: "A stoat's snow-white winter coat", emoji: '⬜', group: 'hide', hint: "In snowy places, stoats turn white in winter, so they're hard to see." },
        { label: "An arctic fox's thick fur", emoji: '🦊', group: 'warm' },
        { label: "A bear's layer of fat", emoji: '🐻', group: 'warm' },
        { label: "Penguins huddling together", emoji: '🐧', group: 'warm' },
        { label: "A woodpecker's chisel beak", emoji: '🐦', group: 'food' },
        { label: "A spider's sticky web", emoji: '🕸️', group: 'food' },
        { label: "A squirrel's sharp front teeth", emoji: '🐿️', group: 'food', hint: "Those teeth crack open nuts." },
        { label: "A duck's webbed feet", emoji: '🦆', group: 'move' },
        { label: "A frog's long back legs", emoji: '🐸', group: 'move' },
        { label: "A gibbon's long arms", emoji: '🐒', group: 'move', hint: "Gibbons swing from branch to branch." }
      ]
    },
    quiz: [
      { q: "What is an adaptation?", choices: ["A kind of food", "A feature that helps a living thing survive in its home", "A new name for an animal"], answer: 1, hint: "Made to fit…", explain: "An adaptation is a body part or a behaviour that helps a living thing survive where it lives." },
      { q: "Why does a fennec fox have huge ears?", choices: ["To keep warm in the snow", "To swim faster", "To let heat out in the hot desert"], answer: 2, hint: "It lives in the desert.", explain: "Big ears let heat escape, which keeps the fennec fox cool." },
      { q: "A duck's flat beak is good for…", choices: ["Sifting food from water", "Chiselling wood", "Tearing meat"], answer: 0, hint: "Ducks feed in ponds.", explain: "A duck's flat beak sifts little bits of food out of the water." },
      { q: "Which of these is a behaviour, not a body part?", choices: ["Having thick fur", "Hibernating through winter", "Having webbed feet"], answer: 1, hint: "Something an animal does…", explain: "Hibernating is something an animal does: a behaviour adaptation." },
      { q: "How does a stick insect stay safe?", choices: ["It roars", "It glows", "It looks like a twig"], answer: 2, hint: "Camouflage…", explain: "A stick insect looks just like a twig, so hungry birds don't notice it." }
    ]
  }),

  // ───────────── Ring 5: Nest Heights (about age 10–11) ─────────────
  lesson('biology5-forest-photosynthesis', 5, "How Leaves Make Food", 'photosynthesis', 'Photosynthesis', "Sunlight, water and air in; sugar and oxygen out. And how scientists worked it out.", ['sort', 'timeline'], {
    reading: [
      card("Food from light", '☀️', "Plants make their own food in their leaves. This is called photosynthesis, which means 'putting together with light'."),
      card("The recipe", '🧪', "Leaves take in carbon dioxide from the air through tiny holes, water from the roots, and energy from sunlight. They make sugar for food, and give out oxygen."),
      card("Green for a reason", '💚', "Leaves are green because of chlorophyll, a pigment that catches light. It soaks up red and blue light and bounces back green, so leaves look green to us."),
      card("We need it too", '🫁', "The oxygen that plants give out is oxygen we breathe, and the sugar they make is the start of almost every food chain. No photosynthesis, no forest!")
    ],
    sort: {
      q: "The photosynthesis recipe: sort what goes in, what comes out, and what isn't part of it!",
      groups: [{ id: 'in', label: "Goes in", emoji: '📥' }, { id: 'out', label: "Comes out", emoji: '📤' }, { id: 'not', label: "Not part of it", emoji: '🚫' }],
      items: [
        { label: "Sunlight", emoji: '☀️', group: 'in' },
        { label: "Water", emoji: '💧', group: 'in' },
        { label: "Carbon dioxide", emoji: '💨', group: 'in' },
        { label: "Sugar", emoji: '🍬', group: 'out' },
        { label: "Oxygen", emoji: '🫧', group: 'out' },
        { label: "Soil, eaten as food", emoji: '🟫', group: 'not', hint: "Plants take water and a few minerals from the soil, but they don't eat it: their food is made in the leaves." },
        { label: "Salt", emoji: '🧂', group: 'not' }
      ]
    },
    timeline: {
      title: "How scientists discovered photosynthesis",
      events: [
        { label: "Jan van Helmont's willow-in-a-pot results are published: the tree gained lots of weight, but the soil hardly lost any", year: 1648, when: "1648" },
        { label: "Joseph Priestley finds that a mint plant 'restores' air that a candle has used up", year: 1771, when: "1771" },
        { label: "Jan Ingenhousz shows that plants do this only in light, with their green parts", year: 1779, when: "1779" },
        { label: "Melvin Calvin wins a Nobel Prize for tracing how plants build sugar", year: 1961, when: "1961" }
      ]
    },
    quiz: [
      { q: "What does 'photosynthesis' mean?", choices: ["Eating soil", "Putting together with light", "Drinking rain"], answer: 1, hint: "'Photo' means light.", explain: "Photosynthesis means 'putting together with light'." },
      { q: "Which gas do leaves take in from the air for photosynthesis?", choices: ["Carbon dioxide", "Oxygen", "Helium"], answer: 0, hint: "It's the gas we breathe out.", explain: "Leaves take in carbon dioxide through tiny holes." },
      { q: "What makes leaves green?", choices: ["Green paint from the soil", "Algae on top", "Chlorophyll"], answer: 2, hint: "A pigment that catches light…", explain: "Chlorophyll catches red and blue light and bounces back green." },
      { q: "What did van Helmont's willow show?", choices: ["Trees grow best in the dark", "The tree's weight didn't come from the soil", "Soil turns into wood"], answer: 1, hint: "The soil hardly lost any weight.", explain: "The willow gained lots of weight, but the soil hardly lost any. We now know most of a tree is built from the air's carbon dioxide." },
      { q: "Which two things do plants make in photosynthesis?", choices: ["Salt and smoke", "Milk and honey", "Sugar and oxygen"], answer: 2, hint: "One is food; one we breathe.", explain: "Plants make sugar for food, and give out oxygen." }
    ]
  }),
  lesson('biology5-forest-pollination', 5, "Flowers, Pollinators and Flying Seeds", 'pollination-seeds', 'Pollination and seed dispersal', "How pollen gets from flower to flower, and how seeds travel to new homes.", ['sort', 'experiment'], {
    reading: [
      card("Pollen on the move", '🐝', "To make seeds, a flower needs pollen to reach its sticky middle, the stigma — usually pollen from another flower of the same kind. This is called pollination."),
      card("Helpers with wings", '🦋', "Bees, butterflies, moths, beetles, birds and even bats carry pollen. Flowers pay them with sweet nectar. Bright colours and scents are like signs saying 'food here!'"),
      card("Wind flowers", '🌾', "Grasses, hazel and pine trees use the wind instead. Their flowers are small and plain, with no nectar, but they make clouds of light pollen."),
      card("Seeds set off", '🍁', "After pollination, the flower makes seeds inside a fruit. Then the seeds travel: maple seeds spin on the wind, burrs hitch rides on fur, birds eat berries, and coconuts float.")
    ],
    sort: {
      q: "How does each plant send its seeds to new places? Sort them!",
      groups: [{ id: 'wind', label: "By the wind", emoji: '🌬️' }, { id: 'animal', label: "By animals", emoji: '🐿️' }, { id: 'water', label: "By water", emoji: '🌊' }, { id: 'pop', label: "By popping open", emoji: '💥' }],
      items: [
        { label: "Dandelion fluff", emoji: '🌼', group: 'wind' },
        { label: "Maple 'helicopters'", emoji: '🍁', group: 'wind' },
        { label: "Pine seeds with little wings", emoji: '🌲', group: 'wind' },
        { label: "Burrs that stick to fur", emoji: '🦔', group: 'animal', hint: "Burrs have tiny hooks that catch on fur and socks." },
        { label: "Blackberries eaten by birds", emoji: '🫐', group: 'animal' },
        { label: "Acorns buried by jays", emoji: '🌰', group: 'animal', hint: "Jays and squirrels bury acorns, and forget some of them!" },
        { label: "Coconuts", emoji: '🥥', group: 'water' },
        { label: "Alder seeds floating down a stream", emoji: '💧', group: 'water' },
        { label: "Gorse pods that crack and fling seeds", emoji: '🟡', group: 'pop', hint: "On hot days, gorse pods snap open with a crack!" },
        { label: "Touch-me-not pods that burst", emoji: '🌸', group: 'pop' }
      ]
    },
    sim: {
      id: 'drop',
      setup: { objects: ['paper', 'crumpled-paper'], air: 'on' },
      predict: { q: "Ribbit drops a flat sheet of paper and the same paper crumpled into a ball. Which one lands last?", choices: ["The crumpled ball", "The flat sheet", "They land together"], answer: 1, explain: "The flat sheet catches lots of air, so it floats down slowly. Seeds with wings or fluff do the same, so the wind has time to carry them far away." }
    },
    quiz: [
      { q: "What is pollination?", choices: ["Watering a plant", "A seed falling down", "Pollen reaching a flower's sticky middle"], answer: 2, hint: "Pollen on the move…", explain: "Pollination is when pollen reaches the stigma, a flower's sticky middle, so it can make seeds." },
      { q: "What do many flowers give insects for carrying their pollen?", choices: ["Sweet nectar", "Seeds", "Leaves"], answer: 0, hint: "Bees make honey from it.", explain: "Flowers pay their pollinators with sweet nectar." },
      { q: "Why are wind-pollinated flowers often small and plain?", choices: ["They are shy", "They don't need to attract animals", "They grow in the dark"], answer: 1, hint: "Who carries their pollen?", explain: "The wind carries their pollen, so they don't need bright colours, scent or nectar." },
      { q: "How do burrs travel?", choices: ["Floating on the sea", "Spinning on the wind", "Stuck to animals' fur"], answer: 2, hint: "They have tiny hooks.", explain: "Burrs hook onto passing animals' fur and drop off somewhere new." },
      { q: "Why does a flat sheet of paper fall more slowly than a crumpled one?", choices: ["It catches more air", "It is heavier", "Gravity doesn't pull it"], answer: 0, hint: "Remember the experiment.", explain: "The flat sheet catches more air, which slows it down, just like a winged seed." }
    ]
  }),

  // ───────────── Ring 6: Sunflower Rings (about age 11–12) ─────────────
  lesson('biology6-forest-food-webs', 6, "Food Webs and Nature's Balance", 'food-webs', 'Food webs and ecosystems', "Pull one thread and the whole web shakes: food webs, energy and keystone species.", ['sort', 'timeline'], {
    reading: [
      card("Chains join into webs", '🕸️', "Most animals eat more than one thing, and are eaten by more than one thing. Linked-up food chains make a food web. In the Great Tree's web, oak leaves are eaten by caterpillars, caterpillars by blue tits, and blue tits by sparrowhawks; grass is eaten by rabbits, and rabbits by foxes."),
      card("Energy gets lost", '🔺', "At each step up a food chain, most of the energy is used for living — moving, growing, keeping warm — and only about a tenth is passed on. That's why there are far fewer foxes than rabbits."),
      card("Keystone species", '🐺', "Some species hold a whole web together. When wolves were brought back to Yellowstone National Park in the USA in 1995, they changed where the elk grazed, and in some places young trees and riverbanks began to recover."),
      card("Pull one thread", '🧶', "Change one part of a web and other parts change too. Scientists study these links before they decide how to protect a habitat.")
    ],
    sort: {
      q: "A sickness makes the caterpillars very rare this year. What happens to each of these?",
      groups: [{ id: 'up', label: "Goes up", emoji: '⬆️' }, { id: 'down', label: "Goes down", emoji: '⬇️' }, { id: 'same', label: "Little or no change", emoji: '➖' }],
      items: [
        { label: "Oak leaves left uneaten", emoji: '🍃', group: 'up', hint: "Who usually eats the oak leaves?" },
        { label: "Blue-tit chicks that grow up", emoji: '🐦', group: 'down', hint: "Blue tits feed their chicks on caterpillars." },
        { label: "Food for the sparrowhawks", emoji: '🦅', group: 'down', hint: "Sparrowhawks eat blue tits, and there will be fewer of them." },
        { label: "Rabbits in the meadow", emoji: '🐰', group: 'same', hint: "Rabbits eat grass, not oak leaves or caterpillars." },
        { label: "Food for the foxes", emoji: '🦊', group: 'same' },
        { label: "Grass in the meadow", emoji: '🌾', group: 'same' }
      ]
    },
    timeline: {
      title: "Yellowstone's wolves, and learning how webs work",
      events: [
        { label: "Yellowstone becomes the world's first national park", year: 1872, when: "1872" },
        { label: "The last wolf packs are wiped out of Yellowstone", year: 1926, when: "1926" },
        { label: "Rachel Carson's book Silent Spring shows how poisons pass along food chains", year: 1962, when: "1962" },
        { label: "Wolves are brought back to Yellowstone", year: 1995, when: "1995" }
      ]
    },
    quiz: [
      { q: "What is a food web?", choices: ["One single food chain", "Many food chains linked together", "A spider's web made of food"], answer: 1, hint: "Chains join up…", explain: "A food web is many food chains linked together." },
      { q: "About how much of the energy at one level passes to the next?", choices: ["About a tenth", "All of it", "About half"], answer: 0, hint: "Most is used for living.", explain: "Only about a tenth passes on; the rest is used for moving, growing and keeping warm." },
      { q: "Why are there fewer foxes than rabbits?", choices: ["Foxes are shy", "Rabbits are bigger", "Energy is lost at each step up the chain"], answer: 2, hint: "Think about energy.", explain: "So much energy is lost at each step that the rabbits can feed only a few foxes." },
      { q: "What is a keystone species?", choices: ["The biggest animal in a forest", "One that holds a whole food web together", "A species that lives on stones"], answer: 1, hint: "Like the wolves of Yellowstone.", explain: "A keystone species has a big effect on its whole web, far bigger than its numbers." },
      { q: "When were wolves brought back to Yellowstone?", choices: ["1872", "1926", "1995"], answer: 2, hint: "Look at your timeline.", explain: "Wolves were brought back to Yellowstone in 1995." }
    ]
  }),
  lesson('biology6-forest-body-systems', 6, "Your Body's Teamwork", 'body-systems', 'Human body systems', "Heart, lungs, stomach and brain: the systems that keep you going.", ['sort'], {
    reading: [
      card("Systems", '⚙️', "Your body is made of organs, like the heart and the lungs. Organs work in teams called systems, and each system has a big job."),
      card("Breathing and blood", '❤️', "Your lungs take in oxygen from the air. Your heart pumps blood around your body, carrying that oxygen and food to every cell, about 100,000 times a day."),
      card("Food and movement", '🦴', "Your digestive system breaks food down so your blood can carry it. Your skeleton of about 206 bones holds you up, and your muscles pull on the bones to move them."),
      card("The control centre", '🧠', "Your brain and nerves carry messages around your body in a split second. They help every system work together.")
    ],
    sort: {
      q: "Which system does each body part belong to? Sort the cards!",
      groups: [{ id: 'circulatory', label: "Heart and blood", emoji: '🩸' }, { id: 'respiratory', label: "Breathing", emoji: '🌬️' }, { id: 'digestive', label: "Digestion", emoji: '🍽️' }, { id: 'nervous', label: "Control: brain and nerves", emoji: '⚡' }],
      items: [
        { label: "Heart", emoji: '🫀', group: 'circulatory' },
        { label: "Blood vessels", emoji: '🩸', group: 'circulatory' },
        { label: "Lungs", emoji: '🫁', group: 'respiratory' },
        { label: "Windpipe", emoji: '🌬️', group: 'respiratory' },
        { label: "Teeth", emoji: '🦷', group: 'digestive', hint: "Chewing is the first step of digestion." },
        { label: "Stomach", emoji: '🥣', group: 'digestive' },
        { label: "Small intestine", emoji: '🌀', group: 'digestive' },
        { label: "Brain", emoji: '🧠', group: 'nervous' },
        { label: "Spinal cord", emoji: '🧵', group: 'nervous', hint: "It runs down your back, inside your backbone, carrying messages." },
        { label: "Nerves", emoji: '⚡', group: 'nervous' }
      ]
    },
    quiz: [
      { q: "What does the heart do?", choices: ["Breaks down food", "Pumps blood around the body", "Holds you up"], answer: 1, hint: "Put your hand on your chest…", explain: "The heart pumps blood around the body, about 100,000 times a day." },
      { q: "Which organ takes in oxygen from the air?", choices: ["The stomach", "The brain", "The lungs"], answer: 2, hint: "Take a deep breath!", explain: "The lungs take in oxygen when you breathe in." },
      { q: "About how many bones does a grown-up have?", choices: ["206", "26", "2,006"], answer: 0, hint: "A couple of hundred…", explain: "A grown-up has about 206 bones." },
      { q: "How do muscles move your bones?", choices: ["They push air into them", "They pull on them", "They melt them"], answer: 1, hint: "Muscles can only pull.", explain: "Muscles pull on the bones to move them." },
      { q: "Which system carries messages around your body?", choices: ["The digestive system", "The skeleton", "The nervous system"], answer: 2, hint: "The brain is its control centre.", explain: "The nervous system — the brain, the spinal cord and the nerves — carries messages." }
    ]
  }),

  // ───────────── Ring 7: Starlight Crown (about age 12–13) ─────────────
  lesson('biology7-forest-wood-wide-web', 7, "Do Trees Talk? The Wood Wide Web", 'mycorrhizal-networks', 'Fungi, roots and the wood wide web', "Trees and fungi trade underground. What's proven, and what is still a question?", ['sort', 'timeline'], {
    reading: [
      card("Partners underground", '🍄', "Most plants, including most trees, team up with fungi. Fungal threads wrap around or grow into the tree's tiniest roots. This partnership is called a mycorrhiza, which means 'fungus-root'."),
      card("A fair trade", '🔄', "The fungus brings the tree water and nutrients, like phosphorus and nitrogen, from far through the soil. The tree pays the fungus with sugar made in its leaves."),
      card("A network", '🕸️', "Fungal threads can link the roots of several trees. In 1997, Suzanne Simard and her team showed that carbon could pass between trees through these links. People nicknamed it the 'wood wide web'."),
      card("Careful science", '🔬', "Some claims go further: that 'mother trees' feed their young, or that trees warn each other of danger. Scientists still argue about how much this really happens in wild forests. Good scientists say what's proven and what's still a question.")
    ],
    sort: {
      q: "Well shown, still being tested, or not true? Sort the claims about the wood wide web!",
      groups: [{ id: 'shown', label: "Well shown by evidence", emoji: '✅' }, { id: 'tested', label: "Still being tested", emoji: '🔍' }, { id: 'wrong', label: "Not true", emoji: '❌' }],
      items: [
        { label: "Fungi help tree roots get water and nutrients", emoji: '💧', group: 'shown' },
        { label: "Trees give the fungi sugar", emoji: '🍬', group: 'shown' },
        { label: "Fungal threads can link more than one tree", emoji: '🕸️', group: 'shown' },
        { label: "Big 'mother trees' feed their seedlings a lot through the network", emoji: '🌳', group: 'tested', hint: "Some studies suggest it; others found little effect. Scientists are still testing it in real forests." },
        { label: "Trees warn each other of insect attacks through fungi", emoji: '📣', group: 'tested', hint: "Lab experiments with some plants found signs of it, but it's not yet clear how much it happens in wild forests." },
        { label: "Trees talk to each other in words", emoji: '🗣️', group: 'wrong' },
        { label: "Mushrooms are the roots of trees", emoji: '🍄', group: 'wrong', hint: "Mushrooms are the fruits of fungi, not part of the tree." },
        { label: "Fungi make their own food from sunlight", emoji: '☀️', group: 'wrong', hint: "Fungi can't photosynthesise. That's why they trade with trees for sugar." }
      ]
    },
    timeline: {
      title: "Finding the hidden network",
      events: [
        { label: "Plants team up with fungi, as the oldest fossils of land plants show", year: -400000000, when: "about 400 million years ago" },
        { label: "Albert Bernhard Frank names the partnership 'mycorrhiza'", year: 1885, when: "1885" },
        { label: "Suzanne Simard's team shows carbon passing between trees through fungi", year: 1997, when: "1997" },
        { label: "Scientists review the evidence and call for more careful studies in real forests", year: 2023, when: "2023" }
      ]
    },
    quiz: [
      { q: "What is a mycorrhiza?", choices: ["A kind of tree bark", "A partnership between a fungus and a plant's roots", "A forest animal"], answer: 1, hint: "It means 'fungus-root'.", explain: "A mycorrhiza is a partnership between a fungus and a plant's roots." },
      { q: "What does the tree give the fungus?", choices: ["Sugar", "Phosphorus", "Soil"], answer: 0, hint: "It's made in the leaves.", explain: "The tree pays the fungus with sugar made by photosynthesis." },
      { q: "What does the fungus give the tree?", choices: ["Sunlight", "Leaves", "Water and nutrients"], answer: 2, hint: "From far through the soil…", explain: "The fungus brings water and nutrients like phosphorus and nitrogen." },
      { q: "Who showed in 1997 that carbon could move between trees through fungi?", choices: ["Charles Darwin", "Suzanne Simard and her team", "Jane Goodall"], answer: 1, hint: "Look at your timeline.", explain: "Suzanne Simard and her team, in 1997." },
      { q: "A good scientist describing the wood wide web should…", choices: ["Say what is proven and what is still a question", "Believe every exciting claim", "Never change their mind"], answer: 0, hint: "Careful science…", explain: "Good scientists are clear about what the evidence shows, and what still needs testing." }
    ]
  }),
  lesson('biology7-forest-conservation', 7, "Saving Species: Biodiversity and Conservation", 'biodiversity-conservation', 'Biodiversity and conservation', "Why the variety of life matters, what threatens it, and how people protect it.", ['maphunt', 'sort'], {
    reading: [
      card("Biodiversity", '🌍', "Biodiversity is the variety of life: all the different species, the differences within each species, and all the different habitats. Scientists have named about 2 million species, and there are millions more to find."),
      card("Why variety matters", '🧶', "Each species is a thread in nature's web. Bees pollinate crops, forests clean water and store carbon, and many medicines came from plants and fungi. Lose too many threads, and the web falls apart."),
      card("Threats", '⚠️', "The biggest threat is habitat loss: forests cut down and wetlands drained. Pollution, over-hunting, invasive species and climate change add to it."),
      card("Hope", '🌱', "Conservation works! Protected areas, breeding programmes and seed banks all help. In 2016, the giant panda was moved from 'Endangered' to 'Vulnerable', after China protected its bamboo forests.")
    ],
    maphunt: {
      q: "Find where these animals live, and the places that need protecting!",
      map: 'world',
      clues: [
        { q: "Giant pandas munch bamboo in the mountain forests of this continent.", region: 'asia', hint: "The biggest continent." },
        { q: "Mountain gorillas live in misty forests on volcanoes in the middle of this continent.", region: 'africa', hint: "South of Europe." },
        { q: "Koalas live in eucalyptus forests only on this continent.", region: 'australia', hint: "Look south-east." },
        { q: "Polar bears hunt seals on the sea ice of this ocean.", region: 'arctic', hint: "Right at the top of the world." },
        { q: "Emperor penguins raise their chicks on the ice of this frozen continent.", region: 'antarctica', hint: "Right at the bottom of the world." },
        { q: "The Amazon, home to about one in ten of all known species, is on this continent.", region: 'south-america', hint: "In the Americas, on the equator." }
      ]
    },
    sort: {
      q: "Helping or harming? Sort what people do!",
      groups: [{ id: 'help', label: "Helps wildlife", emoji: '💚' }, { id: 'harm', label: "Harms wildlife", emoji: '💔' }],
      items: [
        { label: "Planting native trees", emoji: '🌱', group: 'help' },
        { label: "Protecting a nature reserve", emoji: '🏞️', group: 'help' },
        { label: "Saving seeds in a seed bank", emoji: '🫙', group: 'help' },
        { label: "Leaving a hedgehog gap in a garden fence", emoji: '🦔', group: 'help', hint: "Hedgehogs roam far each night; small gaps let them through." },
        { label: "Draining a wetland to build on it", emoji: '🏗️', group: 'harm' },
        { label: "Dropping plastic litter", emoji: '🧴', group: 'harm' },
        { label: "Releasing pet fish into a wild pond", emoji: '🐠', group: 'harm', hint: "Pets let loose can become invasive and upset the food web." },
        { label: "Clearing a rainforest to grow one crop", emoji: '🪓', group: 'harm' }
      ]
    },
    quiz: [
      { q: "What is biodiversity?", choices: ["The number of trees in a park", "A kind of plant", "The variety of life"], answer: 2, hint: "'Bio' means life; 'diversity' means variety.", explain: "Biodiversity is the variety of life: species, the differences within them, and habitats." },
      { q: "What is the biggest threat to wildlife today?", choices: ["Habitat loss", "Too many zoos", "Rain"], answer: 0, hint: "Forests cut down, wetlands drained…", explain: "Habitat loss is the biggest threat: animals and plants lose their homes." },
      { q: "In 2016, the giant panda moved from 'Endangered' to…", choices: ["Extinct in the wild", "Vulnerable", "Critically endangered"], answer: 1, hint: "A step toward safety.", explain: "It moved to 'Vulnerable', a step safer, after its forests were protected." },
      { q: "Why can releasing pet fish into a wild pond be harmful?", choices: ["They get lonely", "They change the water's colour", "They can become invasive and upset the food web"], answer: 2, hint: "They don't belong there.", explain: "Released pets can spread, eat or outcompete wild species, and upset the food web." },
      { q: "Which famous medicine came from a mould, a kind of fungus?", choices: ["Penicillin", "Vitamin C", "Toothpaste"], answer: 0, hint: "Alexander Fleming found it in 1928.", explain: "Penicillin, the first antibiotic, came from a mould." }
    ]
  })
];

export const FOREST_LESSONS = [...FOREST_LOGIC, ...FOREST_EARTH, ...FOREST_BIOLOGY];
