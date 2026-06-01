const load = async ({ fetch, params }) => {
  const [detailResponse, chaptersResponse, pagesResponse] = await Promise.all([
    fetch(`/api/${params.sourceId}/manga/${params.mangaId}`),
    fetch(`/api/${params.sourceId}/manga/${params.mangaId}/chapters`),
    fetch(`/api/${params.sourceId}/chapter/${params.chapterId}/pages`)
  ]);
  const chapters = chaptersResponse.ok ? await chaptersResponse.json() : [];
  const chapter = chapters.find((entry) => entry.id === params.chapterId) ?? {
    id: params.chapterId,
    mangaId: params.mangaId,
    sourceId: params.sourceId,
    number: 0,
    language: "en",
    uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
    url: ""
  };
  return {
    manga: detailResponse.ok ? await detailResponse.json() : null,
    chapter,
    chapters,
    sourceId: params.sourceId,
    mangaId: params.mangaId,
    pages: pagesResponse.ok ? await pagesResponse.json() : [],
    error: pagesResponse.ok ? "" : (await pagesResponse.json()).error
  };
};
export {
  load
};
