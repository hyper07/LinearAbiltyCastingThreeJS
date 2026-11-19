/**
 * The read-only share page (parent-report.html#t=<token>&lang=<lc>): the
 * weekly report for whoever holds the link, with no sign-in and nothing else
 * of the child's account. The token is in the hash, so it never reaches a
 * server log as part of a page request. The page has its own language
 * picker; the link carries the language the parent was using.
 */
import '@fontsource-variable/nunito/wght.css';
import { renderReport } from './ui/report.js';
import { LOCALES, isLocale, loadLocale, locale, pickLocale, setLocale, t } from './i18n/index.js';

const host = document.getElementById('report');
const params = new URLSearchParams(location.hash.slice(1));
const token = params.get('t') ?? '';
let report = null;
let failed = null;

function message(text) {
  host.replaceChildren();
  const p = document.createElement('p');
  p.className = 'msg';
  p.textContent = text;
  host.append(p);
}

function draw() {
  document.documentElement.lang = locale();
  document.title = t('share.title');
  document.querySelector('.brand__for').textContent = t('share.forParents');
  const pick = document.getElementById('lang');
  pick.setAttribute('aria-label', t('settings.language'));
  for (const o of pick.options) o.selected = o.value === locale();
  if (failed) return message(t(failed));
  if (!report) return message(t('share.loading'));
  host.replaceChildren();
  renderReport(host, report, { title: t('parents.reportTitle') });
}

async function useLanguage(id) {
  await loadLocale(id).catch(() => (id = 'en'));
  setLocale(id);
  const p = new URLSearchParams(location.hash.slice(1));
  p.set('lang', id);
  history.replaceState(null, '', `#${p}`);
  draw();
}

async function load() {
  const pick = document.getElementById('lang');
  for (const l of LOCALES) pick.append(Object.assign(document.createElement('option'), { value: l.id, textContent: l.name, lang: l.id }));
  pick.addEventListener('change', () => useLanguage(pick.value));
  const wanted = params.get('lang');
  await useLanguage(isLocale(wanted) ? wanted : pickLocale(navigator.languages ?? [navigator.language]));
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) {
    failed = 'share.incomplete';
    return draw();
  }
  try {
    const r = await fetch(`./api/learning/shared/${encodeURIComponent(token)}`, { cache: 'no-store', referrerPolicy: 'no-referrer' });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error);
    report = body.report;
  } catch {
    failed = 'share.gone';
  }
  draw();
}
load();
