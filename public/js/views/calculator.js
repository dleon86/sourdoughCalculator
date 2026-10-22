import * as api from '../api.js';
import { calculate, DEFAULT_FORMULA, formatGrams, formatNumber } from '../calc.js';
import { h, numberField, showFieldErrors, store, toast } from '../ui.js';

const DRAFT_KEY = 'bread.draft';
export const PENDING_BAKE_KEY = 'bread.pendingBakeFormula';

const clone = (f) => JSON.parse(JSON.stringify(f));
const FORMULA_KEYS = ['name', 'notes', 'doughMass', 'hydration', 'saltPct', 'starterPct', 'starterHydration', 'flours'];
const pickFormula = (src) => Object.fromEntries(FORMULA_KEYS.map((k) => [k, clone(src[k])]));

export async function calculatorView(recipeId = null) {
  const saved = recipeId ? await api.recipes.get(recipeId) : null;
  const formula = saved ? pickFormula(saved) : pickFormula({ ...DEFAULT_FORMULA, ...store.get(DRAFT_KEY, {}) });
  let savedSnapshot = saved ? JSON.stringify(pickFormula(saved)) : null;
  const weighed = new Set();

  const isDirty = () => savedSnapshot !== JSON.stringify(formula);

  // Inputs edit `formula` in place, then only the readout redraws, so the
  // input you're typing in never loses focus.
  const set = (key) => (e) => {
    formula[key] = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    changed();
  };

  function changed() {
    if (!recipeId) store.set(DRAFT_KEY, formula);
    drawReadout();
  }

  // ---- Form -------------------------------------------------------------
  const flourList = h('div', { class: 'flour-list' });

  function drawFlours() {
    flourList.replaceChildren(...formula.flours.map((flour, i) => h('div', { class: 'flour-row' },
      h('input', {
        type: 'text', value: flour.name, 'aria-label': `Flour ${i + 1} name`, placeholder: 'Flour name',
        oninput: (e) => { flour.name = e.target.value; changed(); },
      }),
      h('div', { class: 'input-unit' },
        h('input', {
          type: 'number', inputmode: 'decimal', min: 0, step: 'any', value: flour.pct,
          'aria-label': `${flour.name || `Flour ${i + 1}`} percentage`,
          oninput: (e) => { flour.pct = Number(e.target.value); changed(); },
        }),
        h('span', { class: 'unit', 'aria-hidden': 'true' }, '%')),
      h('button', {
        type: 'button', class: 'icon-btn', 'aria-label': `Remove ${flour.name || 'flour'}`,
        disabled: formula.flours.length === 1,
        onclick: () => { formula.flours.splice(i, 1); drawFlours(); changed(); },
      }, '×'),
    )));
  }
  drawFlours();

  const form = h('form', { class: 'formula-form', onsubmit: (e) => { e.preventDefault(); save(false); } },
    h('div', { class: 'field' },
      h('label', { for: 'f-name' }, 'Recipe name'),
      h('input', { id: 'f-name', name: 'name', type: 'text', value: formula.name, placeholder: 'e.g. Weekday country loaf', oninput: set('name') })),

    h('fieldset', {},
      h('legend', {}, 'Dough'),
      h('div', { class: 'field-row' },
        numberField({ label: 'Dough weight', name: 'doughMass', value: formula.doughMass, unit: 'g', step: 10, onInput: set('doughMass'), hint: 'Everything in the bowl' }),
        numberField({ label: 'Hydration', name: 'hydration', value: formula.hydration, unit: '%', onInput: set('hydration') }),
        numberField({ label: 'Salt', name: 'saltPct', value: formula.saltPct, unit: '%', step: 0.1, onInput: set('saltPct') }),
      )),

    h('fieldset', {},
      h('legend', {}, 'Starter'),
      h('div', { class: 'field-row' },
        numberField({ label: 'Amount', name: 'starterPct', value: formula.starterPct, unit: '%', onInput: set('starterPct'), hint: 'Of the flour you add' }),
        numberField({ label: 'Starter hydration', name: 'starterHydration', value: formula.starterHydration, unit: '%', step: 5, onInput: set('starterHydration'), hint: '100% means equal flour and water' }),
      )),

    h('fieldset', {},
      h('legend', {}, 'Flour blend'),
      flourList,
      h('button', {
        type: 'button', class: 'btn ghost small',
        onclick: () => {
          formula.flours.push({ name: '', pct: 0 });
          drawFlours(); changed();
          flourList.querySelector('.flour-row:last-child input')?.focus();
        },
      }, '+ Add a flour'),
    ),

    h('div', { class: 'field' },
      h('label', { for: 'f-notes' }, 'Notes'),
      h('textarea', { id: 'f-notes', name: 'notes', rows: 3, value: formula.notes, placeholder: 'Method, sources, things to try next time', oninput: set('notes') })),
  );

  // ---- Readout ----------------------------------------------------------
  const readout = h('aside', { class: 'readout', 'aria-label': 'Ingredient weights' });

  function drawReadout() {
    const r = calculate(formula);
    const items = [
      ...r.flours.map((f, i) => ({ key: `flour-${i}`, label: f.name || `Flour ${i + 1}`, grams: f.grams })),
      { key: 'water', label: 'Water', grams: Math.max(r.water, 0) },
      { key: 'starter', label: 'Starter', grams: r.starter },
      { key: 'salt', label: 'Salt', grams: r.salt },
    ];
    const done = items.filter((i) => weighed.has(i.key)).length;

    readout.replaceChildren(...[
      h('div', { class: 'readout-head' },
        h('h2', {}, 'Weigh out'),
        done > 0 && h('button', { type: 'button', class: 'link-btn', onclick: () => { weighed.clear(); drawReadout(); } }, 'Clear ticks')),
      h('ul', { class: 'scale' }, items.map((item) => h('li', {},
        h('button', {
          type: 'button', role: 'checkbox', 'aria-checked': String(weighed.has(item.key)),
          class: weighed.has(item.key) ? 'done' : '',
          onclick: () => { weighed.has(item.key) ? weighed.delete(item.key) : weighed.add(item.key); drawReadout(); },
        },
          h('span', { class: 'tick', 'aria-hidden': 'true' }),
          h('span', { class: 'ingredient' }, item.label),
          h('span', { class: 'grams' }, formatGrams(item.grams), h('small', {}, ' g'))),
      ))),
      h('p', { class: 'readout-total' },
        h('span', {}, 'Total dough'),
        h('span', { class: 'grams' }, Math.round(r.total), h('small', {}, ' g'))),
      h('p', { class: 'readout-note' },
        `Your starter brings ${formatNumber(r.starterFlour, 0)} g flour and ${formatNumber(r.starterWater, 0)} g water, `
        + `for ${formatNumber(r.totalFlour, 0)} g flour in total. Hydration and salt are worked out on that total.`),
      r.warnings.length > 0 && h('ul', { class: 'warnings' }, r.warnings.map((w) => h('li', {}, w))),
      h('div', { class: 'readout-actions' },
        recipeId
          ? h('button', { type: 'button', class: 'btn', disabled: !isDirty(), onclick: () => save(false) }, isDirty() ? 'Save changes' : 'Saved')
          : h('button', { type: 'button', class: 'btn', onclick: () => save(false) }, 'Save recipe'),
        recipeId && h('button', { type: 'button', class: 'btn ghost', onclick: () => save(true) }, 'Save as new recipe'),
        h('button', { type: 'button', class: 'btn ghost', onclick: logBake }, 'Log a bake'),
      ),
    ].filter(Boolean));
  }

  async function save(asNew) {
    if (!formula.name.trim()) {
      showFieldErrors(form, { name: 'Give the recipe a name to save it' });
      form.querySelector('[name="name"]').focus();
      return;
    }
    try {
      const body = asNew && formula.name === saved?.name ? { ...formula, name: `${formula.name} (copy)` } : formula;
      const result = recipeId && !asNew
        ? await api.recipes.update(recipeId, body)
        : await api.recipes.create(body);
      showFieldErrors(form, {});
      if (!recipeId) store.remove(DRAFT_KEY);
      toast(recipeId && !asNew ? 'Changes saved' : `Saved “${result.name}”`);
      if (recipeId && !asNew) {
        savedSnapshot = JSON.stringify(pickFormula(result));
        drawReadout();
      } else {
        location.hash = `#/recipes/${result.id}`;
      }
    } catch (err) {
      showFieldErrors(form, err.fields);
      toast(err.message, { error: true });
    }
  }

  function logBake() {
    if (recipeId && !isDirty()) {
      location.hash = `#/bakes/new?recipe=${recipeId}`;
    } else {
      store.set(PENDING_BAKE_KEY, { recipeId, formula });
      location.hash = '#/bakes/new';
    }
  }

  drawReadout();

  return h('section', { class: 'page calc' },
    h('div', { class: 'page-head' },
      h('h1', {}, saved ? saved.name : 'New formula'),
      h('p', { class: 'muted' }, saved
        ? 'Edit the numbers and the weights update as you type.'
        : 'Set your target dough and the weights update as you type. Tap an ingredient once it’s on the scale.'),
      !saved && store.get(DRAFT_KEY, null) && h('button', {
        type: 'button', class: 'link-btn',
        onclick: () => { store.remove(DRAFT_KEY); window.dispatchEvent(new HashChangeEvent('hashchange')); },
      }, 'Reset to defaults'),
    ),
    h('div', { class: 'calc-grid' }, form, readout),
  );
}
