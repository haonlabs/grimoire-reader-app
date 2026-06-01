<script lang="ts">
  import SkeletonProgress from '$lib/components/ui/SkeletonProgress.svelte';

  export let count = 12;
  export let view: 'grid' | 'list' = 'grid';
  export let label = 'Memuat komik';
</script>

<div class="mb-3 max-w-md">
  <SkeletonProgress {label} />
</div>

{#if view === 'grid'}
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" aria-hidden="true">
    {#each Array(count) as _}
      <div class="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
        <div class="aspect-[2/3] shimmer bg-ink/10 dark:bg-white/10"></div>
        <div class="space-y-2 p-3">
          <div class="h-4 w-11/12 rounded shimmer bg-ink/10 dark:bg-white/10"></div>
          <div class="h-4 w-2/3 rounded shimmer bg-ink/10 dark:bg-white/10"></div>
          <div class="flex gap-2 pt-1">
            <div class="h-5 w-16 rounded shimmer bg-ink/10 dark:bg-white/10"></div>
            <div class="h-5 w-12 rounded shimmer bg-ink/10 dark:bg-white/10"></div>
          </div>
        </div>
      </div>
    {/each}
  </div>
{:else}
  <div class="grid gap-3" aria-hidden="true">
    {#each Array(Math.min(count, 6)) as _}
      <div class="flex gap-3 rounded-lg border border-ink/10 bg-white p-3 dark:border-white/10 dark:bg-white/5">
        <div class="h-28 w-20 shrink-0 rounded shimmer bg-ink/10 dark:bg-white/10"></div>
        <div class="min-w-0 flex-1 space-y-3 py-1">
          <div class="h-4 w-3/4 rounded shimmer bg-ink/10 dark:bg-white/10"></div>
          <div class="h-3 w-full rounded shimmer bg-ink/10 dark:bg-white/10"></div>
          <div class="h-3 w-5/6 rounded shimmer bg-ink/10 dark:bg-white/10"></div>
          <div class="h-5 w-24 rounded shimmer bg-ink/10 dark:bg-white/10"></div>
        </div>
      </div>
    {/each}
  </div>
{/if}
