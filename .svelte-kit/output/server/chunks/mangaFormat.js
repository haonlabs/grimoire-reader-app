const FORMATS = ["Manga", "Manhwa", "Manhua"];
function normalizeMangaFormat(value) {
  if (!value) return void 0;
  const normalized = value.toLowerCase();
  return FORMATS.find((format) => normalized.includes(format.toLowerCase()));
}
function mangaFormatLabel(manga) {
  return manga.format ?? manga.genres.map(normalizeMangaFormat).find((format) => Boolean(format)) ?? "Manga";
}
export {
  mangaFormatLabel as m,
  normalizeMangaFormat as n
};
