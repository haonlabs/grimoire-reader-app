import { error } from "@sveltejs/kit";
import { s as sourceDomains } from "../../../../chunks/registry.js";
const IMAGE_TIMEOUT = 15e3;
function xorDecrypt(bytes, hexKey) {
  const key = hexKey.match(/.{1,2}/g)?.map((part) => Number.parseInt(part, 16)) ?? [];
  if (!key.length || key.some((byte) => Number.isNaN(byte))) return bytes;
  return bytes.map((byte, index) => byte ^ key[index % key.length]);
}
function allowedImageHost(hostname) {
  const domains = sourceDomains();
  return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`)) || hostname === "uploads.mangadex.org" || hostname.endsWith(".mangadex.network") || hostname === "cdn.komikcast.com" || hostname.endsWith(".imgkc1.my.id") || hostname === "assets.shngm.id" || hostname === "storage.shngm.id" || hostname === "jumpg-assets.tokyo-cdn.com" || hostname === "static.mfcdn.nl" || hostname.endsWith(".mfcdn.nl") || hostname === "thumbnail.komiku.org" || hostname === "img.komiku.org" || hostname.endsWith(".komiku.org") || hostname.endsWith(".bato.to") || hostname.endsWith(".wto.to") || hostname.endsWith(".fto.to") || hostname.endsWith(".mangatoto.com") || hostname.endsWith(".batocomic.net");
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT);
  const response = await fetch(target, {
    headers: {
      Referer: `${target.origin}/`,
      "User-Agent": "GrimoireReader/0.1"
    },
    signal: controller.signal
  }).finally(() => clearTimeout(timer));
  if (!response.ok || !response.body) {
    error(response.status || 502, "Image source failed");
  }
  if (target.hostname === "jumpg-assets.tokyo-cdn.com" && target.hash.length > 1) {
    const encrypted = new Uint8Array(await response.arrayBuffer());
    const decrypted = xorDecrypt(encrypted, target.hash.slice(1));
    return new Response(Buffer.from(decrypted), {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "image/jpeg",
        "cache-control": "public, max-age=86400"
      }
    });
  }
  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "image/jpeg",
      "cache-control": "public, max-age=86400"
    }
  });
}
export {
  GET
};
