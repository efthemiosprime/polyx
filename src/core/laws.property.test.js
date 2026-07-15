import { describe, it } from 'vitest';
import fc from 'fast-check';
import { Maybe } from './maybe.js';
import { Either } from './either.js';

// Property-based checks of the functor/monad laws, complementing the hand-picked
// cases in maybe.test.js / either.test.js.

const f = (x) => x + 1;
const g = (x) => x * 2;

describe('Maybe laws (property-based)', () => {
  const SENTINEL = Symbol('nothing');
  const eq = (a, b) => a.getOrElse(SENTINEL) === b.getOrElse(SENTINEL);
  // `null` exercises the Nothing branch too.
  const anyValue = fc.option(fc.integer(), { nil: null });

  it('functor identity: map(id) = id', () => {
    fc.assert(fc.property(anyValue, (a) => eq(Maybe.of(a).map((x) => x), Maybe.of(a))));
  });

  it('functor composition: map(f).map(g) = map(g . f)', () => {
    fc.assert(fc.property(anyValue, (a) =>
      eq(Maybe.of(a).map(f).map(g), Maybe.of(a).map((x) => g(f(x))))));
  });

  it('monad left identity: of(a).chain(f) = f(a)', () => {
    // Non-null only: Maybe.of(null) is Nothing, so left identity can't hold for null.
    const mf = (x) => Maybe.of(f(x));
    fc.assert(fc.property(fc.integer(), (a) => eq(Maybe.of(a).chain(mf), mf(a))));
  });

  it('monad right identity: m.chain(of) = m', () => {
    fc.assert(fc.property(anyValue, (a) => eq(Maybe.of(a).chain(Maybe.of), Maybe.of(a))));
  });

  it('monad associativity', () => {
    const mf = (x) => Maybe.of(f(x));
    const mg = (x) => Maybe.of(g(x));
    fc.assert(fc.property(anyValue, (a) =>
      eq(Maybe.of(a).chain(mf).chain(mg), Maybe.of(a).chain((x) => mf(x).chain(mg)))));
  });
});

describe('Either laws (property-based)', () => {
  const eq = (a, b) =>
    a.fold((l) => `L:${l}`, (r) => `R:${r}`) === b.fold((l) => `L:${l}`, (r) => `R:${r}`);

  it('functor identity: map(id) = id', () => {
    fc.assert(fc.property(fc.integer(), (a) => eq(Either.Right(a).map((x) => x), Either.Right(a))));
  });

  it('functor composition: map(f).map(g) = map(g . f)', () => {
    fc.assert(fc.property(fc.integer(), (a) =>
      eq(Either.Right(a).map(f).map(g), Either.Right(a).map((x) => g(f(x))))));
  });

  it('a Left is unchanged by map', () => {
    fc.assert(fc.property(fc.string(), (e) => eq(Either.Left(e).map(f), Either.Left(e))));
  });

  it('monad left identity: of(a).chain(f) = f(a)', () => {
    const ef = (x) => Either.Right(f(x));
    fc.assert(fc.property(fc.integer(), (a) => eq(Either.of(a).chain(ef), ef(a))));
  });

  it('monad right identity: m.chain(of) = m', () => {
    fc.assert(fc.property(fc.integer(), (a) => eq(Either.Right(a).chain(Either.of), Either.Right(a))));
  });

  it('monad associativity', () => {
    const ef = (x) => Either.Right(f(x));
    const eg = (x) => Either.Right(g(x));
    fc.assert(fc.property(fc.integer(), (a) =>
      eq(Either.Right(a).chain(ef).chain(eg), Either.Right(a).chain((x) => ef(x).chain(eg)))));
  });
});
