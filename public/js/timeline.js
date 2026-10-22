// Bake-day steps and the timings that fall out of them. Pure functions,
// shared by the timer screen and test/timeline.test.js.

// `stage` is what the dough is doing after this step. A fold doesn't
// change the stage.
export const STEPS = {
  autolyse: { label: 'Autolyse', action: 'Start autolyse', stage: 'Autolyse' },
  mix: { label: 'Mixed', action: 'Mix the dough', stage: 'Bulk ferment' },
  fold: { label: 'Fold', action: 'Did a fold', stage: null },
  shape: { label: 'Shaped', action: 'Shape', stage: 'Final proof' },
  fridge: { label: 'Into the fridge', action: 'Into the fridge', stage: 'Cold proof' },
  oven: { label: 'Into the oven', action: 'Into the oven', stage: 'Baking' },
  out: { label: 'Out of the oven', action: 'Out of the oven', stage: 'Cooling' },
};

const sorted = (events) => [...events].sort((a, b) => new Date(a.at) - new Date(b.at));
const first = (events, type) => sorted(events).find((e) => e.type === type);
const minutes = (from, to) => (from && to ? Math.max(0, Math.round((new Date(to.at) - new Date(from.at)) / 60000)) : null);

// The stage the dough is in now and when it began, or null before mixing.
export function currentStage(events) {
  const last = sorted(events).filter((e) => STEPS[e.type]?.stage).at(-1);
  return last ? { type: last.type, label: STEPS[last.type].stage, since: last.at } : null;
}

// What you're likely to tap next, most likely first.
export function nextSteps(events) {
  const stage = currentStage(events)?.type;
  switch (stage) {
    case undefined: return ['mix', 'autolyse'];
    case 'autolyse': return ['mix'];
    case 'mix': return ['fold', 'shape'];
    case 'shape': return ['oven', 'fridge'];
    case 'fridge': return ['oven'];
    case 'oven': return ['out'];
    default: return [];
  }
}

export const folds = (events) => sorted(events).filter((e) => e.type === 'fold');

// Bulk is mix → shape, proof is shape → oven (cold or not), bake is
// oven → out. Missing steps leave that timing blank rather than guessing.
export function deriveTimings(events) {
  const mix = first(events, 'mix');
  const shape = first(events, 'shape');
  const oven = first(events, 'oven');
  const out = first(events, 'out');
  return {
    bulkMinutes: minutes(mix, shape),
    proofMinutes: minutes(shape, oven),
    coldProof: events.some((e) => e.type === 'fridge'),
    bakeMinutes: minutes(oven, out),
  };
}

// The day the loaf came out of the oven, as YYYY-MM-DD in local time.
export function bakeDay(events) {
  const e = first(events, 'out') ?? first(events, 'oven') ?? sorted(events).at(-1);
  const d = e ? new Date(e.at) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
