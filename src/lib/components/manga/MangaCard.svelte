<script lang="ts">
  import { BookOpen, Star } from 'lucide-svelte';
  import type { Manga } from '$lib/sources/types';
  import { proxiedImageUrl } from '$lib/utils/image';

  export let manga: Manga;
  export let compact = false;
</script>

<a
  class="group block overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:border-white/10 dark:bg-white/5"
  href={`/manga/${manga.sourceId}/${manga.id}`}
>
  <div class="aspect-[2/3] bg-ink/10 dark:bg-white/10">
    {#if manga.coverUrl}
      <img
        class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        src={proxiedImageUrl(manga.coverUrl)}
        alt={manga.title}
        loading="lazy"
      />
    {:else}
      <div class="flex h-full items-center justify-center text-ink/40 dark:text-white/40">
        <BookOpen size={36} />
      </div>
    {/if}
  </div>
  <div class="space-y-2 p-3">
    <h3 class="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-ink dark:text-white">
      {manga.title}
    </h3>
    <div class="flex items-center justify-between gap-2 text-xs text-ink/60 dark:text-white/60">
      <span class="truncate capitalize">{manga.status}</span>
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
