// Validation — like Either, but its applicative `ap` ACCUMULATES errors instead
// of short-circuiting. Use it to collect *all* failures (e.g. every invalid form
// field) rather than stopping at the first. Failures carry an array of errors
// (the semigroup combined via array concat).
//
// Validation is an applicative functor, NOT a monad: there is deliberately no
// `chain`/`flatMap`, because monadic sequencing would have to short-circuit and
// couldn't accumulate. Reach for `Either` when you want short-circuiting.
import { Either } from './either.js';

export const Validation = {
  Success: value => ({
    isSuccess: true,
    isFailure: false,
    value,
    map: fn => Validation.Success(fn(value)),
    mapFailure: _ => Validation.Success(value),
    bimap: (_, onSuccess) => Validation.Success(onSuccess(value)),
    // `value` is expected to be a function; apply it to the other Validation.
    ap: other => other.map(value),
    fold: (_, onSuccess) => onSuccess(value),
    getOrElse: _ => value,
    toEither: () => Either.Right(value)
  }),

  Failure: errors => ({
    isSuccess: false,
    isFailure: true,
    value: errors,
    map: _ => Validation.Failure(errors),
    mapFailure: fn => Validation.Failure(fn(errors)),
    bimap: (onFailure, _) => Validation.Failure(onFailure(errors)),
    // Accumulate when the other side is also a Failure; otherwise keep these errors.
    ap: other =>
      other.isFailure
        ? Validation.Failure(errors.concat(other.value))
        : Validation.Failure(errors),
    fold: (onFailure, _) => onFailure(errors),
    getOrElse: defaultValue => defaultValue,
    toEither: () => Either.Left(errors)
  }),

  // Applicative pure.
  of: value => Validation.Success(value),

  // Lift a single error into a Failure (wraps it in the errors array).
  fail: error => Validation.Failure([error]),

  // Interop: Right -> Success, Left -> Failure (a non-array Left is wrapped).
  fromEither: either =>
    either.fold(
      left => Validation.Failure(Array.isArray(left) ? left : [left]),
      right => Validation.Success(right)
    )
};
