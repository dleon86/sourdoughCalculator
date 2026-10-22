import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

// Return DATE columns as 'YYYY-MM-DD' strings instead of JS Dates, which
// would otherwise shift a day depending on the server's timezone.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

const MIGRATIONS_DIR = path.join(import.meta.dirname, 'migrations');

// `pg` reads PGHOST, PGPORT, PGUSER, PGPASSWORD and PGDATABASE from the env.
export const pool = new pg.Pool();

// Create the app database on first run so setup is just "npm start".
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
async function migrate() {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  const { rows } = await pool.query('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.name));
  const files = (await fs.readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`Applied migration ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export async function initDatabase() {
  await ensureDatabase();
  await migrate();
}
