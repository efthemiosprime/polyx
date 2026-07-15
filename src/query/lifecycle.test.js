import { describe, it, expect, vi, afterEach } from 'vitest';
import { createQueryClient } from './createQueryClient.js';

const flush = () => new Promise((r) => setTimeout(r, 0));
afterEach(() => { vi.useRealTimers(); });

describe('cache garbage collection (cacheTime)', () => {
  it('evicts an entry with no subscribers after cacheTime', async () => {
    vi.useFakeTimers();
    const client = createQueryClient({ cacheTime: 1000, staleTime: Infinity });
    client.query({ key: ['k'], fetcher: () => Promise.resolve('v') });

    await vi.advanceTimersByTimeAsync(0); // let the fetch settle
    expect(client.getQueryData(['k'])).toBe('v');

    await vi.advanceTimersByTimeAsync(1000); // GC timer fires
    expect(client.getQueryData(['k'])).toBeUndefined();
  });

  it('does not evict while a subscriber is attached, evicts after it leaves', async () => {
    vi.useFakeTimers();
    const client = createQueryClient({ cacheTime: 1000, staleTime: Infinity });
    const q = client.query({ key: ['k'], fetcher: () => Promise.resolve('v') });
    const off = q.subscribe(() => {});

    await vi.advanceTimersByTimeAsync(1000);
    expect(client.getQueryData(['k'])).toBe('v'); // kept — has a subscriber

    off();
    await vi.advanceTimersByTimeAsync(1000);
    expect(client.getQueryData(['k'])).toBeUndefined(); // evicted after unsubscribe
  });
});

describe('refetchInterval', () => {
  it('polls while subscribed and stops after unsubscribe', async () => {
    vi.useFakeTimers();
    const client = createQueryClient({ staleTime: 0 });
    const fetcher = vi.fn(() => Promise.resolve('v'));
    const q = client.query({ key: ['k'], fetcher, refetchInterval: 500 });
    const off = q.subscribe(() => {});

    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher).toHaveBeenCalledTimes(1); // initial

    await vi.advanceTimersByTimeAsync(500);
    expect(fetcher).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(500);
    expect(fetcher).toHaveBeenCalledTimes(3);

    off();
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetcher).toHaveBeenCalledTimes(3); // stopped
  });
});

describe('prefetch', () => {
  it('warms the cache so a later query serves it fresh', async () => {
    const client = createQueryClient({ staleTime: 10_000 });
    const fetcher = vi.fn(() => Promise.resolve('warm'));

    await client.prefetch({ key: ['k'], fetcher });
    expect(client.getQueryData(['k'])).toBe('warm');

    const q = client.query({ key: ['k'], fetcher });
    expect(q.getState().data).toBe('warm');
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(1); // served from cache
  });
});

describe('refetchStale', () => {
  it('refetches stale queries that have subscribers, ignores the rest', async () => {
    const client = createQueryClient({ staleTime: 0 });
    const active = vi.fn(() => Promise.resolve('a'));
    const idle = vi.fn(() => Promise.resolve('b'));

    const qa = client.query({ key: ['active'], fetcher: active });
    qa.subscribe(() => {});
    client.query({ key: ['idle'], fetcher: idle }); // no subscriber
    await flush();

    expect(active).toHaveBeenCalledTimes(1);
    expect(idle).toHaveBeenCalledTimes(1);

    client.refetchStale();
    await flush();

    expect(active).toHaveBeenCalledTimes(2); // subscribed + stale → refetched
    expect(idle).toHaveBeenCalledTimes(1);   // no subscriber → left alone
  });
});
