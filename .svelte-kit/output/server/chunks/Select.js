import { a7 as sanitize_props, a5 as rest_props, I as fallback, ai as stringify, n as bind_props } from "./renderer.js";
function Select($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, ["value", "disabled", "children"]);
  $$renderer.component(($$renderer2) => {
    let value = fallback($$props["value"], "");
    let disabled = fallback($$props["disabled"], false);
    let children = fallback($$props["children"], void 0);
    $$renderer2.select(
      {
        ...$$restProps,
        value,
        disabled,
        class: `focus-ring flex h-10 rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm normal-case text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${stringify($$sanitized_props.class ?? "")}`
      },
      ($$renderer3) => {
        children?.($$renderer3);
        $$renderer3.push(`<!---->`);
      },
      void 0,
      void 0,
      void 0,
      void 0,
      true
    );
    bind_props($$props, { value, disabled, children });
  });
}
export {
  Select as S
};
