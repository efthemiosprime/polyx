import { setPath, getPathOr } from './update.js';

/**
 * Lenses — composable optics that unify *getting* and *setting* a focus within a
 * larger immutable structure.
 *
 * A lens is a `{ get, set }` pair:
 *   - `get :: (s) => a`          — read the focus `a` out of the whole `s`
 *   - `set :: (a, s) => s`       — return a new whole with the focus replaced
 *
 * Because both halves live in one value, lenses **compose**: focus through an
 * outer lens, then an inner one, to reach arbitrarily deep — and `view`/`set`/
 * `over` work the same at any depth. Built on the immutable path writers
 * (`setPath`) and reader (`getPathMaybe`), so all updates share structure.
 *
 * @example
 * import { lensPath, over } from '@efthemiosprime/polyx';
 * over(lensPath('user.name'), (s) => s.toUpperCase())({ user: { name: 'ada' } });
 * // { user: { name: 'ADA' } }
 */

/**
 * Build a lens from an explicit getter/setter pair.
 * @param {(s: any) => any} getter - Reads the focus out of the whole
 * @param {(a: any, s: any) => any} setter - Returns a new whole with the focus set
 * @returns {{ get: Function, set: Function }}
 */
export const lens = (getter, setter) => ({ get: getter, set: setter });

/** Lens focusing a single property (immutable set via `setPath`). */
export const lensProp = (key) => lensPath([key]);

/** Lens focusing an array index. */
export const lensIndex = (index) => lensPath([index]);

/**
 * Lens focusing a nested path (dot-string or key array). Reads literally as a
 * `Maybe` under the hood (no `data`/`attributes` unwrapping) and writes with
 * structural sharing.
 */
export const lensPath = (path) =>
  lens(
    // Literal getter (null-preserving) so the lens laws hold for `null` foci.
    (s) => getPathOr(undefined, path)(s),
    (a, s) => setPath(path, a)(s)
  );

/**
 * Compose two or more lenses left-to-right: `composeLens(outer, inner)` focuses
 * through `outer`, then `inner`. Reading walks in; writing rebuilds outward.
 * @param {...{ get: Function, set: Function }} lenses
 * @returns {{ get: Function, set: Function }}
 */
export const composeLens = (...lenses) =>
  lenses.reduce((outer, inner) =>
    lens(
      (s) => inner.get(outer.get(s)),
      (a, s) => outer.set(inner.set(a, outer.get(s)), s)
    )
  );

/** Read the focus. Curried, data-last: `view(lens)(obj)`. */
export const view = (l) => (obj) => l.get(obj);

/** Immutably replace the focus with `value`. `set(lens, value)(obj)`. */
export const set = (l, value) => (obj) => l.set(value, obj);

/** Immutably transform the focus with `fn`. `over(lens, fn)(obj)`. */
export const over = (l, fn) => (obj) => l.set(fn(l.get(obj)), obj);
