<script lang="ts">
  import { onMount } from 'svelte';
  import { RefreshCw } from 'lucide-svelte';
  import { library } from '$lib/stores/library';
  import type { Chapter, Manga } from '$lib/sources/types';

  interface UpdateEntry {
    manga: Manga;
    chapter: Chapter;
  }

  let loading = false;
  let updates: UpdateEntry[] = [];

  async function checkUpdates() {
    loading = true;
    const next: UpdateEntry[] = [];
    for (const entry of $library) {
      try {
        const response = await fetch(`/api/${entry.manga.sourceId}/manga/${entry.manga.id}/chapters`);
        if (!response.ok) continue;
        const chapters = (await response.json()) as Chapter[];
        for (const chapter of chapters.slice(0, 3)) next.push({ manga: entry.manga, chapter });
      } catch {
        // Individual source failures should not block the whole feed.
      }
    }
    updates = next.sort((a, b) => b.chapter.uploadedAt.localeCompare(a.chapter.uploadedAt));
    loading = false;
  }

  onMount(checkUpdates);
</script>

<section class="mb-6 flex items-end justify-between gap-3">
  <div>
    <p class="text-sm font-medium text-ember">Updates</p>
    <h1 class="mt-1 text-3xl font-bold">Latest library chapters</h1>
  </div>
  <button class="focus-ring inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white dark:bg-white dark:text-ink" type="button" on:click={checkUpdates}>
    <RefreshCw class={loading ? 'animate-spin' : ''} size={17} />
    Check
  </button>
</section>

<div class="divide-y divide-ink/10 overflow-hidden rounded-lg border border-ink/10 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
  {#each updates as item (item.chapter.id)}
    <a class="block p-4 transition hover:bg-ink/5 dark:hover:bg-white/10" href={`/manga/${item.manga.sourceId}/${item.manga.id}/${item.chapter.id}`}>
      <p class="font-semibold">{item.manga.title}</p>
      <p class="mt-1 text-sm text-ink/60 dark:text-white/60">Chapter {item.chapter.number || '?'} · {new Date(item.chapter.uploadedAt).toLocaleString()}</p>
    </a>
  {:else}
    <div class="p-6 text-sm text-ink/55 dark:text-white/55">
      {loading ? 'Checking your library...' : 'No updates found. Add manga to the library first.'}
    </div>
  {/each}
</div>
