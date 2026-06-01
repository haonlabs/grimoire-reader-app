import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import { AsyncLocalStorage } from 'node:async_hooks';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Agent, fetch as undiciFetch } from 'undici';
import { env } from '$env/dynamic/private';
import type { MangaFormat, MangaStatus } from '$lib/sources/types';

const REQUEST_TIMEOUT = 15_000;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';

const relaxedAgent = new Agent({
  connect: {
    rejectUnauthorized: false
  }
});
const execFileAsync = promisify(execFile);

type SourceFetchInit = RequestInit & {
  body?: BodyInit | null;
  sourceId?: string;
};
const requestCookieStorage = new AsyncLocalStorage<string>();

export function encodeId(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

export function decodeId(value: string) {
  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch {
    return value;
  }
}

export function clean(text?: string | null) {
  return text?.replace(/\s+/g, ' ').trim() ?? '';
}

export function absoluteUrl(baseUrl: string, href?: string | null) {
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) return '';
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return '';
  }
}

export function imageSrc($: cheerio.CheerioAPI, image: cheerio.Cheerio<AnyNode>, baseUrl: string) {
  const src =
    image.attr('data-src') ??
    image.attr('data-lazy-src') ??
    image.attr('data-original') ??
    image.attr('data-cfsrc') ??
    image.attr('srcset')?.split(',').at(-1)?.trim().split(/\s+/)[0] ??
    image.attr('src') ??
    '';
  return absoluteUrl(baseUrl, src);
}

export function statusFrom(text?: string | null): MangaStatus {
  const value = clean(text).toLowerCase();
  if (/completed|finished|tamat|complete|selesai/.test(value)) return 'completed';
  if (/hiatus|pause|on hold/.test(value)) return 'hiatus';
  if (/cancel|dropped|discontinued/.test(value)) return 'cancelled';
  return 'ongoing';
}

export function formatFrom(text?: string | null): MangaFormat {
  const value = clean(text).toLowerCase();
  if (value.includes('manhwa')) return 'Manhwa';
  if (value.includes('manhua')) return 'Manhua';
  return 'Manga';
}

export function numberFrom(text?: string | null) {
  const normalized = clean(text).replace(',', '.');
  const match = normalized.match(/(?:chapter|chap|ch\.?|episode|eps?)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (match) return Number(match[1]);
  const fallback = normalized.match(/([0-9]+(?:\.[0-9]+)?)/);
  return fallback ? Number(fallback[1]) : 0;
}

export async function withSourceRequestCookie<T>(cookie: string, handler: () => Promise<T>) {
  return requestCookieStorage.run(cookie, handler);
}

function headersToEntries(headers?: HeadersInit) {
  if (!headers) return [];
  if (headers instanceof Headers) return [...headers.entries()];
  if (Array.isArray(headers)) return headers;
  return Object.entries(headers);
}

function normalizedEnvKey(value?: string | null) {
  return value?.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toUpperCase() ?? '';
}

function sourceCookie(url: string, sourceId?: string) {
  const requestCookie = requestCookieStorage.getStore()?.trim();
  if (requestCookie) return requestCookie;

  const hostKey = normalizedEnvKey(new URL(url).hostname);
  const sourceKey = normalizedEnvKey(sourceId);
  const candidates = [
    sourceKey && `GRIMOIRE_SOURCE_COOKIE_${sourceKey}`,
    sourceKey && `SOURCE_COOKIE_${sourceKey}`,
    sourceKey && `${sourceKey}_COOKIE`,
    hostKey && `GRIMOIRE_SOURCE_COOKIE_${hostKey}`,
    hostKey && `SOURCE_COOKIE_${hostKey}`,
    hostKey && `${hostKey}_COOKIE`
  ].filter(Boolean) as string[];

  for (const key of candidates) {
    const value = env[key]?.trim();
    if (value) return value;
  }
  return '';
}

function isBlockedResponse(body: string, effectiveUrl: string) {
  return (
    effectiveUrl.includes('internet-positif') ||
    /internet\s*positif|cf-mitigated|Just a moment|Attention Required|cf[_-]challenge|cf_clearance/i.test(body)
  );
}

function blockedError(effectiveUrl: string) {
  return Object.assign(new Error(`Source diblokir atau meminta challenge browser (${effectiveUrl}).`), {
    status: 403,
    code: 'SOURCE_BLOCKED'
  });
}

async function fetchTextWithCurl(url: string, init: SourceFetchInit) {
  const statusMarker = '__GRIMOIRE_HTTP_STATUS__';
  const args = [
    '-k',
    '-L',
    '-sS',
    '--max-time',
    String(Math.ceil(REQUEST_TIMEOUT / 1000)),
    '-A',
    USER_AGENT,
    '-w',
    `\n${statusMarker}%{http_code} %{url_effective}`
  ];
  for (const [name, value] of headersToEntries(init.headers)) {
    args.push('-H', `${name}: ${value}`);
  }
  if (init.method) args.push('-X', init.method);
  if (typeof init.body === 'string') args.push('--data-raw', init.body);
  args.push(url);

  const { stdout } = await execFileAsync('curl', args, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    timeout: REQUEST_TIMEOUT + 5_000
  });
  const markerIndex = stdout.lastIndexOf(statusMarker);
  if (markerIndex < 0) return stdout;

  const body = stdout.slice(0, markerIndex);
  const [statusRaw, effectiveUrl = url] = stdout.slice(markerIndex + statusMarker.length).trim().split(/\s+/, 2);
  const status = Number(statusRaw);
  if (isBlockedResponse(body, effectiveUrl)) {
    throw blockedError(effectiveUrl);
  }
  if (status >= 400) {
    throw Object.assign(
      new Error(`Source returned HTTP ${status}`),
      {
        status,
        code: 'SOURCE_HTTP_ERROR'
      }
    );
  }
  return body;
}

export async function fetchText(url: string, init: SourceFetchInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  const cookie = sourceCookie(url, init.sourceId);
  const headers = {
    Accept: 'text/html,application/xhtml+xml,application/json,*/*',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    Referer: new URL(url).origin + '/',
    'User-Agent': USER_AGENT,
    ...(cookie ? { Cookie: cookie } : {}),
    ...(init.headers ?? {})
  };
  try {
    const response = await undiciFetch(url, {
      dispatcher: relaxedAgent,
      ...init,
      headers,
      signal: controller.signal
    } as Parameters<typeof undiciFetch>[1]);
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        return await fetchTextWithCurl(url, { ...init, headers });
      }
      throw Object.assign(new Error(`Source returned HTTP ${response.status}`), {
        status: response.status,
        code: 'SOURCE_HTTP_ERROR'
      });
    }
    const text = await response.text();
    if (isBlockedResponse(text, response.url || url)) throw blockedError(response.url || url);
    return text;
  } catch (error) {
    try {
      return await fetchTextWithCurl(url, { ...init, headers });
    } catch {
      // Preserve the original network error; it usually carries the more useful source failure.
    }
    if (error instanceof Error && 'status' in error) throw error;
    const message = error instanceof Error ? error.message : 'network request failed';
    throw Object.assign(new Error(`Source tidak bisa diakses dari jaringan ini (${message}).`), {
      status: 503,
      code: 'SOURCE_NETWORK_BLOCKED'
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function loadHtml(html: string) {
  return cheerio.load(html);
}
