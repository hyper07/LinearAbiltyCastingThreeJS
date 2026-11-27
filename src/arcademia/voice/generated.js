/**
 * AI Arcademia's generated character voices: the model's credit, the cast
 * (one designed voice per character, the same in every language), and the
 * generated-voice manifest (public/audio/voice-gen/manifest.json).
 *
 * A generated line plays only when no real person has recorded that line:
 * human recording (public/audio/voice) → generated voice → silence. The
 * browser's speech synthesis is never used.
 *
 * Voices are designed from a written description with Qwen3-TTS VoiceDesign
 * (Apache-2.0): no real person's voice is cloned or imitated. Each designed
 * voice is rendered once as a short English reference clip; every line in
 * every language is then spoken from that clip (Qwen3-TTS Base, voice
 * prompt), so a character sounds like the same person in all five languages.
 *
 *   {
 *     "version": 1, "generated": true, "updated": "…",
 *     "model": { "name": "Qwen3-TTS", "weights": "Qwen/Qwen3-TTS-12Hz-1.7B-Base", "licence": "Apache-2.0", "url": "…" },
 *     "voices": { "hoot": { "design": "…", "seed": 11 } },
 *     "lines": { "en": { "hoot": { "t.lesson.hello.math": {
 *       "files": { "webm": "en/hoot/t.lesson.hello.math.webm" }, "duration": 2.4,
 *       "take": "2026-11-19T…", "text": "<hash>", "cer": 0.02, "lufs": -18, "peak": -1.2
 *     } } } }
 *   }
 */
import { FORMATS, MAX_SECONDS, selectRecording } from './manifest.js';
import { isCharId, isLineId } from './script.js';

export const GEN_MANIFEST_VERSION = 1;

/** The credit every generated line carries (the Credits panel, docs/third-party.md, library/CREDITS.md). */
export const GEN_CREDIT = Object.freeze({
  model: 'Qwen3-TTS',
  url: 'https://github.com/QwenLM/Qwen3-TTS',
  weights: 'Qwen/Qwen3-TTS-12Hz-1.7B-Base',
  design: 'Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign',
  licence: 'Apache-2.0',
  licenceUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
  by: 'Alibaba Qwen team',
  attribution: 'Character voices generated with Qwen3-TTS (Apache-2.0, https://github.com/QwenLM/Qwen3-TTS), designed from written descriptions; no real person\'s voice is cloned.'
});

/* ---------------------------------------------------------------- the cast */

/**
 * One designed voice per character: `design` is the VoiceDesign description
 * (English), `ref` the sentence the reference clip says, `seed` fixes the
 * take, `f0` the speaking pitch (median, Hz) a reference must land in. The
 * model sometimes over-acts a description into a squeaky or strained voice;
 * the pitch window keeps the cast sounding like real people (adult men about
 * 95–165 Hz, women 165–255 Hz, children 220–340 Hz).
 */
const V = (design, seed, ref = null, f0 = null) => ({ design, seed, ref, f0 });
/** What each reference clip says, per language (a character's voice is designed once per language). */
export const REF_TEXT = {
  adult: {
    en: 'Hello there, my friend! Today we are going to learn something new together. Are you ready? Let\'s begin.',
    ko: '안녕, 친구야! 오늘은 함께 새로운 것을 배워 볼 거예요. 준비됐나요? 그럼 시작해 볼까요?',
    es: '¡Hola, amigo! Hoy vamos a aprender algo nuevo juntos. ¿Estás listo? ¡Empecemos!',
    ja: 'こんにちは、おともだち！きょうは、いっしょに新しいことを学びましょう。じゅんびはいいかな？では、はじめましょう。',
    zh: '你好呀，我的朋友！今天我们一起来学一点新东西。准备好了吗？我们开始吧。'
  },
  child: {
    en: 'Hi! I\'m so happy to see you. Come on, let\'s go and play together, it will be so much fun!',
    ko: '안녕! 너를 만나서 정말 기뻐. 어서 같이 놀러 가자, 진짜 재미있을 거야!',
    es: '¡Hola! Estoy muy contento de verte. ¡Vamos a jugar juntos, va a ser muy divertido!',
    ja: 'やあ！会えてすごくうれしいな。ねえ、いっしょにあそびに行こうよ。ぜったい楽しいよ！',
    zh: '嗨！见到你我好开心呀。快来，我们一起去玩吧，一定会特别好玩！'
  },
  guide: {
    en: 'Welcome, traveller. Sit with me a while, and I will tell you how we lived in my time.',
    ko: '어서 와요, 여행자님. 잠시 내 곁에 앉아 봐요. 내가 살던 시대 이야기를 들려줄게요.',
    es: 'Bienvenido, viajero. Siéntate conmigo un rato y te contaré cómo vivíamos en mi época.',
    ja: 'ようこそ、旅の人。しばらくここにすわって。わたしの時代のくらしを話してあげよう。',
    zh: '欢迎你，远方的旅人。来，坐一会儿，我给你讲讲我们那个时代的生活。'
  },
  boss: {
    en: 'Hmph! Nobody ever solves my riddles. But maybe… just maybe… you could be the one?',
    ko: '흥! 아무도 내 수수께끼를 못 풀었다고. 그런데 혹시… 정말 혹시… 네가 풀 수 있을까?',
    es: '¡Hmpf! Nadie resuelve nunca mis acertijos. Pero quizás… solo quizás… ¿tú podrías?',
    ja: 'ふん！だれもわたしのなぞなぞをとけたことがないのだ。でも、もしかして…きみなら、とけるかな？',
    zh: '哼！从来没有人能解开我的谜语。不过，也许……也许你可以？'
  }
};
const REF_ADULT = 'adult';
const REF_CHILD = 'child';
const REF_GUIDE = 'guide';
const REF_BOSS = 'boss';

