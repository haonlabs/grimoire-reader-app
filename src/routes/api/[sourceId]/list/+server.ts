import { parseFilters, parsePage, sourceFromParams, sourceJson } from '$lib/server/api';

export async function GET({ cookies, params, request, url }) {
  const filters = parseFilters(url);
  const page = parsePage(url);
  return sourceJson(() => sourceFromParams(params).getList(page, filters), {
    cookies,
    request,
    sourceId: params.sourceId
  });
}
