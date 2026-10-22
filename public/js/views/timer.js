// Bake-day timer (#/bakes/:id/timer). Tap each step as you do it; the
// timings for the log are worked out from those taps when you finish.
import * as api from '../api.js';
import { calculate, formatGrams } from '../calc.js';
import { uploadPhoto } from '../photos.js';
import { bakeDay, currentStage, deriveTimings, folds, nextSteps, STEPS } from '../timeline.js';
import {
  every, formatElapsed, formatTime, fromLocalInput, h, store, toLocalInput, toast, today, fill } from '../ui.js';

const FOLD_KEY = 'bread.foldReminderMinutes';

// Create an in-progress bake and open its timer.
export async function startBake({ recipeId = null, formula }) {
  try {
    const starters = (await api.starters.list()).filter((s) => !s.archived);
    const bake = await api.bakes.create({
      recipeId,
      formula,
      starterId: starters.length === 1 ? starters[0].id : null,
      bakedOn: today(),
      status: 'active',
      events: [],
    });
    location.hash = `#/bakes/${bake.id}/timer`;
  } catch (err) {
    toast(err.message, { error: true });
  }
}

export async function timerView(bakeId) {
  let bake = await api.bakes.get(bakeId);
  const starter = bake.starterId ? await api.starters.get(bake.starterId).catch(() => null) : null;

  const stageBox = h('div', { class: 'timer-stage', 'aria-live': 'polite' });
  const actions = h('div', { class: 'timer-actions' });
  const log = h('ol', { class: 'timer-log' });
  const extras = h('div', { class: 'timer-extras' });

  async function save(changes) {
    const previous = bake;
    bake = { ...bake, ...changes };
    draw();
    try {
      bake = await api.bakes.update(bake.id, bake);
    } catch (err) {
      bake = previous;
      draw();
      toast(err.message, { error: true });
    }
  }

  const addEvent = (type) => {
    save({ events: [...bake.events, { type, at: new Date().toISOString() }] });
    navigator.vibrate?.(30);
  };

  // ---- Fold reminder (only while this page is open) ---------------------
  let reminderMinutes = store.get(FOLD_KEY, 0);
  let notifiedFor = null;
  function foldDue() {
    if (!reminderMinutes || currentStage(bake.events)?.type !== 'mix') return null;
    const lastFold = folds(bake.events).at(-1)?.at ?? currentStage(bake.events).since;
    const dueAt = new Date(lastFold).getTime() + reminderMinutes * 60000;
    return { dueAt, overdue: Date.now() >= dueAt, key: lastFold };
  }
  function checkReminder() {
    const due = foldDue();
    if (!due?.overdue || notifiedFor === due.key) return;
    notifiedFor = due.key;
    navigator.vibrate?.([200, 100, 200]);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Time for a fold', { body: bake.formula.name || 'Your dough', icon: 'img/icon-192.png', tag: 'fold' });
    }
  }

  // ---- Drawing ------------------------------------------------------------
  function drawStage() {
    const stage = currentStage(bake.events);
    const n = folds(bake.events).length;
    const due = foldDue();
    if (!stage) {
      fill(stageBox, 
        h('p', { class: 'stage-name' }, 'Ready when you are'),
        h('p', { class: 'muted' }, 'Tap the first step when you start. If you already started, tap it and then fix the time in the list below.'));
      return;
    }
    const lines = [];
    if (stage.type === 'mix') {
      lines.push(n === 0 ? 'No folds yet' : `${n} ${n === 1 ? 'fold' : 'folds'}, last ${formatElapsed(folds(bake.events).at(-1).at)} ago`);
      if (due) {
        const mins = Math.ceil((due.dueAt - Date.now()) / 60000);
        lines.push(due.overdue ? h('strong', { class: 'due' }, 'Fold is due') : `Next fold in ${mins} min`);
      }
    }
    if (stage.type === 'out') lines.push('Let it cool at least an hour before cutting.');
    fill(stageBox, 
      h('p', { class: 'stage-name' }, stage.label),
      h('p', { class: 'stage-time' }, formatElapsed(stage.since)),
      lines.map((l) => h('p', { class: 'muted' }, l)));
    stageBox.classList.toggle('is-due', Boolean(due?.overdue));
  }

  function drawActions() {
    const steps = nextSteps(bake.events);
    const done = currentStage(bake.events)?.type === 'out';
    fill(actions, 
      steps.map((type, i) => h('button', {
        type: 'button', class: i === 0 ? 'btn big' : 'btn ghost big', onclick: () => addEvent(type),
      }, STEPS[type].action)),
      (done || bake.status === 'done') && h('button', { type: 'button', class: 'btn big', onclick: finish },
        bake.status === 'done' ? 'Save and go to the bake' : 'Finish and rate it'),
      bake.events.length > 0 && h('button', {
        type: 'button', class: 'link-btn',
        onclick: () => save({ events: bake.events.slice(0, -1) }),
      }, `Undo “${STEPS[bake.events.at(-1).type].label}”`),
    );
  }

  function drawLog() {
    const sortedEvents = bake.events.map((e, i) => ({ ...e, i })).sort((a, b) => new Date(a.at) - new Date(b.at));
    fill(log, ...sortedEvents.map((e) => h('li', {},
      h('span', { class: 'log-label' }, STEPS[e.type].label),
      h('input', {
        type: 'datetime-local', value: toLocalInput(e.at), 'aria-label': `Time of ${STEPS[e.type].label}`,
        onchange: (ev) => {
          const at = fromLocalInput(ev.target.value);
          if (!at) return;
          save({ events: bake.events.map((x, j) => (j === e.i ? { ...x, at } : x)) });
        },
      }),
      h('button', {
        type: 'button', class: 'icon-btn', 'aria-label': `Remove ${STEPS[e.type].label}`,
        onclick: () => save({ events: bake.events.filter((_, j) => j !== e.i) }),
      }, '×'))));
    if (sortedEvents.length === 0) fill(log, h('li', { class: 'muted' }, 'Steps you tap show up here, and you can fix their times.'));
  }

  function drawExtras() {
    const mix = bake.events.find((e) => e.type === 'mix');
    const fed = mix && starter?.feedings.find((f) => new Date(f.fedAt) < new Date(mix.at));
    const r = calculate(bake.formula);
    fill(extras, 
      fed && h('p', { class: 'muted' },
        `${starter.name} was fed ${formatElapsed(fed.fedAt, mix.at)} before mixing`,
        fed.peakedAt && new Date(fed.peakedAt) < new Date(mix.at) ? ` and peaked ${formatElapsed(fed.peakedAt, mix.at)} before.` : '.'),
      h('label', { class: 'btn ghost small photo-add' },
        h('input', {
          type: 'file', accept: 'image/*', class: 'sr-only',
          onchange: async (e) => {
            const file = e.target.files[0];
            e.target.value = '';
            if (!file) return;
            try {
              await uploadPhoto(bake.id, file);
              toast('Photo added to this bake');
            } catch (err) { toast(err.message || 'Couldn’t upload that photo', { error: true }); }
          },
        }),
        'Add a photo'),
      h('details', { class: 'weights' },
        h('summary', {}, 'Weights'),
        h('ul', {},
          r.flours.map((f) => h('li', {}, h('span', {}, f.name), h('span', {}, `${formatGrams(f.grams)} g`))),
          h('li', {}, h('span', {}, 'Water'), h('span', {}, `${formatGrams(Math.max(r.water, 0))} g`)),
          h('li', {}, h('span', {}, 'Starter'), h('span', {}, `${formatGrams(r.starter)} g`)),
          h('li', {}, h('span', {}, 'Salt'), h('span', {}, `${formatGrams(r.salt)} g`)))),
    );
  }

  function draw() {
    drawStage();
    drawActions();
    drawLog();
    drawExtras();
  }

  async function finish() {
    const timings = deriveTimings(bake.events);
    try {
      await api.bakes.update(bake.id, { ...bake, ...timings, status: 'done', bakedOn: bakeDay(bake.events) });
      toast(bake.status === 'done' ? 'Changes saved' : 'Bake finished. Add a rating and photos.');
      location.hash = `#/bakes/${bake.id}`;
    } catch (err) { toast(err.message, { error: true }); }
  }

  // ---- Settings: fold reminder and screen wake lock ----------------------
  const reminderSelect = h('select', {
    id: 't-reminder', 'aria-label': 'Fold reminder',
    onchange: async (e) => {
      reminderMinutes = Number(e.target.value);
      store.set(FOLD_KEY, reminderMinutes);
      if (reminderMinutes && 'Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      drawStage();
    },
  }, [[0, 'Off'], [20, 'Every 20 min'], [30, 'Every 30 min'], [45, 'Every 45 min'], [60, 'Every hour']]
    .map(([v, label]) => h('option', { value: v, selected: reminderMinutes === v }, label)));

  let wakeLock = null;
  const wakeToggle = h('input', {
    type: 'checkbox',
    onchange: async (e) => {
      try {
        if (e.target.checked) wakeLock = await navigator.wakeLock.request('screen');
        else { await wakeLock?.release(); wakeLock = null; }
      } catch {
        e.target.checked = false;
        toast('This browser can’t keep the screen on', { error: true });
      }
    },
  });
  // The browser drops the wake lock when you switch apps; take it back on return.
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && wakeToggle.checked && wakeToggle.isConnected) {
      wakeLock = await navigator.wakeLock?.request('screen').catch(() => null);
    }
  });

  draw();
  every(10000, stageBox, () => { drawStage(); checkReminder(); });

  return h('section', { class: 'page narrow timer' },
    h('div', { class: 'page-head' },
      h('h1', {}, bake.formula.name || 'Bake day'),
      h('p', { class: 'muted' }, bake.status === 'done'
        ? 'This bake is finished. You can still fix step times here.'
        : `Started ${bake.events[0] ? formatTime(bake.events[0].at) : 'today'}. The timer keeps running if you close the app.`)),
    stageBox,
    actions,
    h('div', { class: 'timer-settings' },
      h('div', { class: 'field' }, h('label', { for: 't-reminder' }, 'Fold reminder'), reminderSelect,
        h('p', { class: 'hint' }, 'Works while this page is open on your phone.')),
      'wakeLock' in navigator && h('label', { class: 'check' }, wakeToggle, 'Keep the screen on')),
    extras,
    h('h2', {}, 'Steps'),
    log,
    h('p', {}, h('a', { href: `#/bakes/${bake.id}` }, 'Edit temperatures, notes and photos')),
  );
}

