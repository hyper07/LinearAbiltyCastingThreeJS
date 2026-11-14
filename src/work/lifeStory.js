/**
 * Work Life's "Life" side: who is in it, what you can do with a part of a
 * day, and the scenes that happen. Pure data, read by the rules (life.js)
 * on the server and by the browser, which draws it.
 *
 * Everything here is made up — the people, the places, the stories — and
 * meant to feel like an ordinary working life: deadlines, flatmates, a
 * mother who calls, someone you keep seeing at the café. In text, {company},
 * {role} and {title} are the job you have (your Work Life job if you have
 * one), and {name} is you.
 */

export const PEOPLE = {
  mina: { name: 'Mina', role: 'your teammate', look: { hair: '#2b2b38', skin: '#f2c9a5', top: '#ff7a59', style: 'bob' } },
  dev: { name: 'Dev', role: 'a senior on the team', look: { hair: '#3a2a1a', skin: '#b98a63', top: '#38b6ff', style: 'short' } },
  alvarez: { name: 'Ms. Alvarez', role: 'your manager', look: { hair: '#6a4a3a', skin: '#e0b08a', top: '#8b5cf6', style: 'bun' } },
  jun: { name: 'Jun', role: 'your flatmate', look: { hair: '#1f3a5a', skin: '#f0d0b0', top: '#2fd3a0', style: 'messy' } },
  mum: { name: 'Mum', role: 'family', look: { hair: '#8a8a94', skin: '#eac4a0', top: '#ffc93c', style: 'bun' } },
  sora: { name: 'Sora', role: 'someone at the café', look: { hair: '#7a3a2a', skin: '#f4d2b4', top: '#ff5da2', style: 'long' } }
};

/** How close you are, in words. */
export const TIERS = [[0, 'A stranger'], [15, 'An acquaintance'], [35, 'A friend'], [60, 'A close friend'], [85, 'Someone who has your back']];

/**
 * What you can do with one part of a day. `when`: 'work' (weekday morning
 * or afternoon), 'free' (evenings and weekends), or both. `fx` is what it
 * does; gains shrink when you are worn out (see life.js).
 */
export const ACTIVITIES = [
  { id: 'focus', name: 'Deep work', icon: '💻', when: 'work', scene: 'office', text: 'Head down on the hard thing.', fx: { skill: 4, money: 14, energy: -22, mood: -4 } },
  { id: 'steady', name: 'A steady day', icon: '🗂', when: 'work', scene: 'office', text: 'Do the job well, leave on time.', fx: { skill: 2, money: 12, energy: -14 } },
  { id: 'help', name: 'Help a teammate', icon: '🤝', when: 'work', scene: 'office', text: 'Their problem first, yours after.', fx: { skill: 1, social: 3, money: 9, energy: -16, mood: 3, people: { mina: 3 } } },
  { id: 'learn', name: 'Learn on the job', icon: '📚', when: 'work', scene: 'office', text: 'Ask Dev to walk you through it.', fx: { skill: 5, money: 8, energy: -15, people: { dev: 2 } } },
  { id: 'coast', name: 'Take it easy', icon: '☕', when: 'work', scene: 'office', text: 'Long coffee, short to-do list.', fx: { money: 8, energy: -5, mood: 5, people: { alvarez: -1 } } },
  { id: 'rest', name: 'Rest at home', icon: '🛋', when: 'free', scene: 'home', text: 'Nothing, on purpose.', fx: { energy: 22, mood: 5 } },
  { id: 'exercise', name: 'Exercise', icon: '🏃', when: 'free', scene: 'park', text: 'A run round the park.', fx: { health: 6, energy: -12, mood: 6 } },
  { id: 'study', name: 'Study', icon: '📝', when: 'free', scene: 'home', text: 'An hour of the course you bought.', fx: { skill: 5, energy: -14, mood: -2 } },
  { id: 'friends', name: 'See friends', icon: '🍜', when: 'free', scene: 'street', text: 'Noodles and too much talking.', cost: 18, fx: { social: 6, mood: 10, energy: -8, people: { jun: 3 } } },
  { id: 'cafe', name: 'An hour at the café', icon: '🥐', when: 'free', scene: 'cafe', text: 'The corner table, a book.', cost: 8, fx: { mood: 7, energy: 4, people: { sora: 2 } } },
  { id: 'family', name: 'Call home', icon: '📞', when: 'free', scene: 'home', text: 'Mum picks up on the second ring.', fx: { mood: 6, social: 2, people: { mum: 5 } } },
  { id: 'chores', name: 'Chores and errands', icon: '🧺', when: 'free', scene: 'home', text: 'Laundry, groceries, the bin.', fx: { health: 2, mood: 2, energy: -8, people: { jun: 2 } } },
  { id: 'project', name: 'Side project', icon: '🛠', when: 'free', scene: 'home', text: 'The idea you keep not starting.', fx: { skill: 4, mood: 3, energy: -16 } },
  { id: 'overtime', name: 'Overtime', icon: '🌙', when: 'free', scene: 'office', text: 'Back to the desk after dinner.', weekday: true, fx: { skill: 2, money: 16, energy: -24, mood: -8, health: -2, people: { alvarez: 2 } } }
];

