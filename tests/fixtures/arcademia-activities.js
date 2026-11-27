/**
 * One demo lesson for each signature game (content/games.js, lesson/games/), with its overlays in
 * Korean, Spanish, Japanese and Chinese. Test fixtures only: no world teaches them. The unit tests
 * check them (and their translations); the e2e suite (tests/e2e/activities.mjs) plays each one;
 * in the dev server, `arcademiaDemo('sort')` in the console opens one (ArcademiaGame.js).
 *
 * They double as worked examples of each kind's data for the content writers.
 */
const card = (title, text, emoji) => ({ title, text, emoji });
const lesson = (id, subject, realm, kind, rest) => ({
  id,
  subject,
  floor: 1,
  realm,
  activities: ['story', 'learn', kind, 'challenge'],
  ...rest
});

export const DEMO_LESSONS = {
  sort: lesson('biology1-forest-demo-sort', 'biology', 'forest', 'sort', {
    title: 'Animal Families',
    topic: 'animal-groups',
    topicName: 'Animal groups',
    blurb: 'Mammals, birds and fish: who belongs where?',
    reading: [
      card('Mammals', 'Mammals have fur or hair, breathe air and feed their babies milk. Bears, rabbits and even dolphins are mammals!', '🐻'),
      card('Birds and fish', 'Birds have feathers and lay eggs. Fish live in water, breathe with gills and have fins.', '🐦')
    ],
    sort: {
      q: 'Help Ribbit sort the animals into their families!',
      groups: [{ id: 'mammal', label: 'Mammals', emoji: '🐾' }, { id: 'bird', label: 'Birds', emoji: '🪶' }, { id: 'fish', label: 'Fish', emoji: '🫧' }],
      items: [
        { label: 'Bear', emoji: '🐻', group: 'mammal', given: true },
        { label: 'Owl', emoji: '🦉', group: 'bird', given: true },
        { label: 'Shark', emoji: '🦈', group: 'fish', given: true },
        { label: 'Rabbit', emoji: '🐰', group: 'mammal' },
        { label: 'Penguin', emoji: '🐧', group: 'bird', hint: 'Penguins can\'t fly, but they have feathers.' },
        { label: 'Clownfish', emoji: '🐠', group: 'fish' },
        { label: 'Dolphin', emoji: '🐬', group: 'mammal', hint: 'Dolphins breathe air and feed their babies milk.' },
        { label: 'Duck', emoji: '🦆', group: 'bird' }
      ],
      rule: { q: 'How were these animals sorted?', choices: ['Into animal families', 'By their colour', 'By how big they are'], answer: 0, hint: 'Look at the bear, the owl and the shark: fur, feathers, fins.', explain: 'Mammals, birds and fish are three animal families.' }
    },
    quiz: [
      { q: 'Which animal is a mammal?', choices: ['Dolphin', 'Shark', 'Duck'], answer: 0, hint: 'Which one feeds its babies milk?', explain: 'Dolphins are mammals: they breathe air and feed their babies milk.' },
      { q: 'What do all birds have?', choices: ['Feathers', 'Fur', 'Gills'], answer: 0, hint: 'Think of a penguin and an owl.', explain: 'Every bird has feathers, even birds that cannot fly.' },
      { q: 'How do fish breathe?', choices: ['With gills', 'With lungs', 'Through their tails'], answer: 0, hint: 'They take air out of the water.', explain: 'Fish breathe with gills that take air out of the water.' }
    ]
  }),

  maphunt: lesson('geography1-sea-demo-oceans', 'geography', 'sea', 'maphunt', {
    title: 'Oceans and Continents',
    topic: 'world-map',
    topicName: 'The world map',
    blurb: 'Find the big oceans and the continents on a map.',
    reading: [
      card('Seven continents', 'The land on Earth is split into seven big pieces called continents, like Africa and Asia.', '🌍'),
      card('Five oceans', 'Most of Earth is covered by water. The biggest ocean of all is the Pacific Ocean.', '🌊')
    ],
    maphunt: {
      q: 'Help Inka find these places on the world map!',
      map: 'world',
      clues: [
        { q: 'Where is the biggest ocean, the Pacific?', region: 'pacific', hint: 'It is on both sides of the map, between Asia and the Americas.' },
        { q: 'Tap Africa, the continent with the Sahara desert.', region: 'africa', hint: 'It is right in the middle, below Europe.' },
        { q: 'Where is Antarctica, the icy land at the South Pole?', region: 'antarctica', hint: 'Look at the very bottom of the map.' }
      ]
    },
    quiz: [
      { q: 'Which is the biggest ocean?', choices: ['Pacific', 'Atlantic', 'Arctic'], answer: 0, hint: 'You found it first.', explain: 'The Pacific is the biggest ocean on Earth.' },
      { q: 'How many continents are there?', choices: ['Seven', 'Three', 'Ten'], answer: 0, hint: 'Count the big pieces of land.', explain: 'There are seven continents.' },
      { q: 'Where is Antarctica?', choices: ['At the South Pole', 'At the North Pole', 'In the middle'], answer: 0, hint: 'It is very cold and at the bottom of the map.', explain: 'Antarctica is the icy continent at the South Pole.' }
    ]
  }),

  dig: lesson('archaeology1-desert-demo-dig', 'archaeology', 'desert', 'dig', {
    title: 'The Camp by the Nile',
    topic: 'digging-up-the-past',
    topicName: 'Digging up the past',
    blurb: 'Brush the sand, find old things, crack a code.',
    reading: [
      card('Archaeologists', 'Archaeologists dig very carefully with small brushes, so nothing old gets broken.', '🖌️'),
      card('Old writing', 'Long ago in Egypt, people wrote with little pictures. Each picture could stand for a sound.', '📜')
    ],
    dig: {
      q: 'Dig up the old camp by the Nile!',
      w: 5,
      h: 4,
      finds: [
        { at: [1, 1], emoji: '🏺', label: 'A clay jar', text: 'People kept water, oil and grain in jars like this.', question: { q: 'What could people keep in this jar?', choices: ['Water', 'Electricity', 'Television'], answer: 0, hint: 'Long ago there were no machines.', explain: 'Clay jars held water, oil or grain.' } },
        { at: [3, 2], emoji: '🪨', label: 'A carved stone', text: 'Someone carved a secret message in picture writing!', decode: { q: 'What does the stone say?', message: 'NILE', explain: 'The Nile is the long river that gave Egypt its water.' } }
      ]
    },
    quiz: [
      { q: 'What does an archaeologist use to dig gently?', choices: ['A small brush', 'A bulldozer', 'A hammer'], answer: 0, hint: 'Gently does it!', explain: 'A soft brush moves sand without breaking old things.' },
      { q: 'What was the river by the camp called?', choices: ['The Nile', 'The Amazon', 'The Thames'], answer: 0, hint: 'You cracked the code!', explain: 'The stone said NILE: the river of Egypt.' },
      { q: 'What did people keep in clay jars?', choices: ['Water and grain', 'Toys and games', 'Books'], answer: 0, hint: 'Something to eat or drink.', explain: 'Jars kept water, oil and grain.' }
    ]
  }),

  countdown: lesson('rockets1-moon-demo-launch', 'rockets', 'moon', 'countdown', {
    title: 'Ready for Launch',
    topic: 'rocket-launch',
    topicName: 'Rocket launches',
    blurb: 'Fuel up, count down and fly to the Moon.',
    reading: [
      card('Fuel', 'A rocket needs lots of fuel to push it up, faster and faster, away from the ground.', '⛽'),
      card('Countdown', 'Before a launch everyone counts down together: 5, 4, 3, 2, 1… lift off!', '🚀')
    ],
    countdown: {
      q: 'Fill the rocket with fuel and fly to the Moon!',
      target: 'moon',
      from: 5,
      steps: [
        { q: 'Count back from 5!', order: [5, 4, 3, 2, 1], hint: 'Start with the biggest number.' },
        { q: 'What pulls the rocket back down?', choices: ['Gravity', 'Wind', 'Magnets'], answer: 0, hint: 'It also makes a ball fall.', explain: 'Gravity pulls everything down toward the Earth.' },
        { q: 'Get the astronaut ready, in order!', order: ['Put on the suit', 'Climb into the rocket', 'Buckle up'], hint: 'You can\'t climb in without your suit!' }
      ]
    },
    quiz: [
      { q: 'What does a rocket need to go up?', choices: ['Fuel', 'Sails', 'Pedals'], answer: 0, hint: 'You filled the tank.', explain: 'Rockets burn fuel to push themselves up.' },
      { q: 'What comes after 3 in a countdown?', choices: ['2', '4', '5'], answer: 0, hint: 'Count back.', explain: '5, 4, 3, 2, 1: after 3 comes 2.' },
      { q: 'Where did your rocket fly?', choices: ['To the Moon', 'Under the sea', 'To the shop'], answer: 0, hint: 'Look up at night!', explain: 'Your rocket flew to the Moon.' }
    ]
  }),

  rover: lesson('coding1-mars-demo-rover', 'coding', 'mars', 'rover', {
    title: 'Drive the Rover',
    topic: 'first-programs',
    topicName: 'First programs',
    blurb: 'Blocks make a program; the rover follows it.',
    reading: [
      card('A program', 'A program is a list of steps a robot follows, one by one, in order.', '🤖'),
      card('Bugs', 'When a program goes wrong, it has a bug. Coders find the bug and fix it!', '🐞')
    ],
    rover: {
      q: 'Drive the rover to the sample tubes!',
      puzzles: [
        { w: 5, h: 4, start: [0, 3, 'E'], samples: [[2, 1]], rocks: [[2, 3], [2, 2]], blocks: ['forward', 'left', 'right'], max: 8, hint: 'Go up and round the rocks.' },
        { w: 6, h: 3, start: [0, 1, 'E'], samples: [[4, 1]], rocks: [[2, 0]], blocks: ['forward', 'left', 'right', 'repeat', 'pick'], max: 6, program: [{ repeat: 3, do: ['forward'] }, 'pick'], hint: 'Count the squares to the sample: how many times should the rover go forward?' }
      ]
    },
    quiz: [
      { q: 'What is a program?', choices: ['Steps in order', 'A kind of rock', 'A space snack'], answer: 0, hint: 'You built one.', explain: 'A program is a list of steps, in order.' },
      { q: 'What is a bug in a program?', choices: ['A mistake', 'A beetle', 'A big rock'], answer: 0, hint: 'You fixed one!', explain: 'A bug is a mistake in a program.' },
      { q: 'What does a repeat block do?', choices: ['Does the steps inside again', 'Stops the rover', 'Turns it around'], answer: 0, hint: '×4 means four times.', explain: 'A repeat runs the blocks inside it again and again.' }
    ]
  }),

  rhythm: lesson('music1-castle-demo-rhythm', 'music', 'castle', 'rhythm', {
    title: 'Bells and Drums',
    topic: 'rhythm',
    topicName: 'Rhythm and notes',
    blurb: 'Tap a rhythm, fill a bar, match the bells.',
    reading: [
      card('Rhythm', 'A rhythm is a pattern of long and short sounds. Clap it, tap it, drum it!', '🥁'),
      card('Note lengths', 'A whole note lasts 4 beats, a half note 2 beats and a quarter note 1 beat.', '🎵')
    ],
    rhythm: {
      q: 'Play along with the castle bells and drums!',
      tempo: 90,
      rounds: [
        { mode: 'echo', pattern: [1, 1, 2], sound: 'drum' },
        { mode: 'notes', q: 'Two quarter notes, then what?', pattern: [1, 1, 0], choices: [4, 2, 1], hint: 'Two beats are used. How many are left?', explain: 'A half note lasts 2 beats: 1 + 1 + 2 = 4.' },
        { mode: 'match', q: 'Which coloured bell rang?', pairs: [{ label: 'Red', emoji: '🔴', note: 'C5', color: '#ef476f' }, { label: 'Yellow', emoji: '🟡', note: 'E5', color: '#ffd166' }, { label: 'Blue', emoji: '🔵', note: 'G5', color: '#118ab2' }], turns: 3 }
      ]
    },
    quiz: [
      { q: 'How many beats does a half note last?', choices: ['2', '4', '1'], answer: 0, hint: 'Half of a whole note.', explain: 'A half note lasts 2 beats.' },
      { q: 'How many beats fit in this bar?', choices: ['4', '3', '8'], answer: 0, hint: 'Count 1, 2, 3, 4.', explain: 'Our bars hold 4 beats.' },
      { q: 'What is a rhythm?', choices: ['A pattern of sounds', 'A kind of bell', 'A colour'], answer: 0, hint: 'You tapped one.', explain: 'A rhythm is a pattern of long and short sounds.' }
    ]
  })
};

