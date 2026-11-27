/**
 * The Game Studio's server (docs/game-studio.md): /api/studio/*, mounted by the dev server
 * (vite.config.js) and the production server (server/server.js) alike.
 *
 *   GET  meta                         style options, starters, plans table, what is switched on
 *   GET  plan                         my plan, its limits and my usage
 *   POST plan/upgrade                 { plan } — TEST MODE payments; guardian PIN when the family has one
 *   GET  games | POST games           my Studio games | a new one { title, render, animation, look, palette, genre }
 *   GET  games/<code>                 owner/admin: data, visibility, recent changes, credits
 *   POST games/<code>/chat            { message, focusMap, dryRun } → the LM model's (or the offline planner's) patch, applied + committed
 *   POST games/<code>/undo            { commit } → the reverse of that change, committed
 *   POST games/<code>/use-asset       { asset, target?, role?, event? } → added to the game, credited
 *   POST games/<code>/visibility      { visibility: private|shared|public }
 *   GET  assets                       ?kind=character|model|background|sfx|music&q=&tag=&offset=
 *   GET  characters | POST characters | DELETE characters/<id>      the character generator's saves
 *   GET  store | GET store/<id> | POST store                         browse | one | publish (free: all plans; paid: Creator)
 *   POST store/<id>/buy | withdraw | report
 *   GET  purchases | GET sales
 *   GET  classes | POST classes | POST classes/join | GET classes/<id>
 *   POST classes/<id>/code | end | leave | parent-approve | members/<accountId> | games ; DELETE classes/<id>/games/<code>
 *   GET  play/<code>?class=<id>       the data a player may play (owner: draft; student: the shared version)
 *   POST play/<code>/played           { class } — counts a play for the teacher
 *   GET  jobs | POST jobs             heavy AI generation, queued for the generation server (plan-limited)
 *   GET  worker/next | POST worker/<id>   the generation server's side (Bearer STUDIO_GEN_TOKEN)
 *   GET  admin/queue | POST admin/listings/<id> | admin/reports/<id>/close | admin/games/<code>/public
 *
 * Every write: signed in, same-origin JSON, rate-limited; ownership, plan, membership and admin
 * are checked here on the server, never trusted from the page.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { join, resolve } from 'node:path';
import { RateLimiter, clientIp, json, pathOf, queryOf, readJson } from '../api/http.js';
import { adminAuth } from '../api/adminAuth.js';
import { serverModel } from '../api/llm.js';
import { PackageError, CODE_RE, HASH_RE } from '../gamePackages.js';
import { studioParams } from '../gameTemplates.js';
import { PLANS, PLAN_ORDER, planById } from '../../src/platform/plans.js';
import { applyPatch, characterPatch, commitLine, op as makeOp, validatePatch } from '../../src/shared/studio/patch.js';
import { SFX_EVENTS, STARTERS, bytesOf, creditsOf } from '../../src/shared/studio/spec.js';
import { ANIMATION_OPTIONS, LOOK_OPTIONS, RENDER_OPTIONS } from '../../src/shared/studio/styles.js';
import { createAssetCatalog } from './assets.js';
import { createChatPlanner, kidSafe } from './chat.js';
import { CREDIT_VALUE, createPayments, displayPrice } from './payments.js';
import { studioRepo } from './repo.js';
import { StudioError, StudioStore, dayKey, priceFor } from './store.js';

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const ID = /^[a-z]{3}_[a-z0-9]{6,20}$/;
const TERMS_LABEL = { 'free-credit': 'Free, credit the creator', standard: 'Store licence: use in your own games', 'class-only': 'Store licence: private and class games only' };

/**
 * @param {{ getDb: () => Promise<import('../db/database.js').Database>, repo?: string, gamesDir?: string,
 *   libraryRoot?: string, publicDir?: string, authenticate: (req) => Promise<object|null>, env?: object,
 *   allowLocal?: boolean, parentGate?: { hasPin: (account) => Promise<boolean>, check: (account, key) => void } | null,
 *   log?: (line: string) => void, model?: object }} options
 */
