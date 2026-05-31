import { b as sourceJson, s as sourceFromParams, a as parsePage, p as parseFilters } from "../../../../../chunks/api.js";
async function GET({ params, url }) {
  const query = url.searchParams.get("q") ?? "";
  return sourceJson(() => sourceFromParams(params).search(query, parsePage(url), parseFilters(url)));
}
export {
  GET
};
