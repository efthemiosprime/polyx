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

  let notifying = false;

  const get = () => value;

  const set = (next) => {
    const resolved = typeof next === 'function' ? next(value) : next;
    // Bail out on no-op changes, like React's Object.is comparison.
    if (Object.is(resolved, value)) return value;
    value = resolved;

    // Reentrant set (a listener called set during dispatch): just record the new
    // value and let the active dispatch loop below re-run — this keeps deliveries
    // ordered and consistent instead of interleaving a nested notification.
    if (notifying) return value;

    notifying = true;
    try {
      let dispatched;
      let passes = 0;
      do {
        // A subscriber that unconditionally sets a new value on every notification
        // would loop forever; fail loudly instead of hanging (cf. React's
        // "maximum update depth exceeded").
        if (++passes > 1000) {
          throw new Error(
            'createState: state did not converge — a subscriber keeps calling set() with a new value'
          );
        }
        dispatched = value; // every listener in a pass sees the same value
        // Snapshot so (un)subscribing mid-dispatch can't disturb iteration, and
        // re-check membership so a listener removed earlier in this pass by
        // another listener is not invoked (same guard scrollManager uses).
        for (const listener of [...listeners]) {
          if (!listeners.has(listener)) continue;
          listener(dispatched);
        }
      } while (!Object.is(value, dispatched)); // a reentrant set → dispatch again
    } finally {
      notifying = false;
    }
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
