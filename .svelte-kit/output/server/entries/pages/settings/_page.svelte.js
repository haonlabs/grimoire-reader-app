import { a7 as sanitize_props, af as spread_props, ad as slot, ag as store_get, j as attr, G as escape_html, ak as unsubscribe_stores } from "../../../chunks/renderer.js";
import { s as settings } from "../../../chunks/settings.js";
import { T as Trash_2 } from "../../../chunks/trash-2.js";
import { I as Icon } from "../../../chunks/Icon.js";
function Download($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.468.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    ["path", { "d": "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
    ["polyline", { "points": "7 10 12 15 17 10" }],
    ["line", { "x1": "12", "x2": "12", "y1": "15", "y2": "3" }]
  ];
  Icon($$renderer, spread_props([
    { name: "download" },
    $$sanitized_props,
    {
      /**
       * @component @name Download
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjEgMTV2NGEyIDIgMCAwIDEtMiAySDVhMiAyIDAgMCAxLTItMnYtNCIgLz4KICA8cG9seWxpbmUgcG9pbnRzPSI3IDEwIDEyIDE1IDE3IDEwIiAvPgogIDxsaW5lIHgxPSIxMiIgeDI9IjEyIiB5MT0iMTUiIHkyPSIzIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/download
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
function Upload($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.468.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    ["path", { "d": "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
    ["polyline", { "points": "17 8 12 3 7 8" }],
    ["line", { "x1": "12", "x2": "12", "y1": "3", "y2": "15" }]
  ];
  Icon($$renderer, spread_props([
    { name: "upload" },
    $$sanitized_props,
    {
      /**
       * @component @name Upload
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjEgMTV2NGEyIDIgMCAwIDEtMiAySDVhMiAyIDAgMCAxLTItMnYtNCIgLz4KICA8cG9seWxpbmUgcG9pbnRzPSIxNyA4IDEyIDMgNyA4IiAvPgogIDxsaW5lIHgxPSIxMiIgeDI9IjEyIiB5MT0iMyIgeTI9IjE1IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/upload
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
    let importText = "";
    $$renderer2.push(`<section class="mb-6"><p class="text-sm font-medium text-ember">Settings</p> <h1 class="mt-1 text-3xl font-bold">Reader and app preferences</h1></section> <div class="grid gap-6 xl:grid-cols-2"><section class="rounded-lg border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-white/5"><h2 class="text-lg font-semibold">Reader</h2> <div class="mt-4 grid gap-4 sm:grid-cols-2"><label class="grid gap-1 text-sm">Mode `);
    $$renderer2.select(
      {
        class: "focus-ring rounded-lg border border-ink/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/10",
        value: store_get($$store_subs ??= {}, "$settings", settings).reader.mode
      },
      ($$renderer3) => {
        $$renderer3.option({ value: "rtl" }, ($$renderer4) => {
          $$renderer4.push(`Horizontal RTL`);
        });
        $$renderer3.option({ value: "ltr" }, ($$renderer4) => {
          $$renderer4.push(`Horizontal LTR`);
        });
        $$renderer3.option({ value: "vertical" }, ($$renderer4) => {
          $$renderer4.push(`Vertical Scroll`);
        });
        $$renderer3.option({ value: "single" }, ($$renderer4) => {
          $$renderer4.push(`Single Page`);
        });
        $$renderer3.option({ value: "double" }, ($$renderer4) => {
          $$renderer4.push(`Double Page`);
        });
      }
    );
    $$renderer2.push(`</label> <label class="grid gap-1 text-sm">Fit `);
    $$renderer2.select(
      {
        class: "focus-ring rounded-lg border border-ink/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/10",
        value: store_get($$store_subs ??= {}, "$settings", settings).reader.fit
      },
      ($$renderer3) => {
        $$renderer3.option({ value: "width" }, ($$renderer4) => {
          $$renderer4.push(`Fit Width`);
        });
        $$renderer3.option({ value: "height" }, ($$renderer4) => {
          $$renderer4.push(`Fit Height`);
        });
        $$renderer3.option({ value: "screen" }, ($$renderer4) => {
          $$renderer4.push(`Fit Screen`);
        });
        $$renderer3.option({ value: "original" }, ($$renderer4) => {
          $$renderer4.push(`Original Size`);
        });
      }
    );
    $$renderer2.push(`</label> <label class="grid gap-1 text-sm">Background `);
    $$renderer2.select(
      {
        class: "focus-ring rounded-lg border border-ink/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/10",
        value: store_get($$store_subs ??= {}, "$settings", settings).reader.background
      },
      ($$renderer3) => {
        $$renderer3.option({ value: "black" }, ($$renderer4) => {
          $$renderer4.push(`Black`);
        });
        $$renderer3.option({ value: "white" }, ($$renderer4) => {
          $$renderer4.push(`White`);
        });
        $$renderer3.option({ value: "sepia" }, ($$renderer4) => {
          $$renderer4.push(`Sepia`);
        });
      }
    );
    $$renderer2.push(`</label> <label class="grid gap-1 text-sm">Preload pages <input class="focus-ring rounded-lg border border-ink/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/10" type="number" min="1" max="10"${attr("value", store_get($$store_subs ??= {}, "$settings", settings).reader.preloadPages)}/></label> <label class="flex items-center gap-2 text-sm"><input type="checkbox"${attr("checked", store_get($$store_subs ??= {}, "$settings", settings).reader.showPageNumber, true)}/> Show page number overlay</label> <label class="flex items-center gap-2 text-sm"><input type="checkbox"${attr("checked", store_get($$store_subs ??= {}, "$settings", settings).reader.incognito, true)}/> Incognito reading</label></div></section> <section class="rounded-lg border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-white/5"><h2 class="text-lg font-semibold">Application</h2> <div class="mt-4 grid gap-4 sm:grid-cols-2"><label class="grid gap-1 text-sm">Theme `);
    $$renderer2.select(
      {
        class: "focus-ring rounded-lg border border-ink/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/10",
        value: store_get($$store_subs ??= {}, "$settings", settings).theme
      },
      ($$renderer3) => {
        $$renderer3.option({ value: "system" }, ($$renderer4) => {
          $$renderer4.push(`System`);
        });
        $$renderer3.option({ value: "light" }, ($$renderer4) => {
          $$renderer4.push(`Light`);
        });
        $$renderer3.option({ value: "dark" }, ($$renderer4) => {
          $$renderer4.push(`Dark`);
        });
      }
    );
    $$renderer2.push(`</label> <label class="grid gap-1 text-sm">UI Language `);
    $$renderer2.select(
      {
        class: "focus-ring rounded-lg border border-ink/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/10",
        value: store_get($$store_subs ??= {}, "$settings", settings).uiLanguage
      },
      ($$renderer3) => {
        $$renderer3.option({ value: "en" }, ($$renderer4) => {
          $$renderer4.push(`English`);
        });
        $$renderer3.option({ value: "id" }, ($$renderer4) => {
          $$renderer4.push(`Indonesia`);
        });
      }
    );
    $$renderer2.push(`</label> <label class="grid gap-1 text-sm">Default content rating `);
    $$renderer2.select(
      {
        class: "focus-ring rounded-lg border border-ink/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/10",
        value: store_get($$store_subs ??= {}, "$settings", settings).defaultContentRating
      },
      ($$renderer3) => {
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
    $$renderer2.push(`</label> <button class="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-ember/30 px-3 py-2 text-sm text-ember" type="button">`);
    Trash_2($$renderer2, { size: 16 });
    $$renderer2.push(`<!----> Clear history</button></div> <div class="mt-5 grid gap-3"><button class="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white dark:bg-white dark:text-ink" type="button">`);
    Download($$renderer2, { size: 16 });
    $$renderer2.push(`<!----> Export library JSON</button> <textarea class="focus-ring min-h-28 rounded-lg border border-ink/10 bg-white p-3 text-sm dark:border-white/10 dark:bg-white/10" placeholder="Paste library backup JSON">`);
    const $$body = escape_html(importText);
    if ($$body) {
      $$renderer2.push(`${$$body}`);
    }
    $$renderer2.push(`</textarea> <button class="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-ink/10 px-3 py-2 text-sm dark:border-white/10" type="button">`);
    Upload($$renderer2, { size: 16 });
    $$renderer2.push(`<!----> Import library</button></div></section></div> <section class="mt-6 rounded-lg border border-ink/10 bg-white p-5 text-sm leading-6 text-ink/65 dark:border-white/10 dark:bg-white/5 dark:text-white/65"><h2 class="text-lg font-semibold text-ink dark:text-white">About</h2> <p class="mt-2">Grimoire Reader does not host manga content, create user accounts, or persist user data on a server.
    Source requests are relayed for browsing and reading, while library, history, and settings stay in
    this browser through localStorage. Users are responsible for following the laws and terms that apply
    in their jurisdiction and to each source.</p></section>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