/** Pitch windows (median Hz). */
const MAN = [95, 165];
const OLD_MAN = [85, 150];
const WOMAN = [165, 255];
const CHILD = [220, 340];
/** Said of every voice: what makes it sound like a person rather than a performance. */
const REAL = ' Natural, relaxed everyday speech with a real human voice at a comfortable, natural pitch; not exaggerated, not high-pitched, not cartoonish.';
const KID = ' A real child chatting calmly and naturally with a friend, at a child\'s ordinary speaking pitch; not shouting, not an adult imitating a child, not cartoonish, not squeaky or shrill.';

export const CAST = {
  hoot: V('A warm, clear, friendly male teacher in his thirties with a soft, rounded mid-range voice. Kind and patient, smiling as he speaks, never rushed; a primary-school teacher talking to young children.' + REAL, 11, null, MAN),
  tock: V('An elderly male storyteller in his sixties with a deep, cosy and slightly gravelly voice. Unhurried and warm, like a grandfather telling a story by the fire, with a twinkle of wonder.' + REAL, 23, null, OLD_MAN),
  gizmo: V('A playful young female inventor in her twenties with a clear, friendly, natural voice in a comfortable mid range. Curious and cheerful, talks with a grin, always clear and easy to follow.' + REAL, 37, null, WOMAN),
  townsfolk: V('A cheerful, chatty young woman in her twenties with a light, friendly voice, like a kind shopkeeper in a small village who loves to share tips.' + REAL, 41, null, WOMAN),
  'buddy-fox': V('A cheeky, energetic boy about eight years old, proud and excited.' + KID, 51, REF_CHILD, CHILD),
  'buddy-robot': V('A cheerful, careful boy about nine years old with clear, tidy diction; a real child, not robotic.' + KID, 53, REF_CHILD, CHILD),
  'buddy-dragon': V('A brave, enthusiastic girl about eight years old with a confident, slightly husky voice and a happy laugh.' + KID, 59, REF_CHILD, CHILD),
  'buddy-puff': V('A soft, sweet, gentle girl about six years old who giggles a little; shy and kind.' + KID, 61, REF_CHILD, CHILD),
  'buddy-bunny': V('A happy, friendly girl about seven years old.' + KID, 67, REF_CHILD, CHILD),
  'boss-1': V('A grumpy but cuddly cloud character spoken by a girl about nine years old: pouty, sulky and sighing, playful and never scary; delighted and giggly when cheered up.' + KID, 71, REF_BOSS, CHILD),
  'boss-2': V('A pompous, theatrical sphinx: a grand, rich baritone man\'s voice, dramatic and a little sulky, playful and never menacing.' + REAL, 73, REF_BOSS, [85, 170]),
  'boss-3': V('A fizzy, excitable little wizard spoken by a boy about ten years old: proud, dramatic and silly, never scary.' + KID, 79, REF_BOSS, CHILD),
  'boss-4': V('A big, gentle yeti: a deep, warm but soft and friendly man\'s voice, grumbly and theatrical, more cuddly than scary.' + REAL, 83, REF_BOSS, [80, 150]),
  'boss-5': V('A mopey, dreamy moth: a soft, breathy, melancholy woman\'s voice in a low-mid range that sighs a lot, gentle and funny, never scary.' + REAL, 89, REF_BOSS, WOMAN),
  'boss-6': V('A crabby sea captain: a gruff, salty middle-aged man\'s voice with comic grumbling, playful and never menacing.' + REAL, 97, REF_BOSS, [85, 175]),
  'boss-7': V('A gloomy little robot spoken by a boy about ten years old: flat and deadpan with comic sighs, playful and never menacing; no robotic effects.' + KID, 101, REF_BOSS, CHILD),
  // The Great Tree (the forest): its teachers and puzzle bosses.
  nutmeg: V('A bright, quick young woman in her twenties with a cheerful, clear, natural voice in a comfortable mid range, like a lively camp counsellor who loves counting games; patient and encouraging.' + REAL, 501, null, WOMAN),
  bramble: V('A big, gentle elderly man in his sixties with a deep, slow, cosy voice, like a grandfather telling forest stories by the fire, warm and kind.' + REAL, 503, null, OLD_MAN),
  ribbit: V('An excitable young man in his twenties with a friendly, clear, natural voice in a comfortable mid range, curious and giggly, always clear when explaining.' + REAL, 507, null, MAN),
  'forest-boss-1': V('A grumbly little mouse spoken by a girl about seven years old: squeaky-cross in a funny way, playful and never scary; delighted when cheered up.' + KID, 511, REF_BOSS, CHILD),
  'forest-boss-2': V('A prickly, huffy hedgehog: a fussy man in his thirties with a comic, grumpy voice, playful and never menacing.' + REAL, 513, REF_BOSS, MAN),
  'forest-boss-3': V('A boastful squirrel knight spoken by a boy about ten years old: proud and dramatic, silly and never scary.' + KID, 517, REF_BOSS, CHILD),
  'forest-boss-4': V('A dreamy blossom sprite: a soft, airy young woman\'s voice that sighs and giggles, gentle and never scary.' + REAL, 523, REF_BOSS, WOMAN),
  'forest-boss-5': V('A flustered mother duck: a warm, busy, comic woman in her forties who fusses and huffs, playful and never menacing.' + REAL, 527, REF_BOSS, WOMAN),
  'forest-boss-6': V('A sleepy sunflower puff spoken by a girl about eight years old: yawny and pouty, sweet and never scary.' + KID, 529, REF_BOSS, CHILD),
  'forest-boss-7': V('A grand, star-gazing dragon: a rich, theatrical baritone man\'s voice, dramatic and a little sulky, playful and never menacing.' + REAL, 533, REF_BOSS, [85, 170]),
  // The sea islands (the Lagoon): their teachers and puzzle bosses.
  pip: V('A jolly young male sea captain in his late twenties with a bright, warm, clear mid-range voice. Brisk and cheerful like a friendly sailing instructor, patient and encouraging with young children.' + REAL, 301, null, MAN),
  inka: V('A gentle elderly woman storyteller in her sixties with a soft, cosy, slightly husky voice. Unhurried and warm, like a grandmother telling sea tales by the shore, full of wonder.' + REAL, 303, null, WOMAN),
  splash: V('A bubbly young female marine scientist in her twenties with a clear, friendly, natural voice in a comfortable mid range. Curious and playful, laughs easily, always clear when explaining.' + REAL, 307, null, WOMAN),
  'sea-boss-1': V('A grumpy little crab spoken by a boy about nine years old: huffy and pouty, snappy in a funny way, playful and never scary; delighted when cheered up.' + KID, 311, REF_BOSS, CHILD),
  'sea-boss-2': V('A dramatic, sulky octopus: a theatrical woman in her thirties with a rich, playful voice and big sighs, never menacing.' + REAL, 313, REF_BOSS, WOMAN),
  'sea-boss-3': V('A slow, sleepy old sea turtle: a deep, drowsy, kindly man\'s voice with big yawns, grumbly but more cuddly than scary.' + REAL, 317, REF_BOSS, OLD_MAN),
  'sea-boss-4': V('A proud little penguin lighthouse keeper spoken by a girl about nine years old: bossy and fussy in a funny way, playful and never scary.' + KID, 331, REF_BOSS, CHILD),
  'sea-boss-5': V('A shy, bubbly sea-foam spirit: a soft, airy young woman\'s voice that giggles and pouts, gentle and never scary.' + REAL, 337, REF_BOSS, WOMAN),
  'sea-boss-6': V('A sulky, sleepy seal: a mellow man in his thirties with a lazy, grumbly, comic voice, playful and never menacing.' + REAL, 347, REF_BOSS, MAN),
  'sea-boss-7': V('A worried little submarine robot spoken by a boy about ten years old: nervous and fussy with comic sighs, playful and never menacing; no robotic effects.' + KID, 349, REF_BOSS, CHILD),
  // The Desert of the Pyramids: its teachers and puzzle bosses.
  lotus: V('A warm, cheerful woman in her thirties with a soft, rounded, friendly voice in a comfortable mid range. Motherly and unhurried, like a kind primary-school teacher sharing out snacks fairly, patient and encouraging with young children.' + REAL, 701, null, WOMAN),
  reed: V('A gentle, scholarly man in his fifties with a calm, warm, slightly soft voice. Unhurried and kind, like a favourite librarian reading an old story aloud, with quiet wonder.' + REAL, 703, null, MAN),
  sandy: V('A curious young man in his twenties with a bright, friendly, clear voice in a comfortable mid range. Playful and quick to laugh, like a science-museum explainer, always clear when explaining.' + REAL, 707, null, MAN),
  'desert-boss-1': V('A proud little sphinx spoken by a girl about nine years old: bossy and grand in a funny way, stickler for the rules, playful and never scary; delighted when cheered up.' + KID, 711, REF_BOSS, CHILD),
  'desert-boss-2': V('A grumpy old camel: a slow, droning, comically huffy man in his fifties who sighs a lot, more cuddly than scary, never menacing.' + REAL, 713, REF_BOSS, OLD_MAN),
  'desert-boss-3': V('A lazy, sunbathing gecko: a drowsy, relaxed young woman with a lazy drawl and big yawns, funny and never scary.' + REAL, 717, REF_BOSS, WOMAN),
  'desert-boss-4': V('A bouncy, excitable scarab beetle spoken by a boy about ten years old: quick and giggly, a little show-off, playful and never scary.' + KID, 719, REF_BOSS, CHILD),
  'desert-boss-5': V('A puffed-up hot-air puff: a jolly, blustery man in his thirties who huffs and puffs in a comic way, playful and never menacing.' + REAL, 721, REF_BOSS, MAN),
  'desert-boss-6': V('A strict but kindly meerkat librarian: a prim woman in her forties who speaks in a hushed, fussy whisper-voice, comic and never scary.' + REAL, 727, REF_BOSS, WOMAN),
  'desert-boss-7': V('A dreamy fennec fox who listens to the stars, spoken by a girl about ten years old: soft, hushed and a little mysterious, gentle and never scary.' + KID, 731, REF_BOSS, CHILD),
  // The Moon: its teachers and puzzle bosses.
  mochi: V('A gentle, sunny young woman in her late twenties with a soft, warm, clear voice in a comfortable mid range. Patient and smiling, like a kind kindergarten teacher who counts in a happy sing-song rhythm.' + REAL, 901, null, WOMAN),
  ginger: V('A kindly grandfather in his late sixties with a warm, slightly gravelly, unhurried voice. A retired captain telling stories by a window full of stars, with gentle humour and quiet wonder.' + REAL, 903, null, OLD_MAN),
  comet: V('A cheerful young woman in her twenties with a bright, clear, friendly voice in a comfortable mid range. Curious and upbeat, like a science-centre presenter, always clear when explaining.' + REAL, 907, null, WOMAN),
  'moon-boss-1': V('A sleepy, huffy little water bear spoken by a boy about nine years old: yawny and grumbly in a funny way, cuddly and never scary; delighted when cheered up.' + KID, 911, REF_BOSS, CHILD),
  'moon-boss-2': V('A fussy little hamster captain spoken by a girl about nine years old: bossy about the countdown in a funny way, playful and never scary.' + KID, 913, REF_BOSS, CHILD),
  'moon-boss-3': V('A bouncy, dusty little robot pup spoken by a boy about eight years old: excitable and a bit sulky in a funny way, playful and never scary; no robotic effects.' + KID, 917, REF_BOSS, CHILD),
  'moon-boss-4': V('A dreamy, fluttery luna moth: a soft, airy young woman who drifts off mid-sentence and giggles, gentle and never scary.' + REAL, 919, REF_BOSS, WOMAN),
  'moon-boss-5': V('A pouty, sulky axolotl: a mellow young man in his twenties with a comic, sighing, lazy voice, playful and never menacing.' + REAL, 921, REF_BOSS, MAN),
  'moon-boss-6': V('A floaty, giggly moon jelly: a soft, bubbly woman in her thirties with a slow, glittery, sing-song voice, gentle and never scary.' + REAL, 927, REF_BOSS, WOMAN),
  'moon-boss-7': V('A zippy, proud little star puff spoken by a girl about ten years old: quick, sparkly and a little show-off, playful and never scary.' + KID, 931, REF_BOSS, CHILD),
  // Mars: its teachers and puzzle bosses.
  ruby: V('A bubbly, warm young woman in her twenties with a bright, clear, friendly voice in a comfortable mid range. Playful and encouraging, like a lively swimming-camp counsellor who turns sums into games, always patient.' + REAL, 1101, null, WOMAN),
  woolly: V('A gentle, kindly grandfather in his late sixties with a soft, warm, unhurried voice and a quiet chuckle. A dreamy old professor telling the story of the red planet by lamplight, full of wonder.' + REAL, 1103, null, OLD_MAN),
  digby: V('An enthusiastic young man in his twenties with a friendly, clear, natural voice in a comfortable mid range. Curious and cheerful, like a geology student who has just found a great rock, always clear when explaining.' + REAL, 1107, null, MAN),
  'mars-boss-1': V('A very relaxed, sleepy capybara spoken by a boy about nine years old: slow, contented and yawny in a funny way, cuddly and never scary; delighted when cheered up.' + KID, 1111, REF_BOSS, CHILD),
  'mars-boss-2': V('A fussy little rover-bot with its wheels stuck, spoken by a boy about eight years old: huffy and impatient in a funny way, playful and never scary; no robotic effects.' + KID, 1113, REF_BOSS, CHILD),
  'mars-boss-3': V('A shivery, fluffy chinchilla spoken by a girl about nine years old: brrr-ing and a bit dramatic in a funny way, sweet and never scary.' + KID, 1117, REF_BOSS, CHILD),
  'mars-boss-4': V('A very slow, gentle sloth: a mellow young man in his twenties who talks… slowly… with comic pauses and a sleepy smile, playful and never menacing.' + REAL, 1119, REF_BOSS, MAN),
  'mars-boss-5': V('An excitable little pika weather reporter spoken by a girl about ten years old: quick, squeaky-bright and bossy about the forecast in a funny way, playful and never scary.' + KID, 1121, REF_BOSS, CHILD),
  'mars-boss-6': V('A whirly, giggly dust devil puff: a bubbly woman in her thirties with a breezy, spinning, sing-song voice, a bit dizzy and very silly, gentle and never scary.' + REAL, 1127, REF_BOSS, WOMAN),
  'mars-boss-7': V('A proud, polite little armadillo knight guarding the caldera rim, spoken by a boy about ten years old: grand and a bit pompous in a funny way, playful and never scary.' + KID, 1131, REF_BOSS, CHILD),
  // The Sky Castle: its teachers and puzzle bosses.
  biscuit: V('A cheerful, bouncy young woman in her twenties with a bright, clear, warm voice in a comfortable mid range. Tidy and encouraging, like a friendly clockmaker\'s apprentice who counts in a happy tick-tock rhythm, always patient.' + REAL, 1301, null, WOMAN),
  hartley: V('A kindly grandfather in his late sixties with a warm, mellow, unhurried voice and a soft chuckle. An old librarian-scholar opening a treasured book by candlelight, a little grand but gentle, full of wonder.' + REAL, 1303, null, OLD_MAN),
  sprocket: V('An inventive, cheerful young woman in her twenties with a friendly, clear, natural voice in a comfortable mid range. Busy and a bit excitable, like a young engineer showing off a new gadget, always clear when explaining.' + REAL, 1307, null, WOMAN),
  'castle-boss-1': V('A huffy, honking little goose guarding the castle gate, spoken by a girl about nine years old: bossy and fussy in a funny way, playful and never scary; softens when asked nicely.' + KID, 1311, REF_BOSS, CHILD),
  'castle-boss-2': V('A giggly little lamb tangled in maypole ribbons, spoken by a girl about eight years old: sweet, a bit dramatic and wriggly in a funny way, gentle and never scary.' + KID, 1313, REF_BOSS, CHILD),
  'castle-boss-3': V('A chattery magpie who loves shiny things: a bubbly young woman in her twenties, quick and sing-song, a little greedy for buttons in a funny way, playful and never scary.' + REAL, 1317, REF_BOSS, WOMAN),
  'castle-boss-4': V('A cheeky little kid goat who nibbled the bell rope, spoken by a boy about nine years old: munchy, sheepish and giggly in a funny way, playful and never scary.' + KID, 1319, REF_BOSS, CHILD),
  'castle-boss-5': V('A wriggly, mischievous ferret who hides the gardener\'s tools: a playful young man in his twenties with a quick, sneaky-giggly voice, silly and never menacing.' + REAL, 1321, REF_BOSS, MAN),
  'castle-boss-6': V('A sulky little pony who dreams of riding a balloon, spoken by a girl about ten years old: pouty and wistful in a funny way, sweet and never scary; delighted when cheered up.' + KID, 1327, REF_BOSS, CHILD),
  'castle-boss-7': V('A little green dragon keeping the Crown Garden, spoken by a boy about ten years old: tries a big rawr and then turns shy and friendly, proud of his riddles in a funny way, playful and never scary.' + KID, 1331, REF_BOSS, CHILD)
};

