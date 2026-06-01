<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { disableScrollHandling } from '$app/navigation';
  import type { Chapter, MangaDetail } from '$lib/sources/types';
  import { readChapters, history, readerPositions, type ReaderPosition } from '$lib/stores/history';
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
  let readerBody: HTMLDivElement;
  let mounted = false;
  let scrollFrame = 0;
  let isRestoring = false;
  let restoreTimers: number[] = [];
  let removeScrollListener: (() => void) | undefined;

  $: total = pages.length;
  $: settledPages = Object.keys(loadedPages).length + Object.keys(failedPages).length;
  $: loadingProgress = total ? Math.round((settledPages / total) * 100) : 0;
  $: displayedLoadingProgress = settledPages > 0 ? loadingProgress : undefined;
  $: fit = $settings.reader.fit;
  $: background = $settings.reader.background;
  $: chapterTitle = `Chapter ${chapter.number || '?'}${chapter.title ? `: ${chapter.title}` : ''}`;
  $: positionKey = `${sourceId}:${mangaId}:${chapter.id}`;
  $: if (mounted && !$settings.reader.incognito && total) {
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

  function getCurrentPosition(): ReaderPosition {
    const elements = Array.from(readerBody?.querySelectorAll<HTMLElement>('[data-reader-page]') ?? []);
    const viewportAnchor = window.innerHeight * 0.45;
    let active = elements[0];
    let activeIndex = page;
    let bestDistance = Number.POSITIVE_INFINITY;

    elements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const distance = rect.top <= viewportAnchor && rect.bottom >= viewportAnchor ? 0 : Math.min(Math.abs(rect.top - viewportAnchor), Math.abs(rect.bottom - viewportAnchor));
      if (distance < bestDistance) {
        bestDistance = distance;
        active = element;
        activeIndex = index;
      }
    });

    if (!active) {
      return {
        page,
        pageOffsetRatio: 0,
        scrollY: window.scrollY,
        updatedAt: new Date().toISOString()
      };
    }

    const rect = active.getBoundingClientRect();
    const pageTop = rect.top + window.scrollY;
    const pageOffsetRatio = rect.height > 0 ? Math.max(0, Math.min(1, (window.scrollY - pageTop) / rect.height)) : 0;

    return {
      page: activeIndex,
      pageOffsetRatio,
      scrollY: window.scrollY,
      updatedAt: new Date().toISOString()
    };
  }

  function savePosition() {
    if ($settings.reader.incognito || !total || isRestoring || !readerBody) return;
    const position = getCurrentPosition();
    page = position.page;
    readerPositions.update((items) => ({ ...items, [positionKey]: position, [chapter.id]: position }));
  }

  function scheduleSavePosition() {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0;
      savePosition();
    });
  }

  function applyRestoredPosition(position: ReaderPosition | undefined) {
    const targetPage = position?.page ?? $readChapters[chapter.id] ?? 0;
    const target = readerBody?.querySelector<HTMLElement>(`[data-reader-page="${targetPage}"]`);
    if (!target) {
      window.scrollTo({ top: position?.scrollY ?? 0, behavior: 'auto' });
      return;
    }

    const top = target.getBoundingClientRect().top + window.scrollY;
    const offset = (position?.pageOffsetRatio ?? 0) * target.offsetHeight;
    window.scrollTo({ top: Math.max(0, top + offset), behavior: 'auto' });
  }

  async function restorePosition(position: ReaderPosition | undefined) {
    isRestoring = true;
    await tick();

    window.requestAnimationFrame(() => applyRestoredPosition(position));
    for (const delay of [80, 220, 500]) {
      restoreTimers.push(window.setTimeout(() => applyRestoredPosition(position), delay));
    }
    restoreTimers.push(
      window.setTimeout(() => {
        isRestoring = false;
        savePosition();
      }, 650)
    );
  }

  onMount(() => {
    disableScrollHandling();
    const savedPosition = $readerPositions[positionKey] ?? $readerPositions[chapter.id];
    page = savedPosition?.page ?? $readChapters[chapter.id] ?? 0;
    overlayVisible = false;
    loadedPages = {};
    failedPages = {};
    mounted = true;
    restorePosition(savedPosition);
    window.addEventListener('scroll', scheduleSavePosition, { passive: true });
    window.addEventListener('pagehide', savePosition);
    removeScrollListener = () => {
      window.removeEventListener('scroll', scheduleSavePosition);
      window.removeEventListener('pagehide', savePosition);
    };
  });

  onDestroy(() => {
    if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
    restoreTimers.forEach((timer) => window.clearTimeout(timer));
    isRestoring = false;
    savePosition();
    removeScrollListener?.();
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
      bind:this={readerBody}
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
