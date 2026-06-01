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
  MangaStatus,
  SourceHealth
} from '$lib/sources/types';
import { normalizeMangaFormat } from '$lib/utils/mangaFormat';

const REQUEST_TIMEOUT = 15_000;
const CARD_SELECTORS = [
  '.manga-grid .manga-card',
  'a.manga-card',
  '.listupd .bs',
  '.bsx',
  '.utao',
  '.animepost',
  '.postbody article',
  'article',
  '.serieslist li',
  '.komik-list .item',
  '.list-update_item'
].join(',');
const CHAPTER_SELECTORS = [
  '.eplister li',
  '.clstyle li',
  '.chapter-list li',
  '.wp-manga-chapter',
  '.bixbox li',
  '.eps_lst li',
  'li'
].join(',');

interface HtmlScraperSourceOptions {
  id: string;
  name: string;
  baseUrl: string;
  language?: string;
  contentRating?: 'safe' | 'suggestive' | 'explicit';
  listPath?: (page: number) => string;
  searchPath?: (query: string, page: number) => string;
}

function encodeId(url: string) {
  return Buffer.from(url, 'utf8').toString('base64url');
}

function decodeId(id: string) {
  try {
    return Buffer.from(id, 'base64url').toString('utf8');
  } catch {
    return id;
  }
}

function clean(text?: string) {
  return text?.replace(/\s+/g, ' ').trim() ?? '';
}

function absoluteUrl(baseUrl: string, href?: string) {
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) return '';
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return '';
  }
}

function imageFrom($: cheerio.CheerioAPI, element: AnyNode, baseUrl: string) {
  const node = $(element);
  const image =
    node.find('img').first().attr('data-src') ??
    node.find('img').first().attr('data-lazy-src') ??
    node.find('img').first().attr('data-original') ??
    node.find('img').first().attr('src') ??
    '';
  const url = absoluteUrl(baseUrl, image);
  try {
    const parsed = new URL(url);
    const wrapped = parsed.hostname === 'wsrv.nl' ? parsed.searchParams.get('url') : null;
    return wrapped ? absoluteUrl(baseUrl, wrapped) : url;
  } catch {
    return url;
  }
}

function statusFrom(text: string): MangaStatus {
  const value = text.toLowerCase();
  if (value.includes('complete') || value.includes('tamat')) return 'completed';
  if (value.includes('hiatus')) return 'hiatus';
  if (value.includes('cancel')) return 'cancelled';
  return 'ongoing';
}

function numberFrom(text: string) {
  const match = text.replace(',', '.').match(/(?:chapter|ch\.?|episode|eps?)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (match) return Number(match[1]);
  const fallback = text.match(/([0-9]+(?:\.[0-9]+)?)/);
  return fallback ? Number(fallback[1]) : 0;
}

function getMeta($: cheerio.CheerioAPI, labels: string[]) {
  const labelPattern = labels.map((label) => label.toLowerCase());
  let value = '';

  $('li, tr, .imptdt, .fmed, .spe span, .seriestugenre, .infox span').each((_, element) => {
    if (value) return;
    const text = clean($(element).text());
    const lower = text.toLowerCase();
    if (labelPattern.some((label) => lower.includes(label))) {
      value = clean(text.replace(/^[^:]+:\s*/, ''));
    }
  });

  return value;
}

async function fetchHtml(source: Pick<HtmlScraperSourceOptions, 'name' | 'baseUrl'>, pathOrUrl: string) {
  const target = new URL(pathOrUrl, source.baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(target, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'GrimoireReader/0.1'
      },
      signal: controller.signal,
      redirect: 'follow'
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok) {
      throw Object.assign(new Error(`${source.name} returned HTTP ${response.status}`), {
        status: response.status,
        code: 'SOURCE_HTTP_ERROR'
      });
    }
    if (!contentType.includes('html')) {
      throw Object.assign(new Error(`${source.name} did not return an HTML page`), {
        status: 502,
        code: 'SOURCE_UNSUPPORTED_RESPONSE'
      });
    }
    return response.text();
  } catch (error) {
    if (error instanceof Error && 'status' in error) throw error;
    const message = error instanceof Error ? error.message : 'network request failed';
    throw Object.assign(
      new Error(
        `${source.name} is unreachable from this network (${message}). Domain may be blocked, moved, or protected by anti-bot rules. Try another network, VPN, or update the source base URL.`
      ),
      { status: 503, code: 'SOURCE_NETWORK_BLOCKED' }
    );
  } finally {
    clearTimeout(timeout);
  }
}

export class HtmlScraperSource implements MangaSource {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly language: string;
  readonly contentRating: 'safe' | 'suggestive' | 'explicit';
  readonly isNsfw = false;
  private readonly listPath: (page: number) => string;
  private readonly searchPath: (query: string, page: number) => string;

  constructor(options: HtmlScraperSourceOptions) {
    this.id = options.id;
    this.name = options.name;
    this.baseUrl = options.baseUrl;
    this.language = options.language ?? 'id';
    this.contentRating = options.contentRating ?? 'suggestive';
    this.listPath = options.listPath ?? ((page) => (page > 1 ? `/page/${page}/` : '/'));
    this.searchPath =
      options.searchPath ??
      ((query, page) => `/?s=${encodeURIComponent(query)}${page > 1 ? `&page=${page}` : ''}`);
  }

