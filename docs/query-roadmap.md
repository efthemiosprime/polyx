# Query Module — Design & Roadmap

> Status: **proposal**. A framework-free data-fetching / caching layer (a
> React-Query-style client) built on the primitives PolyX already ships. No code
> here ships yet — it's the plan the feature work will follow.

## 1. Positioning — why `polyx/query` exists

React Query / SWR are excellent, but bound to React (hooks). PolyX can offer the
same *machinery* — cache, dedupe, stale-while-revalidate, retries, subscriptions —
**without a framework**, because we already have the three pieces it's made of:

- **async + retries** → `Task` (`src/async/task.js`)
- **a reactive store per query** → `createState` (subscribe → re-render)
- **selecting/deriving from cached data** → `getPath` / lenses (optional)

| | hand-rolled `fetch` + state | TanStack Query / SWR | **polyx/query** |
|---|---|---|---|
| Cache + dedupe + stale-while-revalidate | no | yes | **yes** |
| Framework required | no | **React (hooks)** | **none** |
| Build step | no | usually | **no** |
| Works in a plain script / CMS island / any framework | yes (painful) | React only | **yes** |
| Composes with the rest of the toolkit (`Task`/`createState`/lenses) | n/a | no | **yes** |

**One-line pitch:** *React-Query-style caching, dedupe, and background refetch —
framework-free, so it works in a plain script or as the engine inside any
framework's hook.* REST and GraphQL via swappable fetchers.

## 2. Current surface

Nothing yet. There is no `fetch`/GraphQL helper and no cache anywhere in `src`
(verified). This module is greenfield, layered on `Task` + `createState`.

## 3. Shape of the API

```js
import { createQueryClient, fetchJson, gqlFetcher } from '@efthemiosprime/polyx';

const client = createQueryClient({ staleTime: 30_000, retry: 2 });

// REST — a query is a subscribable store (built on createState)
const user = client.query({
  key: ['user', 42],
  fetcher: () => fetchJson('/api/users/42'),  // Promise OR Task
});
const off = user.subscribe((s) => render(s));
// s: { status, data, error, isFetching, isStale, updatedAt }
//   status: 'idle' | 'loading' (no data yet) | 'success' | 'error';
//   a background refetch keeps status 'success' with isFetching: true.
user.refetch();

// Dependent query — doesn't fetch until `enabled` is true
const orders = client.query({
  key: ['orders', user.select((s) => s.data?.id)],
  fetcher: () => fetchJson(`/api/orders?u=${user.getState().data.id}`),
  enabled: user.getState().status === 'success',
});

// GraphQL — same machinery, different fetcher
const feed = client.query({
  key: ['feed'],
  fetcher: gqlFetcher('/graphql', `query { feed { id title } }`),
});

client.invalidate(['user', 42]);  // mark stale + refetch live subscribers
user.select((s) => s.data?.name); // derive; a lens view works here too
```

## 3a. Environment & tooling constraints (verified against the repo)

Load-bearing facts every step must honor:

- **`Task` has NO built-in `retry`/`timeout`/`delay`.** It exposes
  `fork`/`map`/`mapRejected`/`chain`/`orElse` + `Task.of`/`resolved`/`rejected`/
  `fromPromise`/`toPromise` (`src/async/task.js`). Retry-with-backoff and request
  timeout must be implemented *in the query layer* (a retry loop over `fork`, a
  `setTimeout` for backoff). A fetcher returning a `Promise` is bridged with
  `Task.fromPromise(() => promise)`.
- **`createState` is the per-query store.** `subscribe(listener)` returns an
  unsubscribe; `set` accepts an updater and **bails out on `Object.is`-equal
  values** — so each state transition must produce a **new** state object (fresh
  reference), or subscribers won't fire.
- **No hard dependency on the data module.** `select` takes a plain selector
  function; a lens `view(lensPath(...))` is just one valid selector. So `query`
  can base on `feat/state` (which has `createState` + `Task`) without `data`.
- **Types are hand-written and split** — new exports go in `types/index.d.ts` +
  a new `types/query.d.ts`, with a `./query` subpath in `package.json` (vite
  auto-discovers `src/query/` as a build entry). `tsc --noEmit` must pass.
- **Tests run in Node.** Query timing (staleTime, retry backoff) needs
  `vi.useFakeTimers()` + **`vi.advanceTimersByTimeAsync(...)`** (not the sync
  variant) — because `Task.fromPromise` resolves on a microtask that must be
  flushed *between* timer ticks. Basic success/error flows use real timers and a
  microtask flush. Unit tests pass a **mock fetcher** (no network);
  `fetchJson`/`gqlFetcher` tests stub `global.fetch`.

## 3b. Resolved semantics & contracts (from the roadmap gap review)

Decisions the first implementation forced, now pinned down:

- **Fetch trigger = eager on `query()`** (not on first subscribe), for MVP
  simplicity. Consequence: a query created but never subscribed still fetches once.
  Each entry **counts subscribers** from day one (even though GC is Tier 3) so the
  eventual eviction has the hook it needs.
