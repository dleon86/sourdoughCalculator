import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

// Return DATE columns as 'YYYY-MM-DD' strings instead of JS Dates, which
// would otherwise shift a day depending on the server's timezone.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

const MIGRATIONS_DIR = path.join(import.meta.dirname, 'migrations');

// In the cloud, Neon provides DATABASE_URL. Locally, `pg` reads PGHOST,
// PGPORT, PGUSER, PGPASSWORD and PGDATABASE from .env.
const connectionString = process.env.DATABASE_URL;
export const pool = new pg.Pool(connectionString ? { connectionString, max: 5 } : {});

// Create the local database on first run so setup is just "npm start".
// (A hosted database already exists, so this is skipped there.)
async function ensureDatabase() {
  const name = process.env.PGDATABASE;
  const admin = new pg.Client({ database: 'postgres' });
  await admin.connect();
  try {
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (rowCount === 0) {
      await admin.query(`CREATE DATABASE ${pg.escapeIdentifier(name)}`);
      console.log(`Created database "${name}"`);
    }
  } finally {
    await admin.end();
  }
}

// Apply every .sql file in migrations/ that hasn't run yet, in name order.
// The advisory lock stops two cold-starting cloud instances from running
// the same migration at once.
async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(20231024)');
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.name));
    const files = (await fs.readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`Applied migration ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(20231024)').catch(() => {});
    client.release();
  }
}

// Set up once per process, on first use. A failure is not cached, so the
// next request retries instead of the instance staying broken.
let readyPromise = null;
export function ready() {
  readyPromise ??= (async () => {
    if (!connectionString) await ensureDatabase();
    await migrate();
  })().catch((err) => {
    readyPromise = null;
    throw err;
  });
  return readyPromise;
}

// Run `fn(client)` inside a transaction.
export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
