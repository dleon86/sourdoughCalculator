import * as api from '../api.js';
import { describe } from '../calc.js';
import { formatDuration, formatElapsed, h, parseDay, stars } from '../ui.js';
import { currentStage } from '../timeline.js';
import { photoUrl } from '../photos.js';

const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const weekdayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

function summary(bakes) {
  if (bakes.length === 0) return null;
  const rated = bakes.filter((b) => b.rating);
  const avg = rated.length ? rated.reduce((s, b) => s + b.rating, 0) / rated.length : null;
  const first = parseDay(bakes[bakes.length - 1].bakedOn);
  const since = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(first);
  let text = `${bakes.length} ${bakes.length === 1 ? 'bake' : 'bakes'} logged since ${since}`;
  if (avg) text += `, averaging ${avg.toFixed(1)} out of 5`;
  return h('p', { class: 'muted' }, `${text}.`);
}

function activeItem(b) {
  const stage = currentStage(b.events);
  return h('a', { class: 'active-bake', href: `#/bakes/${b.id}/timer` },
    h('span', { class: 'pill' }, 'In progress'),
    h('span', { class: 'bake-title' }, b.formula.name || 'Untitled formula'),
    h('span', { class: 'muted' }, stage ? `${stage.label}, ${formatElapsed(stage.since)}` : 'Not started yet'),
    h('span', { class: 'btn small' }, 'Open timer'));
}

function bakeItem(b) {
  const day = parseDay(b.bakedOn);
  const unit = `°${b.tempUnit}`;
  const facts = [
    b.bulkMinutes != null && `Bulk ${formatDuration(b.bulkMinutes)}`,
    b.proofMinutes != null && `${b.coldProof ? 'Cold proof' : 'Proof'} ${formatDuration(b.proofMinutes)}`,
    b.coldProof && b.proofMinutes == null && 'Cold proof',
    b.roomTemp != null && `Kitchen ${b.roomTemp}${unit}`,
    b.ovenTemp != null && `Oven ${b.ovenTemp}${unit}`,
    b.bakeMinutes != null && `Baked ${formatDuration(b.bakeMinutes)}`,
  ].filter(Boolean);

  return h('li', {},
    h('a', { class: 'bake', href: `#/bakes/${b.id}`, dataset: { id: b.id } },
      h('span', { class: 'bake-date', 'aria-hidden': 'true' },
        h('span', { class: 'day' }, day.getDate()),
        h('span', { class: 'weekday' }, weekdayFmt.format(day))),
      h('span', { class: 'bake-body' },
        h('span', { class: 'bake-title' },
          h('span', {}, b.formula.name || 'Untitled formula'),
          stars(b.rating)),
        h('span', { class: 'sr-only' }, day.toDateString()),
        h('span', { class: 'bake-formula' }, describe(b.formula)),
        facts.length > 0 && h('span', { class: 'facts' }, facts.map((f) => h('span', { class: 'fact' }, f))),
        b.notes && h('span', { class: 'bake-notes' }, b.notes),
      ),
      b.photos.length > 0 && h('img', { class: 'bake-cover', src: photoUrl(b.photos[0]), alt: '', loading: 'lazy' }),
    ),
  );
}

export async function bakesView() {
  const all = await api.bakes.list();
  const active = all.filter((b) => b.status === 'active');
  const bakes = all.filter((b) => b.status !== 'active');

  const byMonth = new Map();
  for (const b of bakes) {
    const key = b.bakedOn.slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(b);
  }

  // Compare mode: tapping a bake picks it instead of opening it.
  const picked = [];
  const compareBar = h('div', { class: 'compare-bar', hidden: true },
    h('span', { class: 'compare-count' }),
    h('button', { type: 'button', class: 'btn ghost small', onclick: () => setPicking(false) }, 'Cancel'));
  function setPicking(on) {
    picked.length = 0;
    page.classList.toggle('picking', on);
    page.querySelectorAll('.bake.picked').forEach((el) => el.classList.remove('picked'));
    compareBar.hidden = !on;
    compareBar.querySelector('.compare-count').textContent = 'Tap two bakes to compare them';
  }
  function onPick(e) {
    const link = e.target.closest('.bake');
    if (!link || !page.classList.contains('picking')) return;
    e.preventDefault();
    const id = Number(link.dataset.id);
    const at = picked.indexOf(id);
    if (at >= 0) picked.splice(at, 1); else picked.push(id);
    link.classList.toggle('picked', at < 0);
    if (picked.length === 2) location.hash = `#/compare?a=${picked[0]}&b=${picked[1]}`;
    else compareBar.querySelector('.compare-count').textContent = picked.length ? 'Now tap the second bake' : 'Tap two bakes to compare them';
  }

  const page = h('section', { class: 'page', onclick: onPick },
    h('div', { class: 'page-head split' },
      h('div', {}, h('h1', {}, 'Bakes'), summary(bakes)),
      h('div', { class: 'row-actions' },
        h('a', { class: 'btn', href: '#/recipes' }, 'Start a bake'),
        h('a', { class: 'btn ghost', href: '#/bakes/new' }, 'Log a past bake'),
        bakes.length >= 2 && h('button', { type: 'button', class: 'btn ghost', onclick: (e) => { e.stopPropagation(); setPicking(true); } }, 'Compare'))),
    compareBar,
    active.length > 0 && h('div', { class: 'active-list' }, active.map(activeItem)),
    bakes.length === 0
      ? h('div', { class: 'empty' },
        h('p', {}, 'Nothing logged yet. After your next bake, note the timings, temperatures and how it came out, so you can tell what changed from one loaf to the next.'),
        h('a', { class: 'btn', href: '#/bakes/new' }, 'Log your first bake'))
      : [...byMonth].map(([key, items]) => h('section', { class: 'month' },
        h('h2', {}, monthFmt.format(parseDay(`${key}-01`))),
        h('ol', { class: 'timeline' }, items.map(bakeItem)))),
  );
  return page;
}
