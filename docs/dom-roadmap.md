# DOM Module — Design & Roadmap

> Status: **proposal**. This document describes where the `polyx/dom` module is
> today, what to fix, and what to add. No code here ships yet — it's the plan the
> feature work will follow.

## 1. Positioning — why `polyx/dom` exists

The DOM module should not try to compete with React/Vue (which own a render tree)
or with vanilla `document.*` (which is already there). It wins in the gap between
them:

| | Vanilla JS | React / Vue / Svelte | **polyx/dom** |
|---|---|---|---|
| Owns the render tree | no | **yes** | no |
| Build step required | no | usually | no |
| Null-safe by default | no | n/a | **yes** |
| Works on HTML you don't control (CMS/theme output) | yes, painfully | no | **yes, cleanly** |
| Runtime cost | zero | framework | ~zero |

**Niche: the enhancement layer for server-rendered / CMS / no-build pages** —
WordPress/Divi themes, static-site islands, marketing pages, `.riv` / three.js
embeds. In those contexts a framework *can't* own the DOM (the server/CMS emits
it) and vanilla means endless `el && el.classList && …` guards plus hand-rolled
scroll/observer plumbing that is easy to get subtly wrong.

**One-line pitch:** *Null-safe, composable DOM enhancement for pages you don't
fully control — without shipping a framework.*

Every addition below is judged against that pitch. If a feature doesn't make
"why not just use vanilla?" easier to answer, it doesn't belong here.

## 2. Current surface

| File | Exports | Notes |
|------|---------|-------|
| `utils.js` | `getElement`, `getElements`, `addClass`, `removeClass`, `toggleClass`, `setStyle`, `getStyle`, `setHtml`, `setText`, `addEvent` | Curried, element-last, `Maybe`-wrapped |
| `isInView.js` | `isInView`, `createInViewChecker` | One-shot viewport boolean |
| `scrollManager.js` | `scrollManager` | rAF-coalesced scroll singleton + one-time directional triggers |

## 3. Problems to fix (before adding anything)

