import { createDecipheriv, createHash } from "node:crypto";
import * as cheerio from "cheerio";
const SITE_BASE$5 = "https://wto.to";
const REQUEST_TIMEOUT$6 = 15e3;
function encodeId$2(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}
function decodeId$2(value) {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return value;
  }
}
function clean$2(text) {
  return text?.replace(/\s+/g, " ").trim() ?? "";
}
function absoluteUrl$2(baseUrl, href) {
  if (!href) return "";
  return new URL(href, baseUrl).toString();
}
function statusFrom$6(text) {
  const value = text?.toLowerCase() ?? "";
  if (value.includes("completed")) return "completed";
  if (value.includes("cancelled")) return "cancelled";
  if (value.includes("hiatus")) return "hiatus";
  return "ongoing";
}
function numberFrom$2(text, fallback) {
  const match = text.replace(",", ".").match(/([0-9]+(?:\.[0-9]+)?)/);
  return match ? Number(match[1]) : fallback;
}
function sortFrom$4(filters) {
  const sort = filters?.find((entry) => entry.id === "sort")?.value;
  if (sort === "popular") return "views_a.za";
  if (sort === "newest") return "create.za";
  return "update.za";
}
async function fetchHtml$1(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT$6);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        Referer: `${SITE_BASE$5}/`,
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
  return node.children().map((_, element) => clean$2($(element).text())).get().filter(Boolean);
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
  baseUrl = SITE_BASE$5;
  language = "multi";
  contentRating = "suggestive";
  isNsfw = false;
  async getList(page, filters) {
    const url = new URL("/browse", SITE_BASE$5);
    url.searchParams.set("sort", sortFrom$4(filters));
    url.searchParams.set("page", String(Math.max(1, page)));
    const items = this.parseList(await fetchHtml$1(url.toString()));
    return { items, page, hasNextPage: items.length > 0 };
  }
  async search(query, page) {
    if (!query.trim()) return this.getList(page);
    const url = new URL("/search", SITE_BASE$5);
    url.searchParams.set("word", query.trim());
    url.searchParams.set("page", String(Math.max(1, page)));
    const items = this.parseList(await fetchHtml$1(url.toString()));
    return { items, page, hasNextPage: items.length > 0 };
  }
  async getDetail(mangaId) {
    const url = decodeId$2(mangaId);
    const $ = cheerio.load(await fetchHtml$1(url));
    const root = $("#mainer");
    const details = root.find(".detail-set").first();
    const attrs = /* @__PURE__ */ new Map();
    details.find(".attr-main .attr-item").each((_, element) => {
      const children = $(element).children();
      attrs.set(clean$2(children.eq(0).text()), children.eq(1));
    });
    const title = clean$2(root.find("h3.item-title").text()) || "Untitled";
    return {
      id: mangaId,
      sourceId: this.id,
      title,
      coverUrl: absoluteUrl$2(url, details.find("img[src]").attr("src")),
      author: clean$2(attrs.get("Authors:")?.text()) || void 0,
      description: details.find("#limit-height-body-summary .limit-html").html() ?? void 0,
      status: statusFrom$6(clean$2(attrs.get("Original work:")?.text())),
      genres: attrs.get("Genres:") ? parseTags($, attrs.get("Genres:")) : [],
      url,
      alternateTitles: [clean$2(root.find(".item-alias").text())].filter(Boolean)
    };
  }
  async getChapters(mangaId) {
    const url = decodeId$2(mangaId);
    const $ = cheerio.load(await fetchHtml$1(url));
    return $(".episode-list .main").children().map((index, element) => {
      const node = $(element);
      const link = node.find("a.chapt").first();
      const chapterUrl = absoluteUrl$2(url, link.attr("href"));
      const title = clean$2(link.text());
      const extra = node.find(".extra");
      return {
        id: encodeId$2(chapterUrl),
        mangaId,
        sourceId: this.id,
        number: numberFrom$2(title, index + 1),
        title,
        language: "multi",
        uploadedAt: relativeDate(clean$2(extra.find("i").last().text())),
        scanlator: clean$2(extra.find('a[href*="/group/"]').text()) || void 0,
        url: chapterUrl
      };
    }).get().filter((chapter) => chapter.url).reverse();
  }
  async getPages(chapterId) {
    const url = decodeId$2(chapterId);
    const $ = cheerio.load(await fetchHtml$1(url));
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
      const url = absoluteUrl$2(SITE_BASE$5, link.attr("href"));
      const title = clean$2(node.find(".item-title").text());
      return {
        id: encodeId$2(url),
        sourceId: this.id,
        title,
        coverUrl: absoluteUrl$2(SITE_BASE$5, node.find("img[src]").attr("src")),
        status: "ongoing",
        genres: node.find(".item-genre").length ? parseTags($, node.find(".item-genre")) : [],
        url
      };
    }).get().filter((manga) => Boolean(manga.url && manga.title));
  }
}
const API_BASE$4 = "https://be.komikcast.cc";
const SITE_BASE$4 = "https://v2.komikcast.fit";
const PAGE_LIMIT$4 = 24;
const REQUEST_TIMEOUT$5 = 15e3;
function statusFrom$5(value) {
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
  return `${SITE_BASE$4}/komik/${slug ?? ""}`;
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
    status: statusFrom$5(data.status),
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
    url: `${SITE_BASE$4}/chapter/${entity.id}`
  };
}
async function komikcastFetch(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT$5);
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
    take: String(PAGE_LIMIT$4),
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
  baseUrl = SITE_BASE$4;
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
const SITE_BASE$3 = "https://komiku.org";
const API_BASE$3 = "https://api.komiku.org";
const REQUEST_TIMEOUT$4 = 15e3;
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
function absoluteUrl$1(baseUrl, href) {
  if (!href) return "";
  return new URL(href, baseUrl).toString();
}
function statusFrom$4(text) {
  const value = text?.toLowerCase() ?? "";
  if (value.includes("completed") || value.includes("tamat") || value.includes("end")) return "completed";
  if (value.includes("hiatus")) return "hiatus";
  return "ongoing";
}
function numberFrom$1(text) {
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
async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT$4);
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
  const url = absoluteUrl$1(SITE_BASE$3, link.attr("href"));
  const title = clean$1(link.find("h3").text());
  if (!url || !title) return null;
  return {
    id: encodeId$1(url),
    sourceId: "komiku",
    title,
    coverUrl: node.find("img").first().attr("data-src") ?? node.find("img").first().attr("src") ?? "",
    status: "ongoing",
    genres: clean$1(node.find(".tpe1_inf").text()).split(/\s+/).filter((part) => part && !/manga|manhwa|manhua/i.test(part)).slice(0, 4),
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
    const items = this.parseList(await fetchHtml(url.toString()));
    return { items, page, hasNextPage: items.length > 0 };
  }
  async search(query, page) {
    if (!query.trim()) return this.getList(page);
    const url = new URL(page > 1 ? `/page/${page}/` : "/", API_BASE$3);
    url.searchParams.set("post_type", "manga");
    url.searchParams.set("s", query.trim());
    const items = this.parseList(await fetchHtml(url.toString()));
    return { items, page, hasNextPage: items.length > 0 };
  }
  async getDetail(mangaId) {
    const url = decodeId$1(mangaId);
    const $ = cheerio.load(await fetchHtml(url));
    const title = clean$1($("h1").first().text()).replace(/^Komik\s+/i, "") || "Untitled";
    const statusText = clean$1($("table.inftable tr:has(td:contains(Status)) td:last-child").text());
    const coverUrl2 = $("div.ims > img").attr("src")?.split("?")[0] ?? "";
    return {
      id: mangaId,
      sourceId: this.id,
      title,
      coverUrl: coverUrl2,
      author: clean$1($("table.inftable tr:has(td:contains(Pengarang)) td:last-child").text()) || void 0,
      description: clean$1($("#Sinopsis > p").text()),
      status: statusFrom$4(statusText),
      genres: $("ul.genre li.genre a").map((_, element) => clean$1($(element).text())).get().filter(Boolean),
      url,
      alternateTitles: [
        clean$1($("table.inftable tr:has(td:contains(Judul Indonesia)) td:last-child").text())
      ].filter(Boolean)
    };
  }
  async getChapters(mangaId) {
    const mangaUrl2 = decodeId$1(mangaId);
    const $ = cheerio.load(await fetchHtml(mangaUrl2));
    return $("#Daftar_Chapter tr:has(td.judulseries)").map((_, element) => {
      const link = $(element).find("td.judulseries a").first();
      const chapterUrl = absoluteUrl$1(SITE_BASE$3, link.attr("href"));
      const title = clean$1(link.text());
      return {
        id: encodeId$1(chapterUrl),
        mangaId,
        sourceId: this.id,
        number: numberFrom$1(title),
        title,
        language: "id",
        uploadedAt: parseDate(clean$1($(element).find("td.tanggalseries").text())),
        scanlator: this.name,
        url: chapterUrl
      };
    }).get().sort((left, right) => right.number - left.number);
  }
  async getPages(chapterId) {
    const chapterUrl = decodeId$1(chapterId);
    const $ = cheerio.load(await fetchHtml(chapterUrl));
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
const API_BASE$2 = "https://api.mangadex.org";
const COVER_BASE = "https://uploads.mangadex.org/covers";
const PAGE_LIMIT$3 = 24;
const USER_AGENT = "GrimoireReader/0.1 (+https://example.local)";
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
        "User-Agent": USER_AGENT
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
  return "order[followedCount]=desc";
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
function clean(text) {
  return text?.replace(/\s+/g, " ").trim() ?? "";
}
function absoluteUrl(baseUrl, href) {
  if (!href) return "";
  return new URL(href, baseUrl).toString();
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
async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT$2);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/json",
        Referer: `${SITE_BASE$2}/`,
        "User-Agent": "GrimoireReader/0.1"
      },
      signal: controller.signal
    });
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
    const $ = cheerio.load(await fetchText(mangaUrl2));
    return $('.m-list .tab-content[data-name="chapter"] .list-body ul li').map((_, element) => {
      const node = $(element);
      const link = node.find("a").first();
      const number = numberFrom(node.attr("data-number"));
      const title = clean(link.attr("title")) || clean(link.find("span").first().text()) || `Chapter ${number}`;
      return {
        id: encodeId(absoluteUrl(SITE_BASE$2, link.attr("href"))),
        mangaId,
        sourceId: this.id,
        number,
        title,
        language: LANGUAGE,
        uploadedAt: clean(link.find("span").last().text()) || (/* @__PURE__ */ new Date()).toISOString(),
        url: absoluteUrl(SITE_BASE$2, link.attr("href"))
      };
    }).get().sort((left, right) => right.number - left.number);
  }
  async getPages(chapterId) {
    const chapterUrl = decodeId(chapterId);
    const html = await fetchText(chapterUrl);
    const $ = cheerio.load(html);
    const directImages = $("img.chapter-page, #page-wrapper img, .page-reader img").map((_, element) => $(element).attr("data-src") ?? $(element).attr("src")).get().filter((src) => /\.(webp|jpe?g|png)(\?|$)/i.test(src));
    if (directImages.length) return directImages;
    const dataId = $("body").attr("data-chapter-id") ?? $("body").attr("data-cid") ?? $("body").attr("data-disqus-id")?.replace(/^mangafire-/, "") ?? chapterUrl.split("/").pop() ?? chapterUrl;
    const vrf = generateVrf(`chapter@${dataId}`);
    const response = await fetchJson(
      `${SITE_BASE$2}/ajax/read/chapter/${dataId}?vrf=${encodeURIComponent(vrf)}`
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
  return "popular";
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
const API_BASE = "https://api.shngm.io/v1";
const CDN_BASE = "https://assets.shngm.id";
const SITE_BASE = "https://shinigami.cv";
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
  return "popularity";
}
function mangaFromEntity(entity) {
  const authors = entity.taxonomy?.Author?.map((item) => item.name).filter(Boolean) ?? [];
  return {
    id: entity.manga_id,
    sourceId: "shinigami",
    title: entity.title,
    coverUrl: entity.cover_image_url ?? entity.cover_portrait_url ?? "",
    author: authors.join(", ") || void 0,
    artist: entity.taxonomy?.Artist?.map((item) => item.name).filter(Boolean).join(", ") || void 0,
    description: entity.description,
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
  komiku: new KomikuSource(),
  shinigami: new ShinigamiSource(),
  komikcast: new KomikcastSource()
};
function getSource(sourceId) {
  const source = SOURCE_REGISTRY[sourceId];
  if (!source) {
    throw Object.assign(new Error(`Unknown source: ${sourceId}`), {
      status: 404,
      code: "SOURCE_NOT_FOUND"
    });
  }
  return source;
}
function sourceDomains() {
  return Object.values(SOURCE_REGISTRY).map((source) => new URL(source.baseUrl).hostname);
}
export {
  SOURCE_REGISTRY as S,
  getSource as g,
  sourceDomains as s
};
