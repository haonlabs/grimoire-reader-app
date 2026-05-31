import { describe, expect, it } from 'vitest';
import { SOURCE_METADATA } from '../../src/lib/sources/metadata';
import { SOURCE_REGISTRY } from '../../src/lib/sources/registry';

describe('source registry', () => {
  it('registers every MVP source declared in metadata', () => {
    expect(Object.keys(SOURCE_REGISTRY).sort()).toEqual(SOURCE_METADATA.map((source) => source.id).sort());
  });

  it('uses unique source ids', () => {
    const ids = SOURCE_METADATA.map((source) => source.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses active adapters for the MVP sources', () => {
    expect(SOURCE_REGISTRY.mangafire?.name).toBe('MangaFire');
    expect(SOURCE_REGISTRY.mangaplus?.name).toBe('MANGA Plus');
    expect(SOURCE_REGISTRY.batoto?.name).toBe('Bato.to');
    expect(SOURCE_REGISTRY.komiku?.name).toBe('Komiku');
    expect(SOURCE_REGISTRY.shinigami?.name).toBe('Shinigami ID');
    expect(SOURCE_REGISTRY.komikcast?.name).toBe('Komikcast');
  });
});
