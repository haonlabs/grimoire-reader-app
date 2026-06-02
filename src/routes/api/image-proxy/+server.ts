import { error } from '@sveltejs/kit';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { sourceDomains } from '$lib/sources/registry';

const IMAGE_TIMEOUT = 15_000;
const CACHE_VERSION = 'v2';
const CACHE_DIR = path.join(process.cwd(), '.cache', 'image-proxy');
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

interface CachedImageMeta {
  url: string;
  contentType: string;
  createdAt: string;
}

function xorDecrypt(bytes: Uint8Array, hexKey: string) {
  const key = hexKey.match(/.{1,2}/g)?.map((part) => Number.parseInt(part, 16)) ?? [];
  if (!key.length || key.some((byte) => Number.isNaN(byte))) return bytes;
  return bytes.map((byte, index) => byte ^ key[index % key.length]);
}

function mangadexDataSaverFallback(target: URL) {
  if (
    (target.hostname === 'uploads.mangadex.org' || target.hostname.endsWith('.mangadex.network')) &&
    target.pathname.includes('/data/')
  ) {
    const fallback = new URL(target);
    fallback.pathname = fallback.pathname.replace('/data/', '/data-saver/');
    return fallback;
  }
  return null;
}

function unwrapDoujinpoiImageCdn(target: URL) {
  if (target.hostname === 'cdn.manhwature.com' && target.pathname.startsWith('/desu.photos/')) {
    const fallback = new URL(target);
    fallback.hostname = 'desu.photos';
    fallback.pathname = target.pathname.replace(/^\/desu\.photos/, '');
    return fallback;
  }
  return target;
}

function allowedImageHost(hostname: string) {
  const domains = sourceDomains();
  return (
    domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`)) ||
    hostname === 'uploads.mangadex.org' ||
    hostname.endsWith('.mangadex.network') ||
    hostname === 'cdn.komikcast.com' ||
    hostname === 'cdn.asurascans.com' ||
    hostname.endsWith('.asurascans.com') ||
    hostname.endsWith('.imgkc1.my.id') ||
    hostname === 'assets.shngm.id' ||
    hostname === 'storage.shngm.id' ||
    hostname === 'jumpg-assets.tokyo-cdn.com' ||
    hostname === 'thumbnail.komiku.org' ||
    hostname === 'img.komiku.org' ||
    hostname.endsWith('.komiku.org') ||
    hostname === 'cdn.uqni.net' ||
    hostname.endsWith('.uqni.net') ||
    hostname === 'i0.wp.com' ||
    hostname === 'cdn.hentaisubindo.eu.org' ||
    hostname.endsWith('.hentaisubindo.eu.org') ||
    hostname === 'cdn.manhwature.com' ||
    hostname.endsWith('.manhwature.com') ||
    hostname === 'desu.photos' ||
    hostname.endsWith('.desu.photos') ||
    hostname === 'images.manhwaland.email' ||
    hostname === 'img.manhwaland.email' ||
    hostname === 'cover.eromanga.cfd' ||
    hostname === 'reader.eromanga.cfd' ||
    hostname.endsWith('.eromanga.cfd')
  );
}

function cacheKey(raw: string) {
  return createHash('sha256').update(`${CACHE_VERSION}:${raw}`).digest('hex');
}

function cachePaths(raw: string) {
  const key = cacheKey(raw);
  return {
    body: path.join(CACHE_DIR, `${key}.bin`),
    meta: path.join(CACHE_DIR, `${key}.json`)
  };
}

function imageResponse(bytes: Uint8Array, contentType: string, cacheStatus: 'HIT' | 'MISS') {
  return new Response(Buffer.from(bytes), {
    headers: {
      'content-type': contentType,
      'content-length': String(bytes.byteLength),
      'cache-control': CACHE_CONTROL,
      'x-image-cache': cacheStatus
    }
  });
}

async function readCachedImage(raw: string) {
  const paths = cachePaths(raw);
  try {
    const [metaRaw, body] = await Promise.all([readFile(paths.meta, 'utf8'), readFile(paths.body)]);
    const meta = JSON.parse(metaRaw) as CachedImageMeta;
    if (meta.url !== raw) return null;
    return imageResponse(body, meta.contentType || 'image/jpeg', 'HIT');
  } catch {
    return null;
  }
}

async function writeCachedImage(raw: string, bytes: Uint8Array, contentType: string) {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    const paths = cachePaths(raw);
    const meta: CachedImageMeta = {
      url: raw,
      contentType,
      createdAt: new Date().toISOString()
    };
    await Promise.all([writeFile(paths.body, bytes), writeFile(paths.meta, JSON.stringify(meta))]);
  } catch {
    // Cache is an optimization; image delivery should still work if the disk cache cannot be written.
  }
}

export async function GET({ url, fetch }) {
  const raw = url.searchParams.get('url');
  if (!raw) error(400, 'Missing image URL');

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    error(400, 'Invalid image URL');
  }

  if (!['http:', 'https:'].includes(target.protocol) || !allowedImageHost(target.hostname)) {
    error(403, 'Image host is not registered as an enabled source domain');
  }

  const cached = await readCachedImage(raw);
  if (cached) return cached;

  const imageTarget = unwrapDoujinpoiImageCdn(target);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT);
  let response = await fetch(imageTarget, {
    headers: {
      Referer: `${imageTarget.origin}/`,
      'User-Agent': 'GrimoireReader/0.1'
    },
    signal: controller.signal
  }).finally(() => clearTimeout(timer));

  const mangaDexFallback = !response.ok ? mangadexDataSaverFallback(imageTarget) : null;
  if (mangaDexFallback) {
    response = await fetch(mangaDexFallback, {
      headers: {
        Referer: `${mangaDexFallback.origin}/`,
        'User-Agent': 'GrimoireReader/0.1'
      }
    });
  }

  if (!response.ok || !response.body) {
    error(response.status || 502, 'Image source failed');
  }

  const contentType = response.headers.get('content-type') ?? 'image/jpeg';
  let bytes = Buffer.from(await response.arrayBuffer());
  let outputContentType = contentType;

  if (imageTarget.hostname === 'jumpg-assets.tokyo-cdn.com' && imageTarget.hash.length > 1) {
    bytes = Buffer.from(xorDecrypt(bytes, imageTarget.hash.slice(1)));
  }

  await writeCachedImage(raw, bytes, outputContentType);
  return imageResponse(bytes, outputContentType, 'MISS');
}
