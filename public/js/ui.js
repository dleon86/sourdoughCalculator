// Tiny DOM helpers. Building elements (instead of innerHTML strings) means
// a recipe named "Mom's rye" can't break the page. The old app stored
// JSON in an HTML attribute, which an apostrophe would cut short.

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'class') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key === 'value' || (key in el && typeof value !== 'string')) el[key] = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
}

let toastTimer;
export function toast(message, { error = false } = {}) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.toggle('error', error);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), error ? 6000 : 2500);
}

// A labelled number input with an optional unit suffix.
export function numberField({ label, name, value, unit, step = 'any', min = 0, hint, onInput }) {
  const id = `f-${name}`;
  return h('div', { class: 'field' },
    h('label', { for: id }, label),
    h('div', { class: 'input-unit' },
      h('input', {
        id, name, type: 'number', inputmode: 'decimal', step, min,
        value: value ?? '', oninput: onInput,
      }),
      unit && h('span', { class: 'unit', 'aria-hidden': 'true' }, unit),
    ),
    hint && h('p', { class: 'hint' }, hint),
  );
}

// Show server-side validation messages next to the matching inputs.
export function showFieldErrors(form, fields = {}) {
  form.querySelectorAll('.field-error').forEach((el) => el.remove());
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  for (const [name, message] of Object.entries(fields)) {
    const input = form.querySelector(`[name="${name}"]`);
    const field = input?.closest('.field') ?? form;
    input?.setAttribute('aria-invalid', 'true');
    field.append(h('p', { class: 'field-error' }, message));
  }
}

const dateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
// 'YYYY-MM-DD' → local date without timezone drift.
export function parseDay(day) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export const formatDay = (day) => dateFmt.format(parseDay(day));

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDuration(minutes) {
  if (minutes == null) return '';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hrs) return `${mins} min`;
  return mins ? `${hrs} h ${mins} min` : `${hrs} h`;
}

export function stars(rating) {
  if (!rating) return h('span', { class: 'stars empty' }, 'Not rated');
  return h('span', { class: 'stars', 'aria-label': `${rating} out of 5` },
    '★'.repeat(rating), h('span', { class: 'dim' }, '★'.repeat(5 - rating)));
}

// localStorage can throw (private mode, blocked storage); never let it break the app.
export const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

// ---- Time helpers for live timers and date-time inputs ------------------

export const minutesBetween = (from, to = Date.now()) =>
  Math.max(0, Math.round((new Date(to) - new Date(from)) / 60000));

// "3 h 20 min" style elapsed time between two moments.
export const formatElapsed = (from, to) => formatDuration(minutesBetween(from, to));

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dayTimeFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
export const formatTime = (iso) => timeFmt.format(new Date(iso));
export const formatDayTime = (iso) => dayTimeFmt.format(new Date(iso));

// <input type="datetime-local"> works in local time without a zone.
export function toLocalInput(iso) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export const fromLocalInput = (value) => (value ? new Date(value).toISOString() : null);

// Calls fn every `ms` while `node` is on the page, then stops by itself.
export function every(ms, node, fn) {
  let mounted = false;
  const id = setInterval(() => {
    if (node.isConnected) { mounted = true; fn(); } else if (mounted) clearInterval(id);
  }, ms);
}

// ---- Temperature ----------------------------------------------------------

const UNIT_KEY = 'bread.tempUnit';
export const tempUnit = {
  get: () => store.get(UNIT_KEY, 'F'),
  set: (u) => store.set(UNIT_KEY, u),
};
export function convertTemp(value, from, to) {
  if (value == null || from === to) return value;
  return to === 'C' ? (value - 32) * 5 / 9 : value * 9 / 5 + 32;
}
