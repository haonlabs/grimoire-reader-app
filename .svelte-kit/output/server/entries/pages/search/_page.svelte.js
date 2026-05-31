import { ag as store_get, j as attr, F as ensure_array_like, G as escape_html, ak as unsubscribe_stores, n as bind_props } from "../../../chunks/renderer.js";
import { p as page } from "../../../chunks/stores.js";
import { M as MangaGrid } from "../../../chunks/MangaGrid.js";
import { e as enabledSources } from "../../../chunks/settings.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let activeSources;
    let data = $$props["data"];
    let query = "";
    let mode = "active";
    let source = "mangadex";
    let loading = {};
    let results = {};
    let errors = {};
    query = store_get($$store_subs ??= {}, "$pageStore", page).url.searchParams.get("q") ?? query;
    mode = (store_get($$store_subs ??= {}, "$pageStore", page).url.searchParams.get("mode") ?? mode) || "active";
    source = store_get($$store_subs ??= {}, "$pageStore", page).url.searchParams.get("source") ?? source;
    activeSources = mode === "all" ? data.sources.filter((item) => store_get($$store_subs ??= {}, "$enabledSources", enabledSources).includes(item.id)) : data.sources.filter((item) => item.id === source);
    $$renderer2.push(`<section class="mb-6"><p class="text-sm font-medium text-ember">Search</p> <h1 class="mt-1 text-3xl font-bold">Find across grimoires</h1> <div class="mt-4 flex flex-col gap-3 sm:flex-row"><input class="focus-ring min-h-11 flex-1 rounded-lg border border-ink/10 bg-white px-3 text-ink dark:border-white/10 dark:bg-white/10 dark:text-white"${attr("value", query)} placeholder="Title, author, keyword"/> `);
    $$renderer2.select(
      {
        class: "focus-ring rounded-lg border border-ink/10 bg-white px-3 dark:border-white/10 dark:bg-white/10",
        value: mode
      },
      ($$renderer3) => {
        $$renderer3.option({ value: "active" }, ($$renderer4) => {
          $$renderer4.push(`Active source`);
        });
        $$renderer3.option({ value: "all" }, ($$renderer4) => {
          $$renderer4.push(`All enabled sources`);
        });
      }
    );
    $$renderer2.push(`</div></section> <div class="grid gap-8"><!--[-->`);
    const each_array = ensure_array_like(activeSources);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let sourceMeta = each_array[$$index];
      $$renderer2.push(`<section><div class="mb-3 flex items-center justify-between"><h2 class="text-lg font-semibold">${escape_html(sourceMeta.name)}</h2> `);
      if (loading[sourceMeta.id]) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<span class="text-sm text-ink/50 dark:text-white/50">Loading...</span>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div> `);
      if (errors[sourceMeta.id]) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="rounded-lg border border-ember/30 bg-ember/10 p-4 text-sm text-ember">${escape_html(errors[sourceMeta.id])}</div>`);
      } else if (results[sourceMeta.id]?.items?.length) {
        $$renderer2.push("<!--[1-->");
        MangaGrid($$renderer2, { items: results[sourceMeta.id].items });
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<div class="rounded-lg border border-ink/10 bg-white p-4 text-sm text-ink/55 dark:border-white/10 dark:bg-white/5 dark:text-white/55">No results yet.</div>`);
      }
      $$renderer2.push(`<!--]--></section>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, { data });
  });
}
export {
  _page as default
};
