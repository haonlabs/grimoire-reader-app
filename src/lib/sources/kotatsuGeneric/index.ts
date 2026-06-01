import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import type {
  Chapter,
  ContentRating,
  FilterInput,
  FilterOption,
  Manga,
  MangaDetail,
  MangaListResult,
  MangaSource,
  MangaStatus,
  SourceHealth,
  SourceMetadata
} from '$lib/sources/types';
import { normalizeMangaFormat } from '$lib/utils/mangaFormat';

const REQUEST_TIMEOUT = 12_000;

const LIST_SELECTORS = [
  '.page-item-detail',
  '.c-tabs-item__content',
  '.manga__item',
  '.manga-item',
  '.manga-grid-item',
  '.postbody .listupd .bs .bsx',
  '.listupd .bs',
  '.listupd .utao',
  '.bsx',
  '.utao',
  '.animepost',
  '.book-item',
  '.series-item',
  '.comic-item',
  '.manga',
  'article'
].join(',');

const CHAPTER_SELECTORS = [
  'li.wp-manga-chapter',
  '#chapterlist > ul > li',
  '.eplister li',
  '.clstyle li',
  '.chapter-list li',
  '.listing-chapters_wrap li',
  '.version-chap li',
  '.bixbox li',
  '.eps_lst li',
  '.episodes li',
  '.chapter li',
  'tr'
].join(',');

const PAGE_IMAGE_SELECTORS = [
  'div.main-col-inner div.reading-content div.page-break img',
  'div.reading-content img',
  'div#readerarea img',
  '.chapter-content img',
  '.entry-content img',
  '.page-break img',
  '.reader-area img',
  '.reading-area img',
  '.postbody img',
  'article img'
].join(',');

interface ParserProfile {
  listPaths: (page: number) => string[];
  searchPaths: (query: string, page: number) => string[];
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

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function absoluteUrl(baseUrl: string, href?: string | null) {
  if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('data:')) return '';
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return '';
  }
}

function safeHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
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
    node.find('img').first().attr('data-cfsrc') ??
    node.find('img').first().attr('srcset')?.split(',').at(-1)?.trim().split(/\s+/)[0] ??
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
  if (
    /complete|completed|finished|tamat|finalizado|concluido|concluído|terminé|hoàn thành|заверш|已完结|bitti/.test(
      value
    )
  ) {
    return 'completed';
  }
  if (/hiatus|paused|on hold|pausado|en pause/.test(value)) return 'hiatus';
  if (/cancel|dropped|abandonn|discontinued/.test(value)) return 'cancelled';
  return 'ongoing';
}

