<script lang="ts">
  import { onMount } from 'svelte';
  import type { Chapter, MangaDetail } from '$lib/sources/types';
  import { readChapters, history } from '$lib/stores/history';
  import { settings } from '$lib/stores/settings';
  import PageImage from './PageImage.svelte';
  import ReaderOverlay from './ReaderOverlay.svelte';

  export let manga: MangaDetail;
  export let chapter: Chapter;
  export let pages: string[] = [];

  let page = 0;
  let overlayVisible = true;
  let hideTimer: ReturnType<typeof setTimeout>;

  $: total = pages.length;
  $: mode = $settings.reader.mode;
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

  function bumpOverlay() {
    overlayVisible = true;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => (overlayVisible = false), 3000);
  }

  function nextPage() {
    page = Math.min(total - 1, page + 1);
    bumpOverlay();
  }

  function prevPage() {
    page = Math.max(0, page - 1);
    bumpOverlay();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowRight') mode === 'rtl' ? prevPage() : nextPage();
    if (event.key === 'ArrowLeft') mode === 'rtl' ? nextPage() : prevPage();
  }

  onMount(() => {
    page = $readChapters[chapter.id] ?? 0;
    bumpOverlay();
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('mousemove', bumpOverlay);
    window.addEventListener('click', bumpOverlay);
    return () => {
      clearTimeout(hideTimer);
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('mousemove', bumpOverlay);
      window.removeEventListener('click', bumpOverlay);
    };
  });
</script>

<svelte:head>
  <title>{manga.title} · {chapterTitle}</title>
</svelte:head>

<div
  class="min-h-screen {background === 'black' ? 'bg-black text-white' : background === 'sepia' ? 'bg-[#eadfc8] text-ink' : 'bg-white text-ink'}"
>
  <ReaderOverlay bind:page visible={overlayVisible} mangaTitle={manga.title} {chapterTitle} {total} previous={prevPage} next={nextPage} />

  {#if mode === 'vertical'}
    <main class="mx-auto flex max-w-5xl flex-col gap-2 px-0 py-20 sm:px-8">
      {#each pages as src, index}
        <PageImage {src} {index} {fit} />
      {/each}
    </main>
  {:else}
    <main class="grid min-h-screen place-items-center px-0 py-20 sm:px-8">
      {#if pages[page]}
        <button
          class="fixed inset-y-0 left-0 w-1/3 cursor-w-resize"
          type="button"
          aria-label="Previous page"
          on:click|stopPropagation={mode === 'rtl' ? nextPage : prevPage}
        ></button>
        <PageImage src={pages[page]} index={page} {fit} />
        <button
          class="fixed inset-y-0 right-0 w-1/3 cursor-e-resize"
          type="button"
          aria-label="Next page"
          on:click|stopPropagation={mode === 'rtl' ? prevPage : nextPage}
        ></button>
      {:else}
        <p class="rounded-lg border border-white/10 px-4 py-3 text-sm">No pages found for this chapter.</p>
      {/if}
    </main>
  {/if}
</div>
