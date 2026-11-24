/**
 * The Desert of the Pyramids' lessons (the desert study world, maps.js):
 * seven oasis towns along the Nile, each with the Pyramid School (math),
 * the Temple School (history) and the Sun Observatory (physics) — the same
 * three kinds of lesson as the land, all-new desert and Ancient Egypt
 * stories. Every lesson has realm: 'desert'; its floor is its oasis (1–7),
 * and its stars open the oases, never the land floors.
 *
 * Oases: 1 Sphinx Gate 🦁, 2 Camel Market 🐪, 3 Felucca Harbor ⛵,
 * 4 Obelisk Square ☀️, 5 Balloon Field 🎈, 6 Scroll Library 📜, 7 Starry Camp ⛺.
 *
 * Desert Math uses the land's chalkboard and practice generators for the
 * same floor (math.js), but its check is a fixed set of written desert word
 * problems. Dates long ago say "about"; the pyramid builders were paid workers.
 */

/* ------------------------------------------------------------ Desert Math */

/** A Desert Math lesson: the land generator `gen` draws the board and the practice; the quiz is written. */
const M = (id, floor, title, gen, topicName, blurb, kind, reading, quiz) => ({
  id, subject: 'math', floor, realm: 'desert', title, topic: gen, topicName, blurb, reading,
  board: { gen }, practice: { kind, gen }, quiz
});

const DESERT_MATH = [
  // ───────────── Oasis 1: Sphinx Gate (about age 6–7) ─────────────
  M('m1-desert-camel-count', 1, "Counting Camels", 'count', 'Counting', "Count the camels at Sphinx Gate, one by one and in fives.", 'count', [
    { title: "A line of camels", emoji: '🐪', text: "A caravan of camels has come to the oasis. Touch each camel once and say one number. The last number you say is how many camels there are." },
    { title: "Count in fives", emoji: '🖐️', text: "The camels are tied in lines of 5. Count the lines: 5, 10, 15, 20. That is much faster than counting one by one!" },
    { title: "Don't count twice", emoji: '🌴', text: "Move each date to one side as you count it. Then you never count a date twice, and you never miss one." }
  ], [
    { q: "How many camels are at the well? 🐪🐪🐪🐪🐪🐪", choices: ["5", "6", "7"], answer: 1, hint: "Touch each camel once as you count.", explain: "1, 2, 3, 4, 5, 6. There are 6 camels." },
    { q: "There are 3 rows of 5 palm trees. How many palm trees is that?", choices: ["8", "20", "15"], answer: 2, hint: "Count in fives: 5, 10, …", explain: "5, 10, 15. Three rows of 5 make 15 palm trees." },
    { q: "Count the palm trees: 🌴🌴🌴🌴🌴🌴🌴🌴🌴🌴🌴. How many are there?", choices: ["11", "10", "12"], answer: 0, hint: "Count the first 10, then keep going.", explain: "10, then 11. There are 11 palm trees." },
    { q: "Sami counts the camels: 15, 16, 17. What number comes next?", choices: ["16", "20", "18", "19"], answer: 2, hint: "What number comes just after 17?", explain: "After 17 comes 18." },
    { q: "Nala puts her dates in 4 piles of 5. How many dates does she have?", choices: ["20", "9", "25"], answer: 0, hint: "Count in fives, 4 times.", explain: "5, 10, 15, 20. Four piles of 5 make 20 dates." }
  ]),
  M('m1-desert-oasis-dates', 1, "Dates at the Oasis", 'add10', 'Adding within 10', "Sweet dates fall from the palms. How many are there now?", 'numberline', [
    { title: "Put them together", emoji: '➕', text: "Adding means putting groups together. 4 dates and 2 more dates make 6 dates!" },
    { title: "Camel steps", emoji: '🐪', text: "Start at the first number on the number line. Step forward once for each one you add. Where you stop is the answer." },
    { title: "Big number first", emoji: '🔄', text: "2 + 7 is the same as 7 + 2. Start with the bigger number, and you take fewer steps." }
  ], [
    { q: "There are 4 dates in a bowl. 3 more fall from the palm tree. How many dates are in the bowl now?", choices: ["6", "8", "7"], answer: 2, hint: "Start at 4 and step forward 3.", explain: "4 + 3 = 7. There are 7 dates." },
    { q: "5 camels drink at the well. 4 more camels come. How many camels are at the well?", choices: ["9", "8", "10"], answer: 0, hint: "Start at 5 and step forward 4.", explain: "5 + 4 = 9. There are 9 camels." },
    { q: "2 meerkats stand on a rock. 8 more meerkats pop up. How many meerkats are there?", choices: ["6", "10", "9"], answer: 1, hint: "Start with the bigger number, 8, and step 2.", explain: "8 + 2 = 10, and 2 + 8 = 10 too. There are 10 meerkats." },
    { q: "A boat has 6 people in it. 1 more person gets in. How many people are in the boat?", choices: ["5", "8", "16", "7"], answer: 3, hint: "One more than 6.", explain: "6 + 1 = 7. There are 7 people in the boat." },
    { q: "Amir has 3 shiny stones. He finds 3 more. How many stones does he have now?", choices: ["6", "5", "33"], answer: 0, hint: "Start at 3 and step forward 3.", explain: "3 + 3 = 6. Amir has 6 stones." }
  ]),

  // ───────────── Oasis 2: Camel Market (about age 7–8) ─────────────
  M('m2-desert-hieroglyph-numbers', 2, "Hieroglyph Numbers", 'tens-ones', 'Place value', "Write numbers the way the ancient Egyptians did, with sticks and arches.", 'place-value', [
    { title: "Egyptian numbers", emoji: '✍️', text: "Long ago, Egyptians wrote 1 as a little stick: |. They wrote 10 as an arch shape: ∩. So ∩∩||| means 2 tens and 3 ones: 23." },
    { title: "Bigger signs", emoji: '🪷', text: "They had more signs for bigger numbers: a coil of rope for 100 and a lotus flower for 1,000. A big number used lots of signs!" },
    { title: "Our numbers use places", emoji: '🏠', text: "We use places instead. In 46, the 4 is in the tens place, so it means 40. The 6 is in the ones place, so it means 6. 46 and 64 are different numbers!" }
  ], [
    { q: "An Egyptian wrote ∩∩∩∩∩|||. What number is that?", choices: ["35", "53", "8"], answer: 1, hint: "Each ∩ is 10 and each | is 1.", explain: "5 arches are 5 tens (50), and 3 sticks are 3 ones. 50 + 3 = 53." },
    { q: "A trader has 72 dates. How many tens are in 72?", choices: ["7", "2", "9"], answer: 0, hint: "Look at the tens place: the first digit.", explain: "72 is 7 tens and 2 ones, so there are 7 tens." },
    { q: "Which Egyptian number means 26?", choices: ["∩∩∩∩∩∩||", "∩||||||", "∩∩||||||"], answer: 2, hint: "26 is 2 tens and 6 ones.", explain: "2 arches (∩∩) for 2 tens and 6 sticks (||||||) for 6 ones make 26." },
    { q: "In 48, what does the 4 mean?", choices: ["4 ones", "4 tens", "4 hundreds"], answer: 1, hint: "The 4 is in the tens place.", explain: "In 48, the 4 means 4 tens (40) and the 8 means 8 ones." },
    { q: "The Egyptians drew a coil of rope for 100. How many tens make 100?", choices: ["100", "1", "5", "10"], answer: 3, hint: "Count in tens: 10, 20, 30 …", explain: "10, 20, 30, 40, 50, 60, 70, 80, 90, 100. Ten tens make 100." }
  ]),
  M('m2-desert-market-adding', 2, "Adding at the Camel Market", 'add-carry', 'Column addition', "Add up the traders' sacks and baskets in columns, and carry the ten.", 'column', [
    { title: "Line them up", emoji: '📏', text: "At the Camel Market, traders add up their goods. Write the numbers one under the other: ones under ones, tens under tens." },
    { title: "Ones first", emoji: '1️⃣', text: "Always add the ones column first. If the ones make 10 or more, you have made a new ten!" },
    { title: "Carry the ten", emoji: '🧺', text: "Write the ones digit at the bottom. Carry the 1 ten to the top of the tens column, and add it in with the other tens." }
  ], [
    { q: "A trader has 27 sacks of grain. She buys 15 more. How many sacks does she have now?", choices: ["32", "42", "312"], answer: 1, hint: "7 + 5 = 12, so carry a ten.", explain: "Ones: 7 + 5 = 12, write 2 and carry 1. Tens: 2 + 1 + 1 = 4. The answer is 42." },
    { q: "38 camels are at the market in the morning. 24 more arrive at noon. How many camels are there?", choices: ["62", "52", "512"], answer: 0, hint: "8 + 4 = 12. Write 2, carry 1.", explain: "Ones: 8 + 4 = 12, write 2 and carry 1. Tens: 3 + 2 + 1 = 6. There are 62 camels." },
    { q: "A basket seller sells 46 baskets on Monday and 37 on Tuesday. How many is that?", choices: ["73", "713", "83"], answer: 2, hint: "6 + 7 = 13. Carry the ten.", explain: "Ones: 6 + 7 = 13, write 3 and carry 1. Tens: 4 + 3 + 1 = 8. That makes 83 baskets." },
    { q: "Two caravans each bring 19 bags of salt. How many bags is that?", choices: ["28", "39", "29", "38"], answer: 3, hint: "19 + 19: 9 + 9 = 18.", explain: "Ones: 9 + 9 = 18, write 8 and carry 1. Tens: 1 + 1 + 1 = 3. That makes 38 bags." },
    { q: "When the ones column adds up to 10 or more, what do you do?", choices: ["Carry a ten to the tens column", "Start again", "Leave it out"], answer: 0, hint: "Ten ones make one ten.", explain: "Ten ones make a new ten, so you carry it over and add it to the tens column." }
  ]),

  // ───────────── Oasis 3: Felucca Harbor (about age 8–9) ─────────────
  M('m3-desert-brick-rows', 3, "Rows of Mud Bricks", 'times', 'Times tables', "Builders stack sun-dried mud bricks in rows. Multiply to count them.", 'array', [
    { title: "Bricks from the river", emoji: '🧱', text: "Egyptians made bricks from Nile mud mixed with straw, shaped them in wooden moulds and dried them in the sun. They laid them out in neat rows. 3 rows of 6 bricks make 3 × 6 = 18 bricks." },
    { title: "Turn it round", emoji: '🔄', text: "Turn the rows on their side and you get 6 rows of 3. Still 18! So 3 × 6 = 6 × 3." },
    { title: "Count in steps", emoji: '🐪', text: "To find 4 × 7, count in sevens 4 times: 7, 14, 21, 28." }
  ], [
    { q: "A builder lays 4 rows of 6 bricks to dry. How many bricks is that?", choices: ["10", "24", "20"], answer: 1, hint: "4 rows of 6 is 4 × 6.", explain: "4 × 6 = 24. There are 24 bricks." },
    { q: "There are 3 boats in the harbour, with 7 sailors on each boat. How many sailors are there?", choices: ["21", "10", "24"], answer: 0, hint: "Count in sevens 3 times.", explain: "3 × 7 = 21. There are 21 sailors." },
    { q: "A wall has 5 rows of 5 bricks. How many bricks are in the wall?", choices: ["10", "20", "25"], answer: 2, hint: "5 rows of 5 is 5 × 5.", explain: "5 × 5 = 25. There are 25 bricks." },
    { q: "Which is the same as 8 × 3?", choices: ["8 + 3", "3 × 8", "8 × 8"], answer: 1, hint: "Turn the rows round.", explain: "8 × 3 = 3 × 8 = 24. Swapping the numbers gives the same answer." },
    { q: "A felucca has 9 rows of seats with 2 seats in each row. How many seats is that?", choices: ["11", "16", "29", "18"], answer: 3, hint: "Count in twos 9 times.", explain: "9 × 2 = 18. The felucca has 18 seats." }
  ]),
  M('m3-desert-sharing-loaves', 3, "Sharing Loaves", 'fractions', 'Fractions', "Share bread fairly, the way Egyptian scribes worked out fractions.", 'pizza', [
    { title: "Fair shares", emoji: '🍞', text: "A fraction is part of a whole. Egyptian workers were often paid in bread, so sharing loaves fairly mattered! The parts must be equal." },
    { title: "Top and bottom", emoji: '🔢', text: "In 3/4, the bottom number (4) says how many equal parts there are. The top number (3) says how many parts we have." },
    { title: "Egyptian fractions", emoji: '📜', text: "Egyptian scribes liked fractions with 1 on top, like 1/2, 1/3 and 1/4. An old maths scroll, the Rhind Papyrus, has puzzles about sharing loaves between workers." }
  ], [
    { q: "A loaf is cut into 4 equal parts. Kemi eats 1 part. What fraction of the loaf did she eat?", choices: ["1/3", "1/4", "3/4"], answer: 1, hint: "How many equal parts? How many did she eat?", explain: "There are 4 equal parts and Kemi ate 1, so she ate 1/4. The other 3/4 is left." },
    { q: "A flatbread has 8 equal pieces. 3 pieces have honey on them. What fraction has honey?", choices: ["3/8", "5/8", "3/5"], answer: 0, hint: "The bottom number is how many pieces in all.", explain: "3 of the 8 equal pieces have honey, so 3/8 has honey." },
    { q: "Which is bigger: 1/2 of a loaf or 1/3 of the same loaf?", choices: ["1/3", "They are the same", "1/2"], answer: 2, hint: "Fewer parts means bigger pieces.", explain: "Cut into 2, each piece is bigger than when it is cut into 3. So 1/2 is bigger than 1/3." },
    { q: "A loaf is cut into 3 equal parts. 2 parts are eaten. What fraction is left?", choices: ["2/3", "1/3", "1/2"], answer: 1, hint: "How many parts are left out of 3?", explain: "3 − 2 = 1 part is left, so 1/3 of the loaf is left." },
    { q: "Egyptian scribes liked fractions with 1 on top. Which one is like that?", choices: ["3/5", "4/5", "2/5", "1/5"], answer: 3, hint: "Look for a 1 as the top number.", explain: "1/5 has 1 on top. Scribes wrote most fractions as 1/2, 1/3, 1/4, 1/5 and so on." }
  ]),

  // ───────────── Oasis 4: Obelisk Square (about age 9–10) ─────────────
  M('m4-desert-cubits', 4, "Measuring in Cubits", 'mult-2x1', '2-digit × 1-digit', "Measure walls and obelisks in cubits and palms, and multiply by splitting.", 'grid', [
    { title: "The royal cubit", emoji: '📏', text: "Egyptian builders measured in cubits. A royal cubit was about 52 cm, about a grown-up's arm from the elbow to the fingertips. It was split into 7 palms, and each palm into 4 fingers." },
    { title: "Break it up", emoji: '🧩', text: "A wall is 14 cubits long. How many palms is that? 14 × 7 = 10 × 7 + 4 × 7 = 70 + 28 = 98 palms." },
    { title: "Estimate first", emoji: '🎯', text: "29 × 3 should be close to 30 × 3 = 90. If you get 870, something went wrong. Check again!" }
  ], [
    { q: "A wall is 12 cubits long. Each cubit is 7 palms. How many palms long is the wall?", choices: ["19", "84", "74"], answer: 1, hint: "12 is 10 and 2. Multiply each part by 7.", explain: "10 × 7 = 70 and 2 × 7 = 14. 70 + 14 = 84 palms." },
    { q: "A rope is 23 cubits long. How long are 3 of these ropes together?", choices: ["69 cubits", "26 cubits", "66 cubits"], answer: 0, hint: "23 is 20 and 3. Multiply each part by 3.", explain: "20 × 3 = 60 and 3 × 3 = 9. 60 + 9 = 69 cubits." },
    { q: "Each palm is 4 fingers. How many fingers is 16 palms?", choices: ["20", "48", "64"], answer: 2, hint: "16 is 10 and 6. Multiply each part by 4.", explain: "10 × 4 = 40 and 6 × 4 = 24. 40 + 24 = 64 fingers." },
    { q: "A temple has 6 rows of 24 columns. How many columns is that?", choices: ["30", "124", "144", "126"], answer: 2, hint: "24 is 20 and 4. Multiply each part by 6.", explain: "20 × 6 = 120 and 4 × 6 = 24. 120 + 24 = 144 columns." },
    { q: "Which is the best estimate for 49 × 3?", choices: ["About 15", "About 150", "About 1,500"], answer: 1, hint: "49 is close to 50.", explain: "49 is close to 50, and 50 × 3 = 150. The exact answer is 147." }
  ]),
  M('m4-desert-caravan-loads', 4, "Sharing the Caravan's Load", 'division', 'Division', "Share sacks, dates and water fairly between camels and travellers.", 'array', [
    { title: "Fair loads", emoji: '🐪', text: "Dividing means sharing equally. A caravan has 32 sacks and 4 camels. Each camel carries 32 ÷ 4 = 8 sacks, so no camel gets too much." },
    { title: "Opposite of times", emoji: '↔️', text: "Division undoes multiplication. 4 × 8 = 32, so 32 ÷ 4 = 8 and 32 ÷ 8 = 4." },
    { title: "Use your tables", emoji: '📋', text: "To find 54 ÷ 6, ask: what times 6 makes 54? It is 9." }
  ], [
    { q: "A caravan has 32 sacks of salt and 4 camels. Each camel carries the same number. How many sacks does each camel carry?", choices: ["8", "28", "9"], answer: 0, hint: "What times 4 makes 32?", explain: "4 × 8 = 32, so 32 ÷ 4 = 8 sacks for each camel." },
    { q: "45 dates are shared equally between 5 travellers. How many dates does each one get?", choices: ["40", "8", "9"], answer: 2, hint: "What times 5 makes 45?", explain: "5 × 9 = 45, so 45 ÷ 5 = 9 dates each." },
    { q: "42 water skins are laid out in rows of 6. How many rows are there?", choices: ["7", "36", "8"], answer: 0, hint: "What times 6 makes 42?", explain: "6 × 7 = 42, so 42 ÷ 6 = 7 rows." },
    { q: "A trader packs 54 lamps into 6 equal boxes. How many lamps go in each box?", choices: ["8", "48", "60", "9"], answer: 3, hint: "What times 6 makes 54?", explain: "6 × 9 = 54, so 54 ÷ 6 = 9 lamps in each box." },
    { q: "Which fact helps you find 36 ÷ 4?", choices: ["4 + 9 = 13", "4 × 9 = 36", "36 − 4 = 32"], answer: 1, hint: "Division undoes multiplication.", explain: "4 × 9 = 36, so 36 ÷ 4 = 9." }
  ]),

  // ───────────── Oasis 5: Balloon Field (about age 10–11) ─────────────
  M('m5-desert-flood-fields', 5, "Fields After the Flood", 'area', 'Area and perimeter', "Measure the fields again after the Nile flood washes the edges away.", 'grid', [
    { title: "Lost edges", emoji: '🌊', text: "Every year the Nile flooded the fields and washed away the marks between them. Afterwards, measurers with knotted ropes worked out each field again." },
    { title: "Perimeter", emoji: '🪢', text: "Perimeter is the distance all the way round a shape. To put a rope round a rectangular field, add up all four sides." },
    { title: "Area", emoji: '🟩', text: "Area is how much ground a shape covers, in squares like square metres (m²). For a rectangle, area = length × width. A field 9 m long and 4 m wide covers 36 m², and its perimeter is 9 + 4 + 9 + 4 = 26 m." }
  ], [
    { q: "A field is a rectangle 8 m long and 5 m wide. What is its area?", choices: ["13 m²", "26 m²", "40 m²"], answer: 2, hint: "Area = length × width.", explain: "8 × 5 = 40, so the area is 40 m²." },
    { q: "A rope goes all the way round a field 12 m long and 2 m wide. How long is the rope?", choices: ["28 m", "24 m", "14 m"], answer: 0, hint: "Add all four sides.", explain: "12 + 2 + 12 + 2 = 28, so the rope is 28 m long." },
    { q: "A square vegetable patch has sides of 7 m. What is its area?", choices: ["14 m²", "49 m²", "28 m²"], answer: 1, hint: "A square's length and width are the same.", explain: "7 × 7 = 49, so the area is 49 m²." },
    { q: "A map of the fields is a grid 9 squares wide and 6 squares tall. How many squares are there?", choices: ["15", "30", "45", "54"], answer: 3, hint: "Rows × columns.", explain: "9 × 6 = 54 squares." },
    { q: "Two fields both have an area of 24 m². One is 6 m by 4 m. The other is 8 m wide. How long is it?", choices: ["3 m", "16 m", "4 m"], answer: 0, hint: "What times 8 makes 24?", explain: "8 × 3 = 24, so the second field is 3 m long." }
  ]),
  M('m5-desert-market-scales', 5, "Balancing the Market Scales", 'balance', 'Equations', "Find the mystery weight that makes the trader's scales balance.", 'balance', [
    { title: "A balance scale", emoji: '⚖️', text: "Egyptian traders weighed goods on balance scales, with stone weights on one side. When both sides weigh the same, the scale balances." },
    { title: "The mystery weight", emoji: '❓', text: "A sack of x kg plus a 6 kg weight balances 15 kg. We write x + 6 = 15. What is x?" },
    { title: "Keep it balanced", emoji: '🤝', text: "Take 6 from both sides and it still balances: x = 15 − 6 = 9. Whatever you do to one side, do to the other." }
  ], [
    { q: "A sack and a 6 kg weight balance 15 kg: x + 6 = 15. What is x?", choices: ["9", "21", "11"], answer: 0, hint: "Take 6 from both sides.", explain: "x = 15 − 6 = 9. Check: 9 + 6 = 15." },
    { q: "12 + x = 20. What is x?", choices: ["32", "9", "8"], answer: 2, hint: "What do you add to 12 to make 20?", explain: "x = 20 − 12 = 8. Check: 12 + 8 = 20." },
    { q: "A trader takes 4 kg of dates out of a basket, and 10 kg are left: x − 4 = 10. How much was in the basket?", choices: ["6 kg", "14 kg", "40 kg"], answer: 1, hint: "Add 4 to both sides.", explain: "x = 10 + 4 = 14 kg. Check: 14 − 4 = 10." },
    { q: "3 jars of honey, each weighing x kg, balance 21 kg: 3x = 21. What is x?", choices: ["18", "24", "63", "7"], answer: 3, hint: "Divide both sides by 3.", explain: "x = 21 ÷ 3 = 7 kg. Check: 3 × 7 = 21." },
    { q: "To solve x + 25 = 40, what should you do to both sides?", choices: ["Take away 25", "Add 25", "Multiply by 25"], answer: 0, hint: "Undo the + 25.", explain: "Taking away 25 from both sides gives x = 15, and the scale still balances." }
  ]),

  // ───────────── Oasis 6: Scroll Library (about age 11–12) ─────────────
  M('m6-desert-cold-nights', 6, "Below Zero in the Desert", 'negatives', 'Negative numbers', "Desert nights can fall below zero, and some desert ground lies below sea level.", 'numberline', [
    { title: "Cold desert nights", emoji: '🌙', text: "Deserts can be very hot by day and very cold at night. On a winter night in the Sahara, it can fall below 0 °C. Temperatures below zero are negative numbers, like −3 °C." },
    { title: "Counting across zero", emoji: '🌡️', text: "It is −4 °C at dawn. By noon it is 10 degrees warmer. Count up: −3, −2, −1, 0, 1 … 6. It is 6 °C." },
    { title: "Below sea level", emoji: '🏜️', text: "Heights are measured from sea level, 0 m. Parts of the Qattara Depression in Egypt's desert lie about 133 m below sea level: −133 m." }
  ], [
    { q: "It is −4 °C at dawn in the desert. By noon it is 10 degrees warmer. What is the temperature at noon?", choices: ["6 °C", "14 °C", "−14 °C"], answer: 0, hint: "Count up 10 from −4.", explain: "−4 + 10 = 6. It is 6 °C at noon." },
    { q: "It is 18 °C in the evening. The temperature falls 21 degrees by midnight. What is it at midnight?", choices: ["3 °C", "−3 °C", "−39 °C"], answer: 1, hint: "Fall 18 degrees to reach 0, then 3 more.", explain: "18 − 21 = −3. It is −3 °C at midnight." },
    { q: "Which is colder: −6 °C or −2 °C?", choices: ["−2 °C", "They are the same", "−6 °C"], answer: 2, hint: "The further below 0, the colder.", explain: "−6 is further below 0 than −2, so −6 °C is colder." },
    { q: "A night is −5 °C and the next afternoon is 20 °C. How many degrees warmer is the afternoon?", choices: ["15", "−25", "20", "25"], answer: 3, hint: "From −5 up to 0, then from 0 up to 20.", explain: "5 degrees up to 0, then 20 more: 5 + 20 = 25 degrees warmer." },
    { q: "The bottom of a desert hollow is at −133 m. A hill nearby is 67 m above sea level. How far is it from the bottom to the top of the hill?", choices: ["66 m", "200 m", "−66 m"], answer: 1, hint: "133 m up to sea level, then 67 m more.", explain: "133 + 67 = 200. It is 200 m from the bottom of the hollow to the top of the hill." }
  ]),
  M('m6-desert-percent', 6, "Desert Percentages", 'percent', 'Percentages', "Camels, dates and sand: find percentages across the desert.", 'grid', [
    { title: "Out of a hundred", emoji: '💯', text: "Per cent means out of 100. If 45 of 100 palm trees in the oasis are date palms, then 45% of the trees are date palms." },
    { title: "Handy ones to know", emoji: '🧠', text: "50% is a half, 25% is a quarter, 75% is three quarters and 10% is a tenth. The Sahara covers about 30% of Africa: almost a third!" },
    { title: "Finding a percentage", emoji: '🐪', text: "To find 30% of 70 camels: 10% of 70 is 7, so 30% is 3 × 7 = 21 camels." }
  ], [
    { q: "A caravan has 60 camels. 50% of them carry salt. How many camels carry salt?", choices: ["30", "50", "10"], answer: 0, hint: "50% is a half.", explain: "Half of 60 is 30, so 30 camels carry salt." },
    { q: "A trader has 80 dates. She sells 25% of them. How many dates does she sell?", choices: ["25", "20", "40"], answer: 1, hint: "25% is a quarter.", explain: "A quarter of 80 is 20, so she sells 20 dates." },
    { q: "Out of 100 palm trees, 45 are date palms. What percentage are date palms?", choices: ["4.5%", "55%", "45%"], answer: 2, hint: "Per cent means out of 100.", explain: "45 out of 100 is 45%." },
    { q: "A well holds 250 litres. 10% is used to water the camels. How many litres is that?", choices: ["10", "2.5", "50", "25"], answer: 3, hint: "10% is a tenth.", explain: "A tenth of 250 is 25, so 25 litres are used." },
    { q: "A library has 120 scrolls. 75% of them are about the stars. How many scrolls is that?", choices: ["90", "75", "30"], answer: 0, hint: "Find a quarter first, then take three of them.", explain: "A quarter of 120 is 30, so three quarters is 3 × 30 = 90 scrolls." }
  ]),

  // ───────────── Oasis 7: Starry Camp (about age 12–13) ─────────────
  M('m7-desert-caravan-equations', 7, "Caravan Supply Equations", 'two-step', 'Two-step equations', "Plan the caravan's supplies by undoing two steps.", 'balance', [
    { title: "Wrapping and unwrapping", emoji: '🎁', text: "In 5x + 8 = 48, x was multiplied by 5, then 8 was added. To solve it, unwrap in reverse: undo the + 8 first, then the × 5." },
    { title: "Inverse operations", emoji: '↩️', text: "Subtraction undoes addition; division undoes multiplication. Whatever you do to one side, do to the other: 5x = 40, so x = 8." },
    { title: "Always check", emoji: '✔️', text: "Put your answer back in: 5 × 8 + 8 = 48. Both sides match, so x = 8 is right." }
  ], [
    { q: "The caravan packs x bags of 5 kg of flour, plus 8 kg of other food. It packs 48 kg in all: 5x + 8 = 48. What is x?", choices: ["9", "8", "11"], answer: 1, hint: "Undo the + 8 first, then the × 5.", explain: "5x = 48 − 8 = 40, so x = 40 ÷ 5 = 8. Check: 5 × 8 + 8 = 48." },
    { q: "In the guide's notebook, 3x − 6 = 21. What is x?", choices: ["9", "5", "7"], answer: 0, hint: "Add 6 to both sides, then divide by 3.", explain: "3x = 21 + 6 = 27, so x = 27 ÷ 3 = 9. Check: 3 × 9 − 6 = 21." },
    { q: "A saddle weighs 15 kg. A camel carries the saddle and x sacks of 20 kg: 135 kg in all. How many sacks?", choices: ["7.5", "5", "6", "8"], answer: 2, hint: "Write 20x + 15 = 135, then solve it.", explain: "20x = 135 − 15 = 120, so x = 120 ÷ 20 = 6 sacks. Check: 20 × 6 + 15 = 135." },
    { q: "The camp has 4x + 12 = 60 blankets. What is x?", choices: ["18", "15", "12"], answer: 2, hint: "Subtract 12, then divide by 4.", explain: "4x = 60 − 12 = 48, so x = 48 ÷ 4 = 12. Check: 4 × 12 + 12 = 60." },
    { q: "To unwrap 9x − 4 = 50 in reverse order, what is the first step?", choices: ["Divide both sides by 9", "Subtract 4 from both sides", "Add 4 to both sides", "Multiply both sides by 9"], answer: 2, hint: "The − 4 was the last thing done to x.", explain: "Undo the last step first: add 4 to get 9x = 54, then divide by 9 to get x = 6." }
  ]),
  M('m7-desert-pyramid-squares', 7, "The Pyramid's Square Base", 'squares', 'Squares and roots', "The Great Pyramid stands on a square. Find areas from sides, and sides from areas.", 'grid', [
    { title: "A square base", emoji: '🔺', text: "The Great Pyramid stands on an almost perfect square, about 230 m along each side. Its builders lined it up very carefully with north, south, east and west." },
    { title: "Square numbers", emoji: '🟨', text: "6² (\"6 squared\") means 6 × 6 = 36. The area of a square is its side squared, so the pyramid's base covers about 230² = 52,900 m²." },
    { title: "Square roots", emoji: '🌱', text: "The square root goes backwards: √144 asks which number times itself makes 144. The answer is 12. If you know a square's area, its side is the square root." }
  ], [
    { q: "A square courtyard has sides of 9 m. What is its area?", choices: ["18 m²", "81 m²", "36 m²"], answer: 1, hint: "Area = side².", explain: "9² = 9 × 9 = 81 m²." },
    { q: "A square plaza covers 144 m². How long is each side?", choices: ["12 m", "72 m", "14 m"], answer: 0, hint: "Which number times itself makes 144?", explain: "12 × 12 = 144, so √144 = 12 and each side is 12 m." },
    { q: "What is 15²?", choices: ["30", "152", "225"], answer: 2, hint: "15² means 15 × 15, not 15 × 2.", explain: "15 × 15 = 225." },
    { q: "A square garden covers 64 m². What is its perimeter?", choices: ["8 m", "16 m", "64 m", "32 m"], answer: 3, hint: "Find the side first, then add all four sides.", explain: "√64 = 8, so each side is 8 m. The perimeter is 4 × 8 = 32 m." },
    { q: "The Great Pyramid's base is about 230 m on each side. About how big is its area?", choices: ["About 52,900 m²", "About 920 m²", "About 460 m²"], answer: 0, hint: "Area = 230 × 230.", explain: "230 × 230 = 52,900, so the base covers about 52,900 m², bigger than seven football pitches." }
  ])
];

