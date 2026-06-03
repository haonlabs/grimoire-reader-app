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
import type {
  Chapter,
  ContentRating,
  FilterInput,
  FilterOption,
  Manga,
  MangaDetail,
  MangaListResult,
  MangaSource
} from '$lib/sources/types';

type AdultMode = 'exclude' | 'include' | 'only';
type ParsedHtml = ReturnType<typeof loadHtml>;
type Selection = ReturnType<ParsedHtml>;

interface SortMapping {
  param: string;
  values: Partial<Record<string, string>>;
}

interface WordpressSourceOptions {
  id: string;
  name: string;
  baseUrl: string;
  language: string;
  contentRating: ContentRating;
  isNsfw: boolean;
  archivePath?: string;
  mirrorBaseUrls?: string[];
  pageSize?: number;
  searchPostType?: string;
  adultGenreSlug?: string;
  adultGenreIds?: string[];
  adultOnlyGenreIds?: string[];
  adultExcludeGenreIds?: string[];
  adultGenreLabel?: string;
  sort?: SortMapping;
}

const DEFAULT_PAGE_SIZE = 24;
const IMAGE_EXTENSIONS = /\.(?:avif|gif|jpe?g|png|webp)(?:[?#][^"'<>]*)?$/i;
const BLOCKED_IMAGE_HINTS =
  /(?:\/|%2f)(?:ads?|banner|avatar|favicon|.*logo|cover(?:_|-)?|placeholder|no-?image|lazy|loading|disclaimer|komisi|loyalty|jasa)[^/]*(?:\.|$)/i;
const ADULT_RE = /\b(?:18\+|r-?18|adult|mature|hentai|ecchi|erotica|smut|porn)\b/i;

function selectedString(filters: FilterInput[] | undefined, id: string) {
  const value = filters?.find((filter) => filter.id === id)?.value;
  return typeof value === 'string' ? value : '';
}

function adultModeFrom(filters?: FilterInput[]): AdultMode {
  const value = selectedString(filters, 'adultMode');
  if (value === 'include' || value === 'only') return value;
  return 'exclude';
}

function pagedPath(path: string, page: number) {
  const normalized = path.endsWith('/') ? path : `${path}/`;
  return page > 1 ? `${normalized}page/${page}/` : normalized;
}

function ratingFrom(text?: string | null) {
  const value = clean(text).match(/[0-9]+(?:\.[0-9]+)?/);
  return value ? Number(value[0]) : undefined;
}

function dedupe<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item);
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function decodeEscapedString(value: string) {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value.replace(/\\\//g, '/').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
}

function parseTsReaderImages(html: string) {
  const pages: string[] = [];
  const arrays = html.matchAll(/["']images["']\s*:\s*\[([\s\S]*?)\]/g);
  for (const array of arrays) {
    const values = array[1]?.matchAll(/"((?:\\.|[^"])*)"/g) ?? [];
    for (const value of values) {
      const decoded = decodeEscapedString(value[1] ?? '');
      if (decoded) pages.push(decoded);
    }
  }
  return pages;
}

function scriptImageUrls(html: string) {
  return [...html.matchAll(/https?:\\?\/\\?\/[^"'<>\\]+(?:\\?\/[^"'<>\\]+)*?\.(?:avif|gif|jpe?g|png|webp)(?:\?[^"'<>\\]*)?/gi)]
    .map((match) => decodeEscapedString(match[0].replace(/\\\//g, '/')))
    .filter(Boolean);
}

function normalizePageUrl(baseUrl: string, value?: string | null) {
  const url = absoluteUrl(baseUrl, clean(value));
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.pathname.includes('/themes/') || parsed.pathname.includes('/plugins/')) return '';
    if (parsed.protocol === 'data:') return '';
    const lower = decodeURIComponent(parsed.toString()).toLowerCase();
    if (!IMAGE_EXTENSIONS.test(lower) || BLOCKED_IMAGE_HINTS.test(lower)) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function normalizeMediaUrl(baseUrl: string, value?: string | null) {
  const url = absoluteUrl(baseUrl, clean(value));
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith('.manga18.club')) {
      parsed.hostname = parsed.hostname.replace(/\.manga18\.club$/, '.manga18.us');
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function detailValue($: ParsedHtml, labels: string[]) {
  const wanted = labels.map((label) => label.toLowerCase());
  let value = '';
  $('.post-content_item, .imptdt, .tsinfo .imptdt, .infotable tr, .seriestucontent .infotable tr').each((_, element) => {
    if (value) return;
    const node = $(element);
    const heading = clean(
      node.find('.summary-heading, b, strong, i, th, td').first().text() ||
        node.children().first().text()
    ).toLowerCase();
    const text = clean(node.text());
    const lower = `${heading} ${text}`.toLowerCase();
    if (!wanted.some((label) => lower.includes(label))) return;
    value =
      clean(node.find('.summary-content, td').last().text()) ||
      clean(node.children().last().text()) ||
      clean(text.replace(/^[^:]+:\s*/, ''));
  });
  return value;
}

function titleFromDetail($: ParsedHtml) {
  return (
    clean($('.post-title h1').first().text()) ||
    clean($('h1.entry-title').first().text()) ||
    clean($('.seriestucon h1, .seriestucontent h1, .infox h1').first().text()) ||
    clean($('meta[property="og:title"]').attr('content')) ||
    clean($('title').text().split(/[|\-–]/)[0]) ||
    'Untitled'
  );
}

function chapterTitle(node: Selection, link: Selection) {
  return (
    clean(node.find('.chapter a, .chapternum, .eph-num a, .lchx a').first().text()) ||
    clean(link.attr('title')) ||
    clean(link.text()) ||
    'Chapter'
  );
}

export class WordpressMangaSource implements MangaSource {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly language: string;
  readonly contentRating: ContentRating;
  readonly isNsfw: boolean;

  private readonly archivePath: string;
  private readonly mirrorBaseUrls: string[];
  private readonly pageSize: number;
  private readonly searchPostType?: string;
  private readonly adultGenreSlug?: string;
  private readonly adultOnlyGenreIds: string[];
  private readonly adultExcludeGenreIds: string[];
  private readonly adultGenreLabel: string;
  private readonly sort?: SortMapping;

  constructor(options: WordpressSourceOptions) {
    this.id = options.id;
    this.name = options.name;
    this.baseUrl = options.baseUrl;
    this.language = options.language;
    this.contentRating = options.contentRating;
    this.isNsfw = options.isNsfw;
    this.archivePath = options.archivePath ?? '/manga/';
    this.mirrorBaseUrls = dedupe(options.mirrorBaseUrls ?? [], (url) => url.replace(/\/+$/, ''));
    this.pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    this.searchPostType = options.searchPostType;
    this.adultGenreSlug = options.adultGenreSlug;
    this.adultOnlyGenreIds = options.adultOnlyGenreIds ?? options.adultGenreIds ?? [];
    this.adultExcludeGenreIds = options.adultExcludeGenreIds ?? options.adultGenreIds ?? this.adultOnlyGenreIds;
    this.adultGenreLabel = options.adultGenreLabel ?? 'R-18';
    this.sort = options.sort;
  }

  async getList(page: number, filters?: FilterInput[]): Promise<MangaListResult> {
    const targetPage = Math.max(1, page);
    const adultMode = adultModeFrom(filters);
    const url = this.buildBrowseUrl(targetPage, filters, adultMode);
    const response = await this.fetchWithBase(url.toString());
    const items = await this.applyAdultMode(
      this.parseMangaList(response.text, response.baseUrl),
      adultMode,
      targetPage,
      filters
    );
    return {
      items,
      page: targetPage,
      hasNextPage: items.length >= this.pageSize
    };
  }

  async search(query: string, page: number, filters?: FilterInput[]): Promise<MangaListResult> {
    if (!query.trim()) return this.getList(page, filters);
    const targetPage = Math.max(1, page);
    const adultMode = adultModeFrom(filters);
    const url = new URL(pagedPath('/', targetPage), this.baseUrl);
    url.searchParams.set('s', query.trim());
    if (this.searchPostType) url.searchParams.set('post_type', this.searchPostType);
    const response = await this.fetchWithBase(url.toString());
    const items = await this.applyAdultMode(
      this.parseMangaList(response.text, response.baseUrl),
      adultMode,
      targetPage,
      filters
    );
    return {
      items,
      page: targetPage,
      hasNextPage: items.length >= this.pageSize
    };
  }

  async getDetail(mangaId: string): Promise<MangaDetail> {
    const url = decodeId(mangaId);
    const { text: html, baseUrl } = await this.fetchWithBase(url);
    const $ = loadHtml(html);
    const title = titleFromDetail($);
    const cover =
      clean($('meta[property="og:image"]').attr('content')) ||
      imageSrc($, $('.summary_image img, .thumb img, .seriestucontl img, .info-left img, img.wp-post-image').first(), baseUrl);
    const author = detailValue($, ['author']) || undefined;
    const artist = detailValue($, ['artist']) || undefined;
    const typeText = detailValue($, ['type', 'format']) || html;
    const statusText = detailValue($, ['status']) || html;
    const genres = dedupe(
      [
        ...$('.genres-content a, .mgen a, .seriestugenre a, .genre a, .wd-full .mgen a')
          .map((_, element) => clean($(element).text()))
          .get(),
        ...$('.post-content_item')
          .filter((_, element) => clean($(element).text()).toLowerCase().includes('genre'))
          .find('a')
          .map((_, element) => clean($(element).text()))
          .get()
      ].filter(Boolean),
      (genre) => genre.toLowerCase()
    );
    const alternateTitles = clean(detailValue($, ['alternative', 'other name', 'judul lain']))
      .split(/[,;|]/)
      .map(clean)
      .filter(Boolean);

    return {
      id: mangaId,
      sourceId: this.id,
      title,
      coverUrl: normalizeMediaUrl(baseUrl, cover),
      author,
      artist,
      description:
        clean($('.description-summary .summary__content').first().text()) ||
        clean($('.entry-content, .seriestucontent .entry-content, .desc, .summary__content').first().text()),
      format: formatFrom(typeText),
      status: statusFrom(statusText),
      genres,
      rating: ratingFrom($('.post-total-rating .score, .numscore, .rating .score').first().text()),
      url,
      alternateTitles
    };
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const url = decodeId(mangaId);
    const { text: html, baseUrl } = await this.fetchWithBase(url);
    const $ = loadHtml(html);
    let chapters = this.parseChapters($, mangaId, baseUrl);
    if (!chapters.length) {
      const ajaxHtml = await this.fetchMadaraChapters($, html, baseUrl);
      if (ajaxHtml) chapters = this.parseChapters(loadHtml(ajaxHtml), mangaId, baseUrl);
    }
    return dedupe(chapters, (chapter) => chapter.url).sort((left, right) => right.number - left.number);
  }

  async getPages(chapterId: string): Promise<string[]> {
    const chapterUrl = decodeId(chapterId);
    const { text: html, baseUrl } = await this.fetchWithBase(chapterUrl);
    const $ = loadHtml(html);
    const direct = $('.reading-content img, .page-break img, #readerarea img, .wp-manga-chapter-img, .entry-content img')
      .map((_, element) => normalizePageUrl(baseUrl, imageSrc($, $(element), baseUrl)))
      .get()
      .filter(Boolean);
    const scripted = [...parseTsReaderImages(html), ...scriptImageUrls(html)]
      .map((url) => normalizePageUrl(baseUrl, url))
      .filter(Boolean);
    const pages = dedupe([...direct, ...scripted], (page) => page);
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
          { label: 'Updated', value: 'updated' },
          { label: 'Newest', value: 'newest' },
          { label: 'Popular', value: 'popular' },
          { label: 'Rating', value: 'rating' }
        ]
      },
      {
        id: 'adultMode',
        label: '18+',
        type: 'select',
        values: [
          { label: 'Without 18+', value: 'exclude' },
          { label: 'All', value: 'include' },
          { label: 'Only 18+', value: 'only' }
        ]
      }
    ];
  }

  private buildBrowseUrl(
    page: number,
    filters: FilterInput[] | undefined,
    adultMode: AdultMode,
    adultGenreIds = this.adultOnlyGenreIds
  ) {
    const useAdultQuery = adultMode === 'only' && adultGenreIds.length > 0;
    const useAdultPath = adultMode === 'only' && !useAdultQuery && this.adultGenreSlug;
    const path = useAdultPath ? `/genre/${this.adultGenreSlug}/` : this.archivePath;
    const url = new URL(pagedPath(path, page), this.baseUrl);
    if (this.sort && !useAdultPath) {
      const sort = selectedString(filters, 'sort') || 'updated';
      const mapped = this.sort.values[sort] ?? this.sort.values.updated;
      if (mapped) url.searchParams.set(this.sort.param, mapped);
    }
    if (useAdultQuery) url.searchParams.set('genre', adultGenreIds.join(','));
    return url;
  }

  private parseMangaList(html: string, baseUrl = this.baseUrl): Manga[] {
    const $ = loadHtml(html);
    const cards = $('.page-item-detail, .c-tabs-item, .story_item.bsx, .bs .bsx, .utao .uta, .listupd .bs, .listupd .bsx')
      .map((_, element) => this.parseMangaCard($, $(element), baseUrl))
      .get()
      .filter(Boolean) as Manga[];
    return dedupe(cards, (item) => item.url).slice(0, this.pageSize);
  }

  private parseMangaCard($: ParsedHtml, node: Selection, baseUrl: string): Manga | null {
    const link =
      node.find('.post-title a, h3 a, h4 a, .tt a, a[href*="/manga/"]').first().length
        ? node.find('.post-title a, h3 a, h4 a, .tt a, a[href*="/manga/"]').first()
        : node.is('a')
          ? node
          : node.find('a').first();
    const url = absoluteUrl(baseUrl, link.attr('href'));
    const title =
      clean(node.find('.post-title a, h3, h4, .tt, .luf h4').first().text()) ||
      clean(link.attr('title')) ||
      clean(node.find('img').first().attr('alt')) ||
      clean(link.text());
    if (!url || !title) return null;
    const text = clean(node.text());
    return {
      id: encodeId(url),
      sourceId: this.id,
      title,
      coverUrl: normalizeMediaUrl(baseUrl, imageSrc($, node.find('.item-thumb img, .limit img, .imgu img, img').first(), baseUrl)),
      format: formatFrom(text),
      status: statusFrom(clean(node.find('.status, .manga-title-badges, .post-status').first().text()) || text),
      genres: [],
      rating: ratingFrom(node.find('.score, .numscore, .rating').first().text()),
      url
    };
  }

  private parseChapters($: ParsedHtml, mangaId: string, baseUrl: string): Chapter[] {
    return $('.wp-manga-chapter, .chapter-item, #chapterlist li, .eplister li, .episodelist li, .eph-num, .lchx')
      .map((index, element) => {
        const node = $(element);
        const link = node.find('a').first();
        const url = absoluteUrl(baseUrl, link.attr('href'));
        if (!url) return null;
        const title = chapterTitle(node, link);
        return {
          id: encodeId(url),
          mangaId,
          sourceId: this.id,
          number: numberFrom(title) || index + 1,
          title,
          language: this.language,
          uploadedAt:
            clean(node.find('.chapter-release-date, .chapterdate, .post-on, .date, .epdate').first().text()) ||
            new Date().toISOString(),
          url
        };
      })
      .get()
      .filter(Boolean) as Chapter[];
  }

  private async fetchMadaraChapters($: ParsedHtml, html: string, baseUrl: string) {
    const mangaId =
      clean($('#manga-chapters-holder').attr('data-id')) ||
      clean($('input.rating-post-id, input[name="manga_id"]').first().attr('value')) ||
      clean(html.match(/manga_id["']?\s*[:=]\s*["']?([0-9]+)/i)?.[1]);
    if (!mangaId) return '';
    const ajaxUrl =
      clean(html.match(/ajax_url["']?\s*[:=]\s*["']([^"']+)/i)?.[1]) ||
      new URL('/wp-admin/admin-ajax.php', baseUrl).toString();
    const body = new URLSearchParams({ action: 'manga_get_chapters', manga: mangaId }).toString();
    try {
      return await this.fetch(absoluteUrl(baseUrl, ajaxUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body
      });
    } catch {
      return '';
    }
  }

  private async applyAdultMode(
    items: Manga[],
    adultMode: AdultMode,
    page: number,
    filters?: FilterInput[]
  ) {
    if (adultMode === 'include') return items;
    if (adultMode === 'only' && (this.adultGenreSlug || this.adultOnlyGenreIds.length)) return items;

    let adultUrls = new Set<string>();
    if (adultMode === 'exclude' && this.adultExcludeGenreIds.length) {
      try {
        const adultUrl = this.buildBrowseUrl(page, filters, 'only', this.adultExcludeGenreIds);
        const adultResponse = await this.fetchWithBase(adultUrl.toString());
        adultUrls = new Set(this.parseMangaList(adultResponse.text, adultResponse.baseUrl).map((item) => item.url));
      } catch {
        adultUrls = new Set();
      }
    }

    return items.filter((item) => {
      const haystack = `${item.title} ${item.genres.join(' ')}`;
      const isAdult = adultUrls.has(item.url) || ADULT_RE.test(haystack);
      return adultMode === 'only' ? isAdult : !isAdult;
    });
  }

  private mirrorCandidates(url: string) {
    const parsed = new URL(url);
    const bases = [parsed.origin, this.baseUrl, ...this.mirrorBaseUrls];
    return dedupe(bases, (base) => base.replace(/\/+$/, ''))
      .map((baseUrl) => {
        const next = new URL(url);
        const mirror = new URL(baseUrl);
        next.protocol = mirror.protocol;
        next.host = mirror.host;
        return { url: next.toString(), baseUrl: mirror.origin };
      });
  }

  private async fetchWithBase(url: string, init: Parameters<typeof fetchText>[1] = {}) {
    let lastError: unknown;
    for (const candidate of this.mirrorCandidates(url)) {
      try {
        return {
          text: await fetchText(candidate.url, { ...init, sourceId: this.id }),
          baseUrl: candidate.baseUrl
        };
      } catch (error) {
        lastError = error;
        const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 0;
        const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
        if (!['SOURCE_BLOCKED', 'SOURCE_HTTP_ERROR', 'SOURCE_NETWORK_BLOCKED'].includes(code) && status < 400) {
          throw error;
        }
      }
    }
    throw lastError;
  }

  private async fetch(url: string, init: Parameters<typeof fetchText>[1] = {}) {
    return (await this.fetchWithBase(url, init)).text;
  }
}
