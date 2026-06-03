import { parseFilters, parsePage, sourceFromParams, sourceJson } from '$lib/server/api';

export async function GET({ cookies, params, request, url }) {
  const query = url.searchParams.get('q') ?? '';
  const filters = parseFilters(url);
  const page = parsePage(url);
  return sourceJson(() => sourceFromParams(params).search(query, page, filters), {
    cookies,
    request,
    sourceId: params.sourceId
  });
}
