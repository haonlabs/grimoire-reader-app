<script lang="ts">
  import SkeletonProgress from '$lib/components/ui/SkeletonProgress.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';

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
      <Card class="overflow-hidden border-ink/10 bg-white dark:border-white/10 dark:bg-white/5">
        <Skeleton class="aspect-[2/3] rounded-none" />
        <div class="space-y-2 p-3">
          <Skeleton class="h-4 w-11/12" />
          <Skeleton class="h-4 w-2/3" />
          <div class="flex gap-2 pt-1">
            <Skeleton class="h-5 w-16" />
            <Skeleton class="h-5 w-12" />
          </div>
        </div>
      </Card>
    {/each}
  </div>
{:else}
  <div class="grid gap-3" aria-hidden="true">
    {#each Array(Math.min(count, 6)) as _}
      <Card class="flex gap-3 border-ink/10 bg-white p-3 dark:border-white/10 dark:bg-white/5">
        <Skeleton class="h-28 w-20 shrink-0" />
        <div class="min-w-0 flex-1 space-y-3 py-1">
          <Skeleton class="h-4 w-3/4" />
          <Skeleton class="h-3 w-full" />
          <Skeleton class="h-3 w-5/6" />
          <Skeleton class="h-5 w-24" />
        </div>
      </Card>
    {/each}
  </div>
{/if}
