/**
 * Everything third-party in AI Arcademia, for the Credits panel (start screen
 * and settings): what it is, where it comes from and its licence. Pure data;
 * `what` is an i18n key (ui.js), names and licences stay as written.
 *
 * The creatures, hats, buildings and sound effects are made in code for this
 * game; the background music is the shared soundtrack (docs/music.md).
 * Nothing from library/rigged is used yet; if a model from there is added,
 * list its pack, link and licence here (and name CC BY models one by one).
 */
export const CREDITS = [
  { name: 'three.js', what: 'credits.three', by: 'three.js authors', url: 'https://threejs.org', license: 'MIT' },
  { name: '3dviz-pro-max', what: 'credits.3dviz', by: 'Viettranx', url: 'https://github.com/viettranx/3dviz-pro-max', license: 'MIT' },
  { name: 'Nunito', what: 'credits.nunito', by: 'Vernon Adams, Cyreal, Jacques Le Bailly', url: 'https://fonts.google.com/specimen/Nunito', license: 'SIL Open Font License 1.1' },
  { name: 'Fontsource', what: 'credits.fontsource', by: 'Fontsource', url: 'https://fontsource.org/fonts/nunito', license: 'MIT' },
  { name: 'Noto CJK / system fonts', what: 'credits.cjk', by: '—', url: 'https://fonts.google.com/noto', license: 'SIL Open Font License 1.1' },
  { name: 'ACE-Step 1.5', what: 'credits.music', by: 'ACE Studio, StepFun', url: 'https://github.com/ace-step/ACE-Step-1.5', license: 'MIT' }
];
