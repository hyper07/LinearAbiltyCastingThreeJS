/**
 * The browser's side of /api/studio (server/studio/index.js). Errors carry the server's flags:
 * `signIn` (sign in first), `upgrade` (a plan limit), `parentGate` (a parent or guardian must
 * type the family PIN — see withGuardian), `comingSoon`.
 */
let parentKey = null;

const call = async (path, init = {}) => {
  const headers = { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(parentKey ? { 'x-parent-key': parentKey } : {}), ...(init.headers ?? {}) };
  const response = await fetch(`./api/studio${path}`, { cache: 'no-store', credentials: 'same-origin', ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error ?? `HTTP ${response.status}`), { status: response.status, ...body });
  return body;
};
const post = (path, data = {}) => call(path, { method: 'POST', body: JSON.stringify(data) });
const del = (path) => call(path, { method: 'DELETE', body: '{}' });
const q = (params) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''));
  return s.toString() ? `?${s}` : '';
};
const enc = encodeURIComponent;

/** Type the family PIN (AI Arcademia's parent PIN): the key it gives lasts half an hour. */
export async function unlockParent(pin) {
  const response = await fetch('./api/learning/parent/pin', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? 'That PIN did not work');
  parentKey = body.parentKey;
  return true;
}

/**
 * Run `fn`; if the server asks for a guardian, ask (`askPin()` → a PIN or null) and try once more.
 */
export async function withGuardian(fn, askPin) {
  try {
    return await fn();
  } catch (error) {
    if (!error.parentGate) throw error;
    const pin = await askPin();
    if (!pin) throw Object.assign(new Error('A parent or guardian needs to agree first'), { cancelled: true });
    await unlockParent(pin);
    return fn();
  }
}

export const studio = {
  meta: () => call('/meta'),
  plan: () => call('/plan'),
  upgrade: (plan) => post('/plan/upgrade', { plan }),
  games: () => call('/games').then((r) => r.games),
  create: (choices) => post('/games', choices),
  game: (code) => call(`/games/${enc(code)}`),
  chat: (code, message, focusMap = null, dryRun = false) => post(`/games/${enc(code)}/chat`, { message, focusMap, dryRun }),
  undo: (code, commit) => post(`/games/${enc(code)}/undo`, { commit }),
  useAsset: (code, asset, options = {}) => post(`/games/${enc(code)}/use-asset`, { asset, ...options }),
  visibility: (code, visibility) => post(`/games/${enc(code)}/visibility`, { visibility }),
  reportGame: (code, reason) => post(`/report/${enc(code)}`, { reason }),
  assets: (params) => call(`/assets${q(params)}`),
  characters: () => call('/characters').then((r) => r.characters),
  saveCharacter: (character, id = null) => post('/characters', { character, id }),
  deleteCharacter: (id) => del(`/characters/${enc(id)}`),
  store: (params = {}) => call(`/store${q(params)}`).then((r) => r.listings),
  listing: (id) => call(`/store/${enc(id)}`),
  publish: (offer) => post('/store', offer),
  buy: (id) => post(`/store/${enc(id)}/buy`),
  withdraw: (id) => post(`/store/${enc(id)}/withdraw`),
  report: (id, reason) => post(`/store/${enc(id)}/report`, { reason }),
  purchases: () => call('/purchases').then((r) => r.purchases),
  sales: () => call('/sales'),
  classes: () => call('/classes'),
  createClass: (name, approval) => post('/classes', { name, approval }),
  joinClass: (code) => post('/classes/join', { code }),
  classInfo: (id) => call(`/classes/${enc(id)}`).then((r) => r.class),
  rotateCode: (id) => post(`/classes/${enc(id)}/code`),
  endClass: (id) => post(`/classes/${enc(id)}/end`),
  leaveClass: (id) => post(`/classes/${enc(id)}/leave`),
  parentApprove: (id) => post(`/classes/${enc(id)}/parent-approve`),
  member: (id, accountId, action) => post(`/classes/${enc(id)}/members/${enc(accountId)}`, { action }),
  assign: (id, code, version) => post(`/classes/${enc(id)}/games`, { code, version }),
  unassign: (id, code) => del(`/classes/${enc(id)}/games/${enc(code)}`),
  play: (code, classId = null) => call(`/play/${enc(code)}${q({ class: classId })}`),
  played: (code, classId) => post(`/play/${enc(code)}/played`, { class: classId }),
  jobs: () => call('/jobs'),
  queueJob: (kind, prompt) => post('/jobs', { kind, prompt }),
  adminQueue: () => call('/admin/queue'),
  moderate: (id, status) => post(`/admin/listings/${enc(id)}`, { status }),
  closeReport: (id) => post(`/admin/reports/${enc(id)}/close`),
  reviewGame: (code, approve, note = '') => post(`/admin/games/${enc(code)}/public`, { approve, note })
};