/**
 * Per-language voices, where a language's listeners expect someone
 * different: Korean children's content uses younger, brighter adult voices,
 * so the Korean cast is younger. A character with its own design here is its
 * own anchor in that language (it is not matched to the English voice).
 */
export const CAST_BY_LANG = {
  ko: {
    hoot: V('A friendly young Korean male teacher in his mid-twenties, like a kind after-school or kindergarten teacher: a clear, warm, natural young man\'s voice in a comfortable mid-low range, smiling and gentle, calm and patient.' + REAL, 111, null, [105, 175]),
    tock: V('A gentle Korean man in his late forties with a warm, soft, calm storyteller\'s voice, kind and unhurried, with a twinkle of wonder.' + REAL, 123, null, MAN),
    gizmo: V('A cheerful Korean university student in her early twenties who loves gadgets: a clear, friendly, natural voice in a comfortable mid range, curious and cheerful.' + REAL, 137, null, [175, 260]),
    nutmeg: V('A cheerful Korean young woman of about twenty-two with a bright, clear, natural voice in a comfortable mid range, like a lively after-school teacher who loves counting games.' + REAL, 601, null, [175, 260]),
    bramble: V('A gentle Korean man in his late forties with a warm, deep, calm storyteller\'s voice, cosy and unhurried.' + REAL, 603, null, MAN),
    ribbit: V('A cheerful Korean university student in his early twenties with a friendly, clear, natural young man\'s voice, curious and playful.' + REAL, 607, null, [105, 175]),
    pip: V('A cheerful young Korean man in his mid-twenties, like a friendly sailing-camp counsellor: a bright, clear, natural young man\'s voice in a comfortable mid range, jolly, patient and kind.' + REAL, 401, null, [105, 175]),
    inka: V('A gentle Korean woman in her late forties with a soft, warm, calm storyteller\'s voice, cosy and unhurried, full of wonder.' + REAL, 403, null, [170, 250]),
    splash: V('A bubbly Korean university student in her early twenties who studies the ocean: a clear, friendly, natural voice in a comfortable mid range, curious and playful.' + REAL, 407, null, [175, 260]),
    lotus: V('A warm Korean woman of about twenty-five with a soft, bright, friendly voice in a comfortable mid range, like a kind kindergarten teacher sharing out snacks fairly, patient and smiling.' + REAL, 801, null, [175, 260]),
    reed: V('A gentle Korean man in his late forties with a calm, warm, soft storyteller\'s voice, like a kind librarian reading an old tale aloud, unhurried and full of wonder.' + REAL, 803, null, MAN),
    sandy: V('A cheerful Korean university student in his early twenties who loves science: a bright, friendly, natural young man\'s voice in a comfortable mid range, curious and playful.' + REAL, 807, null, [105, 175]),
    mochi: V('A gentle Korean woman of about twenty-four with a soft, bright, warm voice in a comfortable mid range, like a kind kindergarten teacher counting rice cakes with the children, patient and smiling.' + REAL, 1001, null, [175, 260]),
    ginger: V('A kindly Korean grandfather in his sixties with a warm, calm, slightly husky storyteller\'s voice, unhurried and full of wonder, like a retired captain telling stories of the stars.' + REAL, 1003, null, OLD_MAN),
    comet: V('A cheerful Korean university student in her early twenties who loves space: a bright, clear, friendly natural voice in a comfortable mid range, curious and upbeat.' + REAL, 1007, null, [175, 260]),
    ruby: V('A bubbly Korean woman of about twenty-four with a bright, clear, warm voice in a comfortable mid range, like a lively after-school teacher who turns sums into games, patient and smiling.' + REAL, 1201, null, [175, 260]),
    woolly: V('A kindly Korean grandfather in his sixties with a soft, warm, calm storyteller\'s voice and a quiet chuckle, unhurried and full of wonder, like an old professor telling stories of the red planet.' + REAL, 1203, null, OLD_MAN),
    digby: V('A cheerful Korean university student in his early twenties who loves rocks and science: a bright, friendly, natural young man\'s voice in a comfortable mid range, curious and upbeat.' + REAL, 1207, null, [105, 175]),
    biscuit: V('A cheerful Korean woman of about twenty-three with a bright, clear, warm voice in a comfortable mid range, like a lively after-school teacher who counts with the children in a tick-tock rhythm, patient and smiling.' + REAL, 1401, null, [175, 260]),
    hartley: V('A kindly Korean grandfather in his sixties with a warm, mellow, calm storyteller\'s voice and a soft chuckle, unhurried and full of wonder, like an old librarian reading a treasured book aloud.' + REAL, 1403, null, OLD_MAN),
    sprocket: V('A cheerful Korean university student in her early twenties who loves building gadgets: a bright, clear, friendly natural voice in a comfortable mid range, curious and upbeat.' + REAL, 1407, null, [175, 260]),
    townsfolk: V('A friendly Korean young woman of about twenty with a soft, friendly, chatty voice in a comfortable mid range, like a kind girl helping at her family\'s village shop.' + REAL, 141, null, [175, 260])
  }
};

