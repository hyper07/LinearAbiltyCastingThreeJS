/**
 * Mars's lessons (the Mars study world, maps.js): seven ring terraces up
 * Olympus Mons, each with the Red Dome School (math), the Mars Museum
 * (history) and the Weather Lab (physics) — the same three kinds of lesson
 * as the land, all-new Mars and planet stories. Every lesson has realm:
 * 'mars'; its floor is its terrace (1–7), and its stars open the terraces,
 * never the land floors.
 *
 * Terraces: 1 Landing Plains 🪂, 2 Rover Ridge 🚙, 3 Ice Ledge 🧊,
 * 4 Greenhouse Terrace 🌱, 5 Weather Heights 🌡️, 6 Dust Devil Ledge 🌪️, 7 Caldera Rim 🌋.
 *
 * Mars Math uses the land's chalkboard and practice generators for the same
 * floor (math.js), but its check is a fixed set of written Mars word
 * problems. Numbers are rounded for children and say "about" (a sol is about
 * 24 hours and 40 minutes; gravity about 38 %, or about 3/8, of the Earth's);
 * dates long ago say "about"; nothing frightening (missions that ended went
 * to sleep after long, good work).
 */

/* ------------------------------------------------------------ Mars Math (the Red Dome School) */

/** A Mars Math lesson: the land generator `gen` draws the board and the practice; the quiz is written. */
const M = (id, floor, title, gen, topicName, blurb, kind, reading, quiz) => ({
  id, subject: 'math', floor, realm: 'mars', title, topic: gen, topicName, blurb, reading,
  board: { gen }, practice: { kind, gen }, quiz
});

const MARS_MATH = [
  // ───────────── Terrace 1: Landing Plains (about age 6–7) ─────────────
  M('m1-mars-rover-wheels', 1, "Counting Rover Wheels", 'count', 'Counting', "Count red rocks, rover wheels and stars over the Landing Plains.", 'count', [
    { title: "Six wheels each", emoji: '🚙', text: "Mars rovers roll on six wheels: three on each side. Six wheels help them climb over rocks without tipping over." },
    { title: "One number for each", emoji: '🪨', text: "Mars is covered in red rocks. To count them, point to each rock once and say one number. The last number you say tells you how many." },
    { title: "Rows of five", emoji: '🖐️', text: "Lots of things are easier to count in fives: 5, 10, 15, 20. Line the rocks up in rows of 5 to help." }
  ], [
    { q: "How many rocks can you see? 🪨🪨🪨🪨🪨🪨🪨🪨", choices: ["8", "7", "9"], answer: 0, hint: "Point to each rock once as you count.", explain: "1, 2, 3, 4, 5, 6, 7, 8. There are 8 rocks." },
    { q: "A rover has 3 wheels on each side. How many wheels is that in all?", choices: ["3", "6", "9"], answer: 1, hint: "Count the wheels on one side, then keep counting on the other side.", explain: "3 and 3 more make 6. A Mars rover has 6 wheels." },
    { q: "The rover counts craters: 13, 14, 15. What number comes next?", choices: ["14", "17", "16"], answer: 2, hint: "What number comes just after 15?", explain: "After 15 comes 16." },
    { q: "Count the stars over Mars: ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐. How many are there?", choices: ["11", "10", "12"], answer: 0, hint: "Count the first 10, then keep going.", explain: "10, then 11. There are 11 stars." },
    { q: "There are 2 rovers. Each one has 6 wheels. How many wheels is that?", choices: ["8", "12", "6", "10"], answer: 1, hint: "Count 6, then count on 6 more: 7, 8, …", explain: "6 and 6 more make 12 wheels." }
  ]),
  M('m1-mars-rock-samples', 1, "Collecting Rock Samples", 'add10', 'Adding within 10', "The rover picks up little rocks to study. How many has it got now?", 'numberline', [
    { title: "A rock collection", emoji: '🧪', text: "Rovers on Mars pick up little bits of rock to study. Scientists call each one a sample." },
    { title: "Adding means more", emoji: '➕', text: "When we add, we put two groups together. 3 red rocks and 2 grey rocks make 5 rocks." },
    { title: "Hop forward", emoji: '🐾', text: "On the number line, start at the first number and hop forward once for each one you add. Where you land is the answer." }
  ], [
    { q: "The rover picks up 4 rocks, then 3 more. How many rocks does it have now?", choices: ["7", "6", "1"], answer: 0, hint: "Start at 4 and hop forward 3.", explain: "4 + 3 = 7. The rover has 7 rocks." },
    { q: "Miss Ruby has 5 pebbles. She finds 5 more. How many does she have?", choices: ["9", "10", "55"], answer: 1, hint: "Start at 5 and hop forward 5.", explain: "5 + 5 = 10 pebbles." },
    { q: "2 rovers are driving. 6 more join them. How many rovers are there?", choices: ["4", "9", "8"], answer: 2, hint: "Start at 6 and hop forward 2: it means fewer hops!", explain: "2 + 6 = 8 rovers." },
    { q: "There are 7 red rocks and 1 white rock. How many rocks in all?", choices: ["8", "6", "71"], answer: 0, hint: "What comes just after 7?", explain: "7 + 1 = 8 rocks." },
    { q: "Which is the same as 3 + 4?", choices: ["4 + 3", "3 + 3", "7 + 4"], answer: 0, hint: "Swapping the numbers round doesn't change the answer.", explain: "3 + 4 and 4 + 3 both make 7." }
  ]),

  // ───────────── Terrace 2: Rover Ridge (about age 7–8) ─────────────
  M('m2-mars-sample-tens', 2, "Rock Samples in Tens", 'tens-ones', 'Place value', "Pack rock samples in boxes of ten and find what each digit means.", 'place-value', [
    { title: "Lots of craters", emoji: '🕳️', text: "Mars has many round craters, made long ago when space rocks crashed into it. Counting lots of things is easier in groups of ten." },
    { title: "Tens and ones", emoji: '🔢', text: "46 means 4 tens and 6 ones. The 4 is in the tens place, so it means 40. The 6 is in the ones place, so it means 6." },
    { title: "Sample boxes", emoji: '📦', text: "The rover team packs rock samples in boxes of 10. 5 full boxes and 3 more samples make 53 samples." }
  ], [
    { q: "The team fills 7 boxes of 10 samples, and has 4 samples left over. How many samples is that?", choices: ["74", "47", "11"], answer: 0, hint: "7 tens and 4 ones.", explain: "7 tens are 70, and 4 more make 74." },
    { q: "In 38, what does the 3 mean?", choices: ["3 ones", "3 tens", "3 hundreds"], answer: 1, hint: "The 3 is in the tens place.", explain: "In 38, the 3 means 3 tens (30) and the 8 means 8 ones." },
    { q: "Which number is 6 tens and 2 ones?", choices: ["26", "8", "62"], answer: 2, hint: "Tens first, then ones.", explain: "6 tens and 2 ones make 62." },
    { q: "Which is more: 59 craters or 95 craters?", choices: ["59", "95", "They are the same"], answer: 1, hint: "Look at the tens first.", explain: "95 has 9 tens, and 59 has only 5 tens. So 95 is more." },
    { q: "How many tens are in 90?", choices: ["9", "90", "0", "10"], answer: 0, hint: "Count in tens: 10, 20, 30 …", explain: "90 is 9 tens and 0 ones." }
  ]),
  M('m2-mars-rover-drive', 2, "Adding Up the Rover's Drive", 'add-carry', 'Column addition', "Add up how far the rover drives each day, in columns, and carry the ten.", 'column', [
    { title: "Slow and steady", emoji: '🚙', text: "Mars rovers drive slowly and carefully, so they don't bump into rocks. The team adds up how far they go each day." },
    { title: "Line them up", emoji: '📏', text: "To add big numbers, write them one under the other: ones under ones, tens under tens. Always add the ones first." },
    { title: "Carry the ten", emoji: '🎒', text: "If the ones add up to 10 or more, write down the ones digit and carry 1 ten over to the top of the tens column." }
  ], [
    { q: "The rover drives 36 m on Monday and 27 m on Tuesday. How far is that?", choices: ["63 m", "53 m", "513 m"], answer: 0, hint: "6 + 7 is more than 10: carry the ten.", explain: "Ones: 6 + 7 = 13, write 3 and carry 1. Tens: 3 + 2 + 1 = 6. So 63 m." },
    { q: "There are 45 pikas and 38 chinchillas on Rover Ridge. How many critters is that?", choices: ["73", "83", "713"], answer: 1, hint: "5 + 8 = 13: write 3, carry 1.", explain: "Ones: 5 + 8 = 13, write 3 and carry 1. Tens: 4 + 3 + 1 = 8. So 83 critters." },
    { q: "A rover takes 29 photos, then 46 more. How many photos is that?", choices: ["65", "615", "75"], answer: 2, hint: "9 + 6 = 15: write 5, carry 1.", explain: "Ones: 9 + 6 = 15, write 5 and carry 1. Tens: 2 + 4 + 1 = 7. So 75 photos." },
    { q: "When you add 18 + 24, the ones make 12. What do you do?", choices: ["Write 2 and carry 1 ten", "Write 12 in the ones place", "Throw the 1 away"], answer: 0, hint: "Only one digit fits in each column.", explain: "Write the 2 in the ones column and carry the 1 ten. 18 + 24 = 42." },
    { q: "The rover drives 54 m, then 19 m. How far does it go?", choices: ["63 m", "73 m", "35 m", "613 m"], answer: 1, hint: "4 + 9 = 13: write 3, carry 1.", explain: "Ones: 4 + 9 = 13, write 3 and carry 1. Tens: 5 + 1 + 1 = 7. So 73 m." }
  ]),

  // ───────────── Terrace 3: Ice Ledge (about age 8–9) ─────────────
  M('m3-mars-wheel-times', 3, "Six Wheels: The Six Times Table", 'times', 'Times tables', "Every rover has six wheels. Multiply to count them all.", 'array', [
    { title: "Wheels and more wheels", emoji: '🚙', text: "Every Mars rover has 6 wheels. 3 rovers have 3 × 6 = 18 wheels. Multiplying is a quick way to add the same number again and again." },
    { title: "Arrays", emoji: '🔲', text: "Park the rovers in rows. 4 rovers with 6 wheels each make an array of 4 rows of 6: 4 × 6 = 24 wheels." },
    { title: "Turn it round", emoji: '🔄', text: "4 × 6 is the same as 6 × 4. Turn the array on its side, and there are still 24 wheels!" }
  ], [
    { q: "How many wheels do 5 rovers have? (Each has 6 wheels.)", choices: ["11", "30", "25"], answer: 1, hint: "Count in sixes 5 times.", explain: "6, 12, 18, 24, 30. Five rovers have 30 wheels." },
    { q: "7 rovers each have 6 wheels. How many wheels is that?", choices: ["42", "36", "48"], answer: 0, hint: "7 × 6: try 6 × 6 and add one more 6.", explain: "6 × 6 = 36, and one more 6 makes 42." },
    { q: "A greenhouse has 4 rows of 8 tomato plants. How many plants is that?", choices: ["12", "24", "32"], answer: 2, hint: "4 × 8", explain: "4 × 8 = 32 plants." },
    { q: "Which is the same as 3 × 6?", choices: ["6 × 3", "3 + 6", "6 × 6"], answer: 0, hint: "Turning an array round doesn't change how many.", explain: "3 × 6 and 6 × 3 both make 18." },
    { q: "How many wheels do 9 rovers have?", choices: ["45", "54", "15", "56"], answer: 1, hint: "9 × 6: try 10 × 6 and take away one 6.", explain: "10 × 6 = 60, and 60 − 6 = 54 wheels." }
  ]),
  M('m3-mars-fractions', 3, "Fractions on Mars", 'fractions', 'Fractions', "Share space pizza and ice cores fairly, and find out how big Mars is compared with the Earth.", 'pizza', [
    { title: "Equal parts", emoji: '🍕', text: "A fraction is part of a whole. Cut a space pizza into 4 equal slices, and each slice is one quarter: 1/4." },
    { title: "Top and bottom", emoji: '🔢', text: "In 2/3, the bottom number (3) says how many equal parts there are. The top number (2) says how many of those parts we mean." },
    { title: "Half as wide", emoji: '🌍', text: "Mars is only about half as wide as the Earth. Put two Mars side by side, and they would be about as wide as one Earth." },
    { title: "Share it fairly", emoji: '🥔', text: "One day astronauts may grow potatoes on Mars! Sharing a potato fairly means cutting it into equal parts." }
  ], [
    { q: "A space pizza is cut into 8 equal slices. You eat 3. What fraction did you eat?", choices: ["3/8", "3/5", "5/8"], answer: 0, hint: "How many equal slices? How many were eaten?", explain: "You ate 3 of the 8 equal slices: 3/8." },
    { q: "About how wide is Mars, compared with the Earth?", choices: ["About twice as wide", "About half as wide", "Just as wide"], answer: 1, hint: "Two of them side by side make about one Earth.", explain: "Mars is about half as wide as the Earth: about 1/2." },
    { q: "An ice core is cut into 3 equal pieces. What fraction is one piece?", choices: ["1/2", "3/1", "1/3"], answer: 2, hint: "The bottom number is how many equal pieces.", explain: "One of 3 equal pieces is 1/3." },
    { q: "Which is bigger: 1/2 of a potato or 1/3 of the same potato?", choices: ["1/2", "1/3", "They are the same"], answer: 0, hint: "Fewer pieces means bigger pieces.", explain: "Cut into 2, each piece is bigger than when it is cut into 3. So 1/2 is bigger." },
    { q: "6 rovers are parked. 2 of them are blue. What fraction of the rovers are blue?", choices: ["2/4", "2/6", "6/2"], answer: 1, hint: "The bottom number is how many rovers in all.", explain: "2 of the 6 rovers are blue: 2/6." }
  ]),

  // ───────────── Terrace 4: Greenhouse Terrace (about age 9–10) ─────────────
  M('m4-mars-weight', 4, "Lighter on Mars", 'fraction-of', 'Fractions of amounts', "On Mars, things feel only about 3/8 as heavy as on Earth. Find fractions of amounts to find out!", 'pizza', [
    { title: "A gentler pull", emoji: '🔴', text: "Mars is smaller than the Earth, so its gravity pulls more gently. On Mars, things feel only about 3/8 as heavy as on Earth: a bit more than a third." },
    { title: "Finding 3/8 of a number", emoji: '➗', text: "To find 3/8 of 40, first find 1/8 of it: 40 ÷ 8 = 5. Then take 3 of those: 3 × 5 = 15." },
    { title: "Same stuff, less pull", emoji: '🎒', text: "A backpack holds just as much on Mars. Only the pull on it is gentler, so it feels lighter to carry." },
    { title: "Divide, then multiply", emoji: '🧮', text: "To find any fraction of an amount, divide by the bottom number, then multiply by the top number." }
  ], [
    { q: "A rock feels like 16 kg on Earth. On Mars it feels like 3/8 of that. How heavy does it feel?", choices: ["6 kg", "2 kg", "8 kg"], answer: 0, hint: "16 ÷ 8, then × 3.", explain: "16 ÷ 8 = 2, and 3 × 2 = 6. It feels like about 6 kg." },
    { q: "What is 1/4 of 20 rock samples?", choices: ["4", "5", "16"], answer: 1, hint: "Divide by 4.", explain: "20 ÷ 4 = 5 samples." },
    { q: "What is 3/8 of 24?", choices: ["3", "8", "9"], answer: 2, hint: "24 ÷ 8, then × 3.", explain: "24 ÷ 8 = 3, and 3 × 3 = 9." },
    { q: "A toolbox feels like 32 kg on Earth. About how heavy will it feel on Mars (3/8 of it)?", choices: ["12 kg", "4 kg", "20 kg"], answer: 0, hint: "32 ÷ 8, then × 3.", explain: "32 ÷ 8 = 4, and 3 × 4 = 12. It feels like about 12 kg." },
    { q: "Why does a backpack feel lighter on Mars?", choices: ["Things fall out of it", "Mars's gravity pulls on it more gently", "It shrinks"], answer: 1, hint: "Nothing falls out of the backpack!", explain: "The backpack holds just as much. Mars's gravity pulls on it more gently, so it feels lighter." }
  ]),
  M('m4-mars-sol-minutes', 4, "A Sol Is a Bit Longer", 'mult-2x1', '2-digit × 1-digit', "A day on Mars is about 40 minutes longer than ours. Multiply to see how the minutes add up.", 'grid', [
    { title: "A day on Mars", emoji: '🌅', text: "A day on Mars is called a sol. Mars spins a little more slowly than the Earth, so a sol lasts about 24 hours and 40 minutes." },
    { title: "Extra minutes add up", emoji: '⏰', text: "Each sol is about 40 minutes longer than an Earth day. Rover teams living on Mars time have to start work a bit later every day to keep up!" },
    { title: "Split and multiply", emoji: '✂️', text: "To work out 40 × 7, think 4 × 7 = 28, so 40 × 7 = 280. To work out 24 × 3, split 24 into 20 and 4: 60 + 12 = 72." }
  ], [
    { q: "Each sol is about 40 minutes longer than an Earth day. How many extra minutes is that over 6 sols?", choices: ["46", "240", "200"], answer: 1, hint: "4 × 6 = 24, so 40 × 6 = …", explain: "40 × 6 = 240 extra minutes. That's 4 whole hours!" },
    { q: "A rover takes 24 photos every sol. How many photos does it take in 4 sols?", choices: ["96", "86", "28"], answer: 0, hint: "20 × 4 and 4 × 4.", explain: "20 × 4 = 80 and 4 × 4 = 16. 80 + 16 = 96 photos." },
    { q: "A team works on Mars time for 3 sols. Not counting the extra minutes, each sol is 24 hours. How many hours is that?", choices: ["27", "48", "72"], answer: 2, hint: "24 × 3: work out 20 × 3 and 4 × 3.", explain: "20 × 3 = 60 and 4 × 3 = 12. 60 + 12 = 72 hours." },
    { q: "The rover drives 35 m each sol. How far does it go in 5 sols?", choices: ["40 m", "175 m", "155 m", "165 m"], answer: 1, hint: "30 × 5 and 5 × 5.", explain: "30 × 5 = 150 and 5 × 5 = 25. 150 + 25 = 175 m." },
    { q: "To work out 26 × 4, how can you split 26?", choices: ["Into 20 and 6", "Into 2 and 6", "Into 24 and 4"], answer: 0, hint: "Split it into tens and ones.", explain: "26 is 20 and 6. 20 × 4 = 80 and 6 × 4 = 24, so 26 × 4 = 104." }
  ]),

  // ───────────── Terrace 5: Weather Heights (about age 10–11) ─────────────
  M('m5-mars-greenhouse-area', 5, "Planning a Mars Greenhouse", 'area', 'Area and perimeter', "Lay out the beds and the fence of a Mars greenhouse: area and perimeter.", 'grid', [
    { title: "Plants under glass", emoji: '🌱', text: "People who live on Mars one day will need to grow food. Their plants will grow inside warm greenhouses, safe from the cold and the thin air." },
    { title: "Area: the space inside", emoji: '🟩', text: "The area is how much floor there is inside. A greenhouse 7 m long and 4 m wide has an area of 7 × 4 = 28 square metres." },
    { title: "Perimeter: round the edge", emoji: '🚧', text: "The perimeter is the distance all the way round. For the same greenhouse it is 7 + 4 + 7 + 4 = 22 m." },
    { title: "Planting beds", emoji: '🥔', text: "If each potato plant needs 1 square metre, a greenhouse with 28 square metres of beds has room for 28 plants." }
  ], [
    { q: "A greenhouse is 9 m long and 5 m wide. What is its floor area?", choices: ["14 square metres", "45 square metres", "28 square metres"], answer: 1, hint: "Multiply length × width.", explain: "9 × 5 = 45 square metres." },
    { q: "A garden bed is 6 m long and 2 m wide. What is its perimeter?", choices: ["16 m", "12 m", "8 m"], answer: 0, hint: "Add up all four sides.", explain: "6 + 2 + 6 + 2 = 16 m." },
    { q: "A square greenhouse has sides of 8 m. What is its area?", choices: ["32 square metres", "16 square metres", "64 square metres"], answer: 2, hint: "8 × 8", explain: "8 × 8 = 64 square metres." },
    { q: "Each tomato plant needs 1 square metre. How many fit in a bed 5 m long and 3 m wide?", choices: ["8", "15", "16"], answer: 1, hint: "Find the area of the bed.", explain: "5 × 3 = 15 square metres, so 15 tomato plants fit." },
    { q: "Which one measures the space inside a shape?", choices: ["Area", "Perimeter", "Height"], answer: 0, hint: "'Peri' means 'around'. Which one is inside?", explain: "The area is the space inside. The perimeter is the distance round the edge." }
  ]),
  M('m5-mars-decimals', 5, "Mars in Decimals", 'decimals', 'Decimals', "A Mars year is about 1.9 Earth years. Measure Mars in tenths.", 'numberline', [
    { title: "Tenths", emoji: '🔟', text: "A decimal point splits wholes from parts. 1.9 means 1 whole and 9 tenths: almost 2." },
    { title: "A long Mars year", emoji: '📅', text: "Mars takes about 687 Earth days to go once round the Sun. That is about 1.9 Earth years, so a Mars birthday comes round only about every 2 Earth years!" },
    { title: "Farther from the Sun", emoji: '☀️', text: "Mars is about 1.5 times as far from the Sun as the Earth is. That's why it is colder, and why its year is longer." },
    { title: "Compare decimals", emoji: '⚖️', text: "To compare 1.5 and 1.9, look at the wholes first. They are both 1, so look at the tenths: 9 tenths is more than 5 tenths." }
  ], [
    { q: "Which is bigger: 1.9 or 1.5?", choices: ["1.5", "1.9"], answer: 1, hint: "The wholes are the same, so compare the tenths.", explain: "9 tenths is more than 5 tenths, so 1.9 is bigger." },
    { q: "A Mars year is about 1.9 Earth years. What does 1.9 mean?", choices: ["1 whole and 9 tenths", "19 wholes", "1 whole and 9 hundreds"], answer: 0, hint: "The digit after the point is tenths.", explain: "1.9 is 1 whole and 9 tenths." },
    { q: "A rover drives 2.4 km, then 1.5 km. How far is that?", choices: ["3.4 km", "39 km", "3.9 km"], answer: 2, hint: "Add the wholes, then the tenths.", explain: "2 + 1 = 3 and 0.4 + 0.5 = 0.9, so 3.9 km." },
    { q: "One rock sample is 3.6 cm long. Another is 1.2 cm long. How much longer is the first?", choices: ["4.8 cm", "2.4 cm", "2.6 cm", "24 cm"], answer: 1, hint: "3 − 1, then 0.6 − 0.2.", explain: "3 − 1 = 2 and 0.6 − 0.2 = 0.4, so it is 2.4 cm longer." },
    { q: "About how many Earth days does Mars take to go once round the Sun?", choices: ["About 365", "About 687", "About 30"], answer: 1, hint: "Nearly two Earth years.", explain: "Mars takes about 687 Earth days to go round the Sun once." }
  ]),

  // ───────────── Terrace 6: Dust Devil Ledge (about age 11–12) ─────────────
  M('m6-mars-cold', 6, "Below Zero on Mars", 'negatives', 'Negative numbers', "Mars has warm-ish afternoons and freezing nights. Count below zero to find out how cold.", 'numberline', [
    { title: "A chilly planet", emoji: '🥶', text: "Mars is farther from the Sun than the Earth, and its air is too thin to hold much warmth. On average it is about −60 °C there: far colder than a freezer at home!" },
    { title: "Below zero", emoji: '🌡️', text: "Temperatures below 0 °C are negative numbers. −70 °C is colder than −20 °C, because it is further below zero." },
    { title: "Mild days, freezing nights", emoji: '🌅', text: "On a summer afternoon near Mars's middle, the ground can warm up to about 20 °C. That same night it can drop to about −70 °C or colder." },
    { title: "Use a number line", emoji: '📏', text: "To find the difference between 20 °C and −70 °C, count down from 20 to 0 (20 degrees), then on down to −70 (70 more). That is 90 degrees in all." }
  ], [
    { q: "Which is colder: −80 °C or −30 °C?", choices: ["−80 °C", "−30 °C"], answer: 0, hint: "Further below zero is colder.", explain: "−80 °C is 80 degrees below zero, much colder than −30 °C." },
    { q: "It is 20 °C in the afternoon and −70 °C at night. What is the difference?", choices: ["50 degrees", "90 degrees", "70 degrees"], answer: 1, hint: "20 down to 0, then 70 more.", explain: "20 + 70 = 90 degrees." },
    { q: "A thermometer reads −15 °C. It warms up by 25 degrees. What does it read now?", choices: ["−40 °C", "40 °C", "10 °C"], answer: 2, hint: "15 steps up to 0, then 10 more.", explain: "From −15, 15 steps reach 0, and 10 more reach 10 °C." },
    { q: "The temperature is −60 °C. It drops by 20 degrees. What is it now?", choices: ["−80 °C", "−40 °C", "80 °C", "−20 °C"], answer: 0, hint: "Dropping means going further below zero.", explain: "−60 − 20 = −80 °C." },
    { q: "Why does Mars get so cold at night?", choices: ["It is made of ice", "Its thin air can't hold much warmth", "It stops spinning"], answer: 1, hint: "Think about the blanket of air around the Earth.", explain: "Mars's air is very thin, so the day's warmth escapes quickly at night." }
  ]),
  M('m6-mars-percent', 6, "Mars Percentages", 'percent', 'Percentages', "Gravity, air and batteries: find percentages all over Mars.", 'grid', [
    { title: "Out of 100", emoji: '💯', text: "Per cent means 'out of 100'. 50% is a half, 25% is a quarter and 10% is one tenth." },
    { title: "Gentle gravity", emoji: '🪶', text: "Mars's gravity is about 38% as strong as the Earth's. A crate that weighs 100 kg on Earth would feel like about 38 kg on Mars." },
    { title: "Air you can't breathe", emoji: '💨', text: "Mars's thin air is about 95% carbon dioxide. People can't breathe it, so explorers need air tanks or machines that make oxygen." },
    { title: "Finding a percentage", emoji: '🧮', text: "To find 10% of a number, divide it by 10. To find 30%, find 10% and multiply by 3." }
  ], [
    { q: "What is 10% of 250 km?", choices: ["25 km", "2.5 km", "240 km"], answer: 0, hint: "Divide by 10.", explain: "250 ÷ 10 = 25 km." },
    { q: "Mars's gravity is about 38% of the Earth's. A crate weighs 200 kg on Earth. About how heavy does it feel on Mars?", choices: ["38 kg", "76 kg", "162 kg"], answer: 1, hint: "38% of 100 is 38, so 38% of 200 is …", explain: "38% of 100 kg is 38 kg, so 38% of 200 kg is 76 kg." },
    { q: "A Mars greenhouse holds 40 plants, and 25% of them are potatoes. How many potatoes is that?", choices: ["25", "4", "10"], answer: 2, hint: "25% is a quarter.", explain: "A quarter of 40 is 10 potato plants." },
    { q: "Mars's air is about 95% carbon dioxide. About what percentage is everything else?", choices: ["5%", "95%", "50%", "105%"], answer: 0, hint: "The whole is 100%.", explain: "100% − 95% = 5%." },
    { q: "A rover battery is 30% full. How much more charge does it need to reach 100%?", choices: ["30%", "70%", "130%"], answer: 1, hint: "100 − 30", explain: "100% − 30% = 70%." }
  ]),

  // ───────────── Terrace 7: Caldera Rim (about age 12–13) ─────────────
  M('m7-mars-rover-equations', 7, "Rover Route Equations", 'two-step', 'Two-step equations', "Plan a rover's careful drive by undoing two steps.", 'balance', [
    { title: "A careful drive", emoji: '🚙', text: "Rovers on Mars drive very slowly, at most about 150 metres an hour. Drivers on Earth plan each day's route carefully, step by step." },
    { title: "Two steps", emoji: '🧩', text: "In 5x + 20 = 120, a mystery number x was multiplied by 5, and then 20 was added. To find x, undo the steps in reverse order." },
    { title: "Undo, undo", emoji: '↩️', text: "Take 20 from both sides: 5x = 100. Then divide both sides by 5: x = 20. Check it: 5 × 20 + 20 = 120 ✓." }
  ], [
    { q: "Solve 3x + 10 = 40.", choices: ["10", "30", "13"], answer: 0, hint: "Take away 10, then divide by 3.", explain: "3x = 30, so x = 10. Check: 3 × 10 + 10 = 40." },
    { q: "A rover drives x metres an hour for 4 hours, after a 30 m test drive. It goes 430 m in all: 4x + 30 = 430. What is x?", choices: ["400", "100", "115"], answer: 1, hint: "Take away 30, then divide by 4.", explain: "4x = 400, so x = 100 metres an hour." },
    { q: "Solve 6x − 8 = 46.", choices: ["6", "7", "9"], answer: 2, hint: "Add 8, then divide by 6.", explain: "6x = 54, so x = 9. Check: 6 × 9 − 8 = 46." },
    { q: "A team packs x sample tubes in each of 5 boxes, plus 3 spare tubes: 43 tubes in all. 5x + 3 = 43. What is x?", choices: ["7", "8", "9", "10"], answer: 1, hint: "Take away 3, then divide by 5.", explain: "5x = 40, so x = 8 tubes in each box." },
    { q: "At about 150 metres an hour, how far could a rover drive in 4 hours?", choices: ["154 m", "600 m", "450 m"], answer: 1, hint: "150 × 4", explain: "150 × 4 = 600 m. That's slower than you walk!" }
  ]),
  M('m7-mars-solar-squares', 7, "Square Solar Fields", 'squares', 'Squares and roots', "Square solar fields and dome floors: find areas from sides, and sides from areas.", 'grid', [
    { title: "Square numbers", emoji: '🟩', text: "A square number is a number times itself. 7 × 7 = 49, so 49 is a square number. We write it as 7²." },
    { title: "Square roots", emoji: '√', text: "A square root undoes squaring. √49 = 7, because 7 × 7 = 49. A square solar field covering 49 m² has sides 7 m long." },
    { title: "Bigger fields for Mars", emoji: '☀️', text: "Mars gets less than half the sunlight the Earth does, because it is farther from the Sun. So a Mars base would need bigger fields of solar panels." },
    { title: "In between", emoji: '🔍', text: "√70 is not a whole number. 8² = 64 and 9² = 81, so √70 is between 8 and 9." }
  ], [
    { q: "A square solar field has sides of 11 m. What is its area?", choices: ["22 m²", "121 m²", "111 m²"], answer: 1, hint: "11 × 11", explain: "11² = 121 m²." },
    { q: "A square dome floor covers 144 m². How long is each side?", choices: ["12 m", "72 m", "14 m"], answer: 0, hint: "Which number times itself makes 144?", explain: "12 × 12 = 144, so each side is 12 m long." },
    { q: "What is √81?", choices: ["8", "40.5", "9"], answer: 2, hint: "Which number times itself makes 81?", explain: "9 × 9 = 81, so √81 = 9." },
    { q: "√50 is between which two whole numbers?", choices: ["7 and 8", "6 and 7", "8 and 9"], answer: 0, hint: "7² = 49 and 8² = 64.", explain: "49 < 50 < 64, so √50 is between 7 and 8 (just above 7)." },
    { q: "Why would a Mars base need bigger solar fields than a base on Earth?", choices: ["Mars has two Suns", "Mars gets less sunlight, because it is farther from the Sun", "Solar panels don't work on Mars"], answer: 1, hint: "Think about how far Mars is from the Sun.", explain: "Mars gets less than half the Earth's sunlight, so it needs more panels to make the same power." }
  ])
];

