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

const API_BASE = 'https://api.shngm.io/v1';
const CDN_BASE = 'https://assets.shngm.id';
const SITE_BASE = 'https://g.shinigami.asia';
const PAGE_LIMIT = 24;
const REQUEST_TIMEOUT = 15_000;

interface ShinigamiTaxonomyEntry {
  name: string;
  slug: string;
}

interface ShinigamiTaxonomy {
  Artist?: ShinigamiTaxonomyEntry[];
  Author?: ShinigamiTaxonomyEntry[];
  Format?: ShinigamiTaxonomyEntry[];
  Genre?: ShinigamiTaxonomyEntry[];
}

interface ShinigamiMangaEntity {
  alternative_title?: string;
  cover_image_url?: string;
  cover_portrait_url?: string;
  description?: string;
  manga_id: string;
  release_year?: string;
  status?: number;
  taxonomy?: ShinigamiTaxonomy;
  title: string;
  updated_at?: string;
  user_rate?: number;
}

interface ShinigamiChapterEntity {
  chapter_id: string;
  manga_id: string;
  chapter_title?: string;
  chapter_number?: number;
  thumbnail_image_url?: string;
  release_date?: string;
}

interface ShinigamiListResponse<T> {
  data: T[];
  meta?: {
    page?: number;
    page_size?: number;
    total_page?: number;
    total_record?: number;
  };
}

interface ShinigamiDetailResponse<T> {
  data: T;
}

interface ShinigamiChapterDetail {
  base_url?: string;
  chapter?: {
    path?: string;
    data?: string[];
  };
}

function statusFrom(value?: number): MangaStatus {
  if (value === 2) return 'completed';
  if (value === 3) return 'hiatus';
  return 'ongoing';
}

function mangaUrl(id: string) {
  return `${SITE_BASE}/series/${id}`;
}

function sortFrom(filters?: FilterInput[]) {
  const sort = filters?.find((entry) => entry.id === 'sort')?.value;
  if (sort === 'rating') return 'rating';
  if (sort === 'newest' || sort === 'updated') return 'latest';
  if (sort === 'popular') return 'popularity';
  return 'latest';
}

function mangaFromEntity(entity: ShinigamiMangaEntity): Manga {
  const authors = entity.taxonomy?.Author?.map((item) => item.name).filter(Boolean) ?? [];
  const format = entity.taxonomy?.Format?.map((item) => normalizeMangaFormat(item.name)).find(Boolean);
  return {
    id: entity.manga_id,
    sourceId: 'shinigami',
    title: entity.title,
    coverUrl: entity.cover_image_url ?? entity.cover_portrait_url ?? '',
    author: authors.join(', ') || undefined,
    artist: entity.taxonomy?.Artist?.map((item) => item.name).filter(Boolean).join(', ') || undefined,
    description: entity.description,
    format,
    status: statusFrom(entity.status),
    genres: entity.taxonomy?.Genre?.map((genre) => genre.name).filter(Boolean).slice(0, 8) ?? [],
    rating: entity.user_rate,
    url: mangaUrl(entity.manga_id)
  };
}

function chapterFromEntity(entity: ShinigamiChapterEntity): Chapter {
  return {
    id: entity.chapter_id,
    mangaId: entity.manga_id,
    sourceId: 'shinigami',
    number: entity.chapter_number ?? 0,
    title: entity.chapter_title?.trim() || undefined,
    thumbnailUrl: entity.thumbnail_image_url,
    language: 'id',
    uploadedAt: entity.release_date ?? new Date().toISOString(),
    url: `${SITE_BASE}/chapter/${entity.chapter_id}`
  };
}

async function shinigamiFetch<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        Accept: 'application/json',
        Referer: `${SITE_BASE}/`,
        'User-Agent': 'GrimoireReader/0.1'
      },
      signal: controller.signal
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'network request failed';
    throw Object.assign(new Error(`Shinigami tidak bisa diakses dari jaringan ini (${message}).`), {
      status: 503,
      code: 'SOURCE_NETWORK_BLOCKED'
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw Object.assign(new Error(`Shinigami request failed with HTTP ${response.status}`), {
      status: response.status,
      code: 'SOURCE_REQUEST_FAILED'
    });
  }

  return response.json() as Promise<T>;
}

function listPath(page: number, filters?: FilterInput[], query?: string) {
  const params = new URLSearchParams({
    page: String(Math.max(1, page)),
    page_size: String(PAGE_LIMIT),
    sort: sortFrom(filters),
    sort_order: 'desc'
  });

  if (query?.trim()) {
    params.set('q', query.trim().split(/\s+/).join(' '));
  }

  return `/manga/list?${params.toString()}`;
}

export class ShinigamiSource implements MangaSource {
  readonly id = 'shinigami';
  readonly name = 'Shinigami ID';
  readonly baseUrl = SITE_BASE;
  readonly language = 'id';
  readonly contentRating = 'suggestive' as const;
  readonly isNsfw = false;

  async getList(page: number, filters?: FilterInput[]): Promise<MangaListResult> {
    const response = await shinigamiFetch<ShinigamiListResponse<ShinigamiMangaEntity>>(
      listPath(page, filters)
    );
    return {
      items: response.data.map(mangaFromEntity),
      page,
      hasNextPage: page < (response.meta?.total_page ?? page),
      total: response.meta?.total_record
    };
  }

  async search(query: string, page: number, filters?: FilterInput[]): Promise<MangaListResult> {
    if (!query.trim()) return this.getList(page, filters);
    const response = await shinigamiFetch<ShinigamiListResponse<ShinigamiMangaEntity>>(
      listPath(page, filters, query)
    );
    return {
      items: response.data.map(mangaFromEntity),
      page,
      hasNextPage: page < (response.meta?.total_page ?? page),
      total: response.meta?.total_record
    };
  }

  async getDetail(mangaId: string): Promise<MangaDetail> {
    const response = await shinigamiFetch<ShinigamiDetailResponse<ShinigamiMangaEntity>>(
      `/manga/detail/${encodeURIComponent(mangaId)}`
    );
    const manga = mangaFromEntity(response.data);
    return {
      ...manga,
      alternateTitles: response.data.alternative_title ? [response.data.alternative_title] : [],
      year: Number(response.data.release_year) || undefined
    };
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const params = new URLSearchParams({
      page: '1',
      page_size: '9999',
      sort_by: 'chapter_number',
      sort_order: 'asc'
    });
    const response = await shinigamiFetch<ShinigamiListResponse<ShinigamiChapterEntity>>(
      `/chapter/${encodeURIComponent(mangaId)}/list?${params.toString()}`
    );
    return response.data.map(chapterFromEntity).sort((left, right) => right.number - left.number);
  }

  async getPages(chapterId: string): Promise<string[]> {
    const response = await shinigamiFetch<ShinigamiDetailResponse<ShinigamiChapterDetail>>(
      `/chapter/detail/${encodeURIComponent(chapterId)}`
    );
    const baseUrl = response.data.base_url ?? CDN_BASE;
    const path = response.data.chapter?.path ?? '';
    return (response.data.chapter?.data ?? []).map((image) => `${baseUrl}${path}${image}`);
  }

  async getFilters(): Promise<FilterOption[]> {
    return [
      {
        id: 'sort',
        label: 'Sort',
        type: 'select',
        values: [
          { label: 'Popular', value: 'popular' },
          { label: 'Newest', value: 'newest' },
          { label: 'Updated', value: 'updated' },
          { label: 'Rating', value: 'rating' }
        ]
      }
    ];
  }
}
