import { Task } from '../async/task.js';
import { createState } from '../state/createState.js';

/**
 * A framework-free query client — caching, dedupe, stale-while-revalidate,
 * retries, and subscriptions — built on `Task` (async) + `createState` (the
 * reactive per-query store). See docs/query-roadmap.md for the design.
 */

/**
 * Deterministic key hash: JSON with object keys sorted recursively, so
 * `{a,b}` and `{b,a}` collide. Keys must be JSON-serializable.
 * @private
 */
const serializeKey = (key) =>
  JSON.stringify(key, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.keys(v).sort().reduce((acc, k) => { acc[k] = v[k]; return acc; }, {})
      : v
  );

/** Does an entry's key match an invalidation filter (prefix for arrays, or a predicate)? @private */
const keyMatches = (entryKey, filter) => {
  if (typeof filter === 'function') return !!filter(entryKey);
  if (Array.isArray(filter) && Array.isArray(entryKey)) {
    return filter.every((seg, i) => serializeKey(seg) === serializeKey(entryKey[i]));
  }
  return serializeKey(filter) === serializeKey(entryKey);
};

/** Normalize a fetcher's return (Promise | Task | value) into a Task. @private */
const toTask = (x) => {
  if (x && typeof x.fork === 'function') return x;          // already a Task
  if (x && typeof x.then === 'function') return Task.fromPromise(() => x); // Promise
  return Task.of(x);                                        // plain value
};

/**
 * Run `factory` (a fresh attempt each time) as a Task, retrying up to `retries`
 * times with a `delay` between attempts. Task has no built-in retry, so this is
 * an `orElse` loop with a `setTimeout` for the delay.
 * @private
 */
const withRetry = (factory, retries, delay) => {
  const go = (n) => {
    let out;
    try { out = factory(); } catch (e) { return Task.rejected(e); }
    return toTask(out).orElse((err) =>
      n <= 0
        ? Task.rejected(err)
        : Task((reject, resolve) => {
            setTimeout(() => go(n - 1).fork(reject, resolve), delay);
          })
    );
  };
  return go(retries);
};

const INITIAL = {
  status: 'idle',       // 'idle' | 'loading' | 'success' | 'error'
  data: undefined,
  error: undefined,
  isFetching: false,
  isStale: true,
  updatedAt: 0,
};

/**
 * Create a query client.
 *
 * @param {Object} [defaults]
 * @param {number} [defaults.staleTime=0] - ms a result stays fresh (no auto-refetch)
 * @param {number} [defaults.retry=0] - retry attempts after the first failure
 * @param {number} [defaults.retryDelay=1000] - ms between retries
 * @returns {{ query, invalidate, setQueryData, getQueryData, clear }}
 */
