import type { SourceMetadata } from './types';
import { KOTATSU_SOURCE_CATALOG } from './kotatsuCatalog';

const IMPLEMENTED_SOURCE_METADATA: SourceMetadata[] = [
  {
    id: 'asurascans',
    name: 'Asura Scans',
    description: 'English Asura Scans source using the current asurascans.com API and Astro reader pages.',
    language: 'en',
    baseUrl: 'https://asurascans.com',
    contentRating: 'suggestive',
    isNsfw: false,
    method: 'Scraping + API',
    icon: 'AS'
  },
  {
    id: 'mangadex',
    name: 'MangaDex',
    description: 'Community manga catalog using the official MangaDex REST API.',
    language: 'multi',
    baseUrl: 'https://mangadex.org',
    contentRating: 'suggestive',
    isNsfw: false,
    method: 'Official API',
    icon: 'MD'
  },
  {
    id: 'mangafire',
    name: 'MangaFire',
    description: 'English manga source using the MangaFire HTML catalog and AJAX reader endpoints.',
    language: 'en',
    baseUrl: 'https://mangafire.to',
    contentRating: 'suggestive',
    isNsfw: false,
    method: 'Scraping + API',
    icon: 'MF'
  },
  {
    id: 'mangaplus',
    name: 'MangaPlus',
    description: 'Official Shueisha catalog using the same MANGA Plus web API shape as Kotatsu.',
    language: 'en/ja',
    baseUrl: 'https://mangaplus.shueisha.co.jp',
    contentRating: 'safe',
    isNsfw: false,
    method: 'Unofficial API',
    icon: 'M+'
  },
  {
    id: 'batoto',
    name: 'Bato.to',
    description: 'Large multilingual community source using Bato browse/detail selectors.',
    language: 'multi',
    baseUrl: 'https://wto.to',
    contentRating: 'suggestive',
    isNsfw: false,
    method: 'Scraping',
    icon: 'BT'
  },
  {
    id: 'crotpedia',
    name: 'CrotPedia',
    description: 'Indonesian explicit source using the CrotPedia ZManga list, detail, and reader pages.',
    language: 'id',
    baseUrl: 'https://crotpedia.net',
    contentRating: 'explicit',
    isNsfw: true,
    method: 'Scraping',
    icon: 'CP'
  },
  {
    id: 'doujindesu',
    name: 'DoujinDesu.tv',
    description: 'Indonesian explicit source ported directly from the Kotatsu DoujinDesu parser flow.',
    language: 'id',
    baseUrl: 'https://doujindesu.tv',
    contentRating: 'explicit',
    isNsfw: true,
    method: 'Scraping',
    icon: 'DD'
  },
  {
    id: 'doujinpoi',
    name: 'Doujinpoi',
    description: 'Indonesian explicit source using Doujinpoi catalog pages and reader JSON endpoints.',
    language: 'id',
    baseUrl: 'https://doujinpoi.net',
    contentRating: 'explicit',
    isNsfw: true,
    method: 'Scraping + API',
    icon: 'DP'
  },
  {
    id: 'komiku',
    name: 'Komiku',
    description: 'Indonesian source using the current Komiku API HTML partials and reader pages.',
    language: 'id',
    baseUrl: 'https://komiku.org',
    contentRating: 'safe',
    isNsfw: false,
    method: 'Scraping',
    icon: 'KO'
  },
  {
    id: 'shinigami',
    name: 'Shinigami ID',
    description: 'Indonesian manga, manhwa, and manhua source using the Shinigami API.',
    language: 'id',
    baseUrl: 'https://g.shinigami.asia',
    contentRating: 'suggestive',
    isNsfw: false,
    method: 'Unofficial API',
    icon: 'SH'
  },
  {
    id: 'komikcast',
    name: 'Komikcast',
    description: 'Indonesian komik source using the current Komikcast backend API.',
    language: 'id',
    baseUrl: 'https://v2.komikcast.fit',
    contentRating: 'suggestive',
    isNsfw: false,
    method: 'Unofficial API',
    icon: 'KC'
  },
  {
    id: 'komiktap',
    name: 'KomikTap',
    description: 'Indonesian source ported from Kotatsu MangaReaderParser with KomikTap page parsing.',
    language: 'id',
    baseUrl: 'https://komiktap.info',
    contentRating: 'suggestive',
    isNsfw: false,
    method: 'Scraping',
    icon: 'KT'
  }
];

export const SOURCE_METADATA: SourceMetadata[] = [...IMPLEMENTED_SOURCE_METADATA, ...KOTATSU_SOURCE_CATALOG];
