import { a7 as sanitize_props, a5 as rest_props, I as fallback, m as attributes, ai as stringify, n as bind_props } from "./renderer.js";
function Button($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, ["type", "variant", "size", "disabled", "title", "children"]);
  $$renderer.component(($$renderer2) => {
    let variantClass, sizeClass;
    let type = fallback($$props["type"], "button");
    let variant = fallback($$props["variant"], "default");
    let size = fallback($$props["size"], "default");
    let disabled = fallback($$props["disabled"], false);
    let title = fallback($$props["title"], void 0);
    let children = fallback($$props["children"], void 0);
    variantClass = variant === "secondary" ? "border-white/10 bg-white/10 text-white hover:bg-white/15" : variant === "outline" ? "border-white/10 bg-transparent text-white hover:bg-white/10" : variant === "ghost" ? "border-transparent bg-transparent text-white/70 hover:bg-white/10 hover:text-white" : variant === "destructive" ? "border-ember/30 bg-transparent text-ember hover:bg-ember/10" : "border-ember bg-ember text-white hover:bg-ember/90";
    sizeClass = size === "sm" ? "h-9 px-3 text-sm" : size === "icon" ? "h-10 w-10 p-0" : "h-10 px-4 text-sm";
    $$renderer2.push(`<button${attributes({
      ...$$restProps,
      type,
      disabled,
      title,
      class: `focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-md border font-semibold transition disabled:pointer-events-none disabled:opacity-45 ${stringify(variantClass)} ${stringify(sizeClass)} ${stringify($$sanitized_props.class ?? "")}`
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></button>`);
    bind_props($$props, { type, variant, size, disabled, title, children });
  });
}
export {
  Button as B
};
