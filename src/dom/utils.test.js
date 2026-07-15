// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { on, setStyle, getStyle, setHtml, setText } from './utils.js';

describe('on', () => {
  it('attaches the listener and fires it on the event', () => {
    const el = document.createElement('button');
    const handler = vi.fn();

    on('click', handler)(el);
    el.dispatchEvent(new Event('click'));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('returns a cleanup function that removes the listener', () => {
    const el = document.createElement('button');
    const handler = vi.fn();

    const cleanup = on('click', handler)(el);
    cleanup();
    el.dispatchEvent(new Event('click'));

    expect(handler).not.toHaveBeenCalled();
  });

  it('forwards listener options (e.g. once)', () => {
    const el = document.createElement('button');
    const handler = vi.fn();

    on('click', handler, { once: true })(el);
    el.dispatchEvent(new Event('click'));
    el.dispatchEvent(new Event('click'));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('is null-safe: a missing element is a no-op returning a callable cleanup', () => {
    const handler = vi.fn();

    const cleanupNull = on('click', handler)(null);
    const cleanupUndef = on('click', handler)(undefined);

    expect(typeof cleanupNull).toBe('function');
    expect(typeof cleanupUndef).toBe('function');
    // Calling the no-op cleanup must not throw.
    expect(() => { cleanupNull(); cleanupUndef(); }).not.toThrow();
  });
});

describe('newly-exported utils', () => {
  it('setStyle sets a style property and returns the element in a Maybe', () => {
    const el = document.createElement('div');
    const result = setStyle('color', 'red')(el).getOrElse(null);

    expect(el.style.color).toBe('red');
    expect(result).toBe(el);
  });

  it('getStyle reads a computed style property', () => {
    const el = document.createElement('div');
    el.style.display = 'none';
    const value = getStyle('display')(el).getOrElse(null);

    expect(value).toBe('none');
  });

  it('setHtml sets innerHTML', () => {
    const el = document.createElement('div');
    setHtml('<span>hi</span>')(el);

    expect(el.innerHTML).toBe('<span>hi</span>');
  });

  it('setText sets textContent', () => {
    const el = document.createElement('div');
    setText('hello')(el);

    expect(el.textContent).toBe('hello');
  });

  it('the setters are null-safe (return Nothing, no throw)', () => {
    expect(() => setStyle('color', 'red')(null)).not.toThrow();
    expect(setHtml('x')(null).getOrElse('nothing')).toBe('nothing');
  });
});
