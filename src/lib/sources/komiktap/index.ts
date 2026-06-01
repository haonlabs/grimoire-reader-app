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

const SITE_BASE = 'https://komiktap.info';
const PAGE_LIMIT = 25;

function sortFrom(filters?: FilterInput[]) {
  const sort = filters?.find((entry) => entry.id === 'sort')?.value;
  if (sort === 'popular') return 'popular';
  if (sort === 'newest') return 'latest';
  if (sort === 'title') return 'title';
  if (sort === 'title_desc') return 'titlereverse';
  return 'update';
}

function metaValue($: ReturnType<typeof loadHtml>, labels: string[]) {
  const lowered = labels.map((label) => label.toLowerCase());
  let value = '';
  $('.infotable tr, .tsinfo div').each((_, element) => {
    if (value) return;
    const text = clean($(element).text());
    const lower = text.toLowerCase();
    if (!lowered.some((label) => lower.includes(label))) return;
    value = clean($(element).find('td').last().text()) || clean($(element).children().last().text()) || clean(text.replace(/^[^:]+:\s*/, ''));
  });
  return value;
}

function parseReaderImages(html: string) {
  const match = html.match(/ts_reader\.run\((\{[\s\S]*?\})\);?/);
  if (!match) return [];
  try {
    const payload = JSON.parse(match[1]) as { sources?: Array<{ images?: string[] }> };
    return payload.sources?.[0]?.images ?? [];
  } catch {
    return [];
  }
}

function decodeBase64ReaderScript($: ReturnType<typeof loadHtml>) {
  for (const element of $('div.wrapper script[src^="data:text/javascript;base64,"], script[src^="data:text/javascript;base64,"]').toArray()) {
    const src = $(element).attr('src') ?? '';
    const raw = src.replace(/^data:text\/javascript;base64,/, '');
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf8');
      if (decoded.startsWith('ts_reader.run')) return decoded;
    } catch {
      // Keep looking for another script.
    }
  }
  return '';
}

function parseStatus($: ReturnType<typeof loadHtml>): MangaStatus {
  return statusFrom(metaValue($, ['Status', 'Statut', 'Estado', 'Durum']));
}

export class KomikTapSource implements MangaSource {
  readonly id: string;
  readonly name = 'KomikTap';
  readonly baseUrl = SITE_BASE;
  readonly language = 'id';
  readonly contentRating = 'suggestive' as const;
  readonly isNsfw = false;

  constructor(id = 'komiktap') {
    this.id = id;
  }

  async getList(page: number, filters?: FilterInput[]): Promise<MangaListResult> {
    const url = new URL('/manga/', SITE_BASE);
    url.searchParams.set('order', sortFrom(filters));
    url.searchParams.set('page', String(Math.max(1, page)));
    const items = this.parseMangaList(await fetchText(url.toString()));
    return { items, page, hasNextPage: items.length >= PAGE_LIMIT };
  }

  async search(query: string, page: number): Promise<MangaListResult> {
    if (!query.trim()) return this.getList(page);
    const url = new URL(`/page/${Math.max(1, page)}/`, SITE_BASE);
    url.searchParams.set('s', query.trim());
    const items = this.parseMangaList(await fetchText(url.toString()), PAGE_LIMIT);
    return { items, page, hasNextPage: items.length >= 10 };
  }

  async getDetail(mangaId: string): Promise<MangaDetail> {
    const url = decodeId(mangaId);
    const $ = loadHtml(await fetchText(url));
    const title =
      clean($('h1.entry-title').first().text()) ||
      clean($('.seriestucontent h1').first().text()) ||
      clean($('title').text().split(' - ')[0]) ||
      'Untitled';
    const author = metaValue($, ['Author', 'Artist']) || undefined;
    const type = metaValue($, ['Type']);
    const cover = imageSrc($, $('.thumb img, .seriestucontl img, .info-left img, img.wp-post-image').first(), SITE_BASE);

    return {
      id: mangaId,
      sourceId: this.id,
      title,
      coverUrl: cover,
      author,
      description: clean($('div.entry-content').first().text()),
      status: parseStatus($),
      format: formatFrom(type),
      genres: $('.seriestugenre > a, .wd-full .mgen > a')
        .map((_, element) => clean($(element).text()))
        .get()
        .filter(Boolean),
      url,
      alternateTitles: []
    };
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const url = decodeId(mangaId);
    const $ = loadHtml(await fetchText(url));
    const chapters = $('#chapterlist > ul > li')
      .map((index, element) => {
        const node = $(element);
        const link = node.find('a').first();
        const chapterUrl = absoluteUrl(SITE_BASE, link.attr('href'));
        const title = clean(node.find('.chapternum').text()) || clean(link.text());
        return {
          id: encodeId(chapterUrl),
          mangaId,
          sourceId: this.id,
          number: numberFrom(title) || index + 1,
          title,
          language: 'id',
          uploadedAt: clean(node.find('.chapterdate').text()) || new Date().toISOString(),
          url: chapterUrl
        };
      })
      .get()
      .filter((chapter) => chapter.url);
    return chapters.sort((left, right) => right.number - left.number);
  }

  async getPages(chapterId: string): Promise<string[]> {
    const chapterUrl = decodeId(chapterId);
    const html = await fetchText(chapterUrl);
    const $ = loadHtml(html);

    const direct = $('div#readerarea img')
      .map((_, element) => imageSrc($, $(element), SITE_BASE))
      .get()
      .filter(Boolean);
    if (direct.length) return direct;

    const inlineImages = parseReaderImages(html);
    if (inlineImages.length) return inlineImages.map((url) => absoluteUrl(SITE_BASE, url)).filter(Boolean);

    const decodedScript = decodeBase64ReaderScript($);
    const encodedImages = decodedScript ? parseReaderImages(decodedScript) : [];
    if (encodedImages.length) return encodedImages.map((url) => absoluteUrl(SITE_BASE, url)).filter(Boolean);

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
          { label: 'Title A-Z', value: 'title' },
          { label: 'Title Z-A', value: 'title_desc' }
        ]
      }
    ];
  }

  private parseMangaList(html: string, pageSize = PAGE_LIMIT): Manga[] {
    const $ = loadHtml(html);
    const items = $('.postbody .listupd .bs .bsx')
      .map((_, element) => {
        const node = $(element);
        const link = node.find('a').first();
        const url = absoluteUrl(SITE_BASE, link.attr('href'));
        const title = clean(node.find('div.tt').text()) || clean(link.attr('title'));
        if (!url || !title) return null;
        return {
          id: encodeId(url),
          sourceId: this.id,
          title,
          coverUrl: imageSrc($, node.find('img.ts-post-image, img').first(), SITE_BASE),
          format: formatFrom(node.find('.type').attr('class') ?? node.find('.type').text()),
          status: 'ongoing' as const,
          genres: [],
          rating: Number(node.find('.numscore').text()) || undefined,
          url
        };
      })
      .get()
      .filter(Boolean) as Manga[];
    return items.slice(0, pageSize);
  }
}
