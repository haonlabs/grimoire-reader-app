export interface MangaDexRelationship {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
}

export interface MangaDexEntity<T = unknown> {
  id: string;
  type: string;
  attributes: T;
  relationships: MangaDexRelationship[];
}

export interface MangaDexListResponse<T = Record<string, unknown>> {
  result: string;
  response: string;
  data: Array<MangaDexEntity<T>>;
  limit: number;
  offset: number;
  total: number;
}

export interface MangaDexMangaAttributes {
  title: Record<string, string>;
  altTitles?: Array<Record<string, string>>;
  description?: Record<string, string>;
  status?: string;
  year?: number;
  tags?: Array<{ attributes?: { name?: Record<string, string> } }>;
}

export interface MangaDexChapterAttributes {
  chapter?: string;
  title?: string;
  translatedLanguage: string;
  publishAt?: string;
  readableAt?: string;
}