/* ------------------------------------------------------------ The Mars Museum (history) */

const MARS_HISTORY = [
  // ───────────── Terrace 1: Landing Plains (about age 6–7) ─────────────
  {
    id: 'h1-mars-red-star',
    subject: 'history',
    floor: 1,
    realm: 'mars',
    title: "The Red Wandering Star",
    topic: 'mars-in-the-sky',
    topicName: 'Mars in the night sky',
    blurb: "Watch the red planet wander among the stars with a sky-watcher from old Babylon.",
    reading: [
      { title: "A red light in the sky", emoji: '🔴', text: "Long before telescopes, people looked up at night and saw a bright light with a reddish-orange glow. It was the planet Mars!" },
      { title: "A star that wanders", emoji: '✨', text: "Most stars keep their places in the sky. But a few lights move slowly among the stars, night after night. The Greeks called them 'planetes', which means 'wanderers'. That's where our word 'planet' comes from." },
      { title: "Names for Mars", emoji: '📛', text: "The Romans named the red planet Mars. In Korea, China and Japan it is called the 'fire star', because of its fiery colour." },
      { title: "Writing it down", emoji: '📜', text: "In old Babylon, sky-watchers wrote down where the planets were on clay tablets. Their notes helped them see that the planets move in patterns." }
    ],
    dialogue: {
      npc: { name: "Iddin", role: "a sky-watcher in old Babylon", look: 'mesopotamia', portrayal: 'generic' },
      intro: "Greetings, little friend! Climb up on the roof with me. From up here we watch the lights of the night sky and write down everything they do.",
      topics: [
        { ask: "Which light is Mars?", answer: "Look for a bright light that hardly twinkles and glows reddish-orange, like a little ember. That is the red wanderer!" },
        { ask: "Why does it wander?", answer: "Night after night I mark where it is among the stars, and it moves! Today we know why: Mars and the Earth both travel round the Sun, so we see Mars change its place." },
        { ask: "What do you write on?", answer: "On soft clay tablets! I press little marks into the clay with a reed, and the tablet dries hard. Our records of the sky were kept for hundreds of years." },
        { ask: "Does Mars ever go backwards?", answer: "Yes! Sometimes it seems to slow down, loop backwards for a while and then go forwards again. That happens when the Earth overtakes Mars on our race round the Sun, like passing a slower runner." },
        { ask: "Why is Mars red?", answer: "We didn't know in my time. Today scientists know that Mars is covered in dust with lots of rusty iron in it, and rust is reddish!" }
      ],
      challenge: {
        q: "What does the old Greek word 'planetes' mean?",
        choices: ["Fire", "Wanderers", "Red"],
        answer: 1,
        explain: "'Planetes' means 'wanderers', because the planets wander among the stars."
      },
      farewell: "Look for the red wanderer on a clear night, and remember: every sky-watcher starts by just looking up!"
    },
    timeline: {
      title: "Watching the red planet",
      events: [
        { label: "Sky-watchers in Babylon write down where Mars is on clay tablets", year: -700, when: "about 2,700 years ago" },
        { label: "Greek sky-watchers call the moving lights 'planetes', wanderers", year: -400, when: "about 2,400 years ago" },
        { label: "Johannes Kepler shows that Mars goes round the Sun on an oval path", year: 1609, when: "1609" },
        { label: "Mars's two little moons are discovered", year: 1877, when: "1877" },
        { label: "Mariner 4 flies past Mars and sends the first close-up photos", year: 1965, when: "1965" }
      ]
    },
    artifact: {
      model: 'clay-tablet',
      name: "A sky-watcher's clay tablet",
      text: "Babylonian sky-watchers pressed wedge-shaped marks into clay to record where the Moon and the planets were. Many of these tablets are still kept in museums today."
    },
    quiz: [
      { q: "What colour does Mars look in the night sky?", choices: ["Green", "Reddish-orange", "Purple"], answer: 1, hint: "It's called the red planet.", explain: "Mars glows reddish-orange in the night sky." },
      { q: "Where does our word 'planet' come from?", choices: ["A Greek word meaning 'wanderers'", "A Roman king's name", "A kind of rock"], answer: 0, hint: "Planets wander among the stars.", explain: "'Planet' comes from the Greek word 'planetes', which means 'wanderers'." },
      { q: "What do people in Korea, China and Japan call Mars?", choices: ["The ice star", "The water star", "The fire star"], answer: 2, hint: "Think of its fiery colour.", explain: "In Korea, China and Japan, Mars is called the 'fire star'." },
      { q: "What did Babylonian sky-watchers write on?", choices: ["Computers", "Clay tablets", "Paper books"], answer: 1, hint: "They pressed marks into something soft that dried hard.", explain: "They pressed marks into clay tablets with a reed." },
      { q: "Why do the planets seem to move among the stars?", choices: ["They travel round the Sun, like the Earth", "The stars are falling", "Clouds push them"], answer: 0, hint: "Where do the Earth and Mars both go round?", explain: "The planets, like the Earth, travel round the Sun, so we see them change their places among the stars." }
    ]
  },
  {
    id: 'h1-mars-little-moons',
    subject: 'history',
    floor: 1,
    realm: 'mars',
    title: "Mars's Two Little Moons",
    topic: 'mars-moons',
    topicName: "Mars's moons",
    blurb: "Hunt for Mars's tiny moons with Angeline Stickney, who said: keep looking!",
    reading: [
      { title: "Two tiny moons", emoji: '🌑', text: "The Earth has one big Moon. Mars has two tiny ones, called Phobos and Deimos. They are lumpy, like potatoes!" },
      { title: "Hard to see", emoji: '🔭', text: "Mars's moons are small and dark, and very close to the bright planet. For a long time nobody could see them, even with telescopes." },
      { title: "Don't give up!", emoji: '💪', text: "In 1877 an American astronomer, Asaph Hall, searched night after night. He felt like giving up, but his wife, Angeline Stickney, told him to keep looking. Soon after, he found the first little moon!" },
      { title: "A crater for Angeline", emoji: '🕳️', text: "The biggest crater on Phobos is named Stickney, after Angeline. Her 'keep trying' helped make the discovery." }
    ],
    dialogue: {
      npc: { name: "Angeline Stickney", role: "a lover of mathematics who cheered on the search for Mars's moons", look: 'stargazer', portrayal: 'portrayal' },
      intro: "Hello there! I'm Angeline. My husband Asaph is an astronomer, and he has been hunting for moons around Mars. Shall I tell you how it went?",
      topics: [
        { ask: "Why were the moons so hard to find?", answer: "They are tiny and dark, and Mars shines so brightly beside them that its glare hides them. Asaph had to keep the bright planet just out of view in the big telescope to spot them." },
        { ask: "Did he want to give up?", answer: "Yes! After many nights he was tired and ready to stop. I told him to keep looking, just a little longer. And then he found the first little moon!" },
        { ask: "What are their names?", answer: "Phobos and Deimos. The names come from old Greek stories: they were the two helpers who rode along with Ares, the Greek name for Mars." },
        { ask: "How big are they?", answer: "Phobos is only about 22 kilometres across, and Deimos about 12. That's smaller than many cities!" },
        { ask: "Did anyone guess about them before?", answer: "Yes! Long before, the scientist Johannes Kepler guessed Mars might have two moons, and a storybook, 'Gulliver's Travels', imagined two moons of Mars too. Nobody knew for sure until 1877." }
      ],
      challenge: {
        q: "What did Angeline tell Asaph when he wanted to stop searching?",
        choices: ["Go to bed", "Keep looking", "Look at the Moon instead"],
        answer: 1,
        explain: "She told him to keep looking, and soon he found Mars's first moon."
      },
      farewell: "When something is hard, try one more time. You never know what you'll discover!"
    },
    timeline: {
      title: "Finding Mars's moons",
      events: [
        { label: "Johannes Kepler guesses that Mars might have two moons", year: 1610, when: "1610" },
        { label: "The story 'Gulliver's Travels' imagines two moons of Mars", year: 1726, when: "1726" },
        { label: "Asaph Hall finds Deimos and Phobos", year: 1877, when: "1877" },
        { label: "Mariner 9 takes the first close-up photos of Phobos and Deimos", year: 1971, when: "1971" },
        { label: "The Perseverance rover films Phobos passing in front of the Sun", year: 2022, when: "2022" }
      ]
    },
    artifact: {
      model: 'telescope',
      name: "A big brass telescope",
      text: "Asaph Hall used one of the biggest telescopes in the world at the time, at the US Naval Observatory in Washington. Its main lens was about 66 centimetres across."
    },
    quiz: [
      { q: "How many moons does Mars have?", choices: ["One", "Two", "Five"], answer: 1, hint: "Their names are Phobos and Deimos.", explain: "Mars has two little moons, Phobos and Deimos." },
      { q: "What are Mars's moons called?", choices: ["Phobos and Deimos", "Luna and Sol", "Spirit and Opportunity"], answer: 0, hint: "They are names from old Greek stories.", explain: "Mars's moons are called Phobos and Deimos." },
      { q: "What shape are Mars's moons?", choices: ["Perfectly round", "Flat like pancakes", "Lumpy, like potatoes"], answer: 2, hint: "They are too small to pull themselves round.", explain: "Phobos and Deimos are lumpy, like potatoes." },
      { q: "Who encouraged Asaph Hall to keep looking?", choices: ["His dog", "His wife, Angeline Stickney", "The king"], answer: 1, hint: "A crater on Phobos is named after her.", explain: "His wife, Angeline Stickney, told him to keep looking." },
      { q: "In which year were Mars's moons found?", choices: ["1877", "1977", "1609"], answer: 0, hint: "About 150 years ago.", explain: "Asaph Hall found Mars's moons in 1877." }
    ]
  },

  // ───────────── Terrace 2: Rover Ridge (about age 7–8) ─────────────
  {
    id: 'h2-mars-canals',
    subject: 'history',
    floor: 2,
    realm: 'mars',
    title: "The Canal Mix-Up",
    topic: 'mars-canals',
    topicName: 'The Mars canal mix-up',
    blurb: "Map Mars with Giovanni Schiaparelli, and find out how one word started a famous mix-up.",
    reading: [
      { title: "Drawing Mars", emoji: '🗺️', text: "In 1877 the Italian astronomer Giovanni Schiaparelli made careful maps of Mars through his telescope. He drew dark patches and long, thin lines." },
      { title: "Channels or canals?", emoji: '🔤', text: "He called the lines 'canali', the Italian word for channels. But in English it was often turned into 'canals', which sounds like something somebody built!" },
      { title: "Martian builders?", emoji: '🏗️', text: "An American named Percival Lowell built an observatory to study Mars. He believed Martians had dug the canals to carry water, and lots of people loved the idea." },
      { title: "A closer look", emoji: '🛰️', text: "When spacecraft finally flew close to Mars, there were no canals at all. The lines were a trick of blurry telescopes and tired eyes. Science fixes its mistakes by looking again!" }
    ],
    dialogue: {
      npc: { name: "Giovanni Schiaparelli", role: "an Italian astronomer who mapped Mars", look: 'stargazer', portrayal: 'portrayal' },
      intro: "Buonasera! I am Giovanni. Tonight Mars is close and bright, so I am drawing my map. Would you like to see?",
      topics: [
        { ask: "What do you see on Mars?", answer: "Bright orange lands, darker patches and, sometimes, long thin lines. When the air is still, I sketch quickly, before the view goes wobbly again." },
        { ask: "What are the 'canali'?", answer: "'Canali' just means channels. I named many of them after rivers and places from old stories. I never said that anybody dug them!" },
        { ask: "Why did people think of Martians?", answer: "When my word was turned into 'canals', it sounded like something built, like the canals of Venice! Some people, like Percival Lowell, imagined Martians building them." },
        { ask: "Were the canals real?", answer: "Telescopes in my time showed tiny, shimmering pictures. Later, sharper telescopes and spacecraft showed no canals at all. It's fine to make mistakes, as long as we keep checking." },
        { ask: "Are your names still used?", answer: "Yes! Some names from my map, like Syrtis Major and Elysium, are still used on maps of Mars today." }
      ],
      challenge: {
        q: "What does the Italian word 'canali' mean?",
        choices: ["Channels", "Martians", "Mountains"],
        answer: 0,
        explain: "'Canali' means channels, but in English it was often turned into 'canals'."
      },
      farewell: "Draw what you see, share it, and let others check it. That's how we get closer to the truth. Arrivederci!"
    },
    timeline: {
      title: "Mapping Mars",
      events: [
        { label: "Christiaan Huygens sketches a dark marking on Mars", year: 1659, when: "1659" },
        { label: "Giovanni Schiaparelli maps Mars and names its 'canali'", year: 1877, when: "1877" },
        { label: "Percival Lowell builds an observatory in Arizona to study Mars", year: 1894, when: "1894" },
        { label: "Mariner 4 flies past Mars and sees craters, not canals", year: 1965, when: "1965" },
        { label: "Mariner 9 starts mapping the whole planet from orbit", year: 1971, when: "1971" }
      ]
    },
    artifact: {
      model: 'mars-globe',
      name: "An old globe of Mars",
      text: "After Schiaparelli's maps, globe makers made globes of Mars with dark patches, a white polar cap and thin lines for the canals. Today they remind us of a famous mix-up."
    },
    quiz: [
      { q: "Who made careful maps of Mars in 1877?", choices: ["Neil Armstrong", "Giovanni Schiaparelli", "Galileo"], answer: 1, hint: "An Italian astronomer.", explain: "Giovanni Schiaparelli mapped Mars in 1877." },
      { q: "What does 'canali' mean in Italian?", choices: ["Channels", "Castles", "Craters"], answer: 0, hint: "It doesn't mean something built.", explain: "'Canali' means channels." },
      { q: "What did Percival Lowell believe?", choices: ["Mars was made of cheese", "Mars had no air at all", "Martians had dug canals to carry water"], answer: 2, hint: "He imagined builders on Mars.", explain: "Lowell believed Martians had dug canals to carry water." },
      { q: "What did spacecraft find when they flew close to Mars?", choices: ["Martian cities", "No canals at all", "Rivers full of fish"], answer: 1, hint: "The lines were a trick of blurry telescopes.", explain: "Spacecraft found no canals at all, only craters, canyons and volcanoes." },
      { q: "What does this story teach us about science?", choices: ["Scientists never make mistakes", "Never use a telescope", "Science fixes mistakes by checking again"], answer: 2, hint: "What happened when people looked again?", explain: "Science fixes its mistakes by looking again with better tools." }
    ]
  },
  {
    id: 'h2-mars-mariner4',
    subject: 'history',
    floor: 2,
    realm: 'mars',
    title: "Mariner 4's First Close Look",
    topic: 'mariner-4',
    topicName: 'Mariner 4',
    blurb: "Colour in the first close-up picture of Mars by hand, number by number, with the Mariner 4 team.",
    reading: [
      { title: "A visit at last", emoji: '🛰️', text: "In 1965 a small American spacecraft called Mariner 4 flew past Mars. It was the first time anything from Earth had seen Mars up close." },
      { title: "Twenty-one pictures", emoji: '📷', text: "Mariner 4 took 21 pictures as it zoomed by. It sent them home slowly by radio, as long lists of numbers, a little at a time." },
      { title: "Colouring by numbers", emoji: '🖍️', text: "The team was too excited to wait for the computers. They pinned up strips of the numbers and coloured them in by hand with pastel crayons, like a colour-by-numbers picture!" },
      { title: "Craters!", emoji: '🕳️', text: "The pictures showed a dry world covered in craters, a bit like our Moon. There were no canals and no cities." }
    ],
    dialogue: {
      npc: { name: "Rita", role: "an engineer on the Mariner 4 team", look: 'mission', portrayal: 'generic' },
      intro: "Hi! I'm Rita, and I work on the Mariner 4 team. The pictures are coming in from Mars right now, number by number! Want to help?",
      topics: [
        { ask: "How can a picture come as numbers?", answer: "The camera splits each picture into tiny dots. Each dot gets a number: a small number for dark, a big number for bright. The radio sends the numbers home, one after another." },
        { ask: "Why colour it by hand?", answer: "The computer was going to take hours to draw it. We couldn't wait! So we stuck the strips of numbers on a board and coloured each number with a matching crayon. Little by little, a picture of Mars appeared." },
        { ask: "How far away is Mariner 4?", answer: "When it passed Mars it was more than 200 million kilometres from Earth. Even its radio messages took about 12 minutes to reach us." },
        { ask: "What did the pictures show?", answer: "Craters! Mars looked dry and old, a bit like the Moon. Many people were surprised, because they had hoped for canals or plants." },
        { ask: "Was it the first try?", answer: "No. Earlier spacecraft sent towards Mars didn't make it, including Mariner 4's twin, Mariner 3. Engineers learned from every try and kept going." }
      ],
      challenge: {
        q: "How did the team see the first picture quickly?",
        choices: ["They coloured in the numbers by hand", "They flew to Mars", "They used a magic mirror"],
        answer: 0,
        explain: "They coloured the strips of numbers by hand with crayons, like a colour-by-numbers picture."
      },
      farewell: "Thanks for helping me colour! Remember: every picture from space starts as a list of numbers."
    },
    timeline: {
      title: "The first visits to Mars",
      events: [
        { label: "The first spacecraft sent towards Mars don't make it, but engineers learn a lot", year: 1960, when: "1960" },
        { label: "Mariner 4 sets off for Mars", year: 1964, when: "1964" },
        { label: "Mariner 4 flies past Mars and sends 21 pictures", year: 1965, when: "1965" },
        { label: "Mariners 6 and 7 fly past and take many more pictures", year: 1969, when: "1969" },
        { label: "Mariner 9 becomes the first spacecraft to go round another planet", year: 1971, when: "1971" }
      ]
    },
    artifact: {
      model: 'pastels',
      name: "The hand-coloured first picture",
      text: "The real hand-coloured picture of Mars is made of paper strips covered in numbers and pastel colours. It is still kept, framed, at the laboratory that built Mariner 4."
    },
    quiz: [
      { q: "What was Mariner 4?", choices: ["A rover that drove on Mars", "A spacecraft that flew past Mars", "An astronaut"], answer: 1, hint: "It zoomed by and took pictures.", explain: "Mariner 4 was a spacecraft that flew past Mars and took pictures." },
      { q: "In which year did Mariner 4 fly past Mars?", choices: ["1965", "1865", "2015"], answer: 0, hint: "About 60 years ago.", explain: "Mariner 4 flew past Mars in 1965." },
      { q: "How did Mariner 4 send its pictures home?", choices: ["By post", "In a little rocket", "By radio, as numbers"], answer: 2, hint: "A small number for dark, a big number for bright.", explain: "It sent its pictures home by radio, as long lists of numbers." },
      { q: "What did the pictures show?", choices: ["Cities and canals", "Craters on a dry world", "Oceans and forests"], answer: 1, hint: "A bit like our Moon.", explain: "The pictures showed a dry world covered in craters." },
      { q: "Why did the team colour in the numbers by hand?", choices: ["They were too excited to wait for the computer", "The crayons were magic", "It was a school project"], answer: 0, hint: "The computer was going to take hours.", explain: "They were too excited to wait, so they coloured the numbers in by hand." }
    ]
  },

  // ───────────── Terrace 3: Ice Ledge (about age 8–9) ─────────────
  {
    id: 'h3-mars-viking',
    subject: 'history',
    floor: 3,
    realm: 'mars',
    title: "The Viking Landers",
    topic: 'viking-landers',
    topicName: 'The Viking landers',
    blurb: "Watch the very first photo from Mars's surface arrive, line by line, with the Viking team.",
    reading: [
      { title: "Two landers", emoji: '🛬', text: "In 1976 two American spacecraft, Viking 1 and Viking 2, landed on Mars. They were the first landers to work on Mars for a long time." },
      { title: "The first photo from the ground", emoji: '📷', text: "Viking 1 took the first photo from Mars's surface: a picture of its own footpad on the rocky, dusty ground." },
      { title: "A butterscotch sky", emoji: '🌅', text: "The Viking pictures showed rusty-red rocks and a pinkish, butterscotch sky, because fine red dust floats in Mars's air." },
      { title: "Looking for life", emoji: '🔬', text: "A scoop on a robot arm dug up soil, and little laboratories inside tested it for signs of tiny living things. They found interesting chemistry, but no clear sign of life." }
    ],
    dialogue: {
      npc: { name: "Dr. Lena", role: "a scientist on the Viking lander team", look: 'scientist', portrayal: 'generic' },
      intro: "Welcome to mission control! I'm Dr. Lena. Viking 1 has just landed on Mars, and the very first picture is arriving line by line. Look!",
      topics: [
        { ask: "What is the first picture of?", answer: "Its own foot! We wanted to see the ground right where it landed, to check whether the footpad had sunk into soft dust. It hadn't: the ground was firm and rocky." },
        { ask: "How did the landers get down?", answer: "First a heat shield slowed them in the thin air, then a parachute opened, and last of all little rocket engines set them gently on the ground." },
        { ask: "What did the scoop do?", answer: "The robot arm reached out, scooped up soil and dropped it into tiny laboratories inside the lander to be tested. It was like a science kit on Mars!" },
        { ask: "Did they find life?", answer: "Not clearly. Some tests fizzed in surprising ways, but most scientists now think that was the soil's chemistry, not living things. The question is still being studied!" },
        { ask: "How long did they work?", answer: "Much longer than planned! Viking 1's lander kept sending weather reports and pictures for more than six years, until 1982." }
      ],
      challenge: {
        q: "What was the very first photo taken on Mars's surface?",
        choices: ["A Martian", "The lander's own footpad", "A sunset"],
        answer: 1,
        explain: "Viking 1's first photo showed its own footpad on the rocky ground."
      },
      farewell: "Every rover that came after stood on Viking's shoulders. Thanks for joining the team!"
    },
    timeline: {
      title: "Landing on Mars",
      events: [
        { label: "The Soviet Mars 3 lander touches down, but goes quiet after a few seconds", year: 1971, when: "1971" },
        { label: "Viking 1 and Viking 2 set off for Mars", year: 1975, when: "1975" },
        { label: "Viking 1 lands and sends the first photo from Mars's surface", year: 1976, when: "1976" },
        { label: "Viking 1's lander sends its last message, after more than six years", year: 1982, when: "1982" },
        { label: "Mars Pathfinder lands, bringing the first Mars rover", year: 1997, when: "1997" }
      ]
    },
    artifact: {
      model: 'viking-lander',
      name: "A model of a Viking lander",
      text: "A Viking lander stood on three legs, about as tall as a grown-up. It had two cameras, a weather station, a dish for talking to Earth and a long robot arm with a scoop."
    },
    quiz: [
      { q: "In which year did the Viking landers reach Mars?", choices: ["1976", "1576", "2016"], answer: 0, hint: "About 50 years ago.", explain: "Viking 1 and Viking 2 landed on Mars in 1976." },
      { q: "What colour did the sky look in Viking's photos?", choices: ["Bright blue", "Green", "Pinkish butterscotch, from the dust"], answer: 2, hint: "Fine red dust floats in the air.", explain: "The sky looked pinkish butterscotch, because of the fine red dust in the air." },
      { q: "What did the scoop on the robot arm do?", choices: ["Wave at Earth", "Dig up soil to test it", "Collect water from a lake"], answer: 1, hint: "Think of a science kit on Mars.", explain: "The scoop dug up soil and dropped it into little laboratories to be tested." },
      { q: "Did Viking find clear signs of life?", choices: ["Yes, lots of animals", "No, but the soil's chemistry was interesting"], answer: 1, hint: "The tests fizzed, but not because of living things.", explain: "Viking found no clear sign of life, but the soil's chemistry surprised scientists." },
      { q: "How did the landers slow down to land?", choices: ["A heat shield, a parachute and little rockets", "They bounced on springs", "They glided like birds"], answer: 0, hint: "Three steps, one after another.", explain: "A heat shield, then a parachute, then little rocket engines slowed them down." }
    ]
  },
  {
    id: 'h3-mars-sojourner',
    subject: 'history',
    floor: 3,
    realm: 'mars',
    title: "Sojourner, the Little Rover",
    topic: 'sojourner',
    topicName: 'Sojourner and Pathfinder',
    blurb: "Bounce onto Mars in a ball of airbags, and drive the very first Mars rover.",
    reading: [
      { title: "A bouncy landing", emoji: '🎈', text: "In 1997 Mars Pathfinder landed wrapped in giant airbags, like a bunch of balloons. It bounced across the ground many times before it rolled to a stop!" },
      { title: "The first Mars rover", emoji: '🚙', text: "Out rolled Sojourner, the very first rover on Mars. It was about the size of a microwave oven and had six wheels." },
      { title: "Named by a girl", emoji: '✏️', text: "Sojourner was named after Sojourner Truth, a brave American woman who spoke up for fairness. The name was chosen in a contest won by a 12-year-old girl, Valerie Ambroise." },
      { title: "Small but mighty", emoji: '💪', text: "It was planned to work for about a week, but it kept going for nearly three months, studying rocks with fun names like Barnacle Bill and Yogi." }
    ],
    dialogue: {
      npc: { name: "Ana", role: "a rover driver on the Pathfinder team", look: 'roverteam', portrayal: 'generic' },
      intro: "Hi, I'm Ana, and I help drive Sojourner! It's very small, very slow and very brave. Would you like to see how we steer a rover on another planet?",
      topics: [
        { ask: "How do you steer it from Earth?", answer: "We can't use a joystick, because messages take minutes to travel to Mars. So we look at 3D pictures, plan each move and send the whole plan at once. Then we wait to see what happened!" },
        { ask: "Why the airbags?", answer: "Airbags were a clever, light way to land. The lander dropped inside them, bounced along like a beach ball, and then the bags were pulled in so it could open up like a flower." },
        { ask: "What did Sojourner study?", answer: "It drove up to rocks and used a special tool to find out what they were made of. The team gave the rocks fun names, like Barnacle Bill, Yogi and Scooby-Doo." },
        { ask: "Who was Sojourner Truth?", answer: "She was a brave woman born more than 200 years ago in the United States. She had been enslaved, won her freedom, and travelled around speaking up for fairness and for women's rights." },
        { ask: "How fast does it go?", answer: "Very, very slowly: about one centimetre a second at most. Careful is better than fast when you're the only rover on a whole planet!" }
      ],
      challenge: {
        q: "How did Mars Pathfinder land?",
        choices: ["On a runway", "Bouncing inside giant airbags", "Hanging from a balloon"],
        answer: 1,
        explain: "It bounced across the ground inside giant airbags until it rolled to a stop."
      },
      farewell: "Remember: you don't have to be big to do something brand new. Just be careful, curious and brave!"
    },
    timeline: {
      title: "The first Mars rovers",
      events: [
        { label: "The Viking landers study Mars, but they can't move around", year: 1976, when: "1976" },
        { label: "Mars Pathfinder and Sojourner set off for Mars", year: 1996, when: "1996" },
        { label: "Sojourner becomes the first rover to drive on Mars", year: 1997, when: "1997" },
        { label: "The twin rovers Spirit and Opportunity land", year: 2004, when: "2004" },
        { label: "Curiosity, a rover the size of a small car, lands", year: 2012, when: "2012" }
      ]
    },
    artifact: {
      model: 'airbag-lander',
      name: "The airbag lander",
      text: "Pathfinder's airbags were clusters of strong fabric balloons around the lander. After landing they were pulled in, and the lander opened its three petal-shaped sides so Sojourner could roll down a ramp."
    },
    quiz: [
      { q: "What was special about Sojourner?", choices: ["It was the first rover to drive on Mars", "It was the first person on Mars", "It was one of Mars's moons"], answer: 0, hint: "It had six wheels.", explain: "Sojourner was the first rover ever to drive on Mars, in 1997." },
      { q: "About how big was Sojourner?", choices: ["The size of a bus", "The size of a microwave oven", "The size of a pea"], answer: 1, hint: "Small enough to fit on a kitchen counter.", explain: "Sojourner was about the size of a microwave oven." },
      { q: "Who was the rover named after?", choices: ["A famous chef", "A Roman god", "Sojourner Truth, who spoke up for fairness"], answer: 2, hint: "A brave American woman.", explain: "It was named after Sojourner Truth, who spoke up for fairness and women's rights." },
      { q: "Why can't drivers steer a Mars rover with a joystick?", choices: ["Messages take minutes to reach Mars", "Rovers have no wheels", "Joysticks don't exist"], answer: 0, hint: "Mars is very far away.", explain: "Messages take minutes to reach Mars, so drivers send a whole plan at once." },
      { q: "How long did Sojourner keep working?", choices: ["One hour", "Nearly three months", "100 years"], answer: 1, hint: "Much longer than the planned week.", explain: "It was planned for about a week, but kept going for nearly three months." }
    ]
  },

  // ───────────── Terrace 4: Greenhouse Terrace (about age 9–10) ─────────────
  {
    id: 'h4-mars-twin-rovers',
    subject: 'history',
    floor: 4,
    realm: 'mars',
    title: "Spirit and Opportunity",
    topic: 'twin-rovers',
    topicName: 'The twin rovers',
    blurb: "Drive the twin rovers on Mars time, and follow Opportunity's marathon across the red planet.",
    reading: [
      { title: "Twins on Mars", emoji: '👯', text: "In January 2004 two rovers called Spirit and Opportunity landed on opposite sides of Mars. They were twins: the same design, sent to explore different places." },
      { title: "Ninety sols… or more!", emoji: '📅', text: "Each rover was planned to work for about 90 sols. Spirit kept going for about six years, and Opportunity for nearly 15 years!" },
      { title: "Clues of water", emoji: '💧', text: "Opportunity found tiny round pebbles nicknamed 'blueberries' and rocks that could only have formed in water. Long ago, Mars was much wetter!" },
      { title: "A helpful breeze", emoji: '🌪️', text: "Dust covered the rovers' solar panels and made them weak. Then gusts of wind and little dust devils blew the panels clean, and the rovers perked up again!" }
    ],
    dialogue: {
      npc: { name: "Theo", role: "a driver for the twin rovers", look: 'roverteam', portrayal: 'generic' },
      intro: "Good morning, Mars-time! I'm Theo. I drive Spirit and Opportunity from here on Earth. Every day we wake up to new pictures from the twins!",
      topics: [
        { ask: "Who named the rovers?", answer: "A nine-year-old girl named Sofi Collis won a naming contest. She wrote that she was thankful for the 'spirit' and the 'opportunity' to follow her dreams." },
        { ask: "What is Mars time?", answer: "A sol is about 40 minutes longer than an Earth day. At first our team lived on Mars time, so every day we started work a bit later. Some of us even wore watches set to Mars!" },
        { ask: "Did they ever get stuck?", answer: "Yes! In 2009 Spirit got stuck in soft sand. We tried for months to free it. In the end it stayed put and worked as a science station until 2010." },
        { ask: "How far did Opportunity drive?", answer: "More than 45 kilometres, farther than a marathon! That was a record for driving on another world." },
        { ask: "How did Opportunity's mission end?", answer: "In 2018 a giant dust storm covered the whole planet and blocked the sunlight Opportunity needed. It went to sleep and didn't wake again, after nearly 15 amazing years." }
      ],
      challenge: {
        q: "How long were the twin rovers planned to work?",
        choices: ["About 90 sols", "About 90 years", "About 9 minutes"],
        answer: 0,
        explain: "They were planned for about 90 sols, but Opportunity kept going for nearly 15 years!"
      },
      farewell: "Two little rovers, one big adventure. Keep exploring, and don't forget your Mars watch!"
    },
    timeline: {
      title: "The twin rovers",
      events: [
        { label: "Spirit and Opportunity set off for Mars", year: 2003, when: "2003" },
        { label: "Both rovers land, three weeks apart", year: 2004, when: "2004" },
        { label: "Spirit gets stuck in soft sand", year: 2009, when: "2009" },
        { label: "Opportunity drives farther than a marathon", year: 2015, when: "2015" },
        { label: "A planet-wide dust storm ends Opportunity's long journey", year: 2018, when: "2018" }
      ]
    },
    artifact: {
      model: 'twin-rover',
      name: "A model of a twin rover",
      text: "Spirit and Opportunity were each about the size of a golf cart, with six wheels, a wide deck of solar panels and a tall mast with camera eyes. A long arm carried a microscope camera and a rock grinder."
    },
    quiz: [
      { q: "What were the twin rovers called?", choices: ["Spirit and Opportunity", "Phobos and Deimos", "Viking and Mariner"], answer: 0, hint: "Names chosen by a nine-year-old girl.", explain: "The twin rovers were called Spirit and Opportunity." },
      { q: "What did the 'blueberries' and rocks show?", choices: ["Mars has fruit trees", "Mars was once much wetter", "Mars is made of ice"], answer: 1, hint: "They could only have formed in water.", explain: "They showed that, long ago, Mars was much wetter." },
      { q: "What cleaned the dust off the rovers' solar panels?", choices: ["Rain", "Astronauts with brooms", "Gusts of wind and dust devils"], answer: 2, hint: "Little whirlwinds on Mars.", explain: "Gusts of wind and dust devils blew the panels clean." },
      { q: "How far did Opportunity drive?", choices: ["About 45 metres", "More than 45 kilometres", "Round Mars ten times"], answer: 1, hint: "Farther than a marathon.", explain: "Opportunity drove more than 45 kilometres, farther than a marathon." },
      { q: "Who named the rovers?", choices: ["A nine-year-old girl, in a contest", "A king", "The rovers named themselves"], answer: 0, hint: "Her name was Sofi.", explain: "Sofi Collis, aged nine, won a contest to name the rovers." }
    ]
  },
  {
    id: 'h4-mars-mangalyaan',
    subject: 'history',
    floor: 4,
    realm: 'mars',
    title: "Mangalyaan: India Reaches Mars",
    topic: 'mangalyaan',
    topicName: "India's Mars Orbiter Mission",
    blurb: "Fly to Mars with India's Mars craft, which made it on its very first try.",
    reading: [
      { title: "A Mars craft", emoji: '🚀', text: "In 2013 India launched its first spacecraft to Mars. Its official name was the Mars Orbiter Mission, but people called it Mangalyaan, which means 'Mars craft' in Hindi." },
      { title: "First try!", emoji: '🎉', text: "In September 2014 it reached Mars and began circling it. India became the first country in Asia to reach Mars orbit, and did it on its very first try!" },
      { title: "Clever and thrifty", emoji: '💡', text: "The team kept the mission simple and careful. The whole trip cost less than some big space films cost to make!" },
      { title: "Pictures of a whole planet", emoji: '🌍', text: "Mangalyaan carried a colour camera that took pictures of the whole of Mars at once, with its dust storms, its ice caps and its tiny moons." }
    ],
    dialogue: {
      npc: { name: "Dr. Meera", role: "a scientist on India's Mars Orbiter Mission", look: 'mission', portrayal: 'generic' },
      intro: "Namaste! I'm Dr. Meera. Our little spacecraft has travelled for ten months, and tonight it must fire its engine to slow down at Mars. Fingers crossed!",
      topics: [
        { ask: "Why fire the engine at Mars?", answer: "Our spacecraft is zooming very fast. If it doesn't slow down, it will fly straight past Mars. The engine firing slows it just enough for Mars's gravity to catch it in an orbit." },
        { ask: "How did you save money?", answer: "We planned carefully and reused ideas that already worked. Our rocket put the craft in an orbit round the Earth, and the spacecraft raised its orbit bit by bit before heading off to Mars." },
        { ask: "What did it study?", answer: "Its camera took pictures of the whole planet, and other instruments studied Mars's thin air. It even snapped pictures of the little moon Phobos." },
        { ask: "How long did it last?", answer: "It was planned for six months, but it kept working for about eight years! Even a small mission can go a long way." },
        { ask: "Who built it?", answer: "A big team at ISRO, India's space agency, including many women scientists and engineers. A photo of some of them celebrating went all round the world!" }
      ],
      challenge: {
        q: "What does 'Mangalyaan' mean?",
        choices: ["Red rock", "Mars craft", "Fast bird"],
        answer: 1,
        explain: "In Hindi, 'Mangal' means Mars and 'yaan' means craft or vehicle."
      },
      farewell: "Big dreams, careful plans! Keep looking up at the red planet."
    },
    timeline: {
      title: "India and Mars",
      events: [
        { label: "India's space agency, ISRO, is founded", year: 1969, when: "1969" },
        { label: "India's first Moon mission, Chandrayaan-1, launches", year: 2008, when: "2008" },
        { label: "Mangalyaan launches towards Mars", year: 2013, when: "2013" },
        { label: "Mangalyaan reaches Mars orbit on its first try", year: 2014, when: "2014" },
        { label: "Mangalyaan's mission ends after about eight years", year: 2022, when: "2022" }
      ]
    },
    artifact: {
      model: 'mars-orbiter',
      name: "A model of Mangalyaan",
      text: "Mangalyaan was a gold-wrapped box about as tall as a grown-up, with a wing of solar panels and a big dish antenna for talking to Earth."
    },
    quiz: [
      { q: "Which country launched Mangalyaan?", choices: ["India", "Brazil", "Canada"], answer: 0, hint: "Its name is a Hindi word.", explain: "India launched Mangalyaan in 2013." },
      { q: "What was special about Mangalyaan reaching Mars?", choices: ["It landed on Olympus Mons", "It was India's first try, and it worked", "It carried astronauts"], answer: 1, hint: "Many first tries at Mars had failed.", explain: "India reached Mars orbit on its very first try." },
      { q: "Why did the spacecraft fire its engine when it reached Mars?", choices: ["To speed up and escape", "To make a loud noise", "To slow down so Mars's gravity could catch it"], answer: 2, hint: "Too fast, and it would fly straight past.", explain: "It slowed down so Mars's gravity could catch it in an orbit." },
      { q: "How long was Mangalyaan planned to work, and how long did it last?", choices: ["Planned 6 months, lasted about 8 years", "Planned 8 years, lasted 6 months", "Planned 1 day, lasted 1 day"], answer: 0, hint: "It went on much longer than planned.", explain: "It was planned for six months but kept working for about eight years." },
      { q: "What did Mangalyaan's camera take pictures of?", choices: ["Only the Earth", "The whole of Mars, and its moon Phobos", "The bottom of the sea"], answer: 1, hint: "A whole planet at once.", explain: "Its camera pictured the whole of Mars, and the little moon Phobos too." }
    ]
  },

  // ───────────── Terrace 5: Weather Heights (about age 10–11) ─────────────
  {
    id: 'h5-mars-curiosity',
    subject: 'history',
    floor: 5,
    realm: 'mars',
    title: "Curiosity and the Sky Crane",
    topic: 'curiosity',
    topicName: 'The Curiosity rover',
    blurb: "Hold your breath in mission control as a sky crane lowers Curiosity onto Mars.",
    reading: [
      { title: "A car-sized rover", emoji: '🚙', text: "Curiosity is a rover about the size of a small car. It landed in Gale Crater on Mars in August 2012 and then spent years climbing a mountain called Mount Sharp." },
      { title: "The sky crane", emoji: '🏗️', text: "Curiosity was too heavy for airbags. So a rocket-powered 'sky crane' hovered above the ground, lowered the rover gently on cables, and then flew away." },
      { title: "Seven minutes on its own", emoji: '⏱️', text: "Messages take many minutes to travel between Mars and the Earth, so the landing had to happen all by itself, in about seven minutes, with nobody steering. The team could only wait and hope!" },
      { title: "An old lake", emoji: '💧', text: "Curiosity found that Gale Crater once held a lake, with water that tiny living things could have lived in, if there were any. That was a big discovery!" }
    ],
    dialogue: {
      npc: { name: "Kiri", role: "an engineer on the Curiosity landing team", look: 'mission', portrayal: 'generic' },
      intro: "Hi, I'm Kiri! Tonight Curiosity lands on Mars. Everyone in mission control is holding their breath. Come and sit with us!",
      topics: [
        { ask: "Why a sky crane?", answer: "Curiosity weighs about as much as a small car, too heavy to bounce on airbags. The sky crane lowered it on cables so its wheels touched down softly, and then the crane flew off to land far away." },
        { ask: "Why can't you steer the landing?", answer: "That night, radio messages took about 14 minutes to travel from Mars to Earth. The landing took about seven minutes, so by the time we heard it had started, it was already over! The spacecraft had to do it all by itself." },
        { ask: "Who named Curiosity?", answer: "A 12-year-old student, Clara Ma, won a naming contest. She wrote that curiosity is like a flame that burns in everyone's mind." },
        { ask: "What are the holes in the wheels for?", answer: "The treads have little holes in a pattern that spells 'JPL', our lab's initials, in Morse code. As Curiosity drives, it stamps the pattern into the dust, so we can measure how far it has really moved!" },
        { ask: "Does Curiosity have a birthday?", answer: "Yes! On its first anniversary in 2013, it hummed the 'Happy Birthday' tune by vibrating one of its instruments. Just once, though: the scientists need it for work!" }
      ],
      challenge: {
        q: "How did Curiosity reach the ground?",
        choices: ["A sky crane lowered it on cables", "It bounced on airbags", "An astronaut carried it"],
        answer: 0,
        explain: "A rocket-powered sky crane lowered Curiosity gently on cables, then flew away."
      },
      farewell: "Stay curious! It's the flame that keeps every explorer going."
    },
    timeline: {
      title: "Curiosity's journey",
      events: [
        { label: "A 12-year-old's essay gives the rover its name, Curiosity", year: 2009, when: "2009" },
        { label: "Curiosity launches from Florida", year: 2011, when: "2011" },
        { label: "Curiosity lands in Gale Crater, lowered by a sky crane", year: 2012, when: "2012" },
        { label: "Curiosity finds that Gale Crater once held a lake fit for tiny life", year: 2013, when: "2013" },
        { label: "Curiosity reaches the foot of Mount Sharp and starts to climb", year: 2014, when: "2014" }
      ]
    },
    artifact: {
      model: 'rover-wheel',
      name: "Curiosity's wheel",
      text: "Each of Curiosity's six wheels is about half a metre across, made of thin aluminium with zigzag treads. The holes in the treads spell 'JPL' in Morse code."
    },
    quiz: [
      { q: "About how big is Curiosity?", choices: ["The size of a small car", "The size of a shoebox", "The size of a house"], answer: 0, hint: "Too heavy for airbags.", explain: "Curiosity is about the size of a small car." },
      { q: "What lowered Curiosity to the ground?", choices: ["A parachute on its own", "A rocket-powered sky crane", "A giant net"], answer: 1, hint: "It hovered and let down cables.", explain: "A rocket-powered sky crane lowered Curiosity on cables." },
      { q: "Why did the landing have to happen all by itself?", choices: ["The team was asleep", "Mars has no ground", "Messages take many minutes to travel between Mars and Earth"], answer: 2, hint: "The landing took about seven minutes.", explain: "Messages took about 14 minutes each way, so nobody could steer the landing from Earth." },
      { q: "What did Curiosity discover in Gale Crater?", choices: ["A Martian city", "It once held a lake of water", "A frozen ocean"], answer: 1, hint: "Water that tiny living things could have used.", explain: "Curiosity found that Gale Crater once held a lake." },
      { q: "What do the holes in Curiosity's wheels spell in Morse code?", choices: ["JPL", "MARS", "HI"], answer: 0, hint: "The initials of the lab that built it.", explain: "The holes spell 'JPL', the initials of the lab that built Curiosity." }
    ]
  },
  {
    id: 'h5-mars-hope',
    subject: 'history',
    floor: 5,
    realm: 'mars',
    title: "Hope Watches Mars's Weather",
    topic: 'hope-orbiter',
    topicName: 'The Hope Mars orbiter',
    blurb: "Watch dust storms swirl across a whole planet with the team of the Hope orbiter.",
    reading: [
      { title: "Hope from the Emirates", emoji: '🛰️', text: "In February 2021 a spacecraft named Hope reached Mars. It was built by the United Arab Emirates, and it was the first trip to another planet by an Arab country." },
      { title: "A weather satellite for Mars", emoji: '🌦️', text: "Hope circles high above Mars and watches its weather: dust storms, clouds and thin air, at every time of day and in every season." },
      { title: "The whole planet at once", emoji: '🌍', text: "Hope's orbit is so high and wide that it can see the whole of Mars in one go, a bit like a weather satellite looking at the whole Earth." },
      { title: "Young scientists", emoji: '👩‍🔬', text: "Many of the people who built and run Hope are young engineers and scientists. The mission was named Hope to inspire young people across the Arab world." }
    ],
    dialogue: {
      npc: { name: "Dr. Noura", role: "a scientist on the Hope Mars mission", look: 'scientist', portrayal: 'generic' },
      intro: "Marhaba! I'm Dr. Noura. Our spacecraft Hope is watching the weather on Mars today. Shall we look at the dust storms together?",
      topics: [
        { ask: "Why study Mars's weather?", answer: "Mars has winds, clouds and huge dust storms. Watching them helps us understand how Mars lost most of its air and water long ago, and helps future explorers plan for the weather." },
        { ask: "How did Hope get to Mars?", answer: "It launched in July 2020 on a rocket from Japan, then travelled for about seven months. Then it fired its engines to slow down and be caught by Mars's gravity." },
        { ask: "What can it see?", answer: "Its instruments see Mars in kinds of light our eyes can't see, like ultraviolet and infrared. That shows us dust, ice clouds and gases high in the air." },
        { ask: "Why the name Hope?", answer: "Its Arabic name, Al Amal, means hope. The team wanted to show young people that big dreams can come true with hard work." },
        { ask: "Who else arrived at Mars that month?", answer: "Three missions arrived in February 2021: Hope, China's Tianwen-1 and NASA's Perseverance rover. Mars was very busy!" }
      ],
      challenge: {
        q: "What does the Hope spacecraft mainly study?",
        choices: ["Mars's weather and air", "Mars's oceans", "Martian animals"],
        answer: 0,
        explain: "Hope watches Mars's weather: dust storms, clouds and thin air."
      },
      farewell: "Never stop hoping, and never stop learning. Ma'a salama!"
    },
    timeline: {
      title: "Watching Mars from above",
      events: [
        { label: "Mariner 9 becomes the first spacecraft to orbit Mars", year: 1971, when: "1971" },
        { label: "Europe's Mars Express arrives at Mars", year: 2003, when: "2003" },
        { label: "India's Mangalyaan reaches Mars orbit", year: 2014, when: "2014" },
        { label: "Hope launches from Japan", year: 2020, when: "2020" },
        { label: "Hope reaches Mars and starts watching its weather", year: 2021, when: "2021" }
      ]
    },
    artifact: {
      model: 'hope-probe',
      name: "A model of the Hope orbiter",
      text: "Hope is a six-sided spacecraft about the size of a small car, with three solar panels and a big dish antenna. Its three science instruments look at Mars in different kinds of light."
    },
    quiz: [
      { q: "Which country built the Hope spacecraft?", choices: ["The United Arab Emirates", "Italy", "Mexico"], answer: 0, hint: "Its Arabic name is Al Amal.", explain: "Hope was built by the United Arab Emirates." },
      { q: "What does Hope watch on Mars?", choices: ["Its rivers", "Its weather: dust storms, clouds and thin air", "Its forests"], answer: 1, hint: "It's like a weather satellite.", explain: "Hope watches Mars's weather: dust storms, clouds and thin air." },
      { q: "Why can Hope see the whole of Mars at once?", choices: ["It has a giant mirror", "It sits on top of Olympus Mons", "Its orbit is very high and wide"], answer: 2, hint: "Think about how far away it circles.", explain: "Hope's orbit is so high and wide that it sees the whole planet in one go." },
      { q: "What does 'Al Amal' mean?", choices: ["Sand", "Hope", "Star"], answer: 1, hint: "It's the spacecraft's English name too.", explain: "'Al Amal' means hope." },
      { q: "Which missions arrived at Mars in February 2021?", choices: ["Hope, Tianwen-1 and Perseverance", "Viking 1 and Viking 2", "Mariner 4 on its own"], answer: 0, hint: "Three of them, all in one month.", explain: "Hope, Tianwen-1 and Perseverance all arrived in February 2021." }
    ]
  },

  // ───────────── Terrace 6: Dust Devil Ledge (about age 11–12) ─────────────
  {
    id: 'h6-mars-perseverance',
    subject: 'history',
    floor: 6,
    realm: 'mars',
    title: "Perseverance Collects Mars Rocks",
    topic: 'perseverance',
    topicName: 'The Perseverance rover',
    blurb: "Choose which rocks Perseverance drills and seals in tubes, ready to come to Earth one day.",
    reading: [
      { title: "An old river delta", emoji: '🏞️', text: "In February 2021 the Perseverance rover landed in Jezero Crater. Long ago a river flowed into a lake there and left a fan of mud and sand called a delta." },
      { title: "Rock samples in tubes", emoji: '🧪', text: "Perseverance drills out rock cores about the size of a piece of chalk and seals them in shiny tubes. Scientists hope to bring some of them to Earth one day, to study them in labs." },
      { title: "Ears on Mars", emoji: '🎤', text: "Perseverance carries microphones. They recorded the swish of the wind on Mars and the hum of a helicopter flying there!" },
      { title: "A name from a student", emoji: '✏️', text: "A 13-year-old student, Alexander Mather, named the rover. He wrote that we are explorers, and that we always persevere: we keep going, whatever comes our way." }
    ],
    dialogue: {
      npc: { name: "Dr. Jo", role: "a scientist who chooses Perseverance's rock samples", look: 'roverteam', portrayal: 'generic' },
      intro: "Hello! I'm Dr. Jo. Each week our team decides which rocks Perseverance should drill. Today we're choosing a very special one. Will you help?",
      topics: [
        { ask: "Why land in Jezero Crater?", answer: "Pictures from space showed a delta, where an old river once ran into a lake. On Earth, places like that keep signs of tiny life very well, so it's a great place to look." },
        { ask: "How do you choose a rock?", answer: "We study pictures and use the rover's tools to see what each rock is made of. We pick rocks that formed in water, or that tell a story about Mars's past." },
        { ask: "How will the tubes get to Earth?", answer: "Perseverance left some tubes in a safe spot on the ground. Space agencies are working out how a future mission could pick tubes up and fly them home. It's one of the hardest trips ever planned!" },
        { ask: "What does Mars sound like?", answer: "Quieter than Earth, because the air is so thin. We heard gusts of wind, the crunch of the rover's wheels and the buzz of the Ingenuity helicopter." },
        { ask: "What else did it bring?", answer: "A little helicopter called Ingenuity, tucked under its belly, and a gold box called MOXIE that tested making oxygen from Mars's air!" }
      ],
      challenge: {
        q: "What does Perseverance put its rock cores into?",
        choices: ["Paper bags", "Shiny sealed tubes", "Its wheels"],
        answer: 1,
        explain: "It seals each rock core in a shiny tube, ready to be brought to Earth one day."
      },
      farewell: "Keep going, even when it's hard. That's what perseverance means!"
    },
    timeline: {
      title: "Perseverance's mission",
      events: [
        { label: "Curiosity lands; Perseverance will be built on the same design", year: 2012, when: "2012" },
        { label: "Perseverance launches, with the Ingenuity helicopter on board", year: 2020, when: "2020" },
        { label: "Perseverance lands in Jezero Crater", year: 2021, when: "2021" },
        { label: "Perseverance films Mars's moon Phobos crossing the Sun", year: 2022, when: "2022" },
        { label: "Perseverance finishes leaving a set of sample tubes in a safe spot", year: 2023, when: "2023" }
      ]
    },
    artifact: {
      model: 'sample-tube',
      name: "A sample tube",
      text: "Each sample tube is a shiny metal tube that holds a core of rock about the size of a piece of chalk. Perseverance carried 43 of them."
    },
    quiz: [
      { q: "Where did Perseverance land?", choices: ["In Jezero Crater, where an old river met a lake", "On top of Olympus Mons", "On Phobos"], answer: 0, hint: "A delta left by a river.", explain: "Perseverance landed in Jezero Crater, at an old river delta." },
      { q: "What does Perseverance do with its rock cores?", choices: ["Throws them away", "Seals them in tubes for scientists", "Eats them"], answer: 1, hint: "Shiny tubes, ready for a trip.", explain: "It seals them in tubes, hoping they can come to Earth one day." },
      { q: "What could we hear for the first time with its microphones?", choices: ["Martian birds", "Rain on Mars", "The wind on Mars and a helicopter's hum"], answer: 2, hint: "Mars is windy, and something flew there.", explain: "Its microphones recorded the Martian wind and Ingenuity's hum." },
      { q: "Who named Perseverance?", choices: ["A 13-year-old student", "A famous singer", "The rover itself"], answer: 0, hint: "Someone your age, almost.", explain: "Alexander Mather, a 13-year-old student, named it." },
      { q: "What did Perseverance carry under its belly?", choices: ["A spare wheel", "A little helicopter called Ingenuity", "A Martian"], answer: 1, hint: "It later flew 72 times.", explain: "Perseverance carried the Ingenuity helicopter." }
    ]
  },
  {
    id: 'h6-mars-zhurong',
    subject: 'history',
    floor: 6,
    realm: 'mars',
    title: "Tianwen-1 and the Zhurong Rover",
    topic: 'tianwen-1',
    topicName: "China's Tianwen-1 mission",
    blurb: "Orbit, land and drive with China's first Mars mission, and take a family photo on Mars.",
    reading: [
      { title: "Questions to Heaven", emoji: '📜', text: "In 2020 China launched its first mission to Mars, called Tianwen-1. Tianwen means 'Questions to Heaven', the name of a poem by Qu Yuan, written more than 2,000 years ago." },
      { title: "Three in one", emoji: '🛰️', text: "Tianwen-1 did three jobs on one trip: an orbiter circled Mars, a lander touched down, and a rover drove away. No country had done all three on its first trip to Mars before!" },
      { title: "Zhurong the rover", emoji: '🔥', text: "In May 2021 the rover, Zhurong, rolled out onto a wide plain called Utopia Planitia. Zhurong is a god of fire in old Chinese stories: a good match for the 'fire star'." },
      { title: "A family photo", emoji: '📸', text: "Zhurong dropped a little wireless camera on the ground and drove away, and the camera took a photo of the rover and the lander together, like a family picture." }
    ],
    dialogue: {
      npc: { name: "Wei", role: "an engineer on China's Tianwen-1 team", look: 'mission', portrayal: 'generic' },
      intro: "Ni hao! I'm Wei. Our rover Zhurong has just rolled down its ramp onto Mars. Look at its blue solar panels, open like butterfly wings!",
      topics: [
        { ask: "How did Zhurong land?", answer: "The orbiter carried the lander and rover to Mars and circled for about three months while we studied the landing site. Then the lander came down with a heat shield, a parachute and a rocket engine." },
        { ask: "Why butterfly wings?", answer: "Zhurong runs on sunlight. Its four solar panels open out like a butterfly's wings to catch as much light as possible." },
        { ask: "What did Zhurong study?", answer: "It used radar to look under the ground, a bit like an X-ray of the soil, and found layers that tell us about floods and changes long ago." },
        { ask: "How long did it work?", answer: "It was planned to work for about 90 sols, and it worked for about a year, driving almost 2 kilometres. Then it settled down to rest through the dusty Martian winter, and it has been resting ever since." },
        { ask: "What does the orbiter do?", answer: "It circles Mars, takes pictures of the whole planet, and passes messages between the rover and the Earth." }
      ],
      challenge: {
        q: "What three things did Tianwen-1 do on one trip?",
        choices: ["Orbit, land and drive a rover", "Fly, swim and dig", "Launch, wave and come home"],
        answer: 0,
        explain: "Tianwen-1 had an orbiter, a lander and a rover, all on its first trip to Mars."
      },
      farewell: "Keep asking big questions, just like the old poem. Zai jian!"
    },
    timeline: {
      title: "China and Mars",
      events: [
        { label: "The poet Qu Yuan writes 'Questions to Heaven'", year: -300, when: "about 2,300 years ago" },
        { label: "China's first Moon orbiter, Chang'e-1, launches", year: 2007, when: "2007" },
        { label: "Tianwen-1 launches towards Mars", year: 2020, when: "2020" },
        { label: "The Zhurong rover lands on Utopia Planitia", year: 2021, when: "2021" },
        { label: "The orbiter finishes taking pictures of the whole planet", year: 2022, when: "2022" }
      ]
    },
    artifact: {
      model: 'butterfly-rover',
      name: "A model of the Zhurong rover",
      text: "Zhurong weighs about as much as three grown-ups, with six wheels, a camera mast and four blue solar panels that open like butterfly wings."
    },
    quiz: [
      { q: "What does 'Tianwen' mean?", choices: ["Fire star", "Questions to Heaven", "Red rover"], answer: 1, hint: "The name of an old poem.", explain: "Tianwen means 'Questions to Heaven', from a poem by Qu Yuan." },
      { q: "Who is Zhurong in old Chinese stories?", choices: ["A god of fire", "A mountain", "A famous cat"], answer: 0, hint: "A good match for the 'fire star'.", explain: "Zhurong is a god of fire in old Chinese stories." },
      { q: "Why do Zhurong's solar panels open like butterfly wings?", choices: ["To fly", "To look pretty", "To catch as much sunlight as possible"], answer: 2, hint: "Zhurong runs on sunlight.", explain: "The wide panels catch as much sunlight as possible." },
      { q: "How did Zhurong get a photo of itself with the lander?", choices: ["With a long selfie stick", "It dropped a little wireless camera and drove away", "An astronaut took it"], answer: 1, hint: "The camera stayed on the ground.", explain: "It dropped a little wireless camera, drove away, and the camera took the picture." },
      { q: "What three parts did Tianwen-1 have?", choices: ["An orbiter, a lander and a rover", "Three rovers", "A rocket, a train and a boat"], answer: 0, hint: "One circled, one landed, one drove.", explain: "Tianwen-1 had an orbiter, a lander and a rover." }
    ]
  },

  // ───────────── Terrace 7: Caldera Rim (about age 12–13) ─────────────
  {
    id: 'h7-mars-ingenuity',
    subject: 'history',
    floor: 7,
    realm: 'mars',
    title: "Ingenuity: The First Flight on Another World",
    topic: 'ingenuity',
    topicName: 'The Ingenuity helicopter',
    blurb: "Get a tiny helicopter off the ground in Mars's thin air, a Wright brothers moment on another planet.",
    reading: [
      { title: "A Wright brothers moment", emoji: '✈️', text: "On 19 April 2021 a little helicopter called Ingenuity lifted off from Mars. It was the first powered, controlled flight on another planet." },
      { title: "A piece of history on board", emoji: '🧵', text: "Ingenuity carried a tiny piece of fabric from the wing of the Wright brothers' plane, which made the first powered flight on Earth in 1903." },
      { title: "Built to test", emoji: '🧪', text: "Ingenuity was a test, planned for up to five short flights. It flew 72 times instead, scouting the way for Perseverance, until a damaged blade ended its flying in 2024." },
      { title: "Named by a student", emoji: '✏️', text: "Vaneeza Rupani, a high-school student, named it Ingenuity: clever thinking that solves hard problems." }
    ],
    dialogue: {
      npc: { name: "Sam", role: "an engineer on the Ingenuity helicopter team", look: 'flightsuit', portrayal: 'generic' },
      intro: "Hi! I'm Sam from the helicopter team. In a few minutes, Ingenuity will try to fly on Mars. Nobody has ever done this before!",
      topics: [
        { ask: "Why is flying on Mars hard?", answer: "Mars's air is about 100 times thinner than the Earth's. Flying there is like flying more than three times higher than the top of Mount Everest. There's very little air for the blades to push on!" },
        { ask: "How did you make it work?", answer: "We made Ingenuity very light, about 1.8 kilograms, and gave it long blades that spin super fast, about 2,400 times a minute." },
        { ask: "Who flew it?", answer: "Nobody with a joystick! Messages take too long to reach Mars. We sent the flight plan ahead, and Ingenuity flew all by itself, using its own camera to check how it was moving." },
        { ask: "What did it do after the tests?", answer: "It became a scout, flying ahead to take pictures so the rover team could plan safe routes. In the end it made 72 flights!" },
        { ask: "Where is Ingenuity now?", answer: "It rests on a sandy ripple in Jezero Crater, still carrying its little piece of the Wright brothers' plane." }
      ],
      challenge: {
        q: "What was special about Ingenuity's flight in April 2021?",
        choices: ["It was the first powered, controlled flight on another planet", "It flew to the Moon", "It carried people"],
        answer: 0,
        explain: "Ingenuity made the first powered, controlled flight on another world."
      },
      farewell: "Whenever someone says 'that's impossible', think of a tiny helicopter on Mars!"
    },
    timeline: {
      title: "Flying firsts",
      events: [
        { label: "The Wright brothers make the first powered flight on Earth", year: 1903, when: "1903" },
        { label: "Ingenuity launches, tucked under Perseverance", year: 2020, when: "2020" },
        { label: "Ingenuity makes the first powered flight on another planet", year: 2021, when: "2021" },
        { label: "Ingenuity makes its 50th flight", year: 2023, when: "2023" },
        { label: "Ingenuity makes its last flight, its 72nd", year: 2024, when: "2024" }
      ]
    },
    artifact: {
      model: 'mars-helicopter',
      name: "A model of Ingenuity",
      text: "Ingenuity's body was about the size of a tissue box, with four springy legs, two sets of blades 1.2 metres across spinning in opposite directions, and a small solar panel on top."
    },
    quiz: [
      { q: "What was Ingenuity?", choices: ["A little helicopter that flew on Mars", "A rover", "A space station"], answer: 0, hint: "It had spinning blades.", explain: "Ingenuity was a little helicopter that flew on Mars." },
      { q: "Why is flying on Mars hard?", choices: ["It is too windy every day", "The air is very thin, so the blades have little to push on", "There is no gravity"], answer: 1, hint: "About 100 times thinner than Earth's.", explain: "Mars's air is very thin, so helicopter blades have very little to push on." },
      { q: "What tiny piece of history did Ingenuity carry?", choices: ["A moon rock", "A dinosaur bone", "Fabric from the Wright brothers' plane"], answer: 2, hint: "From the first powered flight on Earth.", explain: "It carried a piece of fabric from the Wright brothers' 1903 plane." },
      { q: "How many flights did Ingenuity make?", choices: ["5", "72", "1,000"], answer: 1, hint: "Far more than the five planned.", explain: "Ingenuity made 72 flights." },
      { q: "Who flew Ingenuity?", choices: ["It flew itself, following a plan sent ahead", "An astronaut in a cockpit", "A pilot on Earth with a joystick"], answer: 0, hint: "Messages take minutes to reach Mars.", explain: "Ingenuity flew itself, following a flight plan sent from Earth." }
    ]
  },
  {
    id: 'h7-mars-moxie',
    subject: 'history',
    floor: 7,
    realm: 'mars',
    title: "Making Air on Mars",
    topic: 'mars-explorers-future',
    topicName: 'Getting ready for people on Mars',
    blurb: "Make oxygen from Mars's air with MOXIE, and plan for the first people on Mars.",
    reading: [
      { title: "Air from Mars's air", emoji: '💨', text: "People need oxygen to breathe. Mars's air is mostly carbon dioxide, so scientists built MOXIE, a gold box on Perseverance that split carbon dioxide to make oxygen." },
      { title: "It worked!", emoji: '✅', text: "In April 2021 MOXIE made oxygen on Mars for the first time. Over 16 runs it made about 122 grams: enough for a small dog to breathe for about 10 hours." },
      { title: "Getting ready for people", emoji: '👩‍🚀', text: "One day people may travel to Mars. They will need air, water, food, warm homes and power, and things made from Mars's own rock and ice." },
      { title: "Learning from every mission", emoji: '🔬', text: "Each rover, orbiter and helicopter teaches us something new: where the ice is, what the weather does, how the dust behaves. Bit by bit, the way to Mars is being mapped." }
    ],
    dialogue: {
      npc: { name: "Dr. Ada", role: "a scientist who tests ways for people to live on Mars", look: 'scientist', portrayal: 'generic' },
      intro: "Welcome to the test lab! I'm Dr. Ada. We're getting ready for the day people visit Mars. First question: how will they breathe?",
      topics: [
        { ask: "How does MOXIE make oxygen?", answer: "It sucks in Mars's air, heats it to about 800 °C and splits carbon dioxide into oxygen and carbon monoxide. The oxygen is the part people need." },
        { ask: "Why not just bring air from Earth?", answer: "Air, and the fuel to fly home, are very heavy to carry. Making them on Mars, from things that are already there, would make trips much easier." },
        { ask: "Where would people find water?", answer: "Mars has lots of ice: in the polar caps and hidden just under the ground in many places. Ice can be melted for water, and water can even be split to make more oxygen." },
        { ask: "How long would the trip take?", answer: "With today's rockets, about seven months each way. And because the Earth and Mars line up well only about every 26 months, a crew would stay on Mars for many months before flying home." },
        { ask: "Could I go one day?", answer: "Maybe! The first Mars explorers might be children today, studying maths, science, engineering and lots more. Every lesson you learn is a step on the road to Mars." }
      ],
      challenge: {
        q: "What did MOXIE make on Mars?",
        choices: ["Oxygen", "Chocolate", "Rain"],
        answer: 0,
        explain: "MOXIE made oxygen from the carbon dioxide in Mars's air."
      },
      farewell: "See you on Mars one day, explorer! Keep learning: you'll need all of it."
    },
    timeline: {
      title: "Getting ready for people on Mars",
      events: [
        { label: "Mariner 4 sends the first close-up photos of Mars", year: 1965, when: "1965" },
        { label: "The Phoenix lander digs up ice near Mars's north pole", year: 2008, when: "2008" },
        { label: "MOXIE makes oxygen on Mars for the first time", year: 2021, when: "2021" },
        { label: "MOXIE finishes its tests after making about 122 grams of oxygen", year: 2023, when: "2023" }
      ]
    },
    artifact: {
      model: 'moxie',
      name: "MOXIE, the oxygen maker",
      text: "MOXIE was a gold-coloured box about the size of a car battery, tucked inside Perseverance. It was the first machine to make oxygen from the air of another planet."
    },
    quiz: [
      { q: "What is Mars's air mostly made of?", choices: ["Oxygen", "Carbon dioxide", "Water"], answer: 1, hint: "The gas we breathe out.", explain: "Mars's air is mostly carbon dioxide." },
      { q: "What did MOXIE do?", choices: ["Made oxygen from Mars's air", "Drove across Mars", "Took photos of the Earth"], answer: 0, hint: "Its job was about breathing.", explain: "MOXIE made oxygen from Mars's carbon dioxide." },
      { q: "About how much oxygen did MOXIE make in all?", choices: ["122 kilograms", "1 gram", "About 122 grams"], answer: 2, hint: "Enough for a small dog for about 10 hours.", explain: "Over 16 runs, MOXIE made about 122 grams of oxygen." },
      { q: "Where could people on Mars find water?", choices: ["In Mars's ice, at the poles and under the ground", "In Martian rivers", "From rain clouds"], answer: 0, hint: "It's frozen.", explain: "Mars has ice in its polar caps and under the ground." },
      { q: "About how long would a trip to Mars take with today's rockets?", choices: ["7 days", "About 7 months", "7 years"], answer: 1, hint: "Longer than a school term, shorter than a year.", explain: "With today's rockets, a trip to Mars takes about seven months." }
    ]
  }
];