/* ------------------------------------------------------------ Temple School (history) */

const DESERT_HISTORY = [
  // ───────────── Oasis 1: Sphinx Gate (about age 6–7) ─────────────
  {
    id: 'h1-desert-nile-farmers',
    subject: 'history',
    floor: 1,
    realm: 'desert',
    title: "Farmers of the Nile",
    topic: 'nile-farming',
    topicName: 'Farming by the Nile',
    blurb: "Plant, grow and harvest with a farmer, in time with the great river.",
    reading: [
      { title: "A river in the desert", emoji: '🌊', text: "Egypt is mostly hot, dry desert. But the long River Nile flows right through it, and people grew their food on the green land beside the river." },
      { title: "The flood", emoji: '💧', text: "Every summer the Nile rose and spread over the fields. When the water went down again, it left behind rich, dark mud that was very good for growing plants." },
      { title: "Three seasons", emoji: '🌾', text: "The ancient Egyptians had three seasons: the flood, the growing time and the harvest. They grew wheat and barley, and onions, beans, lettuce and melons too." },
      { title: "Bread for everyone", emoji: '🍞', text: "Wheat and barley were made into bread. Bread was so important that many workers were paid with it!" }
    ],
    dialogue: {
      npc: { name: "Nefer", role: "a farmer by the Nile, long ago", look: 'nile', portrayal: 'generic' },
      intro: "Hello, little friend! I'm Nefer. The river has gone down, so it's time to plant. Will you help me scatter the seeds?",
      topics: [
        { ask: "Why do you live by the river?", answer: "Because the river gives us water! Away from the Nile there is only sand and rock. Here, beside the river, the land is green and good for farming." },
        { ask: "What happens in the flood?", answer: "Every summer the river rises and covers our fields. When the water goes down, it leaves black mud behind. We call our land Kemet, the Black Land, because of that mud!" },
        { ask: "What do you grow?", answer: "Wheat and barley for bread, and onions, beans, lettuce and melons. We grow flax too, a plant we make into soft linen cloth." },
        { ask: "How do you water the plants?", answer: "We dig little canals from the river to the fields. And we use a shadoof: a long pole with a bucket on one end and a heavy weight on the other. It makes lifting water easy." },
        { ask: "How do you know when the flood is coming?", answer: "We watch the sky! When a bright star called Sirius rises just before the Sun in summer, we know the river will soon rise." }
      ],
      challenge: {
        q: "What did the Nile's flood leave on the fields?",
        choices: ["Rich, dark mud", "Snow", "Big rocks"],
        answer: 0,
        explain: "When the flood water went down, it left rich, dark mud behind, and crops grew well in it."
      },
      farewell: "Thank you for your help! Come back at harvest time, and we'll bake bread together."
    },
    timeline: {
      title: "Farming by the Nile",
      events: [
        { label: "People start growing wheat and barley by the Nile", year: -5000, when: "about 7,000 years ago" },
        { label: "Farmers dig canals to bring river water to their fields", year: -3000, when: "about 5,000 years ago" },
        { label: "Farmers use the shadoof to lift water", year: -1500, when: "about 3,500 years ago" },
        { label: "The Aswan High Dam is finished, and the Nile stops flooding every year", year: 1970, when: "1970" }
      ]
    },
    artifact: {
      model: 'shadoof',
      name: "A shadoof",
      text: "A shadoof is a long pole that rests on a post, like a seesaw. A bucket hangs on one end and a heavy weight on the other. The farmer pulls the bucket down into the water, and the weight helps lift it up again. Some farmers still use them today."
    },
    quiz: [
      { q: "What flows through the desert of Egypt and gives water for farms?", choices: ["A big glacier", "The River Nile", "The sea"], answer: 1, hint: "It is a very long river.", explain: "The River Nile flows through the desert, and farms grow on the green land beside it." },
      { q: "What did the Nile's flood leave behind on the fields?", choices: ["Sand", "Salt", "Rich, dark mud"], answer: 2, hint: "The Egyptians called their land the Black Land.", explain: "The flood left rich, dark mud, which was very good for growing crops." },
      { q: "What did farmers make from wheat and barley?", choices: ["Bread", "Paper", "Rope"], answer: 0, hint: "Workers were paid with it.", explain: "Wheat and barley were made into bread, the most important food in ancient Egypt." },
      { q: "How many seasons did the ancient Egyptians have?", choices: ["Four", "Two", "Three"], answer: 2, hint: "Flood, growing and…", explain: "They had three seasons: the flood, the growing time and the harvest." },
      { q: "What did a shadoof help farmers do?", choices: ["Lift water from the river", "Catch fish", "Count sheep"], answer: 0, hint: "It has a bucket on one end.", explain: "A shadoof is a pole with a bucket and a weight, and it helps lift water from the river." }
    ]
  },
  {
    id: 'h1-desert-toys-games',
    subject: 'history',
    floor: 1,
    realm: 'desert',
    title: "Toys and Games of Ancient Egypt",
    topic: 'ancient-toys',
    topicName: 'Toys and games long ago',
    blurb: "Spin a top, toss a ball and play senet with a toymaker from long ago.",
    reading: [
      { title: "Children played too", emoji: '🧸', text: "Children in ancient Egypt loved to play, just like you. They had balls, spinning tops, dolls and little wooden animals." },
      { title: "Toys that move", emoji: '🐱', text: "Some toys could move! A wooden cat in a museum today has a jaw that moves, so it can open and shut its mouth." },
      { title: "Senet", emoji: '🎲', text: "Senet was a board game with 30 squares in three rows. Players threw flat sticks to see how far to move, a bit like dice. Farmers and pharaohs both played it." },
      { title: "Games outside", emoji: '🤸', text: "Pictures on old walls show people playing tug-of-war, leapfrog and catch, and even juggling balls." }
    ],
    dialogue: {
      npc: { name: "Meryt", role: "a toymaker in ancient Egypt", look: 'nile', portrayal: 'generic' },
      intro: "Hello! I'm Meryt, and I make toys. Look, this little wooden cat can open its mouth. Do you want to play?",
      topics: [
        { ask: "What toys do you make?", answer: "Balls, spinning tops, dolls and little wooden animals. My favourite is this cat with a moving jaw. Children laugh when it opens its mouth!" },
        { ask: "What are your balls made of?", answer: "Leather or linen cloth, stuffed with straw or reeds. Some are made of clay. They're good for throwing and catching!" },
        { ask: "How do you play senet?", answer: "Senet has 30 squares in three rows. You throw four flat sticks and count how many land with the light side up. Then you move your pieces along the board. Get all your pieces off the board first to win!" },
        { ask: "Do grown-ups play too?", answer: "Oh yes! Everyone loves senet, from farmers to the pharaoh. Some people have beautiful senet boards made of wood and ivory." },
        { ask: "What games do you play outside?", answer: "Tug-of-war, leapfrog, races and catch! Some girls can juggle three balls at once. Can you?" }
      ],
      challenge: {
        q: "What was senet?",
        choices: ["A board game", "A kind of bread", "A boat"],
        answer: 0,
        explain: "Senet was a board game with 30 squares. People threw sticks to see how far to move their pieces."
      },
      farewell: "Thanks for playing! Take this spinning top with you. Give it a good twist!"
    },
    timeline: {
      title: "Games through time",
      events: [
        { label: "People in Egypt play senet", year: -3000, when: "about 5,000 years ago" },
        { label: "Children in the town of Lahun play with balls and spinning tops", year: -1850, when: "about 3,850 years ago" },
        { label: "King Tutankhamun is buried with his senet boards", year: -1323, when: "about 1323 BCE" },
        { label: "Archaeologists dig up the toys of Lahun", year: 1889, when: "1889" }
      ]
    },
    artifact: {
      model: 'senet',
      name: "A senet board",
      text: "This is a senet board, with 30 squares in three rows and little playing pieces. Senet is one of the oldest board games we know. Nobody knows all its rules for sure today, so people still try to work them out!"
    },
    quiz: [
      { q: "Did children in ancient Egypt play with toys?", choices: ["No, they never played", "Yes, with balls, tops and wooden animals"], answer: 1, hint: "Think of Meryt's workshop.", explain: "Yes! Children played with balls, spinning tops, dolls and wooden animals." },
      { q: "How many squares does a senet board have?", choices: ["30", "10", "100"], answer: 0, hint: "Three rows of ten.", explain: "A senet board has 30 squares in three rows of 10." },
      { q: "In senet, what did players throw to see how far to move?", choices: ["Shoes", "Flat sticks", "Stones into a pool"], answer: 1, hint: "They were a bit like dice.", explain: "Players threw flat sticks and counted how they landed." },
      { q: "Who played senet?", choices: ["Only pharaohs", "Only children", "People of all kinds, from farmers to pharaohs"], answer: 2, hint: "Everyone loved it.", explain: "People of all kinds played senet, from farmers to the pharaoh himself." },
      { q: "Which game did people in ancient Egypt play outside?", choices: ["Ice hockey", "Video games", "Tug-of-war"], answer: 2, hint: "You pull on a rope.", explain: "Old wall pictures show people playing tug-of-war, leapfrog and catch." }
    ]
  },

  // ───────────── Oasis 2: Camel Market (about age 7–8) ─────────────
  {
    id: 'h2-desert-hieroglyphs',
    subject: 'history',
    floor: 2,
    realm: 'desert',
    title: "Hieroglyphs and Papyrus",
    topic: 'hieroglyphs',
    topicName: 'Hieroglyphs and papyrus',
    blurb: "Learn picture-writing with a scribe, and make paper from a river plant.",
    reading: [
      { title: "Picture writing", emoji: '✍️', text: "Hieroglyphs are the ancient Egyptians' writing. There are hundreds of signs: birds, eyes, feet, water, snakes and more. Some stand for sounds, and some for whole words." },
      { title: "Which way to read?", emoji: '👀', text: "Hieroglyphs could be written from left to right, from right to left, or from top to bottom! You read towards the faces of the people and animals." },
      { title: "Paper from a plant", emoji: '🌿', text: "Papyrus is a tall reed that grew by the Nile. People cut its stem into thin strips, laid them in two layers, pressed them flat and let them dry. That made a sheet to write on." },
      { title: "Scribes", emoji: '📜', text: "Scribes were people who learned to read and write. They went to school for years, and they wrote lists, letters and stories with reed brushes and ink." }
    ],
    dialogue: {
      npc: { name: "Kha", role: "a scribe in ancient Egypt", look: 'scribe', portrayal: 'generic' },
      intro: "Welcome! I'm Kha, a scribe. Sit down cross-legged like me, and I'll show you how to write in hieroglyphs.",
      topics: [
        { ask: "What are hieroglyphs?", answer: "They are our writing signs, and there are hundreds of them! This owl stands for an 'm' sound, and this wavy line of water stands for an 'n' sound." },
        { ask: "How do you make ink?", answer: "Black ink is made from soot, the black dust from a fire. Red ink is made from red ochre, a coloured earth. I mix them with water and a little gum, and dip a thin reed brush in." },
        { ask: "How is papyrus made?", answer: "We cut the stems of the papyrus reed into thin strips. We lay one layer across and one layer down, press them flat and let them dry in the sun. The plant's own juice helps stick them together!" },
        { ask: "How long did you go to school?", answer: "Many years! I started when I was small. I copied the same signs again and again until my hand knew them by heart." },
        { ask: "What do scribes write?", answer: "Everything! How much grain is in the stores, letters, stories and lists of workers. Without scribes, nobody could keep track of anything." }
      ],
      challenge: {
        q: "What did the Egyptians make papyrus from?",
        choices: ["Sheep's wool", "A reed that grew by the Nile", "Tree bark"],
        answer: 1,
        explain: "Papyrus was made from strips of a tall reed that grew by the Nile, pressed together and dried."
      },
      farewell: "Well done, young scribe! Keep practising, and your signs will be as neat as mine."
    },
    timeline: {
      title: "Writing in ancient Egypt",
      events: [
        { label: "The first hieroglyphs are written", year: -3200, when: "about 3200 BCE" },
        { label: "The oldest papyrus roll we know of is made (it was left blank!)", year: -3000, when: "about 3000 BCE" },
        { label: "The last known hieroglyphs are carved, at a temple on the island of Philae", year: 394, when: "394 CE" },
        { label: "The Rosetta Stone is found", year: 1799, when: "1799" },
        { label: "Champollion works out how to read hieroglyphs", year: 1822, when: "1822" }
      ]
    },
    artifact: {
      model: 'papyrus',
      name: "A papyrus scroll",
      text: "Sheets of papyrus were glued end to end to make long rolls, some of them many metres long. Papyrus lasts a very long time in the dry desert air, so we can still read some scrolls after thousands of years."
    },
    quiz: [
      { q: "What are hieroglyphs?", choices: ["Ancient Egyptian writing signs", "Egyptian coins", "Pyramid stones"], answer: 0, hint: "Kha writes with them.", explain: "Hieroglyphs are the signs the ancient Egyptians used for writing." },
      { q: "What was papyrus made from?", choices: ["Mud and straw", "Strips of a reed plant", "Gold"], answer: 1, hint: "It grew by the Nile.", explain: "Papyrus was made from thin strips of the papyrus reed, pressed together and dried." },
      { q: "Which way do you read hieroglyphs?", choices: ["Always from the bottom up", "Towards the faces of the people and animals", "Only from the middle"], answer: 1, hint: "Look at which way the birds face.", explain: "You read towards the faces of the people and animals in the signs." },
      { q: "What did scribes write with?", choices: ["Pencils and erasers", "Crayons", "Reed brushes and ink"], answer: 2, hint: "The ink was made from soot.", explain: "Scribes wrote with thin reed brushes dipped in black or red ink." },
      { q: "Why can we still read some papyrus scrolls from long ago?", choices: ["The dry desert air kept them safe", "They were made of plastic", "They were kept in freezers"], answer: 0, hint: "Think about the weather in Egypt.", explain: "The dry desert air kept papyrus from rotting, so some scrolls lasted thousands of years." }
    ]
  },
  {
    id: 'h2-desert-camel-caravans',
    subject: 'history',
    floor: 2,
    realm: 'desert',
    title: "Camel Caravans of the Sahara",
    topic: 'camel-caravans',
    topicName: 'Camel caravans',
    blurb: "Cross the Sahara with a caravan guide, by the Sun and by the stars.",
    reading: [
      { title: "The Sahara", emoji: '🏜️', text: "The Sahara is the biggest hot desert in the world. It stretches right across the top of Africa, and it is almost as big as the whole United States." },
      { title: "Ships of the desert", emoji: '🐪', text: "Camels can walk for days without drinking, and their wide, soft feet don't sink in the sand. People call them the ships of the desert." },
      { title: "Long lines of camels", emoji: '🧂', text: "A caravan is a group of traders travelling together. For hundreds of years, caravans carried salt, gold, cloth and books across the Sahara." },
      { title: "Finding the way", emoji: '⭐', text: "Caravan guides knew the desert very well. They found their way by the shapes of dunes and rocks, by the Sun, and by the stars at night." }
    ],
    dialogue: {
      npc: { name: "Amastan", role: "a caravan guide in the Sahara", look: 'caravan', portrayal: 'generic' },
      intro: "Welcome to our camp, traveller! I'm Amastan. Tomorrow our caravan sets off across the sand. Come and meet my camels!",
      topics: [
        { ask: "Why camels, not horses?", answer: "Camels can go many days without water, and they can eat thorny desert plants. Their wide, soft feet walk on sand without sinking. A horse would soon be tired and thirsty out here!" },
        { ask: "What is in a camel's hump?", answer: "Fat, not water! A camel's body can use that fat when there is little food. If a camel goes hungry for a long time, its hump gets smaller and floppy." },
        { ask: "What do caravans carry?", answer: "For hundreds of years, caravans carried salt from the desert to the south, and came back with gold, cloth and even books. Salt was very precious." },
        { ask: "How do you find the way?", answer: "By day, I read the dunes and the rocks, and I watch the Sun. At night, the stars show the way. My grandmother taught me their names when I was small." },
        { ask: "Where do you sleep?", answer: "In tents, or under the stars! Desert nights are cold, so we wrap up in thick blankets and sit by the fire with a cup of sweet mint tea." }
      ],
      challenge: {
        q: "Why are camels called the ships of the desert?",
        choices: ["They can swim", "They have sails", "They carry people and goods across the sand, like ships cross the sea"],
        answer: 2,
        explain: "Camels carry people and heavy loads across the sea of sand, just as ships carry them across the sea."
      },
      farewell: "Safe travels, friend! May you always find water and good company."
    },
    timeline: {
      title: "Camels and caravans",
      events: [
        { label: "People in Arabia begin to keep camels", year: -1000, when: "about 3,000 years ago" },
        { label: "Camels become common in the Sahara", year: 300, when: "about 300 CE" },
        { label: "Big caravans cross the Sahara with salt and gold", year: 1000, when: "about 1000" },
        { label: "Mansa Musa of Mali crosses the Sahara on his way to Mecca", year: 1324, when: "1324" }
      ]
    },
    artifact: {
      model: 'salt-slab',
      name: "A slab of salt",
      text: "Salt was dug out of the desert in big slabs and tied onto camels, several slabs on each one. Salt was precious because people need it to stay healthy, and it keeps food from going bad."
    },
    quiz: [
      { q: "What is the Sahara?", choices: ["A big forest", "The biggest hot desert in the world", "A cold mountain"], answer: 1, hint: "It stretches across the top of Africa.", explain: "The Sahara is the biggest hot desert in the world." },
      { q: "What does a camel's hump store?", choices: ["Fat", "Water", "Sand"], answer: 0, hint: "It is not water!", explain: "A camel's hump stores fat, which its body can use when food is scarce." },
      { q: "What is a caravan?", choices: ["A kind of tent", "A desert plant", "A group of traders travelling together"], answer: 2, hint: "Long lines of camels.", explain: "A caravan is a group of traders travelling together, often with many camels." },
      { q: "How did caravan guides find their way at night?", choices: ["By the stars", "With street lights", "By following trains"], answer: 0, hint: "Look up!", explain: "At night, guides found their way by the stars." },
      { q: "Why was salt so precious?", choices: ["It was shiny", "People need it to stay healthy, and it keeps food from going bad", "It was sweet"], answer: 1, hint: "Think about health and food.", explain: "Our bodies need salt, and salt keeps food from spoiling, so it was very valuable." }
    ]
  },

  // ───────────── Oasis 3: Felucca Harbor (about age 8–9) ─────────────
  {
    id: 'h3-desert-imhotep',
    subject: 'history',
    floor: 3,
    realm: 'desert',
    title: "Imhotep and the Step Pyramid",
    topic: 'step-pyramid',
    topicName: 'Imhotep and the Step Pyramid',
    blurb: "Meet the builder of the first great stone pyramid.",
    reading: [
      { title: "Tombs before pyramids", emoji: '🧱', text: "Before the pyramids, Egypt's kings were buried under low, flat-topped buildings of mud brick. Today we call them mastabas, an Arabic word for a bench." },
      { title: "A new idea", emoji: '💡', text: "About 4,700 years ago, a clever royal official named Imhotep built a tomb for King Djoser. He stacked six layers, each smaller than the one below. That made the Step Pyramid!" },
      { title: "Built of stone", emoji: '🪨', text: "The Step Pyramid is the oldest huge building made all of cut stone. It is about 60 metres tall, and it still stands at Saqqara today." },
      { title: "Remembered for ever", emoji: '📜', text: "Imhotep was remembered as a great builder and a wise man. Much later, Egyptians even said he was a great healer." }
    ],
    dialogue: {
      npc: { name: "Imhotep", role: "the royal builder of King Djoser's Step Pyramid", look: 'scribe', portrayal: 'portrayal' },
      intro: "Greetings! I am Imhotep, and I serve King Djoser. Come and see my plan: a stairway of stone up to the sky!",
      topics: [
        { ask: "What did tombs look like before?", answer: "Kings were buried under low buildings with flat tops and sloping sides, made of mud brick. I wondered: what if we put one on top of another, each a little smaller?" },
        { ask: "Why use stone?", answer: "Mud brick crumbles away, but stone lasts. I want the king's tomb to last for ever, so every block is cut from limestone." },
        { ask: "How many steps does it have?", answer: "Six great steps, one on top of another, each smaller than the one below. It rises about 60 metres, taller than anything anyone here has ever seen." },
        { ask: "How do you measure everything?", answer: "With a cubit rod! A royal cubit is about as long as a grown-up's arm from the elbow to the fingertips. All my workers use the same cubit, so every stone fits." },
        { ask: "What else is around the pyramid?", answer: "A great courtyard, temples, and a long wall all the way round. The wall has fourteen doors, but only one of them is real! The others are carved in the stone." }
      ],
      challenge: {
        q: "How did Imhotep make the Step Pyramid?",
        choices: ["He stacked six layers, each smaller than the one below", "He piled up wooden boxes", "He dug a giant hole"],
        answer: 0,
        explain: "Imhotep stacked six stone layers, each smaller than the one below, making a stairway of steps."
      },
      farewell: "May your own plans be as bold as mine! Remember: measure carefully, then build."
    },
    timeline: {
      title: "From mastabas to pyramids",
      events: [
        { label: "Kings are buried under flat-topped mastabas", year: -2900, when: "about 2900 BCE" },
        { label: "Imhotep builds the Step Pyramid for King Djoser", year: -2670, when: "about 2670 BCE" },
        { label: "King Sneferu's builders try a smooth-sided pyramid: the Bent Pyramid", year: -2600, when: "about 2600 BCE" },
        { label: "The Great Pyramid of Giza is built", year: -2560, when: "about 2560 BCE" },
        { label: "The Step Pyramid opens to visitors again after a long repair", year: 2020, when: "2020" }
      ]
    },
    artifact: {
      model: 'cubit-rod',
      name: "A cubit rod",
      text: "Egyptian builders measured with cubit rods. A royal cubit was about 52 cm long, split into 7 palms, and each palm into 4 fingers. Using the same measure everywhere helped every stone fit."
    },
    quiz: [
      { q: "What was a mastaba?", choices: ["A boat", "A low, flat-topped tomb", "A tall tower"], answer: 1, hint: "The word means a bench.", explain: "A mastaba was a low tomb with a flat top and sloping sides." },
      { q: "Who planned the Step Pyramid?", choices: ["Imhotep", "Tutankhamun", "Cleopatra"], answer: 0, hint: "He worked for King Djoser.", explain: "Imhotep planned the Step Pyramid for King Djoser." },
      { q: "How many big steps does the Step Pyramid have?", choices: ["Three", "Ten", "Six"], answer: 2, hint: "Count Imhotep's layers.", explain: "The Step Pyramid has six big steps." },
      { q: "Why did Imhotep build with stone instead of mud brick?", choices: ["Stone is lighter", "Stone lasts much longer", "There was no mud"], answer: 1, hint: "He wanted it to last for ever.", explain: "Mud brick crumbles, but stone lasts for thousands of years." },
      { q: "How many palms were in a royal cubit?", choices: ["10", "2", "7"], answer: 2, hint: "Look at the cubit rod.", explain: "A royal cubit was split into 7 palms, and each palm into 4 fingers." }
    ]
  },
  {
    id: 'h3-desert-builders-town',
    subject: 'history',
    floor: 3,
    realm: 'desert',
    title: "The Pyramid Builders' Town",
    topic: 'pyramid-builders',
    topicName: 'The pyramid builders',
    blurb: "Bake bread and meet the teams who built the Great Pyramid.",
    reading: [
      { title: "Who built the pyramids?", emoji: '👷', text: "The Great Pyramid was built about 4,500 years ago by thousands of Egyptian workers. They were paid, fed and looked after." },
      { title: "A town for the workers", emoji: '🏘️', text: "Near the pyramids was a whole town for the builders, with houses, big bakeries and kitchens. Archaeologists have dug up its ovens and the pots used to bake bread." },
      { title: "Teams with names", emoji: '🚩', text: "Workers were put into teams, and some teams painted their names on the stones they moved. One team called itself the Friends of Khufu!" },
      { title: "Taking care", emoji: '🩹', text: "Doctors looked after workers who got hurt. Some skeletons show broken bones that were set and healed well." }
    ],
    dialogue: {
      npc: { name: "Ipi", role: "a baker in the pyramid builders' town, about 2560 BCE", look: 'nile', portrayal: 'generic' },
      intro: "Mmm, smell that? Fresh bread! I'm Ipi, and I bake for the builders of King Khufu's pyramid. There are lots of hungry workers to feed!",
      topics: [
        { ask: "Who are the builders?", answer: "Stone cutters, haulers, carpenters and many more. Some work here all year. Many farmers come to help for a few months too, especially when the flood covers their fields." },
        { ask: "What do the workers eat?", answer: "Lots of bread, of course! And onions, beans, fish, and sometimes beef. We bake the bread in big clay pots, hundreds at a time." },
        { ask: "Are the workers paid?", answer: "Yes! We don't use coins, so they're paid with food like bread and other good things. A hard day's work earns a good meal." },
        { ask: "How do they move the big stones?", answer: "Teams pull the stones on wooden sledges. Someone pours water on the sand in front of the sledge, and that makes it slide much more easily. Try it in the Sun Observatory!" },
        { ask: "What if a worker gets hurt?", answer: "Our doctors help! They bandage cuts and set broken bones with splints, and the workers rest until they are better." }
      ],
      challenge: {
        q: "Were the pyramid builders paid?",
        choices: ["Yes, with food like bread", "No, never", "Yes, with gold coins"],
        answer: 0,
        explain: "The builders were paid with food like bread. Egypt did not use coins yet."
      },
      farewell: "Take a loaf for the road! And tell everyone who really built the pyramids: people like us."
    },
    timeline: {
      title: "Building the Great Pyramid",
      events: [
        { label: "King Khufu's workers begin his pyramid at Giza", year: -2580, when: "about 2580 BCE" },
        { label: "The Great Pyramid is finished, about 146 metres tall", year: -2560, when: "about 2560 BCE" },
        { label: "A cathedral spire in England is finally taller than the Great Pyramid", year: 1311, when: "about 1311" },
        { label: "A horse stumbles on an old wall, and the builders' graves are found", year: 1990, when: "1990" },
        { label: "Archaeologists dig up the builders' bakeries", year: 1991, when: "1991" }
      ]
    },
    artifact: {
      model: 'pyramid',
      name: "A model of the Great Pyramid",
      text: "The Great Pyramid was once covered in smooth, shining white limestone. Most of that outer layer was taken away long ago, so now you can see the rough stone steps underneath."
    },
    quiz: [
      { q: "Who built the Great Pyramid?", choices: ["Giants", "Thousands of Egyptian workers who were paid and fed", "Robots"], answer: 1, hint: "They lived in a town nearby.", explain: "Thousands of Egyptian workers built it, and they were paid, fed and cared for." },
      { q: "What did archaeologists find in the builders' town?", choices: ["Bakeries with ovens and bread pots", "A railway station", "A swimming pool"], answer: 0, hint: "Ipi works there.", explain: "They found bakeries with ovens and the pots used to bake bread." },
      { q: "How did workers make a sledge slide more easily over sand?", choices: ["They added wheels", "They used ice", "They poured water on the sand in front of it"], answer: 2, hint: "Wet sand is firmer.", explain: "Pouring water on the sand made it firmer, so the sledge slid more easily." },
      { q: "What did some teams paint on the stones?", choices: ["Their team names", "Maps of the world", "Shopping lists"], answer: 0, hint: "Friends of Khufu!", explain: "Some teams painted their names on the stones, like the Friends of Khufu." },
      { q: "How were the workers paid?", choices: ["With gold coins", "With food like bread", "With paper money"], answer: 1, hint: "Egypt had no coins yet.", explain: "Workers were paid with food like bread, because Egypt did not use coins yet." }
    ]
  },

  // ───────────── Oasis 4: Obelisk Square (about age 9–10) ─────────────
  {
    id: 'h4-desert-hatshepsut',
    subject: 'history',
    floor: 4,
    realm: 'desert',
    title: "Hatshepsut, the Builder Pharaoh",
    topic: 'hatshepsut',
    topicName: 'Hatshepsut',
    blurb: "Meet one of Egypt's few women pharaohs, and sail with her ships to Punt.",
    reading: [
      { title: "A woman pharaoh", emoji: '👑', text: "Hatshepsut ruled Egypt about 3,500 years ago, for about 20 years. She was one of only a few women ever to become pharaoh." },
      { title: "A time of trade", emoji: '🕊️', text: "Her reign was mostly peaceful. She sent out trading trips, and she had many temples and monuments built all over Egypt." },
      { title: "The trip to Punt", emoji: '⛵', text: "She sent ships to a faraway land called Punt, somewhere to the south along the Red Sea. They came back with incense trees, ebony wood, gold and even baboons! Experts still discuss exactly where Punt was." },
      { title: "Obelisks and a temple", emoji: '🏛️', text: "Hatshepsut raised tall stone obelisks at Karnak, with shining metal tips. Her beautiful temple at Deir el-Bahari has rows of columns at the foot of the cliffs." }
    ],
    dialogue: {
      npc: { name: "Hatshepsut", role: "pharaoh of Egypt", look: 'egypt', portrayal: 'portrayal' },
      intro: "Welcome to my temple! I am Hatshepsut, pharaoh of Egypt. Look at these walls: they tell the story of my ships.",
      topics: [
        { ask: "Can a woman be pharaoh?", answer: "It is very rare! I am the daughter of a pharaoh. First I ruled for the young king, Thutmose, and then I became pharaoh myself. In my statues I wear the pharaoh's crown and headdress, just like a king." },
        { ask: "Where is Punt?", answer: "Far away to the south, along the coast of the Red Sea. My ships sailed for weeks to get there, and they came home full of treasure!" },
        { ask: "What did your ships bring back?", answer: "Incense trees in baskets, so we could plant them at my temple! Ebony wood, gold, ivory, and even baboons. Can you imagine baboons on a ship?" },
        { ask: "What is an obelisk?", answer: "A tall, thin stone pillar with a little pyramid on top, like a sunbeam made of stone. I had two raised at Karnak, each cut from a single piece of pink granite." },
        { ask: "Why do you build so much?", answer: "Buildings last. Long after I am gone, people will see my temple and remember a time of peace and trade in Egypt." }
      ],
      challenge: {
        q: "Where did Hatshepsut send her trading ships?",
        choices: ["To the Moon", "To the land of Punt", "To Antarctica"],
        answer: 1,
        explain: "Her ships sailed south along the Red Sea to the land of Punt and came back with incense trees, ebony and gold."
      },
      farewell: "Thank you for visiting, young traveller. Build something that makes people smile."
    },
    timeline: {
      title: "Hatshepsut's Egypt",
      events: [
        { label: "Hatshepsut begins to rule for the young king Thutmose III", year: -1479, when: "about 1479 BCE" },
        { label: "Her ships sail to the land of Punt", year: -1470, when: "about 1470 BCE" },
        { label: "Her two obelisks are raised at Karnak", year: -1460, when: "about 1460 BCE" },
        { label: "Her reign ends, after about 20 years", year: -1458, when: "about 1458 BCE" },
        { label: "A Polish and Egyptian team begins repairing her temple", year: 1961, when: "1961" }
      ]
    },
    artifact: {
      model: 'obelisk',
      name: "An obelisk",
      text: "An obelisk is a tall, four-sided stone pillar with a little pyramid on top, each cut from a single block of stone. One of Hatshepsut's obelisks still stands at Karnak, almost 30 metres tall."
    },
    quiz: [
      { q: "Who was Hatshepsut?", choices: ["One of the few women who ruled Egypt as pharaoh", "A famous camel", "A ship's captain from Punt"], answer: 0, hint: "She wore the pharaoh's crown.", explain: "Hatshepsut was one of the few women ever to rule Egypt as pharaoh." },
      { q: "What did her ships bring back from Punt?", choices: ["Snow and ice", "Incense trees, ebony and gold", "Horses and carts"], answer: 1, hint: "Some of it was planted at her temple.", explain: "The ships brought incense trees, ebony wood, gold, ivory and even baboons." },
      { q: "What is an obelisk?", choices: ["A board game", "A boat", "A tall, thin stone pillar with a pointed top"], answer: 2, hint: "Like a sunbeam made of stone.", explain: "An obelisk is a tall, four-sided stone pillar with a little pyramid on top." },
      { q: "About how long did Hatshepsut rule?", choices: ["About 20 years", "About 2 years", "About 200 years"], answer: 0, hint: "Two tens of years.", explain: "Hatshepsut ruled for about 20 years." },
      { q: "Where is Hatshepsut's famous temple?", choices: ["Under the sea", "At Deir el-Bahari, at the foot of the cliffs", "On a mountain in China"], answer: 1, hint: "It has rows of columns by the cliffs.", explain: "Her temple stands at Deir el-Bahari, near Luxor, at the foot of tall cliffs." }
    ]
  },
  {
    id: 'h4-desert-petra',
    subject: 'history',
    floor: 4,
    realm: 'desert',
    title: "Petra, the City Carved in Rock",
    topic: 'petra',
    topicName: 'Petra and the Nabataeans',
    blurb: "Visit a pink city carved into cliffs, where clever engineers saved every drop of rain.",
    reading: [
      { title: "A city in the rock", emoji: '🏜️', text: "Petra is in the desert of Jordan. Its grand buildings are carved right into pink and red sandstone cliffs." },
      { title: "The Nabataeans", emoji: '🐪', text: "Petra was built by the Nabataeans, traders who led camel caravans carrying incense and spices. Petra was a busy stop on their routes." },
      { title: "Every drop counts", emoji: '💧', text: "It hardly ever rains in Petra. The Nabataeans built channels, pipes and underground tanks to collect rain and spring water, so the city had water all year round." },
      { title: "Shown to the world", emoji: '🗺️', text: "For hundreds of years, mostly local people knew Petra. In 1812 a Swiss traveller, Johann Ludwig Burckhardt, visited and told the rest of the world about it." }
    ],
    dialogue: {
      npc: { name: "Malik", role: "a Nabataean water engineer in Petra", look: 'caravan', portrayal: 'generic' },
      intro: "Welcome to Petra! I'm Malik. Mind your step: this channel carries our precious water. Every drop matters here.",
      topics: [
        { ask: "How do you carve buildings into cliffs?", answer: "We start at the top and carve downwards, so we never need to build scaffolding up the cliff. Our stone carvers chip away the rock with iron tools, bit by bit." },
        { ask: "Where does your water come from?", answer: "From springs and from rain. When it rains, water rushes down the rocks. We catch it in channels and store it in big underground tanks called cisterns." },
        { ask: "Why build dams?", answer: "Sudden storms can send floods rushing through our narrow canyon. Our dam and tunnel turn the floodwater away from the city, and we save some of it for later." },
        { ask: "What do the caravans carry?", answer: "Frankincense and myrrh, sweet-smelling tree resins from Arabia, and spices and cloth. Traders stop here to rest, and they buy our water!" },
        { ask: "What is the Treasury?", answer: "It's a grand building carved into the rock at the end of the Siq, our long, narrow canyon. People call it the Treasury, but it was most likely a tomb or a temple, not a treasure store." }
      ],
      challenge: {
        q: "How did the Nabataeans have water in the dry desert?",
        choices: ["They melted snow from the mountains", "They had a lake in the middle of the city", "They collected rain and spring water in channels and tanks"],
        answer: 2,
        explain: "They caught rain and spring water in channels, pipes and underground tanks called cisterns."
      },
      farewell: "Go well, friend! And remember: in the desert, water is treasure."
    },
    timeline: {
      title: "Petra through time",
      events: [
        { label: "Nabataean traders start to settle at Petra", year: -300, when: "about 300 BCE" },
        { label: "The Treasury is carved into the cliff", year: 10, when: "about 2,000 years ago" },
        { label: "Petra becomes part of the Roman Empire", year: 106, when: "106 CE" },
        { label: "Burckhardt visits and tells the world about Petra", year: 1812, when: "1812" },
        { label: "Petra becomes a World Heritage Site", year: 1985, when: "1985" }
      ]
    },
    artifact: {
      model: 'amphora',
      name: "A trading jar",
      text: "Traders carried oil and other goods in tall clay jars like this one. Jars and pots from faraway lands have been found at Petra, showing how far its traders travelled."
    },
    quiz: [
      { q: "What is special about Petra's buildings?", choices: ["They float on water", "They are carved into rock cliffs", "They are made of ice"], answer: 1, hint: "Pink and red sandstone.", explain: "Petra's buildings are carved right into the sandstone cliffs." },
      { q: "Who built Petra?", choices: ["The Nabataeans", "The Vikings", "The Aztecs"], answer: 0, hint: "They were caravan traders.", explain: "Petra was built by the Nabataeans, desert traders." },
      { q: "What is a cistern?", choices: ["A camel saddle", "A kind of incense", "An underground tank for storing water"], answer: 2, hint: "Malik keeps rainwater in it.", explain: "A cistern is a tank, often underground, for storing water." },
      { q: "Why did the Nabataeans build a dam and a tunnel?", choices: ["To turn sudden floods away from the city", "To make a swimming pool", "To keep out camels"], answer: 0, hint: "Storms can bring sudden floods.", explain: "The dam and tunnel turned floodwater away from the city, and some was saved for later." },
      { q: "In which year did Burckhardt tell the world about Petra?", choices: ["1492", "1969", "1812"], answer: 2, hint: "Just over 200 years ago.", explain: "Johann Ludwig Burckhardt visited Petra in 1812." }
    ]
  },

  // ───────────── Oasis 5: Balloon Field (about age 10–11) ─────────────
  {
    id: 'h5-desert-rosetta-stone',
    subject: 'history',
    floor: 5,
    realm: 'desert',
    title: "The Rosetta Stone and Champollion",
    topic: 'rosetta-stone',
    topicName: 'The Rosetta Stone',
    blurb: "Crack the code of the hieroglyphs with one stone and three kinds of writing.",
    reading: [
      { title: "A forgotten writing", emoji: '❓', text: "For about 1,400 years, nobody could read hieroglyphs. People could see the signs on temples, but their meaning had been lost." },
      { title: "A stone with three scripts", emoji: '🪨', text: "In 1799, French soldiers found a broken stone slab near the town of Rashid, which Europeans called Rosetta. It had the same message written three ways: in hieroglyphs, in Demotic (an everyday Egyptian script) and in ancient Greek." },
      { title: "The key", emoji: '🔑', text: "Scholars could already read ancient Greek. So they could compare the Greek with the hieroglyphs, a bit like using a dictionary." },
      { title: "Champollion", emoji: '💡', text: "A young French scholar, Jean-François Champollion, knew many languages, including Coptic, the last form of the Egyptian language. In 1822 he showed how hieroglyphs work: some signs stand for sounds, and some for ideas." }
    ],
    dialogue: {
      npc: { name: "Jean-François Champollion", role: "a French scholar who learned to read hieroglyphs", look: 'inventor', portrayal: 'portrayal' },
      intro: "Bonjour! I am Jean-François Champollion. Since I was a boy, I have dreamed of reading the writing of ancient Egypt. Shall I show you how I cracked the code?",
      topics: [
        { ask: "What does the Rosetta Stone say?", answer: "It is a message from Egypt's priests, from the year 196 BCE, praising the young King Ptolemy the Fifth. Not very exciting, I admit! But it is written three ways, and that makes it a treasure." },
        { ask: "Why three kinds of writing?", answer: "Egypt was ruled by Greek-speaking kings then. So the priests wrote the message in hieroglyphs for the temples, in Demotic for everyday Egyptians, and in Greek for the rulers." },
        { ask: "How did you crack the code?", answer: "I studied royal names inside oval rings called cartouches, like Ptolemy and Cleopatra. The names helped me match signs to sounds. Then I saw that sound signs and idea signs are mixed together!" },
        { ask: "Did anyone help?", answer: "An English scientist, Thomas Young, took important first steps with the name Ptolemy. And Coptic, a language that grew out of ancient Egyptian, helped me hear the old words." },
        { ask: "What happened when you solved it?", answer: "People say I ran to my brother's office shouting, 'I've got it!', and then fainted from all the excitement. It makes a good story, doesn't it?" }
      ],
      challenge: {
        q: "Why was the Rosetta Stone the key to reading hieroglyphs?",
        choices: ["It had a picture dictionary on the back", "It had the same message in Greek, which scholars could already read", "It was made of gold"],
        answer: 1,
        explain: "The same message was written in Greek, which scholars could read, so they could compare it with the hieroglyphs."
      },
      farewell: "Au revoir! Remember: every puzzle can be solved if you are curious and patient."
    },
    timeline: {
      title: "Cracking the code",
      events: [
        { label: "Egypt's priests have the decree carved on the stone", year: -196, when: "196 BCE" },
        { label: "The last known hieroglyphs are carved", year: 394, when: "394 CE" },
        { label: "French soldiers find the Rosetta Stone", year: 1799, when: "1799" },
        { label: "The stone goes on show at the British Museum", year: 1802, when: "1802" },
        { label: "Champollion explains how hieroglyphs work", year: 1822, when: "1822" }
      ]
    },
    artifact: {
      model: 'rosetta-stone',
      name: "The Rosetta Stone",
      text: "The real Rosetta Stone is a slab of dark stone a bit more than a metre tall, with three bands of writing. Pieces are missing from its edges. It is one of the most visited objects in the British Museum in London."
    },
    quiz: [
      { q: "Which three kinds of writing are on the Rosetta Stone?", choices: ["Hieroglyphs, Demotic and Greek", "English, French and German", "Chinese, Arabic and Latin"], answer: 0, hint: "One of them scholars could already read.", explain: "The stone has the same message in hieroglyphs, Demotic and ancient Greek." },
      { q: "Where was the Rosetta Stone found?", choices: ["In Paris", "Inside a pyramid", "Near the town of Rashid (Rosetta) in Egypt"], answer: 2, hint: "Its name tells you.", explain: "French soldiers found it in 1799 near Rashid, which Europeans called Rosetta." },
      { q: "Who showed how to read hieroglyphs in 1822?", choices: ["Howard Carter", "Jean-François Champollion", "Imhotep"], answer: 1, hint: "A French scholar who knew Coptic.", explain: "Champollion showed in 1822 that hieroglyphs mix sound signs and idea signs." },
      { q: "What are cartouches?", choices: ["Oval rings drawn around royal names", "Camel saddles", "Pyramid stones"], answer: 0, hint: "Ptolemy's name was inside one.", explain: "A cartouche is an oval ring drawn around a royal name." },
      { q: "For about how long could nobody read hieroglyphs?", choices: ["About 14 years", "About 140 years", "About 1,400 years"], answer: 2, hint: "From 394 CE to 1822.", explain: "From the last hieroglyphs in 394 CE to Champollion in 1822 is about 1,400 years." }
    ]
  },
  {
    id: 'h5-desert-ibn-battuta',
    subject: 'history',
    floor: 5,
    realm: 'desert',
    title: "Ibn Battuta's Great Journey",
    topic: 'ibn-battuta',
    topicName: 'Ibn Battuta',
    blurb: "Cross deserts and seas with one of the greatest travellers of all time.",
    reading: [
      { title: "Leaving home", emoji: '🧳', text: "In 1325, a young man named Ibn Battuta left his home in Tangier, Morocco, at 21 years old. He set out on the pilgrimage to Mecca, and he did not come home for 24 years!" },
      { title: "Across the world he knew", emoji: '🗺️', text: "He travelled through North Africa, the Middle East, East Africa, India and as far as China. Altogether he went about 117,000 km, nearly three times round the Earth." },
      { title: "Across the Sahara", emoji: '🐪', text: "Later, in 1352, he crossed the Sahara with a camel caravan to visit the Mali Empire. On the way he stopped at Taghaza, where even the houses were built of salt." },
      { title: "A famous book", emoji: '📖', text: "Back in Morocco, he told his adventures to a writer, Ibn Juzayy, who wrote them down. The book is called the Rihla, which means ‘The Journey’." }
    ],
    dialogue: {
      npc: { name: "Ibn Battuta", role: "a traveller and judge from Morocco", look: 'silk-road', portrayal: 'portrayal' },
      intro: "Welcome, fellow traveller! I am Ibn Battuta. I have seen more of the world than I ever dreamed. Sit down on this cushion, and I will tell you my tales.",
      topics: [
        { ask: "Why did you start travelling?", answer: "I set out on the pilgrimage to Mecca. But on the way I fell in love with travelling! I tried never to take the same road twice." },
        { ask: "How did you travel?", answer: "On foot, by donkey, on horseback, by camel and by ship. I joined caravans for safety and company, because travelling alone in the desert is dangerous." },
        { ask: "What was crossing the Sahara like?", answer: "Hot by day, cold by night, and very, very quiet. At Taghaza, even the houses were built of blocks of salt! Our guide knew where every well was, and we followed him closely." },
        { ask: "Did you work on your travels?", answer: "Yes! I had studied law, so in Delhi and in the Maldives I worked as a judge. Rulers often welcomed travelling scholars." },
        { ask: "How do we know your story?", answer: "When I came home, the Sultan of Morocco asked me to tell everything to a writer named Ibn Juzayy. Together we made a book called the Rihla. People still read it today." }
      ],
      challenge: {
        q: "Why did Ibn Battuta travel with caravans?",
        choices: ["Camels were faster than ships", "For safety and company", "He liked carrying salt"],
        answer: 1,
        explain: "Travelling alone in the desert was dangerous, so he joined caravans for safety and company."
      },
      farewell: "May your roads be long and your friends many! Go and see the world."
    },
    timeline: {
      title: "Ibn Battuta's journeys",
      events: [
        { label: "Ibn Battuta is born in Tangier", year: 1304, when: "1304" },
        { label: "He sets out for Mecca, aged 21", year: 1325, when: "1325" },
        { label: "He reaches China by sea", year: 1345, when: "about 1345" },
        { label: "He comes home to Morocco", year: 1349, when: "1349" },
        { label: "He crosses the Sahara to the Mali Empire", year: 1352, when: "1352" },
        { label: "His travels are written down in the Rihla", year: 1355, when: "1355" }
      ]
    },
    artifact: {
      model: 'astrolabe',
      name: "An astrolabe",
      text: "An astrolabe is a brass instrument for measuring how high the Sun and stars are in the sky. In Ibn Battuta's time, scholars used astrolabes to tell the time, find directions and study the sky."
    },
    quiz: [
      { q: "Where did Ibn Battuta's journey begin?", choices: ["London", "Beijing", "Tangier, in Morocco"], answer: 2, hint: "A city in North Africa.", explain: "He set out from his home town of Tangier, in Morocco, in 1325." },
      { q: "Why did he first set out?", choices: ["To go on the pilgrimage to Mecca", "To find gold", "To sell camels"], answer: 0, hint: "A holy journey.", explain: "He first set out on the pilgrimage to Mecca, and then kept on travelling." },
      { q: "About how far did he travel altogether?", choices: ["About 1,200 km", "About 117,000 km", "About 10 km"], answer: 1, hint: "Nearly three times round the Earth.", explain: "He travelled about 117,000 km, nearly three times round the Earth." },
      { q: "What were the houses at Taghaza built of?", choices: ["Ice", "Glass", "Blocks of salt"], answer: 2, hint: "It was a salt-mining town.", explain: "Taghaza was a salt-mining town in the Sahara, and its houses were built of salt blocks." },
      { q: "What is the Rihla?", choices: ["The book of his travels", "A kind of camel", "A ship"], answer: 0, hint: "Its name means ‘The Journey’.", explain: "The Rihla is the book of Ibn Battuta's travels, written down by Ibn Juzayy." }
    ]
  },

  // ───────────── Oasis 6: Scroll Library (about age 11–12) ─────────────
  {
    id: 'h6-desert-library-alexandria',
    subject: 'history',
    floor: 6,
    realm: 'desert',
    title: "The Great Library of Alexandria",
    topic: 'library-alexandria',
    topicName: 'The Library of Alexandria',
    blurb: "Copy scrolls in the most famous library of the ancient world.",
    reading: [
      { title: "A city of learning", emoji: '🏛️', text: "Alexandria, on Egypt's coast, was founded by Alexander the Great in 331 BCE. Its later rulers, the Ptolemies, wanted it to be the cleverest city in the world." },
      { title: "The Great Library", emoji: '📚', text: "About 2,300 years ago they built a great library beside a research centre called the Mouseion. Scholars from many lands came to read, write, teach and do experiments." },
      { title: "Books as scrolls", emoji: '📜', text: "There were no printed books. Every book was a hand-copied scroll of papyrus. Nobody knows exactly how many there were, but there may have been tens or even hundreds of thousands." },
      { title: "Great thinkers", emoji: '📐', text: "Euclid wrote a famous geometry book in Alexandria, and Eratosthenes, the head librarian, measured the size of the Earth. Over hundreds of years, the library slowly faded away." }
    ],
    dialogue: {
      npc: { name: "Kleo", role: "a scroll copier at the Library of Alexandria, about 240 BCE", look: 'greece', portrayal: 'generic' },
      intro: "Shh! Welcome to the Great Library. I'm Kleo, and I copy scrolls. Come and see the shelves: there are more books here than anywhere in the world!",
      topics: [
        { ask: "Where do all the scrolls come from?", answer: "From everywhere! People say the king's men check the ships in the harbour for books, copy them, and keep them here. Our kings buy and borrow books from all over the world." },
        { ask: "What is the Mouseion?", answer: "It means ‘the place of the Muses’, the goddesses of learning and the arts. Scholars live and work there, paid by the king, with gardens to walk in and a hall to eat in. Your word museum comes from it!" },
        { ask: "Who works here?", answer: "Mathematicians, doctors, astronomers, poets and mapmakers. Euclid wrote his book on geometry here, before my time. And our head librarian, Eratosthenes, has worked out how big the Earth is!" },
        { ask: "How do you copy a scroll?", answer: "Slowly and carefully, with a reed pen and ink on fresh papyrus. One slip and a word is wrong for ever, so I check every line twice." },
        { ask: "Why does learning matter so much here?", answer: "Because knowledge grows when you share it! Scholars here compare ideas, check each other's work, and write new books for the next scholars to read." }
      ],
      challenge: {
        q: "What were the books in the Great Library?",
        choices: ["Printed paperbacks", "E-books", "Hand-copied papyrus scrolls"],
        answer: 2,
        explain: "Every book was a scroll of papyrus, copied out by hand."
      },
      farewell: "Come back any time. In a library, you can travel the whole world without leaving your seat."
    },
    timeline: {
      title: "The Library of Alexandria",
      events: [
        { label: "Alexander the Great founds Alexandria", year: -331, when: "331 BCE" },
        { label: "Euclid writes his famous geometry book, the Elements", year: -300, when: "about 300 BCE" },
        { label: "The Great Library and the Mouseion are built", year: -285, when: "about 285 BCE" },
        { label: "Eratosthenes, the head librarian, measures the Earth", year: -240, when: "about 240 BCE" },
        { label: "A grand new library, the Bibliotheca Alexandrina, opens in Alexandria", year: 2002, when: "2002" }
      ]
    },
    artifact: {
      model: 'scroll',
      name: "A papyrus scroll",
      text: "A scroll was rolled up and kept in a cubbyhole on a shelf, with a little tag hanging from it to show its title. A long book needed many scrolls."
    },
    quiz: [
      { q: "Who founded the city of Alexandria?", choices: ["Julius Caesar", "Alexander the Great", "Ramesses II"], answer: 1, hint: "The city is named after him.", explain: "Alexander the Great founded Alexandria in 331 BCE." },
      { q: "What were the library's books made of?", choices: ["Papyrus scrolls", "Printed paper", "Clay bricks"], answer: 0, hint: "Kleo copies them by hand.", explain: "The books were hand-copied scrolls of papyrus." },
      { q: "Which word comes from the Mouseion?", choices: ["Mouse", "Moose", "Museum"], answer: 2, hint: "A place full of treasures to learn from.", explain: "Museum comes from the Mouseion, ‘the place of the Muses’." },
      { q: "Which scholar measured the size of the Earth?", choices: ["Eratosthenes", "Euclid", "Champollion"], answer: 0, hint: "He was the head librarian.", explain: "Eratosthenes, the head librarian, measured the Earth using shadows." },
      { q: "What happened to the Great Library?", choices: ["It was moved to London", "It slowly faded away over hundreds of years", "It is still open in the same building"], answer: 1, hint: "It didn't happen all at once.", explain: "Over hundreds of years there was less money and fewer scholars, and the library slowly faded away." }
    ]
  },
  {
    id: 'h6-desert-timbuktu',
    subject: 'history',
    floor: 6,
    realm: 'desert',
    title: "The Manuscripts of Timbuktu",
    topic: 'timbuktu-manuscripts',
    topicName: 'The manuscripts of Timbuktu',
    blurb: "Open the old books of a city of scholars at the edge of the Sahara.",
    reading: [
      { title: "A city at the desert's edge", emoji: '🏙️', text: "Timbuktu is in Mali, near the Niger River at the southern edge of the Sahara. Camel caravans from the desert met boats from the river there." },
      { title: "A city of scholars", emoji: '🎓', text: "About 600 years ago, Timbuktu was full of scholars and students. They studied in mosques like Sankore and in teachers' homes, learning maths, astronomy, medicine, law and poetry." },
      { title: "Precious books", emoji: '📚', text: "People bought books from traders crossing the desert and copied them by hand. Families kept these manuscripts safe for hundreds of years." },
      { title: "Saving the manuscripts", emoji: '📦', text: "In 2012 the city was not safe. Librarians and families packed hundreds of thousands of manuscripts into boxes and carried them quietly to safety in the city of Bamako." }
    ],
    dialogue: {
      npc: { name: "Fatoumata", role: "a keeper of family manuscripts in Timbuktu", look: 'mali', portrayal: 'generic' },
      intro: "Welcome to Timbuktu! I'm Fatoumata. My family has looked after these old books for many generations. Would you like to see them? Gently, please!",
      topics: [
        { ask: "What do the manuscripts say?", answer: "So many things! How to follow the Moon and the stars, how to treat illnesses, how to settle arguments fairly, maths problems, poems, and letters between scholars." },
        { ask: "What are they written with?", answer: "Most are written in Arabic script, with ink made from plants and soot, on paper brought across the Sahara. Some use Arabic letters to write African languages like Songhai and Fula." },
        { ask: "Why were books so precious?", answer: "Long ago, a visitor wrote that in Timbuktu people made more money selling books than anything else! Books carried knowledge, and knowledge was treasure." },
        { ask: "How do you keep them safe?", answer: "Away from damp, insects and sunlight. Today we keep them in special boxes, and we photograph every page so the words can never be lost." },
        { ask: "How did people save them in 2012?", answer: "When the city was not safe, librarians and families hid the manuscripts in metal boxes and carried them, a few at a time, to the city of Bamako. Hundreds of thousands were saved!" }
      ],
      challenge: {
        q: "Why did people in Timbuktu treasure books?",
        choices: ["Books carried knowledge, and knowledge was precious", "Books were made of gold", "Books were used as plates"],
        answer: 0,
        explain: "Books carried knowledge about maths, the stars, medicine, law and more, and that knowledge was treasure."
      },
      farewell: "Thank you for visiting. Read as much as you can: every book is a little treasure chest."
    },
    timeline: {
      title: "Timbuktu's books",
      events: [
        { label: "Timbuktu begins as a camp for desert travellers", year: 1100, when: "about 1100" },
        { label: "Mansa Musa has the great Djinguereber Mosque built", year: 1327, when: "about 1327" },
        { label: "Timbuktu is famous for its scholars and books", year: 1500, when: "about 1500" },
        { label: "A visitor writes that selling books earns more than any other trade", year: 1526, when: "about 1526" },
        { label: "Librarians carry the manuscripts to safety", year: 2012, when: "2012" }
      ]
    },
    artifact: {
      model: 'manuscript',
      name: "A Timbuktu manuscript",
      text: "Many manuscripts were kept as loose pages inside a leather cover, sometimes tied with a strap. Their pages have beautiful handwriting in black and red ink, with notes in the margins from readers long ago."
    },
    quiz: [
      { q: "Where is Timbuktu?", choices: ["In the Amazon rainforest", "In Mali, at the southern edge of the Sahara", "In Antarctica"], answer: 1, hint: "Near the Niger River.", explain: "Timbuktu is in Mali, near the Niger River, at the southern edge of the Sahara." },
      { q: "What did scholars in Timbuktu study?", choices: ["Only cooking", "Nothing at all", "Maths, astronomy, medicine, law and poetry"], answer: 2, hint: "Lots of subjects!", explain: "Scholars studied maths, astronomy, medicine, law, poetry and much more." },
      { q: "How were the manuscripts made?", choices: ["Written by hand", "With a computer printer", "With a camera"], answer: 0, hint: "There were no printers.", explain: "The manuscripts were written and copied by hand." },
      { q: "How did people keep the manuscripts safe in 2012?", choices: ["They buried them in the sand for ever", "They carried them to safety in boxes", "They threw them in the river"], answer: 1, hint: "A few at a time, to Bamako.", explain: "Librarians and families carried hundreds of thousands of manuscripts to safety in Bamako." },
      { q: "Why are the pages being photographed today?", choices: ["To make posters", "To check the colours", "So the knowledge can never be lost"], answer: 2, hint: "Old paper can get damaged.", explain: "Photographs keep a copy of every page, so the knowledge can never be lost." }
    ]
  },

  // ───────────── Oasis 7: Starry Camp (about age 12–13) ─────────────
  {
    id: 'h7-desert-tutankhamun',
    subject: 'history',
    floor: 7,
    realm: 'desert',
    title: "Howard Carter and Tutankhamun's Tomb",
    topic: 'tutankhamun',
    topicName: "Tutankhamun's tomb",
    blurb: "Find the most famous tomb ever discovered, and learn why careful work matters.",
    reading: [
      { title: "A young king", emoji: '👑', text: "Tutankhamun became pharaoh at about 9 years old, around 1332 BCE, and ruled for about 10 years. In his own time he was not one of Egypt's most famous kings." },
      { title: "The Valley of the Kings", emoji: '🏜️', text: "Many pharaohs were buried in tombs cut into the rock of a desert valley near Luxor. Almost all of those tombs were emptied by robbers long ago." },
      { title: "The search", emoji: '🔦', text: "Howard Carter, an English archaeologist, searched the valley for years, paid for by Lord Carnarvon. On 4 November 1922, his team found a step cut into the rock. It led down to a sealed door." },
      { title: "Wonderful things", emoji: '✨', text: "When Carter first peered inside by candlelight, Carnarvon asked if he could see anything. Carter answered: “Yes, wonderful things!” The tomb held over 5,000 objects, including a golden mask." }
    ],
    dialogue: {
      npc: { name: "Howard Carter", role: "an English archaeologist and artist", look: 'archaeologist', portrayal: 'portrayal' },
      intro: "Good day! Howard Carter, archaeologist. I spent years digging in this valley and found almost nothing. Then, one November morning in 1922, everything changed. Let me tell you about it.",
      topics: [
        { ask: "How did you find the tomb?", answer: "My team was clearing away the remains of old workmen's huts near the tomb of Ramesses the Sixth. Underneath was a step cut into the rock, then fifteen more, leading down to a sealed doorway." },
        { ask: "What did you see first?", answer: "I made a small hole and held up a candle. At first I saw nothing while my eyes got used to the light. Then shapes appeared: strange animals, statues, and gold, everywhere the glint of gold." },
        { ask: "Why was the tomb so full?", answer: "Robbers broke in soon after the burial, but they took only small things, and the tomb was sealed again. Later, rubble from other digging covered the entrance, and it was forgotten for over 3,000 years." },
        { ask: "What did you find?", answer: "Over 5,000 things: chariots, beds, board games, clothes, jars of food, a golden throne and a gold mask. Every object had to be drawn, photographed and written up before it was moved." },
        { ask: "How long did the work take?", answer: "Ten years! We worked slowly and carefully, because some objects were very fragile. Careful work matters more than fast work." }
      ],
      challenge: {
        q: "Why was Tutankhamun's tomb still so full of treasure?",
        choices: ["The robbers were scared of camels", "It was underwater", "Its entrance was hidden and forgotten for over 3,000 years"],
        answer: 2,
        explain: "Rubble covered the entrance, so the tomb was forgotten for over 3,000 years and mostly escaped the robbers."
      },
      farewell: "Remember: the real treasure isn't only the gold. It's what these objects teach us about people long ago."
    },
    timeline: {
      title: "Tutankhamun's tomb",
      events: [
        { label: "Tutankhamun becomes pharaoh, aged about 9", year: -1332, when: "about 1332 BCE" },
        { label: "Tutankhamun is buried in the Valley of the Kings", year: -1323, when: "about 1323 BCE" },
        { label: "Howard Carter begins digging in the valley for Lord Carnarvon", year: 1917, when: "1917" },
        { label: "Carter's team finds the first step of the tomb", year: 1922, when: "1922" },
        { label: "The golden mask is uncovered", year: 1925, when: "1925" },
        { label: "The last objects are taken out of the tomb", year: 1932, when: "1932" }
      ]
    },
    artifact: {
      model: 'golden-mask',
      name: "Tutankhamun's golden mask",
      text: "The mask is made of gold, inlaid with blue glass and stones such as lapis lazuli. It weighs about 10 kilograms. It shows the young king wearing the striped headcloth called a nemes."
    },
    quiz: [
      { q: "How old was Tutankhamun when he became pharaoh?", choices: ["About 9", "About 40", "About 70"], answer: 0, hint: "He was a child.", explain: "Tutankhamun became pharaoh at about 9 years old." },
      { q: "Whose team found Tutankhamun's tomb in 1922?", choices: ["Champollion's", "Howard Carter's", "Imhotep's"], answer: 1, hint: "An English archaeologist.", explain: "Howard Carter's team found the tomb on 4 November 1922." },
      { q: "What did Carter say when he first looked inside?", choices: ["“It's empty!”", "“Too dark!”", "“Wonderful things!”"], answer: 2, hint: "He saw the glint of gold.", explain: "Asked if he could see anything, Carter said, “Yes, wonderful things!”" },
      { q: "About how many objects were in the tomb?", choices: ["About 50", "Over 5,000", "About 500"], answer: 1, hint: "Thousands!", explain: "The tomb held over 5,000 objects." },
      { q: "Why did the work take ten years?", choices: ["Every object was recorded and moved carefully", "The workers were on holiday", "The tomb kept moving"], answer: 0, hint: "Some things were fragile.", explain: "Every object was drawn, photographed and written up, then moved with great care." }
    ]
  },
  {
    id: 'h7-desert-abu-simbel',
    subject: 'history',
    floor: 7,
    realm: 'desert',
    title: "Moving the Temples of Abu Simbel",
    topic: 'abu-simbel',
    topicName: 'Abu Simbel',
    blurb: "Help engineers from around the world lift two giant temples above the rising water.",
    reading: [
      { title: "Giant statues", emoji: '🗿', text: "About 3,200 years ago, Pharaoh Ramesses the Second had two temples carved into a sandstone cliff at Abu Simbel, beside the Nile. Four giant seated statues of him, each about 20 metres tall, guard the door." },
      { title: "Sunlight on time", emoji: '☀️', text: "The great temple was lined up with the sunrise. Twice a year, in February and October, the morning sunlight shines all the way to the back and lights up statues in the innermost room." },
      { title: "Rising water", emoji: '🌊', text: "In the 1960s, Egypt built the Aswan High Dam. Its huge new lake, Lake Nasser, would cover the temples. People from all over the world joined a rescue led by UNESCO." },
      { title: "Cut, lift, rebuild", emoji: '🏗️', text: "Engineers cut the temples into more than 1,000 huge blocks, lifted them up the hill and put them back together, about 65 metres higher. The work took from 1964 to 1968." }
    ],
    dialogue: {
      npc: { name: "Samira", role: "an engineer on the Abu Simbel rescue, 1960s", look: 'scientist', portrayal: 'generic' },
      intro: "Hello! I'm Samira, an engineer. We have a huge job: to save two giant temples from the rising water. Want to see how we'll do it?",
      topics: [
        { ask: "Why must the temples move?", answer: "The new dam will make a giant lake. If we leave the temples here, they will end up deep under water. So we're moving them up onto higher ground." },
        { ask: "How do you cut a temple?", answer: "Very carefully! We use saws, not explosions, because big blasts could crack the carvings. The cuts are thin, and afterwards they're filled so you can hardly see them." },
        { ask: "How heavy are the blocks?", answer: "Many weigh about 20 tonnes, as much as three or four elephants! Cranes lift each one, and every block has a number so we know exactly where it goes." },
        { ask: "Will the sunlight still work?", answer: "We measured the angles very carefully. In the new place, the sunlight still reaches the inner statues, just about a day off from before." },
        { ask: "Who is helping?", answer: "Engineers, archaeologists and workers from Egypt and many other countries, and money from all around the world. It shows that people everywhere care about the past." }
      ],
      challenge: {
        q: "Why were the Abu Simbel temples moved?",
        choices: ["A new lake from the Aswan High Dam would have covered them", "They were in the way of a road", "Ramesses wanted a better view"],
        answer: 0,
        explain: "The Aswan High Dam made Lake Nasser, which would have drowned the temples, so they were moved higher up."
      },
      farewell: "Thank you for helping! When you visit Abu Simbel one day, look for the thin lines between the blocks. They're our secret."
    },
    timeline: {
      title: "Abu Simbel",
      events: [
        { label: "Ramesses II's temples are carved at Abu Simbel", year: -1264, when: "about 1264 BCE" },
        { label: "Burckhardt sees the tops of the statues sticking out of the sand", year: 1813, when: "1813" },
        { label: "Explorers dig away the sand and go inside", year: 1817, when: "1817" },
        { label: "UNESCO asks the world to help save Nubia's temples", year: 1960, when: "1960" },
        { label: "The temples are cut up and moved", year: 1964, when: "1964–1968" },
        { label: "Abu Simbel becomes part of a World Heritage Site", year: 1979, when: "1979" }
      ]
    },
    artifact: {
      model: 'temple-statue',
      name: "A model of Abu Simbel's great statues",
      text: "The four seated giants at the front of the great temple all show Ramesses II. An earthquake long ago broke the top off one of them, and its head still lies on the ground at its feet."
    },
    quiz: [
      { q: "Who had the temples at Abu Simbel carved?", choices: ["Tutankhamun", "Alexander the Great", "Ramesses II"], answer: 2, hint: "His statues guard the door.", explain: "Pharaoh Ramesses II had the temples carved about 3,200 years ago." },
      { q: "What happens twice a year inside the great temple?", choices: ["Sunlight reaches the statues in the innermost room", "It snows", "The statues sing"], answer: 0, hint: "The temple faces the sunrise.", explain: "In February and October, the morning sunlight shines all the way to the inner statues." },
      { q: "Why did the temples need to be moved?", choices: ["They were sinking into the sand", "A dam's new lake would have covered them", "People wanted them in a museum"], answer: 1, hint: "Think about Lake Nasser.", explain: "The Aswan High Dam's lake would have covered the temples." },
      { q: "Into about how many blocks were the temples cut?", choices: ["About 10", "About 1 million", "More than 1,000"], answer: 2, hint: "Each one weighed tonnes.", explain: "The temples were cut into more than 1,000 huge blocks." },
      { q: "About how much higher were the temples rebuilt?", choices: ["About 65 metres higher", "About 1 metre higher", "About 6 kilometres higher"], answer: 0, hint: "Up the hill, safe from the lake.", explain: "The temples were rebuilt about 65 metres higher than before." }
    ]
  }
];

