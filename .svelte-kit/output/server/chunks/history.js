import { l as localStore } from "./localStorage.js";
const history = localStore("manga_history", []);
const readChapters = localStore("manga_read_chapters", {});
const readerPositions = localStore("manga_reader_positions", {});
export {
  readerPositions as a,
  history as h,
  readChapters as r
};
