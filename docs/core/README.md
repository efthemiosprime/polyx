# PolyX Core API Reference

This document provides detailed information about the core modules and functions available in the PolyX library.

## Table of Contents

- [Core Modules](#core-modules)
  - [Maybe](#maybe)
  - [Either](#either)
  - [ArrayTransform](#arraytransform)
  - [Compose](#compose)
  - [When](#when)
  - [State](#state)
- [DOM Utilities](#dom-utilities)
  - [scrollManager](#scrollManager)
  - [isInView](#isinview)

## Core Modules

### [Maybe](./maybe.md)

The Maybe monad represents computations which might not return a result.

```javascript
import { Maybe } from '@efthemiosprime/polyx';
```

#### Static Methods

| Method | Description | Signature | Example |
|--------|-------------|-----------|---------|
| `Maybe.of(value)` | Wraps a value in a Maybe. `null`/`undefined` become Nothing. | `value -> Maybe<value>` | `Maybe.of(5)` |

#### Properties

| Property | Description | Example |
|----------|-------------|---------|
| `isNothing` | `true` when the Maybe is empty (holds `null`/`undefined`). | `maybeUser.isNothing` |
| `value` | The wrapped value. | `maybeUser.value` |

#### Instance Methods

| Method | Description | Signature | Example |
|--------|-------------|-----------|---------|
| `map(fn)` | Applies a function to the value if it exists. | `(a -> b) -> Maybe<b>` | `maybeUser.map(user => user.name)` |
| `chain(fn)` / `flatMap(fn)` | Applies a function that returns a Maybe. | `(a -> Maybe<b>) -> Maybe<b>` | `maybeUser.chain(u => Maybe.of(u.address))` |
| `filter(predicate)` | Returns Nothing if predicate is false. | `(a -> boolean) -> Maybe<a>` | `maybeUser.filter(u => u.age >= 18)` |
| `fold(onNothing, onJust)` | Collapse to a single value by handling both cases. | `((() -> c), (a -> c)) -> c` | `m.fold(() => 'none', x => x)` |
| `orElse(fn)` | Supply an alternative Maybe (from a thunk) when Nothing. | `(() -> Maybe<b>) -> Maybe<a\|b>` | `m.orElse(() => Maybe.of(0))` |
| `ap(other)` | Applicative apply — the value must be a function. | `Maybe<a> -> Maybe<b>` | `Maybe.of(f).ap(Maybe.of(9))` |
| `tap(fn)` | Runs a side effect with the value, returns the Maybe. | `(a -> void) -> Maybe<a>` | `maybeUser.tap(u => console.log(u))` |
| `getOrElse(defaultValue)` | Returns the value or a default. | `b -> a \| b` | `maybeUser.getOrElse('Guest')` |
| `getOrElseGet(fn)` | Lazy `getOrElse` — the thunk runs only for Nothing. | `(() -> b) -> a \| b` | `m.getOrElseGet(() => expensive())` |
| `toEither(leftValue)` | Nothing → `Left(leftValue)`, Just → `Right`. | `l -> Either<l, a>` | `m.toEither('not found')` |

### [Either](./either.md)

The Either monad represents computations that can either result in an error (`Left`)
or success (`Right`). See the [full Either guide](./either.md) for details.

```javascript
import { Either } from '@efthemiosprime/polyx';
```

#### Static Methods

| Method | Description | Signature | Example |
|--------|-------------|-----------|---------|
| `Either.Right(value)` | Creates a Right (success) Either. | `b -> Either<_, b>` | `Either.Right(5)` |
| `Either.Left(value)` | Creates a Left (error) Either. | `a -> Either<a, _>` | `Either.Left('Error occurred')` |
| `Either.of(value)` | Applicative `pure`; alias for `Right`. | `b -> Either<_, b>` | `Either.of(5)` |
| `Either.fromNullable(value)` | `Right` if non-null, else `Left(null)`. | `a -> Either<null, a>` | `Either.fromNullable(result)` |
| `Either.tryCatch(fn)` | Executes a function that might throw. | `(() -> a) -> Either<Error, a>` | `Either.tryCatch(() => JSON.parse(text))` |
| `Either.fromCondition(condition, leftValue, rightValue)` | Creates an Either based on a condition. | `(boolean, a, b) -> Either<a, b>` | `Either.fromCondition(isValid, 'Invalid', data)` |

#### Properties

| Property | Description | Example |
|----------|-------------|---------|
| `isLeft` / `isRight` | Which side this Either holds. | `result.isRight` |
| `value` | The wrapped Left or Right value. | `result.value` |

#### Instance Methods

| Method | Description | Signature | Example |
|--------|-------------|-----------|---------|
| `map(fn)` | Maps the Right value, preserves Left. | `(b -> c) -> Either<a, c>` | `result.map(x => x * 2)` |
| `flatMap(fn)` / `chain(fn)` | Maps with a function returning Either. | `(b -> Either<a, c>) -> Either<a, c>` | `result.chain(validate)` |
| `mapLeft(fn)` | Transforms the **Left** (error) value only. | `(a -> c) -> Either<c, b>` | `result.mapLeft(e => e.message)` |
| `bimap(onLeft, onRight)` | Transforms whichever side is present. | `((a -> c), (b -> d)) -> Either<c, d>` | `result.bimap(fmtErr, fmtOk)` |
| `tap(fn)` | Side effect on a Right value, returns the Either. | `(b -> void) -> Either<a, b>` | `result.tap(console.log)` |
| `ap(other)` | Applicative apply — the Right must be a function. | `Either<a, c> -> Either<a, d>` | `Either.of(f).ap(Either.Right(9))` |
| `orElse(fn)` | Recover from a Left with a new Either. | `(a -> Either<c, d>) -> Either<c, b\|d>` | `result.orElse(() => Either.Right(0))` |
| `fold(leftFn, rightFn)` | Applies one of two functions. | `((a -> c), (b -> c)) -> c` | `result.fold(onErr, onOk)` |
| `getOrElse(defaultValue)` | Returns Right value or default. | `c -> b \| c` | `result.getOrElse(0)` |
| `getOrElseGet(fn)` | Lazy `getOrElse` — the thunk runs only for a Left. | `(() -> c) -> b \| c` | `result.getOrElseGet(() => load())` |
| `toMaybe()` | Left → Nothing, Right → Just. | `() -> Maybe<b>` | `result.toMaybe()` |

### [ArrayTransform](./array-transform.md)

The ArrayTransform utility provides a fluent interface for array operations.

```javascript
import { ArrayTransform } from '@efthemiosprime/polyx';
```

#### Static Methods

| Method | Description | Signature | Example |
|--------|-------------|-----------|---------|
| `ArrayTransform.from(array)` | Creates an ArrayTransform from an array or array-like object. | `Array<a> -> ArrayTransform<a>` | `ArrayTransform.from([1, 2, 3])` |
| `ArrayTransform.of(value)` | Lifts a single value into an ArrayTransform. | `a -> ArrayTransform<a>` | `ArrayTransform.of(5)` |

#### Instance Methods

| Method | Description | Signature | Example |
|--------|-------------|-----------|---------|
| `map(fn)` | Maps each value in the array. | `(a -> b) -> ArrayTransform<b>` | `at.map(x => x * 2)` |
| `filter(fn)` | Filters the array. | `(a -> boolean) -> ArrayTransform<a>` | `at.filter(x => x > 5)` |
| `flatMap(fn)` / `chain(fn)` | Maps then flattens one level. | `(a -> b\|b[]) -> ArrayTransform<b>` | `at.flatMap(x => [x, x])` |
| `forEach(fn)` | Executes a function for each element. | `(a -> void) -> ArrayTransform<a>` | `at.forEach(console.log)` |
| `take(n)` / `drop(n)` | First `n` / all but the first `n` (chainable). | `number -> ArrayTransform<a>` | `at.take(10)` |
| `unique(keyFn?)` | Dedupe by identity or a derived key, keeping order. | `((a -> k)?) -> ArrayTransform<a>` | `at.unique(x => x.id)` |
| `reduce(fn, init?)` | Folds the array to a single value. | `((acc, a) -> acc, acc?) -> acc` | `at.reduce((s, x) => s + x, 0)` |
| `groupBy(fn)` | Group into an object keyed by `fn(item)`. | `(a -> key) -> { [key]: a[] }` | `at.groupBy(x => x.type)` |
| `partition(pred)` | Split into `[pass, fail]`. | `(a -> boolean) -> [a[], a[]]` | `at.partition(x => x.ok)` |
| `find(fn)` | First match as a **`Maybe`** (Nothing if none). | `(a -> boolean) -> Maybe<a>` | `at.find(x => x > 5)` |
| `head()` / `last()` | First / last element as a **`Maybe`**. | `() -> Maybe<a>` | `at.last()` |
| `some(fn)` / `every(fn)` | Whether any / all elements pass. | `(a -> boolean) -> boolean` | `at.some(x => x > 5)` |
| `isEmpty()` | Whether the collection has no elements. | `() -> boolean` | `at.isEmpty()` |
| `toSet()` | Converts the array to a Set. | `() -> Set<a>` | `at.toSet()` |
| `toArray()` | Returns a copy of the underlying array. | `() -> Array<a>` | `at.toArray()` |

### [Compose](./compose.md)

The compose module bundles the core function-combinators.

```javascript
import { compose, pipe, curry, tap, when, ifElse, evolve, identity, always, complement } from '@efthemiosprime/polyx';
```

#### Methods

| Method | Description | Signature | Example |
|--------|-------------|-----------|---------|
| `compose(...fns)` | Compose right-to-left. | `(...fns) -> (a -> z)` | `compose(double, inc)(5)` |
| `pipe(...fns)` | Compose left-to-right. | `(...fns) -> (a -> z)` | `pipe(inc, double)(5)` |
| `curry(fn)` | Curry for partial application. | `fn -> curried` | `curry(add)(1)(2)` |
| `tap(fn)` | Run a side effect, return the input unchanged. | `(a -> void) -> (a -> a)` | `pipe(tap(log), double)` |
| `when(pred, fn)` | Apply `fn` only when `pred` is true. | `((a -> bool), (a -> a)) -> (a -> a)` | `when(isEven, double)` |
| `ifElse(pred, onT, onF)` | Branch on a predicate. | `((a -> bool), (a -> b), (a -> c)) -> (a -> b\|c)` | `ifElse(gt0, inc, dec)` |
| `evolve(prop, fn)` | Immutably transform one property. | `(k, (v -> v)) -> (obj -> obj)` | `evolve('n', inc)` |
| `identity(x)` | Return the argument unchanged. | `a -> a` | `ifElse(p, f, identity)` |
| `always(x)` | A function that always returns `x`. | `a -> (() -> a)` | `map(always(0))` |
| `complement(pred)` | Negate a predicate. | `(a -> bool) -> (a -> bool)` | `filter(complement(isEmpty))` |

**Example:**
```javascript
const double = x => x * 2;
const increment = x => x + 1;

const doubleThenIncrement = compose(increment, double);
doubleThenIncrement(5); // Returns 11 (5 * 2 + 1)
```

### [When](./when.md)

The when utility conditionally applies a transformation based on a predicate.

```javascript
import { when } from '@efthemiosprime/polyx';
```

#### Methods

| Method | Description | Signature | Example |
|--------|-------------|-----------|---------|
| `when(predicate, transformation)` | Creates a function that applies a transformation to a value only if the predicate returns true for that value. | `(a -> Boolean, a -> b) -> (a -> a\|b)` | `when(isEven, double)(4)` |

**Example:**
```javascript
const isEven = x => x % 2 === 0;
const double = x => x * 2;

const doubleIfEven = when(isEven, double);
doubleIfEven(4); // Returns 8
doubleIfEven(5); // Returns 5 (unchanged)
```

### [State](./state.md)

A framework-free `[state, setState]` container (React-like, but `state` is a getter
since vanilla JS has no re-render). See the [full State guide](./state.md).

```javascript
import { createState } from '@efthemiosprime/polyx';
```

| Method | Description | Signature | Example |
|--------|-------------|-----------|---------|
| `createState(initial)` | Create a store; returns `[state, setState]` that also carries `get`/`set`/`subscribe`. | `T -> StateStore<T>` | `const [n, setN] = createState(0)` |
| `state()` / `store.get()` | Read the current value. | `() -> T` | `n()` |
| `setState(next)` | Set a value or apply an updater `(prev) => next`. | `(T \| (T->T)) -> T` | `setN(x => x + 1)` |
| `store.subscribe(fn)` | React to changes; returns an unsubscribe. | `((T) -> void) -> (() -> void)` | `store.subscribe(render)` |

## DOM Utilities

### [scrollManager](./scroll-manager.md)

Provides functional utilities for handling scroll-related functionality in the browser.

```javascript
import { scrollManager } from '@efthemiosprime/polyx/dom';
```

See the [full scrollManager guide](./scroll-manager.md) for options and real-world examples. Every callback receives `ScrollData` — `{ y, direction, timestamp }`.

#### Methods

| Method | Description | Signature | Example |
|--------|-------------|-----------|---------|
| `subscribe(cb, opts?)` | Subscribe to scroll (coalesced to one call/frame). `opts.throttle`/`opts.debounce` rate-limit. Returns an unsubscribe fn. | `((ScrollData -> void), { throttle?, debounce? }) -> (() -> void)` | `scrollManager.subscribe(fn, { throttle: 100 })` |
| `getScrollPosition()` | Current scroll data (side-effect-free read). | `() -> ScrollData` | `scrollManager.getScrollPosition()` |
| `addOneTimeTrigger(opts)` | Fire a callback the first time the user scrolls a direction. Returns a trigger id. | `({ direction, callback, ... }) -> string` | `scrollManager.addOneTimeTrigger({ direction: 'down', callback })` |
| `removeOneTimeTrigger(id)` | Remove a trigger and cancel its timers. | `string -> void` | `scrollManager.removeOneTimeTrigger(id)` |
| `resetOneTimeTrigger(id)` / `resetAllOneTimeTriggers()` | Re-arm one / all triggers. | `string -> void` / `() -> void` | `scrollManager.resetAllOneTimeTriggers()` |

### isInView

A utility function that checks if an element is currently visible in the viewport.

```javascript
import { isInView } from '@efthemiosprime/polyx/dom';
```

#### Methods

| Method | Description | Signature | Example |
|--------|-------------|-----------|---------|
| `isInView(element, offset = 0)` | Checks if the element is in the viewport with an optional offset. | `(Element, number) -> boolean` | `isInView(document.getElementById('my-element'), 100)` |