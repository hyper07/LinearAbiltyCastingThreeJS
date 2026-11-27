/**
 * The Sky Castle's lessons (the Sky Castle study world, maps.js): seven
 * streets winding up a white castle town on a floating island, each with the
 * Clock Tower School (math), the Library Hall (history) and the Inventor's
 * Workshop (physics) — the same three kinds of lesson as the land, all-new
 * castle, medieval and sky stories. Every lesson has realm: 'castle'; its
 * floor is its street (1–7), and its stars open the streets, never the land
 * floors.
 *
 * Streets: 1 Gatehouse Market ⛲, 2 Ribbon Lane 🎀, 3 Dragon Court 🐉,
 * 4 Bell Tower Walk 🔔, 5 Sundial Garden ☀️, 6 Balloon Bastion 🎈, 7 Crown Garden 👑.
 *
 * Castle Math uses the land's chalkboard and practice generators for the
 * same floor (math.js), but its check is a fixed set of written castle word
 * problems. History is world-wide and mostly medieval (about 500–1500), plus
 * the first balloon flights; it is about daily life, building, learning and
 * invention — no battles, sieges or frightening stories. Dates long ago say
 * "about"; numbers are rounded for children.
 */

/* ------------------------------------------------------------ Castle Math (the Clock Tower School) */

/** A Castle Math lesson: the land generator `gen` draws the board and the practice; the quiz is written. */
const M = (id, floor, title, gen, topicName, blurb, kind, reading, quiz) => ({
  id, subject: 'math', floor, realm: 'castle', title, topic: gen, topicName, blurb, reading,
  board: { gen }, practice: { kind, gen }, quiz
});

const CASTLE_MATH = [
  // ───────────── Street 1: Gatehouse Market (about age 6–7) ─────────────
  M('m1-castle-towers-flags', 1, "Counting Towers and Flags", 'count', 'Counting', "Count the towers, flags and round windows of the Sky Castle.", 'count', [
    { title: "Towers and flags", emoji: '🏰', text: "The Sky Castle has lots of towers, and every tower has a flag on top. Let's count them! Point to each one once and say one number." },
    { title: "Shapes in the castle", emoji: '🔺', text: "Look closely: the flags are triangles with 3 sides, the windows are circles, and the tower roofs are pointy cones." },
    { title: "The last number", emoji: '🔢', text: "When you have counted everything, the last number you said tells you how many there are." }
  ], [
    { q: "How many flags can you see? 🚩🚩🚩🚩🚩🚩🚩", choices: ["7", "6", "8"], answer: 0, hint: "Point to each flag once as you count.", explain: "1, 2, 3, 4, 5, 6, 7. There are 7 flags." },
    { q: "A triangle flag has how many sides?", choices: ["4", "3", "2"], answer: 1, hint: "Run your finger round the edge and count the straight sides.", explain: "A triangle always has 3 sides." },
    { q: "Count the little castles on the banner: 🏰🏰🏰🏰🏰🏰🏰🏰🏰🏰🏰🏰. How many are there?", choices: ["11", "13", "12"], answer: 2, hint: "Count the first 10, then keep going.", explain: "10, then 11, 12. There are 12 castles." },
    { q: "The guard counts the steps: 16, 17, 18. What number comes next?", choices: ["19", "20", "17"], answer: 0, hint: "What number comes just after 18?", explain: "After 18 comes 19." },
    { q: "What shape are the round castle windows?", choices: ["Triangles", "Circles", "Squares"], answer: 1, hint: "They are round, with no corners.", explain: "Round windows are circles." }
  ]),
  M('m1-castle-market-buns', 1, "Buns at the Market", 'sub10', 'Subtracting within 10', "The baker sells buns at the castle market. How many are left?", 'numberline', [
    { title: "Market day", emoji: '🧺', text: "Every week the castle town has a market. The baker brings warm buns, and people come to buy them." },
    { title: "Taking away", emoji: '➖', text: "When a bun is sold, there is one fewer on the tray. Taking away tells us how many are left." },
    { title: "Hop back", emoji: '🐾', text: "On the number line, start at the first number and hop back once for each one taken away. Where you land is the answer." }
  ], [
    { q: "The baker has 8 buns. She sells 3. How many are left?", choices: ["5", "11", "4"], answer: 0, hint: "Start at 8 and hop back 3.", explain: "8 − 3 = 5. There are 5 buns left." },
    { q: "There are 10 apples on the stall. 4 are sold. How many are left?", choices: ["14", "6", "5"], answer: 1, hint: "Start at 10 and hop back 4.", explain: "10 − 4 = 6 apples." },
    { q: "7 geese are at the market. 2 waddle home. How many geese are still there?", choices: ["9", "4", "5"], answer: 2, hint: "Start at 7 and hop back 2.", explain: "7 − 2 = 5 geese." },
    { q: "The baker has 6 pies and sells all 6. How many are left?", choices: ["0", "6", "12"], answer: 0, hint: "If you take all of them away…", explain: "6 − 6 = 0. None left, so the baker can go home!" },
    { q: "There were 9 buns. Now there are 5. How many were sold?", choices: ["4", "14", "5"], answer: 0, hint: "Count up from 5 to 9.", explain: "5 and 4 more make 9, so 4 buns were sold." }
  ]),

  // ───────────── Street 2: Ribbon Lane (about age 7–8) ─────────────
  M('m2-castle-roman-numerals', 2, "Roman Numerals on the Clock Tower", 'tens-ones', 'Place value', "Read the old numbers on the clock face, and see why tens and ones make our numbers easier.", 'place-value', [
    { title: "Letters for numbers", emoji: '🕰️', text: "Many old clocks show Roman numerals: numbers written with letters. I means 1, V means 5 and X means 10." },
    { title: "Add them up", emoji: '➕', text: "Put the letters together and add them: XII is 10 + 1 + 1 = 12. XXIII is 10 + 10 + 1 + 1 + 1 = 23." },
    { title: "One before", emoji: '⬅️', text: "A smaller letter in front of a bigger one means take it away: IV is 1 before 5, which is 4, and IX is 1 before 10, which is 9." },
    { title: "Tens and ones", emoji: '🔢', text: "Our numbers use places instead. In 23, the 2 means 2 tens and the 3 means 3 ones, so it is short and easy to read." }
  ], [
    { q: "What number is XII on the clock?", choices: ["12", "21", "3"], answer: 0, hint: "X is 10 and each I is 1.", explain: "X + I + I = 10 + 1 + 1 = 12." },
    { q: "What number is XXV?", choices: ["52", "25", "7"], answer: 1, hint: "Two X's and a V.", explain: "10 + 10 + 5 = 25." },
    { q: "In the number 47, what does the 4 mean?", choices: ["4 ones", "4 hundreds", "4 tens"], answer: 2, hint: "The 4 is in the tens place.", explain: "The 4 is in the tens place, so it means 4 tens, or 40." },
    { q: "IV means 1 before 5. What number is it?", choices: ["4", "6", "15"], answer: 0, hint: "Take 1 away from 5.", explain: "IV is 5 take away 1, so it is 4. (Some clocks write it IIII instead!)" },
    { q: "How many tens are in XXX?", choices: ["3", "30", "1", "10"], answer: 0, hint: "Each X is one ten.", explain: "XXX is three X's, so 3 tens: 30." }
  ]),
  M('m2-castle-bell-chimes', 2, "Bell Chimes in 2s, 5s and 10s", 'skip-count', 'Counting in 2s, 5s and 10s', "Count the clock's minutes in fives, the bells in twos and the tower steps in tens.", 'numberline', [
    { title: "Fives on the clock", emoji: '🕰️', text: "The big clock face has 12 numbers. The minute hand takes 5 minutes to go from one number to the next: 5, 10, 15, 20…" },
    { title: "Bells in pairs", emoji: '🔔', text: "The bell ringers ring two bells at a time. Counting in twos is quick: 2, 4, 6, 8, 10." },
    { title: "Steps in tens", emoji: '🪜', text: "The bell tower has lots of steps. Every tenth step has a little window: 10, 20, 30, 40…" }
  ], [
    { q: "Count in fives: 5, 10, 15, 20, … What comes next?", choices: ["21", "25", "30"], answer: 1, hint: "Add 5 more.", explain: "20 and 5 more is 25." },
    { q: "The minute hand points at the 3. How many minutes past the hour is it?", choices: ["3", "15", "30"], answer: 1, hint: "Count in fives: one five for each number.", explain: "5, 10, 15. It is 15 minutes past." },
    { q: "Count in twos: 2, 4, 6, 8, … What comes next?", choices: ["9", "12", "10"], answer: 2, hint: "Add 2 more.", explain: "8 and 2 more is 10." },
    { q: "Count in tens: 10, 20, 30, 40, … What comes next?", choices: ["50", "41", "400"], answer: 0, hint: "Add 10 more.", explain: "40 and 10 more is 50." },
    { q: "4 pairs of bells ring. How many bells is that?", choices: ["6", "8", "4", "10"], answer: 1, hint: "Count in twos 4 times.", explain: "2, 4, 6, 8. That's 8 bells." }
  ]),

  // ───────────── Street 3: Dragon Court (about age 8–9) ─────────────
  M('m3-castle-floor-tiles', 3, "Floor Tiles in Rows", 'times', 'Times tables', "Lay tiles in rows for the castle's great hall, and find shapes that fit together with no gaps.", 'array', [
    { title: "Rows of tiles", emoji: '🔲', text: "Castle floors were often laid with tiles. 4 rows of 5 tiles make an array: 4 × 5 = 20 tiles." },
    { title: "No gaps!", emoji: '🧩', text: "Squares, triangles and hexagons can fit together with no gaps between them. A pattern like that is called a tessellation." },
    { title: "Mirror patterns", emoji: '🪞', text: "Many tile patterns are symmetrical: fold them down the middle, and one half matches the other, like a reflection in a mirror." },
    { title: "Turn it round", emoji: '🔄', text: "3 × 6 is the same as 6 × 3. Turn the array on its side, and there are still 18 tiles." }
  ], [
    { q: "A floor has 5 rows of 6 tiles. How many tiles is that?", choices: ["11", "30", "25"], answer: 1, hint: "5 × 6", explain: "5 × 6 = 30 tiles." },
    { q: "Which shape fits together with no gaps, like floor tiles?", choices: ["Circles", "Squares", "Stars"], answer: 1, hint: "Circles always leave little gaps between them.", explain: "Squares fit together with no gaps. Circles and stars leave gaps." },
    { q: "There are 7 rows of 4 tiles. How many tiles?", choices: ["28", "24", "11"], answer: 0, hint: "7 × 4: double 7, then double again.", explain: "7 × 4 = 28 tiles." },
    { q: "Which is the same as 8 × 3?", choices: ["8 + 3", "3 × 8", "8 × 8"], answer: 1, hint: "Turning an array round doesn't change how many.", explain: "8 × 3 and 3 × 8 both make 24." },
    { q: "A hall needs 9 rows of 5 tiles. How many tiles?", choices: ["40", "14", "45", "54"], answer: 2, hint: "Count in fives 9 times, or work out 10 × 5 and take away one 5.", explain: "9 × 5 = 45 tiles." }
  ]),
  M('m3-castle-clock-fractions', 3, "Half Past and Quarter Past", 'fractions', 'Fractions', "Cut the clock face into halves and quarters to tell the time on the clock tower.", 'pizza', [
    { title: "A clock is a circle", emoji: '🕰️', text: "The minute hand goes all the way round the clock in one hour: 60 minutes." },
    { title: "Half past", emoji: '🌗', text: "When the minute hand has gone half way round, it points at the 6. Half an hour is 30 minutes, so it is half past." },
    { title: "Quarter past, quarter to", emoji: '🍕', text: "Cut the clock into 4 equal parts. One quarter of an hour is 15 minutes. At quarter past, the minute hand points at the 3; at quarter to, it points at the 9." }
  ], [
    { q: "How many minutes are in half an hour?", choices: ["15", "30", "60"], answer: 1, hint: "Half of 60.", explain: "Half of 60 minutes is 30 minutes." },
    { q: "How many minutes are in a quarter of an hour?", choices: ["15", "25", "4"], answer: 0, hint: "60 minutes shared into 4 equal parts.", explain: "60 ÷ 4 = 15 minutes." },
    { q: "The minute hand points at the 6. What time is it?", choices: ["O'clock", "Quarter past", "Half past"], answer: 2, hint: "The hand has gone half way round.", explain: "Half way round the clock is half past." },
    { q: "A pie is cut into 4 equal slices. You eat 1. What fraction did you eat?", choices: ["1/2", "1/4", "4/1"], answer: 1, hint: "1 slice out of 4 equal slices.", explain: "You ate 1 of 4 equal slices: 1/4, one quarter." },
    { q: "Which is longer: half an hour or a quarter of an hour?", choices: ["Half an hour", "A quarter of an hour", "They are the same"], answer: 0, hint: "Fewer pieces means bigger pieces.", explain: "Half an hour is 30 minutes; a quarter of an hour is only 15." }
  ]),

  // ───────────── Street 4: Bell Tower Walk (about age 9–10) ─────────────
  M('m4-castle-feet-thumbs', 4, "Feet, Thumbs and Paces", 'mult-2x1', '2-digit × 1-digit', "Long ago people measured with their bodies. Multiply old measures to build a castle.", 'grid', [
    { title: "Body measures", emoji: '🦶', text: "Long ago, people measured with their bodies: a thumb's width, a foot, an arm's length. But everyone's feet are a different size!" },
    { title: "Making them the same", emoji: '📏', text: "So towns kept official measuring rods, and the inch, the foot and the yard became set lengths. In England, a foot was 12 inches, and a yard was 3 feet." },
    { title: "Thumbs and inches", emoji: '👍', text: "An inch is about the width of a grown-up's thumb. The word comes from a Latin word meaning 'a twelfth part', because 12 inches make a foot." },
    { title: "Split and multiply", emoji: '✂️', text: "To work out 14 × 3, split 14 into 10 and 4: 10 × 3 = 30 and 4 × 3 = 12, so 14 × 3 = 42." }
  ], [
    { q: "A foot is 12 inches. How many inches are in 3 feet?", choices: ["15", "36", "32"], answer: 1, hint: "12 × 3: try 10 × 3 and 2 × 3.", explain: "10 × 3 = 30 and 2 × 3 = 6, so 36 inches." },
    { q: "One wall is 24 feet long. How long are 4 walls like it, end to end?", choices: ["96 feet", "28 feet", "86 feet"], answer: 0, hint: "20 × 4 and 4 × 4.", explain: "20 × 4 = 80 and 4 × 4 = 16. 80 + 16 = 96 feet." },
    { q: "A yard is 3 feet. How many feet are 15 yards?", choices: ["18", "35", "45"], answer: 2, hint: "10 × 3 and 5 × 3.", explain: "10 × 3 = 30 and 5 × 3 = 15, so 45 feet." },
    { q: "Why did towns keep official measuring rods?", choices: ["So everyone used the same lengths", "To stir the soup", "To ring the bells"], answer: 0, hint: "Everyone's feet are a different size.", explain: "With one official rod to check against, everyone's foot or yard was the same length, so buying and building was fair." },
    { q: "A mason cuts 16 stones a day. How many does he cut in 5 days?", choices: ["21", "80", "70", "56"], answer: 1, hint: "10 × 5 and 6 × 5.", explain: "10 × 5 = 50 and 6 × 5 = 30. 50 + 30 = 80 stones." }
  ]),
  M('m4-castle-feast-sharing', 4, "Sharing the Castle Feast", 'division', 'Division', "Share pies, bread and benches fairly at the great hall's feast.", 'array', [
    { title: "A feast in the great hall", emoji: '🍗', text: "On feast days, the people of the castle ate together in the great hall, at long tables, with music and stories." },
    { title: "Sharing fairly", emoji: '➗', text: "Division means sharing into equal groups. 12 pies shared by 4 tables is 12 ÷ 4 = 3 pies on each table." },
    { title: "Times tables help", emoji: '✖️', text: "Division is multiplication backwards. 4 × 3 = 12, so 12 ÷ 4 = 3." },
    { title: "Left over", emoji: '🥧', text: "Sometimes things don't share out exactly. 13 pies on 4 tables is 3 each, with 1 left over. That one is called the remainder." }
  ], [
    { q: "24 bread rolls are shared between 6 tables. How many on each table?", choices: ["4", "18", "30"], answer: 0, hint: "6 × what = 24?", explain: "6 × 4 = 24, so 4 rolls on each table." },
    { q: "35 guests sit on benches that hold 5 each. How many benches are needed?", choices: ["30", "7", "40"], answer: 1, hint: "How many 5s make 35?", explain: "5 × 7 = 35, so 7 benches." },
    { q: "18 apples go into 3 baskets equally. How many in each?", choices: ["15", "21", "6"], answer: 2, hint: "3 × what = 18?", explain: "3 × 6 = 18, so 6 apples in each basket." },
    { q: "13 pies go to 4 tables equally. How many are left over?", choices: ["1", "3", "0"], answer: 0, hint: "4 × 3 = 12.", explain: "Each table gets 3 pies (12 in all), and 1 pie is left over." },
    { q: "Which times fact helps with 42 ÷ 7?", choices: ["7 × 6 = 42", "7 + 6 = 13", "42 − 7 = 35"], answer: 0, hint: "Division is multiplication backwards.", explain: "7 × 6 = 42, so 42 ÷ 7 = 6." }
  ]),

  // ───────────── Street 5: Sundial Garden (about age 10–11) ─────────────
  M('m5-castle-walls-gardens', 5, "Castle Walls and Herb Gardens", 'area', 'Area and perimeter', "Walk round the castle walls for the perimeter, and plant herb beds to find the area.", 'grid', [
    { title: "Round the walls", emoji: '🧱', text: "Guards walked along the tops of castle walls. The distance all the way round a shape is called its perimeter." },
    { title: "Gardens inside", emoji: '🌿', text: "Castles had gardens for herbs, flowers and vegetables. The space inside a garden bed is its area, measured in square metres." },
    { title: "Rectangles", emoji: '🟩', text: "For a rectangle 8 m long and 3 m wide, the perimeter is 8 + 3 + 8 + 3 = 22 m, and the area is 8 × 3 = 24 square metres." }
  ], [
    { q: "A courtyard is 10 m long and 6 m wide. What is its perimeter?", choices: ["32 m", "60 m", "16 m"], answer: 0, hint: "Add up all four sides.", explain: "10 + 6 + 10 + 6 = 32 m." },
    { q: "A herb bed is 5 m long and 4 m wide. What is its area?", choices: ["9 square metres", "20 square metres", "18 square metres"], answer: 1, hint: "Multiply length × width.", explain: "5 × 4 = 20 square metres." },
    { q: "A square tower is 7 m along each side. How far is it all the way round?", choices: ["14 m", "49 m", "28 m"], answer: 2, hint: "A square has 4 equal sides.", explain: "4 × 7 = 28 m." },
    { q: "Each rose bush needs 1 square metre. How many fit in a bed 6 m long and 3 m wide?", choices: ["18", "9", "12"], answer: 0, hint: "Find the area of the bed.", explain: "6 × 3 = 18 square metres, so 18 rose bushes fit." },
    { q: "Which tells you how much fence you need to go round a garden?", choices: ["Area", "Perimeter", "Height"], answer: 1, hint: "'Peri' means 'around'.", explain: "The perimeter is the distance round the edge, so it tells you how long the fence must be." }
  ]),
  M('m5-castle-banner-decimals', 5, "Banners and Ribbons in Tenths", 'decimals', 'Decimals', "Measure banners and maypole ribbons in metres and tenths.", 'numberline', [
    { title: "Between the metres", emoji: '📏', text: "Banners aren't always a whole number of metres long. A banner 1.5 m long is 1 whole metre and 5 tenths more." },
    { title: "Tenths", emoji: '🔟', text: "Cut a metre into 10 equal parts, and each part is one tenth: 0.1 m, which is 10 cm." },
    { title: "Adding decimals", emoji: '➕', text: "Line up the decimal points. 2.4 m of red ribbon and 1.3 m of blue ribbon make 3.7 m of ribbon." },
    { title: "Comparing", emoji: '⚖️', text: "To compare 2.6 and 2.9, look at the wholes first. They are both 2, so look at the tenths: 9 tenths is more than 6 tenths." }
  ], [
    { q: "Which banner is longer: 2.6 m or 2.9 m?", choices: ["2.6 m", "2.9 m"], answer: 1, hint: "The wholes are the same, so compare the tenths.", explain: "9 tenths is more than 6 tenths, so 2.9 m is longer." },
    { q: "What does 3.4 mean?", choices: ["3 wholes and 4 tenths", "34 wholes", "3 wholes and 4 hundreds"], answer: 0, hint: "The digit after the point is tenths.", explain: "3.4 is 3 wholes and 4 tenths." },
    { q: "A 1.5 m ribbon and a 2.3 m ribbon are tied together. How long is that?", choices: ["3.5 m", "38 m", "3.8 m"], answer: 2, hint: "Add the wholes, then the tenths.", explain: "1 + 2 = 3 and 0.5 + 0.3 = 0.8, so 3.8 m." },
    { q: "A banner is 4.7 m long. 1.2 m is cut off. How long is it now?", choices: ["3.5 m", "5.9 m", "3.7 m"], answer: 0, hint: "4 − 1, then 0.7 − 0.2.", explain: "4 − 1 = 3 and 0.7 − 0.2 = 0.5, so 3.5 m." },
    { q: "How many tenths make one whole?", choices: ["5", "100", "10", "1"], answer: 2, hint: "Cut a metre into equal tenths.", explain: "10 tenths make 1 whole." }
  ]),

  // ───────────── Street 6: Balloon Bastion (about age 11–12) ─────────────
  M('m6-castle-cold-heights', 6, "Colder Up High", 'negatives', 'Negative numbers', "The higher you go, the colder the air. Count below zero on the way up to the Sky Castle.", 'numberline', [
    { title: "Colder as you climb", emoji: '🏔️', text: "Air gets colder the higher you go: about 6 or 7 degrees colder for every 1,000 metres up. That's why tall mountains can have snow on top, even in summer." },
    { title: "Below zero", emoji: '🌡️', text: "Temperatures below 0 °C are negative numbers. −8 °C is colder than −3 °C, because it is further below zero." },
    { title: "Up to the Sky Castle", emoji: '☁️', text: "If it is 12 °C by the river below, and the Sky Castle floats 3,000 metres up, it could be about 20 degrees colder there: about −8 °C. Wrap up warm!" },
    { title: "Use a number line", emoji: '📏', text: "To go down 9 degrees from 5 °C, count down 5 to reach 0, then 4 more: −4 °C." }
  ], [
    { q: "Which is colder: −12 °C or −5 °C?", choices: ["−12 °C", "−5 °C"], answer: 0, hint: "Further below zero is colder.", explain: "−12 °C is 12 degrees below zero, colder than −5 °C." },
    { q: "It is 4 °C, then the temperature drops by 10 degrees. What is it now?", choices: ["6 °C", "−6 °C", "−14 °C"], answer: 1, hint: "Count down 4 to reach 0, then keep going.", explain: "4 down to 0, then 6 more: −6 °C." },
    { q: "It is −7 °C at night and 5 °C at noon. What is the difference?", choices: ["2 degrees", "12 degrees", "−2 degrees"], answer: 1, hint: "−7 up to 0, then on to 5.", explain: "7 + 5 = 12 degrees." },
    { q: "About how much colder does the air get for every 1,000 m you climb?", choices: ["About 6 or 7 degrees", "About 50 degrees", "It gets warmer"], answer: 0, hint: "Enough for snow on high mountains.", explain: "The air gets about 6 or 7 degrees colder for every 1,000 m up." },
    { q: "The thermometer reads −9 °C. It warms up by 4 degrees. What does it read now?", choices: ["−13 °C", "−5 °C", "5 °C", "13 °C"], answer: 1, hint: "Warming up means moving towards zero.", explain: "−9 + 4 = −5 °C." }
  ]),
  M('m6-castle-fair-percent', 6, "Percentages at the Castle Fair", 'percent', 'Percentages', "Bargains, prizes and crowds: find percentages at the castle's summer fair.", 'grid', [
    { title: "Out of 100", emoji: '💯', text: "Per cent means 'out of 100'. 50% is a half, 25% is a quarter, and 10% is one tenth." },
    { title: "Fair day", emoji: '🎪', text: "Many medieval towns held a big fair once a year, with jugglers, music and traders bringing cloth, spices and treasures from far away." },
    { title: "Finding 10%", emoji: '🧮', text: "To find 10%, divide by 10. 10% of 80 coins is 8 coins. To find 20%, double it: 16 coins." },
    { title: "Money off", emoji: '🏷️', text: "If a stall takes 25% off a 40-coin cloak, it costs 10 coins less: 30 coins." }
  ], [
    { q: "What is 10% of 60 coins?", choices: ["6 coins", "50 coins", "600 coins"], answer: 0, hint: "Divide by 10.", explain: "60 ÷ 10 = 6 coins." },
    { q: "A juggler drops the ball 3 times in 100 throws. What percentage of throws did he drop?", choices: ["30%", "3%", "97%"], answer: 1, hint: "Per cent means out of 100.", explain: "3 out of 100 is 3%." },
    { q: "A cloak costs 20 coins. The stall takes 50% off. What does it cost now?", choices: ["15 coins", "40 coins", "10 coins"], answer: 2, hint: "50% is a half.", explain: "Half of 20 is 10, so it costs 10 coins." },
    { q: "200 people come to the fair, and 25% of them are children. How many children is that?", choices: ["50", "25", "75"], answer: 0, hint: "25% is a quarter.", explain: "A quarter of 200 is 50 children." },
    { q: "A pie is 30% eaten. What percentage is left?", choices: ["30%", "70%", "130%", "3%"], answer: 1, hint: "The whole pie is 100%.", explain: "100% − 30% = 70% is left." }
  ]),

  // ───────────── Street 7: Crown Garden (about age 12–13) ─────────────
  M('m7-castle-clockwork-equations', 7, "Clockwork Equations", 'two-step', 'Two-step equations', "Solve the clockmaker's puzzles about gears and bells by undoing two steps.", 'balance', [
    { title: "Inside the clock", emoji: '⚙️', text: "A clock tower is full of gears: wheels with teeth that turn each other. Clockmakers count the teeth so that each hand turns at just the right speed." },
    { title: "Two steps", emoji: '🧩', text: "In 4x + 6 = 30, a mystery number x was multiplied by 4, and then 6 was added. To find x, undo the steps in reverse order." },
    { title: "Undo, undo", emoji: '↩️', text: "Take 6 from both sides: 4x = 24. Then divide both sides by 4: x = 6. Check it: 4 × 6 + 6 = 30 ✓." }
  ], [
    { q: "Solve 5x + 4 = 39.", choices: ["7", "8", "43"], answer: 0, hint: "Take away 4, then divide by 5.", explain: "5x = 35, so x = 7. Check: 5 × 7 + 4 = 39." },
    { q: "A gear has x teeth. Three of these gears and one 12-tooth gear have 72 teeth in all: 3x + 12 = 72. What is x?", choices: ["24", "20", "28"], answer: 1, hint: "Take away 12, then divide by 3.", explain: "3x = 60, so x = 20 teeth." },
    { q: "Solve 7x − 5 = 51.", choices: ["6", "7", "8"], answer: 2, hint: "Add 5, then divide by 7.", explain: "7x = 56, so x = 8. Check: 7 × 8 − 5 = 51." },
    { q: "A bell rings x times every hour. In 6 hours, plus 2 extra rings for a wedding, it rings 26 times: 6x + 2 = 26. What is x?", choices: ["4", "5", "3", "6"], answer: 0, hint: "Take away 2, then divide by 6.", explain: "6x = 24, so x = 4 rings an hour." },
    { q: "What is the first step to solve 2x + 9 = 25?", choices: ["Take 9 from both sides", "Divide 25 by 9", "Add 2 to both sides"], answer: 0, hint: "Undo the last thing that was done to x.", explain: "Take 9 from both sides to get 2x = 16, then divide by 2: x = 8." }
  ]),
  M('m7-castle-fibonacci', 7, "Fibonacci's Squares and Spirals", 'squares', 'Squares and roots', "Meet Fibonacci's famous number pattern, and build a spiral out of squares.", 'grid', [
    { title: "Fibonacci's book", emoji: '📖', text: "In 1202, Leonardo of Pisa, known as Fibonacci, finished a book called Liber Abaci. It helped people in Europe use the digits 0 to 9, which came from India by way of the Arab world, instead of Roman numerals." },
    { title: "A famous pattern", emoji: '🐇', text: "His book has a puzzle about rabbits that gives the pattern 1, 1, 2, 3, 5, 8, 13, 21… Each number is the two before it added together." },
    { title: "Squares in a spiral", emoji: '🌀', text: "Draw squares with sides 1, 1, 2, 3, 5 and 8, and they fit together into a rectangle 8 by 13. Their areas are square numbers: 1, 1, 4, 9, 25 and 64." },
    { title: "Square roots", emoji: '√', text: "A square root undoes squaring: √64 = 8, because 8 × 8 = 64. So a square with an area of 64 has sides 8 long." }
  ], [
    { q: "What comes next: 1, 1, 2, 3, 5, 8, 13, …?", choices: ["21", "18", "26"], answer: 0, hint: "Add the two numbers before.", explain: "8 + 13 = 21." },
    { q: "A square in the spiral has sides of 13. What is its area?", choices: ["26", "169", "139"], answer: 1, hint: "13 × 13", explain: "13² = 13 × 13 = 169." },
    { q: "A square of tiles has an area of 121. How long is each side?", choices: ["12", "60.5", "11"], answer: 2, hint: "Which number times itself makes 121?", explain: "11 × 11 = 121, so each side is 11." },
    { q: "√30 is between which two whole numbers?", choices: ["5 and 6", "4 and 5", "6 and 7"], answer: 0, hint: "5² = 25 and 6² = 36.", explain: "25 < 30 < 36, so √30 is between 5 and 6." },
    { q: "What did Fibonacci's book help people in Europe start using?", choices: ["Roman numerals", "The digits 0 to 9", "Clocks"], answer: 1, hint: "The digits we write numbers with today.", explain: "Liber Abaci helped spread the digits 0 to 9, which came from India through the Arab world." }
  ])
];

