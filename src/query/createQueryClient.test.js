import { describe, it, expect, vi, afterEach } from 'vitest';
import { createQueryClient } from './createQueryClient.js';

// Task.fromPromise resolves on a microtask; this flushes the queue.
const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => { vi.useRealTimers(); });

describe('query — basic lifecycle', () => {
  it('transitions idle → loading → success with data', async () => {
    const client = createQueryClient();
    const fetcher = vi.fn(() => Promise.resolve({ id: 1 }));

    const q = client.query({ key: ['user', 1], fetcher });
    expect(q.getState().status).toBe('loading');
    expect(q.getState().isFetching).toBe(true);

    await flush();

    expect(q.getState().status).toBe('success');
    expect(q.getState().data).toEqual({ id: 1 });
    expect(q.getState().isFetching).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('sets error state on rejection', async () => {
    const client = createQueryClient();
    const q = client.query({ key: ['e'], fetcher: () => Promise.reject(new Error('boom')) });

    await flush();

    expect(q.getState().status).toBe('error');
    expect(q.getState().error).toBeInstanceOf(Error);
    expect(q.getState().error.message).toBe('boom');
  });

  it('accepts a fetcher that returns a plain value or a Task', async () => {
    const client = createQueryClient();
    const q = client.query({ key: ['v'], fetcher: () => 42 });
    await flush();
    expect(q.getState().data).toBe(42);
  });
});

describe('query — cache, dedupe, staleness', () => {
  it('dedupes concurrent queries for the same key (one fetch)', async () => {
    const client = createQueryClient();
    const fetcher = vi.fn(() => Promise.resolve('v'));

    client.query({ key: ['k'], fetcher });
    client.query({ key: ['k'], fetcher });
    await flush();

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('serves cached data without refetch while fresh (staleTime)', async () => {
    const client = createQueryClient({ staleTime: 10_000 });
    const fetcher = vi.fn(() => Promise.resolve('v'));

    client.query({ key: ['k'], fetcher });
    await flush();
    client.query({ key: ['k'], fetcher }); // within staleTime
    await flush();

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetch() forces a new fetch', async () => {
    const client = createQueryClient({ staleTime: 10_000 });
    const fetcher = vi.fn(() => Promise.resolve('v'));

    const q = client.query({ key: ['k'], fetcher });
    await flush();
    q.refetch();
    await flush();

    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe('query — invalidation', () => {
  it('invalidate() marks matching queries stale and refetches', async () => {
    const client = createQueryClient({ staleTime: 10_000 });
    const fetcher = vi.fn(() => Promise.resolve('v'));

    client.query({ key: ['todos'], fetcher });
    await flush();
    client.invalidate(['todos']);
    await flush();

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('invalidate does partial (prefix) key matching', async () => {
    const client = createQueryClient({ staleTime: 10_000 });
    const f1 = vi.fn(() => Promise.resolve(1));
    const f2 = vi.fn(() => Promise.resolve(2));

    client.query({ key: ['user', 1], fetcher: f1 });
    client.query({ key: ['post', 1], fetcher: f2 });
    await flush();

    client.invalidate(['user']); // prefix → matches ['user', 1] only
    await flush();

    expect(f1).toHaveBeenCalledTimes(2);
    expect(f2).toHaveBeenCalledTimes(1);
  });

  it('invalidate accepts a predicate over the key', async () => {
    const client = createQueryClient({ staleTime: 10_000 });
    const fetcher = vi.fn(() => Promise.resolve('v'));

    client.query({ key: ['a', 1], fetcher });
    await flush();
    client.invalidate((key) => key[0] === 'a');
    await flush();

    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe('query — subscribe & select', () => {
  it('notifies subscribers on state change and unsubscribes', async () => {
    const client = createQueryClient();
    const q = client.query({ key: ['k'], fetcher: () => Promise.resolve('v') });
    const seen = [];
    const off = q.subscribe((s) => seen.push(s.status));

    await flush();
    expect(seen).toContain('success');

    off();
    q.refetch();
    await flush();
    // no new pushes after unsubscribe
    expect(seen.filter((s) => s === 'success')).toHaveLength(1);
  });

  it('select derives from the current state', async () => {
    const client = createQueryClient();
    const q = client.query({ key: ['k'], fetcher: () => Promise.resolve({ name: 'ada' }) });
    await flush();
    expect(q.select((s) => s.data?.name)).toBe('ada');
  });
});

describe('query — enabled (dependent queries)', () => {
  it('does not fetch while enabled is false, then fetches once enabled', async () => {
    const client = createQueryClient();
    const fetcher = vi.fn(() => Promise.resolve('v'));

    const q = client.query({ key: ['k'], fetcher, enabled: false });
    await flush();
    expect(fetcher).not.toHaveBeenCalled();
    expect(q.getState().status).toBe('idle');

    client.query({ key: ['k'], fetcher, enabled: true }); // deps ready
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('setQueryData', () => {
  it('seeds the cache so a query treats it as fresh (no fetch)', async () => {
    const client = createQueryClient({ staleTime: 10_000 });
    client.setQueryData(['k'], { name: 'seed' });

    const fetcher = vi.fn(() => Promise.resolve({ name: 'fetched' }));
    const q = client.query({ key: ['k'], fetcher });

    expect(q.getState().data).toEqual({ name: 'seed' });
    await flush();
    expect(fetcher).not.toHaveBeenCalled();
    expect(q.getState().data).toEqual({ name: 'seed' });
  });

  it('accepts an updater of the previous data', () => {
    const client = createQueryClient();
    client.setQueryData(['c'], 1);
    client.setQueryData(['c'], (prev) => prev + 1);
    const q = client.query({ key: ['c'], fetcher: () => Promise.resolve(0), staleTime: 10_000 });
    expect(q.getState().data).toBe(2);
  });
});

describe('query — race safety', () => {
  it('ignores a superseded in-flight response (last write wins)', async () => {
    const client = createQueryClient();
    let resolveA, resolveB;
    const fetcher = vi.fn()
      .mockImplementationOnce(() => new Promise((r) => { resolveA = r; }))
      .mockImplementationOnce(() => new Promise((r) => { resolveB = r; }));

    const q = client.query({ key: ['k'], fetcher }); // fetch A (id 1)
    q.refetch();                                       // fetch B (id 2) supersedes A

    resolveB('B');
    await flush();
    resolveA('A'); // A resolves late — must be ignored
    await flush();

    expect(q.getState().data).toBe('B');
  });
});

describe('query — retry', () => {
  it('retries on failure then succeeds', async () => {
    vi.useFakeTimers();
    const client = createQueryClient({ retry: 1, retryDelay: 100 });
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new Error('fail-1'))
      .mockResolvedValueOnce('ok');

    const q = client.query({ key: ['k'], fetcher });
    await vi.advanceTimersByTimeAsync(100); // flush rejection microtask + retry timer

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(q.getState().status).toBe('success');
    expect(q.getState().data).toBe('ok');
  });

  it('gives up after exhausting retries', async () => {
    vi.useFakeTimers();
    const client = createQueryClient({ retry: 1, retryDelay: 100 });
    const fetcher = vi.fn(() => Promise.reject(new Error('always')));

    const q = client.query({ key: ['k'], fetcher });
    await vi.advanceTimersByTimeAsync(100);

    expect(fetcher).toHaveBeenCalledTimes(2); // initial + 1 retry
    expect(q.getState().status).toBe('error');
  });
});
