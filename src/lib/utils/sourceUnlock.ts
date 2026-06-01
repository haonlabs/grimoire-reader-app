import { browser } from '$app/environment';
import { readLocalJson, writeLocalJson } from '$lib/utils/localStorage';

const STORAGE_KEY = 'manga_source_unlock_cookies';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

type SourceCookies = Record<string, string>;

function cookieName(sourceId: string) {
  return `grimoire_source_cookie_${sourceId}`;
}

function readCookies() {
  return readLocalJson<SourceCookies>(STORAGE_KEY, {});
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
  return readCookies()[sourceId]?.trim() ?? '';
}

export function isSourceUnlocked(sourceId: string) {
  return Boolean(getUnlockedSourceCookie(sourceId));
}

export function saveUnlockedSourceCookie(sourceId: string, value: string) {
  const trimmed = value.trim();
  const next = { ...readCookies() };
  if (trimmed) {
    next[sourceId] = trimmed;
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
  return cookie ? { 'x-grimoire-source-cookie': cookie } : {};
}

export function sourceFetch(fetcher: typeof fetch, sourceId: string, input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const cookie = getUnlockedSourceCookie(sourceId);
  if (cookie) headers.set('x-grimoire-source-cookie', cookie);
  return fetcher(input, { ...init, headers });
}
