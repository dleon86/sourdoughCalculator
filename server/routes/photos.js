import crypto from 'node:crypto';
import express, { Router } from 'express';
import { pool } from '../db.js';
import { deleteFile, readFile, saveFile } from '../storage.js';

const router = Router();
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// The browser shrinks photos before upload, so 4 MB is generous and stays
// under Vercel's 4.5 MB request limit.
router.post('/bakes/:id/photos', express.raw({ type: Object.keys(TYPES), limit: '4mb' }), async (req, res) => {
  const type = req.headers['content-type'];
  if (!TYPES[type] || !Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({ error: 'Send a JPEG, PNG or WebP image' });
  }
  const bake = await pool.query('SELECT id FROM bakes WHERE id = $1', [req.params.id]);
  if (!bake.rowCount) return res.status(404).json({ error: 'Bake not found' });

  const key = `photos/${req.params.id}/${crypto.randomUUID()}.${TYPES[type]}`;
  await saveFile(key, req.body, type);
  const dim = (v) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null);
  const { rows } = await pool.query(
    `INSERT INTO photos (bake_id, storage_key, content_type, width, height)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, width, height`,
    [req.params.id, key, type, dim(req.query.w), dim(req.query.h)],
  );
  res.status(201).json(rows[0]);
});

router.get('/photos/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT storage_key, content_type FROM photos WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Photo not found' });
  const stream = await readFile(rows[0].storage_key);
  if (!stream) return res.status(404).json({ error: 'Photo file is missing' });
  // A photo id never changes content, so the browser can keep it forever.
  res.set({ 'Content-Type': rows[0].content_type, 'Cache-Control': 'private, max-age=31536000, immutable' });
  stream.on('error', (err) => res.destroy(err));
  stream.pipe(res);
});

router.delete('/photos/:id', async (req, res) => {
  const { rows } = await pool.query('DELETE FROM photos WHERE id = $1 RETURNING storage_key', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Photo not found' });
  await deleteFile(rows[0].storage_key);
  res.status(204).end();
});

export default router;
