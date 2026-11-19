/**
 * The read-only share page (parent-report.html#t=<token>): the weekly
 * report for whoever holds the link, with no sign-in and nothing else of
 * the child's account. The token is in the hash, so it never reaches a
 * server log as part of a page request.
 */
import '@fontsource-variable/nunito/wght.css';
import { renderReport } from './ui/report.js';

const host = document.getElementById('report');
const token = new URLSearchParams(location.hash.slice(1)).get('t') ?? '';

async function load() {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) {
    host.innerHTML = '<p class="msg">This link is not complete. Ask for a new one from the Parents button in AI Arcademia.</p>';
    return;
  }
  try {
    const r = await fetch(`./api/learning/shared/${encodeURIComponent(token)}`, { cache: 'no-store', referrerPolicy: 'no-referrer' });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error ?? 'This link no longer works.');
    host.replaceChildren();
    renderReport(host, body.report, { title: 'This week on the mountain' });
  } catch (error) {
    host.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'msg';
    p.textContent = error.message;
    host.append(p);
  }
}
load();
