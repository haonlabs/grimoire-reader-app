import { BatoToSource } from './batoto';
import { KomikcastSource } from './komikcast';
import { KomikuSource } from './komiku';
import { MangaDexSource } from './mangadex';
import { MangaFireSource } from './mangafire';
import { MangaPlusSource } from './mangaplus';
import { ShinigamiSource } from './shinigami';
import type { MangaSource } from './types';

export const SOURCE_REGISTRY: Record<string, MangaSource> = {
  mangadex: new MangaDexSource(),
  mangafire: new MangaFireSource(),
  mangaplus: new MangaPlusSource(),
  batoto: new BatoToSource(),
  komiku: new KomikuSource(),
  shinigami: new ShinigamiSource(),
  komikcast: new KomikcastSource()
};

export function getSource(sourceId: string): MangaSource {
  const source = SOURCE_REGISTRY[sourceId];
  if (!source) {
    throw Object.assign(new Error(`Unknown source: ${sourceId}`), {
      status: 404,
      code: 'SOURCE_NOT_FOUND'
    });
  }
  return source;
}

export function sourceDomains() {
  return Object.values(SOURCE_REGISTRY).map((source) => new URL(source.baseUrl).hostname);
}
