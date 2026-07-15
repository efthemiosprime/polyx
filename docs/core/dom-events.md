# DOM Events & Observers

## Overview

These helpers are the **enhancement layer** for pages you don't fully control —
server-rendered markup, CMS/theme output, static-site islands. They cover the two
things that are tedious and easy to get wrong in vanilla JS: **wiring up event
listeners** (and tearing them down) and **observing the DOM/viewport** over time.

Every helper here shares one convention that makes it safe to drop into any
component lifecycle:

- **It returns a cleanup function**, not the element — call it on teardown to
  remove the listener/observer (the same convention as
  [`scrollManager.subscribe`](./scroll-manager.md)). No leaks.
- **It is null-safe.** A missing element, an empty selector match, or a browser
  without the relevant API is a no-op that *still returns a callable cleanup* —
  never a throw.
- **It accepts a selector, an element, or a collection** (`NodeList` / array)
  wherever it observes.

```javascript
import { on, delegate, onIntersect } from '@efthemiosprime/polyx';
// or from the subpath: '@efthemiosprime/polyx/dom'
```

---

## Events

### `on(event, handler, options?) → (element) => cleanup`

Attaches an event listener and returns a cleanup function that removes it. This is
the teardown-friendly counterpart to [`addEvent`](#addevent-deprecated).

| Param | Type | Description |
|-------|------|-------------|
| `event` | `string` | Event name, e.g. `'click'`. |
| `handler` | `EventListener` | The listener. |
| `options` | `boolean \| AddEventListenerOptions` | Forwarded to `addEventListener` (`once`, `passive`, `capture`, …). |

Returns a curried function of the element, which returns the **cleanup** function.

```javascript
import { on, getElement } from '@efthemiosprime/polyx';

const button = getElement('#save').getOrElse(null);
const off = on('click', () => save(), { passive: true })(button);

// later, on unmount:
off();
```

### `delegate(parent, event, selector, handler) → cleanup`

Attaches a **single** listener on `parent` and invokes `handler` only when the
event originates from a descendant matching `selector`. Because the listener lives
on the parent, it automatically covers elements added **after** setup — ideal for
DOM a CMS or framework injects later.

| Param | Type | Description |
|-------|------|-------------|
| `parent` | `Element` | Container the listener is bound to. |
| `event` | `string` | Event name. |
| `selector` | `string` | CSS selector a descendant must match. |
| `handler` | `(event, matchedElement) => void` | `matchedElement` is the closest ancestor of the event target matching `selector`, still contained by `parent`. |

Returns the **cleanup** function directly.

```javascript
import { delegate } from '@efthemiosprime/polyx';

// One listener handles every .remove-btn — including rows added later.
const off = delegate(document.querySelector('#cart'), 'click', '.remove-btn',
  (event, btn) => removeRow(btn.closest('tr'))
);
```

### `addEvent` *(deprecated)*

`addEvent(event, handler, options)(element)` returns a `Maybe<Element>` and has **no
way to remove the listener** — it leaks. It remains exported for backward
compatibility. **Prefer [`on`](#onevent-handler-options--element--cleanup)** for
anything you'll tear down.

---

## Observers

Thin, null-safe wrappers over the browser's observer APIs. Each returns a cleanup
that **disconnects** the observer, and each passes the browser's **native
callback signature** straight through — you get the real `entries`/`mutations`,
no re-wrapping.

### `onIntersect(target, callback, options?) → cleanup`

`IntersectionObserver` wrapper. Prefer this over polling `isInView` from a scroll
handler — the browser does the work off the main thread, so it's cheaper and needs
no `requestAnimationFrame` babysitting.

> **`isInView` vs `onIntersect`:** use [`isInView`](./is-inview.md) for a
> synchronous, one-shot *"is it visible right now?"* check at a call site; use
> `onIntersect` for **ongoing observation** (lazy-load, reveal-on-scroll, infinite
> scroll, impression tracking).

| Param | Type | Description |
|-------|------|-------------|
| `target` | `string \| Element \| NodeList \| Element[]` | What to observe. |
| `callback` | `IntersectionObserverCallback` | Native `(entries, observer)`. |
| `options` | `IntersectionObserverInit` | Native `root`, `rootMargin`, `threshold`. |

```javascript
import { onIntersect } from '@efthemiosprime/polyx';

const off = onIntersect('img[data-src]', (entries, observer) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const img = entry.target;
    img.src = img.dataset.src;
    observer.unobserve(img); // load once
  }
}, { rootMargin: '200px' }); // start loading 200px early
```

### `onResize(target, callback, options?) → cleanup`

`ResizeObserver` wrapper for reacting to element size changes.

| Param | Type | Description |
|-------|------|-------------|
| `target` | `string \| Element \| NodeList \| Element[]` | What to observe. |
| `callback` | `ResizeObserverCallback` | Native `(entries, observer)`. |
| `options` | `ResizeObserverOptions` | Per-element observe options (e.g. `{ box: 'border-box' }`). |

```javascript
import { onResize } from '@efthemiosprime/polyx';

const off = onResize('.chart', ([entry]) => {
  chart.setSize(entry.contentRect.width, entry.contentRect.height);
});
```

### `onMutation(target, callback, options?) → cleanup`

`MutationObserver` wrapper — the single most useful tool for **enhancing DOM
injected after the initial paint**. When `options` is omitted it defaults to
`{ childList: true, subtree: true }` (watch added/removed descendants), because
`MutationObserver` throws if asked to observe with no active option.

| Param | Type | Description |
|-------|------|-------------|
| `target` | `string \| Element \| NodeList \| Element[]` | What to observe. |
| `callback` | `MutationCallback` | Native `(mutations, observer)`. |
| `options` | `MutationObserverInit` | Native options; defaults to `{ childList: true, subtree: true }`. |

```javascript
import { onMutation } from '@efthemiosprime/polyx';

// A CMS keeps injecting widgets into #app — enhance each as it appears.
const off = onMutation('#app', (mutations) => {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.matches?.('[data-widget]')) mountWidget(node);
    }
  }
});
```

---

## DOM ready

### `ready() → Task<never, Document>`

A lazy [`Task`](./task.md) that resolves once the DOM is ready to be
queried/enhanced. Like every `Task`, it does nothing until you `fork` it. If the
document has already parsed (`readyState !== 'loading'`) it resolves immediately;
otherwise it resolves on the first `DOMContentLoaded`, removing its own listener.
It **never rejects** (the error channel is `never`) and resolves with the
`document` so you can chain straight into a query.

```javascript
import { ready } from '@efthemiosprime/polyx';

ready().fork(
  () => {},                    // never called
  (doc) => {
    for (const el of doc.querySelectorAll('[data-widget]')) mountWidget(el);
  }
);
```

---

## Real-World Examples

### Reveal-on-scroll with automatic cleanup

```javascript
import { ready, onIntersect } from '@efthemiosprime/polyx';

ready().fork(() => {}, () => {
  const off = onIntersect('.reveal', (entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target); // reveal once
    }
  }, { threshold: 0.2 });

  // Keep `off` if this runs inside a component you later tear down.
});
```

### A self-contained, leak-free component

```javascript
import { delegate, onResize, on } from '@efthemiosprime/polyx';

function mountGallery(root) {
  const cleanups = [
    delegate(root, 'click', '.thumb', (e, thumb) => openLightbox(thumb.dataset.full)),
    onResize(root, ([entry]) => relayout(entry.contentRect.width)),
    on('keydown', (e) => e.key === 'Escape' && closeLightbox())(document.body),
  ];

  // Single teardown removes every listener and observer.
  return () => cleanups.forEach((off) => off());
}
```

### Enhancing DOM a CMS injects later

```javascript
import { onMutation } from '@efthemiosprime/polyx';

// The page framework streams content into #main after first paint.
// One observer enhances every table as it lands — no polling.
const off = onMutation('#main', (mutations) => {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      node.querySelectorAll?.('table.sortable').forEach(makeSortable);
    }
  }
});
```

## Notes on testing

`IntersectionObserver` and `ResizeObserver` are **not implemented in jsdom**, so
unit tests that exercise `onIntersect` / `onResize` must stub the global (see
`src/dom/observers.test.js`, which mirrors how `scrollManager.test.js` stubs
`requestAnimationFrame`). `MutationObserver` *is* in jsdom, and `delegate` / `on`
use real event dispatch, so those need no stubbing.
