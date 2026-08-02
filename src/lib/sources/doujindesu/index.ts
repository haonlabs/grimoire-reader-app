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
  clean,
  decodeId,
  encodeId,
  fetchText,
  formatFrom,
  statusFrom
} from '$lib/sources/kotatsuPort/common';

const SITE_BASE = 'https://doujin.desu.xxx';
const API_SECRET = 'dfdf72051dbfdc7d76889ebd31324e74';
const RESPONSE_SALT = 'doujindesu-scrapers-cannot-read-this-super-secret-salt-2026-v2';
const RESPONSE_KEY_WINDOW = 60 * 60_000;
const PAGE_LIMIT = 24;

interface DoujinDesuChapter {
  id?: string;
  chapter_number?: number;
  title?: string;
  created_at?: string;
  content_urls?: string[];
}

interface DoujinDesuGenre {
  genres?: { name?: string; slug?: string };
}

interface DoujinDesuManga {
  id?: string;
  title?: string;
  slug?: string;
  description?: string;
  cover_url?: string;
  author?: string;
  artist?: string;
  status?: string;
  type?: string;
  rating?: number;
  created_at?: string;
  updated_at?: string;
  alt_titles?: string | string[];
  manga_genres?: DoujinDesuGenre[];
  chapters?: DoujinDesuChapter[];
}

interface EncryptedResponse {
  _enc_resp_?: string;
}

function selectedFilter(filters: FilterInput[] | undefined, id: string) {
  const value = filters?.find((filter) => filter.id === id)?.value;
  return typeof value === 'string' ? value : '';
}

function slugFromMangaId(mangaId: string) {
  const decoded = decodeId(mangaId);
  try {
    const match = new URL(decoded).pathname.match(/^\/manga\/([^/]+)/);
    if (match) return decodeURIComponent(match[1]);
  } catch {
    // Plain slugs are accepted for old bookmarks and tests.
  }
  return decoded.replace(/^\/?manga\//, '').replace(/^\/+|\/+$/g, '');
}

function chapterUuid(chapterId: string) {
  const decoded = decodeId(chapterId);
  try {
    const match = new URL(decoded).pathname.match(/^\/reader\/([^/]+)/);
    if (match) return decodeURIComponent(match[1]);
  } catch {
    // Plain UUIDs are accepted for resilience.
  }
  return decoded.replace(/^\/?reader\//, '').replace(/^\/+|\/+$/g, '');
}

function responseKey(bucket: number) {
  const value = `${RESPONSE_SALT}_${bucket}`;
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  let key = '';
  let state = Math.abs(hash) || 123456789;
  for (let index = 0; index < 32; index += 1) {
    state = (state * 1664525 + 1013904223) % 4294967296;
    key += String.fromCharCode(33 + (state % 93));
  }
  return key;
}

function decryptResponse(hex: string, key: string) {
  const bytes: number[] = [];
  for (let index = 0; index < hex.length; index += 2) {
    bytes.push(Number.parseInt(hex.slice(index, index + 2), 16));
  }

  let decoded = '';
  let rolling = 42;
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index];
    decoded += String.fromCharCode((byte ^ key.charCodeAt(index % key.length) ^ index * 13 ^ rolling) & 255);
    rolling = (rolling + byte) % 256;
  }
  return JSON.parse(decodeURIComponent(decoded)) as unknown;
}

export function decodeDoujinDesuResponse(raw: string, now = Date.now()) {
  const payload = JSON.parse(raw) as EncryptedResponse | unknown;
  if (!payload || typeof payload !== 'object' || !('_enc_resp_' in payload)) return payload;
  const encrypted = (payload as EncryptedResponse)._enc_resp_;
  if (!encrypted) return payload;

  const currentBucket = Math.floor(now / RESPONSE_KEY_WINDOW);
  for (const bucket of [currentBucket, currentBucket - 1, currentBucket + 1]) {
    try {
      return decryptResponse(encrypted, responseKey(bucket));
    } catch {
      // The server accepts keys from the adjacent hour around a clock boundary.
    }
  }
  throw Object.assign(new Error('DoujinDesu returned a response that could not be decoded'), {
    status: 502,
    code: 'SOURCE_PARSE_FAILED'
  });
}

function parseStatus(value?: string): MangaStatus {
  if (/publishing|ongoing/i.test(value ?? '')) return 'ongoing';
  return statusFrom(value);
}

function genresFrom(manga: DoujinDesuManga) {
  return [...new Set((manga.manga_genres ?? []).map((item) => clean(item.genres?.name)).filter(Boolean))];
}

function mangaFromApi(sourceId: string, manga: DoujinDesuManga): Manga {
  const slug = manga.slug ?? '';
  const url = new URL(`/manga/${slug}`, SITE_BASE).toString();
  return {
    id: encodeId(url),
    sourceId,
    title: clean(manga.title) || slug || 'Untitled',
    coverUrl: manga.cover_url ? new URL(manga.cover_url, SITE_BASE).toString() : '',
    author: clean(manga.author) || undefined,
    artist: clean(manga.artist) || undefined,
    description: clean(manga.description),
    format: formatFrom(manga.type),
    status: parseStatus(manga.status),
    genres: genresFrom(manga),
    rating: Number(manga.rating) || undefined,
    url
  };
}

