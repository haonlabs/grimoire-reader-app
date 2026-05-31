
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/image-proxy" | "/api/sources" | "/api/[sourceId]" | "/api/[sourceId]/chapter" | "/api/[sourceId]/chapter/[chapterId]" | "/api/[sourceId]/chapter/[chapterId]/pages" | "/api/[sourceId]/filters" | "/api/[sourceId]/list" | "/api/[sourceId]/manga" | "/api/[sourceId]/manga/[mangaId]" | "/api/[sourceId]/manga/[mangaId]/chapters" | "/api/[sourceId]/manga/[mangaId]/chapters/[chapterId]" | "/api/[sourceId]/manga/[mangaId]/chapters/[chapterId]/pages" | "/api/[sourceId]/search" | "/explore" | "/history" | "/library" | "/manga" | "/manga/[sourceId]" | "/manga/[sourceId]/[mangaId]" | "/manga/[sourceId]/[mangaId]/[chapterId]" | "/search" | "/settings" | "/sources" | "/updates";
		RouteParams(): {
			"/api/[sourceId]": { sourceId: string };
			"/api/[sourceId]/chapter": { sourceId: string };
			"/api/[sourceId]/chapter/[chapterId]": { sourceId: string; chapterId: string };
			"/api/[sourceId]/chapter/[chapterId]/pages": { sourceId: string; chapterId: string };
			"/api/[sourceId]/filters": { sourceId: string };
			"/api/[sourceId]/list": { sourceId: string };
			"/api/[sourceId]/manga": { sourceId: string };
			"/api/[sourceId]/manga/[mangaId]": { sourceId: string; mangaId: string };
			"/api/[sourceId]/manga/[mangaId]/chapters": { sourceId: string; mangaId: string };
			"/api/[sourceId]/manga/[mangaId]/chapters/[chapterId]": { sourceId: string; mangaId: string; chapterId: string };
			"/api/[sourceId]/manga/[mangaId]/chapters/[chapterId]/pages": { sourceId: string; mangaId: string; chapterId: string };
			"/api/[sourceId]/search": { sourceId: string };
			"/manga/[sourceId]": { sourceId: string };
			"/manga/[sourceId]/[mangaId]": { sourceId: string; mangaId: string };
			"/manga/[sourceId]/[mangaId]/[chapterId]": { sourceId: string; mangaId: string; chapterId: string }
		};
		LayoutParams(): {
			"/": { sourceId?: string | undefined; chapterId?: string | undefined; mangaId?: string | undefined };
			"/api": { sourceId?: string | undefined; chapterId?: string | undefined; mangaId?: string | undefined };
			"/api/image-proxy": Record<string, never>;
			"/api/sources": Record<string, never>;
			"/api/[sourceId]": { sourceId: string; chapterId?: string | undefined; mangaId?: string | undefined };
			"/api/[sourceId]/chapter": { sourceId: string; chapterId?: string | undefined };
			"/api/[sourceId]/chapter/[chapterId]": { sourceId: string; chapterId: string };
			"/api/[sourceId]/chapter/[chapterId]/pages": { sourceId: string; chapterId: string };
			"/api/[sourceId]/filters": { sourceId: string };
			"/api/[sourceId]/list": { sourceId: string };
			"/api/[sourceId]/manga": { sourceId: string; mangaId?: string | undefined; chapterId?: string | undefined };
			"/api/[sourceId]/manga/[mangaId]": { sourceId: string; mangaId: string; chapterId?: string | undefined };
			"/api/[sourceId]/manga/[mangaId]/chapters": { sourceId: string; mangaId: string; chapterId?: string | undefined };
			"/api/[sourceId]/manga/[mangaId]/chapters/[chapterId]": { sourceId: string; mangaId: string; chapterId: string };
			"/api/[sourceId]/manga/[mangaId]/chapters/[chapterId]/pages": { sourceId: string; mangaId: string; chapterId: string };
			"/api/[sourceId]/search": { sourceId: string };
			"/explore": Record<string, never>;
			"/history": Record<string, never>;
			"/library": Record<string, never>;
			"/manga": { sourceId?: string | undefined; mangaId?: string | undefined; chapterId?: string | undefined };
			"/manga/[sourceId]": { sourceId: string; mangaId?: string | undefined; chapterId?: string | undefined };
			"/manga/[sourceId]/[mangaId]": { sourceId: string; mangaId: string; chapterId?: string | undefined };
			"/manga/[sourceId]/[mangaId]/[chapterId]": { sourceId: string; mangaId: string; chapterId: string };
			"/search": Record<string, never>;
			"/settings": Record<string, never>;
			"/sources": Record<string, never>;
			"/updates": Record<string, never>
		};
		Pathname(): "/" | "/api/image-proxy" | "/api/sources" | `/api/${string}/chapter/${string}/pages` & {} | `/api/${string}/filters` & {} | `/api/${string}/list` & {} | `/api/${string}/manga/${string}` & {} | `/api/${string}/manga/${string}/chapters` & {} | `/api/${string}/manga/${string}/chapters/${string}/pages` & {} | `/api/${string}/search` & {} | "/explore" | "/history" | "/library" | `/manga/${string}/${string}` & {} | `/manga/${string}/${string}/${string}` & {} | "/search" | "/settings" | "/sources" | "/updates";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/manifest.webmanifest" | string & {};
	}
}