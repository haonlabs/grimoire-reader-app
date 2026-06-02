<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { BookOpen, Star } from 'lucide-svelte';
  import type { Chapter, Manga } from '$lib/sources/types';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import { mangaFormatLabel } from '$lib/utils/mangaFormat';
  import { proxiedImageUrl } from '$lib/utils/image';
  import { sourceFetch } from '$lib/utils/sourceUnlock';

  export let manga: Manga;
  export let compact = false;
  export let sourceName = '';
  export let showChapterShortcuts = true;
  export let shouldLoad = true;

  const dispatch = createEventDispatcher<{ ready: void }>();
  let coverLoaded = false;
  let coverFailed = false;
  let coverRequested = false;
  let coverDone = false;
  let displayCoverUrl = '';
  let chapters: Chapter[] = [];
  let chaptersLoading = false;
  let chaptersFailed = false;
  let chaptersDone = false;
  let chapterLoadKey = '';
  let lastCardKey = '';
  let readySent = false;
  let coverTimer: number | undefined;

  $: format = mangaFormatLabel(manga);
  $: sourceLabel = sourceName || manga.sourceId;
  $: coverUrl = manga.coverUrl ?? '';
  $: mangaHref = `/manga/${manga.sourceId}/${manga.id}`;
  $: hasRating = typeof manga.rating === 'number' && Number.isFinite(manga.rating) && manga.rating > 0;
  $: ratingValue = hasRating ? manga.rating! : 0;
  $: cardKey = `${manga.sourceId}:${manga.id}:${coverUrl}:${showChapterShortcuts}`;
  $: latestChapters = [...chapters]
    .sort((left, right) => Number(right.number) - Number(left.number))
    .slice(0, 3);
  $: if (cardKey !== lastCardKey) resetCard(cardKey);
  $: if (shouldLoad && !coverRequested) startCoverLoad();
  $: if (shouldLoad && showChapterShortcuts && !chapterLoadKey && !chaptersLoading) loadChapterShortcuts();
  $: if (shouldLoad) notifyReady();

  function resetCard(nextKey: string) {
    lastCardKey = nextKey;
    clearCoverTimer();
    coverLoaded = false;
    coverFailed = false;
    coverRequested = false;
    coverDone = !coverUrl;
    displayCoverUrl = '';
    chapters = [];
    chaptersLoading = false;
    chaptersFailed = false;
    chaptersDone = !showChapterShortcuts;
    chapterLoadKey = '';
    readySent = false;
  }

  function startCoverLoad() {
    coverRequested = true;
    if (!coverUrl) {
      coverDone = true;
      notifyReady();
      return;
    }
    displayCoverUrl = proxiedImageUrl(coverUrl);
    if (typeof window !== 'undefined') {
      coverTimer = window.setTimeout(() => {
        if (!coverDone) handleCoverError();
      }, 12_000);
    }
  }

  async function loadChapterShortcuts() {
    const key = `${manga.sourceId}:${manga.id}`;
    if (typeof window === 'undefined' || !showChapterShortcuts || chapterLoadKey === key) return;
    chapterLoadKey = key;
    chapters = [];
    chaptersFailed = false;
    chaptersLoading = true;
    chaptersDone = false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 12_000);

    try {
      const response = await sourceFetch(fetch, manga.sourceId, `/api/${manga.sourceId}/manga/${manga.id}/chapters`, {
        signal: controller.signal
      });
      if (!response.ok) throw new Error('Unable to load chapters');
      chapters = await response.json();
    } catch {
      chaptersFailed = true;
    } finally {
      window.clearTimeout(timer);
      chaptersLoading = false;
      chaptersDone = true;
      notifyReady();
    }
  }

  function handleCoverLoad() {
    clearCoverTimer();
    coverLoaded = true;
    coverDone = true;
    notifyReady();
  }

  function handleCoverError() {
    clearCoverTimer();
    coverLoaded = true;
    coverFailed = true;
    coverDone = true;
    notifyReady();
  }

  function notifyReady() {
    if (readySent || !coverDone || !chaptersDone) return;
    readySent = true;
    dispatch('ready');
  }

  function chapterTimeLabel(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const diffMs = Math.max(0, Date.now() - date.getTime());
    const minute = 60 * 1000;
    const hour = minute * 60;
    const day = hour * 24;
    const week = day * 7;
    const month = day * 30;

    if (diffMs < minute) return 'now';
    if (diffMs < hour) return `${Math.floor(diffMs / minute)}m`;
    if (diffMs < day) return `${Math.floor(diffMs / hour)}h`;
    if (diffMs < week) return `${Math.floor(diffMs / day)}d`;
    if (diffMs < month) return `${Math.floor(diffMs / week)}w`;
    if (diffMs <= month) return '1mo';
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
  }

  function clearCoverTimer() {
    if (!coverTimer) return;
    clearTimeout(coverTimer);
    coverTimer = undefined;
  }

  onDestroy(() => {
    clearCoverTimer();
  });
