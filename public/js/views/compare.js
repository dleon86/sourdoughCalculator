// Side-by-side comparison of two bakes (#/compare?a=1&b=2). Rows that
// differ are highlighted, and numeric rows show the change from A to B.
import * as api from '../api.js';
import { doughWeight, formatNumber } from '../calc.js';
import { photoUrl, viewPhoto } from '../photos.js';
import { convertTemp, formatDay, formatDuration, formatElapsed, h, stars, tempUnit } from '../ui.js';

// Hours between the starter's last feeding before mixing and the mix.
function starterInfo(bake, starter) {
  const mix = bake.events.find((e) => e.type === 'mix');
  if (!starter || !mix) return null;
  const fed = starter.feedings.find((f) => new Date(f.fedAt) < new Date(mix.at));
  if (!fed) return null;
  return {
    hours: (new Date(mix.at) - new Date(fed.fedAt)) / 3600000,
    text: `${starter.name}, fed ${formatElapsed(fed.fedAt, mix.at)} before mixing`
      + (fed.temp != null ? ` at ${formatNumber(fed.temp, 0)}°${fed.tempUnit}` : '')
      + (fed.inWarmer ? ' in the warmer' : ''),
  };
}

export async function compareView(aId, bId) {
  const [a, b] = await Promise.all([api.bakes.get(aId), api.bakes.get(bId)]);
  const starterIds = [...new Set([a.starterId, b.starterId].filter(Boolean))];
  const starters = Object.fromEntries(await Promise.all(
    starterIds.map(async (id) => [id, await api.starters.get(id).catch(() => null)])));
  const unit = tempUnit.get();
  const temp = (bake, key) => convertTemp(bake[key], bake.tempUnit, unit);

  // [label, value for display, number for the difference (optional), unit]
  const rows = [
    ['Recipe', (x) => x.formula.name || 'Untitled formula'],
    ['Dough weight', (x) => `${Math.round(doughWeight(x.formula))} g`, (x) => doughWeight(x.formula), ' g'],
    ['Hydration', (x) => `${formatNumber(x.formula.hydration)}%`, (x) => x.formula.hydration, '%'],
    ['Salt', (x) => `${formatNumber(x.formula.saltPct)}%`, (x) => x.formula.saltPct, '%'],
    ['Starter', (x) => `${formatNumber(x.formula.starterPct)}% at ${formatNumber(x.formula.starterHydration)}% hydration`, (x) => x.formula.starterPct, '%'],
    ['Flour', (x) => x.formula.flours.map((f) => `${f.name} ${formatNumber(f.pct)}%`).join(', ')],
    ['Starter readiness', (x) => starterInfo(x, starters[x.starterId])?.text ?? '–', (x) => starterInfo(x, starters[x.starterId])?.hours, ' h'],
    ['Bulk ferment', (x) => formatDuration(x.bulkMinutes) || '–', (x) => x.bulkMinutes, 'min'],
    ['Final proof', (x) => (x.proofMinutes == null ? (x.coldProof ? 'Cold' : '–') : `${formatDuration(x.proofMinutes)}${x.coldProof ? ', cold' : ''}`), (x) => x.proofMinutes, 'min'],
    ['Kitchen', (x) => (x.roomTemp == null ? '–' : `${formatNumber(temp(x, 'roomTemp'), 0)}°${unit}`), (x) => temp(x, 'roomTemp'), '°'],
    ['Oven', (x) => (x.ovenTemp == null ? '–' : `${formatNumber(temp(x, 'ovenTemp'), 0)}°${unit}`), (x) => temp(x, 'ovenTemp'), '°'],
    ['Bake time', (x) => formatDuration(x.bakeMinutes) || '–', (x) => x.bakeMinutes, 'min'],
    ['Rating', (x) => stars(x.rating), (x) => x.rating, ''],
  ];

  function delta(num, suffix) {
    const va = num(a); const vb = num(b);
    if (va == null || vb == null || Math.abs(vb - va) < 1e-9) return null;
    const d = vb - va;
    const sign = d > 0 ? '+' : '−';
    const text = suffix === 'min' ? formatDuration(Math.round(Math.abs(d))) : `${formatNumber(Math.abs(d))}${suffix}`;
    return h('span', { class: 'delta' }, `${sign}${text}`);
  }

  const head = (x) => h('th', { scope: 'col' },
    h('a', { href: `#/bakes/${x.id}` }, formatDay(x.bakedOn)),
    x.photos[0]
      ? h('button', { type: 'button', class: 'compare-photo', onclick: () => viewPhoto(photoUrl(x.photos[0])), 'aria-label': 'View photo' },
        h('img', { src: photoUrl(x.photos[0]), alt: '' }))
      : h('div', { class: 'compare-photo empty' }, 'No photo'));

  const table = h('table', { class: 'compare' },
    h('thead', {}, h('tr', {}, head(a), head(b))),
    rows.map(([label, show, num, suffix]) => {
      const va = show(a); const vb = show(b);
      const differs = num ? num(a) !== num(b) : String(va) !== String(vb);
      return h('tbody', { class: differs ? 'differs' : '' },
        h('tr', { class: 'label-row' }, h('th', { colspan: 2, scope: 'colgroup' }, label)),
        h('tr', {}, h('td', {}, va), h('td', {}, vb, num && delta(num, suffix))));
    }),
    h('tbody', {},
      h('tr', { class: 'label-row' }, h('th', { colspan: 2, scope: 'colgroup' }, 'Notes')),
      h('tr', {}, h('td', { class: 'notes' }, a.notes || '–'), h('td', { class: 'notes' }, b.notes || '–'))));

  return h('section', { class: 'page narrow' },
    h('div', { class: 'page-head' },
      h('h1', {}, 'Compare bakes'),
      h('p', { class: 'muted' }, 'Highlighted rows are where the two bakes differ. Changes are shown from the left bake to the right.')),
    table,
    h('p', {}, h('a', { href: '#/bakes' }, 'Back to bakes')));
}
