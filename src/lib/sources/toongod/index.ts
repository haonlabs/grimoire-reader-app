import { WordpressMangaSource } from '$lib/sources/wordpress';

export class ToonGodSource extends WordpressMangaSource {
  constructor(id = 'toongod') {
    super({
      id,
      name: 'ToonGod',
      baseUrl: 'https://toongod.org',
      language: 'en',
      contentRating: 'explicit',
      isNsfw: true,
      archivePath: '/manga-list/',
      mirrorBaseUrls: ['https://toongod.us', 'https://toongod.app', 'https://www.toongod.app', 'https://thetoongod.org'],
      pageSize: 24,
      searchPostType: 'wp-manga',
      adultGenreSlug: 'r-18',
      adultOnlyGenreIds: ['36', '38', '86'],
      adultExcludeGenreIds: ['36', '38', '50', '61', '72', '81', '86'],
      adultGenreLabel: 'R-18',
      sort: {
        param: 'order',
        values: {
          updated: 'update',
          newest: 'latest',
          popular: 'popular',
          rating: 'rating'
        }
      }
    });
  }
}