</script>

<article
  class="group flex h-full flex-col overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:border-white/10 dark:bg-[#141416]"
>
  <a class="block" href={mangaHref} aria-label={manga.title}>
    <div class="relative aspect-[2/3] w-full shrink-0 overflow-hidden bg-ink/10 dark:bg-white/10">
    {#if displayCoverUrl && !coverFailed}
      {#if !coverLoaded}
        <Skeleton class="absolute inset-0 rounded-none" />
      {/if}
      <img
        class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] {coverLoaded ? 'opacity-100' : 'opacity-0'}"
        src={displayCoverUrl}
        alt={manga.title}
        loading="eager"
        decoding="async"
        on:load={handleCoverLoad}
        on:error={handleCoverError}
      />
    {:else}
      {#if coverFailed || !coverUrl}
        <div class="flex h-full items-center justify-center text-ink/40 dark:text-white/40">
          <BookOpen size={36} />
        </div>
      {:else}
        <Skeleton class="absolute inset-0 rounded-none" />
      {/if}
    {/if}
    <span class="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-soft">
      {format}
    </span>
    <span class="absolute right-2 top-2 max-w-[calc(100%-5.5rem)] truncate rounded-full bg-violet-600/90 px-2 py-1 text-[11px] font-bold text-white shadow-soft">
      {sourceLabel}
    </span>
    <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/85 via-60% to-transparent px-3 pb-3 pt-12 text-white">
      <h3 class="line-clamp-2 min-h-10 text-sm font-semibold leading-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
        {manga.title}
      </h3>
    </div>
    </div>
  </a>
  <div class="flex flex-1 flex-col space-y-2 p-3">
    <div class="flex flex-wrap items-center gap-2 text-xs text-ink/60 dark:text-white/60">
      <span class="truncate rounded-full bg-ink/5 px-2 py-1 capitalize dark:bg-white/10">{manga.status}</span>
      <span class="shrink-0 rounded-full bg-violet-500/15 px-2 py-1 font-semibold text-violet-200">{format}</span>
      <span class="max-w-full truncate rounded-full bg-ink/5 px-2 py-1 font-semibold text-ink/70 dark:bg-white/10 dark:text-white/70">{sourceLabel}</span>
      <span class="inline-flex items-center gap-1 {hasRating ? 'text-gold' : 'text-ink/35 dark:text-white/35'}">
        <Star size={13} class={hasRating ? 'fill-gold text-gold' : 'fill-ink/25 text-ink/25 dark:fill-white/25 dark:text-white/25'} />
        {ratingValue.toFixed(1)}
      </span>
    </div>
    {#if !compact && manga.genres.length}
      <div class="flex flex-wrap gap-1">
        {#each manga.genres.slice(0, 3) as genre}
          <span class="rounded border border-ink/10 px-1.5 py-0.5 text-[11px] text-ink/60 dark:border-white/10 dark:text-white/60">
            {genre}
          </span>
        {/each}
      </div>
    {/if}
    {#if showChapterShortcuts}
      <div class="grid min-h-[6.5rem] gap-1.5 pt-1">
        {#if latestChapters.length}
          {#each latestChapters as chapter}
            <a
              class="focus-ring flex min-h-8 items-center justify-between gap-2 rounded-md border border-ink/10 bg-ink/[0.03] px-2 text-xs font-semibold text-ink/75 transition hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-violet-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70 dark:hover:text-white"
              href={`/manga/${manga.sourceId}/${manga.id}/${chapter.id}`}
            >
              <span class="min-w-0 truncate">{chapter.title || `Chapter ${chapter.number}`}</span>
              <span class="w-9 shrink-0 text-right text-[11px] text-ink/45 dark:text-white/45">{chapterTimeLabel(chapter.uploadedAt)}</span>
            </a>
          {/each}
        {:else if chaptersLoading || !chapterLoadKey}
          {#each Array(3) as _}
            <Skeleton class="h-8 rounded-md" />
          {/each}
        {:else if !chaptersFailed}
          <p class="rounded-md border border-ink/10 px-2 py-2 text-xs text-ink/45 dark:border-white/10 dark:text-white/45">Belum ada chapter.</p>
        {/if}
      </div>
    {/if}
  </div>
</article>
