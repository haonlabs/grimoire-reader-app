<script lang="ts">
  import { onMount } from 'svelte';
  import { Loader2 } from 'lucide-svelte';
  import MangaGrid from '$lib/components/manga/MangaGrid.svelte';
  import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
  import { settings } from '$lib/stores/settings';
  import type { Manga, MangaListResult, SourceMetadata } from '$lib/sources/types';

  export let data: { sources?: SourceMetadata[] };

  let items: Manga[] = [];
  let featured: Manga[] = [];
  let page = 1;
  let loading = false;
  let error = '';
  let hasNextPage = false;
  let view: 'grid' | 'list' = 'grid';
  let sort = 'popular';
  let status = 'all';
  let lastKey = '';

  $: sourceId = $settings.defaultSourceId;
  $: sources = data.sources ?? [];
  $: sourceName = sources.find((source) => source.id === sourceId)?.name ?? sourceId;
  $: visibleItems = status === 'all' ? items : items.filter((item) => item.status === status);
  $: key = `${sourceId}:${sort}`;
  $: if (key !== lastKey) {
    lastKey = key;
    loadList(1, true);
  }

  async function loadList(nextPage = page, replace = false) {
    loading = true;
    error = '';
    const filters = encodeURIComponent(JSON.stringify([{ id: 'sort', value: sort }]));
    try {
      const response = await fetch(`/api/${sourceId}/list?page=${nextPage}&filters=${filters}`);
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? 'Source failed');
      }
      const result = (await response.json()) as MangaListResult;
      items = replace ? result.items : [...items, ...result.items];
      page = result.page;
      hasNextPage = result.hasNextPage;
      if (replace) featured = result.items.slice(0, 6);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load manga';
      if (replace) {
        items = [];
        featured = [];
      }
    } finally {
      loading = false;
    }
  }

  onMount(() => loadList(1, true));

  function setSource(event: Event) {
    const target = event.target as HTMLSelectElement;
    settings.update((value) => ({ ...value, defaultSourceId: target.value }));
  }
</script>

<section class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
  <div>
    <p class="text-sm font-medium text-ember">Explore</p>
    <h1 class="mt-1 text-3xl font-bold">Browse manga</h1>
    <p class="mt-1 text-sm text-ink/55 dark:text-white/55">Current source: {sourceName}</p>
  </div>
  <div class="flex flex-wrap items-end gap-3">
    <label class="grid gap-1 text-xs font-medium uppercase tracking-wide text-ink/55 dark:text-white/55">
      Source
      <select
        class="focus-ring rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm normal-case text-ink dark:border-white/15 dark:bg-white/10 dark:text-white"
        value={sourceId}
        on:change={setSource}
      >
        {#each sources as source}
          <option value={source.id}>{source.name}</option>
        {/each}
      </select>
    </label>
    <FilterPanel bind:view bind:sort bind:status on:click={() => loadList(1, true)} />
  </div>
</section>

{#if featured.length}
  <section class="mb-8">
    <h2 class="mb-3 text-lg font-semibold">Featured from {$settings.defaultSourceId}</h2>
    <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {#each featured as manga (manga.id)}
        <a class="group relative aspect-[3/4] overflow-hidden rounded-lg bg-ink text-white" href={`/manga/${manga.sourceId}/${manga.id}`}>
          <img class="h-full w-full object-cover opacity-80 transition group-hover:scale-105" src={`/api/image-proxy?url=${encodeURIComponent(manga.coverUrl)}`} alt={manga.title} />
          <span class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 text-sm font-semibold">{manga.title}</span>
        </a>
      {/each}
    </div>
  </section>
{/if}

{#if error}
  <div class="rounded-lg border border-ember/30 bg-ember/10 p-4 text-sm text-ember">{error}</div>
{:else if loading && !items.length}
  <div class="grid place-items-center py-16 text-ink/50 dark:text-white/50">
    <Loader2 class="animate-spin" size={28} />
  </div>
{:else}
  {#if visibleItems.length}
    <MangaGrid items={visibleItems} {view} />
  {:else}
    <div class="rounded-lg border border-ink/10 bg-white p-6 text-sm text-ink/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
      Tidak ada manga yang bisa ditampilkan dari {sourceName}. Kalau source ini baru ditambahkan, kemungkinan parser-nya belum cocok dengan markup situs atau domainnya sedang tidak bisa diakses dari network ini.
    </div>
  {/if}
  {#if hasNextPage}
    <div class="mt-6 flex justify-center">
      <button
        class="focus-ring rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-ink"
        type="button"
        disabled={loading}
        on:click={() => loadList(page + 1)}
      >
        {loading ? 'Loading...' : 'Load more'}
      </button>
    </div>
  {/if}
{/if}