/** History guides: a varied cast, picked by lesson so each guide keeps one voice. */
const GUIDE_VOICES = [
  ['A friendly woman in her thirties with a warm, clear, calm voice.', WOMAN],
  ['A cheerful man in his twenties with a bright, open, lively voice.', MAN],
  ['A gentle older woman in her sixties with a soft, kind, wise voice.', WOMAN],
  ['A confident man in his forties with a rich, steady, warm voice.', MAN],
  ['A cheerful woman in her twenties with a warm, curious, natural voice.', WOMAN],
  ['A thoughtful older man in his sixties with a mellow, calm, kindly voice.', OLD_MAN],
  ['A lively woman in her forties with a strong, warm, expressive voice.', WOMAN],
  ['A shy, gentle young man in his twenties with a soft, light voice.', MAN],
  ['A proud, friendly man in his fifties with a deep, resonant, welcoming voice.', MAN]
];
/** The Korean guides are a decade or two younger. */
const YOUNGER = { sixties: 'forties', fifties: 'thirties', forties: 'thirties' };
const younger = (d) => d.replace(/in (his|her) (sixties|fifties|forties)/, (_, p, a) => `in ${p} ${YOUNGER[a]}`).replace('older ', '');
const GUIDE_SUFFIX = ' A storyteller from long ago talking to a child, natural with no put-on accent, warm and clear.' + REAL;

