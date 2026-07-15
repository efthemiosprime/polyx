import { describe, it, expect, vi } from 'vitest';
import { ArrayTransform } from './arrayTransform.js';

describe('ArrayTransform.of / chain', () => {
  it('of wraps a single element', () => {
    expect(ArrayTransform.of(5).toArray()).toEqual([5]);
  });
  it('chain is an alias for flatMap', () => {
    expect(ArrayTransform.from([1, 2]).chain(x => [x, x * 10]).toArray())
      .toEqual([1, 10, 2, 20]);
  });
});

describe('ArrayTransform collection ops', () => {
  it('groupBy groups items by a key function', () => {
    const grouped = ArrayTransform.from([1, 2, 3, 4, 5])
      .groupBy(n => (n % 2 === 0 ? 'even' : 'odd'));
    expect(grouped).toEqual({ odd: [1, 3, 5], even: [2, 4] });
  });

  it('partition splits into [pass, fail]', () => {
    const [pass, fail] = ArrayTransform.from([1, 2, 3, 4])
      .partition(n => n % 2 === 0);
    expect(pass).toEqual([2, 4]);
    expect(fail).toEqual([1, 3]);
  });

  it('unique removes duplicates preserving order', () => {
    expect(ArrayTransform.from([1, 1, 2, 3, 3, 2]).unique().toArray())
      .toEqual([1, 2, 3]);
  });

  it('unique(keyFn) dedupes by a derived key', () => {
    const rows = [{ id: 1 }, { id: 2 }, { id: 1 }];
    expect(ArrayTransform.from(rows).unique(r => r.id).toArray())
      .toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('take / drop slice the collection (chainable)', () => {
    expect(ArrayTransform.from([1, 2, 3, 4, 5]).take(2).toArray()).toEqual([1, 2]);
    expect(ArrayTransform.from([1, 2, 3, 4, 5]).drop(2).toArray()).toEqual([3, 4, 5]);
  });

  it('last returns the final element as a Maybe', () => {
    expect(ArrayTransform.from([9, 8, 7]).last().value).toBe(7);
    expect(ArrayTransform.from([]).last().isNothing).toBe(true);
  });

  it('isEmpty reports whether the collection has elements', () => {
    expect(ArrayTransform.from([]).isEmpty()).toBe(true);
    expect(ArrayTransform.from([1]).isEmpty()).toBe(false);
  });
});

describe('ArrayTransform', () => {
  it('maps over the array', () => {
    expect(ArrayTransform.from([1, 2, 3]).map((x) => x * 2).toArray()).toEqual([2, 4, 6]);
  });

  it('filters the array', () => {
    expect(ArrayTransform.from([1, 2, 3, 4]).filter((x) => x % 2 === 0).toArray()).toEqual([2, 4]);
  });

  it('chains map and filter', () => {
    const result = ArrayTransform.from([1, 2, 3, 4])
      .map((x) => x + 1)
      .filter((x) => x > 3)
      .toArray();
    expect(result).toEqual([4, 5]);
  });

  it('forEach runs the callback and returns a transform for chaining', () => {
    const spy = vi.fn();
    const result = ArrayTransform.from([1, 2]).forEach(spy);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(result.toArray()).toEqual([1, 2]);
  });

  it('toSet deduplicates', () => {
    const set = ArrayTransform.from([1, 1, 2, 3, 3]).toSet();
    expect(set).toBeInstanceOf(Set);
    expect([...set]).toEqual([1, 2, 3]);
  });

  it('accepts any iterable via Array.from', () => {
    expect(ArrayTransform.from(new Set([1, 2, 2, 3])).toArray()).toEqual([1, 2, 3]);
  });

  describe('reduce', () => {
    it('folds with an initial value', () => {
      expect(ArrayTransform.from([1, 2, 3, 4]).reduce((acc, x) => acc + x, 0)).toBe(10);
    });
    it('folds without an initial value', () => {
      expect(ArrayTransform.from([1, 2, 3, 4]).reduce((acc, x) => acc + x)).toBe(10);
    });
  });

  describe('flatMap', () => {
    it('maps and flattens one level, chainably', () => {
      const result = ArrayTransform.from([1, 2, 3])
        .flatMap((x) => [x, x * 10])
        .toArray();
      expect(result).toEqual([1, 10, 2, 20, 3, 30]);
    });
  });

  describe('find', () => {
    it('returns a Just of the first match', () => {
      const found = ArrayTransform.from([1, 2, 3, 4]).find((x) => x > 2);
      expect(found.isNothing).toBe(false);
      expect(found.value).toBe(3);
    });
    it('returns Nothing when there is no match', () => {
      expect(ArrayTransform.from([1, 2]).find((x) => x > 5).isNothing).toBe(true);
    });
  });

  describe('head', () => {
    it('returns a Just of the first element', () => {
      expect(ArrayTransform.from([9, 8, 7]).head().value).toBe(9);
    });
    it('returns Nothing for an empty collection', () => {
      expect(ArrayTransform.from([]).head().isNothing).toBe(true);
    });
  });

  describe('some / every', () => {
    it('some checks any element', () => {
      expect(ArrayTransform.from([1, 2, 3]).some((x) => x === 2)).toBe(true);
      expect(ArrayTransform.from([1, 2, 3]).some((x) => x === 9)).toBe(false);
    });
    it('every checks all elements', () => {
      expect(ArrayTransform.from([2, 4, 6]).every((x) => x % 2 === 0)).toBe(true);
      expect(ArrayTransform.from([2, 3, 6]).every((x) => x % 2 === 0)).toBe(false);
    });
  });
});
