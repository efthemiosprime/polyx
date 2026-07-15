// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scrollManager } from './scrollManager.js';

let mockY = 0;

let origRAF;
let origCancelRAF;
let rafQueue = []; // [{ id, cb }]
let rafSeq = 0;

// Queue rAF callbacks and flush them explicitly. This preserves the manager's
// real `ticking` ordering (schedule -> ticking=true -> deferred callback resets
// it) and lets us assert that stop() actually cancels a queued frame.
const flushRAF = () => {
  const queued = rafQueue;
  rafQueue = [];
  queued.forEach((e) => e.cb());
};

beforeEach(() => {
  mockY = 0;
  rafQueue = [];
  rafSeq = 0;
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    get: () => mockY,
  });

  origRAF = globalThis.requestAnimationFrame;
  origCancelRAF = globalThis.cancelAnimationFrame;
  const queueRAF = (cb) => {
    const id = ++rafSeq;
    rafQueue.push({ id, cb });
    return id;
  };
  const cancelRAF = (id) => {
    rafQueue = rafQueue.filter((e) => e.id !== id);
  };
  globalThis.requestAnimationFrame = queueRAF;
  window.requestAnimationFrame = queueRAF;
  globalThis.cancelAnimationFrame = cancelRAF;
  window.cancelAnimationFrame = cancelRAF;
});

afterEach(() => {
  scrollManager.resetAllOneTimeTriggers();
  globalThis.requestAnimationFrame = origRAF;
  window.requestAnimationFrame = origRAF;
  globalThis.cancelAnimationFrame = origCancelRAF;
  window.cancelAnimationFrame = origCancelRAF;
});

// Dispatch a scroll and run the throttled frame.
const scrollTo = (y) => {
  mockY = y;
  window.dispatchEvent(new Event('scroll'));
  flushRAF();
};

// Dispatch a scroll WITHOUT running the frame (leaves a queued rAF pending).
const scrollNoFlush = (y) => {
  mockY = y;
  window.dispatchEvent(new Event('scroll'));
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

  it('coalesces a burst of scroll events into a single notify per frame', () => {
    const cb = vi.fn();
    const unsub = scrollManager.subscribe(cb);
    scrollNoFlush(50);
    scrollNoFlush(100);
    scrollNoFlush(150); // three events, one queued frame
    expect(rafQueue.length).toBe(1);
    flushRAF();
    expect(cb).toHaveBeenCalledTimes(1);
    unsub();
  });

  // Cleanup regression: stop() must cancel the in-flight frame and clear the
  // ticking guard so a later subscribe still works.
  it('cancels the pending frame on stop and resumes cleanly', () => {
    const cb = vi.fn();
    const unsub = scrollManager.subscribe(cb);
    scrollNoFlush(100); // queue a frame, do not run it
    expect(rafQueue.length).toBe(1);

    unsub(); // -> stop() -> cancelAnimationFrame
    expect(rafQueue.length).toBe(0);
    flushRAF();
    expect(cb).not.toHaveBeenCalled();

    // Ticking must not be wedged: a fresh subscription still gets notified.
    const cb2 = vi.fn();
    const unsub2 = scrollManager.subscribe(cb2);
    scrollTo(200);
    expect(cb2).toHaveBeenCalledTimes(1);
    unsub2();
  });

  it('addOneTimeTrigger returns a trigger id and removeOneTimeTrigger cleans it up', () => {
    const id = scrollManager.addOneTimeTrigger({ direction: 'down', callback: () => {} });
    expect(typeof id).toBe('string');
    scrollManager.removeOneTimeTrigger(id);
  });
});

describe('scrollManager one-time triggers', () => {
  it('fires once when scrolling its direction, not again while still triggered', () => {
    const cb = vi.fn();
    const id = scrollManager.addOneTimeTrigger({
      direction: 'down',
      callback: cb,
      resetOnStop: false,
    });
    scrollTo(100); // down -> fire
    expect(cb).toHaveBeenCalledTimes(1);
    scrollTo(200); // still down, already fired
    expect(cb).toHaveBeenCalledTimes(1);
    scrollManager.removeOneTimeTrigger(id);
  });

  it('re-arms a triggered trigger after resetDelay', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const cb = vi.fn();
    const id = scrollManager.addOneTimeTrigger({
      direction: 'down',
      callback: cb,
      resetOnStop: true,
      resetDelay: 1000,
      requireActualScroll: false,
    });
    scrollTo(100); // fire (1)
    scrollTo(200); // down, already fired -> re-arm reset
    expect(cb).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1001); // reset -> hasTriggered=false
    scrollTo(300); // down -> fire (2)
    expect(cb).toHaveBeenCalledTimes(2);
    scrollManager.removeOneTimeTrigger(id);
    vi.useRealTimers();
  });

  it('clears the pending reset timer when the trigger is removed', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const cb = vi.fn();
    const id = scrollManager.addOneTimeTrigger({
      direction: 'down',
      callback: cb,
      resetOnStop: true,
      resetDelay: 1000,
      requireActualScroll: false,
    });
    scrollTo(100); // fire, arm reset timer
    scrollManager.removeOneTimeTrigger(id);
    vi.advanceTimersByTime(2000); // reset would have fired if not cleared
    // Trigger is gone; scrolling must not fire it again.
    scrollTo(200);
    expect(cb).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('re-fires an opposite trigger when the direction reverses', () => {
    const cb = vi.fn();
    const id = scrollManager.addOneTimeTrigger({
      direction: 'up',
      callback: cb,
      resetOnStop: false,
      requireActualScroll: false,
      debounceInterval: 0,
    });
    scrollTo(300); // down -> no fire (mismatch)
    scrollTo(100); // up -> fire (1)
    expect(cb).toHaveBeenCalledTimes(1);
    scrollTo(300); // down -> opposite reverses the trigger
    scrollTo(50); // up -> fire (2)
    expect(cb).toHaveBeenCalledTimes(2);
    scrollManager.removeOneTimeTrigger(id);
  });
});

describe('scrollManager subscriber rate limiting', () => {
  it('throttles a subscriber to the leading edge plus one trailing call', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(100000); // large clock so the leading edge fires immediately
    const cb = vi.fn();
    const unsub = scrollManager.subscribe(cb, { throttle: 100 });
    scrollTo(10); // leading -> 1
    scrollTo(20); // within window -> schedule trailing
    scrollTo(30);
    expect(cb).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(150); // trailing -> 2
    expect(cb).toHaveBeenCalledTimes(2);
    unsub();
    vi.useRealTimers();
  });

  it('debounces a subscriber until scrolling pauses', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const cb = vi.fn();
    const unsub = scrollManager.subscribe(cb, { debounce: 100 });
    scrollTo(10);
    scrollTo(20);
    scrollTo(30);
    expect(cb).not.toHaveBeenCalled(); // still scrolling
    vi.advanceTimersByTime(120); // paused
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0]).toMatchObject({ y: 30 });
    unsub();
    vi.useRealTimers();
  });

  it('unsubscribe cancels a pending debounced call (no leaked timer)', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const cb = vi.fn();
    const unsub = scrollManager.subscribe(cb, { debounce: 100 });
    scrollTo(10); // schedule debounced call
    unsub(); // must cancel it
    vi.advanceTimersByTime(200);
    expect(cb).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
