import { redirect } from "@sveltejs/kit";
function load() {
  redirect(307, "/explore");
}
export {
  load
};
