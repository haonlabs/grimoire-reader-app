import { I as fallback, G as escape_html, j as attr, n as bind_props } from "./renderer.js";
import { o as onDestroy } from "./index-server.js";
import { C as Card } from "./Card.js";
import { S as Skeleton } from "./Skeleton.js";
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
    Card($$renderer2, {
      class: "bg-black/35 p-3 shadow-soft backdrop-blur",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="mb-2 flex items-center justify-between gap-3 text-xs"><span class="font-semibold">${escape_html(label)}</span> <span class="tabular-nums text-white/70">${escape_html(isEstimated ? "~" : "")}${escape_html(progress)}%</span></div> <div class="h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar"${attr("aria-label", label)} aria-valuemin="0" aria-valuemax="100"${attr("aria-valuenow", progress)}>`);
        Skeleton($$renderer3, {
          class: "h-full rounded-full bg-violet-500 transition-[width] duration-300",
          style: `width: ${progress}%`
        });
        $$renderer3.push(`<!----></div>`);
      },
      $$slots: { default: true }
    });
    bind_props($$props, { label, value });
  });
}
export {
  SkeletonProgress as S
};
