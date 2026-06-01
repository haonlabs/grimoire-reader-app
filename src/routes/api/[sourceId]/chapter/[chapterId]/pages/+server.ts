import { sourceFromParams, sourceJson } from '$lib/server/api';

export async function GET({ cookies, params, request }) {
  return sourceJson(() => sourceFromParams(params).getPages(params.chapterId), {
    cookies,
    request,
    sourceId: params.sourceId
  });
}
