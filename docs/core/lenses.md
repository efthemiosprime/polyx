# Lenses

## Overview

A **lens** is a composable *optic* — a first-class value that bundles a **getter**
and an immutable **setter** for one focus inside a larger structure. Where
`setPath`/`getPathMaybe` are standalone functions, a lens packages both halves
together so they **compose**: focus through an outer lens, then an inner one, to
reach arbitrarily deep — and `view` / `set` / `over` work identically at any depth.

Built on the immutable path writers, so every update shares structure (untouched
subtrees are reused by reference).

```javascript
import { lensPath, view, set, over, composeLens, lensProp, lensIndex } from '@efthemiosprime/polyx';
// or the subpath: '@efthemiosprime/polyx/data'
```

## The shape of a lens

A lens is a `{ get, set }` pair:

- `get :: (s) => a` — read the focus `a` out of the whole `s`
- `set :: (a, s) => s` — return a **new** whole with the focus replaced

You rarely call those directly — you use the three operators:

| Operator | Meaning |
|----------|---------|
| `view(lens)(obj)` | read the focus |
| `set(lens, value)(obj)` | immutably replace the focus |
| `over(lens, fn)(obj)` | immutably transform the focus with `fn` |

All curried data-last, so they drop into `pipe`/`compose`.

## Building lenses

| Constructor | Focuses |
|-------------|---------|
| `lensProp(key)` | a single property |
| `lensIndex(i)` | an array element |
| `lensPath(path)` | a nested path (dot-string or key array) |
| `lens(getter, setter)` | anything — a custom optic |

```javascript
view(lensProp('name'))({ name: 'Ada' });          // 'Ada'
set(lensIndex(1), 99)([10, 20, 30]);               // [10, 99, 30]
over(lensPath('a.b.c'), (n) => n * 10)({ a: { b: { c: 1 } } });
// { a: { b: { c: 10 } } }

// A custom lens onto the head of a list:
const head = lens((xs) => xs[0], (v, xs) => [v, ...xs.slice(1)]);
set(head, 9)([1, 2, 3]);                           // [9, 2, 3]
```

## Composition

`composeLens(outer, inner, …)` focuses **left-to-right** — through `outer`, then
`inner`. Reading walks inward; writing rebuilds outward, immutably.

```javascript
const firstItemId = composeLens(lensProp('list'), lensIndex(0), lensProp('id'));

view(firstItemId)({ list: [{ id: 1 }] });          // 1
set(firstItemId, 42)({ list: [{ id: 1 }] });       // { list: [ { id: 42 } ] }
```

## Lens laws

The constructors satisfy the three lens laws (verified with property-based tests):

1. **set-get** — `view(l)(set(l, a)(s)) === a` (you read back what you set)
2. **get-set** — `set(l, view(l)(s))(s)` deep-equals `s` (setting what you got is a no-op)
3. **set-set** — the last `set` wins

> Because a lens getter must round-trip values faithfully, `lensPath` reads
> **literally** (via `getPathOr`), preserving a stored `null` — it does not treat
> `null` as "absent" the way `getPathMaybe` does.

## Real-World Examples

### Point-free deep update in a pipeline

```javascript
import { pipe } from '@efthemiosprime/polyx';
import { over, set, lensPath } from '@efthemiosprime/polyx';

const normalizeUser = pipe(
  over(lensPath('user.name'), (s) => s.trim()),
  set(lensPath('user.active'), true)
);

normalizeUser({ user: { name: '  Ada  ', active: false } });
// { user: { name: 'Ada', active: true } }
```

### Reusable, composable focus

```javascript
import { composeLens, lensProp, over } from '@efthemiosprime/polyx';

const settingsTheme = composeLens(lensProp('settings'), lensProp('theme'));

const toDark = over(settingsTheme, () => 'dark');
toDark({ settings: { theme: 'light', lang: 'en' } });
// { settings: { theme: 'dark', lang: 'en' } }
```

## When to use what

| Need | Use |
|------|-----|
| One-off immutable set/update at a path | [`setPath` / `updatePath`](./data-paths.md) |
| A **reusable, composable** focus used in many places | a lens |
| Read as a `Maybe` | [`getPathMaybe`](./data-paths.md) |
