import { describe, it, expect, vi } from 'vitest';
import { createState } from './createState.js';

describe('createState — [state, setState] tuple', () => {
  it('destructures like React and reads via the getter', () => {
    const [count] = createState(0);
    expect(count()).toBe(0);
  });

  it('setState replaces the value', () => {
    const [count, setCount] = createState(0);
    setCount(5);
    expect(count()).toBe(5);
  });

  it('setState accepts an updater function of the previous value', () => {
    const [count, setCount] = createState(0);
    setCount((n) => n + 1);
    setCount((n) => n + 1);
    expect(count()).toBe(2);
  });

  it('composes with data-style updaters (prev => next)', () => {
    const [state, setState] = createState({ user: { name: 'ada', hits: 0 } });
    // Exactly the shape setPath / updatePath / over(lens, …) return.
    setState((s) => ({ ...s, user: { ...s.user, name: s.user.name.toUpperCase() } }));
    expect(state().user.name).toBe('ADA');
  });
});

describe('createState — subscription', () => {
  it('notifies subscribers with the new value on change', () => {
    const [, setCount] = createState(0);
    const store = createState(0);
    const listener = vi.fn();

    store.subscribe(listener);
    store.set(3);

    expect(listener).toHaveBeenCalledWith(3);
  });

  it('subscribe returns an unsubscribe that stops notifications', () => {
    const store = createState(0);
    const listener = vi.fn();

    const off = store.subscribe(listener);
    store.set(1);
    off();
    store.set(2);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(1);
  });

  it('does NOT notify when the value is unchanged (Object.is bail-out)', () => {
    const store = createState(7);
    const listener = vi.fn();

    store.subscribe(listener);
    store.set(7);          // same value
    store.set((n) => n);   // same value via updater

    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies every subscriber', () => {
    const store = createState(0);
    const a = vi.fn();
    const b = vi.fn();
    store.subscribe(a);
    store.subscribe(b);
    store.set(1);
    expect(a).toHaveBeenCalledWith(1);
    expect(b).toHaveBeenCalledWith(1);
  });

  it('is safe when a subscriber unsubscribes during notification', () => {
    const store = createState(0);
    const off1 = store.subscribe(() => off1()); // removes itself mid-dispatch
    const second = vi.fn();
    store.subscribe(second);

    expect(() => store.set(1)).not.toThrow();
    expect(second).toHaveBeenCalledWith(1);
  });

  it('ignores a non-function subscriber and returns a no-op cleanup', () => {
    const store = createState(0);
    const off = store.subscribe(null);
    expect(typeof off).toBe('function');
    expect(() => off()).not.toThrow();
  });
});

describe('createState — object API', () => {
  it('exposes get / set / subscribe alongside the tuple', () => {
    const store = createState(1);
    expect(store.get()).toBe(1);
    store.set(2);
    expect(store.get()).toBe(2);
    // tuple access still works on the same store
    expect(store[0]()).toBe(2);
  });
});
