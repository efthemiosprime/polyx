# Query (createQueryClient)

## Overview

A framework-free data-fetching layer — caching, dedupe, stale-while-revalidate,
retries, and subscriptions — like React Query / SWR but **without a framework**.
It's built on the two primitives PolyX already ships: [`Task`](./task.md) for the
async + retries, and [`createState`](./state.md) for the reactive per-query store.
Because a query is just a subscribable store, it works in a plain script or as the
engine inside any framework's hook. REST and GraphQL via swappable fetchers.

```javascript
import { createQueryClient, fetchJson, gqlFetcher } from '@efthemiosprime/polyx';
// or the subpath: '@efthemiosprime/polyx/query'
```

## Quick start

```javascript
const client = createQueryClient({ staleTime: 30_000, retry: 2 });

const user = client.query({
  key: ['user', 42],
  fetcher: () => fetchJson('/api/users/42'),
});

const off = user.subscribe((s) => render(s));
// s: { status, data, error, isFetching, isStale, updatedAt }

user.refetch();
off(); // stop listening
```

## Query state

Each query is a store over:

| Field | Meaning |
|-------|---------|
| `status` | `'idle'` → `'loading'` (no data yet) → `'success'` / `'error'` |
| `data` / `error` | last successful data / last error (data is kept across an error) |
| `isFetching` | a request is in flight — **including background refetches** (which keep `status: 'success'`) |
| `isStale` | the data is considered stale (invalidated, or never fetched) |
| `updatedAt` | timestamp of the last successful fetch |

## `createQueryClient(options?)`

| Option | Default | Description |
|--------|---------|-------------|
| `staleTime` | `0` | ms a result stays fresh; within it, `query()` serves cache without refetching. |
| `retry` | `0` | retry attempts after the first failure. |
| `retryDelay` | `1000` | ms between retries. |

Returns a client:

| Method | Description |
|--------|-------------|
| `query(options)` | Start/read a query; returns a **handle** (below). |
| `invalidate(keyOrPredicate)` | Mark matching queries stale and refetch. Arrays match by **prefix** (`['user']` matches `['user', 42]`); a function is a predicate over the key. |
| `setQueryData(key, dataOrUpdater)` | Write the cache directly (seed data, optimistic updates). Marks the entry fresh. |
| `getQueryData(key)` | Read cached data (or `undefined`). |
| `clear()` | Drop the whole cache. |

### `query(options)`

| Option | Description |
|--------|-------------|
| `key` | A **JSON-serializable** key (string or array). Object keys are order-normalized. |
| `fetcher` | `() => Promise \| Task \| value`. |
| `staleTime` / `retry` / `retryDelay` | Per-query overrides. |
| `enabled` | `false` defers fetching (dependent queries) until a later `query()` flips it true. |

Returns a **handle**: `getState()`, `subscribe(fn) → unsubscribe`, `refetch()`,
and `select(fn)` (derive from the current state — a lens `view` works as the fn).

## Behavior notes

- **Dedupe & race-safety.** Concurrent `query()` calls for the same key share one
  fetch. A `refetch()`/`invalidate()` **supersedes** an in-flight request — only
  the latest response commits, so a slow earlier response can't overwrite a newer
  one.
- **Cache key contract.** Keys must be JSON-serializable; non-serializable values
  (functions, `Date`, `Map`) produce unstable hashes.
- **Known limitation (MVP):** the cache is **not evicted** — every unique key stays
  cached for the client's lifetime. (Garbage collection is planned.)

## Real-World Examples

### REST list + detail, with invalidation on write

```javascript
const client = createQueryClient({ staleTime: 60_000 });

const todos = client.query({ key: ['todos'], fetcher: () => fetchJson('/api/todos') });
todos.subscribe(renderList);

async function addTodo(text) {
  await fetch('/api/todos', { method: 'POST', body: JSON.stringify({ text }) });
  client.invalidate(['todos']); // list refetches automatically
}
```

### GraphQL

```javascript
const feed = client.query({
  key: ['feed'],
  fetcher: gqlFetcher('/graphql', `query { feed { id title } }`),
});
feed.subscribe((s) => s.status === 'success' && render(s.data.feed));
```

### Dependent query (`enabled`)

```javascript
const me = client.query({ key: ['me'], fetcher: () => fetchJson('/api/me') });

const orders = client.query({
  key: ['orders', me.getState().data?.id],
  fetcher: () => fetchJson(`/api/orders?u=${me.getState().data.id}`),
  enabled: me.getState().status === 'success', // waits for `me`
});
```

### Optimistic update with `setQueryData`

```javascript
function toggleDone(id) {
  const prev = client.getQueryData(['todos']);
  // optimistic: flip immediately
  client.setQueryData(['todos'], (list) =>
    list.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  fetch(`/api/todos/${id}/toggle`, { method: 'POST' })
    .catch(() => client.setQueryData(['todos'], prev)); // roll back on failure
}
```

## Mutations

`client.mutation(config)` wraps an async write (create/update/delete) in a store
with lifecycle callbacks.

```javascript
const addTodo = client.mutation({
  mutationFn: (text) => fetchJson('/api/todos', {
    method: 'POST', body: JSON.stringify({ text }),
  }),
  onSuccess: () => client.invalidate(['todos']), // refetch the list
});

addTodo.subscribe((s) => renderButton(s));       // { status, data, error, isLoading, variables }
await addTodo.mutate('Ship it');                  // resolves data (or undefined on error)
addTodo.reset();
```

**Config:** `mutationFn(vars)` (returns Promise | Task | value) plus optional
`onMutate` / `onSuccess` / `onError` / `onSettled`, and `retry` / `retryDelay`.

**Lifecycle:** `onMutate(vars)` runs first and its return value becomes the
**`context`** passed to the later callbacks — the hook for optimistic updates and
rollback. On success: `onSuccess(data, vars, context)` → `onSettled(data, undefined,
…)`. On failure: `onError(error, vars, context)` → `onSettled(undefined, error, …)`.
`mutate(vars)` resolves with the data on success or `undefined` on failure (the
error is reflected in the store, never thrown).

### Optimistic mutation with rollback

```javascript
const toggle = client.mutation({
  mutationFn: (id) => fetchJson(`/api/todos/${id}/toggle`, { method: 'POST' }),
  onMutate: (id) => {
    const prev = client.getQueryData(['todos']);            // snapshot for rollback
    client.setQueryData(['todos'], (list) =>
      list.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    return { prev };                                        // becomes `context`
  },
  onError: (_err, _id, ctx) => client.setQueryData(['todos'], ctx.prev), // roll back
  onSettled: () => client.invalidate(['todos']),            // reconcile with server
});

toggle.mutate(42); // UI flips instantly; rolls back if the request fails
```

### Drive the DOM (with the state/dom modules)

```javascript
import { createQueryClient, fetchJson, on } from '@efthemiosprime/polyx';

const client = createQueryClient();
const q = client.query({ key: ['stats'], fetcher: () => fetchJson('/api/stats') });

q.subscribe((s) => {
  document.querySelector('#stats').textContent =
    s.status === 'loading' ? 'Loading…' : JSON.stringify(s.data);
});
on('click', () => q.refetch())(document.querySelector('#refresh'));
```
