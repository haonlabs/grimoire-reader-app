<script lang="ts">
  import type { Manga } from '$lib/sources/types';
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
  <div class="divide-y divide-ink/10 overflow-hidden rounded-lg border border-ink/10 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
    {#each items as manga (manga.sourceId + manga.id)}
      <a
        class="flex gap-3 p-3 transition hover:bg-ink/5 dark:hover:bg-white/10"
        href={`/manga/${manga.sourceId}/${manga.id}`}
      >
        <MangaCard {manga} compact />
        <div class="min-w-0 flex-1 py-1">
          <h3 class="font-semibold text-ink dark:text-white">{manga.title}</h3>
          <p class="mt-1 line-clamp-2 text-sm text-ink/60 dark:text-white/60">{manga.description}</p>
        </div>
      </a>
    {/each}
  </div>
{/if}
