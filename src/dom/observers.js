/**
 * DOM observer helpers.
 *
 * Thin, null-safe wrappers over the browser's observer APIs that follow the
 * library's teardown convention: each returns a cleanup function (like
 * `scrollManager.subscribe`) rather than the element. They accept a CSS
 * selector, a single element, or a collection (NodeList / array) as the target.
 */

/**
 * Resolves a target argument into a flat array of elements.
 * Accepts a selector string, a single Element, or a NodeList/array of elements.
 * @private
 */
const toElements = (target) => {
  if (!target) return [];
  if (typeof target === 'string') {
    return Array.from(document.querySelectorAll(target));
  }
  if (typeof Element !== 'undefined' && target instanceof Element) {
    return [target];
  }
  if (typeof target.length === 'number') {
    return Array.from(target).filter(Boolean);
  }
  return [];
};

/**
 * Observes when one or more elements enter/leave the viewport (or a root),
 * using `IntersectionObserver`.
 *
 * Prefer this over polling `isInView` from a scroll handler: the browser does
 * the work off the main thread, so it's cheaper and needs no rAF babysitting.
 * Use `isInView` only for a synchronous one-shot "is it visible right now?"
 * check; use `onIntersect` for ongoing observation (lazy-load, reveal-on-scroll,
 * infinite scroll, impression tracking).
 *
 * The `callback` receives the native `(entries, observer)` signature. Null-safe:
 * a missing target, an empty selector match, or an environment without
 * `IntersectionObserver` yields a no-op cleanup.
 *
 * @param {string|Element|NodeList|Element[]} target - What to observe
 * @param {IntersectionObserverCallback} callback - Native IO callback
 * @param {IntersectionObserverInit} [options] - Native IO options (root, rootMargin, threshold)
 * @returns {Function} Cleanup function that disconnects the observer
 */
export const onIntersect = (target, callback, options) => {
  if (typeof IntersectionObserver === 'undefined') {
    return () => {};
  }
  const elements = toElements(target);
  if (elements.length === 0) {
    return () => {};
  }
  const observer = new IntersectionObserver(callback, options);
  elements.forEach((el) => observer.observe(el));
  return () => observer.disconnect();
};

/**
 * Observes size changes on one or more elements, using `ResizeObserver`.
 *
 * The `callback` receives the native `(entries, observer)` signature. Null-safe:
 * a missing target, an empty match, or an environment without `ResizeObserver`
 * yields a no-op cleanup.
 *
 * @param {string|Element|NodeList|Element[]} target - What to observe
 * @param {ResizeObserverCallback} callback - Native RO callback
 * @param {ResizeObserverOptions} [options] - Native per-element observe options (e.g. `box`)
 * @returns {Function} Cleanup function that disconnects the observer
 */
export const onResize = (target, callback, options) => {
  if (typeof ResizeObserver === 'undefined') {
    return () => {};
  }
  const elements = toElements(target);
  if (elements.length === 0) {
    return () => {};
  }
  const observer = new ResizeObserver(callback);
  elements.forEach((el) => observer.observe(el, options));
  return () => observer.disconnect();
};

/**
 * Observes DOM mutations on one or more elements, using `MutationObserver`.
 *
 * The single most useful tool for enhancing DOM a CMS/framework injects after
 * the initial paint. The `callback` receives the native `(mutations, observer)`
 * signature. When `options` is omitted it defaults to `{ childList: true,
 * subtree: true }` (watch added/removed descendants) — `MutationObserver` throws
 * if asked to observe with no active option, so a sensible default is supplied.
 * Null-safe: a missing target, an empty match, or an environment without
 * `MutationObserver` yields a no-op cleanup.
 *
 * @param {string|Element|NodeList|Element[]} target - What to observe
 * @param {MutationCallback} callback - Native MO callback
 * @param {MutationObserverInit} [options] - Native MO options
 * @returns {Function} Cleanup function that disconnects the observer
 */
export const onMutation = (target, callback, options) => {
  if (typeof MutationObserver === 'undefined') {
    return () => {};
  }
  const elements = toElements(target);
  if (elements.length === 0) {
    return () => {};
  }
  const observer = new MutationObserver(callback);
  const opts = options || { childList: true, subtree: true };
  elements.forEach((el) => observer.observe(el, opts));
  return () => observer.disconnect();
};