/* ------------------------------------------------------------ The Weather Lab (physics) */

const MARS_PHYSICS = [
  // ───────────── Terrace 1: Landing Plains (about age 6–7) ─────────────
  {
    id: 'p1-mars-red-rust',
    subject: 'physics',
    floor: 1,
    realm: 'mars',
    title: "Why Is Mars Red?",
    topic: 'mars-red-rust',
    topicName: 'Why Mars is red',
    blurb: "Find out why Mars is rusty red, and test which things a magnet will pick up.",
    reading: [
      { title: "The red planet", emoji: '🔴', text: "Mars is often called the red planet. From Earth it looks reddish-orange, and up close its rocks and dust are rusty red." },
      { title: "Rust!", emoji: '🔩', text: "Mars's dust has lots of iron in it. Long ago the iron joined up with oxygen and turned into rust, just like an old bike left out in the rain." },
      { title: "Dust everywhere", emoji: '🌬️', text: "The rusty dust is very fine, like flour. Winds blow it all over the planet and high into the sky." },
      { title: "Magnets on rovers", emoji: '🧲', text: "Some Mars dust is a little magnetic. Rovers carried small magnets, and the dust stuck to them, showing it has iron-rich bits in it." }
    ],
    sim: {
      id: 'magnet',
      setup: { items: ['iron-nail', 'paper-clip', 'steel-bolt', 'wooden-block', 'plastic-toy', 'eraser'] },
      predict: {
        q: "You bring a magnet near an iron nail, a wooden block and a plastic toy. Which will it pick up?",
        choices: ["The wooden block", "The iron nail", "The plastic toy"],
        answer: 1,
        explain: "Magnets pull on iron. Mars's dust has iron in it too, which is why some of it stuck to the rovers' magnets!"
      }
    },
    quiz: [
      { q: "Why is Mars red?", choices: ["It is very hot", "Its dust has rusty iron in it", "It is covered in red paint"], answer: 1, hint: "Think of an old bike left out in the rain.", explain: "Mars's dust has lots of rusty iron in it, and rust is reddish." },
      { q: "What is rust?", choices: ["Iron that has joined up with oxygen", "A kind of ice", "A Martian plant"], answer: 0, hint: "It happens to iron left out in the wet.", explain: "Rust is iron that has joined up with oxygen." },
      { q: "Which thing will a magnet pick up?", choices: ["A wooden block", "A rubber eraser", "A paper clip"], answer: 2, hint: "Magnets pull on iron and steel.", explain: "A paper clip is made of steel, which has iron in it, so a magnet picks it up." },
      { q: "What is Mars's dust like?", choices: ["Big lumpy rocks only", "Very fine, like flour", "Wet and sticky like mud"], answer: 1, hint: "Winds can carry it high into the sky.", explain: "Mars's dust is very fine, like flour." },
      { q: "What did the magnets on the rovers show?", choices: ["Some Mars dust has iron-rich bits in it", "Mars is made of gold", "Mars has no dust"], answer: 0, hint: "The dust stuck to them.", explain: "Dust stuck to the magnets, showing it has iron-rich bits in it." }
    ]
  },
  {
    id: 'p1-mars-sols',
    subject: 'physics',
    floor: 1,
    realm: 'mars',
    title: "A Day on Mars",
    topic: 'mars-day',
    topicName: 'Day and night on Mars',
    blurb: "Spin into day and night on Mars, see a smaller Sun and a blue sunset, and play with light and shadow.",
    reading: [
      { title: "Mars spins too", emoji: '🌍', text: "Like the Earth, Mars spins round and round. When your side faces the Sun it is day, and when it turns away it is night." },
      { title: "A sol", emoji: '⏰', text: "One day on Mars is called a sol. It is only a little longer than an Earth day: about 24 hours and 40 minutes." },
      { title: "A smaller Sun", emoji: '☀️', text: "Mars is farther from the Sun than the Earth, so from Mars the Sun looks smaller and a bit dimmer." },
      { title: "Blue sunsets!", emoji: '🌅', text: "On Earth, sunsets glow orange. On Mars, the fine dust in the air makes the sky around the setting Sun glow blue!" }
    ],
    sim: {
      id: 'shadow',
      predict: {
        q: "Mars is farther from the Sun than the Earth. In the lab, you move the torch farther away from the toy. What happens to the shadow on the wall?",
        choices: ["It gets bigger", "It gets smaller", "It turns blue"],
        answer: 1,
        explain: "Farther from the torch, the toy blocks less of the spreading light, so its shadow shrinks. Things far from a light look smaller and get less of its light, like the Sun seen from Mars."
      }
    },
    quiz: [
      { q: "What is a day on Mars called?", choices: ["A sol", "A moon", "A week"], answer: 0, hint: "It's a short word, three letters.", explain: "A day on Mars is called a sol." },
      { q: "About how long is a sol?", choices: ["About 12 hours", "About 24 hours and 40 minutes", "About a month"], answer: 1, hint: "Only a little longer than an Earth day.", explain: "A sol lasts about 24 hours and 40 minutes." },
      { q: "Why does the Sun look smaller from Mars?", choices: ["The Sun shrinks at night", "Mars has two Suns", "Mars is farther from the Sun"], answer: 2, hint: "Things far away look small.", explain: "Mars is farther from the Sun than the Earth, so the Sun looks smaller." },
      { q: "What colour is the sky around the setting Sun on Mars?", choices: ["Bluish", "Green", "Black and white stripes"], answer: 0, hint: "The opposite of our orange sunsets!", explain: "Mars's fine dust makes the sky around the setting Sun glow blue." },
      { q: "What makes day and night on Mars?", choices: ["The Sun switching off", "Mars spinning round", "Dust storms"], answer: 1, hint: "The same thing that makes day and night on Earth.", explain: "Mars spins, so each side turns towards the Sun (day) and away from it (night)." }
    ]
  },

  // ───────────── Terrace 2: Rover Ridge (about age 7–8) ─────────────
  {
    id: 'p2-mars-quiet-sound',
    subject: 'physics',
    floor: 2,
    realm: 'mars',
    title: "Quiet Mars: Sound in Thin Air",
    topic: 'sound',
    topicName: 'Sound',
    blurb: "Pluck a ruler to make sounds, and find out why Mars sounds so quiet.",
    reading: [
      { title: "Sound needs air", emoji: '〰️', text: "Sound is a wobble passed along through the air. Your ears catch the wobbles. With no air at all, like in space, there is no sound." },
      { title: "Thin air, quiet sounds", emoji: '🤫', text: "Mars has air, but it is very thin: about 100 times thinner than the Earth's. So sounds are much quieter there, and they fade away quickly." },
      { title: "Slower sound", emoji: '🐢', text: "Sound also travels more slowly on Mars: about 240 metres a second instead of about 340 metres a second on Earth, because Mars's air is cold and made of carbon dioxide." },
      { title: "Microphones on Mars", emoji: '🎤', text: "The Perseverance rover carries microphones. They have recorded the swish of Martian wind and the buzz of the Ingenuity helicopter." }
    ],
    sim: {
      id: 'sound',
      predict: {
        q: "You pluck the ruler harder. What happens to the sound?",
        choices: ["It gets quieter", "It gets louder", "It stops"],
        answer: 1,
        explain: "A harder pluck makes bigger wobbles, so the sound is louder. On Mars, the thin air would carry it much more quietly."
      }
    },
    quiz: [
      { q: "Why are sounds quieter on Mars?", choices: ["Martians are shy", "Mars's air is very thin", "Mars is very big"], answer: 1, hint: "What carries sound to your ears?", explain: "Mars's air is very thin, so it carries sounds much more quietly." },
      { q: "What makes a sound?", choices: ["Something wobbling, or vibrating", "Something glowing", "Something freezing"], answer: 0, hint: "Touch your throat while you hum.", explain: "Sounds are made by things wobbling back and forth, or vibrating." },
      { q: "Does sound travel faster or slower on Mars than on Earth?", choices: ["Faster", "Exactly the same", "Slower"], answer: 2, hint: "About 240 metres a second on Mars.", explain: "Sound travels slower on Mars: about 240 metres a second instead of about 340." },
      { q: "What did Perseverance's microphones record?", choices: ["Martian birds singing", "The wind and the helicopter's buzz", "Rain"], answer: 1, hint: "Mars is windy, and something flew there.", explain: "They recorded the Martian wind and the buzz of the Ingenuity helicopter." },
      { q: "Could you hear a sound in empty space, with no air at all?", choices: ["No, sound needs something to travel through", "Yes, it would be extra loud"], answer: 0, hint: "Sound is a wobble passed along through the air.", explain: "With nothing to carry the wobbles, there is no sound." }
    ]
  },
  {
    id: 'p2-mars-falling',
    subject: 'physics',
    floor: 2,
    realm: 'mars',
    title: "Falling on Mars",
    topic: 'mars-gravity',
    topicName: 'Gravity on Mars',
    blurb: "Drop a ball and a bowling ball, and find out how gravity works on Mars.",
    reading: [
      { title: "Gravity pulls", emoji: '⬇️', text: "Gravity is the pull that makes things fall. Big planets pull harder than small ones." },
      { title: "A gentler pull", emoji: '🔴', text: "Mars is smaller than the Earth, so it pulls things more gently: only about 38% as hard. You would feel much lighter there." },
      { title: "Higher jumps", emoji: '🦘', text: "With the same jump, you would go almost three times as high on Mars, and you would float down more slowly too." },
      { title: "Heavy and light fall together", emoji: '⚖️', text: "A heavy ball and a light ball dropped together land together, on Mars and on Earth, as long as the air doesn't slow one of them down." }
    ],
    sim: {
      id: 'drop',
      setup: { objects: ['ball', 'bowling-ball'], air: 'on' },
      predict: {
        q: "You drop a ball and a heavy bowling ball at the same moment. Which lands first?",
        choices: ["The bowling ball", "The ball", "They land at the same time"],
        answer: 2,
        explain: "Gravity speeds up heavy and light things in the same way, so they land together. On Mars they would both fall more slowly, but still together!"
      }
    },
    quiz: [
      { q: "What is gravity?", choices: ["The pull that makes things fall", "A kind of wind", "A Martian"], answer: 0, hint: "Drop a pencil and watch.", explain: "Gravity is the pull that makes things fall." },
      { q: "How strong is Mars's gravity, compared with the Earth's?", choices: ["Twice as strong", "About 38% as strong", "Just the same"], answer: 1, hint: "You would feel much lighter on Mars.", explain: "Mars's gravity is about 38% as strong as the Earth's." },
      { q: "With the same jump, how high would you go on Mars?", choices: ["Not as high", "Exactly as high", "Almost three times as high"], answer: 2, hint: "Mars pulls you back down more gently.", explain: "With gentler gravity, the same jump would go almost three times as high." },
      { q: "A heavy ball and a light ball are dropped together on Mars. Which lands first?", choices: ["The heavy one", "They land together", "The light one"], answer: 1, hint: "What did the experiment show?", explain: "They land together: gravity speeds them up in the same way." },
      { q: "Why is Mars's pull gentler than the Earth's?", choices: ["Mars is smaller", "Mars is red", "Mars is colder"], answer: 0, hint: "Big planets pull harder than small ones.", explain: "Mars is smaller than the Earth, so its gravity is gentler." }
    ]
  },

  // ───────────── Terrace 3: Ice Ledge (about age 8–9) ─────────────
  {
    id: 'p3-mars-ice-caps',
    subject: 'physics',
    floor: 3,
    realm: 'mars',
    title: "Ice Caps and Long-Ago Water",
    topic: 'mars-water',
    topicName: 'Water and ice on Mars',
    blurb: "Visit Mars's icy poles, look for old rivers, and test what floats.",
    reading: [
      { title: "White caps", emoji: '❄️', text: "Mars has white ice caps at its north and south poles. They are made of frozen water, with a frosting of frozen carbon dioxide, 'dry ice', that comes and goes with the seasons." },
      { title: "Seasons on Mars", emoji: '🍂', text: "Mars is tilted, like the Earth, so it has seasons. But its year is almost twice as long, so each season lasts about twice as long too." },
      { title: "Rivers long ago", emoji: '🏞️', text: "Rovers and orbiters have found dried-up river valleys, old lake beds and pebbles rounded by flowing water. Billions of years ago, Mars was wetter." },
      { title: "Ice under the ground", emoji: '⛏️', text: "Today most of Mars's water is frozen, in the caps and hidden under the dusty ground. The air is too thin and cold for lakes to last on the surface." }
    ],
    sim: {
      id: 'float',
      setup: { items: ['ice-cube', 'stone', 'cork', 'coin', 'apple', 'key'] },
      predict: {
        q: "You drop an ice cube into the tank of water. Will it float or sink?",
        choices: ["It floats", "It sinks"],
        answer: 0,
        explain: "Ice is a little lighter than the same amount of water, so it floats. That's why lakes on Earth freeze from the top down."
      }
    },
    quiz: [
      { q: "What are Mars's polar ice caps made of?", choices: ["Sugar", "Frozen water, with frozen carbon dioxide on top", "Salt"], answer: 1, hint: "Two kinds of ice.", explain: "They are frozen water, with a frosting of frozen carbon dioxide that comes and goes." },
      { q: "Does ice float in water?", choices: ["Yes", "No"], answer: 0, hint: "Think of ice cubes in a drink.", explain: "Yes. Ice is a little lighter than the same amount of water, so it floats." },
      { q: "What clues show that Mars once had flowing water?", choices: ["Fish bones", "Boats", "Old river valleys and rounded pebbles"], answer: 2, hint: "Water leaves marks on the land.", explain: "Dried-up river valleys, old lake beds and rounded pebbles show Mars once had flowing water." },
      { q: "Why are Mars's seasons about twice as long as the Earth's?", choices: ["Mars spins faster", "Its year is almost twice as long", "It has two moons"], answer: 1, hint: "Think about how long Mars takes to go round the Sun.", explain: "A Mars year is almost twice as long as ours, so each season lasts about twice as long." },
      { q: "Where is most of Mars's water today?", choices: ["In big blue oceans", "In the clouds only", "Frozen, in the ice caps and under the ground"], answer: 2, hint: "Mars is very cold.", explain: "Most of Mars's water is frozen, in the ice caps and under the ground." }
    ]
  },
  {
    id: 'p3-mars-keeping-warm',
    subject: 'physics',
    floor: 3,
    realm: 'mars',
    title: "Keeping Warm on Mars",
    topic: 'mars-warmth',
    topicName: 'Heat and keeping warm',
    blurb: "Find out how rovers stay warm on freezing Mars, and freeze and melt water in the lab.",
    reading: [
      { title: "Very, very cold", emoji: '🥶', text: "On average Mars is about −60 °C. Water freezes solid there, and a rover's batteries would too, without some help." },
      { title: "Heaters inside", emoji: '🔥', text: "Rovers and landers carry small heaters to keep their batteries and computers warm through the freezing nights." },
      { title: "Fluffy insulation", emoji: '🧥', text: "Insulation is a material that stops heat escaping, like a puffy winter coat. Rovers use a super-light insulation called aerogel, which is mostly air!" },
      { title: "Melting and freezing", emoji: '🧊', text: "Warm ice up and it melts into water. Cool water down and it freezes into ice. On Mars, explorers would melt ice to get water." }
    ],
    sim: {
      id: 'states',
      predict: {
        q: "You cool the beaker of water down below 0 °C. What happens?",
        choices: ["It boils", "It turns into ice", "It stays just the same"],
        answer: 1,
        explain: "Water freezes at 0 °C. On Mars it is usually far colder than that, so water there is almost always ice."
      }
    },
    quiz: [
      { q: "About how cold is Mars on average?", choices: ["About 20 °C", "About −60 °C", "About 100 °C"], answer: 1, hint: "Far below zero.", explain: "On average, Mars is about −60 °C." },
      { q: "What does insulation do?", choices: ["Stops heat escaping", "Makes things heavier", "Makes light"], answer: 0, hint: "Like a puffy winter coat.", explain: "Insulation stops heat escaping, keeping things warm." },
      { q: "What super-light insulation do rovers use?", choices: ["Wool socks", "Bricks", "Aerogel, which is mostly air"], answer: 2, hint: "It's mostly air!", explain: "Rovers use aerogel, a super-light insulation that is mostly air." },
      { q: "At what temperature does water freeze?", choices: ["100 °C", "0 °C", "50 °C"], answer: 1, hint: "The number where cold begins.", explain: "Water freezes at 0 °C." },
      { q: "How could explorers on Mars get water?", choices: ["Melt ice", "Wait for rain", "Squeeze rocks"], answer: 0, hint: "Mars's water is mostly frozen.", explain: "They could melt Mars's ice to get water." }
    ]
  },

  // ───────────── Terrace 4: Greenhouse Terrace (about age 9–10) ─────────────
  {
    id: 'p4-mars-greenhouse',
    subject: 'physics',
    floor: 4,
    realm: 'mars',
    title: "Growing Plants on Mars",
    topic: 'mars-plants',
    topicName: 'Plants and light',
    blurb: "Plan a Mars greenhouse, and turn a mirror to bounce light where plants need it.",
    reading: [
      { title: "What plants need", emoji: '🌱', text: "Plants need light, water, warmth, air with carbon dioxide in it, and food from the soil to grow." },
      { title: "Mars has some of it", emoji: '🔴', text: "Mars's air is mostly carbon dioxide, which plants love! But it is too thin and cold, so plants would need a warm, sealed greenhouse." },
      { title: "Less sunlight", emoji: '☀️', text: "Mars gets less than half as much sunlight as the Earth. Greenhouses could use mirrors to bounce extra light onto the plants, or use bright lamps." },
      { title: "Mars soil", emoji: '🪴', text: "Mars soil has no compost in it, and some salts that plants don't like. It would need washing and feeding before crops could grow in it." }
    ],
    sim: {
      id: 'mirror',
      predict: {
        q: "You turn the mirror so the light beam hits it at a slant. Where does the beam go?",
        choices: ["Straight back where it came from", "Off at the same angle on the other side", "It disappears"],
        answer: 1,
        explain: "A mirror bounces light off at the same angle it came in. That's how mirrors could steer extra sunlight into a Mars greenhouse."
      }
    },
    quiz: [
      { q: "Which of these do plants need to grow?", choices: ["Light and water", "Darkness and sand", "Only cold air"], answer: 0, hint: "Think of a plant on a sunny windowsill.", explain: "Plants need light and water, as well as warmth, carbon dioxide and food from the soil." },
      { q: "Why would plants on Mars need a greenhouse?", choices: ["Mars is too warm", "Mars's air is too thin and cold", "Plants are scared of rovers"], answer: 1, hint: "Think about Mars's air and temperature.", explain: "Mars's air is too thin and cold, so plants need a warm, sealed greenhouse." },
      { q: "How does a mirror bounce light?", choices: ["It soaks it all up", "It turns it red", "Off at the same angle it came in"], answer: 2, hint: "What did the experiment show?", explain: "Light bounces off a mirror at the same angle it came in." },
      { q: "How much sunlight does Mars get, compared with the Earth?", choices: ["Less than half as much", "Twice as much", "Exactly the same"], answer: 0, hint: "Mars is farther from the Sun.", explain: "Mars gets less than half as much sunlight as the Earth." },
      { q: "Why would Mars soil need washing and feeding?", choices: ["It is too sweet", "It has salts plants don't like, and no compost", "It is made of ice"], answer: 1, hint: "Good soil on Earth is full of compost.", explain: "Mars soil has salts plants don't like and no compost, so it would need washing and feeding." }
    ]
  },
  {
    id: 'p4-mars-stuck-sand',
    subject: 'physics',
    floor: 4,
    realm: 'mars',
    title: "Rovers in Soft Sand",
    topic: 'friction',
    topicName: 'Friction',
    blurb: "Why did a Mars rover get stuck? Roll a toy car onto different surfaces to find out.",
    reading: [
      { title: "Friction", emoji: '✋', text: "Friction is a force that slows things down when surfaces rub together. Rough or soft surfaces have lots of it, and smooth ones have little." },
      { title: "Wheels that grip", emoji: '🛞', text: "Rover wheels have ridged treads, a bit like the bumps on your trainers. They grip the rocks and dust so the wheels don't just spin." },
      { title: "Stuck in the sand", emoji: '🏜️', text: "Soft sand is tricky: wheels sink in, and it is very hard to push forward. In 2009 the Spirit rover got stuck in soft sand and could not get free." },
      { title: "Testing on Earth", emoji: '🧪', text: "Engineers test rover wheels on Earth in big sandboxes full of soil like Mars's, to learn how to drive safely." }
    ],
    sim: {
      id: 'ramp',
      setup: { surfaces: ['wood', 'carpet', 'sand'] },
      predict: {
        q: "The toy car rolls down the ramp onto wood, carpet and sand. On which one will it stop soonest?",
        choices: ["Wood", "Carpet", "Sand"],
        answer: 2,
        explain: "Soft sand has lots of friction, and the wheels sink in, so the car stops quickly, just like a rover in soft Martian sand."
      }
    },
    quiz: [
      { q: "What is friction?", choices: ["A force that slows things when surfaces rub", "A kind of fuel", "A Martian moon"], answer: 0, hint: "Rub your hands together.", explain: "Friction is a force that slows things down when surfaces rub together." },
      { q: "Why do rover wheels have ridged treads?", choices: ["To look cool", "To grip the ground", "To make music"], answer: 1, hint: "Like the bumps on your trainers.", explain: "The ridged treads grip the ground so the wheels don't just spin." },
      { q: "What happened to the Spirit rover in 2009?", choices: ["It flew away", "It found a lake", "It got stuck in soft sand"], answer: 2, hint: "Wheels sink into soft sand.", explain: "Spirit got stuck in soft sand and could not get free." },
      { q: "On which surface does a toy car roll the farthest?", choices: ["Smooth wood", "Soft sand", "Thick carpet"], answer: 0, hint: "Which has the least friction?", explain: "Smooth wood has the least friction of the three, so the car rolls farthest." },
      { q: "How do engineers learn to drive rovers safely?", choices: ["They guess", "They test wheels in sandboxes of Mars-like soil", "They ask the Martians"], answer: 1, hint: "They practise on Earth first.", explain: "They test rover wheels on Earth in sandboxes full of Mars-like soil." }
    ]
  },

  // ───────────── Terrace 5: Weather Heights (about age 10–11) ─────────────
  {
    id: 'p5-mars-solar-power',
    subject: 'physics',
    floor: 5,
    realm: 'mars',
    title: "Sunlight, Dust and Solar Power",
    topic: 'mars-power',
    topicName: 'Electricity and power on Mars',
    blurb: "Power a Mars base with sunlight, beat the dust, and build a circuit in the lab.",
    reading: [
      { title: "Power from sunlight", emoji: '☀️', text: "Many Mars landers and rovers use solar panels, which turn sunlight into electricity. The electricity flows round a loop of wires called a circuit." },
      { title: "Dusty panels", emoji: '🌫️', text: "Mars dust settles on solar panels like a blanket and makes them weaker. Big dust storms can block the Sun for weeks." },
      { title: "Clean-up by wind", emoji: '🌪️', text: "Sometimes gusts of wind and little whirlwinds called dust devils sweep the panels clean. The twin rovers got lots of lucky clean-ups!" },
      { title: "Another kind of power", emoji: '🔋', text: "Curiosity and Perseverance don't use solar panels. They carry a power box that turns heat into electricity, so dust storms can't stop them." }
    ],
    sim: {
      id: 'circuit',
      setup: { items: ['copper-wire', 'aluminium-foil', 'paper-clip', 'rubber-band', 'plastic-straw', 'wooden-stick'] },
      predict: {
        q: "There is a gap in the circuit. You bridge it with copper wire. What happens to the bulb?",
        choices: ["It lights up", "It stays dark", "It melts"],
        answer: 0,
        explain: "Copper is a metal, so electricity flows through it and completes the loop. Rovers use copper wires to carry power from their solar panels."
      }
    },
    quiz: [
      { q: "What do solar panels turn into electricity?", choices: ["Sunlight", "Sand", "Sound"], answer: 0, hint: "'Solar' means 'of the Sun'.", explain: "Solar panels turn sunlight into electricity." },
      { q: "Why does dust make solar panels weaker?", choices: ["It makes them heavier", "It blocks the sunlight", "It turns them off by magic"], answer: 1, hint: "Like a blanket over the panel.", explain: "Dust blocks the sunlight from reaching the panels." },
      { q: "What sometimes cleaned the twin rovers' solar panels?", choices: ["Rain showers", "Astronauts", "Gusts of wind and dust devils"], answer: 2, hint: "Little whirlwinds.", explain: "Gusts of wind and dust devils swept the panels clean." },
      { q: "Which of these lets electricity flow through it?", choices: ["A rubber band", "Aluminium foil", "A plastic straw"], answer: 1, hint: "Metals let electricity through.", explain: "Aluminium foil is a metal, so it conducts electricity." },
      { q: "Why can't dust storms stop Perseverance's power?", choices: ["It carries a power box that turns heat into electricity", "It hides in a cave", "It has a giant umbrella"], answer: 0, hint: "It doesn't use solar panels.", explain: "Perseverance's power box turns heat into electricity, day and night, dust or no dust." }
    ]
  },
  {
    id: 'p5-mars-robot-arm',
    subject: 'physics',
    floor: 5,
    realm: 'mars',
    title: "Robot Arms and Levers",
    topic: 'levers',
    topicName: 'Levers',
    blurb: "Meet Perseverance's long robot arm, and balance a seesaw to learn how levers work.",
    reading: [
      { title: "A long arm", emoji: '🦾', text: "Perseverance has a robot arm about 2 metres long, with joints like a shoulder, an elbow and a wrist. At its end are a drill, cameras and science tools." },
      { title: "Levers", emoji: '⚖️', text: "A lever is a bar that turns on a point called a pivot, like a seesaw. Arms, scissors and seesaws are all levers." },
      { title: "Balancing", emoji: '🧮', text: "A small weight far from the pivot can balance a big weight close to it. On each side, weight × distance must come out the same." },
      { title: "Strong but careful", emoji: '🪨', text: "The rover's arm must press its drill firmly into rock without tipping the rover over. Engineers work out the forces very carefully." }
    ],
    sim: {
      id: 'lever',
      predict: {
        q: "A 2 kg weight sits 3 steps from the pivot. Where must a 3 kg weight go on the other side to balance it?",
        choices: ["1 step from the pivot", "2 steps from the pivot", "3 steps from the pivot"],
        answer: 1,
        explain: "2 × 3 = 6 and 3 × 2 = 6. The two sides balance when weight × distance is the same."
      }
    },
    quiz: [
      { q: "About how long is Perseverance's robot arm?", choices: ["About 2 metres", "About 2 centimetres", "About 2 kilometres"], answer: 0, hint: "Longer than a grown-up is tall.", explain: "Perseverance's arm is about 2 metres long." },
      { q: "What is the point a lever turns on called?", choices: ["The handle", "The pivot", "The wheel"], answer: 1, hint: "The middle of a seesaw.", explain: "A lever turns on a point called the pivot." },
      { q: "Which of these is a lever?", choices: ["A ball", "A cup", "A seesaw"], answer: 2, hint: "A bar that turns on a pivot.", explain: "A seesaw is a lever: a bar turning on a pivot." },
      { q: "A 4 kg weight is 2 steps from the pivot. A 2 kg weight balances it on the other side. How far from the pivot is the 2 kg weight?", choices: ["2 steps", "4 steps", "8 steps"], answer: 1, hint: "4 × 2 = 2 × ?", explain: "4 × 2 = 8, and 2 × 4 = 8. So it is 4 steps from the pivot." },
      { q: "What tools are at the end of Perseverance's arm?", choices: ["A drill, cameras and science tools", "A paintbrush", "A fishing rod"], answer: 0, hint: "It drills rock samples.", explain: "The arm carries a drill, cameras and science tools." }
    ]
  },

  // ───────────── Terrace 6: Dust Devil Ledge (about age 11–12) ─────────────
  {
    id: 'p6-mars-helicopter-air',
    subject: 'physics',
    floor: 6,
    realm: 'mars',
    title: "Why Ingenuity Needed Big, Fast Blades",
    topic: 'air-resistance',
    topicName: 'Air and flight',
    blurb: "Drop a feather with and without air, and find out why flying in Mars's thin air is so hard.",
    reading: [
      { title: "Air pushes back", emoji: '🍃', text: "Air pushes on things moving through it. That's why a feather drifts down slowly: lots of air pushes on it for its tiny weight." },
      { title: "Flying by pushing air", emoji: '🚁', text: "Helicopter blades push air downwards, and the air pushes the helicopter up. More air to push on means more lift." },
      { title: "Mars's thin air", emoji: '💨', text: "Mars's air is about 100 times thinner than the Earth's. There is so little to push on that an ordinary helicopter couldn't take off there." },
      { title: "The answer", emoji: '🌀', text: "Ingenuity was very light and had long blades spinning about 2,400 times a minute, several times faster than a helicopter's blades on Earth, to push enough of the thin air." }
    ],
    sim: {
      id: 'drop',
      setup: { objects: ['feather', 'ball'], air: 'toggle' },
      predict: {
        q: "You drop a feather and a ball together, first in air and then with the air pumped out. With no air, what happens?",
        choices: ["The feather floats away", "They land at the same time", "The ball falls more slowly"],
        answer: 1,
        explain: "With no air pushing on the feather, it falls just as fast as the ball. Air makes a big difference, which is why flying in Mars's thin air is so hard!"
      }
    },
    quiz: [
      { q: "Why does a feather fall slowly on Earth?", choices: ["Air pushes on it a lot for its tiny weight", "It is magnetic", "It is too heavy"], answer: 0, hint: "What happens without air?", explain: "Air pushes on the feather a lot compared with its tiny weight, so it drifts down slowly." },
      { q: "How do helicopter blades lift a helicopter?", choices: ["By pulling on the clouds", "By pushing air downwards", "By spinning backwards in time"], answer: 1, hint: "Push air one way, and it pushes you the other way.", explain: "The blades push air down, and the air pushes the helicopter up." },
      { q: "Why couldn't an ordinary Earth helicopter fly on Mars?", choices: ["It would be too cold to paint", "Mars has no gravity", "The air is too thin to push on"], answer: 2, hint: "About 100 times thinner than Earth's.", explain: "Mars's air is too thin for ordinary blades to push enough of it." },
      { q: "About how fast did Ingenuity's blades spin?", choices: ["About 2,400 times a minute", "About 24 times a minute", "About 24 times a day"], answer: 0, hint: "Super fast!", explain: "Ingenuity's blades spun about 2,400 times a minute." },
      { q: "With no air, a feather and a ball are dropped together. What happens?", choices: ["The ball lands first", "They land at the same time", "The feather floats"], answer: 1, hint: "Nothing pushes on the feather.", explain: "With no air, they fall together and land at the same time." }
    ]
  },
  {
    id: 'p6-mars-radio-delay',
    subject: 'physics',
    floor: 6,
    realm: 'mars',
    title: "Messages at the Speed of Light",
    topic: 'mars-radio',
    topicName: 'Radio and the speed of light',
    blurb: "Send radio messages to Mars, and race carts to see how distance, speed and time fit together.",
    reading: [
      { title: "Radio messages", emoji: '📡', text: "We talk to spacecraft at Mars with radio waves. Radio waves travel at the speed of light: about 300,000 km every second!" },
      { title: "A changing distance", emoji: '🪐', text: "Mars and the Earth travel round the Sun at different speeds, so the distance between them keeps changing: from about 55 million km to about 400 million km." },
      { title: "Waiting for answers", emoji: '⏳', text: "Even at the speed of light, a message takes between about 3 and 22 minutes to reach Mars. That's why rovers and helicopters must do lots of things by themselves." },
      { title: "Distance = speed × time", emoji: '🧮', text: "Distance equals speed times time. Light going 300,000 km a second for 600 seconds (10 minutes) travels 180 million km." }
    ],
    sim: {
      id: 'race',
      predict: {
        q: "Two carts race. Cart B goes twice as fast as cart A, for the same time. How far does B go?",
        choices: ["Half as far", "The same distance", "Twice as far"],
        answer: 2,
        explain: "Distance = speed × time. Double the speed for the same time, and you go double the distance."
      }
    },
    quiz: [
      { q: "How fast do radio waves travel?", choices: ["About 300,000 km a second", "About 300 km an hour", "As fast as a rover"], answer: 0, hint: "The speed of light.", explain: "Radio waves travel at the speed of light, about 300,000 km a second." },
      { q: "Why can't we steer a Mars rover live, like a toy car?", choices: ["Rovers have no radio", "Messages take minutes to reach Mars", "Mars is too dusty"], answer: 1, hint: "Even light takes a while to get there.", explain: "Messages take minutes to reach Mars, so live steering is impossible." },
      { q: "About how long can a message take to reach Mars?", choices: ["Less than a second", "About a week", "Between about 3 and 22 minutes"], answer: 2, hint: "It depends on where the planets are.", explain: "Depending on the distance, a message takes between about 3 and 22 minutes." },
      { q: "Light travels 300,000 km a second. How far does it go in 100 seconds?", choices: ["3,000,000 km", "30,000,000 km", "300,100 km"], answer: 1, hint: "300,000 × 100", explain: "300,000 × 100 = 30,000,000 km: thirty million kilometres." },
      { q: "Why does the distance between the Earth and Mars keep changing?", choices: ["They travel round the Sun at different speeds", "Mars keeps getting bigger", "The Earth sometimes stops"], answer: 0, hint: "Think of runners on a track.", explain: "The two planets go round the Sun at different speeds, so sometimes they are close and sometimes far apart." }
    ]
  },

  // ───────────── Terrace 7: Caldera Rim (about age 12–13) ─────────────
  {
    id: 'p7-mars-olympus',
    subject: 'physics',
    floor: 7,
    realm: 'mars',
    title: "Olympus Mons and the Giant Canyon",
    topic: 'mars-volcanoes',
    topicName: 'Volcanoes and canyons',
    blurb: "Stand on the rim of the tallest volcano in the solar system, and melt and freeze things in the lab.",
    reading: [
      { title: "The tallest volcano", emoji: '🌋', text: "Olympus Mons on Mars is the tallest volcano in the solar system: about 22 km high, two and a half times as tall as Mount Everest, and about 600 km wide. It has been quiet for millions of years." },
      { title: "Why so big?", emoji: '🤔', text: "On Earth the ground is broken into plates that slowly move, so a volcano drifts away from the hot spot beneath it. Mars's crust stayed still, so lava kept piling up in the same place for a very long time. Mars's gentler gravity helped it grow tall, too." },
      { title: "Melted rock", emoji: '🔥', text: "Lava is rock so hot that it has melted into a liquid. When it cools, it turns back into solid rock, just like water freezing into ice." },
      { title: "A giant canyon", emoji: '🏞️', text: "Valles Marineris is a canyon system about 4,000 km long and up to 7 km deep. It's named after Mariner 9, the spacecraft that found it." }
    ],
    sim: {
      id: 'states',
      predict: {
        q: "You heat a block of ice in the beaker. What happens first?",
        choices: ["It melts into water", "It turns straight into rock", "It gets colder"],
        answer: 0,
        explain: "Heat turns solid ice into liquid water. Rock does the same at much higher temperatures: it melts into lava, and lava piled up for ages to build Olympus Mons."
      }
    },
    quiz: [
      { q: "How tall is Olympus Mons?", choices: ["About 22 km, two and a half times Everest", "About 22 metres", "About as tall as a house"], answer: 0, hint: "The tallest volcano in the solar system.", explain: "Olympus Mons is about 22 km high, two and a half times as tall as Mount Everest." },
      { q: "What is lava?", choices: ["Frozen water", "Rock so hot it has melted", "Red dust"], answer: 1, hint: "A liquid that cools into solid rock.", explain: "Lava is rock so hot that it has melted into a liquid." },
      { q: "Why could Olympus Mons grow so big?", choices: ["Martians built it", "It rains lava on Mars", "Mars's crust stayed still over the hot spot, and its gravity is gentler"], answer: 2, hint: "On Earth, plates carry volcanoes away from their hot spots.", explain: "Mars's crust stayed still, so lava piled up in one place, and gentler gravity let it grow tall." },
      { q: "What is Valles Marineris?", choices: ["A giant canyon about 4,000 km long", "A Martian moon", "A rover"], answer: 0, hint: "Up to 7 km deep.", explain: "Valles Marineris is a giant canyon system about 4,000 km long." },
      { q: "Which spacecraft is Valles Marineris named after?", choices: ["Viking 1", "Mariner 9", "Sojourner"], answer: 1, hint: "The spacecraft that found it, in 1971.", explain: "It is named after Mariner 9, which mapped Mars and found the canyon." }
    ]
  },
  {
    id: 'p7-mars-launch-windows',
    subject: 'physics',
    floor: 7,
    realm: 'mars',
    title: "The Road to Mars: Orbits and Launch Windows",
    topic: 'mars-orbits',
    topicName: 'Orbits and the trip to Mars',
    blurb: "Launch a moon round a planet, and find out why Mars missions leave in bunches every 26 months.",
    reading: [
      { title: "Racing round the Sun", emoji: '☀️', text: "The Earth and Mars both orbit the Sun. The Earth is on an inside lane and goes round faster, once a year. Mars takes about 687 days." },
      { title: "Launch windows", emoji: '🪟', text: "The best time to launch is when the Earth is about to catch up with Mars. That happens about every 26 months, so Mars missions leave in bunches, like the three that left in 2020." },
      { title: "A curved path", emoji: '↪️', text: "Spacecraft don't fly in a straight line to Mars. They swing out on a curved orbit round the Sun that meets Mars about seven months later." },
      { title: "Speed and gravity", emoji: '🎯', text: "An orbit is a balance between speed and gravity's pull. Speed up, and you swing out to a bigger orbit; slow down, and you drop to a smaller one. Spacecraft change orbits by firing their engines." }
    ],
    sim: {
      id: 'orbit',
      predict: {
        q: "You launch the moon sideways too slowly. What will happen?",
        choices: ["It flies off into space", "It falls into the planet", "It orbits faster"],
        answer: 1,
        explain: "Too slow, and gravity pulls it in. To reach a bigger orbit, like the path out to Mars, a spacecraft must speed up."
      }
    },
    quiz: [
      { q: "How long does Mars take to go once round the Sun?", choices: ["About 687 days", "About 30 days", "About 10 years"], answer: 0, hint: "Nearly two Earth years.", explain: "Mars takes about 687 Earth days to orbit the Sun." },
      { q: "About how often does a Mars launch window come round?", choices: ["Every week", "About every 26 months", "Every 100 years"], answer: 1, hint: "A little over two years.", explain: "The Earth catches up with Mars about every 26 months." },
      { q: "About how long does the trip to Mars take with today's rockets?", choices: ["About 7 hours", "About 7 years", "About 7 months"], answer: 2, hint: "Perseverance left in July and landed in February.", explain: "The trip takes about seven months." },
      { q: "What happens if something in orbit goes much too fast?", choices: ["It falls in", "It flies away", "It stops"], answer: 1, hint: "Gravity can't bend its path round enough.", explain: "Too fast, and it escapes, flying away from the planet." },
      { q: "Why did three Mars missions launch in 2020?", choices: ["It was a launch window, when the trip is easiest", "Mars was on fire", "Rockets were on sale"], answer: 0, hint: "The Earth was about to catch up with Mars.", explain: "2020 was a launch window, when the Earth and Mars were lined up for the easiest trip." }
    ]
  }
];

/** Mars's 42 lessons: two per subject on each of the seven terraces. */
export const MARS_LESSONS = [...MARS_MATH, ...MARS_HISTORY, ...MARS_PHYSICS];
