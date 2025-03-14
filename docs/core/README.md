# PolyX Core API Reference

This document provides detailed information about the core modules and functions available in the PolyX library.

## Table of Contents

- [Core Modules](#core-modules)
  - [Maybe](#maybe)
  - [Either](#either)
  - [ArrayTransform](#arraytransform)
  - [Compose](#compose)
  - [When](#when)
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
| `Maybe.of(value)` | Wraps a value in a Maybe. | `value -> Maybe<value>` | `Maybe.of(5)` |
| `Maybe.nothing()` | Creates an empty Maybe. | `() -> Maybe<null>` | `Maybe.nothing()` |
| `Maybe.fromNullable(value)` | Creates a Maybe from a potentially null value. | `value -> Maybe<value>` | `Maybe.fromNullable(user)` |
| `Maybe.just(value)` | Creates a Maybe containing a value (alias for `of`). | `value -> Maybe<value>` | `Maybe.just(5)` |

#### Instance Methods

| Method | Description | Signature | Example |
|--------|-------------|-----------|---------|
| `isNothing()` | Returns true if the Maybe is empty. | `() -> boolean` | `maybeUser.isNothing()` |
| `map(fn)` | Applies a function to the value inside Maybe if it exists. | `(a -> b) -> Maybe<b>` | `maybeUser.map(user => user.name)` |
| `chain(fn)` or `flatMap(fn)` | Applies a function that returns a Maybe. | `(a -> Maybe<b>) -> Maybe<b>` | `maybeUser.chain(user => Maybe.fromNullable(user.address))` |
| `filter(predicate)` | Returns Nothing if predicate is false. | `(a -> boolean) -> Maybe<a>` | `maybeUser.filter(user => user.age >= 18)` |
| `getOrElse(defaultValue)` | Returns the value or a default. | `b -> a \| b` | `maybeUser.getOrElse('Guest')` |
| `tap(fn)` | Executes function with value for side effects. | `(a -> void) -> Maybe<a>` | `maybeUser.tap(user => console.log(user))` |
| `toString()` | String representation of the Maybe. | `() -> string` | `maybeUser.toString()` |

### Either

The Either monad represents computations that can either result in an error or success.

```javascript
import { Either } from '@efthemiosprime/polyx';
```

#### Static Methods

| Method | Description | Signature | Example |
|--------|-------------|-----------|---------|
| `Either.Left(value)` | Creates a Left (error) Either. | `a -> Either<a, _>` | `Either.Left('Error occurred')` |
| `Either.Right(value)` | Creates a Right (success) Either. | `b -> Either<_, b>` | `Either.Right(5)` |
| `Either.fromNullable(value)` | Creates an Either from a nullable value. | `a -> Either<null, a>` | `Either.fromNullable(result)` |
| `Either.tryCatch(fn)` | Executes a function that might throw. | `(() -> a) -> Either<Error, a>` | `Either.tryCatch(() => JSON.parse(text))` |
| `Either.fromCondition(condition, leftValue, rightValue)` | Creates an Either based on a condition. | `(boolean, a, b) -> Either<a, b>` | `Either.fromCondition(isValid, 'Invalid', data)` |

#### Instance Methods

| Method | Description | Signature | Example |
|--------|-------------|-----------|---------|
| `isLeft()` | Returns true if Either is a Left. | `() -> boolean` | `result.isLeft()` |
| `isRight()` | Returns true if Either is a Right. | `() -> boolean` | `result.isRight()` |
| `map(fn)` | Maps the Right value, preserves Left. | `(b -> c) -> Either<a, c>` | `result.map(x => x * 2)` |
| `flatMap(fn)` | Maps with a function returning Either. | `(b -> Either<a, c>) -> Either<a, c>` | `result.flatMap(x => validate(x))` |
| `fold(leftFn, rightFn)` | Applies one of two functions. | `((a -> c), (b -> c)) -> c` | `result.fold(err => handleError(err), val => processValue(val))` |
| `getOrElse(defaultValue)` | Returns Right value or default. | `c -> b \| c` | `result.getOrElse(0)` |

### [ArrayTransform](./array-transform.md)

The ArrayTransform utility provides a fluent interface for array operations.

```javascript
import { ArrayTransform } from '@efthemiosprime/polyx';
```

#### Static Methods

| Method | Description | Signature | Example |
|--------|-------------|-----------|---------|
| `ArrayTransform.from(array)` | Creates an ArrayTransform from an array or array-like object. | `Array<a> -> ArrayTransform<a>` | `ArrayTransform.from([1, 2, 3])` |

#### Instance Methods

| Method | Description | Signature | Example |
|--------|-------------|-----------|---------|
| `map(fn)` | Maps each value in the array. | `(a -> b) -> ArrayTransform<b>` | `arrayTransform.map(x => x * 2)` |
| `filter(fn)` | Filters the array. | `(a -> boolean) -> ArrayTransform<a>` | `arrayTransform.filter(x => x > 5)` |
| `forEach(fn)` | Executes a function for each element. | `(a -> void) -> ArrayTransform<a>` | `arrayTransform.forEach(x => console.log(x))` |
| `toSet()` | Converts the array to a Set. | `() -> Set<a>` | `arrayTransform.toSet()` |
| `toArray()` | Returns the underlying array. | `() -> Array<a>` | `arrayTransform.toArray()` |

### [Compose](./compose.md)

The compose utility enables functional composition, allowing multiple functions to be combined into a single function.

```javascript
import { compose } from '@efthemiosprime/polyx';
```

#### Methods

| Method | Description | Signature | Example |
|--------|-------------|-----------|---------|
| `compose(...fns)` | Creates a function that is the composition of the provided functions. Functions are applied from right to left. | `((y -> z), (x -> y), ..., (a -> b)) -> (a -> z)` | `compose(double, increment)(5)` |

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

## DOM Utilities

### [scrollManager](./scroll-manager.md)

Provides functional utilities for handling scroll-related functionality in the browser.

```javascript
import { scrollManager } from '@efthemiosprime/polyx/dom';
```

#### Methods

| Method | Description | Signature | Example |
|--------|-------------|-----------|---------|
| `getScrollPosition()` | Gets the current scroll position of the window. | `() -> { x: number, y: number }` | `scrollManager.getScrollPosition()` |
| `scrollTo(options)` | Scrolls to a specific position in the window. | `{ x?: number, y?: number, behavior?: string } -> void` | `scrollManager.scrollTo({ y: 500, behavior: 'smooth' })` |
| `scrollToElement(element, offset = 0)` | Scrolls to a specific DOM element. | `(Element, number) -> void` | `scrollManager.scrollToElement(document.getElementById('section'), 20)` |
| `isInViewport(element, offset = 0)` | Checks if an element is in the viewport. | `(Element, number) -> boolean` | `scrollManager.isInViewport(element)` |
| `onScroll(callback)` | Registers a scroll event listener. | `(Event -> void) -> () -> void` | `const cleanup = scrollManager.onScroll(handleScroll)` |

### isInView

A utility function that checks if an element is currently visible in the viewport.

```javascript
import { isInView } from '@efthemiosprime/polyx/dom';
```

#### Methods

| Method | Description | Signature | Example |
|--------|-------------|-----------|---------|
| `isInView(element, offset = 0)` | Checks if the element is in the viewport with an optional offset. | `(Element, number) -> boolean` | `isInView(document.getElementById('my-element'), 100)` |