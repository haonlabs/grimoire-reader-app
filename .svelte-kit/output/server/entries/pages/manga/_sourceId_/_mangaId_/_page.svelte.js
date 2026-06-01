import { a7 as sanitize_props, af as spread_props, ad as slot, I as fallback, F as ensure_array_like, j as attr, G as escape_html, n as bind_props, ah as store_get, Q as head, k as attr_class, al as unsubscribe_stores } from "../../../../../chunks/renderer.js";
import { p as proxiedImageUrl } from "../../../../../chunks/image.js";
import { C as Circle_check } from "../../../../../chunks/circle-check.js";
import { P as Play } from "../../../../../chunks/play.js";
import { m as mangaFormatLabel } from "../../../../../chunks/mangaFormat.js";
import { P as Plus, l as library } from "../../../../../chunks/library.js";
import { r as readChapters } from "../../../../../chunks/history.js";
import { B as Book_open } from "../../../../../chunks/book-open.js";
import { I as Icon } from "../../../../../chunks/Icon.js";
import { B as Bookmark } from "../../../../../chunks/bookmark.js";
import { S as Star } from "../../../../../chunks/star.js";
import { R as Rotate_ccw } from "../../../../../chunks/rotate-ccw.js";
function Check($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.468.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [["path", { "d": "M20 6 9 17l-5-5" }]];
  Icon($$renderer, spread_props([
    { name: "check" },
    $$sanitized_props,
    {
      /**
       * @component @name Check
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjAgNiA5IDE3bC01LTUiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/check
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
function Eye($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.468.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    [
      "path",
      {
        "d": "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
      }
    ],
    ["circle", { "cx": "12", "cy": "12", "r": "3" }]
  ];
  Icon($$renderer, spread_props([
    { name: "eye" },
    $$sanitized_props,
    {
      /**
       * @component @name Eye
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMi4wNjIgMTIuMzQ4YTEgMSAwIDAgMSAwLS42OTYgMTAuNzUgMTAuNzUgMCAwIDEgMTkuODc2IDAgMSAxIDAgMCAxIDAgLjY5NiAxMC43NSAxMC43NSAwIDAgMS0xOS44NzYgMCIgLz4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/eye
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
function Trophy($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.468.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    ["path", { "d": "M6 9H4.5a2.5 2.5 0 0 1 0-5H6" }],
    ["path", { "d": "M18 9h1.5a2.5 2.5 0 0 0 0-5H18" }],
    ["path", { "d": "M4 22h16" }],
    [
      "path",
      {
        "d": "M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"
      }
    ],
    [
      "path",
      {
        "d": "M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"
      }
    ],
    ["path", { "d": "M18 2H6v7a6 6 0 0 0 12 0V2Z" }]
  ];
  Icon($$renderer, spread_props([
    { name: "trophy" },
    $$sanitized_props,
    {
      /**
       * @component @name Trophy
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNiA5SDQuNWEyLjUgMi41IDAgMCAxIDAtNUg2IiAvPgogIDxwYXRoIGQ9Ik0xOCA5aDEuNWEyLjUgMi41IDAgMCAwIDAtNUgxOCIgLz4KICA8cGF0aCBkPSJNNCAyMmgxNiIgLz4KICA8cGF0aCBkPSJNMTAgMTQuNjZWMTdjMCAuNTUtLjQ3Ljk4LS45NyAxLjIxQzcuODUgMTguNzUgNyAyMC4yNCA3IDIyIiAvPgogIDxwYXRoIGQ9Ik0xNCAxNC42NlYxN2MwIC41NS40Ny45OC45NyAxLjIxQzE2LjE1IDE4Ljc1IDE3IDIwLjI0IDE3IDIyIiAvPgogIDxwYXRoIGQ9Ik0xOCAySDZ2N2E2IDYgMCAwIDAgMTIgMFYyWiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/trophy
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
function ChapterList($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let sorted;
    let chapters = fallback($$props["chapters"], () => [], true);
    let mangaId = $$props["mangaId"];
    let sourceId = $$props["sourceId"];
    let readMap = fallback($$props["readMap"], () => ({}), true);
    let sort = fallback($$props["sort"], "newest");
    let coverUrl = fallback($$props["coverUrl"], "");
    function relativeDate(value) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 864e5));
      if (days === 0) return "hari ini";
      if (days === 1) return "1 hari lalu";
      if (days < 30) return `${days} hari lalu`;
      return date.toLocaleDateString("id-ID");
    }
    sorted = [...chapters].sort((a, b) => sort === "newest" ? Number(b.number) - Number(a.number) : Number(a.number) - Number(b.number));
    $$renderer2.push(`<div class="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10 bg-[#101012]"><!--[-->`);
    const each_array = ensure_array_like(sorted);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let chapter = each_array[$$index];
      $$renderer2.push(`<a class="flex items-center gap-3 p-3 transition hover:bg-white/10"${attr("href", `/manga/${sourceId}/${mangaId}/${chapter.id}`)}><div class="h-16 w-12 shrink-0 overflow-hidden rounded-md bg-white/10">`);
      if (chapter.thumbnailUrl || coverUrl) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<img class="h-full w-full object-cover"${attr("src", proxiedImageUrl(chapter.thumbnailUrl || coverUrl))} alt="" loading="lazy"/>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<div class="h-full w-full shimmer bg-white/10"></div>`);
      }
      $$renderer2.push(`<!--]--></div> <div class="min-w-0 flex-1"><p class="font-semibold text-white">Chapter ${escape_html(chapter.number || "?")}</p> `);
      if (chapter.title) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<p class="mt-0.5 line-clamp-1 text-sm text-white/70">${escape_html(chapter.title)}</p>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <p class="mt-1 text-xs text-white/55">${escape_html(chapter.language.toUpperCase())} · ${escape_html(chapter.scanlator ?? "Shinigami")} · ${escape_html(relativeDate(chapter.uploadedAt))}</p></div> <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-white">`);
      if (readMap[chapter.id] !== void 0) {
        $$renderer2.push("<!--[0-->");
        Circle_check($$renderer2, { size: 18 });
      } else {
        $$renderer2.push("<!--[-1-->");
        Play($$renderer2, { size: 17 });
      }
      $$renderer2.push(`<!--]--></div></a>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    bind_props($$props, { chapters, mangaId, sourceId, readMap, sort, coverUrl });
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let inLibrary, firstChapter, ratingLabel, description, formatLabel;
    let data = $$props["data"];
    let sort = "newest";
    let activeTab = "Chapters";
    inLibrary = Boolean(data.manga && store_get($$store_subs ??= {}, "$library", library).some((entry) => entry.manga.id === data.manga?.id && entry.manga.sourceId === data.manga?.sourceId));
    firstChapter = [...data.chapters].sort((a, b) => a.number - b.number)[0];
    ratingLabel = data.manga?.rating ? data.manga.rating.toFixed(1) : "-";
    description = data.manga?.description ?? "";
    formatLabel = data.manga ? mangaFormatLabel(data.manga) : "Manga";
    head("1gok44w", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(data.manga?.title ?? "Manga")} · Grimoire Reader</title>`);
      });
    });
    if (data.error || !data.manga) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="rounded-lg border border-red-500/30 bg-red-500/10 p-5 text-red-200"><p class="font-semibold">Unable to load manga</p> <p class="mt-1 text-sm">${escape_html(data.error)}</p></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<section class="grid gap-6 lg:grid-cols-[18rem_1fr]"><div class="mx-auto w-52 sm:w-64 lg:sticky lg:top-24 lg:w-full lg:self-start"><div class="relative overflow-hidden rounded-lg border border-white/10 bg-white/5 shadow-soft">`);
      if (data.manga.coverUrl) {
        $$renderer2.push("<!--[0-->");
        {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<div class="absolute inset-0 shimmer bg-white/10"></div>`);
        }
        $$renderer2.push(`<!--]--> <img${attr_class(`aspect-[2/3] w-full object-cover transition-opacity duration-200 ${"opacity-0"}`)}${attr("src", proxiedImageUrl(data.manga.coverUrl))}${attr("alt", data.manga.title)}/>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<div class="aspect-[2/3] shimmer bg-white/10"></div>`);
      }
      $$renderer2.push(`<!--]--> <span class="absolute left-3 top-3 rounded-full bg-black/75 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-soft">${escape_html(formatLabel)}</span></div></div> <div class="min-w-0"><p class="text-sm font-semibold uppercase tracking-wide text-violet-300">${escape_html(data.sourceId)}</p> <h1 class="mt-1 text-3xl font-extrabold leading-tight text-white md:text-4xl">${escape_html(data.manga.title)}</h1> <div class="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">`);
      if (firstChapter) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<a class="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white"${attr("href", `/manga/${data.sourceId}/${data.mangaId}/${firstChapter.id}`)}>`);
        Book_open($$renderer2, { size: 17 });
        $$renderer2.push(`<!----> Baca</a>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <button class="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#141416] px-4 py-3 text-sm font-semibold text-white" type="button">`);
      if (inLibrary) {
        $$renderer2.push("<!--[0-->");
        Check($$renderer2, { size: 17 });
        $$renderer2.push(`<!----> Bookmark`);
      } else {
        $$renderer2.push("<!--[-1-->");
        Bookmark($$renderer2, { size: 17 });
        $$renderer2.push(`<!----> Bookmark`);
      }
      $$renderer2.push(`<!--]--></button> <button class="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#141416] px-4 py-3 text-sm font-semibold text-white" type="button">`);
      Plus($$renderer2, { size: 17 });
      $$renderer2.push(`<!----> Tambah ke Readlist</button></div> <div class="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4"><div class="rounded-lg border border-white/10 bg-[#101012] p-3"><div class="flex items-center gap-2 text-gold">`);
      Star($$renderer2, { size: 17, class: "fill-gold" });
      $$renderer2.push(`<!----><span class="font-bold">${escape_html(ratingLabel)}</span></div> <p class="mt-1 text-xs text-white/45">Rating</p></div> <div class="rounded-lg border border-white/10 bg-[#101012] p-3"><div class="flex items-center gap-2 text-white">`);
      Bookmark($$renderer2, { size: 17 });
      $$renderer2.push(`<!----><span class="font-bold">${escape_html(data.chapters.length)}</span></div> <p class="mt-1 text-xs text-white/45">Chapter</p></div> <div class="rounded-lg border border-white/10 bg-[#101012] p-3"><div class="flex items-center gap-2 text-white">`);
      Eye($$renderer2, { size: 17 });
      $$renderer2.push(`<!----><span class="font-bold capitalize">${escape_html(data.manga.status)}</span></div> <p class="mt-1 text-xs text-white/45">Status</p></div> <div class="rounded-lg border border-white/10 bg-[#101012] p-3"><div class="flex items-center gap-2 text-white">`);
      Trophy($$renderer2, { size: 17 });
      $$renderer2.push(`<!----><span class="font-bold">${escape_html(data.manga.year ?? "-")}</span></div> <p class="mt-1 text-xs text-white/45">Year</p></div></div> <div class="mt-5 max-w-3xl"><p${attr_class(`whitespace-pre-line text-sm leading-7 text-white/70 ${"line-clamp-4"}`)}>${escape_html(description)}</p> `);
      if (description.length > 220) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<button class="mt-2 text-sm font-semibold text-violet-300" type="button">${escape_html("Read More")}</button>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div> <div class="mt-6 grid gap-3">`);
      if (data.manga.genres.length) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div><p class="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">Genre</p> <div class="flex flex-wrap gap-2"><!--[-->`);
        const each_array = ensure_array_like(data.manga.genres);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let genre = each_array[$$index];
          $$renderer2.push(`<span class="rounded-md border border-white/10 bg-[#141416] px-2 py-1 text-xs text-white/70">${escape_html(genre)}</span>`);
        }
        $$renderer2.push(`<!--]--></div></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <div class="grid gap-3 sm:grid-cols-2">`);
      if (data.manga.author) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div><p class="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">Author</p> <span class="rounded-md border border-white/10 bg-[#141416] px-2 py-1 text-xs text-white/70">${escape_html(data.manga.author)}</span></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (data.manga.artist) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div><p class="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">Artist</p> <span class="rounded-md border border-white/10 bg-[#141416] px-2 py-1 text-xs text-white/70">${escape_html(data.manga.artist)}</span></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <div><p class="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">Format</p> <span class="rounded-md border border-white/10 bg-[#141416] px-2 py-1 text-xs text-white/70">${escape_html(formatLabel)}</span></div> <div><p class="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">Type</p> <span class="rounded-md border border-white/10 bg-[#141416] px-2 py-1 text-xs text-white/70 capitalize">${escape_html(data.sourceId)}</span></div></div></div> <div class="mt-8"><div class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10"><div class="flex gap-1"><!--[-->`);
      const each_array_1 = ensure_array_like(["Chapters", "Info", "Novel"]);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let tab = each_array_1[$$index_1];
        $$renderer2.push(`<button${attr_class(`focus-ring px-4 py-3 text-sm font-semibold ${activeTab === tab ? "border-b-2 border-violet-500 text-white" : "text-white/50"}`)} type="button">${escape_html(tab)}</button>`);
      }
      $$renderer2.push(`<!--]--></div> `);
      {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="flex items-center gap-2 pb-3">`);
        $$renderer2.select(
          {
            class: "focus-ring rounded-lg border border-white/10 bg-[#141416] px-3 py-2 text-sm text-white",
            value: sort
          },
          ($$renderer3) => {
            $$renderer3.option({ class: "bg-ink", value: "newest" }, ($$renderer4) => {
              $$renderer4.push(`Newest`);
            });
            $$renderer3.option({ class: "bg-ink", value: "oldest" }, ($$renderer4) => {
              $$renderer4.push(`Oldest`);
            });
          }
        );
        $$renderer2.push(` <button class="focus-ring rounded-lg border border-white/10 bg-[#141416] p-2 text-white" title="Refresh">`);
        Rotate_ccw($$renderer2, { size: 18 });
        $$renderer2.push(`<!----></button></div>`);
      }
      $$renderer2.push(`<!--]--></div> `);
      {
        $$renderer2.push("<!--[0-->");
        ChapterList($$renderer2, {
          chapters: data.chapters,
          mangaId: data.mangaId,
          sourceId: data.sourceId,
          readMap: store_get($$store_subs ??= {}, "$readChapters", readChapters),
          sort,
          coverUrl: data.manga.coverUrl
        });
      }
      $$renderer2.push(`<!--]--></div></div></section>`);
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, { data });
  });
}
export {
  _page as default
};
