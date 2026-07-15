// PolyX integration demo — state + data + dom, no framework, no build step.
// Imports point at the source modules directly (all ES-module file paths).
import { createState } from '../src/state/createState.js';        // state
import { setPath, updatePath } from '../src/data/update.js';       // data (writes)
import { lensPath, over } from '../src/data/lens.js';              // data (lenses)
import { on, delegate } from '../src/dom/utils.js';               // dom (events)
import { onIntersect } from '../src/dom/observers.js';            // dom (observer)

// ── STATE ──────────────────────────────────────────────────────────────────
// One store holds the whole app; subscribe() drives every re-render.
const store = createState({
  todos: [
    { id: 1, text: 'Learn createState', done: true },
    { id: 2, text: 'Update nested state with setPath / lenses', done: false },
    { id: 3, text: 'Wire events with on + delegate', done: false },
  ],
  filter: 'all', // 'all' | 'active' | 'done'
  nextId: 4,
});
const [state, setState] = store;

// ── DATA ───────────────────────────────────────────────────────────────────
// Every mutation is an immutable (prev => next) update — exactly what setState
// accepts — built from the data module's path/lens helpers.
const addTodo = (text) =>
  setState((s) =>
    // compose two immutable updates: append a todo AND bump nextId
    setPath('nextId', s.nextId + 1)(
      updatePath('todos', (ts) => [...ts, { id: s.nextId, text, done: false }])(s)
    )
  );

const toggleTodo = (id) =>
  setState((s) => {
    const i = s.todos.findIndex((t) => t.id === id);
    return i < 0 ? s : over(lensPath(['todos', i, 'done']), (d) => !d)(s);
  });

const removeTodo = (id) =>
  setState(updatePath('todos', (ts) => ts.filter((t) => t.id !== id)));

const clearDone = () =>
  setState(updatePath('todos', (ts) => ts.filter((t) => !t.done)));

const setFilter = (filter) => setState(setPath('filter', filter));

// derived views (pure)
const visible = (s) =>
  s.filter === 'active' ? s.todos.filter((t) => !t.done)
  : s.filter === 'done' ? s.todos.filter((t) => t.done)
  : s.todos;
const remaining = (s) => s.todos.filter((t) => !t.done).length;

// ── DOM ────────────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const listEl = $('#list');
const emptyEl = $('#empty');
const countEl = $('#count');
const filtersEl = $('#filters');

let offReveal = () => {}; // teardown for the previous IntersectionObserver

const render = (s) => {
  const items = visible(s);

  listEl.innerHTML = '';
  for (const t of items) {
    const li = document.createElement('li');
    li.className = 'todo' + (t.done ? ' done' : '');
    li.dataset.id = String(t.id);
    li.innerHTML =
      `<button class="toggle" aria-label="toggle">${t.done ? '✅' : '⬜️'}</button>` +
      `<span class="text"></span>` +
      `<button class="delete" aria-label="delete">✕</button>`;
    li.querySelector('.text').textContent = t.text; // textContent = XSS-safe
    listEl.appendChild(li);
  }
  emptyEl.hidden = items.length > 0;
  countEl.textContent = `${remaining(s)} left`;

  for (const b of filtersEl.querySelectorAll('button')) {
    b.classList.toggle('active', b.dataset.filter === s.filter);
  }

  // dom (observer): fade each freshly-rendered row in as it enters the viewport.
  offReveal();
  offReveal = onIntersect('#list .todo', (entries, obs) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('shown'); obs.unobserve(e.target); }
    }
  }, { threshold: 0.05 });
};

// state → view: re-render on every change (tear down the old observer first).
store.subscribe(render);

// dom (events):
// on() — form submit adds a todo.
on('submit', (e) => {
  e.preventDefault();
  const input = $('#new-todo');
  const text = input.value.trim();
  if (!text) return;
  addTodo(text);
  input.value = '';
})($('#add-form'));

// delegate() — one listener each covers current AND future rows/filters.
delegate(listEl, 'click', '.toggle', (_e, btn) =>
  toggleTodo(Number(btn.closest('.todo').dataset.id)));
delegate(listEl, 'click', '.delete', (_e, btn) =>
  removeTodo(Number(btn.closest('.todo').dataset.id)));
delegate(filtersEl, 'click', 'button', (_e, btn) => setFilter(btn.dataset.filter));
on('click', clearDone)($('#clear-done'));

// initial paint
render(state());

// expose for quick console poking / debugging
window.__polyx = { store, state, setState };
