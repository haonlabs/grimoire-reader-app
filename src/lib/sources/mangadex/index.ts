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
import type {
  MangaDexChapterAttributes,
  MangaDexEntity,
  MangaDexListResponse,
  MangaDexMangaAttributes
} from './types';

const API_BASE = 'https://api.mangadex.org';
const COVER_BASE = 'https://uploads.mangadex.org/covers';
const PAGE_LIMIT = 24;
const USER_AGENT = 'GrimoireReader/0.1 (+https://example.local)';
const REQUEST_TIMEOUT = 15_000;

function titleFrom(value?: Record<string, string>) {
  return value?.en ?? Object.values(value ?? {})[0] ?? 'Untitled';
}

function descriptionFrom(value?: Record<string, string>) {
  return value?.en ?? Object.values(value ?? {})[0] ?? '';
}

function statusFrom(value?: string): MangaStatus {
  if (value === 'completed' || value === 'hiatus' || value === 'cancelled') return value;
  return 'ongoing';
}

function getRelationship(entity: MangaDexEntity<unknown>, type: string) {
  return entity.relationships.find((relationship) => relationship.type === type);
}

function coverUrl(entity: MangaDexEntity<MangaDexMangaAttributes>) {
  const cover = getRelationship(entity, 'cover_art');
  const fileName = cover?.attributes?.fileName;
  if (typeof fileName !== 'string') return '';
  return `${COVER_BASE}/${entity.id}/${fileName}.512.jpg`;
}

function mangaUrl(id: string) {
  return `https://mangadex.org/title/${id}`;
}

function mangaFromEntity(entity: MangaDexEntity<MangaDexMangaAttributes>): Manga {
  const attributes = entity.attributes;
  const author = getRelationship(entity, 'author')?.attributes?.name;
  const artist = getRelationship(entity, 'artist')?.attributes?.name;
  return {
    id: entity.id,
    sourceId: 'mangadex',
    title: titleFrom(attributes.title),
    coverUrl: coverUrl(entity),
    author: typeof author === 'string' ? author : undefined,
    artist: typeof artist === 'string' ? artist : undefined,
    description: descriptionFrom(attributes.description),
    status: statusFrom(attributes.status),
    genres:
      attributes.tags
        ?.map((tag) => titleFrom(tag.attributes?.name))
        .filter(Boolean)
        .slice(0, 8) ?? [],
    url: mangaUrl(entity.id)
  };
}

async function mangadexFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT
      },
      signal: controller.signal,
      redirect: 'manual'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'network request failed';
    throw Object.assign(
      new Error(
        `MangaDex is unreachable from this network (${message}). If you are in Indonesia or another filtered network, the API may be blocked or redirected before it reaches MangaDex. Try another network, VPN, or deploy the app server in an allowed region.`
      ),
      { status: 503, code: 'SOURCE_NETWORK_BLOCKED' }
    );
  } finally {
    clearTimeout(timeout);
  }

  const location = response.headers.get('location') ?? '';
  if (response.status >= 300 && response.status < 400 && location) {
    throw Object.assign(
      new Error(
        `MangaDex API was redirected to ${location}. This usually means the source is blocked by the current network. Try another network, VPN, or deploy the app server in an allowed region.`
      ),
      { status: 503, code: 'SOURCE_NETWORK_BLOCKED' }
    );
  }

  if (!response.ok) {
    const retryAfter = response.headers.get('retry-after');
    const error = new Error(`MangaDex request failed with HTTP ${response.status}`);
    Object.assign(error, {
      status: response.status,
      retryAfter: retryAfter ? Number(retryAfter) : undefined
    });
    throw error;
  }

  return response.json() as Promise<T>;
}

function contentRatings(filters?: FilterInput[]) {
  const filter = filters?.find((entry) => entry.id === 'contentRating');
  const values = Array.isArray(filter?.value) ? filter.value : ['safe', 'suggestive'];
  return values.filter((value): value is string => typeof value === 'string');
}

function sortQuery(filters?: FilterInput[]) {
  const sort = filters?.find((entry) => entry.id === 'sort')?.value;
  if (sort === 'newest') return 'order[createdAt]=desc';
  if (sort === 'updated') return 'order[updatedAt]=desc';
  if (sort === 'rating') return 'order[rating]=desc';
  return 'order[followedCount]=desc';
}

