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
  imageSrc,
  loadHtml,
  numberFrom,
  statusFrom
} from '$lib/sources/kotatsuPort/common';

const SITE_BASE = 'https://crotpedia.net';
const PAGE_LIMIT = 20;

function infoValue($: ReturnType<typeof loadHtml>, label: string) {
  let value = '';
  $('.series-infolist li').each((_, element) => {
    if (value) return;
    const node = $(element);
    if (clean(node.find('b').text()).toLowerCase() === label.toLowerCase()) {
      value = clean(node.find('span').text());
    }
  });
  return value;
}

function parseStatusText(text: string): MangaStatus {
  return statusFrom(text.replace('Publishing', 'ongoing').replace('Completed', 'completed'));
}

function titleFromSeriesUrl(url: string) {
  const slug = new URL(url).pathname.split('/').filter(Boolean).at(-1) ?? '';
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function parseGenericSeriesList($: ReturnType<typeof loadHtml>, sourceId: string) {
  const seen = new Set<string>();
  const items: Manga[] = [];

  $('a[href*="/baca/series/"]').each((_, element) => {
    const link = $(element);
    const url = absoluteUrl(SITE_BASE, link.attr('href'));
    if (!url || seen.has(url)) return;

    const card = link.closest('.flexbox4-item, .flexbox2-item, article, li, .bs, .bsx').first();
    const scope = card.length ? card : link.parent();
    const image = link.find('img').first().length ? link.find('img').first() : scope.find('img').first();
    const title =
      clean(link.attr('title')) ||
      clean(image.attr('alt')) ||
      clean(link.find('[title]').first().attr('title')) ||
      clean(link.text()) ||
      titleFromSeriesUrl(url);
    if (!title) return;

    seen.add(url);
    items.push({
      id: encodeId(url),
      sourceId,
      title,
      coverUrl: imageSrc($, image, SITE_BASE),
      format: formatFrom(clean(scope.find('.type, .mgen').first().text())),
      status: statusFrom(clean(scope.find('.status').first().text())),
      genres: scope
        .find('.genres a, .mgen a')
        .map((__, genre) => clean($(genre).text()))
        .get()
        .filter(Boolean),
      url
    });
  });

  return items;
}

export function parseCrotpediaListHtml(html: string, sourceId = 'crotpedia') {
  return parseGenericSeriesList(loadHtml(html), sourceId);
}

export class CrotpediaSource implements MangaSource {
  readonly id: string;
  readonly name = 'CrotPedia';
  readonly baseUrl = SITE_BASE;
  readonly language = 'id';
  readonly contentRating = 'explicit' as const;
  readonly isNsfw = true;

  constructor(id = 'crotpedia') {
    this.id = id;
  }

  async getList(page: number): Promise<MangaListResult> {
    const targetPage = Math.max(1, page);
    const url = new URL(targetPage > 1 ? `/page/${targetPage}/` : '/', SITE_BASE);
    const $ = loadHtml(await this.fetch(url.toString()));
    const items = this.parseUpdateList($);
    this.assertListParsed($, items);
    return { items, page: targetPage, hasNextPage: this.hasNextPage($) || items.length >= PAGE_LIMIT };
  }

  async search(query: string, page: number): Promise<MangaListResult> {
    if (!query.trim()) return this.getList(page);
    const targetPage = Math.max(1, page);
    const url = new URL(targetPage > 1 ? `/page/${targetPage}/` : '/', SITE_BASE);
    url.searchParams.set('s', query.trim());
    const $ = loadHtml(await this.fetch(url.toString()));
    const items = this.parseSearchList($);
    this.assertListParsed($, items);
    return { items, page: targetPage, hasNextPage: this.hasNextPage($) };
  }

  async getDetail(mangaId: string): Promise<MangaDetail> {
    const url = decodeId(mangaId);
    const $ = loadHtml(await this.fetch(url));
    const title = clean($('.series-title h2, .series-titlex h2').first().text()) || clean($('title').text().split(' - ')[0]) || 'Untitled';
    const alternateTitle = clean($('.series-title span, .series-titlex span').first().text());
    const typeText = clean($('.series-infoz .type').first().text());
    const statusText = clean($('.series-infoz .status').first().text());
    const year = Number(infoValue($, 'Published')) || undefined;

    return {
      id: mangaId,
      sourceId: this.id,
      title,
      coverUrl: imageSrc($, $('.series-thumb img').first(), SITE_BASE),
      author: infoValue($, 'Author') || undefined,
      description: clean($('.series-synops').first().text()),
      status: parseStatusText(statusText),
      format: formatFrom(typeText),
      genres: $('.series-genres a')
        .map((_, element) => clean($(element).text()))
        .get()
        .filter(Boolean),
      rating: Number($('.series-infoz.score span').first().text()) || undefined,
      url,
      alternateTitles: [alternateTitle, infoValue($, 'Alternative')].filter(Boolean),
      year
    };
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const url = decodeId(mangaId);
    const $ = loadHtml(await this.fetch(url));
    const chapters = $('.series-chapterlist li')
      .map((index, element) => {
        const node = $(element);
        const link = node.find('.flexch-infoz a, a').first();
        const chapterUrl = absoluteUrl(SITE_BASE, link.attr('href'));
        const title = clean(link.find('span').first().text()) || clean(link.attr('title')) || clean(link.text());
        return {
          id: encodeId(chapterUrl),
          mangaId,
          sourceId: this.id,
          number: numberFrom(title) || index + 1,
          title,
          language: 'id',
          uploadedAt: clean(link.find('.date').text()) || new Date().toISOString(),
          url: chapterUrl
        };
      })
      .get()
      .filter((chapter) => chapter.url);

    return chapters.sort((left, right) => right.number - left.number);
  }

  async getPages(chapterId: string): Promise<string[]> {
    const chapterUrl = decodeId(chapterId);
    const $ = loadHtml(await this.fetch(chapterUrl));
    const pages = $('.reader-area img')
      .map((_, element) => imageSrc($, $(element), SITE_BASE))
      .get()
      .filter(Boolean);
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
        values: [{ label: 'Latest', value: 'updated' }]
      }
    ];
  }

  private fetch(url: string, init: Parameters<typeof fetchText>[1] = {}) {
    return fetchText(url, { ...init, sourceId: this.id });
  }

  private parseUpdateList($: ReturnType<typeof loadHtml>) {
    const legacyItems = $('.flexbox4-item')
      .map((_, element) => this.parseUpdateItem($, $(element)))
      .get()
      .filter(Boolean) as Manga[];
    const items = legacyItems.length ? legacyItems : parseGenericSeriesList($, this.id);
    return items.slice(0, PAGE_LIMIT);
  }

  private parseSearchList($: ReturnType<typeof loadHtml>) {
    const legacyItems = $('.flexbox2-item')
      .map((_, element) => this.parseSearchItem($, $(element)))
      .get()
      .filter(Boolean) as Manga[];
    return legacyItems.length ? legacyItems : parseGenericSeriesList($, this.id);
  }

  private hasNextPage($: ReturnType<typeof loadHtml>) {
    return $('.pagination .next, a.next, a.next.page-numbers, a[rel="next"]').length > 0;
  }

  private assertListParsed($: ReturnType<typeof loadHtml>, items: Manga[]) {
    if (items.length) return;
    const body = clean($('body').text());
    if (/Login terlebih dahulu|Log in|Masuk terlebih dahulu/i.test(body) || $('form[action*="login"]').length) {
      throw Object.assign(new Error('CrotPedia meminta login. Simpan cookie sesi login lewat Unlock Source.'), {
        status: 401,
        code: 'SOURCE_AUTH_REQUIRED'
      });
    }
    throw Object.assign(new Error('Markup daftar CrotPedia tidak dikenali atau respons source tidak lengkap.'), {
      status: 502,
      code: 'SOURCE_PARSE_FAILED'
    });
  }

  private parseUpdateItem($: ReturnType<typeof loadHtml>, node: ReturnType<ReturnType<typeof loadHtml>>) {
    let link = node.find('.flexbox4-side .title a').first();
    if (!link.length) link = node.find('a[href*="/baca/series/"]').first();
    const url = absoluteUrl(SITE_BASE, link.attr('href'));
    const title = clean(link.text()) || clean(link.attr('title'));
    if (!url || !title) return null;
    return {
      id: encodeId(url),
      sourceId: this.id,
      title,
      coverUrl: imageSrc($, node.find('.flexbox4-thumb img, img').first(), SITE_BASE),
      format: formatFrom(clean(node.find('.type').first().text())),
      status: 'ongoing' as const,
      genres: [],
      url
    };
  }

  private parseSearchItem($: ReturnType<typeof loadHtml>, node: ReturnType<ReturnType<typeof loadHtml>>) {
    const link = node.find('a[href*="/baca/series/"]').first();
    const url = absoluteUrl(SITE_BASE, link.attr('href'));
    const title = clean(link.attr('title')) || clean(node.find('.flexbox2-title span').first().text());
    if (!url || !title) return null;
    return {
      id: encodeId(url),
      sourceId: this.id,
      title,
      coverUrl: imageSrc($, node.find('.flexbox2-thumb img, img').first(), SITE_BASE),
      author: clean(node.find('.studio').text()) || undefined,
      description: clean(node.find('.synops').text()),
      format: formatFrom(clean(node.find('.type').first().text())),
      status: 'ongoing' as const,
      genres: node
        .find('.genres a')
        .map((_, element) => clean($(element).text()))
        .get()
        .filter(Boolean),
      rating: Number(clean(node.find('.score').text()).match(/[0-9]+(?:\.[0-9]+)?/)?.[0]) || undefined,
      url
    };
  }
}
