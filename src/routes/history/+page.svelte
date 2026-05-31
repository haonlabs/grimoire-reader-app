<script lang="ts">
  import { Trash2 } from 'lucide-svelte';
  import { history } from '$lib/stores/history';
  import { proxiedImageUrl } from '$lib/utils/image';
</script>

<section class="mb-6 flex items-end justify-between gap-3">
  <div>
    <p class="text-sm font-medium text-ember">History</p>
    <h1 class="mt-1 text-3xl font-bold">Reading progress</h1>
  </div>
  <button class="focus-ring rounded-lg border border-ember/30 px-3 py-2 text-sm text-ember" type="button" on:click={() => history.set([])}>
    <Trash2 size={17} />
  </button>
</section>

<div class="divide-y divide-ink/10 overflow-hidden rounded-lg border border-ink/10 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
  {#each $history as item (item.chapter.id)}
    <a class="flex gap-3 p-3 transition hover:bg-ink/5 dark:hover:bg-white/10" href={`/manga/${item.manga.sourceId}/${item.manga.id}/${item.chapter.id}`}>
      <img class="h-24 w-16 rounded object-cover" src={proxiedImageUrl(item.manga.coverUrl)} alt={item.manga.title} loading="lazy" />
      <div class="min-w-0 flex-1">
        <p class="font-semibold">{item.manga.title}</p>
        <p class="mt-1 text-sm text-ink/60 dark:text-white/60">Chapter {item.chapter.number || '?'} · page {item.lastPage + 1}/{item.totalPages}</p>
        <div class="mt-3 h-1.5 overflow-hidden rounded bg-ink/10 dark:bg-white/10">
          <div class="h-full bg-ember" style={`width: ${Math.min(100, ((item.lastPage + 1) / Math.max(1, item.totalPages)) * 100)}%`}></div>
        </div>
      </div>
    </a>
  {:else}
    <div class="p-6 text-sm text-ink/55 dark:text-white/55">No reading history yet.</div>
  {/each}
</div>
