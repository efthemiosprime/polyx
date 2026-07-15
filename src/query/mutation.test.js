import { describe, it, expect, vi, afterEach } from 'vitest';
import { createQueryClient } from './createQueryClient.js';

const flush = () => new Promise((r) => setTimeout(r, 0));
afterEach(() => { vi.useRealTimers(); });

describe('mutation — lifecycle', () => {
  it('transitions idle → loading → success with data', async () => {
    const client = createQueryClient();
    const m = client.mutation({ mutationFn: (n) => Promise.resolve(n * 2) });

    expect(m.getState().status).toBe('idle');
    const p = m.mutate(21);
    expect(m.getState().status).toBe('loading');
    expect(m.getState().isLoading).toBe(true);

    const result = await p;
    expect(result).toBe(42);
    expect(m.getState().status).toBe('success');
    expect(m.getState().data).toBe(42);
    expect(m.getState().isLoading).toBe(false);
  });

  it('sets error state on rejection (mutate resolves undefined, state reflects error)', async () => {
    const client = createQueryClient();
    const m = client.mutation({ mutationFn: () => Promise.reject(new Error('nope')) });

    const result = await m.mutate();
    expect(result).toBeUndefined();
    expect(m.getState().status).toBe('error');
    expect(m.getState().error).toBeInstanceOf(Error);
  });

  it('reset() returns the mutation to idle', async () => {
    const client = createQueryClient();
    const m = client.mutation({ mutationFn: () => Promise.resolve(1) });
    await m.mutate();
    expect(m.getState().status).toBe('success');
    m.reset();
    expect(m.getState().status).toBe('idle');
    expect(m.getState().data).toBeUndefined();
  });

  it('notifies subscribers of status changes', async () => {
    const client = createQueryClient();
    const m = client.mutation({ mutationFn: () => Promise.resolve(1) });
    const seen = [];
    m.subscribe((s) => seen.push(s.status));
    await m.mutate();
    expect(seen).toEqual(['loading', 'success']);
  });
});

describe('mutation — callbacks', () => {
  it('threads onMutate context into onSuccess and onSettled', async () => {
    const client = createQueryClient();
    const calls = [];
    const m = client.mutation({
      mutationFn: (v) => Promise.resolve(`ok:${v}`),
      onMutate: (v) => { calls.push(['mutate', v]); return { tag: v }; },
      onSuccess: (data, v, ctx) => calls.push(['success', data, v, ctx]),
      onSettled: (data, err, v, ctx) => calls.push(['settled', data, err, v, ctx]),
    });

    await m.mutate('x');
    expect(calls).toEqual([
      ['mutate', 'x'],
      ['success', 'ok:x', 'x', { tag: 'x' }],
      ['settled', 'ok:x', undefined, 'x', { tag: 'x' }],
    ]);
  });

  it('runs onError and onSettled on failure', async () => {
    const client = createQueryClient();
    const calls = [];
    const err = new Error('boom');
    const m = client.mutation({
      mutationFn: () => Promise.reject(err),
      onError: (e, v, ctx) => calls.push(['error', e, v, ctx]),
      onSettled: (data, e) => calls.push(['settled', data, e]),
    });

    await m.mutate('v');
    expect(calls).toEqual([
      ['error', err, 'v', undefined],
      ['settled', undefined, err],
    ]);
  });
});

describe('mutation — optimistic updates', () => {
  it('optimistically patches the cache and rolls back on error', async () => {
    const client = createQueryClient();
    client.setQueryData(['todos'], [{ id: 1, done: false }]);

    const m = client.mutation({
      mutationFn: () => Promise.reject(new Error('server rejected')),
      onMutate: () => {
        const prev = client.getQueryData(['todos']);
        client.setQueryData(['todos'], (list) => list.map((t) => ({ ...t, done: true })));
        return { prev };
      },
      onError: (_e, _v, ctx) => client.setQueryData(['todos'], ctx.prev),
    });

    // Optimistic value is applied synchronously during mutate()
    m.mutate();
    expect(client.getQueryData(['todos'])).toEqual([{ id: 1, done: true }]);

    await flush();
    // Rolled back after the failure
    expect(client.getQueryData(['todos'])).toEqual([{ id: 1, done: false }]);
    expect(m.getState().status).toBe('error');
  });

  it('onSuccess can invalidate a related query so it refetches', async () => {
    const client = createQueryClient({ staleTime: 10_000 });
    const fetcher = vi.fn(() => Promise.resolve(['a']));
    client.query({ key: ['todos'], fetcher });
    await flush();

    const m = client.mutation({
      mutationFn: (text) => Promise.resolve({ id: 2, text }),
      onSuccess: () => client.invalidate(['todos']),
    });

    await m.mutate('new');
    expect(m.getState().data).toEqual({ id: 2, text: 'new' });
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe('mutation — retry', () => {
  it('retries the mutationFn then succeeds', async () => {
    vi.useFakeTimers();
    const client = createQueryClient();
    const mutationFn = vi.fn()
      .mockRejectedValueOnce(new Error('1'))
      .mockResolvedValueOnce('ok');
    const m = client.mutation({ mutationFn, retry: 1, retryDelay: 100 });

    const p = m.mutate();
    await vi.advanceTimersByTimeAsync(100);
    await p;

    expect(mutationFn).toHaveBeenCalledTimes(2);
    expect(m.getState().status).toBe('success');
    expect(m.getState().data).toBe('ok');
  });
});
