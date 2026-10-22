import * as api from '../api.js';
import { formatNumber } from '../calc.js';
import {
  convertTemp, every, formatDayTime, formatElapsed, fromLocalInput, h,
  showFieldErrors, tempUnit, toLocalInput, toast, fill } from '../ui.js';
import { peakChart } from './peak-chart.js';

// "1:2:2" from kept starter : flour : water, scaled so the starter is 1.
export function ratio(f) {
  if (!f.seedG || f.flourG == null || f.waterG == null) return null;
  const r = (n) => formatNumber(n / f.seedG, 1);
  return `1:${r(f.flourG)}:${r(f.waterG)}`;
}

function tempText(f) {
  if (f.temp == null) return f.inWarmer ? 'in the warmer' : null;
  return `${formatNumber(f.temp, 0)}°${f.tempUnit}${f.inWarmer ? ' in the warmer' : ''}`;
}

// ---- Starter overview (#/starter) -----------------------------------------

export async function startersView() {
  const list = await api.starters.list();
  const active = list.filter((s) => !s.archived);

  if (active.length === 0) {
    return h('section', { class: 'page narrow' },
      h('div', { class: 'page-head' },
        h('h1', {}, 'Starter'),
        h('p', { class: 'muted' }, 'Log each feeding with the temperature and when it peaked. Over a few weeks you’ll see how much warmth speeds it up, which tells you what setting to use on the warmer.')),
      starterForm(null));
  }

  const details = await Promise.all(active.map((s) => api.starters.get(s.id)));
  return h('section', { class: 'page' },
    h('div', { class: 'page-head split' },
      h('h1', {}, active.length === 1 ? active[0].name : 'Starters'),
      h('a', { class: 'btn ghost small', href: '#/starter/new' }, 'Add a starter')),
    details.map((s) => starterPanel(s, active.length > 1)));
}

function starterPanel(starter, showName) {
  const last = starter.feedings[0];
  const status = h('div', { class: 'starter-status' });

  function drawStatus() {
    if (!last) {
      fill(status, 
        h('p', {}, 'No feedings logged yet.'),
        h('a', { class: 'btn', href: `#/starter/${starter.id}/feed` }, 'Log a feeding'));
      return;
    }
    const temp = tempText(last);
    if (!last.peakedAt) {
      fill(status, 
        h('p', { class: 'status-line' },
          h('span', { class: 'big-time' }, formatElapsed(last.fedAt)),
          h('span', {}, ` since feeding${temp ? `, ${temp}` : ''}. Still rising.`)),
        peakControls(last),
      );
    } else {
      fill(status, 
        h('p', { class: 'status-line' },
          'Fed ', h('strong', {}, `${formatElapsed(last.fedAt)} ago`),
          `. Peaked after ${formatElapsed(last.fedAt, last.peakedAt)}`,
          last.risePct != null ? `, rose ${formatNumber(last.risePct, 0)}%` : '',
          temp ? `, ${temp}.` : '.'),
        h('a', { class: 'btn', href: `#/starter/${starter.id}/feed` }, 'Log a feeding'));
    }
  }
  drawStatus();
  every(30000, status, drawStatus);

  return h('section', { class: 'starter' },
    showName && h('h2', {}, starter.name),
    starter.flour && h('p', { class: 'muted' }, `Fed with ${starter.flour}`),
    status,
    h('div', { class: 'starter-grid' },
      h('div', { class: 'panel' },
        h('h3', {}, 'Time to peak by temperature'),
        peakChart(starter.feedings)),
      h('div', { class: 'panel' },
        h('h3', {}, 'Recent feedings'),
        feedingTable(starter.feedings))),
    h('p', {}, h('a', { href: `#/starter/${starter.id}/edit` }, `Edit ${starter.name}`)),
  );
}

// "It peaked" for the rising feeding: record now, with an optional rise.
function peakControls(feeding) {
  const rise = h('input', { type: 'number', inputmode: 'decimal', min: 0, step: 10, id: `rise-${feeding.id}`, placeholder: 'e.g. 100' });
  return h('div', { class: 'peak-controls' },
    h('div', { class: 'field' },
      h('label', { for: rise.id }, 'Grew by (100% = doubled)'),
      h('div', { class: 'input-unit' }, rise, h('span', { class: 'unit' }, '%'))),
    h('button', {
      type: 'button', class: 'btn',
      onclick: async () => {
        try {
          await api.feedings.update(feeding.id, {
            ...feeding, peakedAt: new Date().toISOString(), risePct: rise.value === '' ? null : Number(rise.value),
          });
          toast('Peak recorded');
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        } catch (err) { toast(err.message, { error: true }); }
      },
    }, 'It peaked now'),
    h('a', { class: 'btn ghost', href: `#/feedings/${feeding.id}` }, 'Enter a different time'));
}

