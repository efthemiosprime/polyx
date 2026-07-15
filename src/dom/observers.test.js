// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { onIntersect, onResize, onMutation } from './observers.js';

// jsdom (v29) does not implement IntersectionObserver, so we stub the global —
// the same pattern scrollManager.test.js uses to stub requestAnimationFrame.
// The stub records observe/disconnect and lets a test drive the callback.
let instances;
let resizeInstances;
let origIO;
let origRO;

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

// jsdom also lacks ResizeObserver — stub it the same way. observe() records the
// (element, options) pairs so we can assert per-element options pass through.
class FakeResizeObserver {
  constructor(callback) {
    this.callback = callback;
    this.observed = [];
    this.disconnected = false;
    resizeInstances.push(this);
  }
  observe(el, options) { this.observed.push([el, options]); }
  disconnect() { this.disconnected = true; }
  trigger(entries) { this.callback(entries, this); }
}

beforeEach(() => {
  instances = [];
  resizeInstances = [];
  origIO = globalThis.IntersectionObserver;
  origRO = globalThis.ResizeObserver;
  globalThis.IntersectionObserver = FakeIntersectionObserver;
  globalThis.ResizeObserver = FakeResizeObserver;
});

afterEach(() => {
  globalThis.IntersectionObserver = origIO;
  globalThis.ResizeObserver = origRO;
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

describe('onResize', () => {
  it('observes each element and passes per-element options through', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const cb = vi.fn();

    onResize([a, b], cb, { box: 'border-box' });

    expect(resizeInstances).toHaveLength(1);
    expect(resizeInstances[0].observed).toEqual([
      [a, { box: 'border-box' }],
      [b, { box: 'border-box' }],
    ]);
  });

  it('invokes the callback with native (entries, observer)', () => {
    const el = document.createElement('div');
    const cb = vi.fn();

    onResize(el, cb);
    const entries = [{ target: el, contentRect: {} }];
    resizeInstances[0].trigger(entries);

    expect(cb).toHaveBeenCalledWith(entries, resizeInstances[0]);
  });

  it('cleanup disconnects the observer', () => {
    const cleanup = onResize(document.createElement('div'), vi.fn());
    cleanup();
    expect(resizeInstances[0].disconnected).toBe(true);
  });

  it('is a no-op when ResizeObserver is unavailable', () => {
    globalThis.ResizeObserver = undefined;
    const cleanup = onResize(document.createElement('div'), vi.fn());

    expect(resizeInstances).toHaveLength(0);
    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
  });
});

// onMutation uses the REAL MutationObserver — jsdom implements it. Its callback
// fires in a microtask after the mutation, so these tests await.
describe('onMutation', () => {
  it('fires on a childList mutation with the default options', async () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const records = await new Promise((resolve) => {
      onMutation(parent, (mutations) => resolve(mutations));
      parent.appendChild(document.createElement('span'));
    });

    expect(records.length).toBeGreaterThan(0);
    expect(records[0].type).toBe('childList');
  });

  it('cleanup disconnects so later mutations do not fire', async () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    const cb = vi.fn();

    const cleanup = onMutation(parent, cb);
    cleanup();
    parent.appendChild(document.createElement('span'));
    await new Promise((r) => setTimeout(r, 0));

    expect(cb).not.toHaveBeenCalled();
  });

  it('is a no-op cleanup when the target matches nothing', () => {
    const cleanup = onMutation('.nope', vi.fn());
    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
  });
});
