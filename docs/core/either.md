# Either Monad Documentation

## Overview

The `Either` monad models a computation that can end in one of two ways: a
**`Left`** (conventionally a failure or error) or a **`Right`** (conventionally a
success). Unlike throwing exceptions, an `Either` makes both outcomes explicit,
first-class values that you can `map`, `chain`, and combine — so error handling
becomes ordinary data flow ("railway-oriented programming") instead of control flow.

By convention the **`Right`** side carries the value operations flow through, while
the **`Left`** side short-circuits: once you have a `Left`, `map`/`chain`/`ap` pass
it along untouched until you explicitly handle it with `fold`, `getOrElse`, or
`orElse`.

```javascript
import { Either } from '@efthemiosprime/polyx';

const divide = (a, b) =>
  b === 0
    ? Either.Left(new Error('Division by zero'))
    : Either.Right(a / b);

divide(10, 2)
  .map(x => x + 1)
  .fold(
    err => console.error(err.message), // Left branch
    val => console.log('Result:', val) // Right branch -> "Result: 6"
  );
```

## Category Theory Perspective

`Either` is a **functor** (`map`), a **monad** (`of` + `chain`), and an
**applicative** (`of` + `ap`) over its `Right` type parameter, and a **bifunctor**
over both parameters (`bimap`). The laws hold on the `Right` side; a `Left`
propagates unchanged.

- **Functor identity**: `e.map(x => x)` ≡ `e`
- **Functor composition**: `e.map(g).map(f)` ≡ `e.map(x => f(g(x)))`
- **Monad left identity**: `Either.of(a).chain(f)` ≡ `f(a)`
- **Monad right identity**: `e.chain(Either.of)` ≡ `e`
- **Monad associativity**: `e.chain(f).chain(g)` ≡ `e.chain(x => f(x).chain(g))`

## API Reference

### Static constructors

| Method | Description | Signature |
|--------|-------------|-----------|
| `Either.Right(x)` | Wrap a success value. | `b -> Either<never, b>` |
| `Either.Left(x)` | Wrap an error value. | `a -> Either<a, never>` |
| `Either.of(x)` | Applicative `pure`; alias for `Right`. | `b -> Either<never, b>` |
| `Either.fromNullable(x)` | `Right(x)` if non-null, else `Left(null)`. | `a -> Either<null, a>` |
| `Either.tryCatch(fn)` | Run `fn`; `Right` its result or `Left` the thrown error. | `(() -> b) -> Either<unknown, b>` |
| `Either.fromCondition(cond, left?, right?)` | `Right(right)` when `cond` is truthy, else `Left(left)` (both default `null`). | `(boolean, a?, b?) -> Either<a\|null, b\|null>` |

### Properties

| Property | Description |
|----------|-------------|
| `isLeft` | `true` for a `Left`. |
| `isRight` | `true` for a `Right`. |
| `value` | The wrapped value (of the `Left` or `Right`). |

### Instance methods

| Method | Description | Signature |
|--------|-------------|-----------|
| `map(fn)` | Transform the `Right` value; a `Left` is unchanged. | `(b -> c) -> Either<a, c>` |
| `flatMap(fn)` / `chain(fn)` | Transform the `Right` with a function returning an `Either`. | `(b -> Either<a, c>) -> Either<a, c>` |
| `mapLeft(fn)` | Transform the **`Left`** value; a `Right` is unchanged. | `(a -> c) -> Either<c, b>` |
| `bimap(onLeft, onRight)` | Transform whichever side is present. | `((a -> c), (b -> d)) -> Either<c, d>` |
| `tap(fn)` | Run a side effect on the `Right` value, return the same `Either`. | `(b -> void) -> Either<a, b>` |
| `ap(other)` | Applicative apply — the `Right` must hold a function. | `Either<a, c> -> Either<a, d>` |
| `orElse(fn)` | Recover from a `Left` by returning a new `Either`; a `Right` is unchanged. | `(a -> Either<c, d>) -> Either<c, b\|d>` |
| `fold(onLeft, onRight)` | Collapse to a single value by handling both branches. | `((a -> c), (b -> c)) -> c` |
| `getOrElse(default)` | The `Right` value, or `default` for a `Left`. | `c -> b \| c` |
| `getOrElseGet(fn)` | Lazy `getOrElse` — the thunk runs only for a `Left`. | `(() -> c) -> b \| c` |
| `toMaybe()` | Drop the error side: `Left` → Nothing, `Right` → Just. | `() -> Maybe<b>` |

## Real-World Examples

### Validation chain (railway-oriented)

```javascript
const nonEmpty = s => s.length > 0 ? Either.Right(s) : Either.Left('required');
const maxLen = n => s => s.length <= n ? Either.Right(s) : Either.Left('too long');

const validateName = name =>
  Either.of(name)
    .chain(nonEmpty)
    .chain(maxLen(20));

validateName('Ada').fold(
  err => `Invalid: ${err}`,
  ok => `Hello, ${ok}`
); // "Hello, Ada"
```

### Translating errors with `mapLeft` / recovering with `orElse`

```javascript
const parse = text =>
  Either.tryCatch(() => JSON.parse(text))
    .mapLeft(err => ({ code: 'PARSE_ERROR', message: err.message }));

parse('nope')
  .orElse(() => Either.Right({})) // fall back to an empty object
  .getOrElse(null);
```

### Combining independent values with `ap`

```javascript
const add = a => b => a + b;

Either.of(add)
  .ap(Either.Right(2))
  .ap(Either.Right(3)); // Right(5)

Either.of(add)
  .ap(Either.Left('missing a'))
  .ap(Either.Right(3)); // Left('missing a')
```

## Best Practices

- Keep the **`Right`** side for the happy path and let `Left` carry rich error
  information (objects, not just strings) so `mapLeft`/`fold` have something to work with.
- Prefer `chain` for steps that can themselves fail (return an `Either`) and `map`
  for total transformations.
- Resolve an `Either` at the edge of your program with `fold` (handle both sides)
  or `getOrElse` (supply a default) rather than reading `.value` directly.
