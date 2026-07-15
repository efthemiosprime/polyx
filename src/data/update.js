import { Maybe } from '../core/maybe.js';

/**
 * Immutable, path-based updates for nested data — the write-counterparts to
 * `getPath`. Every function is curried data-last and returns a **new** structure
 * with structural sharing: only the nodes along the touched path are cloned;
 * untouched subtrees are reused by reference.
 *
 * Unlike `path`/`getPath`, these are **literal** — they do NOT auto-unwrap REST
 * `data`/`attributes` envelopes. Writing "through" an implicit unwrap is
 * ambiguous, so the write API stays explicit and general.
 */

/** Normalize a string ('a.b.0') or array (['a','b',0]) path into a key array. */
const toKeys = (pathStr) =>
  Array.isArray(pathStr) ? pathStr : String(pathStr).split('.').filter(Boolean);

/** True when a key denotes an array index (a number or an all-digits string). */
const isIndex = (key) =>
  typeof key === 'number' || /^\d+$/.test(key);

/**
 * Shallow-clone a node so we can write into it without mutating the original.
 * When the node isn't a container, create the right one for the key we're about
 * to write: an array for a numeric key, an object otherwise.
 */
const cloneFor = (node, key) => {
  if (Array.isArray(node)) return node.slice();
  if (node !== null && typeof node === 'object') return { ...node };
  return isIndex(key) ? [] : {};
};

/** Plain (no-unwrap) traversal; returns undefined if any segment is absent. */
const getIn = (keys, obj) => {
  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = current[Array.isArray(current) ? Number(key) : key];
  }
  return current;
};

const setIn = (keys, value, obj) => {
  if (keys.length === 0) return value;
  const [key, ...rest] = keys;
  const container = cloneFor(obj, key);
  const idx = Array.isArray(container) ? Number(key) : key;
  container[idx] = setIn(rest, value, container[idx]);
  return container;
};

const dissocIn = (keys, obj) => {
  if (keys.length === 0) return obj;
  if (obj === null || typeof obj !== 'object') return obj; // path absent → no-op

  const [key, ...rest] = keys;

  if (rest.length === 0) {
    if (Array.isArray(obj)) {
      const idx = Number(key);
      if (idx < 0 || idx >= obj.length) return obj;
      const copy = obj.slice();
      copy.splice(idx, 1);
      return copy;
    }
    if (!Object.prototype.hasOwnProperty.call(obj, key)) return obj;
    const { [key]: _removed, ...remaining } = obj;
    return remaining;
  }

  // Descend only if the intermediate exists; otherwise nothing to remove.
  const idx = Array.isArray(obj) ? Number(key) : key;
  if (obj[idx] === undefined) return obj;
  const container = Array.isArray(obj) ? obj.slice() : { ...obj };
  container[idx] = dissocIn(rest, container[idx]);
  return container;
};

/**
 * Immutably set `value` at `path`, creating missing intermediates (an array for
 * a numeric segment, an object otherwise). An empty path replaces the whole value.
 *
 * @param {string|Array} pathStr - Dot-path or key array
 * @param {*} value - Value to set at the path
 * @returns {(obj: *) => *} Function of the target that returns a new structure
 */
export const setPath = (pathStr, value) => (obj) =>
  setIn(toKeys(pathStr), value, obj);

/**
 * Immutably update the value at `path` by applying `fn` to the current value
 * (which is `undefined` when the path doesn't yet exist).
 *
 * @param {string|Array} pathStr - Dot-path or key array
 * @param {(current: *) => *} fn - Updater applied to the current value
 * @returns {(obj: *) => *} Function of the target that returns a new structure
 */
export const updatePath = (pathStr, fn) => (obj) => {
  const keys = toKeys(pathStr);
  return setIn(keys, fn(getIn(keys, obj)), obj);
};

/**
 * Immutably remove the value at `path`. Object keys are omitted; array elements
 * are removed with splice semantics (the array is compacted). A path that
 * doesn't exist is a no-op that returns the original reference.
 *
 * @param {string|Array} pathStr - Dot-path or key array
 * @returns {(obj: *) => *} Function of the target that returns a new structure
 */
export const dissocPath = (pathStr) => (obj) =>
  dissocIn(toKeys(pathStr), obj);

/**
 * Read the value at `path` as a `Maybe` — `Just(value)` when present,
 * `Nothing` when any segment is missing. Literal traversal (no `data`/
 * `attributes` unwrapping), so it composes with the rest of the core.
 *
 * @param {string|Array} pathStr - Dot-path or key array
 * @returns {(obj: *) => import('../core/maybe.js').Maybe} Function of the target
 */
export const getPathMaybe = (pathStr) => (obj) =>
  Maybe.of(getIn(toKeys(pathStr), obj));

/**
 * Literal read at `path`, returning `defaultValue` only when the path is truly
 * absent (resolves to `undefined`). Unlike `getPathMaybe`, a stored `null` is
 * preserved — so this is the correct reader for round-tripping values, and the
 * basis for `lensPath`'s getter. No `data`/`attributes` unwrapping.
 *
 * @param {*} defaultValue - Returned when the path resolves to `undefined`
 * @param {string|Array} pathStr - Dot-path or key array
 * @returns {(obj: *) => *} Function of the target that returns the value or default
 */
export const getPathOr = (defaultValue, pathStr) => (obj) => {
  const found = getIn(toKeys(pathStr), obj);
  return found === undefined ? defaultValue : found;
};
