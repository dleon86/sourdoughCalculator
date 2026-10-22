import * as api from '../api.js';
import { describe, formulaOf } from '../calc.js';
import { formatDay, h, toast, fill } from '../ui.js';
import { startBake } from './timer.js';

export async function recipesView() {
  const recipes = await api.recipes.list();
  const list = h('ul', { class: 'recipe-list' });

  function draw() {
    if (recipes.length === 0) {
      list.replaceWith(h('div', { class: 'empty' },
        h('p', {}, 'No saved recipes yet. Work out a formula in the calculator, then save it here so you can bake it again.'),
        h('a', { class: 'btn', href: '#/' }, 'Open the calculator')));
      return;
    }
    fill(list, ...recipes.map((r) => h('li', {},
      h('a', { class: 'recipe-main', href: `#/recipes/${r.id}` },
        h('span', { class: 'recipe-name' }, r.name),
        h('span', { class: 'recipe-meta' },
          describe(r), ', ', r.flours.map((f) => f.name).join(' and ').toLowerCase()),
      ),
      h('span', { class: 'recipe-history' },
        r.bakeCount === 0 ? 'Not baked yet'
          : `Baked ${r.bakeCount} ${r.bakeCount === 1 ? 'time' : 'times'}, last ${formatDay(r.lastBakedOn)}`
            + (r.avgRating ? `, rated ${r.avgRating}` : '')),
      h('div', { class: 'row-actions' },
        h('button', {
          type: 'button', class: 'btn small',
          onclick: () => startBake({ recipeId: r.id, formula: formulaOf(r) }),
        }, 'Start a bake'),
        h('a', { class: 'btn ghost small', href: `#/bakes/new?recipe=${r.id}` }, 'Log past bake'),
        h('button', {
          type: 'button', class: 'btn ghost small danger',
          onclick: async () => {
            const note = r.bakeCount ? ` Its ${r.bakeCount} logged ${r.bakeCount === 1 ? 'bake stays' : 'bakes stay'} in your log.` : '';
            if (!confirm(`Delete “${r.name}”?${note}`)) return;
            try {
              await api.recipes.remove(r.id);
              recipes.splice(recipes.indexOf(r), 1);
              toast(`Deleted “${r.name}”`);
              draw();
            } catch (err) { toast(err.message, { error: true }); }
          },
        }, 'Delete'),
      ),
    )));
  }
  draw();

  return h('section', { class: 'page' },
    h('div', { class: 'page-head split' },
      h('h1', {}, 'Recipes'),
      h('a', { class: 'btn', href: '#/' }, 'New formula')),
    list,
  );
}
