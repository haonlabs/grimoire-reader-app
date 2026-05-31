import { parseFilters, parsePage, sourceFromParams, sourceJson } from '$lib/server/api';

export async function GET({ params, url }) {
  return sourceJson(() => sourceFromParams(params).getList(parsePage(url), parseFilters(url)));
}
