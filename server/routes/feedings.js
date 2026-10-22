import { Router } from 'express';
import { pool } from '../db.js';
import { Validator, badRequest } from '../validate.js';
import { feedingToApi } from './starters.js';

const router = Router();

function parseFeeding(body) {
  const v = new Validator(body);
  const feeding = {
    starterId: v.number('starterId', { required: true, integer: true, min: 1 }),
    fedAt: v.timestamp('fedAt', { required: true }),
    seedG: v.number('seedG', { min: 0, max: 10000 }),
    flourG: v.number('flourG', { min: 0, max: 10000 }),
    waterG: v.number('waterG', { min: 0, max: 10000 }),
    temp: v.number('temp', { min: -50, max: 150 }),
    tempUnit: body?.tempUnit === 'C' ? 'C' : 'F',
    inWarmer: v.bool('inWarmer'),
    peakedAt: v.timestamp('peakedAt'),
    risePct: v.number('risePct', { min: 0, max: 1000 }),
    notes: v.text('notes', { max: 5000 }),
  };
  if (feeding.fedAt && feeding.peakedAt && feeding.peakedAt <= feeding.fedAt) {
    v.fail('peakedAt', 'Peak has to come after the feeding');
  }
  return { feeding, v };
}

const params = (f) => [
  f.starterId, f.fedAt, f.seedG, f.flourG, f.waterG, f.temp, f.tempUnit,
  f.inWarmer, f.peakedAt, f.risePct, f.notes,
];

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM feedings WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Feeding not found' });
  res.json(feedingToApi(rows[0]));
});

router.post('/', async (req, res) => {
  const { feeding, v } = parseFeeding(req.body);
  if (!v.ok) return badRequest(res, v.errors);
  const { rows } = await pool.query(
    `INSERT INTO feedings (starter_id, fed_at, seed_g, flour_g, water_g, temp, temp_unit,
                           in_warmer, peaked_at, rise_pct, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    params(feeding),
  );
  res.status(201).json(feedingToApi(rows[0]));
});

router.put('/:id', async (req, res) => {
  const { feeding, v } = parseFeeding(req.body);
  if (!v.ok) return badRequest(res, v.errors);
  const { rows } = await pool.query(
    `UPDATE feedings
        SET starter_id = $1, fed_at = $2, seed_g = $3, flour_g = $4, water_g = $5, temp = $6,
            temp_unit = $7, in_warmer = $8, peaked_at = $9, rise_pct = $10, notes = $11
      WHERE id = $12 RETURNING *`,
    [...params(feeding), req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: 'Feeding not found' });
  res.json(feedingToApi(rows[0]));
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM feedings WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Feeding not found' });
  res.status(204).end();
});

export default router;
