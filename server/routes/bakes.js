import { Router } from 'express';
import { pool } from '../db.js';
import { Validator, badRequest } from '../validate.js';

const router = Router();
const EVENT_TYPES = new Set(['autolyse', 'mix', 'fold', 'shape', 'fridge', 'oven', 'out']);

function toApi(row) {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    starterId: row.starter_id,
    status: row.status,
    events: row.events,
    formula: row.formula,
    bakedOn: row.baked_on,
    bulkMinutes: row.bulk_minutes,
    proofMinutes: row.proof_minutes,
    coldProof: row.cold_proof,
    roomTemp: row.room_temp,
    ovenTemp: row.oven_temp,
    tempUnit: row.temp_unit,
    bakeMinutes: row.bake_minutes,
    rating: row.rating,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function parseBake(body) {
  const v = new Validator(body);
  const formula = body?.formula;
  if (!formula || typeof formula !== 'object' || Array.isArray(formula)) {
    v.fail('formula', 'Pick a recipe or enter a formula');
  }
  const tempUnit = body?.tempUnit === 'C' ? 'C' : 'F';
  const events = body?.events ?? [];
  if (!Array.isArray(events) || events.length > 200
      || !events.every((e) => EVENT_TYPES.has(e?.type) && !Number.isNaN(Date.parse(e?.at)))) {
    v.fail('events', 'Timer steps are not in the expected format');
  }
  const bake = {
    recipeId: v.number('recipeId', { integer: true, min: 1 }),
    starterId: v.number('starterId', { integer: true, min: 1 }),
    formula,
    status: body?.status === 'active' ? 'active' : 'done',
    events: v.errors.events ? [] : events.map((e) => ({ type: e.type, at: new Date(e.at).toISOString() })),
    bakedOn: v.date('bakedOn'),
    bulkMinutes: v.number('bulkMinutes', { integer: true, min: 0, max: 7 * 24 * 60 }),
    proofMinutes: v.number('proofMinutes', { integer: true, min: 0, max: 7 * 24 * 60 }),
    coldProof: Boolean(body?.coldProof),
    roomTemp: v.number('roomTemp', { min: -50, max: 150 }),
    ovenTemp: v.number('ovenTemp', { min: 0, max: 1000 }),
    tempUnit,
    bakeMinutes: v.number('bakeMinutes', { integer: true, min: 0, max: 600 }),
    rating: v.number('rating', { integer: true, min: 1, max: 5 }),
    notes: v.text('notes', { max: 10000 }),
  };
  return { bake, v };
}

const params = (b) => [
  b.recipeId, JSON.stringify(b.formula), b.bakedOn, b.bulkMinutes, b.proofMinutes,
  b.coldProof, b.roomTemp, b.ovenTemp, b.tempUnit, b.bakeMinutes, b.rating, b.notes, b.starterId,
  b.status, JSON.stringify(b.events),
];

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM bakes ORDER BY status = 'active' DESC, baked_on DESC, created_at DESC`,
  );
  res.json(rows.map(toApi));
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM bakes WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Bake not found' });
  res.json(toApi(rows[0]));
});

router.post('/', async (req, res) => {
  const { bake, v } = parseBake(req.body);
  if (!v.ok) return badRequest(res, v.errors);
  const { rows } = await pool.query(
    `INSERT INTO bakes (recipe_id, formula, baked_on, bulk_minutes, proof_minutes, cold_proof,
                        room_temp, oven_temp, temp_unit, bake_minutes, rating, notes, starter_id,
                        status, events)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
    params(bake),
  );
  res.status(201).json(toApi(rows[0]));
});

router.put('/:id', async (req, res) => {
  const { bake, v } = parseBake(req.body);
  if (!v.ok) return badRequest(res, v.errors);
  const { rows } = await pool.query(
    `UPDATE bakes
        SET recipe_id = $1, formula = $2, baked_on = $3, bulk_minutes = $4, proof_minutes = $5,
            cold_proof = $6, room_temp = $7, oven_temp = $8, temp_unit = $9, bake_minutes = $10,
            rating = $11, notes = $12, starter_id = $13, status = $14, events = $15
      WHERE id = $16 RETURNING *`,
    [...params(bake), req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: 'Bake not found' });
  res.json(toApi(rows[0]));
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM bakes WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Bake not found' });
  res.status(204).end();
});

export default router;
