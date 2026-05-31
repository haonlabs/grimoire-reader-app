import { sourceFromParams, sourceJson } from '$lib/server/api';

export async function GET({ params }) {
  return sourceJson(async () => (await sourceFromParams(params).getFilters?.()) ?? []);
}
