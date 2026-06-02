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
import {
  absoluteUrl,
  clean,
  decodeId,
  encodeId,
  fetchText,
  formatFrom,
  imageSrc,
  loadHtml,
  numberFrom,
  statusFrom
} from '$lib/sources/kotatsuPort/common';

const SITE_BASE = 'https://doujinpoi.net';
const PAGE_LIMIT = 24;

interface DoujinpoiMangaInfo {
  _id?: string;
  slug?: string;
  title?: string;
  alternativeTitle?: string;
  synopsis?: string;
  thumb?: string;
  coverImage?: string;
  tags?: string[];
  views?: number;
  chapter_count?: number;
  createdAt?: string;
  updatedAt?: string;
  metadata?: {
    status?: string;
    type?: string;
    series?: string;
    author?: string;
    rating?: string | number;
    created?: string;
  };
}

interface DoujinpoiChapterInfo {
  _id?: string;
  slug?: string;
  chapter_index?: number;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
  images?: string[];
}

interface DoujinpoiMangaResponse {
  success?: boolean;
  data?: {
    info?: DoujinpoiMangaInfo;
    chapters?: DoujinpoiChapterInfo[];
  };
  message?: string;
}

interface DoujinpoiReadResponse {
  success?: boolean;
  data?: {
    chapter?: DoujinpoiChapterInfo;
  };
  message?: string;
}

function selectedFilter(filters: FilterInput[] | undefined, id: string) {
  const value = filters?.find((filter) => filter.id === id)?.value;
  return typeof value === 'string' ? value : '';
}

