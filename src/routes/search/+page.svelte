<script lang="ts">
  import { onMount } from 'svelte';
  import { page as pageStore } from '$app/stores';
  import MangaGrid from '$lib/components/manga/MangaGrid.svelte';
  import type { MangaListResult, SourceMetadata } from '$lib/sources/types';
  import { enabledSources } from '$lib/stores/settings';

  export let data: { sources: SourceMetadata[] };

  let query = '';
  let mode: 'active' | 'all' = 'active';
  let source = 'mangadex';
  let loading: Record<string, boolean> = {};
  let results: Record<string, MangaListResult> = {};
  let errors: Record<string, string> = {};
  let timer: ReturnType<typeof setTimeout>;

  $: query = $pageStore.url.searchParams.get('q') ?? query;
  $: mode = (($pageStore.url.searchParams.get('mode') as 'active' | 'all') ?? mode) || 'active';
  $: source = $pageStore.url.searchParams.get('source') ?? source;
  $: activeSources = mode === 'all' ? data.sources.filter((item) => $enabledSources.includes(item.id)) : data.sources.filter((item) => item.id === source);

  async function runSearch() {
    const selected = activeSources;
    results = {};
    errors = {};
    await Promise.all(
      selected.map(async (item) => {
        loading = { ...loading, [item.id]: true };
        try {
          const response = await fetch(`/api/${item.id}/search?q=${encodeURIComponent(query)}&page=1`);
          const body = await response.json();
          if (!response.ok) {
            errors = { ...errors, [item.id]: body.error ?? 'Source failed' };
          } else {
            results = { ...results, [item.id]: body };
          }
        } finally {
          loading = { ...loading, [item.id]: false };
        }
      })
    );
  }

  function scheduleSearch() {
    clearTimeout(timer);
    timer = setTimeout(runSearch, 300);
  }

  onMount(runSearch);
</script>

<section class="mb-6">
  <p class="text-sm font-medium text-ember">Search</p>
  <h1 class="mt-1 text-3xl font-bold">Find across grimoires</h1>
  <div class="mt-4 flex flex-col gap-3 sm:flex-row">
    <input
      class="focus-ring min-h-11 flex-1 rounded-lg border border-ink/10 bg-white px-3 text-ink dark:border-white/10 dark:bg-white/10 dark:text-white"
      bind:value={query}
      on:input={scheduleSearch}
      placeholder="Title, author, keyword"
    />
    <select class="focus-ring rounded-lg border border-ink/10 bg-white px-3 dark:border-white/10 dark:bg-white/10" bind:value={mode} on:change={runSearch}>
      <option value="active">Active source</option>
      <option value="all">All enabled sources</option>
    </select>
  </div>
</section>

<div class="grid gap-8">
  {#each activeSources as sourceMeta}
    <section>
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold">{sourceMeta.name}</h2>
        {#if loading[sourceMeta.id]}<span class="text-sm text-ink/50 dark:text-white/50">Loading...</span>{/if}
      </div>
      {#if errors[sourceMeta.id]}
        <div class="rounded-lg border border-ember/30 bg-ember/10 p-4 text-sm text-ember">
          {errors[sourceMeta.id]}
        </div>
      {:else if results[sourceMeta.id]?.items?.length}
        <MangaGrid items={results[sourceMeta.id].items} />
      {:else}
        <div class="rounded-lg border border-ink/10 bg-white p-4 text-sm text-ink/55 dark:border-white/10 dark:bg-white/5 dark:text-white/55">
          No results yet.
        </div>
      {/if}
    </section>
  {/each}
</div>
