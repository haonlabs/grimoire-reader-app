import { createDecipheriv, createHash } from 'node:crypto';
import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import type {
  Chapter,
  FilterInput,
  FilterOption,
  Manga,
  MangaDetail,
  MangaListResult,
  MangaSource,
  MangaStatus
} from '$lib/sources/types';

const SITE_BASE = 'https://wto.to';
const REQUEST_TIMEOUT = 15_000;

function encodeId(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeId(value: string) {
  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch {
    return value;
  }
}

function clean(text?: string) {
  return text?.replace(/\s+/g, ' ').trim() ?? '';
}

function absoluteUrl(baseUrl: string, href?: string) {
  if (!href) return '';
  return new URL(href, baseUrl).toString();
}

function statusFrom(text?: string): MangaStatus {
  const value = text?.toLowerCase() ?? '';
  if (value.includes('completed')) return 'completed';
  if (value.includes('cancelled')) return 'cancelled';
  if (value.includes('hiatus')) return 'hiatus';
  return 'ongoing';
}

function numberFrom(text: string, fallback: number) {
  const match = text.replace(',', '.').match(/([0-9]+(?:\.[0-9]+)?)/);
  return match ? Number(match[1]) : fallback;
}

function sortFrom(filters?: FilterInput[]) {
  const sort = filters?.find((entry) => entry.id === 'sort')?.value;
  if (sort === 'popular') return 'views_a.za';
  if (sort === 'newest') return 'create.za';
  return 'update.za';
}

async function fetchHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        Referer: `${SITE_BASE}/`,
        'User-Agent': 'GrimoireReader/0.1'
      },
      signal: controller.signal
    });
    if (!response.ok) {
      const text = await response.text();
      if (/challenge-platform|cf-mitigated|Just a moment/i.test(text)) {
        throw Object.assign(new Error('Bato.to sedang memblokir request otomatis dengan Cloudflare challenge.'), {
          status: 503,
          code: 'SOURCE_ANTI_BOT'
        });
      }
      throw Object.assign(new Error(`Bato.to returned HTTP ${response.status}`), {
        status: response.status,
        code: 'SOURCE_HTTP_ERROR'
      });
    }
    return response.text();
  } catch (error) {
    if (error instanceof Error && 'status' in error) throw error;
    const message = error instanceof Error ? error.message : 'network request failed';
    throw Object.assign(new Error(`Bato.to tidak bisa diakses dari jaringan ini (${message}).`), {
      status: 503,
      code: 'SOURCE_NETWORK_BLOCKED'
    });
  } finally {
    clearTimeout(timeout);
  }
}

function relativeDate(value?: string) {
  const match = value?.match(/(\d+)\s*(sec|min|hour|day|week|month|year)/i);
  if (!match) return new Date().toISOString();
  const date = new Date();
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 'sec') date.setSeconds(date.getSeconds() - amount);
  if (unit === 'min') date.setMinutes(date.getMinutes() - amount);
  if (unit === 'hour') date.setHours(date.getHours() - amount);
  if (unit === 'day') date.setDate(date.getDate() - amount);
  if (unit === 'week') date.setDate(date.getDate() - amount * 7);
  if (unit === 'month') date.setMonth(date.getMonth() - amount);
  if (unit === 'year') date.setFullYear(date.getFullYear() - amount);
  return date.toISOString();
}

function parseTags($: cheerio.CheerioAPI, node: cheerio.Cheerio<AnyNode>) {
  return node
    .children()
    .map((_, element) => clean($(element).text()))
    .get()
    .filter(Boolean);
}

