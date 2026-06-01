import { ag as ssr_context, I as fallback, G as escape_html, j as attr, l as attr_style, n as bind_props } from "./renderer.js";
import "clsx";
function onDestroy(fn) {
  /** @type {SSRContext} */
  ssr_context.r.on_destroy(fn);
}
function SkeletonProgress($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let progress, isEstimated;
    let label = fallback($$props["label"], "Memuat konten");
    let value = fallback($$props["value"], void 0);
    let estimate = 8;
    onDestroy(() => {
    });
    progress = Math.max(0, Math.min(100, Math.round(value ?? estimate)));
    isEstimated = value === void 0;
    $$renderer2.push(`<div class="rounded-lg border border-white/10 bg-black/35 p-3 text-white shadow-soft backdrop-blur"><div class="mb-2 flex items-center justify-between gap-3 text-xs"><span class="font-semibold">${escape_html(label)}</span> <span class="tabular-nums text-white/70">${escape_html(isEstimated ? "~" : "")}${escape_html(progress)}%</span></div> <div class="h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar"${attr("aria-label", label)} aria-valuemin="0" aria-valuemax="100"${attr("aria-valuenow", progress)}><div class="h-full rounded-full bg-violet-500 transition-[width] duration-300"${attr_style(`width: ${progress}%`)}></div></div></div>`);
    bind_props($$props, { label, value });
  });
}
export {
  SkeletonProgress as S,
  onDestroy as o
};
