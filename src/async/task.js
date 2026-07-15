/**
 * Task - Lazy, composable asynchronous computations
 *
 * Unlike a Promise, a Task does nothing until you `fork` it. This keeps
 * asynchronous computations referentially transparent and composable: you can
 * `map`/`chain` over the eventual value without triggering the effect, then run
 * it once at the edge of your program with `fork(onRejected, onResolved)`.
 *
 * The computation receives its callbacks in `(reject, resolve)` order, matching
 * the Folktale/Fluture convention (failure first).
 */

/**
 * Creates a Task from a computation function.
 *
 * @param {(reject: Function, resolve: Function) => void} computation
 *        Function that eventually calls `reject(error)` or `resolve(value)`.
 * @returns {Object} Task instance
 */
export const Task = (computation) => ({
  /**
   * Run the Task, handling both the rejection and resolution branches.
   * This is the only method that actually performs the effect.
   *
   * @param {Function} onRejected - Called with the error if the Task rejects
   * @param {Function} onResolved - Called with the value if the Task resolves
   */
  fork: (onRejected, onResolved) => computation(onRejected, onResolved),

  /**
   * Transform the eventual success value. Does not run the Task.
   *
   * @param {Function} f - Function applied to the resolved value
   * @returns {Object} A new Task
   */
  map: (f) =>
    Task((reject, resolve) =>
      computation(reject, (value) => resolve(f(value)))
    ),

  /**
   * Transform the eventual error value. Does not run the Task.
   *
   * @param {Function} f - Function applied to the rejected value
   * @returns {Object} A new Task
   */
  mapRejected: (f) =>
    Task((reject, resolve) =>
      computation((error) => reject(f(error)), resolve)
    ),

  /**
   * Sequence another Task-returning function after this one. Does not run the Task.
   *
   * @param {Function} f - Function that takes the resolved value and returns a Task
   * @returns {Object} A new Task
   */
  flatMap: (f) =>
    Task((reject, resolve) =>
      computation(reject, (value) => f(value).fork(reject, resolve))
    ),

  /**
   * Alias for flatMap to match standard monad naming.
   *
   * @param {Function} f - Function that takes the resolved value and returns a Task
   * @returns {Object} A new Task
   */
  chain(f) {
    return this.flatMap(f);
  },

  /**
   * Applicative apply: applies a Task of a function to this Task of a value.
   * Runs both computations (this one for the function, `taskOfValue` for the value).
   *
   * @param {Object} taskOfValue - A Task resolving to the argument value
   * @returns {Object} A new Task resolving to the applied result
   */
  ap: (taskOfValue) =>
    Task((reject, resolve) =>
      computation(reject, (f) =>
        taskOfValue.fork(reject, (value) => resolve(f(value)))
      )
    ),

  /**
   * Recover from a rejection by switching to another Task.
   *
   * @param {Function} handler - Takes the error and returns a Task
   * @returns {Object} A new Task
   */
  orElse: (handler) =>
    Task((reject, resolve) =>
      computation((error) => handler(error).fork(reject, resolve), resolve)
    ),
});

/**
 * Creates a Task that immediately resolves with a value.
 *
 * @param {*} value - The value to resolve with
 * @returns {Object} A resolved Task
 */
Task.of = (value) => Task((_, resolve) => resolve(value));

/**
 * Alias for Task.of.
 */
Task.resolved = Task.of;

/**
 * Creates a Task that immediately rejects with an error.
 *
 * @param {*} error - The error to reject with
 * @returns {Object} A rejected Task
 */
Task.rejected = (error) => Task((reject) => reject(error));

/**
 * Lifts a Promise-returning function (or a Promise factory) into a Task.
 * The factory is invoked lazily on fork, preserving Task semantics.
 *
 * @param {() => Promise<*>} promiseFn - Function that returns a Promise
 * @returns {Object} A Task wrapping the Promise
 */
Task.fromPromise = (promiseFn) =>
  Task((reject, resolve) => {
    try {
      Promise.resolve(promiseFn()).then(resolve, reject);
    } catch (e) {
      reject(e);
    }
  });

/**
 * Runs a Task and returns a Promise of its result.
 *
 * @param {Object} task - The Task to run
 * @returns {Promise<*>} A Promise that resolves/rejects with the Task's outcome
 */
Task.toPromise = (task) =>
  new Promise((resolve, reject) => task.fork(reject, resolve));

// Examples:
//
// // Nothing runs until fork:
// const fetchUser = id =>
//   Task((reject, resolve) =>
//     fetch(`/api/users/${id}`)
//       .then(res => res.ok ? res.json() : Promise.reject(new Error('Failed')))
//       .then(resolve, reject)
//   );
//
// fetchUser(123)
//   .map(user => user.name)
//   .fork(
//     err => console.error('Error:', err.message),
//     name => console.log('User name:', name)
//   );
