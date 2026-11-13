import { ROLES } from './roles.js';

/**
 * Missions without the AI: a situation for each kind of news, and four
 * answers from best (3) to worst (0). `{company}`, `{role}`, `{deliverable}`
 * and `{headline}` are filled in. The AI writes richer ones when it is on
 * (server/work); these are the fallback and the routine days.
 *
 * Good answers are the workplace basics: protect customers, tell the truth,
 * keep the team informed, do your own job well, ask before guessing.
 */
export const SCENARIOS = {
  layoffs: {
    title: 'Uncertain times',
    situation: 'The news says {company} is cutting jobs: "{headline}". People in the office are worried. As a {role}, how do you spend today?',
    options: [
      [3, 'Finish the most important part of {deliverable}, and ask your manager which priorities changed.'],
      [2, 'Keep working as usual and stay away from rumors.'],
      [1, 'Spend the morning reading every article and forum post about it.'],
      [0, 'Complain about the company in public on social media.']
    ]
  },
  'earnings-miss': {
    title: 'A tough quarter',
    situation: '{company} had a weaker quarter than expected: "{headline}". Your manager asks every team to help. What do you suggest for {deliverable}?',
    options: [
      [3, 'Find one change that saves money or brings in customers, with numbers to back it up.'],
      [2, 'Offer to cut the least useful part of {deliverable} to save time.'],
      [1, 'Say it is the sales team\'s problem, not yours.'],
      [0, 'Change the numbers in {deliverable} so things look better.']
    ]
  },
  'earnings-beat': {
    title: 'A strong quarter',
    situation: 'Good news: "{headline}". {company} is celebrating. Your manager asks what your team should do next.',
    options: [
      [3, 'Write down what worked in {deliverable} so the team can do it again.'],
      [2, 'Thank the people who helped and keep going.'],
      [1, 'Relax for the rest of the week, the hard work is done.'],
      [0, 'Take credit for the whole team\'s results.']
    ]
  },
  earnings: {
    title: 'Results day',
    situation: '{company} reports its results today: "{headline}". Customers and coworkers will have questions. What do you prepare?',
    options: [
      [3, 'A short, accurate summary for your team of what the results mean for {deliverable}.'],
      [2, 'Read the results carefully before answering any questions.'],
      [1, 'Guess at the numbers before they are announced.'],
      [0, 'Share the results with a friend before they are public.']
    ]
  },
  recall: {
    title: 'Something went wrong',
    situation: 'A problem hits {company}: "{headline}". Customers are affected. As a {role}, what comes first?',
    options: [
      [3, 'Make sure affected customers are safe and informed, then help find the cause.'],
      [2, 'Tell your manager right away what you see in your area.'],
      [1, 'Wait to see if it fixes itself.'],
      [0, 'Hide the problem so nobody blames your team.']
    ]
  },
  legal: {
    title: 'A legal question',
    situation: '{company} is in the news: "{headline}". A customer asks you about it. What do you say?',
    options: [
      [3, 'Explain that you cannot comment, and point them to the company\'s official statement.'],
      [2, 'Ask the legal or press team what may be shared.'],
      [1, 'Share your own opinion about who is right.'],
      [0, 'Make up an answer so the customer is happy.']
    ]
  },
  leadership: {
    title: 'A change at the top',
    situation: 'Leadership news at {company}: "{headline}". Your team wonders what happens to {deliverable}.',
    options: [
      [3, 'Keep {deliverable} on track and prepare a short update for the new leaders.'],
      [2, 'Ask your manager whether any plans change.'],
      [1, 'Stop work until someone tells you what to do.'],
      [0, 'Spread guesses about why it happened.']
    ]
  },
  acquisition: {
    title: 'A big deal',
    situation: 'Deal news: "{headline}". {company} may soon work with a new team. What do you do?',
    options: [
      [3, 'List what your team and the new one would need to work together on {deliverable}.'],
      [2, 'Learn about the other company\'s products and customers.'],
      [1, 'Assume nothing will change for you.'],
      [0, 'Buy or sell stock because of what you heard at work before it is public.']
    ]
  },
  product: {
    title: 'Launch day',
    situation: '{company} is launching something new: "{headline}". You are asked to help with {deliverable}.',
    options: [
      [3, 'Test it the way a customer would and report every problem you find.'],
      [2, 'Read the launch plan and do your part on time.'],
      [1, 'Do the fun parts and skip the checklist.'],
      [0, 'Post secret launch details online early.']
    ]
  },
  partnership: {
    title: 'A new partner',
    situation: 'Partner news: "{headline}". A partner team will join a meeting about {deliverable}.',
    options: [
      [3, 'Prepare a clear one-page plan with who does what and by when.'],
      [2, 'Listen first and write down their goals.'],
      [1, 'Talk only about your own team\'s needs.'],
      [0, 'Promise them things your company cannot deliver.']
    ]
  },
  'analyst-up': {
    title: 'Good reviews',
    situation: 'Experts are positive about {company}: "{headline}". Your manager wants to keep the momentum.',
    options: [
      [3, 'Pick one thing customers love and make it even better in {deliverable}.'],
      [2, 'Share the good news with your team and keep working.'],
      [1, 'Ask for a raise because of the article.'],
      [0, 'Stop checking your work: things are going great.']
    ]
  },
  'analyst-down': {
    title: 'Hard questions',
    situation: 'Experts are worried about {company}: "{headline}". Your manager asks for ideas.',
    options: [
      [3, 'Look at the worry honestly and suggest one fix you can measure.'],
      [2, 'Read the criticism and see what applies to {deliverable}.'],
      [1, 'Say the experts are wrong without checking.'],
      [0, 'Start looking for a new job during work hours.']
    ]
  },
  capital: {
    title: 'Money matters',
    situation: '{company} is returning money to its owners: "{headline}". A coworker asks you what that means.',
    options: [
      [3, 'Explain simply: the company shares some profit with its shareholders.'],
      [2, 'Say you are not sure and look it up together.'],
      [1, 'Tell them it means everyone gets a raise.'],
      [0, 'Tell them to borrow money and buy the stock now.']
    ]
  },
  expansion: {
    title: 'Growing',
    situation: '{company} is growing: "{headline}". New people may join your team. How do you help?',
    options: [
      [3, 'Write a short guide to {deliverable} so new people can start quickly.'],
      [2, 'Offer to be a buddy for a new teammate.'],
      [1, 'Keep your knowledge to yourself so you stay needed.'],
      [0, 'Tell new people to skip the safety and training steps.']
    ]
  },
  other: {
    title: 'In the news',
    situation: '{company} is in the news: "{headline}". Your manager asks if it matters for {deliverable}.',
    options: [
      [3, 'Read it, then explain in two sentences what it could change for your work.'],
      [2, 'Say you will check and report back by the end of the day.'],
      [1, 'Answer without reading it.'],
      [0, 'Ignore your manager\'s question.']
    ]
  }
};

