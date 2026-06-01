import { error } from "@sveltejs/kit";
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { s as sourceDomains } from "../../../../chunks/registry.js";
const IMAGE_TIMEOUT = 15e3;
const CACHE_VERSION = "v2";
const CACHE_DIR = path.join(process.cwd(), ".cache", "image-proxy");
const CACHE_CONTROL = "public, max-age=31536000, immutable";
const MANGAFIRE_PIECE_SIZE = 200;
const MANGAFIRE_MIN_SPLIT_COUNT = 5;
function xorDecrypt(bytes, hexKey) {
  const key = hexKey.match(/.{1,2}/g)?.map((part) => Number.parseInt(part, 16)) ?? [];
  if (!key.length || key.some((byte) => Number.isNaN(byte))) return bytes;
  return bytes.map((byte, index) => byte ^ key[index % key.length]);
}
function ceilDiv(value, divisor) {
  return Math.ceil(value / divisor);
}
function scrambledOffset(hash) {
  const match = /^#scrambled_(\d+)$/.exec(hash);
  return match ? Number.parseInt(match[1], 10) : 0;
}
function mangadexDataSaverFallback(target) {
  if ((target.hostname === "uploads.mangadex.org" || target.hostname.endsWith(".mangadex.network")) && target.pathname.includes("/data/")) {
    const fallback = new URL(target);
    fallback.pathname = fallback.pathname.replace("/data/", "/data-saver/");
    return fallback;
  }
  return null;
}
async function descrambleMangaFireImage(bytes, offset) {
  const source = sharp(Buffer.from(bytes), { animated: false });
  const metadata = await source.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!width || !height || offset < 1) return null;
  const pieceWidth = Math.min(MANGAFIRE_PIECE_SIZE, ceilDiv(width, MANGAFIRE_MIN_SPLIT_COUNT));
  const pieceHeight = Math.min(MANGAFIRE_PIECE_SIZE, ceilDiv(height, MANGAFIRE_MIN_SPLIT_COUNT));
  const xMax = ceilDiv(width, pieceWidth) - 1;
  const yMax = ceilDiv(height, pieceHeight) - 1;
  const composite = [];
  for (let y = 0; y <= yMax; y += 1) {
    for (let x = 0; x <= xMax; x += 1) {
      const left = pieceWidth * x;
      const top = pieceHeight * y;
      const tileWidth = Math.min(pieceWidth, width - left);
      const tileHeight = Math.min(pieceHeight, height - top);
      const sourceX = pieceWidth * (x === xMax || xMax === 0 ? x : (xMax - x + offset) % xMax);
      const sourceY = pieceHeight * (y === yMax || yMax === 0 ? y : (yMax - y + offset) % yMax);
      composite.push({
        input: await source.clone().extract({ left: sourceX, top: sourceY, width: tileWidth, height: tileHeight }).toBuffer(),
        left,
        top
      });
    }
  }
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).composite(composite).webp({ quality: 95 }).toBuffer();
}
function allowedImageHost(hostname) {
  const domains = sourceDomains();
  return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`)) || hostname === "uploads.mangadex.org" || hostname.endsWith(".mangadex.network") || hostname === "cdn.komikcast.com" || hostname.endsWith(".imgkc1.my.id") || hostname === "assets.shngm.id" || hostname === "storage.shngm.id" || hostname === "jumpg-assets.tokyo-cdn.com" || hostname === "static.mfcdn.nl" || hostname.endsWith(".mfcdn.nl") || hostname === "thumbnail.komiku.org" || hostname === "img.komiku.org" || hostname.endsWith(".komiku.org") || hostname === "cdn.uqni.net" || hostname.endsWith(".uqni.net") || hostname.endsWith(".bato.to") || hostname.endsWith(".wto.to") || hostname.endsWith(".fto.to") || hostname.endsWith(".hto.to") || hostname.endsWith(".mto.to") || hostname.endsWith(".dto.to") || hostname.endsWith(".jto.to") || hostname.endsWith(".mangatoto.com") || hostname.endsWith(".mangatoto.net") || hostname.endsWith(".mangatoto.org") || hostname.endsWith(".batocomic.com") || hostname.endsWith(".batocomic.net") || hostname.endsWith(".batocomic.org") || hostname.endsWith(".batotoo.com") || hostname.endsWith(".batotwo.com") || hostname.endsWith(".battwo.com") || hostname.endsWith(".comiko.net") || hostname.endsWith(".comiko.org") || hostname.endsWith(".readtoto.com") || hostname.endsWith(".readtoto.net") || hostname.endsWith(".readtoto.org") || hostname.endsWith(".xbato.com") || hostname.endsWith(".xbato.net") || hostname.endsWith(".xbato.org") || hostname.endsWith(".zbato.com") || hostname.endsWith(".zbato.net") || hostname.endsWith(".zbato.org");
}
function cacheKey(raw) {
  return createHash("sha256").update(`${CACHE_VERSION}:${raw}`).digest("hex");
}
function cachePaths(raw) {
  const key = cacheKey(raw);
  return {
    body: path.join(CACHE_DIR, `${key}.bin`),
    meta: path.join(CACHE_DIR, `${key}.json`)
  };
}
function imageResponse(bytes, contentType, cacheStatus) {
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": contentType,
      "cache-control": CACHE_CONTROL,
      "x-image-cache": cacheStatus
    }
  });
}
async function readCachedImage(raw) {
  const paths = cachePaths(raw);
  try {
    const [metaRaw, body] = await Promise.all([readFile(paths.meta, "utf8"), readFile(paths.body)]);
    const meta = JSON.parse(metaRaw);
    if (meta.url !== raw) return null;
    return imageResponse(body, meta.contentType || "image/jpeg", "HIT");
  } catch {
    return null;
  }
}
async function writeCachedImage(raw, bytes, contentType) {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    const paths = cachePaths(raw);
    const meta = {
      url: raw,
      contentType,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await Promise.all([writeFile(paths.body, bytes), writeFile(paths.meta, JSON.stringify(meta))]);
  } catch {
  }
}
async function GET({ url, fetch }) {
  const raw = url.searchParams.get("url");
  if (!raw) error(400, "Missing image URL");
  let target;
  try {
    target = new URL(raw);
  } catch {
    error(400, "Invalid image URL");
  }
  if (!["http:", "https:"].includes(target.protocol) || !allowedImageHost(target.hostname)) {
    error(403, "Image host is not registered as an enabled source domain");
  }
  const cached = await readCachedImage(raw);
  if (cached) return cached;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT);
  let response = await fetch(target, {
    headers: {
      Referer: `${target.origin}/`,
      "User-Agent": "GrimoireReader/0.1"
    },
    signal: controller.signal
  }).finally(() => clearTimeout(timer));
  const mangaDexFallback = !response.ok ? mangadexDataSaverFallback(target) : null;
  if (mangaDexFallback) {
    response = await fetch(mangaDexFallback, {
      headers: {
        Referer: `${mangaDexFallback.origin}/`,
        "User-Agent": "GrimoireReader/0.1"
      }
    });
  }
  if (!response.ok || !response.body) {
    error(response.status || 502, "Image source failed");
  }
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  let bytes = Buffer.from(await response.arrayBuffer());
  let outputContentType = contentType;
  if (target.hostname === "jumpg-assets.tokyo-cdn.com" && target.hash.length > 1) {
    bytes = Buffer.from(xorDecrypt(bytes, target.hash.slice(1)));
  }
  const mangafireOffset = scrambledOffset(target.hash);
  if (mangafireOffset > 0 && (target.hostname === "static.mfcdn.nl" || target.hostname.endsWith(".mfcdn.nl"))) {
    const descrambled = await descrambleMangaFireImage(bytes, mangafireOffset);
    if (descrambled) {
      bytes = Buffer.from(descrambled);
      outputContentType = "image/webp";
    }
  }
  await writeCachedImage(raw, bytes, outputContentType);
  return imageResponse(bytes, outputContentType, "MISS");
}
export {
  GET
};
