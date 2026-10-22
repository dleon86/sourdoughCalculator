// Hash router: #/, #/recipes, #/recipes/:id, #/bakes, #/bakes/new, #/bakes/:id
import * as api from './api.js';
import { h } from './ui.js';
import { calculatorView } from './views/calculator.js';
import { recipesView } from './views/recipes.js';
import { bakesView } from './views/bakes.js';
import { bakeFormView } from './views/bake-form.js';
import { loginView } from './views/login.js';
import { timerView } from './views/timer.js';
import { feedingFormView, starterEditView, startersView } from './views/starter.js';

const routes = [
  [/^\/$/, 'calculator', () => calculatorView()],
  [/^\/recipes\/(\d+)$/, 'calculator', (id) => calculatorView(Number(id))],
  [/^\/recipes$/, 'recipes', () => recipesView()],
  [/^\/bakes\/new$/, 'bakes', (_, q) => bakeFormView({ recipeId: Number(q.get('recipe')) || null })],
  [/^\/bakes\/(\d+)\/timer$/, 'bakes', (id) => timerView(Number(id))],
  [/^\/bakes\/(\d+)$/, 'bakes', (id) => bakeFormView({ bakeId: Number(id) })],
  [/^\/bakes$/, 'bakes', () => bakesView()],
  [/^\/starter$/, 'starter', () => startersView()],
  [/^\/starter\/new$/, 'starter', () => starterEditView(null)],
  [/^\/starter\/(\d+)\/edit$/, 'starter', (id) => starterEditView(Number(id))],
  [/^\/starter\/(\d+)\/feed$/, 'starter', (id) => feedingFormView({ starterId: Number(id) })],
  [/^\/feedings\/(\d+)$/, 'starter', (id) => feedingFormView({ feedingId: Number(id) })],
];

const main = document.getElementById('main');
let renderId = 0;
let signedIn = false;

async function render() {
  const id = ++renderId;
  document.body.classList.toggle('signed-out', !signedIn);
  if (!signedIn) {
    main.replaceChildren(loginView(() => { signedIn = true; render(); }));
    return;
  }

  const [path, query = ''] = (location.hash.slice(1) || '/').split('?');
  const match = routes.map(([re, tab, view]) => [path.match(re), tab, view]).find(([m]) => m);

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
    if (id !== renderId || err.status === 401) return;
    main.replaceChildren(h('section', { class: 'page' },
      h('h1', {}, 'Couldn’t load this page'),
      h('p', { class: 'muted' }, err.message),
      h('button', { class: 'btn', onclick: render }, 'Try again')));
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);
window.addEventListener('bread:signed-out', () => {
  if (!signedIn) return;
  signedIn = false;
  render();
});

try {
  signedIn = (await api.session.get()).signedIn;
} catch {
  signedIn = true; // offline or server down: let the page show its own error
}
render();
