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
import { normalizeMangaFormat } from '$lib/utils/mangaFormat';

const API_BASE = 'https://be.komikcast.cc';
const SITE_BASE = 'https://v2.komikcast.fit';
const PAGE_LIMIT = 24;
const REQUEST_TIMEOUT = 15_000;

interface KomikcastGenre {
  data?: {
    name?: string;
  };
}

interface KomikcastSeriesData {
  slug?: string;
  title?: string;
  nativeTitle?: string;
  author?: string;
  format?: string;
  rating?: number;
  status?: string;
  synopsis?: string;
  releaseDate?: string;
  coverImage?: string;
  totalChapters?: string;
  genres?: KomikcastGenre[];
}

interface KomikcastChapterData {
  slug?: string | null;
  title?: string | null;
  index?: number;
}

interface KomikcastChapterEntity {
  id: number;
  createdAt?: string;
  updatedAt?: string;
  data?: KomikcastChapterData;
  dataImages?: Record<string, string>;
  chapterIndex?: number;
  seriesId?: number;
}

interface KomikcastSeriesEntity {
  id: number;
  data?: KomikcastSeriesData;
  createdAt?: string;
  updatedAt?: string;
  chapters?: KomikcastChapterEntity[];
}

interface KomikcastListResponse {
  data: KomikcastSeriesEntity[];
  meta?: {
    total?: number;
    page?: number;
    lastPage?: number;
  };
}

interface KomikcastDetailResponse {
  data: KomikcastSeriesEntity;
}

interface KomikcastChapterResponse {
  data: KomikcastChapterEntity[];
}

function statusFrom(value?: string): MangaStatus {
  if (value === 'completed') return 'completed';
  if (value === 'hiatus') return 'hiatus';
  if (value === 'cancelled') return 'cancelled';
  return 'ongoing';
}

function mangaIdFrom(entity: KomikcastSeriesEntity) {
  return `${entity.data?.slug ?? entity.id}--${entity.id}`;
}

function splitMangaId(mangaId: string) {
  const match = mangaId.match(/^(.*)--(\d+)$/);
  return {
    slug: match?.[1] ?? mangaId,
    seriesId: match?.[2] ? Number(match[2]) : undefined
  };
}

function chapterIdFrom(seriesId: number, chapter: KomikcastChapterEntity) {
  const index = chapter.chapterIndex ?? chapter.data?.index ?? 0;
  return `${seriesId}-${chapter.id}-${index}`;
}

function splitChapterId(chapterId: string) {
  const [seriesId, chapterIdValue, index] = chapterId.split('-').map(Number);
  return { seriesId, chapterId: chapterIdValue, index };
}

function compactImageUrl(value?: string) {
  return value ?? '';
}

function seriesUrl(slug?: string) {
  return `${SITE_BASE}/komik/${slug ?? ''}`;
}

function mangaFromEntity(entity: KomikcastSeriesEntity): Manga {
  const data = entity.data ?? {};
  const slug = data.slug ?? String(entity.id);
  return {
    id: mangaIdFrom(entity),
    sourceId: 'komikcast',
    title: data.title ?? data.nativeTitle ?? 'Untitled',
    coverUrl: compactImageUrl(data.coverImage),
    author: data.author,
    description: data.synopsis,
    format: normalizeMangaFormat(data.format),
    status: statusFrom(data.status),
    genres: data.genres?.map((genre) => genre.data?.name).filter(Boolean).slice(0, 8) as string[],
    rating: data.rating,
    url: seriesUrl(slug)
  };
}

function chapterFromEntity(entity: KomikcastChapterEntity, mangaId: string, seriesId: number): Chapter {
  const number = entity.chapterIndex ?? entity.data?.index ?? splitChapterId(chapterIdFrom(seriesId, entity)).index ?? 0;
  const title = entity.data?.title?.trim();
  return {
    id: chapterIdFrom(seriesId, entity),
    mangaId,
    sourceId: 'komikcast',
    number,
    title: title || undefined,
    language: 'id',
    uploadedAt: entity.createdAt ?? entity.updatedAt ?? new Date().toISOString(),
    url: `${SITE_BASE}/chapter/${entity.id}`
  };
}

async function komikcastFetch<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'GrimoireReader/0.1'
      },
      signal: controller.signal
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'network request failed';
    throw Object.assign(new Error(`Komikcast tidak bisa diakses dari jaringan ini (${message}).`), {
      status: 503,
      code: 'SOURCE_NETWORK_BLOCKED'
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw Object.assign(new Error(`Komikcast request failed with HTTP ${response.status}`), {
      status: response.status,
      code: 'SOURCE_REQUEST_FAILED'
    });
  }

  return response.json() as Promise<T>;
}

