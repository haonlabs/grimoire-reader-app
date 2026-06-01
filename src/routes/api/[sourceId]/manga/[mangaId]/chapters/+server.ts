import { sourceFromParams, sourceJson } from '$lib/server/api';

export async function GET({ cookies, params, request }) {
  return sourceJson(() => sourceFromParams(params).getChapters(params.mangaId), {
    cookies,
    request,
    sourceId: params.sourceId
  });
}
