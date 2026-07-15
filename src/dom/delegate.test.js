// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { delegate } from './utils.js';

const mount = (html) => {
  const parent = document.createElement('div');
  parent.innerHTML = html;
  document.body.appendChild(parent);
  return parent;
};

describe('delegate', () => {
  it('fires the handler for events from a matching descendant', () => {
    const parent = mount('<ul><li class="item"><span>x</span></li></ul>');
    const handler = vi.fn();

    delegate(parent, 'click', '.item', handler);
    parent.querySelector('span').dispatchEvent(new Event('click', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    // Second arg is the matched ancestor, not the raw event target.
    const [, matched] = handler.mock.calls[0];
    expect(matched).toBe(parent.querySelector('.item'));
  });

  it('ignores events from non-matching descendants', () => {
    const parent = mount('<ul><li class="item">a</li><li class="other">b</li></ul>');
    const handler = vi.fn();

    delegate(parent, 'click', '.item', handler);
    parent.querySelector('.other').dispatchEvent(new Event('click', { bubbles: true }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('covers elements added AFTER the listener is attached', () => {
    const parent = mount('<ul></ul>');
    const handler = vi.fn();

    delegate(parent, 'click', '.item', handler);

    const li = document.createElement('li');
    li.className = 'item';
    parent.querySelector('ul').appendChild(li);
    li.dispatchEvent(new Event('click', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('cleanup removes the delegated listener', () => {
    const parent = mount('<ul><li class="item">a</li></ul>');
    const handler = vi.fn();

    const cleanup = delegate(parent, 'click', '.item', handler);
    cleanup();
    parent.querySelector('.item').dispatchEvent(new Event('click', { bubbles: true }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('is null-safe for a missing parent', () => {
    const handler = vi.fn();
    const cleanup = delegate(null, 'click', '.item', handler);

    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
  });
});
