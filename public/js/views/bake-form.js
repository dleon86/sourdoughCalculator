import * as api from '../api.js';
import { calculate, describe, formatGrams, formulaOf } from '../calc.js';
import { h, showFieldErrors, store, toast, today, fill } from '../ui.js';
import { PENDING_BAKE_KEY } from './calculator.js';

const UNIT_KEY = 'bread.tempUnit';
const toMinutes = (hours) => (hours === '' ? null : Math.round(Number(hours) * 60));
const toHours = (minutes) => (minutes == null ? '' : +(minutes / 60).toFixed(2));

export async function bakeFormView({ bakeId = null, recipeId = null }) {
  const [recipes, existing, starters] = await Promise.all([
    api.recipes.list(),
    bakeId ? api.bakes.get(bakeId) : null,
    api.starters.list(),
  ]);

  // Where the formula comes from: the bake being edited, a recipe link,
  // or a formula handed over from the calculator.
  const pending = !bakeId && !recipeId ? store.get(PENDING_BAKE_KEY, null) : null;
  store.remove(PENDING_BAKE_KEY);
  const fromRecipe = recipes.find((r) => r.id === (existing?.recipeId ?? recipeId ?? pending?.recipeId));

  const state = {
    recipeId: existing?.recipeId ?? fromRecipe?.id ?? null,
    formula: existing?.formula ?? pending?.formula ?? (fromRecipe ? formulaOf(fromRecipe) : null),
  };

  const formulaBox = h('div', { class: 'formula-box' });
  function drawFormula() {
    if (!state.formula) {
      fill(formulaBox, h('p', { class: 'muted' }, 'Pick the recipe you baked. The formula is saved with this bake, so later edits to the recipe won’t change it.'));
      return;
    }
    const r = calculate(state.formula);
    fill(formulaBox, 
      h('p', { class: 'formula-title' }, state.formula.name || 'Unsaved formula', ', ', describe(state.formula)),
      h('p', { class: 'muted small' }, [
        ...r.flours.map((f) => `${f.name} ${formatGrams(f.grams)} g`),
        `water ${formatGrams(Math.max(r.water, 0))} g`,
        `starter ${formatGrams(r.starter)} g`,
        `salt ${formatGrams(r.salt)} g`,
      ].join(', ')),
    );
  }
  drawFormula();

  const unit = existing?.tempUnit ?? store.get(UNIT_KEY, 'F');
  const field = (label, input, hint) => h('div', { class: 'field' },
    h('label', { for: input.id }, label), input, hint && h('p', { class: 'hint' }, hint));
  const num = (name, value, attrs = {}) => h('input', {
    id: `b-${name}`, name, type: 'number', inputmode: 'decimal', step: 'any', min: 0, value: value ?? '', ...attrs,
  });
  const withUnit = (input, text) => h('div', { class: 'input-unit' }, input, h('span', { class: 'unit', 'aria-hidden': 'true' }, text));

  const recipeSelect = h('select', {
    id: 'b-recipe', name: 'formula',
    onchange: (e) => {
      const r = recipes.find((x) => x.id === Number(e.target.value));
      state.recipeId = r?.id ?? null;
      state.formula = r ? formulaOf(r) : null;
      drawFormula();
    },
  },
  h('option', { value: '' }, recipes.length ? 'Choose a recipe' : 'No saved recipes'),
  state.formula && !state.recipeId && h('option', { value: '', selected: true }, `${state.formula.name || 'Unsaved formula'} (${existing ? 'saved with this bake' : 'from calculator'})`),
  recipes.map((r) => h('option', { value: r.id, selected: r.id === state.recipeId }, r.name)));

  const unitToggle = h('select', {
    id: 'b-unit', name: 'tempUnit', 'aria-label': 'Temperature unit',
    onchange: (e) => { store.set(UNIT_KEY, e.target.value); form.querySelectorAll('.temp-unit').forEach((el) => { el.textContent = `°${e.target.value}`; }); },
  }, h('option', { value: 'F', selected: unit === 'F' }, '°F'), h('option', { value: 'C', selected: unit === 'C' }, '°C'));

  const rating = h('div', { class: 'rating', role: 'radiogroup', 'aria-labelledby': 'rating-label' },
    [1, 2, 3, 4, 5].map((n) => h('label', {},
      h('input', { type: 'radio', name: 'rating', value: n, checked: existing?.rating === n }),
      h('span', { 'aria-hidden': 'true' }, '★'),
      h('span', { class: 'sr-only' }, `${n} out of 5`))));

  const form = h('form', { class: 'bake-form', novalidate: true, onsubmit: (e) => { e.preventDefault(); submit(); } },
    h('fieldset', {},
      h('legend', {}, 'What you baked'),
      h('div', { class: 'field-row' },
        field('Recipe', recipeSelect),
        field('Date', h('input', { id: 'b-bakedOn', name: 'bakedOn', type: 'date', value: existing?.bakedOn ?? today(), max: today() })),
        starters.length > 0 && field('Starter', h('select', { id: 'b-starter', name: 'starterId' },
          h('option', { value: '' }, 'Not recorded'),
          starters.map((st) => h('option', {
            value: st.id,
            // Default a new bake to the only active starter.
            selected: existing ? existing.starterId === st.id : starters.filter((x) => !x.archived).length === 1 && !st.archived,
          }, st.name))))),
      formulaBox),

    h('fieldset', {},
      h('legend', {}, 'Timing'),
      h('div', { class: 'field-row' },
        field('Bulk ferment', withUnit(num('bulkMinutes', toHours(existing?.bulkMinutes), { step: 0.25 }), 'h'), 'From mixing to shaping'),
        field('Final proof', withUnit(num('proofMinutes', toHours(existing?.proofMinutes), { step: 0.25 }), 'h')),
        field('Bake time', withUnit(num('bakeMinutes', existing?.bakeMinutes, { step: 1 }), 'min'))),
      h('label', { class: 'check' },
        h('input', { type: 'checkbox', name: 'coldProof', checked: existing?.coldProof ?? false }),
        'Proofed in the fridge')),

    h('fieldset', {},
      h('legend', {}, 'Temperature'),
      h('div', { class: 'field-row' },
        field('Kitchen', withUnit(num('roomTemp', existing?.roomTemp, { min: -50 }), h('span', { class: 'temp-unit' }, `°${unit}`))),
        field('Oven', withUnit(num('ovenTemp', existing?.ovenTemp), h('span', { class: 'temp-unit' }, `°${unit}`))),
        field('Unit', unitToggle))),

    h('fieldset', {},
      h('legend', {}, 'How it came out'),
      h('div', { class: 'field' }, h('span', { id: 'rating-label', class: 'label' }, 'Rating'), rating),
      field('Notes', h('textarea', {
        id: 'b-notes', name: 'notes', rows: 5, value: existing?.notes ?? '',
        placeholder: 'Crumb, crust, oven spring, what you’d change next time',
      }))),

    h('div', { class: 'form-actions' },
      h('button', { type: 'submit', class: 'btn' }, existing ? 'Save changes' : 'Save bake'),
      h('a', { class: 'btn ghost', href: '#/bakes' }, 'Cancel'),
      existing && h('button', { type: 'button', class: 'btn ghost danger push-right', onclick: remove }, 'Delete bake')),
  );

  async function submit() {
    const data = new FormData(form);
    const body = {
      recipeId: state.recipeId,
      status: existing?.status ?? 'done',
      events: existing?.events ?? [],
      starterId: data.get('starterId') ? Number(data.get('starterId')) : null,
      formula: state.formula,
      bakedOn: data.get('bakedOn'),
      bulkMinutes: toMinutes(data.get('bulkMinutes')),
      proofMinutes: toMinutes(data.get('proofMinutes')),
      bakeMinutes: data.get('bakeMinutes') === '' ? null : Number(data.get('bakeMinutes')),
      coldProof: data.get('coldProof') === 'on',
      roomTemp: data.get('roomTemp'),
      ovenTemp: data.get('ovenTemp'),
      tempUnit: data.get('tempUnit'),
      rating: data.get('rating') ? Number(data.get('rating')) : null,
      notes: data.get('notes'),
    };
    try {
      if (existing) await api.bakes.update(existing.id, body);
      else await api.bakes.create(body);
      toast(existing ? 'Changes saved' : 'Bake saved');
      location.hash = '#/bakes';
    } catch (err) {
      showFieldErrors(form, err.fields);
      toast(err.message, { error: true });
    }
  }

  async function remove() {
    if (!confirm('Delete this bake from your log?')) return;
    try {
      await api.bakes.remove(existing.id);
      toast('Bake deleted');
      location.hash = '#/bakes';
    } catch (err) { toast(err.message, { error: true }); }
  }

  return h('section', { class: 'page narrow' },
    h('div', { class: 'page-head' },
      h('h1', {}, existing ? 'Edit bake' : 'Log a bake'),
      h('p', { class: 'muted' }, 'Fill in what you know. Everything except the recipe and date can be left blank.'),
      existing?.events.length > 0 && h('a', { href: `#/bakes/${existing.id}/timer` }, 'See or fix the bake-day steps')),
    form);
}
