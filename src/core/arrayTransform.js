// functor
import { Maybe } from './maybe.js';

// Build a wrapper around an array we already own — no defensive copy. `map`,
// `filter` and `flatMap` already return a fresh array, so re-copying it (as
// `from` does) would allocate twice per operation. `wrap` skips that; `from` is
// the only boundary that copies (once), to snapshot an arbitrary/live source.
const wrap = value => ({
  value,
  // Chainable transforms (return a new ArrayTransform).
  map: fn => wrap(value.map(fn)),
  filter: fn => wrap(value.filter(fn)),
  flatMap: fn => wrap(value.flatMap(fn)),
  forEach: fn => { value.forEach(fn); return wrap(value); },
  // Terminal reductions/queries.
  reduce: (fn, ...initial) => value.reduce(fn, ...initial),
  // Return a Maybe so a miss is an explicit Nothing, not a bare undefined.
  find: fn => Maybe.of(value.find(fn)),
  head: () => Maybe.of(value[0]),
  some: fn => value.some(fn),
  every: fn => value.every(fn),
  toSet: () => new Set(value),
  toArray: () => value.slice()
});

export const ArrayTransform = {
    // Snapshot the source ONCE at construction. Re-reading `source` on every call
    // meant a live collection (el.children, getElementsByTagName/ClassName) was
    // re-queried each time, so results changed if the DOM mutated. Working from a
    // single `value` snapshot keeps the wrapper stable and consistent.
    from: source => wrap(Array.from(source))
};
