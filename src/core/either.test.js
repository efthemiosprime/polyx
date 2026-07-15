import { describe, it, expect, vi } from 'vitest';
import { Either } from './either.js';

describe('Either.toMaybe', () => {
  it('turns a Right into a Just', () => {
    const m = Either.Right(5).toMaybe();
    expect(m.isNothing).toBe(false);
    expect(m.value).toBe(5);
  });
  it('turns a Left into a Nothing', () => {
    expect(Either.Left('err').toMaybe().isNothing).toBe(true);
  });
});

describe('Either.getOrElseGet', () => {
  it('returns the Right value without calling the thunk', () => {
    const fn = vi.fn(() => 99);
    expect(Either.Right(5).getOrElseGet(fn)).toBe(5);
    expect(fn).not.toHaveBeenCalled();
  });
  it('calls the thunk for a Left', () => {
    expect(Either.Left('err').getOrElseGet(() => 99)).toBe(99);
  });
});

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

describe('Either.of', () => {
  it('lifts a value into a Right', () => {
    expect(Either.of(5)).toMatchObject({ isRight: true, value: 5 });
  });
});

describe('Either.chain', () => {
  it('is flatMap on a Right', () => {
    expect(Either.Right(5).chain((x) => Either.Right(x + 1)).value).toBe(6);
  });
  it('short-circuits on a Left', () => {
    const fn = vi.fn();
    expect(Either.Left('e').chain(fn).isLeft).toBe(true);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('Either.mapLeft', () => {
  it('transforms the Left value', () => {
    expect(Either.Left('boom').mapLeft((e) => `wrapped:${e}`).value).toBe('wrapped:boom');
  });
  it('leaves a Right untouched', () => {
    const fn = vi.fn();
    expect(Either.Right(5).mapLeft(fn).value).toBe(5);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('Either.bimap', () => {
  it('maps the Left branch with the first fn', () => {
    expect(Either.Left(1).bimap((x) => x + 10, (x) => x + 100).value).toBe(11);
  });
  it('maps the Right branch with the second fn', () => {
    expect(Either.Right(1).bimap((x) => x + 10, (x) => x + 100).value).toBe(101);
  });
});

describe('Either.tap', () => {
  it('runs the side effect on a Right and returns the same Right', () => {
    const spy = vi.fn();
    const r = Either.Right(7).tap(spy);
    expect(spy).toHaveBeenCalledWith(7);
    expect(r).toMatchObject({ isRight: true, value: 7 });
  });
  it('does not run on a Left', () => {
    const spy = vi.fn();
    Either.Left('e').tap(spy);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('Either.ap', () => {
  it('applies a Right(fn) to a Right(value)', () => {
    expect(Either.Right((x) => x + 1).ap(Either.Right(9)).value).toBe(10);
  });
  it('stays Left if the function side is Left', () => {
    expect(Either.Left('e').ap(Either.Right(9)).isLeft).toBe(true);
  });
  it('becomes Left if the value side is Left', () => {
    expect(Either.Right((x) => x + 1).ap(Either.Left('e')).isLeft).toBe(true);
  });
});

describe('Either.orElse', () => {
  it('recovers from a Left with a new Either', () => {
    expect(Either.Left('e').orElse((e) => Either.Right(`recovered:${e}`)).value).toBe('recovered:e');
  });
  it('leaves a Right untouched', () => {
    const fn = vi.fn();
    expect(Either.Right(5).orElse(fn).value).toBe(5);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('Either laws', () => {
  const eq = (a, b) => expect(a.fold((l) => `L:${l}`, (r) => `R:${r}`))
    .toBe(b.fold((l) => `L:${l}`, (r) => `R:${r}`));

  it('functor identity: map(id) = id', () => {
    eq(Either.Right(3).map((x) => x), Either.Right(3));
    eq(Either.Left('e').map((x) => x), Either.Left('e'));
  });

  it('functor composition: map(f) . map(g) = map(f . g)', () => {
    const f = (x) => x + 1;
    const g = (x) => x * 2;
    eq(Either.Right(3).map(g).map(f), Either.Right(3).map((x) => f(g(x))));
  });

  it('monad left identity: of(a).chain(f) = f(a)', () => {
    const f = (x) => Either.Right(x + 1);
    eq(Either.of(3).chain(f), f(3));
  });

  it('monad right identity: m.chain(of) = m', () => {
    eq(Either.Right(3).chain(Either.of), Either.Right(3));
  });

  it('monad associativity', () => {
    const f = (x) => Either.Right(x + 1);
    const g = (x) => Either.Right(x * 2);
    eq(Either.Right(3).chain(f).chain(g), Either.Right(3).chain((x) => f(x).chain(g)));
  });
});
