import { b as sourceJson, s as sourceFromParams } from "../../../../../chunks/api.js";
async function GET({ params }) {
  return sourceJson(async () => await sourceFromParams(params).getFilters?.() ?? []);
}
export {
  GET
};
