import { parseFilters, parsePage, sourceFromParams, sourceJson } from '$lib/server/api';

export async function GET({ cookies, params, request, url }) {
  return sourceJson(() => sourceFromParams(params).getList(parsePage(url), parseFilters(url)), {
    cookies,
    request,
    sourceId: params.sourceId
  });
}