export function createStudio({ getDb, repo = resolve('.'), gamesDir, libraryRoot = resolve('library'), publicDir = resolve('public'), authenticate, env = process.env, allowLocal = false, parentGate = null, log = () => {}, model = null, payments = null }) {
  gamesDir = resolve(gamesDir ?? join(repo, 'games'));
  const files = studioRepo({ repo, gamesDir, log });
  const assets = createAssetCatalog({ libraryRoot, publicDir });
  const lm = model ?? serverModel(env);
  const planner = createChatPlanner({ model: lm, tracks: () => assets.tracks(), log });
  const pay = payments ?? createPayments(env);
  const admin = adminAuth(env);
  const genToken = env.STUDIO_GEN_TOKEN ? createHash('sha256').update(String(env.STUDIO_GEN_TOKEN)).digest() : null;
  const limits = {
    write: new RateLimiter(120, { burst: 40 }),
    chat: new RateLimiter(20, { burst: 6 }),
    join: new RateLimiter(10, { burst: 5 }),
    read: new RateLimiter(600, { burst: 120 })
  };
  /** Wrong join codes per account and per address: ten in an hour locks joining for the hour. */
  const badCodes = new Map();
  let store = null;
  const getStore = async () => (store ??= new StudioStore(await getDb(), { payments: pay }));
  const allowedOrigins = String(env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const sameOrigin = (req) => {
    const origin = req.headers.origin;
    if (!origin) return true;
    try {
      return new URL(origin).host === req.headers.host || allowedOrigins.includes(origin);
    } catch {
      return false;
    }
  };
  const adminOf = (req) => (allowLocal && !admin.on && LOOPBACK.has(req.socket?.remoteAddress ?? '') ? 'local-dev' : admin.idOf(req));

  /** A guardian's OK for paid things, where the family has a parent PIN (AI Arcademia's family controls). */
  const guardian = async (account, req) => {
    if (!parentGate || !(await parentGate.hasPin(account))) return false;
    try {
      await parentGate.check(account, req.headers['x-parent-key']);
      return true;
    } catch {
      throw new StudioError('A parent or guardian needs to type the family PIN for this', 403, { parentGate: true });
    }
  };
  const hasPin = async (account) => Boolean(parentGate && (await parentGate.hasPin(account)));

  /** Everything a patch may name: the free catalog, plus (resolved now) this account's own and bought items. */
  const catalogFor = async (st, account, ids = []) => {
    const extra = new Map();
    for (const id of ids) {
      const s = String(id ?? '');
      if (s.startsWith('chr:')) {
        const c = await st.character(account.id, s.slice(4));
        if (c) extra.set(s, { id: s, kind: 'character', name: c.name, licence: 'Your own character', author: account.name, url: null, file: null, terms: null, character: c });
      } else if (s.startsWith('mkt:')) {
        const listingId = s.slice(4);
        if (!ID.test(listingId) || !(await st.owns(account.id, listingId))) continue;
        const l = await st.listing(listingId);
        if (l && l.status !== 'rejected') extra.set(s, { id: s, kind: 'character', name: l.title, licence: TERMS_LABEL[l.terms], author: l.creator, url: null, file: null, terms: l.terms, character: l.data });
      }
    }
    const tracks = new Set(assets.tracks().map((t) => t.id));
    return { tracks, asset: (id) => extra.get(id) ?? assets.get(id) };
  };

  /** Apply a patch to a game and commit it, as one change by this account. */
  const applyAndCommit = async (st, account, code, patch, catalog, { asked = '', source = 'chat' } = {}) => {
    const g = await st.owned(account, code);
    const data = files.read(code);
    const result = applyPatch(data, patch, catalog);
    if (result.problems.length) throw new StudioError(`That change would break the game: ${result.problems.slice(0, 2).join('; ')}`, 422);
    if (!result.files.length) return { changes: result.changes, commit: null, data };
    await st.assertStorage(account, Math.max(0, bytesOf(result.data) - Number(g.bytes)));
    const message = [`Studio: ${commitLine(patch.summary, result.changes)}`, '', ...result.changes.map((c) => `- ${c}`), '', ...(asked ? [`Asked: "${asked.slice(0, 300)}"`] : []), `Via: ${source}`].join('\n');
    const commit = await files.write(code, result.data, result.files, { message, account });
    await st.touchGame(code, files.bytes(code));
    return { changes: result.changes, commit, data: result.data };
  };

  const gameDetail = async (st, row) => {
    const data = files.read(row.code);
    let manifest = null;
    try {
      manifest = files.manifest(row.code);
    } catch {
      manifest = null;
    }
    const classes = await st.db.many('SELECT c.id, c.name FROM studio_class_games cg JOIN studio_classes c ON c.id = cg.class_id WHERE cg.code = ? AND c.status = \'active\'', [row.code]);
    return { game: { ...row, slug: manifest?.slug ?? null, id: manifest?.id ?? null, listed: Boolean(manifest?.studio?.listed) }, data, changes: files.changes(row.code, 30), credits: creditsOf(data), classes };
  };

  const workerOk = (req) => {
    if (!genToken) return false;
    const header = String(req.headers.authorization ?? '');
    if (!header.startsWith('Bearer ')) return false;
    return timingSafeEqual(createHash('sha256').update(header.slice(7)).digest(), genToken);
  };

  return {
    files,
    assets,
    getStore,
    async handler(req, res) {
      const path = pathOf(req);
      if (path !== '/api/studio' && !path.startsWith('/api/studio/')) return false;
      const decode = (p) => {
        try {
          return decodeURIComponent(p);
        } catch {
          return '';
        }
      };
      const parts = path.slice('/api/studio'.length).split('/').filter(Boolean).map(decode);
      const m = req.method;
      const send = (status, body) => json(res, status, body, { 'Cache-Control': 'no-store' });
      const query = queryOf(req);
      try {
        const st = await getStore();
        // The generation server (no account: its own token).
        if (parts[0] === 'worker') {
          if (!workerOk(req)) return send(401, { error: 'Worker token required' }), true;
          if (m === 'GET' && parts[1] === 'next') return send(200, { job: await st.claimJob(String(query.get('kinds') ?? '').split(',')) }), true;
          if (m === 'POST' && parts.length === 2) {
            const b = await readJson(req, 16 * 1024);
            await st.finishJob(parts[1], { ok: b.ok === true, result: b.result ?? null });
            return send(200, { ok: true }), true;
          }
          return send(404, { error: 'unknown route' }), true;
        }
        if (m !== 'GET' && m !== 'HEAD') {
          if (!sameOrigin(req)) return send(403, { error: 'Cross-site request refused' }), true;
          if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) return send(415, { error: 'JSON only' }), true;
        }
        let account = null;
        try {
          account = await authenticate(req);
        } catch {
          account = null;
        }
        if (account?.blockedUntil > Date.now()) return send(403, { error: 'This account is blocked for now' }), true;
        const isAdmin = Boolean(adminOf(req));
        const ip = clientIp(req);
        const body = async (limiter = limits.write, max = 64 * 1024) => {
          if (!limiter.take(account ? `a${account.id}` : `ip${ip}`) || !limiter.take(`ip${ip}`)) throw new StudioError('Slow down a little', 429);
          return readJson(req, max);
        };
        const needAccount = () => {
          if (!account) throw new StudioError('Sign in to use the Studio', 401, { signIn: true });
          return account;
        };
        const needAdmin = () => {
          if (isAdmin) return true;
          if (admin.refuse(req, res, send)) return false;
          return true;
        };
        if (m === 'GET' && !limits.read.take(account ? `a${account.id}` : `ip${ip}`)) return send(429, { error: 'Slow down a little' }), true;

        /* ---- what the Studio can do ---- */
        if (m === 'GET' && parts[0] === 'meta') {
          return send(200, {
            renders: RENDER_OPTIONS,
            animations: ANIMATION_OPTIONS,
            looks: LOOK_OPTIONS,
            starters: Object.entries(STARTERS).map(([id, s]) => ({ id, name: s.name, goal: s.goal })),
            plans: PLAN_ORDER.map((id) => ({ id, name: PLANS[id].name, price: PLANS[id].price, studio: PLANS[id].studio })),
            creditValue: CREDIT_VALUE,
            payments: { provider: pay.name, mode: pay.mode },
            lm: Boolean(lm?.available),
            generation: Boolean(genToken),
            git: files.available(),
            library: assets.libraryInstalled(),
            account: account ? { id: account.id, name: account.name, plan: planById(account.plan).id } : null,
            admin: isAdmin,
            hasPin: account ? await hasPin(account) : false
          }), true;
        }
        if (m === 'GET' && parts[0] === 'assets') {
          return send(200, assets.list({ kind: query.get('kind') ?? 'character', q: query.get('q') ?? '', tag: query.get('tag') ?? '', offset: query.get('offset'), limit: query.get('limit') })), true;
        }
        if (m === 'GET' && parts[0] === 'store' && parts.length <= 2) {
          if (parts.length === 2) {
            const l = await st.listing(parts[1], { ...account, admin: isAdmin });
            if (!l || (l.status !== 'listed' && !l.mine && !isAdmin)) throw new StudioError('No such item', 404);
            return send(200, { listing: { ...l, display: displayPrice(l.price) }, owned: account ? await st.owns(account.id, l.id) : false, yourPrice: account ? displayPrice(priceFor(l.price, account.plan).paid) : null }), true;
          }
          const free = query.get('free') === '1' ? true : query.get('free') === '0' ? false : null;
          const list = await st.browse({ q: query.get('q') ?? '', sort: query.get('sort') ?? 'new', free, offset: query.get('offset') }, account ? { ...account, admin: isAdmin } : null);
          return send(200, { listings: list.map((l) => ({ ...l, display: displayPrice(l.price) })) }), true;
        }

        /* ---- the generation server's queue ---- */
        if (parts[0] === 'jobs') {
          const a = needAccount();
          if (m === 'GET') return send(200, { jobs: await st.jobs(a.id), available: Boolean(genToken) }), true;
          if (m === 'POST') {
            const b = await body();
            if (!genToken) return send(503, { error: 'AI generation (picture-to-3D, voices, music) is coming soon. The character maker works now.', comingSoon: true }), true;
            return send(200, { job: await st.queueJob(a, { kind: b.kind, prompt: kidSafe(b.prompt, 400) }) }), true;
          }
        }

        /* ---- admin ---- */
        if (parts[0] === 'admin') {
          if (!needAdmin()) return true;
          if (m === 'GET' && parts[1] === 'queue') return send(200, await st.queue()), true;
          if (m === 'POST' && parts[1] === 'listings' && parts[2]) {
            const b = await body();
            return send(200, { listing: await st.moderateListing(parts[2], String(b.status)) }), true;
          }
          if (m === 'POST' && parts[1] === 'reports' && parts[2] && parts[3] === 'close') {
            await body();
            await st.closeReport(Number(parts[2]));
            return send(200, { ok: true }), true;
          }
          if (m === 'POST' && parts[1] === 'games' && CODE_RE.test(parts[2] ?? '') && parts[3] === 'public') {
            const b = await body();
            const row = await st.reviewPublic(parts[2], b.approve === true, b.note ?? '');
            if (b.approve !== true) {
              const owner = await st.account(row.owner_id);
              await files.setListed(parts[2], false, owner);
            }
            return send(200, { game: row, next: b.approve === true ? 'Approved. Deploy it from the game\'s page (Changes & deploy) to put it on the home page.' : 'Rejected: the game is private again.' }), true;
          }
          return send(404, { error: 'unknown route' }), true;
        }

        /* ---- everything else is an account's own ---- */
        const a = needAccount();

        if (parts[0] === 'plan') {
          if (m === 'GET' && parts.length === 1) return send(200, { ...(await st.usage(a)), payments: { provider: pay.name, mode: pay.mode }, hasPin: await hasPin(a) }), true;
          if (m === 'POST' && parts[1] === 'upgrade') {
            const b = await body();
            const target = PLANS[String(b.plan)];
            if (!target) throw new StudioError('No such plan', 400);
            if (target.price.krw > 0) await guardian(a, req);
            const out = await st.changePlan(a, target.id);
            log(`[studio] account ${a.id} plan → ${target.id} (test mode)`);
            return send(200, { ...out, usage: await st.usage({ ...a, plan: out.plan }) }), true;
          }
        }

        if (parts[0] === 'games') {
          if (m === 'GET' && parts.length === 1) return send(200, { games: await st.gamesOf(a.id) }), true;
          if (m === 'POST' && parts.length === 1) {
            const b = await body();
            const title = kidSafe(b.title, 60);
            if (title.length < 2) throw new StudioError('Give your game a name', 400);
            const params = studioParams(b);
            await st.assertStorage(a, 8 * 1024);
            const made = await files.create({ title, description: kidSafe(b.description ?? '', 300), params, owner: { id: a.id, name: a.name } });
            await st.registerGame(a, made.manifest.code, made.manifest.title, files.bytes(made.manifest.code));
            log(`[studio] ${a.name} made ${made.manifest.code} "${made.manifest.title}"`);
            return send(200, await gameDetail(st, await st.game(made.manifest.code))), true;
          }
          const code = parts[1];
          if (!CODE_RE.test(code ?? '')) throw new StudioError('No such game', 404);
          const row = await st.owned(a, code, { admin: isAdmin });
          if (m === 'GET' && parts.length === 2) return send(200, await gameDetail(st, row)), true;
          if (m === 'POST' && parts[2] === 'chat') {
            const b = await body(limits.chat);
            const text = kidSafe(b.message, 600);
            if (!text) throw new StudioError('Type what you would like to change', 400);
            await st.spendChat(a);
            let out;
            try {
              const data = files.read(code);
              const catalog = await catalogFor(st, a, []);
              const plan = planById(a.plan);
              const planned = await planner({ text, data, focusMap: typeof b.focusMap === 'string' ? b.focusMap.slice(0, 48) : null, premium: plan.model === 'premium', maxTokens: Math.max(800, plan.maxTokens.map ?? 900), catalog });
              if (b.dryRun === true || !planned.patch.ops.length) {
                await st.refund(a, 'chat', dayKey(Date.now()));
                const preview = planned.patch.ops.length ? applyPatch(data, planned.patch, catalog) : { changes: [] };
                return send(200, { reply: planned.patch.summary, changes: preview.changes, commit: null, source: planned.source, note: planned.note, patch: planned.patch, dryRun: b.dryRun === true }), true;
              }
              out = await applyAndCommit(st, a, code, planned.patch, catalog, { asked: text, source: planned.source === 'lm' ? 'the LM model' : 'the offline planner' });
              if (!out.commit) await st.refund(a, 'chat', dayKey(Date.now()));
              return send(200, { reply: planned.patch.summary, changes: out.changes, commit: out.commit, source: planned.source, note: planned.note, data: out.data, patch: planned.patch }), true;
            } catch (error) {
              if (!out) await st.refund(a, 'chat', dayKey(Date.now()));
              throw error;
            }
          }
          if (m === 'POST' && parts[2] === 'undo') {
            const b = await body();
            if (!HASH_RE.test(String(b.commit ?? ''))) throw new StudioError('Which change?', 400);
            await st.owned(a, code);
            const out = await files.undo(code, String(b.commit), a);
            await st.touchGame(code, files.bytes(code));
            return send(200, { commit: out.commit, data: out.data, changes: files.changes(code, 30) }), true;
          }
          if (m === 'POST' && parts[2] === 'use-asset') {
            const b = await body();
            const id = String(b.asset ?? '');
            const catalog = await catalogFor(st, a, [id]);
            const ref = catalog.asset(id);
            if (!ref) throw new StudioError('That asset is not free to use, or not yours to use', 403);
            const role = ['enemy', 'boss', 'npc', 'ally'].includes(b.role) ? b.role : null;
            const count = Number.isInteger(b.count) ? Math.max(1, Math.min(30, b.count)) : null;
            const patch = {
              summary: `Use ${ref.name}`,
              ops: [makeOp('useAsset', { asset: id, target: ref.kind === 'sfx' ? (SFX_EVENTS.includes(b.event) ? b.event : null) : typeof b.target === 'string' ? b.target.slice(0, 48) : null, character: role || count ? characterPatch({ role, count }) : null })]
            };
            const check = validatePatch(patch, files.read(code), catalog);
            if (!check.ok) throw new StudioError(check.problems[0], 422);
            const out = await applyAndCommit(st, a, code, patch, catalog, { source: `the asset browser (${id})` });
            return send(200, { changes: out.changes, commit: out.commit, data: out.data }), true;
          }
          if (m === 'POST' && parts[2] === 'visibility') {
            const b = await body();
            const visibility = String(b.visibility);
            const data = files.read(code);
            const next = await st.setVisibility(a, code, visibility, { assets: data.assets.used });
            await files.setListed(code, visibility === 'public', a);
            return send(200, { game: next, note: visibility === 'public' ? 'Sent for review: the admin checks it, then deploys it to the home page.' : null }), true;
          }
        }

        if (parts[0] === 'characters') {
          if (m === 'GET') return send(200, { characters: await st.characters(a.id) }), true;
          if (m === 'POST') {
            const b = await body();
            const id = typeof b.id === 'string' && ID.test(b.id) ? b.id : null;
            const raw = { ...(b.character ?? {}), name: kidSafe(b.character?.name ?? 'Friend', 40), line: kidSafe(b.character?.line ?? '', 160) };
            return send(200, { character: await st.saveCharacter(a, raw, id) }), true;
          }
          if (m === 'DELETE' && parts[1]) return send(200, { deleted: await st.deleteCharacter(a, parts[1]) }), true;
        }

        if (parts[0] === 'store') {
          if (m === 'POST' && parts.length === 1) {
            const b = await body();
            const price = Math.round(Number(b.price) || 0);
            if (price > 0) await guardian(a, req);
            const listing = await st.publish(a, { characterId: typeof b.characterId === 'string' ? b.characterId : null, character: b.character ?? null, title: kidSafe(b.title ?? '', 60), summary: kidSafe(b.summary ?? '', 400), price, terms: b.terms });
            return send(200, { listing, note: 'Sent for review: it appears in the store once the admin approves it.' }), true;
          }
          const id = parts[1];
          if (!ID.test(id ?? '')) throw new StudioError('No such item', 404);
          if (m === 'POST' && parts[2] === 'buy') {
            await body();
            const l = await st.listing(id);
            if (l?.price > 0) await guardian(a, req);
            return send(200, await st.buy(a, id)), true;
          }
          if (m === 'POST' && parts[2] === 'withdraw') {
            await body();
            await st.withdraw(a, id);
            return send(200, { ok: true }), true;
          }
          if (m === 'POST' && parts[2] === 'report') {
            const b = await body();
            return send(200, await st.report(a, { listingId: id, reason: kidSafe(b.reason, 300) })), true;
          }
        }
        if (m === 'GET' && parts[0] === 'purchases') return send(200, { purchases: await st.purchases(a.id) }), true;
        if (m === 'GET' && parts[0] === 'sales') return send(200, { ...(await st.sales(a.id)), creditValue: CREDIT_VALUE }), true;
        if (m === 'POST' && parts[0] === 'report' && CODE_RE.test(parts[1] ?? '')) {
          const b = await body();
          return send(200, await st.report(a, { gameCode: parts[1], reason: kidSafe(b.reason, 300) })), true;
        }

        if (parts[0] === 'classes') {
          if (m === 'GET' && parts.length === 1) return send(200, await st.classesOf(a)), true;
          if (m === 'POST' && parts.length === 1) {
            const b = await body();
            return send(200, { class: await st.createClass(a, { name: kidSafe(b.name, 60), approval: b.approval ?? 'teacher' }) }), true;
          }
          if (m === 'POST' && parts[1] === 'join') {
            const b = await body(limits.join, 4096);
            const now = Date.now();
            for (const k of [`a${a.id}`, `ip${ip}`]) {
              const bad = badCodes.get(k);
              if (bad && bad.until > now && bad.n >= 10) throw new StudioError('Too many wrong codes — try again in an hour', 429);
            }
            let guardianOk = false;
            const pin = await hasPin(a);
            if (pin && req.headers['x-parent-key']) guardianOk = await guardian(a, req).catch(() => false);
            try {
              return send(200, { joined: await st.join(a, b.code, { hasPin: pin, guardianOk }) }), true;
            } catch (error) {
              if (error.badCode || error.status === 400) {
                for (const k of [`a${a.id}`, `ip${ip}`]) {
                  const bad = badCodes.get(k);
                  badCodes.set(k, bad && bad.until > now ? { n: bad.n + 1, until: bad.until } : { n: 1, until: now + 3600000 });
                }
                if (badCodes.size > 20000) for (const [k, v] of badCodes) if (v.until < now) badCodes.delete(k);
              }
              throw error;
            }
          }
          const id = parts[1];
          if (!ID.test(id ?? '')) throw new StudioError('No such class', 404);
          if (m === 'GET' && parts.length === 2) {
            const own = await st.db.one('SELECT owner_id FROM studio_classes WHERE id = ?', [id]);
            return send(200, { class: own && Number(own.owner_id) === Number(a.id) ? await st.classForTeacher(a, id) : await st.classForStudent(a, id) }), true;
          }
          if (m === 'POST' && ['code', 'end', 'leave'].includes(parts[2])) {
            await body();
            if (parts[2] === 'code') return send(200, { class: await st.rotateCode(a, id) }), true;
            if (parts[2] === 'end') return send(200, { class: await st.endClass(a, id) }), true;
            await st.leave(a, id);
            return send(200, { ok: true }), true;
          }
          if (m === 'POST' && parts[2] === 'parent-approve') {
            await body();
            if (!(await guardian(a, req))) throw new StudioError('There is no family PIN on this account, so nothing waits for a parent', 409);
            return send(200, { class: await st.parentApprove(a, id) }), true;
          }
          if (m === 'POST' && parts[2] === 'members' && /^\d{1,15}$/.test(parts[3] ?? '')) {
            const b = await body();
            return send(200, { class: await st.member(a, id, Number(parts[3]), String(b.action)) }), true;
          }
          if (m === 'POST' && parts[2] === 'games') {
            const b = await body();
            const code = String(b.code ?? '');
            if (!CODE_RE.test(code)) throw new StudioError('Which game?', 400);
            await st.owned(a, code);
            const draft = b.version === 'draft';
            const pin = draft ? null : files.changes(code, 1)[0]?.hash ?? null;
            if (!draft && !pin) throw new StudioError('This game has no saved version yet', 409);
            return send(200, { class: await st.assign(a, id, code, { pin, allowDraft: draft }) }), true;
          }
          if (m === 'DELETE' && parts[2] === 'games' && CODE_RE.test(parts[3] ?? '')) return send(200, { class: await st.unassign(a, id, parts[3]) }), true;
        }

        if (parts[0] === 'play' && CODE_RE.test(parts[1] ?? '')) {
          const code = parts[1];
          if (m === 'GET' && parts.length === 2) {
            const classId = query.get('class');
            const access = await st.playAccess(a, code, classId && ID.test(classId) ? classId : null);
            const data = files.read(code, access.ref);
            return send(200, { code, title: access.title, version: access.ref, draft: !access.ref, data, credits: creditsOf(data) }), true;
          }
          if (m === 'POST' && parts[2] === 'played') {
            const b = await body();
            if (typeof b.class === 'string' && ID.test(b.class)) await st.recordPlay(a, code, b.class);
            return send(200, { ok: true }), true;
          }
        }

        return send(404, { error: 'unknown studio route' }), true;
      } catch (error) {
        if (error instanceof StudioError || error instanceof PackageError) {
          const { status, message, ...extra } = error;
          return send(status ?? 400, { error: message, ...Object.fromEntries(Object.entries(extra).filter(([k]) => ['upgrade', 'parentGate', 'signIn', 'blocked', 'comingSoon'].includes(k))) }), true;
        }
        if (/payload too large/.test(error.message)) return send(413, { error: 'Too large' }), true;
        if (/bad JSON/.test(error.message)) return send(400, { error: 'Bad JSON' }), true;
        log(`[studio] ${m} ${path}: ${error.stack ?? error}`);
        return send(500, { error: 'Server error' }), true;
      }
    }
  };
}
