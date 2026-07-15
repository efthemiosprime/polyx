# Pure DOM (domIO & create)

## Overview

The [DOM utils](./dom-events.md) and `utils.js` helpers are **eager**: `addClass('x')(el)`
performs the mutation immediately (inside a `Maybe.map`). That's convenient, but
impure — the effect happens as a side effect of building the value.

`domIO` is the **referentially transparent** counterpart. Every operation is
`(element) => IO<element>`: it *describes* a DOM effect and does nothing until you
call `.run()`. This keeps effects lazy and composable, so you can build a whole
DOM program as a value and execute it once, at the edge.

```javascript
import { domIO, create } from '@efthemiosprime/polyx';
// or the subpath: '@efthemiosprime/polyx/dom'
```

> **Naming:** the namespace is `domIO` (not `io`) to avoid colliding with the
> [`IO`](./task.md) monad exported at the root. `domIO`'s ops *return* `IO` values.

## Why lazy?

Because each op both **takes** and (through the `IO`) **yields** the element, ops
chain cleanly off a `query` source with `IO.chain` — nothing runs until `.run()`:

```javascript
const { query, addClass, setText, setAttr } = domIO;

const program = query('#save')
  .chain(addClass('is-active'))     // (el) => IO<el>
  .chain(setText('Saved'))
  .chain(setAttr('data-state', 'done'));

// `program` is a description. No DOM has been touched yet.
program.run();                      // effects happen here, once
```

Every op is **null-safe**: if the element is `null`/`undefined` (e.g. `query`
matched nothing), the effect is skipped and the `IO` yields the same nullish
value — a chain never throws.

```javascript
query('#does-not-exist')
  .chain(addClass('x'))
  .chain(setText('y'))
  .run();                           // no-op, returns null, no throw
```

## API Reference

### Sources

| Method | Returns | Description |
|--------|---------|-------------|
| `domIO.query(selector, parent?)` | `IO<Element \| null>` | Pure single-element query — the head of a chain. |
| `domIO.queryAll(selector, parent?)` | `IO<Element[]>` | Pure multi-element query. |

### Operations — each is `(element) => IO<element>`

| Method | Effect |
|--------|--------|
| `domIO.addClass(className)` | `el.classList.add` |
| `domIO.removeClass(className)` | `el.classList.remove` |
| `domIO.toggleClass(className, force?)` | `el.classList.toggle` |
| `domIO.setStyle(property, value)` | `el.style[property] = value` |
| `domIO.setHtml(html)` | `el.innerHTML = html` |
| `domIO.setText(text)` | `el.textContent = text` |
| `domIO.setAttr(name, value)` | `el.setAttribute` |
| `domIO.removeAttr(name)` | `el.removeAttribute` |
| `domIO.remove()` | `el.remove()` |

### `create(tag, props?, children?) → IO<Element>`

Constructs an element functionally, as a pure `IO<Element>` — nothing is created
until `.run()`. `props` is applied intelligently:

| `props` key | Behavior |
|-------------|----------|
| `class` / `className` | sets `el.className` |
| `style` (object) | merged into `el.style` |
| `dataset` (object) | merged into `el.dataset` |
| `text` / `textContent` | sets `el.textContent` |
| `html` / `innerHTML` | sets `el.innerHTML` |
| `onClick`, `onInput`, … (function) | `addEventListener('click', …)` |
| `true` | boolean attribute set to `""` |
| `false` / `null` / `undefined` | attribute skipped |
| anything else | `setAttribute(key, value)` |

`children` may be a single string/`Node` or an array of them; nullish/`false`
children are skipped.

```javascript
const button = create('button',
  { class: 'btn', 'aria-pressed': false, onClick: () => save() },
  ['Save']
);

document.body.append(button.run());
```

## Real-World Examples

### Build a component tree, run once

```javascript
import { create } from '@efthemiosprime/polyx';

const card = create('article', { class: 'card' }, [
  create('h3', { text: title }).run(),
  create('p', { text: body }).run(),
  create('a', { class: 'more', href: url, text: 'Read more' }).run(),
]);

container.append(card.run());
```

### Eager vs pure — the same update

```javascript
// Eager (utils.js): mutates as you build, returns Maybe<Element>
import { addClass, setText } from '@efthemiosprime/polyx';
const btn = document.querySelector('#save');
addClass('is-active')(btn);
setText('Saved')(btn);

// Pure (domIO): one composed program, effects run at the edge
import { domIO } from '@efthemiosprime/polyx';
const { query, addClass, setText } = domIO;
query('#save').chain(addClass('is-active')).chain(setText('Saved')).run();
```

Reach for `domIO` when you want effects to be values you can compose, defer, test,
or run conditionally; reach for the eager helpers for quick, one-off mutations.
