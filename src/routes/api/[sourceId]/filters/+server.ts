import { sourceFromParams, sourceJson } from '$lib/server/api';

export async function GET({ cookies, params, request }) {
  return sourceJson(async () => (await sourceFromParams(params).getFilters?.()) ?? [], {
    cookies,
    request,
    sourceId: params.sourceId
  });
}
