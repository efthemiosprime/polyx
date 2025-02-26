export const ArrayFunctor = {
    from: arr => ({
      value: Array.from(arr),
      map: fn => ArrayFunctor.from(Array.from(arr).map(fn)),
      forEach: fn => { Array.from(arr).forEach(fn); return ArrayFunctor.from(arr); },
      toSet: () => new Set(Array.from(arr)),
      toArray: () => Array.from(arr)
    })
  };
  