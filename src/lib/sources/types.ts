export type ContentRating = 'safe' | 'suggestive' | 'explicit';
export type MangaStatus = 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
export type SortOption = 'popular' | 'newest' | 'updated' | 'rating';

export interface FilterInput {
  id: string;
  value: string | string[] | boolean | number;
}

export interface FilterOption {
  id: string;
  label: string;
  type: 'select' | 'multi-select' | 'toggle';
  values: Array<{ label: string; value: string }>;
}

export interface Manga {
  id: string;
  sourceId: string;
  title: string;
  coverUrl: string;
  author?: string;
  artist?: string;
  description?: string;
  status: MangaStatus;
  genres: string[];
  rating?: number;
  url: string;
}

export interface MangaDetail extends Manga {
  alternateTitles: string[];
  year?: number;
  related?: Manga[];
}

export interface Chapter {
  id: string;
  mangaId: string;
  sourceId: string;
  number: number;
  title?: string;
  language: string;
  uploadedAt: string;
  scanlator?: string;
  url: string;
}

export interface MangaListResult {
  items: Manga[];
  page: number;
  hasNextPage: boolean;
  total?: number;
}

export interface SourceHealth {
  status: 'online' | 'offline' | 'limited';
  message?: string;
}

export interface MangaSource {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly language: string;
  readonly contentRating: ContentRating;
  readonly isNsfw: boolean;

  getList(page: number, filters?: FilterInput[]): Promise<MangaListResult>;
  search(query: string, page: number, filters?: FilterInput[]): Promise<MangaListResult>;
  getDetail(mangaId: string): Promise<MangaDetail>;
  getChapters(mangaId: string): Promise<Chapter[]>;
  getPages(chapterId: string): Promise<string[]>;

  getFilters?(): Promise<FilterOption[]>;
  getFeatured?(): Promise<Manga[]>;
  getHealth?(): Promise<SourceHealth>;
}

export interface SourceMetadata {
  id: string;
  name: string;
  description: string;
  language: string;
  baseUrl: string;
  contentRating: ContentRating;
  isNsfw: boolean;
  method: 'Official API' | 'Unofficial API' | 'Scraping' | 'Scraping + API';
  icon: string;
}
