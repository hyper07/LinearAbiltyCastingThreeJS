/**
 * The Great Tree's lessons (the forest realm, maps.js): seven rings of the
 * tree, each with Forest Math, Forest History and the Nature Lab (physics)
 * — the same three kinds of lesson as the land, all-new forest and nature
 * stories. Every lesson has realm: 'forest'; its floor is its ring (1–7), and
 * its stars open the tree's rings, never the mountain's floors or the islands.
 */

/*
 * Rings: 1 Root Hollow 🍄, 2 Fern Boughs 🌿, 3 Lantern Branches 🏮,
 * 4 Blossom Canopy 🌸, 5 Nest Heights 🪺, 6 Sunflower Rings 🌼, 7 Starlight Crown ✨.
 *
 * Forest Math uses the land's chalkboard and practice generators for the same
 * floor (math.js), but its check is a fixed set of written forest word problems.
 */

/* ------------------------------------------------------------ Forest Math */

/** A Forest Math lesson: the land generator `gen` draws the board and the practice; the quiz is written. */
const M = (id, floor, title, gen, topicName, blurb, kind, reading, quiz) => ({
  id, subject: 'math', floor, realm: 'forest', title, topic: gen, topicName, blurb, reading,
  board: { gen }, practice: { kind, gen }, quiz
});

const FOREST_MATH = [
  // ───────────── Ring 1: Root Hollow (about age 6–7) ─────────────
  M('m1-forest-seed-sorting', 1, "Sorting Seeds", 'count', 'Counting', "Help the mice of Root Hollow count seeds, one by one and in fives.", 'count', [
    { title: "Count each seed once", emoji: '🌰', text: "The mice of Root Hollow sort seeds into piles. Touch each seed once and say one number. The last number you say tells you how many seeds there are." },
    { title: "Piles of five", emoji: '🖐️', text: "The mice put seeds in piles of 5. Then they count 5, 10, 15, 20. Counting in fives is quick!" },
    { title: "Line them up", emoji: '🐭', text: "Put the seeds in a line before you count them. Then it is easy to see which ones you have counted and which ones you have not." }
  ], [
    { q: "A mouse finds these acorns: 🌰🌰🌰🌰🌰🌰🌰🌰. How many acorns are there?", choices: ["8", "7", "9"], answer: 0, hint: "Touch each acorn once as you count.", explain: "1, 2, 3, 4, 5, 6, 7, 8. There are 8 acorns." },
    { q: "The mice make 3 piles of 5 seeds. How many seeds is that?", choices: ["8", "15", "10"], answer: 1, hint: "Count in fives, 3 times.", explain: "5, 10, 15. Three piles of 5 make 15 seeds." },
    { q: "Count the mushrooms: 🍄🍄🍄🍄🍄🍄🍄🍄🍄🍄🍄. How many mushrooms are there?", choices: ["10", "12", "11"], answer: 2, hint: "Count the first 10, then keep going.", explain: "10, then 11. There are 11 mushrooms." },
    { q: "A mouse counts seeds: 17, 18, 19. What number comes next?", choices: ["20", "21", "10"], answer: 0, hint: "What number comes just after 19?", explain: "After 19 comes 20." },
    { q: "Pip has 2 piles of 5 seeds and 3 more seeds. How many seeds does Pip have?", choices: ["10", "8", "15", "13"], answer: 3, hint: "Count in fives first: 5, 10. Then count on 3 more.", explain: "5, 10, then 11, 12, 13. Pip has 13 seeds." }
  ]),
  M('m1-forest-acorns-taken', 1, "Acorns Taken Away", 'sub10', 'Subtracting within 10', "Squirrels and the wind take things away. How many are left?", 'numberline', [
    { title: "Taking away", emoji: '➖', text: "Taking away means some go away. There are 6 acorns, and a squirrel takes 2. Now there are 4 acorns left." },
    { title: "Hop back", emoji: '🐭', text: "Start at the first number on the number line. Hop back once for each one taken away. Where you land is how many are left." },
    { title: "Check by adding", emoji: '🔄', text: "If 7 take away 3 is 4, then 4 add 3 should make 7 again. It does! Adding back is a good way to check." }
  ], [
    { q: "There are 8 acorns under the oak tree. A squirrel takes 3. How many acorns are left?", choices: ["5", "4", "11"], answer: 0, hint: "Start at 8 and hop back 3.", explain: "8 − 3 = 5. There are 5 acorns left." },
    { q: "7 leaves hang on a twig. The wind blows 2 of them away. How many leaves are left?", choices: ["9", "6", "5"], answer: 2, hint: "Start at 7 and hop back 2.", explain: "7 − 2 = 5. There are 5 leaves left on the twig." },
    { q: "A mouse has 10 seeds. She eats 4 of them. How many seeds does she have now?", choices: ["5", "6", "14"], answer: 1, hint: "Start at 10 and hop back 4.", explain: "10 − 4 = 6. She has 6 seeds left." },
    { q: "6 snails sit on a log. All 6 slide away. How many snails are left on the log?", choices: ["0", "6", "12"], answer: 0, hint: "If all of them go, what is left?", explain: "6 − 6 = 0. There are no snails left on the log." },
    { q: "9 ladybirds sit on a leaf. 5 fly away. How many are still on the leaf?", choices: ["3", "14", "4", "5"], answer: 2, hint: "Start at 9 and hop back 5.", explain: "9 − 5 = 4. There are 4 ladybirds still on the leaf." }
  ]),

  // ───────────── Ring 2: Fern Boughs (about age 7–8) ─────────────
  M('m2-forest-hedgehog-columns', 2, "Hedgehog Column Adding", 'add-carry', 'Column addition', "Add up the hedgehogs' beetles and berries in columns, and carry the ten.", 'column', [
    { title: "Ones under ones", emoji: '📏', text: "Write the numbers one under the other. Ones go under ones, and tens go under tens." },
    { title: "Start with the ones", emoji: '🦔', text: "A hedgehog finds 27 berries, then 15 more. Add the ones first: 7 + 5 = 12 ones." },
    { title: "Carry the ten", emoji: '🌿', text: "12 ones is 1 ten and 2 ones. Write the 2, and carry the 1 ten over to the tens. Then 2 + 1 + 1 = 4 tens. So 27 + 15 = 42." }
  ], [
    { q: "A hedgehog eats 38 beetles on Monday and 24 on Tuesday. How many beetles is that?", choices: ["52", "62", "512"], answer: 1, hint: "Add the ones first: 8 + 4.", explain: "8 + 4 = 12: write 2 and carry 1. Then 3 + 2 + 1 = 6 tens. 38 + 24 = 62 beetles." },
    { q: "One fern has 46 little leaves. Another fern has 37. How many little leaves is that in all?", choices: ["83", "73", "713"], answer: 0, hint: "6 + 7 is more than 10, so you will carry.", explain: "6 + 7 = 13: write 3 and carry 1. Then 4 + 3 + 1 = 8 tens. 46 + 37 = 83." },
    { q: "A big sunflower can have 34 seed spirals going one way and 55 going the other way. How many spirals is that in all?", choices: ["79", "98", "89"], answer: 2, hint: "Add the ones, then the tens. Do you need to carry this time?", explain: "4 + 5 = 9 ones, so there is nothing to carry. 3 + 5 = 8 tens. 34 + 55 = 89 spirals." },
    { q: "The hedgehogs collect 19 snails and 19 worms. How many is that?", choices: ["28", "218", "39", "38"], answer: 3, hint: "9 + 9 = 18. Write the 8 and carry the 1.", explain: "9 + 9 = 18: write 8 and carry 1. Then 1 + 1 + 1 = 3 tens. 19 + 19 = 38." },
    { q: "You work out 45 + 28 in columns. What digit do you write in the ones column?", choices: ["13", "3", "1"], answer: 1, hint: "5 + 8 = 13. What happens to the ten?", explain: "5 + 8 = 13. Write the 3 in the ones column and carry the 1 ten. The answer is 73." }
  ]),
  M('m2-forest-fern-skip', 2, "Fern Bough Skip Counting", 'skip-count', 'Counting in 2s, 5s and 10s', "Count footprints in twos, petals in fives and fern leaves in tens.", 'numberline', [
    { title: "Footprints in pairs", emoji: '🦔', text: "Hedgehog footprints come in pairs. Count them in twos: 2, 4, 6, 8, 10." },
    { title: "Five petals", emoji: '🌸', text: "Lots of flowers, like wild roses and apple blossoms, have 5 petals. To count the petals on many flowers, count in fives: 5, 10, 15, 20." },
    { title: "Bundles of ten", emoji: '🌿', text: "The hedgehogs tie fern leaves in bundles of 10. Count the bundles in tens: 10, 20, 30, 40. Every number ends in 0." }
  ], [
    { q: "Each wild rose has 5 petals. How many petals do 4 wild roses have?", choices: ["9", "20", "25"], answer: 1, hint: "Count in fives 4 times.", explain: "5, 10, 15, 20. Four wild roses have 20 petals." },
    { q: "Count the hedgehog footprints in twos: 6, 8, 10, 12. What comes next?", choices: ["13", "16", "14"], answer: 2, hint: "Hop 2 more from 12.", explain: "12 + 2 = 14. The next number is 14." },
    { q: "There are 3 bundles of 10 fern leaves. How many leaves is that?", choices: ["30", "13", "40"], answer: 0, hint: "Count in tens 3 times.", explain: "10, 20, 30. Three bundles hold 30 leaves." },
    { q: "5 birds sit on a branch. Each bird has 2 wings. How many wings is that?", choices: ["7", "12", "8", "10"], answer: 3, hint: "Count in twos 5 times.", explain: "2, 4, 6, 8, 10. Five birds have 10 wings." },
    { q: "Count in tens: 40, 50, 60. What comes next?", choices: ["61", "70", "80"], answer: 1, hint: "Hop 10 more from 60.", explain: "60 + 10 = 70. The next number is 70." }
  ]),

  // ───────────── Ring 3: Lantern Branches (about age 8–9) ─────────────
  M('m3-forest-tree-rings', 3, "How Old Is the Tree?", 'sub-borrow', 'Column subtraction', "Count tree rings, then subtract in columns to compare the ages of trees.", 'column', [
    { title: "One ring a year", emoji: '🌳', text: "Each year, a tree grows a new layer of wood: a pale part in spring and a darker part in summer. Together they make one ring. Count the rings on a tree stump to find how old the tree was." },
    { title: "Comparing ages", emoji: '➖', text: "An oak stump has 82 rings and a birch stump has 47. To find how many years older the oak was, work out 82 − 47." },
    { title: "Borrowing a ten", emoji: '🐿️', text: "You cannot take 7 from 2, so borrow a ten: 82 becomes 7 tens and 12 ones. 12 − 7 = 5 and 7 − 4 = 3. The oak was 35 years older." }
  ], [
    { q: "An oak stump has 63 rings. A pine stump has 28 rings. How many more rings does the oak have?", choices: ["35", "45", "25"], answer: 0, hint: "You cannot take 8 from 3, so borrow a ten.", explain: "Borrow a ten: 13 − 8 = 5 and 5 − 2 = 3. 63 − 28 = 35 more rings." },
    { q: "The squirrels hang 52 lanterns. 18 of them go out. How many lanterns are still lit?", choices: ["46", "34", "44"], answer: 1, hint: "Borrow a ten: 12 − 8 first.", explain: "12 − 8 = 4 and 4 − 1 = 3. 52 − 18 = 34 lanterns are still lit." },
    { q: "One tree is 91 years old. Another is 45 years old. How many years older is the first tree?", choices: ["54", "56", "46"], answer: 2, hint: "You cannot take 5 from 1, so borrow a ten.", explain: "11 − 5 = 6 and 8 − 4 = 4. 91 − 45 = 46 years older." },
    { q: "A tree stump has 80 rings. A squirrel has counted 36 of them. How many rings are left to count?", choices: ["56", "54", "116", "44"], answer: 3, hint: "0 − 6 needs a borrowed ten.", explain: "Borrow a ten: 10 − 6 = 4 and 7 − 3 = 4. 80 − 36 = 44 rings left." },
    { q: "Which one needs borrowing: 58 − 23 or 61 − 25?", choices: ["58 − 23", "61 − 25"], answer: 1, hint: "Look at the ones. Is the top digit smaller?", explain: "In 61 − 25, you cannot take 5 ones from 1 one, so you borrow a ten. 58 − 23 needs no borrowing." }
  ]),
  M('m3-forest-lantern-rows', 3, "Lanterns in Rows", 'times', 'Times tables', "The squirrels hang lanterns in rows. Multiply to count them.", 'array', [
    { title: "Rows of lanterns", emoji: '🏮', text: "The squirrels hang lanterns along the branches: 4 branches with 3 lanterns on each. That is 4 × 3 = 12 lanterns." },
    { title: "Swap it round", emoji: '🔄', text: "3 branches with 4 lanterns on each also make 12. So 4 × 3 = 3 × 4. Swapping the numbers gives the same answer." },
    { title: "Count in steps", emoji: '🐿️', text: "To find 6 × 5, count in fives 6 times: 5, 10, 15, 20, 25, 30." }
  ], [
    { q: "5 branches each have 6 lanterns. How many lanterns are there?", choices: ["11", "30", "35"], answer: 1, hint: "5 rows of 6 is 5 × 6.", explain: "5 × 6 = 30. There are 30 lanterns." },
    { q: "A squirrel hides 4 acorns in each of 7 holes. How many acorns is that?", choices: ["28", "11", "24"], answer: 0, hint: "Count in fours 7 times, or in sevens 4 times.", explain: "7 × 4 = 28. The squirrel hides 28 acorns." },
    { q: "An owl sees 3 rows of glow-worms with 9 in each row. How many glow-worms is that?", choices: ["12", "36", "27"], answer: 2, hint: "3 rows of 9 is 3 × 9.", explain: "3 × 9 = 27. There are 27 glow-worms." },
    { q: "Which is the same as 8 × 3?", choices: ["8 + 3", "3 × 8", "8 × 8"], answer: 1, hint: "Turn the rows round.", explain: "8 × 3 = 3 × 8 = 24. Swapping the numbers gives the same answer." },
    { q: "Each spider has 8 legs. How many legs do 6 spiders have?", choices: ["14", "42", "56", "48"], answer: 3, hint: "Count in eights 6 times.", explain: "6 × 8 = 48. Six spiders have 48 legs." }
  ]),

  // ───────────── Ring 4: Blossom Canopy (about age 9–10) ─────────────
  M('m4-forest-bee-fractions', 4, "Fractions in the Blossom Canopy", 'fraction-of', 'Fractions of amounts', "Find 3/4 of the bees and 2/5 of the blossoms.", 'pizza', [
    { title: "A fraction of a group", emoji: '🌸', text: "To find 1/4 of 20 flowers, share the 20 flowers into 4 equal groups. Each group has 5, so 1/4 of 20 is 5." },
    { title: "More than one part", emoji: '🐝', text: "To find 3/4 of 20, find 1/4 first, which is 5. Then take 3 of those parts: 3 × 5 = 15." },
    { title: "Divide, then multiply", emoji: '✖️', text: "Divide by the bottom number, then multiply by the top number. For 2/5 of 30: 30 ÷ 5 = 6, and 6 × 2 = 12." }
  ], [
    { q: "There are 24 blossoms on a branch. 1/2 of them have a bee on them. How many blossoms have a bee?", choices: ["12", "48", "22"], answer: 0, hint: "1/2 means share into 2 equal groups.", explain: "24 ÷ 2 = 12, so 12 blossoms have a bee." },
    { q: "40 bees are at the door of the hive. 3/4 of them fly off to find flowers. How many bees fly off?", choices: ["10", "30", "43"], answer: 1, hint: "Find 1/4 of 40 first.", explain: "40 ÷ 4 = 10, and 3 × 10 = 30. 30 bees fly off." },
    { q: "A cherry tree has 30 flowers. 2/5 of them are open. How many flowers are open?", choices: ["6", "15", "12"], answer: 2, hint: "Divide by 5, then multiply by 2.", explain: "30 ÷ 5 = 6, and 6 × 2 = 12. 12 flowers are open." },
    { q: "A bee visits 50 flowers. 1/10 of them are yellow. How many yellow flowers does it visit?", choices: ["10", "45", "40", "5"], answer: 3, hint: "1/10 means share into 10 equal groups.", explain: "50 ÷ 10 = 5, so the bee visits 5 yellow flowers." },
    { q: "Which is more: 1/3 of 18 petals or 1/2 of 10 petals?", choices: ["1/2 of 10", "1/3 of 18", "They are the same"], answer: 1, hint: "Work out each one, then compare.", explain: "1/3 of 18 is 18 ÷ 3 = 6. 1/2 of 10 is 5. 6 is more than 5." }
  ]),
  M('m4-forest-blossom-multiply', 4, "Bees and Blossoms", 'mult-2x1', '2-digit × 1-digit', "Bees visit lots of flowers. Multiply big numbers by splitting them.", 'grid', [
    { title: "Split the big number", emoji: '🧩', text: "A bee visits 24 flowers on each trip. In 3 trips, that is 24 × 3. Split 24 into 20 and 4: 20 × 3 = 60 and 4 × 3 = 12. 60 + 12 = 72 flowers." },
    { title: "The grid method", emoji: '🔲', text: "Draw a box for each part of the number. Multiply in each box, then add the boxes together." },
    { title: "Estimate first", emoji: '🎯', text: "37 × 4 should be a bit less than 40 × 4 = 160. If you get 1,600, something went wrong. Check again!" }
  ], [
    { q: "Each apple blossom has 5 petals. How many petals do 18 blossoms have?", choices: ["90", "23", "80"], answer: 0, hint: "18 is 10 and 8. Multiply each part by 5.", explain: "10 × 5 = 50 and 8 × 5 = 40. 50 + 40 = 90 petals." },
    { q: "A bee visits 32 flowers every hour. How many flowers does it visit in 4 hours?", choices: ["36", "128", "1,208"], answer: 1, hint: "32 is 30 and 2. Multiply each part by 4.", explain: "30 × 4 = 120 and 2 × 4 = 8. 120 + 8 = 128 flowers." },
    { q: "A piece of honeycomb has 6 rows with 45 cells in each row. How many cells is that?", choices: ["51", "240", "270"], answer: 2, hint: "45 is 40 and 5. Multiply each part by 6.", explain: "40 × 6 = 240 and 5 × 6 = 30. 240 + 30 = 270 cells." },
    { q: "There are 7 trees in the orchard. The lowest branch of each tree has 26 blossoms. How many blossoms is that?", choices: ["33", "142", "172", "182"], answer: 3, hint: "26 is 20 and 6. Multiply each part by 7.", explain: "20 × 7 = 140 and 6 × 7 = 42. 140 + 42 = 182 blossoms." },
    { q: "Which is the best estimate for 49 × 3?", choices: ["About 15", "About 150", "About 1,500"], answer: 1, hint: "49 is close to 50.", explain: "49 is close to 50, and 50 × 3 = 150. The exact answer is 147." }
  ]),

  // ───────────── Ring 5: Nest Heights (about age 10–11) ─────────────
  M('m5-forest-nest-equations', 5, "Balancing Nest Equations", 'balance', 'Equations', "Find the mystery number of eggs, twigs and feathers.", 'balance', [
    { title: "A balanced scale", emoji: '⚖️', text: "An equation is like a balanced scale: both sides weigh the same. x + 4 = 9 means some number, plus 4, makes 9." },
    { title: "Take the same from both sides", emoji: '🪺', text: "Take 4 away from both sides and it still balances: x = 9 − 4 = 5." },
    { title: "Check your x", emoji: '✔️', text: "Put your answer back in: 5 + 4 = 9. It works, so x = 5 is right." }
  ], [
    { q: "A robin's nest has some eggs. The robin lays 2 more, and now there are 5. So x + 2 = 5. What is x?", choices: ["7", "3", "2"], answer: 1, hint: "Take 2 away from both sides.", explain: "x = 5 − 2 = 3. Check: 3 + 2 = 5. There were 3 eggs." },
    { q: "A bird has x twigs. After it finds 12 more, it has 30: x + 12 = 30. What is x?", choices: ["18", "42", "12"], answer: 0, hint: "Take 12 away from both sides.", explain: "x = 30 − 12 = 18. Check: 18 + 12 = 30." },
    { q: "A nest is lined with x soft feathers. With 15 more, there are 40 feathers. What is x?", choices: ["55", "35", "25"], answer: 2, hint: "Write x + 15 = 40, then take 15 from both sides.", explain: "x = 40 − 15 = 25. Check: 25 + 15 = 40." },
    { q: "A woodpecker drills x holes in the morning and 9 in the afternoon: 21 holes in all. What is x?", choices: ["30", "11", "13", "12"], answer: 3, hint: "Write x + 9 = 21.", explain: "x = 21 − 9 = 12. Check: 12 + 9 = 21." },
    { q: "What is the first step to solve x + 7 = 20?", choices: ["Add 7 to both sides", "Take 7 from both sides", "Take 20 from both sides"], answer: 1, hint: "Undo the + 7.", explain: "Taking 7 from both sides keeps the balance and leaves x = 13." }
  ]),
  M('m5-forest-meadow-area', 5, "Forest Plots: Area and Perimeter", 'area', 'Area and perimeter', "Fence a nesting meadow and count the squares on a forest map.", 'grid', [
    { title: "Perimeter", emoji: '🚶', text: "Perimeter is the distance all the way round a shape. To put a fence round a rectangle, add up all four sides." },
    { title: "Area", emoji: '🟩', text: "Area is how much flat space a shape covers. A forest map can be a grid of squares, and each square might stand for 1 square metre (m²)." },
    { title: "A shortcut", emoji: '✖️', text: "For a rectangle, area = length × width. A meadow 9 m long and 4 m wide covers 36 m². Its perimeter is 9 + 4 + 9 + 4 = 26 m." }
  ], [
    { q: "A patch of wildflowers is 6 m long and 5 m wide. What is its area?", choices: ["11 m²", "22 m²", "30 m²"], answer: 2, hint: "Area = length × width.", explain: "6 × 5 = 30, so the area is 30 m²." },
    { q: "A ranger puts a rope round a nesting area 10 m long and 3 m wide. How long is the rope?", choices: ["26 m", "30 m", "13 m"], answer: 0, hint: "Add all four sides.", explain: "10 + 3 + 10 + 3 = 26, so the rope is 26 m long." },
    { q: "On a forest map, a patch of trees is 8 squares wide and 7 squares tall. How many squares does it cover?", choices: ["15", "56", "30"], answer: 1, hint: "Rows × columns.", explain: "8 × 7 = 56 squares." },
    { q: "A square bird hide has sides of 3 m. What is its floor area?", choices: ["6 m²", "12 m²", "3 m²", "9 m²"], answer: 3, hint: "A square's length and width are the same.", explain: "3 × 3 = 9, so the floor area is 9 m²." },
    { q: "Two meadows both have an area of 12 m². One is 6 m by 2 m, and the other is 4 m by 3 m. Which has the longer perimeter?", choices: ["The 4 m by 3 m meadow", "The 6 m by 2 m meadow", "They are the same"], answer: 1, hint: "Add the four sides of each one.", explain: "6 + 2 + 6 + 2 = 16 m, but 4 + 3 + 4 + 3 = 14 m. The same area can have different perimeters!" }
  ]),

  // ───────────── Ring 6: Sunflower Rings (about age 11–12) ─────────────
  M('m6-forest-winter-night', 6, "A Winter Night in the Woods", 'negatives', 'Negative numbers', "Temperatures fall below zero on a frosty forest night, and the Sun warms them up again.", 'numberline', [
    { title: "Below zero", emoji: '🥶', text: "Water freezes at 0 °C. On a winter night in the forest, the thermometer can drop to −8 °C: eight degrees below zero." },
    { title: "A thermometer is a number line", emoji: '🌡️', text: "Stand a number line up and you get a thermometer. Numbers above 0 are warmer, and numbers below 0 are colder. −10 °C is colder than −3 °C." },
    { title: "The Sun warms things up", emoji: '☀️', text: "When the Sun comes up, it gets warmer. From −6 °C, a rise of 9 degrees takes you to 3 °C: count up 6 to reach 0, then 3 more." }
  ], [
    { q: "At midnight it is −4 °C in the forest. By dawn it has cooled by 3 more degrees. What is the temperature at dawn?", choices: ["−1 °C", "−7 °C", "7 °C"], answer: 1, hint: "Cooling down makes the number more negative.", explain: "−4 − 3 = −7. It is −7 °C at dawn." },
    { q: "It is −5 °C at sunrise. By noon, the Sun has warmed it by 11 degrees. What is the temperature at noon?", choices: ["6 °C", "−16 °C", "16 °C"], answer: 0, hint: "Count up 5 to reach 0, then keep going.", explain: "−5 + 11 = 6. Count up 5 to get to 0, then 6 more. It is 6 °C at noon." },
    { q: "Which is colder: −12 °C or −9 °C?", choices: ["−9 °C", "They are the same", "−12 °C"], answer: 2, hint: "The further below 0, the colder.", explain: "−12 is further below 0 than −9, so −12 °C is colder." },
    { q: "In the afternoon it is 4 °C. At night it is −6 °C. How many degrees did the temperature drop?", choices: ["2 degrees", "10 degrees", "−2 degrees"], answer: 1, hint: "From 4 down to 0, then from 0 down to −6.", explain: "4 degrees down to 0, then 6 more down to −6: 4 + 6 = 10 degrees." },
    { q: "Ice starts to form on a pond when the water cools below 0 °C. The water is at 3 °C, and it cools by 5 degrees. Is it cold enough for ice?", choices: ["Yes, it reaches −2 °C", "No, it reaches 8 °C", "No, it reaches 2 °C"], answer: 0, hint: "Work out 3 − 5.", explain: "3 − 5 = −2. The water reaches −2 °C, which is below 0 °C, so ice can form." }
  ]),
  M('m6-forest-sunflower-percent', 6, "Sunflower Percentages", 'percent', 'Percentages', "Seeds, sunflowers and saplings: find percentages in the sunny rings.", 'grid', [
    { title: "Out of a hundred", emoji: '💯', text: "Per cent means out of 100. If 30 out of 100 seeds sprout, then 30% of them sprouted." },
    { title: "Handy ones to know", emoji: '🧠', text: "50% is a half, 25% is a quarter, 75% is three quarters and 10% is a tenth." },
    { title: "Finding a percentage", emoji: '🌻', text: "To find 20% of 80 sunflowers: 10% of 80 is 8, so 20% is 2 × 8 = 16 sunflowers." }
  ], [
    { q: "A gardener plants 60 sunflower seeds. 50% of them sprout. How many seeds sprout?", choices: ["30", "50", "10"], answer: 0, hint: "50% is a half.", explain: "Half of 60 is 30, so 30 seeds sprout." },
    { q: "Out of 100 trees in a wood, 45 are oaks. What percentage of the trees are oaks?", choices: ["55%", "45%", "4.5%"], answer: 1, hint: "Per cent means out of 100.", explain: "45 out of 100 is 45%." },
    { q: "A sunflower head has 200 seeds. A bird eats 25% of them. How many seeds does the bird eat?", choices: ["25", "150", "50"], answer: 2, hint: "25% is a quarter.", explain: "A quarter of 200 is 50, so the bird eats 50 seeds." },
    { q: "A tree nursery grows 120 saplings. It gives 10% of them to a school. How many saplings does the school get?", choices: ["10", "110", "20", "12"], answer: 3, hint: "10% is a tenth.", explain: "A tenth of 120 is 12, so the school gets 12 saplings." },
    { q: "A sunny meadow has 80 wildflowers. 75% of them are yellow. How many yellow flowers are there?", choices: ["75", "20", "60"], answer: 2, hint: "75% is three quarters. Find a quarter first.", explain: "A quarter of 80 is 20, so three quarters is 3 × 20 = 60 yellow flowers." }
  ]),

  // ───────────── Ring 7: Starlight Crown (about age 12–13) ─────────────
  M('m7-forest-treetop-equations', 7, "Treetop Equations", 'two-step', 'Two-step equations', "Solve the treetop rangers' puzzles by undoing two steps.", 'balance', [
    { title: "Two steps to undo", emoji: '🎁', text: "In 3x + 5 = 26, x was multiplied by 3, then 5 was added. To solve it, undo the steps in reverse order: first take away 5, then divide by 3." },
    { title: "Keep it balanced", emoji: '⚖️', text: "Whatever you do to one side, do to the other. 3x + 5 = 26, so 3x = 21, so x = 7. Check: 3 × 7 + 5 = 26." },
    { title: "A growing sapling", emoji: '🌲', text: "A sapling is 15 cm tall and grows 6 cm each month. After x months it is 6x + 15 cm tall. When is it 51 cm tall? 6x = 51 − 15 = 36, so x = 6 months." }
  ], [
    { q: "A ranger plants x rows of 8 trees, plus 5 extra trees: 8x + 5 = 61. What is x?", choices: ["7", "8", "6"], answer: 0, hint: "Take 5 from both sides, then divide by 8.", explain: "8x = 61 − 5 = 56, so x = 56 ÷ 8 = 7. Check: 8 × 7 + 5 = 61." },
    { q: "A sunflower is 20 cm tall and grows 9 cm a week. After x weeks it is 92 cm tall: 9x + 20 = 92. What is x?", choices: ["10", "8", "12"], answer: 1, hint: "Undo the + 20 first.", explain: "9x = 92 − 20 = 72, so x = 72 ÷ 9 = 8 weeks. Check: 9 × 8 + 20 = 92." },
    { q: "In the stargazers' logbook, 4x − 6 = 30. What is x?", choices: ["6", "24", "9"], answer: 2, hint: "Undo the − 6 by adding 6 to both sides.", explain: "4x = 30 + 6 = 36, so x = 36 ÷ 4 = 9. Check: 4 × 9 − 6 = 30." },
    { q: "Tickets for the treetop walk cost 7 coins each, and a map costs 4 coins. A family buys x tickets and one map for 39 coins. How many tickets did they buy?", choices: ["6", "7", "43", "5"], answer: 3, hint: "Write 7x + 4 = 39, then solve it.", explain: "7x = 39 − 4 = 35, so x = 35 ÷ 7 = 5 tickets. Check: 7 × 5 + 4 = 39." },
    { q: "To solve 5x − 8 = 32, what is the first step?", choices: ["Divide both sides by 5", "Add 8 to both sides", "Take 8 from both sides", "Multiply both sides by 5"], answer: 1, hint: "The − 8 was the last thing done to x.", explain: "Undo the last step first: add 8 to get 5x = 40, then divide by 5 to get x = 8." }
  ]),
  M('m7-forest-square-plots', 7, "Square Plots and Roots", 'squares', 'Squares and roots', "Plant trees in square grids, and find a side from an area.", 'grid', [
    { title: "Square numbers", emoji: '🟩', text: "9² (\"9 squared\") means 9 × 9 = 81. A square orchard with 9 rows of 9 trees has 81 trees." },
    { title: "Square roots", emoji: '🌱', text: "The square root goes backwards: √64 asks which number times itself makes 64. The answer is 8." },
    { title: "Areas of squares", emoji: '✨', text: "A square clearing with sides of 7 m has an area of 7² = 49 m². If you know the area of a square, its side is the square root of the area." }
  ], [
    { q: "A square orchard has 6 rows of 6 apple trees. How many trees is that?", choices: ["12", "36", "66"], answer: 1, hint: "6 rows of 6 is 6².", explain: "6² = 6 × 6 = 36 trees." },
    { q: "A square meadow has an area of 100 m². How long is each side?", choices: ["10 m", "50 m", "25 m"], answer: 0, hint: "Which number times itself makes 100?", explain: "10 × 10 = 100, so √100 = 10 and each side is 10 m." },
    { q: "What is 11²?", choices: ["22", "111", "121"], answer: 2, hint: "11² means 11 × 11, not 11 × 2.", explain: "11 × 11 = 121." },
    { q: "Stargazers lay a square mat of 144 tiles at the top of the tree. How many tiles are along each side?", choices: ["72", "14", "12", "24"], answer: 2, hint: "Which number times itself makes 144?", explain: "12 × 12 = 144, so there are 12 tiles along each side." },
    { q: "Which of these is a square number?", choices: ["81", "40", "50", "90"], answer: 0, hint: "Look for a number that is something times itself.", explain: "81 = 9 × 9, so it is a square number. 40, 50 and 90 are not: 6² = 36, 7² = 49, 8² = 64 and 9² = 81." }
  ])
];

