#!/usr/bin/env node
/**
 * For the people running a Gamory server. Reads DATA_DIR (default ./data)
 * with the server's key (SERVER_SECRET, or DATA_DIR/server.key).
 *
 *   node scripts/admin.mjs audit                         check everything (exit 1 on any problem)
 *   node scripts/admin.mjs history <name> [count]        an account's history
 *   node scripts/admin.mjs strikes [hours]               recent rule breaks, worst accounts first
 *   node scripts/admin.mjs block <name> <hours> <reason> block an account (and sign it out)
 *   node scripts/admin.mjs unblock <name> [note]         lift a block and clear its strikes
 *   node scripts/admin.mjs block-address <ip> <hours> <reason>
 *   node scripts/admin.mjs plan <name> <free|plus>       set an account's plan (src/platform/plans.js)
 *
 * The audit checks the four things that would show cheating or tampering:
 *   1. the history chain is unbroken (no event edited, removed or inserted)
 *   2. every saved character opens with the server's key (none edited by hand)
 *   3. every item a character holds is registered to that character, and no
 *      item is held by two characters or held but missing (no duplicates)
 *   4. every character's gold equals the sum of its ledger
 *
 * Stop the server first, or run against a copy: the audit reads a moment in time.
 */
import { resolve, join } from 'node:path';
import { GameDB, History } from '../server/game/db.js';
import { Keys, loadSecret } from '../server/game/keys.js';
import { Accounts } from '../server/game/accounts.js';

const [command, ...args] = process.argv.slice(2);
const dataDir = resolve(process.env.DATA_DIR ?? 'data');
const { secret } = loadSecret(dataDir);
const keys = new Keys(secret);
const db = await GameDB.open(join(dataDir, 'game.sqlite'));
const history = new History(db, keys);
const accounts = new Accounts({ db, keys, history, authority: { createCharacter() {}, characters: new Map() } });
const fail = (message) => {
  console.error(message);
  process.exit(2);
};
const account = (name) => accounts.byName(name ?? '') ?? fail(`No account named “${name}”`);
const when = (t) => new Date(t).toISOString().replace('T', ' ').slice(0, 19);

switch (command) {
  case 'audit': {
    const problems = [];
    const chain = history.verify();
    console.log(`history: ${chain.count} events ${chain.ok ? 'chained correctly' : `— BROKEN at event ${chain.brokenAt}`}`);
    if (!chain.ok) problems.push(`history chain broken at event ${chain.brokenAt}`);

    const held = new Map(); // uid → account id, from the characters
    let opened = 0;
    for (const row of db.db.prepare('SELECT account_id, state FROM characters').iterate()) {
      let state;
      try {
        state = keys.open(row.state, `character:${row.account_id}`);
        opened++;
      } catch {
        problems.push(`account ${row.account_id}: saved character does not open (edited outside the server, or another key)`);
        continue;
      }
      const uids = [...(state.bag ?? []), ...(state.stash ?? []), state.equipped, ...Object.values(state.gear ?? {})].filter(Boolean).map((i) => i.uid);
      for (const uid of uids) {
        if (held.has(uid)) problems.push(`item ${uid} is held by accounts ${held.get(uid)} and ${row.account_id}`);
        held.set(uid, row.account_id);
        const reg = db.q('SELECT owner, state FROM items WHERE uid = ?').get(uid);
        if (!reg) problems.push(`account ${row.account_id}: item ${uid} was never made by the server`);
        else if (reg.owner !== row.account_id || reg.state !== 'held') problems.push(`account ${row.account_id}: item ${uid} is registered as ${reg.state} for ${reg.owner}`);
      }
      const ledger = db.q('SELECT COALESCE(SUM(delta), 0) AS s FROM ledger WHERE account_id = ?').get(row.account_id).s;
      if (ledger !== (state.gold ?? 0)) problems.push(`account ${row.account_id}: gold ${state.gold} but the ledger adds up to ${ledger}`);
    }
    console.log(`characters: ${opened} opened with the server's key`);
    for (const row of db.db.prepare("SELECT uid, owner FROM items WHERE state = 'held'").iterate()) {
      if (held.get(row.uid) !== row.owner) problems.push(`item ${row.uid} is registered to account ${row.owner} but no character holds it`);
    }
    console.log(`items: ${held.size} held, registry consistent: ${!problems.some((p) => /item/.test(p))}`);
    const blocked = db.q('SELECT COUNT(*) AS n FROM accounts WHERE blocked_until > ?').get(Date.now()).n;
    console.log(`accounts: ${db.q('SELECT COUNT(*) AS n FROM accounts').get().n}, blocked now: ${blocked}`);
    if (problems.length) {
      console.log(`\n${problems.length} problem(s):`);
      for (const p of problems.slice(0, 200)) console.log(`  - ${p}`);
      process.exit(1);
    }
    console.log('\nall checks passed');
    break;
  }
  case 'history': {
    const a = account(args[0]);
    for (const e of history.of(a.id, Number(args[1]) || 50)) console.log(`${when(e.at)}  ${e.type.padEnd(13)} ${JSON.stringify(e.data)}`);
    break;
  }
  case 'strikes': {
    const since = Date.now() - (Number(args[0]) || 24) * 36e5;
    const rows = db.db
      .prepare('SELECT a.name, s.account_id, SUM(s.weight) AS w, COUNT(*) AS n, GROUP_CONCAT(DISTINCT s.rule) AS rules, a.blocked_until FROM strikes s JOIN accounts a ON a.id = s.account_id WHERE s.at > ? GROUP BY s.account_id ORDER BY w DESC LIMIT 50')
      .all(since);
    for (const r of rows) console.log(`${r.name.padEnd(20)} weight ${String(r.w).padEnd(5)} ${r.n} strike(s): ${r.rules}${r.blocked_until > Date.now() ? `  [blocked until ${when(r.blocked_until)}]` : ''}`);
    if (!rows.length) console.log('no strikes');
    break;
  }
  case 'block': {
    const a = account(args[0]);
    const hours = Number(args[1]);
    if (!(hours > 0)) fail('block <name> <hours> <reason>');
    console.log(`${a.name} blocked until ${when(accounts.block(a.id, hours, args.slice(2).join(' ') || 'blocked by an admin'))}`);
    break;
  }
  case 'unblock': {
    const a = account(args[0]);
    accounts.unblock(a.id, args.slice(1).join(' '));
    console.log(`${a.name} unblocked`);
    break;
  }
  case 'block-address': {
    const hours = Number(args[1]);
    if (!args[0] || !(hours > 0)) fail('block-address <ip> <hours> <reason>');
    accounts.blockAddress(args[0], hours, args.slice(2).join(' ') || 'abuse');
    console.log(`address blocked for ${hours} h (stored only as a keyed hash)`);
    break;
  }
  case 'plan': {
    const a = account(args[0]);
    if (!args[1]) fail('plan <name> <free|plus>');
    accounts.setPlan(a.id, args[1]);
    console.log(`${a.name} is on ${args[1]} (takes effect on their next AI request)`);
    break;
  }
  default:
    console.log('commands: audit | history <name> | strikes [hours] | block <name> <hours> <reason> | unblock <name> | block-address <ip> <hours> <reason> | plan <name> <free|plus>');
}
db.close();
