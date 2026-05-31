import { parseFilters, parsePage, sourceFromParams, sourceJson } from '$lib/server/api';

export async function GET({ params, url }) {
  const query = url.searchParams.get('q') ?? '';
  return sourceJson(() => sourceFromParams(params).search(query, parsePage(url), parseFilters(url)));
}
