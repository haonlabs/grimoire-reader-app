import { a7 as sanitize_props, af as spread_props, ad as slot, ag as store_get, F as ensure_array_like, k as attr_class, G as escape_html, j as attr, ak as unsubscribe_stores } from "../../../chunks/renderer.js";
import { M as MangaGrid } from "../../../chunks/MangaGrid.js";
import { l as library, c as categories } from "../../../chunks/library.js";
import { e as enabledSources } from "../../../chunks/settings.js";
import { T as Trash_2 } from "../../../chunks/trash-2.js";
import { I as Icon } from "../../../chunks/Icon.js";
function Plus($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.468.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [["path", { "d": "M5 12h14" }], ["path", { "d": "M12 5v14" }]];
  Icon($$renderer, spread_props([
    { name: "plus" },
    $$sanitized_props,
    {
      /**
       * @component @name Plus
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNSAxMmgxNCIgLz4KICA8cGF0aCBkPSJNMTIgNXYxNCIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/plus
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
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
    $$renderer2.push(`<section class="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p class="text-sm font-medium text-ember">Library</p> <h1 class="mt-1 text-3xl font-bold">Saved manga</h1></div> <div class="flex flex-wrap gap-2">`);
    $$renderer2.select(
      {
        class: "focus-ring rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/10",
        value: sort
      },
      ($$renderer3) => {
        $$renderer3.option({ value: "added" }, ($$renderer4) => {
          $$renderer4.push(`Recently added`);
        });
        $$renderer3.option({ value: "read" }, ($$renderer4) => {
          $$renderer4.push(`Last read`);
        });
        $$renderer3.option({ value: "title" }, ($$renderer4) => {
          $$renderer4.push(`Title A-Z`);
        });
      }
    );
    $$renderer2.push(` `);
    $$renderer2.select(
      {
        class: "focus-ring rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/10",
        value: view
      },
      ($$renderer3) => {
        $$renderer3.option({ value: "grid" }, ($$renderer4) => {
          $$renderer4.push(`Grid`);
        });
        $$renderer3.option({ value: "list" }, ($$renderer4) => {
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
      $$renderer2.push(`<button${attr_class(`focus-ring whitespace-nowrap rounded-lg px-3 py-2 text-sm ${activeCategory === category.id ? "bg-ink text-white dark:bg-white dark:text-ink" : "border border-ink/10 bg-white text-ink/70 dark:border-white/10 dark:bg-white/10 dark:text-white/70"}`)} type="button">${escape_html(category.name)}</button>`);
    }
    $$renderer2.push(`<!--]--></div> <form class="mb-6 flex max-w-md gap-2"><input class="focus-ring min-h-10 flex-1 rounded-lg border border-ink/10 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/10"${attr("value", newCategory)} placeholder="New category"/> <button class="focus-ring rounded-lg bg-ink px-3 text-white dark:bg-white dark:text-ink" type="submit" title="Create category">`);
    Plus($$renderer2, { size: 18 });
    $$renderer2.push(`<!----></button></form> `);
    if (manga.length) {
      $$renderer2.push("<!--[0-->");
      MangaGrid($$renderer2, { items: manga, view });
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="rounded-lg border border-ink/10 bg-white p-6 text-sm text-ink/55 dark:border-white/10 dark:bg-white/5 dark:text-white/55">Your library is empty. Add manga from a detail page and it will appear here.</div>`);
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
