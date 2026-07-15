export { Maybe } from './core/maybe.js';
export { Either } from './core/either.js';
export { Validation } from './core/validation.js';
export { ArrayTransform } from './core/arrayTransform.js';
export { scrollManager } from './dom/scrollManager.js';
export { isInView, createInViewChecker } from './dom/isInView.js';
export { onIntersect, onResize, onMutation } from './dom/observers.js';
export { ready } from './dom/ready.js';
export { domIO, create } from './dom/domIO.js';
export { flatten, flattenWith } from './data/flatten.js';
export { path, getPath, makePath } from './data/path.js';
export { setPath, updatePath, dissocPath, getPathMaybe, getPathOr } from './data/update.js';
export {
  lens, lensProp, lensPath, lensIndex, view, set, over, composeLens,
} from './data/lens.js';
export { unflatten, pick, omit, mergeDeep, mergeDeepWith } from './data/transform.js';
export { IO } from './async/io.js';
export { Task } from './async/task.js';
export { createState } from './state/createState.js';
export { createQueryClient } from './query/createQueryClient.js';
export { fetchJson, gqlFetcher } from './query/fetchers.js';
export {
  getElement,
  getElements,
  addClass,
  addEvent,
  on,
  delegate,
  removeClass,
  toggleClass,
  setStyle,
  getStyle,
  setHtml,
  setText
} from './dom/utils.js';

export {
  compose,
  tap,
  pipe,
  curry,
  when,
  ifElse,
  evolve,
  identity,
  always,
  complement
} from './core/compose.js';


// Re-export full modules for dynamic imports
export * as data from './data/index.js';
export * as core from './core/index.js';
export * as dom from './dom/index.js';
export * as async from './async/index.js';
export * as state from './state/index.js';
export * as query from './query/index.js';
// export * as advanced from './advanced/index.js';
