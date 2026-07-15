# State (createState)

## Overview

`createState` is a tiny, framework-free state container with a **React-like
`[state, setState]`** ergonomic — but usable in plain JavaScript, with no build
step and no re-render machinery.

```javascript
import { createState } from '@efthemiosprime/polyx';
// or the subpath: '@efthemiosprime/polyx/state'

const [count, setCount] = createState(0);

count();               // 0  — read the current value
setCount(5);           // set a value
setCount((n) => n + 1); // set via an updater of the previous value
count();               // 6
```

> **How it differs from React.** In React, `state` is a live *value* because React
> re-renders your component. Vanilla JS has no re-render, so `state` is a **getter
> function** (`state()`) — the same approach SolidJS takes. Everything else —
> including the value-or-updater `setState` — behaves like you'd expect.

## Why not just a plain variable?

Two reasons that pay off with the rest of PolyX:

1. **The updater is `(prev) => next`** — which is *exactly* the shape
   [`setPath`, `updatePath`, and `over(lens, …)`](./data-paths.md) produce. So
   immutable nested updates drop straight into `setState` (see below).
2. **Subscriptions** — `subscribe(listener)` lets views react to changes and
   returns an unsubscribe, matching the library's teardown convention. Setting an
   equal value (`Object.is`) is a no-op that notifies no one.

## API Reference

`createState(initial)` returns a `[state, setState]` tuple that **also** carries
`get` / `set` / `subscribe`, so you can destructure *or* keep the store object.

| Member | Description | Signature |
|--------|-------------|-----------|
| `state()` / `store.get()` | Read the current value. | `() => T` |
| `setState(next)` / `store.set(next)` | Replace the value; `next` is a value or an updater `(prev) => next`. Returns the new value. No-op if unchanged (`Object.is`). | `(T \| (prev: T) => T) => T` |
| `store.subscribe(listener)` | Call `listener(value)` on every change. Returns an unsubscribe fn. | `((T) => void) => (() => void)` |

```javascript
// Destructure for the React feel — but keep the store to subscribe:
const counter = createState(0);
const [count, setCount] = counter;
const off = counter.subscribe((v) => console.log('count is', v));

setCount((n) => n + 1); // logs "count is 1"
off();                  // stop listening
```

## Real-World Examples

### Bind state to the DOM

```javascript
import { createState } from '@efthemiosprime/polyx';

const counter = createState(0);
const [count, setCount] = counter;

const label = document.querySelector('#count');
counter.subscribe((n) => { label.textContent = String(n); });

document.querySelector('#inc').addEventListener('click', () => setCount((n) => n + 1));
document.querySelector('#reset').addEventListener('click', () => setCount(0));
```

### Nested state, updated immutably with the data tools

Because `setState` accepts a `(prev) => next` updater, the immutable path/lens
helpers compose directly — no spread-hell:

```javascript
import { createState, setPath, over, lensProp } from '@efthemiosprime/polyx';

const store = createState({ user: { name: 'ada', hits: 0 }, theme: 'light' });
const [state, setState] = store;

setState(setPath('user.name', 'Ada'));          // { user: { name: 'Ada', … }, … }
setState(over(lensProp('theme'), () => 'dark')); // flip the theme
setState((s) => setPath('user.hits', s.user.hits + 1)(s));

state(); // { user: { name: 'Ada', hits: 1 }, theme: 'dark' }
```

### A derived view

```javascript
const todos = createState([]);
const [items, setItems] = todos;

const remaining = () => items().filter((t) => !t.done).length;

todos.subscribe(() => render(remaining()));
setItems((list) => [...list, { text: 'ship it', done: false }]);
```

## Notes

- **Reference identity matters for the bail-out.** `set` skips notifying when the
  new value is `Object.is`-equal to the old one. For objects/arrays, always produce
  a *new* reference on change (the immutable helpers do this for you) so subscribers
  fire.
- **Keep the store to subscribe.** Pure tuple destructuring
  (`const [s, setS] = createState(0)`) doesn't expose `subscribe`; hold the
  returned store object if you need it.
