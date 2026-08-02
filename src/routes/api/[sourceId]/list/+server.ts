import { parseFilters, parsePage, sourceFromParams, sourceJson } from '$lib/server/api';
import { getFormatFilteredPage } from '$lib/server/filteredPagination';

export async function GET({ cookies, params, request, url }) {
  const filters = parseFilters(url);
  const page = parsePage(url);
  return sourceJson(() => getFormatFilteredPage(sourceFromParams(params), page, filters), {
    cookies,
    request,
    sourceId: params.sourceId
  });
}
