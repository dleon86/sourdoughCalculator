// Sourdough formula math. Pure functions only: no DOM, no fetch. Shared by
// the browser and by test/calc.test.js.
//
// Conventions (baker's percentages):
//   hydration  water ÷ total flour, counting the flour and water inside the starter
//   saltPct    salt ÷ total flour
//   starterPct starter ÷ flour you add (the number you'd read in most recipes)
//   flours[].pct  share of the flour you add; normalised, so 80/20 and 4/1 both work
//
// basis 'dough' starts from a target dough weight (doughMass); basis
// 'flour' starts from the flour you have on hand (flourMass, not counting
// the flour inside the starter).

export const DEFAULT_FORMULA = Object.freeze({
  name: '',
  notes: '',
  basis: 'dough',
  doughMass: 900,
  flourMass: 500,
  hydration: 75,
  saltPct: 2,
  starterPct: 20,
  starterHydration: 100,
  flours: [
    { name: 'Bread flour', pct: 80 },
    { name: 'Whole wheat', pct: 20 },
  ],
});

// The fields that make up a formula. Recipes carry extra fields (id, bake
// counts...) and bakes store a copy of just these.
export const FORMULA_KEYS = ['name', 'notes', 'basis', 'doughMass', 'flourMass', 'hydration', 'saltPct', 'starterPct', 'starterHydration', 'flours'];
export const formulaOf = (src) => structuredClone(Object.fromEntries(FORMULA_KEYS.map((k) => [k, src[k] ?? null])));

export function calculate(formula) {
  const h = formula.hydration / 100;
  const s = formula.saltPct / 100;
  const k = formula.starterPct / 100;
  const r = formula.starterHydration / 100;

  // Starter contributes 1/(1+r) of its weight as flour, so
  //   totalFlour = addedFlour × (1 + k/(1+r))
  const starterShare = 1 + k / (1 + r);
  let totalFlour;
  let addedFlour;
  if (formula.basis === 'flour') {
    addedFlour = formula.flourMass;
    totalFlour = addedFlour * starterShare;
  } else {
    // Every gram of dough is flour × (1 + hydration + salt), so total
    // flour falls straight out of the target mass.
    totalFlour = formula.doughMass / (1 + h + s);
    addedFlour = totalFlour / starterShare;
  }
  const starter = k * addedFlour;
  const starterFlour = starter / (1 + r);
  const starterWater = starter - starterFlour;

  const water = h * totalFlour - starterWater;
  const salt = s * totalFlour;

  const pctSum = formula.flours.reduce((sum, f) => sum + (Number(f.pct) || 0), 0);
  const flours = formula.flours.map((f) => ({
    name: f.name,
    pct: Number(f.pct) || 0,
    grams: pctSum > 0 ? addedFlour * (Number(f.pct) || 0) / pctSum : 0,
  }));

  const warnings = [...flourWarnings(formula.flours)];
  if (water < 0) {
    warnings.push('Your starter alone holds more water than this hydration allows. Lower the starter amount or raise hydration.');
  }

  return {
    flours,
    addedFlour,
    totalFlour,
    water,
    starter,
    starterFlour,
    starterWater,
    salt,
    total: addedFlour + Math.max(water, 0) + starter + salt,
    warnings,
  };
}

// Messages to show the baker about the flour blend. calculate() already
// normalises the percentages, so the numbers are always usable; this
// decides what (if anything) to say about a blend that doesn't add to 100.
//
// flours: [{ name: string, pct: number }]
// returns: string[] of plain-language messages (empty = nothing to say)
export function flourWarnings(flours) {
  const total = flours.reduce((sum, f) => sum + (Number(f.pct) || 0), 0);
  // Decimals don't add exactly in binary (61.4 + 32.3 + 6.3 is
  // 99.99999999999999), so "close enough to 100" counts as 100.
  if (Math.abs(total - 100) <= 0.01) return [];
  return [`Heads up: your flour percentages add up to ${formatNumber(total)}%, not 100%. The weights are scaled to fit, so revise the recipe if you care about that.`];
}

// Short human summary of a formula, e.g. "900 g, 75% hydration".
export function describe(formula) {
  return `${Math.round(doughWeight(formula))} g, ${formatNumber(formula.hydration)}% hydration`;
}

// Total dough weight whichever way the formula was set up.
export function doughWeight(formula) {
  return formula.basis === 'flour' ? calculate(formula).total : formula.doughMass;
}

export function formatNumber(n, digits = 1) {
  return Number(n.toFixed(digits)).toString();
}

// Grams for display: whole grams normally, one decimal for small amounts
// like salt where a gram matters.
export function formatGrams(g) {
  return g < 50 ? formatNumber(g, 1) : Math.round(g).toString();
}
