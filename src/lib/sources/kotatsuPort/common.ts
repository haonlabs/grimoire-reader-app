import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import { AsyncLocalStorage } from 'node:async_hooks';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Agent, fetch as undiciFetch } from 'undici';
import { env } from '$env/dynamic/private';
import type { MangaFormat, MangaStatus } from '$lib/sources/types';

const REQUEST_TIMEOUT = 15_000;
const BROWSER_GATEWAY_TIMEOUT = 75_000;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';
const TRUSTED_DNS_FALLBACK_HOSTS = new Set(['crotpedia.net', 'doujin.desu.xxx']);
const BROWSER_GATEWAY_SOURCE_IDS = new Set(['crotpedia', 'doujindesu']);
const DNS_CACHE_TTL = 5 * 60_000;

const relaxedAgent = new Agent({
  connect: {
    rejectUnauthorized: false
  }
});
const execFileAsync = promisify(execFile);
const trustedDnsCache = new Map<string, { addresses: string[]; expiresAt: number }>();

type SourceFetchInit = RequestInit & {
  body?: BodyInit | null;
  sourceId?: string;
};
interface SourceRequestProfile {
  cookie?: string;
  userAgent?: string;
}
const requestProfileStorage = new AsyncLocalStorage<SourceRequestProfile>();

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

export async function withSourceRequestCookie<T>(cookie: string, handler: () => Promise<T>, userAgent = '') {
  return requestProfileStorage.run({ cookie, userAgent }, handler);
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
  const requestCookie = requestProfileStorage.getStore()?.cookie?.trim();
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

function sourceUserAgent() {
  const userAgent = requestProfileStorage.getStore()?.userAgent?.trim();
  return userAgent || USER_AGENT;
}

function isBlockedResponse(body: string, effectiveUrl: string) {
  return (
    effectiveUrl.includes('internet-positif') ||
    /internet\s*positif|Imunify360|bot-protection|Access denied|cf-mitigated|Just a moment|Tunggu sebentar|Melakukan verifikasi keamanan|Menunggu response|One moment,\s*please|Attention Required|cf[_-]challenge|challenge-platform|webdriverCheck|__CF\$cv|cf_clearance/i.test(body)
  );
}

function blockedError(effectiveUrl: string) {
  const message = effectiveUrl.includes('internet-positif')
    ? `Source diblokir oleh DNS ISP (${effectiveUrl}). Coba Private DNS/VPN, lalu buka Unlock Source jika situs meminta challenge.`
    : `Source meminta challenge browser (${effectiveUrl}). Buka situs sampai lolos challenge/login, lalu simpan cookie dan User-Agent lewat Unlock Source.`;
  return Object.assign(new Error(message), {
    status: 403,
    code: 'SOURCE_BLOCKED'
  });
}

function browserGatewayConfig(sourceId?: string) {
  if (!sourceId || !BROWSER_GATEWAY_SOURCE_IDS.has(sourceId)) return null;
  const baseUrl = env.GRIMOIRE_BROWSER_GATEWAY_URL?.trim().replace(/\/$/, '');
  const token = env.GRIMOIRE_BROWSER_GATEWAY_TOKEN?.trim();
  if (!baseUrl || !token) return null;
  try {
    const parsed = new URL(baseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return { baseUrl, token };
  } catch {
    return null;
  }
}

async function fetchTextWithBrowserGateway(url: string, init: SourceFetchInit) {
  const config = browserGatewayConfig(init.sourceId);
  if (!config) return null;

  const response = await undiciFetch(`${config.baseUrl}/v1/fetch`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url,
      headers: Object.fromEntries(
        headersToEntries(init.headers).filter(([name]) => ['accept', 'x-app-secret'].includes(name.toLowerCase()))
      )
    }),
    signal: AbortSignal.timeout(BROWSER_GATEWAY_TIMEOUT)
  });
  const payload = (await response.json()) as { error?: string; finalUrl?: string; html?: string };
  if (!response.ok || typeof payload.html !== 'string') {
    throw Object.assign(new Error(payload.error || `Browser gateway returned HTTP ${response.status}`), {
      status: response.status >= 400 ? response.status : 502,
      code: 'BROWSER_GATEWAY_FAILED'
    });
  }
  const finalUrl = payload.finalUrl || url;
  if (isBlockedResponse(payload.html, finalUrl)) throw blockedError(finalUrl);
  return payload.html;
}

async function trustedDnsAddresses(url: string) {
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase();
  if (parsed.protocol !== 'https:' || !TRUSTED_DNS_FALLBACK_HOSTS.has(hostname)) return [];

  const cached = trustedDnsCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) return cached.addresses;

  try {
    const response = await undiciFetch(
      `https://1.1.1.1/dns-query?name=${encodeURIComponent(hostname)}&type=A`,
      {
        dispatcher: relaxedAgent,
        headers: { Accept: 'application/dns-json' },
        signal: AbortSignal.timeout(5_000)
      }
    );
    if (!response.ok) return [];
    const payload = (await response.json()) as { Answer?: Array<{ data?: string; type?: number }> };
    const addresses = (payload.Answer ?? [])
      .filter((answer) => answer.type === 1 && /^\d{1,3}(?:\.\d{1,3}){3}$/.test(answer.data ?? ''))
      .map((answer) => answer.data as string);
    if (addresses.length) {
      trustedDnsCache.set(hostname, { addresses, expiresAt: Date.now() + DNS_CACHE_TTL });
    }
    return addresses;
  } catch {
    return [];
  }
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
  const trustedAddresses = await trustedDnsAddresses(url);
  if (trustedAddresses.length) {
    const parsed = new URL(url);
    args.push('--resolve', `${parsed.hostname}:443:${trustedAddresses[0]}`);
  }
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
    'User-Agent': sourceUserAgent(),
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
      const responseBody = await response.text();
      if (response.status === 403 || response.status === 429 || isBlockedResponse(responseBody, response.url || url)) {
        throw blockedError(response.url || url);
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
    let fallbackError: unknown;
    try {
      return await fetchTextWithCurl(url, { ...init, headers });
    } catch (curlError) {
      fallbackError = curlError;
    }
    try {
      const gatewayResult = await fetchTextWithBrowserGateway(url, init);
      if (gatewayResult !== null) return gatewayResult;
    } catch (gatewayError) {
      fallbackError = gatewayError;
    }
    if (fallbackError instanceof Error && 'status' in fallbackError) throw fallbackError;
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
