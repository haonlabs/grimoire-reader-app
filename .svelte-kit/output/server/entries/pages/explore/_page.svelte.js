import { a7 as sanitize_props, af as spread_props, ad as slot, I as fallback, n as bind_props, ah as store_get, al as unsubscribe_stores, j as attr, G as escape_html, F as ensure_array_like } from "../../../chunks/renderer.js";
import { o as onDestroy } from "../../../chunks/index-server.js";
import { M as MangaGrid } from "../../../chunks/MangaGrid.js";
import { C as Card } from "../../../chunks/Card.js";
import { S as Skeleton } from "../../../chunks/Skeleton.js";
import { B as Button } from "../../../chunks/Button.js";
import { S as Select } from "../../../chunks/Select.js";
import { I as Icon } from "../../../chunks/Icon.js";
import { L as List, C as Chevron_right } from "../../../chunks/list.js";
import { R as Rotate_ccw } from "../../../chunks/rotate-ccw.js";
import { e as enabledSources, s as settings } from "../../../chunks/settings.js";
import { p as proxiedImageUrl } from "../../../chunks/image.js";
import { m as mangaFormatLabel } from "../../../chunks/mangaFormat.js";
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
function Megaphone($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.468.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    ["path", { "d": "m3 11 18-5v12L3 14v-3z" }],
    ["path", { "d": "M11.6 16.8a3 3 0 1 1-5.8-1.6" }]
  ];
  Icon($$renderer, spread_props([
    { name: "megaphone" },
    $$sanitized_props,
    {
      /**
       * @component @name Megaphone
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMyAxMSAxOC01djEyTDMgMTR2LTN6IiAvPgogIDxwYXRoIGQ9Ik0xMS42IDE2LjhhMyAzIDAgMSAxLTUuOC0xLjYiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/megaphone
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
  let sort = fallback($$props["sort"], "updated");
  let status = fallback($$props["status"], "all");
  let $$settled = true;
  let $$inner_renderer;
  function $$render_inner($$renderer2) {
    $$renderer2.push(`<div class="flex flex-wrap items-end gap-3"><label class="grid gap-1 text-xs font-medium uppercase tracking-wide text-white/55">Sort `);
    Select($$renderer2, {
      get value() {
        return sort;
      },
      set value($$value) {
        sort = $$value;
        $$settled = false;
      },
      children: ($$renderer3) => {
        $$renderer3.option({ class: "bg-ink", value: "updated" }, ($$renderer4) => {
          $$renderer4.push(`Latest`);
        });
        $$renderer3.push(` `);
        $$renderer3.option({ class: "bg-ink", value: "newest" }, ($$renderer4) => {
          $$renderer4.push(`Newest added`);
        });
        $$renderer3.push(` `);
        $$renderer3.option({ class: "bg-ink", value: "popular" }, ($$renderer4) => {
          $$renderer4.push(`Popular`);
        });
        $$renderer3.push(` `);
        $$renderer3.option({ class: "bg-ink", value: "rating" }, ($$renderer4) => {
          $$renderer4.push(`Rating`);
        });
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></label> <label class="grid gap-1 text-xs font-medium uppercase tracking-wide text-white/55">Status `);
    Select($$renderer2, {
      get value() {
        return status;
      },
      set value($$value) {
        status = $$value;
        $$settled = false;
      },
      children: ($$renderer3) => {
        $$renderer3.option({ class: "bg-ink", value: "all" }, ($$renderer4) => {
          $$renderer4.push(`All`);
        });
        $$renderer3.push(` `);
        $$renderer3.option({ class: "bg-ink", value: "ongoing" }, ($$renderer4) => {
          $$renderer4.push(`Ongoing`);
        });
        $$renderer3.push(` `);
        $$renderer3.option({ class: "bg-ink", value: "completed" }, ($$renderer4) => {
          $$renderer4.push(`Completed`);
        });
        $$renderer3.push(` `);
        $$renderer3.option({ class: "bg-ink", value: "hiatus" }, ($$renderer4) => {
          $$renderer4.push(`Hiatus`);
        });
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></label> <div class="flex rounded-lg border border-white/10 bg-white/10 p-1">`);
    Button($$renderer2, {
      variant: view === "grid" ? "default" : "ghost",
      size: "icon",
      class: "h-9 w-9 border-0",
      title: "Grid view",
      children: ($$renderer3) => {
        Grid_2x2($$renderer3, { size: 18 });
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Button($$renderer2, {
      variant: view === "list" ? "default" : "ghost",
      size: "icon",
      class: "h-9 w-9 border-0",
      title: "List view",
      children: ($$renderer3) => {
        List($$renderer3, { size: 18 });
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div> `);
    Button($$renderer2, {
      variant: "secondary",
      children: ($$renderer3) => {
        Rotate_ccw($$renderer3, { size: 16 });
        $$renderer3.push(`<!----> Retry`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div>`);
  }
  do {
    $$settled = true;
    $$inner_renderer = $$renderer.copy();
    $$render_inner($$inner_renderer);
  } while (!$$settled);
  $$renderer.subsume($$inner_renderer);
  bind_props($$props, { view, sort, status });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let sources, sourceId, sourceName, visibleItems, hero, recommendedMatches, recommended, updateItems;
    let data = $$props["data"];
    let items = [];
    let view = "grid";
    let sort = "updated";
    let status = "all";
    let formatTab = "Manhwa";
    let updateTab = "Project";
    onDestroy(() => {
      return;
    });
    sources = (data.sources ?? []).filter((source) => source.isImplemented !== false && store_get($$store_subs ??= {}, "$enabledSources", enabledSources).includes(source.id));
    sourceId = sources.some((source) => source.id === store_get($$store_subs ??= {}, "$settings", settings).defaultSourceId) ? store_get($$store_subs ??= {}, "$settings", settings).defaultSourceId : sources[0]?.id ?? "shinigami";
    sourceName = sources.find((source) => source.id === sourceId)?.name ?? sourceId;
    visibleItems = status === "all" ? items : items.filter((item) => item.status === status);
    hero = visibleItems[0];
    recommendedMatches = visibleItems.filter((item) => mangaFormatLabel(item).toLowerCase() === formatTab.toLowerCase());
    recommended = (recommendedMatches.length ? recommendedMatches : visibleItems).slice(0, 6);
    updateItems = visibleItems.slice(0, 24);
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<section class="mb-5 grid gap-3 lg:grid-cols-[1fr_20rem]"><a class="group relative min-h-[18rem] overflow-hidden rounded-lg border border-white/10 bg-[#141416]"${attr("href", hero ? `/manga/${hero.sourceId}/${hero.id}` : "/search")}>`);
      if (hero?.coverUrl) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<img class="absolute inset-0 h-full w-full object-cover opacity-55 transition duration-500 group-hover:scale-[1.03]"${attr("src", proxiedImageUrl(hero.coverUrl))}${attr("alt", hero.title)}/>`);
      } else {
        $$renderer3.push("<!--[-1-->");
        Skeleton($$renderer3, { class: "absolute inset-0 rounded-none" });
      }
      $$renderer3.push(`<!--]--> <div class="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/15"></div> <div class="relative flex min-h-[18rem] max-w-2xl flex-col justify-end p-5 sm:p-7"><p class="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-300">${escape_html(sourceName)}</p> <h1 class="line-clamp-2 text-3xl font-extrabold leading-tight text-white sm:text-4xl">${escape_html(hero?.title ?? "GRIMOIRE ID")}</h1> <p class="mt-3 line-clamp-3 text-sm leading-6 text-white/70">${escape_html(hero?.description ?? "Baca manhwa, manga, dan manhua dengan tampilan clean seperti Shinigami.")}</p> <div class="mt-5 inline-flex w-fit items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white">Baca `);
      Chevron_right($$renderer3, { size: 17 });
      $$renderer3.push(`<!----></div></div></a> <section class="rounded-lg border border-white/10 bg-[#141416] p-4"><div class="mb-3 flex items-center gap-2">`);
      Megaphone($$renderer3, { size: 18, class: "text-violet-300" });
      $$renderer3.push(`<!----> <h2 class="text-base font-semibold text-white">Pengumuman</h2></div> <div class="space-y-3 text-sm leading-6 text-white/65"><p>Source aktif: ${escape_html(sourceName)}</p> <p>Reading mode dibuat scrolling clean, menu muncul saat area baca di-tap.</p> <p>Library, history, dan setting tetap tersimpan lokal di browser ini.</p></div></section></section> `);
      Card($$renderer3, {
        class: "mb-5 flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between",
        children: ($$renderer4) => {
          $$renderer4.push(`<label class="grid gap-1 text-xs font-medium uppercase tracking-wide text-white/55">Source `);
          Select($$renderer4, {
            value: sourceId,
            children: ($$renderer5) => {
              $$renderer5.push(`<!--[-->`);
              const each_array = ensure_array_like(sources);
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let source = each_array[$$index];
                $$renderer5.option({ class: "bg-ink", value: source.id }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(source.name)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----></label> `);
          FilterPanel($$renderer4, {
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
          $$renderer4.push(`<!---->`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      if (recommended.length) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<section class="mb-8"><div class="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 class="text-xl font-bold text-white">Rekomendasi</h2> <div class="flex rounded-lg border border-white/10 bg-[#141416] p-1"><!--[-->`);
        const each_array_1 = ensure_array_like(["Manhwa", "Manga", "Manhua"]);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let tab = each_array_1[$$index_1];
          Button($$renderer3, {
            variant: formatTab === tab ? "default" : "ghost",
            size: "sm",
            class: "border-0",
            children: ($$renderer4) => {
              $$renderer4.push(`<!---->${escape_html(tab)}`);
            },
            $$slots: { default: true }
          });
        }
        $$renderer3.push(`<!--]--></div></div> <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"><!--[-->`);
        const each_array_2 = ensure_array_like(recommended);
        for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
          let manga = each_array_2[$$index_2];
          $$renderer3.push(`<a class="group relative aspect-[2/3] overflow-hidden rounded-lg bg-[#141416] text-white"${attr("href", `/manga/${manga.sourceId}/${manga.id}`)}>`);
          if (manga.coverUrl) {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<img class="h-full w-full object-cover transition group-hover:scale-105"${attr("src", proxiedImageUrl(manga.coverUrl))}${attr("alt", manga.title)}/>`);
          } else {
            $$renderer3.push("<!--[-1-->");
            Skeleton($$renderer3, { class: "h-full w-full rounded-none" });
          }
          $$renderer3.push(`<!--]--> <span class="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white">${escape_html(mangaFormatLabel(manga))}</span> <span class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 text-sm font-semibold">${escape_html(manga.title)}</span></a>`);
        }
        $$renderer3.push(`<!--]--></div></section>`);
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--> `);
      {
        $$renderer3.push("<!--[-1-->");
        if (updateItems.length) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<section><div class="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 class="text-xl font-bold text-white">Update</h2> <div class="flex items-center gap-2"><div class="flex rounded-lg border border-white/10 bg-[#141416] p-1"><!--[-->`);
          const each_array_4 = ensure_array_like(["Project", "Mirror"]);
          for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
            let tab = each_array_4[$$index_4];
            Button($$renderer3, {
              variant: updateTab === tab ? "default" : "ghost",
              size: "sm",
              class: "border-0",
              children: ($$renderer4) => {
                $$renderer4.push(`<!---->${escape_html(tab)}`);
              },
              $$slots: { default: true }
            });
          }
          $$renderer3.push(`<!--]--></div></div></div> `);
          MangaGrid($$renderer3, { items: updateItems, view });
          $$renderer3.push(`<!----></section>`);
        } else {
          $$renderer3.push("<!--[-1-->");
          Card($$renderer3, {
            class: "border-ink/10 bg-white p-6 text-sm text-ink/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60",
            children: ($$renderer4) => {
              $$renderer4.push(`<!---->Tidak ada manga yang bisa ditampilkan dari ${escape_html(sourceName)}. Kalau source ini baru ditambahkan, kemungkinan parser-nya belum cocok dengan markup situs atau domainnya sedang tidak bisa diakses dari network ini.`);
            },
            $$slots: { default: true }
          });
        }
        $$renderer3.push(`<!--]--> `);
        {
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