/** A season's end: the first whose `when` holds is how the season is remembered. */
export const ENDINGS = [
  { id: 'burnout', title: 'Running on Empty', when: (s) => s.stats.energy < 25 || s.stats.health < 25, text: 'You got a lot done, and it cost more than it paid. Your body kept the receipts. Next season starts with a promise to yourself.' },
  { id: 'star', title: 'The Rising Star', when: (s) => s.stats.skill >= 70 && (s.people.alvarez ?? 0) >= 45, text: 'People stopped explaining things to you and started asking. Ms. Alvarez says your name in rooms you are not in.' },
  { id: 'heart', title: 'The One Everyone Calls', when: (s) => s.stats.social >= 65 && Object.values(s.people).filter((v) => v >= 50).length >= 3, text: 'When something good happens, three people text you first. When something bad happens, the same three.' },
  { id: 'steady', title: 'A Life in Balance', when: (s) => ['energy', 'mood', 'health'].every((k) => s.stats[k] >= 55) && s.stats.skill >= 40, text: 'Nothing spectacular, nothing on fire. You slept, you learned, you laughed. It is harder than it looks.' },
  { id: 'craft', title: 'The Quiet Expert', when: (s) => s.stats.skill >= 60, text: 'You know your work better than almost anyone, and almost nobody knows you. Both of those are choices.' },
  { id: 'drift', title: 'Just Getting By', when: () => true, text: 'The weeks went past like bus stops. Nothing went wrong. Next season, pick one thing and lean on it.' }
];

const p = (who, text, mood = 'neutral') => ({ who, text, mood });

/**
 * Scenes. `when` says when one may happen: `day` (earliest), `weekday`
 * ('work' or 'weekend'), `slot` (0 morning, 1 afternoon, 2 evening), `flag`
 * and `not` (things that did or did not happen), `aff` (how close you are),
 * `stat` ([least, most]). Each is seen once unless `again`. A choice may
 * `need` something of you; without it, its `no` happens instead of its `ok`.
 */
