/**
 * Every language's data at once, for the voice studio, the server and the
 * script exporter (the game itself loads one language at a time).
 */
import { registerLocale, isLoaded } from '../i18n/index.js';
import ko from '../i18n/locales/ko/index.js';
import es from '../i18n/locales/es/index.js';
import ja from '../i18n/locales/ja/index.js';
import zh from '../i18n/locales/zh/index.js';

const ALL = { ko, es, ja, zh };
/** Register every language (English is built in). Safe to call twice. */
export function registerAllLocales() {
  for (const [id, d] of Object.entries(ALL)) if (!isLoaded(id)) registerLocale(id, d.default ?? d);
}