export const createQueryClient = (defaults = {}) => {
  const {
    staleTime: defStale = 0,
    retry: defRetry = 0,
    retryDelay: defDelay = 1000,
    cacheTime: defCache = 5 * 60 * 1000,
  } = defaults;

  const cache = new Map(); // hash -> entry

  const ensureEntry = (key) => {
    const hash = serializeKey(key);
    let entry = cache.get(hash);
    if (!entry) {
      entry = {
        key, hash,
        store: createState({ ...INITIAL }),
        fetcher: null,
        staleTime: defStale,
        retry: defRetry,
        retryDelay: defDelay,
        cacheTime: defCache,
        refetchInterval: 0,
        enabled: true,
        fetchId: 0,
        fetching: false,
        subscribers: 0,
        gcTimer: null,
        intervalId: null,
      };
      cache.set(hash, entry);
    }
    return entry;
  };

  const applyOptions = (entry, o) => {
    if (o.fetcher) entry.fetcher = o.fetcher;
    if (o.staleTime !== undefined) entry.staleTime = o.staleTime;
    if (o.retry !== undefined) entry.retry = o.retry;
    if (o.retryDelay !== undefined) entry.retryDelay = o.retryDelay;
    if (o.cacheTime !== undefined) entry.cacheTime = o.cacheTime;
    if (o.refetchInterval !== undefined) entry.refetchInterval = o.refetchInterval;
    if (o.enabled !== undefined) entry.enabled = o.enabled;
  };

  const isStaleNow = (entry) => {
    const s = entry.store.get();
    return s.isStale ||
      (entry.staleTime !== Infinity && Date.now() - s.updatedAt >= entry.staleTime);
  };

  // --- garbage collection: evict entries with no subscribers after cacheTime ---
  const cancelGC = (entry) => {
    if (entry.gcTimer) { clearTimeout(entry.gcTimer); entry.gcTimer = null; }
  };
  const scheduleGC = (entry) => {
    if (entry.cacheTime === Infinity) return;
    cancelGC(entry);
    entry.gcTimer = setTimeout(() => {
      if (entry.subscribers === 0 && !entry.fetching) {
        stopInterval(entry);
        cache.delete(entry.hash);
      }
    }, entry.cacheTime);
  };
  const maybeScheduleGC = (entry) => {
    if (entry.subscribers === 0 && !entry.fetching) scheduleGC(entry);
  };

  // --- polling: refetch on an interval while the query has subscribers ---
  const startInterval = (entry) => {
    if (entry.intervalId || !entry.refetchInterval) return;
    entry.intervalId = setInterval(() => runFetch(entry, { force: true }), entry.refetchInterval);
  };
  const stopInterval = (entry) => {
    if (entry.intervalId) { clearInterval(entry.intervalId); entry.intervalId = null; }
  };

  // Only the latest fetch (by id) may commit — drops superseded responses.
  const commit = (entry, id, patch) => {
    if (id !== entry.fetchId) return;
    entry.fetching = false;
    entry.store.set((s) => ({ ...s, ...patch }));
    maybeScheduleGC(entry); // an unsubscribed query becomes eligible for GC once settled
  };

  const runFetch = (entry, { force = false } = {}) => {
    if (!entry.fetcher) return;
    if (!force && !entry.enabled) return;

    const s = entry.store.get();
    if (!force) {
      if (entry.fetching) return; // dedupe: piggyback on the in-flight auto-fetch
      const fresh =
        s.status === 'success' && !s.isStale &&
        (entry.staleTime === Infinity || Date.now() - s.updatedAt < entry.staleTime);
      if (fresh) return;
    }

    const id = ++entry.fetchId; // forced fetch supersedes any in-flight one
    entry.fetching = true;
    entry.store.set((st) => ({
      ...st,
      isFetching: true,
      status: st.data === undefined ? 'loading' : st.status, // background refetch stays 'success'
    }));

    withRetry(() => entry.fetcher(), entry.retry, entry.retryDelay).fork(
      (error) => commit(entry, id, { status: 'error', error, isFetching: false, isStale: false }),
      (data) => commit(entry, id, {
        status: 'success', data, error: undefined,
        isFetching: false, isStale: false, updatedAt: Date.now(),
      })
    );
  };

  const makeHandle = (entry) => ({
    key: entry.key,
    getState: () => entry.store.get(),
    subscribe: (fn) => {
      entry.subscribers += 1;
      if (entry.subscribers === 1) { cancelGC(entry); startInterval(entry); }
      const off = entry.store.subscribe(fn);
      return () => {
        entry.subscribers -= 1;
        off();
        if (entry.subscribers === 0) { stopInterval(entry); scheduleGC(entry); }
      };
    },
    refetch: () => runFetch(entry, { force: true }),
    select: (selector) => selector(entry.store.get()),
  });

  const query = (options) => {
    const entry = ensureEntry(options.key);
    applyOptions(entry, options);
    if (entry.enabled) runFetch(entry); // eager on query()
    maybeScheduleGC(entry); // if nothing fetched/subscribed, still becomes GC-eligible
    return makeHandle(entry);
  };

  /** Fetch into the cache without returning a handle; resolves when settled. */
  const prefetch = (options) => {
    const entry = ensureEntry(options.key);
    applyOptions(entry, options);
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        off();
        maybeScheduleGC(entry);
        resolve(entry.store.get().data);
      };
      const off = entry.store.subscribe((st) => {
        if (!entry.fetching && (st.status === 'success' || st.status === 'error')) finish();
      });
      if (entry.enabled) runFetch(entry);
      if (!entry.fetching) finish(); // nothing to wait for (fresh / disabled / no fetcher)
    });
  };

  /**
   * Refetch every stale query that currently has subscribers. Wire this to any
   * signal you like — `window` focus, `online`, a manual "refresh" — keeping the
   * client itself framework-free.
   */
  const refetchStale = () => {
    for (const entry of cache.values()) {
      if (entry.subscribers > 0 && entry.enabled && entry.fetcher && isStaleNow(entry)) {
        runFetch(entry, { force: true });
      }
    }
  };

  const invalidate = (filter) => {
    for (const entry of cache.values()) {
      if (!keyMatches(entry.key, filter)) continue;
      entry.store.set((s) => ({ ...s, isStale: true }));
      if (entry.enabled) runFetch(entry, { force: true });
    }
  };

  const setQueryData = (key, dataOrUpdater) => {
    const entry = ensureEntry(key);
    entry.store.set((s) => {
      const data = typeof dataOrUpdater === 'function' ? dataOrUpdater(s.data) : dataOrUpdater;
      return { ...s, status: 'success', data, error: undefined, isStale: false, updatedAt: Date.now() };
    });
    return entry.store.get().data;
  };

  const getQueryData = (key) => {
    const entry = cache.get(serializeKey(key));
    return entry ? entry.store.get().data : undefined;
  };

  const MUTATION_INITIAL = {
    status: 'idle', data: undefined, error: undefined, isLoading: false, variables: undefined,
  };

  /**
   * Create a mutation — a store over an async write with lifecycle callbacks.
   *
   * `onMutate(vars)` runs first and its return value becomes the `context` passed
   * to `onSuccess` / `onError` / `onSettled` — the hook for optimistic updates and
   * rollback. `mutate(vars)` returns a promise that resolves with the data on
   * success or `undefined` on failure (the error is reflected in the store).
   */
  const mutation = (config) => {
    const {
      mutationFn,
      onMutate, onSuccess, onError, onSettled,
      retry = defRetry, retryDelay = defDelay,
    } = config;

    const store = createState({ ...MUTATION_INITIAL });
    let callId = 0; // only the latest mutate may write the store

    const mutate = async (variables) => {
      const id = ++callId;
      store.set((s) => ({ ...s, status: 'loading', isLoading: true, variables, error: undefined }));

      let context;
      try {
        context = onMutate ? await onMutate(variables) : undefined;
        const data = await new Promise((resolve, reject) =>
          withRetry(() => mutationFn(variables), retry, retryDelay).fork(reject, resolve));
        if (onSuccess) await onSuccess(data, variables, context);
        if (id === callId) store.set((s) => ({ ...s, status: 'success', data, isLoading: false }));
        if (onSettled) await onSettled(data, undefined, variables, context);
        return data;
      } catch (error) {
        if (onError) await onError(error, variables, context);
        if (id === callId) store.set((s) => ({ ...s, status: 'error', error, isLoading: false }));
        if (onSettled) await onSettled(undefined, error, variables, context);
        return undefined;
      }
    };

    return {
      mutate,
      getState: () => store.get(),
      subscribe: (fn) => store.subscribe(fn),
      reset: () => store.set(() => ({ ...MUTATION_INITIAL })),
    };
  };

  const clear = () => {
    for (const entry of cache.values()) { cancelGC(entry); stopInterval(entry); }
    cache.clear();
  };

  return {
    query, mutation, prefetch, refetchStale,
    invalidate, setQueryData, getQueryData, clear,
  };
};