/* ------------------------------------------------------------ Sun Observatory (physics) */

const DESERT_PHYSICS = [
  // ───────────── Oasis 1: Sphinx Gate (about age 6–7) ─────────────
  {
    id: 'p1-desert-palm-shade',
    subject: 'physics',
    floor: 1,
    realm: 'desert',
    title: "Shade Under the Palms",
    topic: 'light-shadows',
    topicName: 'Light and shadows',
    blurb: "Make shadows grow and shrink, and find the coolest spot at the oasis.",
    reading: [
      { title: "Hot sunshine", emoji: '☀️', text: "In the desert the Sun shines bright and hot. Camels, foxes and people all look for a shady place to rest." },
      { title: "What is shade?", emoji: '🌴', text: "A palm tree blocks the sunlight, so the ground behind it gets less light. That dark patch is its shadow, and it is cooler there." },
      { title: "Light goes straight", emoji: '➡️', text: "Light travels in straight lines. It cannot bend round the palm tree, so the place behind it stays in shadow." },
      { title: "Shadows move", emoji: '🕐', text: "As the Sun moves across the sky, shadows move and change size. At midday they are short. In the morning and evening they are long." }
    ],
    sim: {
      id: 'shadow',
      predict: {
        q: "You move the torch close to the toy. What happens to its shadow?",
        choices: ["It gets bigger", "It gets smaller", "It disappears"],
        answer: 0,
        explain: "Close to the torch, the toy blocks lots of the light, so its shadow grows big."
      }
    },
    quiz: [
      { q: "What makes a shadow?", choices: ["Wind blowing the sand", "Something blocking the light", "Water on the ground"], answer: 1, hint: "You need light, and something in its way.", explain: "A shadow forms when something blocks the light." },
      { q: "Why is it cooler in the shade of a palm tree?", choices: ["The tree blocks the hot sunlight", "The tree blows cold air", "The sand is wet"], answer: 0, hint: "What is in the way of the Sun?", explain: "The palm tree blocks the hot sunlight, so its shade is cooler." },
      { q: "When are shadows shortest?", choices: ["Early in the morning", "Late in the evening", "Around midday"], answer: 2, hint: "When is the Sun highest in the sky?", explain: "Around midday the Sun is high in the sky, so shadows are short." },
      { q: "Can light bend round a palm tree?", choices: ["Yes, it curls round it", "No, it travels in straight lines"], answer: 1, hint: "That is why shadows happen.", explain: "Light travels in straight lines, so it cannot reach behind the tree. That makes a shadow." },
      { q: "Why does a fennec fox rest in the shade at midday?", choices: ["To find water", "To dig for gold", "To keep cool"], answer: 2, hint: "The midday Sun is very hot.", explain: "Shade blocks the hot sunlight, so resting there keeps the fox cool." }
    ]
  },
  {
    id: 'p1-desert-reed-boats',
    subject: 'physics',
    floor: 1,
    realm: 'desert',
    title: "Floating on the Nile",
    topic: 'floating',
    topicName: 'Floating and sinking',
    blurb: "Drop things into the water tank. Which ones float like a reed boat on the Nile?",
    reading: [
      { title: "Boats of reeds", emoji: '🌿', text: "Long ago, Egyptians tied bundles of papyrus reeds together to make light boats. Reed stems are full of tiny pockets of air, so they float." },
      { title: "Float or sink", emoji: '⛵', text: "Things that stay on top of the water float. Things that go down to the bottom sink." },
      { title: "Not about size", emoji: '🪨', text: "A big log floats, but a tiny stone sinks. What a thing is made of matters more than how big it is." },
      { title: "Wooden boats", emoji: '🛶', text: "Later, Egyptians built bigger boats of wood, with sails. Feluccas, the sailing boats on the Nile today, are made of wood too." }
    ],
    sim: {
      id: 'float',
      setup: { items: ['wooden-block', 'stone', 'cork', 'coin', 'apple', 'key'] },
      predict: {
        q: "Will the apple float or sink in the water tank?",
        choices: ["It floats", "It sinks"],
        answer: 0,
        explain: "An apple floats! It has lots of air inside it, a bit like the pockets of air in a reed."
      }
    },
    quiz: [
      { q: "What did ancient Egyptians make light boats from?", choices: ["Stones", "Bundles of papyrus reeds", "Glass"], answer: 1, hint: "A tall plant that grows by the Nile.", explain: "They tied bundles of papyrus reeds together to make light boats." },
      { q: "Why do reed stems float?", choices: ["They are full of tiny air pockets", "They are very heavy", "They are made of metal"], answer: 0, hint: "What is inside the stems?", explain: "Reed stems are full of tiny pockets of air, which helps them float." },
      { q: "Which one sinks?", choices: ["A cork", "A wooden block", "A coin"], answer: 2, hint: "It is made of metal.", explain: "A coin is solid metal, so it sinks. Cork and wood float." },
      { q: "A big log and a small stone go into the Nile. Which one floats?", choices: ["The big log", "The small stone"], answer: 0, hint: "Size does not decide it.", explain: "The big log floats and the small stone sinks. What a thing is made of matters more than its size." },
      { q: "What is a felucca?", choices: ["A kind of camel", "A wooden sailing boat on the Nile", "A desert flower"], answer: 1, hint: "You can see them at Felucca Harbor.", explain: "A felucca is a wooden sailing boat with a big sail, seen on the Nile today." }
    ]
  },

  // ───────────── Oasis 2: Camel Market (about age 7–8) ─────────────
  {
    id: 'p2-desert-singing-dunes',
    subject: 'physics',
    floor: 2,
    realm: 'desert',
    title: "The Singing Sand Dunes",
    topic: 'sound',
    topicName: 'Sound',
    blurb: "Some sand dunes hum and boom! Find out how sound is made.",
    reading: [
      { title: "Dunes that hum", emoji: '🏜️', text: "In a few deserts in the world, big sand dunes can make a deep humming or booming sound, like a low note on a cello or a plane far away." },
      { title: "Sliding sand", emoji: '🎶', text: "The sound comes when sand slides down the steep side of a dune. Millions of grains rub together and shake, or vibrate, all at once." },
      { title: "Vibrations make sound", emoji: '〰️', text: "All sounds are made by things vibrating. The vibrations travel through the air to your ears." },
      { title: "High and low", emoji: '🎵', text: "Fast vibrations make high notes, and slow vibrations make low notes. A short ruler twangs higher than a long one." }
    ],
    sim: {
      id: 'sound',
      predict: {
        q: "You make less of the ruler stick out over the table, then twang it. Will the note be higher or lower?",
        choices: ["Higher", "Lower", "The same"],
        answer: 0,
        explain: "A shorter piece of ruler vibrates faster, and faster vibrations make a higher note."
      }
    },
    quiz: [
      { q: "What makes all sounds?", choices: ["Colours", "Things vibrating", "Heat"], answer: 1, hint: "Think of a twanging ruler.", explain: "All sounds are made by things vibrating." },
      { q: "When do singing dunes make their sound?", choices: ["When sand slides down the steep side", "When it rains", "When camels sing to them"], answer: 0, hint: "The grains rub together.", explain: "The sound comes when sand slides down the dune's steep side and the grains vibrate together." },
      { q: "A short ruler and a long ruler are twanged. Which makes the higher note?", choices: ["The long ruler", "The short ruler"], answer: 1, hint: "Shorter vibrates faster.", explain: "The short ruler vibrates faster, so its note is higher." },
      { q: "You twang the ruler much harder. What changes?", choices: ["It turns blue", "It gets lower", "It gets louder"], answer: 2, hint: "Bigger vibrations.", explain: "A harder twang makes bigger vibrations, so the sound is louder." },
      { q: "How does the dune's sound reach your ears?", choices: ["Vibrations travel through the air", "Birds carry it", "It only travels through the sand"], answer: 0, hint: "What is between you and the dune?", explain: "The vibrations travel through the air to your ears." }
    ]
  },
  {
    id: 'p2-desert-compass',
    subject: 'physics',
    floor: 2,
    realm: 'desert',
    title: "Finding North in the Desert",
    topic: 'magnets',
    topicName: 'Magnets',
    blurb: "Every dune looks the same! Test what a magnet pulls, and how a compass finds north.",
    reading: [
      { title: "No roads, no signs", emoji: '🧭', text: "In the open desert, the dunes all look alike, and the wind slowly moves them. Travellers need a way to tell which way they are going." },
      { title: "Magnets pull", emoji: '🧲', text: "A magnet pulls on things made of iron and steel, like nails and paper clips. It does not pull on wood, plastic or aluminium." },
      { title: "The Earth is a magnet", emoji: '🌍', text: "The Earth is like a giant, weak magnet. A compass needle is a tiny magnet, so it turns to point north and south." },
      { title: "The Sun and the stars", emoji: '⭐', text: "Long before compasses, desert travellers used the Sun by day and the stars at night. Today many use a compass and GPS too." }
    ],
    sim: {
      id: 'magnet',
      setup: { items: ['paper-clip', 'iron-nail', 'aluminium-can', 'wooden-block', 'steel-bolt', 'rubber-band'] },
      predict: {
        q: "Will the magnet pull the aluminium can?",
        choices: ["Yes", "No"],
        answer: 1,
        explain: "Aluminium is a metal, but it is not magnetic, so the magnet does not pull the can. It does pull iron and steel."
      }
    },
    quiz: [
      { q: "Which of these does a magnet pull?", choices: ["A wooden block", "A rubber band", "An iron nail"], answer: 2, hint: "It is made of iron.", explain: "Magnets pull things made of iron and steel, like an iron nail." },
      { q: "Why does a compass needle point north?", choices: ["It is a tiny magnet, and the Earth is like a giant magnet", "The wind pushes it", "It is painted red"], answer: 0, hint: "Think about the Earth.", explain: "The needle is a tiny magnet, and the Earth's magnetism turns it to point north and south." },
      { q: "Does a magnet pull an aluminium can?", choices: ["Yes", "No"], answer: 1, hint: "Not every metal is magnetic.", explain: "No. Aluminium is not magnetic." },
      { q: "Why is it easy to get lost among the dunes?", choices: ["There are too many signs", "The dunes look alike and the wind moves them", "The sand is purple"], answer: 1, hint: "Every dune looks the same.", explain: "The dunes look alike and slowly move with the wind, so there are few landmarks." },
      { q: "What did desert travellers use to find their way before compasses?", choices: ["Phones", "Street signs", "The Sun and the stars"], answer: 2, hint: "Look up at the sky.", explain: "They used the Sun by day and the stars at night." }
    ]
  },

  // ───────────── Oasis 3: Felucca Harbor (about age 8–9) ─────────────
  {
    id: 'p3-desert-moving-blocks',
    subject: 'physics',
    floor: 3,
    realm: 'desert',
    title: "Moving Giant Blocks",
    topic: 'friction',
    topicName: 'Friction',
    blurb: "How did workers drag huge stones over sand? Test friction on a ramp.",
    reading: [
      { title: "Heavy stones", emoji: '🪨', text: "The Great Pyramid's blocks weighed about as much as two cars each, on average. The workers had no trucks or cranes. So how did they move them?" },
      { title: "Friction", emoji: '✋', text: "When one thing slides or rolls over another, a force called friction pushes back and slows it down. Rough, loose surfaces like dry sand have lots of friction. Smooth ice has very little." },
      { title: "Sledges and wet sand", emoji: '💧', text: "Workers pulled blocks on wooden sledges. An old Egyptian wall painting shows a man pouring water on the sand in front of a sledge. Scientists tested it: with the right amount of water, pulling takes only about half the force!" },
      { title: "Ramps", emoji: '📐', text: "Workers probably also built long ramps of mud brick and rubble, so they could drag the blocks higher as the pyramid grew." }
    ],
    sim: {
      id: 'ramp',
      setup: { surfaces: ['sand', 'wood', 'ice'] },
      predict: {
        q: "The toy car rolls down the ramp onto sand, wood or ice. On which one will it go the farthest?",
        choices: ["Sand", "Wood", "Ice"],
        answer: 2,
        explain: "Ice is the smoothest, with the least friction, so the car rolls farthest on it. Sand has the most friction, so it stops the car soonest."
      }
    },
    quiz: [
      { q: "What is friction?", choices: ["A force that slows things sliding or rolling over each other", "A kind of sand", "A magnet"], answer: 0, hint: "It pushes back.", explain: "Friction is a force that pushes back when things slide or roll over each other." },
      { q: "Which surface has the least friction?", choices: ["Dry sand", "Carpet", "Ice"], answer: 2, hint: "It is very slippery.", explain: "Ice is smooth and slippery, so it has the least friction." },
      { q: "Why did workers pour water on the sand in front of a sledge?", choices: ["To cool the camels", "The right amount of water made it easier to pull", "To wash the stones"], answer: 1, hint: "Wet sand is firmer.", explain: "The right amount of water makes sand firmer, so the sledge slides more easily." },
      { q: "With the right amount of water, how much force did scientists need to pull a sledge over sand?", choices: ["About half as much", "Twice as much", "Exactly the same"], answer: 0, hint: "Pulling got much easier.", explain: "Their tests showed that wet sand can halve the force needed to pull a sledge." },
      { q: "What did workers probably build to drag blocks up the pyramid?", choices: ["Lifts", "Long ramps", "Helicopters"], answer: 1, hint: "A slope of mud brick and rubble.", explain: "Workers probably built long ramps to drag the blocks higher." }
    ]
  },
  {
    id: 'p3-desert-night-lanterns',
    subject: 'physics',
    floor: 3,
    realm: 'desert',
    title: "Lanterns for the Night Market",
    topic: 'circuits',
    topicName: 'Electric circuits',
    blurb: "Light the harbour's lanterns: which things let electricity flow?",
    reading: [
      { title: "Lights at night", emoji: '🏮', text: "When the Sun goes down, the night market at Felucca Harbor needs light. Many lanterns today run on batteries charged by sunlight." },
      { title: "A loop for electricity", emoji: '🔁', text: "Electricity flows only round a complete loop called a circuit: from the battery, through the wires and the bulb, and back to the battery." },
      { title: "Conductors and insulators", emoji: '🔌', text: "Metals like copper and aluminium let electricity through: they are conductors. Wood, plastic and rubber stop it: they are insulators." },
      { title: "Sunlight to electricity", emoji: '☀️', text: "A solar panel turns sunlight into electricity. In the sunny desert, a small solar panel can charge a lantern's battery all day, ready for the night." }
    ],
    sim: {
      id: 'circuit',
      setup: { items: ['copper-wire', 'aluminium-foil', 'paper-clip', 'rubber-band', 'wooden-stick', 'plastic-straw'] },
      predict: {
        q: "You bridge the gap with a wooden stick. Will the bulb light up?",
        choices: ["Yes", "No"],
        answer: 1,
        explain: "Wood is an insulator: electricity can't flow through it, so the circuit isn't complete and the bulb stays off."
      }
    },
    quiz: [
      { q: "What is a circuit?", choices: ["A desert road", "A complete loop that electricity flows round", "A kind of battery"], answer: 1, hint: "It has to go all the way round.", explain: "A circuit is a complete loop: battery, wires, bulb and back to the battery." },
      { q: "Which of these is a conductor?", choices: ["A rubber band", "A plastic straw", "Aluminium foil"], answer: 2, hint: "Look for a metal.", explain: "Aluminium foil is a metal, so it conducts electricity." },
      { q: "Why are electric wires covered in plastic?", choices: ["Plastic is an insulator, so it keeps the electricity safely inside", "To make them heavier", "Plastic conducts best"], answer: 0, hint: "Plastic stops electricity.", explain: "Plastic is an insulator, so a plastic coat keeps the electricity in the wire and keeps us safe." },
      { q: "What does a solar panel do?", choices: ["Makes shade", "Turns sunlight into electricity", "Stores water"], answer: 1, hint: "Solar means of the Sun.", explain: "A solar panel turns sunlight into electricity." },
      { q: "There is a gap in the circuit. What happens to the bulb?", choices: ["It stays off", "It gets brighter", "It turns green"], answer: 0, hint: "The loop is broken.", explain: "With a gap, the loop isn't complete, so no electricity flows and the bulb stays off." }
    ]
  },

  // ───────────── Oasis 4: Obelisk Square (about age 9–10) ─────────────
  {
    id: 'p4-desert-shadoof',
    subject: 'physics',
    floor: 4,
    realm: 'desert',
    title: "The Shadoof: A Lever for Water",
    topic: 'levers',
    topicName: 'Levers',
    blurb: "Lift water from the Nile with a pole, a post and a heavy weight.",
    reading: [
      { title: "Lifting water", emoji: '🪣', text: "Water is heavy: a big bucketful can weigh as much as a small child. Egyptian farmers had to lift water from the river to their fields many times a day." },
      { title: "The shadoof", emoji: '⚖️', text: "A shadoof is a long pole balanced on a post. A bucket hangs from the long end, and a heavy lump of clay or stone is fixed to the short end. The post is the pivot." },
      { title: "A helping weight", emoji: '💪', text: "The farmer pulls the bucket down into the river. Then the counterweight does most of the work, and the full bucket swings up." },
      { title: "The lever rule", emoji: '📏', text: "A lever balances when weight × distance from the pivot is the same on both sides. A small weight far from the pivot can balance a big weight close to it." }
    ],
    sim: {
      id: 'lever',
      predict: {
        q: "A 3 kg weight sits 2 steps from the pivot on the left. Where should a 2 kg weight go on the right to balance it?",
        choices: ["1 step from the pivot", "3 steps from the pivot", "6 steps from the pivot"],
        answer: 1,
        explain: "3 kg × 2 steps = 6 on the left, and 2 kg × 3 steps = 6 on the right. Both sides match, so it balances."
      }
    },
    quiz: [
      { q: "What is the pivot of a shadoof?", choices: ["The post the pole balances on", "The bucket", "The river"], answer: 0, hint: "The pole turns about it.", explain: "The post is the pivot: the point the pole turns about." },
      { q: "What does the shadoof's counterweight do?", choices: ["It keeps the water warm", "It helps lift the full bucket", "It scares birds away"], answer: 1, hint: "It is on the other end.", explain: "The heavy counterweight on the short end helps swing the full bucket up." },
      { q: "A 4 kg weight is 1 step from the pivot. How far away must a 2 kg weight go to balance it?", choices: ["1 step", "4 steps", "2 steps"], answer: 2, hint: "4 × 1 = 2 × ?", explain: "4 × 1 = 4, and 2 × 2 = 4. So the 2 kg weight goes 2 steps away." },
      { q: "Which of these is a lever too?", choices: ["A ball", "A rope", "A seesaw"], answer: 2, hint: "It has a pivot in the middle.", explain: "A seesaw is a lever: a bar that turns about a pivot." },
      { q: "Why did farmers use a shadoof?", choices: ["It made lifting water much easier", "It made the water cleaner", "It caught fish"], answer: 0, hint: "The counterweight helps.", explain: "The lever and its counterweight made lifting heavy buckets of water much easier." }
    ]
  },
  {
    id: 'p4-desert-hot-cold',
    subject: 'physics',
    floor: 4,
    realm: 'desert',
    title: "Hot Days, Cold Nights",
    topic: 'states-of-matter',
    topicName: 'States of matter',
    blurb: "Why does the desert freeze at night? Heat and cool water to find out.",
    reading: [
      { title: "A big swing", emoji: '🌡️', text: "In the Sahara, a summer day can be hotter than 40 °C. But the desert cools quickly at night, and on winter nights it can even drop below 0 °C." },
      { title: "Why so cold at night?", emoji: '🌙', text: "Desert air is very dry, and there are few clouds. Clouds and water vapour act like a blanket. Without them, the ground's heat escapes quickly into the sky." },
      { title: "Ice, water, steam", emoji: '💧', text: "Water freezes into ice at 0 °C and boils at 100 °C at sea level. In between, it is a liquid. Changing between solid, liquid and gas is called a change of state." },
      { title: "Cooling by evaporation", emoji: '🏺', text: "When water evaporates, it takes heat away with it. A wet clay pot, or a pot inside a bigger pot with wet sand between them, keeps food and water cool in the desert." }
    ],
    sim: {
      id: 'states',
      predict: {
        q: "You cool water down, starting from 20 °C. At what temperature will it start to freeze?",
        choices: ["0 °C", "10 °C", "−20 °C"],
        answer: 0,
        explain: "Water freezes at 0 °C. That is why a bottle of water left out on a freezing desert night can turn to ice."
      }
    },
    quiz: [
      { q: "Why do desert nights get so cold?", choices: ["The Sun is closer at night", "The dry air and clear sky let the heat escape quickly", "The sand makes ice"], answer: 1, hint: "There is no blanket of clouds.", explain: "Dry air and clear skies can't hold the heat in, so it escapes quickly into the sky." },
      { q: "At what temperature does water freeze?", choices: ["50 °C", "100 °C", "0 °C"], answer: 2, hint: "The same number as on a thermometer's zero.", explain: "Water freezes into ice at 0 °C." },
      { q: "A bottle of water is left out on a winter desert night at −3 °C. What may happen?", choices: ["The water may freeze into ice", "It boils", "It turns into sand"], answer: 0, hint: "−3 °C is below freezing.", explain: "−3 °C is below 0 °C, so the water may freeze." },
      { q: "Why does a wet clay pot keep water cool?", choices: ["Clay is magic", "Evaporating water takes heat away", "The pot is painted white"], answer: 1, hint: "Think about what happens to the water on the outside.", explain: "As water evaporates from the wet pot, it carries heat away, cooling what is inside." },
      { q: "Water boils at 100 °C at sea level. What does it turn into?", choices: ["Ice", "Sand", "Steam (water vapour)"], answer: 2, hint: "It becomes a gas.", explain: "Boiling water turns into water vapour, a gas, often called steam." }
    ]
  },

  // ───────────── Oasis 5: Balloon Field (about age 10–11) ─────────────
  {
    id: 'p5-desert-mirages',
    subject: 'physics',
    floor: 5,
    realm: 'desert',
    title: "Mirages: Tricks of the Light",
    topic: 'light-reflection',
    topicName: 'Reflection and refraction',
    blurb: "A shining lake that isn't there! Bounce light off a mirror and find out how mirages work.",
    reading: [
      { title: "Water that isn't there", emoji: '🏜️', text: "On a hot day, desert travellers sometimes see what looks like a shining lake far ahead. When they get closer, it's gone! This is a mirage." },
      { title: "Light bends", emoji: '↪️', text: "Light travels in straight lines through air that is all the same. But when it passes between cooler and hotter air, it bends. Bending light is called refraction." },
      { title: "The sky on the ground", emoji: '🔄', text: "The air just above hot sand is much hotter than the air higher up. Light from the sky bends upwards as it skims over the hot air, so you see a picture of the blue sky on the ground. It looks just like water reflecting the sky." },
      { title: "Mirrors", emoji: '🪞', text: "A mirror bounces light back: the angle the light comes in at equals the angle it bounces off at. A mirage acts a bit like a mirror lying on the sand." }
    ],
    sim: {
      id: 'mirror',
      predict: {
        q: "A light beam hits the mirror 30° from the normal. At what angle from the normal will it bounce off?",
        choices: ["30°", "60°", "90°"],
        answer: 0,
        explain: "The angle in equals the angle out, so it bounces off at 30° on the other side of the normal."
      }
    },
    quiz: [
      { q: "What is a mirage?", choices: ["A desert animal", "A trick of the light that can look like water", "A kind of sandstorm"], answer: 1, hint: "The lake disappears as you get closer.", explain: "A mirage is a trick of the light: bent light makes the sky appear on the ground, like water." },
      { q: "What happens to light passing between cool air and very hot air?", choices: ["It bends", "It stops", "It turns green"], answer: 0, hint: "This is called refraction.", explain: "Light bends when it passes between air of different temperatures." },
      { q: "What are you really seeing in a desert mirage?", choices: ["Real water", "Melted sand", "A picture of the sky, bent by the hot air"], answer: 2, hint: "It is blue, like the sky.", explain: "The hot air bends light from the sky up to your eyes, so you see the sky on the ground." },
      { q: "A beam hits a mirror 40° from the normal. At what angle does it bounce off?", choices: ["20°", "40°", "80°"], answer: 1, hint: "Angle in equals angle out.", explain: "It bounces off at 40°, the same angle it came in at." },
      { q: "Can you take a photo of a mirage?", choices: ["Yes, because the bent light really reaches the camera", "No, it is only in your head"], answer: 0, hint: "Is the light real?", explain: "Yes! A mirage is real light, just bent, so a camera can photograph it." }
    ]
  },
  {
    id: 'p5-desert-hot-air-balloons',
    subject: 'physics',
    floor: 5,
    realm: 'desert',
    title: "Why Hot-Air Balloons Rise",
    topic: 'density',
    topicName: 'Density and floating',
    blurb: "Balloons float over the Nile at sunrise. Test what floats, then find out why hot air rises.",
    reading: [
      { title: "Balloons over the desert", emoji: '🎈', text: "At sunrise near Luxor, hot-air balloons float over the temples and the Nile. How do they rise into the sky?" },
      { title: "Floating in air", emoji: '🫧', text: "Things float in water when they are less dense than water: they have less mass packed into the same space. The same idea works in air!" },
      { title: "Hot air is lighter", emoji: '🔥', text: "When air is heated, its particles move faster and spread out. So a balloon full of hot air is less dense than the cooler air around it, and it floats up." },
      { title: "The first flight", emoji: '🎉', text: "In 1783 in France, a hot-air balloon made by the Montgolfier brothers carried the first people up into the sky." }
    ],
    sim: {
      id: 'float',
      setup: { items: ['cork', 'stone', 'ice-cube', 'metal-spoon', 'candle-wax', 'glass-marble'] },
      predict: {
        q: "Which one will float in the water tank: the ice cube or the glass marble?",
        choices: ["The ice cube", "The glass marble"],
        answer: 0,
        explain: "Ice is a little less dense than water, so it floats. Glass is much denser than water, so the marble sinks."
      }
    },
    quiz: [
      { q: "Why does a hot-air balloon rise?", choices: ["Birds pull it up", "Hot air is heavier", "The hot air inside is less dense than the cooler air outside"], answer: 2, hint: "Think about density.", explain: "Heated air spreads out and becomes less dense than the cooler air around it, so the balloon floats up." },
      { q: "What happens to air when it is heated?", choices: ["Its particles spread out, so it becomes less dense", "It turns into water", "It gets heavier"], answer: 0, hint: "The particles move faster.", explain: "Heated particles move faster and spread out, making the air less dense." },
      { q: "An ice cube floats in water. What does that tell you?", choices: ["Ice is magnetic", "Ice is less dense than water", "Ice is heavier than the whole tank"], answer: 1, hint: "Things less dense than water float.", explain: "Floating shows that ice is less dense than liquid water." },
      { q: "When do balloons usually fly in the desert?", choices: ["At midday in a sandstorm", "Early in the morning, when the air is cool and calm", "Never"], answer: 1, hint: "Think about calm, cool air.", explain: "Balloons fly in the early morning, when the air is cool and calm and the hot balloon rises well." },
      { q: "Whose hot-air balloon carried the first people into the sky, in 1783?", choices: ["The Montgolfier brothers'", "Howard Carter's", "Ibn Battuta's"], answer: 0, hint: "Two brothers from France.", explain: "In 1783, a balloon made by the Montgolfier brothers carried the first people into the sky." }
    ]
  },

  // ───────────── Oasis 6: Scroll Library (about age 11–12) ─────────────
  {
    id: 'p6-desert-sandstorms',
    subject: 'physics',
    floor: 6,
    realm: 'desert',
    title: "Sandstorms and Flying Dust",
    topic: 'air-resistance',
    topicName: 'Gravity and air resistance',
    blurb: "Why does dust fly for days while sand falls fast? Drop things with and without air.",
    reading: [
      { title: "Walls of sand", emoji: '🌪️', text: "In a sandstorm, strong winds lift sand and dust high into the air. The sky turns orange and it's hard to see. Camels can close their nostrils, and their long eyelashes help keep sand out of their eyes." },
      { title: "Air resistance", emoji: '🪶', text: "Air pushes back on falling things. Light things with a big surface for their weight, like feathers or tiny specks of dust, are slowed a lot. A heavy, compact ball falls fast." },
      { title: "Big grains, tiny grains", emoji: '⚖️', text: "Heavy sand grains fall back quickly and bounce along near the ground. Very fine dust falls so slowly that the wind can carry it for days." },
      { title: "Desert dust feeds a rainforest", emoji: '🌳', text: "Every year, the wind carries millions of tonnes of Sahara dust across the Atlantic Ocean. Some of it falls on the Amazon rainforest, bringing nutrients that help plants grow." }
    ],
    sim: {
      id: 'drop',
      setup: { objects: ['ball', 'feather'], air: 'toggle' },
      predict: {
        q: "You drop a ball and a feather at the same time, with air in the tube. Which lands first?",
        choices: ["The ball", "The feather", "Both together"],
        answer: 0,
        explain: "Air resistance slows the light, fluffy feather much more than the ball, so the ball lands first. Take the air away and they fall together!"
      }
    },
    quiz: [
      { q: "What slows a falling feather?", choices: ["Magnets", "Sunlight", "Air resistance"], answer: 2, hint: "The air pushes back.", explain: "Air resistance, the push of the air, slows the feather." },
      { q: "Why can fine dust travel so far in the wind?", choices: ["It falls very slowly, so the wind keeps carrying it", "It is magnetic", "It is heavier than sand"], answer: 0, hint: "Think about the feather.", explain: "Tiny dust specks fall very slowly, so the wind can carry them for days and thousands of kilometres." },
      { q: "In a vacuum, with no air at all, a ball and a feather are dropped together. What happens?", choices: ["The ball lands first", "They land together", "The feather floats up"], answer: 1, hint: "No air, no air resistance.", explain: "With no air resistance, gravity makes them fall together and land at the same time." },
      { q: "How do camels keep sand out of their noses?", choices: ["They wear masks", "They can close their nostrils", "They sneeze all day"], answer: 1, hint: "A clever body trick.", explain: "Camels can close their nostrils to keep sand out." },
      { q: "Where does some Sahara dust land, far across the ocean?", choices: ["The Amazon rainforest", "The Moon", "Only in Antarctica"], answer: 0, hint: "A rainforest in South America.", explain: "Winds carry Sahara dust across the Atlantic, and some of it feeds the Amazon rainforest." }
    ]
  },
  {
    id: 'p6-desert-caravan-speed',
    subject: 'physics',
    floor: 6,
    realm: 'desert',
    title: "How Fast Is a Caravan?",
    topic: 'speed',
    topicName: 'Speed, distance and time',
    blurb: "Race carts, then plan a caravan's journey with distance = speed × time.",
    reading: [
      { title: "Speed", emoji: '🐪', text: "Speed tells you how far something goes in a certain time. A loaded camel caravan walks at about 4 kilometres per hour, about as fast as you walk." },
      { title: "Distance = speed × time", emoji: '✖️', text: "If a caravan walks at 4 km/h for 8 hours, it travels 4 × 8 = 32 km. That is a good day's journey." },
      { title: "Time = distance ÷ speed", emoji: '➗', text: "To cross 600 km of desert at about 30 km a day, a caravan needs 600 ÷ 30 = 20 days. Guides plan where the wells are along the way." },
      { title: "Racing camels", emoji: '🏁', text: "Camels can run much faster than they walk! A racing camel can keep up about 40 km/h, and sprint even faster for a short time." }
    ],
    sim: {
      id: 'race',
      predict: {
        q: "In the lab, cart A goes at 2 m/s and cart B at 4 m/s. They race for 5 seconds. How far does cart B travel?",
        choices: ["10 m", "20 m", "9 m"],
        answer: 1,
        explain: "Distance = speed × time = 4 m/s × 5 s = 20 m. Cart A goes only 2 × 5 = 10 m."
      }
    },
    quiz: [
      { q: "A caravan walks at 4 km/h for 6 hours. How far does it go?", choices: ["10 km", "64 km", "24 km"], answer: 2, hint: "Distance = speed × time.", explain: "4 × 6 = 24, so it goes 24 km." },
      { q: "A camel walks 30 km in 6 hours. What is its average speed?", choices: ["5 km/h", "36 km/h", "180 km/h"], answer: 0, hint: "Speed = distance ÷ time.", explain: "30 ÷ 6 = 5, so its average speed is 5 km/h." },
      { q: "A caravan travels 35 km a day. How many days does it need to go 280 km?", choices: ["7", "8", "9"], answer: 1, hint: "Time = distance ÷ speed.", explain: "280 ÷ 35 = 8, so it needs 8 days." },
      { q: "Which is faster: a racing camel at 40 km/h, or a person walking at 5 km/h?", choices: ["The person", "The racing camel"], answer: 1, hint: "Compare the numbers.", explain: "40 km/h is eight times faster than 5 km/h." },
      { q: "Two camels walk for the same time. Camel A goes 20 km and camel B goes 30 km. Which was faster?", choices: ["Camel A", "Camel B", "They were just as fast"], answer: 1, hint: "Same time, more distance.", explain: "In the same time, camel B went further, so camel B was faster." }
    ]
  },

  // ───────────── Oasis 7: Starry Camp (about age 12–13) ─────────────
  {
    id: 'p7-desert-eratosthenes',
    subject: 'physics',
    floor: 7,
    realm: 'desert',
    title: "Eratosthenes Measures the Earth",
    topic: 'earth-size',
    topicName: 'Measuring the Earth with shadows',
    blurb: "Use shadows, a little geometry and two Egyptian cities to measure the whole Earth.",
    reading: [
      { title: "A clever idea", emoji: '🌍', text: "About 2,240 years ago, Eratosthenes, the head librarian in Alexandria, heard that at noon on the longest day of the year in Syene (today's Aswan), upright posts cast almost no shadow. The Sun was almost straight overhead." },
      { title: "Shadows in Alexandria", emoji: '📐', text: "At noon on the same day in Alexandria, far to the north, an upright stick did cast a shadow. The sunlight came in at about 7.2° from straight up, which is about 1/50 of a full circle (360°)." },
      { title: "A curved Earth", emoji: '🧮', text: "The Sun is so far away that its rays arrive almost parallel. So the different shadows meant the Earth's surface is curved. Syene to Alexandria was about 5,000 stadia, so the whole way round was about 50 × 5,000 = 250,000 stadia." },
      { title: "Very close", emoji: '🎯', text: "Nobody knows exactly how long his stadium was, but his answer was remarkably close to the real distance round the Earth: about 40,000 km." }
    ],
    sim: {
      id: 'shadow',
      predict: {
        q: "You move the torch far away from the toy. What happens to the shadow on the wall?",
        choices: ["It shrinks towards the toy's own size", "It grows huge", "It vanishes"],
        answer: 0,
        explain: "Far away, the light rays reach the toy almost parallel, so the shadow is close to the toy's own size. The Sun is so far away that its rays are almost parallel: Eratosthenes counted on that."
      }
    },
    quiz: [
      { q: "Why did upright posts in Syene cast almost no shadow at noon on the longest day?", choices: ["It was cloudy", "The Sun was almost straight overhead", "The posts were too thin"], answer: 1, hint: "Where was the Sun in the sky?", explain: "The Sun was almost straight overhead, so there was almost no shadow." },
      { q: "7.2° is about what fraction of a full circle (360°)?", choices: ["1/50", "1/10", "1/2"], answer: 0, hint: "360 ÷ 7.2 = ?", explain: "360 ÷ 7.2 = 50, so 7.2° is 1/50 of a circle." },
      { q: "Syene to Alexandria is 5,000 stadia, and that is 1/50 of the way round the Earth. How far is it all the way round?", choices: ["5,050 stadia", "100,000 stadia", "250,000 stadia"], answer: 2, hint: "50 × 5,000.", explain: "50 × 5,000 = 250,000 stadia." },
      { q: "Why were the shadows different in the two cities on the same day?", choices: ["The Sun was closer to Alexandria", "Alexandria had taller sticks", "The Earth's surface is curved"], answer: 2, hint: "The Sun's rays arrive almost parallel.", explain: "Parallel sunlight hits a curved Earth at different angles in different places, so the shadows differ." },
      { q: "About how far is it all the way round the Earth?", choices: ["About 400 km", "About 40,000 km", "About 4 million km"], answer: 1, hint: "Tens of thousands of kilometres.", explain: "The Earth is about 40,000 km round, and Eratosthenes' answer was remarkably close." }
    ]
  },
  {
    id: 'p7-desert-star-calendar',
    subject: 'physics',
    floor: 7,
    realm: 'desert',
    title: "The Desert Sky Calendar",
    topic: 'orbits-calendar',
    topicName: 'Orbits and the calendar',
    blurb: "Launch a moon into orbit, then see how the Earth's orbit and a bright star gave Egypt its calendar.",
    reading: [
      { title: "A year is an orbit", emoji: '🌍', text: "The Sun's gravity keeps the Earth travelling round it in an orbit. One trip round takes about 365¼ days: that is one year." },
      { title: "Egypt's calendar", emoji: '📅', text: "The ancient Egyptians made a calendar of 365 days: 12 months of 30 days, plus 5 extra days at the end of the year for festivals." },
      { title: "The star of the flood", emoji: '⭐', text: "Each summer, the bright star Sirius appeared again in the dawn sky just before sunrise, after about 70 days hidden in the Sun's glare. That happened around the time the Nile began to rise." },
      { title: "A missing quarter day", emoji: '⏱️', text: "The real year is about a quarter of a day longer than 365 days, so the Egyptian calendar slowly drifted: one day every four years. Today we add a leap day every four years to fix this." }
    ],
    sim: {
      id: 'orbit',
      predict: {
        q: "You launch the moon sideways much too slowly. What will happen?",
        choices: ["It falls towards the planet", "It escapes into space", "It stops still in the sky"],
        answer: 0,
        explain: "Too slow, and gravity pulls it down before it can get round: it falls towards the planet. With just the right sideways speed it keeps falling round and round: an orbit, like the Earth's round the Sun."
      }
    },
    quiz: [
      { q: "How long does the Earth take to go once round the Sun?", choices: ["About 24 hours", "About 30 days", "About 365¼ days"], answer: 2, hint: "One year.", explain: "One orbit of the Sun takes about 365¼ days: one year." },
      { q: "How many days were in the Egyptian calendar year?", choices: ["365", "360", "400"], answer: 0, hint: "12 months of 30 days, plus 5.", explain: "12 × 30 = 360, plus 5 festival days makes 365." },
      { q: "What did the dawn rising of Sirius tell Egyptian farmers?", choices: ["Winter snow was coming", "The Nile flood was coming", "It was time to sleep"], answer: 1, hint: "It came each summer.", explain: "Sirius reappeared at dawn around the time the Nile began to rise, so it was a sign of the flood." },
      { q: "A calendar has 365 days, but the real year is 365¼ days. By how many days does it drift in 8 years?", choices: ["1", "2", "8"], answer: 1, hint: "A quarter of a day each year.", explain: "8 × ¼ = 2, so it drifts by 2 days in 8 years." },
      { q: "What keeps the Earth travelling round the Sun instead of flying off into space?", choices: ["The wind", "Magnets", "The Sun's gravity"], answer: 2, hint: "Remember the moon you launched.", explain: "The Sun's gravity keeps bending the Earth's path, and its sideways speed carries it round: an orbit." }
    ]
  }
];

export const DESERT_LESSONS = [...DESERT_MATH, ...DESERT_HISTORY, ...DESERT_PHYSICS];
