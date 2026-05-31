import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.BagbZVBZ.js","_app/immutable/chunks/DNdXKaGq.js","_app/immutable/chunks/BCCrcGiz.js","_app/immutable/chunks/WaxftN6F.js","_app/immutable/chunks/fDi2GGLf.js","_app/immutable/chunks/6n7FHvNB.js","_app/immutable/chunks/BURTfFSw.js","_app/immutable/chunks/tOnVr7hW.js","_app/immutable/chunks/D6yBVLjv.js","_app/immutable/chunks/B5r9TLd8.js","_app/immutable/chunks/B-7VoY2k.js","_app/immutable/chunks/OA8UcISh.js","_app/immutable/chunks/gYbkUrhJ.js","_app/immutable/chunks/B4viSmMY.js","_app/immutable/chunks/Bfc47y5P.js","_app/immutable/chunks/BkAI9RA9.js","_app/immutable/chunks/DYfiIFTH.js","_app/immutable/chunks/KGy_AHJU.js","_app/immutable/chunks/Y5hGzxi6.js","_app/immutable/chunks/BVdJmfny.js"];
export const stylesheets = ["_app/immutable/assets/0.BOc1_k1j.css"];
export const fonts = [];
