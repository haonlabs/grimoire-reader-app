<script lang="ts">
  import { onDestroy } from 'svelte';
  import { CheckCircle2, Play } from 'lucide-svelte';
  import type { Chapter } from '$lib/sources/types';
  import { preloadImages, proxiedImageUrl } from '$lib/utils/image';

  export let chapters: Chapter[] = [];
  export let mangaId: string;
  export let sourceId: string;
  export let readMap: Record<string, number> = {};
  export let sort: 'newest' | 'oldest' = 'newest';
  export let coverUrl = '';
  let failedImages: Record<string, true> = {};
  let preloadKey = '';
  let stopImagePreload: () => void = () => {};

  $: sorted = [...chapters].sort((a, b) =>
    sort === 'newest'
      ? Number(b.number) - Number(a.number)
      : Number(a.number) - Number(b.number)
  );
  $: nextPreloadKey = sorted.map((chapter) => chapter.thumbnailUrl || coverUrl).filter(Boolean).join('\n');
  $: if (nextPreloadKey !== preloadKey) {
    preloadKey = nextPreloadKey;
    stopImagePreload();
    stopImagePreload = preloadImages(sorted.slice(0, 4).map((chapter) => chapter.thumbnailUrl || coverUrl));
  }

  onDestroy(() => stopImagePreload());

  function relativeDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
    if (days === 0) return 'hari ini';
    if (days === 1) return '1 hari lalu';
    if (days < 30) return `${days} hari lalu`;
    return date.toLocaleDateString('id-ID');
  }
</script>

{#if sorted.length}
  <div class="chapter-grid" class:chapter-grid--single={sorted.length === 1}>
    {#each sorted as chapter (chapter.id)}
      <a
        class="chapter-card"
        class:chapter-card--read={readMap[chapter.id] !== undefined}
        href={`/manga/${sourceId}/${mangaId}/${chapter.id}`}
      >
        <figure class="chapter-card__thumb">
          {#if (chapter.thumbnailUrl || coverUrl) && !failedImages[chapter.id]}
            <img
              src={proxiedImageUrl(chapter.thumbnailUrl || coverUrl)}
              alt={`Thumbnail Chapter ${chapter.number || '?'}`}
              loading="lazy"
              decoding="async"
              width="160"
              height="120"
              on:error={() => (failedImages = { ...failedImages, [chapter.id]: true })}
            />
          {:else}
            <span class="chapter-card__fallback" aria-hidden="true"><Play size={18} /></span>
          {/if}
        </figure>

        <span class="chapter-card__body">
          <span class="chapter-card__number">Chapter {chapter.number || '?'}</span>
          {#if chapter.title}
            <span class="chapter-card__title">{chapter.title}</span>
          {/if}
          <span class="chapter-card__meta">
            <span>{chapter.language.toUpperCase()}</span>
            <span>{chapter.scanlator ?? 'Shinigami'}</span>
            <span>{relativeDate(chapter.uploadedAt)}</span>
          </span>
        </span>

        <span class="chapter-card__action" aria-hidden="true">
          {#if readMap[chapter.id] !== undefined}
            <CheckCircle2 size={19} />
          {:else}
            <Play size={18} />
          {/if}
        </span>
      </a>
    {/each}
  </div>
{:else}
  <div class="chapter-empty">
    <Play size={20} aria-hidden="true" />
    <div>
      <p>Belum ada chapter.</p>
      <span>Chapter akan muncul di sini saat source menyediakannya.</span>
    </div>
  </div>
{/if}

<style>
  /* Hallmark · macrostructure: Index-First · tone: atmospheric · anchor hue: violet */
  .chapter-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-sm);
    width: 100%;
  }

  .chapter-grid--single {
    max-width: 34rem;
  }

  .chapter-card {
    display: flex;
    min-width: 0;
    min-height: 6.75rem;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm);
    overflow: hidden;
    border: var(--rule-thin) solid var(--color-rule);
    border-radius: var(--radius-card);
    background: var(--color-paper-2);
    color: var(--color-ink);
    text-decoration: none;
    transition:
      background-color var(--dur-short) var(--ease-out),
      border-color var(--dur-short) var(--ease-out),
      transform var(--dur-micro) var(--ease-out);
  }

  .chapter-card:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .chapter-card:active {
    transform: translateY(1px);
  }

  .chapter-card--read {
    border-color: var(--color-rule-strong);
  }

  .chapter-card__thumb {
    width: 4.75rem;
    aspect-ratio: 4 / 3;
    flex: 0 0 auto;
    margin: 0;
    overflow: hidden;
    border-radius: var(--radius-sm);
    background: var(--color-paper-3);
    color: var(--color-muted);
  }

  .chapter-card__thumb img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .chapter-card__fallback {
    display: grid;
    width: 100%;
    height: 100%;
    place-items: center;
  }

  .chapter-card__body {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    gap: var(--space-2xs);
  }

  .chapter-card__number {
    overflow: hidden;
    color: var(--color-ink);
    font-family: var(--font-display);
    font-size: var(--text-base);
    font-weight: 700;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .chapter-card__title {
    overflow: hidden;
    color: var(--color-ink-2);
    font-size: var(--text-sm);
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chapter-card__meta {
    display: flex;
    min-width: 0;
    flex-wrap: wrap;
    gap: var(--space-2xs) var(--space-xs);
    color: var(--color-muted);
    font-size: var(--text-xs);
    line-height: 1.35;
  }

  .chapter-card__meta span:not(:last-child)::after {
    content: '·';
    margin-inline-start: var(--space-xs);
    color: var(--color-rule-strong);
  }

  .chapter-card__action {
    display: grid;
    width: 2.75rem;
    height: 2.75rem;
    flex: 0 0 auto;
    place-items: center;
    border-radius: var(--radius-pill);
    background: var(--color-paper-3);
    color: var(--color-accent);
  }

  .chapter-empty {
    display: flex;
    max-width: 34rem;
    align-items: flex-start;
    gap: var(--space-sm);
    padding: var(--space-lg);
    border: var(--rule-thin) solid var(--color-rule);
    border-radius: var(--radius-card);
    background: var(--color-paper-2);
    color: var(--color-muted);
  }

  .chapter-empty p {
    margin: 0;
    color: var(--color-ink);
    font-family: var(--font-display);
    font-weight: 700;
  }

  .chapter-empty span {
    display: block;
    margin-block-start: var(--space-2xs);
    font-size: var(--text-sm);
    line-height: 1.5;
  }

  @media (hover: hover) and (pointer: fine) {
    .chapter-card:hover {
      border-color: var(--color-rule-strong);
      background: var(--color-paper-3);
    }
  }

  @media (min-width: 48rem) {
    .chapter-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .chapter-grid--single {
      grid-template-columns: minmax(0, 1fr);
    }

    .chapter-card__thumb {
      width: 5.5rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .chapter-card {
      transition: none;
    }

    .chapter-card:active { transform: none; }
  }
</style>
