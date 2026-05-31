import { browser } from '$app/environment';
import { localStore } from '$lib/utils/localStorage';

export type ReadingMode = 'rtl' | 'ltr' | 'vertical' | 'single' | 'double';
export type FitMode = 'width' | 'height' | 'screen' | 'original';
export type ReaderBackground = 'white' | 'black' | 'sepia';
export type ThemeMode = 'light' | 'dark' | 'system';
export type UiLanguage = 'en' | 'id';

export interface UserSettings {
  theme: ThemeMode;
  uiLanguage: UiLanguage;
  defaultSourceId: string;
  defaultContentRating: 'safe' | 'suggestive' | 'explicit';
  reader: {
    mode: ReadingMode;
    fit: FitMode;
    background: ReaderBackground;
    preloadPages: number;
    showPageNumber: boolean;
    incognito: boolean;
  };
}

export const defaultSettings: UserSettings = {
  theme: 'system',
  uiLanguage: 'en',
  defaultSourceId: 'mangadex',
  defaultContentRating: 'suggestive',
  reader: {
    mode: 'rtl',
    fit: 'width',
    background: 'black',
    preloadPages: 3,
    showPageNumber: true,
    incognito: false
  }
};

export const settings = localStore<UserSettings>('manga_settings', defaultSettings);
export const defaultEnabledSources = [
  'mangadex',
  'mangafire',
  'mangaplus',
  'batoto',
  'komiku',
  'shinigami',
  'komikcast'
];
export const enabledSources = localStore<string[]>('manga_sources_enabled', defaultEnabledSources);

if (browser) {
  enabledSources.update((items) => [...new Set([...items, ...defaultEnabledSources])]);
}
