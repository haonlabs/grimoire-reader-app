<script lang="ts">
  import { onMount } from 'svelte';
  import { RefreshCw } from 'lucide-svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import { library } from '$lib/stores/library';
  import type { Chapter, Manga } from '$lib/sources/types';
  import { sourceFetch } from '$lib/utils/sourceUnlock';

  interface UpdateEntry {
    manga: Manga;
    chapter: Chapter;
  }

  let loading = false;
  let updates: UpdateEntry[] = [];

  async function checkUpdates(force = false) {
    loading = true;
    const next: UpdateEntry[] = [];
    for (const entry of $library) {
      try {
        const response = await sourceFetch(fetch, entry.manga.sourceId, `/api/${entry.manga.sourceId}/manga/${entry.manga.id}/chapters`, force ? { cache: 'reload' } : {});
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

  onMount(() => checkUpdates());
</script>

<section class="mb-6 flex items-end justify-between gap-3 rounded-lg border border-white/10 bg-[#111116] p-4 shadow-soft">
  <div>
    <p class="text-sm font-medium text-ember">Updates</p>
    <h1 class="mt-1 text-3xl font-bold text-white">Latest library chapters</h1>
  </div>
  <button class="focus-ring inline-flex items-center gap-2 rounded-lg bg-ember px-3 py-2 text-sm font-semibold text-white" type="button" on:click={() => checkUpdates(true)}>
    <RefreshCw class={loading ? 'animate-spin' : ''} size={17} />
    Check
  </button>
</section>

<div class="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10 bg-[#111116]">
  {#each updates as item (item.chapter.id)}
    <a class="block p-4 transition hover:bg-white/10" href={`/manga/${item.manga.sourceId}/${item.manga.id}/${item.chapter.id}`}>
      <p class="font-semibold text-white">{item.manga.title}</p>
      <p class="mt-1 text-sm text-white/60">Chapter {item.chapter.number || '?'} · {new Date(item.chapter.uploadedAt).toLocaleString()}</p>
    </a>
  {:else}
    {#if loading}
      <div class="grid gap-3 p-4" aria-label="Checking library updates">
        {#each Array(4) as _}
          <div class="space-y-2 rounded-lg border border-white/10 p-3">
            <Skeleton class="h-4 w-2/3" />
            <Skeleton class="h-3 w-1/2" />
          </div>
        {/each}
      </div>
    {:else}
      <div class="p-6 text-sm text-white/55">No updates found. Add manga to the library first.</div>
    {/if}
  {/each}
</div>
