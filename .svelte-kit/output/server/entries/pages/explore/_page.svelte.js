import { a7 as sanitize_props, af as spread_props, ad as slot, I as fallback, k as attr_class, n as bind_props, ag as store_get, ak as unsubscribe_stores, G as escape_html, F as ensure_array_like, j as attr } from "../../../chunks/renderer.js";
import { M as MangaGrid } from "../../../chunks/MangaGrid.js";
import { I as Icon } from "../../../chunks/Icon.js";
import { R as Rotate_ccw } from "../../../chunks/rotate-ccw.js";
import { s as settings } from "../../../chunks/settings.js";
function Grid_2x2($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.468.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    ["path", { "d": "M12 3v18" }],
    ["path", { "d": "M3 12h18" }],
    [
      "rect",
      { "x": "3", "y": "3", "width": "18", "height": "18", "rx": "2" }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "grid-2x2" },
    $$sanitized_props,
    {
      /**
       * @component @name Grid2x2
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTIgM3YxOCIgLz4KICA8cGF0aCBkPSJNMyAxMmgxOCIgLz4KICA8cmVjdCB4PSIzIiB5PSIzIiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIyIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/grid-2x2
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
function List($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.468.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    ["path", { "d": "M3 12h.01" }],
    ["path", { "d": "M3 18h.01" }],
    ["path", { "d": "M3 6h.01" }],
    ["path", { "d": "M8 12h13" }],
    ["path", { "d": "M8 18h13" }],
    ["path", { "d": "M8 6h13" }]
  ];
  Icon($$renderer, spread_props([
    { name: "list" },
    $$sanitized_props,
    {
      /**
       * @component @name List
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMyAxMmguMDEiIC8+CiAgPHBhdGggZD0iTTMgMThoLjAxIiAvPgogIDxwYXRoIGQ9Ik0zIDZoLjAxIiAvPgogIDxwYXRoIGQ9Ik04IDEyaDEzIiAvPgogIDxwYXRoIGQ9Ik04IDE4aDEzIiAvPgogIDxwYXRoIGQ9Ik04IDZoMTMiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/list
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
function Loader_circle($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.468.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [["path", { "d": "M21 12a9 9 0 1 1-6.219-8.56" }]];
  Icon($$renderer, spread_props([
    { name: "loader-circle" },
    $$sanitized_props,
    {
      /**
       * @component @name LoaderCircle
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjEgMTJhOSA5IDAgMSAxLTYuMjE5LTguNTYiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/loader-circle
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
function FilterPanel($$renderer, $$props) {
  let view = fallback($$props["view"], "grid");
  let sort = fallback($$props["sort"], "popular");
  let status = fallback($$props["status"], "all");
  $$renderer.push(`<div class="flex flex-wrap items-end gap-3"><label class="grid gap-1 text-xs font-medium uppercase tracking-wide text-ink/55 dark:text-white/55">Sort `);
  $$renderer.select(
    {
      class: "focus-ring rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm normal-case text-ink dark:border-white/15 dark:bg-white/10 dark:text-white",
      value: sort
    },
    ($$renderer2) => {
      $$renderer2.option({ value: "popular" }, ($$renderer3) => {
        $$renderer3.push(`Popular`);
      });
      $$renderer2.option({ value: "newest" }, ($$renderer3) => {
        $$renderer3.push(`Newest`);
      });
      $$renderer2.option({ value: "updated" }, ($$renderer3) => {
        $$renderer3.push(`Updated`);
      });
      $$renderer2.option({ value: "rating" }, ($$renderer3) => {
        $$renderer3.push(`Rating`);
      });
    }
  );
  $$renderer.push(`</label> <label class="grid gap-1 text-xs font-medium uppercase tracking-wide text-ink/55 dark:text-white/55">Status `);
  $$renderer.select(
    {
      class: "focus-ring rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm normal-case text-ink dark:border-white/15 dark:bg-white/10 dark:text-white",
      value: status
    },
    ($$renderer2) => {
      $$renderer2.option({ value: "all" }, ($$renderer3) => {
        $$renderer3.push(`All`);
      });
      $$renderer2.option({ value: "ongoing" }, ($$renderer3) => {
        $$renderer3.push(`Ongoing`);
      });
      $$renderer2.option({ value: "completed" }, ($$renderer3) => {
        $$renderer3.push(`Completed`);
      });
      $$renderer2.option({ value: "hiatus" }, ($$renderer3) => {
        $$renderer3.push(`Hiatus`);
      });
    }
  );
  $$renderer.push(`</label> <div class="flex rounded-lg border border-ink/10 bg-white p-1 dark:border-white/10 dark:bg-white/10"><button${attr_class(`focus-ring rounded-md p-2 ${view === "grid" ? "bg-ink text-white dark:bg-white dark:text-ink" : "text-ink/60 dark:text-white/60"}`)} type="button" title="Grid view">`);
  Grid_2x2($$renderer, { size: 18 });
  $$renderer.push(`<!----></button> <button${attr_class(`focus-ring rounded-md p-2 ${view === "list" ? "bg-ink text-white dark:bg-white dark:text-ink" : "text-ink/60 dark:text-white/60"}`)} type="button" title="List view">`);
  List($$renderer, { size: 18 });
  $$renderer.push(`<!----></button></div> <button class="focus-ring inline-flex h-10 items-center gap-2 rounded-lg border border-ink/10 bg-white px-3 text-sm text-ink/70 dark:border-white/10 dark:bg-white/10 dark:text-white/70" type="button">`);
  Rotate_ccw($$renderer, { size: 16 });
  $$renderer.push(`<!----> Retry</button></div>`);
  bind_props($$props, { view, sort, status });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let sourceId, sources, sourceName, visibleItems, key;
    let data = $$props["data"];
    let items = [];
    let featured = [];
    let page = 1;
    let loading = false;
    let error = "";
    let hasNextPage = false;
    let view = "grid";
    let sort = "popular";
    let status = "all";
    let lastKey = "";
    async function loadList(nextPage = page, replace = false) {
      loading = true;
      error = "";
      const filters = encodeURIComponent(JSON.stringify([{ id: "sort", value: sort }]));
      try {
        const response = await fetch(`/api/${sourceId}/list?page=${nextPage}&filters=${filters}`);
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error ?? "Source failed");
        }
        const result = await response.json();
        items = replace ? result.items : [...items, ...result.items];
        page = result.page;
        hasNextPage = result.hasNextPage;
        if (replace) featured = result.items.slice(0, 6);
      } catch (err) {
        error = err instanceof Error ? err.message : "Unable to load manga";
        if (replace) {
          items = [];
          featured = [];
        }
      } finally {
        loading = false;
      }
    }
    sourceId = store_get($$store_subs ??= {}, "$settings", settings).defaultSourceId;
    sources = data.sources ?? [];
    sourceName = sources.find((source) => source.id === sourceId)?.name ?? sourceId;
    visibleItems = status === "all" ? items : items.filter((item) => item.status === status);
    key = `${sourceId}:${sort}`;
    if (key !== lastKey) {
      lastKey = key;
      loadList(1, true);
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<section class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p class="text-sm font-medium text-ember">Explore</p> <h1 class="mt-1 text-3xl font-bold">Browse manga</h1> <p class="mt-1 text-sm text-ink/55 dark:text-white/55">Current source: ${escape_html(sourceName)}</p></div> <div class="flex flex-wrap items-end gap-3"><label class="grid gap-1 text-xs font-medium uppercase tracking-wide text-ink/55 dark:text-white/55">Source `);
      $$renderer3.select(
        {
          class: "focus-ring rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm normal-case text-ink dark:border-white/15 dark:bg-white/10 dark:text-white",
          value: sourceId
        },
        ($$renderer4) => {
          $$renderer4.push(`<!--[-->`);
          const each_array = ensure_array_like(sources);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let source = each_array[$$index];
            $$renderer4.option({ value: source.id }, ($$renderer5) => {
              $$renderer5.push(`${escape_html(source.name)}`);
            });
          }
          $$renderer4.push(`<!--]-->`);
        }
      );
      $$renderer3.push(`</label> `);
      FilterPanel($$renderer3, {
        get view() {
          return view;
        },
        set view($$value) {
          view = $$value;
          $$settled = false;
        },
        get sort() {
          return sort;
        },
        set sort($$value) {
          sort = $$value;
          $$settled = false;
        },
        get status() {
          return status;
        },
        set status($$value) {
          status = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!----></div></section> `);
      if (featured.length) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<section class="mb-8"><h2 class="mb-3 text-lg font-semibold">Featured from ${escape_html(store_get($$store_subs ??= {}, "$settings", settings).defaultSourceId)}</h2> <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"><!--[-->`);
        const each_array_1 = ensure_array_like(featured);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let manga = each_array_1[$$index_1];
          $$renderer3.push(`<a class="group relative aspect-[3/4] overflow-hidden rounded-lg bg-ink text-white"${attr("href", `/manga/${manga.sourceId}/${manga.id}`)}><img class="h-full w-full object-cover opacity-80 transition group-hover:scale-105"${attr("src", `/api/image-proxy?url=${encodeURIComponent(manga.coverUrl)}`)}${attr("alt", manga.title)}/> <span class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 text-sm font-semibold">${escape_html(manga.title)}</span></a>`);
        }
        $$renderer3.push(`<!--]--></div></section>`);
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--> `);
      if (error) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="rounded-lg border border-ember/30 bg-ember/10 p-4 text-sm text-ember">${escape_html(error)}</div>`);
      } else if (loading && !items.length) {
        $$renderer3.push("<!--[1-->");
        $$renderer3.push(`<div class="grid place-items-center py-16 text-ink/50 dark:text-white/50">`);
        Loader_circle($$renderer3, { class: "animate-spin", size: 28 });
        $$renderer3.push(`<!----></div>`);
      } else {
        $$renderer3.push("<!--[-1-->");
        if (visibleItems.length) {
          $$renderer3.push("<!--[0-->");
          MangaGrid($$renderer3, { items: visibleItems, view });
        } else {
          $$renderer3.push("<!--[-1-->");
          $$renderer3.push(`<div class="rounded-lg border border-ink/10 bg-white p-6 text-sm text-ink/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60">Tidak ada manga yang bisa ditampilkan dari ${escape_html(sourceName)}. Kalau source ini baru ditambahkan, kemungkinan parser-nya belum cocok dengan markup situs atau domainnya sedang tidak bisa diakses dari network ini.</div>`);
        }
        $$renderer3.push(`<!--]--> `);
        if (hasNextPage) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="mt-6 flex justify-center"><button class="focus-ring rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-ink" type="button"${attr("disabled", loading, true)}>${escape_html(loading ? "Loading..." : "Load more")}</button></div>`);
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]-->`);
      }
      $$renderer3.push(`<!--]-->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, { data });
  });
}
export {
  _page as default
};