function listPath(page: number, query?: string) {
  const params = new URLSearchParams({
    take: String(PAGE_LIMIT),
    page: String(Math.max(1, page)),
    takeChapter: '2',
    includeMeta: 'true',
    sort: query ? 'updatedAt' : 'latest',
    sortOrder: 'desc'
  });

  if (query?.trim()) {
    const safeQuery = query.trim().replaceAll('"', '\\"');
    params.set('filter', `title=like="${safeQuery}",nativeTitle=like="${safeQuery}"`);
  }

  return `/series?${params.toString()}`;
}

export class KomikcastSource implements MangaSource {
  readonly id = 'komikcast';
  readonly name = 'Komikcast';
  readonly baseUrl = SITE_BASE;
  readonly language = 'id';
  readonly contentRating = 'suggestive' as const;
  readonly isNsfw = false;

  private chapterImages = new Map<string, string[]>();
  private seriesTitles = new Map<number, string>();

  async getList(page: number, _filters?: FilterInput[]): Promise<MangaListResult> {
    const response = await komikcastFetch<KomikcastListResponse>(listPath(page));
    for (const series of response.data) this.rememberSeries(series);
    return {
      items: response.data.map(mangaFromEntity),
      page,
      hasNextPage: page < (response.meta?.lastPage ?? page),
      total: response.meta?.total
    };
  }

  async search(query: string, page: number, _filters?: FilterInput[]): Promise<MangaListResult> {
    if (!query.trim()) return this.getList(page);
    const response = await komikcastFetch<KomikcastListResponse>(listPath(page, query));
    for (const series of response.data) this.rememberSeries(series);
    return {
      items: response.data.map(mangaFromEntity),
      page,
      hasNextPage: page < (response.meta?.lastPage ?? page),
      total: response.meta?.total
    };
  }

  async getDetail(mangaId: string): Promise<MangaDetail> {
    const { slug } = splitMangaId(mangaId);
    const response = await komikcastFetch<KomikcastDetailResponse>(`/series/${encodeURIComponent(slug)}`);
    this.rememberSeries(response.data);
    const manga = mangaFromEntity(response.data);
    return {
      ...manga,
      id: mangaId,
      alternateTitles: response.data.data?.nativeTitle ? [response.data.data.nativeTitle] : [],
      year: Number(response.data.data?.releaseDate) || undefined,
      url: seriesUrl(response.data.data?.slug ?? slug),
      sourceId: this.id
    };
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const { seriesId } = splitMangaId(mangaId);
    if (!seriesId) return [];
    const response = await komikcastFetch<KomikcastChapterResponse>(`/series/${seriesId}/chapters`);
    const title = this.seriesTitles.get(seriesId);
    if (title) await this.hydrateChapterImages(seriesId, title);
    return response.data.map((chapter) => chapterFromEntity(chapter, mangaId, seriesId));
  }

  async getPages(chapterId: string): Promise<string[]> {
    const cached = this.chapterImages.get(chapterId);
    if (cached?.length) return cached;

    const { seriesId } = splitChapterId(chapterId);
    const title = this.seriesTitles.get(seriesId);
    if (title) await this.hydrateChapterImages(seriesId, title);

    const images = this.chapterImages.get(chapterId);
    if (!images?.length) {
      throw Object.assign(
        new Error('Halaman chapter Komikcast belum tersedia dari cache API. Buka detail komiknya sekali lagi lalu pilih chapter.'),
        { status: 502, code: 'SOURCE_PAGES_UNAVAILABLE' }
      );
    }
    return images;
  }

  async getFilters(): Promise<FilterOption[]> {
    return [
      {
        id: 'sort',
        label: 'Sort',
        type: 'select',
        values: [
          { label: 'Latest', value: 'updated' },
          { label: 'Popular', value: 'popular' }
        ]
      }
    ];
  }

  private rememberSeries(series: KomikcastSeriesEntity) {
    if (series.data?.title) this.seriesTitles.set(series.id, series.data.title);
    for (const chapter of series.chapters ?? []) this.rememberChapterImages(series.id, chapter);
  }

  private rememberChapterImages(seriesId: number, chapter: KomikcastChapterEntity) {
    const images = Object.entries(chapter.dataImages ?? {})
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([, value]) => value)
      .filter(Boolean);
    if (images.length) this.chapterImages.set(chapterIdFrom(seriesId, chapter), images);
  }

  private async hydrateChapterImages(seriesId: number, title: string) {
    const response = await komikcastFetch<KomikcastListResponse>(listPath(1, title));
    const series = response.data.find((entry) => entry.id === seriesId);
    if (series) this.rememberSeries(series);
  }
}
