import { Router } from 'express';
import { pool } from '../db.js';
import { Validator, badRequest } from '../validate.js';

const router = Router();

export function starterToApi(row) {
  return {
    id: row.id,
    name: row.name,
    flour: row.flour,
    notes: row.notes,
    archived: row.archived,
    createdAt: row.created_at,
  };
}

export function feedingToApi(row) {
  return {
    id: row.id,
    starterId: row.starter_id,
    fedAt: row.fed_at,
    seedG: row.seed_g,
    flourG: row.flour_g,
    waterG: row.water_g,
    temp: row.temp,
    tempUnit: row.temp_unit,
    inWarmer: row.in_warmer,
    peakedAt: row.peaked_at,
    risePct: row.rise_pct,
    notes: row.notes,
  };
}

function parseStarter(body) {
  const v = new Validator(body);
  return {
    v,
    starter: {
      name: v.text('name', { required: true, max: 80 }),
      flour: v.text('flour', { max: 120 }),
      notes: v.text('notes', { max: 5000 }),
      archived: v.bool('archived'),
    },
  };
}

// Each starter with its most recent feeding, so the list can show
// "fed 3 h ago" without a second request.
router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT s.*, to_jsonb(f) AS last_feeding
      FROM starters s
      LEFT JOIN LATERAL (
        SELECT * FROM feedings WHERE starter_id = s.id ORDER BY fed_at DESC LIMIT 1
      ) f ON true
     ORDER BY s.archived, s.created_at`);
  res.json(rows.map((r) => ({
    ...starterToApi(r),
    lastFeeding: r.last_feeding ? feedingToApi(r.last_feeding) : null,
  })));
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM starters WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Starter not found' });
  const feedings = await pool.query(
    'SELECT * FROM feedings WHERE starter_id = $1 ORDER BY fed_at DESC LIMIT 200',
    [req.params.id],
  );
  res.json({ ...starterToApi(rows[0]), feedings: feedings.rows.map(feedingToApi) });
});

router.post('/', async (req, res) => {
  const { starter: s, v } = parseStarter(req.body);
  if (!v.ok) return badRequest(res, v.errors);
  const { rows } = await pool.query(
    'INSERT INTO starters (name, flour, notes, archived) VALUES ($1, $2, $3, $4) RETURNING *',
    [s.name, s.flour, s.notes, s.archived],
  );
  res.status(201).json(starterToApi(rows[0]));
});

router.put('/:id', async (req, res) => {
  const { starter: s, v } = parseStarter(req.body);
  if (!v.ok) return badRequest(res, v.errors);
  const { rows } = await pool.query(
    'UPDATE starters SET name = $1, flour = $2, notes = $3, archived = $4 WHERE id = $5 RETURNING *',
    [s.name, s.flour, s.notes, s.archived, req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: 'Starter not found' });
  res.json(starterToApi(rows[0]));
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM starters WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Starter not found' });
  res.status(204).end();
});

export default router;
