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
  loadHtml,
  statusFrom
} from '$lib/sources/kotatsuPort/common';

const SITE_BASE = 'https://asurascans.com';
const API_ORIGIN = 'https://api.asurascans.com';
const PAGE_LIMIT = 24;

interface AsuraGenre {
  name?: string;
}

interface AsuraSeries {
  id?: number;
  slug: string;
  title: string;
  cover: string;
  cover_url?: string;
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
  latest_chapters?: AsuraChapter[];
}

interface AsuraChapter {
  id?: number;
  series_id?: number;
  number?: number;
  title?: string;
  slug?: string;
  page_count?: number;
  published_at?: string;
  created_at?: string;
  series_slug?: string;
  is_locked?: boolean;
  unlock_time?: string;
}

interface AsuraListResponse {
  data?: AsuraSeries[];
  meta?: {
    has_more?: boolean;
  };
}

interface AsuraDetailResponse {
  series?: AsuraSeries;
  data?: {
    series?: AsuraSeries;
  };
}

interface AsuraChaptersResponse {
  data?: AsuraChapter[];
}

interface AsuraChapterResponse {
  data?: {
    chapter?: AsuraChapter & {
      pages?: Array<{ url?: string }>;
    };
  };
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

function coverUrl(series: AsuraSeries) {
  return absoluteUrl(SITE_BASE, series.cover || series.cover_url);
}

function seriesFromApi(sourceId: string, series: AsuraSeries): Manga {
  const url = publicUrl(series);
  return {
    id: encodeId(url),
    sourceId,
    title: clean(series.title) || series.slug,
    coverUrl: coverUrl(series),
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

function decodedPathParts(value: string) {
  const decoded = decodeId(value);
  try {
    return new URL(decoded).pathname.split('/').filter(Boolean);
  } catch {
    return decoded.split('/').filter(Boolean);
  }
}

function chapterFromApi(sourceId: string, mangaId: string, seriesSlug: string, chapter: AsuraChapter): Chapter | null {
  if (!chapter.slug || chapter.is_locked) return null;
  const number = Number(chapter.number) || 0;
  const url = new URL(`/comics/${seriesSlug}/chapter/${chapter.slug}`, SITE_BASE).toString();
  return {
    id: encodeId(url),
    mangaId,
    sourceId,
    number,
    title: clean(chapter.title) || `Chapter ${number || '?'}`,
    language: 'en',
    uploadedAt: chapter.published_at || chapter.created_at || new Date().toISOString(),
    url
  };
}

function uniqueClean(values: Array<string | undefined>) {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function seriesFromDetailResponse(data: AsuraDetailResponse) {
  return data.series ?? data.data?.series ?? null;
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
    const series = seriesFromDetailResponse(data);
    if (!series) {
      throw Object.assign(new Error('Asura series not found'), { status: 404, code: 'SOURCE_NOT_FOUND' });
    }
    const manga = seriesFromApi(this.id, series);
    return {
      ...manga,
      id: mangaId,
      alternateTitles: uniqueClean([
        ...(series.alt_titles?.map(clean).filter(Boolean) ?? []),
        ...clean(series.alternative_titles)
          .split('•')
          .map(clean)
          .filter(Boolean)
      ])
    };
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const slug = slugFromMangaId(mangaId);
    const chapters: Chapter[] = [];
    const seen = new Set<string>();
    const limit = 100;
    for (let offset = 0; offset < 500; offset += limit) {
      const url = new URL(`/api/series/${slug}/chapters`, API_ORIGIN);
      url.searchParams.set('offset', String(offset));
      url.searchParams.set('limit', String(limit));
      const data = JSON.parse(await this.fetch(url.toString())) as AsuraChaptersResponse;
      const batch = data.data ?? [];
      for (const item of batch) {
        const chapter = chapterFromApi(this.id, mangaId, slug, item);
        if (!chapter || seen.has(chapter.id)) continue;
        seen.add(chapter.id);
        chapters.push(chapter);
      }
      if (batch.length < limit) break;
    }

    return chapters
      .sort((left, right) => right.number - left.number);
  }

  async getPages(chapterId: string): Promise<string[]> {
    const parts = decodedPathParts(chapterId);
    const seriesSlug = parts[1] ?? '';
    const chapterSlug = parts.at(-1) ?? '';
    if (!seriesSlug || !chapterSlug) {
      throw Object.assign(new Error('Invalid Asura chapter id'), {
        status: 400,
        code: 'SOURCE_PARSE_FAILED'
      });
    }
    const raw = await this.fetch(new URL(`/api/series/${seriesSlug}/chapters/${chapterSlug}`, API_ORIGIN).toString());
    const data = JSON.parse(raw) as AsuraChapterResponse;
    const pages = data.data?.chapter?.pages
      ?.map((page) => absoluteUrl(SITE_BASE, clean(page.url)))
      .filter((url) => url.includes('/asura-images/chapters/')) ?? [];
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
