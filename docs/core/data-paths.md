# Immutable Nested Updates (setPath / updatePath / dissocPath)

## Overview

`getPath` lets you *read* deep into nested data. These helpers are the **write**
counterparts — they change nested data **immutably**, returning a new structure
with **structural sharing**: only the nodes along the touched path are cloned;
untouched subtrees are reused by reference. No mutation, no deep clone, no lodash.

Every function is **curried, data-last** (so it drops into `pipe`/`compose`), and
takes a path as either a dot-string (`'a.b.0'`) or a key array (`['a', 'b', 0]`).

```javascript
import { setPath, updatePath, dissocPath, getPathMaybe } from '@efthemiosprime/polyx';
// or the subpath: '@efthemiosprime/polyx/data'
```

> **Literal, no magic.** Unlike `path`/`getPath`, these do **not** auto-unwrap REST
> `data`/`attributes` envelopes — writing "through" an implicit unwrap is ambiguous.
> The write API stays explicit and general.

## API Reference

### `setPath(path, value) → (obj) => obj'`

Immutably set `value` at `path`, creating missing intermediates — an **array** for
a numeric segment, an **object** otherwise. An empty path replaces the whole value.

```javascript
setPath('a.b.c', 42)({ a: { b: { c: 1 } } });   // { a: { b: { c: 42 } } }
setPath('list.0.id', 7)({});                     // { list: [ { id: 7 } ] }

const obj = { a: { b: 1 }, keep: { deep: {} } };
const next = setPath('a.b', 2)(obj);
next.keep === obj.keep;   // true  — sibling subtree shared
next.a   === obj.a;       // false — touched path cloned
```

### `updatePath(path, fn) → (obj) => obj'`

Immutably update the value at `path` by applying `fn` to the current value (which
is `undefined` when the path doesn't yet exist).

```javascript
updatePath('count', (n) => n + 1)({ count: 4 });     // { count: 5 }
updatePath('items', (xs = []) => [...xs, 'new'])({}); // { items: ['new'] }
```

### `dissocPath(path) → (obj) => obj'`

Immutably remove the value at `path`. Object keys are omitted; array elements are
removed with **splice** semantics (the array is compacted). A path that doesn't
exist is a no-op that returns the original reference.

```javascript
dissocPath('a.b')({ a: { b: 1, c: 2 } });   // { a: { c: 2 } }
dissocPath('list.1')({ list: [10, 20, 30] }); // { list: [10, 30] }
```

### `getPathMaybe(path) → (obj) => Maybe`

Read the value at `path` as a [`Maybe`](./maybe.md) — `Just(value)` when present,
`Nothing` when any segment is missing. Literal traversal (no unwrapping), so it
composes with the rest of the core.

```javascript
getPathMaybe('a.b')({ a: { b: 7 } }).getOrElse(0);   // 7
getPathMaybe('a.x')({ a: { b: 7 } }).getOrElse(0);   // 0 (Nothing)
```

### `getPathOr(default, path) → (obj) => value`

Literal read that returns `default` **only** when the path is truly absent
(resolves to `undefined`). Unlike `getPathMaybe`, a stored `null` is preserved —
so this is the correct reader for round-tripping values, and the getter that backs
[`lensPath`](./lenses.md).

```javascript
getPathOr(0, 'a.b')({ a: { b: 7 } });      // 7
getPathOr(0, 'a.x')({ a: { b: 7 } });      // 0   (absent → default)
getPathOr(0, 'a.b')({ a: { b: null } });   // null (present null preserved)
```

## Reading with `getPath` / `path` / `makePath`

Alongside the literal readers above, the module ships **envelope-tolerant** readers
that auto-unwrap common REST wrappers (`data` / `attributes`), which is handy for
Strapi/JSON:API responses. These are reads only — the immutable writers above stay
literal on purpose.

### `getPath(path) → (obj) => value`

Curried deep read. Auto-traverses `data`/`attributes` envelopes, so a short path
resolves through the wrapping transparently.

```javascript
import { getPath } from '@efthemiosprime/polyx';

const res = { data: { blog: { data: { attributes: { title: 'Hi' } } } } };
getPath('blog.title')(res);                 // 'Hi'  (envelopes skipped)
getPath('blog.data.attributes.title')(res); // 'Hi'  (explicit also works)
getPath('missing')(res);                    // undefined
```

### `path(obj)` — accessor object

Wraps an object with chainable accessors: `get(path, default?)`, `has(path)`,
`getAll(path)` (map a path over an array of items), and `prop(path)` (a reusable
extractor).

```javascript
import { path } from '@efthemiosprime/polyx';

const p = path({ user: { name: 'Ada' } });
p.get('user.name');            // 'Ada'
p.get('user.age', 0);          // 0 (default)
p.has('user.name');            // true
p.prop('user.name');           // reusable extractor: (obj) => obj's user.name
```

### `makePath(...parts) → string`

Builds a dot-path from parts, skipping falsy segments — useful for dynamic paths.

```javascript
import { makePath } from '@efthemiosprime/polyx';
makePath('user', condition && 'profile', 'name'); // 'user.name' when falsy dropped
```

## Real-World Examples

### Point-free updates in a pipeline

```javascript
import { pipe } from '@efthemiosprime/polyx';
import { setPath, updatePath } from '@efthemiosprime/polyx';

const applyDiscount = pipe(
  setPath('meta.updatedAt', Date.now()),
  updatePath('price', (p) => p * 0.9)
);

applyDiscount({ price: 100, meta: {} });
// { price: 90, meta: { updatedAt: … } }
```

### Immutable reducer-style state update

```javascript
import { updatePath } from '@efthemiosprime/polyx';

const addTodo = (text) =>
  updatePath('todos', (todos = []) => [...todos, { text, done: false }]);

const toggleFirst = updatePath(['todos', 0, 'done'], (d) => !d);

const s1 = addTodo('write docs')({ todos: [] });
const s2 = toggleFirst(s1);   // s1 untouched
```

### Safe read → compute → write

```javascript
import { getPathMaybe, setPath } from '@efthemiosprime/polyx';

const bumpVersion = (obj) =>
  setPath('version', getPathMaybe('version')(obj).getOrElse(0) + 1)(obj);
```

## Relationship to `getPath`

| Need | Use |
|------|-----|
| Read, tolerant of REST `data`/`attributes` envelopes | `getPath` / `path().get` |
| Read literally as a `Maybe` | `getPathMaybe` |
| Read literally with a default (null-preserving) | `getPathOr` |
| Set / update / remove immutably | `setPath` / `updatePath` / `dissocPath` |
| A reusable, composable focus | [lenses](./lenses.md) |
