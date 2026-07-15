// PolyX query demo — caching, refetch, and optimistic mutations against a mock API.
import { createQueryClient } from '../src/query/createQueryClient.js';
import { on } from '../src/dom/utils.js';

// ── Mock API (stands in for REST/GraphQL; artificial latency) ────────────────
let db = [
  { id: 1, title: 'Learn createQueryClient' },
  { id: 2, title: 'Cache + dedupe for free' },
];
let failNext = false;

const fetchPosts = () =>
  new Promise((resolve) => setTimeout(() => resolve([...db]), 600));

const createPost = (title) =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      if (failNext) { failNext = false; reject(new Error('Server rejected the post')); return; }
      const post = { id: Date.now(), title };
      db = [...db, post];
      resolve(post);
    }, 700));

// ── Query client ─────────────────────────────────────────────────────────────
const client = createQueryClient({ staleTime: 5_000 });

const posts = client.query({ key: ['posts'], fetcher: fetchPosts });

// ── DOM ──────────────────────────────────────────────────────────────────────
const $ = (s) => document.querySelector(s);
const statusDot = $('#status .dot');
const statusText = $('#status-text');
const listHost = $('#list-host');
const errorEl = $('#error');
const refreshBtn = $('#refresh');
const addBtn = $('#add-btn');

// Rows optimistically added but not yet confirmed are marked pending.
let pendingIds = new Set();

const render = (s) => {
  statusDot.className = 'dot ' + (s.isFetching ? 'fetching' : s.status);
  statusText.textContent = s.isFetching
    ? (s.status === 'success' ? 'refetching…' : 'loading…')
    : s.status;
  refreshBtn.disabled = s.isFetching;

  errorEl.hidden = s.status !== 'error';
  if (s.status === 'error') errorEl.textContent = `Error: ${s.error?.message}`;

  if (s.status === 'loading' && !s.data) {
    listHost.innerHTML =
      '<ul><li class="skeleton"></li><li class="skeleton"></li></ul>';
    return;
  }

  const items = s.data || [];
  const ul = document.createElement('ul');
  for (const p of items) {
    const li = document.createElement('li');
    li.className = 'post' + (pendingIds.has(p.id) ? ' pending' : '');
    li.textContent = p.title;
    ul.appendChild(li);
  }
  listHost.innerHTML = '';
  listHost.appendChild(ul);
};

// state → view
posts.subscribe(render);
render(posts.getState()); // initial paint (loading)

// refetch — shows a background fetch (status stays 'success', amber dot)
on('click', () => posts.refetch())(refreshBtn);

// ── Mutation: add a post, optimistically ─────────────────────────────────────
const addPost = client.mutation({
  mutationFn: (title) => createPost(title),
  onMutate: (title) => {
    const prev = client.getQueryData(['posts']);
    const tempId = -Date.now();
    pendingIds.add(tempId);
    client.setQueryData(['posts'], (list) => [...list, { id: tempId, title }]);
    return { prev, tempId }; // context for rollback
  },
  onError: (_err, _title, ctx) => {
    pendingIds.delete(ctx.tempId);
    client.setQueryData(['posts'], ctx.prev); // roll back
  },
  onSettled: (_data, _err, _title, ctx) => {
    if (ctx) pendingIds.delete(ctx.tempId);
    client.invalidate(['posts']); // reconcile with the server
  },
});
addPost.subscribe((s) => { addBtn.disabled = s.isLoading; });

on('submit', (e) => {
  e.preventDefault();
  const input = $('#new-post');
  const title = input.value.trim();
  if (!title) return;
  addPost.mutate(title);
  input.value = '';
})($('#add-form'));

on('change', (e) => { failNext = e.target.checked; })($('#fail-next'));

window.__polyxQuery = { client, posts, addPost };
