export const Either = {
    Left: x => ({
      isLeft: true,
      isRight: false,
      value: x,
      map: _ => Either.Left(x),
      flatMap: _ => Either.Left(x),
      chain: _ => Either.Left(x),
      // Transform the error side; the success side is untouched.
      mapLeft: f => Either.Left(f(x)),
      bimap: (f, _) => Either.Left(f(x)),
      // Side effect on a Right value only — a Left is a no-op.
      tap: _ => Either.Left(x),
      // Applicative apply: a Left short-circuits.
      ap: _ => Either.Left(x),
      // Recover from a Left by returning a new Either.
      orElse: f => f(x),
      fold: (f, _) => f(x),
      getOrElse: defaultValue => defaultValue
    }),

    Right: x => ({
      isLeft: false,
      isRight: true,
      value: x,
      map: f => Either.Right(f(x)),
      flatMap: f => f(x),
      chain: f => f(x),
      mapLeft: _ => Either.Right(x),
      bimap: (_, g) => Either.Right(g(x)),
      tap: f => { f(x); return Either.Right(x); },
      // `x` is expected to be a function; apply it to the other Either's value.
      ap: other => other.map(x),
      orElse: _ => Either.Right(x),
      fold: (_, g) => g(x),
      getOrElse: _ => x
    }),

    // Applicative pure: lift a value into the success side.
    of: x => Either.Right(x),

    // specifically handles null/undefined checks
    fromNullable: x => x != null ? Either.Right(x) : Either.Left(null),

    // is for capturing exceptions from functions that might throw
    tryCatch: (f) => {
      try {
        return Either.Right(f());
      } catch (e) {
        return Either.Left(e);
      }
    },

    // handles any boolean condition
    fromCondition: (condition, leftValue, rightValue) => {
      // If leftValue and rightValue are not provided, use null as default
      const left = leftValue !== undefined ? leftValue : null;
      const right = rightValue !== undefined ? rightValue : null;

      return condition ? Either.Right(right) : Either.Left(left);
    }
  };
