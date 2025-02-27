// functor
export const ArrayTransform = {
    from: arr => ({
      value: Array.from(arr),
      map: fn => ArrayTransform.from(Array.from(arr).map(fn)),
      forEach: fn => { Array.from(arr).forEach(fn); return ArrayTransform.from(arr); },
      toSet: () => new Set(Array.from(arr)),
      toArray: () => Array.from(arr)
    })
  };
  