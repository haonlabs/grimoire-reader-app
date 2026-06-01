import { F as ensure_array_like, ah as store_get, j as attr, G as escape_html, l as attr_style, al as unsubscribe_stores } from "../../../chunks/renderer.js";
import { h as history } from "../../../chunks/history.js";
import { p as proxiedImageUrl } from "../../../chunks/image.js";
import { T as Trash_2 } from "../../../chunks/trash-2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    $$renderer2.push(`<section class="mb-6 flex items-end justify-between gap-3 rounded-lg border border-white/10 bg-[#111116] p-4 shadow-soft"><div><p class="text-sm font-medium text-ember">History</p> <h1 class="mt-1 text-3xl font-bold text-white">Reading progress</h1></div> <button class="focus-ring rounded-lg border border-ember/30 px-3 py-2 text-sm text-ember" type="button">`);
    Trash_2($$renderer2, { size: 17 });
    $$renderer2.push(`<!----></button></section> <div class="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10 bg-[#111116]">`);
    const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$history", history));
    if (each_array.length !== 0) {
      $$renderer2.push("<!--[-->");
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let item = each_array[$$index];
        $$renderer2.push(`<a class="flex gap-3 p-3 transition hover:bg-white/10"${attr("href", `/manga/${item.manga.sourceId}/${item.manga.id}/${item.chapter.id}`)}><img class="h-24 w-16 rounded object-cover"${attr("src", proxiedImageUrl(item.manga.coverUrl))}${attr("alt", item.manga.title)} loading="lazy"/> <div class="min-w-0 flex-1"><p class="font-semibold text-white">${escape_html(item.manga.title)}</p> <p class="mt-1 text-sm text-white/60">Chapter ${escape_html(item.chapter.number || "?")}</p> <div class="mt-3 h-1.5 overflow-hidden rounded bg-white/10"><div class="h-full bg-ember"${attr_style(`width: ${Math.min(100, (item.lastPage + 1) / Math.max(1, item.totalPages) * 100)}%`)}></div></div></div></a>`);
      }
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="p-6 text-sm text-white/55">No reading history yet.</div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
