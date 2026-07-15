import { describe, it, expect } from 'vitest';
import { flatten, flattenWith } from './flatten.js';

describe('flatten', () => {
  it('flattens nested objects with dot-notated keys', () => {
    expect(flatten({ a: { b: { c: 1 } } })).toEqual({ 'a.b.c': 1 });
  });

  it('honors a custom delimiter', () => {
    expect(flatten({ a: { b: 1 } }, { delimiter: '/' })).toEqual({ 'a/b': 1 });
  });

  it('keeps nested objects when removeNested is false', () => {
    const result = flatten({ a: { b: 1 } }, { removeNested: false });
    expect(result).toEqual({ 'a.b': 1, a: { b: 1 } });
  });

  it('auto-unwraps configured wrapper paths', () => {
    const input = { data: { attributes: { title: 'Hi' } } };
    expect(flatten(input)).toEqual({ title: 'Hi' });
  });

  it('respects a custom unwrapPaths list', () => {
    const input = { payload: { name: 'x' } };
    expect(flatten(input, { unwrapPaths: ['payload'] })).toEqual({ name: 'x' });
  });

  it('leaves arrays as leaf values', () => {
    expect(flatten({ a: { list: [1, 2, 3] } })).toEqual({ 'a.list': [1, 2, 3] });
  });
});

describe('flattenWith', () => {
  it('navigates the given wrapper paths', () => {
    const input = { data: { attributes: { title: 'Hi' } } };
    expect(flattenWith(['data', 'attributes'])(input)).toEqual({ title: 'Hi' });
  });

  it('stops when a path segment is missing', () => {
    const input = { data: { title: 'Hi' } };
    expect(flattenWith(['data', 'attributes'])(input)).toEqual({ title: 'Hi' });
  });
});