/* ------------------------------------------------------------ The Library Hall (history) */

const CASTLE_HISTORY = [
  // ───────────── Street 1: Gatehouse Market (about age 6–7) ─────────────
  {
    id: 'h1-castle-market-day',
    subject: 'history',
    floor: 1,
    realm: 'castle',
    title: "Market Day in the Castle Town",
    topic: 'market-towns',
    topicName: 'Medieval market towns',
    blurb: "Help a baker at a busy medieval market: bread, eggs, wool and the church bells.",
    reading: [
      { title: "Towns by the castle", emoji: '🏘️', text: "Long ago, many towns grew up next to castles. People came to live there, to work and to trade." },
      { title: "Market day", emoji: '🧺', text: "Once a week the town had a market. Farmers brought eggs, cheese, wool and vegetables, and bakers sold bread." },
      { title: "Fair rules", emoji: '⚖️', text: "There were rules to keep the market fair. A loaf of bread had to weigh the right amount, and traders' weights were checked." },
      { title: "Bells for the time", emoji: '🔔', text: "Most people had no clocks. The church bells rang to tell everyone when it was time to open the market, to pray or to stop work." }
    ],
    dialogue: {
      npc: { name: "Agnes", role: "a baker at the castle market", look: 'baker', portrayal: 'generic' },
      intro: "Good morning, little one! Mind the flour! It's market day, and my buns are still warm. Shall I tell you about our market?",
      topics: [
        { ask: "What can people buy here?", answer: "Oh, everything! Eggs and cheese from the farms, wool and cloth, pots and shoes, fish and apples. And my bread, of course: the best in town!" },
        { ask: "How do people pay?", answer: "With little silver coins. Some people swap things instead: a basket of eggs for a pair of shoes, or a chicken for some cloth." },
        { ask: "Why do you stamp your loaves?", answer: "Every baker puts their own mark on their bread. If a loaf is too small, everyone knows whose it is! The town checks that loaves weigh the right amount." },
        { ask: "How do you know when to open?", answer: "I listen for the church bell! When it rings in the morning, the market opens. When it rings again in the evening, we pack up and go home." },
        { ask: "Is there a big fair too?", answer: "Once a year! Traders come from far away with spices and silk, and there are jugglers, minstrels and puppet shows. Here in the Sky Castle, even the goats dance!" }
      ],
      challenge: {
        q: "Why did bakers put their own mark on their bread?",
        choices: ["To make it taste sweeter", "So everyone knew who had baked each loaf", "To keep birds away"],
        answer: 1,
        explain: "A baker's mark showed who had baked each loaf, so the town could check that the bread was fair."
      },
      farewell: "Off you go, and take a warm bun for the road! Come back next market day."
    },
    timeline: {
      title: "Markets and fairs long ago",
      events: [
        { label: "Many new towns and markets grow up across Europe", year: 1100, when: "about 900 years ago" },
        { label: "Big yearly fairs in Champagne, France, bring traders from far away", year: 1200, when: "about 800 years ago" },
        { label: "A rule in England sets how much a loaf of bread must weigh", year: 1266, when: "1266" },
        { label: "Clocks with bells start to appear on town towers", year: 1300, when: "about 700 years ago" }
      ]
    },
    artifact: {
      model: 'market-scales',
      name: "A trader's balance scales",
      text: "Traders weighed spices, silver and wool on balance scales like these. Town officers checked the weights, so that everyone was treated fairly."
    },
    quiz: [
      { q: "How often did most towns have a market?", choices: ["Once a week", "Once every ten years", "Never"], answer: 0, hint: "It came round often, like a day of the week.", explain: "Most towns had a market once a week." },
      { q: "What did farmers bring to the market?", choices: ["Robots", "Eggs, cheese, wool and vegetables", "Bicycles"], answer: 1, hint: "Things from the farm.", explain: "Farmers brought eggs, cheese, wool and vegetables to sell." },
      { q: "How did most people know the time?", choices: ["From their phones", "From watches", "By listening for the church bells"], answer: 2, hint: "Most people had no clocks.", explain: "The church bells rang to tell everyone the time." },
      { q: "Why were traders' weights checked?", choices: ["To keep the market fair", "To make the bread heavier", "To stop the bells"], answer: 0, hint: "Nobody should be tricked.", explain: "Checking the weights made sure everyone got what they paid for." },
      { q: "What happened once a year in many towns?", choices: ["A big fair with traders from far away", "Everyone moved house", "The castle flew away"], answer: 0, hint: "There were jugglers and music too!", explain: "Once a year many towns held a big fair, with traders from far away, jugglers and music." }
    ]
  },
  {
    id: 'h1-castle-builders',
    subject: 'history',
    floor: 1,
    realm: 'castle',
    title: "Who Built the Castles?",
    topic: 'castle-building',
    topicName: 'Building castles',
    blurb: "Meet a stonemason and find out how castles were built without any machines with engines.",
    reading: [
      { title: "No engines!", emoji: '🏗️', text: "Long ago there were no trucks or engine-powered cranes. Castles were built by hundreds of people working together, with clever tools." },
      { title: "Masons and carpenters", emoji: '🔨', text: "Stonemasons cut and shaped the stones with mallets and chisels. Carpenters built wooden frames, ladders and scaffolding." },
      { title: "A wheel to lift stones", emoji: '🎡', text: "To lift heavy stones high up, workers walked inside a big wooden wheel. The turning wheel wound up a rope, like a giant hamster wheel." },
      { title: "Sticky mortar", emoji: '🪣', text: "Builders stuck the stones together with mortar, a paste made of lime, sand and water that set hard." }
    ],
    dialogue: {
      npc: { name: "Will", role: "a stonemason", look: 'mason', portrayal: 'generic' },
      intro: "Hello there! Watch your toes, these stones are heavy. I'm a stonemason. Would you like to see how we build a castle?",
      topics: [
        { ask: "What do you do?", answer: "I cut stones into neat blocks with my mallet and chisel, tap, tap, tap, so that they sit snugly on top of each other in the wall." },
        { ask: "How do you lift the stones?", answer: "With the treadwheel crane! Two workers walk inside the big wheel, and the rope winds up and lifts the stone. It's slow, but it works." },
        { ask: "What's that mark on your stone?", answer: "That's my mason's mark! Many masons carve their own little sign on the stones they cut. You can still find marks like these on old castles today." },
        { ask: "How long does a castle take?", answer: "It depends! Some castles were built in a few years with lots of workers. Big ones could take many years, and some were never quite finished." },
        { ask: "Does anyone build castles like this today?", answer: "Yes! At Guédelon in France, people have been building a castle since 1997 using only the tools and ways of long ago, to learn how it was done." }
      ],
      challenge: {
        q: "How did workers lift heavy stones high up?",
        choices: ["With a treadwheel crane", "With a helicopter", "With magic"],
        answer: 0,
        explain: "Workers walked inside a big wooden treadwheel, which wound up a rope to lift the stones."
      },
      farewell: "Thanks for visiting the building site! Next time you see an old castle, look for the masons' marks."
    },
    timeline: {
      title: "Building castles",
      events: [
        { label: "Wooden castles are built on tall mounds of earth", year: 1050, when: "about 1,000 years ago" },
        { label: "The great stone White Tower in London is begun", year: 1078, when: "about 1078" },
        { label: "Conwy Castle in Wales is built in only about four years", year: 1283, when: "1283" },
        { label: "Builders at Guédelon in France start a castle with tools from long ago", year: 1997, when: "1997" }
      ]
    },
    artifact: {
      model: 'treadwheel',
      name: "A treadwheel crane",
      text: "Workers walked inside the big wooden wheel to turn it. The wheel wound up a rope, which lifted heavy stones to the top of the walls."
    },
    quiz: [
      { q: "Who cut and shaped the stones for a castle?", choices: ["Bakers", "Stonemasons", "Knights"], answer: 1, hint: "They used mallets and chisels.", explain: "Stonemasons cut and shaped the stones." },
      { q: "What did carpenters build?", choices: ["Wooden frames, ladders and scaffolding", "Glass windows", "Stone walls"], answer: 0, hint: "Carpenters work with wood.", explain: "Carpenters built the wooden frames, ladders and scaffolding." },
      { q: "What is mortar?", choices: ["A kind of hat", "A paste that sticks stones together", "A castle dog"], answer: 1, hint: "It sets hard between the stones.", explain: "Mortar is a paste of lime, sand and water that sticks stones together." },
      { q: "How did a treadwheel crane work?", choices: ["It burned coal", "It used electricity", "People walked inside the wheel to turn it"], answer: 2, hint: "Like a giant hamster wheel.", explain: "People walked inside the wheel, and it wound up a rope to lift stones." },
      { q: "What is a mason's mark?", choices: ["A little sign a mason carved on their stones", "A dirty footprint", "A map of the castle"], answer: 0, hint: "You can still find them on old castles.", explain: "Many masons carved their own little sign on the stones they cut." }
    ]
  },

  // ───────────── Street 2: Ribbon Lane (about age 7–8) ─────────────
  {
    id: 'h2-castle-white-heron',
    subject: 'history',
    floor: 2,
    realm: 'castle',
    title: "Himeji, the White Heron Castle",
    topic: 'japanese-castles',
    topicName: 'Japanese castles',
    blurb: "Visit a gleaming white castle in Japan that looks like a bird taking off.",
    reading: [
      { title: "A white bird", emoji: '🕊️', text: "Himeji Castle in Japan is so white and graceful that people call it the White Heron Castle. It looks like a heron spreading its wings to fly." },
      { title: "Wood and plaster", emoji: '🪵', text: "The castle is built of wood on a tall stone base. Its walls are covered with thick white plaster, which helps protect the wood from fire." },
      { title: "Golden fish on the roof", emoji: '🐟', text: "On the roofs sit fish with tigers' heads, called shachihoko. People believed they would protect the castle from fire." },
      { title: "Still standing", emoji: '🏯', text: "Its great main tower was finished in 1609, more than 400 years ago. Today it is one of the best-kept old castles in Japan, and visitors come from all over the world." }
    ],
    dialogue: {
      npc: { name: "Haru", role: "a plasterer who keeps the castle's walls white", look: 'artisan', portrayal: 'generic' },
      intro: "Konnichiwa! Welcome to Himeji. I'm a plasterer: I help keep these walls as white as a heron's feathers. Shall I show you around?",
      topics: [
        { ask: "Why is the castle white?", answer: "The walls are covered in thick white plaster made with lime. It shines in the sun, and it helps keep fire away from the wooden walls inside." },
        { ask: "Why are the paths so twisty?", answer: "The paths up to the main tower wind round and round like a maze. Visitors today love getting a little bit lost!" },
        { ask: "What are the fish on the roof?", answer: "Those are shachihoko: fish with tigers' heads. Long ago people believed they could call up water to protect the castle from fire." },
        { ask: "How many floors does it have?", answer: "From outside, the main tower seems to have five floors. But inside there are even more, plus a cellar! Clever, isn't it?" },
        { ask: "Do you ever repaint it?", answer: "Yes! Not long ago, workers spent about five years repairing the roofs and walls with fresh plaster. When they finished in 2015, the castle was so bright that some people called it the 'too white' castle!" }
      ],
      challenge: {
        q: "Why is Himeji called the White Heron Castle?",
        choices: ["Herons built it", "It is white and graceful, like a heron taking off", "It is made of feathers"],
        answer: 1,
        explain: "Its white walls and sweeping roofs look like a white heron spreading its wings."
      },
      farewell: "Sayonara! If you ever go to Japan, look up and wave to the golden fish on the roof."
    },
    timeline: {
      title: "The White Heron Castle",
      events: [
        { label: "A small fort is built on the hill at Himeji", year: 1346, when: "1346" },
        { label: "The great main tower is finished", year: 1609, when: "1609" },
        { label: "Himeji Castle becomes a World Heritage Site", year: 1993, when: "1993" },
        { label: "Big repairs finish, and the castle shines white again", year: 2015, when: "2015" }
      ]
    },
    artifact: {
      model: 'shachihoko',
      name: "A golden shachihoko",
      text: "Roof ornaments shaped like a fish with a tiger's head, its tail curled high. People believed they protected a castle from fire."
    },
    quiz: [
      { q: "In which country is Himeji Castle?", choices: ["Japan", "France", "Egypt"], answer: 0, hint: "Konnichiwa!", explain: "Himeji Castle is in Japan." },
      { q: "What covers the castle's walls?", choices: ["Gold", "Thick white plaster", "Grass"], answer: 1, hint: "It keeps them white.", explain: "The walls are covered with thick white plaster." },
      { q: "What is a shachihoko?", choices: ["A kind of sword", "A castle cook", "A roof ornament: a fish with a tiger's head"], answer: 2, hint: "Look up at the roof!", explain: "Shachihoko are roof ornaments shaped like fish with tigers' heads." },
      { q: "What did the white plaster help protect the wooden castle from?", choices: ["Fire", "Birds", "Snow"], answer: 0, hint: "Wood burns easily.", explain: "The thick plaster helps protect the wooden walls from fire." },
      { q: "When was the great main tower finished?", choices: ["Last year", "In 1609, more than 400 years ago", "10,000 years ago"], answer: 1, hint: "More than 400 years ago.", explain: "The main tower was finished in 1609." }
    ]
  },
  {
    id: 'h2-castle-hangul',
    subject: 'history',
    floor: 2,
    realm: 'castle',
    title: "King Sejong's Alphabet",
    topic: 'hangul',
    topicName: 'Hangul, the Korean alphabet',
    blurb: "Find out how a kind king made an alphabet so that everyone in Korea could read and write.",
    reading: [
      { title: "Hard to write", emoji: '✍️', text: "Long ago, people in Korea wrote with Chinese characters. There were thousands of them to learn, so most ordinary people could not read or write." },
      { title: "A king who cared", emoji: '👑', text: "King Sejong wanted everyone to be able to read and write. In 1443, he created a brand-new alphabet for the Korean language: Hangul." },
      { title: "Letters like mouths", emoji: '👄', text: "Some Hangul letters are drawn in the shape of your mouth or tongue as you make the sound. ㅁ (m) looks like closed lips, and ㄱ (g) shows the back of the tongue." },
      { title: "Easy to learn", emoji: '📖', text: "Hangul has only a few letters, so it is quick to learn. Today Koreans celebrate it every year on Hangul Day." }
    ],
    dialogue: {
      npc: { name: "Min-jun", role: "a young scholar at King Sejong's court", look: 'seonbi', portrayal: 'generic' },
      intro: "Annyeong! Welcome to the palace library. I help the scholars at King Sejong's court. Would you like to hear about our king's wonderful new letters?",
      topics: [
        { ask: "Why did the king make new letters?", answer: "Our king saw that farmers, cooks and children couldn't write down their own words. Chinese characters took years to learn. He wanted letters anyone could learn quickly." },
        { ask: "How are the letters shaped?", answer: "Some letters show the shape of your mouth or tongue when you say the sound. Say 'mmm' and look in a mirror: your lips make a little box, just like ㅁ!" },
        { ask: "What about the vowels?", answer: "The vowels are built from three simple marks: a dot for the sky, a flat line for the earth, and a standing line for people. Put them together, and you can make every vowel!" },
        { ask: "How fast can you learn them?", answer: "It is said that a clever person can learn them in a morning, and anyone can learn them in ten days. Want to try?" },
        { ask: "What else did King Sejong do?", answer: "So many things! He loved science too. In his time, Korea made rain gauges to measure the rain, and clever sundials and water clocks to tell the time." }
      ],
      challenge: {
        q: "Why did King Sejong create Hangul?",
        choices: ["So everyone could read and write", "To make writing harder", "To write secret messages"],
        answer: 0,
        explain: "He wanted all his people, not just a few scholars, to be able to read and write."
      },
      farewell: "Annyeonghi gaseyo! Goodbye! Try writing your name in Hangul one day."
    },
    timeline: {
      title: "King Sejong and Hangul",
      events: [
        { label: "Sejong becomes king of Joseon (Korea)", year: 1418, when: "1418" },
        { label: "Rain gauges are made to measure rainfall across the land", year: 1441, when: "1441" },
        { label: "King Sejong creates Hangul", year: 1443, when: "1443" },
        { label: "Hangul is shared with the people in a book called Hunminjeongeum", year: 1446, when: "1446" },
        { label: "The Hunminjeongeum book joins UNESCO's Memory of the World", year: 1997, when: "1997" }
      ]
    },
    artifact: {
      model: 'hunminjeongeum',
      name: "The Hunminjeongeum book",
      text: "The book that shared Hangul with the people. Its name means 'the correct sounds for teaching the people'. It explains how each letter was made."
    },
    quiz: [
      { q: "Who created Hangul?", choices: ["King Sejong", "A pirate", "Fibonacci"], answer: 0, hint: "A kind king of Korea.", explain: "King Sejong created Hangul in 1443." },
      { q: "Why couldn't most people in Korea read and write before Hangul?", choices: ["There was no paper", "Chinese characters took a very long time to learn", "Reading was against the rules"], answer: 1, hint: "There were thousands of characters.", explain: "There were thousands of Chinese characters to learn, so it took years." },
      { q: "What does the letter ㅁ (m) look like?", choices: ["A tree", "A star", "Closed lips, the shape your mouth makes saying 'mmm'"], answer: 2, hint: "Say 'mmm' in a mirror.", explain: "ㅁ shows the shape of closed lips making the 'mmm' sound." },
      { q: "In which year did King Sejong create Hangul?", choices: ["1443", "1066", "1969"], answer: 0, hint: "In the 1400s.", explain: "Hangul was created in 1443 and shared with the people in 1446." },
      { q: "What do Koreans celebrate every year on Hangul Day?", choices: ["The king's birthday cake", "Their alphabet, Hangul", "The first snow"], answer: 1, hint: "It's in the name!", explain: "Hangul Day celebrates the Korean alphabet." }
    ]
  },

  // ───────────── Street 3: Dragon Court (about age 8–9) ─────────────
  {
    id: 'h3-castle-elephant-clock',
    subject: 'history',
    floor: 3,
    realm: 'castle',
    title: "Al-Jazari's Elephant Clock",
    topic: 'al-jazari',
    topicName: "Al-Jazari's machines",
    blurb: "Meet a brilliant engineer from 800 years ago and his clock shaped like an elephant.",
    reading: [
      { title: "A clever engineer", emoji: '⚙️', text: "Ismail al-Jazari was an engineer who worked for the rulers of Diyarbakır, a city in what is now Türkiye. He loved to design and build clever machines." },
      { title: "A book of machines", emoji: '📕', text: "In 1206 he finished a famous book, The Book of Knowledge of Ingenious Mechanical Devices. It shows dozens of machines, with drawings and instructions so others could build them." },
      { title: "The Elephant Clock", emoji: '🐘', text: "His most famous design is a clock shaped like an elephant with a tower on its back. Every half hour a bird whistles, little figures move and a cymbal rings out." },
      { title: "Water does the work", emoji: '💧', text: "Inside the elephant, a bowl with a tiny hole floats in water. It slowly fills and sinks, and when it reaches the bottom, it pulls strings that set off the show. Then it starts again." }
    ],
    dialogue: {
      npc: { name: "Ismail al-Jazari", role: "an engineer and inventor of clever machines", look: 'engineer', portrayal: 'portrayal' },
      intro: "Peace be with you, young friend! Come in, come in, mind the gears. I am al-Jazari. Would you like to see my elephant clock at work?",
      topics: [
        { ask: "How does your clock know the time?", answer: "A little bowl with a hole in it floats in a tank of water inside the elephant. Water trickles in, and after half an hour it sinks. That sinking bowl pulls the strings that start everything moving!" },
        { ask: "What happens every half hour?", answer: "A ball drops from the top of the tower, a bird on the roof whistles and turns, a figure strikes a cymbal, and the dragons swing round. Then the bowl rises up again and starts the next half hour." },
        { ask: "Why an elephant?", answer: "My clock brings together ideas from many lands: an elephant from India, dragons from China, a bird like a phoenix, and a rug from Persia. Ideas travel and grow when people share them!" },
        { ask: "What other machines did you make?", answer: "Pumps to lift water for farms and gardens, musical machines, and even a little figure that pours water for washing your hands!" },
        { ask: "Why did you write a book?", answer: "So that my machines would not be lost! I drew every part and wrote how to build it. Some people have even built my elephant clock again in our own time." }
      ],
      challenge: {
        q: "What made the elephant clock's show start every half hour?",
        choices: ["A sinking bowl in a tank of water", "A real elephant", "A battery"],
        answer: 0,
        explain: "A bowl with a small hole slowly filled with water and sank, pulling the strings that set off the show."
      },
      farewell: "Go well, young engineer! Remember: draw your ideas carefully, so others can build them too."
    },
    timeline: {
      title: "Clocks and clever machines",
      events: [
        { label: "Ctesibius builds water clocks in Alexandria, Egypt", year: -250, when: "about 2,270 years ago" },
        { label: "Su Song finishes a great water-powered clock tower in China", year: 1092, when: "about 1092" },
        { label: "Al-Jazari finishes his Book of Knowledge of Ingenious Mechanical Devices", year: 1206, when: "1206" },
        { label: "Clocks driven by falling weights appear on towers in Europe", year: 1300, when: "about 700 years ago" }
      ]
    },
    artifact: {
      model: 'elephant-clock',
      name: "A model of the Elephant Clock",
      text: "An elephant carrying a little tower, with a bird on the roof and figures that move every half hour. Inside, a bowl sinking in water keeps the time."
    },
    quiz: [
      { q: "What was al-Jazari?", choices: ["An engineer who designed machines", "A sailor", "A painter"], answer: 0, hint: "He built clever machines.", explain: "Al-Jazari was an engineer who designed and built machines." },
      { q: "What shape was his most famous clock?", choices: ["A dragon", "An elephant with a tower on its back", "A ship"], answer: 1, hint: "A big animal from India.", explain: "His most famous clock was shaped like an elephant with a tower on its back." },
      { q: "What kept time inside the elephant clock?", choices: ["A pendulum", "Sand", "A bowl slowly sinking in water"], answer: 2, hint: "Water trickles in through a tiny hole.", explain: "A bowl with a tiny hole slowly filled with water and sank every half hour." },
      { q: "Why did al-Jazari write his book?", choices: ["So others could build his machines too", "To keep his machines secret", "To learn to read"], answer: 0, hint: "He drew every part.", explain: "He drew every part and explained how to build it, so his ideas would not be lost." },
      { q: "In which year did al-Jazari finish his book?", choices: ["1206", "2006", "206"], answer: 0, hint: "About 800 years ago.", explain: "He finished his book of machines in 1206." }
    ]
  },
  {
    id: 'h3-castle-angkor',
    subject: 'history',
    floor: 3,
    realm: 'castle',
    title: "Angkor Wat, the Temple City",
    topic: 'angkor-wat',
    topicName: 'Angkor Wat',
    blurb: "Explore a giant stone temple in Cambodia, with lotus-bud towers and walls full of carved stories.",
    reading: [
      { title: "A giant temple", emoji: '🛕', text: "Angkor Wat in Cambodia is the largest religious building in the world. It was built in the 1100s by the Khmer people, for King Suryavarman II." },
      { title: "Lotus towers", emoji: '🪷', text: "Its five towers are shaped like lotus buds. They stand for Mount Meru, a holy mountain in Hindu stories, and a wide moat of water surrounds the temple like a sea." },
      { title: "Stories in stone", emoji: '🪨', text: "Its walls are covered with carvings: long pictures of old stories, and more than a thousand graceful dancers." },
      { title: "Sandstone by river", emoji: '🛶', text: "The stone came from hills more than 30 km away. Builders probably moved the heavy blocks along canals and rivers, on rafts." }
    ],
    dialogue: {
      npc: { name: "Sokha", role: "a stone carver at Angkor", look: 'carver', portrayal: 'generic' },
      intro: "Sua s'dei! Hello! I'm a stone carver. I've been carving dancers into these walls all morning. Come and see the temple!",
      topics: [
        { ask: "How long did it take to build?", answer: "About thirty years! Thousands of builders, carvers and helpers worked on it, one stone at a time." },
        { ask: "What do you carve?", answer: "Stories, mostly! Long pictures of old tales, kings and their people, and graceful dancers called apsaras. Each one has her own hairstyle and jewels." },
        { ask: "Why is there water all round?", answer: "The moat is like the great sea around the holy mountain in our stories. It also helped keep the ground underneath the temple firm and steady." },
        { ask: "How did you move such big stones?", answer: "We floated them along canals and the river on rafts, then dragged them the last part of the way. Some stones still have little holes where pegs held them while lifting." },
        { ask: "Is it still a temple?", answer: "Yes! First it was a Hindu temple, and later it became a Buddhist one. Monks still pray there, and it is even on Cambodia's flag!" }
      ],
      challenge: {
        q: "What are Angkor Wat's towers shaped like?",
        choices: ["Lotus buds", "Swords", "Ice cream cones"],
        answer: 0,
        explain: "The five towers are shaped like lotus buds, standing for the holy Mount Meru."
      },
      farewell: "Orkun! Thank you! If you visit one day, come at sunrise, when the towers glow pink and gold."
    },
    timeline: {
      title: "Angkor Wat",
      events: [
        { label: "Building begins for King Suryavarman II", year: 1113, when: "early 1100s" },
        { label: "Angkor Wat is finished after about thirty years", year: 1150, when: "about 1150" },
        { label: "Angkor Wat slowly becomes a Buddhist temple", year: 1300, when: "by about 1300" },
        { label: "Angkor becomes a World Heritage Site", year: 1992, when: "1992" }
      ]
    },
    artifact: {
      model: 'angkor-temple',
      name: "A model of Angkor Wat",
      text: "Five stone towers shaped like lotus buds, standing on stepped terraces. The tallest one is in the middle, just like the real temple."
    },
    quiz: [
      { q: "In which country is Angkor Wat?", choices: ["Cambodia", "Italy", "Mexico"], answer: 0, hint: "It is on that country's flag.", explain: "Angkor Wat is in Cambodia, and it appears on Cambodia's flag." },
      { q: "What surrounds Angkor Wat?", choices: ["A forest of ice", "A wide moat of water", "A desert"], answer: 1, hint: "Like a sea round a holy mountain.", explain: "A wide moat of water surrounds the temple." },
      { q: "What are carved on its walls?", choices: ["Phone numbers", "Nothing at all", "Long pictures of stories and graceful dancers"], answer: 2, hint: "A carver made them.", explain: "The walls are covered with carved stories and more than a thousand dancers." },
      { q: "How were the heavy stones probably moved?", choices: ["On rafts along canals and rivers", "By lorry", "By balloon"], answer: 0, hint: "Floating makes heavy things easier to move.", explain: "Builders probably floated the stones on rafts along canals and rivers." },
      { q: "About how long did Angkor Wat take to build?", choices: ["About 3 days", "About 30 years", "About 3,000 years"], answer: 1, hint: "Thousands of people, one stone at a time.", explain: "It took about thirty years to build." }
    ]
  },

  // ───────────── Street 4: Bell Tower Walk (about age 9–10) ─────────────
  {
    id: 'h4-castle-forbidden-city',
    subject: 'history',
    floor: 4,
    realm: 'castle',
    title: "The Forbidden City",
    topic: 'forbidden-city',
    topicName: 'The Forbidden City',
    blurb: "Step inside the emperors' giant palace in Beijing, with golden roofs and little guardians on every ridge.",
    reading: [
      { title: "A palace like a city", emoji: '🏯', text: "The Forbidden City in Beijing, China, was the home of the emperors for nearly 500 years. It was finished in 1420 and has about 980 buildings." },
      { title: "Why 'forbidden'?", emoji: '🚪', text: "Ordinary people were not allowed in without permission, so it was called the Forbidden City. Today it is a museum, and anyone can visit." },
      { title: "Golden roofs", emoji: '🟨', text: "Its roofs shine with yellow glazed tiles. Yellow was the emperor's colour. On the roof ridges sit rows of little animal figures." },
      { title: "Clever building", emoji: '🪵', text: "The halls are made of wood. Big beams fit together with clever wooden brackets, so the buildings could bend a little instead of breaking in an earthquake." }
    ],
    dialogue: {
      npc: { name: "Bao", role: "a roof-tile maker at the palace", look: 'china', portrayal: 'generic' },
      intro: "Ni hao! Welcome! I make the golden roof tiles for the palace. Climb up the ladder with me; the view from the roof is wonderful!",
      topics: [
        { ask: "How big is the palace?", answer: "Enormous! It has about 980 buildings inside its walls, and a moat all the way round. It's like a whole city inside one palace." },
        { ask: "Who are the little figures on the roof?", answer: "They are roof guardians! A little rider leads a line of animals, like a dragon, a phoenix and a lion. The more important a hall is, the more figures it has. The biggest hall has ten!" },
        { ask: "How did you move the huge stones?", answer: "In winter we poured water on the roads to make paths of ice. Then we slid the giant stones along on sledges. Much easier than dragging them over dirt!" },
        { ask: "Why are the roofs yellow?", answer: "Yellow was the emperor's own colour. Most other buildings in the city had grey roofs, so the palace glows golden among them." },
        { ask: "Who lives here now?", answer: "Nobody lives here now. In 1925 it became the Palace Museum, so now millions of visitors come every year to see its halls and treasures." }
      ],
      challenge: {
        q: "Why was it called the Forbidden City?",
        choices: ["Ordinary people could not go in without permission", "It was made of forbidden fruit", "Nobody had ever seen it"],
        answer: 0,
        explain: "Only people with permission could enter the emperors' palace, so it was called forbidden."
      },
      farewell: "Zaijian! Goodbye! Count the little guardians on the roofs if you ever visit."
    },
    timeline: {
      title: "The Forbidden City",
      events: [
        { label: "Building begins in Beijing", year: 1406, when: "1406" },
        { label: "The Forbidden City is finished", year: 1420, when: "1420" },
        { label: "The emperors of a new family, the Qing, move in", year: 1644, when: "1644" },
        { label: "The palace opens as the Palace Museum", year: 1925, when: "1925" },
        { label: "It becomes a World Heritage Site", year: 1987, when: "1987" }
      ]
    },
    artifact: {
      model: 'roof-figures',
      name: "Little roof guardians",
      text: "A ridge of golden roof tiles with a row of small figures: a rider at the front, followed by animals like a dragon and a phoenix. They were believed to watch over the hall."
    },
    quiz: [
      { q: "In which city is the Forbidden City?", choices: ["Beijing, China", "Paris, France", "Cairo, Egypt"], answer: 0, hint: "China's capital city.", explain: "The Forbidden City is in Beijing, China." },
      { q: "About how many buildings does it have?", choices: ["About 9", "About 980", "About 1 million"], answer: 1, hint: "Like a whole city in one palace.", explain: "The Forbidden City has about 980 buildings." },
      { q: "What colour were the palace's roof tiles?", choices: ["Pink", "Black", "Yellow, the emperor's colour"], answer: 2, hint: "They shine golden.", explain: "The roofs are covered in yellow glazed tiles, the emperor's colour." },
      { q: "How did workers move giant stones in winter?", choices: ["Slid them on sledges over roads of ice", "Flew them on balloons", "Rolled them on rubber tyres"], answer: 0, hint: "Water freezes in winter.", explain: "They poured water on roads to make ice, then slid the stones along on sledges." },
      { q: "What is the Forbidden City today?", choices: ["A museum anyone can visit", "A secret prison", "A school for dragons"], answer: 0, hint: "Since 1925.", explain: "Since 1925 it has been the Palace Museum, open to visitors." }
    ]
  },
  {
    id: 'h4-castle-jikji',
    subject: 'history',
    floor: 4,
    realm: 'castle',
    title: "Jikji, the Oldest Metal-Type Book",
    topic: 'jikji',
    topicName: 'Jikji and metal type',
    blurb: "Visit a Korean temple in 1377, where monks printed the oldest book made with metal letters that still exists.",
    reading: [
      { title: "A very old book", emoji: '📘', text: "Jikji is a book of wise teachings from Buddhist monks. It was printed in 1377 at Heungdeok Temple in Cheongju, Korea." },
      { title: "Letters made of metal", emoji: '🔤', text: "Each letter was made of metal, and the letters could be moved around and used again for the next page. This is called movable metal type." },
      { title: "The oldest one left", emoji: '🏆', text: "Jikji is the oldest book printed with movable metal type that still exists. It was printed about 78 years before Gutenberg's famous Bible in Germany." },
      { title: "In a library far away", emoji: '🇫🇷', text: "Only the second of its two volumes has survived. Today it is kept in the National Library of France, in Paris." }
    ],
    dialogue: {
      npc: { name: "Seol", role: "a young monk at Heungdeok Temple", look: 'monk', portrayal: 'generic' },
      intro: "Welcome to Heungdeok Temple! Please, come in quietly; we are printing today. Would you like to see how we make a book?",
      topics: [
        { ask: "How do you print a page?", answer: "First we set the little metal letters in a frame, in the right order. Then we brush ink over them, lay paper on top and rub it gently. Lift the paper, and there's the page!" },
        { ask: "Why use metal letters?", answer: "Carving a whole wooden block for every page takes a long time, and the block can only print that one page. Metal letters are strong and can be used again and again for new pages." },
        { ask: "What is in the book?", answer: "Wise teachings, gathered by a teacher called Baegun from many Buddhist monks. They help people think carefully and be kind." },
        { ask: "How did it get to France?", answer: "Hundreds of years later, a French visitor to Korea collected old books, and took this one home. A Korean librarian in Paris, Dr. Park Byeong-seon, showed the world in 1972 how old and special it is." },
        { ask: "Can people see it today?", answer: "It is looked after carefully in Paris. In Cheongju there is a printing museum where you can learn how it was made, and UNESCO gives a Jikji Prize to people who help keep old writings safe." }
      ],
      challenge: {
        q: "What makes Jikji so special?",
        choices: ["It is the oldest book printed with movable metal type that still exists", "It is the biggest book in the world", "It was written on the Moon"],
        answer: 0,
        explain: "Jikji, printed in 1377, is the oldest surviving book printed with movable metal type."
      },
      farewell: "Thank you for visiting! Every time you read a printed book, think of the little metal letters of long ago."
    },
    timeline: {
      title: "Printing with movable type",
      events: [
        { label: "Bi Sheng in China makes movable type from baked clay", year: 1040, when: "about 1040" },
        { label: "Jikji is printed with metal type in Cheongju, Korea", year: 1377, when: "1377" },
        { label: "Gutenberg prints his Bible with metal type in Germany", year: 1455, when: "about 1455" },
        { label: "Dr. Park Byeong-seon shows Jikji to the world at a book exhibition in Paris", year: 1972, when: "1972" },
        { label: "Jikji joins UNESCO's Memory of the World", year: 2001, when: "2001" }
      ]
    },
    artifact: {
      model: 'metal-type',
      name: "Metal type in a frame",
      text: "Small metal letters set side by side in a frame, ready to be inked and printed. Each letter could be used again and again."
    },
    quiz: [
      { q: "Where was Jikji printed?", choices: ["At a temple in Cheongju, Korea", "In a castle in Scotland", "On a ship"], answer: 0, hint: "At Heungdeok Temple.", explain: "Jikji was printed at Heungdeok Temple in Cheongju, Korea." },
      { q: "When was Jikji printed?", choices: ["1977", "1377", "377"], answer: 1, hint: "In the 1300s.", explain: "Jikji was printed in 1377." },
      { q: "What is movable type?", choices: ["Paper that moves by itself", "Books with wheels", "Separate letters that can be rearranged and used again"], answer: 2, hint: "The letters move from page to page.", explain: "Movable type means separate letters that can be set in order, printed, and then used again for new pages." },
      { q: "Where is Jikji kept today?", choices: ["In the National Library of France, in Paris", "Under the sea", "In a bakery"], answer: 0, hint: "A big library in Europe.", explain: "The surviving volume of Jikji is kept in the National Library of France." },
      { q: "About how many years before Gutenberg's Bible was Jikji printed?", choices: ["About 78 years", "About 7 years", "About 780 years"], answer: 0, hint: "1455 − 1377", explain: "1455 − 1377 = 78, so Jikji was printed about 78 years earlier." }
    ]
  },

  // ───────────── Street 5: Sundial Garden (about age 10–11) ─────────────
  {
    id: 'h5-castle-great-zimbabwe',
    subject: 'history',
    floor: 5,
    realm: 'castle',
    title: "Great Zimbabwe, the City of Stone",
    topic: 'great-zimbabwe',
    topicName: 'Great Zimbabwe',
    blurb: "Discover a great city in southern Africa whose stone walls stand without any mortar at all.",
    reading: [
      { title: "Houses of stone", emoji: '🧱', text: "From about 1100 to 1450, a great city stood in southern Africa. Its name, Great Zimbabwe, comes from Shona words meaning 'houses of stone'." },
      { title: "No mortar", emoji: '🪨', text: "Its builders fitted granite blocks together so neatly that the walls needed no mortar. The biggest wall is up to about 11 metres high, and it still stands today." },
      { title: "A trading city", emoji: '🪙', text: "Great Zimbabwe traded gold and ivory with ports on the coast. In return came glass beads from India and pottery from China and Persia." },
      { title: "The stone birds", emoji: '🦅', text: "Carved soapstone birds were found there. One is now on Zimbabwe's flag, and the whole country is named after the city." }
    ],
    dialogue: {
      npc: { name: "Tendai", role: "a stone builder of Great Zimbabwe", look: 'stonebuilder', portrayal: 'generic' },
      intro: "Mhoro! Hello! Welcome to our city of stone. I'm a builder. I was just fitting the last blocks on this wall. Would you like to look around?",
      topics: [
        { ask: "How do your walls stay up without mortar?", answer: "Careful work! We split the granite into neat blocks and lay each one so it presses snugly on the ones below. The weight of the wall holds it all together." },
        { ask: "What is the big round wall?", answer: "That's the Great Enclosure, the largest wall of all. Its top is decorated with a zigzag pattern, and inside stands a tall cone-shaped tower made of solid stone." },
        { ask: "How do you get the blocks?", answer: "The hills here are made of granite. When the rock heats in the sun and cools at night, layers crack off it. We break those layers into blocks of the right size." },
        { ask: "Who do you trade with?", answer: "Traders take our gold and ivory down to the ports by the Indian Ocean. They bring back glass beads, cloth and even pottery from China!" },
        { ask: "What are the stone birds?", answer: "Beautiful birds carved from soapstone, sitting on tall pillars. Today one of them is on Zimbabwe's flag, flying proudly." }
      ],
      challenge: {
        q: "What is special about Great Zimbabwe's walls?",
        choices: ["They were built without any mortar", "They are made of ice", "They are painted gold"],
        answer: 0,
        explain: "The granite blocks were fitted together so well that the walls needed no mortar."
      },
      farewell: "Famba zvakanaka! Go well! The stones will still be standing when you come back."
    },
    timeline: {
      title: "Great Zimbabwe",
      events: [
        { label: "People begin building in stone at Great Zimbabwe", year: 1100, when: "about 1100" },
        { label: "The city is at its biggest, trading gold with the coast", year: 1300, when: "about 1300" },
        { label: "People slowly move away to other places", year: 1450, when: "about 1450" },
        { label: "The country of Zimbabwe takes its name from the city", year: 1980, when: "1980" },
        { label: "Great Zimbabwe becomes a World Heritage Site", year: 1986, when: "1986" }
      ]
    },
    artifact: {
      model: 'soapstone-bird',
      name: "A soapstone bird",
      text: "A bird carved from soapstone, sitting on top of a tall pillar. Eight of these birds were found at Great Zimbabwe, and one appears on Zimbabwe's flag."
    },
    quiz: [
      { q: "What does 'Zimbabwe' mean?", choices: ["Houses of stone", "Golden river", "Tall trees"], answer: 0, hint: "Look at the walls!", explain: "The name comes from Shona words meaning 'houses of stone'." },
      { q: "What held Great Zimbabwe's walls together?", choices: ["Glue", "Carefully fitted blocks, with no mortar", "Nails"], answer: 1, hint: "No paste between the stones.", explain: "The blocks were fitted together so neatly that no mortar was needed." },
      { q: "What did Great Zimbabwe trade with the coast?", choices: ["Snow and ice", "Bicycles", "Gold and ivory"], answer: 2, hint: "Something shiny and precious.", explain: "Great Zimbabwe traded gold and ivory for beads, cloth and pottery." },
      { q: "What appears on Zimbabwe's flag today?", choices: ["A soapstone bird from Great Zimbabwe", "A lion", "A castle"], answer: 0, hint: "It was carved from soapstone.", explain: "One of the soapstone birds found at Great Zimbabwe is on the flag." },
      { q: "About when was Great Zimbabwe a busy city?", choices: ["About 1100 to 1450", "Last year", "10,000 years ago"], answer: 0, hint: "In medieval times.", explain: "Great Zimbabwe was a great city from about 1100 to about 1450." }
    ]
  },
  {
    id: 'h5-castle-hildegard',
    subject: 'history',
    floor: 5,
    realm: 'castle',
    title: "Hildegard of Bingen: Music, Plants and Big Ideas",
    topic: 'hildegard',
    topicName: 'Hildegard of Bingen',
    blurb: "Meet a medieval leader who wrote music, studied plants and wrote to kings.",
    reading: [
      { title: "A curious girl", emoji: '🌱', text: "Hildegard was born in Germany in 1098. As a girl she went to live in a religious community, where she learned to read, write and sing." },
      { title: "A leader", emoji: '⛪', text: "She grew up to lead her own community of nuns. In about 1150 she moved it to a new convent near the town of Bingen, by the River Rhine." },
      { title: "Music", emoji: '🎶', text: "Hildegard wrote many songs, and even a musical play. She is one of the earliest composers whose name we know and whose music people still sing today." },
      { title: "Plants and healing", emoji: '🌿', text: "She wrote books about plants, animals, stones and how to stay healthy. She also wrote letters to popes, kings and emperors, sharing her ideas." }
    ],
    dialogue: {
      npc: { name: "Hildegard of Bingen", role: "a leader, writer and composer", look: 'nun', portrayal: 'portrayal' },
      intro: "Welcome, dear child! Come and sit in the garden with me. The herbs smell wonderful today. What would you like to talk about?",
      topics: [
        { ask: "Why do you write songs?", answer: "Music lifts the heart! I write songs for my sisters to sing together. My melodies leap high and swoop low, like birds in the sky." },
        { ask: "What do you know about plants?", answer: "I watch them closely and write down what I learn: which herbs smell sweet, which grow in shade, and which have been used to help people feel better. I love the fresh green of growing things!" },
        { ask: "Did you really write to kings?", answer: "I did! I wrote to popes, kings and an emperor, and to ordinary people too. When I had something important to say, I said it kindly and clearly." },
        { ask: "Did you make up your own language?", answer: "I did make up some secret words and letters of my own! Nobody knows exactly why. Perhaps just for the joy of inventing them." },
        { ask: "Do people still remember you?", answer: "They do! People still sing my music and read my books, more than 800 years later. In 2012 I was given a special title as one of the Church's great teachers." }
      ],
      challenge: {
        q: "Which of these did Hildegard do?",
        choices: ["She wrote music and books about plants", "She sailed round the world", "She invented the telephone"],
        answer: 0,
        explain: "Hildegard wrote music, books about plants and healing, and letters to kings and popes."
      },
      farewell: "Go gently, child, and keep wondering about everything. A curious mind is a garden that never stops growing."
    },
    timeline: {
      title: "Hildegard's life",
      events: [
        { label: "Hildegard is born in Germany", year: 1098, when: "1098" },
        { label: "She becomes the leader of her community", year: 1136, when: "1136" },
        { label: "She moves her community to a new convent near Bingen", year: 1150, when: "about 1150" },
        { label: "She writes a musical play, one of the oldest we know", year: 1151, when: "about 1151" },
        { label: "She is named one of the Church's great teachers", year: 2012, when: "2012" }
      ]
    },
    artifact: {
      model: 'manuscript',
      name: "A medieval songbook",
      text: "Before printing, books like this were written and painted by hand. Hildegard's songs were written down in books like these, so we can still sing them today."
    },
    quiz: [
      { q: "In which country was Hildegard born?", choices: ["Germany", "Japan", "Brazil"], answer: 0, hint: "Near the River Rhine.", explain: "Hildegard was born in Germany in 1098." },
      { q: "What did Hildegard write?", choices: ["Computer games", "Songs, and books about plants and health", "Newspapers"], answer: 1, hint: "Music and nature.", explain: "She wrote many songs and books about plants, animals and staying healthy." },
      { q: "Who did Hildegard write letters to?", choices: ["Nobody", "Only her cat", "Popes, kings and emperors, and ordinary people too"], answer: 2, hint: "Some very important people!", explain: "She wrote to popes, kings and emperors, and to ordinary people." },
      { q: "Why do we still know Hildegard's music?", choices: ["It was written down in books", "She recorded it on a phone", "It was carved on the Moon"], answer: 0, hint: "Before printing, books were written by hand.", explain: "Her songs were written down in handwritten books, so we can still sing them." },
      { q: "About when did Hildegard live?", choices: ["About 900 years ago", "About 90 years ago", "About 9,000 years ago"], answer: 0, hint: "She was born in 1098.", explain: "She lived from 1098 to 1179, about 900 years ago." }
    ]
  },

  // ───────────── Street 6: Balloon Bastion (about age 11–12) ─────────────
  {
    id: 'h6-castle-magna-carta',
    subject: 'history',
    floor: 6,
    realm: 'castle',
    title: "Magna Carta: Rules Even for a King",
    topic: 'magna-carta',
    topicName: 'Magna Carta',
    blurb: "In a meadow by the River Thames in 1215, a king agreed that even he must follow the law.",
    reading: [
      { title: "An unpopular king", emoji: '👑', text: "In 1215, King John of England was very unpopular. He made people pay heavy taxes and punished people unfairly. Many powerful lords, called barons, were angry." },
      { title: "The Great Charter", emoji: '📜', text: "At Runnymede, a meadow by the River Thames, the king agreed to a list of promises. It was called Magna Carta, which means 'Great Charter' in Latin." },
      { title: "A big idea", emoji: '⚖️', text: "Its most famous idea is that everyone, even the king, must follow the law. It also promised that free people could not be punished without a fair judgement." },
      { title: "Still remembered", emoji: '🌍', text: "Four copies from 1215 still exist. Magna Carta's ideas helped inspire later promises of rights, like the United States Bill of Rights and the Universal Declaration of Human Rights." }
    ],
    dialogue: {
      npc: { name: "Brother Hugh", role: "a scribe who copied out Magna Carta", look: 'copyist', portrayal: 'generic' },
      intro: "Good day to you! Please, careful with the ink pot. I'm a scribe: my job is to write out copies of the Great Charter, word by word. Would you like to hear about it?",
      topics: [
        { ask: "Why was the charter written?", answer: "The barons were tired of King John's unfair rules and heavy taxes. They asked him to promise, in writing, to follow the law like everyone else." },
        { ask: "Did the king sign it?", answer: "Kings didn't sign their names in those days! Instead, the king's great wax seal was pressed onto it to show he agreed." },
        { ask: "What language is it in?", answer: "Latin, the language of important writing in my time. I write it on parchment, a smooth material made from animal skin, with a goose-feather quill." },
        { ask: "Did everyone keep the promises?", answer: "Not at first! Just a few months later it was cancelled. But it was written out again in the next years, and in 1225 it became part of the law of England." },
        { ask: "Why does it still matter?", answer: "Because of its big idea: nobody is above the law, not even a king. People around the world have built on that idea ever since." }
      ],
      challenge: {
        q: "What is the most famous idea in Magna Carta?",
        choices: ["Everyone, even the king, must follow the law", "The king can do whatever he likes", "Castles must be painted white"],
        answer: 0,
        explain: "Magna Carta said that even the king had to follow the law."
      },
      farewell: "Farewell! Remember: good rules are for everyone, kings and children alike."
    },
    timeline: {
      title: "Magna Carta and its big idea",
      events: [
        { label: "King John agrees to Magna Carta at Runnymede", year: 1215, when: "1215" },
        { label: "A new version of Magna Carta becomes part of English law", year: 1225, when: "1225" },
        { label: "The United States Bill of Rights is added to its Constitution", year: 1791, when: "1791" },
        { label: "The Universal Declaration of Human Rights is agreed by the United Nations", year: 1948, when: "1948" },
        { label: "People celebrate Magna Carta's 800th birthday", year: 2015, when: "2015" }
      ]
    },
    artifact: {
      model: 'wax-seal',
      name: "A royal wax seal",
      text: "Kings did not sign their names. Instead, a big metal stamp was pressed into hot wax on the document, to show that the king agreed."
    },
    quiz: [
      { q: "In which year was Magna Carta agreed?", choices: ["1215", "1815", "2015"], answer: 0, hint: "In the 1200s.", explain: "King John agreed to Magna Carta in 1215." },
      { q: "What does 'Magna Carta' mean?", choices: ["Little letter", "Great Charter", "Royal castle"], answer: 1, hint: "Magna means great.", explain: "Magna Carta is Latin for 'Great Charter'." },
      { q: "How did King John show that he agreed?", choices: ["He signed it with a pen", "He shook hands on video", "His wax seal was pressed onto it"], answer: 2, hint: "Kings didn't sign their names then.", explain: "The king's great wax seal was attached to show he agreed." },
      { q: "Why does Magna Carta still matter today?", choices: ["It said nobody is above the law", "It invented football", "It made the king richer"], answer: 0, hint: "Not even a king…", explain: "Its big idea, that everyone must follow the law, inspired ideas about rights around the world." },
      { q: "Who were the barons?", choices: ["Powerful lords who wanted the king to be fair", "Bakers", "The king's pet dogs"], answer: 0, hint: "They asked the king to make promises.", explain: "The barons were powerful lords who wanted King John to rule fairly." }
    ]
  },
  {
    id: 'h6-castle-universities',
    subject: 'history',
    floor: 6,
    realm: 'castle',
    title: "Fatima al-Fihri and the First Universities",
    topic: 'medieval-universities',
    topicName: 'The first universities',
    blurb: "Visit Fez in 859, where Fatima al-Fihri founded a place of learning that is still open today.",
    reading: [
      { title: "A gift for learning", emoji: '🕌', text: "In 859, in the city of Fez in Morocco, a young woman called Fatima al-Fihri used her family's money to found al-Qarawiyyin, a mosque that became a great place of learning." },
      { title: "Still teaching", emoji: '🎓', text: "Al-Qarawiyyin has been teaching students for over a thousand years. It is often called the oldest place of learning in the world that is still open." },
      { title: "Universities in Europe", emoji: '🏛️', text: "Later, students and teachers in Europe formed universities: in Bologna, Italy, from about 1088, then in places like Oxford, Paris and Cambridge." },
      { title: "Learning long ago", emoji: '📚', text: "Books were rare, so teachers often read aloud while students listened and wrote notes. Students studied grammar, logic, arithmetic, geometry, music and astronomy." }
    ],
    dialogue: {
      npc: { name: "Fatima al-Fihri", role: "the founder of al-Qarawiyyin in Fez", look: 'scholar', portrayal: 'portrayal' },
      intro: "Peace be with you, and welcome to Fez! Come into the courtyard, by the fountain. This is our new place of prayer and learning. Shall I tell you how it began?",
      topics: [
        { ask: "Why did you build it?", answer: "My father left my sister Maryam and me some money. I wanted to give something lasting to our city: a beautiful place where people could pray, and learn." },
        { ask: "What do people learn here?", answer: "In time, scholars came here to teach and study many subjects: the Qur'an and law, but also grammar, mathematics, astronomy and medicine." },
        { ask: "Who came to study?", answer: "Students from near and far! Over the centuries, many famous thinkers studied here, and they carried what they learned to other lands." },
        { ask: "What were universities like in Europe?", answer: "Groups of students and teachers came together in cities like Bologna and Oxford. They spoke Latin, wore long gowns, and argued about big questions. Graduates still wear gowns today!" },
        { ask: "Is it still open?", answer: "Yes! Students have been learning at al-Qarawiyyin for over a thousand years. Its library is one of the oldest in the world." }
      ],
      challenge: {
        q: "What did Fatima al-Fihri found in Fez in 859?",
        choices: ["Al-Qarawiyyin, a mosque that became a great place of learning", "A castle for knights", "A clock tower"],
        answer: 0,
        explain: "Fatima al-Fihri founded al-Qarawiyyin, which grew into a great place of learning still open today."
      },
      farewell: "Go in peace, and never stop learning. A gift of knowledge lasts longer than any building."
    },
    timeline: {
      title: "Great places of learning",
      events: [
        { label: "Nalanda, a great centre of learning, grows in India", year: 427, when: "about 427" },
        { label: "Fatima al-Fihri founds al-Qarawiyyin in Fez, Morocco", year: 859, when: "859" },
        { label: "Students begin to gather at the University of Bologna", year: 1088, when: "about 1088" },
        { label: "The University of Cambridge begins", year: 1209, when: "1209" },
        { label: "The University of Salamanca is founded in Spain", year: 1218, when: "1218" }
      ]
    },
    artifact: {
      model: 'quill',
      name: "A quill pen and ink pot",
      text: "Students and scholars wrote with pens cut from big bird feathers, dipped in ink. Every book had to be copied out by hand."
    },
    quiz: [
      { q: "In which city did Fatima al-Fihri found al-Qarawiyyin?", choices: ["Fez, Morocco", "London, England", "Tokyo, Japan"], answer: 0, hint: "A city in North Africa.", explain: "She founded al-Qarawiyyin in Fez, Morocco, in 859." },
      { q: "What is special about al-Qarawiyyin?", choices: ["It is made of glass", "It is often called the oldest place of learning still open", "It floats"], answer: 1, hint: "Over a thousand years of teaching.", explain: "It has taught students for over a thousand years and is still open." },
      { q: "Why did teachers often read books aloud?", choices: ["Students couldn't hear", "Teachers liked singing", "Books were rare, because each was copied by hand"], answer: 2, hint: "There was no printing yet in Europe.", explain: "Books were rare and copied by hand, so teachers read them aloud." },
      { q: "Which is one of the oldest universities in Europe?", choices: ["Bologna, in Italy", "The Moon University", "Hogwarts"], answer: 0, hint: "From about 1088.", explain: "The University of Bologna began in about 1088." },
      { q: "What do university graduates still wear today, like students long ago?", choices: ["Long gowns", "Suits of armour", "Swimsuits"], answer: 0, hint: "Think of graduation pictures.", explain: "Graduates still wear long gowns, like medieval students." }
    ]
  },

  // ───────────── Street 7: Crown Garden (about age 12–13) ─────────────
  {
    id: 'h7-castle-leonardo',
    subject: 'history',
    floor: 7,
    realm: 'castle',
    title: "Leonardo da Vinci Dreams of Flying",
    topic: 'leonardo-flight',
    topicName: "Leonardo's flying machines",
    blurb: "Open Leonardo da Vinci's notebooks, full of birds, wings and machines for flying.",
    reading: [
      { title: "Painter and inventor", emoji: '🎨', text: "Leonardo da Vinci was born in Italy in 1452. He painted the Mona Lisa, but he was also an engineer, an inventor and a scientist." },
      { title: "Notebooks of ideas", emoji: '📓', text: "Leonardo filled thousands of pages with drawings and notes, often in mirror writing, from right to left. Some of his favourite subjects were birds and flight." },
      { title: "Machines for the sky", emoji: '🪽', text: "He sketched a machine with flapping wings, a spinning 'air screw' like a helicopter, and a pyramid-shaped parachute. In about 1505 he wrote a little book about how birds fly." },
      { title: "Ahead of his time", emoji: '⏳', text: "His flying machines were never flown in his lifetime: people's muscles are too weak to flap such big wings. But in 2000, a parachute made from his design worked perfectly." }
    ],
    dialogue: {
      npc: { name: "Leonardo da Vinci", role: "a painter, inventor and scientist", look: 'renaissance', portrayal: 'portrayal' },
      intro: "Ah, welcome to my workshop! Careful, there are wings drying on the table. I am Leonardo. Tell me, have you ever watched a bird and wished you could fly?",
      topics: [
        { ask: "Why do you watch birds?", answer: "To learn their secrets! I watch how they tilt their wings, how they ride the wind without flapping, and how their tails steer. Nature is the best teacher." },
        { ask: "What is the flapping machine?", answer: "A frame with great wings, like a bat's, that a person would flap with arms and legs. Later I realised a person isn't strong enough. Birds have very strong muscles for their size!" },
        { ask: "What is the air screw?", answer: "A big spiral sail of linen. If it spun fast enough, I thought it would screw itself up into the air, like a screw into wood. Today's helicopters work in a different way, but the idea of spinning blades is there!" },
        { ask: "Why do you write backwards?", answer: "I am left-handed, and writing from right to left means I don't smudge the ink! Hold my notebook up to a mirror and you can read it easily." },
        { ask: "Did any of your machines work?", answer: "Not in my time. But many years later, people built my parachute, and in the year 2000 a brave skydiver floated safely down under it. Ideas can wait a long time to fly!" }
      ],
      challenge: {
        q: "Why couldn't Leonardo's flapping machine fly?",
        choices: ["A person's muscles are too weak to flap such big wings", "It was painted the wrong colour", "There was no wind in Italy"],
        answer: 0,
        explain: "People aren't strong enough for their size to flap such big wings, unlike birds."
      },
      farewell: "Farewell, young inventor! Keep your eyes open and a notebook in your pocket."
    },
    timeline: {
      title: "Dreams of flying",
      events: [
        { label: "Leonardo da Vinci is born in Vinci, Italy", year: 1452, when: "1452" },
        { label: "Leonardo sketches a pyramid-shaped parachute", year: 1485, when: "about 1485" },
        { label: "Leonardo writes a little book on the flight of birds", year: 1505, when: "about 1505" },
        { label: "The Wright brothers make the first powered aeroplane flight", year: 1903, when: "1903" },
        { label: "A parachute built from Leonardo's design is tested and works", year: 2000, when: "2000" }
      ]
    },
    artifact: {
      model: 'ornithopter',
      name: "A model of Leonardo's flapping-wing machine",
      text: "A wooden frame with two great wings, like a bat's. Leonardo drew it in his notebooks, but it was never flown."
    },
    quiz: [
      { q: "What famous painting did Leonardo make?", choices: ["The Mona Lisa", "The Starry Night", "The Scream"], answer: 0, hint: "A smiling lady.", explain: "Leonardo da Vinci painted the Mona Lisa." },
      { q: "What did Leonardo study to learn about flying?", choices: ["Fish", "Birds", "Snails"], answer: 1, hint: "They fly every day.", explain: "Leonardo watched birds closely and wrote a little book about how they fly." },
      { q: "Why did Leonardo write from right to left?", choices: ["To keep it secret from the king", "His pen only worked backwards", "He was left-handed, and it stopped the ink smudging"], answer: 2, hint: "Which hand did he write with?", explain: "Leonardo was left-handed; writing right to left kept his hand out of the wet ink." },
      { q: "Which of Leonardo's designs was tested in 2000 and worked?", choices: ["His parachute", "His flapping-wing machine", "His robot knight"], answer: 0, hint: "It floats down, not up.", explain: "A parachute built from his design was tested in 2000, and it worked." },
      { q: "What did Leonardo's 'air screw' look like?", choices: ["A big spinning spiral sail", "A hot-air balloon", "A kite"], answer: 0, hint: "It was meant to spin up into the air.", explain: "The air screw was a big spiral of linen meant to spin up into the air." }
    ]
  },
  {
    id: 'h7-castle-balloons',
    subject: 'history',
    floor: 7,
    realm: 'castle',
    title: "The First Balloon Flights",
    topic: 'first-balloons',
    topicName: 'The first balloon flights',
    blurb: "In 1783 a sheep, a duck and a rooster flew first, and then people floated over Paris.",
    reading: [
      { title: "Two paper-makers", emoji: '📄', text: "Joseph and Étienne Montgolfier were brothers who made paper in France. They noticed that hot air from a fire could lift a light paper or cloth bag." },
      { title: "Animals first", emoji: '🐑', text: "In 1783, at the palace of Versailles, the brothers sent up a balloon carrying a sheep, a duck and a rooster. They flew for about 8 minutes and landed safely." },
      { title: "People fly", emoji: '🎈', text: "Two months later, two men floated over Paris in a Montgolfier balloon for about 25 minutes. They were the first people to fly freely in the air." },
      { title: "Hydrogen too", emoji: '🧪', text: "Just days later, Jacques Charles and Nicolas-Louis Robert flew a balloon filled with hydrogen, a very light gas. People had finally taken to the sky." }
    ],
    dialogue: {
      npc: { name: "Louise", role: "a paper-maker in the Montgolfier workshop", look: 'balloonist', portrayal: 'generic' },
      intro: "Bonjour! Welcome to the workshop! Mind the paste pots: we're gluing paper onto a new balloon. Would you like to hear about our flights?",
      topics: [
        { ask: "How did the brothers get the idea?", answer: "People say Joseph watched clothes drying over a fire puff up and rise. He made a small bag of silk, held it over the fire, and up it went to the ceiling!" },
        { ask: "What is the balloon made of?", answer: "Cloth lined with paper, from our very own paper mill! It is painted blue with golden decorations. Very fancy, for flying in front of the king." },
        { ask: "Why did animals fly first?", answer: "Nobody knew if it was safe to breathe up high. So a sheep, a duck and a rooster went first. They came down safely, a little surprised, and the sheep became quite famous!" },
        { ask: "Why does hot air make it rise?", answer: "The brothers first thought it was something special in the smoke. Really, heated air spreads out and becomes lighter than the cooler air around it, so the balloon floats up, like a cork in water." },
        { ask: "What came next?", answer: "Balloons crossed the sea between England and France in 1785! Later came airships, aeroplanes and, in 1999, a balloon that flew all the way round the world without stopping." }
      ],
      challenge: {
        q: "Who were the very first passengers in a Montgolfier balloon?",
        choices: ["A sheep, a duck and a rooster", "The king and queen", "Two cats"],
        answer: 0,
        explain: "In 1783 a sheep, a duck and a rooster flew first, and landed safely."
      },
      farewell: "Au revoir! Next time you see a balloon float up, wave to the sheep, the duck and the rooster."
    },
    timeline: {
      title: "Up, up and away",
      events: [
        { label: "Animals, then the first people, fly in balloons in France", year: 1783, when: "1783" },
        { label: "A balloon crosses the sea from England to France", year: 1785, when: "1785" },
        { label: "Henri Giffard flies a steam-powered airship", year: 1852, when: "1852" },
        { label: "The Wright brothers make the first powered aeroplane flight", year: 1903, when: "1903" },
        { label: "A balloon flies all the way round the world without stopping", year: 1999, when: "1999" }
      ]
    },
    artifact: {
      model: 'montgolfier-balloon',
      name: "A model of a Montgolfier balloon",
      text: "A tall blue balloon decorated with gold, with a little basket below. Hot air from a fire made it lighter than the air around it, so it floated up."
    },
    quiz: [
      { q: "What did the Montgolfier brothers make for a living?", choices: ["Paper", "Bread", "Clocks"], answer: 0, hint: "They had a mill.", explain: "The Montgolfier brothers were paper-makers." },
      { q: "Who flew in a balloon first, in 1783?", choices: ["Two astronauts", "A sheep, a duck and a rooster", "The king"], answer: 1, hint: "Animals went first, to be safe.", explain: "A sheep, a duck and a rooster flew first, at Versailles." },
      { q: "Why does a hot-air balloon rise?", choices: ["The smoke is magic", "The balloon flaps its wings", "Hot air is lighter than the cooler air around it"], answer: 2, hint: "Like a cork floating up in water.", explain: "Heated air spreads out and becomes lighter than the cooler air around it, so the balloon floats up." },
      { q: "About how long did the first flight with people last?", choices: ["About 25 minutes", "About 25 days", "About 2 seconds"], answer: 0, hint: "Long enough to float over Paris.", explain: "The first people floated over Paris for about 25 minutes." },
      { q: "What gas filled the balloon of Charles and Robert?", choices: ["Hydrogen, a very light gas", "Water", "Smoke"], answer: 0, hint: "A very light gas.", explain: "Their balloon was filled with hydrogen, a gas much lighter than air." }
    ]
  }
];