/* ---------------------------------------------------------------- translations (lesson overlays) */

const q3 = (a, b, c) => [a, b, c];
const Q = (q, choices, hint, explain) => ({ q, choices, hint, explain });

export const DEMO_OVERLAYS = {
  ko: {
    'biology1-forest-demo-sort': {
      title: '동물 가족', topicName: '동물의 무리', blurb: '포유류, 새, 물고기: 누가 어디에 들어갈까요?',
      reading: [{ title: '포유류', text: '포유류는 털이 있고, 공기로 숨 쉬고, 새끼에게 젖을 먹여요. 곰, 토끼, 그리고 돌고래도 포유류예요!' }, { title: '새와 물고기', text: '새는 깃털이 있고 알을 낳아요. 물고기는 물속에 살고, 아가미로 숨 쉬고, 지느러미가 있어요.' }],
      sort: {
        q: '리빗을 도와 동물들을 가족별로 나눠요!',
        groups: [{ label: '포유류' }, { label: '새' }, { label: '물고기' }],
        items: [{ label: '곰' }, { label: '부엉이' }, { label: '상어' }, { label: '토끼' }, { label: '펭귄', hint: '펭귄은 날지 못하지만 깃털이 있어요.' }, { label: '흰동가리' }, { label: '돌고래', hint: '돌고래는 공기로 숨 쉬고 새끼에게 젖을 먹여요.' }, { label: '오리' }],
        rule: { q: '이 동물들은 어떻게 나눴을까요?', choices: ['동물 가족별로', '색깔별로', '크기별로'], hint: '곰, 부엉이, 상어를 봐요: 털, 깃털, 지느러미.', explain: '포유류, 새, 물고기는 세 가지 동물 가족이에요.' }
      },
      quiz: q3(Q('포유류인 동물은 누구일까요?', ['돌고래', '상어', '오리'], '새끼에게 젖을 먹이는 동물은?', '돌고래는 포유류예요. 공기로 숨 쉬고 새끼에게 젖을 먹여요.'), Q('모든 새에게 있는 것은?', ['깃털', '털', '아가미'], '펭귄과 부엉이를 떠올려 봐요.', '날지 못하는 새도 모두 깃털이 있어요.'), Q('물고기는 어떻게 숨 쉴까요?', ['아가미로', '허파로', '꼬리로'], '물속에서 공기를 얻어요.', '물고기는 아가미로 물속의 공기를 얻어요.'))
    },
    'geography1-sea-demo-oceans': {
      title: '바다와 대륙', topicName: '세계 지도', blurb: '지도에서 큰 바다와 대륙을 찾아요.',
      reading: [{ title: '일곱 대륙', text: '지구의 땅은 대륙이라는 일곱 개의 큰 덩어리로 나뉘어요. 아프리카와 아시아처럼요.' }, { title: '다섯 바다', text: '지구는 대부분 물로 덮여 있어요. 가장 큰 바다는 태평양이에요.' }],
      maphunt: { q: '잉카를 도와 세계 지도에서 이곳들을 찾아요!', clues: [{ q: '가장 큰 바다, 태평양은 어디에 있을까요?', hint: '지도 양쪽 끝에 있어요. 아시아와 아메리카 사이예요.' }, { q: '사하라 사막이 있는 대륙, 아프리카를 눌러요.', hint: '유럽 아래, 지도 한가운데에 있어요.' }, { q: '남극에 있는 얼음 땅, 남극 대륙은 어디일까요?', hint: '지도 맨 아래를 봐요.' }] },
      quiz: q3(Q('가장 큰 바다는?', ['태평양', '대서양', '북극해'], '맨 처음에 찾았어요.', '태평양은 지구에서 가장 큰 바다예요.'), Q('대륙은 몇 개일까요?', ['일곱 개', '세 개', '열 개'], '큰 땅덩어리를 세어 봐요.', '대륙은 일곱 개예요.'), Q('남극 대륙은 어디에 있을까요?', ['남극에', '북극에', '한가운데에'], '아주 춥고 지도 맨 아래에 있어요.', '남극 대륙은 남극에 있는 얼음 대륙이에요.'))
    },
    'archaeology1-desert-demo-dig': {
      title: '나일 강가의 야영지', topicName: '옛날을 파내요', blurb: '모래를 털고, 옛 물건을 찾고, 암호를 풀어요.',
      reading: [{ title: '고고학자', text: '고고학자는 작은 붓으로 아주 조심조심 파요. 그래야 옛 물건이 깨지지 않아요.' }, { title: '옛날 글자', text: '옛날 이집트 사람들은 작은 그림으로 글을 썼어요. 그림 하나가 소리 하나를 나타내기도 했어요.' }],
      dig: { q: '나일 강가의 옛 야영지를 파 봐요!', finds: [{ label: '흙으로 만든 항아리', text: '사람들은 이런 항아리에 물, 기름, 곡식을 담았어요.', question: { q: '이 항아리에는 무엇을 담았을까요?', choices: ['물', '전기', '텔레비전'], hint: '옛날에는 기계가 없었어요.', explain: '흙 항아리에는 물, 기름, 곡식을 담았어요.' } }, { label: '글자를 새긴 돌', text: '누가 그림 글자로 비밀 메시지를 새겨 놓았어요!', decode: { q: '돌에 뭐라고 쓰여 있을까요?', message: '나일', explain: '나일강은 이집트에 물을 준 긴 강이에요.' } }] },
      quiz: q3(Q('고고학자는 무엇으로 살살 팔까요?', ['작은 붓', '불도저', '망치'], '살살 해야 해요!', '부드러운 붓은 옛 물건을 깨뜨리지 않고 모래를 털어요.'), Q('야영지 옆의 강 이름은?', ['나일강', '아마존강', '템스강'], '암호를 풀었잖아요!', '돌에는 나일이라고 쓰여 있었어요. 이집트의 강이에요.'), Q('흙 항아리에 무엇을 담았을까요?', ['물과 곡식', '장난감과 게임', '책'], '먹거나 마시는 것이에요.', '항아리에는 물, 기름, 곡식을 담았어요.'))
    },
    'rockets1-moon-demo-launch': {
      title: '발사 준비', topicName: '로켓 발사', blurb: '연료를 채우고, 거꾸로 세고, 달로 날아가요.',
      reading: [{ title: '연료', text: '로켓은 땅에서 점점 더 빨리 멀어지려면 연료가 아주 많이 필요해요.' }, { title: '카운트다운', text: '발사 전에는 모두 함께 거꾸로 세요. 5, 4, 3, 2, 1… 발사!' }],
      countdown: { q: '로켓에 연료를 채우고 달로 날아가요!', steps: [{ q: '5부터 거꾸로 세어 봐요!', hint: '가장 큰 수부터 시작해요.' }, { q: '로켓을 다시 아래로 끌어당기는 것은?', choices: ['중력', '바람', '자석'], hint: '공을 떨어지게 하는 것도 이거예요.', explain: '중력은 모든 것을 지구 쪽으로 끌어당겨요.' }, { q: '우주 비행사를 순서대로 준비시켜요!', order: ['우주복 입기', '로켓에 타기', '안전벨트 매기'], hint: '우주복 없이는 탈 수 없어요!' }] },
      quiz: q3(Q('로켓이 올라가려면 무엇이 필요할까요?', ['연료', '돛', '페달'], '연료 탱크를 채웠어요.', '로켓은 연료를 태워서 위로 올라가요.'), Q('카운트다운에서 3 다음은?', ['2', '4', '5'], '거꾸로 세어 봐요.', '5, 4, 3, 2, 1: 3 다음은 2예요.'), Q('로켓은 어디로 날아갔나요?', ['달로', '바닷속으로', '가게로'], '밤에 하늘을 봐요!', '로켓은 달로 날아갔어요.'))
    },
    'coding1-mars-demo-rover': {
      title: '로버를 움직여요', topicName: '첫 프로그램', blurb: '블록이 프로그램이 되고, 로버가 따라 해요.',
      reading: [{ title: '프로그램', text: '프로그램은 로봇이 하나씩 차례대로 따라 하는 단계들의 목록이에요.' }, { title: '버그', text: '프로그램이 잘못되면 버그가 있는 거예요. 코더는 버그를 찾아서 고쳐요!' }],
      rover: { q: '로버를 샘플 통까지 몰고 가요!', puzzles: [{ hint: '위로 올라가서 바위를 돌아가요.' }, { hint: '샘플까지 칸을 세어 봐요. 몇 번 앞으로 가야 할까요?' }] },
      quiz: q3(Q('프로그램이란 무엇일까요?', ['차례대로 하는 단계', '바위의 한 종류', '우주 간식'], '여러분이 하나 만들었어요.', '프로그램은 차례대로 하는 단계들의 목록이에요.'), Q('프로그램의 버그란?', ['실수', '딱정벌레', '큰 바위'], '하나 고쳤잖아요!', '버그는 프로그램 속 실수예요.'), Q('반복 블록은 무엇을 할까요?', ['안의 단계를 또 해요', '로버를 멈춰요', '로버를 돌려요'], '×4는 네 번이에요.', '반복은 안에 든 블록을 몇 번이고 다시 해요.'))
    },
    'music1-castle-demo-rhythm': {
      title: '종과 북', topicName: '리듬과 음표', blurb: '리듬을 치고, 마디를 채우고, 종을 맞혀요.',
      reading: [{ title: '리듬', text: '리듬은 길고 짧은 소리의 무늬예요. 손뼉 치고, 두드리고, 북을 쳐 봐요!' }, { title: '음표의 길이', text: '온음표는 4박, 2분음표는 2박, 4분음표는 1박 동안 이어져요.' }],
      rhythm: { q: '성의 종과 북에 맞춰 연주해요!', rounds: [{}, { q: '4분음표 두 개 다음에는?', hint: '2박을 썼어요. 몇 박이 남았을까요?', explain: '2분음표는 2박이에요. 1 + 1 + 2 = 4.' }, { q: '어느 색 종이 울렸을까요?', pairs: [{ label: '빨강' }, { label: '노랑' }, { label: '파랑' }] }] },
      quiz: q3(Q('2분음표는 몇 박일까요?', ['2', '4', '1'], '온음표의 절반이에요.', '2분음표는 2박이에요.'), Q('이 마디에는 몇 박이 들어갈까요?', ['4', '3', '8'], '하나, 둘, 셋, 넷 세어 봐요.', '우리 마디에는 4박이 들어가요.'), Q('리듬이란 무엇일까요?', ['소리의 무늬', '종의 한 종류', '색깔'], '하나 쳐 봤어요.', '리듬은 길고 짧은 소리의 무늬예요.'))
    }
  },

  es: {
    'biology1-forest-demo-sort': {
      title: 'Familias de animales', topicName: 'Grupos de animales', blurb: 'Mamíferos, aves y peces: ¿quién va dónde?',
      reading: [{ title: 'Mamíferos', text: 'Los mamíferos tienen pelo, respiran aire y dan leche a sus crías. ¡Los osos, los conejos y hasta los delfines son mamíferos!' }, { title: 'Aves y peces', text: 'Las aves tienen plumas y ponen huevos. Los peces viven en el agua, respiran con branquias y tienen aletas.' }],
      sort: {
        q: '¡Ayuda a Ribbit a clasificar los animales por familias!',
        groups: [{ label: 'Mamíferos' }, { label: 'Aves' }, { label: 'Peces' }],
        items: [{ label: 'Oso' }, { label: 'Búho' }, { label: 'Tiburón' }, { label: 'Conejo' }, { label: 'Pingüino', hint: 'Los pingüinos no vuelan, pero tienen plumas.' }, { label: 'Pez payaso' }, { label: 'Delfín', hint: 'Los delfines respiran aire y dan leche a sus crías.' }, { label: 'Pato' }],
        rule: { q: '¿Cómo se clasificaron estos animales?', choices: ['Por familias de animales', 'Por su color', 'Por su tamaño'], hint: 'Mira el oso, el búho y el tiburón: pelo, plumas, aletas.', explain: 'Mamíferos, aves y peces son tres familias de animales.' }
      },
      quiz: q3(Q('¿Qué animal es un mamífero?', ['Delfín', 'Tiburón', 'Pato'], '¿Cuál da leche a sus crías?', 'Los delfines son mamíferos: respiran aire y dan leche a sus crías.'), Q('¿Qué tienen todas las aves?', ['Plumas', 'Pelo', 'Branquias'], 'Piensa en un pingüino y un búho.', 'Todas las aves tienen plumas, incluso las que no vuelan.'), Q('¿Cómo respiran los peces?', ['Con branquias', 'Con pulmones', 'Por la cola'], 'Sacan el aire del agua.', 'Los peces respiran con branquias que sacan el aire del agua.'))
    },
    'geography1-sea-demo-oceans': {
      title: 'Océanos y continentes', topicName: 'El mapa del mundo', blurb: 'Encuentra los grandes océanos y los continentes en un mapa.',
      reading: [{ title: 'Siete continentes', text: 'La tierra del planeta se divide en siete grandes trozos llamados continentes, como África y Asia.' }, { title: 'Cinco océanos', text: 'Casi toda la Tierra está cubierta de agua. El océano más grande de todos es el Pacífico.' }],
      maphunt: { q: '¡Ayuda a Inka a encontrar estos lugares en el mapa del mundo!', clues: [{ q: '¿Dónde está el océano más grande, el Pacífico?', hint: 'Está a los dos lados del mapa, entre Asia y América.' }, { q: 'Toca África, el continente del desierto del Sahara.', hint: 'Está justo en el centro, debajo de Europa.' }, { q: '¿Dónde está la Antártida, la tierra helada del Polo Sur?', hint: 'Mira abajo del todo en el mapa.' }] },
      quiz: q3(Q('¿Cuál es el océano más grande?', ['Pacífico', 'Atlántico', 'Ártico'], 'Fue el primero que encontraste.', 'El Pacífico es el océano más grande de la Tierra.'), Q('¿Cuántos continentes hay?', ['Siete', 'Tres', 'Diez'], 'Cuenta los grandes trozos de tierra.', 'Hay siete continentes.'), Q('¿Dónde está la Antártida?', ['En el Polo Sur', 'En el Polo Norte', 'En el centro'], 'Hace mucho frío y está abajo del mapa.', 'La Antártida es el continente helado del Polo Sur.'))
    },
    'archaeology1-desert-demo-dig': {
      title: 'El campamento del Nilo', topicName: 'Desenterrar el pasado', blurb: 'Cepilla la arena, encuentra objetos antiguos y descifra un código.',
      reading: [{ title: 'Arqueólogos', text: 'Los arqueólogos excavan con mucho cuidado y con pinceles pequeños, para no romper nada antiguo.' }, { title: 'Escritura antigua', text: 'Hace mucho, en Egipto, se escribía con dibujitos. Cada dibujo podía ser un sonido.' }],
      dig: { q: '¡Desentierra el viejo campamento junto al Nilo!', finds: [{ label: 'Una vasija de barro', text: 'La gente guardaba agua, aceite y grano en vasijas como esta.', question: { q: '¿Qué se podía guardar en esta vasija?', choices: ['Agua', 'Electricidad', 'Televisión'], hint: 'Hace mucho no había máquinas.', explain: 'Las vasijas de barro guardaban agua, aceite o grano.' } }, { label: 'Una piedra tallada', text: '¡Alguien talló un mensaje secreto con dibujos!', decode: { q: '¿Qué dice la piedra?', message: 'NILO', explain: 'El Nilo es el largo río que daba agua a Egipto.' } }] },
      quiz: q3(Q('¿Con qué excava con cuidado un arqueólogo?', ['Un pincel pequeño', 'Una excavadora', 'Un martillo'], '¡Con mucho cuidado!', 'Un pincel suave mueve la arena sin romper nada antiguo.'), Q('¿Cómo se llamaba el río del campamento?', ['El Nilo', 'El Amazonas', 'El Támesis'], '¡Descifraste el código!', 'La piedra decía NILO: el río de Egipto.'), Q('¿Qué se guardaba en las vasijas de barro?', ['Agua y grano', 'Juguetes', 'Libros'], 'Algo para comer o beber.', 'Las vasijas guardaban agua, aceite y grano.'))
    },
    'rockets1-moon-demo-launch': {
      title: 'Listos para despegar', topicName: 'Lanzamientos de cohetes', blurb: 'Llena el depósito, cuenta hacia atrás y vuela a la Luna.',
      reading: [{ title: 'Combustible', text: 'Un cohete necesita muchísimo combustible para subir cada vez más rápido y alejarse del suelo.' }, { title: 'Cuenta atrás', text: 'Antes de despegar, todos cuentan hacia atrás juntos: 5, 4, 3, 2, 1… ¡despegue!' }],
      countdown: { q: '¡Llena el cohete de combustible y vuela a la Luna!', steps: [{ q: '¡Cuenta hacia atrás desde 5!', hint: 'Empieza por el número más grande.' }, { q: '¿Qué tira del cohete hacia abajo?', choices: ['La gravedad', 'El viento', 'Los imanes'], hint: 'También hace caer una pelota.', explain: 'La gravedad atrae todo hacia la Tierra.' }, { q: '¡Prepara al astronauta, en orden!', order: ['Ponerse el traje', 'Subir al cohete', 'Abrocharse el cinturón'], hint: '¡No puedes subir sin el traje!' }] },
      quiz: q3(Q('¿Qué necesita un cohete para subir?', ['Combustible', 'Velas', 'Pedales'], 'Llenaste el depósito.', 'Los cohetes queman combustible para subir.'), Q('¿Qué va después del 3 en una cuenta atrás?', ['2', '4', '5'], 'Cuenta hacia atrás.', '5, 4, 3, 2, 1: después del 3 va el 2.'), Q('¿Adónde voló tu cohete?', ['A la Luna', 'Bajo el mar', 'A la tienda'], '¡Mira al cielo de noche!', 'Tu cohete voló a la Luna.'))
    },
    'coding1-mars-demo-rover': {
      title: 'Conduce el róver', topicName: 'Primeros programas', blurb: 'Los bloques forman un programa; el róver lo sigue.',
      reading: [{ title: 'Un programa', text: 'Un programa es una lista de pasos que un robot sigue, uno a uno y en orden.' }, { title: 'Errores', text: 'Cuando un programa falla, tiene un error. ¡Los programadores lo buscan y lo arreglan!' }],
      rover: { q: '¡Lleva el róver hasta los tubos de muestras!', puzzles: [{ hint: 'Sube y rodea las rocas.' }, { hint: 'Cuenta las casillas hasta la muestra: ¿cuántas veces debe avanzar el róver?' }] },
      quiz: q3(Q('¿Qué es un programa?', ['Pasos en orden', 'Un tipo de roca', 'Un aperitivo espacial'], 'Tú hiciste uno.', 'Un programa es una lista de pasos en orden.'), Q('¿Qué es un error en un programa?', ['Una equivocación', 'Un escarabajo', 'Una roca grande'], '¡Arreglaste uno!', 'Un error es una equivocación en un programa.'), Q('¿Qué hace un bloque Repetir?', ['Repite los pasos de dentro', 'Para el róver', 'Le da la vuelta'], '×4 quiere decir cuatro veces.', 'Repetir hace los bloques de dentro una y otra vez.'))
    },
    'music1-castle-demo-rhythm': {
      title: 'Campanas y tambores', topicName: 'Ritmo y notas', blurb: 'Toca un ritmo, completa un compás y adivina las campanas.',
      reading: [{ title: 'Ritmo', text: 'Un ritmo es un dibujo de sonidos largos y cortos. ¡Palméalo, tócalo, hazlo sonar en un tambor!' }, { title: 'Duración de las notas', text: 'Una redonda dura 4 tiempos, una blanca 2 tiempos y una negra 1 tiempo.' }],
      rhythm: { q: '¡Toca con las campanas y los tambores del castillo!', rounds: [{}, { q: 'Dos negras y luego… ¿qué?', hint: 'Ya se usaron dos tiempos. ¿Cuántos quedan?', explain: 'Una blanca dura 2 tiempos: 1 + 1 + 2 = 4.' }, { q: '¿Qué campana de color sonó?', pairs: [{ label: 'Rojo' }, { label: 'Amarillo' }, { label: 'Azul' }] }] },
      quiz: q3(Q('¿Cuántos tiempos dura una blanca?', ['2', '4', '1'], 'La mitad de una redonda.', 'Una blanca dura 2 tiempos.'), Q('¿Cuántos tiempos caben en este compás?', ['4', '3', '8'], 'Cuenta 1, 2, 3, 4.', 'Nuestros compases tienen 4 tiempos.'), Q('¿Qué es un ritmo?', ['Un dibujo de sonidos', 'Un tipo de campana', 'Un color'], 'Tocaste uno.', 'Un ritmo es un dibujo de sonidos largos y cortos.'))
    }
  },

  ja: {
    'biology1-forest-demo-sort': {
      title: '動物のなかま', topicName: '動物のグループ', blurb: 'ほにゅうるい、とり、さかな：どこに入るかな？',
      reading: [{ title: 'ほにゅうるい', text: 'ほにゅうるいは毛があって、空気で息をして、赤ちゃんにおちちをあげるよ。クマやウサギ、イルカもほにゅうるい！' }, { title: 'とりとさかな', text: 'とりには羽があって、たまごをうむよ。さかなは水の中にすんで、えらで息をして、ひれがあるよ。' }],
      sort: {
        q: 'リビットといっしょに、動物をなかまに分けよう！',
        groups: [{ label: 'ほにゅうるい' }, { label: 'とり' }, { label: 'さかな' }],
        items: [{ label: 'クマ' }, { label: 'フクロウ' }, { label: 'サメ' }, { label: 'ウサギ' }, { label: 'ペンギン', hint: 'ペンギンはとべないけど、羽があるよ。' }, { label: 'クマノミ' }, { label: 'イルカ', hint: 'イルカは空気で息をして、赤ちゃんにおちちをあげるよ。' }, { label: 'アヒル' }],
        rule: { q: 'この動物たちは、どうやって分けたのかな？', choices: ['動物のなかまで', '色で', '大きさで'], hint: 'クマ、フクロウ、サメを見て：毛、羽、ひれ。', explain: 'ほにゅうるい、とり、さかなは3つの動物のなかまだよ。' }
      },
      quiz: q3(Q('ほにゅうるいはどれ？', ['イルカ', 'サメ', 'アヒル'], '赤ちゃんにおちちをあげるのは？', 'イルカはほにゅうるい。空気で息をして、赤ちゃんにおちちをあげるよ。'), Q('とりにはみんな、なにがある？', ['羽', '毛', 'えら'], 'ペンギンとフクロウを思いうかべてね。', 'とべないとりにも、みんな羽があるよ。'), Q('さかなはどうやって息をする？', ['えらで', 'はいで', 'しっぽで'], '水の中から空気をとるよ。', 'さかなはえらで水の中の空気をとるよ。'))
    },
    'geography1-sea-demo-oceans': {
      title: '海と大陸', topicName: '世界地図', blurb: '地図で大きな海と大陸を見つけよう。',
      reading: [{ title: '7つの大陸', text: '地球の陸は、大陸という7つの大きなかたまりに分かれているよ。アフリカやアジアみたいにね。' }, { title: '5つの海', text: '地球はほとんど水でおおわれているよ。いちばん大きな海は太平洋だよ。' }],
      maphunt: { q: 'インカといっしょに、世界地図でこの場所をさがそう！', clues: [{ q: 'いちばん大きな海、太平洋はどこ？', hint: '地図のりょうはしにあるよ。アジアとアメリカのあいだ。' }, { q: 'サハラさばくがある大陸、アフリカをタップしてね。', hint: 'ヨーロッパの下、まんなかにあるよ。' }, { q: '南極にあるこおりの大地、南極大陸はどこ？', hint: '地図のいちばん下を見てね。' }] },
      quiz: q3(Q('いちばん大きな海は？', ['太平洋', '大西洋', '北極海'], 'さいしょに見つけたよ。', '太平洋は地球でいちばん大きな海だよ。'), Q('大陸はいくつある？', ['7つ', '3つ', '10'], '大きな陸のかたまりをかぞえてね。', '大陸は7つあるよ。'), Q('南極大陸はどこにある？', ['南極', '北極', 'まんなか'], 'とてもさむくて、地図のいちばん下だよ。', '南極大陸は南極にあるこおりの大陸だよ。'))
    },
    'archaeology1-desert-demo-dig': {
      title: 'ナイル川のキャンプ', topicName: 'むかしをほり出す', blurb: 'すなをはらって、むかしのものを見つけて、あんごうをとこう。',
      reading: [{ title: '考古学者', text: '考古学者は小さなブラシで、とてもていねいにほるよ。むかしのものがこわれないようにね。' }, { title: 'むかしの文字', text: 'むかしのエジプトでは、小さな絵で文字を書いたよ。絵ひとつが音ひとつのこともあったんだ。' }],
      dig: { q: 'ナイル川のそばの、むかしのキャンプをほり出そう！', finds: [{ label: 'ねんどのつぼ', text: 'こういうつぼに、水やあぶらや、こくもつを入れていたよ。', question: { q: 'このつぼには、なにを入れたかな？', choices: ['水', '電気', 'テレビ'], hint: 'むかしは機械がなかったよ。', explain: 'ねんどのつぼには、水やあぶらやこくもつを入れたよ。' } }, { label: 'もようをほった石', text: 'だれかが絵文字でひみつのメッセージをほったよ！', decode: { q: '石にはなんて書いてある？', message: 'ナイル', explain: 'ナイル川は、エジプトに水をくれた長い川だよ。' } }] },
      quiz: q3(Q('考古学者はなにでそっとほる？', ['小さなブラシ', 'ブルドーザー', 'ハンマー'], 'そっとね！', 'やわらかいブラシなら、むかしのものをこわさずにすなをどけられるよ。'), Q('キャンプのそばの川の名前は？', ['ナイル川', 'アマゾン川', 'テムズ川'], 'あんごうをといたね！', '石には「ナイル」と書いてあったよ。エジプトの川だね。'), Q('ねんどのつぼには、なにを入れた？', ['水とこくもつ', 'おもちゃ', '本'], '食べたりのんだりするものだよ。', 'つぼには水やあぶらやこくもつを入れたよ。'))
    },
    'rockets1-moon-demo-launch': {
      title: '発射じゅんび', topicName: 'ロケットの発射', blurb: '燃料を入れて、カウントダウンして、月へとぼう。',
      reading: [{ title: '燃料', text: 'ロケットが地面からどんどんはやくはなれるには、燃料がたくさんひつようだよ。' }, { title: 'カウントダウン', text: '発射のまえは、みんなでいっしょにかぞえるよ。5、4、3、2、1…発射！' }],
      countdown: { q: 'ロケットに燃料を入れて、月へとぼう！', steps: [{ q: '5からぎゃくにかぞえよう！', hint: 'いちばん大きい数からはじめてね。' }, { q: 'ロケットを下にひっぱるのはなに？', choices: ['重力', '風', 'じしゃく'], hint: 'ボールが落ちるのもこれのせい。', explain: '重力は、すべてのものを地球のほうへひっぱるよ。' }, { q: 'うちゅう飛行士のじゅんびを、じゅんばんにしよう！', order: ['うちゅう服を着る', 'ロケットにのる', 'ベルトをしめる'], hint: 'うちゅう服がないとのれないよ！' }] },
      quiz: q3(Q('ロケットがのぼるには、なにがいる？', ['燃料', '帆', 'ペダル'], 'タンクをいっぱいにしたね。', 'ロケットは燃料をもやして、上へすすむよ。'), Q('カウントダウンで3のつぎは？', ['2', '4', '5'], 'ぎゃくにかぞえてね。', '5、4、3、2、1：3のつぎは2だよ。'), Q('ロケットはどこへとんだ？', ['月', '海の中', 'お店'], '夜の空を見て！', 'ロケットは月へとんでいったよ。'))
    },
    'coding1-mars-demo-rover': {
      title: 'ローバーをうごかそう', topicName: 'はじめてのプログラム', blurb: 'ブロックでプログラムを作ると、ローバーがそのとおりにうごくよ。',
      reading: [{ title: 'プログラム', text: 'プログラムは、ロボットがひとつずつじゅんばんにすすむ手じゅんのリストだよ。' }, { title: 'バグ', text: 'プログラムがうまくいかないときは、バグがあるんだ。プログラマーはバグを見つけてなおすよ！' }],
      rover: { q: 'ローバーをサンプルのつつまでうんてんしよう！', puzzles: [{ hint: '上にすすんで、岩をよけてまわろう。' }, { hint: 'サンプルまでのマスをかぞえてね。なん回まえにすすめばいいかな？' }] },
      quiz: q3(Q('プログラムってなに？', ['じゅんばんの手じゅん', '岩のしゅるい', 'うちゅうのおやつ'], 'きみもひとつ作ったよ。', 'プログラムは、じゅんばんにならんだ手じゅんのリストだよ。'), Q('プログラムのバグってなに？', ['まちがい', 'カブトムシ', '大きな岩'], 'ひとつなおしたね！', 'バグはプログラムの中のまちがいだよ。'), Q('くりかえしブロックはなにをする？', ['中の手じゅんをまたやる', 'ローバーを止める', 'ローバーをまわす'], '×4は4回ってこと。', 'くりかえしは、中のブロックをなんどもやるよ。'))
    },
    'music1-castle-demo-rhythm': {
      title: 'かねとたいこ', topicName: 'リズムと音ぷ', blurb: 'リズムをたたいて、小節をうめて、かねをあてよう。',
      reading: [{ title: 'リズム', text: 'リズムは、長い音とみじかい音のもようだよ。手をたたいて、たいこでたたいてみよう！' }, { title: '音ぷの長さ', text: '全音ぷは4拍、2分音ぷは2拍、4分音ぷは1拍のばすよ。' }],
      rhythm: { q: 'お城のかねとたいこに合わせて、えんそうしよう！', rounds: [{}, { q: '4分音ぷが2つ、そのつぎは？', hint: '2拍つかったよ。のこりはなん拍？', explain: '2分音ぷは2拍。1 + 1 + 2 = 4。' }, { q: 'どの色のかねがなったかな？', pairs: [{ label: 'あか' }, { label: 'きいろ' }, { label: 'あお' }] }] },
      quiz: q3(Q('2分音ぷはなん拍？', ['2', '4', '1'], '全音ぷのはんぶんだよ。', '2分音ぷは2拍だよ。'), Q('この小節にはなん拍入る？', ['4', '3', '8'], '1、2、3、4とかぞえてね。', 'この小節には4拍入るよ。'), Q('リズムってなに？', ['音のもよう', 'かねのしゅるい', '色'], 'きみもたたいたね。', 'リズムは、長い音とみじかい音のもようだよ。'))
    }
  },

  zh: {
    'biology1-forest-demo-sort': {
      title: '动物大家族', topicName: '动物的分类', blurb: '哺乳动物、鸟和鱼：谁该放在哪里？',
      reading: [{ title: '哺乳动物', text: '哺乳动物身上有毛，用肺呼吸空气，还喂宝宝喝奶。熊、兔子，连海豚都是哺乳动物！' }, { title: '鸟和鱼', text: '鸟有羽毛，会下蛋。鱼生活在水里，用鳃呼吸，还有鳍。' }],
      sort: {
        q: '帮瑞比把动物按家族分一分！',
        groups: [{ label: '哺乳动物' }, { label: '鸟' }, { label: '鱼' }],
        items: [{ label: '熊' }, { label: '猫头鹰' }, { label: '鲨鱼' }, { label: '兔子' }, { label: '企鹅', hint: '企鹅不会飞，但它有羽毛。' }, { label: '小丑鱼' }, { label: '海豚', hint: '海豚呼吸空气，还喂宝宝喝奶。' }, { label: '鸭子' }],
        rule: { q: '这些动物是怎么分的？', choices: ['按动物家族分', '按颜色分', '按大小分'], hint: '看看熊、猫头鹰和鲨鱼：毛、羽毛、鳍。', explain: '哺乳动物、鸟和鱼是三个动物家族。' }
      },
      quiz: q3(Q('哪种动物是哺乳动物？', ['海豚', '鲨鱼', '鸭子'], '哪一个喂宝宝喝奶？', '海豚是哺乳动物：它们呼吸空气，喂宝宝喝奶。'), Q('所有的鸟都有什么？', ['羽毛', '毛发', '鳃'], '想想企鹅和猫头鹰。', '每种鸟都有羽毛，连不会飞的鸟也有。'), Q('鱼怎么呼吸？', ['用鳃', '用肺', '用尾巴'], '它们从水里取得空气。', '鱼用鳃从水里取得空气。'))
    },
    'geography1-sea-demo-oceans': {
      title: '大洋和大洲', topicName: '世界地图', blurb: '在地图上找到大洋和大洲。',
      reading: [{ title: '七大洲', text: '地球上的陆地分成七大块，叫作大洲，比如非洲和亚洲。' }, { title: '五大洋', text: '地球的大部分都被水覆盖着。最大的大洋是太平洋。' }],
      maphunt: { q: '帮印卡在世界地图上找到这些地方！', clues: [{ q: '最大的大洋——太平洋在哪里？', hint: '它在地图的两边，在亚洲和美洲之间。' }, { q: '点一下非洲，那里有撒哈拉沙漠。', hint: '它就在正中间，在欧洲的下面。' }, { q: '南极洲——南极的冰雪大地在哪里？', hint: '看看地图的最下面。' }] },
      quiz: q3(Q('最大的大洋是哪个？', ['太平洋', '大西洋', '北冰洋'], '你第一个找到的。', '太平洋是地球上最大的大洋。'), Q('一共有几个大洲？', ['七个', '三个', '十个'], '数一数大块的陆地。', '一共有七个大洲。'), Q('南极洲在哪里？', ['在南极', '在北极', '在正中间'], '那里很冷，在地图最下面。', '南极洲是南极的冰雪大洲。'))
    },
    'archaeology1-desert-demo-dig': {
      title: '尼罗河边的营地', topicName: '挖掘过去', blurb: '刷开沙子，找到古物，破解密码。',
      reading: [{ title: '考古学家', text: '考古学家用小刷子非常小心地挖，这样古老的东西就不会被弄坏。' }, { title: '古老的文字', text: '很久以前，埃及人用小图画来写字。一个图画可以代表一个读音。' }],
      dig: { q: '把尼罗河边的古老营地挖出来吧！', finds: [{ label: '一个陶罐', text: '人们用这样的罐子装水、油和粮食。', question: { q: '这个罐子能装什么？', choices: ['水', '电', '电视'], hint: '很久以前没有机器。', explain: '陶罐用来装水、油或粮食。' } }, { label: '一块刻字的石头', text: '有人用图画文字刻了一条秘密信息！', decode: { q: '石头上写着什么？', message: '尼罗河', explain: '尼罗河是一条长长的河，给埃及带来了水。' } }] },
      quiz: q3(Q('考古学家用什么轻轻地挖？', ['小刷子', '推土机', '锤子'], '要轻轻的！', '软软的刷子能刷开沙子，又不会弄坏古物。'), Q('营地旁边的河叫什么？', ['尼罗河', '亚马孙河', '泰晤士河'], '你破解了密码！', '石头上写着“尼罗河”，那是埃及的河。'), Q('人们在陶罐里装什么？', ['水和粮食', '玩具', '书'], '能吃或能喝的东西。', '陶罐装水、油和粮食。'))
    },
    'rockets1-moon-demo-launch': {
      title: '准备发射', topicName: '火箭发射', blurb: '加满燃料，倒数，飞向月球。',
      reading: [{ title: '燃料', text: '火箭需要很多很多燃料，才能越飞越快，离开地面。' }, { title: '倒数', text: '发射前，大家一起倒数：5、4、3、2、1……发射！' }],
      countdown: { q: '给火箭加满燃料，飞向月球！', steps: [{ q: '从5开始倒着数！', hint: '从最大的数开始。' }, { q: '是什么把火箭往下拉？', choices: ['重力', '风', '磁铁'], hint: '球会掉下来也是因为它。', explain: '重力把所有东西都拉向地球。' }, { q: '按顺序帮宇航员做好准备！', order: ['穿上宇航服', '爬进火箭', '系好安全带'], hint: '没穿宇航服可不能进去！' }] },
      quiz: q3(Q('火箭往上飞需要什么？', ['燃料', '船帆', '脚踏板'], '你把油箱加满了。', '火箭燃烧燃料把自己推上去。'), Q('倒数时3后面是几？', ['2', '4', '5'], '倒着数。', '5、4、3、2、1：3后面是2。'), Q('你的火箭飞去了哪里？', ['月球', '海底', '商店'], '晚上抬头看看！', '你的火箭飞向了月球。'))
    },
    'coding1-mars-demo-rover': {
      title: '驾驶火星车', topicName: '第一个程序', blurb: '积木组成程序，火星车照着做。',
      reading: [{ title: '程序', text: '程序是一张步骤清单，机器人一步一步按顺序去做。' }, { title: '错误', text: '程序出了问题，就是有了错误（也叫“虫子”）。程序员会找到错误，再把它修好！' }],
      rover: { q: '把火星车开到样本管那里！', puzzles: [{ hint: '往上走，绕过石头。' }, { hint: '数一数到样本有几格：火星车要前进几次？' }] },
      quiz: q3(Q('什么是程序？', ['按顺序的步骤', '一种石头', '一种太空零食'], '你做了一个。', '程序是一张按顺序排好的步骤清单。'), Q('程序里的“虫子”是什么？', ['一个错误', '一只甲虫', '一块大石头'], '你修好了一个！', '“虫子”就是程序里的错误。'), Q('重复积木有什么用？', ['把里面的步骤再做一遍', '让火星车停下', '让它掉头'], '×4就是四次。', '重复积木会把里面的积木做一遍又一遍。'))
    },
    'music1-castle-demo-rhythm': {
      title: '铃铛和鼓', topicName: '节奏和音符', blurb: '敲一段节奏，填满一小节，猜猜是哪个铃。',
      reading: [{ title: '节奏', text: '节奏是长音和短音组成的图案。拍一拍，敲一敲，打打鼓吧！' }, { title: '音符的长短', text: '全音符持续4拍，二分音符2拍，四分音符1拍。' }],
      rhythm: { q: '跟着城堡的铃铛和鼓一起演奏吧！', rounds: [{}, { q: '两个四分音符，然后是什么？', hint: '已经用了两拍。还剩几拍？', explain: '二分音符是2拍：1 + 1 + 2 = 4。' }, { q: '哪个颜色的铃响了？', pairs: [{ label: '红色' }, { label: '黄色' }, { label: '蓝色' }] }] },
      quiz: q3(Q('二分音符有几拍？', ['2', '4', '1'], '是全音符的一半。', '二分音符有2拍。'), Q('这一小节能放几拍？', ['4', '3', '8'], '数一数：1、2、3、4。', '我们的小节有4拍。'), Q('什么是节奏？', ['声音的图案', '一种铃铛', '一种颜色'], '你敲过一个。', '节奏是长音和短音组成的图案。'))
    }
  }
};
