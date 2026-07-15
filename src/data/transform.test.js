import { describe, it, expect } from 'vitest';
import { unflatten, pick, omit, mergeDeep, mergeDeepWith } from './transform.js';
import { flatten } from './flatten.js';

describe('unflatten', () => {
  it('rebuilds a nested object from dotted keys', () => {
    expect(unflatten({ 'a.b.c': 1, 'a.d': 2 })).toEqual({ a: { b: { c: 1 }, d: 2 } });
  });

  it('rebuilds arrays from numeric segments', () => {
    expect(unflatten({ 'list.0.id': 7, 'list.1.id': 8 }))
      .toEqual({ list: [{ id: 7 }, { id: 8 }] });
  });

  it('supports a custom delimiter', () => {
    expect(unflatten({ 'a/b': 1 }, '/')).toEqual({ a: { b: 1 } });
  });

  it('round-trips with flatten for plain nested objects', () => {
    const obj = { a: { b: { c: 1 }, d: 2 }, e: 3 };
    expect(unflatten(flatten(obj))).toEqual(obj);
  });
});

describe('pick', () => {
  it('keeps only the listed keys that exist', () => {
    expect(pick(['a', 'b'])({ a: 1, b: 2, c: 3 })).toEqual({ a: 1, b: 2 });
  });

  it('ignores keys that are absent', () => {
    expect(pick(['a', 'x'])({ a: 1 })).toEqual({ a: 1 });
  });

  it('is immutable', () => {
    const obj = { a: 1, b: 2 };
    const next = pick(['a'])(obj);
    expect(next).not.toBe(obj);
    expect(obj).toEqual({ a: 1, b: 2 });
  });
});

describe('omit', () => {
  it('drops the listed keys, keeps the rest', () => {
    expect(omit(['b'])({ a: 1, b: 2, c: 3 })).toEqual({ a: 1, c: 3 });
  });

  it('is immutable', () => {
    const obj = { a: 1, b: 2 };
    const next = omit(['b'])(obj);
    expect(next).not.toBe(obj);
    expect(obj).toEqual({ a: 1, b: 2 });
  });
});

describe('mergeDeep', () => {
  it('merges nested objects recursively, right side winning conflicts', () => {
    const a = { u: { name: 'x', age: 1 }, keep: 1 };
    const b = { u: { age: 2 }, extra: 3 };
    expect(mergeDeep(a, b)).toEqual({ u: { name: 'x', age: 2 }, keep: 1, extra: 3 });
  });

  it('replaces arrays rather than merging them', () => {
    expect(mergeDeep({ list: [1, 2] }, { list: [3] })).toEqual({ list: [3] });
  });

  it('is immutable and shares untouched subtrees', () => {
    const a = { x: { deep: 1 }, y: { z: 1 } };
    const b = { y: { z: 2 } };
    const next = mergeDeep(a, b);

    expect(a).toEqual({ x: { deep: 1 }, y: { z: 1 } }); // unchanged
    expect(next.x).toBe(a.x); // untouched subtree shared
  });
});

describe('mergeDeepWith', () => {
  it('resolves leaf conflicts with the combiner', () => {
    const a = { count: 1, tags: ['x'] };
    const b = { count: 2, tags: ['y'] };
    const sumOrConcat = (l, r) =>
      Array.isArray(l) && Array.isArray(r) ? [...l, ...r] : l + r;

    expect(mergeDeepWith(sumOrConcat, a, b))
      .toEqual({ count: 3, tags: ['x', 'y'] });
  });

  it('still recurses into nested objects', () => {
    const a = { n: { v: 1 } };
    const b = { n: { v: 10 } };
    expect(mergeDeepWith((l, r) => l + r, a, b)).toEqual({ n: { v: 11 } });
  });
});
