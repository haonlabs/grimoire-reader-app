<script lang="ts">
  import { onMount } from 'svelte';
  import { LoaderCircle, SlidersHorizontal } from 'lucide-svelte';
  import { page as pageStore } from '$app/stores';
  import MangaGrid from '$lib/components/manga/MangaGrid.svelte';
  import MangaGridSkeleton from '$lib/components/manga/MangaGridSkeleton.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import type { MangaListResult, SourceMetadata } from '$lib/sources/types';
  import { enabledSources, settings } from '$lib/stores/settings';
  import { sourceFetch } from '$lib/utils/sourceUnlock';

  export let data: { sources: SourceMetadata[] };

  let query = '';
  let mode: 'active' | 'all' = 'active';
  let source = 'shinigami';
  let loading: Record<string, boolean> = {};
  let results: Record<string, MangaListResult> = {};
  let errors: Record<string, string> = {};
  let timer: ReturnType<typeof setTimeout>;

  $: anyLoading = Object.values(loading).some(Boolean);
  $: query = $pageStore.url.searchParams.get('q') ?? query;
  $: mode = (($pageStore.url.searchParams.get('mode') as 'active' | 'all') ?? mode) || 'active';
  $: implementedSources = data.sources.filter((item) => item.isImplemented !== false && $enabledSources.includes(item.id));
  $: requestedSource = $pageStore.url.searchParams.get('source') ?? $settings.defaultSourceId;
  $: source = implementedSources.some((item) => item.id === requestedSource)
    ? requestedSource
    : (implementedSources[0]?.id ?? 'shinigami');
  $: activeSources =
    mode === 'all'
      ? implementedSources
      : implementedSources.filter((item) => item.id === source);
  $: sourceNames = Object.fromEntries(implementedSources.map((item) => [item.id, item.name]));

  async function runSearch() {
    const selected = activeSources;
    results = {};
    errors = {};
    await Promise.all(
      selected.map(async (item) => {
        loading = { ...loading, [item.id]: true };
        try {
          const response = await sourceFetch(fetch, item.id, `/api/${item.id}/search?q=${encodeURIComponent(query)}&page=1`);
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

<section class="mb-6 rounded-lg border border-white/10 bg-[#111116] p-4 shadow-soft">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <p class="text-sm font-semibold uppercase tracking-wide text-violet-300">Search</p>
      <div class="mt-1 flex items-center gap-3">
        <h1 class="text-3xl font-extrabold text-white">Cari komik</h1>
        {#if anyLoading}
          <LoaderCircle class="animate-spin text-violet-300" size={22} aria-label="Searching" />
        {/if}
      </div>
    </div>
    <a
      class="focus-ring inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white"
      href="/sources"
    >
      <SlidersHorizontal size={17} />
      Manage Sources
    </a>
  </div>
  <div class="mt-4 flex flex-col gap-3 sm:flex-row">
    <input
      class="focus-ring min-h-11 flex-1 rounded-lg border border-white/10 bg-white/10 px-3 text-white placeholder:text-white/40"
      bind:value={query}
      on:input={scheduleSearch}
      placeholder="Title, author, keyword"
    />
    <select class="focus-ring rounded-lg border border-white/10 bg-white/10 px-3 text-white" bind:value={mode} on:change={runSearch}>
      <option class="bg-ink" value="active">Komik dari source aktif</option>
      <option class="bg-ink" value="all">Komik dari semua source aktif</option>
    </select>
  </div>
</section>

<div class="grid gap-8">
  {#each activeSources as sourceMeta}
    <section>
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-white">{sourceMeta.name}</h2>
        {#if loading[sourceMeta.id]}
          <span class="inline-flex items-center gap-2 text-xs font-semibold text-violet-300">
            <LoaderCircle class="animate-spin" size={15} />
            Loading
          </span>
        {/if}
      </div>
      {#if errors[sourceMeta.id]}
        <div class="rounded-lg border border-ember/30 bg-ember/10 p-4 text-sm text-ember">
          {errors[sourceMeta.id]}
        </div>
      {:else if loading[sourceMeta.id] && !results[sourceMeta.id]?.items?.length}
        <MangaGridSkeleton count={6} />
      {:else if results[sourceMeta.id]?.items?.length}
        <MangaGrid items={results[sourceMeta.id].items} {sourceNames} />
      {:else}
        <div class="rounded-lg border border-white/10 bg-[#111116] p-4 text-sm text-white/55">
          No results yet.
        </div>
      {/if}
    </section>
  {/each}
</div>