/** Routine work when there is no news about the company today. */
export const ROUTINE = {
  title: 'A normal day',
  situation: 'A quiet day at {company}. You have time to work on {deliverable}. What do you do first?',
  options: [
    [3, 'Start with the most important task, and check it before you send it.'],
    [2, 'Answer your messages, then get to work.'],
    [1, 'Do the easiest small tasks all day.'],
    [0, 'Copy a coworker\'s work and hand it in as yours.']
  ]
};

/** Interview questions: workplace sense, the same for every role (the role fills in the details). */
export const INTERVIEW = [
  {
    q: 'You notice a mistake in your own work after you handed it in. What do you do?',
    options: [[3, 'Tell your manager, fix it, and explain what changed.'], [2, 'Fix it quietly in the next version.'], [1, 'Hope nobody notices.'], [0, 'Blame someone else.']]
  },
  {
    q: 'Two tasks are due at the same time. What do you do?',
    options: [[3, 'Ask which matters more, then do that one first.'], [2, 'Work late to finish both.'], [1, 'Do the easier one.'], [0, 'Do neither and wait.']]
  },
  {
    q: 'A coworker is stuck on something you know well. What do you do?',
    options: [[3, 'Offer to show them how, then let them try.'], [2, 'Send them a link to the guide.'], [1, 'Do it for them without explaining.'], [0, 'Ignore them: it is not your job.']]
  },
  {
    q: 'Why do you want to work at {company} as a {role}?',
    options: [[3, 'I know what they make, and my skills fit {deliverable}.'], [2, 'It is a well-known company.'], [1, 'Any job is fine.'], [0, 'I heard it is easy.']]
  },
  {
    q: 'A customer is upset and shouting. What do you do?',
    options: [[3, 'Stay calm, listen, and find out what would help.'], [2, 'Pass them to your manager.'], [1, 'Tell them to calm down.'], [0, 'Shout back.']]
  },
  {
    q: 'Your manager gives you feedback you disagree with. What do you do?',
    options: [[3, 'Ask questions to understand it, and say what you think politely.'], [2, 'Accept it and try it.'], [1, 'Complain to coworkers.'], [0, 'Refuse to change anything.']]
  }
];

/** Fill a template: company, role and the role's deliverable. */
export function fill(text, { company, role, headline = '' }) {
  return String(text)
    .replaceAll('{company}', company)
    .replaceAll('{role}', ROLES[role]?.name.toLowerCase() ?? role)
    .replaceAll('{deliverable}', ROLES[role]?.deliverable ?? 'your work')
    .replaceAll('{headline}', headline);
}

/** A seeded shuffle, so the order is stable per mission and not always best-first. */
export function seededOrder(n, seed) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rand = () => ((h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0) / 2 ** 32);
  const order = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Points for a choice by its quality (0–3). */
export const CHOICE_POINTS = [0, 40, 75, 100];
