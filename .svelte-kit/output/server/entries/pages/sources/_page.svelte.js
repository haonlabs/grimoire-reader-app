import { a7 as sanitize_props, af as spread_props, ad as slot, ah as store_get, al as unsubscribe_stores, n as bind_props, G as escape_html, F as ensure_array_like, j as attr } from "../../../chunks/renderer.js";
import { B as Button } from "../../../chunks/Button.js";
import { C as Card } from "../../../chunks/Card.js";
import { S as Search, I as Input } from "../../../chunks/Input.js";
import { S as Select } from "../../../chunks/Select.js";
import { s as settings, e as enabledSources } from "../../../chunks/settings.js";
import { C as Circle_check } from "../../../chunks/circle-check.js";
import { I as Icon } from "../../../chunks/Icon.js";
import { S as Star } from "../../../chunks/star.js";
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
function Star_off($$renderer, $$props) {
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
        "d": "M8.34 8.34 2 9.27l5 4.87L5.82 21 12 17.77 18.18 21l-.59-3.43"
      }
    ],
    [
      "path",
      { "d": "M18.42 12.76 22 9.27l-6.91-1L12 2l-1.44 2.91" }
    ],
    ["line", { "x1": "2", "x2": "22", "y1": "2", "y2": "22" }]
  ];
  Icon($$renderer, spread_props([
    { name: "star-off" },
    $$sanitized_props,
    {
      /**
       * @component @name StarOff
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNOC4zNCA4LjM0IDIgOS4yN2w1IDQuODdMNS44MiAyMSAxMiAxNy43NyAxOC4xOCAyMWwtLjU5LTMuNDMiIC8+CiAgPHBhdGggZD0iTTE4LjQyIDEyLjc2IDIyIDkuMjdsLTYuOTEtMUwxMiAybC0xLjQ0IDIuOTEiIC8+CiAgPGxpbmUgeDE9IjIiIHgyPSIyMiIgeTE9IjIiIHkyPSIyMiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/star-off
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
    let languages, activeSource, addedCount, availableCount, matchingSources, visible;
    let data = $$props["data"];
    let query = "";
    let language = "all";
    let rating = "all";
    let parser = "all";
    let tab = "all";
    languages = [
      "all",
      ...new Set(data.sources.map((source) => source.language))
    ];
    activeSource = store_get($$store_subs ??= {}, "$settings", settings).defaultSourceId;
    addedCount = data.sources.filter((source) => store_get($$store_subs ??= {}, "$enabledSources", enabledSources).includes(source.id)).length;
    availableCount = data.sources.length - addedCount;
    matchingSources = data.sources.filter((source) => {
      const haystack = `${source.name} ${source.id} ${source.description} ${source.language}`.toLowerCase();
      const matchesText = haystack.includes(query.trim().toLowerCase());
      const matchesLanguage = language === "all" || source.language === language;
      const matchesRating = rating === "all" || source.contentRating === rating;
      const matchesParser = parser === "all" || parser === "ready" && source.parserKind === "native" || parser === "generic" && source.parserKind === "generic" || parser === "pending" && source.isImplemented === false;
      const matchesTab = tab === "all";
      return matchesText && matchesLanguage && matchesRating && matchesParser && matchesTab;
    });
    visible = matchingSources.slice(0, 150);
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      Card($$renderer3, {
        class: "mb-5 p-4",
        children: ($$renderer4) => {
          $$renderer4.push(`<p class="text-sm font-semibold uppercase tracking-wide text-violet-300">Source Manager</p> <h1 class="mt-1 text-3xl font-extrabold text-white">Sources</h1> <p class="mt-1 text-sm text-white/55">Cari source seperti Kotatsu, add/remove dari katalog, lalu jadikan parser aktif sebagai default.</p> <div class="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-black/20 p-1">`);
          Button($$renderer4, {
            variant: "default",
            class: "border-0",
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->All ${escape_html(data.sources.length)}`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----> `);
          Button($$renderer4, {
            variant: "ghost",
            class: "border-0",
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Added ${escape_html(addedCount)}`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----> `);
          Button($$renderer4, {
            variant: "ghost",
            class: "border-0",
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Available ${escape_html(availableCount)}`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----></div> <div class="mt-4 flex flex-col gap-3 md:flex-row"><label class="relative flex-1">`);
          Search($$renderer4, {
            class: "absolute left-3 top-1/2 -translate-y-1/2 text-white/45",
            size: 17
          });
          $$renderer4.push(`<!----> `);
          Input($$renderer4, {
            class: "h-11 pl-9",
            placeholder: "Search source",
            get value() {
              return query;
            },
            set value($$value) {
              query = $$value;
              $$settled = false;
            }
          });
          $$renderer4.push(`<!----></label> `);
          Select($$renderer4, {
            class: "h-11",
            get value() {
              return language;
            },
            set value($$value) {
              language = $$value;
              $$settled = false;
            },
            children: ($$renderer5) => {
              $$renderer5.push(`<!--[-->`);
              const each_array = ensure_array_like(languages);
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let value = each_array[$$index];
                $$renderer5.option({ class: "bg-ink", value }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(value === "all" ? "All languages" : value)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----> `);
          Select($$renderer4, {
            class: "h-11",
            get value() {
              return rating;
            },
            set value($$value) {
              rating = $$value;
              $$settled = false;
            },
            children: ($$renderer5) => {
              $$renderer5.option({ class: "bg-ink", value: "all" }, ($$renderer6) => {
                $$renderer6.push(`All ratings`);
              });
              $$renderer5.push(` `);
              $$renderer5.option({ class: "bg-ink", value: "safe" }, ($$renderer6) => {
                $$renderer6.push(`Safe`);
              });
              $$renderer5.push(` `);
              $$renderer5.option({ class: "bg-ink", value: "suggestive" }, ($$renderer6) => {
                $$renderer6.push(`Suggestive`);
              });
              $$renderer5.push(` `);
              $$renderer5.option({ class: "bg-ink", value: "explicit" }, ($$renderer6) => {
                $$renderer6.push(`Explicit`);
              });
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----> `);
          Select($$renderer4, {
            class: "h-11",
            get value() {
              return parser;
            },
            set value($$value) {
              parser = $$value;
              $$settled = false;
            },
            children: ($$renderer5) => {
              $$renderer5.option({ class: "bg-ink", value: "all" }, ($$renderer6) => {
                $$renderer6.push(`All parsers`);
              });
              $$renderer5.push(` `);
              $$renderer5.option({ class: "bg-ink", value: "ready" }, ($$renderer6) => {
                $$renderer6.push(`Native`);
              });
              $$renderer5.push(` `);
              $$renderer5.option({ class: "bg-ink", value: "generic" }, ($$renderer6) => {
                $$renderer6.push(`Generic`);
              });
              $$renderer5.push(` `);
              $$renderer5.option({ class: "bg-ink", value: "pending" }, ($$renderer6) => {
                $$renderer6.push(`Catalog only`);
              });
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----></div> <p class="mt-3 text-xs text-white/45">Menampilkan ${escape_html(visible.length)} dari ${escape_html(matchingSources.length)} source cocok.</p>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">`);
      const each_array_1 = ensure_array_like(visible);
      if (each_array_1.length !== 0) {
        $$renderer3.push("<!--[-->");
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let source = each_array_1[$$index_1];
          Card($$renderer3, {
            class: "p-4",
            children: ($$renderer4) => {
              $$renderer4.push(`<div class="flex items-start justify-between gap-3"><div class="flex gap-3"><span class="grid h-11 w-11 place-items-center rounded-lg bg-white text-sm font-bold text-ink">${escape_html(source.icon)}</span> <div><h2 class="font-semibold text-white">${escape_html(source.name)}</h2> <p class="text-xs text-white/55">${escape_html(source.method)} · ${escape_html(source.language)} · ${escape_html(source.contentRating)}</p> `);
              if (activeSource === source.id) {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<span class="mt-2 inline-flex rounded-full bg-violet-500/15 px-2 py-1 text-[11px] font-semibold text-violet-200">Default</span>`);
              } else if (source.isImplemented === false) {
                $$renderer4.push("<!--[1-->");
                $$renderer4.push(`<span class="mt-2 inline-flex rounded-full bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/55">Catalog only</span>`);
              } else if (source.parserKind === "generic") {
                $$renderer4.push("<!--[2-->");
                $$renderer4.push(`<span class="mt-2 inline-flex rounded-full bg-sky-500/15 px-2 py-1 text-[11px] font-semibold text-sky-200">Generic</span>`);
              } else {
                $$renderer4.push("<!--[-1-->");
                $$renderer4.push(`<span class="mt-2 inline-flex rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-200">Native</span>`);
              }
              $$renderer4.push(`<!--]--></div></div> `);
              Button($$renderer4, {
                class: `h-auto rounded-full border-0 p-1 ${store_get($$store_subs ??= {}, "$enabledSources", enabledSources).includes(source.id) ? "text-violet-300" : "text-white/35"}`,
                variant: "ghost",
                title: store_get($$store_subs ??= {}, "$enabledSources", enabledSources).includes(source.id) ? "Remove source" : "Add source",
                children: ($$renderer5) => {
                  if (store_get($$store_subs ??= {}, "$enabledSources", enabledSources).includes(source.id)) {
                    $$renderer5.push("<!--[0-->");
                    Circle_check($$renderer5, { size: 22 });
                  } else {
                    $$renderer5.push("<!--[-1-->");
                    Circle_off($$renderer5, { size: 22 });
                  }
                  $$renderer5.push(`<!--]-->`);
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!----></div> <p class="mt-3 line-clamp-2 text-sm leading-6 text-white/65">${escape_html(source.description)}</p> `);
              if (source.baseUrl) {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<a class="mt-3 block max-w-full truncate text-sm font-medium text-violet-300"${attr("href", source.baseUrl)} target="_blank" rel="noreferrer"${attr("title", source.baseUrl)}>${escape_html(source.baseUrl)}</a>`);
              } else {
                $$renderer4.push("<!--[-1-->");
                $$renderer4.push(`<p class="mt-3 text-sm font-medium text-white/40">Domain belum terdeteksi</p>`);
              }
              $$renderer4.push(`<!--]--> <p class="mt-3 line-clamp-2 text-xs capitalize leading-5 text-white/50">Status: ${escape_html(source.health?.status ?? "unknown")}${escape_html(source.health?.message ? ` · ${source.health.message}` : "")}</p> <div class="mt-4 grid grid-cols-2 gap-2">`);
              Button($$renderer4, {
                variant: store_get($$store_subs ??= {}, "$enabledSources", enabledSources).includes(source.id) ? "secondary" : "default",
                children: ($$renderer5) => {
                  if (store_get($$store_subs ??= {}, "$enabledSources", enabledSources).includes(source.id)) {
                    $$renderer5.push("<!--[0-->");
                    Circle_off($$renderer5, { size: 16 });
                    $$renderer5.push(`<!----> Remove`);
                  } else {
                    $$renderer5.push("<!--[-1-->");
                    Circle_check($$renderer5, { size: 16 });
                    $$renderer5.push(`<!----> Add`);
                  }
                  $$renderer5.push(`<!--]-->`);
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!----> `);
              Button($$renderer4, {
                variant: activeSource === source.id ? "outline" : "secondary",
                class: activeSource === source.id ? "bg-white text-ink hover:bg-white/90" : "",
                disabled: source.isImplemented === false,
                children: ($$renderer5) => {
                  if (activeSource === source.id) {
                    $$renderer5.push("<!--[0-->");
                    Star($$renderer5, { size: 16, class: "fill-current" });
                    $$renderer5.push(`<!----> Default`);
                  } else if (source.isImplemented === false) {
                    $$renderer5.push("<!--[1-->");
                    Star_off($$renderer5, { size: 16 });
                    $$renderer5.push(`<!----> Pending`);
                  } else {
                    $$renderer5.push("<!--[-1-->");
                    Star_off($$renderer5, { size: 16 });
                    $$renderer5.push(`<!----> Set Default`);
                  }
                  $$renderer5.push(`<!--]-->`);
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!----></div>`);
            },
            $$slots: { default: true }
          });
        }
      } else {
        $$renderer3.push("<!--[!-->");
        Card($$renderer3, {
          class: "p-5 text-sm text-white/55 md:col-span-2 xl:col-span-3",
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->Tidak ada source yang cocok dengan pencarian ini.`);
          },
          $$slots: { default: true }
        });
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
    bind_props($$props, { data });
  });
}
export {
  _page as default
};
