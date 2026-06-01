import { createDecipheriv, createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Agent, fetch as fetch$1 } from "undici";
import { p as private_env } from "./shared-server.js";
import { n as normalizeMangaFormat } from "./mangaFormat.js";
const SITE_BASE$7 = "https://wto.to";
const REQUEST_TIMEOUT$8 = 15e3;
function encodeId$4(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}
function decodeId$4(value) {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return value;
  }
}
function clean$4(text) {
  return text?.replace(/\s+/g, " ").trim() ?? "";
}
function absoluteUrl$4(baseUrl, href) {
  if (!href) return "";
  return new URL(href, baseUrl).toString();
}
function statusFrom$8(text) {
  const value = text?.toLowerCase() ?? "";
  if (value.includes("completed")) return "completed";
  if (value.includes("cancelled")) return "cancelled";
  if (value.includes("hiatus")) return "hiatus";
  return "ongoing";
}
function numberFrom$4(text, fallback) {
  const match = text.replace(",", ".").match(/([0-9]+(?:\.[0-9]+)?)/);
  return match ? Number(match[1]) : fallback;
}
function sortFrom$6(filters) {
  const sort = filters?.find((entry) => entry.id === "sort")?.value;
  if (sort === "popular") return "views_a.za";
  if (sort === "newest") return "create.za";
  return "update.za";
}
async function fetchHtml$2(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT$8);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        Referer: `${SITE_BASE$7}/`,
        "User-Agent": "GrimoireReader/0.1"
      },
      signal: controller.signal
    });
    if (!response.ok) {
      const text = await response.text();
      if (/challenge-platform|cf-mitigated|Just a moment/i.test(text)) {
        throw Object.assign(new Error("Bato.to sedang memblokir request otomatis dengan Cloudflare challenge."), {
          status: 503,
          code: "SOURCE_ANTI_BOT"
        });
      }
      throw Object.assign(new Error(`Bato.to returned HTTP ${response.status}`), {
        status: response.status,
        code: "SOURCE_HTTP_ERROR"
      });
    }
    return response.text();
  } catch (error) {
    if (error instanceof Error && "status" in error) throw error;
    const message = error instanceof Error ? error.message : "network request failed";
    throw Object.assign(new Error(`Bato.to tidak bisa diakses dari jaringan ini (${message}).`), {
      status: 503,
      code: "SOURCE_NETWORK_BLOCKED"
    });
  } finally {
    clearTimeout(timeout);
  }
}
function relativeDate(value) {
  const match = value?.match(/(\d+)\s*(sec|min|hour|day|week|month|year)/i);
  if (!match) return (/* @__PURE__ */ new Date()).toISOString();
  const date = /* @__PURE__ */ new Date();
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === "sec") date.setSeconds(date.getSeconds() - amount);
  if (unit === "min") date.setMinutes(date.getMinutes() - amount);
  if (unit === "hour") date.setHours(date.getHours() - amount);
  if (unit === "day") date.setDate(date.getDate() - amount);
  if (unit === "week") date.setDate(date.getDate() - amount * 7);
  if (unit === "month") date.setMonth(date.getMonth() - amount);
  if (unit === "year") date.setFullYear(date.getFullYear() - amount);
  return date.toISOString();
}
function parseTags($, node) {
  return node.children().map((_, element) => clean$4($(element).text())).get().filter(Boolean);
}
function evpBytesToKey(password, salt, keyLength, ivLength) {
  let generated = Buffer.alloc(0);
  let block = Buffer.alloc(0);
  while (generated.length < keyLength + ivLength) {
    const hash = createHash("md5");
    hash.update(block);
    hash.update(password);
    hash.update(salt);
    block = hash.digest();
    generated = Buffer.concat([generated, block]);
  }
  return {
    key: generated.subarray(0, keyLength),
    iv: generated.subarray(keyLength, keyLength + ivLength)
  };
}
function decryptOpenSslAes(value, password) {
  const data = Buffer.from(value, "base64");
  const salt = data.subarray(8, 16);
  const encrypted = data.subarray(16);
  const { key, iv } = evpBytesToKey(Buffer.from(password, "utf8"), salt, 32, 16);
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
function evaluateBatoPass(expression) {
  const trimmed = expression.trim();
  if (/^['"].*['"]$/.test(trimmed)) return trimmed.slice(1, -1);
  return String(Function(`"use strict"; return (${trimmed});`)());
}
class BatoToSource {
  id = "batoto";
  name = "Bato.to";
  baseUrl = SITE_BASE$7;
  language = "multi";
  contentRating = "suggestive";
  isNsfw = false;
  async getList(page, filters) {
    const url = new URL("/browse", SITE_BASE$7);
    url.searchParams.set("sort", sortFrom$6(filters));
    url.searchParams.set("page", String(Math.max(1, page)));
    const items = this.parseList(await fetchHtml$2(url.toString()));
    return { items, page, hasNextPage: items.length > 0 };
  }
  async search(query, page) {
    if (!query.trim()) return this.getList(page);
    const url = new URL("/search", SITE_BASE$7);
    url.searchParams.set("word", query.trim());
    url.searchParams.set("page", String(Math.max(1, page)));
    const items = this.parseList(await fetchHtml$2(url.toString()));
    return { items, page, hasNextPage: items.length > 0 };
  }
  async getDetail(mangaId) {
    const url = decodeId$4(mangaId);
    const $ = cheerio.load(await fetchHtml$2(url));
    const root = $("#mainer");
    const details = root.find(".detail-set").first();
    const attrs = /* @__PURE__ */ new Map();
    details.find(".attr-main .attr-item").each((_, element) => {
      const children = $(element).children();
      attrs.set(clean$4(children.eq(0).text()), children.eq(1));
    });
    const title = clean$4(root.find("h3.item-title").text()) || "Untitled";
    return {
      id: mangaId,
      sourceId: this.id,
      title,
      coverUrl: absoluteUrl$4(url, details.find("img[src]").attr("src")),
      author: clean$4(attrs.get("Authors:")?.text()) || void 0,
      description: details.find("#limit-height-body-summary .limit-html").html() ?? void 0,
      status: statusFrom$8(clean$4(attrs.get("Original work:")?.text())),
      genres: attrs.get("Genres:") ? parseTags($, attrs.get("Genres:")) : [],
      url,
      alternateTitles: [clean$4(root.find(".item-alias").text())].filter(Boolean)
    };
  }
  async getChapters(mangaId) {
    const url = decodeId$4(mangaId);
    const $ = cheerio.load(await fetchHtml$2(url));
    return $(".episode-list .main").children().map((index, element) => {
      const node = $(element);
      const link = node.find("a.chapt").first();
      const chapterUrl = absoluteUrl$4(url, link.attr("href"));
      const title = clean$4(link.text());
      const extra = node.find(".extra");
      return {
        id: encodeId$4(chapterUrl),
        mangaId,
        sourceId: this.id,
        number: numberFrom$4(title, index + 1),
        title,
        language: "multi",
        uploadedAt: relativeDate(clean$4(extra.find("i").last().text())),
        scanlator: clean$4(extra.find('a[href*="/group/"]').text()) || void 0,
        url: chapterUrl
      };
    }).get().filter((chapter) => chapter.url).reverse();
  }
  async getPages(chapterId) {
    const url = decodeId$4(chapterId);
    const $ = cheerio.load(await fetchHtml$2(url));
    for (const script of $("script").toArray()) {
      const body = $(script).html() ?? "";
      const marker = body.indexOf("const imgHttps =");
      if (marker === -1) continue;
      const start = body.indexOf("[", marker);
      const end = body.indexOf(";", start);
      if (start === -1 || end === -1) continue;
      const images = JSON.parse(body.slice(start, end));
      const passExpression = body.match(/batoPass\s*=\s*([^;]+)/)?.[1];
      const encryptedWord = body.match(/batoWord\s*=\s*['"]([^'"]+)['"]/)?.[1];
      if (!passExpression || !encryptedWord) return images;
      const password = evaluateBatoPass(passExpression);
      const args = JSON.parse(decryptOpenSslAes(encryptedWord, password));
      return images.map((image, index) => args[index] ? `${image}?${args[index]}` : image);
    }
    return [];
  }
  async getFilters() {
    return [
      {
        id: "sort",
        label: "Sort",
        type: "select",
        values: [
          { label: "Updated", value: "updated" },
          { label: "Popular", value: "popular" },
          { label: "Newest", value: "newest" }
        ]
      }
    ];
  }
  parseList(html) {
    if (/challenge-platform|cf-mitigated|Just a moment/i.test(html)) {
      throw Object.assign(new Error("Bato.to sedang memblokir request otomatis dengan Cloudflare challenge."), {
        status: 503,
        code: "SOURCE_ANTI_BOT"
      });
    }
    const $ = cheerio.load(html);
    const root = $("#series-list");
    if (!root.length) {
      throw Object.assign(new Error("Bato.to berhasil diakses, tapi selector #series-list tidak ditemukan."), {
        status: 502,
        code: "SOURCE_PARSE_EMPTY"
      });
    }
    return root.children().map((_, element) => {
      const node = $(element);
      const link = node.find("a").first();
      const url = absoluteUrl$4(SITE_BASE$7, link.attr("href"));
      const title = clean$4(node.find(".item-title").text());
      return {
        id: encodeId$4(url),
        sourceId: this.id,
        title,
        coverUrl: absoluteUrl$4(SITE_BASE$7, node.find("img[src]").attr("src")),
        status: "ongoing",
        genres: node.find(".item-genre").length ? parseTags($, node.find(".item-genre")) : [],
        url
      };
    }).get().filter((manga) => Boolean(manga.url && manga.title));
  }
}
const REQUEST_TIMEOUT$7 = 15e3;
const USER_AGENT$2 = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const relaxedAgent = new Agent({
  connect: {
    rejectUnauthorized: false
  }
});
const execFileAsync = promisify(execFile);
function encodeId$3(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}
function decodeId$3(value) {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return value;
  }
}
function clean$3(text) {
  return text?.replace(/\s+/g, " ").trim() ?? "";
}
function absoluteUrl$3(baseUrl, href) {
  if (!href || href.startsWith("#") || href.startsWith("javascript:")) return "";
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return "";
  }
}
function imageSrc($, image, baseUrl) {
  const src = image.attr("data-src") ?? image.attr("data-lazy-src") ?? image.attr("data-original") ?? image.attr("data-cfsrc") ?? image.attr("srcset")?.split(",").at(-1)?.trim().split(/\s+/)[0] ?? image.attr("src") ?? "";
  return absoluteUrl$3(baseUrl, src);
}
function statusFrom$7(text) {
  const value = clean$3(text).toLowerCase();
  if (/completed|finished|tamat|complete|selesai/.test(value)) return "completed";
  if (/hiatus|pause|on hold/.test(value)) return "hiatus";
  if (/cancel|dropped|discontinued/.test(value)) return "cancelled";
  return "ongoing";
}
function formatFrom(text) {
  const value = clean$3(text).toLowerCase();
  if (value.includes("manhwa")) return "Manhwa";
  if (value.includes("manhua")) return "Manhua";
  return "Manga";
}
function numberFrom$3(text) {
  const normalized = clean$3(text).replace(",", ".");
  const match = normalized.match(/(?:chapter|chap|ch\.?|episode|eps?)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (match) return Number(match[1]);
  const fallback = normalized.match(/([0-9]+(?:\.[0-9]+)?)/);
  return fallback ? Number(fallback[1]) : 0;
}
function headersToEntries(headers) {
  if (!headers) return [];
  if (headers instanceof Headers) return [...headers.entries()];
  if (Array.isArray(headers)) return headers;
  return Object.entries(headers);
}
function normalizedEnvKey(value) {
  return value?.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toUpperCase() ?? "";
}
function sourceCookie(url, sourceId) {
  const hostKey = normalizedEnvKey(new URL(url).hostname);
  const sourceKey = normalizedEnvKey(sourceId);
  const candidates = [
    sourceKey && `GRIMOIRE_SOURCE_COOKIE_${sourceKey}`,
    sourceKey && `SOURCE_COOKIE_${sourceKey}`,
    sourceKey && `${sourceKey}_COOKIE`,
    hostKey && `GRIMOIRE_SOURCE_COOKIE_${hostKey}`,
    hostKey && `SOURCE_COOKIE_${hostKey}`,
    hostKey && `${hostKey}_COOKIE`
  ].filter(Boolean);
  for (const key of candidates) {
    const value = private_env[key]?.trim();
    if (value) return value;
  }
  return "";
}
function isBlockedResponse(body, effectiveUrl) {
  return effectiveUrl.includes("internet-positif") || /internet\s*positif|cf-mitigated|Just a moment|Attention Required|cf[_-]challenge|cf_clearance/i.test(body);
}
function blockedError(effectiveUrl) {
  return Object.assign(new Error(`Source diblokir atau meminta challenge browser (${effectiveUrl}).`), {
    status: 403,
    code: "SOURCE_BLOCKED"
  });
}
async function fetchTextWithCurl(url, init) {
  const statusMarker = "__GRIMOIRE_HTTP_STATUS__";
  const args = [
    "-k",
    "-L",
    "-sS",
    "--max-time",
    String(Math.ceil(REQUEST_TIMEOUT$7 / 1e3)),
    "-A",
    USER_AGENT$2,
    "-w",
    `
${statusMarker}%{http_code} %{url_effective}`
  ];
  for (const [name, value] of headersToEntries(init.headers)) {
    args.push("-H", `${name}: ${value}`);
  }
  if (init.method) args.push("-X", init.method);
  if (typeof init.body === "string") args.push("--data-raw", init.body);
  args.push(url);
  const { stdout } = await execFileAsync("curl", args, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    timeout: REQUEST_TIMEOUT$7 + 5e3
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
        code: "SOURCE_HTTP_ERROR"
      }
    );
  }
  return body;
}
async function fetchText$1(url, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT$7);
  const cookie = sourceCookie(url, init.sourceId);
  const headers = {
    Accept: "text/html,application/xhtml+xml,application/json,*/*",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Referer: new URL(url).origin + "/",
    "User-Agent": USER_AGENT$2,
    ...cookie ? { Cookie: cookie } : {},
    ...init.headers ?? {}
  };
  try {
    const response = await fetch$1(url, {
      dispatcher: relaxedAgent,
      ...init,
      headers,
      signal: controller.signal
    });
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        return await fetchTextWithCurl(url, { ...init, headers });
      }
      throw Object.assign(new Error(`Source returned HTTP ${response.status}`), {
        status: response.status,
        code: "SOURCE_HTTP_ERROR"
      });
    }
    const text = await response.text();
    if (isBlockedResponse(text, response.url || url)) throw blockedError(response.url || url);
    return text;
  } catch (error) {
    try {
      return await fetchTextWithCurl(url, { ...init, headers });
    } catch {
    }
    if (error instanceof Error && "status" in error) throw error;
    const message = error instanceof Error ? error.message : "network request failed";
    throw Object.assign(new Error(`Source tidak bisa diakses dari jaringan ini (${message}).`), {
      status: 503,
      code: "SOURCE_NETWORK_BLOCKED"
    });
  } finally {
    clearTimeout(timeout);
  }
}
function loadHtml(html) {
  return cheerio.load(html);
}
const SITE_BASE$6 = "https://doujindesu.tv";
const PAGE_LIMIT$6 = 18;
function sortFrom$5(filters) {
  const sort = filters?.find((entry) => entry.id === "sort")?.value;
  if (sort === "popular") return "popular";
  if (sort === "newest") return "latest";
  if (sort === "title") return "title";
  return "update";
}
function stateFromDoujinDesu(text) {
  const value = clean$3(text);
  if (value === "Finished") return "completed";
  if (value === "Publishing") return "ongoing";
  return statusFrom$7(value);
}
function chapterDate(text) {
  return clean$3(text) || (/* @__PURE__ */ new Date()).toISOString();
}
class DoujinDesuSource {
  id;
  name = "DoujinDesu.tv";
  baseUrl = SITE_BASE$6;
  language = "id";
  contentRating = "explicit";
  isNsfw = true;
  constructor(id = "doujindesu") {
    this.id = id;
  }
  async getList(page, filters) {
    const url = new URL(page > 1 ? `/manga/page/${Math.max(1, page)}/` : "/manga/", SITE_BASE$6);
    url.searchParams.set("order", sortFrom$5(filters));
    const query = filters?.find((entry) => entry.id === "title")?.value;
    if (typeof query === "string" && query.trim()) url.searchParams.set("title", query.trim());
    const items = this.parseList(await this.fetch(url.toString()));
    return { items, page, hasNextPage: items.length >= PAGE_LIMIT$6 };
  }
  async search(query, page, filters) {
    if (!query.trim()) return this.getList(page, filters);
    return this.getList(page, [{ id: "title", value: query.trim() }, ...filters ?? []]);
  }
  async getDetail(mangaId) {
    const url = decodeId$3(mangaId);
    const $ = loadHtml(await this.fetch(url));
    const root = $("#archive");
    const metadata = root.find(".wrapper > .metadata tbody");
    const title = clean$3(root.find("h1").first().text()) || clean$3(root.find(".metadata h1").first().text()) || "Untitled";
    const statusText = metadata.find('tr:contains("Status") td').last().text();
    const author = clean$3(metadata.find('tr:contains("Author") td').last().text()) || void 0;
    const type = clean$3(metadata.find('tr:contains("Type") td').last().text());
    const cover = imageSrc($, root.find(".thumbnail img, .thumb img, img").first(), SITE_BASE$6);
    return {
      id: mangaId,
      sourceId: this.id,
      title,
      coverUrl: cover,
      author,
      description: clean$3(root.find(".wrapper > .metadata > .pb-2 p").text()) || clean$3(root.find(".entry-content").text()),
      status: stateFromDoujinDesu(statusText),
      format: formatFrom(type),
      genres: root.find(".tags > a").map((_, element) => clean$3($(element).text())).get().filter(Boolean),
      rating: Number(metadata.find(".rating-prc").first().text()) / 10 || void 0,
      url,
      alternateTitles: []
    };
  }
  async getChapters(mangaId) {
    const url = decodeId$3(mangaId);
    const $ = loadHtml(await this.fetch(url));
    const chapters = $("#chapter_list ul > li").map((index, element) => {
      const node = $(element);
      const link = node.find(".epsleft > .lchx > a, a").first();
      const chapterUrl = absoluteUrl$3(SITE_BASE$6, link.attr("href"));
      const title = clean$3(link.text()) || clean$3(link.attr("title"));
      return {
        id: encodeId$3(chapterUrl),
        mangaId,
        sourceId: this.id,
        number: numberFrom$3(title) || index + 1,
        title,
        language: "id",
        uploadedAt: chapterDate(node.find(".epsleft > .date, .date").text()),
        url: chapterUrl
      };
    }).get().filter((chapter) => chapter.url);
    return chapters.sort((left, right) => right.number - left.number);
  }
  async getPages(chapterId) {
    const chapterUrl = decodeId$3(chapterId);
    const $chapter = loadHtml(await this.fetch(chapterUrl));
    const readerId = $chapter("#reader").attr("data-id");
    if (!readerId) {
      const direct = $chapter("#reader img, #readerarea img, .reader-area img, article img").map((_, element) => imageSrc($chapter, $chapter(element), SITE_BASE$6)).get().filter(Boolean);
      if (direct.length) return direct;
      throw Object.assign(new Error("No reader id found for this chapter"), {
        status: 502,
        code: "SOURCE_PARSE_FAILED"
      });
    }
    const html = await this.fetch(new URL("/themes/ajax/ch.php", SITE_BASE$6).toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest"
      },
      body: new URLSearchParams({ id: readerId }).toString()
    });
    const $ = loadHtml(html);
    return $("img").map((_, element) => imageSrc($, $(element), SITE_BASE$6)).get().filter(Boolean);
  }
  async getFilters() {
    return [
      {
        id: "sort",
        label: "Sort",
        type: "select",
        values: [
          { label: "Updated", value: "updated" },
          { label: "Newest", value: "newest" },
          { label: "Popular", value: "popular" },
          { label: "Title", value: "title" }
        ]
      }
    ];
  }
  fetch(url, init = {}) {
    return fetchText$1(url, { ...init, sourceId: this.id });
  }
  parseList(html) {
    const $ = loadHtml(html);
    const items = $("#archives div.entries .entry").map((_, element) => {
      const node = $(element);
      const link = node.find(".metadata > a").first();
      const url = absoluteUrl$3(SITE_BASE$6, link.attr("href"));
      const title = clean$3(link.attr("title")) || clean$3(link.text());
      if (!url || !title) return null;
      return {
        id: encodeId$3(url),
        sourceId: this.id,
        title,
        coverUrl: imageSrc($, node.find(".thumbnail > img, img").first(), SITE_BASE$6),
        format: "Manga",
        status: "ongoing",
        genres: [],
        url
      };
    }).get().filter(Boolean);
    if (!items.length && !$("#archives").length) {
      throw Object.assign(new Error("DoujinDesu tidak mengembalikan layout arsip manga yang valid."), {
        status: 502,
        code: "SOURCE_PARSE_FAILED"
      });
    }
    return items;
  }
}
const API_BASE$4 = "https://be.komikcast.cc";
const SITE_BASE$5 = "https://v2.komikcast.fit";
const PAGE_LIMIT$5 = 24;
const REQUEST_TIMEOUT$6 = 15e3;
function statusFrom$6(value) {
  if (value === "completed") return "completed";
  if (value === "hiatus") return "hiatus";
  if (value === "cancelled") return "cancelled";
  return "ongoing";
}
function mangaIdFrom(entity) {
  return `${entity.data?.slug ?? entity.id}--${entity.id}`;
}
function splitMangaId(mangaId) {
  const match = mangaId.match(/^(.*)--(\d+)$/);
  return {
    slug: match?.[1] ?? mangaId,
    seriesId: match?.[2] ? Number(match[2]) : void 0
  };
}
function chapterIdFrom(seriesId, chapter) {
  const index = chapter.chapterIndex ?? chapter.data?.index ?? 0;
  return `${seriesId}-${chapter.id}-${index}`;
}
function splitChapterId(chapterId) {
  const [seriesId, chapterIdValue, index] = chapterId.split("-").map(Number);
  return { seriesId, chapterId: chapterIdValue, index };
}
function compactImageUrl(value) {
  return value ?? "";
}
function seriesUrl(slug) {
  return `${SITE_BASE$5}/komik/${slug ?? ""}`;
}
function mangaFromEntity$2(entity) {
  const data = entity.data ?? {};
  const slug = data.slug ?? String(entity.id);
  return {
    id: mangaIdFrom(entity),
    sourceId: "komikcast",
    title: data.title ?? data.nativeTitle ?? "Untitled",
    coverUrl: compactImageUrl(data.coverImage),
    author: data.author,
    description: data.synopsis,
    format: normalizeMangaFormat(data.format),
    status: statusFrom$6(data.status),
    genres: data.genres?.map((genre) => genre.data?.name).filter(Boolean).slice(0, 8),
    rating: data.rating,
    url: seriesUrl(slug)
  };
}
function chapterFromEntity$1(entity, mangaId, seriesId) {
  const number = entity.chapterIndex ?? entity.data?.index ?? splitChapterId(chapterIdFrom(seriesId, entity)).index ?? 0;
  const title = entity.data?.title?.trim();
  return {
    id: chapterIdFrom(seriesId, entity),
    mangaId,
    sourceId: "komikcast",
    number,
    title: title || void 0,
    language: "id",
    uploadedAt: entity.createdAt ?? entity.updatedAt ?? (/* @__PURE__ */ new Date()).toISOString(),
    url: `${SITE_BASE$5}/chapter/${entity.id}`
  };
}
async function komikcastFetch(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT$6);
  let response;
  try {
    response = await fetch(`${API_BASE$4}${path}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "GrimoireReader/0.1"
      },
      signal: controller.signal
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "network request failed";
    throw Object.assign(new Error(`Komikcast tidak bisa diakses dari jaringan ini (${message}).`), {
      status: 503,
      code: "SOURCE_NETWORK_BLOCKED"
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw Object.assign(new Error(`Komikcast request failed with HTTP ${response.status}`), {
      status: response.status,
      code: "SOURCE_REQUEST_FAILED"
    });
  }
  return response.json();
}
function listPath$2(page, query) {
  const params = new URLSearchParams({
    take: String(PAGE_LIMIT$5),
    page: String(Math.max(1, page)),
    takeChapter: "2",
    includeMeta: "true",
    sort: query ? "updatedAt" : "latest",
    sortOrder: "desc"
  });
  if (query?.trim()) {
    const safeQuery = query.trim().replaceAll('"', '\\"');
    params.set("filter", `title=like="${safeQuery}",nativeTitle=like="${safeQuery}"`);
  }
  return `/series?${params.toString()}`;
}
class KomikcastSource {
  id = "komikcast";
  name = "Komikcast";
  baseUrl = SITE_BASE$5;
  language = "id";
  contentRating = "suggestive";
  isNsfw = false;
  chapterImages = /* @__PURE__ */ new Map();
  seriesTitles = /* @__PURE__ */ new Map();
  async getList(page, _filters) {
    const response = await komikcastFetch(listPath$2(page));
    for (const series of response.data) this.rememberSeries(series);
    return {
      items: response.data.map(mangaFromEntity$2),
      page,
      hasNextPage: page < (response.meta?.lastPage ?? page),
      total: response.meta?.total
    };
  }
  async search(query, page, _filters) {
    if (!query.trim()) return this.getList(page);
    const response = await komikcastFetch(listPath$2(page, query));
    for (const series of response.data) this.rememberSeries(series);
    return {
      items: response.data.map(mangaFromEntity$2),
      page,
      hasNextPage: page < (response.meta?.lastPage ?? page),
      total: response.meta?.total
    };
  }
  async getDetail(mangaId) {
    const { slug } = splitMangaId(mangaId);
    const response = await komikcastFetch(`/series/${encodeURIComponent(slug)}`);
    this.rememberSeries(response.data);
    const manga = mangaFromEntity$2(response.data);
    return {
      ...manga,
      id: mangaId,
      alternateTitles: response.data.data?.nativeTitle ? [response.data.data.nativeTitle] : [],
      year: Number(response.data.data?.releaseDate) || void 0,
      url: seriesUrl(response.data.data?.slug ?? slug),
      sourceId: this.id
    };
  }
  async getChapters(mangaId) {
    const { seriesId } = splitMangaId(mangaId);
    if (!seriesId) return [];
    const response = await komikcastFetch(`/series/${seriesId}/chapters`);
    const title = this.seriesTitles.get(seriesId);
    if (title) await this.hydrateChapterImages(seriesId, title);
    return response.data.map((chapter) => chapterFromEntity$1(chapter, mangaId, seriesId));
  }
  async getPages(chapterId) {
    const cached = this.chapterImages.get(chapterId);
    if (cached?.length) return cached;
    const { seriesId } = splitChapterId(chapterId);
    const title = this.seriesTitles.get(seriesId);
    if (title) await this.hydrateChapterImages(seriesId, title);
    const images = this.chapterImages.get(chapterId);
    if (!images?.length) {
      throw Object.assign(
        new Error("Halaman chapter Komikcast belum tersedia dari cache API. Buka detail komiknya sekali lagi lalu pilih chapter."),
        { status: 502, code: "SOURCE_PAGES_UNAVAILABLE" }
      );
    }
    return images;
  }
  async getFilters() {
    return [
      {
        id: "sort",
        label: "Sort",
        type: "select",
        values: [
          { label: "Latest", value: "updated" },
          { label: "Popular", value: "popular" }
        ]
      }
    ];
  }
  rememberSeries(series) {
    if (series.data?.title) this.seriesTitles.set(series.id, series.data.title);
    for (const chapter of series.chapters ?? []) this.rememberChapterImages(series.id, chapter);
  }
  rememberChapterImages(seriesId, chapter) {
    const images = Object.entries(chapter.dataImages ?? {}).sort(([left], [right]) => Number(left) - Number(right)).map(([, value]) => value).filter(Boolean);
    if (images.length) this.chapterImages.set(chapterIdFrom(seriesId, chapter), images);
  }
  async hydrateChapterImages(seriesId, title) {
    const response = await komikcastFetch(listPath$2(1, title));
    const series = response.data.find((entry) => entry.id === seriesId);
    if (series) this.rememberSeries(series);
  }
}
const SITE_BASE$4 = "https://komiktap.info";
const PAGE_LIMIT$4 = 25;
function sortFrom$4(filters) {
  const sort = filters?.find((entry) => entry.id === "sort")?.value;
  if (sort === "popular") return "popular";
  if (sort === "newest") return "latest";
  if (sort === "title") return "title";
  if (sort === "title_desc") return "titlereverse";
  return "update";
}
function metaValue($, labels) {
  const lowered = labels.map((label) => label.toLowerCase());
  let value = "";
  $(".infotable tr, .tsinfo div").each((_, element) => {
    if (value) return;
    const text = clean$3($(element).text());
    const lower = text.toLowerCase();
    if (!lowered.some((label) => lower.includes(label))) return;
    value = clean$3($(element).find("td").last().text()) || clean$3($(element).children().last().text()) || clean$3(text.replace(/^[^:]+:\s*/, ""));
  });
  return value;
}
function parseReaderImages(html) {
  const match = html.match(/ts_reader\.run\((\{[\s\S]*?\})\);?/);
  if (!match) return [];
  try {
    const payload = JSON.parse(match[1]);
    return payload.sources?.[0]?.images ?? [];
  } catch {
    return [];
  }
}
function decodeBase64ReaderScript($) {
  for (const element of $('div.wrapper script[src^="data:text/javascript;base64,"], script[src^="data:text/javascript;base64,"]').toArray()) {
    const src = $(element).attr("src") ?? "";
    const raw = src.replace(/^data:text\/javascript;base64,/, "");
    try {
      const decoded = Buffer.from(raw, "base64").toString("utf8");
      if (decoded.startsWith("ts_reader.run")) return decoded;
    } catch {
    }
  }
  return "";
}
function parseStatus($) {
  return statusFrom$7(metaValue($, ["Status", "Statut", "Estado", "Durum"]));
}
class KomikTapSource {
  id;
  name = "KomikTap";
  baseUrl = SITE_BASE$4;
  language = "id";
  contentRating = "suggestive";
  isNsfw = false;
  constructor(id = "komiktap") {
    this.id = id;
  }
  async getList(page, filters) {
    const url = new URL("/manga/", SITE_BASE$4);
    url.searchParams.set("order", sortFrom$4(filters));
    url.searchParams.set("page", String(Math.max(1, page)));
    const items = this.parseMangaList(await fetchText$1(url.toString()));
    return { items, page, hasNextPage: items.length >= PAGE_LIMIT$4 };
  }
  async search(query, page) {
    if (!query.trim()) return this.getList(page);
    const url = new URL(`/page/${Math.max(1, page)}/`, SITE_BASE$4);
    url.searchParams.set("s", query.trim());
    const items = this.parseMangaList(await fetchText$1(url.toString()), PAGE_LIMIT$4);
    return { items, page, hasNextPage: items.length >= 10 };
  }
  async getDetail(mangaId) {
    const url = decodeId$3(mangaId);
    const $ = loadHtml(await fetchText$1(url));
    const title = clean$3($("h1.entry-title").first().text()) || clean$3($(".seriestucontent h1").first().text()) || clean$3($("title").text().split(" - ")[0]) || "Untitled";
    const author = metaValue($, ["Author", "Artist"]) || void 0;
    const type = metaValue($, ["Type"]);
    const cover = imageSrc($, $(".thumb img, .seriestucontl img, .info-left img, img.wp-post-image").first(), SITE_BASE$4);
    return {
      id: mangaId,
      sourceId: this.id,
      title,
      coverUrl: cover,
      author,
      description: clean$3($("div.entry-content").first().text()),
      status: parseStatus($),
      format: formatFrom(type),
      genres: $(".seriestugenre > a, .wd-full .mgen > a").map((_, element) => clean$3($(element).text())).get().filter(Boolean),
      url,
      alternateTitles: []
    };
  }
  async getChapters(mangaId) {
    const url = decodeId$3(mangaId);
    const $ = loadHtml(await fetchText$1(url));
    const chapters = $("#chapterlist > ul > li").map((index, element) => {
      const node = $(element);
      const link = node.find("a").first();
      const chapterUrl = absoluteUrl$3(SITE_BASE$4, link.attr("href"));
      const title = clean$3(node.find(".chapternum").text()) || clean$3(link.text());
      return {
        id: encodeId$3(chapterUrl),
        mangaId,
        sourceId: this.id,
        number: numberFrom$3(title) || index + 1,
        title,
        language: "id",
        uploadedAt: clean$3(node.find(".chapterdate").text()) || (/* @__PURE__ */ new Date()).toISOString(),
        url: chapterUrl
      };
    }).get().filter((chapter) => chapter.url);
    return chapters.sort((left, right) => right.number - left.number);
  }
  async getPages(chapterId) {
    const chapterUrl = decodeId$3(chapterId);
    const html = await fetchText$1(chapterUrl);
    const $ = loadHtml(html);
    const direct = $("div#readerarea img").map((_, element) => imageSrc($, $(element), SITE_BASE$4)).get().filter(Boolean);
    if (direct.length) return direct;
    const inlineImages = parseReaderImages(html);
    if (inlineImages.length) return inlineImages.map((url) => absoluteUrl$3(SITE_BASE$4, url)).filter(Boolean);
    const decodedScript = decodeBase64ReaderScript($);
    const encodedImages = decodedScript ? parseReaderImages(decodedScript) : [];
    if (encodedImages.length) return encodedImages.map((url) => absoluteUrl$3(SITE_BASE$4, url)).filter(Boolean);
    throw Object.assign(new Error("No pages found for this chapter"), {
      status: 502,
      code: "SOURCE_PARSE_FAILED"
    });
  }
  async getFilters() {
    return [
      {
        id: "sort",
        label: "Sort",
        type: "select",
        values: [
          { label: "Updated", value: "updated" },
          { label: "Newest", value: "newest" },
          { label: "Popular", value: "popular" },
          { label: "Title A-Z", value: "title" },
          { label: "Title Z-A", value: "title_desc" }
        ]
      }
    ];
  }
  parseMangaList(html, pageSize = PAGE_LIMIT$4) {
    const $ = loadHtml(html);
    const items = $(".postbody .listupd .bs .bsx").map((_, element) => {
      const node = $(element);
      const link = node.find("a").first();
      const url = absoluteUrl$3(SITE_BASE$4, link.attr("href"));
      const title = clean$3(node.find("div.tt").text()) || clean$3(link.attr("title"));
      if (!url || !title) return null;
      return {
        id: encodeId$3(url),
        sourceId: this.id,
        title,
        coverUrl: imageSrc($, node.find("img.ts-post-image, img").first(), SITE_BASE$4),
        format: formatFrom(node.find(".type").attr("class") ?? node.find(".type").text()),
        status: "ongoing",
        genres: [],
        rating: Number(node.find(".numscore").text()) || void 0,
        url
      };
    }).get().filter(Boolean);
    return items.slice(0, pageSize);
  }
}
const SITE_BASE$3 = "https://komiku.org";
const API_BASE$3 = "https://api.komiku.org";
const REQUEST_TIMEOUT$5 = 15e3;
function encodeId$2(url) {
  return Buffer.from(url, "utf8").toString("base64url");
}
function decodeId$2(id) {
  try {
    return Buffer.from(id, "base64url").toString("utf8");
  } catch {
    return id;
  }
}
function clean$2(text) {
  return text?.replace(/\s+/g, " ").trim() ?? "";
}
function absoluteUrl$2(baseUrl, href) {
  if (!href) return "";
  return new URL(href, baseUrl).toString();
}
function statusFrom$5(text) {
  const value = text?.toLowerCase() ?? "";
  if (value.includes("completed") || value.includes("tamat") || value.includes("end")) return "completed";
  if (value.includes("hiatus")) return "hiatus";
  return "ongoing";
}
function numberFrom$2(text) {
  const match = text.replace(",", ".").match(/(?:chapter|ch\.?)\s*([0-9]+(?:\.[0-9]+)?)/i);
  return match ? Number(match[1]) : 0;
}
function parseDate(value) {
  const match = value?.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return (/* @__PURE__ */ new Date()).toISOString();
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])).toISOString();
}
function sortFrom$3(filters) {
  const sort = filters?.find((entry) => entry.id === "sort")?.value;
  if (sort === "newest") return "date";
  if (sort === "popular" || sort === "rating") return "meta_value_num";
  return "modified";
}
async function fetchHtml$1(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT$5);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        Referer: `${SITE_BASE$3}/`,
        "User-Agent": "GrimoireReader/0.1"
      },
      signal: controller.signal
    });
    if (!response.ok) {
      throw Object.assign(new Error(`Komiku returned HTTP ${response.status}`), {
        status: response.status,
        code: "SOURCE_HTTP_ERROR"
      });
    }
    return response.text();
  } catch (error) {
    if (error instanceof Error && "status" in error) throw error;
    const message = error instanceof Error ? error.message : "network request failed";
    throw Object.assign(new Error(`Komiku tidak bisa diakses dari jaringan ini (${message}).`), {
      status: 503,
      code: "SOURCE_NETWORK_BLOCKED"
    });
  } finally {
    clearTimeout(timeout);
  }
}
function mangaFromCard($, element) {
  const node = $(element);
  const link = node.find("a:has(h3)").first();
  const url = absoluteUrl$2(SITE_BASE$3, link.attr("href"));
  const title = clean$2(link.find("h3").text());
  if (!url || !title) return null;
  const infoText = clean$2(node.find(".tpe1_inf").text());
  return {
    id: encodeId$2(url),
    sourceId: "komiku",
    title,
    coverUrl: node.find("img").first().attr("data-src") ?? node.find("img").first().attr("src") ?? "",
    format: normalizeMangaFormat(infoText),
    status: "ongoing",
    genres: infoText.split(/\s+/).filter((part) => part && !/manga|manhwa|manhua/i.test(part)).slice(0, 4),
    url
  };
}
class KomikuSource {
  id = "komiku";
  name = "Komiku";
  baseUrl = SITE_BASE$3;
  language = "id";
  contentRating = "safe";
  isNsfw = false;
  async getList(page, filters) {
    const url = new URL(page > 1 ? `/manga/page/${page}/` : "/manga/", API_BASE$3);
    url.searchParams.set("orderby", sortFrom$3(filters));
    const items = this.parseList(await fetchHtml$1(url.toString()));
    return { items, page, hasNextPage: items.length > 0 };
  }
  async search(query, page) {
    if (!query.trim()) return this.getList(page);
    const url = new URL(page > 1 ? `/page/${page}/` : "/", API_BASE$3);
    url.searchParams.set("post_type", "manga");
    url.searchParams.set("s", query.trim());
    const items = this.parseList(await fetchHtml$1(url.toString()));
    return { items, page, hasNextPage: items.length > 0 };
  }
  async getDetail(mangaId) {
    const url = decodeId$2(mangaId);
    const $ = cheerio.load(await fetchHtml$1(url));
    const title = clean$2($("h1").first().text()).replace(/^Komik\s+/i, "") || "Untitled";
    const statusText = clean$2($("table.inftable tr:has(td:contains(Status)) td:last-child").text());
    const coverUrl2 = $("div.ims > img").attr("src")?.split("?")[0] ?? "";
    return {
      id: mangaId,
      sourceId: this.id,
      title,
      coverUrl: coverUrl2,
      author: clean$2($("table.inftable tr:has(td:contains(Pengarang)) td:last-child").text()) || void 0,
      description: clean$2($("#Sinopsis > p").text()),
      format: normalizeMangaFormat(
        clean$2($("table.inftable tr:has(td:contains(Jenis Komik)) td:last-child").text()) || clean$2($("table.inftable tr:has(td:contains(Type)) td:last-child").text())
      ),
      status: statusFrom$5(statusText),
      genres: $("ul.genre li.genre a").map((_, element) => clean$2($(element).text())).get().filter(Boolean),
      url,
      alternateTitles: [
        clean$2($("table.inftable tr:has(td:contains(Judul Indonesia)) td:last-child").text())
      ].filter(Boolean)
    };
  }
  async getChapters(mangaId) {
    const mangaUrl2 = decodeId$2(mangaId);
    const $ = cheerio.load(await fetchHtml$1(mangaUrl2));
    return $("#Daftar_Chapter tr:has(td.judulseries)").map((_, element) => {
      const link = $(element).find("td.judulseries a").first();
      const chapterUrl = absoluteUrl$2(SITE_BASE$3, link.attr("href"));
      const title = clean$2(link.text());
      return {
        id: encodeId$2(chapterUrl),
        mangaId,
        sourceId: this.id,
        number: numberFrom$2(title),
        title,
        language: "id",
        uploadedAt: parseDate(clean$2($(element).find("td.tanggalseries").text())),
        scanlator: this.name,
        url: chapterUrl
      };
    }).get().sort((left, right) => right.number - left.number);
  }
  async getPages(chapterId) {
    const chapterUrl = decodeId$2(chapterId);
    const $ = cheerio.load(await fetchHtml$1(chapterUrl));
    return $("#Baca_Komik img").map((_, element) => $(element).attr("data-src") ?? $(element).attr("src")).get().filter((src) => /\.(webp|jpe?g|png)(\?|$)/i.test(src));
  }
  async getFilters() {
    return [
      {
        id: "sort",
        label: "Sort",
        type: "select",
        values: [
          { label: "Updated", value: "updated" },
          { label: "Newest", value: "newest" },
          { label: "Popular", value: "popular" }
        ]
      }
    ];
  }
  parseList(html) {
    const $ = cheerio.load(html);
    const items = $("div.bge").map((_, element) => mangaFromCard($, element)).get().filter(Boolean);
    if (!items.length && /Just a moment|challenge-platform|ddos-guard/i.test(html)) {
      throw Object.assign(new Error("Komiku sedang memblokir request otomatis dengan challenge anti-bot."), {
        status: 503,
        code: "SOURCE_ANTI_BOT"
      });
    }
    return items;
  }
}
const REQUEST_TIMEOUT$4 = 12e3;
const DEFAULT_LIST_SELECTORS = [
  ".page-item-detail",
  ".c-tabs-item__content",
  ".manga__item",
  ".manga-item",
  ".manga-grid-item",
  ".postbody .listupd .bs .bsx",
  ".listupd .bs",
  ".listupd .utao",
  ".bsx",
  ".utao",
  ".animepost",
  ".book-item",
  ".series-item",
  ".comic-item",
  ".manga",
  "article"
];
const DEFAULT_CHAPTER_SELECTORS = [
  "li.wp-manga-chapter",
  "#chapterlist > ul > li",
  ".eplister li",
  ".clstyle li",
  ".chapter-list li",
  ".listing-chapters_wrap li",
  ".version-chap li",
  ".bixbox li",
  ".eps_lst li",
  ".episodes li",
  ".chapter li",
  "tr"
];
const DEFAULT_PAGE_IMAGE_SELECTORS = [
  "div.main-col-inner div.reading-content div.page-break img",
  "div.reading-content img",
  "div#readerarea img",
  ".chapter-content img",
  ".entry-content img",
  ".page-break img",
  ".reader-area img",
  ".reading-area img",
  ".postbody img",
  "article img"
];
function encodeId$1(url) {
  return Buffer.from(url, "utf8").toString("base64url");
}
function decodeId$1(id) {
  try {
    return Buffer.from(id, "base64url").toString("utf8");
  } catch {
    return id;
  }
}
function clean$1(text) {
  return text?.replace(/\s+/g, " ").trim() ?? "";
}
function unique(items) {
  return [...new Set(items)];
}
function selectorFor(selectors) {
  return unique(selectors.filter(Boolean)).join(",");
}
function absoluteUrl$1(baseUrl, href) {
  if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("data:")) return "";
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return "";
  }
}
function safeHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
function imageFrom($, element, baseUrl, selectors = []) {
  const node = $(element);
  const scopedImage = selectors.length ? node.find(selectorFor(selectors)).first() : $();
  const imageNode = scopedImage.length ? scopedImage : node.find("img").first();
  const image = imageNode.attr("data-src") ?? imageNode.attr("data-lazy-src") ?? imageNode.attr("data-original") ?? imageNode.attr("data-cfsrc") ?? imageNode.attr("data-url") ?? imageNode.attr("uid") ?? imageNode.attr("srcset")?.split(",").at(-1)?.trim().split(/\s+/)[0] ?? imageNode.attr("src") ?? node.find('[style*="background-image"]').first().attr("style")?.match(/url\(["']?([^"')]+)["']?\)/i)?.[1] ?? "";
  const url = absoluteUrl$1(baseUrl, image);
  try {
    const parsed = new URL(url);
    const wrapped = parsed.hostname === "wsrv.nl" ? parsed.searchParams.get("url") : null;
    return wrapped ? absoluteUrl$1(baseUrl, wrapped) : url;
  } catch {
    return url;
  }
}
function statusFrom$4(text) {
  const value = text.toLowerCase();
  if (/complete|completed|finished|tamat|finalizado|concluido|concluído|terminé|hoàn thành|заверш|已完结|bitti/.test(
    value
  )) {
    return "completed";
  }
  if (/hiatus|paused|on hold|pausado|en pause/.test(value)) return "hiatus";
  if (/cancel|dropped|abandonn|discontinued/.test(value)) return "cancelled";
  return "ongoing";
}
function numberFrom$1(text) {
  const normalized = text.replace(",", ".");
  const match = normalized.match(/(?:chapter|chap|ch\.?|episode|eps?|capitulo|cap|ตอน|第)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (match) return Number(match[1]);
  const fallback = normalized.match(/([0-9]+(?:\.[0-9]+)?)/);
  return fallback ? Number(fallback[1]) : 0;
}
function getMeta($, labels) {
  const lowerLabels = labels.map((label) => label.toLowerCase());
  let value = "";
  $("li, tr, .imptdt, .fmed, .spe span, .seriestugenre, .infox span, .post-content_item, .tsinfo div").each(
    (_, element) => {
      if (value) return;
      const text = clean$1($(element).text());
      const lower = text.toLowerCase();
      if (lowerLabels.some((label) => lower.includes(label))) {
        value = clean$1(text.replace(/^[^:]+:\s*/, ""));
      }
    }
  );
  return value;
}
function looksLikeMangaUrl(href, baseUrl) {
  if (!href) return false;
  let url;
  try {
    url = new URL(href, baseUrl);
  } catch {
    return false;
  }
  const path = url.pathname.toLowerCase();
  const blocked = [
    "/tag/",
    "/genre/",
    "/manga-genre/",
    "/category/",
    "/author/",
    "/artist/",
    "/privacy",
    "/dmca",
    "/login",
    "/register",
    "/bookmark",
    "/contact"
  ];
  if (blocked.some((part) => path.includes(part))) return false;
  if (/chapter|chap-|episode|episod|capitulo|komikcast-chapter|\/read\//i.test(path)) return false;
  return /manga|manhwa|manhua|comic|komik|series|webtoon|title|project|serie|toon|truyen|mangas/i.test(path) || path.split("/").filter(Boolean).length <= 2;
}
function isLikelyPageImage(src) {
  if (!src) return false;
  try {
    const url = new URL(src);
    const value = `${url.hostname}${url.pathname}${url.search}`.toLowerCase();
    if (/logo|banner|avatar|favicon|placeholder|loading|blank|sprite|ads?[-_/]/i.test(value)) return false;
    return /\.(avif|webp|jpe?g|png)(\?|$)/i.test(src) || /drive\.google\.com\/thumbnail|googleusercontent\.com|blogger\.googleusercontent\.com|bp\.blogspot\.com/i.test(src);
  } catch {
    return false;
  }
}
function titleFrom$1($, node, link, selectors = []) {
  return clean$1(selectors.length ? node.find(selectorFor(selectors)).first().text() : "") || clean$1(
    node.find(
      ".manga-card-title, .popular-title, .tt, .title, .post-title, .manga-title, .series-title, h1, h2, h3, h4, a[title]"
    ).first().text()
  ) || clean$1(link.attr("title")) || clean$1(link.find("img").attr("alt")) || clean$1(link.text());
}
function makeProfile(profile) {
  return {
    listSelectors: DEFAULT_LIST_SELECTORS,
    titleSelectors: [],
    imageSelectors: ["img"],
    chapterSelectors: DEFAULT_CHAPTER_SELECTORS,
    pageSelectors: DEFAULT_PAGE_IMAGE_SELECTORS,
    detailDescriptionSelectors: [
      "div.description-summary div.summary__content",
      "div.summary_content div.post-content_item > h5 + div",
      "div.summary_content div.manga-excerpt",
      "div.post-content div.manga-summary",
      "div.post-content div.desc",
      "div.c-page__content div.summary__content",
      '.entry-content[itemprop="description"]',
      ".desc",
      ".entry-content",
      ".seriestucontent",
      ".sinopsis",
      ".summary__content"
    ],
    genreSelectors: [
      "div.genres-content a",
      ".genre-info a",
      ".seriestugenre a",
      ".mgen a",
      ".genres a",
      'a[rel="tag"]',
      'a[href*="/genre/"]',
      'a[href*="/manga-genre/"]'
    ],
    ...profile
  };
}
function profileFor(engine) {
  if (engine === "madara") {
    return makeProfile({
      listPaths: (page) => page > 1 ? [
        `/manga/page/${page}/?m_orderby=latest`,
        `/page/${page}/?post_type=wp-manga`,
        `/manga/page/${page}/`,
        `/wp-admin/admin-ajax.php?__kotatsu=madara_latest&page=${page}`
      ] : ["/manga/?m_orderby=latest", "/?post_type=wp-manga", "/manga/", "/wp-admin/admin-ajax.php?__kotatsu=madara_latest&page=1"],
      searchPaths: (query, page) => page > 1 ? [
        `/page/${page}/?s=${encodeURIComponent(query)}&post_type=wp-manga`,
        `/?s=${encodeURIComponent(query)}&post_type=wp-manga&page=${page}`,
        `/wp-admin/admin-ajax.php?__kotatsu=madara_search&page=${page}&q=${encodeURIComponent(query)}`
      ] : [
        `/?s=${encodeURIComponent(query)}&post_type=wp-manga`,
        `/manga/?s=${encodeURIComponent(query)}`,
        `/wp-admin/admin-ajax.php?__kotatsu=madara_search&page=1&q=${encodeURIComponent(query)}`
      ],
      listSelectors: ["div.row.c-tabs-item__content", ".page-item-detail", ".c-tabs-item__content", ".manga__item"],
      titleSelectors: [".post-title h3", ".post-title h5", ".manga-title-badges", ".h5 a", "h3 a", "h4 a"],
      imageSelectors: ["img"],
      chapterSelectors: ["li.wp-manga-chapter"],
      pageSelectors: ["div.main-col-inner div.reading-content div.page-break img", "div.reading-content div.page-break img", "div.reading-content img"]
    });
  }
  if (engine === "mangareader") {
    return makeProfile({
      listPaths: (page) => [
        `/manga/?order=update&page=${page}`,
        `/manga/?order=latest&page=${page}`,
        `/manga/?page=${page}`,
        page > 1 ? `/page/${page}/` : "/"
      ],
      searchPaths: (query, page) => [
        `/page/${page}/?s=${encodeURIComponent(query)}`,
        `/?s=${encodeURIComponent(query)}&page=${page}`,
        `/search?keyword=${encodeURIComponent(query)}&page=${page}`
      ],
      listSelectors: [".postbody .listupd .bs .bsx", ".listupd .bs .bsx", ".listupd .bs", ".listupd .utao"],
      titleSelectors: ["div.tt", ".tt", "h3", "h4"],
      imageSelectors: ["img.ts-post-image", "img"],
      chapterSelectors: ["#chapterlist > ul > li"],
      pageSelectors: ["div#readerarea img"]
    });
  }
  if (engine === "wpcomics") {
    return makeProfile({
      listPaths: (page) => [`/tim-truyen?sort=0&page=${page}`, `/tim-truyen/?sort=0&page=${page}`, page > 1 ? `/page/${page}/` : "/"],
      searchPaths: (query, page) => [`/tim-truyen?keyword=${encodeURIComponent(query)}&page=${page}`, `/?s=${encodeURIComponent(query)}&page=${page}`],
      listSelectors: ["div.items div.item", ".items .item"],
      titleSelectors: ["div.box_tootip div.title", "h3 a", ".title"],
      imageSelectors: ["div.image a img", "img"],
      chapterSelectors: ["div.list-chapter li.row:not(.heading)"],
      pageSelectors: ["div.page-chapter > img", "li.blocks-gallery-item img", "#chapter-c img", ".reading-detail img", "article img"],
      detailDescriptionSelectors: ["div.detail-content p", ".detail-content", ".summary-content"],
      genreSelectors: ["div.col-info li.kind p:not(.name) a", "li.kind p.col-xs-8 a"]
    });
  }
  if (engine === "mmrcms") {
    return makeProfile({
      listPaths: (page) => [`/latest-release?page=${page}`, `/filterList/?page=${page}&author=&tag=&alpha=&cat=&sortBy=name&asc=true`],
      searchPaths: (query, page) => [`/filterList/?page=${page}&author=&tag=&alpha=${encodeURIComponent(query)}&cat=&sortBy=name&asc=true`],
      listSelectors: ["div.media", ".media"],
      titleSelectors: ["div.media-body h5", "h5", "h3 a"],
      imageSelectors: ["img"],
      chapterSelectors: ["ul.chapters > li:not(.btn)"],
      pageSelectors: ["div#all img", "#all img", ".chapter-content img"],
      detailDescriptionSelectors: ["div.well", ".well"],
      genreSelectors: ["dt:contains(Catégories) + dd a", "dt:contains(Categories) + dd a"]
    });
  }
  if (engine === "keyoapp") {
    return makeProfile({
      listPaths: (_page) => ["/latest", "/series", "/"],
      searchPaths: (query, _page) => [`/series?query=${encodeURIComponent(query)}`, `/search?query=${encodeURIComponent(query)}`, "/series"],
      listSelectors: ["#searched_series_page button", "div.grid > div.group", "div.grid div.group"],
      titleSelectors: ["h3", "a[title]"],
      imageSelectors: ["img", "a div.bg-cover"],
      chapterSelectors: ["#chapters > a"],
      pageSelectors: ["#pages > img"],
      detailDescriptionSelectors: ["div.grid > div.overflow-hidden > p", ".overflow-hidden > p"],
      genreSelectors: ['div.grid a[href*="tag="]', "div.gap-1 a"]
    });
  }
  if (engine === "zeistmanga") {
    return makeProfile({
      listPaths: (page) => [`/feeds/posts/default/-/Series?alt=json&orderby=published&max-results=21&start-index=${(page - 1) * 20 + 1}`, "/"],
      searchPaths: (query, page) => [
        `/feeds/posts/default/-/Series?alt=json&orderby=published&max-results=21&start-index=${(page - 1) * 20 + 1}&q=label:Series+${encodeURIComponent(query)}`,
        `/?s=${encodeURIComponent(query)}`
      ],
      listSelectors: ["article", ".post", ".blog-posts article"],
      titleSelectors: ["h2", "h3", ".entry-title"],
      imageSelectors: ["img"],
      chapterSelectors: ["#chapterlist a", "#latest a", "#myUL a", ".chapter-list a"],
      pageSelectors: ["div.check-box img", "article#reader .separator img", "article.container .separator img", "#readarea img", "#reader img", "#readerarea img"],
      detailDescriptionSelectors: ["#synopsis", "#Sinopse", "#sinopas", ".sinopsis", ".sinopas"],
      genreSelectors: ["article div.mt-15 a", ".info-genre a", "dl:contains(Genre) dd a"]
    });
  }
  if (engine === "madtheme") {
    return makeProfile({
      listPaths: (page) => [
        page > 1 ? `/manga/page/${page}/` : "/manga/",
        page > 1 ? `/series/page/${page}/` : "/series/",
        page > 1 ? `/page/${page}/` : "/"
      ],
      searchPaths: (query, page) => [
        `/?s=${encodeURIComponent(query)}${page > 1 ? `&page=${page}` : ""}`,
        `/search/${encodeURIComponent(query)}${page > 1 ? `/page/${page}` : ""}`
      ],
      chapterSelectors: [".eplister li", ".clstyle li", ".chapter-list li"],
      pageSelectors: ["#readerarea img", "#reader img", ".reading-content img", "article img"]
    });
  }
  return makeProfile({
    listPaths: (page) => [
      `/manga/?page=${page}`,
      `/series/?page=${page}`,
      `/comics/?page=${page}`,
      `/webtoon/?page=${page}`,
      page > 1 ? `/page/${page}/` : "/"
    ],
    searchPaths: (query, page) => [
      `/?s=${encodeURIComponent(query)}${page > 1 ? `&page=${page}` : ""}`,
      `/search?keyword=${encodeURIComponent(query)}&page=${page}`,
      `/search?q=${encodeURIComponent(query)}&page=${page}`,
      `/manga/?s=${encodeURIComponent(query)}`
    ]
  });
}
async function fetchHtml(source, pathOrUrl, init) {
  const target = new URL(pathOrUrl, source.baseUrl);
  const requestInit = { ...init };
  if (target.searchParams.has("__kotatsu")) {
    const marker = target.searchParams.get("__kotatsu") ?? "";
    const page = target.searchParams.get("page") ?? "1";
    const query = target.searchParams.get("q") ?? "";
    target.search = "";
    if (marker.startsWith("madara_")) {
      const payload = new URLSearchParams({
        action: "madara_load_more",
        page,
        template: "madara-core/content/content-search",
        "vars[s]": query,
        "vars[paged]": page,
        "vars[template]": "search",
        "vars[post_type]": "wp-manga",
        "vars[post_status]": "publish",
        "vars[manga_archives_item_layout]": "default",
        "vars[meta_key]": "_latest_update",
        "vars[orderby]": "meta_value_num",
        "vars[order]": "desc"
      });
      requestInit.method = "POST";
      requestInit.body = payload;
      requestInit.headers = {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        ...requestInit.headers
      };
    }
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT$4);
  try {
    const response = await fetch(target, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: `${new URL(source.baseUrl).origin}/`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
        ...requestInit.headers
      },
      signal: controller.signal,
      redirect: "follow",
      method: requestInit.method,
      body: requestInit.body
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok) {
      throw Object.assign(new Error(`${source.name} returned HTTP ${response.status}`), {
        status: response.status,
        code: "SOURCE_HTTP_ERROR"
      });
    }
    if (contentType && !contentType.includes("html") && !contentType.includes("text/plain") && !contentType.includes("json")) {
      throw Object.assign(new Error(`${source.name} did not return an HTML page`), {
        status: 502,
        code: "SOURCE_UNSUPPORTED_RESPONSE"
      });
    }
    return response.text();
  } catch (error) {
    if (error instanceof Error && "status" in error) throw error;
    const message = error instanceof Error ? error.message : "network request failed";
    throw Object.assign(
      new Error(
        `${source.name} tidak bisa diakses dari jaringan ini (${message}). Source mungkin pindah domain, mati, atau dilindungi anti-bot.`
      ),
      { status: 503, code: "SOURCE_NETWORK_BLOCKED" }
    );
  } finally {
    clearTimeout(timeout);
  }
}
class KotatsuGenericSource {
  id;
  name;
  baseUrl;
  language;
  contentRating;
  isNsfw;
  engine;
  profile;
  constructor(metadata) {
    this.id = metadata.id;
    this.name = metadata.name;
    this.baseUrl = metadata.baseUrl;
    this.language = metadata.language;
    this.contentRating = metadata.contentRating;
    this.isNsfw = metadata.isNsfw;
    this.engine = metadata.id.match(/^kotatsu_([^_]+)/)?.[1] ?? "generic";
    this.profile = profileFor(this.engine);
  }
  async getList(page, _filters) {
    const items = await this.fetchFirstList(this.profile.listPaths(Math.max(1, page)));
    return { items, page, hasNextPage: items.length > 0 };
  }
  async search(query, page, _filters) {
    if (!query.trim()) return this.getList(page);
    const items = await this.fetchFirstList(this.profile.searchPaths(query.trim(), Math.max(1, page)));
    return { items, page, hasNextPage: items.length > 0 };
  }
  async getDetail(mangaId) {
    const url = decodeId$1(mangaId);
    const html = await fetchHtml(this, url);
    const $ = cheerio.load(html);
    const title = clean$1(
      $(
        'h1.entry-title, h1[itemprop="name"], .post-title h1, .seriestuheader h1, .seriestucontent h1, .infox h1, h1'
      ).first().text()
    ) || clean$1($('meta[property="og:title"]').attr("content")) || "Untitled";
    const coverRoot = $(".summary_image, .thumb, .bigcover, .infomanga, .series-thumb, .infox, .seriestucont, .postbody").first()[0] ?? $("body")[0];
    const description = clean$1($(selectorFor(this.profile.detailDescriptionSelectors)).first().text());
    const genres = $(selectorFor(this.profile.genreSelectors)).map((_, element) => clean$1($(element).text())).get().filter(Boolean);
    const author = getMeta($, ["author", "auteur", "pengarang", "autor"]);
    const artist = getMeta($, ["artist", "artis"]);
    const statusText = getMeta($, ["status", "statut", "estado", "durum", "statüsü", "tình trạng"]);
    const bodyText = clean$1($("body").text());
    return {
      id: mangaId,
      sourceId: this.id,
      title,
      coverUrl: imageFrom($, coverRoot, url, this.profile.imageSelectors),
      author,
      artist,
      description,
      format: normalizeMangaFormat(bodyText),
      status: statusFrom$4(statusText || bodyText),
      genres: unique(genres),
      url,
      alternateTitles: []
    };
  }
  async getChapters(mangaId) {
    const mangaUrl2 = decodeId$1(mangaId);
    const html = await fetchHtml(this, mangaUrl2);
    const $ = cheerio.load(html);
    let chapters = this.parseChapters($, mangaId, mangaUrl2);
    if (!chapters.length && this.engine === "madara") {
      const ajaxCandidates = [
        { url: `${mangaUrl2.replace(/\/$/, "")}/ajax/chapters/`, init: { method: "POST" } }
      ];
      const holderId = $("div#manga-chapters-holder").attr("data-id");
      if (holderId) {
        ajaxCandidates.push({
          url: "/wp-admin/admin-ajax.php",
          init: {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
              "X-Requested-With": "XMLHttpRequest"
            },
            body: new URLSearchParams({ action: "manga_get_chapters", manga: holderId })
          }
        });
      }
      for (const candidate of ajaxCandidates) {
        try {
          const ajaxHtml2 = await fetchHtml(this, candidate.url, candidate.init);
          chapters = this.parseChapters(cheerio.load(ajaxHtml2), mangaId, mangaUrl2);
          if (chapters.length) break;
        } catch {
        }
      }
    }
    if (!chapters.length && this.engine === "zeistmanga") {
      const feed = this.extractZeistChapterFeed($);
      if (feed) {
        try {
          const feedHtml = await fetchHtml(
            this,
            `/feeds/posts/default/-/${encodeURIComponent(feed)}?alt=json&orderby=published&max-results=9999`
          );
          chapters = this.parseBloggerChapters(feedHtml, mangaId, mangaUrl2);
        } catch {
        }
      }
    }
    return chapters;
  }
  async getPages(chapterId) {
    const chapterUrl = decodeId$1(chapterId);
    const html = await fetchHtml(this, chapterUrl);
    const $ = cheerio.load(html);
    const scriptPages = this.extractScriptPages($, chapterUrl);
    if (scriptPages.length) return scriptPages;
    const pages = $(selectorFor([...this.profile.pageSelectors, ...DEFAULT_PAGE_IMAGE_SELECTORS])).map((_, element) => {
      const src = $(element).attr("data-src") ?? $(element).attr("data-lazy-src") ?? $(element).attr("data-original") ?? $(element).attr("data-cfsrc") ?? $(element).attr("data-url") ?? $(element).attr("srcset")?.split(",").at(-1)?.trim().split(/\s+/)[0] ?? $(element).attr("src") ?? $(element).attr("uid");
      if (!src) return "";
      if (this.engine === "keyoapp" && !/^https?:\/\//i.test(src)) {
        const cdn = this.extractKeyoappCdn($);
        return cdn ? absoluteUrl$1(chapterUrl, `${cdn.replace(/\/$/, "")}/${src.replace(/^\//, "")}`) : "";
      }
      return absoluteUrl$1(chapterUrl, src);
    }).get().filter(isLikelyPageImage);
    return unique(pages);
  }
  async getFilters() {
    return [
      {
        id: "sort",
        label: "Sort",
        type: "select",
        values: [
          { label: "Updated", value: "updated" },
          { label: "Newest", value: "newest" },
          { label: "Popular", value: "popular" }
        ]
      }
    ];
  }
  async getHealth() {
    try {
      await fetchHtml(this, "/");
      return { status: "online", message: "Generic Kotatsu parser" };
    } catch (error) {
      return {
        status: "limited",
        message: error instanceof Error ? error.message : `${this.name} health check failed`
      };
    }
  }
  async fetchFirstList(paths) {
    let lastError;
    for (const path of unique(paths).slice(0, 5)) {
      try {
        const html = await fetchHtml(this, path);
        const items = this.parseMangaList(html);
        if (items.length) return items;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError instanceof Error) throw lastError;
    throw Object.assign(
      new Error(
        `${this.name} berhasil diakses, tapi parser generic belum menemukan kartu manga yang cocok untuk template ${this.engine}.`
      ),
      { status: 502, code: "SOURCE_PARSE_EMPTY" }
    );
  }
  parseMangaList(html) {
    if (this.engine === "zeistmanga" && html.trim().startsWith("{")) {
      const bloggerItems = this.parseBloggerMangaList(html);
      if (bloggerItems.length) return bloggerItems;
    }
    const $ = cheerio.load(html);
    const host = safeHostname(this.baseUrl);
    const items = [];
    $(selectorFor([...this.profile.listSelectors, ...DEFAULT_LIST_SELECTORS])).each((_, element) => {
      const node = $(element);
      const link = node.is("a[href]") ? node : node.find("a[href]").first();
      const href = absoluteUrl$1(this.baseUrl, link.attr("href"));
      const title = titleFrom$1($, node, link, this.profile.titleSelectors);
      if (!href || !title || !looksLikeMangaUrl(href, this.baseUrl)) return;
      items.push({
        id: encodeId$1(href),
        sourceId: this.id,
        title,
        coverUrl: imageFrom($, element, this.baseUrl, this.profile.imageSelectors),
        format: normalizeMangaFormat(clean$1(node.text())),
        status: statusFrom$4(clean$1(node.text())),
        genres: [],
        url: href
      });
    });
    if (items.length < 3) {
      $("a[href]").each((_, element) => {
        const link = $(element);
        const href = absoluteUrl$1(this.baseUrl, link.attr("href"));
        if (!href || !looksLikeMangaUrl(href, this.baseUrl)) return;
        if (safeHostname(href) !== host) return;
        const parent = link.closest(
          "article, .item, .media, .group, .bs, .bsx, .utao, .post, .manga, .series, .card, .page-item-detail"
        );
        const title = titleFrom$1($, parent.length ? parent : link, link, this.profile.titleSelectors);
        if (!title || title.length < 2 || title.length > 120) return;
        items.push({
          id: encodeId$1(href),
          sourceId: this.id,
          title,
          coverUrl: parent.length ? imageFrom($, parent[0], this.baseUrl, this.profile.imageSelectors) : imageFrom($, element, this.baseUrl, this.profile.imageSelectors),
          format: normalizeMangaFormat(clean$1(parent.text() || link.text())),
          status: statusFrom$4(clean$1(parent.text() || link.text())),
          genres: [],
          url: href
        });
      });
    }
    const seen = /* @__PURE__ */ new Set();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }
  parseChapters($, mangaId, mangaUrl2) {
    const chapters = [];
    $(selectorFor([...this.profile.chapterSelectors, ...DEFAULT_CHAPTER_SELECTORS])).each((_, element) => {
      const node = $(element);
      const link = node.is("a[href]") ? node : node.find("a[href]").first();
      const href = absoluteUrl$1(mangaUrl2, link.attr("href"));
      const text = clean$1(
        node.find(".chapternum, .chapter-title, .entry-title, .title, span.truncate, h5").first().text() || link.text() || node.text()
      );
      if (!href || !text) return;
      if (!/chapter|chap|ch\.?|episode|eps?|capitulo|cap|ตอน|第|\/\d+(?:\/|$|-)|-\d+(?:\/|$)/i.test(`${text} ${href}`)) {
        return;
      }
      chapters.push({
        id: encodeId$1(href),
        mangaId,
        sourceId: this.id,
        number: numberFrom$1(text),
        title: text,
        language: this.language,
        uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
        scanlator: this.name,
        url: href
      });
    });
    const seen = /* @__PURE__ */ new Set();
    return chapters.filter((chapter) => {
      if (seen.has(chapter.id)) return false;
      seen.add(chapter.id);
      return true;
    }).sort((a, b) => b.number - a.number);
  }
  parseBloggerMangaList(text) {
    try {
      const json = JSON.parse(text);
      const entries = Array.isArray(json?.feed?.entry) ? json.feed.entry : [];
      return entries.map((entry) => {
        const title = clean$1(entry.title?.$t);
        const links = Array.isArray(entry.link) ? entry.link : [];
        const href = links.find((link) => link.rel === "alternate")?.href ?? "";
        const content = entry.content?.$t ?? "";
        const contentDoc = cheerio.load(content);
        const thumbnail = entry["media$thumbnail"]?.url?.replace(/\/s.+?-c(?:-rw)?\//, "/w600/")?.replace(/=s(?!.*=s).+?-c(?:-rw)?$/, "=w600");
        const coverUrl2 = absoluteUrl$1(this.baseUrl, thumbnail || contentDoc("img").first().attr("src"));
        if (!title || !href) return null;
        return {
          id: encodeId$1(href),
          sourceId: this.id,
          title,
          coverUrl: coverUrl2,
          format: normalizeMangaFormat(`${title} ${contentDoc.text()}`),
          status: "ongoing",
          genres: [],
          url: absoluteUrl$1(this.baseUrl, href)
        };
      }).filter((item) => Boolean(item));
    } catch {
      return [];
    }
  }
  parseBloggerChapters(text, mangaId, mangaUrl2) {
    try {
      const json = JSON.parse(text);
      const entries = Array.isArray(json?.feed?.entry) ? json.feed.entry : [];
      const mangaSlug = new URL(mangaUrl2).pathname.split("/").filter(Boolean).at(-1);
      return entries.map((entry, index) => {
        const title = clean$1(entry.title?.$t);
        const links = Array.isArray(entry.link) ? entry.link : [];
        const href = absoluteUrl$1(this.baseUrl, links.find((link) => link.rel === "alternate")?.href ?? "");
        const slug = href ? new URL(href).pathname.split("/").filter(Boolean).at(-1) : "";
        if (!title || !href || slug === mangaSlug) return null;
        return {
          id: encodeId$1(href),
          mangaId,
          sourceId: this.id,
          number: numberFrom$1(title) || entries.length - index,
          title,
          language: this.language,
          uploadedAt: entry.published?.$t ?? (/* @__PURE__ */ new Date()).toISOString(),
          scanlator: this.name,
          url: href
        };
      }).filter((chapter) => Boolean(chapter)).sort((a, b) => b.number - a.number);
    } catch {
      return [];
    }
  }
  extractZeistChapterFeed($) {
    const scriptSrc = $("#myUL script").first().attr("src");
    if (scriptSrc?.includes("/-/")) return decodeURIComponent(scriptSrc.split("/-/").pop()?.split("?")[0] ?? "");
    const latestScript = $("#latest script").first().html() ?? "";
    const latest = latestScript.match(/label\s*=\s*['"]([^'"]+)['"]/i)?.[1];
    if (latest) return latest;
    const clwdScript = $("#clwd script").first().html() ?? "";
    const clwd = clwdScript.match(/clwd\.run\(['"]([^'"]+)['"]/i)?.[1];
    if (clwd) return clwd;
    const chapterList = $("#chapterlist").attr("data-post-title");
    if (chapterList) return chapterList;
    const labelScript = $("script").map((_, element) => $(element).html() ?? "").get().find((script) => script.includes("label_chapter"));
    const label = labelScript?.match(/label_chapter\s*=\s*["']([^"']+)["']/i)?.[1];
    return label ? decodeURIComponent(label) : "";
  }
  extractKeyoappCdn($) {
    const script = $("script").map((_, element) => $(element).html() ?? "").get().find((value) => /realUrl\s*=\s*`[^`]+\/\//.test(value));
    const host = script?.match(/realUrl\s*=\s*`[^`]+\/\/([^/`]+)/)?.[1];
    return host ? `https://${host}/uploads` : "";
  }
  extractScriptPages($, chapterUrl) {
    const pages = [];
    $("script").each((_, element) => {
      const script = $(element).html() ?? "";
      const tsReader = script.match(/ts_reader\.run\((\{[\s\S]*?\})\);?/);
      if (tsReader) {
        try {
          const data = JSON.parse(tsReader[1]);
          const images = data?.sources?.[0]?.images;
          if (Array.isArray(images)) pages.push(...images.map((src) => absoluteUrl$1(chapterUrl, String(src))));
        } catch {
        }
      }
      const chapterImage = script.match(/chapterImage\s*=\s*\[([\s\S]*?)\]/);
      if (chapterImage) {
        for (const match of chapterImage[1].matchAll(/["']([^"']+)["']/g)) {
          pages.push(absoluteUrl$1(chapterUrl, match[1]));
        }
      }
      const templateContent = script.match(/const\s+content\s*=\s*`([\s\S]*?)`;/);
      if (templateContent) {
        const contentDoc = cheerio.load(templateContent[1]);
        contentDoc("img").each((_2, img) => {
          pages.push(absoluteUrl$1(chapterUrl, contentDoc(img).attr("src")));
        });
      }
      for (const match of script.matchAll(/["'](https?:\/\/[^"']+\.(?:avif|webp|jpe?g|png)(?:\?[^"']*)?)["']/gi)) {
        pages.push(absoluteUrl$1(chapterUrl, match[1]));
      }
    });
    return unique(pages.filter(isLikelyPageImage));
  }
}
const API_BASE$2 = "https://api.mangadex.org";
const COVER_BASE = "https://uploads.mangadex.org/covers";
const PAGE_LIMIT$3 = 24;
const USER_AGENT$1 = "GrimoireReader/0.1 (+https://example.local)";
const REQUEST_TIMEOUT$3 = 15e3;
function titleFrom(value) {
  return value?.en ?? Object.values(value ?? {})[0] ?? "Untitled";
}
function descriptionFrom(value) {
  return value?.en ?? Object.values(value ?? {})[0] ?? "";
}
function statusFrom$3(value) {
  if (value === "completed" || value === "hiatus" || value === "cancelled") return value;
  return "ongoing";
}
function getRelationship(entity, type) {
  return entity.relationships.find((relationship) => relationship.type === type);
}
function coverUrl(entity) {
  const cover = getRelationship(entity, "cover_art");
  const fileName = cover?.attributes?.fileName;
  if (typeof fileName !== "string") return "";
  return `${COVER_BASE}/${entity.id}/${fileName}.512.jpg`;
}
function mangaUrl$1(id) {
  return `https://mangadex.org/title/${id}`;
}
function formatFromLanguage(language) {
  if (language === "ko") return "Manhwa";
  if (language === "zh" || language === "zh-hk") return "Manhua";
  return "Manga";
}
function mangaFromEntity$1(entity) {
  const attributes = entity.attributes;
  const author = getRelationship(entity, "author")?.attributes?.name;
  const artist = getRelationship(entity, "artist")?.attributes?.name;
  return {
    id: entity.id,
    sourceId: "mangadex",
    title: titleFrom(attributes.title),
    coverUrl: coverUrl(entity),
    author: typeof author === "string" ? author : void 0,
    artist: typeof artist === "string" ? artist : void 0,
    description: descriptionFrom(attributes.description),
    format: formatFromLanguage(attributes.originalLanguage),
    status: statusFrom$3(attributes.status),
    genres: attributes.tags?.map((tag) => titleFrom(tag.attributes?.name)).filter(Boolean).slice(0, 8) ?? [],
    url: mangaUrl$1(entity.id)
  };
}
async function mangadexFetch(path, signal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT$3);
  let response;
  try {
    response = await fetch(`${API_BASE$2}${path}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT$1
      },
      signal: controller.signal,
      redirect: "manual"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "network request failed";
    throw Object.assign(
      new Error(
        `MangaDex is unreachable from this network (${message}). If you are in Indonesia or another filtered network, the API may be blocked or redirected before it reaches MangaDex. Try another network, VPN, or deploy the app server in an allowed region.`
      ),
      { status: 503, code: "SOURCE_NETWORK_BLOCKED" }
    );
  } finally {
    clearTimeout(timeout);
  }
  const location = response.headers.get("location") ?? "";
  if (response.status >= 300 && response.status < 400 && location) {
    throw Object.assign(
      new Error(
        `MangaDex API was redirected to ${location}. This usually means the source is blocked by the current network. Try another network, VPN, or deploy the app server in an allowed region.`
      ),
      { status: 503, code: "SOURCE_NETWORK_BLOCKED" }
    );
  }
  if (!response.ok) {
    const retryAfter = response.headers.get("retry-after");
    const error = new Error(`MangaDex request failed with HTTP ${response.status}`);
    Object.assign(error, {
      status: response.status,
      retryAfter: retryAfter ? Number(retryAfter) : void 0
    });
    throw error;
  }
  return response.json();
}
function contentRatings(filters) {
  const filter = filters?.find((entry) => entry.id === "contentRating");
  const values = Array.isArray(filter?.value) ? filter.value : ["safe", "suggestive"];
  return values.filter((value) => typeof value === "string");
}
function sortQuery(filters) {
  const sort = filters?.find((entry) => entry.id === "sort")?.value;
  if (sort === "newest") return "order[createdAt]=desc";
  if (sort === "updated") return "order[updatedAt]=desc";
  if (sort === "rating") return "order[rating]=desc";
  if (sort === "popular") return "order[followedCount]=desc";
  return "order[updatedAt]=desc";
}
function listPath$1(page, query, filters) {
  const params = new URLSearchParams({
    limit: String(PAGE_LIMIT$3),
    offset: String(Math.max(0, page - 1) * PAGE_LIMIT$3),
    "includes[]": "cover_art"
  });
  params.append("includes[]", "author");
  params.append("includes[]", "artist");
  for (const rating of contentRatings(filters)) params.append("contentRating[]", rating);
  if (query) params.set("title", query);
  return `/manga?${params.toString()}&${sortQuery(filters)}`;
}
class MangaDexSource {
  id = "mangadex";
  name = "MangaDex";
  baseUrl = "https://mangadex.org";
  language = "multi";
  contentRating = "suggestive";
  isNsfw = false;
  async getList(page, filters) {
    const response = await mangadexFetch(
      listPath$1(page, void 0, filters)
    );
    return {
      items: response.data.map(mangaFromEntity$1),
      page,
      hasNextPage: response.offset + response.limit < response.total,
      total: response.total
    };
  }
  async search(query, page, filters) {
    if (!query.trim()) return this.getList(page, filters);
    const response = await mangadexFetch(
      listPath$1(page, query, filters)
    );
    return {
      items: response.data.map(mangaFromEntity$1),
      page,
      hasNextPage: response.offset + response.limit < response.total,
      total: response.total
    };
  }
  async getDetail(mangaId) {
    const params = new URLSearchParams({ "includes[]": "cover_art" });
    params.append("includes[]", "author");
    params.append("includes[]", "artist");
    const response = await mangadexFetch(
      `/manga/${mangaId}?${params.toString()}`
    );
    const manga = mangaFromEntity$1(response.data);
    return {
      ...manga,
      alternateTitles: response.data.attributes.altTitles?.map((entry) => titleFrom(entry)).filter(Boolean) ?? [],
      year: response.data.attributes.year
    };
  }
  async getChapters(mangaId) {
    const params = new URLSearchParams({
      manga: mangaId,
      limit: "100",
      "translatedLanguage[]": "en",
      "includes[]": "scanlation_group",
      "order[chapter]": "desc"
    });
    const response = await mangadexFetch(
      `/chapter?${params.toString()}`
    );
    return response.data.map((chapter) => {
      const group = getRelationship(chapter, "scanlation_group")?.attributes?.name;
      return {
        id: chapter.id,
        mangaId,
        sourceId: this.id,
        number: Number(chapter.attributes.chapter ?? 0),
        title: chapter.attributes.title,
        language: chapter.attributes.translatedLanguage,
        uploadedAt: chapter.attributes.publishAt ?? chapter.attributes.readableAt ?? (/* @__PURE__ */ new Date()).toISOString(),
        scanlator: typeof group === "string" ? group : void 0,
        url: `https://mangadex.org/chapter/${chapter.id}`
      };
    });
  }
  async getPages(chapterId) {
    const response = await mangadexFetch(`/at-home/server/${chapterId}`);
    return response.chapter.data.map(
      (page) => `${response.baseUrl}/data/${response.chapter.hash}/${page}`
    );
  }
  async getFilters() {
    return [
      {
        id: "contentRating",
        label: "Content rating",
        type: "multi-select",
        values: [
          { label: "Safe", value: "safe" },
          { label: "Suggestive", value: "suggestive" }
        ]
      },
      {
        id: "sort",
        label: "Sort",
        type: "select",
        values: [
          { label: "Popular", value: "popular" },
          { label: "Newest", value: "newest" },
          { label: "Updated", value: "updated" },
          { label: "Rating", value: "rating" }
        ]
      }
    ];
  }
  async getFeatured() {
    const result = await this.getList(1, [{ id: "sort", value: "popular" }]);
    return result.items.slice(0, 6);
  }
  async getHealth() {
    try {
      await mangadexFetch("/ping");
      return { status: "online" };
    } catch {
      return { status: "limited", message: "MangaDex ping failed" };
    }
  }
}
function atobBytes(data) {
  return Buffer.from(data, "base64");
}
function btoaBytes(data) {
  return Buffer.from(data).toString("base64");
}
function rc4(key, input) {
  const state = Array.from({ length: 256 }, (_, index) => index);
  let j = 0;
  for (let i2 = 0; i2 < 256; i2 += 1) {
    j = j + state[i2] + key[i2 % key.length] & 255;
    [state[i2], state[j]] = [state[j], state[i2]];
  }
  const output = new Uint8Array(input.length);
  let i = 0;
  j = 0;
  for (let y = 0; y < input.length; y += 1) {
    i = i + 1 & 255;
    j = j + state[i] & 255;
    [state[i], state[j]] = [state[j], state[i]];
    const keyByte = state[state[i] + state[j] & 255];
    output[y] = input[y] ^ keyByte;
  }
  return output;
}
function transform(input, seed, prefix, prefixLength, schedule) {
  const output = [];
  for (let i = 0; i < input.length; i += 1) {
    if (i < prefixLength) output.push(prefix[i]);
    output.push(schedule[i % 10]((input[i] ^ seed[i % 32]) & 255) & 255);
  }
  return Uint8Array.from(output);
}
const scheduleC = [
  (c) => c - 48 + 256,
  (c) => c - 19 + 256,
  (c) => c ^ 241,
  (c) => c - 19 + 256,
  (c) => c + 223,
  (c) => c - 19 + 256,
  (c) => c - 170 + 256,
  (c) => c - 19 + 256,
  (c) => c - 48 + 256,
  (c) => c ^ 8
];
const scheduleY = [
  (c) => c << 4 | c >>> 4,
  (c) => c + 223,
  (c) => c << 4 | c >>> 4,
  (c) => c ^ 163,
  (c) => c - 48 + 256,
  (c) => c + 82,
  (c) => c + 223,
  (c) => c - 48 + 256,
  (c) => c ^ 83,
  (c) => c << 4 | c >>> 4
];
const scheduleB = [
  (c) => c - 19 + 256,
  (c) => c + 82,
  (c) => c - 48 + 256,
  (c) => c - 170 + 256,
  (c) => c << 4 | c >>> 4,
  (c) => c - 48 + 256,
  (c) => c - 170 + 256,
  (c) => c ^ 8,
  (c) => c + 82,
  (c) => c ^ 163
];
const scheduleJ = [
  (c) => c + 223,
  (c) => c << 4 | c >>> 4,
  (c) => c + 223,
  (c) => c ^ 83,
  (c) => c - 19 + 256,
  (c) => c + 223,
  (c) => c - 170 + 256,
  (c) => c + 223,
  (c) => c - 170 + 256,
  (c) => c ^ 83
];
const scheduleE = [
  (c) => c + 82,
  (c) => c ^ 83,
  (c) => c ^ 163,
  (c) => c + 82,
  (c) => c - 170 + 256,
  (c) => c ^ 8,
  (c) => c ^ 241,
  (c) => c + 82,
  (c) => c + 176,
  (c) => c << 4 | c >>> 4
];
const rc4Keys = {
  l: "u8cBwTi1CM4XE3BkwG5Ble3AxWgnhKiXD9Cr279yNW0=",
  g: "t00NOJ/Fl3wZtez1xU6/YvcWDoXzjrDHJLL2r/IWgcY=",
  B: "S7I+968ZY4Fo3sLVNH/ExCNq7gjuOHjSRgSqh6SsPJc=",
  m: "7D4Q8i8dApRj6UWxXbIBEa1UqvjI+8W0UvPH9talJK8=",
  F: "0JsmfWZA1kwZeWLk5gfV5g41lwLL72wHbam5ZPfnOVE="
};
const seeds32 = {
  A: "pGjzSCtS4izckNAOhrY5unJnO2E1VbrU+tXRYG24vTo=",
  V: "dFcKX9Qpu7mt/AD6mb1QF4w+KqHTKmdiqp7penubAKI=",
  N: "owp1QIY/kBiRWrRn9TLN2CdZsLeejzHhfJwdiQMjg3w=",
  P: "H1XbRvXOvZAhyyPaO68vgIUgdAHn68Y6mrwkpIpEue8=",
  k: "2Nmobf/mpQ7+Dxq1/olPSDj3xV8PZkPbKaucJvVckL0="
};
const prefixKeys = {
  O: "Rowe+rg/0g==",
  v: "8cULcnOMJVY8AA==",
  L: "n2+Og2Gth8Hh",
  p: "aRpvzH+yoA==",
  W: "ZB4oBi0="
};
function generateVrf(input) {
  let bytes = Buffer.from(input, "utf8");
  bytes = Buffer.from(rc4(atobBytes(rc4Keys.l), bytes));
  bytes = Buffer.from(transform(bytes, atobBytes(seeds32.A), atobBytes(prefixKeys.O), 7, scheduleC));
  bytes = Buffer.from(rc4(atobBytes(rc4Keys.g), bytes));
  bytes = Buffer.from(transform(bytes, atobBytes(seeds32.V), atobBytes(prefixKeys.v), 10, scheduleY));
  bytes = Buffer.from(rc4(atobBytes(rc4Keys.B), bytes));
  bytes = Buffer.from(transform(bytes, atobBytes(seeds32.N), atobBytes(prefixKeys.L), 9, scheduleB));
  bytes = Buffer.from(rc4(atobBytes(rc4Keys.m), bytes));
  bytes = Buffer.from(transform(bytes, atobBytes(seeds32.P), atobBytes(prefixKeys.p), 7, scheduleJ));
  bytes = Buffer.from(rc4(atobBytes(rc4Keys.F), bytes));
  bytes = Buffer.from(transform(bytes, atobBytes(seeds32.k), atobBytes(prefixKeys.W), 5, scheduleE));
  return btoaBytes(bytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
const SITE_BASE$2 = "https://mangafire.to";
const PAGE_LIMIT$2 = 30;
const REQUEST_TIMEOUT$2 = 15e3;
const LANGUAGE = "en";
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const mangaFireCookies = /* @__PURE__ */ new Map();
function encodeId(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}
function decodeId(value) {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return value;
  }
}
function encodeChapterRef(ref) {
  return encodeId(JSON.stringify(ref));
}
function decodeChapterRef(value) {
  const decoded = decodeId(value);
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.url === "string") return parsed;
  } catch {
  }
  return { url: decoded };
}
function clean(text) {
  return text?.replace(/\s+/g, " ").trim() ?? "";
}
function absoluteUrl(baseUrl, href) {
  if (!href) return "";
  return new URL(href, baseUrl).toString();
}
function fireIdFromMangaUrl(url) {
  return url.split(".").pop() ?? url;
}
function statusFrom$2(text) {
  const value = text?.toLowerCase() ?? "";
  if (value === "completed") return "completed";
  if (value === "discontinued") return "cancelled";
  if (value === "on_hiatus") return "hiatus";
  return "ongoing";
}
function numberFrom(text) {
  return Number(text?.replace(",", ".")) || 0;
}
function sortFrom$2(filters) {
  const sort = filters?.find((entry) => entry.id === "sort")?.value;
  if (sort === "popular") return "most_viewed";
  if (sort === "rating") return "scores";
  if (sort === "newest") return "release_date";
  return "recently_updated";
}
function splitSetCookieHeader(header) {
  return header?.split(/,(?=\s*[^;,]+=)/).map((part) => part.trim()).filter(Boolean) ?? [];
}
function rememberCookies(headers) {
  const getSetCookie = headers.getSetCookie;
  const setCookies = typeof getSetCookie === "function" ? getSetCookie.call(headers) : splitSetCookieHeader(headers.get("set-cookie"));
  for (const cookie of setCookies) {
    const pair = cookie.split(";", 1)[0];
    const index = pair.indexOf("=");
    if (index > 0) mangaFireCookies.set(pair.slice(0, index), pair.slice(index + 1));
  }
}
function cookieHeader() {
  return [...mangaFireCookies].map(([name, value]) => `${name}=${value}`).join("; ");
}
async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT$2);
  try {
    const cookies = cookieHeader();
    const isAjax = url.includes("/ajax/");
    const response = await fetch(url, {
      headers: {
        Accept: isAjax ? "application/json, text/javascript, */*; q=0.01" : "text/html,application/xhtml+xml,application/json",
        Origin: SITE_BASE$2,
        Referer: `${SITE_BASE$2}/`,
        "User-Agent": USER_AGENT,
        ...isAjax ? { "X-Requested-With": "XMLHttpRequest" } : {},
        ...cookies ? { Cookie: cookies } : {}
      },
      signal: controller.signal
    });
    rememberCookies(response.headers);
    if (!response.ok) {
      throw Object.assign(new Error(`MangaFire returned HTTP ${response.status}`), {
        status: response.status,
        code: "SOURCE_HTTP_ERROR"
      });
    }
    return response.text();
  } catch (error) {
    if (error instanceof Error && "status" in error) throw error;
    const message = error instanceof Error ? error.message : "network request failed";
    throw Object.assign(new Error(`MangaFire tidak bisa diakses dari jaringan ini (${message}).`), {
      status: 503,
      code: "SOURCE_NETWORK_BLOCKED"
    });
  } finally {
    clearTimeout(timeout);
  }
}
async function fetchJson(url) {
  const text = await fetchText(url);
  try {
    return JSON.parse(text);
  } catch {
    throw Object.assign(new Error("MangaFire mengembalikan response non-JSON untuk endpoint AJAX."), {
      status: 502,
      code: "SOURCE_PARSE_FAILED"
    });
  }
}
function ajaxHtml(result) {
  return typeof result === "string" ? result : result?.html ?? "";
}
function cardToManga($, element) {
  const node = $(element);
  const link = node.find(".info > a").first();
  const url = absoluteUrl(SITE_BASE$2, link.attr("href"));
  const title = clean(link.text());
  if (!url || !title) return null;
  return {
    id: encodeId(url),
    sourceId: "mangafire",
    title,
    coverUrl: absoluteUrl(SITE_BASE$2, node.find("img").first().attr("src")),
    format: "Manga",
    status: "ongoing",
    genres: [],
    url
  };
}
class MangaFireSource {
  id = "mangafire";
  name = "MangaFire";
  baseUrl = SITE_BASE$2;
  language = "en";
  contentRating = "suggestive";
  isNsfw = false;
  async getList(page, filters) {
    const url = new URL("/filter", SITE_BASE$2);
    url.searchParams.set("page", String(Math.max(1, page)));
    url.searchParams.append("language[]", LANGUAGE);
    url.searchParams.set("sort", sortFrom$2(filters));
    const items = this.parseList(await fetchText(url.toString()));
    return { items, page, hasNextPage: items.length >= PAGE_LIMIT$2 };
  }
  async search(query, page, filters) {
    if (!query.trim()) return this.getList(page, filters);
    const url = new URL("/filter", SITE_BASE$2);
    url.searchParams.set("page", String(Math.max(1, page)));
    url.searchParams.append("language[]", LANGUAGE);
    url.searchParams.set("keyword", query.trim().split(/\s+/).join("+"));
    url.searchParams.set("vrf", generateVrf(query.trim()));
    url.searchParams.set("sort", "most_relevance");
    const items = this.parseList(await fetchText(url.toString()));
    return { items, page, hasNextPage: items.length >= PAGE_LIMIT$2 };
  }
  async getDetail(mangaId) {
    const url = decodeId(mangaId);
    const $ = cheerio.load(await fetchText(url));
    const title = clean($(".info > h1").text()) || "Untitled";
    const statusText = clean($(".info > p").text());
    return {
      id: mangaId,
      sourceId: this.id,
      title,
      coverUrl: absoluteUrl(SITE_BASE$2, $("div.manga-detail div.poster img").attr("src")),
      author: clean($('div.meta a[href*="/author/"]').text()) || void 0,
      description: clean($("#synopsis div.modal-content").text()),
      status: statusFrom$2(statusText),
      genres: $('div.meta a[href*="/genre/"]').map((_, element) => clean($(element).text())).get().filter(Boolean),
      rating: Number($("div.rating-box").attr("data-score")) / 10 || void 0,
      url,
      alternateTitles: [clean($(".info > h6").text())].filter(Boolean)
    };
  }
  async getChapters(mangaId) {
    const mangaUrl2 = decodeId(mangaId);
    const mangaKey = fireIdFromMangaUrl(mangaUrl2);
    const detailHtml = await fetchText(mangaUrl2);
    const listVrf = generateVrf(`${mangaKey}@chapter@${LANGUAGE}`);
    let listResponse;
    try {
      listResponse = await fetchJson(
        `${SITE_BASE$2}/ajax/read/${mangaKey}/chapter/${LANGUAGE}?vrf=${encodeURIComponent(listVrf)}`
      );
    } catch {
      return this.parseStaticChapters(detailHtml, mangaId);
    }
    const $list = cheerio.load(ajaxHtml(listResponse.result));
    const anchors = $list("ul li a").toArray();
    if (!anchors.length) return this.parseStaticChapters(detailHtml, mangaId);
    let metaAnchors = [];
    try {
      const metaResponse = await fetchJson(
        `${SITE_BASE$2}/ajax/manga/${mangaKey}/chapter/${LANGUAGE}`
      );
      metaAnchors = cheerio.load(ajaxHtml(metaResponse.result))("ul li a").toArray();
    } catch {
      metaAnchors = [];
    }
    return anchors.map((element, index) => {
      const link = $list(element);
      const meta = metaAnchors[index] ? $list(metaAnchors[index]) : void 0;
      const dataId = link.attr("data-id") ?? "";
      const number = numberFrom(link.attr("data-number"));
      const url = absoluteUrl(SITE_BASE$2, link.attr("href"));
      const title = clean(meta?.attr("title")) || clean(link.attr("title")) || clean(link.find("span").first().text()) || `Chapter ${number}`;
      return {
        id: encodeChapterRef({ url, dataId }),
        mangaId,
        sourceId: this.id,
        number,
        title,
        language: LANGUAGE,
        uploadedAt: clean(meta?.find("span").eq(1).text()) || clean(link.find("span").last().text()) || (/* @__PURE__ */ new Date()).toISOString(),
        url
      };
    }).filter((chapter) => chapter.url && chapter.id).sort((left, right) => right.number - left.number);
  }
  async getPages(chapterId) {
    const chapter = decodeChapterRef(chapterId);
    const chapterUrl = chapter.url;
    if (chapter.dataId) {
      return this.getReaderImages(chapter.dataId);
    }
    const html = await fetchText(chapterUrl);
    const $ = cheerio.load(html);
    const directImages = $("img.chapter-page, #page-wrapper img, .page-reader img").map((_, element) => $(element).attr("data-src") ?? $(element).attr("src")).get().filter((src) => /\.(webp|jpe?g|png)(\?|$)/i.test(src));
    if (directImages.length) return directImages;
    const dataId = $("body").attr("data-chapter-id") ?? $("body").attr("data-cid") ?? $("body").attr("data-disqus-id")?.replace(/^mangafire-/, "") ?? chapterUrl.split("/").pop() ?? chapterUrl;
    return this.getReaderImages(dataId);
  }
  async getReaderImages(chapterDataId) {
    const vrf = generateVrf(`chapter@${chapterDataId}`);
    const response = await fetchJson(
      `${SITE_BASE$2}/ajax/read/chapter/${chapterDataId}?vrf=${encodeURIComponent(vrf)}`
    );
    return (response.result?.images ?? []).map(([url, , offset]) => offset && offset > 0 ? `${url}#scrambled_${offset}` : url).filter(Boolean);
  }
  async getFilters() {
    return [
      {
        id: "sort",
        label: "Sort",
        type: "select",
        values: [
          { label: "Updated", value: "updated" },
          { label: "Popular", value: "popular" },
          { label: "Newest", value: "newest" },
          { label: "Rating", value: "rating" }
        ]
      }
    ];
  }
  parseStaticChapters(html, mangaId) {
    const $ = cheerio.load(html);
    return $('.m-list .tab-content[data-name="chapter"] .list-body ul li').map((_, element) => {
      const node = $(element);
      const link = node.find("a").first();
      const number = numberFrom(node.attr("data-number"));
      const url = absoluteUrl(SITE_BASE$2, link.attr("href"));
      const title = clean(link.attr("title")) || clean(link.find("span").first().text()) || `Chapter ${number}`;
      return {
        id: encodeChapterRef({ url }),
        mangaId,
        sourceId: this.id,
        number,
        title,
        language: LANGUAGE,
        uploadedAt: clean(link.find("span").last().text()) || (/* @__PURE__ */ new Date()).toISOString(),
        url
      };
    }).get().sort((left, right) => right.number - left.number);
  }
  parseList(html) {
    const $ = cheerio.load(html);
    const items = $(".original.card-lg .unit .inner").map((_, element) => cardToManga($, element)).get().filter(Boolean);
    if (!items.length && /Just a moment|challenge-platform/i.test(html)) {
      throw Object.assign(new Error("MangaFire sedang memblokir request otomatis dengan challenge anti-bot."), {
        status: 503,
        code: "SOURCE_ANTI_BOT"
      });
    }
    return items;
  }
}
const API_BASE$1 = "https://jumpg-webapi.tokyo-cdn.com/api";
const SITE_BASE$1 = "https://mangaplus.shueisha.co.jp";
const PAGE_LIMIT$1 = 24;
const REQUEST_TIMEOUT$1 = 15e3;
const SOURCE_LANGUAGE = "ENGLISH";
function normalizeAuthor(author) {
  return author.split("/").map((part) => part.trim()).filter(Boolean).join(", ");
}
function statusFrom$1(releaseSchedule, nonAppearanceInfo) {
  if (releaseSchedule === "DISABLED" || releaseSchedule === "COMPLETED") return "completed";
  if (nonAppearanceInfo?.toLowerCase().includes("hiatus")) return "hiatus";
  return "ongoing";
}
function chapterNumber(name) {
  return Number(name.substring(name.indexOf("#") + 1)) || 0;
}
function titleUrl(id) {
  return `${SITE_BASE$1}/titles/${id}`;
}
function mangaFromTitle(title) {
  return {
    id: String(title.titleId),
    sourceId: "mangaplus",
    title: title.name,
    coverUrl: title.portraitImageUrl,
    author: normalizeAuthor(title.author),
    format: "Manga",
    status: "ongoing",
    genres: [],
    url: titleUrl(title.titleId)
  };
}
function paginate(items, page) {
  const start = (Math.max(1, page) - 1) * PAGE_LIMIT$1;
  return items.slice(start, start + PAGE_LIMIT$1);
}
function sortFrom$1(filters) {
  const sort = filters?.find((entry) => entry.id === "sort")?.value;
  if (sort === "updated") return "updated";
  if (sort === "newest") return "alphabetical";
  if (sort === "popular" || sort === "rating") return "popular";
  return "updated";
}
class MangaPlusSource {
  id = "mangaplus";
  name = "MANGA Plus";
  baseUrl = SITE_BASE$1;
  language = "en/ja";
  contentRating = "safe";
  isNsfw = false;
  sessionToken = crypto.randomUUID();
  allTitlesCache;
  async getList(page, filters) {
    const sort = sortFrom$1(filters);
    const titles = sort === "updated" ? await this.getUpdatedTitles() : sort === "alphabetical" ? await this.getAllTitles() : await this.getPopularTitles();
    const items = paginate(titles.map(mangaFromTitle), page);
    return {
      items,
      page,
      hasNextPage: page * PAGE_LIMIT$1 < titles.length,
      total: titles.length
    };
  }
  async search(query, page) {
    if (!query.trim()) return this.getList(page);
    const normalized = query.trim().toLowerCase();
    const titles = (await this.getAllTitles()).filter((title) => {
      const author = normalizeAuthor(title.author).toLowerCase();
      return title.name.toLowerCase().includes(normalized) || author.includes(normalized);
    });
    return {
      items: paginate(titles.map(mangaFromTitle), page),
      page,
      hasNextPage: page * PAGE_LIMIT$1 < titles.length,
      total: titles.length
    };
  }
  async getDetail(mangaId) {
    const json = await this.apiCall(`/title_detailV3?title_id=${encodeURIComponent(mangaId)}`);
    const detail = json.titleDetailView;
    if (!detail) throw this.parseError("MANGA Plus detail payload is missing titleDetailView");
    const manga = mangaFromTitle(detail.title);
    const releaseSchedule = detail.titleLabels?.releaseSchedule;
    return {
      ...manga,
      id: mangaId,
      description: [detail.overview, releaseSchedule === "COMPLETED" ? "" : detail.viewingPeriodDescription].filter(Boolean).join("\n\n"),
      status: statusFrom$1(releaseSchedule, detail.nonAppearanceInfo),
      alternateTitles: []
    };
  }
  async getChapters(mangaId) {
    const json = await this.apiCall(`/title_detailV3?title_id=${encodeURIComponent(mangaId)}`);
    const detail = json.titleDetailView;
    if (!detail) return [];
    return detail.chapterListGroup.flatMap((group) => [...group.firstChapterList ?? [], ...group.lastChapterList ?? []]).filter((chapter) => chapter.subTitle).map((chapter) => ({
      id: String(chapter.chapterId),
      mangaId,
      sourceId: this.id,
      number: chapterNumber(chapter.name),
      title: chapter.subTitle,
      language: detail.title.language?.toLowerCase() ?? "en",
      uploadedAt: new Date((chapter.startTimeStamp ?? 0) * 1e3 || Date.now()).toISOString(),
      scanlator: "MANGA Plus by SHUEISHA",
      url: `${SITE_BASE$1}/viewer/${chapter.chapterId}`
    }));
  }
  async getPages(chapterId) {
    const json = await this.apiCall(
      `/manga_viewer?chapter_id=${encodeURIComponent(chapterId)}&split=yes&img_quality=super_high`
    );
    return (json.mangaViewer?.pages ?? []).map((page) => page.mangaPage).filter((page) => Boolean(page?.imageUrl)).map((page) => `${page.imageUrl}${page.encryptionKey ? `#${page.encryptionKey}` : ""}`);
  }
  async getFilters() {
    return [
      {
        id: "sort",
        label: "Sort",
        type: "select",
        values: [
          { label: "Popular", value: "popular" },
          { label: "Updated", value: "updated" },
          { label: "Alphabetical", value: "newest" }
        ]
      }
    ];
  }
  async getPopularTitles() {
    const json = await this.apiCall("/title_list/ranking");
    return this.onlyConfiguredLanguage(json.titleRankingView?.titles ?? []);
  }
  async getUpdatedTitles() {
    const json = await this.apiCall("/title_list/updated");
    return this.onlyConfiguredLanguage(json.titleUpdatedView?.latestTitle.map((entry) => entry.title) ?? []);
  }
  async getAllTitles() {
    if (!this.allTitlesCache) {
      const json = await this.apiCall("/title_list/allV2");
      this.allTitlesCache = this.onlyConfiguredLanguage(
        json.allTitlesViewV2?.AllTitlesGroup.flatMap((group) => group.titles) ?? []
      ).sort((left, right) => left.name.localeCompare(right.name));
    }
    return this.allTitlesCache;
  }
  onlyConfiguredLanguage(titles) {
    return titles.filter((title) => (title.language ?? SOURCE_LANGUAGE) === SOURCE_LANGUAGE);
  }
  async apiCall(path) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT$1);
    const url = new URL(`${API_BASE$1}${path}`);
    url.searchParams.set("format", "json");
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "Session-Token": this.sessionToken,
          "User-Agent": "GrimoireReader/0.1"
        },
        signal: controller.signal
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        const popup = payload.error?.popups?.[0] ?? payload.error?.englishPopup;
        throw Object.assign(new Error(popup?.body ?? popup?.subject ?? `MANGA Plus HTTP ${response.status}`), {
          status: response.ok ? 502 : response.status,
          code: "SOURCE_REQUEST_FAILED"
        });
      }
      return payload.success;
    } catch (error) {
      if (error instanceof Error && "status" in error) throw error;
      const message = error instanceof Error ? error.message : "network request failed";
      throw Object.assign(new Error(`MANGA Plus tidak bisa diakses dari jaringan ini (${message}).`), {
        status: 503,
        code: "SOURCE_NETWORK_BLOCKED"
      });
    } finally {
      clearTimeout(timeout);
    }
  }
  parseError(message) {
    return Object.assign(new Error(message), { status: 502, code: "SOURCE_PARSE_FAILED" });
  }
}
const KOTATSU_SOURCE_CATALOG = [
  {
    "id": "kotatsu_manga18_en_porncomic18",
    "name": "18PornComic",
    "description": "Kotatsu parser catalog source (manga18). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://18porncomic.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "18"
  },
  {
    "id": "kotatsu_madara_en_stkissmangacom",
    "name": "1stKissManga.com",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://1stkissmanga.mom",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "1C"
  },
  {
    "id": "kotatsu_madara_en_stkissmangablog",
    "name": "1StKissManga.net",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://1stkissmanga.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "1N"
  },
  {
    "id": "kotatsu_onemanga_fr_centuryboys20th",
    "name": "20ThCenturyBoys",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://20thcenturyboys.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "20"
  },
  {
    "id": "kotatsu_madara_ar_asq",
    "name": "3Asq",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://3asq.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "3A"
  },
  {
    "id": "kotatsu_galleryadults_all_hentai3",
    "name": "3Hentai",
    "description": "Kotatsu parser catalog source (galleryadults). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://3hentai.net",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "3H"
  },
  {
    "id": "kotatsu_madara_pt_yaoix3",
    "name": "3XYaoi",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://3xyaoi.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "3X"
  },
  {
    "id": "kotatsu_keyoapp_ar_scans4u",
    "name": "4uScans",
    "description": "Kotatsu parser catalog source (keyoapp). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://4uscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "4U"
  },
  {
    "id": "kotatsu_ru_acomics",
    "name": "AComics",
    "description": "Kotatsu parser catalog source (ru). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://acomics.ru",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AC"
  },
  {
    "id": "kotatsu_mangareader_tr_adonisfansub",
    "name": "AdonisFansub",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://manga.adonisfansub.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AD"
  },
  {
    "id": "kotatsu_madara_en_adultwebtoon",
    "name": "AdultWebtoon",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://adultwebtoon.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "AD"
  },
  {
    "id": "kotatsu_mangareader_tr_adumanga",
    "name": "AduManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://adumanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AD"
  },
  {
    "id": "kotatsu_mangareader_tr_afroditscans",
    "name": "AfroditScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://afroditscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AF"
  },
  {
    "id": "kotatsu_keyoapp_en_agscomics",
    "name": "AgsComics",
    "description": "Kotatsu parser catalog source (keyoapp). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://agrcomics.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AG"
  },
  {
    "id": "kotatsu_mangareader_id_ainzscans",
    "name": "AinzScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://ainzscans.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AI"
  },
  {
    "id": "kotatsu_zeistmanga_es_aiyumangascanlation",
    "name": "AiyuManhua",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://aiyumanhua.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AI"
  },
  {
    "id": "kotatsu_mangareader_id_alceascan",
    "name": "AlceaScan",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://alceacomic.my.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AL"
  },
  {
    "id": "kotatsu_ru_grouple_allhentaiparser",
    "name": "AllHentai",
    "description": "Kotatsu parser catalog source (ru). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://qawa.org",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "AL"
  },
  {
    "id": "kotatsu_madara_tr_alliedfansub",
    "name": "AlliedFansub",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://alliedfansub.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AL"
  },
  {
    "id": "kotatsu_madara_en_allporncomic",
    "name": "AllPornComic",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://allporncomic.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "AL"
  },
  {
    "id": "kotatsu_madara_pt_alonescanlator",
    "name": "AloneScanlator",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://alonescanlator.com.br",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AL"
  },
  {
    "id": "kotatsu_mangareader_en_altayscans",
    "name": "AltayScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://altayscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AL"
  },
  {
    "id": "kotatsu_mangareader_id_alterkaiscans",
    "name": "AlterkaiScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://alterkaiscans.my.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AL"
  },
  {
    "id": "kotatsu_mangareader_tr_alucardscans",
    "name": "AlucardScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://alucardscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AL"
  },
  {
    "id": "kotatsu_madara_pt_ancientcomics",
    "name": "AncientComics",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://ancientcomics.com.br",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AN"
  },
  {
    "id": "kotatsu_be_anibelparser",
    "name": "Anibel",
    "description": "Kotatsu parser catalog source (be). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "be",
    "baseUrl": "https://anibel.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AN"
  },
  {
    "id": "kotatsu_mangareader_en_anigliscans",
    "name": "AnigliScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://anigliscans.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AN"
  },
  {
    "id": "kotatsu_madara_tr_anikiga",
    "name": "Anikiga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://anikiga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AN"
  },
  {
    "id": "kotatsu_animebootstrap_animebootstrapparser",
    "name": "Anime Bootstrap",
    "description": "Kotatsu parser catalog source (animebootstrap). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AB"
  },
  {
    "id": "kotatsu_all_ninenineninehentaiparser",
    "name": "AnimeH",
    "description": "Kotatsu parser catalog source (all). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://animeh.to",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AN"
  },
  {
    "id": "kotatsu_fr_animesama",
    "name": "AnimeSama",
    "description": "Kotatsu parser catalog source (fr). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://$domain",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AN"
  },
  {
    "id": "kotatsu_zeistmanga_pt_animexnovel",
    "name": "AnimeXNovel",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://animexnovel.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AN"
  },
  {
    "id": "kotatsu_madara_tr_anisamanga",
    "name": "AnisaManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://anisamanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AN"
  },
  {
    "id": "kotatsu_madara_en_anisascans",
    "name": "AnisaScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://anisascans.in",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AN"
  },
  {
    "id": "kotatsu_madara_en_anshscans",
    "name": "AnshScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://anshscans.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AN"
  },
  {
    "id": "kotatsu_keyoapp_fr_anteikuscan",
    "name": "AnteikuScan",
    "description": "Kotatsu parser catalog source (keyoapp). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://anteikuscan.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AN"
  },
  {
    "id": "kotatsu_mmrcms_es_anzmangashd",
    "name": "AnzMangasHd",
    "description": "Kotatsu parser catalog source (mmrcms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://anzmangashd.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AN"
  },
  {
    "id": "kotatsu_madara_pt_apenasmaisumyaoi",
    "name": "Apenasmaisum Yaoi",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://apenasmaisumyaoi.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "AY"
  },
  {
    "id": "kotatsu_mangareader_id_apkomik",
    "name": "Apkomik",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://apkomik.cc",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AP"
  },
  {
    "id": "kotatsu_madara_es_apollcomics",
    "name": "ApollComics",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://apollcomics.es",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AP"
  },
  {
    "id": "kotatsu_madara_en_aquamanga",
    "name": "AquaManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://aquareader.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AQ"
  },
  {
    "id": "kotatsu_madara_en_scansraw",
    "name": "AquaScans.com",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://aquascans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AC"
  },
  {
    "id": "kotatsu_madara_ar_arabshentai",
    "name": "Arabs Hentai",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://arabshentai.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "AH"
  },
  {
    "id": "kotatsu_zeistmanga_ar_arabsdoujin",
    "name": "ArabsDoujin",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://arabsdoujin.online",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "AR"
  },
  {
    "id": "kotatsu_madara_ar_arabtoons",
    "name": "ArabToons",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://arabtoons.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AR"
  },
  {
    "id": "kotatsu_mangareader_ar_arareascans",
    "name": "ArAreaScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://ar.kenmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AR"
  },
  {
    "id": "kotatsu_madara_tr_araznovel",
    "name": "ArazNovel",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://araznovel.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AR"
  },
  {
    "id": "kotatsu_mangadventure_en_arcrelight",
    "name": "Arc-Relight",
    "description": "Kotatsu parser catalog source (mangadventure). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://arc-relight.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AR"
  },
  {
    "id": "kotatsu_madara_en_arcanescans",
    "name": "ArcaneScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://arcanescans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AR"
  },
  {
    "id": "kotatsu_madara_pt_arcticscan",
    "name": "ArcticScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://arcticscan.top",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AR"
  },
  {
    "id": "kotatsu_mangareader_tr_arcurafansub",
    "name": "ArcuraFansub",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://arcurafansub.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AR"
  },
  {
    "id": "kotatsu_mangareader_ar_areascans",
    "name": "AreaScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://ar.kenmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AR"
  },
  {
    "id": "kotatsu_madara_pt_argoscomics",
    "name": "ArgosComics",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://argoscomic.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AR"
  },
  {
    "id": "kotatsu_madara_tr_armoniscans",
    "name": "ArmoniScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://armoniscans.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AR"
  },
  {
    "id": "kotatsu_madara_es_artessupremas",
    "name": "ArtesSupremas",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://artessupremas.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AR"
  },
  {
    "id": "kotatsu_madara_pt_arthurscan",
    "name": "ArthurScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://arthurscan.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AR"
  },
  {
    "id": "kotatsu_keyoapp_en_arvenscans",
    "name": "ArvenComics",
    "description": "Kotatsu parser catalog source (keyoapp). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://arvencomics.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AR"
  },
  {
    "id": "kotatsu_madara_en_aryascans",
    "name": "AryaScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://aryascans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AR"
  },
  {
    "id": "kotatsu_mangareader_en_ascalonscans",
    "name": "AscalonScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://ascalonscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AS"
  },
  {
    "id": "kotatsu_mangareader_tr_asemifansub",
    "name": "AsemiFansub",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://asemifansub.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AS"
  },
  {
    "id": "kotatsu_mangareader_es_asialotuss",
    "name": "AsiaLotuss",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://asialotuss.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AS"
  },
  {
    "id": "kotatsu_galleryadults_all_asmhentai",
    "name": "AsmHentai",
    "description": "Kotatsu parser catalog source (galleryadults). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://asmhentai.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "AS"
  },
  {
    "id": "kotatsu_mangadventure_en_assortedscans",
    "name": "AssortedScans",
    "description": "Kotatsu parser catalog source (mangadventure). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://assortedscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AS"
  },
  {
    "id": "kotatsu_madara_fr_astralmanga",
    "name": "AstralManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://astral-manga.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AS"
  },
  {
    "id": "kotatsu_keyoapp_fr_astrames",
    "name": "Astrames",
    "description": "Kotatsu parser catalog source (keyoapp). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://astrames.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AS"
  },
  {
    "id": "kotatsu_mangareader_en_astrascans",
    "name": "AstraScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://astrascans.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AS"
  },
  {
    "id": "kotatsu_zeistmanga_id_asupankomik",
    "name": "AsupanKomik",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://asupankomik.my.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AS"
  },
  {
    "id": "kotatsu_en_asurascansparser",
    "name": "AsuraComic",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://asuracomic.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AS"
  },
  {
    "id": "kotatsu_madara_en_asurascansus",
    "name": "AsuraScans.us",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://asurascans.us",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AU"
  },
  {
    "id": "kotatsu_madara_en_asurascansgg",
    "name": "AsuraScansGg",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://asurascans.us",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AS"
  },
  {
    "id": "kotatsu_madara_tr_asurascanstr",
    "name": "AsuraScansTR",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://asurascans.com.tr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AS"
  },
  {
    "id": "kotatsu_madara_pt_atemporal",
    "name": "Atemporal",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://atemporal.cloud",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AT"
  },
  {
    "id": "kotatsu_mangareader_tr_athenamanga",
    "name": "AthenaManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://athenamanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AT"
  },
  {
    "id": "kotatsu_madara_tr_atikrost",
    "name": "Atikrost",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://mangaoku.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AT"
  },
  {
    "id": "kotatsu_madara_es_atlantisscan",
    "name": "AtlantisScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://scansatlanticos.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AT"
  },
  {
    "id": "kotatsu_mangareader_tr_ayatoon",
    "name": "AyaToon",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://ayatoon.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AY"
  },
  {
    "id": "kotatsu_madara_ar_azoramoon",
    "name": "AzoraMoon",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://azoramoon.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "AZ"
  },
  {
    "id": "kotatsu_madara_en_babelwuxia",
    "name": "Babelwuxia",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://babelwuxia.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BA"
  },
  {
    "id": "kotatsu_madara_th_bakaman",
    "name": "BakaMan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://bakaman.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BA"
  },
  {
    "id": "kotatsu_madara_zh_bakamh",
    "name": "Bakamh",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "zh",
    "baseUrl": "https://bakamh.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BA"
  },
  {
    "id": "kotatsu_madara_en_bananamanga",
    "name": "BananaManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://bananamanga.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BA"
  },
  {
    "id": "kotatsu_mangareader_fr_bananascan",
    "name": "BananaScan",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://banana-scan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BA"
  },
  {
    "id": "kotatsu_mmrcms_en_bananascan",
    "name": "BananaScan.Com",
    "description": "Kotatsu parser catalog source (mmrcms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://BananaScan.Com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BC"
  },
  {
    "id": "kotatsu_zh_baozimh",
    "name": "Baozimh",
    "description": "Kotatsu parser catalog source (zh). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "zh",
    "baseUrl": "https://baozimh.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BA"
  },
  {
    "id": "kotatsu_madara_es_barmanga",
    "name": "BarManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://barmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BA"
  },
  {
    "id": "kotatsu_en_batcave",
    "name": "BatCave",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://batcave.biz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BA"
  },
  {
    "id": "kotatsu_madtheme_en_beehentai",
    "name": "BeeHentai",
    "description": "Kotatsu parser catalog source (madtheme). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://beehentai.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "BE"
  },
  {
    "id": "kotatsu_en_beetoon",
    "name": "BeeToon.net",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://BeeToon.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BN"
  },
  {
    "id": "kotatsu_madara_es_begatranslation",
    "name": "BegaTranslation",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://begatranslation.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BE"
  },
  {
    "id": "kotatsu_fr_bentomangaparser",
    "name": "BentoManga",
    "description": "Kotatsu parser catalog source (fr). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://bentomanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BE"
  },
  {
    "id": "kotatsu_mmrcms_fr_bentoscan",
    "name": "BentoScan",
    "description": "Kotatsu parser catalog source (mmrcms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://bentoscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BE"
  },
  {
    "id": "kotatsu_onemanga_fr_berserkscan",
    "name": "BerserkScan",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://berserkscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BE"
  },
  {
    "id": "kotatsu_madara_ru_bestmanga",
    "name": "BestManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://bestmanga.club",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BE"
  },
  {
    "id": "kotatsu_madara_en_bestmanhuacom",
    "name": "BestManhua.com",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://bestmanhua.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BC"
  },
  {
    "id": "kotatsu_madara_it_beyondtheataraxia",
    "name": "Beyond The Ataraxia",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "it",
    "baseUrl": "https://beyondtheataraxia.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BT"
  },
  {
    "id": "kotatsu_madara_en_bibimanga",
    "name": "BibiManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://bibimanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BI"
  },
  {
    "id": "kotatsu_mangareader_en_birdmanga",
    "name": "BirdManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://birdmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BI"
  },
  {
    "id": "kotatsu_madara_id_birdtoon",
    "name": "BirdToon",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://birdtoon.shop",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BI"
  },
  {
    "id": "kotatsu_vi_blogtruyenparser",
    "name": "Blog Truyện",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://encrypted-tbn0.gstatic.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BT"
  },
  {
    "id": "kotatsu_vi_blogtruyenvn",
    "name": "BlogTruyen.vn (Unofficial)",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://encrypted-tbn0.gstatic.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BV"
  },
  {
    "id": "kotatsu_onemanga_fr_bluelockscan",
    "name": "BlueLockScan",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://bluelockscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BL"
  },
  {
    "id": "kotatsu_madara_fr_bluesolo",
    "name": "BlueSolo",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://www1.bluesolo.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BL"
  },
  {
    "id": "kotatsu_madara_es_bokugents",
    "name": "Bokugents",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://bokugents.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BO"
  },
  {
    "id": "kotatsu_madara_en_bookmanga",
    "name": "BookManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://bookmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BO"
  },
  {
    "id": "kotatsu_madara_pt_borutoexplorer",
    "name": "BorutoExplorer",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://leitor.borutoexplorer.com.br",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BO"
  },
  {
    "id": "kotatsu_madara_en_boyslove",
    "name": "BoysLove",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://boyslove.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BO"
  },
  {
    "id": "kotatsu_heancmsalt_es_brakeout",
    "name": "Brakeout",
    "description": "Kotatsu parser catalog source (heancmsalt). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://brakeout.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BR"
  },
  {
    "id": "kotatsu_pt_brmangas",
    "name": "BrMangas",
    "description": "Kotatsu parser catalog source (pt). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://brmangas.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BR"
  },
  {
    "id": "kotatsu_madara_pt_brmangastop",
    "name": "BrMangasTop",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://brmangas.top",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BR"
  },
  {
    "id": "kotatsu_gallery_vi_buondua",
    "name": "Buon Dua",
    "description": "Kotatsu parser catalog source (gallery). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://buondua.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BD"
  },
  {
    "id": "kotatsu_madara_pt_burningscans",
    "name": "BurningScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://burningscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BU"
  },
  {
    "id": "kotatsu_mangareader_es_bymichiby",
    "name": "Bymichiby",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://bymichiby.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "BY"
  },
  {
    "id": "kotatsu_madara_pt_cafecomyaoi",
    "name": "CafecomYaoi",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://cafecomyaoi.com.br",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "CA"
  },
  {
    "id": "kotatsu_mangareader_es_carteldemanhwas",
    "name": "Cartel De Manhwas",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://cartelmanhwas.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CD"
  },
  {
    "id": "kotatsu_madara_th_cat300",
    "name": "Cat300",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://cat-300.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CA"
  },
  {
    "id": "kotatsu_mangareader_es_catharsisfantasy",
    "name": "CatharsisFantasy",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://catharsisfantasy.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CA"
  },
  {
    "id": "kotatsu_mangareader_es_catharsisworld",
    "name": "CatharsisWorld",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://catharsisworld.dig-it.info",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CA"
  },
  {
    "id": "kotatsu_madara_vi_hentaicube",
    "name": "CBHentai",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://hentaicube.xyz",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "CB"
  },
  {
    "id": "kotatsu_heancmsalt_es_cerberuseries",
    "name": "CerberusSeries",
    "description": "Kotatsu parser catalog source (heancmsalt). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://legionscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CE"
  },
  {
    "id": "kotatsu_madara_pt_cerisescans",
    "name": "CeriseScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://cerise.leitorweb.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CE"
  },
  {
    "id": "kotatsu_onemanga_fr_chainsawmanscan",
    "name": "ChainsawManScan",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://chainsawman-scan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CH"
  },
  {
    "id": "kotatsu_ru_multichan_chanparser",
    "name": "Chan",
    "description": "Kotatsu parser catalog source (ru). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://div.genre",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CH"
  },
  {
    "id": "kotatsu_en_clonemangaparser",
    "name": "CloneManga",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manga.clone-army.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CL"
  },
  {
    "id": "kotatsu_madara_tr_clovermanga",
    "name": "CloverManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://webtoonhatti.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CL"
  },
  {
    "id": "kotatsu_vi_cmangaparser",
    "name": "CManga",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://cmangax6.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CM"
  },
  {
    "id": "kotatsu_madara_en_cocomic",
    "name": "CoComic",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://cocomic.co",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CO"
  },
  {
    "id": "kotatsu_madara_es_cocorip",
    "name": "Cocorip",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://cocorip.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CO"
  },
  {
    "id": "kotatsu_madara_en_coffeemanga",
    "name": "CoffeeManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://coffeemanga.io",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CO"
  },
  {
    "id": "kotatsu_madara_en_coloredmanga",
    "name": "ColoredManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://coloredmanga.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CO"
  },
  {
    "id": "kotatsu_ru_comxparser",
    "name": "Com-X",
    "description": "Kotatsu parser catalog source (ru). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://com-x.life",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CX"
  },
  {
    "id": "kotatsu_manga18_en_comic1000",
    "name": "Comic1000",
    "description": "Kotatsu parser catalog source (manga18). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://comic1000.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CO"
  },
  {
    "id": "kotatsu_mangareader_id_comic21",
    "name": "Comic21",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://comic21.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CO"
  },
  {
    "id": "kotatsu_madara_ar_comicarab",
    "name": "ComicArab",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://comicarab.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CO"
  },
  {
    "id": "kotatsu_mangareader_id_comicaso",
    "name": "Comicaso",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://comicaso.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CO"
  },
  {
    "id": "kotatsu_en_comicextra",
    "name": "ComicExtra",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://azcomix.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CO"
  },
  {
    "id": "kotatsu_all_comickfunparser",
    "name": "ComicK",
    "description": "Kotatsu parser catalog source (all). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://comick.io",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CO"
  },
  {
    "id": "kotatsu_madara_en_comicsvalley",
    "name": "ComicsValley",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://comicsvalley.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CO"
  },
  {
    "id": "kotatsu_madara_en_comiz",
    "name": "Comiz",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://v2.comiz.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CO"
  },
  {
    "id": "kotatsu_mangareader_en_constellarcomic",
    "name": "ConstellarComic",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://constellarcomic.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CO"
  },
  {
    "id": "kotatsu_madara_es_copypastescan",
    "name": "CopyPasteScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://copypastescan.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CO"
  },
  {
    "id": "kotatsu_mangareader_en_cosmicscansparser",
    "name": "CosmicScans.com",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://cosmic-scans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CC"
  },
  {
    "id": "kotatsu_mangareader_id_cosmicscans",
    "name": "CosmicScans.id",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://cosmic345.co",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CI"
  },
  {
    "id": "kotatsu_madara_en_creepyscans",
    "name": "CreepyScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://creepyscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CR"
  },
  {
    "id": "kotatsu_madara_fr_mangasoriginesunofficial",
    "name": "CrunchyScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://crunchyscan.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CR"
  },
  {
    "id": "kotatsu_madara_pt_crystalscan",
    "name": "CrystalComics",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://crystalcomics.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CR"
  },
  {
    "id": "kotatsu_mangareader_en_culturedworks",
    "name": "CulturedWorks",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://culturedworks.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CU"
  },
  {
    "id": "kotatsu_mangareader_tr_culturesubs",
    "name": "CultureSubs",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://culturesubs.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CU"
  },
  {
    "id": "kotatsu_cupfox_cupfoxparser",
    "name": "Cup Fox",
    "description": "Kotatsu parser catalog source (cupfox). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CF"
  },
  {
    "id": "kotatsu_vi_cuutruyenparser",
    "name": "Cứu Truyện",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://truycapcuutruyen.pages.dev",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CU"
  },
  {
    "id": "kotatsu_madara_pt_cvnscan",
    "name": "CvnScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://covendasbruxonas.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CV"
  },
  {
    "id": "kotatsu_mangareader_en_cypherscans",
    "name": "CypherScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://cypheroscans.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "CY"
  },
  {
    "id": "kotatsu_vi_damconuong",
    "name": "Dâm Cô Nương",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://damconuong.co",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DM"
  },
  {
    "id": "kotatsu_onemanga_fr_dandadan",
    "name": "Dandadan",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://dandadan.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DA"
  },
  {
    "id": "kotatsu_guya_en_danke",
    "name": "DankeFursLesen",
    "description": "Kotatsu parser catalog source (guya). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://danke.moe",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DA"
  },
  {
    "id": "kotatsu_madara_es_daprob",
    "name": "Daprob",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://daprob.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DA"
  },
  {
    "id": "kotatsu_madara_en_darkscan",
    "name": "Dark-Scan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://dark-scan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DS"
  },
  {
    "id": "kotatsu_madara_es_darknebulus",
    "name": "Darknebulus",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://darknebulus.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DA"
  },
  {
    "id": "kotatsu_madara_en_darkscans",
    "name": "DarkScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://darkscans.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DA"
  },
  {
    "id": "kotatsu_zeistmanga_es_datgarscanlation",
    "name": "DatgarScanlation",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://datgarscanlation.blogspot.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DA"
  },
  {
    "id": "kotatsu_hotcomics_en_daycomics",
    "name": "DayComics",
    "description": "Kotatsu parser catalog source (hotcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DA"
  },
  {
    "id": "kotatsu_foolslide_en_deathtollscans",
    "name": "DeathTollScans",
    "description": "Kotatsu parser catalog source (foolslide). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://reader.deathtollscans.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DE"
  },
  {
    "id": "kotatsu_madara_en_decadencescans",
    "name": "DecadenceScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://reader.decadencescans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DE"
  },
  {
    "id": "kotatsu_madara_tr_deccalscans",
    "name": "DeccalScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://fuchscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DE"
  },
  {
    "id": "kotatsu_en_demonicscans",
    "name": "DemonicScans",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://demonicscans.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DE"
  },
  {
    "id": "kotatsu_mangareader_pt_demonsect",
    "name": "DemonSect",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://seitacelestial.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DE"
  },
  {
    "id": "kotatsu_onemanga_fr_demonslayerscan",
    "name": "DemonSlayerScan",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://demonslayerscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DE"
  },
  {
    "id": "kotatsu_madara_pt_cabaredowatame",
    "name": "DessertScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://cabaredowatame.site",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DE"
  },
  {
    "id": "kotatsu_ru_desumeparser",
    "name": "Desu",
    "description": "Kotatsu parser catalog source (ru). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://x.desu.city",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DE"
  },
  {
    "id": "kotatsu_mangareader_en_dexhentai",
    "name": "DexHentai",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://dexhentai.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "DE"
  },
  {
    "id": "kotatsu_madara_tr_diamondfansub",
    "name": "DiamondFansub",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://diamondfansub.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DI"
  },
  {
    "id": "kotatsu_madara_pt_dianxiatrads",
    "name": "DianxiaTrads",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://dianxiatrads.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DI"
  },
  {
    "id": "kotatsu_mangareader_pt_diskusscan",
    "name": "DiskusScan",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://diskusscan.online",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DI"
  },
  {
    "id": "kotatsu_wpcomics_vi_doctruyen3q",
    "name": "DocTruyen3Q",
    "description": "Kotatsu parser catalog source (wpcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://doctruyen3qui15.pro",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DO"
  },
  {
    "id": "kotatsu_liliana_vi_doctruyen5s",
    "name": "DocTruyen5s",
    "description": "Kotatsu parser catalog source (liliana). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://proxy.luce.workers.dev",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DO"
  },
  {
    "id": "kotatsu_mangareader_id_dojing",
    "name": "Dojing",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://dojing.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DO"
  },
  {
    "id": "kotatsu_madara_tr_domalfansb",
    "name": "DomalFansub",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://domalfansb.com.tr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DO"
  },
  {
    "id": "kotatsu_mangareader_th_doujin69",
    "name": "Doujin69",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://doujin69.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "DO"
  },
  {
    "id": "kotatsu_mangareader_id_doujindesurip",
    "name": "DoujinDesu.click",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://doujindesu.asia",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "DC"
  },
  {
    "id": "kotatsu_id_doujindesuparser",
    "name": "DoujinDesu.tv",
    "description": "Kotatsu parser catalog source (id). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://DoujinDesu.tv",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "DT"
  },
  {
    "id": "kotatsu_galleryadults_all_doujindesuuk",
    "name": "DoujinDesu.uk",
    "description": "Kotatsu parser catalog source (galleryadults). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://DoujinDesu.uk",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "DU"
  },
  {
    "id": "kotatsu_madara_es_doujinhentainet",
    "name": "DoujinHentai.net",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://doujinhentai.net",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "DN"
  },
  {
    "id": "kotatsu_mangareader_id_doujinku",
    "name": "DoujinKu",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://doujinku.org",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "DO"
  },
  {
    "id": "kotatsu_mangareader_es_doujins",
    "name": "Doujins.lat",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://doujins.lat",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "DL"
  },
  {
    "id": "kotatsu_madara_es_doujinshell",
    "name": "DoujinShell",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://doujinshell.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "DO"
  },
  {
    "id": "kotatsu_madara_th_doujinza",
    "name": "Doujinza",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://doujinza.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "DO"
  },
  {
    "id": "kotatsu_es_dragontranslationparser",
    "name": "Dragon Translation",
    "description": "Kotatsu parser catalog source (es). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://dragontranslation.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DT"
  },
  {
    "id": "kotatsu_mangareader_th_dragonmanga",
    "name": "DragonManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://dragon-manga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DR"
  },
  {
    "id": "kotatsu_madara_en_dragontea",
    "name": "DragonTea",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://dragontea.ink",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DR"
  },
  {
    "id": "kotatsu_madara_es_dragontranslationorg",
    "name": "DragonTranslation.org",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://dragontranslation.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DO"
  },
  {
    "id": "kotatsu_mangareader_en_drakescans",
    "name": "DrakeComic",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://drakecomic.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DR"
  },
  {
    "id": "kotatsu_madara_pt_dreamscan",
    "name": "DreamScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://fairydream.com.br",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DR"
  },
  {
    "id": "kotatsu_onemanga_fr_drstone",
    "name": "DrStone",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://drstone.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DR"
  },
  {
    "id": "kotatsu_mangareader_es_dtupscan",
    "name": "DtupScan",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://dtupscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DT"
  },
  {
    "id": "kotatsu_vi_dualeotruyen",
    "name": "Dưa Leo Truyện",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://dualeotruyenev.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DA"
  },
  {
    "id": "kotatsu_madara_en_duckmanga",
    "name": "DuckManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://duckmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DU"
  },
  {
    "id": "kotatsu_mangareader_id_duniakomik",
    "name": "DuniaKomik",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://duniakomik.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DU"
  },
  {
    "id": "kotatsu_zeistmanga_pt_duoscanlators",
    "name": "DuoScanlators",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://duoscanlators.blogspot.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DU"
  },
  {
    "id": "kotatsu_en_dynastyscans",
    "name": "DynastyScans",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://dynasty-scans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "DY"
  },
  {
    "id": "kotatsu_mangareader_th_ecchidoujin",
    "name": "EcchiDoujin",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://ecchi-doujin.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "EC"
  },
  {
    "id": "kotatsu_keyoapp_fr_edscanlation",
    "name": "EdScanlation",
    "description": "Kotatsu parser catalog source (keyoapp). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://edscanlation.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ED"
  },
  {
    "id": "kotatsu_mangareader_en_edoujin",
    "name": "EHentaiManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://ehentaimanga.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "EH"
  },
  {
    "id": "kotatsu_mangareader_en_elarcpage",
    "name": "ElarcPage",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://elarctoon.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "EL"
  },
  {
    "id": "kotatsu_tr_eldermanga",
    "name": "Elder Manga",
    "description": "Kotatsu parser catalog source (tr). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://eldermanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "EM"
  },
  {
    "id": "kotatsu_tr_eleceedturkiye",
    "name": "Eleceed Türkiye",
    "description": "Kotatsu parser catalog source (tr). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://eleceedturkiye.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ET"
  },
  {
    "id": "kotatsu_zeistmanga_pt_elevenscanlator",
    "name": "ElevenScanlator",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://elevenscanlator.blogspot.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "EL"
  },
  {
    "id": "kotatsu_madara_en_elitemanga",
    "name": "EliteManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://beinmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "EL"
  },
  {
    "id": "kotatsu_madara_es_emperorscan",
    "name": "EmperorScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://emperorscan.mundoalterno.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "EM"
  },
  {
    "id": "kotatsu_madara_en_huntersscanen",
    "name": "EnHuntersScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://en.huntersscan.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "EN"
  },
  {
    "id": "kotatsu_cupfox_fr_enlignemanga",
    "name": "EnLigneManga",
    "description": "Kotatsu parser catalog source (cupfox). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://enlignemanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "EN"
  },
  {
    "id": "kotatsu_mangareader_en_enryumanga",
    "name": "EnryuManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://enryumanga.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "EN"
  },
  {
    "id": "kotatsu_mangareader_en_enthunderscans",
    "name": "EnThunderScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://en-thunderscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "EN"
  },
  {
    "id": "kotatsu_zeistmanga_tr_epikman",
    "name": "EpikMan",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://epikman.ga",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "EP"
  },
  {
    "id": "kotatsu_madara_fr_epsilonscanparser",
    "name": "EpsilonScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://epsilonscan.to",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "EP"
  },
  {
    "id": "kotatsu_madara_fr_epsilonsoft",
    "name": "EpsilonSoft",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://epsilonsoft.to",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "EP"
  },
  {
    "id": "kotatsu_madara_all_ero18x",
    "name": "Ero18x",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://ero18x.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "ER"
  },
  {
    "id": "kotatsu_madara_all_eromanhwa",
    "name": "EroManhwa",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://eromanhwa.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ER"
  },
  {
    "id": "kotatsu_mangareader_en_erosscans",
    "name": "ErosScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://erosxscans.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ER"
  },
  {
    "id": "kotatsu_madara_tr_esomanga",
    "name": "EsoManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://esomanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ES"
  },
  {
    "id": "kotatsu_mangareader_fr_etheralradiance",
    "name": "EtheralRadiance",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://etheralradiance.eu",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ET"
  },
  {
    "id": "kotatsu_madara_pt_euphoriascan",
    "name": "EuphoriaScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://euphoriascan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "EU"
  },
  {
    "id": "kotatsu_madara_en_readerevilflowers",
    "name": "EvilFlowers",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://evilflowers.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "EV"
  },
  {
    "id": "kotatsu_mangareader_cz_evilmanga",
    "name": "EvilManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "cs",
    "baseUrl": "https://evil-manga.eu",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "EV"
  },
  {
    "id": "kotatsu_all_exhentaiparser",
    "name": "ExHentai",
    "description": "Kotatsu parser catalog source (all). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://e-hentai.org",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "EX"
  },
  {
    "id": "kotatsu_keyoapp_en_ezmanga",
    "name": "EzManga",
    "description": "Kotatsu parser catalog source (keyoapp). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://ezmanga.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "EZ"
  },
  {
    "id": "kotatsu_madara_en_factmanga",
    "name": "FactManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://factmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FA"
  },
  {
    "id": "kotatsu_madara_pt_fayscans",
    "name": "FayScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://fayscans.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FA"
  },
  {
    "id": "kotatsu_madara_pt_fbsquads",
    "name": "FbSquads",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://fbsquadx.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FB"
  },
  {
    "id": "kotatsu_madara_vi_fecomicc",
    "name": "Fecomic",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://mangasup.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FE"
  },
  {
    "id": "kotatsu_madara_pt_fenixproject",
    "name": "FenixProject",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://fenixproject.site",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FE"
  },
  {
    "id": "kotatsu_onemanga_fr_fireforce",
    "name": "FireForce",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://fireforce.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FI"
  },
  {
    "id": "kotatsu_madara_en_firescans",
    "name": "FireScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://firescans.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FI"
  },
  {
    "id": "kotatsu_madara_en_firstkissmanhua",
    "name": "FirstKissManhua",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://1stkissmanhua.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FI"
  },
  {
    "id": "kotatsu_mangareader_ar_flares",
    "name": "Fl-Ares",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://fl-ares.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FA"
  },
  {
    "id": "kotatsu_en_flamecomics",
    "name": "FlameComics",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://flamecomics.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FL"
  },
  {
    "id": "kotatsu_ar_flixscans",
    "name": "FlixScans.net",
    "description": "Kotatsu parser catalog source (ar). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://FlixScans.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FN"
  },
  {
    "id": "kotatsu_en_flixscansorg",
    "name": "FlixScans.org",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://FlixScans.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FO"
  },
  {
    "id": "kotatsu_madara_pt_flowermanga",
    "name": "FlowerManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://flowermanga.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FL"
  },
  {
    "id": "kotatsu_fmreader_fmreaderparser",
    "name": "Fmreader",
    "description": "Kotatsu parser catalog source (fmreader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FM"
  },
  {
    "id": "kotatsu_pizzareader_fr_fmteam",
    "name": "FmTeam",
    "description": "Kotatsu parser catalog source (pizzareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://fmteam.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FM"
  },
  {
    "id": "kotatsu_foolslide_foolslideparser",
    "name": "Fool Slide",
    "description": "Kotatsu parser catalog source (foolslide). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://yyyy.MM.dd",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FS"
  },
  {
    "id": "kotatsu_vi_truyengg",
    "name": "FoxTruyen",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://foxtruyen.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FO"
  },
  {
    "id": "kotatsu_madara_pt_foxwhite",
    "name": "FoxWhite",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://foxwhite.com.br",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FO"
  },
  {
    "id": "kotatsu_madara_fr_frscan",
    "name": "Fr-Scan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://fr-scan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FS"
  },
  {
    "id": "kotatsu_mangareader_pt_franxxmangas",
    "name": "FranxxMangas",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://franxxmangas.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FR"
  },
  {
    "id": "kotatsu_mangareader_en_freakcomic",
    "name": "FreakComic",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://freakcomic.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FR"
  },
  {
    "id": "kotatsu_mangareader_en_freakscans",
    "name": "FreakScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://freakscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FR"
  },
  {
    "id": "kotatsu_madara_en_freecomiconline",
    "name": "FreeComicOnline",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://freecomiconline.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FR"
  },
  {
    "id": "kotatsu_madara_en_freemanga",
    "name": "FreeManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://freemanga.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FR"
  },
  {
    "id": "kotatsu_madara_en_freemangatop",
    "name": "FreeMangaTop",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://freemangatop.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FR"
  },
  {
    "id": "kotatsu_madara_en_freewebtooncoins",
    "name": "FreeWebtoonCoins",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://freewebtooncoins.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FR"
  },
  {
    "id": "kotatsu_cupfox_fr_frmanga",
    "name": "FrManga",
    "description": "Kotatsu parser catalog source (cupfox). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://frmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FR"
  },
  {
    "id": "kotatsu_mmrcms_fr_frscanscom",
    "name": "FrScans.com",
    "description": "Kotatsu parser catalog source (mmrcms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://FrScans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FC"
  },
  {
    "id": "kotatsu_fr_furyosociety",
    "name": "FuryoSociety",
    "description": "Kotatsu parser catalog source (fr). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://furyosociety.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FU"
  },
  {
    "id": "kotatsu_mangareader_id_futari",
    "name": "Futari",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://futari.info",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FU"
  },
  {
    "id": "kotatsu_fuzzydoodle_fuzzydoodleparser",
    "name": "Fuzzy Doodle",
    "description": "Kotatsu parser catalog source (fuzzydoodle). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "FD"
  },
  {
    "id": "kotatsu_mangareader_tr_gafeland",
    "name": "Gafeland",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://gafeland.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GA"
  },
  {
    "id": "kotatsu_mangareader_tr_gaiatoon",
    "name": "GaiaToon",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://gaiatoon.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GA"
  },
  {
    "id": "kotatsu_zeistmanga_pt_galaxscans",
    "name": "GalaxScanlator",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://galaxscanlator.blogspot.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GA"
  },
  {
    "id": "kotatsu_madara_pt_galinhasamurai",
    "name": "GalinhaSamurai",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://galinhasamurai.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GA"
  },
  {
    "id": "kotatsu_gallery_galleryparser",
    "name": "Gallery",
    "description": "Kotatsu parser catalog source (gallery). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://nav.pagination",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GA"
  },
  {
    "id": "kotatsu_galleryadults_galleryadultsparser",
    "name": "Gallery Adults",
    "description": "Kotatsu parser catalog source (galleryadults). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://h1.title",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "GA"
  },
  {
    "id": "kotatsu_madara_tr_garciamanga",
    "name": "GarciaManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://garciamanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GA"
  },
  {
    "id": "kotatsu_madara_ar_gatemanga",
    "name": "GateManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://gatemanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GA"
  },
  {
    "id": "kotatsu_gattsu_gattsuparser",
    "name": "Gattsu",
    "description": "Kotatsu parser catalog source (gattsu). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GA"
  },
  {
    "id": "kotatsu_madara_en_gdscans",
    "name": "GdScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://gdscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GD"
  },
  {
    "id": "kotatsu_madara_en_gedecomix",
    "name": "GedeComix",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://gedecomix.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GE"
  },
  {
    "id": "kotatsu_madara_pt_gekkouscans",
    "name": "GekkouScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://gekkou.site",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GE"
  },
  {
    "id": "kotatsu_keyoapp_en_suryascans",
    "name": "GenzToon",
    "description": "Kotatsu parser catalog source (keyoapp). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://genzupdates.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GE"
  },
  {
    "id": "kotatsu_madara_tr_ghostfansub",
    "name": "GhostFansub",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://ghostfansub.co",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GH"
  },
  {
    "id": "kotatsu_madara_pt_ghostscan",
    "name": "GhostScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://ghostscan.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GH"
  },
  {
    "id": "kotatsu_zeistmanga_es_gistamishousefansub",
    "name": "GistamisHouseFansub",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://gistamishousefansub.blogspot.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GI"
  },
  {
    "id": "kotatsu_madara_tr_glorymanga",
    "name": "GloryManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://mangagezgini.site",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GL"
  },
  {
    "id": "kotatsu_mangareader_fr_lunarhentai",
    "name": "GloryScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://gloryscans.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GL"
  },
  {
    "id": "kotatsu_madara_ar_gmanga",
    "name": "Gmanga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://gmanga.site",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GM"
  },
  {
    "id": "kotatsu_vi_goctruyentranh",
    "name": "Góc Truyện Tranh",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://schema.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GC"
  },
  {
    "id": "kotatsu_vi_goctruyentranhvui",
    "name": "Góc Truyện Tranh Vui",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://goctruyentranhvui17.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GC"
  },
  {
    "id": "kotatsu_mangareader_tr_golgebahcesi",
    "name": "GolgeBahcesi",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://golgebahcesi.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GO"
  },
  {
    "id": "kotatsu_madara_en_goodgirls",
    "name": "GoodGirls",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://goodgirls.moe",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GO"
  },
  {
    "id": "kotatsu_madara_pt_gooffansub",
    "name": "GoofFansub",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://gooffansub.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GO"
  },
  {
    "id": "kotatsu_madara_en_gourmetscans",
    "name": "GourmetScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://gourmetsupremacy.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GO"
  },
  {
    "id": "kotatsu_madara_en_grabber",
    "name": "Grabber",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://grabber.zone",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GR"
  },
  {
    "id": "kotatsu_mangareader_es_gremorymangas",
    "name": "GremoryMangas",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://gremorymangas.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GR"
  },
  {
    "id": "kotatsu_madara_tr_grimelek",
    "name": "Grimelek",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://siyahmelek.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GR"
  },
  {
    "id": "kotatsu_ru_grouple_groupleparser",
    "name": "Grouple",
    "description": "Kotatsu parser catalog source (ru). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://3.grouple.co",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GR"
  },
  {
    "id": "kotatsu_pizzareader_it_gtothegreatsite",
    "name": "GtoTheGreatSite",
    "description": "Kotatsu parser catalog source (pizzareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "it",
    "baseUrl": "https://reader.gtothegreatsite.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GT"
  },
  {
    "id": "kotatsu_sinmh_zh_gufengmh",
    "name": "Gufengmh",
    "description": "Kotatsu parser catalog source (sinmh). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "zh",
    "baseUrl": "https://gufengmh.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GU"
  },
  {
    "id": "kotatsu_zeistmanga_pt_guildatierdraw",
    "name": "GuildaTierDraw",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://guildatierdraw.top",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GU"
  },
  {
    "id": "kotatsu_madara_tr_guncelmanga",
    "name": "GuncelManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://guncelmanga.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GU"
  },
  {
    "id": "kotatsu_guya_guyaparser",
    "name": "Guya",
    "description": "Kotatsu parser catalog source (guya). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GU"
  },
  {
    "id": "kotatsu_guya_en_guyacubari",
    "name": "GuyaCubari",
    "description": "Kotatsu parser catalog source (guya). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://guya.cubari.moe",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "GU"
  },
  {
    "id": "kotatsu_madara_fr_hhentaifr",
    "name": "H-Hentai",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://hhentai.fr",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HH"
  },
  {
    "id": "kotatsu_guya_en_hachirumi",
    "name": "Hachirumi",
    "description": "Kotatsu parser catalog source (guya). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://hachirumi.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HA"
  },
  {
    "id": "kotatsu_madara_es_hadesnofansub",
    "name": "HadesNoFansub",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://hadesnofansub.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HA"
  },
  {
    "id": "kotatsu_madara_ar_crowscans",
    "name": "Hadess",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://hadess.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HA"
  },
  {
    "id": "kotatsu_onemanga_fr_haikyuu",
    "name": "Haikyuu",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://haikyuu.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HA"
  },
  {
    "id": "kotatsu_wpcomics_vi_hamtruyen",
    "name": "Ham Truyện",
    "description": "Kotatsu parser catalog source (wpcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://hamtruyen1.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HT"
  },
  {
    "id": "kotatsu_vi_hangtruyen",
    "name": "Hang Truyện",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://hangtruyen.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HT"
  },
  {
    "id": "kotatsu_manga18_zh_hanman18",
    "name": "Hanman18",
    "description": "Kotatsu parser catalog source (manga18). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "zh",
    "baseUrl": "https://hanman18.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HA"
  },
  {
    "id": "kotatsu_madara_es_haremscann",
    "name": "HaremScann",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://haremscann.es",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HA"
  },
  {
    "id": "kotatsu_madara_en_harimanga",
    "name": "HariManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://harimanga.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HA"
  },
  {
    "id": "kotatsu_madara_fr_harmonyscan",
    "name": "HarmonyScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://harmony-scan.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HA"
  },
  {
    "id": "kotatsu_pizzareader_it_hastateam",
    "name": "HastaTeamDdt",
    "description": "Kotatsu parser catalog source (pizzareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "it",
    "baseUrl": "https://ddt.hastateam.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HA"
  },
  {
    "id": "kotatsu_pizzareader_it_hastateamreader",
    "name": "HastaTeamReader",
    "description": "Kotatsu parser catalog source (pizzareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "it",
    "baseUrl": "https://reader.hastateam.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HA"
  },
  {
    "id": "kotatsu_madara_tr_hayalistic",
    "name": "Hayalistic",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://hayalistic.com.tr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HA"
  },
  {
    "id": "kotatsu_heancms_heancms",
    "name": "Hean Cms",
    "description": "Kotatsu parser catalog source (heancms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HC"
  },
  {
    "id": "kotatsu_heancmsalt_heancmsalt",
    "name": "Hean Cms Alt",
    "description": "Kotatsu parser catalog source (heancmsalt). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HC"
  },
  {
    "id": "kotatsu_zeistmanga_pt_heckscans",
    "name": "HeckScans",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://heckscans.blogspot.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_onemanga_fr_hellsparadisescan",
    "name": "HellsParadiseScan",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://hellsparadisescan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_zmanga_id_hensekai",
    "name": "Hensekai",
    "description": "Kotatsu parser catalog source (zmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://hensekai.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_madara_en_hentaixcomic",
    "name": "Hentai x Comic",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://hentaixcomic.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HX"
  },
  {
    "id": "kotatsu_madara_en_hentaixdickgirl",
    "name": "Hentai x Dickgirl",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://hentaixdickgirl.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HX"
  },
  {
    "id": "kotatsu_madara_fr_hentaiscantradvf",
    "name": "Hentai-Scantrad",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://hentai.scantrad-vf.cc",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HS"
  },
  {
    "id": "kotatsu_vi_hentai18vn",
    "name": "Hentai18VN",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://hentai18vn.top",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_mangareader_en_hentai20",
    "name": "Hentai20",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://hentai20.io",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_madara_en_hentai3z",
    "name": "Hentai3z",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manga18h.xyz",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_manga18_en_hentai3zcc",
    "name": "Hentai3z.cc",
    "description": "Kotatsu parser catalog source (manga18). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://Hentai3z.cc",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HC"
  },
  {
    "id": "kotatsu_madara_en_hentai4free",
    "name": "Hentai4Free",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://hentai4free.net",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_id_hentaicrot",
    "name": "HentaiCrot",
    "description": "Kotatsu parser catalog source (id). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://hentaicrot.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_galleryadults_all_hentaienvy",
    "name": "HentaiEnvy",
    "description": "Kotatsu parser catalog source (galleryadults). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://hentaienvy.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_galleryadults_all_hentaiera",
    "name": "HentaiEra",
    "description": "Kotatsu parser catalog source (galleryadults). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://hentaiera.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_galleryadults_all_hentaiforce",
    "name": "HentaiForce",
    "description": "Kotatsu parser catalog source (galleryadults). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://hentaiforce.net",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_galleryadults_all_hentaifox",
    "name": "HentaiFox",
    "description": "Kotatsu parser catalog source (galleryadults). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://hentaifox.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_ru_rulib_hentailibparser",
    "name": "HentaiLib",
    "description": "Kotatsu parser catalog source (ru). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://v1.hentailib.org",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_madara_en_hentaimanga",
    "name": "HentaiManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://hentaimanga.me",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_galleryadults_en_hentainexus",
    "name": "HentaiNexus",
    "description": "Kotatsu parser catalog source (galleryadults). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://hentainexus.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_madara_fr_hentaiorigines",
    "name": "HentaiOrigines",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://hentai-origines.fr",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_galleryadults_en_hentairead",
    "name": "HentaiRead",
    "description": "Kotatsu parser catalog source (galleryadults). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://hencover.xyz",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_mangareader_es_hentaireader",
    "name": "HentaiReader",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://hentaireader.org",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_galleryadults_all_hentairox",
    "name": "HentaiRox",
    "description": "Kotatsu parser catalog source (galleryadults). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://hentairox.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_gattsu_pt_hentaiseason",
    "name": "HentaiSeason",
    "description": "Kotatsu parser catalog source (gattsu). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://hentaiseason.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_fuzzydoodle_ar_hentaislayer",
    "name": "HentaiSlayer",
    "description": "Kotatsu parser catalog source (fuzzydoodle). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://hentaislayer.net",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_madara_pt_hentaiteca",
    "name": "Hentaiteca",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://hentaiteca.net",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_gattsu_pt_hentaitokyo",
    "name": "HentaiTokyo",
    "description": "Kotatsu parser catalog source (gattsu). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://hentaitokyo.net",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_uk_hentaiukrparser",
    "name": "HentaiUkr",
    "description": "Kotatsu parser catalog source (uk). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "uk",
    "baseUrl": "https://hentaiukr.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_vi_hentaivnparser",
    "name": "HentaiVN",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://hentaihvn.tv",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_vi_hentaivnbuzz",
    "name": "HentaiVn.buzz",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://HentaiVn.buzz",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HB"
  },
  {
    "id": "kotatsu_madara_vi_hentaivnplus",
    "name": "HentaiVN.plus",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://hentaivn.party",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HP"
  },
  {
    "id": "kotatsu_vi_hentaivnsu",
    "name": "HentaiVN.su",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://hentaivn.su",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HS"
  },
  {
    "id": "kotatsu_madara_en_hentaiwebtoon",
    "name": "HentaiWebtoon",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://hentaiwebtoon.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_madara_en_hentaixyuri",
    "name": "HentaiXYuri",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://hentaixyuri.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_madara_vi_hentaiz",
    "name": "HentaiZ",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://hentaiz.news",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_madara_fr_hentaizone",
    "name": "HentaiZone",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://hentaizone.xyz",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_en_hentalk",
    "name": "Hentalk",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://$domain",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_ar_hentaman",
    "name": "Hentaman",
    "description": "Kotatsu parser catalog source (ar). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://hentaman.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_madara_es_herenscan",
    "name": "HerenScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://herenscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_en_heytoonparser",
    "name": "HeyToon",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://heytoon.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HE"
  },
  {
    "id": "kotatsu_zeistmanga_ar_hijala",
    "name": "Hijala",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://hijala.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HI"
  },
  {
    "id": "kotatsu_mangareader_ar_hijalacom",
    "name": "Hijalacom",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://hijala.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HI"
  },
  {
    "id": "kotatsu_madara_pt_hikariscan",
    "name": "HikariScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://hikariscan.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HI"
  },
  {
    "id": "kotatsu_madara_pt_hipercool",
    "name": "Hipercool",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://hiper.cool",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HI"
  },
  {
    "id": "kotatsu_madara_en_hiperdex",
    "name": "HiperToon",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://hiperdex.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HI"
  },
  {
    "id": "kotatsu_all_hitomilaparser",
    "name": "Hitomi.La",
    "description": "Kotatsu parser catalog source (all). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://Hitomi.La",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HL"
  },
  {
    "id": "kotatsu_iken_en_hivecomic",
    "name": "HiveComic",
    "description": "Kotatsu parser catalog source (iken). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://hivetoons.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HI"
  },
  {
    "id": "kotatsu_mangareader_en_voidscans",
    "name": "HiveToon",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://hivetoon.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HI"
  },
  {
    "id": "kotatsu_pizzareader_fr_hniscantrad",
    "name": "HniScantrad",
    "description": "Kotatsu parser catalog source (pizzareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://hni-scantrad.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HN"
  },
  {
    "id": "kotatsu_madara_tr_hoifansub",
    "name": "HoiFansub",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://hoifansub.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HO"
  },
  {
    "id": "kotatsu_all_holoearthparser",
    "name": "HoloEarth",
    "description": "Kotatsu parser catalog source (all). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://holoearth.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HO"
  },
  {
    "id": "kotatsu_uk_honeymangaparser",
    "name": "HoneyManga",
    "description": "Kotatsu parser catalog source (uk). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "uk",
    "baseUrl": "https://hmvolumestorage.b-cdn.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HO"
  },
  {
    "id": "kotatsu_hotcomics_hotcomicsparser",
    "name": "Hot Comics",
    "description": "Kotatsu parser catalog source (hotcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HC"
  },
  {
    "id": "kotatsu_hotcomics_en_hotcomics",
    "name": "HotComics",
    "description": "Kotatsu parser catalog source (hotcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HO"
  },
  {
    "id": "kotatsu_madara_es_housemangas",
    "name": "HouseMangas",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://visormanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HO"
  },
  {
    "id": "kotatsu_madara_es_houseofotakus",
    "name": "HouseOfOtakus",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://houseofotakus.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HO"
  },
  {
    "id": "kotatsu_madara_en_hunlight",
    "name": "HunLight",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://hunlight.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HU"
  },
  {
    "id": "kotatsu_madara_pt_huntersscan",
    "name": "HuntersScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://readhunters.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HU"
  },
  {
    "id": "kotatsu_onemanga_fr_hunterxhunterscan",
    "name": "HunterXHunterScan",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://hunterxhunterscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HU"
  },
  {
    "id": "kotatsu_madara_id_hwago",
    "name": "Hwago",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://hwago01.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "HW"
  },
  {
    "id": "kotatsu_zeistmanga_id_ichiromanga",
    "name": "IchiroManga",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://ichiromanga.my.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "IC"
  },
  {
    "id": "kotatsu_iken_ikenparser",
    "name": "Iken",
    "description": "Kotatsu parser catalog source (iken). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "IK"
  },
  {
    "id": "kotatsu_id_ikiru",
    "name": "Ikiru",
    "description": "Kotatsu parser catalog source (id). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://01.ikiru.wtf",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "IK"
  },
  {
    "id": "kotatsu_madara_pt_illusionscan",
    "name": "IllusionScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://illusionscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "IL"
  },
  {
    "id": "kotatsu_all_imhentai",
    "name": "ImHentai",
    "description": "Kotatsu parser catalog source (all). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://imhentai.xxx",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "IM"
  },
  {
    "id": "kotatsu_madara_en_immortalupdates",
    "name": "ImmortalUpdates",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://immortalupdates.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "IM"
  },
  {
    "id": "kotatsu_madara_tr_imparatormanga",
    "name": "ImparatorManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://imparatormanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "IM"
  },
  {
    "id": "kotatsu_madara_pt_imperiodabritannia",
    "name": "ImperioDaBritannia",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://imperiodabritannia.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "IM"
  },
  {
    "id": "kotatsu_madara_pt_imperioscans",
    "name": "ImperioScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://imperioscans.com.br",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "IM"
  },
  {
    "id": "kotatsu_mangareader_es_inarimanga",
    "name": "InariManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://clubinari.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "IN"
  },
  {
    "id": "kotatsu_mangareader_es_inaripikav",
    "name": "InariPikav",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://clubinari.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "IN"
  },
  {
    "id": "kotatsu_madara_id_indo18h",
    "name": "Indo18h",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://indo18h.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "IN"
  },
  {
    "id": "kotatsu_madara_en_infamousscans",
    "name": "InfamousScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://infamous-scans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "IN"
  },
  {
    "id": "kotatsu_madara_es_infrafandub",
    "name": "InfraFandub",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://infrafandub.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "IN"
  },
  {
    "id": "kotatsu_madara_en_murimscan",
    "name": "InkReads",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://inkreads.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "IN"
  },
  {
    "id": "kotatsu_es_inmangaparser",
    "name": "InManga",
    "description": "Kotatsu parser catalog source (es). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://pack-yak.intomanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "IN"
  },
  {
    "id": "kotatsu_madara_es_inmoralnofansub",
    "name": "InmoralNoFansub",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://inmoralnofansub.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "IN"
  },
  {
    "id": "kotatsu_madara_es_mangamundodrama",
    "name": "InmortalScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://scaninmortal.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "IN"
  },
  {
    "id": "kotatsu_fr_inovascanmanga",
    "name": "InovaScanManga",
    "description": "Kotatsu parser catalog source (fr). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://inovascanmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "IN"
  },
  {
    "id": "kotatsu_madara_en_instamanhwa",
    "name": "InstaManhwa",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhwaden.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "IN"
  },
  {
    "id": "kotatsu_mangareader_th_inumanga",
    "name": "InuManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://inu-manga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "IN"
  },
  {
    "id": "kotatsu_mangareader_pt_irisscanlator",
    "name": "IrisScanlator",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://irisscanlator.com.br",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "IR"
  },
  {
    "id": "kotatsu_madara_en_isekaiscan",
    "name": "IsekaiScan.top",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://isekaiscan.top",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "IT"
  },
  {
    "id": "kotatsu_madara_en_itsyourightmanhua",
    "name": "ItsYouRightManhua",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://itsyourightmanhua.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "IT"
  },
  {
    "id": "kotatsu_mangareader_id_izanamiscans",
    "name": "IzanamiScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://izanamiscans.my.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "IZ"
  },
  {
    "id": "kotatsu_mangareader_fr_japscansfr",
    "name": "JapScans.fr",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://japscans.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "JF"
  },
  {
    "id": "kotatsu_madara_tr_jellyring",
    "name": "Jellyring",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://jellyring.co",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "JE"
  },
  {
    "id": "kotatsu_madara_tr_jiangzaitoon",
    "name": "JiangzaiToon",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://jiangzaitoon.top",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "JI"
  },
  {
    "id": "kotatsu_mmrcms_fr_jpmangas",
    "name": "JpMangas",
    "description": "Kotatsu parser catalog source (mmrcms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://jpmangas.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "JP"
  },
  {
    "id": "kotatsu_madara_tr_kabusmanga",
    "name": "KabusManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://kabusmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KA"
  },
  {
    "id": "kotatsu_onemanga_fr_kaijuno8",
    "name": "KaijuNo8",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://kaijuno8.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KA"
  },
  {
    "id": "kotatsu_mangareader_en_kaiscans",
    "name": "KaiScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://luascans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KA"
  },
  {
    "id": "kotatsu_madara_pt_kakuseiproject",
    "name": "KakuseiProject",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://kakuseiproject.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KA"
  },
  {
    "id": "kotatsu_madara_pt_kalango",
    "name": "Kalango",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://kalango.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KA"
  },
  {
    "id": "kotatsu_madtheme_en_manhuascan",
    "name": "kaliscan.io",
    "description": "Kotatsu parser catalog source (madtheme). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://kaliscan.io",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KI"
  },
  {
    "id": "kotatsu_mangareader_id_kanzenin",
    "name": "Kanzenin",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://kanzenin.info",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KA"
  },
  {
    "id": "kotatsu_mangareader_id_katakomik",
    "name": "KataKomik",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://katakomik.my.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KA"
  },
  {
    "id": "kotatsu_en_kdtscans",
    "name": "KdtScans",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://silentquill.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KD"
  },
  {
    "id": "kotatsu_madara_tr_kedi",
    "name": "Kedi",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://kedi.to",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KE"
  },
  {
    "id": "kotatsu_madara_es_kenhuav2scan",
    "name": "Kenhuav2Scan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://kenhuav2scan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KE"
  },
  {
    "id": "kotatsu_keyoapp_en_raiscans",
    "name": "KenScans",
    "description": "Kotatsu parser catalog source (keyoapp). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://kenscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KE"
  },
  {
    "id": "kotatsu_keyoapp_en_kewnscans",
    "name": "KewnScans",
    "description": "Kotatsu parser catalog source (keyoapp). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://kewnscans.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KE"
  },
  {
    "id": "kotatsu_keyoapp_keyoappparser",
    "name": "Keyoapp",
    "description": "Kotatsu parser catalog source (keyoapp). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://span.truncate",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KE"
  },
  {
    "id": "kotatsu_madara_en_kiara18",
    "name": "Kiara18",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://18.kiara.cool",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "KI"
  },
  {
    "id": "kotatsu_onemanga_fr_kingdomscan",
    "name": "KingdomScan",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://kingdomscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KI"
  },
  {
    "id": "kotatsu_mangareader_en_furymanga",
    "name": "KingOfScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://myshojo.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KI"
  },
  {
    "id": "kotatsu_mangareader_id_kiryuuparser",
    "name": "Kiryuu",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://kiryuu02.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KI"
  },
  {
    "id": "kotatsu_zeistmanga_id_kishisan",
    "name": "Kishisan",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://kishisan.site",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KI"
  },
  {
    "id": "kotatsu_madara_en_kissmanga",
    "name": "KissManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://kissmanga.in",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KI"
  },
  {
    "id": "kotatsu_gallery_all_kiutaku",
    "name": "Kiutaku",
    "description": "Kotatsu parser catalog source (gallery). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://kiutaku.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KI"
  },
  {
    "id": "kotatsu_madara_id_klikmanga",
    "name": "KlikManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://klikmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KL"
  },
  {
    "id": "kotatsu_zeistmanga_id_klmanhua",
    "name": "KlManhua",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://klmanhua.blogspot.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KL"
  },
  {
    "id": "kotatsu_fmreader_ja_klz9",
    "name": "Klz9",
    "description": "Kotatsu parser catalog source (fmreader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ja",
    "baseUrl": "https://klz9.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KL"
  },
  {
    "id": "kotatsu_mangareader_id_kofiscans",
    "name": "KofiScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://isekaikomik.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_madara_es_koinoboriscan",
    "name": "KoinoboriScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://visorkoi.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_mangareader_id_kombatch",
    "name": "KomBatch",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://kombatch.cc",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_zh_komiicparser",
    "name": "Komiic",
    "description": "Kotatsu parser catalog source (zh). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "zh",
    "baseUrl": "https://komiic.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_mangareader_id_komikavparser",
    "name": "KomikAv",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://komikav.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_mangareader_id_manhwaindoicu",
    "name": "KomikCinta",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://komikdewasa.art",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_mangareader_id_komikdewasa",
    "name": "KomikDewasa.Online",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://komikdewasa.art",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_zeistmanga_id_komikges",
    "name": "KomikGes",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://komikges.my.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_mangareader_id_komikgo",
    "name": "KomikGo",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://komikgo.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_mmrcms_id_komikid",
    "name": "KomikId",
    "description": "Kotatsu parser catalog source (mmrcms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://komiku.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_mangareader_id_komikindoparser",
    "name": "KomikIndo",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://komiksin.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_zmanga_id_komikindoinfo",
    "name": "KomikIndo.info",
    "description": "Kotatsu parser catalog source (zmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://KomikIndo.info",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KI"
  },
  {
    "id": "kotatsu_mangareader_id_komikindo",
    "name": "KomikIndo.org",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://komikindo.ch",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_mangareader_en_komiklabparser",
    "name": "KomikLab",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://komiklab.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_mangareader_id_komiklokalparser",
    "name": "KomikLokal",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://komikmu.top",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_mangareader_id_komiklokalcfd",
    "name": "KomikLokal.mom",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://komikmu.icu",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KM"
  },
  {
    "id": "kotatsu_mangareader_id_komiklovers",
    "name": "KomikLovers",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://komiklovers.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_mangareader_id_komikmama",
    "name": "KomikMama",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://komikmama.lat",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_mangareader_id_komikpix",
    "name": "KomikPix",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://komikpix.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_mangareader_id_komikpoi",
    "name": "KomikPoi",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://komikpoi.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_zeistmanga_id_komikrealm",
    "name": "KomikRealm",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://komikrealm.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_mangareader_id_komikdewasaparser",
    "name": "komikRemaja.icu",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://komikremaja.icu",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KI"
  },
  {
    "id": "kotatsu_mangareader_id_komiksan",
    "name": "KomikSan",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://komiksan.link",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_mangareader_id_komiksay",
    "name": "KomikSay",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://komiksay.info",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_mangareader_id_komikstation",
    "name": "KomikStation",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://komikstation.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_mangareader_id_komiktapparser",
    "name": "KomikTap",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://komiktap.info",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_animebootstrap_id_komikzoid",
    "name": "KomikzoId",
    "description": "Kotatsu parser catalog source (animebootstrap). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://komikzoid.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_madara_tr_koreliscans",
    "name": "KoreliScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://koreliscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KO"
  },
  {
    "id": "kotatsu_madara_en_ksgroupscans",
    "name": "KsGroupScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://ksgroupscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KS"
  },
  {
    "id": "kotatsu_id_kumapage",
    "name": "Kumapage",
    "description": "Kotatsu parser catalog source (id). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://kumapage.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KU"
  },
  {
    "id": "kotatsu_madara_en_kunmanga",
    "name": "KunManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://kunmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KU"
  },
  {
    "id": "kotatsu_vi_kuroneko",
    "name": "Kuro Neko / vi-Hentai",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://vi-hentai.moe",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "KN"
  },
  {
    "id": "kotatsu_madara_tr_kuroimanga",
    "name": "KuroiManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://kuroimanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KU"
  },
  {
    "id": "kotatsu_mangareader_id_kyumik",
    "name": "Kyumik",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://kyumik.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "KY"
  },
  {
    "id": "kotatsu_madara_pt_ladyestelarscan",
    "name": "LadyEstelarScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://ladyestelarscan.com.br",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LA"
  },
  {
    "id": "kotatsu_keyoapp_en_laidbackscans",
    "name": "LaidBackScans",
    "description": "Kotatsu parser catalog source (keyoapp). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://laidbackscans.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LA"
  },
  {
    "id": "kotatsu_mangareader_th_lamimanga",
    "name": "LamiManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://mangalami.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LA"
  },
  {
    "id": "kotatsu_vi_langgeekparser",
    "name": "Làng Geek",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://langgeek.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LN"
  },
  {
    "id": "kotatsu_madara_tr_laviniafansub",
    "name": "LaviniaFansub",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://laviniafansub.site",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LA"
  },
  {
    "id": "kotatsu_madara_es_jeaztwobluescans",
    "name": "Lector HUB",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://lectorhub.j5z.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LH"
  },
  {
    "id": "kotatsu_madara_es_knightnoscanlation",
    "name": "Lector KNS",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://lectorknight.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LK"
  },
  {
    "id": "kotatsu_mangareader_es_lectorhentai",
    "name": "LectorHentai",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://lectorhentai.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "LE"
  },
  {
    "id": "kotatsu_madara_es_lectormanga",
    "name": "LectorManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://lectormangaa.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LE"
  },
  {
    "id": "kotatsu_mangareader_es_miauscan",
    "name": "LectorMiau",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://leemiau.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LE"
  },
  {
    "id": "kotatsu_madara_es_lectorunitoon",
    "name": "LectoruniToon",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://lectorunitoon.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LE"
  },
  {
    "id": "kotatsu_madara_es_lectorunm",
    "name": "Lectorunm.life",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://lectorunm.life",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LL"
  },
  {
    "id": "kotatsu_fr_legacyscansparser",
    "name": "LegacyScans",
    "description": "Kotatsu parser catalog source (fr). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://legacy-scans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LE"
  },
  {
    "id": "kotatsu_madara_es_legendscanlations",
    "name": "LegendScanlations",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://escaneodeleyendas.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LE"
  },
  {
    "id": "kotatsu_madara_pt_leitordemanga",
    "name": "LeitorDeManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://leitordemanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LE"
  },
  {
    "id": "kotatsu_madara_pt_leitorkamisama",
    "name": "LeitorKamisama",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://leitor.kamisama.com.br",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LE"
  },
  {
    "id": "kotatsu_madara_ar_lekmanga",
    "name": "LekManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://lekmanga.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LE"
  },
  {
    "id": "kotatsu_madara_ar_lekmangaorg",
    "name": "LekManga.org",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://lekmanga.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LO"
  },
  {
    "id": "kotatsu_madara_ar_lekmangacom",
    "name": "LekMangaCom",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://lekmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LE"
  },
  {
    "id": "kotatsu_mangareader_fr_lelmanga",
    "name": "LelManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://lelmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LE"
  },
  {
    "id": "kotatsu_fuzzydoodle_fr_lelscanvf",
    "name": "LelScanFr",
    "description": "Kotatsu parser catalog source (fuzzydoodle). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://lelscanfr.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LE"
  },
  {
    "id": "kotatsu_zeistmanga_id_lepoytl",
    "name": "Lepoytl",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://lepoytl.cloud",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LE"
  },
  {
    "id": "kotatsu_zeistmanga_pt_ler999",
    "name": "Ler999",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://ler999.blogspot.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LE"
  },
  {
    "id": "kotatsu_madara_pt_lerhentai",
    "name": "LerHentai",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://lerhentai.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "LE"
  },
  {
    "id": "kotatsu_pt_lermanga",
    "name": "LerManga",
    "description": "Kotatsu parser catalog source (pt). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://lermanga.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LE"
  },
  {
    "id": "kotatsu_pt_lermangaonline",
    "name": "LerMangaOnline",
    "description": "Kotatsu parser catalog source (pt). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://lermangaonline.com.br",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LE"
  },
  {
    "id": "kotatsu_madara_pt_lermangas",
    "name": "Lermangas",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://lermangas.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LE"
  },
  {
    "id": "kotatsu_madara_pt_leryaoi",
    "name": "LerYaoi",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://leryaoi.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "LE"
  },
  {
    "id": "kotatsu_madara_en_lhtranslation",
    "name": "LhTranslation",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://lhtranslation.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LH"
  },
  {
    "id": "kotatsu_mangareader_id_lianscans",
    "name": "LianScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://lianscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LI"
  },
  {
    "id": "kotatsu_ru_rulib_libsocialparser",
    "name": "Lib Social",
    "description": "Kotatsu parser catalog source (ru). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://api.cdnlibs.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LS"
  },
  {
    "id": "kotatsu_madara_pt_lichmangas",
    "name": "LichMangas",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://lichmangas.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LI"
  },
  {
    "id": "kotatsu_madara_tr_lichsubs",
    "name": "LichSubs",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://kuroimanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LI"
  },
  {
    "id": "kotatsu_likemanga_likemangaparser",
    "name": "Like Manga",
    "description": "Kotatsu parser catalog source (likemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LM"
  },
  {
    "id": "kotatsu_madara_ar_likemanganet",
    "name": "Like-Manga.net",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://like-manga.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LM"
  },
  {
    "id": "kotatsu_likemanga_en_likemanga",
    "name": "LikeManga",
    "description": "Kotatsu parser catalog source (likemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://likemanga.ink",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LI"
  },
  {
    "id": "kotatsu_madara_en_likemangain",
    "name": "LikeManga.in",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://likemanga.in",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LI"
  },
  {
    "id": "kotatsu_liliana_lilianaparser",
    "name": "Liliana",
    "description": "Kotatsu parser catalog source (liliana). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LI"
  },
  {
    "id": "kotatsu_madara_en_lilymanga",
    "name": "LilyManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://lilymanga.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LI"
  },
  {
    "id": "kotatsu_madara_tr_lilyumfansub",
    "name": "LilyumFansub",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://lilyumfansub.com.tr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LI"
  },
  {
    "id": "kotatsu_madara_pt_limboscan",
    "name": "LimboScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://limboscan.com.br",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LI"
  },
  {
    "id": "kotatsu_madara_pt_limitedtimepoject",
    "name": "LimitedTimePoject",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://limitedtimeproject.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LI"
  },
  {
    "id": "kotatsu_all_linewebtoonsparser",
    "name": "LineWebtoons English",
    "description": "Kotatsu parser catalog source (all). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://webtoons.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LE"
  },
  {
    "id": "kotatsu_madara_ar_mangalinknet",
    "name": "Link-Manga.com",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://link-manga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LM"
  },
  {
    "id": "kotatsu_madara_pt_linkstartscan",
    "name": "LinkStartScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://linkstartscan.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LI"
  },
  {
    "id": "kotatsu_fr_lirescan",
    "name": "LireScan",
    "description": "Kotatsu parser catalog source (fr). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://lire-scan.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LI"
  },
  {
    "id": "kotatsu_mmrcms_fr_jpscanvf",
    "name": "LireScanVf.com",
    "description": "Kotatsu parser catalog source (mmrcms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://LireScanVf.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LC"
  },
  {
    "id": "kotatsu_madara_es_lkscanlation",
    "name": "LkScanlation",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://lkscanlation.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LK"
  },
  {
    "id": "kotatsu_madara_es_lmtos",
    "name": "Lmtos",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://lmtos.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LM"
  },
  {
    "id": "kotatsu_madara_en_loliconmobi",
    "name": "LoliconMobi",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://lolicon.mobi",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LO"
  },
  {
    "id": "kotatsu_zeistmanga_ar_lonertl",
    "name": "LonerTranslations",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://loner-tl.blogspot.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LO"
  },
  {
    "id": "kotatsu_madara_en_leviatanscans",
    "name": "LsComic",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://lscomic.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LS"
  },
  {
    "id": "kotatsu_mangareader_en_luacomiccom",
    "name": "luaComic.com",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://luascans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LC"
  },
  {
    "id": "kotatsu_keyoapp_en_luascans",
    "name": "luaComic.net",
    "description": "Kotatsu parser catalog source (keyoapp). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://luaComic.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LN"
  },
  {
    "id": "kotatsu_madara_en_luffymanga",
    "name": "LuffyManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://luffymanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LU"
  },
  {
    "id": "kotatsu_fr_lugnicascans",
    "name": "LugnicaScans",
    "description": "Kotatsu parser catalog source (fr). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://lugnica-scans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LU"
  },
  {
    "id": "kotatsu_madara_id_lumoskomik",
    "name": "LumosKomik",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://lumos01.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LU"
  },
  {
    "id": "kotatsu_madara_pt_lunarscan",
    "name": "LunarrScan.com",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://lunarrscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LC"
  },
  {
    "id": "kotatsu_mangareader_en_lunarscan",
    "name": "LunarScan.org",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://lunarscan.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LO"
  },
  {
    "id": "kotatsu_mangareader_fr_lunarscans",
    "name": "LunarScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://lunarscans.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LU"
  },
  {
    "id": "kotatsu_madara_tr_lunascans",
    "name": "LunaScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://tuhafscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LU"
  },
  {
    "id": "kotatsu_pizzareader_it_lupiteam",
    "name": "LupiTeam",
    "description": "Kotatsu parser catalog source (pizzareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "it",
    "baseUrl": "https://lupiteam.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LU"
  },
  {
    "id": "kotatsu_pt_luratoonscansparser",
    "name": "LuratoonScan",
    "description": "Kotatsu parser catalog source (pt). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://luratoons.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LU"
  },
  {
    "id": "kotatsu_madara_en_luxmanga",
    "name": "LuxManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://luxmanga.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LU"
  },
  {
    "id": "kotatsu_vi_lxmanga",
    "name": "LXManga",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://lxmanga.my",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "LX"
  },
  {
    "id": "kotatsu_madara_madaraparser",
    "name": "Madara",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_madaradex",
    "name": "MadaraDex",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://madaradex.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madtheme_madthemeparser",
    "name": "Madtheme",
    "description": "Kotatsu parser catalog source (madtheme). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://div.meta",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_th_mafiamanga",
    "name": "MafiaManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://mafia-manga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_zeistmanga_id_magerin",
    "name": "Magerin",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://magerin.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_iken_en_magustoon",
    "name": "MagusToon",
    "description": "Kotatsu parser catalog source (iken). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://magustoon.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_guya_all_mahoushoujobu",
    "name": "MahouShoujobu",
    "description": "Kotatsu parser catalog source (guya). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://mahoushoujobu.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_zmanga_id_maidid",
    "name": "MaidId",
    "description": "Kotatsu parser catalog source (zmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://maid.my.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_pt_maidscan",
    "name": "MaidScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://novo.empreguetes.site",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_pt_maidsecret",
    "name": "MaidSecret",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://maidsecret.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_th_makimaaaaa",
    "name": "Makimaaaaa",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://makimaaaaa.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangadventure_mangadventureparser",
    "name": "Mang Adventure",
    "description": "Kotatsu parser catalog source (mangadventure). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_mangareaderparser",
    "name": "Manga Reader",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://div.tt",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MR"
  },
  {
    "id": "kotatsu_mangaworld_mangaworldparser",
    "name": "Manga World",
    "description": "Kotatsu parser catalog source (mangaworld). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MW"
  },
  {
    "id": "kotatsu_madara_ar_mangaleko",
    "name": "Manga-Leko.org",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://manga-leko.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ML"
  },
  {
    "id": "kotatsu_madara_ar_mangalionz",
    "name": "Manga-Lionz",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://manga-lionz.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ML"
  },
  {
    "id": "kotatsu_madara_ar_mangaspark",
    "name": "Manga-Spark",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://manga-spark.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MS"
  },
  {
    "id": "kotatsu_madara_ar_mangastarz",
    "name": "Manga-Starz",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://manga-starz.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MS"
  },
  {
    "id": "kotatsu_uk_mangainuaparser",
    "name": "MANGA/in/UA",
    "description": "Kotatsu parser catalog source (uk). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "uk",
    "baseUrl": "https://manga.in.ua",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MI"
  },
  {
    "id": "kotatsu_madara_en_manga1001",
    "name": "Manga1001",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manga-1001.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_th_manga168",
    "name": "Manga168",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://manga168.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_manga18_manga18parser",
    "name": "Manga18",
    "description": "Kotatsu parser catalog source (manga18). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_manga18_en_manga18",
    "name": "Manga18",
    "description": "Kotatsu parser catalog source (manga18). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manga18.club",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manga18xyz",
    "name": "Manga18.xyz",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manga18.xyz",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "MX"
  },
  {
    "id": "kotatsu_madara_all_manga18fx",
    "name": "Manga18Fx",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://manga18fx.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manga18h",
    "name": "Manga18h",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manga18h.xyz",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manga18x",
    "name": "Manga18x",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manga18x.net",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manga1k",
    "name": "Manga1k",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manga1k.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manga1st",
    "name": "Manga1st",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manga1st.online",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_nepnep_en_manga4life",
    "name": "Manga4Life",
    "description": "Kotatsu parser catalog source (nepnep). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manga4life.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manga68",
    "name": "Manga68",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manga68.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_th_manga689",
    "name": "Manga689",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://manga689.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangaaction",
    "name": "MangaAction",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangaaction.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_zeistmanga_ar_mangaailand",
    "name": "MangaAiLand",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://manga-ai-land.blogspot.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_ar_mangarbic",
    "name": "MangaArabic",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://lekmanga.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_ar_mangaatrend",
    "name": "MangaAtrend",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://mangaatrend.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_tr_mangaay",
    "name": "MangaAy",
    "description": "Kotatsu parser catalog source (tr). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://manga-ay.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangabox_en_mangabat",
    "name": "MangaBat",
    "description": "Kotatsu parser catalog source (mangabox). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangabats.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangabee",
    "name": "MangaBee",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangazin.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangabob",
    "name": "MangaBob",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangabob.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangabox_mangaboxparser",
    "name": "Mangabox",
    "description": "Kotatsu parser catalog source (mangabox). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_scan_pt_mangabr",
    "name": "MangaBr",
    "description": "Kotatsu parser catalog source (scan). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://mangabr.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madtheme_en_mangabuddy",
    "name": "MangaBuddy",
    "description": "Kotatsu parser catalog source (madtheme). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangabuddy.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_tr_mangacim",
    "name": "Mangacim",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://mangacim.com.tr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_tr_mangacix",
    "name": "Mangacix",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://mangacix.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_es_mangacrab",
    "name": "MangaCrab",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://mangacrab.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_all_mangacrazy",
    "name": "MangaCrazy",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://mangacrazy.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangacultivator",
    "name": "MangaCultivator",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangacultivator.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madtheme_en_mangacute",
    "name": "MangaCute",
    "description": "Kotatsu parser catalog source (madtheme). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangacute.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangadass",
    "name": "MangaDass",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangadass.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_th_mangadeemak",
    "name": "MangaDeemak",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://mangadeemak.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mmrcms_tr_mangadenizi",
    "name": "MangaDenizi",
    "description": "Kotatsu parser catalog source (mmrcms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://mangadenizi.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangadistrict",
    "name": "MangaDistrict",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangadistrict.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangadna",
    "name": "MangaDna",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangadna.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mmrcms_es_mangadoor",
    "name": "MangaDoor",
    "description": "Kotatsu parser catalog source (mmrcms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://mangadoor.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_id_mangadop",
    "name": "MangaDop",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://mangadop.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangaeclipse",
    "name": "MangaEclipse",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangaeclipse.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_tr_mangaefendisi",
    "name": "MangaEfendisi",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://mangaefendisi.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangaeffect",
    "name": "MangaEffect",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangaread.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangatxunofficial",
    "name": "MangaEmpress",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangaempress.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_heancmsalt_es_mangaesp",
    "name": "MangaEsp",
    "description": "Kotatsu parser catalog source (heancmsalt). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://mangaesp.topmanhuas.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangafastnet",
    "name": "MangaFast.net",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhuafast.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MN"
  },
  {
    "id": "kotatsu_madara_ja_mangafenxi",
    "name": "MangaFenxi",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ja",
    "baseUrl": "https://mangafenxi.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_ar_mangaflame",
    "name": "MangaFlame",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://mangaflame.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madtheme_en_mangaforest",
    "name": "MangaForest",
    "description": "Kotatsu parser catalog source (madtheme). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangaforest.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangaforfree",
    "name": "MangaForFree",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangaforfree.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangafoxfull",
    "name": "MangaFoxFull",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangafoxfull.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_scan_fr_mangafr",
    "name": "MangaFr",
    "description": "Kotatsu parser catalog source (scan). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://mangafr.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangafreak",
    "name": "MangaFreak",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangafreak.online",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_iken_en_mangagalaxyparser",
    "name": "MangaGalaxy",
    "description": "Kotatsu parser catalog source (iken). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://vortexscans.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_en_mangageko",
    "name": "MangaGeko",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mgeko.cc",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_tr_mangagezgini",
    "name": "MangaGezgini",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://mangagezginim.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangagg",
    "name": "MangaGg",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangagg.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_en_mangagojo",
    "name": "MangaGojo",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangagojo.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_cupfox_de_mangahaus",
    "name": "MangaHaus",
    "description": "Kotatsu parser catalog source (cupfox). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "de",
    "baseUrl": "https://mangahaus.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangahentai",
    "name": "MangaHentai",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangahentai.me",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangahall",
    "name": "MangaHolic",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangaholic.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_pl_mangahona",
    "name": "MangaHona",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pl",
    "baseUrl": "https://mangahona.pl",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_fr_mangahub",
    "name": "MangaHub",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://mangahub.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_zeistmanga_ar_mangahub",
    "name": "MangaHub.link",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://MangaHub.link",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ML"
  },
  {
    "id": "kotatsu_mmrcms_id_mangaid",
    "name": "MangaId",
    "description": "Kotatsu parser catalog source (mmrcms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://mangaid.click",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangabox_en_mangairo",
    "name": "MangaIro",
    "description": "Kotatsu parser catalog source (mangabox). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://w.mangairo.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_scan_it_mangaitalia",
    "name": "MangaItalia",
    "description": "Kotatsu parser catalog source (scan). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "it",
    "baseUrl": "https://mangaita.io",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madtheme_en_mangajinx",
    "name": "MangaJinx",
    "description": "Kotatsu parser catalog source (madtheme). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mgjinx.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_ja_mangajp",
    "name": "MangaJp",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ja",
    "baseUrl": "https://mangajp.top",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangabox_en_mangakakalot",
    "name": "Mangakakalot.gg",
    "description": "Kotatsu parser catalog source (mangabox). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://Mangakakalot.gg",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MG"
  },
  {
    "id": "kotatsu_mangabox_en_mangakakalottv",
    "name": "Mangakakalot.tv",
    "description": "Kotatsu parser catalog source (mangabox). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://Mangakakalot.tv",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MT"
  },
  {
    "id": "kotatsu_en_mangakawaiien",
    "name": "MangaKawaii En",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangakawaii.io",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ME"
  },
  {
    "id": "kotatsu_fr_mangakawaii",
    "name": "MangaKawaii Fr",
    "description": "Kotatsu parser catalog source (fr). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://mangakawaii.io",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MF"
  },
  {
    "id": "kotatsu_mangareader_tr_mangakazani",
    "name": "MangaKazani",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://mangakazani.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_th_mangakimi",
    "name": "MangaKimi",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://mangakimi.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_tr_mangakings",
    "name": "MangaKings",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://mangakings.com.tr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangakiss",
    "name": "MangaKiss",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangakiss.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_id_mangakkita",
    "name": "MangaKita",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://mangakita.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_cupfox_ja_mangakoinu",
    "name": "MangaKoinu",
    "description": "Kotatsu parser catalog source (cupfox). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ja",
    "baseUrl": "https://mangakoinu.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_tr_mangakoleji",
    "name": "MangaKoleji",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://mangakoleji.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_liliana_ja_mangakoma01",
    "name": "MangaKoma01",
    "description": "Kotatsu parser catalog source (liliana). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ja",
    "baseUrl": "https://mangakoma01.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangakomi",
    "name": "MangaKomi",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangakomi.io",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_id_mangakyo",
    "name": "MangaKyo",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://mangakyo.vip",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_es_mangaland",
    "name": "MangaLand",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://mangaland.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_th_mangalc",
    "name": "MangaLc",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://manga-lc.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_de_mangalesen",
    "name": "MangaLesen",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "de",
    "baseUrl": "https://mangalesen.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangaleveling",
    "name": "MangaLeveling",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangaleveling.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_ru_rulib_mangalibparser",
    "name": "MangaLib",
    "description": "Kotatsu parser catalog source (ru). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://mangalib.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_ru_mangamammy",
    "name": "MangaMammy",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://mangamammy.ru",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_fr_mangamana",
    "name": "MangaMana",
    "description": "Kotatsu parser catalog source (fr). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://manga-mana.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangamanhua",
    "name": "MangaManhua",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangaonlineteam.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangamaniacs",
    "name": "MangaManiacs",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangamaniacs.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_ja_mangamate",
    "name": "MangaMate",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ja",
    "baseUrl": "https://manga-mate.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_fr_mangamoins",
    "name": "MangaMoins",
    "description": "Kotatsu parser catalog source (fr). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://mangamoins.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_th_mangamoons",
    "name": "MangaMoons",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://manga-moons.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_es_mangashiina",
    "name": "MangaMukai.com",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://mangamukai.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MC"
  },
  {
    "id": "kotatsu_madara_pt_mangananquim",
    "name": "MangaNanquim",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://mangananquim.site",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangabox_en_manganato",
    "name": "Manganato",
    "description": "Kotatsu parser catalog source (mangabox). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://natomanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangabox_en_manganelocom",
    "name": "MangaNelo.com",
    "description": "Kotatsu parser catalog source (mangabox). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://MangaNelo.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MC"
  },
  {
    "id": "kotatsu_madara_pt_manganinja",
    "name": "MangaNinja",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://manganinja.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_ar_manganoon",
    "name": "MangaNoon",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://vrnoin.site",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_tr_mangaoku",
    "name": "Mangaoku",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://mangaoku.info",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_tr_mangaokusana",
    "name": "MangaOkusana",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://mangaokusana.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_tr_mangaokutr",
    "name": "MangaOkuTr",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://mangaokutr.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_ru_mangaonelove",
    "name": "MangaOneLove",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://mangaonelove.site",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_pt_mangaonline",
    "name": "MangaOnline",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://mangaonline.blog",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_pt_mangaonline",
    "name": "MangaOnline.biz",
    "description": "Kotatsu parser catalog source (pt). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://MangaOnline.biz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MB"
  },
  {
    "id": "kotatsu_madara_en_mangaonlineteam",
    "name": "MangaOnlineTeam",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangaonlineteam.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangaowlio",
    "name": "MangaOwl.io",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangaowl.io",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MI"
  },
  {
    "id": "kotatsu_madara_en_mangaowlone",
    "name": "MangaOwl.one",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangaowl.one",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MO"
  },
  {
    "id": "kotatsu_en_mangaowl",
    "name": "MangaOwl.to",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://api.mangaowl.to",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MT"
  },
  {
    "id": "kotatsu_madara_en_mangaowlblog",
    "name": "MangaOwlnet.com",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangaowlnet.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MC"
  },
  {
    "id": "kotatsu_madara_en_mangaowlus",
    "name": "MangaOwlYaoi",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangaowlyaoi.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_all_mangapark",
    "name": "MangaPark",
    "description": "Kotatsu parser catalog source (all). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://mangapark.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_ar_mangapeak",
    "name": "MangaPeak",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://mangapeak.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_en_mangapill",
    "name": "MangaPill",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangapill.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_ar_mangapro",
    "name": "MangaPro",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://promanga.pro",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madtheme_en_mangapuma",
    "name": "MangaPuma",
    "description": "Kotatsu parser catalog source (madtheme). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangapuma.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangapure",
    "name": "MangaPure",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangapure.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangaqueen",
    "name": "MangaQueen",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangaqueen.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_wpcomics_ja_mangaraw",
    "name": "MangaRaw",
    "description": "Kotatsu parser catalog source (wpcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ja",
    "baseUrl": "https://mangaraw.best",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangaread",
    "name": "MangaRead",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangaread.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangareadco",
    "name": "MangaRead.co",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangaread.co",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MC"
  },
  {
    "id": "kotatsu_all_mangareadertoparser",
    "name": "MangaReader.To",
    "description": "Kotatsu parser catalog source (all). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://MangaReader.To",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MT"
  },
  {
    "id": "kotatsu_madara_en_mangarock",
    "name": "MangaRock",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangarockteam.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangarockteam",
    "name": "MangaRock.team",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangarockteam.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MT"
  },
  {
    "id": "kotatsu_madara_en_mangarolls",
    "name": "MangaRolls",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangarolls.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_ar_mangarose",
    "name": "MangaRose",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://mangarose.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangaruby",
    "name": "MangaRuby",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangaruby.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_tr_mangaruhu",
    "name": "MangaRuhu",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://mangaruhu.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangaryu",
    "name": "MangaRyu",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangaryu.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mmrcms_fr_mangascan",
    "name": "MangaScan",
    "description": "Kotatsu parser catalog source (mmrcms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://mangascan-fr.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_fr_mangascantrad",
    "name": "MangaScantrad.io",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://manga-scantrad.io",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MI"
  },
  {
    "id": "kotatsu_mangareader_pt_mangaschan",
    "name": "MangasChan",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://mangaschan.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_liliana_en_mangasect",
    "name": "MangaSect",
    "description": "Kotatsu parser catalog source (liliana). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangasect.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_nepnep_en_mangasee",
    "name": "MangaSee",
    "description": "Kotatsu parser catalog source (nepnep). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangasee123.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_tr_mangasehri",
    "name": "MangaSehri.com",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://manga-sehri.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MC"
  },
  {
    "id": "kotatsu_madara_tr_mangasehrinet",
    "name": "MangaSehri.net",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://manga-sehri.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MN"
  },
  {
    "id": "kotatsu_mangareader_id_mangashiro",
    "name": "MangaShiro",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://mangashiro.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_tr_mangasiginagi",
    "name": "MangaSiginagi",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://mangasiginagi.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_es_mangasnosekai",
    "name": "MangasNoSekai",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://mangasnosekai.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_pt_mangasonline",
    "name": "MangasOnline",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://mangasonline.cc",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_fr_mangasorigines",
    "name": "MangasOrigines.fr",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://mangas-origines.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MF"
  },
  {
    "id": "kotatsu_zeistmanga_ar_mangasoul",
    "name": "MangaSoul",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://manga-soul.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_fr_mangasscans",
    "name": "MangasScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://mangas-scans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_ar_mangastorm",
    "name": "MangaStorm",
    "description": "Kotatsu parser catalog source (ar). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://mangastorm.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangasushi",
    "name": "MangaSushi",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangasushi.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_id_mangasusuku",
    "name": "MangaSusuku",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://mangasusuku.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_ar_normoyun",
    "name": "MangaSwat",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://swatscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangasy",
    "name": "Mangasy",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangasy.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_id_mangataleparser",
    "name": "MangaTale",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://ikiru.one",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_foolslide_en_mangatellers",
    "name": "Mangatellers",
    "description": "Kotatsu parser catalog source (foolslide). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://reader.mangatellers.gr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_scan_pt_mangaterra",
    "name": "MangaTerra",
    "description": "Kotatsu parser catalog source (scan). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://manga-terra.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_tr_mangatilkisi",
    "name": "MangaTilkisi",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://mangatilkisi.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_ar_mangatime",
    "name": "MangaTime",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://mangatime.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_all_mangatop",
    "name": "MangaTop",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://mangatop.site",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_en_mangatownparser",
    "name": "MangaTown",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangatown.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_tr_mangatr",
    "name": "MangaTr",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://mangatr.app",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_es_mangatv",
    "name": "MangaTv",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://mangatv.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_en_mangatxcc",
    "name": "MangaTx.cc",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangatx.cc",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MC"
  },
  {
    "id": "kotatsu_madara_en_mangatxgg",
    "name": "MangaTx.gg",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangatx.gg",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MG"
  },
  {
    "id": "kotatsu_madara_en_mangatyrant",
    "name": "MangaTyrant",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangatyrant.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangaus",
    "name": "Mangaus",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangaus.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangaweebs",
    "name": "MangaWeebs",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangaweebs.in",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangaworld_it_mangaworld",
    "name": "MangaWorld",
    "description": "Kotatsu parser catalog source (mangaworld). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "it",
    "baseUrl": "https://mangaworld.ac",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangaworld_it_mangaworldadult",
    "name": "MangaWorldAdult",
    "description": "Kotatsu parser catalog source (mangaworld). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "it",
    "baseUrl": "https://mangaworldadult.net",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_tr_mangawow",
    "name": "MangaWow",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://mangawow.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_tr_mangawt",
    "name": "MangaWt.com",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://mangawt.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MC"
  },
  {
    "id": "kotatsu_madara_tr_mangawtnet",
    "name": "MangaWt.net",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://mangawt.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MN"
  },
  {
    "id": "kotatsu_ru_mangawtfparser",
    "name": "MangaWtf",
    "description": "Kotatsu parser catalog source (ru). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://manga.wtf",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_es_mangaxico",
    "name": "MangaXico",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://mangagojo18.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madtheme_en_mangaxyz",
    "name": "MangaXyz",
    "description": "Kotatsu parser catalog source (madtheme). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangaxyz.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_id_mangayaro",
    "name": "MangaYaro",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://mangayaro.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_ru_mangazavr",
    "name": "Mangazavr",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://mangazavr.ru",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_mangazin",
    "name": "MangaZin",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangazin.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_vi_mangazodiac",
    "name": "MangaZodiac",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://mangazodiac.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_pt_manhastro",
    "name": "Manhastro",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://manhastro.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_ar_manhatic",
    "name": "Manhatic",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://manhatic.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_zeistmanga_ar_manhatok",
    "name": "ManhaTok",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://manhatok.blogspot.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_th_manhuabug",
    "name": "ManhuaBug",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://manhuabug.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manhuaes",
    "name": "ManhuaEs",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhuaes.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manhuafast",
    "name": "ManhuaFast",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhuafast.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manhuaga",
    "name": "ManhuaGa",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhuaga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_liliana_en_manhuagold",
    "name": "ManhuaGold",
    "description": "Kotatsu parser catalog source (liliana). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhuagold.top",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_zh_manhuaguiparser",
    "name": "Manhuagui",
    "description": "Kotatsu parser catalog source (zh). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "zh",
    "baseUrl": "https://manhuagui.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manhuahot",
    "name": "ManhuaHot",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhuahot.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_th_manhuakey",
    "name": "ManhuaKey",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://manhuakey.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manhuamanhwa",
    "name": "ManhuaManhwa",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhuamanhwa.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manhuaplus",
    "name": "ManhuaPlus",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhuaplus.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_liliana_en_manhuaplusorg",
    "name": "ManhuaPlus.org",
    "description": "Kotatsu parser catalog source (liliana). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://ManhuaPlus.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MO"
  },
  {
    "id": "kotatsu_mangareader_en_manhuascanus",
    "name": "ManhuaScan.Us",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhuascan.us",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MU"
  },
  {
    "id": "kotatsu_madara_en_manhuasy",
    "name": "ManhuaSy",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhuasy.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_topmanhua",
    "name": "ManhuaTop",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhuatop.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manhuaus",
    "name": "ManhuaUs",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhuaus.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manhuauss",
    "name": "Manhuauss",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhuauss.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manhuazone",
    "name": "ManhuaZone",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhuazone.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manhuazonghe",
    "name": "ManhuaZonghe",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhuazonghe.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_es_manhwaes",
    "name": "Manhwa-Es",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://manhwa-es.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ME"
  },
  {
    "id": "kotatsu_madara_en_manhwa18app",
    "name": "Manhwa18.app",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhwa18.app",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_all_manhwa18cc",
    "name": "Manhwa18.cc",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://manhwa18.cc",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "MC"
  },
  {
    "id": "kotatsu_en_manhwa18com",
    "name": "Manhwa18.com",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://Manhwa18.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "MC"
  },
  {
    "id": "kotatsu_en_manhwa18parser",
    "name": "Manhwa18.net",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://Manhwa18.net",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "MN"
  },
  {
    "id": "kotatsu_madara_en_manhwa18org",
    "name": "Manhwa18.org",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhwa18.org",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "MO"
  },
  {
    "id": "kotatsu_all_manhwa210",
    "name": "Manhwa210",
    "description": "Kotatsu parser catalog source (all). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://manhwa210.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manhwa68",
    "name": "Manhwa68",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhwa68.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_th_manhwabreakup",
    "name": "ManhwaBreakup",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://manhwabreakup.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manhwaclan",
    "name": "ManhwaClan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhwaclan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manhwaden",
    "name": "ManhwaDen",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhwaden.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_id_manhwadesuparser",
    "name": "ManhwaDesu",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://manhwadesu.asia",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_en_manhwafreak",
    "name": "ManhwaFreak",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhwafreak.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_en_manhwafreake",
    "name": "ManhwaFreake",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhwafreake.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manhwafull",
    "name": "ManhwaFull",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhwafull.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manhwahentai",
    "name": "ManhwaHentai",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhwahentai.me",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manhwahentaito",
    "name": "ManhwaHentai.to",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhwahentai.to",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "MT"
  },
  {
    "id": "kotatsu_madara_id_manhwahub",
    "name": "ManhwaHub",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://manhwahub.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_id_manhwaindoparser",
    "name": "ManhwaIndo",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://manhwaindo.one",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_id_manhwaku",
    "name": "Manhwaku",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://manhwaku.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_id_manhwalandink",
    "name": "ManhwaLand.ink",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://manhwaland.asia",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MI"
  },
  {
    "id": "kotatsu_mangareader_id_manhwaland",
    "name": "ManhwaLand.vip",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://manhwaland.baby",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MV"
  },
  {
    "id": "kotatsu_madara_es_manhwalatino",
    "name": "ManhwaLatino",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://manhwa-latino.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_id_manhwalistparser",
    "name": "ManhwaList",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://manhwalist.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_id_manhwalistorg",
    "name": "ManhwaList.org",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://isekaikomik.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MO"
  },
  {
    "id": "kotatsu_mangareader_en_manhwalover",
    "name": "ManhwaLover",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhwalover.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manhwamanhua",
    "name": "ManhwaManhua",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhwamanhua.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manhwanew",
    "name": "ManhwaNew",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhwanew.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_id_manhwaplus",
    "name": "ManhwaPlus",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://manhwablue.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_all_manhwaraw",
    "name": "ManhwaRaw",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://manhwa-raw.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manhwarawcom",
    "name": "ManhwaRaw.com",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhwaraw.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MC"
  },
  {
    "id": "kotatsu_madara_es_manhwas",
    "name": "Manhwas.es",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://manhwas.es",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ME"
  },
  {
    "id": "kotatsu_madara_en_manhwasco",
    "name": "ManhwaSco",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhwasco.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_en_manhwasmen",
    "name": "ManhwasMen",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhwas.men",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manhwatoon",
    "name": "ManhwaToon",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhwatoon.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manhwatop",
    "name": "ManhwaTop",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhwatop.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_en_manhwax",
    "name": "ManhwaX",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhwax.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manhwaz",
    "name": "ManhwaZ",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manhwaz.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_mangareader_ar_manjanoon",
    "name": "Manjanoon",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://vrnoin.site",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_es_mantrazscan",
    "name": "MantrazScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://mantrazscan.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_tr_manwe",
    "name": "Manwe",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://manwe.pro",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manycomic",
    "name": "ManyComic",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manycomic.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_en_manytoon",
    "name": "ManyToon",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manytoon.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_madara_all_manytoonclub",
    "name": "ManyToon.club",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://manytoon.club",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MC"
  },
  {
    "id": "kotatsu_madara_en_manytoonme",
    "name": "ManyToon.me",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://manytoon.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MM"
  },
  {
    "id": "kotatsu_madara_es_marmota",
    "name": "Marmota",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://marmota.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_onemanga_fr_mashlescan",
    "name": "MashleScan",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://mashlescan.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_zeistmanga_pt_maxgsscan",
    "name": "MaxgsScan",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://maxgsscan.online",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MA"
  },
  {
    "id": "kotatsu_pt_mediocretoons",
    "name": "MediocreToons",
    "description": "Kotatsu parser catalog source (pt). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://api.mediocretoons.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ME"
  },
  {
    "id": "kotatsu_wpcomics_vi_mehentaivn",
    "name": "MeHentaiVN",
    "description": "Kotatsu parser catalog source (wpcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://mehentaivn.xyz",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "ME"
  },
  {
    "id": "kotatsu_foolslide_es_menudofansub",
    "name": "Menudo Fansub",
    "description": "Kotatsu parser catalog source (foolslide). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://menudo-fansub.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MF"
  },
  {
    "id": "kotatsu_mangareader_tr_merlinscans",
    "name": "MerlinScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://merlinscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ME"
  },
  {
    "id": "kotatsu_madara_id_mgkomik",
    "name": "MgKomik",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://id.mgkomik.cc",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MG"
  },
  {
    "id": "kotatsu_madara_es_mhscans",
    "name": "MhScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://mhscans.mundoalterno.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MH"
  },
  {
    "id": "kotatsu_madara_es_mi2mangaes",
    "name": "Mi2MangaEs",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://mi2manga.lat",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MI"
  },
  {
    "id": "kotatsu_mangareader_id_mihentai",
    "name": "MiHentai",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://mihentai.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "MI"
  },
  {
    "id": "kotatsu_zeistmanga_id_mikoroku",
    "name": "Mikoroku",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://mikoroku.web.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MI"
  },
  {
    "id": "kotatsu_zeistmanga_tr_mikrokosmosfb",
    "name": "Mikrokosmosfb",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://mikrokosmosfb.blogspot.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MI"
  },
  {
    "id": "kotatsu_madara_tr_milasub",
    "name": "MilaSub",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://milascans.tr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MI"
  },
  {
    "id": "kotatsu_madara_en_milftoon",
    "name": "MilfToon",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://milftoon.xxx",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MI"
  },
  {
    "id": "kotatsu_vi_mimihentai",
    "name": "MimiHentai",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://mimihentai.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "MI"
  },
  {
    "id": "kotatsu_madara_tr_mindafansub",
    "name": "MindaFansub",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://mindafansub.online",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MI"
  },
  {
    "id": "kotatsu_ru_grouple_mintmangaparser",
    "name": "MintManga",
    "description": "Kotatsu parser catalog source (ru). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://2.mintmanga.one",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MI"
  },
  {
    "id": "kotatsu_all_misskon",
    "name": "MissKon",
    "description": "Kotatsu parser catalog source (all). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://misskon.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MI"
  },
  {
    "id": "kotatsu_madara_es_mmdaos",
    "name": "Mmdaos",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://mmdaos.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MM"
  },
  {
    "id": "kotatsu_mmrcms_mmrcmsparser",
    "name": "Mmrcms",
    "description": "Kotatsu parser catalog source (mmrcms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://div.media",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MM"
  },
  {
    "id": "kotatsu_madara_en_mmscans",
    "name": "MmScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mm-scans.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MM"
  },
  {
    "id": "kotatsu_heancms_pt_modescanlator",
    "name": "ModeScanlator",
    "description": "Kotatsu parser catalog source (heancms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://site.modescanlator.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MO"
  },
  {
    "id": "kotatsu_madara_pt_momonohanascan",
    "name": "MomonohanaScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://momonohanascan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MO"
  },
  {
    "id": "kotatsu_madara_es_monarcamanga",
    "name": "MonarcaManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://visormonarca.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MO"
  },
  {
    "id": "kotatsu_mangareader_id_monzeekomik",
    "name": "MonzeeKomik",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://monzee01.my.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MO"
  },
  {
    "id": "kotatsu_mangareader_tr_moondaisyscans",
    "name": "MoonDaisyScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://moondaisyscans.biz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MO"
  },
  {
    "id": "kotatsu_madara_pt_moonloversscan",
    "name": "MoonLoversScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://moonloversscan.com.br",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MO"
  },
  {
    "id": "kotatsu_madara_pt_moonwitchinlovescan",
    "name": "MoonWitchinScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://moonwitchscan.com.br",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MO"
  },
  {
    "id": "kotatsu_madara_en_mortalsgroove",
    "name": "MortalsGroove",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mortalsgroove.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MO"
  },
  {
    "id": "kotatsu_madara_pt_mrbenne",
    "name": "MrBenne",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://mrbenne.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MR"
  },
  {
    "id": "kotatsu_madara_en_msypublisher",
    "name": "MsyPublisher",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://msypublisher.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MS"
  },
  {
    "id": "kotatsu_en_mtl_mtlparser",
    "name": "MTL",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MT"
  },
  {
    "id": "kotatsu_madara_tr_mugimanga",
    "name": "MugiManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://mugimanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MU"
  },
  {
    "id": "kotatsu_madara_pt_mugiwarasoficial",
    "name": "MugiwarasOficial",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://mugiwarasoficial.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MU"
  },
  {
    "id": "kotatsu_pt_muitohentai",
    "name": "MuitoHentai",
    "description": "Kotatsu parser catalog source (pt). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://muitohentai.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "MU"
  },
  {
    "id": "kotatsu_all_multporn",
    "name": "Multporn",
    "description": "Kotatsu parser catalog source (all). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://multporn.net",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "MU"
  },
  {
    "id": "kotatsu_gattsu_pt_mundohentaioficial",
    "name": "MundoHentaiOficial",
    "description": "Kotatsu parser catalog source (gattsu). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://mundohentaioficial.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "MU"
  },
  {
    "id": "kotatsu_madara_es_mundomanhwa",
    "name": "MundoManhwa",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://mundomanhwa.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MU"
  },
  {
    "id": "kotatsu_en_mycomiclist",
    "name": "MyComicList",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mycomiclist.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MY"
  },
  {
    "id": "kotatsu_onemanga_fr_myheroacademiascan",
    "name": "MyHeroacAdemiaScan",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://myheroacademiascan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MY"
  },
  {
    "id": "kotatsu_all_myreadingmanga",
    "name": "MyReadingManga",
    "description": "Kotatsu parser catalog source (all). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://myreadingmanga.info",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MY"
  },
  {
    "id": "kotatsu_mangareader_en_myshojo",
    "name": "MyShojo",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://myshojo.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "MY"
  },
  {
    "id": "kotatsu_madara_tr_nabiscans",
    "name": "NabiScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://nabiscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NA"
  },
  {
    "id": "kotatsu_mangareader_id_natsu",
    "name": "Natsu",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://natsu.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NA"
  },
  {
    "id": "kotatsu_madara_en_neatmanga",
    "name": "NeatManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://neatmangas.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NE"
  },
  {
    "id": "kotatsu_keyoapp_en_necroscans",
    "name": "NecroScans",
    "description": "Kotatsu parser catalog source (keyoapp). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://necroscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NE"
  },
  {
    "id": "kotatsu_madara_th_nekopost",
    "name": "NekoPost",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://superdoujin.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NE"
  },
  {
    "id": "kotatsu_zeistmanga_es_nekoscans",
    "name": "NekoScans",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://nekoscans.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NE"
  },
  {
    "id": "kotatsu_madara_pt_neoxscans",
    "name": "NeoxScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://mangalivre.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NE"
  },
  {
    "id": "kotatsu_nepnep_nepnepparser",
    "name": "Nepnep",
    "description": "Kotatsu parser catalog source (nepnep). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://temp.compsci88.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NE"
  },
  {
    "id": "kotatsu_madara_pt_neroxus",
    "name": "Neroxus",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://neroxus.com.br",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NE"
  },
  {
    "id": "kotatsu_wpcomics_vi_nettruyen",
    "name": "NetTruyen",
    "description": "Kotatsu parser catalog source (wpcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://nettruyenar.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NE"
  },
  {
    "id": "kotatsu_wpcomics_vi_nettruyen1975",
    "name": "NetTruyen1975",
    "description": "Kotatsu parser catalog source (wpcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NE"
  },
  {
    "id": "kotatsu_wpcomics_vi_nettruyenfe",
    "name": "NetTruyenFE",
    "description": "Kotatsu parser catalog source (wpcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NE"
  },
  {
    "id": "kotatsu_wpcomics_vi_nettruyenhe",
    "name": "NetTruyenHE",
    "description": "Kotatsu parser catalog source (wpcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://nettruyenhe.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NE"
  },
  {
    "id": "kotatsu_wpcomics_vi_nettruyenll",
    "name": "NetTruyenLL",
    "description": "Kotatsu parser catalog source (wpcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NE"
  },
  {
    "id": "kotatsu_wpcomics_vi_nettruyenssr",
    "name": "NetTruyenSSR",
    "description": "Kotatsu parser catalog source (wpcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NE"
  },
  {
    "id": "kotatsu_wpcomics_vi_nettruyenuu",
    "name": "NetTruyenUU",
    "description": "Kotatsu parser catalog source (wpcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NE"
  },
  {
    "id": "kotatsu_wpcomics_vi_nettruyenvie",
    "name": "NetTruyenVie",
    "description": "Kotatsu parser catalog source (wpcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://nettruyenvia.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NE"
  },
  {
    "id": "kotatsu_wpcomics_vi_nettruyenx",
    "name": "NetTruyenX",
    "description": "Kotatsu parser catalog source (wpcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://nettruyenx.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NE"
  },
  {
    "id": "kotatsu_animebootstrap_id_neumanga",
    "name": "NeuManga.xyz",
    "description": "Kotatsu parser catalog source (animebootstrap). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://NeuManga.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NX"
  },
  {
    "id": "kotatsu_madara_en_newmanhua",
    "name": "NewManhua",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://newmanhua.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NE"
  },
  {
    "id": "kotatsu_wpcomics_vi_newtruyen",
    "name": "NewTruyen",
    "description": "Kotatsu parser catalog source (wpcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://newtruyentranh4.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NE"
  },
  {
    "id": "kotatsu_zeistmanga_id_ngamenkomik",
    "name": "NgamenKomik",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://ngamenkomik05.blogspot.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NG"
  },
  {
    "id": "kotatsu_mangareader_id_ngomik",
    "name": "Ngomik",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://ngomik.mom",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NG"
  },
  {
    "id": "kotatsu_wpcomics_vi_nhattruyenvn",
    "name": "NhatTruyenVN",
    "description": "Kotatsu parser catalog source (wpcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://nhattruyenqq.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NH"
  },
  {
    "id": "kotatsu_vi_nhentaiworld",
    "name": "Nhentai World",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://nhentaiworld-h1.art",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "NW"
  },
  {
    "id": "kotatsu_galleryadults_all_nhentaiparser",
    "name": "NHentai.net",
    "description": "Kotatsu parser catalog source (galleryadults). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://NHentai.net",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "NN"
  },
  {
    "id": "kotatsu_galleryadults_all_nhentaitoparser",
    "name": "NHentai.to",
    "description": "Kotatsu parser catalog source (galleryadults). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://NHentai.to",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "NT"
  },
  {
    "id": "kotatsu_galleryadults_all_nhentaixxxparser",
    "name": "NHentai.xxx",
    "description": "Kotatsu parser catalog source (galleryadults). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://NHentai.xxx",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "NX"
  },
  {
    "id": "kotatsu_ja_nicovideoseigaparser",
    "name": "NicoVideo Seiga",
    "description": "Kotatsu parser catalog source (ja). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ja",
    "baseUrl": "https://nicovideo.jp",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NS"
  },
  {
    "id": "kotatsu_madara_en_nightcomic",
    "name": "Night Comic",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://nightcomic.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NC"
  },
  {
    "id": "kotatsu_mangareader_en_nightscans",
    "name": "NightScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://nightsup.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NI"
  },
  {
    "id": "kotatsu_madara_ar_nijitranslations",
    "name": "Niji Translations",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://niji-translations.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NT"
  },
  {
    "id": "kotatsu_zeistmanga_id_nimemob",
    "name": "Nimemob",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://nimemob.my.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NI"
  },
  {
    "id": "kotatsu_all_ninemangaparser",
    "name": "NineManga English",
    "description": "Kotatsu parser catalog source (all). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://ul.direlist",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NE"
  },
  {
    "id": "kotatsu_madara_pt_ninjascan",
    "name": "NinjaComics",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://ninjacomics.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NI"
  },
  {
    "id": "kotatsu_mangareader_tr_nirvanamanga",
    "name": "NirvanaManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://nirvanamanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NI"
  },
  {
    "id": "kotatsu_madara_pt_nirvanascan",
    "name": "NirvanaScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://nirvanascan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NI"
  },
  {
    "id": "kotatsu_madara_en_nitromanga",
    "name": "NitroManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://nitroscans.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NI"
  },
  {
    "id": "kotatsu_madara_tr_niverafansub",
    "name": "NiveraFansub",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://niverafansub.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NI"
  },
  {
    "id": "kotatsu_madara_es_noblessetranslations",
    "name": "NoblesseTranslations",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://nobledicion.yoveo.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NO"
  },
  {
    "id": "kotatsu_madara_pt_nocsummer",
    "name": "NocturneSummer",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://nocfsb.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NO"
  },
  {
    "id": "kotatsu_madara_pt_noindexscan",
    "name": "NoindexScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://noindexscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NO"
  },
  {
    "id": "kotatsu_mangareader_ar_noonscan",
    "name": "NoonScan.com",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://noonscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NC"
  },
  {
    "id": "kotatsu_mangareader_en_manjanoon",
    "name": "NoonScan.net",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://noonscan.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NN"
  },
  {
    "id": "kotatsu_mangareader_id_noromax",
    "name": "Noromax",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://noromax01.my.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NO"
  },
  {
    "id": "kotatsu_madara_pt_norterose",
    "name": "Norterose",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://norterose.com.br",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NO"
  },
  {
    "id": "kotatsu_madara_en_novelcrow",
    "name": "NovelCrow",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://novelcrow.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NO"
  },
  {
    "id": "kotatsu_madara_en_novelmic",
    "name": "NovelMic",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://novelmic.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NO"
  },
  {
    "id": "kotatsu_madara_ar_novelstown",
    "name": "NovelsTown",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://novelstown.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NO"
  },
  {
    "id": "kotatsu_mangareader_tr_noxscans",
    "name": "NoxScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://noxscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NO"
  },
  {
    "id": "kotatsu_mangareader_th_ntrmanga",
    "name": "NtrManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://ntr-manga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NT"
  },
  {
    "id": "kotatsu_ru_nudemoonparser",
    "name": "Nude-Moon",
    "description": "Kotatsu parser catalog source (ru). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://b.nude-moon.fun",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NM"
  },
  {
    "id": "kotatsu_madara_en_nvmanga",
    "name": "NvManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://1manhwa.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NV"
  },
  {
    "id": "kotatsu_mangareader_tr_nyxmanga",
    "name": "NyxManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://nyxmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "NY"
  },
  {
    "id": "kotatsu_vi_otruyenparser",
    "name": "Ổ Truyện",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://otruyen.cc",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TN"
  },
  {
    "id": "kotatsu_cupfox_vi_oioivn",
    "name": "OioiVn",
    "description": "Kotatsu parser catalog source (cupfox). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://oioivn.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "OI"
  },
  {
    "id": "kotatsu_zeistmanga_id_okyykomik",
    "name": "OkyyKomik",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://okyykomik.my.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "OK"
  },
  {
    "id": "kotatsu_madara_ar_olaoe",
    "name": "Olaoe",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://olaoe.cyou",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "OL"
  },
  {
    "id": "kotatsu_fmreader_es_olimposcans",
    "name": "OlimpoScans",
    "description": "Kotatsu parser catalog source (fmreader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://leerolimpo.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "OL"
  },
  {
    "id": "kotatsu_heancms_en_omegascans",
    "name": "OmegaScans",
    "description": "Kotatsu parser catalog source (heancms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://omegascans.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "OM"
  },
  {
    "id": "kotatsu_onemanga_onemangaparser",
    "name": "One Manga",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "OM"
  },
  {
    "id": "kotatsu_pt_onepieceex",
    "name": "OnePieceEx",
    "description": "Kotatsu parser catalog source (pt). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://onepieceex.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ON"
  },
  {
    "id": "kotatsu_onemanga_fr_onepiecescan",
    "name": "OnePieceScan",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://onepiecescan.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ON"
  },
  {
    "id": "kotatsu_onemanga_fr_onepunchmanscan",
    "name": "OnePunchManScan",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://onepunchmanscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ON"
  },
  {
    "id": "kotatsu_madara_en_onlymanhwa",
    "name": "OnlyManhwa",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://onlymanhwa.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ON"
  },
  {
    "id": "kotatsu_mmrcms_ar_onma",
    "name": "Onma",
    "description": "Kotatsu parser catalog source (mmrcms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://onma.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ON"
  },
  {
    "id": "kotatsu_madara_tr_opiatoon",
    "name": "OpiaToon",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://opiatoon.art",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "OP"
  },
  {
    "id": "kotatsu_mangareader_pt_origamiorpheans",
    "name": "Origami Orpheans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://origami-orpheans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "OO"
  },
  {
    "id": "kotatsu_onemanga_fr_oshinoko",
    "name": "OshiNoKo",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://oshinoko.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "OS"
  },
  {
    "id": "kotatsu_otakusanctuary_otakusanctuaryparser",
    "name": "Otaku Sanctuary",
    "description": "Kotatsu parser catalog source (otakusanctuary). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://drive.google.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "OS"
  },
  {
    "id": "kotatsu_otakusanctuary_en_otakusanen",
    "name": "Otaku Sanctuary (EN)",
    "description": "Kotatsu parser catalog source (otakusanctuary). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://otakusan.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "OS"
  },
  {
    "id": "kotatsu_otakusanctuary_vi_otakusanvi",
    "name": "Otaku Sanctuary (VN)",
    "description": "Kotatsu parser catalog source (otakusanctuary). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://otakusan.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "OS"
  },
  {
    "id": "kotatsu_mangareader_id_otsugami",
    "name": "Otsugami",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://otsugami.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "OT"
  },
  {
    "id": "kotatsu_madara_es_panconcola",
    "name": "Panconcola",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://artessupremas.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PA"
  },
  {
    "id": "kotatsu_madara_fr_pantheonscan",
    "name": "PantheonScan.com",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://pantheon-scan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PC"
  },
  {
    "id": "kotatsu_mangareader_fr_pantheonscanfr",
    "name": "PantheonScan.fr",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://pantheon-scan.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PF"
  },
  {
    "id": "kotatsu_animebootstrap_fr_papscan",
    "name": "PapScan",
    "description": "Kotatsu parser catalog source (animebootstrap). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://papscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PA"
  },
  {
    "id": "kotatsu_madara_en_isekaiscaneuparser",
    "name": "ParagonScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://paragonscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PA"
  },
  {
    "id": "kotatsu_madara_en_paritehaber",
    "name": "Paritehaber",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://paritehaber.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PA"
  },
  {
    "id": "kotatsu_madara_pt_passamaoscan",
    "name": "PassamaoScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://passamaoscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PA"
  },
  {
    "id": "kotatsu_mangareader_tr_patimanga",
    "name": "PatiManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://patimanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PA"
  },
  {
    "id": "kotatsu_madara_en_pawmanga",
    "name": "PawManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://pawmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PA"
  },
  {
    "id": "kotatsu_mangareader_ar_peachbl",
    "name": "PeachBl",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://peach-bl.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PE"
  },
  {
    "id": "kotatsu_heancms_fr_perfscan",
    "name": "PerfScan",
    "description": "Kotatsu parser catalog source (heancms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://perf-scan.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PE"
  },
  {
    "id": "kotatsu_madara_en_petrotechsociety",
    "name": "Petrotech Society",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://petrotechsociety.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PS"
  },
  {
    "id": "kotatsu_fr_phenixscansparser",
    "name": "PhenixScans",
    "description": "Kotatsu parser catalog source (fr). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://phenix-scans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PH"
  },
  {
    "id": "kotatsu_madara_vi_saytruyenhay",
    "name": "PheTruyen",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://phetruyen.vip",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PH"
  },
  {
    "id": "kotatsu_iken_en_philiascans",
    "name": "PhiliaScans",
    "description": "Kotatsu parser catalog source (iken). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://philiascans.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PH"
  },
  {
    "id": "kotatsu_pizzareader_it_phoenixscans",
    "name": "PhoenixScans",
    "description": "Kotatsu parser catalog source (pizzareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "it",
    "baseUrl": "https://phoenixscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PH"
  },
  {
    "id": "kotatsu_madara_en_pianmanga",
    "name": "PianManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://pianmanga.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PI"
  },
  {
    "id": "kotatsu_madara_tr_piedpiperfansub",
    "name": "PiedpiperFansub",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://piedpiperfansub.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PI"
  },
  {
    "id": "kotatsu_madara_tr_piedpiperfansubyy",
    "name": "PiedPiperFansubyy",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://piedpiperfansubyy.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PI"
  },
  {
    "id": "kotatsu_madara_vi_pinkteacomic",
    "name": "PinkTeaComic",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://pinkteacomics.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PI"
  },
  {
    "id": "kotatsu_madara_pt_pirulitorosa",
    "name": "PirulitoRosa",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://pirulitorosa.site",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PI"
  },
  {
    "id": "kotatsu_id_pixhentai",
    "name": "PixHentai",
    "description": "Kotatsu parser catalog source (id). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://pixhentai.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "PI"
  },
  {
    "id": "kotatsu_pizzareader_pizzareaderparser",
    "name": "Pizza Reader",
    "description": "Kotatsu parser catalog source (pizzareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PR"
  },
  {
    "id": "kotatsu_madara_en_platinumscans",
    "name": "PlatinumScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://platinumscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PL"
  },
  {
    "id": "kotatsu_madara_pt_plumacomics",
    "name": "PlumaComics",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://plumacomics.cloud",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PL"
  },
  {
    "id": "kotatsu_en_po2scans",
    "name": "Po2Scans",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://po2scans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PO"
  },
  {
    "id": "kotatsu_mangareader_pt_pointzerotoons",
    "name": "PointZero Toons",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://pointzerotoons.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PT"
  },
  {
    "id": "kotatsu_madara_id_pojokmanga",
    "name": "PojokManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://pojokmanga.info",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PO"
  },
  {
    "id": "kotatsu_madara_en_ponymanga",
    "name": "PonyManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://ponymanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PO"
  },
  {
    "id": "kotatsu_mangareader_th_popsmanga",
    "name": "PopsManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://popsmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PO"
  },
  {
    "id": "kotatsu_madara_en_porncomixonline",
    "name": "PornComix.online",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://porncomix.online",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "PO"
  },
  {
    "id": "kotatsu_mangareader_fr_pornhwascans",
    "name": "PornhwaScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://pornhwascans.fr",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "PO"
  },
  {
    "id": "kotatsu_madara_pt_portalyaoi",
    "name": "PortalYaoi",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://portalyaoi.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "PO"
  },
  {
    "id": "kotatsu_fr_poseidonscans",
    "name": "Poseidon Scans",
    "description": "Kotatsu parser catalog source (fr). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://poseidonscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PS"
  },
  {
    "id": "kotatsu_mangareader_ar_potatomanga",
    "name": "PotatoManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://potatomanga.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PO"
  },
  {
    "id": "kotatsu_foolslide_it_powermanga",
    "name": "PowerManga",
    "description": "Kotatsu parser catalog source (foolslide). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "it",
    "baseUrl": "https://reader.powermanga.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PO"
  },
  {
    "id": "kotatsu_madara_pt_prismahentai",
    "name": "PrismaHentai",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://prismahentai.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "PR"
  },
  {
    "id": "kotatsu_madara_pt_projetoscanlator",
    "name": "ProjetoScanlator",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://projetoscanlator.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PR"
  },
  {
    "id": "kotatsu_mangareader_tr_prunusscans",
    "name": "PrunusScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://prunusscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PR"
  },
  {
    "id": "kotatsu_madara_pt_psunicorn",
    "name": "PsUnicorn",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://psunicorn.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PS"
  },
  {
    "id": "kotatsu_en_pururin",
    "name": "Pururin",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://pururin.to",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PU"
  },
  {
    "id": "kotatsu_madara_pt_pussysussytoons",
    "name": "PussySussyToons",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://pussy.sussytoons.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PU"
  },
  {
    "id": "kotatsu_foolslide_es_pzykosis666hfansub",
    "name": "Pzykosis666h Fansub",
    "description": "Kotatsu parser catalog source (foolslide). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://lector.pzykosis666hfansub.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "PF"
  },
  {
    "id": "kotatsu_madara_vi_quaanhdaocuteo",
    "name": "Quả Anh Đào Cuteo",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://qadcuteo.cc",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "QA"
  },
  {
    "id": "kotatsu_mangareader_en_rackusreads",
    "name": "RackusReads",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://rackusreads.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RA"
  },
  {
    "id": "kotatsu_mangareader_en_luminousscans",
    "name": "RadiantScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://radiantscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RA"
  },
  {
    "id": "kotatsu_madara_es_ragnarokscan",
    "name": "RagnarokScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://ragnarokscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RA"
  },
  {
    "id": "kotatsu_madara_es_ragnarokscanlation",
    "name": "RagnarokScanlation",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://ragnarokscanlation.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RA"
  },
  {
    "id": "kotatsu_madara_tr_ragnarscans",
    "name": "Ragnarscans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://ragnarscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RA"
  },
  {
    "id": "kotatsu_mangareader_es_ragnascan",
    "name": "RagnaScan",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://ragnascan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RA"
  },
  {
    "id": "kotatsu_madara_fr_raijinscans",
    "name": "RaijinScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://raijin-scans.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RA"
  },
  {
    "id": "kotatsu_mangareader_es_raikiscan",
    "name": "RaikiScan",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://raikiscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RA"
  },
  {
    "id": "kotatsu_madara_pt_rainbowfairyscan",
    "name": "RainbowFairyScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://rainbowfairyscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RA"
  },
  {
    "id": "kotatsu_mangareader_tr_raindropteamfan",
    "name": "Raindrop Fansub",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://raindropteamfan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RF"
  },
  {
    "id": "kotatsu_foolslide_it_ramareader",
    "name": "RamaReader",
    "description": "Kotatsu parser catalog source (foolslide). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "it",
    "baseUrl": "https://ramareader.it",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RA"
  },
  {
    "id": "kotatsu_mangareader_en_ravenscans",
    "name": "RavenScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://ravenscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RA"
  },
  {
    "id": "kotatsu_liliana_ja_raw1001",
    "name": "Raw1001",
    "description": "Kotatsu parser catalog source (liliana). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ja",
    "baseUrl": "https://raw1001.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RA"
  },
  {
    "id": "kotatsu_madara_ko_rawdex",
    "name": "RawDex",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ko",
    "baseUrl": "https://rawdex.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RA"
  },
  {
    "id": "kotatsu_mangareader_ja_rawkuma",
    "name": "Rawkuma",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ja",
    "baseUrl": "https://old.rawkuma.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RA"
  },
  {
    "id": "kotatsu_madara_ja_rawmanga",
    "name": "RawManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ja",
    "baseUrl": "https://rawmanga.su",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RA"
  },
  {
    "id": "kotatsu_madara_ja_rawxz",
    "name": "RawXz",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ja",
    "baseUrl": "https://rawxz.ac",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RA"
  },
  {
    "id": "kotatsu_zeistmanga_pt_raysscan",
    "name": "RaysScan",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://raysscan.blogspot.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RA"
  },
  {
    "id": "kotatsu_mmrcms_en_readcomicsonline",
    "name": "ReadComicsOnline.ru",
    "description": "Kotatsu parser catalog source (mmrcms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://ReadComicsOnline.ru",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RR"
  },
  {
    "id": "kotatsu_madara_fr_readergen",
    "name": "ReaderGen",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://fr.readergen.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RE"
  },
  {
    "id": "kotatsu_mangareader_en_readerspoint",
    "name": "ReadersPoint",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://qscomics.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RE"
  },
  {
    "id": "kotatsu_madara_en_readfreecomics",
    "name": "ReadFreeComics",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://readfreecomics.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RE"
  },
  {
    "id": "kotatsu_mangareader_en_readkomik",
    "name": "ReadKomik",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://novelstreams.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RE"
  },
  {
    "id": "kotatsu_ru_grouple_readmangaparser",
    "name": "ReadManga",
    "description": "Kotatsu parser catalog source (ru). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://a.zazaza.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RE"
  },
  {
    "id": "kotatsu_madara_en_readmanhua",
    "name": "ReadManhua (Broken)",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://readmanhua.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RB"
  },
  {
    "id": "kotatsu_foolslide_it_readnifteam",
    "name": "ReadNifTeam",
    "description": "Kotatsu parser catalog source (foolslide). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "it",
    "baseUrl": "https://read-nifteam.info",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RE"
  },
  {
    "id": "kotatsu_en_readonepiece",
    "name": "ReadOnePiece",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://ww11.readonepiece.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RE"
  },
  {
    "id": "kotatsu_heancms_en_reapercomics",
    "name": "ReaperComics",
    "description": "Kotatsu parser catalog source (heancms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://reaperscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RE"
  },
  {
    "id": "kotatsu_keyoapp_fr_reaperscansfr",
    "name": "ReaperScans.fr",
    "description": "Kotatsu parser catalog source (keyoapp). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://ReaperScans.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RF"
  },
  {
    "id": "kotatsu_mangareader_en_reaperscansunoriginal",
    "name": "ReaperScansUnoriginal",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://reaper-scans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RE"
  },
  {
    "id": "kotatsu_mangareader_th_reapertrans",
    "name": "ReaperTrans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://reapertrans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RE"
  },
  {
    "id": "kotatsu_madara_pt_remangas",
    "name": "ReMangas",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://remangas.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RE"
  },
  {
    "id": "kotatsu_madara_en_resetscans",
    "name": "Resetscans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://reset-scans.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RE"
  },
  {
    "id": "kotatsu_madara_en_kumascans",
    "name": "Retsu",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://retsu.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RE"
  },
  {
    "id": "kotatsu_mangareader_fr_revolutionscantrad",
    "name": "RevolutionScantrad",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://revolutionscantrad.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RE"
  },
  {
    "id": "kotatsu_zeistmanga_id_reyume",
    "name": "ReYume",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://re-yume.my.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RE"
  },
  {
    "id": "kotatsu_keyoapp_en_rezoscans",
    "name": "RezoScans",
    "description": "Kotatsu parser catalog source (keyoapp). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://rezoscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RE"
  },
  {
    "id": "kotatsu_madara_th_rhplusmanga",
    "name": "Rh2PlusManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://rh2plusmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RH"
  },
  {
    "id": "kotatsu_madara_es_richtoscan",
    "name": "RichtoScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://r1.richtoon.top",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RI"
  },
  {
    "id": "kotatsu_madara_es_rightdarkscan",
    "name": "RightDarkScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://rsdleft.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RI"
  },
  {
    "id": "kotatsu_mangareader_fr_rimuscans",
    "name": "RimuScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://rimuscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RI"
  },
  {
    "id": "kotatsu_mangareader_en_rizzcomic",
    "name": "RizzComic",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://rizzfables.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RI"
  },
  {
    "id": "kotatsu_mangareader_tr_robinmanga",
    "name": "RobinManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://guildknives.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RO"
  },
  {
    "id": "kotatsu_madara_ar_rocksmanga",
    "name": "RocksManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://rockscans.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RO"
  },
  {
    "id": "kotatsu_madara_pt_rogmangas",
    "name": "RogMangas",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://rogmangas.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RO"
  },
  {
    "id": "kotatsu_mangareader_en_rokari",
    "name": "Rokari Comics",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://rokaricomics.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RC"
  },
  {
    "id": "kotatsu_en_roliascan",
    "name": "Rolia Scan",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://roliascan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RS"
  },
  {
    "id": "kotatsu_madara_tr_romantikmanga",
    "name": "RomantikManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://webtoonhatti.club",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RO"
  },
  {
    "id": "kotatsu_madara_vi_ruahapchanhday",
    "name": "Rùa Hấp Chanh Dây",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://ruahapchanhday.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RA"
  },
  {
    "id": "kotatsu_madara_tr_ruyamanga",
    "name": "RuyaManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://ruyamanga.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "RU"
  },
  {
    "id": "kotatsu_madara_en_s2manga",
    "name": "S2Manga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://s2manga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "S2"
  },
  {
    "id": "kotatsu_madara_en_jimanga",
    "name": "S2Manga.io",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://s2manga.io",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SI"
  },
  {
    "id": "kotatsu_tr_sadscans",
    "name": "SadScans",
    "description": "Kotatsu parser catalog source (tr). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://sadscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SA"
  },
  {
    "id": "kotatsu_onemanga_fr_sakamotodays",
    "name": "SakamotoDays",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://sakamotodays.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SA"
  },
  {
    "id": "kotatsu_madara_es_samuraiscan",
    "name": "SamuraiScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://samuraiscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SA"
  },
  {
    "id": "kotatsu_madara_es_sapphirescan",
    "name": "SapphireScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://sapphirescan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SA"
  },
  {
    "id": "kotatsu_madara_tr_sarcasmscans",
    "name": "SarcasmScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://sarcasmscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SA"
  },
  {
    "id": "kotatsu_vi_sayhentai",
    "name": "SayHentai",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://sayhentaii.art",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "SA"
  },
  {
    "id": "kotatsu_madara_es_scambertraslator",
    "name": "ScamberTraslator",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://scambertraslator.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SC"
  },
  {
    "id": "kotatsu_scan_scanparser",
    "name": "Scan",
    "description": "Kotatsu parser catalog source (scan). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SC"
  },
  {
    "id": "kotatsu_onemanga_fr_scanboruto",
    "name": "ScanBoruto",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://scanboruto.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SC"
  },
  {
    "id": "kotatsu_madara_fr_scanhentai",
    "name": "ScanHentai",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://scan-hentai.fr",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "SC"
  },
  {
    "id": "kotatsu_madara_fr_scanhentaimenu",
    "name": "ScanHentai.Menu",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://x-manga.org",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "SM"
  },
  {
    "id": "kotatsu_scan_it_scanita",
    "name": "ScanIta.org",
    "description": "Kotatsu parser catalog source (scan). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "it",
    "baseUrl": "https://ScanIta.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SO"
  },
  {
    "id": "kotatsu_onemanga_fr_scanjujutsukaisen",
    "name": "ScanJujutsuKaisen",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://scanjujutsukaisen.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SC"
  },
  {
    "id": "kotatsu_mmrcms_fr_scanmanga",
    "name": "ScanManga",
    "description": "Kotatsu parser catalog source (mmrcms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://scan-manga.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SC"
  },
  {
    "id": "kotatsu_mmrcms_fr_scanmangavfws",
    "name": "ScanMangaVf.ws",
    "description": "Kotatsu parser catalog source (mmrcms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://ScanMangaVf.ws",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SW"
  },
  {
    "id": "kotatsu_fr_scansmangasme",
    "name": "ScansMangas.me",
    "description": "Kotatsu parser catalog source (fr). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://ScansMangas.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SM"
  },
  {
    "id": "kotatsu_scan_fr_scantrad",
    "name": "ScanTrad",
    "description": "Kotatsu parser catalog source (scan). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://scan-trad.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SC"
  },
  {
    "id": "kotatsu_madara_fr_scantradvf",
    "name": "Scantrad-Vf",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://scantrad-vf.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SV"
  },
  {
    "id": "kotatsu_fr_scantradunion",
    "name": "ScantradUnion",
    "description": "Kotatsu parser catalog source (fr). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://scantrad-union.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SC"
  },
  {
    "id": "kotatsu_mmrcms_fr_scanvf",
    "name": "ScanVf",
    "description": "Kotatsu parser catalog source (mmrcms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://scan-vf.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SC"
  },
  {
    "id": "kotatsu_scan_fr_scanvforg",
    "name": "ScanVf.org",
    "description": "Kotatsu parser catalog source (scan). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://ScanVf.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SO"
  },
  {
    "id": "kotatsu_mangareader_ar_scarmanga",
    "name": "ScarManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://scarmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SC"
  },
  {
    "id": "kotatsu_all_koharu",
    "name": "Schale.network",
    "description": "Kotatsu parser catalog source (all). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://$apiSuffix",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SN"
  },
  {
    "id": "kotatsu_fuzzydoodle_en_scyllacomics",
    "name": "ScyllaComics",
    "description": "Kotatsu parser catalog source (fuzzydoodle). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://scyllacomics.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SC"
  },
  {
    "id": "kotatsu_madara_en_sectscans",
    "name": "SectScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://sectscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SE"
  },
  {
    "id": "kotatsu_ru_grouple_seimangaparser",
    "name": "SeiManga",
    "description": "Kotatsu parser catalog source (ru). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://1.seimanga.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SE"
  },
  {
    "id": "kotatsu_foolslide_en_seinagi",
    "name": "Seinagi",
    "description": "Kotatsu parser catalog source (foolslide). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://reader.seinagi.org.es",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SE"
  },
  {
    "id": "kotatsu_foolslide_es_seinagiadulto",
    "name": "Seinagi Adulto",
    "description": "Kotatsu parser catalog source (foolslide). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://adulto.seinagi.org.es",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "SA"
  },
  {
    "id": "kotatsu_cupfox_fr_seinemanga",
    "name": "SeineManga",
    "description": "Kotatsu parser catalog source (cupfox). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://seinemanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SE"
  },
  {
    "id": "kotatsu_mangareader_id_sekaikomikparser",
    "name": "SekaiKomik",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://sekaikomik.mom",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SE"
  },
  {
    "id": "kotatsu_mangareader_id_sektedoujin",
    "name": "SekteDoujin",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://sektedoujin.cc",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "SE"
  },
  {
    "id": "kotatsu_animebootstrap_id_sektekomik",
    "name": "SekteKomik",
    "description": "Kotatsu parser catalog source (animebootstrap). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://sektekomik.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SE"
  },
  {
    "id": "kotatsu_ru_grouple_selfmangaparser",
    "name": "SelfManga",
    "description": "Kotatsu parser catalog source (ru). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://selfmanga.live",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SE"
  },
  {
    "id": "kotatsu_mangareader_es_senpaiediciones",
    "name": "SenpaiEdiciones",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://senpaiediciones.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SE"
  },
  {
    "id": "kotatsu_mangareader_tr_hyperionscans",
    "name": "SeraphManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://seraphmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SE"
  },
  {
    "id": "kotatsu_mangareader_tr_sereinscan",
    "name": "SereinScan",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://sereinscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SE"
  },
  {
    "id": "kotatsu_madara_en_setsuscans",
    "name": "SetsuScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://setsuscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SE"
  },
  {
    "id": "kotatsu_zeistmanga_tr_shadowceviri",
    "name": "ShadowCeviri",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://shadowceviri.blogspot.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SH"
  },
  {
    "id": "kotatsu_mangareader_es_shadowmangas",
    "name": "ShadowMangas",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://shadowmangas.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SH"
  },
  {
    "id": "kotatsu_madara_ar_shadowxmanga",
    "name": "ShadowXManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://shadowxmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SH"
  },
  {
    "id": "kotatsu_mangareader_id_sheakomik",
    "name": "SheaKomik",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://sheakomik.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SH"
  },
  {
    "id": "kotatsu_madara_en_shibamanga",
    "name": "ShibaManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://shibamanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SH"
  },
  {
    "id": "kotatsu_mangareader_tr_shijiescans",
    "name": "ShijieScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://shijiescans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SH"
  },
  {
    "id": "kotatsu_mangareader_id_shirakami",
    "name": "Shirakami",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://shirakami.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SH"
  },
  {
    "id": "kotatsu_zmanga_id_shirodoujin",
    "name": "ShiroDoujin",
    "description": "Kotatsu parser catalog source (zmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://shirodoujin.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "SH"
  },
  {
    "id": "kotatsu_zeistmanga_id_shiyurasub",
    "name": "ShiyuraSub",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://shiyurasub.blogspot.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SH"
  },
  {
    "id": "kotatsu_mangareader_en_shojoscans",
    "name": "ShojoScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://violetscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SH"
  },
  {
    "id": "kotatsu_madara_en_shootingstarscans",
    "name": "Shooting Star Scans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://shootingstarscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SS"
  },
  {
    "id": "kotatsu_mangareader_id_siikomik",
    "name": "SiiKomik",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://siikomik.fun",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SI"
  },
  {
    "id": "kotatsu_mangareader_pt_silencescan",
    "name": "SilenceScan",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://silencescan.com.br",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SI"
  },
  {
    "id": "kotatsu_madara_pt_sinensisscans",
    "name": "SinensisScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://sinensis.leitorweb.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SI"
  },
  {
    "id": "kotatsu_sinmh_sinmhparser",
    "name": "Sinmh",
    "description": "Kotatsu parser catalog source (sinmh). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SI"
  },
  {
    "id": "kotatsu_mangareader_id_sirenkomik",
    "name": "SirenKomik",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://sirenkomik.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SI"
  },
  {
    "id": "kotatsu_madara_en_sitemanga",
    "name": "SiteManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://sitemanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SI"
  },
  {
    "id": "kotatsu_mangareader_pl_skanlacjefeniksy",
    "name": "SkanlacjeFeniksy",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pl",
    "baseUrl": "https://skanlacje-feniksy.pl",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SK"
  },
  {
    "id": "kotatsu_mangareader_en_skymanga",
    "name": "SkyManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://skymanga.work",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SK"
  },
  {
    "id": "kotatsu_mangareader_es_skymangas",
    "name": "SkyMangas",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://skymangas.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SK"
  },
  {
    "id": "kotatsu_ru_rulib_slashlibparser",
    "name": "SlashLib",
    "description": "Kotatsu parser catalog source (ru). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://v2.slashlib.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SL"
  },
  {
    "id": "kotatsu_madara_en_sleepytranslations",
    "name": "Sleepy Translations",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://sleepytranslations.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ST"
  },
  {
    "id": "kotatsu_onemanga_fr_snkscan",
    "name": "SnkScan",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://snkscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SN"
  },
  {
    "id": "kotatsu_en_mtl_snowmtl",
    "name": "SnowMTL",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://snowmtl.ru",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SN"
  },
  {
    "id": "kotatsu_mangareader_en_snowscans",
    "name": "SnowScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://flixscans.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SN"
  },
  {
    "id": "kotatsu_zeistmanga_tr_snscoeurturkey",
    "name": "SnscoeurTurkey",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://snscoeurturkey.blogspot.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SN"
  },
  {
    "id": "kotatsu_zeistmanga_id_sobatmanku",
    "name": "Sobatmanku",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://sobatmanku19.cab",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SO"
  },
  {
    "id": "kotatsu_en_mtl_solarmtl",
    "name": "SolarMTL",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://solarmtl.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SO"
  },
  {
    "id": "kotatsu_zeistmanga_pt_solooscan",
    "name": "SolooScan",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://solooscan.blogspot.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SO"
  },
  {
    "id": "kotatsu_mangareader_th_somanga",
    "name": "SoManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://so-manga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SO"
  },
  {
    "id": "kotatsu_mangareader_id_soulscans",
    "name": "SoulScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://soulscans.my.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SO"
  },
  {
    "id": "kotatsu_mangareader_en_spiderscans",
    "name": "SpiderScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://spiderscans.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SP"
  },
  {
    "id": "kotatsu_madara_pt_ssreading",
    "name": "SsReading",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://ssreading.com.br",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SS"
  },
  {
    "id": "kotatsu_keyoapp_fr_starboundscans",
    "name": "StarboundScans",
    "description": "Kotatsu parser catalog source (keyoapp). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://starboundscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ST"
  },
  {
    "id": "kotatsu_mangareader_ar_stellarsaber",
    "name": "StellarSaber",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://stellarsaber.pro",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ST"
  },
  {
    "id": "kotatsu_madara_es_stickhorse",
    "name": "StickHorse",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://stickhorse.cl",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ST"
  },
  {
    "id": "kotatsu_madara_en_stonescape",
    "name": "StoneScape",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://stonescape.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ST"
  },
  {
    "id": "kotatsu_madara_tr_strayfansub",
    "name": "StrayFansub",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://strayfansub.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ST"
  },
  {
    "id": "kotatsu_madara_en_summanga",
    "name": "SumManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://summanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SU"
  },
  {
    "id": "kotatsu_mangareader_tr_summertoon",
    "name": "SummerToon",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://summertoon.co",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SU"
  },
  {
    "id": "kotatsu_madara_th_kingsmanga",
    "name": "SuperDoujin",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://superdoujin.org",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "SU"
  },
  {
    "id": "kotatsu_mangareader_fr_sushiscanfr",
    "name": "SushiScan.fr",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://sushiscan.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SF"
  },
  {
    "id": "kotatsu_mangareader_fr_sushiscan",
    "name": "SushiScan.Net",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://sushiscan.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SN"
  },
  {
    "id": "kotatsu_pt_sussyscan",
    "name": "SussyScan",
    "description": "Kotatsu parser catalog source (pt). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://api.sussytoons.wtf",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SU"
  },
  {
    "id": "kotatsu_madara_pt_sweetscan",
    "name": "SweetScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://sweetscan.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "SW"
  },
  {
    "id": "kotatsu_madara_pt_tankouhentai",
    "name": "TankouHentai",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://tankouhentai.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "TA"
  },
  {
    "id": "kotatsu_mangareader_th_tanukimanga",
    "name": "TanukiManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://tanuki-manga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TA"
  },
  {
    "id": "kotatsu_mangareader_tr_tarotscans",
    "name": "TarotScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://tarotscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TA"
  },
  {
    "id": "kotatsu_madara_pt_tatakaescansparser",
    "name": "TatakaeScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://tatakaescan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TA"
  },
  {
    "id": "kotatsu_madara_es_taurusmanga",
    "name": "TaurusManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://taurus.topmanhuas.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TA"
  },
  {
    "id": "kotatsu_madara_en_tcbscansmanga",
    "name": "TcbScansManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://tcbscans-manga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TC"
  },
  {
    "id": "kotatsu_ar_teamxnovel",
    "name": "TeamXNovel",
    "description": "Kotatsu parser catalog source (ar). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://olympustaff.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TE"
  },
  {
    "id": "kotatsu_madara_es_tecnoprojects",
    "name": "TecnoProjects",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://tecnoprojects.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TE"
  },
  {
    "id": "kotatsu_mangareader_es_tecnoscann",
    "name": "TecnoScann",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://tecnoscann.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TE"
  },
  {
    "id": "kotatsu_mangareader_en_tecnoscans",
    "name": "TecnoScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://olyteconscans.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TE"
  },
  {
    "id": "kotatsu_madara_en_teenmanhua",
    "name": "TeenManhua",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://teenmanhua.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TE"
  },
  {
    "id": "kotatsu_zeistmanga_pt_temakimangas",
    "name": "TemakiMangas",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://temakimangas.blogspot.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TE"
  },
  {
    "id": "kotatsu_mangareader_tr_tempestfansubparser",
    "name": "TempestFansub.Com",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://tempestscans.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TC"
  },
  {
    "id": "kotatsu_mangareader_tr_tempestfansubnet",
    "name": "tempestmangas.com",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://tempestfansub.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TC"
  },
  {
    "id": "kotatsu_mangareader_tr_tempestscans",
    "name": "TempestScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://adumanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TE"
  },
  {
    "id": "kotatsu_heancms_en_templescan",
    "name": "TempleScan",
    "description": "Kotatsu parser catalog source (heancms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://templetoons.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TE"
  },
  {
    "id": "kotatsu_es_templescanesp",
    "name": "TempleScanEsp",
    "description": "Kotatsu parser catalog source (es). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://templescanesp.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TE"
  },
  {
    "id": "kotatsu_mangareader_es_tenkaiscan",
    "name": "TenkaiScan",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://falcoscan.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TE"
  },
  {
    "id": "kotatsu_mangareader_id_masterkomik",
    "name": "Tenshi",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://tenshi01.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TE"
  },
  {
    "id": "kotatsu_tr_tenshimanga",
    "name": "Tenshi Manga",
    "description": "Kotatsu parser catalog source (tr). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://tenshimanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TM"
  },
  {
    "id": "kotatsu_madara_es_territorioleal",
    "name": "TerritorioLeal",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://territorioleal.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TE"
  },
  {
    "id": "kotatsu_mangareader_th_thaimanga",
    "name": "ThaiManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://thaimanga.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TH"
  },
  {
    "id": "kotatsu_madara_en_theblank",
    "name": "TheBlank",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://theblank.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TH"
  },
  {
    "id": "kotatsu_madara_en_theguildscans",
    "name": "TheGuildScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://theguildscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TH"
  },
  {
    "id": "kotatsu_mangareader_ar_thunderscans",
    "name": "ThunderScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://lavascans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TH"
  },
  {
    "id": "kotatsu_madara_tr_tilkiscans",
    "name": "TilkiScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://tilkiscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TI"
  },
  {
    "id": "kotatsu_madara_tr_timenaight",
    "name": "TimeNaight",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://timenaight.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TI"
  },
  {
    "id": "kotatsu_madara_tr_titanmanga",
    "name": "TitanManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://titanmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TI"
  },
  {
    "id": "kotatsu_madara_es_tmomanga",
    "name": "TmoManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://tmomanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TM"
  },
  {
    "id": "kotatsu_onemanga_fr_tokyorevengers",
    "name": "TokyoRevengers",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://tokyorevengers.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_madara_tr_tonizutoon",
    "name": "ToniZu.com",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://tonizu.top",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TC"
  },
  {
    "id": "kotatsu_hotcomics_de_toomics",
    "name": "Toomics",
    "description": "Kotatsu parser catalog source (hotcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "de",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_hotcomics_de_toomicsde",
    "name": "TooMicsDe",
    "description": "Kotatsu parser catalog source (hotcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "de",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_hotcomics_en_toomicsen",
    "name": "TooMicsEn",
    "description": "Kotatsu parser catalog source (hotcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_hotcomics_es_toomicses",
    "name": "TooMicsEs",
    "description": "Kotatsu parser catalog source (hotcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_hotcomics_es_toomicsesla",
    "name": "TooMicsEsLa",
    "description": "Kotatsu parser catalog source (hotcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_hotcomics_fr_toomicsfr",
    "name": "TooMicsFr",
    "description": "Kotatsu parser catalog source (hotcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_hotcomics_it_toomicsit",
    "name": "TooMicsIt",
    "description": "Kotatsu parser catalog source (hotcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "it",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_hotcomics_ja_toomicsja",
    "name": "TooMicsJa",
    "description": "Kotatsu parser catalog source (hotcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ja",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_hotcomics_pt_toomicspt",
    "name": "TooMicsPt",
    "description": "Kotatsu parser catalog source (hotcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_hotcomics_zh_toomicssc",
    "name": "TooMicsSc",
    "description": "Kotatsu parser catalog source (hotcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "zh",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_hotcomics_zh_toomicstc",
    "name": "TooMicsTc",
    "description": "Kotatsu parser catalog source (hotcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "zh",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_mangareader_th_toomtammanga",
    "name": "ToomtamManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://toomtam-manga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_madara_en_mangarosie",
    "name": "Toon69",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://toon69.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_madara_en_toonchill",
    "name": "ToonChill",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://toonchill.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_madara_en_mangaclash",
    "name": "ToonClash",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://toonclash.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_zeistmanga_id_tooncubus",
    "name": "ToonCubus",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://tooncubus.top",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_madara_fr_toonfr",
    "name": "ToonFr",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://toonfr.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_madara_en_toongod",
    "name": "ToonGod",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://toongod.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_mangareader_th_toonhunterparser",
    "name": "ToonHunter",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://toonhunter.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_madara_en_toonily",
    "name": "Toonily",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://toonily.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_madtheme_en_toonilyme",
    "name": "Toonily.Me",
    "description": "Kotatsu parser catalog source (madtheme). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://Toonily.Me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TM"
  },
  {
    "id": "kotatsu_madtheme_en_toonitube",
    "name": "TooniTube",
    "description": "Kotatsu parser catalog source (madtheme). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://toonitube.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_madara_en_toonizy",
    "name": "Toonizy",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://toonizy.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_madara_es_topcomicporno",
    "name": "TopComicPorno",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://topcomicporno.net",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_madara_en_topreadmanhwa",
    "name": "TopReadManhwa",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://topreadmanhwa.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_wpcomics_vi_toptruyen",
    "name": "TopTruyen",
    "description": "Kotatsu parser catalog source (wpcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://toptruyentv11.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_madara_tr_tortugaceviri",
    "name": "TortugaCeviri",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://tortugaceviri.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TO"
  },
  {
    "id": "kotatsu_madara_es_traduccionesamistosas",
    "name": "TraduccionesAmistosas",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://traduccionesamistosas.topmanhuas.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TR"
  },
  {
    "id": "kotatsu_mangareader_es_traduccionesmoonlight",
    "name": "TraduccionesMoonlight",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://traduccionesmoonlight.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TR"
  },
  {
    "id": "kotatsu_madara_en_treemanga",
    "name": "TreeManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://treemanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TR"
  },
  {
    "id": "kotatsu_mangareader_es_tresdaos",
    "name": "Tresdaos",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://threedaos.zdrz.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TR"
  },
  {
    "id": "kotatsu_madara_en_tritinia",
    "name": "Tritinia",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://tritinia.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TR"
  },
  {
    "id": "kotatsu_madara_tr_trmangaoku",
    "name": "TrMangaOku",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://trmangaoku.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TR"
  },
  {
    "id": "kotatsu_madtheme_en_truemanga",
    "name": "TrueManga",
    "description": "Kotatsu parser catalog source (madtheme). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://mangamonk.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TR"
  },
  {
    "id": "kotatsu_madara_vi_truyentranhdammyy",
    "name": "Truyện Tranh Đam Mỹ",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://truyentranhdammyy.site",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TN"
  },
  {
    "id": "kotatsu_madara_vi_truyentranhfull",
    "name": "Truyện Tranh Full",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://truyentranhfull.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TN"
  },
  {
    "id": "kotatsu_vi_truyenhentai18",
    "name": "TruyenHentai18",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://truyenhentai18.app",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "TR"
  },
  {
    "id": "kotatsu_vi_truyenhentaivn",
    "name": "TruyenHentaiVN",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://truyenhentaivn.club",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "TR"
  },
  {
    "id": "kotatsu_vi_truyenqq",
    "name": "TruyenQQ",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://truyenqqgo.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TR"
  },
  {
    "id": "kotatsu_vi_truyentranh3q",
    "name": "TruyenTranh3Q",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://truyentranh3qc.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TR"
  },
  {
    "id": "kotatsu_madara_vi_truyenvn",
    "name": "TruyenVn",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://truyenvn.shop",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TR"
  },
  {
    "id": "kotatsu_tr_trwebtoon",
    "name": "TrWebtoon",
    "description": "Kotatsu parser catalog source (tr). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://trwebtoon.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TR"
  },
  {
    "id": "kotatsu_mangareader_pt_tsundoku",
    "name": "Tsundoku",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://tsundoku.com.br",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TS"
  },
  {
    "id": "kotatsu_mangareader_id_tukangkomik",
    "name": "Tukang Komik",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://tukangkomik.co",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TK"
  },
  {
    "id": "kotatsu_es_tumangaonlineparser",
    "name": "TuMangaOnline",
    "description": "Kotatsu parser catalog source (es). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://zonatmo.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TU"
  },
  {
    "id": "kotatsu_manga18_es_tumanhwas",
    "name": "Tumanhwas",
    "description": "Kotatsu parser catalog source (manga18). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://tumanhwas.club",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TU"
  },
  {
    "id": "kotatsu_mangareader_es_tumanhwas",
    "name": "TuManhwas.com",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://tumanhwas.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TC"
  },
  {
    "id": "kotatsu_pizzareader_it_tuttoanimemanga",
    "name": "TuttoAnimeManga",
    "description": "Kotatsu parser catalog source (pizzareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "it",
    "baseUrl": "https://tuttoanimemanga.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TU"
  },
  {
    "id": "kotatsu_zeistmanga_pt_tyrantscans",
    "name": "TyrantScans",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://tyrantscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "TY"
  },
  {
    "id": "kotatsu_mangareader_es_ukiyotoon",
    "name": "UkiyoToon",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://nakamatoon.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "UK"
  },
  {
    "id": "kotatsu_zeistmanga_id_ulascomic",
    "name": "UlasComic",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://ulascomic00.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "UL"
  },
  {
    "id": "kotatsu_mangareader_ar_umimanga",
    "name": "UmiManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://umimanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "UM"
  },
  {
    "id": "kotatsu_gattsu_pt_universohentai",
    "name": "UniversoHentai",
    "description": "Kotatsu parser catalog source (gattsu). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://universohentai.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "UN"
  },
  {
    "id": "kotatsu_ru_grouple_usagiparser",
    "name": "Usagi",
    "description": "Kotatsu parser catalog source (ru). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://web.usagi.one",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "US"
  },
  {
    "id": "kotatsu_madara_en_utoon",
    "name": "UToon",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://utoon.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "UT"
  },
  {
    "id": "kotatsu_tr_uzaymanga",
    "name": "Uzay Manga",
    "description": "Kotatsu parser catalog source (tr). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://manga2.efsaneler.can.re",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "UM"
  },
  {
    "id": "kotatsu_madara_pt_valkyriescan",
    "name": "ValkyrieScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://valkyriescan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "VA"
  },
  {
    "id": "kotatsu_mangareader_en_varnascan",
    "name": "VarnaScan",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://varnascan.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "VA"
  },
  {
    "id": "kotatsu_vi_vcomycsparser",
    "name": "Vcomycs",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://vivicomi8.info",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "VC"
  },
  {
    "id": "kotatsu_vmp_es_vercomicsporno",
    "name": "VerComicsPorno",
    "description": "Kotatsu parser catalog source (vmp). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://vercomicsporno.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "VE"
  },
  {
    "id": "kotatsu_vmp_es_vermangasporno",
    "name": "VerMangasPorno",
    "description": "Kotatsu parser catalog source (vmp). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://vermangasporno.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "VE"
  },
  {
    "id": "kotatsu_madara_es_vermanhwa",
    "name": "Vermanhwa",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://vermanhwa.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "VE"
  },
  {
    "id": "kotatsu_mangareader_ar_vexmanga",
    "name": "VexManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://vortexscans.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "VE"
  },
  {
    "id": "kotatsu_mangareader_fr_vfscan",
    "name": "VfScan",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://vfscan.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "VF"
  },
  {
    "id": "kotatsu_madara_pt_villainessscan",
    "name": "VillainessScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://villainessscan.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "VI"
  },
  {
    "id": "kotatsu_onemanga_fr_vinlandsaga",
    "name": "VinlandSaga",
    "description": "Kotatsu parser catalog source (onemanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://vinlandsaga.fr",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "VI"
  },
  {
    "id": "kotatsu_en_violetscans",
    "name": "VioletScans",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://violetscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "VI"
  },
  {
    "id": "kotatsu_madara_tr_viyafansub",
    "name": "ViyaFansub",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://viyafansub.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "VI"
  },
  {
    "id": "kotatsu_vmp_vmpparser",
    "name": "Vmp",
    "description": "Kotatsu parser catalog source (vmp). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "VM"
  },
  {
    "id": "kotatsu_mangareader_en_voidscansco",
    "name": "VoidScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://voidscans.co",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "VO"
  },
  {
    "id": "kotatsu_iken_en_vortexscans",
    "name": "VortexScans",
    "description": "Kotatsu parser catalog source (iken). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://vortexscans.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "VO"
  },
  {
    "id": "kotatsu_en_vymanga",
    "name": "VyManga",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://vymanga.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "VY"
  },
  {
    "id": "kotatsu_madara_en_vyvymanga",
    "name": "VyvyManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://vyvymanga.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "VY"
  },
  {
    "id": "kotatsu_mangareader_it_walpurgiscan",
    "name": "WalpurgiScan",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "it",
    "baseUrl": "https://walpurgiscan.it",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WA"
  },
  {
    "id": "kotatsu_ru_wamangaparser",
    "name": "WaManga",
    "description": "Kotatsu parser catalog source (ru). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://wamanga.ru",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WA"
  },
  {
    "id": "kotatsu_mangareader_id_warungkomik",
    "name": "WarungKomik",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://warungkomik.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WA"
  },
  {
    "id": "kotatsu_madara_en_webdexscans",
    "name": "WebDexScans",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://webdexscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WE"
  },
  {
    "id": "kotatsu_madara_en_webtoon",
    "name": "Webtoon.uk",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://webtoon.uk",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WU"
  },
  {
    "id": "kotatsu_madara_en_webtoonxyz",
    "name": "Webtoon.xyz",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://webtoon.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WX"
  },
  {
    "id": "kotatsu_madara_ar_webtoonempire",
    "name": "WebtoonEmpire",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://webtoonempire-bl.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WE"
  },
  {
    "id": "kotatsu_madara_tr_webtoonhatti",
    "name": "WebtoonHatti",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://webtoonhatti.club",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WE"
  },
  {
    "id": "kotatsu_all_webtoonsparser",
    "name": "Webtoons English",
    "description": "Kotatsu parser catalog source (all). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://webtoons.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WE"
  },
  {
    "id": "kotatsu_madara_en_webtoonscan",
    "name": "WebtoonScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://webtoonscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WE"
  },
  {
    "id": "kotatsu_madara_tr_webtoontr",
    "name": "WebtoonTr",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://webtoontr.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WE"
  },
  {
    "id": "kotatsu_en_weebcentral",
    "name": "Weeb Central",
    "description": "Kotatsu parser catalog source (en). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://weebcentral.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WC"
  },
  {
    "id": "kotatsu_fmreader_ja_weloma",
    "name": "Weloma",
    "description": "Kotatsu parser catalog source (fmreader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ja",
    "baseUrl": "https://weloma.art",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WE"
  },
  {
    "id": "kotatsu_fmreader_ja_welovemanga",
    "name": "WeLoveManga",
    "description": "Kotatsu parser catalog source (fmreader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ja",
    "baseUrl": "https://welovemanga.one",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WE"
  },
  {
    "id": "kotatsu_mangareader_id_westmangaparser",
    "name": "WestManga",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://westmanga.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WE"
  },
  {
    "id": "kotatsu_madara_en_whalemanga",
    "name": "WhaleManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://whalemanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WH"
  },
  {
    "id": "kotatsu_madara_pt_wickedwitchscan",
    "name": "WickedWitchScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://wicked-witch-scan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WI"
  },
  {
    "id": "kotatsu_madara_pt_winterscan",
    "name": "WinterScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://winterscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WI"
  },
  {
    "id": "kotatsu_mangareader_en_witchscans",
    "name": "WitchScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://altayscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WI"
  },
  {
    "id": "kotatsu_mangareader_it_witcomics",
    "name": "WitComics",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "it",
    "baseUrl": "https://witcomics.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WI"
  },
  {
    "id": "kotatsu_zeistmanga_pt_wolfscanbr",
    "name": "WolfScanBr",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://wolfscanbr.blogspot.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WO"
  },
  {
    "id": "kotatsu_madara_pt_wonderlandscan",
    "name": "WonderlandScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://wonderlandscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WO"
  },
  {
    "id": "kotatsu_madara_en_woopread",
    "name": "Woopread",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://woopread.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WO"
  },
  {
    "id": "kotatsu_madara_id_worldmanhwas",
    "name": "WorldManhwas",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://worldmanhwas.zone",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WO"
  },
  {
    "id": "kotatsu_wpcomics_wpcomicsparser",
    "name": "Wp Comics",
    "description": "Kotatsu parser catalog source (wpcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://nettruyen1905.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "WC"
  },
  {
    "id": "kotatsu_mangareader_en_xcalibrscans",
    "name": "XCalibrScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://xcalibrscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "XC"
  },
  {
    "id": "kotatsu_gallery_zh_xiutaku",
    "name": "Xiutaku",
    "description": "Kotatsu parser catalog source (gallery). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "zh",
    "baseUrl": "https://xiutaku.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "XI"
  },
  {
    "id": "kotatsu_madara_id_xmanhwa",
    "name": "XManhwa",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://manhwaden.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "XM"
  },
  {
    "id": "kotatsu_wpcomics_en_xoxocomics",
    "name": "XoxoComics",
    "description": "Kotatsu parser catalog source (wpcomics). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://xoxocomic.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "XO"
  },
  {
    "id": "kotatsu_zeistmanga_ar_xsanomanga",
    "name": "XsanoManga",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://xsano-manga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "XS"
  },
  {
    "id": "kotatsu_madara_pt_xsscan",
    "name": "XsScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://xsscan.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "XS"
  },
  {
    "id": "kotatsu_mangareader_fr_xxxrevolutionscantrad",
    "name": "Xxx.RevolutionScantrad",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "fr",
    "baseUrl": "https://xxx.revolutionscantrad.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "XR"
  },
  {
    "id": "kotatsu_madara_pt_yanpfansub",
    "name": "YanpFansub",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://trisalyanp.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "YA"
  },
  {
    "id": "kotatsu_madara_en_yaoimobi",
    "name": "Yaoi.Mobi",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://yaoi.mobi",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "YM"
  },
  {
    "id": "kotatsu_madara_tr_yaoibar",
    "name": "YaoiBar",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://yaoibar.gay",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "YA"
  },
  {
    "id": "kotatsu_zeistmanga_pt_yaoifanclub",
    "name": "YaoiFanClub",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://yaoifanclub.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "YA"
  },
  {
    "id": "kotatsu_madara_tr_yaoiflix",
    "name": "YaoiFlix",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://yaoiflix.me",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "YA"
  },
  {
    "id": "kotatsu_madara_en_yaoihub",
    "name": "YaoiHub",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://yaoihub.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "YA"
  },
  {
    "id": "kotatsu_madara_es_yaoimanga",
    "name": "YaoiManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://yaoimanga.es",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "YA"
  },
  {
    "id": "kotatsu_madara_tr_yaoimangaoku",
    "name": "YaoiMangaOku",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://yaoimangaoku.net",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "YA"
  },
  {
    "id": "kotatsu_madara_en_yaoiscan",
    "name": "YaoiScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://yaoiscan.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "YA"
  },
  {
    "id": "kotatsu_madara_tr_yaoitr",
    "name": "YaoiTr",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://yaoitr.fun",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "YA"
  },
  {
    "id": "kotatsu_madara_pt_ycscan",
    "name": "YcScan",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://ycscan.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "YC"
  },
  {
    "id": "kotatsu_mangareader_en_ydcomics",
    "name": "YdComics",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://yd-comics.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "YD"
  },
  {
    "id": "kotatsu_madara_tr_yetiskinruyamanga",
    "name": "Yetişkin Rüya Manga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://yetiskinruyamanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "YK"
  },
  {
    "id": "kotatsu_sinmh_zh_ykmh",
    "name": "Ykmh",
    "description": "Kotatsu parser catalog source (sinmh). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "zh",
    "baseUrl": "https://ykmh.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "YK"
  },
  {
    "id": "kotatsu_zeistmanga_ar_yokaiteam",
    "name": "YokaiTeam",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://yokai-team.blogspot.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "YO"
  },
  {
    "id": "kotatsu_mangareader_pt_sssscanlator",
    "name": "YomuComics",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://yomucomics.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "YO"
  },
  {
    "id": "kotatsu_madara_ar_yonabar",
    "name": "YonaBar",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://yonabar.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "YO"
  },
  {
    "id": "kotatsu_madara_id_yubikiri",
    "name": "Yubikiri",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://yubikiri.my.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "YU"
  },
  {
    "id": "kotatsu_pt_yugenmangas",
    "name": "YugenApp",
    "description": "Kotatsu parser catalog source (pt). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://yugenmangasbr.voblog.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "YU"
  },
  {
    "id": "kotatsu_heancms_es_yugenmangases",
    "name": "YugenMangas.lat",
    "description": "Kotatsu parser catalog source (heancms). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://YugenMangas.lat",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "YL"
  },
  {
    "id": "kotatsu_mangareader_id_yumekomik",
    "name": "YumeKomik",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://yumekomik.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "YU"
  },
  {
    "id": "kotatsu_zmanga_id_yuramanga",
    "name": "YuraManga",
    "description": "Kotatsu parser catalog source (zmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://yuramanga.my.id",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "YU"
  },
  {
    "id": "kotatsu_vi_yurigardenparser",
    "name": "Yuri Garden",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://yurigarden.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "YG"
  },
  {
    "id": "kotatsu_mangareader_id_yurilab",
    "name": "YuriLab",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "id",
    "baseUrl": "https://yurilabs.my.id",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "YU"
  },
  {
    "id": "kotatsu_madara_pt_yurilive",
    "name": "YuriLive",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://yuri.live",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "YU"
  },
  {
    "id": "kotatsu_zeistmanga_ar_yurimoonsub",
    "name": "Yurimoonsub.blogspot.com",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ar",
    "baseUrl": "https://Yurimoonsub.blogspot.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "YB"
  },
  {
    "id": "kotatsu_vi_yurinekoparser",
    "name": "YuriNeko",
    "description": "Kotatsu parser catalog source (vi). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "vi",
    "baseUrl": "https://encrypted-tbn0.gstatic.com",
    "contentRating": "explicit",
    "isNsfw": true,
    "method": "Scraping",
    "icon": "YU"
  },
  {
    "id": "kotatsu_zmanga_zmangaparser",
    "name": "Z Manga",
    "description": "Kotatsu parser catalog source (zmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://komikindo.info",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ZM"
  },
  {
    "id": "kotatsu_mangareader_en_zahard",
    "name": "Zahard",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://zahard.xyz",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ZA"
  },
  {
    "id": "kotatsu_madara_tr_zamanmanga",
    "name": "ZamanManga",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://zamanmanga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ZA"
  },
  {
    "id": "kotatsu_madara_en_zandynofansub",
    "name": "Zandyno Fansub",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://zandynofansub.aishiteru.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ZF"
  },
  {
    "id": "kotatsu_zeistmanga_zeistmangaparser",
    "name": "Zeist Manga",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "multi",
    "baseUrl": "https://div.filter",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ZM"
  },
  {
    "id": "kotatsu_mangareader_tr_zenithscans",
    "name": "ZenithScans",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "tr",
    "baseUrl": "https://zenithscans.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ZE"
  },
  {
    "id": "kotatsu_ru_zenmangaparser",
    "name": "ZenManga",
    "description": "Kotatsu parser catalog source (ru). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://sso.inuko.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ZE"
  },
  {
    "id": "kotatsu_madara_es_zevep",
    "name": "Zevep",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "es",
    "baseUrl": "https://zevep.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ZE"
  },
  {
    "id": "kotatsu_madara_en_zinmangacom",
    "name": "Zin-Manga.com",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://zin-manga.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ZM"
  },
  {
    "id": "kotatsu_madara_en_zinchanmanga",
    "name": "ZinChanManga.Com",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://zinchangmanga.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ZC"
  },
  {
    "id": "kotatsu_madara_en_rio2manganet",
    "name": "ZinchanManga.mobi",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://zinchanmanga.mobi",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ZM"
  },
  {
    "id": "kotatsu_madara_en_zinchanmanganet",
    "name": "ZinchanManga.net",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://zinchangmanga.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ZN"
  },
  {
    "id": "kotatsu_madara_en_zinmangacc",
    "name": "ZinManga.cc",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://zinmanga.cc",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ZC"
  },
  {
    "id": "kotatsu_madara_en_zinmangams",
    "name": "ZinManga.ms",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://zinmanga.ms",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ZM"
  },
  {
    "id": "kotatsu_madara_en_zinmanga",
    "name": "ZinManga.net",
    "description": "Kotatsu parser catalog source (madara). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "en",
    "baseUrl": "https://zinmanga.net",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ZN"
  },
  {
    "id": "kotatsu_zeistmanga_pt_zscanlation",
    "name": "ZScanlation",
    "description": "Kotatsu parser catalog source (zeistmanga). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "pt",
    "baseUrl": "https://zscanlation.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ZS"
  },
  {
    "id": "kotatsu_ru_multichan_mangachanparser",
    "name": "Манга-тян",
    "description": "Kotatsu parser catalog source (ru). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://manga-chan.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "МА"
  },
  {
    "id": "kotatsu_ru_remangaparser",
    "name": "Реманга",
    "description": "Kotatsu parser catalog source (ru). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://api.remanga.org",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "РЕ"
  },
  {
    "id": "kotatsu_ru_multichan_henchanparser",
    "name": "Хентай-тян",
    "description": "Kotatsu parser catalog source (ru). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://x5.h-chan.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ХЕ"
  },
  {
    "id": "kotatsu_ru_multichan_yaoichanparser",
    "name": "Яой-тян",
    "description": "Kotatsu parser catalog source (ru). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "ru",
    "baseUrl": "https://v9.yaoi-chan.me",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "ЯО"
  },
  {
    "id": "kotatsu_mangareader_th_sodsaime",
    "name": "สดใสเมะ",
    "description": "Kotatsu parser catalog source (mangareader). Parser generic web aktif di Grimoire jika domain source bisa diakses.",
    "language": "th",
    "baseUrl": "https://xn--l3c0azab5a2gta.com",
    "contentRating": "suggestive",
    "isNsfw": false,
    "method": "Scraping",
    "icon": "สด"
  }
];
const IMPLEMENTED_SOURCE_METADATA = [
  {
    id: "mangadex",
    name: "MangaDex",
    description: "Community manga catalog using the official MangaDex REST API.",
    language: "multi",
    baseUrl: "https://mangadex.org",
    contentRating: "suggestive",
    isNsfw: false,
    method: "Official API",
    icon: "MD"
  },
  {
    id: "mangafire",
    name: "MangaFire",
    description: "English manga source using the MangaFire HTML catalog and AJAX reader endpoints.",
    language: "en",
    baseUrl: "https://mangafire.to",
    contentRating: "suggestive",
    isNsfw: false,
    method: "Scraping + API",
    icon: "MF"
  },
  {
    id: "mangaplus",
    name: "MangaPlus",
    description: "Official Shueisha catalog using the same MANGA Plus web API shape as Kotatsu.",
    language: "en/ja",
    baseUrl: "https://mangaplus.shueisha.co.jp",
    contentRating: "safe",
    isNsfw: false,
    method: "Unofficial API",
    icon: "M+"
  },
  {
    id: "batoto",
    name: "Bato.to",
    description: "Large multilingual community source using Bato browse/detail selectors.",
    language: "multi",
    baseUrl: "https://wto.to",
    contentRating: "suggestive",
    isNsfw: false,
    method: "Scraping",
    icon: "BT"
  },
  {
    id: "doujindesu",
    name: "DoujinDesu.tv",
    description: "Indonesian explicit source ported directly from the Kotatsu DoujinDesu parser flow.",
    language: "id",
    baseUrl: "https://doujindesu.tv",
    contentRating: "explicit",
    isNsfw: true,
    method: "Scraping",
    icon: "DD"
  },
  {
    id: "komiku",
    name: "Komiku",
    description: "Indonesian source using the current Komiku API HTML partials and reader pages.",
    language: "id",
    baseUrl: "https://komiku.org",
    contentRating: "safe",
    isNsfw: false,
    method: "Scraping",
    icon: "KO"
  },
  {
    id: "shinigami",
    name: "Shinigami ID",
    description: "Indonesian manga, manhwa, and manhua source using the Shinigami API.",
    language: "id",
    baseUrl: "https://g.shinigami.asia",
    contentRating: "suggestive",
    isNsfw: false,
    method: "Unofficial API",
    icon: "SH"
  },
  {
    id: "komikcast",
    name: "Komikcast",
    description: "Indonesian komik source using the current Komikcast backend API.",
    language: "id",
    baseUrl: "https://v2.komikcast.fit",
    contentRating: "suggestive",
    isNsfw: false,
    method: "Unofficial API",
    icon: "KC"
  },
  {
    id: "komiktap",
    name: "KomikTap",
    description: "Indonesian source ported from Kotatsu MangaReaderParser with KomikTap page parsing.",
    language: "id",
    baseUrl: "https://komiktap.info",
    contentRating: "suggestive",
    isNsfw: false,
    method: "Scraping",
    icon: "KT"
  }
];
const SOURCE_METADATA = [...IMPLEMENTED_SOURCE_METADATA, ...KOTATSU_SOURCE_CATALOG];
class PlaceholderSource {
  id;
  name;
  baseUrl;
  language;
  contentRating = "suggestive";
  isNsfw = false;
  method;
  constructor(options) {
    this.id = options.id;
    this.name = options.name;
    this.baseUrl = options.baseUrl;
    this.language = options.language;
    this.method = options.method;
  }
  async getList(page, _filters) {
    throw Object.assign(
      new Error(`${this.name} belum punya parser aktif. Source ini baru terdaftar di registry (${this.method}) dan belum bisa menampilkan daftar manga.`),
      {
        status: 501,
        code: "SOURCE_NOT_IMPLEMENTED",
        page
      }
    );
  }
  async search(_query, page, _filters) {
    throw Object.assign(
      new Error(`${this.name} belum punya parser aktif. Search untuk source ini belum diimplementasikan.`),
      {
        status: 501,
        code: "SOURCE_NOT_IMPLEMENTED",
        page
      }
    );
  }
  async getDetail(mangaId) {
    throw Object.assign(new Error(`${this.name} parser is scaffolded but not implemented yet`), {
      status: 501,
      code: "SOURCE_NOT_IMPLEMENTED",
      mangaId
    });
  }
  async getChapters(_mangaId) {
    return [];
  }
  async getPages(_chapterId) {
    return [];
  }
  async getFilters() {
    return [
      {
        id: "sort",
        label: "Sort",
        type: "select",
        values: [
          { label: "Popular", value: "popular" },
          { label: "Newest", value: "newest" },
          { label: "Updated", value: "updated" }
        ]
      }
    ];
  }
  async getHealth() {
    return {
      status: "limited",
      message: `${this.method} adapter scaffold is ready for implementation`
    };
  }
}
const API_BASE = "https://api.shngm.io/v1";
const CDN_BASE = "https://assets.shngm.id";
const SITE_BASE = "https://g.shinigami.asia";
const PAGE_LIMIT = 24;
const REQUEST_TIMEOUT = 15e3;
function statusFrom(value) {
  if (value === 2) return "completed";
  if (value === 3) return "hiatus";
  return "ongoing";
}
function mangaUrl(id) {
  return `${SITE_BASE}/series/${id}`;
}
function sortFrom(filters) {
  const sort = filters?.find((entry) => entry.id === "sort")?.value;
  if (sort === "rating") return "rating";
  if (sort === "newest" || sort === "updated") return "latest";
  if (sort === "popular") return "popularity";
  return "latest";
}
function mangaFromEntity(entity) {
  const authors = entity.taxonomy?.Author?.map((item) => item.name).filter(Boolean) ?? [];
  const format = entity.taxonomy?.Format?.map((item) => normalizeMangaFormat(item.name)).find(Boolean);
  return {
    id: entity.manga_id,
    sourceId: "shinigami",
    title: entity.title,
    coverUrl: entity.cover_image_url ?? entity.cover_portrait_url ?? "",
    author: authors.join(", ") || void 0,
    artist: entity.taxonomy?.Artist?.map((item) => item.name).filter(Boolean).join(", ") || void 0,
    description: entity.description,
    format,
    status: statusFrom(entity.status),
    genres: entity.taxonomy?.Genre?.map((genre) => genre.name).filter(Boolean).slice(0, 8) ?? [],
    rating: entity.user_rate,
    url: mangaUrl(entity.manga_id)
  };
}
function chapterFromEntity(entity) {
  return {
    id: entity.chapter_id,
    mangaId: entity.manga_id,
    sourceId: "shinigami",
    number: entity.chapter_number ?? 0,
    title: entity.chapter_title?.trim() || void 0,
    thumbnailUrl: entity.thumbnail_image_url,
    language: "id",
    uploadedAt: entity.release_date ?? (/* @__PURE__ */ new Date()).toISOString(),
    url: `${SITE_BASE}/chapter/${entity.chapter_id}`
  };
}
async function shinigamiFetch(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        Accept: "application/json",
        Referer: `${SITE_BASE}/`,
        "User-Agent": "GrimoireReader/0.1"
      },
      signal: controller.signal
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "network request failed";
    throw Object.assign(new Error(`Shinigami tidak bisa diakses dari jaringan ini (${message}).`), {
      status: 503,
      code: "SOURCE_NETWORK_BLOCKED"
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw Object.assign(new Error(`Shinigami request failed with HTTP ${response.status}`), {
      status: response.status,
      code: "SOURCE_REQUEST_FAILED"
    });
  }
  return response.json();
}
function listPath(page, filters, query) {
  const params = new URLSearchParams({
    page: String(Math.max(1, page)),
    page_size: String(PAGE_LIMIT),
    sort: sortFrom(filters),
    sort_order: "desc"
  });
  if (query?.trim()) {
    params.set("q", query.trim().split(/\s+/).join(" "));
  }
  return `/manga/list?${params.toString()}`;
}
class ShinigamiSource {
  id = "shinigami";
  name = "Shinigami ID";
  baseUrl = SITE_BASE;
  language = "id";
  contentRating = "suggestive";
  isNsfw = false;
  async getList(page, filters) {
    const response = await shinigamiFetch(
      listPath(page, filters)
    );
    return {
      items: response.data.map(mangaFromEntity),
      page,
      hasNextPage: page < (response.meta?.total_page ?? page),
      total: response.meta?.total_record
    };
  }
  async search(query, page, filters) {
    if (!query.trim()) return this.getList(page, filters);
    const response = await shinigamiFetch(
      listPath(page, filters, query)
    );
    return {
      items: response.data.map(mangaFromEntity),
      page,
      hasNextPage: page < (response.meta?.total_page ?? page),
      total: response.meta?.total_record
    };
  }
  async getDetail(mangaId) {
    const response = await shinigamiFetch(
      `/manga/detail/${encodeURIComponent(mangaId)}`
    );
    const manga = mangaFromEntity(response.data);
    return {
      ...manga,
      alternateTitles: response.data.alternative_title ? [response.data.alternative_title] : [],
      year: Number(response.data.release_year) || void 0
    };
  }
  async getChapters(mangaId) {
    const params = new URLSearchParams({
      page: "1",
      page_size: "9999",
      sort_by: "chapter_number",
      sort_order: "asc"
    });
    const response = await shinigamiFetch(
      `/chapter/${encodeURIComponent(mangaId)}/list?${params.toString()}`
    );
    return response.data.map(chapterFromEntity).sort((left, right) => right.number - left.number);
  }
  async getPages(chapterId) {
    const response = await shinigamiFetch(
      `/chapter/detail/${encodeURIComponent(chapterId)}`
    );
    const baseUrl = response.data.base_url ?? CDN_BASE;
    const path = response.data.chapter?.path ?? "";
    return (response.data.chapter?.data ?? []).map((image) => `${baseUrl}${path}${image}`);
  }
  async getFilters() {
    return [
      {
        id: "sort",
        label: "Sort",
        type: "select",
        values: [
          { label: "Popular", value: "popular" },
          { label: "Newest", value: "newest" },
          { label: "Updated", value: "updated" },
          { label: "Rating", value: "rating" }
        ]
      }
    ];
  }
}
const SOURCE_REGISTRY = {
  mangadex: new MangaDexSource(),
  mangafire: new MangaFireSource(),
  mangaplus: new MangaPlusSource(),
  batoto: new BatoToSource(),
  doujindesu: new DoujinDesuSource("doujindesu"),
  kotatsu_id_doujindesuparser: new DoujinDesuSource("kotatsu_id_doujindesuparser"),
  komiku: new KomikuSource(),
  shinigami: new ShinigamiSource(),
  komikcast: new KomikcastSource(),
  komiktap: new KomikTapSource("komiktap"),
  kotatsu_mangareader_id_komiktapparser: new KomikTapSource("kotatsu_mangareader_id_komiktapparser")
};
function getSource(sourceId) {
  const source = SOURCE_REGISTRY[sourceId];
  if (source) return source;
  const metadata = SOURCE_METADATA.find((item) => item.id === sourceId);
  if (metadata) {
    if (isUsableSourceUrl(metadata.baseUrl)) return new KotatsuGenericSource(metadata);
    return new PlaceholderSource({
      id: metadata.id,
      name: metadata.name,
      baseUrl: metadata.baseUrl,
      language: metadata.language,
      method: metadata.method
    });
  }
  {
    throw Object.assign(new Error(`Unknown source: ${sourceId}`), {
      status: 404,
      code: "SOURCE_NOT_FOUND"
    });
  }
}
function sourceDomains() {
  return [
    ...new Set(
      SOURCE_METADATA.filter((source) => isUsableSourceUrl(source.baseUrl)).map((source) => {
        try {
          return new URL(source.baseUrl).hostname;
        } catch {
          return "";
        }
      }).filter(Boolean)
    )
  ];
}
function isUsableSourceUrl(baseUrl) {
  try {
    const url = new URL(baseUrl);
    const hostname = url.hostname.toLowerCase();
    return ["http:", "https:"].includes(url.protocol) && hostname.includes(".") && !hostname.includes("$") && !hostname.startsWith("div.") && hostname !== "encrypted-tbn0.gstatic.com";
  } catch {
    return false;
  }
}
export {
  SOURCE_METADATA as S,
  SOURCE_REGISTRY as a,
  getSource as g,
  isUsableSourceUrl as i,
  sourceDomains as s
};
