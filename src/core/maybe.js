// In your Maybe implementation (e.g., src/core/maybe.js)
// NOTE: Maybe <-> Either interop makes this a circular import with either.js.
// That is safe here because `Either` is only referenced inside method bodies
// (call-time), never at module-evaluation time.
import { Either } from './either.js';

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

    // Lazy getOrElse: the thunk runs only for a Nothing.
    getOrElseGet: fn => value === null || value === undefined ? fn() : value,

    // Convert to an Either: Nothing -> Left(leftValue), Just -> Right(value).
    toEither: leftValue =>
      value === null || value === undefined ? Either.Left(leftValue) : Either.Right(value),

    chain(fn) { return this.flatMap(fn); },

    // Collapse the Maybe: run onNothing() for Nothing, onJust(value) for a value.
    fold: (onNothing, onJust) =>
      value === null || value === undefined ? onNothing() : onJust(value),

    // Return an alternative Maybe (from a thunk) when this is Nothing.
    orElse: fn => value === null || value === undefined ? fn() : Maybe.of(value),

    // Applicative apply: `value` is expected to be a function; apply it to the
    // other Maybe. Nothing short-circuits.
    ap: other => value === null || value === undefined ? Maybe.of(value) : other.map(value)
  })
};