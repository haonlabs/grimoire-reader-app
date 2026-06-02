<script lang="ts">
  import { Grid2X2, List, RotateCcw } from 'lucide-svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Select from '$lib/components/ui/Select.svelte';

  export let view: 'grid' | 'list' = 'grid';
  export let sort = 'updated';
  export let status = 'all';
  export let loading = false;
</script>

<div class="flex flex-wrap items-end gap-3">
  <label class="grid gap-1 text-xs font-medium uppercase tracking-wide text-white/55">
    Sort
    <Select bind:value={sort} on:change>
      <option class="bg-ink" value="updated">Latest</option>
      <option class="bg-ink" value="newest">Newest added</option>
      <option class="bg-ink" value="popular">Popular</option>
      <option class="bg-ink" value="rating">Rating</option>
    </Select>
  </label>

  <label class="grid gap-1 text-xs font-medium uppercase tracking-wide text-white/55">
    Status
    <Select bind:value={status} on:change>
      <option class="bg-ink" value="all">All</option>
      <option class="bg-ink" value="ongoing">Ongoing</option>
      <option class="bg-ink" value="completed">Completed</option>
      <option class="bg-ink" value="hiatus">Hiatus</option>
    </Select>
  </label>

  <div class="flex rounded-lg border border-white/10 bg-white/10 p-1">
    <Button
      variant={view === 'grid' ? 'default' : 'ghost'}
      size="icon"
      class="h-9 w-9 border-0"
      title="Grid view"
      on:click={() => (view = 'grid')}
    >
      <Grid2X2 size={18} />
    </Button>
    <Button
      variant={view === 'list' ? 'default' : 'ghost'}
      size="icon"
      class="h-9 w-9 border-0"
      title="List view"
      on:click={() => (view = 'list')}
    >
      <List size={18} />
    </Button>
  </div>

  <Button variant="secondary" {loading} on:click>
    <RotateCcw size={16} />
    Retry
  </Button>
</div>
