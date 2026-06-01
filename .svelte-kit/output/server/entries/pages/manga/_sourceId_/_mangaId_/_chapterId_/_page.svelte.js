import { a7 as sanitize_props, af as spread_props, ad as slot, I as fallback, k as attr_class, j as attr, G as escape_html, n as bind_props, ai as stringify, ah as store_get, Q as head, F as ensure_array_like, al as unsubscribe_stores } from "../../../../../../chunks/renderer.js";
import { o as onDestroy } from "../../../../../../chunks/index-server.js";
import "@sveltejs/kit/internal";
import "../../../../../../chunks/exports.js";
import "../../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../../chunks/root.js";
import "../../../../../../chunks/state.svelte.js";
import { s as settings } from "../../../../../../chunks/settings.js";
import { p as proxiedImageUrl } from "../../../../../../chunks/image.js";
import { S as Skeleton } from "../../../../../../chunks/Skeleton.js";
import { S as SkeletonProgress } from "../../../../../../chunks/SkeletonProgress.js";
import { I as Icon } from "../../../../../../chunks/Icon.js";
import { H as House, S as Settings } from "../../../../../../chunks/settings2.js";
import { L as List, C as Chevron_right } from "../../../../../../chunks/list.js";
import { P as Play } from "../../../../../../chunks/play.js";
function Arrow_down($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.468.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    ["path", { "d": "M12 5v14" }],
    ["path", { "d": "m19 12-7 7-7-7" }]
  ];
  Icon($$renderer, spread_props([
    { name: "arrow-down" },
    $$sanitized_props,
    {
      /**
       * @component @name ArrowDown
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTIgNXYxNCIgLz4KICA8cGF0aCBkPSJtMTkgMTItNyA3LTctNyIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/arrow-down
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
function Arrow_up($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.468.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    ["path", { "d": "m5 12 7-7 7 7" }],
    ["path", { "d": "M12 19V5" }]
  ];
  Icon($$renderer, spread_props([
    { name: "arrow-up" },
    $$sanitized_props,
    {
      /**
       * @component @name ArrowUp
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtNSAxMiA3LTcgNyA3IiAvPgogIDxwYXRoIGQ9Ik0xMiAxOVY1IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/arrow-up
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
function Pause($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.468.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    [
      "rect",
      { "x": "14", "y": "4", "width": "4", "height": "16", "rx": "1" }
    ],
    [
      "rect",
      { "x": "6", "y": "4", "width": "4", "height": "16", "rx": "1" }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "pause" },
    $$sanitized_props,
    {
      /**
       * @component @name Pause
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cmVjdCB4PSIxNCIgeT0iNCIgd2lkdGg9IjQiIGhlaWdodD0iMTYiIHJ4PSIxIiAvPgogIDxyZWN0IHg9IjYiIHk9IjQiIHdpZHRoPSI0IiBoZWlnaHQ9IjE2IiByeD0iMSIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/pause
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
    let progress = fallback($$props["progress"], void 0);
    let loaded = false;
    let failed = false;
    let currentSrc = "";
    fitClass = fit === "height" ? "h-[calc(100vh-5rem)] w-auto" : fit === "screen" ? "max-h-[calc(100vh-5rem)] max-w-full object-contain" : fit === "original" ? "max-w-none" : "w-full max-w-4xl";
    if (src !== currentSrc) {
      currentSrc = src;
      loaded = false;
      failed = false;
    }
    $$renderer2.push(`<div${attr_class(`relative flex w-full items-center justify-center ${!loaded && !failed ? "min-h-[72vh]" : "min-h-0"}`)}${attr("data-reader-page", index)}>`);
    if (!loaded && !failed) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="relative my-1 h-[72vh] w-full max-w-4xl overflow-hidden rounded-sm bg-white/10">`);
      Skeleton($$renderer2, {
        class: "absolute inset-0 rounded-sm",
        "aria-label": `Loading page ${index + 1}`
      });
      $$renderer2.push(`<!----> <div class="absolute left-1/2 top-1/2 w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2">`);
      SkeletonProgress($$renderer2, { label: "Memuat halaman", value: progress });
      $$renderer2.push(`<!----></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <img${attr_class(`${stringify(fitClass)} rounded-sm transition-opacity duration-200 ${loaded ? "opacity-100" : "absolute opacity-0"}`)}${attr("src", proxiedImageUrl(src))}${attr("alt", `Page ${index + 1}`)}${attr("loading", index < 3 ? "eager" : "lazy")}/> `);
    if (failed) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="my-1 grid min-h-64 w-full max-w-4xl place-items-center rounded-sm border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">Page ${escape_html(index + 1)} gagal dimuat.</div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div>`);
    bind_props($$props, { src, index, fit, progress });
  });
}
function ReaderOverlay($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let navigationChapters, currentChapterIndex, previousChapter, nextChapter;
    let visible = fallback($$props["visible"], true);
    let mangaTitle = fallback($$props["mangaTitle"], "Reader");
    let chapterTitle = fallback($$props["chapterTitle"], "");
    let chapter = $$props["chapter"];
    let chapters = fallback($$props["chapters"], () => [], true);
    let sourceId = fallback($$props["sourceId"], "");
    let mangaId = fallback($$props["mangaId"], "");
    let settingsOpen = false;
    let chapterListOpen = false;
    let autoScroll = false;
    let autoScrollTimer;
    function stopAutoScroll() {
      autoScroll = false;
      if (autoScrollTimer) clearInterval(autoScrollTimer);
      autoScrollTimer = void 0;
    }
    onDestroy(stopAutoScroll);
    navigationChapters = [...chapters].sort((a, b) => Number(a.number) - Number(b.number));
    [...chapters].sort((a, b) => Number(b.number) - Number(a.number));
    currentChapterIndex = navigationChapters.findIndex((item) => item.id === chapter.id);
    previousChapter = currentChapterIndex > 0 ? navigationChapters[currentChapterIndex - 1] : void 0;
    nextChapter = currentChapterIndex >= 0 && currentChapterIndex < navigationChapters.length - 1 ? navigationChapters[currentChapterIndex + 1] : void 0;
    if (visible) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="pointer-events-none fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-black/90 via-black/65 to-transparent p-3 pb-16 text-white"><div class="pointer-events-auto mx-auto flex max-w-5xl items-center gap-3 rounded-lg border border-white/10 bg-black/55 p-2 shadow-soft backdrop-blur" role="presentation"><button class="focus-ring rounded-md bg-white/10 p-2 transition hover:bg-white/20" type="button" title="Back">`);
      Arrow_left($$renderer2, { size: 20 });
      $$renderer2.push(`<!----></button> <div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold">${escape_html(mangaTitle)}</p> <p class="truncate text-xs text-white/60">${escape_html(chapterTitle)}</p></div></div></div> <div class="pointer-events-none fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-2 text-white sm:flex"><button class="pointer-events-auto focus-ring rounded-md bg-black/70 p-2 shadow-soft backdrop-blur transition hover:bg-black" type="button" title="Scroll up">`);
      Arrow_up($$renderer2, { size: 20 });
      $$renderer2.push(`<!----></button> <button class="pointer-events-auto focus-ring rounded-md bg-black/70 p-2 shadow-soft backdrop-blur transition hover:bg-black" type="button" title="Scroll down">`);
      Arrow_down($$renderer2, { size: 20 });
      $$renderer2.push(`<!----></button></div> <div class="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-3 pt-16 text-white"><div class="pointer-events-auto mx-auto grid max-w-5xl gap-3 rounded-lg border border-white/10 bg-black/70 p-2 shadow-soft backdrop-blur" role="presentation"><div class="grid grid-cols-6 gap-1"><a class="focus-ring grid place-items-center rounded-md bg-white/10 p-2 transition hover:bg-white/20"${attr("href", `/manga/${sourceId}/${mangaId}`)} title="Home">`);
      House($$renderer2, { size: 20 });
      $$renderer2.push(`<!----></a> `);
      if (previousChapter) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<a class="focus-ring grid place-items-center rounded-md bg-white/10 p-2 transition hover:bg-white/20"${attr("href", `/manga/${sourceId}/${mangaId}/${previousChapter.id}`)} title="Previous chapter">`);
        Chevron_left($$renderer2, { size: 20 });
        $$renderer2.push(`<!----></a>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<button class="grid place-items-center rounded-md bg-white/5 p-2 text-white/30" type="button" title="No previous chapter" disabled="">`);
        Chevron_left($$renderer2, { size: 20 });
        $$renderer2.push(`<!----></button>`);
      }
      $$renderer2.push(`<!--]--> <button${attr_class(`focus-ring grid place-items-center rounded-md bg-white/10 p-2 transition hover:bg-white/20 ${""}`)} type="button" title="Reader settings"${attr("aria-expanded", settingsOpen)}>`);
      Settings($$renderer2, { size: 20 });
      $$renderer2.push(`<!----></button> <button${attr_class(`focus-ring grid place-items-center rounded-md bg-white/10 p-2 transition hover:bg-white/20 ${""}`)} type="button" title="Chapter list"${attr("aria-expanded", chapterListOpen)}>`);
      List($$renderer2, { size: 20 });
      $$renderer2.push(`<!----></button> `);
      if (nextChapter) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<a class="focus-ring grid place-items-center rounded-md bg-white/10 p-2 transition hover:bg-white/20"${attr("href", `/manga/${sourceId}/${mangaId}/${nextChapter.id}`)} title="Next chapter">`);
        Chevron_right($$renderer2, { size: 20 });
        $$renderer2.push(`<!----></a>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<button class="grid place-items-center rounded-md bg-white/5 p-2 text-white/30" type="button" title="No next chapter" disabled="">`);
        Chevron_right($$renderer2, { size: 20 });
        $$renderer2.push(`<!----></button>`);
      }
      $$renderer2.push(`<!--]--> <button${attr_class(`focus-ring grid place-items-center rounded-md bg-white/10 p-2 transition hover:bg-white/20 ${autoScroll ? "bg-white text-ink" : ""}`)} type="button" title="Autoscroll">`);
      if (autoScroll) {
        $$renderer2.push("<!--[0-->");
        Pause($$renderer2, { size: 20 });
      } else {
        $$renderer2.push("<!--[-1-->");
        Play($$renderer2, { size: 20 });
      }
      $$renderer2.push(`<!--]--></button></div></div></div> `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, {
      visible,
      mangaTitle,
      chapterTitle,
      chapter,
      chapters,
      sourceId,
      mangaId
    });
  });
}
function Reader($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let total, settledPages, loadingProgress, displayedLoadingProgress, fit, background, chapterTitle;
    let manga = $$props["manga"];
    let chapter = $$props["chapter"];
    let chapters = fallback($$props["chapters"], () => [], true);
    let sourceId = fallback($$props["sourceId"], () => manga.sourceId, true);
    let mangaId = fallback($$props["mangaId"], () => manga.id, true);
    let pages = fallback($$props["pages"], () => [], true);
    let overlayVisible = false;
    let loadedPages = {};
    let failedPages = {};
    let isRestoring = false;
    let restoreTimers = [];
    function savePosition() {
      if (store_get($$store_subs ??= {}, "$settings", settings).reader.incognito || !total || isRestoring || true) return;
    }
    onDestroy(() => {
      restoreTimers.forEach((timer) => window.clearTimeout(timer));
      isRestoring = false;
      savePosition();
    });
    total = pages.length;
    settledPages = Object.keys(loadedPages).length + Object.keys(failedPages).length;
    loadingProgress = total ? Math.round(settledPages / total * 100) : 0;
    displayedLoadingProgress = settledPages > 0 ? loadingProgress : void 0;
    fit = store_get($$store_subs ??= {}, "$settings", settings).reader.fit;
    background = store_get($$store_subs ??= {}, "$settings", settings).reader.background;
    chapterTitle = `Chapter ${chapter.number || "?"}${chapter.title ? `: ${chapter.title}` : ""}`;
    `${sourceId}:${mangaId}:${chapter.id}`;
    head("1bhacov", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(manga.title)} · ${escape_html(chapterTitle)}</title>`);
      });
    });
    $$renderer2.push(`<div${attr_class(`reader-clean min-h-screen ${background === "black" ? "reader-dark bg-black text-white" : background === "sepia" ? "bg-[#eadfc8] text-ink" : "bg-white text-ink"}`)}>`);
    ReaderOverlay($$renderer2, {
      visible: overlayVisible,
      mangaTitle: manga.title,
      chapterTitle,
      chapter,
      chapters,
      sourceId,
      mangaId
    });
    $$renderer2.push(`<!----> <main class="mx-auto flex max-w-5xl flex-col gap-0 px-0 py-16 sm:px-8"><div class="flex flex-col items-center gap-0" role="button" tabindex="0" aria-label="Toggle reader menu">`);
    const each_array = ensure_array_like(pages);
    if (each_array.length !== 0) {
      $$renderer2.push("<!--[-->");
      for (let index = 0, $$length = each_array.length; index < $$length; index++) {
        let src = each_array[index];
        PageImage($$renderer2, { src, index, fit, progress: displayedLoadingProgress });
      }
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<p class="mx-auto rounded-lg border border-white/10 px-4 py-3 text-sm">No pages found for this chapter.</p>`);
    }
    $$renderer2.push(`<!--]--></div></main></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, { manga, chapter, chapters, sourceId, mangaId, pages });
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let data = $$props["data"];
    if (data.manga) {
      $$renderer2.push("<!--[0-->");
      Reader($$renderer2, {
        manga: data.manga,
        chapter: data.chapter,
        chapters: data.chapters,
        sourceId: data.sourceId,
        mangaId: data.mangaId,
        pages: data.pages
      });
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