function feedingTable(feedings) {
  if (feedings.length === 0) return h('p', { class: 'muted' }, 'Feedings you log show up here.');
  return h('table', { class: 'feedings' },
    h('thead', {}, h('tr', {},
      h('th', { scope: 'col' }, 'Fed'), h('th', { scope: 'col' }, 'Ratio'),
      h('th', { scope: 'col' }, 'Temp'), h('th', { scope: 'col' }, 'To peak'), h('th', { scope: 'col' }, 'Rise'))),
    h('tbody', {}, feedings.slice(0, 30).map((f) => h('tr', {},
      h('td', {}, h('a', { href: `#/feedings/${f.id}` }, formatDayTime(f.fedAt))),
      h('td', {}, ratio(f) ?? '–'),
      h('td', {}, f.temp == null ? '–' : `${formatNumber(f.temp, 0)}°${f.tempUnit}`, f.inWarmer && h('span', { class: 'badge warm' }, 'warmer')),
      h('td', {}, f.peakedAt ? formatElapsed(f.fedAt, f.peakedAt) : 'rising'),
      h('td', {}, f.risePct == null ? '–' : `${formatNumber(f.risePct, 0)}%`)))));
}

// ---- Starter create / edit (#/starter/new, #/starter/:id/edit) ------------

export async function starterEditView(id) {
  const starter = id ? await api.starters.get(id) : null;
  return h('section', { class: 'page narrow' },
    h('div', { class: 'page-head' }, h('h1', {}, starter ? `Edit ${starter.name}` : 'Add a starter')),
    starterForm(starter));
}

function starterForm(starter) {
  const form = h('form', {
    class: 'starter-form',
    onsubmit: async (e) => {
      e.preventDefault();
      const body = { name: form.name.value, flour: form.flour.value, notes: form.notes.value, archived: form.archived?.checked ?? false };
      try {
        if (starter) await api.starters.update(starter.id, body);
        else await api.starters.create(body);
        toast(starter ? 'Changes saved' : `Added ${body.name}`);
        location.hash = '#/starter';
      } catch (err) {
        showFieldErrors(form, err.fields);
        toast(err.message, { error: true });
      }
    },
  },
  h('div', { class: 'field-row' },
    h('div', { class: 'field' },
      h('label', { for: 's-name' }, 'Name'),
      h('input', { id: 's-name', name: 'name', type: 'text', value: starter?.name ?? '', placeholder: 'e.g. Clint Yeastwood', required: true })),
    h('div', { class: 'field' },
      h('label', { for: 's-flour' }, 'Usually fed with'),
      h('input', { id: 's-flour', name: 'flour', type: 'text', value: starter?.flour ?? '', placeholder: 'e.g. 50/50 bread flour and rye' }))),
  h('div', { class: 'field' },
    h('label', { for: 's-notes' }, 'Notes'),
    h('textarea', { id: 's-notes', name: 'notes', rows: 3, value: starter?.notes ?? '' })),
  starter && h('label', { class: 'check' },
    h('input', { type: 'checkbox', name: 'archived', checked: starter.archived }), 'Retired (hide it from the starter page)'),
  h('div', { class: 'form-actions' },
    h('button', { type: 'submit', class: 'btn' }, starter ? 'Save changes' : 'Add starter'),
    starter && h('a', { class: 'btn ghost', href: '#/starter' }, 'Cancel'),
    starter && h('button', {
      type: 'button', class: 'btn ghost danger push-right',
      onclick: async () => {
        if (!confirm(`Delete ${starter.name} and all of its feedings? Bakes that used it are kept.`)) return;
        try {
          await api.starters.remove(starter.id);
          toast(`Deleted ${starter.name}`);
          location.hash = '#/starter';
        } catch (err) { toast(err.message, { error: true }); }
      },
    }, 'Delete starter')));
  return form;
}

// ---- Feeding form (#/starter/:id/feed, #/feedings/:id) ---------------------