/** The guide's index among the history lessons decides their voice. */
export function guideVoice(index, lang = null) {
  const [d, f0] = GUIDE_VOICES[index % GUIDE_VOICES.length];
  const v = V((lang === 'ko' ? younger(d) : d) + GUIDE_SUFFIX, 200 + index, REF_GUIDE, f0);
  return lang === 'ko' ? { ...v, own: true } : v;
}

/**
 * The voice for a character id in a language (guides need their index among
 * the history lessons). `own` is true when the language has its own design,
 * so it is not matched to the English anchor.
 */
export function castFor(char, guideIndex = null, lang = null) {
  const mine = lang && CAST_BY_LANG[lang]?.[char];
  if (mine) return { ...mine, ref: mine.ref ?? REF_ADULT, own: true };
  if (CAST[char]) return { ...CAST[char], ref: CAST[char].ref ?? REF_ADULT, own: false };
  if (char.startsWith('guide-') && guideIndex != null) return guideVoice(guideIndex, lang);
  return null;
}

/** A short spoken-style instruction for a line's delivery (the model takes it as a hint). */
export function paceInstruction(floor) {
  if (floor && floor <= 2) return 'Speak a little slower than usual, relaxed and clear, for a six-year-old.';
  if (floor && floor <= 4) return 'Speak at an easy, clear pace for an eight-year-old.';
  return 'Speak naturally and clearly.';
}

