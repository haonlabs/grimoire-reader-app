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
import { generateVrf } from './vrf';

const SITE_BASE = 'https://mangafire.to';
const PAGE_LIMIT = 30;
const REQUEST_TIMEOUT = 15_000;
const LANGUAGE = 'en';

interface MangaFireAjax<T> {
  result?: T;
}

interface MangaFireImages {
  images: Array<[string, unknown, number?]>;
}

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

function fireIdFromMangaUrl(url: string) {
  return url.split('.').pop() ?? url;
}

function statusFrom(text?: string): MangaStatus {
  const value = text?.toLowerCase() ?? '';
  if (value === 'completed') return 'completed';
  if (value === 'discontinued') return 'cancelled';
  if (value === 'on_hiatus') return 'hiatus';
  return 'ongoing';
}

function numberFrom(text?: string) {
  return Number(text?.replace(',', '.')) || 0;
}

function sortFrom(filters?: FilterInput[]) {
  const sort = filters?.find((entry) => entry.id === 'sort')?.value;
  if (sort === 'popular') return 'most_viewed';
  if (sort === 'rating') return 'scores';
  if (sort === 'newest') return 'release_date';
  return 'recently_updated';
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/json',
        Referer: `${SITE_BASE}/`,
        'User-Agent': 'GrimoireReader/0.1'
      },
      signal: controller.signal
    });
    if (!response.ok) {
      throw Object.assign(new Error(`MangaFire returned HTTP ${response.status}`), {
        status: response.status,
        code: 'SOURCE_HTTP_ERROR'
      });
    }
    return response.text();
  } catch (error) {
    if (error instanceof Error && 'status' in error) throw error;
    const message = error instanceof Error ? error.message : 'network request failed';
    throw Object.assign(new Error(`MangaFire tidak bisa diakses dari jaringan ini (${message}).`), {
      status: 503,
      code: 'SOURCE_NETWORK_BLOCKED'
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson<T>(url: string) {
  const text = await fetchText(url);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw Object.assign(new Error('MangaFire mengembalikan response non-JSON untuk endpoint AJAX.'), {
      status: 502,
      code: 'SOURCE_PARSE_FAILED'
    });
  }
}

function cardToManga($: cheerio.CheerioAPI, element: AnyNode): Manga | null {
  const node = $(element);
  const link = node.find('.info > a').first();
  const url = absoluteUrl(SITE_BASE, link.attr('href'));
  const title = clean(link.text());
  if (!url || !title) return null;

  return {
    id: encodeId(url),
    sourceId: 'mangafire',
    title,
    coverUrl: absoluteUrl(SITE_BASE, node.find('img').first().attr('src')),
    format: 'Manga',
    status: 'ongoing',
    genres: [],
    url
  };
}

export class MangaFireSource implements MangaSource {
  readonly id = 'mangafire';
  readonly name = 'MangaFire';
  readonly baseUrl = SITE_BASE;
  readonly language = 'en';
  readonly contentRating = 'suggestive' as const;
  readonly isNsfw = false;

  async getList(page: number, filters?: FilterInput[]): Promise<MangaListResult> {
    const url = new URL('/filter', SITE_BASE);
    url.searchParams.set('page', String(Math.max(1, page)));
    url.searchParams.append('language[]', LANGUAGE);
    url.searchParams.set('sort', sortFrom(filters));
    const items = this.parseList(await fetchText(url.toString()));
    return { items, page, hasNextPage: items.length >= PAGE_LIMIT };
  }

  async search(query: string, page: number, filters?: FilterInput[]): Promise<MangaListResult> {
    if (!query.trim()) return this.getList(page, filters);
    const url = new URL('/filter', SITE_BASE);
    url.searchParams.set('page', String(Math.max(1, page)));
    url.searchParams.append('language[]', LANGUAGE);
    url.searchParams.set('keyword', query.trim().split(/\s+/).join('+'));
    url.searchParams.set('vrf', generateVrf(query.trim()));
    url.searchParams.set('sort', 'most_relevance');
    const items = this.parseList(await fetchText(url.toString()));
    return { items, page, hasNextPage: items.length >= PAGE_LIMIT };
  }

  async getDetail(mangaId: string): Promise<MangaDetail> {
    const url = decodeId(mangaId);
    const $ = cheerio.load(await fetchText(url));
    const title = clean($('.info > h1').text()) || 'Untitled';
    const statusText = clean($('.info > p').text());

    return {
      id: mangaId,
      sourceId: this.id,
      title,
      coverUrl: absoluteUrl(SITE_BASE, $('div.manga-detail div.poster img').attr('src')),
      author: clean($('div.meta a[href*="/author/"]').text()) || undefined,
      description: clean($('#synopsis div.modal-content').text()),
      status: statusFrom(statusText),
      genres: $('div.meta a[href*="/genre/"]')
        .map((_, element) => clean($(element).text()))
        .get()
        .filter(Boolean),
      rating: Number($('div.rating-box').attr('data-score')) / 10 || undefined,
      url,
      alternateTitles: [clean($('.info > h6').text())].filter(Boolean)
    };
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const mangaUrl = decodeId(mangaId);
    const $ = cheerio.load(await fetchText(mangaUrl));

    return $('.m-list .tab-content[data-name="chapter"] .list-body ul li')
      .map((_, element) => {
        const node = $(element);
        const link = node.find('a').first();
        const number = numberFrom(node.attr('data-number'));
        const title = clean(link.attr('title')) || clean(link.find('span').first().text()) || `Chapter ${number}`;
        return {
          id: encodeId(absoluteUrl(SITE_BASE, link.attr('href'))),
          mangaId,
          sourceId: this.id,
          number,
          title,
          language: LANGUAGE,
          uploadedAt: clean(link.find('span').last().text()) || new Date().toISOString(),
          url: absoluteUrl(SITE_BASE, link.attr('href'))
        };
      })
      .get()
      .sort((left, right) => right.number - left.number);
  }

  async getPages(chapterId: string): Promise<string[]> {
    const chapterUrl = decodeId(chapterId);
    const html = await fetchText(chapterUrl);
    const $ = cheerio.load(html);
    const directImages = $('img.chapter-page, #page-wrapper img, .page-reader img')
      .map((_, element) => $(element).attr('data-src') ?? $(element).attr('src'))
      .get()
      .filter((src) => /\.(webp|jpe?g|png)(\?|$)/i.test(src));
    if (directImages.length) return directImages;

    const dataId =
      $('body').attr('data-chapter-id') ??
      $('body').attr('data-cid') ??
      $('body').attr('data-disqus-id')?.replace(/^mangafire-/, '') ??
      chapterUrl.split('/').pop() ??
      chapterUrl;
    const vrf = generateVrf(`chapter@${dataId}`);
    const response = await fetchJson<MangaFireAjax<MangaFireImages>>(
      `${SITE_BASE}/ajax/read/chapter/${dataId}?vrf=${encodeURIComponent(vrf)}`
    );

    return (response.result?.images ?? [])
      .map(([url, , offset]) => (offset && offset > 0 ? `${url}#scrambled_${offset}` : url))
      .filter(Boolean);
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
          { label: 'Newest', value: 'newest' },
          { label: 'Rating', value: 'rating' }
        ]
      }
    ];
  }

  private parseList(html: string) {
    const $ = cheerio.load(html);
    const items = $('.original.card-lg .unit .inner')
      .map((_, element) => cardToManga($, element))
      .get()
      .filter(Boolean);

    if (!items.length && /Just a moment|challenge-platform/i.test(html)) {
      throw Object.assign(new Error('MangaFire sedang memblokir request otomatis dengan challenge anti-bot.'), {
        status: 503,
        code: 'SOURCE_ANTI_BOT'
      });
    }
    return items;
  }
}
