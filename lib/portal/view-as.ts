'use client';

/**
 * Staff "view as client" (browser half). Opened with /portal?viewAs=<clientId>
 * from a client's Manage page; remembered for this tab only (sessionStorage).
 *
 * While it's on:
 *  - every /api/portal request carries x-portal-view-as, so the server answers
 *    as that client (lib/portal-server resolveCaller/resolveStaff);
 *  - the portal's direct database reads are sent to /api/portal/view-as/rest,
 *    which pins them to the client;
 *  - any write is refused right here, before it leaves the browser (and the
 *    server refuses it again).
 */

const KEY = 'podlab:view-as';
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const READ = new Set(['GET', 'HEAD']);

export function viewAsClientId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('viewAs');
    if (fromUrl && ID.test(fromUrl)) sessionStorage.setItem(KEY, fromUrl);
    const id = sessionStorage.getItem(KEY);
    return id && ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function exitViewAs(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

const refuse = () =>
  new Response(JSON.stringify({ error: "You're viewing as this client. It's read-only, so nothing was changed.", message: 'read-only view' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });

let installed = false;

/** Wrap window.fetch for /api/portal calls. Idempotent; call before the portal loads data. */
export function installViewAs(): string | null {
  const id = viewAsClientId();
  if (!id || installed || typeof window === 'undefined') return id;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const path = url.startsWith(window.location.origin) ? url.slice(window.location.origin.length) : url;
    if (!path.startsWith('/api/portal')) return original(input, init);
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (!READ.has(method)) return Promise.resolve(refuse());
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set('x-portal-view-as', id);
    return original(input, { ...init, headers });
  };
  return id;
}

/**
 * fetch for the browser Supabase client in view-as mode: portal table reads go
 * through the pinned staff proxy; writes are refused; auth calls pass through.
 */
export function viewAsSupabaseFetch(supabaseUrl: string, id: string): typeof fetch {
  const host = new URL(supabaseUrl.trim()).host;
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    // Match on the parsed URL, not the raw env string: supabase-js normalizes
    // the project URL (a stray newline or trailing slash in the env value is
    // dropped), so a string prefix check let reads slip past the proxy and run
    // as the staff login, which sees no client ("Loading…", "No client record yet").
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      return fetch(input, init);
    }
    if (u.host !== host || !u.pathname.startsWith('/rest/v1/')) return fetch(input, init);
    const method = (init?.method ?? 'GET').toUpperCase();
    if (!READ.has(method)) return Promise.resolve(refuse());
    const table = decodeURIComponent(u.pathname.slice('/rest/v1/'.length));
    const query = u.search.replace(/^\?/, '');
    const src = new Headers(init?.headers);
    const headers = new Headers({ 'x-portal-view-as': id });
    for (const h of ['authorization', 'accept', 'range', 'range-unit', 'prefer']) {
      const v = src.get(h);
      if (v) headers.set(h, v);
    }
    return fetch(`/api/portal/view-as/rest?t=${encodeURIComponent(table)}&q=${encodeURIComponent(query)}`, { headers, cache: 'no-store' });
  };
}
