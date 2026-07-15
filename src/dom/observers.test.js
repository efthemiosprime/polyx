// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { onIntersect } from './observers.js';

// jsdom (v29) does not implement IntersectionObserver, so we stub the global —
// the same pattern scrollManager.test.js uses to stub requestAnimationFrame.
// The stub records observe/disconnect and lets a test drive the callback.
let instances;
let origIO;

class FakeIntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.observed = [];
    this.disconnected = false;
    instances.push(this);
  }
  observe(el) { this.observed.push(el); }
  disconnect() { this.disconnected = true; }
  // test helper — fire the callback as the browser would
  trigger(entries) { this.callback(entries, this); }
}

beforeEach(() => {
  instances = [];
  origIO = globalThis.IntersectionObserver;
  globalThis.IntersectionObserver = FakeIntersectionObserver;
});

afterEach(() => {
  globalThis.IntersectionObserver = origIO;
});

describe('onIntersect', () => {
  it('observes a single element and passes native options through', () => {
    const el = document.createElement('div');
    const cb = vi.fn();

    onIntersect(el, cb, { threshold: 0.5 });

    expect(instances).toHaveLength(1);
    expect(instances[0].observed).toEqual([el]);
    expect(instances[0].options).toEqual({ threshold: 0.5 });
  });

  it('resolves a selector to all matching elements', () => {
    document.body.innerHTML = '<p class="reveal"></p><p class="reveal"></p>';
    const cb = vi.fn();

    onIntersect('.reveal', cb);

    expect(instances[0].observed).toHaveLength(2);
  });

  it('observes each element of a NodeList / array', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const cb = vi.fn();

    onIntersect([a, b], cb);

    expect(instances[0].observed).toEqual([a, b]);
  });

  it('invokes the callback with native (entries, observer)', () => {
    const el = document.createElement('div');
    const cb = vi.fn();

    onIntersect(el, cb);
    const entries = [{ target: el, isIntersecting: true }];
    instances[0].trigger(entries);

    expect(cb).toHaveBeenCalledWith(entries, instances[0]);
  });

  it('cleanup disconnects the observer', () => {
    const el = document.createElement('div');
    const cleanup = onIntersect(el, vi.fn());

    cleanup();

    expect(instances[0].disconnected).toBe(true);
  });

  it('is a no-op cleanup when the selector matches nothing', () => {
    const cleanup = onIntersect('.nope', vi.fn());

    expect(instances).toHaveLength(0);
    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
  });

  it('is a no-op when IntersectionObserver is unavailable', () => {
    globalThis.IntersectionObserver = undefined;
    const cleanup = onIntersect(document.createElement('div'), vi.fn());

    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
  });
});
