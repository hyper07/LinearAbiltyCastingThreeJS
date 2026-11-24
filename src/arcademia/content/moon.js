/**
 * The Moon's lessons (the Moon study world, maps.js): seven moonbases in
 * round craters, each with the Dome School (math), the Moon Museum (history)
 * and the Star Observatory (physics) — the same three kinds of lesson as the
 * land, all-new Moon and space stories. Every lesson has realm: 'moon'; its
 * floor is its moonbase (1–7), and its stars open the moonbases, never the
 * land floors.
 *
 * Moonbases: 1 Landing Crater 🛬, 2 Rocket Ridge 🚀, 3 Rover Tracks 🚙,
 * 4 Dish Valley 📡, 5 Greenhouse Crater 🌱, 6 Crystal Caves 💎, 7 Starlight Station 🛰️.
 *
 * Moon Math uses the land's chalkboard and practice generators for the same
 * floor (math.js), but its check is a fixed set of written Moon word
 * problems. Dates long ago say "about"; nothing frightening (no sad stories
 * of animals in space; Apollo 13 is the story of how everyone came home).
 */

/* ------------------------------------------------------------ Moon Math (the Dome School) */

/** A Moon Math lesson: the land generator `gen` draws the board and the practice; the quiz is written. */
const M = (id, floor, title, gen, topicName, blurb, kind, reading, quiz) => ({
  id, subject: 'math', floor, realm: 'moon', title, topic: gen, topicName, blurb, reading,
  board: { gen }, practice: { kind, gen }, quiz
});

const MOON_MATH = [
  // ───────────── Moonbase 1: Landing Crater (about age 6–7) ─────────────
  M('m1-moon-crater-count', 1, "Counting Craters", 'count', 'Counting', "Count the craters and stars around Landing Crater, one by one and in fives.", 'count', [
    { title: "Holes in the ground", emoji: '🌑', text: "The Moon is covered in round holes called craters. Point to each crater once and say one number. The last number you say tells you how many." },
    { title: "Count in fives", emoji: '🖐️', text: "The moonbase crew put moon rocks in bags of 5. Count the bags: 5, 10, 15, 20. That is much faster than counting one by one!" },
    { title: "Don't count twice", emoji: '⭐', text: "Stars are tricky to count! Start at one side and go across, like reading a book. Then you never count a star twice, and you never miss one." }
  ], [
    { q: "How many craters can you see? 🌑🌑🌑🌑🌑🌑🌑", choices: ["7", "6", "8"], answer: 0, hint: "Point to each crater once as you count.", explain: "1, 2, 3, 4, 5, 6, 7. There are 7 craters." },
    { q: "There are 4 bags with 5 moon rocks in each. How many moon rocks is that?", choices: ["9", "20", "15"], answer: 1, hint: "Count in fives: 5, 10, …", explain: "5, 10, 15, 20. Four bags of 5 make 20 moon rocks." },
    { q: "Count the stars: ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐. How many are there?", choices: ["11", "10", "12"], answer: 2, hint: "Count the first 10, then keep going.", explain: "10, then 11, 12. There are 12 stars." },
    { q: "The rover counts craters: 16, 17, 18. What number comes next?", choices: ["17", "19", "20", "16"], answer: 1, hint: "What number comes just after 18?", explain: "After 18 comes 19." },
    { q: "3 astronauts each leave 5 footprints. How many footprints is that?", choices: ["15", "8", "35"], answer: 0, hint: "Count in fives, 3 times.", explain: "5, 10, 15. Three lots of 5 make 15 footprints." }
  ]),
  M('m1-moon-countdown', 1, "Rocket Countdown", 'sub10', 'Subtracting within 10', "Count back to lift-off, and find how many are left.", 'numberline', [
    { title: "Count down to blast-off!", emoji: '🚀', text: "Before a rocket lifts off, everyone counts backwards together: 10, 9, 8, 7, 6, 5, 4, 3, 2, 1… lift-off!" },
    { title: "Taking away", emoji: '➖', text: "Subtracting means taking some away. 8 moon cookies take away 3 leaves 5 cookies. Counting back helps you find the answer." },
    { title: "Hop back", emoji: '🐰', text: "On the number line, start at the first number and hop back once for each one you take away. Where you land is the answer." }
  ], [
    { q: "The countdown goes 10, 9, 8, 7. What number comes next?", choices: ["8", "6", "5"], answer: 1, hint: "Count backwards: one less each time.", explain: "10, 9, 8, 7, then 6." },
    { q: "There are 9 astronauts in the moonbase. 4 go out to explore. How many are still inside?", choices: ["5", "13", "4"], answer: 0, hint: "Start at 9 and hop back 4.", explain: "9 − 4 = 5. There are 5 astronauts inside." },
    { q: "Miss Mochi has 7 rice cakes. She gives away 2. How many does she have left?", choices: ["9", "4", "5"], answer: 2, hint: "Start at 7 and hop back 2.", explain: "7 − 2 = 5. She has 5 rice cakes left." },
    { q: "6 rovers are parked. All 6 drive away. How many are left?", choices: ["6", "0", "12", "1"], answer: 1, hint: "They all drove away.", explain: "6 − 6 = 0. No rovers are left." },
    { q: "The rocket has 10 seconds to go. 3 seconds pass. How many seconds are left?", choices: ["6", "13", "7"], answer: 2, hint: "Start at 10 and hop back 3.", explain: "10 − 3 = 7. There are 7 seconds to go." }
  ]),

  // ───────────── Moonbase 2: Rocket Ridge (about age 7–8) ─────────────
  M('m2-moon-rock-tens', 2, "Moon Rocks in Tens", 'tens-ones', 'Place value', "Bag moon rocks in tens and find what each digit means.", 'place-value', [
    { title: "Bags of ten", emoji: '🪨', text: "Astronauts collect moon rocks to bring home. Let's put our rocks in bags of 10. 3 full bags and 4 loose rocks make 34 rocks." },
    { title: "Tens and ones", emoji: '🔢', text: "In 34, the 3 is in the tens place, so it means 30. The 4 is in the ones place, so it means 4." },
    { title: "Swap the digits", emoji: '🔄', text: "43 and 34 use the same digits, but they are different numbers. 43 is 4 tens and 3 ones, so it is more!" }
  ], [
    { q: "The crew fills 6 bags of 10 moon rocks, and 2 rocks are left over. How many rocks is that?", choices: ["62", "26", "8"], answer: 0, hint: "6 tens and 2 ones.", explain: "6 tens are 60, and 2 more make 62." },
    { q: "In 57, what does the 5 mean?", choices: ["5 ones", "5 tens", "5 hundreds"], answer: 1, hint: "The 5 is in the tens place.", explain: "In 57, the 5 means 5 tens (50) and the 7 means 7 ones." },
    { q: "Which number is 4 tens and 9 ones?", choices: ["94", "13", "49"], answer: 2, hint: "Tens first, then ones.", explain: "4 tens and 9 ones make 49." },
    { q: "Which is more: 71 craters or 17 craters?", choices: ["17", "71", "They are the same"], answer: 1, hint: "Look at the tens first.", explain: "71 has 7 tens, and 17 has only 1 ten. So 71 is more." },
    { q: "How many tens are in 80?", choices: ["80", "0", "10", "8"], answer: 3, hint: "Count in tens: 10, 20, 30 …", explain: "80 is 8 tens and 0 ones." }
  ]),
  M('m2-moon-hops', 2, "Moon Hops in 2s, 5s and 10s", 'skip-count', 'Counting in 2s, 5s and 10s', "Bounce along the Moon in big hops, counting in twos, fives and tens.", 'numberline', [
    { title: "Big bouncy hops", emoji: '🐰', text: "On the Moon you feel so light that you can bounce along in big hops! Astronauts hopped about like kangaroos." },
    { title: "Count in twos", emoji: '👣', text: "Boots come in pairs. Count the boots in twos: 2, 4, 6, 8, 10." },
    { title: "Fives and tens", emoji: '🔟', text: "Count the fingers on space gloves in fives: 5, 10, 15, 20. Count giant hops of 10 steps in tens: 10, 20, 30, 40!" }
  ], [
    { q: "Count in twos: 2, 4, 6, 8, … What comes next?", choices: ["9", "10", "12"], answer: 1, hint: "Add 2 each time.", explain: "8 + 2 = 10." },
    { q: "Each moon hop goes 10 steps along. After 4 hops, how many steps is that?", choices: ["14", "4", "40"], answer: 2, hint: "Count in tens 4 times.", explain: "10, 20, 30, 40. That is 40 steps." },
    { q: "5 astronauts each have 2 boots. How many boots is that?", choices: ["10", "7", "12"], answer: 0, hint: "Count in twos 5 times.", explain: "2, 4, 6, 8, 10. There are 10 boots." },
    { q: "Count in fives: 15, 20, 25, … What comes next?", choices: ["26", "30", "35"], answer: 1, hint: "Add 5.", explain: "25 + 5 = 30." },
    { q: "Which list counts in tens?", choices: ["10, 11, 12, 13", "2, 4, 6, 8", "10, 20, 30, 40"], answer: 2, hint: "Each number is 10 more than the one before.", explain: "10, 20, 30, 40 goes up by 10 each time." }
  ]),

  // ───────────── Moonbase 3: Rover Tracks (about age 8–9) ─────────────
  M('m3-moon-phase-fractions', 3, "Fractions of the Moon", 'fractions', 'Fractions', "Half moon, full moon: find the fractions in the Moon's changing shape, and share mooncakes fairly.", 'pizza', [
    { title: "Parts of a whole", emoji: '🌕', text: "A fraction is part of a whole. When we see the whole bright face of the Moon, it is a full moon. When we see one half of it lit up, it is a half moon." },
    { title: "Top and bottom", emoji: '🔢', text: "In 3/4, the bottom number (4) says how many equal parts there are. The top number (3) says how many of those parts we mean." },
    { title: "A tricky name", emoji: '🌓', text: "The half moon is also called the first quarter moon. That's because the Moon is a quarter (1/4) of the way through its month, not because a quarter of it is lit!" },
    { title: "Share it fairly", emoji: '🥮', text: "Fair shares must be equal. A mooncake cut into 4 equal pieces gives 4 quarters, one for each friend." }
  ], [
    { q: "A mooncake is cut into 4 equal pieces. Hana eats 1 piece. What fraction did she eat?", choices: ["1/4", "1/3", "3/4"], answer: 0, hint: "How many equal pieces? How many were eaten?", explain: "Hana ate 1 of the 4 equal pieces, so she ate 1/4." },
    { q: "At half moon, what fraction of the Moon's face do we see lit up?", choices: ["1/4", "All of it", "1/2"], answer: 2, hint: "It's called a half moon.", explain: "We see half of the Moon's face lit up: 1/2." },
    { q: "The moonbase pizza has 8 equal slices. 5 slices have cheese. What fraction has cheese?", choices: ["3/8", "5/8", "5/3"], answer: 1, hint: "The bottom number is how many slices in all.", explain: "5 of the 8 equal slices have cheese, so 5/8 has cheese." },
    { q: "Which is bigger: 1/2 of a mooncake or 1/4 of the same mooncake?", choices: ["1/2", "1/4", "They are the same"], answer: 0, hint: "Fewer pieces means bigger pieces.", explain: "Cut into 2, each piece is bigger than when it is cut into 4. So 1/2 is bigger." },
    { q: "Why is the half moon also called the first quarter moon?", choices: ["A quarter of the Moon is missing", "The Moon is a quarter of the way through its month", "It is a quarter of the size"], answer: 1, hint: "Think about the Moon's month.", explain: "At first quarter, the Moon has gone a quarter (1/4) of the way through its month of shapes." }
  ]),
  M('m3-moon-month-days', 3, "Days in a Moon Month", 'sub-borrow', 'Column subtraction', "Count the days from one full moon to the next, and subtract in columns.", 'column', [
    { title: "A moon month", emoji: '📅', text: "From one full moon to the next takes about 29 and a half days. Our word 'month' comes from the word 'moon'!" },
    { title: "Line them up", emoji: '📏', text: "To subtract big numbers, write them one under the other: ones under ones, tens under tens. Always start with the ones." },
    { title: "Borrow a ten", emoji: '🧺', text: "If the top ones digit is too small, borrow 1 ten from the tens column. It turns into 10 more ones, and then you can take away." }
  ], [
    { q: "A moonbase has food for 52 days. The crew uses 29 days' worth. How many days of food are left?", choices: ["23", "37", "33"], answer: 0, hint: "2 − 9 is too small, so borrow a ten.", explain: "Borrow: 12 − 9 = 3. Tens: 4 − 2 = 2. So 23 days of food are left." },
    { q: "This month has 30 days. 14 days have passed. How many days are left?", choices: ["26", "14", "16"], answer: 2, hint: "0 − 4: borrow a ten.", explain: "Borrow: 10 − 4 = 6. Tens: 2 − 1 = 1. So 16 days are left." },
    { q: "A rover has 81 km to drive. It has driven 45 km. How far is left?", choices: ["46 km", "36 km", "44 km", "126 km"], answer: 1, hint: "1 − 5: borrow a ten.", explain: "Borrow: 11 − 5 = 6. Tens: 7 − 4 = 3. So 36 km are left." },
    { q: "From one full moon to the next takes about how many days?", choices: ["About 7", "About 365", "About 29 and a half"], answer: 2, hint: "It's nearly a whole month.", explain: "The Moon's shapes repeat about every 29 and a half days." },
    { q: "64 astronauts are at the moonbase. 27 fly home. How many stay?", choices: ["37", "43", "47"], answer: 0, hint: "4 − 7: borrow a ten.", explain: "Borrow: 14 − 7 = 7. Tens: 5 − 2 = 3. So 37 astronauts stay." }
  ]),

  // ───────────── Moonbase 4: Dish Valley (about age 9–10) ─────────────
  M('m4-moon-weight-sixth', 4, "Lighter on the Moon", 'division', 'Division', "On the Moon, things feel about a sixth as heavy. Divide by 6 to find out!", 'array', [
    { title: "A weaker pull", emoji: '🌙', text: "The Moon is much smaller than the Earth, so its pull, called gravity, is weaker. On the Moon, things feel only about 1/6 as heavy as they do on Earth." },
    { title: "Divide by 6", emoji: '➗', text: "To find how heavy something feels on the Moon, share its Earth weight into 6 equal parts and take one part. A bag that feels like 12 kg on Earth feels like about 12 ÷ 6 = 2 kg on the Moon." },
    { title: "Same stuff, less pull", emoji: '🎒', text: "Nothing falls out of the bag on the Moon! It holds just as much stuff. Only the pull on it is weaker, so it feels lighter." },
    { title: "Division undoes times", emoji: '🔄', text: "Division undoes multiplying. 6 × 5 = 30, so 30 ÷ 6 = 5." }
  ], [
    { q: "A rock feels like 18 kg on Earth. How heavy will it feel on the Moon? (Divide by 6.)", choices: ["12 kg", "3 kg", "24 kg"], answer: 1, hint: "Which number times 6 makes 18?", explain: "6 × 3 = 18, so 18 ÷ 6 = 3. It feels like about 3 kg." },
    { q: "36 moon rocks are shared equally between 6 astronauts. How many does each one get?", choices: ["6", "5", "30"], answer: 0, hint: "6 × ? = 36", explain: "6 × 6 = 36, so each astronaut gets 6 rocks." },
    { q: "A toolbox feels like 24 kg on Earth. How heavy will it feel on the Moon?", choices: ["18 kg", "6 kg", "4 kg"], answer: 2, hint: "24 ÷ 6", explain: "6 × 4 = 24, so it feels like about 4 kg." },
    { q: "40 space cookies go into packs of 8. How many packs are there?", choices: ["32", "5", "48", "8"], answer: 1, hint: "8 × ? = 40", explain: "8 × 5 = 40, so there are 5 packs." },
    { q: "On the Moon, a backpack feels lighter. Why?", choices: ["Things fall out of it", "The Moon's pull on it is weaker"], answer: 1, hint: "Nothing falls out of the backpack!", explain: "The backpack holds just as much. The Moon's gravity pulls on it less, so it feels lighter." }
  ]),
  M('m4-moon-six-times', 4, "Six Times Higher", 'mult-2x1', '2-digit × 1-digit', "With the same jump, you would go about six times higher on the Moon. Multiply to find out!", 'grid', [
    { title: "Big moon jumps", emoji: '🦘', text: "Weaker gravity means you go up much higher before you come down. With the same push, a jump on the Moon would go about 6 times higher than on Earth (if you weren't wearing a heavy spacesuit!)." },
    { title: "Split the number", emoji: '✂️', text: "To work out 23 × 6, split 23 into 20 and 3. 20 × 6 = 120 and 3 × 6 = 18. Then add them: 120 + 18 = 138." },
    { title: "Use a grid", emoji: '🔲', text: "Draw a box split into two parts: one for the tens and one for the ones. Multiply each part, then add the two answers together." }
  ], [
    { q: "On Earth, Leo jumps 25 cm high. With the same jump on the Moon, he goes 6 times higher. How high is that?", choices: ["31 cm", "150 cm", "125 cm"], answer: 1, hint: "25 × 6: work out 20 × 6 and 5 × 6.", explain: "20 × 6 = 120 and 5 × 6 = 30. 120 + 30 = 150 cm." },
    { q: "There are 14 solar panels on each of 3 domes. How many solar panels is that?", choices: ["42", "17", "32"], answer: 0, hint: "10 × 3 and 4 × 3.", explain: "10 × 3 = 30 and 4 × 3 = 12. 30 + 12 = 42 panels." },
    { q: "A rover drives 32 km every day for 4 days. How far does it drive?", choices: ["36 km", "118 km", "122 km", "128 km"], answer: 3, hint: "30 × 4 and 2 × 4.", explain: "30 × 4 = 120 and 2 × 4 = 8. 120 + 8 = 128 km." },
    { q: "A ball thrown up on Earth goes 12 m high. Thrown the same way on the Moon, it goes 6 times higher. How high?", choices: ["18 m", "62 m", "72 m"], answer: 2, hint: "12 × 6: work out 10 × 6 and 2 × 6.", explain: "10 × 6 = 60 and 2 × 6 = 12. 60 + 12 = 72 m." },
    { q: "To work out 47 × 5, how can you split 47?", choices: ["Into 40 and 7", "Into 4 and 5", "Into 45 and 5"], answer: 0, hint: "Split it into tens and ones.", explain: "47 is 40 and 7. 40 × 5 = 200 and 7 × 5 = 35, so 47 × 5 = 235." }
  ]),

  // ───────────── Moonbase 5: Greenhouse Crater (about age 10–11) ─────────────
  M('m5-moon-base-area', 5, "Planning a Moonbase", 'area', 'Area and perimeter', "Fence the rover yard and tile the greenhouse floor: area and perimeter on the Moon.", 'grid', [
    { title: "Perimeter: the edge", emoji: '🚧', text: "The perimeter is the distance all the way round a shape. A rover yard 8 m long and 5 m wide has a perimeter of 8 + 5 + 8 + 5 = 26 m." },
    { title: "Area: the inside", emoji: '🟦', text: "The area is how much space is inside a shape. Count the squares, or multiply length × width: 8 × 5 = 40 square metres." },
    { title: "Catching sunlight", emoji: '☀️', text: "Moonbases need power from the Sun. Planners work out the area of their solar panels to know how much sunlight they can catch." }
  ], [
    { q: "A greenhouse floor is 6 m long and 4 m wide. What is its area?", choices: ["10 square metres", "20 square metres", "24 square metres"], answer: 2, hint: "Multiply length × width.", explain: "6 × 4 = 24 square metres." },
    { q: "A rover yard is 9 m long and 3 m wide. How much fence goes all the way round it?", choices: ["24 m", "12 m", "27 m"], answer: 0, hint: "Add up all four sides.", explain: "9 + 3 + 9 + 3 = 24 m of fence." },
    { q: "A square landing pad has sides of 7 m. What is its area?", choices: ["28 square metres", "49 square metres", "14 square metres"], answer: 1, hint: "7 × 7", explain: "7 × 7 = 49 square metres." },
    { q: "A field of solar panels is 12 m long and 5 m wide. What is its area?", choices: ["34 square metres", "17 square metres", "60 square metres"], answer: 2, hint: "12 × 5", explain: "12 × 5 = 60 square metres." },
    { q: "Which one measures the distance all the way round the edge?", choices: ["Area", "Perimeter", "Volume"], answer: 1, hint: "'Peri' means 'around'.", explain: "The perimeter is the distance round the edge. The area is the space inside." }
  ]),
  M('m5-moon-decimals', 5, "Moon Decimals", 'decimals', 'Decimals', "Measure the Moon in tenths: 29.5 days, 27.3 days and more.", 'numberline', [
    { title: "Tenths", emoji: '🔟', text: "A decimal point splits whole numbers from parts. 29.5 means 29 whole days and 5 tenths of a day. Five tenths is a half, so that is 29 and a half days." },
    { title: "Two kinds of moon month", emoji: '🌙', text: "The Moon goes once round the Earth in about 27.3 days. But full moon to full moon takes about 29.5 days, because the Earth has moved along on its trip round the Sun too." },
    { title: "Compare decimals", emoji: '⚖️', text: "To compare 27.3 and 29.5, look at the whole numbers first. 29 is more than 27, so 29.5 is bigger." },
    { title: "Adding tenths", emoji: '➕', text: "Add tenths just like ones: 0.4 + 0.3 = 0.7. If you get 10 tenths, that makes 1 whole." }
  ], [
    { q: "Which is bigger: 27.3 or 29.5?", choices: ["29.5", "27.3"], answer: 0, hint: "Compare the whole numbers first.", explain: "29 is more than 27, so 29.5 is bigger." },
    { q: "A moon rock is 2.4 cm long. Another is 1.3 cm long. How long are they laid end to end?", choices: ["3.1 cm", "3.7 cm", "37 cm"], answer: 1, hint: "Add the wholes, then the tenths.", explain: "2 + 1 = 3 and 0.4 + 0.3 = 0.7, so they are 3.7 cm long together." },
    { q: "What does 29.5 days mean?", choices: ["29 days and 5 hours", "295 days", "29 and a half days"], answer: 2, hint: "5 tenths is the same as one half.", explain: "29.5 is 29 wholes and 5 tenths, and 5 tenths is a half." },
    { q: "A rover drives 4.6 km, then 2.2 km. How far does it drive?", choices: ["6.4 km", "68 km", "2.4 km", "6.8 km"], answer: 3, hint: "4 + 2, then 0.6 + 0.2.", explain: "4 + 2 = 6 and 0.6 + 0.2 = 0.8, so it drives 6.8 km." },
    { q: "Which decimal is the same as one half?", choices: ["0.2", "0.5", "0.05"], answer: 1, hint: "Half of 10 tenths.", explain: "One half is 5 tenths, written 0.5." }
  ]),

  // ───────────── Moonbase 6: Crystal Caves (about age 11–12) ─────────────
  M('m6-moon-hot-cold', 6, "Hot Days and Freezing Nights", 'negatives', 'Negative numbers', "On the Moon, the ground goes from hotter than boiling to far below zero.", 'numberline', [
    { title: "No blanket of air", emoji: '🌡️', text: "The Earth's air works like a blanket that keeps temperatures gentle. The Moon has no air, so its ground gets very hot in sunlight and very cold in the dark." },
    { title: "Below zero", emoji: '❄️', text: "Temperatures below 0 °C are negative numbers, like −20 °C. The bigger the number after the minus sign, the colder it is." },
    { title: "Moon temperatures", emoji: '🌙', text: "Near the Moon's middle, the ground can reach about 120 °C in the day and drop to about −130 °C at night. Some deep, dark craters near the poles are colder still!" },
    { title: "Use a number line", emoji: '📏', text: "To find the difference between a hot and a cold temperature, count from the negative number up to 0, then on up to the positive one, and add the two parts." }
  ], [
    { q: "Which is colder: −50 °C or −10 °C?", choices: ["−10 °C", "−50 °C"], answer: 1, hint: "Further below zero is colder.", explain: "−50 °C is 50 degrees below zero, much colder than −10 °C." },
    { q: "A thermometer reads −8 °C. It warms up by 12 degrees. What does it read now?", choices: ["4 °C", "−20 °C", "20 °C"], answer: 0, hint: "8 steps up to 0, then 4 more.", explain: "From −8, 8 steps reach 0, and 4 more steps reach 4 °C." },
    { q: "The ground is 100 °C in the day and −100 °C at night. What is the difference?", choices: ["0 degrees", "100 degrees", "200 degrees"], answer: 2, hint: "100 down to 0, then 100 more.", explain: "From 100 down to 0 is 100 degrees, and from 0 down to −100 is 100 more: 200 degrees." },
    { q: "In a shadow, a rock is at −30 °C. Rolled into the sunlight, it warms up by 50 degrees. What temperature is it now?", choices: ["80 °C", "−80 °C", "20 °C", "−20 °C"], answer: 2, hint: "30 steps to reach 0, then 20 more.", explain: "−30 + 50 = 20 °C." },
    { q: "Why does the Moon get so hot and so cold?", choices: ["It is made of ice", "It has no air to act like a blanket", "It spins very fast"], answer: 1, hint: "Think about what the Earth has that the Moon doesn't.", explain: "The Moon has no air to hold the heat in or spread it around, so its ground gets very hot by day and very cold at night." }
  ]),
  M('m6-moon-percent', 6, "Moon Percentages", 'percent', 'Percentages', "How strong, how lit, how full? Find percentages all over the Moon.", 'grid', [
    { title: "Out of 100", emoji: '💯', text: "Per cent means 'out of 100'. 50% is 50 out of 100, which is a half. 25% is a quarter." },
    { title: "How strong is moon gravity?", emoji: '🪶', text: "The Moon's gravity is about 17% as strong as the Earth's. That is about one sixth." },
    { title: "Half lit, always", emoji: '☀️', text: "The Sun always lights up 50% of the Moon: the half that faces it. What changes is how much of that lit half we can see from the Earth." },
    { title: "Finding a percentage", emoji: '🧮', text: "To find 10% of a number, divide it by 10. To find 20%, find 10% and double it." }
  ], [
    { q: "What is 50% of 80 moon rocks?", choices: ["50", "40", "8"], answer: 1, hint: "50% is a half.", explain: "Half of 80 is 40." },
    { q: "What is 10% of 300 km?", choices: ["30 km", "3 km", "310 km"], answer: 0, hint: "Divide by 10.", explain: "300 ÷ 10 = 30 km." },
    { q: "A crew has 20 astronauts, and 25% of them are scientists. How many scientists is that?", choices: ["25", "4", "20", "5"], answer: 3, hint: "25% is a quarter.", explain: "A quarter of 20 is 5." },
    { q: "How much of the Moon does the Sun light up at any time?", choices: ["About 10%", "100%", "About 50%"], answer: 2, hint: "The side that faces the Sun.", explain: "The Sun always lights up the half of the Moon facing it: 50%." },
    { q: "A moonbase battery is 60% full. How much more charge is needed to fill it to 100%?", choices: ["40%", "60%", "160%"], answer: 0, hint: "100 − 60", explain: "100% − 60% = 40%." }
  ]),

  // ───────────── Moonbase 7: Starlight Station (about age 12–13) ─────────────
  M('m7-moon-mission-equations', 7, "Mission Planning Equations", 'two-step', 'Two-step equations', "Plan a trip to the Moon by undoing two steps.", 'balance', [
    { title: "A long way", emoji: '🌍', text: "The Moon is about 384,000 km from the Earth. That's like going round the Earth nearly 10 times! The Apollo astronauts took about 3 days to get there." },
    { title: "Two steps", emoji: '🧩', text: "In 3x + 5 = 20, a mystery number x was multiplied by 3, and then 5 was added. To find x, undo the steps in reverse order." },
    { title: "Undo, undo", emoji: '↩️', text: "Take away 5 from both sides: 3x = 15. Then divide both sides by 3: x = 5. Check it: 3 × 5 + 5 = 20 ✓." }
  ], [
    { q: "Solve 4x + 6 = 30.", choices: ["9", "6", "24"], answer: 1, hint: "Take away 6, then divide by 4.", explain: "4x = 24, so x = 6. Check: 4 × 6 + 6 = 30." },
    { q: "A rover drives x km an hour for 5 hours, after an 8 km test drive. It goes 58 km in all: 5x + 8 = 58. What is x?", choices: ["10", "12", "50"], answer: 0, hint: "Take away 8, then divide by 5.", explain: "5x = 50, so x = 10 km each hour." },
    { q: "Solve 2x − 7 = 13.", choices: ["3", "6", "10"], answer: 2, hint: "Add 7, then divide by 2.", explain: "2x = 20, so x = 10. Check: 2 × 10 − 7 = 13." },
    { q: "3 astronauts each pack x snacks, and the captain adds 9 more. There are 45 snacks: 3x + 9 = 45. How many did each astronaut pack?", choices: ["18", "15", "9", "12"], answer: 3, hint: "Take away 9, then divide by 3.", explain: "3x = 36, so x = 12 snacks each." },
    { q: "About how far away is the Moon?", choices: ["About 3,840 km", "About 384,000 km", "About 38 million km"], answer: 1, hint: "Nearly 10 times round the Earth.", explain: "On average, the Moon is about 384,000 km away." }
  ]),
  M('m7-moon-square-pads', 7, "Square Pads and Square Roots", 'squares', 'Squares and roots', "Square landing pads and solar arrays: find areas from sides, and sides from areas.", 'grid', [
    { title: "Square numbers", emoji: '🟩', text: "A square number is a number times itself. 6 × 6 = 36, so 36 is a square number. We write it as 6²." },
    { title: "Square roots", emoji: '√', text: "A square root undoes squaring. √36 = 6, because 6 × 6 = 36. If a square landing pad covers 36 m², each side is 6 m long." },
    { title: "In between", emoji: '🔍', text: "√50 is not a whole number. 7² = 49 and 8² = 64, so √50 is a little more than 7." }
  ], [
    { q: "A square landing pad has sides of 9 m. What is its area?", choices: ["18 m²", "81 m²", "90 m²"], answer: 1, hint: "9 × 9", explain: "9² = 81 m²." },
    { q: "A square solar array covers 64 m². How long is each side?", choices: ["8 m", "16 m", "32 m"], answer: 0, hint: "Which number times itself makes 64?", explain: "8 × 8 = 64, so each side is 8 m long." },
    { q: "What is √121?", choices: ["12", "60.5", "11"], answer: 2, hint: "Try 11 × 11.", explain: "11 × 11 = 121, so √121 = 11." },
    { q: "√90 is between which two whole numbers?", choices: ["8 and 9", "9 and 10", "10 and 11"], answer: 1, hint: "9² = 81 and 10² = 100.", explain: "81 < 90 < 100, so √90 is between 9 and 10." },
    { q: "A square greenhouse has sides of 12 m. What is its floor area?", choices: ["24 m²", "48 m²", "124 m²", "144 m²"], answer: 3, hint: "12 × 12", explain: "12² = 144 m²." }
  ])
];

