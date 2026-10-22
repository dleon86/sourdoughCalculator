import { Router } from 'express';
import { pool } from '../db.js';
import { Validator, badRequest } from '../validate.js';

const router = Router();

// The database speaks snake_case and the browser speaks camelCase. This is
// the one place that translation happens (the old app's save bug was a
// mismatch exactly here).
function toApi(row) {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    basis: row.basis,
    doughMass: row.dough_mass,
    flourMass: row.flour_mass,
    hydration: row.hydration,
    saltPct: row.salt_pct,
    starterPct: row.starter_pct,
    starterHydration: row.starter_hydration,
    flours: row.flours,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.bake_count !== undefined && {
      bakeCount: Number(row.bake_count),
      lastBakedOn: row.last_baked_on,
      avgRating: row.avg_rating == null ? null : Number(row.avg_rating),
    }),
  };
}

function parseRecipe(body) {
  const v = new Validator(body);
  const basis = body?.basis === 'flour' ? 'flour' : 'dough';
  const recipe = {
    name: v.text('name', { required: true, max: 120 }),
    notes: v.text('notes', { max: 5000 }),
    basis,
    // With the flour basis the browser still sends the resulting dough
    // weight, so lists can show it without redoing the math.
    doughMass: v.number('doughMass', { required: true, min: 1, max: 100000 }),
    flourMass: v.number('flourMass', { required: basis === 'flour', min: 1, max: 100000 }),
    hydration: v.number('hydration', { required: true, min: 0, max: 200 }),
    saltPct: v.number('saltPct', { required: true, min: 0, max: 20 }),
    starterPct: v.number('starterPct', { required: true, min: 0, max: 200 }),
    starterHydration: v.number('starterHydration', { required: true, min: 0, max: 500 }),
    flours: v.flours('flours'),
  };
  return { recipe, v };
}

const params = (r) => [
  r.name, r.notes, r.doughMass, r.hydration, r.saltPct,
  r.starterPct, r.starterHydration, JSON.stringify(r.flours), r.basis, r.flourMass,
];

router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT r.*,
           count(b.id)           AS bake_count,
           max(b.baked_on)::text AS last_baked_on,
           round(avg(b.rating), 1) AS avg_rating
      FROM recipes r
      LEFT JOIN bakes b ON b.recipe_id = r.id
     GROUP BY r.id
     ORDER BY coalesce(max(b.baked_on)::timestamptz, r.updated_at) DESC`);
  res.json(rows.map(toApi));
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM recipes WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Recipe not found' });
  res.json(toApi(rows[0]));
});

router.post('/', async (req, res) => {
  const { recipe, v } = parseRecipe(req.body);
  if (!v.ok) return badRequest(res, v.errors);
  const { rows } = await pool.query(
    `INSERT INTO recipes (name, notes, dough_mass, hydration, salt_pct,
                          starter_pct, starter_hydration, flours, basis, flour_mass)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    params(recipe),
  );
  res.status(201).json(toApi(rows[0]));
});

router.put('/:id', async (req, res) => {
  const { recipe, v } = parseRecipe(req.body);
  if (!v.ok) return badRequest(res, v.errors);
  const { rows } = await pool.query(
    `UPDATE recipes
        SET name = $1, notes = $2, dough_mass = $3, hydration = $4, salt_pct = $5,
            starter_pct = $6, starter_hydration = $7, flours = $8, basis = $9,
            flour_mass = $10, updated_at = now()
      WHERE id = $11 RETURNING *`,
    [...params(recipe), req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: 'Recipe not found' });
  res.json(toApi(rows[0]));
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM recipes WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Recipe not found' });
  res.status(204).end();
});

export default router;
