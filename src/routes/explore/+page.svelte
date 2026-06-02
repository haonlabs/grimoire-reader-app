<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page as pageStore } from '$app/stores';
  import MangaGrid from '$lib/components/manga/MangaGrid.svelte';
  import MangaGridSkeleton from '$lib/components/manga/MangaGridSkeleton.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import type { Manga, MangaListResult, SourceMetadata } from '$lib/sources/types';
  import { enabledSources, settings } from '$lib/stores/settings';
  import { proxiedImageUrl } from '$lib/utils/image';
  import { mangaFormatLabel } from '$lib/utils/mangaFormat';
  import { sourceFetch } from '$lib/utils/sourceUnlock';
  import { ChevronRight, Megaphone } from 'lucide-svelte';
  import { onDestroy, onMount } from 'svelte';

  export let data: { sources?: SourceMetadata[] };

  let items: Manga[] = [];
  let featured: Manga[] = [];
  let page = 1;
  let loading = false;
  let error = '';
  let hasNextPage = false;
  let view: 'grid' | 'list' = 'grid';
  let sort = 'updated';
  let status = 'all';
  let lastKey = '';
  let mounted = false;
  let requestId = 0;
  let loadingStartedAt = 0;
  let activeController: AbortController | undefined;
  let activeTimeout: number | undefined;
  let recoveryTimer: number | undefined;
  let formatTab = 'Manhwa';
  let updateTab = 'Project';

  $: sources = (data.sources ?? []).filter((source) => source.isImplemented !== false && $enabledSources.includes(source.id));
  $: sourceId = sources.some((source) => source.id === $settings.defaultSourceId)
    ? $settings.defaultSourceId
    : (sources[0]?.id ?? 'shinigami');
  $: sourceName = sources.find((source) => source.id === sourceId)?.name ?? sourceId;
  $: requestedPage = Math.max(1, Number($pageStore.url.searchParams.get('page') ?? 1));
  $: visibleItems = status === 'all' ? items : items.filter((item) => item.status === status);
  $: hero = featured[0] ?? visibleItems[0];
  $: recommendedMatches = visibleItems.filter((item) =>
    mangaFormatLabel(item).toLowerCase() === formatTab.toLowerCase()
  );
  $: recommended = (recommendedMatches.length ? recommendedMatches : visibleItems).slice(0, 6);
  $: updateItems = (updateTab === 'Mirror' ? [...visibleItems].reverse() : visibleItems).slice(0, 24);
  $: key = `${sourceId}:${sort}:${requestedPage}`;
  $: if (browser && sources.length && sourceId !== $settings.defaultSourceId) {
    settings.update((value) => ({ ...value, defaultSourceId: sourceId }));
  }
  $: if (browser && mounted && key !== lastKey) {
    lastKey = key;
    loadList(requestedPage, { scrollToTop: true });
  }

  function uniqueManga(nextItems: Manga[]) {
    const seen = new Set<string>();
    return nextItems.filter((item) => {
      const key = `${item.sourceId}:${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function pageUrl(nextPage: number) {
    const url = new URL($pageStore.url);
    if (nextPage > 1) url.searchParams.set('page', String(nextPage));
    else url.searchParams.delete('page');
    return `${url.pathname}${url.search}`;
  }

  async function setExplorePage(nextPage: number) {
    const targetPage = Math.max(1, nextPage);
    window.scrollTo({ top: 0, behavior: 'auto' });
    await goto(pageUrl(targetPage), {
      keepFocus: true,
      noScroll: true
    });
  }

  async function loadList(nextPage = page, options: { scrollToTop?: boolean } = {}) {
    activeController?.abort();
    if (activeTimeout) window.clearTimeout(activeTimeout);
    const currentRequest = ++requestId;
    const controller = new AbortController();
    activeController = controller;
    activeTimeout = window.setTimeout(() => controller.abort(), 20_000);
    loading = true;
    loadingStartedAt = Date.now();
    error = '';
    const filters = encodeURIComponent(JSON.stringify([{ id: 'sort', value: sort }]));
    try {
      const response = await sourceFetch(fetch, sourceId, `/api/${sourceId}/list?page=${nextPage}&filters=${filters}`, {
        signal: controller.signal
      });
      if (currentRequest !== requestId) return;
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? 'Source failed');
      }
      const result = (await response.json()) as MangaListResult;
      if (currentRequest !== requestId) return;
      items = uniqueManga(result.items);
      page = result.page;
      hasNextPage = result.hasNextPage;
      featured = result.items.slice(0, 6);
      if (options.scrollToTop) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    } catch (err) {
      if (currentRequest !== requestId) return;
      error = err instanceof Error && err.name === 'AbortError' ? 'Source terlalu lama merespons. Coba refresh atau pilih source lain.' : err instanceof Error ? err.message : 'Unable to load manga';
      items = [];
      featured = [];
    } finally {
      if (activeTimeout) window.clearTimeout(activeTimeout);
      if (activeController === controller) activeController = undefined;
      if (currentRequest === requestId) loading = false;
    }
  }

  function recoverStuckLoading() {
    if (!loading || items.length || Date.now() - loadingStartedAt < 5_000) return;
    activeController?.abort();
    loading = false;
    loadList(requestedPage);
  }

  onMount(() => {
    mounted = true;
    lastKey = key;
    page = requestedPage;
    if (sources.length) loadList(requestedPage);
    else {
      loading = false;
      error = 'Belum ada source yang ditambahkan. Buka Profile > All Series untuk add source.';
    }
    recoveryTimer = window.setInterval(recoverStuckLoading, 2_000);
    window.addEventListener('pageshow', recoverStuckLoading);
  });

  onDestroy(() => {
    activeController?.abort();
    if (!browser) return;
    if (activeTimeout) window.clearTimeout(activeTimeout);
    if (recoveryTimer) window.clearInterval(recoveryTimer);
    window.removeEventListener('pageshow', recoverStuckLoading);
  });

  function setSource(event: Event) {
    const target = event.target as HTMLSelectElement;
    settings.update((value) => ({ ...value, defaultSourceId: target.value }));
    setExplorePage(1);
  }
</script>

<section class="mb-5 grid gap-3 lg:grid-cols-[1fr_20rem]">
  <a
    class="group relative min-h-[18rem] overflow-hidden rounded-lg border border-white/10 bg-[#141416]"
    href={hero ? `/manga/${hero.sourceId}/${hero.id}` : '/search'}
  >
    {#if hero?.coverUrl}
      <img
        class="absolute inset-0 h-full w-full object-cover opacity-55 transition duration-500 group-hover:scale-[1.03]"
        src={proxiedImageUrl(hero.coverUrl)}
        alt={hero.title}
        loading="eager"
        fetchpriority="high"
        decoding="async"
      />
    {:else}
      <Skeleton class="absolute inset-0 rounded-none" />
    {/if}
    <div class="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/15"></div>
    <div class="relative flex min-h-[18rem] max-w-2xl flex-col justify-end p-5 sm:p-7">
      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-300">{sourceName}</p>
      <h1 class="line-clamp-2 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
        {hero?.title ?? 'GRIMOIRE'}
      </h1>
      <p class="mt-3 line-clamp-3 text-sm leading-6 text-white/70">
        {hero?.description ?? 'Baca manhwa, manga, dan manhua dengan tampilan clean seperti Shinigami.'}
      </p>
      <div class="mt-5 inline-flex w-fit items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white">
        Baca
        <ChevronRight size={17} />
      </div>
    </div>
  </a>

  <section class="rounded-lg border border-white/10 bg-[#141416] p-4">
    <div class="mb-3 flex items-center gap-2">
      <Megaphone size={18} class="text-violet-300" />
      <h2 class="text-base font-semibold text-white">Pengumuman</h2>
    </div>
    <div class="space-y-3 text-sm leading-6 text-white/65">
      <p>Source aktif: {sourceName}</p>
      <p>Reading mode dibuat scrolling clean, menu muncul saat area baca di-tap.</p>
      <p>Library, history, dan setting tetap tersimpan lokal di browser ini.</p>
    </div>
  </section>
</section>

<Card class="mb-5 flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
  <label class="grid gap-1 text-xs font-medium uppercase tracking-wide text-white/55">
    Source
    <Select
      value={sourceId}
      on:change={setSource}
    >
      {#each sources as source}
        <option class="bg-ink" value={source.id}>{source.name}</option>
      {/each}
    </Select>
  </label>
  <FilterPanel bind:view bind:sort bind:status on:click={() => setExplorePage(1)} />
</Card>

{#if recommended.length}
  <section class="mb-8">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-xl font-bold text-white">Rekomendasi</h2>
      <div class="flex rounded-lg border border-white/10 bg-[#141416] p-1">
        {#each ['Manhwa', 'Manga', 'Manhua'] as tab}
          <Button
            variant={formatTab === tab ? 'default' : 'ghost'}
            size="sm"
            class="border-0"
            on:click={() => (formatTab = tab)}
          >
            {tab}
          </Button>
        {/each}
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {#each recommended as manga (manga.id)}
        <a class="group relative aspect-[2/3] overflow-hidden rounded-lg bg-[#141416] text-white" href={`/manga/${manga.sourceId}/${manga.id}`}>
          {#if manga.coverUrl}
            <img class="h-full w-full object-cover transition group-hover:scale-105" src={proxiedImageUrl(manga.coverUrl)} alt={manga.title} loading="eager" decoding="async" />
          {:else}
            <Skeleton class="h-full w-full rounded-none" />
          {/if}
          <span class="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            {mangaFormatLabel(manga)}
          </span>
          <span class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 text-sm font-semibold">{manga.title}</span>
        </a>
      {/each}
    </div>
  </section>
{/if}

{#if error}
  <div class="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
{:else if loading && !items.length}
  <section class="mb-8" aria-label="Loading featured manga">
    <Skeleton class="mb-3 h-6 w-44" />
    <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {#each Array(6) as _}
        <Skeleton class="aspect-[3/4] rounded-lg" />
      {/each}
    </div>
  </section>
  <MangaGridSkeleton {view} />
{:else}
  {#if updateItems.length}
    <section>
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-xl font-bold text-white">Update</h2>
        <div class="flex items-center gap-2">
          <div class="flex rounded-lg border border-white/10 bg-[#141416] p-1">
            {#each ['Project', 'Mirror'] as tab}
              <Button
                variant={updateTab === tab ? 'default' : 'ghost'}
                size="sm"
                class="border-0"
                on:click={() => (updateTab = tab)}
              >
                {tab}
              </Button>
            {/each}
          </div>
        </div>
      </div>
      <MangaGrid items={updateItems} {view} />
    </section>
  {:else}
    <Card class="border-ink/10 bg-white p-6 text-sm text-ink/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
      Tidak ada manga yang bisa ditampilkan dari {sourceName}. Kalau source ini baru ditambahkan, kemungkinan parser-nya belum cocok dengan markup situs atau domainnya sedang tidak bisa diakses dari network ini.
    </Card>
  {/if}
  {#if page > 1 || hasNextPage}
    <div class="mt-6 flex flex-wrap items-center justify-center gap-2">
      <Button
        variant="outline"
        disabled={loading || page <= 1}
        on:click={() => setExplorePage(1)}
      >
        First
      </Button>
      <Button
        variant="secondary"
        disabled={loading || page <= 1}
        on:click={() => setExplorePage(page - 1)}
      >
        Previous
      </Button>
      {#if page > 2}
        <Button variant="outline" size="sm" disabled={loading} on:click={() => setExplorePage(page - 2)}>{page - 2}</Button>
      {/if}
      {#if page > 1}
        <Button variant="outline" size="sm" disabled={loading} on:click={() => setExplorePage(page - 1)}>{page - 1}</Button>
      {/if}
      <span class="rounded-lg bg-violet-600 px-3 py-2 text-sm font-bold text-white">{loading ? '...' : page}</span>
      {#if hasNextPage}
        <Button variant="outline" size="sm" disabled={loading} on:click={() => setExplorePage(page + 1)}>{page + 1}</Button>
      {/if}
      <Button disabled={loading || !hasNextPage} on:click={() => setExplorePage(page + 1)}>
        Next
      </Button>
    </div>
  {/if}
{/if}
