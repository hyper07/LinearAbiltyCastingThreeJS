#!/usr/bin/env node
/**
 * Bring the old SQLite files (DATA_DIR/game.sqlite, DATA_DIR/library.sqlite)
 * into PostgreSQL: DATABASE_URL, or PGlite in DATA_DIR/postgres. A server does
 * this by itself the first time it starts on an empty database; this runs it
 * by hand and says what happened. It never mixes into a database that has data.
 *
 *   npm run db:import
 *   DATABASE_URL=postgres://… DATA_DIR=/srv/gamory/data npm run db:import
 */
import { resolve } from 'node:path';
import { openDatabase } from '../server/db/database.js';

const dataDir = resolve(process.env.DATA_DIR ?? 'data');
const db = await openDatabase({ url: process.env.DATABASE_URL, dataDir, log: (line) => console.log(line) });
const result = db.imported ?? { imported: false };
console.log(result.imported ? `imported: ${JSON.stringify(result.counts)}` : `nothing imported: ${result.reason}`);
await db.close();
