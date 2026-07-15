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
  chain: fn => wrap(value.flatMap(fn)), // alias for flatMap (monadic naming)
  forEach: fn => { value.forEach(fn); return wrap(value); },
  take: n => wrap(value.slice(0, n)),
  drop: n => wrap(value.slice(n)),
  // Remove duplicates (by identity, or by a derived key), preserving first-seen order.
  unique: keyFn => {
    const seen = new Set();
    const out = [];
    for (const item of value) {
      const key = keyFn ? keyFn(item) : item;
      if (!seen.has(key)) { seen.add(key); out.push(item); }
    }
    return wrap(out);
  },
  // Terminal reductions/queries.
  reduce: (fn, ...initial) => value.reduce(fn, ...initial),
  // Group items into an object keyed by fn(item) (keys are stringified). Uses a
  // null-prototype object so keys like 'toString'/'__proto__' can't collide with
  // Object.prototype members.
  groupBy: fn => value.reduce((acc, item) => {
    const key = fn(item);
    (acc[key] = acc[key] || []).push(item);
    return acc;
  }, Object.create(null)),
  // Split into [pass, fail] based on a predicate.
  partition: pred => {
    const pass = [];
    const fail = [];
    for (const item of value) (pred(item) ? pass : fail).push(item);
    return [pass, fail];
  },
  // Return a Maybe so a miss is an explicit Nothing, not a bare undefined.
  find: fn => Maybe.of(value.find(fn)),
  head: () => Maybe.of(value[0]),
  last: () => Maybe.of(value[value.length - 1]),
  some: fn => value.some(fn),
  every: fn => value.every(fn),
  isEmpty: () => value.length === 0,
  toSet: () => new Set(value),
  toArray: () => value.slice()
});

export const ArrayTransform = {
    // Snapshot the source ONCE at construction. Re-reading `source` on every call
    // meant a live collection (el.children, getElementsByTagName/ClassName) was
    // re-queried each time, so results changed if the DOM mutated. Working from a
    // single `value` snapshot keeps the wrapper stable and consistent.
    from: source => wrap(Array.from(source)),
    // Applicative pure: lift a single value into an ArrayTransform.
    of: x => wrap([x])
};
