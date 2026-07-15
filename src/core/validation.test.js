import { describe, it, expect, vi } from 'vitest';
import { Validation } from './validation.js';
import { Either } from './either.js';

describe('Validation construction', () => {
  it('Success carries a value', () => {
    const v = Validation.Success(5);
    expect(v.isSuccess).toBe(true);
    expect(v.isFailure).toBe(false);
    expect(v.value).toBe(5);
  });
  it('Failure carries an array of errors', () => {
    const v = Validation.Failure(['bad']);
    expect(v.isFailure).toBe(true);
    expect(v.isSuccess).toBe(false);
    expect(v.value).toEqual(['bad']);
  });
  it('of is Success; fail lifts a single error into a Failure', () => {
    expect(Validation.of(1).isSuccess).toBe(true);
    expect(Validation.fail('oops').value).toEqual(['oops']);
  });
});

describe('Validation.map', () => {
  it('maps a Success value', () => {
    expect(Validation.Success(2).map(x => x + 1).value).toBe(3);
  });
  it('leaves a Failure untouched', () => {
    const fn = vi.fn();
    expect(Validation.Failure(['e']).map(fn).value).toEqual(['e']);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('Validation.ap (applicative — accumulates errors)', () => {
  it('applies a Success(fn) to a Success(value)', () => {
    expect(Validation.of(x => x + 1).ap(Validation.Success(9)).value).toBe(10);
  });
  it('accumulates errors when BOTH sides are Failure', () => {
    const result = Validation.Failure(['a']).ap(Validation.Failure(['b']));
    expect(result.isFailure).toBe(true);
    expect(result.value).toEqual(['a', 'b']);
  });
  it('a single Failure propagates', () => {
    expect(Validation.of(x => x).ap(Validation.Failure(['e'])).value).toEqual(['e']);
    expect(Validation.Failure(['e']).ap(Validation.Success(1)).value).toEqual(['e']);
  });

  it('collects ALL field errors in an applicative form validation', () => {
    const nonEmpty = (field, s) =>
      s.length ? Validation.Success(s) : Validation.fail(`${field} is required`);
    const isEmail = s =>
      s.includes('@') ? Validation.Success(s) : Validation.fail('email is invalid');

    const build = name => email => ({ name, email });

    const bothBad = Validation.of(build)
      .ap(nonEmpty('name', ''))
      .ap(isEmail('nope'));
    expect(bothBad.value).toEqual(['name is required', 'email is invalid']);

    const allGood = Validation.of(build)
      .ap(nonEmpty('name', 'Ada'))
      .ap(isEmail('ada@x.io'));
    expect(allGood.value).toEqual({ name: 'Ada', email: 'ada@x.io' });
  });
});

describe('Validation.fold / getOrElse', () => {
  it('fold handles both branches', () => {
    expect(Validation.Success(5).fold(() => 'err', x => `ok:${x}`)).toBe('ok:5');
    expect(Validation.Failure(['e']).fold(errs => errs.join(','), () => 'ok')).toBe('e');
  });
  it('getOrElse returns value or default', () => {
    expect(Validation.Success(5).getOrElse(0)).toBe(5);
    expect(Validation.Failure(['e']).getOrElse(0)).toBe(0);
  });
});

describe('Validation.mapFailure / bimap', () => {
  it('mapFailure transforms the errors', () => {
    expect(Validation.Failure(['a']).mapFailure(errs => errs.map(e => e.toUpperCase())).value)
      .toEqual(['A']);
  });
  it('bimap routes to the present side', () => {
    expect(Validation.Success(2).bimap(() => 0, x => x * 10).value).toBe(20);
    expect(Validation.Failure(['a']).bimap(errs => errs.length, () => 0).value).toBe(1);
  });
});

describe('Validation <-> Either interop', () => {
  it('toEither: Success -> Right, Failure -> Left', () => {
    expect(Validation.Success(5).toEither()).toMatchObject({ isRight: true, value: 5 });
    expect(Validation.Failure(['e']).toEither()).toMatchObject({ isLeft: true, value: ['e'] });
  });
  it('fromEither: Right -> Success, Left -> Failure (wrapped in an array)', () => {
    expect(Validation.fromEither(Either.Right(5)).value).toBe(5);
    expect(Validation.fromEither(Either.Left('e')).value).toEqual(['e']);
    expect(Validation.fromEither(Either.Left(['a', 'b'])).value).toEqual(['a', 'b']);
  });
});
