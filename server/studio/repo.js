/**
 * A Studio game's files and their history: games/<code>/ in the repository, written only here.
 *
 *   - Only the six data files (data/<key>.json, spec.js DATA_KEYS) and the manifest's `studio`
 *     field are ever written; the names are fixed, the code is checked (CODE_RE), and a
 *     symlinked folder is refused — the chat can never write outside the game's data folder.
 *   - Every accepted change is ONE commit on the current branch touching only games/<code>/,
 *     authored by the maker (`Name <account-<id>@studio.gamory.invalid>`), so it appears in the
 *     admin's Changes & deploy. It never touches releases/: production changes only by a deploy.
 *   - git runs with fixed argument lists (gamePackages.js git()), hooks and signing off, one
 *     write at a time on this server (a queue).
 *   - Undo applies the reverse of one change's diff (git apply -R), checks the result against
 *     the schema, and commits it; a change that no longer reverses cleanly is refused.
 */
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { CODE_RE, HASH_RE, PackageError, commitOf, commitsTouching, createPackage, git, readManifest } from '../gamePackages.js';
import { DATA_KEYS, fileText, validateData } from '../../src/shared/studio/spec.js';

const COMMITTER = ['-c', 'user.name=Gamory Studio', '-c', 'user.email=studio@gamory.invalid', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null'];

/** A commit author for an account: its name (no <>, newlines) and a made-up address that names the account. */
export function authorOf(account) {
  const name = String(account?.name ?? 'Studio maker').replace(/[<>\n\r"\\]/g, '').trim().slice(0, 40) || 'Studio maker';
  const id = Number.isSafeInteger(Number(account?.id)) ? Number(account.id) : 0;
  return `${name} <account-${id}@studio.gamory.invalid>`;
}

/** A one-line commit subject, cleaned. */
const subjectOf = (text) => String(text ?? '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || 'Studio change';

export function studioRepo({ repo = resolve('.'), gamesDir = join(resolve(repo), 'games'), log = () => {} } = {}) {
  repo = resolve(repo);
  gamesDir = resolve(gamesDir);
  const rel = relative(repo, gamesDir).split(sep).join('/');
  /** The games folder must be inside the repository for its commits to be the game's history. */
  const relOk = !(rel.startsWith('..') || rel === '' || rel.startsWith('/'));
  let queue = Promise.resolve();
  /** One write at a time. */
  const serial = (fn) => {
    const run = queue.then(fn);
    queue = run.catch(() => {});
    return run;
  };
  let gitOk = null;
  const available = () => {
    if (!relOk) return false;
    if (gitOk === null) {
      try {
        gitOk = git(repo, ['rev-parse', '--is-inside-work-tree'], { allowFail: true }).stdout?.trim() === 'true';
      } catch {
        gitOk = false;
      }
    }
    return gitOk;
  };
  const need = () => {
    if (!available()) throw new PackageError('The Studio saves games as git commits: this server must run from a git checkout (docs/game-studio.md)', 503);
  };
  const gamePath = (code) => {
    if (!CODE_RE.test(String(code))) throw new PackageError('Bad game code', 400);
    return `${rel}/${code}`;
  };
  /** The game's folder on disk, refusing links (a link could point anywhere). */
  const folder = (code) => {
    gamePath(code);
    const dir = join(gamesDir, code);
    for (const d of [dir, join(dir, 'data')]) {
      if (!existsSync(d)) continue;
      if (lstatSync(d).isSymbolicLink()) throw new PackageError('Refused: the game folder is a link', 400);
    }
    return dir;
  };
  const dataFile = (code, key) => {
    if (!DATA_KEYS.includes(key)) throw new PackageError(`Not a data file: ${key}`, 400);
    return join(folder(code), 'data', `${key}.json`);
  };

  function commit(code, message, account) {
    const path = gamePath(code);
    git(repo, ['add', '--', path]);
    const status = git(repo, ['status', '--porcelain', '--', path]).trim();
    if (!status) return null;
    git(repo, [...COMMITTER, 'commit', '--no-verify', '-q', `--author=${authorOf(account)}`, '-m', message, '--', path]);
    const hash = git(repo, ['log', '-1', '--format=%H', '--', path]).trim();
    log(`[studio] ${code}: ${message.split('\n')[0]} (${hash.slice(0, 9)})`);
    return hash;
  }

/** The game's data: from the files, or as it was at a commit (`ref`, a checked hash). */
function read(code, ref = null) {
    if (ref) {
      need();
      if (!HASH_RE.test(String(ref))) throw new PackageError('Bad commit hash', 400);
      const full = commitOf(repo, ref);
      const out = {};
      for (const key of DATA_KEYS) {
        const r = git(repo, ['show', `${full}:${gamePath(code)}/data/${key}.json`], { allowFail: true });
        if (r.status !== 0) throw new PackageError(`No ${key}.json in that version`, 404);
        out[key] = JSON.parse(r.stdout);
      }
      return out;
    }
    const out = {};
    for (const key of DATA_KEYS) {
      const file = dataFile(code, key);
      if (!existsSync(file)) throw new PackageError(`games/${code}/data/${key}.json is missing`, 404);
      out[key] = JSON.parse(readFileSync(file, 'utf8'));
    }
    return out;
  }

  return {
    available,
    rel,

    manifest(code) {
      folder(code);
      return readManifest(gamesDir, code);
    },

    /** A new Studio game: the package from the studio template, then its first commit. */
    async create({ title, description = '', params = {}, owner }) {
      need();
      return serial(() => {
        const m = createPackage(gamesDir, { title, description, template: 'studio', genre: params.genre ?? 'collect', params, studio: { owner } });
        const hash = commit(m.code, `Studio: new game "${subjectOf(m.title)}"\n\nMade in the Game Studio (${params.render}, ${params.animation}, ${params.look}; starter ${params.genre}).`, owner);
        return { manifest: m, commit: hash };
      });
    },

    read,

    /** Bytes of the game's data files (the plan's storage). */
    bytes(code) {
      let n = 0;
      for (const key of DATA_KEYS) {
        try {
          n += statSync(dataFile(code, key)).size;
        } catch {
          /* missing: counted as 0 */
        }
      }
      return n;
    },

    /**
     * Write changed data files (validated as a whole first) and commit them.
     * Returns the commit hash, or null when nothing changed.
     */
    async write(code, data, keys, { message, account }) {
      need();
      const problems = validateData(data);
      if (problems.length) throw new PackageError(`Refused: ${problems.slice(0, 3).join('; ')}`, 422);
      return serial(() => {
        mkdirSync(join(folder(code), 'data'), { recursive: true });
        for (const key of keys) {
          const file = dataFile(code, key);
          const tmp = `${file}.tmp-${process.pid}`;
          writeFileSync(tmp, fileText(data[key]));
          renameSync(tmp, file);
        }
        return commit(code, message, account);
      });
    },

    /** Recent commits touching the game (newest first): the chat's history and Undo. */
    changes(code, limit = 30) {
      if (!available()) return [];
      return commitsTouching(repo, code, null).slice(0, limit).map((c) => ({ hash: c.hash, short: c.short, author: c.author, date: c.date, subject: c.subject, added: c.added, removed: c.removed, files: c.files.map((f) => f.path.slice(gamePath(code).length + 1)) }));
    },

    /** Reverse one change (only one that touched nothing but this game's data files). */
    async undo(code, hash, account) {
      need();
      if (!HASH_RE.test(String(hash))) throw new PackageError('Bad commit hash', 400);
      return serial(() => {
        const full = commitOf(repo, hash);
        const base = `${gamePath(code)}/data/`;
        const files = git(repo, ['show', '--name-only', '--format=', full]).split('\n').filter(Boolean);
        if (!files.length || files.some((f) => !f.startsWith(base))) throw new PackageError('Only changes to this game\'s data can be undone here', 400);
        const parents = git(repo, ['rev-list', '--parents', '-n', '1', full]).trim().split(' ');
        if (parents.length !== 2) throw new PackageError('That change cannot be undone (it has no single parent)', 400);
        const diff = git(repo, ['diff', '--binary', `${full}^`, full, '--', base]);
        const check = git(repo, ['apply', '--reverse', '--check', '-'], { input: diff, allowFail: true });
        if (check.status !== 0) throw new PackageError('Later changes edited the same lines — undo those first', 409);
        git(repo, ['apply', '--reverse', '-'], { input: diff });
        let data;
        try {
          data = read(code);
          const problems = validateData(data);
          if (problems.length) throw new PackageError(`Undo would break the game: ${problems[0]}`, 409);
        } catch (error) {
          git(repo, ['checkout', '--', base], { allowFail: true });
          throw error;
        }
        const subject = git(repo, ['log', '-1', '--format=%s', full]).trim();
        const commitHash = commit(code, `Studio: undo "${subjectOf(subject).replace(/^Studio: /, '')}"\n\nReverts ${full.slice(0, 12)} (games/${code}/ data only).`, account);
        return { commit: commitHash, data };
      });
    },

    /** Mark the game listed (public requested) or not; one commit to its manifest. */
    async setListed(code, listed, account) {
      need();
      return serial(() => {
        const file = join(folder(code), 'game.json');
        const m = JSON.parse(readFileSync(file, 'utf8'));
        if (!m.studio) throw new PackageError('Not a Studio game', 400);
        if (Boolean(m.studio.listed) === Boolean(listed)) return null;
        m.studio.listed = Boolean(listed);
        writeFileSync(file, `${JSON.stringify(m, null, 2)}\n`);
        return commit(code, listed ? `Studio: "${subjectOf(m.title)}" asks to be public (listed for review)` : `Studio: "${subjectOf(m.title)}" is not public any more`, account);
      });
    }
  };
}
