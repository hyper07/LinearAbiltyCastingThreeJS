import { openDatabase } from '../../server/db/database.js';

/**
 * A fresh, empty database for one test.
 *
 *   default                PGlite in memory: real PostgreSQL, nothing to install
 *   TEST_DATABASE_URL=…    a new database on that PostgreSQL server, dropped afterwards
 *                          (the URL's user must be allowed to CREATE DATABASE)
 *
 *   TEST_DATABASE_URL=postgres://localhost/postgres npm test
 */
let count = 0;

export async function testDatabase() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return openDatabase({ memory: true });
  const { default: pg } = await import('pg');
  const name = `gamory_test_${process.pid}_${++count}_${Date.now().toString(36)}`;
  const admin = new pg.Client({ connectionString: url });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.end();
  const target = new URL(url);
  target.pathname = `/${name}`;
  const db = await openDatabase({ url: target.toString(), importOld: false });
  const close = db.close.bind(db);
  db.close = async () => {
    await close();
    const drop = new pg.Client({ connectionString: url });
    await drop.connect();
    await drop.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await drop.end();
  };
  return db;
}
