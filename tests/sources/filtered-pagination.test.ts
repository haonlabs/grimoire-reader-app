import { describe, expect, it, vi } from 'vitest';
import { getFormatFilteredPage } from '../../src/lib/server/filteredPagination';
import type { Manga, MangaListResult } from '../../src/lib/sources/types';

function manga(id: number, format: Manga['format']): Manga {
  return {
    id: String(id),
    sourceId: 'test',
    title: `Manga ${id}`,
    coverUrl: '',
    format,
    status: 'ongoing',
    genres: [],
    url: `https://example.com/${id}`
  };
}

describe('format-filtered pagination', () => {
  it('fills a 24-item page when a source ignores the type filter', async () => {
    const sourcePages = Array.from({ length: 7 }, (_, pageIndex) =>
      Array.from({ length: 24 }, (_, itemIndex) => {
        const id = pageIndex * 24 + itemIndex;
        return manga(id, itemIndex % 3 === 0 ? 'Manhwa' : 'Manga');
      })
    );
    const getList = vi.fn(async (page: number): Promise<MangaListResult> => ({
      items: sourcePages[page - 1] ?? [],
      page,
      hasNextPage: page < sourcePages.length
    }));

    const result = await getFormatFilteredPage({ getList }, 2, [{ id: 'type', value: 'manhwa' }]);

    expect(result.items).toHaveLength(24);
    expect(result.items.every((item) => item.format === 'Manhwa')).toBe(true);
    expect(result.page).toBe(2);
    expect(result.hasNextPage).toBe(true);
  });

  it('uses a source-native filtered page without scanning', async () => {
    const getList = vi.fn(async (page: number): Promise<MangaListResult> => ({
      items: Array.from({ length: 24 }, (_, index) => manga((page - 1) * 24 + index, 'Manhua')),
      page,
      hasNextPage: true
    }));

    const result = await getFormatFilteredPage({ getList }, 3, [{ id: 'type', value: 'manhua' }]);

    expect(result.items).toHaveLength(24);
    expect(getList).toHaveBeenCalledTimes(1);
    expect(getList).toHaveBeenCalledWith(3, [{ id: 'type', value: 'manhua' }]);
  });
});
