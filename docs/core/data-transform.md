# Structural Transforms (unflatten / pick / omit / mergeDeep)

## Overview

Object-shaping helpers that complement the path/lens tools: rebuild nested data
from flat keys, select or drop keys, and deep-merge — all **immutably**, sharing
untouched subtrees.

```javascript
import { unflatten, pick, omit, mergeDeep, mergeDeepWith } from '@efthemiosprime/polyx';
// or the subpath: '@efthemiosprime/polyx/data'
```

## API Reference

### `unflatten(map, delimiter = '.')`

The inverse of [`flatten`](../data-roadmap.md): rebuild a nested structure from a
flat, delimited-key map. Numeric segments become array indices (matching `setPath`).

```javascript
unflatten({ 'a.b.c': 1, 'a.d': 2 });        // { a: { b: { c: 1 }, d: 2 } }
unflatten({ 'list.0.id': 7, 'list.1.id': 8 }); // { list: [ { id: 7 }, { id: 8 } ] }
unflatten({ 'a/b': 1 }, '/');               // { a: { b: 1 } }

// Round-trips with flatten for plain nested objects:
unflatten(flatten(obj));                    // ≡ obj
```

### `pick(keys) → (obj) => obj'`

Immutably keep only the listed keys that exist on the object.

```javascript
pick(['a', 'b'])({ a: 1, b: 2, c: 3 });     // { a: 1, b: 2 }
pick(['a', 'x'])({ a: 1 });                 // { a: 1 } (absent keys ignored)
```

### `omit(keys) → (obj) => obj'`

Immutably drop the listed keys, keeping everything else.

```javascript
omit(['password'])({ id: 1, password: 'x', name: 'a' }); // { id: 1, name: 'a' }
```

### `mergeDeep(a, b)`

Immutably deep-merge two objects; the **right side wins** any conflict. Nested
objects are merged recursively; arrays and scalars from `b` replace those in `a`.
Untouched subtrees of `a` are shared by reference.

```javascript
mergeDeep(
  { user: { name: 'x', age: 1 }, keep: 1 },
  { user: { age: 2 }, extra: 3 }
);
// { user: { name: 'x', age: 2 }, keep: 1, extra: 3 }

mergeDeep({ list: [1, 2] }, { list: [3] });  // { list: [3] } — arrays replace
```

### `mergeDeepWith(fn, a, b)`

Like `mergeDeep`, but conflicting **leaves** are combined with `fn(aVal, bVal)`
(objects are still merged recursively). Use it to sum, concat, or otherwise
reconcile values instead of overwriting.

```javascript
const sumOrConcat = (l, r) =>
  Array.isArray(l) && Array.isArray(r) ? [...l, ...r] : l + r;

mergeDeepWith(sumOrConcat,
  { count: 1, tags: ['x'] },
  { count: 2, tags: ['y'] }
);
// { count: 3, tags: ['x', 'y'] }
```

## Real-World Examples

### Merge API response over defaults

```javascript
import { mergeDeep } from '@efthemiosprime/polyx';

const defaults = { theme: 'light', layout: { sidebar: true, width: 240 } };
const fromServer = { layout: { width: 320 } };

mergeDeep(defaults, fromServer);
// { theme: 'light', layout: { sidebar: true, width: 320 } }
```

### Shape an object for an API payload

```javascript
import { pipe } from '@efthemiosprime/polyx';
import { pick, omit } from '@efthemiosprime/polyx';

const toPublicUser = pipe(
  omit(['password', 'internalId']),
  // ...further transforms
);
```
