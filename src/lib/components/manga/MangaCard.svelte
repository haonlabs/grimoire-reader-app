<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { BookOpen, Star } from 'lucide-svelte';
  import MangaCardChapters from '$lib/components/manga/MangaCardChapters.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import type { Chapter, Manga } from '$lib/sources/types';
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
    chaptersFailed = false;
    chaptersLoading = false;
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

  function clearCoverTimer() {
    if (!coverTimer) return;
    clearTimeout(coverTimer);
    coverTimer = undefined;
  }

  onDestroy(clearCoverTimer);
</script>

<article class="manga-card" aria-busy={!coverDone || (showChapterShortcuts && !chaptersDone)}>
  <a class="manga-card__cover-link" href={mangaHref} aria-label={`Buka ${manga.title}`}>
    <div class="manga-card__cover">
      {#if displayCoverUrl && !coverFailed}
        {#if !coverLoaded}<Skeleton class="absolute inset-0 rounded-none" />{/if}
        <img
          class:manga-card__image--loaded={coverLoaded}
          class="manga-card__image"
          src={displayCoverUrl}
          alt={manga.title}
          loading="eager"
          decoding="async"
          on:load={handleCoverLoad}
          on:error={handleCoverError}
        />
      {:else if coverFailed || !coverUrl}
        <div class="manga-card__cover-fallback"><BookOpen size={34} aria-hidden="true" /></div>
      {:else}
        <Skeleton class="absolute inset-0 rounded-none" />
      {/if}

      <div class="manga-card__badges">
        <Badge variant="outline">{format}</Badge>
        <Badge>{sourceLabel}</Badge>
      </div>
    </div>
  </a>

  <div class="manga-card__body">
    <div class="manga-card__heading">
      <a class="manga-card__title-link" href={mangaHref}><h3>{manga.title}</h3></a>
      <span class:manga-card__rating--muted={!hasRating} class="manga-card__rating">
        <Star size={14} aria-hidden="true" />
        {ratingValue.toFixed(1)}
      </span>
    </div>

    <div class="manga-card__meta">
      <span>{manga.status}</span>
      {#if !compact}{#each manga.genres.slice(0, 2) as genre}<span>{genre}</span>{/each}{/if}
    </div>

    {#if showChapterShortcuts}
      <MangaCardChapters
        {chapters}
        mangaId={manga.id}
        sourceId={manga.sourceId}
        loading={chaptersLoading || !chapterLoadKey}
        failed={chaptersFailed}
      />
    {/if}
  </div>
</article>

<style>
  /* Hallmark · macrostructure: Cover-First Index · tone: atmospheric · anchor hue: violet */
  /* Hallmark · pre-emit critique: P4 H4 E5 S5 R5 V4 */
  .manga-card {
    display: flex;
    min-width: 0;
    height: 100%;
    flex-direction: column;
    overflow: hidden;
    border: var(--rule-thin) solid var(--color-rule);
    border-radius: var(--radius-card);
    background: var(--color-paper-2);
    color: var(--color-ink);
    transition:
      background-color var(--dur-short) var(--ease-out),
      border-color var(--dur-short) var(--ease-out);
  }

  .manga-card__cover-link,
  .manga-card__title-link {
    color: inherit;
    text-decoration: none;
  }

  .manga-card__cover-link:focus-visible,
  .manga-card__title-link:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }

  .manga-card__cover-link:active,
  .manga-card__title-link:active {
    opacity: 0.82;
  }

  :global(.manga-card__cover-link[aria-disabled='true']),
  :global(.manga-card__title-link[aria-disabled='true']) {
    cursor: not-allowed;
    opacity: 0.55;
    pointer-events: none;
  }

  .manga-card__cover {
    position: relative;
    aspect-ratio: 2 / 3;
    overflow: hidden;
    background: var(--color-paper-3);
    color: var(--color-muted);
  }

  .manga-card__image,
  .manga-card__cover-fallback {
    display: block;
    width: 100%;
    height: 100%;
  }

  .manga-card__image {
    object-fit: cover;
    opacity: 0;
    transition: opacity var(--dur-short) var(--ease-out);
  }

  .manga-card__image--loaded { opacity: 1; }

  .manga-card__cover-fallback {
    display: grid;
    place-items: center;
  }

  .manga-card__badges {
    position: absolute;
    inset-block-start: var(--space-xs);
    inset-inline: var(--space-xs);
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-xs);
  }

  .manga-card__body {
    display: grid;
    flex: 1;
    align-content: start;
    gap: var(--space-sm);
    padding: var(--space-sm);
  }

  .manga-card__heading {
    display: flex;
    min-width: 0;
    align-items: flex-start;
    gap: var(--space-xs);
  }

  .manga-card__title-link {
    min-width: 0;
    flex: 1;
  }

  h3 {
    display: -webkit-box;
    min-width: 0;
    min-height: 2.5em;
    margin: 0;
    overflow: hidden;
    color: var(--color-ink);
    font-family: var(--font-display);
    font-size: var(--text-sm);
    font-style: normal;
    font-weight: 700;
    letter-spacing: -0.015em;
    line-height: 1.25;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  .manga-card__rating {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: var(--space-3xs);
    color: var(--color-accent);
    font-size: var(--text-xs);
    font-weight: 700;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .manga-card__rating--muted { color: var(--color-muted); }

  .manga-card__meta {
    display: flex;
    min-width: 0;
    min-height: 2.4em;
    max-height: 2.4em;
    overflow: hidden;
    align-content: flex-start;
    flex-wrap: wrap;
    gap: var(--space-2xs) var(--space-xs);
    color: var(--color-muted);
    font-size: var(--text-xs);
    line-height: 1.2;
    text-transform: capitalize;
  }

  .manga-card__meta span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .manga-card__meta span:not(:last-child)::after {
    content: '·';
    margin-inline-start: var(--space-xs);
    color: var(--color-rule-strong);
  }

  @media (hover: hover) and (pointer: fine) {
    .manga-card:hover {
      border-color: var(--color-rule-strong);
      background: var(--color-paper-3);
    }

    .manga-card__title-link:hover h3 { color: var(--color-accent); }
  }

  @media (prefers-reduced-motion: reduce) {
    .manga-card,
    .manga-card__image { transition: none; }
  }
</style>
