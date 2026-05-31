<script lang="ts">
  import type { SourceMetadata } from '$lib/sources/types';

  export let sources: SourceMetadata[] = [];
  export let selected = 'mangadex';
</script>

<label class="grid gap-1 text-xs font-medium uppercase tracking-wide text-ink/55 dark:text-white/55">
  Source
  <select
    class="focus-ring rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm normal-case text-ink shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-white"
    bind:value={selected}
    on:change
  >
    {#each sources as source}
      <option value={source.id}>{source.name}</option>
    {/each}
  </select>
</label>
