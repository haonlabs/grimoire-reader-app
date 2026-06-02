import { AsuraScansSource } from './asurascans';
import { BatoToSource } from './batoto';
import { CrotpediaSource } from './crotpedia';
import { DoujinpoiSource } from './doujinpoi';
import { DoujinDesuSource } from './doujindesu';
import { KomikcastSource } from './komikcast';
import { KomikTapSource } from './komiktap';
import { KomikuSource } from './komiku';
import { KotatsuGenericSource } from './kotatsuGeneric';
import { MangaDexSource } from './mangadex';
import { MangaFireSource } from './mangafire';
import { MangaPlusSource } from './mangaplus';
import { SOURCE_METADATA } from './metadata';
import { PlaceholderSource } from './placeholder';
import { ShinigamiSource } from './shinigami';
import type { MangaSource } from './types';

export const SOURCE_REGISTRY: Record<string, MangaSource> = {
  asurascans: new AsuraScansSource(),
  mangadex: new MangaDexSource(),
  mangafire: new MangaFireSource(),
  mangaplus: new MangaPlusSource(),
  batoto: new BatoToSource(),
  crotpedia: new CrotpediaSource(),
  doujinpoi: new DoujinpoiSource(),
  dojinpoi: new DoujinpoiSource('dojinpoi'),
  doujindesu: new DoujinDesuSource('doujindesu'),
  kotatsu_id_doujindesuparser: new DoujinDesuSource('kotatsu_id_doujindesuparser'),
  komiku: new KomikuSource(),
  shinigami: new ShinigamiSource(),
  komikcast: new KomikcastSource(),
  komiktap: new KomikTapSource('komiktap'),
  kotatsu_mangareader_id_komiktapparser: new KomikTapSource('kotatsu_mangareader_id_komiktapparser')
};

export function getSource(sourceId: string): MangaSource {
  const source = SOURCE_REGISTRY[sourceId];
  if (source) return source;
  const metadata = SOURCE_METADATA.find((item) => item.id === sourceId);
  if (metadata) {
    if (isUsableSourceUrl(metadata.baseUrl)) return new KotatsuGenericSource(metadata);
    return new PlaceholderSource({
      id: metadata.id,
      name: metadata.name,
      baseUrl: metadata.baseUrl,
      language: metadata.language,
      method: metadata.method
    });
  }
  {
    throw Object.assign(new Error(`Unknown source: ${sourceId}`), {
      status: 404,
      code: 'SOURCE_NOT_FOUND'
    });
  }
}

export function sourceDomains() {
  return [
    ...new Set(
      SOURCE_METADATA.filter((source) => isUsableSourceUrl(source.baseUrl)).map((source) => {
        try {
          return new URL(source.baseUrl).hostname;
        } catch {
          return '';
        }
      }).filter(Boolean)
    )
  ];
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
