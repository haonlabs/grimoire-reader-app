<script lang="ts">
  import { Search } from 'lucide-svelte';
  import { goto } from '$app/navigation';

  export let activeSource = 'mangadex';
  let query = '';
  let mode: 'active' | 'all' = 'active';

  function submit() {
    const params = new URLSearchParams({ q: query, mode, source: activeSource });
    goto(`/search?${params.toString()}`);
  }
</script>

<form class="relative flex min-w-0 flex-1 items-center" on:submit|preventDefault={submit}>
  <Search class="pointer-events-none absolute left-3 text-ink/45 dark:text-white/45" size={18} />
  <input
    class="focus-ring h-11 w-full rounded-lg border border-ink/10 bg-white pl-10 pr-28 text-sm text-ink placeholder:text-ink/45 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-white/45"
    bind:value={query}
    placeholder="Search manga"
  />
  <select
    class="absolute right-1.5 h-8 rounded-md border border-ink/10 bg-paper px-2 text-xs text-ink dark:border-white/10 dark:bg-ink dark:text-white"
    bind:value={mode}
    aria-label="Search mode"
  >
    <option value="active">Active</option>
    <option value="all">All sources</option>
  </select>
</form>
