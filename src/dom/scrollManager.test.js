import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scrollManager } from './scrollManager.js';

let mockY = 0;

let origRAF;
let rafQueue = [];

// Queue rAF callbacks and flush them explicitly. This preserves the manager's
// real `ticking` ordering (schedule → ticking=true → deferred callback resets
// it), which a synchronous rAF stub would break.
const flushRAF = () => {
  const queued = rafQueue;
  rafQueue = [];
  queued.forEach((cb) => cb());
};

beforeEach(() => {
  mockY = 0;
  rafQueue = [];
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    get: () => mockY,
  });
  origRAF = globalThis.requestAnimationFrame;
  const queueRAF = (cb) => rafQueue.push(cb);
  globalThis.requestAnimationFrame = queueRAF;
  window.requestAnimationFrame = queueRAF;
});

afterEach(() => {
  scrollManager.resetAllOneTimeTriggers();
  globalThis.requestAnimationFrame = origRAF;
  window.requestAnimationFrame = origRAF;
});

const scrollTo = (y) => {
  mockY = y;
  window.dispatchEvent(new Event('scroll'));
  flushRAF(); // run the notify tick
};

describe('scrollManager', () => {
  it('subscribe returns an unsubscribe function', () => {
    const unsub = scrollManager.subscribe(() => {});
    expect(typeof unsub).toBe('function');
    unsub();
  });

  it('rejects non-function subscribers', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const unsub = scrollManager.subscribe('not a fn');
    expect(typeof unsub).toBe('function');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('reports direction "down" after scrolling down', () => {
    const unsub = scrollManager.subscribe(() => {});
    scrollTo(100);
    expect(scrollManager.getScrollPosition().direction).toBe('down');
    unsub();
  });

  it('reports direction "up" after scrolling up', () => {
    const unsub = scrollManager.subscribe(() => {});
    scrollTo(300);
    scrollTo(150);
    expect(scrollManager.getScrollPosition().direction).toBe('up');
    unsub();
  });

  // Regression guard: reading position must NOT mutate the direction baseline.
  // Previously detectScrollDirection() advanced lastScrollY on every read, so a
  // getScrollPosition() call right after a down-scroll flipped the reported
  // direction to "up".
  it('getScrollPosition() is a stable, side-effect-free read', () => {
    const unsub = scrollManager.subscribe(() => {});
    scrollTo(100);
    const first = scrollManager.getScrollPosition().direction;
    const second = scrollManager.getScrollPosition().direction;
    const third = scrollManager.getScrollPosition().direction;
    expect([first, second, third]).toEqual(['down', 'down', 'down']);
    unsub();
  });

  it('notifies subscribers with scroll data on scroll', () => {
    const cb = vi.fn();
    const unsub = scrollManager.subscribe(cb);
    scrollTo(200);
    expect(cb).toHaveBeenCalled();
    expect(cb.mock.calls[0][0]).toMatchObject({ y: 200, direction: 'down' });
    unsub();
  });

  it('addOneTimeTrigger returns a trigger id and removeOneTimeTrigger cleans it up', () => {
    const id = scrollManager.addOneTimeTrigger({ direction: 'down', callback: () => {} });
    expect(typeof id).toBe('string');
    scrollManager.removeOneTimeTrigger(id);
  });
});
