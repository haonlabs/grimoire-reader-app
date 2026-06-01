<script lang="ts">
  import { CheckCircle2, CircleOff, Search, Star, StarOff } from 'lucide-svelte';
  import type { SourceMetadata } from '$lib/sources/types';
  import { enabledSources, settings } from '$lib/stores/settings';

  export let data: {
    sources: Array<SourceMetadata & { parserKind?: 'native' | 'generic' | 'catalog'; health?: { status: string; message?: string } }>;
  };

  let query = '';
  let language = 'all';
  let rating = 'all';
  let parser = 'all';
  let tab: 'all' | 'added' | 'available' = 'all';

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
  $: visible = matchingSources.slice(0, 150);

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
</script>

<section class="mb-5 rounded-lg border border-white/10 bg-[#101012] p-4">
  <p class="text-sm font-semibold uppercase tracking-wide text-violet-300">Source Manager</p>
  <h1 class="mt-1 text-3xl font-extrabold text-white">Sources</h1>
  <p class="mt-1 text-sm text-white/55">
    Cari source seperti Kotatsu, add/remove dari katalog, lalu jadikan parser aktif sebagai default.
  </p>

  <div class="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-black/20 p-1">
    <button
      class="focus-ring rounded-md px-3 py-2 text-sm font-semibold {tab === 'all' ? 'bg-violet-600 text-white' : 'text-white/60'}"
      type="button"
      on:click={() => (tab = 'all')}
    >
      All {data.sources.length}
    </button>
    <button
      class="focus-ring rounded-md px-3 py-2 text-sm font-semibold {tab === 'added' ? 'bg-violet-600 text-white' : 'text-white/60'}"
      type="button"
      on:click={() => (tab = 'added')}
    >
      Added {addedCount}
    </button>
    <button
      class="focus-ring rounded-md px-3 py-2 text-sm font-semibold {tab === 'available' ? 'bg-violet-600 text-white' : 'text-white/60'}"
      type="button"
      on:click={() => (tab = 'available')}
    >
      Available {availableCount}
    </button>
  </div>

  <div class="mt-4 flex flex-col gap-3 md:flex-row">
    <label class="relative flex-1">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-white/45" size={17} />
      <input
        class="focus-ring h-11 w-full rounded-lg border border-white/10 bg-white/10 pl-9 pr-3 text-sm text-white placeholder:text-white/40"
        bind:value={query}
        placeholder="Search source"
      />
    </label>
    <select class="focus-ring h-11 rounded-lg border border-white/10 bg-white/10 px-3 text-sm text-white" bind:value={language}>
      {#each languages as value}<option class="bg-ink" value={value}>{value === 'all' ? 'All languages' : value}</option>{/each}
    </select>
    <select class="focus-ring h-11 rounded-lg border border-white/10 bg-white/10 px-3 text-sm text-white" bind:value={rating}>
      <option class="bg-ink" value="all">All ratings</option>
      <option class="bg-ink" value="safe">Safe</option>
      <option class="bg-ink" value="suggestive">Suggestive</option>
      <option class="bg-ink" value="explicit">Explicit</option>
    </select>
    <select class="focus-ring h-11 rounded-lg border border-white/10 bg-white/10 px-3 text-sm text-white" bind:value={parser}>
      <option class="bg-ink" value="all">All parsers</option>
      <option class="bg-ink" value="ready">Native</option>
      <option class="bg-ink" value="generic">Generic</option>
      <option class="bg-ink" value="pending">Catalog only</option>
    </select>
  </div>
  <p class="mt-3 text-xs text-white/45">
    Menampilkan {visible.length} dari {matchingSources.length} source cocok.
  </p>
</section>

<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
  {#each visible as source}
    <article class="rounded-lg border border-white/10 bg-[#101012] p-4 shadow-sm">
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
        <button class="focus-ring rounded-full p-1 { $enabledSources.includes(source.id) ? 'text-violet-300' : 'text-white/35'}" type="button" title={$enabledSources.includes(source.id) ? 'Remove source' : 'Add source'} on:click={() => toggleSource(source.id)}>
          {#if $enabledSources.includes(source.id)}<CheckCircle2 size={22} />{:else}<CircleOff size={22} />{/if}
        </button>
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
        <button
          class="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold {$enabledSources.includes(source.id) ? 'bg-white/10 text-white' : 'bg-violet-600 text-white'}"
          type="button"
          on:click={() => toggleSource(source.id)}
        >
          {#if $enabledSources.includes(source.id)}<CircleOff size={16} /> Remove{:else}<CheckCircle2 size={16} /> Add{/if}
        </button>
        <button
          class="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45 {activeSource === source.id ? 'bg-white text-ink' : 'bg-white/10 text-white'}"
          type="button"
          disabled={source.isImplemented === false}
          on:click={() => setDefaultSource(source.id)}
        >
          {#if activeSource === source.id}<Star size={16} class="fill-current" /> Default{:else if source.isImplemented === false}<StarOff size={16} /> Pending{:else}<StarOff size={16} /> Set Default{/if}
        </button>
      </div>
    </article>
  {:else}
    <div class="rounded-lg border border-white/10 bg-[#101012] p-5 text-sm text-white/55 md:col-span-2 xl:col-span-3">
      Tidak ada source yang cocok dengan pencarian ini.
    </div>
  {/each}
</div>