/** Which reference a line is spoken from: a slower, clearer one for the lessons of floors 1–2 (ages 6–7). */
export const paceVariant = (line) => (line.kind !== 'bark' && line.floor && line.floor <= 2 ? 'slow' : 'normal');

/**
 * The committed set: every bark, and every line of floors 1–2. The rest is
 * generated locally (npm run voice:gen -- --tier extra) and git-ignored.
 */
export const isCoreLine = (line) => line.kind === 'bark' || (line.floor >= 1 && line.floor <= 2);

/* ---------------------------------------------------------------- the manifest */

export const emptyGenManifest = () => ({ version: GEN_MANIFEST_VERSION, generated: true, updated: null, model: { name: GEN_CREDIT.model, weights: GEN_CREDIT.weights, licence: GEN_CREDIT.licence, url: GEN_CREDIT.url }, voices: {}, lines: {} });

const LANG_RE = /^[a-z]{2}$/;
/** Problems with a generated-voice manifest ([] when it is fine). `exists(path)` checks a file (optional). */
export function validateGenManifest(m, { exists = null } = {}) {
  const out = [];
  if (!m || typeof m !== 'object') return ['not an object'];
  if (m.version !== GEN_MANIFEST_VERSION) out.push(`version must be ${GEN_MANIFEST_VERSION}`);
  if (m.generated !== true) out.push('generated must be true');
  if (!m.model || typeof m.model.name !== 'string' || typeof m.model.licence !== 'string' || typeof m.model.url !== 'string') out.push('model: name, licence and url');
  if (!m.lines || typeof m.lines !== 'object') return [...out, 'no lines'];
  for (const [lang, chars] of Object.entries(m.lines)) {
    if (!LANG_RE.test(lang)) out.push(`language ${lang}`);
    for (const [char, lines] of Object.entries(chars ?? {})) {
      if (!isCharId(char)) out.push(`${lang}: character ${char}`);
      for (const [line, e] of Object.entries(lines ?? {})) {
        const at = `${lang}/${char}/${line}`;
        if (!isLineId(line)) out.push(`${at}: line id`);
        const files = Object.entries(e?.files ?? {});
        if (!files.length) out.push(`${at}: no files`);
        for (const [ext, p] of files) {
          if (!FORMATS[ext]) out.push(`${at}: format ${ext}`);
          if (p !== `${lang}/${char}/${line}.${ext}`) out.push(`${at}: file path ${p}`);
          else if (exists && !exists(p)) out.push(`${at}: missing file ${p}`);
        }
        if (!(e?.duration > 0 && e.duration <= MAX_SECONDS)) out.push(`${at}: duration`);
        if (!Number.isFinite(Date.parse(e?.take))) out.push(`${at}: take date`);
      }
    }
  }
  return out;
}

/** Merge a second generated manifest's lines into a first (the local, git-ignored extras into the committed core). */
export function mergeGenManifests(core, extra) {
  const out = { ...(core ?? emptyGenManifest()), lines: {} };
  for (const m of [core, extra]) {
    for (const [lang, chars] of Object.entries(m?.lines ?? {})) {
      for (const [char, lines] of Object.entries(chars ?? {})) Object.assign(((out.lines[lang] ??= {})[char] ??= {}), lines);
    }
  }
  return out;
}

/**
 * Which voice plays a line: a person's recording (`human`, the voice studio's
 * manifest) always wins; else the generated voice (`generated`); else null,
 * silence. Same language and character only, as for recordings.
 * @returns {{ source: 'human' | 'generated', char: string, line: string, entry: object } | null}
 */
export function selectVoice(human, generated, query) {
  const h = selectRecording(human, query);
  if (h) return { source: 'human', ...h };
  // With no character asked for, a recording by anyone beats a generated voice.
  const g = selectRecording(generated, query);
  return g ? { source: 'generated', ...g } : null;
}
