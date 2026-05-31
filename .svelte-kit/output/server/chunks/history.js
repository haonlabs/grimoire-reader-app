import { l as localStore } from "./localStorage.js";
const history = localStore("manga_history", []);
const readChapters = localStore("manga_read_chapters", {});
export {
  history as h,
  readChapters as r
};
