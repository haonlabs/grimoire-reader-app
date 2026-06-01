<script lang="ts">
  import { onMount } from 'svelte';
  import type { Chapter, MangaDetail } from '$lib/sources/types';
  import { readChapters, history } from '$lib/stores/history';
  import { settings } from '$lib/stores/settings';
  import PageImage from './PageImage.svelte';
  import ReaderOverlay from './ReaderOverlay.svelte';

  export let manga: MangaDetail;
  export let chapter: Chapter;
  export let chapters: Chapter[] = [];
  export let sourceId = manga.sourceId;
  export let mangaId = manga.id;
  export let pages: string[] = [];

  let page = 0;
  let overlayVisible = false;
  let loadedPages: Record<number, true> = {};
  let failedPages: Record<number, true> = {};
  let pointerStart: { x: number; y: number; time: number } | undefined;

  $: total = pages.length;
  $: settledPages = Object.keys(loadedPages).length + Object.keys(failedPages).length;
  $: loadingProgress = total ? Math.round((settledPages / total) * 100) : 0;
  $: displayedLoadingProgress = settledPages > 0 ? loadingProgress : undefined;
  $: fit = $settings.reader.fit;
  $: background = $settings.reader.background;
  $: chapterTitle = `Chapter ${chapter.number || '?'}${chapter.title ? `: ${chapter.title}` : ''}`;
  $: if (!$settings.reader.incognito && total) {
    readChapters.update((items) => ({ ...items, [chapter.id]: page }));
    history.update((items) => {
      const next = items.filter((item) => item.chapter.id !== chapter.id);
      return [
        {
          manga,
          chapter,
          lastPage: page,
          totalPages: total,
          lastReadAt: new Date().toISOString()
        },
        ...next
      ].slice(0, 200);
    });
  }

  function toggleOverlay() {
    overlayVisible = !overlayVisible;
  }

  function handleToggleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleOverlay();
    }
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    pointerStart = { x: event.clientX, y: event.clientY, time: performance.now() };
  }

  function handlePointerUp(event: PointerEvent) {
    if (!pointerStart) return;
    const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    const elapsed = performance.now() - pointerStart.time;
    pointerStart = undefined;
    if (distance <= 10 && elapsed < 600) toggleOverlay();
  }

  function markLoaded(index: number) {
    loadedPages = { ...loadedPages, [index]: true };
  }

  function markFailed(index: number) {
    failedPages = { ...failedPages, [index]: true };
  }

  onMount(() => {
    page = $readChapters[chapter.id] ?? 0;
    overlayVisible = false;
    loadedPages = {};
    failedPages = {};
  });
</script>

<svelte:head>
  <title>{manga.title} · {chapterTitle}</title>
</svelte:head>

<div
  class="reader-clean min-h-screen {background === 'black' ? 'reader-dark bg-black text-white' : background === 'sepia' ? 'bg-[#eadfc8] text-ink' : 'bg-white text-ink'}"
>
  <ReaderOverlay
    visible={overlayVisible}
    mangaTitle={manga.title}
    {chapterTitle}
    {chapter}
    {chapters}
    {sourceId}
    {mangaId}
  />

  <main class="mx-auto flex max-w-5xl flex-col gap-0 px-0 py-16 sm:px-8">
    <div
      class="flex flex-col items-center gap-0"
      role="button"
      tabindex="0"
      aria-label="Toggle reader menu"
      on:pointerdown={handlePointerDown}
      on:pointerup={handlePointerUp}
      on:keydown={handleToggleKeydown}
    >
      {#each pages as src, index}
        <PageImage
          {src}
          {index}
          {fit}
          progress={displayedLoadingProgress}
          on:load={(event) => markLoaded(event.detail.index)}
          on:error={(event) => markFailed(event.detail.index)}
        />
      {:else}
        <p class="mx-auto rounded-lg border border-white/10 px-4 py-3 text-sm">No pages found for this chapter.</p>
      {/each}
    </div>
  </main>
</div>
