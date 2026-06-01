<script lang="ts">
  import { BookOpen, Star } from 'lucide-svelte';
  import type { Manga } from '$lib/sources/types';
  import { mangaFormatLabel } from '$lib/utils/mangaFormat';
  import { proxiedImageUrl } from '$lib/utils/image';
  import MangaCard from './MangaCard.svelte';

  export let items: Manga[] = [];
  export let view: 'grid' | 'list' = 'grid';
</script>

{#if view === 'grid'}
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
    {#each items as manga (manga.sourceId + manga.id)}
      <MangaCard {manga} />
    {/each}
  </div>
{:else}
  <div class="grid gap-3">
    {#each items as manga (manga.sourceId + manga.id)}
      <a
        class="group flex gap-3 overflow-hidden rounded-lg border border-ink/10 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:border-white/10 dark:bg-[#141416]"
        href={`/manga/${manga.sourceId}/${manga.id}`}
      >
        <div class="h-28 w-20 shrink-0 overflow-hidden rounded bg-ink/10 dark:bg-white/10">
          {#if manga.coverUrl}
            <img
              class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
              src={proxiedImageUrl(manga.coverUrl)}
              alt={manga.title}
              loading="lazy"
            />
          {:else}
            <div class="flex h-full items-center justify-center text-ink/40 dark:text-white/40">
              <BookOpen size={24} />
            </div>
          {/if}
        </div>
        <div class="min-w-0 flex-1 py-1">
          <h3 class="font-semibold text-ink dark:text-white">{manga.title}</h3>
          <p class="mt-1 line-clamp-2 text-sm text-ink/60 dark:text-white/60">{manga.description}</p>
          <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink/55 dark:text-white/55">
            <span class="rounded-full bg-violet-500/15 px-2 py-1 font-semibold text-violet-200">{mangaFormatLabel(manga)}</span>
            <span class="rounded-full bg-ink/5 px-2 py-1 capitalize dark:bg-white/10">{manga.status}</span>
            {#if manga.rating}
              <span class="inline-flex items-center gap-1">
                <Star size={13} class="fill-gold text-gold" />
                {manga.rating.toFixed(1)}
              </span>
            {/if}
            {#each manga.genres.slice(0, 2) as genre}
              <span>{genre}</span>
            {/each}
          </div>
        </div>
      </a>
    {/each}
  </div>
{/if}
