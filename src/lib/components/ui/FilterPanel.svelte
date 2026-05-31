<script lang="ts">
  import { Grid2X2, List, RotateCcw } from 'lucide-svelte';

  export let view: 'grid' | 'list' = 'grid';
  export let sort = 'popular';
  export let status = 'all';
</script>

<div class="flex flex-wrap items-end gap-3">
  <label class="grid gap-1 text-xs font-medium uppercase tracking-wide text-ink/55 dark:text-white/55">
    Sort
    <select
      class="focus-ring rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm normal-case text-ink dark:border-white/15 dark:bg-white/10 dark:text-white"
      bind:value={sort}
      on:change
    >
      <option value="popular">Popular</option>
      <option value="newest">Newest</option>
      <option value="updated">Updated</option>
      <option value="rating">Rating</option>
    </select>
  </label>

  <label class="grid gap-1 text-xs font-medium uppercase tracking-wide text-ink/55 dark:text-white/55">
    Status
    <select
      class="focus-ring rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm normal-case text-ink dark:border-white/15 dark:bg-white/10 dark:text-white"
      bind:value={status}
      on:change
    >
      <option value="all">All</option>
      <option value="ongoing">Ongoing</option>
      <option value="completed">Completed</option>
      <option value="hiatus">Hiatus</option>
    </select>
  </label>

  <div class="flex rounded-lg border border-ink/10 bg-white p-1 dark:border-white/10 dark:bg-white/10">
    <button
      class="focus-ring rounded-md p-2 {view === 'grid' ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'text-ink/60 dark:text-white/60'}"
      type="button"
      title="Grid view"
      on:click={() => (view = 'grid')}
    >
      <Grid2X2 size={18} />
    </button>
    <button
      class="focus-ring rounded-md p-2 {view === 'list' ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'text-ink/60 dark:text-white/60'}"
      type="button"
      title="List view"
      on:click={() => (view = 'list')}
    >
      <List size={18} />
    </button>
  </div>

  <button
    class="focus-ring inline-flex h-10 items-center gap-2 rounded-lg border border-ink/10 bg-white px-3 text-sm text-ink/70 dark:border-white/10 dark:bg-white/10 dark:text-white/70"
    type="button"
    on:click
  >
    <RotateCcw size={16} />
    Retry
  </button>
</div>