export const SCENES = [
  {
    id: 'first-day', title: 'First day', place: 'office', cast: ['alvarez', 'mina'], when: { day: 1 },
    lines: [p('alvarez', 'Welcome to {company}, {name}. You\'re our new {title} {role} — and this is Mina, who will pretend she doesn\'t mind showing you around.', 'happy'), p('mina', 'I mind a little. The coffee machine lies about being empty. That\'s the main thing to know.', 'happy')],
    choices: [
      { t: 'Ask Mina what the team is really working on', ok: { lines: [p('mina', 'Honestly? Cleaning up after last quarter. But you\'ll learn fast that way. Sit with me today.', 'happy')], fx: { skill: 3, people: { mina: 6 } } } },
      { t: 'Ask Ms. Alvarez what a great first month looks like', ok: { lines: [p('alvarez', 'Good question. Ask more than you guess, and tell me early when something slips. That\'s all of it.', 'happy')], fx: { mood: 4, people: { alvarez: 6 } } } },
      { t: 'Say you\'ll figure it out — you don\'t want to be a bother', ok: { lines: [p('mina', 'Suit yourself. The wiki is… optimistic.', 'neutral'), p(null, 'You spend the afternoon lost in a folder called FINAL_v3_real.')], fx: { mood: -4, skill: 1 } } }
    ]
  },
  {
    id: 'flat-dishes', title: 'The sink', place: 'home', cast: ['jun'], when: { day: 2, slot: 2 },
    lines: [p(null, 'You come home to a sink that has become a small ecosystem.'), p('jun', 'Before you say anything — I had a day. I\'ll do them tomorrow. Probably.', 'worried')],
    choices: [
      { t: 'Wash up together and ask about the day', ok: { lines: [p('jun', 'They moved my whole project to another team. Just like that.', 'worried'), p('jun', '…Thanks for not making it about the plates.', 'happy')], fx: { energy: -6, mood: 4, people: { jun: 8 }, flag: 'jun-trust' } } },
      { t: 'Make a rota and stick it on the fridge', ok: { lines: [p('jun', 'A rota. With colours. You\'re terrifying.', 'neutral'), p(null, 'It works, though. Mostly.')], fx: { mood: 2, people: { jun: 1 }, flag: 'rota' } } },
      { t: 'Do them yourself, loudly', ok: { lines: [p(null, 'You make each plate a statement. Jun turns the television up.')], fx: { energy: -8, mood: -5, people: { jun: -5 } } } }
    ]
  },
  {
    id: 'mina-deadline', title: 'Six o\'clock', place: 'office', cast: ['mina'], when: { day: 3, weekday: 'work', slot: 1 },
    lines: [p('mina', 'I told the client today. I meant Thursday. I said today.', 'worried'), p('mina', 'It\'s two hours of work for two people or five for one. No pressure.', 'worried')],
    choices: [
      { t: 'Stay and split it with her', need: { stat: { energy: 30 } }, ok: { lines: [p(null, 'You find the bug she had been staring past. At ten to six she sends it.'), p('mina', 'I owe you a lunch. A real one, not the canteen.', 'happy')], fx: { energy: -18, skill: 3, people: { mina: 10 }, flag: 'mina-owes' } }, no: { lines: [p(null, 'You try, but you are reading the same line for the fourth time.'), p('mina', 'Go home. You\'re grey. I\'ll manage.', 'worried')], fx: { energy: -8, people: { mina: 3 } } } },
      { t: 'Help her write an honest note to the client asking for Thursday', ok: { lines: [p('mina', 'They said "no problem, thanks for telling us." I nearly cried at a spreadsheet.', 'happy')], fx: { skill: 2, mood: 3, people: { mina: 6 } } } },
      { t: 'Say you can\'t tonight', ok: { lines: [p('mina', 'No, fair. It\'s my mess.', 'neutral'), p(null, 'Her light is still on when you pass the building later.')], fx: { mood: -3, people: { mina: -4 } } } }
    ]
  },
  {
    id: 'cafe-book', title: 'The corner table', place: 'cafe', cast: ['sora'], when: { day: 4, aff: { sora: 2 } },
    lines: [p(null, 'Someone is at your table. Reading the same book you gave up on in spring.'), p('sora', 'Oh — is this yours? The table, I mean. It has a you-shaped dent.', 'happy')],
    choices: [
      { t: 'Ask whether the book ever gets good', ok: { lines: [p('sora', 'Page two hundred. Everyone quits at one-eighty. It\'s a tragedy, really. I\'m Sora.', 'happy')], fx: { mood: 6, social: 2, people: { sora: 8 }, flag: 'met-sora' } } },
      { t: 'Say it\'s fine and take the wobbly table', ok: { lines: [p(null, 'The wobbly table wobbles. From across the room, a small wave over the top of a book.')], fx: { mood: 1, people: { sora: 2 }, flag: 'met-sora' } } }
    ]
  },
  {
    id: 'mum-visit', title: 'Sunday lunch', place: 'home', cast: ['mum'], when: { day: 6, weekday: 'weekend' },
    lines: [p('mum', 'You look thin. Is that company feeding you? I can come on Sunday. I\'ll bring the good pot.', 'worried')],
    choices: [
      { t: 'Yes — come. I\'ll cook, you sit', ok: { lines: [p(null, 'You burn the rice. She eats two helpings and tells Jun three stories you had hoped were lost.'), p('mum', 'Your flat is small. But it\'s yours. I\'m proud, you know.', 'happy')], fx: { mood: 10, energy: -6, people: { mum: 10, jun: 2 }, flag: 'mum-came' } } },
      { t: 'Not this week — I\'m buried. Next month?', ok: { lines: [p('mum', 'Next month. Of course. I\'ll freeze some for you.', 'neutral'), p(null, 'The call ends a little sooner than usual.')], fx: { energy: 4, mood: -4, people: { mum: -4 } } } }
    ]
  },
  {
    id: 'standup-idea', title: 'The meeting', place: 'meeting', cast: ['alvarez', 'dev'], when: { day: 5, weekday: 'work', slot: 0 },
    lines: [p('alvarez', 'We keep losing a day every release to the same checks. Ideas? Anyone?', 'neutral'), p(null, 'You have one. It is either obvious or good. The silence stretches.')],
    choices: [
      { t: 'Say it', need: { stat: { skill: 14 } }, ok: { lines: [p('dev', 'Huh. That would actually work. Why haven\'t we done that?', 'happy'), p('alvarez', 'Write it up, {name}. Half a page. It\'s yours.', 'happy')], fx: { mood: 8, skill: 2, people: { alvarez: 8, dev: 4 }, flag: 'idea-owned' } }, no: { lines: [p('dev', 'We tried that in the spring. It broke the nightly build.', 'neutral'), p('alvarez', 'Still — thank you for speaking up. Keep doing that.', 'neutral')], fx: { mood: -2, skill: 2, people: { alvarez: 3 } } } },
      { t: 'Message Dev the idea afterwards', ok: { lines: [p('dev', 'This is good. Say it out loud next time — I\'ll back you.', 'happy')], fx: { skill: 1, people: { dev: 6 } } } },
      { t: 'Stay quiet', ok: { lines: [p(null, 'Somebody else says half of it, badly. It gets written on the board.')], fx: { mood: -5 } } }
    ]
  },
  {
    id: 'mina-lunch', title: 'A real lunch', place: 'street', cast: ['mina'], when: { day: 7, flag: 'mina-owes', weekday: 'work' },
    lines: [p('mina', 'I said a real lunch. There\'s a place that does dumplings the size of your fist.', 'happy'), p('mina', 'Can I ask you something? Do you ever feel like everyone else got a manual?', 'worried')],
    choices: [
      { t: 'Every single day', ok: { lines: [p('mina', 'Oh thank goodness. I thought it was only me and the intern.', 'happy'), p(null, 'You are back twenty minutes late and it was worth every one.')], fx: { mood: 9, social: 3, people: { mina: 9 }, flag: 'mina-friend' } } },
      { t: 'You seem like you have it together', ok: { lines: [p('mina', 'That\'s the nicest lie anyone has told me this year.', 'happy')], fx: { mood: 4, people: { mina: 5 }, flag: 'mina-friend' } } }
    ]
  },
  {
    id: 'mistake', title: 'The wrong file', place: 'office', cast: ['alvarez'], when: { day: 9, weekday: 'work' },
    lines: [p(null, 'Your stomach drops. The numbers you sent yesterday were last month\'s. Nobody has noticed. Yet.')],
    choices: [
      { t: 'Tell Ms. Alvarez now, with the fix attached', ok: { lines: [p('alvarez', 'You found it, you fixed it, you told me before the client did. That is exactly the job.', 'happy')], fx: { mood: 3, skill: 2, people: { alvarez: 9 }, flag: 'owned-mistake' } } },
      { t: 'Quietly send a corrected file and hope', ok: { lines: [p(null, 'It works. Almost. On Friday the client asks why there are two versions.'), p('alvarez', 'I\'d rather hear it from you than from them. Next time, tell me.', 'worried')], fx: { mood: -6, people: { alvarez: -6 }, flag: 'hid-mistake' } } },
      { t: 'Ask Dev what he would do', ok: { lines: [p('dev', 'Tell her. Today. I once sat on one of these for a week and it aged me a year.', 'neutral'), p(null, 'You tell her. It is fine. It is nearly always fine.')], fx: { skill: 1, people: { dev: 4, alvarez: 5 }, flag: 'owned-mistake' } } }
    ]
  },
  {
    id: 'jun-news', title: 'Late light', place: 'home', cast: ['jun'], when: { day: 10, flag: 'jun-trust', slot: 2 },
    lines: [p('jun', 'They offered me a job. Better money. It\'s in another city.', 'worried'), p('jun', 'I haven\'t told anyone. I don\'t know what I want you to say.', 'worried')],
    choices: [
      { t: 'What does the you from five years on want?', ok: { lines: [p('jun', '…To have gone. And to have someone to call when it\'s awful.', 'neutral'), p('jun', 'You\'d better pick up.', 'happy')], fx: { mood: 3, social: 3, people: { jun: 10 }, flag: 'jun-leaving' } } },
      { t: 'I\'d miss you. But I\'d help you pack', ok: { lines: [p('jun', 'That\'s the worst possible answer. Now I have to think about it properly.', 'happy')], fx: { mood: 2, people: { jun: 8 } } } },
      { t: 'Who\'s going to pay the other half of the rent?', ok: { lines: [p('jun', 'Right. Yes. The rent.', 'neutral'), p(null, 'The door to Jun\'s room closes more quietly than a slam would have.')], fx: { mood: -4, people: { jun: -8 } } } }
    ]
  },
  {
    id: 'sora-rain', title: 'Rain', place: 'street', cast: ['sora'], when: { day: 11, flag: 'met-sora', aff: { sora: 12 } },
    lines: [p(null, 'The sky opens as the café closes. Two people, one doorway, no umbrella worth the name.'), p('sora', 'I live ten minutes that way. I was going to run for it. Unless you have a better plan.', 'happy')],
    choices: [
      { t: 'Share your jacket over both heads and run', ok: { lines: [p(null, 'You arrive soaked from the knees down and laughing too hard to say goodbye properly.'), p('sora', 'Saturday? Same table. I\'ll bring the next book.', 'happy')], fx: { mood: 12, health: -1, people: { sora: 12 }, flag: 'sora-saturday' } } },
      { t: 'Wait it out and talk', ok: { lines: [p('sora', 'I teach piano to children who would rather be anywhere else. It\'s the best job.', 'happy'), p(null, 'The rain stops. Neither of you mentions it for a while.')], fx: { mood: 8, social: 2, people: { sora: 9 }, flag: 'sora-saturday' } } },
      { t: 'Offer your umbrella and walk the other way', ok: { lines: [p('sora', 'That\'s — very kind. I\'ll bring it back!', 'happy'), p(null, 'You get wet. You have a reason to go back to the café.')], fx: { mood: 3, health: -2, people: { sora: 6 } } } }
    ]
  },
  {
    id: 'tired-warning', title: 'The mirror', place: 'home', cast: [], when: { stat: { energy: [0, 22] } }, again: 9,
    lines: [p(null, 'You fall asleep on the bus and wake up two stops past yours. Your reflection in the window looks like a photocopy of a photocopy.')],
    choices: [
      { t: 'Cancel tomorrow evening and go to bed', ok: { lines: [p(null, 'Nine hours. You had forgotten what nine hours felt like.')], fx: { energy: 26, mood: 4, health: 3 } } },
      { t: 'Coffee. More coffee', ok: { lines: [p(null, 'It works until it doesn\'t. Your hands have opinions about your handwriting.')], fx: { energy: 8, health: -5, mood: -3 } } }
    ]
  },
  {
    id: 'dev-mentor', title: 'Whiteboard', place: 'meeting', cast: ['dev'], when: { day: 12, aff: { dev: 10 }, weekday: 'work' },
    lines: [p('dev', 'You ask good questions. I\'ve got an hour on Thursdays nobody has stolen yet. Want it?', 'happy')],
    choices: [
      { t: 'Yes. Can we start with how you decide what not to do?', ok: { lines: [p('dev', 'Ha. That\'s the only skill that matters after year three.', 'happy'), p(null, 'Thursday becomes the hour you learn the most in.')], fx: { skill: 6, people: { dev: 9 }, flag: 'mentor' } } },
      { t: 'I\'d love to, once things calm down', ok: { lines: [p('dev', 'They don\'t calm down. But the offer stands.', 'neutral')], fx: { people: { dev: 2 } } } }
    ]
  },
  {
    id: 'money-tight', title: 'The envelope', place: 'home', cast: ['jun'], when: { stat: { money: [-9999, 40] }, day: 5 }, again: 10,
    lines: [p(null, 'The rent is due and your account is doing an impression of a desert.'), p('jun', 'I can cover you this month. You\'d do it for me.', 'neutral')],
    choices: [
      { t: 'Accept, and write down when you\'ll pay it back', ok: { lines: [p('jun', 'I don\'t need it in writing.', 'happy'), p(null, 'You write it down anyway. It helps.')], fx: { money: 90, mood: 2, people: { jun: 3 }, flag: 'owes-jun' } } },
      { t: 'Thank them, and sell the guitar you never play', ok: { lines: [p(null, 'A student buys it and plays it better in the doorway than you ever did.')], fx: { money: 110, mood: -3 } } }
    ]
  },
  {
    id: 'presentation', title: 'Ten slides', place: 'meeting', cast: ['alvarez', 'mina'], when: { day: 14, weekday: 'work', slot: 0 },
    lines: [p('alvarez', 'The client is here at two. I want {name} to present the plan. Ten slides, fifteen minutes.', 'neutral'), p('mina', 'I can be your clicker. Or your emergency exit.', 'happy')],
    choices: [
      { t: 'Present it your own way: three slides and a story', need: { stat: { skill: 30 } }, ok: { lines: [p(null, 'You close the laptop on slide three and just talk. The client leans forward.'), p('alvarez', 'That was not what I asked for. It was better.', 'happy')], fx: { mood: 12, skill: 4, people: { alvarez: 10, mina: 3 }, flag: 'presented-well' } }, no: { lines: [p(null, 'You lose your thread at the second question and Mina clicks to a slide that saves you.'), p('alvarez', 'Brave. Next time, earn the shortcut first.', 'neutral')], fx: { mood: -6, skill: 3, people: { alvarez: -2, mina: 4 } } } },
      { t: 'Rehearse it twice with Mina first', ok: { lines: [p(null, 'It is not dazzling. It is clear, it is on time, and you answer every question.'), p('alvarez', 'Solid. That\'s the word I\'ll use upstairs.', 'happy')], fx: { mood: 6, skill: 3, energy: -8, people: { alvarez: 6, mina: 5 }, flag: 'presented-well' } } },
      { t: 'Ask whether Mina could present instead', ok: { lines: [p('alvarez', 'She could. I asked you.', 'neutral'), p(null, 'Mina presents. She is good. You hold the clicker.')], fx: { mood: -5, people: { alvarez: -5, mina: 1 } } } }
    ]
  },
  {
    id: 'sora-saturday', title: 'Saturday', place: 'park', cast: ['sora'], when: { day: 13, flag: 'sora-saturday', weekday: 'weekend' },
    lines: [p('sora', 'I lied about the book. I brought sandwiches and a kite that has never once flown.', 'happy')],
    choices: [
      { t: 'Then today is the day it flies', need: { stat: { health: 35 } }, ok: { lines: [p(null, 'It takes forty minutes and one tree. Then it goes up, and neither of you can stop looking at it.'), p('sora', 'I\'m glad I stole your table.', 'happy')], fx: { mood: 14, health: 2, people: { sora: 12 }, flag: 'sora-close' } }, no: { lines: [p(null, 'You run until your lungs file a complaint. The kite lies in the grass, unmoved.'), p('sora', 'Sandwiches, then. We\'ll beat it next week.', 'happy')], fx: { mood: 7, energy: -8, people: { sora: 7 }, flag: 'sora-close' } } },
      { t: 'Sandwiches first. Tell me about the worst piano student', ok: { lines: [p('sora', 'He is six, he plays with his elbows, and he is my favourite person in the world.', 'happy')], fx: { mood: 10, social: 2, people: { sora: 9 }, flag: 'sora-close' } } }
    ]
  },
  {
    id: 'overwork-ask', title: 'Just this weekend', place: 'office', cast: ['alvarez'], when: { day: 16, weekday: 'work', slot: 1 },
    lines: [p('alvarez', 'I hate asking. The launch moved up. I need two people on Saturday. You\'re good, so you\'re first.', 'worried')],
    choices: [
      { t: 'I can do Saturday morning, not the whole day', ok: { lines: [p('alvarez', 'A boundary and a yes in one sentence. Take the morning. Thank you.', 'happy')], fx: { money: 20, energy: -10, people: { alvarez: 6 }, flag: 'set-boundary' } } },
      { t: 'Of course — whatever you need', ok: { lines: [p(null, 'Saturday becomes Saturday and most of Sunday. The launch goes out. You do not remember Monday.'), p('alvarez', 'You saved us. Don\'t let me make a habit of it.', 'neutral')], fx: { money: 40, skill: 2, energy: -30, mood: -8, health: -4, people: { alvarez: 8 } } } },
      { t: 'I have plans I can\'t move. I can come in early Monday', ok: { lines: [p('alvarez', 'All right. Monday at eight, then.', 'neutral')], fx: { mood: 3, people: { alvarez: -1 } } } }
    ]
  },
  {
    id: 'mum-hospital', title: 'A missed call', place: 'home', cast: ['mum'], when: { day: 18, slot: 2 },
    lines: [p(null, 'Three missed calls from home. Then a message: "Nothing to worry about. Small fall. They are keeping me one night."')],
    choices: [
      { t: 'Take tomorrow off and go', ok: { lines: [p('mum', 'You came all this way for a bruise? Sit. Sit! Tell me everything. Slowly.', 'happy'), p(null, 'You miss a meeting. Nobody remembers which one.')], fx: { mood: 8, energy: -8, people: { mum: 14, alvarez: -1 }, flag: 'went-home' } } },
      { t: 'Call, and stay on the phone until she falls asleep', ok: { lines: [p('mum', 'Tell me about the people you work with. Start with the funny one.', 'happy'), p(null, 'You talk for an hour. The line hums after she stops answering.')], fx: { mood: 5, energy: -4, people: { mum: 8 } } } },
      { t: 'Text back "glad it\'s nothing" and plan to visit at the weekend', ok: { lines: [p(null, 'The weekend fills up, the way weekends do.')], fx: { mood: -5, people: { mum: -6 } } } }
    ]
  },
  {
    id: 'jun-moving', title: 'Boxes', place: 'home', cast: ['jun'], when: { day: 20, flag: 'jun-leaving', weekday: 'weekend' },
    lines: [p(null, 'The hallway is boxes. Jun is holding the rota from the fridge.'), p('jun', 'I\'m taking this. For the colours. And I found your mug in my wardrobe, don\'t ask.', 'happy')],
    choices: [
      { t: 'Carry boxes all day and make the last dinner', ok: { lines: [p('jun', 'First weekend you\'re free, you\'re on a train. That\'s not a request.', 'happy'), p(null, 'The flat is very quiet afterwards. You leave Jun\'s light on anyway.')], fx: { energy: -14, mood: 4, social: 3, people: { jun: 12 }, flag: 'jun-gone-well' } } },
      { t: 'Help for an hour, then go — you hate goodbyes', ok: { lines: [p('jun', 'I know you do. Go on.', 'neutral')], fx: { mood: -3, people: { jun: 2 } } } }
    ]
  },
  {
    id: 'review-talk', title: 'One-to-one', place: 'meeting', cast: ['alvarez'], when: { day: 22, weekday: 'work' },
    lines: [p('alvarez', 'Month one. I\'ll tell you what I see, then you tell me what you want. Deal?', 'neutral')],
    choices: [
      { t: 'Ask for the feedback straight, the hard part first', ok: { lines: [p('alvarez', 'You say yes too fast and ask for help too late. Everything else is on the right road.', 'neutral'), p(null, 'It stings for an hour and is useful for a year.')], fx: { skill: 4, mood: -2, people: { alvarez: 8 }, flag: 'took-feedback' } } },
      { t: 'Say what you want: a project of your own next quarter', need: { aff: { alvarez: 30 } }, ok: { lines: [p('alvarez', 'I was hoping you\'d ask. There\'s a small one nobody wants. Make it not small.', 'happy')], fx: { mood: 10, skill: 2, people: { alvarez: 8 }, flag: 'own-project' } }, no: { lines: [p('alvarez', 'Not yet. Show me three more weeks like your best one, and ask me again.', 'neutral')], fx: { mood: -3, people: { alvarez: 2 } } } },
      { t: 'Say it\'s all going fine', ok: { lines: [p('alvarez', 'Fine is a word people use when they\'d rather not say. My door\'s open when you would.', 'neutral')], fx: { people: { alvarez: -2 } } } }
    ]
  },
  {
    id: 'sora-recital', title: 'The recital', place: 'meeting', cast: ['sora'], when: { day: 24, flag: 'sora-close' },
    lines: [p('sora', 'My students play on Friday. Twelve children, one piano, forty parents. I\'m more nervous than they are. Would you come?', 'worried')],
    choices: [
      { t: 'I\'ll be in the front row', ok: { lines: [p(null, 'The six-year-old plays with his elbows and brings the house down. Sora finds your eyes in the crowd and breathes out.'), p('sora', 'I looked for you every time one of them went wrong. It helped. You help.', 'happy')], fx: { mood: 14, social: 3, people: { sora: 14 }, flag: 'sora-heart' } } },
      { t: 'I have a deadline — can I hear about it after?', ok: { lines: [p('sora', 'Of course. It\'s only children hitting a piano.', 'neutral'), p(null, 'You hear about it after. It sounds like you missed something.')], fx: { skill: 1, mood: -4, people: { sora: -6 } } } }
    ]
  },
  {
    id: 'team-win', title: 'It shipped', place: 'street', cast: ['mina', 'dev', 'alvarez'], when: { day: 26, weekday: 'work', slot: 2 },
    lines: [p('dev', 'It\'s live. Nothing is on fire. I checked twice.', 'happy'), p('mina', 'Then we are legally required to celebrate. {name}, you\'re choosing where.', 'happy')],
    choices: [
      { t: 'The noodle place — and I\'m buying the first round', need: { money: 40 }, ok: { lines: [p('alvarez', 'To the team that told me bad news early.', 'happy'), p(null, 'Somebody starts a story about the FINAL_v3_real folder. It is you. It is a good story now.')], fx: { money: -40, mood: 14, social: 5, people: { mina: 6, dev: 6, alvarez: 5 }, flag: 'celebrated' } }, no: { lines: [p('mina', 'Your card just made a sad noise. I\'ve got this one. You get the next launch.', 'happy')], fx: { mood: 8, social: 3, people: { mina: 5, dev: 3, alvarez: 2 }, flag: 'celebrated' } } },
      { t: 'Go for one, then head home to sleep', ok: { lines: [p(null, 'One becomes one and a half. You are in bed by ten and smug about it.')], fx: { mood: 7, energy: 6, social: 2, people: { mina: 3, dev: 3 } } } },
      { t: 'You\'re wiped — wave them off', ok: { lines: [p('dev', 'Next time, then. Get some sleep.', 'neutral')], fx: { energy: 10, mood: -2 } } }
    ]
  },
  // Small things that can happen any week, once the one-off stories are told.
  {
    id: 'lost-wallet', title: 'On the pavement', place: 'street', cast: [], when: { day: 8 }, again: 12,
    lines: [p(null, 'A wallet on the pavement. Cash, a library card, a photo of a dog in a raincoat.')],
    choices: [
      { t: 'Walk it to the address on the card', ok: { lines: [p(null, 'An old man opens the door. The dog in the raincoat is real and is called Admiral.')], fx: { mood: 9, energy: -6, social: 2 } } },
      { t: 'Hand it in at the station on your way', ok: { lines: [p(null, 'A form, a signature, a nod. Somewhere a dog gets his photo back.')], fx: { mood: 4 } } }
    ]
  },
  {
    id: 'gym-offer', title: 'First month free', place: 'park', cast: [], when: { day: 6, stat: { health: [0, 55] } }, again: 14,
    lines: [p(null, 'A cheerful person with a clipboard: "First month free! You look like someone who sits down for a living."')],
    choices: [
      { t: 'Sign up, and actually go twice this week', need: { stat: { energy: 30 } }, ok: { lines: [p(null, 'Day one is humbling. Day two you can feel your own legs, which is new.')], fx: { health: 8, energy: -10, mood: 4 } }, no: { lines: [p(null, 'You sign up. The card lives in your wallet like a small accusation.')], fx: { mood: -2, money: -5 } } },
      { t: 'Walk the long way home instead', ok: { lines: [p(null, 'Forty minutes, one river, no clipboard. Not bad.')], fx: { health: 3, mood: 4, energy: -4 } } }
    ]
  },
  {
    id: 'quiet-evening', title: 'A quiet one', place: 'home', cast: [], when: { day: 9, slot: 2 }, again: 6,
    lines: [p(null, 'Nothing is due. Nobody is waiting. The evening is entirely, suspiciously yours.')],
    choices: [
      { t: 'Cook something that takes an hour', ok: { lines: [p(null, 'It takes two. It is the best thing you have eaten all month.')], fx: { mood: 7, health: 3, energy: -4 } } },
      { t: 'Write to someone you haven\'t in a while', ok: { lines: [p(null, 'They answer in four minutes. "I was JUST thinking about you."')], fx: { mood: 6, social: 4 } } },
      { t: 'Scroll until it\'s somehow midnight', ok: { lines: [p(null, 'You learn nothing and remember less.')], fx: { mood: -3, energy: -6 } } }
    ]
  }
];
