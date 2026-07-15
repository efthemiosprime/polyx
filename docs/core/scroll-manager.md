# scrollManager

## Overview

`scrollManager` is a shared singleton that centralizes window scroll handling. Instead
of every component attaching its own `scroll` listener, they all subscribe to one
manager that:

- **Coalesces** a burst of scroll events into a single notification per animation
  frame (`requestAnimationFrame`), so subscribers never run more than once per paint.
- Tracks scroll **position** and **direction** (`'up'` / `'down'`).
- Offers **one-time directional triggers** — fire a callback the first time the user
  scrolls up or down, with optional auto-reset.
- Supports per-subscriber **`throttle`** / **`debounce`** for expensive work.
- Starts the underlying listener only when it has at least one subscriber/trigger and
  **stops** (removing the listener and cancelling timers) when the last one leaves.

```javascript
import { scrollManager } from '@efthemiosprime/polyx/dom';

const unsubscribe = scrollManager.subscribe(({ y, direction }) => {
  console.log(`at ${y}px, scrolling ${direction}`);
});

// later, when the component unmounts:
unsubscribe();
```

Every callback receives a `ScrollData` object:

```typescript
interface ScrollData {
  y: number;                 // window.scrollY at the time of the frame
  direction: 'up' | 'down';  // vertical direction of the last movement
  timestamp: number;         // Date.now() of the frame
}
```

## API Reference

### `subscribe(callback, options?)`

Register a scroll listener. Returns an **unsubscribe** function — always call it on
teardown.

| Param | Type | Description |
|-------|------|-------------|
| `callback` | `(data: ScrollData) => void` | Called (at most once per frame) while scrolling. |
| `options.throttle` | `number` | Call at most once per N ms — for continuous work (progress bars, parallax). |
| `options.debounce` | `number` | Call only after scrolling **pauses** for N ms — for "scroll-end" work (persist position, lazy work). `debounce` wins if both are given. |

```javascript
// default: one call per animation frame
const off = scrollManager.subscribe(data => update(data));

// throttled: at most one call per 100ms
const off2 = scrollManager.subscribe(updateProgressBar, { throttle: 100 });

// debounced: fires 150ms after the user stops scrolling
const off3 = scrollManager.subscribe(saveScrollPosition, { debounce: 150 });
```

The pending `throttle`/`debounce` timer is cancelled automatically when you unsubscribe.

### `getScrollPosition()`

Returns the current `ScrollData` synchronously (a **side-effect-free read** — it never
changes the tracked direction).

```javascript
const { y, direction } = scrollManager.getScrollPosition();
```

### `addOneTimeTrigger(options)`

Fire a callback the **first** time the user scrolls in a given direction. Returns a
trigger **id** (string) for later removal.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `direction` | `'up' \| 'down'` | `'down'` | Direction that fires the trigger. |
| `callback` | `(data: ScrollData) => void` | — | Called once when the direction is first hit. |
| `resetOnStop` | `boolean` | `true` | Re-arm the trigger after scrolling stops. |
| `resetDelay` | `number` | `1500` | Idle ms before re-arming (when `resetOnStop`). |
| `requireActualScroll` | `boolean` | `true` | Only fire after a real scroll event (not from the initial position). |
| `debounceInterval` | `number` | `300` | Min ms before a direction reversal can re-arm it. |

```javascript
const id = scrollManager.addOneTimeTrigger({
  direction: 'down',
  callback: () => header.classList.add('is-hidden'),
});
```

### `removeOneTimeTrigger(id)` / `resetOneTimeTrigger(id)` / `resetAllOneTimeTriggers()`

Remove a trigger (and cancel its timers), reset a single trigger so it can fire again,
or reset them all.

```javascript
scrollManager.removeOneTimeTrigger(id); // gone; also stops the manager if it was the last consumer
```

## Real-World Examples

### 1. Hide-on-scroll-down, show-on-scroll-up header

The classic sticky header that gets out of the way when reading down and reappears
when scrolling up. Two one-time triggers, each re-arming after the opposite direction.

```javascript
import { scrollManager } from '@efthemiosprime/polyx/dom';

export function autoHideHeader(header) {
  const down = scrollManager.addOneTimeTrigger({
    direction: 'down',
    callback: () => header.classList.add('header--hidden'),
  });
  const up = scrollManager.addOneTimeTrigger({
    direction: 'up',
    callback: () => header.classList.remove('header--hidden'),
  });

  // cleanup (e.g. on route change / unmount)
  return () => {
    scrollManager.removeOneTimeTrigger(down);
    scrollManager.removeOneTimeTrigger(up);
  };
}
```

### 2. Reading-progress bar (throttled)

A top-of-page bar that fills as you scroll. Progress work is cheap but frequent, so
throttle it to a frame-friendly interval.

```javascript
export function readingProgress(barEl) {
  return scrollManager.subscribe(({ y }) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (y / max) * 100 : 0;
    barEl.style.width = `${pct}%`;
  }, { throttle: 16 });
}
```

### 3. Infinite scroll / "load more"

Fetch the next page when the user nears the bottom. Guard against overlapping loads.

```javascript
export function infiniteScroll(loadMore, { threshold = 400 } = {}) {
  let loading = false;

  return scrollManager.subscribe(async ({ y }) => {
    if (loading) return;
    const distanceToBottom =
      document.documentElement.scrollHeight - (y + window.innerHeight);

    if (distanceToBottom < threshold) {
      loading = true;
      try { await loadMore(); } finally { loading = false; }
    }
  }, { throttle: 200 });
}
```

### 4. Persist scroll position (debounced)

Save the position only once the user *stops* scrolling — no thrashing `localStorage`
on every frame.

```javascript
export function rememberScroll(key = 'scroll:' + location.pathname) {
  // restore on load
  const saved = Number(localStorage.getItem(key));
  if (saved) window.scrollTo(0, saved);

  return scrollManager.subscribe(({ y }) => {
    localStorage.setItem(key, String(y));
  }, { debounce: 150 });
}
```

### 5. Back-to-top button

Show a button once the user has scrolled past a threshold.

```javascript
export function backToTop(button, showAfter = 600) {
  return scrollManager.subscribe(({ y }) => {
    button.classList.toggle('is-visible', y > showAfter);
  }, { throttle: 100 });
}
```

## Integration with other PolyX modules

`getScrollPosition()` and `subscribe` pair naturally with `isInView` and the DOM helpers:

```javascript
import { scrollManager, isInView, getElements } from '@efthemiosprime/polyx/dom';

export function revealOnScroll(selector) {
  const els = getElements(selector);
  return scrollManager.subscribe(() => {
    els.forEach(el => {
      if (isInView(el, 'center')) el.classList.add('is-revealed');
    });
  }, { throttle: 100 });
}
```

## Performance & lifecycle notes

- **One listener for the whole app.** The manager attaches a single `passive` scroll
  listener and shares it; it's removed automatically when the last subscriber/trigger
  is gone. Always call the returned unsubscribe / `removeOneTimeTrigger` on teardown so
  the manager can stop.
- **rAF-coalesced by default.** Subscribers already run at most once per frame; reach
  for `throttle` only when even per-frame is too much, and `debounce` for work that
  should happen after scrolling settles.
- **`getScrollPosition()` is safe to call anytime** — it reads state without mutating
  the direction baseline.
