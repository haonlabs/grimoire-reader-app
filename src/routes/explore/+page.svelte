<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page as pageStore } from '$app/stores';
  import ExploreHero from '$lib/components/explore/ExploreHero.svelte';
  import ExploreNotice from '$lib/components/explore/ExploreNotice.svelte';
  import MangaCard from '$lib/components/manga/MangaCard.svelte';
  import MangaGrid from '$lib/components/manga/MangaGrid.svelte';
  import MangaGridSkeleton from '$lib/components/manga/MangaGridSkeleton.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import type { Manga, MangaListResult, SourceMetadata } from '$lib/sources/types';
  import { enabledSources, isAdultModeSource, settings } from '$lib/stores/settings';
  import { mangaFormatLabel } from '$lib/utils/mangaFormat';
  import { sourceFetch } from '$lib/utils/sourceUnlock';
  import { PlugZap, RotateCcw } from 'lucide-svelte';
  import { onDestroy, onMount } from 'svelte';

  export let data: { sources?: SourceMetadata[] };

  let items: Manga[] = [];
  let featured: Manga[] = [];
  let page = 1;
  let loading = false;
  let error = '';
  let errorCode = '';
  let bridgeState: 'idle' | 'starting' | 'waiting' | 'connected' | 'failed' = 'idle';
  let bridgeMessage = '';
  let bridgeRecoveryId = 0;
  let automaticBridgeRecoveryKey = '';
  let closingCrotpediaTab = false;
  const CROTPEDIA_RECOVERY_TAB_KEY = 'grimoire_crotpedia_recovery_tab';
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
  let pendingPage: number | null = null;
  let formatTab = 'Manhwa';
  let updateFormatTab = 'All';
  let updateTab = 'Project';

  $: sources = (data.sources ?? []).filter(
    (source) =>
      source.isImplemented !== false &&
      $enabledSources.includes(source.id) &&
      ($settings.adultModeEnabled || !isAdultModeSource(source.id))
  );
  $: sourceId = sources.some((source) => source.id === $settings.defaultSourceId)
    ? $settings.defaultSourceId
    : (sources[0]?.id ?? 'shinigami');
  $: sourceMeta = sources.find((source) => source.id === sourceId);
  $: sourceName = sourceMeta?.name ?? sourceId;
  $: sourceNames = Object.fromEntries(sources.map((source) => [source.id, source.name]));
  $: adultMode = isAdultModeSource(sourceId) ? 'include' : '';
  $: requestedFormat = updateFormatTab === 'All' ? '' : updateFormatTab.toLowerCase();
  $: requestedPage = Math.max(1, Number($pageStore.url.searchParams.get('page') ?? 1));
  $: visibleItems = status === 'all' ? items : items.filter((item) => item.status === status);
  $: hero = featured[0] ?? visibleItems[0];
  $: recommendedMatches = visibleItems.filter((item) =>
    mangaFormatLabel(item).toLowerCase() === formatTab.toLowerCase()
  );
  $: recommended = (recommendedMatches.length ? recommendedMatches : visibleItems).slice(0, 6);
  $: updateFormatMatches =
    updateFormatTab === 'All'
      ? visibleItems
      : visibleItems.filter((item) => mangaFormatLabel(item).toLowerCase() === updateFormatTab.toLowerCase());
  $: updateItems = (updateTab === 'Mirror' ? [...updateFormatMatches].reverse() : updateFormatMatches).slice(0, 24);
  $: key = `${sourceId}:${sort}:${adultMode}:${requestedFormat}:${requestedPage}`;
  $: bridgeRecoveryAvailable =
    sourceId === 'crotpedia' &&
    (['BROWSER_GATEWAY_FAILED', 'SOURCE_BLOCKED', 'SOURCE_AUTH_REQUIRED'].includes(errorCode) ||
      /browser extension is not connected|browser gateway|challenge browser|meminta login/i.test(error));
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
    pendingPage = targetPage;
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
    errorCode = '';
    const nextFilters = [{ id: 'sort', value: sort }];
    if (adultMode) {
      nextFilters.push({ id: 'adultMode', value: adultMode });
    }
    if (requestedFormat) {
      nextFilters.push({ id: 'type', value: requestedFormat });
    }
    const filters = encodeURIComponent(JSON.stringify(nextFilters));
    try {
      const response = await sourceFetch(fetch, sourceId, `/api/${sourceId}/list?page=${nextPage}&filters=${filters}`, {
        signal: controller.signal
      });
      if (currentRequest !== requestId) return;
      if (!response.ok) {
        const body = (await response.json()) as { code?: string; error?: string };
        throw Object.assign(new Error(body.error ?? 'Source failed'), { code: body.code ?? '' });
      }
      const result = (await response.json()) as MangaListResult;
      if (currentRequest !== requestId) return;
      items = uniqueManga(result.items);
      page = result.page;
      hasNextPage = result.hasNextPage;
      featured = result.items.slice(0, 6);
      if (sourceId === 'crotpedia' && sessionStorage.getItem(CROTPEDIA_RECOVERY_TAB_KEY) === '1') {
        void closeCrotpediaRecoveryTab();
      }
      if (options.scrollToTop) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    } catch (err) {
      if (currentRequest !== requestId) return;
      error = err instanceof Error && err.name === 'AbortError' ? 'Source terlalu lama merespons. Coba refresh atau pilih source lain.' : err instanceof Error ? err.message : 'Unable to load manga';
      errorCode = typeof err === 'object' && err && 'code' in err ? String(err.code) : '';
      items = [];
      featured = [];
    } finally {
      if (activeTimeout) window.clearTimeout(activeTimeout);
      if (activeController === controller) activeController = undefined;
      if (currentRequest === requestId) loading = false;
      if (currentRequest === requestId) pendingPage = null;
      if (
        currentRequest === requestId &&
        sourceId === 'crotpedia' &&
        (['BROWSER_GATEWAY_FAILED', 'SOURCE_BLOCKED'].includes(errorCode) ||
          /browser extension is not connected|browser gateway|challenge browser/i.test(error)) &&
        automaticBridgeRecoveryKey !== key
      ) {
        automaticBridgeRecoveryKey = key;
        void activateCrotpediaBridge();
      }
    }
  }

  function wait(milliseconds: number) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  async function closeCrotpediaRecoveryTab() {
    if (closingCrotpediaTab) return;
    closingCrotpediaTab = true;
    try {
      const response = await fetch('/api/local-bridge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ closeBrowser: true })
      });
      if (response.ok) sessionStorage.removeItem(CROTPEDIA_RECOVERY_TAB_KEY);
    } finally {
      closingCrotpediaTab = false;
    }
  }

  async function activateCrotpediaBridge() {
    if (bridgeState === 'starting' || bridgeState === 'waiting') return;
    const recoveryId = ++bridgeRecoveryId;
    bridgeState = 'starting';
    bridgeMessage = 'Menyalakan helper CrotPedia…';
    try {
      const needsBrowserInteraction = ['SOURCE_BLOCKED', 'SOURCE_AUTH_REQUIRED'].includes(errorCode);
      if (needsBrowserInteraction) sessionStorage.setItem(CROTPEDIA_RECOVERY_TAB_KEY, '1');
      const response = await fetch('/api/local-bridge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ openBrowser: needsBrowserInteraction })
      });
      const body = (await response.json()) as { alreadyConnected?: boolean; error?: string; started?: boolean };
      if (!response.ok) throw new Error(body.error ?? 'Helper tidak dapat dijalankan dari web ini.');
      if (needsBrowserInteraction) {
        bridgeState = 'waiting';
        bridgeMessage = 'Browser verifikasi dibuka. Setelah selesai, Grimoire akan mencoba lagi…';
        await wait(10_000);
        if (recoveryId !== bridgeRecoveryId) return;
        await loadList(requestedPage);
        return;
      }
      if (body.alreadyConnected) {
        bridgeState = 'connected';
        bridgeMessage = 'Bridge tersambung. Memuat ulang CrotPedia…';
        await loadList(requestedPage);
        return;
      }

      bridgeState = 'waiting';
      bridgeMessage = body.started ? 'Helper dibuka. Menunggu browser tersambung…' : 'Helper sedang dimulai…';
      for (let attempt = 0; attempt < 30; attempt += 1) {
        await wait(1_000);
        if (recoveryId !== bridgeRecoveryId) return;
        const statusResponse = await fetch('/api/local-bridge', { cache: 'no-store' });
        if (!statusResponse.ok) continue;
        const status = (await statusResponse.json()) as { extensionConnected?: boolean };
        if (!status.extensionConnected) continue;
        bridgeState = 'connected';
        bridgeMessage = 'Bridge tersambung. Memuat ulang CrotPedia…';
        await loadList(requestedPage);
        return;
      }
      throw new Error('Browser helper belum tersambung. Gunakan tombol di bawah untuk mencoba lagi.');
    } catch (recoveryError) {
      if (recoveryId !== bridgeRecoveryId) return;
      bridgeState = 'failed';
      bridgeMessage = recoveryError instanceof Error ? recoveryError.message : 'Helper CrotPedia gagal dijalankan.';
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
      error = 'Belum ada source yang ditambahkan. Buka Profile > Source Manager untuk menambahkan source.';
    }
    recoveryTimer = window.setInterval(recoverStuckLoading, 2_000);
    window.addEventListener('pageshow', recoverStuckLoading);
  });

  onDestroy(() => {
    bridgeRecoveryId += 1;
    activeController?.abort();
    if (!browser) return;
    if (activeTimeout) window.clearTimeout(activeTimeout);
    if (recoveryTimer) window.clearInterval(recoveryTimer);
    window.removeEventListener('pageshow', recoverStuckLoading);
  });

  function setSource(event: Event) {
    const target = event.target as HTMLSelectElement;
    bridgeRecoveryId += 1;
    bridgeState = 'idle';
    bridgeMessage = '';
    automaticBridgeRecoveryKey = '';
    settings.update((value) => ({ ...value, defaultSourceId: target.value }));
    setExplorePage(1);
  }

  function setUpdateFormat(tab: string) {
    if (updateFormatTab === tab) return;
    updateFormatTab = tab;
    if (requestedPage !== 1) void setExplorePage(1);
  }
