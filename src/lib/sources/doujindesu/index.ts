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

const SITE_BASE = 'https://doujindesu.tv';
const PAGE_LIMIT = 18;

function sortFrom(filters?: FilterInput[]) {
  const sort = filters?.find((entry) => entry.id === 'sort')?.value;
  if (sort === 'popular') return 'popular';
  if (sort === 'newest') return 'latest';
  if (sort === 'title') return 'title';
  return 'update';
}

function stateFromDoujinDesu(text?: string | null): MangaStatus {
  const value = clean(text);
  if (value === 'Finished') return 'completed';
  if (value === 'Publishing') return 'ongoing';
  return statusFrom(value);
}

function chapterDate(text?: string | null) {
  return clean(text) || new Date().toISOString();
}

export class DoujinDesuSource implements MangaSource {
  readonly id: string;
  readonly name = 'DoujinDesu.tv';
  readonly baseUrl = SITE_BASE;
  readonly language = 'id';
  readonly contentRating = 'explicit' as const;
  readonly isNsfw = true;

  constructor(id = 'doujindesu') {
    this.id = id;
  }

  async getList(page: number, filters?: FilterInput[]): Promise<MangaListResult> {
    const url = new URL(page > 1 ? `/manga/page/${Math.max(1, page)}/` : '/manga/', SITE_BASE);
    url.searchParams.set('order', sortFrom(filters));
    const query = filters?.find((entry) => entry.id === 'title')?.value;
    if (typeof query === 'string' && query.trim()) url.searchParams.set('title', query.trim());
    const items = this.parseList(await this.fetch(url.toString()));
    return { items, page, hasNextPage: items.length >= PAGE_LIMIT };
  }

  async search(query: string, page: number, filters?: FilterInput[]): Promise<MangaListResult> {
    if (!query.trim()) return this.getList(page, filters);
    return this.getList(page, [{ id: 'title', value: query.trim() }, ...(filters ?? [])]);
  }

  async getDetail(mangaId: string): Promise<MangaDetail> {
    const url = decodeId(mangaId);
    const $ = loadHtml(await this.fetch(url));
    const root = $('#archive');
    const metadata = root.find('.wrapper > .metadata tbody');
    const title = clean(root.find('h1').first().text()) || clean(root.find('.metadata h1').first().text()) || 'Untitled';
    const statusText = metadata.find('tr:contains("Status") td').last().text();
    const author = clean(metadata.find('tr:contains("Author") td').last().text()) || undefined;
    const type = clean(metadata.find('tr:contains("Type") td').last().text());
    const cover = imageSrc($, root.find('.thumbnail img, .thumb img, img').first(), SITE_BASE);

    return {
      id: mangaId,
      sourceId: this.id,
      title,
      coverUrl: cover,
      author,
      description: clean(root.find('.wrapper > .metadata > .pb-2 p').text()) || clean(root.find('.entry-content').text()),
      status: stateFromDoujinDesu(statusText),
      format: formatFrom(type),
      genres: root
        .find('.tags > a')
        .map((_, element) => clean($(element).text()))
        .get()
        .filter(Boolean),
      rating: Number(metadata.find('.rating-prc').first().text()) / 10 || undefined,
      url,
      alternateTitles: []
    };
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const url = decodeId(mangaId);
    const $ = loadHtml(await this.fetch(url));
    const chapters = $('#chapter_list ul > li')
      .map((index, element) => {
        const node = $(element);
        const link = node.find('.epsleft > .lchx > a, a').first();
        const chapterUrl = absoluteUrl(SITE_BASE, link.attr('href'));
        const title = clean(link.text()) || clean(link.attr('title'));
        return {
          id: encodeId(chapterUrl),
          mangaId,
          sourceId: this.id,
          number: numberFrom(title) || index + 1,
          title,
          language: 'id',
          uploadedAt: chapterDate(node.find('.epsleft > .date, .date').text()),
          url: chapterUrl
        };
      })
      .get()
      .filter((chapter) => chapter.url);

    return chapters.sort((left, right) => right.number - left.number);
  }

  async getPages(chapterId: string): Promise<string[]> {
    const chapterUrl = decodeId(chapterId);
    const $chapter = loadHtml(await this.fetch(chapterUrl));
    const readerId = $chapter('#reader').attr('data-id');
    if (!readerId) {
      const direct = $chapter('#reader img, #readerarea img, .reader-area img, article img')
        .map((_, element) => imageSrc($chapter, $chapter(element), SITE_BASE))
        .get()
        .filter(Boolean);
      if (direct.length) return direct;
      throw Object.assign(new Error('No reader id found for this chapter'), {
        status: 502,
        code: 'SOURCE_PARSE_FAILED'
      });
    }

    const html = await this.fetch(new URL('/themes/ajax/ch.php', SITE_BASE).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: new URLSearchParams({ id: readerId }).toString()
    });
    const $ = loadHtml(html);
    return $('img')
      .map((_, element) => imageSrc($, $(element), SITE_BASE))
      .get()
      .filter(Boolean);
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
          { label: 'Title', value: 'title' }
        ]
      }
    ];
  }

  private fetch(url: string, init: Parameters<typeof fetchText>[1] = {}) {
    return fetchText(url, { ...init, sourceId: this.id });
  }

  private parseList(html: string): Manga[] {
    const $ = loadHtml(html);
    const items = $('#archives div.entries .entry')
      .map((_, element) => {
        const node = $(element);
        const link = node.find('.metadata > a').first();
        const url = absoluteUrl(SITE_BASE, link.attr('href'));
        const title = clean(link.attr('title')) || clean(link.text());
        if (!url || !title) return null;
        return {
          id: encodeId(url),
          sourceId: this.id,
          title,
          coverUrl: imageSrc($, node.find('.thumbnail > img, img').first(), SITE_BASE),
          format: 'Manga' as const,
          status: 'ongoing' as const,
          genres: [],
          url
        };
      })
      .get()
      .filter(Boolean) as Manga[];
    if (!items.length && !$('#archives').length) {
      throw Object.assign(new Error('DoujinDesu tidak mengembalikan layout arsip manga yang valid.'), {
        status: 502,
        code: 'SOURCE_PARSE_FAILED'
      });
    }
    return items;
  }
}
