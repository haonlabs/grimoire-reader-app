import { describe, expect, it } from 'vitest';
import { MangaPlusSource } from '../../src/lib/sources/mangaplus';

describe('international source adapters', () => {
  it('exposes MANGA Plus source identity', async () => {
    const source = new MangaPlusSource();
    const filters = await source.getFilters();

    expect(source.id).toBe('mangaplus');
    expect(source.baseUrl).toBe('https://mangaplus.shueisha.co.jp');
    expect(filters[0]?.values.map((value) => value.value)).toContain('updated');
  });
});
