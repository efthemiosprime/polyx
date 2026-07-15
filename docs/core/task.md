# Task Documentation

## Overview

A `Task` represents an **asynchronous** computation that may succeed or fail — like
a `Promise`, but **lazy**. Creating a `Task` does nothing; the work runs only when
you `fork` it. That laziness keeps asynchronous code referentially transparent and
composable: you can `map`/`chain` over the eventual result without triggering the
effect, then run it once, at the edge of your program.

The computation receives its callbacks in `(reject, resolve)` order — failure first
— matching the Folktale/Fluture convention.

```javascript
import { Task } from '@efthemiosprime/polyx';

const fetchUser = id =>
  Task((reject, resolve) =>
    fetch(`/api/users/${id}`)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('Failed'))))
      .then(resolve, reject)
  );

// Nothing has run yet. `fork` starts it:
fetchUser(123)
  .map(user => user.name)
  .fork(
    err => console.error('Error:', err.message),
    name => console.log('User name:', name)
  );
```

## Task vs Promise

| | Promise | Task |
|---|---|---|
| Execution | Eager (runs on creation) | **Lazy** (runs on `fork`) |
| Re-runnable | No (memoized) | Yes (each `fork` re-runs) |
| Error channel | `.catch` | `fork(onRejected, …)` / `orElse` |
| Transform without running | No | `map` / `chain` |

## Category Theory Perspective

`Task` is a **functor** (`map`), **monad** (`of` + `chain`), and **applicative**
(`of` + `ap`) over its success type. `mapRejected` transforms the error channel,
making it a **bifunctor** in spirit.

## API Reference

### Static constructors

| Method | Description | Signature |
|--------|-------------|-----------|
| `Task(computation)` | Build a Task from `(reject, resolve) => void`. | `((e -> void), (a -> void)) -> Task<e, a>` |
| `Task.of(value)` | A Task that immediately resolves. | `a -> Task<never, a>` |
| `Task.resolved(value)` | Alias for `Task.of`. | `a -> Task<never, a>` |
| `Task.rejected(error)` | A Task that immediately rejects. | `e -> Task<e, never>` |
| `Task.fromPromise(promiseFn)` | Lift a `() => Promise` into a Task (called lazily on fork). | `(() -> Promise<a>) -> Task<unknown, a>` |
| `Task.toPromise(task)` | Run a Task and return a Promise of its outcome. | `Task<e, a> -> Promise<a>` |

### Instance methods

| Method | Description | Signature |
|--------|-------------|-----------|
| `fork(onRejected, onResolved)` | Run the Task; the **only** method that performs the effect. | `((e -> void), (a -> void)) -> void` |
| `map(f)` | Transform the eventual success value. | `(a -> b) -> Task<e, b>` |
| `mapRejected(f)` | Transform the eventual error value. | `(e -> e2) -> Task<e2, a>` |
| `flatMap(f)` / `chain(f)` | Sequence another Task after this one succeeds. | `(a -> Task<e2, b>) -> Task<e\|e2, b>` |
| `ap(taskOfValue)` | Applicative apply — this Task must resolve to a function. | `Task<e, x> -> Task<e, b>` |
| `orElse(handler)` | Recover from a rejection by switching to another Task. | `(e -> Task<e2, b>) -> Task<e2, a\|b>` |

## Real-World Examples

### Sequencing dependent async steps

```javascript
const getUser = id => Task.fromPromise(() => fetch(`/users/${id}`).then(r => r.json()));
const getPosts = user => Task.fromPromise(() => fetch(`/posts?u=${user.id}`).then(r => r.json()));

getUser(1)
  .chain(getPosts)
  .map(posts => posts.length)
  .fork(
    err => console.error(err),
    count => console.log(`${count} posts`)
  );
```

### Recovering and translating errors

```javascript
getUser(1)
  .mapRejected(err => ({ code: 'FETCH_FAILED', cause: err }))
  .orElse(() => Task.of({ id: 0, name: 'Guest' }))
  .fork(console.error, console.log);
```

### Interop with Promises / async-await

```javascript
const value = await Task.toPromise(Task.of(42).map(x => x + 1)); // 43
```

## Best Practices

- Build the whole pipeline with `map`/`chain`, then `fork` **once** at the boundary
  (an event handler, a route, `main`). Forking deep inside logic defeats the laziness.
- Use `Task.fromPromise(() => …)` — pass a **thunk**, not a live Promise — so the
  effect stays deferred until `fork`.
- Reach for `orElse` to provide fallbacks and `mapRejected` to normalize errors
  before they reach `fork`.
