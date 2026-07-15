/**
 * A minimal, framework-free state container with a React-like ergonomic.
 *
 * `createState(initial)` returns a `[state, setState]` tuple:
 *   - `state()`     — read the current value (a getter, since vanilla JS has no
 *                     re-render to hand you a fresh binding the way React does)
 *   - `setState(x)` — replace the value, where `x` is either the next value or an
 *                     **updater** `(prev) => next` (just like React's setState)
 *
 * The updater form is the key composition point: `(prev) => next` is exactly the
 * shape `setPath`, `updatePath`, and `over(lens, …)` produce, so nested immutable
 * updates drop straight in — e.g. `setState(over(lensProp('count'), inc))`.
 *
 * The same object also exposes `get` / `set` / `subscribe` for a non-destructured
 * style. `subscribe(listener)` returns an unsubscribe function (matching the
 * library's teardown convention), and setting an equal value (`Object.is`) is a
 * no-op that notifies no one.
 *
 * @template T
 * @param {T} initial - Initial state value
 * @returns {[() => T, (next: T | ((prev: T) => T)) => T] & {
 *   get: () => T, set: (next: T | ((prev: T) => T)) => T,
 *   subscribe: (listener: (value: T) => void) => (() => void)
 * }}
 */
export const createState = (initial) => {
  let value = initial;
  const listeners = new Set();

  const get = () => value;

  const set = (next) => {
    const resolved = typeof next === 'function' ? next(value) : next;
    // Bail out on no-op changes, like React's Object.is comparison.
    if (Object.is(resolved, value)) return value;
    value = resolved;
    // Snapshot so a listener that (un)subscribes mid-dispatch can't disturb
    // iteration — the same guard scrollManager uses.
    for (const listener of [...listeners]) listener(value);
    return value;
  };

  const subscribe = (listener) => {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  };

  // The tuple IS the return value; the named methods are attached to it so both
  // `const [state, setState] = createState(0)` and `store.get()/set()/subscribe()`
  // work against the same instance.
  const store = [get, set];
  store.get = get;
  store.set = set;
  store.subscribe = subscribe;
  return store;
};