function evpBytesToKey(password: Buffer, salt: Buffer, keyLength: number, ivLength: number) {
  let generated = Buffer.alloc(0);
  let block = Buffer.alloc(0);
  while (generated.length < keyLength + ivLength) {
    const hash = createHash('md5');
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

function decryptOpenSslAes(value: string, password: string) {
  const data = Buffer.from(value, 'base64');
  const salt = data.subarray(8, 16);
  const encrypted = data.subarray(16);
  const { key, iv } = evpBytesToKey(Buffer.from(password, 'utf8'), salt, 32, 16);
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

function evaluateBatoPass(expression: string) {
  const trimmed = expression.trim();
  if (/^['"].*['"]$/.test(trimmed)) return trimmed.slice(1, -1);
  return String(Function(`"use strict"; return (${trimmed});`)());
}

export class BatoToSource implements MangaSource {
  readonly id = 'batoto';
  readonly name = 'Bato.to';
  readonly baseUrl = SITE_BASE;
  readonly language = 'multi';
  readonly contentRating = 'suggestive' as const;
  readonly isNsfw = false;

  async getList(page: number, filters?: FilterInput[]): Promise<MangaListResult> {
    const url = new URL('/browse', SITE_BASE);
    url.searchParams.set('sort', sortFrom(filters));
    url.searchParams.set('page', String(Math.max(1, page)));
    const items = this.parseList(await fetchHtml(url.toString()));
    return { items, page, hasNextPage: items.length > 0 };
  }

  async search(query: string, page: number): Promise<MangaListResult> {
    if (!query.trim()) return this.getList(page);
    const url = new URL('/search', SITE_BASE);
    url.searchParams.set('word', query.trim());
    url.searchParams.set('page', String(Math.max(1, page)));
    const items = this.parseList(await fetchHtml(url.toString()));
    return { items, page, hasNextPage: items.length > 0 };
  }

  async getDetail(mangaId: string): Promise<MangaDetail> {
    const url = decodeId(mangaId);
    const $ = cheerio.load(await fetchHtml(url));
    const root = $('#mainer');
    const details = root.find('.detail-set').first();
    const attrs = new Map<string, cheerio.Cheerio<AnyNode>>();
    details.find('.attr-main .attr-item').each((_, element) => {
      const children = $(element).children();
      attrs.set(clean(children.eq(0).text()), children.eq(1));
    });

    const title = clean(root.find('h3.item-title').text()) || 'Untitled';
    return {
      id: mangaId,
      sourceId: this.id,
      title,
      coverUrl: absoluteUrl(url, details.find('img[src]').attr('src')),
      author: clean(attrs.get('Authors:')?.text()) || undefined,
      description: details.find('#limit-height-body-summary .limit-html').html() ?? undefined,
      status: statusFrom(clean(attrs.get('Original work:')?.text())),
      genres: attrs.get('Genres:') ? parseTags($, attrs.get('Genres:')!) : [],
      url,
      alternateTitles: [clean(root.find('.item-alias').text())].filter(Boolean)
    };
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const url = decodeId(mangaId);
    const $ = cheerio.load(await fetchHtml(url));
    return $('.episode-list .main')
      .children()
      .map((index, element) => {
        const node = $(element);
        const link = node.find('a.chapt').first();
        const chapterUrl = absoluteUrl(url, link.attr('href'));
        const title = clean(link.text());
        const extra = node.find('.extra');
        return {
          id: encodeId(chapterUrl),
          mangaId,
          sourceId: this.id,
          number: numberFrom(title, index + 1),
          title,
          language: 'multi',
          uploadedAt: relativeDate(clean(extra.find('i').last().text())),
          scanlator: clean(extra.find('a[href*="/group/"]').text()) || undefined,
          url: chapterUrl
        };
      })
      .get()
      .filter((chapter) => chapter.url)
      .reverse();
  }

  async getPages(chapterId: string): Promise<string[]> {
    const url = decodeId(chapterId);
    const $ = cheerio.load(await fetchHtml(url));
    for (const script of $('script').toArray()) {
      const body = $(script).html() ?? '';
      const marker = body.indexOf('const imgHttps =');
      if (marker === -1) continue;
      const start = body.indexOf('[', marker);
      const end = body.indexOf(';', start);
      if (start === -1 || end === -1) continue;
      const images = JSON.parse(body.slice(start, end)) as string[];
      const passExpression = body.match(/batoPass\s*=\s*([^;]+)/)?.[1];
      const encryptedWord = body.match(/batoWord\s*=\s*['"]([^'"]+)['"]/)?.[1];
      if (!passExpression || !encryptedWord) return images;

      const password = evaluateBatoPass(passExpression);
      const args = JSON.parse(decryptOpenSslAes(encryptedWord, password)) as string[];
      return images.map((image, index) => (args[index] ? `${image}?${args[index]}` : image));
    }
    return [];
  }

  async getFilters(): Promise<FilterOption[]> {
    return [
      {
        id: 'sort',
        label: 'Sort',
        type: 'select',
        values: [
          { label: 'Updated', value: 'updated' },
          { label: 'Popular', value: 'popular' },
          { label: 'Newest', value: 'newest' }
        ]
      }
    ];
  }

  private parseList(html: string) {
    if (/challenge-platform|cf-mitigated|Just a moment/i.test(html)) {
      throw Object.assign(new Error('Bato.to sedang memblokir request otomatis dengan Cloudflare challenge.'), {
        status: 503,
        code: 'SOURCE_ANTI_BOT'
      });
    }
    const $ = cheerio.load(html);
    const root = $('#series-list');
    if (!root.length) {
      throw Object.assign(new Error('Bato.to berhasil diakses, tapi selector #series-list tidak ditemukan.'), {
        status: 502,
        code: 'SOURCE_PARSE_EMPTY'
      });
    }

    return root
      .children()
      .map((_, element): Manga => {
        const node = $(element);
        const link = node.find('a').first();
        const url = absoluteUrl(SITE_BASE, link.attr('href'));
        const title = clean(node.find('.item-title').text());
        return {
          id: encodeId(url),
          sourceId: this.id,
          title,
          coverUrl: absoluteUrl(SITE_BASE, node.find('img[src]').attr('src')),
          status: 'ongoing',
          genres: node.find('.item-genre').length ? parseTags($, node.find('.item-genre')) : [],
          url
        };
      })
      .get()
      .filter((manga) => Boolean(manga.url && manga.title));
  }
}
