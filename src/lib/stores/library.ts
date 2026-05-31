import type { Manga } from '$lib/sources/types';
import { localStore } from '$lib/utils/localStorage';

export interface Category {
  id: string;
  name: string;
  builtIn?: boolean;
}

export interface LibraryEntry {
  manga: Manga;
  categoryId: string;
  addedAt: string;
  lastReadAt?: string;
  latestChapterId?: string;
}

export const defaultCategories: Category[] = [
  { id: 'all', name: 'All', builtIn: true },
  { id: 'reading', name: 'Reading', builtIn: true },
  { id: 'completed', name: 'Finished', builtIn: true },
  { id: 'planned', name: 'Planned', builtIn: true },
  { id: 'dropped', name: 'Dropped', builtIn: true }
];

export const library = localStore<LibraryEntry[]>('manga_library', []);
export const categories = localStore<Category[]>('manga_categories', defaultCategories);
