import type { Manga, MangaFormat } from '$lib/sources/types';

const FORMATS: MangaFormat[] = ['Manga', 'Manhwa', 'Manhua'];

export function normalizeMangaFormat(value?: string): MangaFormat | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  return FORMATS.find((format) => normalized.includes(format.toLowerCase()));
}

export function mangaFormatLabel(manga: Manga): MangaFormat {
  return (
    manga.format ??
    manga.genres.map(normalizeMangaFormat).find((format): format is MangaFormat => Boolean(format)) ??
    'Manga'
  );
}
