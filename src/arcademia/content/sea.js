/**
 * The sea islands' lessons (the Lagoon study world, maps.js): seven islands,
 * each with Sea Math, Sea Explorers (history) and the Ocean Lab (physics)
 * — the same three kinds of lesson as the land, all-new ocean stories.
 * Every lesson has realm: 'sea'; its floor is its island (1–7), and its
 * stars open the sea islands, never the land floors.
 *
 * Islands: 1 Shell Beach 🐚, 2 Coral Cove 🪸, 3 Turtle Lagoon 🐢,
 * 4 Lighthouse Point 🗼, 5 Pearl Reef 🦪, 6 Whale Bay 🐋, 7 Deep Blue Station 🔱.
 *
 * Sea Math uses the land's chalkboard and practice generators for the same
 * floor (math.js), but its check is a fixed set of written sea word problems.
 */

/* ------------------------------------------------------------ Sea Math */

/** A Sea Math lesson: the land generator `gen` draws the board and the practice; the quiz is written. */
const M = (id, floor, title, gen, topicName, blurb, kind, reading, quiz) => ({
  id, subject: 'math', floor, realm: 'sea', title, topic: gen, topicName, blurb, reading,
  board: { gen }, practice: { kind, gen }, quiz
});

const SEA_MATH = [
  // ───────────── Island 1: Shell Beach (about age 6–7) ─────────────
  M('m1-sea-shell-count', 1, "Counting Shells", 'count', 'Counting', "Count the shells on Shell Beach, one by one and in fives.", 'count', [
    { title: "Shells on the sand", emoji: '🐚', text: "Shell Beach is full of shells. Touch each shell once and say one number. The last number you say is how many shells there are." },
    { title: "Count in fives", emoji: '🖐️', text: "Put the shells in groups of 5. Then count 5, 10, 15, 20. That is much faster than counting one by one!" },
    { title: "Move them as you count", emoji: '🦀', text: "Move each shell to one side as you count it. Then you never count a shell twice, and you never miss one." }
  ], [
    { q: "Mia finds these shells: 🐚🐚🐚🐚🐚🐚🐚. How many shells are there?", choices: ["6", "7", "8"], answer: 1, hint: "Touch each shell once as you count.", explain: "1, 2, 3, 4, 5, 6, 7. There are 7 shells." },
    { q: "There are 2 groups of 5 starfish on the sand. How many starfish are there?", choices: ["10", "7", "12"], answer: 0, hint: "Count in fives: 5, then…", explain: "5, 10. Two groups of 5 make 10 starfish." },
    { q: "Count the fish: 🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟. How many fish are there?", choices: ["11", "13", "12"], answer: 2, hint: "Count the first 10, then keep going.", explain: "10, 11, 12. There are 12 fish." },
    { q: "Leo counts the boats: 13, 14, 15. What number comes next?", choices: ["14", "16", "20"], answer: 1, hint: "What number comes just after 15?", explain: "After 15 comes 16." },
    { q: "Ana puts her shells in 4 groups of 5. How many shells does she have?", choices: ["9", "15", "25", "20"], answer: 3, hint: "Count in fives, 4 times.", explain: "5, 10, 15, 20. Four groups of 5 make 20 shells." }
  ]),
  M('m1-sea-rock-pool-adding', 1, "Adding at the Rock Pool", 'add10', 'Adding within 10', "Crabs and fish join the rock pool. How many are there now?", 'numberline', [
    { title: "Put them together", emoji: '➕', text: "Adding means putting groups together. 3 crabs and 2 more crabs make 5 crabs!" },
    { title: "Crab hops", emoji: '🦀', text: "Start at the first number on the number line. Hop forward once for each one you add. Where you land is the answer." },
    { title: "Big number first", emoji: '🔄', text: "4 + 3 is the same as 3 + 4. Start with the bigger number, and you make fewer hops." }
  ], [
    { q: "There are 4 crabs in the rock pool. 3 more crabs come in. How many crabs are there now?", choices: ["6", "7", "8"], answer: 1, hint: "Start at 4 and hop forward 3.", explain: "4 + 3 = 7. There are 7 crabs." },
    { q: "Leo has 5 shells. He finds 5 more. How many shells does he have now?", choices: ["10", "9", "11"], answer: 0, hint: "Start at 5 and hop forward 5.", explain: "5 + 5 = 10. Leo has 10 shells." },
    { q: "2 seagulls sit on a post. 6 more land next to them. How many seagulls are there?", choices: ["9", "7", "8"], answer: 2, hint: "Start with the bigger number, 6, and hop 2.", explain: "6 + 2 = 8, and 2 + 6 = 8 too. There are 8 seagulls." },
    { q: "A boat has 3 people in it. 3 more people get in. How many people are in the boat?", choices: ["5", "7", "3", "6"], answer: 3, hint: "Start at 3 and hop forward 3.", explain: "3 + 3 = 6. There are 6 people in the boat." },
    { q: "1 fish swims in the pool. 8 more fish swim in. How many fish are there?", choices: ["9", "8", "10"], answer: 0, hint: "Start at 8 and hop 1.", explain: "8 + 1 = 9. There are 9 fish." }
  ]),

  // ───────────── Island 2: Coral Cove (about age 7–8) ─────────────
  M('m2-sea-coral-tens', 2, "Tens and Ones in Coral Cove", 'tens-ones', 'Place value', "Bag shells in tens and find what each digit means.", 'place-value', [
    { title: "Bags of ten", emoji: '🛍️', text: "At Coral Cove, divers put shells in bags of 10. 3 full bags and 4 loose shells make 34 shells." },
    { title: "Where a digit sits", emoji: '🏠', text: "In 46, the 4 is in the tens place, so it means 40. The 6 is in the ones place, so it means 6." },
    { title: "Swap and it changes", emoji: '🔁', text: "61 and 16 use the same digits, but they are very different numbers. Where a digit sits matters!" }
  ], [
    { q: "A diver has 5 bags of 10 shells and 3 loose shells. How many shells is that?", choices: ["35", "53", "8"], answer: 1, hint: "5 tens and 3 ones.", explain: "5 tens make 50, and 3 more make 53 shells." },
    { q: "There are 72 fish in the cove. How many tens are in 72?", choices: ["7", "2", "9"], answer: 0, hint: "Look at the tens place: the first digit.", explain: "72 is 7 tens and 2 ones, so there are 7 tens." },
    { q: "A reef has 48 corals. What does the 8 in 48 mean?", choices: ["8 tens", "4 ones", "8 ones"], answer: 2, hint: "The 8 is in the ones place.", explain: "In 48, the 4 means 4 tens (40) and the 8 means 8 ones." },
    { q: "Which number has 6 tens and 0 ones?", choices: ["6", "60", "16", "66"], answer: 1, hint: "6 tens is 6 bags of 10.", explain: "6 tens and 0 ones make 60." },
    { q: "Which is more fish: 92 or 29?", choices: ["92", "29"], answer: 0, hint: "Look at the tens first.", explain: "92 has 9 tens, but 29 has only 2 tens. So 92 is more." }
  ]),
  M('m2-sea-starfish-skip', 2, "Starfish Skip Counting", 'skip-count', 'Counting in 2s, 5s and 10s', "Count crab claws in twos, starfish arms in fives and fish in tens.", 'numberline', [
    { title: "Starfish arms", emoji: '⭐', text: "Most starfish have 5 arms. To count the arms on lots of starfish, count in fives: 5, 10, 15, 20." },
    { title: "Crab claws in twos", emoji: '🦀', text: "Every crab has 2 claws. Count the claws in twos: 2, 4, 6, 8, 10." },
    { title: "Tens are quick", emoji: '🔟', text: "Count fish in nets of 10: 10, 20, 30, 40. When you count in tens, every number ends in 0." }
  ], [
    { q: "Each starfish has 5 arms. How many arms do 3 starfish have?", choices: ["15", "8", "10"], answer: 0, hint: "Count in fives 3 times.", explain: "5, 10, 15. Three starfish have 15 arms." },
    { q: "Count the crab claws in twos: 2, 4, 6, 8. What comes next?", choices: ["9", "12", "10"], answer: 2, hint: "Hop 2 more from 8.", explain: "8 + 2 = 10. The next number is 10." },
    { q: "Each net holds 10 fish. How many fish are in 4 nets?", choices: ["14", "40", "44"], answer: 1, hint: "Count in tens 4 times.", explain: "10, 20, 30, 40. Four nets hold 40 fish." },
    { q: "Count in fives: 20, 25, 30. What comes next?", choices: ["31", "40", "36", "35"], answer: 3, hint: "Hop 5 more from 30.", explain: "30 + 5 = 35. The next number is 35." },
    { q: "6 crabs each have 2 claws. How many claws is that?", choices: ["8", "12", "14"], answer: 1, hint: "Count in twos 6 times.", explain: "2, 4, 6, 8, 10, 12. Six crabs have 12 claws." }
  ]),

  // ───────────── Island 3: Turtle Lagoon (about age 8–9) ─────────────
  M('m3-sea-turtle-eggs', 3, "Turtle Egg Arrays", 'times', 'Times tables', "Rangers keep turtle eggs safe in rows. Multiply to count them.", 'array', [
    { title: "Rows of eggs", emoji: '🥚', text: "At the turtle hatchery, rangers keep eggs safe in rows. 3 rows of 5 eggs make 3 × 5 = 15 eggs. Rows and columns like this are called an array." },
    { title: "Turn it round", emoji: '🔄', text: "Turn the array on its side and you get 5 rows of 3. Still 15! So 3 × 5 = 5 × 3." },
    { title: "Count in steps", emoji: '🐢', text: "To find 4 × 6, count in sixes 4 times: 6, 12, 18, 24." }
  ], [
    { q: "A box at the turtle hatchery has 4 rows of 5 eggs. How many eggs are there?", choices: ["9", "20", "25"], answer: 1, hint: "4 rows of 5 is 4 × 5.", explain: "4 × 5 = 20. There are 20 eggs." },
    { q: "6 baby turtles each have 4 flippers. How many flippers are there in all?", choices: ["24", "10", "20"], answer: 0, hint: "Count in fours 6 times.", explain: "6 × 4 = 24. There are 24 flippers." },
    { q: "A boat has 3 rows of seats with 6 seats in each row. How many seats are there?", choices: ["9", "16", "18"], answer: 2, hint: "3 rows of 6 is 3 × 6.", explain: "3 × 6 = 18. The boat has 18 seats." },
    { q: "Which is the same as 7 × 2?", choices: ["7 + 2", "2 × 7", "7 × 7"], answer: 1, hint: "Turn the array round.", explain: "7 × 2 = 2 × 7 = 14. Swapping the numbers gives the same answer." },
    { q: "There are 5 groups of turtles, with 8 turtles in each group. How many turtles are there?", choices: ["13", "35", "45", "40"], answer: 3, hint: "Count in eights 5 times, or in fives 8 times.", explain: "5 × 8 = 40. There are 40 turtles." }
  ]),
  M('m3-sea-picnic-fractions', 3, "Fractions at the Lagoon Picnic", 'fractions', 'Fractions', "Share pies, rafts and flags fairly into equal parts.", 'pizza', [
    { title: "Equal parts", emoji: '🥧', text: "A fraction is part of a whole. The parts must be equal, so everyone at the picnic gets a fair share of the pie." },
    { title: "Top and bottom", emoji: '🔢', text: "In 2/3, the bottom number (3) says how many equal parts there are. The top number (2) says how many parts we have." },
    { title: "More parts, smaller pieces", emoji: '🔪', text: "A pie cut into 6 has smaller pieces than one cut into 3. So 1/6 is less than 1/3." }
  ], [
    { q: "A pie is cut into 4 equal parts. Tom eats 1 part. What fraction of the pie did he eat?", choices: ["1/3", "1/4", "3/4"], answer: 1, hint: "How many equal parts? How many did he eat?", explain: "There are 4 equal parts and Tom ate 1, so he ate 1/4. The other 3/4 is left." },
    { q: "A raft has 8 equal planks. 3 planks are painted blue. What fraction of the raft is blue?", choices: ["3/8", "5/8", "3/5"], answer: 0, hint: "The bottom number is how many planks in all.", explain: "3 of the 8 equal planks are blue, so 3/8 is blue." },
    { q: "Which piece is bigger: 1/2 of a melon or 1/4 of the same melon?", choices: ["1/4", "1/2", "They are the same"], answer: 1, hint: "Fewer parts means bigger pieces.", explain: "Cut into 2, each piece is bigger than when it is cut into 4. So 1/2 is bigger than 1/4." },
    { q: "A pie has 6 equal slices. 5 slices are eaten. What fraction of the pie is left?", choices: ["5/6", "1/5", "1/6"], answer: 2, hint: "How many slices are left out of 6?", explain: "6 − 5 = 1 slice is left, so 1/6 of the pie is left." },
    { q: "A flag on a boat has 3 equal stripes. 2 stripes are red. What fraction of the flag is red?", choices: ["1/3", "3/2", "2/5", "2/3"], answer: 3, hint: "The bottom number is how many stripes in all.", explain: "2 of the 3 equal stripes are red, so 2/3 of the flag is red." }
  ]),

  // ───────────── Island 4: Lighthouse Point (about age 9–10) ─────────────
  M('m4-sea-lighthouse-steps', 4, "Lighthouse Steps", 'mult-2x1', '2-digit × 1-digit', "Climb the lighthouse and multiply big numbers by splitting them.", 'grid', [
    { title: "Break it up", emoji: '🧩', text: "The lighthouse has 4 flights of stairs with 23 steps each. 23 is 20 and 3, so 23 × 4 is 20 × 4 plus 3 × 4: 80 + 12 = 92 steps." },
    { title: "The grid method", emoji: '🔲', text: "Draw a box for each part of the number. Multiply in each box, then add the boxes together." },
    { title: "Estimate first", emoji: '🎯', text: "34 × 3 should be a bit more than 30 × 3 = 90. If you get 1,002, something went wrong. Check again!" }
  ], [
    { q: "Each flight of stairs in the lighthouse has 21 steps. There are 3 flights. How many steps is that?", choices: ["63", "24", "61"], answer: 0, hint: "21 is 20 and 1. Multiply each part by 3.", explain: "20 × 3 = 60 and 1 × 3 = 3. 60 + 3 = 63 steps." },
    { q: "A fishing boat brings in 4 crates. Each crate holds 15 fish. How many fish is that?", choices: ["19", "45", "60"], answer: 2, hint: "15 is 10 and 5. Multiply each part by 4.", explain: "10 × 4 = 40 and 5 × 4 = 20. 40 + 20 = 60 fish." },
    { q: "The lighthouse lamp flashes 12 times a minute. How many times does it flash in 6 minutes?", choices: ["18", "72", "62"], answer: 1, hint: "12 is 10 and 2. Multiply each part by 6.", explain: "10 × 6 = 60 and 2 × 6 = 12. 60 + 12 = 72 flashes." },
    { q: "A ferry carries 35 people on each trip. It makes 5 trips. How many people does it carry?", choices: ["155", "40", "185", "175"], answer: 3, hint: "35 is 30 and 5. Multiply each part by 5.", explain: "30 × 5 = 150 and 5 × 5 = 25. 150 + 25 = 175 people." },
    { q: "Which is the best estimate for 48 × 2?", choices: ["About 50", "About 100", "About 1,000"], answer: 1, hint: "48 is close to 50.", explain: "48 is close to 50, and 50 × 2 = 100. The exact answer is 96." }
  ]),
  M('m4-sea-sharing-catch', 4, "Sharing the Catch", 'division', 'Division', "Share fish, shells and seats fairly between boats and friends.", 'array', [
    { title: "Fair shares", emoji: '🐟', text: "Dividing means sharing equally. 20 fish shared between 4 boats: each boat gets 5 fish." },
    { title: "Opposite of times", emoji: '↔️', text: "Division undoes multiplication. 4 × 5 = 20, so 20 ÷ 4 = 5 and 20 ÷ 5 = 4." },
    { title: "Use your tables", emoji: '📋', text: "To find 42 ÷ 6, ask: what times 6 makes 42? It is 7." }
  ], [
    { q: "24 shells are shared equally between 3 children. How many shells does each child get?", choices: ["6", "8", "21"], answer: 1, hint: "What times 3 makes 24?", explain: "3 × 8 = 24, so 24 ÷ 3 = 8. Each child gets 8 shells." },
    { q: "A tour boat has 30 seats in rows of 5. How many rows are there?", choices: ["6", "25", "35"], answer: 0, hint: "What times 5 makes 30?", explain: "5 × 6 = 30, so 30 ÷ 5 = 6 rows." },
    { q: "The lighthouse keeper has 36 light bulbs. She puts 4 in each box. How many boxes does she fill?", choices: ["8", "32", "9"], answer: 2, hint: "What times 4 makes 36?", explain: "4 × 9 = 36, so 36 ÷ 4 = 9 boxes." },
    { q: "56 fish swim in 7 equal groups. How many fish are in each group?", choices: ["9", "7", "63", "8"], answer: 3, hint: "What times 7 makes 56?", explain: "7 × 8 = 56, so 56 ÷ 7 = 8 fish in each group." },
    { q: "Which fact helps you find 45 ÷ 9?", choices: ["9 + 5 = 14", "9 × 5 = 45", "45 − 9 = 36"], answer: 1, hint: "Division undoes multiplication.", explain: "9 × 5 = 45, so 45 ÷ 9 = 5." }
  ]),

  // ───────────── Island 5: Pearl Reef (about age 10–11) ─────────────
  M('m5-sea-pearl-decimals', 5, "Pearl Decimals", 'decimals', 'Decimals', "Measure pearls and tides in tenths.", 'numberline', [
    { title: "Smaller than one", emoji: '🔍', text: "Between 0 and 1 there are ten tenths: 0.1, 0.2, 0.3 … up to 1.0. Small things like pearls are easy to measure in tenths of a centimetre. A pearl might be 0.7 cm wide." },
    { title: "Same as fractions", emoji: '🦪', text: "0.4 means 4 tenths, just like 4/10. The dot is called the decimal point." },
    { title: "Adding tenths", emoji: '➕', text: "0.5 + 0.3 is 5 tenths + 3 tenths = 8 tenths = 0.8. And 0.6 + 0.6 = 12 tenths, which is 1.2." }
  ], [
    { q: "A pearl is 0.6 cm wide. Another pearl is 0.3 cm wider. How wide is the second pearl?", choices: ["0.9 cm", "0.3 cm", "9 cm"], answer: 0, hint: "6 tenths + 3 tenths.", explain: "0.6 + 0.3 = 0.9. The second pearl is 0.9 cm wide." },
    { q: "Which pearl is bigger: one 0.8 cm wide or one 0.5 cm wide?", choices: ["0.8 cm", "0.5 cm"], answer: 0, hint: "Compare the tenths: 8 or 5?", explain: "8 tenths is more than 5 tenths, so the 0.8 cm pearl is bigger." },
    { q: "The tide rises 0.4 m in the morning and 0.7 m more by noon. How much has it risen in all?", choices: ["0.11 m", "1.0 m", "1.1 m", "11 m"], answer: 2, hint: "4 tenths + 7 tenths = 11 tenths.", explain: "0.4 + 0.7 = 11 tenths = 1.1 m." },
    { q: "Which decimal is the same as 3/10?", choices: ["3.10", "0.3", "0.03"], answer: 1, hint: "3/10 is 3 tenths.", explain: "3 tenths is written 0.3." },
    { q: "A string for a pearl necklace is 1.0 m long. 0.2 m is cut off. How much is left?", choices: ["0.2 m", "1.2 m", "0.8 m"], answer: 2, hint: "1.0 is 10 tenths. Take away 2 tenths.", explain: "10 tenths − 2 tenths = 8 tenths, so 0.8 m is left." }
  ]),
  M('m5-sea-reef-area', 5, "Reef Garden Area", 'area', 'Area and perimeter', "Fence the swimming area and fill the coral garden.", 'grid', [
    { title: "Perimeter", emoji: '🚶', text: "Perimeter is the distance all the way round a shape. To put a rope round a rectangle, add up all four sides." },
    { title: "Area", emoji: '🟩', text: "Area is how much flat space a shape covers. We count it in squares, like square metres (m²)." },
    { title: "A shortcut", emoji: '✖️', text: "For a rectangle, area = length × width. A coral garden 6 m long and 4 m wide covers 24 m². Its perimeter is 6 + 4 + 6 + 4 = 20 m." }
  ], [
    { q: "A coral garden is a rectangle 5 m long and 3 m wide. What is its area?", choices: ["8 m²", "15 m²", "16 m²"], answer: 1, hint: "Area = length × width.", explain: "5 × 3 = 15, so the area is 15 m²." },
    { q: "A rope goes all the way round a swimming area 8 m long and 2 m wide. How long is the rope?", choices: ["20 m", "16 m", "10 m"], answer: 0, hint: "Add all four sides.", explain: "8 + 2 + 8 + 2 = 20, so the rope is 20 m long." },
    { q: "A square raft has sides of 4 m. What is its area?", choices: ["8 m²", "12 m²", "16 m²"], answer: 2, hint: "A square's length and width are the same.", explain: "4 × 4 = 16, so the area is 16 m²." },
    { q: "A map of the reef is a grid of squares, 7 squares wide and 6 squares tall. How many squares are there?", choices: ["13", "26", "48", "42"], answer: 3, hint: "Rows × columns.", explain: "7 × 6 = 42 squares." },
    { q: "A beach towel is 2 m long and 1 m wide. What is its perimeter?", choices: ["2 m", "6 m", "3 m"], answer: 1, hint: "Add all four sides.", explain: "2 + 1 + 2 + 1 = 6, so the perimeter is 6 m." }
  ]),

  // ───────────── Island 6: Whale Bay (about age 11–12) ─────────────
  M('m6-sea-dive-depths', 6, "Below Sea Level", 'negatives', 'Negative numbers', "Dive below zero: depths under the sea are negative numbers.", 'numberline', [
    { title: "Sea level is zero", emoji: '🌊', text: "We measure heights and depths from sea level, which is 0 m. A diver 10 m under the water is at −10 m." },
    { title: "A number line standing up", emoji: '↕️', text: "Stand the number line up like a tall pole in the sea. Above 0 are positive numbers; below 0 are negative ones. −20 m is deeper than −5 m." },
    { title: "Moving up and down", emoji: '🤿', text: "A diver at −12 m swims up 5 m. Count up from −12: −11, −10, −9, −8, −7. She is now at −7 m." }
  ], [
    { q: "A diver is at −8 m. She swims down 4 m more. Where is she now?", choices: ["−4 m", "−12 m", "12 m"], answer: 1, hint: "Going down makes the number more negative.", explain: "−8 − 4 = −12. She is at −12 m." },
    { q: "A seal is at −15 m. It swims up 15 m. Where is it now?", choices: ["0 m", "−30 m", "15 m"], answer: 0, hint: "Count up 15 from −15.", explain: "−15 + 15 = 0. The seal is at sea level, 0 m." },
    { q: "Which is deeper: −30 m or −18 m?", choices: ["−18 m", "They are the same depth", "−30 m"], answer: 2, hint: "The further below 0, the deeper.", explain: "−30 is further below 0 than −18, so −30 m is deeper." },
    { q: "A seabird flies 6 m above the sea. A fish swims at −4 m. How far apart are they, up and down?", choices: ["2 m", "−2 m", "24 m", "10 m"], answer: 3, hint: "From −4 up to 0, then from 0 up to 6.", explain: "4 m from the fish up to sea level, plus 6 m up to the bird: 4 + 6 = 10 m." },
    { q: "On a whale-watching trip far to the north, it is −3 °C. It warms up by 7 degrees. What is the temperature now?", choices: ["−10 °C", "4 °C", "10 °C"], answer: 1, hint: "Count up 7 from −3.", explain: "−3 + 7 = 4. Count up: −2, −1, 0, 1, 2, 3, 4. It is now 4 °C." }
  ]),
  M('m6-sea-whale-percent', 6, "Whale Bay Percentages", 'percent', 'Percentages', "Seats, tickets and corals: find percentages around Whale Bay.", 'grid', [
    { title: "Out of a hundred", emoji: '💯', text: "Per cent means out of 100. If 40 of 100 boats in the bay are sailboats, then 40% of the boats are sailboats." },
    { title: "Handy ones to know", emoji: '🧠', text: "50% is a half, 25% is a quarter, 75% is three quarters and 10% is a tenth." },
    { title: "Finding a percentage", emoji: '🐋', text: "To find 20% of 60 whales: 10% of 60 is 6, so 20% is 2 × 6 = 12 whales." }
  ], [
    { q: "A whale-watching boat has 80 seats. 50% of the seats are taken. How many seats are taken?", choices: ["30", "40", "50"], answer: 1, hint: "50% is a half.", explain: "Half of 80 is 40, so 40 seats are taken." },
    { q: "Out of 100 fish in a tank, 35 are blue. What percentage of the fish are blue?", choices: ["35%", "65%", "3.5%"], answer: 0, hint: "Per cent means out of 100.", explain: "35 out of 100 is 35%." },
    { q: "A boat trip costs 40 coins. Children pay 25% less. How many coins do children save?", choices: ["4", "25", "10"], answer: 2, hint: "25% is a quarter.", explain: "A quarter of 40 is 10, so children save 10 coins and pay 30." },
    { q: "In 1 hour (60 minutes), a whale is at the surface 10% of the time. How many minutes is that?", choices: ["10", "16", "60", "6"], answer: 3, hint: "10% is a tenth.", explain: "A tenth of 60 is 6, so the whale is at the surface for 6 minutes." },
    { q: "A reef has 200 corals. 75% of them are healthy. How many corals are healthy?", choices: ["75", "150", "125"], answer: 1, hint: "75% is three quarters. Find a quarter first.", explain: "A quarter of 200 is 50, so three quarters is 3 × 50 = 150 corals." }
  ]),

  // ───────────── Island 7: Deep Blue Station (about age 12–13) ─────────────
  M('m7-sea-station-equations', 7, "Station Supply Equations", 'two-step', 'Two-step equations', "Solve the research station's supply puzzles by undoing two steps.", 'balance', [
    { title: "Wrapping and unwrapping", emoji: '🎁', text: "In 4x + 3 = 23, x was multiplied by 4, then 3 was added. To solve it, unwrap in reverse: undo the +3 first, then the ×4." },
    { title: "Inverse operations", emoji: '↩️', text: "Subtraction undoes addition; division undoes multiplication. Whatever you do to one side, do to the other, so the balance holds: 4x = 20, so x = 5." },
    { title: "Always check", emoji: '✔️', text: "Put your answer back in: 4 × 5 + 3 = 23. Both sides match, so x = 5 is right." }
  ], [
    { q: "The station orders x boxes of 6 water bottles, plus 4 single bottles: 6x + 4 = 40. What is x?", choices: ["7", "6", "8"], answer: 1, hint: "Undo the +4 first, then the ×6.", explain: "6x = 40 − 4 = 36, so x = 36 ÷ 6 = 6. Check: 6 × 6 + 4 = 40." },
    { q: "A robot sub dives for x minutes: 5x + 15 = 65. What is x?", choices: ["10", "16", "13"], answer: 0, hint: "Subtract 15 from both sides, then divide by 5.", explain: "5x = 65 − 15 = 50, so x = 50 ÷ 5 = 10. Check: 5 × 10 + 15 = 65." },
    { q: "In the station's log, 2x − 7 = 11. What is x?", choices: ["2", "10", "9"], answer: 2, hint: "Undo the −7 by adding 7 to both sides.", explain: "2x = 11 + 7 = 18, so x = 18 ÷ 2 = 9. Check: 2 × 9 − 7 = 11." },
    { q: "An empty cart weighs 12 kg. Each crate of samples weighs 8 kg. With x crates on it, the cart weighs 60 kg in all. How many crates are there?", choices: ["9", "6", "8", "7.5"], answer: 1, hint: "Write 8x + 12 = 60, then solve it.", explain: "8x = 60 − 12 = 48, so x = 48 ÷ 8 = 6 crates. Check: 8 × 6 + 12 = 60." },
    { q: "To unwrap 7x + 5 = 47 in reverse order, what is the first step?", choices: ["Divide both sides by 7", "Add 5 to both sides", "Multiply both sides by 7", "Subtract 5 from both sides"], answer: 3, hint: "The +5 was the last thing done to x.", explain: "Undo the last step first: subtract 5 to get 7x = 42, then divide by 7 to get x = 6." }
  ]),
  M('m7-sea-square-tanks', 7, "Square Tanks and Roots", 'squares', 'Squares and roots', "Square windows, square decks and the roots that undo them.", 'grid', [
    { title: "Square numbers", emoji: '🟦', text: "6² (\"6 squared\") means 6 × 6 = 36. A square window made of 36 glass tiles has 6 tiles along each side." },
    { title: "Square roots", emoji: '🌱', text: "The square root goes backwards: √49 asks which number times itself makes 49. The answer is 7." },
    { title: "Squares and areas", emoji: '🔱', text: "A square deck with sides of 9 m has an area of 9² = 81 m². If you know the area of a square, its side is the square root of the area." }
  ], [
    { q: "A square viewing window has 8 rows of 8 glass tiles. How many tiles is that?", choices: ["16", "64", "56"], answer: 1, hint: "8 rows of 8 is 8².", explain: "8² = 8 × 8 = 64 tiles." },
    { q: "A square landing pad has an area of 121 m². How long is each side?", choices: ["11 m", "12 m", "60.5 m"], answer: 0, hint: "Which number times itself makes 121?", explain: "11 × 11 = 121, so √121 = 11 and each side is 11 m." },
    { q: "What is 12²?", choices: ["24", "122", "144"], answer: 2, hint: "12² means 12 × 12, not 12 × 2.", explain: "12 × 12 = 144." },
    { q: "The square floor of a fish tank covers 49 m². What is its perimeter?", choices: ["7 m", "28 m", "49 m", "14 m"], answer: 1, hint: "Find the side first, then add all four sides.", explain: "√49 = 7, so each side is 7 m. The perimeter is 4 × 7 = 28 m." },
    { q: "Which of these is NOT a square number?", choices: ["25", "36", "50", "81"], answer: 2, hint: "Look for a number that is not something times itself.", explain: "25 = 5², 36 = 6² and 81 = 9², but 7² = 49 and 8² = 64, so 50 is not a square number." }
  ])
];

