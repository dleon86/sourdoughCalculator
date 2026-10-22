import { test } from 'node:test';
import assert from 'node:assert/strict';
import { currentStage, deriveTimings, nextSteps } from '../public/js/timeline.js';

const at = (h) => new Date(Date.UTC(2026, 9, 21, 8) + h * 3600000).toISOString();
const day = [
  { type: 'mix', at: at(0) },
  { type: 'fold', at: at(0.5) },
  { type: 'fold', at: at(1) },
  { type: 'shape', at: at(5) },
  { type: 'fridge', at: at(5.25) },
  { type: 'oven', at: at(19) },
  { type: 'out', at: at(19.75) },
];

test('timings come from the steps', () => {
  assert.deepEqual(deriveTimings(day), { bulkMinutes: 300, proofMinutes: 840, coldProof: true, bakeMinutes: 45 });
});

test('missing steps leave timings blank', () => {
  assert.deepEqual(deriveTimings(day.slice(0, 3)), { bulkMinutes: null, proofMinutes: null, coldProof: false, bakeMinutes: null });
});

test('order of the events array does not matter', () => {
  assert.deepEqual(deriveTimings([...day].reverse()), deriveTimings(day));
});

test('folds do not change the stage', () => {
  assert.equal(currentStage(day.slice(0, 3)).label, 'Bulk ferment');
  assert.equal(currentStage(day.slice(0, 3)).since, at(0));
});

test('next steps follow the stage', () => {
  assert.deepEqual(nextSteps([]), ['mix', 'autolyse']);
  assert.deepEqual(nextSteps(day.slice(0, 2)), ['fold', 'shape']);
  assert.deepEqual(nextSteps(day.slice(0, 5)), ['oven']);
  assert.deepEqual(nextSteps(day), []);
});
