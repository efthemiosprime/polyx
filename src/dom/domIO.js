import { IO } from '../async/io.js';

/**
 * Pure, lazy DOM operations.
 *
 * The eager helpers in `utils.js` perform their mutation immediately inside a
 * `Maybe.map`, which is convenient but impure. This namespace is the referentially
 * transparent counterpart: every op is `(element) => IO<element>` — it *describes*
 * a DOM effect and does nothing until you call `.run()`. Because each op both
 * takes and (through the IO) yields the element, they chain cleanly off a `query`
 * source via `IO.chain`:
 *
 * @example
 * import { domIO } from '@efthemiosprime/polyx/dom';
 * const { query, addClass, setText } = domIO;
 *
 * const program = query('#save')
 *   .chain(addClass('is-active'))   // (el) => IO<el>
 *   .chain(setText('Saved'));       // still pure — nothing has run yet
 *
 * program.run();                    // now the effects happen, once
 *
 * Every op is null-safe: if the element is `null`/`undefined` (e.g. `query`
 * matched nothing), the effect is skipped and the IO yields the same nullish
 * value, so a chain never throws.
 */

/**
 * Lifts a plain element mutation into `(element) => IO<element>`, skipping the
 * effect (but preserving the value) when the element is nullish.
 * @private
 */
const effect = (fn) => (element) =>
  IO(() => {
    if (element == null) return element;
    fn(element);
    return element;
  });

export const domIO = {
  /** Query one element as a pure `IO<Element | null>` — a source for chains. */
  query: (selector, parent) =>
    IO(() => (parent || document).querySelector(selector)),

  /** Query all elements as a pure `IO<Element[]>`. */
  queryAll: (selector, parent) =>
    IO(() => Array.from((parent || document).querySelectorAll(selector))),

  addClass: (className) => effect((el) => el.classList.add(className)),
  removeClass: (className) => effect((el) => el.classList.remove(className)),
  toggleClass: (className, force) =>
    effect((el) => el.classList.toggle(className, force)),
  setStyle: (property, value) => effect((el) => { el.style[property] = value; }),
  setHtml: (html) => effect((el) => { el.innerHTML = html; }),
  setText: (text) => effect((el) => { el.textContent = text; }),
  setAttr: (name, value) => effect((el) => el.setAttribute(name, value)),
  removeAttr: (name) => effect((el) => el.removeAttribute(name)),
  remove: () => effect((el) => el.remove()),
};

/**
 * Constructs a DOM element functionally, as a pure `IO<Element>` — nothing is
 * created until `.run()`.
 *
 * `props` is applied intelligently:
 * - `class` / `className` → `el.className`
 * - `style` (object) → merged into `el.style`
 * - `dataset` (object) → merged into `el.dataset`
 * - `text` / `textContent` → `el.textContent`
 * - `html` / `innerHTML` → `el.innerHTML`
 * - `onClick`, `onInput`, … (function) → `addEventListener('click', …)`
 * - `true` → boolean attribute set to `""`; `false`/`null`/`undefined` → skipped
 * - anything else → `setAttribute(key, value)`
 *
 * `children` may be a single string/Node or an array of them; nullish/`false`
 * children are skipped.
 *
 * @example
 * create('button', { class: 'btn', onClick: save }, ['Save']).run();
 *
 * @param {string} tag - Tag name
 * @param {Object} [props] - Properties/attributes to apply
 * @param {(string|Node)|(string|Node)[]} [children] - Child text/nodes
 * @returns {import('../async/io.js').IO} IO<Element>
 */
export const create = (tag, props = {}, children = []) =>
  IO(() => {
    const el = document.createElement(tag);

    for (const [key, value] of Object.entries(props)) {
      if (key === 'class' || key === 'className') {
        el.className = value;
      } else if (key === 'style' && value && typeof value === 'object') {
        Object.assign(el.style, value);
      } else if (key === 'dataset' && value && typeof value === 'object') {
        Object.assign(el.dataset, value);
      } else if (key === 'text' || key === 'textContent') {
        el.textContent = value;
      } else if (key === 'html' || key === 'innerHTML') {
        el.innerHTML = value;
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (value === true) {
        el.setAttribute(key, '');
      } else if (value === false || value == null) {
        // skip falsy/absent attributes
      } else {
        el.setAttribute(key, value);
      }
    }

    const kids = Array.isArray(children) ? children : [children];
    for (const child of kids) {
      if (child == null || child === false) continue;
      el.append(child);
    }

    return el;
  });
