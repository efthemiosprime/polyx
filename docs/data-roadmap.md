# Data Module — Design & Roadmap

> Status: **proposal**. Describes where `src/data` is today, what to fix, and what
> to add so it can *manipulate* nested data, not just read it. No code here ships
> yet — it's the plan the feature work will follow.

## 1. Positioning — why `polyx/data` exists

The data module's job is **immutable, composable manipulation of deeply nested,
real-world data** — the kind REST/JSON:API/Strapi hand you, wrapped in
`data`/`attributes` envelopes. It should let you read, transform, and rebuild that
shape without spread-hell, mutation, or reaching for lodash.

| | Vanilla / spread | lodash `get`/`set` | immer | **polyx/data** |
|---|---|---|---|---|
| Immutable by default | manual | `set` mutates* | yes (proxies) | **yes** |
| Curried / point-free | no | partial | no | **yes** |
| Composes with `Maybe`/`Either` | no | no | no | **yes** |
| Lens/optic abstraction | no | no | no | **yes (planned)** |
| Build step / proxy runtime | no | no | proxies | **no** |

*`_.set` mutates its target; you need `_.cloneDeep` first.

**One-line pitch:** *Read, transform, and rebuild deeply nested API data
immutably — curried, `Maybe`-aware, and (with lenses) composable, without lodash
or a proxy runtime.*

Every addition below is judged against that pitch.

## 2. Current surface

| File | Exports | Nature |
|------|---------|--------|
| `path.js` | `path`, `getPath`, `makePath` | Safe deep **read**; auto-unwraps REST `data`/`attributes` envelopes (`path.js:45-58`) |
| `flatten.js` | `flatten`, `flattenWith` | Nested object → dotted-key map; same REST unwrapping |

**The whole module is read-only.** A `grep` for any `set`/`assoc`/`update`/`lens`/
`pick`/`merge`/`unflatten` export returns nothing — there is no way to *change*
nested data. That is the gap this roadmap fills.

## 3. Problems / gaps to weigh (before adding anything)

1. **No write half.** The headline gap: `getPath` has no `setPath`/`updatePath`/
   `dissocPath` counterpart. You can read five levels deep but not change one field
   without hand-rolled spreads.
2. **`getPath` returns a raw value + default, not a `Maybe`.** The rest of the
   library is `Maybe`-centric (`dom/utils.js`, `isInView`), but nested reads don't
   compose with it. A `Maybe`-returning variant would wire data into the core.
3. **Domain-specific auto-unwrap magic.** `path().get` silently traverses
   `data`/`attributes` wrappers (`path.js:45-58`). Great for Strapi, surprising for
   general data. **New write ops must NOT inherit this** — writing "through" an
   implicit unwrap is ambiguous (which level do you set?). Keep writes explicit and
   general; keep the magic read-only and, ideally, opt-in later.
4. **`flatten` is O(n²).** It builds its result with `{ ...acc, ...flattened }`
   inside a `reduce` (`flatten.js:57-75`), reallocating the accumulator per key —
   quadratic on wide objects. Worth fixing to a single mutable accumulator when we
   next touch the file.

## 3a. Environment & tooling constraints (verified against the repo)

Load-bearing facts every feature step must honor:

- **Types are hand-written and split.** Every new export needs its signature/
  interface in `types/index.d.ts` **and** its name in `types/data.d.ts` (a re-export
  list, like `dom.d.ts`). Then `npm run typecheck` (`tsc --noEmit`) must pass.
- **Data tests run in plain Node** — no `jsdom` docblock (`path.test.js` /
  `flatten.test.js` import straight from vitest). New tests are pure and fast; no
  environment setup needed.
- **Don't duplicate `evolve`.** A shallow single-prop `evolve(prop, fn)(obj)`
  already exists in `core/compose.js:102`. Build around it; a deep/multi-key
  transform should complement, not shadow it.
- **`Maybe` is the integration point** — `Maybe.of/map/flatMap/getOrElse` are
  stable (used across the codebase). `Maybe`-returning reads should lean on it.

## 4. Design principles for new code

- **Immutable + structural sharing.** Writes return a new object; unchanged
  subtrees are shared by reference, not deep-cloned.
- **Curried, data-last.** `setPath(path, value)(obj)` — matches `getPath`,
  composes in `pipe`/`compose`.
- **Explicit, no hidden unwrap** for writes (see problem #3).
- **Arrays are first-class.** Numeric path segments index arrays; `setPath` on an
  array clones the array, not converts it to an object.
- **Zero dependencies.**

## 5. Roadmap

### Tier 1 — immutable nested writes (the direct answer)

The write-counterparts to `getPath`, plus a `Maybe`-returning read.

- **`setPath(path, value)(obj) → obj'`** — immutable deep set with structural
  sharing; creates missing intermediates (object for string keys, array for numeric).
- **`updatePath(path, fn)(obj) → obj'`** — immutable deep update via a function of
  the current value.
- **`dissocPath(path)(obj) → obj'`** — immutable deep delete.
- **`getPathMaybe(path)(obj) → Maybe`** — the read side as a `Maybe`, so nested
  access composes with the core.

*Ships as one "nested writes" slice: impl + tests + `types/index.d.ts` +
`types/data.d.ts` + `tsc` + a `docs/core/data-paths.md` page.* Smallest set that
turns the module from read-only into read+transform.

### Tier 2 — lenses (the flagship, on-theme for a category-theory library)

A composable optic that unifies get and set — the idiomatic FP answer to "manipulate
complex nested data," and a genuine teaching piece.

- **`lens(getter, setter)`**, **`lensProp(key)`**, **`lensPath(path)`**,
  **`lensIndex(i)`**.
- **`view(lens, obj)`**, **`set(lens, value, obj)`**, **`over(lens, fn, obj)`**.
- **Lens composition** — compose two lenses to focus deeper; the composition law is
  exactly the kind of thing the library's `laws.property.test.js` already checks for
  other structures.
- Optional **`Maybe` integration** (an affine/optional variant) for paths that may
  not exist.

Tier 1's `setPath`/`getPath` become the natural implementation backbone for
`lensPath`.

### Tier 3 — structural transforms

- **`unflatten(map, delimiter?)`** — the satisfying inverse of `flatten`
  (dotted-key map → nested object).
- **`pick(keys)` / `omit(keys)`** — object subset (shallow; a deep/path-aware
  variant later).
- **`mergeDeep(a, b)` / `mergeDeepWith(fn, a, b)`** — recursive merge.
- **`mapValues` / `mapKeys` / `leafPaths(obj)`** — enumerate/transform.
- Fix `flatten`'s O(n²) accumulator while here (problem #4).

## 6. Suggested sequencing

1. Tier 1 `setPath` / `updatePath` / `dissocPath` / `getPathMaybe` — the value slice.
2. Tier 2 lenses, built on Tier 1.
3. Tier 3 transforms + the `flatten` perf fix.

Each step is its own commit with pure Node tests (following `path.test.js`
conventions), updated `types/index.d.ts` + `types/data.d.ts` with `tsc` green, and a
docs page linked from `docs/README.md`.

## 7. Explicitly out of scope

- A schema/validation DSL (that's `Validation`'s territory in core).
- Deep structural equality / diffing (a separate concern; add only if a real need
  appears).
- Re-implementing `evolve` (already in core).
- Baking REST `data`/`attributes` unwrapping into write ops (problem #3).
