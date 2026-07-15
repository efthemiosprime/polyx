import { describe, it, expect, vi } from 'vitest';
import { compose, pipe, curry, tap, when, ifElse, evolve } from './compose.js';

const double = (x) => x * 2;
const addOne = (x) => x + 1;

describe('compose', () => {
  it('composes right-to-left', () => {
    expect(compose(addOne, double)(5)).toBe(11);
  });

  it('returns identity for no functions', () => {
    expect(compose()(42)).toBe(42);
  });

  it('returns the single function unchanged', () => {
    expect(compose(double)(5)).toBe(10);
  });

  it('passes multiple args to the rightmost function', () => {
    const sum = (a, b) => a + b;
    expect(compose(double, sum)(3, 4)).toBe(14);
  });
});

describe('pipe', () => {
  it('composes left-to-right', () => {
    expect(pipe(addOne, double)(5)).toBe(12);
  });

  it('is the mirror of compose', () => {
    expect(pipe(addOne, double)(5)).toBe(compose(double, addOne)(5));
  });

  it('returns identity for no functions', () => {
    expect(pipe()(42)).toBe(42);
  });
});

describe('curry', () => {
  it('supports full and partial application', () => {
    const add3 = curry((a, b, c) => a + b + c);
    expect(add3(1, 2, 3)).toBe(6);
    expect(add3(1)(2)(3)).toBe(6);
    expect(add3(1, 2)(3)).toBe(6);
    expect(add3(1)(2, 3)).toBe(6);
  });
});

describe('tap', () => {
  it('runs the side effect and returns the input unchanged', () => {
    const spy = vi.fn();
    expect(tap(spy)(7)).toBe(7);
    expect(spy).toHaveBeenCalledWith(7);
  });
});

describe('when', () => {
  it('applies fn only when predicate is true', () => {
    const doubleIfEven = when((x) => x % 2 === 0, double);
    expect(doubleIfEven(4)).toBe(8);
    expect(doubleIfEven(5)).toBe(5);
  });
});

describe('ifElse', () => {
  it('branches on the predicate', () => {
    const f = ifElse((x) => x > 0, () => 'pos', () => 'neg');
    expect(f(1)).toBe('pos');
    expect(f(-1)).toBe('neg');
  });
});

describe('evolve', () => {
  it('transforms a single property immutably', () => {
    const input = { a: 1, b: 2 };
    const result = evolve('a', double)(input);
    expect(result).toEqual({ a: 2, b: 2 });
    expect(input).toEqual({ a: 1, b: 2 });
  });
});
