import { describe, expect, it } from 'vitest';
import { KomikuSource } from '../../src/lib/sources/komiku';
import { KomikcastSource } from '../../src/lib/sources/komikcast';
import { ShinigamiSource } from '../../src/lib/sources/shinigami';

describe('Indonesian source adapters', () => {
  it('exposes the Komikcast API source identity', async () => {
    const source = new KomikcastSource();
    const filters = await source.getFilters();

    expect(source.id).toBe('komikcast');
    expect(source.baseUrl).toBe('https://v2.komikcast.fit');
    expect(filters.map((filter) => filter.id)).toEqual(['sort']);
  });

  it('exposes the Shinigami API source identity', async () => {
    const source = new ShinigamiSource();
    const filters = await source.getFilters();

    expect(source.id).toBe('shinigami');
    expect(source.baseUrl).toBe('https://g.shinigami.asia');
    expect(filters.map((filter) => filter.id)).toEqual(['sort']);
  });

  it('exposes the Komiku source identity', async () => {
    const source = new KomikuSource();
    const filters = await source.getFilters();

    expect(source.id).toBe('komiku');
    expect(source.baseUrl).toBe('https://komiku.org');
    expect(filters.map((filter) => filter.id)).toEqual(['sort']);
  });
});
