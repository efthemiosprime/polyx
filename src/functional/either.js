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
    
    fromNullable: x => x != null ? Either.Right(x) : Either.Left(null),
    
    tryCatch: (f) => {
      try {
        return Either.Right(f());
      } catch (e) {
        return Either.Left(e);
      }
    }
  };