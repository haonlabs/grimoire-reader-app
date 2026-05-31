const load = async ({ fetch, params }) => {
  const [detailResponse, chaptersResponse] = await Promise.all([
    fetch(`/api/${params.sourceId}/manga/${params.mangaId}`),
    fetch(`/api/${params.sourceId}/manga/${params.mangaId}/chapters`)
  ]);
  return {
    sourceId: params.sourceId,
    mangaId: params.mangaId,
    manga: detailResponse.ok ? await detailResponse.json() : null,
    chapters: chaptersResponse.ok ? await chaptersResponse.json() : [],
    error: detailResponse.ok ? "" : (await detailResponse.json()).error
  };
};
export {
  load
};
