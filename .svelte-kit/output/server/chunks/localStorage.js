import { w as writable } from "./index.js";
function readLocalJson(key, fallback) {
  return fallback;
}
function localStore(key, fallback) {
  const store = writable(readLocalJson(key, fallback));
  return store;
}
export {
  localStore as l
};
