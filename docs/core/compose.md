# PolyX Core API Reference

This document provides detailed information about the core modules and functions available in the PolyX library.

## Table of Contents

- [Core Modules](#core-modules)
  - [Maybe](#maybe)
  - [Either](#either)
  - [ArrayTransform](#arraytransform)
  - [Compose](#compose)
- [DOM Utilities](#dom-utilities)
  - [DomManager](#dommanager)
  - [EventManager](#eventmanager)
  - [ScrollManager](#scrollmanager)

## Core Modules

### Maybe

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

### ArrayTransform

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

### Compose

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

## DOM Utilities

### DomManager

Provides functional utilities for DOM manipulation.

```javascript
import { DomManager } from '@efthemiosprime/polyx/dom';
```

#### Methods

| Method | Description | Signature | Example |
|--------|-------------|-----------|---------|
| `select(selector)` | Selects DOM elements. | `string -> Array<Element>` | `DomManager.select('.item')` |
| `selectOne(selector)` | Selects a single DOM element. | `string -> Maybe<Element>` | `DomManager.selectOne('#main')` |
| `createElement(tag, attributes, children)` | Creates a DOM element. | `(string, Object, Array) -> Element` | `DomManager.createElement('div', {class: 'container'}, [])` |
| `append(parent, child)` | Appends child to parent. | `(Element, Element) -> Element` | `DomManager.append(container, newElement)` |
| `setAttributes(element, attributes)` | Sets multiple attributes. | `(Element, Object) -> Element` | `DomManager.setAttributes(div, {id: 'main', class: 'active'})` |

### EventManager

Handles DOM events in a functional way.

```javascript
import { EventManager } from '@efthemiosprime/polyx/dom';
```

#### Methods

| Method | Description | Signature | Example |
|--------|-------------|-----------|---------|
| `on(element, eventType, handler)` | Adds event listener. | `(Element, string, Function) -> Function` | `EventManager.on(button, 'click', handleClick)` |
| `off(element, eventType, handler)` | Removes event listener. | `(Element, string, Function) -> void` | `EventManager.off(button, 'click', handleClick)` |
| `once(element, eventType, handler)` | Listens for event once. | `(Element, string, Function) -> Function` | `EventManager.once(form, 'submit', handleSubmit)` |
| `delegate(parent, selector, eventType, handler)` | Sets up event delegation. | `(Element, string, string, Function) -> Function` | `EventManager.delegate(list, 'li', 'click', handleItemClick)` |

### ScrollManager

Provides utilities for scroll-related functionality.

```javascript
import { ScrollManager } from '@efthemiosprime/polyx/dom';
```

#### Methods

| Method | Description | Signature | Example |
|--------|-------------|-----------|---------|
| `getScrollPosition()` | Gets current scroll position. | `() -> {x: number, y: number}` | `ScrollManager.getScrollPosition()` |
| `scrollTo(element, options)` | Scrolls to element. | `(Element, Object) -> void` | `ScrollManager.scrollTo(target, {behavior: 'smooth'})` |
| `onScroll(handler)` | Sets scroll event handler. | `Function -> Function` | `ScrollManager.onScroll(handleScroll)` |
| `infiniteScroll(loadMore, options)` | Implements infinite scrolling. | `(Function, Object) -> Function` | `ScrollManager.infiniteScroll(loadMoreItems, {threshold: 200})` |