</script>

<ExploreHero {hero} {sourceName} />
<ExploreNotice {sourceName} />

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
  <FilterPanel bind:view bind:sort bind:status {loading} on:click={() => setExplorePage(1)} />
</Card>

{#if requestedPage === 1 && recommended.length}
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
        <MangaCard {manga} sourceName={sourceNames[manga.sourceId]} />
      {/each}
    </div>
  </section>
{/if}

{#if error}
  <div class="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
    <div class="flex items-start gap-3">
      {#if bridgeRecoveryAvailable}
        <PlugZap class="mt-0.5 shrink-0 text-violet-300" size={20} />
      {/if}
      <div class="min-w-0 flex-1">
        <p>{error}</p>
        {#if bridgeRecoveryAvailable}
          <p class="mt-2 text-red-100/65">
            Grimoire bisa mencoba menyalakan browser helper di Mac ini dan memuat source kembali secara otomatis.
          </p>
          {#if bridgeMessage}
            <p class="mt-2 text-xs font-medium text-violet-200" aria-live="polite">{bridgeMessage}</p>
          {/if}
          <div class="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              loading={bridgeState === 'starting' || bridgeState === 'waiting'}
              on:click={activateCrotpediaBridge}
            >
              <PlugZap size={16} />
              Aktifkan CrotPedia
            </Button>
            <Button variant="outline" size="sm" disabled={loading} on:click={() => loadList(requestedPage)}>
              <RotateCcw size={16} />
              Coba lagi
            </Button>
          </div>
        {/if}
      </div>
    </div>
  </div>
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
  {#if visibleItems.length}
    <section>
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-xl font-bold text-white">Update</h2>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <div class="flex rounded-lg border border-white/10 bg-[#141416] p-1">
            {#each ['All', 'Manhwa', 'Manga', 'Manhua'] as tab}
              <Button
                variant={updateFormatTab === tab ? 'default' : 'ghost'}
                size="sm"
                class="border-0"
                on:click={() => setUpdateFormat(tab)}
              >
                {tab}
              </Button>
            {/each}
          </div>
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
      {#if updateItems.length}
        <MangaGrid items={updateItems} {view} {sourceNames} />
      {:else}
        <Card class="border-ink/10 bg-white p-6 text-sm text-ink/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
          Tidak ada {updateFormatTab} dalam daftar update dari {sourceName}.
        </Card>
      {/if}
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
        loading={loading && pendingPage === 1}
        on:click={() => setExplorePage(1)}
      >
        First
      </Button>
      <Button
        variant="secondary"
        disabled={loading || page <= 1}
        loading={loading && pendingPage === page - 1}
        on:click={() => setExplorePage(page - 1)}
      >
        Previous
      </Button>
      {#if page > 2}
        <Button variant="outline" size="sm" disabled={loading} loading={loading && pendingPage === page - 2} on:click={() => setExplorePage(page - 2)}>{page - 2}</Button>
      {/if}
      {#if page > 1}
        <Button variant="outline" size="sm" disabled={loading} loading={loading && pendingPage === page - 1} on:click={() => setExplorePage(page - 1)}>{page - 1}</Button>
      {/if}
      <span class="rounded-lg bg-violet-600 px-3 py-2 text-sm font-bold text-white">{loading ? '...' : page}</span>
      {#if hasNextPage}
        <Button variant="outline" size="sm" disabled={loading} loading={loading && pendingPage === page + 1} on:click={() => setExplorePage(page + 1)}>{page + 1}</Button>
      {/if}
      <Button disabled={loading || !hasNextPage} loading={loading && pendingPage === page + 1} on:click={() => setExplorePage(page + 1)}>
        Next
      </Button>
    </div>
  {/if}
{/if}
