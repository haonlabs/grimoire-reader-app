import { browser } from '$app/environment';
import { readLocalJson, writeLocalJson } from '$lib/utils/localStorage';

const STORAGE_KEY = 'manga_source_unlock_cookies';
const API_CACHE_PREFIX = 'grimoire_api_cache_v2:';
const API_CACHE_INDEX_KEY = 'grimoire_api_cache_v2_index';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const MAX_API_CACHE_ENTRIES = 120;
const MAX_API_CACHE_BYTES = 4_000_000;

type SourceUnlockEntry = string | { cookie?: string; userAgent?: string };
type SourceUnlocks = Record<string, SourceUnlockEntry>;
type ApiCacheIndex = Record<string, { createdAt: number; size: number }>;

interface CachedApiResponse {
  body: string;
  createdAt: number;
  expiresAt: number;
  headers: Record<string, string>;
  status: number;
  statusText: string;
  url: string;
}

function cookieName(sourceId: string) {
  return `grimoire_source_cookie_${sourceId}`;
}

function readCookies() {
  return readLocalJson<SourceUnlocks>(STORAGE_KEY, {});
}

function unlockCookie(entry: SourceUnlockEntry | undefined) {
  return (typeof entry === 'string' ? entry : entry?.cookie)?.trim() ?? '';
}

function unlockUserAgent(entry: SourceUnlockEntry | undefined) {
  return (typeof entry === 'string' ? '' : entry?.userAgent)?.trim() ?? '';
}

