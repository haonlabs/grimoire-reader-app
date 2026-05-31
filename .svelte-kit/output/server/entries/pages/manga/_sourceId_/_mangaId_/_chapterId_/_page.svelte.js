import { a7 as sanitize_props, af as spread_props, ad as slot, I as fallback, k as attr_class, j as attr, n as bind_props, ah as stringify, G as escape_html, ag as store_get, ak as unsubscribe_stores, Q as head, F as ensure_array_like } from "../../../../../../chunks/renderer.js";
import { r as readChapters, h as history } from "../../../../../../chunks/history.js";
import { s as settings } from "../../../../../../chunks/settings.js";
import { p as proxiedImageUrl } from "../../../../../../chunks/image.js";
import { I as Icon } from "../../../../../../chunks/Icon.js";
import { S as Settings } from "../../../../../../chunks/settings2.js";
function Arrow_left($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.468.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    ["path", { "d": "m12 19-7-7 7-7" }],
    ["path", { "d": "M19 12H5" }]
  ];
  Icon($$renderer, spread_props([
    { name: "arrow-left" },
    $$sanitized_props,
    {
      /**
       * @component @name ArrowLeft
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMTIgMTktNy03IDctNyIgLz4KICA8cGF0aCBkPSJNMTkgMTJINSIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/arrow-left
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
function Chevron_left($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.468.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [["path", { "d": "m15 18-6-6 6-6" }]];
  Icon($$renderer, spread_props([
    { name: "chevron-left" },
    $$sanitized_props,
    {
      /**
       * @component @name ChevronLeft
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMTUgMTgtNi02IDYtNiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/chevron-left
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
function Chevron_right($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.468.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [["path", { "d": "m9 18 6-6-6-6" }]];
  Icon($$renderer, spread_props([
    { name: "chevron-right" },
    $$sanitized_props,
    {
      /**
       * @component @name ChevronRight
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtOSAxOCA2LTYtNi02IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/chevron-right
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
function PageImage($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let fitClass;
    let src = $$props["src"];
    let index = $$props["index"];
    let fit = fallback($$props["fit"], "width");
    fitClass = fit === "height" ? "h-[calc(100vh-5rem)] w-auto" : fit === "screen" ? "max-h-[calc(100vh-5rem)] max-w-full object-contain" : fit === "original" ? "max-w-none" : "w-full max-w-4xl";
    $$renderer2.push(`<div class="flex min-h-64 w-full items-center justify-center"><img${attr_class(`${stringify(fitClass)} rounded-sm`)}${attr("src", proxiedImageUrl(src))}${attr("alt", `Page ${index + 1}`)}${attr("loading", index < 3 ? "eager" : "lazy")}/></div>`);
    bind_props($$props, { src, index, fit });
  });
}
function ProgressBar($$renderer, $$props) {
  let page = fallback($$props["page"], 0);
  let total = fallback($$props["total"], 0);
  $$renderer.push(`<div class="flex items-center gap-3"><input class="h-1 flex-1 accent-ember" type="range" min="0"${attr("max", Math.max(0, total - 1))}${attr("value", page)} aria-label="Page progress"/> <span class="w-16 text-right text-xs text-white/80">${escape_html(Math.min(page + 1, total))}/${escape_html(total)}</span></div>`);
  bind_props($$props, { page, total });
}
function ReaderOverlay($$renderer, $$props) {
  let visible = fallback($$props["visible"], true);
  let mangaTitle = fallback($$props["mangaTitle"], "Reader");
  let chapterTitle = fallback($$props["chapterTitle"], "");
  let page = fallback($$props["page"], 0);
  let total = fallback($$props["total"], 0);
  let previous = fallback($$props["previous"], () => {
  });
  let next = fallback($$props["next"], () => {
  });
  let $$settled = true;
  let $$inner_renderer;
  function $$render_inner($$renderer2) {
    if (visible) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="pointer-events-none fixed inset-x-0 top-0 z-30 bg-gradient-to-b from-black/80 to-transparent p-3 text-white"><div class="pointer-events-auto flex items-center gap-3"><button class="focus-ring rounded-full bg-white/10 p-2 backdrop-blur" type="button" title="Back">`);
      Arrow_left($$renderer2, { size: 20 });
      $$renderer2.push(`<!----></button> <div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold">${escape_html(mangaTitle)}</p> <p class="truncate text-xs text-white/65">${escape_html(chapterTitle)}</p></div> <button class="focus-ring rounded-full bg-white/10 p-2 backdrop-blur" type="button" title="Reader settings">`);
      Settings($$renderer2, { size: 20 });
      $$renderer2.push(`<!----></button></div></div> <div class="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/85 to-transparent p-3 text-white"><div class="pointer-events-auto mx-auto grid max-w-4xl grid-cols-[auto_1fr_auto] items-center gap-3"><button class="focus-ring rounded-full bg-white/10 p-2 backdrop-blur" type="button" title="Previous page">`);
      Chevron_left($$renderer2, { size: 20 });
      $$renderer2.push(`<!----></button> `);
      ProgressBar($$renderer2, {
        total,
        get page() {
          return page;
        },
        set page($$value) {
          page = $$value;
          $$settled = false;
        }
      });
      $$renderer2.push(`<!----> <button class="focus-ring rounded-full bg-white/10 p-2 backdrop-blur" type="button" title="Next page">`);
      Chevron_right($$renderer2, { size: 20 });
      $$renderer2.push(`<!----></button></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
  }
  do {
    $$settled = true;
    $$inner_renderer = $$renderer.copy();
    $$render_inner($$inner_renderer);
  } while (!$$settled);
  $$renderer.subsume($$inner_renderer);
  bind_props($$props, {
    visible,
    mangaTitle,
    chapterTitle,
    page,
    total,
    previous,
    next
  });
}
function Reader($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let total, mode, fit, background, chapterTitle;
    let manga = $$props["manga"];
    let chapter = $$props["chapter"];
    let pages = fallback($$props["pages"], () => [], true);
    let page = 0;
    let overlayVisible = true;
    let hideTimer;
    function bumpOverlay() {
      overlayVisible = true;
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => overlayVisible = false, 3e3);
    }
    function nextPage() {
      page = Math.min(total - 1, page + 1);
      bumpOverlay();
    }
    function prevPage() {
      page = Math.max(0, page - 1);
      bumpOverlay();
    }
    total = pages.length;
    mode = store_get($$store_subs ??= {}, "$settings", settings).reader.mode;
    fit = store_get($$store_subs ??= {}, "$settings", settings).reader.fit;
    background = store_get($$store_subs ??= {}, "$settings", settings).reader.background;
    chapterTitle = `Chapter ${chapter.number || "?"}${chapter.title ? `: ${chapter.title}` : ""}`;
    if (!store_get($$store_subs ??= {}, "$settings", settings).reader.incognito && total) {
      readChapters.update((items) => ({ ...items, [chapter.id]: page }));
      history.update((items) => {
        const next = items.filter((item) => item.chapter.id !== chapter.id);
        return [
          {
            manga,
            chapter,
            lastPage: page,
            totalPages: total,
            lastReadAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          ...next
        ].slice(0, 200);
      });
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("1bhacov", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>${escape_html(manga.title)} · ${escape_html(chapterTitle)}</title>`);
        });
      });
      $$renderer3.push(`<div${attr_class(`min-h-screen ${background === "black" ? "bg-black text-white" : background === "sepia" ? "bg-[#eadfc8] text-ink" : "bg-white text-ink"}`)}>`);
      ReaderOverlay($$renderer3, {
        visible: overlayVisible,
        mangaTitle: manga.title,
        chapterTitle,
        total,
        previous: prevPage,
        next: nextPage,
        get page() {
          return page;
        },
        set page($$value) {
          page = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!----> `);
      if (mode === "vertical") {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<main class="mx-auto flex max-w-5xl flex-col gap-2 px-0 py-20 sm:px-8"><!--[-->`);
        const each_array = ensure_array_like(pages);
        for (let index = 0, $$length = each_array.length; index < $$length; index++) {
          let src = each_array[index];
          PageImage($$renderer3, { src, index, fit });
        }
        $$renderer3.push(`<!--]--></main>`);
      } else {
        $$renderer3.push("<!--[-1-->");
        $$renderer3.push(`<main class="grid min-h-screen place-items-center px-0 py-20 sm:px-8">`);
        if (pages[page]) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<button class="fixed inset-y-0 left-0 w-1/3 cursor-w-resize" type="button" aria-label="Previous page"></button> `);
          PageImage($$renderer3, { src: pages[page], index: page, fit });
          $$renderer3.push(`<!----> <button class="fixed inset-y-0 right-0 w-1/3 cursor-e-resize" type="button" aria-label="Next page"></button>`);
        } else {
          $$renderer3.push("<!--[-1-->");
          $$renderer3.push(`<p class="rounded-lg border border-white/10 px-4 py-3 text-sm">No pages found for this chapter.</p>`);
        }
        $$renderer3.push(`<!--]--></main>`);
      }
      $$renderer3.push(`<!--]--></div>`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, { manga, chapter, pages });
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let data = $$props["data"];
    if (data.manga) {
      $$renderer2.push("<!--[0-->");
      Reader($$renderer2, { manga: data.manga, chapter: data.chapter, pages: data.pages });
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="grid min-h-screen place-items-center bg-ink p-6 text-white"><div class="max-w-md rounded-lg border border-white/10 bg-white/10 p-5"><p class="font-semibold">Reader failed to load</p> <p class="mt-1 text-sm text-white/70">${escape_html(data.error)}</p></div></div>`);
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { data });
  });
}
export {
  _page as default
};