1. **Dead public surface.** `setStyle`, `getStyle`, `setHtml`, `setText` exist in
   `utils.js` but are not re-exported from `dom/index.js` or the root `index.js`.
   Decision: export them (they're useful) — or delete them. No orphans.
2. **Inconsistent return contracts.** `getElement` returns `Maybe`; `getElements`
   returns a bare `Array`. Keep the split (`Maybe` for one, `[]` for many) but
   document it explicitly so it's a decision, not an accident.
3. **`addEvent` leaks listeners.** It returns the *element* (`utils.js:130`,
   typed `(element) => Maybe<Element>`), so the listener can never be removed.
   Every other subscription in the library (`scrollManager.subscribe`) returns an
   unsubscribe function. **Do not change `addEvent`'s return — that is a breaking
   API + `.d.ts` change** at v0.0.11. Instead add a *new* `on(event, handler,
   opts) → cleanup` (better name, matches `scrollManager`) and leave `addEvent`
   in place, soft-deprecated in docs.
4. **Purity leak.** `addClass('x')(el)` performs the mutation *eagerly inside
   `.map`*. `map` is meant to be pure. In a library whose whole thesis is
   referential transparency, DOM effects should be wrapped in the existing `IO`
   type and run explicitly. This is the most philosophically important fix (see
   §5, Tier 3) and the one that keeps the FP story honest.
5. **Scroll-driven viewport checks are the old way.** `isInView` + `scrollManager`
   reimplement, more expensively, what `IntersectionObserver` does natively
   (cheaper, no rAF babysitting). The module is missing the modern primitive.
   **Keep both — they serve different needs:** `isInView` is a *synchronous
   one-shot* answer for imperative call sites ("is it visible right now?");
   `onIntersect` (§5) is *ongoing observation*. State this boundary in the docs so
   consumers aren't left guessing which to use.

## 3a. Environment & tooling constraints (verified against the repo)

These are load-bearing facts every feature step must honor. All confirmed by
reading the code — not assumptions.

- **`IO` lives in `src/async/io.js`, not core.** It exposes `.run/.map/.chain/.of
  /.from` and its own comments already sketch DOM usage. A Tier 3 `io.*` layer
  imports `../async/io.js` — a new dom→async dependency (no cycle: `io.js` is
  standalone).
- **Types are hand-written and split.** Every new export must be added in **two**
  places: its signature in `types/index.d.ts` *and* its name in `types/dom.d.ts`
  (an explicit re-export list). Then `npm run typecheck` (`tsc --noEmit`) must
  pass. This is a required step in every feature, alongside tests and docs.
- **Test env is opt-in jsdom** via a `// @vitest-environment jsdom` docblock.
  **jsdom 29 does not implement `IntersectionObserver` or `ResizeObserver`** — so
  `onIntersect`/`onResize` tests must inject a global stub, exactly as
  `scrollManager.test.js` already stubs `requestAnimationFrame`/`scrollY`.
  `MutationObserver` *is* in jsdom and `delegate` uses real event bubbling, so
  `onMutation`/`delegate` are testable with no stub.

## 4. Design principles for new code

- **Return cleanup, not the element**, for anything that subscribes or observes —
  mirrors `scrollManager.subscribe`.
- **Null-safe inputs** — accept a selector *or* an element; a missing element is a
  no-op that still returns a valid cleanup (`() => {}`), never a throw.
- **Lazy over eager** for effects — prefer `IO`/`Task` where it composes; keep an
  eager convenience layer for the "just do it" 80% case.
- **Zero dependencies, zero build assumptions** — must run from a `<script
  type="module">` with no bundler.

## 5. Roadmap

### Tier 1 — the "why I'd reach for this" slice

These are the features that flip "why not vanilla?" from *no answer* to *obvious*.

- **`onIntersect(target, callback, options?) → cleanup`**
  `IntersectionObserver` wrapper. Powers lazy-load, reveal-on-scroll, infinite
  scroll, and impression tracking. Accepts selector or element(s); returns an
  unsubscribe. The single strongest justification for the module.
- **`delegate(parent, event, selector, handler) → cleanup`**
  Event delegation. The #1 vanilla pain point — and it *automatically covers
  elements a CMS injects after load*, which lands exactly on the niche.
- **New `on(event, handler, opts) → cleanup`** — the leak-free listener helper
  (problem #3). *Not* a change to `addEvent` — see problem #3 for why.
- **Export the orphaned utils** (fixes problem #1).

*Rationale:* smallest coherent set that changes the value proposition, fully
consistent with the existing cleanup-returning style, and — with `on` instead of
a changed `addEvent` — **non-breaking**. Ship as one "observers & events" commit.
Per-feature checklist: implementation + tests (stub `IntersectionObserver` per
§3a) + type defs in `types/index.d.ts` and `types/dom.d.ts` + `npm run typecheck`
+ a `docs/core/dom-events.md` page linked from `docs/README.md`.

### Tier 2 — round out the observer story

- **`onResize(target, callback) → cleanup`** — `ResizeObserver` wrapper.
- **`onMutation(target, callback, options?) → cleanup`** — `MutationObserver`
  wrapper; the tool for enhancing DOM a CMS injects after initial paint.
- **`ready() → Task`** — DOM-ready as a `Task`, bridging DOM work into the existing
  async story.

### Tier 3 — deepen the FP identity

- **`io.*` DOM ops** — `io.addClass`, `io.setText`, … returning a runnable `IO`
  so effects stay lazy and compose purely (fixes problem #4 without breaking the
  eager API). The eager `utils.js` functions become thin `.run()` wrappers over
  these.
- **`create(tag, props, children) → Maybe/IO`** — functional element construction.
- **Possible `fromEvent(target, event)`** — events as a stream, *only if* the
  library later grows a small Observable/Stream type. Not before.

## 6. Suggested sequencing

1. Fix #1 (export orphaned utils) + add `on()` — small, non-breaking, unblocks
   everything.
2. Tier 1 `onIntersect` + `delegate` — the value-proposition slice.
3. Tier 2 observers (`onResize` needs a stub; `onMutation` doesn't).
4. Tier 3 `IO` layer + `create` — the identity slice, done deliberately since it
   touches every existing util.

Each step is its own commit and must include: tests (following
`scrollManager.test.js` conventions, stubbing observer globals per §3a), updated
`types/index.d.ts` + `types/dom.d.ts` with `npm run typecheck` green, and a docs
page linked from `docs/README.md`.

## 7. Explicitly out of scope

- A virtual DOM or reconciler. If you need that, use a framework — saying so is
  part of the module's honesty.
- Two-way data binding / reactivity beyond the optional `fromEvent` stream.
- Anything that assumes it owns the whole page.