/* ------------------------------------------------------------ The Inventor's Workshop (physics) */

const CASTLE_PHYSICS = [
  // ───────────── Street 1: Gatehouse Market (about age 6–7) ─────────────
  {
    id: 'p1-castle-floating-island',
    subject: 'physics',
    floor: 1,
    realm: 'castle',
    title: "Could an Island Really Float?",
    topic: 'floating-island',
    topicName: 'Floating and sinking',
    blurb: "Find out what floats and what sinks, and why a real rock island can't float in the sky.",
    reading: [
      { title: "Float or sink?", emoji: '🛁', text: "Some things float on water, like wood and corks. Others sink, like stones and keys. Water pushes up on everything in it." },
      { title: "Light for its size", emoji: '🪵', text: "Things that are light for their size float. Things that are heavy for their size sink. A big log can float, but a small pebble sinks!" },
      { title: "Real islands", emoji: '🏝️', text: "Real islands don't float at all. They are the tops of rock and land that stand on the sea floor, poking up out of the water." },
      { title: "Floating in the sky?", emoji: '☁️', text: "Air is much, much lighter than water, so it can't hold up a heavy rock. Clouds float because they are made of tiny droplets of water, so small and light that moving air keeps them up. Our Sky Castle is make-believe!" }
    ],
    sim: {
      id: 'float',
      setup: { items: ['wooden-block', 'stone', 'cork', 'key', 'apple', 'glass-marble'] },
      predict: {
        q: "You drop a wooden block and a stone into the water tank. Which one floats?",
        choices: ["The stone", "The wooden block", "Neither of them"],
        answer: 1,
        explain: "Wood is light for its size, so the water holds it up. The stone is heavy for its size, so it sinks."
      }
    },
    quiz: [
      { q: "Which of these floats on water?", choices: ["A cork", "A key", "A stone"], answer: 0, hint: "It's very light for its size.", explain: "A cork is light for its size, so it floats." },
      { q: "Do real islands float on the sea?", choices: ["Yes, they drift about", "No, they stand on the sea floor", "Only on Sundays"], answer: 1, hint: "They are the tops of rock and land.", explain: "Real islands are the tops of land that stand on the sea floor." },
      { q: "Why can't a heavy rock float in the air?", choices: ["It is too shy", "Rocks hate the sky", "Air is far too light to hold it up"], answer: 2, hint: "Air is much lighter than water.", explain: "Air is much lighter than water, so it can't hold up something as heavy as a rock." },
      { q: "What are clouds made of?", choices: ["Tiny droplets of water", "Cotton wool", "Smoke from castles"], answer: 0, hint: "When it rains, they come down.", explain: "Clouds are made of tiny water droplets, small enough for moving air to keep them up." },
      { q: "A big log and a small pebble go into a pond. What happens?", choices: ["Both sink", "The log floats and the pebble sinks", "The pebble floats and the log sinks"], answer: 1, hint: "Is each one light or heavy for its size?", explain: "The log is light for its size and floats; the pebble is heavy for its size and sinks." }
    ]
  },
  {
    id: 'p1-castle-stained-glass',
    subject: 'physics',
    floor: 1,
    realm: 'castle',
    title: "Coloured Light and Shadows",
    topic: 'light-colour',
    topicName: 'Light, colour and shadows',
    blurb: "See how stained-glass windows paint coloured light on the floor, and play with shadows.",
    reading: [
      { title: "Light goes straight", emoji: '🔦', text: "Light travels in straight lines. When something blocks the light, it makes a dark shape behind it: a shadow." },
      { title: "Clear glass", emoji: '🪟', text: "Clear glass lets light pass right through it. Stone walls and wooden doors block light completely." },
      { title: "Coloured glass", emoji: '🌈', text: "Red glass lets red light through and stops other colours. That's why sunshine through a stained-glass window makes coloured patches on the floor." },
      { title: "Moving shadows", emoji: '🧸', text: "Move a torch closer to a toy, and its shadow grows bigger. Move the torch away, and the shadow shrinks." }
    ],
    sim: {
      id: 'shadow',
      predict: {
        q: "You move the torch closer to the toy. What happens to its shadow on the wall?",
        choices: ["It gets smaller", "It gets bigger", "It turns red"],
        answer: 1,
        explain: "Close to the torch, the toy blocks more of the spreading light, so its shadow is bigger."
      }
    },
    quiz: [
      { q: "What is a shadow?", choices: ["A dark shape where light is blocked", "A kind of paint", "A sleeping cat"], answer: 0, hint: "Something gets in the light's way.", explain: "A shadow is the dark shape behind something that blocks the light." },
      { q: "Which one lets light pass right through?", choices: ["A stone wall", "Clear glass", "A wooden door"], answer: 1, hint: "You can see through it.", explain: "Clear glass lets light pass through." },
      { q: "Why does a stained-glass window make red patches on the floor?", choices: ["Someone painted the floor", "The sun is red", "Red glass lets only red light through"], answer: 2, hint: "The glass is coloured.", explain: "Red glass lets red light through and stops the other colours." },
      { q: "How does light travel?", choices: ["In straight lines", "In circles", "In zigzags"], answer: 0, hint: "Think of a torch beam.", explain: "Light travels in straight lines." },
      { q: "You move the torch far away from the toy. What happens to the shadow?", choices: ["It gets bigger", "It gets smaller", "It disappears forever"], answer: 1, hint: "The opposite of moving it closer.", explain: "Moving the torch away makes the shadow smaller." }
    ]
  },

  // ───────────── Street 2: Ribbon Lane (about age 7–8) ─────────────
  {
    id: 'p2-castle-bells',
    subject: 'physics',
    floor: 2,
    realm: 'castle',
    title: "Big Bells and Little Bells",
    topic: 'sound-pitch',
    topicName: 'Sound and pitch',
    blurb: "Why do big bells sound low and little bells sound high? Pluck a ruler and find out.",
    reading: [
      { title: "Ding, dong!", emoji: '🔔', text: "When a bell is struck, the metal wobbles very fast. This wobbling is called vibrating. The vibrations travel through the air to your ears as sound." },
      { title: "Big and low", emoji: '🐘', text: "A big, heavy bell vibrates slowly and makes a low note: dong! A small bell vibrates quickly and makes a high note: ting!" },
      { title: "Loud and soft", emoji: '📢', text: "Strike a bell harder and it vibrates with bigger wobbles, so the sound is louder. A gentle tap makes a soft sound." },
      { title: "A famous bell", emoji: '🕰️', text: "Big Ben is the name of the great bell in the clock tower in London. It weighs about 13 tonnes, as much as two elephants, and it booms a deep, low note." }
    ],
    sim: {
      id: 'sound',
      predict: {
        q: "You make the part of the ruler that twangs shorter. What happens to the note?",
        choices: ["It gets higher", "It gets lower", "It stays the same"],
        answer: 0,
        explain: "A shorter ruler vibrates faster, so the note is higher, just like a small bell."
      }
    },
    quiz: [
      { q: "What does a bell do when it rings?", choices: ["It vibrates", "It melts", "It shrinks"], answer: 0, hint: "The metal wobbles very fast.", explain: "A ringing bell vibrates, and the vibrations make the sound." },
      { q: "Which bell makes the lowest note?", choices: ["A tiny bell", "A great big bell", "A middle-sized bell"], answer: 1, hint: "Big things vibrate slowly.", explain: "A big bell vibrates slowly and makes a low note." },
      { q: "How do you make a bell ring louder?", choices: ["Paint it", "Whisper to it", "Strike it harder"], answer: 2, hint: "Bigger wobbles.", explain: "Striking it harder makes bigger vibrations, so the sound is louder." },
      { q: "How does the sound get from the bell to your ears?", choices: ["Through the air", "Through a pipe", "By post"], answer: 0, hint: "What is all around us?", explain: "The vibrations travel through the air to your ears." },
      { q: "What is Big Ben?", choices: ["A giant", "The great bell in a clock tower in London", "A castle dog"], answer: 1, hint: "It booms a deep, low note.", explain: "Big Ben is the great bell in the clock tower in London." }
    ]
  },
  {
    id: 'p2-castle-blacksmith',
    subject: 'physics',
    floor: 2,
    realm: 'castle',
    title: "The Blacksmith's Magnet",
    topic: 'magnets-iron',
    topicName: 'Magnets and iron',
    blurb: "Help the castle blacksmith find which things a magnet will pull.",
    reading: [
      { title: "The blacksmith", emoji: '⚒️', text: "Every castle town had a blacksmith. The blacksmith heated iron until it glowed and hammered it into horseshoes, nails, hinges and keys." },
      { title: "Magnets pull iron", emoji: '🧲', text: "Magnets pull on things made of iron and steel. They don't pull on wood, glass, plastic or paper." },
      { title: "Not every metal", emoji: '🥫', text: "Some metals, like aluminium, copper and gold, are not pulled by an ordinary magnet. A magnet is a good way to find iron!" },
      { title: "Magic stones", emoji: '🪨', text: "Long ago people found lodestones: rocks that are natural magnets. They used them to make the first compasses." }
    ],
    sim: {
      id: 'magnet',
      setup: { items: ['iron-nail', 'steel-bolt', 'paper-clip', 'wooden-block', 'glass-marble', 'aluminium-can'] },
      predict: {
        q: "The blacksmith brings a magnet near an iron nail, a glass marble and a wooden block. Which will it pull?",
        choices: ["The glass marble", "The wooden block", "The iron nail"],
        answer: 2,
        explain: "Magnets pull on iron and steel, so the iron nail jumps to the magnet."
      }
    },
    quiz: [
      { q: "What does a magnet pull on?", choices: ["Iron and steel", "Wood", "Glass"], answer: 0, hint: "The blacksmith's favourite metal.", explain: "Magnets pull on iron and steel." },
      { q: "Will a magnet pick up an aluminium can?", choices: ["Yes, easily", "No, aluminium isn't pulled by a magnet", "Only on Tuesdays"], answer: 1, hint: "Not every metal is pulled.", explain: "Aluminium is a metal, but an ordinary magnet doesn't pull it." },
      { q: "What did a blacksmith make?", choices: ["Bread", "Glass windows", "Horseshoes, nails and keys"], answer: 2, hint: "Things made of iron.", explain: "The blacksmith hammered hot iron into horseshoes, nails, hinges and keys." },
      { q: "What is a lodestone?", choices: ["A rock that is a natural magnet", "A heavy loaf of bread", "A castle tower"], answer: 0, hint: "It was used to make the first compasses.", explain: "A lodestone is a rock that is a natural magnet." },
      { q: "Which one will a magnet pull?", choices: ["A paper clip", "A wooden spoon", "A rubber band"], answer: 0, hint: "Which one is made of steel?", explain: "A paper clip is made of steel, so the magnet pulls it." }
    ]
  },

  // ───────────── Street 3: Dragon Court (about age 8–9) ─────────────
  {
    id: 'p3-castle-bell-casting',
    subject: 'physics',
    floor: 3,
    realm: 'castle',
    title: "Melting and Casting: How Bells Are Made",
    topic: 'melting-casting',
    topicName: 'Melting and freezing',
    blurb: "Watch candle wax and bell metal melt and set hard again, and see ice do the same in the lab.",
    reading: [
      { title: "Solid and liquid", emoji: '🧊', text: "Heat makes a solid melt into a liquid. Cool the liquid down, and it freezes back into a solid. Ice melts into water at 0 °C." },
      { title: "Candles", emoji: '🕯️', text: "Castles were lit by candles. The flame's heat melts the wax near the wick into a liquid, which the wick soaks up to keep the flame burning." },
      { title: "Casting bells", emoji: '🔔', text: "Bells are made of bronze, a mix of copper and tin. Bell founders heated it to about 1,000 °C until it melted, then poured it into a bell-shaped mould." },
      { title: "Setting hard", emoji: '⏳', text: "As the hot metal cooled, it froze into a solid bell in the shape of the mould. Melting and freezing let people shape metal into almost anything!" }
    ],
    sim: {
      id: 'states',
      predict: {
        q: "You heat ice that starts at −10 °C. At what temperature will it start to melt?",
        choices: ["−10 °C", "0 °C", "100 °C"],
        answer: 1,
        explain: "Ice melts at 0 °C. Bronze melts too, but only when it is about 1,000 °C!"
      }
    },
    quiz: [
      { q: "What happens to a solid when you heat it enough?", choices: ["It melts into a liquid", "It gets colder", "It turns into a bell"], answer: 0, hint: "Think of ice in the sun.", explain: "Heat melts a solid into a liquid." },
      { q: "At what temperature does ice melt?", choices: ["100 °C", "0 °C", "50 °C"], answer: 1, hint: "The same temperature at which water freezes.", explain: "Ice melts at 0 °C." },
      { q: "What are bells usually made of?", choices: ["Glass", "Wood", "Bronze, a mix of copper and tin"], answer: 2, hint: "A strong metal mix.", explain: "Bells are usually made of bronze, a mix of copper and tin." },
      { q: "How did bell founders shape a bell?", choices: ["Poured melted metal into a mould and let it cool", "Carved it from ice", "Knitted it"], answer: 0, hint: "Melting, then freezing.", explain: "They melted the bronze, poured it into a bell-shaped mould, and let it cool and set hard." },
      { q: "What happens to the hot liquid metal as it cools?", choices: ["It boils", "It freezes into a solid", "It floats away"], answer: 1, hint: "The opposite of melting.", explain: "As it cools, the liquid metal freezes into a solid." }
    ]
  },
  {
    id: 'p3-castle-hill-carts',
    subject: 'physics',
    floor: 3,
    realm: 'castle',
    title: "Carts on the Castle Hill",
    topic: 'friction-castle',
    topicName: 'Friction',
    blurb: "Roll carts down the castle hill on ice, wood and carpet, and find out about the gripping force called friction.",
    reading: [
      { title: "Up and down the hill", emoji: '🛒', text: "Carts carried bread, barrels and firewood up and down the steep castle streets. Getting them to stop was just as important as getting them to go!" },
      { title: "Friction", emoji: '🤚', text: "Friction is a force that pulls against things sliding or rolling over each other. Rough surfaces have lots of friction; smooth ones have very little." },
      { title: "Slippery in winter", emoji: '🧊', text: "Ice is very smooth, so there is little friction. People sprinkled sand or ashes on icy paths to give their feet and cart wheels more grip." },
      { title: "Wheels help", emoji: '🛞', text: "Dragging a heavy load is hard work because of friction. Rolling it on wheels is much easier: that's why carts have wheels!" }
    ],
    sim: {
      id: 'ramp',
      setup: { surfaces: ['ice', 'wood', 'carpet'] },
      predict: {
        q: "A toy cart rolls down the ramp onto ice, wood or carpet. On which floor does it roll the furthest?",
        choices: ["Carpet", "Wood", "Ice"],
        answer: 2,
        explain: "Ice is the smoothest, with the least friction, so the cart rolls furthest on it."
      }
    },
    quiz: [
      { q: "What is friction?", choices: ["A force that pulls against things sliding or rolling", "A kind of cart", "A strong wind"], answer: 0, hint: "It slows things down.", explain: "Friction is a force that works against things sliding or rolling over each other." },
      { q: "Which surface has the most friction?", choices: ["Ice", "Rough carpet", "Polished glass"], answer: 1, hint: "Rough surfaces grip more.", explain: "Rough carpet has the most friction of these." },
      { q: "Why did people sprinkle sand on icy paths?", choices: ["To make them pretty", "To melt the castle", "To give feet and wheels more grip"], answer: 2, hint: "Sand is rough.", explain: "Sand made the path rougher, giving more friction and grip." },
      { q: "Why do carts have wheels?", choices: ["Rolling is much easier than dragging", "Wheels look nice", "So they can float"], answer: 0, hint: "Dragging a heavy load is hard work.", explain: "Rolling on wheels has much less friction than dragging, so it's easier." },
      { q: "A cart rolls onto a smooth floor. What happens?", choices: ["It stops at once", "It rolls a long way, because there is little friction", "It rolls backwards"], answer: 1, hint: "Smooth means little friction.", explain: "With little friction to slow it down, it rolls a long way." }
    ]
  },

  // ───────────── Street 4: Bell Tower Walk (about age 9–10) ─────────────
  {
    id: 'p4-castle-drawbridge',
    subject: 'physics',
    floor: 4,
    realm: 'castle',
    title: "Lifting the Drawbridge",
    topic: 'levers-castle',
    topicName: 'Levers and counterweights',
    blurb: "Balance weights on a lever, and see how a counterweight lifts a heavy drawbridge.",
    reading: [
      { title: "A lever", emoji: '⚖️', text: "A lever is a bar that turns on a point called the pivot. Push down on one end, and the other end goes up, like a seesaw." },
      { title: "Far out is stronger", emoji: '📏', text: "A weight far from the pivot turns the lever more than the same weight close to it. So a small weight far out can balance a big weight close in." },
      { title: "The drawbridge", emoji: '🌉', text: "Some drawbridges were built like a seesaw: when the bridge went down, a heavy counterweight on the other end went up, and the two nearly balanced." },
      { title: "Easy lifting", emoji: '💪', text: "Because the counterweight did most of the work, the guards needed only a little push to raise the heavy bridge. Some modern bridges still lift this way." }
    ],
    sim: {
      id: 'lever',
      predict: {
        q: "A 4 kg weight sits 2 steps from the pivot on the left. Where should a 2 kg weight go on the right to balance it?",
        choices: ["2 steps out", "4 steps out", "1 step out"],
        answer: 1,
        explain: "4 kg × 2 steps = 8, and 2 kg × 4 steps = 8. Half the weight needs twice the distance."
      }
    },
    quiz: [
      { q: "What is the turning point of a lever called?", choices: ["The pivot", "The handle", "The drawbridge"], answer: 0, hint: "It's the point the bar turns on.", explain: "A lever turns on a point called the pivot." },
      { q: "A small weight can balance a big one if it sits…", choices: ["Closer to the pivot", "Further from the pivot", "On top of the big one"], answer: 1, hint: "Far out is stronger.", explain: "A weight far from the pivot turns the lever more." },
      { q: "What did a counterweight on a drawbridge do?", choices: ["Made it heavier to lift", "Held up the castle", "Balanced the bridge, so it was easy to lift"], answer: 2, hint: "Think of a seesaw.", explain: "The counterweight nearly balanced the bridge, so only a little push was needed." },
      { q: "A 6 kg weight sits 1 step from the pivot. Where must a 3 kg weight go on the other side to balance it?", choices: ["2 steps out", "3 steps out", "6 steps out"], answer: 0, hint: "6 × 1 = 3 × ?", explain: "6 × 1 = 6 and 3 × 2 = 6, so 2 steps out." },
      { q: "Which of these is a lever?", choices: ["A seesaw", "A ball", "A window"], answer: 0, hint: "A bar that turns on a pivot.", explain: "A seesaw is a lever: a bar turning on a pivot in the middle." }
    ]
  },
  {
    id: 'p4-castle-lightning-rod',
    subject: 'physics',
    floor: 4,
    realm: 'castle',
    title: "Lightning and the Tall Towers",
    topic: 'conductors',
    topicName: 'Conductors and insulators',
    blurb: "Find out which things let electricity flow, and how a metal rod keeps tall towers safe from lightning.",
    reading: [
      { title: "A giant spark", emoji: '⚡', text: "Lightning is a giant spark of electricity jumping between a cloud and the ground. It often strikes the tallest things around, like towers and trees." },
      { title: "Conductors", emoji: '🔌', text: "Electricity flows easily through metals like copper, iron and aluminium. These are called conductors." },
      { title: "Insulators", emoji: '🧤', text: "Rubber, plastic, dry wood and glass don't let electricity through easily. They are called insulators, and they keep us safe from electric shocks." },
      { title: "The lightning rod", emoji: '🗼', text: "In the 1750s, Benjamin Franklin suggested a metal rod on top of tall buildings, joined by a metal strip down to the ground. Lightning follows the metal safely down, instead of damaging the tower." }
    ],
    sim: {
      id: 'circuit',
      setup: { items: ['copper-wire', 'aluminium-foil', 'iron-nail', 'rubber-band', 'wooden-stick', 'plastic-straw'] },
      predict: {
        q: "You bridge the gap in the circuit with a copper wire, then with a rubber band. Which one lights the bulb?",
        choices: ["The rubber band", "The copper wire", "Neither"],
        answer: 1,
        explain: "Copper is a conductor, so electricity flows through it and the bulb lights. Rubber is an insulator."
      }
    },
    quiz: [
      { q: "What is lightning?", choices: ["A giant spark of electricity", "A shooting star", "A very bright bird"], answer: 0, hint: "It jumps between a cloud and the ground.", explain: "Lightning is a giant spark of electricity." },
      { q: "Which of these is a conductor?", choices: ["A rubber band", "A copper wire", "A plastic straw"], answer: 1, hint: "Metals let electricity flow.", explain: "Copper is a metal and a good conductor." },
      { q: "Which of these is an insulator?", choices: ["Aluminium foil", "An iron nail", "A wooden stick"], answer: 2, hint: "It doesn't let electricity through easily.", explain: "Dry wood is an insulator." },
      { q: "What does a lightning rod do?", choices: ["Leads the lightning safely down to the ground", "Makes lightning", "Keeps rain away"], answer: 0, hint: "It is joined by metal to the ground.", explain: "It gives lightning a safe metal path down to the ground." },
      { q: "Who suggested the lightning rod in the 1750s?", choices: ["Benjamin Franklin", "King John", "Fibonacci"], answer: 0, hint: "An American inventor and writer.", explain: "Benjamin Franklin suggested the lightning rod in the 1750s." }
    ]
  },

  // ───────────── Street 5: Sundial Garden (about age 10–11) ─────────────
  {
    id: 'p5-castle-pendulum-clock',
    subject: 'physics',
    floor: 5,
    realm: 'castle',
    title: "The Pendulum Clock",
    topic: 'pendulum-clocks',
    topicName: 'Pendulum clocks',
    blurb: "Find out how a swinging weight made clocks far more accurate, and test pendulums in the workshop.",
    reading: [
      { title: "Clocks that wandered", emoji: '🕰️', text: "The first tower clocks were driven by falling weights. They were clever, but they could gain or lose about a quarter of an hour every day." },
      { title: "Galileo's lamp", emoji: '💡', text: "In the 1580s, the story goes, young Galileo watched a lamp swinging in Pisa Cathedral. He noticed that each swing took the same time, whether it was big or small." },
      { title: "Huygens' clock", emoji: '⏱️', text: "In 1656, Christiaan Huygens built the first pendulum clock. A swinging pendulum kept its beat so well that the best clocks were soon off by only about ten seconds a day." },
      { title: "Length matters", emoji: '📏', text: "A pendulum's swing time depends on its length, not its weight. A longer pendulum swings more slowly. Big Ben's pendulum is about 4 m long and takes 2 seconds for each swing." }
    ],
    sim: {
      id: 'pendulum',
      predict: {
        q: "You make the pendulum's string longer, keeping the same weight. What happens to the time for each swing?",
        choices: ["It gets shorter", "It stays the same", "It gets longer"],
        answer: 2,
        explain: "A longer pendulum swings more slowly, so each swing takes longer. Clockmakers set a clock's speed by changing the pendulum's length."
      }
    },
    quiz: [
      { q: "Who built the first pendulum clock, in 1656?", choices: ["Christiaan Huygens", "Leonardo da Vinci", "King Sejong"], answer: 0, hint: "A Dutch scientist.", explain: "Christiaan Huygens built the first pendulum clock in 1656." },
      { q: "What did Galileo notice about the swinging lamp?", choices: ["It was on fire", "Each swing took the same time", "It swung faster and faster"], answer: 1, hint: "Big swings and small swings…", explain: "He noticed each swing took the same time, big or small." },
      { q: "What changes how long a pendulum's swing takes?", choices: ["Its colour", "Its weight", "Its length"], answer: 2, hint: "Not the weight!", explain: "The swing time depends on the pendulum's length, not its weight." },
      { q: "A clock's pendulum makes it run too slow. What should the clockmaker do?", choices: ["Make the pendulum shorter", "Make the pendulum longer", "Paint it gold"], answer: 0, hint: "Shorter pendulums swing faster.", explain: "A shorter pendulum swings faster, so the clock speeds up." },
      { q: "Why were pendulum clocks better than the first tower clocks?", choices: ["They kept much more accurate time", "They were louder", "They didn't need numbers"], answer: 0, hint: "The pendulum keeps a steady beat.", explain: "A pendulum keeps a steady beat, so the clocks kept much better time." }
    ]
  },
  {
    id: 'p5-castle-messenger-birds',
    subject: 'physics',
    floor: 5,
    realm: 'castle',
    title: "Messenger Pigeons: How Fast?",
    topic: 'speed-castle',
    topicName: 'Speed, distance and time',
    blurb: "Send messages by pigeon, and race carts to see how speed, distance and time fit together.",
    reading: [
      { title: "Flying home", emoji: '🕊️', text: "Homing pigeons can find their way home from far away. For thousands of years, people have used them to carry little messages tied to their legs." },
      { title: "How fast?", emoji: '💨', text: "A homing pigeon can fly at about 80 km an hour, much faster than a horse can gallop for long." },
      { title: "Distance = speed × time", emoji: '🧮', text: "If a pigeon flies at 80 km an hour for 2 hours, it goes 80 × 2 = 160 km." },
      { title: "Time = distance ÷ speed", emoji: '⏱️', text: "To find how long a trip takes, divide the distance by the speed. 240 km at 80 km an hour takes 240 ÷ 80 = 3 hours." }
    ],
    sim: {
      id: 'race',
      predict: {
        q: "In the workshop, cart A goes at 3 m/s and cart B at 6 m/s. They race for 5 seconds. How far does cart B travel?",
        choices: ["15 m", "30 m", "11 m"],
        answer: 1,
        explain: "Distance = speed × time = 6 × 5 = 30 m. Cart A only goes 3 × 5 = 15 m."
      }
    },
    quiz: [
      { q: "About how fast can a homing pigeon fly?", choices: ["About 80 km an hour", "About 8 km an hour", "About 800 km an hour"], answer: 0, hint: "Faster than a galloping horse.", explain: "A homing pigeon can fly at about 80 km an hour." },
      { q: "A pigeon flies at 80 km an hour for 3 hours. How far does it go?", choices: ["83 km", "240 km", "160 km"], answer: 1, hint: "Distance = speed × time.", explain: "80 × 3 = 240 km." },
      { q: "A message must go 160 km. A pigeon flies at 80 km an hour. How long will it take?", choices: ["4 hours", "1 hour", "2 hours"], answer: 2, hint: "Time = distance ÷ speed.", explain: "160 ÷ 80 = 2 hours." },
      { q: "A horse rider goes 20 km an hour for 4 hours. How far does the rider go?", choices: ["80 km", "24 km", "5 km"], answer: 0, hint: "20 × 4", explain: "20 × 4 = 80 km." },
      { q: "Two pigeons fly for the same time. One flies twice as fast. How far does it go?", choices: ["Twice as far", "Half as far", "The same distance"], answer: 0, hint: "Distance = speed × time.", explain: "Double the speed for the same time means double the distance." }
    ]
  },

  // ───────────── Street 6: Balloon Bastion (about age 11–12) ─────────────
  {
    id: 'p6-castle-rainbows',
    subject: 'physics',
    floor: 6,
    realm: 'castle',
    title: "Rainbows by the Waterfalls",
    topic: 'rainbows',
    topicName: 'Rainbows and light',
    blurb: "Find out how sunlight and water drops make rainbows, and bounce light beams off mirrors.",
    reading: [
      { title: "White light is many colours", emoji: '🌈', text: "Sunlight looks white, but it is really a mix of colours. In 1666, Isaac Newton began showing this with a prism, a block of glass that spreads light into a rainbow." },
      { title: "Bending light", emoji: '💧', text: "When sunlight goes into a water drop, it bends. Each colour bends by a slightly different amount, so the colours spread apart: red, orange, yellow, green, blue, indigo and violet." },
      { title: "A bounce inside", emoji: '↩️', text: "Inside the drop, the light bounces off the back, like a mirror, and comes out again towards you. Millions of drops together make a rainbow." },
      { title: "Where to look", emoji: '☀️', text: "To see a rainbow, stand with the Sun behind you and look towards the rain or the spray of a waterfall. That's why the Sky Castle's waterfalls are full of rainbows on sunny days!" }
    ],
    sim: {
      id: 'mirror',
      predict: {
        q: "A light beam hits the mirror at 35° from the normal. At what angle from the normal will it bounce off?",
        choices: ["35°", "70°", "0°"],
        answer: 0,
        explain: "Light bounces off a mirror at the same angle it came in: 35°. Light bounces like this off the back of each raindrop too."
      }
    },
    quiz: [
      { q: "What is sunlight really made of?", choices: ["A mix of all the colours", "Only yellow light", "Tiny suns"], answer: 0, hint: "A prism spreads it out.", explain: "White sunlight is a mix of all the colours of the rainbow." },
      { q: "What happens to light when it goes into a water drop?", choices: ["It disappears", "It bends, and the colours spread apart", "It freezes"], answer: 1, hint: "Each colour bends a slightly different amount.", explain: "Light bends as it enters the drop, and each colour bends a little differently." },
      { q: "Where should the Sun be when you look for a rainbow?", choices: ["In front of you", "Straight above you", "Behind you"], answer: 2, hint: "Look towards the rain, away from the Sun.", explain: "Stand with the Sun behind you and look towards the rain or spray." },
      { q: "A beam hits a mirror at 20° from the normal. At what angle does it bounce off?", choices: ["20°", "40°", "90°"], answer: 0, hint: "Angle in equals angle out.", explain: "It bounces off at 20°, the same angle it came in." },
      { q: "Who showed with a prism that white light is a mix of colours?", choices: ["Isaac Newton", "Hildegard of Bingen", "Christiaan Huygens"], answer: 0, hint: "He also studied gravity.", explain: "Isaac Newton showed it with prisms, starting in 1666." }
    ]
  },
  {
    id: 'p6-castle-parachutes',
    subject: 'physics',
    floor: 6,
    realm: 'castle',
    title: "Floating Down: Parachutes and Air",
    topic: 'air-resistance-castle',
    topicName: 'Air resistance',
    blurb: "Drop a flat sheet and a crumpled ball of paper, and find out how parachutes slow a fall.",
    reading: [
      { title: "Air pushes back", emoji: '🌬️', text: "When something falls, it has to push the air out of its way. The air pushes back. This push is called air resistance, or drag." },
      { title: "Bigger means slower", emoji: '🪂', text: "The more surface something spreads out against the air, the more drag it gets. A parachute opens wide to catch lots of air, so it falls slowly." },
      { title: "Early parachutes", emoji: '📐', text: "In about 1485, Leonardo da Vinci sketched a pyramid-shaped parachute. In 1783, Louis-Sébastien Lenormand jumped from a tower in France holding a parachute, and gave it its name." },
      { title: "Seeds and feathers", emoji: '🪶', text: "Nature uses drag too: dandelion seeds drift on tiny parachutes, and birds spread their wings and tails wide to glide down gently." }
    ],
    sim: {
      id: 'drop',
      setup: { objects: ['paper', 'crumpled-paper'], air: 'on' },
      predict: {
        q: "You drop a flat sheet of paper and a crumpled ball of the same paper at the same time. Which lands first?",
        choices: ["The flat sheet", "The crumpled ball", "They land together"],
        answer: 1,
        explain: "The flat sheet spreads out and catches lots of air, so drag slows it down. The crumpled ball has little drag and falls fast."
      }
    },
    quiz: [
      { q: "What is air resistance?", choices: ["The push of air against something moving through it", "A kind of storm", "A castle wall"], answer: 0, hint: "It is also called drag.", explain: "Air resistance, or drag, is the air pushing back on something moving through it." },
      { q: "Why does a parachute fall slowly?", choices: ["It is very heavy", "It spreads wide and catches lots of air", "It is made of feathers"], answer: 1, hint: "More surface, more drag.", explain: "A parachute opens wide, so the air pushes back on it a lot." },
      { q: "Who sketched a pyramid-shaped parachute in about 1485?", choices: ["Isaac Newton", "Benjamin Franklin", "Leonardo da Vinci"], answer: 2, hint: "He also painted the Mona Lisa.", explain: "Leonardo da Vinci sketched a pyramid-shaped parachute in about 1485." },
      { q: "In a place with no air at all, a feather and a ball are dropped together. What happens?", choices: ["They land together", "The feather floats up", "The feather lands first"], answer: 0, hint: "With no air, there is no drag.", explain: "With no air there is no drag, so they fall together." },
      { q: "How do dandelion seeds use drag?", choices: ["They float down slowly on tiny parachutes", "They roll along the ground", "They swim"], answer: 0, hint: "Blow on a dandelion clock!", explain: "Each seed has a fluffy tuft that catches the air like a tiny parachute." }
    ]
  },

  // ───────────── Street 7: Crown Garden (about age 12–13) ─────────────
  {
    id: 'p7-castle-air-pressure',
    subject: 'physics',
    floor: 7,
    realm: 'castle',
    title: "Cooking in the Clouds: Air Pressure Up High",
    topic: 'air-pressure',
    topicName: 'Air pressure and boiling',
    blurb: "Discover why air gets thinner high up, and why water boils at a lower temperature on a mountain.",
    reading: [
      { title: "A sea of air", emoji: '🌍', text: "We live at the bottom of a deep ocean of air. All that air above us presses down on everything: this is air pressure." },
      { title: "Thinner up high", emoji: '🏔️', text: "The higher you go, the less air there is above you, so the air pressure is lower and the air is thinner. At the top of Mount Everest, it is only about a third of the pressure at sea level." },
      { title: "Boiling at a lower temperature", emoji: '♨️', text: "At sea level, water boils at 100 °C. With less air pressing down, it boils at a lower temperature: about 90 °C at 3,000 m, and only about 70 °C on top of Everest." },
      { title: "Slow pasta", emoji: '🍝', text: "Water that boils at 90 °C is not as hot, so food takes longer to cook. High up in the mountains, people use pressure cookers, which hold the steam in to make the water hotter." }
    ],
    sim: {
      id: 'states',
      predict: {
        q: "In the workshop, at sea level, you keep heating a beaker of water. At what temperature will it start to boil?",
        choices: ["70 °C", "100 °C", "0 °C"],
        answer: 1,
        explain: "At sea level, water boils at 100 °C. Up in a castle in the clouds, with lower air pressure, it would boil at a lower temperature."
      }
    },
    quiz: [
      { q: "What is air pressure?", choices: ["The push of all the air above us", "A kind of wind instrument", "The smell of the air"], answer: 0, hint: "We live at the bottom of an ocean of air.", explain: "Air pressure is the push of the air pressing down on everything." },
      { q: "What happens to the air as you climb a mountain?", choices: ["It gets thicker", "It gets thinner, with lower pressure", "It turns into water"], answer: 1, hint: "There's less air above you.", explain: "There is less air above you, so the pressure is lower and the air is thinner." },
      { q: "At what temperature does water boil at sea level?", choices: ["0 °C", "70 °C", "100 °C"], answer: 2, hint: "The usual boiling point.", explain: "At sea level, water boils at 100 °C." },
      { q: "About what temperature does water boil at on top of Mount Everest?", choices: ["About 70 °C", "About 150 °C", "About 100 °C"], answer: 0, hint: "Much less air presses down up there.", explain: "On top of Everest, water boils at only about 70 °C." },
      { q: "Why do people high in the mountains use pressure cookers?", choices: ["To make the water hotter so food cooks faster", "To keep the food cold", "To make the food lighter"], answer: 0, hint: "Holding in the steam raises the pressure.", explain: "A pressure cooker holds in the steam, raising the pressure so water gets hotter before it boils." }
    ]
  },
  {
    id: 'p7-castle-water-mills',
    subject: 'physics',
    floor: 7,
    realm: 'castle',
    title: "Waterfalls, Mills and Energy",
    topic: 'energy-mills',
    topicName: 'Energy and mills',
    blurb: "See how falling water and blowing wind turned millstones, and follow energy round a swinging pendulum.",
    reading: [
      { title: "Energy changes", emoji: '🔄', text: "Energy can change from one kind to another. Water high up has stored energy. As it falls, the stored energy turns into movement energy." },
      { title: "Water mills", emoji: '🌊', text: "A water mill uses falling or flowing water to turn a big wheel. The wheel turns millstones to grind grain into flour. In 1086, a survey in England counted about 5,600 water mills." },
      { title: "Windmills", emoji: '🌬️', text: "Where there was no fast river, people built windmills. The wind turns the sails, and the sails turn the millstones. Today wind turbines use the same idea to make electricity." },
      { title: "The swinging pendulum", emoji: '⏱️', text: "A pendulum swaps energy too: at the top of its swing its energy is stored, and at the bottom it is all movement, so it moves fastest there." }
    ],
    sim: {
      id: 'pendulum',
      predict: {
        q: "You pull the pendulum back higher before letting it go. What happens at the bottom of its swing?",
        choices: ["It moves faster", "It moves more slowly", "It stops"],
        answer: 0,
        explain: "Starting higher gives it more stored energy, which turns into more movement at the bottom. Water falling from higher up turns a mill wheel harder, too."
      }
    },
    quiz: [
      { q: "What kind of energy does water have at the top of a waterfall?", choices: ["Stored energy, because it is high up", "No energy at all", "Sound energy only"], answer: 0, hint: "It can fall a long way.", explain: "Water high up has stored energy, which becomes movement as it falls." },
      { q: "What did a water mill usually do?", choices: ["Ring bells", "Grind grain into flour", "Make ice"], answer: 1, hint: "Think of a miller and bread.", explain: "The water wheel turned millstones that ground grain into flour." },
      { q: "Where is a swinging pendulum moving fastest?", choices: ["At the top of its swing", "Halfway up", "At the bottom of its swing"], answer: 2, hint: "Its stored energy has all turned into movement.", explain: "At the bottom, all its energy is movement, so it is fastest there." },
      { q: "About how many water mills did a survey in England count in 1086?", choices: ["About 5,600", "About 5", "About 5 million"], answer: 0, hint: "A lot, for a country without engines!", explain: "The survey, called the Domesday Book, counted about 5,600 water mills." },
      { q: "What do modern wind turbines make?", choices: ["Electricity", "Flour", "Clouds"], answer: 0, hint: "They power homes.", explain: "Wind turbines use the wind to make electricity." }
    ]
  }
];

/** The Sky Castle's 42 lessons: two per subject on each of the seven streets. */
export const CASTLE_LESSONS = [...CASTLE_MATH, ...CASTLE_HISTORY, ...CASTLE_PHYSICS];
