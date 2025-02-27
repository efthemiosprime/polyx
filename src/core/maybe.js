export const Maybe = {
    of: value => ({
      value,
      isNothing: value === null || value === undefined,
      map: fn => Maybe.of(value === null || value === undefined ? value : fn(value)),
      flatMap: fn => value === null || value === undefined ? Maybe.of(value) : fn(value),
      getOrElse: defaultValue => value === null || value === undefined ? defaultValue : value,
      chain(fn) { return this.flatMap(fn); }
    })
  };