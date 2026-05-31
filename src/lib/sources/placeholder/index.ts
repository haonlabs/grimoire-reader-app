import type {
  Chapter,
  FilterInput,
  FilterOption,
  MangaDetail,
  MangaListResult,
  MangaSource,
  SourceHealth
} from '$lib/sources/types';

interface PlaceholderSourceOptions {
  id: string;
  name: string;
  baseUrl: string;
  language: string;
  method: string;
}

export class PlaceholderSource implements MangaSource {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly language: string;
  readonly contentRating = 'suggestive' as const;
  readonly isNsfw = false;
  private readonly method: string;

  constructor(options: PlaceholderSourceOptions) {
    this.id = options.id;
    this.name = options.name;
    this.baseUrl = options.baseUrl;
    this.language = options.language;
    this.method = options.method;
  }

  async getList(page: number, _filters?: FilterInput[]): Promise<MangaListResult> {
    throw Object.assign(
      new Error(`${this.name} belum punya parser aktif. Source ini baru terdaftar di registry (${this.method}) dan belum bisa menampilkan daftar manga.`),
      {
        status: 501,
        code: 'SOURCE_NOT_IMPLEMENTED',
        page
      }
    );
  }

  async search(_query: string, page: number, _filters?: FilterInput[]): Promise<MangaListResult> {
    throw Object.assign(
      new Error(`${this.name} belum punya parser aktif. Search untuk source ini belum diimplementasikan.`),
      {
        status: 501,
        code: 'SOURCE_NOT_IMPLEMENTED',
        page
      }
    );
  }

  async getDetail(mangaId: string): Promise<MangaDetail> {
    throw Object.assign(new Error(`${this.name} parser is scaffolded but not implemented yet`), {
      status: 501,
      code: 'SOURCE_NOT_IMPLEMENTED',
      mangaId
    });
  }

  async getChapters(_mangaId: string): Promise<Chapter[]> {
    return [];
  }

  async getPages(_chapterId: string): Promise<string[]> {
    return [];
  }

  async getFilters(): Promise<FilterOption[]> {
    return [
      {
        id: 'sort',
        label: 'Sort',
        type: 'select',
        values: [
          { label: 'Popular', value: 'popular' },
          { label: 'Newest', value: 'newest' },
          { label: 'Updated', value: 'updated' }
        ]
      }
    ];
  }

  async getHealth(): Promise<SourceHealth> {
    return {
      status: 'limited',
      message: `${this.method} adapter scaffold is ready for implementation`
    };
  }
}