/* ------------------------------------------------------------ Forest History */

const FOREST_HISTORY = [
  // ───────────── Ring 1: Root Hollow (about age 6–7) ─────────────
  {
    id: 'h1-forest-woodland-life',
    subject: 'history',
    floor: 1,
    realm: 'forest',
    title: "Living in the Woods Long Ago",
    topic: 'woodland-life',
    topicName: 'Life in the Woods Long Ago',
    blurb: "Gather nuts, build a shelter and learn the seasons with a forest family from long ago.",
    reading: [
      { title: "A home in the forest", emoji: '🌲', text: "Long, long ago, many people lived in and near forests. They built shelters from branches, logs and bark." },
      { title: "Gathering food", emoji: '🌰', text: "People gathered nuts, berries, mushrooms and roots. Hazelnuts and acorns were good foods to keep for the winter." },
      { title: "Wood for everything", emoji: '🪵', text: "Wood made fires, bowls, spoons and tools. Tree bark made boxes, baskets and even rope." },
      { title: "Watching the seasons", emoji: '🍂', text: "People knew the forest very well. They knew when the berries were ripe in summer and when the nuts fell in autumn." }
    ],
    dialogue: {
      npc: { name: "Hazel", role: "a forest gatherer from long ago", look: 'stone-age', portrayal: 'generic' },
      intro: "Hello, little one! I'm Hazel. My family and I live here in the woods. Come and help me fill my basket with nuts!",
      topics: [
        { ask: "What is your home made of?", answer: "Wooden poles leaning together, covered with bark and branches. It keeps out the wind and the rain, and we keep a fire inside to stay warm." },
        { ask: "What do you eat?", answer: "Whatever the forest gives us! Berries in summer, nuts and mushrooms in autumn, and roots and fish too. We roast hazelnuts by the fire. Yum!" },
        { ask: "Why do you keep so many nuts?", answer: "Winter is coming, and then there is very little to gather. Nuts keep for a long time, so we store them, just like the squirrels do!" },
        { ask: "Can you really eat acorns?", answer: "Yes, but they taste very bitter at first. We crack them and soak them in water to wash the bitter taste away. Then we grind them into flour." },
        { ask: "What do you make from bark?", answer: "Birch bark is light and keeps the water out. We fold it into boxes and baskets, and we can even make cups from it!" }
      ],
      challenge: {
        q: "Why did people long ago store nuts in autumn?",
        choices: ["To have food in winter", "To throw at the squirrels", "To build their houses"],
        answer: 0,
        explain: "In winter there was very little food to gather, and nuts keep for a long time."
      },
      farewell: "Thank you for your help! Our basket is full. Go safely through the woods!"
    },
    timeline: {
      title: "Life in the woods through time",
      events: [
        { label: "Early humans fit logs together at Kalambo Falls, in Africa: the oldest wooden building work we know", year: -474000, when: "about 476,000 years ago" },
        { label: "People on a Scottish island roast huge piles of hazelnuts", year: -7000, when: "about 9,000 years ago" },
        { label: "A traveller in the Alps, called Ötzi, carries a box made of birch bark", year: -3300, when: "about 5,300 years ago" },
        { label: "The first forest kindergartens, where children learn outdoors, open in Denmark", year: 1952, when: "the 1950s" }
      ]
    },
    artifact: {
      model: 'acorn',
      name: "An acorn",
      text: "Acorns are the seeds of oak trees. Long ago, people in many parts of the world gathered acorns, soaked them to wash away the bitter taste, and ground them into flour. In Korea, people still make a jelly from acorns, called dotori-muk."
    },
    quiz: [
      { q: "What did people long ago build their forest shelters from?", choices: ["Bricks and glass", "Branches, logs and bark", "Metal and plastic"], answer: 1, hint: "They used what grew in the forest.", explain: "They built shelters from branches, logs and bark." },
      { q: "Which foods did people gather in the forest?", choices: ["Nuts, berries and mushrooms", "Pizza and chips", "Ice cream"], answer: 0, hint: "These grow on trees, bushes and the forest floor.", explain: "People gathered nuts, berries, mushrooms and roots." },
      { q: "Why did people soak acorns in water?", choices: ["To make them float", "To make them grow", "To wash away the bitter taste"], answer: 2, hint: "Raw acorns do not taste nice.", explain: "Soaking washed away the bitter taste, so the acorns could be ground into flour." },
      { q: "What useful things did people make from birch bark?", choices: ["Glass windows", "Boxes and baskets", "Metal pots"], answer: 1, hint: "Birch bark is light and can be folded.", explain: "People folded birch bark into boxes, baskets and cups." },
      { q: "When did people find the most nuts to gather?", choices: ["In winter", "In early spring", "At midnight", "In autumn"], answer: 3, hint: "Think of when leaves and nuts fall from the trees.", explain: "Nuts ripen and fall in autumn, so that was the time to gather them." }
    ]
  },

  {
    id: 'h1-forest-first-farms',
    subject: 'history',
    floor: 1,
    realm: 'forest',
    title: "The First Gardens and Farms",
    topic: 'first-farms',
    topicName: 'The First Farms',
    blurb: "Plant the very first seeds, and see how people became farmers.",
    reading: [
      { title: "Seeds can grow", emoji: '🌱', text: "Long ago, people saw that seeds dropped on the ground grew into new plants. So they began to plant seeds on purpose!" },
      { title: "The first crops", emoji: '🌾', text: "About 11,000 years ago, people in the Middle East grew wheat and barley. Later, people in other places grew rice, maize (corn) and potatoes." },
      { title: "Staying in one place", emoji: '🏡', text: "Farmers had to look after their fields, so they stayed in one place. They built houses close together, and the first villages grew." },
      { title: "Gardens for everyone", emoji: '🥕', text: "Today, people still grow food on farms and in gardens, and many schools have gardens too. It all started with a few seeds!" }
    ],
    dialogue: {
      npc: { name: "Ama", role: "one of the first farmers, about 10,000 years ago", look: 'farmer', portrayal: 'generic' },
      intro: "Hello! I'm Ama. Mind where you step: those little green shoots are my wheat! Would you like to know how we grow our food?",
      topics: [
        { ask: "How did people learn to farm?", answer: "We watched! Seeds that fell near our homes grew into new plants. So we saved the biggest, best seeds and planted them. Every year, our crops grow a little better." },
        { ask: "What do you grow?", answer: "Wheat and barley, and peas and lentils too. We grind the grain between two stones to make flour for bread." },
        { ask: "Why don't you move around any more?", answer: "Our fields need us! We pull out weeds and keep hungry animals away. So we build houses and stay. Now we have a village." },
        { ask: "Do you keep animals too?", answer: "Yes, we keep sheep and goats. They give us milk and wool, and they are good company!" }
      ],
      challenge: {
        q: "What did the first farmers do with the best seeds?",
        choices: ["Threw them away", "Saved them and planted them", "Painted them"],
        answer: 1,
        explain: "They saved the biggest, best seeds to plant again, so their crops grew better and better."
      },
      farewell: "Come back at harvest time, and we will bake bread together!"
    },
    timeline: {
      title: "Farms and gardens through time",
      events: [
        { label: "People in the Middle East start to grow wheat and barley", year: -9000, when: "about 11,000 years ago" },
        { label: "People in Mexico start to grow maize (corn)", year: -7000, when: "about 9,000 years ago" },
        { label: "People in China are growing rice", year: -6000, when: "about 8,000 years ago" },
        { label: "A plan of a monastery in Europe shows gardens of herbs and vegetables, and an orchard", year: 820, when: "about 820" },
        { label: "Friedrich Fröbel starts the first kindergarten, a 'children's garden', in Germany", year: 1837, when: "1837" }
      ]
    },
    artifact: {
      model: 'clay-tablet',
      name: "A farmer's clay tablet",
      text: "About 3,700 years ago, people in Mesopotamia wrote farming advice on clay tablets. One text, now called the Farmer's Instructions, tells a farmer how to water the field, plough it and harvest the barley."
    },
    quiz: [
      { q: "What did the first farmers in the Middle East grow?", choices: ["Wheat and barley", "Bananas", "Chocolate"], answer: 0, hint: "They are grains that make bread.", explain: "The first farmers in the Middle East grew wheat and barley, about 11,000 years ago." },
      { q: "Why did farmers stay in one place?", choices: ["They did not like walking", "Their fields needed looking after", "It was too cold to move"], answer: 1, hint: "Think about weeds and hungry animals.", explain: "Fields need weeding and protecting, so farmers stayed close by and built houses." },
      { q: "What grew up around the first farms as people stayed in one place?", choices: ["Big cities with cars", "Airports", "Villages"], answer: 2, hint: "Lots of houses close together.", explain: "Farmers built houses close together, and the first villages grew." },
      { q: "Which crop did people in Mexico first grow?", choices: ["Rice", "Maize (corn)", "Wheat", "Apples"], answer: 1, hint: "It grows on tall stalks and is often yellow.", explain: "People in Mexico started to grow maize, or corn, about 9,000 years ago." },
      { q: "What did farmers make from grain?", choices: ["Glass", "Paper", "Flour for bread"], answer: 2, hint: "They ground it between two stones.", explain: "Farmers ground grain into flour to make bread." }
    ]
  },

  // ───────────── Ring 2: Fern Boughs (about age 7–8) ─────────────
  {
    id: 'h2-forest-tree-to-paper',
    subject: 'history',
    floor: 2,
    realm: 'forest',
    title: "From Tree to Paper",
    topic: 'paper-from-trees',
    topicName: 'How Paper Is Made',
    blurb: "How did a wasp's nest help turn trees into the paper in your books?",
    reading: [
      { title: "Paper long ago", emoji: '📜', text: "Long ago, paper was made from old rags, plants and tree bark. It was made by hand, one sheet at a time." },
      { title: "A clever wasp", emoji: '🐝', text: "Paper wasps chew wood into a soft mush and spread it thin to build their nests. When it dries, it is a kind of paper! About 300 years ago, a scientist named René de Réaumur saw this and wrote that people could make paper from wood, too." },
      { title: "Wood into pulp", emoji: '🪵', text: "In the 1840s, inventors found ways to grind wood into pulp: a wet mush of tiny wood fibres. They spread the pulp thin and dried it into paper. Soon paper was cheap, and books and newspapers were everywhere." },
      { title: "Use it again", emoji: '♻️', text: "Old paper can be soaked back into pulp and made into new paper. That is called recycling. Paper makers also plant new trees to grow more wood." }
    ],
    dialogue: {
      npc: { name: "Hanna", role: "a papermaker at a paper mill, 1880s", look: 'printer', portrayal: 'generic' },
      intro: "Welcome to the paper mill! I'm Hanna. Listen to the machines hum! Would you like to see how a log becomes a sheet of paper?",
      topics: [
        { ask: "How do you make paper from a tree?", answer: "First we take the bark off the logs. Then we grind the wood into tiny fibres and mix them with water to make pulp. We spread the pulp thin on a screen, squeeze out the water and dry it. Then it is paper!" },
        { ask: "What was paper made from before?", answer: "From old cotton and linen rags! People collected old clothes and sold them to the paper mills. But there were never enough rags, so paper was expensive." },
        { ask: "Who had the idea to use wood?", answer: "A scientist named René de Réaumur watched wasps chewing wood to build their paper nests. He said people could do the same! Many years later, inventors made machines that ground wood into pulp." },
        { ask: "Why is cheap paper important?", answer: "When paper is cheap, everyone can have books, newspapers and notebooks. More children can learn to read and write!" }
      ],
      challenge: {
        q: "Which animal gave people the idea to make paper from wood?",
        choices: ["A beaver", "A wasp", "A woodpecker"],
        answer: 1,
        explain: "Paper wasps chew wood into mush to build their nests. René de Réaumur noticed this and said people could make paper from wood, too."
      },
      farewell: "Next time you draw a picture, remember: your paper was once part of a tree!"
    },
    timeline: {
      title: "Paper through time",
      events: [
        { label: "In China, Cai Lun shows a better way to make paper", year: 105, when: "105 CE" },
        { label: "René de Réaumur notices that wasps make paper from wood", year: 1719, when: "1719" },
        { label: "Inventors grind wood into pulp to make paper", year: 1844, when: "the 1840s" },
        { label: "Most new paper is now made from wood", year: 1900, when: "by about 1900" },
        { label: "A student designs the recycling symbol with three arrows", year: 1970, when: "1970" }
      ]
    },
    artifact: {
      model: 'scroll',
      name: "A sheet of handmade paper",
      text: "This sheet was made by hand. The papermaker dipped a screen into a tub of pulp, lifted it out and let the water drain away. The fibres left on the screen dried into one sheet of paper."
    },
    quiz: [
      { q: "What is paper pulp?", choices: ["A wet mush of tiny fibres", "A kind of glue", "A type of ink"], answer: 0, hint: "It is soft and wet, and made from wood or rags.", explain: "Pulp is a wet mush of tiny fibres. Spread thin and dried, it becomes paper." },
      { q: "Before wood was used, what was most paper in Europe made from?", choices: ["Plastic", "Old rags", "Stones"], answer: 1, hint: "People sold their old clothes to the paper mills.", explain: "Most paper in Europe was made from old cotton and linen rags." },
      { q: "Who noticed that wasps make paper from wood?", choices: ["René de Réaumur", "Cai Lun", "Christopher Columbus"], answer: 0, hint: "He was a scientist about 300 years ago.", explain: "René de Réaumur watched paper wasps and said people could make paper from wood too." },
      { q: "What is it called when old paper is made into new paper?", choices: ["Printing", "Painting", "Recycling"], answer: 2, hint: "Look for the word that means using things again.", explain: "Making old paper into new paper is called recycling." },
      { q: "Why did cheap paper matter so much?", choices: ["Trees grew faster", "Wasps built bigger nests", "Paper got heavier", "More people could have books and learn to read"], answer: 3, hint: "Think about books, newspapers and notebooks.", explain: "When paper was cheap, many more people could have books and newspapers, and more children learned to read and write." }
    ]
  },

  {
    id: 'h2-forest-oldest-trees',
    subject: 'history',
    floor: 2,
    realm: 'forest',
    title: "The Oldest Trees on Earth",
    topic: 'ancient-trees',
    topicName: 'Ancient Trees',
    blurb: "Meet a pine tree that is nearly 5,000 years old, and the groves people have cared for.",
    reading: [
      { title: "Very, very old", emoji: '🌲', text: "Some trees live for thousands of years. A bristlecone pine called Methuselah, in the mountains of California, is about 4,850 years old. It started to grow before the Great Pyramid of Egypt was built!" },
      { title: "Tough little trees", emoji: '⛰️', text: "Bristlecone pines grow high on dry, cold, windy mountains. They grow very slowly. Their wood is hard and full of sticky resin, which helps keep out rot and insects." },
      { title: "Counting rings", emoji: '🔍', text: "Scientists do not cut old trees down to count their rings. They use a thin hollow drill to take out a pencil-thin core of wood, and count the rings on it." },
      { title: "Sacred groves", emoji: '🌳', text: "In many parts of the world, people have protected special woods called sacred groves for hundreds of years. India alone has thousands of them, and they keep old trees, plants and animals safe." }
    ],
    dialogue: {
      npc: { name: "Juniper", role: "a ranger in the White Mountains of California", look: 'ranger', portrayal: 'generic' },
      intro: "Hello, and welcome to the ancient forest! I'm Juniper, a ranger. Walk quietly: some of these trees are older than the pyramids!",
      topics: [
        { ask: "Which tree is the oldest?", answer: "A bristlecone pine here called Methuselah is about 4,850 years old. We keep the exact tree a secret, so that it stays safe from too many visitors." },
        { ask: "How do you know how old a tree is?", answer: "We count its rings! Each year, a tree adds one ring of wood. We take out a thin core with a special drill, then count the rings under a magnifier. The tree soon seals the little hole." },
        { ask: "Why do these trees live so long?", answer: "They grow very slowly in the cold, dry mountains. Their wood is packed with sticky resin, so rot and insects find it hard to get in. Slow and steady!" },
        { ask: "Are there other very old trees?", answer: "Lots! A sacred fig tree in Sri Lanka was planted more than 2,300 years ago, and people still look after it. And in Sweden, a little spruce called Old Tjikko grows from roots that are about 9,500 years old!" }
      ],
      challenge: {
        q: "How do scientists find the age of an old tree without cutting it down?",
        choices: ["They ask the ranger to guess", "They count the rings in a thin core of wood", "They measure its leaves"],
        answer: 1,
        explain: "They drill out a pencil-thin core of wood and count the rings on it. One ring is usually one year."
      },
      farewell: "Thank you for walking gently. Look after the trees, and they may still be here in another thousand years!"
    },
    timeline: {
      title: "Ancient trees through time",
      events: [
        { label: "The roots of Old Tjikko, a spruce in Sweden, start to grow", year: -7500, when: "about 9,500 years ago" },
        { label: "The bristlecone pine called Methuselah starts to grow", year: -2833, when: "about 2833 BCE" },
        { label: "A sacred fig tree is planted in Anuradhapura, Sri Lanka", year: -288, when: "288 BCE" },
        { label: "Edmund Schulman counts Methuselah's rings: it is more than 4,700 years old", year: 1957, when: "1957" },
        { label: "Scientists find out how old Old Tjikko's roots are", year: 2008, when: "2008" }
      ]
    },
    artifact: {
      model: 'tree-ring',
      name: "A tree-ring slice",
      text: "Each ring in this slice of wood is one year of the tree's life. Wide rings mean good, wet years when the tree grew a lot. Thin rings mean dry or cold years. Tree rings are like a diary of the weather!"
    },
    quiz: [
      { q: "About how old is the bristlecone pine called Methuselah?", choices: ["About 50 years", "About 4,850 years", "About 1 million years"], answer: 1, hint: "It is older than the Great Pyramid.", explain: "Methuselah is about 4,850 years old. It started to grow before the Great Pyramid was built." },
      { q: "What does one tree ring usually stand for?", choices: ["One year", "One day", "One hundred years"], answer: 0, hint: "A tree adds one ring each spring and summer.", explain: "Each year, a tree grows one new ring of wood." },
      { q: "Why do bristlecone pines live so long?", choices: ["They are painted every year", "They grow fast in warm rain", "They grow slowly, and their wood is full of resin"], answer: 2, hint: "Slow and steady!", explain: "They grow very slowly, and their resin-filled wood keeps out rot and insects." },
      { q: "What is a sacred grove?", choices: ["A kind of fruit", "A special wood that people protect", "A tall building"], answer: 1, hint: "It is a place full of trees.", explain: "A sacred grove is a special wood that people have protected, often for hundreds of years." },
      { q: "What does a very thin tree ring tell you?", choices: ["It was a very wet, warm year", "The tree was cut down", "A bird built a nest", "It was a dry or cold year, so the tree grew only a little"], answer: 3, hint: "A thin ring means the tree did not grow much.", explain: "Thin rings show dry or cold years, when the tree grew only a little." }
    ]
  },

  // ───────────── Ring 3: Lantern Branches (about age 8–9) ─────────────
  {
    id: 'h3-forest-johnny-appleseed',
    subject: 'history',
    floor: 3,
    realm: 'forest',
    title: "Johnny Appleseed",
    topic: 'johnny-appleseed',
    topicName: 'Johnny Appleseed',
    blurb: "Walk west with John Chapman and plant apple trees for the families to come.",
    reading: [
      { title: "A real person", emoji: '🍎', text: "Johnny Appleseed was a real man named John Chapman. He was born in Massachusetts, in the United States, in 1774." },
      { title: "Apple nurseries", emoji: '🌱', text: "John collected apple seeds from cider mills, where apples were squashed for their juice. He planted the seeds in small fenced plots called nurseries, ahead of the settlers moving west." },
      { title: "Ready for new families", emoji: '🏡', text: "When families arrived to build farms, John's young apple trees were ready. He sold them for a few cents each, or swapped them for food or clothes." },
      { title: "Stories and legends", emoji: '📖', text: "People tell many stories about him: that he often walked barefoot and was kind to animals. Some stories, like wearing a cooking pot as a hat, may be made up!" }
    ],
    dialogue: {
      npc: { name: "John Chapman", role: "the apple tree planter known as Johnny Appleseed", look: 'farmer', portrayal: 'portrayal' },
      intro: "Howdy, friend! I'm John Chapman, but folks call me Johnny Appleseed. I've got a sack of apple seeds and a long way to walk. Will you walk with me?",
      topics: [
        { ask: "Where do you get your seeds?", answer: "From cider mills! When people squash apples to make cider, the seeds are left over in the mush. I wash them out, dry them and carry them in a sack." },
        { ask: "Why do you plant apple trees?", answer: "Families are moving west to make new farms. An apple tree takes years to grow, so I plant nurseries ahead of them. When they arrive, young trees are ready for them!" },
        { ask: "Does every seed make the same apples?", answer: "No! Every apple seed grows into a different kind of apple tree. Many of my apples are small and sour, but they are good for cider, apple butter and drying for winter." },
        { ask: "Is it true you love animals?", answer: "I try to be kind to every creature. People tell a story that I once put out my campfire so the bugs would not fly into it! That's one of the tales they tell about me." }
      ],
      challenge: {
        q: "What was Johnny Appleseed's real name?",
        choices: ["John Chapman", "John Muir", "John Smith"],
        answer: 0,
        explain: "Johnny Appleseed was the nickname of John Chapman, a real apple tree planter."
      },
      farewell: "Thank you for walking with me! Whenever you eat an apple, remember: every tree starts with a tiny seed."
    },
    timeline: {
      title: "The life of Johnny Appleseed",
      events: [
        { label: "John Chapman is born in Massachusetts", year: 1774, when: "1774" },
        { label: "He plants apple nurseries in Pennsylvania", year: 1797, when: "about 1797" },
        { label: "He carries his seeds west into Ohio", year: 1805, when: "the early 1800s" },
        { label: "He plants nurseries in Indiana", year: 1834, when: "the 1830s" },
        { label: "John Chapman dies in Indiana, aged 70", year: 1845, when: "1845" },
        { label: "A magazine story makes 'Johnny Appleseed' famous across America", year: 1871, when: "1871" }
      ]
    },
    artifact: {
      model: 'coin',
      name: "A cent coin",
      text: "John Chapman sold his young apple trees for just a few cents each. If a family had no money, he often took food or old clothes instead."
    },
    quiz: [
      { q: "Where did John Chapman get his apple seeds?", choices: ["From a shop", "From cider mills", "From the sea"], answer: 1, hint: "The seeds were left over after apples were squashed.", explain: "He collected seeds left over at cider mills, where apples were squashed for juice." },
      { q: "What is an apple nursery?", choices: ["A place to plant and grow young trees", "A hospital for apples", "A kind of apple pie"], answer: 0, hint: "Young trees grow there until they are ready.", explain: "A nursery is a plot where young trees are grown until they are ready to plant out." },
      { q: "Why did he plant trees ahead of the settlers?", choices: ["To hide from them", "To make a maze", "Apple trees take years to grow, so they would be ready when families came"], answer: 2, hint: "Think about how long a tree takes to grow.", explain: "Apple trees take years to grow, so his young trees were ready when the families arrived." },
      { q: "Does an apple seed grow the same kind of apple as the one it came from?", choices: ["Yes, always", "No, each seed grows a different kind of apple"], answer: 1, hint: "Johnny's apples were often small and sour.", explain: "Every apple seed grows a new and different kind of apple tree." },
      { q: "Which story about Johnny Appleseed may be made up?", choices: ["He planted apple trees", "He was born in 1774", "He sold young trees", "He wore a cooking pot as a hat"], answer: 3, hint: "Which one sounds the silliest?", explain: "He really did plant and sell apple trees, and he was born in 1774. The cooking-pot hat is probably a legend." }
    ]
  },

  {
    id: 'h3-forest-maple-syrup',
    subject: 'history',
    floor: 3,
    realm: 'forest',
    title: "The Sweet Story of Maple Syrup",
    topic: 'maple-syrup',
    topicName: 'Maple Syrup',
    blurb: "Tap a maple tree on a frosty spring morning, and learn who first made maple sugar.",
    reading: [
      { title: "Sweet sap", emoji: '🍁', text: "Maple trees store sugar in their trunk and roots over the winter. In early spring, a sweet, watery sap starts to flow inside the tree." },
      { title: "Cold nights, warm days", emoji: '🌡️', text: "Sap flows best when nights are below freezing and days are above freezing. That is why sugar makers watch the weather so closely." },
      { title: "The first sugar makers", emoji: '🪶', text: "Indigenous peoples of North America, like the Anishinaabe and the Haudenosaunee, made maple sugar long before Europeans arrived. They taught the settlers how to do it." },
      { title: "Boil, boil, boil!", emoji: '🔥', text: "Sap is mostly water. It takes about 40 litres of sap, boiled for hours, to make just 1 litre of maple syrup." }
    ],
    dialogue: {
      npc: { name: "Elise", role: "a maple sugar maker in Quebec", look: 'farmer', portrayal: 'generic' },
      intro: "Bonjour! I'm Elise. Welcome to our sugar shack! Can you smell the sweet steam? The sap is running today!",
      topics: [
        { ask: "How do you get sap from a tree?", answer: "We drill a small hole in the trunk and tap in a spout. The sap drips into a bucket or flows along a tube. The tree has plenty of sap, and the little hole heals." },
        { ask: "Who first made maple syrup?", answer: "The Indigenous peoples of these forests! They cut into the bark, collected the sap and boiled it down into sugar long before Europeans came. They taught the settlers how, and we are still thankful." },
        { ask: "Why only in spring?", answer: "Sap flows when the nights are freezing and the days are warm. When the buds open, the sap starts to taste bitter, and the season is over." },
        { ask: "How much sap makes syrup?", answer: "About 40 litres of sap make just 1 litre of syrup! We boil away most of the water. That's why maple syrup is so precious." }
      ],
      challenge: {
        q: "About how many litres of sap does it take to make 1 litre of maple syrup?",
        choices: ["1 litre", "About 40 litres", "About 1,000 litres"],
        answer: 1,
        explain: "Sap is mostly water, so it takes about 40 litres of sap, boiled down, to make 1 litre of syrup."
      },
      farewell: "Come back next spring! We will pour hot syrup on the snow and roll it up on a stick. It is called maple taffy!"
    },
    timeline: {
      title: "Maple syrup through time",
      events: [
        { label: "Indigenous peoples are already making maple sugar", year: 1600, when: "by 1600, and long before" },
        { label: "European settlers learn maple sugaring from Indigenous peoples", year: 1700, when: "the 1700s" },
        { label: "Metal buckets, spouts and flat boiling pans make sugaring easier", year: 1870, when: "the late 1800s" },
        { label: "Canada puts a red maple leaf on its flag", year: 1965, when: "1965" },
        { label: "Many sugar makers start using plastic tubes to carry sap", year: 1975, when: "the 1970s" }
      ]
    },
    artifact: {
      model: 'tree-ring',
      name: "A slice of a maple trunk",
      text: "Sap travels up and down in the outer rings of the trunk, just under the bark. That is why a tap hole only needs to be a few centimetres deep. Sugar makers put each new hole in a different place, so the tree stays healthy."
    },
    quiz: [
      { q: "When does maple sap flow best?", choices: ["When nights are freezing and days are warm", "In hot summer", "In the middle of a snowstorm"], answer: 0, hint: "It needs both cold and warm.", explain: "Sap flows best in early spring, when nights are below freezing and days are above freezing." },
      { q: "Who first made maple sugar?", choices: ["Ancient Romans", "Indigenous peoples of North America", "Vikings"], answer: 1, hint: "They lived in the maple forests long before Europeans came.", explain: "Indigenous peoples of North America made maple sugar long before Europeans arrived, and taught the settlers." },
      { q: "Why is the sap boiled for so long?", choices: ["To boil away most of the water", "To make it cold", "To turn it blue"], answer: 0, hint: "Sap is mostly water.", explain: "Boiling takes away most of the water and leaves the thick, sweet syrup." },
      { q: "Which country has a maple leaf on its flag?", choices: ["Japan", "Brazil", "Canada", "Kenya"], answer: 2, hint: "It is in North America, north of the United States.", explain: "Canada's flag has had a red maple leaf on it since 1965." },
      { q: "How does the sap get out of the tree?", choices: ["The tree is chopped down", "Through a small tap hole and a spout", "It drips from the leaves"], answer: 1, hint: "Sugar makers want the tree to stay healthy.", explain: "Sugar makers drill a small hole, tap in a spout and let the sap drip out. The tree stays healthy." }
    ]
  },

  // ───────────── Ring 4: Blossom Canopy (about age 9–10) ─────────────
  {
    id: 'h4-forest-linnaeus',
    subject: 'history',
    floor: 4,
    realm: 'forest',
    title: "Carl Linnaeus Names the Plants",
    topic: 'linnaeus',
    topicName: 'Carl Linnaeus and Plant Names',
    blurb: "Give every plant a two-part name with the botanist who sorted the living world.",
    reading: [
      { title: "Long, muddled names", emoji: '📚', text: "Before the 1700s, plants often had long Latin names that described them in many words. Different books used different names for the same plant. It was very confusing!" },
      { title: "Two names are enough", emoji: '🏷️', text: "The Swedish scientist Carl Linnaeus gave every plant a short two-part name: a group name and a special name. The common daisy became Bellis perennis. Scientists still use his system today." },
      { title: "Sorting by flowers", emoji: '🌸', text: "Linnaeus sorted plants into groups by counting the parts of their flowers, like the stamens that carry the pollen." },
      { title: "Names for animals too", emoji: '🐿️', text: "He named animals as well. He even gave humans their scientific name: Homo sapiens, which means 'wise human'." }
    ],
    dialogue: {
      npc: { name: "Carl Linnaeus", role: "a Swedish botanist who named plants and animals", look: 'botanist', portrayal: 'portrayal' },
      intro: "God dag! I am Carl Linnaeus, from Sweden. I have spent my life sorting and naming plants. Have you brought me a flower to look at?",
      topics: [
        { ask: "Why do plants need scientific names?", answer: "A plant may have a different everyday name in every language, and even in every village! A scientific name is the same all over the world, so scientists everywhere know which plant you mean." },
        { ask: "How does a two-part name work?", answer: "Think of your own name: a family name and your own name. Bellis is the daisy's group, and perennis means it comes back year after year. Together, Bellis perennis means only the common daisy." },
        { ask: "Where did you find your plants?", answer: "Everywhere! When I was young, I travelled to Lapland, in the far north, to study its plants. Later, my students sailed all over the world and sent me seeds and pressed plants." },
        { ask: "Did you really plan a flower clock?", answer: "I had an idea for one! Different flowers open and close at different times of day. If you planted them in the right order, you could tell the time by which flowers were open." }
      ],
      challenge: {
        q: "How many parts does a scientific name from Linnaeus have?",
        choices: ["One", "Two", "Ten"],
        answer: 1,
        explain: "Each name has two parts, a group name and a special name, like Bellis perennis for the common daisy."
      },
      farewell: "Keep looking closely at every flower. There are still many plants waiting for a name!"
    },
    timeline: {
      title: "The life of Carl Linnaeus",
      events: [
        { label: "Carl Linnaeus is born in Sweden", year: 1707, when: "1707" },
        { label: "He travels to Lapland to study its plants", year: 1732, when: "1732" },
        { label: "He publishes Systema Naturae, a book that sorts nature into groups", year: 1735, when: "1735" },
        { label: "His book Species Plantarum gives two-part names to thousands of plants", year: 1753, when: "1753" },
        { label: "He names humans Homo sapiens", year: 1758, when: "1758" }
      ]
    },
    artifact: {
      model: 'magnifier',
      name: "A hand lens",
      text: "Linnaeus counted the tiny parts inside flowers to sort plants into groups. A small magnifying glass, called a hand lens, helps you see the stamens and other flower parts clearly."
    },
    quiz: [
      { q: "Which country was Carl Linnaeus from?", choices: ["Sweden", "Brazil", "Egypt"], answer: 0, hint: "He travelled to Lapland, in the far north of his own country.", explain: "Carl Linnaeus was from Sweden." },
      { q: "What is the scientific name of the common daisy?", choices: ["Daisy daisy", "Homo sapiens", "Bellis perennis"], answer: 2, hint: "Its second part means it comes back year after year.", explain: "The common daisy is Bellis perennis. Homo sapiens is the name for humans." },
      { q: "Why are scientific names useful?", choices: ["They rhyme", "They are the same all over the world", "They are very long"], answer: 1, hint: "Everyday names change from language to language.", explain: "A scientific name is the same everywhere, so scientists all over the world know which plant is meant." },
      { q: "What does Homo sapiens mean?", choices: ["Tall tree", "Busy bee", "Fast runner", "Wise human"], answer: 3, hint: "It is the name Linnaeus gave to people.", explain: "Homo sapiens means 'wise human'. It is our own scientific name." },
      { q: "How did Linnaeus sort plants into groups?", choices: ["By their smell", "By counting the parts of their flowers", "By the colour of their pots"], answer: 1, hint: "He looked closely inside the flowers.", explain: "He sorted plants by counting the parts of their flowers, such as the stamens." }
    ]
  },

  {
    id: 'h4-forest-botanic-gardens',
    subject: 'history',
    floor: 4,
    realm: 'forest',
    title: "The First Botanic Gardens",
    topic: 'botanic-gardens',
    topicName: 'Botanic Gardens',
    blurb: "From Padua to Kew: gardens where scientists grow plants from all over the world.",
    reading: [
      { title: "Gardens for learning", emoji: '🌿', text: "A botanic garden grows plants so people can study them. The first ones, in Italy in the 1540s, grew medicine plants for students who were learning to be doctors." },
      { title: "Kew Gardens", emoji: '🏛️', text: "In 1759, a garden was started at Kew, near London. It grew into one of the biggest botanic gardens in the world, with tens of thousands of kinds of plants." },
      { title: "Plants on a voyage", emoji: '🚢', text: "Plants often died on long sea voyages. Around 1829, Nathaniel Ward found that plants could live for months inside a closed glass case. Soon these Wardian cases carried living plants all over the world." },
      { title: "A bank for seeds", emoji: '🌰', text: "Kew's Millennium Seed Bank keeps billions of seeds, dried and frozen, from plants all over the world. If a plant ever becomes rare, its seeds are safe." }
    ],
    dialogue: {
      npc: { name: "Priya", role: "a gardener at Kew Gardens", look: 'botanist', portrayal: 'generic' },
      intro: "Hello, and welcome to Kew! I'm Priya, a gardener here. Shall we start in the Palm House? It is as warm as a rainforest inside!",
      topics: [
        { ask: "What is a botanic garden for?", answer: "We grow plants so people can learn about them: scientists, students and visitors like you. We study plants, name new ones and help to protect rare ones." },
        { ask: "What is the Palm House?", answer: "It is a giant glasshouse, finished in 1848. The glass lets the sunlight in and keeps the warmth inside, so tropical plants like palms can grow here in chilly London." },
        { ask: "How did plants travel long ago?", answer: "In closed glass boxes called Wardian cases! The case kept the water in, so plants stayed alive on long sea voyages. Before that, many of them died on the way." },
        { ask: "What is a seed bank?", answer: "It is like a bank, but for seeds! We dry them and keep them frozen. Many seeds can stay alive for a very long time like that, ready to grow again." }
      ],
      challenge: {
        q: "What did Wardian cases help people do?",
        choices: ["Carry living plants on long voyages", "Make paper", "Count tree rings"],
        answer: 0,
        explain: "A closed glass Wardian case kept the water in, so plants could stay alive for months at sea."
      },
      farewell: "Thanks for visiting! When you plant a seed at home, you are a little botanic gardener too."
    },
    timeline: {
      title: "Botanic gardens through time",
      events: [
        { label: "A botanic garden for students opens in Padua, Italy", year: 1545, when: "1545" },
        { label: "A garden is started at Kew, near London", year: 1759, when: "1759" },
        { label: "Nathaniel Ward finds that plants can live inside a closed glass case", year: 1829, when: "about 1829" },
        { label: "Kew's great Palm House is finished", year: 1848, when: "1848" },
        { label: "Kew's Millennium Seed Bank opens", year: 2000, when: "2000" },
        { label: "Kew Gardens becomes a World Heritage Site", year: 2003, when: "2003" }
      ]
    },
    artifact: {
      model: 'globe',
      name: "A globe of the plant world",
      text: "Botanic gardens collect plants from all over the world. Gardeners need to know where each plant comes from, so they can give it the right warmth, light and water. A rainforest plant needs a warm, wet glasshouse!"
    },
    quiz: [
      { q: "What is a botanic garden for?", choices: ["Keeping cars", "Growing plants so people can study them", "Selling toys"], answer: 1, hint: "Scientists and students learn there.", explain: "A botanic garden grows plants so that people can study and protect them." },
      { q: "Why can palms grow in the Palm House in chilly London?", choices: ["The glass lets light in and keeps the warmth inside", "It is on the Moon", "The palms wear coats"], answer: 0, hint: "Think about what glass does.", explain: "The glass lets sunlight in and keeps the warmth inside, like a giant greenhouse." },
      { q: "What is a seed bank?", choices: ["A bank that pays you in seeds", "A river bank covered with seeds", "A place where seeds are dried, frozen and kept safe"], answer: 2, hint: "It keeps seeds safe for the future.", explain: "A seed bank dries and freezes seeds so they stay alive for a very long time." },
      { q: "In which country were the first botanic gardens for students?", choices: ["Japan", "Peru", "Canada", "Italy"], answer: 3, hint: "Think of Padua.", explain: "The first botanic gardens for students opened in Italy, in Pisa and Padua, in the 1540s." },
      { q: "Why did the first botanic gardens grow medicine plants?", choices: ["For students learning to be doctors", "For decoration only", "To feed horses"], answer: 0, hint: "Who studied there?", explain: "Students learning to be doctors needed to know which plants could be used as medicines." }
    ]
  },

  // ───────────── Ring 5: Nest Heights (about age 10–11) ─────────────
  {
    id: 'h5-forest-john-muir',
    subject: 'history',
    floor: 5,
    realm: 'forest',
    title: "John Muir and the National Parks",
    topic: 'national-parks',
    topicName: 'John Muir and National Parks',
    blurb: "Climb Yosemite's granite cliffs with the naturalist who helped protect wild places.",
    reading: [
      { title: "A boy who loved the wild", emoji: '🏔️', text: "John Muir was born in Scotland in 1838. When he was 11, his family moved to a farm in Wisconsin, in the United States. He loved exploring the woods, fields and lakes." },
      { title: "A thousand-mile walk", emoji: '🥾', text: "In 1867, John walked about 1,000 miles (1,600 km) from Kentucky to the Gulf of Mexico, studying plants all the way. The next year he reached Yosemite, in California, and fell in love with it." },
      { title: "Words that protect", emoji: '✍️', text: "John wrote articles and books about the beauty of the mountains and the giant sequoia trees. His writing helped to persuade people to make Yosemite a national park in 1890." },
      { title: "Camping with a president", emoji: '⛺', text: "In 1903, President Theodore Roosevelt camped with John in Yosemite. Roosevelt went on to protect huge areas of forest and wild land." }
    ],
    dialogue: {
      npc: { name: "John Muir", role: "a naturalist, writer and explorer of the Sierra Nevada", look: 'explorer', portrayal: 'portrayal' },
      intro: "Hello there! I'm John Muir. Look at those granite cliffs and waterfalls! The mountains are calling, and I must go. Will you come too?",
      topics: [
        { ask: "Why do you love the mountains?", answer: "Out here, every tree, flower, rock and waterfall teaches me something. I am happiest climbing high, with the wind in my hair and a crust of bread in my pocket." },
        { ask: "What is a national park?", answer: "It is a wild place that belongs to everyone and is protected for the future. Nobody may chop down all its trees or build all over it. Yellowstone was the first national park in the world, in 1872." },
        { ask: "What are giant sequoias?", answer: "The biggest trees on Earth! Some are taller than a 25-storey building and more than 2,000 years old. And yet their cones are only about the size of a hen's egg!" },
        { ask: "What is the Sierra Club?", answer: "A club I helped to start in 1892, and I was its first president. Its members explore wild places and work to protect them." }
      ],
      challenge: {
        q: "Which place did John Muir's writing help to make a national park in 1890?",
        choices: ["Yellowstone", "Yosemite", "Kew Gardens"],
        answer: 1,
        explain: "Muir's articles about Yosemite's beauty helped persuade people to protect it. It became a national park in 1890."
      },
      farewell: "Go outside and explore! Climb a hill, listen to a stream, and you will find wild places worth protecting."
    },
    timeline: {
      title: "John Muir and the national parks",
      events: [
        { label: "John Muir is born in Dunbar, Scotland", year: 1838, when: "1838" },
        { label: "He walks about 1,000 miles to the Gulf of Mexico", year: 1867, when: "1867" },
        { label: "He reaches Yosemite for the first time", year: 1868, when: "1868" },
        { label: "Yellowstone becomes the world's first national park", year: 1872, when: "1872" },
        { label: "Yosemite National Park is created", year: 1890, when: "1890" },
        { label: "President Roosevelt camps with Muir in Yosemite", year: 1903, when: "1903" }
      ]
    },
    artifact: {
      model: 'pinecone',
      name: "A giant sequoia cone",
      text: "Giant sequoias are the biggest trees on Earth, but their cones are only about the size of a hen's egg. Each cone holds a couple of hundred tiny seeds. The seeds grow best on open, sunny ground."
    },
    quiz: [
      { q: "Where was John Muir born?", choices: ["Japan", "Scotland", "Brazil"], answer: 1, hint: "His family later moved to Wisconsin.", explain: "John Muir was born in Dunbar, Scotland, in 1838." },
      { q: "What is a national park?", choices: ["A wild place protected for everyone", "A car park in a city", "A private garden"], answer: 0, hint: "It belongs to everyone.", explain: "A national park is a wild place protected for everyone, now and in the future." },
      { q: "How did John Muir help to protect Yosemite?", choices: ["He built a wall round it", "He bought all of it", "He wrote articles and books about its beauty"], answer: 2, hint: "He was a writer.", explain: "His articles and books showed people how special Yosemite was, and helped make it a national park." },
      { q: "Which was the world's first national park, in 1872?", choices: ["Yosemite", "Kew Gardens", "Gombe", "Yellowstone"], answer: 3, hint: "It is famous for its geysers.", explain: "Yellowstone became the world's first national park in 1872." },
      { q: "Which president camped with John Muir in 1903?", choices: ["Abraham Lincoln", "Theodore Roosevelt", "George Washington"], answer: 1, hint: "The teddy bear is named after him.", explain: "President Theodore Roosevelt camped with Muir in Yosemite in 1903." }
    ]
  },

  {
    id: 'h5-forest-beatrix-potter',
    subject: 'history',
    floor: 5,
    realm: 'forest',
    title: "Beatrix Potter: Artist of Nature",
    topic: 'beatrix-potter',
    topicName: 'Beatrix Potter and Nature',
    blurb: "Paint mushrooms, write about Peter Rabbit and protect the hills of the Lake District.",
    reading: [
      { title: "A girl who drew everything", emoji: '🎨', text: "Beatrix Potter was born in London in 1866. She kept pet rabbits and mice, and later even a hedgehog, and she drew and painted them all." },
      { title: "A mushroom scientist", emoji: '🍄', text: "Beatrix painted hundreds of very careful pictures of mushrooms and other fungi. She also did experiments on how their spores grow. In 1897, her paper about it was read at a famous science society in London." },
      { title: "Peter Rabbit", emoji: '🐰', text: "In 1902, her book The Tale of Peter Rabbit was published. Children loved it, and she went on to write more than 20 little books." },
      { title: "Protecting the land", emoji: '⛰️', text: "With the money from her books, Beatrix bought farms in the Lake District, in England. When she died, she left over 4,000 acres of land to the National Trust, so it would be cared for always." }
    ],
    dialogue: {
      npc: { name: "Beatrix Potter", role: "an artist, writer, scientist and farmer", look: 'botanist', portrayal: 'portrayal' },
      intro: "Good day! I'm Beatrix Potter. I have my paints, my notebook and a basket of mushrooms to draw. Do sit down and keep me company!",
      topics: [
        { ask: "Why do you paint mushrooms?", answer: "Mushrooms come in so many shapes and colours! I paint them very carefully, so every detail is right. Scientists can learn a lot from a careful picture." },
        { ask: "Where did Peter Rabbit come from?", answer: "It began as a picture letter I sent to a little boy called Noel, who was ill in bed. I told him a story about four little rabbits. Later, I turned it into a book." },
        { ask: "Why did you become a farmer?", answer: "I love the hills of the Lake District! I bought farms there and raised Herdwick sheep, a tough breed from the fells. I wanted the land and its farms to stay just as they are." },
        { ask: "Who looks after your land now?", answer: "The National Trust. My friend Hardwicke Rawnsley helped to start it in 1895, to protect beautiful places. I left my farms and land to it, so everyone can enjoy them." }
      ],
      challenge: {
        q: "What did Beatrix Potter leave to the National Trust?",
        choices: ["Her paintbrushes", "Over 4,000 acres of land and farms", "A castle in London"],
        answer: 1,
        explain: "She left over 4,000 acres of land, with many farms, so the Lake District countryside would be protected."
      },
      farewell: "Look closely at the little things in nature: a mushroom, a mouse, a leaf. There is a story in every one!"
    },
    timeline: {
      title: "The life of Beatrix Potter",
      events: [
        { label: "Beatrix Potter is born in London", year: 1866, when: "1866" },
        { label: "She writes a picture letter about a rabbit called Peter", year: 1893, when: "1893" },
        { label: "The National Trust is started, to protect special places", year: 1895, when: "1895" },
        { label: "Her paper on how mushroom spores grow is read in London", year: 1897, when: "1897" },
        { label: "The Tale of Peter Rabbit is published", year: 1902, when: "1902" },
        { label: "She buys Hill Top Farm in the Lake District", year: 1905, when: "1905" }
      ]
    },
    artifact: {
      model: 'magnifier',
      name: "A magnifying glass",
      text: "Beatrix looked at fungi through a magnifying glass and a microscope. She drew their tiny spores and how they sprouted, and she painted each mushroom exactly as it looked."
    },
    quiz: [
      { q: "Which part of nature did Beatrix Potter study and paint very carefully?", choices: ["Mushrooms and other fungi", "Volcanoes", "Sharks"], answer: 0, hint: "She carried them home in a basket.", explain: "She painted hundreds of careful pictures of mushrooms and other fungi, and studied their spores." },
      { q: "Which famous book did she write?", choices: ["Treasure Island", "The Tale of Peter Rabbit", "Alice in Wonderland"], answer: 1, hint: "It is about a naughty little rabbit.", explain: "Beatrix Potter wrote The Tale of Peter Rabbit, published in 1902." },
      { q: "How did the story of Peter Rabbit begin?", choices: ["As a film", "As a song", "As a picture letter to a boy who was ill"], answer: 2, hint: "She wrote to a little boy called Noel.", explain: "It began in 1893 as a picture letter to Noel, a boy who was ill in bed." },
      { q: "What did she spend her book money on?", choices: ["A racing car", "A ship", "Diamonds", "Farms and land in the Lake District"], answer: 3, hint: "She raised Herdwick sheep.", explain: "She bought farms and land in the Lake District, and later left them to the National Trust." },
      { q: "Why did she give her land to the National Trust?", choices: ["So it would be protected and cared for always", "So it could be built on", "To get rid of it"], answer: 0, hint: "The National Trust protects special places.", explain: "She wanted the land and its farms to be protected and cared for, for everyone to enjoy." }
    ]
  },

  // ───────────── Ring 6: Sunflower Rings (about age 11–12) ─────────────
  {
    id: 'h6-forest-wangari-maathai',
    subject: 'history',
    floor: 6,
    realm: 'forest',
    title: "Wangari Maathai Plants a Green Belt",
    topic: 'green-belt',
    topicName: 'Wangari Maathai and the Green Belt Movement',
    blurb: "Plant millions of trees across Kenya with the scientist who won the Nobel Peace Prize.",
    reading: [
      { title: "A scientist from Kenya", emoji: '🔬', text: "Wangari Maathai was born in Kenya in 1940. She studied biology in the United States and became the first woman in East and Central Africa to earn a doctorate, the highest university degree." },
      { title: "Trees bring water and food", emoji: '🌳', text: "Wangari listened to women in the countryside. They said streams were drying up and firewood was hard to find. She saw that one answer was to plant trees." },
      { title: "The Green Belt Movement", emoji: '🌱', text: "In 1977, she started the Green Belt Movement. Groups of women grew seedlings from the seeds of local trees and planted them. Together they have planted more than 51 million trees in Kenya." },
      { title: "A Nobel Peace Prize", emoji: '🏅', text: "In 2004, Wangari won the Nobel Peace Prize, the first African woman to win it. She believed that caring for the land helps people live together in peace." }
    ],
    dialogue: {
      npc: { name: "Wangari Maathai", role: "a biologist and founder of the Green Belt Movement", look: 'scientist', portrayal: 'portrayal' },
      intro: "Jambo! I'm Wangari Maathai. Come, help me with these seedlings! Every little tree we plant is a step toward a greener Kenya.",
      topics: [
        { ask: "Why plant trees?", answer: "Trees hold the soil in place when it rains. They help keep streams flowing, and they give firewood, fruit and shade. When we plant trees, we plant hope!" },
        { ask: "Who plants the trees?", answer: "Mostly women from villages all over Kenya. They collect seeds from local trees, grow seedlings in small tree nurseries and plant them out. They are paid a little for each seedling that grows." },
        { ask: "What is the hummingbird story?", answer: "A forest is on fire, and all the big animals just stand and watch. But a tiny hummingbird flies to the stream and carries one drop of water at a time to the fire. 'I am doing the best I can,' it says. Be like the hummingbird: do your little bit!" },
        { ask: "What did you win?", answer: "In 2004, I won the Nobel Peace Prize. It was the first time it was given to an African woman. I said that healthy land helps people to live in peace." }
      ],
      challenge: {
        q: "What did the Green Belt Movement do?",
        choices: ["Built roads", "Planted millions of trees", "Made cars"],
        answer: 1,
        explain: "Women in the Green Belt Movement have planted more than 51 million trees across Kenya."
      },
      farewell: "Go and plant a seed! Even one little tree makes a difference. Be a hummingbird!"
    },
    timeline: {
      title: "Wangari Maathai's green journey",
      events: [
        { label: "Wangari Maathai is born in Kenya", year: 1940, when: "1940" },
        { label: "She goes to study in the United States", year: 1960, when: "1960" },
        { label: "She earns her doctorate in Nairobi", year: 1971, when: "1971" },
        { label: "She starts the Green Belt Movement", year: 1977, when: "1977" },
        { label: "She wins the Nobel Peace Prize", year: 2004, when: "2004" }
      ]
    },
    artifact: {
      model: 'coin',
      name: "A Nobel Peace Prize medal",
      text: "The Nobel Peace Prize is a gold medal given for work toward peace. Wangari Maathai won it in 2004 for her work for the environment, for fairness and for peace. She said that planting trees can help people live together in peace."
    },
    quiz: [
      { q: "Which country was Wangari Maathai from?", choices: ["Canada", "Kenya", "India"], answer: 1, hint: "She said 'Jambo!' to greet you.", explain: "Wangari Maathai was born in Kenya, in East Africa, in 1940." },
      { q: "Why did Wangari want people to plant trees?", choices: ["Trees hold the soil, help streams and give firewood", "Trees are only good for climbing", "Trees make the weather hotter"], answer: 0, hint: "Think about what the village women told her.", explain: "Trees hold soil in place, help keep streams flowing and give firewood, fruit and shade." },
      { q: "Who planted most of the Green Belt Movement's trees?", choices: ["Robots", "Astronauts", "Women in villages all over Kenya"], answer: 2, hint: "Wangari listened to them first.", explain: "Women in villages collected seeds, grew seedlings and planted them." },
      { q: "About how many trees has the Green Belt Movement planted in Kenya?", choices: ["About 51", "About 510", "About 5,100", "More than 51 million"], answer: 3, hint: "It is a very, very big number.", explain: "Together, the groups have planted more than 51 million trees." },
      { q: "What did the hummingbird in Wangari's story do?", choices: ["Flew far away", "Carried water, one drop at a time, to help", "Watched and did nothing"], answer: 1, hint: "'I am doing the best I can.'", explain: "The tiny hummingbird did its little bit, one drop at a time. Wangari said we should all be like the hummingbird." }
    ]
  },

  {
    id: 'h6-forest-jane-goodall',
    subject: 'history',
    floor: 6,
    realm: 'forest',
    title: "Jane Goodall in the Forests of Gombe",
    topic: 'jane-goodall',
    topicName: 'Jane Goodall and the Chimpanzees',
    blurb: "Sit quietly in the forest and watch wild chimpanzees with Jane Goodall.",
    reading: [
      { title: "A dream of Africa", emoji: '🌍', text: "Jane Goodall was born in London in 1934. As a girl she loved animals and dreamed of living with them in Africa. In 1960 she went to Gombe, in Tanzania, to study wild chimpanzees." },
      { title: "Patience in the forest", emoji: '🌳', text: "At first the chimpanzees ran away from her. Jane went back day after day and sat quietly, until at last they let her come close." },
      { title: "Chimps make tools!", emoji: '🌿', text: "Jane saw a chimpanzee she called David Greybeard strip the leaves off a twig, poke it into a termite mound and pull it out covered in termites to eat. Scientists had thought only humans made tools. Jane's discovery changed that." },
      { title: "Hope for the future", emoji: '🌱', text: "Jane spent the rest of her long life travelling the world to speak for chimpanzees and forests. In 1991 she started Roots & Shoots, a group where young people help animals, people and the planet." }
    ],
    dialogue: {
      npc: { name: "Jane Goodall", role: "a scientist who studied wild chimpanzees", look: 'explorer', portrayal: 'portrayal' },
      intro: "Hello! I'm Jane Goodall. Shh, sit very still: there are chimpanzees in the trees just above us. Let's watch them together.",
      topics: [
        { ask: "How did you get the chimpanzees to trust you?", answer: "I was patient! I wore the same plain clothes and came back to the same places every day. Slowly the chimpanzees got used to me, and after many months they let me sit close by." },
        { ask: "What did you discover?", answer: "I saw a chimpanzee pull the leaves off a twig, poke it into a termite mound and fish out termites to eat. He was making a tool! Back then, people thought only humans did that." },
        { ask: "Do chimpanzees have feelings?", answer: "I believe so! They hug, hold hands, tickle each other and play. Mothers take great care of their babies. Every chimp has its own character, so I gave them names, like David Greybeard and Flo." },
        { ask: "What can children do?", answer: "Lots! Start a Roots & Shoots group with your friends. Plant trees, pick up litter, help animals. Every day, you can make a difference." }
      ],
      challenge: {
        q: "What did Jane see a chimpanzee use as a tool?",
        choices: ["A twig to fish for termites", "A metal spoon", "A paintbrush"],
        answer: 0,
        explain: "David Greybeard stripped a twig and used it to fish termites out of their mound. That showed that chimpanzees make tools."
      },
      farewell: "Remember: every one of us can make a difference, every single day."
    },
    timeline: {
      title: "Jane Goodall's life with chimpanzees",
      events: [
        { label: "Jane Goodall is born in London", year: 1934, when: "1934" },
        { label: "She arrives at Gombe, in Tanzania, to study chimpanzees", year: 1960, when: "1960" },
        { label: "She earns a doctorate from Cambridge University", year: 1965, when: "1965" },
        { label: "Gombe becomes a national park", year: 1968, when: "1968" },
        { label: "She starts the Jane Goodall Institute", year: 1977, when: "1977" },
        { label: "She starts Roots & Shoots with 12 students in Tanzania", year: 1991, when: "1991" }
      ]
    },
    artifact: {
      model: 'scroll',
      name: "Jane's field notes",
      text: "Every day, Jane wrote down what each chimpanzee did: who they groomed, what they ate and where they slept. Years of careful notes like these helped scientists understand chimpanzees far better."
    },
    quiz: [
      { q: "Which animals did Jane Goodall study at Gombe?", choices: ["Penguins", "Chimpanzees", "Elephants"], answer: 1, hint: "They are our closest animal cousins.", explain: "Jane Goodall studied wild chimpanzees at Gombe, in Tanzania." },
      { q: "How did Jane get the chimpanzees used to her?", choices: ["By being patient and coming back every day", "By giving them toys", "By shouting"], answer: 0, hint: "It took many months.", explain: "She was patient: she came back to the same places every day until the chimpanzees let her come close." },
      { q: "Why was her tool discovery so surprising?", choices: ["Chimps were thought to be afraid of termites", "Nobody knew termites existed", "People thought only humans made tools"], answer: 2, hint: "What did scientists believe before?", explain: "Scientists had thought only humans made tools, so a chimp making one changed how people saw animals." },
      { q: "In which country is Gombe?", choices: ["Kenya", "Brazil", "India", "Tanzania"], answer: 3, hint: "Roots & Shoots started there too.", explain: "Gombe is in Tanzania, in East Africa." },
      { q: "What is Roots & Shoots?", choices: ["A type of tree", "A group where young people help animals, people and the planet", "A chimpanzee's name"], answer: 1, hint: "Jane started it in 1991.", explain: "Roots & Shoots is a group where young people work on projects to help animals, people and the planet." }
    ]
  },

  // ───────────── Ring 7: Starlight Crown (about age 12–13) ─────────────
  {
    id: 'h7-forest-mendel-peas',
    subject: 'history',
    floor: 7,
    realm: 'forest',
    title: "Gregor Mendel's Pea Plants",
    topic: 'mendel',
    topicName: 'Mendel and Heredity',
    blurb: "Count thousands of peas in a monastery garden and discover the rules of heredity.",
    reading: [
      { title: "A garden in a monastery", emoji: '🌱', text: "Gregor Mendel was a monk at St Thomas's Abbey in Brno, in what is now the Czech Republic. Between 1856 and 1863, he grew tens of thousands of pea plants in the monastery garden." },
      { title: "Seven clear traits", emoji: '🟢', text: "Mendel chose seven traits with two clear forms each, such as yellow or green seeds, round or wrinkled seeds, and tall or short plants. He crossed plants by moving pollen from one flower to another with a small brush." },
      { title: "The 3 to 1 pattern", emoji: '📊', text: "He crossed pure yellow-seeded plants with pure green-seeded ones, and all the offspring had yellow seeds! But in the next generation, green came back: about 3 yellow for every 1 green. He counted 6,022 yellow seeds and 2,001 green ones." },
      { title: "Dominant and recessive", emoji: '🧬', text: "Mendel worked out that each plant carries two 'factors' for each trait, one from each parent. A dominant factor, like yellow, hides a recessive one, like green. Today we call these factors genes." }
    ],
    dialogue: {
      npc: { name: "Gregor Mendel", role: "a monk and scientist who studied pea plants", look: 'scientist', portrayal: 'portrayal' },
      intro: "Welcome to the monastery garden! I'm Gregor Mendel. Mind the pea plants: each one is part of my experiment. Shall I show you what I have been counting?",
      topics: [
        { ask: "Why did you choose peas?", answer: "Peas are perfect! They grow quickly, they have clear traits like yellow or green seeds, and I can control which flower's pollen reaches which plant. I can study many generations in just a few years." },
        { ask: "What happened when you crossed yellow and green?", answer: "All the first-generation plants had yellow seeds. The green seemed to vanish! But when those plants made seeds of their own, green came back in about one quarter of them." },
        { ask: "What does dominant mean?", answer: "Each plant has two factors for seed colour. If it has even one yellow factor, its seeds are yellow, so yellow is dominant. A plant only has green seeds if both its factors are green, so green is recessive." },
        { ask: "Did people listen to you?", answer: "I presented my work in 1865 and published it in 1866, but few people understood it in my lifetime. Then, in 1900, three other scientists found my work again, and now people call me the father of genetics!" }
      ],
      challenge: {
        q: "In the second generation, about what fraction of Mendel's pea seeds were green?",
        choices: ["None", "About 1/4", "About 3/4", "All of them"],
        answer: 1,
        explain: "About 3 yellow for every 1 green means 1 out of every 4 seeds, or about 1/4, were green. He counted 6,022 yellow and 2,001 green."
      },
      farewell: "Keep counting carefully, and nature will show you its patterns. Goodbye, young scientist!"
    },
    timeline: {
      title: "Mendel and the science of heredity",
      events: [
        { label: "Gregor Mendel is born in Silesia, in today's Czech Republic", year: 1822, when: "1822" },
        { label: "He joins St Thomas's Abbey in Brno", year: 1843, when: "1843" },
        { label: "He begins his pea plant experiments", year: 1856, when: "1856" },
        { label: "He presents his results in Brno", year: 1865, when: "1865" },
        { label: "Three scientists rediscover Mendel's work", year: 1900, when: "1900" },
        { label: "Scientists discover the double-helix shape of DNA, which genes are made of", year: 1953, when: "1953" }
      ]
    },
    artifact: {
      model: 'magnifier',
      name: "A magnifying glass",
      text: "Careful work on tiny flower parts needs sharp eyes, and a magnifying glass helps. To cross two pea plants, Mendel opened a young flower, took out its pollen-making parts and dusted on pollen from another plant with a small brush."
    },
    quiz: [
      { q: "Where did Mendel grow his pea plants?", choices: ["On a ship", "In a desert", "In a city park in Paris", "In a monastery garden"], answer: 3, hint: "He was a monk.", explain: "Mendel grew his peas in the garden of St Thomas's Abbey in Brno." },
      { q: "Mendel crossed pure yellow-seeded plants with pure green-seeded plants. What colour were the seeds of all the first-generation plants?", choices: ["Green", "Yellow", "Half yellow, half green"], answer: 1, hint: "One colour was dominant.", explain: "All the first-generation seeds were yellow, because yellow is dominant." },
      { q: "In the next generation, Mendel counted 6,022 yellow seeds and 2,001 green ones. Which ratio is that closest to?", choices: ["1 : 1", "2 : 1", "3 : 1", "4 : 3"], answer: 2, hint: "Divide 6,022 by 2,001.", explain: "6,022 ÷ 2,001 is about 3.01, so the ratio is very close to 3 : 1." },
      { q: "A pea plant has one yellow factor and one green factor. What colour are its seeds?", choices: ["Yellow, because yellow is dominant", "Green, because green is dominant", "Half yellow and half green"], answer: 0, hint: "A dominant factor hides a recessive one.", explain: "Yellow is dominant, so one yellow factor is enough to make the seeds yellow." },
      { q: "What do we call Mendel's 'factors' today?", choices: ["Atoms", "Genes", "Cells"], answer: 1, hint: "The science of heredity is named after them.", explain: "Mendel's factors are what we now call genes, and the science is called genetics." }
    ]
  },

  {
    id: 'h7-forest-amazon-scientists',
    subject: 'history',
    floor: 7,
    realm: 'forest',
    title: "Scientists of the Amazon Rainforest",
    topic: 'amazon-rainforest',
    topicName: 'The Amazon Rainforest',
    blurb: "Explore the world's largest rainforest with the scientists and artists who studied it, and the people who protect it.",
    reading: [
      { title: "The greatest rainforest", emoji: '🌳', text: "The Amazon rainforest in South America is the largest tropical rainforest on Earth, bigger than the whole of India. It is home to about 1 in 10 of all the kinds of plants and animals we know." },
      { title: "A naturalist on the river", emoji: '🦋', text: "In 1848, Henry Walter Bates sailed to the Amazon. He spent 11 years there and collected about 14,700 kinds of animals, mostly insects. About 8,000 of them were new to science!" },
      { title: "Painting a moonflower", emoji: '🌙', text: "The artist Margaret Mee painted Amazon plants for over 30 years. In 1988, when she was nearly 80, she painted a rare cactus flower called the moonflower, which opens for just one night." },
      { title: "Protecting the forest", emoji: '🛡️', text: "Indigenous peoples have cared for the Amazon for thousands of years. Today, parks and Indigenous lands protect huge areas of it. Between 2004 and 2012, Brazil cut the yearly loss of forest in the Amazon by more than three quarters." }
    ],
    dialogue: {
      npc: { name: "Dr. Luana", role: "a Brazilian rainforest scientist", look: 'botanist', portrayal: 'generic' },
      intro: "Olá! I'm Dr. Luana. Welcome to our research station deep in the Amazon. Climb up to the canopy walkway with me: that's where most of the life is!",
      topics: [
        { ask: "Why is the canopy so busy?", answer: "The canopy is the roof of leaves high above the ground. It gets the most sunlight, so it has the most flowers, fruit and leaves to eat. Many animals live their whole lives up here and hardly ever touch the ground!" },
        { ask: "Who were the first rainforest scientists?", answer: "The Indigenous peoples of the Amazon! They have known its plants and animals for thousands of years. Later, visitors like Alexander von Humboldt, Henry Walter Bates and Alfred Russel Wallace came to study it, and they learned a lot from local guides." },
        { ask: "Are there still new species to find?", answer: "Yes! Scientists describe new kinds of plants and animals from the Amazon every year: frogs, fish, insects and even monkeys." },
        { ask: "Is the rainforest being protected?", answer: "Yes, and there is reason for hope. Huge parks and Indigenous lands protect large parts of the forest. When people work together, forest loss can fall a lot, as it did in Brazil between 2004 and 2012." }
      ],
      challenge: {
        q: "About how many of all the kinds of plants and animals we know live in the Amazon?",
        choices: ["About 1 in 10", "About 1 in 1,000", "All of them"],
        answer: 0,
        explain: "The Amazon is home to about 1 in 10 of all the known kinds of plants and animals on Earth."
      },
      farewell: "Thank you for visiting the canopy! Remember: forests are full of discoveries still waiting to be made."
    },
    timeline: {
      title: "Studying the Amazon through time",
      events: [
        { label: "Alexander von Humboldt shows that the Casiquiare River links the Orinoco and the Amazon", year: 1800, when: "1800" },
        { label: "Henry Walter Bates and Alfred Russel Wallace arrive in the Amazon", year: 1848, when: "1848" },
        { label: "Bates publishes his book The Naturalist on the River Amazons", year: 1863, when: "1863" },
        { label: "Margaret Mee paints the moonflower in bloom", year: 1988, when: "1988" },
        { label: "Brazil starts a big programme of protected areas in the Amazon", year: 2002, when: "2002" },
        { label: "Forest loss in Brazil's Amazon falls to its lowest level since records began", year: 2012, when: "2012" }
      ]
    },
    artifact: {
      model: 'compass',
      name: "A compass",
      text: "Under the thick roof of the rainforest, it is hard to see the Sun or the stars. Scientists use a compass and maps, and today GPS too, to find their way to their study plots and back again."
    },
    quiz: [
      { q: "Where is the Amazon rainforest?", choices: ["Europe", "South America", "Antarctica"], answer: 1, hint: "Brazil is there.", explain: "The Amazon rainforest is in South America, mostly in Brazil." },
      { q: "What is the rainforest canopy?", choices: ["The roof of leaves high above the ground", "An underground river", "A kind of boat"], answer: 0, hint: "Dr. Luana took you up a walkway to see it.", explain: "The canopy is the roof of leaves high above the forest floor, where most of the life is." },
      { q: "Henry Walter Bates collected about 14,700 kinds of animals in the Amazon. About how many were new to science?", choices: ["About 80", "About 800", "About 8,000"], answer: 2, hint: "It was more than half of them.", explain: "About 8,000 of the kinds he collected had never been described by scientists before." },
      { q: "Who have cared for the Amazon rainforest for thousands of years?", choices: ["Vikings", "Ancient Romans", "Astronauts", "Indigenous peoples"], answer: 3, hint: "They were the first rainforest scientists.", explain: "Indigenous peoples have lived in and cared for the Amazon for thousands of years." },
      { q: "What did Margaret Mee paint in 1988?", choices: ["A map of the stars", "A moonflower that opens for just one night", "A portrait of a king"], answer: 1, hint: "It blooms in the dark.", explain: "She painted the rare moonflower, a cactus flower that opens for just one night." }
    ]
  }
];

