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
});
