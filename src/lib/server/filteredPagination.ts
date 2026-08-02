import type { FilterInput, Manga, MangaListResult, MangaSource } from '$lib/sources/types';
import { mangaFormatLabel } from '$lib/utils/mangaFormat';

const FILTERED_PAGE_SIZE = 24;
const MAX_SOURCE_PAGES = 100;

function selectedFormat(filters: FilterInput[]) {
  const value = filters.find((filter) => filter.id === 'type')?.value;
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function matchesFormat(manga: Manga, format: string) {
  return mangaFormatLabel(manga).toLowerCase() === format;
}

export async function getFormatFilteredPage(
  source: Pick<MangaSource, 'getList'>,
  page: number,
  filters: FilterInput[]
): Promise<MangaListResult> {
  const targetPage = Math.max(1, page);
  const format = selectedFormat(filters);
  const direct = await source.getList(targetPage, filters);
  if (!format) return direct;

  const directMatches = direct.items.filter((manga) => matchesFormat(manga, format));
  const sourceHandledFilter =
    directMatches.length === direct.items.length &&
    (directMatches.length >= FILTERED_PAGE_SIZE || !direct.hasNextPage);
  if (sourceHandledFilter) {
    return { ...direct, items: directMatches };
  }

  const endIndex = targetPage * FILTERED_PAGE_SIZE;
  const startIndex = endIndex - FILTERED_PAGE_SIZE;
  const matches: Manga[] = [];
  const seen = new Set<string>();
  let sourcePage = 1;
  let sourceHasNextPage = true;

  while (sourcePage <= MAX_SOURCE_PAGES && sourceHasNextPage && matches.length <= endIndex) {
    const result = sourcePage === targetPage ? direct : await source.getList(sourcePage, filters);
    for (const manga of result.items) {
      if (!matchesFormat(manga, format)) continue;
      const key = `${manga.sourceId}:${manga.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push(manga);
    }
    sourceHasNextPage = result.hasNextPage;
    sourcePage += 1;
  }

  return {
    items: matches.slice(startIndex, endIndex),
    page: targetPage,
    hasNextPage: matches.length > endIndex || sourceHasNextPage
  };
}
