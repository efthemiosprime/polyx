// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { ArrayTransform } from './arrayTransform.js';

const makeList = (n) => {
  const ul = document.createElement('ul');
  ul.innerHTML = Array.from({ length: n }, (_, i) => `<li>item-${i}</li>`).join('');
  return ul;
};

describe('ArrayTransform with DOM collections', () => {
  it('wraps a static NodeList from querySelectorAll', () => {
    const ul = makeList(3);
    expect(ArrayTransform.from(ul.querySelectorAll('li')).toArray().map((li) => li.textContent))
      .toEqual(['item-0', 'item-1', 'item-2']);
  });

  it('maps over children elements', () => {
    const ul = makeList(3);
    const texts = ArrayTransform.from(ul.children)
      .map((li) => li.textContent.toUpperCase())
      .toArray();
    expect(texts).toEqual(['ITEM-0', 'ITEM-1', 'ITEM-2']);
  });

  // Regression guard: the source must be snapshotted ONCE. Previously each method
  // re-ran Array.from(source), so a live HTMLCollection (el.children) changed
  // under the wrapper whenever the DOM mutated.
  it('snapshots a live HTMLCollection so it does not change when the DOM mutates', () => {
    const ul = makeList(3);
    const items = ArrayTransform.from(ul.children); // live HTMLCollection

    expect(items.value.length).toBe(3);

    ul.removeChild(ul.firstElementChild); // mutate the DOM after construction

    expect(items.toArray().length).toBe(3); // still 3 — snapshot held
    expect(items.value.length).toBe(3);
    expect(items.map((li) => li.textContent).toArray().length).toBe(3);
  });

  it('toArray() returns a copy that cannot mutate the wrapper', () => {
    const ul = makeList(2);
    const items = ArrayTransform.from(ul.children);
    const out = items.toArray();
    out.push('extra');
    expect(items.toArray().length).toBe(2);
    expect(items.value.length).toBe(2);
  });
});
