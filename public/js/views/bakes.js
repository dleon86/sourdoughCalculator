import * as api from '../api.js';
import { describe } from '../calc.js';
import { formatDuration, h, parseDay, stars } from '../ui.js';

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
    h('a', { class: 'bake', href: `#/bakes/${b.id}` },
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
    ),
  );
}

export async function bakesView() {
  const bakes = await api.bakes.list();

  const byMonth = new Map();
  for (const b of bakes) {
    const key = b.bakedOn.slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(b);
  }

  return h('section', { class: 'page' },
    h('div', { class: 'page-head split' },
      h('div', {}, h('h1', {}, 'Bakes'), summary(bakes)),
      h('a', { class: 'btn', href: '#/bakes/new' }, 'Log a bake')),
    bakes.length === 0
      ? h('div', { class: 'empty' },
        h('p', {}, 'Nothing logged yet. After your next bake, note the timings, temperatures and how it came out, so you can tell what changed from one loaf to the next.'),
        h('a', { class: 'btn', href: '#/bakes/new' }, 'Log your first bake'))
      : [...byMonth].map(([key, items]) => h('section', { class: 'month' },
        h('h2', {}, monthFmt.format(parseDay(`${key}-01`))),
        h('ol', { class: 'timeline' }, items.map(bakeItem)))),
  );
}
