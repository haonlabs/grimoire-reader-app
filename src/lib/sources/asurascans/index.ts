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

const SITE_BASE = 'https://asurascans.com';
const API_ORIGIN = 'https://api.asurascans.com';
const PAGE_LIMIT = 24;

interface AsuraGenre {
  name?: string;
}

interface AsuraSeries {
  slug: string;
  title: string;
  cover: string;
  public_url?: string;
  alt_titles?: string[];
  alternative_titles?: string;
  description?: string;
  status?: string;
  type?: string;
  author?: string;
  artist?: string;
  rating?: number;
  chapter_count?: number;
  genres?: AsuraGenre[];
}

interface AsuraListResponse {
  data?: AsuraSeries[];
  meta?: {
    has_more?: boolean;
  };
}

interface AsuraDetailResponse {
  series?: AsuraSeries;
}

function selectedFilter(filters: FilterInput[] | undefined, id: string) {
  const value = filters?.find((filter) => filter.id === id)?.value;
  return typeof value === 'string' ? value : '';
}

function stripHtml(text?: string) {
  return clean(loadHtml(text ?? '').text());
}

function parseStatus(text?: string): MangaStatus {
  if (/dropped|axed/i.test(text ?? '')) return 'cancelled';
  return statusFrom(text);
}

function publicUrl(series: AsuraSeries) {
  return absoluteUrl(SITE_BASE, series.public_url || `/comics/${series.slug}`);
}

function seriesFromApi(sourceId: string, series: AsuraSeries): Manga {
  const url = publicUrl(series);
  return {
    id: encodeId(url),
    sourceId,
    title: clean(series.title) || series.slug,
    coverUrl: absoluteUrl(SITE_BASE, series.cover),
    author: clean(series.author) || undefined,
    artist: clean(series.artist) || undefined,
    description: stripHtml(series.description),
    format: formatFrom(series.type),
    status: parseStatus(series.status),
    genres: series.genres?.map((genre) => clean(genre.name)).filter(Boolean) ?? [],
    rating: series.rating,
    url
  };
}

function slugFromMangaId(mangaId: string) {
  const decoded = decodeId(mangaId);
  try {
    const url = new URL(decoded);
    return url.pathname.split('/').filter(Boolean).at(-1) ?? decoded;
  } catch {
    return decoded.replace(/^\/?comics\//, '').replace(/^\/+|\/+$/g, '');
  }
}

function uniqueClean(values: Array<string | undefined>) {
  return [...new Set(values.map(clean).filter(Boolean))];
}

export class AsuraScansSource implements MangaSource {
  readonly id = 'asurascans';
  readonly name = 'Asura Scans';
  readonly baseUrl = SITE_BASE;
  readonly language = 'en';
  readonly contentRating = 'suggestive' as const;
  readonly isNsfw = false;

  async getList(page: number, filters?: FilterInput[]): Promise<MangaListResult> {
    const targetPage = Math.max(1, page);
    const data = await this.fetchSeries(targetPage, '', filters);
    return {
      items: data.data?.map((series) => seriesFromApi(this.id, series)) ?? [],
      page: targetPage,
      hasNextPage: Boolean(data.meta?.has_more)
    };
  }

  async search(query: string, page: number, filters?: FilterInput[]): Promise<MangaListResult> {
    if (!query.trim()) return this.getList(page, filters);
    const targetPage = Math.max(1, page);
    const data = await this.fetchSeries(targetPage, query.trim(), filters);
    return {
      items: data.data?.map((series) => seriesFromApi(this.id, series)) ?? [],
      page: targetPage,
      hasNextPage: Boolean(data.meta?.has_more)
    };
  }

  async getDetail(mangaId: string): Promise<MangaDetail> {
    const slug = slugFromMangaId(mangaId);
    const raw = await this.fetch(new URL(`/api/series/${slug}`, API_ORIGIN).toString());
    const data = JSON.parse(raw) as AsuraDetailResponse;
    if (!data.series) {
      throw Object.assign(new Error('Asura series not found'), { status: 404, code: 'SOURCE_NOT_FOUND' });
    }
    const manga = seriesFromApi(this.id, data.series);
    return {
      ...manga,
      id: mangaId,
      alternateTitles: uniqueClean([
        ...(data.series.alt_titles?.map(clean).filter(Boolean) ?? []),
        ...clean(data.series.alternative_titles)
          .split('•')
          .map(clean)
          .filter(Boolean)
      ])
    };
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const mangaUrl = decodeId(mangaId);
    const slug = slugFromMangaId(mangaId);
    const $ = loadHtml(await this.fetch(mangaUrl));
    const seen = new Set<string>();
    const chapters = $('a[href*="/chapter/"]')
      .toArray()
      .map((element, index): Chapter | null => {
        const link = $(element);
        const href = absoluteUrl(SITE_BASE, link.attr('href'));
        if (!href || seen.has(href)) return null;
        seen.add(href);
        const number = Number(new URL(href).pathname.split('/').at(-1)) || numberFrom(link.text()) || index + 1;
        return {
          id: encodeId(href),
          mangaId,
          sourceId: this.id,
          number,
          title: `Chapter ${number}`,
          language: 'en',
          uploadedAt: new Date().toISOString(),
          url: href
        };
      })
      .filter((chapter): chapter is Chapter => Boolean(chapter));

    return chapters
      .filter((chapter) => chapter.url.includes(`/comics/${slug}/chapter/`))
      .sort((left, right) => right.number - left.number);
  }

  async getPages(chapterId: string): Promise<string[]> {
    const chapterUrl = decodeId(chapterId);
    const $ = loadHtml(await this.fetch(chapterUrl));
    const pages = $('img[alt^="Page "]')
      .map((_, element) => imageSrc($, $(element), SITE_BASE))
      .get()
      .filter((url) => url.includes('/asura-images/chapters/'));
    if (pages.length) return [...new Set(pages)];
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
          { label: 'Popular', value: 'popular' }
        ]
      }
    ];
  }

  private async fetchSeries(page: number, query: string, filters?: FilterInput[]) {
    const url = new URL('/api/series', API_ORIGIN);
    url.searchParams.set('offset', String((page - 1) * PAGE_LIMIT));
    url.searchParams.set('limit', String(PAGE_LIMIT));
    url.searchParams.set('sort', selectedFilter(filters, 'sort') || 'latest');
    if (query) url.searchParams.set('search', query);
    return JSON.parse(await this.fetch(url.toString())) as AsuraListResponse;
  }

  private fetch(url: string, init: Parameters<typeof fetchText>[1] = {}) {
    return fetchText(url, { ...init, sourceId: this.id });
  }
}
