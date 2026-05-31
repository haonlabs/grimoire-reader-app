import type { Chapter, Manga } from '$lib/sources/types';
import { localStore } from '$lib/utils/localStorage';

export interface HistoryEntry {
  manga: Manga;
  chapter: Chapter;
  lastPage: number;
  totalPages: number;
  lastReadAt: string;
}

export const history = localStore<HistoryEntry[]>('manga_history', []);
export const readChapters = localStore<Record<string, number>>('manga_read_chapters', {});
