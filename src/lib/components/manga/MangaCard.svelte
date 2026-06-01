<script lang="ts">
  import { tick } from 'svelte';
  import { BookOpen, Star } from 'lucide-svelte';
  import type { Manga } from '$lib/sources/types';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import { mangaFormatLabel } from '$lib/utils/mangaFormat';
  import { proxiedImageUrl } from '$lib/utils/image';

  export let manga: Manga;
  export let compact = false;

  let coverLoaded = false;
  let coverFailed = false;
  let coverElement: HTMLImageElement | undefined;
  let lastCoverUrl = '';
  let coverCheckQueued = false;
  $: format = mangaFormatLabel(manga);
  $: coverUrl = manga.coverUrl ?? '';
  $: if (coverUrl !== lastCoverUrl) {
    lastCoverUrl = coverUrl;
    coverLoaded = false;
    coverFailed = false;
  }
  $: if (coverElement && coverUrl && !coverLoaded && !coverFailed) checkCachedCover();

  async function checkCachedCover() {
    if (coverCheckQueued) return;
    coverCheckQueued = true;
    await tick();
    coverCheckQueued = false;
    if (!coverElement || coverLoaded || coverFailed) return;
    if (!coverElement.complete) return;
    if (coverElement.naturalWidth > 0) coverLoaded = true;
    else coverFailed = true;
  }
</script>

<a
  class="group block overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:border-white/10 dark:bg-[#141416]"
  href={`/manga/${manga.sourceId}/${manga.id}`}
>
  <div class="relative aspect-[2/3] bg-ink/10 dark:bg-white/10">
    {#if manga.coverUrl && !coverFailed}
      {#if !coverLoaded}
        <Skeleton class="absolute inset-0 rounded-none" />
      {/if}
      <img
        bind:this={coverElement}
        class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] {coverLoaded ? 'opacity-100' : 'opacity-0'}"
        src={proxiedImageUrl(manga.coverUrl)}
        alt={manga.title}
        loading="lazy"
        on:load={() => (coverLoaded = true)}
        on:error={() => {
          coverLoaded = true;
          coverFailed = true;
        }}
      />
    {:else}
      <div class="flex h-full items-center justify-center text-ink/40 dark:text-white/40">
        <BookOpen size={36} />
      </div>
    {/if}
    <span class="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-soft">
      {format}
    </span>
    <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3 text-white">
      <h3 class="line-clamp-2 min-h-10 text-sm font-semibold leading-5">
        {manga.title}
      </h3>
    </div>
  </div>
  <div class="space-y-2 p-3">
    <div class="flex flex-wrap items-center gap-2 text-xs text-ink/60 dark:text-white/60">
      <span class="truncate rounded-full bg-ink/5 px-2 py-1 capitalize dark:bg-white/10">{manga.status}</span>
      <span class="shrink-0 rounded-full bg-violet-500/15 px-2 py-1 font-semibold text-violet-200">{format}</span>
      {#if manga.rating}
        <span class="inline-flex items-center gap-1">
          <Star size={13} class="fill-gold text-gold" />
          {manga.rating.toFixed(1)}
        </span>
      {/if}
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
  </div>
</a>
