# Validation

## Overview

`Validation` is like [`Either`](./either.md), with one crucial difference: its
applicative `ap` **accumulates** errors instead of short-circuiting on the first one.

Use it when you want to report *all* the problems at once — every invalid form field,
every failed rule — rather than stopping at the first failure. A **`Failure`** carries
an **array of errors**; combining two failures concatenates their arrays.

```javascript
import { Validation } from '@efthemiosprime/polyx';

const bothBad = Validation.of(name => email => ({ name, email }))
  .ap(Validation.fail('name is required'))
  .ap(Validation.fail('email is invalid'));

bothBad.value; // ['name is required', 'email is invalid']  — BOTH errors
```

Compare with `Either`, which would stop at `'name is required'`.

## Applicative, not a monad

`Validation` is an **applicative functor**, not a monad — there is deliberately **no
`chain`/`flatMap`**. Monadic sequencing has to look at the previous result to decide
the next step, which forces short-circuiting and makes accumulation impossible. When
you want short-circuiting (stop at the first error, or steps that depend on earlier
ones), use [`Either`](./either.md); the two convert with `toEither` / `fromEither`.

## API Reference

### Static constructors

| Method | Description | Signature |
|--------|-------------|-----------|
| `Validation.Success(value)` | A successful value. | `a -> Validation<e, a>` |
| `Validation.Failure(errors)` | A failure carrying an **array** of errors. | `e[] -> Validation<e, a>` |
| `Validation.of(value)` | Applicative `pure`; alias for `Success`. | `a -> Validation<e, a>` |
| `Validation.fail(error)` | Lift a **single** error into a Failure (wraps it in an array). | `e -> Validation<e, never>` |
| `Validation.fromEither(either)` | `Right → Success`, `Left → Failure` (a non-array Left is wrapped). | `Either<l, r> -> Validation<l, r>` |

### Properties

| Property | Description |
|----------|-------------|
| `isSuccess` / `isFailure` | Which side this Validation holds. |
| `value` | The success value for a `Success`, or the **errors array** for a `Failure`. |

### Instance methods

| Method | Description | Signature |
|--------|-------------|-----------|
| `map(fn)` | Transform the success value; a Failure is unchanged. | `(a -> b) -> Validation<e, b>` |
| `mapFailure(fn)` | Transform the errors array; a Success is unchanged. | `(e[] -> e2[]) -> Validation<e2, a>` |
| `bimap(onFailure, onSuccess)` | Transform whichever side is present. | `((e[] -> e2[]), (a -> b)) -> Validation<e2, b>` |
| `ap(other)` | **Applicative apply — accumulates errors.** The success value must be a function. | `Validation<e, x> -> Validation<e, b>` |
| `fold(onFailure, onSuccess)` | Collapse to a single value by handling both branches. | `((e[] -> c), (a -> c)) -> c` |
| `getOrElse(default)` | The success value, or `default` for a Failure. | `c -> a \| c` |
| `toEither()` | `Success → Right(value)`, `Failure → Left(errors)`. | `() -> Either<e[], a>` |

## Real-World Example: form validation

Validate every field and collect all the errors in one pass. Each field validator
returns a `Validation`; the applicative chain combines them.

```javascript
import { Validation } from '@efthemiosprime/polyx';

const rule = (ok, error) => value =>
  ok(value) ? Validation.Success(value) : Validation.fail(error);

const nonEmpty  = field => rule(s => s.trim().length > 0, `${field} is required`);
const isEmail   = rule(s => /\S+@\S+\.\S+/.test(s), 'email is not valid');
const minLength = n => rule(s => s.length >= n, `must be at least ${n} characters`);

const makeUser = name => email => password => ({ name, email, password });

function validateSignup({ name, email, password }) {
  return Validation.of(makeUser)
    .ap(nonEmpty('name')(name))
    .ap(isEmail(email))
    .ap(minLength(8)(password));
}

validateSignup({ name: '', email: 'nope', password: '123' })
  .fold(
    errors => renderErrors(errors), // ['name is required', 'email is not valid', 'must be at least 8 characters']
    user => submit(user)
  );

validateSignup({ name: 'Ada', email: 'ada@x.io', password: 'hunter2!' })
  .fold(renderErrors, submit); // -> submit({ name: 'Ada', email: 'ada@x.io', password: 'hunter2!' })
```

### Bridging to Either

Do accumulating validation up front, then switch to `Either` for the short-circuiting
pipeline that follows:

```javascript
validateSignup(form)
  .toEither()                 // Either<string[], User>
  .chain(saveToDatabase)      // only runs if validation passed
  .fold(handleErrors, onSaved);
```

## Best Practices

- Return `Validation.fail('message')` (single error) or `Validation.Failure([...])`
  (several) from each field validator; the applicative chain concatenates them.
- Start the chain with `Validation.of(curriedConstructor)` and `ap` one field at a
  time, in argument order.
- Use `Validation` for **independent** checks gathered together; use `Either` when a
  step depends on the previous one.
