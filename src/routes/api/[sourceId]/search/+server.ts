import { parseFilters, parsePage, sourceFromParams, sourceJson } from '$lib/server/api';

export async function GET({ cookies, params, request, url }) {
  const query = url.searchParams.get('q') ?? '';
  return sourceJson(() => sourceFromParams(params).search(query, parsePage(url), parseFilters(url)), {
    cookies,
    request,
    sourceId: params.sourceId
  });
}
