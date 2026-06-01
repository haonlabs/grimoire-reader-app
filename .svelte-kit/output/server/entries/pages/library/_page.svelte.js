import { ah as store_get, F as ensure_array_like, k as attr_class, G as escape_html, j as attr, al as unsubscribe_stores } from "../../../chunks/renderer.js";
import { M as MangaGrid } from "../../../chunks/MangaGrid.js";
import { P as Plus, l as library, c as categories } from "../../../chunks/library.js";
import { e as enabledSources } from "../../../chunks/settings.js";
import { T as Trash_2 } from "../../../chunks/trash-2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let entries, manga;
    let activeCategory = "all";
    let view = "grid";
    let sort = "added";
    let newCategory = "";
    entries = store_get($$store_subs ??= {}, "$library", library).filter((entry) => activeCategory === "all").filter((entry) => store_get($$store_subs ??= {}, "$enabledSources", enabledSources).includes(entry.manga.sourceId)).sort((a, b) => {
      return b.addedAt.localeCompare(a.addedAt);
    });
    manga = entries.map((entry) => entry.manga);
    $$renderer2.push(`<section class="mb-6 flex flex-col gap-4 rounded-lg border border-white/10 bg-[#111116] p-4 shadow-soft md:flex-row md:items-end md:justify-between"><div><p class="text-sm font-medium text-ember">Library</p> <h1 class="mt-1 text-3xl font-bold text-white">Saved manga</h1></div> <div class="flex flex-wrap gap-2">`);
    $$renderer2.select(
      {
        class: "focus-ring rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white",
        value: sort
      },
      ($$renderer3) => {
        $$renderer3.option({ class: "bg-ink", value: "added" }, ($$renderer4) => {
          $$renderer4.push(`Recently added`);
        });
        $$renderer3.option({ class: "bg-ink", value: "read" }, ($$renderer4) => {
          $$renderer4.push(`Last read`);
        });
        $$renderer3.option({ class: "bg-ink", value: "title" }, ($$renderer4) => {
          $$renderer4.push(`Title A-Z`);
        });
      }
    );
    $$renderer2.push(` `);
    $$renderer2.select(
      {
        class: "focus-ring rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white",
        value: view
      },
      ($$renderer3) => {
        $$renderer3.option({ class: "bg-ink", value: "grid" }, ($$renderer4) => {
          $$renderer4.push(`Grid`);
        });
        $$renderer3.option({ class: "bg-ink", value: "list" }, ($$renderer4) => {
          $$renderer4.push(`List`);
        });
      }
    );
    $$renderer2.push(` <button class="focus-ring rounded-lg border border-ember/30 px-3 py-2 text-sm text-ember" type="button">`);
    Trash_2($$renderer2, { size: 16 });
    $$renderer2.push(`<!----></button></div></section> <div class="mb-5 flex gap-2 overflow-x-auto pb-1"><!--[-->`);
    const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$categories", categories));
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let category = each_array[$$index];
      $$renderer2.push(`<button${attr_class(`focus-ring whitespace-nowrap rounded-lg px-3 py-2 text-sm ${activeCategory === category.id ? "bg-ember text-white" : "border border-white/10 bg-white/10 text-white/70"}`)} type="button">${escape_html(category.name)}</button>`);
    }
    $$renderer2.push(`<!--]--></div> <form class="mb-6 flex max-w-md gap-2"><input class="focus-ring min-h-10 flex-1 rounded-lg border border-white/10 bg-white/10 px-3 text-sm text-white placeholder:text-white/40"${attr("value", newCategory)} placeholder="New category"/> <button class="focus-ring rounded-lg bg-ember px-3 text-white" type="submit" title="Create category">`);
    Plus($$renderer2, { size: 18 });
    $$renderer2.push(`<!----></button></form> `);
    if (manga.length) {
      $$renderer2.push("<!--[0-->");
      MangaGrid($$renderer2, { items: manga, view });
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="rounded-lg border border-white/10 bg-[#111116] p-6 text-sm text-white/55">Your library is empty. Add manga from a detail page and it will appear here.</div>`);
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
