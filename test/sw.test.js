import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PUBLIC = path.join(import.meta.dirname, '..', 'public');

// The offline cache must list every JS module, or the installed app breaks
// offline the first time a new file is added and forgotten.
test('service worker caches every JS module', () => {
  const sw = fs.readFileSync(path.join(PUBLIC, 'sw.js'), 'utf8');
  const listed = new Set([...sw.matchAll(/'(\/js\/[^']+)'/g)].map((m) => m[1]));
  const onDisk = fs.readdirSync(path.join(PUBLIC, 'js'), { recursive: true })
    .filter((f) => f.endsWith('.js'))
    .map((f) => `/js/${f.split(path.sep).join('/')}`);
  assert.deepEqual([...listed].sort(), onDisk.sort());
});

test('manifest icons exist', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'manifest.webmanifest'), 'utf8'));
  for (const icon of manifest.icons) assert.ok(fs.existsSync(path.join(PUBLIC, icon.src)), icon.src);
});