export class DoujinDesuSource implements MangaSource {
  readonly id: string;
  readonly name = 'DoujinDesu';
  readonly baseUrl = SITE_BASE;
  readonly language = 'id';
  readonly contentRating = 'explicit' as const;
  readonly isNsfw = true;

  constructor(id = 'doujindesu') {
    this.id = id;
  }

  async getList(page: number, filters?: FilterInput[]): Promise<MangaListResult> {
    return this.fetchList('', page, filters);
  }

  async search(query: string, page: number, filters?: FilterInput[]): Promise<MangaListResult> {
    return this.fetchList(query.trim(), page, filters);
  }

  async getDetail(mangaId: string): Promise<MangaDetail> {
    const slug = slugFromMangaId(mangaId);
    const manga = await this.api<DoujinDesuManga>(`/api/manga/${encodeURIComponent(slug)}`);
    if (!manga?.slug) {
      throw Object.assign(new Error('Manga tidak ditemukan di DoujinDesu'), {
        status: 404,
        code: 'SOURCE_NOT_FOUND'
      });
    }
    const alternateTitles = Array.isArray(manga.alt_titles)
      ? manga.alt_titles
      : clean(manga.alt_titles).split(',');
    return {
      ...mangaFromApi(this.id, manga),
      alternateTitles: alternateTitles.map(clean).filter(Boolean),
      year: Number(manga.created_at?.slice(0, 4)) || undefined
    };
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const slug = slugFromMangaId(mangaId);
    const manga = await this.api<DoujinDesuManga>(`/api/manga/${encodeURIComponent(slug)}`);
    return (manga.chapters ?? [])
      .filter((chapter): chapter is DoujinDesuChapter & { id: string } => Boolean(chapter.id))
      .map((chapter, index) => {
        const url = new URL(`/reader/${chapter.id}`, SITE_BASE).toString();
        const number = Number(chapter.chapter_number) || index + 1;
        return {
          id: encodeId(url),
          mangaId,
          sourceId: this.id,
          number,
          title: clean(chapter.title) || `Chapter ${number}`,
          language: 'id',
          uploadedAt: chapter.created_at || manga.updated_at || new Date().toISOString(),
          url
        };
      });
  }

  async getPages(chapterId: string): Promise<string[]> {
    const uuid = chapterUuid(chapterId);
    const chapter = await this.api<DoujinDesuChapter>(`/api/chapters/${encodeURIComponent(uuid)}`);
    const pages = [...new Set((chapter.content_urls ?? []).map((url) => clean(url)).filter(Boolean))];
    if (pages.length) return pages;
    throw Object.assign(new Error('No pages found for this DoujinDesu chapter'), {
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
          { label: 'Latest update', value: 'latest_chapter' },
          { label: 'Newest', value: 'newest' },
          { label: 'Oldest', value: 'oldest' },
          { label: 'Rating', value: 'rating' },
          { label: 'Title A-Z', value: 'title_asc' }
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
          { label: 'Doujinshi', value: 'doujinshi' }
        ]
      },
      {
        id: 'status',
        label: 'Status',
        type: 'select',
        values: [
          { label: 'All', value: '' },
          { label: 'Ongoing', value: 'publishing' },
          { label: 'Completed', value: 'completed' }
        ]
      }
    ];
  }

  private async fetchList(query: string, page: number, filters?: FilterInput[]) {
    const targetPage = Math.max(1, page);
    const url = new URL('/api/manga', SITE_BASE);
    url.searchParams.set('limit', String(PAGE_LIMIT));
    url.searchParams.set('offset', String((targetPage - 1) * PAGE_LIMIT));
    url.searchParams.set('sort', selectedFilter(filters, 'sort') || 'latest_chapter');
    if (query) url.searchParams.set('search', query);
    const type = selectedFilter(filters, 'type');
    const status = selectedFilter(filters, 'status');
    if (type) url.searchParams.set('type', type);
    if (status) url.searchParams.set('status', status);

    const data = await this.api<DoujinDesuManga[]>(url.toString());
    const items = Array.isArray(data) ? data.map((manga) => mangaFromApi(this.id, manga)) : [];
    return {
      items,
      page: targetPage,
      hasNextPage: items.length >= PAGE_LIMIT
    };
  }

  private async api<T>(pathOrUrl: string): Promise<T> {
    const url = new URL(pathOrUrl, SITE_BASE).toString();
    const raw = await fetchText(url, {
      sourceId: this.id,
      headers: {
        Accept: 'application/json',
        'X-App-Secret': API_SECRET
      }
    });
    return decodeDoujinDesuResponse(raw) as T;
  }
}
