#!/usr/bin/env node
/**
 * Game packages from the command line (docs/production.md, "Deploying one game").
 *
 *   npm run game:create   -- --title "My Game" [--template 3d|2d] [--slug my-game] [--id official:my-game] [--genre arcade]
 *                            [--template studio --render flat2d|full3d|hd2d|painted --animation pixel|skeletal|toon|plush --look realistic|stylized|cartoon]
 *   npm run game:test     -- <game>                  only this game's unit tests
 *   npm run game:list
 *   npm run game:changes  -- <game>                  the draft's changes not in production
 *   npm run game:diff     -- <game> <hash>            one change, file by file
 *   npm run game:deploy   -- <game> --all             the draft as committed
 *   npm run game:deploy   -- <game> --pick <h1,h2>    production + only these changes
 *   npm run game:deploy   -- <game> --base <commit>   a release of that commit as it was
 *        [--version x.y.z | --bump patch|minor|major] [--notes "…"] [--by name]
 *        [--force]  skip the gates (the release's unit tests, then a smoke load of the staged
 *                   release on BASE_URL's server when one is up)
 *   npm run game:history  -- <game>
 *   npm run game:rollback -- <game> <version>         repoint, no rebuild
 *   npm run game:verify   -- <game> [version]         check files against release.json
 *
 * <game> is the shortcode (g_xxxxxxxxxx), the slug (kickrani) or the id (official:seoul).
 * RELEASES_DIR overrides where releases are written (default ./releases).
 */
import { resolve, join } from 'node:path';
import { userInfo } from 'node:os';
import { runSmoke } from './game-smoke.mjs';
import {
  runGameTests, createPackage, scanPackages, resolvePackage, pendingChanges, commitDiff, deploy, history, rollback, verifyRelease, listReleases, readCurrent, PackageError
} from '../server/gamePackages.js';

const repo = resolve(process.env.GAMES_REPO ?? '.');
const gamesDir = join(repo, 'games');
const releasesDir = resolve(process.env.RELEASES_DIR ?? join(repo, 'releases'));

function parse(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) args[key] = true;
      else {
        args[key] = next;
        i++;
      }
    } else args._.push(a);
  }
  return args;
}

const [command, ...rest] = process.argv.slice(2);
const args = parse(rest);
const pkgOf = () => resolvePackage(scanPackages(gamesDir), args._[0]);
const fmtDate = (iso) => (iso ? iso.replace('T', ' ').slice(0, 16) : '');

function printChanges(list) {
  if (!list.length) return console.log('  (none: production is the draft)');
  for (const c of list) {
    console.log(`  ${c.short}  ${fmtDate(c.date)}  ${c.author.padEnd(14).slice(0, 14)}  +${c.added} -${c.removed}  ${c.subject}`);
  }
}

