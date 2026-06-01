import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.BGMmPi-h.js","_app/immutable/chunks/gvdSiGwR.js","_app/immutable/chunks/B36MGmlN.js","_app/immutable/chunks/C1SaLvbz.js","_app/immutable/chunks/C4if6abv.js","_app/immutable/chunks/5FInlnOS.js","_app/immutable/chunks/Dbb_wyEj.js","_app/immutable/chunks/d63y8raQ.js","_app/immutable/chunks/0TxvcdzW.js","_app/immutable/chunks/DzMKv8zG.js","_app/immutable/chunks/DGOuW4AJ.js","_app/immutable/chunks/OA8UcISh.js","_app/immutable/chunks/a9nREn36.js","_app/immutable/chunks/Dxva6n4u.js","_app/immutable/chunks/Bfc47y5P.js","_app/immutable/chunks/C_BY9Byi.js","_app/immutable/chunks/D_9bEPSH.js","_app/immutable/chunks/Rwq-3Bx9.js","_app/immutable/chunks/9tGGYWJY.js","_app/immutable/chunks/C5M7P3Ae.js","_app/immutable/chunks/BBgsbXcj.js"];
export const stylesheets = ["_app/immutable/assets/0.Cz-HzXzX.css"];
export const fonts = [];
