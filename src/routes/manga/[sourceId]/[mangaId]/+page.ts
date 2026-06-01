import type { PageLoad } from './$types';
import { sourceFetch } from '$lib/utils/sourceUnlock';

export const load: PageLoad = async ({ fetch, params }) => {
  const [detailResponse, chaptersResponse] = await Promise.all([
    sourceFetch(fetch, params.sourceId, `/api/${params.sourceId}/manga/${params.mangaId}`),
    sourceFetch(fetch, params.sourceId, `/api/${params.sourceId}/manga/${params.mangaId}/chapters`)
  ]);

  return {
    sourceId: params.sourceId,
    mangaId: params.mangaId,
    manga: detailResponse.ok ? await detailResponse.json() : null,
    chapters: chaptersResponse.ok ? await chaptersResponse.json() : [],
    error: detailResponse.ok ? '' : (await detailResponse.json()).error
  };
};
