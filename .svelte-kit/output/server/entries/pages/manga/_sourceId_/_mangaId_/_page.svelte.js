import { a7 as sanitize_props, af as spread_props, ad as slot, I as fallback, F as ensure_array_like, j as attr, G as escape_html, n as bind_props, ag as store_get, Q as head, ak as unsubscribe_stores } from "../../../../../chunks/renderer.js";
import { C as Circle_check } from "../../../../../chunks/circle-check.js";
import { I as Icon } from "../../../../../chunks/Icon.js";
import { p as proxiedImageUrl } from "../../../../../chunks/image.js";
import { l as library } from "../../../../../chunks/library.js";
import { r as readChapters } from "../../../../../chunks/history.js";
import { B as Bookmark } from "../../../../../chunks/bookmark.js";
import { B as Book_open } from "../../../../../chunks/book-open.js";
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
function Play($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.468.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [["polygon", { "points": "6 3 20 12 6 21 6 3" }]];
  Icon($$renderer, spread_props([
    { name: "play" },
    $$sanitized_props,
    {
      /**
       * @component @name Play
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cG9seWdvbiBwb2ludHM9IjYgMyAyMCAxMiA2IDIxIDYgMyIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/play
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
    sorted = [...chapters].sort((a, b) => sort === "newest" ? Number(b.number) - Number(a.number) : Number(a.number) - Number(b.number));
    $$renderer2.push(`<div class="divide-y divide-ink/10 overflow-hidden rounded-lg border border-ink/10 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/5"><!--[-->`);
    const each_array = ensure_array_like(sorted);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let chapter = each_array[$$index];
      $$renderer2.push(`<a class="flex items-center justify-between gap-3 p-3 transition hover:bg-ink/5 dark:hover:bg-white/10"${attr("href", `/manga/${sourceId}/${mangaId}/${chapter.id}`)}><div class="min-w-0"><p class="font-medium text-ink dark:text-white">Chapter ${escape_html(chapter.number || "?")}${escape_html(chapter.title ? `: ${chapter.title}` : "")}</p> <p class="mt-1 text-xs text-ink/55 dark:text-white/55">${escape_html(chapter.language.toUpperCase())} · ${escape_html(chapter.scanlator ?? "Unknown scanlator")} · ${escape_html(new Date(chapter.uploadedAt).toLocaleDateString())}</p></div> <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-white dark:bg-white dark:text-ink">`);
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
    bind_props($$props, { chapters, mangaId, sourceId, readMap, sort });
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let inLibrary, firstChapter;
    let data = $$props["data"];
    let sort = "newest";
    inLibrary = Boolean(data.manga && store_get($$store_subs ??= {}, "$library", library).some((entry) => entry.manga.id === data.manga?.id && entry.manga.sourceId === data.manga?.sourceId));
    firstChapter = [...data.chapters].sort((a, b) => a.number - b.number)[0];
    head("1gok44w", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(data.manga?.title ?? "Manga")} · Grimoire Reader</title>`);
      });
    });
    if (data.error || !data.manga) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="rounded-lg border border-ember/30 bg-ember/10 p-5 text-ember"><p class="font-semibold">Unable to load manga</p> <p class="mt-1 text-sm">${escape_html(data.error)}</p></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<section class="grid gap-6 lg:grid-cols-[18rem_1fr]"><div><div class="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft dark:border-white/10 dark:bg-white/5">`);
      if (data.manga.coverUrl) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<img class="aspect-[2/3] w-full object-cover"${attr("src", proxiedImageUrl(data.manga.coverUrl))}${attr("alt", data.manga.title)}/>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div> <div class="mt-4 grid grid-cols-2 gap-2"><button class="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-ink" type="button">`);
      if (inLibrary) {
        $$renderer2.push("<!--[0-->");
        Check($$renderer2, { size: 17 });
        $$renderer2.push(`<!----> Saved`);
      } else {
        $$renderer2.push("<!--[-1-->");
        Bookmark($$renderer2, { size: 17 });
        $$renderer2.push(`<!----> Library`);
      }
      $$renderer2.push(`<!--]--></button> `);
      if (firstChapter) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<a class="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-ink/10 bg-white px-3 py-2.5 text-sm font-semibold text-ink dark:border-white/10 dark:bg-white/10 dark:text-white"${attr("href", `/manga/${data.sourceId}/${data.mangaId}/${firstChapter.id}`)}>`);
        Book_open($$renderer2, { size: 17 });
        $$renderer2.push(`<!----> Start</a>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div></div> <div class="min-w-0"><p class="text-sm font-medium uppercase text-ember">${escape_html(data.sourceId)}</p> <h1 class="mt-1 text-3xl font-bold md:text-4xl">${escape_html(data.manga.title)}</h1> <div class="mt-3 flex flex-wrap gap-2 text-sm text-ink/60 dark:text-white/60"><span class="capitalize">${escape_html(data.manga.status)}</span> `);
      if (data.manga.author) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<span>Author: ${escape_html(data.manga.author)}</span>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (data.manga.artist) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<span>Artist: ${escape_html(data.manga.artist)}</span>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (data.manga.year) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<span>${escape_html(data.manga.year)}</span>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div> <div class="mt-4 flex flex-wrap gap-2"><!--[-->`);
      const each_array = ensure_array_like(data.manga.genres);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let genre = each_array[$$index];
        $$renderer2.push(`<span class="rounded border border-ink/10 px-2 py-1 text-xs text-ink/65 dark:border-white/10 dark:text-white/65">${escape_html(genre)}</span>`);
      }
      $$renderer2.push(`<!--]--></div> <p class="mt-5 max-w-3xl whitespace-pre-line text-sm leading-7 text-ink/70 dark:text-white/70">${escape_html(data.manga.description)}</p> <div class="mt-8 flex items-center justify-between gap-3"><div><h2 class="text-xl font-semibold">Chapters</h2> <p class="text-sm text-ink/50 dark:text-white/50">${escape_html(data.chapters.length)} chapters found</p></div> <div class="flex items-center gap-2">`);
      $$renderer2.select(
        {
          class: "focus-ring rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/10",
          value: sort
        },
        ($$renderer3) => {
          $$renderer3.option({ value: "newest" }, ($$renderer4) => {
            $$renderer4.push(`Newest`);
          });
          $$renderer3.option({ value: "oldest" }, ($$renderer4) => {
            $$renderer4.push(`Oldest`);
          });
        }
      );
      $$renderer2.push(` <button class="focus-ring rounded-lg border border-ink/10 bg-white p-2 dark:border-white/10 dark:bg-white/10" title="Refresh">`);
      Rotate_ccw($$renderer2, { size: 18 });
      $$renderer2.push(`<!----></button></div></div> <div class="mt-3">`);
      ChapterList($$renderer2, {
        chapters: data.chapters,
        mangaId: data.mangaId,
        sourceId: data.sourceId,
        readMap: store_get($$store_subs ??= {}, "$readChapters", readChapters),
        sort
      });
      $$renderer2.push(`<!----></div></div></section>`);
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, { data });
  });
}
export {
  _page as default
};