/* ------------------------------------------------------------ Nature Lab (physics) */

const FOREST_PHYSICS = [
  // ───────────── Ring 1: Root Hollow (about age 6–7) ─────────────
  {
    id: 'p1-forest-falling-seeds',
    subject: 'physics',
    floor: 1,
    realm: 'forest',
    title: "Falling Seeds and Acorns",
    topic: 'gravity',
    topicName: 'Gravity and falling',
    blurb: "Drop a fluffy seed and a heavy acorn. Which one lands first?",
    reading: [
      { title: "Everything falls", emoji: '🍂', text: "When an acorn lets go of its oak tree, it falls down to the ground. A pull called gravity pulls everything down toward the Earth." },
      { title: "Fluffy seeds float", emoji: '🌬️', text: "A dandelion seed has a fluffy parachute. The air pushes up under the fluff, so the seed drifts down slowly. The wind can carry it far away." },
      { title: "Heavy acorns drop", emoji: '🌰', text: "An acorn is small and heavy for its size, so the air hardly slows it down. It drops straight to the ground. Plop!" },
      { title: "Off to new places", emoji: '🌱', text: "Plants want their seeds to land in new places with room to grow. Some seeds fly on the wind, and squirrels and jays carry acorns away and bury them!" }
    ],
    sim: {
      id: 'drop',
      setup: { objects: ['ball', 'feather'], air: 'on' },
      predict: {
        q: "In the lab, a feather (fluffy, like a dandelion seed) and a ball (heavy, like an acorn) are dropped at the same time. Which one lands first?",
        choices: ["The feather", "The ball", "They land together"],
        answer: 1,
        explain: "The air pushes hard on the fluffy feather and slows it down. The ball hardly feels the air, so it lands first."
      }
    },
    quiz: [
      { q: "What pulls an acorn down to the ground?", choices: ["Gravity", "The wind", "A magnet"], answer: 0, hint: "It pulls everything down toward the Earth.", explain: "Gravity pulls the acorn, and everything else, down toward the Earth." },
      { q: "Why does a dandelion seed fall slowly?", choices: ["It is made of stone", "The air pushes up under its fluffy parachute", "It is asleep"], answer: 1, hint: "Look at its fluff.", explain: "The air pushes up under the fluffy parachute, so the seed drifts down slowly." },
      { q: "A feather and a ball are dropped at the same time. Which one lands last?", choices: ["The ball", "They land together", "The feather"], answer: 2, hint: "Remember what you saw in the lab.", explain: "The air slows the fluffy feather down, so it lands after the ball." },
      { q: "How can a dandelion seed travel far away?", choices: ["It walks", "The wind carries it", "It swims"], answer: 1, hint: "Blow on a dandelion clock and see!", explain: "The wind catches the fluffy parachute and carries the seed far away." },
      { q: "Which animal carries acorns away and buries them?", choices: ["A squirrel", "A fish", "A snail"], answer: 0, hint: "It has a big bushy tail.", explain: "Squirrels bury acorns to eat later. Some are forgotten, and they grow into new oak trees!" }
    ]
  },
  {
    id: 'p1-forest-twig-boats',
    subject: 'physics',
    floor: 1,
    realm: 'forest',
    title: "Twig Boats in the Puddle",
    topic: 'floating',
    topicName: 'Floating and sinking',
    blurb: "Drop forest finds into the water tank. Which ones float like a little twig boat?",
    reading: [
      { title: "Float or sink", emoji: '💧', text: "When you drop something into water, it stays on top or it drops to the bottom. Staying on top is called floating. Dropping to the bottom is called sinking." },
      { title: "Wood floats", emoji: '🪵', text: "Twigs, sticks and logs float on ponds and streams. That is why a twig makes a good little boat!" },
      { title: "Cork comes from a tree", emoji: '🌳', text: "Cork is the soft, light bark of the cork oak tree. It is full of tiny pockets of air, so it floats very well." },
      { title: "Not about size", emoji: '🪨', text: "A pebble is much smaller than a log, but the pebble sinks and the log floats. What a thing is made of matters more than how big it is." }
    ],
    sim: {
      id: 'float',
      setup: { items: ['wooden-block', 'apple', 'stone', 'cork', 'key', 'glass-marble'] },
      predict: {
        q: "An apple falls from a tree into the water. Will it float or sink?",
        choices: ["It sinks", "It floats"],
        answer: 1,
        explain: "An apple floats! It has lots of air inside it, which makes it light for its size."
      }
    },
    quiz: [
      { q: "Which of these floats on a pond?", choices: ["A twig", "A stone", "A key"], answer: 0, hint: "It comes from a tree.", explain: "A twig is made of wood, and wood floats. Stones and keys sink." },
      { q: "Where does cork come from?", choices: ["A rock", "The bark of a cork oak tree", "The sea"], answer: 1, hint: "It grows on a tree.", explain: "Cork is the light bark of the cork oak tree." },
      { q: "Why does an apple float?", choices: ["It is red", "It is round", "It has lots of air inside"], answer: 2, hint: "What is hiding inside the apple?", explain: "An apple has lots of air inside, so it is light for its size and floats." },
      { q: "A pebble and a big log fall into a stream. Which one sinks?", choices: ["The pebble", "The log"], answer: 0, hint: "Size does not decide it.", explain: "The pebble sinks and the big log floats. What a thing is made of matters more than its size." },
      { q: "Why do twigs make good little boats?", choices: ["Wood is sticky", "Wood floats", "Wood sinks fast"], answer: 1, hint: "A boat must stay on top of the water.", explain: "Wood floats, so a twig stays on top of the water like a little boat." }
    ]
  },

  // ───────────── Ring 2: Fern Boughs (about age 7–8) ─────────────
  {
    id: 'p2-forest-woodpecker-drums',
    subject: 'physics',
    floor: 2,
    realm: 'forest',
    title: "Woodpecker Drumming",
    topic: 'sound',
    topicName: 'Sound',
    blurb: "Rat-a-tat-tat! Find out how woodpeckers, birds and owls make their sounds.",
    reading: [
      { title: "Sounds are shakes", emoji: '🥁', text: "Every sound is made by something shaking back and forth very fast. This shaking is called a vibration." },
      { title: "Rat-a-tat-tat", emoji: '🐦', text: "A woodpecker drums on a tree with its beak, many times every second. The wood shakes, and the sound travels far through the forest. That is how a woodpecker says: this is my home!" },
      { title: "High and low", emoji: '🎵', text: "Small, short things shake fast and make high sounds, like a little bird's tweet. Big, long things shake slowly and make low sounds, like an owl's hoot." },
      { title: "Loud and soft", emoji: '🔊', text: "Hit something hard and it shakes a lot, so the sound is loud. Tap it gently and the sound is soft." }
    ],
    sim: {
      id: 'sound',
      predict: {
        q: "In the lab, you make less of the ruler stick out, so the part that shakes is shorter. Then you twang it. How will the note sound?",
        choices: ["Lower", "Just the same", "Higher"],
        answer: 2,
        explain: "A shorter ruler shakes faster, and faster shaking makes a higher note, like a little bird's tweet."
      }
    },
    quiz: [
      { q: "What makes a sound?", choices: ["Something shaking back and forth", "Something keeping very still", "Light"], answer: 0, hint: "Touch your throat when you hum.", explain: "Every sound is made by something shaking back and forth: a vibration." },
      { q: "Why does a woodpecker drum on trees?", choices: ["To wake up the trees", "To tell other woodpeckers this is its home", "To make it rain"], answer: 1, hint: "The sound carries far through the forest.", explain: "Woodpeckers drum to say 'this is my home' and to call to other woodpeckers." },
      { q: "A short ruler and a long ruler are twanged. Which makes the higher note?", choices: ["The long one", "They are the same", "The short one"], answer: 2, hint: "Short things shake faster.", explain: "The short ruler shakes faster, so it makes a higher note." },
      { q: "How do you make a louder drum sound on a log?", choices: ["Hit it harder", "Hit it more gently", "Whisper to it"], answer: 0, hint: "A big shake makes a big sound.", explain: "Hitting harder makes the wood shake more, so the sound is louder." },
      { q: "Which one makes a lower sound?", choices: ["A tiny bird's tweet", "A big owl's hoot"], answer: 1, hint: "Big things shake slowly.", explain: "A big owl's hoot is a low sound. A tiny bird's tweet is high." }
    ]
  },
  {
    id: 'p2-forest-rolling-acorns',
    subject: 'physics',
    floor: 2,
    realm: 'forest',
    title: "Rolling Acorns",
    topic: 'friction',
    topicName: 'Friction',
    blurb: "Roll down the hill onto soft moss, a smooth log or a frozen pond. Where does it go furthest?",
    reading: [
      { title: "Rolling downhill", emoji: '⛰️', text: "Put an acorn at the top of a slope and let go. Gravity pulls it down, and it rolls faster and faster." },
      { title: "Friction slows things", emoji: '✋', text: "When things rub or roll over a surface, a force called friction slows them down. Bumpy, soft surfaces make lots of friction." },
      { title: "Moss, wood and ice", emoji: '🧊', text: "Soft moss is like a carpet: it stops things quickly. Smooth wood is in the middle. A frozen pond is very slippery, so things slide and roll a long way." },
      { title: "Friction helps too", emoji: '🦔', text: "Friction is useful! It helps your shoes grip the forest path, and it helps a hedgehog's feet grip a log." }
    ],
    sim: {
      id: 'ramp',
      setup: { surfaces: ['carpet', 'wood', 'ice'] },
      predict: {
        q: "The toy car rolls down the ramp onto carpet (soft, like moss), wood or ice. On which one will it roll the furthest?",
        choices: ["Carpet", "Ice", "Wood"],
        answer: 1,
        explain: "Ice is smooth and slippery, so it makes the least friction. The car rolls furthest on ice and stops soonest on the soft carpet."
      }
    },
    quiz: [
      { q: "What is the force that slows rolling things down?", choices: ["Friction", "Magnetism", "Sound"], answer: 0, hint: "It happens when things rub.", explain: "Friction is the force that slows things down when they rub or roll over a surface." },
      { q: "Where will an acorn roll the furthest?", choices: ["On soft moss", "On a frozen pond", "In thick mud"], answer: 1, hint: "Which one is the most slippery?", explain: "A frozen pond is smooth and slippery, with very little friction, so the acorn rolls furthest." },
      { q: "Why does soft moss stop a rolling acorn quickly?", choices: ["Moss is cold", "Moss is green", "It makes lots of friction"], answer: 2, hint: "Moss is soft and bumpy, like a carpet.", explain: "Soft, bumpy moss makes lots of friction, so the acorn stops quickly." },
      { q: "Why is it easy to slip on ice?", choices: ["Ice is sticky", "Ice makes very little friction", "Ice is hot"], answer: 1, hint: "Your shoes cannot grip it.", explain: "Ice is smooth and makes very little friction, so your feet slide." },
      { q: "How does friction help you on a forest path?", choices: ["It helps your shoes grip, so you don't slip", "It makes you fly", "It makes the path wet"], answer: 0, hint: "Think about walking without slipping.", explain: "Friction between your shoes and the path lets you grip and walk without slipping." }
    ]
  },

  // ───────────── Ring 3: Lantern Branches (about age 8–9) ─────────────
  {
    id: 'p3-forest-firefly-lantern',
    subject: 'physics',
    floor: 3,
    realm: 'forest',
    title: "The Firefly Lantern",
    topic: 'electric-circuits',
    topicName: 'Electric circuits',
    blurb: "Light a lantern for the squirrels: which things let electricity flow?",
    reading: [
      { title: "Fireflies make their own light", emoji: '✨', text: "On summer nights, fireflies glow in the dark. They make light inside their bodies by mixing special chemicals. They do not use electricity at all!" },
      { title: "A lantern needs a loop", emoji: '🏮', text: "An electric lantern needs a battery, a bulb and wires joined in a full loop. This loop is called a circuit. If there is a gap, the bulb stays dark." },
      { title: "Conductors", emoji: '🔌', text: "Electricity can flow through metals like copper, iron and aluminium. Things that let electricity flow are called conductors." },
      { title: "Insulators", emoji: '🪵', text: "Electricity cannot flow through dry wood, plastic, rubber or paper. These are called insulators. Plastic covers on wires help keep us safe." }
    ],
    sim: {
      id: 'circuit',
      setup: { items: ['copper-wire', 'wooden-stick', 'paper-clip', 'rubber-band', 'aluminium-foil', 'paper-strip'] },
      predict: {
        q: "You bridge the gap with a wooden stick, like a twig from the tree. Will the lantern bulb light up?",
        choices: ["Yes, it lights up", "No, it stays dark"],
        answer: 1,
        explain: "Wood is an insulator: electricity cannot flow through it. The loop stays broken, so the bulb stays dark. A copper wire or a paper clip would light it."
      }
    },
    quiz: [
      { q: "How do fireflies make their light?", choices: ["By mixing special chemicals in their bodies", "With tiny batteries", "By catching sunlight in jars"], answer: 0, hint: "They do not use electricity.", explain: "Fireflies make light by mixing special chemicals inside their bodies." },
      { q: "What is a circuit?", choices: ["A kind of insect", "A full loop that electricity can flow around", "A tree branch"], answer: 1, hint: "The bulb lights only when there is no gap.", explain: "A circuit is a full loop, from the battery through the bulb and back, that electricity can flow around." },
      { q: "Which of these is a conductor?", choices: ["A twig", "A rubber band", "A paper clip"], answer: 2, hint: "Look for the one made of metal.", explain: "A paper clip is made of metal, so electricity can flow through it." },
      { q: "How does a switch turn a lantern off?", choices: ["It opens a gap in the loop", "It cools the bulb", "It hides the battery"], answer: 0, hint: "Electricity needs a full loop.", explain: "Turning the switch off opens a gap, so the loop is broken and the bulb goes dark." },
      { q: "Why are wires covered in plastic?", choices: ["Plastic makes electricity flow faster", "Plastic is an insulator, so it keeps us safe", "Plastic makes the wire glow"], answer: 1, hint: "Electricity cannot flow through plastic.", explain: "Plastic is an insulator, so the electricity stays inside the wire and cannot reach our hands." }
    ]
  },
  {
    id: 'p3-forest-hike-compass',
    subject: 'physics',
    floor: 3,
    realm: 'forest',
    title: "A Compass for the Forest Hike",
    topic: 'magnets',
    topicName: 'Magnets',
    blurb: "Find your way through the woods with a magnet that points north.",
    reading: [
      { title: "Which way now?", emoji: '🌲', text: "Deep in a forest, every way can look the same. A compass helps hikers know which way is north." },
      { title: "A magnet inside", emoji: '🧭', text: "A compass needle is a thin magnet that can spin freely. The Earth acts like a giant magnet, so the needle turns to line up north and south." },
      { title: "What magnets pull", emoji: '🧲', text: "Magnets pull things made of iron and steel, like nails and paper clips. They do not pull wood, glass, plastic or rubber." },
      { title: "Two poles", emoji: '🔴', text: "Every magnet has a north pole and a south pole. Two north poles push each other away. A north pole and a south pole pull together." }
    ],
    sim: {
      id: 'magnet',
      setup: { items: ['iron-nail', 'pencil', 'paper-clip', 'glass-marble', 'steel-bolt', 'wooden-block'] },
      predict: {
        q: "Which one will the magnet pick up: the paper clip or the glass marble?",
        choices: ["The glass marble", "The paper clip", "Both of them"],
        answer: 1,
        explain: "The paper clip is made of steel, which is mostly iron, so the magnet pulls it. Glass is not magnetic."
      }
    },
    quiz: [
      { q: "What is a compass needle?", choices: ["A thin magnet that can spin", "A piece of wood", "A pine needle"], answer: 0, hint: "It swings to point north.", explain: "A compass needle is a thin magnet that can spin freely." },
      { q: "Which way does a compass needle point?", choices: ["Toward the tallest tree", "North and south", "Toward the nearest river"], answer: 1, hint: "Think of the directions on a map.", explain: "The needle lines up north and south, because the Earth acts like a giant magnet." },
      { q: "Which of these will a magnet pull?", choices: ["A pinecone", "A glass marble", "An iron nail"], answer: 2, hint: "Magnets pull iron and steel.", explain: "The iron nail sticks. Pinecones and glass are not magnetic." },
      { q: "Two magnets have their north poles facing each other. What happens?", choices: ["They push each other away", "They pull together", "Nothing at all"], answer: 0, hint: "Two of the same pole…", explain: "Two north poles push each other away. Only opposite poles pull together." },
      { q: "Why should you keep your compass away from an iron cooking pot?", choices: ["The pot will get hot", "The iron pulls on the needle and makes it point the wrong way", "The compass will melt"], answer: 1, hint: "What does a magnet pull?", explain: "Iron near a compass pulls on its magnetic needle, so it points the wrong way." }
    ]
  },

  // ───────────── Ring 4: Blossom Canopy (about age 9–10) ─────────────
  {
    id: 'p4-forest-tree-shadows',
    subject: 'physics',
    floor: 4,
    realm: 'forest',
    title: "Tree Shadows Through the Day",
    topic: 'light-shadows',
    topicName: 'Light and shadows',
    blurb: "Watch tree shadows stretch and shrink, and measure a tree with its shadow.",
    reading: [
      { title: "Light goes straight", emoji: '☀️', text: "Light travels in straight lines. When a tree blocks the sunlight, it leaves a dark shape behind it: its shadow." },
      { title: "Long and short shadows", emoji: '🌳', text: "In the morning and evening, the Sun is low in the sky, so shadows are long. Around midday, the Sun is high, so shadows are short." },
      { title: "Shadows move", emoji: '🕰️', text: "As the Sun moves across the sky, shadows swing round the tree. In the morning the Sun is in the east, so shadows point west. In the evening they point east. Sundials use shadows to tell the time." },
      { title: "Measure a tree", emoji: '📏', text: "At the same moment, every shadow on flat ground has the same length compared with the thing that makes it. If a 1 m stick has a 2 m shadow, a tree with a 20 m shadow is 10 m tall!" }
    ],
    sim: {
      id: 'shadow',
      predict: {
        q: "In the lab, you slide the torch closer to the toy. What happens to the toy's shadow on the wall?",
        choices: ["It gets bigger", "It gets smaller", "It disappears"],
        answer: 0,
        explain: "Close to the torch, the toy blocks much more of the light, so its shadow grows bigger."
      }
    },
    quiz: [
      { q: "When are tree shadows shortest?", choices: ["Early in the morning", "Around midday, when the Sun is high", "In the evening"], answer: 1, hint: "When is the Sun highest in the sky?", explain: "Around midday the Sun is high, so shadows are short." },
      { q: "Why does a tree make a shadow?", choices: ["It blocks the sunlight", "It makes dark paint", "Its leaves are green"], answer: 0, hint: "Light cannot get through it.", explain: "The tree blocks the sunlight, and light travels in straight lines, so a dark shadow forms behind it." },
      { q: "In the morning the Sun is in the east. Which way does a tree's shadow point?", choices: ["East", "Up into the sky", "West"], answer: 2, hint: "A shadow points away from the Sun.", explain: "The shadow points away from the Sun, so in the morning it points west." },
      { q: "A 1 m stick has a 2 m shadow. At the same moment, a tree's shadow is 16 m long. How tall is the tree?", choices: ["32 m", "16 m", "4 m", "8 m"], answer: 3, hint: "Each shadow is twice as long as the thing that makes it.", explain: "The shadows are twice as long as the things that make them, so the tree is 16 ÷ 2 = 8 m tall." },
      { q: "A light moves further away from a toy. What happens to the toy's shadow?", choices: ["It gets bigger", "It gets smaller", "It turns green"], answer: 1, hint: "Remember the lab, the other way round.", explain: "Further from the light, the toy blocks less of it, so the shadow gets smaller." }
    ]
  },
  {
    id: 'p4-forest-dew-frost',
    subject: 'physics',
    floor: 4,
    realm: 'forest',
    title: "Rain, Dew and Frost",
    topic: 'states-of-matter',
    topicName: 'States of matter',
    blurb: "Where does the morning dew come from? Melt, warm and boil water in the Nature Lab.",
    reading: [
      { title: "Three states of water", emoji: '💧', text: "Water can be a solid (ice), a liquid (water) or a gas (water vapour). Heating and cooling change it from one state to another." },
      { title: "Trees breathe out water", emoji: '🌳', text: "Trees pull water up from the soil, and lots of it escapes from tiny holes in their leaves as water vapour. A big tree can give off more than 100 litres of water on a hot day." },
      { title: "Dew and frost", emoji: '🌿', text: "On a cool, clear night, leaves get cold. Water vapour in the air turns back into tiny drops on them: that is dew. When it is below 0 °C, the vapour turns straight into ice crystals: that is frost." },
      { title: "Melting stays at 0 °C", emoji: '🧊', text: "When ice melts, its temperature stays at 0 °C until all of it has melted. The heat is used to turn the ice into water, not to warm it up." }
    ],
    sim: {
      id: 'states',
      predict: {
        q: "In the lab, you heat ice that starts at −10 °C. While the ice is melting, what does the thermometer show?",
        choices: ["It keeps rising fast", "It stays at 0 °C until all the ice has melted", "It drops below −10 °C"],
        answer: 1,
        explain: "While ice melts, the heat goes into turning ice into water, so the temperature stays at 0 °C. Once all the ice is gone, the water warms up again."
      }
    },
    quiz: [
      { q: "What are the three states of water?", choices: ["Ice, water and water vapour", "Rain, snow and wind", "Hot, cold and warm"], answer: 0, hint: "Solid, liquid and gas.", explain: "Water can be solid ice, liquid water or water vapour, a gas." },
      { q: "What is dew?", choices: ["Rain from last week", "Juice from the leaves", "Water vapour that turned into drops on cold leaves"], answer: 2, hint: "It forms on cool, clear nights.", explain: "Dew forms when water vapour in the air cools on cold leaves and turns back into liquid drops." },
      { q: "When does frost form instead of dew?", choices: ["On a hot afternoon", "When it is below 0 °C", "When it is windy and warm"], answer: 1, hint: "Frost is made of ice.", explain: "When it is below 0 °C, water vapour turns straight into ice crystals: frost." },
      { q: "At what temperature does water boil at sea level?", choices: ["0 °C", "50 °C", "200 °C", "100 °C"], answer: 3, hint: "Look at the top mark on the lab thermometer.", explain: "At sea level, water boils at 100 °C and turns into steam." },
      { q: "How does water get from the soil into the air through a tree?", choices: ["It goes up the trunk and out of tiny holes in the leaves as vapour", "Squirrels carry it up", "The roots pump it into the clouds"], answer: 0, hint: "Think about the leaves.", explain: "Water travels up from the roots, through the trunk, and escapes from tiny holes in the leaves as water vapour." }
    ]
  },

  // ───────────── Ring 5: Nest Heights (about age 10–11) ─────────────
  {
    id: 'p5-forest-branch-seesaw',
    subject: 'physics',
    floor: 5,
    realm: 'forest',
    title: "The Branch Seesaw",
    topic: 'levers',
    topicName: 'Levers',
    blurb: "Balance bags of acorns and pinecones on a fallen branch: weight × distance.",
    reading: [
      { title: "A lever", emoji: '🪵', text: "A lever is a bar that turns around a point called the pivot. A fallen branch resting on a log makes a seesaw lever." },
      { title: "Turning effect", emoji: '🔄', text: "How hard a weight turns the lever depends on two things: how heavy it is and how far it is from the pivot. Weight × distance is called the moment." },
      { title: "Balancing", emoji: '⚖️', text: "A lever balances when the moments on both sides are equal. 2 kg sitting 2 steps from the pivot balances 1 kg sitting 4 steps away, because 2 × 2 = 1 × 4." },
      { title: "Levers in the woods", emoji: '🐿️', text: "People have long moved heavy logs and rocks with strong poles used as levers. A long lever lets a small push move a heavy load." }
    ],
    sim: {
      id: 'lever',
      predict: {
        q: "A 1 kg bag of acorns sits 4 steps from the pivot on the right. Where should a 2 kg bag of pinecones go on the left to balance it?",
        choices: ["4 steps out", "1 step out", "2 steps out"],
        answer: 2,
        explain: "1 kg × 4 steps = 4, and 2 kg × 2 steps = 4. The moments match, so the branch balances."
      }
    },
    quiz: [
      { q: "What is the point a lever turns around called?", choices: ["The pivot", "The bark", "The handle"], answer: 0, hint: "On a seesaw it is in the middle.", explain: "A lever turns around a point called the pivot." },
      { q: "A 3 kg bag sits 2 steps from the pivot. What is its moment (weight × distance)?", choices: ["5", "6", "1"], answer: 1, hint: "Multiply the weight by the distance.", explain: "3 kg × 2 steps = 6." },
      { q: "2 kg sits 3 steps out on the left. Where must 3 kg go on the right to balance it?", choices: ["3 steps out", "1 step out", "2 steps out"], answer: 2, hint: "The left side's moment is 2 × 3 = 6.", explain: "2 × 3 = 6 on the left, and 3 × 2 = 6 on the right. 2 steps out balances it." },
      { q: "A heavy child and a light child sit on a seesaw. How can they balance?", choices: ["The heavy child sits closer to the pivot", "The heavy child sits further from the pivot", "They both jump"], answer: 0, hint: "Distance can make up for weight.", explain: "Moving closer to the pivot makes the heavy child's moment smaller, so the two sides can match." },
      { q: "Why does a long pole help you lift a heavy log?", choices: ["Long poles are magnetic", "The log gets lighter", "Long poles are softer", "A long lever lets a small push make a big turning effect"], answer: 3, hint: "Moment = weight × distance.", explain: "Pushing far from the pivot gives a big moment, so a small push can lift a heavy load near the pivot." }
    ]
  },
  {
    id: 'p5-forest-swinging-vine',
    subject: 'physics',
    floor: 5,
    realm: 'forest',
    title: "The Swinging Vine",
    topic: 'pendulums',
    topicName: 'Pendulums',
    blurb: "Swing on a short vine and a long one. What sets the time of each swing?",
    reading: [
      { title: "A pendulum", emoji: '🌿', text: "A weight hanging from a vine or a string, swinging back and forth, is a pendulum. Each swing takes the same time, again and again." },
      { title: "Length matters", emoji: '📏', text: "A longer vine makes slower swings. A vine 4 times as long takes twice as long for each swing." },
      { title: "Weight does not", emoji: '⚖️', text: "Surprise! A heavy weight and a light weight on vines of the same length swing in the same time." },
      { title: "Clocks and swings", emoji: '🕰️', text: "Because each swing takes the same time, pendulums were used to keep time in clocks. A playground swing is a pendulum too!" }
    ],
    sim: {
      id: 'pendulum',
      predict: {
        q: "In the lab, pendulum A hangs on a short 0.5 m vine with a light weight. Pendulum B hangs on a long 2 m vine with a heavy weight. Which one swings back and forth more times in the same time?",
        choices: ["B, the long one with the heavy weight", "A, the short one", "They swing the same number of times"],
        answer: 1,
        explain: "A shorter vine gives faster swings. A takes about 1.4 s for each swing, but B takes about 2.8 s. The heavy weight makes no difference: only the length matters."
      }
    },
    quiz: [
      { q: "What changes how long each swing of a pendulum takes?", choices: ["The length of the vine", "The colour of the weight", "How heavy the weight is"], answer: 0, hint: "Remember pendulums A and B.", explain: "Only the length changes the swing time. A longer vine means slower swings." },
      { q: "A ranger swaps a light weight for a heavy one on the same vine. What happens to the swing time?", choices: ["It gets much longer", "It stays the same", "It gets much shorter"], answer: 1, hint: "Weight does not matter.", explain: "The swing time stays the same, because the length of the vine has not changed." },
      { q: "A vine is made 4 times as long. How does the time for each swing change?", choices: ["It halves", "It becomes 4 times as long", "It doubles"], answer: 2, hint: "4 times the length, but not 4 times the time.", explain: "The swing time depends on the square root of the length. √4 = 2, so each swing takes twice as long." },
      { q: "A 1 m pendulum takes 2 s for each swing. About how long would a 4 m pendulum take?", choices: ["4 s", "8 s", "2 s", "1 s"], answer: 0, hint: "4 times the length means twice the time.", explain: "4 times the length doubles the swing time: 2 s × 2 = 4 s." },
      { q: "Why were pendulums used in clocks?", choices: ["They are pretty", "They never stop", "They are very heavy", "Each swing takes the same time"], answer: 3, hint: "A clock needs a steady beat.", explain: "Each swing takes the same time, so a pendulum keeps a steady beat for a clock." }
    ]
  },

  // ───────────── Ring 6: Sunflower Rings (about age 11–12) ─────────────
  {
    id: 'p6-forest-puddle-reflections',
    subject: 'physics',
    floor: 6,
    realm: 'forest',
    title: "Puddle Reflections",
    topic: 'reflection',
    topicName: 'Reflection of light',
    blurb: "Why does a still puddle show the trees upside down? Bounce light off a mirror to find out.",
    reading: [
      { title: "Bouncing light", emoji: '💡', text: "When light hits a surface, some of it bounces off. This is called reflection. We see most things because light reflects off them into our eyes." },
      { title: "The law of reflection", emoji: '📐', text: "Measure angles from the normal: an imaginary line at right angles to the mirror. The angle the light comes in at (incidence) always equals the angle it bounces out at (reflection)." },
      { title: "Still or rippled", emoji: '🌊', text: "A still puddle is smooth like a mirror, so it reflects light neatly and shows a clear picture of the trees. When the wind makes ripples, light bounces off in many directions and the picture breaks up." },
      { title: "Upside-down trees", emoji: '🌳', text: "Light from the top of a tree hits the puddle further away from you, then bounces up into your eyes. Your brain follows the light back in straight lines, so the treetop seems to be deep under the water." }
    ],
    sim: {
      id: 'mirror',
      predict: {
        q: "In the lab, the light beam hits the mirror 30° from the normal. At what angle from the normal will it bounce off?",
        choices: ["60°", "30°", "0°"],
        answer: 1,
        explain: "The angle of reflection always equals the angle of incidence: 30° in, 30° out."
      }
    },
    quiz: [
      { q: "A beam of light hits a still pond 40° from the normal. At what angle from the normal does it reflect?", choices: ["50°", "80°", "40°"], answer: 2, hint: "Angle in equals angle out.", explain: "The angle of reflection equals the angle of incidence, so it reflects at 40°." },
      { q: "What is the normal?", choices: ["An imaginary line at right angles to the surface", "The brightest part of the beam", "A kind of mirror"], answer: 0, hint: "Angles are measured from it.", explain: "The normal is an imaginary line at right angles (90°) to the surface. Angles of incidence and reflection are measured from it." },
      { q: "Why does a rippled puddle show a blurry picture?", choices: ["The water turns dark", "Light bounces off the ripples in many different directions", "The ripples soak up all the light"], answer: 1, hint: "Each ripple is tilted a different way.", explain: "Every bit of a rippled surface is tilted differently, so light bounces off in many directions and the picture breaks up." },
      { q: "A beam reflects off a mirror at 25° from the normal. What was the angle of incidence?", choices: ["50°", "65°", "90°", "25°"], answer: 3, hint: "The two angles are always equal.", explain: "The angle of incidence equals the angle of reflection, so it was 25°." },
      { q: "Why do trees look upside down in a still puddle?", choices: ["Puddles are full of upside-down trees", "Light from the treetop bounces off the far part of the puddle, so the top looks lowest", "Water turns light upside down by magic"], answer: 1, hint: "Follow the light from the top of the tree.", explain: "Light from the treetop reflects off the part of the puddle furthest from you, so your eyes see the top of the tree lowest down." }
    ]
  },
  {
    id: 'p6-forest-animal-race',
    subject: 'physics',
    floor: 6,
    realm: 'forest',
    title: "The Forest Animal Race",
    topic: 'speed',
    topicName: 'Speed, distance and time',
    blurb: "A deer races a hedgehog: use distance = speed × time to work out the lead.",
    reading: [
      { title: "What is speed?", emoji: '🏁', text: "Speed tells you how far something goes in a certain time. A speed of 4 m/s means 4 metres every second." },
      { title: "The formula", emoji: '🧮', text: "Distance = speed × time. Speed = distance ÷ time. Time = distance ÷ speed. If you know two of them, you can find the third." },
      { title: "Forest speeds", emoji: '🦌', text: "A running deer can go faster than 10 m/s. A squirrel can dash at about 5 m/s. A hedgehog trots along at less than 2 m/s." },
      { title: "Average speed", emoji: '📊', text: "Animals speed up and slow down. Average speed = total distance ÷ total time. A squirrel that runs 60 m in 20 s has an average speed of 3 m/s." }
    ],
    sim: {
      id: 'race',
      predict: {
        q: "In the lab, cart A (the deer) goes at 4 m/s and cart B (the hedgehog) goes at 2 m/s. They race for 5 seconds. How far ahead is the deer at the end?",
        choices: ["2 m", "10 m", "20 m"],
        answer: 1,
        explain: "The deer goes 4 × 5 = 20 m and the hedgehog goes 2 × 5 = 10 m, so the deer is 20 − 10 = 10 m ahead."
      }
    },
    quiz: [
      { q: "A fox trots at 3 m/s for 8 seconds. How far does it go?", choices: ["11 m", "24 m", "38 m"], answer: 1, hint: "Distance = speed × time.", explain: "3 m/s × 8 s = 24 m." },
      { q: "A rabbit runs 45 m in 9 seconds. What is its average speed?", choices: ["5 m/s", "36 m/s", "405 m/s"], answer: 0, hint: "Speed = distance ÷ time.", explain: "45 m ÷ 9 s = 5 m/s." },
      { q: "A hedgehog trots 30 m at 1.5 m/s. How long does it take?", choices: ["45 s", "15 s", "20 s"], answer: 2, hint: "Time = distance ÷ speed.", explain: "30 m ÷ 1.5 m/s = 20 s." },
      { q: "A squirrel runs 60 m in 20 s. A deer runs 100 m in 10 s. How much faster is the deer?", choices: ["40 m/s faster", "They are the same speed", "7 m/s faster", "10 times as fast"], answer: 2, hint: "Work out each speed in m/s first.", explain: "The squirrel goes 60 ÷ 20 = 3 m/s. The deer goes 100 ÷ 10 = 10 m/s. 10 − 3 = 7 m/s faster." },
      { q: "Which of these is a unit of speed?", choices: ["kg", "m/s", "°C"], answer: 1, hint: "Speed is distance per time.", explain: "m/s means metres per second: a distance divided by a time." }
    ]
  },

  // ───────────── Ring 7: Starlight Crown (about age 12–13) ─────────────
  {
    id: 'p7-forest-seasons-orbit',
    subject: 'physics',
    floor: 7,
    realm: 'forest',
    title: "Earth's Orbit and the Seasons",
    topic: 'seasons',
    topicName: 'Orbits and the seasons',
    blurb: "Launch a moon into orbit, then find out why the forest changes with the seasons.",
    reading: [
      { title: "Falling around", emoji: '🌍', text: "An orbit is a path around a planet or a star. Something in orbit is always falling toward what it circles, but it moves sideways so fast that it keeps missing." },
      { title: "A year is one orbit", emoji: '☀️', text: "The Earth travels about 940 million km around the Sun, at about 30 km every second. One full orbit takes about 365.25 days. That is why we add a leap day every 4 years." },
      { title: "The tilt makes seasons", emoji: '🌗', text: "The Earth's axis is tilted by about 23.5°. For part of the year, your half of the Earth leans toward the Sun: days are long and the sunlight is strong, so it is summer. When it leans away, days are short and it is winter." },
      { title: "Not about distance", emoji: '🍂', text: "The Earth is actually closest to the Sun in early January, during the northern winter! In autumn, as the days get shorter, many trees drop their leaves to save water and energy for the winter." }
    ],
    sim: {
      id: 'orbit',
      predict: {
        q: "In the lab, you launch the moon sideways much too slowly. What will happen?",
        choices: ["It escapes into space", "It falls and crashes into the planet", "It circles in a perfect orbit"],
        answer: 1,
        explain: "Too slow, and gravity pulls it down before it can get round: it crashes. With just the right sideways speed it orbits, like the Earth around the Sun."
      }
    },
    quiz: [
      { q: "What mainly causes the seasons?", choices: ["The Earth's distance from the Sun", "The tilt of the Earth's axis", "The Moon blocking the Sun"], answer: 1, hint: "The Earth is closest to the Sun in January.", explain: "The tilt of the Earth's axis changes how long the days are and how strong the sunlight is, which makes the seasons." },
      { q: "How long does the Earth take to orbit the Sun once?", choices: ["About 365.25 days", "One day", "One month"], answer: 0, hint: "That is one year.", explain: "One orbit takes about 365.25 days: one year, with a leap day every 4 years to catch up." },
      { q: "When is the Earth closest to the Sun?", choices: ["In July", "It is always the same distance", "In early January"], answer: 2, hint: "It is a surprise for people in the north!", explain: "The Earth is closest to the Sun in early January, during the northern winter. Distance is not what makes the seasons." },
      { q: "It is summer in Korea, in the northern half of the Earth. What season is it in Australia, in the southern half?", choices: ["Winter", "Summer", "Spring", "It has no seasons"], answer: 0, hint: "When the north leans toward the Sun, the south leans away.", explain: "When the northern half leans toward the Sun, the southern half leans away, so it is winter in Australia." },
      { q: "Why doesn't the Earth fall into the Sun?", choices: ["There is no gravity in space", "The Sun's light pushes it away", "It is too light to fall", "Its sideways speed carries it around as it falls"], answer: 3, hint: "Remember the moon you launched in the lab.", explain: "The Earth is always falling toward the Sun, but its sideways speed carries it around, so it keeps missing: that is an orbit." }
    ]
  },
  {
    id: 'p7-forest-flying-seeds',
    subject: 'physics',
    floor: 7,
    realm: 'forest',
    title: "Seeds That Fly",
    topic: 'air-resistance',
    topicName: 'Gravity and air resistance',
    blurb: "Dandelion parachutes and spinning maple seeds: test gravity with and without air.",
    reading: [
      { title: "Gravity treats all things the same", emoji: '🌍', text: "Without air, every object falls with the same acceleration: about 9.8 m/s² on Earth. A feather and a bowling ball dropped in a vacuum land together." },
      { title: "Air resistance", emoji: '🌬️', text: "In air, a falling object pushes air out of the way, and the air pushes back. This air resistance grows as the object falls faster. When it equals the object's weight, the object stops speeding up: it has reached its terminal velocity." },
      { title: "Seeds that fly", emoji: '🌱', text: "Plants use air resistance to spread their seeds. A dandelion seed's fluffy parachute gives it a tiny terminal velocity, so even a light breeze can carry it a long way. Maple seeds spin like helicopter blades, which slows their fall so the wind can blow them away from the parent tree." },
      { title: "Lots of surface, little weight", emoji: '🎈', text: "The trick is lots of surface for very little weight. A seed that falls slowly spends longer in the air, so the wind has more time to carry it to a new place." }
    ],
    sim: {
      id: 'drop',
      setup: { objects: ['feather', 'bowling-ball'], air: 'toggle' },
      predict: {
        q: "In the lab, you first take away all the air (a vacuum). Then you drop a feather and a bowling ball at the same time. Which lands first?",
        choices: ["The bowling ball", "The feather", "They land at the same time"],
        answer: 2,
        explain: "With no air, there is no air resistance, and gravity speeds everything up at the same rate, so they land together. Switch the air back on, and the feather drifts down like a dandelion seed."
      }
    },
    quiz: [
      { q: "What is terminal velocity?", choices: ["The steady top speed reached when air resistance equals the weight", "The speed of light", "The speed at the very start of a fall"], answer: 0, hint: "The object stops speeding up.", explain: "When air resistance grows to equal the weight, the forces balance and the object falls at a steady speed: its terminal velocity." },
      { q: "How does a maple seed slow its fall?", choices: ["It is very heavy", "It spins like a helicopter blade", "It sticks to the branch"], answer: 1, hint: "Watch one twirl down in autumn.", explain: "A maple seed spins like a helicopter blade, which makes lots of air resistance and slows its fall." },
      { q: "On the Moon there is no air. An astronaut drops a feather and a hammer at the same time. What happens?", choices: ["The hammer lands first", "The feather floats away", "They land together"], answer: 2, hint: "No air means no air resistance.", explain: "With no air resistance, gravity speeds both up at the same rate, so they land together. An astronaut really did this on the Moon in 1971." },
      { q: "Why does a dandelion seed have a fluffy parachute?", choices: ["To make it heavier", "To look pretty", "To keep it warm", "To make lots of air resistance, so the wind can carry it far"], answer: 3, hint: "Lots of surface, little weight.", explain: "The parachute makes lots of air resistance for very little weight, so the seed falls slowly and the wind carries it far." },
      { q: "Why is it good for a tree's seeds to fly far away?", choices: ["Trees do not like their seeds", "They can land in new places with more light and room to grow", "Seeds need to be cold"], answer: 1, hint: "Think about the shade under the parent tree.", explain: "Seeds that land far away find new places with more light and room, instead of growing in their parent's shade." }
    ]
  }
];

export const FOREST_LESSONS = [...FOREST_MATH, ...FOREST_HISTORY, ...FOREST_PHYSICS];
