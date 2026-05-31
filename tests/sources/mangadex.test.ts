import { describe, expect, it } from 'vitest';
import { MangaDexSource } from '../../src/lib/sources/mangadex';

describe('MangaDexSource', () => {
  it('exposes the required source identity', () => {
    const source = new MangaDexSource();
    expect(source.id).toBe('mangadex');
    expect(source.name).toBe('MangaDex');
    expect(source.baseUrl).toBe('https://mangadex.org');
    expect(source.isNsfw).toBe(false);
  });

  it('provides PRD browse filters', async () => {
    const source = new MangaDexSource();
    const filters = await source.getFilters();
    expect(filters.map((filter) => filter.id)).toEqual(['contentRating', 'sort']);
  });
});
