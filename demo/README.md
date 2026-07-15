# PolyX Demos

Framework-free, no-build demos. Serve the folder over HTTP (browsers block ES-module
`import` from `file://`), or double-click a `*-standalone.html` file:

```bash
python3 -m http.server 8347
# then open one of:
#   http://localhost:8347/demo/index.html   — state + data + dom (Todo)
#   http://localhost:8347/demo/query.html   — query client (Posts)
```

| Demo | Files | Shows |
|------|-------|-------|
| **Todo** — state + data + dom | `index.html` + `app.js`, or `standalone.html` | `createState` store, immutable `setPath`/lens updates, `on`/`delegate`/`onIntersect` |
| **Query** — data fetching | `query.html` + `query.js`, or `query-standalone.html` | `createQueryClient`: loading/cached states, `refetch`, and an optimistic `mutation` with rollback |

Each `*-standalone.html` inlines the PolyX subset it uses in a classic `<script>`,
so it runs by **double-click** with no server. The module versions import the real
library from `../src/**`.

---

## Todo demo (state + data + dom)

A tiny, framework-free **Todo app** that wires the three modules together —
**state**, **data**, and **dom** — with no build step.

## Run it

Two files, two ways:

**`index.html`** — the real integration demo. It imports the library straight from
`../src/**` as ES modules, so it must be served over HTTP (browsers block module
`import` from `file://` — every `file://` page is a unique origin):

```bash
python3 -m http.server 8347
# then open http://localhost:8347/demo/index.html
```

Any static server works (`npx serve`, `php -S`, etc.) — no bundler required.

**`standalone.html`** — a zero-setup copy you can **double-click** (opens from
`file://`). It inlines the small subset of PolyX the demo uses in a classic
`<script>`, so there are no imports to be blocked. Same app, same behavior — handy
for sharing a single file.

## What each module does here

| Module | In this demo |
|--------|--------------|
| **state** — `createState` | One store holds `{ todos, filter, nextId }`. `subscribe(render)` re-renders on every change; `state()` reads, `setState(updater)` writes. |
| **data** — `setPath` / `updatePath` / `over(lensPath(…))` | Every mutation is an immutable `(prev) => next` update — the exact shape `setState` accepts. Add appends a todo and bumps `nextId`; toggle flips `todos[i].done` through a lens; delete filters the array. |
| **dom** — `on` / `delegate` / `onIntersect` | `on('submit')` adds a todo; `delegate` puts **one** listener on the list/filters that covers rows added later; `onIntersect` fades each row in as it enters the viewport. Each returns a cleanup. |

## The key idea

`setState`'s updater is `(prev) => next` — precisely what `setPath`,
`updatePath`, and `over(lens, …)` produce. So state updates read like:

```js
setState(setPath('nextId', s.nextId + 1));            // data → state
setState(over(lensPath(['todos', i, 'done']), not));  // lens → state
```

and the DOM layer only ever calls those update functions and re-renders on
`subscribe`. State, data, and DOM stay decoupled but compose cleanly.

See `app.js` for the fully-commented source (~120 lines).

---

## Query demo (data fetching)

A **Posts** app over a mock API (artificial latency, no backend) showing the query
client end-to-end:

| Piece | In this demo |
|-------|--------------|
| **query** | `client.query(['posts'])` renders a loading skeleton, then cached data. `refetch()` triggers a **background** fetch — the status dot goes amber while `status` stays `success`. |
| **mutation** | `client.mutation` adds a post. `onMutate` inserts it **optimistically** (dashed/pending row); on failure it **rolls back** (tick "make the next save fail"); on success `onSettled` **invalidates** `['posts']` so the list reconciles with the server. |

See `query.js` for the fully-commented source.
