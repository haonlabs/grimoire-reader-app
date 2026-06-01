export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["manifest.webmanifest"]),
	mimeTypes: {".webmanifest":"application/manifest+json"},
	_: {
		client: {start:"_app/immutable/entry/start.BiDLCucr.js",app:"_app/immutable/entry/app.DN9RhseO.js",imports:["_app/immutable/entry/start.BiDLCucr.js","_app/immutable/chunks/D4Rp157Q.js","_app/immutable/chunks/gY2Fb35a.js","_app/immutable/chunks/OA8UcISh.js","_app/immutable/chunks/CFynrFIK.js","_app/immutable/entry/app.DN9RhseO.js","_app/immutable/chunks/gY2Fb35a.js","_app/immutable/chunks/UxvOqAUq.js","_app/immutable/chunks/CyW1zFWs.js","_app/immutable/chunks/CFynrFIK.js","_app/immutable/chunks/DEa_Vt_S.js","_app/immutable/chunks/DM-b_rEO.js","_app/immutable/chunks/963staRJ.js","_app/immutable/chunks/D5Jzme50.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js')),
			__memo(() => import('./nodes/8.js')),
			__memo(() => import('./nodes/9.js')),
			__memo(() => import('./nodes/10.js')),
			__memo(() => import('./nodes/11.js')),
			__memo(() => import('./nodes/12.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/api/image-proxy",
				pattern: /^\/api\/image-proxy\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/image-proxy/_server.ts.js'))
			},
			{
				id: "/api/sources",
				pattern: /^\/api\/sources\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/sources/_server.ts.js'))
			},
			{
				id: "/api/[sourceId]/chapter/[chapterId]/pages",
				pattern: /^\/api\/([^/]+?)\/chapter\/([^/]+?)\/pages\/?$/,
				params: [{"name":"sourceId","optional":false,"rest":false,"chained":false},{"name":"chapterId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/_sourceId_/chapter/_chapterId_/pages/_server.ts.js'))
			},
			{
				id: "/api/[sourceId]/filters",
				pattern: /^\/api\/([^/]+?)\/filters\/?$/,
				params: [{"name":"sourceId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/_sourceId_/filters/_server.ts.js'))
			},
			{
				id: "/api/[sourceId]/list",
				pattern: /^\/api\/([^/]+?)\/list\/?$/,
				params: [{"name":"sourceId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/_sourceId_/list/_server.ts.js'))
			},
			{
				id: "/api/[sourceId]/manga/[mangaId]",
				pattern: /^\/api\/([^/]+?)\/manga\/([^/]+?)\/?$/,
				params: [{"name":"sourceId","optional":false,"rest":false,"chained":false},{"name":"mangaId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/_sourceId_/manga/_mangaId_/_server.ts.js'))
			},
			{
				id: "/api/[sourceId]/manga/[mangaId]/chapters",
				pattern: /^\/api\/([^/]+?)\/manga\/([^/]+?)\/chapters\/?$/,
				params: [{"name":"sourceId","optional":false,"rest":false,"chained":false},{"name":"mangaId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/_sourceId_/manga/_mangaId_/chapters/_server.ts.js'))
			},
			{
				id: "/api/[sourceId]/manga/[mangaId]/chapters/[chapterId]/pages",
				pattern: /^\/api\/([^/]+?)\/manga\/([^/]+?)\/chapters\/([^/]+?)\/pages\/?$/,
				params: [{"name":"sourceId","optional":false,"rest":false,"chained":false},{"name":"mangaId","optional":false,"rest":false,"chained":false},{"name":"chapterId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/_sourceId_/manga/_mangaId_/chapters/_chapterId_/pages/_server.ts.js'))
			},
			{
				id: "/api/[sourceId]/search",
				pattern: /^\/api\/([^/]+?)\/search\/?$/,
				params: [{"name":"sourceId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/_sourceId_/search/_server.ts.js'))
			},
			{
				id: "/explore",
				pattern: /^\/explore\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/history",
				pattern: /^\/history\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/library",
				pattern: /^\/library\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/manga/[sourceId]/[mangaId]",
				pattern: /^\/manga\/([^/]+?)\/([^/]+?)\/?$/,
				params: [{"name":"sourceId","optional":false,"rest":false,"chained":false},{"name":"mangaId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/manga/[sourceId]/[mangaId]/[chapterId]",
				pattern: /^\/manga\/([^/]+?)\/([^/]+?)\/([^/]+?)\/?$/,
				params: [{"name":"sourceId","optional":false,"rest":false,"chained":false},{"name":"mangaId","optional":false,"rest":false,"chained":false},{"name":"chapterId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/profile",
				pattern: /^\/profile\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/search",
				pattern: /^\/search\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/settings",
				pattern: /^\/settings\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/sources",
				pattern: /^\/sources\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/updates",
				pattern: /^\/updates\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 12 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
