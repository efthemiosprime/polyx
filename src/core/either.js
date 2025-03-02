export const Either = {
    Left: x => ({
      isLeft: true,
      isRight: false,
      value: x,
      map: _ => Either.Left(x),
      flatMap: _ => Either.Left(x),
      fold: (f, _) => f(x),
      getOrElse: defaultValue => defaultValue
    }),
    
    Right: x => ({
      isLeft: false,
      isRight: true,
      value: x,
      map: f => Either.Right(f(x)),
      flatMap: f => f(x),
      fold: (_, g) => g(x),
      getOrElse: _ => x
    }),
    
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