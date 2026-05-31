import { b as sourceJson, s as sourceFromParams, a as parsePage, p as parseFilters } from "../../../../../chunks/api.js";
async function GET({ params, url }) {
  return sourceJson(() => sourceFromParams(params).getList(parsePage(url), parseFilters(url)));
}
export {
  GET
};
