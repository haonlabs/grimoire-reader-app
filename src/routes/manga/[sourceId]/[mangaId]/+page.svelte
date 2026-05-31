<script lang="ts">
  import { Bookmark, BookOpen, Check, RotateCcw } from 'lucide-svelte';
  import ChapterList from '$lib/components/manga/ChapterList.svelte';
  import type { Chapter, MangaDetail } from '$lib/sources/types';
  import { proxiedImageUrl } from '$lib/utils/image';
  import { library } from '$lib/stores/library';
  import { readChapters } from '$lib/stores/history';

  export let data: {
    sourceId: string;
    mangaId: string;
    manga: MangaDetail | null;
    chapters: Chapter[];
    error: string;
  };

  let sort: 'newest' | 'oldest' = 'newest';
  $: inLibrary = Boolean(
    data.manga && $library.some((entry) => entry.manga.id === data.manga?.id && entry.manga.sourceId === data.manga?.sourceId)
  );
  $: firstChapter = [...data.chapters].sort((a, b) => a.number - b.number)[0];

  function addToLibrary() {
    if (!data.manga || inLibrary) return;
    library.update((entries) => [
      {
        manga: data.manga!,
        categoryId: 'reading',
        addedAt: new Date().toISOString()
      },
      ...entries
    ]);
  }
</script>

<svelte:head>
  <title>{data.manga?.title ?? 'Manga'} · Grimoire Reader</title>
</svelte:head>

{#if data.error || !data.manga}
  <div class="rounded-lg border border-ember/30 bg-ember/10 p-5 text-ember">
    <p class="font-semibold">Unable to load manga</p>
    <p class="mt-1 text-sm">{data.error}</p>
  </div>
{:else}
  <section class="grid gap-6 lg:grid-cols-[18rem_1fr]">
    <div>
      <div class="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft dark:border-white/10 dark:bg-white/5">
        {#if data.manga.coverUrl}
          <img class="aspect-[2/3] w-full object-cover" src={proxiedImageUrl(data.manga.coverUrl)} alt={data.manga.title} />
        {/if}
      </div>
      <div class="mt-4 grid grid-cols-2 gap-2">
        <button
          class="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-ink"
          type="button"
          on:click={addToLibrary}
        >
          {#if inLibrary}<Check size={17} /> Saved{:else}<Bookmark size={17} /> Library{/if}
        </button>
        {#if firstChapter}
          <a
            class="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-ink/10 bg-white px-3 py-2.5 text-sm font-semibold text-ink dark:border-white/10 dark:bg-white/10 dark:text-white"
            href={`/manga/${data.sourceId}/${data.mangaId}/${firstChapter.id}`}
          >
            <BookOpen size={17} />
            Start
          </a>
        {/if}
      </div>
    </div>

    <div class="min-w-0">
      <p class="text-sm font-medium uppercase text-ember">{data.sourceId}</p>
      <h1 class="mt-1 text-3xl font-bold md:text-4xl">{data.manga.title}</h1>
      <div class="mt-3 flex flex-wrap gap-2 text-sm text-ink/60 dark:text-white/60">
        <span class="capitalize">{data.manga.status}</span>
        {#if data.manga.author}<span>Author: {data.manga.author}</span>{/if}
        {#if data.manga.artist}<span>Artist: {data.manga.artist}</span>{/if}
        {#if data.manga.year}<span>{data.manga.year}</span>{/if}
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        {#each data.manga.genres as genre}
          <span class="rounded border border-ink/10 px-2 py-1 text-xs text-ink/65 dark:border-white/10 dark:text-white/65">{genre}</span>
        {/each}
      </div>

      <p class="mt-5 max-w-3xl whitespace-pre-line text-sm leading-7 text-ink/70 dark:text-white/70">{data.manga.description}</p>

      <div class="mt-8 flex items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-semibold">Chapters</h2>
          <p class="text-sm text-ink/50 dark:text-white/50">{data.chapters.length} chapters found</p>
        </div>
        <div class="flex items-center gap-2">
          <select class="focus-ring rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/10" bind:value={sort}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
          <button class="focus-ring rounded-lg border border-ink/10 bg-white p-2 dark:border-white/10 dark:bg-white/10" title="Refresh" on:click={() => location.reload()}>
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      <div class="mt-3">
        <ChapterList chapters={data.chapters} mangaId={data.mangaId} sourceId={data.sourceId} readMap={$readChapters} {sort} />
      </div>
    </div>
  </section>
{/if}
