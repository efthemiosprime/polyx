// functor
export const ArrayTransform = {
    // Snapshot the source ONCE at construction. Re-reading `source` on every call
    // meant a live collection (el.children, getElementsByTagName/ClassName) was
    // re-queried each time, so results changed if the DOM mutated. Working from a
    // single `value` snapshot keeps the wrapper stable and consistent.
    from: source => {
      const value = Array.from(source);
      return {
        value,
        map: fn => ArrayTransform.from(value.map(fn)),
        filter: fn => ArrayTransform.from(value.filter(fn)),
        forEach: fn => { value.forEach(fn); return ArrayTransform.from(value); },
        toSet: () => new Set(value),
        toArray: () => value.slice()
      };
    }
};
  