import { WordpressMangaSource } from '$lib/sources/wordpress';

export class MiHentaiSource extends WordpressMangaSource {
  constructor(id = 'mihentai') {
    super({
      id,
      name: 'MiHentai',
      baseUrl: 'https://mihentai.net',
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
