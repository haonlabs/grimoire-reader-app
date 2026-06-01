import { a7 as sanitize_props, a5 as rest_props, I as fallback, m as attributes, ai as stringify, n as bind_props } from "./renderer.js";
function Card($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, ["children"]);
  $$renderer.component(($$renderer2) => {
    let children = fallback($$props["children"], void 0);
    $$renderer2.push(`<div${attributes({
      ...$$restProps,
      class: `rounded-lg border border-white/10 bg-[#101012] text-white shadow-sm ${stringify($$sanitized_props.class ?? "")}`
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
    bind_props($$props, { children });
  });
}
export {
  Card as C
};
