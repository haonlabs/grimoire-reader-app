import { I as fallback, n as bind_props, F as ensure_array_like, G as escape_html, ah as store_get, Q as head, j as attr, al as unsubscribe_stores } from "../../../chunks/renderer.js";
import { S as Select } from "../../../chunks/Select.js";
import { s as settings, e as enabledSources } from "../../../chunks/settings.js";
import { C as Circle_user, b as Compass, a as Clock, B as Bell } from "../../../chunks/compass.js";
import { H as House, S as Settings } from "../../../chunks/settings2.js";
import { B as Bookmark } from "../../../chunks/bookmark.js";
import { S as Sliders_horizontal } from "../../../chunks/sliders-horizontal.js";
function SourceSelector($$renderer, $$props) {
  let sources = fallback($$props["sources"], () => [], true);
  let selected = fallback($$props["selected"], "mangadex");
  let $$settled = true;
  let $$inner_renderer;
  function $$render_inner($$renderer2) {
    $$renderer2.push(`<label class="grid gap-1 text-xs font-medium uppercase tracking-wide text-ink/55 dark:text-white/55">Source `);
    Select($$renderer2, {
      class: "border-ink/15 bg-white text-ink dark:border-white/15 dark:bg-white/10 dark:text-white",
      get value() {
        return selected;
      },
      set value($$value) {
        selected = $$value;
        $$settled = false;
      },
      children: ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array = ensure_array_like(sources);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let source = each_array[$$index];
          $$renderer3.option({ value: source.id }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(source.name)}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></label>`);
  }
  do {
    $$settled = true;
    $$inner_renderer = $$renderer.copy();
    $$render_inner($$inner_renderer);
  } while (!$$settled);
  $$renderer.subsume($$inner_renderer);
  bind_props($$props, { sources, selected });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let activeSource, addedSources, sourceName;
    let data = $$props["data"];
    const menus = [
      {
        href: "/explore",
        label: "Home",
        icon: House,
        description: "Rekomendasi dan update terbaru"
      },
      {
        href: "/search",
        label: "Explore",
        icon: Compass,
        description: "Cari judul dari source aktif atau semua source"
      },
      {
        href: "/library",
        label: "Library",
        icon: Bookmark,
        description: "Readlist dan koleksi lokal"
      },
      {
        href: "/history",
        label: "History",
        icon: Clock,
        description: "Lanjutkan chapter terakhir"
      },
      {
        href: "/updates",
        label: "Updates",
        icon: Bell,
        description: "Chapter baru dari library"
      },
      {
        href: "/sources",
        label: "All Series",
        icon: Sliders_horizontal,
        description: "Kelola semua source"
      },
      {
        href: "/settings",
        label: "Settings",
        icon: Settings,
        description: "Preferensi reader dan aplikasi"
      }
    ];
    activeSource = store_get($$store_subs ??= {}, "$settings", settings).defaultSourceId;
    addedSources = data.sources.filter((source) => source.isImplemented !== false && store_get($$store_subs ??= {}, "$enabledSources", enabledSources).includes(source.id));
    sourceName = addedSources.find((source) => source.id === activeSource)?.name ?? activeSource;
    head("maq4gq", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Profile · Grimoire Reader</title>`);
      });
    });
    $$renderer2.push(`<section class="mb-5 rounded-lg border border-white/10 bg-[#101012] p-5"><div class="flex items-center gap-3"><div class="grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-white/10 text-white">`);
    Circle_user($$renderer2, { size: 30 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-semibold uppercase tracking-wide text-violet-300">Profile</p> <h1 class="mt-1 text-2xl font-extrabold text-white">Menu</h1> <p class="mt-1 text-sm text-white/55">Library, history, source, dan settings.</p></div></div></section> <section class="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><!--[-->`);
    const each_array = ensure_array_like(menus);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let item = each_array[$$index];
      $$renderer2.push(`<a class="group flex items-center gap-3 rounded-lg border border-white/10 bg-[#101012] p-4 transition hover:border-violet-500/40 hover:bg-white/10"${attr("href", item.href)}><span class="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white/10 text-white transition group-hover:bg-violet-600">`);
      if (item.icon) {
        $$renderer2.push("<!--[-->");
        item.icon($$renderer2, { size: 21 });
        $$renderer2.push("<!--]-->");
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push("<!--]-->");
      }
      $$renderer2.push(`</span> <span class="min-w-0"><span class="block font-semibold text-white">${escape_html(item.label)}</span> <span class="mt-1 line-clamp-2 block text-sm leading-5 text-white/55">${escape_html(item.description)}</span></span></a>`);
    }
    $$renderer2.push(`<!--]--></section> <section class="rounded-lg border border-white/10 bg-[#101012] p-5"><p class="text-sm font-semibold uppercase tracking-wide text-violet-300">Default Source</p> <p class="mt-1 text-sm text-white/55">Source aktif: ${escape_html(sourceName)}</p> <div class="mt-4 max-w-md">`);
    SourceSelector($$renderer2, { sources: addedSources, selected: activeSource });
    $$renderer2.push(`<!----></div></section> <section class="mt-5 rounded-lg border border-white/10 bg-[#101012] p-4 text-sm leading-6 text-white/55">Library, history, read chapters, dan settings disimpan lokal di browser ini.</section>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, { data });
  });
}
export {
  _page as default
};
