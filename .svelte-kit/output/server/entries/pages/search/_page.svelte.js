import { I as fallback, F as ensure_array_like, n as bind_props, ah as store_get, j as attr, G as escape_html, al as unsubscribe_stores } from "../../../chunks/renderer.js";
import { p as page } from "../../../chunks/stores.js";
import { M as MangaGrid } from "../../../chunks/MangaGrid.js";
import { S as SkeletonProgress } from "../../../chunks/SkeletonProgress.js";
import { C as Card } from "../../../chunks/Card.js";
import { S as Skeleton } from "../../../chunks/Skeleton.js";
import { e as enabledSources, s as settings } from "../../../chunks/settings.js";
import { S as Sliders_horizontal } from "../../../chunks/sliders-horizontal.js";
function MangaGridSkeleton($$renderer, $$props) {
  let count = fallback($$props["count"], 12);
  let view = fallback($$props["view"], "grid");
  let label = fallback($$props["label"], "Memuat komik");
  $$renderer.push(`<div class="mb-3 max-w-md">`);
  SkeletonProgress($$renderer, { label });
  $$renderer.push(`<!----></div> `);
  if (view === "grid") {
    $$renderer.push("<!--[0-->");
    $$renderer.push(`<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" aria-hidden="true"><!--[-->`);
    const each_array = ensure_array_like(Array(count));
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      each_array[$$index];
      Card($$renderer, {
        class: "overflow-hidden border-ink/10 bg-white dark:border-white/10 dark:bg-white/5",
        children: ($$renderer2) => {
          Skeleton($$renderer2, { class: "aspect-[2/3] rounded-none" });
          $$renderer2.push(`<!----> <div class="space-y-2 p-3">`);
          Skeleton($$renderer2, { class: "h-4 w-11/12" });
          $$renderer2.push(`<!----> `);
          Skeleton($$renderer2, { class: "h-4 w-2/3" });
          $$renderer2.push(`<!----> <div class="flex gap-2 pt-1">`);
          Skeleton($$renderer2, { class: "h-5 w-16" });
          $$renderer2.push(`<!----> `);
          Skeleton($$renderer2, { class: "h-5 w-12" });
          $$renderer2.push(`<!----></div></div>`);
        },
        $$slots: { default: true }
      });
    }
    $$renderer.push(`<!--]--></div>`);
  } else {
    $$renderer.push("<!--[-1-->");
    $$renderer.push(`<div class="grid gap-3" aria-hidden="true"><!--[-->`);
    const each_array_1 = ensure_array_like(Array(Math.min(count, 6)));
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      each_array_1[$$index_1];
      Card($$renderer, {
        class: "flex gap-3 border-ink/10 bg-white p-3 dark:border-white/10 dark:bg-white/5",
        children: ($$renderer2) => {
          Skeleton($$renderer2, { class: "h-28 w-20 shrink-0" });
          $$renderer2.push(`<!----> <div class="min-w-0 flex-1 space-y-3 py-1">`);
          Skeleton($$renderer2, { class: "h-4 w-3/4" });
          $$renderer2.push(`<!----> `);
          Skeleton($$renderer2, { class: "h-3 w-full" });
          $$renderer2.push(`<!----> `);
          Skeleton($$renderer2, { class: "h-3 w-5/6" });
          $$renderer2.push(`<!----> `);
          Skeleton($$renderer2, { class: "h-5 w-24" });
          $$renderer2.push(`<!----></div>`);
        },
        $$slots: { default: true }
      });
    }
    $$renderer.push(`<!--]--></div>`);
  }
  $$renderer.push(`<!--]-->`);
  bind_props($$props, { count, view, label });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let implementedSources, requestedSource, activeSources;
    let data = $$props["data"];
    let query = "";
    let mode = "active";
    let source = "shinigami";
    let loading = {};
    let results = {};
    let errors = {};
    query = store_get($$store_subs ??= {}, "$pageStore", page).url.searchParams.get("q") ?? query;
    mode = (store_get($$store_subs ??= {}, "$pageStore", page).url.searchParams.get("mode") ?? mode) || "active";
    implementedSources = data.sources.filter((item) => item.isImplemented !== false && store_get($$store_subs ??= {}, "$enabledSources", enabledSources).includes(item.id));
    requestedSource = store_get($$store_subs ??= {}, "$pageStore", page).url.searchParams.get("source") ?? store_get($$store_subs ??= {}, "$settings", settings).defaultSourceId;
    source = implementedSources.some((item) => item.id === requestedSource) ? requestedSource : implementedSources[0]?.id ?? "shinigami";
    activeSources = mode === "all" ? implementedSources : implementedSources.filter((item) => item.id === source);
    $$renderer2.push(`<section class="mb-6 rounded-lg border border-white/10 bg-[#111116] p-4 shadow-soft"><div class="flex flex-wrap items-start justify-between gap-3"><div><p class="text-sm font-semibold uppercase tracking-wide text-violet-300">Search</p> <h1 class="mt-1 text-3xl font-extrabold text-white">Cari komik</h1></div> <a class="focus-ring inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white" href="/sources">`);
    Sliders_horizontal($$renderer2, { size: 17 });
    $$renderer2.push(`<!----> Manage Sources</a></div> <div class="mt-4 flex flex-col gap-3 sm:flex-row"><input class="focus-ring min-h-11 flex-1 rounded-lg border border-white/10 bg-white/10 px-3 text-white placeholder:text-white/40"${attr("value", query)} placeholder="Title, author, keyword"/> `);
    $$renderer2.select(
      {
        class: "focus-ring rounded-lg border border-white/10 bg-white/10 px-3 text-white",
        value: mode
      },
      ($$renderer3) => {
        $$renderer3.option({ class: "bg-ink", value: "active" }, ($$renderer4) => {
          $$renderer4.push(`Komik dari source aktif`);
        });
        $$renderer3.option({ class: "bg-ink", value: "all" }, ($$renderer4) => {
          $$renderer4.push(`Komik dari semua source aktif`);
        });
      }
    );
    $$renderer2.push(`</div></section> <div class="grid gap-8"><!--[-->`);
    const each_array = ensure_array_like(activeSources);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let sourceMeta = each_array[$$index];
      $$renderer2.push(`<section><div class="mb-3 flex items-center justify-between"><h2 class="text-lg font-semibold text-white">${escape_html(sourceMeta.name)}</h2> `);
      if (loading[sourceMeta.id]) {
        $$renderer2.push("<!--[0-->");
        Skeleton($$renderer2, { class: "h-4 w-24", "aria-label": "Loading" });
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div> `);
      if (errors[sourceMeta.id]) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="rounded-lg border border-ember/30 bg-ember/10 p-4 text-sm text-ember">${escape_html(errors[sourceMeta.id])}</div>`);
      } else if (loading[sourceMeta.id] && !results[sourceMeta.id]?.items?.length) {
        $$renderer2.push("<!--[1-->");
        MangaGridSkeleton($$renderer2, { count: 6 });
      } else if (results[sourceMeta.id]?.items?.length) {
        $$renderer2.push("<!--[2-->");
        MangaGrid($$renderer2, { items: results[sourceMeta.id].items });
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<div class="rounded-lg border border-white/10 bg-[#111116] p-4 text-sm text-white/55">No results yet.</div>`);
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
