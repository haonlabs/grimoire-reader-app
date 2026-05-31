import { sourceFromParams, sourceJson } from '$lib/server/api';

export async function GET({ params }) {
  return sourceJson(() => sourceFromParams(params).getChapters(params.mangaId));
}
