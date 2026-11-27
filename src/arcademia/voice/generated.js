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
/** The new worlds' women teachers: calm, middle-aged speaking voices sit in the lower part of the women's range. */
const MID_WOMAN = [170, 235];
/** Said of every voice: what makes it sound like a person rather than a performance. */
const REAL = ' Natural, relaxed everyday speech with a real human voice at a comfortable, natural pitch; not exaggerated, not high-pitched, not cartoonish.';
const KID = ' A real child chatting calmly and naturally with a friend, at a child\'s ordinary speaking pitch; not shouting, not an adult imitating a child, not cartoonish, not squeaky or shrill.';
/** The new worlds' teachers: middle-aged, gentle and reassuring, an angel-like warmth that is still a real person. */
const TEACH = ' Kind, calm and reassuring, with a soft, comforting warmth like a guardian angel in a picture book, yet a real, grounded human voice: never breathy, whispery, preachy or over-acted. Clear, unhurried diction for young children.' + REAL;
/** The Sky Castle's grown-ups: a gentle medieval storybook tone, in plain modern words. */
const TALE = ' A gentle storybook tone, like a kindly storyteller in an old castle, while speaking plain, modern, everyday words.';
/** The Sky Castle's puzzle creatures: a hint of a castle storybook. */
const TALE_KID = ' Like a friendly character from a gentle castle storybook.';

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
  // The six study worlds added after the mountain. Their teachers are warm, gentle, middle-aged
  // grown-ups with a soft, reassuring, angel-like warmth (TEACH); their puzzle bosses are cute,
  // playful and friendly (some are children); the Sky Castle's cast adds a storybook tone (TALE).
  // The Great Tree (the forest): its teachers and puzzle bosses.
  nutmeg: V('A warm, gentle woman in her early forties with a soft, bright, smiling voice in a comfortable mid range, like a beloved primary-school teacher who makes counting feel cosy and safe.' + TEACH, 501, null, MID_WOMAN),
  bramble: V('A kindly man in his mid fifties with a deep, mellow, velvety voice, unhurried and cosy, like a caring teacher telling forest stories by a warm fire.' + TEACH, 503, null, MAN),
  ribbit: V('A friendly, gentle man in his early forties with a clear, light, warm baritone voice, softly curious and cheerful, like a kind nature teacher pointing at a pond.' + TEACH, 507, null, MAN),
  'forest-boss-1': V('A cute, pouty little mouse spoken by a girl about seven years old: a little cross in a funny, sweet way, playful and friendly, never scary; delighted when cheered up.' + KID, 511, REF_BOSS, CHILD),
  'forest-boss-2': V('A huffy but huggable hedgehog: a friendly man in his thirties with a light, comic, fussy voice, more funny than grumpy, playful and never menacing.' + REAL, 513, REF_BOSS, MAN),
  'forest-boss-3': V('A boastful little squirrel knight spoken by a boy about ten years old: proud and silly, friendly and playful, never scary.' + KID, 517, REF_BOSS, CHILD),
  'forest-boss-4': V('A dreamy blossom sprite: a sweet, gentle young woman with a soft, smiling voice who giggles, playful and friendly, never scary.' + REAL, 523, REF_BOSS, WOMAN),
  'forest-boss-5': V('A flustered, cuddly mother duck: a warm, friendly woman in her forties who fusses and giggles, funny and kind, never menacing.' + REAL, 527, REF_BOSS, WOMAN),
  'forest-boss-6': V('A sleepy sunflower puff spoken by a girl about eight years old: yawny and pouty, sweet and cuddly, never scary.' + KID, 529, REF_BOSS, CHILD),
  'forest-boss-7': V('A friendly star-gazing dragon: a warm, gentle baritone man\'s voice, a little grand and a little shy, cuddly and playful, never menacing.' + REAL, 533, REF_BOSS, [85, 170]),
  // The sea islands (the Lagoon): their teachers and puzzle bosses.
  pip: V('A cheerful, gentle man in his mid forties with a bright, warm, clear voice in a comfortable mid range, like a kind sailing teacher who is never in a hurry.' + TEACH, 301, null, MAN),
  inka: V('A gentle woman in her early fifties with a soft, warm, slightly husky voice, like a kind teacher telling sea tales by the shore, full of quiet wonder.' + TEACH, 303, null, MID_WOMAN),
  splash: V('A friendly woman in her early forties with a clear, light, warm voice in a comfortable mid range, softly playful, like a kind aquarium teacher explaining things simply.' + TEACH, 307, null, MID_WOMAN),
  'sea-boss-1': V('A cute, pouty little crab spoken by a boy about nine years old: huffy in a funny, sweet way, playful and friendly, never scary; delighted when cheered up.' + KID, 311, REF_BOSS, CHILD),
  'sea-boss-2': V('A dramatic, giggly octopus: a playful woman in her thirties with a warm, friendly voice and big comic sighs, never menacing.' + REAL, 313, REF_BOSS, WOMAN),
  'sea-boss-3': V('A slow, sleepy old sea turtle: a soft, drowsy, kindly man\'s voice with cosy yawns, cuddly and friendly, never scary.' + REAL, 317, REF_BOSS, OLD_MAN),
  'sea-boss-4': V('A proud little penguin lighthouse keeper spoken by a girl about nine years old: bossy in a cute, funny way, playful and friendly, never scary.' + KID, 331, REF_BOSS, CHILD),
  'sea-boss-5': V('A shy, bubbly sea-foam spirit spoken by a girl about eight years old: soft and giggly, sweet and friendly, never scary.' + KID, 337, REF_BOSS, CHILD),
  'sea-boss-6': V('A sleepy, cuddly seal: a mellow, friendly man in his thirties with a lazy, smiling, comic voice, playful and never menacing.' + REAL, 347, REF_BOSS, MAN),
  'sea-boss-7': V('A worried little submarine robot spoken by a boy about ten years old: nervous and fussy in a cute, funny way, friendly and never menacing; no robotic effects.' + KID, 349, REF_BOSS, CHILD),
  // The Desert of the Pyramids: its teachers and puzzle bosses.
  lotus: V('A warm, motherly woman in her mid forties with a soft, rounded, friendly voice in a comfortable mid range, like a kind teacher sharing out snacks fairly, smiling as she speaks.' + TEACH, 701, null, MID_WOMAN),
  reed: V('A gentle, scholarly man in his early fifties with a calm, soft, warm voice, like a favourite librarian reading an old story aloud, with quiet wonder.' + TEACH, 703, null, MAN),
  sandy: V('A friendly man in his early forties with a bright, clear, warm voice in a comfortable mid range, softly playful, like a kind science-museum guide, always clear when explaining.' + TEACH, 707, null, MAN),
  'desert-boss-1': V('A proud little sphinx spoken by a girl about nine years old: bossy and grand in a cute, funny way, a stickler for the rules, playful and never scary; delighted when cheered up.' + KID, 711, REF_BOSS, CHILD),
  'desert-boss-2': V('A sleepy, huffy old camel: a slow, soft, comic man\'s voice in his fifties who sighs a lot, cuddly and friendly, never menacing.' + REAL, 713, REF_BOSS, OLD_MAN),
  'desert-boss-3': V('A lazy, sunbathing gecko spoken by a boy about nine years old: drowsy and relaxed with funny yawns, friendly and never scary.' + KID, 717, REF_BOSS, CHILD),
  'desert-boss-4': V('A bouncy, excitable scarab beetle spoken by a boy about ten years old: quick and giggly, a little show-off, playful and never scary.' + KID, 719, REF_BOSS, CHILD),
  'desert-boss-5': V('A puffed-up hot-air puff: a jolly, friendly man in his thirties who huffs and puffs and laughs in a comic way, playful and never menacing.' + REAL, 721, REF_BOSS, MAN),
  'desert-boss-6': V('A strict but kindly meerkat librarian: a prim, friendly woman in her forties with a soft, hushed, fussy voice, funny and never scary.' + REAL, 727, REF_BOSS, WOMAN),
  'desert-boss-7': V('A dreamy fennec fox who listens to the stars, spoken by a girl about ten years old: soft and wondering, sweet and friendly, never scary.' + KID, 731, REF_BOSS, CHILD),
  // The Moon: its teachers and puzzle bosses.
  mochi: V('A gentle, sunny woman in her early forties with a soft, warm, clear voice in a comfortable mid range, patient and smiling, like a kind teacher who counts in a happy, easy rhythm.' + TEACH, 901, null, MID_WOMAN),
  ginger: V('A kindly man in his late fifties with a warm, slightly gravelly, unhurried voice and gentle humour, like a retired captain telling stories by a window full of stars.' + TEACH, 903, null, MAN),
  comet: V('A cheerful, gentle woman in her mid forties with a bright, clear, friendly voice in a comfortable mid range, like a kind planetarium teacher, always clear when explaining.' + TEACH, 907, null, MID_WOMAN),
  'moon-boss-1': V('A sleepy, huffy little water bear spoken by a boy about nine years old: yawny and grumbly in a cute, funny way, cuddly and never scary; delighted when cheered up.' + KID, 911, REF_BOSS, CHILD),
  'moon-boss-2': V('A fussy little hamster captain spoken by a girl about nine years old: bossy about the countdown in a cute, funny way, playful and never scary.' + KID, 913, REF_BOSS, CHILD),
  'moon-boss-3': V('A bouncy, dusty little robot pup spoken by a boy about eight years old: excitable and a bit sulky in a funny way, friendly and never scary; no robotic effects.' + KID, 917, REF_BOSS, CHILD),
  'moon-boss-4': V('A dreamy, fluttery luna moth: a soft, sweet young woman who drifts off mid-sentence and giggles, gentle and never scary.' + REAL, 919, REF_BOSS, WOMAN),
  'moon-boss-5': V('A pouty, cuddly axolotl: a mellow, friendly young man in his twenties with a comic, sighing, lazy voice, playful and never menacing.' + REAL, 921, REF_BOSS, MAN),
  'moon-boss-6': V('A floaty, giggly moon jelly spoken by a girl about eight years old: slow and bubbly, sweet and friendly, never scary.' + KID, 927, REF_BOSS, CHILD),
  'moon-boss-7': V('A zippy, proud little star puff spoken by a girl about ten years old: quick, sparkly and a little show-off, playful and never scary.' + KID, 931, REF_BOSS, CHILD),
  // Mars: its teachers and puzzle bosses.
  ruby: V('A warm, playful woman in her early forties with a bright, clear, friendly voice in a comfortable mid range, like a kind teacher who turns sums into games, always patient.' + TEACH, 1101, null, MID_WOMAN),
  woolly: V('A gentle, kindly man in his mid fifties with a soft, warm, unhurried voice and a quiet chuckle, like a dreamy old professor telling the story of the red planet by lamplight.' + TEACH, 1103, null, MAN),
  digby: V('A friendly, enthusiastic man in his mid forties with a clear, warm, natural voice in a comfortable mid range, softly cheerful, like a kind geology teacher holding a great rock.' + TEACH, 1107, null, MAN),
  'mars-boss-1': V('A very relaxed, sleepy capybara spoken by a boy about nine years old: slow, contented and yawny in a funny way, cuddly and never scary; delighted when cheered up.' + KID, 1111, REF_BOSS, CHILD),
  'mars-boss-2': V('A fussy little rover-bot with its wheels stuck, spoken by a boy about eight years old: huffy and impatient in a cute, funny way, playful and never scary; no robotic effects.' + KID, 1113, REF_BOSS, CHILD),
  'mars-boss-3': V('A shivery, fluffy chinchilla spoken by a girl about nine years old: brrr-ing and a bit dramatic in a funny way, sweet and never scary.' + KID, 1117, REF_BOSS, CHILD),
  'mars-boss-4': V('A very slow, gentle sloth: a mellow, friendly young man in his twenties who talks slowly with comic pauses and a sleepy smile, playful and never menacing.' + REAL, 1119, REF_BOSS, MAN),
  'mars-boss-5': V('An excitable little pika weather reporter spoken by a girl about ten years old: quick, bright and bossy about the forecast in a cute, funny way, playful and never scary.' + KID, 1121, REF_BOSS, CHILD),
  'mars-boss-6': V('A whirly, giggly dust devil puff: a bubbly, friendly woman in her thirties with a breezy, sing-song voice, a bit dizzy and very silly, gentle and never scary.' + REAL, 1127, REF_BOSS, WOMAN),
  'mars-boss-7': V('A proud, polite little armadillo knight guarding the caldera rim, spoken by a boy about ten years old: grand and a bit pompous in a cute, funny way, playful and never scary.' + KID, 1131, REF_BOSS, CHILD),
  // The Sky Castle: its teachers and puzzle bosses, with a gentle storybook tone.
  biscuit: V('A cheerful, warm woman in her early forties with a bright, clear, kind voice in a comfortable mid range, like a friendly castle clockmaker who counts in a happy tick-tock rhythm, always patient.' + TEACH + TALE, 1301, null, MID_WOMAN),
  hartley: V('A kindly man in his mid fifties with a warm, mellow, unhurried voice and a soft chuckle, like an old castle librarian opening a treasured book by candlelight, gentle and full of wonder.' + TEACH + TALE, 1303, null, MAN),
  sprocket: V('An inventive, friendly woman in her mid forties with a clear, warm, natural voice in a comfortable mid range, softly excited, like a kind castle tinkerer showing a new gadget, always clear when explaining.' + TEACH + TALE, 1307, null, MID_WOMAN),
  'castle-boss-1': V('A huffy, honking little goose guarding the castle gate, spoken by a girl about nine years old: bossy and fussy in a cute, funny way, playful and never scary; softens when asked nicely.' + KID + TALE_KID, 1311, REF_BOSS, CHILD),
  'castle-boss-2': V('A giggly little lamb tangled in maypole ribbons, spoken by a girl about eight years old: sweet, a bit dramatic and wriggly in a funny way, gentle and never scary.' + KID + TALE_KID, 1313, REF_BOSS, CHILD),
  'castle-boss-3': V('A chattery magpie who loves shiny things: a bubbly, friendly young woman in her twenties, quick and sing-song, a little greedy for buttons in a funny way, playful and never scary.' + REAL + TALE_KID, 1317, REF_BOSS, WOMAN),
  'castle-boss-4': V('A cheeky little kid goat who nibbled the bell rope, spoken by a boy about nine years old: munchy, sheepish and giggly in a funny way, playful and never scary.' + KID + TALE_KID, 1319, REF_BOSS, CHILD),
  'castle-boss-5': V('A wriggly, mischievous ferret who hides the gardener\'s tools: a playful, friendly young man in his twenties with a quick, giggly voice, silly and never menacing.' + REAL + TALE_KID, 1321, REF_BOSS, MAN),
  'castle-boss-6': V('A sulky little pony who dreams of riding a balloon, spoken by a girl about ten years old: pouty and wistful in a cute, funny way, sweet and never scary; delighted when cheered up.' + KID + TALE_KID, 1327, REF_BOSS, CHILD),
  'castle-boss-7': V('A little green dragon keeping the Crown Garden, spoken by a boy about ten years old: tries a big rawr and then turns shy and friendly, proud of his riddles in a funny way, playful and never scary.' + KID + TALE_KID, 1331, REF_BOSS, CHILD)
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
    // The new worlds' Korean teachers: warm, gentle grown-ups with the same angel-like warmth,
    // a little younger than their English voices (Korean children's teachers sound younger).
    nutmeg: V('A warm, gentle Korean woman in her late thirties with a soft, bright, smiling voice in a comfortable mid range, like a beloved kindergarten teacher who makes counting feel cosy and safe.' + TEACH, 601, null, [175, 260]),
    bramble: V('A kindly Korean man in his late forties with a warm, deep, mellow voice, unhurried and cosy, like a caring teacher telling forest stories by the fire.' + TEACH, 603, null, MAN),
    ribbit: V('A friendly, gentle Korean man in his late thirties with a clear, light, warm voice, softly curious and cheerful, like a kind nature teacher by a pond.' + TEACH, 607, null, [105, 175]),
    pip: V('A cheerful, gentle Korean man in his early forties with a bright, warm, clear voice in a comfortable mid range, like a kind sailing teacher who is never in a hurry.' + TEACH, 401, null, [105, 175]),
    inka: V('A gentle Korean woman in her late forties with a soft, warm, calm storyteller\'s voice, cosy and unhurried, full of quiet wonder.' + TEACH, 403, null, [170, 250]),
    splash: V('A friendly Korean woman in her late thirties with a clear, light, warm voice in a comfortable mid range, softly playful, like a kind aquarium teacher explaining things simply.' + TEACH, 407, null, [175, 260]),
    lotus: V('A warm, motherly Korean woman in her early forties with a soft, rounded, friendly voice in a comfortable mid range, like a kind teacher sharing out snacks fairly, smiling as she speaks.' + TEACH, 801, null, [175, 260]),
    reed: V('A gentle Korean man in his late forties with a calm, soft, warm storyteller\'s voice, like a kind librarian reading an old tale aloud, with quiet wonder.' + TEACH, 803, null, MAN),
    sandy: V('A friendly Korean man in his late thirties with a bright, clear, warm voice in a comfortable mid range, softly playful, like a kind science-museum guide.' + TEACH, 807, null, [105, 175]),
    mochi: V('A gentle, sunny Korean woman in her late thirties with a soft, warm, clear voice in a comfortable mid range, like a kind kindergarten teacher counting rice cakes with the children.' + TEACH, 1001, null, [175, 260]),
    ginger: V('A kindly Korean man in his early fifties with a warm, calm, slightly husky storyteller\'s voice and gentle humour, like a retired captain telling stories of the stars.' + TEACH, 1003, null, MAN),
    comet: V('A cheerful, gentle Korean woman in her early forties with a bright, clear, friendly voice in a comfortable mid range, like a kind planetarium teacher.' + TEACH, 1007, null, [175, 260]),
    ruby: V('A warm, playful Korean woman in her late thirties with a bright, clear, friendly voice in a comfortable mid range, like a kind after-school teacher who turns sums into games.' + TEACH, 1201, null, [175, 260]),
    woolly: V('A gentle, kindly Korean man in his early fifties with a soft, warm, calm storyteller\'s voice and a quiet chuckle, like an old professor telling stories of the red planet.' + TEACH, 1203, null, MAN),
    digby: V('A friendly Korean man in his early forties with a clear, warm, natural voice in a comfortable mid range, softly cheerful, like a kind geology teacher holding a great rock.' + TEACH, 1207, null, [105, 175]),
    biscuit: V('A cheerful, warm Korean woman in her late thirties with a bright, clear, kind voice in a comfortable mid range, like a friendly teacher who counts with the children in a tick-tock rhythm.' + TEACH + TALE, 1401, null, [175, 260]),
    hartley: V('A kindly Korean man in his early fifties with a warm, mellow, calm storyteller\'s voice and a soft chuckle, like an old castle librarian reading a treasured book aloud.' + TEACH + TALE, 1403, null, MAN),
    sprocket: V('An inventive, friendly Korean woman in her early forties with a clear, warm, natural voice in a comfortable mid range, softly excited, like a kind tinkerer showing a new gadget.' + TEACH + TALE, 1407, null, [175, 260]),
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

