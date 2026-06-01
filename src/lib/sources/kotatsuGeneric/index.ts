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

const DEFAULT_LIST_SELECTORS = [
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
];

const DEFAULT_CHAPTER_SELECTORS = [
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
];

const DEFAULT_PAGE_IMAGE_SELECTORS = [
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
];

interface ParserProfile {
  listPaths: (page: number) => string[];
  searchPaths: (query: string, page: number) => string[];
  listSelectors: string[];
  titleSelectors: string[];
  imageSelectors: string[];
  chapterSelectors: string[];
  pageSelectors: string[];
  detailDescriptionSelectors: string[];
  genreSelectors: string[];
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

function selectorFor(selectors: string[]) {
  return unique(selectors.filter(Boolean)).join(',');
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

function imageFrom($: cheerio.CheerioAPI, element: AnyNode, baseUrl: string, selectors: string[] = []) {
  const node = $(element);
  const scopedImage = selectors.length ? node.find(selectorFor(selectors)).first() : $();
  const imageNode = scopedImage.length ? scopedImage : node.find('img').first();
  const image =
    imageNode.attr('data-src') ??
    imageNode.attr('data-lazy-src') ??
    imageNode.attr('data-original') ??
    imageNode.attr('data-cfsrc') ??
    imageNode.attr('data-url') ??
    imageNode.attr('uid') ??
    imageNode.attr('srcset')?.split(',').at(-1)?.trim().split(/\s+/)[0] ??
    imageNode.attr('src') ??
    node.find('[style*="background-image"]').first().attr('style')?.match(/url\(["']?([^"')]+)["']?\)/i)?.[1] ??
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

function isLikelyPageImage(src: string) {
  if (!src) return false;
  try {
    const url = new URL(src);
    const value = `${url.hostname}${url.pathname}${url.search}`.toLowerCase();
    if (/logo|banner|avatar|favicon|placeholder|loading|blank|sprite|ads?[-_/]/i.test(value)) return false;
    return (
      /\.(avif|webp|jpe?g|png)(\?|$)/i.test(src) ||
      /drive\.google\.com\/thumbnail|googleusercontent\.com|blogger\.googleusercontent\.com|bp\.blogspot\.com/i.test(src)
    );
  } catch {
    return false;
  }
}

function titleFrom(
  $: cheerio.CheerioAPI,
  node: cheerio.Cheerio<AnyNode>,
  link: cheerio.Cheerio<AnyNode>,
  selectors: string[] = []
) {
  return (
    clean(selectors.length ? node.find(selectorFor(selectors)).first().text() : '') ||
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

function makeProfile(profile: Partial<ParserProfile> & Pick<ParserProfile, 'listPaths' | 'searchPaths'>): ParserProfile {
  return {
    listSelectors: DEFAULT_LIST_SELECTORS,
    titleSelectors: [],
    imageSelectors: ['img'],
    chapterSelectors: DEFAULT_CHAPTER_SELECTORS,
    pageSelectors: DEFAULT_PAGE_IMAGE_SELECTORS,
    detailDescriptionSelectors: [
      'div.description-summary div.summary__content',
      'div.summary_content div.post-content_item > h5 + div',
      'div.summary_content div.manga-excerpt',
      'div.post-content div.manga-summary',
      'div.post-content div.desc',
      'div.c-page__content div.summary__content',
      '.entry-content[itemprop="description"]',
      '.desc',
      '.entry-content',
      '.seriestucontent',
      '.sinopsis',
      '.summary__content'
    ],
    genreSelectors: [
      'div.genres-content a',
      '.genre-info a',
      '.seriestugenre a',
      '.mgen a',
      '.genres a',
      'a[rel="tag"]',
      'a[href*="/genre/"]',
      'a[href*="/manga-genre/"]'
    ],
    ...profile
  };
}

function profileFor(engine: string): ParserProfile {
  if (engine === 'madara') {
    return makeProfile({
      listPaths: (page) =>
        page > 1
          ? [
              `/manga/page/${page}/?m_orderby=latest`,
              `/page/${page}/?post_type=wp-manga`,
              `/manga/page/${page}/`,
              `/wp-admin/admin-ajax.php?__kotatsu=madara_latest&page=${page}`
            ]
          : ['/manga/?m_orderby=latest', '/?post_type=wp-manga', '/manga/', '/wp-admin/admin-ajax.php?__kotatsu=madara_latest&page=1'],
      searchPaths: (query, page) =>
        page > 1
          ? [
              `/page/${page}/?s=${encodeURIComponent(query)}&post_type=wp-manga`,
              `/?s=${encodeURIComponent(query)}&post_type=wp-manga&page=${page}`,
              `/wp-admin/admin-ajax.php?__kotatsu=madara_search&page=${page}&q=${encodeURIComponent(query)}`
            ]
          : [
              `/?s=${encodeURIComponent(query)}&post_type=wp-manga`,
              `/manga/?s=${encodeURIComponent(query)}`,
              `/wp-admin/admin-ajax.php?__kotatsu=madara_search&page=1&q=${encodeURIComponent(query)}`
            ],
      listSelectors: ['div.row.c-tabs-item__content', '.page-item-detail', '.c-tabs-item__content', '.manga__item'],
      titleSelectors: ['.post-title h3', '.post-title h5', '.manga-title-badges', '.h5 a', 'h3 a', 'h4 a'],
      imageSelectors: ['img'],
      chapterSelectors: ['li.wp-manga-chapter'],
      pageSelectors: ['div.main-col-inner div.reading-content div.page-break img', 'div.reading-content div.page-break img', 'div.reading-content img']
    });
  }

  if (engine === 'mangareader') {
    return makeProfile({
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
      ],
      listSelectors: ['.postbody .listupd .bs .bsx', '.listupd .bs .bsx', '.listupd .bs', '.listupd .utao'],
      titleSelectors: ['div.tt', '.tt', 'h3', 'h4'],
      imageSelectors: ['img.ts-post-image', 'img'],
      chapterSelectors: ['#chapterlist > ul > li'],
      pageSelectors: ['div#readerarea img']
    });
  }

  if (engine === 'wpcomics') {
    return makeProfile({
      listPaths: (page) => [`/tim-truyen?sort=0&page=${page}`, `/tim-truyen/?sort=0&page=${page}`, page > 1 ? `/page/${page}/` : '/'],
      searchPaths: (query, page) => [`/tim-truyen?keyword=${encodeURIComponent(query)}&page=${page}`, `/?s=${encodeURIComponent(query)}&page=${page}`],
      listSelectors: ['div.items div.item', '.items .item'],
      titleSelectors: ['div.box_tootip div.title', 'h3 a', '.title'],
      imageSelectors: ['div.image a img', 'img'],
      chapterSelectors: ['div.list-chapter li.row:not(.heading)'],
      pageSelectors: ['div.page-chapter > img', 'li.blocks-gallery-item img', '#chapter-c img', '.reading-detail img', 'article img'],
      detailDescriptionSelectors: ['div.detail-content p', '.detail-content', '.summary-content'],
      genreSelectors: ['div.col-info li.kind p:not(.name) a', 'li.kind p.col-xs-8 a']
    });
  }

  if (engine === 'mmrcms') {
    return makeProfile({
      listPaths: (page) => [`/latest-release?page=${page}`, `/filterList/?page=${page}&author=&tag=&alpha=&cat=&sortBy=name&asc=true`],
      searchPaths: (query, page) => [`/filterList/?page=${page}&author=&tag=&alpha=${encodeURIComponent(query)}&cat=&sortBy=name&asc=true`],
      listSelectors: ['div.media', '.media'],
      titleSelectors: ['div.media-body h5', 'h5', 'h3 a'],
      imageSelectors: ['img'],
      chapterSelectors: ['ul.chapters > li:not(.btn)'],
      pageSelectors: ['div#all img', '#all img', '.chapter-content img'],
      detailDescriptionSelectors: ['div.well', '.well'],
      genreSelectors: ['dt:contains(Catégories) + dd a', 'dt:contains(Categories) + dd a']
    });
  }

  if (engine === 'keyoapp') {
    return makeProfile({
      listPaths: (_page) => ['/latest', '/series', '/'],
      searchPaths: (query, _page) => [`/series?query=${encodeURIComponent(query)}`, `/search?query=${encodeURIComponent(query)}`, '/series'],
      listSelectors: ['#searched_series_page button', 'div.grid > div.group', 'div.grid div.group'],
      titleSelectors: ['h3', 'a[title]'],
      imageSelectors: ['img', 'a div.bg-cover'],
      chapterSelectors: ['#chapters > a'],
      pageSelectors: ['#pages > img'],
      detailDescriptionSelectors: ['div.grid > div.overflow-hidden > p', '.overflow-hidden > p'],
      genreSelectors: ['div.grid a[href*="tag="]', 'div.gap-1 a']
    });
  }

  if (engine === 'zeistmanga') {
    return makeProfile({
      listPaths: (page) => [`/feeds/posts/default/-/Series?alt=json&orderby=published&max-results=21&start-index=${(page - 1) * 20 + 1}`, '/'],
      searchPaths: (query, page) => [
        `/feeds/posts/default/-/Series?alt=json&orderby=published&max-results=21&start-index=${(page - 1) * 20 + 1}&q=label:Series+${encodeURIComponent(query)}`,
        `/?s=${encodeURIComponent(query)}`
      ],
      listSelectors: ['article', '.post', '.blog-posts article'],
      titleSelectors: ['h2', 'h3', '.entry-title'],
      imageSelectors: ['img'],
      chapterSelectors: ['#chapterlist a', '#latest a', '#myUL a', '.chapter-list a'],
      pageSelectors: ['div.check-box img', 'article#reader .separator img', 'article.container .separator img', '#readarea img', '#reader img', '#readerarea img'],
      detailDescriptionSelectors: ['#synopsis', '#Sinopse', '#sinopas', '.sinopsis', '.sinopas'],
      genreSelectors: ['article div.mt-15 a', '.info-genre a', 'dl:contains(Genre) dd a']
    });
  }

  if (engine === 'madtheme') {
    return makeProfile({
      listPaths: (page) => [
        page > 1 ? `/manga/page/${page}/` : '/manga/',
        page > 1 ? `/series/page/${page}/` : '/series/',
        page > 1 ? `/page/${page}/` : '/'
      ],
      searchPaths: (query, page) => [
        `/?s=${encodeURIComponent(query)}${page > 1 ? `&page=${page}` : ''}`,
        `/search/${encodeURIComponent(query)}${page > 1 ? `/page/${page}` : ''}`
      ],
      chapterSelectors: ['.eplister li', '.clstyle li', '.chapter-list li'],
      pageSelectors: ['#readerarea img', '#reader img', '.reading-content img', 'article img']
    });
  }

  return makeProfile({
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
  });
}

async function fetchHtml(source: Pick<KotatsuGenericSource, 'name' | 'baseUrl'>, pathOrUrl: string, init?: RequestInit) {
  const target = new URL(pathOrUrl, source.baseUrl);
  const requestInit: RequestInit = { ...init };
  if (target.searchParams.has('__kotatsu')) {
    const marker = target.searchParams.get('__kotatsu') ?? '';
    const page = target.searchParams.get('page') ?? '1';
    const query = target.searchParams.get('q') ?? '';
    target.search = '';

    if (marker.startsWith('madara_')) {
      const payload = new URLSearchParams({
        action: 'madara_load_more',
        page,
        template: 'madara-core/content/content-search',
        'vars[s]': query,
        'vars[paged]': page,
        'vars[template]': 'search',
        'vars[post_type]': 'wp-manga',
        'vars[post_status]': 'publish',
        'vars[manga_archives_item_layout]': 'default',
        'vars[meta_key]': '_latest_update',
        'vars[orderby]': 'meta_value_num',
        'vars[order]': 'desc'
      });
      requestInit.method = 'POST';
      requestInit.body = payload;
      requestInit.headers = {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        ...requestInit.headers
      };
    }
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(target, {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        Referer: `${new URL(source.baseUrl).origin}/`,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
        ...requestInit.headers
      },
      signal: controller.signal,
      redirect: 'follow',
      method: requestInit.method,
      body: requestInit.body
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok) {
      throw Object.assign(new Error(`${source.name} returned HTTP ${response.status}`), {
        status: response.status,
        code: 'SOURCE_HTTP_ERROR'
      });
    }
    if (contentType && !contentType.includes('html') && !contentType.includes('text/plain') && !contentType.includes('json')) {
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
    const description = clean($(selectorFor(this.profile.detailDescriptionSelectors)).first().text());
    const genres = $(selectorFor(this.profile.genreSelectors))
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
      coverUrl: imageFrom($, coverRoot, url, this.profile.imageSelectors),
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
      const ajaxCandidates: Array<{ url: string; init: RequestInit }> = [
        { url: `${mangaUrl.replace(/\/$/, '')}/ajax/chapters/`, init: { method: 'POST' } }
      ];
      const holderId = $('div#manga-chapters-holder').attr('data-id');
      if (holderId) {
        ajaxCandidates.push({
          url: '/wp-admin/admin-ajax.php',
          init: {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: new URLSearchParams({ action: 'manga_get_chapters', manga: holderId })
          }
        });
      }

      for (const candidate of ajaxCandidates) {
        try {
          const ajaxHtml = await fetchHtml(this, candidate.url, candidate.init);
          chapters = this.parseChapters(cheerio.load(ajaxHtml), mangaId, mangaUrl);
          if (chapters.length) break;
        } catch {
          // Try the next Madara chapter endpoint. Different sites toggle different plugins/options.
        }
      }
    }

    if (!chapters.length && this.engine === 'zeistmanga') {
      const feed = this.extractZeistChapterFeed($);
      if (feed) {
        try {
          const feedHtml = await fetchHtml(
            this,
            `/feeds/posts/default/-/${encodeURIComponent(feed)}?alt=json&orderby=published&max-results=9999`
          );
          chapters = this.parseBloggerChapters(feedHtml, mangaId, mangaUrl);
        } catch {
          // Blogger feeds are optional per Zeist variant; DOM chapter extraction may still work on other variants.
        }
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

    const pages = $(selectorFor([...this.profile.pageSelectors, ...DEFAULT_PAGE_IMAGE_SELECTORS]))
      .map((_, element) => {
        const src =
          $(element).attr('data-src') ??
          $(element).attr('data-lazy-src') ??
          $(element).attr('data-original') ??
          $(element).attr('data-cfsrc') ??
          $(element).attr('data-url') ??
          $(element).attr('srcset')?.split(',').at(-1)?.trim().split(/\s+/)[0] ??
          $(element).attr('src') ??
          $(element).attr('uid');
        if (!src) return '';
        if (this.engine === 'keyoapp' && !/^https?:\/\//i.test(src)) {
          const cdn = this.extractKeyoappCdn($);
          return cdn ? absoluteUrl(chapterUrl, `${cdn.replace(/\/$/, '')}/${src.replace(/^\//, '')}`) : '';
        }
        return absoluteUrl(chapterUrl, src);
      })
      .get()
      .filter(isLikelyPageImage);

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
    if (this.engine === 'zeistmanga' && html.trim().startsWith('{')) {
      const bloggerItems = this.parseBloggerMangaList(html);
      if (bloggerItems.length) return bloggerItems;
    }

    const $ = cheerio.load(html);
    const host = safeHostname(this.baseUrl);
    const items: Manga[] = [];

    $(selectorFor([...this.profile.listSelectors, ...DEFAULT_LIST_SELECTORS])).each((_, element) => {
      const node = $(element);
      const link = node.is('a[href]') ? node : node.find('a[href]').first();
      const href = absoluteUrl(this.baseUrl, link.attr('href'));
      const title = titleFrom($, node, link, this.profile.titleSelectors);
      if (!href || !title || !looksLikeMangaUrl(href, this.baseUrl)) return;

      items.push({
        id: encodeId(href),
        sourceId: this.id,
        title,
        coverUrl: imageFrom($, element, this.baseUrl, this.profile.imageSelectors),
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
        const parent = link.closest(
          'article, .item, .media, .group, .bs, .bsx, .utao, .post, .manga, .series, .card, .page-item-detail'
        );
        const title = titleFrom($, parent.length ? parent : link, link, this.profile.titleSelectors);
        if (!title || title.length < 2 || title.length > 120) return;
        items.push({
          id: encodeId(href),
          sourceId: this.id,
          title,
          coverUrl: parent.length
            ? imageFrom($, parent[0], this.baseUrl, this.profile.imageSelectors)
            : imageFrom($, element, this.baseUrl, this.profile.imageSelectors),
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

    $(selectorFor([...this.profile.chapterSelectors, ...DEFAULT_CHAPTER_SELECTORS])).each((_, element) => {
      const node = $(element);
      const link = node.is('a[href]') ? node : node.find('a[href]').first();
      const href = absoluteUrl(mangaUrl, link.attr('href'));
      const text = clean(
        node.find('.chapternum, .chapter-title, .entry-title, .title, span.truncate, h5').first().text() ||
          link.text() ||
          node.text()
      );
      if (!href || !text) return;
      if (
        !/chapter|chap|ch\.?|episode|eps?|capitulo|cap|ตอน|第|\/\d+(?:\/|$|-)|-\d+(?:\/|$)/i.test(`${text} ${href}`)
      ) {
        return;
      }

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

  private parseBloggerMangaList(text: string): Manga[] {
    try {
      const json = JSON.parse(text);
      const entries: Array<Record<string, unknown>> = Array.isArray(json?.feed?.entry) ? json.feed.entry : [];
      return entries
        .map<Manga | null>((entry: Record<string, unknown>) => {
          const title = clean((entry.title as { $t?: string } | undefined)?.$t);
          const links = Array.isArray(entry.link) ? (entry.link as Array<Record<string, string>>) : [];
          const href = links.find((link) => link.rel === 'alternate')?.href ?? '';
          const content = (entry.content as { $t?: string } | undefined)?.$t ?? '';
          const contentDoc = cheerio.load(content);
          const thumbnail = (entry['media$thumbnail'] as { url?: string } | undefined)?.url
            ?.replace(/\/s.+?-c(?:-rw)?\//, '/w600/')
            ?.replace(/=s(?!.*=s).+?-c(?:-rw)?$/, '=w600');
          const coverUrl = absoluteUrl(this.baseUrl, thumbnail || contentDoc('img').first().attr('src'));
          if (!title || !href) return null;
          return {
            id: encodeId(href),
            sourceId: this.id,
            title,
            coverUrl,
            format: normalizeMangaFormat(`${title} ${contentDoc.text()}`),
            status: 'ongoing' as MangaStatus,
            genres: [],
            url: absoluteUrl(this.baseUrl, href)
          };
        })
        .filter((item: Manga | null): item is Manga => Boolean(item));
    } catch {
      return [];
    }
  }

  private parseBloggerChapters(text: string, mangaId: string, mangaUrl: string): Chapter[] {
    try {
      const json = JSON.parse(text);
      const entries: Array<Record<string, unknown>> = Array.isArray(json?.feed?.entry) ? json.feed.entry : [];
      const mangaSlug = new URL(mangaUrl).pathname.split('/').filter(Boolean).at(-1);
      return entries
        .map<Chapter | null>((entry: Record<string, unknown>, index: number) => {
          const title = clean((entry.title as { $t?: string } | undefined)?.$t);
          const links = Array.isArray(entry.link) ? (entry.link as Array<Record<string, string>>) : [];
          const href = absoluteUrl(this.baseUrl, links.find((link) => link.rel === 'alternate')?.href ?? '');
          const slug = href ? new URL(href).pathname.split('/').filter(Boolean).at(-1) : '';
          if (!title || !href || slug === mangaSlug) return null;
          return {
            id: encodeId(href),
            mangaId,
            sourceId: this.id,
            number: numberFrom(title) || entries.length - index,
            title,
            language: this.language,
            uploadedAt: (entry.published as { $t?: string } | undefined)?.$t ?? new Date().toISOString(),
            scanlator: this.name,
            url: href
          };
        })
        .filter((chapter: Chapter | null): chapter is Chapter => Boolean(chapter))
        .sort((a: Chapter, b: Chapter) => b.number - a.number);
    } catch {
      return [];
    }
  }

  private extractZeistChapterFeed($: cheerio.CheerioAPI) {
    const scriptSrc = $('#myUL script').first().attr('src');
    if (scriptSrc?.includes('/-/')) return decodeURIComponent(scriptSrc.split('/-/').pop()?.split('?')[0] ?? '');

    const latestScript = $('#latest script').first().html() ?? '';
    const latest = latestScript.match(/label\s*=\s*['"]([^'"]+)['"]/i)?.[1];
    if (latest) return latest;

    const clwdScript = $('#clwd script').first().html() ?? '';
    const clwd = clwdScript.match(/clwd\.run\(['"]([^'"]+)['"]/i)?.[1];
    if (clwd) return clwd;

    const chapterList = $('#chapterlist').attr('data-post-title');
    if (chapterList) return chapterList;

    const labelScript = $('script')
      .map((_, element) => $(element).html() ?? '')
      .get()
      .find((script) => script.includes('label_chapter'));
    const label = labelScript?.match(/label_chapter\s*=\s*["']([^"']+)["']/i)?.[1];
    return label ? decodeURIComponent(label) : '';
  }

  private extractKeyoappCdn($: cheerio.CheerioAPI) {
    const script = $('script')
      .map((_, element) => $(element).html() ?? '')
      .get()
      .find((value) => /realUrl\s*=\s*`[^`]+\/\//.test(value));
    const host = script?.match(/realUrl\s*=\s*`[^`]+\/\/([^/`]+)/)?.[1];
    return host ? `https://${host}/uploads` : '';
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

      const chapterImage = script.match(/chapterImage\s*=\s*\[([\s\S]*?)\]/);
      if (chapterImage) {
        for (const match of chapterImage[1].matchAll(/["']([^"']+)["']/g)) {
          pages.push(absoluteUrl(chapterUrl, match[1]));
        }
      }

      const templateContent = script.match(/const\s+content\s*=\s*`([\s\S]*?)`;/);
      if (templateContent) {
        const contentDoc = cheerio.load(templateContent[1]);
        contentDoc('img').each((_, img) => {
          pages.push(absoluteUrl(chapterUrl, contentDoc(img).attr('src')));
        });
      }

      for (const match of script.matchAll(/["'](https?:\/\/[^"']+\.(?:avif|webp|jpe?g|png)(?:\?[^"']*)?)["']/gi)) {
        pages.push(absoluteUrl(chapterUrl, match[1]));
      }
    });

    return unique(pages.filter(isLikelyPageImage));
  }
}
