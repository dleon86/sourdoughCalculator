// Hash router: #/, #/recipes, #/recipes/:id, #/bakes, #/bakes/new, #/bakes/:id
import { h } from './ui.js';
import { calculatorView } from './views/calculator.js';
import { recipesView } from './views/recipes.js';
import { bakesView } from './views/bakes.js';
import { bakeFormView } from './views/bake-form.js';

const routes = [
  [/^\/$/, 'calculator', () => calculatorView()],
  [/^\/recipes\/(\d+)$/, 'calculator', (id) => calculatorView(Number(id))],
  [/^\/recipes$/, 'recipes', () => recipesView()],
  [/^\/bakes\/new$/, 'bakes', (_, q) => bakeFormView({ recipeId: Number(q.get('recipe')) || null })],
  [/^\/bakes\/(\d+)$/, 'bakes', (id) => bakeFormView({ bakeId: Number(id) })],
  [/^\/bakes$/, 'bakes', () => bakesView()],
];

const main = document.getElementById('main');
let renderId = 0;

async function render() {
  const [path, query = ''] = (location.hash.slice(1) || '/').split('?');
  const match = routes.map(([re, tab, view]) => [path.match(re), tab, view]).find(([m]) => m);
  const id = ++renderId;

  document.querySelectorAll('.tabs a').forEach((a) => {
    a.toggleAttribute('aria-current', match?.[1] === a.dataset.tab);
  });

  if (!match) {
    main.replaceChildren(h('section', { class: 'page' },
      h('h1', {}, 'Page not found'),
      h('p', {}, h('a', { href: '#/' }, 'Go to the calculator'))));
    return;
  }

  const [m, , view] = match;
  try {
    const node = await view(m[1], new URLSearchParams(query));
    if (id !== renderId) return; // a newer navigation won the race
    main.replaceChildren(node);
  } catch (err) {
    if (id !== renderId) return;
    main.replaceChildren(h('section', { class: 'page' },
      h('h1', {}, 'Couldn’t load this page'),
      h('p', { class: 'muted' }, err.message),
      h('button', { class: 'btn', onclick: render }, 'Try again')));
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);
render();
