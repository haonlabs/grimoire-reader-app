import { l as localStore } from "./localStorage.js";
const defaultSettings = {
  theme: "system",
  uiLanguage: "id",
  defaultSourceId: "shinigami",
  defaultContentRating: "suggestive",
  reader: {
    mode: "vertical",
    fit: "width",
    background: "black",
    preloadPages: 3,
    showPageNumber: false,
    incognito: false
  }
};
const settings = localStore("manga_settings", defaultSettings);
const defaultEnabledSources = ["shinigami"];
const enabledSources = localStore("manga_sources_enabled", defaultEnabledSources);
export {
  enabledSources as e,
  settings as s
};
