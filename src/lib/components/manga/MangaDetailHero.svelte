<script lang="ts">
  import { Bookmark, BookOpen, Check, Eye, Star, Trophy } from 'lucide-svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import type { Chapter, MangaDetail } from '$lib/sources/types';
  import { proxiedImageUrl } from '$lib/utils/image';
  import { mangaFormatLabel } from '$lib/utils/mangaFormat';

  export let manga: MangaDetail;
  export let sourceId: string;
  export let mangaId: string;
  export let chapterCount = 0;
  export let continueChapter: Chapter | undefined = undefined;
  export let continuing = false;
  export let inLibrary = false;
  export let onAddToLibrary: () => void;

  let coverLoaded = false;
  let coverFailed = false;
  let descriptionOpen = false;

  $: hasRating = typeof manga.rating === 'number' && Number.isFinite(manga.rating) && manga.rating > 0;
  $: ratingLabel = (hasRating ? manga.rating! : 0).toFixed(1);
  $: formatLabel = mangaFormatLabel(manga);
  $: description = manga.description ?? '';
</script>

<header class="detail-hero">
  <figure class="detail-cover">
    {#if manga.coverUrl && !coverFailed}
      {#if !coverLoaded}<Skeleton class="absolute inset-0 rounded-none" />{/if}
      <img
        class:detail-cover__image--loaded={coverLoaded}
        class="detail-cover__image"
        src={proxiedImageUrl(manga.coverUrl)}
        alt={manga.title}
        loading="eager"
        fetchpriority="high"
        decoding="async"
        on:load={() => (coverLoaded = true)}
        on:error={() => {
          coverLoaded = true;
          coverFailed = true;
        }}
      />
    {:else}
      <div class="detail-cover__fallback">Cover tidak tersedia</div>
    {/if}
    <figcaption><Badge variant="outline">{formatLabel}</Badge></figcaption>
  </figure>

  <div class="detail-copy">
    <div><Badge variant="outline">{sourceId}</Badge></div>
    <h1>{manga.title}</h1>

    <div class="detail-actions">
      {#if continueChapter}
        <Button href={`/manga/${sourceId}/${mangaId}/${continueChapter.id}`}>
          <BookOpen size={17} />
          {continuing ? 'Lanjutkan' : 'Mulai baca'}
        </Button>
      {/if}
      <Button variant="outline" disabled={inLibrary} aria-pressed={inLibrary} on:click={onAddToLibrary}>
        {#if inLibrary}<Check size={17} /> Tersimpan{:else}<Bookmark size={17} /> Simpan{/if}
      </Button>
    </div>

    <div class="detail-facts" aria-label="Informasi manga">
      <span class:detail-fact--muted={!hasRating}><Star size={16} /> <strong>{ratingLabel}</strong> rating</span>
      <span><Bookmark size={16} /> <strong>{chapterCount}</strong> chapter</span>
      <span><Eye size={16} /> <strong>{manga.status}</strong></span>
      <span><Trophy size={16} /> <strong>{manga.year ?? '—'}</strong></span>
    </div>

    <div class="detail-description">
      <p class:detail-description--open={descriptionOpen}>{description}</p>
      {#if description.length > 220}
        <Button variant="ghost" size="sm" on:click={() => (descriptionOpen = !descriptionOpen)}>
          {descriptionOpen ? 'Tampilkan sedikit' : 'Baca selengkapnya'}
        </Button>
      {/if}
    </div>

    <dl class="detail-metadata">
      {#if manga.genres.length}
        <div class="detail-metadata__wide">
          <dt>Genre</dt>
          <dd>{#each manga.genres as genre}<Badge>{genre}</Badge>{/each}</dd>
        </div>
      {/if}
      {#if manga.author}<div><dt>Author</dt><dd>{manga.author}</dd></div>{/if}
      {#if manga.artist}<div><dt>Artist</dt><dd>{manga.artist}</dd></div>{/if}
      <div><dt>Format</dt><dd>{formatLabel}</dd></div>
      <div><dt>Source</dt><dd>{sourceId}</dd></div>
    </dl>
  </div>
</header>

<style>
  /* Hallmark · macrostructure: Index-First · tone: atmospheric · anchor hue: violet */
  .detail-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-lg);
    align-items: start;
  }

  .detail-cover {
    position: relative;
    width: min(10.5rem, 52vw);
    margin: 0;
    overflow: hidden;
    border-radius: var(--radius-card);
    background: var(--color-paper-2);
    color: var(--color-muted);
  }

  .detail-cover__image,
  .detail-cover__fallback {
    display: block;
    width: 100%;
    aspect-ratio: 2 / 3;
  }

  .detail-cover__image {
    object-fit: cover;
    opacity: 0;
    transition: opacity var(--dur-short) var(--ease-out);
  }

  .detail-cover__image--loaded { opacity: 1; }

  .detail-cover__fallback {
    display: grid;
    place-items: center;
    padding: var(--space-md);
    color: var(--color-muted);
    text-align: center;
    font-size: var(--text-sm);
  }

  .detail-cover figcaption {
    position: absolute;
    inset-block-start: var(--space-sm);
    inset-inline-start: var(--space-sm);
  }

  .detail-copy {
    display: grid;
    min-width: 0;
    gap: var(--space-md);
  }

  h1 {
    min-width: 0;
    margin: 0;
    color: var(--color-ink);
    font-family: var(--font-display);
    font-size: var(--text-display);
    font-style: normal;
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1.02;
    overflow-wrap: anywhere;
  }

  .detail-actions,
  .detail-facts {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }

  .detail-actions { gap: var(--space-xs); }

  .detail-facts {
    gap: var(--space-xs) var(--space-lg);
    padding-block: var(--space-sm);
    border-block: var(--rule-thin) solid var(--color-rule);
    color: var(--color-muted);
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
  }

  .detail-facts span {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2xs);
    text-transform: capitalize;
  }

  .detail-facts strong { color: var(--color-ink); font-weight: 700; }
  .detail-fact--muted { opacity: 0.65; }

  .detail-description {
    display: grid;
    max-width: 65ch;
    justify-items: start;
    gap: var(--space-xs);
  }

  .detail-description p {
    display: -webkit-box;
    margin: 0;
    overflow: hidden;
    color: var(--color-ink-2);
    font-size: var(--text-base);
    line-height: 1.65;
    white-space: pre-line;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
    line-clamp: 4;
  }

  .detail-description p.detail-description--open { display: block; overflow: visible; }

  .detail-metadata {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-md) var(--space-lg);
    max-width: 50rem;
    margin: 0;
  }

  .detail-metadata > div { min-width: 0; }
  .detail-metadata__wide { grid-column: 1 / -1; }

  .detail-metadata dt {
    margin-block-end: var(--space-2xs);
    color: var(--color-muted);
    font-size: var(--text-xs);
    font-weight: 600;
  }

  .detail-metadata dd {
    display: flex;
    min-width: 0;
    flex-wrap: wrap;
    gap: var(--space-xs);
    margin: 0;
    color: var(--color-ink-2);
    font-size: var(--text-sm);
    text-transform: capitalize;
  }

  @media (min-width: 40rem) {
    .detail-hero {
      grid-template-columns: minmax(9rem, 12rem) minmax(0, 1fr);
      gap: var(--space-xl);
    }

    .detail-cover {
      position: sticky;
      inset-block-start: var(--space-3xl);
      width: 100%;
    }
  }

  @media (min-width: 60rem) {
    .detail-hero {
      grid-template-columns: minmax(11rem, 15rem) minmax(0, 1fr);
      gap: var(--space-2xl);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .detail-cover__image { transition: none; }
  }
</style>
