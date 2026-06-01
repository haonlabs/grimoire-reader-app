<script lang="ts">
  import { CheckCircle2, CircleOff, ExternalLink, KeyRound, Search, Star, StarOff, X } from 'lucide-svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import type { SourceMetadata } from '$lib/sources/types';
  import { enabledSources, settings } from '$lib/stores/settings';
  import { clearUnlockedSourceCookie, getUnlockedSourceCookie, isSourceUnlocked, saveUnlockedSourceCookie } from '$lib/utils/sourceUnlock';
  import { onDestroy, onMount } from 'svelte';

  const SOURCE_BATCH_SIZE = 150;

  export let data: {
    sources: Array<SourceMetadata & { parserKind?: 'native' | 'generic' | 'catalog'; health?: { status: string; message?: string } }>;
  };

  let query = '';
  let language = 'all';
  let rating = 'all';
  let parser = 'all';
  let tab: 'all' | 'added' | 'available' = 'all';
  let unlockSource: SourceMetadata | undefined;
  let unlockCookie = '';
  let unlockSavedAt = 0;
  let visibleLimit = SOURCE_BATCH_SIZE;
  let sentinel: HTMLDivElement;
  let observer: IntersectionObserver | undefined;
  let lastFilterKey = '';

  $: languages = ['all', ...new Set(data.sources.map((source) => source.language))];
  $: activeSource = $settings.defaultSourceId;
  $: addedCount = data.sources.filter((source) => $enabledSources.includes(source.id)).length;
  $: availableCount = data.sources.length - addedCount;
  $: matchingSources = data.sources.filter((source) => {
    const haystack = `${source.name} ${source.id} ${source.description} ${source.language}`.toLowerCase();
    const matchesText = haystack.includes(query.trim().toLowerCase());
    const matchesLanguage = language === 'all' || source.language === language;
    const matchesRating = rating === 'all' || source.contentRating === rating;
    const matchesParser =
      parser === 'all' ||
      (parser === 'ready' && source.parserKind === 'native') ||
      (parser === 'generic' && source.parserKind === 'generic') ||
      (parser === 'pending' && source.isImplemented === false);
    const matchesTab =
      tab === 'all' ||
      (tab === 'added' && $enabledSources.includes(source.id)) ||
      (tab === 'available' && !$enabledSources.includes(source.id));
    return matchesText && matchesLanguage && matchesRating && matchesParser && matchesTab;
  });
  $: filterKey = `${query.trim().toLowerCase()}:${language}:${rating}:${parser}:${tab}:${$enabledSources.join(',')}`;
  $: if (filterKey !== lastFilterKey) {
    lastFilterKey = filterKey;
    visibleLimit = SOURCE_BATCH_SIZE;
  }
  $: visible = matchingSources.slice(0, visibleLimit);
  $: hasMoreSources = visible.length < matchingSources.length;

  function toggleSource(id: string) {
    enabledSources.update((items) => {
      if (!items.includes(id)) return [...items, id];
      const next = items.filter((item) => item !== id);
      if (activeSource === id) {
        const fallback = next.find((sourceId) =>
          data.sources.some((source) => source.id === sourceId && source.isImplemented !== false)
        );
        settings.update((value) => ({ ...value, defaultSourceId: fallback ?? 'shinigami' }));
      }
      return next;
    });
  }

  function setDefaultSource(id: string) {
    const source = data.sources.find((item) => item.id === id);
    if (source?.isImplemented === false) return;
    enabledSources.update((items) => (items.includes(id) ? items : [...items, id]));
    settings.update((value) => ({ ...value, defaultSourceId: id }));
  }

  function openUnlock(source: SourceMetadata) {
    unlockSource = source;
    unlockCookie = getUnlockedSourceCookie(source.id);
    unlockSavedAt = 0;
  }

  function saveUnlock() {
    if (!unlockSource) return;
    saveUnlockedSourceCookie(unlockSource.id, unlockCookie);
    unlockSavedAt = Date.now();
  }

  function clearUnlock() {
    if (!unlockSource) return;
    clearUnlockedSourceCookie(unlockSource.id);
    unlockCookie = '';
    unlockSavedAt = Date.now();
  }

  function loadMoreSources() {
    if (!hasMoreSources) return;
    visibleLimit = Math.min(visibleLimit + SOURCE_BATCH_SIZE, matchingSources.length);
  }

  onMount(() => {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMoreSources();
      },
      { rootMargin: '420px 0px' }
    );
    if (sentinel) observer.observe(sentinel);
  });

  onDestroy(() => {
    observer?.disconnect();
  });
