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

const API_BASE = 'https://jumpg-webapi.tokyo-cdn.com/api';
const SITE_BASE = 'https://mangaplus.shueisha.co.jp';
const PAGE_LIMIT = 24;
const REQUEST_TIMEOUT = 15_000;
const SOURCE_LANGUAGE = 'ENGLISH';

interface MangaPlusTitle {
  titleId: number;
  name: string;
  author: string;
  portraitImageUrl: string;
  language?: string;
}

interface MangaPlusChapter {
  chapterId: number;
  name: string;
  subTitle?: string;
  startTimeStamp?: number;
}

interface MangaPlusPage {
  mangaPage?: {
    imageUrl: string;
    encryptionKey?: string;
  };
}

interface MangaPlusSuccess {
  titleRankingView?: {
    titles: MangaPlusTitle[];
  };
  titleUpdatedView?: {
    latestTitle: Array<{ title: MangaPlusTitle }>;
  };
  allTitlesViewV2?: {
    AllTitlesGroup: Array<{ titles: MangaPlusTitle[] }>;
  };
  titleDetailView?: {
    title: MangaPlusTitle;
    overview: string;
    viewingPeriodDescription?: string;
    nonAppearanceInfo?: string;
    titleLabels?: {
      releaseSchedule?: string;
    };
    chapterListGroup: Array<{
      firstChapterList?: MangaPlusChapter[];
      lastChapterList?: MangaPlusChapter[];
    }>;
  };
  mangaViewer?: {
    pages: MangaPlusPage[];
  };
}

interface MangaPlusResponse {
  success?: MangaPlusSuccess;
  error?: {
    popups?: Array<{ subject?: string; body?: string }>;
    englishPopup?: { subject?: string; body?: string };
  };
}

function normalizeAuthor(author: string) {
  return author
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');
}

function statusFrom(releaseSchedule?: string, nonAppearanceInfo?: string): MangaStatus {
  if (releaseSchedule === 'DISABLED' || releaseSchedule === 'COMPLETED') return 'completed';
  if (nonAppearanceInfo?.toLowerCase().includes('hiatus')) return 'hiatus';
  return 'ongoing';
}

function chapterNumber(name: string) {
  return Number(name.substring(name.indexOf('#') + 1)) || 0;
}

function titleUrl(id: number | string) {
  return `${SITE_BASE}/titles/${id}`;
}

function mangaFromTitle(title: MangaPlusTitle): Manga {
  return {
    id: String(title.titleId),
    sourceId: 'mangaplus',
    title: title.name,
    coverUrl: title.portraitImageUrl,
    author: normalizeAuthor(title.author),
    format: 'Manga',
    status: 'ongoing',
    genres: [],
    url: titleUrl(title.titleId)
  };
}

function paginate<T>(items: T[], page: number) {
  const start = (Math.max(1, page) - 1) * PAGE_LIMIT;
  return items.slice(start, start + PAGE_LIMIT);
}

function sortFrom(filters?: FilterInput[]) {
  const sort = filters?.find((entry) => entry.id === 'sort')?.value;
  if (sort === 'updated') return 'updated';
  if (sort === 'newest') return 'alphabetical';
  if (sort === 'popular' || sort === 'rating') return 'popular';
  return 'updated';
}

export class MangaPlusSource implements MangaSource {
  readonly id = 'mangaplus';
  readonly name = 'MANGA Plus';
  readonly baseUrl = SITE_BASE;
  readonly language = 'en/ja';
  readonly contentRating = 'safe' as const;
  readonly isNsfw = false;

  private readonly sessionToken = crypto.randomUUID();
  private allTitlesCache?: MangaPlusTitle[];

  async getList(page: number, filters?: FilterInput[]): Promise<MangaListResult> {
    const sort = sortFrom(filters);
    const titles =
      sort === 'updated'
        ? await this.getUpdatedTitles()
        : sort === 'alphabetical'
          ? await this.getAllTitles()
          : await this.getPopularTitles();

    const items = paginate(titles.map(mangaFromTitle), page);
    return {
      items,
      page,
      hasNextPage: page * PAGE_LIMIT < titles.length,
      total: titles.length
    };
  }

  async search(query: string, page: number): Promise<MangaListResult> {
    if (!query.trim()) return this.getList(page);
    const normalized = query.trim().toLowerCase();
    const titles = (await this.getAllTitles()).filter((title) => {
      const author = normalizeAuthor(title.author).toLowerCase();
      return title.name.toLowerCase().includes(normalized) || author.includes(normalized);
    });

    return {
      items: paginate(titles.map(mangaFromTitle), page),
      page,
      hasNextPage: page * PAGE_LIMIT < titles.length,
      total: titles.length
    };
  }