/** The Sky Castle's guides tell their stories in a gentle storybook tone. */
const isCastleGuide = (char) => /^guide-h\d+-castle-/.test(char ?? '');

/**
 * The newer worlds' guides share a small pool of voices (as the mountain's 16 guides share nine
 * descriptions), so a handful of reference clips serve them all. Each guide gets a pool voice
 * that fits who they are: w0–w3 and m0–m4 are the women's and men's voices below, g and b a
 * girl and a boy; the Sky Castle's grown-up guides use two gentle storybook voices instead.
 */
const GUIDE_W = [GUIDE_VOICES[0], GUIDE_VOICES[4], GUIDE_VOICES[6], GUIDE_VOICES[2]];
const GUIDE_M = [GUIDE_VOICES[1], GUIDE_VOICES[3], GUIDE_VOICES[5], GUIDE_VOICES[7], GUIDE_VOICES[8]];
const GUIDE_KID = {
  g: ['A bright, friendly girl about eleven years old, curious and cheerful.' + KID, CHILD],
  b: ['A bright, friendly boy about eleven years old, eager and cheerful.' + KID, CHILD]
};
const GUIDE_TALE = {
  w: ['A gentle, warm woman in her fifties with a soft, mellow storyteller\'s voice.', WOMAN],
  m: ['A kindly man in his sixties with a warm, unhurried storyteller\'s voice and a soft chuckle.', OLD_MAN]
};
/** The pool, in a fixed order (its index picks the design seed). */
export const GUIDE_POOL = ['w0', 'w1', 'w2', 'w3', 'm0', 'm1', 'm2', 'm3', 'm4', 'g', 'b', 'tale-w', 'tale-m'];
export const GUIDE_CAST = {
  // the Great Tree (Earth & Weather)
  'earth1-forest-seasons': 'w0', 'earth1-forest-weather': 'b', 'earth2-forest-water-cycle': 'w1', 'earth2-forest-clouds': 'm0',
  'earth3-forest-soil': 'm1', 'earth3-forest-fossils': 'g', 'earth4-forest-rivers': 'm4', 'earth4-forest-wind': 'w2',
  'earth5-forest-weather-station': 'w0', 'earth5-forest-rock-cycle': 'w2', 'earth6-forest-inside-earth': 'w3', 'earth6-forest-forecast': 'w1',
  'earth7-forest-climate-zones': 'w2', 'earth7-forest-forests-climate': 'w0',
  // the Lagoon
  'h1-sea-fishing-village': 'w2', 'h1-sea-rafts-to-ships': 'w0', 'h2-sea-lighthouse-alexandria': 'm2', 'h2-sea-shell-money': 'w1',
  'h3-sea-pacific-wayfinders': 'm0', 'h3-sea-phoenician-traders': 'm1', 'h4-sea-zheng-he': 'm4', 'h4-sea-compass-and-knots': 'w2',
  'h5-sea-chartmakers': 'm3', 'h5-sea-harrison-clock': 'm2', 'h6-sea-hms-challenger': 'b', 'h6-sea-mary-anning': 'w1',
  'h7-sea-trieste-dive': 'm1', 'h7-sea-marie-tharp': 'w0',
  // the desert
  'h1-desert-nile-farmers': 'm0', 'h1-desert-toys-games': 'w1', 'h2-desert-hieroglyphs': 'm3', 'h2-desert-camel-caravans': 'm4',
  'h3-desert-imhotep': 'm2', 'h3-desert-builders-town': 'w2', 'h4-desert-hatshepsut': 'w0', 'h4-desert-petra': 'm1',
  'h5-desert-rosetta-stone': 'm0', 'h5-desert-ibn-battuta': 'm4', 'h6-desert-library-alexandria': 'w1', 'h6-desert-timbuktu': 'w3',
  'h7-desert-tutankhamun': 'm1', 'h7-desert-abu-simbel': 'w0',
  // the Moon
  'h1-moon-rabbit-tales': 'w3', 'h1-moon-festivals': 'm0', 'h2-moon-galileo': 'm2', 'h2-moon-sputnik': 'g',
  'h3-moon-gagarin': 'm0', 'h3-moon-tereshkova': 'w2', 'h4-moon-katherine-johnson': 'w0', 'h4-moon-apollo11-crew': 'm1',
  'h5-moon-hubble': 'w3', 'h5-moon-space-station': 'w2', 'h6-moon-sally-ride': 'w1', 'h6-moon-change': 'm3',
  'h7-moon-apollo13': 'w2', 'h7-moon-new-explorers': 'w1',
  // Mars
  'h1-mars-red-star': 'm2', 'h1-mars-little-moons': 'w0', 'h2-mars-canals': 'm4', 'h2-mars-mariner4': 'w2',
  'h3-mars-viking': 'w0', 'h3-mars-sojourner': 'w1', 'h4-mars-twin-rovers': 'm0', 'h4-mars-mangalyaan': 'w2',
  'h5-mars-curiosity': 'w1', 'h5-mars-hope': 'w0', 'h6-mars-perseverance': 'm1', 'h6-mars-zhurong': 'm3',
  'h7-mars-ingenuity': 'm0', 'h7-mars-moxie': 'w2',
  // the Sky Castle
  'h1-castle-market-day': 'w2', 'h1-castle-builders': 'm1', 'h2-castle-white-heron': 'm0', 'h2-castle-hangul': 'm3',
  'h3-castle-elephant-clock': 'm2', 'h3-castle-angkor': 'm4', 'h4-castle-forbidden-city': 'm0', 'h4-castle-jikji': 'b',
  'h5-castle-great-zimbabwe': 'm1', 'h5-castle-hildegard': 'w3', 'h6-castle-magna-carta': 'm2', 'h6-castle-universities': 'w0',
  'h7-castle-leonardo': 'm4', 'h7-castle-balloons': 'w1'
};
/** The newer worlds' guides are friendly NPCs: a little playful, smiling as they talk. */
const GUIDE_FRIENDLY = ' Friendly and a little playful, smiling while talking.';
/** A child guide: a child of that time telling a friend about their life. */
const GUIDE_KID_SUFFIX = ' A child from long ago telling a new friend about their life, natural with no put-on accent.';
const guideSpec = (k) => GUIDE_KID[k] ?? (k.startsWith('tale-') ? GUIDE_TALE[k.slice(5)] : (k[0] === 'w' ? GUIDE_W : GUIDE_M)[Number(k.slice(1))]);
/** A voice entry no line speaks with any more: a newer world's guide, now speaking from the pool. */
export const staleVoice = (id) => id.startsWith('guide-') && !id.startsWith('guide-pool-') && !!guidePoolKey(id);

/** The pool voice a newer world's guide speaks with (null for the mountain's guides). */
export function guidePoolKey(char) {
  const k = GUIDE_CAST[char?.slice('guide-'.length)];
  if (!k) return null;
  return isCastleGuide(char) && k.length === 2 ? `tale-${k[0]}` : k;
}

/**
 * The guide's voice. The mountain's: its index among the history lessons picks one of nine
 * descriptions (each guide its own clip). The newer worlds': a shared pool voice (`pool` names
 * its reference clips), whatever the index.
 */
export function guideVoice(index, lang = null, char = null) {
  const k = guidePoolKey(char);
  if (k) {
    const [d, f0] = guideSpec(k);
    const suffix = GUIDE_KID[k] ? GUIDE_KID_SUFFIX : GUIDE_SUFFIX + GUIDE_FRIENDLY + (k.startsWith('tale-') ? TALE : '');
    const v = { ...V((lang === 'ko' ? younger(d) : d) + suffix, 900 + GUIDE_POOL.indexOf(k), REF_GUIDE, f0), pool: `guide-pool-${k}` };
    return lang === 'ko' ? { ...v, own: true } : v;
  }
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
  if (char.startsWith('guide-') && guideIndex != null) return guideVoice(guideIndex, lang, char);
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
