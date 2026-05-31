import { json } from "@sveltejs/kit";
import { g as getSource } from "./registry.js";
function parsePage(url) {
  return Math.max(1, Number(url.searchParams.get("page") ?? 1));
}
function parseFilters(url) {
  const raw = url.searchParams.get("filters");
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
async function sourceJson(handler) {
  try {
    const result = await handler();
    return json(result, {
      headers: {
        "cache-control": "public, max-age=120"
      }
    });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 500;
    const retryAfter = typeof error === "object" && error && "retryAfter" in error ? Number(error.retryAfter) : void 0;
    const errorCode = typeof error === "object" && error && "code" in error && typeof error.code === "string" ? error.code : status;
    return json(
      {
        error: error instanceof Error ? error.message : "Unknown source error",
        code: errorCode,
        retryAfter
      },
      { status, headers: retryAfter ? { "retry-after": String(retryAfter) } : void 0 }
    );
  }
}
function sourceFromParams(params) {
  return getSource(params.sourceId);
}
export {
  parsePage as a,
  sourceJson as b,
  parseFilters as p,
  sourceFromParams as s
};