export async function feedingFormView({ starterId = null, feedingId = null }) {
  const existing = feedingId ? await api.feedings.get(feedingId) : null;
  const starter = await api.starters.get(existing?.starterId ?? starterId);
  // A new feeding starts from the last one: same amounts, same spot.
  const prev = existing ?? starter.feedings[0] ?? {};
  const unit = existing?.tempUnit ?? tempUnit.get();

  const num = (name, value, attrs = {}) => h('input', {
    id: `fd-${name}`, name, type: 'number', inputmode: 'decimal', step: 'any', min: 0, value: value ?? '', ...attrs,
  });
  const field = (label, input, unitText, hint) => h('div', { class: 'field' },
    h('label', { for: input.id }, label),
    unitText ? h('div', { class: 'input-unit' }, input, h('span', { class: 'unit' }, unitText)) : input,
    hint && h('p', { class: 'hint' }, hint));

  const unitSelect = h('select', { id: 'fd-unit', name: 'tempUnit', 'aria-label': 'Temperature unit' },
    h('option', { value: 'F', selected: unit === 'F' }, '°F'), h('option', { value: 'C', selected: unit === 'C' }, '°C'));

  const form = h('form', {
    class: 'feeding-form',
    onsubmit: async (e) => {
      e.preventDefault();
      const d = new FormData(form);
      const numOrNull = (k) => (d.get(k) === '' ? null : Number(d.get(k)));
      const body = {
        starterId: starter.id,
        fedAt: fromLocalInput(d.get('fedAt')),
        seedG: numOrNull('seedG'),
        flourG: numOrNull('flourG'),
        waterG: numOrNull('waterG'),
        temp: numOrNull('temp'),
        tempUnit: d.get('tempUnit'),
        inWarmer: d.get('inWarmer') === 'on',
        peakedAt: fromLocalInput(d.get('peakedAt')),
        risePct: numOrNull('risePct'),
        notes: d.get('notes'),
      };
      tempUnit.set(body.tempUnit);
      try {
        if (existing) await api.feedings.update(existing.id, body);
        else await api.feedings.create(body);
        toast(existing ? 'Changes saved' : 'Feeding logged');
        location.hash = '#/starter';
      } catch (err) {
        showFieldErrors(form, err.fields);
        toast(err.message, { error: true });
      }
    },
  },
  h('fieldset', {},
    h('legend', {}, 'Feeding'),
    field('Fed at', h('input', { id: 'fd-fedAt', name: 'fedAt', type: 'datetime-local', value: toLocalInput(existing?.fedAt) })),
    h('div', { class: 'field-row' },
      field('Starter kept', num('seedG', prev.seedG), 'g'),
      field('Flour', num('flourG', prev.flourG), 'g'),
      field('Water', num('waterG', prev.waterG), 'g'))),
  h('fieldset', {},
    h('legend', {}, 'Where it’s rising'),
    h('div', { class: 'field-row' },
      field('Temperature', num('temp', existing ? existing.temp : convertTemp(prev.temp, prev.tempUnit, unit), { min: -50 })),
      field('Unit', unitSelect)),
    h('label', { class: 'check' },
      h('input', { type: 'checkbox', name: 'inWarmer', checked: prev.inWarmer ?? false }), 'In the warmer')),
  h('fieldset', {},
    h('legend', {}, 'Peak'),
    h('div', { class: 'field-row' },
      field('Peaked at', h('input', { id: 'fd-peakedAt', name: 'peakedAt', type: 'datetime-local', value: existing?.peakedAt ? toLocalInput(existing.peakedAt) : '' }), null, 'Leave blank while it’s still rising'),
      field('Grew by', num('risePct', existing?.risePct, { step: 10 }), '%', '100% means it doubled'))),
  h('div', { class: 'field' },
    h('label', { for: 'fd-notes' }, 'Notes'),
    h('textarea', { id: 'fd-notes', name: 'notes', rows: 3, value: existing?.notes ?? '', placeholder: 'Smell, bubbles, anything unusual' })),
  h('div', { class: 'form-actions' },
    h('button', { type: 'submit', class: 'btn' }, existing ? 'Save changes' : 'Log feeding'),
    h('a', { class: 'btn ghost', href: '#/starter' }, 'Cancel'),
    existing && h('button', {
      type: 'button', class: 'btn ghost danger push-right',
      onclick: async () => {
        if (!confirm('Delete this feeding?')) return;
        try {
          await api.feedings.remove(existing.id);
          toast('Feeding deleted');
          location.hash = '#/starter';
        } catch (err) { toast(err.message, { error: true }); }
      },
    }, 'Delete feeding')));

  return h('section', { class: 'page narrow' },
    h('div', { class: 'page-head' },
      h('h1', {}, existing ? 'Edit feeding' : `Feed ${starter.name}`),
      !existing && starter.feedings[0] && h('p', { class: 'muted' }, 'Amounts and temperature are copied from the last feeding.')),
    form);
}

