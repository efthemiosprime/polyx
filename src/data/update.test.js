import { describe, it, expect } from 'vitest';
import { setPath, updatePath, dissocPath, getPathMaybe, getPathOr } from './update.js';

describe('setPath', () => {
  it('sets a shallow key immutably', () => {
    const obj = { a: 1, b: 2 };
    const next = setPath('a', 9)(obj);

    expect(next).toEqual({ a: 9, b: 2 });
    expect(obj).toEqual({ a: 1, b: 2 }); // original untouched
    expect(next).not.toBe(obj);
  });

  it('sets a deeply nested key immutably', () => {
    const obj = { a: { b: { c: 1 } } };
    const next = setPath('a.b.c', 42)(obj);

    expect(next.a.b.c).toBe(42);
    expect(obj.a.b.c).toBe(1);
  });

  it('shares structure for untouched subtrees', () => {
    const obj = { a: { b: 1 }, keep: { deep: {} } };
    const next = setPath('a.b', 2)(obj);

    expect(next.keep).toBe(obj.keep); // sibling subtree reused by reference
    expect(next.a).not.toBe(obj.a); // touched path is cloned
  });

  it('creates missing object intermediates', () => {
    const next = setPath('a.b.c', 1)({});
    expect(next).toEqual({ a: { b: { c: 1 } } });
  });

  it('creates an array intermediate for a numeric segment', () => {
    const next = setPath('list.0.id', 7)({});
    expect(Array.isArray(next.list)).toBe(true);
    expect(next.list[0].id).toBe(7);
  });

  it('clones arrays when setting by index', () => {
    const obj = { list: [{ id: 1 }, { id: 2 }] };
    const next = setPath('list.1.id', 9)(obj);

    expect(next.list[1].id).toBe(9);
    expect(obj.list[1].id).toBe(2);
    expect(Array.isArray(next.list)).toBe(true);
    expect(next.list[0]).toBe(obj.list[0]); // untouched element shared
  });

  it('accepts an array path equivalently to a string path', () => {
    const obj = { a: { b: 1 } };
    expect(setPath(['a', 'b'], 5)(obj)).toEqual(setPath('a.b', 5)(obj));
  });

  it('replaces the whole value for an empty path', () => {
    expect(setPath('', 5)({ a: 1 })).toBe(5);
  });

  it('does NOT auto-unwrap data/attributes (writes are literal)', () => {
    const obj = { data: { attributes: { title: 'x' } } };
    const next = setPath('title', 'y')(obj);
    // literal: creates a top-level `title`, leaves the envelope untouched
    expect(next.title).toBe('y');
    expect(next.data.attributes.title).toBe('x');
  });
});

describe('updatePath', () => {
  it('applies a function to the current value immutably', () => {
    const obj = { count: 4 };
    const next = updatePath('count', (n) => n + 1)(obj);

    expect(next.count).toBe(5);
    expect(obj.count).toBe(4);
  });

  it('passes undefined to the updater when the path is missing', () => {
    const seen = [];
    const next = updatePath('a.b', (v) => { seen.push(v); return 1; })({});

    expect(seen).toEqual([undefined]);
    expect(next.a.b).toBe(1);
  });
});

describe('dissocPath', () => {
  it('removes a nested key immutably', () => {
    const obj = { a: { b: 1, c: 2 } };
    const next = dissocPath('a.b')(obj);

    expect(next).toEqual({ a: { c: 2 } });
    expect(obj).toEqual({ a: { b: 1, c: 2 } });
  });

  it('is a no-op when the path does not exist', () => {
    const obj = { a: { b: 1 } };
    const next = dissocPath('a.x.y')(obj);
    expect(next).toEqual(obj);
  });

  it('removes an array element by index (splice semantics)', () => {
    const obj = { list: [10, 20, 30] };
    const next = dissocPath('list.1')(obj);

    expect(next.list).toEqual([10, 30]);
    expect(obj.list).toEqual([10, 20, 30]);
  });
});

describe('getPathMaybe', () => {
  it('returns Just for an existing path', () => {
    const m = getPathMaybe('a.b')({ a: { b: 7 } });
    expect(m.getOrElse(null)).toBe(7);
  });

  it('returns Nothing for a missing path', () => {
    const m = getPathMaybe('a.x')({ a: { b: 7 } });
    expect(m.isNothing).toBe(true);
    expect(m.getOrElse('def')).toBe('def');
  });

  it('reads literally — no data/attributes unwrapping', () => {
    const obj = { data: { attributes: { title: 'x' } } };
    expect(getPathMaybe('title')(obj).isNothing).toBe(true);
    expect(getPathMaybe('data.attributes.title')(obj).getOrElse(null)).toBe('x');
  });
});

describe('getPathOr', () => {
  it('returns the value when present', () => {
    expect(getPathOr(0, 'a.b')({ a: { b: 7 } })).toBe(7);
  });

  it('returns the default only when the path is absent', () => {
    expect(getPathOr('def', 'a.x')({ a: { b: 7 } })).toBe('def');
  });

  it('preserves a stored null (does NOT fall back to the default)', () => {
    expect(getPathOr('def', 'a.b')({ a: { b: null } })).toBe(null);
  });
});
