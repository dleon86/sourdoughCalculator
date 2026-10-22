import path from 'node:path';
import express from 'express';
import { pool, ready } from './db.js';
import { authRouter, requireAuth } from './auth.js';
import recipes from './routes/recipes.js';
import bakes from './routes/bakes.js';
import starters from './routes/starters.js';
import feedings from './routes/feedings.js';
import photos from './routes/photos.js';
import backup from './routes/backup.js';

const PUBLIC_DIR = path.join(import.meta.dirname, '..', 'public');

const app = express();
// Behind Vercel's proxy, so req.secure reflects the original https request.
app.set('trust proxy', true);
app.use(express.json({ limit: '5mb' }));

// Make sure the database is migrated before any API request touches it.
app.use('/api', async (req, res, next) => {
  await ready();
  next();
});

app.get('/api/health', async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
});
app.use('/api', authRouter);
app.use('/api', requireAuth);
app.use('/api/recipes', recipes);
app.use('/api/bakes', bakes);
app.use('/api/starters', starters);
app.use('/api/feedings', feedings);
app.use('/api', photos);
app.use('/api', backup);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Local only. On Vercel, files in public/ are served by the CDN instead,
// but "/" still reaches this app, so point it at the page.
app.use(express.static(PUBLIC_DIR));
app.get('/', (req, res) => res.redirect(302, '/index.html'));

// Express 5 forwards rejected promises from async handlers to here.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'That upload is too large' });
  }
  if (err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: err.message });
  // 22P02: invalid text representation, e.g. /api/recipes/abc
  if (err.code === '22P02') return res.status(404).json({ error: 'Not found' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server. Check the logs for details.' });
});

export default app;