/* ------------------------------------------------------------ The Moon Museum (history) */

const MOON_HISTORY = [
  // ───────────── Moonbase 1: Landing Crater (about age 6–7) ─────────────
  {
    id: 'h1-moon-rabbit-tales',
    subject: 'history',
    floor: 1,
    realm: 'moon',
    title: "The Rabbit in the Moon",
    topic: 'moon-legends',
    topicName: 'Moon stories around the world',
    blurb: "Look for the rabbit in the full moon, and hear moon stories from around the world.",
    reading: [
      { title: "Look at the full moon", emoji: '🌕', text: "The full moon has light and dark patches. People all over the world have looked at those patches and seen pictures in them." },
      { title: "A rabbit with a mortar", emoji: '🐰', text: "In Korea and Japan, many people see a rabbit pounding rice cakes in a big bowl called a mortar. In China, the Jade Rabbit pounds medicine for Chang'e, the lady of the Moon." },
      { title: "More moon pictures", emoji: '🌎', text: "Some people see a man in the Moon, and some see a toad. An old story from India tells of a kind hare on the Moon, and an Aztec story from Mexico has a rabbit there too!" },
      { title: "What the patches really are", emoji: '🌑', text: "The dark patches are wide plains of old lava that cooled long ago. People once thought they were seas, so they are still called 'maria', which means 'seas'." }
    ],
    dialogue: {
      npc: { name: "Grandma Bomi", role: "a storyteller who collects moon tales", look: 'stargazer', portrayal: 'generic' },
      intro: "Come and sit by me, little one! The full moon is up. Can you see the rabbit? Let me tell you some moon stories.",
      topics: [
        { ask: "Where is the rabbit?", answer: "Look at the dark patches on the full moon. The long ears are at one side, and the round body and the big bowl are below. Once you see it, you can't stop seeing it!" },
        { ask: "What is the rabbit doing?", answer: "In Korea, the rabbit pounds rice cakes called tteok. In Japan, it makes mochi. In China, the Jade Rabbit pounds a special medicine for Chang'e, the lady who lives on the Moon." },
        { ask: "Who is Chang'e?", answer: "In an old Chinese story, Chang'e floated up to the Moon, and she lives there with her Jade Rabbit. Families think of her at the Mid-Autumn Festival, when the Moon is big and round." },
        { ask: "Do other people see a rabbit too?", answer: "Yes! An old story from India tells of a kind hare whose picture was put on the Moon, and an Aztec story from Mexico has a rabbit up there too. Other people see a face, or a toad." },
        { ask: "Is there really a rabbit up there?", answer: "No, the pictures are made by dark plains of old lava and bright, hilly ground. But the stories help us remember to look up and wonder!" }
      ],
      challenge: {
        q: "In Korea, what does the moon rabbit pound in its mortar?",
        choices: ["Rocks", "Rice cakes", "Snow"],
        answer: 1,
        explain: "In Korean stories, the moon rabbit pounds rice cakes, called tteok."
      },
      farewell: "Next full moon, look up and say hello to the rabbit for me!"
    },
    timeline: {
      title: "People and the Moon",
      events: [
        { label: "A silk painting in China shows a hare and a toad on the Moon", year: -168, when: "about 2,200 years ago" },
        { label: "People in Japan hold moon-viewing parties called tsukimi", year: 900, when: "about 1,100 years ago" },
        { label: "Galileo looks at the Moon through a telescope and sees mountains and craters", year: 1609, when: "1609" },
        { label: "Astronauts walk on the Moon for the first time", year: 1969, when: "1969" },
        { label: "China's Yutu rover, named after the Jade Rabbit, drives on the Moon", year: 2013, when: "2013" }
      ]
    },
    artifact: {
      model: 'mortar',
      name: "A mortar and pestle",
      text: "A mortar is a strong bowl, and a pestle is the heavy stick you pound with. In the stories, the moon rabbit uses a big one to pound rice cakes or medicine. People still use them in kitchens today."
    },
    quiz: [
      { q: "What do many people in Korea and Japan see in the full moon?", choices: ["A cat on a boat", "A rabbit pounding rice cakes", "A giant fish"], answer: 1, hint: "It has long ears.", explain: "Many people in Korea and Japan see a rabbit pounding rice cakes in the Moon." },
      { q: "What are the dark patches on the Moon really?", choices: ["Plains of old, cooled lava", "Real seas of water", "Shadows of clouds"], answer: 0, hint: "They were made by melted rock long ago.", explain: "The dark patches are wide plains of lava that cooled long ago." },
      { q: "Who is Chang'e in the Chinese story?", choices: ["A rocket", "A rabbit's bowl", "The lady who lives on the Moon"], answer: 2, hint: "The Jade Rabbit makes medicine for her.", explain: "Chang'e is the lady of the Moon in the Chinese story, and the Jade Rabbit lives with her." },
      { q: "Which Moon rover was named after the Jade Rabbit?", choices: ["Sputnik", "Yutu", "Apollo"], answer: 1, hint: "It is a Chinese name.", explain: "Yutu means Jade Rabbit. China's Yutu rover drove on the Moon in 2013." },
      { q: "Why are the dark patches called 'maria'?", choices: ["It means 'rabbits'", "It is a person's name", "It means 'seas', because people once thought they were seas"], answer: 2, hint: "People once thought they were full of water.", explain: "Maria means 'seas'. Long ago, people thought the dark patches were seas." }
    ]
  },
  {
    id: 'h1-moon-festivals',
    subject: 'history',
    floor: 1,
    realm: 'moon',
    title: "Full Moon Festivals",
    topic: 'moon-festivals',
    topicName: 'Moon festivals',
    blurb: "Make songpyeon and mooncakes, and watch the harvest moon with a festival cook.",
    reading: [
      { title: "The big autumn moon", emoji: '🌕', text: "In autumn, many families in East Asia celebrate when the full moon is big and bright. It is harvest time, when the crops are ready." },
      { title: "Chuseok in Korea", emoji: '🍡', text: "At Chuseok, Korean families visit their hometowns, give thanks to their grandparents and ancestors, and make little half-moon rice cakes called songpyeon." },
      { title: "Mid-Autumn in China", emoji: '🥮', text: "At the Mid-Autumn Festival, families share round mooncakes, carry glowing lanterns and look at the Moon together." },
      { title: "Tsukimi in Japan", emoji: '🎑', text: "Tsukimi means 'moon-viewing'. People in Japan set out round rice dumplings and tall silver grass, and enjoy the Moon." }
    ],
    dialogue: {
      npc: { name: "Chef Momo", role: "a festival cook who makes moon treats", look: 'castle-cook', portrayal: 'generic' },
      intro: "Hello! I'm Chef Momo, and tonight is the big full moon. My kitchen smells of sweet rice and red beans! Will you help me make festival treats?",
      topics: [
        { ask: "Why do people celebrate the full moon?", answer: "Because it's harvest time! The rice and fruit are ready, and the big round moon reminds families to come together and say thank you." },
        { ask: "What are songpyeon?", answer: "Songpyeon are little Korean rice cakes for Chuseok. We fill them with sesame and honey, beans or chestnuts, fold them into half-moon shapes and steam them on pine needles. They smell wonderful!" },
        { ask: "What is inside a mooncake?", answer: "Mooncakes are round, like the full moon. Many are filled with sweet lotus seed paste or red bean paste, and some have a salty egg yolk in the middle, like a little moon inside!" },
        { ask: "What do people do at tsukimi?", answer: "In Japan, people stack round white dumplings called tsukimi dango, put tall silver grass in a vase and sit quietly to admire the Moon." },
        { ask: "Is the Moon really bigger at harvest time?", answer: "It looks huge when it is low near the horizon, but that's a trick of our eyes! The Moon stays about the same size." }
      ],
      challenge: {
        q: "Why are mooncakes round?",
        choices: ["So they roll down hills", "Because ovens are round", "To look like the full moon"],
        answer: 2,
        explain: "Mooncakes are round like the full moon, a sign of the whole family being together."
      },
      farewell: "Happy full moon! Share your treats, and look up at the Moon with your family tonight."
    },
    timeline: {
      title: "Moon festivals through time",
      events: [
        { label: "An old Korean history book tells of a harvest-time contest under the full moon, an early Chuseok", year: 32, when: "about 2,000 years ago" },
        { label: "People in Japan start holding moon-viewing parties", year: 900, when: "about 1,100 years ago" },
        { label: "In China, the Mid-Autumn Festival becomes a popular holiday", year: 1000, when: "about 1,000 years ago" },
        { label: "The Mid-Autumn Festival becomes a public holiday in mainland China", year: 2008, when: "2008" }
      ]
    },
    artifact: {
      model: 'mooncake',
      name: "A mooncake",
      text: "A mooncake is a round pastry with a pattern pressed into its top, often a flower or a lucky word. Families cut it into pieces so that everyone gets a share."
    },
    quiz: [
      { q: "What do Korean families make for Chuseok?", choices: ["Pancakes", "Ice cream", "Songpyeon rice cakes"], answer: 2, hint: "They are shaped like half-moons.", explain: "At Chuseok, families make songpyeon, little half-moon rice cakes." },
      { q: "What is the Japanese moon-viewing festival called?", choices: ["Tsukimi", "Chuseok", "Diwali"], answer: 0, hint: "It means 'moon-viewing'.", explain: "Tsukimi means 'moon-viewing'. People in Japan admire the autumn moon." },
      { q: "What do families share at the Mid-Autumn Festival in China?", choices: ["Snowballs", "Mooncakes", "Pumpkins"], answer: 1, hint: "They are round, like the full moon.", explain: "Families share round mooncakes at the Mid-Autumn Festival." },
      { q: "Why do these festivals happen in autumn?", choices: ["It is harvest time", "It is the hottest time", "The Moon disappears"], answer: 0, hint: "The crops are ready.", explain: "Autumn is harvest time, and families give thanks under the big full moon." },
      { q: "Does the Moon really grow bigger near the horizon?", choices: ["Yes, it doubles in size", "No, it's a trick of our eyes"], answer: 1, hint: "The Moon stays the same size.", explain: "The Moon only looks bigger near the horizon. It is a trick of our eyes." }
    ]
  },

  // ───────────── Moonbase 2: Rocket Ridge (about age 7–8) ─────────────
  {
    id: 'h2-moon-galileo',
    subject: 'history',
    floor: 2,
    realm: 'moon',
    title: "Galileo Looks Up",
    topic: 'galileo',
    topicName: 'Galileo and the telescope',
    blurb: "Look through one of the first telescopes with Galileo, and see mountains on the Moon.",
    reading: [
      { title: "A new tool", emoji: '🔭', text: "In 1608, spectacle makers in the Netherlands put two glass lenses in a tube and made faraway things look closer. It was the telescope!" },
      { title: "Galileo builds his own", emoji: '🛠️', text: "In Italy, Galileo Galilei heard about it and built his own telescopes, making each one stronger than the last. In 1609 he pointed one at the Moon." },
      { title: "Mountains on the Moon!", emoji: '⛰️', text: "Many people thought the Moon was perfectly smooth. Galileo saw mountains, valleys and craters, and he drew what he saw." },
      { title: "Moons round Jupiter", emoji: '🪐', text: "In 1610 Galileo found four little moons going round the planet Jupiter. He wrote about his discoveries in a book called 'The Starry Messenger'." }
    ],
    dialogue: {
      npc: { name: "Galileo Galilei", role: "an Italian scientist and stargazer", look: 'stargazer', portrayal: 'portrayal' },
      intro: "Buongiorno! I am Galileo. Come, look through my telescope. Tonight the Moon is beautiful, and you will see something nobody expected!",
      topics: [
        { ask: "How does your telescope work?", answer: "It is a tube with a glass lens at each end. The lenses bend the light so that faraway things look bigger and closer. My best one makes things look about 20 times bigger!" },
        { ask: "What did you see on the Moon?", answer: "Mountains! And deep round holes, and long shadows. Where the light meets the dark, the mountain tops catch the sunlight first, just like mountains at sunrise on Earth." },
        { ask: "Why was that a surprise?", answer: "Many people believed the Moon was a perfect, smooth ball. My drawings showed that it is rocky and bumpy: a real world, a little like ours." },
        { ask: "What else did you discover?", answer: "Four little moons circling Jupiter! I watched them move night after night. I also saw that the Milky Way is made of countless stars." },
        { ask: "How do you remember what you saw?", answer: "I draw it! I sketch the Moon carefully, night after night, so that others can see what I saw and check it. Good scientists write down and draw everything." }
      ],
      challenge: {
        q: "What did Galileo see on the Moon with his telescope?",
        choices: ["Rivers and trees", "Mountains and craters", "A rabbit"],
        answer: 1,
        explain: "Galileo saw mountains, valleys and craters. The Moon was rocky, not smooth."
      },
      farewell: "Keep looking up, and always draw what you see. Arrivederci!"
    },
    timeline: {
      title: "Telescopes and the Moon",
      events: [
        { label: "Galileo is born in Pisa, Italy", year: 1564, when: "1564" },
        { label: "The telescope is invented in the Netherlands", year: 1608, when: "1608" },
        { label: "Galileo looks at the Moon and draws its mountains", year: 1609, when: "1609" },
        { label: "Galileo finds four moons going round Jupiter", year: 1610, when: "1610" },
        { label: "A spacecraft named Galileo sets off for Jupiter", year: 1989, when: "1989" }
      ]
    },
    artifact: {
      model: 'telescope',
      name: "Galileo's telescope",
      text: "Galileo's telescopes were long tubes of wood covered in paper or leather, with a glass lens at each end. Two of them are kept today in a museum in Florence, Italy."
    },
    quiz: [
      { q: "What did Galileo use to look closely at the Moon?", choices: ["A microscope", "A mirror", "A telescope"], answer: 2, hint: "A tube with lenses.", explain: "Galileo used a telescope that he built himself." },
      { q: "Before Galileo, what did many people think the Moon was like?", choices: ["Perfectly smooth", "Covered in trees", "Made of cheese"], answer: 0, hint: "Galileo's drawings proved them wrong.", explain: "Many people thought the Moon was perfectly smooth, but Galileo showed it has mountains and craters." },
      { q: "What did Galileo find going round Jupiter?", choices: ["Rings of ice", "Four moons", "A spaceship"], answer: 1, hint: "Little lights that moved night after night.", explain: "Galileo found four moons going round Jupiter in 1610." },
      { q: "In which year did Galileo first look at the Moon through his telescope?", choices: ["1969", "1492", "1609"], answer: 2, hint: "About 400 years ago.", explain: "Galileo turned his telescope to the Moon in 1609." },
      { q: "Why did Galileo draw what he saw?", choices: ["So others could see it and check it", "Because he had no paper", "To sell the drawings as toys"], answer: 0, hint: "Scientists share what they find.", explain: "Careful drawings let other people see and check his discoveries." }
    ]
  },
  {
    id: 'h2-moon-sputnik',
    subject: 'history',
    floor: 2,
    realm: 'moon',
    title: "Beep, Beep! The First Satellite",
    topic: 'satellites',
    topicName: 'Satellites',
    blurb: "Listen for the beeps of Sputnik, the first satellite, with a young radio fan in 1957.",
    reading: [
      { title: "What is a satellite?", emoji: '🛰️', text: "A satellite is something that goes round and round a planet. The Moon is the Earth's natural satellite. People can build satellites too!" },
      { title: "Sputnik", emoji: '📡', text: "On 4 October 1957, the Soviet Union launched Sputnik 1, the first satellite made by people. It was a shiny metal ball about as wide as a beach ball, with four long antennas." },
      { title: "Beep, beep, beep", emoji: '🎵', text: "Sputnik sent out radio beeps as it flew round the Earth about every hour and a half. People all over the world listened for it on their radios." },
      { title: "Satellites today", emoji: '🌐', text: "Today thousands of satellites help us with weather forecasts, maps, phone calls and TV. Korea's first satellite, Uribyeol 1, went up in 1992." }
    ],
    dialogue: {
      npc: { name: "Lena", role: "a young radio fan listening to the sky, 1957", look: 'mission', portrayal: 'generic' },
      intro: "Shh, listen! Can you hear it? Beep… beep… beep… That's Sputnik, flying high above us! I'm Lena, and I've waited all evening to hear it.",
      topics: [
        { ask: "What is Sputnik?", answer: "It's the very first satellite people have ever made! A shiny metal ball with four long antennas, going round and round the Earth." },
        { ask: "How fast does it go?", answer: "Very, very fast! It goes all the way round the Earth in about an hour and a half. On a clear evening, you can even see the rocket that carried it up, like a moving dot of light." },
        { ask: "Why does it beep?", answer: "Its radio sends out beeps so people on the ground can follow it. Anyone with the right radio can listen, even me!" },
        { ask: "Why is everyone so excited?", answer: "Because it means people can send things into space! Next, people will send more satellites, and one day maybe people too." },
        { ask: "What might satellites do one day?", answer: "I dream they'll help us forecast the weather, send TV pictures across the oceans and help ships find their way. Wouldn't that be wonderful?" }
      ],
      challenge: {
        q: "What did Sputnik send down to people on Earth?",
        choices: ["Radio beeps", "Letters", "Photos of the Moon"],
        answer: 0,
        explain: "Sputnik sent radio beeps that people could hear on their radios."
      },
      farewell: "There it goes, over the hills! Look up tonight: you might spot a satellite gliding across the stars."
    },
    timeline: {
      title: "Satellites",
      events: [
        { label: "Sputnik 1, the first satellite, goes round the Earth", year: 1957, when: "1957" },
        { label: "The USA launches its first satellite, Explorer 1", year: 1958, when: "1958" },
        { label: "The satellite Telstar sends live TV pictures across the Atlantic Ocean", year: 1962, when: "1962" },
        { label: "The first GPS satellite is launched", year: 1978, when: "1978" },
        { label: "Korea's first satellite, Uribyeol 1, is launched", year: 1992, when: "1992" }
      ]
    },
    artifact: {
      model: 'satellite',
      name: "A model of Sputnik 1",
      text: "Sputnik 1 was a polished metal ball about 58 centimetres wide, with four long antennas trailing behind it. Inside were radios and batteries. It sent its beeps for about three weeks."
    },
    quiz: [
      { q: "What was Sputnik 1?", choices: ["The first person in space", "The first satellite made by people", "A Moon rover"], answer: 1, hint: "It went round and round the Earth.", explain: "Sputnik 1 was the first satellite made by people, launched in 1957." },
      { q: "What is the Earth's natural satellite?", choices: ["The Moon", "The Sun", "Mars"], answer: 0, hint: "You can see it at night.", explain: "The Moon goes round the Earth, so it is the Earth's natural satellite." },
      { q: "About how long did Sputnik take to go once round the Earth?", choices: ["About a week", "About a year", "About an hour and a half"], answer: 2, hint: "It was very fast!", explain: "Sputnik went round the Earth about every hour and a half." },
      { q: "How did people know where Sputnik was?", choices: ["It left a trail of smoke", "They listened for its radio beeps", "It flashed coloured lights"], answer: 1, hint: "Beep, beep, beep!", explain: "Sputnik's radio beeps let people follow it across the sky." },
      { q: "Which of these do satellites help us with today?", choices: ["Weather forecasts and maps", "Baking bread", "Growing trees"], answer: 0, hint: "Think of the map on a phone.", explain: "Satellites help with weather forecasts, maps, TV and phone calls." }
    ]
  },

  // ───────────── Moonbase 3: Rover Tracks (about age 8–9) ─────────────
  {
    id: 'h3-moon-gagarin',
    subject: 'history',
    floor: 3,
    realm: 'moon',
    title: "Yuri Gagarin, First in Space",
    topic: 'first-in-space',
    topicName: 'The first people in space',
    blurb: "Fly once round the Earth with Yuri Gagarin, the first person in space.",
    reading: [
      { title: "A village boy who loved flying", emoji: '✈️', text: "Yuri Gagarin grew up in a small village in Russia. He loved planes, learned to fly and became a pilot." },
      { title: "Let's go!", emoji: '🚀', text: "On 12 April 1961, his spaceship Vostok 1 blasted off. As it lifted off, Yuri called out 'Poyekhali!', which means 'Let's go!'" },
      { title: "Once round the Earth", emoji: '🌍', text: "Yuri flew once all the way round the Earth. The flight took about 108 minutes, and he was the first person ever to see the Earth from space." },
      { title: "A parachute landing", emoji: '🪂', text: "Near the end, Yuri jumped out of his capsule and floated down by parachute. He landed in a field near a surprised farmer and a little girl." }
    ],
    dialogue: {
      npc: { name: "Yuri Gagarin", role: "a pilot and cosmonaut, the first person in space", look: 'astronaut', portrayal: 'portrayal' },
      intro: "Hello, my friend! I am Yuri. Today I am going to fly into space, higher than anyone has ever been. Are you ready? Poyekhali! Let's go!",
      topics: [
        { ask: "What did the Earth look like?", answer: "Beautiful! I could see the Earth's curved edge with a thin blue glow of air around it. The seas, the clouds, the land… it was all so lovely." },
        { ask: "What is a cosmonaut?", answer: "It is what we call a space traveller in my country. In America they say astronaut. Both mean someone who travels into space." },
        { ask: "Was it hard to get ready?", answer: "We trained for a long time: spinning machines, parachute jumps and lots of studying. When you practise hard, you can stay calm, even on a big adventure." },
        { ask: "Did you float?", answer: "Yes! Without the feeling of weight, I floated against my seat straps. In a spaceship, anything that isn't tied down floats." },
        { ask: "How did you get home?", answer: "My capsule came back down through the air, and then I jumped out and floated down on a parachute. I landed in a field, and a farmer and a little girl came over to say hello!" }
      ],
      challenge: {
        q: "What did Yuri Gagarin call out as his rocket took off?",
        choices: ["Goodbye!", "Look at me!", "Poyekhali! (Let's go!)"],
        answer: 2,
        explain: "Yuri called out 'Poyekhali!', which means 'Let's go!'"
      },
      farewell: "The Earth is so beautiful from up there. Let's look after it! Goodbye, and dream big!"
    },
    timeline: {
      title: "The first people in space",
      events: [
        { label: "Yuri Gagarin is born", year: 1934, when: "1934" },
        { label: "Sputnik 1, the first satellite, is launched", year: 1957, when: "1957" },
        { label: "Yuri Gagarin flies once round the Earth in Vostok 1", year: 1961, when: "1961" },
        { label: "Valentina Tereshkova becomes the first woman in space", year: 1963, when: "1963" },
        { label: "The United Nations names 12 April the International Day of Human Space Flight", year: 2011, when: "2011" }
      ]
    },
    artifact: {
      model: 'capsule',
      name: "A Vostok capsule",
      text: "Vostok capsules were round like a ball, with small round windows. The cosmonaut sat inside on a special seat that could shoot out, so he could finish the landing by parachute."
    },
    quiz: [
      { q: "Who was the first person to fly in space?", choices: ["Galileo", "Yuri Gagarin", "Neil Armstrong"], answer: 1, hint: "He called out 'Poyekhali!'", explain: "Yuri Gagarin was the first person in space, in 1961." },
      { q: "In which year did Yuri Gagarin fly into space?", choices: ["1961", "1969", "1957"], answer: 0, hint: "Four years after Sputnik.", explain: "Yuri flew into space on 12 April 1961." },
      { q: "What does 'Poyekhali!' mean?", choices: ["Goodbye!", "Help!", "Let's go!"], answer: 2, hint: "He said it as the rocket lifted off.", explain: "'Poyekhali!' means 'Let's go!'" },
      { q: "How many times did Yuri fly round the Earth?", choices: ["Ten times", "Once", "He didn't go round it"], answer: 1, hint: "His trip took about 108 minutes.", explain: "Yuri flew once round the Earth, in about 108 minutes." },
      { q: "How did Yuri land at the end of his flight?", choices: ["On the Moon", "In a boat at sea", "By parachute in a field"], answer: 2, hint: "He jumped out of his capsule.", explain: "Yuri jumped out of his capsule and floated down by parachute into a field." }
    ]
  },
  {
    id: 'h3-moon-tereshkova',
    subject: 'history',
    floor: 3,
    realm: 'moon',
    title: "Valentina Tereshkova, the Seagull",
    topic: 'first-woman-in-space',
    topicName: 'The first woman in space',
    blurb: "Meet Valentina Tereshkova, who went from a cloth factory to space.",
    reading: [
      { title: "A factory worker who loved the sky", emoji: '🪂', text: "Valentina Tereshkova worked in a textile factory, making cloth. In her free time she joined a club and learned to jump with a parachute." },
      { title: "Chosen for space", emoji: '⭐', text: "Her parachute skills helped her to be chosen for the space team. She trained hard with the other cosmonauts." },
      { title: "The Seagull flies", emoji: '🕊️', text: "On 16 June 1963, Valentina flew into space in Vostok 6. She was the first woman in space. Her radio name was 'Chaika', which means 'Seagull'." },
      { title: "Almost three days", emoji: '🌍', text: "She went round the Earth 48 times in almost three days. That was longer than all the American astronauts' flights so far added together!" }
    ],
    dialogue: {
      npc: { name: "Valentina Tereshkova", role: "a cosmonaut, the first woman in space", look: 'flightsuit', portrayal: 'portrayal' },
      intro: "Hello! I'm Valentina. My radio name is Chaika, the Seagull. Today I'm flying into space! Will you be my ground control?",
      topics: [
        { ask: "How did you become a cosmonaut?", answer: "I worked in a factory making cloth, and I loved parachute jumping at my club. When they looked for people to train for space, my parachute jumps helped me get chosen!" },
        { ask: "Why is your name Seagull?", answer: "Every cosmonaut has a radio name. Mine is Chaika, the Seagull. When I called 'This is Seagull!', everyone on the ground knew it was me." },
        { ask: "What did you do in space?", answer: "I looked after my spaceship, took photos of the edge of the Earth and wrote notes about how my body felt. Scientists wanted to know how people manage in space for days." },
        { ask: "How long were you up there?", answer: "Almost three days! I went round the Earth 48 times, and I slept and ate in space too." },
        { ask: "What would you tell children who love space?", answer: "Study, train and be brave. The sky is for everyone!" }
      ],
      challenge: {
        q: "What was Valentina's radio name?",
        choices: ["Eagle", "Seagull", "Falcon"],
        answer: 1,
        explain: "Her radio name was Chaika, which means Seagull."
      },
      farewell: "This is Seagull, signing off! Keep reaching for the stars."
    },
    timeline: {
      title: "Women in space",
      events: [
        { label: "Valentina Tereshkova is born", year: 1937, when: "1937" },
        { label: "Valentina becomes the first woman in space", year: 1963, when: "1963" },
        { label: "Sally Ride becomes the first American woman in space", year: 1983, when: "1983" },
        { label: "Svetlana Savitskaya becomes the first woman to walk in space", year: 1984, when: "1984" },
        { label: "Yi So-yeon becomes the first Korean in space", year: 2008, when: "2008" }
      ]
    },
    artifact: {
      model: 'space-helmet',
      name: "A cosmonaut's helmet",
      text: "Early cosmonauts wore a round, hard helmet with a window at the front that could close. It was part of a suit that could keep them safe if air ever leaked out of the cabin."
    },
    quiz: [
      { q: "Who was the first woman in space?", choices: ["Valentina Tereshkova", "Sally Ride", "Katherine Johnson"], answer: 0, hint: "Her radio name was Seagull.", explain: "Valentina Tereshkova was the first woman in space, in 1963." },
      { q: "What hobby helped Valentina to be chosen?", choices: ["Painting", "Swimming", "Parachute jumping"], answer: 2, hint: "She jumped out of planes at her club.", explain: "Her parachute jumping helped her be chosen for the space team." },
      { q: "What does 'Chaika' mean?", choices: ["Seagull", "Rocket", "Star"], answer: 0, hint: "It is a bird.", explain: "Chaika means Seagull." },
      { q: "About how long did Valentina stay in space?", choices: ["One hour", "Almost three days", "A whole year"], answer: 1, hint: "She went round the Earth 48 times.", explain: "She stayed in space for almost three days." },
      { q: "Where did Valentina work before she became a cosmonaut?", choices: ["In a bakery", "In a textile factory, making cloth", "On a ship"], answer: 1, hint: "She made cloth.", explain: "Valentina worked in a textile factory, making cloth." }
    ]
  },

  // ───────────── Moonbase 4: Dish Valley (about age 9–10) ─────────────
  {
    id: 'h4-moon-katherine-johnson',
    subject: 'history',
    floor: 4,
    realm: 'moon',
    title: "Katherine Johnson Checks the Numbers",
    topic: 'katherine-johnson',
    topicName: 'Katherine Johnson and space maths',
    blurb: "Work out the paths of spacecraft with Katherine Johnson, the mathematician astronauts trusted.",
    reading: [
      { title: "A girl who counted everything", emoji: '🔢', text: "Katherine Johnson loved numbers. As a child she counted steps, dishes and stars! She was so quick that she started high school at just 10 years old." },
      { title: "Human computers", emoji: '🧮', text: "Before modern computers, people called 'computers' did hard sums by hand. At NASA, Katherine worked out the paths that spacecraft would fly." },
      { title: "Check the numbers!", emoji: '✅', text: "In 1962, astronaut John Glenn was about to fly round the Earth. Electronic computers had worked out his path, but he asked for Katherine to check the numbers by hand first!" },
      { title: "To the Moon and back", emoji: '🌙', text: "Katherine also helped work out paths for the Apollo trips to the Moon. In 2015 she was given the Presidential Medal of Freedom, one of America's highest honours." }
    ],
    dialogue: {
      npc: { name: "Katherine Johnson", role: "a NASA mathematician", look: 'mission', portrayal: 'portrayal' },
      intro: "Hello there! I'm Katherine. I love numbers, and today I'm checking the path for an astronaut's trip round the Earth. Would you like to help me count?",
      topics: [
        { ask: "What is your job?", answer: "I work out the paths that spacecraft travel: where they go up, how they go round the Earth, and exactly where they will come down. Every number has to be just right." },
        { ask: "Why did John Glenn ask for you?", answer: "The new electronic computers were very fast, but they were new, and people didn't fully trust them yet. John Glenn said, 'Get the girl to check the numbers.' When my numbers matched, he was ready to go!" },
        { ask: "Was it always easy?", answer: "Not always. Back then, Black people and white people were unfairly kept apart, and at first I worked in a separate group. But I asked questions, I spoke up in meetings, and our careful work helped send people into space." },
        { ask: "Did you help with the Moon?", answer: "Yes! I helped work out the paths for the Apollo trips to the Moon and back, so that the lander could meet up again with the main ship and the astronauts could come home." },
        { ask: "What is your advice?", answer: "Like what you do, and do your very best. And always check your work!" }
      ],
      challenge: {
        q: "What did John Glenn ask Katherine to do before his flight?",
        choices: ["Drive the rocket", "Check the computer's numbers by hand", "Paint his spaceship"],
        answer: 1,
        explain: "He asked for Katherine to check the computer's numbers by hand. When they matched, he was ready to fly."
      },
      farewell: "Keep counting, keep asking questions, and always check your work!"
    },
    timeline: {
      title: "Katherine Johnson's life",
      events: [
        { label: "Katherine Johnson is born in West Virginia, USA", year: 1918, when: "1918" },
        { label: "Katherine starts work as a mathematician at NACA, which later becomes NASA", year: 1953, when: "1953" },
        { label: "Katherine checks the numbers for John Glenn's flight round the Earth", year: 1962, when: "1962" },
        { label: "Apollo 11 lands on the Moon, on a path Katherine helped work out", year: 1969, when: "1969" },
        { label: "Katherine receives the Presidential Medal of Freedom", year: 2015, when: "2015" }
      ]
    },
    artifact: {
      model: 'slide-rule',
      name: "A slide rule",
      text: "Before pocket calculators, engineers and mathematicians often used slide rules: rulers that slide against each other to multiply and divide quickly. Many hard sums were also done on desk calculating machines, or with a pencil and paper."
    },
    quiz: [
      { q: "What was Katherine Johnson's job at NASA?", choices: ["Working out the paths of spacecraft", "Cooking for astronauts", "Building rockets with a hammer"], answer: 0, hint: "She was a mathematician.", explain: "Katherine worked out the paths that spacecraft would fly." },
      { q: "Long ago, what were 'computers'?", choices: ["Robots", "People who did hard sums by hand", "Telescopes"], answer: 1, hint: "Before electronic computers…", explain: "Before modern computers, people who did hard sums by hand were called 'computers'." },
      { q: "Which astronaut asked Katherine to check the numbers?", choices: ["Yuri Gagarin", "Sally Ride", "John Glenn"], answer: 2, hint: "He flew round the Earth in 1962.", explain: "John Glenn asked for Katherine to check the numbers before his flight in 1962." },
      { q: "How old was Katherine when she started high school?", choices: ["10", "14", "18"], answer: 0, hint: "She was very young.", explain: "She was so quick with numbers that she started high school at just 10." },
      { q: "What is Katherine's top tip for maths?", choices: ["Always rush", "Never ask questions", "Always check your work"], answer: 2, hint: "She checked John Glenn's numbers.", explain: "Katherine always said to check your work." }
    ]
  },
  {
    id: 'h4-moon-apollo11-crew',
    subject: 'history',
    floor: 4,
    realm: 'moon',
    title: "Apollo 11: Three Friends to the Moon",
    topic: 'apollo-11',
    topicName: 'Apollo 11',
    blurb: "Fly round the Moon with Michael Collins while Neil Armstrong and Buzz Aldrin walk on it.",
    reading: [
      { title: "Three astronauts", emoji: '👨‍🚀', text: "In July 1969, three astronauts set off for the Moon in Apollo 11: Neil Armstrong, Buzz Aldrin and Michael Collins." },
      { title: "The Eagle has landed", emoji: '🦅', text: "On 20 July 1969, Neil and Buzz landed on the Moon in a small lander called the Eagle. Neil was the first person to step onto the Moon." },
      { title: "Columbia goes round", emoji: '🌙', text: "Michael stayed in the main ship, Columbia, going round and round the Moon. He had to be ready to pick up his friends when they flew back up." },
      { title: "Moon rocks and a plaque", emoji: '🪨', text: "Neil and Buzz collected about 22 kilograms of moon rocks and dust. They left a plaque that says they 'came in peace for all mankind'." }
    ],
    dialogue: {
      npc: { name: "Michael Collins", role: "an Apollo 11 astronaut who flew the main ship round the Moon", look: 'astronaut', portrayal: 'portrayal' },
      intro: "Hello up there! I'm Michael Collins. My friends Neil and Buzz are on the Moon right now, and I'm flying round it in our ship, Columbia. Come and keep me company!",
      topics: [
        { ask: "Why didn't you walk on the Moon?", answer: "Someone had to fly Columbia and be ready to bring everyone home. That was my job, and it was a very important one. Without it, nobody could get back!" },
        { ask: "Were you lonely?", answer: "Not really! I was busy, and I felt happy and proud. When I went behind the Moon, I couldn't talk to the Earth for a while, so it was very quiet. And I had the best view there is." },
        { ask: "What did Neil say on the Moon?", answer: "As he stepped down, Neil said: 'That's one small step for man, one giant leap for mankind.' Millions of people heard him on TV and radio." },
        { ask: "What did they do on the Moon?", answer: "They set up experiments, took photos, planted a flag and collected moon rocks for scientists to study. They spent about two and a half hours walking outside." },
        { ask: "How did you all come home?", answer: "The Eagle flew back up and joined Columbia. Then all three of us flew back to the Earth and splashed down safely in the Pacific Ocean!" }
      ],
      challenge: {
        q: "What was Michael Collins's job during the Moon landing?",
        choices: ["Driving a Moon rover", "Cooking dinner on the Moon", "Flying Columbia round the Moon"],
        answer: 2,
        explain: "Michael flew the main ship, Columbia, round the Moon, ready to pick up Neil and Buzz."
      },
      farewell: "We'll be home soon. Look up at the Moon tonight and remember: three friends went there together!"
    },
    timeline: {
      title: "The road to the Moon",
      events: [
        { label: "Yuri Gagarin becomes the first person in space", year: 1961, when: "1961" },
        { label: "Apollo 8's crew are the first people to fly round the Moon", year: 1968, when: "1968" },
        { label: "Apollo 11 lands, and Neil Armstrong and Buzz Aldrin walk on the Moon", year: 1969, when: "1969" },
        { label: "Apollo 17, the last Apollo trip to the Moon, lands", year: 1972, when: "1972" }
      ]
    },
    artifact: {
      model: 'moon-rock',
      name: "A moon rock",
      text: "The Apollo astronauts brought home about 382 kilograms of moon rocks and dust. Scientists still study them today, and in some museums you can even touch a piece of the Moon!"
    },
    quiz: [
      { q: "Who was the first person to step onto the Moon?", choices: ["Neil Armstrong", "Michael Collins", "Yuri Gagarin"], answer: 0, hint: "He said 'one small step'.", explain: "Neil Armstrong was the first person to step onto the Moon, in 1969." },
      { q: "What was the name of the lander that took Neil and Buzz to the Moon?", choices: ["Columbia", "The Eagle", "Sputnik"], answer: 1, hint: "It's a bird.", explain: "Their lander was called the Eagle. 'The Eagle has landed!'" },
      { q: "In which year did Apollo 11 land on the Moon?", choices: ["1961", "1972", "1969"], answer: 2, hint: "The end of the 1960s.", explain: "Apollo 11 landed on the Moon on 20 July 1969." },
      { q: "Where did the Apollo 11 astronauts land when they came home?", choices: ["In the Pacific Ocean", "On a runway", "In a desert"], answer: 0, hint: "Splash!", explain: "They splashed down safely in the Pacific Ocean." },
      { q: "What did the astronauts bring back from the Moon?", choices: ["Moon water", "Moon rocks and dust", "A moon rabbit"], answer: 1, hint: "Scientists still study them.", explain: "They brought back moon rocks and dust for scientists to study." }
    ]
  },

  // ───────────── Moonbase 5: Greenhouse Crater (about age 10–11) ─────────────
  {
    id: 'h5-moon-hubble',
    subject: 'history',
    floor: 5,
    realm: 'moon',
    title: "Hubble, the Space Telescope",
    topic: 'space-telescopes',
    topicName: 'Space telescopes',
    blurb: "Meet Nancy Grace Roman, who helped plan a telescope above the air.",
    reading: [
      { title: "Above the wobbly air", emoji: '🌫️', text: "The air around the Earth wobbles and blurs starlight. That's why stars twinkle! A telescope up in space can see much more clearly." },
      { title: "The mother of Hubble", emoji: '👩‍🔬', text: "Nancy Grace Roman was NASA's first chief of astronomy. She worked for years to plan a big telescope in space, and people call her the 'mother of Hubble'." },
      { title: "A blurry start", emoji: '👓', text: "Hubble went up in 1990, but its pictures were blurry because its big mirror was the wrong shape by a tiny amount. In 1993, astronauts flew up and fixed it, a bit like giving it glasses!" },
      { title: "Amazing pictures", emoji: '🌌', text: "Since then, Hubble has taken beautiful pictures of faraway galaxies and helped scientists work out how old the universe is." }
    ],
    dialogue: {
      npc: { name: "Nancy Grace Roman", role: "an astronomer, NASA's first chief of astronomy", look: 'scientist', portrayal: 'portrayal' },
      intro: "Hello! I'm Nancy. When I was a girl, I made star maps with my friends. Now I'm planning something big: a telescope that floats above the air!",
      topics: [
        { ask: "Why put a telescope in space?", answer: "Our air is wonderful for breathing, but it blurs the light from stars and blocks some kinds of light completely. Up above the air, a telescope can see clearly all the time." },
        { ask: "When did you start loving stars?", answer: "When I was about eleven, I started an astronomy club with my friends. We learned the star patterns together on clear nights." },
        { ask: "Was it easy to become an astronomer?", answer: "Not always! Some people told me girls shouldn't study science and maths. But I loved it, so I kept going." },
        { ask: "Why is it called Hubble?", answer: "It's named after Edwin Hubble, an astronomer who found that there are many galaxies beyond our own, and that the universe is getting bigger." },
        { ask: "What can Hubble see?", answer: "Galaxies far, far away, new stars being born in clouds of gas, and planets in our own Solar System. It goes round the Earth about every 95 minutes!" }
      ],
      challenge: {
        q: "Why does a telescope in space see more clearly than one on the ground?",
        choices: ["It is closer to the Moon", "It is above the blurry air", "It has a longer tube"],
        answer: 1,
        explain: "Up in space, there is no wobbly air to blur the starlight."
      },
      farewell: "Keep looking up and asking questions. The universe is full of surprises!"
    },
    timeline: {
      title: "Telescopes in space",
      events: [
        { label: "Nancy Grace Roman is born", year: 1925, when: "1925" },
        { label: "Nancy becomes NASA's first chief of astronomy", year: 1959, when: "1959" },
        { label: "The Hubble Space Telescope is launched", year: 1990, when: "1990" },
        { label: "Astronauts fix Hubble's blurry eyesight", year: 1993, when: "1993" },
        { label: "The James Webb Space Telescope is launched", year: 2021, when: "2021" }
      ]
    },
    artifact: {
      model: 'space-telescope',
      name: "A model of the Hubble Space Telescope",
      text: "Hubble is about as long as a school bus. Inside is a big curved mirror about 2.4 metres wide, and it has solar panels like wings to make electricity from sunlight."
    },
    quiz: [
      { q: "Why do stars twinkle when we look at them from the ground?", choices: ["They are switching on and off", "The air around the Earth wobbles their light", "The Moon gets in the way"], answer: 1, hint: "Something between us and the stars.", explain: "The moving air around the Earth wobbles and blurs starlight, so stars twinkle." },
      { q: "Who is called the 'mother of Hubble'?", choices: ["Nancy Grace Roman", "Valentina Tereshkova", "Katherine Johnson"], answer: 0, hint: "She was NASA's first chief of astronomy.", explain: "Nancy Grace Roman worked for years to plan Hubble, so she is called its mother." },
      { q: "What was wrong with Hubble at first?", choices: ["It had no power", "It was upside down", "Its pictures were blurry"], answer: 2, hint: "It needed 'glasses'.", explain: "Its mirror was the wrong shape by a tiny amount, so its pictures were blurry until 1993." },
      { q: "Who fixed Hubble in 1993?", choices: ["Robots from the Moon", "Astronauts who flew up to it", "Nobody could fix it"], answer: 1, hint: "People went up into space.", explain: "Astronauts flew up to Hubble and fixed it, a bit like giving it glasses." },
      { q: "Hubble is named after Edwin Hubble. What did he find?", choices: ["There are many galaxies beyond our own", "The Moon has a rabbit", "How to build rockets"], answer: 0, hint: "Galaxies…", explain: "Edwin Hubble found that there are many galaxies beyond our Milky Way, and that the universe is growing." }
    ]
  },
  {
    id: 'h5-moon-space-station',
    subject: 'history',
    floor: 5,
    realm: 'moon',
    title: "Home in Orbit: The Space Station",
    topic: 'space-station',
    topicName: 'The International Space Station',
    blurb: "Float through the International Space Station with an astronaut who lives there.",
    reading: [
      { title: "A house in space", emoji: '🏠', text: "The International Space Station, or ISS, is a big home and laboratory that goes round the Earth. Astronauts from many countries live and work there together." },
      { title: "Built piece by piece", emoji: '🧩', text: "It was built in space, piece by piece, starting in 1998. Rockets and space shuttles carried up the parts, and astronauts joined them together." },
      { title: "Sixteen sunrises", emoji: '🌅', text: "The ISS goes round the Earth about every 90 minutes, so the astronauts on board see about 16 sunrises and 16 sunsets every day!" },
      { title: "Always someone home", emoji: '👩‍🚀', text: "People have lived on the ISS all the time since the year 2000. In 2008, Yi So-yeon visited it and became the first Korean in space." }
    ],
    dialogue: {
      npc: { name: "Commander Ana", role: "an astronaut living on the space station", look: 'flightsuit', portrayal: 'generic' },
      intro: "Welcome aboard the space station! I'm Commander Ana. Hold on to this handrail, or you'll float away! Let me show you around.",
      topics: [
        { ask: "How do you sleep?", answer: "In a little sleeping bag tied to the wall! There's no up or down here, so I can sleep standing up, upside down or sideways. It's very cosy." },
        { ask: "How do you eat?", answer: "Our food comes in packets and tins, and we add water to some of it. Crumbs would float away into the machines, so we eat tortillas instead of bread!" },
        { ask: "Who lives here?", answer: "Astronauts from many countries: the USA, Russia, Japan, Canada, countries in Europe and more. We all work together as one team." },
        { ask: "What do you do all day?", answer: "Science experiments! We grow plants, study how our bodies change in space and watch the Earth. We also exercise for about two hours every day to keep our muscles and bones strong." },
        { ask: "What is the best part?", answer: "The view! Through our big round window, I can see storms, cities twinkling at night, and green and red lights dancing over the poles, called auroras." }
      ],
      challenge: {
        q: "Why do astronauts on the ISS eat tortillas instead of bread?",
        choices: ["Tortillas taste of space", "Bread crumbs would float everywhere", "There is no bread on Earth"],
        answer: 1,
        explain: "Bread makes crumbs, and in space crumbs float away into the machines. Tortillas don't crumble."
      },
      farewell: "Time for my exercise! Wave next time you see a bright dot gliding across the night sky. It might be us!"
    },
    timeline: {
      title: "Homes in space",
      events: [
        { label: "Salyut 1, the first space station, goes round the Earth", year: 1971, when: "1971" },
        { label: "The first part of the Mir space station is launched", year: 1986, when: "1986" },
        { label: "The first part of the International Space Station is launched", year: 1998, when: "1998" },
        { label: "People start living on the ISS all the time", year: 2000, when: "2000" },
        { label: "China finishes building its Tiangong space station", year: 2022, when: "2022" }
      ]
    },
    artifact: {
      model: 'space-station',
      name: "A model of the ISS",
      text: "The ISS is about as big as a football field, with long rows of solar panels. Its rooms, called modules, are joined together like building blocks: some for living, some for working and some for experiments."
    },
    quiz: [
      { q: "What is the ISS?", choices: ["A Moon rover", "A home and laboratory going round the Earth", "A telescope on a mountain"], answer: 1, hint: "Astronauts live there.", explain: "The International Space Station is a home and laboratory that goes round the Earth." },
      { q: "About how many sunrises do astronauts on the ISS see each day?", choices: ["1", "16", "100"], answer: 1, hint: "It goes round the Earth about every 90 minutes.", explain: "Going round every 90 minutes or so, they see about 16 sunrises a day." },
      { q: "How do astronauts sleep on the ISS?", choices: ["In sleeping bags tied to the wall", "In beds with heavy blankets", "They never sleep"], answer: 0, hint: "Otherwise they'd float around.", explain: "They sleep in sleeping bags tied to the wall, so they don't float around." },
      { q: "Who became the first Korean in space, in 2008?", choices: ["Yi So-yeon", "Sally Ride", "Yuri Gagarin"], answer: 0, hint: "She visited the ISS.", explain: "Yi So-yeon visited the ISS in 2008 and became the first Korean in space." },
      { q: "Why do astronauts exercise for about two hours every day?", choices: ["To win races", "To keep warm", "To keep their muscles and bones strong"], answer: 2, hint: "Floating doesn't use your muscles much.", explain: "Floating makes muscles and bones weaker, so daily exercise keeps them strong." }
    ]
  },

  // ───────────── Moonbase 6: Crystal Caves (about age 11–12) ─────────────
  {
    id: 'h6-moon-sally-ride',
    subject: 'history',
    floor: 6,
    realm: 'moon',
    title: "Sally Ride Reaches for the Stars",
    topic: 'sally-ride',
    topicName: 'Sally Ride and the space shuttle',
    blurb: "Fly on the space shuttle with Sally Ride, a scientist, astronaut and teacher.",
    reading: [
      { title: "Tennis and physics", emoji: '🎾', text: "Sally Ride loved science and tennis. At university she studied physics, the science of how things move, and became Dr. Ride." },
      { title: "Chosen as an astronaut", emoji: '🚀', text: "In 1978, NASA chose Sally to train as an astronaut. She helped develop a robot arm for the space shuttle." },
      { title: "First American woman in space", emoji: '🌍', text: "In June 1983, Sally flew on the space shuttle and became the first American woman in space. She used the robot arm to put a satellite out into space and catch it again." },
      { title: "Science for every child", emoji: '📚', text: "Later, Sally wrote science books for children and started a company to help girls and boys enjoy science." }
    ],
    dialogue: {
      npc: { name: "Sally Ride", role: "an astronaut and physicist", look: 'flightsuit', portrayal: 'portrayal' },
      intro: "Hi there! I'm Sally. Soon I'm flying on the space shuttle, and I'll get to use the robot arm I helped work on. Want to hear how it works?",
      topics: [
        { ask: "What is the space shuttle?", answer: "It's a spaceship with wings! It blasts off like a rocket, goes round the Earth, and then glides back down to land on a runway like a plane." },
        { ask: "What does the robot arm do?", answer: "It's a long arm with joints like your shoulder, elbow and wrist. We use it to lift satellites out of the shuttle into space, and even to catch them again!" },
        { ask: "What was lift-off like?", answer: "Loud, shaky and so exciting! Afterwards I said it was the most fun I'd ever have. I was smiling the whole way." },
        { ask: "Did people ask you funny questions?", answer: "Some reporters asked whether space would make me cry, or what make-up I'd take! I told them I was there as a scientist, just like the rest of the crew." },
        { ask: "Who came after you?", answer: "Lots of brilliant people! In 1992, Mae Jemison, a doctor and engineer, became the first African American woman in space. Space is for everyone." }
      ],
      challenge: {
        q: "What did Sally use the shuttle's robot arm for?",
        choices: ["To cook food", "To put out and catch a satellite", "To play tennis in space"],
        answer: 1,
        explain: "Sally used the robot arm to put a satellite out into space and catch it again."
      },
      farewell: "Reach for the stars, and never let anyone tell you that science isn't for you!"
    },
    timeline: {
      title: "Sally Ride and the space shuttle",
      events: [
        { label: "Sally Ride is born in California", year: 1951, when: "1951" },
        { label: "NASA chooses Sally to train as an astronaut", year: 1978, when: "1978" },
        { label: "The first space shuttle flies", year: 1981, when: "1981" },
        { label: "Sally becomes the first American woman in space", year: 1983, when: "1983" },
        { label: "Mae Jemison becomes the first African American woman in space", year: 1992, when: "1992" },
        { label: "The space shuttles make their last flight", year: 2011, when: "2011" }
      ]
    },
    artifact: {
      model: 'shuttle',
      name: "A model of the space shuttle",
      text: "The space shuttle had wings and a big cargo bay with doors that opened in space. It launched with a giant orange fuel tank and two white rocket boosters, and came home to land on a runway."
    },
    quiz: [
      { q: "Who was the first American woman in space?", choices: ["Sally Ride", "Nancy Grace Roman", "Mae Jemison"], answer: 0, hint: "She used the robot arm.", explain: "Sally Ride became the first American woman in space in 1983." },
      { q: "What was special about the space shuttle?", choices: ["It could only go to the Moon", "It had wings and landed on a runway", "It was pulled by horses"], answer: 1, hint: "It glided home like a plane.", explain: "The shuttle had wings, so it could glide back and land on a runway." },
      { q: "What did Sally study at university?", choices: ["Cooking", "Music", "Physics"], answer: 2, hint: "The science of how things move.", explain: "Sally studied physics, the science of how things move." },
      { q: "Who became the first African American woman in space, in 1992?", choices: ["Mae Jemison", "Katherine Johnson", "Valentina Tereshkova"], answer: 0, hint: "She was a doctor and engineer.", explain: "Mae Jemison flew in 1992, the first African American woman in space." },
      { q: "What did Sally do later to help children?", choices: ["Built a theme park", "Wrote science books and helped children enjoy science", "Opened a tennis shop"], answer: 1, hint: "Books and science.", explain: "Sally wrote science books for children and started a company to help them enjoy science." }
    ]
  },
  {
    id: 'h6-moon-change',
    subject: 'history',
    floor: 6,
    realm: 'moon',
    title: "Chang'e and the Jade Rabbit Rovers",
    topic: 'change-missions',
    topicName: "China's Moon missions",
    blurb: "Drive the Jade Rabbit rovers with a mission engineer, from the near side to the far side of the Moon.",
    reading: [
      { title: "Named after a legend", emoji: '🐇', text: "China named its Moon missions after Chang'e, the lady of the Moon from the old story, and its Moon rovers after her Jade Rabbit: Yutu." },
      { title: "The first rover", emoji: '🚙', text: "In 2013, Chang'e 3 landed and the Yutu rover rolled out onto the Moon. Yutu sent back photos and studied the ground under its wheels." },
      { title: "The far side", emoji: '🌑', text: "In 2019, Chang'e 4 became the first spacecraft ever to land gently on the far side of the Moon, the side we never see from Earth. Its rover was Yutu-2." },
      { title: "Bringing rocks home", emoji: '🪨', text: "Chang'e 5 brought moon rocks home to Earth in 2020, and Chang'e 6 brought back the first ever rocks from the far side in 2024." }
    ],
    dialogue: {
      npc: { name: "Lin", role: "a rover driver at mission control", look: 'mission', portrayal: 'generic' },
      intro: "Hi! I'm Lin, and I drive a rover on the Moon from right here on Earth. Want to help me steer? Gently now, there's a crater ahead!",
      topics: [
        { ask: "How do you drive a rover from Earth?", answer: "We look at the photos the rover sends us, plan a safe path and send the commands by radio. Then the rover drives a short way and waits for our next message." },
        { ask: "Why does the rover drive so slowly?", answer: "Safety first! The ground is full of rocks and craters, and if the rover gets stuck, nobody can go and give it a push. Slow and careful wins the race." },
        { ask: "How do you talk to the far side?", answer: "The far side always faces away from the Earth, so our radio can't reach it directly. So we sent a relay satellite called Queqiao, the 'Magpie Bridge', to pass the messages along." },
        { ask: "What happens at night?", answer: "A night on the Moon lasts about two weeks and is freezing cold. The rover folds up, goes to sleep and waits for the Sun to come back and wake it up." },
        { ask: "Why bring moon rocks home?", answer: "In laboratories on Earth, scientists can study rocks with huge machines that are far too big to send to the Moon. Every rock tells part of the Moon's story." }
      ],
      challenge: {
        q: "Which side of the Moon did Chang'e 4 land on?",
        choices: ["The near side", "The far side", "It landed on the Sun"],
        answer: 1,
        explain: "Chang'e 4 was the first spacecraft to land gently on the far side, the side we never see from Earth."
      },
      farewell: "The rover is going to sleep for the long Moon night. Good night, little Jade Rabbit!"
    },
    timeline: {
      title: "China's Moon missions",
      events: [
        { label: "Chang'e 1 goes round the Moon and maps it", year: 2007, when: "2007" },
        { label: "Chang'e 3 lands, and the Yutu rover drives on the Moon", year: 2013, when: "2013" },
        { label: "The Queqiao relay satellite is launched", year: 2018, when: "2018" },
        { label: "Chang'e 4 lands on the far side of the Moon", year: 2019, when: "2019" },
        { label: "Chang'e 5 brings moon rocks back to Earth", year: 2020, when: "2020" },
        { label: "Chang'e 6 brings back the first rocks from the far side", year: 2024, when: "2024" }
      ]
    },
    artifact: {
      model: 'moon-rover',
      name: "A model of the Yutu-2 rover",
      text: "Yutu-2 is a small six-wheeled rover with solar panels like wings and cameras on a mast. It weighs about 140 kilograms and drives very slowly and carefully."
    },
    quiz: [
      { q: "What does the name Yutu mean?", choices: ["Fast car", "Jade Rabbit", "Moon rock"], answer: 1, hint: "It comes from the old Moon story.", explain: "Yutu means Jade Rabbit, Chang'e's companion in the old story." },
      { q: "What was special about Chang'e 4?", choices: ["It was the first to land gently on the far side of the Moon", "It carried people", "It went to Mars"], answer: 0, hint: "The side we never see.", explain: "In 2019, Chang'e 4 was the first spacecraft to land gently on the far side." },
      { q: "Why did the far-side mission need the Queqiao relay satellite?", choices: ["To take selfies", "To carry fuel", "Radio from Earth can't reach the far side directly"], answer: 2, hint: "The far side always faces away from us.", explain: "The far side faces away from the Earth, so Queqiao passed the radio messages along." },
      { q: "What does a rover do during the long, cold Moon night?", choices: ["It drives faster", "It goes to sleep until the Sun comes back", "It flies home"], answer: 1, hint: "No sunlight for its solar panels.", explain: "The rover sleeps through the two-week night and wakes up when the Sun returns." },
      { q: "Which mission brought back the first rocks from the far side?", choices: ["Chang'e 6", "Apollo 11", "Chang'e 1"], answer: 0, hint: "It landed in 2024.", explain: "Chang'e 6 brought back the first rocks from the far side in 2024." }
    ]
  },

  // ───────────── Moonbase 7: Starlight Station (about age 12–13) ─────────────
  {
    id: 'h7-moon-apollo13',
    subject: 'history',
    floor: 7,
    realm: 'moon',
    title: "Apollo 13: Everyone Came Home",
    topic: 'apollo-13',
    topicName: 'Apollo 13 and problem-solving',
    blurb: "Solve problems with Mission Control and bring three astronauts safely home.",
    reading: [
      { title: "A trip to the Moon", emoji: '🚀', text: "In April 1970, Apollo 13 set off for the Moon with three astronauts: Jim Lovell, Jack Swigert and Fred Haise." },
      { title: "A change of plan", emoji: '🔧', text: "On the way, an oxygen tank in their spaceship broke. They could no longer land on the Moon, so the new plan was simple: bring everyone home safely." },
      { title: "A lander becomes a lifeboat", emoji: '🛟', text: "The crew moved into their small Moon lander, Aquarius, and used it like a lifeboat. Mission Control worked out how to swing round the Moon and head back to the Earth." },
      { title: "Teamwork wins", emoji: '🤝', text: "Engineers on Earth solved problem after problem, even how to fit a square air filter into a round holder. After almost six days, all three astronauts splashed down safe and sound." }
    ],
    dialogue: {
      npc: { name: "Marge", role: "an engineer at Mission Control, 1970", look: 'mission', portrayal: 'generic' },
      intro: "Hello! I'm Marge, an engineer at Mission Control. We have a puzzle to solve, and three astronauts are counting on us. Grab a pencil, and let's think it through together!",
      topics: [
        { ask: "What went wrong?", answer: "An oxygen tank broke, and the main ship began to run low on power and oxygen. So the crew moved into the lander, Aquarius, which had its own supplies." },
        { ask: "What was the air filter puzzle?", answer: "The lander's air cleaners couldn't keep up with three people. The spare filters from the main ship were square, but the holder was round! We worked out how to join them using only things on board: plastic bags, cardboard and tape." },
        { ask: "How did they get home?", answer: "They looped round the Moon and let its gravity swing them back towards the Earth. We worked out exactly when to fire the engine to keep them on course." },
        { ask: "Were people worried?", answer: "Yes, but nobody gave up. Everyone stayed calm, shared ideas and checked each other's work. That's how big problems get solved." },
        { ask: "How did it end?", answer: "On 17 April 1970, the capsule splashed down in the Pacific Ocean, and all three astronauts came home safe and sound. Everyone cheered!" }
      ],
      challenge: {
        q: "How did the team fit a square air filter into a round holder?",
        choices: ["They flew home to fetch a round one", "They didn't need clean air", "They built a joining piece from bags, cardboard and tape"],
        answer: 2,
        explain: "Engineers on Earth worked out how to join them with plastic bags, cardboard and tape, and the crew built it on board."
      },
      farewell: "Remember: when something goes wrong, stay calm, work as a team and solve one problem at a time."
    },
    timeline: {
      title: "The Apollo missions",
      events: [
        { label: "Apollo 8 is the first crew to fly round the Moon", year: 1968, when: "1968" },
        { label: "Apollo 11 lands on the Moon", year: 1969, when: "1969" },
        { label: "Apollo 13's crew loop round the Moon and all come home safely", year: 1970, when: "1970" },
        { label: "Apollo 15 astronauts drive the first car on the Moon, the Lunar Rover", year: 1971, when: "1971" },
        { label: "Apollo 17, the last Apollo mission, visits the Moon", year: 1972, when: "1972" }
      ]
    },
    artifact: {
      model: 'air-filter',
      name: "The square air filter fix",
      text: "This is a model of the famous fix the crew called 'the mailbox': a square air filter joined to a round hose with plastic bags, cardboard and tape. The astronauts built it by following instructions from Mission Control, and it kept their air clean."
    },
    quiz: [
      { q: "What broke on the way to the Moon on Apollo 13?", choices: ["An oxygen tank", "The radio", "A window"], answer: 0, hint: "Something that stored oxygen.", explain: "An oxygen tank broke, so the crew could no longer land on the Moon." },
      { q: "What did the crew use as a 'lifeboat'?", choices: ["A parachute", "Their Moon lander, Aquarius", "A space station"], answer: 1, hint: "It was meant to land on the Moon.", explain: "The crew moved into their Moon lander, Aquarius, and used it like a lifeboat." },
      { q: "How did Apollo 13 turn round to come home?", choices: ["It reversed like a car", "It stopped and waited", "It looped round the Moon, using the Moon's gravity"], answer: 2, hint: "Think of a swing round the Moon.", explain: "The spacecraft looped round the Moon, and the Moon's gravity helped swing it back towards the Earth." },
      { q: "How did the Apollo 13 mission end?", choices: ["All three astronauts came home safely", "They stayed on the Moon", "They landed on Mars"], answer: 0, hint: "Everyone cheered!", explain: "All three astronauts splashed down safely in the Pacific Ocean on 17 April 1970." },
      { q: "What is the big lesson of Apollo 13?", choices: ["Give up when things go wrong", "Stay calm, work as a team and solve one problem at a time", "Never go to space"], answer: 1, hint: "Think of Mission Control.", explain: "By staying calm and working as a team, they solved every problem and brought everyone home." }
    ]
  },
  {
    id: 'h7-moon-new-explorers',
    subject: 'history',
    floor: 7,
    realm: 'moon',
    title: "New Moon Explorers",
    topic: 'new-moon-missions',
    topicName: 'Moon missions today',
    blurb: "Danuri, Chandrayaan-3, SLIM and Artemis: meet the new missions heading back to the Moon.",
    reading: [
      { title: "Danuri from Korea", emoji: '🛰️', text: "In 2022, Korea sent its first Moon spacecraft, Danuri, whose name means 'enjoy the Moon'. It goes round the Moon, taking photos and studying its surface." },
      { title: "Chandrayaan-3 from India", emoji: '🚀', text: "In August 2023, India's Chandrayaan-3 landed in the area near the Moon's south pole, the first spacecraft to land so far south. Its little rover, Pragyan, rolled out to explore." },
      { title: "SLIM from Japan", emoji: '🎯', text: "In January 2024, Japan's SLIM, nicknamed the 'Moon Sniper', landed very close to the exact spot it aimed for. It ended up tipped on its nose, but it still worked and sent pictures!" },
      { title: "Artemis", emoji: '👩‍🚀', text: "NASA's Artemis missions are taking people back towards the Moon. Artemis I flew round the Moon without a crew in 2022, with a dummy astronaut on board to test the seats and suits." }
    ],
    dialogue: {
      npc: { name: "Seo-yeon", role: "a young scientist on a Moon mission team", look: 'mission', portrayal: 'generic' },
      intro: "Annyeong! I'm Seo-yeon. I study the Moon with pictures from the Danuri spacecraft. These are exciting times: lots of countries are visiting the Moon! Want to see?",
      topics: [
        { ask: "What does Danuri do?", answer: "Danuri goes round the Moon and takes photos with its cameras. One camera, made by NASA, is so sensitive that it can see into deep craters that are always in shadow." },
        { ask: "Why does everyone want to go to the south pole?", answer: "Some craters near the south pole never get any sunlight, so they're super cold. Scientists think water ice is hiding there. Ice could give future explorers water to drink and oxygen to breathe!" },
        { ask: "What did Chandrayaan-3 find?", answer: "Its rover, Pragyan, tested the ground and found sulfur and other elements near the south pole. It worked for about two weeks: one whole Moon day." },
        { ask: "Why is SLIM called the Moon Sniper?", answer: "Because it landed very close to its target, much closer than earlier landers! Landing exactly where you want is important for future missions." },
        { ask: "Could I go to the Moon one day?", answer: "Maybe! Astronauts are getting ready to go back, and moonbases might come next. Study science, maths and teamwork, and who knows where you'll land!" }
      ],
      challenge: {
        q: "What do scientists hope to find in the cold, dark craters near the Moon's south pole?",
        choices: ["Moon rabbits", "Water ice", "Gold coins"],
        answer: 1,
        explain: "Scientists think water ice is hiding in those craters. It could give explorers water and oxygen."
      },
      farewell: "Keep watching the news for the next Moon landing. Maybe one day I'll be reading about you!"
    },
    timeline: {
      title: "Back to the Moon",
      events: [
        { label: "Apollo 11 lands on the Moon", year: 1969, when: "1969" },
        { label: "Scientists find signs of water on the Moon using India's Chandrayaan-1", year: 2009, when: "2009" },
        { label: "Korea's Danuri sets off for the Moon", year: 2022, when: "2022" },
        { label: "India's Chandrayaan-3 lands near the Moon's south pole", year: 2023, when: "2023" },
        { label: "Japan's SLIM lands very close to its target", year: 2024, when: "2024" }
      ]
    },
    artifact: {
      model: 'orbiter',
      name: "A model of the Danuri orbiter",
      text: "Danuri is a box-shaped spacecraft about as tall as a grown-up, with solar panels to make electricity and cameras and instruments looking down at the Moon."
    },
    quiz: [
      { q: "What is Korea's first Moon spacecraft called?", choices: ["Danuri", "Sputnik", "Hubble"], answer: 0, hint: "Its name means 'enjoy the Moon'.", explain: "Danuri is Korea's first Moon spacecraft, launched in 2022." },
      { q: "Where did India's Chandrayaan-3 land in 2023?", choices: ["On the far side", "In the area near the Moon's south pole", "On Mars"], answer: 1, hint: "Where the cold, dark craters are.", explain: "Chandrayaan-3 landed near the Moon's south pole, further south than any lander before it." },
      { q: "Why is Japan's SLIM called the 'Moon Sniper'?", choices: ["It is very fast", "It is very loud", "It landed very close to its exact target"], answer: 2, hint: "A sniper hits the target exactly.", explain: "SLIM landed very close to the exact spot it aimed for." },
      { q: "Why might water ice on the Moon be useful?", choices: ["For ice skating", "It could give explorers water and oxygen", "To keep moon rocks cold"], answer: 1, hint: "What do people need to live?", explain: "Ice could be melted for water, and water can be split to make oxygen to breathe." },
      { q: "What did Artemis I carry round the Moon in 2022?", choices: ["A dummy astronaut", "Four astronauts", "A moon rabbit"], answer: 0, hint: "It flew without a crew.", explain: "Artemis I flew without a crew, but carried a dummy astronaut to test the seats and suits." }
    ]
  }
];

