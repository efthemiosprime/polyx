import { describe, it, expect, vi } from 'vitest';
import { ArrayTransform } from './arrayTransform.js';

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
