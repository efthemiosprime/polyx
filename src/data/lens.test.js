import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  lens, lensProp, lensPath, lensIndex, view, set, over, composeLens,
} from './lens.js';

describe('lensProp', () => {
  it('view reads the focused property', () => {
    expect(view(lensProp('a'))({ a: 1, b: 2 })).toBe(1);
  });

  it('set writes immutably', () => {
    const obj = { a: 1, b: 2 };
    const next = set(lensProp('a'), 9)(obj);
    expect(next).toEqual({ a: 9, b: 2 });
    expect(obj).toEqual({ a: 1, b: 2 });
  });

  it('over transforms the focused value', () => {
    expect(over(lensProp('a'), (n) => n + 1)({ a: 4 })).toEqual({ a: 5 });
  });
});

describe('lensPath', () => {
  it('focuses a nested value', () => {
    const obj = { a: { b: { c: 1 } } };
    expect(view(lensPath('a.b.c'))(obj)).toBe(1);
    expect(over(lensPath('a.b.c'), (n) => n * 10)(obj).a.b.c).toBe(10);
  });

  it('view of a missing path is undefined', () => {
    expect(view(lensPath('x.y'))({})).toBeUndefined();
  });

  it('accepts an array path', () => {
    expect(view(lensPath(['a', 'b']))({ a: { b: 5 } })).toBe(5);
  });
});

describe('lensIndex', () => {
  it('focuses an array element immutably', () => {
    const xs = [10, 20, 30];
    expect(view(lensIndex(1))(xs)).toBe(20);
    const next = set(lensIndex(1), 99)(xs);
    expect(next).toEqual([10, 99, 30]);
    expect(xs).toEqual([10, 20, 30]);
  });
});

describe('composeLens', () => {
  it('focuses through two lenses', () => {
    const l = composeLens(lensProp('a'), lensProp('b'));
    const obj = { a: { b: 1 } };
    expect(view(l)(obj)).toBe(1);
    expect(set(l, 7)(obj)).toEqual({ a: { b: 7 } });
  });

  it('composes lens flavours (prop then index)', () => {
    const l = composeLens(lensProp('list'), lensIndex(0));
    const obj = { list: [{ id: 1 }] };
    expect(view(l)(obj)).toEqual({ id: 1 });
    expect(over(l, (x) => ({ ...x, id: 9 }))(obj).list[0].id).toBe(9);
  });
});

describe('custom lens', () => {
  it('honors a manual getter/setter pair', () => {
    const first = lens(
      (arr) => arr[0],
      (v, arr) => [v, ...arr.slice(1)]
    );
    expect(view(first)([1, 2, 3])).toBe(1);
    expect(set(first, 9)([1, 2, 3])).toEqual([9, 2, 3]);
  });
});

// The three lens laws — checked with fast-check, matching laws.property.test.js.
describe('lens laws (lensProp)', () => {
  const l = lensProp('x');

  it('set-get: view(set(a)) === a', () => {
    fc.assert(fc.property(fc.object(), fc.anything(), (s, a) => {
      expect(view(l)(set(l, a)(s))).toEqual(a);
    }));
  });

  it('get-set: set(view(s), s) deep-equals s (when focus exists)', () => {
    fc.assert(fc.property(fc.anything(), (x) => {
      const s = { x };
      expect(set(l, view(l)(s))(s)).toEqual(s);
    }));
  });

  it('set-set: last write wins', () => {
    fc.assert(fc.property(fc.object(), fc.anything(), fc.anything(), (s, a, b) => {
      expect(view(l)(set(l, b)(set(l, a)(s)))).toEqual(b);
    }));
  });
});
