// functor
import { Maybe } from './maybe.js';

export const ArrayTransform = {
    // Snapshot the source ONCE at construction. Re-reading `source` on every call
    // meant a live collection (el.children, getElementsByTagName/ClassName) was
    // re-queried each time, so results changed if the DOM mutated. Working from a
    // single `value` snapshot keeps the wrapper stable and consistent.
    from: source => {
      const value = Array.from(source);
      return {
        value,
        // Chainable transforms (return a new ArrayTransform).
        map: fn => ArrayTransform.from(value.map(fn)),
        filter: fn => ArrayTransform.from(value.filter(fn)),
        flatMap: fn => ArrayTransform.from(value.flatMap(fn)),
        forEach: fn => { value.forEach(fn); return ArrayTransform.from(value); },
        // Terminal reductions/queries.
        reduce: (fn, ...initial) => value.reduce(fn, ...initial),
        // Return a Maybe so a miss is an explicit Nothing, not a bare undefined.
        find: fn => Maybe.of(value.find(fn)),
        head: () => Maybe.of(value[0]),
        some: fn => value.some(fn),
        every: fn => value.every(fn),
        toSet: () => new Set(value),
        toArray: () => value.slice()
      };
    }
};
  