/* ------------------------------------------------------------ The Star Observatory (physics) */

const MOON_PHYSICS = [
  // ───────────── Moonbase 1: Landing Crater (about age 6–7) ─────────────
  {
    id: 'p1-moon-phases',
    subject: 'physics',
    floor: 1,
    realm: 'moon',
    title: "The Moon's Changing Shape",
    topic: 'moon-phases',
    topicName: 'Phases of the Moon',
    blurb: "Why does the Moon change shape? Play with light and shadow to find out.",
    reading: [
      { title: "Moonlight is sunlight", emoji: '☀️', text: "The Moon does not make its own light. The Sun shines on it, and the Moon bounces some of that light down to us." },
      { title: "Half is always lit", emoji: '🌓', text: "The Sun always lights up the half of the Moon that faces it. As the Moon goes round the Earth, we see different amounts of that bright half." },
      { title: "From new to full", emoji: '🌕', text: "When we can't see the lit half at all, it is a new moon. Night by night it grows into a crescent, a half moon and then a full moon. Then it shrinks again." },
      { title: "Light and shadow", emoji: '🔦', text: "Light travels in straight lines. The side of the Moon facing away from the Sun is in its own shadow, so it looks dark." }
    ],
    sim: {
      id: 'shadow',
      predict: {
        q: "The torch is like the Sun. You move it closer to the toy. What happens to the toy's shadow?",
        choices: ["It gets bigger", "It gets smaller", "It disappears"],
        answer: 0,
        explain: "Close to the torch, the toy blocks more of the light, so its shadow grows big. Whatever blocks light makes a shadow, even the Moon!"
      }
    },
    quiz: [
      { q: "Does the Moon make its own light?", choices: ["Yes, it glows like a lamp", "No, it reflects light from the Sun"], answer: 1, hint: "Think about where moonlight comes from.", explain: "The Moon has no light of its own. It bounces sunlight down to us." },
      { q: "What do we call it when we can see the whole lit side of the Moon?", choices: ["A new moon", "A full moon", "A half moon"], answer: 1, hint: "The Moon looks like a whole, round circle.", explain: "When we see the whole lit side, it is a full moon." },
      { q: "How much of the Moon does the Sun light up?", choices: ["None of it", "Only the middle", "Half of it, always"], answer: 2, hint: "The side that faces the Sun.", explain: "The Sun always lights up the half of the Moon that faces it." },
      { q: "About how long is it from one full moon to the next?", choices: ["About 29 and a half days", "About a year", "About a week"], answer: 0, hint: "About a month.", explain: "From one full moon to the next takes about 29 and a half days." },
      { q: "What do we call a thin, curved Moon shape?", choices: ["A crater", "A crescent", "A comet"], answer: 1, hint: "It looks like a smile or a banana.", explain: "A thin, curved Moon shape is called a crescent." }
    ]
  },
  {
    id: 'p1-moon-footprints',
    subject: 'physics',
    floor: 1,
    realm: 'moon',
    title: "Moon Boots and Footprints",
    topic: 'friction',
    topicName: 'Friction',
    blurb: "Why don't astronauts slip, and why do their footprints stay? Roll a toy car to find out.",
    reading: [
      { title: "Footprints that stay", emoji: '👣', text: "The footprints left by astronauts are still on the Moon! There is no wind or rain there to blow or wash them away." },
      { title: "Grippy boots", emoji: '🥾', text: "Moon boots have bumpy, ridged soles. The ridges grip the dusty ground, so astronauts don't slip." },
      { title: "Friction", emoji: '✋', text: "Friction is a force that slows things down when two surfaces rub together. Rough surfaces have lots of friction. Smooth, slippery ones have very little." },
      { title: "Sticky moon dust", emoji: '🌑', text: "Moon dust is very fine and sharp, a bit like powdered glass. It sticks to everything, so astronauts had to brush it off their suits!" }
    ],
    sim: {
      id: 'ramp',
      setup: { surfaces: ['sand', 'carpet', 'ice'] },
      predict: {
        q: "The toy car rolls down the ramp onto sand, carpet and ice. On which one will it roll the farthest?",
        choices: ["Sand", "Carpet", "Ice"],
        answer: 2,
        explain: "Ice is smooth and slippery, with very little friction, so the car rolls farthest. Bumpy, grippy surfaces slow it down fast, just like grippy moon boots stop astronauts sliding."
      }
    },
    quiz: [
      { q: "Why are the astronauts' footprints still on the Moon?", choices: ["Someone guards them", "There is no wind or rain to wipe them away", "They are painted on"], answer: 1, hint: "What wipes footprints away on Earth?", explain: "The Moon has no wind or rain, so the footprints stay for a very, very long time." },
      { q: "What is friction?", choices: ["A force that slows things down when surfaces rub", "A kind of moon rock", "A light in the sky"], answer: 0, hint: "Rub your hands together.", explain: "Friction is a force that slows things down when two surfaces rub together." },
      { q: "Which surface has the least friction?", choices: ["Sand", "Carpet", "Ice"], answer: 2, hint: "Which one is slippery?", explain: "Ice is smooth and slippery, so it has the least friction." },
      { q: "Why do moon boots have bumpy soles?", choices: ["To look pretty", "To make them lighter", "To grip the ground so astronauts don't slip"], answer: 2, hint: "Think of the ridges on your trainers.", explain: "The bumpy ridges grip the dusty ground, so astronauts don't slip." },
      { q: "What is moon dust like?", choices: ["Soft and wet like mud", "Very fine and sharp, and it sticks to everything", "Fluffy like snow"], answer: 1, hint: "Like powdered glass.", explain: "Moon dust is very fine and sharp, and it sticks to everything." }
    ]
  },

  // ───────────── Moonbase 2: Rocket Ridge (about age 7–8) ─────────────
  {
    id: 'p2-moon-silent-space',
    subject: 'physics',
    floor: 2,
    realm: 'moon',
    title: "Shh! No Sound in Space",
    topic: 'sound',
    topicName: 'Sound',
    blurb: "Pluck a ruler to make sounds, and find out why space is silent.",
    reading: [
      { title: "Sound is a wobble", emoji: '〰️', text: "Sound is made when something vibrates, or wobbles back and forth very fast. The wobbles push on the air, and the air carries them to your ears." },
      { title: "No air, no sound", emoji: '🤫', text: "On the Moon there is no air to carry the wobbles. If a rock fell right next to you, you would not hear it through the empty space!" },
      { title: "Radios to talk", emoji: '📻', text: "Astronauts talk to each other with radios in their helmets. Radio waves can travel through empty space, but sound can't." },
      { title: "Touch helmets", emoji: '⛑️', text: "If two astronauts touch their helmets together, they can hear each other a little, because the sound travels through the solid helmets!" }
    ],
    sim: {
      id: 'sound',
      predict: {
        q: "You make the part of the ruler that sticks out shorter, then pluck it. How will the note sound?",
        choices: ["Lower", "Higher", "Just the same"],
        answer: 1,
        explain: "A shorter ruler wobbles faster, so the note is higher. In the lab there is air to carry the sound to your ears. On the Moon, you wouldn't hear it at all!"
      }
    },
    quiz: [
      { q: "What carries sound to your ears on Earth?", choices: ["Light", "Air", "Magnets"], answer: 1, hint: "It's all around you, and you breathe it.", explain: "Sound travels through the air to your ears." },
      { q: "Why can't sound travel through space?", choices: ["There is no air to carry it", "Space is too cold", "Space is too dark"], answer: 0, hint: "What does sound need to travel?", explain: "Sound needs something like air to travel through, and space is empty." },
      { q: "How do astronauts talk to each other on the Moon?", choices: ["By shouting very loudly", "By waving flags", "With radios in their helmets"], answer: 2, hint: "Radio waves can cross empty space.", explain: "Astronauts use radios, because radio waves can travel through empty space." },
      { q: "What makes a sound?", choices: ["Something vibrating", "Something shining", "Something cold"], answer: 0, hint: "Touch your throat while you hum.", explain: "Sounds are made by things vibrating, or wobbling back and forth." },
      { q: "Two astronauts touch their helmets together. Can they hear each other a little?", choices: ["No, never", "Yes, the sound travels through the solid helmets"], answer: 1, hint: "Sound can travel through solid things too.", explain: "Sound can travel through solid things, so touching helmets lets them hear each other a little." }
    ]
  },
  {
    id: 'p2-moon-hammer-feather',
    subject: 'physics',
    floor: 2,
    realm: 'moon',
    title: "The Hammer and the Feather",
    topic: 'gravity',
    topicName: 'Gravity and falling',
    blurb: "Drop a hammer and a feather on the Moon, just like an astronaut did in 1971.",
    reading: [
      { title: "Gravity pulls", emoji: '🍎', text: "Gravity is the pull that makes things fall. The Earth pulls things down, and so does the Moon, only more gently." },
      { title: "Air gets in the way", emoji: '🪶', text: "On Earth, a feather floats down slowly because the air pushes against it. A hammer pushes through the air easily and falls fast." },
      { title: "A famous test", emoji: '🔨', text: "In 1971, astronaut David Scott dropped a hammer and a feather at the same time on the Moon, where there is no air." },
      { title: "What happened?", emoji: '🌙', text: "They hit the ground at exactly the same time! Without air to get in the way, everything falls at the same speed, heavy or light." }
    ],
    sim: {
      id: 'drop',
      setup: { objects: ['hammer', 'feather'], air: 'off', world: 'moon' },
      predict: {
        q: "On the Moon, with no air, you drop a hammer and a feather at the same time. What happens?",
        choices: ["The hammer lands first", "They land at the same time", "The feather floats away"],
        answer: 1,
        explain: "With no air to slow the feather, gravity pulls both down at the same speed, so they land together, just like on the Moon in 1971."
      }
    },
    quiz: [
      { q: "What is gravity?", choices: ["A kind of wind", "The pull that makes things fall", "Light from the Sun"], answer: 1, hint: "It pulls you down to the ground.", explain: "Gravity is the pull that makes things fall." },
      { q: "Why does a feather fall slowly on Earth?", choices: ["The air pushes against it", "It is too heavy", "Gravity doesn't pull feathers"], answer: 0, hint: "Something it has to push through.", explain: "The air pushes against the feather and slows it down." },
      { q: "Who dropped a hammer and a feather on the Moon?", choices: ["Galileo", "A moon rabbit", "Astronaut David Scott"], answer: 2, hint: "An Apollo astronaut, in 1971.", explain: "Astronaut David Scott did the test on the Moon in 1971." },
      { q: "On the Moon, which lands first: the hammer or the feather?", choices: ["The hammer", "The feather", "They land together"], answer: 2, hint: "There's no air on the Moon.", explain: "With no air, they fall at the same speed and land together." },
      { q: "Is the Moon's gravity stronger or weaker than the Earth's?", choices: ["Weaker", "Stronger", "Just the same"], answer: 0, hint: "Astronauts could hop very high there.", explain: "The Moon's gravity is weaker, about a sixth as strong as the Earth's." }
    ]
  },

  // ───────────── Moonbase 3: Rover Tracks (about age 8–9) ─────────────
  {
    id: 'p3-moon-craters',
    subject: 'physics',
    floor: 3,
    realm: 'moon',
    title: "How Craters Are Made",
    topic: 'craters',
    topicName: 'Craters and impacts',
    blurb: "Space rocks crash, craters form. Drop two balls and find out how things fall.",
    reading: [
      { title: "Space rocks", emoji: '☄️', text: "Space is full of rocks, from tiny grains to huge boulders. When one hits the Moon, it blasts out a round hole called a crater." },
      { title: "Fast means big", emoji: '💥', text: "Space rocks hit very fast. The faster and bigger the rock, the bigger the crater it makes." },
      { title: "No air to protect it", emoji: '🛡️', text: "On Earth, the air burns up most small space rocks before they land. We see them as shooting stars! The Moon has no air, so even small ones reach the ground." },
      { title: "Craters that last", emoji: '🕰️', text: "On Earth, wind, rain and plants slowly wear craters away. The Moon has no weather, so its craters can last for billions of years." }
    ],
    sim: {
      id: 'drop',
      setup: { objects: ['ball', 'bowling-ball'], air: 'on' },
      predict: {
        q: "You drop a small ball and a heavy bowling ball at the same time. Which lands first?",
        choices: ["The bowling ball, by a long way", "The small ball", "They land at almost the same time"],
        answer: 2,
        explain: "The air hardly slows either ball, so they fall at almost the same speed and land together. Gravity speeds up heavy and light things alike. The heavy ball just makes a bigger dent!"
      }
    },
    quiz: [
      { q: "What is a crater?", choices: ["A mountain on the Moon", "A round hole made when a space rock hits", "A kind of rocket"], answer: 1, hint: "Crash!", explain: "A crater is a round hole blasted out when a space rock hits the ground." },
      { q: "Why do craters on the Moon last so long?", choices: ["There's no wind or rain to wear them away", "They are made of metal", "Astronauts repair them"], answer: 0, hint: "Think about the weather.", explain: "The Moon has no weather, so nothing wears its craters away." },
      { q: "What happens to most small space rocks that fall towards the Earth?", choices: ["They bounce off", "They turn into rain", "They burn up in the air as shooting stars"], answer: 2, hint: "You might see one streak across the night sky.", explain: "Most small space rocks burn up in the air, and we see them as shooting stars." },
      { q: "Which makes a bigger crater?", choices: ["A slow, small rock", "A fast, big rock", "They always make the same crater"], answer: 1, hint: "More speed and more size.", explain: "A faster, bigger rock hits harder and makes a bigger crater." },
      { q: "If air doesn't get in the way, do heavy things fall faster than light things?", choices: ["Yes, much faster", "No, they fall at the same speed"], answer: 1, hint: "Remember the hammer and the feather.", explain: "Without air getting in the way, heavy and light things fall at the same speed." }
    ]
  },
  {
    id: 'p3-moon-ice',
    subject: 'physics',
    floor: 3,
    realm: 'moon',
    title: "Ice in the Moon's Dark Craters",
    topic: 'floating',
    topicName: 'Floating and sinking',
    blurb: "Scientists have found signs of ice on the Moon. Find out why ice floats!",
    reading: [
      { title: "Shadowy craters", emoji: '🌑', text: "Near the Moon's poles, some deep craters never get any sunlight at all. They are some of the coldest places we know of." },
      { title: "Hidden ice", emoji: '🧊', text: "Scientists have found signs of water ice frozen in those dark craters. One day, astronauts might melt it to drink!" },
      { title: "Ice floats", emoji: '🫧', text: "When water freezes, it spreads out and takes up more space. That makes ice lighter than the same amount of water, so ice floats." },
      { title: "Float or sink?", emoji: '⚓', text: "Things that are lighter than the same amount of water float. Things that are heavier sink. That's why a stone sinks and a cork floats." }
    ],
    sim: {
      id: 'float',
      setup: { items: ['ice-cube', 'stone', 'cork', 'key', 'apple', 'metal-spoon'] },
      predict: {
        q: "You drop an ice cube into the water tank. Will it float or sink?",
        choices: ["It sinks to the bottom", "It floats"],
        answer: 1,
        explain: "Ice floats! When water freezes it spreads out, so ice is lighter than the same amount of water."
      }
    },
    quiz: [
      { q: "Where on the Moon have scientists found signs of ice?", choices: ["In dark craters near the poles", "On top of the highest mountain", "In the middle of the full moon"], answer: 0, hint: "Places that never get sunlight.", explain: "Signs of ice have been found in dark, freezing craters near the Moon's poles." },
      { q: "Does ice float or sink in water?", choices: ["It sinks", "It floats"], answer: 1, hint: "Think of ice cubes in a drink.", explain: "Ice floats, because it is lighter than the same amount of water." },
      { q: "What happens to water when it freezes?", choices: ["It shrinks a lot", "It spreads out and takes up more space", "It disappears"], answer: 1, hint: "A frozen water bottle can bulge.", explain: "Water spreads out when it freezes, so ice takes up more space." },
      { q: "Which of these sinks in water?", choices: ["A cork", "An apple", "A stone"], answer: 2, hint: "It is heavy for its size.", explain: "A stone is heavier than the same amount of water, so it sinks." },
      { q: "Why would ice on the Moon be useful for astronauts?", choices: ["They could melt it for water", "To build snowmen", "To cool their rockets"], answer: 0, hint: "What do people need every day?", explain: "Astronauts could melt the ice to get water to drink." }
    ]
  },

  // ───────────── Moonbase 4: Dish Valley (about age 9–10) ─────────────
  {
    id: 'p4-moon-earthshine',
    subject: 'physics',
    floor: 4,
    realm: 'moon',
    title: "Earthshine: Light Bouncing Home",
    topic: 'reflection',
    topicName: 'Reflection of light',
    blurb: "Bounce light off a mirror, and find out why the dark part of the Moon can glow.",
    reading: [
      { title: "Light bounces", emoji: '🪞', text: "When light hits a mirror, it bounces off. The angle it comes in at is the same as the angle it bounces out at." },
      { title: "Earthshine", emoji: '🌍', text: "Look at a thin crescent moon. Sometimes you can see the dark part glowing faintly! That's sunlight that bounced off the Earth onto the Moon, and then back to your eyes." },
      { title: "Leonardo worked it out", emoji: '🎨', text: "More than 500 years ago, the artist and inventor Leonardo da Vinci worked out that the faint glow is light from the Earth." },
      { title: "Mirrors on the Moon", emoji: '📏', text: "Apollo astronauts left special mirrors on the Moon. Scientists bounce laser light off them to measure the distance to the Moon very exactly." }
    ],
    sim: {
      id: 'mirror',
      predict: {
        q: "A light beam hits the mirror at 40° from the normal. At what angle from the normal will it bounce off?",
        choices: ["40°", "50°", "80°"],
        answer: 0,
        explain: "Angle in equals angle out, so it bounces off at 40°. Sunlight bouncing off the Earth onto the Moon follows the same rule."
      }
    },
    quiz: [
      { q: "What is earthshine?", choices: ["Light from a Moon lamp", "Sunlight bounced off the Earth onto the Moon", "Fire on the Moon"], answer: 1, hint: "Light makes a round trip.", explain: "Earthshine is sunlight that bounces off the Earth, lights the Moon's dark part, and comes back to us." },
      { q: "A beam hits a mirror at 25° from the normal. At what angle does it bounce off?", choices: ["25°", "50°", "65°"], answer: 0, hint: "Angle in equals angle out.", explain: "It bounces off at 25°, the same angle it came in at." },
      { q: "Who worked out what earthshine is, more than 500 years ago?", choices: ["Neil Armstrong", "Leonardo da Vinci", "Sally Ride"], answer: 1, hint: "A famous artist and inventor.", explain: "Leonardo da Vinci worked out that the faint glow is light from the Earth." },
      { q: "When is earthshine easiest to see?", choices: ["At full moon", "At a thin crescent moon", "During the day"], answer: 1, hint: "When most of the Moon facing us is dark.", explain: "At a thin crescent, most of the Moon facing us is dark, so the faint earthshine shows up." },
      { q: "Why did astronauts leave mirrors on the Moon?", choices: ["To check their hair", "To scare away moon rabbits", "So scientists can bounce lasers off them to measure the distance"], answer: 2, hint: "Measuring with light.", explain: "Scientists bounce laser light off the mirrors to measure exactly how far away the Moon is." }
    ]
  },
  {
    id: 'p4-moon-levers',
    subject: 'physics',
    floor: 4,
    realm: 'moon',
    title: "Lifting Rocks on the Moon",
    topic: 'levers',
    topicName: 'Levers',
    blurb: "Balance a seesaw and learn how a lever could help moonbase builders.",
    reading: [
      { title: "Light, but still big", emoji: '🪨', text: "On the Moon, a big rock feels about six times lighter than on Earth. But it is still just as big, and just as hard to get moving or to stop!" },
      { title: "A lever helps", emoji: '🔧', text: "A lever is a strong bar that turns on a point called a pivot. Push down on the long end, and the short end lifts something heavy." },
      { title: "Balancing", emoji: '⚖️', text: "On a seesaw, a heavy weight close to the pivot can balance a light weight far from the pivot. Weight × distance must be the same on both sides." },
      { title: "Moonbase builders", emoji: '🏗️', text: "Future moonbase builders could use levers, ramps and pulleys to move rocks and build walls, saving their strength inside heavy spacesuits." }
    ],
    sim: {
      id: 'lever',
      predict: {
        q: "A 2 kg weight sits 2 pegs from the pivot on one side. Where should a 1 kg weight go on the other side to balance it?",
        choices: ["1 peg from the pivot", "2 pegs from the pivot", "4 pegs from the pivot"],
        answer: 2,
        explain: "2 kg × 2 pegs = 4 on one side, so the 1 kg weight needs 1 × 4 = 4: four pegs out. A light weight far away balances a heavy one close in."
      }
    },
    quiz: [
      { q: "What is the turning point of a lever called?", choices: ["The pivot", "The handle", "The crater"], answer: 0, hint: "A seesaw turns on it.", explain: "A lever turns on a point called the pivot." },
      { q: "A 3 kg weight sits 1 peg from the pivot. Where does a 1 kg weight balance it on the other side?", choices: ["1 peg out", "3 pegs out", "4 pegs out"], answer: 1, hint: "3 × 1 = 1 × ?", explain: "3 × 1 = 3, and 1 × 3 = 3, so the 1 kg weight goes 3 pegs out." },
      { q: "To lift a heavy rock with a lever, where should you push?", choices: ["Right next to the pivot", "On the rock itself", "On the long end, far from the pivot"], answer: 2, hint: "The longer the push arm, the easier.", explain: "Pushing far from the pivot gives you the most turning power." },
      { q: "A rock feels lighter on the Moon. Is it smaller there?", choices: ["Yes, it shrinks", "No, it's just as big, but the pull on it is weaker"], answer: 1, hint: "Nothing falls off the rock.", explain: "The rock is just as big. The Moon's weaker gravity only makes it feel lighter." },
      { q: "On the Moon, a rock feels about 6 times lighter. A rock that feels like 60 kg on Earth feels like about…", choices: ["10 kg", "6 kg", "360 kg"], answer: 0, hint: "Divide by 6.", explain: "60 ÷ 6 = 10, so it feels like about 10 kg." }
    ]
  },

  // ───────────── Moonbase 5: Greenhouse Crater (about age 10–11) ─────────────
  {
    id: 'p5-moon-rockets',
    subject: 'physics',
    floor: 5,
    realm: 'moon',
    title: "How Rockets Push",
    topic: 'rockets',
    topicName: 'Rockets and motion',
    blurb: "Push and push back: how rockets fly, and how far things go at different speeds.",
    reading: [
      { title: "Push and push back", emoji: '🎈', text: "When you push on something, it pushes back on you just as hard. Let go of a blown-up balloon: air rushes out one way, so the balloon zooms off the other way!" },
      { title: "Rockets work the same way", emoji: '🚀', text: "A rocket burns fuel and pushes hot gas out of its bottom very fast. The gas pushes the rocket the other way, up into the sky. It even works in space, where there's no air to push against." },
      { title: "Speed, distance, time", emoji: '⏱️', text: "Distance = speed × time. A rover going 3 metres every second for 10 seconds travels 3 × 10 = 30 metres." },
      { title: "Fast enough for the Moon", emoji: '🌙', text: "To head off to the Moon, the Apollo spacecraft had to go about 11 kilometres every second as they left the Earth." }
    ],
    sim: {
      id: 'race',
      predict: {
        q: "Cart A goes at 3 m/s and cart B goes at 6 m/s. Both race for 4 seconds. How far does cart B travel?",
        choices: ["12 metres", "24 metres", "10 metres"],
        answer: 1,
        explain: "Distance = speed × time: 6 × 4 = 24 metres. Twice as fast for the same time means twice as far."
      }
    },
    quiz: [
      { q: "A balloon's air rushes out backwards. Which way does the balloon go?", choices: ["Forwards, the other way", "Backwards, with the air", "It doesn't move"], answer: 0, hint: "Push and push back.", explain: "The air is pushed one way, so the balloon is pushed the other way." },
      { q: "What pushes a rocket up?", choices: ["The wind", "Hot gas rushing out of its bottom", "A giant spring"], answer: 1, hint: "Like the balloon.", explain: "The rocket pushes hot gas down, and the gas pushes the rocket up." },
      { q: "Can a rocket engine work in space, where there is no air?", choices: ["No, it needs air to push on", "Yes, it pushes on its own hot gas"], answer: 1, hint: "The rocket doesn't push the air; it pushes its gas.", explain: "A rocket pushes its own gas out, and the gas pushes back. No air is needed." },
      { q: "A rover goes 5 metres per second for 8 seconds. How far does it go?", choices: ["13 metres", "40 metres", "3 metres"], answer: 1, hint: "Distance = speed × time.", explain: "5 × 8 = 40 metres." },
      { q: "A cart travels 30 metres in 6 seconds. What is its speed?", choices: ["5 metres per second", "36 metres per second", "180 metres per second"], answer: 0, hint: "Speed = distance ÷ time.", explain: "30 ÷ 6 = 5 metres per second." }
    ]
  },
  {
    id: 'p5-moon-long-day',
    subject: 'physics',
    floor: 5,
    realm: 'moon',
    title: "A Very Long Day on the Moon",
    topic: 'states-of-matter',
    topicName: 'States of matter',
    blurb: "Two weeks of sunshine, two weeks of night: heat and cool water to see what changes.",
    reading: [
      { title: "A very long day", emoji: '☀️', text: "The Moon turns slowly. From one sunrise to the next takes about 29 and a half Earth days. So the Moon has about two weeks of sunshine, then about two weeks of night!" },
      { title: "Hotter than boiling", emoji: '🔥', text: "In the long sunshine, the ground near the Moon's middle can reach about 120 °C. That's hotter than boiling water!" },
      { title: "Colder than a freezer", emoji: '❄️', text: "During the long night, the ground can drop to about −130 °C, much colder than any freezer." },
      { title: "Ice, water, steam", emoji: '💧', text: "Water changes with temperature: below 0 °C it freezes into ice, and at 100 °C it boils into steam. On the Moon's open ground there's no air, so liquid water can't stay. It freezes or turns into gas." }
    ],
    sim: {
      id: 'states',
      predict: {
        q: "You keep heating the water. At what temperature will it start to boil?",
        choices: ["0 °C", "50 °C", "100 °C"],
        answer: 2,
        explain: "Water boils at 100 °C. In the long sunshine, the Moon's ground can get even hotter than that!"
      }
    },
    quiz: [
      { q: "About how long does daytime last in one place on the Moon?", choices: ["About 12 hours", "About two weeks", "About a year"], answer: 1, hint: "The Moon turns very slowly.", explain: "The Moon turns so slowly that daytime lasts about two weeks." },
      { q: "At what temperature does water freeze?", choices: ["0 °C", "100 °C", "−130 °C"], answer: 0, hint: "Think of a frosty morning.", explain: "Water freezes into ice at 0 °C." },
      { q: "The sunny ground near the Moon's middle can reach about 120 °C. Is that hotter than boiling water?", choices: ["No, it's colder", "Yes, water boils at 100 °C"], answer: 1, hint: "Compare 120 with 100.", explain: "Water boils at 100 °C, so 120 °C is hotter than boiling water." },
      { q: "What are the three states of water?", choices: ["Hot, warm and cold", "Ice, liquid water and steam", "Rain, snow and wind"], answer: 1, hint: "Solid, liquid and gas.", explain: "Water can be solid ice, liquid water, or a gas: steam (water vapour)." },
      { q: "Why can't puddles of liquid water stay on the Moon's open ground?", choices: ["There is no air, so it quickly freezes or turns to gas", "The rabbits drink it", "It is too dark"], answer: 0, hint: "The Moon has no air.", explain: "With no air pressing down, liquid water quickly boils away or freezes." }
    ]
  },

  // ───────────── Moonbase 6: Crystal Caves (about age 11–12) ─────────────
  {
    id: 'p6-moon-eclipses',
    subject: 'physics',
    floor: 6,
    realm: 'moon',
    title: "Lining Up: Eclipses and Tides",
    topic: 'eclipses-tides',
    topicName: 'Eclipses and tides',
    blurb: "When the Sun, Earth and Moon line up, shadows cross space and the tides grow big.",
    reading: [
      { title: "A shadow on the Earth", emoji: '🌑', text: "In a solar eclipse, the Moon passes between the Sun and the Earth, and its shadow falls on the Earth. Never look straight at the Sun, even during an eclipse!" },
      { title: "A shadow on the Moon", emoji: '🔴', text: "In a lunar eclipse, the Earth is between the Sun and the Moon, and the Earth's shadow falls on the Moon. The Moon can turn a coppery red!" },
      { title: "Why red?", emoji: '🌅', text: "A little sunlight bends through the Earth's air on its way to the Moon. The air lets red light through best, just like at sunset." },
      { title: "Tides", emoji: '🌊', text: "The Moon's gravity pulls on the Earth's oceans, so the sea rises and falls about twice a day. When the Sun, Earth and Moon line up, at new moon and full moon, the tides are extra big." }
    ],
    sim: {
      id: 'shadow',
      predict: {
        q: "You move the torch far away from the toy. What happens to the toy's shadow on the wall?",
        choices: ["It gets bigger", "It gets smaller", "It turns red"],
        answer: 1,
        explain: "With the torch far away, the shadow shrinks. In an eclipse, how big a shadow is decides how much of the Sun or Moon gets covered."
      }
    },
    quiz: [
      { q: "In a solar eclipse, what is between the Sun and the Earth?", choices: ["The Moon", "Mars", "A cloud"], answer: 0, hint: "Its shadow falls on the Earth.", explain: "In a solar eclipse, the Moon passes between the Sun and the Earth." },
      { q: "In a lunar eclipse, whose shadow falls on the Moon?", choices: ["The Sun's", "The Earth's", "A rocket's"], answer: 1, hint: "The Earth is in the middle.", explain: "In a lunar eclipse, the Earth's shadow falls on the Moon." },
      { q: "Is it safe to look straight at the Sun during a solar eclipse?", choices: ["Yes, the Moon makes it safe", "Only for a minute", "No, never look straight at the Sun"], answer: 2, hint: "Your eyes are precious.", explain: "Never look straight at the Sun. Use special eclipse glasses or a pinhole viewer." },
      { q: "Why can the Moon look red in a lunar eclipse?", choices: ["It gets very hot", "Sunlight bends through the Earth's air, and red light gets through best", "It is covered in red dust"], answer: 1, hint: "Think of sunsets.", explain: "A little sunlight bends through the Earth's air, which lets red light through best, so the Moon glows red." },
      { q: "When are the tides extra big?", choices: ["When the Sun, Earth and Moon line up", "Only on Mondays", "When it rains"], answer: 0, hint: "At new moon and full moon.", explain: "When the Sun, Earth and Moon line up, at new and full moon, their pulls add up and the tides are extra big." }
    ]
  },
  {
    id: 'p6-moon-base-power',
    subject: 'physics',
    floor: 6,
    realm: 'moon',
    title: "Powering a Moonbase",
    topic: 'circuits',
    topicName: 'Electric circuits',
    blurb: "Solar panels, batteries and circuits: find out what keeps the moonbase lights on.",
    reading: [
      { title: "Power from the Sun", emoji: '☀️', text: "Solar panels turn sunlight into electricity. Moonbases and rovers use them, and store spare electricity in batteries for the long, dark nights." },
      { title: "A complete loop", emoji: '🔁', text: "Electricity only flows round a complete loop, called a circuit. If there's a gap anywhere, the light goes out." },
      { title: "Conductors", emoji: '⚡', text: "Metals like copper and aluminium let electricity flow through them. They are conductors, so wires are made of them." },
      { title: "Insulators keep you safe", emoji: '🧤', text: "Rubber and plastic don't let electricity flow. They are insulators, so they cover wires to keep astronauts safe." }
    ],
    sim: {
      id: 'circuit',
      setup: { items: ['copper-wire', 'aluminium-foil', 'paper-clip', 'rubber-band', 'plastic-straw', 'eraser'] },
      predict: {
        q: "Which of these will make the bulb light up when you use it to bridge the gap?",
        choices: ["A rubber band", "A plastic straw", "A paper clip"],
        answer: 2,
        explain: "A paper clip is made of metal, so electricity flows through it and the bulb lights up. Rubber and plastic are insulators."
      }
    },
    quiz: [
      { q: "What do solar panels do?", choices: ["Turn sunlight into electricity", "Keep the rain off", "Make the Moon shine"], answer: 0, hint: "Solar means 'of the Sun'.", explain: "Solar panels turn sunlight into electricity." },
      { q: "Why does a moonbase need batteries?", choices: ["To make it heavier", "To store electricity for the long, dark nights", "To play music"], answer: 1, hint: "What happens when the Sun sets for two weeks?", explain: "Batteries store spare electricity for the long Moon nights, when the solar panels get no sunlight." },
      { q: "Which of these is a conductor?", choices: ["A rubber band", "A plastic straw", "Copper wire"], answer: 2, hint: "Wires are made of it.", explain: "Copper is a metal, and metals conduct electricity." },
      { q: "Why are wires covered in rubber or plastic?", choices: ["They are insulators, so they keep people safe", "To make them shiny", "To make the electricity go faster"], answer: 0, hint: "Insulators stop electricity.", explain: "Rubber and plastic are insulators, so they stop electricity from reaching people who touch the wires." },
      { q: "There is a gap in the circuit. What happens to the bulb?", choices: ["It glows brighter", "It goes out", "It turns blue"], answer: 1, hint: "Electricity needs a complete loop.", explain: "Electricity can't flow round a broken loop, so the bulb goes out." }
    ]
  },

  // ───────────── Moonbase 7: Starlight Station (about age 12–13) ─────────────
  {
    id: 'p7-moon-pendulums',
    subject: 'physics',
    floor: 7,
    realm: 'moon',
    title: "Gravity Detectives: Pendulums",
    topic: 'pendulums',
    topicName: 'Pendulums',
    blurb: "Time a swinging pendulum, and discover how it could measure gravity on the Moon.",
    reading: [
      { title: "Tick, tock", emoji: '🕰️', text: "A pendulum is a weight on a string that swings back and forth. The time for one swing depends on the length of the string, not on how heavy the weight is." },
      { title: "Longer is slower", emoji: '📏', text: "A longer string makes a slower swing. Make the string four times as long, and each swing takes twice as long." },
      { title: "Weaker gravity, slower swing", emoji: '🌙', text: "Gravity pulls the pendulum back to the middle. On the Moon, where gravity is about a sixth as strong, the same pendulum would swing about 2.4 times more slowly." },
      { title: "Measuring gravity", emoji: '🔬', text: "Scientists can time a pendulum to work out how strong gravity is in a place. An old pendulum clock taken to the Moon would run very slow!" }
    ],
    sim: {
      id: 'pendulum',
      predict: {
        q: "You make pendulum B's string four times as long as pendulum A's. How long does B take for one swing, compared with A?",
        choices: ["Four times as long", "Twice as long", "The same time"],
        answer: 1,
        explain: "The swing time grows with the square root of the length. Four times the length means twice the time, because √4 = 2."
      }
    },
    quiz: [
      { q: "Does a heavier weight make a pendulum swing faster?", choices: ["Yes, much faster", "No, the weight doesn't change the swing time"], answer: 1, hint: "What did the experiment show?", explain: "The swing time depends on the string's length, not on how heavy the weight is." },
      { q: "You make a pendulum's string longer. What happens?", choices: ["It swings more slowly", "It swings faster", "It stops"], answer: 0, hint: "Think of a long swing in a park.", explain: "A longer string makes a slower swing." },
      { q: "A pendulum takes 1 second per swing. You make the string 4 times as long. How long does one swing take now?", choices: ["4 seconds", "2 seconds", "1 second"], answer: 1, hint: "√4 = 2.", explain: "Four times the length doubles the time: 2 seconds." },
      { q: "How would the same pendulum swing on the Moon?", choices: ["Faster, because the Moon is smaller", "More slowly, because gravity is weaker", "Just the same"], answer: 1, hint: "Gravity pulls it back to the middle.", explain: "With weaker gravity pulling it back, the pendulum swings more slowly on the Moon." },
      { q: "Where in its swing does a pendulum move fastest?", choices: ["At the highest point", "Halfway up one side", "At the very bottom"], answer: 2, hint: "Where does it stop for a moment?", explain: "It moves fastest at the very bottom and stops for a moment at each highest point." }
    ]
  },
  {
    id: 'p7-moon-orbits',
    subject: 'physics',
    floor: 7,
    realm: 'moon',
    title: "Falling Around the Earth: Orbits",
    topic: 'lunar-orbit',
    topicName: "The Moon's orbit",
    blurb: "Launch a moon round a planet, and find out why we always see the same face of the Moon.",
    reading: [
      { title: "Falling and missing", emoji: '🌍', text: "The Moon is always falling towards the Earth, pulled by gravity. But it is also moving sideways so fast that it keeps missing! That's an orbit." },
      { title: "Just the right speed", emoji: '🎯', text: "Too slow, and a moon would fall in. Too fast, and it would fly away into space. At just the right speed, it goes round and round." },
      { title: "The same face", emoji: '🌓', text: "The Moon spins once in the same time it takes to go once round the Earth: about 27 days. So the same side always faces us, and we never see the far side from Earth." },
      { title: "Slowly moving away", emoji: '📏', text: "Laser measurements show that the Moon is moving away from the Earth by about 3.8 centimetres a year, about as fast as your fingernails grow." }
    ],
    sim: {
      id: 'orbit',
      predict: {
        q: "You launch the moon sideways much too fast. What will happen?",
        choices: ["It falls into the planet", "It orbits in a perfect circle", "It flies off into space"],
        answer: 2,
        explain: "Too fast, and gravity can't bend its path round enough, so it escapes into space. An orbit needs just the right speed."
      }
    },
    quiz: [
      { q: "Why doesn't the Moon fall down onto the Earth?", choices: ["It is moving sideways so fast that it keeps missing", "Gravity doesn't reach it", "It is held up by strings"], answer: 0, hint: "Falling and missing.", explain: "The Moon is falling, but it moves sideways so fast that it keeps missing the Earth." },
      { q: "What happens if a moon goes much too slowly?", choices: ["It flies away", "It falls in", "It orbits faster"], answer: 1, hint: "Gravity wins.", explain: "Too slow, and gravity pulls it in, so it falls." },
      { q: "Why do we always see the same face of the Moon?", choices: ["The Moon doesn't spin at all", "The other side is always dark", "It spins once each time it goes round the Earth"], answer: 2, hint: "Spin and orbit take the same time.", explain: "The Moon spins once for every trip round the Earth, so the same side always faces us." },
      { q: "Is the far side of the Moon always dark?", choices: ["Yes, always", "No, it gets sunlight too; we just can't see it from Earth"], answer: 1, hint: "At new moon, which side is lit?", explain: "The far side gets just as much sunlight. We simply never see it from Earth." },
      { q: "About how fast is the Moon moving away from the Earth?", choices: ["About 3.8 cm a year", "About 1 km a day", "It isn't moving away"], answer: 0, hint: "About as fast as fingernails grow.", explain: "Lasers show the Moon drifts away about 3.8 centimetres each year." }
    ]
  }
];

/** The Moon's 42 lessons: two per subject on each of the seven moonbases. */
export const MOON_LESSONS = [...MOON_MATH, ...MOON_HISTORY, ...MOON_PHYSICS];
