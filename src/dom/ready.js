import { Task } from '../async/task.js';

/**
 * A `Task` that resolves once the DOM is ready to be queried/enhanced.
 *
 * Bridges DOM-ready into the library's async story: like every `Task`, it does
 * nothing until you `fork` it. If the document has already finished parsing
 * (`readyState !== 'loading'`) it resolves on the next fork immediately;
 * otherwise it resolves on the first `DOMContentLoaded`, removing its own
 * listener. It never rejects — the error channel is `never`. Resolves with the
 * `document` so you can chain straight into a query.
 *
 * @example
 * ready().fork(
 *   () => {},                       // never called
 *   (doc) => enhance(doc.querySelectorAll('[data-widget]'))
 * );
 *
 * @returns {import('../async/task.js').Task} Task<never, Document>
 */
export const ready = () =>
  Task((_reject, resolve) => {
    if (typeof document === 'undefined') {
      // No DOM (e.g. SSR) — nothing to wait for.
      resolve(undefined);
      return;
    }
    if (document.readyState !== 'loading') {
      resolve(document);
      return;
    }
    const onReady = () => {
      document.removeEventListener('DOMContentLoaded', onReady);
      resolve(document);
    };
    document.addEventListener('DOMContentLoaded', onReady);
  });
