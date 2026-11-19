/**
 * AI Arcademia: the History halls, two or three lessons a floor, from long
 * ago (floor 1) to the Moon landing (floor 7). Format and checks: schema.js.
 *
 * Guides are made-up, everyday people of their time unless `portrayal` says
 * otherwise. Approximate dates say "about" in `when`; BCE years are negative.
 */

export const HISTORY_LESSONS = [
  // ───────────────────────────── Floor 1 (about age 6–7) ─────────────────────────────
  {
    id: 'h1-long-ago',
    subject: 'history',
    floor: 1,
    title: "Then and Now",
    topic: 'then-and-now',
    topicName: 'Then and Now',
    blurb: "Peek at homes, toys and school from long ago.",
    reading: [
      { title: "Long ago", emoji: '🕰️', text: "Long ago means a time before you were born. Before your grown-ups were born, too! Life looked very different then." },
      { title: "Light at night", emoji: '🕯️', text: "Long ago, homes had no electric lights. People lit candles and oil lamps to see at night." },
      { title: "Toys", emoji: '🪀', text: "Children played with spinning tops, marbles, wooden dolls and hoops. Many toys were made by hand at home." },
      { title: "Getting around", emoji: '🐴', text: "Long ago, people walked or rode horses. There were no cars and no planes yet." }
    ],
    dialogue: {
      npc: { name: "Pip", role: "a friendly museum guide", look: 'guide', portrayal: 'generic' },
      intro: "Hello, time traveller! I'm Pip, and I look after this museum. Everything in here is from long ago. What would you like to know?",
      topics: [
        { ask: "How did people see at night?", answer: "They lit candles and oil lamps. Electric lights only started lighting homes about 140 years ago. Before that, nights were very dark!" },
        { ask: "What toys did children play with?", answer: "Spinning tops, marbles, wooden dolls, and big hoops they rolled along with a stick. No batteries needed!" },
        { ask: "What was school like?", answer: "Many children wrote on small slates with chalk instead of paper. Some schools had just one room for children of all ages!" },
        { ask: "How did people wash their clothes?", answer: "By hand! They scrubbed clothes on a bumpy washboard in a tub of water. It could take a whole day. Phew!" },
        { ask: "How did people talk to faraway friends?", answer: "They wrote letters. A letter could take days or even weeks to arrive. Now you can video call in a second!" }
      ],
      challenge: {
        q: "Long ago, what did people use to see at night?",
        choices: ["Torches with batteries", "Candles and oil lamps", "A tablet screen"],
        answer: 1,
        explain: "Before electric lights, people lit candles and oil lamps. A small flame gave just enough light."
      },
      farewell: "Great job, time traveller! Old things tell us stories. Come back soon!"
    },
    timeline: {
      title: "From long ago to now",
      events: [
        { label: "Steam trains start to carry passengers", year: 1830, when: "about 1830" },
        { label: "Electric light bulbs start to light up homes", year: 1880, when: "about 1880" },
        { label: "The first aeroplane flies", year: 1903, when: "1903" },
        { label: "People walk on the Moon", year: 1969, when: "1969" },
        { label: "Phones with touch screens become popular", year: 2007, when: "about 2007" }
      ]
    },
    artifact: {
      model: 'lightbulb',
      name: "An old light bulb",
      text: "Early light bulbs had a thin wire inside a glass bubble. The wire glowed when electricity ran through it. Light with no flame!"
    },
    quiz: [
      {
        q: "What did many children write on at school long ago?",
        choices: ["A laptop", "A slate and chalk", "A whiteboard"],
        answer: 1,
        hint: "It was small, flat and dark, like a tiny chalkboard.",
        explain: "Children wrote on small slates with chalk. They could wipe them clean and start again."
      },
      {
        q: "Long ago, how did people send news to a friend far away?",
        choices: ["They wrote a letter", "They sent a text", "They made a video call"],
        answer: 0,
        hint: "It goes in an envelope with a stamp.",
        explain: "People wrote letters. There were no phones yet, so letters carried the news."
      },
      {
        q: "Which toy could a child play with long ago?",
        choices: ["A video game", "A remote-control car", "A spinning top"],
        answer: 2,
        hint: "It needs no batteries and no screen.",
        explain: "Spinning tops are very old toys. Video games and remote-control cars came much later."
      },
      {
        q: "How did people wash clothes long ago?",
        choices: ["By hand, on a washboard", "In a washing machine", "With a robot"],
        answer: 0,
        hint: "Most homes had no electricity to plug things in.",
        explain: "People scrubbed clothes by hand on a washboard. It was hard work!"
      },
      {
        q: "Which way of travelling is the oldest?",
        choices: ["Aeroplanes", "Cars", "Riding a horse"],
        answer: 2,
        hint: "This one eats hay!",
        explain: "People rode horses for thousands of years. Cars and planes are new by comparison."
      }
    ]
  },

  {
    id: 'h1-stone-age',
    subject: 'history',
    floor: 1,
    title: "The Stone Age",
    topic: 'stone-age',
    topicName: 'The Stone Age',
    blurb: "Make stone tools, sit by the fire and paint on cave walls.",
    reading: [
      { title: "Tools of stone", emoji: '🪨', text: "In the Stone Age, people made tools from stone. They chipped rocks to make sharp edges for cutting." },
      { title: "Fire!", emoji: '🔥', text: "Fire kept people warm. It gave light at night and cooked their food." },
      { title: "Cave paintings", emoji: '🎨', text: "People painted animals on cave walls. They used red and yellow earth and black charcoal." },
      { title: "Finding food", emoji: '🦌', text: "People hunted animals and gathered berries, nuts and roots. They moved around to find food." }
    ],
    dialogue: {
      npc: { name: "Tarn", role: "a Stone Age toolmaker", look: 'stone-age', portrayal: 'generic' },
      intro: "Welcome to my cave! I'm Tarn. I make tools from stone. Sit by the fire and ask me anything.",
      topics: [
        { ask: "How do you make a stone tool?", answer: "I hit one stone with another. Tap, tap, tap! Little chips fly off, and the edge gets sharp. It takes lots of practice." },
        { ask: "What do you use fire for?", answer: "Fire keeps us warm and gives us light. It cooks our food, too. Yum!" },
        { ask: "Why do you paint on the walls?", answer: "We paint the animals we see, like horses and bison. Nobody today knows for sure why we painted them. What do you think?" },
        { ask: "What do you eat?", answer: "We hunt animals and gather berries, nuts and roots. There are no shops. Not even one!" },
        { ask: "Do you live with dinosaurs?", answer: "No way! The dinosaurs were gone millions of years before the first people. That's a very popular mix-up!" }
      ],
      challenge: {
        q: "What did Stone Age people make their tools from?",
        choices: ["Plastic", "Metal", "Stone"],
        answer: 2,
        explain: "That's why it's called the Stone Age! People chipped stones to make sharp tools."
      },
      farewell: "You'd make a great toolmaker! Keep warm out there."
    },
    timeline: {
      title: "The long, long Stone Age",
      events: [
        { label: "The first stone tools are made", year: -2600000, when: "more than 2.5 million years ago" },
        { label: "People are using fire", year: -400000, when: "by about 400,000 years ago" },
        { label: "Animals are painted in Lascaux cave, France", year: -15000, when: "about 17,000 years ago" },
        { label: "People start to farm", year: -9000, when: "about 11,000 years ago" },
        { label: "Stonehenge is begun in England", year: -3000, when: "about 5,000 years ago" }
      ]
    },
    artifact: {
      model: 'hand-axe',
      name: "A stone hand axe",
      text: "This stone was chipped on both sides to make a sharp edge. People used hand axes like it to cut and chop for over a million years!"
    },
    quiz: [
      {
        q: "What did Stone Age people use to paint caves?",
        choices: ["Coloured earth and charcoal", "Felt-tip pens", "Spray paint"],
        answer: 0,
        hint: "There were no shops. The colours came from nature.",
        explain: "They used red and yellow earth and black charcoal from burnt wood."
      },
      {
        q: "Why was fire so useful?",
        choices: ["It charged phones", "It gave warmth and light, and cooked food", "It made it rain"],
        answer: 1,
        hint: "Think about a cold, dark night.",
        explain: "Fire kept people warm, gave light at night and cooked their food."
      },
      {
        q: "Did Stone Age people live with dinosaurs?",
        choices: ["No, dinosaurs were gone long before people", "Yes, they kept them as pets"],
        answer: 0,
        hint: "Dinosaurs lived a very, very, VERY long time ago.",
        explain: "Dinosaurs died out millions of years before the first people lived."
      },
      {
        q: "How did Stone Age people get food?",
        choices: ["They went to a supermarket", "They ordered pizza", "They hunted animals and gathered plants"],
        answer: 2,
        hint: "They had to find it themselves, outdoors.",
        explain: "They hunted animals and gathered berries, nuts and roots."
      },
      {
        q: "How did people make a stone tool sharp?",
        choices: ["They melted it in the fire", "They chipped it with another stone", "They left it in the rain"],
        answer: 1,
        hint: "Tap, tap, tap!",
        explain: "Hitting a stone with another stone knocks off chips and leaves a sharp edge."
      }
    ]
  },

  {
    id: 'h1-castles',
    subject: 'history',
    floor: 1,
    title: "Life in a Castle",
    topic: 'castles',
    topicName: 'Medieval Castles',
    blurb: "Meet the castle cook and find out about knights, walls and moats.",
    reading: [
      { title: "Strong walls", emoji: '🏰', text: "Castles had thick stone walls and tall towers. They were built to keep the people inside safe." },
      { title: "The moat", emoji: '🌊', text: "Many castles had a moat. A moat is a deep ditch around the walls. Often it was full of water." },
      { title: "Knights", emoji: '🛡️', text: "Knights were soldiers who fought on horseback. They wore armour and trained for years." },
      { title: "A busy home", emoji: '🍞', text: "A castle was like a little town. Cooks, guards, servants and blacksmiths all lived and worked there." }
    ],
    dialogue: {
      npc: { name: "Martha", role: "the castle cook", look: 'castle-cook', portrayal: 'generic' },
      intro: "Hello there! I'm Martha, the castle cook. Mind the hot pots! What do you want to know about castle life?",
      topics: [
        { ask: "What do you cook?", answer: "Bread, soups and stews every day. For a big feast, we might roast a whole pig!" },
        { ask: "How do people cross the moat?", answer: "Over the drawbridge! It can be pulled up with chains, so enemies can't get across." },
        { ask: "Who owns the castle?", answer: "The lord and lady. They rule the land around the castle, and everyone here works for them." },
        { ask: "How do knights learn to be knights?", answer: "They start young! A boy might begin as a page at about seven. He learns to ride, to fight with a sword and to have good manners." },
        { ask: "Is the castle cosy?", answer: "Not very! Stone walls are cold and the windows are small. We keep warm with big fires and hang thick cloth on the walls." }
      ],
      challenge: {
        q: "What is a moat?",
        choices: ["A tall tower", "A deep ditch around the castle", "A kind of armour"],
        answer: 1,
        explain: "A moat is a deep ditch around the walls, often filled with water. It made the castle hard to attack."
      },
      farewell: "Off you go, and don't let the drawbridge catch your toes! Come back for a bun."
    },
    timeline: {
      title: "Castles through time",
      events: [
        { label: "Quick wooden castles are built on earth mounds in England", year: 1070, when: "about 1070" },
        { label: "Big stone castles with tall towers are built across Europe", year: 1200, when: "about 1200" },
        { label: "Cannons can now knock down castle walls", year: 1450, when: "about 1450" },
        { label: "A fairy-tale castle, Neuschwanstein, is begun in Germany", year: 1869, when: "1869" },
        { label: "Families visit old castles as museums", year: 2026, when: "today" }
      ]
    },
    artifact: {
      model: 'castle',
      name: "A model castle",
      text: "Find the towers, the thick walls and the moat. The gate was the weakest spot, so it had a drawbridge and a heavy sliding gate called a portcullis."
    },
    quiz: [
      {
        q: "What was a drawbridge for?",
        choices: ["Crossing the moat", "Baking bread", "Climbing the tower"],
        answer: 0,
        hint: "It goes over the water.",
        explain: "The drawbridge let people cross the moat. It could be pulled up to keep enemies out."
      },
      {
        q: "Who fought on horseback in armour?",
        choices: ["Cooks", "Knights", "Bakers"],
        answer: 1,
        hint: "They trained for years with swords.",
        explain: "Knights were soldiers who fought on horseback and wore armour."
      },
      {
        q: "Why did castles have such thick walls?",
        choices: ["To hold more pictures", "To make the castle smell nice", "To keep the people inside safe"],
        answer: 2,
        hint: "Think about enemies trying to get in.",
        explain: "Thick stone walls were hard to break, so they kept the people inside safe."
      },
      {
        q: "How did people keep warm in a chilly castle?",
        choices: ["Central heating", "Big fires and thick cloth on the walls", "Electric blankets"],
        answer: 1,
        hint: "There was no electricity long ago.",
        explain: "Castles had big fireplaces, and thick wall hangings helped keep the cold out."
      },
      {
        q: "Who owned the castle?",
        choices: ["The cook", "The horses", "The lord and lady"],
        answer: 2,
        hint: "Everyone in the castle worked for them.",
        explain: "The lord and lady owned the castle and ruled the land around it."
      }
    ]
  },

  // ───────────────────────────── Floor 2 (about age 7–8) ─────────────────────────────
  {
    id: 'h2-pyramids',
    subject: 'history',
    floor: 2,
    title: "The Great Pyramid",
    topic: 'ancient-egypt',
    topicName: 'Ancient Egypt',
    blurb: "Help build the Great Pyramid at Giza in Ancient Egypt.",
    reading: [
      { title: "Tombs for kings", emoji: '🔺', text: "The pyramids were giant tombs for the kings of Egypt, called pharaohs. The Great Pyramid at Giza was built for King Khufu." },
      { title: "Huge stones", emoji: '🪨', text: "The Great Pyramid has more than two million stone blocks. Many of them weigh more than a car!" },
      { title: "Who built them?", emoji: '👷', text: "Thousands of skilled workers built the pyramids. Archaeologists found their village, bakeries and tombs. Most experts now think they were paid workers, not slaves." },
      { title: "The river Nile", emoji: '🌊', text: "Egypt is mostly desert. The river Nile gave water for farms, and boats carried stone along it." }
    ],
    dialogue: {
      npc: { name: "Meri", role: "a stone carver at Giza", look: 'egypt', portrayal: 'generic' },
      intro: "Hello, friend! I'm Meri. I carve stone for the king's great pyramid here at Giza. Watch out for the dust!",
      topics: [
        { ask: "Who is the pyramid for?", answer: "It's a tomb for King Khufu, our pharaoh. We believe a king needs a safe resting place for the life after this one." },
        { ask: "How do you move such big stones?", answer: "Teams pull them on wooden sledges. We pour water on the sand so the sledges slide more easily. Boats bring stone along the Nile, too." },
        { ask: "Are you a slave?", answer: "No! Most archaeologists now think workers like me were paid, often with food such as bread. We live in a village nearby, and we're proud of our work." },
        { ask: "How long does it take to build?", answer: "Experts think about 20 years for the Great Pyramid. Teams of workers take turns." },
        { ask: "What is a mummy?", answer: "A body that was carefully dried and wrapped in linen cloth. Egyptians did this because they believed the person would live on in the afterlife." }
      ],
      challenge: {
        q: "Who do most archaeologists now think built the pyramids?",
        choices: ["Slaves in chains", "Visitors from space", "Skilled, paid workers"],
        answer: 2,
        explain: "Archaeologists found the workers' village, bakeries and tombs. This shows they were skilled workers who were fed and paid."
      },
      farewell: "Thank you for visiting Giza! May your path be as straight as a pyramid's edge."
    },
    timeline: {
      title: "Ancient Egypt",
      events: [
        { label: "Upper and Lower Egypt join into one kingdom", year: -3100, when: "about 3100 BCE" },
        { label: "The Step Pyramid of King Djoser is built", year: -2650, when: "about 2650 BCE" },
        { label: "The Great Pyramid of Giza is finished", year: -2560, when: "about 2560 BCE" },
        { label: "Tutankhamun becomes pharaoh as a boy", year: -1332, when: "about 1332 BCE" },
        { label: "Cleopatra, the last queen of ancient Egypt, dies", year: -30, when: "30 BCE" }
      ]
    },
    artifact: {
      model: 'pyramid',
      name: "The Great Pyramid",
      text: "When it was new, it stood about 146 metres tall and was covered in smooth white limestone. It was the tallest building made by people for about 3,800 years!"
    },
    quiz: [
      {
        q: "Who was the Great Pyramid built for?",
        choices: ["King Khufu", "Cleopatra", "Tutankhamun"],
        answer: 0,
        hint: "His name starts with the letter K.",
        explain: "The Great Pyramid was built as a tomb for King Khufu. Cleopatra and Tutankhamun lived much later."
      },
      {
        q: "Which river helped Egypt grow food and move stone?",
        choices: ["The Amazon", "The Nile", "The Thames"],
        answer: 1,
        hint: "It's the river that runs right through Egypt.",
        explain: "The Nile gave water for farms in the desert, and boats carried stone along it."
      },
      {
        q: "How did workers move heavy stones across the sand?",
        choices: ["With trucks", "With hot-air balloons", "On wooden sledges"],
        answer: 2,
        hint: "Pouring water on the sand helped it slide.",
        explain: "Teams pulled the stones on wooden sledges. Wet sand made the sledges slide more easily."
      },
      {
        q: "What is a pharaoh?",
        choices: ["A kind of boat", "A king of ancient Egypt", "A pyramid's door"],
        answer: 1,
        hint: "Khufu and Tutankhamun were both one.",
        explain: "A pharaoh was a king of ancient Egypt."
      },
      {
        q: "Why did Egyptians make mummies?",
        choices: ["They believed it helped the person in the afterlife", "To scare away robbers", "To keep the body warm"],
        answer: 0,
        hint: "Think about what Egyptians believed happens after life.",
        explain: "Egyptians believed people lived on after death, so they carefully kept the body safe."
      }
    ]
  },

  {
    id: 'h2-first-writing',
    subject: 'history',
    floor: 2,
    title: "The First Writing",
    topic: 'mesopotamia',
    topicName: 'Mesopotamia',
    blurb: "Write on clay like a scribe in Mesopotamia.",
    reading: [
      { title: "The land between rivers", emoji: '🏞️', text: "Mesopotamia means 'the land between the rivers'. Its two rivers are the Tigris and the Euphrates. Today, most of it is in Iraq." },
      { title: "Writing on clay", emoji: '✍️', text: "More than 5,000 years ago, people here began to write. They pressed a pointed reed into soft, wet clay." },
      { title: "Wedge marks", emoji: '🔺', text: "The marks look like little wedges. We call this writing cuneiform. It means 'wedge-shaped'." },
      { title: "Round and round", emoji: '🛞', text: "People here were some of the first to use wheels. Potters used wheels to shape clay pots. Later, wheels went on carts!" }
    ],
    dialogue: {
      npc: { name: "Ubar", role: "a scribe in the city of Uruk", look: 'mesopotamia', portrayal: 'generic' },
      intro: "Greetings! I'm Ubar, a scribe in the great city of Uruk. I write on clay all day. Want to see?",
      topics: [
        { ask: "Why did people start writing?", answer: "To keep track of things! The first writing counted sheep and grain. Later, people wrote laws, letters and stories, too." },
        { ask: "What do you write with?", answer: "A stylus. That's a pointed reed. I press it into soft clay, and then the tablet dries hard." },
        { ask: "Is writing easy to learn?", answer: "Not at all! There are hundreds of signs to learn. Scribes go to school for years and make lots of practice tablets." },
        { ask: "Did you invent the wheel?", answer: "People here were some of the first to use wheels. Potters used them to make pots. Then someone put wheels on a cart. What a good idea!" },
        { ask: "What is the oldest story?", answer: "One of the oldest is about Gilgamesh, a king of Uruk. It's full of adventures, monsters and friendship." }
      ],
      challenge: {
        q: "What did scribes in Mesopotamia write on?",
        choices: ["Clay tablets", "Paper", "Plastic"],
        answer: 0,
        explain: "Scribes pressed a reed into soft clay tablets. Paper had not been invented yet."
      },
      farewell: "May your writing always be neat! Don't step on my wet tablets on the way out."
    },
    timeline: {
      title: "Firsts in Mesopotamia",
      events: [
        { label: "Farming begins in the Fertile Crescent, near Mesopotamia", year: -9000, when: "about 9000 BCE" },
        { label: "Carts with wheels appear", year: -3500, when: "about 3500 BCE" },
        { label: "Writing begins in the city of Uruk", year: -3200, when: "about 3200 BCE" },
        { label: "King Hammurabi writes down his laws", year: -1754, when: "about 1754 BCE" },
        { label: "Persia takes over the city of Babylon", year: -539, when: "539 BCE" }
      ]
    },
    artifact: {
      model: 'clay-tablet',
      name: "A clay tablet",
      text: "This tablet fits in your hand. Its wedge-shaped marks were pressed in with a reed. Many tablets were lists, like a shopping list! Hundreds of thousands of them still survive."
    },
    quiz: [
      {
        q: "What does 'cuneiform' mean?",
        choices: ["Round and smooth", "Wedge-shaped", "Very old"],
        answer: 1,
        hint: "Look at the shape of the little marks.",
        explain: "Cuneiform means 'wedge-shaped', because the marks look like tiny wedges."
      },
      {
        q: "Why did the first writing begin?",
        choices: ["To send emails", "To write game rules", "To count things like grain and sheep"],
        answer: 2,
        hint: "Think of a farmer keeping a list.",
        explain: "The first writing was used to keep track of things like grain and sheep."
      },
      {
        q: "What were some of the first wheels used for?",
        choices: ["Making clay pots", "Bicycles", "Clocks"],
        answer: 0,
        hint: "The scribes wrote on the same stuff!",
        explain: "Potters used spinning wheels to shape clay pots. Wheels on carts came later."
      },
      {
        q: "Which two rivers flow through Mesopotamia?",
        choices: ["The Nile and the Amazon", "The Tigris and the Euphrates", "The Thames and the Seine"],
        answer: 1,
        hint: "One of them starts with T, the other with E.",
        explain: "Mesopotamia lies between the Tigris and the Euphrates rivers."
      },
      {
        q: "How did a soft clay tablet get hard?",
        choices: ["It dried in the sun or was baked", "It was frozen in ice", "It was covered in glue"],
        answer: 0,
        hint: "Think about mud on a hot, sunny day.",
        explain: "Clay dries hard in the sun. Baking it in a fire makes it even harder."
      }
    ]
  },

  {
    id: 'h2-vikings',
    subject: 'history',
    floor: 2,
    title: "The Vikings",
    topic: 'vikings',
    topicName: 'The Vikings',
    blurb: "Sail a longship and bust a famous Viking myth.",
    reading: [
      { title: "Who were the Vikings?", emoji: '⛵', text: "The Vikings came from Scandinavia. Today that is Norway, Sweden and Denmark. They lived more than 1,000 years ago." },
      { title: "Farmers first", emoji: '🌾', text: "Most Vikings were farmers. They grew barley and oats and kept cows, sheep and pigs." },
      { title: "Longships", emoji: '🛶', text: "Viking longships were fast and light. They could cross the sea and row up shallow rivers." },
      { title: "No horns!", emoji: '⛑️', text: "Did Vikings wear helmets with horns? No! That idea came from costumes about 150 years ago. Real Viking helmets were plain and round." }
    ],
    dialogue: {
      npc: { name: "Astrid", role: "a Viking farmer and sailor", look: 'viking', portrayal: 'generic' },
      intro: "Hei! I'm Astrid. I farm by the fjord, and in summer I sail. Ask me anything!",
      topics: [
        { ask: "Do Vikings wear horned helmets?", answer: "Ha! No. Horns would get in the way. That idea came from opera costumes in the 1800s, long after the Vikings." },
        { ask: "What is a longship like?", answer: "Long, narrow and fast! It has a big square sail and oars for rowing. It's so light we can row it up rivers." },
        { ask: "Where do Vikings go?", answer: "Very far! Vikings reached Iceland, Greenland and even North America about 1,000 years ago. Some travelled east along rivers too." },
        { ask: "Are all Vikings raiders?", answer: "No. Some did raid towns and monasteries, which was very scary for the people there. But most Vikings were farmers, traders and craftspeople." },
        { ask: "Can Vikings write?", answer: "Yes, with runes! Runes are letters made of straight lines. They are easy to carve into wood or stone." }
      ],
      challenge: {
        q: "Did Vikings wear helmets with horns?",
        choices: ["Yes, always", "No, that's a myth", "Only on Sundays"],
        answer: 1,
        explain: "It's a myth! Horned helmets came from costumes in the 1800s. Real Viking helmets were plain and round."
      },
      farewell: "Safe travels, friend! May the wind fill your sail."
    },
    timeline: {
      title: "The Viking Age",
      events: [
        { label: "Vikings raid the monastery at Lindisfarne, England", year: 793, when: "793" },
        { label: "Vikings settle in Iceland", year: 870, when: "about 870" },
        { label: "Erik the Red starts a settlement in Greenland", year: 985, when: "about 985" },
        { label: "Leif Erikson's crew reaches North America", year: 1000, when: "about 1000" },
        { label: "A Viking king loses the Battle of Stamford Bridge", year: 1066, when: "1066" }
      ]
    },
    artifact: {
      model: 'viking-ship',
      name: "A Viking longship",
      text: "Longships had a tall curved front and back, a square woollen sail and oars along the sides. The Oseberg ship, found in Norway, is over 1,100 years old!"
    },
    quiz: [
      {
        q: "Where did the Vikings come from?",
        choices: ["Scandinavia", "Egypt", "China"],
        answer: 0,
        hint: "Think of Norway, Sweden and Denmark.",
        explain: "The Vikings came from Scandinavia: today's Norway, Sweden and Denmark."
      },
      {
        q: "What did most Vikings do for a living?",
        choices: ["Played football", "Farmed", "Built pyramids"],
        answer: 1,
        hint: "Barley, oats, cows and sheep!",
        explain: "Most Vikings were farmers. They grew crops and kept animals."
      },
      {
        q: "Why could longships go up rivers?",
        choices: ["They had wheels", "They could fly", "They were light and didn't sit deep in the water"],
        answer: 2,
        hint: "Rivers can be shallow.",
        explain: "Longships were light and sat high in the water, so they could row up shallow rivers."
      },
      {
        q: "What are runes?",
        choices: ["Viking boats", "Viking letters for writing", "Viking shoes"],
        answer: 1,
        hint: "Vikings carved them on stones.",
        explain: "Runes are Viking letters made of straight lines, easy to carve into wood or stone."
      },
      {
        q: "Which faraway land did Vikings reach about 1,000 years ago?",
        choices: ["North America", "Antarctica", "The Moon"],
        answer: 0,
        hint: "They sailed west, past Greenland.",
        explain: "Leif Erikson's crew sailed past Greenland and reached North America."
      }
    ]
  },

  // ───────────────────────────── Floor 3 (about age 8–9) ─────────────────────────────
  {
    id: 'h3-ancient-greece',
    subject: 'history',
    floor: 3,
    title: "Ancient Greece",
    topic: 'ancient-greece',
    topicName: 'Ancient Greece',
    blurb: "Train for the first Olympic Games and see how Athens voted.",
    reading: [
      { title: "City-states", emoji: '🏛️', text: "Ancient Greece was not one country. It was many city-states, like Athens and Sparta, each with its own rulers and army. They shared a language, their gods and the Olympic Games." },
      { title: "The Olympic Games", emoji: '🏅', text: "The first recorded Olympic Games were held at Olympia in 776 BCE, in honour of the god Zeus. Winners didn't get medals: they got a crown of olive leaves." },
      { title: "People power", emoji: '🗳️', text: "Around 508 BCE, Athens began democracy, which means 'rule by the people'. Citizens voted on big decisions. But only free men counted as citizens. Women and enslaved people could not vote." },
      { title: "Columns", emoji: '🏗️', text: "Greek builders loved tall stone columns. The Parthenon in Athens, finished in 432 BCE, still inspires banks, museums and government buildings around the world." }
    ],
    dialogue: {
      npc: { name: "Theron", role: "an athlete training for the Olympic Games", look: 'greece', portrayal: 'generic' },
      intro: "Chaire! That's 'hello' in Greek. I'm Theron, and I'm training for the Olympic Games. Walk with me while I warm up!",
      topics: [
        { ask: "What are the Olympic events?", answer: "Running races, wrestling, boxing and chariot racing. There's also the pentathlon: five events in one, including the discus, the javelin and the long jump." },
        { ask: "Who can take part?", answer: "Only free Greek men and boys. Married women weren't even allowed to watch! Girls had their own races at Olympia, called the Heraean Games." },
        { ask: "How does voting work in Athens?", answer: "Citizens meet on a hill called the Pnyx and vote, often by raising their hands. Thousands of them decide big questions, even whether to go to war." },
        { ask: "What kinds of columns are there?", answer: "Three main styles: Doric is plain, Ionic has curly scrolls at the top, and Corinthian is carved with leaves. You can still spot all three on buildings today." },
        { ask: "What did the Greeks give the world?", answer: "Lots! Democracy, theatre, the Olympic Games, and thinkers like Socrates and Aristotle, who asked big questions about how to live." }
      ],
      challenge: {
        q: "What did an ancient Olympic winner receive at Olympia?",
        choices: ["A gold medal", "A silver trophy", "A crown of olive leaves"],
        answer: 2,
        explain: "Winners at Olympia were crowned with a wreath of olive leaves. Gold medals came with the modern Olympics."
      },
      farewell: "I'm off to train! May you always be quick on your feet."
    },
    timeline: {
      title: "Ancient Greece",
      events: [
        { label: "The first recorded Olympic Games at Olympia", year: -776, when: "776 BCE" },
        { label: "Athens begins its democracy", year: -508, when: "about 508 BCE" },
        { label: "The Parthenon in Athens is finished", year: -432, when: "432 BCE" },
        { label: "Alexander the Great becomes king of Macedon", year: -336, when: "336 BCE" },
        { label: "The modern Olympic Games begin in Athens", year: 1896, when: "1896" }
      ]
    },
    artifact: {
      model: 'greek-column',
      name: "A Greek column",
      text: "Greek columns came in three main styles: plain Doric, Ionic with curly scrolls, and leafy Corinthian. Many are slightly fatter in the middle, a builder's trick that makes them look straight and strong from far away."
    },
    quiz: [
      {
        q: "Where were the ancient Olympic Games held?",
        choices: ["Athens", "Olympia", "Rome"],
        answer: 1,
        hint: "The place sounds a lot like the name of the Games.",
        explain: "The ancient Games were held at Olympia, a holy place for the god Zeus."
      },
      {
        q: "What does 'democracy' mean?",
        choices: ["Rule by the people", "Rule by one king", "Rule by the army"],
        answer: 0,
        hint: "In Athens, citizens raised their hands to vote.",
        explain: "Democracy means 'rule by the people': citizens vote to make decisions."
      },
      {
        q: "Who could vote in ancient Athens?",
        choices: ["Everyone, including children", "Only women", "Only free men who were citizens"],
        answer: 2,
        hint: "Athens' democracy left many people out.",
        explain: "Only free men who were citizens could vote. Women, enslaved people and foreigners could not."
      },
      {
        q: "Which column style has curly scrolls at the top?",
        choices: ["Doric", "Ionic", "Corinthian"],
        answer: 1,
        hint: "It's not the plain one, and not the leafy one.",
        explain: "Ionic columns have scrolls at the top. Doric ones are plain; Corinthian ones have carved leaves."
      }
    ]
  },

  {
    id: 'h3-roman-engineers',
    subject: 'history',
    floor: 3,
    title: "Roman Engineers",
    topic: 'ancient-rome',
    topicName: 'Ancient Rome',
    blurb: "Build roads, arches and aqueducts with a Roman army engineer.",
    reading: [
      { title: "All roads lead to Rome", emoji: '🛣️', text: "The Romans built more than 80,000 kilometres of paved roads across their empire. Straight roads let armies, traders and messages travel fast, and some are still used today." },
      { title: "Water on the move", emoji: '💧', text: "Aqueducts carried fresh water from the hills into cities, sloping gently downhill all the way. Most of their length ran underground. The famous arched bridges carried them over valleys." },
      { title: "The mighty arch", emoji: '🌉', text: "An arch spreads the weight above it out to the sides and down into the ground. That let the Romans build strong bridges and huge buildings like the Colosseum." },
      { title: "Roman concrete", emoji: '🧱', text: "Romans mixed lime with volcanic ash to make concrete that could even set underwater. The dome of the Pantheon in Rome is about 1,900 years old and still stands." }
    ],
    dialogue: {
      npc: { name: "Gaius", role: "a Roman army engineer", look: 'rome', portrayal: 'generic' },
      intro: "Salve! I'm Gaius, an engineer with the Roman army. Today we're building a new road. Grab a shovel and ask away!",
      topics: [
        { ask: "How do you build a road?", answer: "First we dig a trench. Then we fill it with layers: big stones, then gravel, then tight-fitting paving stones on top. The middle is a little higher, so rain runs off into ditches." },
        { ask: "Why are your roads so straight?", answer: "Straight is shortest! We use a tool called a groma to mark out straight lines. Faster roads mean faster armies and faster news." },
        { ask: "How does an aqueduct work?", answer: "Gravity does the work. We make the channel slope down just a tiny bit for many kilometres, so the water flows by itself into the city's fountains and baths." },
        { ask: "What's special about Roman concrete?", answer: "We mix lime, volcanic ash, water and chunks of rock. It sets hard, even underwater, so we use it for harbours as well as domes." },
        { ask: "Why use arches?", answer: "An arch pushes the weight outwards and down, so stone can bridge a wide gap without cracking. Put arches in a row and you have a bridge or an aqueduct!" }
      ],
      challenge: {
        q: "What makes the water flow along an aqueduct?",
        choices: ["Gravity, on a gentle downhill slope", "Electric pumps", "The wind"],
        answer: 0,
        explain: "Aqueducts slope very gently downhill, so gravity pulls the water along. Electric pumps didn't exist yet."
      },
      farewell: "Vale! That means 'goodbye'. Remember: build it straight, build it strong."
    },
    timeline: {
      title: "Rome builds big",
      events: [
        { label: "Work starts on the Appian Way, a great Roman road", year: -312, when: "312 BCE" },
        { label: "Julius Caesar's army bridges the river Rhine in about ten days", year: -55, when: "55 BCE" },
        { label: "The Colosseum opens in Rome", year: 80, when: "80 CE" },
        { label: "The Pantheon's giant concrete dome is completed", year: 125, when: "about 125 CE" },
        { label: "The Western Roman Empire comes to an end", year: 476, when: "476 CE" }
      ]
    },
    artifact: {
      model: 'roman-arch',
      name: "A Roman arch",
      text: "The wedge-shaped stone at the very top is the keystone. It locks the other stones in place, so once the arch is finished, the wooden frame used to build it can be taken away."
    },
    quiz: [
      {
        q: "What does an arch do with the weight above it?",
        choices: ["Squeezes it all into the keystone", "Spreads it sideways and down into the ground", "Lets the stones float"],
        answer: 1,
        hint: "Think of the weight travelling along the curve.",
        explain: "An arch spreads the weight out to the sides and down into the ground, so the stones press together instead of falling."
      },
      {
        q: "Which ingredient helped Roman concrete set even underwater?",
        choices: ["Volcanic ash", "Sugar", "Sea shells"],
        answer: 0,
        hint: "Italy has volcanoes, like Mount Vesuvius.",
        explain: "Volcanic ash mixed with lime made a concrete that could harden even in seawater."
      },
      {
        q: "Why were Roman roads built a little higher in the middle?",
        choices: ["So chariots could race", "To look pretty", "So rainwater would run off"],
        answer: 2,
        hint: "What happens to puddles on a slope?",
        explain: "A raised middle made rainwater run off to the sides, which kept the road dry and strong."
      },
      {
        q: "What is a keystone?",
        choices: ["A key to the city gates", "The wedge-shaped stone at the top of an arch", "The first stone laid on a road"],
        answer: 1,
        hint: "It's the stone that 'locks' something in place.",
        explain: "The keystone sits at the top of an arch and locks the other stones in place."
      }
    ]
  },

  // ───────────────────────────── Floor 4 (about age 9–10) ─────────────────────────────
  {
    id: 'h4-silk-road',
    subject: 'history',
    floor: 4,
    title: "Traders of the Silk Road",
    topic: 'silk-road',
    topicName: 'The Silk Road',
    blurb: "Join a camel caravan and see how goods and ideas crossed Asia.",
    reading: [
      { title: "Not one road", emoji: '🐫', text: "The Silk Road was not a single road but a web of trade routes linking China, Central Asia, India, Persia and the Mediterranean. Few traders went the whole way; goods passed from merchant to merchant." },
      { title: "What was traded?", emoji: '🧵', text: "China sent silk, which rich Romans prized. Along the routes also moved spices, horses, glass, jade, gold, silver and paper." },
      { title: "Ideas travel too", emoji: '💡', text: "Religions such as Buddhism, along with music, foods, art and skills like papermaking, spread along these routes. Sadly, diseases travelled too: the Black Death probably spread partly along them in the 1300s." },
      { title: "A name from later", emoji: '🗺️', text: "The traders never called it the Silk Road. A German geographer gave it that name in 1877, because silk was one of its most famous goods." }
    ],
    dialogue: {
      npc: { name: "Varzak", role: "a merchant from Sogdiana", look: 'silk-road', portrayal: 'generic' },
      intro: "Welcome to our caravan! I'm Varzak, a merchant from Sogdiana in Central Asia. My camels are resting, so we have time to talk.",
      topics: [
        { ask: "Do you travel all the way from China to Rome?", answer: "Hardly anyone does! I buy silk in a market town, carry it west to Samarkand and sell it to another trader. The goods travel the whole way; the people mostly don't." },
        { ask: "Why is silk so valuable?", answer: "Silk is light, soft and strong, and for a long time only China knew how to make it, from the cocoons of silkworms that eat mulberry leaves. Far from China, people paid huge prices for it." },
        { ask: "Why do you travel with camels?", answer: "Our two-humped Bactrian camels store fat in their humps, so they can go for days without food or water, and they cope with freezing nights and scorching days." },
        { ask: "What travels with you besides goods?", answer: "Stories, songs, recipes and beliefs! Buddhist monks walk these roads, and so do new skills like papermaking. A trade route is a road for ideas, too." },
        { ask: "Is the journey dangerous?", answer: "Very. Sandstorms, high mountain passes and bandits! That's why we travel in big caravans and stop at caravanserais, which are inns with strong walls around them." }
      ],
      challenge: {
        q: "Why was the Silk Road important for history, not just for shopping?",
        choices: ["It made everyone speak one language", "It carried ideas, religions and inventions between cultures", "It replaced all travel by sea"],
        answer: 1,
        explain: "Along with goods, traders and travellers carried beliefs, art, skills and inventions, linking cultures that had never met."
      },
      farewell: "The caravan is leaving! May your road be smooth and your water skins full."
    },
    timeline: {
      title: "Along the Silk Road",
      events: [
        { label: "Zhang Qian travels west for China's Han emperor", year: -138, when: "about 138 BCE" },
        { label: "Papermaking reaches Baghdad", year: 795, when: "about 795" },
        { label: "Marco Polo sets out from Venice towards China", year: 1271, when: "1271" },
        { label: "The Black Death reaches Europe", year: 1347, when: "1347" },
        { label: "The name 'Silk Road' is first used", year: 1877, when: "1877" }
      ]
    },
    artifact: {
      model: 'silk-bolt',
      name: "A bolt of silk",
      text: "Silk thread comes from silkworm cocoons. Each cocoon is wound from one single thread that can be hundreds of metres long! China kept the secret of silk-making for centuries, which is why silk was worth so much far away."
    },
    quiz: [
      {
        q: "Was the Silk Road one single road?",
        choices: ["Yes, a paved road from China to Rome", "No, it was a web of many trade routes", "Yes, but only by sea"],
        answer: 1,
        hint: "Think of a net, not a line.",
        explain: "It was a whole web of routes over land, with goods passing from trader to trader."
      },
      {
        q: "Where does silk come from?",
        choices: ["Cotton plants", "Sheep's wool", "The cocoons of silkworms", "Spider webs"],
        answer: 2,
        hint: "A small creature that munches mulberry leaves.",
        explain: "Silk is unwound from the cocoons that silkworms spin."
      },
      {
        q: "What were caravanserais?",
        choices: ["Walled inns where traders rested", "Camel races", "Silk factories"],
        answer: 0,
        hint: "Tired travellers and camels needed somewhere safe for the night.",
        explain: "Caravanserais were roadside inns with walls, where caravans could rest safely and trade."
      },
      {
        q: "Which of these spread west from China along the trade routes?",
        choices: ["The steam engine", "The telescope", "The light bulb", "Papermaking"],
        answer: 3,
        hint: "The other three were invented much later, and not in China.",
        explain: "Papermaking spread from China across Central Asia to Baghdad and, later, to Europe."
      }
    ]
  },

  {
    id: 'h4-ancient-china-inventions',
    subject: 'history',
    floor: 4,
    title: "Inventions of Ancient China",
    topic: 'ancient-china',
    topicName: 'Ancient China',
    blurb: "Make paper, print a page and walk the Great Wall.",
    reading: [
      { title: "Paper", emoji: '📜', text: "Around 105 CE, an official named Cai Lun presented a better way to make paper from tree bark, hemp, old rags and fishing nets. Paper already existed, but his method made it cheaper and better." },
      { title: "The compass", emoji: '🧭', text: "Chinese scholars found that a magnetised needle points north and south. By about 1100, Chinese sailors used compasses to find their way at sea, even under cloudy skies." },
      { title: "Printing", emoji: '🖨️', text: "Chinese printers carved a whole page into a wooden block, inked it and pressed paper on top. The Diamond Sutra, printed in 868 CE, is the oldest dated printed book we know." },
      { title: "The Great Wall", emoji: '🧱', text: "The Great Wall is really many walls, built and rebuilt by different dynasties over more than 2,000 years. And no, you can't see it from the Moon: it's far too narrow." }
    ],
    dialogue: {
      npc: { name: "Mei", role: "a papermaker and storyteller from ancient China", look: 'china', portrayal: 'generic' },
      intro: "Welcome to my workshop! I'm Mei, and I make paper. Careful, the pulp is wet! What would you like to know?",
      topics: [
        { ask: "How do you make paper?", answer: "I soak bark, hemp and old rags, then pound them into a soupy pulp. I scoop it up on a fine screen, the water drains away, and the thin mat of fibres dries into a sheet." },
        { ask: "What did people write on before paper?", answer: "Strips of bamboo tied together, or silk. Bamboo is heavy and silk is very expensive. Paper is light and cheap, and that changed everything." },
        { ask: "How does a compass work?", answer: "A magnetised needle swings to line up north and south with the Earth's magnetism. At first compasses helped people plan buildings; later, sailors used them to steer." },
        { ask: "How did printing help?", answer: "Before printing, every book was copied by hand. With a carved block, a printer could make many copies of a page quickly. Around 1040, an inventor named Bi Sheng even made movable letters from baked clay." },
        { ask: "Who built the Great Wall?", answer: "Many dynasties over more than 2,000 years, using huge numbers of soldiers, farmers and prisoners. The famous brick and stone parts you see in photos were mostly built by the Ming dynasty, from the 1300s to the 1600s." }
      ],
      challenge: {
        q: "Can you see the Great Wall from the Moon with just your eyes?",
        choices: ["Yes, it's easy to spot", "Only on clear nights", "No, it's much too narrow to see from that far"],
        answer: 2,
        explain: "The wall is long but only a few metres wide. From the Moon, about 384,000 km away, nobody could see it. Even from much closer, in orbit, it's very hard to spot."
      },
      farewell: "Go well! Next time you write on paper, think of us."
    },
    timeline: {
      title: "Chinese inventions",
      events: [
        { label: "The first emperor joins older walls together", year: -220, when: "about 220 BCE" },
        { label: "Cai Lun presents his improved paper", year: 105, when: "105 CE" },
        { label: "The Diamond Sutra is printed from wooden blocks", year: 868, when: "868 CE" },
        { label: "Bi Sheng invents movable type made of clay", year: 1040, when: "about 1040" },
        { label: "The Ming dynasty rebuilds the Great Wall in brick and stone", year: 1500, when: "about 1500" }
      ]
    },
    artifact: {
      model: 'compass',
      name: "An early Chinese compass",
      text: "Early Chinese compasses used a magnetised needle, sometimes floated in a bowl of water or hung from a silk thread. Whichever way you turned it, the needle swung round to point north and south."
    },
    quiz: [
      {
        q: "Before paper, what did people in China often write on?",
        choices: ["Glass", "Bamboo strips and silk", "Plastic sheets"],
        answer: 1,
        hint: "One was heavy, the other very expensive.",
        explain: "People wrote on bamboo strips tied together, or on silk. Paper was lighter and cheaper."
      },
      {
        q: "What did Bi Sheng make his movable type from?",
        choices: ["Baked clay", "Iron", "Glass"],
        answer: 0,
        hint: "The same stuff potters use, hardened in a fire.",
        explain: "Bi Sheng made each character from clay and baked it hard, around 1040."
      },
      {
        q: "Why was printing with carved blocks so useful?",
        choices: ["It made books waterproof", "It translated books into other languages", "Printers could make many copies of a page quickly"],
        answer: 2,
        hint: "Think about copying a book by hand, again and again.",
        explain: "Once a block was carved, it could print the same page many times, much faster than copying by hand."
      },
      {
        q: "Who built the Great Wall?",
        choices: ["One emperor, in his lifetime", "Roman engineers", "The Mongols", "Many dynasties over more than 2,000 years"],
        answer: 3,
        hint: "It was built and rebuilt, again and again.",
        explain: "Different Chinese dynasties built and rebuilt walls over more than 2,000 years. The Ming did much of what we see today."
      },
      {
        q: "Which way does a compass needle point?",
        choices: ["North and south", "Up and down", "Towards the nearest river"],
        answer: 0,
        hint: "Sailors used it to know their direction.",
        explain: "A magnetised needle lines up with the Earth's magnetism and points north and south."
      }
    ]
  },

  // ───────────────────────────── Floor 5 (about age 10–11) ─────────────────────────────
  {
    id: 'h5-mali-empire',
    subject: 'history',
    floor: 5,
    title: "The Mali Empire",
    topic: 'mali-empire',
    topicName: 'The Mali Empire',
    blurb: "Gold, salt and a city of books in medieval West Africa.",
    reading: [
      { title: "A golden empire", emoji: '👑', text: "The Mali Empire rose in West Africa around 1235, when Sundiata Keita united the Mande peoples. At its height it stretched from the Atlantic coast far along the Niger River, one of the largest empires of its time." },
      { title: "Gold for salt", emoji: '🧂', text: "Mali had rich gold fields, while salt came from mines deep in the Sahara Desert. Camel caravans crossed the desert to trade them. Salt was scarce and vital, so it was traded for gold." },
      { title: "Mansa Musa", emoji: '🐪', text: "In 1324, Mali's ruler Mansa Musa travelled to Mecca with an enormous caravan carrying gold. He spent and gave away so much in Cairo that gold lost value there for years, and Mali became famous across Europe and the Middle East." },
      { title: "City of books", emoji: '📚', text: "Timbuktu became a centre of learning, with mosques, schools and scholars. Families there have kept hundreds of thousands of handwritten manuscripts on astronomy, medicine, mathematics, law and poetry." }
    ],
    dialogue: {
      npc: { name: "Bakary", role: "a book copier in Timbuktu", look: 'mali', portrayal: 'generic' },
      intro: "Peace be with you! I'm Bakary. I copy books by hand here in Timbuktu. Come into the shade of the courtyard and we'll talk.",
      topics: [
        { ask: "Why is Mali so rich?", answer: "Gold! Our lands hold some of the richest gold fields of the age. Traders cross the Sahara to swap salt, copper and cloth for it, and the empire grows wealthy by taxing that trade." },
        { ask: "Why would anyone trade gold for salt?", answer: "In this heat you sweat out the salt your body needs, and salt stops meat and fish from spoiling. It comes from mines far north in the desert, so it's scarce here, and scarce things are valuable." },
        { ask: "Who was Mansa Musa?", answer: "Our most famous ruler. In 1324 he crossed the desert to Mecca with thousands of people and camels loaded with gold. He spent so generously in Cairo that gold there lost value for years." },
        { ask: "What books do you copy?", answer: "Books about the stars, medicine, mathematics, law, religion and poetry. Scholars come from far away to study here, and families treasure these manuscripts and pass them down." },
        { ask: "Why do these books still matter?", answer: "Some people once wrongly claimed Africa had no written history. Manuscripts like these prove the opposite. Long after my time, in 2012 and 2013, brave librarians smuggled hundreds of thousands of them to safety during a war." }
      ],
      challenge: {
        q: "Why was salt so valuable in Mali?",
        choices: ["People needed it to stay healthy and keep food fresh, and it was scarce there", "It could be turned into gold", "Camels would eat nothing else"],
        answer: 0,
        explain: "Salt replaces what the body loses in the heat and preserves food. It had to come from far across the desert, so it was scarce and valuable."
      },
      farewell: "May your journey be safe and your mind full of books. Go well, friend!"
    },
    timeline: {
      title: "Mali and Timbuktu",
      events: [
        { label: "Sundiata Keita founds the Mali Empire", year: 1235, when: "about 1235" },
        { label: "Mansa Musa's pilgrimage to Mecca", year: 1324, when: "1324" },
        { label: "Mansa Musa is drawn on the Catalan Atlas, a famous European map", year: 1375, when: "about 1375" },
        { label: "The Songhai Empire takes control of Timbuktu", year: 1468, when: "1468" },
        { label: "Timbuktu's manuscripts are carried to safety", year: 2013, when: "2012–2013" }
      ]
    },
    artifact: {
      model: 'coin',
      name: "A gold coin made from West African gold",
      text: "Mali didn't mint its own coins: gold usually changed hands as dust and nuggets. But a large share of the gold in medieval North African and European coins came from West Africa, carried across the Sahara by camel caravan."
    },
    quiz: [
      {
        q: "Which two goods were most famously traded across the Sahara?",
        choices: ["Silk and tea", "Coal and iron", "Gold and salt"],
        answer: 2,
        hint: "One glittered; the other you sprinkle on food.",
        explain: "Mali's gold was traded for salt from Saharan mines."
      },
      {
        q: "What was Timbuktu famous for?",
        choices: ["Building pyramids", "Its scholars and handwritten manuscripts", "Shipbuilding for the Atlantic", "Giant stone castles"],
        answer: 1,
        hint: "Bakary copies them by hand.",
        explain: "Timbuktu was a centre of learning, and its families still keep hundreds of thousands of manuscripts."
      },
      {
        q: "What happened when Mansa Musa spent so much gold in Cairo?",
        choices: ["Gold became worth less there for years", "Cairo ran out of salt", "He became ruler of Egypt"],
        answer: 0,
        hint: "When something becomes very common, is it worth more or less?",
        explain: "So much gold flooded into Cairo that its value fell, a sign of how rich Mali was."
      },
      {
        q: "Who founded the Mali Empire?",
        choices: ["Mansa Musa", "Cleopatra", "Sundiata Keita"],
        answer: 2,
        hint: "It wasn't the famous traveller to Mecca, who came later.",
        explain: "Sundiata Keita founded the empire around 1235. Mansa Musa ruled about 75 years later."
      },
      {
        q: "Why do Timbuktu's manuscripts matter today?",
        choices: ["They are the oldest books on Earth", "They are written in English", "They show that a rich world of writing and learning thrived in West Africa", "They are maps of hidden gold"],
        answer: 2,
        hint: "Think about the wrong idea some people once had about Africa's history.",
        explain: "The manuscripts prove that West Africa had scholars, libraries and centuries of written knowledge."
      }
    ]
  },

  {
    id: 'h5-printing-press',
    subject: 'history',
    floor: 5,
    title: "The Printing Press",
    topic: 'printing-press',
    topicName: 'The Printing Press',
    blurb: "Set metal type in a 1450s print shop in Mainz.",
    reading: [
      { title: "Copying by hand", emoji: '✒️', text: "Before printing came to Europe, every book was copied by hand by monks or professional scribes. One Bible could take a scribe many months, so books were rare and very expensive." },
      { title: "Gutenberg's idea", emoji: '🔠', text: "Around 1450 in Mainz, Germany, Johannes Gutenberg developed movable metal type: single letters cast in metal that could be arranged into pages, printed, then reused. He added oil-based ink and a screw press like those used for grapes." },
      { title: "Not the first", emoji: '🌏', text: "Gutenberg wasn't the first to print with movable type. Bi Sheng in China used clay type around 1040, and in Korea a book called the Jikji was printed with metal type in 1377. But Gutenberg's system spread fast across Europe." },
      { title: "Why it matters", emoji: '🌍', text: "By 1500, presses in more than 200 European towns had printed millions of books. Cheaper books helped more people learn to read and let new ideas spread faster than ever." }
    ],
    dialogue: {
      npc: { name: "Konrad", role: "a typesetter in a Mainz print shop, 1450s", look: 'printer', portrayal: 'generic' },
      intro: "Mind the ink! I'm Konrad, and I set type in a print shop here in Mainz. We're printing something big. Come and see.",
      topics: [
        { ask: "What are you printing?", answer: "A Bible in Latin, two columns on every page. We're making about 180 copies. A scribe might need a year or more to copy just one!" },
        { ask: "How do you set type?", answer: "I pick metal letters from a type case one by one and line them up in a composing stick. Each letter is cast back-to-front, because printing turns it into a mirror image. Then whole pages are locked into a frame." },
        { ask: "How are the letters made?", answer: "Gutenberg's clever hand mould lets us cast many identical letters quickly from a metal mix of lead, tin and antimony. It melts easily and hardens fast." },
        { ask: "How does the press work?", answer: "We dab sticky oil-based ink onto the type, lay damp paper on top, then pull a bar that turns a big screw and presses down hard. Lift it up, and there's a printed page!" },
        { ask: "Why is printing such a big deal?", answer: "Books will become cheaper, so many more people can own them and learn to read. Ideas will spread faster than any scribe could copy them, and every copy will say exactly the same thing." }
      ],
      challenge: {
        q: "What made Gutenberg's system so efficient?",
        choices: ["Each page was carved from one wooden block", "Reusable metal letters could be rearranged for every new page", "A machine read the words aloud"],
        answer: 1,
        explain: "Metal letters were cast in large numbers, arranged into a page, printed, then taken apart and reused for the next page."
      },
      farewell: "Back to work for me! These pages won't print themselves. Well, almost."
    },
    timeline: {
      title: "The story of printing",
      events: [
        { label: "The Diamond Sutra is printed from wooden blocks in China", year: 868, when: "868" },
        { label: "Bi Sheng makes movable type from clay", year: 1040, when: "about 1040" },
        { label: "The Jikji is printed with metal type in Korea", year: 1377, when: "1377" },
        { label: "Gutenberg's Bible is printed in Mainz", year: 1455, when: "about 1455" },
        { label: "A steam-powered press starts printing newspapers in London", year: 1814, when: "1814" }
      ]
    },
    artifact: {
      model: 'printing-press',
      name: "A wooden printing press",
      text: "This kind of press used a big wooden screw, like a press for squeezing grapes. Turning the bar pushed a flat board called the platen down onto the paper and inked type. A skilled team could print hundreds of sheets a day."
    },
    quiz: [
      {
        q: "In which city did Gutenberg print his famous Bible?",
        choices: ["Rome", "Paris", "Mainz", "London"],
        answer: 2,
        hint: "It's a city in Germany, by the river Rhine.",
        explain: "Gutenberg worked in Mainz, Germany, where his Bible was printed around 1455."
      },
      {
        q: "Why were the metal letters cast back-to-front?",
        choices: ["To confuse thieves", "Because pressing them onto paper flips them", "Because German is read backwards"],
        answer: 1,
        hint: "Think of a stamp, or your writing seen in a mirror.",
        explain: "Like a rubber stamp, the type prints a mirror image, so the letters must be reversed to print the right way round."
      },
      {
        q: "Who printed with movable type before Gutenberg?",
        choices: ["Bi Sheng in China, and printers in Korea", "Nobody, Gutenberg was the first", "The ancient Romans"],
        answer: 0,
        hint: "Look east, centuries earlier.",
        explain: "Bi Sheng used clay type around 1040, and the Jikji was printed with metal type in Korea in 1377."
      },
      {
        q: "What was one big effect of the printing press?",
        choices: ["Scribes were put in charge of all books", "People stopped learning to read", "Only kings could own books", "Books became cheaper and ideas spread faster"],
        answer: 3,
        hint: "What happens when you can make many copies quickly?",
        explain: "Printing made books cheaper and more common, so more people read and new ideas spread quickly."
      }
    ]
  },

  // ───────────────────────────── Floor 6 (about age 11–12) ─────────────────────────────
  {
    id: 'h6-age-of-exploration',
    subject: 'history',
    floor: 6,
    title: "The Age of Exploration",
    topic: 'age-of-exploration',
    topicName: 'The Age of Exploration',
    blurb: "Navigate by the stars, and hear the whole story of the great voyages.",
    reading: [
      { title: "Why sail?", emoji: '🧭', text: "In the 1400s, European rulers and merchants wanted a sea route to the spices, silk and gold of Asia. Goods arriving overland passed through many middlemen, each adding to the price. Portugal and Spain led the way, sending ships into waters unknown to them." },
      { title: "Tools of the navigator", emoji: '🌟', text: "Sailors used a magnetic compass for direction, and an astrolabe or quadrant to measure the height of the Sun or the Pole Star. That told them their latitude: how far north or south they were. Finding longitude reliably at sea had to wait until the 1700s." },
      { title: "A round world, already known", emoji: '🌍', text: "Educated Europeans had known the Earth was round since ancient Greek times, so explorers didn't 'prove' it. What the voyages changed was the map: in 1522 the survivors of Magellan's expedition, led home by Juan Sebastián Elcano, completed the first voyage around the world." },
      { title: "The other side of the story", emoji: '🤝', text: "The lands Europeans called 'new' were already home to millions of people. Conquest, enslavement and diseases such as smallpox, which Indigenous peoples had never met before, caused terrible suffering. Honest history remembers both the daring and the harm." }
    ],
    dialogue: {
      npc: { name: "Duarte", role: "a navigator on a Portuguese ship, 1490s", look: 'explorer', portrayal: 'generic' },
      intro: "Bom dia! I'm Duarte, a navigator. Our ship sails at dawn, so let's talk while I check my charts.",
      topics: [
        { ask: "How do you know which way to go?", answer: "My compass gives me direction, even under cloud. At noon I measure how high the Sun stands with my astrolabe, and tables turn that into latitude. Then I estimate our speed and time to mark our position on the chart." },
        { ask: "Why sail all the way to Asia?", answer: "Pepper, cloves and cinnamon are worth a fortune in Europe. If we sail around Africa straight to India, we can buy them directly instead of paying a chain of traders along the way." },
        { ask: "Aren't you afraid of sailing off the edge of the world?", answer: "Ha! Educated sailors know the Earth is a sphere; Greek scholars even estimated its size long ago. What we really fear are storms, running out of fresh water, and scurvy." },
        { ask: "What is scurvy?", answer: "A terrible sickness on long voyages: gums bleed and old wounds reopen. Long after my time, people learned it's caused by a lack of vitamin C, and that fresh fruit like lemons prevents it." },
        { ask: "What happens to the people who already live in the lands you reach?", answer: "That is the hardest part of this story. Many were attacked, enslaved or driven from their land, and new diseases killed huge numbers. These voyages connected the world, but at a terrible cost to the people already living there." }
      ],
      challenge: {
        q: "What did navigators use an astrolabe for?",
        choices: ["To measure how deep the sea was", "To see far-off islands up close", "To measure the height of the Sun or stars and work out latitude"],
        answer: 2,
        explain: "By measuring how high the Sun or the Pole Star stood above the horizon, a navigator could work out how far north or south the ship was."
      },
      farewell: "Fair winds to you! A good map shows where you are. A good historian also asks who was already there."
    },
    timeline: {
      title: "Voyages that changed the map",
      events: [
        { label: "Zheng He leads the first of seven great Chinese voyages", year: 1405, when: "1405" },
        { label: "Columbus reaches the Caribbean", year: 1492, when: "1492" },
        { label: "Vasco da Gama reaches India by sailing around Africa", year: 1498, when: "1498" },
        { label: "Elcano's ship returns after the first voyage around the world", year: 1522, when: "1522" },
        { label: "John Harrison's sea clock helps solve the longitude problem", year: 1761, when: "about 1761" }
      ]
    },
    artifact: {
      model: 'globe',
      name: "An early globe",
      text: "The oldest surviving globe of the Earth was made in Nuremberg in 1492, just before news of Columbus's voyage reached Europe, so it shows no Americas at all. Within a few decades, mapmakers had to redraw the world."
    },
    quiz: [
      {
        q: "Why did European rulers want a sea route to Asia?",
        choices: ["To prove the Earth was round", "To buy spices and silk directly, without paying many middlemen", "To escape cold winters"],
        answer: 1,
        hint: "Follow the money: what did each trader along the way add?",
        explain: "Asian goods were very valuable in Europe, and a direct sea route meant cutting out the traders who raised the price."
      },
      {
        q: "Which navigation problem wasn't solved reliably until the 1700s?",
        choices: ["Finding north with a compass", "Finding latitude from the Sun", "Finding longitude at sea"],
        answer: 2,
        hint: "It needed a very accurate clock that could survive a rolling ship.",
        explain: "Longitude needed precise timekeeping at sea; John Harrison's sea clocks in the 1700s finally made it practical."
      },
      {
        q: "Did Columbus prove that the Earth is round?",
        choices: ["No, educated Europeans had known since ancient Greek times", "Yes, he was the first to prove it", "No, nobody knew until photos from space"],
        answer: 0,
        hint: "Greek scholars even estimated the Earth's size, more than 2,000 years ago.",
        explain: "The round Earth was well known to educated people long before 1492. Columbus's mistake was thinking the Earth was smaller than it is."
      },
      {
        q: "What caused the greatest loss of life among Indigenous peoples of the Americas after 1492?",
        choices: ["Earthquakes", "Volcanic eruptions", "A long drought", "New diseases such as smallpox"],
        answer: 3,
        hint: "Something the newcomers carried without meaning to.",
        explain: "Diseases like smallpox, which Indigenous peoples had no immunity to, killed the most people, on top of the harm from conquest and enslavement."
      },
      {
        q: "Which expedition was the first to sail all the way around the world?",
        choices: ["Columbus's, in 1492", "The one begun by Magellan and finished by Elcano, in 1522", "Vasco da Gama's, in 1498"],
        answer: 1,
        hint: "Its leader died on the way, and someone else brought the ship home.",
        explain: "Magellan was killed in the Philippines in 1521, but Elcano brought the last ship home to Spain in 1522."
      }
    ]
  },

  {
    id: 'h6-industrial-revolution',
    subject: 'history',
    floor: 6,
    title: "The Industrial Revolution",
    topic: 'industrial-revolution',
    topicName: 'The Industrial Revolution',
    blurb: "Steam, smoke and spinning machines, and the fight for children's rights.",
    reading: [
      { title: "Power from steam", emoji: '🚂', text: "From the mid-1700s, Britain began making goods with machines instead of by hand. James Watt's improved steam engine, patented in 1769, burned coal to power pumps and factories, and later trains and ships." },
      { title: "Factories and cities", emoji: '🏭', text: "Spinning and weaving machines were gathered into large factories called mills. Huge numbers of people left the countryside for fast-growing cities like Manchester, where housing was crowded and the air thick with smoke." },
      { title: "Children at work", emoji: '🧒', text: "Many children worked in mills and mines, often 12 hours a day or more, crawling under moving machines or pulling coal carts underground. Accidents and illness were common." },
      { title: "Changing the rules", emoji: '📜', text: "Reformers and workers campaigned for change. Britain's Factory Act of 1833 banned most textile mill work for children under 9, and in 1880 school became compulsory for children aged 5 to 10. Why it matters: going to school instead of to work was a right people fought for." }
    ],
    dialogue: {
      npc: { name: "Nell", role: "a cotton mill worker in Manchester, 1830s", look: 'factory', portrayal: 'generic' },
      intro: "Speak up, the machines are loud! I'm Nell. I work in a cotton mill here in Manchester. My shift's nearly over, so I can talk.",
      topics: [
        { ask: "What do you do in the mill?", answer: "I mind the spinning machines and tie broken threads before they tangle. It needs quick fingers. The machines never get tired, so we're not supposed to either." },
        { ask: "How long is your working day?", answer: "Often twelve hours or more, six days a week. A bell tells us when to start and stop. On the farm, work followed the sun and the seasons; here it follows the clock." },
        { ask: "Why are there children working here?", answer: "Families need every wage, and owners pay children less. Small children can squeeze under the machines to clean them, which is very dangerous. People are starting to protest." },
        { ask: "What does a steam engine actually do?", answer: "Burning coal boils water into steam. The steam pushes a piston back and forth, and that motion turns a big wheel, and belts carry the power to every machine in the mill." },
        { ask: "Will things get better?", answer: "Reformers are pushing for laws to limit children's hours and get them into school. Later, trade unions help workers win safer conditions and shorter days. It takes years, but change comes because people speak up." }
      ],
      challenge: {
        q: "What did Britain's Factory Act of 1833 do?",
        choices: ["Banned most textile mill work for children under 9 and limited older children's hours", "Banned all steam engines", "Made school compulsory for every child"],
        answer: 0,
        explain: "The 1833 Act stopped most mills from employing children under 9, limited hours for older children, and sent inspectors to check. Compulsory schooling came later, in 1880."
      },
      farewell: "There's the bell! Mind how you go, and be glad you're off to school, not the mill."
    },
    timeline: {
      title: "Steam, factories and reform",
      events: [
        { label: "James Watt patents his improved steam engine", year: 1769, when: "1769" },
        { label: "A public railway opens with steam trains, from Stockton to Darlington", year: 1825, when: "1825" },
        { label: "The Factory Act limits child labour in textile mills", year: 1833, when: "1833" },
        { label: "The Great Exhibition shows off new machines in London", year: 1851, when: "1851" },
        { label: "School becomes compulsory in England and Wales for ages 5 to 10", year: 1880, when: "1880" }
      ]
    },
    artifact: {
      model: 'steam-engine',
      name: "A beam steam engine",
      text: "In a beam engine, steam pushed a piston up and down, rocking a huge iron beam like a seesaw. The beam turned a heavy flywheel, whose steady spin could drive pumps or a whole factory's machines through belts and shafts."
    },
    quiz: [
      {
        q: "What fuel did most steam engines burn?",
        choices: ["Petrol", "Coal", "Solar power", "Uranium"],
        answer: 1,
        hint: "Britain had lots of it underground, and children helped mine it.",
        explain: "Steam engines burned coal to boil water, which is why coal mining grew so fast."
      },
      {
        q: "Why did so many people move to cities like Manchester?",
        choices: ["To find work in the new factories", "To go to the seaside", "Because farming was banned"],
        answer: 0,
        hint: "Where were the new jobs?",
        explain: "Mills and factories in the cities needed workers, so people left the countryside to find jobs."
      },
      {
        q: "Why did factory owners employ children?",
        choices: ["The law required it", "Children had already finished school", "They could pay them less, and small children fit under machines"],
        answer: 2,
        hint: "Think about money, and about size.",
        explain: "Children were paid less than adults, and their small size let them reach under machines, which was very dangerous."
      },
      {
        q: "What did Britain's Education Act of 1880 do?",
        choices: ["Banned all factories", "Closed the coal mines", "Gave every child a factory job", "Made school compulsory for children aged 5 to 10"],
        answer: 3,
        hint: "It's about where children should spend their days instead of the mill.",
        explain: "From 1880, children in England and Wales aged 5 to 10 had to go to school."
      },
      {
        q: "Inside a steam engine, what pushes the piston?",
        choices: ["Steam from boiling water", "The wind", "Magnets"],
        answer: 0,
        hint: "It's in the name!",
        explain: "Coal heats water into steam, and the pressure of the steam pushes the piston."
      }
    ]
  },

  // ───────────────────────────── Floor 7 (about age 12–13) ─────────────────────────────
  {
    id: 'h7-first-flight',
    subject: 'history',
    floor: 7,
    title: "The First Flight",
    topic: 'first-flight',
    topicName: 'The First Powered Flight',
    blurb: "Twelve seconds at Kitty Hawk that changed the world.",
    reading: [
      { title: "Dreams of flying", emoji: '🪶', text: "For centuries people tried to fly with flapping wings. Hot-air balloons first carried people in 1783, and in the 1890s Otto Lilienthal made around 2,000 glider flights. But nobody had yet built a powered aircraft a pilot could truly control." },
      { title: "Two brothers from Ohio", emoji: '🚲', text: "Wilbur and Orville Wright ran a bicycle shop in Dayton, Ohio. They studied birds, built their own wind tunnel to test wing shapes, and realised that the hardest problem wasn't power: it was control." },
      { title: "17 December 1903", emoji: '✈️', text: "Near Kitty Hawk, North Carolina, Orville flew the Wright Flyer for 12 seconds and about 37 metres (120 feet): the first controlled, sustained flight of a powered, heavier-than-air machine. Later that day, Wilbur flew 260 metres in 59 seconds." },
      { title: "Why it matters", emoji: '🌍', text: "Within a few decades, aeroplanes carried mail and passengers across oceans. Only 66 years after that first 12-second flight, astronauts landed on the Moon, and today air travel links almost every country on Earth." }
    ],
    dialogue: {
      npc: { name: "Rosa", role: "an aircraft mechanic and flight historian", look: 'pilot', portrayal: 'generic' },
      intro: "Hand me that wrench, would you? I'm Rosa. I keep old aircraft flying, and this Wright Flyer replica is my favourite. Want to hear its story?",
      topics: [
        { ask: "How did the Wright brothers steer?", answer: "With 'wing warping': cables twisted the wingtips so one side lifted more than the other, letting the plane bank into a turn. With an elevator at the front and a rudder at the back, the pilot could control roll, pitch and yaw." },
        { ask: "Where did the engine come from?", answer: "No company could supply one light enough, so their mechanic, Charlie Taylor, built a 12-horsepower engine with an aluminium body in about six weeks. It turned two wooden propellers the brothers designed themselves." },
        { ask: "Why Kitty Hawk?", answer: "Strong, steady winds for lift, soft sand for landings, and few people watching. Wind figures from the US Weather Bureau helped them choose the spot." },
        { ask: "Was the first flight famous right away?", answer: "Not at all! Only five local people watched, and many newspapers ignored or doubted it. The brothers kept improving their planes, and public flights in 1908 finally made them world-famous." },
        { ask: "Is the real Flyer still around?", answer: "Yes! The 1903 Wright Flyer hangs in the Smithsonian's National Air and Space Museum in Washington, D.C. Pieces of its wood and fabric even travelled to the Moon with Apollo 11." }
      ],
      challenge: {
        q: "What did the Wright brothers see as the key problem of flight?",
        choices: ["Making the plane as heavy as possible", "Controlling the aircraft in the air", "Finding a long enough runway"],
        answer: 1,
        explain: "Others had wings and engines; the Wrights' breakthrough was a way for the pilot to control the aircraft in all three directions."
      },
      farewell: "Thanks for the help! Next time you fly, give a nod to two bicycle makers from Ohio."
    },
    timeline: {
      title: "Taking to the skies",
      events: [
        { label: "People fly for the first time, in a hot-air balloon over Paris", year: 1783, when: "1783" },
        { label: "Otto Lilienthal begins his glider flights in Germany", year: 1891, when: "1891" },
        { label: "The Wright Flyer makes the first powered, controlled flight", year: 1903, when: "1903" },
        { label: "Charles Lindbergh flies alone, non-stop, across the Atlantic", year: 1927, when: "1927" },
        { label: "A rocket plane, the Bell X-1, first flies faster than sound", year: 1947, when: "1947" }
      ]
    },
    artifact: {
      model: 'airplane',
      name: "The 1903 Wright Flyer",
      text: "A biplane of spruce wood and muslin cloth with a 12-metre wingspan. The pilot lay flat on the lower wing and shifted his hips in a cradle to warp the wings. It flew only four times, all on one December day, before a gust of wind flipped and damaged it."
    },
    quiz: [
      {
        q: "Where did the first powered, controlled flight take place?",
        choices: ["Paris, France", "Near Kitty Hawk, North Carolina", "Dayton, Ohio", "London, England"],
        answer: 1,
        hint: "Windy sand dunes on the US east coast.",
        explain: "The Wrights flew near Kitty Hawk, North Carolina, chosen for its steady winds and soft sand."
      },
      {
        q: "How long did the very first flight last?",
        choices: ["12 seconds", "12 minutes", "2 hours"],
        answer: 0,
        hint: "It was very short, shorter than a minute.",
        explain: "Orville's first flight lasted about 12 seconds and covered about 37 metres (120 feet)."
      },
      {
        q: "What did the Wright brothers build to test wing shapes?",
        choices: ["A rocket", "A submarine", "A wind tunnel"],
        answer: 2,
        hint: "A box where air is blown past small model wings.",
        explain: "Their homemade wind tunnel let them measure how hundreds of wing shapes performed."
      },
      {
        q: "How did 'wing warping' help the pilot?",
        choices: ["It folded the wings for storage", "It made the engine more powerful", "It kept the rain off the pilot", "It twisted the wingtips so the plane could roll and turn"],
        answer: 3,
        hint: "Watch how a bird tilts its wings to turn.",
        explain: "Twisting the wingtips gave one wing more lift than the other, so the plane could bank into a turn."
      },
      {
        q: "What business did the Wright brothers run before they flew?",
        choices: ["A railway", "A bicycle shop", "A shipyard"],
        answer: 1,
        hint: "Two wheels, pedals and chains.",
        explain: "They built and repaired bicycles in Dayton, Ohio, and that business paid for their experiments."
      }
    ]
  },

  {
    id: 'h7-moon-landing',
    subject: 'history',
    floor: 7,
    title: "Apollo 11: To the Moon",
    topic: 'moon-landing',
    topicName: 'The Moon Landing',
    blurb: "Sit at Mission Control as Apollo 11 lands on the Moon.",
    reading: [
      { title: "The Space Race", emoji: '🚀', text: "After the Soviet Union launched Sputnik, the first satellite, in 1957 and sent Yuri Gagarin into orbit in 1961, the United States set a bold goal: land people on the Moon and bring them home safely before 1970." },
      { title: "Three astronauts", emoji: '🧑‍🚀', text: "Apollo 11 launched on 16 July 1969 on a giant Saturn V rocket. Neil Armstrong and Buzz Aldrin flew the lunar module Eagle down to the surface, while Michael Collins orbited the Moon alone in the command module Columbia." },
      { title: "One small step", emoji: '👣', text: "Eagle landed on 20 July 1969, and a few hours later Armstrong became the first person to step onto the Moon, followed by Aldrin. Hundreds of millions watched on TV. They spent about two and a half hours outside and collected 21.5 kilograms of Moon rock and soil." },
      { title: "Why it matters", emoji: '🌕', text: "Around 400,000 people worked on the Apollo program, showing what careful engineering and teamwork can achieve. The Moon rocks taught scientists a great deal about how the Moon formed, and Apollo helped push forward the computer technology we rely on today." }
    ],
    dialogue: {
      npc: { name: "Dee", role: "an engineer at Mission Control in Houston, 1969", look: 'scientist', portrayal: 'generic' },
      intro: "Quiet on the headsets, please, we're watching the numbers! I'm Dee, an engineer here at Mission Control in Houston. Pull up a chair.",
      topics: [
        { ask: "What do you do in Mission Control?", answer: "We watch live data from the spacecraft (fuel, oxygen, temperatures, the computer) and tell the crew 'go' or 'no go' at every step. Each console has an expert, backed by more engineers in rooms behind us." },
        { ask: "What happened during the landing?", answer: "The guidance computer flashed '1202' and '1201' alarms. It was overloaded, but it kept doing its most important jobs, so we called 'go'. Then Armstrong steered by hand past a field of boulders and landed with very little fuel to spare." },
        { ask: "Who stayed in orbit?", answer: "Michael Collins flew Columbia around the Moon alone. Each time he passed behind the Moon he was cut off from all radio contact with Earth. Without him, the others had no ride home." },
        { ask: "What did the astronauts do on the Moon?", answer: "They planted a flag, collected rock and soil, and set up experiments, including a mirror that scientists still bounce lasers off today to measure the distance between the Earth and the Moon." },
        { ask: "How powerful was the spacecraft's computer?", answer: "The Apollo Guidance Computer had about 4 kilobytes of working memory, far less than any phone today. Margaret Hamilton led the MIT team that wrote its flight software, designed to put the most important jobs first when it got overloaded." }
      ],
      challenge: {
        q: "Which Apollo 11 astronaut did NOT walk on the Moon?",
        choices: ["Neil Armstrong", "Buzz Aldrin", "Michael Collins"],
        answer: 2,
        explain: "Michael Collins stayed in orbit in Columbia while Armstrong and Aldrin walked on the surface, then he flew them all home."
      },
      farewell: "The Eagle has landed, and so have you! Thanks for keeping Mission Control company."
    },
    timeline: {
      title: "The race to the Moon",
      events: [
        { label: "Sputnik, the first satellite, is launched", year: 1957, when: "1957" },
        { label: "Yuri Gagarin becomes the first person in space", year: 1961, when: "1961" },
        { label: "Apollo 8's crew are the first people to orbit the Moon", year: 1968, when: "1968" },
        { label: "Apollo 11 lands on the Moon", year: 1969, when: "1969" },
        { label: "Apollo 17: the last time people walk on the Moon (so far)", year: 1972, when: "1972" }
      ]
    },
    artifact: {
      model: 'moon-boot',
      name: "An Apollo moon boot",
      text: "Moonwalkers wore overshoes with ridged soles over their spacesuit boots, which made the famous bootprints. The Apollo 11 crew left theirs on the Moon to save weight. With no wind or rain there, their footprints could last for millions of years."
    },
    quiz: [
      {
        q: "What was the name of Apollo 11's lunar module?",
        choices: ["Columbia", "Eagle", "Sputnik", "Saturn"],
        answer: 1,
        hint: "'The ____ has landed.'",
        explain: "Armstrong and Aldrin landed in Eagle. Columbia was the command module that stayed in orbit."
      },
      {
        q: "Why did Michael Collins lose radio contact with Earth at times?",
        choices: ["His radio was broken", "Mission Control took breaks", "The Moon blocked the signal when he flew behind it"],
        answer: 2,
        hint: "Radio waves travel in straight lines.",
        explain: "When Columbia passed behind the Moon, the Moon itself stood between Collins and the Earth, blocking all radio signals."
      },
      {
        q: "What caused the '1202' alarm during the landing?",
        choices: ["The computer was overloaded with tasks", "A fire in the rocket engine", "A crack in the cabin window"],
        answer: 0,
        hint: "The computer had too much to do at once.",
        explain: "The computer was overloaded, but its software dropped less important jobs and kept the vital ones running, so the landing could go on."
      },
      {
        q: "Which of these happened first?",
        choices: ["Apollo 11 lands on the Moon", "Apollo 8 orbits the Moon", "Yuri Gagarin orbits the Earth", "Apollo 17, the last Moon landing"],
        answer: 2,
        hint: "Before going to the Moon, someone had to go to space at all.",
        explain: "Gagarin flew in 1961, Apollo 8 orbited the Moon in 1968, Apollo 11 landed in 1969, and Apollo 17 came in 1972."
      },
      {
        q: "Which experiment left on the Moon is still used today?",
        choices: ["A weather station", "A solar power plant", "A radio playing music", "A mirror for bouncing lasers to measure the Earth–Moon distance"],
        answer: 3,
        hint: "Scientists on Earth aim at it with a powerful beam of light.",
        explain: "The laser reflector lets scientists time a laser pulse's round trip and measure the Earth–Moon distance extremely precisely."
      }
    ]
  }
];
