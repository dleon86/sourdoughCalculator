import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculate, DEFAULT_FORMULA } from '../public/js/calc.js';

const close = (actual, expected, msg) =>
  assert.ok(Math.abs(actual - expected) < 1e-6, `${msg}: expected ${expected}, got ${actual}`);

test('ingredients add up to the target dough mass', () => {
  const r = calculate(DEFAULT_FORMULA);
  close(r.total, DEFAULT_FORMULA.doughMass, 'total');
});

test('hydration and salt count the flour and water inside the starter', () => {
  const r = calculate(DEFAULT_FORMULA);
  close((r.water + r.starterWater) / r.totalFlour, 0.75, 'hydration');
  close(r.salt / r.totalFlour, 0.02, 'salt');
  close(r.starter / r.addedFlour, 0.2, 'starter % of added flour');
});

test('known values: 1000 g, 70%, 2%, 20% starter at 100%', () => {
  const r = calculate({ ...DEFAULT_FORMULA, doughMass: 1000, hydration: 70, flours: [{ name: 'A', pct: 100 }] });
  // total flour = 1000 / 1.72
  close(r.totalFlour, 1000 / 1.72, 'total flour');
  close(r.addedFlour, 1000 / 1.72 / 1.1, 'added flour');
});

test('stiff starter carries less water', () => {
  const r = calculate({ ...DEFAULT_FORMULA, starterHydration: 50 });
  close(r.starterWater / r.starterFlour, 0.5, 'starter ratio');
  close(r.total, DEFAULT_FORMULA.doughMass, 'total');
});

test('flour percentages are normalised', () => {
  const a = calculate({ ...DEFAULT_FORMULA, flours: [{ name: 'A', pct: 80 }, { name: 'B', pct: 20 }] });
  const b = calculate({ ...DEFAULT_FORMULA, flours: [{ name: 'A', pct: 4 }, { name: 'B', pct: 1 }] });
  close(a.flours[0].grams, b.flours[0].grams, 'same split');
});

test('warns when the starter has more water than the dough allows', () => {
  const r = calculate({ ...DEFAULT_FORMULA, hydration: 10, starterPct: 100, starterHydration: 200 });
  assert.ok(r.water < 0);
  assert.ok(r.warnings.some((w) => w.includes('starter')));
});
