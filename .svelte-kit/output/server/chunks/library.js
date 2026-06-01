import { l as localStore } from "./localStorage.js";
const defaultCategories = [
  { id: "all", name: "All", builtIn: true },
  { id: "reading", name: "Reading", builtIn: true },
  { id: "completed", name: "Finished", builtIn: true },
  { id: "planned", name: "Planned", builtIn: true },
  { id: "dropped", name: "Dropped", builtIn: true }
];
const library = localStore("manga_library", []);
const categories = localStore("manga_categories", defaultCategories);
export {
  categories as c,
  library as l
};
