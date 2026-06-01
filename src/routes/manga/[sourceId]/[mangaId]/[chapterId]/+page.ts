import type { PageLoad } from './$types';
import type { Chapter } from '$lib/sources/types';
import { sourceFetch } from '$lib/utils/sourceUnlock';

export const load: PageLoad = async ({ fetch, params }) => {
  const [detailResponse, chaptersResponse, pagesResponse] = await Promise.all([
    sourceFetch(fetch, params.sourceId, `/api/${params.sourceId}/manga/${params.mangaId}`),
    sourceFetch(fetch, params.sourceId, `/api/${params.sourceId}/manga/${params.mangaId}/chapters`),
    sourceFetch(fetch, params.sourceId, `/api/${params.sourceId}/chapter/${params.chapterId}/pages`)
  ]);
  const chapters = (chaptersResponse.ok ? await chaptersResponse.json() : []) as Chapter[];
  const chapter = chapters.find((entry) => entry.id === params.chapterId) ?? {
    id: params.chapterId,
    mangaId: params.mangaId,
    sourceId: params.sourceId,
    number: 0,
    language: 'en',
    uploadedAt: new Date().toISOString(),
    url: ''
  };

  return {
    manga: detailResponse.ok ? await detailResponse.json() : null,
    chapter,
    chapters,
    sourceId: params.sourceId,
    mangaId: params.mangaId,
    pages: pagesResponse.ok ? await pagesResponse.json() : [],
    error: pagesResponse.ok ? '' : (await pagesResponse.json()).error
  };
};
