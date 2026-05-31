import { b as sourceJson, s as sourceFromParams } from "../../../../../../../chunks/api.js";
async function GET({ params }) {
  return sourceJson(() => sourceFromParams(params).getChapters(params.mangaId));
}
export {
  GET
};