function slugFromMangaId(mangaId: string) {
  const decoded = decodeId(mangaId);
  try {
    const url = new URL(decoded);
    const match = url.pathname.match(/^\/manga\/([^/]+)/);
    if (match) return decodeURIComponent(match[1]);
  } catch {
    // Encoded ids are URLs in normal use; plain slugs are accepted for resilience.
  }
  return decoded.replace(/^\/?manga\//, '').replace(/^\/+|\/+$/g, '');
}

function chapterParts(chapterId: string) {
  const decoded = decodeId(chapterId);
  try {
    const url = new URL(decoded);
    const match = url.pathname.match(/^\/(?:read|chapter)\/([^/]+)\/([^/]+)/);
    if (match) return { mangaSlug: decodeURIComponent(match[1]), chapterSlug: decodeURIComponent(match[2]) };
  } catch {
    // Fall through to compact id parsing.
  }
  const [mangaSlug, chapterSlug] = decoded.split('/').filter(Boolean).slice(-2);
  return { mangaSlug, chapterSlug };
}

function parseStatus(text?: string | null): MangaStatus {
  const value = clean(text);
  if (/^end$/i.test(value)) return 'completed';
  if (/publishing|ongoing|^ong$/i.test(value)) return 'ongoing';
  return statusFrom(value);
}

function pageUrl(value?: string | null) {
  const url = absoluteUrl(SITE_BASE, clean(value));
  if (!url) return '';
  try {
    return new URL(url).toString();
  } catch {
    return url;
  }
}

function uniquePages(values: string[]) {
  return [...new Set(values.map(pageUrl).filter(Boolean))];
}

function mangaFromInfo(sourceId: string, info: DoujinpoiMangaInfo): Manga {
  const slug = info.slug ?? '';
  const url = new URL(`/manga/${slug}`, SITE_BASE).toString();
  const typeText = info.metadata?.type ?? info.metadata?.series;
  return {
    id: encodeId(url),
    sourceId,
    title: clean(info.title) || slug || 'Untitled',
    coverUrl: absoluteUrl(SITE_BASE, info.thumb ?? info.coverImage),
    author: clean(info.metadata?.author) || undefined,
    description: clean(info.synopsis),
    format: formatFrom(typeText),
    status: parseStatus(info.metadata?.status),
    genres: info.tags?.map(clean).filter(Boolean) ?? [],
    rating: Number(info.metadata?.rating) || undefined,
    url
  };
}

export class DoujinpoiSource implements MangaSource {
  readonly id: string;
  readonly name = 'Doujinpoi';
  readonly baseUrl = SITE_BASE;
  readonly language = 'id';
  readonly contentRating = 'explicit' as const;
  readonly isNsfw = true;

  constructor(id = 'doujinpoi') {
    this.id = id;
  }

  async getList(page: number, filters?: FilterInput[]): Promise<MangaListResult> {
    const targetPage = Math.max(1, page);
    const url = this.buildBrowseUrl(targetPage, filters);
    const $ = loadHtml(await this.fetch(url.toString()));
    const items = this.parseMangaCards($);
    return {
      items,
      page: targetPage,
      hasNextPage: this.hasNextPage($, targetPage) || items.length >= PAGE_LIMIT
    };
  }

  async search(query: string, page: number, filters?: FilterInput[]): Promise<MangaListResult> {
    if (!query.trim()) return this.getList(page, filters);
    const targetPage = Math.max(1, page);
    const url = this.buildBrowseUrl(targetPage, filters);
    url.searchParams.set('q', query.trim());
    const $ = loadHtml(await this.fetch(url.toString()));
    const items = this.parseMangaCards($);
    return {
      items,
      page: targetPage,
      hasNextPage: this.hasNextPage($, targetPage) || items.length >= PAGE_LIMIT
    };
  }

  async getDetail(mangaId: string): Promise<MangaDetail> {
    const slug = slugFromMangaId(mangaId);
    const data = await this.fetchManga(slug);
    const info = data.data?.info;
    if (!data.success || !info) {
      throw Object.assign(new Error(data.message || 'Manga tidak ditemukan di Doujinpoi'), {
        status: 404,
        code: 'SOURCE_NOT_FOUND'
      });
    }
    const manga = mangaFromInfo(this.id, info);
    return {
      ...manga,
      alternateTitles: clean(info.alternativeTitle)
        .split(',')
        .map(clean)
        .filter(Boolean),
      year: Number(info.createdAt?.slice(0, 4)) || undefined
    };
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const slug = slugFromMangaId(mangaId);
    const data = await this.fetchManga(slug);
    const chapters = data.data?.chapters ?? [];
    return chapters
      .map((chapter, index) => this.chapterFromApi(slug, mangaId, chapter, index))
      .filter((chapter): chapter is Chapter => Boolean(chapter));
  }

  async getPages(chapterId: string): Promise<string[]> {
    const { mangaSlug, chapterSlug } = chapterParts(chapterId);
    if (!mangaSlug || !chapterSlug) {
      throw Object.assign(new Error('Chapter id Doujinpoi tidak valid'), {
        status: 400,
        code: 'SOURCE_BAD_ID'
      });
    }
    const readUrl = new URL(`/read/${mangaSlug}/${chapterSlug}`, SITE_BASE).toString();
    try {
      const raw = await this.fetch(new URL(`/api/read/${mangaSlug}/${chapterSlug}`, SITE_BASE).toString());
      const data = JSON.parse(raw) as DoujinpoiReadResponse;
      if (data.success) {
        const pages = uniquePages(data.data?.chapter?.images ?? []);
        if (pages.length) return pages;
      }
    } catch {
      // Some cached or legacy chapter ids are only recoverable from the reader HTML.
    }

    const pages = this.pagesFromReaderHtml(await this.fetch(readUrl));
    if (pages.length) return pages;
    throw Object.assign(new Error('No pages found for this chapter'), {
      status: 502,
      code: 'SOURCE_PARSE_FAILED'
    });
  }

  async getFilters(): Promise<FilterOption[]> {
    return [
      {
        id: 'sort',
        label: 'Sort',
        type: 'select',
        values: [
          { label: 'Latest', value: 'latest' },
          { label: 'Popular', value: 'popular' },
          { label: 'Rating', value: 'rating' }
        ]
      },
      {
        id: 'type',
        label: 'Type',
        type: 'select',
        values: [
          { label: 'All', value: '' },
          { label: 'Manga', value: 'manga' },
          { label: 'Manhwa', value: 'manhwa' },
          { label: 'Manhua', value: 'manhua' },
          { label: 'Doujinshi', value: 'doujinshi' }
        ]
      }
    ];
  }

  private buildBrowseUrl(page: number, filters?: FilterInput[]) {
    const url = new URL('/manga', SITE_BASE);
    url.searchParams.set('order', selectedFilter(filters, 'sort') || 'latest');
    const type = selectedFilter(filters, 'type');
    if (type) url.searchParams.set('type', type);
    if (page > 1) url.searchParams.set('page', String(page));
    return url;
  }

  private fetch(url: string, init: Parameters<typeof fetchText>[1] = {}) {
    return fetchText(url, { ...init, sourceId: this.id });
  }

  private async fetchManga(slug: string) {
    const raw = await this.fetch(new URL(`/api/manga/${slug}`, SITE_BASE).toString());
    return JSON.parse(raw) as DoujinpoiMangaResponse;
  }

  private parseMangaCards($: ReturnType<typeof loadHtml>) {
    const seen = new Set<string>();
    return $('main a[href^="/manga/"]')
      .map((_, element) => {
        const item = this.parseMangaCard($, $(element));
        if (!item || seen.has(item.url)) return null;
        seen.add(item.url);
        return item;
      })
      .get()
      .filter(Boolean) as Manga[];
  }

  private parseMangaCard($: ReturnType<typeof loadHtml>, node: ReturnType<ReturnType<typeof loadHtml>>) {
    const url = absoluteUrl(SITE_BASE, node.attr('href'));
    if (!url || !/\/manga\/[^/?#]+$/.test(new URL(url).pathname)) return null;
    const image = node.find('img').first();
    const title =
      clean(image.attr('alt')) ||
      clean(node.find('p').first().text()) ||
      clean(node.attr('title')) ||
      clean(node.text());
    if (!title) return null;

    const labels = node
      .find('span')
      .map((_, label) => clean($(label).text()))
      .get()
      .filter(Boolean);
    const text = clean(node.text());
    const typeText = labels.find((label) => /manga|manhwa|manhua|doujinshi/i.test(label)) ?? text;
    const statusText = labels.find((label) => /^end$|^ong$/i.test(label)) ?? text;
    const rating = Number(labels.find((label) => /^[0-9]+(?:\.[0-9]+)?$/.test(label))) || undefined;

    return {
      id: encodeId(url),
      sourceId: this.id,
      title,
      coverUrl: imageSrc($, image, SITE_BASE),
      format: formatFrom(typeText),
      status: parseStatus(statusText),
      genres: [],
      rating,
      url
    };
  }

  private chapterFromApi(
    slug: string,
    mangaId: string,
    chapter: DoujinpoiChapterInfo,
    index: number
  ): Chapter | null {
    if (!chapter.slug) return null;
    const url = new URL(`/read/${slug}/${chapter.slug}`, SITE_BASE).toString();
    const number = Number(chapter.chapter_index) || numberFrom(chapter.title) || index + 1;
    return {
      id: encodeId(url),
      mangaId,
      sourceId: this.id,
      number,
      title: `Chapter ${chapter.title || number}`,
      language: 'id',
      uploadedAt: chapter.createdAt || chapter.updatedAt || new Date().toISOString(),
      url
    };
  }

  private pagesFromReaderHtml(html: string) {
    const $ = loadHtml(html);
    const fromImages = $('img')
      .map((_, image) => imageSrc($, $(image), SITE_BASE))
      .get()
      .filter((url) => /desu\.photos|manhwature|uploads/i.test(url));
    const fromScripts = $('script')
      .map((_, script) => $(script).html() ?? '')
      .get()
      .flatMap((script) => script.match(/https?:\\?\/\\?\/[^"'\\]+?\.(?:webp|jpe?g|png)/gi) ?? [])
      .map((url) => url.replace(/\\\//g, '/'));
    return uniquePages([...fromImages, ...fromScripts]);
  }

  private hasNextPage($: ReturnType<typeof loadHtml>, page: number) {
    return $('a[href]')
      .toArray()
      .some((element) => {
        const link = $(element);
        const href = link.attr('href') ?? '';
        return clean(link.text()).toLowerCase() === 'next' || href.includes(`page=${page + 1}`);
      });
  }
}