</script>

<Card class="mb-5 p-4">
  <p class="text-sm font-semibold uppercase tracking-wide text-violet-300">Source Manager</p>
  <h1 class="mt-1 text-3xl font-extrabold text-white">Sources</h1>
  <p class="mt-1 text-sm text-white/55">
    Cari source seperti Kotatsu, add/remove dari katalog, lalu jadikan parser aktif sebagai default.
  </p>

  <div class="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-black/20 p-1">
    <Button
      variant={tab === 'all' ? 'default' : 'ghost'}
      class="border-0"
      on:click={() => (tab = 'all')}
    >
      All {data.sources.length}
    </Button>
    <Button
      variant={tab === 'added' ? 'default' : 'ghost'}
      class="border-0"
      on:click={() => (tab = 'added')}
    >
      Added {addedCount}
    </Button>
    <Button
      variant={tab === 'available' ? 'default' : 'ghost'}
      class="border-0"
      on:click={() => (tab = 'available')}
    >
      Available {availableCount}
    </Button>
  </div>

  <div class="mt-4 flex flex-col gap-3 md:flex-row">
    <label class="relative flex-1">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-white/45" size={17} />
      <Input
        class="h-11 pl-9"
        bind:value={query}
        placeholder="Search source"
      />
    </label>
    <Select class="h-11" bind:value={language}>
      {#each languages as value}<option class="bg-ink" value={value}>{value === 'all' ? 'All languages' : value}</option>{/each}
    </Select>
    <Select class="h-11" bind:value={rating}>
      <option class="bg-ink" value="all">All ratings</option>
      <option class="bg-ink" value="safe">Safe</option>
      <option class="bg-ink" value="suggestive">Suggestive</option>
      <option class="bg-ink" value="explicit">Explicit</option>
    </Select>
    <Select class="h-11" bind:value={parser}>
      <option class="bg-ink" value="all">All parsers</option>
      <option class="bg-ink" value="ready">Native</option>
      <option class="bg-ink" value="generic">Generic</option>
      <option class="bg-ink" value="pending">Catalog only</option>
    </Select>
  </div>
  <p class="mt-3 text-xs text-white/45">
    Menampilkan {visible.length} dari {matchingSources.length} source cocok.
  </p>
</Card>

<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
  {#each visible as source}
    <Card class="p-4">
      <div class="flex items-start justify-between gap-3">
        <div class="flex gap-3">
          <span class="grid h-11 w-11 place-items-center rounded-lg bg-white text-sm font-bold text-ink">{source.icon}</span>
          <div>
            <h2 class="font-semibold text-white">{source.name}</h2>
            <p class="text-xs text-white/55">{source.method} · {source.language} · {source.contentRating}</p>
            {#if activeSource === source.id}
              <span class="mt-2 inline-flex rounded-full bg-violet-500/15 px-2 py-1 text-[11px] font-semibold text-violet-200">Default</span>
            {:else if source.isImplemented === false}
              <span class="mt-2 inline-flex rounded-full bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/55">Catalog only</span>
            {:else if source.parserKind === 'generic'}
              <span class="mt-2 inline-flex rounded-full bg-sky-500/15 px-2 py-1 text-[11px] font-semibold text-sky-200">Generic</span>
            {:else}
              <span class="mt-2 inline-flex rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-200">Native</span>
            {/if}
          </div>
        </div>
        <Button class="h-auto rounded-full border-0 p-1 { $enabledSources.includes(source.id) ? 'text-violet-300' : 'text-white/35'}" variant="ghost" title={$enabledSources.includes(source.id) ? 'Remove source' : 'Add source'} on:click={() => toggleSource(source.id)}>
          {#if $enabledSources.includes(source.id)}<CheckCircle2 size={22} />{:else}<CircleOff size={22} />{/if}
        </Button>
      </div>
      <p class="mt-3 line-clamp-2 text-sm leading-6 text-white/65">{source.description}</p>
      {#if source.baseUrl}
        <a
          class="mt-3 block max-w-full truncate text-sm font-medium text-violet-300"
          href={source.baseUrl}
          target="_blank"
          rel="noreferrer"
          title={source.baseUrl}
        >
          {source.baseUrl}
        </a>
      {:else}
        <p class="mt-3 text-sm font-medium text-white/40">Domain belum terdeteksi</p>
      {/if}
      <p class="mt-3 line-clamp-2 text-xs capitalize leading-5 text-white/50">Status: {source.health?.status ?? 'unknown'}{source.health?.message ? ` · ${source.health.message}` : ''}</p>

      <div class="mt-4 grid grid-cols-2 gap-2">
        <Button
          variant={$enabledSources.includes(source.id) ? 'secondary' : 'default'}
          on:click={() => toggleSource(source.id)}
        >
          {#if $enabledSources.includes(source.id)}<CircleOff size={16} /> Remove{:else}<CheckCircle2 size={16} /> Add{/if}
        </Button>
        <Button
          variant={activeSource === source.id ? 'default' : 'secondary'}
          disabled={source.isImplemented === false}
          on:click={() => setDefaultSource(source.id)}
        >
          {#if activeSource === source.id}<Star size={16} class="fill-current" /> Default{:else if source.isImplemented === false}<StarOff size={16} /> Pending{:else}<StarOff size={16} /> Set Default{/if}
        </Button>
        <Button
          class="col-span-2"
          variant={isSourceUnlocked(source.id) ? 'default' : 'outline'}
          disabled={!source.baseUrl || source.isImplemented === false}
          on:click={() => openUnlock(source)}
        >
          <KeyRound size={16} />
          {isSourceUnlocked(source.id) ? 'Unlocked' : 'Unlock Source'}
        </Button>
      </div>
    </Card>
  {:else}
    <Card class="p-5 text-sm text-white/55 md:col-span-2 xl:col-span-3">
      Tidak ada source yang cocok dengan pencarian ini.
    </Card>
  {/each}
</div>

{#if hasMoreSources}
  <div bind:this={sentinel} class="mt-5 flex justify-center">
    <Button variant="outline" on:click={loadMoreSources}>Load more sources</Button>
  </div>
{:else}
  <div bind:this={sentinel} class="h-1"></div>
{/if}

{#if unlockSource}
  <div class="fixed inset-0 z-50 grid place-items-end bg-black/60 p-3 sm:place-items-center" role="presentation" on:click={() => (unlockSource = undefined)}>
    <div
      class="w-full max-w-xl rounded-lg border border-white/10 bg-[#101012] p-4 shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-label="Unlock source"
      tabindex="-1"
      on:click|stopPropagation
      on:keydown|stopPropagation
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-violet-300">Unlock Source</p>
          <h2 class="mt-1 text-xl font-bold text-white">{unlockSource.name}</h2>
          <p class="mt-1 text-sm text-white/55">Simpan cookie browser untuk source ini agar request backend bisa memakai sesi yang sama.</p>
        </div>
        <button class="focus-ring rounded-md bg-white/10 p-2 text-white" type="button" title="Close" on:click={() => (unlockSource = undefined)}>
          <X size={18} />
        </button>
      </div>

      <div class="mt-4 grid gap-3 rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/65">
        <a
          class="focus-ring inline-flex w-fit items-center gap-2 rounded-md bg-violet-600 px-3 py-2 font-semibold text-white"
          href={unlockSource.baseUrl}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={16} />
          Open Source
        </a>
        <p>Buka source sampai normal, lalu paste cookie domain source di bawah. Formatnya seperti <span class="font-mono text-white">cf_clearance=...; __cf_bm=...</span>.</p>
      </div>

      <label class="mt-4 grid gap-2 text-sm font-medium text-white/70">
        Cookie
        <textarea
          class="focus-ring min-h-28 rounded-lg border border-white/10 bg-white/10 p-3 font-mono text-xs text-white placeholder:text-white/35"
          bind:value={unlockCookie}
          placeholder="cf_clearance=...; __cf_bm=..."
        ></textarea>
      </label>

      {#if unlockSavedAt}
        <p class="mt-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-2 text-sm text-emerald-200">Unlock source tersimpan.</p>
      {/if}

      <div class="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="outline" on:click={clearUnlock}>
          Clear
        </Button>
        <Button on:click={saveUnlock}>
          <KeyRound size={16} />
          Save Unlock
        </Button>
      </div>
    </div>
  </div>
{/if}
