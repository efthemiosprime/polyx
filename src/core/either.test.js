import { describe, it, expect } from 'vitest';
import { Either } from './either.js';

describe('Either.Right', () => {
  it('maps and folds down the right branch', () => {
    const r = Either.Right(5).map((x) => x + 1);
    expect(r.isRight).toBe(true);
    expect(r.value).toBe(6);
    expect(r.fold(() => 'left', (x) => `right:${x}`)).toBe('right:6');
  });

  it('flatMaps to the returned Either', () => {
    expect(Either.Right(5).flatMap((x) => Either.Right(x * 2)).value).toBe(10);
  });

  it('getOrElse returns the value', () => {
    expect(Either.Right(5).getOrElse(99)).toBe(5);
  });
});

describe('Either.Left', () => {
  it('ignores map and flatMap', () => {
    const l = Either.Left('err').map((x) => x + 1).flatMap((x) => Either.Right(x));
    expect(l.isLeft).toBe(true);
    expect(l.value).toBe('err');
  });

  it('folds down the left branch', () => {
    expect(Either.Left('err').fold((e) => `left:${e}`, () => 'right')).toBe('left:err');
  });

  it('getOrElse returns the default', () => {
    expect(Either.Left('err').getOrElse(99)).toBe(99);
  });
});

describe('Either.fromNullable', () => {
  it('wraps non-null in Right', () => {
    expect(Either.fromNullable(5).isRight).toBe(true);
  });

  it('wraps null/undefined in Left', () => {
    expect(Either.fromNullable(null).isLeft).toBe(true);
    expect(Either.fromNullable(undefined).isLeft).toBe(true);
  });
});

describe('Either.tryCatch', () => {
  it('captures a return value as Right', () => {
    expect(Either.tryCatch(() => 42).value).toBe(42);
  });

  it('captures a thrown error as Left', () => {
    const result = Either.tryCatch(() => {
      throw new Error('boom');
    });
    expect(result.isLeft).toBe(true);
    expect(result.value.message).toBe('boom');
  });
});

describe('Either.fromCondition', () => {
  it('returns Right(rightValue) when the condition is true', () => {
    expect(Either.fromCondition(true, 'L', 'R')).toMatchObject({ isRight: true, value: 'R' });
  });

  it('returns Left(leftValue) when the condition is false', () => {
    expect(Either.fromCondition(false, 'L', 'R')).toMatchObject({ isLeft: true, value: 'L' });
  });

  it('defaults missing branch values to null', () => {
    expect(Either.fromCondition(true).value).toBe(null);
    expect(Either.fromCondition(false).value).toBe(null);
  });
});
