export { Maybe } from './core/maybe.js';
export { Either } from './core/either.js';
export { ArrayTransform } from './core/arrayTransform.js';
export { scrollManager } from './dom/scrollManager.js';
export { isInView, createInViewChecker } from './dom/isInView.js';
export { flatten, flattenWith } from './data/flatten.js';
export { path, getPath, makePath } from './data/path.js';
export { setPath, updatePath, dissocPath, getPathMaybe, getPathOr } from './data/update.js';
export {
  lens, lensProp, lensPath, lensIndex, view, set, over, composeLens,
} from './data/lens.js';
export { unflatten, pick, omit, mergeDeep, mergeDeepWith } from './data/transform.js';
export { IO } from './async/io.js';
export { Task } from './async/task.js';
export { 
  getElement, 
  getElements, 
  addClass, 
  addEvent,
  removeClass, 
  toggleClass 
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
// export * as advanced from './advanced/index.js';
