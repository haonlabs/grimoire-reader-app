import { I as fallback, j as attr, k as attr_class, G as escape_html, F as ensure_array_like, n as bind_props } from "./renderer.js";
import { m as mangaFormatLabel } from "./mangaFormat.js";
import { p as proxiedImageUrl } from "./image.js";
import { S as Skeleton } from "./Skeleton.js";
import { B as Book_open } from "./book-open.js";
import { S as Star } from "./star.js";
function MangaCard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let format, coverUrl;
    let manga = $$props["manga"];
    let compact = fallback($$props["compact"], false);
    let coverLoaded = false;
    let coverFailed = false;
    let lastCoverUrl = "";
    format = mangaFormatLabel(manga);
    coverUrl = manga.coverUrl ?? "";
    if (coverUrl !== lastCoverUrl) {
      lastCoverUrl = coverUrl;
      coverLoaded = false;
      coverFailed = false;
    }
    $$renderer2.push(`<a class="group block overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:border-white/10 dark:bg-[#141416]"${attr("href", `/manga/${manga.sourceId}/${manga.id}`)}><div class="relative aspect-[2/3] bg-ink/10 dark:bg-white/10">`);
    if (manga.coverUrl && !coverFailed) {
      $$renderer2.push("<!--[0-->");
      if (!coverLoaded) {
        $$renderer2.push("<!--[0-->");
        Skeleton($$renderer2, { class: "absolute inset-0 rounded-none" });
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <img${attr_class(`h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] ${coverLoaded ? "opacity-100" : "opacity-0"}`)}${attr("src", proxiedImageUrl(manga.coverUrl))}${attr("alt", manga.title)} loading="lazy"/>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="flex h-full items-center justify-center text-ink/40 dark:text-white/40">`);
      Book_open($$renderer2, { size: 36 });
      $$renderer2.push(`<!----></div>`);
    }
    $$renderer2.push(`<!--]--> <span class="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-soft">${escape_html(format)}</span> <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3 text-white"><h3 class="line-clamp-2 min-h-10 text-sm font-semibold leading-5">${escape_html(manga.title)}</h3></div></div> <div class="space-y-2 p-3"><div class="flex flex-wrap items-center gap-2 text-xs text-ink/60 dark:text-white/60"><span class="truncate rounded-full bg-ink/5 px-2 py-1 capitalize dark:bg-white/10">${escape_html(manga.status)}</span> <span class="shrink-0 rounded-full bg-violet-500/15 px-2 py-1 font-semibold text-violet-200">${escape_html(format)}</span> `);
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
  $$renderer.component(($$renderer2) => {
    let items = fallback($$props["items"], () => [], true);
    let view = fallback($$props["view"], "grid");
    if (view === "grid") {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"><!--[-->`);
      const each_array = ensure_array_like(items);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let manga = each_array[$$index];
        MangaCard($$renderer2, { manga });
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="grid gap-3"><!--[-->`);
      const each_array_1 = ensure_array_like(items);
      for (let $$index_2 = 0, $$length = each_array_1.length; $$index_2 < $$length; $$index_2++) {
        let manga = each_array_1[$$index_2];
        $$renderer2.push(`<a class="group flex gap-3 overflow-hidden rounded-lg border border-ink/10 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:border-white/10 dark:bg-[#141416]"${attr("href", `/manga/${manga.sourceId}/${manga.id}`)}><div class="h-28 w-20 shrink-0 overflow-hidden rounded bg-ink/10 dark:bg-white/10">`);
        if (manga.coverUrl) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<img class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"${attr("src", proxiedImageUrl(manga.coverUrl))}${attr("alt", manga.title)} loading="lazy"/>`);
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`<div class="flex h-full items-center justify-center text-ink/40 dark:text-white/40">`);
          Book_open($$renderer2, { size: 24 });
          $$renderer2.push(`<!----></div>`);
        }
        $$renderer2.push(`<!--]--></div> <div class="min-w-0 flex-1 py-1"><h3 class="font-semibold text-ink dark:text-white">${escape_html(manga.title)}</h3> <p class="mt-1 line-clamp-2 text-sm text-ink/60 dark:text-white/60">${escape_html(manga.description)}</p> <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink/55 dark:text-white/55"><span class="rounded-full bg-violet-500/15 px-2 py-1 font-semibold text-violet-200">${escape_html(mangaFormatLabel(manga))}</span> <span class="rounded-full bg-ink/5 px-2 py-1 capitalize dark:bg-white/10">${escape_html(manga.status)}</span> `);
        if (manga.rating) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<span class="inline-flex items-center gap-1">`);
          Star($$renderer2, { size: 13, class: "fill-gold text-gold" });
          $$renderer2.push(`<!----> ${escape_html(manga.rating.toFixed(1))}</span>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--> <!--[-->`);
        const each_array_2 = ensure_array_like(manga.genres.slice(0, 2));
        for (let $$index_1 = 0, $$length2 = each_array_2.length; $$index_1 < $$length2; $$index_1++) {
          let genre = each_array_2[$$index_1];
          $$renderer2.push(`<span>${escape_html(genre)}</span>`);
        }
        $$renderer2.push(`<!--]--></div></div></a>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { items, view });
  });
}
export {
  MangaGrid as M
};
