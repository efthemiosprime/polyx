/**
 * Fetcher helpers for the query client. A "fetcher" is any `() => Promise | Task
 * | value`; these produce ones for the two common transports.
 */

/**
 * REST helper — fetch a URL and parse JSON, throwing on a non-2xx response.
 * Returns a `Promise`, so use it inside a fetcher thunk:
 * `fetcher: () => fetchJson('/api/users/42')`.
 *
 * @param {string} url
 * @param {RequestInit} [init] - Forwarded to `fetch`
 * @returns {Promise<any>}
 */
export const fetchJson = (url, init) =>
  fetch(url, init).then((res) => {
    if (!res.ok) {
      return res.text().then((body) => {
        throw new Error(`HTTP ${res.status} ${res.statusText || ''}`.trim() + (body ? `: ${body}` : ''));
      });
    }
    return res.json();
  });

/**
 * GraphQL helper — returns a **fetcher** that POSTs `{ query, variables }` and
 * resolves the `data` field, throwing if the response carries `errors[]`.
 * Use it directly as the fetcher: `fetcher: gqlFetcher('/graphql', QUERY, vars)`.
 *
 * @param {string} url - GraphQL endpoint
 * @param {string} query - Query/mutation document
 * @param {Object} [variables] - GraphQL variables
 * @param {RequestInit} [init] - Extra `fetch` options (merged; headers extended)
 * @returns {() => Promise<any>} A fetcher
 */
export const gqlFetcher = (url, query, variables, init = {}) => () =>
  fetch(url, {
    method: 'POST',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    body: JSON.stringify({ query, variables }),
  })
    .then((res) => res.json())
    .then(({ data, errors }) => {
      if (errors && errors.length) {
        throw new Error(errors.map((e) => e.message).join('; '));
      }
      return data;
    });