  async getDetail(mangaId: string): Promise<MangaDetail> {
    const json = await this.apiCall(`/title_detailV3?title_id=${encodeURIComponent(mangaId)}`);
    const detail = json.titleDetailView;
    if (!detail) throw this.parseError('MANGA Plus detail payload is missing titleDetailView');
    const manga = mangaFromTitle(detail.title);
    const releaseSchedule = detail.titleLabels?.releaseSchedule;

    return {
      ...manga,
      id: mangaId,
      description: [detail.overview, releaseSchedule === 'COMPLETED' ? '' : detail.viewingPeriodDescription]
        .filter(Boolean)
        .join('\n\n'),
      status: statusFrom(releaseSchedule, detail.nonAppearanceInfo),
      alternateTitles: []
    };
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const json = await this.apiCall(`/title_detailV3?title_id=${encodeURIComponent(mangaId)}`);
    const detail = json.titleDetailView;
    if (!detail) return [];

    return detail.chapterListGroup
      .flatMap((group) => [...(group.firstChapterList ?? []), ...(group.lastChapterList ?? [])])
      .filter((chapter) => chapter.subTitle)
      .map((chapter) => ({
        id: String(chapter.chapterId),
        mangaId,
        sourceId: this.id,
        number: chapterNumber(chapter.name),
        title: chapter.subTitle,
        language: detail.title.language?.toLowerCase() ?? 'en',
        uploadedAt: new Date((chapter.startTimeStamp ?? 0) * 1000 || Date.now()).toISOString(),
        scanlator: 'MANGA Plus by SHUEISHA',
        url: `${SITE_BASE}/viewer/${chapter.chapterId}`
      }));
  }

  async getPages(chapterId: string): Promise<string[]> {
    const json = await this.apiCall(
      `/manga_viewer?chapter_id=${encodeURIComponent(chapterId)}&split=yes&img_quality=super_high`
    );
    return (json.mangaViewer?.pages ?? [])
      .map((page) => page.mangaPage)
      .filter((page): page is NonNullable<MangaPlusPage['mangaPage']> => Boolean(page?.imageUrl))
      .map((page) => `${page.imageUrl}${page.encryptionKey ? `#${page.encryptionKey}` : ''}`);
  }

  async getFilters(): Promise<FilterOption[]> {
    return [
      {
        id: 'sort',
        label: 'Sort',
        type: 'select',
        values: [
          { label: 'Popular', value: 'popular' },
          { label: 'Updated', value: 'updated' },
          { label: 'Alphabetical', value: 'newest' }
        ]
      }
    ];
  }

  private async getPopularTitles() {
    const json = await this.apiCall('/title_list/ranking');
    return this.onlyConfiguredLanguage(json.titleRankingView?.titles ?? []);
  }

  private async getUpdatedTitles() {
    const json = await this.apiCall('/title_list/updated');
    return this.onlyConfiguredLanguage(json.titleUpdatedView?.latestTitle.map((entry) => entry.title) ?? []);
  }

  private async getAllTitles() {
    if (!this.allTitlesCache) {
      const json = await this.apiCall('/title_list/allV2');
      this.allTitlesCache = this.onlyConfiguredLanguage(
        json.allTitlesViewV2?.AllTitlesGroup.flatMap((group) => group.titles) ?? []
      ).sort((left, right) => left.name.localeCompare(right.name));
    }
    return this.allTitlesCache;
  }

  private onlyConfiguredLanguage(titles: MangaPlusTitle[]) {
    return titles.filter((title) => (title.language ?? SOURCE_LANGUAGE) === SOURCE_LANGUAGE);
  }

  private async apiCall(path: string): Promise<MangaPlusSuccess> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    const url = new URL(`${API_BASE}${path}`);
    url.searchParams.set('format', 'json');

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Session-Token': this.sessionToken,
          'User-Agent': 'GrimoireReader/0.1'
        },
        signal: controller.signal
      });
      const payload = (await response.json()) as MangaPlusResponse;
      if (!response.ok || !payload.success) {
        const popup = payload.error?.popups?.[0] ?? payload.error?.englishPopup;
        throw Object.assign(new Error(popup?.body ?? popup?.subject ?? `MANGA Plus HTTP ${response.status}`), {
          status: response.ok ? 502 : response.status,
          code: 'SOURCE_REQUEST_FAILED'
        });
      }
      return payload.success;
    } catch (error) {
      if (error instanceof Error && 'status' in error) throw error;
      const message = error instanceof Error ? error.message : 'network request failed';
      throw Object.assign(new Error(`MANGA Plus tidak bisa diakses dari jaringan ini (${message}).`), {
        status: 503,
        code: 'SOURCE_NETWORK_BLOCKED'
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseError(message: string) {
    return Object.assign(new Error(message), { status: 502, code: 'SOURCE_PARSE_FAILED' });
  }
}
