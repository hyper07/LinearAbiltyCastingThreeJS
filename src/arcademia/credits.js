/**
 * Everything third-party in AI Arcademia, for the Credits panel (start screen
 * and settings): what it is, where it comes from and its licence. Pure data;
 * `what` is an i18n key (ui.js), names and licences stay as written.
 *
 * The creatures, hats, buildings and sound effects are made in code for this
 * game; the background music is the shared soundtrack (docs/music.md).
 * Nothing from library/rigged is used yet; if a model from there is added,
 * list its pack, link and licence here (and name CC BY models one by one).
 *
 * Voices: the characters' generated voices (pre-made with Qwen3-TTS,
 * generatedVoiceCredit below; voice/generated.js) and the real people who
 * recorded lines in the voice studio, listed by the name each chose with the
 * characters they recorded (voiceCreditRows; voice/manifest.js). A person's
 * recording always plays instead of the generated line.
 */
import { languageHasRecordings, voiceCredits } from './voice/manifest.js';
import { GEN_CREDIT } from './voice/generated.js';
import { voiceCharacters } from './voice/script.js';
import { LOCALES } from './i18n/index.js';
export const CREDITS = [
  { name: 'three.js', what: 'credits.three', by: 'three.js authors', url: 'https://threejs.org', license: 'MIT' },
  { name: '3dviz-pro-max', what: 'credits.3dviz', by: 'Viettranx', url: 'https://github.com/viettranx/3dviz-pro-max', license: 'MIT' },
  { name: 'Nunito', what: 'credits.nunito', by: 'Vernon Adams, Cyreal, Jacques Le Bailly', url: 'https://fonts.google.com/specimen/Nunito', license: 'SIL Open Font License 1.1' },
  { name: 'Fontsource', what: 'credits.fontsource', by: 'Fontsource', url: 'https://fontsource.org/fonts/nunito', license: 'MIT' },
  { name: 'Noto CJK / system fonts', what: 'credits.cjk', by: '—', url: 'https://fonts.google.com/noto', license: 'SIL Open Font License 1.1' },
  { name: 'ACE-Step 1.5', what: 'credits.music', by: 'ACE Studio, StepFun', url: 'https://github.com/ace-step/ACE-Step-1.5', license: 'MIT' }
];

/**
 * The Voices rows for the Credits panel: [{ name, characters: 'Professor Hoot, Tock the Time-Keeper', languages: 'English, 한국어' }],
 * character names in `lang`. Empty when nobody has recorded anything yet.
 */
export function voiceCreditRows(manifest, lang = 'en') {
  const names = new Map(voiceCharacters(lang).map((c) => [c.id, c.name]));
  const langName = (id) => LOCALES.find((l) => l.id === id)?.name ?? id;
  return voiceCredits(manifest).map((c) => ({ name: c.name, characters: c.characters.map((id) => names.get(id) ?? id).join(', '), languages: c.languages.map(langName).join(', ') }));
}

/**
 * The generated voices' credit for the Credits panel: { name, url, licence, by },
 * or null when there are no generated voices in any language.
 */
export function generatedVoiceCredit(generated) {
  if (!Object.keys(generated?.lines ?? {}).some((lang) => languageHasRecordings(generated, lang))) return null;
  return { name: GEN_CREDIT.model, url: GEN_CREDIT.url, licence: GEN_CREDIT.licence, by: GEN_CREDIT.by };
}