/* ------------------------------------------------------------ Sea Explorers (history) */

const SEA_HISTORY = [
  // ───────────── Island 1: Shell Beach (about age 6–7) ─────────────
  {
    id: 'h1-sea-fishing-village',
    subject: 'history',
    floor: 1,
    realm: 'sea',
    title: "A Fishing Village Long Ago",
    topic: 'fishing-village',
    topicName: 'Fishing Villages Long Ago',
    blurb: "Mend nets, dry fish and read the sky with a fisher from long ago.",
    reading: [
      { title: "Homes by the sea", emoji: '🏘️', text: "Long ago, many families lived in small villages by the sea. The sea gave them food, and boats took them out to work." },
      { title: "Nets and hooks", emoji: '🎣', text: "Fishers caught fish with nets and hooks. A very long time ago, people even made fish hooks from shells!" },
      { title: "Keeping fish for later", emoji: '🧂', text: "There were no fridges. People dried fish in the sun, smoked it over a fire, or packed it in salt so it would keep." },
      { title: "Everyone helped", emoji: '🤝', text: "Children helped too. They mended nets, collected shellfish and carried baskets of fish up the beach." }
    ],
    dialogue: {
      npc: { name: "Nell", role: "a fisher in a seaside village long ago", look: 'sailor', portrayal: 'generic' },
      intro: "Ahoy there! I'm Nell. I have fished from this beach all my life. Help me mend this net while we talk!",
      topics: [
        { ask: "How do you catch fish?", answer: "With nets and hooks. We row out in the morning, throw our nets, and pull them back full of fish, we hope! Some days the sea gives us lots, and some days only a few." },
        { ask: "Why do you mend the nets?", answer: "Nets get holes from rocks and big, wriggly fish. If we did not mend them, the fish would swim right out! I tie the holes shut with string." },
        { ask: "How do you keep fish without a fridge?", answer: "We hang fish in the sun and wind to dry. We smoke some over a fire, and we pack some in salt. Then it keeps for weeks." },
        { ask: "How do you know if the weather is safe?", answer: "We watch the sky and the sea. Big dark clouds and strong wind mean we stay at home. Then we mend nets instead!" },
        { ask: "What do children do here?", answer: "They help! They dig for clams, mend nets and lay fish out to dry. And when the work is done, they play on the beach." }
      ],
      challenge: {
        q: "Long ago, how did people keep fish from going bad?",
        choices: ["They put it in a fridge", "They dried it, smoked it or salted it", "They kept it in a box of sand"],
        answer: 1,
        explain: "There were no fridges, so people dried fish in the sun, smoked it over a fire or packed it in salt."
      },
      farewell: "Thank you for helping with my net! Come back when the tide is in."
    },
    timeline: {
      title: "Fishing through time",
      events: [
        { label: "People make fish hooks from sea snail shells", year: -21000, when: "about 23,000 years ago" },
        { label: "The oldest fishing net we know of is made, from tree bark", year: -8300, when: "about 10,000 years ago" },
        { label: "Egyptians paint pictures of people fishing with nets", year: -2500, when: "about 4,500 years ago" },
        { label: "Fishing boats start to get steam engines", year: 1880, when: "about 1880" }
      ]
    },
    artifact: {
      model: 'anchor',
      name: "An anchor",
      text: "The very first anchors were just heavy stones tied to a rope. Fishers dropped them over the side so their boat would not drift away. Later, anchors were made of metal, with hooks that dig into the sea floor."
    },
    quiz: [
      { q: "What did fishers use to catch fish long ago?", choices: ["Nets and hooks", "Magnets", "Big spoons"], answer: 0, hint: "One is like a big bag made of string.", explain: "Fishers used nets and hooks to catch fish." },
      { q: "Why did fishers mend their nets?", choices: ["To make them prettier", "So fish could not swim out through holes", "To make them heavier"], answer: 1, hint: "What happens if a net has a big hole?", explain: "A net with holes lets the fish escape, so fishers tied the holes shut." },
      { q: "What did people long, long ago make fish hooks from?", choices: ["Plastic", "Glass", "Shells"], answer: 2, hint: "You can find them on Shell Beach!", explain: "The oldest fish hooks we know of were made from sea snail shells, about 23,000 years ago." },
      { q: "What weather told fishers to stay at home?", choices: ["Big dark clouds and strong wind", "A sunny day with no wind", "Calm, flat water"], answer: 0, hint: "Think of a stormy day.", explain: "Dark clouds and strong wind can mean a storm is coming, so it is not safe to go out in a boat." },
      { q: "How did children help in a fishing village?", choices: ["They drove the boats' engines", "They mended nets and collected shellfish", "They worked in an office"], answer: 1, hint: "The work was on the beach.", explain: "Children mended nets, dug for clams and laid fish out to dry." }
    ]
  },

  {
    id: 'h1-sea-rafts-to-ships',
    subject: 'history',
    floor: 1,
    realm: 'sea',
    title: "From Rafts to Ships",
    topic: 'boats',
    topicName: 'Boats Through Time',
    blurb: "Float on a log, paddle a canoe and sail a big ship.",
    reading: [
      { title: "Floating logs", emoji: '🪵', text: "The very first boats were simple. People held on to floating logs, or tied logs together to make a raft." },
      { title: "Canoes", emoji: '🛶', text: "Next, people dug out the middle of a big log to make a canoe. They pushed it along with paddles." },
      { title: "Sails", emoji: '⛵', text: "A sail catches the wind, so the wind pushes the boat along. Sailors did not have to paddle all day!" },
      { title: "Engines", emoji: '🚢', text: "About 200 years ago, boats got engines. Now giant ships carry food, toys and cars all around the world." }
    ],
    dialogue: {
      npc: { name: "Rosa", role: "a guide at a boat museum", look: 'guide', portrayal: 'generic' },
      intro: "Welcome to the boat museum! I'm Rosa. Every boat in here once floated on the water. Which one shall we talk about?",
      topics: [
        { ask: "What was the very first boat?", answer: "Nobody knows for sure! People probably floated on logs or tied logs into rafts. The oldest boat ever found is a canoe dug out of a tree trunk. It is about 10,000 years old!" },
        { ask: "How do you make a canoe?", answer: "Take a big log and hollow out the middle. Long ago, people used stone tools and fire to do it. It took a very long time!" },
        { ask: "How does a sail work?", answer: "A sail is a big sheet of cloth. The wind pushes on it, and the push moves the boat. Clever sailors can turn the sail to go where they want." },
        { ask: "Why don't big ships sink?", answer: "A ship's shape is like a big bowl full of air. That shape helps it float, even when it is made of metal! You can test floating in the Ocean Lab." },
        { ask: "What do big ships carry today?", answer: "Huge ships carry big metal boxes called containers. They are full of food, clothes, toys and much more, going all around the world." }
      ],
      challenge: {
        q: "What does a sail use to push a boat along?",
        choices: ["The wind", "The fish", "The sand"],
        answer: 0,
        explain: "The wind pushes on the sail, and the sail moves the boat along. No paddling needed!"
      },
      farewell: "Thanks for visiting! Next time you see a boat, think of the very first log that floated."
    },
    timeline: {
      title: "Boats through time",
      events: [
        { label: "The oldest boat ever found, a dug-out canoe, is made", year: -8000, when: "about 10,000 years ago" },
        { label: "Egyptians sail boats with cloth sails on the River Nile", year: -3000, when: "about 5,000 years ago" },
        { label: "Big wooden sailing ships cross the oceans", year: 1500, when: "about 1500" },
        { label: "A steamboat called the Clermont starts carrying passengers in America", year: 1807, when: "1807" },
        { label: "Container ships start carrying big boxes of goods", year: 1956, when: "1956" }
      ]
    },
    artifact: {
      model: 'ship-wheel',
      name: "A ship's wheel",
      text: "Big sailing ships were steered with a wooden wheel. Turning the wheel moved the rudder at the back of the ship, and the rudder turned the ship."
    },
    quiz: [
      { q: "What were the very first boats like?", choices: ["Floating logs and rafts", "Giant metal ships", "Speedboats"], answer: 0, hint: "They were made from trees.", explain: "The first boats were simple floating logs and rafts made of logs tied together." },
      { q: "How did people make a dug-out canoe?", choices: ["They folded paper", "They hollowed out a big log", "They melted metal"], answer: 1, hint: "The name tells you: it was dug out.", explain: "People hollowed out the middle of a big log to make a canoe." },
      { q: "What pushes a sailboat along?", choices: ["A big engine", "Paddles under the water", "The wind in its sail"], answer: 2, hint: "You cannot see it, but you can feel it on a windy day.", explain: "The wind pushes on the sail and moves the boat." },
      { q: "What helps a big metal ship float?", choices: ["Its shape, like a bowl full of air", "Its bright paint", "Its flag"], answer: 0, hint: "Think of a bowl floating in the bath.", explain: "A ship is shaped like a big bowl full of air, and that shape helps it float." },
      { q: "What do huge container ships carry?", choices: ["Only fish", "Boxes of food, clothes, toys and more", "Only people"], answer: 1, hint: "Think of all the things in the shops.", explain: "Container ships carry big boxes full of all kinds of goods around the world." }
    ]
  },

  // ───────────── Island 2: Coral Cove (about age 7–8) ─────────────
  {
    id: 'h2-sea-lighthouse-alexandria',
    subject: 'history',
    floor: 2,
    realm: 'sea',
    title: "The Lighthouse of Alexandria",
    topic: 'lighthouse-alexandria',
    topicName: 'The Lighthouse of Alexandria',
    blurb: "Climb one of the Seven Wonders and keep its great fire burning.",
    reading: [
      { title: "A wonder of the world", emoji: '🗼', text: "About 2,300 years ago, a giant lighthouse was built at Alexandria, a busy port city in Egypt. It was one of the Seven Wonders of the Ancient World." },
      { title: "Very, very tall", emoji: '📏', text: "It was probably more than 100 metres tall. For hundreds of years, it was one of the tallest buildings people had ever made." },
      { title: "A fire on top", emoji: '🔥', text: "At night, a big fire burned at the top. Sailors far out at sea saw the light and steered safely into the harbour." },
      { title: "What happened to it?", emoji: '🌊', text: "Over many years, earthquakes shook it until it fell down. Divers have found some of its huge stones under the sea." }
    ],
    dialogue: {
      npc: { name: "Theon", role: "a lighthouse keeper in Alexandria, long ago", look: 'keeper', portrayal: 'generic' },
      intro: "Welcome to the Pharos, the great lighthouse! I'm Theon, one of its keepers. Mind the steps. There are a lot of them!",
      topics: [
        { ask: "Why do sailors need a lighthouse?", answer: "The coast here is flat, and there are rocks hiding under the water. At night, sailors cannot see the land. Our light shows them where the harbour is, so they can steer in safely." },
        { ask: "How do you keep the fire going?", answer: "We carry fuel up to the top and keep the fire burning all night long. It is hard work, so there are lots of us to help!" },
        { ask: "Is there a mirror at the top?", answer: "Old stories say a big metal mirror at the top sent the light far out to sea. Nobody today knows for sure if that is true!" },
        { ask: "Why is it called the Pharos?", answer: "It stands on a little island called Pharos. The lighthouse was so famous that in many languages the word for lighthouse still sounds like Pharos, like 'faro' in Spanish and Italian." },
        { ask: "Who built it?", answer: "The Greek kings who ruled Egypt, called the Ptolemies, ordered it. Many old writers say an architect named Sostratus designed it, and many workers built it." }
      ],
      challenge: {
        q: "What did the Lighthouse of Alexandria do for sailors at night?",
        choices: ["It played music for them", "Its fire showed them where the harbour was", "It pulled their boats in with ropes"],
        answer: 1,
        explain: "The big fire at the top could be seen far out at sea, so sailors knew where to steer."
      },
      farewell: "Safe travels! If you ever sail at night, look for a light on the shore."
    },
    timeline: {
      title: "The story of the Pharos",
      events: [
        { label: "The city of Alexandria is founded in Egypt", year: -331, when: "about 331 BCE" },
        { label: "The great lighthouse is finished", year: -280, when: "about 280 BCE" },
        { label: "A big earthquake badly damages the lighthouse", year: 1303, when: "1303" },
        { label: "A fort is built on the same spot, using its old stones", year: 1480, when: "about 1480" },
        { label: "Divers find huge stones from the lighthouse under the sea", year: 1994, when: "1994" }
      ]
    },
    artifact: {
      model: 'amphora',
      name: "A storage jar from the harbour",
      text: "Ships sailed in and out of Alexandria carrying jars like this, full of olive oil and wine. Ships also took Egypt's grain to faraway lands. The lighthouse helped them all find the way."
    },
    quiz: [
      { q: "Where was the great lighthouse built?", choices: ["In Alexandria, Egypt", "In Rome, Italy", "In London, England"], answer: 0, hint: "It was a port city in Egypt.", explain: "The lighthouse stood at Alexandria, a busy port city in Egypt." },
      { q: "Why was a fire lit at the top at night?", choices: ["To cook dinner", "So sailors could see where the harbour was", "To keep birds away"], answer: 1, hint: "Who needed to see it from far away?", explain: "The fire's light showed sailors the way into the harbour in the dark." },
      { q: "The lighthouse was one of the Seven Wonders of which world?", choices: ["The Modern World", "The Ocean World", "The Ancient World"], answer: 2, hint: "It was built about 2,300 years ago.", explain: "It was one of the Seven Wonders of the Ancient World." },
      { q: "What knocked the lighthouse down in the end?", choices: ["Strong winds", "Earthquakes", "A giant crab"], answer: 1, hint: "The ground shook.", explain: "Earthquakes shook the lighthouse over many years until it fell." },
      { q: "In Spanish and Italian, a lighthouse is called a 'faro'. Where does that word come from?", choices: ["From Pharos, the island where the lighthouse stood", "From a word for fish", "From the name of a king"], answer: 0, hint: "What was the great lighthouse called?", explain: "The great lighthouse stood on the island of Pharos, and its name became a word for lighthouse." }
    ]
  },

  {
    id: 'h2-sea-shell-money',
    subject: 'history',
    floor: 2,
    realm: 'sea',
    title: "When Shells Were Money",
    topic: 'shell-money',
    topicName: 'Shell Money',
    blurb: "Go shopping with seashells at a busy market long ago.",
    reading: [
      { title: "Before coins", emoji: '🐚', text: "Long before paper money, people in many places used small, shiny shells called cowries to buy and sell things." },
      { title: "Why cowries?", emoji: '✨', text: "Cowries are small, strong and hard to fake. They are easy to count, and they last a very long time." },
      { title: "All around the world", emoji: '🌍', text: "Cowrie shells came from warm seas, like the waters around the Maldives islands. Traders carried them to China, India and Africa." },
      { title: "Shells into coins", emoji: '🪙', text: "In ancient China, people even made metal coins shaped like cowrie shells. Some Chinese written words about money still have a little shell sign inside them!" }
    ],
    dialogue: {
      npc: { name: "Kadi", role: "a market trader in the Mali Empire, 1300s", look: 'mali', portrayal: 'generic' },
      intro: "Welcome to the market! I'm Kadi. I sell cloth and salt. Do you have any cowries? Let me show you how we shop.",
      topics: [
        { ask: "What is a cowrie?", answer: "It is the shell of a small sea snail. It is smooth and shiny and fits in your hand. Here, far from the sea, cowries are special, so we use them as money!" },
        { ask: "Where do the cowries come from?", answer: "From far away! They are gathered in warm seas, like the waters around the Maldives islands. Traders bring them on long journeys by ship and by camel." },
        { ask: "How do you pay with cowries?", answer: "Small things cost a few cowries, and bigger things cost many. Some traders keep them on long strings, so they are quicker to count." },
        { ask: "Why not use gold?", answer: "We do use gold for big things! But gold is too valuable for small things, like a bowl of grain. Cowries are just right for small shopping." },
        { ask: "Do people still use cowries?", answer: "Not for shopping, but people still love them. They are sewn onto clothes and used in jewellery and games." }
      ],
      challenge: {
        q: "Why were cowrie shells good to use as money?",
        choices: ["They were small, strong and easy to count", "They were very big and heavy", "They grew on trees"],
        answer: 0,
        explain: "Cowries were small, strong, hard to fake and easy to count, so they made good money."
      },
      farewell: "Thanks for visiting my stall! Spend your cowries wisely."
    },
    timeline: {
      title: "Shell money through time",
      events: [
        { label: "Cowrie shells are used as money in China", year: -1200, when: "about 1200 BCE" },
        { label: "People in China make small bronze coins shaped like cowries", year: -400, when: "about 400 BCE" },
        { label: "The traveller Ibn Battuta sees cowries used as money in Mali", year: 1352, when: "1352" },
        { label: "Cowries are still used as money in parts of West Africa", year: 1850, when: "about 1850" }
      ]
    },
    artifact: {
      model: 'coin',
      name: "A bronze 'cowrie' coin",
      text: "In ancient China, people made small bronze coins shaped like cowrie shells. Today some people call them 'ant-nose money' because of the funny marks on them."
    },
    quiz: [
      { q: "What is a cowrie?", choices: ["A kind of gold coin", "The shell of a small sea snail", "A type of fish"], answer: 1, hint: "You might find one on Shell Beach.", explain: "A cowrie is the shiny shell of a small sea snail." },
      { q: "Where did cowrie shells come from?", choices: ["Warm seas, like around the Maldives", "Snowy mountains", "Deep caves"], answer: 0, hint: "Sea snails live in the sea.", explain: "Cowries were gathered in warm seas, like the waters around the Maldives islands." },
      { q: "In ancient China, what did people make in the shape of cowrie shells?", choices: ["Hats", "Boats", "Bronze coins"], answer: 2, hint: "It is a kind of money too.", explain: "People in China made small bronze coins shaped like cowrie shells." },
      { q: "In Kadi's market, what were cowries used for?", choices: ["Building houses", "Small, everyday shopping", "Feeding camels"], answer: 1, hint: "Gold was for big things.", explain: "Cowries were used for small, everyday shopping. Gold was kept for big things." },
      { q: "How did cowries get to faraway places?", choices: ["They swam there", "The wind blew them", "Traders carried them by ship and camel"], answer: 2, hint: "People took them on long journeys.", explain: "Traders carried cowries on long journeys by ship and by camel." }
    ]
  },

  // ───────────── Island 3: Turtle Lagoon (about age 8–9) ─────────────
  {
    id: 'h3-sea-pacific-wayfinders',
    subject: 'history',
    floor: 3,
    realm: 'sea',
    title: "Wayfinders of the Pacific",
    topic: 'wayfinding',
    topicName: 'Polynesian Wayfinding',
    blurb: "Steer a voyaging canoe by stars, waves and birds, with no map at all.",
    reading: [
      { title: "The biggest ocean", emoji: '🌊', text: "The Pacific is the biggest ocean on Earth. Its islands are tiny dots, far apart. Long ago, Polynesian sailors found and settled almost all of them." },
      { title: "Double canoes", emoji: '🛶', text: "They sailed in double-hulled canoes: two canoes joined by a deck, with sails woven from leaves. There was room for families, food, plants and animals." },
      { title: "Reading nature", emoji: '⭐', text: "Wayfinders used no compass and no map. They learned where stars rise and set, felt the shape of the waves, and watched birds, clouds and the colour of the water." },
      { title: "Still sailing today", emoji: '🌺', text: "In 1976, a canoe called Hōkūleʻa sailed from Hawaiʻi to Tahiti using only these old skills. It showed the world how clever the wayfinders were." }
    ],
    dialogue: {
      npc: { name: "Kaimana", role: "a wayfinder on a voyaging canoe", look: 'wayfinder', portrayal: 'generic' },
      intro: "Aloha! I'm Kaimana, a wayfinder. Our canoe leaves at sunset, when the first stars come out. Sit with me on the deck.",
      topics: [
        { ask: "How do you find your way without a map?", answer: "I keep the map in my head! I know where many stars rise and set on the horizon. If I steer towards the right star, I keep going the right way." },
        { ask: "What do you do in the daytime?", answer: "I watch the sun, and I feel the swells: the long waves that roll across the ocean. I can feel them through the canoe, even with my eyes closed!" },
        { ask: "How do you know an island is near?", answer: "Some seabirds fly out to sea in the morning to fish, then fly back to land in the evening. If I follow them at dusk, they lead me to land. Clouds also pile up over islands." },
        { ask: "What do you bring on the canoe?", answer: "Food, water, and plants and animals for a new home: coconuts, taro, breadfruit, pigs, chickens and dogs. We might stay on the island we find!" },
        { ask: "How far have your people sailed?", answer: "All the way across the Pacific: to Hawaiʻi in the north, Aotearoa (New Zealand) in the south and Rapa Nui (Easter Island) in the east. That is a huge triangle of ocean!" }
      ],
      challenge: {
        q: "How did wayfinders know which way to go at night?",
        choices: ["They used a magnetic compass", "They followed where certain stars rose and set", "They used a radio"],
        answer: 1,
        explain: "Wayfinders learned where many stars rise and set on the horizon, and steered by them."
      },
      farewell: "The stars are out. Time to sail! Remember: to a wayfinder, the ocean is a road, not a wall."
    },
    timeline: {
      title: "Voyages across the Pacific",
      events: [
        { label: "Sailors begin to settle the islands of Tonga and Samoa", year: -800, when: "about 800 BCE" },
        { label: "Wayfinders reach Hawaiʻi", year: 1000, when: "about 1000" },
        { label: "Wayfinders reach Rapa Nui (Easter Island)", year: 1200, when: "about 1200" },
        { label: "Wayfinders reach Aotearoa (New Zealand)", year: 1250, when: "about 1250" },
        { label: "The canoe Hōkūleʻa sails from Hawaiʻi to Tahiti with no instruments", year: 1976, when: "1976" },
        { label: "Hōkūleʻa finishes a voyage around the world", year: 2017, when: "2017" }
      ]
    },
    artifact: {
      model: 'conch',
      name: "A conch shell trumpet",
      text: "Pacific Islanders blew into big conch shells to make a loud, deep sound. It could call people together or mark the start of something important, like a canoe setting out to sea."
    },
    quiz: [
      { q: "What kind of boat did Polynesian wayfinders sail?", choices: ["A steamship", "A double-hulled canoe", "A submarine"], answer: 1, hint: "Two canoes joined together.", explain: "They sailed double-hulled canoes: two canoes joined by a deck." },
      { q: "Which of these did wayfinders use to find their way?", choices: ["Stars, waves and birds", "A phone map", "A compass"], answer: 0, hint: "They used only nature.", explain: "Wayfinders read the stars, the swells, the birds and the clouds." },
      { q: "Why might a wayfinder follow seabirds in the evening?", choices: ["The birds want to race", "The birds are looking for the Moon", "The birds are flying home to land"], answer: 2, hint: "Where do the birds sleep?", explain: "Some seabirds fly back to land in the evening, so they can lead a canoe to an island." },
      { q: "What did the voyage of Hōkūleʻa in 1976 show?", choices: ["That canoes cannot cross oceans", "That the old wayfinding skills really work", "That Hawaiʻi is the biggest island"], answer: 1, hint: "It sailed with no instruments.", explain: "Hōkūleʻa sailed from Hawaiʻi to Tahiti using only the old skills, showing they really work." },
      { q: "What are the long waves that roll across the open ocean called?", choices: ["Swells", "Puddles", "Bubbles"], answer: 0, hint: "Kaimana feels them through the canoe.", explain: "Swells are long waves that roll across the ocean. Wayfinders feel them to keep their direction." }
    ]
  },

  {
    id: 'h3-sea-phoenician-traders',
    subject: 'history',
    floor: 3,
    realm: 'sea',
    title: "The Phoenician Sea Traders",
    topic: 'phoenicians',
    topicName: 'The Phoenicians',
    blurb: "Sail the Mediterranean with traders of purple cloth, cedar wood and a brand-new alphabet.",
    reading: [
      { title: "Cities by the sea", emoji: '🏛️', text: "About 3,000 years ago, the Phoenicians lived in busy port cities like Tyre, Sidon and Byblos, in what is now Lebanon." },
      { title: "Great sailors", emoji: '⛵', text: "Phoenician ships sailed all over the Mediterranean Sea. They traded cedar wood, glass, cloth and much more." },
      { title: "Purple from snails", emoji: '🐌', text: "They made a famous purple dye from small sea snails. It took thousands of snails to dye one robe, so only rich people and kings could buy it." },
      { title: "An alphabet", emoji: '🔤', text: "The Phoenicians wrote with an alphabet of just 22 letters. The Greeks borrowed it, and many alphabets today, including the one you are reading, grew from it." }
    ],
    dialogue: {
      npc: { name: "Adon", role: "a Phoenician trader from Tyre", look: 'sailor', portrayal: 'generic' },
      intro: "Welcome aboard my ship! I'm Adon, a trader from Tyre. We sail with the morning wind. What would you like to know?",
      topics: [
        { ask: "What do you trade?", answer: "Cedar wood from our mountains, glass, fine purple cloth and wine. We come home with metals like silver and tin, and goods from all around the sea." },
        { ask: "How do you make purple dye?", answer: "From little sea snails called murex. We collect thousands of them, and a tiny part of each snail makes the dye. It smells terrible, but the colour is beautiful and does not fade!" },
        { ask: "Why do you need an alphabet?", answer: "Traders must keep records: who bought what, and for how much. Our alphabet has only 22 letters, so it is quick to learn. That is much easier than learning hundreds of picture signs!" },
        { ask: "How do you find your way at sea?", answer: "We often sail where we can see the coast. At night we steer by the stars near the North Pole of the sky. The Greeks even named one group of those stars after us!" },
        { ask: "Have you built new cities?", answer: "Yes! We set up trading towns all around the sea. The most famous is Carthage, in North Africa. Old stories say a princess from Tyre founded it." }
      ],
      challenge: {
        q: "Which famous thing did the Phoenicians pass on to the Greeks?",
        choices: ["Their alphabet", "The steam engine", "Paper money"],
        answer: 0,
        explain: "The Greeks borrowed the Phoenician alphabet, and many of today's alphabets grew from it."
      },
      farewell: "Fair winds! Every time you write a letter of the alphabet, remember the traders from Tyre."
    },
    timeline: {
      title: "Phoenician sea trade",
      events: [
        { label: "Ships carry cedar wood from Byblos to Egypt", year: -2600, when: "about 2600 BCE" },
        { label: "Phoenician port cities grow rich from sea trade", year: -1100, when: "about 1100 BCE" },
        { label: "The Phoenician alphabet is in use", year: -1050, when: "about 1050 BCE" },
        { label: "Carthage is founded in North Africa", year: -814, when: "814 BCE, as old stories tell" },
        { label: "The Greeks borrow the Phoenician alphabet", year: -800, when: "about 800 BCE" }
      ]
    },
    artifact: {
      model: 'silk-bolt',
      name: "A roll of purple cloth",
      text: "Cloth dyed with the Phoenicians' famous purple was so costly that kings and emperors wore it to show how rich and important they were. The colour became known as Tyrian purple, after the city of Tyre."
    },
    quiz: [
      { q: "Where did the Phoenicians live?", choices: ["In the mountains of China", "In port cities like Tyre and Byblos, in today's Lebanon", "On islands in the Pacific"], answer: 1, hint: "They lived by the Mediterranean Sea.", explain: "The Phoenicians lived in port cities like Tyre, Sidon and Byblos, in what is now Lebanon." },
      { q: "What did the Phoenicians make their famous purple dye from?", choices: ["Berries", "Purple rocks", "Sea snails"], answer: 2, hint: "It came from the sea.", explain: "The dye came from small sea snails called murex." },
      { q: "Why was purple cloth so costly?", choices: ["It took thousands of snails to dye one robe", "It was made on the Moon", "Only one person knew how to sew"], answer: 0, hint: "Think about how many snails were needed.", explain: "Each snail gave only a tiny bit of dye, so thousands were needed for one robe." },
      { q: "How many letters did the Phoenician alphabet have?", choices: ["5", "22", "100"], answer: 1, hint: "It was quick to learn.", explain: "The Phoenician alphabet had 22 letters." },
      { q: "Which wood from Phoenicia was famous and sent to Egypt?", choices: ["Bamboo", "Balsa", "Cedar"], answer: 2, hint: "It grew on the mountains of Lebanon.", explain: "Cedar wood from the mountains of Lebanon was shipped to Egypt and many other lands." }
    ]
  },

  // ───────────── Island 4: Lighthouse Point (about age 9–10) ─────────────
  {
    id: 'h4-sea-zheng-he',
    subject: 'history',
    floor: 4,
    realm: 'sea',
    title: "Zheng He's Treasure Fleet",
    topic: 'zheng-he',
    topicName: "Zheng He's Voyages",
    blurb: "Sail with the giant ships of Ming China, all the way to Africa.",
    reading: [
      { title: "A great admiral", emoji: '⚓', text: "Zheng He was born around 1371 in Yunnan, in south-west China. He grew up to become an admiral of the Ming dynasty, trusted by the Yongle Emperor." },
      { title: "Seven voyages", emoji: '🗺️', text: "Between 1405 and 1433, Zheng He led seven great voyages across the Indian Ocean. His fleets visited places that are now Vietnam, Indonesia, Sri Lanka, India, Arabia and East Africa." },
      { title: "Treasure ships", emoji: '🚢', text: "The first fleet had more than 200 ships and about 27,000 people. The biggest 'treasure ships' carried silk, porcelain and gifts. Old records say they were huge, but historians still argue about their real size." },
      { title: "A giraffe for the emperor", emoji: '🦒', text: "The fleets came home with gifts from faraway rulers, including giraffes from East Africa. People in China had never seen such an animal, and some thought it was the qilin, a gentle creature from old stories." }
    ],
    dialogue: {
      npc: { name: "Zheng He", role: "admiral of the Ming treasure fleet", look: 'china', portrayal: 'portrayal' },
      intro: "Welcome aboard! I am Zheng He, admiral of the treasure fleet. The winds are good today. Ask me about our voyages.",
      topics: [
        { ask: "Why did the emperor send your fleets?", answer: "To show the world how rich and powerful Ming China was, to make friends with faraway rulers, and to trade. We carried gifts, and many rulers sent visitors and gifts back to the emperor." },
        { ask: "How did you find your way?", answer: "We used compasses, star charts and a long map of harbours, islands and sailing directions. At night, we measured how high certain stars stood above the sea." },
        { ask: "How big were your ships?", answer: "The treasure ships were the giants of the fleet, with many masts. Records say they were enormous, but nobody today knows their exact size. Historians are still studying the evidence." },
        { ask: "What did you bring back?", answer: "Spices, medicines, gems and amazing animals: ostriches, zebras and giraffes! The giraffe caused a great stir at the emperor's court." },
        { ask: "Why did the voyages stop?", answer: "After the Yongle Emperor died, many at court said the voyages cost too much. China turned its attention to matters at home, and the great fleets were not sent out again." }
      ],
      challenge: {
        q: "Which faraway coast did Zheng He's fleets reach?",
        choices: ["East Africa", "South America", "Antarctica"],
        answer: 0,
        explain: "The fleets crossed the Indian Ocean as far as East Africa, to ports in what are now Somalia and Kenya."
      },
      farewell: "May the winds be kind to you! The ocean joins lands together. It does not keep them apart."
    },
    timeline: {
      title: "The treasure fleet",
      events: [
        { label: "Zheng He is born in Yunnan, China", year: 1371, when: "about 1371" },
        { label: "The first voyage of the treasure fleet sets sail", year: 1405, when: "1405" },
        { label: "A giraffe arrives at the emperor's court", year: 1414, when: "1414" },
        { label: "The fleet reaches the coast of East Africa", year: 1418, when: "about 1418" },
        { label: "The seventh and last voyage returns home", year: 1433, when: "1433" }
      ]
    },
    artifact: {
      model: 'scroll',
      name: "The Mao Kun map",
      text: "This long strip map shows the routes of Zheng He's fleets, with coasts, islands, harbours and sailing directions. It survives in a book printed in the 1600s, about 200 years after the voyages."
    },
    quiz: [
      { q: "Which Chinese dynasty sent out Zheng He's fleets?", choices: ["The Han dynasty", "The Ming dynasty", "The Qin dynasty"], answer: 1, hint: "Its emperor was the Yongle Emperor.", explain: "Zheng He was an admiral of the Ming dynasty." },
      { q: "How many great voyages did Zheng He lead?", choices: ["Two", "Twenty", "Seven"], answer: 2, hint: "Between 1405 and 1433.", explain: "Zheng He led seven great voyages between 1405 and 1433." },
      { q: "Which animal amazed the emperor's court?", choices: ["A giraffe", "A penguin", "A kangaroo"], answer: 0, hint: "It has a very long neck.", explain: "A giraffe from Africa caused a great stir at the emperor's court." },
      { q: "Why do historians still argue about the treasure ships?", choices: ["Nobody is sure what they were called", "Nobody knows their exact size", "Nobody knows if they floated"], answer: 1, hint: "Old records say they were huge.", explain: "Records say the ships were enormous, but their exact size is still debated." },
      { q: "Which tools helped the fleet find its way?", choices: ["Satellites and radio", "Only luck", "Compasses, star charts and sea maps"], answer: 2, hint: "This was about 600 years ago.", explain: "The fleet used compasses, star charts and maps of harbours and sailing directions." }
    ]
  },

  {
    id: 'h4-sea-compass-and-knots',
    subject: 'history',
    floor: 4,
    realm: 'sea',
    title: "Compass, Log and Knots",
    topic: 'navigation',
    topicName: 'Finding the Way at Sea',
    blurb: "Steer by the compass, measure speed in knots and test the depth with a lead line.",
    reading: [
      { title: "A needle that points north", emoji: '🧭', text: "A magnetised needle swings round to point north and south. By about 1100, Chinese sailors used compasses at sea, and about 100 years later sailors in Europe did too." },
      { title: "The compass rose", emoji: '🌹', text: "Sea charts had a star-shaped 'compass rose' showing the directions: north, south, east, west and the points in between. Navigators used it to plan their course." },
      { title: "Speed in knots", emoji: '🪢', text: "To measure speed, sailors threw a wooden board on a rope off the back of the ship. The rope had knots tied along it. Counting how many knots ran out in a short time told them the speed. That is why ships' speeds are still given in knots!" },
      { title: "How deep is the water?", emoji: '⚓', text: "A lead line was a rope with a heavy lump of lead on the end. Sailors dropped it to the sea floor to measure the depth, so the ship would not get stuck on the bottom." }
    ],
    dialogue: {
      npc: { name: "Ines", role: "a ship's navigator, 1600s", look: 'explorer', portrayal: 'generic' },
      intro: "Good morning, sailor! I'm Ines, the navigator. My job is to know where our ship is, all the time. Let me show you my tools.",
      topics: [
        { ask: "How does a compass work?", answer: "The Earth acts like a giant magnet. A magnetised needle that can spin freely lines up with it, so one end points north. Even under cloudy skies, it shows our direction." },
        { ask: "What is dead reckoning?", answer: "It is how I mark our position. I know where we started, which way we steered, how fast we sailed and for how long. From that, I work out where we must be now, and mark it on the chart." },
        { ask: "How do you measure our speed?", answer: "We throw the log, a wooden board on a knotted rope, off the back of the ship and turn a small sand timer. When the sand runs out, we count the knots that went over the side. More knots means a faster ship!" },
        { ask: "What else does the lead line tell you?", answer: "There is a hollow in the bottom of the lead, filled with sticky fat. It picks up sand, shells or mud from the sea floor. The kind of bottom helps us know where we are." },
        { ask: "What can go wrong with a compass?", answer: "Keep iron away from it! A nail or a knife close by can pull the needle the wrong way. And the compass points to magnetic north, which is not quite the same as true north, so we must correct for that." }
      ],
      challenge: {
        q: "Why are ships' speeds measured in 'knots'?",
        choices: ["Sailors counted knots on a rope to measure speed", "Ships are tied up with knots", "'Knots' is a sailors' word for waves"],
        answer: 0,
        explain: "Sailors counted the knots on the log line that ran out in a set time. The more knots, the faster the ship."
      },
      farewell: "Keep your compass dry and your iron far away from it! Good sailing."
    },
    timeline: {
      title: "Tools for finding the way",
      events: [
        { label: "Chinese scholar Shen Kuo writes about a magnetic needle that points north", year: 1088, when: "1088" },
        { label: "A Chinese book describes sailors using a compass at sea", year: 1117, when: "about 1117" },
        { label: "A writer in Europe describes sailors' compasses", year: 1190, when: "about 1190" },
        { label: "The Catalan Atlas shows one of the first compass roses on a map", year: 1375, when: "1375" },
        { label: "Sailors in Europe measure speed with a knotted log line", year: 1600, when: "about 1600" }
      ]
    },
    artifact: {
      model: 'compass',
      name: "A ship's compass",
      text: "On a ship, the compass sat in a special stand. It hung so that it stayed level even when the ship rocked, and the needle could swing freely."
    },
    quiz: [
      { q: "Which way does a compass needle point?", choices: ["East and west", "North and south", "Up and down"], answer: 1, hint: "Think of the top of a map.", explain: "A compass needle lines up north and south." },
      { q: "What did sailors count to measure a ship's speed?", choices: ["Knots on a rope", "Waves on the sea", "Fish in the net"], answer: 0, hint: "The answer is still used for speed at sea today.", explain: "Sailors counted the knots on the log line that ran out in a set time." },
      { q: "What was a lead line used for?", choices: ["Catching fish", "Pulling up the anchor", "Measuring how deep the water was"], answer: 2, hint: "It had a heavy weight on the end.", explain: "Sailors dropped the lead line to the sea floor to measure the depth." },
      { q: "Why should you keep iron away from a compass?", choices: ["It makes the compass heavier", "It can pull the needle the wrong way", "It makes the compass rusty"], answer: 1, hint: "The needle is a magnet.", explain: "Iron near a compass pulls on the magnetised needle and makes it point the wrong way." },
      { q: "A navigator uses where the ship started, its direction, speed and time to work out where it is. What is this called?", choices: ["Dead reckoning", "Star gazing", "Fishing"], answer: 0, hint: "Ines told you about it.", explain: "Working out your position from direction, speed and time is called dead reckoning." }
    ]
  },
  // ───────────── Island 5: Pearl Reef (about age 10–11) ─────────────
  {
    id: 'h5-sea-chartmakers',
    subject: 'history',
    floor: 5,
    realm: 'sea',
    title: "Mapmakers and Sea Charts",
    topic: 'sea-charts',
    topicName: 'Maps and Sea Charts',
    blurb: "Draw coasts on sheepskin, learn Mercator's clever trick and print a map for every sailor.",
    reading: [
      { title: "Charts for sailors", emoji: '🗺️', text: "A sea chart is a map made for sailors. It shows coasts, harbours, dangerous rocks and how deep the water is. The oldest sea chart that still survives, the Carta Pisana, was drawn in Italy around 1275." },
      { title: "Webs of lines", emoji: '🕸️', text: "Early charts called portolan charts were covered in criss-crossing lines spreading out from compass roses. A sailor found the line joining two harbours and steered in that compass direction." },
      { title: "Mercator's clever trick", emoji: '🌍', text: "A round Earth can't be drawn on flat paper without stretching it. In 1569, Gerardus Mercator made a world map on which a steady compass course is always a straight line. It made steering easier, but it makes lands near the poles look far too big." },
      { title: "Measure, measure, measure", emoji: '📐', text: "Every chart starts with careful measuring. Surveyors measured coasts and dropped lead lines thousands of times. Today ships use sound echoes and satellites, but the idea is the same." }
    ],
    dialogue: {
      npc: { name: "Jan", role: "an engraver in a mapmaker's workshop, 1569", look: 'printer', portrayal: 'generic' },
      intro: "Welcome to the workshop! I'm Jan. I carve maps into copper plates so we can print many copies. Careful, the ink is still wet!",
      topics: [
        { ask: "Why print maps?", answer: "Before printing, every map was drawn by hand, one at a time, and copying caused mistakes. With an engraved copper plate, we can print hundreds of copies, and every sailor gets the same careful map." },
        { ask: "What is special about Master Mercator's new map?", answer: "On his map, a line of steady compass direction is perfectly straight. A navigator can draw a straight line from port to port, measure its angle, and steer by that compass direction." },
        { ask: "Why do lands near the poles look so big?", answer: "To keep the compass lines straight, the map stretches places more and more the farther they are from the equator. Greenland looks as big as Africa, but Africa is really about 14 times bigger!" },
        { ask: "What did older charts look like?", answer: "Portolan charts were drawn by hand on sheepskin. They show coasts and harbours in great detail, with a web of compass lines. Chartmakers in Italy and on the island of Mallorca were famous for them." },
        { ask: "What goes in the empty parts of the map?", answer: "Where nobody had measured, mapmakers sometimes drew ships, sea creatures or decorations. A good chart tells the truth about what we know, and also shows what we don't know yet." }
      ],
      challenge: {
        q: "What was special about Mercator's world map of 1569?",
        choices: ["It showed the world as a perfect circle", "A steady compass course is drawn as a straight line", "It was the first map of the Moon"],
        answer: 1,
        explain: "On Mercator's map, a steady compass course is a straight line, which made planning a voyage much easier."
      },
      farewell: "Off you go! Whenever you look at a map, ask yourself: who measured this, and how?"
    },
    timeline: {
      title: "Charts through time",
      events: [
        { label: "The Carta Pisana, the oldest surviving sea chart, is drawn", year: 1275, when: "about 1275" },
        { label: "The Catalan Atlas is made on the island of Mallorca", year: 1375, when: "1375" },
        { label: "Mercator publishes his famous world map", year: 1569, when: "1569" },
        { label: "Britain sets up an office just for making sea charts", year: 1795, when: "1795" },
        { label: "Ships begin measuring the depth of the sea with sound echoes", year: 1920, when: "about 1920" }
      ]
    },
    artifact: {
      model: 'scroll',
      name: "A portolan chart",
      text: "Portolan charts were drawn in ink on sheepskin. Harbour names were written along the coasts, and lines from compass roses criss-crossed the sea."
    },
    quiz: [
      { q: "What is a sea chart?", choices: ["A list of fish names", "A map made for sailors, showing coasts, rocks and depths", "A chart of the weather"], answer: 1, hint: "Sailors use it to plan a safe route.", explain: "A sea chart is a map for sailors, showing coasts, harbours, rocks and water depths." },
      { q: "What were portolan charts drawn on?", choices: ["Plastic", "Glass", "Sheepskin"], answer: 2, hint: "It came from an animal.", explain: "Portolan charts were drawn in ink on sheepskin." },
      { q: "On Mercator's map, why does Greenland look as big as Africa?", choices: ["The map stretches places far from the equator", "Greenland grew bigger", "Mercator's pen slipped"], answer: 0, hint: "Greenland is very far north.", explain: "Mercator's map stretches places more and more the farther they are from the equator." },
      { q: "Africa is about 14 times bigger than Greenland. If Greenland is about 2 million km², about how big is Africa?", choices: ["16 million km²", "28 million km²", "140 million km²"], answer: 1, hint: "Multiply 2 million by 14.", explain: "14 × 2 million = 28 million km². (Africa's real area is about 30 million km².)" },
      { q: "Why did engravers carve maps into copper plates?", choices: ["So many copies could be printed", "So the maps would shine", "So the maps would be heavy"], answer: 0, hint: "Think about printing.", explain: "An engraved plate could print hundreds of identical copies, so every sailor got the same map." }
    ]
  },

  {
    id: 'h5-sea-harrison-clock',
    subject: 'history',
    floor: 5,
    realm: 'sea',
    title: "John Harrison's Sea Clock",
    topic: 'longitude',
    topicName: 'The Longitude Problem',
    blurb: "Help a carpenter build the clock that solved the hardest puzzle at sea.",
    reading: [
      { title: "East or west?", emoji: '🌊', text: "Sailors could find their latitude (how far north or south they were) from the Sun and stars. But longitude, how far east or west, was a puzzle. Ships crossing an ocean often had no sure idea how far they had sailed." },
      { title: "Time is the key", emoji: '⏰', text: "The Earth turns 360° in 24 hours: that is 15° every hour. If you know the time at home and the time where you are, the difference tells you your longitude. 1 hour of difference means 15° east or west." },
      { title: "A prize", emoji: '🏆', text: "In 1714, the British Parliament offered a huge prize, up to £20,000, for a way to find longitude at sea. But the clocks of the time could not keep good time on a rolling, damp ship." },
      { title: "The carpenter clockmaker", emoji: '🔧', text: "John Harrison, a carpenter who taught himself clockmaking, spent over 40 years building sea clocks. His fourth, called H4, looked like a big pocket watch. On a voyage to Jamaica in 1761, it lost only about 5 seconds." }
    ],
    dialogue: {
      npc: { name: "John Harrison", role: "a carpenter and clockmaker from England", look: 'inventor', portrayal: 'portrayal' },
      intro: "Good day! I'm John Harrison. I started out as a carpenter, but clocks are my true love. Come and look at my sea clock. Gently, please!",
      topics: [
        { ask: "Why is longitude so hard to find?", answer: "Latitude is easy: measure how high the Sun is at noon. But to find longitude you need to know the exact time back home, and no clock could keep good time at sea." },
        { ask: "How does a clock tell you your longitude?", answer: "Set my clock to home time before you sail. At sea, find your local noon, when the Sun is highest. If my clock says 3 o'clock in the afternoon at your noon, you are 3 hours, or 45°, west of home." },
        { ask: "Why do ordinary clocks go wrong at sea?", answer: "Pendulum clocks are thrown off when the ship rolls. Heat and cold make metal parts grow and shrink, so the clock speeds up or slows down. I had to beat all of these problems." },
        { ask: "Did you win the prize?", answer: "It took a long time! The judges wanted more and more tests. In the end, in 1773, Parliament gave me a large reward. I was about 80 years old by then." },
        { ask: "Who used your idea?", answer: "Captain James Cook took a copy of my H4 on his second great voyage, and he praised it highly. Soon, sea clocks called chronometers sailed on ships everywhere." }
      ],
      challenge: {
        q: "The Earth turns 15° every hour. Your sea clock shows that home time is 2 hours later than the time where you are. How far west of home are you?",
        choices: ["15°", "30°", "2°"],
        answer: 1,
        explain: "2 hours × 15° per hour = 30°. Your time is behind home time, so you are 30° west of home."
      },
      farewell: "Remember, young navigator: a good clock is a sailor's best friend. Keep it wound!"
    },
    timeline: {
      title: "Solving longitude",
      events: [
        { label: "John Harrison is born in Yorkshire, England", year: 1693, when: "1693" },
        { label: "Parliament offers a prize for finding longitude at sea", year: 1714, when: "1714" },
        { label: "Harrison finishes his first sea clock, H1", year: 1735, when: "1735" },
        { label: "H4 is tested on a voyage to Jamaica", year: 1761, when: "1761" },
        { label: "Parliament gives Harrison a large reward", year: 1773, when: "1773" },
        { label: "Greenwich, in London, is chosen as the line of 0° longitude", year: 1884, when: "1884" }
      ]
    },
    artifact: {
      model: 'globe',
      name: "A globe with lines of longitude",
      text: "Lines of longitude run from the North Pole to the South Pole. Since 1884, the 0° line has passed through Greenwich, in London. There are 360° all the way round, and the Earth turns through 15 of them every hour."
    },
    quiz: [
      { q: "What does longitude tell you?", choices: ["How far east or west you are", "How far north or south you are", "How deep the sea is"], answer: 0, hint: "Latitude is the north–south one.", explain: "Longitude tells you how far east or west you are." },
      { q: "Why did ordinary clocks go wrong at sea?", choices: ["Sailors forgot to look at them", "The ship's rolling, and heat and cold, upset them", "Fish ate the parts"], answer: 1, hint: "Think about a rocking ship in hot and cold places.", explain: "The rolling ship upset pendulums, and heat and cold changed the size of the metal parts." },
      { q: "The Earth turns 360° in 24 hours. How many degrees does it turn in 1 hour?", choices: ["10°", "24°", "15°"], answer: 2, hint: "Divide 360 by 24.", explain: "360 ÷ 24 = 15, so the Earth turns 15° every hour." },
      { q: "What was John Harrison's first job, before he made clocks?", choices: ["Sailor", "Carpenter", "Painter"], answer: 1, hint: "His first clocks were made mostly of wood.", explain: "Harrison was a carpenter who taught himself to make clocks." },
      { q: "Which famous captain took a copy of H4 on a voyage?", choices: ["James Cook", "Christopher Columbus", "Zheng He"], answer: 0, hint: "His second great voyage was in the 1770s.", explain: "Captain James Cook took a copy of H4 on his second voyage and praised it highly." }
    ]
  },

  // ───────────── Island 6: Whale Bay (about age 11–12) ─────────────
  {
    id: 'h6-sea-hms-challenger',
    subject: 'history',
    floor: 6,
    realm: 'sea',
    title: "HMS Challenger: The First Ocean Science Voyage",
    topic: 'hms-challenger',
    topicName: 'The Challenger Expedition',
    blurb: "Measure the deep, haul up strange creatures and help start the science of the sea.",
    reading: [
      { title: "A ship turned into a lab", emoji: '🔬', text: "In December 1872, HMS Challenger sailed from Portsmouth, England. Most of its guns had been taken out to make room for laboratories, microscopes and miles of rope for measuring the deep sea." },
      { title: "Around the world", emoji: '🌍', text: "Over almost three and a half years, the ship sailed about 127,000 km and crossed every ocean except the Arctic. At hundreds of stations, the crew stopped to measure depth, temperature and currents, and to collect water, mud and animals." },
      { title: "Life in the deep", emoji: '🦑', text: "Some scientists had thought that nothing could live in the cold, dark deep sea. Challenger's nets brought up thousands of animals, and about 4,700 kinds were new to science." },
      { title: "The deepest spot", emoji: '📏', text: "In 1875, near the Mariana Islands in the Pacific, the crew lowered a weighted line more than 8 km down. They had found one of the deepest places in the ocean. Today its deepest point is called the Challenger Deep." }
    ],
    dialogue: {
      npc: { name: "Tom", role: "a young sailor on HMS Challenger, 1875", look: 'sailor', portrayal: 'generic' },
      intro: "Welcome aboard HMS Challenger! I'm Tom. I help the scientists haul up the deep-sea nets. It's a long job, so pull up a coil of rope and sit down.",
      topics: [
        { ask: "How do you measure how deep the sea is?", answer: "We tie a heavy weight to a very long rope and lower it until it hits the bottom. In deep water, that can take more than an hour! Then we check how much rope went out." },
        { ask: "What do you bring up from the bottom?", answer: "Mud, stones and creatures nobody has ever seen: sea cucumbers, glassy sponges and strange fish. We even find lumpy black stones full of metal, called manganese nodules." },
        { ask: "What do the scientists do with it all?", answer: "They study everything under microscopes, write it all down and pack samples in jars to send home. Back in Britain, experts will spend about 20 years writing up the results, in 50 big books!" },
        { ask: "How cold is it down there?", answer: "We lower special thermometers. Even near the warm equator, the water at the bottom is only a few degrees above freezing. The deep ocean is cold everywhere!" },
        { ask: "Why does this voyage matter?", answer: "It is the first big voyage made just to study the ocean. Many people say it was the start of oceanography, the science of the sea." }
      ],
      challenge: {
        q: "What did HMS Challenger show about the deep sea?",
        choices: ["It is empty of life", "Many animals live there, even in the cold and dark", "It is made of fresh water"],
        answer: 1,
        explain: "Challenger's nets brought up thousands of animals from the deep, about 4,700 kinds of them new to science."
      },
      farewell: "Back to the ropes for me! Next time you see the ocean, remember: it's deep, cold and full of life."
    },
    timeline: {
      title: "The Challenger expedition",
      events: [
        { label: "HMS Challenger sails from Portsmouth, England", year: 1872, when: "December 1872" },
        { label: "The crew measures one of the deepest spots in the ocean, near the Mariana Islands", year: 1875, when: "1875" },
        { label: "Challenger comes home after sailing about 127,000 km", year: 1876, when: "May 1876" },
        { label: "The first of 50 volumes of results is published", year: 1880, when: "1880" },
        { label: "The last volume of the Challenger Report is published", year: 1895, when: "1895" },
        { label: "A later survey ship, also called Challenger, measures the deepest point: the Challenger Deep", year: 1951, when: "1951" }
      ]
    },
    artifact: {
      model: 'message-bottle',
      name: "A water-sample bottle",
      text: "Scientists on Challenger lowered special bottles on ropes to collect seawater from different depths. Back on deck, they tested how salty the water was and which gases were in it."
    },
    quiz: [
      { q: "What made HMS Challenger different from other navy ships?", choices: ["It was made of glass", "Most of its guns were taken out to make room for laboratories", "It had no sails"], answer: 1, hint: "It was turned into a floating lab.", explain: "Most of its guns were removed to make room for laboratories and scientific equipment." },
      { q: "How did the crew measure the depth of the deep sea?", choices: ["They lowered a weighted rope until it hit the bottom", "They used satellites", "They sent a diver down"], answer: 0, hint: "This was in the 1870s.", explain: "They lowered a heavy weight on a long rope and measured how much rope went out." },
      { q: "About how many new kinds of animals did the expedition discover?", choices: ["About 47", "About 4 million", "About 4,700"], answer: 2, hint: "Thousands, but not millions.", explain: "About 4,700 kinds of animals were new to science." },
      { q: "What is oceanography?", choices: ["The science of the sea", "The study of maps of the sky", "The history of ships"], answer: 0, hint: "'Ocean' is in the word.", explain: "Oceanography is the science of the sea, and many say the Challenger expedition began it." },
      { q: "What is the Challenger Deep?", choices: ["A deep lake in England", "The deepest known point of the ocean, in the Mariana Trench", "A kind of deep-sea fish"], answer: 1, hint: "It was named after the ship.", explain: "The Challenger Deep is the deepest known point in the ocean, in the Mariana Trench in the Pacific." }
    ]
  },

  {
    id: 'h6-sea-mary-anning',
    subject: 'history',
    floor: 6,
    realm: 'sea',
    title: "Mary Anning, Fossil Hunter of the Shore",
    topic: 'mary-anning',
    topicName: 'Mary Anning and Fossils',
    blurb: "Search the seaside cliffs of Lyme Regis for the bones of ancient sea reptiles.",
    reading: [
      { title: "A girl by the sea", emoji: '🏖️', text: "Mary Anning was born in 1799 in Lyme Regis, a seaside town in the south of England. Her family was poor, and they sold fossils they found on the beach to visitors." },
      { title: "A 'fish lizard'", emoji: '🦴', text: "Around 1811 and 1812, Mary and her brother Joseph found a huge ichthyosaur, one of the first ever studied by scientists. It was a sea reptile shaped a bit like a dolphin, which lived about 200 million years ago." },
      { title: "More amazing finds", emoji: '🦕', text: "In 1823 she found the first complete plesiosaur, a sea reptile with a long neck and four flippers. In 1828 she found a flying reptile, a pterosaur: the first one found outside Germany." },
      { title: "Not allowed in", emoji: '🚪', text: "Scientists bought her fossils and asked for her advice, but as a woman she could not join the Geological Society of London. Today she is remembered as one of the greatest fossil hunters of all time." }
    ],
    dialogue: {
      npc: { name: "Mary Anning", role: "a fossil hunter of Lyme Regis", look: 'explorer', portrayal: 'portrayal' },
      intro: "Good morning! I'm Mary Anning. After a winter storm, the waves wash new fossils out of the cliffs, so this is the best time to hunt. Watch the tide with me!",
      topics: [
        { ask: "What is a fossil?", answer: "It is what is left of a living thing, turned to stone over millions of years. When a sea animal died and was buried in mud on the sea floor, minerals slowly filled and replaced its bones." },
        { ask: "What is an ichthyosaur?", answer: "'Ichthyosaur' means 'fish lizard'. It was a sea reptile with a long snout, big eyes and flippers, a bit like a dolphin. It breathed air, just as dolphins do." },
        { ask: "How do you find fossils?", answer: "I walk the beach after storms, when the sea has worn away bits of the cliffs. I look for shapes in the stone, then dig them out very carefully. Some big skeletons take months to free." },
        { ask: "What are these curly stones?", answer: "Those are ammonites: sea creatures with spiral shells, all long gone now. Visitors love them! People here call them 'snakestones'." },
        { ask: "Why do scientists come to see you?", answer: "My finds helped show that some kinds of animals lived long ago and then died out completely. That is called extinction. In my time, that was a new and surprising idea for many people." }
      ],
      challenge: {
        q: "What did Mary Anning find in 1823?",
        choices: ["A woolly mammoth", "The first complete plesiosaur skeleton", "A dinosaur egg"],
        answer: 1,
        explain: "In 1823 Mary found the first complete skeleton of a plesiosaur, a long-necked sea reptile."
      },
      farewell: "The tide's coming in, so off the beach we go! Keep your eyes open: the next great find might be yours."
    },
    timeline: {
      title: "Mary Anning's life",
      events: [
        { label: "Mary Anning is born in Lyme Regis", year: 1799, when: "1799" },
        { label: "Mary and her brother Joseph find an ichthyosaur", year: 1811, when: "1811–1812" },
        { label: "Mary finds a complete plesiosaur", year: 1823, when: "1823" },
        { label: "She finds a pterosaur, a flying reptile", year: 1828, when: "1828" },
        { label: "Mary Anning dies, aged 47", year: 1847, when: "1847" },
        { label: "Britain's Royal Mint puts sea reptiles from her finds on 50p coins", year: 2021, when: "2021" }
      ]
    },
    artifact: {
      model: 'coin',
      name: "A coin for Mary Anning",
      text: "In 2021, Britain's Royal Mint made special 50p coins showing sea and flying reptiles linked to Mary Anning's discoveries. Not bad for a girl who once sold fossils on the beach!"
    },
    quiz: [
      { q: "Where did Mary Anning hunt for fossils?", choices: ["In the deserts of Egypt", "On the beaches and cliffs of Lyme Regis, England", "In a cave in France"], answer: 1, hint: "She grew up by the sea.", explain: "Mary hunted fossils on the beaches and cliffs around Lyme Regis, in the south of England." },
      { q: "What kind of animal was an ichthyosaur?", choices: ["A sea reptile shaped a bit like a dolphin", "A flying bird", "A kind of shark"], answer: 0, hint: "Its name means 'fish lizard'.", explain: "An ichthyosaur was a sea reptile shaped a bit like a dolphin. It breathed air." },
      { q: "Why couldn't Mary join the Geological Society of London?", choices: ["She was too young", "She lived too far away", "Women were not allowed to join"], answer: 2, hint: "It was not about her skill.", explain: "At the time, women were not allowed to join, even though scientists relied on her finds." },
      { q: "What are ammonites?", choices: ["Small dinosaurs", "Ancient sea creatures with spiral shells", "Stone tools"], answer: 1, hint: "People called them 'snakestones'.", explain: "Ammonites were sea creatures with spiral shells that died out long ago." },
      { q: "Mary's finds helped scientists accept which idea?", choices: ["That some kinds of animals died out completely long ago", "That the Earth is flat", "That fossils grow like plants"], answer: 0, hint: "The word is extinction.", explain: "Her fossils showed animals that no longer live anywhere, which helped people accept extinction." }
    ]
  },

  // ───────────── Island 7: Deep Blue Station (about age 12–13) ─────────────
  {
    id: 'h7-sea-trieste-dive',
    subject: 'history',
    floor: 7,
    realm: 'sea',
    title: "Trieste: Down to the Challenger Deep",
    topic: 'challenger-deep',
    topicName: 'Diving to the Challenger Deep',
    blurb: "Ride a bathyscaphe almost 11 km down to the deepest point in the ocean.",
    reading: [
      { title: "The deepest place", emoji: '📏', text: "The Challenger Deep, in the Mariana Trench in the western Pacific, is the deepest known point in the ocean: about 10,900 m down. If Mount Everest stood on the bottom, its peak would still be about 2 km under water." },
      { title: "Crushing pressure", emoji: '🧱', text: "Every 10 m of seawater adds about one more 'atmosphere' of pressure. At the bottom of the Challenger Deep, the pressure is more than 1,000 times what we feel at the surface: about the weight of a small car pressing on every square centimetre." },
      { title: "A balloon for the sea", emoji: '🎈', text: "The Trieste was a bathyscaphe designed by the Swiss scientist Auguste Piccard. The crew sat in a small, thick steel sphere. Above it, a huge float full of petrol, which is lighter than water, kept it buoyant. Dropping iron pellets let it rise again." },
      { title: "23 January 1960", emoji: '🔱', text: "Jacques Piccard, Auguste's son, and US Navy officer Don Walsh took nearly 5 hours to sink to the bottom. They stayed about 20 minutes, then rose back to the surface. Nobody went there again for 52 years." }
    ],
    dialogue: {
      npc: { name: "Jacques Piccard", role: "a Swiss deep-sea explorer", look: 'diver', portrayal: 'portrayal' },
      intro: "Bonjour! I'm Jacques Piccard. My father designed this bathyscaphe, the Trieste, and today Don Walsh and I are going to the very bottom of the ocean. Want to know how?",
      topics: [
        { ask: "How does the Trieste sink and rise?", answer: "It works like a balloon, but under water. The float is full of petrol, which is lighter than water, so it holds us up. To start sinking, we let seawater into tanks at each end. To come back up, we drop tonnes of iron pellets and become lighter." },
        { ask: "Why don't you get crushed?", answer: "We sit inside a steel sphere with walls about 13 cm thick, with one small window of very strong plastic. A sphere is the best shape to resist pressure, because it spreads the push evenly all over." },
        { ask: "What happened on the way down?", answer: "At about 9,000 m we heard a loud crack and the cabin shook. An outer window pane had cracked, but our cabin was safe, so we carried on. A very tense moment!" },
        { ask: "What did you see at the bottom?", answer: "Our lights stirred up a cloud of fine mud. I thought I saw a flat fish, but scientists today doubt a fish could live that deep, so it may have been something else, like a sea cucumber." },
        { ask: "Who has been there since?", answer: "Very few people. In 2012, the film-maker James Cameron dived there alone. In 2020, Kathy Sullivan became the first woman to reach it. She had already walked in space!" }
      ],
      challenge: {
        q: "How did the Trieste come back up from the bottom?",
        choices: ["Its engines pulled it up", "A ship pulled it up on a cable", "It dropped iron pellets to become lighter"],
        answer: 2,
        explain: "Dropping the heavy iron pellets made the Trieste lighter overall, so its petrol float carried it back to the surface."
      },
      farewell: "Merci! Most of the deep ocean floor has never been seen by anyone. Maybe you will explore it one day."
    },
    timeline: {
      title: "Journeys to the deep",
      events: [
        { label: "HMS Challenger measures the depth near the Mariana Islands with a weighted line", year: 1875, when: "1875" },
        { label: "Beebe and Barton dive 923 m in a steel ball called the bathysphere", year: 1934, when: "1934" },
        { label: "The Trieste is launched in Italy", year: 1953, when: "1953" },
        { label: "Piccard and Walsh reach the bottom of the Challenger Deep", year: 1960, when: "23 January 1960" },
        { label: "James Cameron dives to the Challenger Deep alone", year: 2012, when: "2012" },
        { label: "Kathy Sullivan becomes the first woman to reach the Challenger Deep", year: 2020, when: "2020" }
      ]
    },
    artifact: {
      model: 'diving-helmet',
      name: "A brass diving helmet",
      text: "For about 100 years, divers wore heavy brass helmets, with air pumped down a hose from the surface. They could work only a few dozen metres deep. To reach nearly 11 km down, people needed a whole new kind of craft."
    },
    quiz: [
      { q: "About how deep is the Challenger Deep?", choices: ["About 1,090 m", "About 10,900 m", "About 109,000 m"], answer: 1, hint: "Nearly 11 km.", explain: "The Challenger Deep is about 10,900 m deep, nearly 11 km." },
      { q: "Why was the Trieste's float filled with petrol?", choices: ["Petrol is lighter than water, so it helped hold the craft up", "Petrol was fuel for its engines", "Petrol kept the crew warm"], answer: 0, hint: "Think about floating, not engines.", explain: "Petrol is less dense than water, so a float full of it gave the Trieste buoyancy." },
      { q: "The pressure rises by about 1 atmosphere for every 10 m of seawater. About how many extra atmospheres of pressure are there at 5,000 m?", choices: ["50", "5,000", "500"], answer: 2, hint: "How many 10s are there in 5,000?", explain: "5,000 ÷ 10 = 500, so there are about 500 extra atmospheres of pressure." },
      { q: "Mount Everest is about 8,850 m tall. If it stood on the bottom of the Challenger Deep (about 10,900 m), how far under water would its peak be?", choices: ["About 1,050 m", "About 2,050 m", "About 19,750 m"], answer: 1, hint: "Subtract the mountain's height from the depth.", explain: "10,900 − 8,850 = 2,050, so the peak would be about 2,050 m under water." },
      { q: "Why is a sphere a good shape for a deep-sea cabin?", choices: ["It spreads the pressure evenly all over", "It rolls along the sea floor", "It looks like a fish egg"], answer: 0, hint: "Think about how the water pushes from every side.", explain: "A sphere spreads the huge pressure evenly, so no part takes much more push than another." }
    ]
  },

  {
    id: 'h7-sea-marie-tharp',
    subject: 'history',
    floor: 7,
    realm: 'sea',
    title: "Marie Tharp Maps the Sea Floor",
    topic: 'marie-tharp',
    topicName: 'Marie Tharp and the Ocean Floor',
    blurb: "Turn thousands of echo soundings into the first maps of the hidden sea floor.",
    reading: [
      { title: "A hidden world", emoji: '🌊', text: "In the 1940s, many people imagined the deep ocean floor as flat and muddy. Nobody had seen it. Ships had begun to measure depth with echo sounders, which time how long a 'ping' of sound takes to bounce off the bottom and come back." },
      { title: "Drawing the depths", emoji: '✏️', text: "Marie Tharp, a geologist and mapmaker, joined the Lamont Geological Observatory in New York in 1948. Women were not allowed on its research ships then, so her colleague Bruce Heezen collected depth data at sea, and Tharp turned it into maps." },
      { title: "A crack in the ridge", emoji: '⛰️', text: "Around 1952, Tharp noticed a deep valley running down the middle of the Mid-Atlantic Ridge, a huge underwater mountain chain. She thought it was a rift where the sea floor was pulling apart. Heezen doubted it at first, but the evidence won him over." },
      { title: "A world map of the sea floor", emoji: '🗺️', text: "In 1977, Tharp and Heezen published the World Ocean Floor map, painted by the artist Heinrich Berann. It showed a ridge system winding around the globe for about 65,000 km: the longest mountain range on Earth." }
    ],
    dialogue: {
      npc: { name: "Marie Tharp", role: "a geologist and ocean-floor mapmaker", look: 'scientist', portrayal: 'portrayal' },
      intro: "Hello! I'm Marie Tharp. My desk is covered in depth soundings: thousands of numbers. Each one is a dot on the sea floor. Let's see what picture they make.",
      topics: [
        { ask: "How do you know how deep the ocean is?", answer: "Ships send a ping of sound down and time the echo. Sound travels about 1,500 metres per second in seawater. If the echo comes back after 4 seconds, the sound took 2 seconds to go down, so the bottom is about 3,000 m deep." },
        { ask: "How do you make a map from numbers?", answer: "Each ship's route gives a long line of depths. I plot them, then use what I know about geology to sketch the shapes between the lines: mountains, valleys and plains. It's careful work, part science and part art." },
        { ask: "What did you discover?", answer: "A deep valley running down the middle of the Mid-Atlantic Ridge. Earthquakes were found along it too. I believed it was where new sea floor forms as the continents slowly drift apart." },
        { ask: "Why didn't people believe you at first?", answer: "In the early 1950s, most scientists thought the continents could not move. And I was a woman in a field run almost entirely by men. But the evidence kept piling up, and by the late 1960s plate tectonics was widely accepted." },
        { ask: "Did you ever go to sea?", answer: "For years, I wasn't allowed on the research ships. Only in the 1960s did I finally sail on a research voyage. Until then, I explored the whole ocean floor from my desk!" }
      ],
      challenge: {
        q: "What did Marie Tharp find running down the middle of the Mid-Atlantic Ridge?",
        choices: ["A deep rift valley where the sea floor pulls apart", "A sunken city", "A huge flat plain"],
        answer: 0,
        explain: "She found a rift valley along the ridge, evidence that the sea floor is spreading and the continents are drifting apart."
      },
      farewell: "Keep asking what the evidence says, even when people tell you it's impossible. Happy mapping!"
    },
    timeline: {
      title: "Mapping the sea floor",
      events: [
        { label: "Marie Tharp is born in Michigan, USA", year: 1920, when: "1920" },
        { label: "Tharp starts work at the Lamont Geological Observatory", year: 1948, when: "1948" },
        { label: "She spots the rift valley in the Mid-Atlantic Ridge", year: 1952, when: "about 1952" },
        { label: "Tharp and Heezen publish a map of the North Atlantic sea floor", year: 1957, when: "1957" },
        { label: "The World Ocean Floor map is published", year: 1977, when: "1977" },
        { label: "The Library of Congress names her one of the greatest mapmakers of the 20th century", year: 1997, when: "1997" }
      ]
    },
    artifact: {
      model: 'globe',
      name: "A globe of the ocean floor",
      text: "Take away the water and the Earth looks very different: a long ridge winds through every ocean like the seam on a baseball, with deep trenches and wide, flat plains. Tharp's maps let people see this for the first time."
    },
    quiz: [
      { q: "How does an echo sounder measure depth?", choices: ["It drops a camera to the bottom", "It times how long a sound takes to bounce back from the sea floor", "It measures how cold the water is"], answer: 1, hint: "Think of an echo in a big hall.", explain: "An echo sounder times the ping's trip down and back, and uses the speed of sound to work out the depth." },
      { q: "Sound travels about 1,500 m per second in seawater. An echo comes back after 2 seconds. How deep is the sea floor?", choices: ["3,000 m", "750 m", "1,500 m"], answer: 2, hint: "The sound goes down and back up, so it takes 1 second each way.", explain: "1 second down × 1,500 m/s = 1,500 m. The sea floor is about 1,500 m deep." },
      { q: "Why did Marie Tharp first map the ocean from a desk instead of a ship?", choices: ["Women were not allowed on the research ships at the time", "She was afraid of boats", "Ships had not been invented"], answer: 0, hint: "It was about the rules of the time.", explain: "Women were not allowed on the research ships, so Heezen collected data at sea and Tharp mapped it." },
      { q: "Her discovery of the rift valley supported which big idea?", choices: ["That the Earth is getting smaller", "That the continents slowly drift apart (plate tectonics)", "That the oceans are fresh water"], answer: 1, hint: "The sea floor was pulling apart.", explain: "A rift where new sea floor forms supported the idea that the continents drift apart: plate tectonics." },
      { q: "About how long is the mid-ocean ridge system?", choices: ["About 650 km", "About 6,500 km", "About 6.5 million km", "About 65,000 km"], answer: 3, hint: "It is the longest mountain range on Earth, longer than the Earth is round (about 40,000 km).", explain: "The mid-ocean ridge winds around the globe for about 65,000 km." }
    ]
  }
];

