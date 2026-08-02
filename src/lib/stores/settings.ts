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
  adultModeEnabled: boolean;
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
  uiLanguage: 'id',
  defaultSourceId: 'shinigami',
  defaultContentRating: 'suggestive',
  adultModeEnabled: false,
  reader: {
    mode: 'vertical',
    fit: 'width',
    background: 'black',
    preloadPages: 3,
    showPageNumber: false,
    incognito: false
  }
};

export const settings = localStore<UserSettings>('manga_settings', defaultSettings);
export const nativeSourceIds = [
  'asurascans',
  'mangadex',
  'mangaplus',
  'crotpedia',
  'doujinpoi',
  'doujindesu',
  'dojinpoi',
  'komiku',
  'shinigami',
  'komikcast',
  'komiktap',
  'sasangeyou',
  'mihentai',
  'toongod'
];
export const adultModeSourceIds = [
  'crotpedia',
  'doujinpoi',
  'doujindesu',
  'dojinpoi',
  'komiktap',
  'sasangeyou',
  'mihentai',
  'toongod'
];
export const defaultEnabledSources = ['shinigami'];
export const enabledSources = localStore<string[]>('manga_sources_enabled', defaultEnabledSources);

export function isAdultModeSource(sourceId: string) {
  return adultModeSourceIds.includes(sourceId);
}

if (browser) {
  enabledSources.update((items) => {
    const filtered = [...new Set(items.length ? items : defaultEnabledSources)].filter((id) =>
      nativeSourceIds.includes(id)
    );
    return filtered.length ? filtered : defaultEnabledSources;
  });
  settings.update((value) => ({
    ...value,
    uiLanguage: value.uiLanguage === 'en' ? 'id' : value.uiLanguage,
    adultModeEnabled: value.adultModeEnabled ?? false,
    defaultSourceId:
      nativeSourceIds.includes(value.defaultSourceId) && ((value.adultModeEnabled ?? false) || !isAdultModeSource(value.defaultSourceId))
        ? value.defaultSourceId
        : 'shinigami',
    reader: {
      ...value.reader,
      mode: 'vertical',
      showPageNumber: false
    }
  }));
}
