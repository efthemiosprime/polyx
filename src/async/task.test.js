import { describe, it, expect, vi } from 'vitest';
import { Task } from './task.js';

describe('Task', () => {
  it('is lazy: the computation does not run until fork', () => {
    const computation = vi.fn((_, resolve) => resolve(1));
    const task = Task(computation);
    expect(computation).not.toHaveBeenCalled();
    task.fork(() => {}, () => {});
    expect(computation).toHaveBeenCalledTimes(1);
  });

  it('resolves through fork', () => {
    const onResolved = vi.fn();
    Task.of(42).fork(() => {}, onResolved);
    expect(onResolved).toHaveBeenCalledWith(42);
  });

  it('rejects through fork', () => {
    const onRejected = vi.fn();
    Task.rejected('err').fork(onRejected, () => {});
    expect(onRejected).toHaveBeenCalledWith('err');
  });

  describe('map', () => {
    it('transforms the resolved value', () => {
      const onResolved = vi.fn();
      Task.of(5).map((x) => x + 1).fork(() => {}, onResolved);
      expect(onResolved).toHaveBeenCalledWith(6);
    });

    it('leaves the rejection untouched', () => {
      const onRejected = vi.fn();
      const onResolved = vi.fn();
      Task.rejected('err').map((x) => x + 1).fork(onRejected, onResolved);
      expect(onRejected).toHaveBeenCalledWith('err');
      expect(onResolved).not.toHaveBeenCalled();
    });
  });

  describe('mapRejected', () => {
    it('transforms the rejection value', () => {
      const onRejected = vi.fn();
      Task.rejected('err').mapRejected((e) => `wrapped:${e}`).fork(onRejected, () => {});
      expect(onRejected).toHaveBeenCalledWith('wrapped:err');
    });
  });

  describe('chain / flatMap', () => {
    it('sequences the next Task', () => {
      const onResolved = vi.fn();
      Task.of(5).chain((x) => Task.of(x * 2)).fork(() => {}, onResolved);
      expect(onResolved).toHaveBeenCalledWith(10);
    });

    it('propagates a rejection from the inner Task', () => {
      const onRejected = vi.fn();
      Task.of(5).chain(() => Task.rejected('inner')).fork(onRejected, () => {});
      expect(onRejected).toHaveBeenCalledWith('inner');
    });
  });

  describe('ap', () => {
    it('applies a Task of a function to a Task of a value', () => {
      const onResolved = vi.fn();
      Task.of((x) => x + 1).ap(Task.of(9)).fork(() => {}, onResolved);
      expect(onResolved).toHaveBeenCalledWith(10);
    });
  });

  describe('orElse', () => {
    it('recovers from a rejection', () => {
      const onResolved = vi.fn();
      Task.rejected('err').orElse(() => Task.of('recovered')).fork(() => {}, onResolved);
      expect(onResolved).toHaveBeenCalledWith('recovered');
    });
  });

  describe('interop with Promises', () => {
    it('fromPromise resolves', async () => {
      const value = await Task.toPromise(Task.fromPromise(() => Promise.resolve(7)));
      expect(value).toBe(7);
    });

    it('fromPromise is lazy (factory not called until fork)', () => {
      const factory = vi.fn(() => Promise.resolve(1));
      Task.fromPromise(factory);
      expect(factory).not.toHaveBeenCalled();
    });

    it('fromPromise rejects', async () => {
      await expect(
        Task.toPromise(Task.fromPromise(() => Promise.reject(new Error('nope'))))
      ).rejects.toThrow('nope');
    });

    it('fromPromise catches a synchronous throw in the factory', async () => {
      await expect(
        Task.toPromise(Task.fromPromise(() => {
          throw new Error('sync');
        }))
      ).rejects.toThrow('sync');
    });
  });
});
