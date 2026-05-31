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
  MangaStatus
} from '$lib/sources/types';

const SITE_BASE = 'https://komiku.org';
const API_BASE = 'https://api.komiku.org';
const REQUEST_TIMEOUT = 15_000;

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
  if (!href) return '';
  return new URL(href, baseUrl).toString();
}

function statusFrom(text?: string): MangaStatus {
  const value = text?.toLowerCase() ?? '';
  if (value.includes('completed') || value.includes('tamat') || value.includes('end')) return 'completed';
  if (value.includes('hiatus')) return 'hiatus';
  return 'ongoing';
}

function numberFrom(text: string) {
  const match = text.replace(',', '.').match(/(?:chapter|ch\.?)\s*([0-9]+(?:\.[0-9]+)?)/i);
  return match ? Number(match[1]) : 0;
}

function parseDate(value?: string) {
  const match = value?.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return new Date().toISOString();
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])).toISOString();
}

function sortFrom(filters?: FilterInput[]) {
  const sort = filters?.find((entry) => entry.id === 'sort')?.value;
  if (sort === 'newest') return 'date';
  if (sort === 'popular' || sort === 'rating') return 'meta_value_num';
  return 'modified';
}

async function fetchHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        Referer: `${SITE_BASE}/`,
        'User-Agent': 'GrimoireReader/0.1'
      },
      signal: controller.signal
    });
    if (!response.ok) {
      throw Object.assign(new Error(`Komiku returned HTTP ${response.status}`), {
        status: response.status,
        code: 'SOURCE_HTTP_ERROR'
      });
    }
    return response.text();
  } catch (error) {
    if (error instanceof Error && 'status' in error) throw error;
    const message = error instanceof Error ? error.message : 'network request failed';
    throw Object.assign(new Error(`Komiku tidak bisa diakses dari jaringan ini (${message}).`), {
      status: 503,
      code: 'SOURCE_NETWORK_BLOCKED'
    });
  } finally {
    clearTimeout(timeout);
  }
}

function mangaFromCard($: cheerio.CheerioAPI, element: AnyNode): Manga | null {
  const node = $(element);
  const link = node.find('a:has(h3)').first();
  const url = absoluteUrl(SITE_BASE, link.attr('href'));
  const title = clean(link.find('h3').text());
  if (!url || !title) return null;

  return {
    id: encodeId(url),
    sourceId: 'komiku',
    title,
    coverUrl: node.find('img').first().attr('data-src') ?? node.find('img').first().attr('src') ?? '',
    status: 'ongoing',
    genres: clean(node.find('.tpe1_inf').text())
      .split(/\s+/)
      .filter((part) => part && !/manga|manhwa|manhua/i.test(part))
      .slice(0, 4),
    url
  };
}

export class KomikuSource implements MangaSource {
  readonly id = 'komiku';
  readonly name = 'Komiku';
  readonly baseUrl = SITE_BASE;
  readonly language = 'id';
  readonly contentRating = 'safe' as const;
  readonly isNsfw = false;

  async getList(page: number, filters?: FilterInput[]): Promise<MangaListResult> {
    const url = new URL(page > 1 ? `/manga/page/${page}/` : '/manga/', API_BASE);
    url.searchParams.set('orderby', sortFrom(filters));
    const items = this.parseList(await fetchHtml(url.toString()));
    return { items, page, hasNextPage: items.length > 0 };
  }

  async search(query: string, page: number): Promise<MangaListResult> {
    if (!query.trim()) return this.getList(page);
    const url = new URL(page > 1 ? `/page/${page}/` : '/', API_BASE);
    url.searchParams.set('post_type', 'manga');
    url.searchParams.set('s', query.trim());
    const items = this.parseList(await fetchHtml(url.toString()));
    return { items, page, hasNextPage: items.length > 0 };
  }

  async getDetail(mangaId: string): Promise<MangaDetail> {
    const url = decodeId(mangaId);
    const $ = cheerio.load(await fetchHtml(url));
    const title = clean($('h1').first().text()).replace(/^Komik\s+/i, '') || 'Untitled';
    const statusText = clean($('table.inftable tr:has(td:contains(Status)) td:last-child').text());
    const coverUrl = $('div.ims > img').attr('src')?.split('?')[0] ?? '';

    return {
      id: mangaId,
      sourceId: this.id,
      title,
      coverUrl,
      author: clean($('table.inftable tr:has(td:contains(Pengarang)) td:last-child').text()) || undefined,
      description: clean($('#Sinopsis > p').text()),
      status: statusFrom(statusText),
      genres: $('ul.genre li.genre a')
        .map((_, element) => clean($(element).text()))
        .get()
        .filter(Boolean),
      url,
      alternateTitles: [
        clean($('table.inftable tr:has(td:contains(Judul Indonesia)) td:last-child').text())
      ].filter(Boolean)
    };
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const mangaUrl = decodeId(mangaId);
    const $ = cheerio.load(await fetchHtml(mangaUrl));
    return $('#Daftar_Chapter tr:has(td.judulseries)')
      .map((_, element) => {
        const link = $(element).find('td.judulseries a').first();
        const chapterUrl = absoluteUrl(SITE_BASE, link.attr('href'));
        const title = clean(link.text());
        return {
          id: encodeId(chapterUrl),
          mangaId,
          sourceId: this.id,
          number: numberFrom(title),
          title,
          language: 'id',
          uploadedAt: parseDate(clean($(element).find('td.tanggalseries').text())),
          scanlator: this.name,
          url: chapterUrl
        };
      })
      .get()
      .sort((left, right) => right.number - left.number);
  }

  async getPages(chapterId: string): Promise<string[]> {
    const chapterUrl = decodeId(chapterId);
    const $ = cheerio.load(await fetchHtml(chapterUrl));
    return $('#Baca_Komik img')
      .map((_, element) => $(element).attr('data-src') ?? $(element).attr('src'))
      .get()
      .filter((src) => /\.(webp|jpe?g|png)(\?|$)/i.test(src));
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

  private parseList(html: string) {
    const $ = cheerio.load(html);
    const items = $('div.bge')
      .map((_, element) => mangaFromCard($, element))
      .get()
      .filter(Boolean);

    if (!items.length && /Just a moment|challenge-platform|ddos-guard/i.test(html)) {
      throw Object.assign(new Error('Komiku sedang memblokir request otomatis dengan challenge anti-bot.'), {
        status: 503,
        code: 'SOURCE_ANTI_BOT'
      });
    }
    return items;
  }
}
