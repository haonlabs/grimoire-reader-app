<script lang="ts">
  import { Grid2X2, List, RotateCcw } from 'lucide-svelte';

  export let view: 'grid' | 'list' = 'grid';
  export let sort = 'updated';
  export let status = 'all';
</script>

<div class="flex flex-wrap items-end gap-3">
  <label class="grid gap-1 text-xs font-medium uppercase tracking-wide text-white/55">
    Sort
    <select
      class="focus-ring rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm normal-case text-white"
      bind:value={sort}
      on:change
    >
      <option class="bg-ink" value="updated">Latest</option>
      <option class="bg-ink" value="newest">Newest added</option>
      <option class="bg-ink" value="popular">Popular</option>
      <option class="bg-ink" value="rating">Rating</option>
    </select>
  </label>

  <label class="grid gap-1 text-xs font-medium uppercase tracking-wide text-white/55">
    Status
    <select
      class="focus-ring rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm normal-case text-white"
      bind:value={status}
      on:change
    >
      <option class="bg-ink" value="all">All</option>
      <option class="bg-ink" value="ongoing">Ongoing</option>
      <option class="bg-ink" value="completed">Completed</option>
      <option class="bg-ink" value="hiatus">Hiatus</option>
    </select>
  </label>

  <div class="flex rounded-lg border border-white/10 bg-white/10 p-1">
    <button
      class="focus-ring rounded-md p-2 {view === 'grid' ? 'bg-violet-600 text-white' : 'text-white/60'}"
      type="button"
      title="Grid view"
      on:click={() => (view = 'grid')}
    >
      <Grid2X2 size={18} />
    </button>
    <button
      class="focus-ring rounded-md p-2 {view === 'list' ? 'bg-violet-600 text-white' : 'text-white/60'}"
      type="button"
      title="List view"
      on:click={() => (view = 'list')}
    >
      <List size={18} />
    </button>
  </div>

  <button
    class="focus-ring inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 text-sm text-white/70"
    type="button"
    on:click
  >
    <RotateCcw size={16} />
    Retry
  </button>
</div>
