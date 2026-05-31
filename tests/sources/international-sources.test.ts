import { describe, expect, it } from 'vitest';
import { BatoToSource } from '../../src/lib/sources/batoto';
import { MangaFireSource } from '../../src/lib/sources/mangafire';
import { MangaPlusSource } from '../../src/lib/sources/mangaplus';

describe('international source adapters', () => {
  it('exposes MangaFire source identity', async () => {
    const source = new MangaFireSource();
    const filters = await source.getFilters();

    expect(source.id).toBe('mangafire');
    expect(source.baseUrl).toBe('https://mangafire.to');
    expect(filters[0]?.values.map((value) => value.value)).toContain('rating');
  });

  it('exposes MANGA Plus source identity', async () => {
    const source = new MangaPlusSource();
    const filters = await source.getFilters();

    expect(source.id).toBe('mangaplus');
    expect(source.baseUrl).toBe('https://mangaplus.shueisha.co.jp');
    expect(filters[0]?.values.map((value) => value.value)).toContain('updated');
  });

  it('exposes Bato.to source identity', async () => {
    const source = new BatoToSource();
    const filters = await source.getFilters();

    expect(source.id).toBe('batoto');
    expect(source.baseUrl).toBe('https://wto.to');
    expect(filters[0]?.values.map((value) => value.value)).toContain('popular');
  });
});
