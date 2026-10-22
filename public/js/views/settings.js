import * as api from '../api.js';
import { h, tempUnit, toast } from '../ui.js';

export async function settingsView() {
  const session = await api.session.get();

  const unit = h('select', {
    id: 'set-unit',
    onchange: (e) => { tempUnit.set(e.target.value); toast(`Temperatures default to °${e.target.value}`); },
  }, h('option', { value: 'F', selected: tempUnit.get() === 'F' }, 'Fahrenheit (°F)'),
  h('option', { value: 'C', selected: tempUnit.get() === 'C' }, 'Celsius (°C)'));

  const restoreInput = h('input', {
    type: 'file', accept: 'application/json,.json', class: 'sr-only', id: 'restore-file',
    onchange: async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      let data;
      try { data = JSON.parse(await file.text()); } catch {
        toast('That file isn’t valid JSON', { error: true });
        return;
      }
      const n = (k) => (Array.isArray(data[k]) ? data[k].length : 0);
      if (!confirm(`Replace everything in this app with the backup from ${data.exportedAt?.slice(0, 10) ?? 'that file'}?\n\n`
        + `${n('recipes')} recipes, ${n('bakes')} bakes, ${n('starters')} starters, ${n('feedings')} feedings.\n\n`
        + 'Anything not in the backup will be lost. Download a backup of the current data first if you might want it.')) return;
      try {
        const sameHere = confirm('Was this backup made from this same copy of the app (not your computer → the cloud)?\n\nOK keeps its photo links. Cancel drops them, since the photo files won’t be here.');
        const result = await api.request('POST', `/import${sameHere ? '?photos=keep' : ''}`, data);
        toast(`Restored ${result.restored.bakes} bakes and ${result.restored.recipes} recipes`);
      } catch (err) { toast(err.message, { error: true }); }
    },
  });

  return h('section', { class: 'page narrow settings' },
    h('div', { class: 'page-head' }, h('h1', {}, 'Settings')),

    h('section', {},
      h('h2', {}, 'Temperature'),
      h('div', { class: 'field' }, h('label', { for: 'set-unit' }, 'Show and enter temperatures in'), unit,
        h('p', { class: 'hint' }, 'Saved per device. Entries you already logged keep the unit they were entered in.'))),

    h('section', {},
      h('h2', {}, 'Backups'),
      h('p', { class: 'muted' }, 'A backup holds all your recipes, bakes, starters and feedings. Photos aren’t included. They stay where they’re stored.'),
      h('div', { class: 'row-actions start' },
        h('a', { class: 'btn', href: '/api/export', download: '' }, 'Download backup'),
        h('a', { class: 'btn ghost', href: '/api/export/bakes.csv', download: '' }, 'Bakes as a spreadsheet (CSV)')),
      h('div', { class: 'row-actions start' },
        h('label', { class: 'btn ghost danger', for: 'restore-file' }, 'Restore from a backup…'), restoreInput)),

    h('section', {},
      h('h2', {}, 'This device'),
      h('p', { class: 'muted' }, 'On Android, open the browser menu and choose “Add to Home screen” or “Install app” to use Bread Log like any other app.'),
      session.passwordRequired && h('button', {
        type: 'button', class: 'btn ghost',
        onclick: async () => { await api.session.logout(); location.hash = '#/'; location.reload(); },
      }, 'Sign out on this device')),
  );
}
