import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import migrations from '../server/migrations/index.js';

test('every migration file is listed, in order, exactly once', () => {
  const dir = path.join(import.meta.dirname, '..', 'server', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => /^\d{3}_.*\.js$/.test(f)).sort();
  assert.deepEqual(migrations.map(([name]) => name.replace(/\.sql$/, '.js')), files);
  assert.ok(migrations.every(([, sql]) => typeof sql === 'string' && sql.trim().length > 0));
});
