import { a7 as sanitize_props, af as spread_props, ad as slot, j as attr, F as ensure_array_like, G as escape_html, k as attr_class, ag as store_get, ak as unsubscribe_stores, n as bind_props } from "../../../chunks/renderer.js";
import { e as enabledSources } from "../../../chunks/settings.js";
import { S as Search } from "../../../chunks/search.js";
import { C as Circle_check } from "../../../chunks/circle-check.js";
import { I as Icon } from "../../../chunks/Icon.js";
function Circle_off($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.468.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    ["path", { "d": "m2 2 20 20" }],
    ["path", { "d": "M8.35 2.69A10 10 0 0 1 21.3 15.65" }],
    ["path", { "d": "M19.08 19.08A10 10 0 1 1 4.92 4.92" }]
  ];
  Icon($$renderer, spread_props([
    { name: "circle-off" },
    $$sanitized_props,
    {
      /**
       * @component @name CircleOff
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMiAyIDIwIDIwIiAvPgogIDxwYXRoIGQ9Ik04LjM1IDIuNjlBMTAgMTAgMCAwIDEgMjEuMyAxNS42NSIgLz4KICA8cGF0aCBkPSJNMTkuMDggMTkuMDhBMTAgMTAgMCAxIDEgNC45MiA0LjkyIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/circle-off
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
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let languages, visible;
    let data = $$props["data"];
    let query = "";
    let language = "all";
    let rating = "all";
    languages = [
      "all",
      ...new Set(data.sources.map((source) => source.language))
    ];
    visible = data.sources.filter((source) => {
      const matchesText = source.name.toLowerCase().includes(query.toLowerCase());
      const matchesLanguage = language === "all";
      const matchesRating = rating === "all";
      return matchesText && matchesLanguage && matchesRating;
    });
    $$renderer2.push(`<section class="mb-6"><p class="text-sm font-medium text-ember">Source Manager</p> <h1 class="mt-1 text-3xl font-bold">Available sources</h1> <div class="mt-4 flex flex-col gap-3 md:flex-row"><label class="relative flex-1">`);
    Search($$renderer2, {
      class: "absolute left-3 top-1/2 -translate-y-1/2 text-ink/45 dark:text-white/45",
      size: 17
    });
    $$renderer2.push(`<!----> <input class="focus-ring h-11 w-full rounded-lg border border-ink/10 bg-white pl-9 pr-3 text-sm dark:border-white/10 dark:bg-white/10"${attr("value", query)} placeholder="Search source"/></label> `);
    $$renderer2.select(
      {
        class: "focus-ring rounded-lg border border-ink/10 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/10",
        value: language
      },
      ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array = ensure_array_like(languages);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let value = each_array[$$index];
          $$renderer3.option({ value }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(value === "all" ? "All languages" : value)}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      }
    );
    $$renderer2.push(` `);
    $$renderer2.select(
      {
        class: "focus-ring rounded-lg border border-ink/10 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/10",
        value: rating
      },
      ($$renderer3) => {
        $$renderer3.option({ value: "all" }, ($$renderer4) => {
          $$renderer4.push(`All ratings`);
        });
        $$renderer3.option({ value: "safe" }, ($$renderer4) => {
          $$renderer4.push(`Safe`);
        });
        $$renderer3.option({ value: "suggestive" }, ($$renderer4) => {
          $$renderer4.push(`Suggestive`);
        });
        $$renderer3.option({ value: "explicit" }, ($$renderer4) => {
          $$renderer4.push(`Explicit`);
        });
      }
    );
    $$renderer2.push(`</div></section> <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3"><!--[-->`);
    const each_array_1 = ensure_array_like(visible);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let source = each_array_1[$$index_1];
      $$renderer2.push(`<article class="rounded-lg border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5"><div class="flex items-start justify-between gap-3"><div class="flex gap-3"><span class="grid h-11 w-11 place-items-center rounded-lg bg-ink text-sm font-bold text-white dark:bg-white dark:text-ink">${escape_html(source.icon)}</span> <div><h2 class="font-semibold">${escape_html(source.name)}</h2> <p class="text-xs text-ink/55 dark:text-white/55">${escape_html(source.method)} · ${escape_html(source.language)} · ${escape_html(source.contentRating)}</p></div></div> <button${attr_class(`focus-ring rounded-full p-1 ${store_get($$store_subs ??= {}, "$enabledSources", enabledSources).includes(source.id) ? "text-moss" : "text-ink/35 dark:text-white/35"}`)} type="button" title="Enable source">`);
      if (store_get($$store_subs ??= {}, "$enabledSources", enabledSources).includes(source.id)) {
        $$renderer2.push("<!--[0-->");
        Circle_check($$renderer2, { size: 22 });
      } else {
        $$renderer2.push("<!--[-1-->");
        Circle_off($$renderer2, { size: 22 });
      }
      $$renderer2.push(`<!--]--></button></div> <p class="mt-3 text-sm leading-6 text-ink/65 dark:text-white/65">${escape_html(source.description)}</p> <a class="mt-3 inline-block text-sm font-medium text-ember"${attr("href", source.baseUrl)} target="_blank" rel="noreferrer">${escape_html(source.baseUrl)}</a> <p class="mt-3 text-xs capitalize text-ink/50 dark:text-white/50">Status: ${escape_html(source.health?.status ?? "unknown")}${escape_html(source.health?.message ? ` · ${source.health.message}` : "")}</p></article>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, { data });
  });
}
export {
  _page as default
};
