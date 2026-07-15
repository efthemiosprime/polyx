import { setPath } from './update.js';

/**
 * Structural transforms for objects — the inverse of `flatten`, key selection,
 * and immutable deep merge. All return new structures; none mutate their inputs.
 */

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Rebuild a nested structure from a flat, delimited-key map — the inverse of
 * `flatten`. Numeric segments become array indices (matching `setPath`), so
 * `{ 'list.0.id': 7 }` produces `{ list: [{ id: 7 }] }`.
 *
 * @param {Object} map - Flat object whose keys are delimited paths
 * @param {string} [delimiter='.'] - Segment delimiter
 * @returns {Object} The rebuilt nested structure
 */
export const unflatten = (map, delimiter = '.') =>
  Object.entries(map).reduce(
    (acc, [key, value]) => setPath(key.split(delimiter), value)(acc),
    {}
  );

/**
 * Immutably keep only `keys` that exist on the object.
 *
 * @param {Array<string|number>} keys - Keys to keep
 * @returns {(obj: Object) => Object} Function of the object → new subset object
 */
export const pick = (keys) => (obj) => {
  const result = {};
  for (const key of keys) {
    if (obj != null && Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = obj[key];
    }
  }
  return result;
};

/**
 * Immutably drop `keys` from the object, keeping everything else.
 *
 * @param {Array<string|number>} keys - Keys to remove
 * @returns {(obj: Object) => Object} Function of the object → new object
 */
export const omit = (keys) => (obj) => {
  const drop = new Set(keys.map(String));
  const result = {};
  for (const key of Object.keys(obj || {})) {
    if (!drop.has(key)) result[key] = obj[key];
  }
  return result;
};

/**
 * Immutably deep-merge two objects, resolving leaf conflicts with `fn(aVal, bVal)`.
 * Both values are merged recursively only when both are plain objects; otherwise
 * `fn` decides. Untouched subtrees of `a` are shared by reference.
 *
 * @param {(aVal: *, bVal: *) => *} fn - Combiner for conflicting (non-object) leaves
 * @param {Object} a - Base object
 * @param {Object} b - Object merged onto the base
 * @returns {Object} A new merged object
 */
export const mergeDeepWith = (fn, a, b) => {
  if (!isPlainObject(a) || !isPlainObject(b)) {
    return fn(a, b);
  }
  const result = { ...a };
  for (const key of Object.keys(b)) {
    result[key] = Object.prototype.hasOwnProperty.call(a, key)
      ? mergeDeepWith(fn, a[key], b[key])
      : b[key];
  }
  return result;
};

/**
 * Immutably deep-merge two objects, with the right side winning any conflict
 * (arrays and scalars from `b` replace those in `a`; nested objects are merged).
 *
 * @param {Object} a - Base object
 * @param {Object} b - Object merged onto the base (wins conflicts)
 * @returns {Object} A new merged object
 */
export const mergeDeep = (a, b) => mergeDeepWith((_aVal, bVal) => bVal, a, b);
