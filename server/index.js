import path from 'node:path';
import express from 'express';
import { initDatabase, pool } from './db.js';
import recipes from './routes/recipes.js';
import bakes from './routes/bakes.js';

const PUBLIC_DIR = path.join(import.meta.dirname, '..', 'public');
const port = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
});
app.use('/api/recipes', recipes);
app.use('/api/bakes', bakes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.use(express.static(PUBLIC_DIR));

// Express 5 forwards rejected promises from async handlers to here.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  // 22P02: invalid text representation, e.g. /api/recipes/abc
  if (err.code === '22P02') return res.status(404).json({ error: 'Not found' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server. Check the terminal for details.' });
});

try {
  await initDatabase();
} catch (err) {
  console.error('Could not set up the database. Check the PG* values in .env.\n', err.message);
  process.exit(1);
}

app.listen(port, () => {
  console.log(`Bread log running at http://localhost:${port}`);
});
