import { WordpressMangaSource } from '$lib/sources/wordpress';

export class SasangeyouSource extends WordpressMangaSource {
  constructor(id = 'sasangeyou') {
    super({
      id,
      name: 'Sasangeyou',
      baseUrl: 'https://sasangeyou.net',
      language: 'id',
      contentRating: 'explicit',
      isNsfw: true,
      archivePath: '/manga/',
      pageSize: 24,
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