  async getList(page: number, _filters?: FilterInput[]): Promise<MangaListResult> {
    const html = await fetchHtml(this, this.listPath(page));
    const items = this.parseMangaList(html);
    if (!items.length) {
      throw Object.assign(
        new Error(
          `${this.name} berhasil diakses, tapi tidak ada kartu manga yang bisa dibaca. Kemungkinan halaman source memakai render JavaScript, markup berubah, atau domain yang dipakai hanya landing page.`
        ),
        { status: 502, code: 'SOURCE_PARSE_EMPTY' }
      );
    }
    return { items, page, hasNextPage: items.length > 0 };
  }

  async search(query: string, page: number, _filters?: FilterInput[]): Promise<MangaListResult> {
    if (!query.trim()) return this.getList(page);
    const html = await fetchHtml(this, this.searchPath(query, page));
    const items = this.parseMangaList(html);
    return { items, page, hasNextPage: items.length > 0 };
  }

  async getDetail(mangaId: string): Promise<MangaDetail> {
    const url = decodeId(mangaId);
    const html = await fetchHtml(this, url);
    const $ = cheerio.load(html);
    const title =
      clean($('h1.entry-title, h1[itemprop="name"], .entry-title, .seriestuheader h1, .infox h1, h1').first().text()) ||
      'Untitled';
    const coverUrl = imageFrom($, $('.thumb, .bigcover, .infomanga, .series-thumb, .infox').first()[0] ?? $('body')[0], url);
    const description = clean(
      $('.entry-content[itemprop="description"], .desc, .entry-content, .seriestucontent, .sinopsis, .summary__content')
        .first()
        .text()
    );
    const genres = $('.genre-info a, .seriestugenre a, .mgen a, .genres a, a[rel="tag"]')
      .map((_, element) => clean($(element).text()))
      .get()
      .filter(Boolean);
    const author = getMeta($, ['author', 'pengarang']);
    const artist = getMeta($, ['artist', 'artis']);
    const statusText = getMeta($, ['status']);

    return {
      id: mangaId,
      sourceId: this.id,
      title,
      coverUrl,
      author,
      artist,
      description,
      status: statusFrom(statusText),
      genres,
      url,
      alternateTitles: []
    };
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const mangaUrl = decodeId(mangaId);
    const html = await fetchHtml(this, mangaUrl);
    const $ = cheerio.load(html);
    const chapters: Chapter[] = [];

    $(CHAPTER_SELECTORS).each((_, element) => {
      const link = $(element).find('a[href]').first();
      const href = absoluteUrl(mangaUrl, link.attr('href'));
      const text = clean(link.text() || $(element).text());
      if (!href || !text || !/chapter|ch\.?|episode|eps?/i.test(text + href)) return;
      chapters.push({
        id: encodeId(href),
        mangaId,
        sourceId: this.id,
        number: numberFrom(text),
        title: text,
        language: 'id',
        uploadedAt: new Date().toISOString(),
        scanlator: this.name,
        url: href
      });
    });

    const seen = new Set<string>();
    return chapters
      .filter((chapter) => {
        if (seen.has(chapter.id)) return false;
        seen.add(chapter.id);
        return true;
      })
      .sort((a, b) => b.number - a.number);
  }

  async getPages(chapterId: string): Promise<string[]> {
    const chapterUrl = decodeId(chapterId);
    const html = await fetchHtml(this, chapterUrl);
    const $ = cheerio.load(html);
    const pages = $('.reading-content img, .chapter-content img, .entry-content img, .postbody img, article img, img')
      .map((_, element) => {
        const src =
          $(element).attr('data-src') ??
          $(element).attr('data-lazy-src') ??
          $(element).attr('data-original') ??
          $(element).attr('src');
        return absoluteUrl(chapterUrl, src);
      })
      .get()
      .filter((src) => /\.(avif|webp|jpe?g|png)(\?|$)/i.test(src));

    return [...new Set(pages)];
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
          { label: 'Popular', value: 'popular' }
        ]
      }
    ];
  }

  async getHealth(): Promise<SourceHealth> {
    try {
      await fetchHtml(this, '/');
      return { status: 'online' };
    } catch (error) {
      return {
        status: 'limited',
        message: error instanceof Error ? error.message : `${this.name} health check failed`
      };
    }
  }

  private parseMangaList(html: string): Manga[] {
    const $ = cheerio.load(html);
    const items: Manga[] = [];

    $(CARD_SELECTORS).each((_, element) => {
      const node = $(element);
      const link = node.is('a[href]') ? node : node.find('a[href]').first();
      const href = absoluteUrl(this.baseUrl, link.attr('href'));
      const title =
        clean(node.find('.manga-card-title, .popular-title, .tt, .title, h2, h3, h4, a[title]').first().text()) ||
        clean(link.attr('title')) ||
        clean(link.text());
      if (!href || !title || href === this.baseUrl || /chapter|episode|privacy|discord|facebook/i.test(href)) {
        return;
      }

      items.push({
        id: encodeId(href),
        sourceId: this.id,
        title,
        coverUrl: imageFrom($, element, this.baseUrl),
        format: normalizeMangaFormat(clean($(element).text())),
        status: statusFrom(clean($(element).text())),
        genres: [],
        url: href
      });
    });

    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }
}