function listPath(page: number, query?: string, filters?: FilterInput[]) {
  const params = new URLSearchParams({
    limit: String(PAGE_LIMIT),
    offset: String(Math.max(0, page - 1) * PAGE_LIMIT),
    'includes[]': 'cover_art'
  });
  params.append('includes[]', 'author');
  params.append('includes[]', 'artist');
  for (const rating of contentRatings(filters)) params.append('contentRating[]', rating);
  if (query) params.set('title', query);
  return `/manga?${params.toString()}&${sortQuery(filters)}`;
}

export class MangaDexSource implements MangaSource {
  readonly id = 'mangadex';
  readonly name = 'MangaDex';
  readonly baseUrl = 'https://mangadex.org';
  readonly language = 'multi';
  readonly contentRating = 'suggestive' as const;
  readonly isNsfw = false;

  async getList(page: number, filters?: FilterInput[]): Promise<MangaListResult> {
    const response = await mangadexFetch<MangaDexListResponse<MangaDexMangaAttributes>>(
      listPath(page, undefined, filters)
    );
    return {
      items: response.data.map(mangaFromEntity),
      page,
      hasNextPage: response.offset + response.limit < response.total,
      total: response.total
    };
  }

  async search(query: string, page: number, filters?: FilterInput[]): Promise<MangaListResult> {
    if (!query.trim()) return this.getList(page, filters);
    const response = await mangadexFetch<MangaDexListResponse<MangaDexMangaAttributes>>(
      listPath(page, query, filters)
    );
    return {
      items: response.data.map(mangaFromEntity),
      page,
      hasNextPage: response.offset + response.limit < response.total,
      total: response.total
    };
  }

  async getDetail(mangaId: string): Promise<MangaDetail> {
    const params = new URLSearchParams({ 'includes[]': 'cover_art' });
    params.append('includes[]', 'author');
    params.append('includes[]', 'artist');
    const response = await mangadexFetch<{ data: MangaDexEntity<MangaDexMangaAttributes> }>(
      `/manga/${mangaId}?${params.toString()}`
    );
    const manga = mangaFromEntity(response.data);
    return {
      ...manga,
      alternateTitles:
        response.data.attributes.altTitles?.map((entry) => titleFrom(entry)).filter(Boolean) ?? [],
      year: response.data.attributes.year
    };
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const params = new URLSearchParams({
      manga: mangaId,
      limit: '100',
      'translatedLanguage[]': 'en',
      'includes[]': 'scanlation_group',
      'order[chapter]': 'desc'
    });
    const response = await mangadexFetch<MangaDexListResponse<MangaDexChapterAttributes>>(
      `/chapter?${params.toString()}`
    );
    return response.data.map((chapter) => {
      const group = getRelationship(chapter, 'scanlation_group')?.attributes?.name;
      return {
        id: chapter.id,
        mangaId,
        sourceId: this.id,
        number: Number(chapter.attributes.chapter ?? 0),
        title: chapter.attributes.title,
        language: chapter.attributes.translatedLanguage,
        uploadedAt: chapter.attributes.publishAt ?? chapter.attributes.readableAt ?? new Date().toISOString(),
        scanlator: typeof group === 'string' ? group : undefined,
        url: `https://mangadex.org/chapter/${chapter.id}`
      };
    });
  }

  async getPages(chapterId: string): Promise<string[]> {
    const response = await mangadexFetch<{
      baseUrl: string;
      chapter: { hash: string; data: string[]; dataSaver: string[] };
    }>(`/at-home/server/${chapterId}`);
    return response.chapter.data.map(
      (page) => `${response.baseUrl}/data/${response.chapter.hash}/${page}`
    );
  }

  async getFilters(): Promise<FilterOption[]> {
    return [
      {
        id: 'contentRating',
        label: 'Content rating',
        type: 'multi-select',
        values: [
          { label: 'Safe', value: 'safe' },
          { label: 'Suggestive', value: 'suggestive' }
        ]
      },
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

  async getFeatured(): Promise<Manga[]> {
    const result = await this.getList(1, [{ id: 'sort', value: 'popular' }]);
    return result.items.slice(0, 6);
  }

  async getHealth() {
    try {
      await mangadexFetch('/ping');
      return { status: 'online' as const };
    } catch {
      return { status: 'limited' as const, message: 'MangaDex ping failed' };
    }
  }
}