- **Key serialization contract.** Keys must be **JSON-serializable**; the hash is
  `JSON.stringify` with **object keys sorted recursively**, so `{a,b}` and `{b,a}`
  collide correctly. Non-serializable values (functions, `Date`, `undefined`,
  `Map`/`Set`) are unsupported and will produce unstable or colliding hashes —
  documented, not silently handled.
- **Dedupe vs. force (the race rule).** An **auto** fetch (from `query()`)
  **dedupes** — if one is in flight, it piggybacks. A **forced** fetch (`refetch`
  or `invalidate`) always starts a **new** fetch that **supersedes** the in-flight
  one: each fetch takes a monotonic id and only the latest may commit; a late
  superseded response is dropped. This is the only path where "ignore superseded
  responses" actually fires, and it's the correctness core.
- **`status` semantics.** `'loading'` **only when there is no data yet**; a
  background refetch of already-loaded data stays `'success'` with
  `isFetching: true`. `error` keeps the last `data` intact.
- **Known MVP limitation:** the cache **grows unbounded** — no entry is ever
  evicted until Tier 3 GC. Called out explicitly so it isn't mistaken for
  complete.

## 4. Design principles

- **A query is a subscribable store**, not a hook — UIs subscribe; frameworks wrap
  it in their own reactivity. Cleanup returned everywhere (library convention).
- **Race-safe by construction.** `Task` has no cancellation, so a refetch that
  supersedes an in-flight request must **ignore the stale response** (guard each
  fetch with a monotonic id; only the latest may commit). This is the subtle bug
  React Query handles and we must too.
- **Dedupe in-flight.** Concurrent `query()` calls for the same key share one
  `Task`; the result fans out to all subscribers.
- **Swappable fetchers.** `fetcher` returns a `Promise` or a `Task`; REST and
  GraphQL are just two fetcher factories over the same engine.
- **Zero framework, zero build.**

## 5. Roadmap

### Tier 1 — MVP query client (the core)

- **`createQueryClient(options?)`** — owns a cache (`Map` keyed by a serialized
  query key) and defaults (`staleTime`, `retry`, `retryDelay`).
- **`client.query({ key, fetcher, staleTime?, retry?, enabled? })`** → a
  subscribable store with `{ status, data, error, isFetching, isStale, updatedAt }`,
  plus `getState()`, `refetch()`, `select(fn)`, and `subscribe(fn) → unsubscribe`
  (which increments a per-entry **subscriber count** — the GC hook). Reads cache;
  refetches when stale; **dedupes** auto-fetches; **supersedes** on force (§3b).
  **`enabled: false`** defers fetching (dependent queries) until flipped true.
- **`client.invalidate(keyOrPredicate)`** — mark matching entries stale and
  refetch. Key match is **prefix** for arrays (`['user']` matches `['user', 42]`)
  or a predicate over the key.
- **`client.setQueryData(key, dataOrUpdater)`** — write the cache directly
  (needed by Tier 2 optimistic updates; cheap to land here).
- **Retry** (constant delay for MVP; `retry` is a count) in the fetch runner
  (Task has none — §3a). `retry: (n, err) => boolean` is a later refinement (§H).
- **`fetchJson(url, init?)`** — REST helper (throws on non-2xx, parses JSON).
- **`gqlFetcher(url, query, variables?)`** — GraphQL POST; throws on `errors[]`.

*Ships as one slice: impl + tests (fake timers, mock fetchers, stubbed `fetch`) +
`types/index.d.ts` + `types/query.d.ts` + `./query` subpath + `docs/core/query.md`.*

### Tier 2 — mutations

- **`client.mutation({ mutationFn, onSuccess?, onError?, onSettled? })`** → a store
  with `{ status, data, error }` and `mutate(vars)`.
- **Optimistic updates** — patch the cache immediately via `setQueryData`
  (landed in Tier 1) + the data module's `setPath`/lenses, snapshot the prior
  value, and roll back on error.
- Invalidate related keys on success.

### Tier 3 — lifecycle & scale

- **Cache garbage collection** — evict entries with no subscribers after
  `cacheTime`.
- **Refetch on window focus / reconnect** (opt-in; guarded for non-DOM/SSR).
- **Pagination / infinite queries**, **prefetch**, **`setQueryData`**.

## 6. Suggested sequencing

1. Tier 1 MVP (client + query + fetchers + race-safety + retry) — the value slice.
2. Tier 2 mutations + optimistic updates.
3. Tier 3 GC / focus-refetch / pagination.

Each step: Node tests (fake timers), synced types, `tsc` green, a docs page linked
from `docs/README.md`.

## 7. Dependencies & branching

- Builds on **`createState`** (PR #11) + **`Task`** (already in `master`). Base the
  branch on `feat/state`; `data` (lenses) is optional and only sharpens
  `select`/optimistic updates.
- New `src/query/` module (mirrors `src/state/`), `./query` subpath export.

## 8. Explicitly out of scope (for now)

- A normalized entity cache (Apollo-style) — this is a document/key cache.
- Built-in React/Vue/Svelte adapters — the store is framework-agnostic; adapters
  can live outside core.
- A GraphQL client with schema/codegen — `gqlFetcher` is a thin POST helper.