function numberFrom(text: string) {
  const normalized = text.replace(',', '.');
  const match = normalized.match(/(?:chapter|chap|ch\.?|episode|eps?|capitulo|cap|ตอน|第)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (match) return Number(match[1]);
  const fallback = normalized.match(/([0-9]+(?:\.[0-9]+)?)/);
  return fallback ? Number(fallback[1]) : 0;
}

function getMeta($: cheerio.CheerioAPI, labels: string[]) {
  const lowerLabels = labels.map((label) => label.toLowerCase());
  let value = '';

  $('li, tr, .imptdt, .fmed, .spe span, .seriestugenre, .infox span, .post-content_item, .tsinfo div').each(
    (_, element) => {
      if (value) return;
      const text = clean($(element).text());
      const lower = text.toLowerCase();
      if (lowerLabels.some((label) => lower.includes(label))) {
        value = clean(text.replace(/^[^:]+:\s*/, ''));
      }
    }
  );

  return value;
}

function looksLikeMangaUrl(href: string, baseUrl: string) {
  if (!href) return false;
  let url: URL;
  try {
    url = new URL(href, baseUrl);
  } catch {
    return false;
  }

  const path = url.pathname.toLowerCase();
  const blocked = [
    '/tag/',
    '/genre/',
    '/manga-genre/',
    '/category/',
    '/author/',
    '/artist/',
    '/privacy',
    '/dmca',
    '/login',
    '/register',
    '/bookmark',
    '/contact'
  ];
  if (blocked.some((part) => path.includes(part))) return false;
  if (/chapter|chap-|episode|episod|capitulo|komikcast-chapter|\/read\//i.test(path)) return false;

  return (
    /manga|manhwa|manhua|comic|komik|series|webtoon|title|project|serie|toon|truyen|mangas/i.test(path) ||
    path.split('/').filter(Boolean).length <= 2
  );
}

function titleFrom($: cheerio.CheerioAPI, node: cheerio.Cheerio<AnyNode>, link: cheerio.Cheerio<AnyNode>) {
  return (
    clean(
      node
        .find(
          '.manga-card-title, .popular-title, .tt, .title, .post-title, .manga-title, .series-title, h1, h2, h3, h4, a[title]'
        )
        .first()
        .text()
    ) ||
    clean(link.attr('title')) ||
    clean(link.find('img').attr('alt')) ||
    clean(link.text())
  );
}

function profileFor(engine: string): ParserProfile {
  if (engine === 'madara') {
    return {
      listPaths: (page) =>
        page > 1
          ? [`/manga/page/${page}/?m_orderby=latest`, `/page/${page}/?post_type=wp-manga`, `/manga/page/${page}/`]
          : ['/manga/?m_orderby=latest', '/?post_type=wp-manga', '/manga/'],
      searchPaths: (query, page) =>
        page > 1
          ? [`/page/${page}/?s=${encodeURIComponent(query)}&post_type=wp-manga`, `/?s=${encodeURIComponent(query)}&post_type=wp-manga&page=${page}`]
          : [`/?s=${encodeURIComponent(query)}&post_type=wp-manga`, `/manga/?s=${encodeURIComponent(query)}`]
    };
  }

  if (engine === 'mangareader') {
    return {
      listPaths: (page) => [
        `/manga/?order=update&page=${page}`,
        `/manga/?order=latest&page=${page}`,
        `/manga/?page=${page}`,
        page > 1 ? `/page/${page}/` : '/'
      ],
      searchPaths: (query, page) => [
        `/page/${page}/?s=${encodeURIComponent(query)}`,
        `/?s=${encodeURIComponent(query)}&page=${page}`,
        `/search?keyword=${encodeURIComponent(query)}&page=${page}`
      ]
    };
  }

  if (engine === 'wpcomics' || engine === 'madtheme' || engine === 'zeistmanga') {
    return {
      listPaths: (page) => [
        page > 1 ? `/manga/page/${page}/` : '/manga/',
        page > 1 ? `/series/page/${page}/` : '/series/',
        page > 1 ? `/page/${page}/` : '/'
      ],
      searchPaths: (query, page) => [
        `/?s=${encodeURIComponent(query)}${page > 1 ? `&page=${page}` : ''}`,
        `/search/${encodeURIComponent(query)}${page > 1 ? `/page/${page}` : ''}`
      ]
    };
  }

  return {
    listPaths: (page) => [
      `/manga/?page=${page}`,
      `/series/?page=${page}`,
      `/comics/?page=${page}`,
      `/webtoon/?page=${page}`,
      page > 1 ? `/page/${page}/` : '/'
    ],
    searchPaths: (query, page) => [
      `/?s=${encodeURIComponent(query)}${page > 1 ? `&page=${page}` : ''}`,
      `/search?keyword=${encodeURIComponent(query)}&page=${page}`,
      `/search?q=${encodeURIComponent(query)}&page=${page}`,
      `/manga/?s=${encodeURIComponent(query)}`
    ]
  };
}

async function fetchHtml(source: Pick<KotatsuGenericSource, 'name' | 'baseUrl'>, pathOrUrl: string, init?: RequestInit) {
  const target = new URL(pathOrUrl, source.baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(target, {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        Referer: `${new URL(source.baseUrl).origin}/`,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
        ...init?.headers
      },
      signal: controller.signal,
      redirect: 'follow',
      method: init?.method,
      body: init?.body
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok) {
      throw Object.assign(new Error(`${source.name} returned HTTP ${response.status}`), {
        status: response.status,
        code: 'SOURCE_HTTP_ERROR'
      });
    }
    if (contentType && !contentType.includes('html') && !contentType.includes('text/plain')) {
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
        `${source.name} tidak bisa diakses dari jaringan ini (${message}). Source mungkin pindah domain, mati, atau dilindungi anti-bot.`
      ),
      { status: 503, code: 'SOURCE_NETWORK_BLOCKED' }
    );
  } finally {
    clearTimeout(timeout);
  }
}

export class KotatsuGenericSource implements MangaSource {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly language: string;
  readonly contentRating: ContentRating;
  readonly isNsfw: boolean;
  private readonly engine: string;
  private readonly profile: ParserProfile;

  constructor(metadata: SourceMetadata) {
    this.id = metadata.id;
    this.name = metadata.name;
    this.baseUrl = metadata.baseUrl;
    this.language = metadata.language;
    this.contentRating = metadata.contentRating;
    this.isNsfw = metadata.isNsfw;
    this.engine = metadata.id.match(/^kotatsu_([^_]+)/)?.[1] ?? 'generic';
    this.profile = profileFor(this.engine);
  }

  async getList(page: number, _filters?: FilterInput[]): Promise<MangaListResult> {
    const items = await this.fetchFirstList(this.profile.listPaths(Math.max(1, page)));
    return { items, page, hasNextPage: items.length > 0 };
  }

  async search(query: string, page: number, _filters?: FilterInput[]): Promise<MangaListResult> {
    if (!query.trim()) return this.getList(page);
    const items = await this.fetchFirstList(this.profile.searchPaths(query.trim(), Math.max(1, page)));
    return { items, page, hasNextPage: items.length > 0 };
  }

  async getDetail(mangaId: string): Promise<MangaDetail> {
    const url = decodeId(mangaId);
    const html = await fetchHtml(this, url);
    const $ = cheerio.load(html);
    const title =
      clean(
        $(
          'h1.entry-title, h1[itemprop="name"], .post-title h1, .seriestuheader h1, .seriestucontent h1, .infox h1, h1'
        )
          .first()
          .text()
      ) ||
      clean($('meta[property="og:title"]').attr('content')) ||
      'Untitled';
    const coverRoot =
      $('.summary_image, .thumb, .bigcover, .infomanga, .series-thumb, .infox, .seriestucont, .postbody').first()[0] ??
      $('body')[0];
    const description = clean(
      $(
        'div.description-summary div.summary__content, div.summary_content div.post-content_item > h5 + div, div.summary_content div.manga-excerpt, div.post-content div.manga-summary, div.post-content div.desc, div.c-page__content div.summary__content, .entry-content[itemprop="description"], .desc, .entry-content, .seriestucontent, .sinopsis, .summary__content'
      )
        .first()
        .text()
    );
    const genres = $(
      'div.genres-content a, .genre-info a, .seriestugenre a, .mgen a, .genres a, a[rel="tag"], a[href*="/genre/"], a[href*="/manga-genre/"]'
    )
      .map((_, element) => clean($(element).text()))
      .get()
      .filter(Boolean);
    const author = getMeta($, ['author', 'auteur', 'pengarang', 'autor']);
    const artist = getMeta($, ['artist', 'artis']);
    const statusText = getMeta($, ['status', 'statut', 'estado', 'durum', 'statüsü', 'tình trạng']);
    const bodyText = clean($('body').text());

    return {
      id: mangaId,
      sourceId: this.id,
      title,
      coverUrl: imageFrom($, coverRoot, url),
      author,
      artist,
      description,
      format: normalizeMangaFormat(bodyText),
      status: statusFrom(statusText || bodyText),
      genres: unique(genres),
      url,
      alternateTitles: []
    };
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const mangaUrl = decodeId(mangaId);
    const html = await fetchHtml(this, mangaUrl);
    const $ = cheerio.load(html);
    let chapters = this.parseChapters($, mangaId, mangaUrl);

    if (!chapters.length && this.engine === 'madara') {
      const ajaxUrl = `${mangaUrl.replace(/\/$/, '')}/ajax/chapters/`;
      try {
        const ajaxHtml = await fetchHtml(this, ajaxUrl, { method: 'POST' });
        chapters = this.parseChapters(cheerio.load(ajaxHtml), mangaId, mangaUrl);
      } catch {
        // Some Madara sites disable the AJAX chapter endpoint. The inline chapter list is enough when present.
      }
    }

    return chapters;
  }

  async getPages(chapterId: string): Promise<string[]> {
    const chapterUrl = decodeId(chapterId);
    const html = await fetchHtml(this, chapterUrl);
    const $ = cheerio.load(html);
    const scriptPages = this.extractScriptPages($, chapterUrl);
    if (scriptPages.length) return scriptPages;

    const pages = $(PAGE_IMAGE_SELECTORS)
      .map((_, element) => {
        const src =
          $(element).attr('data-src') ??
          $(element).attr('data-lazy-src') ??
          $(element).attr('data-original') ??
          $(element).attr('data-cfsrc') ??
          $(element).attr('srcset')?.split(',').at(-1)?.trim().split(/\s+/)[0] ??
          $(element).attr('src');
        return absoluteUrl(chapterUrl, src);
      })
      .get()
      .filter((src) => /\.(avif|webp|jpe?g|png)(\?|$)/i.test(src));

    return unique(pages);
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
      return { status: 'online', message: 'Generic Kotatsu parser' };
    } catch (error) {
      return {
        status: 'limited',
        message: error instanceof Error ? error.message : `${this.name} health check failed`
      };
    }
  }

  private async fetchFirstList(paths: string[]) {
    let lastError: unknown;
    for (const path of unique(paths).slice(0, 5)) {
      try {
        const html = await fetchHtml(this, path);
        const items = this.parseMangaList(html);
        if (items.length) return items;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError instanceof Error) throw lastError;
    throw Object.assign(
      new Error(
        `${this.name} berhasil diakses, tapi parser generic belum menemukan kartu manga yang cocok untuk template ${this.engine}.`
      ),
      { status: 502, code: 'SOURCE_PARSE_EMPTY' }
    );
  }

  private parseMangaList(html: string): Manga[] {
    const $ = cheerio.load(html);
    const host = safeHostname(this.baseUrl);
    const items: Manga[] = [];

    $(LIST_SELECTORS).each((_, element) => {
      const node = $(element);
      const link = node.is('a[href]') ? node : node.find('a[href]').first();
      const href = absoluteUrl(this.baseUrl, link.attr('href'));
      const title = titleFrom($, node, link);
      if (!href || !title || !looksLikeMangaUrl(href, this.baseUrl)) return;

      items.push({
        id: encodeId(href),
        sourceId: this.id,
        title,
        coverUrl: imageFrom($, element, this.baseUrl),
        format: normalizeMangaFormat(clean(node.text())),
        status: statusFrom(clean(node.text())),
        genres: [],
        url: href
      });
    });

    if (items.length < 3) {
      $('a[href]').each((_, element) => {
        const link = $(element);
        const href = absoluteUrl(this.baseUrl, link.attr('href'));
        if (!href || !looksLikeMangaUrl(href, this.baseUrl)) return;
        if (safeHostname(href) !== host) return;
        const parent = link.closest('article, .item, .bs, .bsx, .utao, .post, .manga, .series, .card');
        const title = titleFrom($, parent.length ? parent : link, link);
        if (!title || title.length < 2 || title.length > 120) return;
        items.push({
          id: encodeId(href),
          sourceId: this.id,
          title,
          coverUrl: parent.length ? imageFrom($, parent[0], this.baseUrl) : imageFrom($, element, this.baseUrl),
          format: normalizeMangaFormat(clean(parent.text() || link.text())),
          status: statusFrom(clean(parent.text() || link.text())),
          genres: [],
          url: href
        });
      });
    }

    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  private parseChapters($: cheerio.CheerioAPI, mangaId: string, mangaUrl: string) {
    const chapters: Chapter[] = [];

    $(CHAPTER_SELECTORS).each((_, element) => {
      const link = $(element).find('a[href]').first();
      const href = absoluteUrl(mangaUrl, link.attr('href'));
      const text = clean(
        $(element).find('.chapternum, .chapter-title, .entry-title, .title').first().text() ||
          link.text() ||
          $(element).text()
      );
      if (!href || !text || !/chapter|chap|ch\.?|episode|eps?|capitulo|cap|ตอน|第/i.test(`${text} ${href}`)) return;

      chapters.push({
        id: encodeId(href),
        mangaId,
        sourceId: this.id,
        number: numberFrom(text),
        title: text,
        language: this.language,
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

  private extractScriptPages($: cheerio.CheerioAPI, chapterUrl: string) {
    const pages: string[] = [];

    $('script').each((_, element) => {
      const script = $(element).html() ?? '';
      const tsReader = script.match(/ts_reader\.run\((\{[\s\S]*?\})\);?/);
      if (tsReader) {
        try {
          const data = JSON.parse(tsReader[1]);
          const images = data?.sources?.[0]?.images;
          if (Array.isArray(images)) pages.push(...images.map((src) => absoluteUrl(chapterUrl, String(src))));
        } catch {
          // Ignore malformed script data and fall back to DOM image extraction.
        }
      }

      for (const match of script.matchAll(/["'](https?:\/\/[^"']+\.(?:avif|webp|jpe?g|png)(?:\?[^"']*)?)["']/gi)) {
        pages.push(absoluteUrl(chapterUrl, match[1]));
      }
    });

    return unique(pages.filter(Boolean));
  }
}
