import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchJson, gqlFetcher } from './fetchers.js';

afterEach(() => { vi.restoreAllMocks(); delete global.fetch; });

describe('fetchJson', () => {
  it('parses JSON on a 2xx response', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ a: 1 }) }));

    await expect(fetchJson('/x')).resolves.toEqual({ a: 1 });
    expect(global.fetch).toHaveBeenCalledWith('/x', undefined);
  });

  it('throws on a non-2xx response, including the status', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false, status: 404, statusText: 'Not Found',
        text: () => Promise.resolve('missing'),
      }));

    await expect(fetchJson('/x')).rejects.toThrow(/404/);
  });

  it('forwards the init object', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
    const init = { method: 'POST', body: '{}' };

    await fetchJson('/x', init);
    expect(global.fetch).toHaveBeenCalledWith('/x', init);
  });
});

describe('gqlFetcher', () => {
  it('returns a fetcher that POSTs { query, variables } and returns data', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ data: { feed: [1] } }) }));

    const fetcher = gqlFetcher('/graphql', 'query { feed }', { limit: 1 });
    await expect(fetcher()).resolves.toEqual({ feed: [1] });

    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('/graphql');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ query: 'query { feed }', variables: { limit: 1 } });
    expect(init.headers['Content-Type']).toMatch(/application\/json/);
  });

  it('throws when the GraphQL response contains errors', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ errors: [{ message: 'bad field' }] }) }));

    await expect(gqlFetcher('/graphql', 'q')()).rejects.toThrow(/bad field/);
  });
});
