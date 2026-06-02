<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Trash2 } from 'lucide-svelte';
  import { history } from '$lib/stores/history';
  import { preloadImages, proxiedImageUrl } from '$lib/utils/image';

  let preloadKey = '';
  let stopImagePreload: () => void = () => {};

  $: nextPreloadKey = $history.map((item) => item.manga.coverUrl).filter(Boolean).join('\n');
  $: if (nextPreloadKey !== preloadKey) {
    preloadKey = nextPreloadKey;
    stopImagePreload();
    stopImagePreload = preloadImages($history.map((item) => item.manga.coverUrl));
  }

  onDestroy(() => stopImagePreload());
</script>

<section class="mb-6 flex items-end justify-between gap-3 rounded-lg border border-white/10 bg-[#111116] p-4 shadow-soft">
  <div>
    <p class="text-sm font-medium text-ember">History</p>
    <h1 class="mt-1 text-3xl font-bold text-white">Reading progress</h1>
  </div>
  <button class="focus-ring rounded-lg border border-ember/30 px-3 py-2 text-sm text-ember" type="button" on:click={() => history.set([])}>
    <Trash2 size={17} />
  </button>
</section>

<div class="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10 bg-[#111116]">
  {#each $history as item (item.chapter.id)}
    <a class="flex gap-3 p-3 transition hover:bg-white/10" href={`/manga/${item.manga.sourceId}/${item.manga.id}/${item.chapter.id}`}>
      <img class="h-24 w-16 rounded object-cover" src={proxiedImageUrl(item.manga.coverUrl)} alt={item.manga.title} loading="eager" decoding="async" />
      <div class="min-w-0 flex-1">
        <p class="font-semibold text-white">{item.manga.title}</p>
        <p class="mt-1 text-sm text-white/60">Chapter {item.chapter.number || '?'}</p>
        <div class="mt-3 h-1.5 overflow-hidden rounded bg-white/10">
          <div class="h-full bg-ember" style={`width: ${Math.min(100, ((item.lastPage + 1) / Math.max(1, item.totalPages)) * 100)}%`}></div>
        </div>
      </div>
    </a>
  {:else}
    <div class="p-6 text-sm text-white/55">No reading history yet.</div>
  {/each}
</div>
