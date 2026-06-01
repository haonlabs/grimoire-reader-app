<script lang="ts">
  import Reader from '$lib/components/reader/Reader.svelte';
  import type { Chapter, MangaDetail } from '$lib/sources/types';

  export let data: {
    manga: MangaDetail | null;
    chapter: Chapter;
    chapters: Chapter[];
    sourceId: string;
    mangaId: string;
    pages: string[];
    error: string;
  };
</script>

{#if data.manga}
  <Reader
    manga={data.manga}
    chapter={data.chapter}
    chapters={data.chapters}
    sourceId={data.sourceId}
    mangaId={data.mangaId}
    pages={data.pages}
  />
{:else}
  <div class="grid min-h-screen place-items-center bg-ink p-6 text-white">
    <div class="max-w-md rounded-lg border border-white/10 bg-white/10 p-5">
      <p class="font-semibold">Reader failed to load</p>
      <p class="mt-1 text-sm text-white/70">{data.error}</p>
    </div>
  </div>
{/if}
