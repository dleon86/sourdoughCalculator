// Backups: everything as one JSON file, bakes as CSV, and restore.
// The JSON holds raw database rows, so a restore is a straight copy back
// (jsonb_populate_recordset maps each object onto the table's columns).
import { Router } from 'express';
import { pool, transaction } from '../db.js';

const router = Router();
// Restore order: parents before children. Deletion runs in reverse.
const TABLES = ['recipes', 'starters', 'bakes', 'feedings', 'photos'];

const stamp = () => new Date().toISOString().slice(0, 10);

router.get('/export', async (req, res) => {
  const data = { app: 'bread-log', exportedAt: new Date().toISOString() };
  data.migrations = (await pool.query('SELECT name FROM schema_migrations ORDER BY name')).rows.map((r) => r.name);
  for (const table of TABLES) {
    data[table] = (await pool.query(`SELECT * FROM ${table} ORDER BY id`)).rows;
  }
  res.set('Content-Disposition', `attachment; filename="bread-log-${stamp()}.json"`);
  res.json(data);
});

const csvCell = (v) => {
  if (v == null) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

router.get('/export/bakes.csv', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM bakes WHERE status = 'done' ORDER BY baked_on, id`);
  const header = ['date', 'recipe', 'dough_g', 'hydration_pct', 'salt_pct', 'starter_pct', 'bulk_min', 'proof_min',
    'cold_proof', 'kitchen_temp', 'oven_temp', 'temp_unit', 'bake_min', 'rating', 'notes'];
  const lines = rows.map((b) => [
    b.baked_on, b.formula.name, b.formula.doughMass, b.formula.hydration, b.formula.saltPct, b.formula.starterPct,
    b.bulk_minutes, b.proof_minutes, b.cold_proof ? 'yes' : 'no', b.room_temp, b.oven_temp, b.temp_unit,
    b.bake_minutes, b.rating, b.notes,
  ].map(csvCell).join(','));
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="bread-log-bakes-${stamp()}.csv"`,
  });
  res.send([header.join(','), ...lines].join('\r\n'));
});

// Replace everything with the contents of a backup. Photo files are not in
// the backup, so photo rows are only kept when restoring into the same
// place the backup came from (the files are still there).
router.post('/import', async (req, res) => {
  const data = req.body;
  if (data?.app !== 'bread-log' || !Array.isArray(data.migrations)) {
    return res.status(400).json({ error: 'That file isn’t a Bread Log backup' });
  }
  const known = new Set((await pool.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
  if (data.migrations.some((m) => !known.has(m))) {
    return res.status(400).json({ error: 'That backup is from a newer version of the app. Update this copy first.' });
  }
  const keepPhotos = req.query.photos === 'keep';

  const counts = await transaction(async (client) => {
    for (const table of [...TABLES].reverse()) await client.query(`DELETE FROM ${table}`);
    const result = {};
    for (const table of TABLES) {
      const rows = table === 'photos' && !keepPhotos ? [] : (data[table] ?? []);
      if (!Array.isArray(rows)) throw Object.assign(new Error(`${table} is not a list`), { status: 400 });
      if (rows.length) {
        await client.query(`INSERT INTO ${table} SELECT * FROM jsonb_populate_recordset(NULL::${table}, $1)`, [JSON.stringify(rows)]);
      }
      // Continue ids after the highest restored one.
      await client.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), coalesce((SELECT max(id) FROM ${table}), 0) + 1, false)`);
      result[table] = rows.length;
    }
    return result;
  });
  res.json({ restored: counts });
});

export default router;
