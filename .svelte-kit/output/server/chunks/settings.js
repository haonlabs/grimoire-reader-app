import { l as localStore } from "./localStorage.js";
const defaultSettings = {
  theme: "system",
  uiLanguage: "en",
  defaultSourceId: "mangadex",
  defaultContentRating: "suggestive",
  reader: {
    mode: "rtl",
    fit: "width",
    background: "black",
    preloadPages: 3,
    showPageNumber: true,
    incognito: false
  }
};
const settings = localStore("manga_settings", defaultSettings);
const defaultEnabledSources = [
  "mangadex",
  "mangafire",
  "mangaplus",
  "batoto",
  "komiku",
  "shinigami",
  "komikcast"
];
const enabledSources = localStore("manga_sources_enabled", defaultEnabledSources);
export {
  enabledSources as e,
  settings as s
};
