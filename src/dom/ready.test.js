// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { ready } from './ready.js';

const setReadyState = (value) => {
  Object.defineProperty(document, 'readyState', {
    configurable: true,
    get: () => value,
  });
};

describe('ready', () => {
  it('is lazy — does nothing until forked', () => {
    setReadyState('loading');
    const addSpy = vi.spyOn(document, 'addEventListener');

    ready(); // not forked

    expect(addSpy).not.toHaveBeenCalledWith('DOMContentLoaded', expect.anything());
    addSpy.mockRestore();
  });

  it('resolves immediately with document when already parsed', () => {
    setReadyState('complete');
    const onResolved = vi.fn();

    ready().fork(vi.fn(), onResolved);

    expect(onResolved).toHaveBeenCalledWith(document);
  });

  it('waits for DOMContentLoaded when still loading, then resolves', () => {
    setReadyState('loading');
    const onResolved = vi.fn();

    ready().fork(vi.fn(), onResolved);
    expect(onResolved).not.toHaveBeenCalled();

    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(onResolved).toHaveBeenCalledWith(document);
  });

  it('removes its own listener after firing (resolves once)', () => {
    setReadyState('loading');
    const onResolved = vi.fn();

    ready().fork(vi.fn(), onResolved);
    document.dispatchEvent(new Event('DOMContentLoaded'));
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(onResolved).toHaveBeenCalledTimes(1);
  });
});