try {
  switch (command) {
    case 'create': {
      const str = (v) => (typeof v === 'string' ? v : undefined);
      const m = createPackage(gamesDir, { title: str(args.title), slug: str(args.slug), id: str(args.id), description: str(args.description) ?? '', template: str(args.template) ?? '3d', genre: str(args.genre) ?? 'arcade', params: { render: str(args.render), animation: str(args.animation), look: str(args.look), palette: str(args.palette), genre: str(args.genre) } });
      console.log(`Created games/${m.code}/ — ${m.title} (slug ${m.slug}, id ${m.id}, ${m.template} starter). A draft: only the admin sees it until its first deploy.`);
      console.log(`  npm run game:dev -- ${m.slug}      play it now`);
      console.log(`  npm run game:test -- ${m.slug}     its tests`);
      console.log(`  games/${m.code}/README.md          the file map`);
      break;
    }
    case 'test': {
      const p = pkgOf();
      const r = runGameTests(repo, p.code, { stdio: 'inherit' });
      console.log(`${p.title}: ${r.files.length} test file(s) ${r.ok ? 'passed' : 'FAILED'}`);
      process.exitCode = r.ok ? 0 : 1;
      break;
    }
    case 'list': {
      for (const p of scanPackages(gamesDir)) {
        const cur = readCurrent(releasesDir, p.code);
        console.log(`${p.code}  ${p.slug.padEnd(16)} ${p.id.padEnd(22)} production ${cur?.version ?? '(none)'}  — ${p.title}`);
      }
      break;
    }
    case 'changes': {
      const p = pkgOf();
      const cur = readCurrent(releasesDir, p.code);
      const live = cur ? listReleases(releasesDir, p.code).find((r) => r.version === cur.version) : null;
      console.log(`${p.title} (${p.code}) — production ${cur?.version ?? '(none)'}${live ? `, base ${live.source.base.slice(0, 9)}${live.source.picks.length ? ` + ${live.source.picks.length} picked` : ''}` : ''}`);
      console.log('Draft changes not in production (newest first):');
      printChanges(pendingChanges(repo, p.code, live));
      break;
    }
    case 'diff': {
      const p = pkgOf();
      const d = commitDiff(repo, p.code, args._[1]);
      console.log(`${d.hash}  ${d.author}  ${d.date}\n${d.subject}\n`);
      for (const f of d.files) console.log(f.diff);
      break;
    }
    case 'deploy': {
      const p = pkgOf();
      const picks = typeof args.pick === 'string' ? args.pick.split(',').map((s) => s.trim()).filter(Boolean) : null;
      if (!args.all && !picks && !args.base) throw new PackageError('Say what to deploy: --all, --pick <hash,…> or --base <commit>');
      const release = await deploy({
        repo,
        releasesDir,
        ref: p.code,
        all: Boolean(args.all),
        picks,
        base: typeof args.base === 'string' ? args.base : null,
        version: typeof args.version === 'string' ? args.version : null,
        bump: typeof args.bump === 'string' ? args.bump : 'patch',
        notes: typeof args.notes === 'string' ? args.notes : '',
        by: typeof args.by === 'string' ? args.by : `${userInfo().username} (cli)`,
        force: Boolean(args.force),
        // The staged release, loaded once in a browser on the running platform (skipped, with a note, when none is up).
        smoke: (release) => runSmoke({ pkg: p, version: release.version, requireServer: false }),
        log: (line) => console.log(line)
      });
      const bytes = release.files.reduce((s, f) => s + f.bytes, 0);
      console.log(`Deployed ${release.title} ${release.version}: releases/${release.code}/${release.version}/ (${release.files.length} files, ${(bytes / 1048576).toFixed(2)} MB), base ${release.source.base.slice(0, 9)}${release.source.picks.length ? ` + picks ${release.source.picks.map((h) => h.slice(0, 9)).join(', ')}` : ''}.`);
      console.log('Players get it now; commit releases/ to ship it with the platform.');
      break;
    }
    case 'history': {
      const p = pkgOf();
      const h = history({ repo, releasesDir, pkg: p });
      console.log(`${p.title} (${p.code}) — production ${h.current?.version ?? '(none)'}`);
      for (const r of h.releases) {
        const live = r.version === h.current?.version ? ' ◀ live' : '';
        console.log(`\n${r.version}${live}  ${fmtDate(r.date)}  by ${r.deployedBy}  (${r.source.mode}, base ${r.source.base.slice(0, 9)}${r.source.picks.length ? ` + ${r.source.picks.length} picked` : ''})`);
        if (r.notes) console.log(r.notes.split('\n').map((l) => `    ${l}`).join('\n'));
        for (const c of r.added) console.log(`    + ${c.hash.slice(0, 9)} ${c.subject}`);
      }
      console.log('\nNot yet in production:');
      if (h.pending) printChanges(h.pending);
      else console.log(`  (git: ${h.gitError})`);
      break;
    }
    case 'rollback': {
      const p = pkgOf();
      const cur = rollback(releasesDir, p.code, args._[1], { by: typeof args.by === 'string' ? args.by : `${userInfo().username} (cli)` });
      console.log(`${p.title}: players now get ${cur.version}.`);
      break;
    }
    case 'verify': {
      const p = pkgOf();
      const versions = args._[1] ? [args._[1]] : listReleases(releasesDir, p.code).map((r) => r.version);
      let bad = 0;
      for (const v of versions) {
        const r = verifyRelease(releasesDir, p.code, v);
        console.log(`${v}: ${r.ok ? 'ok' : r.problems.join('; ')}`);
        if (!r.ok) bad++;
      }
      process.exitCode = bad ? 1 : 0;
      break;
    }
    default:
      console.log('Usage: node scripts/game.mjs <create|list|test|changes|diff|deploy|history|rollback|verify> …  (see the top of this file)');
      process.exitCode = command ? 1 : 0;
  }
} catch (error) {
  console.error(`[game] ${error.message}`);
  if (error.conflict) console.error(`[game] conflicting change ${error.conflict.hash}: ${error.conflict.files.join(', ') || '(see reason)'}`);
  process.exitCode = 1;
}
