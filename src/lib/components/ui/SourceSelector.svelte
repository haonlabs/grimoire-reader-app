<script lang="ts">
  import Select from '$lib/components/ui/Select.svelte';
  import type { SourceMetadata } from '$lib/sources/types';

  export let sources: SourceMetadata[] = [];
  export let selected = 'mangadex';
</script>

<label class="grid gap-1 text-xs font-medium uppercase tracking-wide text-ink/55 dark:text-white/55">
  Source
  <Select class="border-ink/15 bg-white text-ink dark:border-white/15 dark:bg-white/10 dark:text-white" bind:value={selected} on:change>
    {#each sources as source}
      <option value={source.id}>{source.name}</option>
    {/each}
  </Select>
</label>
