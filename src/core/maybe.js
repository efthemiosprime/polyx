// In your Maybe implementation (e.g., src/core/maybe.js)
export const Maybe = {
  of: value => ({
    value,
    isNothing: value === null || value === undefined,
    
    // Add filter method to Maybe
    filter: predicate => {
      if (value === null || value === undefined) {
        return Maybe.of(value); // Return Nothing for Nothing
      }
      // If the predicate is true, return the value, otherwise return Nothing
      return predicate(value) ? Maybe.of(value) : Maybe.of(null);
    },
    
    // You already have tap method for debugging
    tap: fn => {
      if (value !== null && value !== undefined) {
        fn(value);
      }
      return Maybe.of(value);
    },
    
    map: fn => Maybe.of(value === null || value === undefined ? value : fn(value)),
    flatMap: fn => value === null || value === undefined ? Maybe.of(value) : fn(value),
    getOrElse: defaultValue => value === null || value === undefined ? defaultValue : value,
    chain(fn) { return this.flatMap(fn); }
  })
};