function writeSourceCookie(sourceId: string, value: string) {
  if (!browser) return;
  const encoded = encodeURIComponent(value);
  document.cookie = `${cookieName(sourceId)}=${encoded}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function deleteSourceCookie(sourceId: string) {
  if (!browser) return;
  document.cookie = `${cookieName(sourceId)}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getUnlockedSourceCookie(sourceId: string) {
  return unlockCookie(readCookies()[sourceId]);
}

export function getUnlockedSourceUserAgent(sourceId: string) {
  return unlockUserAgent(readCookies()[sourceId]);
}

export function isSourceUnlocked(sourceId: string) {
  return Boolean(getUnlockedSourceCookie(sourceId));
}

export function saveUnlockedSourceCookie(sourceId: string, value: string, userAgent = getUnlockedSourceUserAgent(sourceId)) {
  const trimmed = value.trim();
  const next = { ...readCookies() };
  if (trimmed) {
    next[sourceId] = {
      cookie: trimmed,
      userAgent: userAgent.trim()
    };
    writeSourceCookie(sourceId, trimmed);
  } else {
    delete next[sourceId];
    deleteSourceCookie(sourceId);
  }
  writeLocalJson(STORAGE_KEY, next);
}

export function clearUnlockedSourceCookie(sourceId: string) {
  saveUnlockedSourceCookie(sourceId, '');
}

export function sourceUnlockHeaders(sourceId: string) {
  const cookie = getUnlockedSourceCookie(sourceId);
  const userAgent = getUnlockedSourceUserAgent(sourceId);
  return {
    ...(cookie ? { 'x-grimoire-source-cookie': cookie } : {}),
    ...(userAgent ? { 'x-grimoire-source-user-agent': userAgent } : {})
  };
}

function sourceCacheTtl(pathname: string) {
  if (pathname.includes('/pages')) return 1000 * 60 * 60 * 24 * 7;
  if (pathname.includes('/chapters')) return 1000 * 60 * 30;
  if (pathname.includes('/manga/')) return 1000 * 60 * 30;
  if (pathname.includes('/search')) return 1000 * 60 * 5;
  if (pathname.includes('/list')) return 1000 * 60 * 3;
  return 1000 * 60 * 10;
}

function requestMethod(input: RequestInfo | URL, init: RequestInit) {
  if (init.method) return init.method.toUpperCase();
  if (input instanceof Request) return input.method.toUpperCase();
  return 'GET';
}

function normalizedCacheUrl(input: RequestInfo | URL) {
  if (!browser) return null;
  const raw =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  const url = new URL(raw, window.location.origin);
  url.searchParams.delete('_');
  url.hash = '';
  return url;
}

function cacheKey(sourceId: string, input: RequestInfo | URL, init: RequestInit, unlockedCookie: string) {
  if (!browser || unlockedCookie || requestMethod(input, init) !== 'GET') return null;
  if (init.cache === 'no-store' || init.cache === 'reload') return null;
  const url = normalizedCacheUrl(input);
  if (!url || url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) return null;
  return {
    key: `${sourceId}:${url.pathname}${url.search}`,
    ttl: sourceCacheTtl(url.pathname),
    url: `${url.pathname}${url.search}`
  };
}

function cacheStorageKey(key: string) {
  return `${API_CACHE_PREFIX}${key}`;
}

function readCacheIndex(): ApiCacheIndex {
  if (!browser) return {};
  try {
    return JSON.parse(sessionStorage.getItem(API_CACHE_INDEX_KEY) ?? '{}') as ApiCacheIndex;
  } catch {
    return {};
  }
}

function writeCacheIndex(index: ApiCacheIndex) {
  if (!browser) return;
  try {
    sessionStorage.setItem(API_CACHE_INDEX_KEY, JSON.stringify(index));
  } catch {
    // Cache is a best-effort optimization.
  }
}

function trimApiCache(nextIndex = readCacheIndex()) {
  if (!browser) return;
  const entries = Object.entries(nextIndex).sort(([, a], [, b]) => b.createdAt - a.createdAt);
  let total = 0;
  const keep = new Set<string>();
  const trimmed: ApiCacheIndex = {};

  for (const [key, meta] of entries) {
    total += meta.size;
    if (keep.size < MAX_API_CACHE_ENTRIES && total <= MAX_API_CACHE_BYTES) {
      keep.add(key);
      trimmed[key] = meta;
    }
  }

  for (const key of Object.keys(nextIndex)) {
    if (!keep.has(key)) sessionStorage.removeItem(cacheStorageKey(key));
  }
  writeCacheIndex(trimmed);
}

function responseFromCached(entry: CachedApiResponse) {
  return new Response(entry.body, {
    status: entry.status,
    statusText: entry.statusText,
    headers: {
      ...entry.headers,
      'x-grimoire-cache': 'HIT'
    }
  });
}

function readCachedResponse(key: string) {
  if (!browser) return null;
  try {
    const raw = sessionStorage.getItem(cacheStorageKey(key));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedApiResponse;
    if (Date.now() > entry.expiresAt) {
      sessionStorage.removeItem(cacheStorageKey(key));
      const index = readCacheIndex();
      delete index[key];
      writeCacheIndex(index);
      return null;
    }
    return responseFromCached(entry);
  } catch {
    return null;
  }
}

function cacheResponse(key: string, response: Response, ttl: number, url: string) {
  if (!browser || !response.ok) return;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return;

  response
    .clone()
    .text()
    .then((body) => {
      const now = Date.now();
      const entry: CachedApiResponse = {
        body,
        createdAt: now,
        expiresAt: now + ttl,
        headers: {
          'cache-control': response.headers.get('cache-control') ?? 'private, max-age=0',
          'content-type': contentType
        },
        status: response.status,
        statusText: response.statusText,
        url
      };
      const serialized = JSON.stringify(entry);
      sessionStorage.setItem(cacheStorageKey(key), serialized);
      const index = readCacheIndex();
      index[key] = { createdAt: now, size: serialized.length };
      writeCacheIndex(index);
      trimApiCache(index);
    })
    .catch(() => {
      // The visible request already succeeded; failing to cache it should be silent.
    });
}

export function sourceFetch(fetcher: typeof fetch, sourceId: string, input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const cookie = getUnlockedSourceCookie(sourceId);
  const userAgent = getUnlockedSourceUserAgent(sourceId);
  if (cookie) headers.set('x-grimoire-source-cookie', cookie);
  if (userAgent) headers.set('x-grimoire-source-user-agent', userAgent);
  const cache = cacheKey(sourceId, input, init, cookie);
  const cached = cache ? readCachedResponse(cache.key) : null;
  if (cached) return Promise.resolve(cached);

  return fetcher(input, { ...init, headers }).then((response) => {
    if (cache) cacheResponse(cache.key, response, cache.ttl, cache.url);
    return response;
  });
}
