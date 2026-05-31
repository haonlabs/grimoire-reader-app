import * as universal from '../entries/pages/sources/_page.ts.js';

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/sources/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/sources/+page.ts";
export const imports = ["_app/immutable/nodes/10.DejKr6y4.js","_app/immutable/chunks/DNdXKaGq.js","_app/immutable/chunks/BCCrcGiz.js","_app/immutable/chunks/WaxftN6F.js","_app/immutable/chunks/fDi2GGLf.js","_app/immutable/chunks/6n7FHvNB.js","_app/immutable/chunks/BURTfFSw.js","_app/immutable/chunks/B4viSmMY.js","_app/immutable/chunks/KGy_AHJU.js","_app/immutable/chunks/BkAI9RA9.js","_app/immutable/chunks/B_26W40f.js"];
export const stylesheets = [];
export const fonts = [];
