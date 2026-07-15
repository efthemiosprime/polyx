import { describe, it, expect } from 'vitest';
import { path, getPath, makePath } from './path.js';

const restData = {
  data: {
    blogs: {
      data: {
        attributes: {
          title: 'Blog title',
          date: '2022-09-28',
        },
      },
    },
  },
};

describe('path().get', () => {
  it('reads a simple dotted path', () => {
    expect(path({ a: { b: { c: 1 } } }).get('a.b.c')).toBe(1);
  });

  it('accepts an array of keys', () => {
    expect(path({ a: { b: 2 } }).get(['a', 'b'])).toBe(2);
  });

  it('returns the default for a missing path', () => {
    expect(path({ a: 1 }).get('a.b.c', 'fallback')).toBe('fallback');
  });

  it('indexes into arrays with numeric segments', () => {
    expect(path({ items: [{ id: 10 }, { id: 20 }] }).get('items.1.id')).toBe(20);
  });

  // Regression guard: documented REST auto-unwrap examples must resolve.
  it('auto-unwraps data/attributes wrappers (short path)', () => {
    expect(path(restData).get('blogs.title')).toBe('Blog title');
  });

  it('resolves the fully-explicit wrapper path too', () => {
    expect(path(restData).get('data.blogs.data.attributes.title')).toBe('Blog title');
  });

  it('honors an explicit data/attributes segment without over-unwrapping', () => {
    const obj = { data: { attributes: { x: 1 } } };
    expect(path(obj).get('data.attributes.x')).toBe(1);
  });
});

describe('path().has', () => {
  it('is true for an existing path', () => {
    expect(path(restData).has('blogs.title')).toBe(true);
  });

  it('is false for a missing path', () => {
    expect(path({ a: 1 }).has('a.b')).toBe(false);
  });

  // Known limitation: get() returns the default for any undefined result, so an
  // existing-but-undefined value is indistinguishable from a missing key here.
  it('treats an existing undefined value as absent (documented limitation)', () => {
    expect(path({ a: undefined }).has('a')).toBe(false);
  });
});

describe('path().getAll', () => {
  it('extracts a path from each item of an array', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(path(items).getAll('id')).toEqual([1, 2, 3]);
  });

  it('returns an empty array for non-arrays', () => {
    expect(path({ a: 1 }).getAll('a')).toEqual([]);
  });
});

describe('path().prop', () => {
  it('builds a reusable extractor', () => {
    const getX = path(null).prop('a.x');
    expect(getX({ a: { x: 5 } })).toBe(5);
  });
});

describe('getPath', () => {
  it('creates a getter for a path', () => {
    expect(getPath('a.b')({ a: { b: 42 } })).toBe(42);
  });
});

describe('makePath', () => {
  it('joins truthy parts with dots', () => {
    expect(makePath('a', null, 'b', '', 'c')).toBe('a.b.c');
  });
});
