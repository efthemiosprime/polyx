import { describe, it, expect, vi } from 'vitest';
import { Maybe } from './maybe.js';

describe('Maybe', () => {
  it('flags null/undefined as Nothing', () => {
    expect(Maybe.of(null).isNothing).toBe(true);
    expect(Maybe.of(undefined).isNothing).toBe(true);
    expect(Maybe.of(0).isNothing).toBe(false);
    expect(Maybe.of('').isNothing).toBe(false);
  });

  describe('map', () => {
    it('applies fn over a Just', () => {
      expect(Maybe.of(5).map((x) => x + 1).value).toBe(6);
    });

    it('skips fn over a Nothing', () => {
      const fn = vi.fn((x) => x + 1);
      expect(Maybe.of(null).map(fn).value).toBe(null);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('flatMap / chain', () => {
    it('flattens the returned Maybe', () => {
      expect(Maybe.of(5).flatMap((x) => Maybe.of(x * 2)).value).toBe(10);
      expect(Maybe.of(5).chain((x) => Maybe.of(x * 2)).value).toBe(10);
    });

    it('short-circuits on Nothing', () => {
      const fn = vi.fn((x) => Maybe.of(x));
      Maybe.of(null).flatMap(fn);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('filter', () => {
    it('keeps values passing the predicate', () => {
      expect(Maybe.of(4).filter((x) => x % 2 === 0).value).toBe(4);
    });

    it('drops values failing the predicate to Nothing', () => {
      expect(Maybe.of(5).filter((x) => x % 2 === 0).isNothing).toBe(true);
    });

    it('stays Nothing for Nothing', () => {
      expect(Maybe.of(null).filter(() => true).isNothing).toBe(true);
    });
  });

  describe('tap', () => {
    it('runs on Just and returns an equivalent Maybe', () => {
      const spy = vi.fn();
      expect(Maybe.of(3).tap(spy).value).toBe(3);
      expect(spy).toHaveBeenCalledWith(3);
    });

    it('does not run on Nothing', () => {
      const spy = vi.fn();
      Maybe.of(null).tap(spy);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('getOrElse', () => {
    it('returns the value for a Just', () => {
      expect(Maybe.of(3).getOrElse(99)).toBe(3);
    });

    it('returns the default for a Nothing', () => {
      expect(Maybe.of(null).getOrElse(99)).toBe(99);
    });
  });

  describe('functor law: identity', () => {
    it('map(id) does not change the value', () => {
      const id = (x) => x;
      expect(Maybe.of(5).map(id).value).toBe(Maybe.of(5).value);
    });
  });
});
