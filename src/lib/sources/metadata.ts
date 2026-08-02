import type { SourceMetadata } from './types';
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
    id: 'mangaplus',
    name: 'MangaPlus',
    description: 'Katalog resmi Shueisha untuk membaca chapter MANGA Plus yang tersedia secara publik.',
    language: 'en/ja',
    baseUrl: 'https://mangaplus.shueisha.co.jp',
    contentRating: 'safe',
    isNsfw: false,
    method: 'Unofficial API',
    icon: 'M+'
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
    id: 'doujindesu',
    name: 'DoujinDesu',
    description: 'Indonesian explicit source using the DoujinDesu catalog and reader API.',
    language: 'id',
    baseUrl: 'https://doujin.desu.xxx',
    contentRating: 'explicit',
    isNsfw: true,
    method: 'Unofficial API',
    icon: 'DD'
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
    description: 'Source komik Indonesia dengan katalog, pencarian, detail chapter, dan halaman baca dari KomikTap.',
    language: 'id',
    baseUrl: 'https://komiktap.info',
    contentRating: 'suggestive',
    isNsfw: false,
    method: 'Scraping',
    icon: 'KT'
  },
  {
    id: 'sasangeyou',
    name: 'Sasangeyou',
    description: 'Source Indonesia dengan katalog, detail, daftar chapter, dan reader berbasis halaman WordPress MangaReader.',
    language: 'id',
    baseUrl: 'https://sasangeyou.net',
    contentRating: 'explicit',
    isNsfw: true,
    method: 'Scraping',
    icon: 'SY'
  },
  {
    id: 'mihentai',
    name: 'MiHentai',
    description: 'Source eksplisit dengan parser fleksibel untuk katalog, detail, chapter, dan reader berbasis WordPress.',
    language: 'id',
    baseUrl: 'https://mihentai.net',
    contentRating: 'explicit',
    isNsfw: true,
    method: 'Scraping',
    icon: 'MH'
  },
  {
    id: 'toongod',
    name: 'ToonGod',
    description: 'Source webtoon dengan parser katalog dan reader Madara, termasuk pilihan konten 18+ per source.',
    language: 'en',
    baseUrl: 'https://toongod.org',
    contentRating: 'explicit',
    isNsfw: true,
    method: 'Scraping + API',
    icon: 'TG'
  }
];

export const SOURCE_METADATA: SourceMetadata[] = IMPLEMENTED_SOURCE_METADATA;
