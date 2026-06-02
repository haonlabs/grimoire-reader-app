import { AsuraScansSource } from './asurascans';
import { CrotpediaSource } from './crotpedia';
import { DoujinpoiSource } from './doujinpoi';
import { DoujinDesuSource } from './doujindesu';
import { KomikcastSource } from './komikcast';
import { KomikTapSource } from './komiktap';
import { KomikuSource } from './komiku';
import { MangaDexSource } from './mangadex';
import { MangaPlusSource } from './mangaplus';
import { ShinigamiSource } from './shinigami';
import type { MangaSource } from './types';

export const SOURCE_REGISTRY: Record<string, MangaSource> = {
  asurascans: new AsuraScansSource(),
  mangadex: new MangaDexSource(),
  mangaplus: new MangaPlusSource(),
  crotpedia: new CrotpediaSource(),
  doujinpoi: new DoujinpoiSource(),
  dojinpoi: new DoujinpoiSource('dojinpoi'),
  doujindesu: new DoujinDesuSource('doujindesu'),
  komiku: new KomikuSource(),
  shinigami: new ShinigamiSource(),
  komikcast: new KomikcastSource(),
  komiktap: new KomikTapSource('komiktap')
};

export function getSource(sourceId: string): MangaSource {
  const source = SOURCE_REGISTRY[sourceId];
  if (source) return source;
  throw Object.assign(new Error(`Unknown source: ${sourceId}`), {
    status: 404,
    code: 'SOURCE_NOT_FOUND'
  });
}

export function sourceDomains() {
  return Object.values(SOURCE_REGISTRY)
    .map((source) => {
      try {
        return new URL(source.baseUrl).hostname;
      } catch {
        return '';
      }
    })
    .filter(Boolean);
}

export function isUsableSourceUrl(baseUrl: string) {
  try {
    const url = new URL(baseUrl);
    const hostname = url.hostname.toLowerCase();
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      hostname.includes('.') &&
      !hostname.includes('$') &&
      !hostname.startsWith('div.') &&
      hostname !== 'encrypted-tbn0.gstatic.com'
    );
  } catch {
    return false;
  }
}
