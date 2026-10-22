// Scatter of hours-to-peak against temperature, one colour for feedings in
// the warmer and one for the counter. Plain SVG, no chart library.
import { formatNumber } from '../calc.js';
import { convertTemp, formatDayTime, formatElapsed, h, tempUnit } from '../ui.js';

const SVG = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}, ...children) => {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  el.append(...children);
  return el;
};

const SERIES = [
  { key: 'warmer', label: 'In the warmer', test: (f) => f.inWarmer },
  { key: 'counter', label: 'On the counter', test: (f) => !f.inWarmer },
];

// Round axis bounds out to tidy steps.
function niceTicks(min, max, count = 5) {
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((m) => m >= raw);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(6));
  return ticks;
}

export function peakChart(feedings) {
  const unit = tempUnit.get();
  const points = feedings
    .filter((f) => f.peakedAt && f.temp != null)
    .map((f) => ({
      f,
      x: convertTemp(f.temp, f.tempUnit, unit),
      y: (new Date(f.peakedAt) - new Date(f.fedAt)) / 3600000,
    }));

  if (points.length < 2) {
    return h('p', { class: 'muted' },
      'Log a few feedings with a temperature and a peak time. This chart will show how much faster your starter peaks when it’s warmer, so you can compare the warmer with the counter.');
  }

  const tip = h('div', { class: 'chart-tip', role: 'status', hidden: true });
  const wrap = h('div', { class: 'chart-wrap' }, tip);

  // Draw at the real pixel width so text stays 12px on a phone or a monitor.
  function draw(W) {
    const H = Math.round(Math.min(320, Math.max(220, W * 0.5)));
    const M = { top: 12, right: 16, bottom: 44, left: 48 };
    const xt = niceTicks(Math.min(...points.map((p) => p.x)), Math.max(...points.map((p) => p.x)));
    const yt = niceTicks(0, Math.max(...points.map((p) => p.y)));
    const x = (v) => M.left + (v - xt[0]) / (xt.at(-1) - xt[0]) * (W - M.left - M.right);
    const y = (v) => H - M.bottom - (v - yt[0]) / (yt.at(-1) - yt[0]) * (H - M.top - M.bottom);

    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'chart', role: 'img', 'aria-label': `Hours to peak against temperature for ${points.length} feedings` });

    // Recessive grid and axes.
    for (const v of yt) {
      svg.append(s('line', { x1: M.left, x2: W - M.right, y1: y(v), y2: y(v), class: 'grid' }));
      svg.append(s('text', { x: M.left - 8, y: y(v), class: 'tick', 'text-anchor': 'end', 'dominant-baseline': 'middle' }, `${v} h`));
    }
    for (const v of xt) {
      svg.append(s('text', { x: x(v), y: H - M.bottom + 18, class: 'tick', 'text-anchor': 'middle' }, `${v}°`));
    }
    svg.append(s('text', { x: (M.left + W - M.right) / 2, y: H - 6, class: 'axis-title', 'text-anchor': 'middle' }, `Temperature (°${unit})`));

    const show = (p, cx, cy) => {
      tip.hidden = false;
      tip.replaceChildren(
        h('strong', {}, `${formatElapsed(p.f.fedAt, p.f.peakedAt)} to peak`),
        h('span', {}, `${formatNumber(p.x, 0)}°${unit}, ${p.f.inWarmer ? 'in the warmer' : 'on the counter'}`),
        p.f.risePct != null && h('span', {}, `Grew ${formatNumber(p.f.risePct, 0)}%`),
        h('span', { class: 'muted' }, formatDayTime(p.f.fedAt)));
      tip.style.left = `${cx}px`;
      tip.style.top = `${cy}px`;
    };
    const hide = () => { tip.hidden = true; };

    // Dots with a surface-coloured ring, and a larger invisible hit target.
    for (const series of SERIES) {
      for (const p of points.filter((pt) => series.test(pt.f))) {
        const cx = x(p.x); const cy = y(p.y);
        const g = s('g', { class: `dot ${series.key}`, tabindex: 0 },
          s('circle', { cx, cy, r: 5.5, class: 'mark' }),
          s('circle', { cx, cy, r: 14, class: 'hit' }));
        g.addEventListener('pointerenter', () => show(p, cx, cy));
        g.addEventListener('focus', () => show(p, cx, cy));
        g.addEventListener('pointerleave', hide);
        g.addEventListener('blur', hide);
        svg.append(g);
      }
    }

    wrap.querySelector('svg')?.remove();
    wrap.prepend(svg);
  }

  let lastWidth = 0;
  new ResizeObserver(([entry]) => {
    const width = Math.floor(entry.contentRect.width);
    if (width > 0 && width !== lastWidth) { lastWidth = width; draw(width); }
  }).observe(wrap);

  // Legend doubles as a plain-language summary per series.
  const legend = h('ul', { class: 'legend' }, SERIES.map((series) => {
    const pts = points.filter((p) => series.test(p.f));
    if (pts.length === 0) return null;
    const avgH = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    const avgT = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    return h('li', {},
      h('span', { class: `swatch ${series.key}`, 'aria-hidden': 'true' }),
      h('span', {}, h('strong', {}, series.label), `: about ${formatNumber(avgH, 1)} h to peak at ${formatNumber(avgT, 0)}°${unit} on average (${pts.length})`));
  }));

  return h('figure', { class: 'peak-chart' }, legend, wrap);
}