/* ------------------------------------------------------------ Ocean Lab (physics) */

const SEA_PHYSICS = [
  // ───────────── Island 1: Shell Beach (about age 6–7) ─────────────
  {
    id: 'p1-sea-boats-float',
    subject: 'physics',
    floor: 1,
    realm: 'sea',
    title: "Boats That Float",
    topic: 'floating',
    topicName: 'Floating and sinking',
    blurb: "Splash things into the lagoon tank. Which ones float like a little boat?",
    reading: [
      { title: "Floating boats", emoji: '⛵', text: "A boat stays on top of the water. We say it floats. Things that drop down to the bottom sink." },
      { title: "Wood floats", emoji: '🪵', text: "Long ago, people made boats and rafts from wood, because wood floats. A wooden block bobs on the water like a tiny raft." },
      { title: "Metal sinks… or does it?", emoji: '⚓', text: "A metal key sinks to the bottom. But a big metal ship floats! Its shape is like a giant bowl full of air." },
      { title: "Not about size", emoji: '🪨', text: "A small stone sinks, but a big log floats. Being big or small does not decide it. What a thing is made of matters, and so does its shape." }
    ],
    sim: {
      id: 'float',
      setup: { items: ['wooden-block', 'stone', 'cork', 'coin', 'rubber-duck', 'key'] },
      predict: {
        q: "Which one will float like a little boat: the wooden block or the coin?",
        choices: ["The coin", "The wooden block"],
        answer: 1,
        explain: "The wooden block floats, just like a wooden raft. The coin is solid metal, so it sinks to the bottom."
      }
    },
    quiz: [
      { q: "A boat stays on top of the water. What do we call that?", choices: ["Sinking", "Floating"], answer: 1, hint: "A rubber duck does it in the bath.", explain: "When something stays on top of the water, it floats." },
      { q: "Which of these floats?", choices: ["A stone", "A key", "A cork"], answer: 2, hint: "It is light and comes from a tree.", explain: "A cork floats. Stones and keys sink." },
      { q: "A big ship is made of metal. Why does it float?", choices: ["Its shape is like a big bowl full of air", "It is painted blue", "Fish hold it up"], answer: 0, hint: "Think of a bowl floating in the bath.", explain: "A ship is shaped like a giant bowl full of air, and that helps it float." },
      { q: "A tiny pebble and a big log go into the sea. Which one sinks?", choices: ["The big log", "The tiny pebble"], answer: 1, hint: "Size does not decide it.", explain: "The tiny pebble sinks, and the big log floats. What a thing is made of matters more than its size." },
      { q: "Why did people long ago make rafts from wood?", choices: ["Wood floats", "Wood is shiny", "Wood sinks fast"], answer: 0, hint: "A raft must stay on top of the water.", explain: "Wood floats, so it was a good thing to make rafts and boats from." }
    ]
  },
  {
    id: 'p1-sea-beach-shadows',
    subject: 'physics',
    floor: 1,
    realm: 'sea',
    title: "Shadows on the Beach",
    topic: 'light-shadows',
    topicName: 'Light and shadows',
    blurb: "Make shadows grow and shrink, like shady spots under the palm trees.",
    reading: [
      { title: "What is a shadow?", emoji: '🌴', text: "A shadow is a dark shape. It forms when something blocks the light. A palm tree blocks the sunlight and makes a shadow on the sand." },
      { title: "Light goes straight", emoji: '☀️', text: "Light travels in straight lines. It cannot bend around the palm tree, so the place behind it stays dark." },
      { title: "Big and small shadows", emoji: '🔦', text: "When a torch is close to a toy, the toy's shadow is big. When the torch moves far away, the shadow gets smaller." },
      { title: "Shade to keep cool", emoji: '⛱️', text: "On a hot beach, a big umbrella blocks the sunlight. Its shadow makes a cool, shady place to sit." }
    ],
    sim: {
      id: 'shadow',
      predict: {
        q: "You move the torch far away from the toy. What happens to its shadow?",
        choices: ["It gets bigger", "It gets smaller", "It turns blue"],
        answer: 1,
        explain: "Far from the torch, the toy blocks less of the light, so its shadow shrinks."
      }
    },
    quiz: [
      { q: "What makes a shadow?", choices: ["Something blocking the light", "Water on the sand", "A loud noise"], answer: 0, hint: "You need light, and something in its way.", explain: "A shadow forms when something blocks the light." },
      { q: "Why is it dark behind a palm tree on a sunny day?", choices: ["The sand is dark", "The tree blocks the sunlight", "The sea is cold"], answer: 1, hint: "What is in the way of the Sun?", explain: "The tree blocks the sunlight, so the place behind it is in shadow." },
      { q: "You hold a torch very close to a toy crab. How big is its shadow?", choices: ["Small", "There is no shadow", "Big"], answer: 2, hint: "Remember what happened in the lab.", explain: "Close to the torch, the crab blocks lots of light, so its shadow is big." },
      { q: "Where is the coolest place to sit on a sunny beach?", choices: ["In the shade of an umbrella", "In the full sun", "On the hot sand"], answer: 0, hint: "Look for a shadow.", explain: "An umbrella blocks the sunlight, so its shade is cooler." },
      { q: "Does light bend around things?", choices: ["Yes, it curls around them", "No, it travels in straight lines"], answer: 1, hint: "That is why shadows happen.", explain: "Light travels in straight lines, so it cannot get round to the back of things. That makes shadows." }
    ]
  },

  // ───────────── Island 2: Coral Cove (about age 7–8) ─────────────
  {
    id: 'p2-sea-compass-magnets',
    subject: 'physics',
    floor: 2,
    realm: 'sea',
    title: "Magnets and the Ship's Compass",
    topic: 'magnets',
    topicName: 'Magnets',
    blurb: "Find out which things a magnet pulls, and why a compass needle points north.",
    reading: [
      { title: "Magnets pull", emoji: '🧲', text: "A magnet can pull some things toward it without touching them. Things made of iron or steel stick to a magnet." },
      { title: "Not all metals", emoji: '🥫', text: "Magnets do not pull every metal. An aluminium can does not stick. Wood, plastic and glass do not stick either." },
      { title: "The compass needle", emoji: '🧭', text: "A compass needle is a tiny magnet that can spin. The Earth acts like a giant magnet, so the needle swings round to point north and south." },
      { title: "A sailor's helper", emoji: '⛵', text: "Sailors use a compass to find their way, even on cloudy nights when they cannot see the stars." }
    ],
    sim: {
      id: 'magnet',
      setup: { items: ['paper-clip', 'steel-bolt', 'aluminium-can', 'wooden-block', 'iron-nail', 'plastic-toy'] },
      predict: {
        q: "A steel bolt from a boat sits on the table. Will the magnet pull it?",
        choices: ["Yes, it will stick", "No, it will not stick"],
        answer: 0,
        explain: "Steel is made mostly of iron, so the magnet pulls the bolt. The aluminium can, the wood and the plastic will not stick."
      }
    },
    quiz: [
      { q: "Which of these will stick to a magnet?", choices: ["A wooden oar", "An iron nail", "A plastic bucket"], answer: 1, hint: "Magnets pull iron and steel.", explain: "The iron nail sticks. Wood and plastic are not magnetic." },
      { q: "Will an aluminium can stick to a magnet?", choices: ["No", "Yes"], answer: 0, hint: "Not all metals are magnetic.", explain: "Aluminium is a metal, but it is not magnetic, so it does not stick." },
      { q: "What is a compass needle?", choices: ["A piece of string", "A sharp fish bone", "A tiny magnet that can spin"], answer: 2, hint: "It swings to point north.", explain: "A compass needle is a tiny magnet that can spin freely." },
      { q: "Which way does a compass needle point?", choices: ["Up and down", "North and south", "Toward the nearest fish"], answer: 1, hint: "Think of the directions on a map.", explain: "The needle lines up north and south with the Earth's magnetism." },
      { q: "Why might a sailor's compass point the wrong way?", choices: ["A big piece of iron is close to it", "The sea is too salty", "It is daytime"], answer: 0, hint: "What does a magnet pull?", explain: "Iron near a compass pulls on its needle and makes it point the wrong way." }
    ]
  },
  {
    id: 'p2-sea-whale-songs',
    subject: 'physics',
    floor: 2,
    realm: 'sea',
    title: "Whale Songs and Sea Sounds",
    topic: 'sound',
    topicName: 'Sound',
    blurb: "Twang a ruler to make high and low notes, like dolphins and whales.",
    reading: [
      { title: "Sound is shaking", emoji: '🔊', text: "Every sound is made by something shaking back and forth very fast. This shaking is called vibration." },
      { title: "High and low", emoji: '🐋', text: "Fast shaking makes a high sound, like a dolphin's whistle. Slow shaking makes a low sound, like the deep song of a big whale." },
      { title: "Loud and soft", emoji: '📢', text: "A big, strong shake makes a loud sound. A small, gentle shake makes a soft sound." },
      { title: "Sound in the sea", emoji: '🌊', text: "Sound travels through water even better than through air. Whale songs can travel a very long way under the sea." }
    ],
    sim: {
      id: 'sound',
      predict: {
        q: "You make more of the ruler stick out over the table, then twang it. How will the note sound?",
        choices: ["Higher", "Lower", "Just the same"],
        answer: 1,
        explain: "A longer ruler shakes more slowly, and slower shaking makes a lower note, like a big whale's song."
      }
    },
    quiz: [
      { q: "What makes a sound?", choices: ["Something shaking (vibrating)", "Something staying very still", "Something being painted"], answer: 0, hint: "Touch your throat while you hum.", explain: "Every sound comes from something vibrating." },
      { q: "A dolphin makes a high whistle. Is the shaking fast or slow?", choices: ["Slow", "Fast"], answer: 1, hint: "High notes come from quick shaking.", explain: "High sounds come from fast shaking." },
      { q: "You twang a ruler very hard. What happens to the sound?", choices: ["It gets quieter", "It stops", "It gets louder"], answer: 2, hint: "A bigger shake…", explain: "A harder twang makes a bigger shake, and a bigger shake makes a louder sound." },
      { q: "Can sound travel through water?", choices: ["No, water stops all sound", "Yes, whale songs travel far under the sea"], answer: 1, hint: "Whales talk to each other under the sea.", explain: "Sound travels very well through water. Whale songs can be heard a long way off." },
      { q: "A big whale sings a very low note. How is the sound shaking?", choices: ["Slowly", "Very fast", "Not at all"], answer: 0, hint: "Low notes come from…", explain: "Low notes come from slow shaking." }
    ]
  },

  // ───────────── Island 3: Turtle Lagoon (about age 8–9) ─────────────
  {
    id: 'p3-sea-sandy-slipway',
    subject: 'physics',
    floor: 3,
    realm: 'sea',
    title: "Rolling onto the Beach",
    topic: 'friction',
    topicName: 'Friction',
    blurb: "Roll a toy car down the boat ramp onto sand, wood or ice. Which stops it soonest?",
    reading: [
      { title: "Friction slows things", emoji: '🛑', text: "Friction is a force that happens when two surfaces rub together. It slows moving things down, and it can stop them." },
      { title: "Rough and smooth", emoji: '🏖️', text: "Rough, soft surfaces, like beach sand, cause lots of friction. Smooth surfaces, like ice, cause very little." },
      { title: "Hard work on sand", emoji: '🛒', text: "Wheels sink into soft sand and drag through it. That is why pushing a cart or a bike across the beach is such hard work!" },
      { title: "Friction helps too", emoji: '👟', text: "Without friction, you would slip on a wet boat deck. Sailors wear shoes with grippy soles to give them more friction." }
    ],
    sim: {
      id: 'ramp',
      setup: { surfaces: ['sand', 'wood', 'ice'] },
      predict: {
        q: "The toy car rolls down the ramp onto sand, wood or ice. On which one will it stop the soonest?",
        choices: ["Ice", "Wood", "Sand"],
        answer: 2,
        explain: "Sand causes the most friction, so the car stops soonest there. On smooth ice it rolls the farthest."
      }
    },
    quiz: [
      { q: "What is friction?", choices: ["A force from two surfaces rubbing together", "A kind of seashell", "A very fast wind"], answer: 0, hint: "Rub your hands together.", explain: "Friction is the force that happens when two surfaces rub together. It slows things down." },
      { q: "Which surface causes the least friction?", choices: ["Sand", "Ice", "Carpet"], answer: 1, hint: "Which one is the most slippery?", explain: "Ice is very smooth, so it causes the least friction." },
      { q: "Why is it hard to pull a cart across soft sand?", choices: ["Sand is magnetic", "The sea pulls the cart back", "The wheels sink in and the sand drags on them"], answer: 2, hint: "Think about what the wheels do in sand.", explain: "The wheels sink into the sand, and the sand rubs and drags on them: lots of friction." },
      { q: "Why do sailors wear shoes with grippy soles on a wet deck?", choices: ["To go faster", "More friction stops them slipping", "To keep their feet warm"], answer: 1, hint: "A wet deck is slippery.", explain: "Grippy soles give more friction, so the sailors do not slip." },
      { q: "A sled gets the same push on ice and on sand. Where does it slide farther?", choices: ["On ice", "On sand"], answer: 0, hint: "Less friction means less slowing down.", explain: "Ice has less friction than sand, so the sled slides farther on ice." }
    ]
  },
  {
    id: 'p3-sea-buoy-lights',
    subject: 'physics',
    floor: 3,
    realm: 'sea',
    title: "Lights for the Harbour",
    topic: 'electric-circuits',
    topicName: 'Electric circuits',
    blurb: "Light up a harbour buoy's lamp: which things let electricity through?",
    reading: [
      { title: "A full loop", emoji: '🔁', text: "Electricity needs a complete loop, called a circuit. It flows from the battery, through the bulb and back again. If there is a gap, the bulb stays dark." },
      { title: "Conductors", emoji: '🔌', text: "Metals like copper, iron and aluminium let electricity flow through them. We call them conductors." },
      { title: "Insulators", emoji: '🧤', text: "Plastic, rubber, wood and paper do not let electricity through. They are insulators. Wires are covered in plastic to keep us safe." },
      { title: "Lights at sea", emoji: '🚨', text: "Buoys and lighthouses use circuits to flash their lamps at night, so boats can see where it is safe to go. Many buoys have solar panels to charge their batteries in the daytime." }
    ],
    sim: {
      id: 'circuit',
      setup: { items: ['iron-nail', 'aluminium-foil', 'eraser', 'plastic-straw', 'copper-wire', 'paper-strip'] },
      predict: {
        q: "You bridge the gap with an iron nail. Will the bulb light up?",
        choices: ["No, it stays dark", "Yes, it lights up"],
        answer: 1,
        explain: "An iron nail is made of metal, so it is a conductor. It completes the loop and the bulb lights."
      }
    },
    quiz: [
      { q: "What does a circuit need for the bulb to light?", choices: ["A complete loop with no gaps", "A gap in the middle", "Lots of water"], answer: 0, hint: "Electricity must get all the way round.", explain: "Electricity only flows when the loop is complete, with no gaps." },
      { q: "Which of these is a conductor?", choices: ["A rubber band", "Copper wire", "A plastic straw"], answer: 1, hint: "Look for a metal.", explain: "Copper is a metal, so it conducts electricity. Rubber and plastic are insulators." },
      { q: "Why are electric wires covered in plastic?", choices: ["Plastic makes electricity faster", "To make the wires heavier", "Plastic is an insulator, so it keeps us safe"], answer: 2, hint: "Does plastic let electricity through?", explain: "Plastic does not let electricity through, so the covering keeps it inside the wire and keeps us safe." },
      { q: "A wire on a buoy comes loose and leaves a gap. What happens to the lamp?", choices: ["It gets brighter", "The electricity stops and the lamp goes out", "Nothing changes"], answer: 1, hint: "Is the loop still complete?", explain: "A gap breaks the circuit, so electricity stops flowing and the lamp goes out." },
      { q: "Which of these is an insulator?", choices: ["A wooden stick", "Aluminium foil", "An iron nail"], answer: 0, hint: "Which one is not a metal?", explain: "Wood is an insulator. Aluminium and iron are metals, so they are conductors." }
    ]
  },

  // ───────────── Island 4: Lighthouse Point (about age 9–10) ─────────────
  {
    id: 'p4-sea-dock-levers',
    subject: 'physics',
    floor: 4,
    realm: 'sea',
    title: "Levers on the Dock",
    topic: 'levers',
    topicName: 'Levers',
    blurb: "Balance loads like the dock workers and find out why distance is a superpower.",
    reading: [
      { title: "What is a lever?", emoji: '🛶', text: "A lever is a stiff bar that turns around a fixed point called the pivot. An oar is a lever: it turns in the holder on the side of the rowing boat." },
      { title: "Weight and distance", emoji: '📏', text: "How much a weight turns a lever depends on how heavy it is and how far it is from the pivot. Far from the pivot, even a small weight has a big turning effect." },
      { title: "The balance rule", emoji: '🧮', text: "A lever balances when weight × distance is the same on both sides. 1 kg 4 steps out balances 2 kg 2 steps out, because 1 × 4 = 2 × 2." },
      { title: "Cranes and crowbars", emoji: '🏗️', text: "Dock cranes carry heavy counterweights to balance the loads they lift. A long crowbar lets one worker lift the lid off a heavy crate." }
    ],
    sim: {
      id: 'lever',
      predict: {
        q: "A 2 kg crate sits 2 steps from the pivot on the left. Where should a 1 kg weight go on the right to balance it?",
        choices: ["1 step out", "2 steps out", "4 steps out"],
        answer: 2,
        explain: "2 kg × 2 steps = 4, and 1 kg × 4 steps = 4. Both sides match, so it balances."
      }
    },
    quiz: [
      { q: "What is the fixed point a lever turns around called?", choices: ["The pivot", "The load", "The handle"], answer: 0, hint: "On a seesaw, it is the part in the middle.", explain: "A lever turns around its pivot, also called the fulcrum." },
      { q: "A 3 kg box is 1 step from the pivot. Where must a 1 kg weight go on the other side to balance it?", choices: ["1 step out", "3 steps out", "4 steps out"], answer: 1, hint: "Make weight × distance the same on both sides.", explain: "3 kg × 1 step = 3, and 1 kg × 3 steps = 3. It balances." },
      { q: "To lift a heavy crate lid with a crowbar, where should you push?", choices: ["Close to the pivot", "Far from the pivot, at the end of the bar"], answer: 1, hint: "Distance is a superpower.", explain: "Pushing far from the pivot gives a big turning effect, so a small push lifts a heavy lid." },
      { q: "Why does a dock crane have a heavy counterweight?", choices: ["To make it look nice", "To scare the seagulls", "To balance the heavy loads it lifts"], answer: 2, hint: "Think of a seesaw.", explain: "The counterweight balances the load on the other side, so the crane does not tip over." },
      { q: "2 kg sits 3 steps out on the left. Which of these balances it on the right?", choices: ["3 kg at 2 steps", "2 kg at 2 steps", "1 kg at 3 steps"], answer: 0, hint: "2 × 3 = ?", explain: "2 × 3 = 6, and 3 × 2 = 6. Both sides match, so 3 kg at 2 steps balances it." }
    ]
  },
  {
    id: 'p4-sea-water-cycle',
    subject: 'physics',
    floor: 4,
    realm: 'sea',
    title: "Ice, Sea and Clouds",
    topic: 'states-of-matter',
    topicName: 'States of matter',
    blurb: "Heat and cool water to see ice, water and steam, then follow the water cycle over the sea.",
    reading: [
      { title: "Three states", emoji: '🧊', text: "Water can be a solid (ice), a liquid (water) or a gas (water vapour, like steam). These are called the three states of matter." },
      { title: "Melting and freezing", emoji: '🌡️', text: "Fresh water freezes into ice at 0 °C, and ice melts back into water above 0 °C. Salty seawater has to get a bit colder, about −2 °C, before it freezes." },
      { title: "Boiling and evaporating", emoji: '☁️', text: "At 100 °C, water boils fast into steam. But the warm Sun also turns seawater into vapour slowly, with no boiling. This is called evaporation, and the salt stays behind in the sea." },
      { title: "The water cycle", emoji: '🌧️', text: "Water vapour rises, cools and turns back into tiny drops that form clouds. This is condensation. The drops fall as rain, rivers carry the water back to the sea, and the cycle starts again." }
    ],
    sim: {
      id: 'states',
      predict: {
        q: "You start with ice at −10 °C and heat it. At what temperature will the ice start to melt?",
        choices: ["0 °C", "100 °C", "−10 °C"],
        answer: 0,
        explain: "Ice melts at 0 °C. The temperature stays at 0 °C until all the ice has melted, then the water warms up again."
      }
    },
    quiz: [
      { q: "What are the three states of water?", choices: ["Salt, sand and shells", "Ice, liquid water and water vapour", "Hot, warm and cold"], answer: 1, hint: "Solid, liquid and gas.", explain: "Water can be solid ice, liquid water or the gas water vapour." },
      { q: "At what temperature does fresh water boil at sea level?", choices: ["50 °C", "0 °C", "100 °C"], answer: 2, hint: "It is a big round number.", explain: "At sea level, water boils at 100 °C." },
      { q: "The Sun warms the sea and some water turns into vapour, with no boiling. What is this called?", choices: ["Evaporation", "Freezing", "Melting"], answer: 0, hint: "It is how puddles dry up too.", explain: "Water slowly turning into vapour without boiling is called evaporation." },
      { q: "When seawater evaporates, what stays behind?", choices: ["The clouds", "The salt", "The steam"], answer: 1, hint: "Why is rain not salty?", explain: "Only the water evaporates. The salt stays behind, so rain is fresh water." },
      { q: "Water vapour cools high in the sky and turns into tiny drops. What is this called?", choices: ["Condensation", "Evaporation", "Melting"], answer: 0, hint: "It is how clouds form.", explain: "When vapour cools and turns back into liquid drops, it is called condensation." }
    ]
  },

  // ───────────── Island 5: Pearl Reef (about age 10–11) ─────────────
  {
    id: 'p5-sea-periscope',
    subject: 'physics',
    floor: 5,
    realm: 'sea',
    title: "Mirrors and Periscopes",
    topic: 'reflection',
    topicName: 'Reflection of light',
    blurb: "Bounce a beam of light around a corner, like a submarine's periscope.",
    reading: [
      { title: "Light bounces", emoji: '🪞', text: "When light hits a mirror, it bounces off. This is called reflection. Smooth, shiny surfaces, like mirrors and very calm water, reflect light well." },
      { title: "Angle in = angle out", emoji: '📐', text: "Imagine a line sticking straight out of the mirror, at right angles to it: the normal. A beam that hits the mirror 40° from the normal bounces off 40° from the normal, on the other side." },
      { title: "The periscope", emoji: '🔭', text: "A periscope has two mirrors, each tilted at 45°. Light from above bounces off the top mirror, down the tube, off the bottom mirror and into your eye. Submarines have used periscopes to see above the waves." },
      { title: "Lighthouse beams", emoji: '🗼', text: "Early lighthouses put curved mirrors behind their lamps to send a strong beam far out to sea. Later, big glass lenses did the job even better." }
    ],
    sim: {
      id: 'mirror',
      predict: {
        q: "A light beam hits the mirror 45° from the normal. At what angle from the normal will it bounce off?",
        choices: ["90°", "45°", "0°"],
        answer: 1,
        explain: "The angle of reflection always equals the angle of incidence: 45° in, 45° out. Together that turns the beam through 90°, which is why periscope mirrors are tilted at 45°."
      }
    },
    quiz: [
      { q: "What is it called when light bounces off a mirror?", choices: ["Reflection", "Evaporation", "Friction"], answer: 0, hint: "You see your reflection in a mirror.", explain: "Light bouncing off a surface is called reflection." },
      { q: "A beam hits a mirror 25° from the normal. At what angle from the normal does it reflect?", choices: ["50°", "25°", "65°"], answer: 1, hint: "Angle in = angle out.", explain: "The angle of reflection equals the angle of incidence, so it reflects at 25°." },
      { q: "How many mirrors does a simple periscope have?", choices: ["1", "3", "2"], answer: 2, hint: "One at the top, one at the bottom.", explain: "A simple periscope has 2 mirrors, one at each end of the tube." },
      { q: "Why are the mirrors in a periscope tilted at 45°?", choices: ["So they don't get wet", "So the light turns a 90° corner at each mirror", "So the picture is upside down"], answer: 1, hint: "45° in plus 45° out.", explain: "At 45°, each mirror turns the light through 90°, so it travels down the tube and then out to your eye." },
      { q: "On a still day, you can see the palm trees reflected in the lagoon. Why?", choices: ["Calm water is smooth, so it reflects light like a mirror", "The trees are under the water", "The water makes its own light"], answer: 0, hint: "What do mirrors and still water have in common?", explain: "Calm water has a smooth surface, so it reflects light neatly, like a mirror." }
    ]
  },
  {
    id: 'p5-sea-swinging-lanterns',
    subject: 'physics',
    floor: 5,
    realm: 'sea',
    title: "Swinging Lanterns",
    topic: 'pendulums',
    topicName: 'Pendulums',
    blurb: "Time a ship's swinging lantern and find out what changes its rhythm.",
    reading: [
      { title: "A pendulum", emoji: '🏮', text: "A pendulum is a weight hanging on a string or rod that swings back and forth. A lantern hanging from a ship's ceiling swings like one when the ship rolls." },
      { title: "The period", emoji: '⏱️', text: "The time for one full swing, there and back, is called the period. A pendulum keeps a very steady rhythm, so pendulums were used in clocks for hundreds of years." },
      { title: "Length is what counts", emoji: '📏', text: "A longer string makes a slower swing with a longer period. A heavier weight does not change the period at all!" },
      { title: "Rocking boats", emoji: '🛥️', text: "Boats rock with their own rhythm too. When waves arrive in time with a boat's rocking, each wave adds a little push, and the boat rocks more and more, like a swing pushed at just the right moment." }
    ],
    sim: {
      id: 'pendulum',
      predict: {
        q: "Pendulum A has a short string and pendulum B has a long string. Which one takes longer for each swing?",
        choices: ["A, the short one", "B, the long one", "They take the same time"],
        answer: 1,
        explain: "A longer string means a longer period. In the lab, a 2.0 m string takes about 2.8 s for each swing, but a 0.5 m string takes only about 1.4 s."
      }
    },
    quiz: [
      { q: "What is the period of a pendulum?", choices: ["The time for one full swing, there and back", "How heavy the weight is", "How long the string is"], answer: 0, hint: "It is measured in seconds.", explain: "The period is the time for one full swing, there and back." },
      { q: "You make a lantern's string longer. What happens to its swing?", choices: ["It swings faster", "It swings more slowly", "It stops"], answer: 1, hint: "Think of pendulum B in the lab.", explain: "A longer string gives a longer period, so the lantern swings more slowly." },
      { q: "You swap a light weight for a heavy one but keep the same string. What happens to the period?", choices: ["It gets longer", "It gets shorter", "It stays the same"], answer: 2, hint: "Only one thing changes the period.", explain: "The period depends on the length of the string, not on the weight." },
      { q: "Why were pendulums used in clocks?", choices: ["They are very colourful", "They keep a very steady rhythm", "They never need winding"], answer: 1, hint: "A clock must tick at the same speed all day.", explain: "Each swing takes the same time, so a pendulum keeps steady time." },
      { q: "Waves keep arriving in time with a boat's rocking. What happens?", choices: ["The boat rocks more and more", "The boat stops rocking", "The boat sinks straight away"], answer: 0, hint: "Think of pushing a swing at just the right moment.", explain: "Each wave adds a push in time with the rocking, so the rocking grows bigger and bigger." }
    ]
  },

  // ───────────── Island 6: Whale Bay (about age 11–12) ─────────────
  {
    id: 'p6-sea-speed-race',
    subject: 'physics',
    floor: 6,
    realm: 'sea',
    title: "Sea Speed Race",
    topic: 'speed',
    topicName: 'Speed, distance and time',
    blurb: "Race a sailfish against a sea turtle: distance = speed × time.",
    reading: [
      { title: "What is speed?", emoji: '🏁', text: "Speed tells you how far something goes in a certain time. A speed of 3 m/s means 3 metres every second." },
      { title: "The formula", emoji: '🧮', text: "Distance = speed × time. Speed = distance ÷ time. Time = distance ÷ speed. If you know two of them, you can find the third." },
      { title: "Fast and slow swimmers", emoji: '🐟', text: "Sailfish are often called the fastest fish in the sea, and they can dash at several metres per second. A sea turtle usually cruises much more slowly, at about 1 m/s or less." },
      { title: "Knots at sea", emoji: '⛵', text: "At sea, speed is often measured in knots. 1 knot is 1 nautical mile (1,852 m) per hour, which is about 0.5 m/s." }
    ],
    sim: {
      id: 'race',
      predict: {
        q: "In the lab, cart A (the turtle) goes at 3 m/s and cart B (the sailfish) at 6 m/s. They race for 4 seconds. How far does cart A travel?",
        choices: ["24 metres", "12 metres", "7 metres"],
        answer: 1,
        explain: "Distance = speed × time = 3 m/s × 4 s = 12 metres. Cart B, twice as fast, goes 6 × 4 = 24 metres."
      }
    },
    quiz: [
      { q: "A dolphin swims at 5 m/s for 6 seconds. How far does it go?", choices: ["11 m", "30 m", "1.2 m"], answer: 1, hint: "Distance = speed × time.", explain: "5 m/s × 6 s = 30 m." },
      { q: "A boat travels 120 m in 20 seconds. What is its speed?", choices: ["6 m/s", "100 m/s", "2,400 m/s"], answer: 0, hint: "Speed = distance ÷ time.", explain: "120 m ÷ 20 s = 6 m/s." },
      { q: "A turtle swims 40 m at 0.5 m/s. How long does it take?", choices: ["20 s", "40.5 s", "80 s"], answer: 2, hint: "Time = distance ÷ speed.", explain: "40 m ÷ 0.5 m/s = 80 s. At half a metre a second, it takes 2 seconds for each metre." },
      { q: "Which is faster: a fish that swims 30 m in 10 s, or a crab that walks 2 m in 4 s?", choices: ["The crab", "The fish", "They are the same speed"], answer: 1, hint: "Work out each speed in m/s.", explain: "The fish goes 30 ÷ 10 = 3 m/s. The crab goes 2 ÷ 4 = 0.5 m/s. The fish is faster." },
      { q: "A ship sails at 10 knots. 1 knot is about 0.5 m/s. About how fast is the ship in m/s?", choices: ["About 5 m/s", "About 20 m/s", "About 10 m/s"], answer: 0, hint: "Multiply 10 by 0.5.", explain: "10 × 0.5 = 5, so the ship goes about 5 m/s." }
    ]
  },
  {
    id: 'p6-sea-streamlined',
    subject: 'physics',
    floor: 6,
    realm: 'sea',
    title: "Streamlined Shapes",
    topic: 'drag',
    topicName: 'Drag in air and water',
    blurb: "Why are fish, dolphins and submarines smooth and pointed? Drop paper and find out.",
    reading: [
      { title: "Drag", emoji: '🌬️', text: "When something moves through air or water, the air or water pushes back on it. This push is called drag; in air it is also called air resistance. It slows moving things down." },
      { title: "Water is thicker", emoji: '🌊', text: "Water is about 800 times denser than air, so drag in water is much stronger. That is why running through the sea is so much harder than running along the beach." },
      { title: "Shape matters", emoji: '🐬', text: "A flat, wide shape has to push lots of water or air out of the way, so it feels lots of drag. A smooth, pointed, streamlined shape slips through easily. Dolphins, tuna and submarines are all streamlined." },
      { title: "Same paper, different shape", emoji: '📄', text: "A flat sheet of paper and a crumpled ball of the same paper weigh the same. Only their shape is different, so any difference in how they fall must come from drag." }
    ],
    sim: {
      id: 'drop',
      setup: { objects: ['paper', 'crumpled-paper'], air: 'on' },
      predict: {
        q: "You drop a flat sheet of paper and a crumpled ball of the same paper at the same time. Which lands first?",
        choices: ["The flat sheet", "The crumpled ball", "They land together"],
        answer: 1,
        explain: "They weigh the same, but the flat sheet is wide, so the air pushes back on it much more. The small, crumpled ball feels less drag and lands first."
      }
    },
    quiz: [
      { q: "What is drag?", choices: ["A push from air or water that slows a moving thing", "A pull from a magnet", "A kind of fishing net"], answer: 0, hint: "You feel it when you wade through the sea.", explain: "Drag is the push from air or water that acts against a moving object and slows it down." },
      { q: "Why is it harder to run through the sea than along the sand?", choices: ["The sea is uphill", "Water is much denser than air, so the drag is much stronger", "The sand pushes you forward"], answer: 1, hint: "Compare water and air.", explain: "Water is about 800 times denser than air, so it pushes back much harder." },
      { q: "Which shape slips through water most easily?", choices: ["A flat board facing forward", "A wide open umbrella", "A smooth, pointed shape like a dolphin"], answer: 2, hint: "Think of the fastest swimmers.", explain: "A smooth, pointed, streamlined shape has the least drag." },
      { q: "A flat sheet and a crumpled ball of the same paper weigh the same. Why does the ball land first?", choices: ["It is heavier", "Its shape gives it less drag", "Gravity pulls it harder"], answer: 1, hint: "Only the shape is different.", explain: "Both weigh the same and gravity pulls them the same. The ball's small shape gives it much less drag." },
      { q: "A diver spreads her arms and legs out wide. What happens to the drag on her?", choices: ["It goes up", "It goes down", "It stays the same"], answer: 0, hint: "Is she more streamlined or less?", explain: "Spreading out makes her wider and less streamlined, so the water pushes back harder: more drag." }
    ]
  },

  // ───────────── Island 7: Deep Blue Station (about age 12–13) ─────────────
  {
    id: 'p7-sea-tides',
    subject: 'physics',
    floor: 7,
    realm: 'sea',
    title: "The Moon and the Tides",
    topic: 'tides',
    topicName: 'Tides and the Moon',
    blurb: "Launch a moon into orbit, then see how the real Moon pulls the sea up and down.",
    reading: [
      { title: "Gravity reaches the sea", emoji: '🌕', text: "The Moon's gravity pulls on everything on Earth, including the oceans. It pulls hardest on the side of the Earth facing it, and least on the far side." },
      { title: "Two bulges", emoji: '🌊', text: "This difference in pull stretches the oceans into two bulges: one facing the Moon and one on the opposite side. As the Earth spins through both bulges, most coasts get two high tides and two low tides a day, with high tides about 12 hours 25 minutes apart." },
      { title: "Why the timing shifts", emoji: '🕐', text: "The Moon moves along its orbit while the Earth spins, so the Earth needs about 24 hours 50 minutes to face the Moon again. That is why each high tide comes about 50 minutes later than the day before." },
      { title: "Spring and neap tides", emoji: '☀️', text: "The Sun raises tides too, but less than half as much as the Moon. When the Sun, Moon and Earth line up, at new moon and full moon, tides are extra big: spring tides. At half moon they partly cancel out: neap tides." }
    ],
    sim: {
      id: 'orbit',
      predict: {
        q: "You launch the moon sideways much too fast. What will happen?",
        choices: ["It crashes into the planet", "It escapes and flies off into space", "It stops still in the sky"],
        answer: 1,
        explain: "With too much sideways speed, gravity can bend its path but cannot hold on to it, so it escapes. Our Moon has just the right speed to keep circling the Earth, and its pull keeps the tides going."
      }
    },
    quiz: [
      { q: "What mainly causes the tides in the ocean?", choices: ["The Moon's gravity", "Wind blowing the water", "Whales swimming"], answer: 0, hint: "Something in the sky pulls on the sea.", explain: "The Moon's gravity, pulling harder on the near side of the Earth than the far side, causes the tides." },
      { q: "About how many high tides do most coasts get each day?", choices: ["One", "Two", "Six"], answer: 1, hint: "There are two bulges.", explain: "The Earth spins through two bulges of water each day, so most coasts get two high tides." },
      { q: "High tide is at 9:00 this morning. At about what time will it be tomorrow morning?", choices: ["9:00", "8:10", "9:50"], answer: 2, hint: "Each high tide comes about 50 minutes later than the day before.", explain: "The Earth takes about 24 hours 50 minutes to face the Moon again, so tomorrow's high tide is at about 9:50." },
      { q: "When are spring tides, the biggest tides, most likely?", choices: ["At half moon", "At new moon and full moon, when the Sun, Moon and Earth line up", "Only in spring"], answer: 1, hint: "Their name has nothing to do with the season.", explain: "When the Sun and Moon pull in a line, their tides add up, giving extra-big spring tides." },
      { q: "Why doesn't the Moon fall into the Earth?", choices: ["Its sideways speed keeps it falling around the Earth", "There is no gravity in space", "The Sun's light holds it up"], answer: 0, hint: "Remember the moon you launched in the lab.", explain: "The Moon is falling toward the Earth all the time, but its sideways speed carries it around, so it keeps missing: that is an orbit." }
    ]
  },
  {
    id: 'p7-sea-buoyancy',
    subject: 'physics',
    floor: 7,
    realm: 'sea',
    title: "Archimedes and the Iceberg",
    topic: 'buoyancy',
    topicName: 'Buoyancy and density',
    blurb: "Why does most of an iceberg hide under water? Use density to predict what floats.",
    reading: [
      { title: "Archimedes' principle", emoji: '🛁', text: "Anything in water is pushed up by a force called buoyancy, or upthrust. Archimedes found that this push equals the weight of the water the object pushes aside (displaces)." },
      { title: "Density decides", emoji: '⚖️', text: "Density is mass ÷ volume. Fresh water has a density of 1 g/cm³. Anything with a lower average density floats; anything higher sinks. Candle wax is about 0.9 g/cm³, so it floats. Glass is about 2.5 g/cm³, so it sinks." },
      { title: "The tip of the iceberg", emoji: '🧊', text: "Ice has a density of about 0.92 g/cm³, a little less than seawater's 1.03 g/cm³. So an iceberg floats with only about a tenth of it above the surface, and about 90% hidden below." },
      { title: "Ships and submarines", emoji: '🔱', text: "A steel ship floats because its hull holds lots of air, so its average density is less than water's. A submarine lets water into tanks to sink, and blows them full of air to rise again." }
    ],
    sim: {
      id: 'float',
      setup: { items: ['candle-wax', 'glass-marble', 'ice-cube', 'metal-spoon', 'cork', 'apple'] },
      predict: {
        q: "Candle wax has a density of about 0.9 g/cm³, and a glass marble about 2.5 g/cm³. Which will float in the tank of fresh water (1 g/cm³)?",
        choices: ["The glass marble", "Both of them", "The candle wax"],
        answer: 2,
        explain: "Only things less dense than the water float. Wax, at 0.9 g/cm³, is less dense than water at 1 g/cm³, so it floats. Glass, at 2.5 g/cm³, sinks."
      }
    },
    quiz: [
      { q: "A block has a mass of 60 g and a volume of 100 cm³. What is its density, and does it float in fresh water?", choices: ["0.6 g/cm³, so it floats", "1.67 g/cm³, so it sinks", "6 g/cm³, so it sinks"], answer: 0, hint: "Density = mass ÷ volume.", explain: "60 ÷ 100 = 0.6 g/cm³. That is less than water's 1 g/cm³, so it floats." },
      { q: "About how much of an iceberg is hidden below the surface?", choices: ["About 10%", "About 50%", "About 90%"], answer: 2, hint: "Ice is only a little less dense than seawater.", explain: "Ice (0.92 g/cm³) is nearly as dense as seawater (1.03 g/cm³), so about 90% of an iceberg is under water." },
      { q: "A floating boat pushes aside 500 kg of water. Using Archimedes' principle, how much does the boat weigh?", choices: ["5 kg", "500 kg", "50,000 kg"], answer: 1, hint: "A floating object's weight is balanced by the buoyancy.", explain: "When something floats, buoyancy equals its weight, and buoyancy equals the weight of water displaced: 500 kg." },
      { q: "How does a submarine make itself sink?", choices: ["It lets water into its tanks, so its average density goes up", "It switches its lights off", "It turns its propeller backwards"], answer: 0, hint: "Think about density.", explain: "Filling tanks with water makes the submarine heavier for its size, so its average density rises above the water's and it sinks." },
      { q: "Why can a steel ship float when a steel spoon sinks?", choices: ["The ship is made of a lighter kind of steel", "The hull holds lots of air, so the ship's average density is less than water's", "The sea is saltier under ships"], answer: 1, hint: "Think about the whole ship, air and all.", explain: "The ship's steel shell surrounds a lot of air, so the ship as a whole is less dense than water. A solid spoon is all steel, so it sinks." }
    ]
  }
];

export const SEA_LESSONS = [...SEA_MATH, ...SEA_HISTORY, ...SEA_PHYSICS];
