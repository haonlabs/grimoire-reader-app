import { a7 as sanitize_props, af as spread_props, ad as slot, I as fallback, j as attr, n as bind_props, ah as store_get, Q as head, F as ensure_array_like, k as attr_class, G as escape_html, al as unsubscribe_stores } from "../../chunks/renderer.js";
import { p as page, n as navigating } from "../../chunks/stores.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/root.js";
import "../../chunks/state.svelte.js";
import { S as Search } from "../../chunks/search.js";
import { s as settings } from "../../chunks/settings.js";
import { H as House, S as Settings } from "../../chunks/settings2.js";
import { b as Compass, a as Clock, B as Bell, C as Circle_user } from "../../chunks/compass.js";
import { B as Bookmark } from "../../chunks/bookmark.js";
import { S as Sliders_horizontal } from "../../chunks/sliders-horizontal.js";
import { I as Icon } from "../../chunks/Icon.js";
function Crown($$renderer, $$props) {
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
        "d": "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"
      }
    ],
    ["path", { "d": "M5 21h14" }]
  ];
  Icon($$renderer, spread_props([
    { name: "crown" },
    $$sanitized_props,
    {
      /**
       * @component @name Crown
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTEuNTYyIDMuMjY2YS41LjUgMCAwIDEgLjg3NiAwTDE1LjM5IDguODdhMSAxIDAgMCAwIDEuNTE2LjI5NEwyMS4xODMgNS41YS41LjUgMCAwIDEgLjc5OC41MTlsLTIuODM0IDEwLjI0NmExIDEgMCAwIDEtLjk1Ni43MzRINS44MWExIDEgMCAwIDEtLjk1Ny0uNzM0TDIuMDIgNi4wMmEuNS41IDAgMCAxIC43OTgtLjUxOWw0LjI3NiAzLjY2NGExIDEgMCAwIDAgMS41MTYtLjI5NHoiIC8+CiAgPHBhdGggZD0iTTUgMjFoMTQiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/crown
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
function Sparkles($$renderer, $$props) {
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
        "d": "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
      }
    ],
    ["path", { "d": "M20 3v4" }],
    ["path", { "d": "M22 5h-4" }],
    ["path", { "d": "M4 17v2" }],
    ["path", { "d": "M5 18H3" }]
  ];
  Icon($$renderer, spread_props([
    { name: "sparkles" },
    $$sanitized_props,
    {
      /**
       * @component @name Sparkles
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNOS45MzcgMTUuNUEyIDIgMCAwIDAgOC41IDE0LjA2M2wtNi4xMzUtMS41ODJhLjUuNSAwIDAgMSAwLS45NjJMOC41IDkuOTM2QTIgMiAwIDAgMCA5LjkzNyA4LjVsMS41ODItNi4xMzVhLjUuNSAwIDAgMSAuOTYzIDBMMTQuMDYzIDguNUEyIDIgMCAwIDAgMTUuNSA5LjkzN2w2LjEzNSAxLjU4MWEuNS41IDAgMCAxIDAgLjk2NEwxNS41IDE0LjA2M2EyIDIgMCAwIDAtMS40MzcgMS40MzdsLTEuNTgyIDYuMTM1YS41LjUgMCAwIDEtLjk2MyAweiIgLz4KICA8cGF0aCBkPSJNMjAgM3Y0IiAvPgogIDxwYXRoIGQ9Ik0yMiA1aC00IiAvPgogIDxwYXRoIGQ9Ik00IDE3djIiIC8+CiAgPHBhdGggZD0iTTUgMThIMyIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/sparkles
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
function SearchBar($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let activeSource = fallback($$props["activeSource"], "mangadex");
    let query = "";
    $$renderer2.push(`<form class="relative flex min-w-0 flex-1 items-center">`);
    Search($$renderer2, {
      class: "pointer-events-none absolute left-3 text-white/45",
      size: 18
    });
    $$renderer2.push(`<!----> <input class="focus-ring h-11 w-full rounded-lg border border-white/10 bg-[#151518] pl-10 pr-3 text-sm text-white placeholder:text-white/40 shadow-sm"${attr("value", query)} placeholder="Cari komik"/></form>`);
    bind_props($$props, { activeSource });
  });
}
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let path, isReader, isProfile, activeSource;
    const nav = [
      { href: "/explore", label: "Home", icon: House },
      { href: "/search", label: "Explore", icon: Compass },
      { href: "/library", label: "Library", icon: Bookmark },
      { href: "/history", label: "History", icon: Clock },
      { href: "/updates", label: "Updates", icon: Bell },
      {
        href: "/sources",
        label: "All Series",
        icon: Sliders_horizontal
      },
      { href: "/settings", label: "Settings", icon: Settings }
    ];
    const mobileNav = nav.filter((item) => ["Home", "Explore", "Library", "All Series"].includes(item.label));
    path = store_get($$store_subs ??= {}, "$page", page).url.pathname;
    isReader = /^\/manga\/[^/]+\/[^/]+\/[^/]+$/.test(path);
    isProfile = path === "/profile" || path.startsWith("/profile/");
    activeSource = store_get($$store_subs ??= {}, "$settings", settings).defaultSourceId;
    head("12qhfyh", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Grimoire Reader</title>`);
      });
      $$renderer3.push(`<meta name="description" content="A stateless SvelteKit manga reader with source plugins and local-only user data."/> <link rel="manifest" href="/manifest.webmanifest"/>`);
    });
    if (store_get($$store_subs ??= {}, "$navigating", navigating)) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="fixed inset-x-0 top-0 z-50 h-1 bg-violet-500/15"><div class="h-full w-full shimmer bg-violet-500/50"></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (isReader) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<!--[-->`);
      slot($$renderer2, $$props, "default", {});
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="dark min-h-screen bg-[#050506] pb-20 text-white lg:pb-0"><header class="sticky top-0 z-10 border-b border-white/10 bg-[#050506]/95 px-4 py-3 backdrop-blur lg:px-8"><div class="mx-auto flex max-w-7xl items-center gap-3"><a class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-black" href="/explore" aria-label="Home">`);
      Sparkles($$renderer2, { size: 20 });
      $$renderer2.push(`<!----></a> <a class="hidden shrink-0 items-center gap-2 sm:flex" href="/explore" aria-label="Home"><span class="text-sm font-extrabold tracking-wide">GRIMOIRE ID</span></a> `);
      if (isProfile) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="min-w-0 flex-1"><p class="truncate text-sm font-bold text-white">Profile</p> <p class="truncate text-xs text-white/45">Menu dan source</p></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        SearchBar($$renderer2, { activeSource });
      }
      $$renderer2.push(`<!--]--> <a class="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-600 text-white" href="/settings" title="Upgrade settings">`);
      Crown($$renderer2, { size: 18 });
      $$renderer2.push(`<!----></a> <a class="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/10 text-white" href="/profile" title="Profile">`);
      Circle_user($$renderer2, { size: 21 });
      $$renderer2.push(`<!----></a></div></header> <main class="mx-auto max-w-7xl px-4 py-6 lg:px-8"><!--[-->`);
      slot($$renderer2, $$props, "default", {});
      $$renderer2.push(`<!--]--></main> <nav class="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-white/10 bg-[#101012]/95 px-1 py-2 backdrop-blur lg:hidden"><!--[-->`);
      const each_array = ensure_array_like(mobileNav);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let item = each_array[$$index];
        $$renderer2.push(`<a${attr_class(`flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium ${path.startsWith(item.href) ? "text-violet-400" : "text-white/60"}`)}${attr("href", item.href)}>`);
        if (item.icon) {
          $$renderer2.push("<!--[-->");
          item.icon($$renderer2, { size: 20 });
          $$renderer2.push("<!--]-->");
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push("<!--]-->");
        }
        $$renderer2.push(` ${escape_html(item.label)}</a>`);
      }
      $$renderer2.push(`<!--]--></nav></div>`);
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _layout as default
};
