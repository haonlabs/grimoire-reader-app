import { describe, expect, it } from 'vitest';
import { SOURCE_METADATA } from '../../src/lib/sources/metadata';
import { SOURCE_REGISTRY } from '../../src/lib/sources/registry';

describe('source registry', () => {
  it('registers every MVP source declared in metadata', () => {
    const registered = new Set(Object.keys(SOURCE_REGISTRY));
    for (const source of SOURCE_METADATA) {
      expect(registered.has(source.id)).toBe(true);
    }
  });

  it('uses unique source ids', () => {
    const ids = SOURCE_METADATA.map((source) => source.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses active adapters for the MVP sources', () => {
    expect(SOURCE_REGISTRY.mangaplus?.name).toBe('MANGA Plus');
    expect(SOURCE_REGISTRY.asurascans?.name).toBe('Asura Scans');
    expect(SOURCE_REGISTRY.doujinpoi?.name).toBe('Doujinpoi');
    expect(SOURCE_REGISTRY.komiku?.name).toBe('Komiku');
    expect(SOURCE_REGISTRY.shinigami?.name).toBe('Shinigami ID');
    expect(SOURCE_REGISTRY.komikcast?.name).toBe('Komikcast');
    expect(SOURCE_REGISTRY.komiktap?.name).toBe('KomikTap');
    expect(SOURCE_REGISTRY.sasangeyou?.name).toBe('Sasangeyou');
    expect(SOURCE_REGISTRY.mihentai?.name).toBe('MiHentai');
    expect(SOURCE_REGISTRY.toongod?.name).toBe('ToonGod');
  });

  it('exposes adult content mode filters for WordPress-style sources', async () => {
    const filters = await SOURCE_REGISTRY.toongod.getFilters?.();
    expect(filters?.find((filter) => filter.id === 'adultMode')?.values.map((value) => value.value)).toEqual([
      'exclude',
      'include',
      'only'
    ]);
  });
});
