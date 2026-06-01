import { a7 as sanitize_props, af as spread_props, ad as slot, F as ensure_array_like, j as attr, G as escape_html } from "../../../chunks/renderer.js";
import { I as Icon } from "../../../chunks/Icon.js";
function Refresh_cw($$renderer, $$props) {
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
      { "d": "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }
    ],
    ["path", { "d": "M21 3v5h-5" }],
    [
      "path",
      { "d": "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }
    ],
    ["path", { "d": "M8 16H3v5" }]
  ];
  Icon($$renderer, spread_props([
    { name: "refresh-cw" },
    $$sanitized_props,
    {
      /**
       * @component @name RefreshCw
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMyAxMmE5IDkgMCAwIDEgOS05IDkuNzUgOS43NSAwIDAgMSA2Ljc0IDIuNzRMMjEgOCIgLz4KICA8cGF0aCBkPSJNMjEgM3Y1aC01IiAvPgogIDxwYXRoIGQ9Ik0yMSAxMmE5IDkgMCAwIDEtOSA5IDkuNzUgOS43NSAwIDAgMS02Ljc0LTIuNzRMMyAxNiIgLz4KICA8cGF0aCBkPSJNOCAxNkgzdjUiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/refresh-cw
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
    let updates = [];
    $$renderer2.push(`<section class="mb-6 flex items-end justify-between gap-3 rounded-lg border border-white/10 bg-[#111116] p-4 shadow-soft"><div><p class="text-sm font-medium text-ember">Updates</p> <h1 class="mt-1 text-3xl font-bold text-white">Latest library chapters</h1></div> <button class="focus-ring inline-flex items-center gap-2 rounded-lg bg-ember px-3 py-2 text-sm font-semibold text-white" type="button">`);
    Refresh_cw($$renderer2, { class: "", size: 17 });
    $$renderer2.push(`<!----> Check</button></section> <div class="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10 bg-[#111116]">`);
    const each_array = ensure_array_like(updates);
    if (each_array.length !== 0) {
      $$renderer2.push("<!--[-->");
      for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
        let item = each_array[$$index_1];
        $$renderer2.push(`<a class="block p-4 transition hover:bg-white/10"${attr("href", `/manga/${item.manga.sourceId}/${item.manga.id}/${item.chapter.id}`)}><p class="font-semibold text-white">${escape_html(item.manga.title)}</p> <p class="mt-1 text-sm text-white/60">Chapter ${escape_html(item.chapter.number || "?")} · ${escape_html(new Date(item.chapter.uploadedAt).toLocaleString())}</p></a>`);
      }
    } else {
      $$renderer2.push("<!--[!-->");
      {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<div class="p-6 text-sm text-white/55">No updates found. Add manga to the library first.</div>`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
