import { describe, it, expect, vi } from 'vitest';
import { Maybe } from './maybe.js';
import { Either } from './either.js';

describe('Maybe.toEither', () => {
  it('turns a Just into a Right', () => {
    const e = Maybe.of(5).toEither('missing');
    expect(e.isRight).toBe(true);
    expect(e.value).toBe(5);
  });
  it('turns a Nothing into a Left with the provided value', () => {
    const e = Maybe.of(null).toEither('missing');
    expect(e.isLeft).toBe(true);
    expect(e.value).toBe('missing');
  });
  it('round-trips with Either.toMaybe for a value', () => {
    expect(Either.Right(7).toMaybe().toEither('x').value).toBe(7);
  });
});

describe('Maybe.getOrElseGet', () => {
  it('returns the value for a Just without calling the thunk', () => {
    const fn = vi.fn(() => 99);
    expect(Maybe.of(5).getOrElseGet(fn)).toBe(5);
    expect(fn).not.toHaveBeenCalled();
  });
  it('calls the thunk for a Nothing', () => {
    expect(Maybe.of(null).getOrElseGet(() => 99)).toBe(99);
  });
});

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

  describe('fold', () => {
    it('runs onJust for a value', () => {
      expect(Maybe.of(5).fold(() => 'nothing', (x) => `just:${x}`)).toBe('just:5');
    });
    it('runs onNothing for Nothing', () => {
      expect(Maybe.of(null).fold(() => 'nothing', (x) => `just:${x}`)).toBe('nothing');
    });
  });

  describe('orElse', () => {
    it('keeps the value for a Just', () => {
      expect(Maybe.of(5).orElse(() => Maybe.of(99)).value).toBe(5);
    });
    it('uses the alternative for a Nothing', () => {
      expect(Maybe.of(null).orElse(() => Maybe.of(99)).value).toBe(99);
    });
    it('is lazy: the thunk is not called for a Just', () => {
      const fn = vi.fn(() => Maybe.of(99));
      Maybe.of(5).orElse(fn);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('ap', () => {
    it('applies a Just(fn) to a Just(value)', () => {
      expect(Maybe.of((x) => x + 1).ap(Maybe.of(9)).value).toBe(10);
    });
    it('is Nothing if the function side is Nothing', () => {
      expect(Maybe.of(null).ap(Maybe.of(9)).isNothing).toBe(true);
    });
    it('is Nothing if the value side is Nothing', () => {
      expect(Maybe.of((x) => x + 1).ap(Maybe.of(null)).isNothing).toBe(true);
    });
  });

  describe('monad laws', () => {
    const val = (m) => m.getOrElse('__nothing__');

    it('left identity: of(a).chain(f) = f(a)', () => {
      const f = (x) => Maybe.of(x + 1);
      expect(val(Maybe.of(3).chain(f))).toBe(val(f(3)));
    });
    it('right identity: m.chain(of) = m', () => {
      expect(val(Maybe.of(3).chain(Maybe.of))).toBe(val(Maybe.of(3)));
    });
    it('associativity', () => {
      const f = (x) => Maybe.of(x + 1);
      const g = (x) => Maybe.of(x * 2);
      expect(val(Maybe.of(3).chain(f).chain(g)))
        .toBe(val(Maybe.of(3).chain((x) => f(x).chain(g))));
    });
  });
});
