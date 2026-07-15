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
