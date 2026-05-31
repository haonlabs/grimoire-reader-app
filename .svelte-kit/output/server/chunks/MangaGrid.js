import { a7 as sanitize_props, af as spread_props, ad as slot, I as fallback, j as attr, G as escape_html, F as ensure_array_like, n as bind_props } from "./renderer.js";
import { p as proxiedImageUrl } from "./image.js";
import { B as Book_open } from "./book-open.js";
import { I as Icon } from "./Icon.js";
function Star($$renderer, $$props) {
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
        "d": "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"
      }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "star" },
    $$sanitized_props,
    {
      /**
       * @component @name Star
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTEuNTI1IDIuMjk1YS41My41MyAwIDAgMSAuOTUgMGwyLjMxIDQuNjc5YTIuMTIzIDIuMTIzIDAgMCAwIDEuNTk1IDEuMTZsNS4xNjYuNzU2YS41My41MyAwIDAgMSAuMjk0LjkwNGwtMy43MzYgMy42MzhhMi4xMjMgMi4xMjMgMCAwIDAtLjYxMSAxLjg3OGwuODgyIDUuMTRhLjUzLjUzIDAgMCAxLS43NzEuNTZsLTQuNjE4LTIuNDI4YTIuMTIyIDIuMTIyIDAgMCAwLTEuOTczIDBMNi4zOTYgMjEuMDFhLjUzLjUzIDAgMCAxLS43Ny0uNTZsLjg4MS01LjEzOWEyLjEyMiAyLjEyMiAwIDAgMC0uNjExLTEuODc5TDIuMTYgOS43OTVhLjUzLjUzIDAgMCAxIC4yOTQtLjkwNmw1LjE2NS0uNzU1YTIuMTIyIDIuMTIyIDAgMCAwIDEuNTk3LTEuMTZ6IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/star
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
function MangaCard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let manga = $$props["manga"];
    let compact = fallback($$props["compact"], false);
    $$renderer2.push(`<a class="group block overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:border-white/10 dark:bg-white/5"${attr("href", `/manga/${manga.sourceId}/${manga.id}`)}><div class="aspect-[2/3] bg-ink/10 dark:bg-white/10">`);
    if (manga.coverUrl) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<img class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"${attr("src", proxiedImageUrl(manga.coverUrl))}${attr("alt", manga.title)} loading="lazy"/>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="flex h-full items-center justify-center text-ink/40 dark:text-white/40">`);
      Book_open($$renderer2, { size: 36 });
      $$renderer2.push(`<!----></div>`);
    }
    $$renderer2.push(`<!--]--></div> <div class="space-y-2 p-3"><h3 class="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-ink dark:text-white">${escape_html(manga.title)}</h3> <div class="flex items-center justify-between gap-2 text-xs text-ink/60 dark:text-white/60"><span class="truncate capitalize">${escape_html(manga.status)}</span> `);
    if (manga.rating) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="inline-flex items-center gap-1">`);
      Star($$renderer2, { size: 13, class: "fill-gold text-gold" });
      $$renderer2.push(`<!----> ${escape_html(manga.rating.toFixed(1))}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    if (!compact && manga.genres.length) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="flex flex-wrap gap-1"><!--[-->`);
      const each_array = ensure_array_like(manga.genres.slice(0, 3));
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let genre = each_array[$$index];
        $$renderer2.push(`<span class="rounded border border-ink/10 px-1.5 py-0.5 text-[11px] text-ink/60 dark:border-white/10 dark:text-white/60">${escape_html(genre)}</span>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></a>`);
    bind_props($$props, { manga, compact });
  });
}
function MangaGrid($$renderer, $$props) {
  let items = fallback($$props["items"], () => [], true);
  let view = fallback($$props["view"], "grid");
  if (view === "grid") {
    $$renderer.push("<!--[0-->");
    $$renderer.push(`<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"><!--[-->`);
    const each_array = ensure_array_like(items);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let manga = each_array[$$index];
      MangaCard($$renderer, { manga });
    }
    $$renderer.push(`<!--]--></div>`);
  } else {
    $$renderer.push("<!--[-1-->");
    $$renderer.push(`<div class="divide-y divide-ink/10 overflow-hidden rounded-lg border border-ink/10 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/5"><!--[-->`);
    const each_array_1 = ensure_array_like(items);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let manga = each_array_1[$$index_1];
      $$renderer.push(`<a class="flex gap-3 p-3 transition hover:bg-ink/5 dark:hover:bg-white/10"${attr("href", `/manga/${manga.sourceId}/${manga.id}`)}>`);
      MangaCard($$renderer, { manga, compact: true });
      $$renderer.push(`<!----> <div class="min-w-0 flex-1 py-1"><h3 class="font-semibold text-ink dark:text-white">${escape_html(manga.title)}</h3> <p class="mt-1 line-clamp-2 text-sm text-ink/60 dark:text-white/60">${escape_html(manga.description)}</p></div></a>`);
    }
    $$renderer.push(`<!--]--></div>`);
  }
  $$renderer.push(`<!--]-->`);
  bind_props($$props, { items, view });
}
export {
  MangaGrid as M
};
