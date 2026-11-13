/**
 * The wallet: each account's game money (dollars, in cents), shared by the
 * games that pay or spend it — the work game pays salary and bonuses into it;
 * the stock game can move it into a run. Every change is a ledger row with
 * the reason and the balance after.
 *
 *   GET /api/wallet   { balance, ledger: [last 50] }   (signed in)
 *
 * Callers write through `credit` / `debit` inside their own transaction
 * (db.tx), so a game's change and the wallet's happen together or not at all.
 */
export function createWallet(db, { now = () => Date.now() } = {}) {
  async function balance(accountId) {
    return Number((await db.one('SELECT balance FROM wallet WHERE account_id = ?', [accountId]))?.balance ?? 0);
  }

  async function change(accountId, delta, reason, ref = null) {
    const at = now();
    await db.run('INSERT INTO wallet (account_id, balance, updated) VALUES (?, 0, ?) ON CONFLICT (account_id) DO NOTHING', [accountId, at]);
    const row = await db.one('UPDATE wallet SET balance = balance + ?, updated = ? WHERE account_id = ? AND balance + ? >= 0 RETURNING balance', [delta, at, accountId, delta]);
    if (!row) throw Object.assign(new Error('Not enough money in your wallet'), { status: 409 });
    await db.run('INSERT INTO wallet_ledger (account_id, delta, balance, reason, ref, at) VALUES (?, ?, ?, ?, ?, ?)', [accountId, delta, row.balance, reason, ref, at]);
    return Number(row.balance);
  }

  return {
    balance,
    credit: (accountId, cents, reason, ref) => change(accountId, Math.max(0, Math.round(cents)), reason, ref),
    debit: (accountId, cents, reason, ref) => change(accountId, -Math.max(0, Math.round(cents)), reason, ref),
    async ledger(accountId, limit = 50) {
      return (await db.many('SELECT delta, balance, reason, ref, at FROM wallet_ledger WHERE account_id = ? ORDER BY id DESC LIMIT ?', [accountId, limit])).map((r) => ({ ...r, delta: Number(r.delta), balance: Number(r.balance), at: Number(r.at) }));
    }
  };
}
